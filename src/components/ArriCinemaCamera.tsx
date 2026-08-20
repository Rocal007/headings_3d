import { useMemo } from 'react';
import * as THREE from 'three';

// ============================================================================
// PROCEDURAL HIGH-RESOLUTION TEXTURES FOR ARRI ALEXA MINI LF CINEMA RIG
// ============================================================================

/**
 * 1. ARRI Alexa Rear I/O Panel Decal (512x512)
 * High-detail panel with LEMO (BAT, EXT, ETH, AUDIO) & BNC (12G-SDI 1/2, SYNC, TC)
 * certification marks, serial number, and battery guide rails.
 */
function createArriRearIoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Matte dark graphite background
    ctx.fillStyle = '#13151b';
    ctx.fillRect(0, 0, 512, 512);

    // Outer recessed panel border
    ctx.strokeStyle = '#2d3340';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 480, 480);

    // ARRI Branding Header
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARRI', 256, 56);

    ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ALEXA MINI LF', 256, 84);

    // Battery / V-Mount mounting alignment guide
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(48, 108, 416, 280);
    ctx.setLineDash([]);

    // Rear Ports Layout
    const ports = [
      { x: 110, y: 160, r: 24, label: 'SDI 1', type: 'bnc' },
      { x: 256, y: 160, r: 24, label: 'SDI 2', type: 'bnc' },
      { x: 402, y: 160, r: 24, label: 'SYNC', type: 'bnc' },
      { x: 110, y: 270, r: 28, label: 'BAT 24V', type: 'lemo-pwr' },
      { x: 256, y: 270, r: 26, label: 'EXT', type: 'lemo' },
      { x: 402, y: 270, r: 26, label: 'ETH', type: 'lemo' },
      { x: 110, y: 360, r: 22, label: 'AUDIO', type: 'lemo' },
      { x: 256, y: 360, r: 22, label: 'TC IN/OUT', type: 'lemo' },
      { x: 402, y: 360, r: 22, label: 'RS 24V', type: 'lemo' }
    ];

    ports.forEach(p => {
      // Outer metal bezel ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = p.type === 'bnc' ? '#475569' : '#b8860b';
      ctx.fill();

      // Inner socket recess
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0c10';
      ctx.fill();

      // Connector pin contacts / keyways
      if (p.type === 'bnc') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b'; // Gold center pin
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // LEMO multi-pin ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r - 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Red alignment keyway dot at 12 o'clock
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.r + 4, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }

      // Port label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, p.y + p.r + 20);
    });

    // Warning / Spec Labels & Serial Number
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('INPUT: 10.5 - 34 V DC  |  MADE IN GERMANY', 256, 440);
    ctx.fillText('SN: LF-5824  |  CE  FC  RoHS', 256, 465);

    // Decorative Barcode
    ctx.fillStyle = '#334155';
    for (let x = 70; x < 150; x += 4) {
      if ((x * 7) % 5 !== 0) {
        ctx.fillRect(x, 420, 2, 20);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * 2. ARRI BP-8 Bridgeplate Badge (512x128)
 * Iconic emerald green ARRI BP-8 badge with white lettering & German precision index.
 */
function createArriBp8Texture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f1217';
    ctx.fillRect(0, 0, 512, 128);

    // Inner green ARRI logo badge container
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(24, 18, 464, 92);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 18, 464, 92);

    // ARRI Logo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('ARRI', 50, 64);

    // "BP-8" Model
    ctx.font = 'bold 38px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BP-8', 190, 64);

    // Specs & "Made in Germany"
    ctx.font = 'bold 18px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('Bridge Plate 19mm', 310, 52);
    ctx.font = '14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('Made in Germany  •  K2.47090.0', 310, 78);

    // Center alignment tick mark
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(254, 18, 4, 12);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * 3. Cine Prime Lens White Knurled Focus Ring (1024x128)
 * Signature bone-white focus ring with 0.8 Mod knurled grip, dual Imperial/Metric scales
 * and Depth-of-Field witness lines (matching reference photo).
 */
function createWhiteKnurledFocusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc'; // Crisp bone-white base
    ctx.fillRect(0, 0, 1024, 128);

    // 0.8 Mod knurled gear ribs (top half)
    for (let x = 0; x < 1024; x += 4) {
      const isRidge = (x / 4) % 2 === 0;
      ctx.fillStyle = isRidge ? '#ffffff' : '#cbd5e1';
      ctx.fillRect(x, 0, 2, 42);
    }

    // Divider line between gear ribs and distance markings
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 42, 1024, 3);

    // ARRI Prime DNA Branding (Matching Reference Photo)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Prime DNA 45', 30, 68);

    ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('ARRI Rental', 30, 96);

    // Metric Focus Scale (Middle band - Dark Slate)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metricMarks = [
      { x: 230, text: '0.4' },
      { x: 310, text: '0.5' },
      { x: 400, text: '0.6' },
      { x: 490, text: '0.7' },
      { x: 590, text: '0.9' },
      { x: 690, text: '1.2' },
      { x: 780, text: '1.7' },
      { x: 860, text: '3.0' },
      { x: 930, text: '7.0' },
      { x: 990, text: '∞' }
    ];

    metricMarks.forEach(m => {
      ctx.fillStyle = '#0f172a';
      ctx.fillText(m.text, m.x, 62);
      ctx.fillRect(m.x - 1, 45, 2, 8);
    });

    // Imperial Focus Scale (Bottom band - High-vis Orange / Yellow)
    ctx.font = 'bold 14px "Helvetica Neue", Arial, sans-serif';
    const imperialMarks = [
      { x: 30, text: "1'" },
      { x: 90, text: "1'2\"" },
      { x: 160, text: "1'6\"" },
      { x: 240, text: "2'" },
      { x: 340, text: "2'6\"" },
      { x: 440, text: "3'" },
      { x: 550, text: "4'" },
      { x: 660, text: "6'" },
      { x: 760, text: "10'" },
      { x: 860, text: "20'" },
      { x: 940, text: "50'" },
      { x: 980, text: '∞' }
    ];

    imperialMarks.forEach(m => {
      ctx.fillStyle = '#d97706'; // Amber/Orange
      ctx.fillText(m.text, m.x, 102);
      ctx.fillRect(m.x - 1, 115, 2, 8);
    });

    // Intermediate tick marks
    ctx.fillStyle = '#94a3b8';
    for (let x = 10; x < 1024; x += 15) {
      ctx.fillRect(x, 74, 1.5, 6);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

/**
 * 4. Cine Prime Lens Iris / Aperture Ring Texture (512x64)
 * Matte black anodized ring with 0.8 Mod gear teeth & engraved T-Stop scale (T1.4 to T22).
 */
function createLensIrisScaleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#14171d';
    ctx.fillRect(0, 0, 512, 64);

    // 0.8 Mod gear teeth (top band)
    for (let x = 0; x < 512; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? '#333b47' : '#14171d';
      ctx.fillRect(x, 0, 2, 22);
    }

    // T-Stop Markings (bottom band)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tStops = [
      { x: 30, t: 'T1.4' },
      { x: 80, t: '2' },
      { x: 130, t: '2.8' },
      { x: 185, t: '4' },
      { x: 245, t: '5.6' },
      { x: 310, t: '8' },
      { x: 375, t: '11' },
      { x: 440, t: '16' },
      { x: 490, t: '22' }
    ];

    tStops.forEach(ts => {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ts.t, ts.x, 44);
      ctx.fillRect(ts.x - 1, 24, 2, 8);
    });

    // 1/3 Stop intermediary dots
    ctx.fillStyle = '#94a3b8';
    for (let x = 45; x < 490; x += 18) {
      ctx.beginPath();
      ctx.arc(x, 30, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

/**
 * 5. Carbon Fiber Weave Texture (256x256)
 * High-definition 2x2 twill carbon weave for side body plates.
 */
function createCarbonFiberTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181a20';
    ctx.fillRect(0, 0, 256, 256);

    const step = 16;
    for (let y = 0; y < 256; y += step) {
      for (let x = 0; x < 256; x += step) {
        const isPattern = (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0;
        ctx.fillStyle = isPattern ? '#282d38' : '#14161c';
        ctx.fillRect(x, y, step, step);

        // Micro fiber direction strokes
        ctx.strokeStyle = isPattern ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < step; i += 4) {
          ctx.beginPath();
          if (isPattern) {
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i, y + step);
          } else {
            ctx.moveTo(x, y + i);
            ctx.lineTo(x + step, y + i);
          }
          ctx.stroke();
        }
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * 6. Operator Side Control OLED Display & Buttons (512x256)
 * High-fidelity ARRI MVF/Mini UI with live status telemetry and tactile rubber buttons.
 */
function createSideControlDisplayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Matte dark body inset
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, 512, 256);

    // OLED Screen Area
    ctx.fillStyle = '#06080c';
    ctx.fillRect(20, 20, 310, 216);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 310, 216);

    // Top status line (FPS, Shutter, Sensor, ISO)
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('24.000 fps', 36, 58);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('180.0°', 210, 58);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('EI 800', 36, 96);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('5600 K +0.0', 160, 96);

    // Center Timecode
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('01:42:18:12', 36, 142);

    // Recording Codec & Clip Name
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('A001_C004  ProRes 4444 XQ', 36, 174);

    // Status Pill (STBY green or REC red)
    ctx.fillStyle = '#15803d';
    ctx.fillRect(36, 192, 72, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('STBY', 48, 212);

    // Battery & Media Status
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('BAT 25.4V', 128, 212);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('86%', 260, 212);

    // Operator Control Buttons on Right Side
    const buttons = [
      { y: 35, label: 'USER 1' },
      { y: 80, label: 'USER 2' },
      { y: 125, label: 'USER 3' },
      { y: 170, label: 'MENU' }
    ];

    buttons.forEach(b => {
      ctx.fillStyle = '#272d38';
      ctx.fillRect(350, b.y, 65, 34);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(350, b.y, 65, 34);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, 382, b.y + 22);
    });

    // Prominent Red REC Button
    ctx.beginPath();
    ctx.arc(460, 70, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('REC', 460, 75);

    // Jogwheel Rotary Dial Texture Representation
    ctx.beginPath();
    ctx.arc(460, 170, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2430';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.stroke();

    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const rx = 460 + Math.cos(a) * 26;
      const ry = 170 + Math.sin(a) * 26;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * 7. Right Side Codex Media Door & Ventilation Texture (512x256)
 */
function createRightSideMediaPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#15171d';
    ctx.fillRect(0, 0, 512, 256);

    // Codex Compact Drive Door Recess
    ctx.fillStyle = '#1d212a';
    ctx.fillRect(40, 30, 260, 196);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 30, 260, 196);

    // Media Slot & Eject Lever
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(60, 60, 180, 80);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(250, 70, 30, 60);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 18px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CODEX COMPACT DRIVE', 60, 180);

    // Cooling Exhaust / Intake Grill Slats on Right
    ctx.fillStyle = '#0f1117';
    for (let y = 40; y < 220; y += 18) {
      ctx.fillRect(340, y, 140, 10);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ============================================================================
// COMPONENT PROPS & MAIN CAMERA RIG
// ============================================================================

export interface ArriCinemaCameraProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  showCableLead?: boolean;
}

export function ArriCinemaCamera({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  showCableLead = true
}: ArriCinemaCameraProps) {
  // --------------------------------------------------------------------------
  // Textures
  // --------------------------------------------------------------------------
  const texArriRear = useMemo(() => createArriRearIoTexture(), []);
  const texArriBp8 = useMemo(() => createArriBp8Texture(), []);
  const texKnurledFocus = useMemo(() => createWhiteKnurledFocusTexture(), []);
  const texIrisScale = useMemo(() => createLensIrisScaleTexture(), []);
  const texCarbon = useMemo(() => createCarbonFiberTexture(), []);
  const texDisplay = useMemo(() => createSideControlDisplayTexture(), []);
  const texRightMedia = useMemo(() => createRightSideMediaPanelTexture(), []);

  // --------------------------------------------------------------------------
  // PBR Materials
  // --------------------------------------------------------------------------
  // ARRI Alexa Signature Slate Grey Finish
  const matCameraBodyGrey = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x323742,
    roughness: 0.38,
    metalness: 0.45
  }), []);

  // Dark graphite anodized front faceplate
  const matFrontFaceplate = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a1d24,
    roughness: 0.30,
    metalness: 0.70
  }), []);

  // Rugged dark structural composite / cage material
  const matDarkComposite = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x16191f,
    roughness: 0.45,
    metalness: 0.60
  }), []);

  // Jet black anodized precision aluminum
  const matBlackAnodized = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x121418,
    roughness: 0.32,
    metalness: 0.85
  }), []);

  // Stainless steel & chrome hardware
  const matChromeSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xedf2f7,
    roughness: 0.15,
    metalness: 0.95
  }), []);

  // Polished dovetail silver rail bevel
  const matDovetailSilver = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.18,
    metalness: 0.92
  }), []);

  // Gold LEMO contacts & tape measure pins
  const matGoldLemo = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.92
  }), []);

  // Safety red anodized release buttons
  const matSafetyRed = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35,
    metalness: 0.40
  }), []);

  // Flexible matte rubber cable
  const matCableRubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0a0c10,
    roughness: 0.85,
    metalness: 0.08
  }), []);

  // Optical Anti-Reflective Emerald/Sapphire Multi-Coating
  const matOpticalCoating = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x1d285c,
    roughness: 0.03,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transmission: 0.65,
    transparent: true,
    opacity: 0.78
  }), []);

  // Convex front glass element
  const matGlassLens = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.01,
    metalness: 0.05,
    transmission: 0.96,
    ior: 1.55,
    transparent: true,
    opacity: 0.88
  }), []);

  // Decal Materials
  const matDecalArriRear = useMemo(() => new THREE.MeshBasicMaterial({
    map: texArriRear,
    transparent: true
  }), [texArriRear]);

  const matDecalArriBp8 = useMemo(() => new THREE.MeshBasicMaterial({
    map: texArriBp8,
    transparent: true
  }), [texArriBp8]);

  const matKnurledFocus = useMemo(() => new THREE.MeshStandardMaterial({
    map: texKnurledFocus,
    roughness: 0.32,
    metalness: 0.40
  }), [texKnurledFocus]);

  const matIrisGear = useMemo(() => new THREE.MeshStandardMaterial({
    map: texIrisScale,
    roughness: 0.35,
    metalness: 0.75
  }), [texIrisScale]);

  const matCarbonFiber = useMemo(() => new THREE.MeshStandardMaterial({
    map: texCarbon,
    roughness: 0.40,
    metalness: 0.50
  }), [texCarbon]);

  const matDisplay = useMemo(() => new THREE.MeshBasicMaterial({
    map: texDisplay
  }), [texDisplay]);

  const matRightMedia = useMemo(() => new THREE.MeshBasicMaterial({
    map: texRightMedia
  }), [texRightMedia]);

  // --------------------------------------------------------------------------
  // Cable Curves
  // --------------------------------------------------------------------------
  // Main power/data jumper from baseplate junction box to ARRI rear BAT socket
  const plateToCameraCable = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.065, -0.098, -0.05),
      new THREE.Vector3(-0.058, -0.050, -0.08),
      new THREE.Vector3(-0.045, -0.015, -0.120),
      new THREE.Vector3(-0.035, 0.000, -0.116)
    ]);
  }, []);

  // Secondary 12G-SDI Coax jumper from rear SDI 1 to baseplate block
  const sdiCoaxCable = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.065, -0.098, -0.07),
      new THREE.Vector3(-0.068, -0.040, -0.09),
      new THREE.Vector3(-0.055, -0.010, -0.125),
      new THREE.Vector3(-0.035, 0.028, -0.116)
    ]);
  }, []);

  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* 
        ========================================================================
        1. DOVETAIL SLIDING BASE & ARRI BP-8 BRIDGEPLATE (6 o'clock)
        Real-world ARRI 300mm Dovetail & BP-8 19mm Studio Dimensions
        ========================================================================
      */}
      {/* ARRI Standard 300mm Dovetail Sliding Track (Width: 84mm, Thickness: 12mm, Length: 300mm) */}
      <group position={[0, -0.124, 0.02]}>
        {/* Central Track Body */}
        <mesh castShadow receiveShadow material={matBlackAnodized}>
          <boxGeometry args={[0.084, 0.012, 0.300]} />
        </mesh>

        {/* Polished Silver Dovetail Wedge Bevel Rails (Left & Right) */}
        <mesh castShadow receiveShadow material={matDovetailSilver} position={[-0.045, 0, 0]}>
          <boxGeometry args={[0.009, 0.010, 0.300]} />
        </mesh>
        <mesh castShadow receiveShadow material={matDovetailSilver} position={[0.045, 0, 0]}>
          <boxGeometry args={[0.009, 0.010, 0.300]} />
        </mesh>

        {/* Front Dovetail End-Stop Bracket with Safety Release Pin */}
        <mesh castShadow material={matDarkComposite} position={[0, 0.005, 0.152]}>
          <boxGeometry args={[0.076, 0.020, 0.012]} />
        </mesh>
        {/* Safety Red Spring Release Push-Button */}
        <mesh castShadow material={matSafetyRed} position={[-0.028, 0.006, 0.155]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0045, 0.0045, 0.010, 16]} />
        </mesh>
        {/* Polished Chrome Stop Pin */}
        <mesh castShadow material={matChromeSteel} position={[0.028, 0.006, 0.155]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.012, 12]} />
        </mesh>

        {/* Dovetail Side Clamping Cam Lever */}
        <mesh castShadow material={matChromeSteel} position={[-0.050, 0, -0.06]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.0025, 0.0025, 0.020, 12]} />
        </mesh>
      </group>

      {/* 
        ========================================================================
        ARRI BP-8 BRIDGEPLATE ASSEMBLY (Mounted Flush under Camera Base)
        Real-world ARRI BP-8: Width: 112mm, Height: 30mm, Length: 140mm
        ========================================================================
      */}
      <group position={[0, -0.098, 0.01]}>
        {/* Main CNC Machined Aluminum Bridgeplate Block */}
        <mesh castShadow receiveShadow material={matDarkComposite}>
          <boxGeometry args={[0.112, 0.030, 0.150]} />
        </mesh>

        {/* Front ARRI BP-8 Green Brand Badge */}
        <mesh position={[0, 0, 0.076]}>
          <planeGeometry args={[0.084, 0.022]} />
          <primitive object={matDecalArriBp8} attach="material" />
        </mesh>

        {/* 19mm Studio Rod Clamping Bushings (Open/Empty Bores - 104mm center-to-center standard) */}
        {[-0.052, 0.052].map((rx, rIdx) => (
          <group key={`bp8-rod-channel-${rIdx}`}>
            {/* Front Clamp Collar Bezel */}
            <mesh castShadow material={matBlackAnodized} position={[rx, 0, 0.076]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0115, 0.0115, 0.005, 24]} />
            </mesh>
            {/* Hollow Dark Inner Bore (Empty Rod Port matching Set Reference Photo) */}
            <mesh material={matDarkComposite} position={[rx, 0, 0.074]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0095, 0.0095, 0.012, 24]} />
            </mesh>

            {/* ARRI Locking Wing Levers (Knebelschrauben) on Side */}
            <group position={[rx < 0 ? rx - 0.016 : rx + 0.016, 0, 0.045]} rotation={[0, 0, rx < 0 ? -0.4 : 0.4]}>
              {/* Threaded Pin Shaft */}
              <mesh castShadow material={matChromeSteel} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0025, 0.0025, 0.014, 12]} />
              </mesh>
              {/* Ergonomic T-Wing Thumb Knob */}
              <mesh castShadow material={matDarkComposite} position={[rx < 0 ? -0.006 : 0.006, 0, 0]}>
                <boxGeometry args={[0.005, 0.018, 0.008]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* Rear Electrical / Data Junction Terminal Block */}
        <group position={[-0.056, 0, -0.06]}>
          <mesh castShadow receiveShadow material={matDarkComposite}>
            <boxGeometry args={[0.024, 0.026, 0.044]} />
          </mesh>
          {/* Gold LEMO Ports */}
          {[-0.012, 0.012].map((pz, pIdx) => (
            <mesh key={`bp8-lemo-${pIdx}`} castShadow material={matGoldLemo} position={[-0.013, 0, pz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.0045, 0.0045, 0.003, 16]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* 
        ========================================================================
        TOP ARTICULATED CLAMP & LINKAGE AUSLEGER
        Connects camera top cheeseplate directly to S-Head "TOP-FRONT" Ring Segment
        ========================================================================
      */}
      <group position={[0, 0.080, -0.02]}>
        {/* Top Base Clamping Block on Camera NATO Rail */}
        <mesh castShadow material={matDarkComposite} position={[0, 0, 0]}>
          <boxGeometry args={[0.028, 0.012, 0.036]} />
        </mesh>
        {/* Clamping Thumb Screw */}
        <mesh castShadow material={matChromeSteel} position={[0.016, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.010, 12]} />
        </mesh>

        {/* Dual Strut Articulated Arm reaching upward & forward toward TOP-FRONT ring */}
        {[-0.009, 0.009].map((ax, aIdx) => (
          <mesh key={`top-strut-${aIdx}`} castShadow material={matBlackAnodized} position={[ax, 0.065, 0.018]} rotation={[-0.22, 0, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.135, 16]} />
          </mesh>
        ))}

        {/* Upper Ring Segment Interface Clamp Knuckle (at y ≈ 0.215, z ≈ 0.010) */}
        <group position={[0, 0.132, 0.034]}>
          <mesh castShadow material={matDarkComposite}>
            <boxGeometry args={[0.032, 0.016, 0.020]} />
          </mesh>
          {/* Stainless Pivot Cross-Pin */}
          <mesh castShadow material={matChromeSteel} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.038, 16]} />
          </mesh>
        </group>
      </group>

      {/* 
        ========================================================================
        2. ARRI ALEXA MINI LF CAMERA BODY (Exact Real Dimensions: 140 x 143 x 188 mm)
        Optical axis is centered at y = 0
        ========================================================================
      */}
      <group position={[0, 0.00, 0.01]}>
        {/* Main Camera Chassis (ARRI Slate Grey Finish: 140mm W, 142mm H, 188mm L) */}
        <mesh castShadow receiveShadow material={matCameraBodyGrey} position={[0, 0.00, -0.02]}>
          <boxGeometry args={[0.140, 0.142, 0.188]} />
        </mesh>

        {/* Chamfered Top Shoulder Plates */}
        <mesh castShadow material={matDarkComposite} position={[-0.065, 0.071, -0.02]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.015, 0.015, 0.186]} />
        </mesh>
        <mesh castShadow material={matDarkComposite} position={[0.065, 0.071, -0.02]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.015, 0.015, 0.186]} />
        </mesh>

        {/* Bottom BPA-4 / MAP-2 Baseplate Adapter (Direct contact with BP-8 top) */}
        <mesh castShadow material={matDarkComposite} position={[0, -0.073, -0.02]}>
          <boxGeometry args={[0.115, 0.005, 0.180]} />
        </mesh>

        {/* Top NATO Cheeseplate with Threaded 3/8" & 1/4" Holes */}
        <mesh castShadow material={matDarkComposite} position={[0, 0.074, -0.02]}>
          <boxGeometry args={[0.098, 0.010, 0.160]} />
        </mesh>

        {/* 
          ----------------------------------------------------------------------
          FRONT FACEPLATE & PL-MOUNT SUB-ASSEMBLY
          ----------------------------------------------------------------------
        */}
        {/* Recessed Dark Graphite Front Faceplate */}
        <mesh castShadow material={matFrontFaceplate} position={[0, 0.00, 0.075]}>
          <boxGeometry args={[0.130, 0.130, 0.005]} />
        </mesh>

        {/* 4x 3D Corner Allen Inbus Screws around PL Mount (Exact Match to ARRI) */}
        {[
          [-0.044, 0.046],
          [0.044, 0.046],
          [-0.044, -0.046],
          [0.044, -0.046]
        ].map(([sx, sy], sIdx) => (
          <group key={`front-screw-${sIdx}`} position={[sx, sy, 0.078]}>
            {/* Screw Head */}
            <mesh castShadow material={matChromeSteel} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0032, 0.0032, 0.0025, 16]} />
            </mesh>
            {/* Recessed Hex Socket */}
            <mesh material={matBlackAnodized} position={[0, 0, 0.0014]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0018, 0.0018, 0.001, 6]} />
            </mesh>
          </group>
        ))}

        {/* 2x Lower Front Rod Mount Lugs / Housing Studs below PL Mount */}
        {[-0.035, 0.035].map((lx, lIdx) => (
          <group key={`rod-lug-${lIdx}`} position={[lx, -0.054, 0.079]}>
            {/* Outer Cylindrical Boss */}
            <mesh castShadow material={matFrontFaceplate} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0075, 0.0075, 0.010, 20]} />
            </mesh>
            {/* Inner Rod Locating Recess */}
            <mesh material={matBlackAnodized} position={[0, 0, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0048, 0.0048, 0.003, 16]} />
            </mesh>
          </group>
        ))}

        {/* Titanium PL Lens Mount on Front Face */}
        <group position={[0, 0.00, 0.076]}>
          {/* Main PL Mount Flange Ring */}
          <mesh castShadow material={matChromeSteel} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.034, 0.034, 0.014, 36]} />
          </mesh>
          {/* 4-Lug PL Locking Flange Ring */}
          <mesh castShadow material={matDarkComposite} position={[0, 0, 0.007]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.007, 36]} />
          </mesh>
          {/* PL Gold Locking Pin / Index Lever */}
          <mesh castShadow material={matGoldLemo} position={[0.032, 0.022, 0.008]} rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.012, 0.006, 0.009]} />
          </mesh>
        </group>

        {/* 
          ----------------------------------------------------------------------
          SIDE PANELS, CONTROLS & FOCAL PLANE TAPE PINS
          ----------------------------------------------------------------------
        */}
        {/* Left Side: Carbon Fiber Plate + Operator OLED Screen */}
        <mesh castShadow material={matCarbonFiber} position={[-0.071, 0.00, -0.02]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.160, 0.130]} />
        </mesh>
        <mesh position={[-0.072, -0.006, -0.01]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.105, 0.062]} />
          <primitive object={matDisplay} attach="material" />
        </mesh>

        {/* Right Side: Carbon Fiber Plate + Codex Media Bay Door */}
        <mesh castShadow material={matCarbonFiber} position={[0.071, 0.00, -0.02]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.160, 0.130]} />
        </mesh>
        <mesh position={[0.072, -0.006, -0.01]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.105, 0.062]} />
          <primitive object={matRightMedia} attach="material" />
        </mesh>

        {/* Left & Right Side Tape Hook Pins */}
        {[-0.073, 0.073].map((px, pIdx) => (
          <group key={`tape-pin-${pIdx}`} position={[px, 0.00, -0.01]}>
            <mesh castShadow material={matGoldLemo} rotation={[0, 0, px < 0 ? -Math.PI / 2 : Math.PI / 2]}>
              <cylinderGeometry args={[0.0018, 0.0018, 0.007, 12]} />
            </mesh>
            <mesh castShadow material={matGoldLemo} position={[px < 0 ? -0.0035 : 0.0035, 0, 0]} rotation={[0, 0, px < 0 ? -Math.PI / 2 : Math.PI / 2]}>
              <cylinderGeometry args={[0.003, 0.003, 0.002, 12]} />
            </mesh>
          </group>
        ))}

        {/* 
          ----------------------------------------------------------------------
          REAR I/O CONNECTOR PANEL & 3D PORTS
          ----------------------------------------------------------------------
        */}
        <mesh position={[0, 0.00, -0.115]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.135, 0.135]} />
          <primitive object={matDecalArriRear} attach="material" />
        </mesh>

        {/* 3D Physical BNC Ports (SDI 1/2, SYNC) on Rear Face */}
        {[
          [-0.032, 0.026, -0.116],
          [0.0, 0.026, -0.116],
          [0.032, 0.026, -0.116]
        ].map(([bx, by, bz], bIdx) => (
          <mesh key={`bnc-port-${bIdx}`} castShadow material={matChromeSteel} position={[bx, by, bz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.005, 16]} />
          </mesh>
        ))}

        {/* 3D Physical LEMO Sockets on Rear Face */}
        {[
          [-0.032, 0.000, -0.116],
          [0.0, 0.000, -0.116],
          [0.032, 0.000, -0.116],
          [-0.032, -0.026, -0.116],
          [0.0, -0.026, -0.116],
          [0.032, -0.026, -0.116]
        ].map(([lx, ly, lz], lIdx) => (
          <mesh key={`lemo-socket-${lIdx}`} castShadow material={matGoldLemo} position={[lx, ly, lz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0045, 0.0045, 0.0035, 16]} />
          </mesh>
        ))}

        {/* Camera Jumper Cables */}
        {showCableLead && (
          <group>
            {/* Primary Power/Data Cable */}
            <mesh castShadow receiveShadow material={matCableRubber}>
              <tubeGeometry args={[plateToCameraCable, 24, 0.006, 8, false]} />
            </mesh>
            {/* Gold LEMO Right-Angle Plug on BAT Socket */}
            <mesh castShadow material={matGoldLemo} position={[-0.032, 0.000, -0.118]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.010, 16]} />
            </mesh>
            {/* Rubber Spiral Strain Relief Boot */}
            <mesh castShadow material={matBlackAnodized} position={[-0.032, 0.000, -0.124]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.008, 0.006, 0.014, 16]} />
            </mesh>

            {/* Secondary SDI 12G Coax Cable */}
            <mesh castShadow receiveShadow material={matCableRubber}>
              <tubeGeometry args={[sdiCoaxCable, 24, 0.004, 8, false]} />
            </mesh>
            {/* Silver BNC Locking Bayonet Connector */}
            <mesh castShadow material={matChromeSteel} position={[-0.032, 0.026, -0.120]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0055, 0.0055, 0.012, 16]} />
            </mesh>
          </group>
        )}

        {/* 
          ======================================================================
          3. ARRI PRIME DNA CINEMA LENS (Real 114mm Front Standard Dimensions)
          Optical axis centered exactly at y = 0.00
          ======================================================================
        */}
        <group position={[0, 0.00, 0.084]}>
          {/* Lens Mount Rear Collar */}
          <mesh castShadow material={matBlackAnodized} position={[0, 0, 0.010]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.036, 0.036, 0.020, 36]} />
          </mesh>

          {/* Aperture / Iris Gear Ring (0.8 Mod Zahnung with T-Stops) */}
          <mesh castShadow material={matIrisGear} position={[0, 0, 0.028]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.044, 0.044, 0.016, 36]} />
          </mesh>

          {/* Fixed Index Ring with Red Witness Bracket */}
          <mesh castShadow material={matBlackAnodized} position={[0, 0, 0.040]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.008, 36]} />
          </mesh>
          {/* Red Focus Index Line */}
          <mesh castShadow material={matSafetyRed} position={[0, 0.0451, 0.040]}>
            <boxGeometry args={[0.0025, 0.001, 0.006]} />
          </mesh>

          {/* PROMINENT WHITE KNURLED FOCUS RING (From Reference Photo) */}
          <group position={[0, 0, 0.065]}>
            {/* White Knurled Barrel */}
            <mesh castShadow receiveShadow material={matKnurledFocus} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.049, 0.049, 0.040, 48]} />
            </mesh>
            {/* Front & Rear Anodized Flange Rims */}
            <mesh castShadow material={matBlackAnodized} position={[0, 0, -0.021]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.050, 0.050, 0.0025, 36]} />
            </mesh>
            <mesh castShadow material={matBlackAnodized} position={[0, 0, 0.021]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.050, 0.050, 0.0025, 36]} />
            </mesh>
          </group>

          {/* Stepped Expanding Front Lens Barrel with Chamfer */}
          <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0, 0.100]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.054, 0.048, 0.030, 36]} />
          </mesh>

          {/* Standard 114mm Cinema Front Clamp Ring (Radius = 0.057m / Diameter = 114mm) */}
          <mesh castShadow material={matDarkComposite} position={[0, 0, 0.118]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.057, 0.057, 0.008, 36]} />
          </mesh>
          {/* Inner Filter Thread Lip */}
          <mesh castShadow material={matBlackAnodized} position={[0, 0, 0.121]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.052, 0.054, 0.003, 36]} />
          </mesh>

          {/* Convex Curved Optical Front Glass Element */}
          <mesh position={[0, 0, 0.115]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.048, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3]} />
            <primitive object={matGlassLens} attach="material" />
          </mesh>

          {/* Antireflective Multi-Coating Emerald/Sapphire/Violet Sheen */}
          <mesh position={[0, 0, 0.117]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.047, 32]} />
            <primitive object={matOpticalCoating} attach="material" />
          </mesh>

          {/* Internal Iris Blades Diaphragm */}
          <mesh position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.012, 0.042, 18]} />
            <meshStandardMaterial color={0x0b0d10} roughness={0.6} metalness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default ArriCinemaCamera;
