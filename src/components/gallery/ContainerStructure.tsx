import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CONTAINER_COLOR_OPTIONS, type ContainerColorId, type ContainerStackMode } from '../../types/galleryTypes';

interface ContainerStructureProps {
  colorId: ContainerColorId;
  customHex?: string;
  weathering: number;
  stackMode?: ContainerStackMode;
}

// 20ft ISO Standard Dimensions
const LENGTH = 6.058;
const WIDTH = 2.438;
const HEIGHT = 2.591;
const WALL_THICKNESS = 0.06;
const POST_SIZE = 0.16;

export const ContainerStructure: React.FC<ContainerStructureProps> = ({
  colorId,
  customHex,
  weathering,
  stackMode = 'double_stack',
}) => {
  const colorConfig = CONTAINER_COLOR_OPTIONS[colorId] || CONTAINER_COLOR_OPTIONS.anthracite;
  const baseColor = colorId === 'custom' && customHex ? customHex : colorConfig.hex;

  // Materials with PBR qualities
  const materials = useMemo(() => {
    const steelColor = new THREE.Color(baseColor);
    const rustColor = new THREE.Color('#8b4513');
    const blendedColor = steelColor.clone().lerp(rustColor, weathering * 0.35);

    const containerSteel = new THREE.MeshStandardMaterial({
      color: blendedColor,
      roughness: Math.min(1.0, colorConfig.roughness + weathering * 0.2),
      metalness: Math.max(0.1, colorConfig.metalness - weathering * 0.2),
    });

    const darkTrim = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorConfig.borderHex || '#111827'),
      roughness: 0.5,
      metalness: 0.6,
    });

    const cornerCasting = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      roughness: 0.6,
      metalness: 0.7,
    });

    const twistlockSteel = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e5c500'), // Yellow twistlock handles
      roughness: 0.4,
      metalness: 0.8,
    });

    const basePad = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.8,
      metalness: 0.4,
    });

    return {
      containerSteel,
      darkTrim,
      cornerCasting,
      twistlockSteel,
      basePad,
    };
  }, [baseColor, colorConfig, weathering]);

  // Solid, 100% Opaque Corrugated Sheet Metal Wall Panels (Zero Transparency / Keine Schlitze)
  const corrugatedSidePanels = useMemo(() => {
    const corrugations = [];
    const sectionLength = LENGTH / 2 - POST_SIZE / 2; // Full half-length
    const panelHeight = HEIGHT - 0.22; // From bottom rail to top rail
    const panelY = HEIGHT / 2;
    const ogPanelY = HEIGHT + HEIGHT / 2;
    const ribWidth = 0.14;
    const ribDepth = 0.04;
    const numRibs = Math.ceil(sectionLength / ribWidth);

    // Reusable 100% Solid Corrugated Steel Wall Panel Component
    const SolidCorrugatedPanel = ({
      posX,
      posY,
      posZ,
      isBack = false,
    }: {
      posX: number;
      posY: number;
      posZ: number;
      isBack?: boolean;
    }) => {
      const ribs = [];
      const startX = posX - sectionLength / 2;

      for (let i = 0; i < numRibs; i++) {
        const x = startX + i * ribWidth + ribWidth / 2;
        if (x > posX + sectionLength / 2) continue;
        const isOutward = i % 2 === 0;
        const zOff = isBack ? (isOutward ? -ribDepth / 2 : ribDepth / 2) : (isOutward ? ribDepth / 2 : -ribDepth / 2);

        ribs.push(
          <mesh
            key={`rib_${i}`}
            position={[x, posY, posZ + zOff]}
            castShadow
            receiveShadow
          >
            {/* Seamless slightly overlapping trapezoidal box to prevent any slit gaps */}
            <boxGeometry args={[ribWidth * 1.02, panelHeight, 0.03]} />
            <primitive object={materials.containerSteel} attach="material" />
          </mesh>
        );
      }

      return (
        <group key={`panel_${posX}_${posY}_${posZ}`}>
          {/* 1. Continuous Solid Core Steel Backplate (100% Opaque / Vollblech) */}
          <mesh position={[posX, posY, posZ]} castShadow receiveShadow>
            <boxGeometry args={[sectionLength, panelHeight, 0.045]} />
            <primitive object={materials.containerSteel} attach="material" />
          </mesh>

          {/* 2. Seamless Corrugated Ribs */}
          {ribs}
        </group>
      );
    };

    // 1. EG Front Solid Corrugated Wall (Z = +WIDTH/2 - WALL_THICKNESS/2, X > 0, from 0 to +L/2)
    const rightPanelCenterX = sectionLength / 2;
    const leftPanelCenterX = -sectionLength / 2;
    const frontZ = WIDTH / 2 - WALL_THICKNESS / 2;
    const backZ = -WIDTH / 2 + WALL_THICKNESS / 2;

    corrugations.push(
      <SolidCorrugatedPanel
        key="eg_front_solid"
        posX={rightPanelCenterX}
        posY={panelY}
        posZ={frontZ}
      />
    );

    // 2. 1. OG Front Solid Corrugated Wall (Z = +WIDTH/2 - WALL_THICKNESS/2, X < 0, from -L/2 to 0)
    corrugations.push(
      <SolidCorrugatedPanel
        key="og_front_solid"
        posX={leftPanelCenterX}
        posY={ogPanelY}
        posZ={frontZ}
      />
    );

    // 3. EG Back Solid Corrugated Wall (Z = -WIDTH/2 + WALL_THICKNESS/2, X > 0)
    corrugations.push(
      <SolidCorrugatedPanel
        key="eg_back_solid"
        posX={rightPanelCenterX}
        posY={panelY}
        posZ={backZ}
        isBack={true}
      />
    );

    // 4. 1. OG Back Solid Corrugated Wall (Z = -WIDTH/2 + WALL_THICKNESS/2, X < 0)
    corrugations.push(
      <SolidCorrugatedPanel
        key="og_back_solid"
        posX={leftPanelCenterX}
        posY={ogPanelY}
        posZ={backZ}
        isBack={true}
      />
    );

    // Small Top Vent Brackets on each solid corrugated side wall (as seen in photo)
    const VentBracket = ({ pos }: { pos: [number, number, number] }) => (
      <mesh position={pos} castShadow>
        <boxGeometry args={[0.08, 0.14, 0.035]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.7} />
      </mesh>
    );

    // EG Front & Back side wall vents
    corrugations.push(<VentBracket key="eg_front_vent_1" pos={[0.8, panelY + panelHeight / 2 - 0.12, WIDTH / 2]} />);
    corrugations.push(<VentBracket key="eg_front_vent_2" pos={[2.1, panelY + panelHeight / 2 - 0.12, WIDTH / 2]} />);
    corrugations.push(<VentBracket key="eg_back_vent_1" pos={[0.8, panelY + panelHeight / 2 - 0.12, -WIDTH / 2]} />);
    corrugations.push(<VentBracket key="eg_back_vent_2" pos={[2.1, panelY + panelHeight / 2 - 0.12, -WIDTH / 2]} />);

    // 1. OG Front & Back side wall vents
    corrugations.push(<VentBracket key="og_front_vent_1" pos={[-2.1, ogPanelY + panelHeight / 2 - 0.12, WIDTH / 2]} />);
    corrugations.push(<VentBracket key="og_front_vent_2" pos={[-0.8, ogPanelY + panelHeight / 2 - 0.12, WIDTH / 2]} />);
    corrugations.push(<VentBracket key="og_back_vent_1" pos={[-2.1, ogPanelY + panelHeight / 2 - 0.12, -WIDTH / 2]} />);
    corrugations.push(<VentBracket key="og_back_vent_2" pos={[-0.8, ogPanelY + panelHeight / 2 - 0.12, -WIDTH / 2]} />);

    return corrugations;
  }, [materials]);

  // Corner Casting Block Component
  const CornerCasting = ({ position, hasTwistlock = false }: { position: [number, number, number]; hasTwistlock?: boolean }) => (
    <group position={position}>
      {/* Heavy Corner Casting Cube with holes */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.18, 0.22]} />
        <primitive object={materials.cornerCasting} attach="material" />
      </mesh>
      {/* Front oval cutout */}
      <mesh position={[0, 0, 0.111]}>
        <planeGeometry args={[0.09, 0.07]} />
        <meshBasicMaterial color="#0b0f17" />
      </mesh>
      {/* Side oval cutout */}
      <mesh position={[0.111, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.09, 0.07]} />
        <meshBasicMaterial color="#0b0f17" />
      </mesh>
      {/* Yellow Twistlock Locking Pin / Lever */}
      {hasTwistlock && (
        <group position={[0, -0.09, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.08, 12]} />
            <primitive object={materials.twistlockSteel} attach="material" />
          </mesh>
          <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
            <primitive object={materials.twistlockSteel} attach="material" />
          </mesh>
        </group>
      )}
    </group>
  );

  // Single Container Frame (Rails, Posts, Header, Sill)
  const ContainerFrame = ({ yOffset, isUpper = false }: { yOffset: number; isUpper?: boolean }) => {
    const halfL = LENGTH / 2;
    const halfW = WIDTH / 2;
    const halfH = HEIGHT / 2;
    const frameY = yOffset + halfH;

    return (
      <group>
        {/* 4 Vertical Corner Posts */}
        <mesh position={[-halfL + POST_SIZE / 2, frameY, -halfW + POST_SIZE / 2]} castShadow receiveShadow>
          <boxGeometry args={[POST_SIZE, HEIGHT - 0.2, POST_SIZE]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>
        <mesh position={[halfL - POST_SIZE / 2, frameY, -halfW + POST_SIZE / 2]} castShadow receiveShadow>
          <boxGeometry args={[POST_SIZE, HEIGHT - 0.2, POST_SIZE]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>
        <mesh position={[-halfL + POST_SIZE / 2, frameY, halfW - POST_SIZE / 2]} castShadow receiveShadow>
          <boxGeometry args={[POST_SIZE, HEIGHT - 0.2, POST_SIZE]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>
        <mesh position={[halfL - POST_SIZE / 2, frameY, halfW - POST_SIZE / 2]} castShadow receiveShadow>
          <boxGeometry args={[POST_SIZE, HEIGHT - 0.2, POST_SIZE]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>

        {/* Bottom Rails (Longitudinal) */}
        <mesh position={[0, yOffset + 0.08, -halfW + 0.06]} castShadow receiveShadow>
          <boxGeometry args={[LENGTH - 0.4, 0.16, 0.12]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>
        <mesh position={[0, yOffset + 0.08, halfW - 0.06]} castShadow receiveShadow>
          <boxGeometry args={[LENGTH - 0.4, 0.16, 0.12]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>

        {/* Top Rails (Longitudinal) */}
        <mesh position={[0, yOffset + HEIGHT - 0.08, -halfW + 0.06]} castShadow receiveShadow>
          <boxGeometry args={[LENGTH - 0.4, 0.16, 0.12]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>
        <mesh position={[0, yOffset + HEIGHT - 0.08, halfW - 0.06]} castShadow receiveShadow>
          <boxGeometry args={[LENGTH - 0.4, 0.16, 0.12]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>

        {/* Cross End Rails (Headers & Sills) */}
        <mesh position={[-halfL + 0.06, yOffset + 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.16, WIDTH - 0.4]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>
        <mesh position={[-halfL + 0.06, yOffset + HEIGHT - 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.16, WIDTH - 0.4]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>
        <mesh position={[halfL - 0.06, yOffset + 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.16, WIDTH - 0.4]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>
        <mesh position={[halfL - 0.06, yOffset + HEIGHT - 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.16, WIDTH - 0.4]} />
          <primitive object={materials.darkTrim} attach="material" />
        </mesh>

        {/* Forklift Pockets along bottom side (EG only) */}
        {!isUpper && (
          <>
            <mesh position={[-0.8, yOffset + 0.07, halfW]} castShadow>
              <boxGeometry args={[0.36, 0.10, 0.04]} />
              <meshBasicMaterial color="#090d14" />
            </mesh>
            <mesh position={[0.8, yOffset + 0.07, halfW]} castShadow>
              <boxGeometry args={[0.36, 0.10, 0.04]} />
              <meshBasicMaterial color="#090d14" />
            </mesh>
          </>
        )}

        {/* Roof Corrugations */}
        <mesh position={[0, yOffset + HEIGHT - 0.02, 0]} receiveShadow>
          <boxGeometry args={[LENGTH - 0.3, 0.04, WIDTH - 0.3]} />
          <primitive object={materials.containerSteel} attach="material" />
        </mesh>

        {/* Corner Castings on 8 vertices */}
        {/* Bottom 4 */}
        <CornerCasting position={[-halfL + 0.1, yOffset + 0.09, -halfW + 0.1]} />
        <CornerCasting position={[halfL - 0.1, yOffset + 0.09, -halfW + 0.1]} />
        <CornerCasting position={[-halfL + 0.1, yOffset + 0.09, halfW - 0.1]} />
        <CornerCasting position={[halfL - 0.1, yOffset + 0.09, halfW - 0.1]} />

        {/* Top 4 */}
        <CornerCasting position={[-halfL + 0.1, yOffset + HEIGHT - 0.09, -halfW + 0.1]} hasTwistlock={!isUpper} />
        <CornerCasting position={[halfL - 0.1, yOffset + HEIGHT - 0.09, -halfW + 0.1]} hasTwistlock={!isUpper} />
        <CornerCasting position={[-halfL + 0.1, yOffset + HEIGHT - 0.09, halfW - 0.1]} hasTwistlock={!isUpper} />
        <CornerCasting position={[halfL - 0.1, yOffset + HEIGHT - 0.09, halfW - 0.1]} hasTwistlock={!isUpper} />
      </group>
    );
  };

  // Base Spreader Leveling Foot Pads (Heavy steel base plates on pavement as in photo)
  const halfL = LENGTH / 2;
  const halfW = WIDTH / 2;
  const BaseFootPad = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Thick steel base plate */}
      <mesh position={[0, 0.02, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.52, 0.04, 0.52]} />
        <primitive object={materials.basePad} attach="material" />
      </mesh>
      {/* Rubber isolator pad under plate */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[0.54, 0.01, 0.54]} />
        <meshBasicMaterial color="#05070a" />
      </mesh>
    </group>
  );

  const ogOffsetX = stackMode === 'cantilever_offset' ? 1.4 : 0;
  const ogOffsetY = stackMode === 'side_by_side' ? 0 : HEIGHT;
  const ogOffsetZ = stackMode === 'side_by_side' ? -WIDTH : 0;
  const showUpper = stackMode !== 'single_story';

  return (
    <group name="gallery_container_structure">
      {/* Ground Spreader Pads (4x at bottom corners) */}
      <BaseFootPad position={[-halfL + 0.1, 0, -halfW + 0.1]} />
      <BaseFootPad position={[halfL - 0.1, 0, -halfW + 0.1]} />
      <BaseFootPad position={[-halfL + 0.1, 0, halfW - 0.1]} />
      <BaseFootPad position={[halfL - 0.1, 0, halfW - 0.1]} />

      {/* EG Ground Floor Container */}
      <ContainerFrame yOffset={0.04} isUpper={false} />

      {/* 1. OG Upper Floor Container / 2nd Modular Container */}
      {showUpper && (
        <group position={[ogOffsetX, 0, ogOffsetZ]}>
          <ContainerFrame yOffset={ogOffsetY + 0.04} isUpper={true} />
        </group>
      )}

      {/* Corrugated Wall Panels */}
      {corrugatedSidePanels}
    </group>
  );
};
