import React, { useMemo } from 'react';
import * as THREE from 'three';
import { type GalleryEnvironmentId, GALLERY_ENVIRONMENTS } from '../../types/galleryTypes';

interface VotivkircheEnvironmentProps {
  environmentId: GalleryEnvironmentId;
  showVotivkirche: boolean;
  showPedestrians: boolean;
}

export const VotivkircheEnvironment: React.FC<VotivkircheEnvironmentProps> = ({
  environmentId,
  showVotivkirche,
  showPedestrians,
}) => {
  const envConfig = GALLERY_ENVIRONMENTS[environmentId] || GALLERY_ENVIRONMENTS.dark_studio;
  const isNight = envConfig.isDark;

  // PBR Materials for Cathedral Stone, Pavement, Trees, Lanterns
  const materials = useMemo(() => {
    // Warm Vienna Sandstone / Limestone Masonry (Kalksandstein der Votivkirche)
    const cathedralStone = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isNight ? '#334155' : '#d6c7a1'),
      roughness: 0.88,
      metalness: 0.05,
    });

    // Darker Stone Trim / Tracery / Arches
    const stoneTrim = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isNight ? '#1e293b' : '#b8a67d'),
      roughness: 0.85,
      metalness: 0.08,
    });

    // Stained Glass / Gothic Window Glass (Deep warm amber & blue)
    const stainedGlass = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isNight ? '#f59e0b' : '#1e3a8a'),
      emissive: new THREE.Color(isNight ? '#d97706' : '#000000'),
      emissiveIntensity: isNight ? 0.6 : 0,
      roughness: 0.2,
      metalness: 0.3,
    });

    // Pavement Flagstones (Porphyr & Granit-Platten)
    const plazaPavement = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isNight ? '#1e293b' : '#a8a29e'),
      roughness: 0.75,
      metalness: 0.1,
    });

    // Park Lawn Grass
    const parkGrass = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isNight ? '#064e3b' : '#22c55e'),
      roughness: 0.9,
      metalness: 0.0,
    });

    // Tree Foliage
    const treeLeaves = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isNight ? '#065f46' : '#15803d'),
      roughness: 0.85,
      metalness: 0.0,
    });

    const treeBark = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#451a03'),
      roughness: 0.9,
      metalness: 0.05,
    });

    // Classic Viennese Street Lantern Cast Iron
    const lanternIron = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.4,
      metalness: 0.85,
    });

    const pedestrianClothes = [
      new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#059669', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7 }),
    ];

    return {
      cathedralStone,
      stoneTrim,
      stainedGlass,
      plazaPavement,
      parkGrass,
      treeLeaves,
      treeBark,
      lanternIron,
      pedestrianClothes,
    };
  }, [isNight]);

  // Procedural Gothic Spire / Buttress Element (Wiener Votivkirche Neugotik)
  const GothicSpire = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Octagonal Base Tower */}
      <mesh position={[0, 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.4, 3.2, 16, 8]} />
        <primitive object={materials.cathedralStone} attach="material" />
      </mesh>
      {/* Belfry with Gothic Arched Windows */}
      <mesh position={[0, 18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.0, 2.4, 8, 8]} />
        <primitive object={materials.stoneTrim} attach="material" />
      </mesh>
      {/* Tall Pierced Tracery Spire Pinnacle (Fiale / Turmspitze) */}
      <mesh position={[0, 29, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.9, 16, 8]} />
        <primitive object={materials.cathedralStone} attach="material" />
      </mesh>
      {/* Cross Finial at top */}
      <mesh position={[0, 37.5, 0]}>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <primitive object={materials.stoneTrim} attach="material" />
      </mesh>
    </group>
  );

  // Gothic Lancet Window (Spitzbogenfenster mit Maßwerk)
  const GothicWindow = ({ position, width = 1.8, height = 4.2 }: { position: [number, number, number]; width?: number; height?: number }) => (
    <group position={position}>
      {/* Stone Arch Frame */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[width + 0.3, height + 0.4, 0.15]} />
        <primitive object={materials.stoneTrim} attach="material" />
      </mesh>
      {/* Stained Glass Inset */}
      <mesh position={[0, height / 2, 0.08]}>
        <planeGeometry args={[width, height]} />
        <primitive object={materials.stainedGlass} attach="material" />
      </mesh>
      {/* Pointed Arch Peak */}
      <mesh position={[0, height + 0.3, 0.08]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[width * 0.7, width * 0.7]} />
        <primitive object={materials.stainedGlass} attach="material" />
      </mesh>
    </group>
  );

  // Votivkirche Cathedral Facade Assembly
  const VotivkircheCathedral = useMemo(() => {
    if (!showVotivkirche) return null;

    // Placed behind the container (Z negative, e.g. Z = -16, angled like in photo)
    return (
      <group position={[-5.5, 0, -14.5]} rotation={[0, 0.15, 0]}>
        {/* Main Nave Lower Facade (Hauptportal & Langhaus) */}
        <mesh position={[0, 7, 0]} castShadow receiveShadow>
          <boxGeometry args={[22, 14, 10]} />
          <primitive object={materials.cathedralStone} attach="material" />
        </mesh>

        {/* Central Gothic Gable (Zwerchgiebel) */}
        <mesh position={[0, 16.5, 0.1]} rotation={[0, 0, 0]} castShadow receiveShadow>
          <coneGeometry args={[7, 7, 4]} />
          <primitive object={materials.cathedralStone} attach="material" />
        </mesh>

        {/* Grand Gothic Rose Window (Fensterrose) */}
        <group position={[0, 12.5, 5.1]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.8, 2.8, 0.2, 24]} />
            <primitive object={materials.stoneTrim} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0.12]}>
            <circleGeometry args={[2.5, 24]} />
            <primitive object={materials.stainedGlass} attach="material" />
          </mesh>
        </group>

        {/* 4x Majestic Lancet Windows along facade */}
        <GothicWindow position={[-5.8, 4.5, 5.1]} width={1.8} height={5.5} />
        <GothicWindow position={[-2.4, 4.5, 5.1]} width={1.8} height={5.5} />
        <GothicWindow position={[2.4, 4.5, 5.1]} width={1.8} height={5.5} />
        <GothicWindow position={[5.8, 4.5, 5.1]} width={1.8} height={5.5} />

        {/* Flying Buttresses & Pillars (Strebepfeiler) */}
        {[-8, -4, 0, 4, 8].map((x, i) => (
          <mesh key={`buttress_${i}`} position={[x, 7, 5.5]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 14.5, 1.2]} />
            <primitive object={materials.stoneTrim} attach="material" />
          </mesh>
        ))}

        {/* Left Neo-Gothic Twin Spire Tower */}
        <GothicSpire position={[-9.5, 0, 1.5]} />

        {/* Right Neo-Gothic Twin Spire Tower */}
        <GothicSpire position={[9.5, 0, 1.5]} />

        {/* Decorative Gothic Pinnacles (Fialen) */}
        {[-8, -4, 4, 8].map((x, i) => (
          <mesh key={`pinnacle_${i}`} position={[x, 14.8, 5.5]} castShadow>
            <coneGeometry args={[0.4, 2.5, 6]} />
            <primitive object={materials.stoneTrim} attach="material" />
          </mesh>
        ))}
      </group>
    );
  }, [showVotivkirche, environmentId, materials]);

  // Park Trees with Organic Canopy
  const ParkTree = ({ position, scale = 1.0 }: { position: [number, number, number]; scale?: number }) => (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.35, 4.4, 10]} />
        <primitive object={materials.treeBark} attach="material" />
      </mesh>
      {/* Foliage Spheres Cluster */}
      <mesh position={[0, 4.8, 0]} castShadow>
        <sphereGeometry args={[2.2, 12, 10]} />
        <primitive object={materials.treeLeaves} attach="material" />
      </mesh>
      <mesh position={[0.8, 5.6, 0.4]} castShadow>
        <sphereGeometry args={[1.6, 10, 8]} />
        <primitive object={materials.treeLeaves} attach="material" />
      </mesh>
      <mesh position={[-0.7, 5.2, -0.5]} castShadow>
        <sphereGeometry args={[1.8, 10, 8]} />
        <primitive object={materials.treeLeaves} attach="material" />
      </mesh>
    </group>
  );

  // Viennese Park Lantern (Klassische Parklaterne)
  const ParkLantern = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Base & Pole */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.12, 3.6, 12]} />
        <primitive object={materials.lanternIron} attach="material" />
      </mesh>
      {/* Lantern Housing */}
      <mesh position={[0, 3.7, 0]} castShadow>
        <octahedronGeometry args={[0.25, 0]} />
        <primitive object={materials.lanternIron} attach="material" />
      </mesh>
      {/* Glowing Lamp */}
      <mesh position={[0, 3.7, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      {/* Warm Ambient Lantern Light */}
      <pointLight position={[0, 3.8, 0]} intensity={isNight ? 1.5 : 0.2} distance={6} color="#fef08a" />
    </group>
  );

  return (
    <group name="votivkirche_environment">
      {/* ========================================================= */}
      {/* 1. Ground Plaza Pavement & Park Lawns                     */}
      {/* ========================================================= */}
      {/* Main Flagstone Paved Area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <primitive object={materials.plazaPavement} attach="material" />
      </mesh>

      {/* Pavement Joint Grid Overlay */}
      <gridHelper
        args={[48, 48, '#475569', '#334155']}
        position={[0, 0.001, 0]}
      />

      {/* Green Lawn Park Borders (Sigmund-Freud-Park Grünstreifen) */}
      <mesh position={[7.5, 0.02, 3.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 18]} />
        <primitive object={materials.parkGrass} attach="material" />
      </mesh>
      <mesh position={[-11.5, 0.02, 4.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 20]} />
        <primitive object={materials.parkGrass} attach="material" />
      </mesh>

      {/* ========================================================= */}
      {/* 2. Votivkirche Gothic Cathedral Backdrop                  */}
      {/* ========================================================= */}
      {VotivkircheCathedral}

      {/* ========================================================= */}
      {/* 3. Park Trees & Atmosphere                                */}
      {/* ========================================================= */}
      {showVotivkirche && (
        <>
          <ParkTree position={[8.5, 0, 1.5]} scale={1.25} />
          <ParkTree position={[9.2, 0, 7.5]} scale={1.1} />
          <ParkTree position={[-8.5, 0, -4.5]} scale={1.3} />
          <ParkTree position={[-12.0, 0, 2.5]} scale={1.15} />

          {/* Park Lanterns */}
          <ParkLantern position={[5.2, 0, 4.8]} />
          <ParkLantern position={[-5.8, 0, 5.2]} />
        </>
      )}

      {/* ========================================================= */}
      {/* 4. Pedestrian Visitors (Passanten & Kunstinteressierte)    */}
      {/* ========================================================= */}
      {showPedestrians && showVotivkirche && (
        <group>
          {/* Visitor 1 (Viewing lower gallery) */}
          <group position={[3.2, 0, 3.2]} rotation={[0, -0.4, 0]}>
            <mesh position={[0, 0.85, 0]} castShadow>
              <capsuleGeometry args={[0.18, 1.2, 4, 8]} />
              <primitive object={materials.pedestrianClothes[0]} attach="material" />
            </mesh>
            <mesh position={[0, 1.65, 0]} castShadow>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial color="#fbcfe8" roughness={0.6} />
            </mesh>
          </group>

          {/* Visitor 2 (Walking by) */}
          <group position={[-2.8, 0, 4.5]} rotation={[0, 0.8, 0]}>
            <mesh position={[0, 0.85, 0]} castShadow>
              <capsuleGeometry args={[0.17, 1.15, 4, 8]} />
              <primitive object={materials.pedestrianClothes[1]} attach="material" />
            </mesh>
            <mesh position={[0, 1.62, 0]} castShadow>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial color="#fed7aa" roughness={0.6} />
            </mesh>
          </group>

          {/* Visitor 3 (Standing at church square) */}
          <group position={[0.5, 0, 6.2]} rotation={[0, -0.2, 0]}>
            <mesh position={[0, 0.9, 0]} castShadow>
              <capsuleGeometry args={[0.19, 1.25, 4, 8]} />
              <primitive object={materials.pedestrianClothes[2]} attach="material" />
            </mesh>
            <mesh position={[0, 1.72, 0]} castShadow>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial color="#fbcfe8" roughness={0.6} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};
