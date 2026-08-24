import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';

/**
 * Generates the authentic scale markings texture for the boom side:
 * - Numbers '10', '14', with metric/imperial graduation tick marks
 * - Dual rows of precision indexing dots matching reference photos
 */
function createBoomScaleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);
  ctx.strokeStyle = '#f8fafc';
  ctx.fillStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';

  // 1. Top Edge Scale Markings
  ctx.beginPath();
  ctx.moveTo(110, 0);
  ctx.lineTo(110, 22);
  ctx.stroke();
  ctx.fillText('10', 110, 42);

  ctx.beginPath();
  ctx.moveTo(370, 0);
  ctx.lineTo(370, 22);
  ctx.stroke();
  ctx.fillText('14', 370, 42);

  [45, 175, 240, 305, 435, 500].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 14);
    ctx.stroke();
  });

  // 2. Precision Indexing Dots (Two horizontal rows)
  const dotRadius = 3;
  [75, 140, 205, 270, 335, 400, 465].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 56, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  [45, 110, 175, 240, 305, 370, 435, 500].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 96, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * ============================================================================
 * CRANE FULCRUM BEARING ASSEMBLY (SUPERTECHNO 50+ SERIES NO. 656)
 * Complete 1:1 Implementation from the 5-page Service Manual Blueprint:
 * 1. Maroon Column Mast with 11x M8 chrome screws + 1 RED keyway screw (Step 3/4)
 * 2. Teal Base Adapter Plate with orange gusset, 2x M12 & 4x M16 bolts (Step 1/5)
 * 3. Magenta Rotary Damper/Encoder Canister on front-left corner
 * 4. Transverse Tan/Ochre Bearing Cradle Block (Step 1, 2, 3, 4)
 * 5. Left Blue Bearing Upright Arm with black teardrop motor cover & pin hole
 * 6. Right Grey Bearing Upright Arm
 * 7. Straight Pink/Plum Underside Plate under boom with perimeter screws
 * 8. Green Circular Pivot Bearing Hub
 * ============================================================================
 */
export default function CraneFulcrumAssembly({
  crane,
  kinematics,
  visible = true
}: {
  crane: Supertechno50FBXModel | null;
  kinematics: {
    boomTilt?: number;
    basePan?: number;
    dollyTrack?: number;
    columnElevation?: number;
    [key: string]: any;
  };
  visible?: boolean;
}) {
  const fulcrumGroupRef = useRef<THREE.Group>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const saddleRef = useRef<THREE.Group>(null);

  const scaleTex = useMemo(() => createBoomScaleTexture(), []);

  // Materials matching 5-page CAD Service Manual
  // Authentic materials matching reference photo (media_1787139309379.png)
  const matColumnTopMaroon = new THREE.MeshStandardMaterial({
    color: 0x181b22,
    roughness: 0.42,
    metalness: 0.85
  });

  const matBaseTableTeal = new THREE.MeshStandardMaterial({
    color: 0x1c2028,
    roughness: 0.44,
    metalness: 0.82
  });

  const matTanCradleBlock = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.40,
    metalness: 0.85
  });

  const matBronzeGusset = new THREE.MeshStandardMaterial({
    color: 0x181a20,
    roughness: 0.45,
    metalness: 0.80
  });

  const matMagentaCanister = new THREE.MeshStandardMaterial({
    color: 0x252a34,
    roughness: 0.35,
    metalness: 0.88
  });

  const matBlueUpright = new THREE.MeshStandardMaterial({
    color: 0x1a1d24,
    roughness: 0.40,
    metalness: 0.84
  });

  const matGreyUpright = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.42,
    metalness: 0.82
  });

  const matTeardropCover = new THREE.MeshStandardMaterial({
    color: 0x16181f,
    roughness: 0.38,
    metalness: 0.86
  });

  const matPinkUndersidePlate = new THREE.MeshStandardMaterial({
    color: 0x1e222a,
    roughness: 0.45,
    metalness: 0.80
  });

  const matGreenPivotHub = new THREE.MeshStandardMaterial({
    color: 0x181b22,
    roughness: 0.38,
    metalness: 0.86
  });

  const matBlackTrim = new THREE.MeshStandardMaterial({
    color: 0x121418,
    roughness: 0.48,
    metalness: 0.82
  });

  const matRedKeywayScrew = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.25,
    metalness: 0.90
  });

  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.12,
    metalness: 0.98
  });

  const matSteelWasher = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.20,
    metalness: 0.94
  });

// ⚡ ZERO-GC SCRATCH OBJECTS FOR REALTIME FRAME LOOPS
const _fulcrumBeamWorldPos = new THREE.Vector3();

  useFrame(() => {
    if (!fulcrumGroupRef.current || !crane || !crane.isLoaded) return;

    const beamsNode = crane.nodes.beams;
    if (beamsNode) {
      beamsNode.getWorldPosition(_fulcrumBeamWorldPos);
      fulcrumGroupRef.current.position.copy(_fulcrumBeamWorldPos);

      // Saddle fork stays attached to column mast, rotating only with Base Pan (Yaw)
      if (saddleRef.current) {
        const pan = kinematics.basePan || 0;
        saddleRef.current.rotation.y = THREE.MathUtils.degToRad(-pan);
      }

      // Tilt components rotate with Boom Tilt (Pitch) & Base Pan (Yaw)
      if (tiltGroupRef.current) {
        const pan = kinematics.basePan || 0;
        const tilt = kinematics.boomTilt || 0;
        tiltGroupRef.current.rotation.y = THREE.MathUtils.degToRad(-pan);
        tiltGroupRef.current.rotation.x = THREE.MathUtils.degToRad(tilt);
      }
    }
  });

  if (!visible) return null;

  return (
    <group ref={fulcrumGroupRef}>
      {/* 
        ========================================================================
        1. SADDLE FORK & BASE BEARING ADAPTER TABLE (MOUNTED TO COLUMN MAST)
        Matching Series No. 656 CAD Manual (Pages 1, 2, 3, 4, 5)
        ========================================================================
      */}
      <group ref={saddleRef} position={[0, 0, 0]}>
        {/* A. Top of Column Mast Cylinder (Maroon) with 11x M8 + 1 RED Keyway Screw */}
        <group position={[0, -0.58, 0]}>
          <mesh castShadow receiveShadow material={matColumnTopMaroon}>
            <cylinderGeometry args={[0.138, 0.138, 0.18, 24]} />
          </mesh>

          {/* 11x M8 Chrome Socket Screws around Mast Top */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300].map((deg, sIdx) => {
            const rad = THREE.MathUtils.degToRad(deg);
            return (
              <mesh
                key={`mast-bolt-${sIdx}`}
                castShadow
                material={matChrome}
                position={[Math.cos(rad) * 0.14, 0.04, Math.sin(rad) * 0.14]}
                rotation={[0, -rad, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.005, 0.005, 0.008, 8]} />
              </mesh>
            );
          })}

          {/* The RED Keyway Screw (Step 3: "Never loosen the red screw!") at angle 330° */}
          <group
            position={[Math.cos(THREE.MathUtils.degToRad(330)) * 0.14, 0.04, Math.sin(THREE.MathUtils.degToRad(330)) * 0.14]}
            rotation={[0, -THREE.MathUtils.degToRad(330), Math.PI / 2]}
          >
            <mesh castShadow material={matRedKeywayScrew}>
              <cylinderGeometry args={[0.006, 0.006, 0.01, 8]} />
            </mesh>
          </group>
        </group>

        {/* B. Base Bearing Adapter Table (Teal Plate) */}
        <group position={[0, -0.47, 0]}>
          {/* Main Teal Table Plate */}
          <mesh castShadow receiveShadow material={matBaseTableTeal}>
            <boxGeometry args={[0.42, 0.04, 0.32]} />
          </mesh>

          {/* Transverse Tan/Ochre Bearing Cradle Block (Step 1, 2, 3, 4) */}
          <mesh castShadow receiveShadow material={matTanCradleBlock} position={[0, 0.05, 0]}>
            <boxGeometry args={[0.36, 0.06, 0.12]} />
          </mesh>

          {/* Bronze/Orange Bottom Reinforcement Gusset Pad (Left Corner) */}
          <mesh castShadow receiveShadow material={matBronzeGusset} position={[-0.10, -0.024, 0.04]}>
            <boxGeometry args={[0.20, 0.012, 0.22]} />
          </mesh>

          {/* 4x M16 Recessed Bottom Bolts (Left & Right Flanges, Step 1) */}
          {[
            [-0.13, 0.08],
            [-0.07, 0.11],
            [0.11, 0.12],
            [0.15, 0.08],
            [0.17, 0.03]
          ].map(([bx, bz], bIdx) => (
            <mesh key={`tbl-bolt-${bIdx}`} castShadow material={matChrome} position={[bx, -0.026, bz]}>
              <cylinderGeometry args={[0.008, 0.008, 0.01, 10]} />
            </mesh>
          ))}

          {/* Magenta Rotary Damper / Encoder Canister on Front-Left Corner */}
          <group position={[-0.15, 0.055, 0.12]}>
            <mesh castShadow receiveShadow material={matMagentaCanister}>
              <cylinderGeometry args={[0.032, 0.032, 0.075, 16]} />
            </mesh>
            <mesh castShadow material={matBlackTrim} position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.034, 0.034, 0.008, 16]} />
            </mesh>
          </group>
        </group>

        {/* C. Left Blue Bearing Upright Arm (Drive Side, Steps 1 & 2) */}
        <group position={[-0.18, -0.22, 0]}>
          {/* Vertical Blue Arm Upright */}
          <mesh castShadow receiveShadow material={matBlueUpright}>
            <boxGeometry args={[0.04, 0.46, 0.20]} />
          </mesh>

          {/* Cable Guide Clips on Edges */}
          <mesh castShadow material={matBlackTrim} position={[0, -0.10, 0.105]}>
            <boxGeometry args={[0.018, 0.025, 0.012]} />
          </mesh>
          <mesh castShadow material={matBlackTrim} position={[0, -0.02, 0.105]}>
            <boxGeometry args={[0.018, 0.025, 0.012]} />
          </mesh>
          <mesh castShadow material={matBlackTrim} position={[0, -0.10, -0.105]}>
            <boxGeometry args={[0.018, 0.025, 0.012]} />
          </mesh>

          {/* Indexing Pin Through-Hole (Red Arrow in Step 1/2) */}
          <mesh
            material={new THREE.MeshBasicMaterial({ color: 0x0f172a })}
            position={[0, -0.06, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.042, 12]} />
          </mesh>

          {/* Teardrop-Shaped Motor / Belt Housing Cover on Outer Face */}
          <group position={[-0.028, 0.10, 0]}>
            <mesh castShadow receiveShadow material={matTeardropCover} position={[0, 0.055, 0]}>
              <cylinderGeometry args={[0.068, 0.068, 0.03, 20]} />
            </mesh>
            <mesh castShadow receiveShadow material={matTeardropCover} position={[0, -0.055, 0]}>
              <boxGeometry args={[0.03, 0.16, 0.11]} />
            </mesh>
            {/* Connector Receptacle on Rear Flank */}
            <mesh castShadow material={matChrome} position={[0, 0.02, -0.065]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.012, 10]} />
            </mesh>
          </group>
        </group>

        {/* D. Right Grey Bearing Upright Arm (Support Side, Steps 1 & 2) */}
        <group position={[0.18, -0.22, 0]}>
          <mesh castShadow receiveShadow material={matGreyUpright}>
            <boxGeometry args={[0.04, 0.46, 0.20]} />
          </mesh>
        </group>

        {/* E. Straight Horizontal Pink Plate connecting between Upright Arms (Steps 1 & 2) */}
        <group position={[0, -0.22, 0]}>
          <mesh castShadow receiveShadow material={matPinkUndersidePlate}>
            <boxGeometry args={[0.32, 0.012, 0.22]} />
          </mesh>
          {/* Perimeter Screws around Pink Plate (matching CAD) */}
          {[
            [-0.14, -0.09],
            [0.14, -0.09],
            [-0.14, 0.09],
            [0.14, 0.09],
            [0, -0.09],
            [0, 0.09],
            [-0.14, 0],
            [0.14, 0]
          ].map(([sx, sz], sIdx) => (
            <mesh
              key={`pink-screw-${sIdx}`}
              castShadow
              material={matChrome}
              position={[sx, 0.007, sz]}
            >
              <cylinderGeometry args={[0.004, 0.004, 0.005, 8]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* 
        ========================================================================
        2. TILT-ROTATING FULCRUM COMPONENTS (ATTACHED TO BOOM)
        ========================================================================
      */}
      <group ref={tiltGroupRef} position={[0, 0, 0]}>
        {/* A. Green Circular Center Pivot Bearing Hub inside Boom */}
        <mesh castShadow material={matGreenPivotHub} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.34, 24]} />
        </mesh>

        {/* C. Left & Right Tilt Arc Sector Flanges & Scale Decals */}
        {[-0.205, 0.205].map((xOffset, sideIdx) => {
          const isLeft = xOffset < 0;
          return (
            <group key={`fulcrum-side-${sideIdx}`} position={[xOffset, 0, 0]}>
              {/* Millimeter/Inch Graduation Scale Decal (10, 14 & Indexing Dots) */}
              <mesh
                position={[0, 0.05, 0]}
                rotation={[0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0]}
              >
                <planeGeometry args={[0.92, 0.23]} />
                <meshBasicMaterial map={scaleTex} transparent side={THREE.DoubleSide} />
              </mesh>

              {/* Curved Tilt Arc Sector Body */}
              <group position={[isLeft ? -0.008 : 0.008, 0.055, 0]}>
                <mesh
                  castShadow
                  receiveShadow
                  material={matBlackTrim}
                  rotation={[0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0]}
                >
                  <boxGeometry args={[0.38, 0.18, 0.016]} />
                </mesh>

                {/* Left Chrome Locking Bolt & Heavy Washer inside Arc Slot */}
                <group position={[0, 0.04, -0.10]}>
                  <mesh
                    castShadow
                    material={matSteelWasher}
                    position={[isLeft ? -0.012 : 0.012, 0, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[0.022, 0.022, 0.006, 16]} />
                  </mesh>
                  <mesh
                    castShadow
                    material={matChrome}
                    position={[isLeft ? -0.018 : 0.018, 0, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[0.012, 0.012, 0.01, 12]} />
                  </mesh>
                </group>

                {/* Right Chrome Locking Bolt & Heavy Washer inside Arc Slot */}
                <group position={[0, 0.04, 0.10]}>
                  <mesh
                    castShadow
                    material={matSteelWasher}
                    position={[isLeft ? -0.012 : 0.012, 0, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[0.022, 0.022, 0.006, 16]} />
                  </mesh>
                  <mesh
                    castShadow
                    material={matChrome}
                    position={[isLeft ? -0.018 : 0.018, 0, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[0.012, 0.012, 0.01, 12]} />
                  </mesh>
                </group>
              </group>

              {/* Central Round Pivot Hub Flange with 4 Chrome Bolts */}
              <group position={[isLeft ? -0.020 : 0.020, 0, 0]}>
                <mesh
                  castShadow
                  receiveShadow
                  material={matBlackTrim}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.075, 0.075, 0.018, 24]} />
                </mesh>
                {[
                  [-0.028, -0.028],
                  [0.028, -0.028],
                  [-0.028, 0.028],
                  [0.028, 0.028]
                ].map(([bz, by], boltIdx) => (
                  <mesh
                    key={`hub-bolt-${sideIdx}-${boltIdx}`}
                    castShadow
                    material={matChrome}
                    position={[isLeft ? -0.011 : 0.011, by, bz]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[0.005, 0.005, 0.008, 10]} />
                  </mesh>
                ))}
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}
