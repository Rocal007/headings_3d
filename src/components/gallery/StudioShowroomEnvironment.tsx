import React, { useMemo } from 'react';
import * as THREE from 'three';
import { type GalleryEnvironmentId, GALLERY_ENVIRONMENTS } from '../../types/galleryTypes';

interface StudioShowroomEnvironmentProps {
  environmentId: GalleryEnvironmentId;
}

export const StudioShowroomEnvironment: React.FC<StudioShowroomEnvironmentProps> = ({
  environmentId,
}) => {
  const envConfig = GALLERY_ENVIRONMENTS[environmentId] || GALLERY_ENVIRONMENTS.dark_studio;
  const isDark = envConfig.isDark;

  const materials = useMemo(() => {
    // Main Studio Floor Plane (Endlos-Studioboden)
    const floorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(envConfig.groundColor),
      roughness: isDark ? 0.45 : 0.55,
      metalness: isDark ? 0.4 : 0.1,
    });

    // Turntable Platform (Ø 18m Drehteller wie LKW & Jeep)
    const turntableMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDark ? '#10151d' : '#ede5d8'),
      roughness: 0.32,
      metalness: isDark ? 0.7 : 0.2,
    });

    // Glowing Concentric Accent Ring (Cyan/Amber Neon Glow)
    const ringColor = isDark ? '#00dcff' : '#d97706';
    const neonRingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(ringColor),
      emissive: new THREE.Color(ringColor),
      emissiveIntensity: isDark ? 0.8 : 0.4,
      roughness: 0.2,
      metalness: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Inner Subtle Concentric Ring
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: isDark ? '#223244' : '#b8a994',
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    return {
      floorMat,
      turntableMat,
      neonRingMat,
      innerRingMat,
    };
  }, [envConfig.groundColor, isDark]);

  return (
    <group name="studio_showroom_environment">
      {/* ========================================================= */}
      {/* 1. Large Studio Room Floor                                */}
      {/* ========================================================= */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.041, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <primitive object={materials.floorMat} attach="material" />
      </mesh>

      {/* ========================================================= */}
      {/* 2. Showroom Turntable Platform (Ø 18m wie bei LKW & Jeep) */}
      {/* ========================================================= */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[9.0, 9.2, 0.08, 64]} />
        <primitive object={materials.turntableMat} attach="material" />
      </mesh>

      {/* Glowing Neon Outer Ring on Turntable Edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[8.95, 9.15, 64]} />
        <primitive object={materials.neonRingMat} attach="material" />
      </mesh>

      {/* Inner Concentric Accent Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[4.5, 4.54, 48]} />
        <primitive object={materials.innerRingMat} attach="material" />
      </mesh>

      {/* Secondary Inner Accent Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[2.2, 2.23, 48]} />
        <primitive object={materials.innerRingMat} attach="material" />
      </mesh>
    </group>
  );
};
