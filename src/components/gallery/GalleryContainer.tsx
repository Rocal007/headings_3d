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
  kelvinToHex,
} from '../../types/galleryTypes';
import { ContainerStructure } from './ContainerStructure';
import { ContainerGlassAndDoors } from './ContainerGlassAndDoors';
import { ContainerInterior } from './ContainerInterior';
import { ContainerLighting } from './ContainerLighting';
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
  const env = GALLERY_ENVIRONMENTS[envId] || GALLERY_ENVIRONMENTS.dark_studio;

  return (
    <>
      <ambientLight intensity={env.ambientIntensity} color={env.skyColor} />
      <directionalLight
        position={env.sunPosition}
        intensity={env.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={24}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
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
        camera={{ position: [7.2, 3.2, 8.2], fov: state.cameraFov }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
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
        </ContainerRotator>
      </Canvas>

      {/* Top Floating Telemetry & Quick Header */}
      <div
        className="gallery-telemetry-hud"
        style={{
          position: 'absolute',
          top: '76px',
          left: '20px',
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          maxWidth: '380px',
          pointerEvents: 'auto',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎨</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.6px', color: '#38bdf8' }}>
                POP-UP GALLERY CONTAINER
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                2-Story 20ft ISO (6.06m × 2.44m × 5.18m)
              </div>
            </div>
          </div>
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
            STUDIO SHOWROOM
          </span>
        </div>

        {/* Live Metrics Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginTop: '4px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>CCT LICHT</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: kelvinToHex(state.cctKelvin) }}>
              {state.cctKelvin} K
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>TÜREN (EG)</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: state.egDoorsOpen > 0 ? '#4ade80' : '#cbd5e1' }}>
              {state.egDoorsOpen > 0 ? `${Math.round(state.egDoorsOpen * 150)}° NACH AUSSEN` : 'GESCHLOSSEN'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>BAUFORM</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
              {state.stackMode === 'double_stack' ? '2-STORY ISO' : state.stackMode === 'cantilever_offset' ? 'L-AUSKRAGUNG' : state.stackMode === 'side_by_side' ? 'SIDE-BY-SIDE' : 'SINGLE 20FT'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Quick-Action Toolbar */}
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
          gap: '8px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'free' })}
          style={{
            background: state.activeCamera === 'free' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'free' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🎬</span> Freie Regie
        </button>

        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'hero' })}
          style={{
            background: state.activeCamera === 'hero' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'hero' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>👑</span> Hero Shot
        </button>

        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'interior_eg' })}
          style={{
            background: state.activeCamera === 'interior_eg' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'interior_eg' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🚶‍♂️</span> EG Walk-In
        </button>

        <button
          type="button"
          onClick={() => handleStateChange({ activeCamera: 'interior_og' })}
          style={{
            background: state.activeCamera === 'interior_og' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: state.activeCamera === 'interior_og' ? '1px solid #38bdf8' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🖼️</span> 1. OG Ausblick
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
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🔄</span> {state.turntableMotorActive ? 'Drehteller Stop' : 'Drehteller An'}
        </button>

        <button
          type="button"
          onClick={() =>
            handleStateChange({
              egDoorsOpen: state.egDoorsOpen > 0.1 ? 0 : 0.85,
              ogDoorsOpen: state.ogDoorsOpen > 0.1 ? 0 : 0.85,
              slidingDoorOpen: state.slidingDoorOpen > 0.1 ? 0 : 0.9,
            })
          }
          style={{
            background: state.egDoorsOpen > 0.1 ? 'rgba(229, 197, 0, 0.25)' : 'transparent',
            border: state.egDoorsOpen > 0.1 ? '1px solid #e5c500' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🚪</span> {state.egDoorsOpen > 0.1 ? 'Türen zu' : 'Türen auf'}
        </button>

        <button
          type="button"
          onClick={() => {
            const nextMode: Record<typeof state.stackMode, typeof state.stackMode> = {
              double_stack: 'cantilever_offset',
              cantilever_offset: 'side_by_side',
              side_by_side: 'single_story',
              single_story: 'double_stack',
            };
            handleStateChange({ stackMode: nextMode[state.stackMode] });
          }}
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🏗️</span> {state.stackMode === 'double_stack' ? '2-Story' : state.stackMode === 'cantilever_offset' ? 'L-Form' : state.stackMode === 'side_by_side' ? 'Side-by-Side' : 'Single EG'}
        </button>

        <button
          type="button"
          onClick={() =>
            handleStateChange({
              environment: state.environment === 'dark_studio' ? 'bright_studio' : 'dark_studio',
            })
          }
          style={{
            background: state.environment === 'dark_studio' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
            border: state.environment === 'dark_studio' ? '1px solid #a855f7' : '1px solid transparent',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{state.environment === 'dark_studio' ? '💡' : '🌑'}</span>
          {state.environment === 'dark_studio' ? 'Dark' : 'White'}
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
