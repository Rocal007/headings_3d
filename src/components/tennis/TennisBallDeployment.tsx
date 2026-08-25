import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Supertechno50FBXModel } from '../../model/Supertechno50FBXModel';
import { 
  type BallHopperState, 
  type BallCannonConfig, 
  type BallBoyFeedEvent,
  computeBallBoyDeliveryPosition 
} from '../../utils/ballDeployment';
import { createCarbonFiberTexture, createKnurlingTexture } from '../../materials/craneMaterials';

/**
 * ============================================================================
 * PNEUMATIC TOP-BOOM BALL TUBE & LAUNCH ASSEMBLY (AGENT 21)
 * Transparentes Polycarbonat-Ballrohr mit gestapelten Tennisbällen, montiert
 * OBEN AUF DEM KRANAUSLEGER (Beam 1) direkt NACH DEN GEGENGEWICHTEN.
 * ============================================================================
 */

export interface TennisBallDeploymentProps {
  crane?: Supertechno50FBXModel | null;
  teamColor?: string;
  hopperState?: BallHopperState;
  cannonConfig?: BallCannonConfig;
  activeFeedEvent?: BallBoyFeedEvent | null;
  visible?: boolean;
}

// ⚡ ZERO-GC SCRATCH VECTORS FOR CRANE BOOM SYNCHRONIZATION
const _beamWorldPos = new THREE.Vector3();
const _beamWorldQuat = new THREE.Quaternion();

export function TennisBallDeployment({
  crane,
  teamColor = '#38bdf8',
  hopperState,
  cannonConfig,
  activeFeedEvent,
  visible = true
}: TennisBallDeploymentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const barrelPitchRef = useRef<THREE.Group>(null);
  const muzzleGlowRef = useRef<THREE.PointLight>(null);
  const shockRingRef = useRef<THREE.Mesh>(null);
  const incomingBallRef = useRef<THREE.Group>(null);

  const { carbonTex, knurlTex } = useMemo(() => ({
    carbonTex: createCarbonFiberTexture(),
    knurlTex: createKnurlingTexture()
  }), []);

  // --- PBR MATERIALS ---
  const matCarbonFiber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x11161f,
    roughness: 0.30,
    metalness: 0.75,
    bumpMap: carbonTex,
    bumpScale: 0.04
  }), [carbonTex]);

  const matDarkTitanium = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x222834,
    roughness: 0.25,
    metalness: 0.92,
    envMapIntensity: 1.8
  }), []);

  const matAnodizedTeam = useMemo(() => new THREE.MeshStandardMaterial({
    color: teamColor,
    emissive: teamColor,
    emissiveIntensity: 0.45,
    roughness: 0.30,
    metalness: 0.85
  }), [teamColor]);

  const matBrassPneumatic = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    bumpMap: knurlTex,
    bumpScale: 0.03,
    roughness: 0.22,
    metalness: 0.90,
    envMapIntensity: 1.6
  }), [knurlTex]);

  const matTransparentTube = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    transmission: 0.92,
    opacity: 1.0,
    transparent: true,
    roughness: 0.05,
    metalness: 0.02,
    ior: 1.52,
    thickness: 0.03
  }), []);

  const matPressureGaugeGlass = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: '#0284c7',
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.5
  }), []);

  const matTennisBallFelt = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ccff00',
    emissive: '#84cc16',
    emissiveIntensity: 0.35,
    roughness: 0.85,
    metalness: 0.05
  }), []);

  const matPneumaticHose = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x090b10,
    roughness: 0.65,
    metalness: 0.2
  }), []);

  const loadedCount = hopperState?.loadedCount ?? 6;
  const currentPressure = hopperState?.pressureBar ?? 8.4;

  // Geometry dimensions of the top-boom ball tube
  // Mounted along Beam 1 top spine starting right after the counterweights (z = -1.18m to z = -3.38m)
  const tubeStartZ = -1.18;
  const tubeEndZ = -3.38;
  const tubeLength = Math.abs(tubeEndZ - tubeStartZ); // 2.20m length
  const tubeMidZ = (tubeStartZ + tubeEndZ) / 2;       // -2.28m
  const tubeY = 0.38;                                // Height above boom pivot axis

  // 16 Ball Stack Slots along the 2.2m tube
  const maxBalls = 14;
  const ballSpacing = 0.125;

  useFrame((_, delta) => {
    // 1. Synchronize Group Transform to crane.nodes.beams in real-time
    if (groupRef.current && crane && crane.isLoaded && crane.nodes.beams) {
      const beamNode = crane.nodes.beams;
      beamNode.updateWorldMatrix(true, false);
      beamNode.getWorldPosition(_beamWorldPos);
      beamNode.getWorldQuaternion(_beamWorldQuat);
      groupRef.current.position.copy(_beamWorldPos);
      groupRef.current.quaternion.copy(_beamWorldQuat);
    }

    // 2. Synchronize Barrel Pitch Angle (Elevation)
    if (barrelPitchRef.current && cannonConfig) {
      const pitchRad = THREE.MathUtils.degToRad(cannonConfig.launchPitchDeg || 72);
      barrelPitchRef.current.rotation.x = THREE.MathUtils.lerp(
        barrelPitchRef.current.rotation.x,
        -pitchRad,
        Math.min(1.0, delta * 10.0)
      );
    }

    // 3. Muzzle Flash & Shockwave Ring
    if (muzzleGlowRef.current && cannonConfig) {
      const targetIntensity = cannonConfig.barrelGlowIntensity * 2.5;
      muzzleGlowRef.current.intensity = THREE.MathUtils.lerp(
        muzzleGlowRef.current.intensity,
        targetIntensity,
        Math.min(1.0, delta * 8.0)
      );
    }

    if (shockRingRef.current) {
      if (cannonConfig && cannonConfig.barrelGlowIntensity > 0.3) {
        shockRingRef.current.visible = true;
        const scaleFactor = 1.0 + (cannonConfig.barrelGlowIntensity - 0.3) * 1.5;
        shockRingRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
      } else {
        shockRingRef.current.visible = false;
      }
    }

    // 4. Incoming Ballboy Delivery Feed Animation
    if (incomingBallRef.current && activeFeedEvent && activeFeedEvent.isActive) {
      const currentFeedPos = computeBallBoyDeliveryPosition(activeFeedEvent, activeFeedEvent.progress);
      incomingBallRef.current.position.copy(currentFeedPos);
      incomingBallRef.current.visible = true;
    } else if (incomingBallRef.current) {
      incomingBallRef.current.visible = false;
    }
  });

  if (!visible) return null;

  return (
    <>
      {/* 1. TOP-BOOM MOUNTED BALL TUBE (SYNCHRONIZED TO CRANE BEAM ROTATION & ELEVATION) */}
      <group ref={groupRef}>
        {/* 
          ========================================================================
          A. TRANSPARENTES ACRYL/POLYCARBONAT-BALLROHR (OBEN AUF DEM AUSLEGER)
          ========================================================================
        */}
        <group position={[0, tubeY, tubeMidZ]}>
          {/* Main Transparent Cylindrical Tube Body */}
          <mesh castShadow receiveShadow material={matTransparentTube} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.052, 0.052, tubeLength, 28, 1, true]} />
          </mesh>

          {/* Inner Light Refraction Guide */}
          <mesh material={matTransparentTube} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.048, 0.048, tubeLength - 0.02, 20, 1, true]} />
          </mesh>

          {/* Longitudinal Carbon Fiber Cage Stiffener Struts */}
          {[-0.054, 0.054].map((rx, idx) => (
            <mesh key={`top-strut-${idx}`} castShadow material={matCarbonFiber} position={[rx, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.005, 0.005, tubeLength, 12]} />
            </mesh>
          ))}
          <mesh castShadow material={matCarbonFiber} position={[0, 0.054, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, tubeLength, 12]} />
          </mesh>
        </group>

        {/* 
          ========================================================================
          B. 14x SICHTBARE GESTAPELTE TENNISBÄLLE IM TRANSPARENTEN ROHR
          ========================================================================
        */}
        <group position={[0, tubeY, 0]}>
          {Array.from({ length: maxBalls }).map((_, idx) => {
            // Balls populate from front (launch zone z = -3.25m) towards rear (z = -1.35m)
            const ballZ = -3.25 + idx * ballSpacing;
            // Proportionally show balls based on loaded count
            const isBallLoaded = idx < Math.round((loadedCount / 6) * maxBalls);

            if (!isBallLoaded) return null;

            return (
              <group key={`boom-stacked-ball-${idx}`} position={[0, 0, ballZ]}>
                {/* Tennisball Filzkern */}
                <mesh castShadow material={matTennisBallFelt}>
                  <sphereGeometry args={[0.042, 20, 20]} />
                </mesh>
                {/* Weiße 3D-Bespannungsnaht */}
                <mesh rotation={[0.4 + idx * 0.45, 0.6 + idx * 0.35, 0]}>
                  <torusGeometry args={[0.0425, 0.0022, 8, 20]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.9} />
                </mesh>
              </group>
            );
          })}
        </group>

        {/* 
          ========================================================================
          C. 5x CARBON/ALUMINIUM-SATTELHALTERUNGEN AN DEN BOOM-SCHIENEN
          ========================================================================
        */}
        {[-1.25, -1.75, -2.25, -2.75, -3.25].map((bz, sIdx) => (
          <group key={`saddle-bracket-${sIdx}`} position={[0, tubeY, bz]}>
            {/* Anodized Outer Ring Clamp */}
            <mesh castShadow material={matAnodizedTeam} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.054, 0.006, 10, 28]} />
            </mesh>

            {/* Bottom Saddle Mount Base to Beam 1 Structure */}
            <mesh castShadow material={matDarkTitanium} position={[0, -0.06, 0]}>
              <boxGeometry args={[0.18, 0.05, 0.04]} />
            </mesh>

            {/* Left & Right Fastening Hex Bolts */}
            {[-0.07, 0.07].map((bx, bIdx) => (
              <mesh key={`clamp-bolt-${sIdx}-${bIdx}`} castShadow material={matDarkTitanium} position={[bx, -0.05, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
              </mesh>
            ))}
          </group>
        ))}

        {/* 
          ========================================================================
          D. HINTERER EINFÜLLTRICHTER (DIREKT NACH DEN GEWICHTEN BEI Z = -1.18M)
          ========================================================================
        */}
        <group position={[0, tubeY, tubeStartZ + 0.02]} rotation={[0.3, 0, 0]}>
          <mesh castShadow material={matDarkTitanium} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.092, 0.052, 0.14, 24, 1, true]} />
          </mesh>
          <mesh castShadow material={matAnodizedTeam} position={[0, 0.02, 0.07]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.092, 0.007, 10, 24]} />
          </mesh>
        </group>

        {/* 
          ========================================================================
          E. VORDERER PNEUMATISCHER VEREINZELUNGS- & WERFER-BLOCK (BEI Z = -3.38M)
          ========================================================================
        */}
        <group position={[0, tubeY, tubeEndZ]}>
          {/* Heavy Solenoid Valve Housing */}
          <mesh castShadow material={matBrassPneumatic} position={[0, 0, -0.06]}>
            <boxGeometry args={[0.16, 0.12, 0.14]} />
          </mesh>
          <mesh castShadow material={matDarkTitanium} position={[0, 0.06, -0.06]}>
            <cylinderGeometry args={[0.058, 0.058, 0.04, 20]} />
          </mesh>

          {/* Angled Pneumatic Serve Toss Barrel (Pointing Upward & Forward at 72° Elevation) */}
          <group ref={barrelPitchRef} position={[0, 0.06, -0.06]} rotation={[-THREE.MathUtils.degToRad(72), 0, 0]}>
            {/* Titanium Launch Barrel */}
            <mesh castShadow material={matDarkTitanium} position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.048, 0.054, 0.44, 24, 1, true]} />
            </mesh>
            {/* Muzzle Collar */}
            <mesh castShadow material={matAnodizedTeam} position={[0, 0, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.058, 0.058, 0.05, 24]} />
            </mesh>
            <mesh castShadow material={matBrassPneumatic} position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.055, 0.055, 0.03, 24]} />
            </mesh>

            {/* Pneumatischer Druckluft-Schockring bei Toss-Abschuss */}
            <mesh ref={shockRingRef} position={[0, 0, 0.48]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
              <ringGeometry args={[0.04, 0.12, 24]} />
              <meshBasicMaterial color={teamColor} transparent opacity={0.65} side={THREE.DoubleSide} />
            </mesh>

            {/* Muzzle Flash & Light Source */}
            <pointLight
              ref={muzzleGlowRef}
              position={[0, 0, 0.50]}
              color={teamColor}
              intensity={0.6}
              distance={2.4}
            />
          </group>

          {/* Digitales Druckluft-Manometer */}
          <group position={[-0.14, 0.04, -0.06]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh castShadow material={matDarkTitanium}>
              <cylinderGeometry args={[0.052, 0.052, 0.028, 20]} />
            </mesh>
            <mesh castShadow material={matBrassPneumatic} position={[0, 0, 0.016]}>
              <torusGeometry args={[0.050, 0.005, 8, 20]} />
            </mesh>
            <mesh position={[0, 0, 0.018]} material={matPressureGaugeGlass}>
              <cylinderGeometry args={[0.045, 0.045, 0.003, 20]} />
            </mesh>
            <mesh position={[0, -0.018, 0.021]}>
              <boxGeometry args={[0.048, 0.008, 0.002]} />
              <meshStandardMaterial
                color={currentPressure >= 7.0 ? '#22c55e' : '#eab308'}
                emissive={currentPressure >= 7.0 ? '#22c55e' : '#eab308'}
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        </group>

        {/* 
          ========================================================================
          F. STAHLFLEX-DRUCKLUFT-SCHLÄUCHE ENTLANG DES BALLROHRS
          ========================================================================
        */}
        <group position={[0, tubeY - 0.04, tubeMidZ]}>
          <mesh castShadow material={matPneumaticHose} position={[-0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, tubeLength, 12]} />
          </mesh>
          <mesh castShadow material={matPneumaticHose} position={[0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, tubeLength, 12]} />
          </mesh>
        </group>
      </group>

      {/* 2. INCOMING BALLBOY DELIVERY TRACER TENNIS BALL (STANDALONE WORLD OBJECT) */}
      <group ref={incomingBallRef} visible={false}>
        <mesh castShadow material={matTennisBallFelt}>
          <sphereGeometry args={[0.045, 18, 18]} />
        </mesh>
        <mesh rotation={[0.4, 0.6, 0]}>
          <torusGeometry args={[0.0455, 0.0025, 8, 18]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
        <pointLight color={teamColor} intensity={1.2} distance={1.8} />
      </group>
    </>
  );
}
