import React, { useMemo } from 'react';
import * as THREE from 'three';
import { kelvinToHex, type ContainerStackMode } from '../../types/galleryTypes';

interface ContainerLightingProps {
  linearLedIntensity: number; // 0.0 to 2.5
  egLinearLed?: number;
  ogLinearLed?: number;
  cctKelvin: number; // 2700 to 6500
  rgbColorGlow?: string;
  useRgbGlow?: boolean;
  exteriorUpLights: boolean;
  exteriorUpLightsIntensity: number;
  stackMode?: ContainerStackMode;
}

const LENGTH = 6.058;
const WIDTH = 2.438;
const HEIGHT = 2.591;

export const ContainerLighting: React.FC<ContainerLightingProps> = ({
  linearLedIntensity,
  egLinearLed,
  ogLinearLed,
  cctKelvin,
  rgbColorGlow = '#00dcff',
  useRgbGlow = false,
  exteriorUpLights,
  exteriorUpLightsIntensity,
  stackMode = 'double_stack',
}) => {
  const lightHex = useMemo(
    () => (useRgbGlow && rgbColorGlow ? rgbColorGlow : kelvinToHex(cctKelvin)),
    [useRgbGlow, rgbColorGlow, cctKelvin]
  );
  const lightColor = useMemo(() => new THREE.Color(lightHex), [lightHex]);

  const egIntensity = egLinearLed ?? linearLedIntensity;
  const ogIntensity = ogLinearLed ?? linearLedIntensity;

  // Glowing Emissive Material for the Linear LED diffusers
  const ledDiffuserMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: lightColor,
    });
  }, [lightColor]);

  // Transverse Slatted Ceiling LED Bars Component (as clearly visible in reference photo)
  const TransverseCeilingLights = ({ yOffset, intensity }: { yOffset: number; intensity: number }) => {
    const barWidth = WIDTH - 0.28; // runs across width (Z axis)
    const ceilingY = yOffset + HEIGHT - 0.07;
    const numBars = 10;
    const startX = -LENGTH / 2 + 0.45;
    const endX = LENGTH / 2 - 0.45;
    const stepX = (endX - startX) / (numBars - 1);

    const bars = [];
    for (let i = 0; i < numBars; i++) {
      const posX = startX + i * stepX;
      bars.push(
        <group key={`led_bar_${i}`} position={[posX, ceilingY, 0]}>
          {/* Aluminum housing profile */}
          <mesh position={[0, 0.012, 0]}>
            <boxGeometry args={[0.06, 0.025, barWidth]} />
            <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Glowing Frosted Opal LED Diffuser Strip */}
          <mesh position={[0, -0.002, 0]}>
            <boxGeometry args={[0.045, 0.012, barWidth - 0.02]} />
            <primitive object={ledDiffuserMaterial} attach="material" />
          </mesh>
        </group>
      );
    }

    return (
      <group>
        {bars}

        {/* Distributed Warm Point Lights throughout the gallery interior */}
        {intensity > 0 && (
          <>
            <pointLight
              position={[-1.8, ceilingY - 0.25, 0]}
              intensity={intensity * 1.8}
              distance={4.8}
              color={lightHex}
              castShadow={false}
            />
            <pointLight
              position={[-0.6, ceilingY - 0.25, 0]}
              intensity={intensity * 2.0}
              distance={5.0}
              color={lightHex}
              castShadow={false}
            />
            <pointLight
              position={[0.6, ceilingY - 0.25, 0]}
              intensity={intensity * 2.0}
              distance={5.0}
              color={lightHex}
              castShadow={false}
            />
            <pointLight
              position={[1.8, ceilingY - 0.25, 0]}
              intensity={intensity * 1.8}
              distance={4.8}
              color={lightHex}
              castShadow={false}
            />
          </>
        )}
      </group>
    );
  };

  // Ground Exterior In-Ground Up-Lights (Architektur-Bodenstrahler)
  const ExteriorUpLight = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Stainless Steel Ground Ring */}
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.01, 16]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Glowing Lens */}
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.005, 16]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      {/* Upward Spot Beam */}
      {exteriorUpLights && exteriorUpLightsIntensity > 0 && (
        <spotLight
          position={[0, 0.05, 0]}
          target-position={[position[0], 2.8, position[2] < 0 ? -1.2 : 1.2]}
          angle={0.45}
          penumbra={0.6}
          intensity={exteriorUpLightsIntensity * 2.8}
          distance={8.0}
          color="#fef3c7"
          castShadow
        />
      )}
    </group>
  );

  const showUpper = stackMode !== 'single_story';
  const ogOffsetX = stackMode === 'cantilever_offset' ? 1.4 : 0;
  const ogOffsetY = stackMode === 'side_by_side' ? 0 : HEIGHT;
  const ogOffsetZ = stackMode === 'side_by_side' ? -WIDTH : 0;

  return (
    <group name="container_lighting">
      {/* EG Transverse Slatted Ceiling LED Bars */}
      <TransverseCeilingLights yOffset={0.04} intensity={egIntensity} />

      {/* 1. OG Transverse Slatted Ceiling LED Bars */}
      {showUpper && (
        <group position={[ogOffsetX, 0, ogOffsetZ]}>
          <TransverseCeilingLights yOffset={ogOffsetY + 0.04} intensity={ogIntensity} />
        </group>
      )}

      {/* Exterior Architectural Ground Up-Lights */}
      <ExteriorUpLight position={[-2.4, 0, 1.8]} />
      <ExteriorUpLight position={[0, 0, 1.8]} />
      <ExteriorUpLight position={[2.4, 0, 1.8]} />
      <ExteriorUpLight position={[-2.4, 0, -1.8]} />
      <ExteriorUpLight position={[2.4, 0, -1.8]} />
      <ExteriorUpLight position={[3.6, 0, 0]} />
    </group>
  );
};
