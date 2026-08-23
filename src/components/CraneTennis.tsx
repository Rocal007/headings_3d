import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';
import CraneTennisRacketHead from './CraneTennisRacketHead';

export type CourtSurface = 'clay' | 'grass' | 'hardcourt' | 'cyber';
export type TennisCameraMode = 'broadcast' | 'ball' | 'crane1' | 'crane2' | 'umpire' | 'spectator' | 'coach' | 'smash' | 'free';

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
  spinType?: 'topspin' | 'slice' | 'flat' | 'kick' | 'dropshot';
  rpm?: number;
  speedKmh: number;
  hasBounced: boolean;
  isDecisive: boolean;
  isServe: boolean;
  serveAttempt?: 1 | 2;
  isFault?: boolean;
  servePhase: number;
  isVolley?: boolean;
  isNetRush?: boolean;
  isSmash?: boolean;
  isLob?: boolean;
  isDropShot?: boolean;
  lobKind?: 'topspin_winner' | 'sky_moonball' | 'slice_defense';
  isLobSetup?: boolean;
  volleyKind?: 'drive' | 'stop' | 'reflex' | 'smash' | 'punch';
  isNetError?: boolean;
  isOutError?: boolean;
  isNetCord?: boolean;
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

// --- 🏗️ MOUNTED CRANE PLAYER (PERFECT HIERARCHICAL THREE.JS INTEGRATION - ZERO GAP GUARANTEED) ---
function MountedCranePlayer({
  crane,
  kinematicsRef,
  teamColor,
  stringGlow,
  racketWorldPosRef,
  racketWorldQuatRef,
  baseRotation = 0,
  dollyTrackZ = -15.2,
  dollyGroupRef
}: {
  crane: Supertechno50FBXModel | null;
  kinematicsRef: React.MutableRefObject<{
    dollyTrack: number;
    columnElevation: number;
    basePan: number;
    boomTilt: number;
    teleExtension: number;
    headPan: number;
    headTilt: number;
    headRoll: number;
  }>;
  teamColor: string;
  stringGlow: string;
  racketWorldPosRef: React.MutableRefObject<THREE.Vector3>;
  racketWorldQuatRef?: React.MutableRefObject<THREE.Quaternion>;
  baseRotation?: number;
  dollyTrackZ?: number;
  dollyGroupRef: React.RefObject<THREE.Group | null>;
}) {
  const columnGroupRef = useRef<THREE.Group>(null);
  const boomGroupRef = useRef<THREE.Group>(null);
  const tipGroupRef = useRef<THREE.Group>(null);
  const racketTargetRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const kin = kinematicsRef.current;

    // 1. Synchronize Dolly Base on Tracks
    if (dollyGroupRef.current) {
      dollyGroupRef.current.position.set(kin.dollyTrack, 0, dollyTrackZ);
    }

    // 2. Synchronize Column Lift & Pan Rotation
    if (columnGroupRef.current) {
      columnGroupRef.current.position.y = kin.columnElevation;
      columnGroupRef.current.rotation.y = THREE.MathUtils.degToRad(-kin.basePan || 0);
    }

    // 3. Synchronize Boom Tilt
    if (boomGroupRef.current) {
      boomGroupRef.current.rotation.x = THREE.MathUtils.degToRad(kin.boomTilt || 0);
    }

    // 4. Synchronize 4-Stage Telescopic Tip Position (0 to 11.3m extension)
    if (tipGroupRef.current) {
      const ext = Math.max(0, Math.min(11.3, kin.teleExtension || 0));
      const tExt = ext / 11.3;
      const tipZ = -3.34 - tExt * 11.40;
      tipGroupRef.current.position.set(-0.01, 0.05, tipZ);
    }

    // 5. World Position & Quaternion of Racket Sweet Spot for Hit detection & Racket-Cam POV
    if (racketTargetRef.current) {
      const rPos = new THREE.Vector3();
      const rQuat = new THREE.Quaternion();
      racketTargetRef.current.getWorldPosition(rPos);
      racketTargetRef.current.getWorldQuaternion(rQuat);
      racketWorldPosRef.current.copy(rPos);
      if (racketWorldQuatRef) {
        racketWorldQuatRef.current.copy(rQuat);
      }
    }
  });

  return (
    <group ref={dollyGroupRef} position={[0, 0, dollyTrackZ]}>
      <SupertechnoDollyBase teamColor={teamColor} />
      <group rotation={[0, baseRotation, 0]}>
        {crane && <primitive object={crane.group} />}

        {/* Directly nested in crane local hierarchy: Absolutely ZERO GAP guaranteed */}
        <group ref={columnGroupRef} position={[0, 1.85, 0]}>
          <group ref={boomGroupRef} position={[0, 0, 0]}>
            <group ref={tipGroupRef} position={[-0.01, 0.05, -3.34]}>
              <CraneTennisRacketHead
                kinematicsRef={kinematicsRef}
                teamColor={teamColor}
                stringGlow={stringGlow}
                autoLevel={true}
                position={[0, 0, 0]}
                scale={1.0}
                racketTargetRef={racketTargetRef}
              />
            </group>
          </group>
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
  showSpectators = false,
  showGrandstands = false
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
  showGrandstands,
  manualVolleyTrigger,
  manualSmashTrigger,
  manualTopspinLobTrigger,
  manualSkyLobTrigger,
  manualServiceWinnerTrigger,
  manualDropTrigger,
  manualTopspinTrigger,
  manualLaserTrigger,
  manualSliceTrigger,
  manualNetErrorTrigger,
  manualOutErrorTrigger,
  manualResetTrigger
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
  manualVolleyTrigger?: number;
  manualSmashTrigger?: number;
  manualTopspinLobTrigger?: number;
  manualSkyLobTrigger?: number;
  manualServiceWinnerTrigger?: number;
  manualDropTrigger?: number;
  manualTopspinTrigger?: number;
  manualLaserTrigger?: number;
  manualSliceTrigger?: number;
  manualNetErrorTrigger?: number;
  manualOutErrorTrigger?: number;
  manualResetTrigger?: number;
}) {
  const [crane1, setCrane1] = useState<Supertechno50FBXModel | null>(null);
  const [crane2, setCrane2] = useState<Supertechno50FBXModel | null>(null);

  const showcaseTimerRef = useRef(4.8); // 4.8s Voll-Ausfahr- & Intro-Kamera-Sequenz
  const showcaseTypeRef = useRef<'intro' | 'gamewin'>('intro');

  useEffect(() => {
    if (manualResetTrigger && manualResetTrigger > 0) {
      showcaseTimerRef.current = 4.8;
      showcaseTypeRef.current = 'intro';
    }
  }, [manualResetTrigger]);

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

  const dolly1GroupRef = useRef<THREE.Group>(null);
  const dolly2GroupRef = useRef<THREE.Group>(null);

  const racket1WorldPos = useRef(new THREE.Vector3(0, 2.2, -9.8));
  const racket2WorldPos = useRef(new THREE.Vector3(0, 2.2, 9.8));
  const racket1WorldQuat = useRef(new THREE.Quaternion());
  const racket2WorldQuat = useRef(new THREE.Quaternion());

  const [ballVisualPos, setBallVisualPos] = useState(new THREE.Vector3(0, 2.2, -9.8));
  const [impactBurst, setImpactBurst] = useState<{ pos: THREE.Vector3; time: number } | null>(null);
  const [smashBurst, setSmashBurst] = useState<{ pos: THREE.Vector3; time: number } | null>(null);

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

  const triggerGrandSlamServe = (server: 1 | 2, forceWinner?: boolean, serveAttempt: 1 | 2 = 1) => {
    const receiver = server === 1 ? 2 : 1;
    const targetZ = receiver === 1 ? -9.8 : 9.8;
    const targetX = (Math.random() - 0.5) * 5.2;
    const serverX = server === 1 ? -2.2 : 2.2;
    const serverZ = server === 1 ? -13.5 : 13.5;

    if (serveAttempt === 1) {
      // --- 1. AUFSCHLAG (FIRST SERVICE) ---
      const faultRoll = Math.random();
      const isFault = !forceWinner && faultRoll < 0.28; // 28% Chance auf 1. Aufschlag-Fehler (Netz oder Aus)
      const isSinner = server === 1;

      if (isFault) {
        const isNetFault = Math.random() < 0.55;
        const faultBounceZ = isNetFault ? (receiver === 1 ? -0.5 : 0.5) : (receiver === 1 ? -7.8 : 7.8);
        const faultSpeed = isSinner ? Math.round(224 + Math.random() * 14) : Math.round(218 + Math.random() * 12);
        
        shotRef.current = {
          shooter: server,
          startPos: new THREE.Vector3(serverX, 3.2, serverZ),
          targetPos: new THREE.Vector3(targetX, isNetFault ? 0.85 : 0.2, faultBounceZ),
          bouncePos: new THREE.Vector3(targetX * 0.6, 0.16, faultBounceZ),
          duration: 2.35,
          progress: 0.0,
          netHeight: isNetFault ? 0.92 : 1.5,
          shotType: isNetFault ? `⚠️ ${faultSpeed} km/h 1. AUFSCHLAG (INS NETZ - FAULT)` : `⚠️ ${faultSpeed} km/h 1. AUFSCHLAG (KNAPP IM AUS - FAULT)`,
          strokeSide: 'serve',
          spinType: isSinner ? 'flat' : 'kick',
          rpm: isSinner ? 2150 : 3100,
          speedKmh: faultSpeed,
          hasBounced: false,
          isDecisive: false,
          isServe: true,
          serveAttempt: 1,
          isFault: true,
          servePhase: 0.0,
          endReason: 'FAULT',
          pointWinner: server
        };
        return;
      }

      // Gültiger 1. Aufschlag
      const serveRoll = Math.random();
      const isAce = !forceWinner && serveRoll < 0.06;
      const isServiceWinner = forceWinner || (!isAce && serveRoll < 0.20);
      const isDecisive = isAce || isServiceWinner;
      const speed = isSinner ? Math.round(226 + Math.random() * 12) : Math.round(218 + Math.random() * 12);
      const bounceZ = receiver === 1 ? -6.2 : 6.2;

      let shotType = isSinner ? `🎾 ${speed} km/h SINNER 1. AUFSCHLAG (FLAT BOMB)` : `🎾 ${speed} km/h ALCARAZ 1. AUFSCHLAG (HEAVY KICK)`;
      let endReason = '';

      if (isAce) {
        shotType = isSinner ? `🚀 ${speed} km/h SINNER FLAT-BOMB (DIREKTES ASS)` : `⚡ ${speed} km/h ALCARAZ SLICE-AUFSCHLAG (DIREKTES ASS)`;
        endReason = `ASS (${speed} km/h)`;
      } else if (isServiceWinner) {
        shotType = isSinner ? `🎯 ${speed} km/h SINNER T-LINIEN-AUFSCHLAG (SERVICE WINNER)` : `🎯 ${speed} km/h ALCARAZ KICK-AUFSCHLAG (SERVICE WINNER)`;
        endReason = `SERVICE WINNER (${speed} km/h)`;
      }

      shotRef.current = {
        shooter: server,
        startPos: new THREE.Vector3(serverX, 3.2, serverZ),
        targetPos: new THREE.Vector3(targetX, 2.2, targetZ),
        bouncePos: new THREE.Vector3(targetX * 0.75, 0.16, bounceZ),
        duration: 2.25,
        progress: 0.0,
        netHeight: 1.6,
        shotType,
        strokeSide: 'serve',
        spinType: isSinner ? 'flat' : 'kick',
        rpm: isSinner ? 2200 : 3200,
        speedKmh: speed,
        hasBounced: false,
        isDecisive,
        isServe: true,
        serveAttempt: 1,
        isFault: false,
        servePhase: 0.0,
        endReason,
        pointWinner: server
      };
    } else {
      // --- 2. AUFSCHLAG (SECOND SERVICE) ---
      const isSinner = server === 1;
      const isDoubleFault = !forceWinner && Math.random() < 0.05;
      const speed = isSinner ? Math.round(184 + Math.random() * 12) : Math.round(176 + Math.random() * 14);
      const bounceZ = receiver === 1 ? -5.8 : 5.8;

      if (isDoubleFault) {
        const doubleFaultZ = receiver === 1 ? -0.2 : 0.2;
        shotRef.current = {
          shooter: server,
          startPos: new THREE.Vector3(serverX, 3.2, serverZ),
          targetPos: new THREE.Vector3(targetX, 0.75, doubleFaultZ),
          bouncePos: new THREE.Vector3(targetX * 0.6, 0.16, doubleFaultZ),
          duration: 2.25,
          progress: 0.0,
          netHeight: 0.88,
          shotType: `❌ 2. AUFSCHLAG DOPPELFEHLER (Punkt für ${receiver === 1 ? 'Sinner' : 'Alcaraz'})`,
          strokeSide: 'serve',
          spinType: 'kick',
          rpm: 2800,
          speedKmh: speed,
          hasBounced: false,
          isDecisive: true,
          isServe: true,
          serveAttempt: 2,
          isFault: true,
          servePhase: 0.0,
          endReason: 'DOUBLE FAULT',
          pointWinner: receiver
        };
      } else {
        shotRef.current = {
          shooter: server,
          startPos: new THREE.Vector3(serverX, 3.2, serverZ),
          targetPos: new THREE.Vector3(targetX, 2.2, targetZ),
          bouncePos: new THREE.Vector3(targetX * 0.75, 0.16, bounceZ),
          duration: 2.25,
          progress: 0.0,
          netHeight: 1.75,
          shotType: isSinner ? `🎾 ${speed} km/h SINNER 2. AUFSCHLAG (TOPSPIN DRIVE)` : `🎾 ${speed} km/h ALCARAZ 2. AUFSCHLAG (3.400 RPM HEAVY KICK)`,
          strokeSide: 'serve',
          spinType: 'kick',
          rpm: isSinner ? 2750 : 3400,
          speedKmh: speed,
          hasBounced: false,
          isDecisive: false,
          isServe: true,
          serveAttempt: 2,
          isFault: false,
          servePhase: 0.0,
          endReason: '',
          pointWinner: server
        };
      }
    }
  };

  const createNextShot = (
    fromHitter: 1 | 2,
    startPosition: THREE.Vector3,
    currentRally: number,
    forceMode?: 'volley' | 'smash' | 'lob_smash' | 'topspin_lob' | 'sky_lob' | 'stop' | 'net_error' | 'out_error'
  ): RallyShot => {
    const nextHitter = fromHitter === 1 ? 2 : 1;
    const isSinner = fromHitter === 1;
    const isAlcaraz = fromHitter === 2;
    const prevShot = shotRef.current;
    
    // Prüfen, ob der vorherige Schlag eine hohe defensive Kerze (Lob) war
    const wasIncomingLob = prevShot && (prevShot.isLobSetup || (prevShot.isLob && prevShot.lobKind === 'sky_moonball'));

    // Prüfen, ob der schlagende Kran am Netz steht (|Z| <= 5.2m)
    const wasShooterAtNet = Math.abs(startPosition.z) <= 5.2;

    // --- TAKTISCHE ENTSCHEIDUNGS-MATRIX: WER, WANN, WIE OFT ---
    // 1. Stoppball (Disguised Drop Shot): Alcaraz 20% ab Rally 2 (Signature Move), Sinner nur selten 4%
    const wantsDropShot = forceMode === 'stop' || (!wasIncomingLob && isAlcaraz && currentRally >= 2 && Math.random() < 0.20) || (isSinner && currentRally >= 4 && Math.random() < 0.04);

    // 2. Smash (Schmetterball): Bei hohem Lob (Alcaraz 92%, Sinner 85%)
    const wantsDirectSmash = forceMode === 'smash' || wasIncomingLob;

    // 3. Topspin-Lob Winner: Wenn der Gegner am Netz steht (Alcaraz 45%, Sinner 35%)
    const wantsTopspinLob = !wantsDirectSmash && (forceMode === 'topspin_lob' || (!wasIncomingLob && wasShooterAtNet && ((isAlcaraz && Math.random() < 0.45) || (isSinner && Math.random() < 0.35))));

    // 4. Defensive Sky-Notkerze: Aus Bedrängnis in die Flutlichter (Alcaraz 24%, Sinner 12%)
    const wantsSkyLob = !wantsDirectSmash && !wantsTopspinLob && (forceMode === 'sky_lob' || forceMode === 'lob_smash' || (!wasShooterAtNet && !wasIncomingLob && currentRally >= 3 && ((isAlcaraz && Math.random() < 0.24) || (isSinner && Math.random() < 0.12))));

    // 5. Netzangriff & Drive-Volley: Alcaraz 28% All-Court Rushes, Sinner 12%
    const wantsNetVolley = !wantsDirectSmash && !wantsSkyLob && !wantsTopspinLob && (
      forceMode === 'volley' || wantsDropShot || (!wasShooterAtNet && ((isAlcaraz && currentRally >= 1 && Math.random() < 0.28) || (isSinner && currentRally >= 3 && Math.random() < 0.12)))
    );

    // 6. Schlagseite (Vorhand vs. Rückhand Häufigkeit):
    // Sinner: 52% Vorhand, 48% Rückhand (Weltklasse-Balance, stärkste Rückhand der Tour)
    // Alcaraz: 65% Vorhand (umläuft aktiv die Rückhand für Inside-Out), 35% Rückhand
    const forehandRatio = isAlcaraz ? 0.65 : 0.52;
    const strokeSide: 'forehand' | 'backhand' = Math.random() < forehandRatio ? 'forehand' : 'backhand';

    // 7. Spin vs. Slice bei Rückhand:
    // Alcaraz nutzt zu 38% giftigen Backhand-Slice (Tempowechsel & flacher Absprung), Sinner zu 92% beidhändigen Flat/Topspin-Laser
    const isBackhandSlice = strokeSide === 'backhand' && ((isAlcaraz && Math.random() < 0.38) || (isSinner && Math.random() < 0.08));

    let targetZ: number;
    let targetY: number;
    let targetX = (Math.random() - 0.5) * 5.8;
    let isVolley = false;
    let isNetRush = false;
    let isSmash = false;
    let isLob = false;
    let isLobSetup = false;
    let isDropShot = false;
    let isNetError = false;
    let isOutError = false;
    let isNetCord = false;
    let lobKind: 'topspin_winner' | 'sky_moonball' | 'slice_defense' | undefined = undefined;
    let volleyKind: 'drive' | 'stop' | 'reflex' | 'smash' | 'punch' | undefined = undefined;
    let spinType: 'topspin' | 'slice' | 'flat' | 'kick' | 'dropshot' = 'topspin';
    let rpm = 2500;

    let chosenType = '';
    let speed = 175;
    let endReason = '';
    let isDecisive = currentRally >= 6 && Math.random() > 0.65;
    let pointWinner: 1 | 2 = fromHitter;

    // Realistische ATP-Fehlerquote: ca. 28% aller offenen Schläge in Rallyes resultieren in einem Fehler (Out oder Netz)
    const isErrorChance = !forceMode && !wantsDirectSmash && !wantsTopspinLob && !wantsSkyLob && !wantsNetVolley && currentRally >= 2 && Math.random() < 0.28;

    if (forceMode === 'out_error' || (isErrorChance && Math.random() < 0.58)) {
      // ⚠️ OUT-FEHLER (58% aller Fehler nach realer ATP-Tour-Statistik: Grundlinie überzogen oder Seitenaus/Korridor)
      isOutError = true;
      isDecisive = true;
      pointWinner = nextHitter;
      speed = Math.round(148 + Math.random() * 32);
      spinType = strokeSide === 'backhand' && isAlcaraz ? 'slice' : (strokeSide === 'forehand' && isAlcaraz ? 'topspin' : 'flat');
      rpm = isAlcaraz ? 3100 : 2250;

      // 60% Grundlinie überzogen (Deep Out), 40% Seitenaus / Korridor (Wide Out)
      const isDeepOut = Math.random() < 0.60;
      let cmOut: number;

      if (isDeepOut) {
        // Deep Out: Ball segelt über die Grundlinie (Z = 11.885m) hinaus
        cmOut = Math.round(2 + Math.random() * 12);
        const outDistM = cmOut / 100;
        targetZ = nextHitter === 1 ? (-11.885 - outDistM - 0.4) : (11.885 + outDistM + 0.4);
        targetX = (Math.random() - 0.5) * 5.6;
        targetY = 0.9 + Math.random() * 0.4;

        if (isSinner) {
          chosenType = strokeSide === 'backhand'
            ? `⚠️ OUT! 132 km/h SINNER RÜCKHAND-LASER KNAPP IM AUS (${cmOut} cm hinter der Grundlinie)`
            : `⚠️ OUT! SINNER FLAT-VORHAND ZU LANG (${cmOut} cm Grundlinien-Aus)`;
          endReason = `SINNER OUT (${cmOut} cm Grundlinie)`;
        } else {
          chosenType = strokeSide === 'forehand'
            ? `⚠️ OUT! 3.200 RPM ALCARAZ TOPSPIN ÜBERZOGEN (${cmOut} cm hinter der Grundlinie)`
            : `⚠️ OUT! ALCARAZ SLICE SEGELT INS AUS (${cmOut} cm zu lang)`;
          endReason = `ALCARAZ OUT (${cmOut} cm Grundlinie)`;
        }
      } else {
        // Wide Out: Ball verzieht seitlich in den Korridor / ins Seitenaus (X = 4.115m)
        cmOut = Math.round(2 + Math.random() * 9);
        const isRight = Math.random() > 0.5;
        const outDistM = cmOut / 100;
        targetX = isRight ? (4.115 + outDistM + 0.3) : (-4.115 - outDistM - 0.3);
        targetZ = nextHitter === 1 ? (-7.0 - Math.random() * 4.2) : (7.0 + Math.random() * 4.2);
        targetY = 0.8 + Math.random() * 0.4;

        if (isSinner) {
          chosenType = `⚠️ OUT! SINNER INSIDE-OUT VORHAND KNAPP IM SEITENAUS (${cmOut} cm im Korridor)`;
          endReason = `SINNER OUT (${cmOut} cm Seitenaus)`;
        } else {
          chosenType = `⚠️ OUT! ALCARAZ CROSS-WINKEL ZU WEIT (${cmOut} cm im Seitenaus)`;
          endReason = `ALCARAZ OUT (${cmOut} cm Seitenaus)`;
        }
      }

      const bouncePos = new THREE.Vector3(targetX, 0.16, targetZ * 0.96);

      return {
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos,
        duration: 1.15,
        progress: 0.0,
        netHeight: 1.55,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: true,
        isServe: false,
        servePhase: 0.0,
        isOutError: true,
        endReason,
        pointWinner
      };
    } else if (forceMode === 'net_error' || (isErrorChance && Math.random() < 0.92)) {
      // 🕸️ NETZFEHLER (37% aller Fehler: Ball bleibt im Netz / an der Netzkante hängen)
      isNetError = true;
      isDecisive = true;
      pointWinner = nextHitter; // Punkt für den Gegner!
      speed = Math.round(135 + Math.random() * 25);
      targetZ = nextHitter === 1 ? -0.1 : 0.1;
      targetY = 0.72 + Math.random() * 0.15;
      targetX = (Math.random() - 0.5) * 3.5;
      
      if (isSinner) {
        chosenType = strokeSide === 'backhand' 
          ? '🕸️ SINNER RÜCKHAND IM NETZ (Unforced Error am Netzkabel)' 
          : '🕸️ SINNER VORHAND-FEHLER (Knapp im Netz hängengeblieben)';
        endReason = 'SINNER NETZFEHLER (Unforced Error)';
      } else {
        chosenType = strokeSide === 'backhand' 
          ? '🕸️ ALCARAZ SLICE IM NETZ (Giftiger Ball zu tief angesetzt)' 
          : '🕸️ ALCARAZ HEAVY-TOPSPIN IM NETZ (Netzkanten-Fehler)';
        endReason = 'ALCARAZ NETZFEHLER (Unforced Error)';
      }

      return {
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: new THREE.Vector3(targetX, 0.16, targetZ),
        duration: 0.95,
        progress: 0.0,
        netHeight: targetY,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: true,
        isServe: false,
        servePhase: 0.0,
        isNetError: true,
        endReason,
        pointWinner
      };
    } else if (!forceMode && currentRally >= 4 && Math.random() < 0.05) {
      // 💫 NETZROLLER DRAMA (5% aller Fehler/Glücksbälle: Ball touchiert das Netzkabel)
      isNetCord = true;
      isDecisive = true;
      pointWinner = fromHitter;
      speed = 118;
      targetZ = nextHitter === 1 ? (-2.4 - Math.random() * 1.4) : (2.4 + Math.random() * 1.4);
      targetX = (Math.random() - 0.5) * 3.5;
      targetY = 0.4;
      chosenType = '💫 NETZROLLER! (Ball touchiert das Netzkabel und tropft unerreichbar ins Feld)';
      endReason = 'NETZROLLER WINNER (Net Cord)';

      return {
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: new THREE.Vector3(targetX, 0.16, targetZ),
        duration: 1.45,
        progress: 0.0,
        netHeight: 1.05,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: true,
        isServe: false,
        servePhase: 0.0,
        isNetCord: true,
        endReason,
        pointWinner
      };
    } else if (wantsTopspinLob) {
      // 🌈 10.5m TOPSPIN-LOB WINNER
      isLob = true;
      lobKind = 'topspin_winner';
      isDecisive = true;
      pointWinner = fromHitter;
      speed = Math.round(165 + Math.random() * 15);
      spinType = 'topspin';
      rpm = isAlcaraz ? 3250 : 2600;
      
      targetX = (Math.random() - 0.5) * 4.6;
      targetZ = nextHitter === 1 ? (-12.8 - Math.random() * 1.4) : (12.8 + Math.random() * 1.4);
      targetY = 1.1;
      const bounceZ = nextHitter === 1 ? -11.4 : 11.4;
      const bouncePosition = new THREE.Vector3(targetX, 0.16, bounceZ);

      if (isSinner) {
        chosenType = '🌈 10.5m SINNER TOPSPIN-LOB WINNER (Millimetergenau auf die Grundlinie)';
        endReason = 'SINNER LOB WINNER';
      } else {
        chosenType = '🌈 10.5m ALCARAZ AKROBATIK-LOB (Aus vollem Lauf über den Ausleger)';
        endReason = 'ALCARAZ LOB WINNER';
      }

      return {
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: bouncePosition,
        duration: 1.72,
        progress: 0.0,
        netHeight: 10.5,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive,
        isServe: false,
        servePhase: 0.0,
        isLob: true,
        lobKind: 'topspin_winner',
        endReason,
        pointWinner
      };
    } else if (wantsSkyLob) {
      // 🛡️ 11.2m HOHE DEFENSIVE SKY-NOTKERZE
      isLob = true;
      isLobSetup = true;
      lobKind = 'sky_moonball';
      speed = 110;
      spinType = 'slice';
      rpm = 1800;
      targetZ = nextHitter === 1 ? -6.5 : 6.5;
      targetY = 2.9;
      const bouncePosition = new THREE.Vector3(targetX * 0.5, 0.16, targetZ);

      return {
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: bouncePosition,
        duration: 1.95,
        progress: 0.0,
        netHeight: 11.2,
        shotType: isSinner ? '🛡️ 11.2m SINNER DEFENSIV-KERZE (Flug in die Flutlichter)' : '🛡️ 11.2m ALCARAZ NOTKERZE (Defensiver Sky-Moonball)',
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: false,
        isServe: false,
        servePhase: 0.0,
        isLob: true,
        isLobSetup: true,
        lobKind: 'sky_moonball',
        endReason: '',
        pointWinner
      };
    } else if (wantsDirectSmash) {
      // 🔥 MONSTER-SMASH
      isSmash = true;
      speed = isAlcaraz ? Math.round(246 + Math.random() * 12) : Math.round(240 + Math.random() * 10);
      spinType = 'flat';
      rpm = 2200;
      
      const isSmashWinner = forceMode === 'smash' ? (Math.random() < 0.60) : (Math.random() < 0.40);
      isDecisive = isSmashWinner;
      pointWinner = fromHitter;

      const frontCourtZ = nextHitter === 1 ? (-2.8 - Math.random() * 2.2) : (2.8 + Math.random() * 2.2);

      if (isSmashWinner) {
        const grandstandZ = nextHitter === 1 ? -17.8 : 17.8;
        if (isAlcaraz) {
          chosenType = '🔥 248 km/h CARLITOS MONSTER-SMASH WINNER (Rebound über die Stadionwand)';
          endReason = `ALCARAZ SMASH (${speed} km/h)`;
        } else {
          chosenType = '🚀 244 km/h SINNER ÜBERKOPF-HAMMER (Boden-Einschlag & Tribünen-Kick)';
          endReason = `SINNER SMASH (${speed} km/h)`;
        }

        targetX = (Math.random() - 0.5) * 5.2;
        targetY = 5.2;
        targetZ = grandstandZ;
      } else {
        // 🛡️ SMASH WIRD AN DER GRUNDLINIE ERWISCHT
        const returnZ = nextHitter === 1 ? (-11.2 - Math.random() * 2.2) : (11.2 + Math.random() * 2.2);
        chosenType = nextHitter === 1 ? '🔥 242 km/h SCHMETTERBALL ➜ 🛡️ SINNER REFLEX-DIG AN DER GRUNDLINIE!' : '🔥 242 km/h SCHMETTERBALL ➜ 🛡️ ALCARAZ HECHTSPRUNG-RETURN!';
        endReason = '';

        targetX = (Math.random() - 0.5) * 4.6;
        targetY = 2.4 + Math.random() * 0.8;
        targetZ = returnZ;
      }

      const bouncePosition = new THREE.Vector3(targetX * 0.75, 0.16, frontCourtZ);

      return {
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: bouncePosition,
        duration: isSmashWinner ? 0.68 : 0.88,
        progress: 0.0,
        netHeight: 1.2,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive,
        isServe: false,
        servePhase: 0.0,
        isSmash: true,
        endReason,
        pointWinner
      };
    } else if (wantsDropShot) {
      // 💫 DISGUISED STOPPBALL (DROP SHOT) - ALCARAZ SIGNATURE WEAPON
      isDropShot = true;
      speed = Math.round(88 + Math.random() * 20);
      spinType = 'dropshot';
      rpm = isAlcaraz ? 2600 : 2100;
      targetZ = nextHitter === 1 ? (-2.2 - Math.random() * 1.4) : (2.2 + Math.random() * 1.4);
      targetY = 1.1;
      targetX = (Math.random() - 0.5) * 4.4;

      const dropBounceZ = nextHitter === 1 ? (-1.8 - Math.random() * 0.8) : (1.8 + Math.random() * 0.8);
      const dropBouncePos = new THREE.Vector3(targetX, 0.16, dropBounceZ);

      if (isAlcaraz) {
        chosenType = `💫 ${speed} km/h ALCARAZ DISGUISED STOPPBALL (2.600 RPM Backspin • Signature Move 👑)`;
        endReason = 'ALCARAZ DROP-SHOT WINNER';
      } else {
        chosenType = `🎯 ${speed} km/h SINNER GEFÜHLVOLLER STOPPBALL (Kurz hinters Netzkabel)`;
        endReason = 'SINNER DROP-SHOT WINNER';
      }

      return {
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: dropBouncePos,
        duration: 1.45,
        progress: 0.0,
        netHeight: 1.18,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: isDecisive || Math.random() < 0.45,
        isServe: false,
        servePhase: 0.0,
        isDropShot: true,
        isNetError,
        isOutError,
        isNetCord,
        endReason,
        pointWinner
      };
    } else if (wantsNetVolley) {
      // 🎾 RECEIVER RÜCKT WEIT VOR ANS NETZ
      isVolley = true;
      isNetRush = true;
      targetZ = nextHitter === 1 ? (-1.8 - Math.random() * 2.0) : (1.8 + Math.random() * 2.0);

      if (forceMode === 'volley') {
        volleyKind = 'drive';
      } else {
        const vTypes: Array<'drive' | 'stop' | 'reflex' | 'smash' | 'punch'> = ['drive', 'stop', 'reflex', 'punch'];
        volleyKind = vTypes[Math.floor(Math.random() * vTypes.length)];
      }

      if (volleyKind === 'stop' || volleyKind === 'reflex') {
        targetY = 1.1 + Math.random() * 0.4;
      } else {
        targetY = 1.5 + Math.random() * 0.6;
      }

      if (isDecisive) {
        if (volleyKind === 'stop') {
          chosenType = isAlcaraz ? '💫 GENIALER ALCARAZ STOPPVOLLEY WINNER (Direkt am Netzkabel)' : '🎯 GEFÜHLVOLLER SINNER STOPPVOLLEY WINNER';
          endReason = 'STOPPVOLLEY WINNER';
          speed = 135;
          spinType = 'slice';
          rpm = 2400;
        } else if (strokeSide === 'forehand') {
          chosenType = isAlcaraz ? '⚡ 216 km/h ALCARAZ DRIVE-VOLLEY WINNER (Am Netz)' : '⚡ 212 km/h SINNER VORHAND-DRIVE-VOLLEY WINNER';
          endReason = 'DRIVE-VOLLEY WINNER';
          speed = 214;
          spinType = 'topspin';
          rpm = 2800;
        } else {
          chosenType = isSinner ? '⚡ 132 km/h SINNER RÜCKHAND-LASER VOLLEY WINNER' : '🚀 204 km/h ALCARAZ RÜCKHAND-CROSS-VOLLEY WINNER';
          endReason = 'CROSS-VOLLEY WINNER';
          speed = 204;
          spinType = 'flat';
          rpm = 2200;
        }
        pointWinner = nextHitter;
      } else {
        if (volleyKind === 'stop') {
          chosenType = isAlcaraz ? '💫 ALCARAZ DISGUISED STOPPBALL (Gefühlvoll ans Netzkabel)' : '🎯 SINNER NETZ-STOPPVOLLEY';
          speed = 130;
          spinType = 'slice';
          rpm = 2200;
        } else if (volleyKind === 'reflex') {
          chosenType = '⚡ BLITZSCHNELLER REFLEX-VOLLEY AM NETZKABEL';
          speed = 198;
          spinType = 'flat';
          rpm = 2000;
        } else if (strokeSide === 'forehand') {
          chosenType = isAlcaraz ? '🌪️ ALCARAZ VORHAND-VOLLEY DIREKTABNAHME' : '⚡ SINNER VORHAND-VOLLEY PUNCH';
          speed = 192;
          spinType = 'topspin';
          rpm = 2600;
        } else {
          chosenType = isSinner ? '⚡ SINNER 2-HAND-RÜCKHAND VOLLEY' : '🌀 ALCARAZ RÜCKHAND-PUNCH-VOLLEY';
          speed = 188;
          spinType = 'flat';
          rpm = 2100;
        }
      }
    } else if (wasShooterAtNet) {
      const isDrop = Math.random() < 0.35;
      if (isDrop) {
        targetZ = nextHitter === 1 ? (-2.8 - Math.random() * 1.8) : (2.8 + Math.random() * 1.8);
        targetY = 1.3 + Math.random() * 0.4;
        targetX = (Math.random() - 0.5) * 4.2;
      } else {
        targetZ = nextHitter === 1 ? -10.2 : 10.2;
        targetY = 1.6 + Math.random() * 0.8;
      }
    } else {
      targetZ = nextHitter === 1 ? -9.8 : 9.8;
      targetY = 1.7 + Math.random() * 0.9;
    }

    if (!isVolley && !isSmash && !isLobSetup && !isDropShot && !isNetError && !isOutError && !isNetCord) {
      if (isDecisive) {
        if (isSinner) {
          // --- JANNIK SINNER WINNER SCHLÄGE ---
          if (strokeSide === 'backhand') {
            chosenType = '⚡ 132 km/h SINNER RÜCKHAND-LASER (Down-the-Line • ATP Tour-Best!)';
            endReason = 'SINNER BACKHAND LASER';
            speed = 132;
            spinType = 'flat';
            rpm = 2200;
          } else {
            chosenType = '💥 176 km/h SINNER FLAT-VORHAND WINNER (Tiefe Grundlinien-Laser)';
            endReason = 'SINNER FOREHAND WINNER';
            speed = 176;
            spinType = 'flat';
            rpm = 2287;
          }
        } else {
          // --- CARLOS ALCARAZ WINNER SCHLÄGE ---
          if (strokeSide === 'forehand') {
            chosenType = '🌪️ 3.200 RPM ALCARAZ HEAVY-TOPSPIN WINNER (Inside-Out Winkel)';
            endReason = 'ALCARAZ FOREHAND WINNER';
            speed = 182;
            spinType = 'topspin';
            rpm = 3200;
          } else {
            chosenType = '🚀 208 km/h ALCARAZ RÜCKHAND-LONGLINE PASSINGSHOT (Aus vollem Spagat)';
            endReason = 'ALCARAZ PASSINGSHOT';
            speed = 208;
            spinType = 'topspin';
            rpm = 2900;
          }
        }
        pointWinner = fromHitter;
      } else {
        if (isSinner) {
          // --- SINNER GRUNDLINIENSCHLÄGE ---
          if (strokeSide === 'forehand') {
            const fShots = [
              '💥 2.287 RPM SINNER FLAT-VORHAND (Hohe Grundlinien-Geschwindigkeit)',
              '⚡ SINNER INSIDE-OUT VORHAND (Präzision in die Ecken)',
              '🎯 SINNER VORHAND-CROSS (Aggressive Länge)'
            ];
            chosenType = fShots[Math.floor(Math.random() * fShots.length)];
            speed = Math.round(168 + Math.random() * 18);
            spinType = 'flat';
            rpm = 2287;
          } else {
            if (isBackhandSlice) {
              chosenType = '🎯 SINNER DEFENSIV-SLICE (Tiefe Grundlinien-Stabilisierung)';
              speed = Math.round(118 + Math.random() * 10);
              spinType = 'slice';
              rpm = 2100;
            } else {
              const bShots = [
                '⚡ 130 km/h SINNER 2-HAND-RÜCKHAND (Laser-Geschwindigkeit)',
                '🚀 SINNER RÜCKHAND-CROSS-SPEED (Ice-Cold Placement)',
                '🎯 SINNER RÜCKHAND-LONGLINE DRIVE (34% Down-the-Line)'
              ];
              chosenType = bShots[Math.floor(Math.random() * bShots.length)];
              speed = Math.round(126 + Math.random() * 10);
              spinType = 'flat';
              rpm = 2200;
            }
          }
        } else {
          // --- ALCARAZ GRUNDLINIENSCHLÄGE ---
          if (strokeSide === 'forehand') {
            const fShots = [
              '🌪️ 3.200 RPM ALCARAZ HEAVY-TOPSPIN (Hoher aggressiver Absprung)',
              '💥 ALCARAZ POWER-VORHAND (Mit dynamischem Absprung)',
              '💫 ALCARAZ INSIDE-IN FOREHAND (Peitsche in die Vorhand-Ecke)'
            ];
            chosenType = fShots[Math.floor(Math.random() * fShots.length)];
            speed = Math.round(165 + Math.random() * 22);
            spinType = 'topspin';
            rpm = 3200;
          } else {
            if (isBackhandSlice) {
              chosenType = '🌀 3.100 RPM ALCARAZ BACKHAND-SLICE (Flacher, giftiger Ballsprung)';
              speed = Math.round(112 + Math.random() * 14);
              spinType = 'slice';
              rpm = 3100;
            } else {
              const bShots = [
                '🚀 ALCARAZ RÜCKHAND-DRIVE (Vollgas aus der Drehung)',
                '🎯 ALCARAZ RÜCKHAND-CROSS TOPSPIN (Hohe Rotation)'
              ];
              chosenType = bShots[Math.floor(Math.random() * bShots.length)];
              speed = Math.round(138 + Math.random() * 25);
              spinType = 'topspin';
              rpm = 2850;
            }
          }
        }
      }
    }

    const isFast = chosenType.includes('WINNER') || speed > 200 || isVolley;
    const duration = isNetError ? 0.95 : isNetCord ? 1.45 : (isVolley ? 0.92 : (isFast ? 1.02 : (spinType === 'slice' ? 1.35 : 1.25)));
    const netHeight = isNetError ? (0.75 + Math.random() * 0.14) : isNetCord ? 1.05 : (isVolley ? (1.30 + Math.random() * 0.35) : (spinType === 'slice' ? 1.25 : (spinType === 'topspin' ? 1.95 : 1.65)));

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
      spinType,
      rpm,
      speedKmh: speed,
      hasBounced: false,
      isDecisive,
      isServe: false,
      servePhase: 0.0,
      isVolley,
      isNetRush,
      isSmash,
      isLob,
      isDropShot,
      lobKind,
      isLobSetup,
      volleyKind,
      isNetError,
      isOutError,
      isNetCord,
      endReason,
      pointWinner
    };
  };

  const lastVolleyTrigger = useRef(manualVolleyTrigger || 0);
  const lastSmashTrigger = useRef(manualSmashTrigger || 0);
  const lastTopspinLobTrigger = useRef(manualTopspinLobTrigger || 0);
  const lastSkyLobTrigger = useRef(manualSkyLobTrigger || 0);
  const lastServiceWinnerTrigger = useRef(manualServiceWinnerTrigger || 0);
  const lastDropTrigger = useRef(manualDropTrigger || 0);
  const lastTopspinTrigger = useRef(manualTopspinTrigger || 0);
  const lastLaserTrigger = useRef(manualLaserTrigger || 0);
  const lastSliceTrigger = useRef(manualSliceTrigger || 0);
  const lastNetErrorTrigger = useRef(manualNetErrorTrigger || 0);
  const lastOutErrorTrigger = useRef(manualOutErrorTrigger || 0);
  const celebrationTimerRef = useRef(0);
  const celebrationWinnerRef = useRef<1 | 2 | null>(null);

  useEffect(() => {
    if (manualVolleyTrigger && manualVolleyTrigger !== lastVolleyTrigger.current) {
      lastVolleyTrigger.current = manualVolleyTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'volley');
      setMatchScore(s => ({
        ...s,
        lastMessage: '⚡ NETZANGRIFF! Volley-Duell am Netz ausgelöst!'
      }));
    }
  }, [manualVolleyTrigger]);

  useEffect(() => {
    if (manualSmashTrigger && manualSmashTrigger !== lastSmashTrigger.current) {
      lastSmashTrigger.current = manualSmashTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'smash');
      setMatchScore(s => ({
        ...s,
        lastMessage: '🔥 248 km/h MONSTER-SMASH AUSGELÖST!'
      }));
    }
  }, [manualSmashTrigger]);

  useEffect(() => {
    if (manualTopspinLobTrigger && manualTopspinLobTrigger !== lastTopspinLobTrigger.current) {
      lastTopspinLobTrigger.current = manualTopspinLobTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'topspin_lob');
      setMatchScore(s => ({
        ...s,
        lastMessage: '🌈 10.5m TOPSPIN-LOB WINNER AUSGELÖST!'
      }));
    }
  }, [manualTopspinLobTrigger]);

  useEffect(() => {
    if (manualSkyLobTrigger && manualSkyLobTrigger !== lastSkyLobTrigger.current) {
      lastSkyLobTrigger.current = manualSkyLobTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'sky_lob');
      setMatchScore(s => ({
        ...s,
        lastMessage: '🛡️ 11.2m DEFENSIVE NOT-KERZE (SKY-LOB)!'
      }));
    }
  }, [manualSkyLobTrigger]);

  useEffect(() => {
    if (manualServiceWinnerTrigger && manualServiceWinnerTrigger !== lastServiceWinnerTrigger.current) {
      lastServiceWinnerTrigger.current = manualServiceWinnerTrigger;
      const currentServer = matchScore.server;
      triggerGrandSlamServe(currentServer, true);
      setMatchScore(s => ({
        ...s,
        lastMessage: '🎯 228 km/h SERVICE WINNER (Return-Fehler) AUSGELÖST!'
      }));
    }
  }, [manualServiceWinnerTrigger]);

  useEffect(() => {
    if (manualDropTrigger && manualDropTrigger !== lastDropTrigger.current) {
      lastDropTrigger.current = manualDropTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'stop');
      setMatchScore(s => ({
        ...s,
        lastMessage: '💫 2.600 RPM ALCARAZ DISGUISED STOPPBALL AUSGELÖST!'
      }));
    }
  }, [manualDropTrigger]);

  useEffect(() => {
    if (manualTopspinTrigger && manualTopspinTrigger !== lastTopspinTrigger.current) {
      lastTopspinTrigger.current = manualTopspinTrigger;
      const currentHitter = 2; // Alcaraz Signature Topspin
      const currentPos = racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1);
      setMatchScore(s => ({
        ...s,
        lastMessage: '🌪️ 3.200 RPM HEAVY-TOPSPIN WINNER AUSGELÖST!'
      }));
    }
  }, [manualTopspinTrigger]);

  useEffect(() => {
    if (manualLaserTrigger && manualLaserTrigger !== lastLaserTrigger.current) {
      lastLaserTrigger.current = manualLaserTrigger;
      const currentHitter = 1; // Sinner Signature Backhand Laser
      const currentPos = racket1WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1);
      setMatchScore(s => ({
        ...s,
        lastMessage: '⚡ 132 km/h SINNER RÜCKHAND-LASER AUSGELÖST!'
      }));
    }
  }, [manualLaserTrigger]);

  useEffect(() => {
    if (manualSliceTrigger && manualSliceTrigger !== lastSliceTrigger.current) {
      lastSliceTrigger.current = manualSliceTrigger;
      const currentHitter = 2; // Alcaraz Signature Backhand Slice
      const currentPos = racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1);
      setMatchScore(s => ({
        ...s,
        lastMessage: '🌀 3.100 RPM ALCARAZ BACKHAND-SLICE AUSGELÖST!'
      }));
    }
  }, [manualSliceTrigger]);

  useEffect(() => {
    if (manualNetErrorTrigger && manualNetErrorTrigger !== lastNetErrorTrigger.current) {
      lastNetErrorTrigger.current = manualNetErrorTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'net_error');
      setMatchScore(s => ({
        ...s,
        lastMessage: '🕸️ NETZFEHLER! Ball bleibt im Netz hängen!'
      }));
    }
  }, [manualNetErrorTrigger]);

  useEffect(() => {
    if (manualOutErrorTrigger && manualOutErrorTrigger !== lastOutErrorTrigger.current) {
      lastOutErrorTrigger.current = manualOutErrorTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'out_error');
      setMatchScore(s => ({
        ...s,
        lastMessage: '⚠️ OUT! Ball segelt knapp hinter die Linie!'
      }));
    }
  }, [manualOutErrorTrigger]);

  useEffect(() => {
    const c1 = new Supertechno50FBXModel(() => setCrane1(c1));
    const c2 = new Supertechno50FBXModel(() => setCrane2(c2));
    return () => {
      c1.dispose();
      c2.dispose();
    };
  }, []);

  useFrame(({ camera, clock }, delta) => {
    const playFactor = isAIvsAI ? 1.0 : 0.0;
    const dt = Math.min(0.05, delta) * gameSpeed * playFactor;
    const shot = shotRef.current;
    const time = clock.elapsedTime;

    const kin1 = kin1Ref.current;
    const kin2 = kin2Ref.current;

    // --- 🌟 FULL EXTENSION SHOWCASE & INTRODUCTORY CAMERA TOUR (MATCH START & AFTER EACH GAME) ---
    if (showcaseTimerRef.current > 0) {
      showcaseTimerRef.current -= dt;
      const totalDuration = 4.8;
      const tElapsed = totalDuration - showcaseTimerRef.current;
      const progress = Math.min(1.0, Math.max(0.0, tElapsed / totalDuration));

      if (progress < 0.50) {
        // Phase 1 (0.0 - 2.4s): MAJESTÄTISCHES VOLLES AUSFAHREN (bis 11.3m) & HUB (3.25m)
        const p1 = progress / 0.50;
        const smoothP = Math.sin(p1 * Math.PI / 2);

        const ext = THREE.MathUtils.lerp(5.5, 11.3, smoothP);
        const col = THREE.MathUtils.lerp(1.85, 3.25, smoothP);
        const tilt = THREE.MathUtils.lerp(8, 30, smoothP);

        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, 0, dt * 4.0);
        kin1.columnElevation = col;
        kin1.boomTilt = tilt;
        kin1.teleExtension = ext;
        kin1.headPan = Math.sin(tElapsed * 2.5) * 22.0;
        kin1.headTilt = -16 + Math.cos(tElapsed * 2.0) * 12.0;
        kin1.headRoll = Math.sin(tElapsed * 3.0) * 28.0;

        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, 0, dt * 4.0);
        kin2.columnElevation = col;
        kin2.boomTilt = tilt;
        kin2.teleExtension = ext;
        kin2.headPan = -Math.sin(tElapsed * 2.5) * 22.0;
        kin2.headTilt = -16 + Math.cos(tElapsed * 2.0) * 12.0;
        kin2.headRoll = -Math.sin(tElapsed * 3.0) * 28.0;
      } else {
        // Phase 2 (2.4 - 4.8s): MAJESTÄTISCHES EINFIEHREN & READY-STANCE (11.3m -> 5.5m)
        const p2 = (progress - 0.50) / 0.50;
        const smoothP = Math.sin(p2 * Math.PI / 2);

        const ext = THREE.MathUtils.lerp(11.3, 5.5, smoothP);
        const col = THREE.MathUtils.lerp(3.25, 1.85, smoothP);
        const tilt = THREE.MathUtils.lerp(30, 8, smoothP);

        kin1.columnElevation = col;
        kin1.boomTilt = tilt;
        kin1.teleExtension = ext;
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 6.0);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 0, dt * 6.0);
        kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 0, dt * 6.0);

        kin2.columnElevation = col;
        kin2.boomTilt = tilt;
        kin2.teleExtension = ext;
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 6.0);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 0, dt * 6.0);
        kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, 0, dt * 6.0);
      }

      // 🎥 INTRODUKTORISCHER PERSPEKTIVENWECHSEL (Einführender Kamera-Flug)
      if (orbitControlsRef.current) {
        const controls = orbitControlsRef.current;
        if (progress < 0.35) {
          // Perspektive 1: Spektakuläre Weitwinkel-Aufnahme von Südwest, blickt empor auf die 11.3m ausfahrenden Kräne
          const subP = progress / 0.35;
          const camX = THREE.MathUtils.lerp(-28, -22, subP);
          const camY = THREE.MathUtils.lerp(18, 14, subP);
          const camZ = THREE.MathUtils.lerp(-18, -4, subP);
          camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.12);
          controls.target.lerp(new THREE.Vector3(0, 3.8, 0), 0.12);
        } else if (progress < 0.70) {
          // Perspektive 2: Dynamischer Kurvenflug über das Center-Court Netz mit Blick auf beide Ausleger
          const subP = (progress - 0.35) / 0.35;
          const camX = THREE.MathUtils.lerp(-22, -18, subP);
          const camY = THREE.MathUtils.lerp(14, 11, subP);
          const camZ = THREE.MathUtils.lerp(-4, 16, subP);
          camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.12);
          controls.target.lerp(new THREE.Vector3(0, 2.5, 0), 0.12);
        } else {
          // Perspektive 3: Sanfte Landung in TV-Broadcast Position [-24, 16, 0]
          camera.position.lerp(new THREE.Vector3(-24, 16.0, 0), 0.14);
          controls.target.lerp(new THREE.Vector3(0, 1.2, 0), 0.14);
        }
        controls.update();
      }

      if (dolly1GroupRef.current) dolly1GroupRef.current.position.set(kin1.dollyTrack, 0, -15.2);
      if (dolly2GroupRef.current) dolly2GroupRef.current.position.set(kin2.dollyTrack, 0, 15.2);
      if (crane1 && crane1.isLoaded) crane1.updateNodes({ ...kin1, dollyTrack: 0 });
      if (crane2 && crane2.isLoaded) crane2.updateNodes({ ...kin2, dollyTrack: 0 });

      if (showcaseTimerRef.current <= 0) {
        const nextServer = celebrationWinnerRef.current || 1;
        triggerGrandSlamServe(nextServer);
      }
      return;
    }

    // --- 🏆 EMOTIONAL GESTURES & CELEBRATION BETWEEN POINTS ---
    if (celebrationTimerRef.current > 0) {
      celebrationTimerRef.current -= dt;
      const tElapsed = 2.4 - celebrationTimerRef.current;
      const winner = celebrationWinnerRef.current;

      if (winner === 1) {
        // 🇮🇹 JANNIK SINNER WINNER: "Ice-Cold Focused Nod & Steely Fist"
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, 0, dt * 4.0);
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 2.35, dt * 5.0);
        kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 18, dt * 6.0);
        kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 3.8, dt * 4.0);
        kin1.headTilt = Math.sin(tElapsed * 6.5) * 14.0; // Entschlossenes Nicken
        kin1.headRoll = Math.sin(tElapsed * 4.0) * 10.0;
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 5.0);

        // 🇪🇸 CARLOS ALCARAZ FRUSTRATION: "Kopfschütteln & Blick zum Himmel"
        kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 1.72, dt * 5.0);
        kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, -6, dt * 5.0);
        kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 4.2, dt * 4.0);
        kin2.headPan = Math.sin(tElapsed * 7.5) * 26.0; // Ungläubiges Kopfschütteln
        kin2.headTilt = 32 + Math.sin(tElapsed * 3.0) * 14.0; // Blick frustriert nach oben
        kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, 0, dt * 5.0);
      } else if (winner === 2) {
        // 🇪🇸 CARLOS ALCARAZ WINNER: "Explosives Vamos-Faustballen & 360° Racket Twirl"
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, 0, dt * 5.0);
        kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 2.85, dt * 7.0);
        kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 34, dt * 7.0); // Ausleger reckt sich empor!
        kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 4.5, dt * 5.0);
        kin2.headTilt = -24 + Math.sin(tElapsed * 14.0) * 22.0; // Kraftvolles Faust-Pumpen!
        kin2.headRoll = Math.sin(tElapsed * 9.0) * 55.0; // Dynamischer Schläger-Twirl
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 5.0);

        // 🇮🇹 JANNIK SINNER FRUSTRATION: "Konzentriertes Frust-Kopfschütteln & Saiten-Zupfen"
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 1.78, dt * 5.0);
        kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, -4, dt * 5.0);
        kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 4.0, dt * 4.0);
        kin1.headPan = Math.sin(tElapsed * 6.0) * 22.0; // Kopfschütteln
        kin1.headTilt = 28 + Math.sin(tElapsed * 3.0) * 10.0;
        kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 0, dt * 5.0);
      }

      if (celebrationTimerRef.current <= 0) {
        const nextServer = celebrationWinnerRef.current || 1;
        celebrationWinnerRef.current = null;
        triggerGrandSlamServe(nextServer);
      }

      if (crane1 && crane1.isLoaded) crane1.updateNodes({ ...kin1, dollyTrack: 0 });
      if (crane2 && crane2.isLoaded) crane2.updateNodes({ ...kin2, dollyTrack: 0 });
      return;
    }

    shot.progress += dt / Math.max(0.2, shot.duration);
    const p = Math.min(1.0, shot.progress);

    let currentX = shot.startPos.x;
    let currentZ = shot.startPos.z;
    let currentY = 1.8;

    if (shot.isServe) {
      const server = shot.shooter;
      const dribbleEndTime = 0.32;
      const tossEndTime = 0.50;

      if (p < dribbleEndTime) {
        // 🏀 Vorbereitungsphase: Kran steht an der Grundlinie und dribbelt den Ball 3x rhythmisch auf dem Boden auf
        const dribbleT = p / dribbleEndTime;
        const numBounces = 3;
        const cycle = (dribbleT * numBounces) % 1.0;
        const bounceHeight = Math.abs(Math.sin(cycle * Math.PI)) * 0.72;
        currentX = shot.startPos.x;
        currentZ = shot.startPos.z;
        currentY = 0.16 + bounceHeight;

        if (server === 1) {
          // Server Sinner: Dribbeln + Saiten-Zupfen
          kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, -2.2, dt * 6.0);
          kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 1.85 + Math.sin(cycle * Math.PI) * 0.06, dt * 8.0);
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 12, dt * 6.0);
          kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 4.8, dt * 6.0);
          if (dribbleT > 0.68) {
            // Saiten-Kontrollblick kurz vor dem Hochwerfen
            kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 24, dt * 10.0);
            kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 32, dt * 10.0);
            kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 5, dt * 10.0);
          } else {
            kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, -28 + Math.abs(Math.sin(cycle * Math.PI)) * 18, dt * 14.0);
            kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 10, dt * 6.0);
            kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 6.0);
          }

          // Receiver Alcaraz: Bouncing Ready Stance
          kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, Math.sin(time * 12.0) * 0.22, dt * 8.0);
          kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 1.82, dt * 6.0);
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 8, dt * 6.0);
          kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 5.0, dt * 6.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, -8, dt * 6.0);
          kin2.headRoll = Math.sin(time * 16.0) * 16.0;
        } else {
          // Server Alcaraz: Dribbeln + Saiten-Zupfen
          kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, 2.2, dt * 6.0);
          kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 1.85 + Math.sin(cycle * Math.PI) * 0.06, dt * 8.0);
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 12, dt * 6.0);
          kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 4.8, dt * 6.0);
          if (dribbleT > 0.68) {
            kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, -24, dt * 10.0);
            kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, -32, dt * 10.0);
            kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 5, dt * 10.0);
          } else {
            kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, -28 + Math.abs(Math.sin(cycle * Math.PI)) * 18, dt * 14.0);
            kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, -10, dt * 6.0);
            kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 6.0);
          }

          // Receiver Sinner: Bouncing Ready Stance
          kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, Math.sin(time * 12.0) * 0.22, dt * 8.0);
          kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 1.82, dt * 6.0);
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 8, dt * 6.0);
          kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 5.0, dt * 6.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, -8, dt * 6.0);
          kin1.headRoll = Math.sin(time * 16.0) * 16.0;
        }
      } else if (p < tossEndTime) {
        // 🚀 Ballaufwurf in die Luft bis auf 5.6m Höhe
        const tossT = (p - dribbleEndTime) / (tossEndTime - dribbleEndTime);
        const tossHeight = Math.sin(tossT * Math.PI) * 3.8;
        currentX = shot.startPos.x;
        currentZ = shot.startPos.z;
        currentY = 1.8 + tossHeight;

        if (server === 1) {
          kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 3.2, dt * 10.0);
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 34, dt * 10.0);
          kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 8.8, dt * 10.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 25, dt * 10.0);
        } else {
          kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 3.2, dt * 10.0);
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 34, dt * 10.0);
          kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 8.8, dt * 10.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 25, dt * 10.0);
        }
      } else {
        // ⚡ Schlag & Flugkurve über das Netz ins gegnerische Feld
        const flightT = (p - tossEndTime) / (1.0 - tossEndTime);
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, flightT);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, flightT);

        const serveBounceProg = shot.isFault ? 0.85 : 0.65;
        if (flightT < serveBounceProg) {
          const t = flightT / serveBounceProg;
          currentY = THREE.MathUtils.lerp(5.6, shot.bouncePos.y, t * t);
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
    } else if (shot.isLob) {
      // 🌈 HOHER TENNIS-LOB / DEFENSIVE KERZE (Bis zu 11.2 Meter hoch in den Himmel!)
      currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, p);
      currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, p);

      const bounceProg = shot.isDecisive ? 0.74 : 0.68;
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

      // Kinematik für den schlagenden Kran beim Lob (Schaufelt steil von unten nach oben)
      if (shot.shooter === 1) {
        if (p < 0.25) {
          kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 1.58, dt * 10.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 48, dt * 14.0);
        } else {
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 62, dt * 12.0);
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 26, dt * 8.0);
        }
      } else {
        if (p < 0.25) {
          kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 1.58, dt * 10.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 48, dt * 14.0);
        } else {
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 62, dt * 12.0);
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 26, dt * 8.0);
        }
      }

      // Kinematik für den überlobbten Kran am Netz (schaut hoch und streckt sich nach hinten)
      const defender = shot.shooter === 1 ? 2 : 1;
      if (defender === 1) {
        const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.65, -7.5, 7.5);
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 7.0);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 58, dt * 14.0);
      } else if (defender === 2) {
        const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.65, -7.5, 7.5);
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 7.0);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 58, dt * 14.0);
      }
    } else if (shot.isSmash) {
      // 🚀 MONSTER-SMASH: STEILER ABWÄRTSEINSCHLAG IN DEN BODEN + REBOUND IN DEN HIMMEL / TRIBÜNE
      currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, p);
      currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, p);

      const smashBounceProg = 0.48; // Schlägt rasend schnell bei 48% im Boden ein
      if (p < smashBounceProg) {
        const t = p / smashBounceProg;
        currentY = THREE.MathUtils.lerp(shot.startPos.y, shot.bouncePos.y, t * t);
      } else {
        const t = (p - smashBounceProg) / (1.0 - smashBounceProg);
        const kickArc = Math.sin(t * (Math.PI / 2));
        currentY = THREE.MathUtils.lerp(shot.bouncePos.y, shot.targetPos.y, kickArc);
        if (!shot.hasBounced) {
          shot.hasBounced = true;
          setSmashBurst({ pos: shot.bouncePos.clone(), time: Date.now() });
        }
      }

      // Schlagender Kran (Smash-Hammer Kinematik)
      if (shot.shooter === 1) {
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 3.2, dt * 12.0);
        if (p < 0.35) {
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 38, dt * 14.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 30, dt * 16.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 35, dt * 16.0);
        } else {
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 6, dt * 26.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, -45, dt * 28.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 75, dt * 28.0);
        }
      } else {
        kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 3.2, dt * 12.0);
        if (p < 0.35) {
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 38, dt * 14.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 30, dt * 16.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, -35, dt * 16.0);
        } else {
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 6, dt * 26.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, -45, dt * 28.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, -75, dt * 28.0);
        }
      }

      // Verteidiger-Kran an der Grundlinie (Versucht den Smash mit schnellem Dolly-Sprint und Hechtschlag abzuwehren!)
      const defender = shot.shooter === 1 ? 2 : 1;
      if (defender === 1) {
        const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.70, -7.5, 7.5);
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 11.5);
        if (p > 0.45) {
          kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 2.3, dt * 14.0);
          kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 6.8, dt * 14.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 35, dt * 18.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 45, dt * 18.0);
        }
      } else {
        const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.70, -7.5, 7.5);
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 11.5);
        if (p > 0.45) {
          kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 2.3, dt * 14.0);
          kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 6.8, dt * 14.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 35, dt * 18.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, -45, dt * 18.0);
        }
      }
    } else if (shot.isVolley) {
      // 🎾 VOLLEY-FLUGBAHN: DIREKTABNAHME IN DER LUFT (OHNE BODENAUFPRALL)
      currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, p);
      currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, p);

      const arc = 4 * p * (1 - p);
      currentY = THREE.MathUtils.lerp(shot.startPos.y, shot.targetPos.y, p) + arc * Math.max(0.35, shot.netHeight * 0.45);

      // --- KINEMATIK KRAN 1 (Nord Z = -15.2m) ---
      if (shot.shooter === 2) {
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;

        const railX = THREE.MathUtils.clamp(targetX * 0.70, -7.5, 7.5);
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 9.5);

        const deltaX = targetX - kin1.dollyTrack;
        const deltaZ = targetZ - crane1BaseZ;
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = shot.volleyKind === 'smash' ? 3.1 : shot.volleyKind === 'stop' ? 1.6 : THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, idealColY, dt * 8.5);

        const deltaY = targetY - kin1.columnElevation;
        const total3DDist = Math.hypot(distH, deltaY);

        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.34, 0.5, 11.2);
        kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, targetExt, dt * 10.5);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, targetTiltDeg, dt * 11.0);

        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaX, deltaZ));
        const isForehand = deltaX >= 0;

        if (p < 0.65) {
          const windupOffset = isForehand ? 18 : -20;
          kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, aimAngleDeg + windupOffset, dt * 12.0);
          kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, isForehand ? 15 : -18, dt * 12.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, isForehand ? 25 : -30, dt * 12.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 12, dt * 12.0);
        } else {
          const followOffset = isForehand ? -12 : 14;
          kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, aimAngleDeg + followOffset, dt * 22.0);
          kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, isForehand ? -25 : 28, dt * 22.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, isForehand ? 65 : -70, dt * 22.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, shot.volleyKind === 'smash' ? -38 : -14, dt * 22.0);
        }
      } else {
        kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, 0, dt * 4.5);
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 4.5);
        kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 0, dt * 4.5);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 0, dt * 4.5);
      }

      // --- KINEMATIK KRAN 2 (Süd Z = +15.2m) ---
      if (shot.shooter === 1) {
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;

        const railX = THREE.MathUtils.clamp(targetX * 0.70, -7.5, 7.5);
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 9.5);

        const deltaX = targetX - kin2.dollyTrack;
        const deltaZ = crane2BaseZ - targetZ;
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = shot.volleyKind === 'smash' ? 3.1 : shot.volleyKind === 'stop' ? 1.6 : THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, idealColY, dt * 8.5);

        const deltaY = targetY - kin2.columnElevation;
        const total3DDist = Math.hypot(distH, deltaY);

        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.34, 0.5, 11.2);
        kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, targetExt, dt * 10.5);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, targetTiltDeg, dt * 11.0);

        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(-deltaX, deltaZ));
        const isForehand = deltaX <= 0;

        if (p < 0.65) {
          const windupOffset = isForehand ? -18 : 20;
          kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, aimAngleDeg + windupOffset, dt * 12.0);
          kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, isForehand ? -15 : 18, dt * 12.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, isForehand ? -25 : 30, dt * 12.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 12, dt * 12.0);
        } else {
          const followOffset = isForehand ? 12 : -14;
          kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, aimAngleDeg + followOffset, dt * 22.0);
          kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, isForehand ? 25 : -28, dt * 22.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, isForehand ? -65 : 70, dt * 22.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, shot.volleyKind === 'smash' ? -38 : -14, dt * 22.0);
        }
      } else {
        kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, 0, dt * 4.5);
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 4.5);
        kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, 0, dt * 4.5);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 0, dt * 4.5);
      }
    } else if (shot.isNetError) {
      // 🕸️ BALL FLIEGT INS NETZ UND FÄLLT SENKRECHT ZU BODEN (Z = 0)
      const netHitProg = 0.50;
      if (p < netHitProg) {
        const t = p / netHitProg;
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x * 0.35, t);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, 0.0, t);
        const arc = 4 * t * (1 - t);
        currentY = THREE.MathUtils.lerp(shot.startPos.y, shot.netHeight, t) + arc * 0.28;
      } else {
        const t = (p - netHitProg) / (1.0 - netHitProg);
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x * 0.35, 1.0);
        currentZ = shot.shooter === 1 ? -0.12 : 0.12; // ruht direkt an der Netzbasis
        currentY = THREE.MathUtils.lerp(shot.netHeight, 0.16, t * t);
        if (!shot.hasBounced) {
          shot.hasBounced = true;
          setImpactBurst({ pos: new THREE.Vector3(currentX, shot.netHeight, 0), time: Date.now() });
        }
      }

      if (shot.shooter === 1) {
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, -22, dt * 8.0);
      } else {
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, -22, dt * 8.0);
      }
    } else if (shot.isNetCord) {
      // 💫 NETZROLLER: Ball touchiert die Netzkante bei p=0.48 und tropft kurz hinters Netz
      const netHitProg = 0.48;
      if (p < netHitProg) {
        const t = p / netHitProg;
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x * 0.35, t);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, 0.0, t);
        const arc = 4 * t * (1 - t);
        currentY = THREE.MathUtils.lerp(shot.startPos.y, 1.05, t) + arc * 0.35;
      } else {
        const t = (p - netHitProg) / (1.0 - netHitProg);
        currentX = THREE.MathUtils.lerp(shot.targetPos.x * 0.35, shot.targetPos.x, t);
        currentZ = THREE.MathUtils.lerp(0.0, shot.targetPos.z, t);
        const dropArc = Math.sin(t * Math.PI) * 0.38;
        currentY = THREE.MathUtils.lerp(1.05, 0.16, t) + dropArc;
        if (!shot.hasBounced) {
          shot.hasBounced = true;
          setImpactBurst({ pos: new THREE.Vector3(currentX, 1.05, 0), time: Date.now() });
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

        const railX = THREE.MathUtils.clamp(targetX * 0.65, -7.5, 7.5);
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 7.5);

        const deltaX = targetX - kin1.dollyTrack;
        const deltaZ = targetZ - crane1BaseZ;
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = shot.isLobSetup ? 3.2 : THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, idealColY, dt * 7.0);

        const deltaY = targetY - kin1.columnElevation;
        const total3DDist = Math.hypot(distH, deltaY);

        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.34, 0.5, 11.2);
        kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, targetExt, dt * 8.5);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, targetTiltDeg, dt * 9.0);

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

        const railX = THREE.MathUtils.clamp(targetX * 0.65, -7.5, 7.5);
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 7.5);

        const deltaX = targetX - kin2.dollyTrack;
        const deltaZ = crane2BaseZ - targetZ;
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = shot.isLobSetup ? 3.2 : THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
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
        celebrationWinnerRef.current = winner;
        celebrationTimerRef.current = 2.4; // 🏆 Starte 2.4s emotionale Jubel- & Frust-Phase!
        
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
          const isGameOrSetWon = (p1 === 0 && p2 === 0 && (g1 !== s.p1Games || g2 !== s.p2Games || s1 !== s.p1Sets || s2 !== s.p2Sets));

          if (isGameOrSetWon) {
            showcaseTimerRef.current = 4.8;
            showcaseTypeRef.current = 'gamewin';
            celebrationTimerRef.current = 0; // Direkt in die 11.3m Ausleger-Show übergehen!
          }

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
            cheerIntensity: isGameOrSetWon ? 2.0 : 1.5,
            umpireCall: call,
            lastMessage: isGameOrSetWon 
              ? `🎮 GAME-WECHSEL (${g1}:${g2}) • 11.3m Ausleger-Show & Seitenwechsel!` 
              : `🏆 Punkt für Kran ${winner}! (${shot.endReason})`
          };
        });
      } else if (shot.isServe && shot.isFault && shot.serveAttempt === 1) {
        // ⚠️ 1. AUFSCHLAG WAR EIN FEHLER (FAULT) ➜ Umpire-Durchsage & Vorbereitung auf 2. Aufschlag!
        setMatchScore(s => ({
          ...s,
          umpireCall: `⚠️ FAULT! Zweiter Aufschlag...`,
          lastMessage: `⚠️ 1. Aufschlag im Netz / Aus (Fault)! Vorbereitung 2. Service...`
        }));
        triggerGrandSlamServe(shot.shooter, false, 2);
      } else {
        setMatchScore(s => ({
          ...s,
          rallyCount: s.rallyCount + 1,
          isCheering: false,
          cheerIntensity: Math.max(0, s.cheerIntensity - 0.05),
          lastMessage: `${shot.shotType} • ${shot.speedKmh} km/h`
        }));

        if (shot.isSmash && !shot.isDecisive) {
          // 🛡️ SMASH WURDE AN DER GRUNDLINIE ABGEWEHRT! ➜ Spektakulärer Konter-Lob!
          const counterMode = Math.random() < 0.65 ? 'topspin_lob' : 'sky_lob';
          shotRef.current = createNextShot(hitter, hitPos, matchScore.rallyCount + 1, counterMode);
        } else if (shot.isLobSetup) {
          // Unmittelbar den Monster-Smash des gegnerischen Krans zünden!
          shotRef.current = createNextShot(hitter, hitPos, matchScore.rallyCount + 1, 'smash');
        } else {
          shotRef.current = createNextShot(hitter, hitPos, matchScore.rallyCount + 1);
        }
      }
    }

    if (dolly1GroupRef.current) {
      dolly1GroupRef.current.position.set(kin1.dollyTrack, 0, -15.2);
    }
    if (dolly2GroupRef.current) {
      dolly2GroupRef.current.position.set(kin2.dollyTrack, 0, 15.2);
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
      } else if (cameraMode === 'smash') {
        // 🎾 ECHTE SCHLÄGER-KAMERA (FIRST-PERSON RACKET POV - NUR IN DIESEM VIEW!)
        // Die Kamera ist direkt auf dem Tennisschläger des aktiven Krans montiert
        const activeHitter = shot.shooter;
        const rPos = (activeHitter === 1 ? racket1WorldPos.current : racket2WorldPos.current).clone();
        const rQuat = (activeHitter === 1 ? racket1WorldQuat.current : racket2WorldQuat.current).clone();

        // Vorwärtsvektor & Aufwärtsvektor des Schlägers
        const forwardDir = new THREE.Vector3(0, 0, activeHitter === 1 ? 1 : -1).applyQuaternion(rQuat).normalize();
        const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(rQuat).normalize();

        // Kamera sitzt 32cm hinter dem Schlägerherzen (Racket Throat) und 6cm darüber
        // Man blickt direkt durch die gespannten Carbon-Saiten (Sweet Spot) nach vorne auf Ball & Gegner!
        const camPos = rPos.clone()
          .sub(forwardDir.clone().multiplyScalar(0.32))
          .add(upDir.clone().multiplyScalar(0.06));

        // Zielpunkt: Blick durch die Saiten nach vorne in Schlagrichtung / auf den Ball
        const aimTarget = camPos.clone().add(forwardDir.clone().multiplyScalar(10.0));
        if (currentBallPos) {
          aimTarget.lerp(currentBallPos, 0.45);
        }

        camera.position.lerp(camPos, 0.35);
        controls.target.lerp(aimTarget, 0.35);
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

      {/* 🇮🇹 KRAN 1 (SÜD / JANNIK SINNER) - HIERARCHISCH INTEGRIERT (ZERO GAP) */}
      <MountedCranePlayer
        crane={crane1}
        kinematicsRef={kin1Ref}
        teamColor="#38bdf8"
        stringGlow="#bae6fd"
        racketWorldPosRef={racket1WorldPos}
        racketWorldQuatRef={racket1WorldQuat}
        baseRotation={Math.PI}
        dollyTrackZ={-15.2}
        dollyGroupRef={dolly1GroupRef}
      />

      {/* 🇪🇸 KRAN 2 (NORD / CARLOS ALCARAZ) - HIERARCHISCH INTEGRIERT (ZERO GAP) */}
      <MountedCranePlayer
        crane={crane2}
        kinematicsRef={kin2Ref}
        teamColor="#facc15"
        stringGlow="#fef08a"
        racketWorldPosRef={racket2WorldPos}
        racketWorldQuatRef={racket2WorldQuat}
        baseRotation={0}
        dollyTrackZ={15.2}
        dollyGroupRef={dolly2GroupRef}
      />

      {/* 🎾 TENNISBALL MIT DYNAMISCHEM SMASH- & LOB-GLOW */}
      <group position={[ballVisualPos.x, ballVisualPos.y, ballVisualPos.z]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[shotRef.current.isSmash ? 0.15 : shotRef.current.isLob ? 0.14 : 0.13, 32, 32]} />
          <meshStandardMaterial
            color={shotRef.current.isSmash ? "#fbbf24" : shotRef.current.isLob ? "#38bdf8" : "#d9f99d"}
            emissive={shotRef.current.isSmash ? "#f97316" : shotRef.current.isLob ? "#0284c7" : "#bef264"}
            emissiveIntensity={shotRef.current.isSmash ? 1.5 : shotRef.current.isLob ? 1.2 : 0.5}
            roughness={0.6}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[shotRef.current.isSmash ? 0.24 : shotRef.current.isLob ? 0.22 : 0.19, 16, 16]} />
          <meshBasicMaterial
            color={shotRef.current.isSmash ? "#ea580c" : shotRef.current.isLob ? "#38bdf8" : "#bef264"}
            transparent
            opacity={shotRef.current.isSmash ? 0.45 : shotRef.current.isLob ? 0.35 : 0.25}
          />
        </mesh>
      </group>

      {/* 💥 IMPACT BURST BEI SCHLÄGERKONTAKT */}
      {impactBurst && Date.now() - impactBurst.time < 300 && (
        <group position={[impactBurst.pos.x, impactBurst.pos.y, impactBurst.pos.z]}>
          <mesh>
            <ringGeometry args={[0.15, 0.65, 24]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          <pointLight color="#fde047" intensity={6} distance={3.5} />
        </group>
      )}

      {/* 🔥 SMASH SHOCKWAVE BURST BEI BODENAUFPRALL */}
      {smashBurst && Date.now() - smashBurst.time < 450 && (
        <group position={[smashBurst.pos.x, 0.05, smashBurst.pos.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 1.8, 32]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 3.2, 32]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
          <pointLight color="#f97316" intensity={12} distance={8} />
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
  const [gameSpeed, setGameSpeed] = useState(1.2);
  const [showSpectators, setShowSpectators] = useState(false);
  const [showCourtsideStaff, setShowCourtsideStaff] = useState(false);
  const [showGrandstands, setShowGrandstands] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [manualVolleyTrigger, setManualVolleyTrigger] = useState(0);
  const [manualSmashTrigger, setManualSmashTrigger] = useState(0);
  const [manualTopspinLobTrigger, setManualTopspinLobTrigger] = useState(0);
  const [manualSkyLobTrigger, setManualSkyLobTrigger] = useState(0);
  const [manualServiceWinnerTrigger, setManualServiceWinnerTrigger] = useState(0);
  const [manualDropTrigger, setManualDropTrigger] = useState(0);
  const [manualTopspinTrigger, setManualTopspinTrigger] = useState(0);
  const [manualLaserTrigger, setManualLaserTrigger] = useState(0);
  const [manualSliceTrigger, setManualSliceTrigger] = useState(0);
  const [manualNetErrorTrigger, setManualNetErrorTrigger] = useState(0);
  const [manualOutErrorTrigger, setManualOutErrorTrigger] = useState(0);
  const [manualResetTrigger, setManualResetTrigger] = useState(0);
  const [showH2HStats, setShowH2HStats] = useState(false);
  const orbitControlsRef = useRef<any>(null);

  const [matchScore, setMatchScore] = useState<MatchScore>({
    p1Points: 15,
    p2Points: 30,
    p1Games: 4,
    p2Games: 3,
    p1Sets: 1,
    p2Sets: 0,
    server: 1,
    lastMessage: '🏆 ARENA INTRO: 11.3m Ausleger-Show • Matchstart!',
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

  const handleRestartMatch = () => {
    setManualResetTrigger(n => n + 1);
    setMatchScore({
      p1Points: 0,
      p2Points: 0,
      p1Games: 0,
      p2Games: 0,
      p1Sets: 0,
      p2Sets: 0,
      server: 1,
      lastMessage: '🏆 ARENA INTRO: 11.3m Ausleger-Show • Matchstart!',
      umpireCall: 'Love-All (0:0)',
      rallyCount: 0,
      isCheering: false,
      cheerIntensity: 0.0
    });
  };

  const isNetErrorActive = matchScore.lastMessage.includes('NETZFEHLER') || (matchScore.lastMessage.includes('NETZ') && !matchScore.lastMessage.includes('VOLLEY') && !matchScore.lastMessage.includes('NETZANGRIFF') && !matchScore.lastMessage.includes('NETZROLLER'));
  const isOutActive = matchScore.lastMessage.includes('OUT') || matchScore.lastMessage.includes('AUS');
  const isNetCordActive = matchScore.lastMessage.includes('NETZROLLER');
  const isSmashActive = !isNetErrorActive && !isOutActive && (matchScore.lastMessage.includes('SMASH') || matchScore.lastMessage.includes('SCHMETTERBALL'));
  const isLobActive = !isNetErrorActive && !isOutActive && !isSmashActive && (matchScore.lastMessage.includes('LOB') || matchScore.lastMessage.includes('KERZE'));
  const isDropActive = !isNetErrorActive && !isOutActive && !isSmashActive && !isLobActive && (matchScore.lastMessage.includes('STOPPBALL') || matchScore.lastMessage.includes('DROP'));
  const isSliceActive = !isNetErrorActive && !isOutActive && !isSmashActive && !isLobActive && !isDropActive && matchScore.lastMessage.includes('SLICE');
  const isServiceWinnerActive = !isNetErrorActive && !isOutActive && !isSmashActive && !isLobActive && !isDropActive && !isSliceActive && matchScore.lastMessage.includes('SERVICE WINNER');
  const isAceActive = !isNetErrorActive && !isOutActive && !isSmashActive && !isLobActive && !isDropActive && !isSliceActive && !isServiceWinnerActive && (matchScore.lastMessage.includes('ASS') || matchScore.lastMessage.includes('ACE'));
  const isVolleyActive = !isNetErrorActive && !isOutActive && !isSmashActive && !isLobActive && !isDropActive && !isSliceActive && !isServiceWinnerActive && !isAceActive && (matchScore.lastMessage.includes('VOLLEY') || matchScore.lastMessage.includes('NETZANGRIFF'));
  const isTopspinActive = !isNetErrorActive && !isOutActive && !isSmashActive && !isLobActive && !isDropActive && !isSliceActive && (matchScore.lastMessage.includes('TOPSPIN') || matchScore.lastMessage.includes('3.200 RPM'));
  const isLaserActive = !isNetErrorActive && !isOutActive && !isSmashActive && !isLobActive && !isDropActive && !isSliceActive && !isTopspinActive && (matchScore.lastMessage.includes('LASER') || matchScore.lastMessage.includes('FLAT'));

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
          manualVolleyTrigger={manualVolleyTrigger}
          manualSmashTrigger={manualSmashTrigger}
          manualTopspinLobTrigger={manualTopspinLobTrigger}
          manualSkyLobTrigger={manualSkyLobTrigger}
          manualServiceWinnerTrigger={manualServiceWinnerTrigger}
          manualDropTrigger={manualDropTrigger}
          manualTopspinTrigger={manualTopspinTrigger}
          manualLaserTrigger={manualLaserTrigger}
          manualSliceTrigger={manualSliceTrigger}
          manualNetErrorTrigger={manualNetErrorTrigger}
          manualOutErrorTrigger={manualOutErrorTrigger}
          manualResetTrigger={manualResetTrigger}
        />
      </Canvas>

      {/* --- BROADCAST SCOREBOARD HUD (TOP RIGHT) --- */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(15, 23, 42, 0.90)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '10px 16px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Player 1 Sinner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px' }}>🇮🇹</span>
            <span style={{ color: '#bae6fd', fontWeight: 900, fontSize: '12px' }}>[1] J. SINNER</span>
            <span style={{ background: '#0284c7', color: '#fff', padding: '2px 7px', borderRadius: '4px', fontWeight: 900, fontSize: '13px', fontFamily: 'monospace' }}>
              {getPointsLabel(matchScore.p1Points)}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700 }}>
              [{matchScore.p1Games}G • {matchScore.p1Sets}S]
            </span>
          </div>

          <span style={{ color: '#facc15', fontWeight: 900, fontSize: '12px' }}>VS</span>

          {/* Player 2 Alcaraz */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px' }}>🇪🇸</span>
            <span style={{ color: '#fde68a', fontWeight: 900, fontSize: '12px' }}>[2] C. ALCARAZ</span>
            <span style={{ background: '#ca8a04', color: '#fff', padding: '2px 7px', borderRadius: '4px', fontWeight: 900, fontSize: '13px', fontFamily: 'monospace' }}>
              {getPointsLabel(matchScore.p2Points)}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700 }}>
              [{matchScore.p2Games}G • {matchScore.p2Sets}S]
            </span>
          </div>
        </div>

        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.15)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#38bdf8', fontSize: '10px', fontWeight: 900 }}>🪑 UMPIRE:</span>
            <span style={{ color: '#fff', fontSize: '11px', fontWeight: 900, fontFamily: 'monospace' }}>
              {matchScore.umpireCall}
            </span>
            {isNetErrorActive && (
              <span style={{
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(220, 38, 38, 0.9)'
              }}>
                🕸️ NETZFEHLER
              </span>
            )}
            {isOutActive && (
              <span style={{
                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(234, 88, 12, 0.9)'
              }}>
                ⚠️ OUT (BALL IM AUS)
              </span>
            )}
            {isNetCordActive && (
              <span style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(139, 92, 246, 0.9)'
              }}>
                💫 NETZROLLER
              </span>
            )}
            {isSmashActive && (
              <span style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.8)'
              }}>
                🔥 248 km/h SMASH
              </span>
            )}
            {isLobActive && (
              <span style={{
                background: 'linear-gradient(135deg, #0284c7, #8b5cf6)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)'
              }}>
                🌈 10.5m LOB
              </span>
            )}
            {isDropActive && (
              <span style={{
                background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(236, 72, 153, 0.8)'
              }}>
                💫 STOPPBALL
              </span>
            )}
            {isSliceActive && (
              <span style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.8)'
              }}>
                🌀 SLICE
              </span>
            )}
            {isTopspinActive && (
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.8)'
              }}>
                🌪️ 3.200 RPM TOPSPIN
              </span>
            )}
            {isLaserActive && (
              <span style={{
                background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.8)'
              }}>
                ⚡ 132 km/h LASER
              </span>
            )}
            {isServiceWinnerActive && (
              <span style={{
                background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(234, 179, 8, 0.8)'
              }}>
                🎯 SERVICE WINNER
              </span>
            )}
            {isAceActive && (
              <span style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.8)'
              }}>
                ⚡ DIREKTES ASS
              </span>
            )}
            {isVolleyActive && (
              <span style={{
                background: '#f43f5e',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)'
              }}>
                ⚡ NETZ-VOLLEY
              </span>
            )}
            {!isAIvsAI && (
              <span style={{
                background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                color: '#000',
                fontSize: '9px',
                fontWeight: 900,
                padding: '2px 6px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                boxShadow: '0 0 12px rgba(234, 179, 8, 0.9)'
              }}>
                ⏸️ EINGEFROREN
              </span>
            )}
          </div>
          <div style={{ fontSize: '10px', color: matchScore.isCheering ? '#f43f5e' : isNetErrorActive ? '#ef4444' : isOutActive ? '#fb923c' : isNetCordActive ? '#c084fc' : isSmashActive ? '#facc15' : isLobActive ? '#38bdf8' : isDropActive ? '#f472b6' : isSliceActive ? '#34d399' : isServiceWinnerActive ? '#fde047' : '#4ade80', fontWeight: 700 }}>
            {matchScore.isCheering ? `👏 JUBEL! ${matchScore.lastMessage}` : matchScore.lastMessage}
          </div>
        </div>

        {/* ⏸️ FREEZE / STOP BUTTON */}
        <button
          onClick={() => setIsAIvsAI(!isAIvsAI)}
          title={isAIvsAI ? "Match anhalten / einfrieren (Pause)" : "Match fortsetzen (Play)"}
          style={{
            background: isAIvsAI 
              ? 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(202,138,4,0.2))' 
              : 'linear-gradient(135deg, rgba(34,197,94,0.4), rgba(22,163,74,0.3))',
            border: `1px solid ${isAIvsAI ? 'rgba(234,179,8,0.6)' : '#4ade80'}`,
            color: isAIvsAI ? '#fef08a' : '#bbf7d0',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            boxShadow: isAIvsAI ? '0 2px 8px rgba(234, 179, 8, 0.25)' : '0 0 14px rgba(74, 222, 128, 0.6)'
          }}
        >
          <span>{isAIvsAI ? '⏸️' : '▶️'}</span>
          <span>{isAIvsAI ? 'Stop / Freeze' : 'Fortsetzen'}</span>
        </button>

        {/* 🔄 RESTART MATCH BUTTON */}
        <button
          onClick={handleRestartMatch}
          title="Match komplett neu starten (11.3m Ausleger-Show)"
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.35), rgba(249,115,22,0.25))',
            border: '1px solid rgba(239,68,68,0.6)',
            color: '#fee2e2',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
          }}
        >
          <span>🔄</span>
          <span>Restart Match</span>
        </button>

        {/* 📊 H2H STATS BUTTON */}
        <button
          onClick={() => setShowH2HStats(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(250,204,21,0.2))',
            border: '1px solid rgba(56,189,248,0.5)',
            color: '#e0f2fe',
            padding: '5px 9px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📊 H2H Stats
        </button>
      </div>

      {/* --- CONTROL DRAWER (LEFT SIDE) - COLLAPSIBLE --- */}
      {!isControlsOpen ? (
        <button
          onClick={() => setIsControlsOpen(true)}
          style={{
            position: 'absolute',
            top: '70px',
            left: '20px',
            background: 'rgba(11, 16, 24, 0.92)',
            border: '1px solid rgba(250, 204, 21, 0.5)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#facc15',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            zIndex: 50,
            transition: 'all 0.2s ease'
          }}
        >
          <span>🎾</span>
          <span>Steuerung & Schläge</span>
          <span style={{ fontSize: '10px', opacity: 0.8, color: '#38bdf8' }}>▶</span>
        </button>
      ) : (
        <div style={{
          position: 'absolute',
          top: '70px',
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
          maxHeight: 'calc(100vh - 90px)',
          overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          zIndex: 50
        }}>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#facc15', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎾</span> <span>Kran-Tennis Arena</span>
              </h3>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Dolly auf Schienen, Smashes, Lobs & Volleys</div>
            </div>
            <button
              onClick={() => setIsControlsOpen(false)}
              title="Steuerung einklappen"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#cbd5e1',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>Einklappen</span>
              <span style={{ fontSize: '9px', color: '#facc15' }}>◀</span>
            </button>
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
              { id: 'smash' as const, label: '🎾 Schläger-Cam (POV)' },
              { id: 'spectator' as const, label: '👥 Tribüne (Fan)' },
              { id: 'umpire' as const, label: '🪑 Schiedsrichter' },
              { id: 'coach' as const, label: '📋 Trainer-Bank' },
              { id: 'ball' as const, label: '🎾 Ball-Kamera' },
              { id: 'crane1' as const, label: '🏗️ Kran 1 POV' },
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

        {/* 3. 🔥 SMASHES, LOB, STOPPBALL & SCHLÄGE */}
        <div style={{
          marginBottom: '14px',
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(56,189,248,0.15))',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid rgba(56,189,248,0.35)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔥 Schlag- & Taktik-Arsenal:</span>
            <span style={{ fontSize: '9px', background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>ATP Pro</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => setManualDropTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(236,72,153,0.7)',
                background: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(244,63,94,0.2))',
                color: '#fce7f3',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>💫 Disguised Stoppball (Drop Shot)</span>
              <span style={{ fontSize: '9px', color: '#fbcfe8' }}>2.600 RPM</span>
            </button>

            <button
              onClick={() => setManualLaserTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(56,189,248,0.7)',
                background: 'linear-gradient(135deg, rgba(2,132,199,0.4), rgba(56,189,248,0.25))',
                color: '#e0f2fe',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>⚡ 132 km/h Sinner Rückhand-Laser</span>
              <span style={{ fontSize: '9px', color: '#bae6fd' }}>Down-the-Line</span>
            </button>

            <button
              onClick={() => setManualTopspinTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(245,158,11,0.7)',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(217,119,6,0.2))',
                color: '#fef3c7',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🌪️ 3.200 RPM Alcaraz Heavy-Topspin</span>
              <span style={{ fontSize: '9px', color: '#fde68a' }}>Inside-Out</span>
            </button>

            <button
              onClick={() => setManualSliceTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(16,185,129,0.7)',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.2))',
                color: '#d1fae5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🌀 3.100 RPM Alcaraz Backhand-Slice</span>
              <span style={{ fontSize: '9px', color: '#a7f3d0' }}>Rhythmuswechsel</span>
            </button>

            <button
              onClick={() => setManualTopspinLobTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(56,189,248,0.7)',
                background: 'linear-gradient(135deg, rgba(2,132,199,0.4), rgba(139,92,246,0.3))',
                color: '#e0f2fe',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🌈 10.5m Topspin-Lob Winner</span>
              <span style={{ fontSize: '9px', color: '#bae6fd' }}>Über den Kran</span>
            </button>

            <button
              onClick={() => setManualSkyLobTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(245,158,11,0.7)',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(234,179,8,0.2))',
                color: '#fef3c7',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🛡️ 11.2m Hohe Not-Kerze</span>
              <span style={{ fontSize: '9px', color: '#fde68a' }}>Sky-Lob / Flutlicht</span>
            </button>

            <button
              onClick={() => setManualSmashTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(239,68,68,0.7)',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.35), rgba(249,115,22,0.2))',
                color: '#fee2e2',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🔥 248 km/h Monster-Smash</span>
              <span style={{ fontSize: '9px', color: '#fca5a5' }}>Sofortiger Winner</span>
            </button>

            <button
              onClick={() => setManualVolleyTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(56,189,248,0.6)',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.3), rgba(14,165,233,0.15))',
                color: '#e0f2fe',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>⚡ Blitz-Netzvolley Angriff</span>
              <span style={{ fontSize: '9px', color: '#bae6fd' }}>Direkt am Netz</span>
            </button>

            <button
              onClick={() => setManualNetErrorTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(239,68,68,0.7)',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.35), rgba(185,28,28,0.25))',
                color: '#fee2e2',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🕸️ Net Error (Ball im Netz)</span>
              <span style={{ fontSize: '9px', color: '#fca5a5' }}>Netzkante</span>
            </button>

            <button
              onClick={() => setManualOutErrorTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(234,88,12,0.7)',
                background: 'linear-gradient(135deg, rgba(234,88,12,0.35), rgba(194,65,12,0.25))',
                color: '#ffedd5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>⚠️ Out Error (Ball im Aus)</span>
              <span style={{ fontSize: '9px', color: '#fdba74' }}>Grundlinie/Korridor</span>
            </button>

            <button
              onClick={() => setManualServiceWinnerTrigger(n => n + 1)}
              style={{
                padding: '7px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(234,179,8,0.7)',
                background: 'linear-gradient(135deg, rgba(234,179,8,0.35), rgba(202,138,4,0.2))',
                color: '#fef08a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🎯 228 km/h Service Winner</span>
              <span style={{ fontSize: '9px', color: '#fde047' }}>Return-Fehler</span>
            </button>
          </div>
        </div>

        {/* 4. 👥 STADION-ELEMENTE & PUBLIKUM TOGGLES (EIN- / AUSBLENDEN) */}
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

        {/* 5. Action Button: Crowd Cheer */}
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

        {/* 6. Match Simulation Speed & Play Mode */}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {[0.5, 1.0, 1.2, 1.5, 2.0].map(spd => (
              <button
                key={`spd-${spd}`}
                onClick={() => setGameSpeed(spd)}
                style={{
                  padding: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: `1px solid ${gameSpeed === spd ? '#facc15' : 'rgba(255,255,255,0.1)'}`,
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

        {/* 7. Match Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setIsAIvsAI(!isAIvsAI)}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '11px',
                fontWeight: 800,
                borderRadius: '6px',
                border: `1px solid ${isAIvsAI ? 'rgba(234,179,8,0.6)' : 'rgba(74,222,128,0.6)'}`,
                background: isAIvsAI ? 'linear-gradient(135deg, rgba(234,179,8,0.25), rgba(202,138,4,0.15))' : 'linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.15))',
                color: isAIvsAI ? '#fef08a' : '#86efac',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>{isAIvsAI ? '⏸️' : '▶️'}</span>
              <span>{isAIvsAI ? 'Stop (Einfrieren)' : 'Play (Fortsetzen)'}</span>
            </button>

            <button
              onClick={handleRestartMatch}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '11px',
                fontWeight: 800,
                borderRadius: '6px',
                border: '1px solid rgba(239,68,68,0.5)',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.15))',
                color: '#fca5a5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🔄</span> <span>Restart Match</span>
            </button>
          </div>

          <button
            onClick={() => setShowH2HStats(true)}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '11px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(56,189,248,0.5)',
              background: 'linear-gradient(135deg, rgba(2,132,199,0.3), rgba(250,204,21,0.2))',
              color: '#fde047',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>📊</span> <span>ATP #1 vs #2 H2H & Match-Statistiken</span>
          </button>
        </div>
      </div>
      )}

      {/* --- 📊 ATP HEAD-TO-HEAD & MATCH STATS MODAL --- */}
      {showH2HStats && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '580px',
          maxWidth: '92vw',
          background: 'rgba(11, 16, 28, 0.96)',
          color: '#fff',
          padding: '24px',
          borderRadius: '16px',
          fontFamily: 'Inter, system-ui, sans-serif',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.2)',
          zIndex: 100
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                🏆 ATP GRAND SLAM / MASTERS FINALE
              </div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#fff' }}>
                Head-to-Head & Offizielle ATP Statistiken
              </div>
            </div>
            <button
              onClick={() => setShowH2HStats(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: '14px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Players Comparison Card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', marginBottom: '18px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Player 1 Sinner */}
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px' }}>🇮🇹</span>
                <span style={{ color: '#38bdf8', fontWeight: 900, fontSize: '15px' }}>Jannik SINNER</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>ATP Weltrangliste #1 (11.830 Pkt)</div>
              <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 800 }}>"The Fox" • Baseline Firepower</div>
            </div>

            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800 }}>H2H TOTAL</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#facc15', fontFamily: 'monospace' }}>7 – 10</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Grand Slam: 2–4</div>
            </div>

            {/* Player 2 Alcaraz */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                <span style={{ color: '#facc15', fontWeight: 900, fontSize: '15px' }}>Carlos ALCARAZ</span>
                <span style={{ fontSize: '18px' }}>🇪🇸</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>ATP Weltrangliste #2 (9.850 Pkt)</div>
              <div style={{ fontSize: '10px', color: '#facc15', fontWeight: 800 }}>"Carlitos" • All-Court Dynamo</div>
            </div>
          </div>

          {/* Statistical Breakdown Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '11px', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(56,189,248,0.08)', borderRadius: '6px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900 }}>124 – 132 km/h (77 mph 👑)</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Rückhand-Geschwindigkeit</span>
              <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>115 – 122 km/h</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(250,204,21,0.08)', borderRadius: '6px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900 }}>2.287 RPM (Flat Bullet)</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Vorhand-Topspin Spinrate</span>
              <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>3.200 RPM (Heavy Topspin 👑)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900 }}>234 km/h (Flat Bomb)</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Max. Aufschlag-Tempo</span>
              <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>228 km/h (Heavy Kick)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900 }}>64 % (88 % gewonnene Service-Games)</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>1. Aufschlag im Feld</span>
              <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>66 % (86 % gewonnene Service-Games)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(250,204,21,0.08)', borderRadius: '6px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900 }}>58 % (Selektiver Einsatz)</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Stoppball / Drop Shot Quote</span>
              <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>74 % (Signature Weapon 👑)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(56,189,248,0.08)', borderRadius: '6px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900 }}>Dominant auf Hardcourt & Rasen</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Belags-Dominanz</span>
              <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>Dominant auf Sand & All-Court</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(239,68,68,0.12)', borderRadius: '6px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900 }}>24 UEs / Match (14 Out 👑 • 10 Netz)</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Unforced Errors (Out vs Netz)</span>
              <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>31 UEs / Match (18 Out 👑 • 13 Netz)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900 }}>58% Out • 37% Netz • 5% Netzroller</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Fehler-Verteilung</span>
              <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>58% Out • 37% Netz • 5% Netzroller</span>
            </div>
          </div>

          {/* Tactical Frequency Matrix (Wer, Wann, Wie oft) */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#facc15', marginBottom: '6px', textAlign: 'center' }}>
              🎯 Taktische Schlag- & Häufigkeits-Matrix (Wer, Wann, Wie oft)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', fontSize: '10px' }}>
              <div style={{ color: '#bae6fd', lineHeight: 1.5 }}>
                <div>• <b>52% Vorhand</b> / <b>48% Rückhand</b></div>
                <div>• <b>92% Flat Laser</b> (128–134 km/h)</div>
                <div>• <b>34% Down-the-Line</b> Rückhand</div>
                <div>• <b>4% Stoppball</b> (nur bei extremer Tiefe)</div>
                <div>• <b>12% Netzangriff</b> (Grundlinien-Fokus)</div>
                <div>• <b>85% Smash</b> bei hohen Lobs</div>
                <div>• <b>Out-Quote:</b> 14% (Knapp hinter Grundlinie)</div>
                <div>• <b>Netzfehler:</b> 10% an der Netzkante</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ color: '#fde68a', textAlign: 'right', lineHeight: 1.5 }}>
                <div><b>65% Vorhand</b> / <b>35% Rückhand</b> •</div>
                <div><b>80% Heavy Topspin</b> (3.200 RPM) •</div>
                <div><b>38% Backhand-Slice</b> (Rhythmusbruch) •</div>
                <div><b>20% Disguised Stoppball</b> (Signature) •</div>
                <div><b>28% Netzangriff & Volleys</b> •</div>
                <div><b>92% Monster-Smash</b> (248 km/h) •</div>
                <div><b>Out-Quote:</b> 18% (Inside-Out & Power) •</div>
                <div><b>Netzfehler:</b> 13% bei extremen Winkeln •</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setShowH2HStats(false)}
              style={{
                padding: '8px 24px',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🎾 ZURÜCK ZUM LIVE MATCH
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
