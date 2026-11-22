import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  DoorOpen,
  DoorClosed,
  Lock,
  Sparkles,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Compass,
  Footprints,
  Eye,
} from 'lucide-react';
import {
  buildInteractiveEnvironment,
  COLLECTIBLE_SPECS,
  DoorControlMode,
  InteractiveSceneRig,
  LightingPreset,
} from '../three/sceneBuilder';
import { SceneAudioEngine } from '../three/audio';

export interface SceneTelemetry {
  doorState: 'Closed' | 'Opening' | 'Open' | 'Closing' | 'Locked';
  doorOpenPercent: number;
  collectedCount: number;
  totalCollectibles: number;
  lightingPreset: LightingPreset;
  doorMode: DoorControlMode;
  nearestPrompt: string | null;
}

export interface Interactive3DViewportProps {
  keyLightIntensity?: number;
  cameraFov?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onLogEvent?: (message: string) => void;
  onTelemetryChange?: (telemetry: SceneTelemetry) => void;
  externalCommand?: { type: 'rebuild' | 'approach_door' | 'respawn'; nonce: number } | null;
}

// Module-scope reusable math helpers (zero per-frame GC allocation)
const _pointer = new THREE.Vector2();
const _moveDir = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _prevExplorerPos = new THREE.Vector3();
const _deltaPos = new THREE.Vector3();
const _burstPos = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _amberColor = new THREE.Color(0xf59e0b);
const _emeraldColor = new THREE.Color(0x10b981);
const _roseColor = new THREE.Color(0xf43f5e);
const _skyColor = new THREE.Color(0x38bdf8);

export const Interactive3DViewport: React.FC<Interactive3DViewportProps> = ({
  keyLightIntensity = 1.0,
  cameraFov = 46,
  isExpanded = false,
  onToggleExpand,
  onLogEvent,
  onTelemetryChange,
  externalCommand,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Interactive HUD state
  const [doorMode, setDoorMode] = useState<DoorControlMode>('auto');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('daylight');
  const [cameraMode, setCameraMode] = useState<'follow' | 'orbit'>('follow');
  const [soundMuted, setSoundMuted] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const [telemetry, setTelemetry] = useState<SceneTelemetry>({
    doorState: 'Closed',
    doorOpenPercent: 0,
    collectedCount: 0,
    totalCollectibles: COLLECTIBLE_SPECS.length,
    lightingPreset: 'daylight',
    doorMode: 'auto',
    nearestPrompt: null,
  });

  // Mutable refs accessed inside animation loop without recreating WebGL context
  const propsRef = useRef({
    keyLightIntensity,
    cameraFov,
    doorMode,
    lightingPreset,
    cameraMode,
    soundMuted,
  });
  propsRef.current = {
    keyLightIntensity,
    cameraFov,
    doorMode,
    lightingPreset,
    cameraMode,
    soundMuted,
  };

  const callbacksRef = useRef({ onLogEvent, onTelemetryChange });
  callbacksRef.current = { onLogEvent, onTelemetryChange };

  const actionsRef = useRef<{
    approachDoor: () => void;
    respawnAll: () => void;
    toggleLighting: () => void;
    setDoorModeExternal: (mode: DoorControlMode) => void;
    collectNearestOrInteract: () => void;
  } | null>(null);

  const audioRef = useRef<SceneAudioEngine | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setMuted(soundMuted);
    }
  }, [soundMuted]);

  // Respond to external Studio Applet commands (e.g. Rebuild Viewport button)
  useEffect(() => {
    if (!externalCommand || !actionsRef.current) return;
    if (externalCommand.type === 'respawn' || externalCommand.type === 'rebuild') {
      actionsRef.current.respawnAll();
    } else if (externalCommand.type === 'approach_door') {
      actionsRef.current.approachDoor();
    }
  }, [externalCommand]);

  // Keyboard shortcut H to collapse/expand bottom HUD dock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Main WebGL Scene Initialization (runs strictly once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL via renderer string (never UA)
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL rendering context could not be initialized on this browser.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initWidth = Math.max(container.clientWidth, 320);
    const initHeight = Math.max(container.clientHeight, 240);
    renderer.setSize(initWidth, initHeight);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.outline = 'none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // WebGL context lost / restored safety handlers
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('WebGL context lost. Waiting for GPU recovery...');
    };
    const onContextRestored = () => {
      setWebglError(null);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();

    // Mandatory procedural studio environment map on every device
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(
      propsRef.current.cameraFov,
      initWidth / initHeight,
      0.1,
      180
    );
    camera.position.set(0, 5.2, 10.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 3.2;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minPolarAngle = 0.18;
    controls.target.set(0, 1.0, 2.2);
    controls.update();

    // Build complete interactive 3D world
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const rig: InteractiveSceneRig = buildInteractiveEnvironment(scene, maxAnisotropy, isSoftwareGl);

    // Pre-warm shaders on hardware GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const audio = new SceneAudioEngine();
    audio.setMuted(propsRef.current.soundMuted);
    audioRef.current = audio;

    // Collect interactive raycast targets
    const interactiveProxies: THREE.Object3D[] = [
      rig.door.hitProxy,
      rig.beacon.hitProxy,
      ...rig.collectibles.map((c) => c.hitProxy),
    ];

    const raycaster = new THREE.Raycaster();
    const keysPressed: Record<string, boolean> = {};
    let hoveredObj: THREE.Object3D | null = null;
    let lastHoverCheck = 0;
    let pointerDownPos = { x: 0, y: 0 };
    let twilightBlend = propsRef.current.lightingPreset === 'twilight' ? 1 : 0;
    let walkMarkerFade = 0;
    let lastDoorTriggeredState = false;
    let lastLoggedDoorMode: DoorControlMode = propsRef.current.doorMode;
    let lastTelemetryPush = 0;

    const logEvent = (msg: string) => {
      callbacksRef.current.onLogEvent?.(msg);
    };

    const collectItem = (collectibleId: string, via: 'click' | 'proximity' | 'key') => {
      const entity = rig.collectibles.find((c) => c.spec.id === collectibleId);
      if (!entity || entity.collected || entity.disappearing) return;

      entity.disappearing = true;
      entity.disappearProgress = 0;
      entity.collected = true;

      // Spawn crystalline particle burst at artifact world position
      entity.artifactGroup.getWorldPosition(_burstPos);
      rig.triggerBurst(_burstPos, entity.spec.color);

      const newCount = rig.collectibles.filter((c) => c.collected).length;
      audio.playCollect(newCount);

      const methodLabel = via === 'click' ? 'clicked' : via === 'key' ? 'interacted [E]' : 'collected on approach';
      logEvent(
        `[COLLECTIBLE] "${entity.spec.name}" ${methodLabel} — item disappeared (${newCount}/${rig.collectibles.length}).`
      );
      if (newCount === rig.collectibles.length) {
        logEvent('[OBJECTIVE] All 5 crystalline relics recovered across courtyard and vault.');
      }
    };

    const toggleLightingInternal = () => {
      const next: LightingPreset = propsRef.current.lightingPreset === 'daylight' ? 'twilight' : 'daylight';
      setLightingPreset(next);
      audio.playSwitch(next === 'twilight');
      logEvent(
        `[ENVIRONMENT] Lighting beacon toggled — transitioning to ${next === 'twilight' ? 'Twilight Courtyard' : 'Sunlit Daylight'}.`
      );
    };

    const cycleDoorManual = () => {
      const cur = propsRef.current.doorMode;
      const next: DoorControlMode = cur === 'auto' ? 'open' : cur === 'open' ? 'locked' : 'auto';
      setDoorMode(next);
      logEvent(`[DOOR] Portal control mode changed to "${next.toUpperCase()}".`);
    };

    // Expose actions for React HUD buttons
    actionsRef.current = {
      approachDoor: () => {
        // If already near door outside, walk through into the vault; otherwise walk right onto sensor pad
        const distToDoor = Math.hypot(
          rig.explorer.position.x - rig.door.position.x,
          rig.explorer.position.z - rig.door.position.z
        );
        const destZ = distToDoor < 2.6 && rig.explorer.position.z > -4.0 ? -6.4 : -1.95;
        if (!rig.explorer.targetPosition) {
          rig.explorer.targetPosition = new THREE.Vector3();
        }
        rig.explorer.targetPosition.set(0, 0.04, destZ);
        rig.walkMarker.position.set(0, 0, destZ);
        walkMarkerFade = 1;
        logEvent(
          destZ < -4.0
            ? '[NAV] Explorer walking through automated portal into Sanctuary Vault.'
            : '[NAV] Explorer approaching proximity door sensor threshold.'
        );
      },
      respawnAll: () => {
        rig.collectibles.forEach((c) => {
          c.collected = false;
          c.disappearing = false;
          c.disappearProgress = 0;
          c.artifactGroup.visible = true;
          c.artifactGroup.scale.setScalar(1);
          c.pedestalRingMat.emissiveIntensity = 0.75;
          c.pedestalRingMat.color.setHex(c.spec.color);
        });
        rig.explorer.position.set(0, 0.04, 4.6);
        rig.explorer.targetPosition = null;
        rig.explorer.facingAngle = 0;
        rig.explorer.root.position.copy(rig.explorer.position);
        setDoorMode('auto');
        logEvent('[SCENE] Respawned all 5 collectible relics and reset explorer position.');
      },
      toggleLighting: toggleLightingInternal,
      setDoorModeExternal: (mode: DoorControlMode) => setDoorMode(mode),
      collectNearestOrInteract: () => {
        // Check nearest uncollected item within 2.75 units
        let closest: (typeof rig.collectibles)[0] | null = null;
        let closestDist = 2.75;
        for (const c of rig.collectibles) {
          if (c.collected) continue;
          const d = Math.hypot(
            rig.explorer.position.x - c.root.position.x,
            rig.explorer.position.z - c.root.position.z
          );
          if (d < closestDist) {
            closestDist = d;
            closest = c;
          }
        }
        if (closest) {
          collectItem(closest.spec.id, 'key');
          return;
        }
        // Check lighting beacon within 2.5 units
        const beaconDist = Math.hypot(
          rig.explorer.position.x - rig.beacon.position.x,
          rig.explorer.position.z - rig.beacon.position.z
        );
        if (beaconDist < 2.5) {
          toggleLightingInternal();
        }
      },
    };

    const updatePointerCoords = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos.x = e.clientX;
      pointerDownPos.y = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 45) return; // throttled hover raycasting
      lastHoverCheck = now;

      updatePointerCoords(e);
      raycaster.setFromCamera(_pointer, camera);

      const hits = raycaster.intersectObjects(interactiveProxies, false);
      let validHit: THREE.Object3D | null = null;
      for (const h of hits) {
        const ud = h.object.userData;
        if (ud.interactType === 'collectible') {
          const item = rig.collectibles.find((c) => c.spec.id === ud.collectibleId);
          if (item && !item.collected) {
            validHit = h.object;
            break;
          }
        } else {
          validHit = h.object;
          break;
        }
      }
      hoveredObj = validHit;
      renderer.domElement.style.cursor = hoveredObj ? 'pointer' : 'grab';
    };

    const onPointerUp = (e: PointerEvent) => {
      // Ignore camera orbit drags
      const dragDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dragDist > 6) return;

      updatePointerCoords(e);
      raycaster.setFromCamera(_pointer, camera);

      // 1. Check direct click on interactive entities (collectibles, beacon, door)
      const entityHits = raycaster.intersectObjects(interactiveProxies, false);
      for (const hit of entityHits) {
        const ud = hit.object.userData;
        if (ud.interactType === 'collectible') {
          const item = rig.collectibles.find((c) => c.spec.id === ud.collectibleId);
          if (item && !item.collected) {
            collectItem(item.spec.id, 'click');
            return;
          }
        } else if (ud.interactType === 'beacon') {
          toggleLightingInternal();
          return;
        } else if (ud.interactType === 'door') {
          cycleDoorManual();
          return;
        }
      }

      // 2. Otherwise click-to-walk on the courtyard / vault floor
      const floorHits = raycaster.intersectObject(rig.walkableFloor, false);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        if (!rig.explorer.targetPosition) {
          rig.explorer.targetPosition = new THREE.Vector3();
        }
        rig.explorer.targetPosition.set(pt.x, 0.04, pt.z);
        rig.walkMarker.position.set(pt.x, 0, pt.z);
        walkMarkerFade = 1;
      }
    };

    const isTypingInForm = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInForm(e.target)) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keysPressed[e.code] = true;
        // Cancel click-to-move target when manual keyboard movement starts
        rig.explorer.targetPosition = null;
      }
      if (e.code === 'KeyE') {
        actionsRef.current?.collectNearestOrInteract();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 200);
        const h = Math.max(Math.floor(entry.contentRect.height), 180);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Main frame loop with software-WebGL afterDraw pacing
    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync && gl.deleteSync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync && gl.deleteSync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsed = now * 0.001;

      const cfg = propsRef.current;

      // Sync Camera FOV smoothly if changed from Studio controls
      if (Math.abs(camera.fov - cfg.cameraFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, cfg.cameraFov, 8, dt);
        camera.updateProjectionMatrix();
      }

      // 1. Explorer movement (Keyboard WASD/Arrows OR Click-to-Walk)
      _prevExplorerPos.copy(rig.explorer.position);
      _moveDir.set(0, 0, 0);

      const moveF = (keysPressed['KeyW'] || keysPressed['ArrowUp'] ? 1 : 0) - (keysPressed['KeyS'] || keysPressed['ArrowDown'] ? 1 : 0);
      const moveR = (keysPressed['KeyD'] || keysPressed['ArrowRight'] ? 1 : 0) - (keysPressed['KeyA'] || keysPressed['ArrowLeft'] ? 1 : 0);

      if (moveF !== 0 || moveR !== 0) {
        camera.getWorldDirection(_camForward);
        _camForward.y = 0;
        if (_camForward.lengthSq() > 0.0001) _camForward.normalize();
        _camRight.crossVectors(_camForward, _upAxis).normalize();

        _moveDir.addScaledVector(_camForward, moveF).addScaledVector(_camRight, moveR);
        if (_moveDir.lengthSq() > 0.0001) _moveDir.normalize();
      } else if (rig.explorer.targetPosition) {
        _moveDir.subVectors(rig.explorer.targetPosition, rig.explorer.position);
        _moveDir.y = 0;
        const remaining = _moveDir.length();
        if (remaining < 0.16) {
          rig.explorer.targetPosition = null;
          _moveDir.set(0, 0, 0);
        } else {
          _moveDir.divideScalar(remaining);
        }
      }

      const isMoving = _moveDir.lengthSq() > 0.0001;
      if (isMoving) {
        rig.explorer.position.addScaledVector(_moveDir, rig.explorer.speed * dt);
        rig.resolveCollision(rig.explorer.position, rig.door.openProgress);

        // Smoothly rotate explorer to face movement direction (model visor faces -Z)
        const targetAngle = Math.atan2(-_moveDir.x, -_moveDir.z);
        let diff = targetAngle - rig.explorer.facingAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        rig.explorer.facingAngle += diff * (1 - Math.exp(-10 * dt));
      }

      rig.explorer.root.position.copy(rig.explorer.position);
      rig.explorer.root.rotation.y = rig.explorer.facingAngle;

      // Subtle hover bob and forward movement pitch tilt
      rig.explorer.bodyGroup.position.y = 0.74 + Math.sin(elapsed * 3.1) * 0.045;
      const targetPitch = isMoving ? -0.14 : 0;
      rig.explorer.bodyGroup.rotation.x = THREE.MathUtils.damp(rig.explorer.bodyGroup.rotation.x, targetPitch, 9, dt);

      // Update click-to-move ground marker fade
      if (walkMarkerFade > 0.01) {
        walkMarkerFade = Math.max(0, walkMarkerFade - dt * 1.6);
        rig.walkMarkerMat.opacity = walkMarkerFade * 0.85;
        rig.walkMarker.scale.setScalar(1 + (1 - walkMarkerFade) * 0.7);
      } else {
        rig.walkMarkerMat.opacity = 0;
      }

      // Smooth Follow Camera tracking (maintains user orbit offset)
      if (cfg.cameraMode === 'follow') {
        _deltaPos.subVectors(rig.explorer.position, _prevExplorerPos);
        camera.position.add(_deltaPos);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, rig.explorer.position.x, 6.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, 1.1, 6.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, rig.explorer.position.z - 0.5, 6.5, dt);
      }
      controls.update();

      // 2. Proximity-Triggered Door Logic
      const distToDoor = Math.hypot(
        rig.explorer.position.x - rig.door.position.x,
        rig.explorer.position.z - rig.door.position.z
      );
      const camDistToDoor =
        cfg.cameraMode === 'orbit'
          ? Math.hypot(camera.position.x - rig.door.position.x, camera.position.z - rig.door.position.z)
          : Infinity;
      const effectiveDist = Math.min(distToDoor, camDistToDoor);

      let shouldBeOpen = rig.door.isOpen;
      if (cfg.doorMode === 'open') {
        shouldBeOpen = true;
      } else if (cfg.doorMode === 'locked') {
        shouldBeOpen = false;
      } else {
        // Hysteresis prevents rapid chatter on threshold boundary
        if (!rig.door.isOpen && effectiveDist < rig.door.proximityRadius) {
          shouldBeOpen = true;
        } else if (rig.door.isOpen && effectiveDist > rig.door.proximityRadius + 0.55) {
          shouldBeOpen = false;
        }
      }

      if (shouldBeOpen !== lastDoorTriggeredState || cfg.doorMode !== lastLoggedDoorMode) {
        if (shouldBeOpen !== lastDoorTriggeredState) {
          audio.playDoorSlide(shouldBeOpen);
          if (cfg.doorMode === 'auto') {
            logEvent(
              shouldBeOpen
                ? `[PROXIMITY DOOR] User approached threshold (${effectiveDist.toFixed(1)}m) — sliding portal open.`
                : `[PROXIMITY DOOR] User departed threshold — sliding portal closed.`
            );
          }
          lastDoorTriggeredState = shouldBeOpen;
        }
        lastLoggedDoorMode = cfg.doorMode;
      }

      rig.door.isOpen = shouldBeOpen;
      const targetOpen = shouldBeOpen ? 1 : 0;
      rig.door.openProgress = THREE.MathUtils.damp(rig.door.openProgress, targetOpen, 6.0, dt);

      // Slide dual architectural door leaves cleanly into wall pockets
      const slideOffset = rig.door.openProgress * 1.42;
      rig.door.leftLeaf.position.x = -0.76 - slideOffset;
      rig.door.rightLeaf.position.x = 0.76 + slideOffset;

      // Update door overhead sensor light color & floor threshold pad glow
      const stripTargetColor =
        cfg.doorMode === 'locked' ? _roseColor : shouldBeOpen ? _emeraldColor : _amberColor;
      rig.door.sensorStripMat.color.lerp(stripTargetColor, 1 - Math.exp(-8 * dt));
      rig.door.sensorStripMat.emissive.lerp(stripTargetColor, 1 - Math.exp(-8 * dt));

      const proximityFactor = THREE.MathUtils.clamp(1 - (effectiveDist - 1.5) / 4.5, 0, 1);
      rig.door.padGlowMat.emissive.lerp(shouldBeOpen ? _emeraldColor : _skyColor, 1 - Math.exp(-8 * dt));
      rig.door.padGlowMat.emissiveIntensity = 0.25 + proximityFactor * 1.45;

      // 3. Collectible Items Animation, Hover Highlight, Proximity Auto-Pickup & Disappearance
      let nearestPrompt: string | null = null;
      let nearestInteractDist = Infinity;

      for (let i = 0; i < rig.collectibles.length; i++) {
        const item = rig.collectibles[i];

        if (item.disappearing) {
          item.disappearProgress += dt * 3.8;
          if (item.disappearProgress >= 1) {
            item.disappearing = false;
            item.artifactGroup.visible = false;
            item.pedestalRingMat.emissiveIntensity = 0.08;
            item.pedestalRingMat.color.setHex(0x475569);
          } else {
            const p = item.disappearProgress;
            const s = Math.max(0.001, 1 - p * p);
            item.artifactGroup.scale.setScalar(s);
            item.artifactGroup.rotation.y += dt * 14;
            item.artifactGroup.position.y = item.baseY + p * 0.45;
          }
          continue;
        }

        if (item.collected) continue;

        const dToItem = Math.hypot(
          rig.explorer.position.x - item.root.position.x,
          rig.explorer.position.z - item.root.position.z
        );

        // Seamless walk-into pickup if explorer steps directly onto collectible pedestal
        if (dToItem < 1.12) {
          collectItem(item.spec.id, 'proximity');
          continue;
        }

        const isHovered = hoveredObj === item.hitProxy;
        const isNearby = dToItem < 2.65;
        item.hoverAmount = THREE.MathUtils.damp(item.hoverAmount, isHovered || isNearby ? 1 : 0, 10, dt);

        // Floating bob, faceted spin, counter-rotating gyro rings
        item.artifactGroup.position.y =
          item.baseY + Math.sin(elapsed * 2.4 + item.phaseOffset) * 0.1 + item.hoverAmount * 0.14;
        item.crystalMesh.rotation.y += dt * (0.9 + item.hoverAmount * 1.8);
        item.outerRing.rotation.z += dt * (0.75 + item.hoverAmount * 1.2);
        item.innerRing.rotation.x -= dt * (1.05 + item.hoverAmount * 1.4);

        const targetScale = 1 + item.hoverAmount * 0.16;
        item.artifactGroup.scale.setScalar(targetScale);
        item.crystalMat.emissiveIntensity = 0.45 + item.hoverAmount * 0.85;

        if (isHovered) {
          nearestPrompt = `${item.spec.name} — Click to collect`;
          nearestInteractDist = 0;
        } else if (isNearby && dToItem < nearestInteractDist) {
          nearestInteractDist = dToItem;
          nearestPrompt = `${item.spec.name} — Press E or click to collect`;
        }
      }

      // Check Lighting Beacon hover / proximity cue
      const beaconHovered = hoveredObj === rig.beacon.hitProxy;
      const beaconDist = Math.hypot(
        rig.explorer.position.x - rig.beacon.position.x,
        rig.explorer.position.z - rig.beacon.position.z
      );
      if (!nearestPrompt && (beaconHovered || beaconDist < 2.25)) {
        nearestPrompt = `Lighting Beacon — ${beaconHovered ? 'Click' : 'Press E or click'} for ${
          cfg.lightingPreset === 'daylight' ? 'Twilight' : 'Daylight'
        }`;
      } else if (!nearestPrompt && hoveredObj === rig.door.hitProxy) {
        nearestPrompt = `Automated Portal Door — Click to cycle mode (${cfg.doorMode})`;
      } else if (!nearestPrompt && cfg.doorMode === 'locked' && effectiveDist < rig.door.proximityRadius) {
        nearestPrompt = 'Portal Door is locked — switch to Auto or Open below';
      }

      // 4. Lighting Preset Smooth Blend
      const targetTwilight = cfg.lightingPreset === 'twilight' ? 1 : 0;
      twilightBlend = THREE.MathUtils.damp(twilightBlend, targetTwilight, 3.8, dt);
      rig.applyLightingBlend(twilightBlend, Math.max(0.25, cfg.keyLightIntensity), scene);

      // 5. Update Particle Bursts
      rig.updateParticles(dt);

      // Render frame
      renderer.render(scene, camera);

      // Push throttled telemetry snapshot to React HUD (~10Hz)
      if (now - lastTelemetryPush > 100) {
        lastTelemetryPush = now;
        const collectedCount = rig.collectibles.filter((c) => c.collected).length;
        let doorState: SceneTelemetry['doorState'] = 'Closed';
        if (cfg.doorMode === 'locked') {
          doorState = 'Locked';
        } else if (rig.door.openProgress > 0.92) {
          doorState = 'Open';
        } else if (rig.door.openProgress < 0.08) {
          doorState = 'Closed';
        } else {
          doorState = shouldBeOpen ? 'Opening' : 'Closing';
        }

        const snapshot: SceneTelemetry = {
          doorState,
          doorOpenPercent: Math.round(rig.door.openProgress * 100),
          collectedCount,
          totalCollectibles: rig.collectibles.length,
          lightingPreset: cfg.lightingPreset,
          doorMode: cfg.doorMode,
          nearestPrompt,
        };
        setTelemetry((prev) => {
          if (
            prev.doorState === snapshot.doorState &&
            prev.doorOpenPercent === snapshot.doorOpenPercent &&
            prev.collectedCount === snapshot.collectedCount &&
            prev.lightingPreset === snapshot.lightingPreset &&
            prev.doorMode === snapshot.doorMode &&
            prev.nearestPrompt === snapshot.nearestPrompt
          ) {
            return prev;
          }
          callbacksRef.current.onTelemetryChange?.(snapshot);
          return snapshot;
        });
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.dispose();
      rig.dispose();
      envTarget.dispose();
      audio.dispose();
      renderer.dispose();
    };
  }, []);

  const handleDoorModeChange = useCallback((mode: DoorControlMode) => {
    setDoorMode(mode);
    callbacksRef.current.onLogEvent?.(`[DOOR] Portal override set to "${mode.toUpperCase()}".`);
  }, []);

  const handleToggleLighting = useCallback(() => {
    actionsRef.current?.toggleLighting();
  }, []);

  const allCollected = telemetry.collectedCount === telemetry.totalCollectibles;

  return (
    <div
      id="interactive-3d-viewport"
      className="relative w-full h-full bg-slate-900 overflow-hidden select-none"
    >
      {/* Isolated WebGL Mount Container (never contains React children) */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Graceful WebGL Fallback */}
      {webglError && (
        <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-200">
          <Compass className="w-8 h-8 text-slate-400 mb-3" />
          <p className="text-sm font-semibold">3D Viewport Unavailable</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">{webglError}</p>
        </div>
      )}

      {/* Top-Left Compact Status Readout (Clean unboxed typography, no pulsing dots, no backdrop-blur) */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        <div className="bg-slate-950/85 border border-white/15 rounded-lg px-3.5 py-2 text-white shadow-lg flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-300">Relics</span>
            <span className="font-mono font-semibold tabular-nums text-white">
              {telemetry.collectedCount}/{telemetry.totalCollectibles}
            </span>
          </div>
          <span className="text-white/25" aria-hidden="true">·</span>
          <div className="flex items-center gap-1.5">
            {telemetry.doorState === 'Locked' ? (
              <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : telemetry.doorState === 'Open' || telemetry.doorState === 'Opening' ? (
              <DoorOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <DoorClosed className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="text-slate-300">Portal</span>
            <span className="font-mono font-semibold tabular-nums text-white">
              {telemetry.doorState}
            </span>
          </div>
        </div>
        <div className="bg-slate-950/75 border border-white/10 rounded-md px-2.5 py-1 text-[11px] text-slate-300 w-fit">
          WASD or Click floor to walk · Click relics or press E to collect · Drag to orbit
        </div>
      </div>

      {/* Top-Right Optional Fullscreen Toggle */}
      {onToggleExpand && (
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={onToggleExpand}
            title={isExpanded ? 'Return to Studio Editor' : 'Expand 3D Environment'}
            className="bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 shadow-lg transition cursor-pointer whitespace-nowrap"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expand 3D</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Contextual Interaction Cue / Completion Banner (positioned cleanly above dock) */}
      {(telemetry.nearestPrompt || allCollected) && (
        <div
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-200 ${
            dockCollapsed ? 'bottom-12' : 'bottom-20'
          }`}
        >
          <div className="bg-slate-950/90 border border-white/20 text-white rounded-lg px-3.5 py-1.5 text-xs font-medium shadow-lg whitespace-nowrap flex items-center gap-2">
            {telemetry.nearestPrompt ? (
              <span>{telemetry.nearestPrompt}</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>All 5 relics collected — click Respawn to replay</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Center Occlusion) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-transform duration-200 max-w-[96%] ${
          dockCollapsed ? 'bottom-2 translate-y-[calc(100%-28px)]' : 'bottom-3 translate-y-0'
        }`}
      >
        {/* Collapse / Expand Handle */}
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="bg-slate-950/90 hover:bg-slate-900 border border-b-0 border-white/15 text-slate-300 hover:text-white rounded-t-md px-3 py-0.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
          title="Toggle Controls (H)"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {/* Horizontal Dock Surface */}
        <div className="bg-slate-950/92 border border-white/15 rounded-xl px-3 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-2 text-xs text-slate-200">
          {/* Quick Proximity Walk Action */}
          <button
            type="button"
            id="btn-approach-door"
            onClick={() => actionsRef.current?.approachDoor()}
            className="px-3 py-1.5 bg-white text-slate-950 hover:bg-slate-200 font-semibold rounded-md flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Walk to Door</span>
          </button>

          <div className="w-px h-5 bg-white/15 shrink-0" />

          {/* Door Mode Segmented Control */}
          <div className="flex items-center gap-0.5 bg-slate-900 border border-white/10 rounded-md p-0.5 shrink-0">
            {(['auto', 'open', 'locked'] as DoorControlMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleDoorModeChange(mode)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                  doorMode === mode
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'auto' ? 'Auto Door' : mode === 'open' ? 'Open' : 'Lock'}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/15 shrink-0" />

          {/* Camera Mode */}
          <button
            type="button"
            onClick={() => setCameraMode((m) => (m === 'follow' ? 'orbit' : 'follow'))}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            title="Switch between Follow Camera and Free Orbit"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>{cameraMode === 'follow' ? 'Follow Cam' : 'Free Orbit'}</span>
          </button>

          {/* Atmosphere Toggle */}
          <button
            type="button"
            onClick={handleToggleLighting}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            title="Switch Day / Twilight lighting"
          >
            {lightingPreset === 'daylight' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Daylight</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-300" />
                <span>Twilight</span>
              </>
            )}
          </button>

          {/* Respawn Collectibles */}
          <button
            type="button"
            id="btn-respawn-items"
            onClick={() => actionsRef.current?.respawnAll()}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            title="Respawn all collectible relics and reset position"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Respawn</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundMuted((m) => !m)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-md text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            title={soundMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            aria-label={soundMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          >
            {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Interactive3DViewport;
