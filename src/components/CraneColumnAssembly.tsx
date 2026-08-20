import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ============================================================================
 * PROCEDURAL HIGH-FIDELITY PBR TEXTURE GENERATORS FOR SUPERTECHNO DOLLY
 * Matching 100% the reference photo (media_1787133234891.png):
 * 1. Deep-treaded pneumatic rubber tires with 4 channels & lateral sipes
 * 2. Machined silver deep-dish alloy rims with 6 chrome lug nuts & hub emblem
 * 3. Golden Brass Knurled Leveling Jack Locking Knobs with 3D diamond knurling
 * 4. Chrome Spindle Screw Rods with Acme thread normal grooves
 * 5. Sculpted Dark Anthracite Chassis Skirts with technical rating decals
 * 6. Top Deck Diamond Plate / Checkerplate Steel Texture
 * ============================================================================
 */

// 1. Tire Tread Texture (Color Map)
function createTireTreadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark vulcanized rubber base
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle micro noise
    for (let i = 0; i < 4000; i++) {
      const g = Math.floor(Math.random() * 20 + 15);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 512, Math.random() * 2 + 1, Math.random() * 2 + 1);
    }

    // 4 Longitudinal Circumferential Channels
    const channels = [96, 208, 304, 416];
    channels.forEach(y => {
      ctx.fillStyle = '#07080a';
      ctx.fillRect(0, y - 12, 1024, 24);
      ctx.fillStyle = '#030405';
      ctx.fillRect(0, y - 6, 1024, 12);
      ctx.fillStyle = '#242a34';
      ctx.fillRect(0, y - 14, 1024, 2);
      ctx.fillRect(0, y + 12, 1024, 2);
    });

    // 32 Angled Lateral Sipes / Tread Blocks across the tire
    const numBlocks = 32;
    const blockWidth = 1024 / numBlocks;
    for (let i = 0; i < numBlocks; i++) {
      const x = i * blockWidth;

      // Outer Left Shoulder Sipes
      ctx.fillStyle = '#060709';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 14, 96);
      ctx.lineTo(x + 8, 96);
      ctx.lineTo(x - 6, 0);
      ctx.closePath();
      ctx.fill();

      // Outer Right Shoulder Sipes
      ctx.beginPath();
      ctx.moveTo(x + 14, 512);
      ctx.lineTo(x, 416);
      ctx.lineTo(x - 6, 416);
      ctx.lineTo(x + 8, 512);
      ctx.closePath();
      ctx.fill();

      // Center Chevron Sipes
      ctx.beginPath();
      ctx.moveTo(x + 6, 208);
      ctx.lineTo(x + 18, 256);
      ctx.lineTo(x + 6, 304);
      ctx.lineTo(x, 304);
      ctx.lineTo(x + 12, 256);
      ctx.lineTo(x, 208);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 2. Tire Tread Normal Map
function createTireNormalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 1024, 512);

    const channels = [96, 208, 304, 416];
    channels.forEach(y => {
      ctx.fillStyle = 'rgb(128, 60, 240)';
      ctx.fillRect(0, y - 12, 1024, 12);
      ctx.fillStyle = 'rgb(128, 196, 240)';
      ctx.fillRect(0, y, 1024, 12);
    });

    const numBlocks = 32;
    const blockWidth = 1024 / numBlocks;
    for (let i = 0; i < numBlocks; i++) {
      const x = i * blockWidth;
      ctx.fillStyle = 'rgb(60, 128, 240)';
      ctx.fillRect(x - 2, 0, 4, 96);
      ctx.fillStyle = 'rgb(196, 128, 240)';
      ctx.fillRect(x + 2, 0, 4, 96);

      ctx.fillStyle = 'rgb(60, 128, 240)';
      ctx.fillRect(x - 2, 416, 4, 96);
      ctx.fillStyle = 'rgb(196, 128, 240)';
      ctx.fillRect(x + 2, 416, 4, 96);

      ctx.fillStyle = 'rgb(60, 128, 240)';
      ctx.fillRect(x - 2, 208, 4, 96);
      ctx.fillStyle = 'rgb(196, 128, 240)';
      ctx.fillRect(x + 2, 208, 4, 96);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

// 3. Machined Deep-Dish Alloy Wheel Rim Texture
function createAlloyRimTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#b8c2cc';
    ctx.fillRect(0, 0, 512, 512);

    const cx = 256, cy = 256;

    // Lathe-turned concentric rings
    for (let r = 20; r < 250; r += 4) {
      ctx.strokeStyle = (r % 8 === 0) ? 'rgba(255, 255, 255, 0.4)' : 'rgba(50, 60, 75, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer Rim Chamfer
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 246, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 238, 0, Math.PI * 2);
    ctx.stroke();

    // 6 Chrome Lug Nuts with dark recessed wells
    ctx.fillStyle = '#1a202c';
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const lx = cx + Math.cos(angle) * 110;
      const ly = cy + Math.sin(angle) * 110;
      ctx.beginPath();
      ctx.arc(lx, ly, 18, 0, Math.PI * 2);
      ctx.fill();

      // Chrome Hexagon Nut
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(lx, ly, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center Axle Hub Cap
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.fill();

    // Chrome Emblem Ring
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ST', cx, cy);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 4. Golden Brass Knurled Leveling Knob Texture (Color Map)
function createBrassKnurledTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, 0, 512, 256);

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255, 240, 160, 0.45)');
    grad.addColorStop(0.5, 'rgba(160, 115, 20, 0.35)');
    grad.addColorStop(1, 'rgba(255, 240, 160, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Diamond Knurling Pattern (+45° and -45° intersecting grooves)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(70, 45, 5, 0.65)';
    const spacing = 12;
    for (let x = -256; x <= 512 + 256; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 256, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 256);
      ctx.lineTo(x + 256, 0);
      ctx.stroke();
    }

    // Pyramid Highlight Dots
    ctx.fillStyle = 'rgba(255, 245, 180, 0.7)';
    for (let x = -256; x <= 512 + 256; x += spacing) {
      for (let y = 0; y <= 256; y += spacing) {
        ctx.fillRect(x + (y % (spacing * 2) === 0 ? 0 : spacing / 2), y, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 5. Brass Knurled Normal Map
function createBrassKnurledNormalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 512, 256);

    ctx.lineWidth = 2;
    const spacing = 12;
    for (let x = -256; x <= 512 + 256; x += spacing) {
      ctx.strokeStyle = 'rgb(80, 80, 240)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 256, 256);
      ctx.stroke();

      ctx.strokeStyle = 'rgb(175, 175, 240)';
      ctx.beginPath();
      ctx.moveTo(x, 256);
      ctx.lineTo(x + 256, 0);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

// 6. Sculpted Dark Anthracite Chassis Side Skirt Texture
function createChassisSideSkirtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1a1d24';
    ctx.fillRect(0, 0, 1024, 256);

    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(Math.random() * 1024, Math.random() * 256, Math.random() * 80 + 20, 1.5);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, 1024, 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 252, 1024, 4);

    // Technical Decal Badge
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 280, 80);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('SUPERTECHNO DOLLY', 55, 70);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px monospace';
    ctx.fillText('MAX PAYLOAD: 2500 KG', 55, 92);
    ctx.fillText('PRESSURE: 8.5 BAR', 55, 108);

    // Warning Badge
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(720, 40, 260, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('⚠️ OUTRIGGER LOCK', 735, 62);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 7. Spindle Acme Thread Normal Map
function createSpindleThreadNormalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 256, 512);

    const threadPitch = 8;
    for (let y = 0; y < 512; y += threadPitch) {
      ctx.fillStyle = 'rgb(128, 60, 240)';
      ctx.fillRect(0, y, 256, threadPitch / 2);
      ctx.fillStyle = 'rgb(128, 196, 240)';
      ctx.fillRect(0, y + threadPitch / 2, 256, threadPitch / 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 16);
  return tex;
}

// 8. Top Deck Diamond Plate / Checkerplate Texture
function createCheckerplateDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e222a';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#384252';
    for (let x = 0; x < 512; x += 32) {
      for (let y = 0; y < 512; y += 32) {
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 16, 10, 3, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(x + 32, y + 32, 10, 3, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * ============================================================================
 * CRANE COLUMN & DOLLY BASE ASSEMBLY (SUPERTECHNO 50+ PEDESTAL BASE & DOLLY)
 * Complete 1:1 photorealistic reconstruction matching media_1787133234891.png
 * ============================================================================
 */
export default function CraneColumnAssembly({
  kinematics,
  visible = true
}: {
  kinematics: {
    columnElevation?: number;
    basePan?: number;
    dollyTrack?: number;
    [key: string]: any;
  };
  visible?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Procedural PBR Textures
  const tireTreadTex = useMemo(() => createTireTreadTexture(), []);
  const tireNormalTex = useMemo(() => createTireNormalTexture(), []);
  const alloyRimTex = useMemo(() => createAlloyRimTexture(), []);
  const brassKnurledTex = useMemo(() => createBrassKnurledTexture(), []);
  const brassKnurledNormalTex = useMemo(() => createBrassKnurledNormalTexture(), []);
  const chassisSideTex = useMemo(() => createChassisSideSkirtTexture(), []);
  const spindleThreadTex = useMemo(() => createSpindleThreadNormalTexture(), []);
  const deckPlateTex = useMemo(() => createCheckerplateDeckTexture(), []);

  // PBR Materials (Exact match to reference photo)
  const matChassisDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e222a,
    roughness: 0.48,
    metalness: 0.82
  }), []);

  const matChassisSideSkirt = useMemo(() => new THREE.MeshStandardMaterial({
    map: chassisSideTex,
    roughness: 0.48,
    metalness: 0.82
  }), [chassisSideTex]);

  const matDeckCheckerplate = useMemo(() => new THREE.MeshStandardMaterial({
    map: deckPlateTex,
    roughness: 0.42,
    metalness: 0.85
  }), [deckPlateTex]);

  const matPedestalBlack = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a1d24,
    roughness: 0.52,
    metalness: 0.78
  }), []);

  const matChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.12,
    metalness: 0.98
  }), []);

  const matSpindleChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    normalMap: spindleThreadTex,
    roughness: 0.15,
    metalness: 0.96
  }), [spindleThreadTex]);

  // Golden Brass Knurled Material (The prominent locking wheels from photo)
  const matBrassKnurled = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    map: brassKnurledTex,
    normalMap: brassKnurledNormalTex,
    roughness: 0.28,
    metalness: 0.88
  }), [brassKnurledTex, brassKnurledNormalTex]);

  const matTireRubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x14161a,
    map: tireTreadTex,
    normalMap: tireNormalTex,
    roughness: 0.85,
    metalness: 0.08
  }), [tireTreadTex, tireNormalTex]);

  const matAlloyRim = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xc4ccd8,
    map: alloyRimTex,
    roughness: 0.24,
    metalness: 0.94
  }), [alloyRimTex]);

  const matBrakeRotor = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x3e444c,
    roughness: 0.4,
    metalness: 0.88
  }), []);

  const matRubberFootPad = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f1115,
    roughness: 0.92,
    metalness: 0.1
  }), []);

  const matYellowAccent = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.35,
    metalness: 0.45
  }), []);

  // Update position with kinematics.dollyTrack along Z track (Vorwärts = -Z, Rückwärts = +Z)
  useFrame(() => {
    if (!groupRef.current) return;
    const dollyZ = -(kinematics.dollyTrack || 0);
    groupRef.current.position.set(0, 0, dollyZ);
  });

  if (!visible) return null;

  // Track position and wheel rolling rotation
  // Wheel radius: 0.26m -> Circumference: 1.6336m
  // When moving forward (dollyTrack > 0, delta Z < 0), wheel rolls forward (wheelRotX < 0)
  const trackDist = kinematics.dollyTrack || 0;
  const wheelRadius = 0.26;
  const wheelRotX = -trackDist / wheelRadius;
  const steerAngle = THREE.MathUtils.degToRad(kinematics.dollySteer || 0);

  // 4 Corner Wheel Positions (Track Width: 1.88m, Wheelbase: 2.18m)
  // [X, Y, Z, isLeft, isFront]
  // Wheel center Y = 0.26m -> Tires rest flat on ground at Y = 0.00m
  const wheelPositions: [number, number, number, boolean, boolean][] = [
    [-0.84, 0.26, -1.09, true, true],   // Front-Left
    [0.84, 0.26, -1.09, false, true],   // Front-Right
    [-0.84, 0.26, 1.09, true, false],   // Rear-Left
    [0.84, 0.26, 1.09, false, false]    // Rear-Right
  ];

  // 4 Corner Outrigger Leveling Jacks (Matching photo media_1787133234891.png)
  const outriggerPositions: [number, number][] = [
    [-1.14, -1.18],  // Front-Left
    [1.14, -1.18],   // Front-Right
    [-1.14, 1.18],   // Rear-Left
    [1.14, 1.18]     // Rear-Right
  ];

  return (
    <group ref={groupRef}>
      {/* 
        ========================================================================
        1. SCULPTED DOLLY CHASSIS FRAME & SIDE SKIRTS (MATCHING PHOTO)
        Dark graphite metallic body with angular facets, beveled lower edges
        ========================================================================
      */}
      <group position={[0, 0, 0]}>
        {/* Main Central Heavy Steel Chassis Body */}
        <mesh castShadow receiveShadow material={matChassisDark} position={[0, 0.24, 0]}>
          <boxGeometry args={[1.56, 0.24, 2.42]} />
        </mesh>

        {/* Top Deck Diamond Plate / Non-Slip Checkerplate Floor */}
        <mesh castShadow receiveShadow material={matDeckCheckerplate} position={[0, 0.365, 0]}>
          <boxGeometry args={[1.54, 0.015, 2.40]} />
        </mesh>

        {/* Left Sculpted Side Skirt / Fairing Profile (Matching Photo) */}
        <group position={[-0.82, 0.22, 0]}>
          {/* Main Side Plate */}
          <mesh castShadow receiveShadow material={matChassisSideSkirt}>
            <boxGeometry args={[0.08, 0.20, 1.84]} />
          </mesh>
          {/* Lower Chamfered Bevel Lip */}
          <mesh castShadow receiveShadow material={matChassisDark} position={[0.02, -0.09, 0]} rotation={[0, 0, Math.PI / 6]}>
            <boxGeometry args={[0.06, 0.05, 1.84]} />
          </mesh>
        </group>

        {/* Right Sculpted Side Skirt / Fairing Profile (Matching Photo) */}
        <group position={[0.82, 0.22, 0]}>
          <mesh castShadow receiveShadow material={matChassisSideSkirt}>
            <boxGeometry args={[0.08, 0.20, 1.84]} />
          </mesh>
          <mesh castShadow receiveShadow material={matChassisDark} position={[-0.02, -0.09, 0]} rotation={[0, 0, -Math.PI / 6]}>
            <boxGeometry args={[0.06, 0.05, 1.84]} />
          </mesh>
        </group>

        {/* Front Sculpted Nose Cone / Bumper with Chamfers */}
        <group position={[0, 0.23, -1.22]}>
          <mesh castShadow receiveShadow material={matChassisDark}>
            <boxGeometry args={[1.48, 0.20, 0.08]} />
          </mesh>
          {/* Front Bevel */}
          <mesh castShadow receiveShadow material={matChassisDark} position={[0, -0.06, -0.03]} rotation={[Math.PI / 6, 0, 0]}>
            <boxGeometry args={[1.44, 0.08, 0.04]} />
          </mesh>
        </group>

        {/* Rear Sculpted Tail Cone / Bumper with Chamfers */}
        <group position={[0, 0.23, 1.22]}>
          <mesh castShadow receiveShadow material={matChassisDark}>
            <boxGeometry args={[1.48, 0.20, 0.08]} />
          </mesh>
          {/* Rear Bevel */}
          <mesh castShadow receiveShadow material={matChassisDark} position={[0, -0.06, 0.03]} rotation={[-Math.PI / 6, 0, 0]}>
            <boxGeometry args={[1.44, 0.08, 0.04]} />
          </mesh>
        </group>

        {/* Front & Rear Transverse Heavy Axle Tubes */}
        <mesh castShadow material={matChassisDark} position={[0, 0.26, -1.09]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 1.76, 20]} />
        </mesh>
        <mesh castShadow material={matChassisDark} position={[0, 0.26, 1.09]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 1.76, 20]} />
        </mesh>
      </group>

      {/* 
        ========================================================================
        2. FOUR HEAVY-DUTY WHEEL ASSEMBLIES (ALL 4 CORNERS)
        Features:
        - Steerable Kingpin Knuckle (aligned in driving direction along Z)
        - Dynamic Rolling Rotation around horizontal wheel axle matching forward/reverse movement
        - Pneumatic rubber tires with tread pattern + deep dish alloy rims + lug nuts + brake calipers
        ========================================================================
      */}
      {wheelPositions.map(([wx, wy, wz, isLeft, isFront], wIdx) => {
        const currentSteer = isFront ? steerAngle : 0;
        return (
          <group key={`dolly-wheel-${wIdx}`} position={[wx, wy, wz]} rotation={[0, currentSteer, 0]}>
            {/* Non-Rotating: Kingpin Wheel Steering Knuckle & Spindle Mount */}
            <mesh castShadow material={matChassisDark} position={[isLeft ? 0.06 : -0.06, 0, 0]}>
              <boxGeometry args={[0.07, 0.14, 0.12]} />
            </mesh>

            {/* Non-Rotating: Cast Iron Heavy Brake Caliper gripping the disc */}
            <mesh castShadow material={matPedestalBlack} position={[isLeft ? 0.02 : -0.02, 0.08, 0.05]}>
              <boxGeometry args={[0.05, 0.09, 0.09]} />
            </mesh>
            <mesh castShadow material={matYellowAccent} position={[isLeft ? 0.022 : -0.022, 0.08, 0.05]}>
              <boxGeometry args={[0.052, 0.025, 0.08]} />
            </mesh>

            {/* ROTATING WHEEL ASSEMBLY (Rolls in real-time forward/backward with dolly movement) */}
            <group rotation={[wheelRotX, 0, 0]}>
              {/* Outer Treaded Rubber Tire */}
              <mesh castShadow receiveShadow material={matTireRubber} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.26, 0.26, 0.18, 36]} />
              </mesh>

              {/* Rounded Sidewall Torus Rings (Outer & Inner Bead) */}
              <mesh castShadow receiveShadow material={matTireRubber} position={[isLeft ? -0.09 : 0.09, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.21, 0.05, 16, 36]} />
              </mesh>
              <mesh castShadow receiveShadow material={matTireRubber} position={[isLeft ? 0.09 : -0.09, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.21, 0.05, 16, 36]} />
              </mesh>

              {/* Deep-Dish Machined Silver Alloy Wheel Rim */}
              <mesh castShadow receiveShadow material={matAlloyRim} position={[isLeft ? -0.082 : 0.082, 0, 0]} rotation={[0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0]}>
                <cylinderGeometry args={[0.175, 0.175, 0.025, 32]} />
              </mesh>

              {/* 6 Machined 3D Alloy Spokes for crisp, clear visual rotation */}
              {[0, 60, 120, 180, 240, 300].map((deg, sIdx) => {
                const rad = THREE.MathUtils.degToRad(deg);
                const sy = Math.sin(rad) * 0.095;
                const sz = Math.cos(rad) * 0.095;
                return (
                  <mesh
                    key={`spoke-${wIdx}-${sIdx}`}
                    castShadow
                    material={matChrome}
                    position={[isLeft ? -0.084 : 0.084, sy, sz]}
                    rotation={[rad, 0, 0]}
                  >
                    <boxGeometry args={[0.012, 0.026, 0.09]} />
                  </mesh>
                );
              })}

              {/* Outer Polished Rim Lip Ring */}
              <mesh castShadow material={matChrome} position={[isLeft ? -0.092 : 0.092, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.172, 0.008, 12, 32]} />
              </mesh>

              {/* Central Black Axle Dust Cap with Chrome Ring */}
              <mesh castShadow material={matPedestalBlack} position={[isLeft ? -0.098 : 0.098, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.045, 0.045, 0.016, 20]} />
              </mesh>
              <mesh castShadow material={matChrome} position={[isLeft ? -0.106 : 0.106, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.038, 0.004, 8, 20]} />
              </mesh>
              <mesh castShadow material={matYellowAccent} position={[isLeft ? -0.107 : 0.107, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.018, 0.018, 0.004, 16]} />
              </mesh>

              {/* 6 Chrome Hex Lug Nuts (Spinning dynamically with the wheel) */}
              {[0, 60, 120, 180, 240, 300].map((deg, nIdx) => {
                const rad = THREE.MathUtils.degToRad(deg);
                const ny = Math.sin(rad) * 0.075;
                const nz = Math.cos(rad) * 0.075;
                return (
                  <mesh
                    key={`lug-${wIdx}-${nIdx}`}
                    castShadow
                    material={matChrome}
                    position={[isLeft ? -0.095 : 0.095, ny, nz]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[0.009, 0.009, 0.012, 6]} />
                  </mesh>
                );
              })}

              {/* Chrome Valve Stem (Ventil) on rim edge */}
              <mesh
                castShadow
                material={matChrome}
                position={[isLeft ? -0.092 : 0.092, 0.135, 0.03]}
                rotation={[0, 0, isLeft ? -Math.PI / 4 : Math.PI / 4]}
              >
                <cylinderGeometry args={[0.003, 0.003, 0.018, 8]} />
              </mesh>

              {/* Ventilated Brake Disc Rotor (Spins with the wheel) */}
              <mesh castShadow material={matBrakeRotor} position={[isLeft ? 0.02 : -0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 0.018, 24]} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* 
        ========================================================================
        3. FOUR CORNER LEVELING OUTRIGGER JACKS (MATCHING PHOTO)
        Features:
        - Ground leveling foot pads resting flat on the floor at Y = 0.00m
        - Vertical chrome threaded spindle rods extending up through brackets
        - DISTINCTIVE GOLDEN BRASS KNURLED LOCKING KNOBS (from user photo!)
        - Top chrome adjustment handles
        ========================================================================
      */}
      {outriggerPositions.map(([ox, oz], oIdx) => {
        const isLeft = ox < 0;
        const isFront = oz < 0;
        return (
          <group key={`outrigger-${oIdx}`} position={[ox, 0, oz]}>
            {/* Outrigger Frame Arm projecting from Dolly Chassis Corner */}
            <mesh
              castShadow
              receiveShadow
              material={matChassisDark}
              position={[isLeft ? 0.16 : -0.16, 0.22, isFront ? 0.09 : -0.09]}
              rotation={[0, isLeft ? (isFront ? Math.PI / 4 : -Math.PI / 4) : (isFront ? -Math.PI / 4 : Math.PI / 4), 0]}
            >
              <boxGeometry args={[0.14, 0.16, 0.32]} />
            </mesh>

            {/* Vertical Spindle Guide Sleeve / Collar on Bracket */}
            <mesh castShadow receiveShadow material={matChassisDark} position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.038, 0.042, 0.16, 20]} />
            </mesh>
            <mesh castShadow material={matChrome} position={[0, 0.22, isFront ? -0.042 : 0.042]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.016, 12]} />
            </mesh>

            {/* Vertical Chrome Threaded Spindle Screw Rod */}
            <mesh castShadow material={matSpindleChrome} position={[0, 0.26, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.48, 20]} />
            </mesh>

            {/* 
              DISTINCTIVE GOLDEN BRASS KNURLED LOCKING KNOB / COLLAR
              (Prominently visible in media_1787133234891.png!)
            */}
            <group position={[0, 0.33, 0]}>
              {/* Main Golden Brass Knurled Body */}
              <mesh castShadow receiveShadow material={matBrassKnurled}>
                <cylinderGeometry args={[0.052, 0.052, 0.055, 32]} />
              </mesh>
              {/* Top & Bottom Brass Bevel Rings */}
              <mesh castShadow material={matBrassKnurled} position={[0, 0.028, 0]}>
                <cylinderGeometry args={[0.046, 0.052, 0.008, 24]} />
              </mesh>
              <mesh castShadow material={matBrassKnurled} position={[0, -0.028, 0]}>
                <cylinderGeometry args={[0.052, 0.046, 0.008, 24]} />
              </mesh>
              {/* Center Brass Locking Pin */}
              <mesh castShadow material={matBrassKnurled} position={[0, 0, 0.056]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.007, 0.007, 0.018, 12]} />
              </mesh>
            </group>

            {/* Top Chrome Spindle Handle / Socket Cap */}
            <group position={[0, 0.50, 0]}>
              <mesh castShadow material={matChrome}>
                <cylinderGeometry args={[0.024, 0.024, 0.025, 16]} />
              </mesh>
              {/* Horizontal Cross-Pin / Turning Bar */}
              <mesh castShadow material={matChrome} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.007, 0.007, 0.12, 12]} />
              </mesh>
              {/* End Caps */}
              <mesh castShadow material={matYellowAccent} position={[-0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <sphereGeometry args={[0.009, 8, 8]} />
              </mesh>
              <mesh castShadow material={matYellowAccent} position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <sphereGeometry args={[0.009, 8, 8]} />
              </mesh>
            </group>

            {/* Ground Leveling Foot Pad (Stützteller) Resting flat on floor at Y = 0.00m */}
            <group position={[0, 0.012, 0]}>
              {/* Polished Stainless Steel Base Disc */}
              <mesh castShadow receiveShadow material={matChrome} position={[0, -0.004, 0]}>
                <cylinderGeometry args={[0.115, 0.12, 0.008, 28]} />
              </mesh>
              {/* Vulcanized Rubber Foot Pad Disc */}
              <mesh castShadow receiveShadow material={matRubberFootPad} position={[0, 0.006, 0]}>
                <cylinderGeometry args={[0.11, 0.115, 0.016, 28]} />
              </mesh>
              {/* Swivel Ball Joint Pivot Socket Collar */}
              <mesh castShadow material={matChrome} position={[0, 0.024, 0]}>
                <cylinderGeometry args={[0.034, 0.042, 0.024, 20]} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* 
        ========================================================================
        4. REAR DECK BATTERY & POWER ELECTRONICS UNIT (EZION BOX)
        Mounted on the dolly deck behind the mast column (matching photo)
        ========================================================================
      */}
      <group position={[0, 0.46, 0.62]}>
        {/* Main Box Enclosure */}
        <mesh castShadow receiveShadow material={matPedestalBlack}>
          <boxGeometry args={[0.48, 0.19, 0.36]} />
        </mesh>

        {/* Top Cover Plate with Chamfer */}
        <mesh castShadow receiveShadow material={matChassisDark} position={[0, 0.10, 0]}>
          <boxGeometry args={[0.50, 0.015, 0.38]} />
        </mesh>

        {/* Aluminum Side Heat-Sink Cooling Fins */}
        {[-0.245, 0.245].map((hx, hIdx) => (
          <group key={`heatsink-${hIdx}`} position={[hx, 0, 0]}>
            {[-0.12, -0.06, 0, 0.06, 0.12].map((fz, fIdx) => (
              <mesh key={`fin-${fIdx}`} castShadow material={matChrome} position={[0, 0, fz]}>
                <boxGeometry args={[0.012, 0.14, 0.008]} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Front Panel Controls (Facing Crane Mast) */}
        <group position={[0, 0, -0.182]}>
          {/* Main Power Master Switch */}
          <mesh castShadow material={matChrome} position={[-0.14, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.012, 12]} />
          </mesh>
          <mesh castShadow material={matYellowAccent} position={[-0.14, 0.02, -0.01]}>
            <boxGeometry args={[0.008, 0.024, 0.008]} />
          </mesh>

          {/* 4 Multi-Color LEMO Heavy DC Power Sockets */}
          {[
            { c: 0xfacc15, x: -0.05 },
            { c: 0xef4444, x: 0.02 },
            { c: 0x3b82f6, x: 0.09 },
            { c: 0x22c55e, x: 0.16 }
          ].map((plug, pIdx) => (
            <group key={`lemo-socket-${pIdx}`} position={[plug.x, 0.02, 0]}>
              <mesh castShadow material={matChrome} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.018, 0.018, 0.008, 16]} />
              </mesh>
              <mesh material={new THREE.MeshStandardMaterial({ color: plug.c, roughness: 0.3 })} position={[0, 0, -0.006]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.012, 0.004, 8, 16]} />
              </mesh>
            </group>
          ))}

          {/* Green Status Active LED */}
          <mesh material={new THREE.MeshBasicMaterial({ color: 0x22c55e })} position={[-0.19, 0.05, 0]}>
            <sphereGeometry args={[0.007, 8, 8]} />
          </mesh>

          {/* Red Fault / E-Stop LED */}
          <mesh material={new THREE.MeshBasicMaterial({ color: 0xef4444 })} position={[-0.19, -0.02, 0]}>
            <sphereGeometry args={[0.007, 8, 8]} />
          </mesh>
        </group>

        {/* Heavy Coiled Flexible Rubber Power Conduit running into Column Base */}
        <mesh castShadow material={matRubberFootPad} position={[0, -0.04, -0.28]} rotation={[0.45, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.28, 12]} />
        </mesh>
      </group>

      {/* 
        ========================================================================
        5. HEAVY PEDESTAL BASE TOWER & 4 TRIANGULAR GUSSET FINS
        Welded mast pedestal structure anchoring the crane column
        ========================================================================
      */}
      <group position={[0, 0, 0]}>
        {/* Heavy Base Mounting Plate bolted to Dolly Deck */}
        <mesh castShadow receiveShadow material={matChassisDark} position={[0, 0.38, 0]}>
          <boxGeometry args={[0.64, 0.04, 0.64]} />
        </mesh>

        {/* 4 Corner Heavy Anchor Bolts */}
        {[
          [-0.26, -0.26],
          [0.26, -0.26],
          [-0.26, 0.26],
          [0.26, 0.26]
        ].map(([bx, bz], bIdx) => (
          <group key={`base-anchor-bolt-${bIdx}`} position={[bx, 0.405, bz]}>
            <mesh castShadow material={matChrome}>
              <cylinderGeometry args={[0.018, 0.018, 0.026, 12]} />
            </mesh>
            <mesh castShadow material={matYellowAccent} position={[0, 0.016, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.012, 8]} />
            </mesh>
          </group>
        ))}

        {/* Central Black Pedestal Mast Column Housing */}
        <mesh castShadow receiveShadow material={matPedestalBlack} position={[0, 0.68, 0]}>
          <cylinderGeometry args={[0.185, 0.198, 0.60, 28]} />
        </mesh>

        {/* 4 Large Triangular Gusset Support Fins (Welded Stiffeners) */}
        {/* Front Fin (+Z) */}
        <group position={[0, 0.66, 0.18]}>
          <mesh castShadow receiveShadow material={matPedestalBlack}>
            <boxGeometry args={[0.028, 0.54, 0.16]} />
          </mesh>
        </group>
        {/* Back Fin (-Z) */}
        <group position={[0, 0.66, -0.18]}>
          <mesh castShadow receiveShadow material={matPedestalBlack}>
            <boxGeometry args={[0.028, 0.54, 0.16]} />
          </mesh>
        </group>
        {/* Left Fin (-X) */}
        <group position={[-0.18, 0.66, 0]}>
          <mesh castShadow receiveShadow material={matPedestalBlack}>
            <boxGeometry args={[0.16, 0.54, 0.028]} />
          </mesh>
        </group>
        {/* Right Fin (+X) */}
        <group position={[0.18, 0.66, 0]}>
          <mesh castShadow receiveShadow material={matPedestalBlack}>
            <boxGeometry args={[0.16, 0.54, 0.028]} />
          </mesh>
        </group>

        {/* Lower Heavy Clamping Flange Ring at Top of Pedestal */}
        <mesh castShadow receiveShadow material={matChassisDark} position={[0, 0.98, 0]}>
          <cylinderGeometry args={[0.205, 0.205, 0.06, 28]} />
        </mesh>

        {/* Flange Bolts Ring (8x Chrome Socket Head Screws) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, fIdx) => {
          const rad = THREE.MathUtils.degToRad(deg);
          return (
            <mesh
              key={`flange-bolt-${fIdx}`}
              castShadow
              material={matChrome}
              position={[Math.cos(rad) * 0.19, 1.015, Math.sin(rad) * 0.19]}
            >
              <cylinderGeometry args={[0.009, 0.009, 0.016, 8]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
