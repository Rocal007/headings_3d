import { useMemo } from 'react';
import * as THREE from 'three';
import AutoHorizonMount from './AutoHorizonMount';
import ArriCinemaCamera from './ArriCinemaCamera';

// --- PROCEDURAL TEXTURES FOR S-HEAD LABELS & DECALS ---

// 1. Vernier Height Adjustment Scale Decal (0 to 5 with alignment arrows for L2/L5)
function createVernierScaleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181a20';
    ctx.fillRect(0, 0, 128, 512);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;

    // Center vertical index guide
    ctx.beginPath();
    ctx.moveTo(64, 20);
    ctx.lineTo(64, 492);
    ctx.stroke();

    // Scale tick marks (0 to 5 cm)
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 24px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
      const y = 50 + i * 80;
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(96, y);
      ctx.stroke();
      ctx.fillText(i.toString(), 64, y - 24);

      // Subdivisions (5mm ticks)
      if (i < 5) {
        ctx.beginPath();
        ctx.moveTo(48, y + 40);
        ctx.lineTo(80, y + 40);
        ctx.stroke();
      }
    }

    // Top and Bottom White Triangles / Arrows
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 10);
    ctx.lineTo(50, 32);
    ctx.lineTo(78, 32);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(64, 502);
    ctx.lineTo(50, 480);
    ctx.lineTo(78, 480);
    ctx.closePath();
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 2. Front Left Yoke Strut "L2" (arrows) and "L5" (horizontal line) Markings
function createYokeL2L5Texture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top Downward Arrow pointing down to split line
    ctx.beginPath();
    ctx.moveTo(128, 44);
    ctx.lineTo(112, 18);
    ctx.lineTo(144, 18);
    ctx.closePath();
    ctx.fill();

    // Bottom Upward Arrow pointing up to split line
    ctx.beginPath();
    ctx.moveTo(128, 54);
    ctx.lineTo(112, 80);
    ctx.lineTo(144, 80);
    ctx.closePath();
    ctx.fill();

    // "L2"
    ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('L2', 128, 114);

    // Long horizontal white index line for L5
    ctx.fillRect(16, 154, 224, 6);

    // "L5"
    ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('L5', 128, 196);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 3. Roll Ring "TOP-FRONT" Badge Plate at 12 o'clock (from Reference Photo)
function createTopFrontDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#14171d';
    ctx.fillRect(0, 0, 256, 64);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 56);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '3px';
    ctx.fillText('TOP-FRONT', 128, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 4. ARRI Standard 60-Tooth Rosette Disk Decal / Material
function createArriRosetteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);

    // Outer Silver Teeth Rim
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.stroke();

    // 60 Radial Splines / Teeth
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const x1 = 64 + Math.cos(angle) * 36;
      const y1 = 64 + Math.sin(angle) * 36;
      const x2 = 64 + Math.cos(angle) * 56;
      const y2 = 64 + Math.sin(angle) * 56;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }


    // Inner recess ring
    ctx.fillStyle = '#0f1115';
    ctx.beginPath();
    ctx.arc(64, 64, 34, 0, Math.PI * 2);
    ctx.fill();

    // Center stainless Allen screw
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(64, 64, 22, 0, Math.PI * 2);
    ctx.fill();

    // Hex socket
    ctx.fillStyle = '#090a0d';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = 64 + Math.cos(angle) * 12;
      const y = 64 + Math.sin(angle) * 12;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export interface RemoteCameraHeadProps {
  headPan?: number;
  headTilt?: number;
  headRoll?: number;
  boomTilt?: number;
  autoLevel?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  useCadColors?: boolean;
  showCableLead?: boolean;
}

export function RemoteCameraHead({
  headPan = 0,
  headTilt = 0,
  headRoll = 0,
  boomTilt = 0,
  autoLevel = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  useCadColors = false,
  showCableLead = true
}: RemoteCameraHeadProps) {
  // Textures
  const texVernier = useMemo(() => createVernierScaleTexture(), []);
  const texYokeL2L5 = useMemo(() => createYokeL2L5Texture(), []);
  const texTopFront = useMemo(() => createTopFrontDecalTexture(), []);
  const texRosette = useMemo(() => createArriRosetteTexture(), []);

  // 1. Sleek Photo-Matched CNC Arched Top Pan Yoke Bridge (Querbügel)
  const geomYokeBridge = useMemo(() => {
    const shape = new THREE.Shape();
    // Start at left outer end bottom corner
    shape.moveTo(-0.275, -0.028);
    // Smooth upward arched under-clearance
    shape.lineTo(-0.160, -0.028);
    shape.quadraticCurveTo(0, -0.010, 0.160, -0.028);
    // Right outer end bottom corner
    shape.lineTo(0.275, -0.028);
    // Right outer end vertical face
    shape.lineTo(0.275, 0.028);
    // Right wing top slope to center crown
    shape.lineTo(0.130, 0.035);
    // Center raised crown arc over slewing ring
    shape.quadraticCurveTo(0, 0.055, -0.130, 0.035);
    // Left wing top slope to left outer end
    shape.lineTo(-0.275, 0.028);
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.190,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelThickness: 0.004,
      bevelSize: 0.004
    });
  }, []);

  // 2. CAD- & PHOTO-ACCURATE CNC ROLL RING HOOP WITH TOP-RIGHT MOTOR HOUSING & SIDE PLATES
  const geomRollRingPlate = useMemo(() => {
    const shape = new THREE.Shape();
    const Ri = 0.198;

    // Start at top center boss left corner
    shape.moveTo(-0.070, 0.246);

    // Flat top horizontal line over to right motor housing
    shape.lineTo(0.070, 0.246);

    // Top horizontal edge of right motor housing (12:30 to 2:45 o'clock)
    shape.lineTo(0.268, 0.246);

    // Top-right vertical corner of motor housing
    shape.lineTo(0.268, 0.150);

    // Right vertical plate with rosette mounting ears
    shape.lineTo(0.268, -0.095);

    // Chamfer towards lower right arc
    shape.lineTo(0.235, -0.155);

    // Lower right arc down to bottom baseplate saddle
    const segs = 16;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const angle = -Math.PI * 0.20 - t * (Math.PI * 0.30);
      const r = 0.235;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (x < 0.090) break;
      shape.lineTo(x, y);
    }

    // Bottom horizontal base saddle
    shape.lineTo(0.090, -0.235);
    shape.lineTo(-0.090, -0.235);

    // Lower left arc up to left ear plate
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const angle = -Math.PI * 0.50 - t * (Math.PI * 0.30);
      const r = 0.235;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (x < -0.235) break;
      shape.lineTo(x, y);
    }

    // Left vertical ear plate
    shape.lineTo(-0.268, -0.095);
    shape.lineTo(-0.268, 0.150);

    // Chamfer up towards upper left circular arc
    shape.lineTo(-0.238, 0.190);

    // Upper left circular arc back to top center
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const angle = Math.PI * 0.80 - t * (Math.PI * 0.30);
      const r = 0.238;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (x > -0.070) break;
      shape.lineTo(x, y);
    }

    shape.closePath();

    // Central circular hole for lens optical axis
    const hole = new THREE.Path();
    hole.absarc(0, 0, Ri, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelThickness: 0.0025,
      bevelSize: 0.0025
    });
  }, []);
  // Materials
  const matBlackAnodized = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.35, metalness: 0.85 }), []);
  const matDarkComposite = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1d212a, roughness: 0.45, metalness: 0.60 }), []);
  const matChromeSteel = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.15, metalness: 0.95 }), []);
  const matGoldSlipRing = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xdfb15b, roughness: 0.20, metalness: 0.90 }), []);
  const matCableRubber = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.85, metalness: 0.10 }), []);
  const matVelcroStrap = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.90, metalness: 0.05 }), []);

  const matLedGreen = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x22c55e }), []);
  const matLedBlue = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), []);
  const matLedAmber = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xf59e0b }), []);

  const matDecalVernier = useMemo(() => new THREE.MeshBasicMaterial({ map: texVernier, transparent: true }), [texVernier]);
  const matDecalYokeL2L5 = useMemo(() => new THREE.MeshBasicMaterial({ map: texYokeL2L5, transparent: true }), [texYokeL2L5]);
  const matDecalTopFront = useMemo(() => new THREE.MeshBasicMaterial({ map: texTopFront, transparent: true }), [texTopFront]);
  const matDecalRosette = useMemo(() => new THREE.MeshBasicMaterial({ map: texRosette, transparent: true }), [texRosette]);

  // Cable Harnesses matching set photos
  const underYokeLoop1 = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.20, -0.01, 0.04),
    new THREE.Vector3(-0.10, -0.07, 0.06),
    new THREE.Vector3(0.0, -0.09, 0.06),
    new THREE.Vector3(0.10, -0.07, 0.06),
    new THREE.Vector3(0.20, -0.01, 0.04)
  ]), []);
  const underYokeLoop2 = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, -0.01, 0.0),
    new THREE.Vector3(-0.09, -0.08, 0.02),
    new THREE.Vector3(0.0, -0.105, 0.02),
    new THREE.Vector3(0.09, -0.08, 0.02),
    new THREE.Vector3(0.18, -0.01, 0.0)
  ]), []);
  const underYokeLoop3 = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.19, -0.01, -0.04),
    new THREE.Vector3(-0.10, -0.065, -0.03),
    new THREE.Vector3(0.0, -0.085, -0.03),
    new THREE.Vector3(0.10, -0.065, -0.03),
    new THREE.Vector3(0.19, -0.01, -0.04)
  ]), []);
  const rightVelcroDropCable = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.25, 0.12, -0.042),
    new THREE.Vector3(0.275, 0.02, -0.048),
    new THREE.Vector3(0.285, -0.08, -0.050),
    new THREE.Vector3(0.275, -0.16, -0.045)
  ]), []);
  const leftLemoDropCable = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.20, 0.02, -0.055),
    new THREE.Vector3(-0.245, -0.06, -0.058),
    new THREE.Vector3(-0.255, -0.14, -0.050),
    new THREE.Vector3(-0.255, -0.212, -0.042)
  ]), []);
  const mountToYokeCable = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.08, 0.07, 0.02),
    new THREE.Vector3(0.14, 0.04, 0.02),
    new THREE.Vector3(0.18, 0.01, 0.01)
  ]), []);
  const cradleFeedCable = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.252, 0.020, -0.010),
    new THREE.Vector3(-0.210, -0.025, 0.020),
    new THREE.Vector3(-0.145, -0.065, 0.010),
    new THREE.Vector3(-0.080, -0.098, -0.045),
    new THREE.Vector3(-0.065, -0.098, -0.080)
  ]), []);

  const levelPitchOffset = autoLevel ? -THREE.MathUtils.degToRad(boomTilt) : 0;
  const panRad = THREE.MathUtils.degToRad(-headPan + 180);
  const tiltRad = THREE.MathUtils.degToRad(headTilt);
  const rollRad = THREE.MathUtils.degToRad(headRoll);

  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* 1. Active AutoHorizon Leveling Mount */}
      <AutoHorizonMount
        position={[0, -0.04, 0]}
        boomTilt={boomTilt}
        autoLevel={autoLevel}
        useCadColors={useCadColors}
      />

      {/* 2. S-Head Pan Axis (Yaw) */}
      <group position={[0, -0.11, 0]} rotation={[levelPitchOffset, 0, 0]}>
        <group position={[0, -0.165, 0]} rotation={[0, panRad, 0]}>

          {/* Top Mitchell Mount Adapter Hub & Damping Ring */}
          <mesh castShadow receiveShadow material={matDarkComposite} position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.085, 0.095, 0.035, 32]} />
          </mesh>
          <mesh castShadow material={matBlackAnodized} position={[0, 0.058, 0]}>
            <cylinderGeometry args={[0.072, 0.072, 0.015, 32]} />
          </mesh>

          {/* Mitchell Tie-Down 3-Wing Star Castle Nut & Central Threaded Spindle */}
          <group position={[0, 0.092, 0]}>
            <mesh castShadow material={matChromeSteel} position={[0, 0.005, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.024, 16]} />
            </mesh>
            {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((wingAngle, wIdx) => (
              <mesh
                key={`castle-wing-${wIdx}`}
                castShadow
                material={matBlackAnodized}
                position={[Math.sin(wingAngle) * 0.032, 0.005, Math.cos(wingAngle) * 0.032]}
                rotation={[0, -wingAngle, 0]}
              >
                <boxGeometry args={[0.012, 0.014, 0.036]} />
              </mesh>
            ))}
          </group>

          {/* Gold Slip Ring Capsule (Pan Slewing Axis Inner Bore) */}
          <group position={[0, 0.032, 0]}>
            <mesh castShadow material={matDarkComposite}>
              <cylinderGeometry args={[0.045, 0.045, 0.038, 24]} />
            </mesh>
            <mesh castShadow material={matGoldSlipRing}>
              <cylinderGeometry args={[0.034, 0.034, 0.032, 24]} />
            </mesh>
            {[-0.008, 0, 0.008].map((sy, sIdx) => (
              <mesh key={`slip-ring-track-${sIdx}`} castShadow material={matChromeSteel} position={[0, sy, 0]}>
                <cylinderGeometry args={[0.036, 0.036, 0.002, 24]} />
              </mesh>
            ))}
          </group>

          {/* S-HEAD TOP PAN YOKE BRIDGE (Sleek Sculpted CNC Crown, centered at z = 0) */}
          <mesh castShadow receiveShadow material={matBlackAnodized} geometry={geomYokeBridge} position={[0, 0, -0.095]} />

          {/* Top Center White Index Tick Mark on Upper Crown (Razor-Sharp Vector Geometry) */}
          <mesh position={[0, 0.056, 0.00]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.004, 0.040]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.048, 0.096]}>
            <planeGeometry args={[0.004, 0.018]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>

          {/* Cable Harnesses under Bridge Arch */}
          {showCableLead && (
            <group>
              <mesh castShadow receiveShadow material={matCableRubber}><tubeGeometry args={[mountToYokeCable, 20, 0.014, 10, false]} /></mesh>
              <mesh castShadow receiveShadow material={matCableRubber}><tubeGeometry args={[underYokeLoop1, 24, 0.010, 8, false]} /></mesh>
              <mesh castShadow receiveShadow material={matCableRubber}><tubeGeometry args={[underYokeLoop2, 24, 0.010, 8, false]} /></mesh>
              <mesh castShadow receiveShadow material={matCableRubber}><tubeGeometry args={[underYokeLoop3, 24, 0.010, 8, false]} /></mesh>
              <mesh castShadow receiveShadow material={matCableRubber}><tubeGeometry args={[rightVelcroDropCable, 20, 0.012, 8, false]} /></mesh>
              <mesh castShadow receiveShadow material={matCableRubber}><tubeGeometry args={[leftLemoDropCable, 20, 0.007, 8, false]} /></mesh>
            </group>
          )}

          {/* 
            ====================================================================
            LEFT SUSPENSION: CONTINUOUS TWIN TUBES & SOLID CNC TILT POD
            Photo-matched to Set Reference (media_1787258918574.png)
            ====================================================================
          */}
          <group position={[-0.25, -0.18, 0]}>
            {/* Front Strut Tube (Connecting bridge underside at y = +0.152 into front socket at y = -0.075) */}
            <group position={[0, 0, 0.042]}>
              <mesh castShadow material={matDarkComposite} position={[0, 0.152, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.036, 24]} />
              </mesh>
              <mesh castShadow material={matChromeSteel} position={[0.022, 0.152, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.004, 0.004, 0.016, 12]} />
              </mesh>
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0.038, 0]}>
                <cylinderGeometry args={[0.019, 0.019, 0.228, 24]} />
              </mesh>
            </group>

            {/* Rear Strut Tube (Connecting bridge underside at y = +0.152 into rear socket at y = -0.045) */}
            <group position={[0, 0, -0.042]}>
              <mesh castShadow material={matDarkComposite} position={[0, 0.152, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.036, 24]} />
              </mesh>
              <mesh castShadow material={matChromeSteel} position={[0.022, 0.152, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.004, 0.004, 0.016, 12]} />
              </mesh>
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0.053, 0]}>
                <cylinderGeometry args={[0.019, 0.019, 0.198, 24]} />
              </mesh>
            </group>

            {/* Left Solid CNC Tilt Pod (Pivot Axis at y = -0.14) */}
            <group position={[0, -0.14, 0]}>
              {/* 1. Main Lower Circular Bearing Hub */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[-0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.065, 0.065, 0.070, 36]} />
              </mesh>

              {/* 2. Front Tube Collar Boss (Height = 0.070m) with L2/L5 Markings */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[-0.005, 0.035, 0.042]}>
                <cylinderGeometry args={[0.025, 0.025, 0.070, 24]} />
              </mesh>
              <mesh castShadow material={matChromeSteel} position={[-0.026, 0.035, 0.042]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0035, 0.0035, 0.010, 12]} />
              </mesh>
              {/* Photo-Matched L2 & L5 Laser Decal on Front Collar */}
              <mesh position={[-0.005, 0.025, 0.068]}>
                <planeGeometry args={[0.034, 0.065]} />
                <primitive object={matDecalYokeL2L5} attach="material" />
              </mesh>

              {/* 3. Rear Tube Collar Boss (Height = 0.100m) with Top LEMO Socket */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[-0.005, 0.050, -0.042]}>
                <cylinderGeometry args={[0.025, 0.025, 0.100, 24]} />
              </mesh>
              <mesh castShadow material={matChromeSteel} position={[-0.026, 0.050, -0.042]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0035, 0.0035, 0.010, 12]} />
              </mesh>
              {/* Vertical Silver LEMO Receptacle on Top of Rear Tube Collar */}
              <mesh castShadow material={matChromeSteel} position={[-0.005, 0.108, -0.042]}>
                <cylinderGeometry args={[0.007, 0.007, 0.018, 16]} />
              </mesh>

              {/* 4. Central CNC Body Connecting Web */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[-0.005, 0.035, 0]}>
                <boxGeometry args={[0.050, 0.070, 0.084]} />
              </mesh>
              {/* 3x Vertical Seam Screws on Upper Spine */}
              {[0.035, 0.055, 0.075].map((vy, vIdx) => (
                <mesh key={`left-seam-screw-${vIdx}`} castShadow material={matChromeSteel} position={[-0.032, vy, -0.042]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.0025, 0.0025, 0.004, 10]} />
                </mesh>
              ))}

              {/* 5. Outer Circular Face with Central Dark Bore Tunnel & 8 Perimeter Screws */}
              <group position={[-0.041, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                {/* Central Dark Hollow Bore Tunnel */}
                <mesh material={matBlackAnodized} position={[0, -0.020, 0]}>
                  <cylinderGeometry args={[0.024, 0.024, 0.045, 32]} />
                </mesh>
                {/* Inner Bearing Race Chamfer */}
                <mesh material={matChromeSteel} position={[0, -0.002, 0]}>
                  <cylinderGeometry args={[0.026, 0.024, 0.004, 32, 1, true]} />
                </mesh>
                {/* 8 Perimeter Screws */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((sIdx) => {
                  const sAngle = (sIdx / 8) * Math.PI * 2;
                  const sx = Math.cos(sAngle) * 0.054;
                  const sz = Math.sin(sAngle) * 0.054;
                  return (
                    <mesh key={`pod-screw-${sIdx}`} castShadow material={matChromeSteel} position={[sx, 0.002, sz]}>
                      <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
                    </mesh>
                  );
                })}
              </group>

              {/* 6. Inner Pivot Shaft Bearing Collar */}
              <mesh castShadow material={matDarkComposite} position={[0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.052, 0.052, 0.012, 32]} />
              </mesh>

              {/* Status LEDs Array */}
              <mesh position={[0.010, 0.065, 0.068]}><sphereGeometry args={[0.0035, 12, 12]} /><primitive object={matLedGreen} attach="material" /></mesh>
              <mesh position={[0.010, 0.052, 0.068]}><sphereGeometry args={[0.0035, 12, 12]} /><primitive object={matLedBlue} attach="material" /></mesh>
              <mesh position={[0.010, 0.039, 0.068]}><sphereGeometry args={[0.0035, 12, 12]} /><primitive object={matLedAmber} attach="material" /></mesh>
            </group>
          </group>

          {/* 
            ====================================================================
            RIGHT SUSPENSION: CONTINUOUS TWIN TUBES & SOLID CNC TILT MOTOR POD
            Photo-matched to Set Reference (media_1787258918574.png)
            ====================================================================
          */}
          <group position={[0.25, -0.18, 0]}>
            {/* Front Strut Tube */}
            <group position={[0, 0, 0.042]}>
              <mesh castShadow material={matDarkComposite} position={[0, 0.152, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.036, 24]} />
              </mesh>
              <mesh castShadow material={matChromeSteel} position={[-0.022, 0.152, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.004, 0.004, 0.016, 12]} />
              </mesh>
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0.038, 0]}>
                <cylinderGeometry args={[0.019, 0.019, 0.228, 24]} />
              </mesh>
              {/* Vernier Scale Decal on Front Tube */}
              <mesh position={[0, 0.038, 0.020]}>
                <planeGeometry args={[0.032, 0.14]} />
                <primitive object={matDecalVernier} attach="material" />
              </mesh>
            </group>

            {/* Rear Strut Tube with Velcro Strap */}
            <group position={[0, 0, -0.042]}>
              <mesh castShadow material={matDarkComposite} position={[0, 0.152, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.036, 24]} />
              </mesh>
              <mesh castShadow material={matChromeSteel} position={[-0.022, 0.152, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.004, 0.004, 0.016, 12]} />
              </mesh>
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0.053, 0]}>
                <cylinderGeometry args={[0.019, 0.019, 0.198, 24]} />
              </mesh>
              {/* Black Velcro Strap holding Cable Loop */}
              <mesh castShadow material={matVelcroStrap} position={[0, 0.10, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.030, 24]} />
              </mesh>
            </group>

            {/* Right Solid CNC Tilt Motor Pod (Pivot Axis at y = -0.14) */}
            <group position={[0, -0.14, 0]}>
              {/* 1. Main Lower Circular Motor Hub */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.065, 0.065, 0.070, 36]} />
              </mesh>

              {/* 2. Front Tube Collar Boss */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0.005, 0.035, 0.042]}>
                <cylinderGeometry args={[0.025, 0.025, 0.070, 24]} />
              </mesh>
              <mesh castShadow material={matChromeSteel} position={[0.026, 0.035, 0.042]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0035, 0.0035, 0.010, 12]} />
              </mesh>

              {/* 3. Rear Tube Collar Boss */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0.005, 0.050, -0.042]}>
                <cylinderGeometry args={[0.025, 0.025, 0.100, 24]} />
              </mesh>
              <mesh castShadow material={matChromeSteel} position={[0.026, 0.050, -0.042]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0035, 0.0035, 0.010, 12]} />
              </mesh>

              {/* 4. Central CNC Body Connecting Web */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0.005, 0.035, 0]}>
                <boxGeometry args={[0.050, 0.070, 0.084]} />
              </mesh>

              {/* 5. Outer Circular Motor End Cap with 8 Perimeter Screws */}
              <group position={[0.041, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <mesh castShadow material={matDarkComposite} position={[0, -0.002, 0]}>
                  <cylinderGeometry args={[0.064, 0.064, 0.004, 36]} />
                </mesh>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((sIdx) => {
                  const sAngle = (sIdx / 8) * Math.PI * 2;
                  const sx = Math.cos(sAngle) * 0.054;
                  const sz = Math.sin(sAngle) * 0.054;
                  return (
                    <mesh key={`right-pod-screw-${sIdx}`} castShadow material={matChromeSteel} position={[sx, 0.002, sz]}>
                      <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
                    </mesh>
                  );
                })}
              </group>

              {/* 6. Inner Pivot Shaft Bearing Collar */}
              <mesh castShadow material={matDarkComposite} position={[-0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.052, 0.052, 0.012, 32]} />
              </mesh>
            </group>
          </group>

          {/* 3. S-Head Tilt Axis (Pitch) */}
          <group position={[0, -0.32, 0]} rotation={[tiltRad, 0, 0]}>
            {/* Tilt Shaft Pivot Bearings */}
            <mesh castShadow material={matChromeSteel} position={[-0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.026, 0.026, 0.07, 24]} /></mesh>
            <mesh castShadow material={matChromeSteel} position={[0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.026, 0.026, 0.07, 24]} /></mesh>

            {/* 4. S-Head Roll Axis (360° Continuous Roll Gimbal Ring) */}
            <group rotation={[0, 0, rollRad]}>

              {/* CNC Roll Ring Plate (Exact Match to Reference Photo) */}
              <mesh castShadow receiveShadow material={matBlackAnodized} geometry={geomRollRingPlate} position={[0, 0, -0.009]} />

              {/* Inner Concentric Precision Bearing Race Lip */}
              <mesh castShadow material={matDarkComposite} position={[0, 0, 0.009]}>
                <ringGeometry args={[0.198, 0.204, 64]} />
              </mesh>

              {/* Top-Right Rectangular Motor / Drive Housing Backing Box */}
              <group position={[0.205, 0.195, -0.015]}>
                <mesh castShadow receiveShadow material={matBlackAnodized}>
                  <boxGeometry args={[0.125, 0.098, 0.038]} />
                </mesh>
                {/* Heat-sink vertical rib grooves on the outer face */}
                {[-0.035, -0.015, 0.005, 0.025, 0.045].map((hx, hIdx) => (
                  <mesh key={`heatsink-rib-${hIdx}`} castShadow material={matDarkComposite} position={[hx, 0, 0.020]}>
                    <boxGeometry args={[0.006, 0.085, 0.004]} />
                  </mesh>
                ))}
              </group>

              {/* Screws along Top Edge of Motor Housing Block (Reference Photo) */}
              {[0.100, 0.145, 0.190, 0.235].map((sx, sIdx) => (
                <mesh key={`top-motor-screw-${sIdx}`} castShadow material={matChromeSteel} position={[sx, 0.246, 0.001]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.0035, 0.0035, 0.005, 10]} />
                </mesh>
              ))}

              {/* Front Face Screws on Top-Right Motor Box */}
              {[[0.248, 0.220], [0.248, 0.170]].map(([fx, fy], fIdx) => (
                <mesh key={`front-motor-screw-${fIdx}`} castShadow material={matChromeSteel} position={[fx, fy, 0.010]}>
                  <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
                </mesh>
              ))}

              {/* TOP CENTER "TOP-FRONT" BADGE PLATE & SCREWS */}
              <mesh position={[0, 0.234, 0.011]}>
                <planeGeometry args={[0.130, 0.032]} />
                <primitive object={matDecalTopFront} attach="material" />
              </mesh>
              {[-0.045, 0.045].map((tx) => (
                <mesh key={`top-front-screw-${tx < 0 ? 'l' : 'r'}`} castShadow material={matChromeSteel} position={[tx, 0.246, 0.001]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.0035, 0.0035, 0.005, 10]} />
                </mesh>
              ))}

              {/* RIGHT SIDE MOUNTING EAR WITH 4 ARRI ROSETTE DISKS (Reference Photo 3 o'clock) */}
              <group position={[0.252, 0, 0.010]}>
                {/* Upper Paired Rosettes */}
                <mesh position={[0, 0.055, 0.001]}><planeGeometry args={[0.034, 0.034]} /><primitive object={matDecalRosette} attach="material" /></mesh>
                <mesh position={[0, 0.018, 0.001]}><planeGeometry args={[0.034, 0.034]} /><primitive object={matDecalRosette} attach="material" /></mesh>

                {/* Center Countersunk Screws */}
                <mesh castShadow material={matChromeSteel} position={[0, -0.018, 0]}><cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} /></mesh>

                {/* Lower Paired Rosettes */}
                <mesh position={[0, -0.055, 0.001]}><planeGeometry args={[0.034, 0.034]} /><primitive object={matDecalRosette} attach="material" /></mesh>
                <mesh position={[0, -0.092, 0.001]}><planeGeometry args={[0.034, 0.034]} /><primitive object={matDecalRosette} attach="material" /></mesh>

                {/* Outer Bearing Hub Collar */}
                <mesh castShadow material={matDarkComposite} position={[0.020, 0, -0.018]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.048, 0.048, 0.032, 32]} />
                </mesh>
              </group>

              {/* LEFT SIDE MOUNTING EAR WITH 4 ROSETTES (Reference Photo 9 o'clock) */}
              <group position={[-0.252, 0, 0.010]}>
                {/* Upper Paired Rosettes */}
                <mesh position={[0, 0.055, 0.001]}><planeGeometry args={[0.034, 0.034]} /><primitive object={matDecalRosette} attach="material" /></mesh>
                <mesh position={[0, 0.018, 0.001]}><planeGeometry args={[0.034, 0.034]} /><primitive object={matDecalRosette} attach="material" /></mesh>

                {/* Center Countersunk Screws */}
                <mesh castShadow material={matChromeSteel} position={[0, -0.018, 0]}><cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} /></mesh>

                {/* Lower Paired Rosettes */}
                <mesh position={[0, -0.055, 0.001]}><planeGeometry args={[0.034, 0.034]} /><primitive object={matDecalRosette} attach="material" /></mesh>
                <mesh position={[0, -0.092, 0.001]}><planeGeometry args={[0.034, 0.034]} /><primitive object={matDecalRosette} attach="material" /></mesh>

                {/* Outer Bearing Hub Collar */}
                <mesh castShadow material={matDarkComposite} position={[-0.020, 0, -0.018]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.048, 0.048, 0.032, 32]} />
                </mesh>
              </group>

              {/* PERIMETER COUNTERSUNK SCREWS ALONG RING HOOP (Exact Match to Photo) */}
              {[
                [-0.090, 0.230],
                [0.090, 0.230],
                [-0.185, 0.155],
                [-0.185, -0.155],
                [0.185, -0.155],
                [-0.075, -0.225],
                [0.075, -0.225]
              ].map(([px, py], pIdx) => (
                <mesh key={`hoop-screw-${pIdx}`} castShadow material={matChromeSteel} position={[px, py, 0.010]}>
                  <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
                </mesh>
              ))}

              {/* BOTTOM CENTER 6 O'CLOCK WHITE INDEX TICK MARK (Matching Reference Photo) */}
              <mesh position={[0, -0.230, 0.010]}>
                <planeGeometry args={[0.004, 0.020]} />
                <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
              </mesh>

              {/* ROLL RING BOTTOM BASE MOUNT SADDLE & REAR COUNTERWEIGHT ASSEMBLY */}
              <group position={[0, -0.182, 0.00]}>
                {/* 1. Monolithic CNC Base Mount Saddle (Rising from ring rim y = -0.235 up to Dovetail base y = -0.130) */}
                <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0, 0.020]}>
                  <boxGeometry args={[0.115, 0.105, 0.088]} />
                </mesh>

                {/* Lower Ring Rim Guide Flanges */}
                <mesh castShadow material={matDarkComposite} position={[0, -0.048, 0.020]}>
                  <boxGeometry args={[0.130, 0.015, 0.098]} />
                </mesh>

                {/* Top Dovetail Clamping Jaws (at y = +0.050, resting directly under Dovetail track) */}
                <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0.052, 0.020]}>
                  <boxGeometry args={[0.100, 0.010, 0.080]} />
                </mesh>

                {/* Side Quick-Release Clamping Cam Levers on Mount Saddle */}
                <mesh castShadow material={matChromeSteel} position={[0.062, 0.040, 0.010]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.004, 0.004, 0.018, 16]} />
                </mesh>
                <mesh castShadow material={matDarkComposite} position={[0.072, 0.040, 0.010]}>
                  <boxGeometry args={[0.006, 0.022, 0.012]} />
                </mesh>

                {/* 2. Horizontal Rear Counterweight Rail / Tray (Level with Dovetail Base at top of saddle) */}
                <group position={[0, 0.048, -0.075]}>
                  {/* Cantilever Support Rail */}
                  <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, -0.004, 0]}>
                    <boxGeometry args={[0.084, 0.014, 0.110]} />
                  </mesh>

                  {/* Stacked Counterweight Plates (Gegengewichte for Camera Pitch/Roll Balance) */}
                  <group position={[0, 0.008, -0.010]}>
                    {/* Lower Counterweight Slab */}
                    <mesh castShadow receiveShadow material={matDarkComposite} position={[0, 0, 0]}>
                      <boxGeometry args={[0.078, 0.012, 0.070]} />
                    </mesh>
                    {/* Upper Counterweight Slab */}
                    <mesh castShadow receiveShadow material={matDarkComposite} position={[0, 0.012, 0]}>
                      <boxGeometry args={[0.074, 0.010, 0.066]} />
                    </mesh>
                    {/* Top Stainless Locking Thumb Bolt */}
                    <mesh castShadow material={matChromeSteel} position={[0, 0.020, 0]}>
                      <cylinderGeometry args={[0.006, 0.006, 0.008, 16]} />
                    </mesh>
                  </group>

                  {/* Rear Edge Protection & LEMO Data Terminal */}
                  <mesh castShadow material={matDarkComposite} position={[0, 0, -0.056]}>
                    <boxGeometry args={[0.070, 0.020, 0.012]} />
                  </mesh>
                  <mesh castShadow material={matGoldSlipRing} position={[0, 0, -0.063]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.006, 16]} />
                  </mesh>
                </group>
              </group>

              {/* Cradle Feed Cable from Left Ring Port directly into Camera BP-8 Block */}
              {showCableLead && (
                <group>
                  <mesh castShadow receiveShadow material={matCableRubber}>
                    <tubeGeometry args={[cradleFeedCable, 24, 0.0085, 10, false]} />
                  </mesh>
                  {/* Gold LEMO Right-Angle Plug on Left Ring Ear */}
                  <mesh castShadow material={matGoldSlipRing} position={[-0.252, 0.020, -0.010]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.006, 0.006, 0.012, 16]} />
                  </mesh>
                  {/* Spiral Rubber Strain Relief Boot on Ring side */}
                  <mesh castShadow material={matBlackAnodized} position={[-0.244, 0.015, -0.006]} rotation={[0, 0, 0.4]}>
                    <cylinderGeometry args={[0.0075, 0.006, 0.014, 16]} />
                  </mesh>

                  {/* Gold LEMO Right-Angle Plug on BP-8 Terminal Box */}
                  <mesh castShadow material={matGoldSlipRing} position={[-0.065, -0.098, -0.080]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.006, 0.006, 0.012, 16]} />
                  </mesh>
                  {/* Spiral Rubber Strain Relief Boot on BP-8 side */}
                  <mesh castShadow material={matBlackAnodized} position={[-0.070, -0.098, -0.072]} rotation={[0, 0.3, 0]}>
                    <cylinderGeometry args={[0.0075, 0.006, 0.014, 16]} />
                  </mesh>
                </group>
              )}

              {/* 5. MODULAR ARRI CINEMA CAMERA RIG & BP-8 BRIDGEPLATE */}
              <ArriCinemaCamera showCableLead={showCableLead} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export default RemoteCameraHead;
