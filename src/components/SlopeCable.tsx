import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';

// --- TYPES ---
export type CableType = 'bundle' | 'flat' | 'heavy' | 'braided';

interface CableParams {
  extension: number; // 0 to 1 (0 = fully retracted, 1 = fully extended)
  maxExtensionMeters: number; // e.g. 8.0 meters
  slopeDeg: number; // inclination angle in degrees (e.g. 20°)
  loopCount: number; // e.g. 6 loops
  sagFactor: number; // multiplier for cable sag (0.5 to 2.0)
  cableType: CableType;
  autoPlay: boolean;
  autoSpeed: number; // cycles per minute
  swayInertia: number;
}

// --- PROCEDURAL TEXTURES ---
function createHazardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#111111';
    ctx.lineWidth = 32;
    for (let i = -256; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 256);
      ctx.lineTo(i + 96, 256);
      ctx.lineTo(i - 32, 0);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createRulerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2b303c';
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    
    // Draw tick marks and numbers
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * 1000 + 12;
      ctx.fillRect(x - 2, 0, 4, 50);
      ctx.fillText(`${i}m`, x, 85);
      
      // Sub ticks
      for (let j = 1; j < 10; j++) {
        const subX = x + (j / 10) * 100;
        if (subX < 1015) {
          const height = j === 5 ? 30 : 18;
          ctx.fillRect(subX - 1, 0, 2, height);
        }
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// --- SINGLE TROLLEY MESH ---
function TrolleyModel({ 
  position, 
  rotationX = 0, 
  isLeadCarriage = false,
  matRailDark,
  matWheelChrome,
  matHazard
}: { 
  position: [number, number, number];
  rotationX?: number;
  isLeadCarriage?: boolean;
  matRailDark: THREE.Material;
  matWheelChrome: THREE.Material;
  matHazard: THREE.Material;
}) {
  const matPhotoBlackGloss = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0e1117,
    roughness: 0.32,
    metalness: 0.4
  }), []);

  const matScrewChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.98,
    roughness: 0.12
  }), []);

  const matBlackRubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.65,
    metalness: 0.12
  }), []);

  return (
    <group position={position} rotation={[rotationX, 0, 0]}>
      {/* 1. Trolley Body / Carriage Frame on I-Beam Flange */}
      <mesh castShadow receiveShadow material={isLeadCarriage ? matHazard : matRailDark} position={[0, 0.08, 0]}>
        <boxGeometry args={[isLeadCarriage ? 0.35 : 0.18, 0.12, 0.22]} />
      </mesh>

      {/* Guide Flange Wheels (4 ball-bearing wheels running on I-beam flange) */}
      <mesh castShadow material={matWheelChrome} position={[-0.06, 0.15, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
      </mesh>
      <mesh castShadow material={matWheelChrome} position={[0.06, 0.15, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
      </mesh>
      <mesh castShadow material={matWheelChrome} position={[-0.06, 0.15, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
      </mesh>
      <mesh castShadow material={matWheelChrome} position={[0.06, 0.15, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
      </mesh>

      {/* Rubber End Bumpers (Puffer) */}
      <mesh castShadow position={[-0.10, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.03, 12]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.10, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.03, 12]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>

      {/* 
        ========================================================================
        2. VERTICAL SLOTTED ANGLE BRACKET (EXAKT WIE AM FOTO!)
        - Base Plate with 4 screws
        - Tall vertical slotted bracket arm (Langloch-Winkel) extending UPWARDS
        - 2 Silver Allen bolts with washers through the vertical slot
        - Top cable clamp saddle at the upper tip
        ========================================================================
      */}
      <group position={[0, 0.14, 0]}>
        {/* Base Mounting Plate on Side of Trolley */}
        <mesh castShadow material={matPhotoBlackGloss} position={[0, 0.04, 0.125]}>
          <boxGeometry args={[0.12, 0.10, 0.012]} />
        </mesh>
        {/* 4 Corner Bolts on Base Plate */}
        {[-0.045, 0.045].map((xOff, xi) =>
          [0.005, 0.075].map((yOff, yi) => (
            <mesh
              key={`slotted-base-bolt-${xi}-${yi}`}
              castShadow
              material={matScrewChrome}
              position={[xOff, yOff, 0.132]}
            >
              <cylinderGeometry args={[0.004, 0.004, 0.004, 8]} />
            </mesh>
          ))
        )}

        {/* Vertical Slotted Angle Bracket (Langloch-Winkel) extending UPWARDS */}
        <group position={[0, 0.18, 0.136]}>
          {/* Upper Solid Bar Section */}
          <mesh castShadow material={matPhotoBlackGloss} position={[0, 0.10, 0]}>
            <boxGeometry args={[0.038, 0.12, 0.008]} />
          </mesh>
          {/* Lower Slotted Side Rails (Left & Right of Langloch) */}
          <mesh castShadow material={matPhotoBlackGloss} position={[-0.013, -0.02, 0]}>
            <boxGeometry args={[0.012, 0.14, 0.008]} />
          </mesh>
          <mesh castShadow material={matPhotoBlackGloss} position={[0.013, -0.02, 0]}>
            <boxGeometry args={[0.012, 0.14, 0.008]} />
          </mesh>
          {/* Bottom Semicircular End Cap */}
          <mesh castShadow material={matPhotoBlackGloss} position={[0, -0.095, 0]}>
            <boxGeometry args={[0.038, 0.018, 0.008]} />
          </mesh>

          {/* 2 Silver Hex Socket Cap Screws through the Vertical Slot with Washers */}
          {/* Lower Fastener Screw & Washer */}
          <group position={[0, -0.06, 0.005]}>
            <mesh castShadow material={matScrewChrome} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.009, 0.009, 0.0025, 14]} />
            </mesh>
            <mesh castShadow material={matScrewChrome} position={[0, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.006, 12]} />
            </mesh>
          </group>
          {/* Upper Fastener Screw & Washer */}
          <group position={[0, -0.005, 0.005]}>
            <mesh castShadow material={matScrewChrome} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.009, 0.009, 0.0025, 14]} />
            </mesh>
            <mesh castShadow material={matScrewChrome} position={[0, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.006, 12]} />
            </mesh>
          </group>

          {/* Top Cable Saddle / Clamp Assembly at Tip */}
          <group position={[0, 0.15, 0]}>
            {/* L-Shaped Top Flange */}
            <mesh castShadow material={matPhotoBlackGloss} position={[0, 0, 0.01]}>
              <boxGeometry args={[0.038, 0.012, 0.02]} />
            </mesh>
            {/* Lower Saddle Cradle */}
            <mesh castShadow material={matPhotoBlackGloss} position={[0, -0.01, 0.022]}>
              <boxGeometry args={[0.042, 0.022, 0.024]} />
            </mesh>
            {/* Rubber Cable Bushing */}
            <mesh castShadow material={matBlackRubber} position={[0, -0.01, 0.022]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.020, 0.006, 10, 16]} />
            </mesh>
            {/* Clamp Retainer Top Cap */}
            <mesh castShadow material={matPhotoBlackGloss} position={[0, 0.008, 0.022]}>
              <boxGeometry args={[0.044, 0.008, 0.026]} />
            </mesh>
            {/* 2x Silver Clamping Screws on top plate */}
            <mesh castShadow material={matScrewChrome} position={[-0.013, 0.014, 0.022]}>
              <cylinderGeometry args={[0.0028, 0.0028, 0.005, 8]} />
            </mesh>
            <mesh castShadow material={matScrewChrome} position={[0.013, 0.014, 0.022]}>
              <cylinderGeometry args={[0.0028, 0.0028, 0.005, 8]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Lead Carriage Details: Motor Drive & Beacon */}
      {isLeadCarriage && (
        <>
          {/* Towing Motor Block */}
          <mesh castShadow material={matRailDark} position={[0.14, 0.18, 0]}>
            <boxGeometry args={[0.18, 0.16, 0.18]} />
          </mesh>
          {/* Warning Beacon */}
          <mesh position={[0.14, 0.29, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.06, 12]} />
            <meshStandardMaterial color="#ff5500" emissive="#ff4400" emissiveIntensity={0.6} roughness={0.2} />
          </mesh>
          {/* Laser Rangefinder */}
          <mesh position={[0.22, 0.08, 0.08]}>
            <boxGeometry args={[0.05, 0.04, 0.04]} />
            <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}

// --- DYNAMIC SLOPED CABLE MESH COMPONENT ---
function DynamicSlopeCableMesh({
  trolleyPositions,
  cableType,
  sagFactor,
  velocity,
  slopeDeg
}: {
  trolleyPositions: THREE.Vector3[];
  cableType: CableType;
  sagFactor: number;
  velocity: number;
  slopeDeg: number;
}) {
  const slopeRad = THREE.MathUtils.degToRad(slopeDeg);

  // Pre-configured materials
  const matBlackRubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.65,
    metalness: 0.12
  }), []);

  const matPhotoBlackGloss = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0e1117,
    roughness: 0.32,
    metalness: 0.4
  }), []);

  const matScrewChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.98,
    roughness: 0.12
  }), []);

  const matFlatCable = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a212d,
    roughness: 0.65,
    metalness: 0.2
  }), []);

  const matCableYellow = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf5b300,
    roughness: 0.4
  }), []);

  const matCableRed = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xee2233,
    roughness: 0.4
  }), []);

  const matCableBlue = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0088ff,
    roughness: 0.4
  }), []);

  const matCableGreen = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.4
  }), []);

  const matBraided = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x3b4252,
    roughness: 0.35,
    metalness: 0.7
  }), []);

  // Compute spline curve points for each loop between adjacent trolleys
  const loopsCurves = useMemo(() => {
    const curves: {
      centerCurve: THREE.CatmullRomCurve3;
      strand1: THREE.CatmullRomCurve3;
      strand2: THREE.CatmullRomCurve3;
      subCurves: THREE.CatmullRomCurve3[];
    }[] = [];

    if (trolleyPositions.length < 2) return curves;

    const nominalArcLength = 1.9; // Total cable length per loop segment
    // Offset from trolley center to top clamp position on vertical slotted bracket
    const topClampYOff = 0.46 * Math.cos(slopeRad);
    const topClampZOff = 0.158;

    for (let i = 0; i < trolleyPositions.length - 1; i++) {
      const p1Base = trolleyPositions[i];
      const p2Base = trolleyPositions[i + 1];
      const spanDist = p1Base.distanceTo(p2Base);

      const p1 = new THREE.Vector3(p1Base.x, p1Base.y + topClampYOff, p1Base.z + topClampZOff);
      const p2 = new THREE.Vector3(p2Base.x, p2Base.y + topClampYOff, p2Base.z + topClampZOff);

      // Catenary Sag Formula:
      // When spanDist is small (bunched up), sag is deep (~nominalArcLength / 2).
      // When spanDist approaches nominalArcLength, sag diminishes towards zero.
      const excess = Math.max(0.08, nominalArcLength - spanDist);
      const baseSag = Math.sqrt(excess * (0.65 * nominalArcLength + 0.18 * spanDist)) * sagFactor;

      // Inertia dynamic sway when moving
      const swayX = Math.sin(i * 1.2 + velocity * 2.0) * (velocity * 0.08);
      const swayZ = -velocity * 0.05 * Math.sin(slopeRad);

      // Generate 26 control points along the loop (matching photo with crown arch and deep hanging U-loop)
      const pointsCount = 26;
      const ctrlPoints: THREE.Vector3[] = [];

      for (let s = 0; s <= pointsCount; s++) {
        const t = s / pointsCount;
        let pt = new THREE.Vector3();

        if (t <= 0.12) {
          // Crown Arch 1: Cable rises and arches outward over Bracket 1's top clamp
          const archU = t / 0.12;
          const archSin = Math.sin(archU * Math.PI);
          const archHeight = 0.065 * archSin * Math.min(1.0, excess / 0.7);
          const archZ = 0.035 * archSin;

          pt.set(p1.x, p1.y + archHeight, p1.z + archZ);
        } else if (t >= 0.88) {
          // Crown Arch 2: Cable arches over Bracket 2's top clamp
          const archU = (t - 0.88) / 0.12;
          const archSin = Math.sin(archU * Math.PI);
          const archHeight = 0.065 * archSin * Math.min(1.0, excess / 0.7);
          const archZ = 0.035 * archSin;

          pt.set(p2.x, p2.y + archHeight, p2.z + archZ);
        } else {
          // Main Hanging Catenary U-Loop between the two brackets
          const loopU = (t - 0.12) / 0.76;
          pt.lerpVectors(p1, p2, loopU);

          const sagSin = Math.sin(loopU * Math.PI);
          const loopSag = baseSag * Math.pow(sagSin, 1.15);

          // Gravity acts in -Y direction (hangs DOWNWARDS)
          pt.y -= loopSag;

          // Outward teardrop flare & dynamic sway
          pt.z += (0.045 * Math.pow(sagSin, 0.85) * Math.min(1.0, excess / 0.7)) + swayZ;
          pt.x += swayX * sagSin;
        }

        ctrlPoints.push(pt);
      }

      const mainCurve = new THREE.CatmullRomCurve3(ctrlPoints, false, 'centripetal');

      // Dual parallel strands for authentic umbilical cables
      const strand1Pts = ctrlPoints.map(p => new THREE.Vector3(p.x - 0.022, p.y, p.z));
      const strand2Pts = ctrlPoints.map(p => new THREE.Vector3(p.x + 0.022, p.y, p.z));

      const strand1 = new THREE.CatmullRomCurve3(strand1Pts, false, 'centripetal');
      const strand2 = new THREE.CatmullRomCurve3(strand2Pts, false, 'centripetal');

      // Sub-curves for multi-strand bundles
      const subCurves: THREE.CatmullRomCurve3[] = [];
      const offsets = [
        [-0.025, 0.015],
        [0.025, 0.015],
        [-0.025, -0.015],
        [0.025, -0.015],
      ];

      offsets.forEach(([offX, offY]) => {
        const subPts = ctrlPoints.map(p => new THREE.Vector3(p.x + offX, p.y + offY, p.z));
        subCurves.push(new THREE.CatmullRomCurve3(subPts, false, 'centripetal'));
      });

      curves.push({
        centerCurve: mainCurve,
        strand1,
        strand2,
        subCurves
      });
    }

    return curves;
  }, [trolleyPositions, sagFactor, velocity, slopeRad]);

  return (
    <group>
      {loopsCurves.map((loop, idx) => {
        if (cableType === 'bundle') {
          // 4-core multi-colored industrial cable harness
          const mats = [matCableYellow, matCableRed, matCableBlue, matCableGreen];
          return (
            <group key={`loop-bundle-${idx}`}>
              {loop.subCurves.map((subC, subIdx) => (
                <mesh key={`strand-${subIdx}`} castShadow receiveShadow material={mats[subIdx]}>
                  <tubeGeometry args={[subC, 56, 0.016, 10, false]} />
                </mesh>
              ))}
              {/* Cable Zip Ties / Bands in center of loop */}
              <mesh position={loop.centerCurve.getPoint(0.5)} castShadow material={matBlackRubber}>
                <boxGeometry args={[0.08, 0.06, 0.03]} />
              </mesh>
            </group>
          );
        } else if (cableType === 'flat') {
          // Flat Festoon Ribbon Cable
          return (
            <group key={`loop-flat-${idx}`}>
              <mesh castShadow receiveShadow material={matFlatCable}>
                <tubeGeometry args={[loop.centerCurve, 64, 0.032, 8, false]} />
              </mesh>
              {/* Secondary flat strand */}
              <mesh castShadow receiveShadow material={matCableYellow} position={[0, 0.035, 0]}>
                <tubeGeometry args={[loop.centerCurve, 64, 0.012, 6, false]} />
              </mesh>
            </group>
          );
        } else if (cableType === 'braided') {
          // Heavy braided steel / flexible conduit
          return (
            <mesh key={`loop-braided-${idx}`} castShadow receiveShadow material={matBraided}>
              <tubeGeometry args={[loop.centerCurve, 64, 0.035, 12, false]} />
            </mesh>
          );
        } else {
          // Authentic Dual-Strand Black Umbilical Cables (matching photo)
          return (
            <group key={`loop-photo-${idx}`}>
              <mesh castShadow receiveShadow material={matBlackRubber}>
                <tubeGeometry args={[loop.strand1, 64, 0.024, 12, false]} />
              </mesh>
              <mesh castShadow receiveShadow material={matBlackRubber}>
                <tubeGeometry args={[loop.strand2, 64, 0.024, 12, false]} />
              </mesh>
              {/* Spacer clamp with silver rivet at bottom apex */}
              <group position={loop.centerCurve.getPoint(0.5)}>
                <mesh castShadow material={matPhotoBlackGloss}>
                  <boxGeometry args={[0.09, 0.05, 0.04]} />
                </mesh>
                <mesh castShadow material={matScrewChrome} position={[0, 0, 0.022]}>
                  <cylinderGeometry args={[0.0035, 0.0035, 0.004, 8]} />
                </mesh>
              </group>
            </group>
          );
        }
      })}
    </group>
  );
}

// --- FULL 3D FESTOON RIG (SLOPED RAIL + TROLLEYS + CABLE) ---
function SlopeCableRig({
  params,
  onTelemetryUpdate
}: {
  params: CableParams;
  onTelemetryUpdate: (telemetry: {
    extensionMeters: number;
    extensionPercent: number;
    totalCableLength: number;
    maxSagDepthCm: number;
    tensionNewtons: number;
    carriageSpeed: number;
    state: string;
  }) => void;
}) {
  const currentExtRef = useRef(params.extension);
  const velocityRef = useRef(0);
  const lastExtRef = useRef(params.extension);
  const cycleTimeRef = useRef(0);

  // Materials for I-Beam Rail & Brackets
  const matGalvanizedRail = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.25
  }), []);

  const matRailDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.35
  }), []);

  const matWheelChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.1
  }), []);

  const matClampYellow = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.5,
    roughness: 0.3
  }), []);

  const hazardTexture = useMemo(() => createHazardTexture(), []);
  const matHazard = useMemo(() => new THREE.MeshStandardMaterial({
    map: hazardTexture,
    roughness: 0.4
  }), [hazardTexture]);

  const rulerTexture = useMemo(() => createRulerTexture(), []);
  const matRuler = useMemo(() => new THREE.MeshStandardMaterial({
    map: rulerTexture,
    roughness: 0.5
  }), [rulerTexture]);

  // Math conversions
  const slopeRad = THREE.MathUtils.degToRad(params.slopeDeg);
  const totalRailLength = params.maxExtensionMeters + 2.5;

  // Rail direction unit vector: starts at Z=0 and moves towards +Z and +Y (or -Y depending on slope)
  const dirY = Math.sin(slopeRad);
  const dirZ = Math.cos(slopeRad);

  // Kinematics & Animation Frame
  useFrame((_, delta) => {
    // Auto-cycle logic if enabled
    if (params.autoPlay) {
      cycleTimeRef.current += delta * (params.autoSpeed / 60) * Math.PI * 2;
      // Smooth sinusoidal extension oscillation
      const targetExt = (Math.sin(cycleTimeRef.current) + 1) / 2;
      currentExtRef.current = THREE.MathUtils.lerp(currentExtRef.current, targetExt, delta * 4);
    } else {
      // Manual slider target interpolation
      currentExtRef.current = THREE.MathUtils.lerp(currentExtRef.current, params.extension, delta * 6);
    }

    const currentExt = currentExtRef.current;
    const instantaneousVel = (currentExt - lastExtRef.current) / (delta || 0.016);
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, instantaneousVel, delta * 5);
    lastExtRef.current = currentExt;

    // Calculate telemetry
    const currentMeters = currentExt * params.maxExtensionMeters;
    const percent = Math.round(currentExt * 100);
    const nominalLoopLength = 1.9;
    const totalCableLen = (params.loopCount * nominalLoopLength) + 1.2;
    
    // Average sag depth calculation
    const avgSpan = (currentMeters + 0.3) / params.loopCount;
    const excess = Math.max(0.05, nominalLoopLength - avgSpan);
    const sagCm = Math.round(Math.sqrt(excess * (0.6 * nominalLoopLength + 0.15 * avgSpan)) * params.sagFactor * 100);
    
    // Tension force: higher when stretched, lower when sagging
    const stretchRatio = Math.min(1, avgSpan / nominalLoopLength);
    const tensionN = Math.round(40 + Math.pow(stretchRatio, 4) * 320);

    let stateStr = 'STATIC';
    if (Math.abs(velocityRef.current) > 0.01) {
      stateStr = velocityRef.current > 0 ? 'EXTENDING (AUSFAHREN)' : 'RETRACTING (EINFAHREN)';
    } else if (currentExt > 0.98) {
      stateStr = 'FULLY EXTENDED (MAX)';
    } else if (currentExt < 0.02) {
      stateStr = 'PARKED / RETRACTED (MIN)';
    }

    onTelemetryUpdate({
      extensionMeters: parseFloat(currentMeters.toFixed(2)),
      extensionPercent: percent,
      totalCableLength: parseFloat(totalCableLen.toFixed(2)),
      maxSagDepthCm: sagCm,
      tensionNewtons: tensionN,
      carriageSpeed: parseFloat((velocityRef.current * params.maxExtensionMeters).toFixed(2)),
      state: stateStr
    });
  });

  // Calculate positions of all trolleys along the rail
  const currentExtMeters = currentExtRef.current * params.maxExtensionMeters;
  const numTrolleys = params.loopCount; // 0 is fixed end, numTrolleys is moving lead carriage
  
  const trolleyPositions = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const minSpacing = 0.18; // Compressed bumper-to-bumper distance
    const totalTravel = Math.max(minSpacing * numTrolleys, currentExtMeters + (minSpacing * numTrolleys));

    for (let i = 0; i <= numTrolleys; i++) {
      // Linear progressive distribution along the rail
      const s = (i / numTrolleys) * totalTravel;
      
      const posX = 0;
      const posY = s * dirY + 2.0; // Start rail at base elevation 2.0m
      const posZ = s * dirZ - (totalRailLength * dirZ * 0.45); // Center visually

      pts.push(new THREE.Vector3(posX, posY, posZ));
    }
    return pts;
  }, [currentExtMeters, numTrolleys, dirY, dirZ, totalRailLength]);

  // Rail start and end points
  const railStart = new THREE.Vector3(0, 2.0, -(totalRailLength * dirZ * 0.45));
  const railEnd = new THREE.Vector3(
    0, 
    2.0 + totalRailLength * dirY, 
    -(totalRailLength * dirZ * 0.45) + totalRailLength * dirZ
  );
  const railCenter = new THREE.Vector3().addVectors(railStart, railEnd).multiplyScalar(0.5);

  return (
    <group>
      {/* --- INDUSTRIAL SLOPED GUIDE RAIL (I-BEAM) --- */}
      <group position={railCenter} rotation={[-slopeRad, 0, 0]}>
        {/* Main Central Web of I-Beam */}
        <mesh castShadow receiveShadow material={matGalvanizedRail} position={[0, 0.15, 0]}>
          <boxGeometry args={[0.04, 0.24, totalRailLength]} />
        </mesh>
        {/* Top Flange of I-Beam */}
        <mesh castShadow receiveShadow material={matGalvanizedRail} position={[0, 0.27, 0]}>
          <boxGeometry args={[0.22, 0.03, totalRailLength]} />
        </mesh>
        {/* Bottom Running Flange of I-Beam (where wheels glide) */}
        <mesh castShadow receiveShadow material={matGalvanizedRail} position={[0, 0.03, 0]}>
          <boxGeometry args={[0.22, 0.03, totalRailLength]} />
        </mesh>
        {/* Metric Scale Strip on Rail Side */}
        <mesh position={[0.115, 0.15, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[totalRailLength, 0.12]} />
          <primitive object={matRuler} attach="material" />
        </mesh>
        {/* Mechanical End-Stops (Pufferböcke) */}
        <mesh castShadow material={matClampYellow} position={[0, 0.15, -totalRailLength / 2 + 0.08]}>
          <boxGeometry args={[0.26, 0.28, 0.12]} />
        </mesh>
        <mesh castShadow material={matClampYellow} position={[0, 0.15, totalRailLength / 2 - 0.08]}>
          <boxGeometry args={[0.26, 0.28, 0.12]} />
        </mesh>
      </group>

      {/* --- SUPPORT PILLARS / MASTS --- */}
      {[-0.4, 0.0, 0.4].map((ratio, pIdx) => {
        const s = totalRailLength * (ratio + 0.5);
        const mastBaseY = 0;
        const mastTopY = 2.0 + s * dirY;
        const mastZ = -(totalRailLength * dirZ * 0.45) + s * dirZ;
        const mastHeight = Math.max(0.5, mastTopY);

        return (
          <group key={`mast-${pIdx}`} position={[0, mastBaseY, mastZ]}>
            {/* Vertical Steel Pillar */}
            <mesh castShadow receiveShadow material={matRailDark} position={[0, mastHeight / 2, 0]}>
              <cylinderGeometry args={[0.09, 0.11, mastHeight, 16]} />
            </mesh>
            {/* Ground Flange & Base Bolts */}
            <mesh castShadow material={matGalvanizedRail} position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.25, 0.28, 0.08, 8]} />
            </mesh>
            {/* Top Swivel Rail Bracket */}
            <mesh castShadow material={matClampYellow} position={[0, mastHeight, 0]}>
              <boxGeometry args={[0.26, 0.16, 0.26]} />
            </mesh>
          </group>
        );
      })}

      {/* --- FIXED BASE JUNCTION BOX (FESTPUNKT-STATION) --- */}
      {trolleyPositions.length > 0 && (
        <group position={[trolleyPositions[0].x, trolleyPositions[0].y, trolleyPositions[0].z]}>
          <mesh castShadow material={matRailDark} position={[-0.25, 0.1, -0.2]}>
            <boxGeometry args={[0.28, 0.35, 0.24]} />
          </mesh>
          <mesh castShadow material={matClampYellow} position={[-0.25, 0.28, -0.2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
          </mesh>
          {/* Infeed Cable Conduit (Zuleitung) */}
          <mesh castShadow position={[-0.25, -0.4, -0.35]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
      )}

      {/* --- TROLLEYS / LEITUNGSWAGEN ALONG THE RAIL --- */}
      {trolleyPositions.map((pos, idx) => {
        const isLead = idx === trolleyPositions.length - 1;
        return (
          <TrolleyModel
            key={`trolley-${idx}`}
            position={[pos.x, pos.y, pos.z]}
            rotationX={-slopeRad}
            isLeadCarriage={isLead}
            matRailDark={matRailDark}
            matWheelChrome={matWheelChrome}
            matHazard={matHazard}
          />
        );
      })}

      {/* --- DYNAMIC CONTINUOUS CABLE LOOPS (SCHLAUFEN) --- */}
      <DynamicSlopeCableMesh
        trolleyPositions={trolleyPositions}
        cableType={params.cableType}
        sagFactor={params.sagFactor}
        velocity={velocityRef.current}
        slopeDeg={params.slopeDeg}
      />
    </group>
  );
}

// --- MAIN EXPORTED COMPONENT ---
export default function SlopeCable() {
  const [params, setParams] = useState<CableParams>({
    extension: 0.35, // Default ~35% extension
    maxExtensionMeters: 8.0,
    slopeDeg: 25.0, // 25 degree slope
    loopCount: 6,
    sagFactor: 1.0,
    cableType: 'bundle',
    autoPlay: false,
    autoSpeed: 12, // cycles/min
    swayInertia: 1.0
  });

  const [telemetry, setTelemetry] = useState({
    extensionMeters: 2.8,
    extensionPercent: 35,
    totalCableLength: 12.6,
    maxSagDepthCm: 68,
    tensionNewtons: 95,
    carriageSpeed: 0.0,
    state: 'STATIC'
  });

  const orbitControlsRef = useRef<any>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') {
        setParams(p => ({ ...p, extension: Math.min(1.0, p.extension + 0.03), autoPlay: false }));
      } else if (key === 's') {
        setParams(p => ({ ...p, extension: Math.max(0.0, p.extension - 0.03), autoPlay: false }));
      } else if (key === 'q') {
        setParams(p => ({ ...p, slopeDeg: Math.min(60, p.slopeDeg + 2) }));
      } else if (key === 'e') {
        setParams(p => ({ ...p, slopeDeg: Math.max(-10, p.slopeDeg - 2) }));
      } else if (key === ' ') {
        e.preventDefault();
        setParams(p => ({ ...p, autoPlay: !p.autoPlay }));
      } else if (key === '1') {
        orbitControlsRef.current?.reset();
        orbitControlsRef.current?.object.position.set(8, 6, 8);
      } else if (key === '2') {
        orbitControlsRef.current?.object.position.set(10, 3, 0);
      } else if (key === '3') {
        orbitControlsRef.current?.object.position.set(2, 2.5, 1.5);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCameraPreset = (preset: 'iso' | 'side' | 'closeup' | 'top') => {
    if (!orbitControlsRef.current) return;
    const ctrl = orbitControlsRef.current;
    if (preset === 'iso') {
      ctrl.object.position.set(9, 6, 9);
      ctrl.target.set(0, 3, 0);
    } else if (preset === 'side') {
      ctrl.object.position.set(11, 3.5, 0);
      ctrl.target.set(0, 3.5, 0);
    } else if (preset === 'closeup') {
      ctrl.object.position.set(1.8, 2.2, 0.8);
      ctrl.target.set(0, 2.0, 0);
    } else if (preset === 'top') {
      ctrl.object.position.set(0, 12, 0.1);
      ctrl.target.set(0, 2, 0);
    }
    ctrl.update();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0a0d14' }}>
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [8.5, 5.5, 8.5], fov: 42 }}
        style={{ width: '100%', height: '100%', outline: 'none' }}
      >
        <color attach="background" args={['#0a0d14']} />
        
        {/* Lights & Studio Reflections */}
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[12, 18, 10]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-10, 8, -10]} intensity={0.5} color="#4477aa" />
        
        <Environment preset="city" />

        {/* Floor Grid with Subtle Depth */}
        <Grid
          infiniteGrid
          fadeDistance={45}
          fadeStrength={1.5}
          sectionColor="#2d3748"
          cellColor="#1a202c"
          sectionSize={2}
          cellSize={0.5}
          position={[0, 0, 0]}
        />

        {/* The 3D Sloped Cable Rig */}
        <SlopeCableRig
          params={params}
          onTelemetryUpdate={setTelemetry}
        />

        {/* Orbit Controls with Damping */}
        <OrbitControls
          ref={orbitControlsRef}
          target={[0, 2.8, 0]}
          enableDamping
          dampingFactor={0.06}
          maxDistance={35}
          minDistance={1.2}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
      </Canvas>

      {/* --- FLOATING 2D CONTROL PANEL (LEFT) --- */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '320px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        background: 'rgba(13, 17, 23, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        color: '#f0f6fc',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        zIndex: 50
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#facc15', letterSpacing: '-0.02em' }}>
              ⚡ Schleppkabel Simulator
            </h2>
            <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>
              Sloped Cable Festoon Kinematics
            </div>
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '4px',
            background: params.autoPlay ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
            color: params.autoPlay ? '#4ade80' : '#facc15',
            border: `1px solid ${params.autoPlay ? '#22c55e' : '#eab308'}`
          }}>
            {params.autoPlay ? 'AUTO-CYCLE' : 'MANUELL'}
          </span>
        </div>

        {/* Primary Extension Slider */}
        <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600, color: '#e6edf3' }}>Auszug (Aus-/Einfahren)</span>
            <span style={{ color: '#facc15', fontWeight: 700, fontFamily: 'monospace' }}>
              {telemetry.extensionMeters} m ({telemetry.extensionPercent}%)
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={params.extension}
            disabled={params.autoPlay}
            onChange={(e) => setParams(p => ({ ...p, extension: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: '#facc15', cursor: params.autoPlay ? 'not-allowed' : 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <button
              onClick={() => setParams(p => ({ ...p, extension: 0.0, autoPlay: false }))}
              style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer' }}
            >
              0% (Parken)
            </button>
            <button
              onClick={() => setParams(p => ({ ...p, extension: 0.5, autoPlay: false }))}
              style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer' }}
            >
              50%
            </button>
            <button
              onClick={() => setParams(p => ({ ...p, extension: 1.0, autoPlay: false }))}
              style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer' }}
            >
              100% (Voll)
            </button>
          </div>
        </div>

        {/* Auto Play Mode */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setParams(p => ({ ...p, autoPlay: !p.autoPlay }))}
            style={{
              width: '100%',
              padding: '10px',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: params.autoPlay ? '#ef4444' : '#22c55e',
              color: '#ffffff',
              boxShadow: params.autoPlay ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(34, 197, 94, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {params.autoPlay ? '⏹ Auto-Zyklus Stoppen' : '▶ Automatisches Aus- & Einfahren Starten'}
          </button>
        </div>

        {/* Slope Inclination Slider */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: '#8b949e' }}>Neigungswinkel (Slope)</span>
            <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>{params.slopeDeg}°</span>
          </div>
          <input
            type="range"
            min="-10"
            max="60"
            step="1"
            value={params.slopeDeg}
            onChange={(e) => setParams(p => ({ ...p, slopeDeg: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
          />
        </div>

        {/* Loop Count Selector */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: '#8b949e' }}>Schlaufenanzahl (Loops)</span>
            <span style={{ color: '#facc15', fontWeight: 600, fontFamily: 'monospace' }}>{params.loopCount} Schlaufen</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {[4, 6, 8, 10].map(cnt => (
              <button
                key={`cnt-${cnt}`}
                onClick={() => setParams(p => ({ ...p, loopCount: cnt }))}
                style={{
                  padding: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: `1px solid ${params.loopCount === cnt ? '#facc15' : 'rgba(255,255,255,0.1)'}`,
                  background: params.loopCount === cnt ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: params.loopCount === cnt ? '#facc15' : '#c9d1d9',
                  cursor: 'pointer'
                }}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>

        {/* Cable Type Selector */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>Kabeltyp / Querschnitt</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { id: 'bundle', label: '🌈 4-Ader Bündel' },
              { id: 'flat', label: '📏 Flachkabel' },
              { id: 'heavy', label: '⬛ Gummi Starkstrom' },
              { id: 'braided', label: '⛓️ Stahlflex / Schirm' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setParams(p => ({ ...p, cableType: type.id as CableType }))}
                style={{
                  padding: '6px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderRadius: '4px',
                  border: `1px solid ${params.cableType === type.id ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                  background: params.cableType === type.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: params.cableType === type.id ? '#38bdf8' : '#8b949e',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sag Multiplier Slider */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: '#8b949e' }}>Schwerkraft / Durchhang (Sag)</span>
            <span style={{ color: '#a78bfa', fontWeight: 600, fontFamily: 'monospace' }}>{(params.sagFactor * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="1.8"
            step="0.05"
            value={params.sagFactor}
            onChange={(e) => setParams(p => ({ ...p, sagFactor: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }}
          />
        </div>

        {/* Camera Views Quick Selector */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px', marginTop: '12px' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '6px' }}>🎥 Kamera-Perspektiven</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            <button onClick={() => handleCameraPreset('iso')} style={{ padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer' }}>Isometrisch</button>
            <button onClick={() => handleCameraPreset('side')} style={{ padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer' }}>Profil</button>
            <button onClick={() => handleCameraPreset('closeup')} style={{ padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer' }}>Detail</button>
            <button onClick={() => handleCameraPreset('top')} style={{ padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer' }}>Draufsicht</button>
          </div>
        </div>
      </div>

      {/* --- TELEMETRY & STATUS HUD (TOP RIGHT) --- */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '290px',
        background: 'rgba(13, 17, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        color: '#ffffff',
        padding: '18px',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        zIndex: 50,
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.1em', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>
            Live Telemetrie
          </span>
          <span style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            fontWeight: 700
          }}>
            {telemetry.state}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderLeft: '3px solid #facc15', paddingLeft: '8px' }}>
            <span style={{ color: '#8b949e' }}>Auszugsweg:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#facc15' }}>{telemetry.extensionMeters} m / 8.00 m</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderLeft: '3px solid #38bdf8', paddingLeft: '8px' }}>
            <span style={{ color: '#8b949e' }}>Kabel Gesamtlänge:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e6edf3' }}>{telemetry.totalCableLength} m</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderLeft: '3px solid #a78bfa', paddingLeft: '8px' }}>
            <span style={{ color: '#8b949e' }}>Max. Durchhang (Sag):</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#a78bfa' }}>{telemetry.maxSagDepthCm} cm</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderLeft: '3px solid #ec4899', paddingLeft: '8px' }}>
            <span style={{ color: '#8b949e' }}>Zugkraft / Tension:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#ec4899' }}>{telemetry.tensionNewtons} N</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderLeft: '3px solid #22c55e', paddingLeft: '8px' }}>
            <span style={{ color: '#8b949e' }}>Geschwindigkeit:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#4ade80' }}>{telemetry.carriageSpeed} m/s</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderLeft: '3px solid #64748b', paddingLeft: '8px' }}>
            <span style={{ color: '#8b949e' }}>Schienenneigung:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#cbd5e1' }}>{params.slopeDeg.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      {/* --- HOTKEY GUIDE (BOTTOM RIGHT) --- */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(13, 17, 23, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#8b949e',
        fontSize: '11px',
        fontFamily: 'Inter, system-ui, sans-serif',
        zIndex: 40,
        pointerEvents: 'none'
      }}>
        <div style={{ fontWeight: 600, color: '#e6edf3', marginBottom: '6px' }}>⌨️ Tastatur-Steuerung:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
          <strong style={{ color: '#facc15' }}>W / S</strong> <span>Ausfahren / Einfahren</span>
          <strong style={{ color: '#38bdf8' }}>Q / E</strong> <span>Neigungswinkel anpassen</span>
          <strong style={{ color: '#22c55e' }}>Leertaste</strong> <span>Auto-Zyklus Start/Stopp</span>
          <strong style={{ color: '#c9d1d9' }}>1 - 3</strong> <span>Kamera-Blickwinkel wechseln</span>
        </div>
      </div>
    </div>
  );
}
