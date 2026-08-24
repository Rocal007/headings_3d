import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';
import RemoteCameraHead from './RemoteCameraHead';
import CraneCounterweight from './CraneCounterweight';
import CraneColumnAssembly from './CraneColumnAssembly';
import CraneFulcrumAssembly from './CraneFulcrumAssembly';
import {
  CraneSceneryEnvironment,
  sceneryBgColors,
  sceneryOptions
} from './CraneScenery';
import type { CraneSceneryType } from './CraneScenery';
import {
  getBoomTipDistance
} from '../utils/craneKinematics';
import type {
  TechnocranePacket,
  TechnocraneKeyframe
} from '../utils/technocraneProtocol';
import {
  TECHNODISPLAY_SHOT_PRESETS,
  createTechnocranePacket,
  secondsToSMPTE,
  interpolateKeyframes,
  exportToTechnocraneASCII,
  parseTechnocraneASCII
} from '../utils/technocraneProtocol';

/**
 * 3D Scene Inner Component for Technocrane Studio
 */
function TechnocraneStudioScene({
  kinematics,
  lensData,
  sceneryMode,
  cameraViewMode,
  craneModel
}: {
  kinematics: {
    dollyTrack: number;
    columnElevation: number;
    basePan: number;
    boomTilt: number;
    teleExtension: number;
    headPan: number;
    headTilt: number;
    headRoll: number;
  };
  lensData: {
    focalLengthMm: number;
    focusDistM: number;
    fStop: number;
  };
  sceneryMode: CraneSceneryType;
  cameraViewMode: 'orbit' | 'cine' | 'front_follow';
  craneModel: Supertechno50FBXModel | null;
}) {
  const { camera } = useThree();
  const orbitControlsRef = useRef<any>(null);
  const headGroupRef = useRef<THREE.Group>(null);

  // Update crane model kinematics on each frame
  useFrame(() => {
    if (craneModel && craneModel.isLoaded) {
      craneModel.updateNodes(kinematics);
    }
  });

// ⚡ ZERO-GC SCRATCH OBJECTS FOR REALTIME FRAME LOOPS
const _studioHeadWorldPos = new THREE.Vector3();
const _studioHeadWorldQuat = new THREE.Quaternion();

  // Attach RemoteCameraHead to the crane's dynamic boom tip
  useFrame(() => {
    if (!headGroupRef.current || !craneModel || !craneModel.isLoaded || !craneModel.nodes.beams) return;
    const beamNode = craneModel.nodes.beams;

    beamNode.getWorldPosition(_studioHeadWorldPos);
    beamNode.getWorldQuaternion(_studioHeadWorldQuat);

    headGroupRef.current.position.copy(_studioHeadWorldPos);
    headGroupRef.current.quaternion.copy(_studioHeadWorldQuat);
  });

  // Calculate tip world position for Cine Camera & follow view
  const dollyZ = -(kinematics.dollyTrack || 0);
  const colY = Math.max(1.54, Math.min(3.63, kinematics.columnElevation || 1.54));
  const basePanRad = THREE.MathUtils.degToRad(-kinematics.basePan || 0);
  const boomTiltRad = THREE.MathUtils.degToRad(kinematics.boomTilt || 0);
  const L_front = getBoomTipDistance(kinematics.teleExtension || 0);

  const pivotPos = useMemo(() => new THREE.Vector3(0, colY, dollyZ), [colY, dollyZ]);
  const tipWorldPos = useMemo(() => {
    const tipLocal = new THREE.Vector3(0, 0.05, -L_front);
    tipLocal.applyAxisAngle(new THREE.Vector3(1, 0, 0), boomTiltRad);
    tipLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), basePanRad);
    return pivotPos.clone().add(tipLocal);
  }, [pivotPos, L_front, boomTiltRad, basePanRad]);

  const ext = kinematics.teleExtension || 0;
  const tExt = Math.max(0, Math.min(1.0, ext / 11.3));
  const tipZ = -3.34 - tExt * 11.40;
  const tipY = 0.05;
  const tipX = -0.01;

  // Compute camera rotation from head pan/tilt/roll
  const totalPan = kinematics.basePan + kinematics.headPan;
  const totalTilt = kinematics.boomTilt + kinematics.headTilt;
  const totalRoll = kinematics.headRoll;

  // Sync Camera View Mode
  useFrame(() => {
    if (cameraViewMode === 'cine') {
      // Cine Camera Mode (Looking through ARRI Cine Lens)
      camera.position.set(tipWorldPos.x, tipWorldPos.y - 0.25, tipWorldPos.z);
      
      const rotY = THREE.MathUtils.degToRad(-totalPan + 180);
      const rotX = THREE.MathUtils.degToRad(-totalTilt);
      const rotZ = THREE.MathUtils.degToRad(totalRoll);
      
      camera.rotation.set(0, 0, 0);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = rotY;
      camera.rotation.x = rotX;
      camera.rotation.z = rotZ;

      const sensorHeight = 18.0;
      const fov = THREE.MathUtils.radToDeg(2 * Math.atan(sensorHeight / (2 * Math.max(12, lensData.focalLengthMm))));
      if ((camera as THREE.PerspectiveCamera).fov !== fov) {
        (camera as THREE.PerspectiveCamera).fov = fov;
        camera.updateProjectionMatrix();
      }
    } else if (cameraViewMode === 'front_follow') {
      const offset = new THREE.Vector3(3.5, 1.8, 3.5);
      camera.position.lerp(tipWorldPos.clone().add(offset), 0.1);
      camera.lookAt(tipWorldPos);
    }
  });

  return (
    <>
      {cameraViewMode === 'orbit' && (
        <OrbitControls
          ref={orbitControlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={2.5}
          maxDistance={45}
          maxPolarAngle={Math.PI / 2 + 0.02}
          target={[0, 2.2, -(kinematics.dollyTrack || 0)]}
        />
      )}

      {/* 3D Scenery Environment */}
      <CraneSceneryEnvironment sceneryMode={sceneryMode} />

      {/* Target Focus Subject Marker in 3D Space */}
      <group position={[0, 1.2, -6.0]}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 1.5, 32]} />
          <meshStandardMaterial color="#facc15" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.7, 0]} castShadow>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>

      {/* Crane Base FBX Model */}
      {craneModel && craneModel.isLoaded && (
        <primitive object={craneModel.group} />
      )}

      {/* Hydraulic Lift Column */}
      <CraneColumnAssembly
        kinematics={kinematics}
        visible={true}
      />

      {/* Fulcrum Pivot Yoke */}
      <CraneFulcrumAssembly
        crane={craneModel}
        kinematics={kinematics}
        visible={true}
      />

      {/* Counterweight Mass Compensation Sled */}
      <CraneCounterweight
        crane={craneModel}
        kinematics={kinematics}
        visible={true}
      />

      {/* Dynamic Remote Camera Head Group (Locked to Boom Tip) */}
      <group ref={headGroupRef}>
        <RemoteCameraHead
          headPan={kinematics.headPan}
          headTilt={kinematics.headTilt}
          headRoll={kinematics.headRoll}
          boomTilt={kinematics.boomTilt}
          autoLevel={true}
          position={[tipX, tipY, tipZ]}
          scale={1.0}
        />
      </group>
    </>
  );
}

/**
 * Main Technocrane Studio Component
 */
export default function TechnocraneStudio() {
  const [craneModel, setCraneModel] = useState<Supertechno50FBXModel | null>(null);

  useEffect(() => {
    const model = new Supertechno50FBXModel(() => {
      setCraneModel(model);
    });
    return () => {
      model.dispose();
    };
  }, []);

  // MoCo & Keyframe Sequencer State
  const [activePresetId, setActivePresetId] = useState<string>('hero-reveal');
  const [keyframes, setKeyframes] = useState<TechnocraneKeyframe[]>(TECHNODISPLAY_SHOT_PRESETS[0].keyframes);
  const [sequenceDuration, setSequenceDuration] = useState<number>(TECHNODISPLAY_SHOT_PRESETS[0].durationSec);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0.0);
  const [isRecordingLive, setIsRecordingLive] = useState<boolean>(false);

  // View & UI State
  const [cameraViewMode, setCameraViewMode] = useState<'orbit' | 'cine' | 'front_follow'>('orbit');
  const [sceneryMode, setSceneryMode] = useState<CraneSceneryType>('bright_studio');
  const [showFrameGuides, setShowFrameGuides] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'moco' | 'telemetry' | 'lens' | 'export'>('moco');

  // Recorded Packets Buffer for .cgi export
  const recordedPacketsRef = useRef<TechnocranePacket[]>([]);

  // Compute interpolated crane pose at currentTimeSec
  const currentPose = useMemo(() => {
    return interpolateKeyframes(keyframes, currentTimeSec);
  }, [keyframes, currentTimeSec]);

  // Compute live Technocrane Packet
  const frameIndex = Math.floor(currentTimeSec * 24);
  const currentPacket = useMemo(() => {
    return createTechnocranePacket(
      frameIndex,
      currentTimeSec,
      currentPose,
      isPlaying,
      isRecordingLive
    );
  }, [frameIndex, currentTimeSec, currentPose, isPlaying, isRecordingLive]);

  // Animation Loop for MoCo Playback
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        setCurrentTimeSec(prevTime => {
          let nextTime = prevTime + deltaSec * playbackSpeed;
          if (nextTime >= sequenceDuration) {
            if (isLooping) {
              nextTime = 0.0;
            } else {
              setIsPlaying(false);
              return sequenceDuration;
            }
          }
          return nextTime;
        });

        // Record live packet buffer if in recording mode
        if (isRecordingLive) {
          recordedPacketsRef.current.push(currentPacket);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isLooping, playbackSpeed, sequenceDuration, isRecordingLive, currentPacket]);

  // Handle Preset Switching
  const handleSelectPreset = (presetId: string) => {
    const preset = TECHNODISPLAY_SHOT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setActivePresetId(preset.id);
      setKeyframes([...preset.keyframes]);
      setSequenceDuration(preset.durationSec);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    }
  };

  // Add Keyframe at Current Pose
  const handleAddKeyframe = () => {
    const tc = secondsToSMPTE(currentTimeSec, 24);
    const newKf: TechnocraneKeyframe = {
      id: `user-kf-${Date.now()}`,
      time: Number(currentTimeSec.toFixed(2)),
      timecode: tc.string,
      dollyTrack: Number(currentPose.dollyTrack.toFixed(3)),
      columnElevation: Number(currentPose.columnElevation.toFixed(3)),
      basePan: Number(currentPose.basePan.toFixed(2)),
      boomTilt: Number(currentPose.boomTilt.toFixed(2)),
      teleExtension: Number(currentPose.teleExtension.toFixed(3)),
      headPan: Number(currentPose.headPan.toFixed(2)),
      headTilt: Number(currentPose.headTilt.toFixed(2)),
      headRoll: Number(currentPose.headRoll.toFixed(2)),
      focalLengthMm: Number(currentPose.focalLengthMm.toFixed(1)),
      focusDistM: Number(currentPose.focusDistM.toFixed(2)),
      fStop: Number(currentPose.fStop.toFixed(1))
    };

    const updated = keyframes.filter(k => Math.abs(k.time - currentTimeSec) > 0.05);
    updated.push(newKf);
    updated.sort((a, b) => a.time - b.time);
    setKeyframes(updated);
  };

  // Delete Keyframe
  const handleDeleteKeyframe = (id: string) => {
    if (keyframes.length <= 1) return;
    setKeyframes(keyframes.filter(k => k.id !== id));
  };

  // Export .cgi ASCII Stream File
  const handleExportCGI = () => {
    const totalFrames = Math.floor(sequenceDuration * 24);
    const packets: TechnocranePacket[] = [];

    for (let f = 0; f <= totalFrames; f++) {
      const t = f / 24.0;
      const pose = interpolateKeyframes(keyframes, t);
      packets.push(createTechnocranePacket(f, t, pose, true, false));
    }

    const cgiContent = exportToTechnocraneASCII(packets);
    const blob = new Blob([cgiContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `technocrane_${activePresetId}_${Date.now()}.cgi`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import .cgi File
  const handleImportCGI = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const importedKfs = parseTechnocraneASCII(content);
        if (importedKfs.length > 0) {
          const step = Math.max(1, Math.floor(importedKfs.length / 12));
          const filtered = importedKfs.filter((_, idx) => idx % step === 0 || idx === importedKfs.length - 1);
          setKeyframes(filtered);
          const maxT = filtered[filtered.length - 1].time;
          setSequenceDuration(Math.max(2.0, maxT));
          setCurrentTimeSec(0);
          setIsPlaying(true);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* --- 3D CANVAS VIEWPORT --- */}
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      >
        <color attach="background" args={[sceneryBgColors[sceneryMode] || '#090d16']} />
        <PerspectiveCamera makeDefault position={[10, 6, 12]} fov={50} near={0.1} far={400} />
        
        <TechnocraneStudioScene
          kinematics={currentPose}
          lensData={{
            focalLengthMm: currentPose.focalLengthMm,
            focusDistM: currentPose.focusDistM,
            fStop: currentPose.fStop
          }}
          sceneryMode={sceneryMode}
          cameraViewMode={cameraViewMode}
          craneModel={craneModel}
        />
      </Canvas>

      {/* --- CINE VIEWFINDER FRAME OVERLAYS (When in Cine View) --- */}
      {cameraViewMode === 'cine' && showFrameGuides && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          {/* Anamorphic Letterbox 2.39:1 */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '12%', background: 'rgba(0,0,0,0.85)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '12%', background: 'rgba(0,0,0,0.85)' }} />
          
          {/* 16:9 Inner Frame Box */}
          <div style={{
            position: 'absolute',
            top: '12%',
            left: '10%',
            right: '10%',
            bottom: '12%',
            border: '1px solid rgba(250, 204, 21, 0.45)',
            boxSizing: 'border-box'
          }}>
            {/* Center Crosshair */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '24px', height: '2px', background: 'rgba(250, 204, 21, 0.7)', transform: 'translate(-50%, -50%)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '2px', height: '24px', background: 'rgba(250, 204, 21, 0.7)', transform: 'translate(-50%, -50%)' }} />
            
            {/* Rule of Thirds Guides */}
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* ARRI Viewfinder OSD Header & Footer */}
          <div style={{ position: 'absolute', top: '14px', left: '24px', display: 'flex', gap: '16px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 800, color: '#facc15' }}>
            <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>● REC</span>
            <span>FPS: 24.00</span>
            <span>SHUTTER: 180.0°</span>
            <span>EI: 800</span>
            <span>WB: 5600K</span>
          </div>

          <div style={{ position: 'absolute', top: '14px', right: '24px', fontSize: '18px', fontFamily: 'monospace', fontWeight: 900, color: '#facc15' }}>
            TC: {currentPacket.timecodeString}
          </div>

          <div style={{ position: 'absolute', bottom: '16px', left: '24px', display: 'flex', gap: '24px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
            <span>LENS: {currentPose.focalLengthMm.toFixed(0)}mm</span>
            <span>IRIS: T{currentPose.fStop.toFixed(1)}</span>
            <span>FOCUS: {currentPose.focusDistM.toFixed(1)}m</span>
            <span>ZOOM: {((currentPose.focalLengthMm / 24) * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* --- TOP BRANDING & MODE HEADER --- */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 200,
        right: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 40,
        pointerEvents: 'auto'
      }}>
        {/* Title & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <span style={{ fontSize: '18px' }}>🎬</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#facc15', letterSpacing: '0.5px' }}>
              TECHNOCRANE VP & MOTION-CONTROL STUDIO
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Supertechno 50+ CGI Protocol Engine (cgidata v2) • 24 FPS SMPTE
            </div>
          </div>
          <span style={{ marginLeft: '8px', fontSize: '10px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid rgba(34, 197, 94, 0.4)' }}>
            ● SYNC 0x7F7A5AA5 OK
          </span>
        </div>

        {/* Camera Perspective & Environment Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', padding: '6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <button
            onClick={() => setCameraViewMode('orbit')}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: cameraViewMode === 'orbit' ? '1px solid #facc15' : '1px solid transparent',
              background: cameraViewMode === 'orbit' ? 'rgba(250, 204, 21, 0.2)' : 'transparent',
              color: cameraViewMode === 'orbit' ? '#facc15' : '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            🎥 3D Orbit Studio
          </button>

          <button
            onClick={() => setCameraViewMode('cine')}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: cameraViewMode === 'cine' ? '1px solid #38bdf8' : '1px solid transparent',
              background: cameraViewMode === 'cine' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: cameraViewMode === 'cine' ? '#38bdf8' : '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            🎯 ARRI Cine Viewfinder
          </button>

          <button
            onClick={() => setCameraViewMode('front_follow')}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: cameraViewMode === 'front_follow' ? '1px solid #4ade80' : '1px solid transparent',
              background: cameraViewMode === 'front_follow' ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
              color: cameraViewMode === 'front_follow' ? '#4ade80' : '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            🚁 Boom Follow
          </button>

          {cameraViewMode === 'cine' && (
            <button
              onClick={() => setShowFrameGuides(!showFrameGuides)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: showFrameGuides ? 'rgba(250, 204, 21, 0.2)' : 'transparent',
                color: showFrameGuides ? '#facc15' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              📐 Grid
            </button>
          )}
        </div>
      </div>

      {/* --- LEFT SIDEBAR: MOTION CONTROL / KEYFRAMES / TELEMETRY / EXPORT --- */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: 20,
        width: '380px',
        maxHeight: 'calc(100vh - 220px)',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
        overflow: 'hidden'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
          {[
            { id: 'moco', label: '🎬 MoCo', desc: 'Sequencer' },
            { id: 'telemetry', label: '📡 Data', desc: 'CGI Packets' },
            { id: 'lens', label: '🔍 FIZ', desc: 'Optik' },
            { id: 'export', label: '💾 .CGI', desc: 'I/O Export' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 4px',
                fontSize: '11px',
                fontWeight: 700,
                background: activeTab === tab.id ? 'rgba(250, 204, 21, 0.15)' : 'transparent',
                color: activeTab === tab.id ? '#facc15' : '#94a3b8',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #facc15' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              <div>{tab.label}</div>
              <div style={{ fontSize: '9px', fontWeight: 400, opacity: 0.8 }}>{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '14px', overflowY: 'auto', flex: 1, fontSize: '11px' }}>
          
          {/* TAB 1: MOCO SEQUENCER & PRESETS */}
          {activeTab === 'moco' && (
            <div>
              <div style={{ fontWeight: 800, color: '#facc15', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>🎯 Hollywood MoCo Shot Presets</span>
                <span style={{ color: '#94a3b8', fontWeight: 400 }}>{keyframes.length} Keyframes</span>
              </div>

              {/* Preset Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                {TECHNODISPLAY_SHOT_PRESETS.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: activePresetId === p.id ? 'rgba(250, 204, 21, 0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${activePresetId === p.id ? '#facc15' : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: activePresetId === p.id ? '#facc15' : '#e2e8f0' }}>
                      <span>{p.name}</span>
                      <span style={{ fontSize: '10px', color: '#38bdf8' }}>{p.durationSec}s</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '3px', lineHeight: '1.3' }}>
                      {p.description}
                    </div>
                  </div>
                ))}
              </div>

              {/* Scenery Selector */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: '6px' }}>🌍 3D Umgebung</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {sceneryOptions.slice(0, 4).map(sc => (
                    <button
                      key={sc.id}
                      onClick={() => setSceneryMode(sc.id)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '9px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: sceneryMode === sc.id ? `1px solid ${sc.color}` : '1px solid rgba(255,255,255,0.1)',
                        background: sceneryMode === sc.id ? `${sc.color}25` : 'rgba(255,255,255,0.03)',
                        color: sceneryMode === sc.id ? sc.color : '#cbd5e1',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {sc.icon} {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyframes Manager */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>📍 Timeline Keyframes</span>
                  <button
                    onClick={handleAddKeyframe}
                    style={{
                      background: '#38bdf8',
                      color: '#0f172a',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    + Keyframe setzen
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                  {keyframes.map((kf, i) => (
                    <div
                      key={kf.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        borderLeft: `3px solid ${Math.abs(kf.time - currentTimeSec) < 0.2 ? '#facc15' : '#475569'}`
                      }}
                    >
                      <span
                        onClick={() => setCurrentTimeSec(kf.time)}
                        style={{ cursor: 'pointer', color: '#facc15', fontWeight: 700, fontFamily: 'monospace' }}
                      >
                        #{i + 1} • {kf.time.toFixed(1)}s ({kf.timecode})
                      </span>
                      <span style={{ fontSize: '9px', color: '#94a3b8' }}>
                        D:{kf.dollyTrack.toFixed(1)}m | T:{kf.teleExtension.toFixed(1)}m | {kf.focalLengthMm}mm
                      </span>
                      <button
                        onClick={() => handleDeleteKeyframe(kf.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 800, fontSize: '11px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE TECHNOCRANE PROTOCOL TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div>
              <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
                📡 Live Technocrane Protocol Telemetrie
              </div>

              <div style={{ background: '#020617', padding: '8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '10px', border: '1px solid rgba(56,189,248,0.3)', marginBottom: '10px' }}>
                <div style={{ color: '#4ade80' }}>HEADER: 0x{currentPacket.syncVal.toString(16).toUpperCase()} (SYNC VALID)</div>
                <div style={{ color: '#facc15' }}>PACKET: #{currentPacket.packetNumber} | FRAME: #{currentPacket.frameNumber}</div>
                <div style={{ color: '#e2e8f0' }}>SMPTE TC: {currentPacket.timecodeString}</div>
                <div style={{ color: '#94a3b8' }}>TIME SEC: {currentPacket.timeSeconds.toFixed(3)}s</div>
              </div>

              {/* 6-DOF Cartesian */}
              <div style={{ fontWeight: 700, color: '#facc15', marginBottom: '4px' }}>📐 6-DOF Kartesisch (Weltkoordinaten)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '10px', fontFamily: 'monospace', fontSize: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>X: <strong style={{ color: '#38bdf8' }}>{currentPacket.cartesian.x.toFixed(3)}m</strong></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Y: <strong style={{ color: '#38bdf8' }}>{currentPacket.cartesian.y.toFixed(3)}m</strong></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Z: <strong style={{ color: '#38bdf8' }}>{currentPacket.cartesian.z.toFixed(3)}m</strong></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Pan: <strong style={{ color: '#4ade80' }}>{currentPacket.cartesian.pan.toFixed(1)}°</strong></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Tilt: <strong style={{ color: '#4ade80' }}>{currentPacket.cartesian.tilt.toFixed(1)}°</strong></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Roll: <strong style={{ color: '#4ade80' }}>{currentPacket.cartesian.roll.toFixed(1)}°</strong></div>
              </div>

              {/* Polar Coordinates */}
              <div style={{ fontWeight: 700, color: '#facc15', marginBottom: '4px' }}>🏗️ Kran Polar-Kinematik</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', fontFamily: 'monospace', fontSize: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Teleskop: <strong style={{ color: '#facc15' }}>{currentPacket.polar.tele.toFixed(2)}m</strong></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Schiene (Track): <strong style={{ color: '#facc15' }}>{currentPacket.polar.track.toFixed(2)}m</strong></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Säulenschwenk: <strong style={{ color: '#38bdf8' }}>{currentPacket.polar.basePan.toFixed(1)}°</strong></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px' }}>Ausleger-Tilt: <strong style={{ color: '#38bdf8' }}>{currentPacket.polar.boomTilt.toFixed(1)}°</strong></div>
              </div>
            </div>
          )}

          {/* TAB 3: LENS FIZ CONTROLS */}
          {activeTab === 'lens' && (
            <div>
              <div style={{ fontWeight: 800, color: '#facc15', marginBottom: '8px' }}>
                🔍 ARRI Cinema FIZ Linsen-Mapping
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
                    <span>Brennweite (Zoom):</span>
                    <strong>{currentPose.focalLengthMm.toFixed(0)} mm</strong>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="105"
                    step="1"
                    value={currentPose.focalLengthMm}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      const updated = keyframes.map(k => ({ ...k, focalLengthMm: v }));
                      setKeyframes(updated);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80' }}>
                    <span>Fokus-Distanz:</span>
                    <strong>{currentPose.focusDistM.toFixed(1)} m</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.1"
                    value={currentPose.focusDistM}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      const updated = keyframes.map(k => ({ ...k, focusDistM: v }));
                      setKeyframes(updated);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15' }}>
                    <span>Blende (Iris):</span>
                    <strong>T{currentPose.fStop.toFixed(1)}</strong>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="16"
                    step="0.1"
                    value={currentPose.fStop}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      const updated = keyframes.map(k => ({ ...k, fStop: v }));
                      setKeyframes(updated);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CGI IMPORT / EXPORT */}
          {activeTab === 'export' && (
            <div>
              <div style={{ fontWeight: 800, color: '#facc15', marginBottom: '8px' }}>
                💾 Technocrane Datei I/O (.cgi Stream)
              </div>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '12px', lineHeight: '1.4' }}>
                Exportiere die generierte MoCo-Fahrt als standardkonforme Technocrane <code>.cgi</code> Datei für Maya, Unreal Engine Sequencer, Disguise oder Technocrane Trimmer.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={handleExportCGI}
                  style={{
                    background: '#facc15',
                    color: '#0f172a',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📥</span> <span>Download .CGI Datei (Technocrane Stream)</span>
                </button>

                <label
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px dashed rgba(56, 189, 248, 0.4)',
                    padding: '10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '11px'
                  }}
                >
                  <span>📂 .CGI Tracking-Stream importieren</span>
                  <input type="file" accept=".cgi,.txt" onChange={handleImportCGI} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- BOTTOM TIMELINE & TRANSPORT CONTROL BAR --- */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '12px 20px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Top Transport Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Play/Pause & Speed Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setCurrentTimeSec(0)}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              ⏮ Start
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? '#ef4444' : '#facc15',
                color: '#0f172a',
                border: 'none',
                padding: '6px 18px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: '13px'
              }}
            >
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY MOCO'}
            </button>
            <button
              onClick={() => setIsLooping(!isLooping)}
              style={{
                background: isLooping ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.08)',
                color: isLooping ? '#4ade80' : '#94a3b8',
                border: `1px solid ${isLooping ? '#4ade80' : 'rgba(255,255,255,0.15)'}`,
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '11px'
              }}
            >
              🔁 Loop
            </button>
            <button
              onClick={() => setIsRecordingLive(!isRecordingLive)}
              style={{
                background: isRecordingLive ? '#dc2626' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: `1px solid ${isRecordingLive ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '11px'
              }}
            >
              {isRecordingLive ? '🔴 REC LIVE' : '⚪ REC'}
            </button>

            {/* Speed Multiplier */}
            <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
              {[0.5, 1.0, 1.5, 2.0].map(spd => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  style={{
                    background: playbackSpeed === spd ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                    color: playbackSpeed === spd ? '#0f172a' : '#cbd5e1',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* SMPTE Timecode Counter */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', fontFamily: 'monospace' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>TIMECODE:</span>
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#facc15', letterSpacing: '1px' }}>
              {currentPacket.timecodeString}
            </span>
            <span style={{ fontSize: '12px', color: '#38bdf8' }}>
              ({currentTimeSec.toFixed(2)}s / {sequenceDuration.toFixed(1)}s)
            </span>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>0.0s</span>
          <input
            type="range"
            min="0"
            max={sequenceDuration}
            step="0.02"
            value={currentTimeSec}
            onChange={e => setCurrentTimeSec(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#facc15', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{sequenceDuration.toFixed(1)}s</span>
        </div>
      </div>

    </div>
  );
}
