import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  type GalleryContainerState,
  DEFAULT_GALLERY_STATE,
  GALLERY_CAMERA_PRESETS,
  GALLERY_ENVIRONMENTS,
} from '../../types/galleryTypes';
import { ContainerStructure } from './ContainerStructure';
import { ContainerGlassAndDoors } from './ContainerGlassAndDoors';
import { ContainerInterior } from './ContainerInterior';
import { ContainerLighting } from './ContainerLighting';
import { ContainerArtworks } from './ContainerArtworks';
import { StudioShowroomEnvironment } from './StudioShowroomEnvironment';
import { VotivkircheEnvironment } from './VotivkircheEnvironment';
import { GalleryControlDrawer } from './GalleryControlDrawer';

// Smooth Camera Controller inside R3F Canvas
function CameraRig({
  activeCameraId,
  autoRotate,
  cameraFov,
}: {
  activeCameraId: keyof typeof GALLERY_CAMERA_PRESETS;
  autoRotate: boolean;
  cameraFov: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const isTransitioning = useRef(false);
  const prevCameraId = useRef(activeCameraId);

  const preset = GALLERY_CAMERA_PRESETS[activeCameraId] || GALLERY_CAMERA_PRESETS.free;

  useEffect(() => {
    if (activeCameraId !== prevCameraId.current) {
      prevCameraId.current = activeCameraId;
      targetPos.current.set(...preset.position);
      targetLook.current.set(...preset.target);
      isTransitioning.current = true;
    }
  }, [activeCameraId, preset]);

  useEffect(() => {
    if ('fov' in camera && typeof (camera as THREE.PerspectiveCamera).fov === 'number') {
      (camera as THREE.PerspectiveCamera).fov = cameraFov;
      camera.updateProjectionMatrix();
    }
  }, [cameraFov, camera]);

  useFrame((_, delta) => {
    // Only lerp when transitioning between defined presets (disable forced lerp in free mode once reached)
    if (isTransitioning.current && activeCameraId !== 'free') {
      camera.position.lerp(targetPos.current, Math.min(1.0, delta * 3.5));
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLook.current, Math.min(1.0, delta * 3.5));
        controlsRef.current.update();
      }
      if (camera.position.distanceTo(targetPos.current) < 0.05) {
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={1.0}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2 - 0.01} // Do not clip under turntable floor
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
    />
  );
}

// Turntable Container Assembly Rotator with continuous motor support
function ContainerRotator({
  rotationYDeg,
  motorActive,
  motorRPM,
  children,
}: {
  rotationYDeg: number;
  motorActive: boolean;
  motorRPM: number;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      if (motorActive) {
        const radPerSec = (motorRPM * 2 * Math.PI) / 60;
        groupRef.current.rotation.y += radPerSec * delta;
      } else {
        groupRef.current.rotation.y = (rotationYDeg * Math.PI) / 180;
      }
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// Scene Lighting Assembly
function SceneLights({
  envId,
}: {
  envId: keyof typeof GALLERY_ENVIRONMENTS;
}) {
  const env = GALLERY_ENVIRONMENTS[envId] || GALLERY_ENVIRONMENTS.afternoon_5pm;
  const sunColor = env.sunColor || '#ffffff';

  return (
    <>
      <ambientLight intensity={env.ambientIntensity} color={env.skyColor} />
      <directionalLight
        position={env.sunPosition}
        intensity={env.sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00005}
        shadow-normalBias={0.03}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-4}
        shadow-camera-near={1.0}
        shadow-camera-far={45}
      />
      {/* Sky fill light from opposite angle */}
      <directionalLight
        position={[-env.sunPosition[0], env.sunPosition[1] * 0.5, -env.sunPosition[2]]}
        intensity={env.ambientIntensity * 0.4}
        color={env.groundColor}
      />
    </>
  );
}

export const GalleryContainer: React.FC = () => {
  const [state, setState] = useState<GalleryContainerState>(DEFAULT_GALLERY_STATE);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const envConfig = GALLERY_ENVIRONMENTS[state.environment] || GALLERY_ENVIRONMENTS.dark_studio;

  const handleStateChange = (patch: Partial<GalleryContainerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div
      className="gallery-container-viewport"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: envConfig.skyColor,
        overflow: 'hidden',
      }}
    >
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [7.2, 3.2, 8.2], fov: state.cameraFov, near: 0.1, far: 250 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true,
        }}
      >
        <color attach="background" args={[envConfig.skyColor]} />
        <fog
          attach="fog"
          args={[
            envConfig.skyColor,
            envConfig.isDark ? 18 : 35,
            envConfig.isDark ? 55 : 95,
          ]}
        />

        {/* Dynamic Scene Illumination */}
        <SceneLights envId={state.environment} />

        {/* Camera Rig & Orbit Controls */}
        <CameraRig
          activeCameraId={state.activeCamera}
          autoRotate={state.autoRotate}
          cameraFov={state.cameraFov}
        />

        {/* Environment: Vienna Votivkirche Piazza or Studio Showroom (Turntable platform) */}
        {state.environment === 'votivkirche' ? (
          <VotivkircheEnvironment
            environmentId={state.environment}
            showVotivkirche={true}
            showPedestrians={state.showPedestrians}
          />
        ) : (
          <StudioShowroomEnvironment environmentId={state.environment} />
        )}

        {/* 3D Model Assemblies on Turntable */}
        <ContainerRotator
          rotationYDeg={state.containerRotationY}
          motorActive={state.turntableMotorActive}
          motorRPM={state.turntableSpeedRPM}
        >
          {/* 1. Modular Container Steel Structure */}
          <ContainerStructure
            colorId={state.containerColor}
            customHex={state.customColorHex}
            weathering={state.weathering}
            stackMode={state.stackMode}
          />

          {/* 2. Panoramic Glass Facades & Outward Opening Doors */}
          <ContainerGlassAndDoors
            egDoorsOpen={state.egDoorsOpen}
            ogDoorsOpen={state.ogDoorsOpen}
            slidingDoorOpen={state.slidingDoorOpen}
            stackMode={state.stackMode}
          />

          {/* 3. White Interior Walls & Floor */}
          <ContainerInterior stackMode={state.stackMode} />

          {/* 4. Linear Ceiling LED Lighting Strips & Up-Lights */}
          <ContainerLighting
            linearLedIntensity={state.linearLedIntensity}
            egLinearLed={state.egLinearLed}
            ogLinearLed={state.ogLinearLed}
            cctKelvin={state.cctKelvin}
            rgbColorGlow={state.rgbColorGlow}
            useRgbGlow={state.useRgbGlow}
            exteriorUpLights={state.exteriorUpLights}
            exteriorUpLightsIntensity={state.exteriorUpLightsIntensity}
            stackMode={state.stackMode}
          />

          {/* 5. Curated Artworks & Sculpture (PDF gezwanzig Original-Kuration) */}
          <ContainerArtworks
            exhibitionId={state.currentExhibition}
            selectedArtworkId={state.selectedArtworkId}
            onSelectArtwork={(id) => handleStateChange({ selectedArtworkId: id })}
            spotlightIntensity={state.spotlightsIntensity}
            stackMode={state.stackMode}
            showArtworks={state.showArtworks}
          />
        </ContainerRotator>
      </Canvas>

      {/* Top Floating Telemetry & gezwanzig Blueprint Header */}
      <div
        className="gallery-telemetry-hud"
        style={{
          position: 'absolute',
          top: '76px',
          left: '20px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          maxWidth: '420px',
          pointerEvents: 'auto',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🏛️</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.8px', color: '#f8fafc' }}>
                gezwanzig
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                contemporary showcase gallery gezwanzig
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
              }}
            >
              Maßstab 1:40
            </span>
          </div>
        </div>

        {/* Live Metrics Row matching PDF */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginTop: '4px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>LÄNGE</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
              6,058 m
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>BREITE</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
              2,438 m
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>HÖHE (2-STÖCKIG)</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
              5,182 m
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>FLÄCHE / EBENE</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
              14,8 m² (2× 7,4m²)
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Quick-Action Toolbar (PDF Kamera-Modi & Regie) */}
      <div
        className="gallery-quick-toolbar"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '30px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
          zIndex: 10,
          maxWidth: '92vw',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'axonometrie_3d' })}
          style={{
            background: state.activeCamera === 'axonometrie_3d' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'axonometrie_3d' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🏛️</span> Axonometrie (S. 5)
        </button>

        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'ansicht_1_40' })}
          style={{
            background: state.activeCamera === 'ansicht_1_40' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'ansicht_1_40' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>📐</span> Ansicht 1:40 (S. 2)
        </button>

        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'grundriss_1_40' })}
          style={{
            background: state.activeCamera === 'grundriss_1_40' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'grundriss_1_40' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>📋</span> Grundriss (S. 1)
        </button>

        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'showcase_front' })}
          style={{
            background: state.activeCamera === 'showcase_front' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'showcase_front' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🖼️</span> Showcase (S. 4)
        </button>

        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'detail_eg' })}
          style={{
            background: state.activeCamera === 'detail_eg' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'detail_eg' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🔍</span> Detail EG (S. 6)
        </button>

        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'free' })}
          style={{
            background: state.activeCamera === 'free' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'free' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🎬</span> Freie Regie
        </button>

        <button
          type="button"
          onClick={() =>
            handleStateChange({
              turntableMotorActive: !state.turntableMotorActive,
            })
          }
          style={{
            background: state.turntableMotorActive ? 'rgba(34, 197, 94, 0.25)' : 'transparent',
            border: state.turntableMotorActive ? '1px solid #22c55e' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🔄</span> {state.turntableMotorActive ? 'Stop' : 'Drehteller'}
        </button>

        <button
          type="button"
          onClick={() =>
            handleStateChange({
              egDoorsOpen: state.egDoorsOpen > 0.1 ? 0 : 0.85,
              ogDoorsOpen: state.ogDoorsOpen > 0.1 ? 0 : 0.85,
            })
          }
          style={{
            background: state.egDoorsOpen > 0.1 ? 'rgba(229, 197, 0, 0.25)' : 'transparent',
            border: state.egDoorsOpen > 0.1 ? '1px solid #e5c500' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <span>🚪</span> {state.egDoorsOpen > 0.1 ? 'Türen zu' : 'Türen auf'}
        </button>
      </div>

      {/* Neurodidactic Control Drawer */}
      <GalleryControlDrawer
        state={state}
        onChange={handleStateChange}
        isOpen={isDrawerOpen}
        onToggleOpen={() => setIsDrawerOpen(!isDrawerOpen)}
      />
    </div>
  );
};

export default GalleryContainer;
