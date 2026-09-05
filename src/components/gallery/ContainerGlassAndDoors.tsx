import React, { useMemo } from 'react';
import * as THREE from 'three';
import { type ContainerStackMode } from '../../types/galleryTypes';

interface ContainerGlassAndDoorsProps {
  egDoorsOpen: number; // 0.0 to 1.0 (0 deg to 150 deg)
  ogDoorsOpen: number; // 0.0 to 1.0
  slidingDoorOpen: number; // 0.0 to 1.0 (0 to 1.2m offset)
  stackMode?: ContainerStackMode;
}

const LENGTH = 6.058;
const WIDTH = 2.438;
const HEIGHT = 2.591;

export const ContainerGlassAndDoors: React.FC<ContainerGlassAndDoorsProps> = ({
  egDoorsOpen,
  ogDoorsOpen,
  slidingDoorOpen,
  stackMode = 'double_stack',
}) => {
  // PBR Materials for Architectural Glass, Aluminum Frames, Door Hardware
  const materials = useMemo(() => {
    // Ultra-clear architectural low-iron glass with subtle reflections
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#dbeafe'),
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      metalness: 0.1,
      ior: 1.52,
      thickness: 0.03,
      reflectivity: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    const windowFrame = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'), // Anthracite powder-coated aluminum
      roughness: 0.35,
      metalness: 0.8,
    });

    const doorSteel = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#181f28'),
      roughness: 0.65,
      metalness: 0.45,
    });

    const lockingRodSteel = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#94a3b8'), // Galvanized steel
      roughness: 0.3,
      metalness: 0.9,
    });

    const doorRubberSeal = new THREE.MeshBasicMaterial({
      color: '#090d14',
    });

    const doorHandleGrip = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f59e0b'), // Safety orange/amber vinyl grip
      roughness: 0.5,
      metalness: 0.2,
    });

    return {
      glass,
      windowFrame,
      doorSteel,
      lockingRodSteel,
      doorRubberSeal,
      doorHandleGrip,
    };
  }, []);

  const egDoorAngle = egDoorsOpen * (Math.PI * 0.85); // bis zu ~153 Grad nach außen aufklappbar
  const ogDoorAngle = ogDoorsOpen * (Math.PI * 0.85);

  // 1. Solid Container Steel Door Leaf (2 vertical locking rods, cams, keeper handles, CSC plate, top vent)
  const ContainerSteelDoorLeaf = ({
    isLeft,
    angle,
    yOffset,
  }: {
    isLeft: boolean;
    angle: number;
    yOffset: number;
  }) => {
    const doorWidth = (WIDTH - 0.2) / 2;
    const doorHeight = HEIGHT - 0.26;
    const hingeZ = isLeft ? -WIDTH / 2 + 0.08 : WIDTH / 2 - 0.08;
    const rotationY = isLeft ? angle : -angle;

    return (
      <group position={[LENGTH / 2 - 0.02, yOffset + 0.13 + doorHeight / 2, hingeZ]}>
        <group rotation={[0, rotationY, 0]}>
          {/* Main Steel Door Panel */}
          <mesh position={[0, 0, isLeft ? doorWidth / 2 : -doorWidth / 2]} castShadow receiveShadow>
            <boxGeometry args={[0.045, doorHeight, doorWidth]} />
            <primitive object={materials.doorSteel} attach="material" />
          </mesh>

          {/* Horizontal Corrugated Ribs across the steel door (4 horizontal indentations) */}
          {[-0.65, -0.22, 0.22, 0.65].map((rY, rIdx) => (
            <mesh
              key={`door_rib_${rIdx}`}
              position={[0.024, rY, isLeft ? doorWidth / 2 : -doorWidth / 2]}
              castShadow
            >
              <boxGeometry args={[0.012, 0.18, doorWidth - 0.06]} />
              <primitive object={materials.doorSteel} attach="material" />
            </mesh>
          ))}

          {/* Circular Vent Disc / Relief Valve near top of door leaf */}
          <group position={[0.025, doorHeight * 0.42, isLeft ? doorWidth * 0.48 : -doorWidth * 0.48]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 0.015, 16]} />
              <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh position={[0.009, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.025, 0.025, 0.008, 12]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          </group>

          {/* CSC Safety Approval Data Plate on door */}
          <mesh position={[0.025, doorHeight * 0.05, isLeft ? doorWidth * 0.4 : -doorWidth * 0.4]}>
            <planeGeometry args={[0.22, 0.15]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.4} metalness={0.8} />
          </mesh>

          {/* Rubber perimeter seal */}
          <mesh position={[0, 0, isLeft ? doorWidth / 2 : -doorWidth / 2]}>
            <boxGeometry args={[0.048, doorHeight + 0.02, doorWidth + 0.01]} />
            <primitive object={materials.doorRubberSeal} attach="material" />
          </mesh>

          {/* 2x Vertical Galvanized Locking Rods */}
          {[-0.22, 0.22].map((offset, idx) => {
            const rodZ = (isLeft ? doorWidth / 2 : -doorWidth / 2) + offset;
            return (
              <group key={`rod_${idx}`} position={[0.032, 0, rodZ]}>
                {/* Full-height Galvanized Steel Rod */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.014, 0.014, doorHeight + 0.04, 12]} />
                  <primitive object={materials.lockingRodSteel} attach="material" />
                </mesh>

                {/* Top & Bottom Locking Cams engaging into frame */}
                <mesh position={[0, doorHeight / 2, 0]} castShadow>
                  <boxGeometry args={[0.04, 0.06, 0.04]} />
                  <primitive object={materials.lockingRodSteel} attach="material" />
                </mesh>
                <mesh position={[0, -doorHeight / 2, 0]} castShadow>
                  <boxGeometry args={[0.04, 0.06, 0.04]} />
                  <primitive object={materials.lockingRodSteel} attach="material" />
                </mesh>

                {/* Door Handle & Keeper at waist height */}
                <group position={[0.025, -0.2, 0]}>
                  {/* Silver Handle Bracket */}
                  <mesh castShadow>
                    <boxGeometry args={[0.03, 0.08, 0.04]} />
                    <primitive object={materials.lockingRodSteel} attach="material" />
                  </mesh>
                  {/* Lever Handle */}
                  <mesh position={[0.02, -0.06, isLeft ? 0.08 : -0.08]} rotation={[0, 0, -0.2]} castShadow>
                    <boxGeometry args={[0.018, 0.22, 0.025]} />
                    <primitive object={materials.lockingRodSteel} attach="material" />
                  </mesh>
                  {/* Grip */}
                  <mesh position={[0.03, -0.12, isLeft ? 0.12 : -0.12]} rotation={[0, 0, -0.2]}>
                    <cylinderGeometry args={[0.016, 0.016, 0.12, 10]} />
                    <primitive object={materials.lockingRodSteel} attach="material" />
                  </mesh>
                </group>

                {/* Guide Brackets */}
                {[-0.6, 0.2, 0.7].map((bY, bIdx) => (
                  <mesh key={`bracket_${bIdx}`} position={[-0.015, bY, 0]}>
                    <boxGeometry args={[0.025, 0.06, 0.045]} />
                    <primitive object={materials.lockingRodSteel} attach="material" />
                  </mesh>
                ))}
              </group>
            );
          })}

          {/* 3x Heavy Container Hinges */}
          {[-doorHeight * 0.4, 0, doorHeight * 0.4].map((hY, hIdx) => (
            <mesh key={`hinge_${hIdx}`} position={[0.02, hY, isLeft ? 0.02 : -0.02]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.08, 12]} />
              <primitive object={materials.lockingRodSteel} attach="material" />
            </mesh>
          ))}
        </group>
      </group>
    );
  };

  // 2. Modern Full-Height Glass Door Leaf (Anthracite aluminum frame, large clear glass, door handle)
  const ContainerGlassDoorLeaf = ({
    isLeft,
    angle,
    yOffset,
  }: {
    isLeft: boolean;
    angle: number;
    yOffset: number;
  }) => {
    const doorWidth = (WIDTH - 0.2) / 2;
    const doorHeight = HEIGHT - 0.26;
    const hingeZ = isLeft ? -WIDTH / 2 + 0.08 : WIDTH / 2 - 0.08;
    const rotationY = isLeft ? angle : -angle;
    const handleSideZ = isLeft ? doorWidth - 0.06 : -doorWidth + 0.06;

    return (
      <group position={[LENGTH / 2 - 0.02, yOffset + 0.13 + doorHeight / 2, hingeZ]}>
        <group rotation={[0, rotationY, 0]}>
          {/* Main Full-Height Glass Pane */}
          <mesh position={[0, 0, isLeft ? doorWidth / 2 : -doorWidth / 2]} receiveShadow>
            <boxGeometry args={[0.025, doorHeight - 0.18, doorWidth - 0.18]} />
            <primitive object={materials.glass} attach="material" />
          </mesh>

          {/* Outer Aluminum Frame (Top, Bottom, Left, Right) */}
          <mesh position={[0, 0, isLeft ? doorWidth / 2 : -doorWidth / 2]}>
            <boxGeometry args={[0.05, doorHeight, 0.08]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>
          <mesh position={[0, 0, isLeft ? doorWidth - 0.04 : -doorWidth + 0.04]}>
            <boxGeometry args={[0.05, doorHeight, 0.08]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>
          <mesh position={[0, doorHeight / 2 - 0.04, isLeft ? doorWidth / 2 : -doorWidth / 2]}>
            <boxGeometry args={[0.05, 0.08, doorWidth]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>
          <mesh position={[0, -doorHeight / 2 + 0.04, isLeft ? doorWidth / 2 : -doorWidth / 2]}>
            <boxGeometry args={[0.05, 0.08, doorWidth]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>

          {/* Rubber perimeter seal */}
          <mesh position={[0, 0, isLeft ? doorWidth / 2 : -doorWidth / 2]}>
            <boxGeometry args={[0.048, doorHeight + 0.02, doorWidth + 0.01]} />
            <primitive object={materials.doorRubberSeal} attach="material" />
          </mesh>

          {/* Door Handle & Key Cylinder Lock on the opening side */}
          <group position={[0.035, -0.05, handleSideZ]}>
            {/* Key lock escutcheon plate */}
            <mesh castShadow>
              <boxGeometry args={[0.015, 0.18, 0.04]} />
              <primitive object={materials.lockingRodSteel} attach="material" />
            </mesh>
            {/* Key cylinder */}
            <mesh position={[0.01, -0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, 0.015, 8]} />
              <meshBasicMaterial color="#0b0f17" />
            </mesh>
            {/* Lever Handle */}
            <group position={[0.01, 0.03, isLeft ? -0.05 : 0.05]}>
              <mesh castShadow>
                <boxGeometry args={[0.012, 0.014, 0.12]} />
                <primitive object={materials.lockingRodSteel} attach="material" />
              </mesh>
            </group>
          </group>

          {/* 3x Slim Aluminum Hinges */}
          {[-doorHeight * 0.4, 0, doorHeight * 0.4].map((hY, hIdx) => (
            <mesh key={`hinge_${hIdx}`} position={[0.02, hY, isLeft ? 0.02 : -0.02]} castShadow>
              <cylinderGeometry args={[0.016, 0.016, 0.08, 12]} />
              <primitive object={materials.windowFrame} attach="material" />
            </mesh>
          ))}
        </group>
      </group>
    );
  };

  // Reusable Panoramic Glass Window Facade Component
  const PanoramicGlassFacade = ({
    posX,
    posY,
    posZ,
    hasSlidingDoor = false,
  }: {
    posX: number;
    posY: number;
    posZ: number;
    hasSlidingDoor?: boolean;
  }) => (
    <group position={[posX, posY, posZ]}>
      {/* Main Glass Pane */}
      <mesh position={[0, 0, 0]} castShadow={false} receiveShadow>
        <boxGeometry args={[2.75, HEIGHT - 0.32, 0.025]} />
        <primitive object={materials.glass} attach="material" />
      </mesh>

      {/* Aluminum Outer Frame */}
      <mesh position={[0, (HEIGHT - 0.32) / 2, 0]}>
        <boxGeometry args={[2.78, 0.06, 0.06]} />
        <primitive object={materials.windowFrame} attach="material" />
      </mesh>
      <mesh position={[0, -(HEIGHT - 0.32) / 2, 0]}>
        <boxGeometry args={[2.78, 0.06, 0.06]} />
        <primitive object={materials.windowFrame} attach="material" />
      </mesh>
      <mesh position={[-1.37, 0, 0]}>
        <boxGeometry args={[0.06, HEIGHT - 0.32, 0.06]} />
        <primitive object={materials.windowFrame} attach="material" />
      </mesh>
      <mesh position={[1.37, 0, 0]}>
        <boxGeometry args={[0.06, HEIGHT - 0.32, 0.06]} />
        <primitive object={materials.windowFrame} attach="material" />
      </mesh>

      {/* Vertical Center Mullion */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.045, HEIGHT - 0.32, 0.05]} />
        <primitive object={materials.windowFrame} attach="material" />
      </mesh>

      {/* Sliding Door Leaf (if enabled on front EG) */}
      {hasSlidingDoor && (
        <group position={[-slidingDoorOpen * 1.15, 0, 0.025]}>
          <mesh position={[0.65, 0, 0]}>
            <boxGeometry args={[1.3, HEIGHT - 0.36, 0.02]} />
            <primitive object={materials.glass} attach="material" />
          </mesh>
          <mesh position={[0.65, 0, 0]}>
            <boxGeometry args={[1.32, HEIGHT - 0.36, 0.035]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>
          <mesh position={[0.05, 0, 0.03]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.7, 12]} />
            <primitive object={materials.lockingRodSteel} attach="material" />
          </mesh>
        </group>
      )}
    </group>
  );

  return (
    <group name="container_glass_and_doors">
      {/* ========================================================= */}
      {/* 1. EG (Ground Floor) Panoramic Glass Facades (Front & Back) */}
      {/* Left side (X from -2.8 to 0.0) is transparent glass on both */}
      {/* ========================================================= */}
      {/* Front EG Glass (Z = +WIDTH/2) with sliding door */}
      <PanoramicGlassFacade
        posX={-1.45}
        posY={0.04 + HEIGHT / 2}
        posZ={WIDTH / 2 - 0.04}
        hasSlidingDoor={true}
      />
      {/* Back EG Glass (Z = -WIDTH/2) */}
      <PanoramicGlassFacade
        posX={-1.45}
        posY={0.04 + HEIGHT / 2}
        posZ={-WIDTH / 2 + 0.04}
      />

      {/* ========================================================= */}
      {/* 2. 1. OG (Upper Floor) Panoramic Glass Facades & Doors     */}
      {/* Right side (X from 0.0 to 2.8) is transparent glass on both*/}
      {/* ========================================================= */}
      {stackMode !== 'single_story' && (
        <group
          position={[
            stackMode === 'cantilever_offset' ? 1.4 : 0,
            stackMode === 'side_by_side' ? -HEIGHT : 0,
            stackMode === 'side_by_side' ? -WIDTH : 0,
          ]}
        >
          {/* Front Upper Glass (Z = +WIDTH/2, Right X > 0) */}
          <PanoramicGlassFacade
            posX={1.45}
            posY={HEIGHT + 0.04 + HEIGHT / 2}
            posZ={WIDTH / 2 - 0.04}
          />
          {/* Back Upper Glass (Z = -WIDTH/2, Right X > 0) */}
          <PanoramicGlassFacade
            posX={1.45}
            posY={HEIGHT + 0.04 + HEIGHT / 2}
            posZ={-WIDTH / 2 + 0.04}
          />

          {/* 1. OG Upper Floor Front Doors: Left is Glass Door, Right is Steel Door */}
          <ContainerGlassDoorLeaf isLeft={true} angle={ogDoorAngle} yOffset={HEIGHT + 0.04} />
          <ContainerSteelDoorLeaf isLeft={false} angle={ogDoorAngle} yOffset={HEIGHT + 0.04} />

          {/* 1. OG Upper Floor Rear Doors (X = -LENGTH/2): Left is Steel Door, Right is Glass Door */}
          <group rotation={[0, Math.PI, 0]}>
            <ContainerSteelDoorLeaf isLeft={true} angle={ogDoorAngle} yOffset={HEIGHT + 0.04} />
            <ContainerGlassDoorLeaf isLeft={false} angle={ogDoorAngle} yOffset={HEIGHT + 0.04} />
          </group>
        </group>
      )}

      {/* ========================================================= */}
      {/* 3. EG Container Front Doors (X = +LENGTH/2)               */}
      {/* EG Front: Left is Steel Door, Right is Glass Door         */}
      {/* ========================================================= */}
      <ContainerSteelDoorLeaf isLeft={true} angle={egDoorAngle} yOffset={0.04} />
      <ContainerGlassDoorLeaf isLeft={false} angle={egDoorAngle} yOffset={0.04} />

      {/* ========================================================= */}
      {/* 4. EG Container Rear Doors (X = -LENGTH/2)                */}
      {/* EG Rear: Left is Glass Door, Right is Steel Door          */}
      {/* ========================================================= */}
      <group rotation={[0, Math.PI, 0]}>
        <ContainerGlassDoorLeaf isLeft={true} angle={egDoorAngle} yOffset={0.04} />
        <ContainerSteelDoorLeaf isLeft={false} angle={egDoorAngle} yOffset={0.04} />
      </group>
    </group>
  );
};
