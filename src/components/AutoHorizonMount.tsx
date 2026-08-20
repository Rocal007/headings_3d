import { useMemo } from 'react';
import * as THREE from 'three';

// --- PROCEDURAL TEXTURES MATCHING REAL FILM SET PHOTO & CAD DRAWING ---

// 1. "Supertechno" Front Flange Plate Engraving
function createSupertechnoFlangeTexture(useCadColors: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (useCadColors) {
      // Anodized copper / orange plate background (CAD mode)
      ctx.fillStyle = '#b86532';
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 400; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 20 + 2, 1);
      }

      ctx.fillStyle = '#1c1b18';
      ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '2px';
      ctx.fillText('Supertechno', 256, 380);

      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, 480, 480);
    } else {
      // Photo-Authentic Matte Black Hard-Anodized Finish (Set Photo Mode)
      ctx.fillStyle = '#14171d';
      ctx.fillRect(0, 0, 512, 512);

      // Fine brushed metal grain
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (let i = 0; i < 500; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 16 + 2, 1);
      }

      // Laser-engraved white "Supertechno" brand text in lower portion (exact match to set photo!)
      ctx.fillStyle = '#e8ecf2';
      ctx.font = 'bold 38px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '3px';
      ctx.fillText('Supertechno', 256, 390);

      // Subtle chamfered bezel border
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 472, 472);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 2. "FRONT" Base Plate Engraving
function createFrontBasePlateTexture(useCadColors: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (useCadColors) {
      ctx.fillStyle = '#b53578';
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 350; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 16 + 2, 1);
      }

      ctx.fillStyle = '#181014';
      ctx.font = 'bold 44px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '5px';
      ctx.fillText('FRONT', 256, 80);
    } else {
      ctx.fillStyle = '#121419';
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < 450; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 14 + 2, 1);
      }

      ctx.fillStyle = '#f0f3f8';
      ctx.font = 'bold 46px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '6px';
      ctx.fillText('FRONT', 256, 80);

      ctx.beginPath();
      ctx.arc(256, 130, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#f0f3f8';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(200, 130, 4, 0, Math.PI * 2);
      ctx.arc(312, 130, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f0f3f8';
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 3. Yellow Emergency Stop Bezel Ring Texture
function createEmergencyStopTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f5b002';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 128, 65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 22px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EMERGENCY', 128, 48);
    ctx.fillText('STOP', 128, 226);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export interface AutoHorizonMountProps {
  boomTilt?: number;      // Crane boom tilt angle (pitch) in degrees
  autoLevel?: boolean;     // When true, actively levels the head against boomTilt
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  useCadColors?: boolean;  // false = authentic matte black filmset finish, true = CAD drawing colors
}

export function AutoHorizonMount({
  boomTilt = 0,
  autoLevel = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  useCadColors = false
}: AutoHorizonMountProps) {
  // Textures
  const texSupertechno = useMemo(() => createSupertechnoFlangeTexture(useCadColors), [useCadColors]);
  const texFrontPlate = useMemo(() => createFrontBasePlateTexture(useCadColors), [useCadColors]);
  const texEmergency = useMemo(() => createEmergencyStopTexture(), []);

  // --- TRAPEZOIDAL GEOMETRIES (EXACT MATCH TO REAL CRANE NOSE & DRAWING) ---
  // 1. Trapezoidal Front & Rear Plates (Tapered top with 45-deg shoulder chamfers)
  const geomTrapezoidPlate = useMemo(() => {
    const shape = new THREE.Shape();
    // Start at bottom left
    shape.moveTo(-0.11, -0.12);
    // Bottom edge
    shape.lineTo(0.11, -0.12);
    // Bottom right corner chamfer
    shape.lineTo(0.13, -0.09);
    // Right vertical edge
    shape.lineTo(0.13, 0.035);
    // Upper right trapezoidal inward slope
    shape.lineTo(0.085, 0.12);
    // Top narrower edge
    shape.lineTo(-0.085, 0.12);
    // Upper left trapezoidal inward slope
    shape.lineTo(-0.13, 0.035);
    // Left vertical edge down
    shape.lineTo(-0.13, -0.09);
    shape.closePath();

    // Central circular bore cutout
    const holePath = new THREE.Path();
    holePath.absarc(0, 0.01, 0.048, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.024,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelThickness: 0.002,
      bevelSize: 0.002
    });
  }, []);

  // 2. Trapezoidal Upper Gearbox & Electronics Housing
  const geomTrapezoidHousing = useMemo(() => {
    const shape = new THREE.Shape();
    // Lower wide edge
    shape.moveTo(-0.105, -0.055);
    shape.lineTo(0.105, -0.055);
    // Lower vertical sides
    shape.lineTo(0.105, 0.01);
    // Sloping trapezoidal roof
    shape.lineTo(0.072, 0.055);
    shape.lineTo(-0.072, 0.055);
    shape.lineTo(-0.105, 0.01);
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.20,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelThickness: 0.002,
      bevelSize: 0.002
    });
  }, []);

  // --- MATERIALS MATCHING THE SET PHOTO & CAD BLUEPRINT ---
  const matFrontFlange = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0xd06c30 : 0x16181e,
    roughness: 0.35,
    metalness: useCadColors ? 0.65 : 0.85,
    map: texSupertechno
  }), [useCadColors, texSupertechno]);

  const matBasePlate = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0xc83e88 : 0x14161c,
    roughness: 0.35,
    metalness: useCadColors ? 0.60 : 0.85,
    map: texFrontPlate
  }), [useCadColors, texFrontPlate]);

  const matGuideTubes = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0x6e68a8 : 0x22262f,
    roughness: 0.28,
    metalness: 0.80
  }), [useCadColors]);

  const matSlottedLink = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0x7c4f8d : 0x20242d,
    roughness: 0.38,
    metalness: 0.70
  }), [useCadColors]);

  const matGearboxHousing = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0xd69e32 : 0x1b1e25,
    roughness: 0.32,
    metalness: useCadColors ? 0.70 : 0.85
  }), [useCadColors]);

  const matGearedSector = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0x6d8544 : 0x968c68,
    roughness: 0.35,
    metalness: 0.75
  }), [useCadColors]);

  const matPivotYoke = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0xa88a50 : 0x1c1f27,
    roughness: 0.40,
    metalness: 0.75
  }), [useCadColors]);

  const matClampCyan = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0x3aa7ba : 0x282e3a,
    roughness: 0.30,
    metalness: 0.75
  }), [useCadColors]);

  const matBellowsRubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0c0e12,
    roughness: 0.90,
    metalness: 0.05
  }), []);

  const matMotorGrey = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x4a505c,
    roughness: 0.45,
    metalness: 0.70
  }), []);

  const matGearboxRed = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xba1a1a,
    roughness: 0.30,
    metalness: 0.80
  }), []);

  const matEncoderGold = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xc99b38,
    roughness: 0.25,
    metalness: 0.90
  }), []);

  const matSteelChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    roughness: 0.12,
    metalness: 0.96
  }), []);

  const matHexNutSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: useCadColors ? 0xba8836 : 0xd8dde6,
    roughness: 0.20,
    metalness: 0.92
  }), [useCadColors]);

  const matLemoBlack = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.40,
    metalness: 0.60
  }), []);

  const matEmergencyBezel = useMemo(() => new THREE.MeshBasicMaterial({
    map: texEmergency
  }), [texEmergency]);

  const matButtonRed = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xdd1111,
    roughness: 0.25,
    metalness: 0.20
  }), []);

  const matQuickLockRed = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xcc2222,
    roughness: 0.30,
    metalness: 0.75
  }), []);

  const matCableJacketBlue = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.50,
    metalness: 0.20
  }), []);

  const matCableJacketYellow = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.50,
    metalness: 0.20
  }), []);

  // Active Horizon Counter-Rotation Angle
  const levelPitchOffset = autoLevel ? -THREE.MathUtils.degToRad(boomTilt) : 0;

  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* 
        ========================================================================
        1. FIXED UPPER CRANE INTERFACE CAGE (TRAPEZOIDAL CRANE NOSE STRUCTURE)
        Neigt sich starr mit dem Kranausleger!
        ========================================================================
      */}
      <group>
        {/* A. TOP ANGLED TRANSPORT / PROTECTION HANDLE BAR (from set photo!) */}
        <group position={[0, 0.29, -0.02]}>
          {/* Main Diagonal Grab Bar */}
          <mesh castShadow material={matGuideTubes} position={[0, 0.05, -0.08]} rotation={[0.42, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.34, 24]} />
          </mesh>
          {/* Support Standoff Strut */}
          <mesh castShadow material={matGuideTubes} position={[0, 0.01, 0.03]} rotation={[-0.15, 0, 0]}>
            <cylinderGeometry args={[0.010, 0.010, 0.09, 16]} />
          </mesh>
        </group>

        {/* B. TRAPEZOIDAL FRONT FLANGE PLATE (Matte Black / Orange - "Supertechno") */}
        <group position={[0, 0.08, -0.15]}>
          {/* Main extruded trapezoidal faceplate */}
          <mesh castShadow receiveShadow material={matFrontFlange} geometry={geomTrapezoidPlate} position={[0, 0, -0.012]} />

          {/* Central Bore Inner Bezel */}
          <mesh castShadow material={matSteelChrome} position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.048, 0.048, 0.026, 32]} />
          </mesh>

          {/* Vertical Clamping Slit from central bore to bottom edge */}
          <mesh castShadow material={matFrontFlange} position={[0, -0.075, 0]}>
            <boxGeometry args={[0.006, 0.08, 0.026]} />
          </mesh>

          {/* Two Vertical Reference / Alignment Holes */}
          <mesh castShadow material={matSteelChrome} position={[0, 0.078, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.026, 16]} />
          </mesh>
          <mesh castShadow material={matSteelChrome} position={[0, -0.056, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.026, 16]} />
          </mesh>

          {/* 4x Corner Mounting Holes & Silver Countersunk Screws (M10x35 4x on Trapezoid) */}
          {[
            [-0.075, 0.085],   // Top-Left (angled trapezoid shoulder)
            [0.075, 0.085],    // Top-Right (angled trapezoid shoulder)
            [-0.105, -0.095],  // Bottom-Left (marked M10x35)
            [0.105, -0.095]    // Bottom-Right
          ].map(([bx, by], bIdx) => (
            <group key={`m10-bolt-${bIdx}`} position={[bx, by, -0.013]}>
              {/* Silver Beveled Outer Washer / Countersink */}
              <mesh castShadow material={matSteelChrome} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.014, 0.012, 0.004, 24]} />
              </mesh>
              {/* Bolt Head & Hex Socket */}
              <mesh castShadow material={matSteelChrome} position={[0, 0, -0.002]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.009, 0.009, 0.006, 16]} />
              </mesh>
              <mesh material={matFrontFlange} position={[0, 0, -0.005]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.0045, 0.0045, 0.003, 6]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* C. 4x TRAPEZOIDAL HORIZONTAL PRECISION GUIDE / SUPPORT TUBES */}
        {/* Top tubes narrower at x = +/- 0.075, bottom tubes wider at x = +/- 0.105 */}
        {[-0.075, 0.075].map((tx, tIdx) => (
          <mesh 
            key={`top-guide-tube-${tIdx}`} 
            castShadow 
            material={matGuideTubes} 
            position={[tx, 0.165, 0.01]} 
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.014, 0.014, 0.32, 24]} />
          </mesh>
        ))}
        {[-0.105, 0.105].map((bx, bIdx) => (
          <mesh 
            key={`bot-guide-tube-${bIdx}`} 
            castShadow 
            material={matGuideTubes} 
            position={[bx, -0.015, 0.01]} 
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.32, 24]} />
          </mesh>
        ))}

        {/* D. CENTRAL TRAPEZOIDAL UPPER GEARBOX & ELECTRONICS CHASSIS */}
        <group position={[0, 0.165, 0.03]}>
          <mesh castShadow receiveShadow material={matGearboxHousing} geometry={geomTrapezoidHousing} position={[0, 0, -0.10]} />

          {/* FRONT-FACING RED EMERGENCY STOP (NOT-AUS) WITH YELLOW RING */}
          <group position={[-0.035, -0.01, -0.105]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh castShadow material={matEmergencyBezel} position={[0, 0.002, 0]}>
              <circleGeometry args={[0.024, 32]} />
            </mesh>
            <mesh castShadow material={matSteelChrome} position={[0, 0.001, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.004, 32]} />
            </mesh>
            <mesh castShadow material={matButtonRed} position={[0, 0.014, 0]}>
              <cylinderGeometry args={[0.015, 0.013, 0.018, 24]} />
            </mesh>
          </group>

          {/* 2x FRONT-FACING SILVER LEMO MINI-CONNECTORS */}
          {[-0.020, 0.005].map((ly, lIdx) => (
            <group key={`front-lemo-${lIdx}`} position={[-0.072, ly, -0.105]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh castShadow material={matSteelChrome}>
                <cylinderGeometry args={[0.008, 0.008, 0.008, 16]} />
              </mesh>
              <mesh castShadow material={matLemoBlack} position={[0, 0.005, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.004, 16]} />
              </mesh>
            </group>
          ))}

          {/* 4x M8x35 zap. Fastening Screws on trapezoid top */}
          {[
            [-0.055, 0.056, 0.06],
            [0.055, 0.056, 0.06],
            [-0.055, 0.056, -0.06],
            [0.055, 0.056, -0.06]
          ].map(([sx, sy, sz], sIdx) => (
            <mesh key={`m8-top-bolt-${sIdx}`} castShadow material={matSteelChrome} position={[sx, sy, sz]}>
              <cylinderGeometry args={[0.0065, 0.0065, 0.004, 12]} />
            </mesh>
          ))}
        </group>

        {/* E. REAR TRAPEZOIDAL CARRIER & 32V CONNECTOR PANEL */}
        <group position={[0, 0.08, 0.17]}>
          <mesh castShadow receiveShadow material={matFrontFlange} geometry={geomTrapezoidPlate} position={[0, 0, -0.012]} />

          {/* Top Latching Nocken */}
          {[-0.055, 0.055].map((px, pIdx) => (
            <mesh key={`latch-claw-${pIdx}`} castShadow material={matBasePlate} position={[px, 0.13, 0]}>
              <boxGeometry args={[0.040, 0.025, 0.03]} />
            </mesh>
          ))}

          {/* 32V Power In Socket & Main Umbilical Connectors */}
          {[-0.040, 0.040].map((lx, lIdx) => (
            <group key={`lemo-rear-socket-${lIdx}`} position={[lx, 0.05, 0.013]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh castShadow material={matLemoBlack}>
                <cylinderGeometry args={[0.014, 0.014, 0.016, 20]} />
              </mesh>
              {/* Colored Strain-Relief Boot (Blue / Yellow as seen in photo) */}
              <mesh castShadow material={lIdx === 0 ? matCableJacketBlue : matCableJacketYellow} position={[0, 0.016, 0]}>
                <cylinderGeometry args={[0.010, 0.012, 0.022, 16]} />
              </mesh>
              <mesh castShadow material={matSteelChrome} position={[0, 0.030, 0]}>
                <cylinderGeometry args={[0.007, 0.007, 0.008, 16]} />
              </mesh>
            </group>
          ))}

          {/* COILED CABLE SERVICE LOOPS ON RIGHT SIDE (Exact match to set photo!) */}
          <group position={[0.155, 0.02, -0.04]}>
            <mesh castShadow material={matBellowsRubber} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.040, 0.007, 12, 32]} />
            </mesh>
            <mesh castShadow material={matBellowsRubber} position={[0.012, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.036, 0.006, 12, 32]} />
            </mesh>
            {/* Blue and Red identification bands */}
            <mesh castShadow material={matCableJacketBlue} position={[0.006, 0.040, 0]}>
              <cylinderGeometry args={[0.009, 0.009, 0.012, 16]} />
            </mesh>
            <mesh castShadow material={matGearboxRed} position={[0.006, -0.040, 0]}>
              <cylinderGeometry args={[0.009, 0.009, 0.012, 16]} />
            </mesh>
          </group>
        </group>

        {/* F. HORIZONTAL MOTOR & PLANETARY REDUCTION DRIVE UNIT */}
        <group position={[0.135, 0.09, 0.06]}>
          {/* 1. Servomotor Housing */}
          <mesh castShadow material={matMotorGrey} position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.065, 0.065, 0.09]} />
          </mesh>

          {/* 2. Red Planetary Gearhead */}
          <mesh castShadow material={matGearboxRed} position={[0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.036, 0.036, 0.038, 24]} />
          </mesh>

          {/* 3. Gold Resolver / Encoder Endcap */}
          <group position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow material={matEncoderGold}>
              <cylinderGeometry args={[0.030, 0.030, 0.045, 24]} />
            </mesh>
            <mesh castShadow material={matSteelChrome} position={[0, 0.024, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.008, 16]} />
            </mesh>
          </group>

          {/* 4. Drive Pinion Gear */}
          <mesh castShadow material={matSteelChrome} position={[-0.045, -0.015, -0.01]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.026, 20]} />
          </mesh>
        </group>

        {/* G. V-SHAPED PIVOT YOKE / SUPPORT STRUTS */}
        {[-0.11, 0.11].map((vx, vIdx) => (
          <group key={`v-strut-${vIdx}`} position={[vx, 0.0, 0.01]}>
            <mesh castShadow material={matPivotYoke}>
              <boxGeometry args={[0.022, 0.16, 0.15]} />
            </mesh>
            {/* 2x M8x45 inner socket screws */}
            {[-0.04, 0.04].map((sz, sIdx) => (
              <mesh 
                key={`m8-strut-screw-${sIdx}`} 
                castShadow 
                material={matSteelChrome} 
                position={[vx > 0 ? -0.012 : 0.012, 0.05, sz]} 
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.0055, 0.0055, 0.006, 12]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* 
        ========================================================================
        2. ACTIVE PIVOTING ASSEMBLY (Leveling Segment, Traversen & Basisplatte)
        Rotates on the central pivot axis by levelPitchOffset = -boomTilt
        so that the lower FRONT mounting plate stays absolutely horizontal!
        ========================================================================
      */}
      <group position={[0, -0.07, 0.01]} rotation={[levelPitchOffset, 0, 0]}>
        {/* A. CENTRAL PIVOT AXIS SHAFT & HUBS */}
        <mesh castShadow material={matClampCyan} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.024, 0.024, 0.25, 24]} />
        </mesh>
        {[-0.126, 0.126].map((ax, aIdx) => (
          <mesh key={`axis-collar-${aIdx}`} castShadow material={matSteelChrome} position={[ax, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.008, 16]} />
          </mesh>
        ))}

        {/* B. LARGE GEARED SECTOR (Champagner / Bronze / Olivgrün) */}
        <group position={[0.04, 0, 0]}>
          <mesh castShadow receiveShadow material={matGearedSector} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.032, 32, 1, false, Math.PI * 0.15, Math.PI * 0.70]} />
          </mesh>
          <mesh castShadow material={matSteelChrome} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.163, 0.163, 0.030, 48, 1, true, Math.PI * 0.15, Math.PI * 0.70]} />
          </mesh>
          {[0.30, 0.50, 0.70].map((tAng, wIdx) => {
            const rad = Math.PI * tAng;
            const wx = Math.cos(rad) * 0.09;
            const wy = Math.sin(rad) * 0.09;
            return (
              <mesh key={`gear-cutout-${wIdx}`} castShadow material={matPivotYoke} position={[0, wy, wx]} rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.034, 0.045, 0.035]} />
              </mesh>
            );
          })}
        </group>

        {/* C. REAL-WORLD FRONT ACCORDION RUBBER BELLOWS (FALTENBALG) */}
        <group position={[0, 0.02, -0.095]} rotation={[-0.20, 0, 0]}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(b => (
            <mesh 
              key={`bellows-pleat-${b}`} 
              castShadow 
              material={matBellowsRubber} 
              position={[0, (4 - b) * 0.016, (b % 2 === 0 ? 0.004 : -0.004)]}
            >
              <boxGeometry args={[0.16, 0.014, 0.08]} />
            </mesh>
          ))}
          <mesh castShadow material={matFrontFlange} position={[0, 0.072, 0]}>
            <boxGeometry args={[0.164, 0.010, 0.084]} />
          </mesh>
          <mesh castShadow material={matFrontFlange} position={[0, -0.072, 0]}>
            <boxGeometry args={[0.164, 0.010, 0.084]} />
          </mesh>
        </group>

        {/* D. DUAL SIDE SLOTTED GUIDE LINKS */}
        {[-0.135, 0.135].map((lx, lIdx) => (
          <group key={`slotted-link-${lIdx}`} position={[lx, 0.06, 0]}>
            <mesh castShadow material={matSlottedLink}>
              <boxGeometry args={[0.016, 0.22, 0.038]} />
            </mesh>
            <mesh material={matFrontFlange} position={[0, 0, 0]}>
              <boxGeometry args={[0.018, 0.15, 0.014]} />
            </mesh>
            <mesh castShadow material={matSteelChrome} position={[0, -0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.024, 16]} />
            </mesh>
          </group>
        ))}

        {/* E. SIDE DOUBLE CABLE / HOSE CLAMP */}
        <group position={[0.145, 0.02, 0.04]}>
          <mesh castShadow material={matClampCyan}>
            <boxGeometry args={[0.024, 0.036, 0.075]} />
          </mesh>
          {[-0.018, 0.018].map((cz, cIdx) => (
            <mesh key={`clamp-hole-${cIdx}`} material={matLemoBlack} position={[0, 0, cz]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.009, 0.009, 0.038, 16]} />
            </mesh>
          ))}
          <mesh castShadow material={matSteelChrome} position={[0.013, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.004, 0.004, 0.008, 12]} />
          </mesh>
        </group>

        {/* F. LOWER TRANSVERSE LINKAGE BLOCKS */}
        {[-0.08, 0.08].map((tx, tIdx) => (
          <mesh key={`traverse-${tIdx}`} castShadow material={matClampCyan} position={[tx, -0.04, 0]}>
            <boxGeometry args={[0.042, 0.030, 0.16]} />
          </mesh>
        ))}

        {/* G. 4x VERTICAL STAINLESS STEEL STAND-OFF PILLARS WITH HEX & DOME NUTS */}
        {[
          [-0.08, -0.055],
          [0.08, -0.055],
          [-0.08, 0.055],
          [0.08, 0.055]
        ].map(([px, pz], pIdx) => (
          <group key={`standoff-pillar-${pIdx}`} position={[px, -0.10, pz]}>
            <mesh castShadow material={matSteelChrome}>
              <cylinderGeometry args={[0.009, 0.009, 0.11, 24]} />
            </mesh>
            <mesh castShadow material={matHexNutSteel} position={[0, 0.032, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.012, 6]} />
            </mesh>
            <mesh castShadow material={matHexNutSteel} position={[0, -0.032, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.012, 6]} />
            </mesh>
          </group>
        ))}

        {/* H. LOWER MOUNTING BASE PLATE (Matte Black - Laser-etched "FRONT") */}
        <group position={[0, -0.165, 0]}>
          <mesh castShadow receiveShadow material={matBasePlate}>
            <boxGeometry args={[0.24, 0.022, 0.20]} />
          </mesh>

          {/* RED MITCHELL MOUNT LOCK LEVER / ACCENT (from set photo!) */}
          <group position={[-0.125, -0.005, 0]}>
            <mesh castShadow material={matQuickLockRed}>
              <boxGeometry args={[0.016, 0.028, 0.08]} />
            </mesh>
            <mesh castShadow material={matSteelChrome} position={[-0.010, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.006, 0.006, 0.024, 16]} />
            </mesh>
          </group>

          {/* SILVER KNURLED MITCHELL LOCK SPINDLE / HANDLE (Visible at front-left in set photo!) */}
          <group position={[-0.095, -0.018, -0.09]} rotation={[0, -0.45, Math.PI / 2]}>
            <mesh castShadow material={matSteelChrome}>
              <cylinderGeometry args={[0.007, 0.007, 0.045, 16]} />
            </mesh>
            <mesh castShadow material={matSteelChrome} position={[0, -0.030, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.038, 24]} />
            </mesh>
            <mesh castShadow material={matSteelChrome} position={[0, -0.052, 0]}>
              <cylinderGeometry args={[0.012, 0.015, 0.008, 24]} />
            </mesh>
          </group>

          {/* Center Mitchell Mount / Cable Clearance Bore */}
          <mesh castShadow material={matSteelChrome} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.024, 32]} />
          </mesh>

          {/* 4x Counter-bored Pillar Mounting Holes with Stainless Hex Nuts */}
          {[
            [-0.08, -0.055],
            [0.08, -0.055],
            [-0.08, 0.055],
            [0.08, 0.055]
          ].map(([hx, hz], hIdx) => (
            <mesh key={`base-hole-${hx}-${hz}-${hIdx}`} castShadow material={matHexNutSteel} position={[hx, 0.011, hz]}>
              <cylinderGeometry args={[0.012, 0.012, 0.006, 6]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

export default AutoHorizonMount;
