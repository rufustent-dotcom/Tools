import * as THREE from 'three';
import { createProceduralTextures, ProceduralTextureSet } from './proceduralTextures';

export type DoorControlMode = 'auto' | 'open' | 'locked';
export type LightingPreset = 'daylight' | 'twilight';

export interface CollectibleItemSpec {
  id: string;
  name: string;
  zone: 'courtyard' | 'vault';
  position: [number, number];
  color: number;
  emissive: number;
}

export interface CollectibleEntity {
  spec: CollectibleItemSpec;
  root: THREE.Group;
  artifactGroup: THREE.Group;
  crystalMesh: THREE.Mesh;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  hitProxy: THREE.Mesh;
  pedestalRingMat: THREE.MeshStandardMaterial;
  crystalMat: THREE.MeshPhysicalMaterial;
  collected: boolean;
  disappearing: boolean;
  disappearProgress: number;
  hoverAmount: number;
  baseY: number;
  phaseOffset: number;
}

export interface ParticleBurst {
  active: boolean;
  age: number;
  maxAge: number;
  origin: THREE.Vector3;
  color: THREE.Color;
  ringMesh: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  shards: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    spin: THREE.Vector3;
  }[];
}

export interface InteractiveSceneRig {
  textures: ProceduralTextureSet;
  walkableFloor: THREE.Mesh;
  walkMarker: THREE.Group;
  walkMarkerMat: THREE.MeshBasicMaterial;
  explorer: {
    root: THREE.Group;
    bodyGroup: THREE.Group;
    position: THREE.Vector3;
    targetPosition: THREE.Vector3 | null;
    facingAngle: number;
    speed: number;
  };
  door: {
    root: THREE.Group;
    leftLeaf: THREE.Group;
    rightLeaf: THREE.Group;
    hitProxy: THREE.Mesh;
    sensorStripMat: THREE.MeshStandardMaterial;
    padGlowMat: THREE.MeshStandardMaterial;
    position: THREE.Vector3;
    openProgress: number;
    isOpen: boolean;
    proximityRadius: number;
  };
  collectibles: CollectibleEntity[];
  beacon: {
    root: THREE.Group;
    hitProxy: THREE.Mesh;
    orbMat: THREE.MeshStandardMaterial;
    position: THREE.Vector3;
    hoverAmount: number;
  };
  lights: {
    keyLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    rimLight: THREE.DirectionalLight;
    vaultLanterns: THREE.PointLight[];
    lanternOrbMats: THREE.MeshStandardMaterial[];
  };
  burstPool: ParticleBurst[];
  triggerBurst: (pos: THREE.Vector3, colorHex: number) => void;
  updateParticles: (dt: number) => void;
  applyLightingBlend: (twilightAmount: number, keyIntensityScale: number, scene: THREE.Scene) => void;
  resolveCollision: (nextPos: THREE.Vector3, doorOpenProgress: number) => void;
  dispose: () => void;
}

export const COLLECTIBLE_SPECS: CollectibleItemSpec[] = [
  {
    id: 'relic-solar',
    name: 'Solar Prism',
    zone: 'courtyard',
    position: [-3.3, 1.9],
    color: 0xf59e0b,
    emissive: 0xd97706,
  },
  {
    id: 'relic-azure',
    name: 'Azure Shard',
    zone: 'courtyard',
    position: [3.3, 1.1],
    color: 0x0ea5e9,
    emissive: 0x0284c7,
  },
  {
    id: 'relic-verdant',
    name: 'Verdant Core',
    zone: 'vault',
    position: [-2.8, -7.2],
    color: 0x10b981,
    emissive: 0x059669,
  },
  {
    id: 'relic-aether',
    name: 'Aether Crown',
    zone: 'vault',
    position: [2.8, -7.2],
    color: 0x8b5cf6,
    emissive: 0x6d28d9,
  },
  {
    id: 'relic-zenith',
    name: 'Zenith Relic',
    zone: 'vault',
    position: [0, -9.8],
    color: 0xfbbf24,
    emissive: 0xf59e0b,
  },
];

// Reusable color helpers outside loop
const _daySky = new THREE.Color(0xe6edf5);
const _twilightSky = new THREE.Color(0x131b2b);
const _dayKeyColor = new THREE.Color(0xfff4e0);
const _twilightKeyColor = new THREE.Color(0x7aa2f7);
const _dayHemiSky = new THREE.Color(0xdbeafe);
const _twilightHemiSky = new THREE.Color(0x283655);
const _dayHemiGround = new THREE.Color(0x8c8478);
const _twilightHemiGround = new THREE.Color(0x141720);
const _blendColor = new THREE.Color();

export function buildInteractiveEnvironment(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): InteractiveSceneRig {
  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMaterials.push(m);
    return m;
  };

  const textures = createProceduralTextures(maxAnisotropy);

  // Scene background & atmospheric fog
  scene.background = _daySky.clone();
  scene.fog = new THREE.FogExp2(0xe6edf5, 0.024);

  // 3-Point Warm/Cool Lighting Rig
  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x8c8478, 0.85);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.9);
  keyLight.position.set(11, 18, 12);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 48;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.55);
  rimLight.position.set(-10, 9, -14);
  scene.add(rimLight);

  // Shared Architectural PBR Materials
  const groundExtendMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc9c4ba,
      roughness: 0.94,
      metalness: 0.0,
    })
  );
  const courtyardFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.floorColor,
      roughnessMap: textures.floorRoughness,
      roughness: 0.84,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.wallStone,
      roughness: 0.82,
      metalness: 0.05,
    })
  );
  const darkSlateMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262c36,
      roughness: 0.42,
      metalness: 0.35,
    })
  );
  const brushedBrassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xc8a45d,
      roughness: 0.24,
      metalness: 0.88,
      clearcoat: 0.2,
    })
  );
  const doorWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.doorWood,
      roughness: 0.52,
      metalness: 0.08,
    })
  );
  const frostedGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd8eef8,
      roughness: 0.16,
      metalness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.65,
      transparent: true,
      opacity: isSoftwareGl ? 0.55 : 0.88,
      ior: 1.48,
      thickness: 0.2,
    })
  );
  const contactShadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );

  // Extended Horizon Ground (no floating box void)
  const horizonGround = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(140, 140)), groundExtendMat);
  horizonGround.rotation.x = -Math.PI / 2;
  horizonGround.position.y = 0;
  horizonGround.receiveShadow = true;
  scene.add(horizonGround);

  // Courtyard Paved Platform (walkable surface)
  const walkableFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16, 0.04, 21)), courtyardFloorMat);
  walkableFloor.position.set(0, 0.02, -2.5);
  walkableFloor.receiveShadow = true;
  walkableFloor.name = 'walkable_floor';
  scene.add(walkableFloor);

  // Brass Walkway Guide Strips leading toward the Door
  const stripGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.025, 8.8));
  [-1.55, 1.55].forEach((x) => {
    const strip = new THREE.Mesh(stripGeo, brushedBrassMat);
    strip.position.set(x, 0.045, 2.5);
    strip.receiveShadow = true;
    scene.add(strip);
  });

  // Destination click-to-walk ground marker ring
  const walkMarker = new THREE.Group();
  const walkMarkerMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const markerRing = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.28, 0.38, 32)), walkMarkerMat);
  markerRing.rotation.x = -Math.PI / 2;
  markerRing.position.y = 0.06;
  walkMarker.add(markerRing);
  scene.add(walkMarker);

  // ---------------------------------------------------------------------------
  // SANCTUARY VAULT ARCHITECTURE (Behind Door at z = -4 to z = -12)
  // ---------------------------------------------------------------------------
  const vaultGroup = new THREE.Group();

  // Front Portal Wall Left & Right of doorway (doorway opening x: -1.6 to +1.6, height: 3.3)
  const frontWallLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 4.1, 0.55)), wallMat);
  frontWallLeft.position.set(-3.8, 2.05, -4.0);
  frontWallLeft.castShadow = true;
  frontWallLeft.receiveShadow = true;
  vaultGroup.add(frontWallLeft);

  const frontWallRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 4.1, 0.55)), wallMat);
  frontWallRight.position.set(3.8, 2.05, -4.0);
  frontWallRight.castShadow = true;
  frontWallRight.receiveShadow = true;
  vaultGroup.add(frontWallRight);

  const frontHeader = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.85, 0.62)), wallMat);
  frontHeader.position.set(0, 3.675, -4.0);
  frontHeader.castShadow = true;
  frontHeader.receiveShadow = true;
  vaultGroup.add(frontHeader);

  // Side Colonnade Walls (West x = -6, East x = +6, z from -4 to -12)
  const sideWallGeo = trackGeo(new THREE.BoxGeometry(0.5, 4.1, 8.2));
  const westWall = new THREE.Mesh(sideWallGeo, wallMat);
  westWall.position.set(-5.85, 2.05, -8.0);
  westWall.castShadow = true;
  westWall.receiveShadow = true;
  vaultGroup.add(westWall);

  const eastWall = new THREE.Mesh(sideWallGeo, wallMat);
  eastWall.position.set(5.85, 2.05, -8.0);
  eastWall.castShadow = true;
  eastWall.receiveShadow = true;
  vaultGroup.add(eastWall);

  // Back Sanctuary Wall (z = -12)
  const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(12.2, 4.4, 0.55)), wallMat);
  backWall.position.set(0, 2.2, -12.0);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  vaultGroup.add(backWall);

  // Architectural cornice caps & overhead skylight pergola beams
  const beamGeo = trackGeo(new THREE.BoxGeometry(12.2, 0.22, 0.32));
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(beamGeo, darkSlateMat);
    beam.position.set(0, 4.15, -4.7 - i * 1.35);
    beam.castShadow = true;
    vaultGroup.add(beam);
  }

  // Elevated Sanctuary Dais at the back center for the Zenith Relic
  const daisBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.75, 1.95, 0.22, 32)), darkSlateMat);
  daisBase.position.set(0, 0.13, -9.8);
  daisBase.receiveShadow = true;
  vaultGroup.add(daisBase);

  const daisRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.76, 0.035, 12, 48)), brushedBrassMat);
  daisRim.rotation.x = Math.PI / 2;
  daisRim.position.set(0, 0.24, -9.8);
  vaultGroup.add(daisRim);

  // Wall Accent Sconces inside Vault (illuminate warmly in Twilight mode)
  const vaultLanterns: THREE.PointLight[] = [];
  const lanternOrbMats: THREE.MeshStandardMaterial[] = [];
  const sconcePositions: [number, number, number][] = [
    [-5.45, 2.5, -7.2],
    [5.45, 2.5, -7.2],
    [0, 2.9, -11.55],
  ];
  const sconceHousingGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.11, 0.36, 12));
  const sconceOrbGeo = trackGeo(new THREE.SphereGeometry(0.12, 16, 16));

  sconcePositions.forEach(([x, y, z]) => {
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    const housing = new THREE.Mesh(sconceHousingGeo, darkSlateMat);
    holder.add(housing);

    const orbMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        roughness: 0.2,
      })
    );
    lanternOrbMats.push(orbMat);
    const orb = new THREE.Mesh(sconceOrbGeo, orbMat);
    orb.position.y = 0.22;
    holder.add(orb);
    vaultGroup.add(holder);

    const ptLight = new THREE.PointLight(0xffb454, 0.4, 9.5, 1.8);
    ptLight.position.set(x * 0.9, y + 0.15, z + (z < -11 ? 0.5 : 0));
    scene.add(ptLight);
    vaultLanterns.push(ptLight);
  });

  scene.add(vaultGroup);

  // ---------------------------------------------------------------------------
  // OUTDOOR COURTYARD ARCHITECTURAL LANDSCAPING (Planters, Cypress Trees, Benches)
  // ---------------------------------------------------------------------------
  const barkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c4636, roughness: 0.92 }));
  const foliagePalette = [0x3d5a45, 0x496b52, 0x344e3c];
  const foliageMats = foliagePalette.map((hex) =>
    trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.78, metalness: 0.02 }))
  );

  const createPlanterWithTree = (x: number, z: number, scale = 1.0) => {
    const group = new THREE.Group();
    group.position.set(x, 0.04, z);

    // Contact shadow
    const sh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.1 * scale, 2.1 * scale)), contactShadowMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.005;
    group.add(sh);

    // Stone planter box + brass reveal rim
    const box = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.35 * scale, 0.52 * scale, 1.35 * scale)), wallMat);
    box.position.y = 0.26 * scale;
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);

    const rim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.42 * scale, 0.06 * scale, 1.42 * scale)), darkSlateMat);
    rim.position.y = 0.52 * scale;
    group.add(rim);

    // Sculpted multi-part Cypress Tree (trunk + 4 layered organic foliage crowns)
    const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08 * scale, 0.13 * scale, 1.15 * scale, 10)), barkMat);
    trunk.position.y = 0.95 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    const tierConfigs = [
      { y: 1.45, r: 0.52, h: 0.95, matIdx: 0 },
      { y: 2.05, r: 0.44, h: 0.95, matIdx: 1 },
      { y: 2.6, r: 0.34, h: 0.85, matIdx: 2 },
      { y: 3.05, r: 0.21, h: 0.7, matIdx: 1 },
    ];
    tierConfigs.forEach((t) => {
      const cone = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(t.r * scale, t.h * scale, 9)),
        foliageMats[t.matIdx]
      );
      cone.position.y = t.y * scale;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    });

    scene.add(group);
  };

  createPlanterWithTree(-6.2, 4.4, 1.05);
  createPlanterWithTree(6.2, 4.4, 0.95);
  createPlanterWithTree(-6.2, -1.2, 1.1);
  createPlanterWithTree(6.2, -1.2, 1.0);
  createPlanterWithTree(-8.8, -6.5, 1.25);
  createPlanterWithTree(8.8, -6.5, 1.18);

  // Courtyard Stone Benches (composite 3-part benches)
  const createBench = (x: number, z: number, rotY: number) => {
    const bench = new THREE.Group();
    bench.position.set(x, 0.04, z);
    bench.rotation.y = rotY;

    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.12, 0.62)), wallMat);
    seat.position.y = 0.44;
    seat.castShadow = true;
    seat.receiveShadow = true;
    bench.add(seat);

    const legGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.4, 0.52));
    [-0.75, 0.75].forEach((lx) => {
      const leg = new THREE.Mesh(legGeo, darkSlateMat);
      leg.position.set(lx, 0.2, 0);
      leg.castShadow = true;
      bench.add(leg);
    });
    scene.add(bench);
  };
  createBench(-5.4, 1.8, Math.PI / 2);
  createBench(5.4, 1.8, -Math.PI / 2);

  // ---------------------------------------------------------------------------
  // INTERACTIVE ELEMENT 1: PROXIMITY-TRIGGERED AUTOMATED SLIDING PORTAL DOOR
  // ---------------------------------------------------------------------------
  const doorRoot = new THREE.Group();
  doorRoot.position.set(0, 0, -4.0);

  // Portal Frame Piers & Lintel Trim (Anodized Dark Steel + Brushed Brass)
  const pierGeo = trackGeo(new THREE.BoxGeometry(0.26, 3.35, 0.74));
  [-1.62, 1.62].forEach((px) => {
    const pier = new THREE.Mesh(pierGeo, darkSlateMat);
    pier.position.set(px, 1.675, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    doorRoot.add(pier);

    const brassInlay = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 3.2, 0.77)), brushedBrassMat);
    brassInlay.position.set(px > 0 ? px - 0.12 : px + 0.12, 1.65, 0);
    doorRoot.add(brassInlay);
  });

  // Overhead Sensor Housing & Dynamic Status Bar
  const sensorHousing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.5, 0.24, 0.78)), darkSlateMat);
  sensorHousing.position.set(0, 3.32, 0);
  doorRoot.add(sensorHousing);

  const sensorStripMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.1,
    })
  );
  const sensorBarFront = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.06, 0.04)), sensorStripMat);
  sensorBarFront.position.set(0, 3.32, 0.4);
  doorRoot.add(sensorBarFront);

  const sensorBarBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.06, 0.04)), sensorStripMat);
  sensorBarBack.position.set(0, 3.32, -0.4);
  doorRoot.add(sensorBarBack);

  // Floor Proximity Sensor Pad with Reactive Threshold Strips
  const padMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.thresholdPad,
      roughness: 0.45,
      metalness: 0.32,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const sensorPad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.025, 3.4)), padMat);
  sensorPad.position.set(0, 0.045, 0);
  sensorPad.receiveShadow = true;
  doorRoot.add(sensorPad);

  const padGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.25,
      roughness: 0.2,
    })
  );
  [-1.66, 1.66].forEach((zOff) => {
    const glowBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 0.03, 0.07)), padGlowMat);
    glowBar.position.set(0, 0.052, zOff);
    doorRoot.add(glowBar);
  });

  // Composite Dual Sliding Door Leaves (Each: timber slab, steel frame, glass vision slit, brass handle)
  const buildDoorLeaf = (side: -1 | 1): THREE.Group => {
    const leaf = new THREE.Group();
    // Closed center position: side * 0.76
    leaf.position.set(side * 0.76, 1.62, 0);

    const panel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.48, 3.16, 0.14)), doorWoodMat);
    panel.castShadow = true;
    panel.receiveShadow = true;
    leaf.add(panel);

    // Outer steel edge trim
    const topTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.08, 0.17)), darkSlateMat);
    topTrim.position.y = 1.56;
    leaf.add(topTrim);

    const botTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.14, 0.17)), darkSlateMat);
    botTrim.position.y = -1.52;
    leaf.add(botTrim);

    // Recessed Vision Glass Slit
    const glassSlit = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 2.15, 0.16)), frostedGlassMat);
    glassSlit.position.set(-side * 0.34, 0.12, 0);
    leaf.add(glassSlit);

    // Brushed Brass Vertical Pull Handle (front & back)
    const handleGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.92, 10));
    [0.12, -0.12].forEach((zSign) => {
      const handle = new THREE.Mesh(handleGeo, brushedBrassMat);
      handle.position.set(-side * 0.58, -0.08, zSign);
      leaf.add(handle);
    });

    return leaf;
  };

  const leftLeaf = buildDoorLeaf(-1);
  const rightLeaf = buildDoorLeaf(1);
  doorRoot.add(leftLeaf, rightLeaf);

  // Invisible click proxy for door manual toggle inspection
  const doorHitProxy = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2, 3.2, 0.6)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false }))
  );
  doorHitProxy.position.set(0, 1.6, 0);
  doorHitProxy.userData = { interactType: 'door', label: 'Automated Portal Door' };
  doorRoot.add(doorHitProxy);

  scene.add(doorRoot);

  // ---------------------------------------------------------------------------
  // INTERACTIVE ELEMENT 2: COLLECTIBLE CRYSTALLINE RELICS (5 Composite Artifacts)
  // ---------------------------------------------------------------------------
  const collectibles: CollectibleEntity[] = [];
  const pedestalBaseGeo = trackGeo(new THREE.CylinderGeometry(0.42, 0.5, 0.58, 12));
  const pedestalCapGeo = trackGeo(new THREE.CylinderGeometry(0.46, 0.44, 0.08, 12));
  const pedestalRingGeo = trackGeo(new THREE.TorusGeometry(0.38, 0.025, 10, 28));
  const crystalCoreGeo = trackGeo(new THREE.OctahedronGeometry(0.32, 0));
  const outerGyroGeo = trackGeo(new THREE.TorusGeometry(0.47, 0.022, 10, 32));
  const innerGyroGeo = trackGeo(new THREE.TorusGeometry(0.39, 0.016, 8, 28));
  const collectibleHitGeo = trackGeo(new THREE.SphereGeometry(0.72, 10, 10));

  COLLECTIBLE_SPECS.forEach((spec, idx) => {
    const root = new THREE.Group();
    const isCenterDais = spec.id === 'relic-zenith';
    const groundY = isCenterDais ? 0.24 : 0.04;
    root.position.set(spec.position[0], groundY, spec.position[1]);

    // Grounded contact shadow
    const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.3, 1.3)), contactShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.006;
    root.add(shadow);

    // Stone & Brass Pedestal
    const pedBase = new THREE.Mesh(pedestalBaseGeo, darkSlateMat);
    pedBase.position.y = 0.29;
    pedBase.castShadow = true;
    pedBase.receiveShadow = true;
    root.add(pedBase);

    const pedCap = new THREE.Mesh(pedestalCapGeo, wallMat);
    pedCap.position.y = 0.62;
    pedCap.receiveShadow = true;
    root.add(pedCap);

    const pedestalRingMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.emissive,
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.6,
      })
    );
    const pedRing = new THREE.Mesh(pedestalRingGeo, pedestalRingMat);
    pedRing.rotation.x = Math.PI / 2;
    pedRing.position.y = 0.67;
    root.add(pedRing);

    // Floating Collectible Artifact Group (disappears cleanly on interaction!)
    const baseY = 1.38;
    const artifactGroup = new THREE.Group();
    artifactGroup.position.y = baseY;

    const crystalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: spec.color,
        emissive: spec.emissive,
        emissiveIntensity: 0.45,
        roughness: 0.12,
        metalness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      })
    );
    const crystalMesh = new THREE.Mesh(crystalCoreGeo, crystalMat);
    crystalMesh.scale.set(0.85, 1.25, 0.85);
    crystalMesh.castShadow = true;
    artifactGroup.add(crystalMesh);

    const outerRing = new THREE.Mesh(outerGyroGeo, brushedBrassMat);
    outerRing.rotation.x = Math.PI / 3;
    artifactGroup.add(outerRing);

    const innerRing = new THREE.Mesh(innerGyroGeo, brushedBrassMat);
    innerRing.rotation.y = Math.PI / 4;
    innerRing.rotation.x = -Math.PI / 4;
    artifactGroup.add(innerRing);

    root.add(artifactGroup);

    // Simplified invisible hit proxy for raycasting
    const hitProxy = new THREE.Mesh(
      collectibleHitGeo,
      trackMat(new THREE.MeshBasicMaterial({ visible: false }))
    );
    hitProxy.position.y = baseY;
    hitProxy.userData = { interactType: 'collectible', collectibleId: spec.id, label: spec.name };
    root.add(hitProxy);

    scene.add(root);

    collectibles.push({
      spec,
      root,
      artifactGroup,
      crystalMesh,
      outerRing,
      innerRing,
      hitProxy,
      pedestalRingMat,
      crystalMat,
      collected: false,
      disappearing: false,
      disappearProgress: 0,
      hoverAmount: 0,
      baseY,
      phaseOffset: idx * 1.25,
    });
  });

  // ---------------------------------------------------------------------------
  // INTERACTIVE ELEMENT 3: COURTYARD LIGHTING BEACON PEDESTAL
  // ---------------------------------------------------------------------------
  const beaconRoot = new THREE.Group();
  const beaconPos = new THREE.Vector3(-2.1, 0.04, -1.6);
  beaconRoot.position.copy(beaconPos);

  const bShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.1, 1.1)), contactShadowMat);
  bShadow.rotation.x = -Math.PI / 2;
  bShadow.position.y = 0.006;
  beaconRoot.add(bShadow);

  const bPost = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.16, 1.12, 12)), darkSlateMat);
  bPost.position.y = 0.56;
  bPost.castShadow = true;
  beaconRoot.add(bPost);

  const bCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.16, 0.1, 12)), brushedBrassMat);
  bCollar.position.y = 1.14;
  beaconRoot.add(bCollar);

  const orbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.65,
      roughness: 0.18,
      metalness: 0.1,
    })
  );
  const bOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 20, 20)), orbMat);
  bOrb.position.y = 1.38;
  bOrb.castShadow = true;
  beaconRoot.add(bOrb);

  const beaconHitProxy = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.45, 0.45, 1.7, 10)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false }))
  );
  beaconHitProxy.position.y = 0.85;
  beaconHitProxy.userData = { interactType: 'beacon', label: 'Atmosphere Lighting Beacon' };
  beaconRoot.add(beaconHitProxy);
  scene.add(beaconRoot);

  // ---------------------------------------------------------------------------
  // EXPLORER AVATAR (Composite 7-Part Articulated Hover-Explorer)
  // ---------------------------------------------------------------------------
  const explorerRoot = new THREE.Group();
  const explorerPos = new THREE.Vector3(0, 0.04, 4.6);
  explorerRoot.position.copy(explorerPos);

  const expShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.35, 1.35)), contactShadowMat);
  expShadow.rotation.x = -Math.PI / 2;
  expShadow.position.y = 0.01;
  explorerRoot.add(expShadow);

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.75;

  const hullMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.18,
      clearcoat: 0.65,
    })
  );
  const visorMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.65,
      clearcoat: 1.0,
    })
  );
  const accentGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.25,
      roughness: 0.2,
    })
  );

  // 1. Lower thruster base
  const thrusterBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.15, 0.24, 16)), darkSlateMat);
  thrusterBase.position.y = -0.34;
  thrusterBase.castShadow = true;
  bodyGroup.add(thrusterBase);

  // 2. Thruster glow ring
  const thrusterGlow = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.16, 0.025, 8, 24)), accentGlowMat);
  thrusterGlow.rotation.x = Math.PI / 2;
  thrusterGlow.position.y = -0.45;
  bodyGroup.add(thrusterGlow);

  // 3. Main ceramic-white chassis torso
  const chassis = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.32, 0.34, 8, 18)), hullMat);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  bodyGroup.add(chassis);

  // 4. Waist brass collar ring
  const waistRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.33, 0.025, 10, 28)), brushedBrassMat);
  waistRing.rotation.x = Math.PI / 2;
  waistRing.position.y = -0.06;
  bodyGroup.add(waistRing);

  // 5. Front Obsidian Glass Visor (facing -Z initially toward the door!)
  const visor = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.26, 20, 14, 0, Math.PI * 2, 0.3, 1.3)), visorMat);
  visor.position.set(0, 0.18, -0.11);
  visor.scale.set(1.05, 0.85, 0.85);
  bodyGroup.add(visor);

  // 6. Front Optical Sensor Strip
  const opticStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.045, 0.05)), accentGlowMat);
  opticStrip.position.set(0, 0.2, -0.33);
  bodyGroup.add(opticStrip);

  // 7. Twin Side Stabilizer Fins
  const finGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.34, 0.22));
  [-0.36, 0.36].forEach((fx) => {
    const fin = new THREE.Mesh(finGeo, darkSlateMat);
    fin.position.set(fx, -0.04, 0.04);
    fin.rotation.z = fx > 0 ? -0.16 : 0.16;
    fin.castShadow = true;
    bodyGroup.add(fin);
  });

  explorerRoot.add(bodyGroup);
  scene.add(explorerRoot);

  // ---------------------------------------------------------------------------
  // POOLED PARTICLE BURSTS FOR COLLECTIBLE DISAPPEAR EFFECT (Zero Runtime GC)
  // ---------------------------------------------------------------------------
  const burstPool: ParticleBurst[] = [];
  const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.075, 0));
  const ringBurstGeo = trackGeo(new THREE.RingGeometry(0.18, 0.26, 28));

  for (let b = 0; b < 3; b++) {
    const ringMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    const ringMesh = new THREE.Mesh(ringBurstGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.visible = false;
    scene.add(ringMesh);

    const shards: ParticleBurst['shards'] = [];
    for (let s = 0; s < 16; s++) {
      const sm = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          transparent: true,
          opacity: 1,
        })
      );
      const mesh = new THREE.Mesh(shardGeo, sm);
      mesh.visible = false;
      scene.add(mesh);
      shards.push({
        mesh,
        velocity: new THREE.Vector3(),
        spin: new THREE.Vector3(),
      });
    }

    burstPool.push({
      active: false,
      age: 0,
      maxAge: 0.75,
      origin: new THREE.Vector3(),
      color: new THREE.Color(),
      ringMesh,
      ringMat,
      shards,
    });
  }

  let nextBurstIdx = 0;
  const triggerBurst = (pos: THREE.Vector3, colorHex: number) => {
    const burst = burstPool[nextBurstIdx];
    nextBurstIdx = (nextBurstIdx + 1) % burstPool.length;
    burst.active = true;
    burst.age = 0;
    burst.origin.copy(pos);
    burst.color.setHex(colorHex);

    burst.ringMesh.visible = true;
    burst.ringMesh.position.set(pos.x, pos.y - 0.55, pos.z);
    burst.ringMesh.scale.setScalar(1);
    burst.ringMat.color.setHex(colorHex);
    burst.ringMat.opacity = 0.9;

    burst.shards.forEach((s, idx) => {
      const angle = (idx / burst.shards.length) * Math.PI * 2 + (idx % 3) * 0.25;
      const radialSpeed = 1.6 + (idx % 4) * 0.55;
      s.velocity.set(
        Math.cos(angle) * radialSpeed,
        1.4 + (idx % 5) * 0.42,
        Math.sin(angle) * radialSpeed
      );
      s.spin.set(3 + (idx % 3) * 2, 4 + (idx % 4) * 1.5, 2.5);
      s.mesh.position.copy(pos);
      s.mesh.scale.setScalar(1);
      s.mesh.visible = true;
      const mat = s.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(colorHex);
      mat.emissive.setHex(colorHex);
      mat.opacity = 1;
    });
  };

  const updateParticles = (dt: number) => {
    for (let i = 0; i < burstPool.length; i++) {
      const burst = burstPool[i];
      if (!burst.active) continue;

      burst.age += dt;
      const t = burst.age / burst.maxAge;
      if (t >= 1) {
        burst.active = false;
        burst.ringMesh.visible = false;
        for (let s = 0; s < burst.shards.length; s++) {
          burst.shards[s].mesh.visible = false;
        }
        continue;
      }

      const easeOut = 1 - Math.pow(1 - t, 3);
      burst.ringMesh.scale.setScalar(1 + easeOut * 4.5);
      burst.ringMat.opacity = (1 - t) * 0.85;

      for (let s = 0; s < burst.shards.length; s++) {
        const sh = burst.shards[s];
        sh.velocity.y -= 5.2 * dt;
        sh.mesh.position.addScaledVector(sh.velocity, dt);
        sh.mesh.rotation.x += sh.spin.x * dt;
        sh.mesh.rotation.y += sh.spin.y * dt;
        sh.mesh.scale.setScalar(Math.max(0.01, 1 - t));
        (sh.mesh.material as THREE.MeshStandardMaterial).opacity = 1 - t;
      }
    }
  };

  // Lighting atmosphere interpolation (Daylight <-> Twilight)
  const applyLightingBlend = (
    twilightAmount: number,
    keyIntensityScale: number,
    targetScene: THREE.Scene
  ) => {
    _blendColor.copy(_daySky).lerp(_twilightSky, twilightAmount);
    if (targetScene.background instanceof THREE.Color) {
      targetScene.background.copy(_blendColor);
    }
    if (targetScene.fog instanceof THREE.FogExp2) {
      targetScene.fog.color.copy(_blendColor);
      targetScene.fog.density = THREE.MathUtils.lerp(0.022, 0.032, twilightAmount);
    }

    keyLight.color.copy(_dayKeyColor).lerp(_twilightKeyColor, twilightAmount);
    keyLight.intensity = THREE.MathUtils.lerp(1.9, 0.62, twilightAmount) * keyIntensityScale;

    hemiLight.color.copy(_dayHemiSky).lerp(_twilightHemiSky, twilightAmount);
    hemiLight.groundColor.copy(_dayHemiGround).lerp(_twilightHemiGround, twilightAmount);
    hemiLight.intensity = THREE.MathUtils.lerp(0.85, 0.42, twilightAmount);

    rimLight.intensity = THREE.MathUtils.lerp(0.55, 0.85, twilightAmount);

    const lanternPower = THREE.MathUtils.lerp(0.35, 3.2, twilightAmount);
    for (let i = 0; i < vaultLanterns.length; i++) {
      vaultLanterns[i].intensity = lanternPower;
      lanternOrbMats[i].emissiveIntensity = THREE.MathUtils.lerp(0.35, 2.2, twilightAmount);
    }
    orbMat.emissiveIntensity = THREE.MathUtils.lerp(0.65, 2.1, twilightAmount);
  };

  // Simple AABB collision solver (courtyard bounds + vault walls + closed door barrier!)
  const resolveCollision = (pos: THREE.Vector3, doorOpenProgress: number) => {
    // Overall courtyard/vault walkable perimeter
    pos.x = THREE.MathUtils.clamp(pos.x, -7.2, 7.2);
    pos.z = THREE.MathUtils.clamp(pos.z, -11.1, 7.2);

    // Inside vault lateral wall containment (z < -3.7)
    if (pos.z < -3.65) {
      pos.x = THREE.MathUtils.clamp(pos.x, -5.05, 5.05);
    }

    // Front vault wall barrier at z = -4.0 (depth -4.65 to -3.35)
    const inWallZBand = pos.z < -3.38 && pos.z > -4.62;
    if (inWallZBand) {
      const insideDoorwayOpening = Math.abs(pos.x) < 1.18;
      const doorAllowsPassage = doorOpenProgress >= 0.52;

      if (!insideDoorwayOpening || !doorAllowsPassage) {
        // Push out smoothly to whichever side is closer
        if (pos.z >= -4.0) {
          pos.z = -3.38;
        } else {
          pos.z = -4.62;
        }
      }
    }
  };

  return {
    textures,
    walkableFloor,
    walkMarker,
    walkMarkerMat,
    explorer: {
      root: explorerRoot,
      bodyGroup,
      position: explorerPos,
      targetPosition: null,
      facingAngle: 0,
      speed: 5.2,
    },
    door: {
      root: doorRoot,
      leftLeaf,
      rightLeaf,
      hitProxy: doorHitProxy,
      sensorStripMat,
      padGlowMat,
      position: new THREE.Vector3(0, 0, -4.0),
      openProgress: 0,
      isOpen: false,
      proximityRadius: 3.8,
    },
    collectibles,
    beacon: {
      root: beaconRoot,
      hitProxy: beaconHitProxy,
      orbMat,
      position: beaconPos,
      hoverAmount: 0,
    },
    lights: {
      keyLight,
      hemiLight,
      rimLight,
      vaultLanterns,
      lanternOrbMats,
    },
    burstPool,
    triggerBurst,
    updateParticles,
    applyLightingBlend,
    resolveCollision,
    dispose: () => {
      textures.dispose();
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
    },
  };
}
