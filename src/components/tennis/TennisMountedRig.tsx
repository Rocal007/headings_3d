import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Supertechno50FBXModel } from '../../model/Supertechno50FBXModel';
import CraneTennisRacketHead from '../CraneTennisRacketHead';
import CraneCounterweight from '../CraneCounterweight';
import { TennisBallDeployment } from './TennisBallDeployment';
import type { BallHopperState, BallCannonConfig, BallBoyFeedEvent } from '../../utils/ballDeployment';
import { createCheckerplateTexture, createKnurlingTexture } from '../../materials/craneMaterials';

/**
 * ============================================================================
 * TENNIS MOUNTED CRANE RIG & DOLLY (AGENT 13 / 16 / 21)
 * FBX-Kranarm-Montage, Fahrwerk, 3-Achsen Schläger & Ball-Kran Deployment System
 * ============================================================================
 */

// ⚡ ZERO-GC SCRATCH OBJECTS FOR REALTIME FRAME LOOPS
const _racketNeckPos = new THREE.Vector3();
const _racketNeckQuat = new THREE.Quaternion();
const _racketTargetPos = new THREE.Vector3();
const _racketTargetQuat = new THREE.Quaternion();

export function SupertechnoDollyBase({ 
  teamColor = '#facc15'
}: { 
  teamColor?: string;
}) {
  const { checkerplateTex, knurlingTex } = useMemo(() => ({
    checkerplateTex: createCheckerplateTexture(),
    knurlingTex: createKnurlingTexture()
  }), []);

  const matChassisDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x141820,
    roughness: 0.42,
    metalness: 0.78
  }), []);

  const matDeckCheckerplate = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.35,
    metalness: 0.85,
    bumpMap: checkerplateTex,
    bumpScale: 0.05
  }), [checkerplateTex]);

  const matPedestalBlack = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f131a,
    roughness: 0.35,
    metalness: 0.88
  }), []);

  const matChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.12,
    metalness: 0.98,
    envMapIntensity: 2.0
  }), []);

  const matBrassKnurled = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    bumpMap: knurlingTex,
    bumpScale: 0.03,
    roughness: 0.28,
    metalness: 0.88,
    envMapIntensity: 1.5
  }), [knurlingTex]);

  const matTireRubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.85,
    metalness: 0.08
  }), []);

  const matAlloyRim = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xc4ccd8,
    roughness: 0.24,
    metalness: 0.94,
    envMapIntensity: 1.8
  }), []);

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
    color: teamColor,
    emissive: teamColor,
    emissiveIntensity: 0.6,
    roughness: 0.35,
    metalness: 0.45
  }), [teamColor]);

  // 4 Corner Wheel Positions (Querfahrt Crab Alignment)
  const wheelPositions: [number, number, number, boolean][] = [
    [-0.84, 0.26, -0.92, true],
    [0.84, 0.26, -0.92, false],
    [-0.84, 0.26, 0.92, true],
    [0.84, 0.26, 0.92, false]
  ];

  // 4 Corner Outrigger Jacks
  const outriggerPositions: [number, number][] = [
    [-1.04, -1.02],
    [1.04, -1.02],
    [-1.04, 1.02],
    [1.04, 1.02]
  ];

  return (
    <group position={[0, 0, 0]}>
      {/* 1. SCULPTED DOLLY CHASSIS FRAME & SIDE SKIRTS */}
      <group position={[0, 0, 0]}>
        <mesh castShadow receiveShadow material={matChassisDark} position={[0, 0.24, 0]}>
          <boxGeometry args={[1.56, 0.24, 2.10]} />
        </mesh>
        <mesh castShadow receiveShadow material={matDeckCheckerplate} position={[0, 0.365, 0]}>
          <boxGeometry args={[1.54, 0.015, 2.08]} />
        </mesh>

        {/* Left Side Skirt */}
        <group position={[-0.82, 0.22, 0]}>
          <mesh castShadow receiveShadow material={matChassisDark}>
            <boxGeometry args={[0.08, 0.20, 1.70]} />
          </mesh>
        </group>

        {/* Right Side Skirt */}
        <group position={[0.82, 0.22, 0]}>
          <mesh castShadow receiveShadow material={matChassisDark}>
            <boxGeometry args={[0.08, 0.20, 1.70]} />
          </mesh>
        </group>

        {/* Front & Rear Transverse Axle Tubes */}
        <mesh castShadow material={matChassisDark} position={[0, 0.26, -0.92]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 1.76, 20]} />
        </mesh>
        <mesh castShadow material={matChassisDark} position={[0, 0.26, 0.92]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 1.76, 20]} />
        </mesh>
      </group>

      {/* 2. DREHKRANZ-BASISSOCKEL UNTER DER KRANSÄULE */}
      <mesh castShadow receiveShadow material={matPedestalBlack} position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.62, 0.68, 0.12, 32]} />
      </mesh>
      <mesh castShadow material={matChassisDark} position={[0, 0.49, 0]}>
        <cylinderGeometry args={[0.55, 0.58, 0.04, 32]} />
      </mesh>

      {/* 3. 4x ECHTE SCHWERLAST-LUFTREIFEN-BAUGRUPPEN */}
      {wheelPositions.map(([wx, wy, wz, isLeft], wIdx) => (
        <group key={`dolly-wheel-${wIdx}`} position={[wx, wy, wz]} rotation={[0, Math.PI / 2, 0]}>
          <mesh castShadow material={matChassisDark} position={[isLeft ? 0.06 : -0.06, 0, 0]}>
            <boxGeometry args={[0.07, 0.14, 0.12]} />
          </mesh>

          <mesh castShadow material={matPedestalBlack} position={[isLeft ? 0.02 : -0.02, 0.08, 0.05]}>
            <boxGeometry args={[0.05, 0.09, 0.09]} />
          </mesh>
          <mesh castShadow material={matYellowAccent} position={[isLeft ? 0.022 : -0.022, 0.08, 0.05]}>
            <boxGeometry args={[0.052, 0.025, 0.08]} />
          </mesh>

          <group>
            <mesh castShadow receiveShadow material={matTireRubber} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.26, 0.26, 0.18, 36]} />
            </mesh>
            <mesh castShadow receiveShadow material={matTireRubber} position={[isLeft ? -0.09 : 0.09, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.21, 0.05, 16, 36]} />
            </mesh>
            <mesh castShadow receiveShadow material={matTireRubber} position={[isLeft ? 0.09 : -0.09, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.21, 0.05, 16, 36]} />
            </mesh>

            <mesh castShadow receiveShadow material={matAlloyRim} position={[isLeft ? -0.082 : 0.082, 0, 0]} rotation={[0, isLeft ? -Math.PI / 2 : Math.PI / 2, 0]}>
              <cylinderGeometry args={[0.175, 0.175, 0.025, 32]} />
            </mesh>

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

            <mesh castShadow material={matChrome} position={[isLeft ? -0.092 : 0.092, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.172, 0.008, 12, 32]} />
            </mesh>

            <mesh castShadow material={matPedestalBlack} position={[isLeft ? -0.098 : 0.098, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.016, 20]} />
            </mesh>
            <mesh castShadow material={matChrome} position={[isLeft ? -0.106 : 0.106, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.038, 0.004, 8, 20]} />
            </mesh>
            <mesh castShadow material={matYellowAccent} position={[isLeft ? -0.107 : 0.107, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, 0.004, 16]} />
            </mesh>

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

            <mesh castShadow material={matBrakeRotor} position={[isLeft ? 0.02 : -0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.15, 0.15, 0.018, 24]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* 4. 4x CORNER LEVELING OUTRIGGER JACKS */}
      {outriggerPositions.map(([ox, oz], oIdx) => {
        const isLeft = ox < 0;
        return (
          <group key={`outrigger-${oIdx}`} position={[ox, 0, oz]}>
            <mesh castShadow receiveShadow material={matChassisDark} position={[isLeft ? 0.06 : -0.06, 0.24, 0]}>
              <boxGeometry args={[0.16, 0.12, 0.16]} />
            </mesh>

            <mesh castShadow receiveShadow material={matRubberFootPad} position={[0, 0.015, 0]}>
              <cylinderGeometry args={[0.08, 0.09, 0.03, 24]} />
            </mesh>

            <mesh castShadow material={matChrome} position={[0, 0.28, 0]}>
              <cylinderGeometry args={[0.024, 0.024, 0.52, 20]} />
            </mesh>

            <mesh castShadow material={matBrassKnurled} position={[0, 0.36, 0]}>
              <cylinderGeometry args={[0.075, 0.075, 0.045, 32]} />
            </mesh>

            <mesh castShadow material={matChrome} position={[0, 0.54, 0]}>
              <boxGeometry args={[0.18, 0.02, 0.025]} />
            </mesh>
          </group>
        );
      })}

      {/* 5. SIDE TEAM LED ACCENT LINES */}
      <mesh material={matYellowAccent} position={[0, 0.26, 1.06]}>
        <boxGeometry args={[1.4, 0.025, 0.01]} />
      </mesh>
      <mesh material={matYellowAccent} position={[0, 0.26, -1.06]}>
        <boxGeometry args={[1.4, 0.025, 0.01]} />
      </mesh>

    </group>
  );
}

export interface MountedCranePlayerProps {
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
  hopperState?: BallHopperState;
  cannonConfig?: BallCannonConfig;
  activeFeedEvent?: BallBoyFeedEvent | null;
}

export function MountedCranePlayer({
  crane,
  kinematicsRef,
  teamColor,
  stringGlow,
  racketWorldPosRef,
  racketWorldQuatRef,
  baseRotation = 0,
  dollyTrackZ = -15.2,
  dollyGroupRef,
  hopperState,
  cannonConfig,
  activeFeedEvent
}: MountedCranePlayerProps) {
  const racketHeadGroupRef = useRef<THREE.Group>(null);
  const racketTargetRef = useRef<THREE.Group>(null);

  useFrame(() => {
    // 1. Synchronize Head directly to FBX jointNeck Bone World Matrix
    if (crane && crane.isLoaded && crane.nodes.neck && racketHeadGroupRef.current) {
      if (dollyGroupRef.current) {
        dollyGroupRef.current.updateMatrixWorld(true);
      } else {
        crane.group.updateMatrixWorld(true);
      }

      crane.nodes.neck.getWorldPosition(_racketNeckPos);
      crane.nodes.neck.getWorldQuaternion(_racketNeckQuat);

      racketHeadGroupRef.current.position.copy(_racketNeckPos);
      racketHeadGroupRef.current.quaternion.copy(_racketNeckQuat);
    }

    // 2. Track Racket Sweet Spot for Hit detection & Camera POV
    if (racketTargetRef.current) {
      racketTargetRef.current.getWorldPosition(_racketTargetPos);
      racketTargetRef.current.getWorldQuaternion(_racketTargetQuat);
      racketWorldPosRef.current.copy(_racketTargetPos);
      if (racketWorldQuatRef) {
        racketWorldQuatRef.current.copy(_racketTargetQuat);
      }
    }
  });

  return (
    <>
      {/* 1. CRANE DOLLY BASE & FBX SKELETON */}
      <group ref={dollyGroupRef} position={[0, 0, dollyTrackZ]} rotation={[0, baseRotation, 0]}>
        <SupertechnoDollyBase 
          teamColor={teamColor} 
        />
        {crane && <primitive object={crane.group} />}
      </group>

      {/* 2. DEDICATED TENNIS RACKET GIMBAL HEAD */}
      <group ref={racketHeadGroupRef}>
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

      {/* 3. DYNAMIC REAR COUNTERWEIGHT ASSEMBLY */}
      <CraneCounterweight
        crane={crane}
        kinematicsRef={kinematicsRef}
        visible={true}
      />

      {/* 4. 🎾 TRANSPARENTES BALLROHR OBEN AUF DEM KRAN NACH DEN GEWICHTEN (AGENT 21) */}
      <TennisBallDeployment
        crane={crane}
        teamColor={teamColor}
        hopperState={hopperState}
        cannonConfig={cannonConfig}
        activeFeedEvent={activeFeedEvent}
      />
    </>
  );
}
