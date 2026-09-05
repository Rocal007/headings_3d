import React, { useMemo } from 'react';
import * as THREE from 'three';
import { type ContainerStackMode } from '../../types/galleryTypes';

interface ContainerInteriorProps {
  stackMode?: ContainerStackMode;
}

const LENGTH = 6.058;
const WIDTH = 2.438;
const HEIGHT = 2.591;
const WALL_THICKNESS = 0.08;

export const ContainerInterior: React.FC<ContainerInteriorProps> = ({
  stackMode = 'double_stack',
}) => {
  const materials = useMemo(() => {
    // Ultra-clean white gallery plaster/drywall with subtle warm reflection
    const galleryWall = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8fafc'),
      roughness: 0.85,
      metalness: 0.05,
    });

    // Polished architectural concrete screed / hardwood floor
    const galleryFloor = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e2e8f0'),
      roughness: 0.35,
      metalness: 0.15,
    });

    // Clean white ceiling
    const galleryCeiling = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.9,
      metalness: 0.0,
    });

    // Display Pedestals / White Cubes
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f1f5f9'),
      roughness: 0.4,
      metalness: 0.1,
    });

    // Light track rails on ceiling
    const lightTrackMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#334155'),
      roughness: 0.3,
      metalness: 0.85,
    });

    return {
      galleryWall,
      galleryFloor,
      galleryCeiling,
      pedestalMat,
      lightTrackMat,
    };
  }, []);

  // Single Floor Gallery Interior Shell (gegengleiche open room with solid walls only at steel sections)
  const InteriorFloor = ({ yOffset, isUpper = false }: { yOffset: number; isUpper?: boolean }) => {
    const innerL = LENGTH - WALL_THICKNESS * 2 - 0.1;
    const innerW = WIDTH - WALL_THICKNESS * 2 - 0.1;
    const innerH = HEIGHT - 0.2;
    const floorY = yOffset + 0.06;
    const ceilingY = yOffset + HEIGHT - 0.06;
    const midY = yOffset + HEIGHT / 2;

    const solidWallHalfL = innerL / 2;
    // For EG (!isUpper): Solid steel is at X > 0 (right half). Left half is open glass.
    // For 1. OG (isUpper): Solid steel is at X < 0 (left half). Right half is open glass.
    const wallPosX = isUpper ? -solidWallHalfL / 2 : solidWallHalfL / 2;

    return (
      <group>
        {/* Continuous Floor Slab */}
        <mesh position={[0, floorY, 0]} receiveShadow>
          <boxGeometry args={[innerL, 0.03, innerW]} />
          <primitive object={materials.galleryFloor} attach="material" />
        </mesh>

        {/* Continuous Ceiling Slab */}
        <mesh position={[0, ceilingY, 0]} receiveShadow>
          <boxGeometry args={[innerL, 0.03, innerW]} />
          <primitive object={materials.galleryCeiling} attach="material" />
        </mesh>

        {/* Back Interior Wall - Only behind the corrugated steel half! */}
        <mesh position={[wallPosX, midY, -innerW / 2 + 0.02]} receiveShadow>
          <boxGeometry args={[solidWallHalfL, innerH, 0.03]} />
          <primitive object={materials.galleryWall} attach="material" />
        </mesh>
      </group>
    );
  };

  const showUpper = stackMode !== 'single_story';
  const ogOffsetX = stackMode === 'cantilever_offset' ? 1.4 : 0;
  const ogOffsetY = stackMode === 'side_by_side' ? 0 : HEIGHT;
  const ogOffsetZ = stackMode === 'side_by_side' ? -WIDTH : 0;

  return (
    <group name="container_gallery_interior">
      {/* EG Ground Floor Interior (Open Container Cube with Glass Transparency) */}
      <InteriorFloor yOffset={0.04} isUpper={false} />

      {/* 1. OG Upper Floor Interior (Open Container Cube with Glass Transparency) */}
      {showUpper && (
        <group position={[ogOffsetX, 0, ogOffsetZ]}>
          <InteriorFloor yOffset={ogOffsetY + 0.04} isUpper={true} />
        </group>
      )}
    </group>
  );
};
