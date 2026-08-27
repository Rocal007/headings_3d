import { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  ReadyPlayerMeAvatar
} from './ReadyPlayerMeAvatar';
import {
  RPM_PRESETS,
  SAVED_RPM_URL_KEY,
  SAVED_RPM_PRESET_KEY,
  type RpmAvatarPreset,
  type AvatarPose,
  type AvatarMorphSettings
} from './readyPlayerMePresets';

interface ReadyPlayerMeStudioProps {
  onApplyToCrane?: (avatarUrl: string) => void;
  onApplyToTennis?: (avatarUrl: string) => void;
}

/**
 * 3D Studio Stage & Lighting Environment
 */
function StudioStage({
  avatarUrl,
  presetId,
  pose,
  morphSettings,
  onStatsReady
}: {
  avatarUrl: string;
  presetId?: string;
  pose: AvatarPose;
  morphSettings: AvatarMorphSettings;
  onStatsReady: (stats: { bonesCount: number; morphsCount: number; verticesCount: number; isFallback?: boolean }) => void;
}) {
  return (
    <>
      {/* 🌟 3-Point Studio Lighting */}
      <ambientLight intensity={0.7} />
      {/* Key Light (Warm Front) */}
      <directionalLight
        position={[2.5, 4.0, 3.0]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      {/* Fill Light (Cool Side) */}
      <directionalLight position={[-3.0, 2.5, 2.0]} intensity={0.9} color="#38bdf8" />
      {/* Rim / Back Light (Sharp Golden Edge) */}
      <directionalLight position={[0.0, 3.5, -3.5]} intensity={2.2} color="#e5c500" />

      {/* 🛸 Studio Podest / Turntable */}
      <group position={[0, -0.02, 0]}>
        {/* Main Base Cylinder */}
        <mesh receiveShadow position={[0, -0.05, 0]}>
          <cylinderGeometry args={[1.35, 1.45, 0.1, 48]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.85} />
        </mesh>

        {/* Outer Glowing Neon Ring */}
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.34, 1.38, 48]} />
          <meshBasicMaterial color="#38bdf8" toneMapped={false} />
        </mesh>

        {/* Inner Tech Decal Ring */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.72, 36]} />
          <meshBasicMaterial color="#e5c500" opacity={0.6} transparent />
        </mesh>

        {/* Center Target Cross */}
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.12, 16]} />
          <meshBasicMaterial color="#64748b" opacity={0.4} transparent />
        </mesh>
      </group>

      {/* 👤 Ready Player Me Avatar (mit 100% Offline-Safe Fallback) */}
      <Suspense fallback={<AvatarLoadingPlaceholder />}>
        <ReadyPlayerMeAvatar
          url={avatarUrl}
          presetId={presetId}
          pose={pose}
          morphSettings={morphSettings}
          position={[0, 0, 0]}
          scale={1.0}
          onStatsReady={onStatsReady}
        />
      </Suspense>
    </>
  );
}

/**
 * Holographic Loading Wireframe
 */
function AvatarLoadingPlaceholder() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group position={[0, 0.9, 0]}>
      <mesh ref={meshRef}>
        <capsuleGeometry args={[0.24, 1.2, 8, 16]} />
        <meshBasicMaterial color="#38bdf8" wireframe opacity={0.5} transparent />
      </mesh>
      {/* Floating loading glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <ringGeometry args={[0.4, 0.45, 32]} />
        <meshBasicMaterial color="#e5c500" />
      </mesh>
    </group>
  );
}

export function ReadyPlayerMeStudio({ onApplyToCrane, onApplyToTennis }: ReadyPlayerMeStudioProps) {
  // Active avatar URL state
  const [activeUrl, setActiveUrl] = useState<string>(() => {
    const savedUrl = localStorage.getItem(SAVED_RPM_URL_KEY);
    return savedUrl || RPM_PRESETS[0].url;
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    const savedId = localStorage.getItem(SAVED_RPM_PRESET_KEY);
    return savedId || RPM_PRESETS[0].id;
  });

  const [customInputUrl, setCustomInputUrl] = useState<string>('');
  const [activePose, setActivePose] = useState<AvatarPose>('idle');
  const [isCreatorOpen, setIsCreatorOpen] = useState<boolean>(false);
  const [isPosesOpen, setIsPosesOpen] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Avatar stats
  const [avatarStats, setAvatarStats] = useState<{
    bonesCount: number;
    morphsCount: number;
    verticesCount: number;
    isFallback?: boolean;
  }>({ bonesCount: 0, morphsCount: 0, verticesCount: 0, isFallback: false });

  // Facial morph settings
  const [morphSettings, setMorphSettings] = useState<AvatarMorphSettings>({
    smile: 0,
    blink: 0,
    jawOpen: 0,
    browUp: 0,
    winkLeft: 0,
    winkRight: 0,
    autoBlink: true
  });

  // Camera Orbit Controls ref
  const controlsRef = useRef<any>(null);

  // Show Toast Banner
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch preset
  const handleSelectPreset = (preset: RpmAvatarPreset) => {
    setSelectedPresetId(preset.id);
    setActiveUrl(preset.url);
    setActivePose(preset.initialPose);
    localStorage.setItem(SAVED_RPM_PRESET_KEY, preset.id);
    localStorage.setItem(SAVED_RPM_URL_KEY, preset.url);
    showToast(`Avatar gewechselt: ${preset.name} (${preset.role})`);
  };

  // Load custom URL
  const handleLoadCustomUrl = () => {
    let cleanUrl = customInputUrl.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http')) {
      // Allow passing just the ID e.g. "6460d35a9ae3d45ddfc82bff"
      cleanUrl = `https://models.readyplayer.me/${cleanUrl}.glb`;
    }

    if (!cleanUrl.includes('morphTargets')) {
      const sep = cleanUrl.includes('?') ? '&' : '?';
      cleanUrl = `${cleanUrl}${sep}morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024`;
    }

    setActiveUrl(cleanUrl);
    setSelectedPresetId('custom');
    localStorage.setItem(SAVED_RPM_URL_KEY, cleanUrl);
    localStorage.setItem(SAVED_RPM_PRESET_KEY, 'custom');
    showToast('Eigener Ready Player Me Avatar erfolgreich geladen!');
    setCustomInputUrl('');
  };

  // Listen to Ready Player Me Web Creator events (postMessage)
  useEffect(() => {
    const handleRpmMessage = (event: MessageEvent) => {
      try {
        const json = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // Ready Player Me Creator events
        if (json?.source === 'readyplayerme') {
          if (json.eventName === 'v1.avatar.exported') {
            let exportedUrl = json.data.url;
            if (!exportedUrl.includes('morphTargets')) {
              exportedUrl = `${exportedUrl}?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024`;
            }
            setActiveUrl(exportedUrl);
            setSelectedPresetId('custom');
            localStorage.setItem(SAVED_RPM_URL_KEY, exportedUrl);
            localStorage.setItem(SAVED_RPM_PRESET_KEY, 'custom');
            setIsCreatorOpen(false);
            showToast('🎉 Dein eigener 3D-Avatar wurde erfolgreich erstellt und geladen!');
          }

          if (json.eventName === 'v1.frame.ready') {
            // iframe initialized and ready
          }
        }
      } catch (err) {
        // Non-JSON postMessage ignored
      }
    };

    window.addEventListener('message', handleRpmMessage);
    return () => window.removeEventListener('message', handleRpmMessage);
  }, []);

  // Camera presets
  const setCameraPreset = (type: 'full' | 'face' | 'upper') => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (type === 'full') {
      ctrl.target.set(0, 0.9, 0);
      ctrl.object.position.set(0, 1.1, 2.8);
    } else if (type === 'face') {
      ctrl.target.set(0, 1.58, 0);
      ctrl.object.position.set(0, 1.62, 0.85);
    } else if (type === 'upper') {
      ctrl.target.set(0, 1.25, 0);
      ctrl.object.position.set(0, 1.35, 1.6);
    }
    ctrl.update();
  };

  const poses: { id: AvatarPose; label: string; icon: string }[] = [
    { id: 'idle', label: 'Idle / Atmung', icon: '🧘' },
    { id: 'walk', label: 'Gehen (Walk)', icon: '🚶' },
    { id: 'crane_rear', label: 'Kran-Heckpult', icon: '🎬' },
    { id: 'crane_desk', label: 'DoP Bodenpult', icon: '🎛️' },
    { id: 'tennis_ready', label: 'Tennis Ready', icon: '🎾' },
    { id: 'tennis_serve', label: 'Aufschlag', icon: '⚡' },
    { id: 'wave', label: 'Winken', icon: '👋' },
    { id: 'dance', label: 'Dance Groove', icon: '🕺' },
    { id: 'driving', label: 'LKW Fahren', icon: '🚚' }
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'radial-gradient(circle at center, #1e293b 0%, #090d16 100%)',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      color: '#f8fafc',
      userSelect: 'none'
    }}>
      {/* 🚀 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 1.2, 2.6], fov: 42 }}
        style={{ width: '100%', height: '100%' }}
      >
        <OrbitControls
          ref={controlsRef}
          target={[0, 0.95, 0]}
          minDistance={0.6}
          maxDistance={5.0}
          maxPolarAngle={Math.PI / 2 + 0.05}
          enableDamping
          dampingFactor={0.08}
        />
        <StudioStage
          avatarUrl={activeUrl}
          presetId={selectedPresetId}
          pose={activePose}
          morphSettings={morphSettings}
          onStatsReady={setAvatarStats}
        />
      </Canvas>

      {/* 🍞 Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.94)',
          border: '1px solid #38bdf8',
          boxShadow: '0 8px 32px rgba(56, 189, 248, 0.35)',
          padding: '12px 24px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          color: '#38bdf8',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'fadeIn 0.3s ease'
        }}>
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 🎩 Top Header & Preset Bar */}
      <div style={{
        position: 'absolute',
        top: 76,
        left: 20,
        right: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        pointerEvents: 'none',
        zIndex: 50
      }}>
        {/* Left: Preset Selector */}
        <div style={{
          pointerEvents: 'auto',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 16,
          padding: '12px 16px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
          maxWidth: 680
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🧑</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.5px' }}>
                READY PLAYER ME AVATAR ENGINE
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Wähle einen Charakter oder erstelle deinen eigenen 3D-Avatar im Creator
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {RPM_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: isSelected ? `1.5px solid ${preset.badgeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? `${preset.badgeColor}22` : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isSelected ? 800 : 600,
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 16px ${preset.badgeColor}44` : 'none'
                  }}
                >
                  <span style={{ fontSize: 16 }}>{preset.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div>{preset.name}</div>
                    <div style={{ fontSize: 9, color: isSelected ? preset.badgeColor : '#64748b' }}>{preset.role}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Creator CTA Button */}
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIsCreatorOpen(true)}
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
              color: '#031726',
              fontWeight: 900,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(56, 189, 248, 0.45)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          >
            <span style={{ fontSize: 16 }}>✨</span>
            <span>EIGENEN AVATAR ERSTELLEN</span>
          </button>
        </div>
      </div>

      {/* 🕹️ Left Floating Panel Toggle Button (When Closed) */}
      {!isPosesOpen && (
        <button
          onClick={() => setIsPosesOpen(true)}
          className="drawer-toggle-btn"
          style={{
            position: 'absolute',
            top: '210px',
            left: '20px',
            zIndex: 90,
            border: '1px solid rgba(229, 197, 0, 0.45)',
            color: '#e5c500'
          }}
          title="Posen & Kinematik öffnen"
          aria-label="Posen öffnen"
        >
          <span>🕹️</span>
          <span>Posen & Kinematik</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>▶</span>
        </button>
      )}

      {/* 🕹️ Left Floating Panel: Poses & Actions (Slide-Out) */}
      <div 
        className={`slide-drawer-left custom-scrollbar ${isPosesOpen ? 'open' : 'closed'}`}
        style={{
          position: 'absolute',
          top: 210,
          left: 20,
          width: 'min(290px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 230px)',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 16,
          padding: '14px 16px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 90
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#e5c500', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Kinematik & Posen
          </div>
          <button
            onClick={() => setIsPosesOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 4,
              color: '#94a3b8',
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Panel schließen"
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {poses.map((p) => {
            const isActive = activePose === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePose(p.id)}
                style={{
                  padding: '7px 8px',
                  borderRadius: 8,
                  border: isActive ? '1px solid #e5c500' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive ? 'rgba(229, 197, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#e5c500' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: isActive ? 800 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  textAlign: 'left'
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Camera Views */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 6 }}>
            Kamera-Perspektive:
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setCameraPreset('full')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#e2e8f0',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              👤 Total
            </button>
            <button
              onClick={() => setCameraPreset('upper')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#e2e8f0',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🥋 Oberkörper
            </button>
            <button
              onClick={() => setCameraPreset('face')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#e2e8f0',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🧑 Gesicht
            </button>
          </div>
        </div>

        {/* Transfer to Scene Actions */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', marginBottom: 2 }}>
            Avatar in Szenen übertragen:
          </div>
          <button
            onClick={() => {
              try {
                localStorage.setItem('supertechno_crane_use_rpm', 'true');
                localStorage.setItem('supertechno_rpm_custom_url', activeUrl);
                localStorage.setItem('supertechno_rpm_active_preset_id', selectedPresetId);
                localStorage.setItem('supertechno_crane_auto_op', 'true');
              } catch (e) {
                console.error(e);
              }
              if (onApplyToCrane) onApplyToCrane(activeUrl);
              showToast('🏗️ Avatar als Supertechno 50 Kranführer zugewiesen!');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(56, 189, 248, 0.4)',
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>🏗️</span>
            <span>Als Kran-Operator zuweisen</span>
          </button>
          <button
            onClick={() => {
              try {
                localStorage.setItem('supertechno_tennis_use_rpm', 'true');
                localStorage.setItem('supertechno_rpm_custom_url', activeUrl);
                localStorage.setItem('supertechno_rpm_active_preset_id', selectedPresetId);
              } catch (e) {
                console.error(e);
              }
              if (onApplyToTennis) onApplyToTennis(activeUrl);
              showToast('🎾 Avatar für die Tennis Match Arena ausgewählt!');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(74, 222, 128, 0.4)',
              background: 'rgba(74, 222, 128, 0.12)',
              color: '#4ade80',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>🎾</span>
            <span>In Tennis-Arena übertragen</span>
          </button>
        </div>
      </div>

      {/* 🎭 Right Floating Panel: Facial Expressions & Telemetry */}
      <div style={{
        position: 'absolute',
        top: 140,
        right: 20,
        width: 290,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#38bdf8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            ARKit Mimik & Blendshapes
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#94a3b8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={morphSettings.autoBlink}
              onChange={(e) => setMorphSettings((s) => ({ ...s, autoBlink: e.target.checked }))}
            />
            Auto-Blink
          </label>
        </div>

        {/* Expression Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
              <span>😊 Lächeln (Smile)</span>
              <span>{Math.round(morphSettings.smile * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={morphSettings.smile}
              onChange={(e) => setMorphSettings((s) => ({ ...s, smile: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
              <span>😮 Mund geöffnet (Jaw)</span>
              <span>{Math.round(morphSettings.jawOpen * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={morphSettings.jawOpen}
              onChange={(e) => setMorphSettings((s) => ({ ...s, jawOpen: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
              <span>🤨 Augenbrauen (Brow Up)</span>
              <span>{Math.round(morphSettings.browUp * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={morphSettings.browUp}
              onChange={(e) => setMorphSettings((s) => ({ ...s, browUp: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
              <span>😉 Zwinkern Links</span>
              <span>{Math.round(morphSettings.winkLeft * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={morphSettings.winkLeft}
              onChange={(e) => setMorphSettings((s) => ({ ...s, winkLeft: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Custom URL Input */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>
            Eigene GLB / RPM URL einfügen:
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              placeholder="https://models.readyplayer.me/..."
              value={customInputUrl}
              onChange={(e) => setCustomInputUrl(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 11,
                outline: 'none'
              }}
            />
            <button
              onClick={handleLoadCustomUrl}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: '#38bdf8',
                border: 'none',
                color: '#0f172a',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Laden
            </button>
          </div>
        </div>

        {/* Model Telemetry & Engine Status */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: avatarStats.isFallback ? '#4ade80' : '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <span>{avatarStats.isFallback ? '🟢' : '✨'}</span>
            <span>{avatarStats.isFallback ? '3D-Humanoid Engine (Offline-Safe)' : 'Ready Player Me Cloud GLB'}</span>
          </div>

          <div style={{
            fontSize: 10,
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>🦴 Bones: {avatarStats.bonesCount || 32}</span>
            <span>👁️ Morphs: {avatarStats.morphsCount || 16}</span>
            <span>📐 Verts: {avatarStats.verticesCount ? `${Math.round(avatarStats.verticesCount / 1000)}k` : '8.4k'}</span>
          </div>
        </div>
      </div>

      {/* 🌐 Ready Player Me Creator Modal (Iframe Overlay) */}
      {isCreatorOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 1080,
            height: '90vh',
            background: '#111827',
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(56, 189, 248, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              background: 'rgba(17, 24, 39, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>✨</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc' }}>
                    READY PLAYER ME 3D AVATAR CREATOR
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    Personalisiere Gesicht, Haare, Outfit & Klicke am Ende auf "Fertig/Next", um den Avatar zu laden.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsCreatorOpen(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✕ Schließen
              </button>
            </div>

            {/* Ready Player Me Iframe */}
            <iframe
              id="rpm-frame"
              src="https://demo.readyplayer.me/avatar?frameApi=true&clearCache=true"
              allow="camera *; microphone *"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#090d16'
              }}
              title="Ready Player Me Avatar Creator"
            />
          </div>
        </div>
      )}
    </div>
  );
}
