import * as THREE from 'three';

export interface ProceduralTextureSet {
  floorColor: THREE.CanvasTexture;
  floorRoughness: THREE.CanvasTexture;
  doorWood: THREE.CanvasTexture;
  wallStone: THREE.CanvasTexture;
  thresholdPad: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context for procedural texture.');
  }
  return [canvas, ctx];
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const anisotropy = Math.max(1, Math.min(maxAnisotropy, 16));

  // 1. Architectural Stone / Terrazzo Courtyard Paver Tile (Color + Roughness)
  const [floorCanvas, fCtx] = makeCanvas(512, 512);
  const [roughCanvas, rCtx] = makeCanvas(512, 512);

  fCtx.fillStyle = '#ddd8ce';
  fCtx.fillRect(0, 0, 512, 512);
  rCtx.fillStyle = '#c4c4c4';
  rCtx.fillRect(0, 0, 512, 512);

  const tiles = 4;
  const tileSize = 512 / tiles;
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let gx = 0; gx < tiles; gx++) {
    for (let gy = 0; gy < tiles; gy++) {
      const shade = Math.floor(216 + (rand() - 0.5) * 16);
      const warm = Math.floor(shade - 6);
      const cool = Math.floor(shade - 14);
      fCtx.fillStyle = `rgb(${shade}, ${warm}, ${cool})`;
      fCtx.fillRect(gx * tileSize + 2, gy * tileSize + 2, tileSize - 4, tileSize - 4);

      const roughVal = Math.floor(175 + (rand() - 0.5) * 40);
      rCtx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
      rCtx.fillRect(gx * tileSize + 2, gy * tileSize + 2, tileSize - 4, tileSize - 4);

      // Subtle mineral flecks
      for (let i = 0; i < 45; i++) {
        const px = gx * tileSize + 4 + rand() * (tileSize - 8);
        const py = gy * tileSize + 4 + rand() * (tileSize - 8);
        const sz = 1 + rand() * 2.2;
        const dark = rand() > 0.5;
        fCtx.fillStyle = dark ? 'rgba(110, 102, 92, 0.12)' : 'rgba(255, 252, 245, 0.16)';
        fCtx.fillRect(px, py, sz, sz);
      }
    }
  }

  // Mortar lines
  fCtx.strokeStyle = 'rgba(130, 123, 114, 0.45)';
  fCtx.lineWidth = 3;
  rCtx.strokeStyle = '#ffffff';
  rCtx.lineWidth = 4;
  for (let i = 0; i <= tiles; i++) {
    const pos = i * tileSize;
    fCtx.beginPath();
    fCtx.moveTo(pos, 0);
    fCtx.lineTo(pos, 512);
    fCtx.moveTo(0, pos);
    fCtx.lineTo(512, pos);
    fCtx.stroke();

    rCtx.beginPath();
    rCtx.moveTo(pos, 0);
    rCtx.lineTo(pos, 512);
    rCtx.moveTo(0, pos);
    rCtx.lineTo(512, pos);
    rCtx.stroke();
  }

  const floorColor = new THREE.CanvasTexture(floorCanvas);
  floorColor.colorSpace = THREE.SRGBColorSpace;
  floorColor.wrapS = THREE.RepeatWrapping;
  floorColor.wrapT = THREE.RepeatWrapping;
  floorColor.repeat.set(6, 7);
  floorColor.anisotropy = anisotropy;

  const floorRoughness = new THREE.CanvasTexture(roughCanvas);
  floorRoughness.colorSpace = THREE.NoColorSpace;
  floorRoughness.wrapS = THREE.RepeatWrapping;
  floorRoughness.wrapT = THREE.RepeatWrapping;
  floorRoughness.repeat.set(6, 7);
  floorRoughness.anisotropy = anisotropy;

  // 2. Architectural Fluted Timber & Brushed Steel Door Panel Texture
  const [doorCanvas, dCtx] = makeCanvas(256, 512);
  const woodGrad = dCtx.createLinearGradient(0, 0, 256, 0);
  woodGrad.addColorStop(0, '#5a4332');
  woodGrad.addColorStop(0.5, '#6b503b');
  woodGrad.addColorStop(1, '#533d2d');
  dCtx.fillStyle = woodGrad;
  dCtx.fillRect(0, 0, 256, 512);

  // Vertical architectural slats
  const slatCount = 12;
  const slatW = 256 / slatCount;
  for (let i = 0; i < slatCount; i++) {
    const x = i * slatW;
    dCtx.fillStyle = 'rgba(20, 12, 6, 0.28)';
    dCtx.fillRect(x, 0, 2, 512);
    dCtx.fillStyle = 'rgba(255, 224, 190, 0.08)';
    dCtx.fillRect(x + 2, 0, 2, 512);

    // Fine vertical wood grain streaks
    for (let g = 0; g < 8; g++) {
      const gx = x + 3 + rand() * (slatW - 5);
      dCtx.fillStyle = rand() > 0.5 ? 'rgba(30, 18, 10, 0.14)' : 'rgba(210, 175, 135, 0.08)';
      dCtx.fillRect(gx, 0, 1, 512);
    }
  }

  // Subtle horizontal reveal band
  dCtx.fillStyle = 'rgba(25, 20, 16, 0.35)';
  dCtx.fillRect(0, 250, 256, 4);

  const doorWood = new THREE.CanvasTexture(doorCanvas);
  doorWood.colorSpace = THREE.SRGBColorSpace;
  doorWood.anisotropy = anisotropy;

  // 3. Architectural Cast Concrete / Travertine Wall Texture
  const [wallCanvas, wCtx] = makeCanvas(512, 512);
  wCtx.fillStyle = '#e7e4dd';
  wCtx.fillRect(0, 0, 512, 512);

  // Horizontal board-formed concrete bands
  for (let row = 0; row < 8; row++) {
    const y = row * 64;
    const tone = Math.floor(228 + (rand() - 0.5) * 10);
    wCtx.fillStyle = `rgb(${tone}, ${tone - 3}, ${tone - 8})`;
    wCtx.fillRect(0, y, 512, 62);
    wCtx.fillStyle = 'rgba(140, 135, 126, 0.22)';
    wCtx.fillRect(0, y + 62, 512, 2);
  }
  for (let i = 0; i < 600; i++) {
    const px = rand() * 512;
    const py = rand() * 512;
    wCtx.fillStyle = rand() > 0.5 ? 'rgba(110, 105, 98, 0.07)' : 'rgba(255, 255, 255, 0.08)';
    wCtx.fillRect(px, py, 2, 2);
  }

  const wallStone = new THREE.CanvasTexture(wallCanvas);
  wallStone.colorSpace = THREE.SRGBColorSpace;
  wallStone.wrapS = THREE.RepeatWrapping;
  wallStone.wrapT = THREE.RepeatWrapping;
  wallStone.repeat.set(2, 1);
  wallStone.anisotropy = anisotropy;

  // 4. Proximity Threshold Sensor Pad Texture
  const [padCanvas, pCtx] = makeCanvas(512, 512);
  pCtx.fillStyle = '#252b34';
  pCtx.fillRect(0, 0, 512, 512);

  // Outer brass frame border
  pCtx.strokeStyle = '#9ca3af';
  pCtx.lineWidth = 10;
  pCtx.strokeRect(14, 14, 484, 484);

  // Subtle geometric sensor grid lines
  pCtx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
  pCtx.lineWidth = 2;
  for (let x = 64; x < 512; x += 64) {
    pCtx.beginPath();
    pCtx.moveTo(x, 24);
    pCtx.lineTo(x, 488);
    pCtx.stroke();
  }
  for (let y = 64; y < 512; y += 64) {
    pCtx.beginPath();
    pCtx.moveTo(24, y);
    pCtx.lineTo(488, y);
    pCtx.stroke();
  }

  // Dual directional chevrons pointing toward doorway center
  pCtx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
  pCtx.lineWidth = 6;
  pCtx.lineCap = 'round';
  pCtx.lineJoin = 'round';
  const drawChevron = (cy: number, dir: number) => {
    pCtx.beginPath();
    pCtx.moveTo(196, cy + dir * 24);
    pCtx.lineTo(256, cy);
    pCtx.lineTo(316, cy + dir * 24);
    pCtx.stroke();
  };
  drawChevron(390, 1);
  drawChevron(348, 1);
  drawChevron(122, -1);
  drawChevron(164, -1);

  const thresholdPad = new THREE.CanvasTexture(padCanvas);
  thresholdPad.colorSpace = THREE.SRGBColorSpace;
  thresholdPad.anisotropy = anisotropy;

  // 5. Soft Radial Contact Shadow Texture
  const [shadowCanvas, sCtx] = makeCanvas(128, 128);
  const radGrad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  radGrad.addColorStop(0, 'rgba(15, 20, 28, 0.52)');
  radGrad.addColorStop(0.55, 'rgba(15, 20, 28, 0.22)');
  radGrad.addColorStop(1, 'rgba(15, 20, 28, 0.0)');
  sCtx.fillStyle = radGrad;
  sCtx.fillRect(0, 0, 128, 128);

  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  return {
    floorColor,
    floorRoughness,
    doorWood,
    wallStone,
    thresholdPad,
    contactShadow,
    dispose: () => {
      floorColor.dispose();
      floorRoughness.dispose();
      doorWood.dispose();
      wallStone.dispose();
      thresholdPad.dispose();
      contactShadow.dispose();
    },
  };
}
