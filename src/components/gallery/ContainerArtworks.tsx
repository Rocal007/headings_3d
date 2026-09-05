import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  ART_COLLECTIONS,
  type ArtExhibitionId,
  type ArtItem,
  type ContainerStackMode,
} from '../../types/galleryTypes';

interface ContainerArtworksProps {
  exhibitionId: ArtExhibitionId;
  selectedArtworkId: string | null;
  onSelectArtwork: (id: string | null) => void;
  spotlightIntensity: number;
  stackMode?: ContainerStackMode;
  showArtworks?: boolean;
}

// Procedural Canvas Texture Generator for Modern / Abstract / Cine Paintings
function generateArtworkCanvasTexture(item: ArtItem): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base background
  ctx.fillStyle = item.primaryColor;
  ctx.fillRect(0, 0, 1024, 768);

  if (item.patternType === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, 1024, 768);
    grad.addColorStop(0, item.primaryColor);
    grad.addColorStop(0.45, item.accentColor);
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 768);

    // Subtle atmospheric grain & brush strokes
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 1024,
        Math.random() * 768,
        Math.random() * 240 + 60,
        Math.random() * 120 + 20,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else if (item.patternType === 'geometric') {
    // Bauhaus style geometric blocks and intersecting lines
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1024, 768);

    ctx.fillStyle = item.primaryColor;
    ctx.fillRect(80, 80, 420, 360);

    ctx.fillStyle = item.accentColor;
    ctx.beginPath();
    ctx.arc(680, 480, 200, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(40, 600);
    ctx.lineTo(980, 200);
    ctx.stroke();

    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.fillRect(360, 240, 280, 380);
  } else if (item.patternType === 'cinema') {
    // Supertechno Cine Tech Blueprint / Hollywood Photography Look
    ctx.fillStyle = '#050c18';
    ctx.fillRect(0, 0, 1024, 768);

    // Blueprint Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 768);
      ctx.stroke();
    }
    for (let y = 0; y < 768; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Technical schematics & glowing vectors
    ctx.strokeStyle = item.accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(120, 140, 780, 480);

    // Crane Arm Vector Illustration
    ctx.beginPath();
    ctx.moveTo(220, 520);
    ctx.lineTo(540, 460);
    ctx.lineTo(840, 260);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('SUPERTECHNO 50 - MODULAR TELESCOPIC CRANE', 140, 190);
    ctx.font = '22px monospace';
    ctx.fillText('MAX REACH: 15.2M | RETRACTED: 3.7M | PAYLOAD: 75KG', 140, 230);
  } else if (item.patternType === 'minimalist') {
    // Monochrome subtle textured minimalism
    const grad = ctx.createRadialGradient(512, 384, 80, 512, 384, 500);
    grad.addColorStop(0, item.primaryColor);
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 768);

    ctx.strokeStyle = item.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(512, 384, 240, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export const ContainerArtworks: React.FC<ContainerArtworksProps> = ({
  exhibitionId,
  selectedArtworkId,
  onSelectArtwork,
  spotlightIntensity,
  stackMode = 'double_stack',
  showArtworks = true,
}) => {
  const collection = ART_COLLECTIONS[exhibitionId] || ART_COLLECTIONS.abstract;

  // Frame and plaque materials
  const materials = useMemo(() => {
    const frame = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.3,
      metalness: 0.8,
    });
    const highlightFrame = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e5c500'),
      emissive: new THREE.Color('#ca8a04'),
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.9,
    });
    const plaqueMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8fafc'),
      roughness: 0.5,
      metalness: 0.1,
    });
    return { frame, highlightFrame, plaqueMat };
  }, []);

  // Pre-generate textures for all artworks
  const artworkTextures = useMemo(() => {
    const map: Record<string, THREE.CanvasTexture> = {};
    collection.artworks.forEach((art) => {
      map[art.id] = generateArtworkCanvasTexture(art);
    });
    return map;
  }, [collection]);

  if (!showArtworks) return null;

  const showUpper = stackMode !== 'single_story';
  const ogOffsetX = stackMode === 'cantilever_offset' ? 1.4 : 0;
  const ogOffsetY = stackMode === 'side_by_side' ? -2.591 : 0;
  const ogOffsetZ = stackMode === 'side_by_side' ? -2.438 : 0;

  return (
    <group name="container_artworks">
      {collection.artworks.map((art) => {
        if (art.floor === 'OG' && !showUpper) return null;

        const isSelected = selectedArtworkId === art.id;
        const [w, h, d] = art.scale;
        const isSculpture = art.patternType === 'sculpture';
        const isUpperFloor = art.floor === 'OG';

        const finalPos: [number, number, number] = isUpperFloor
          ? [art.position[0] + ogOffsetX, art.position[1] + ogOffsetY, art.position[2] + ogOffsetZ]
          : art.position;

        if (isSculpture) {
          // 3D Sculpture Component on Pedestal
          return (
            <group
              key={art.id}
              position={finalPos}
              rotation={art.rotation}
              onClick={(e) => {
                e.stopPropagation();
                onSelectArtwork(isSelected ? null : art.id);
              }}
            >
              {/* Abstract Torus Knot / Organic Form in Bronze or Mirror Steel */}
              <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
                <torusKnotGeometry args={[0.22, 0.07, 100, 16, 2, 3]} />
                <meshStandardMaterial
                  color={art.primaryColor}
                  roughness={art.patternType === 'sculpture' && art.primaryColor.includes('e2e8f0') ? 0.05 : 0.4}
                  metalness={0.9}
                  emissive={isSelected ? new THREE.Color('#ca8a04') : new THREE.Color('#000000')}
                  emissiveIntensity={isSelected ? 0.3 : 0}
                />
              </mesh>

              {/* Dedicated Focused Spotlight */}
              {spotlightIntensity > 0 && (
                <pointLight
                  position={[0, 1.2, 0.3]}
                  intensity={spotlightIntensity * 1.8}
                  distance={2.5}
                  color="#fffbeb"
                  castShadow
                />
              )}
            </group>
          );
        }

        // Wall Canvas Component
        const texture = artworkTextures[art.id];

        return (
          <group
            key={art.id}
            position={finalPos}
            rotation={art.rotation}
            onClick={(e) => {
              e.stopPropagation();
              onSelectArtwork(isSelected ? null : art.id);
            }}
          >
            {/* Dark Outer Picture Frame */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[w + 0.06, h + 0.06, d]} />
              <primitive object={isSelected ? materials.highlightFrame : materials.frame} attach="material" />
            </mesh>

            {/* Front Artwork Surface */}
            <mesh position={[0, 0, d / 2 + 0.002]} receiveShadow>
              <planeGeometry args={[w, h]} />
              {texture ? (
                <meshStandardMaterial
                  map={texture}
                  roughness={0.4}
                  metalness={0.1}
                />
              ) : (
                <meshStandardMaterial color={art.primaryColor} />
              )}
            </mesh>

            {/* Museum Info Plaque to the bottom right of painting */}
            <group position={[w / 2 + 0.14, -h / 2 + 0.06, d / 2 + 0.001]}>
              <mesh receiveShadow>
                <planeGeometry args={[0.16, 0.1]} />
                <primitive object={materials.plaqueMat} attach="material" />
              </mesh>
            </group>

            {/* Spot Downlight Illuminating the painting */}
            {spotlightIntensity > 0 && (
              <spotLight
                position={[0, 1.1, 0.8]}
                target-position={[art.position[0], art.position[1], art.position[2]]}
                angle={0.65}
                penumbra={0.7}
                intensity={spotlightIntensity * 2.2}
                distance={3.2}
                color="#fff8e7"
                castShadow
              />
            )}
          </group>
        );
      })}
    </group>
  );
};
