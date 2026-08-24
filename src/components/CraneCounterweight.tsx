import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';

interface CraneCounterweightProps {
  crane: Supertechno50FBXModel | null;
  kinematics?: {
    teleExtension?: number;
    boomTilt?: number;
    basePan?: number;
    dollyTrack?: number;
    [key: string]: any;
  };
  kinematicsRef?: React.MutableRefObject<{
    teleExtension?: number;
    boomTilt?: number;
    basePan?: number;
    dollyTrack?: number;
    [key: string]: any;
  }>;
  visible?: boolean;
}

// Procedural texture for the chalk hand-written serial markings ("19 150" and "20 1/2") as seen in the photos
function createChalkTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    // Chalk white hand-written style
    ctx.fillStyle = 'rgba(240, 245, 255, 0.88)';
    ctx.font = 'bold 44px "Brush Script MT", "Caveat", "Comic Sans MS", cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Slight chalk blur & rotation
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 4;
    ctx.fillText(text, 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural texture for the ruler scale markings (10' - 50' feet)
function createScaleRulerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#141820';
    ctx.fillRect(0, 0, 1024, 48);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < 150; i++) {
      ctx.fillRect(Math.random() * 1024, 0, Math.random() * 4 + 1, 48);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const feetMarkers = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 44, 48, 50];
    const totalCount = feetMarkers.length;

    for (let i = 0; i < totalCount; i++) {
      const x = 40 + (i / (totalCount - 1)) * (1024 - 80);
      const val = feetMarkers[i];
      const isPivot = val === 18;

      ctx.fillStyle = isPivot ? '#ef4444' : '#facc15';
      ctx.fillRect(x - 2, 0, isPivot ? 5 : 4, isPivot ? 22 : 16);

      if (i < totalCount - 1) {
        const nextX = 40 + ((i + 1) / (totalCount - 1)) * (1024 - 80);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect((x + nextX) / 2 - 1, 0, 2, 10);
      }

      ctx.fillStyle = isPivot ? '#facc15' : '#ffffff';
      ctx.fillText(`${val}'`, x, 32);
    }

    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 46, 1024, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural texture for the "SUPERTECHNO 50 PLUS" rear boom side logo
function createRearBoomLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 1024, 128);

    ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
    ctx.fillRect(0, 0, 1024, 128);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 1024; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 40, 128);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 1004, 108);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 56px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUPERTECHNO 50 PLUS', 512, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Single Counterweight Side Assembly (links oder rechts)
// Renders the Carrier Backplate, the Horizontal "Nase", the 15 Slotted Plates, and Outer Clamp Plate
function CounterweightSideModule({
  side, // -1 for left, +1 for right
  matPlateA,
  matPlateB,
  matPlateDark,
  matBackplate,
  matNaseBlack,
  matClampPlate,
  matChromeBolt,
  matChalkDecal
}: {
  side: number;
  matPlateA: THREE.Material;
  matPlateB: THREE.Material;
  matPlateDark: THREE.Material;
  matBackplate: THREE.Material;
  matNaseBlack: THREE.Material;
  matClampPlate: THREE.Material;
  matChromeBolt: THREE.Material;
  matChalkDecal: THREE.Material;
}) {
  const plateCount = 15;
  const plateThickness = 0.0105;
  const plateHeight = 0.48;
  const plateDepth = 0.28;
  const naseY = 0.16; // Height of the horizontal Nase
  const naseZ = 0.03; // Z offset of the Nase
  const naseHeight = 0.052;
  const naseDepth = 0.12;

  // Inner backplate X position
  const backplateX = side * 0.275;
  const backplateThickness = 0.018;

  // Stack start X
  const stackStartX = side * (0.275 + backplateThickness / 2 + 0.004);

  // Total stack width
  const totalStackWidth = plateCount * plateThickness;
  const outerClampX = stackStartX + side * (totalStackWidth + 0.01);

  return (
    <group>
      {/* 
        1. INNER CARRIER BACKPLATE (Trägerplatte / Halterung)
        Tall steel plate with hand-written chalk text ("19 150" or "20 1/2")
      */}
      <group position={[backplateX, 0.06, 0]}>
        <mesh castShadow receiveShadow material={matBackplate}>
          <boxGeometry args={[backplateThickness, 0.58, 0.46]} />
        </mesh>

        {/* Chalk Decal on Backplate */}
        <mesh
          position={[side * (backplateThickness / 2 + 0.001), -0.04, -0.08]}
          rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          material={matChalkDecal}
        >
          <planeGeometry args={[0.22, 0.22]} />
        </mesh>
      </group>

      {/* 
        2. GEWICHTSAUFNAHME ("NASE" / HORIZONTAL SUPPORT BAR)
        Heavy black rectangular steel tongue extending horizontally out from the carrier
        through the top notch of all weight plates and protruding past the outer clamp!
      */}
      <group position={[0, naseY, naseZ]}>
        {/* The Black Support Horn / Tongue */}
        <mesh
          castShadow
          material={matNaseBlack}
          position={[
            (backplateX + outerClampX + side * 0.05) / 2,
            0,
            0
          ]}
        >
          <boxGeometry args={[Math.abs(outerClampX - backplateX) + 0.10, naseHeight, naseDepth]} />
        </mesh>

        {/* Protruding Front Tip of the Nase with slight bevel / chamfer */}
        <mesh
          castShadow
          material={matNaseBlack}
          position={[outerClampX + side * 0.045, 0, 0]}
        >
          <boxGeometry args={[0.04, naseHeight - 0.004, naseDepth - 0.004]} />
        </mesh>
      </group>

      {/* 
        3. STACK OF 15 INDIVIDUAL SLOTTED WEIGHT PLATES (GEWICHTSPLATTEN)
        Each plate is suspended onto the horizontal Nase with upper and lower segments
      */}
      {Array.from({ length: plateCount }).map((_, pIdx) => {
        const pX = stackStartX + side * (pIdx * plateThickness + plateThickness / 2);
        const isDark = pIdx === 9 || pIdx === 10;
        const mat = isDark ? matPlateDark : (pIdx % 2 === 0 ? matPlateA : matPlateB);

        return (
          <group key={`plate-slice-${pIdx}`} position={[pX, 0.06, 0]}>
            {/* Lower Main Plate Body (below the Nase) */}
            <mesh castShadow receiveShadow material={mat} position={[0, -0.08, 0]}>
              <boxGeometry args={[plateThickness - 0.001, plateHeight - 0.16, plateDepth]} />
            </mesh>

            {/* Upper Rear Plate Horn (behind the Nase) */}
            <mesh castShadow material={mat} position={[0, naseY - 0.06 + 0.08, -0.07]}>
              <boxGeometry args={[plateThickness - 0.001, 0.14, plateDepth - naseDepth]} />
            </mesh>

            {/* Upper Front Plate Lip (in front of the Nase) */}
            <mesh castShadow material={mat} position={[0, naseY - 0.06 + 0.08, 0.10]}>
              <boxGeometry args={[plateThickness - 0.001, 0.14, 0.05]} />
            </mesh>

            {/* Top Connecting Bridge over the Nase */}
            <mesh castShadow material={mat} position={[0, naseY - 0.06 + 0.14, 0]}>
              <boxGeometry args={[plateThickness - 0.001, 0.028, plateDepth]} />
            </mesh>
          </group>
        );
      })}

      {/* 
        4. OUTER RETAINING CLAMP PLATE (ÄUSSERE DRUCKPLATTE / KLEMMBACKE)
        Heavy plate with rectangular notch for the Nase and central clamping bolt
      */}
      <group position={[outerClampX, 0.06, 0]}>
        {/* Main Lower Clamp Body */}
        <mesh castShadow receiveShadow material={matClampPlate} position={[0, -0.06, 0]}>
          <boxGeometry args={[0.02, plateHeight - 0.14, plateDepth - 0.04]} />
        </mesh>

        {/* Upper Side Cheeks around the Nase cutout */}
        <mesh castShadow material={matClampPlate} position={[0, naseY - 0.06, -0.07]}>
          <boxGeometry args={[0.02, naseHeight + 0.02, plateDepth - naseDepth - 0.04]} />
        </mesh>

        <mesh castShadow material={matClampPlate} position={[0, naseY - 0.06, 0.09]}>
          <boxGeometry args={[0.02, naseHeight + 0.02, 0.04]} />
        </mesh>

        {/* Top Clamp Bar above the Nase */}
        <mesh castShadow material={matClampPlate} position={[0, naseY - 0.06 + naseHeight / 2 + 0.035, 0]}>
          <boxGeometry args={[0.02, 0.05, plateDepth - 0.04]} />
        </mesh>

        {/* Heavy Chrome Clamping Hex Bolt & Washer in the center of the clamp */}
        <group position={[side * 0.015, -0.04, 0]} rotation={[0, 0, side > 0 ? Math.PI / 2 : -Math.PI / 2]}>
          {/* Hex Bolt Head */}
          <mesh castShadow material={matChromeBolt}>
            <cylinderGeometry args={[0.018, 0.018, 0.016, 6]} />
          </mesh>
          {/* Steel Washer */}
          <mesh castShadow material={matBackplate} position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.005, 16]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function CraneCounterweight({
  crane,
  kinematics,
  kinematicsRef,
  visible = true
}: CraneCounterweightProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sledGroupRef = useRef<THREE.Group>(null);

  // Textures
  const rulerTex = useMemo(() => createScaleRulerTexture(), []);
  const logoTex = useMemo(() => createRearBoomLogoTexture(), []);
  const chalkLeftTex = useMemo(() => createChalkTexture('19 150'), []);
  const chalkRightTex = useMemo(() => createChalkTexture('20 1/2'), []);

  // Materials matching reference photos (exact PBR match to Supertechno 50 Plus)
  const matDarkChassis = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x15181e,
    roughness: 0.55,
    metalness: 0.85
  }), []);

  const matSteelRail = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x8a929e,
    roughness: 0.22,
    metalness: 0.95
  }), []);

  // Galvanized / raw steel plate materials matching photo 1 & 2
  const matPlateA = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xa8b2bf,
    roughness: 0.38,
    metalness: 0.88
  }), []);

  const matPlateB = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x939ea9,
    roughness: 0.44,
    metalness: 0.86
  }), []);

  const matPlateDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x47515c,
    roughness: 0.48,
    metalness: 0.82
  }), []);

  const matBackplate = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x6e7883,
    roughness: 0.52,
    metalness: 0.80
  }), []);

  const matNaseBlack = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x181b20,
    roughness: 0.42,
    metalness: 0.90
  }), []);

  const matClampPlate = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x7a848f,
    roughness: 0.45,
    metalness: 0.82
  }), []);

  const matChromeBolt = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.15,
    metalness: 0.98
  }), []);

  const matYellowAccent = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.35,
    metalness: 0.5
  }), []);

  const matRubberBlack = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f1115,
    roughness: 0.92,
    metalness: 0.08
  }), []);

  const matTensionCable = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x2d3748,
    roughness: 0.3,
    metalness: 0.85
  }), []);

  const matRulerDecal = useMemo(() => new THREE.MeshStandardMaterial({
    map: rulerTex,
    roughness: 0.4,
    metalness: 0.6
  }), [rulerTex]);

  const matLogoDecal = useMemo(() => new THREE.MeshStandardMaterial({
    map: logoTex,
    roughness: 0.3,
    metalness: 0.7,
    transparent: true
  }), [logoTex]);

  const matChalkLeft = useMemo(() => new THREE.MeshStandardMaterial({
    map: chalkLeftTex,
    transparent: true,
    roughness: 0.5
  }), [chalkLeftTex]);

  const matChalkRight = useMemo(() => new THREE.MeshStandardMaterial({
    map: chalkRightTex,
    transparent: true,
    roughness: 0.5
  }), [chalkRightTex]);

// ⚡ ZERO-GC SCRATCH OBJECTS FOR REALTIME FRAME LOOPS
const _cwBeamWorldPos = new THREE.Vector3();
const _cwBeamWorldQuat = new THREE.Quaternion();

  // Synchronize Group Position & Rotation to crane.nodes.beams in real-time
  useFrame(() => {
    if (!groupRef.current || !crane || !crane.isLoaded || !crane.nodes.beams) return;
    const beamNode = crane.nodes.beams;
    beamNode.updateWorldMatrix(true, false);

    beamNode.getWorldPosition(_cwBeamWorldPos);
    beamNode.getWorldQuaternion(_cwBeamWorldQuat);

    groupRef.current.position.copy(_cwBeamWorldPos);
    groupRef.current.quaternion.copy(_cwBeamWorldQuat);

    // Dynamic Sled Motion across the pivot:
    // When boom is retracted (ext = 0m): U-Sled moves FORWARD OVER THE PIVOT to z = -0.80m
    // When boom is fully extended (ext = 11.4m): U-Sled moves to rear end stop at z = +3.28m
    if (sledGroupRef.current) {
      const extVal = kinematicsRef?.current?.teleExtension ?? kinematics?.teleExtension ?? 0;
      const ext = Math.max(0, Math.min(11.4, extVal));
      const t = ext / 11.4;
      const zPos = THREE.MathUtils.lerp(-0.80, 3.28, t);
      sledGroupRef.current.position.z = zPos;
    }
  });

  if (!visible) return null;

  const railStartZ = -1.08;
  const railEndZ = 3.48;
  const railLength = railEndZ - railStartZ;
  const railMidZ = (railStartZ + railEndZ) / 2;

  return (
    <group ref={groupRef}>
      {/* 
        ========================================================================
        1. SCALE RULER BAR & LOGO ALONG THE BOOM FLANKS
        ========================================================================
      */}
      <group position={[0, 0, 0]}>
        {/* Left Flank Scale Ruler (10' - 50') */}
        <mesh castShadow material={matRulerDecal} position={[-0.264, 0.22, railMidZ]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[railLength, 0.07]} />
        </mesh>
        {/* Right Flank Scale Ruler */}
        <mesh castShadow material={matRulerDecal} position={[0.264, 0.22, railMidZ]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[railLength, 0.07]} />
        </mesh>

        {/* Left Flank "SUPERTECHNO 50 PLUS" Logo Badge */}
        <mesh material={matLogoDecal} position={[-0.265, 0.07, 1.9]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.9, 0.22]} />
        </mesh>
        {/* Right Flank Logo Badge */}
        <mesh material={matLogoDecal} position={[0.265, 0.07, 1.9]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.9, 0.22]} />
        </mesh>

        {/* Continuous Longitudinal Guide Rails across the entire track */}
        <mesh castShadow material={matSteelRail} position={[-0.18, 0.295, railMidZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, railLength, 16]} />
        </mesh>
        <mesh castShadow material={matSteelRail} position={[0.18, 0.295, railMidZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, railLength, 16]} />
        </mesh>

        {/* Continuous Drive Timing Cable / Steel Wire Rope along the top */}
        <mesh castShadow material={matTensionCable} position={[0, 0.38, railMidZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, railLength + 0.1, 12]} />
        </mesh>

        {/* FRONT BRACKET STATION (Ahead of Drehpunkt at z = -1.08m) */}
        <group position={[0, 0, railStartZ]}>
          <mesh castShadow material={matDarkChassis} position={[0, 0.32, 0]}>
            <boxGeometry args={[0.54, 0.10, 0.06]} />
          </mesh>
          <mesh castShadow material={matDarkChassis} position={[-0.27, 0.18, 0]}>
            <boxGeometry args={[0.03, 0.28, 0.06]} />
          </mesh>
          <mesh castShadow material={matDarkChassis} position={[0.27, 0.18, 0]}>
            <boxGeometry args={[0.03, 0.28, 0.06]} />
          </mesh>

          {/* Front Tension Pulley Wheel */}
          <group position={[0, 0.38, -0.04]}>
            <mesh castShadow material={matChromeBolt} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.03, 20]} />
            </mesh>
            <mesh castShadow material={matDarkChassis} position={[0, -0.03, 0]}>
              <boxGeometry args={[0.06, 0.06, 0.04]} />
            </mesh>
          </group>

          {/* Front Rubber End Bumper */}
          <mesh castShadow material={matRubberBlack} position={[0, 0.295, 0.04]}>
            <boxGeometry args={[0.42, 0.04, 0.04]} />
          </mesh>
        </group>

        {/* REAR TENSION PULLEY & BUMPER (at rear end z = 3.48m) */}
        <group position={[0, 0.38, railEndZ + 0.04]}>
          <mesh castShadow material={matChromeBolt} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.03, 20]} />
          </mesh>
          <mesh castShadow material={matDarkChassis} position={[0, -0.03, 0]}>
            <boxGeometry args={[0.07, 0.07, 0.05]} />
          </mesh>
          <mesh castShadow material={matYellowAccent} position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.04, 12]} />
          </mesh>
        </group>

        {/* Rear Rubber End Bumper */}
        <mesh castShadow material={matRubberBlack} position={[0, 0.295, railEndZ - 0.02]}>
          <boxGeometry args={[0.42, 0.04, 0.04]} />
        </mesh>
      </group>

      {/* 
        ========================================================================
        2. DYNAMIC REALISTIC COUNTERWEIGHT CARRIAGE WITH "NASE" (GEGENGEWICHTSAUFNAHME)
        Matching reference photos: left and right plate stacks, horizontal Nase, and chalk markings
        ========================================================================
      */}
      <group ref={sledGroupRef} position={[0, 0, -0.80]}>
        {/* 
          TOP STRUCTURAL U-BRIDGE & GUIDE RUNNERS
          Connects the left and right carrier assemblies over the top of the boom
        */}
        <group position={[0, 0.32, 0]}>
          {/* Main heavy structural top crossmember */}
          <mesh castShadow material={matDarkChassis} position={[0, 0.01, 0]}>
            <boxGeometry args={[0.58, 0.04, 0.38]} />
          </mesh>

          {/* Stainless-Steel Top Roller Wheels (Laufrollen) riding on the top rails (as seen at "121") */}
          {[-0.18, 0.18].map((rx, rIdx) => (
            <group key={`top-roller-${rIdx}`} position={[rx, -0.02, 0]}>
              <mesh castShadow material={matChromeBolt} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.028, 0.028, 0.032, 20]} />
              </mesh>
              <mesh castShadow material={matDarkChassis} position={[0, 0.03, 0]}>
                <boxGeometry args={[0.04, 0.04, 0.06]} />
              </mesh>
            </group>
          ))}

          {/* Overhead Safety Tube Loop */}
          <mesh castShadow material={matDarkChassis} position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.014, 0.014, 0.52, 16]} />
          </mesh>
          <mesh castShadow material={matDarkChassis} position={[-0.25, 0.07, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.14, 16]} />
          </mesh>
          <mesh castShadow material={matDarkChassis} position={[0.25, 0.07, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.14, 16]} />
          </mesh>
        </group>

        {/* 
          LEFT COUNTERWEIGHT MODULE (Linke Seite mit Nase, 15 Platten & "19 150")
        */}
        <CounterweightSideModule
          side={-1}
          matPlateA={matPlateA}
          matPlateB={matPlateB}
          matPlateDark={matPlateDark}
          matBackplate={matBackplate}
          matNaseBlack={matNaseBlack}
          matClampPlate={matClampPlate}
          matChromeBolt={matChromeBolt}
          matChalkDecal={matChalkLeft}
        />

        {/* 
          RIGHT COUNTERWEIGHT MODULE (Rechte Seite mit Nase, 15 Platten & "20 1/2")
        */}
        <CounterweightSideModule
          side={1}
          matPlateA={matPlateA}
          matPlateB={matPlateB}
          matPlateDark={matPlateDark}
          matBackplate={matBackplate}
          matNaseBlack={matNaseBlack}
          matClampPlate={matClampPlate}
          matChromeBolt={matChromeBolt}
          matChalkDecal={matChalkRight}
        />
      </group>

      {/* 
        ========================================================================
        3. REAR SAFETY CAGE & GRAB RAILS (HINTERER SCHUTZBÜGEL & TRITTE)
        Realistic, compact protective frame matching SuperTechno 50 Plus rear girder
        ========================================================================
      */}
      <group position={[0, 0, 3.58]}>
        <mesh castShadow material={matDarkChassis} position={[0, 0.0, -0.02]}>
          <boxGeometry args={[0.48, 0.54, 0.03]} />
        </mesh>

        {/* 🌟 PROMINENTER HECK-HENKEL / STEUER- & HALTEBÜGEL FÜR DEN OPERATOR (UNTEN & OBEN) */}
        {/* Upper Protection Handlebar */}
        <mesh castShadow material={matDarkChassis} position={[0, 0.32, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.44, 16]} />
        </mesh>
        <mesh castShadow material={matDarkChassis} position={[-0.22, 0.32, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.16, 16]} />
        </mesh>
        <mesh castShadow material={matDarkChassis} position={[0.22, 0.32, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.16, 16]} />
        </mesh>

        {/* 🌟 UNTERER HAUPT-HALTEBÜGEL (GRIFF AUF HÜFT-/BRUSTHÖHE) */}
        <mesh castShadow material={matDarkChassis} position={[0, -0.16, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.44, 16]} />
        </mesh>
        <mesh castShadow material={matDarkChassis} position={[-0.22, -0.16, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.16, 16]} />
        </mesh>
        <mesh castShadow material={matDarkChassis} position={[0.22, -0.16, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.16, 16]} />
        </mesh>
        {/* Flange Mounts to Girder */}
        <mesh castShadow material={matChromeBolt} position={[-0.22, -0.16, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.012, 16]} />
        </mesh>
        <mesh castShadow material={matChromeBolt} position={[0.22, -0.16, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.012, 16]} />
        </mesh>

        {/* Ergonomic Rubberized Hand Grips on Lower Handlebar (Left & Right) */}
        <mesh castShadow material={matRubberBlack} position={[-0.16, -0.16, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.021, 0.021, 0.11, 16]} />
        </mesh>
        <mesh castShadow material={matRubberBlack} position={[0.16, -0.16, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.021, 0.021, 0.11, 16]} />
        </mesh>

        {/* Compact Cine Control Box Mounted in Center of Lower Handlebar */}
        <group position={[0, -0.16, 0.16]}>
          <mesh castShadow material={matDarkChassis} position={[0, 0.02, -0.01]}>
            <boxGeometry args={[0.12, 0.06, 0.04]} />
          </mesh>
          {/* Red E-Stop Mushroom Button */}
          <mesh castShadow position={[-0.035, 0.055, -0.01]}>
            <cylinderGeometry args={[0.014, 0.012, 0.015, 16]} />
            <meshStandardMaterial color="#dc2626" roughness={0.3} />
          </mesh>
          {/* Amber Telescopic Rocker Switch */}
          <mesh position={[0.035, 0.052, -0.01]} rotation={[0, 0, ((((kinematicsRef?.current?.teleExtension ?? kinematics?.teleExtension ?? 0) / 11.3) - 0.5) * 0.6)]}>
            <boxGeometry args={[0.018, 0.012, 0.022]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>

        {/* Dual Vertical Side Tubes conforming closely to the rear boom height */}
        <mesh castShadow material={matDarkChassis} position={[-0.22, 0.0, 0.16]}>
          <cylinderGeometry args={[0.018, 0.018, 0.64, 16]} />
        </mesh>
        <mesh castShadow material={matDarkChassis} position={[0.22, 0.0, 0.16]}>
          <cylinderGeometry args={[0.018, 0.018, 0.64, 16]} />
        </mesh>

        {/* Bottom Connecting Rung / Footstep Loop (conforming to lower girder edge at y = -0.32m) */}
        <mesh castShadow material={matDarkChassis} position={[0, -0.32, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.44, 16]} />
        </mesh>

        {/* Middle Crossbar */}
        <mesh castShadow material={matDarkChassis} position={[0, 0.08, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, 0.44, 16]} />
        </mesh>
      </group>

      {/* 
        ========================================================================
        4. SIDE OPERATOR GRAB RAILS
        ========================================================================
      */}
      <group position={[0, 0.0, 0]}>
        <mesh castShadow material={matDarkChassis} position={[-0.34, -0.16, railMidZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, railLength + 0.2, 12]} />
        </mesh>
        {[-1.0, 0.0, 1.2, 2.4, 3.4].map((sz, sIdx) => (
          <mesh key={`lh-stanchion-${sIdx}`} castShadow material={matDarkChassis} position={[-0.30, -0.16, sz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.08, 12]} />
          </mesh>
        ))}

        <mesh castShadow material={matDarkChassis} position={[0.34, -0.16, railMidZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, railLength + 0.2, 12]} />
        </mesh>
        {[-1.0, 0.0, 1.2, 2.4, 3.4].map((sz, sIdx) => (
          <mesh key={`rh-stanchion-${sIdx}`} castShadow material={matDarkChassis} position={[0.30, -0.16, sz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.08, 12]} />
          </mesh>
        ))}
      </group>

      {/* 
        ========================================================================
        5. UNDERSLUNG ELECTRONICS & CONNECTOR BAY
        ========================================================================
      */}
      <group position={[0, -0.32, 2.1]}>
        <mesh castShadow receiveShadow material={matDarkChassis}>
          <boxGeometry args={[0.38, 0.12, 1.6]} />
        </mesh>

        {[-0.5, -0.2, 0.1, 0.4].map((cz, cIdx) => (
          <group key={`conn-bay-${cIdx}`} position={[-0.20, -0.01, cz]}>
            <mesh castShadow material={matChromeBolt} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.024, 0.024, 0.02, 16]} />
            </mesh>
            <mesh castShadow material={cIdx === 0 ? matYellowAccent : matDarkChassis} position={[-0.015, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.05, 0.05, 0.01]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
