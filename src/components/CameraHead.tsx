import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import RemoteCameraHead from './RemoteCameraHead';
import { CraneTennisRacketHead } from './CraneTennisRacketHead';

// ============================================================================
// CAMERA HEAD STUDIO TYPES & PRESETS
// ============================================================================

export type HeadStudioCameraId = 'orbit' | 'cine' | 'yoke' | 'arri' | 'horizon' | 'top' | 'front' | 'side';
export type HeadPayloadType = 'arri_alexa' | 'tennis_racket' | 'bare_gimbal';
export type HeadStudioScenery = 'dark_stage' | 'cleanroom' | 'warm_set' | 'cyber_lab' | 'sunset';
export type HeadMoCoRoutine = 'none' | 'pan_sweep' | 'dutch_flip' | 'nod_shake' | 'lissajous';

export interface CameraHeadCameraPreset {
  id: HeadStudioCameraId;
  name: string;
  icon: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

// 🌟 Head sits at Y = 1.00m. Camera lens center is at Y ≈ 0.78m.
export const HEAD_STUDIO_CAMERAS: Record<HeadStudioCameraId, CameraHeadCameraPreset> = {
  orbit: {
    id: 'orbit',
    name: '360° Studio Orbit (Frei)',
    icon: '🌟',
    position: new THREE.Vector3(1.35, 1.15, 1.45),
    target: new THREE.Vector3(0, 0.78, 0),
    fov: 42
  },
  cine: {
    id: 'cine',
    name: 'ARRI Cine Viewfinder (Look-Through)',
    icon: '🎬',
    position: new THREE.Vector3(0, 0.78, 0.05),
    target: new THREE.Vector3(0, 0.78, 5.0),
    fov: 40
  },
  yoke: {
    id: 'yoke',
    name: 'Gimbal Yoke & Schleifringe',
    icon: '⚙️',
    position: new THREE.Vector3(0.58, 0.95, 0.48),
    target: new THREE.Vector3(0, 0.88, 0),
    fov: 34
  },
  arri: {
    id: 'arri',
    name: 'ARRI Alexa Mini LF & FIZ',
    icon: '📹',
    position: new THREE.Vector3(-0.52, 0.75, 0.40),
    target: new THREE.Vector3(0, 0.75, -0.05),
    fov: 32
  },
  horizon: {
    id: 'horizon',
    name: 'Auto-Horizon Flansch',
    icon: '🛡️',
    position: new THREE.Vector3(0.45, 1.12, 0.45),
    target: new THREE.Vector3(0, 1.00, 0),
    fov: 36
  },
  front: {
    id: 'front',
    name: 'Front Face & Prime DNA Lens',
    icon: '👁️',
    position: new THREE.Vector3(0, 0.78, -0.95),
    target: new THREE.Vector3(0, 0.78, 0),
    fov: 35
  },
  side: {
    id: 'side',
    name: 'Seitenprofil (Codex Door & Lemo)',
    icon: '🎛️',
    position: new THREE.Vector3(1.10, 0.82, 0),
    target: new THREE.Vector3(0, 0.78, 0),
    fov: 36
  },
  top: {
    id: 'top',
    name: 'Top Engineering Projection',
    icon: '📐',
    position: new THREE.Vector3(0, 2.45, 0.01),
    target: new THREE.Vector3(0, 0.80, 0),
    fov: 38
  }
};

const SCENERY_CONFIGS: Record<HeadStudioScenery, {
  name: string;
  icon: string;
  bgColor: string;
  fogColor: string;
  ambientIntensity: number;
  keyLightColor: string;
  keyLightIntensity: number;
  rimColor: string;
  gridColor: string;
  ringColor: string;
  floorRoughness: number;
  floorMetalness: number;
}> = {
  dark_stage: {
    name: 'Dark Technocrane Stage',
    icon: '🎬',
    bgColor: '#080a10',
    fogColor: '#080a10',
    ambientIntensity: 0.75,
    keyLightColor: '#ffffff',
    keyLightIntensity: 2.4,
    rimColor: '#38bdf8',
    gridColor: '#1e293b',
    ringColor: '#38bdf8',
    floorRoughness: 0.22,
    floorMetalness: 0.70
  },
  cleanroom: {
    name: 'High-Key White Cleanroom',
    icon: '🔬',
    bgColor: '#f1f5f9',
    fogColor: '#e2e8f0',
    ambientIntensity: 1.3,
    keyLightColor: '#ffffff',
    keyLightIntensity: 2.6,
    rimColor: '#0284c7',
    gridColor: '#cbd5e1',
    ringColor: '#0284c7',
    floorRoughness: 0.18,
    floorMetalness: 0.45
  },
  warm_set: {
    name: 'Warm Tungsten Cine Set',
    icon: '💡',
    bgColor: '#120f0d',
    fogColor: '#120f0d',
    ambientIntensity: 0.85,
    keyLightColor: '#ffedd5',
    keyLightIntensity: 2.5,
    rimColor: '#f97316',
    gridColor: '#33221a',
    ringColor: '#f97316',
    floorRoughness: 0.32,
    floorMetalness: 0.55
  },
  cyber_lab: {
    name: 'Cyber Neon MoCo Lab',
    icon: '⚡',
    bgColor: '#05070d',
    fogColor: '#05070d',
    ambientIntensity: 0.55,
    keyLightColor: '#e0e7ff',
    keyLightIntensity: 2.2,
    rimColor: '#ec4899',
    gridColor: '#1e1b4b',
    ringColor: '#a855f7',
    floorRoughness: 0.15,
    floorMetalness: 0.85
  },
  sunset: {
    name: 'Sunset Film Studio',
    icon: '🌅',
    bgColor: '#180e14',
    fogColor: '#180e14',
    ambientIntensity: 0.8,
    keyLightColor: '#fed7aa',
    keyLightIntensity: 2.6,
    rimColor: '#a855f7',
    gridColor: '#3b1d28',
    ringColor: '#f43f5e',
    floorRoughness: 0.28,
    floorMetalness: 0.65
  }
};

// ============================================================================
// INNER 3D SCENE COMPONENT FOR CAMERA HEAD (1 METER FLOATING ALTITUDE)
// ============================================================================

interface CameraHeadSceneProps {
  headPan: number;
  headTilt: number;
  headRoll: number;
  boomTilt: number;
  autoLevel: boolean;
  useCadColors: boolean;
  showCables: boolean;
  payloadType: HeadPayloadType;
  scenery: HeadStudioScenery;
  activeCam: HeadStudioCameraId;
  autoSpin: boolean;
  orbitRef: React.MutableRefObject<any>;
}

function CameraHeadScene({
  headPan,
  headTilt,
  headRoll,
  boomTilt,
  autoLevel,
  useCadColors,
  showCables,
  payloadType,
  scenery,
  activeCam,
  autoSpin,
  orbitRef
}: CameraHeadSceneProps) {
  const { camera } = useThree();
  const headGroupRef = useRef<THREE.Group>(null);
  const headTargetRef = useRef<THREE.Group>(null);

  const kinRef = useRef({
    headPan,
    headTilt,
    headRoll,
    boomTilt
  });

  useEffect(() => {
    kinRef.current = {
      headPan,
      headTilt,
      headRoll,
      boomTilt
    };
  }, [headPan, headTilt, headRoll, boomTilt]);

  // Smooth camera interpolation for camera presets
  useFrame((_state, delta) => {
    if (autoSpin && orbitRef.current && activeCam === 'orbit') {
      orbitRef.current.autoRotate = true;
      orbitRef.current.autoRotateSpeed = 2.0;
    } else if (orbitRef.current) {
      orbitRef.current.autoRotate = false;
    }

    if (activeCam === 'cine') {
      // Cine Viewfinder POV: camera is placed right at the front lens look-through position
      const cineLocalPos = new THREE.Vector3(0, -0.22, -0.20);
      const lookAtLocal = new THREE.Vector3(0, -0.22, -4.0);

      if (headGroupRef.current) {
        headGroupRef.current.updateMatrixWorld();
        const worldCamPos = cineLocalPos.clone().applyMatrix4(headGroupRef.current.matrixWorld);
        const worldLookAt = lookAtLocal.clone().applyMatrix4(headGroupRef.current.matrixWorld);

        camera.position.lerp(worldCamPos, Math.min(1.0, delta * 8.0));
        camera.lookAt(worldLookAt);
      }
    } else if (orbitRef.current) {
      const preset = HEAD_STUDIO_CAMERAS[activeCam];
      if (preset && activeCam !== 'orbit') {
        camera.position.lerp(preset.position, Math.min(1.0, delta * 4.5));
        orbitRef.current.target.lerp(preset.target, Math.min(1.0, delta * 4.5));
        orbitRef.current.update();
      }
    }
  });

  const sceneryCfg = SCENERY_CONFIGS[scenery];

  return (
    <>
      <color attach="background" args={[sceneryCfg.bgColor]} />
      <fog attach="fog" args={[sceneryCfg.fogColor, 3.0, 14.0]} />

      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.35}
        maxDistance={6.5}
        target={[0, 0.78, 0]}
        maxPolarAngle={Math.PI / 2 + 0.05}
        enabled={activeCam !== 'cine'}
      />

      {/* --- STUDIO LIGHTING RIG --- */}
      <ambientLight intensity={sceneryCfg.ambientIntensity} />

      {/* Main High-CRI Key Light with High-Resolution Contact Shadows onto Ground */}
      <directionalLight
        position={[2.8, 4.5, 2.5]}
        intensity={sceneryCfg.keyLightIntensity}
        color={sceneryCfg.keyLightColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-camera-near={0.1}
        shadow-camera-far={12}
        shadow-camera-left={-2.0}
        shadow-camera-right={2.0}
        shadow-camera-top={2.0}
        shadow-camera-bottom={-2.0}
      />

      {/* Soft Fill Light from Opposite Side */}
      <directionalLight
        position={[-3.0, 2.5, -2.0]}
        intensity={0.8}
        color="#94a3b8"
      />

      {/* Dramatic Cinematic Rim Light */}
      <directionalLight
        position={[0, 3.0, -3.5]}
        intensity={2.0}
        color={sceneryCfg.rimColor}
      />

      {/* Ground Bounce Light */}
      <pointLight position={[0, 0.2, 0]} intensity={0.5} color={sceneryCfg.rimColor} distance={4.0} />

      {/* --- STUDIO FLOOR & TECHNICAL MEASUREMENT GRID (Y = 0.0) --- */}
      <group position={[0, 0, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial
            color={sceneryCfg.bgColor}
            roughness={sceneryCfg.floorRoughness}
            metalness={sceneryCfg.floorMetalness}
          />
        </mesh>
        <gridHelper args={[14, 28, sceneryCfg.gridColor, sceneryCfg.gridColor]} position={[0, 0.001, 0]} />

        {/* High-Precision Concentric Target Rings under Floating Head */}
        {[0.25, 0.50, 0.75, 1.0, 1.5, 2.0].map((radius, rIdx) => (
          <mesh key={`radial-grid-${rIdx}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <ringGeometry args={[radius - 0.003, radius, 64]} />
            <meshBasicMaterial
              color={rIdx === 3 ? sceneryCfg.ringColor : sceneryCfg.gridColor}
              transparent
              opacity={rIdx === 3 ? 0.85 : 0.4}
            />
          </mesh>
        ))}

        {/* 1.0m Radius Floor Target Marker with Center Dot */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <circleGeometry args={[0.035, 32]} />
          <meshBasicMaterial color={sceneryCfg.ringColor} />
        </mesh>
      </group>

      {/* --- FLOATING REMOTE CAMERA HEAD RIG (EXACTLY 1.00m ABOVE GROUND) --- */}
      <group ref={headGroupRef} position={[0, 1.0, 0]}>
        {payloadType === 'tennis_racket' ? (
          <CraneTennisRacketHead
            kinematicsRef={kinRef as any}
            autoLevel={autoLevel}
            position={[0, 0, 0]}
            scale={1.0}
            teamColor="#38bdf8"
            stringGlow="#38bdf8"
          />
        ) : (
          <RemoteCameraHead
            headPan={headPan}
            headTilt={headTilt}
            headRoll={headRoll}
            boomTilt={boomTilt}
            autoLevel={autoLevel}
            useCadColors={useCadColors}
            showCableLead={showCables}
            hideMountUmbilical={true}
            hideCamera={payloadType === 'bare_gimbal'}
            kinematicsRef={kinRef as any}
          />
        )}
        <group ref={headTargetRef} position={[0, -0.22, 0]} />
      </group>
    </>
  );
}

// ============================================================================
// MAIN CAMERA HEAD STUDIO COMPONENT & 2D DOM CONTROLS
// ============================================================================

export default function CameraHead() {
  // Kinematic Axes State (S-Head Pure Gimbal Controls)
  const [headPan, setHeadPan] = useState(0);
  const [headTilt, setHeadTilt] = useState(0);
  const [headRoll, setHeadRoll] = useState(0);
  const boomTilt = 0;
  const autoLevel = true;

  // Appearance & Rig Configuration
  const [useCadColors, setUseCadColors] = useState(false);
  const [showCables, setShowCables] = useState(true);
  const [payloadType, setPayloadType] = useState<HeadPayloadType>('arri_alexa');
  const [scenery, setScenery] = useState<HeadStudioScenery>('dark_stage');
  const [activeCam, setActiveCam] = useState<HeadStudioCameraId>('orbit');
  const [autoSpin, setAutoSpin] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'kinematics' | 'presets' | 'camera_rig' | 'telemetry'>('kinematics');
  const [activeRoutine, setActiveRoutine] = useState<HeadMoCoRoutine>('none');

  const orbitRef = useRef<any>(null);
  const routineTimeRef = useRef(0);

  // Automated Routine Animation Loop
  useEffect(() => {
    if (activeRoutine === 'none') return;
    let animFrame: number;
    let lastTime = performance.now();

    const animateRoutine = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      routineTimeRef.current += dt;
      const t = routineTimeRef.current;

      if (activeRoutine === 'pan_sweep') {
        // Continuous 360° pan sweep at 30 deg/sec
        setHeadPan((t * 30) % 360);
      } else if (activeRoutine === 'dutch_flip') {
        // Smooth Dutch Roll wave -90° to +90°
        setHeadRoll(Math.sin(t * 1.5) * 90);
        setHeadTilt(Math.sin(t * 0.8) * 20);
      } else if (activeRoutine === 'nod_shake') {
        // Pan and Tilt calibration test
        setHeadPan(Math.sin(t * 1.2) * 60);
        setHeadTilt(Math.sin(t * 2.0) * 35);
      } else if (activeRoutine === 'lissajous') {
        // Complex 3-axis MoCo figure-8 pattern
        setHeadPan(Math.sin(t * 1.0) * 45);
        setHeadTilt(Math.sin(t * 2.0) * 30);
        setHeadRoll(Math.cos(t * 1.5) * 40);
      }

      animFrame = requestAnimationFrame(animateRoutine);
    };

    animFrame = requestAnimationFrame(animateRoutine);
    return () => cancelAnimationFrame(animFrame);
  }, [activeRoutine]);

  // Quick Preset Actions
  const handleResetAll = () => {
    setActiveRoutine('none');
    setHeadPan(0);
    setHeadTilt(0);
    setHeadRoll(0);
  };

  const handleApplyPreset = (presetName: string) => {
    setActiveRoutine('none');
    switch (presetName) {
      case 'dutch_90':
        setHeadRoll(90);
        setHeadTilt(0);
        break;
      case 'dutch_minus_90':
        setHeadRoll(-90);
        setHeadTilt(0);
        break;
      case 'look_down':
        setHeadTilt(-85);
        setHeadRoll(0);
        break;
      case 'look_up':
        setHeadTilt(60);
        setHeadRoll(0);
        break;
      case 'pan_45_tilt_minus_20':
        setHeadPan(45);
        setHeadTilt(-20);
        setHeadRoll(15);
        break;
      case 'pan_minus_90_tilt_30':
        setHeadPan(-90);
        setHeadTilt(30);
        setHeadRoll(-20);
        break;
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'absolute',
      top: 0,
      left: 0,
      overflow: 'hidden',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      userSelect: 'none'
    }}>
      {/* 3D R3F Canvas Viewport */}
      <Canvas
        shadows
        camera={{ position: [1.35, 1.15, 1.45], fov: 42, near: 0.05, far: 50 }}
        style={{ width: '100%', height: '100%', outline: 'none', background: '#080a10' }}
      >
        <CameraHeadScene
          headPan={headPan}
          headTilt={headTilt}
          headRoll={headRoll}
          boomTilt={boomTilt}
          autoLevel={autoLevel}
          useCadColors={useCadColors}
          showCables={showCables}
          payloadType={payloadType}
          scenery={scenery}
          activeCam={activeCam}
          autoSpin={autoSpin}
          orbitRef={orbitRef}
        />
      </Canvas>

      {/* --- ARRI CINE VIEWFINDER HUD OVERLAY (WHEN IN 'cine' MODE) --- */}
      {activeCam === 'cine' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 32px',
          boxSizing: 'border-box'
        }}>
          {/* 2.39:1 & 16:9 Frame Lines */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85vw',
            height: '35.5vw',
            border: '2px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
            borderRadius: '2px'
          }}>
            {/* Center Crosshair */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 24, height: 24 }}>
              <div style={{ position: 'absolute', top: 11, left: 0, width: 24, height: 2, background: 'rgba(255,255,255,0.8)' }} />
              <div style={{ position: 'absolute', top: 0, left: 11, width: 2, height: 24, background: 'rgba(255,255,255,0.8)' }} />
            </div>
            {/* Frame Guides Corner Markers */}
            <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>2.39:1 SCOPE</div>
            <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, color: '#22c55e', fontFamily: 'monospace', fontWeight: 700 }}>● REC [RAW]</div>
          </div>

          {/* Top Status Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: 'rgba(8, 10, 16, 0.88)',
            backdropFilter: 'blur(12px)',
            padding: '10px 20px',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontFamily: 'monospace',
            fontSize: 13
          }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <span><strong style={{ color: '#38bdf8' }}>FPS:</strong> 24.000</span>
              <span><strong style={{ color: '#38bdf8' }}>SHUTTER:</strong> 180.0°</span>
              <span><strong style={{ color: '#38bdf8' }}>EI:</strong> 800</span>
              <span><strong style={{ color: '#38bdf8' }}>ND:</strong> CLEAR</span>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <span><strong style={{ color: '#f59e0b' }}>LENS:</strong> ARRI Prime DNA 45mm T1.8</span>
              <span><strong style={{ color: '#22c55e' }}>TC:</strong> 01:42:18:12</span>
              <span><strong style={{ color: '#38bdf8' }}>BAT:</strong> 25.4V (88%)</span>
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: 'rgba(8, 10, 16, 0.88)',
            backdropFilter: 'blur(12px)',
            padding: '10px 20px',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#cbd5e1',
            fontFamily: 'monospace',
            fontSize: 12
          }}>
            <div>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>HEAD PAN:</span> {headPan.toFixed(1)}° |&nbsp;
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>TILT:</span> {headTilt.toFixed(1)}° |&nbsp;
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>ROLL:</span> {headRoll.toFixed(1)}°
            </div>
            <div style={{ color: '#94a3b8' }}>
              AUTO-HORIZON: <span style={{ color: autoLevel ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{autoLevel ? 'ACTIVE (GYRO)' : 'LOCKED'}</span> | HÖHE: <span style={{ color: '#38bdf8', fontWeight: 700 }}>1.00 m</span>
            </div>
          </div>
        </div>
      )}

      {/* --- TOP RIGHT SCENERY & CAMERA PRESETS TOOLBAR --- */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 20,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-end'
      }}>
        {/* Scenery Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(11, 16, 28, 0.90)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 30,
          padding: '4px 8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', padding: '0 4px' }}>STUDIO:</span>
          {(Object.keys(SCENERY_CONFIGS) as HeadStudioScenery[]).map(scId => {
            const sc = SCENERY_CONFIGS[scId];
            const isActive = scenery === scId;
            return (
              <button
                key={`scenery-${scId}`}
                onClick={() => setScenery(scId)}
                title={sc.name}
                style={{
                  padding: '4px 8px',
                  borderRadius: 18,
                  border: isActive ? '1px solid #f97316' : '1px solid transparent',
                  background: isActive ? 'rgba(249, 115, 22, 0.22)' : 'transparent',
                  color: isActive ? '#f97316' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{sc.icon}</span>
                <span>{sc.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Camera Perspective Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(11, 16, 28, 0.90)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 30,
          padding: '4px 8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', padding: '0 4px' }}>KAMERA:</span>
          {(Object.keys(HEAD_STUDIO_CAMERAS) as HeadStudioCameraId[]).map(camId => {
            const cam = HEAD_STUDIO_CAMERAS[camId];
            const isActive = activeCam === camId;
            return (
              <button
                key={`cam-${camId}`}
                onClick={() => {
                  setActiveCam(camId);
                  if (camId !== 'orbit') setAutoSpin(false);
                }}
                title={cam.name}
                style={{
                  padding: '4px 10px',
                  borderRadius: 18,
                  border: isActive ? '1px solid #38bdf8' : '1px solid transparent',
                  background: isActive ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{cam.icon}</span>
                <span>{cam.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- QUICK TELEMETRY BADGE (BOTTOM LEFT) --- */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 80,
        background: 'rgba(11, 16, 28, 0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 16,
        padding: '12px 18px',
        color: '#f8fafc',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <span style={{ fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.8px' }}>SUPERTECHNO S-HEAD (1.00m FLOATING)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '4px 16px', fontSize: 11 }}>
          <div><span style={{ color: '#94a3b8' }}>PAN (YAW):</span> <strong style={{ color: '#38bdf8' }}>{headPan.toFixed(1)}°</strong></div>
          <div><span style={{ color: '#94a3b8' }}>TILT (PITCH):</span> <strong style={{ color: '#38bdf8' }}>{headTilt.toFixed(1)}°</strong></div>
          <div><span style={{ color: '#94a3b8' }}>ROLL (DUTCH):</span> <strong style={{ color: '#38bdf8' }}>{headRoll.toFixed(1)}°</strong></div>
          <div><span style={{ color: '#94a3b8' }}>BOOM TILT:</span> <strong style={{ color: '#f59e0b' }}>{boomTilt.toFixed(1)}°</strong></div>
          <div><span style={{ color: '#94a3b8' }}>AUTO-HORIZON:</span> <strong style={{ color: autoLevel ? '#22c55e' : '#ef4444' }}>{autoLevel ? 'ON' : 'OFF'}</strong></div>
          <div><span style={{ color: '#94a3b8' }}>BODENABSTAND:</span> <strong style={{ color: '#38bdf8' }}>1.00 m</strong></div>
        </div>
      </div>

      {/* --- RIGHT SIDE CONTROL DRAWER & KINEMATICS PANEL --- */}
      <div style={{
        position: 'absolute',
        top: 80,
        right: 20,
        width: isDrawerOpen ? 340 : 44,
        maxHeight: 'calc(100vh - 110px)',
        zIndex: 85,
        background: 'rgba(11, 16, 28, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 18,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Drawer Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.10)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          {isDrawerOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎥</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
                CAMERA HEAD CONTROLS
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 16 }}>🎥</span>
          )}

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            {isDrawerOpen ? '✕' : '◀'}
          </button>
        </div>

        {isDrawerOpen && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '12px 14px',
            gap: 14
          }}>
            {/* Navigation Tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 4,
              background: 'rgba(0, 0, 0, 0.3)',
              padding: 3,
              borderRadius: 10
            }}>
              {[
                { id: 'kinematics', label: 'Gelenke', icon: '🕹️' },
                { id: 'presets', label: 'Presets', icon: '⚡' },
                { id: 'camera_rig', label: 'Hardware', icon: '🎛️' },
                { id: 'telemetry', label: 'Telemetrie', icon: '📊' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: 7,
                    border: 'none',
                    background: activeTab === tab.id ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'transparent',
                    color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                    fontSize: 10,
                    fontWeight: activeTab === tab.id ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <span style={{ fontSize: 12 }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* --- TAB 1: KINEMATICS & GIMBAL AXES --- */}
            {activeTab === 'kinematics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Pan (Yaw) Slider */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>1. Pan (Schwenken / Yaw)</span>
                    <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}>{headPan.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-360}
                    max={360}
                    step={1}
                    value={headPan}
                    onChange={e => {
                      setActiveRoutine('none');
                      setHeadPan(parseFloat(e.target.value));
                    }}
                    style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {[-180, -90, 0, 90, 180].map(deg => (
                      <button
                        key={`pan-btn-${deg}`}
                        onClick={() => {
                          setActiveRoutine('none');
                          setHeadPan(deg);
                        }}
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4,
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tilt (Pitch) Slider */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>2. Tilt (Neigen / Pitch)</span>
                    <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}>{headTilt.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-90}
                    max={90}
                    step={1}
                    value={headTilt}
                    onChange={e => {
                      setActiveRoutine('none');
                      setHeadTilt(parseFloat(e.target.value));
                    }}
                    style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {[-90, -45, 0, 45, 90].map(deg => (
                      <button
                        key={`tilt-btn-${deg}`}
                        onClick={() => {
                          setActiveRoutine('none');
                          setHeadTilt(deg);
                        }}
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4,
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Roll (Dutch Roll) Slider */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>3. Roll (Dutch Roll)</span>
                    <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}>{headRoll.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={headRoll}
                    onChange={e => {
                      setActiveRoutine('none');
                      setHeadRoll(parseFloat(e.target.value));
                    }}
                    style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {[-180, -90, 0, 90, 180].map(deg => (
                      <button
                        key={`roll-btn-${deg}`}
                        onClick={() => {
                          setActiveRoutine('none');
                          setHeadRoll(deg);
                        }}
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4,
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upper Mount Rigid Locking Status */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 10, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>🔒</span>
                      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>OBERER MOUNT (MITCHELL/FLANSCH)</span>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      fontSize: 9,
                      fontWeight: 800,
                      borderRadius: 6,
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8'
                    }}>
                      STARR ARRETIERT (0.0°)
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                    Der obere Träger verbleibt starr im Raum. Nur der S-Head artikuliert über Pan, Tilt & Roll.
                  </div>
                </div>

                {/* Zero / Reset All Button */}
                <button
                  onClick={handleResetAll}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#f8fafc',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <span>🔄</span>
                  <span>Gelenke nullen / Reset All</span>
                </button>
              </div>
            )}

            {/* --- TAB 2: AUTOMATION PRESETS & ROUTINES --- */}
            {activeTab === 'presets' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Statische Winkel-Presets
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { id: 'dutch_90', label: '90° Dutch Roll', icon: '🔄' },
                    { id: 'dutch_minus_90', label: '-90° Dutch Roll', icon: '🔁' },
                    { id: 'look_down', label: 'Bird-Eye / Down', icon: '⬇️' },
                    { id: 'look_up', label: 'Worm-Eye / Up', icon: '⬆️' },
                    { id: 'pan_45_tilt_minus_20', label: '45° 3/4 Shot', icon: '📐' },
                    { id: 'pan_minus_90_tilt_30', label: '-90° Pan / 30° Tilt', icon: '📐' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleApplyPreset(p.id)}
                      style={{
                        padding: '8px 6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 8,
                        color: '#e2e8f0',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        textAlign: 'left'
                      }}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 8 }}>
                  MoCo Motion Routinen (Live)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { id: 'pan_sweep', label: 'Continuous 360° Pan Sweep', icon: '🌀', desc: 'Endlose Schleifring-Pan-Fahrt' },
                    { id: 'dutch_flip', label: 'Dutch Horizon Wave (-90°..+90°)', icon: '🌊', desc: 'Dynamische Rollachsen-Welle' },
                    { id: 'nod_shake', label: 'Pan & Tilt Kalibrier-Routine', icon: '🎯', desc: 'Präzisions-Stresstest aller Motoren' },
                    { id: 'lissajous', label: '3-Achs MoCo Figure-8', icon: '♾️', desc: 'Komplexe synchrone 3D-Kamerafahrt' }
                  ].map(r => {
                    const isActive = activeRoutine === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          if (isActive) setActiveRoutine('none');
                          else setActiveRoutine(r.id as any);
                        }}
                        style={{
                          padding: '8px 10px',
                          background: isActive ? 'rgba(249, 115, 22, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                          border: isActive ? '1px solid #f97316' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          color: isActive ? '#f97316' : '#e2e8f0',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{r.icon}</span>
                          <div>
                            <div>{r.label}</div>
                            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 400 }}>{r.desc}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 10 }}>{isActive ? 'STOP ⏹️' : 'START ▶️'}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Turntable Auto-Rotate Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '8px 12px',
                  borderRadius: 10,
                  marginTop: 6
                }}>
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>Studio 360° Drehteller / Turntable:</span>
                  <button
                    onClick={() => setAutoSpin(!autoSpin)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 10,
                      fontWeight: 800,
                      borderRadius: 6,
                      border: 'none',
                      background: autoSpin ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                      color: autoSpin ? '#000000' : '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    {autoSpin ? 'AKTIV' : 'AUS'}
                  </button>
                </div>
              </div>
            )}

            {/* --- TAB 3: CAMERA RIG & PAYLOAD OPTIONS --- */}
            {activeTab === 'camera_rig' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Payload Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Payload / Kamera-Kopf</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { id: 'arri_alexa', label: 'ARRI Alexa Mini LF + Prime DNA', desc: 'Vollständiges Cine-Rig mit FIZ Motoren & Mattebox', icon: '📹' },
                      { id: 'tennis_racket', label: 'Carbon Tennis Racket Head', desc: '16x19 ITF Match-Schläger mit kinetischem Saiten-Glow', icon: '🎾' },
                      { id: 'bare_gimbal', label: 'Bare Gimbal Yoke', desc: 'Reine Gimbal-Mechanik ohne Kamera-Body', icon: '⚙️' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPayloadType(p.id as any)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: payloadType === p.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                          background: payloadType === p.id ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255,255,255,0.03)',
                          color: payloadType === p.id ? '#38bdf8' : '#e2e8f0',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 400, marginTop: 2 }}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles: CAD Colors & Cables */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Darstellung & Texturen</span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 12px',
                    borderRadius: 8
                  }}>
                    <span style={{ fontSize: 11, color: '#cbd5e1' }}>CAD Engineering Farbmodus:</span>
                    <button
                      onClick={() => setUseCadColors(!useCadColors)}
                      style={{
                        padding: '3px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        background: useCadColors ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                        color: useCadColors ? '#000000' : '#cbd5e1',
                        cursor: 'pointer'
                      }}
                    >
                      {useCadColors ? 'CAD AN' : 'FOTO-LOOK'}
                    </button>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 12px',
                    borderRadius: 8
                  }}>
                    <span style={{ fontSize: 11, color: '#cbd5e1' }}>Kabel & SDI-Schleifen:</span>
                    <button
                      onClick={() => setShowCables(!showCables)}
                      style={{
                        padding: '3px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        background: showCables ? '#22c55e' : 'rgba(255,255,255,0.1)',
                        color: showCables ? '#000000' : '#cbd5e1',
                        cursor: 'pointer'
                      }}
                    >
                      {showCables ? 'SICHTBAR' : 'VERSTECKT'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 4: TELEMETRY & SPECS --- */}
            {activeTab === 'telemetry' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace' }}>
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#38bdf8', fontWeight: 800, marginBottom: 4 }}>GIMBAL SPEZIFIKATIONEN</div>
                  <div>• Schwebeposition: 1.00 m über Grund</div>
                  <div>• Pan Range: 360° kontinuierlich</div>
                  <div>• Tilt Range: -90° bis +90°</div>
                  <div>• Roll Range: -180° bis +180°</div>
                  <div>• Max Payload: 35 kg (ARRI 65 fähig)</div>
                  <div>• Absolutwertgeber: 24-Bit optisch</div>
                  <div>• Schleifringe: 12G-SDI + 24V/48V Lemo</div>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#f59e0b', fontWeight: 800, marginBottom: 4 }}>AUTO-HORIZON SPEZIFIKATIONEN</div>
                  <div>• Gyro Ausgleich: ±45° dynamisch</div>
                  <div>• Ansprechzeit: &lt; 5 ms Latency</div>
                  <div>• Mitchell Mount Flansch: Standard 2.75"</div>
                  <div>• Gravur: Laser-Engraved Supertechno</div>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#22c55e', fontWeight: 800, marginBottom: 4 }}>ARRI ALEXA MINI LF SPECS</div>
                  <div>• Sensor: Large Format 4448 x 3096</div>
                  <div>• Lens Mount: LPL Mount mit PL Adapter</div>
                  <div>• Optik: ARRI Prime DNA 45mm T1.8</div>
                  <div>• FIZ Motoren: 3x ARRI Cforce mini RF</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
