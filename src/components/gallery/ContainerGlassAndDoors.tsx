import React, { useMemo } from 'react';
import * as THREE from 'three';
import { type ContainerStackMode } from '../../types/galleryTypes';

interface ContainerGlassAndDoorsProps {
  egDoorsOpen: number; // 0.0 to 1.0 (0 deg to 150 deg)
  ogDoorsOpen: number; // 0.0 to 1.0
  slidingDoorOpen?: number;
  stackMode?: ContainerStackMode;
}

const LENGTH = 6.058;
const WIDTH = 2.438;
const HEIGHT = 2.591;

export const ContainerGlassAndDoors: React.FC<ContainerGlassAndDoorsProps> = ({
  egDoorsOpen,
  ogDoorsOpen,
  stackMode = 'double_stack',
}) => {
  // PBR Materials for Architectural Glass, Aluminum Frames, Door Hardware
  const materials = useMemo(() => {
    // Ultra-clear architectural low-iron glass with subtle reflections and zero Z-fighting
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#dbeafe'),
      transmission: 0.96,
      opacity: 0.25,
      transparent: true,
      depthWrite: false, // Prevents depth-buffer sorting chatter and reflection flicker
      roughness: 0.04,
      metalness: 0.05,
      ior: 1.52,
      thickness: 0.015,
      reflectivity: 0.5,
      clearcoat: 0.8,
      clearcoatRoughness: 0.04,
      side: THREE.FrontSide, // For 3D volumetric glass geometries
    });

    const windowFrame = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'), // Anthracite powder-coated aluminum
      roughness: 0.35,
      metalness: 0.8,
    });

    const lockingRodSteel = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e2e8f0'), // Polished stainless steel hardware
      roughness: 0.2,
      metalness: 0.95,
    });

    return {
      glass,
      windowFrame,
      lockingRodSteel,
    };
  }, []);

  const egDoorAngle = egDoorsOpen * (Math.PI * 0.85); // bis zu ~153 Grad nach außen aufklappbar
  const ogDoorAngle = ogDoorsOpen * (Math.PI * 0.85);

  // Modern Full-Height Glass Door Leaf with full ISO Container Locking Hardware (PDF S. 5, S. 6)
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
    const handleSideZ = isLeft ? doorWidth - 0.07 : -doorWidth + 0.07;
    const rod1Z = isLeft ? doorWidth - 0.10 : -doorWidth + 0.10;
    const rod2Z = isLeft ? doorWidth - 0.26 : -doorWidth + 0.26;

    return (
      <group position={[LENGTH / 2 - 0.02, yOffset + 0.13 + doorHeight / 2, hingeZ]}>
        <group rotation={[0, rotationY, 0]}>
          {/* Main Full-Height Low-Iron Clear Glass Pane */}
          <mesh position={[0, 0, isLeft ? doorWidth / 2 : -doorWidth / 2]} receiveShadow>
            <boxGeometry args={[0.015, doorHeight - 0.08, doorWidth - 0.08]} />
            <primitive object={materials.glass} attach="material" />
          </mesh>

          {/* Outer Aluminum Frame (Hinge Side, Meeting Edge, Top, Bottom) */}
          <mesh position={[0, 0, isLeft ? 0.03 : -0.03]}>
            <boxGeometry args={[0.05, doorHeight, 0.06]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>
          <mesh position={[0, 0, isLeft ? doorWidth - 0.03 : -doorWidth + 0.03]}>
            <boxGeometry args={[0.05, doorHeight, 0.06]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>
          <mesh position={[0, doorHeight / 2 - 0.03, isLeft ? doorWidth / 2 : -doorWidth / 2]}>
            <boxGeometry args={[0.05, 0.06, doorWidth]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>
          <mesh position={[0, -doorHeight / 2 + 0.03, isLeft ? doorWidth / 2 : -doorWidth / 2]}>
            <boxGeometry args={[0.05, 0.06, doorWidth]} />
            <primitive object={materials.windowFrame} attach="material" />
          </mesh>

          {/* ========================================================= */}
          {/* ISO Container Vertical Locking Bars (Drehstangen - PDF S. 5) */}
          {/* ========================================================= */}
          {[rod1Z, rod2Z].map((rodZ, rIdx) => (
            <group key={`locking_rod_${rIdx}`} position={[0.038, 0, rodZ]}>
              {/* Vertical Steel Tube Bar */}
              <mesh castShadow>
                <cylinderGeometry args={[0.012, 0.012, doorHeight + 0.04, 12]} />
                <primitive object={materials.lockingRodSteel} attach="material" />
              </mesh>

              {/* 3x Guide Bracket Bearings along height */}
              {[-doorHeight * 0.38, 0, doorHeight * 0.38].map((bY, bIdx) => (
                <mesh key={`bracket_${bIdx}`} position={[-0.012, bY, 0]} castShadow>
                  <boxGeometry args={[0.025, 0.04, 0.04]} />
                  <primitive object={materials.windowFrame} attach="material" />
                </mesh>
              ))}

              {/* Top Cam Lock (Schließnocke oben) */}
              <mesh position={[0, (doorHeight + 0.04) / 2 - 0.01, 0]} castShadow>
                <boxGeometry args={[0.032, 0.035, 0.045]} />
                <primitive object={materials.lockingRodSteel} attach="material" />
              </mesh>

              {/* Bottom Cam Lock (Schließnocke unten) */}
              <mesh position={[0, -(doorHeight + 0.04) / 2 + 0.01, 0]} castShadow>
                <boxGeometry args={[0.032, 0.035, 0.045]} />
                <primitive object={materials.lockingRodSteel} attach="material" />
              </mesh>

              {/* Horizontal Locking Lever Handle (Spannhebel - PDF S. 5) */}
              <group position={[0.015, -0.08 + rIdx * 0.12, 0]}>
                {/* Hinge mount bracket */}
                <mesh castShadow>
                  <boxGeometry args={[0.02, 0.03, 0.03]} />
                  <primitive object={materials.windowFrame} attach="material" />
                </mesh>
                {/* Steel Handle Lever */}
                <mesh position={[0.01, -0.06, isLeft ? -0.08 : 0.08]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <boxGeometry args={[0.012, 0.018, 0.18]} />
                  <primitive object={materials.lockingRodSteel} attach="material" />
                </mesh>
                {/* Vinyl / Rubber Grip Sleeve */}
                <mesh position={[0.01, -0.12, isLeft ? -0.08 : 0.08]}>
                  <boxGeometry args={[0.016, 0.022, 0.08]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.7} />
                </mesh>
              </group>
            </group>
          ))}

          {/* Door Handle & Key Cylinder Lock on the meeting edge */}
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
            {/* Exterior Lever Handle */}
            <group position={[0.01, 0.03, isLeft ? -0.05 : 0.05]}>
              <mesh castShadow>
                <boxGeometry args={[0.012, 0.014, 0.12]} />
                <primitive object={materials.lockingRodSteel} attach="material" />
              </mesh>
            </group>
            {/* Interior Lever Handle */}
            <group position={[-0.07, 0.03, isLeft ? -0.05 : 0.05]}>
              <mesh castShadow>
                <boxGeometry args={[0.012, 0.014, 0.12]} />
                <primitive object={materials.lockingRodSteel} attach="material" />
              </mesh>
            </group>
          </group>

          {/* 4x Heavy-Duty Steel Hinges connecting to Corner Post (PDF S. 5, S. 6) */}
          {[-doorHeight * 0.42, -doorHeight * 0.14, doorHeight * 0.14, doorHeight * 0.42].map((hY, hIdx) => (
            <group key={`hinge_${hIdx}`} position={[0.025, hY, isLeft ? 0.02 : -0.02]}>
              {/* Hinge Pin Barrel */}
              <mesh castShadow>
                <cylinderGeometry args={[0.018, 0.018, 0.09, 12]} />
                <primitive object={materials.lockingRodSteel} attach="material" />
              </mesh>
              {/* Corner Post Mounting Flange */}
              <mesh position={[-0.02, 0, isLeft ? -0.02 : 0.02]} castShadow>
                <boxGeometry args={[0.035, 0.06, 0.025]} />
                <primitive object={materials.windowFrame} attach="material" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    );
  };

  // Reusable Panoramic Glass Window Facade Component (Festverglasung ohne Seitentüren)
  const PanoramicGlassFacade = ({
    posX,
    posY,
    posZ,
  }: {
    posX: number;
    posY: number;
    posZ: number;
  }) => {
    const paneWidth = (2.74 - 0.045) / 2; // Separate left & right panes flanking center mullion
    const paneHeight = HEIGHT - 0.38;

    return (
      <group position={[posX, posY, posZ]}>
        {/* Left Glass Pane */}
        <mesh position={[-paneWidth / 2 - 0.023, 0, 0]} castShadow={false} receiveShadow>
          <boxGeometry args={[paneWidth, paneHeight, 0.015]} />
          <primitive object={materials.glass} attach="material" />
        </mesh>

        {/* Right Glass Pane */}
        <mesh position={[paneWidth / 2 + 0.023, 0, 0]} castShadow={false} receiveShadow>
          <boxGeometry args={[paneWidth, paneHeight, 0.015]} />
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

        {/* Vertical Center Mullion (No mesh collision with glass) */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.045, HEIGHT - 0.32, 0.05]} />
          <primitive object={materials.windowFrame} attach="material" />
        </mesh>
      </group>
    );
  };

  return (
    <group name="container_glass_and_doors">
      {/* ========================================================= */}
      {/* 1. EG (Ground Floor) Panoramic Glass Facades (Staggered)   */}
      {/* Front EG Glass is at left (X < 0), Back EG Glass is at right (X > 0) */}
      {/* Keine Seitentüren - Reine Festverglasung                  */}
      {/* ========================================================= */}
      {/* Front EG Glass (Z = +WIDTH/2, Left X < 0) */}
      <PanoramicGlassFacade
        posX={-1.45}
        posY={0.04 + HEIGHT / 2}
        posZ={WIDTH / 2 - 0.04}
      />
      {/* Back EG Glass (Z = -WIDTH/2, Right X > 0, opposite solid steel front) */}
      <PanoramicGlassFacade
        posX={1.45}
        posY={0.04 + HEIGHT / 2}
        posZ={-WIDTH / 2 + 0.04}
      />

      {/* ========================================================= */}
      {/* 2. 1. OG (Upper Floor) Panoramic Glass Facades (Staggered) */}
      {/* Front 1. OG Glass is at right (X > 0), Back 1. OG Glass is at left (X < 0) */}
      {/* ========================================================= */}
      {stackMode !== 'single_story' && (
        <group
          position={[
            stackMode === 'cantilever_offset' ? 1.4 : 0,
            stackMode === 'side_by_side' ? -HEIGHT : 0,
            stackMode === 'side_by_side' ? -WIDTH : 0,
          ]}
        >
          {/* Front Upper Glass (Z = +WIDTH/2, Right X > 0, opposite solid steel back) */}
          <PanoramicGlassFacade
            posX={1.45}
            posY={HEIGHT + 0.04 + HEIGHT / 2}
            posZ={WIDTH / 2 - 0.04}
          />
          {/* Back Upper Glass (Z = -WIDTH/2, Left X < 0, opposite solid steel front) */}
          <PanoramicGlassFacade
            posX={-1.45}
            posY={HEIGHT + 0.04 + HEIGHT / 2}
            posZ={-WIDTH / 2 + 0.04}
          />

          {/* 1. OG Upper Floor Front Doors (X = +LENGTH/2): Einzelne versetzte Glastür (Front Z > 0) */}
          <ContainerGlassDoorLeaf isLeft={false} angle={ogDoorAngle} yOffset={HEIGHT + 0.04} />

          {/* 1. OG Upper Floor Rear Doors (X = -LENGTH/2): Einzelne versetzte Glastür (Back Z < 0) */}
          <group rotation={[0, Math.PI, 0]}>
            <ContainerGlassDoorLeaf isLeft={false} angle={ogDoorAngle} yOffset={HEIGHT + 0.04} />
          </group>
        </group>
      )}

      {/* ========================================================= */}
      {/* 3. EG Container Front End Door (X = +LENGTH/2)            */}
      {/* Einzelne versetzte Glastür (Back Z < 0)                   */}
      {/* ========================================================= */}
      <ContainerGlassDoorLeaf isLeft={true} angle={egDoorAngle} yOffset={0.04} />

      {/* ========================================================= */}
      {/* 4. EG Container Rear End Door (X = -LENGTH/2)             */}
      {/* Einzelne versetzte Glastür (Front Z > 0)                  */}
      {/* ========================================================= */}
      <group rotation={[0, Math.PI, 0]}>
        <ContainerGlassDoorLeaf isLeft={true} angle={egDoorAngle} yOffset={0.04} />
      </group>
    </group>
  );
};
