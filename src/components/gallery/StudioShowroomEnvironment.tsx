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
      color: new THREE.Color(isDark ? '#141a23' : '#e2e8f0'),
      roughness: isDark ? 0.45 : 0.6,
      metalness: isDark ? 0.4 : 0.1,
    });

    // Turntable Platform (Ø 18m Drehteller wie LKW & Jeep)
    const turntableMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDark ? '#10151d' : '#cbd5e1'),
      roughness: 0.32,
      metalness: isDark ? 0.7 : 0.2,
    });

    // Glowing Concentric Accent Ring (Cyan/Blue Neon Glow)
    const neonRingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDark ? '#00dcff' : '#0284c7'),
      emissive: new THREE.Color(isDark ? '#00dcff' : '#0284c7'),
      emissiveIntensity: isDark ? 0.8 : 0.3,
      roughness: 0.2,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });

    // Inner Subtle Concentric Ring
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: isDark ? '#223244' : '#94a3b8',
      side: THREE.DoubleSide,
    });

    // Studio Overhead Softbox Lights
    const softboxGlow = new THREE.MeshBasicMaterial({
      color: '#ffffff',
    });
    const softboxHousing = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.5,
      metalness: 0.8,
    });

    return {
      floorMat,
      turntableMat,
      neonRingMat,
      innerRingMat,
      softboxGlow,
      softboxHousing,
    };
  }, [isDark]);

  return (
    <group name="studio_showroom_environment">
      {/* ========================================================= */}
      {/* 1. Large Studio Room Floor                                */}
      {/* ========================================================= */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <primitive object={materials.floorMat} attach="material" />
      </mesh>

      {/* ========================================================= */}
      {/* 2. Showroom Turntable Platform (Ø 18m wie bei LKW & Jeep) */}
      {/* ========================================================= */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[9.0, 9.2, 0.04, 64]} />
        <primitive object={materials.turntableMat} attach="material" />
      </mesh>

      {/* Glowing Neon Outer Ring on Turntable Edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]}>
        <ringGeometry args={[8.95, 9.15, 64]} />
        <primitive object={materials.neonRingMat} attach="material" />
      </mesh>

      {/* Inner Concentric Accent Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]}>
        <ringGeometry args={[4.5, 4.54, 48]} />
        <primitive object={materials.innerRingMat} attach="material" />
      </mesh>

      {/* Secondary Inner Accent Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]}>
        <ringGeometry args={[2.2, 2.23, 48]} />
        <primitive object={materials.innerRingMat} attach="material" />
      </mesh>

      {/* ========================================================= */}
      {/* 3. Studio Ceiling Softbox Light Banks (Clean Look)        */}
      {/* ========================================================= */}
      {/* Softbox Left Overhead */}
      <group position={[-6.0, 11.5, 5.0]} rotation={[0.3, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[4.5, 0.1, 2.2]} />
          <primitive object={materials.softboxHousing} attach="material" />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <planeGeometry args={[4.4, 2.1]} />
          <primitive object={materials.softboxGlow} attach="material" />
        </mesh>
      </group>

      {/* Softbox Right Overhead */}
      <group position={[6.0, 11.5, 5.0]} rotation={[0.3, -0.4, 0]}>
        <mesh>
          <boxGeometry args={[4.5, 0.1, 2.2]} />
          <primitive object={materials.softboxHousing} attach="material" />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <planeGeometry args={[4.4, 2.1]} />
          <primitive object={materials.softboxGlow} attach="material" />
        </mesh>
      </group>
    </group>
  );
};
