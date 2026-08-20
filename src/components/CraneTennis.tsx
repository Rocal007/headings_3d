import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';
import RemoteCameraHead from './RemoteCameraHead';

export type CourtSurface = 'clay' | 'grass' | 'hardcourt' | 'cyber';
export type TennisCameraMode = 'broadcast' | 'ball' | 'crane1' | 'crane2' | 'umpire' | 'spectator' | 'coach' | 'free';

interface RallyShot {
  shooter: 1 | 2;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  bouncePos: THREE.Vector3;
  duration: number;
  progress: number;
  netHeight: number;
  shotType: string;
  strokeSide: 'forehand' | 'backhand' | 'serve';
  speedKmh: number;
  hasBounced: boolean;
  isDecisive: boolean;
  isServe: boolean;
  servePhase: number;
  endReason?: string;
  pointWinner?: 1 | 2;
}

interface MatchScore {
  p1Points: number;
  p2Points: number;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  server: 1 | 2;
  lastMessage: string;
  umpireCall: string;
  rallyCount: number;
  isCheering: boolean;
  cheerIntensity: number;
}

// --- 🛤️ HEAVY-DUTY DOLLY SCHIENEN / TRACKS (ENTLANG DER GRUNDLINIE) ---
function CraneDollyRailTrack({
  zPos,
  trackLength = 17.0,
  teamColor = '#38bdf8'
}: {
  zPos: number;
  trackLength?: number;
  teamColor?: string;
}) {
  const matSteelRail = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 2.0
  }), []);

  const matSleeper = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.6,
    roughness: 0.6
  }), []);

  const matBuffer = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.7,
    roughness: 0.3
  }), []);

  const matWarningGlow = useMemo(() => new THREE.MeshStandardMaterial({
    color: teamColor,
    emissive: teamColor,
    emissiveIntensity: 0.6
  }), [teamColor]);

  const sleeperCount = Math.floor(trackLength / 0.85);
  const sleepers = useMemo(() => {
    const list: number[] = [];
    const halfLen = trackLength / 2;
    for (let i = 0; i <= sleeperCount; i++) {
      list.push(-halfLen + (i / sleeperCount) * trackLength);
    }
    return list;
  }, [trackLength, sleeperCount]);

  const railSpacing = 1.0; // 1000mm standard precision dolly track gauge

  return (
    <group position={[0, 0, zPos]}>
      {/* North Steel Tubular Rail */}
      <mesh castShadow receiveShadow material={matSteelRail} position={[0, 0.08, -railSpacing / 2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.038, 0.038, trackLength, 24]} />
      </mesh>

      {/* South Steel Tubular Rail */}
      <mesh castShadow receiveShadow material={matSteelRail} position={[0, 0.08, railSpacing / 2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.038, 0.038, trackLength, 24]} />
      </mesh>

      {/* Center Gear/Cable Guide Channel */}
      <mesh castShadow receiveShadow material={matSleeper} position={[0, 0.04, 0]}>
        <boxGeometry args={[trackLength, 0.02, 0.16]} />
      </mesh>

      {/* Sleepers / Querschwellen along the track */}
      {sleepers.map((sx, idx) => (
        <mesh key={`sl-${idx}`} castShadow receiveShadow material={matSleeper} position={[sx, 0.03, 0]}>
          <boxGeometry args={[0.16, 0.06, 1.45]} />
        </mesh>
      ))}

      {/* Left End-Stop Buffer (X = -trackLength/2) */}
      <group position={[-trackLength / 2 - 0.1, 0, 0]}>
        <mesh castShadow material={matBuffer} position={[0, 0.20, 0]}>
          <boxGeometry args={[0.22, 0.40, 1.4]} />
        </mesh>
        <mesh castShadow material={matWarningGlow} position={[0.05, 0.20, 0]}>
          <boxGeometry args={[0.04, 0.36, 1.3]} />
        </mesh>
      </group>

      {/* Right End-Stop Buffer (X = trackLength/2) */}
      <group position={[trackLength / 2 + 0.1, 0, 0]}>
        <mesh castShadow material={matBuffer} position={[0, 0.20, 0]}>
          <boxGeometry args={[0.22, 0.40, 1.4]} />
        </mesh>
        <mesh castShadow material={matWarningGlow} position={[-0.05, 0.20, 0]}>
          <boxGeometry args={[0.04, 0.36, 1.3]} />
        </mesh>
      </group>
    </group>
  );
}

// --- 🚜 SUPERTECHNO 50 SCHWERLAST-DOLLY BASE / CHASSIS ---
function SupertechnoDollyBase({
  teamColor = '#38bdf8'
}: {
  teamColor?: string;
}) {
  const matChassisDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x181a20,
    metalness: 0.85,
    roughness: 0.35
  }), []);

  const matPlateDeck = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x2d3748,
    metalness: 0.7,
    roughness: 0.4
  }), []);

  const matSteelWheel = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xcfd8dc,
    metalness: 0.95,
    roughness: 0.15,
    envMapIntensity: 2.0
  }), []);

  const matTurntableFlange = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x111317,
    metalness: 0.9,
    roughness: 0.3
  }), []);

  const matTeamLED = useMemo(() => new THREE.MeshStandardMaterial({
    color: teamColor,
    emissive: teamColor,
    emissiveIntensity: 0.85,
    roughness: 0.2
  }), [teamColor]);

  const railSpacing = 1.0;
  const wheelPositions = [
    [-0.65, -railSpacing / 2],
    [0.65, -railSpacing / 2],
    [-0.65, railSpacing / 2],
    [0.65, railSpacing / 2]
  ];

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Main Steel Chassis Platform */}
      <mesh castShadow receiveShadow material={matChassisDark} position={[0, 0.16, 0]}>
        <boxGeometry args={[1.75, 0.14, 1.38]} />
      </mesh>

      {/* 2. Aluminum Chequer / Diamond Plate Deck on Top */}
      <mesh castShadow receiveShadow material={matPlateDeck} position={[0, 0.235, 0]}>
        <boxGeometry args={[1.70, 0.015, 1.32]} />
      </mesh>

      {/* 3. Heavy Turntable Collar / Flange Base under Crane Column */}
      <mesh castShadow receiveShadow material={matTurntableFlange} position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.62, 0.68, 0.16, 32]} />
      </mesh>
      <mesh castShadow material={matChassisDark} position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.55, 0.58, 0.04, 32]} />
      </mesh>

      {/* 4. 8x Track Wheel Bogies (4 Bogie Trucks on the 2 Tubular Rails) */}
      {wheelPositions.map(([wx, wz], idx) => (
        <group key={`bogie-${idx}`} position={[wx, 0.08, wz]}>
          {/* Bogie Bracket Housing */}
          <mesh castShadow material={matChassisDark} position={[0, 0.05, 0]}>
            <boxGeometry args={[0.32, 0.09, 0.14]} />
          </mesh>
          {/* Front Concave Track Wheel */}
          <mesh castShadow material={matSteelWheel} position={[-0.10, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.05, 16]} />
          </mesh>
          {/* Rear Concave Track Wheel */}
          <mesh castShadow material={matSteelWheel} position={[0.10, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.05, 16]} />
          </mesh>
          {/* Axle Pins */}
          <mesh castShadow material={matChassisDark} position={[-0.10, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.07, 8]} />
          </mesh>
          <mesh castShadow material={matChassisDark} position={[0.10, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.07, 8]} />
          </mesh>
        </group>
      ))}

      {/* 5. Electric Drive Motor & Center Gear Unit */}
      <mesh castShadow material={matChassisDark} position={[0, 0.06, 0]}>
        <boxGeometry args={[0.45, 0.10, 0.35]} />
      </mesh>
      <mesh castShadow material={matSteelWheel} position={[0, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.16, 16]} />
      </mesh>

      {/* 6. Glowing Team LED Status Bars on Chassis Sides */}
      <mesh material={matTeamLED} position={[0, 0.17, 0.70]}>
        <boxGeometry args={[1.5, 0.035, 0.02]} />
      </mesh>
      <mesh material={matTeamLED} position={[0, 0.17, -0.70]}>
        <boxGeometry args={[1.5, 0.035, 0.02]} />
      </mesh>

      {/* 7. Corner Spindle Outrigger Jacks & Steel Handles */}
      {[
        [-0.82, -0.62],
        [0.82, -0.62],
        [-0.82, 0.62],
        [0.82, 0.62]
      ].map(([jx, jz], jIdx) => (
        <group key={`jack-${jIdx}`} position={[jx, 0.14, jz]}>
          <mesh castShadow material={matChassisDark} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
          </mesh>
          <mesh castShadow material={matPlateDeck} position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.02, 12]} />
          </mesh>
        </group>
      ))}

      {/* Push/Tow Bars at ends */}
      <mesh castShadow material={matChassisDark} position={[-0.88, 0.20, 0]}>
        <boxGeometry args={[0.05, 0.06, 0.7]} />
      </mesh>
      <mesh castShadow material={matChassisDark} position={[0.88, 0.20, 0]}>
        <boxGeometry args={[0.05, 0.06, 0.7]} />
      </mesh>
    </group>
  );
}

// --- 🎾 AUTHENTIC CARBON TENNIS RACKET ---
function CraneTennisRacket({ 
  teamColor = '#38bdf8', 
  stringGlow = '#bae6fd',
  racketScale = 1.0 
}: { 
  teamColor?: string; 
  stringGlow?: string;
  racketScale?: number;
}) {
  const headRadiusX = 0.22 * racketScale;
  const headRadiusY = 0.32 * racketScale;
  const frameThickness = 0.018 * racketScale;

  const matFrame = useMemo(() => new THREE.MeshStandardMaterial({
    color: teamColor,
    metalness: 0.85,
    roughness: 0.25,
    envMapIntensity: 1.5
  }), [teamColor]);

  const matCarbonDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.5,
    metalness: 0.4
  }), []);

  const matStrings = useMemo(() => new THREE.MeshStandardMaterial({
    color: stringGlow,
    emissive: stringGlow,
    emissiveIntensity: 0.8,
    metalness: 0.2,
    roughness: 0.2
  }), [stringGlow]);

  const matGrip = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1
  }), []);

  const stringsGrid = useMemo(() => {
    const lines: Array<{ p1: [number, number, number]; p2: [number, number, number] }> = [];
    const countV = 10;
    const countH = 14;

    for (let i = 1; i < countV; i++) {
      const u = (i / countV) * 2 - 1;
      const x = u * (headRadiusX - 0.02);
      const halfH = headRadiusY * Math.sqrt(Math.max(0, 1 - (x / headRadiusX) ** 2));
      if (halfH > 0.03) {
        lines.push({ p1: [x, -halfH, 0], p2: [x, halfH, 0] });
      }
    }

    for (let j = 1; j < countH; j++) {
      const v = (j / countH) * 2 - 1;
      const y = v * (headRadiusY - 0.02);
      const halfW = headRadiusX * Math.sqrt(Math.max(0, 1 - (y / headRadiusY) ** 2));
      if (halfW > 0.03) {
        lines.push({ p1: [-halfW, y, 0], p2: [halfW, y, 0] });
      }
    }

    return lines;
  }, [headRadiusX, headRadiusY]);

  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow receiveShadow material={matFrame} position={[0, headRadiusY + 0.14, 0]}>
        <torusGeometry args={[headRadiusX, frameThickness, 16, 32]} />
      </mesh>
      <mesh castShadow material={matCarbonDark} position={[0, headRadiusY + 0.14, 0]}>
        <torusGeometry args={[headRadiusX + 0.006, frameThickness * 0.45, 8, 32]} />
      </mesh>

      <mesh castShadow material={matFrame} position={[-0.05, 0.16, 0]} rotation={[0, 0, -0.28]}>
        <cylinderGeometry args={[0.016, 0.018, 0.18, 12]} />
      </mesh>
      <mesh castShadow material={matFrame} position={[0.05, 0.16, 0]} rotation={[0, 0, 0.28]}>
        <cylinderGeometry args={[0.016, 0.018, 0.18, 12]} />
      </mesh>
      <mesh castShadow material={matCarbonDark} position={[0, 0.22, 0]}>
        <boxGeometry args={[0.11, 0.022, 0.03]} />
      </mesh>

      <mesh castShadow material={matFrame} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.16, 12]} />
      </mesh>
      <mesh castShadow material={matGrip} position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.022, 0.020, 0.16, 12]} />
      </mesh>
      <mesh castShadow material={matFrame} position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.028, 0.024, 0.03, 8]} />
      </mesh>

      <group position={[0, headRadiusY + 0.14, 0]}>
        {stringsGrid.map((str, idx) => {
          const midX = (str.p1[0] + str.p2[0]) / 2;
          const midY = (str.p1[1] + str.p2[1]) / 2;
          const len = Math.hypot(str.p2[0] - str.p1[0], str.p2[1] - str.p1[1]);
          const angle = Math.atan2(str.p2[1] - str.p1[1], str.p2[0] - str.p1[0]);
          return (
            <mesh
              key={`str-${idx}`}
              material={matStrings}
              position={[midX, midY, 0]}
              rotation={[0, 0, angle - Math.PI / 2]}
            >
              <cylinderGeometry args={[0.002, 0.002, len, 4]} />
            </mesh>
          );
        })}
        <mesh material={matStrings} position={[0, 0, 0]}>
          <ringGeometry args={[0.06, 0.075, 20]} />
        </mesh>
      </group>
    </group>
  );
}

// --- 🏗️ CRANE BOOM TIP RIG ---
function CraneBoomTipRig({
  crane,
  kinematics,
  teamColor,
  stringGlow,
  racketWorldPosRef
}: {
  crane: Supertechno50FBXModel | null;
  kinematics: {
    dollyTrack: number;
    columnElevation: number;
    basePan: number;
    boomTilt: number;
    teleExtension: number;
    headPan: number;
    headTilt: number;
    headRoll: number;
  };
  teamColor: string;
  stringGlow: string;
  racketWorldPosRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const racketTargetRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !crane || !crane.isLoaded || !crane.nodes.beams) return;
    const beamNode = crane.nodes.beams;
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    beamNode.getWorldPosition(worldPos);
    beamNode.getWorldQuaternion(worldQuat);

    groupRef.current.position.copy(worldPos);
    groupRef.current.quaternion.copy(worldQuat);

    if (racketTargetRef.current) {
      const rPos = new THREE.Vector3();
      racketTargetRef.current.getWorldPosition(rPos);
      racketWorldPosRef.current.copy(rPos);
    }
  });

  const ext = kinematics.teleExtension || 0;
  const tExt = Math.max(0, Math.min(1.0, ext / 11.3));
  const tipZ = -3.34 - tExt * 11.40;
  const tipY = 0.05;
  const tipX = -0.01;

  return (
    <group ref={groupRef}>
      <RemoteCameraHead
        headPan={kinematics.headPan || 0}
        headTilt={kinematics.headTilt || 0}
        headRoll={kinematics.headRoll || 0}
        boomTilt={kinematics.boomTilt || 0}
        autoLevel={true}
        position={[tipX, tipY, tipZ]}
        scale={1.0}
      />

      <group position={[tipX, tipY, tipZ]}>
        <mesh castShadow position={[0, -0.12, -0.18]}>
          <boxGeometry args={[0.18, 0.10, 0.22]} />
          <meshStandardMaterial color={0x181c24} metalness={0.9} roughness={0.3} />
        </mesh>
        
        <group
          position={[0, -0.28, -0.42]}
          rotation={[
            THREE.MathUtils.degToRad(-kinematics.headTilt || 0),
            THREE.MathUtils.degToRad(kinematics.headPan || 0),
            THREE.MathUtils.degToRad(kinematics.headRoll || 0)
          ]}
        >
          <group ref={racketTargetRef} position={[0, 0.46, 0]} />
          <CraneTennisRacket teamColor={teamColor} stringGlow={stringGlow} racketScale={0.95} />
        </group>
      </group>
    </group>
  );
}

// --- 🪑 3D ANIMATED TENNIS UMPIRE ---
function TennisUmpire({ ballPos }: { ballPos: THREE.Vector3 }) {
  const headRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (headRef.current) {
      const angle = THREE.MathUtils.clamp(-ballPos.z * 0.065, -0.9, 0.9);
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, angle, 0.12);
    }
  });

  const matBlazer = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.6 }), []);
  const matPants = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7 }), []);
  const matSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbcfe8', roughness: 0.5 }), []);
  const matCap = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4 }), []);

  return (
    <group position={[7.2, 0, 0]}>
      <group rotation={[0, -Math.PI / 2, 0]}>
        {[-0.4, 0.4].map((lx, i) =>
          [-0.4, 0.4].map((lz, j) => (
            <mesh key={`leg-${i}-${j}`} castShadow position={[lx, 1.1, lz]}>
              <cylinderGeometry args={[0.025, 0.035, 2.2, 12]} />
              <meshStandardMaterial color={0x0f172a} metalness={0.8} roughness={0.3} />
            </mesh>
          ))
        )}
        <mesh castShadow position={[0, 2.0, 0]}>
          <boxGeometry args={[0.9, 0.05, 0.9]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 2.35, 0.15]}>
          <boxGeometry args={[0.65, 0.65, 0.1]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 2.05, -0.1]}>
          <boxGeometry args={[0.65, 0.06, 0.45]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 3.05, 0]}>
          <boxGeometry args={[1.1, 0.04, 1.1]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} />
        </mesh>
      </group>

      <group position={[0, 2.08, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh castShadow material={matPants} position={[-0.14, 0.22, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.42, 12]} />
        </mesh>
        <mesh castShadow material={matPants} position={[0.14, 0.22, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.42, 12]} />
        </mesh>
        <mesh castShadow material={matPants} position={[-0.14, -0.05, -0.42]}>
          <cylinderGeometry args={[0.05, 0.045, 0.45, 12]} />
        </mesh>
        <mesh castShadow material={matPants} position={[0.14, -0.05, -0.42]}>
          <cylinderGeometry args={[0.05, 0.045, 0.45, 12]} />
        </mesh>

        <mesh castShadow material={matBlazer} position={[0, 0.52, 0]}>
          <boxGeometry args={[0.38, 0.48, 0.24]} />
        </mesh>

        <mesh castShadow material={matBlazer} position={[-0.22, 0.45, -0.15]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.38, 10]} />
        </mesh>
        <mesh castShadow material={matBlazer} position={[0.22, 0.45, -0.15]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.38, 10]} />
        </mesh>

        <mesh castShadow position={[0, 0.42, -0.32]} rotation={[-0.6, 0, 0]}>
          <boxGeometry args={[0.26, 0.18, 0.02]} />
          <meshStandardMaterial color={0x0284c7} emissive="#0284c7" emissiveIntensity={0.4} />
        </mesh>

        <group ref={headRef} position={[0, 0.85, 0]}>
          <mesh castShadow material={matSkin}>
            <sphereGeometry args={[0.12, 16, 16]} />
          </mesh>
          <mesh castShadow material={matCap} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.125, 0.13, 0.08, 16]} />
          </mesh>
          <mesh castShadow material={matCap} position={[0, 0.06, -0.10]}>
            <boxGeometry args={[0.14, 0.02, 0.10]} />
          </mesh>
          <mesh castShadow position={[0.13, 0.02, -0.08]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 6]} />
            <meshStandardMaterial color={0x111111} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// --- 🚶‍♂️ LINIENRICHTER, BALLKINDER, TRAINER & FOTOGRAFEN ---
function TennisCourtsideStaff({ ballPos, isCheering }: { ballPos: THREE.Vector3; isCheering: boolean }) {
  const staffGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (staffGroupRef.current) {
      const time = clock.getElapsedTime();
      const cheerJump = isCheering ? Math.sin(time * 12) * 0.15 : 0;
      staffGroupRef.current.position.y = cheerJump;
      if (ballPos) {
        staffGroupRef.current.children.forEach((child, idx) => {
          if (idx < 6) {
            child.rotation.y += Math.sin(time * 2 + idx) * 0.002;
          }
        });
      }
    }
  });

  const matNavy = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 }), []);
  const matWhite = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 }), []);
  const matYellowKit = useMemo(() => new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.5 }), []);
  const matSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.4 }), []);
  const matDarkSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.4 }), []);
  const matCoachBlue = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.6 }), []);
  const matCoachGold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.6 }), []);

  const lineJudges = useMemo(() => [
    { pos: [-6.4, 0, -12.6], rot: 0.2, name: 'Baseline Left Judge South' },
    { pos: [6.4, 0, -12.6], rot: -0.2, name: 'Baseline Right Judge South' },
    { pos: [-6.4, 0, 12.6], rot: Math.PI - 0.2, name: 'Baseline Left Judge North' },
    { pos: [6.4, 0, 12.6], rot: Math.PI + 0.2, name: 'Baseline Right Judge North' },
    { pos: [-6.8, 0, -6.4], rot: Math.PI / 2, name: 'Service Judge South' },
    { pos: [-6.8, 0, 6.4], rot: Math.PI / 2, name: 'Service Judge North' },
  ], []);

  const ballKids = useMemo(() => [
    { pos: [-6.5, 0, -0.6], rot: Math.PI / 2, isKneeling: true },
    { pos: [-6.5, 0, 0.6], rot: Math.PI / 2, isKneeling: true },
    { pos: [5.8, 0, -12.2], rot: -0.3, isKneeling: false },
    { pos: [-5.8, 0, 12.2], rot: Math.PI + 0.3, isKneeling: false },
  ], []);

  return (
    <group ref={staffGroupRef}>
      {lineJudges.map((lj, idx) => (
        <group key={`lj-${idx}`} position={lj.pos as [number, number, number]} rotation={[0, lj.rot, 0]}>
          <mesh castShadow material={matWhite} position={[-0.10, 0.42, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.84, 8]} />
          </mesh>
          <mesh castShadow material={matWhite} position={[0.10, 0.42, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.84, 8]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 1.15, 0]}>
            <boxGeometry args={[0.34, 0.65, 0.20]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[-0.19, 1.12, 0.05]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.03, 0.55, 6]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0.19, 1.12, 0.05]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.03, 0.55, 6]} />
          </mesh>
          <mesh castShadow material={idx % 2 === 0 ? matSkin : matDarkSkin} position={[0, 1.58, 0]}>
            <sphereGeometry args={[0.10, 12, 12]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 1.66, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.05, 10]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 1.65, -0.08]}>
            <boxGeometry args={[0.12, 0.02, 0.08]} />
          </mesh>
        </group>
      ))}

      {ballKids.map((bk, idx) => (
        <group key={`bk-${idx}`} position={bk.pos as [number, number, number]} rotation={[0, bk.rot, 0]}>
          {bk.isKneeling ? (
            <group position={[0, 0, 0]}>
              <mesh castShadow material={matNavy} position={[0, 0.25, 0]} rotation={[0.6, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.04, 0.55, 8]} />
              </mesh>
              <mesh castShadow material={matYellowKit} position={[0, 0.65, 0]}>
                <boxGeometry args={[0.30, 0.45, 0.18]} />
              </mesh>
              <mesh castShadow material={matSkin} position={[0, 0.98, 0]}>
                <sphereGeometry args={[0.09, 12, 12]} />
              </mesh>
              <mesh castShadow material={matWhite} position={[0, 1.05, 0]}>
                <cylinderGeometry args={[0.095, 0.095, 0.04, 8]} />
              </mesh>
            </group>
          ) : (
            <group position={[0, 0, 0]}>
              <mesh castShadow material={matNavy} position={[-0.10, 0.35, 0]} rotation={[-0.15, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.04, 0.70, 8]} />
              </mesh>
              <mesh castShadow material={matNavy} position={[0.10, 0.35, 0]} rotation={[-0.15, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.04, 0.70, 8]} />
              </mesh>
              <mesh castShadow material={matYellowKit} position={[0, 0.95, -0.05]} rotation={[0.15, 0, 0]}>
                <boxGeometry args={[0.30, 0.52, 0.18]} />
              </mesh>
              <mesh castShadow material={matSkin} position={[0, 1.32, -0.08]}>
                <sphereGeometry args={[0.09, 12, 12]} />
              </mesh>
              <mesh castShadow material={matWhite} position={[0, 1.39, -0.08]}>
                <cylinderGeometry args={[0.095, 0.095, 0.04, 8]} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Crane 1 Coach */}
      <group position={[-7.5, 0, -3.2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[1.4, 0.06, 0.55]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh castShadow material={matNavy} position={[-0.2, 0.35, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.35, 8]} />
        </mesh>
        <mesh castShadow material={matCoachBlue} position={[-0.2, 0.85, 0]}>
          <boxGeometry args={[0.34, 0.50, 0.22]} />
        </mesh>
        <mesh castShadow material={matSkin} position={[-0.2, 1.20, 0]}>
          <sphereGeometry args={[0.10, 12, 12]} />
        </mesh>
        <mesh castShadow position={[-0.2, 0.78, -0.22]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.22, 0.15, 0.02]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>

      {/* Crane 2 Coach */}
      <group position={[-7.5, 0, 3.2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[1.4, 0.06, 0.55]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh castShadow material={matNavy} position={[0.2, 0.35, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.35, 8]} />
        </mesh>
        <mesh castShadow material={matCoachGold} position={[0.2, 0.85, 0]}>
          <boxGeometry args={[0.34, 0.50, 0.22]} />
        </mesh>
        <mesh castShadow material={matDarkSkin} position={[0.2, 1.20, 0]}>
          <sphereGeometry args={[0.10, 12, 12]} />
        </mesh>
      </group>

      {/* Photographers */}
      {[
        { pos: [-7.6, 0, -7.5], rot: 0.6 },
        { pos: [-7.6, 0, 7.5], rot: Math.PI - 0.6 }
      ].map((p, idx) => (
        <group key={`photo-${idx}`} position={p.pos as [number, number, number]} rotation={[0, p.rot, 0]}>
          <mesh castShadow position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.5, 12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 0.65, 0]}>
            <boxGeometry args={[0.32, 0.45, 0.22]} />
          </mesh>
          <mesh castShadow material={matSkin} position={[0, 0.98, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 1.05, 0]}>
            <cylinderGeometry args={[0.095, 0.095, 0.04, 8]} />
          </mesh>
          <mesh castShadow position={[0, 0.88, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 0.35, 12]} />
            <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 0.88, -0.08]}>
            <boxGeometry args={[0.12, 0.09, 0.08]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- 🎉 3D CONFETTI CELEBRATION ---
function ConfettiCelebration({ active }: { active: boolean }) {
  const count = 180;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    const list: Array<{
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      rot: THREE.Euler;
      rotVel: THREE.Vector3;
      color: THREE.Color;
    }> = [];
    const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#c084fc', '#fb923c'];
    for (let i = 0; i < count; i++) {
      list.push({
        pos: new THREE.Vector3((Math.random() - 0.5) * 20, 6 + Math.random() * 8, (Math.random() - 0.5) * 30),
        vel: new THREE.Vector3((Math.random() - 0.5) * 2.0, -1.2 - Math.random() * 2.5, (Math.random() - 0.5) * 2.0),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotVel: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        color: new THREE.Color(colors[i % colors.length])
      });
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;
    const dummy = new THREE.Object3D();

    particles.forEach((p, idx) => {
      p.pos.x += p.vel.x * delta;
      p.pos.y += p.vel.y * delta;
      p.pos.z += p.vel.z * delta;
      p.rot.x += p.rotVel.x * delta;
      p.rot.y += p.rotVel.y * delta;

      if (p.pos.y < 0.1) {
        p.pos.y = 8 + Math.random() * 4;
      }

      dummy.position.copy(p.pos);
      dummy.rotation.copy(p.rot);
      dummy.scale.set(1.0, 1.0, 1.0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(idx, dummy.matrix);
      meshRef.current!.setColorAt(idx, p.color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[0.18, 0.08]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

// --- 🪑 SEATED SPECTATOR INDIVIDUAL COMPONENT ---
function SeatedSpectator({
  x,
  y,
  z,
  facing,
  shirtColor,
  chairColor,
  ballPos,
  isCheering,
  cheerIntensity,
  idx,
  hasFlag
}: {
  x: number;
  y: number;
  z: number;
  facing: 'east' | 'west';
  shirtColor: string;
  chairColor: string;
  ballPos: THREE.Vector3;
  isCheering: boolean;
  cheerIntensity: number;
  idx: number;
  hasFlag: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const armLeftRef = useRef<THREE.Mesh>(null);
  const armRightRef = useRef<THREE.Mesh>(null);

  const rotY = facing === 'west' ? Math.PI / 2 : -Math.PI / 2;

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (groupRef.current) {
      const wavePhase = time * 6.5 - (z + 20) * 0.2 - y * 0.5;
      const waveJump = isCheering ? Math.max(0, Math.sin(wavePhase)) * (0.65 + cheerIntensity * 0.2) : 0;
      groupRef.current.position.y = y + waveJump;

      if (headRef.current) {
        const lookAngle = THREE.MathUtils.clamp((facing === 'west' ? ballPos.z : -ballPos.z) * 0.045, -0.6, 0.6);
        headRef.current.rotation.y = lookAngle;
      }

      if (armLeftRef.current && armRightRef.current) {
        if (isCheering) {
          const armWave = Math.sin(time * 12 + idx) * 0.4;
          armLeftRef.current.rotation.x = -1.6 + armWave;
          armRightRef.current.rotation.x = -1.6 - armWave;
        } else {
          armLeftRef.current.rotation.x = 0.4;
          armRightRef.current.rotation.x = 0.4;
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={[x, y, z]} rotation={[0, rotY, 0]}>
      {/* 1. 3D Stadium Bucket Chair */}
      <mesh castShadow position={[0, 0.18, 0.05]}>
        <boxGeometry args={[0.44, 0.06, 0.40]} />
        <meshStandardMaterial color={chairColor} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.44, -0.15]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.44, 0.46, 0.06]} />
        <meshStandardMaterial color={chairColor} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, -0.10, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 2. Seated Human Figure */}
      <mesh castShadow position={[0, 0.26, 0.10]}>
        <boxGeometry args={[0.34, 0.10, 0.32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.10, 0.02, 0.26]}>
        <cylinderGeometry args={[0.045, 0.04, 0.40, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.10, 0.02, 0.26]}>
        <cylinderGeometry args={[0.045, 0.04, 0.40, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.58, 0]}>
        <boxGeometry args={[0.36, 0.52, 0.22]} />
        <meshStandardMaterial color={shirtColor} roughness={0.6} />
      </mesh>
      <group ref={headRef} position={[0, 0.96, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.05, 10]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
        <mesh castShadow position={[0, 0.07, 0.08]}>
          <boxGeometry args={[0.13, 0.02, 0.08]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
      </group>
      <mesh ref={armLeftRef} castShadow position={[-0.22, 0.72, 0.04]} rotation={[0.4, 0, 0.2]}>
        <cylinderGeometry args={[0.035, 0.03, 0.40, 6]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      <mesh ref={armRightRef} castShadow position={[0.22, 0.72, 0.04]} rotation={[0.4, 0, -0.2]}>
        <cylinderGeometry args={[0.035, 0.03, 0.40, 6]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>

      {/* Team Flag */}
      {hasFlag && (
        <group position={[0.25, 0.85, 0.2]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.8, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.22, 0.60, 0]}>
            <planeGeometry args={[0.40, 0.26]} />
            <meshBasicMaterial color={facing === 'west' ? '#38bdf8' : '#facc15'} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// --- 👥 JUBELNDES PUBLIKUM IN DEN TRIBÜNEN ---
function TennisStadiumSpectators({ 
  ballPos, 
  isCheering,
  cheerIntensity,
  showSpectators = true,
  showGrandstands = true
}: { 
  ballPos: THREE.Vector3; 
  isCheering: boolean;
  cheerIntensity: number;
  showSpectators?: boolean;
  showGrandstands?: boolean;
}) {
  const { westSpectators, eastSpectators } = useMemo(() => {
    const wList: Array<{ x: number; y: number; z: number; color: string; hasFlag: boolean }> = [];
    const eList: Array<{ x: number; y: number; z: number; color: string; hasFlag: boolean }> = [];

    const shirtColors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#f8fafc', '#1e293b', '#0284c7', '#84cc16'
    ];

    const rows = 5;
    const cols = 15;

    for (let r = 0; r < rows; r++) {
      const standY = r * 0.85 + 0.42;
      for (let c = 0; c < cols; c++) {
        const z = -18 + c * 2.6;
        const color = shirtColors[(r * cols + c) % shirtColors.length];
        const hasFlag = (r * cols + c) % 5 === 0;

        // West Tribüne (X = -12.5m bis -19.5m)
        wList.push({
          x: -12.8 - r * 1.6,
          y: standY,
          z,
          color,
          hasFlag
        });

        // East Tribüne (X = +12.5m bis +19.5m)
        eList.push({
          x: 12.8 + r * 1.6,
          y: standY,
          z,
          color,
          hasFlag
        });
      }
    }

    return { westSpectators: wList, eastSpectators: eList };
  }, []);

  const matStandConcrete = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.2
  }), []);

  const matLedBanner = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: '#0369a1',
    emissiveIntensity: 0.6,
    roughness: 0.2
  }), []);

  return (
    <group>
      {/* 1. Concrete Grandstand Structures */}
      {showGrandstands && (
        <>
          <group position={[-17.5, 0, 0]}>
            {[0, 1, 2, 3, 4, 5].map(r => (
              <mesh key={`west-tier-${r}`} castShadow receiveShadow material={matStandConcrete} position={[-(r * 1.6), r * 0.85 + 0.42, 0]}>
                <boxGeometry args={[2.0, 0.85, 46]} />
              </mesh>
            ))}
            <mesh castShadow receiveShadow material={matLedBanner} position={[5.8, 0.5, 0]}>
              <boxGeometry args={[0.2, 1.0, 46]} />
            </mesh>
          </group>

          <group position={[17.5, 0, 0]}>
            {[0, 1, 2, 3, 4, 5].map(r => (
              <mesh key={`east-tier-${r}`} castShadow receiveShadow material={matStandConcrete} position={[(r * 1.6), r * 0.85 + 0.42, 0]}>
                <boxGeometry args={[2.0, 0.85, 46]} />
              </mesh>
            ))}
            <mesh castShadow receiveShadow material={matLedBanner} position={[-5.8, 0.5, 0]}>
              <boxGeometry args={[0.2, 1.0, 46]} />
            </mesh>
          </group>
        </>
      )}

      {/* 2. Seated Spectators on Chairs */}
      {showSpectators && (
        <>
          {westSpectators.map((spec, i) => (
            <SeatedSpectator
              key={`w-spec-${i}`}
              x={spec.x}
              y={spec.y}
              z={spec.z}
              facing="west"
              shirtColor={spec.color}
              chairColor="#0284c7"
              ballPos={ballPos}
              isCheering={isCheering}
              cheerIntensity={cheerIntensity}
              idx={i}
              hasFlag={spec.hasFlag}
            />
          ))}

          {eastSpectators.map((spec, i) => (
            <SeatedSpectator
              key={`e-spec-${i}`}
              x={spec.x}
              y={spec.y}
              z={spec.z}
              facing="east"
              shirtColor={spec.color}
              chairColor="#d97706"
              ballPos={ballPos}
              isCheering={isCheering}
              cheerIntensity={cheerIntensity}
              idx={i}
              hasFlag={spec.hasFlag}
            />
          ))}
        </>
      )}
    </group>
  );
}

// --- 🏟️ HIGH-PRECISION 3D TENNIS COURT & STADIUM ARENA ---
function TennisCourtArena({ surface = 'clay' }: { surface: CourtSurface }) {
  const courtLength = 23.77;
  const courtWidth = 10.97;
  const singlesWidth = 8.23;
  const serviceLineZ = 6.40;

  const courtTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (surface === 'clay') {
      ctx.fillStyle = '#b4461b';
      ctx.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 40000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const col = Math.random() > 0.5 ? 'rgba(140, 45, 15, 0.25)' : 'rgba(215, 95, 45, 0.22)';
        ctx.fillStyle = col;
        ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
      }
    } else if (surface === 'grass') {
      ctx.fillStyle = '#1e5e22';
      ctx.fillRect(0, 0, 1024, 1024);
      for (let y = 0; y < 1024; y += 64) {
        ctx.fillStyle = (y / 64) % 2 === 0 ? 'rgba(30, 94, 34, 0.85)' : 'rgba(46, 125, 50, 0.85)';
        ctx.fillRect(0, y, 1024, 64);
      }
      for (let i = 0; i < 30000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(76, 175, 80, 0.15)' : 'rgba(20, 60, 20, 0.15)';
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
      }
    } else if (surface === 'hardcourt') {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 20000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(37, 99, 235, 0.2)' : 'rgba(29, 78, 216, 0.2)';
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 3, 3);
      }
    } else {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= 1024; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }
      for (let y = 0; y <= 1024; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [surface]);

  const matLineWhite = useMemo(() => new THREE.MeshStandardMaterial({
    color: surface === 'cyber' ? '#38bdf8' : '#ffffff',
    emissive: surface === 'cyber' ? '#38bdf8' : '#000000',
    emissiveIntensity: surface === 'cyber' ? 0.8 : 0,
    roughness: 0.3,
    metalness: 0.1
  }), [surface]);

  const matNetMesh = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    opacity: 0.65,
    wireframe: true
  }), []);

  const matNetBand = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4
  }), []);

  const matNetPost = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.8,
    roughness: 0.3
  }), []);

  const matSurround = useMemo(() => new THREE.MeshStandardMaterial({
    color: surface === 'clay' ? '#853112' : surface === 'hardcourt' ? '#047857' : surface === 'grass' ? '#14532d' : '#040711',
    roughness: 0.9,
    metalness: 0.05
  }), [surface]);

  return (
    <group position={[0, 0, 0]}>
      <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44, 70]} />
        <primitive object={matSurround} attach="material" />
      </mesh>

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[courtWidth, courtLength]} />
        {courtTexture && <meshStandardMaterial map={courtTexture} roughness={0.7} metalness={0.08} />}
      </mesh>

      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, -courtLength / 2]}>
        <boxGeometry args={[courtWidth, 0.004, 0.10]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, courtLength / 2]}>
        <boxGeometry args={[courtWidth, 0.004, 0.10]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[-courtWidth / 2, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, courtLength]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[courtWidth / 2, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, courtLength]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[-singlesWidth / 2, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, courtLength]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[singlesWidth / 2, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, courtLength]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, -serviceLineZ]}>
        <boxGeometry args={[singlesWidth, 0.004, 0.05]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, serviceLineZ]}>
        <boxGeometry args={[singlesWidth, 0.004, 0.05]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, serviceLineZ * 2]} />
      </mesh>

      <group position={[0, 0, 0]}>
        <mesh castShadow receiveShadow material={matNetPost} position={[-6.2, 0.535, 0]}>
          <cylinderGeometry args={[0.065, 0.075, 1.07, 24]} />
        </mesh>
        <mesh castShadow receiveShadow material={matNetPost} position={[6.2, 0.535, 0]}>
          <cylinderGeometry args={[0.065, 0.075, 1.07, 24]} />
        </mesh>
        <mesh castShadow receiveShadow material={matNetMesh} position={[0, 0.48, 0]}>
          <boxGeometry args={[12.4, 0.94, 0.02]} />
        </mesh>
        <mesh castShadow receiveShadow material={matNetBand} position={[0, 0.95, 0]}>
          <boxGeometry args={[12.4, 0.065, 0.04]} />
        </mesh>
        <mesh castShadow receiveShadow material={matNetBand} position={[0, 0.46, 0]}>
          <boxGeometry args={[0.06, 0.92, 0.045]} />
        </mesh>
      </group>
    </group>
  );
}

// --- 🎾 MAIN CRANE TENNIS 3D SCENE ---
function CraneTennisScene({
  courtSurface,
  cameraMode,
  matchScore,
  setMatchScore,
  isAIvsAI,
  gameSpeed,
  orbitControlsRef,
  showSpectators,
  showCourtsideStaff,
  showGrandstands
}: {
  courtSurface: CourtSurface;
  cameraMode: TennisCameraMode;
  matchScore: MatchScore;
  setMatchScore: React.Dispatch<React.SetStateAction<MatchScore>>;
  isAIvsAI: boolean;
  gameSpeed: number;
  orbitControlsRef: React.RefObject<any>;
  showSpectators: boolean;
  showCourtsideStaff: boolean;
  showGrandstands: boolean;
}) {
  const [crane1, setCrane1] = useState<Supertechno50FBXModel | null>(null);
  const [crane2, setCrane2] = useState<Supertechno50FBXModel | null>(null);

  const kin1Ref = useRef({
    dollyTrack: 0,
    columnElevation: 1.85,
    basePan: 0,
    boomTilt: 8,
    teleExtension: 5.5,
    headPan: 0,
    headTilt: 0,
    headRoll: 0
  });

  const kin2Ref = useRef({
    dollyTrack: 0,
    columnElevation: 1.85,
    basePan: 0,
    boomTilt: 8,
    teleExtension: 5.5,
    headPan: 0,
    headTilt: 0,
    headRoll: 0
  });

  const crane1BaseZ = -15.2;
  const crane2BaseZ = 15.2;

  const racket1WorldPos = useRef(new THREE.Vector3(0, 2.2, -9.8));
  const racket2WorldPos = useRef(new THREE.Vector3(0, 2.2, 9.8));

  const [ballVisualPos, setBallVisualPos] = useState(new THREE.Vector3(0, 2.2, -9.8));
  const [impactBurst, setImpactBurst] = useState<{ pos: THREE.Vector3; time: number } | null>(null);

  const shotRef = useRef<RallyShot>({
    shooter: 1,
    startPos: new THREE.Vector3(-1.0, 2.3, -9.8),
    targetPos: new THREE.Vector3(1.2, 2.2, 9.8),
    bouncePos: new THREE.Vector3(0.5, 0.16, 6.8),
    duration: 1.25,
    progress: 0.0,
    netHeight: 1.9,
    shotType: '💥 VORHAND-CROSS SCHWENK',
    strokeSide: 'forehand',
    speedKmh: 178,
    hasBounced: false,
    isDecisive: false,
    isServe: false,
    servePhase: 0.0
  });

  const getUmpireScoreCall = (p1: number, p2: number, g1: number, g2: number): string => {
    const terms: Record<number, string> = { 0: 'Love', 15: '15', 30: '30', 40: '40' };
    if (p1 === 45) return 'Advantage Kran 1!';
    if (p2 === 45) return 'Advantage Kran 2!';
    if (p1 === 40 && p2 === 40) return 'Deuce!';
    if (p1 === p2 && p1 > 0) return `${terms[p1]}-All`;
    return `${terms[p1]} - ${terms[p2]} (${g1}:${g2})`;
  };

  const triggerGrandSlamServe = (server: 1 | 2) => {
    const receiver = server === 1 ? 2 : 1;
    const targetZ = receiver === 1 ? -9.8 : 9.8;
    const targetX = (Math.random() - 0.5) * 5.2;
    const bounceZ = receiver === 1 ? -6.2 : 6.2;
    const serverX = server === 1 ? -2.2 : 2.2;
    const serverZ = server === 1 ? -13.5 : 13.5;

    shotRef.current = {
      shooter: server,
      startPos: new THREE.Vector3(serverX, 3.2, serverZ),
      targetPos: new THREE.Vector3(targetX, 2.2, targetZ),
      bouncePos: new THREE.Vector3(targetX * 0.75, 0.16, bounceZ),
      duration: 1.45,
      progress: 0.0,
      netHeight: 1.6,
      shotType: '🚀 228 km/h POWER-AUFSCHLAG (TELESKOP AUSFAHREN)',
      strokeSide: 'serve',
      speedKmh: Math.round(210 + Math.random() * 25),
      hasBounced: false,
      isDecisive: Math.random() > 0.45,
      isServe: true,
      servePhase: 0.0,
      endReason: 'ACE (228 km/h)',
      pointWinner: server
    };
  };

  const createNextShot = (fromHitter: 1 | 2, startPosition: THREE.Vector3, currentRally: number) => {
    const nextHitter = fromHitter === 1 ? 2 : 1;
    const targetZ = nextHitter === 1 ? -9.8 : 9.8;
    
    const isDecisive = currentRally >= 5 && Math.random() > 0.60;

    let targetX = (Math.random() - 0.5) * 6.0;
    let targetY = 1.7 + Math.random() * 0.9;
    let endReason = '';
    let pointWinner: 1 | 2 = fromHitter;

    const isForehand = nextHitter === 1 ? (targetX >= 0) : (targetX <= 0);
    const strokeSide: 'forehand' | 'backhand' = isForehand ? 'forehand' : 'backhand';

    let chosenType = '';
    if (isDecisive) {
      if (strokeSide === 'forehand') {
        const dTypes = [
          { type: '💥 218 km/h VORHAND-SMASH WINNER (Rechts ➜ Links Schwenk)', reason: 'VORHAND WINNER', speed: 218 },
          { type: '🎯 VORHAND-ECKEN-TOPSPIN (Rechts ➜ Links Schwenk)', reason: 'CORNER WINNER', speed: 202 }
        ];
        const d = dTypes[Math.floor(Math.random() * dTypes.length)];
        chosenType = d.type; endReason = d.reason;
      } else {
        const dTypes = [
          { type: '🚀 205 km/h RÜCKHAND-LONGLINE PASS (Links ➜ Rechts Schwenk)', reason: 'RÜCKHAND PASS', speed: 205 },
          { type: '🌀 RÜCKHAND-CROSS VOLLEY WINNER (Links ➜ Rechts Schwenk)', reason: 'VOLLEY WINNER', speed: 192 }
        ];
        const d = dTypes[Math.floor(Math.random() * dTypes.length)];
        chosenType = d.type; endReason = d.reason;
      }
      pointWinner = fromHitter;
    } else {
      if (strokeSide === 'forehand') {
        const forehandShots = [
          '⚡ VORHAND-TOPSPIN DRIVE (Schwenk Rechts ➜ Links)',
          '💥 VORHAND-CROSS WINKEL (Schwenk Rechts ➜ Links)',
          '💫 INSIDE-OUT VORHAND (Schwenk Rechts ➜ Links)'
        ];
        chosenType = forehandShots[Math.floor(Math.random() * forehandShots.length)];
      } else {
        const backhandShots = [
          '⚡ RÜCKHAND-LONGLINE DRIVE (Schwenk Links ➜ Rechts)',
          '🎯 RÜCKHAND-SLICE (Schwenk Links ➜ Rechts)',
          '🚀 RÜCKHAND-CROSS-SPEED (Schwenk Links ➜ Rechts)'
        ];
        chosenType = backhandShots[Math.floor(Math.random() * backhandShots.length)];
      }
    }

    const isFast = chosenType.includes('SMASH') || chosenType.includes('WINNER') || chosenType.includes('205') || chosenType.includes('218');
    const isLob = chosenType.includes('LOB');

    const duration = isFast ? 1.02 : isLob ? 1.55 : 1.25;
    const speed = Math.round(isFast ? (195 + Math.random() * 25) : (150 + Math.random() * 25));
    const netHeight = isLob ? 3.6 : (1.65 + Math.random() * 0.55);

    const bounceZ = nextHitter === 1 ? (-5.5 - Math.random() * 3.0) : (5.5 + Math.random() * 3.0);
    const bounceX = THREE.MathUtils.lerp(startPosition.x, targetX, 0.70);
    const bouncePosition = new THREE.Vector3(bounceX, 0.16, bounceZ);

    return {
      shooter: fromHitter,
      startPos: startPosition.clone(),
      targetPos: new THREE.Vector3(targetX, targetY, targetZ),
      bouncePos: bouncePosition,
      duration,
      progress: 0.0,
      netHeight,
      shotType: chosenType,
      strokeSide,
      speedKmh: speed,
      hasBounced: false,
      isDecisive,
      isServe: false,
      servePhase: 0.0,
      endReason,
      pointWinner
    };
  };

  useEffect(() => {
    const c1 = new Supertechno50FBXModel(() => setCrane1(c1));
    const c2 = new Supertechno50FBXModel(() => setCrane2(c2));
    return () => {
      c1.dispose();
      c2.dispose();
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const playFactor = isAIvsAI ? 1.0 : 0.0;
    const dt = Math.min(0.05, delta) * gameSpeed * playFactor;
    const shot = shotRef.current;

    shot.progress += dt / Math.max(0.2, shot.duration);
    const p = Math.min(1.0, shot.progress);

    let currentX = shot.startPos.x;
    let currentZ = shot.startPos.z;
    let currentY = 1.8;

    const kin1 = kin1Ref.current;
    const kin2 = kin2Ref.current;

    if (shot.isServe) {
      const server = shot.shooter;
      const serveTossTime = 0.38;

      if (p < serveTossTime) {
        const tossT = p / serveTossTime;
        const tossHeight = 4 * tossT * (1 - tossT) * 4.2;
        currentX = shot.startPos.x;
        currentZ = shot.startPos.z;
        currentY = shot.startPos.y + tossHeight;

        if (server === 1) {
          kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, -2.2, dt * 8.0);
          kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 3.2, dt * 8.0);
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 34, dt * 9.0);
          kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 8.8, dt * 10.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 20, dt * 9.0);
        } else {
          kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, 2.2, dt * 8.0);
          kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 3.2, dt * 8.0);
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 34, dt * 9.0);
          kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 8.8, dt * 10.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 20, dt * 9.0);
        }
      } else {
        const flightT = (p - serveTossTime) / (1.0 - serveTossTime);
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, flightT);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, flightT);

        const serveBounceProg = 0.65;
        if (flightT < serveBounceProg) {
          const t = flightT / serveBounceProg;
          currentY = THREE.MathUtils.lerp(5.8, shot.bouncePos.y, t * t);
        } else {
          const t = (flightT - serveBounceProg) / (1.0 - serveBounceProg);
          const reboundArc = Math.sin(t * (Math.PI / 2));
          currentY = THREE.MathUtils.lerp(shot.bouncePos.y, shot.targetPos.y, reboundArc);
          if (!shot.hasBounced) {
            shot.hasBounced = true;
          }
        }

        if (server === 1) {
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, -35, dt * 16.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 65, dt * 16.0);
          kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 5.5, dt * 4.0);
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 10, dt * 4.0);
        } else {
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, -35, dt * 16.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, -65, dt * 16.0);
          kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 5.5, dt * 4.0);
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 10, dt * 4.0);
        }

        const receiver = server === 1 ? 2 : 1;
        if (receiver === 1) {
          const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.65, -7.5, 7.5);
          kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 7.5);
          kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 5.8, dt * 7.0);
        } else {
          const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.65, -7.5, 7.5);
          kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 7.5);
          kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 5.8, dt * 7.0);
        }
      }
    } else {
      currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, p);
      currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, p);

      const bounceProg = 0.70;
      if (p < bounceProg) {
        const t = p / bounceProg;
        const arc = 4 * t * (1 - t);
        currentY = THREE.MathUtils.lerp(shot.startPos.y, shot.bouncePos.y, t) + arc * shot.netHeight;
      } else {
        const t = (p - bounceProg) / (1.0 - bounceProg);
        const reboundArc = Math.sin(t * (Math.PI / 2));
        currentY = THREE.MathUtils.lerp(shot.bouncePos.y, shot.targetPos.y, reboundArc);
        if (!shot.hasBounced) {
          shot.hasBounced = true;
        }
      }

      // --- KINEMATIK KRAN 1 (SÜD-GRUNDLINIE Z = -15.2m) ---
      if (shot.shooter === 2) {
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;

        // 1. DOLLY: Fährt AUSSCHLIESSLICH entlang der Schienenlinie (X-Achse von -7.5m bis +7.5m)
        const railX = THREE.MathUtils.clamp(targetX * 0.65, -7.5, 7.5);
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 7.5);

        // 2. AUSLEGER (BOOM): Übernimmt den gesamten Tiefenvorschub zum Netz, Höhe und Treffwinkel
        const deltaX = targetX - kin1.dollyTrack;
        const deltaZ = targetZ - crane1BaseZ; // Vorwärtsdistanz zum Netz
        const distH = Math.hypot(deltaX, deltaZ);

        // Säulenhub
        const idealColY = THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, idealColY, dt * 7.0);

        const deltaY = targetY - kin1.columnElevation;
        const total3DDist = Math.hypot(distH, deltaY);

        // Teleskopausleger fährt weit ins Spielfeld hinein (bis zu 11.2m!)
        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.34, 0.5, 11.2);
        kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, targetExt, dt * 8.5);

        // Auslegerneigung
        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, targetTiltDeg, dt * 9.0);

        // Turm-Schwenk (basePan) zur Ausrichtung auf den Ball
        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaX, deltaZ));
        const isForehand = deltaX >= 0;
        
        if (p < 0.75) {
          const windupOffset = isForehand ? 26 : -28;
          kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, aimAngleDeg + windupOffset, dt * 10.0);
          kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, isForehand ? 22 : -25, dt * 10.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, isForehand ? 35 : -45, dt * 10.0);
        } else {
          const followOffset = isForehand ? -18 : 20;
          kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, aimAngleDeg + followOffset, dt * 18.0);
          kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, isForehand ? -35 : 38, dt * 18.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, isForehand ? 75 : -80, dt * 18.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, -25, dt * 18.0);
        }
      } else {
        kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, 0, dt * 4.5);
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 4.5);
        kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 0, dt * 4.5);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 0, dt * 4.5);
      }

      // --- KINEMATIK KRAN 2 (NORD-GRUNDLINIE Z = +15.2m) ---
      if (shot.shooter === 1) {
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;

        // 1. DOLLY: Fährt AUSSCHLIESSLICH entlang der Nord-Schienenlinie (X-Achse von -7.5m bis +7.5m)
        const railX = THREE.MathUtils.clamp(targetX * 0.65, -7.5, 7.5);
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 7.5);

        // 2. AUSLEGER (BOOM): Übernimmt den gesamten Tiefenvorschub, Höhe und Winkel
        const deltaX = targetX - kin2.dollyTrack;
        const deltaZ = crane2BaseZ - targetZ; // Vorwärtsdistanz zum Netz
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, idealColY, dt * 7.0);

        const deltaY = targetY - kin2.columnElevation;
        const total3DDist = Math.hypot(distH, deltaY);

        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.34, 0.5, 11.2);
        kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, targetExt, dt * 8.5);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, targetTiltDeg, dt * 9.0);

        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(-deltaX, deltaZ));
        const isForehand = deltaX <= 0;
        
        if (p < 0.75) {
          const windupOffset = isForehand ? -26 : 28;
          kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, aimAngleDeg + windupOffset, dt * 10.0);
          kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, isForehand ? -22 : 25, dt * 10.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, isForehand ? -35 : 45, dt * 10.0);
        } else {
          const followOffset = isForehand ? 18 : -20;
          kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, aimAngleDeg + followOffset, dt * 18.0);
          kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, isForehand ? 35 : -38, dt * 18.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, isForehand ? -75 : 80, dt * 18.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, -25, dt * 18.0);
        }
      } else {
        kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, 0, dt * 4.5);
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 4.5);
        kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, 0, dt * 4.5);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 0, dt * 4.5);
      }
    }

    const currentBallPos = new THREE.Vector3(currentX, currentY, currentZ);
    setBallVisualPos(currentBallPos);

    if (p >= 1.0) {
      const hitter = shot.shooter === 1 ? 2 : 1;
      const hitPos = hitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();

      setImpactBurst({ pos: hitPos, time: Date.now() });

      if (shot.isDecisive && shot.pointWinner) {
        const winner = shot.pointWinner;
        
        setMatchScore(s => {
          let p1 = s.p1Points;
          let p2 = s.p2Points;
          let g1 = s.p1Games;
          let g2 = s.p2Games;
          let s1 = s.p1Sets;
          let s2 = s.p2Sets;

          if (winner === 1) {
            if (p1 === 40 && p2 < 40) {
              p1 = 0; p2 = 0; g1++;
            } else if (p1 === 40 && p2 === 40) {
              p1 = 45;
            } else if (p1 === 45) {
              p1 = 0; p2 = 0; g1++;
            } else if (p2 === 45) {
              p2 = 40;
            } else {
              const seq = [0, 15, 30, 40];
              p1 = seq[seq.indexOf(p1) + 1] || 40;
            }
          } else {
            if (p2 === 40 && p1 < 40) {
              p1 = 0; p2 = 0; g2++;
            } else if (p2 === 40 && p1 === 40) {
              p2 = 45;
            } else if (p2 === 45) {
              p1 = 0; p2 = 0; g2++;
            } else if (p1 === 45) {
              p1 = 40;
            } else {
              const seq = [0, 15, 30, 40];
              p2 = seq[seq.indexOf(p2) + 1] || 40;
            }
          }

          if (g1 >= 6 && g1 - g2 >= 2) {
            s1++;
            g1 = 0;
            g2 = 0;
          } else if (g2 >= 6 && g2 - g1 >= 2) {
            s2++;
            g1 = 0;
            g2 = 0;
          }

          const call = getUmpireScoreCall(p1, p2, g1, g2);

          return {
            ...s,
            p1Points: p1,
            p2Points: p2,
            p1Games: g1,
            p2Games: g2,
            p1Sets: s1,
            p2Sets: s2,
            server: winner,
            rallyCount: 0,
            isCheering: true,
            cheerIntensity: 1.2,
            umpireCall: call,
            lastMessage: `🏆 Punkt für Kran ${winner}! (${shot.endReason})`
          };
        });

        triggerGrandSlamServe(winner);
      } else {
        setMatchScore(s => ({
          ...s,
          rallyCount: s.rallyCount + 1,
          isCheering: false,
          cheerIntensity: Math.max(0, s.cheerIntensity - 0.05),
          lastMessage: `${shot.shotType} • ${shot.speedKmh} km/h`
        }));

        shotRef.current = createNextShot(hitter, hitPos, matchScore.rallyCount + 1);
      }
    }

    if (crane1 && crane1.isLoaded) crane1.updateNodes({ ...kin1, dollyTrack: 0 });
    if (crane2 && crane2.isLoaded) crane2.updateNodes({ ...kin2, dollyTrack: 0 });

    if (orbitControlsRef.current && cameraMode !== 'free') {
      const controls = orbitControlsRef.current;
      if (cameraMode === 'broadcast') {
        controls.target.lerp(new THREE.Vector3(0, 1.2, 0), 0.08);
        camera.position.lerp(new THREE.Vector3(-24, 16.0, 0), 0.08);
      } else if (cameraMode === 'ball') {
        const camTarget = currentBallPos.clone();
        controls.target.lerp(camTarget, 0.18);
        const camOffset = new THREE.Vector3(-8, 5, shot.shooter === 1 ? -9 : 9);
        camera.position.lerp(currentBallPos.clone().add(camOffset), 0.14);
      } else if (cameraMode === 'crane1') {
        controls.target.lerp(new THREE.Vector3(0, 2.2, 8), 0.12);
        camera.position.lerp(racket1WorldPos.current.clone().add(new THREE.Vector3(0, 0.8, -1.8)), 0.16);
      } else if (cameraMode === 'crane2') {
        controls.target.lerp(new THREE.Vector3(0, 2.2, -8), 0.12);
        camera.position.lerp(racket2WorldPos.current.clone().add(new THREE.Vector3(0, 0.8, 1.8)), 0.16);
      } else if (cameraMode === 'umpire') {
        controls.target.lerp(new THREE.Vector3(0, 1.0, 0), 0.1);
        camera.position.lerp(new THREE.Vector3(7.2, 3.4, 0), 0.1);
      } else if (cameraMode === 'spectator') {
        controls.target.lerp(new THREE.Vector3(0, 1.2, 0), 0.08);
        camera.position.lerp(new THREE.Vector3(-18.5, 5.5, 0), 0.08);
      } else if (cameraMode === 'coach') {
        controls.target.lerp(new THREE.Vector3(0, 1.5, 0), 0.1);
        camera.position.lerp(new THREE.Vector3(-8.2, 2.2, -3.2), 0.1);
      }
      controls.update();
    }
  });

  return (
    <>
      <directionalLight
        position={[19.5, 22.5, -33.8]}
        intensity={4.2}
        color="#fffbe8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.0001}
      />
      <ambientLight intensity={0.65} color="#e0f2fe" />
      <directionalLight position={[-20, 16, 20]} intensity={1.5} color="#fde68a" />
      <directionalLight position={[20, 14, 20]} intensity={1.2} color="#38bdf8" />

      <Environment preset={courtSurface === 'grass' ? 'park' : courtSurface === 'hardcourt' ? 'city' : 'sunset'} />

      <TennisCourtArena surface={courtSurface} />

      {/* 🛤️ DOLLY SCHIENEN / RAILS UNTER DEN KRÄNEN */}
      <CraneDollyRailTrack zPos={-15.2} teamColor="#38bdf8" />
      <CraneDollyRailTrack zPos={15.2} teamColor="#facc15" />

      {/* 🪑 Official Chair Umpire & Staff (Togglable) */}
      {showCourtsideStaff && (
        <>
          <TennisUmpire ballPos={ballVisualPos} />
          <TennisCourtsideStaff ballPos={ballVisualPos} isCheering={matchScore.isCheering} />
        </>
      )}

      {/* 👥 Sitzendes Publikum auf echten Stadionsitzen (Togglable) */}
      <TennisStadiumSpectators 
        ballPos={ballVisualPos} 
        isCheering={matchScore.isCheering} 
        cheerIntensity={matchScore.cheerIntensity}
        showSpectators={showSpectators}
        showGrandstands={showGrandstands}
      />

      <ConfettiCelebration active={matchScore.isCheering} />

      {/* KRAN 1 (SÜD) - MIT DEDIZIERTER SCHWERLAST-DOLLY BASE AUF SCHIENEN */}
      <group position={[kin1Ref.current.dollyTrack, 0, -15.2]}>
        <SupertechnoDollyBase teamColor="#38bdf8" />
        <group rotation={[0, Math.PI, 0]}>
          {crane1 && <primitive object={crane1.group} />}
        </group>
      </group>

      <CraneBoomTipRig
        crane={crane1}
        kinematics={kin1Ref.current}
        teamColor="#38bdf8"
        stringGlow="#bae6fd"
        racketWorldPosRef={racket1WorldPos}
      />

      {/* KRAN 2 (NORD) - MIT DEDIZIERTER SCHWERLAST-DOLLY BASE AUF SCHIENEN */}
      <group position={[kin2Ref.current.dollyTrack, 0, 15.2]}>
        <SupertechnoDollyBase teamColor="#facc15" />
        <group rotation={[0, 0, 0]}>
          {crane2 && <primitive object={crane2.group} />}
        </group>
      </group>

      <CraneBoomTipRig
        crane={crane2}
        kinematics={kin2Ref.current}
        teamColor="#facc15"
        stringGlow="#fef08a"
        racketWorldPosRef={racket2WorldPos}
      />

      <group position={[ballVisualPos.x, ballVisualPos.y, ballVisualPos.z]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.13, 32, 32]} />
          <meshStandardMaterial
            color="#d9f99d"
            emissive="#bef264"
            emissiveIntensity={0.5}
            roughness={0.8}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.19, 16, 16]} />
          <meshBasicMaterial color="#bef264" transparent opacity={0.25} />
        </mesh>
      </group>

      {impactBurst && Date.now() - impactBurst.time < 300 && (
        <group position={[impactBurst.pos.x, impactBurst.pos.y, impactBurst.pos.z]}>
          <mesh>
            <ringGeometry args={[0.15, 0.65, 24]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          <pointLight color="#fde047" intensity={6} distance={3.5} />
        </group>
      )}

      <OrbitControls
        ref={orbitControlsRef}
        target={[0, 1.8, 0]}
        minDistance={3}
        maxDistance={75}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />
    </>
  );
}

// --- 🎾 MAIN TENNIS EXPORT CONTAINER & BROADCAST HUD UI ---
export default function CraneTennis() {
  const [courtSurface, setCourtSurface] = useState<CourtSurface>('clay');
  const [cameraMode, setCameraMode] = useState<TennisCameraMode>('broadcast');
  const [isAIvsAI, setIsAIvsAI] = useState(true);
  const [gameSpeed, setGameSpeed] = useState(1.0);
  const [showSpectators, setShowSpectators] = useState(true);
  const [showCourtsideStaff, setShowCourtsideStaff] = useState(true);
  const [showGrandstands, setShowGrandstands] = useState(true);
  const orbitControlsRef = useRef<any>(null);

  const [matchScore, setMatchScore] = useState<MatchScore>({
    p1Points: 15,
    p2Points: 30,
    p1Games: 4,
    p2Games: 3,
    p1Sets: 1,
    p2Sets: 0,
    server: 1,
    lastMessage: 'Match läuft: Roland Garros Masters',
    umpireCall: '15 - 30 (4:3)',
    rallyCount: 4,
    isCheering: false,
    cheerIntensity: 0.0
  });

  const getPointsLabel = (pts: number) => {
    if (pts === 0) return '0';
    if (pts === 15) return '15';
    if (pts === 30) return '30';
    if (pts === 40) return '40';
    if (pts === 45) return 'ADV';
    return '0';
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      <Canvas
        shadows
        camera={{ position: [-24, 16.0, 0], fov: 45 }}
        style={{ width: '100%', height: '100%', outline: 'none', touchAction: 'none' }}
      >
        <color attach="background" args={[courtSurface === 'cyber' ? '#040711' : '#60a5fa']} />
        <CraneTennisScene
          courtSurface={courtSurface}
          cameraMode={cameraMode}
          matchScore={matchScore}
          setMatchScore={setMatchScore}
          isAIvsAI={isAIvsAI}
          gameSpeed={gameSpeed}
          orbitControlsRef={orbitControlsRef}
          showSpectators={showSpectators}
          showCourtsideStaff={showCourtsideStaff}
          showGrandstands={showGrandstands}
        />
      </Canvas>

      {/* --- TOP BROADCAST TV TENNIS SCOREBOARD & UMPIRE CALLOUT --- */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.94)',
        border: '1px solid rgba(250, 204, 21, 0.5)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 24px rgba(250, 204, 21, 0.2)',
        borderRadius: '16px',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        zIndex: 50,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#facc15', fontWeight: 900, letterSpacing: '1px' }}>
            🏆 ATP SUPERTECHNO MASTERS
          </span>
          <span style={{ fontSize: '9px', color: '#94a3b8' }}>
            {courtSurface === 'clay' ? '🧱 ROLAND GARROS' : courtSurface === 'grass' ? '🌿 WIMBLEDON LAWN' : courtSurface === 'hardcourt' ? '🎾 US OPEN' : '⚡ CYBER NIGHT ARENA'}
          </span>
        </div>

        <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.15)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
            <span style={{ color: '#bae6fd', fontWeight: 800, fontSize: '13px' }}>KRAN 1</span>
            <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '14px', fontFamily: 'monospace' }}>
              {getPointsLabel(matchScore.p1Points)}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>
              [{matchScore.p1Games} Games • {matchScore.p1Sets} Sets]
            </span>
          </div>

          <span style={{ color: '#facc15', fontWeight: 900, fontSize: '14px' }}>VS</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#facc15' }} />
            <span style={{ color: '#fde68a', fontWeight: 800, fontSize: '13px' }}>KRAN 2</span>
            <span style={{ background: '#ca8a04', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '14px', fontFamily: 'monospace' }}>
              {getPointsLabel(matchScore.p2Points)}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>
              [{matchScore.p2Games} Games • {matchScore.p2Sets} Sets]
            </span>
          </div>
        </div>

        <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.15)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 900 }}>🪑 SCHIEDSRICHTER:</span>
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 900, fontFamily: 'monospace' }}>
              {matchScore.umpireCall}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: matchScore.isCheering ? '#f43f5e' : '#4ade80', fontWeight: 700 }}>
            {matchScore.isCheering ? `👏 JUBEL! ${matchScore.lastMessage}` : matchScore.lastMessage}
          </div>
        </div>
      </div>

      {/* --- CONTROL DRAWER (LEFT SIDE) --- */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(11, 16, 24, 0.94)',
        color: '#fff',
        padding: '16px',
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        width: '320px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        zIndex: 50
      }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '8px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#facc15', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎾</span> <span>Kran-Tennis Arena</span>
          </h3>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Dolly-Base auf Schienen & Ausleger-Kinematik</div>
        </div>

        {/* 1. Court Surface Selector */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#facc15', marginBottom: '6px' }}>
            🏟️ Tennisplatz-Belag:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { id: 'clay' as const, label: '🧱 Sandplatz', desc: 'Roland Garros', col: '#ea580c' },
              { id: 'grass' as const, label: '🌿 Rasen', desc: 'Wimbledon', col: '#16a34a' },
              { id: 'hardcourt' as const, label: '🎾 Hardcourt', desc: 'US Open Blue', col: '#2563eb' },
              { id: 'cyber' as const, label: '⚡ Cyber Neon', desc: 'Night Stadium', col: '#38bdf8' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCourtSurface(item.id)}
                style={{
                  padding: '6px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: `1px solid ${courtSurface === item.id ? item.col : 'rgba(255,255,255,0.1)'}`,
                  background: courtSurface === item.id ? `${item.col}30` : 'rgba(255,255,255,0.05)',
                  color: courtSurface === item.id ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div>{item.label}</div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Broadcast Camera Selector */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
            🎥 Kamera-Perspektiven:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {[
              { id: 'broadcast' as const, label: '📺 TV Broadcast' },
              { id: 'spectator' as const, label: '👥 Tribüne (Fan)' },
              { id: 'umpire' as const, label: '🪑 Schiedsrichter' },
              { id: 'coach' as const, label: '📋 Trainer-Bank' },
              { id: 'ball' as const, label: '🎾 Ball-Kamera' },
              { id: 'crane1' as const, label: '🏗️ Kran 1 POV' },
              { id: 'crane2' as const, label: '🏗️ Kran 2 POV' },
              { id: 'free' as const, label: '🔓 Freier Orbit' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCameraMode(item.id)}
                style={{
                  padding: '6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: `1px solid ${cameraMode === item.id ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                  background: cameraMode === item.id ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.05)',
                  color: cameraMode === item.id ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 👥 STADION-ELEMENTE & PUBLIKUM TOGGLES (EIN- / AUSBLENDEN) */}
        <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#facc15', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>👥 Stadion & Publikum:</span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>Sichtbarkeit steuern</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => setShowSpectators(!showSpectators)}
              style={{
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '6px',
                border: `1px solid ${showSpectators ? '#4ade80' : 'rgba(255,255,255,0.2)'}`,
                background: showSpectators ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                color: showSpectators ? '#4ade80' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>👥 Publikum auf Tribünen</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{showSpectators ? '✅ SICHTBAR' : '❌ AUSGEBLENDET'}</span>
            </button>

            <button
              onClick={() => setShowCourtsideStaff(!showCourtsideStaff)}
              style={{
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '6px',
                border: `1px solid ${showCourtsideStaff ? '#38bdf8' : 'rgba(255,255,255,0.2)'}`,
                background: showCourtsideStaff ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                color: showCourtsideStaff ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🪑 Schiedsrichter & Ballkinder</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{showCourtsideStaff ? '✅ SICHTBAR' : '❌ AUSGEBLENDET'}</span>
            </button>

            <button
              onClick={() => setShowGrandstands(!showGrandstands)}
              style={{
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '6px',
                border: `1px solid ${showGrandstands ? '#f59e0b' : 'rgba(255,255,255,0.2)'}`,
                background: showGrandstands ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                color: showGrandstands ? '#f59e0b' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🏟️ Beton-Tribünen & LED-Banden</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{showGrandstands ? '✅ SICHTBAR' : '❌ AUSGEBLENDET'}</span>
            </button>
          </div>
        </div>

        {/* 4. Action Button: Crowd Cheer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          <button
            onClick={() => {
              setMatchScore(s => ({
                ...s,
                isCheering: true,
                cheerIntensity: 2.0,
                lastMessage: '🎉 RIESEN-JUBEL & LA OLA WELLE IM STADION!'
              }));
              setTimeout(() => {
                setMatchScore(s => ({ ...s, isCheering: false, cheerIntensity: 0 }));
              }, 4000);
            }}
            style={{
              padding: '8px',
              fontSize: '11px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(244, 63, 94, 0.6)',
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.35), rgba(250, 204, 21, 0.35))',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>🎉</span> <span>La Ola Welle & Jubel</span>
          </button>
        </div>

        {/* 5. Match Simulation Speed & Play Mode */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '6px' }}>
            <span>Match-Geschwindigkeit:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#facc15' }}>{gameSpeed.toFixed(1)}x</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {[0.5, 1.0, 1.5, 2.0].map(spd => (
              <button
                key={`spd-${spd}`}
                onClick={() => setGameSpeed(spd)}
                style={{
                  padding: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: gameSpeed === spd ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.05)',
                  color: gameSpeed === spd ? '#fde047' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Autonomes Match:</span>
            <button
              onClick={() => setIsAIvsAI(!isAIvsAI)}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '4px',
                border: `1px solid ${isAIvsAI ? '#4ade80' : 'rgba(255,255,255,0.2)'}`,
                background: isAIvsAI ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255,255,255,0.08)',
                color: isAIvsAI ? '#4ade80' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              {isAIvsAI ? '🤖 SPIELT' : 'PAUSIERT'}
            </button>
          </div>
        </div>

        {/* 6. Match Actions */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => {
              setMatchScore({
                p1Points: 0,
                p2Points: 0,
                p1Games: 0,
                p2Games: 0,
                p1Sets: 0,
                p2Sets: 0,
                server: 1,
                lastMessage: 'Neues Match gestartet!',
                umpireCall: 'Love-All (0:0)',
                rallyCount: 0,
                isCheering: false,
                cheerIntensity: 0.0
              });
            }}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '11px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.15)',
              color: '#fca5a5',
              cursor: 'pointer'
            }}
          >
            🔄 Match Reset
          </button>
        </div>
      </div>
    </div>
  );
}
