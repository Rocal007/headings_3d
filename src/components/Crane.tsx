import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';
import RemoteCameraHead from './RemoteCameraHead';
import CraneCounterweight from './CraneCounterweight';
import CraneColumnAssembly from './CraneColumnAssembly';
import CraneFulcrumAssembly from './CraneFulcrumAssembly';
import {
  SAFE_FLOOR_CLEARANCE,
  getFrontLowestY,
  getRearLowestY,
  getAllowedTiltRange,
  getAllowedExtensionMax,
  getMinColumnElevationForPose,
  clampBoomTilt,
  clampColumnElevation,
  clampTeleExtension,
  clampBasePan,
  enforceCraneFloorLimits
} from '../utils/craneKinematics';
import {
  CraneSceneryEnvironment,
  sceneryBgColors,
  sceneryOptions
} from './CraneScenery';
import type { CraneSceneryType } from './CraneScenery';
import { CraneOperator } from './CraneOperator';
import type { CraneOperatorMode } from './CraneOperator';

export type { CraneSceneryType, CraneOperatorMode };
export type CraneCableType = 'photo' | 'bundle' | 'flat' | 'heavy' | 'braided';

// --- DYNAMIC SLOPED FESTOON CABLE SYSTEM FOR CRANE BOOM (MATCHING REFERENCE PHOTO) ---
function CraneFestoonCable({
  crane,
  kinematics,
  cableType = 'photo',
  sagFactor = 0.3,
  loopCount = 10,
  visible = true
}: {
  crane: Supertechno50FBXModel | null;
  kinematics: {
    teleExtension: number;
    boomTilt: number;
    basePan: number;
    dollyTrack: number;
    columnLift?: number;
    headPan?: number;
    headTilt?: number;
    headRoll?: number;
  };
  cableType: CraneCableType;
  sagFactor: number;
  loopCount?: number;
  visible: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // High-fidelity PBR Materials matching reference photo
  const matPhotoBlackRubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.52,
    metalness: 0.15
  }), []);

  const matPhotoBlackGloss = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0d0d0f,
    roughness: 0.35,
    metalness: 0.25
  }), []);

  const matFlatCable = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x181f2c,
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
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.75
  }), []);

  const matScrewChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.98,
    roughness: 0.12
  }), []);

  const matRailDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e242e,
    metalness: 0.88,
    roughness: 0.32
  }), []);

  const matBackerPlate = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x181c22,
    metalness: 0.75,
    roughness: 0.45
  }), []);

// ⚡ ZERO-GC SCRATCH OBJECTS FOR REALTIME FRAME LOOPS
const _festoonBeamWorldPos = new THREE.Vector3();
const _festoonBeamWorldQuat = new THREE.Quaternion();

  // Update Group Position & Rotation to track crane.nodes.beams in real-time
  useFrame(() => {
    if (!groupRef.current || !crane || !crane.isLoaded || !crane.nodes.beams) return;
    const beamNode = crane.nodes.beams;

    beamNode.getWorldPosition(_festoonBeamWorldPos);
    beamNode.getWorldQuaternion(_festoonBeamWorldQuat);

    groupRef.current.position.copy(_festoonBeamWorldPos);
    groupRef.current.quaternion.copy(_festoonBeamWorldQuat);
  });

  // Calculate local gravity vector inside the tilted boom coordinate space
  const tiltRad = THREE.MathUtils.degToRad(kinematics.boomTilt || 0);
  const localGravY = -Math.cos(tiltRad);
  const localGravZ = Math.sin(tiltRad);
  const localGrav = useMemo(() => new THREE.Vector3(0, localGravY, localGravZ).normalize(), [localGravY, localGravZ]);

  // Boom Rail Coordinates (mounted along the boom flank girder)
  const ext = kinematics.teleExtension || 0; // 0 to 11.3m

  // In FBX ST50Plus coordinate space:
  // Crane boom extends along negative Z from pivot
  // At ext = 0m (retracted): tip is at z = -3.24m, y = 0.05m
  // At ext = 11.3m (fully extended): tip is at z = -14.64m, y = 0.05m
  const tExt = Math.max(0, Math.min(1.0, ext / 11.3));
  const tipZ = -3.34 - tExt * 11.40;
  const tipY = 0.05;
  const tipX = -0.01;

  // Festoon cable and guide rail start strictly AFTER the counterweights (in front of front stop z = -1.08m)
  const zStart = -1.18; // Base carriage station positioned strictly ahead of the counterweight zone (z <= -1.15m)
  const zEnd = tipZ + 0.28; // Cable rail ends right at the front nose mounting bracket
  const totalSpan = Math.abs(zEnd - zStart);

  // Linear Guide Rail on Boom Girder Flank (Matching Photo)
  const railX = -0.285;
  const railY = -0.06;

  // Bracket dimensions (Der Langloch-Winkel):
  // Bracket arm extends UPWARDS from railY (+0.205m high)
  const clampYOffset = 0.205; // Top clamp position above rail
  const clampXOffset = -0.034; // Top clamp position outward from rail

  // Generate continuous sliding carrier stations along the linear guide rail
  const numStations = loopCount + 1;
  const stations = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < numStations; i++) {
      const t = i / (numStations - 1);
      const zPos = zStart + t * (zEnd - zStart);
      pts.push(new THREE.Vector3(railX, railY, zPos));
    }
    return pts;
  }, [numStations, railX, railY, zStart, zEnd]);

  // Compute Photo-Accurate Teardrop Cable Loops (clamped at top of vertical slotted brackets)
  const loopCurves = useMemo(() => {
    if (!visible) return [];
    const curves: {
      center: THREE.CatmullRomCurve3;
      strand1: THREE.CatmullRomCurve3;
      strand2: THREE.CatmullRomCurve3;
      bundleStrands: THREE.CatmullRomCurve3[];
    }[] = [];

    // Nominal arc length per loop segment so loops hang in deep teardrop U-shapes
    const nomLen = Math.max(1.45, 1.60 + (11.4 / loopCount) * 0.1);

    for (let i = 0; i < stations.length - 1; i++) {
      const st1 = stations[i];
      const st2 = stations[i + 1];
      const spanDist = Math.abs(st2.z - st1.z);

      // Top clamp positions at the upper tip of each vertical slotted bracket
      const p1 = new THREE.Vector3(st1.x + clampXOffset, st1.y + clampYOffset, st1.z);
      const p2 = new THREE.Vector3(st2.x + clampXOffset, st2.y + clampYOffset, st2.z);

      // Catenary sag physics formula: deep loops when bunched, shallower when extended
      const excess = Math.max(0.08, nomLen - spanDist);
      const baseSag = Math.sqrt(excess * (0.62 * nomLen + 0.18 * spanDist)) * sagFactor;

      const pointsCount = 26;
      const ctrlPoints: THREE.Vector3[] = [];

      for (let s = 0; s <= pointsCount; s++) {
        const t = s / pointsCount;
        let pt = new THREE.Vector3();

        if (t <= 0.12) {
          // Crown Arch 1: Cable rises and arches outward over Bracket 1's top clamp
          const archU = t / 0.12;
          const archSin = Math.sin(archU * Math.PI);
          const archHeight = 0.055 * archSin * Math.min(1.0, excess / 0.7);
          const archOut = 0.022 * archSin;
          const archZ = -0.020 * archSin;

          pt.set(p1.x - archOut, p1.y + archHeight, p1.z + archZ);
        } else if (t >= 0.88) {
          // Crown Arch 2: Cable arches over Bracket 2's top clamp
          const archU = (t - 0.88) / 0.12;
          const archSin = Math.sin(archU * Math.PI);
          const archHeight = 0.055 * archSin * Math.min(1.0, excess / 0.7);
          const archOut = 0.022 * archSin;
          const archZ = 0.020 * archSin;

          pt.set(p2.x - archOut, p2.y + archHeight, p2.z + archZ);
        } else {
          // Main Hanging Catenary U-Loop between the two brackets
          const loopU = (t - 0.12) / 0.76;
          pt.lerpVectors(p1, p2, loopU);

          const sagSin = Math.sin(loopU * Math.PI);
          const sagAmount = baseSag * Math.pow(sagSin, 1.15);

          // Displace along local gravity vector (hangs DOWNWARDS)
          pt.addScaledVector(localGrav, sagAmount);

          // Lateral outward teardrop flare
          pt.x -= 0.028 * Math.pow(sagSin, 0.85) * Math.min(1.0, excess / 0.7);
        }

        ctrlPoints.push(pt);
      }

      const mainCurve = new THREE.CatmullRomCurve3(ctrlPoints, false, 'centripetal');

      // Dual parallel strands for the authentic Technocrane dual-cable harness (as in photo)
      const strand1Pts = ctrlPoints.map(p => new THREE.Vector3(p.x - 0.016, p.y, p.z));
      const strand2Pts = ctrlPoints.map(p => new THREE.Vector3(p.x + 0.016, p.y, p.z));

      const strand1 = new THREE.CatmullRomCurve3(strand1Pts, false, 'centripetal');
      const strand2 = new THREE.CatmullRomCurve3(strand2Pts, false, 'centripetal');

      // 4-core multi strands
      const bundleOffsets = [[-0.022, 0.014], [0.022, 0.014], [-0.022, -0.014], [0.022, -0.014]];
      const bundleStrands = bundleOffsets.map(([ox, oy]) => {
        const pts = ctrlPoints.map(p => new THREE.Vector3(p.x + ox, p.y + oy, p.z));
        return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      });

      curves.push({ center: mainCurve, strand1, strand2, bundleStrands });
    }

    return curves;
  }, [stations, localGrav, sagFactor, loopCount, visible, clampXOffset, clampYOffset]);

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {/* 
        ========================================================================
        1. LINEAR GUIDE RAIL & BACKER MOUNTING PLATE ON BOOM FLANK (FOTO-LOOK)
        ========================================================================
      */}
      <group position={[railX, railY, (zStart + zEnd) / 2]}>
        {/* Backer Mounting Plate with Hex Bolt arrays matching photo */}
        <mesh castShadow material={matBackerPlate} position={[0.012, 0.04, 0]}>
          <boxGeometry args={[0.006, 0.15, totalSpan]} />
        </mesh>
        {/* Main Linear Guide Rail Profile (Dark Phosphated Steel) */}
        <mesh castShadow material={matRailDark} position={[0, 0, 0]}>
          <boxGeometry args={[0.018, 0.024, totalSpan]} />
        </mesh>
        {/* Upper Running Flange */}
        <mesh castShadow material={matRailDark} position={[-0.003, 0.010, 0]}>
          <boxGeometry args={[0.022, 0.005, totalSpan]} />
        </mesh>
        {/* Lower Running Flange */}
        <mesh castShadow material={matRailDark} position={[-0.003, -0.010, 0]}>
          <boxGeometry args={[0.022, 0.005, totalSpan]} />
        </mesh>
        {/* Front End Stop Puffer */}
        <mesh castShadow material={matPhotoBlackGloss} position={[-0.008, 0, -totalSpan / 2 + 0.02]}>
          <boxGeometry args={[0.026, 0.035, 0.025]} />
        </mesh>
        {/* Rear End Stop Puffer */}
        <mesh castShadow material={matPhotoBlackGloss} position={[-0.008, 0, totalSpan / 2 - 0.02]}>
          <boxGeometry args={[0.026, 0.035, 0.025]} />
        </mesh>
      </group>

      {/* 
        ========================================================================
        2. SLIDING CARRIAGES WITH VERTICAL SLOTTED ANGLE BRACKETS (EXAKT WIE AM FOTO!)
        - Base Plate with 4 screws
        - Tall vertical slotted bracket arm (Langloch-Winkel) extending UPWARDS
        - 2 Silver Allen bolts with washers through the vertical slot
        - Top cable clamp saddle at the upper tip
        ========================================================================
      */}
      {stations.map((st, idx) => (
        <group key={`festoon-bracket-${idx}`} position={[st.x, st.y, st.z]}>
          {/* Slider Block gliding on linear rail */}
          <mesh castShadow material={matRailDark} position={[-0.006, 0, 0]}>
            <boxGeometry args={[0.026, 0.036, 0.052]} />
          </mesh>

          {/* Base Mounting Plate (Grundplatte) with rounded corners */}
          <mesh castShadow material={matPhotoBlackGloss} position={[-0.018, 0.025, 0]}>
            <boxGeometry args={[0.008, 0.082, 0.068]} />
          </mesh>
          {/* 4 Corner Bolts / Studs on Base Plate */}
          {[-0.024, 0.024].map((zOff, zi) =>
            [-0.014, 0.052].map((yOff, yi) => (
              <mesh
                key={`base-bolt-${zi}-${yi}`}
                castShadow
                material={matScrewChrome}
                position={[-0.023, yOff + 0.025, zOff]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.0028, 0.0028, 0.004, 8]} />
              </mesh>
            ))
          )}

          {/* Vertical Slotted Angle Bracket Arm (Der Langloch-Winkel) */}
          <group position={[-0.026, 0.105, 0]}>
            {/* Upper Solid Bar Section */}
            <mesh castShadow material={matPhotoBlackGloss} position={[0, 0.068, 0]}>
              <boxGeometry args={[0.006, 0.072, 0.028]} />
            </mesh>
            {/* Lower Slotted Side Rails (Left & Right of Langloch) */}
            <mesh castShadow material={matPhotoBlackGloss} position={[0, -0.015, -0.0095]}>
              <boxGeometry args={[0.006, 0.102, 0.0085]} />
            </mesh>
            <mesh castShadow material={matPhotoBlackGloss} position={[0, -0.015, 0.0095]}>
              <boxGeometry args={[0.006, 0.102, 0.0085]} />
            </mesh>
            {/* Bottom Semicircular End Cap */}
            <mesh castShadow material={matPhotoBlackGloss} position={[0, -0.072, 0]}>
              <boxGeometry args={[0.006, 0.014, 0.028]} />
            </mesh>

            {/* 2 Silver Hex Socket Cap Screws through the Vertical Slot with Washers */}
            {/* Lower Fastener Screw & Washer */}
            <group position={[-0.004, -0.045, 0]}>
              <mesh castShadow material={matScrewChrome} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0065, 0.0065, 0.0018, 14]} />
              </mesh>
              <mesh castShadow material={matScrewChrome} position={[-0.003, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0045, 0.0045, 0.0045, 12]} />
              </mesh>
            </group>
            {/* Upper Fastener Screw & Washer */}
            <group position={[-0.004, -0.005, 0]}>
              <mesh castShadow material={matScrewChrome} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0065, 0.0065, 0.0018, 14]} />
              </mesh>
              <mesh castShadow material={matScrewChrome} position={[-0.003, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0045, 0.0045, 0.0045, 12]} />
              </mesh>
            </group>

            {/* Top Cable Saddle / Clamp Assembly at Tip */}
            <group position={[0, 0.100, 0]}>
              {/* L-Shaped Top Flange */}
              <mesh castShadow material={matPhotoBlackGloss} position={[-0.008, 0, 0]}>
                <boxGeometry args={[0.014, 0.008, 0.028]} />
              </mesh>
              {/* Lower Saddle Cradle */}
              <mesh castShadow material={matPhotoBlackGloss} position={[-0.015, -0.008, 0]}>
                <boxGeometry args={[0.018, 0.016, 0.032]} />
              </mesh>
              {/* Rubber Cable Bushing */}
              <mesh castShadow material={matPhotoBlackRubber} position={[-0.015, -0.008, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.015, 0.0045, 10, 16]} />
              </mesh>
              {/* Clamp Retainer Top Plate */}
              <mesh castShadow material={matPhotoBlackGloss} position={[-0.015, 0.005, 0]}>
                <boxGeometry args={[0.020, 0.006, 0.032]} />
              </mesh>
              {/* 2x Silver Clamping Screws on top plate */}
              <mesh castShadow material={matScrewChrome} position={[-0.015, 0.009, -0.009]}>
                <cylinderGeometry args={[0.002, 0.002, 0.0035, 8]} />
              </mesh>
              <mesh castShadow material={matScrewChrome} position={[-0.015, 0.009, 0.009]}>
                <cylinderGeometry args={[0.002, 0.002, 0.0035, 8]} />
              </mesh>
            </group>
          </group>
        </group>
      ))}

      {/* 
        ========================================================================
        3. DYNAMIC CABLE LOOPS (SCHLAUFEN MIT OBEREM BOGEN & TIEFEM DURCHHANG)
        Matching exact reference photo!
        ========================================================================
      */}
      {loopCurves.map((loop, idx) => {
        if (cableType === 'photo') {
          // Authentic Dual-Strand Black Umbilical Cables (exact match to photo!)
          return (
            <group key={`crane-photo-loop-${idx}`}>
              <mesh castShadow receiveShadow material={matPhotoBlackRubber}>
                <tubeGeometry args={[loop.strand1, 64, 0.020, 12, false]} />
              </mesh>
              <mesh castShadow receiveShadow material={matPhotoBlackRubber}>
                <tubeGeometry args={[loop.strand2, 64, 0.020, 12, false]} />
              </mesh>
              {/* Rubber spacer clamp with silver rivet at the bottom apex of each loop */}
              <group position={loop.center.getPoint(0.5)}>
                <mesh castShadow material={matPhotoBlackGloss}>
                  <boxGeometry args={[0.08, 0.045, 0.035]} />
                </mesh>
                <mesh castShadow material={matScrewChrome} position={[0.041, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.003, 0.003, 0.004, 8]} />
                </mesh>
              </group>
            </group>
          );
        } else if (cableType === 'bundle') {
          // 4-Core Colored Harness
          const mats = [matCableYellow, matCableRed, matCableBlue, matCableGreen];
          return (
            <group key={`crane-loop-bundle-${idx}`}>
              {loop.bundleStrands.map((strand, sIdx) => (
                <mesh key={`strand-${sIdx}`} castShadow receiveShadow material={mats[sIdx]}>
                  <tubeGeometry args={[strand, 56, 0.015, 10, false]} />
                </mesh>
              ))}
            </group>
          );
        } else if (cableType === 'flat') {
          // Flat Festoon Ribbon Cable
          return (
            <group key={`crane-loop-flat-${idx}`}>
              <mesh castShadow receiveShadow material={matFlatCable}>
                <tubeGeometry args={[loop.center, 64, 0.038, 10, false]} />
              </mesh>
              <mesh castShadow receiveShadow material={matCableYellow} position={[0, 0.032, 0]}>
                <tubeGeometry args={[loop.center, 64, 0.014, 8, false]} />
              </mesh>
            </group>
          );
        } else if (cableType === 'braided') {
          // Heavy-Duty Braided Mesh Cable
          return (
            <mesh key={`crane-loop-braided-${idx}`} castShadow receiveShadow material={matBraided}>
              <tubeGeometry args={[loop.center, 64, 0.042, 12, false]} />
            </mesh>
          );
        } else {
          // Heavy Neoprene Power Cable
          return (
            <mesh key={`crane-loop-heavy-${idx}`} castShadow receiveShadow material={matPhotoBlackRubber}>
              <tubeGeometry args={[loop.center, 64, 0.048, 14, false]} />
            </mesh>
          );
        }
      })}

      {/* 
        ========================================================================
        4. DIRECT UMBILICAL LEAD CABLE TO CAMERA HEAD
        "das kabel geht immer bis dorthin und der kamera head sitzt auf der spitze"
        ========================================================================
      */}
      {(() => {
        const lastSt = stations[stations.length - 1];
        if (!lastSt) return null;
        
        const isOverslung = (kinematics as any).overslung || false;
        // Target LEMO socket at rear carrier plate of the AUTOHORIZONT unit at the boom tip
        const socketPos = isOverslung 
          ? new THREE.Vector3(tipX, tipY + 0.32, tipZ - 0.10)
          : new THREE.Vector3(tipX, tipY + 0.05, tipZ + 0.18);

        const lastTopClamp = new THREE.Vector3(lastSt.x + clampXOffset, lastSt.y + clampYOffset, lastSt.z);
        
        const leadCurve = new THREE.CatmullRomCurve3(
          isOverslung ? [
            lastTopClamp,
            new THREE.Vector3(lastTopClamp.x * 0.8, lastTopClamp.y + 0.08, zEnd - 0.10),
            new THREE.Vector3(tipX - 0.04, socketPos.y - 0.04, tipZ - 0.06),
            socketPos
          ] : [
            lastTopClamp,
            new THREE.Vector3(lastTopClamp.x * 0.8, lastTopClamp.y - 0.06, zEnd - 0.04),
            new THREE.Vector3(tipX - 0.02, socketPos.y - 0.02, tipZ + 0.08),
            socketPos
          ],
          false,
          'centripetal'
        );

        const leadStrand1Pts = leadCurve.getPoints(24).map(p => new THREE.Vector3(p.x - 0.014, p.y, p.z));
        const leadStrand2Pts = leadCurve.getPoints(24).map(p => new THREE.Vector3(p.x + 0.014, p.y, p.z));
        const leadStrand1 = new THREE.CatmullRomCurve3(leadStrand1Pts);
        const leadStrand2 = new THREE.CatmullRomCurve3(leadStrand2Pts);

        return (
          <group>
            {/* Cable feed tube running directly into the camera head LEMO socket */}
            {cableType === 'photo' ? (
              <>
                <mesh castShadow receiveShadow material={matPhotoBlackRubber}>
                  <tubeGeometry args={[leadStrand1, 24, 0.020, 12, false]} />
                </mesh>
                <mesh castShadow receiveShadow material={matPhotoBlackRubber}>
                  <tubeGeometry args={[leadStrand2, 24, 0.020, 12, false]} />
                </mesh>
              </>
            ) : (
              <mesh castShadow receiveShadow material={matPhotoBlackRubber}>
                <tubeGeometry args={[leadCurve, 28, 0.034, 12, false]} />
              </mesh>
            )}

            {/* Heavy-Duty Cable Strain Relief Boot at the Head Junction */}
            <mesh castShadow material={matPhotoBlackGloss} position={[tipX, socketPos.y, socketPos.z - 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.036, 0.028, 0.06, 16]} />
            </mesh>
            {/* Gold LEMO Locknut Ring */}
            <mesh castShadow material={matScrewChrome} position={[tipX, socketPos.y, socketPos.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.034, 0.007, 8, 20]} />
            </mesh>
          </group>
        );
      })()}

      {/* 
        ========================================================================
        5. INFEED UMBILICAL CABLE FROM PIVOT ZONE TO FIRST FESTOON STATION
        (As seen in reference photo: cable routes from pivot zone past the weights into station 0 at z = -1.18m)
        ========================================================================
      */}
      {(() => {
        const firstSt = stations[0];
        if (!firstSt) return null;
        const firstTopClamp = new THREE.Vector3(firstSt.x + clampXOffset, firstSt.y + clampYOffset, firstSt.z);
        const infeedStart = new THREE.Vector3(-0.25, 0.22, -0.30); // Upper boom flank near fulcrum
        
        const infeedCurve = new THREE.CatmullRomCurve3([
          infeedStart,
          new THREE.Vector3(-0.28, 0.20, -0.60),
          new THREE.Vector3(-0.31, 0.16, -0.92),
          firstTopClamp
        ], false, 'centripetal');

        const infeedStrand1Pts = infeedCurve.getPoints(20).map(p => new THREE.Vector3(p.x - 0.014, p.y, p.z));
        const infeedStrand2Pts = infeedCurve.getPoints(20).map(p => new THREE.Vector3(p.x + 0.014, p.y, p.z));
        const infeedStrand1 = new THREE.CatmullRomCurve3(infeedStrand1Pts);
        const infeedStrand2 = new THREE.CatmullRomCurve3(infeedStrand2Pts);

        return (
          <group>
            {/* Guide clamps along the upper boom flank for infeed cable */}
            {[-0.45, -0.80].map((cz, cIdx) => (
              <mesh key={`infeed-clamp-${cIdx}`} castShadow material={matPhotoBlackGloss} position={[-0.27, 0.20 - cIdx * 0.035, cz]}>
                <boxGeometry args={[0.02, 0.03, 0.04]} />
              </mesh>
            ))}
            {cableType === 'photo' ? (
              <>
                <mesh castShadow receiveShadow material={matPhotoBlackRubber}>
                  <tubeGeometry args={[infeedStrand1, 24, 0.020, 12, false]} />
                </mesh>
                <mesh castShadow receiveShadow material={matPhotoBlackRubber}>
                  <tubeGeometry args={[infeedStrand2, 24, 0.020, 12, false]} />
                </mesh>
              </>
            ) : (
              <mesh castShadow receiveShadow material={matPhotoBlackRubber}>
                <tubeGeometry args={[infeedCurve, 24, 0.034, 12, false]} />
              </mesh>
            )}
          </group>
        );
      })()}

      {/* 
        ========================================================================
        PHOTO-AUTHENTIC 3-AXIS REMOTE CAMERA HEAD AT THE EXACT CRANE TIP (SPITZE)
        Always hangs down (Underslung mount) with automatic horizon leveling!
        ========================================================================
      */}
      <RemoteCameraHead
        headPan={kinematics.headPan || 0}
        headTilt={kinematics.headTilt || 0}
        headRoll={kinematics.headRoll || 0}
        boomTilt={kinematics.boomTilt || 0}
        autoLevel={true}
        position={[tipX, tipY, tipZ]}
        scale={1.0}
      />
    </group>
  );
}

// --- HIGH-PRECISION STUDIO DOLLY TRACK RAILS (1.88m GAUGE / SPURBREITE ALONG Z-AXIS) ---
function DollyTrackRails({ visible = true }: { visible?: boolean }) {
  const trackLength = 56.0; // 56m total track length (-28m to +28m)
  const trackGauge = 1.68;  // Wheel center-to-center distance matching 0.84m * 2
  const railRadius = 0.024; // 48mm heavy steel tubular track rail

  const matRailSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xdde4ec,
    metalness: 0.95,
    roughness: 0.18
  }), []);

  const matSleeperAnodized = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x181c24,
    metalness: 0.85,
    roughness: 0.45
  }), []);

  const matClampBrass = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xca8a04,
    metalness: 0.85,
    roughness: 0.32
  }), []);

  const matBumperRubber = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.9,
    metalness: 0.1
  }), []);

  const matHazardWarning = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
    metalness: 0.5
  }), []);

  // Sleepers placed every 1.4m along Z
  const sleepers = useMemo(() => {
    const pts: number[] = [];
    for (let z = -trackLength / 2 + 0.7; z <= trackLength / 2 - 0.7; z += 1.4) {
      pts.push(z);
    }
    return pts;
  }, [trackLength]);

  if (!visible) return null;

  return (
    <group position={[0, 0, 0]}>
      {/* Left and Right Main Chrome Tubular Rails (Oriented along Z axis) */}
      <mesh castShadow receiveShadow material={matRailSteel} position={[-trackGauge / 2, railRadius + 0.006, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[railRadius, railRadius, trackLength, 24]} />
      </mesh>
      <mesh castShadow receiveShadow material={matRailSteel} position={[trackGauge / 2, railRadius + 0.006, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[railRadius, railRadius, trackLength, 24]} />
      </mesh>

      {/* Rail Support Sleepers (Traversen) with Locking Clamps */}
      {sleepers.map((zPos, sIdx) => (
        <group key={`sleeper-${sIdx}`} position={[0, 0, zPos]}>
          {/* Main Transverse Heavy Sleeper Beam */}
          <mesh castShadow receiveShadow material={matSleeperAnodized} position={[0, 0.012, 0]}>
            <boxGeometry args={[2.08, 0.024, 0.10]} />
          </mesh>

          {/* Left Rail Mounting Clamp Base & Brass Wedge */}
          <mesh castShadow material={matSleeperAnodized} position={[-trackGauge / 2, 0.026, 0]}>
            <boxGeometry args={[0.08, 0.016, 0.08]} />
          </mesh>
          <mesh castShadow material={matClampBrass} position={[-trackGauge / 2 + 0.038, 0.028, 0]}>
            <boxGeometry args={[0.018, 0.022, 0.05]} />
          </mesh>
          <mesh castShadow material={matClampBrass} position={[-trackGauge / 2 - 0.038, 0.028, 0]}>
            <boxGeometry args={[0.018, 0.022, 0.05]} />
          </mesh>

          {/* Right Rail Mounting Clamp Base & Brass Wedge */}
          <mesh castShadow material={matSleeperAnodized} position={[trackGauge / 2, 0.026, 0]}>
            <boxGeometry args={[0.08, 0.016, 0.08]} />
          </mesh>
          <mesh castShadow material={matClampBrass} position={[trackGauge / 2 + 0.038, 0.028, 0]}>
            <boxGeometry args={[0.018, 0.022, 0.05]} />
          </mesh>
          <mesh castShadow material={matClampBrass} position={[trackGauge / 2 - 0.038, 0.028, 0]}>
            <boxGeometry args={[0.018, 0.022, 0.05]} />
          </mesh>
        </group>
      ))}

      {/* Track End Stops / Safety Buffer Bumpers (Front End Z = -28m & Rear End Z = +28m) */}
      {[-trackLength / 2, trackLength / 2].map((endZ, eIdx) => (
        <group key={`track-end-${eIdx}`} position={[0, 0, endZ]}>
          {/* Heavy Steel Cross Barrier */}
          <mesh castShadow receiveShadow material={matSleeperAnodized} position={[0, 0.07, 0]}>
            <boxGeometry args={[2.14, 0.14, 0.12]} />
          </mesh>
          {/* Warning Stripe Plate */}
          <mesh castShadow material={matHazardWarning} position={[0, 0.07, eIdx === 0 ? 0.062 : -0.062]}>
            <boxGeometry args={[1.90, 0.08, 0.005]} />
          </mesh>
          {/* Left & Right Rubber Bumpers */}
          <mesh castShadow material={matBumperRubber} position={[-trackGauge / 2, 0.07, eIdx === 0 ? 0.09 : -0.09]}>
            <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
          </mesh>
          <mesh castShadow material={matBumperRubber} position={[trackGauge / 2, 0.07, eIdx === 0 ? 0.09 : -0.09]}>
            <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- HELPER TO CREATE TEXT BADGE TEXTURES FOR 3D BLUEPRINT OVERLAY ---
function createBlueprintBadgeTexture(text: string, sub?: string, highlightColor = '#38bdf8'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(10, 15, 26, 0.92)';
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 496, 124, 14);
      ctx.fill();
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 4;
      ctx.roundRect(8, 8, 496, 124, 14);
      ctx.stroke();
    } else {
      ctx.fillRect(8, 8, 496, 124);
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, 496, 124);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, sub ? 50 : 70);

    if (sub) {
      ctx.fillStyle = highlightColor;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(sub, 256, 96);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- HELPER TO CREATE CRISP GROUND TOP-VIEW BLUEPRINT TEXTURE MATCHING PDF SUPERTECHNO 50+ SPEC SHEET ---
function createTopViewGroundBlueprintTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep Technical Blueprint Navy Background
  ctx.fillStyle = '#080d1a';
  ctx.fillRect(0, 0, 2048, 2048);

  // Coordinate System Mapping:
  // Center (0,0) of crane rotation is at (cx, cy) = (1024, 1024) [Exact Texture Center]
  const cx = 1024;
  const cy = 1024;
  const s = 58; // 58 pixels per meter scale

  const leftX = cx - 15 * s;
  const rightX = cx + 15 * s;
  const topY = cy - 16 * s;
  const botY = cy + 4 * s;

  // 1. Grid Lines (1-Meter Grid)
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';

  // Vertical lines (Lateral meters from -15 to +15)
  for (let m = -15; m <= 15; m++) {
    const x = cx + m * s;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, botY);
    ctx.stroke();
  }

  // Horizontal lines (Longitudinal meters from -4 to +16)
  for (let m = -4; m <= 16; m++) {
    const y = cy - m * s;
    ctx.beginPath();
    ctx.moveTo(leftX, y);
    ctx.lineTo(rightX, y);
    ctx.stroke();
  }

  // 2. Major Coordinate Axes
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
  // Main forward center axis (0° line)
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, botY);
  ctx.stroke();

  // Lateral axis (90° line through pivot)
  ctx.beginPath();
  ctx.moveTo(leftX, cy);
  ctx.lineTo(rightX, cy);
  ctx.stroke();

  // 3. Radial Angle Rays (0°, 10°, 20°, 30°, 40°, 50°, 60°, 70°, 80°)
  const maxR = 15.24 * s;
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let deg = 10; deg <= 80; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    
    // Right ray (+deg)
    const rx = cx + Math.sin(rad) * maxR;
    const ry = cy - Math.cos(rad) * maxR;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // Right label
    ctx.fillStyle = '#facc15';
    const labelRx = cx + Math.sin(rad) * (maxR + 32);
    const labelRy = cy - Math.cos(rad) * (maxR + 32);
    ctx.fillText(`${deg}°`, labelRx, labelRy);

    // Left ray (-deg)
    const lx = cx - Math.sin(rad) * maxR;
    const ly = cy - Math.cos(rad) * maxR;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.stroke();

    // Left label
    const labelLx = cx - Math.sin(rad) * (maxR + 32);
    const labelLy = cy - Math.cos(rad) * (maxR + 32);
    ctx.fillText(`${deg}°`, labelLx, labelLy);
  }

  // 4. Concentric Extension & Working Arcs
  // 50ft / 15.24m Maximum Extension Arc
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(cx, cy, 15.24 * s, -Math.PI, 0); // 180° front arc
  ctx.stroke();

  // Retracted Arc (3.23m)
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.23 * s, -Math.PI, 0);
  ctx.stroke();

  // Intermediate Range Rings (6m, 9m, 12m)
  [6, 9, 12].forEach(r => {
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * s, -Math.PI, 0);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Rear Tail Swing Arc (4.0m) in rear hemisphere
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.75)';
  ctx.beginPath();
  ctx.arc(cx, cy, 4.0 * s, 0, Math.PI);
  ctx.stroke();

  // 5. Header Title & Technical Badges
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Supertechno50+ top view', cx, 40);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('180° WORKING ENVELOPE • POLAR AZIMUTH & HORIZONTAL MOTION GEOMETRY', cx, 75);

  // Meter & Feet Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('Meter', cx, topY - 15);
  ctx.fillText('Feet', cx, botY + 45);

  // Forward Meter Numbers along vertical axis
  ctx.font = '16px monospace';
  for (let m = 0; m <= 16; m++) {
    const y = cy - m * s;
    ctx.fillStyle = '#facc15';
    ctx.fillText(`${m}`, cx - 20, y + 5);
  }
  for (let m = 1; m <= 4; m++) {
    const y = cy + m * s;
    ctx.fillStyle = '#f87171';
    ctx.fillText(`${m}`, cx - 20, y + 5);
  }

  // Lateral Meter numbers along horizontal axis
  for (let m = -15; m <= 15; m++) {
    if (m === 0) continue;
    const x = cx + m * s;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${Math.abs(m)}`, x, cy + 22);
  }

  // Feet Labels mapping from PDF
  const feetMap = [
    { m: 16, ft: "52'6\"" }, { m: 15, ft: "49'3\"" }, { m: 14, ft: "45'11\"" },
    { m: 13, ft: "42'8\"" }, { m: 12, ft: "39'4\"" }, { m: 11, ft: "36'1\"" },
    { m: 10, ft: "32'10\"" }, { m: 9, ft: "29'6\"" }, { m: 8, ft: "26'3\"" },
    { m: 7, ft: "23'" }, { m: 6, ft: "19'8\"" }, { m: 5, ft: "16'5\"" },
    { m: 4, ft: "13'1\"" }, { m: 3, ft: "9'9\"" }, { m: 2, ft: "6'6\"" },
    { m: 1, ft: "3'3\"" }, { m: 0, ft: "0" }
  ];

  ctx.font = '13px monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  feetMap.forEach(item => {
    const y = cy - item.m * s;
    ctx.fillText(item.ft, leftX - 12, y + 4);
    ctx.fillText(item.ft, rightX + 65, y + 4);
  });

  // Outer Border Box
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
  ctx.strokeRect(leftX - 85, topY - 30, (rightX - leftX) + 170, (botY - topY) + 100);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- 3D TECHNICAL BLUEPRINT MEASUREMENT OVERLAY MATCHING BOTH SUPERTECHNO 50+ SPEC SHEETS ---
function CraneBlueprintOverlay({
  kinematics,
  visible = true,
  mode = 'all'
}: {
  kinematics: {
    teleExtension: number;
    boomTilt: number;
    basePan: number;
    dollyTrack: number;
    columnElevation: number;
  };
  visible: boolean;
  mode?: 'all' | 'profile' | 'top';
}) {
  // Top-View Floor Technical Blueprint Texture
  const topViewBlueprintTex = useMemo(() => createTopViewGroundBlueprintTexture(), []);

  // 1. Profile / Vertical Blueprint Badges
  const badge60Deg = useMemo(() => createBlueprintBadgeTexture('60° UP', 'MAX. TILT ANGLE', '#facc15'), []);
  const badgeMaxUnderslung = useMemo(() => createBlueprintBadgeTexture('15,11 m [50\']', 'MAX. LENS HEIGHT', '#38bdf8'), []);
  const badgeColumn = useMemo(() => createBlueprintBadgeTexture('COLUMN ELEVATION', '1,54 m [5\'1"] - 3,63 m [11\'10"]', '#facc15'), []);
  const badgeRearTail = useMemo(() => createBlueprintBadgeTexture('3,66 m [12\'1"]', 'REAR TAIL SWING', '#f87171'), []);
  const badgeTeleExtent = useMemo(() => createBlueprintBadgeTexture('11,3 m [37\'1"]', 'TELESCOPIC RANGE', '#38bdf8'), []);

  // 2. Top-Down / Grundriss Blueprint Badges (Matching media_1787124957658.png)
  const badgeTotalLen = useMemo(() => createBlueprintBadgeTexture('7,05 m [23\'1"]', 'GESAMTLÄNGE (EINGEFAHREN)', '#38bdf8'), []);
  const badgeWheelbase = useMemo(() => createBlueprintBadgeTexture('2,18 m [7\'2"]', 'RADSTAND (WHEELBASE)', '#facc15'), []);
  const badgeChassis = useMemo(() => createBlueprintBadgeTexture('2,45 m [8\'1"]', 'FAHRGESTELL-LÄNGE', '#facc15'), []);
  const badgeTrack = useMemo(() => createBlueprintBadgeTexture('1,88 m [6\'2"]', 'SPURBREITE (RADSPUR)', '#38bdf8'), []);
  const badgeOutriggers = useMemo(() => createBlueprintBadgeTexture('2,46 m [8\'1"]', 'MAX. STÜTZEN-BREITE', '#f87171'), []);
  const badgeRearCage = useMemo(() => createBlueprintBadgeTexture('1,48 m [4\'10"]', 'HECK-SCHUTZRAHMEN', '#4ade80'), []);

  // Live Ground Laser Line
  const liveGroundLaser = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 0.05, -1)]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3, transparent: true, opacity: 0.9 })
  ), []);

  // Compute 60° UP arc points in the vertical Y-Z plane from fulcrum
  const arc60Points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const radius = 5.2; // 5.2m radius arc
    for (let deg = 0; deg <= 60; deg += 2) {
      const rad = THREE.MathUtils.degToRad(deg);
      const z = -Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      pts.push(new THREE.Vector3(0, y, z));
    }
    return pts;
  }, []);

  const arc60LineGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(arc60Points), [arc60Points]);

  // Compute Rear Tail Swing down arc (from 0° down to -60°)
  const rearTailArcPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const radius = 3.66; // 3.66m rear tail length
    for (let deg = 0; deg <= 60; deg += 2) {
      const rad = THREE.MathUtils.degToRad(deg);
      const z = Math.cos(rad) * radius;
      const y = -Math.sin(rad) * radius;
      pts.push(new THREE.Vector3(0, y, z));
    }
    return pts;
  }, []);

  const rearTailLineGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(rearTailArcPoints), [rearTailArcPoints]);

  // Compute Max Extension 14.64m [50'] Working Envelope Arc (-25° to +60°)
  const arcMaxEnvelopePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const radius = 14.64; // Max boom extension reach from fulcrum
    for (let deg = -25; deg <= 60; deg += 1) {
      const rad = THREE.MathUtils.degToRad(deg);
      const z = -Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      pts.push(new THREE.Vector3(0, y, z));
    }
    return pts;
  }, []);

  const arcMaxEnvelopeGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(arcMaxEnvelopePoints), [arcMaxEnvelopePoints]);
  const arcMaxEnvelopeLine = useMemo(() => new THREE.Line(
    arcMaxEnvelopeGeo,
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3, transparent: true, opacity: 0.9 })
  ), [arcMaxEnvelopeGeo]);

  // Retracted Envelope Arc (3.24m reach from fulcrum)
  const arcMinEnvelopePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const radius = 3.24;
    for (let deg = -25; deg <= 60; deg += 1) {
      const rad = THREE.MathUtils.degToRad(deg);
      const z = -Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      pts.push(new THREE.Vector3(0, y, z));
    }
    return pts;
  }, []);

  const arcMinEnvelopeGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(arcMinEnvelopePoints), [arcMinEnvelopePoints]);
  const arcMinEnvelopeLine = useMemo(() => new THREE.Line(
    arcMinEnvelopeGeo,
    new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 0.25, gapSize: 0.15, transparent: true, opacity: 0.65 })
  ), [arcMinEnvelopeGeo]);

  // Intermediate Distance Rings (6m, 9m, 12m)
  const intermediateArcs = useMemo(() => {
    return [6.0, 9.0, 12.0].map(r => {
      const pts: THREE.Vector3[] = [];
      for (let deg = -20; deg <= 60; deg += 2) {
        const rad = THREE.MathUtils.degToRad(deg);
        pts.push(new THREE.Vector3(0, Math.sin(rad) * r, -Math.cos(rad) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      return new THREE.Line(
        geo,
        new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.4 })
      );
    });
  }, []);

  // 60° UP Max Apex Point
  const maxApex60Z = -Math.cos(Math.PI / 3) * 14.64; // -7.32m
  const maxApex60Y = Math.sin(Math.PI / 3) * 14.64; // +12.68m

  const apexTickLine = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, maxApex60Y + 0.35 * Math.sin(Math.PI / 6), maxApex60Z + 0.35 * Math.cos(Math.PI / 6)),
      new THREE.Vector3(0, maxApex60Y - 0.35 * Math.sin(Math.PI / 6), maxApex60Z - 0.35 * Math.cos(Math.PI / 6))
    ]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2.5 })
  ), [maxApex60Y, maxApex60Z]);

  // Profile Lines
  const arc60Line = useMemo(() => new THREE.Line(arc60LineGeo, new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2, transparent: true, opacity: 0.85 })), [arc60LineGeo]);
  const ref0DegLine = useMemo(() => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -6.5)]), new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.25, gapSize: 0.15, opacity: 0.6, transparent: true })), []);
  const ray60DegLine = useMemo(() => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, Math.sin(Math.PI / 3) * 6.5, -Math.cos(Math.PI / 3) * 6.5)]), new THREE.LineDashedMaterial({ color: 0xfacc15, dashSize: 0.3, gapSize: 0.15, opacity: 0.8, transparent: true })), []);
  const rearTailLine = useMemo(() => new THREE.Line(rearTailLineGeo, new THREE.LineBasicMaterial({ color: 0xf87171, linewidth: 2, transparent: true, opacity: 0.85 })), [rearTailLineGeo]);
  const colDimLine = useMemo(() => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.54, 0), new THREE.Vector3(0, 3.63, 0)]), new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 })), []);
  const teleReachLine = useMemo(() => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -3.24), new THREE.Vector3(0, 0, -14.64)]), new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })), []);

  // Top-Down Ground Blueprint Lines
  const totalLenLine = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(2.1, 0.05, -3.39), new THREE.Vector3(2.1, 0.05, 3.66)]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
  ), []);
  const totalLenTickStart = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.7, 0.05, -3.39), new THREE.Vector3(2.5, 0.05, -3.39)]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
  ), []);
  const totalLenTickEnd = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.7, 0.05, 3.66), new THREE.Vector3(2.5, 0.05, 3.66)]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
  ), []);

  const wbLine = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.60, 0.05, -1.09), new THREE.Vector3(-1.60, 0.05, 1.09)]),
    new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
  ), []);
  const wbTickStart = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.85, 0.05, -1.09), new THREE.Vector3(-1.35, 0.05, -1.09)]),
    new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
  ), []);
  const wbTickEnd = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.85, 0.05, 1.09), new THREE.Vector3(-1.35, 0.05, 1.09)]),
    new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
  ), []);

  const chassisLine = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.20, 0.05, -1.225), new THREE.Vector3(-2.20, 0.05, 1.225)]),
    new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
  ), []);
  const chassisTickStart = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.45, 0.05, -1.225), new THREE.Vector3(-1.95, 0.05, -1.225)]),
    new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
  ), []);
  const chassisTickEnd = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.45, 0.05, 1.225), new THREE.Vector3(-1.95, 0.05, 1.225)]),
    new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
  ), []);

  const trackLine = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.94, 0.05, -1.60), new THREE.Vector3(0.94, 0.05, -1.60)]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
  ), []);
  const trackTickLeft = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.94, 0.05, -1.85), new THREE.Vector3(-0.94, 0.05, -1.35)]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
  ), []);
  const trackTickRight = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.94, 0.05, -1.85), new THREE.Vector3(0.94, 0.05, -1.35)]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
  ), []);

  const outriggersLine = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.23, 0.05, -2.35), new THREE.Vector3(1.23, 0.05, -2.35)]),
    new THREE.LineBasicMaterial({ color: 0xf87171, linewidth: 2 })
  ), []);
  const outriggersTickLeft = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.23, 0.05, -2.60), new THREE.Vector3(-1.23, 0.05, -2.10)]),
    new THREE.LineBasicMaterial({ color: 0xf87171, linewidth: 2 })
  ), []);
  const outriggersTickRight = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.23, 0.05, -2.60), new THREE.Vector3(1.23, 0.05, -2.10)]),
    new THREE.LineBasicMaterial({ color: 0xf87171, linewidth: 2 })
  ), []);

  const rearCageLine = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.74, 0.05, 3.90), new THREE.Vector3(0.74, 0.05, 3.90)]),
    new THREE.LineBasicMaterial({ color: 0x4ade80, linewidth: 2 })
  ), []);
  const rearCageTickLeft = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.74, 0.05, 3.65), new THREE.Vector3(-0.74, 0.05, 4.15)]),
    new THREE.LineBasicMaterial({ color: 0x4ade80, linewidth: 2 })
  ), []);
  const rearCageTickRight = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.74, 0.05, 3.65), new THREE.Vector3(0.74, 0.05, 4.15)]),
    new THREE.LineBasicMaterial({ color: 0x4ade80, linewidth: 2 })
  ), []);

  if (!visible) return null;

  const colH = kinematics.columnElevation || 1.54;
  const dollyZ = -(kinematics.dollyTrack || 0);
  const fulcrumWorld = new THREE.Vector3(0, colH, dollyZ);

  const showProfile = mode === 'all' || mode === 'profile';
  const showTop = mode === 'all' || mode === 'top';

  return (
    <>
      {/* 
        ========================================================================
        PART A: VERTICAL PROFILE BLUEPRINT (SEITENRISS AUS BLUEPRINT 1)
        ========================================================================
      */}
      {showProfile && (
        <group position={[0, fulcrumWorld.y, fulcrumWorld.z]}>
          {/* 1. 60° UP BOOM TILT ARC & ANGLE INDICATOR */}
          <group position={[0.05, 0, 0]}>
            <primitive object={arc60Line} />
            <primitive object={ref0DegLine} />
            <primitive object={ray60DegLine} />

            {/* 60° UP Label Badge Decal (Lowered) */}
            <mesh position={[0, Math.sin(Math.PI / 6) * 3.8, -Math.cos(Math.PI / 6) * 3.8]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[1.7, 0.46]} />
              <meshBasicMaterial map={badge60Deg} transparent side={THREE.DoubleSide} />
            </mesh>
          </group>

          {/* 2. 3.66m [12'-1"] REAR TAIL SWING & GROUND CLEARANCE ARC */}
          <group position={[0.05, 0, 0]}>
            <primitive object={rearTailLine} />

            {/* Rear Tail Label Badge (Lowered) */}
            <mesh position={[0, -Math.sin(Math.PI / 6) * 2.8 - 0.15, Math.cos(Math.PI / 6) * 2.8 + 0.3]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[1.6, 0.45]} />
              <meshBasicMaterial map={badgeRearTail} transparent side={THREE.DoubleSide} />
            </mesh>
          </group>

          {/* 3. COLUMN ELEVATION TRAVEL INDICATOR (1.54m to 3.63m = 2.09m Travel) */}
          <group position={[-0.85, -colH, 0]}>
            <primitive object={colDimLine} />

            {/* Min Marker 1.54m [5'-1"] */}
            <mesh position={[0, 1.54, 0]}>
              <boxGeometry args={[0.3, 0.04, 0.04]} />
              <meshBasicMaterial color="#facc15" />
            </mesh>

            {/* Max Marker 3.63m [11'-10"] */}
            <mesh position={[0, 3.63, 0]}>
              <boxGeometry args={[0.3, 0.04, 0.04]} />
              <meshBasicMaterial color="#facc15" />
            </mesh>

            {/* Current Column Height Pointer */}
            <mesh position={[0.15, colH, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.08, 0.2, 16]} />
              <meshBasicMaterial color="#4ade80" />
            </mesh>

            {/* Column Badge (Lowered) */}
            <mesh position={[0, 2.15, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[2.2, 0.58]} />
              <meshBasicMaterial map={badgeColumn} transparent side={THREE.DoubleSide} />
            </mesh>
          </group>

          {/* 4. MAXIMUM WORKING ENVELOPE CURVE & 15.11m [50'] MAX LENS HEIGHT (Side Profile Arc) */}
          <group>
            {/* 14.64m Maximum Extension Working Envelope Cyan Arc Curve */}
            <primitive object={arcMaxEnvelopeLine} />

            {/* 3.24m Retracted Working Envelope Arc Curve */}
            <primitive object={arcMinEnvelopeLine} />

            {/* Intermediate Distance Arc Rings (6m, 9m, 12m) */}
            {intermediateArcs.map((arc, aIdx) => (
              <primitive key={`inter-arc-${aIdx}`} object={arc} />
            ))}

            {/* 60° UP Max Height Apex Marker & Badge (15.11m [50'] Max Lens Height) */}
            <group position={[0, maxApex60Y, maxApex60Z]}>
              <primitive object={apexTickLine} />
              <mesh position={[0, 0.48, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.1, 0.54]} />
                <meshBasicMaterial map={badgeMaxUnderslung} transparent side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>

          {/* 5. HORIZONTAL TELESCOPIC RANGE (11.3m [37'-1"] Range, 3.23m to 14.77m Reach) */}
          <group position={[0, -0.2, 0]}>
            <primitive object={teleReachLine} />
            <mesh position={[0, -0.35, -9.0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[1.9, 0.48]} />
              <meshBasicMaterial map={badgeTeleExtent} transparent side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      )}

      {/* 
        ========================================================================
        PART B: TOP-DOWN GROUND BLUEPRINT (DRAUFSICHT / GRUNDRISS AUS BLUEPRINT 2 & PDF)
        ========================================================================
      */}
      {showTop && (() => {
        const tiltRad = THREE.MathUtils.degToRad(kinematics.boomTilt || 0);
        const panDeg = kinematics.basePan || 0;
        const panRad = THREE.MathUtils.degToRad(-panDeg);
        const ext = kinematics.teleExtension || 0;
        const totalBoomFront = 3.24 + (ext / 11.3) * (14.64 - 3.24);
        const horizReach = totalBoomFront * Math.cos(tiltRad);
        const tipGroundX = Math.sin(panRad) * horizReach;
        const tipGroundZ = -Math.cos(panRad) * horizReach;
        const isOutside180 = Math.abs(panDeg) > 90;

        liveGroundLaser.geometry.setFromPoints([
          new THREE.Vector3(0, 0.02, 0),
          new THREE.Vector3(tipGroundX, 0.02, tipGroundZ)
        ]);

        return (
          <group position={[0, 0, dollyZ]}>
            {/* 1. AUTHENTIC 2D TECHNICAL BLUEPRINT PROJECTION MATCHING PDF SUPERTECHNO 50+ (Centered at Z=0) */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[35.31, 35.31]} />
              <meshBasicMaterial
                map={topViewBlueprintTex}
                transparent
                opacity={0.92}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>

            {/* 2. LIVE DYNAMIC AZIMUTH & HORIZONTAL REACH LASER POINTER */}
            <primitive object={liveGroundLaser} />

            {/* Live Camera Head Ground Target Ring */}
            <group position={[tipGroundX, 0.02, tipGroundZ]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.35, 0.45, 32]} />
                <meshBasicMaterial color={isOutside180 ? '#f87171' : '#38bdf8'} side={THREE.DoubleSide} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.08, 16]} />
                <meshBasicMaterial color={isOutside180 ? '#f87171' : '#facc15'} side={THREE.DoubleSide} />
              </mesh>
            </group>

            {/* 3. 7.05m [23'-1"] Gesamtlänge (Transport / Retracted Length, Centered at Z=0, Lowered) */}
            <group>
              <primitive object={totalLenLine} />
              <primitive object={totalLenTickStart} />
              <primitive object={totalLenTickEnd} />
              <mesh position={[2.65, 0.03, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
                <planeGeometry args={[2.2, 0.58]} />
                <meshBasicMaterial map={badgeTotalLen} transparent side={THREE.DoubleSide} />
              </mesh>
            </group>

            {/* 4. 2.18m [7'-2"] Radstand (Wheelbase Center-to-Center, Centered at Z=0, Lowered) */}
            <group>
              <primitive object={wbLine} />
              <primitive object={wbTickStart} />
              <primitive object={wbTickEnd} />
              <mesh position={[-1.75, 0.03, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[1.9, 0.52]} />
                <meshBasicMaterial map={badgeWheelbase} transparent side={THREE.DoubleSide} />
              </mesh>
            </group>

            {/* 5. 2.45m [8'-1"] Fahrgestell-Rahmenlänge (Chassis Base Length, Centered at Z=0, Lowered) */}
            <group>
              <primitive object={chassisLine} />
              <primitive object={chassisTickStart} />
              <primitive object={chassisTickEnd} />
              <mesh position={[-2.45, 0.03, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[2.0, 0.52]} />
                <meshBasicMaterial map={badgeChassis} transparent side={THREE.DoubleSide} />
              </mesh>
            </group>

            {/* 6. 1.88m [6'-2"] Standard-Spurbreite (Track Width, Centered at Z=0, Lowered) */}
            <group>
              <primitive object={trackLine} />
              <primitive object={trackTickLeft} />
              <primitive object={trackTickRight} />
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2.1, 0.54]} />
                <meshBasicMaterial map={badgeTrack} transparent side={THREE.DoubleSide} />
              </mesh>
            </group>

            {/* 7. 2.46m [8'-1"] Maximale Stützenbreite (Outriggers Width, Centered at Z=0, Lowered) */}
            <group>
              <primitive object={outriggersLine} />
              <primitive object={outriggersTickLeft} />
              <primitive object={outriggersTickRight} />
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2.4, 0.56]} />
                <meshBasicMaterial map={badgeOutriggers} transparent side={THREE.DoubleSide} />
              </mesh>
            </group>

            {/* 8. 1.48m [4'-10"] Heck-Schutzrahmen / Sicherheitskäfig (Rear Guard Rail, Centered at Z=0, Lowered) */}
            <group>
              <primitive object={rearCageLine} />
              <primitive object={rearCageTickLeft} />
              <primitive object={rearCageTickRight} />
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2.1, 0.54]} />
                <meshBasicMaterial map={badgeRearCage} transparent side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>
        );
      })()}
    </>
  );
}

// --- INNER R3F SCENE COMPONENT ---
export type CameraViewMode = 'cinematic' | 'full' | 'profile' | 'head' | 'weight' | 'cable' | 'operator' | 'desk' | 'pov' | 'top' | 'dolly' | 'free';

export interface RoundTripStageInfo {
  idx: number;
  name: string;
  desc: string;
  icon: string;
  progress: number;
}

/**
 * Closed-Loop Continuous Catmull-Rom Spline Flight Path for Hollywood Studio Round-Trip:
 * Dynamically computes 8 cinematic camera waypoints anchored to crane world elements.
 * Strictly guarantees Camera Y >= 0.85m so camera NEVER dips into the ground floor.
 */
function computeCinematicRoundTrip(
  phase: number,
  mastWorld: THREE.Vector3,
  localHeadPos: THREE.Vector3,
  localCwPos: THREE.Vector3,
  localCablePos: THREE.Vector3,
  tipZ: number,
  noseY: number,
  colH: number,
  panRad: number
): { camPos: THREE.Vector3; targetPos: THREE.Vector3; stage: RoundTripStageInfo } {
  // 8 Dynamic Keyframe Nodes with strict minimum floor clearances
  const nodes = [
    // 0: Hero 3/4 Orbit High Sweep
    {
      pos: new THREE.Vector3(mastWorld.x + 18.0, Math.max(6.5, colH + 6.0), mastWorld.z + 16.0),
      target: new THREE.Vector3(mastWorld.x, Math.max(2.0, colH + 2.2), mastWorld.z + tipZ * 0.35),
      name: 'Hero Establishing Orbit',
      desc: '360° Studio-Weitwinkel & 15m Maximal-Hub',
      icon: '🌟'
    },
    // 1: Side Profile Flight
    {
      pos: new THREE.Vector3(mastWorld.x - 19.5, Math.max(5.5, colH + 5.0), mastWorld.z + 4.0),
      target: new THREE.Vector3(mastWorld.x, Math.max(2.0, colH + 2.8), mastWorld.z + tipZ * 0.5),
      name: 'Profile Tele-Sweep',
      desc: 'Flanken-Fahrt & Teleskop-Auszug (11.3m)',
      icon: '📐'
    },
    // 2: Low-Angle Track Flyby (Froschperspektive safely elevated above floor rail)
    {
      pos: new THREE.Vector3(mastWorld.x - 4.8, Math.max(1.45, colH * 0.55), mastWorld.z + 5.2),
      target: new THREE.Vector3(mastWorld.x, Math.max(3.0, noseY), mastWorld.z + tipZ * 0.75),
      name: 'Low-Angle Track Flyby',
      desc: 'Dynamische Froschperspektive & Vertikal-Steilblick',
      icon: '🏎️'
    },
    // 3: Macro Close-Up Gyro Remote Head (Front quarter - Floor-safe)
    {
      pos: new THREE.Vector3(
        localHeadPos.x - 2.4 * Math.cos(panRad) - 2.2 * Math.sin(panRad),
        Math.max(1.35, localHeadPos.y + 0.65),
        localHeadPos.z - 2.4 * Math.sin(panRad) + 2.2 * Math.cos(panRad)
      ),
      target: new THREE.Vector3(localHeadPos.x, Math.max(0.65, localHeadPos.y), localHeadPos.z),
      name: 'Macro Gyro Head & Lens',
      desc: 'Angenieux Optimo Zoom & Gyro-Horizontausgleich',
      icon: '🎥'
    },
    // 4: Macro Gimbal Horizon Stabilization (Side close-up - Floor-safe)
    {
      pos: new THREE.Vector3(
        localHeadPos.x + 2.2 * Math.cos(panRad) - 1.9 * Math.sin(panRad),
        Math.max(1.35, localHeadPos.y + 0.65),
        localHeadPos.z + 2.2 * Math.sin(panRad) + 1.9 * Math.cos(panRad)
      ),
      target: new THREE.Vector3(localHeadPos.x, Math.max(0.65, localHeadPos.y), localHeadPos.z),
      name: 'Gimbal Stabilization',
      desc: '3-Achsen Gimbal, Carbon-Ringe & Mattebox',
      icon: '🔍'
    },
    // 5: Rear Counterweight Lead-Screw Sled (Floor-safe)
    {
      pos: new THREE.Vector3(
        localCwPos.x - 3.4 * Math.cos(panRad) - 2.6 * Math.sin(panRad),
        Math.max(1.65, localCwPos.y + 1.8),
        localCwPos.z - 3.4 * Math.sin(panRad) + 2.6 * Math.cos(panRad)
      ),
      target: new THREE.Vector3(localCwPos.x, Math.max(0.75, localCwPos.y), localCwPos.z),
      name: 'Counterweight Sled Track',
      desc: 'U-Sattel Gegengewicht & Spindel-Synchronisation',
      icon: '⚖️'
    },
    // 6: Sloped Festoon Cable Track (Floor-safe)
    {
      pos: new THREE.Vector3(
        localCablePos.x - 4.2 * Math.cos(panRad) - 2.2 * Math.sin(panRad),
        Math.max(1.65, localCablePos.y + 1.8),
        localCablePos.z - 4.2 * Math.sin(panRad) + 2.2 * Math.cos(panRad)
      ),
      target: new THREE.Vector3(localCablePos.x, Math.max(0.75, localCablePos.y), localCablePos.z),
      name: 'Festoon Cable Slope Trace',
      desc: 'Schleppkabel-Trasse & Führungswagen-Dynamik',
      icon: '➰'
    },
    // 7: Sky Crane High-Angle Overview
    {
      pos: new THREE.Vector3(mastWorld.x + 9.5, Math.max(16.5, colH + 14.0), mastWorld.z - 4.5),
      target: new THREE.Vector3(mastWorld.x, 3.2, mastWorld.z - 1.0),
      name: 'Sky Crane Spiral Overview',
      desc: 'Vogelperspektive & Studio-Gantry-Überblick',
      icon: '🦅'
    }
  ];

  const N = nodes.length;
  // Normalized 0..1 loop progress from phase
  const cycleProgress = ((phase * 0.09) % 1.0 + 1.0) % 1.0;
  const exactIdx = cycleProgress * N;
  const i = Math.floor(exactIdx);
  const u = exactIdx - i;

  // Catmull-Rom Cubic Spline interpolation on closed loop
  const p0 = nodes[(i - 1 + N) % N];
  const p1 = nodes[i % N];
  const p2 = nodes[(i + 1) % N];
  const p3 = nodes[(i + 2) % N];

  const interpVec = (v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3, s: number) => {
    const s2 = s * s;
    const s3 = s2 * s;
    return new THREE.Vector3(
      0.5 * ((2 * v1.x) + (-v0.x + v2.x) * s + (2 * v0.x - 5 * v1.x + 4 * v2.x - v3.x) * s2 + (-v0.x + 3 * v1.x - 3 * v2.x + v3.x) * s3),
      0.5 * ((2 * v1.y) + (-v0.y + v2.y) * s + (2 * v0.y - 5 * v1.y + 4 * v2.y - v3.y) * s2 + (-v0.y + 3 * v1.y - 3 * v2.y + v3.y) * s3),
      0.5 * ((2 * v1.z) + (-v0.z + v2.z) * s + (2 * v0.z - 5 * v1.z + 4 * v2.z - v3.z) * s2 + (-v0.z + 3 * v1.z - 3 * v2.z + v3.z) * s3)
    );
  };

  const camPos = interpVec(p0.pos, p1.pos, p2.pos, p3.pos, u);
  const targetPos = interpVec(p0.target, p1.target, p2.target, p3.target, u);

  // Strict floor protection guarantee on interpolated positions
  camPos.y = Math.max(1.10, camPos.y);
  targetPos.y = Math.max(0.50, targetPos.y);

  return {
    camPos,
    targetPos,
    stage: {
      idx: i + 1,
      name: p1.name,
      desc: p1.desc,
      icon: p1.icon,
      progress: cycleProgress
    }
  };
}

function CraneScene({ 
  kinematicsRef, 
  sliderRefs,
  cableSettings,
  sceneryMode = 'bright_concrete',
  cameraViewMode,
  setCameraViewMode,
  orbitControlsRef,
  onStageChange,
  setCableSettings
}: { 
  kinematicsRef: React.MutableRefObject<any>,
  sliderRefs: Record<string, React.RefObject<HTMLInputElement | null>>,
  cableSettings: {
    visible: boolean;
    cableType: CraneCableType;
    sagFactor: number;
    loopCount: number;
    autoDemo: boolean;
    demoSpeed: number;
    autoDirector: boolean;
    directorInterval: number;
    showBlueprint: boolean;
    blueprintMode: 'all' | 'profile' | 'top';
    panRangeMode?: '180' | '360';
    operatorMode?: CraneOperatorMode;
  },
  sceneryMode?: CraneSceneryType,
  cameraViewMode: CameraViewMode,
  setCameraViewMode: (mode: CameraViewMode) => void,
  orbitControlsRef: React.RefObject<any>,
  onStageChange?: (stage: RoundTripStageInfo) => void,
  setCableSettings?: React.Dispatch<React.SetStateAction<any>>
}) {
  const [crane, setCrane] = useState<Supertechno50FBXModel | null>(null);
  const [kinState, setKinState] = useState(kinematicsRef.current);
  const keys = useRef<Record<string, boolean>>({});
  const demoPhase = useRef(0);
  const directorTimer = useRef(0);
  const hudThrottleTimer = useRef(0);

  // Dynamic light tracking positions
  const [liveHeadPosState, setLiveHeadPosState] = useState(new THREE.Vector3(0, 2, -3.34));
  const [liveCwPosState, setLiveCwPosState] = useState(new THREE.Vector3(0, 1.6, 1.0));

  useEffect(() => {
    const model = new Supertechno50FBXModel(() => {
      setCrane(model);
    });
    return () => {
      model.dispose();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const kin = kinematicsRef.current;
    const k = keys.current;
    const speedMult = cableSettings.demoSpeed || 1.0;
    const speed = 5.0 * delta * (cableSettings.autoDemo ? speedMult : 1.0);

    // Auto-Director: Slower, cinematic auto-cycling through key camera angles during Auto Demo
    if (cableSettings.autoDemo && cableSettings.autoDirector) {
      directorTimer.current += delta;
      const interval = cableSettings.directorInterval || 18;
      if (directorTimer.current >= interval) {
        directorTimer.current = 0;
        const modes: CameraViewMode[] = ['cinematic', 'profile', 'top', 'full', 'head', 'weight', 'pov', 'cable', 'dolly'];
        const nextIdx = (modes.indexOf(cameraViewMode) + 1) % modes.length;
        setCameraViewMode(modes[nextIdx]);
      }
    }

    // Auto-Demo cycle showcasing the FULL VERTICAL & HORIZONTAL CAPABILITY (Strict Floor-Protected Y >= 0.08m):
    if (cableSettings.autoDemo) {
      demoPhase.current += delta * 0.45 * speedMult;
      const p = demoPhase.current;

      // Dynamic column elevation cycling smoothly (1.54m to 3.63m)
      const colBase = 1.54 + ((Math.sin(p * 0.6) + 1) / 2) * 2.09;
      kin.columnElevation = Math.max(1.54, Math.min(3.63, colBase));

      // Telescopic Extension cycling smoothly
      const rawExt = ((Math.sin(p * 0.95 - 0.4) + 1) / 2) * 11.3;
      kin.teleExtension = rawExt;

      // Get exact dynamic safe tilt range for current column height & extension:
      const { minTilt, maxTilt } = getAllowedTiltRange(kin.columnElevation, kin.teleExtension, 0.08);
      
      // Interpolate tilt safely within [minTilt, maxTilt]
      const tiltNormalized = (Math.sin(p * 0.8) + 1) / 2;
      kin.boomTilt = minTilt + tiltNormalized * (maxTilt - minTilt);

      // Re-verify extension against the safe tilt:
      const maxExt = getAllowedExtensionMax(kin.columnElevation, kin.boomTilt, 0.08);
      kin.teleExtension = Math.min(rawExt, maxExt);

      // Base pan and dolly
      const panLimit = cableSettings.panRangeMode === '180' ? 45 : 75;
      kin.basePan = Math.sin(p * 0.35) * panLimit;
      kin.dollyTrack = Math.sin(p * 0.25) * 4.0;

      // Camera head framing
      kin.headPan = Math.sin(p * 1.1) * 30;
      kin.headTilt = Math.sin(p * 0.8) * 15;
      kin.headRoll = Math.sin(p * 0.5) * 20;
    } else {
      // Manual Keyboard Logic with Independent Hard Stops (never retracts other axes)
      if (k['w']) {
        const target = (kin.teleExtension || 0) + speed * 2;
        kin.teleExtension = clampTeleExtension(target, kin.columnElevation, kin.boomTilt);
      }
      if (k['s']) {
        kin.teleExtension = Math.max(0, (kin.teleExtension || 0) - speed * 2);
      }
      if (k['q']) {
        const target = (kin.boomTilt || 0) + speed * 10;
        kin.boomTilt = clampBoomTilt(target, kin.columnElevation, kin.teleExtension);
      }
      if (k['e']) {
        const target = (kin.boomTilt || 0) - speed * 10;
        kin.boomTilt = clampBoomTilt(target, kin.columnElevation, kin.teleExtension);
      }
      if (k['a']) {
        kin.dollyTrack = (kin.dollyTrack || 0) + speed; // Vorwärts
      }
      if (k['d']) {
        kin.dollyTrack = (kin.dollyTrack || 0) - speed; // Rückwärts
      }
      if (k['r']) {
        kin.columnElevation = Math.min(3.63, (kin.columnElevation || 1.54) + speed * 0.4);
      }
      if (k['f']) {
        const target = (kin.columnElevation || 1.54) - speed * 0.4;
        kin.columnElevation = clampColumnElevation(target, kin.boomTilt, kin.teleExtension);
      }
      if (k['arrowleft'] && !k['shift']) kin.headPan = Math.max(-1080, (kin.headPan || 0) - speed * 15);
      if (k['arrowright'] && !k['shift']) kin.headPan = Math.min(1080, (kin.headPan || 0) + speed * 15);
      if (k['arrowup']) kin.headTilt = Math.min(1080, (kin.headTilt || 0) + speed * 15);
      if (k['arrowdown']) kin.headTilt = Math.max(-1080, (kin.headTilt || 0) - speed * 15);
      if (k['z']) kin.headRoll = Math.max(-1080, (kin.headRoll || 0) - speed * 15);
      if (k['x']) kin.headRoll = Math.min(1080, (kin.headRoll || 0) + speed * 15);
      if (k['arrowleft'] && k['shift']) {
        const target = (kin.basePan || 0) + speed * 10;
        kin.basePan = clampBasePan(target, cableSettings.panRangeMode);
      }
      if (k['arrowright'] && k['shift']) {
        const target = (kin.basePan || 0) - speed * 10;
        kin.basePan = clampBasePan(target, cableSettings.panRangeMode);
      }
    }

    // Secondary safety invariant (Y >= 0 guarantee)
    enforceCraneFloorLimits(kin, cableSettings.panRangeMode);

    // Sync UI Sliders
    if (sliderRefs.basePan?.current) sliderRefs.basePan.current.value = kin.basePan.toString();
    if (sliderRefs.boomTilt?.current) sliderRefs.boomTilt.current.value = kin.boomTilt.toString();
    if (sliderRefs.teleExtension?.current) sliderRefs.teleExtension.current.value = kin.teleExtension.toString();
    if (sliderRefs.columnElevation?.current) sliderRefs.columnElevation.current.value = kin.columnElevation.toString();
    if (sliderRefs.dollyTrack?.current) sliderRefs.dollyTrack.current.value = kin.dollyTrack.toString();
    if (sliderRefs.headPan?.current) sliderRefs.headPan.current.value = kin.headPan.toString();
    if (sliderRefs.headTilt?.current) sliderRefs.headTilt.current.value = kin.headTilt.toString();
    if (sliderRefs.headRoll?.current) sliderRefs.headRoll.current.value = kin.headRoll.toString();

    // Update Model Kinematics
    if (crane && crane.isLoaded) {
      crane.updateNodes(kin);
    }

    // Calculate World Transforms for Elements
    const ext = kin.teleExtension || 0;
    const tiltDeg = kin.boomTilt || 0;
    const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
    const panRad = THREE.MathUtils.degToRad(-kin.basePan || 0);
    const tExt = Math.max(0, Math.min(1.0, ext / 11.3));
    const tipZ = -3.34 - tExt * 11.40;
    const tipY = 0.05;
    const tipX = -0.01;

// ⚡ ZERO-GC SCRATCH OBJECTS FOR CAMERA & TRACKING LOOPS
const _mastWorld = new THREE.Vector3();
const _localHeadPos = new THREE.Vector3();
const _localCablePos = new THREE.Vector3();
const _localCwPos = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);

    const colH = kin.columnElevation || 1.54;
    const dollyZ = -(kin.dollyTrack || 0);
    _mastWorld.set(0, colH, dollyZ);

    // Total reach calculation for nose height
    const totalBoomFront = 3.24 + tExt * (14.64 - 3.24);
    const noseY = colH + totalBoomFront * Math.sin(tiltRad);

    // Local Head world position (always hanging down under crane nose)
    const headYOff = -0.55;
    _localHeadPos.set(tipX, tipY + headYOff, tipZ);
    _localHeadPos.applyAxisAngle(_axisX, tiltRad);
    _localHeadPos.applyAxisAngle(_axisY, panRad);
    _localHeadPos.add(_mastWorld);

    // Local Cable middle world position (centered along the festoon rail starting at z = -1.18m)
    _localCablePos.set(-0.34, -0.18, (-1.18 + tipZ) * 0.5);
    _localCablePos.applyAxisAngle(_axisX, tiltRad);
    _localCablePos.applyAxisAngle(_axisY, panRad);
    _localCablePos.add(_mastWorld);

    // Local Counterweight Sled world position (travels from -0.80m in front of pivot to +3.28m at rear)
    const sledZ = THREE.MathUtils.lerp(-0.80, 3.28, tExt);
    _localCwPos.set(0, 0.15, sledZ);
    _localCwPos.applyAxisAngle(_axisX, tiltRad);
    _localCwPos.applyAxisAngle(_axisY, panRad);
    _localCwPos.add(_mastWorld);

    // Update Camera Target & Trajectory
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      let isCinematic = cameraViewMode === 'cinematic' || (cableSettings.autoDemo && cameraViewMode !== 'pov' && cameraViewMode !== 'profile' && cameraViewMode !== 'top' && cameraViewMode !== 'free');

      if (cameraViewMode === 'free') {
        // 100% Free Manual User Orbit - OrbitControls has direct interactive control
      } else if (isCinematic) {
        // Continuous Hollywood 360° Round-Trip Choreography
        const roundTrip = computeCinematicRoundTrip(
          demoPhase.current,
          _mastWorld,
          _localHeadPos,
          _localCwPos,
          _localCablePos,
          tipZ,
          noseY,
          colH,
          panRad
        );

        _desiredCamPos.copy(roundTrip.camPos);
        _targetPos.copy(roundTrip.targetPos);

        if (onStageChange && hudThrottleTimer.current >= 0.04) {
          onStageChange(roundTrip.stage);
        }
      } else {
        switch (cameraViewMode) {
          case 'profile':
            // Side-Elevation Perspective (Floor Safe Y >= 4.5m)
            _targetPos.set(0, Math.max(2.5, colH + 2.0), dollyZ - 3.5);
            _desiredCamPos.set(-26.0, Math.max(4.5, colH + 4.0), dollyZ - 3.5);
            break;

          case 'top':
            // Top-Down Blueprint Perspective (Looking straight down from high ceiling)
            _targetPos.set(0, 0.8, dollyZ + 0.15);
            _desiredCamPos.set(0.001, 18.5, dollyZ + 0.15);
            break;

          case 'head':
            // Macro Close-Up on 3-Axis Gyro Head & Optimo Lens (Floor Safe Y >= 1.2m)
            _targetPos.set(_localHeadPos.x, Math.max(0.6, _localHeadPos.y), _localHeadPos.z);
            _camOffset.set(-1.6, 0.55, 2.5);
            _camOffset.applyAxisAngle(_axisY, panRad);
            _desiredCamPos.copy(_localHeadPos).add(_camOffset);
            _desiredCamPos.y = Math.max(1.2, _desiredCamPos.y);
            break;

          case 'weight':
            // Close-Up on Dynamic U-Saddle Counterweight & Sled (Floor Safe Y >= 1.2m)
            _targetPos.set(_localCwPos.x, Math.max(0.6, _localCwPos.y), _localCwPos.z);
            _camOffset.set(-2.4, 0.45, 0.8);
            _camOffset.applyAxisAngle(_axisY, panRad);
            _desiredCamPos.copy(_localCwPos).add(_camOffset);
            _desiredCamPos.y = Math.max(1.2, _desiredCamPos.y);
            break;

          case 'cable':
            // Tracking the Festoon Cable Slope & Sliding Carriages (Floor Safe Y >= 1.2m)
            _targetPos.set(_localCablePos.x, Math.max(0.6, _localCablePos.y), _localCablePos.z);
            _camOffset.set(-3.2, 0.8, 1.8);
            _camOffset.applyAxisAngle(_axisY, panRad);
            _desiredCamPos.copy(_localCablePos).add(_camOffset);
            _desiredCamPos.y = Math.max(1.2, _desiredCamPos.y);
            break;

          case 'operator':
            // 🎬 Dynamic Orbit Zoom onto the Rear Crane Operator at the Rear Handles
            const opOrbitRadius = 4.2;
            const opX = -opOrbitRadius * Math.sin(panRad);
            const opZ = dollyZ + opOrbitRadius * Math.cos(panRad);
            _targetPos.set(opX, 1.35, opZ);
            _camOffset.set(-2.6, 0.7, 2.2);
            _camOffset.applyAxisAngle(_axisY, panRad);
            _desiredCamPos.set(opX, 1.35, opZ).add(_camOffset);
            _desiredCamPos.y = Math.max(1.1, _desiredCamPos.y);
            break;

          case 'desk':
            // 🎛️ Close-Up Zoom onto the Floor Control Desk and DoP/Head Operator
            _targetPos.set(3.2, 1.25, dollyZ + 0.8);
            _desiredCamPos.set(5.8, 1.85, dollyZ + 2.4);
            _desiredCamPos.y = Math.max(1.1, _desiredCamPos.y);
            break;

          case 'pov':
            // Look directly through the Angenieux Optimo Zoom Optical Axis
            _desiredCamPos.set(tipX, tipY - 0.785, tipZ + 0.30);
            _desiredCamPos.applyAxisAngle(_axisX, tiltRad);
            _desiredCamPos.applyAxisAngle(_axisY, panRad);
            _desiredCamPos.add(_mastWorld);
            _desiredCamPos.y = Math.max(0.75, _desiredCamPos.y);

            _targetPos.set(tipX, tipY - 0.785, tipZ + 25.0);
            _targetPos.applyAxisAngle(_axisX, tiltRad);
            _targetPos.applyAxisAngle(_axisY, panRad);
            _targetPos.add(_mastWorld);
            _targetPos.y = Math.max(0.5, _targetPos.y);
            break;

          case 'dolly':
            // Low-Angle Ground Perspective (Safely above ground level)
            _targetPos.set(0, Math.max(0.6, colH * 0.4), dollyZ + tipZ * 0.2);
            _desiredCamPos.set(-4.5, 1.35, dollyZ + 4.2);
            break;

          case 'full':
          default:
            // Studio Rig Overview
            _targetPos.set(0, 5.5, dollyZ - 2.0);
            _desiredCamPos.set(16, 11.5, dollyZ + 17);
            break;
        }
      }

      if (cameraViewMode !== 'free') {
        // Delta-compensated smooth interpolation
        const targetLerp = 1 - Math.exp(-4.5 * delta);
        const camLerp = 1 - Math.exp(-3.5 * delta);

        // Floor safety limits for target and position
        _targetPos.y = Math.max(0.50, _targetPos.y);
        controls.target.lerp(_targetPos, targetLerp);

        _desiredCamPos.y = Math.max(0.95, _desiredCamPos.y);
        camera.position.lerp(_desiredCamPos, camLerp);
      }

      controls.update();

      // STRICT FLOOR INVARIANT: Camera position Y CAN NEVER be below 0.85m on any frame
      camera.position.y = Math.max(0.85, camera.position.y);
      if (controls.target.y < 0.4) {
        controls.target.y = 0.4;
      }
    }

    // Throttle React state updates (~25 FPS) for 2D HUD text to keep 3D WebGL rendering 100% fluid
    hudThrottleTimer.current += delta;
    if (hudThrottleTimer.current >= 0.04) {
      hudThrottleTimer.current = 0;
      setKinState({ ...kin });
      setLiveHeadPosState(_localHeadPos);
      setLiveCwPosState(_localCwPos);
    }
  });

  return (
    <>
      {/* --- SOLAR & CINEMATIC LIGHTING RIG: 30° ZUR KRANARMACHSE IN HÖHE & STÄRKE DER SONNE --- */}
      {/* 1. Haupt-Sonnenlicht (30° Azimut zur Kranarmachse, 30° Sonnenhöhe/Elevation, Sonnenstärke 4.5) */}
      <directionalLight
        position={[19.5, 22.5, -33.8]}
        intensity={4.5}
        color="#fffbe8"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0001}
      />

      {/* Visueller Sonnenkörper am 3D-Himmel (30° Sonnenhöhe, 30° zur Kranarmachse) */}
      <group position={[19.5, 22.5, -33.8]}>
        <mesh>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial color="#fffef0" />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.5, 16, 16]} />
          <meshBasicMaterial color="#fef08a" transparent opacity={0.28} />
        </mesh>
      </group>

      {/* 2. Warmes Sonnen-Gegenlicht / Rim Light für Auslegerkanten & Carbon-Silhouette */}
      <directionalLight
        position={[-18, 14, 18]}
        intensity={1.5}
        color="#fde68a"
      />

      {/* 3. Kühle Himmelsaufhellung / Sky-Rim Light für metallische Reflexionen */}
      <directionalLight
        position={[-20, 16, -20]}
        intensity={1.2}
        color="#38bdf8"
      />

      {/* 4. Sanftes diffuses Himmels-Ambientelicht (Sky Fill) */}
      <ambientLight intensity={0.55} color="#e0f2fe" />
      <directionalLight
        position={[10, 8, 20]}
        intensity={0.8}
        color="#94a3b8"
      />

      {/* 5. Dynamic Follow Spotlight on Remote Camera Head & Optimo Lens */}
      <pointLight
        position={[liveHeadPosState.x - 1.2, Math.max(1.5, liveHeadPosState.y + 1.2), liveHeadPosState.z + 1.8]}
        intensity={2.8}
        distance={9}
        color="#f8fafc"
      />

      {/* 6. Dynamic Follow Spotlight on Counterweight & Fulcrum Arc */}
      <pointLight
        position={[liveCwPosState.x - 1.0, Math.max(1.8, liveCwPosState.y + 1.4), liveCwPosState.z + 1.5]}
        intensity={2.0}
        distance={8}
        color="#fef08a"
      />

      {/* 7. Base Dolly Track Under-Glow Accent Lights */}
      <pointLight
        position={[1.8, 0.4, -(kinState.dollyTrack || 0)]}
        intensity={1.2}
        distance={5}
        color="#0284c7"
      />
      <pointLight
        position={[-1.8, 0.4, -(kinState.dollyTrack || 0)]}
        intensity={1.2}
        distance={5}
        color="#0284c7"
      />

      {/* --- DYNAMIC 3D SCENERY & GROUND TERRAIN (HELLER BETON, HELLE WIESE, WHITE STUDIO, KLASSISCH) --- */}
      <CraneSceneryEnvironment sceneryMode={sceneryMode} />

      {/* High-Precision Precision Studio Dolly Rails along Z */}
      <DollyTrackRails visible={true} />
      
      {/* 3D Model Injection */}
      {crane && <primitive object={crane.group} />}

      {/* Reinforced Column Pedestal Base, Triangular Gusset Fins & Dual Side Hydraulic Rams */}
      <CraneColumnAssembly
        kinematics={kinState}
        visible={true}
      />

      {/* Supertechno 50+ Fulcrum Pivot Bracket, Tilt Locking Arc Plates & Scale Markings (Matching Photo) */}
      <CraneFulcrumAssembly
        crane={crane}
        kinematics={kinState}
        visible={true}
      />

      {/* Dynamic Sloped Festoon Cable on the Crane Boom */}
      <CraneFestoonCable
        crane={crane}
        kinematics={kinState}
        cableType={cableSettings.cableType}
        sagFactor={cableSettings.sagFactor}
        loopCount={cableSettings.loopCount}
        visible={cableSettings.visible}
      />

      {/* Dynamic Counterweight System on the Rear Arm */}
      <CraneCounterweight
        crane={crane}
        kinematics={kinState}
        visible={true}
      />

      {/* 3D Technical Blueprint Dimension Overlay (Profile & Top-Down) */}
      <CraneBlueprintOverlay
        kinematics={kinState}
        visible={cableSettings.showBlueprint}
        mode={cableSettings.blueprintMode}
      />

      {/* 🎬 Interactive Two-Operator Crew (Kranführer am Heck + DoP am Bodenpult) */}
      <CraneOperator
        mode={cableSettings.operatorMode || 'hidden'}
        onArrivedAtControls={() => {
          if (setCableSettings) {
            setCableSettings((s: any) => ({ ...s, operatorMode: 'operating' }));
          }
        }}
        onExited={() => {
          if (setCableSettings) {
            setCableSettings((s: any) => ({ ...s, operatorMode: 'hidden' }));
          }
        }}
        dollyTrack={kinState.dollyTrack || 0}
        columnElevation={kinState.columnElevation || 1.54}
        basePan={kinState.basePan || 0}
        boomTilt={kinState.boomTilt || 0}
        teleExtension={kinState.teleExtension || 0}
        headPan={kinState.headPan || 0}
        headTilt={kinState.headTilt || 0}
        headRoll={kinState.headRoll || 0}
      />
      
      {/* Camera Controls with Strict Floor Safety Constraints */}
      <OrbitControls 
        ref={orbitControlsRef} 
        target={[0, 4.0, 0]} 
        enableDamping 
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={1.5}
        maxDistance={60}
      />
    </>
  );
}

// --- MAIN CRANE COMPONENT ---
export default function Crane({ onOpenTechnocraneStudio }: { onOpenTechnocraneStudio?: () => void } = {}) {
  const orbitControlsRef = useRef<any>(null);
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>('free');
  const [stageInfo, setStageInfo] = useState<RoundTripStageInfo>({
    idx: 1,
    name: 'Hero Establishing Orbit',
    desc: '360° Studio-Weitwinkel & 15m Maximal-Hub',
    icon: '🌟',
    progress: 0
  });

  const basePanRef = useRef<HTMLInputElement>(null);
  const boomTiltRef = useRef<HTMLInputElement>(null);
  const teleExtensionRef = useRef<HTMLInputElement>(null);
  const columnElevationRef = useRef<HTMLInputElement>(null);
  const dollyTrackRef = useRef<HTMLInputElement>(null);
  const headPanRef = useRef<HTMLInputElement>(null);
  const headTiltRef = useRef<HTMLInputElement>(null);
  const headRollRef = useRef<HTMLInputElement>(null);

  const [sceneryMode, setSceneryMode] = useState<CraneSceneryType>('bright_concrete');

  const [cableSettings, setCableSettings] = useState({
    visible: true,
    cableType: 'photo' as CraneCableType,
    sagFactor: 0.3,
    loopCount: 10,
    autoDemo: false,
    demoSpeed: 1.0,
    autoDirector: false,
    directorInterval: 18,
    showBlueprint: false,
    blueprintMode: 'all' as 'all' | 'profile' | 'top',
    panRangeMode: '180' as '180' | '360',
    operatorMode: 'hidden' as CraneOperatorMode
  });

  const [showSpecsModal, setShowSpecsModal] = useState(false);

  const sliderRefs = {
    basePan: basePanRef,
    boomTilt: boomTiltRef,
    teleExtension: teleExtensionRef,
    columnElevation: columnElevationRef,
    dollyTrack: dollyTrackRef,
    headPan: headPanRef,
    headTilt: headTiltRef,
    headRoll: headRollRef
  };

  const kinematicsRef = useRef<Record<string, any>>({
    dollyTrack: 0,
    columnElevation: 1.54, // min 1.54m [5'-1"], max 3.63m [11'-10"]
    basePan: 0,
    boomTilt: 0,           // -57° to +60° UP
    teleExtension: 0,      // 0 to 11.3m [37'-1"]
    headPan: 0.0,          // 0° = straight ahead forward
    headTilt: 0.0,         // 0° = horizontal level
    headRoll: 0.0          // 0° = upright level
  });

  const handleSliderChange = (key: string, value: any) => {
    const kin = kinematicsRef.current;
    if (key === 'boomTilt') {
      kin.boomTilt = clampBoomTilt(value, kin.columnElevation || 1.54, kin.teleExtension || 0);
      if (sliderRefs.boomTilt?.current) sliderRefs.boomTilt.current.value = kin.boomTilt.toString();
    } else if (key === 'columnElevation') {
      kin.columnElevation = clampColumnElevation(value, kin.boomTilt || 0, kin.teleExtension || 0);
      if (sliderRefs.columnElevation?.current) sliderRefs.columnElevation.current.value = kin.columnElevation.toString();
    } else if (key === 'teleExtension') {
      kin.teleExtension = clampTeleExtension(value, kin.columnElevation || 1.54, kin.boomTilt || 0);
      if (sliderRefs.teleExtension?.current) sliderRefs.teleExtension.current.value = kin.teleExtension.toString();
    } else if (key === 'basePan') {
      kin.basePan = clampBasePan(value, cableSettings.panRangeMode);
      if (sliderRefs.basePan?.current) sliderRefs.basePan.current.value = kin.basePan.toString();
    } else {
      (kin as any)[key] = value;
      if ((sliderRefs as any)[key]?.current) {
        (sliderRefs as any)[key].current.value = value.toString();
      }
    }

    if (cableSettings.autoDemo) {
      setCableSettings(s => ({ ...s, autoDemo: false }));
    }
  };

  const handleTiltPreset = (targetTiltDeg: number) => {
    const k = kinematicsRef.current;
    const reqCol = getMinColumnElevationForPose(targetTiltDeg, k.teleExtension || 0, SAFE_FLOOR_CLEARANCE);
    if (k.columnElevation < reqCol) {
      k.columnElevation = reqCol;
      if (sliderRefs.columnElevation?.current) {
        sliderRefs.columnElevation.current.value = k.columnElevation.toString();
      }
    }
    k.boomTilt = clampBoomTilt(targetTiltDeg, k.columnElevation || 1.54, k.teleExtension || 0, SAFE_FLOOR_CLEARANCE);
    if (sliderRefs.boomTilt?.current) {
      sliderRefs.boomTilt.current.value = k.boomTilt.toString();
    }
    if (cableSettings.autoDemo) {
      setCableSettings(s => ({ ...s, autoDemo: false }));
    }
  };

  // Real-time Vertical Kinematics Calculations for HUD (Strict Floor Protection Y >= 0):
  const kin = kinematicsRef.current;
  const colHeight = kin.columnElevation || 1.54;
  const tiltDeg = kin.boomTilt || 0;
  const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
  const ext = kin.teleExtension || 0;
  
  // Total reach from fulcrum (3.24m retracted to 14.64m fully extended)
  const totalBoomFront = 3.24 + (ext / 11.3) * (14.64 - 3.24);
  const noseY = colHeight + totalBoomFront * Math.sin(tiltRad);
  const horizontalReach = totalBoomFront * Math.cos(tiltRad);

  // Optical Lens Height (Head hanging down perpendicularly under nose)
  const headOffset = -0.785;
  const liveLensHeightM = Math.max(0, noseY + headOffset);
  const liveLensHeightFt = (liveLensHeightM * 3.28084).toFixed(1);
  const maxAllowedLensHeight = 15.11;
  const heightProgress = Math.min(100, (liveLensHeightM / maxAllowedLensHeight) * 100);

  // Live Ground Clearance for Front and Rear (Invariant: Y >= 0.00m)
  const frontLowestY = Math.max(0, getFrontLowestY(colHeight, tiltDeg, ext));
  const rearLowestY = Math.max(0, getRearLowestY(colHeight, tiltDeg, ext));
  const allowedTilt = getAllowedTiltRange(colHeight, ext);
  const maxAllowedExt = getAllowedExtensionMax(colHeight, tiltDeg);

  const isFrontNearFloor = frontLowestY < 0.15;
  const isRearNearFloor = rearLowestY < 0.15;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      {/* React Three Fiber Canvas */}
      <Canvas 
        shadows 
        camera={{ position: [-26, 7.5, -3.5], fov: 45, near: 0.1, far: 2000 }}
        style={{ width: '100%', height: '100%', outline: 'none', touchAction: 'none' }}
      >
        <color attach="background" args={[sceneryBgColors[sceneryMode]]} />
        <CraneScene
          kinematicsRef={kinematicsRef}
          sliderRefs={sliderRefs}
          cableSettings={cableSettings}
          sceneryMode={sceneryMode}
          cameraViewMode={cameraViewMode}
          setCameraViewMode={setCameraViewMode}
          orbitControlsRef={orbitControlsRef}
          onStageChange={setStageInfo}
          setCableSettings={setCableSettings}
        />
      </Canvas>

      {/* --- QUICK SCENERY SWITCHER TOOLBAR (TOP RIGHT) --- */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(11, 16, 24, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        borderRadius: '30px',
        padding: '4px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 60,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        fontFamily: 'Inter, system-ui, sans-serif',
        maxWidth: 'calc(100vw - 40px)',
        overflowX: 'auto'
      }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
          <span>🌍</span> <span>STANDORT:</span>
        </span>
        {sceneryOptions.map(item => {
          const isActive = sceneryMode === item.id;
          return (
            <button
              key={`quick-scenery-${item.id}`}
              onClick={() => setSceneryMode(item.id)}
              title={item.desc}
              style={{
                padding: '5px 9px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '20px',
                border: `1px solid ${isActive ? item.color : 'rgba(255,255,255,0.1)'}`,
                background: isActive ? `${item.color}28` : 'rgba(255,255,255,0.05)',
                color: isActive ? (item.isBright ? '#38bdf8' : item.color) : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? `0 0 12px ${item.color}40` : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.shortLabel}</span>
            </button>
          );
        })}

        {/* 🎬 Quick Operator Walk-In Button */}
        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />
        <button
          onClick={() => {
            setCableSettings(s => {
              const isOff = s.operatorMode === 'hidden' || s.operatorMode === 'walking_out';
              const nextMode: CraneOperatorMode = isOff ? 'walking_in' : 'walking_out';
              if (isOff) {
                setCameraViewMode('operator');
              }
              return { ...s, operatorMode: nextMode };
            });
          }}
          title="Kran-Operator ins Bild laufen lassen und am Heck-Steuerpult bedienen (Zoomt heran)"
          style={{
            padding: '5px 11px',
            fontSize: '10px',
            fontWeight: 800,
            borderRadius: '20px',
            border: `1px solid ${
              cableSettings.operatorMode === 'operating' 
                ? '#4ade80' 
                : cableSettings.operatorMode === 'walking_in' 
                ? '#facc15' 
                : 'rgba(56, 189, 248, 0.5)'
            }`,
            background: 
              cableSettings.operatorMode === 'operating' 
                ? 'rgba(34, 197, 94, 0.25)' 
                : cableSettings.operatorMode === 'walking_in' 
                ? 'rgba(250, 204, 21, 0.25)' 
                : 'rgba(56, 189, 248, 0.15)',
            color: 
              cableSettings.operatorMode === 'operating' 
                ? '#4ade80' 
                : cableSettings.operatorMode === 'walking_in' 
                ? '#facc15' 
                : '#38bdf8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            boxShadow: cableSettings.operatorMode !== 'hidden' ? '0 0 14px rgba(56, 189, 248, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <span>{cableSettings.operatorMode === 'operating' ? '👥' : '🚶'}</span>
          <span>
            {cableSettings.operatorMode === 'operating' 
              ? '👥 2 Operatoren (Heck + Pult aktiv)' 
              : cableSettings.operatorMode === 'walking_in' 
              ? '⏳ 2 Operatoren laufen an...' 
              : '👥 2 Operatoren rufen (Heck + Pult)'}
          </span>
        </button>
      </div>

      {/* --- CINEMATIC ROUND-TRIP LIVE DIRECTOR HUD BANNER --- */}
      {(cameraViewMode === 'cinematic' || cableSettings.autoDemo) && cameraViewMode !== 'pov' && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(11, 16, 24, 0.90)',
          border: '1px solid rgba(250, 204, 21, 0.45)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(250, 204, 21, 0.15)',
          borderRadius: '30px',
          padding: '8px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 50,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          pointerEvents: 'none',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 10px #ef4444',
              animation: 'pulse 1.5s infinite'
            }} />
            <span style={{ color: '#facc15', fontSize: '11px', fontWeight: 900, letterSpacing: '1.2px' }}>
              DIRECTOR ROUND-TRIP
            </span>
          </div>
          
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{stageInfo.icon}</span>
            <div>
              <div style={{ color: '#f8fafc', fontSize: '12px', fontWeight: 800 }}>
                {stageInfo.idx}/8 {stageInfo.name}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                {stageInfo.desc}
              </div>
            </div>
          </div>

          <div style={{ width: '70px', height: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${(stageInfo.progress * 100).toFixed(0)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #facc15, #38bdf8)',
              borderRadius: '3px',
              transition: 'width 0.1s linear'
            }} />
          </div>
        </div>
      )}

      {/* --- CINEMA DIRECTOR'S VIEWFINDER HUD OVERLAY (ACTIVE IN POV MODE) --- */}
      {cameraViewMode === 'pov' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 40,
          boxSizing: 'border-box',
          padding: '24px'
        }}>
          {/* Anamorphic Frame Outline (2.39:1) */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '88vw',
            height: 'calc(88vw / 2.39)',
            maxHeight: '82vh',
            border: '2px solid rgba(255, 255, 255, 0.45)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7)',
            pointerEvents: 'none'
          }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '32px', height: '32px' }}>
              <div style={{ position: 'absolute', top: '15px', left: 0, width: '32px', height: '2px', background: 'rgba(255,255,255,0.7)' }} />
              <div style={{ position: 'absolute', top: 0, left: '15px', width: '2px', height: '32px', background: 'rgba(255,255,255,0.7)' }} />
            </div>
            <div style={{ position: 'absolute', top: '33.3%', left: 0, width: '100%', height: '1px', background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ position: 'absolute', top: '66.6%', left: 0, width: '100%', height: '1px', background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ position: 'absolute', top: 0, left: '33.3%', width: '1px', height: '100%', background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ position: 'absolute', top: 0, left: '66.6%', width: '1px', height: '100%', background: 'rgba(255,255,255,0.15)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00ffcc', fontFamily: 'monospace', fontSize: '13px', textShadow: '0 1px 4px #000' }}>
            <div>
              <span style={{ color: '#ef4444', fontWeight: 900 }}>● REC</span> <span style={{ marginLeft: '12px' }}>01:24:38:14</span>
            </div>
            <div>
              <span>ARRI ALEXA MINI LF</span> • <span>24.000 FPS</span> • <span>180.0°</span>
            </div>
            <div>
              <span>ISO 800</span> • <span>5600K +0.2CC</span> • <span>ND 0.6</span>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', display: 'flex', justifyContent: 'space-between', color: '#ffd700', fontFamily: 'monospace', fontSize: '13px', textShadow: '0 1px 4px #000' }}>
            <div>
              <span>LENS: ANGENIEUX OPTIMO 4.7x (24-290mm)</span> • <span>IRIS: T2.8</span>
            </div>
            <div>
              <span>GYRO: ACTIVE</span> • <span>HORIZON: LOCK</span> • <span>HEIGHT: {liveLensHeightM.toFixed(2)}m ({liveLensHeightFt}')</span>
            </div>
          </div>
        </div>
      )}
      
      {/* 2D CRANE DASHBOARD UI (LEFT) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(11, 16, 24, 0.94)',
        color: '#fff',
        padding: '18px',
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        width: '370px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '8px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#facc15' }}>
              🏗️ Supertechno 50+
            </h3>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Kinematik, Profil & Grundriss-Maße</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {onOpenTechnocraneStudio && (
              <button
                onClick={onOpenTechnocraneStudio}
                style={{
                  fontSize: '10px',
                  background: 'linear-gradient(135deg, #facc15, #eab308)',
                  color: '#0f172a',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(250, 204, 21, 0.4)'
                }}
              >
                🎬 STUDIO
              </button>
            )}
            <button
              onClick={() => setShowSpecsModal(!showSpecsModal)}
              style={{
                fontSize: '10px',
                background: showSpecsModal ? 'rgba(56,189,248,0.35)' : 'rgba(56,189,248,0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56,189,248,0.4)',
                padding: '3px 7px',
                borderRadius: '4px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {showSpecsModal ? '✕ Datenblatt' : '📋 SPECS 50+'}
            </button>
          </div>
        </div>

        {/* --- BLUEPRINT DATASHEET MODAL / PANEL --- */}
        {showSpecsModal && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '14px',
            fontSize: '11px'
          }}>
            <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '6px', borderBottom: '1px solid rgba(56,189,248,0.2)', paddingBottom: '4px' }}>
              📐 Technische Spezifikation (Blueprint Daten)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '4px', color: '#cbd5e1' }}>
              <span style={{ color: '#94a3b8' }}>Max. Linsenhöhe:</span>
              <strong style={{ color: '#facc15' }}>15,1 m [50 ft]</strong>

              <span style={{ color: '#94a3b8' }}>Max. Teleskopauszug:</span>
              <strong style={{ color: '#38bdf8' }}>11,3 m [37 ft]</strong>

              <span style={{ color: '#94a3b8' }}>Gesamtlänge (eingef.):</span>
              <strong style={{ color: '#38bdf8' }}>7,05 m [23'-1"]</strong>

              <span style={{ color: '#94a3b8' }}>Radstand:</span>
              <strong style={{ color: '#facc15' }}>2,18 m [7'-2"] (Chassis 2,45m)</strong>

              <span style={{ color: '#94a3b8' }}>Spurbreite / Stützen:</span>
              <strong style={{ color: '#f87171' }}>1,88 m [6'-2"] (Max: 2,46 m [8'-1"])</strong>

              <span style={{ color: '#94a3b8' }}>Heck-Schutzrahmen:</span>
              <strong style={{ color: '#4ade80' }}>1,48 m [4'-10"]</strong>

              <span style={{ color: '#94a3b8' }}>Max. Kameragewicht:</span>
              <strong style={{ color: '#cbd5e1' }}>35 kg [80 lb]</strong>

              <span style={{ color: '#94a3b8' }}>Gesamtgewicht:</span>
              <strong style={{ color: '#cbd5e1' }}>2520 kg [5100 / 5555 lb]</strong>

              <span style={{ color: '#94a3b8' }}>Max. Geschwindigkeit:</span>
              <strong style={{ color: '#cbd5e1' }}>2,8 m/s</strong>
            </div>
          </div>
        )}

        {/* --- 🌍 SCENERY & STANDORT SELECTION --- */}
        <div style={{
          background: 'rgba(74, 222, 128, 0.08)',
          border: '1px solid rgba(74, 222, 128, 0.35)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🌍</span> <span>Standort & Untergrund</span>
            </span>
            <span style={{ fontSize: '10px', color: '#86efac', background: 'rgba(34, 197, 94, 0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
              {sceneryMode.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {sceneryOptions.map(item => (
              <button
                key={`dash-scenery-${item.id}`}
                onClick={() => setSceneryMode(item.id)}
                style={{
                  padding: '7px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '5px',
                  border: `1px solid ${sceneryMode === item.id ? item.color : 'rgba(255,255,255,0.1)'}`,
                  background: sceneryMode === item.id ? `${item.color}25` : 'rgba(255,255,255,0.05)',
                  color: sceneryMode === item.id ? item.color : '#cbd5e1',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: sceneryMode === item.id ? `0 0 10px ${item.color}30` : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.isBright && (
                    <span style={{ fontSize: '7px', background: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', padding: '1px 3px', borderRadius: '3px', marginLeft: 'auto' }}>
                      HELL
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '8px', color: sceneryMode === item.id ? '#bae6fd' : '#64748b', fontWeight: 400, marginTop: '2px' }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* --- 1. LIVE VERTICAL TELEMETRY & SPECS MONITOR --- */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '14px'
        }}>
          {/* Floor Guard Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '6px',
            padding: '4px 8px',
            marginBottom: '10px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#4ade80'
          }}>
            <span>🛡️ BODENSCHUTZ AKTIV</span>
            <span>Y ≥ 0.00 m LOCK</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
              📐 Vertikale Linsenhöhe (Live)
            </span>
            <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700 }}>
              MAX 15.11m [50 FT]
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <div style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 900, color: '#facc15' }}>
              {liveLensHeightM.toFixed(2)} <span style={{ fontSize: '14px', color: '#e2e8f0' }}>m</span>
            </div>
            <div style={{ fontSize: '15px', fontFamily: 'monospace', color: '#94a3b8' }}>
              {liveLensHeightFt} <span style={{ fontSize: '11px' }}>ft</span>
            </div>
          </div>

          {/* Dynamic Height Limit Bar */}
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              width: `${heightProgress}%`,
              height: '100%',
              background: liveLensHeightM > 14.5 ? 'linear-gradient(90deg, #38bdf8, #4ade80)' : '#38bdf8',
              borderRadius: '4px',
              transition: 'width 0.1s linear'
            }} />
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px', marginBottom: '8px' }}>
            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '5px 8px', borderRadius: '4px' }}>
              <div style={{ color: '#94a3b8' }}>Horiz. Radius:</div>
              <div style={{ color: '#facc15', fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }}>
                {horizontalReach.toFixed(2)} m ({(horizontalReach * 3.28084).toFixed(1)}')
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '5px 8px', borderRadius: '4px' }}>
              <div style={{ color: '#94a3b8' }}>Säulenhöhe:</div>
              <div style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }}>
                {colHeight.toFixed(2)} m ({(colHeight * 3.28084).toFixed(1)}')
              </div>
            </div>
          </div>

          {/* Dual Clearance Status (Front & Rear) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
            {/* Front Head Ground Clearance */}
            <div style={{
              padding: '5px 8px',
              borderRadius: '4px',
              background: isFrontNearFloor ? 'rgba(250, 204, 21, 0.18)' : 'rgba(0,0,0,0.3)',
              border: isFrontNearFloor ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid transparent'
            }}>
              <div style={{ color: isFrontNearFloor ? '#facc15' : '#94a3b8', fontSize: '9px' }}>
                {isFrontNearFloor ? '⚠️ Spitze (Bodennähe):' : 'Spitze Bodenfreiheit:'}
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ade80' }}>
                +{frontLowestY.toFixed(2)} m ✓
              </div>
            </div>

            {/* Rear Tail Ground Clearance */}
            <div style={{
              padding: '5px 8px',
              borderRadius: '4px',
              background: isRearNearFloor ? 'rgba(250, 204, 21, 0.18)' : 'rgba(0,0,0,0.3)',
              border: isRearNearFloor ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid transparent'
            }}>
              <div style={{ color: isRearNearFloor ? '#facc15' : '#94a3b8', fontSize: '9px' }}>
                {isRearNearFloor ? '⚠️ Heck (Bodennähe):' : 'Heck Bodenfreiheit:'}
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ade80' }}>
                +{rearLowestY.toFixed(2)} m ✓
              </div>
            </div>
          </div>
        </div>

        {/* --- 2. CAMERA PERSPECTIVE PRESETS --- */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600 }}>🎥 Kamera-Perspektiven:</span>
            {cableSettings.autoDirector && (
              <span style={{ fontSize: '10px', color: '#facc15', background: 'rgba(250,204,21,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                🎦 Regie-Live
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {[
              { id: 'cinematic', label: '🎬 Orbit', desc: 'Round-Trip' },
              { id: 'profile', label: '📐 Profil', desc: 'Seitenriss' },
              { id: 'top', label: '🦅 Draufsicht', desc: 'Grundriss' },
              { id: 'operator', label: '🚶 Heck-Op', desc: 'Kranführer' },
              { id: 'desk', label: '🎛️ Pult-DoP', desc: 'Bodenpult' },
              { id: 'full', label: '🌟 Gesamt', desc: 'Studio' },
              { id: 'head', label: '🎥 Head', desc: 'Optik' },
              { id: 'weight', label: '⚖️ Heck', desc: 'Schlitten' },
              { id: 'cable', label: '➰ Kabel', desc: 'Schlaufen' },
              { id: 'pov', label: '🎬 POV', desc: 'Sucher' },
              { id: 'dolly', label: '🏎️ Track', desc: 'Frosch' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  setCameraViewMode(preset.id as CameraViewMode);
                  if (cableSettings.autoDirector) {
                    setCableSettings(s => ({ ...s, autoDirector: false }));
                  }
                }}
                style={{
                  padding: '6px 2px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: `1px solid ${cameraViewMode === preset.id ? '#facc15' : 'rgba(255,255,255,0.1)'}`,
                  background: cameraViewMode === preset.id ? 'rgba(250, 204, 21, 0.25)' : 'rgba(255,255,255,0.05)',
                  color: cameraViewMode === preset.id ? '#facc15' : '#c9d1d9',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>{preset.label}</div>
                <div style={{ fontSize: '8px', color: cameraViewMode === preset.id ? '#fde047' : '#64748b', fontWeight: 400 }}>{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* --- 2.1 MANUELLE KAMERA-KONTROLLE (DIREKT UNTER TRACK) --- */}
        <div style={{
          background: cameraViewMode === 'free' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${cameraViewMode === 'free' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '14px',
          transition: 'all 0.25s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: cameraViewMode === 'free' ? '#38bdf8' : '#e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🕹️</span> <span>Manuelle Kamera-Kontrolle (Freier Orbit)</span>
            </span>
            {cameraViewMode === 'free' && (
              <span style={{ fontSize: '9px', color: '#38bdf8', background: 'rgba(56,189,248,0.2)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                AKTIV
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
            <button
              onClick={() => {
                setCameraViewMode('free');
                if (cableSettings.autoDirector) {
                  setCableSettings(s => ({ ...s, autoDirector: false }));
                }
              }}
              style={{
                padding: '7px 8px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '5px',
                border: `1px solid ${cameraViewMode === 'free' ? '#38bdf8' : 'rgba(255,255,255,0.15)'}`,
                background: cameraViewMode === 'free' ? '#0284c7' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: cameraViewMode === 'free' ? '0 2px 10px rgba(2,132,199,0.4)' : 'none'
              }}
            >
              <span>🔓</span> <span>Freie Maus-Kamera</span>
            </button>

            <button
              onClick={() => {
                if (orbitControlsRef.current) {
                  const currentDollyZ = -(kin.dollyTrack || 0);
                  orbitControlsRef.current.target.set(0, 4.0, currentDollyZ);
                  orbitControlsRef.current.object.position.set(16, 11.5, currentDollyZ + 17);
                  orbitControlsRef.current.update();
                }
                setCameraViewMode('full');
              }}
              style={{
                padding: '7px 8px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '5px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>↺</span> <span>Kamera Reset</span>
            </button>
          </div>

          {/* Quick Focus Points for Manual Orbit */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            <button
              onClick={() => {
                setCameraViewMode('free');
                if (orbitControlsRef.current) {
                  const currentDollyZ = -(kin.dollyTrack || 0);
                  const tExt = Math.max(0, Math.min(1.0, (kin.teleExtension || 0) / 11.3));
                  const tipZ = -3.34 - tExt * 11.40;
                  const tiltRad = THREE.MathUtils.degToRad(kin.boomTilt || 0);
                  const panRad = THREE.MathUtils.degToRad(-kin.basePan || 0);
                  const colH = kin.columnElevation || 1.54;
                  const mastWorld = new THREE.Vector3(0, colH, currentDollyZ);
                  const localHeadPos = new THREE.Vector3(-0.01, -0.50, tipZ);
                  localHeadPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad);
                  localHeadPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), panRad);
                  localHeadPos.add(mastWorld);

                  orbitControlsRef.current.target.set(localHeadPos.x, Math.max(0.6, localHeadPos.y), localHeadPos.z);
                  orbitControlsRef.current.update();
                }
              }}
              style={{
                padding: '4px 2px',
                fontSize: '9px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
              title="Orbit-Mittelpunkt auf den Remote-Kamerakopf setzen"
            >
              🎯 Fokus Kopf
            </button>

            <button
              onClick={() => {
                setCameraViewMode('free');
                if (orbitControlsRef.current) {
                  const currentDollyZ = -(kin.dollyTrack || 0);
                  orbitControlsRef.current.target.set(0, (kin.columnElevation || 1.54) + 0.05, currentDollyZ);
                  orbitControlsRef.current.update();
                }
              }}
              style={{
                padding: '4px 2px',
                fontSize: '9px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
              title="Orbit-Mittelpunkt auf die Kransäule / Drehpunkt setzen"
            >
              🎯 Fokus Säule
            </button>

            <button
              onClick={() => {
                setCameraViewMode('free');
                if (orbitControlsRef.current) {
                  const currentDollyZ = -(kin.dollyTrack || 0);
                  const tExt = Math.max(0, Math.min(1.0, (kin.teleExtension || 0) / 11.3));
                  const sledZ = THREE.MathUtils.lerp(-0.80, 3.28, tExt);
                  const tiltRad = THREE.MathUtils.degToRad(kin.boomTilt || 0);
                  const panRad = THREE.MathUtils.degToRad(-kin.basePan || 0);
                  const colH = kin.columnElevation || 1.54;
                  const mastWorld = new THREE.Vector3(0, colH, currentDollyZ);
                  const localCwPos = new THREE.Vector3(0, 0.15, sledZ);
                  localCwPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad);
                  localCwPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), panRad);
                  localCwPos.add(mastWorld);

                  orbitControlsRef.current.target.set(localCwPos.x, Math.max(0.6, localCwPos.y), localCwPos.z);
                  orbitControlsRef.current.update();
                }
              }}
              style={{
                padding: '4px 2px',
                fontSize: '9px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
              title="Orbit-Mittelpunkt auf das Gegengewicht setzen"
            >
              🎯 Fokus Heck
            </button>
          </div>
        </div>

        {/* --- 3. VERTICAL KINEMATICS CONTROLS (TILT & COLUMN) --- */}
        <div style={{
          background: 'rgba(250, 204, 21, 0.08)',
          border: '1px solid rgba(250, 204, 21, 0.35)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#facc15' }}>
              📐 Vertikal-Steuerung & Hub
            </span>
          </div>

          {/* Boom Tilt / Pitch (Dynamically floor-constrained so Y >= 0) */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffd700', marginBottom: '2px' }}>
              <span>Boom Tilt (Aufrichten / Senken):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {tiltDeg.toFixed(1)}° {tiltDeg >= 59.5 ? '(MAX 60° UP)' : ''}
              </span>
            </div>
            <input 
              type="range" 
              ref={boomTiltRef} 
              min="-57" 
              max="60" 
              step="0.1" 
              defaultValue="0" 
              onChange={(e) => handleSliderChange('boomTilt', parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#ffd700', cursor: 'pointer', marginBottom: '2px' }} 
            />
            {/* Live Allowed Span Note */}
            <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Limit bei {colHeight.toFixed(2)}m Hub:</span>
              <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 700 }}>
                {allowedTilt.minTilt.toFixed(1)}° bis +{allowedTilt.maxTilt.toFixed(1)}°
              </span>
            </div>

            {/* Tilt Preset Buttons (Safe Auto-Elevation enabled) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px' }}>
              {[
                { deg: -45, label: '-45° 🎯' },
                { deg: 0, label: '0° Level' },
                { deg: 30, label: '+30°' },
                { deg: 60, label: '+60° UP 🚀' }
              ].map(item => (
                <button
                  key={`tilt-${item.deg}`}
                  onClick={() => handleTiltPreset(item.deg)}
                  title={`Preset ${item.label}: Stellt den Winkel ein und passt den Säulenhub bei Bedarf automatisch an, damit kein Kranteil unter Y=0 sinkt.`}
                  style={{
                    padding: '4px 2px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: Math.abs(tiltDeg - item.deg) < 1 ? 'rgba(250,204,21,0.25)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs(tiltDeg - item.deg) < 1 ? '#facc15' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column Elevation / Säulenhub (1.54m to 3.63m) */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#38bdf8', marginBottom: '2px' }}>
              <span>Mittelsäule Hub (1.54m - 3.63m):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{colHeight.toFixed(2)} m</span>
            </div>
            <input 
              type="range" 
              ref={columnElevationRef} 
              min="1.54" 
              max="3.63" 
              step="0.01" 
              defaultValue="1.54" 
              onChange={(e) => handleSliderChange('columnElevation', parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', marginBottom: '4px' }} 
            />
            {/* Column Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
              {[
                { val: 1.54, label: '1.54m (Min)' },
                { val: 2.58, label: '2.58m (Mid)' },
                { val: 3.63, label: '3.63m (Max)' }
              ].map(item => (
                <button
                  key={`col-${item.val}`}
                  onClick={() => handleSliderChange('columnElevation', item.val)}
                  style={{
                    padding: '3px 2px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '3px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: Math.abs(colHeight - item.val) < 0.05 ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs(colHeight - item.val) < 0.05 ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Telescopic Extension (0 to 11.3m, floor-clamped) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffd700', marginBottom: '2px' }}>
              <span>Teleskop Auszug (11.3m Travel):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {ext.toFixed(2)} m {maxAllowedExt < 11.2 ? `(Max ${maxAllowedExt.toFixed(2)}m)` : ''}
              </span>
            </div>
            <input 
              type="range" 
              ref={teleExtensionRef} 
              min="0" 
              max="11.3" 
              step="0.1" 
              defaultValue="0" 
              onChange={(e) => handleSliderChange('teleExtension', parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#ffd700', cursor: 'pointer', marginBottom: '4px' }} 
            />
            {/* Telescope Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
              {[
                { val: 0, label: '0m (3.23m Reach)' },
                { val: 5.65, label: '5.65m' },
                { val: 11.3, label: '11.3m (14.77m)' }
              ].map(item => (
                <button
                  key={`ext-${item.val}`}
                  onClick={() => handleSliderChange('teleExtension', item.val)}
                  style={{
                    padding: '3px 2px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '3px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: Math.abs(ext - item.val) < 0.2 ? 'rgba(250,204,21,0.25)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs(ext - item.val) < 0.2 ? '#facc15' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- 4. 3-AXIS REMOTE CAMERA HEAD STEUERUNG (PAN, TILT, ROLL) --- */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>
              🎥 3-Achs Remote Head (Gyrokopf)
            </span>
            <button
              onClick={() => {
                handleSliderChange('headPan', 0.0);
                handleSliderChange('headTilt', 0.0);
                handleSliderChange('headRoll', 0.0);
              }}
              style={{
                padding: '2px 7px',
                fontSize: '9px',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fca5a5',
                cursor: 'pointer'
              }}
            >
              ⟲ Head Nullstellung (Geradeaus)
            </button>
          </div>

          {/* Head Pan (Schwenken -180° bis +180°) */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#fca5a5', marginBottom: '2px' }}>
              <span>Head Pan (Yaw / Schwenk):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{(kin.headPan !== undefined ? kin.headPan : 0.0).toFixed(1)}°</span>
            </div>
            <input 
              type="range" 
              ref={headPanRef} 
              min="-180" 
              max="180" 
              step="0.5" 
              defaultValue="0" 
              onChange={(e) => handleSliderChange('headPan', parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer', marginBottom: '3px' }} 
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
              {[
                { deg: -90, label: '-90° Links' },
                { deg: 0, label: '0° Geradeaus' },
                { deg: 90, label: '+90° Rechts' }
              ].map(item => (
                <button
                  key={`hpan-${item.deg}`}
                  onClick={() => handleSliderChange('headPan', item.deg)}
                  style={{
                    padding: '2px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '3px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: Math.abs((kin.headPan || 0) - item.deg) < 1 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs((kin.headPan || 0) - item.deg) < 1 ? '#fecaca' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Head Tilt (Neigen -180° bis +180°) */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#fca5a5', marginBottom: '2px' }}>
              <span>Head Tilt (Pitch / Neigung):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{(kin.headTilt !== undefined ? kin.headTilt : 0.0).toFixed(1)}°</span>
            </div>
            <input 
              type="range" 
              ref={headTiltRef} 
              min="-180" 
              max="180" 
              step="0.5" 
              defaultValue="0" 
              onChange={(e) => handleSliderChange('headTilt', parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer', marginBottom: '3px' }} 
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
              {[
                { deg: -45, label: '-45° Abwärts' },
                { deg: 0, label: '0° Level' },
                { deg: 45, label: '+45° Aufwärts' }
              ].map(item => (
                <button
                  key={`htilt-${item.deg}`}
                  onClick={() => handleSliderChange('headTilt', item.deg)}
                  style={{
                    padding: '2px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '3px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: Math.abs((kin.headTilt || 0) - item.deg) < 1 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs((kin.headTilt || 0) - item.deg) < 1 ? '#fecaca' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Head Roll (Rollen -180° bis +180°) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#fca5a5', marginBottom: '2px' }}>
              <span>Head Roll (Dutch Angle / 360° Ring):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{(kin.headRoll !== undefined ? kin.headRoll : 0.0).toFixed(1)}°</span>
            </div>
            <input 
              type="range" 
              ref={headRollRef} 
              min="-180" 
              max="180" 
              step="0.5" 
              defaultValue="0" 
              onChange={(e) => handleSliderChange('headRoll', parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer', marginBottom: '3px' }} 
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
              {[
                { deg: -90, label: '-90° Roll L' },
                { deg: 0, label: '0° Level' },
                { deg: 90, label: '+90° Roll R' }
              ].map(item => (
                <button
                  key={`hroll-${item.deg}`}
                  onClick={() => handleSliderChange('headRoll', item.deg)}
                  style={{
                    padding: '2px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '3px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: Math.abs((kin.headRoll || 0) - item.deg) < 1 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs((kin.headRoll || 0) - item.deg) < 1 ? '#fecaca' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- 5. FESTOON-KABEL EINSTELLUNGEN & DESIGN --- */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
              ➰ Festoon-Kabelbaum & Schlaufen
            </span>
            <label style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <span>Aktiv</span>
              <input
                type="checkbox"
                checked={cableSettings.visible}
                onChange={(e) => setCableSettings(s => ({ ...s, visible: e.target.checked }))}
                style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
              />
            </label>
          </div>

          {cableSettings.visible && (
            <>
              {/* Cable Design Type Selector */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Kabel-Typ / Design:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {[
                    { id: 'photo', label: '📸 Foto-Authentisch', desc: 'Dual-Strand Rubber' },
                    { id: 'ribbon', label: '🎗️ Flachband', desc: 'Festoon Ribbon' },
                    { id: 'bundle', label: '📦 Multi-Core', desc: '4x Hybrid-Strang' },
                    { id: 'industrial', label: '⛓️ Heavy Duty', desc: 'Single Armor Cable' }
                  ].map(cType => (
                    <button
                      key={cType.id}
                      onClick={() => setCableSettings(s => ({ ...s, cableType: cType.id as any }))}
                      style={{
                        padding: '5px 4px',
                        fontSize: '9px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: `1px solid ${cableSettings.cableType === cType.id ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                        background: cableSettings.cableType === cType.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.05)',
                        color: cableSettings.cableType === cType.id ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>{cType.label}</div>
                      <div style={{ fontSize: '7.5px', color: cableSettings.cableType === cType.id ? '#bae6fd' : '#64748b', fontWeight: 400 }}>{cType.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cable Loop Sag Factor Slider */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#38bdf8', marginBottom: '2px' }}>
                  <span>Durchhang-Faktor (Sag):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{cableSettings.sagFactor.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.2" 
                  max="2.5" 
                  step="0.05" 
                  value={cableSettings.sagFactor} 
                  onChange={(e) => setCableSettings(s => ({ ...s, sagFactor: parseFloat(e.target.value) }))} 
                  style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', marginBottom: '3px' }} 
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
                  {[
                    { val: 0.3, label: '0.3x Straff' },
                    { val: 0.6, label: '0.6x Normal' },
                    { val: 1.0, label: '1.0x Locker' }
                  ].map(item => (
                    <button
                      key={`sag-${item.val}`}
                      onClick={() => setCableSettings(s => ({ ...s, sagFactor: item.val }))}
                      style={{
                        padding: '2px',
                        fontSize: '9px',
                        fontWeight: 700,
                        borderRadius: '3px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: Math.abs(cableSettings.sagFactor - item.val) < 0.05 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255,255,255,0.05)',
                        color: Math.abs(cableSettings.sagFactor - item.val) < 0.05 ? '#bae6fd' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loop Count Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#38bdf8', marginBottom: '2px' }}>
                  <span>Schlaufen-Anzahl (Loop Segments):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{cableSettings.loopCount} Schlaufen</span>
                </div>
                <input 
                  type="range" 
                  min="6" 
                  max="18" 
                  step="1" 
                  value={cableSettings.loopCount} 
                  onChange={(e) => setCableSettings(s => ({ ...s, loopCount: parseInt(e.target.value) }))} 
                  style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', marginBottom: '3px' }} 
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
                  {[
                    { val: 8, label: '8 Loops' },
                    { val: 10, label: '10 Standard' },
                    { val: 16, label: '16 Dicht' }
                  ].map(item => (
                    <button
                      key={`cnt-${item.val}`}
                      onClick={() => setCableSettings(s => ({ ...s, loopCount: item.val }))}
                      style={{
                        padding: '2px',
                        fontSize: '9px',
                        fontWeight: 700,
                        borderRadius: '3px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: cableSettings.loopCount === item.val ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255,255,255,0.05)',
                        color: cableSettings.loopCount === item.val ? '#bae6fd' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* --- 6. 3D BLUEPRINT OVERLAY CONTROLS (MODE SWITCHER) --- */}
        <div style={{
          marginBottom: '14px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '10px',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>📐 3D Blueprint Maße:</span>
            <input
              type="checkbox"
              checked={cableSettings.showBlueprint}
              onChange={(e) => setCableSettings(s => ({ ...s, showBlueprint: e.target.checked }))}
              style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>
          {cableSettings.showBlueprint && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
              {[
                { id: 'all', label: 'Beide Pläne' },
                { id: 'profile', label: '📐 Profil (Höhe)' },
                { id: 'top', label: '🦅 Grundriss' }
              ].map(bMode => (
                <button
                  key={bMode.id}
                  onClick={() => setCableSettings(s => ({ ...s, blueprintMode: bMode.id as any }))}
                  style={{
                    padding: '4px 2px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: `1px solid ${cableSettings.blueprintMode === bMode.id ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                    background: cableSettings.blueprintMode === bMode.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: cableSettings.blueprintMode === bMode.id ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {bMode.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --- 5. AUTO DEMO & SPEEDS --- */}
        <div style={{
          background: cableSettings.autoDemo ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${cableSettings.autoDemo ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: cableSettings.autoDemo ? '0 0 20px rgba(34, 197, 94, 0.15)' : 'none',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '14px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: cableSettings.autoDemo ? '#4ade80' : '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎬</span> <span>Auto-Demo (Round-Trip)</span>
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#facc15', fontWeight: 700 }}>
              {cableSettings.demoSpeed.toFixed(1)}x Speed
            </span>
          </div>

          <button
            onClick={() => setCableSettings(s => {
              const nextDemo = !s.autoDemo;
              if (nextDemo) {
                setCameraViewMode('cinematic');
              }
              return { ...s, autoDemo: nextDemo };
            })}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: cableSettings.autoDemo 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff',
              marginBottom: '8px',
              boxShadow: cableSettings.autoDemo 
                ? '0 4px 15px rgba(239, 68, 68, 0.4)' 
                : '0 4px 15px rgba(34, 197, 94, 0.4)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {cableSettings.autoDemo ? '⏹ Auto-Demo Stoppen' : '▶ 360° Cinematic Round-Trip Starten'}
          </button>

          <input
            type="range"
            min="0.2"
            max="4.0"
            step="0.1"
            value={cableSettings.demoSpeed}
            onChange={(e) => setCableSettings(s => ({ ...s, demoSpeed: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: '#4ade80', cursor: 'pointer' }}
          />
        </div>

        {/* --- 🎬 5.1 FILMSET 2-OPERATOREN CREW (HECK-KRANFÜHRER + BODENPULT-DOP) --- */}
        <div style={{
          background: cableSettings.operatorMode !== 'hidden' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${cableSettings.operatorMode !== 'hidden' ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: cableSettings.operatorMode !== 'hidden' ? '0 0 20px rgba(56, 189, 248, 0.15)' : 'none',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '14px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: cableSettings.operatorMode !== 'hidden' ? '#38bdf8' : '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>👥</span> <span>2x Filmset Operatoren (Live)</span>
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: cableSettings.operatorMode === 'operating' ? 'rgba(34, 197, 94, 0.2)' : cableSettings.operatorMode === 'walking_in' ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: cableSettings.operatorMode === 'operating' ? '#4ade80' : cableSettings.operatorMode === 'walking_in' ? '#facc15' : '#94a3b8'
            }}>
              {cableSettings.operatorMode === 'operating' ? '● 2 Operatoren aktiv' : cableSettings.operatorMode === 'walking_in' ? '⏳ Laufen ins Bild...' : cableSettings.operatorMode === 'walking_out' ? '🚶 Gehen...' : '○ Inaktiv'}
            </span>
          </div>

          <button
            onClick={() => {
              setCableSettings(s => {
                const isOff = s.operatorMode === 'hidden' || s.operatorMode === 'walking_out';
                const nextMode: CraneOperatorMode = isOff ? 'walking_in' : 'walking_out';
                if (isOff) {
                  setCameraViewMode('operator');
                }
                return { ...s, operatorMode: nextMode };
              });
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: cableSettings.operatorMode === 'operating'
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : cableSettings.operatorMode === 'walking_in'
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#fff',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: cableSettings.operatorMode === 'operating' ? '8px' : '0'
            }}
          >
            {cableSettings.operatorMode === 'operating' 
              ? '⏹ Operatoren entlassen (Walk-Out)' 
              : cableSettings.operatorMode === 'walking_in' 
              ? '⏳ 2 Operatoren laufen an ihre Pulte...' 
              : '▶ 👥 2 Operatoren rufen (Heck + Bodenpult)'}
          </button>

          {cableSettings.operatorMode === 'operating' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                onClick={() => setCameraViewMode('operator')}
                style={{
                  padding: '6px 4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: `1px solid ${cameraViewMode === 'operator' ? '#facc15' : 'rgba(255,255,255,0.15)'}`,
                  background: cameraViewMode === 'operator' ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.06)',
                  color: cameraViewMode === 'operator' ? '#facc15' : '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                🚶 Heck-Kranführer
              </button>
              <button
                onClick={() => setCameraViewMode('desk')}
                style={{
                  padding: '6px 4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: `1px solid ${cameraViewMode === 'desk' ? '#38bdf8' : 'rgba(255,255,255,0.15)'}`,
                  background: cameraViewMode === 'desk' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                  color: cameraViewMode === 'desk' ? '#38bdf8' : '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                🎛️ Bodenpult-DoP
              </button>
            </div>
          )}
        </div>

        {/* Base Pan & Dolly Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <label style={{ fontSize: '11px', color: '#ffd700' }}>Base Pan (°)</label>
              <button
                onClick={() => {
                  const next = cableSettings.panRangeMode === '180' ? '360' : '180';
                  setCableSettings(s => ({ ...s, panRangeMode: next }));
                }}
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  border: `1px solid ${cableSettings.panRangeMode === '180' ? 'rgba(56, 189, 248, 0.5)' : 'rgba(250, 204, 21, 0.5)'}`,
                  background: cableSettings.panRangeMode === '180' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(250, 204, 21, 0.2)',
                  color: cableSettings.panRangeMode === '180' ? '#38bdf8' : '#facc15',
                  cursor: 'pointer'
                }}
                title="Umschalten: 180° Datenblatt-Arbeitsbereich (±90°) vs. 360° Reale Schleifring-Drehung (±180°)"
              >
                {cableSettings.panRangeMode === '180' ? '📐 180° Plan' : '🔄 360° Real'}
              </button>
            </div>
            <input 
              type="range" 
              ref={basePanRef} 
              min={cableSettings.panRangeMode === '180' ? "-90" : "-180"} 
              max={cableSettings.panRangeMode === '180' ? "90" : "180"} 
              step="0.1" 
              defaultValue="0" 
              onChange={(e) => handleSliderChange('basePan', parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#ffd700' }} 
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <label style={{ fontSize: '11px', color: '#ffd700' }}>Dolly Fahrt (m)</label>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: (kinematicsRef.current.dollyTrack || 0) >= 0 ? '#38bdf8' : '#facc15', fontWeight: 700 }}>
                {(kinematicsRef.current.dollyTrack || 0) > 0 ? `+${(kinematicsRef.current.dollyTrack || 0).toFixed(1)}m Vor` : (kinematicsRef.current.dollyTrack || 0) < 0 ? `${(kinematicsRef.current.dollyTrack || 0).toFixed(1)}m Zurück` : '0.0m Mitte'}
              </span>
            </div>
            <input 
              type="range" 
              ref={dollyTrackRef} 
              min="-20" 
              max="20" 
              step="0.1" 
              defaultValue="0" 
              onChange={(e) => handleSliderChange('dollyTrack', parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#ffd700' }} 
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  const target = Math.min(20, Math.round(((kinematicsRef.current.dollyTrack || 0) + 2.0) * 10) / 10);
                  handleSliderChange('dollyTrack', target);
                }}
                style={{ flex: 1, padding: '3px 0', fontSize: '9px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', cursor: 'pointer' }}
                title="Dolly 2 Meter vorwärts fahren (Richtung Kran-Spitze)"
              >
                ▲ Vor
              </button>
              <button
                onClick={() => handleSliderChange('dollyTrack', 0)}
                style={{ flex: 1, padding: '3px 0', fontSize: '9px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', cursor: 'pointer' }}
                title="Dolly auf Gleis-Mitte (0m) zentrieren"
              >
                ⏺ 0m
              </button>
              <button
                onClick={() => {
                  const target = Math.max(-20, Math.round(((kinematicsRef.current.dollyTrack || 0) - 2.0) * 10) / 10);
                  handleSliderChange('dollyTrack', target);
                }}
                style={{ flex: 1, padding: '3px 0', fontSize: '9px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(250,204,21,0.4)', background: 'rgba(250,204,21,0.15)', color: '#facc15', cursor: 'pointer' }}
                title="Dolly 2 Meter rückwärts fahren (Richtung Gegengewicht)"
              >
                ▼ Zurück
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Keyboard Controls Legend UI */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(11, 16, 24, 0.90)',
        color: '#fff',
        padding: '14px 18px',
        borderRadius: '10px',
        fontFamily: 'Inter, system-ui, sans-serif',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        pointerEvents: 'none',
        fontSize: '11px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px', color: '#facc15' }}>
          ⌨️ VERTIKAL- & KRAN-KONTROLLEN
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px' }}>
          <strong style={{ color: '#38bdf8' }}>R / F</strong> <span>Säulenhub (1.54m - 3.63m)</span>
          <strong style={{ color: '#ffd700' }}>Q / E</strong> <span>Boom Tilt (-57° bis +60° UP)</span>
          <strong style={{ color: '#ffd700' }}>W / S</strong> <span>Teleskop (0 - 11.3m)</span>
          <strong style={{ color: '#ffd700' }}>A / D</strong> <span>Dolly Vorwärts / Rückwärts</span>
          <strong style={{ color: '#ff5500' }}>Pfeiltasten</strong> <span>Kamerakopf Pan / Tilt</span>
          <strong style={{ color: '#ff5500' }}>Z / X</strong> <span>Kamerakopf Roll (360°)</span>
        </div>
      </div>
    </div>
  );
}
