import type { CourtSurface } from './TennisArena';
import type { BallHopperState, TrainingDrillPreset } from '../../utils/ballDeployment';

/**
 * ============================================================================
 * TENNIS CONTROL DRAWER (AGENT 13 / 21)
 * 2D DOM Steuerungs-Panel (Rechte Seitenleiste) für Schläge, Beläge, Kameras & Ball-Kran Deployment
 * ============================================================================
 */

export type TennisCameraMode = 'broadcast' | 'broadcast_south' | 'broadcast_north' | 'net' | 'portrait' | 'ball' | 'crane1' | 'crane2' | 'umpire' | 'spectator' | 'coach' | 'free';

export interface TennisControlDrawerProps {
  isControlsOpen: boolean;
  setIsControlsOpen: (open: boolean) => void;
  isAIvsAI: boolean;
  setIsAIvsAI: (ai: boolean) => void;
  handleRestartMatch: () => void;
  setShowH2HStats: (show: boolean) => void;
  courtSurface: CourtSurface;
  setCourtSurface: (surface: CourtSurface) => void;
  cameraMode: TennisCameraMode;
  setCameraMode: (mode: TennisCameraMode) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  showSpectators: boolean;
  setShowSpectators: (show: boolean) => void;
  showCourtsideStaff: boolean;
  setShowCourtsideStaff: (show: boolean) => void;
  showGrandstands: boolean;
  setShowGrandstands: (show: boolean) => void;
  showUmpireCall: boolean;
  setShowUmpireCall: (show: boolean) => void;
  showScoreboard3D: boolean;
  setShowScoreboard3D: (show: boolean) => void;
  setManualDropTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualLaserTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualTopspinTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualSliceTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualTopspinLobTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualSkyLobTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualSmashTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualVolleyTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualNetErrorTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualOutErrorTrigger: React.Dispatch<React.SetStateAction<number>>;
  setManualServiceWinnerTrigger: React.Dispatch<React.SetStateAction<number>>;
  hopperStateP1?: BallHopperState;
  hopperStateP2?: BallHopperState;
  onTriggerCannonDrill?: (preset: TrainingDrillPreset) => void;
  onTriggerBallBoyFeed?: (server: 1 | 2) => void;
}

export function TennisControlDrawer({
  isControlsOpen,
  setIsControlsOpen,
  isAIvsAI,
  setIsAIvsAI,
  handleRestartMatch,
  setShowH2HStats,
  courtSurface,
  setCourtSurface,
  cameraMode,
  setCameraMode,
  gameSpeed,
  setGameSpeed,
  showSpectators,
  setShowSpectators,
  showCourtsideStaff,
  setShowCourtsideStaff,
  showGrandstands,
  setShowGrandstands,
  showUmpireCall,
  setShowUmpireCall,
  showScoreboard3D,
  setShowScoreboard3D,
  setManualDropTrigger,
  setManualLaserTrigger,
  setManualTopspinTrigger,
  setManualSliceTrigger,
  setManualTopspinLobTrigger,
  setManualSkyLobTrigger,
  setManualSmashTrigger,
  setManualVolleyTrigger,
  setManualNetErrorTrigger,
  setManualOutErrorTrigger,
  setManualServiceWinnerTrigger,
  hopperStateP1,
  hopperStateP2,
  onTriggerCannonDrill,
  onTriggerBallBoyFeed
}: TennisControlDrawerProps) {
  if (!isControlsOpen) {
    return (
      <button
        onClick={() => setIsControlsOpen(true)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(11, 16, 24, 0.92)',
          border: '1px solid rgba(250, 204, 21, 0.5)',
          borderRadius: '10px',
          padding: '8px 14px',
          color: '#facc15',
          fontSize: '12px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          zIndex: 50,
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ fontSize: '10px', opacity: 0.8, color: '#38bdf8' }}>◀</span>
        <span>🎾</span>
        <span>Steuerung & Schläge</span>
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(11, 16, 24, 0.94)',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      width: '320px',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
      zIndex: 50
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#facc15', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎾</span> <span>Kran-Tennis Arena</span>
          </h3>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Dolly auf Schienen, Smashes, Lobs & Volleys</div>
        </div>
        <button
          onClick={() => setIsControlsOpen(false)}
          title="Steuerung einklappen"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: '#cbd5e1',
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Einklappen</span>
          <span style={{ fontSize: '9px', color: '#facc15' }}>◀</span>
        </button>
      </div>

      {/* ⚡ Match-Aktionen */}
      <div style={{ marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <button
          onClick={() => setIsAIvsAI(!isAIvsAI)}
          style={{
            padding: '6px',
            background: isAIvsAI ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.25)',
            border: `1px solid ${isAIvsAI ? '#eab308' : '#22c55e'}`,
            color: isAIvsAI ? '#fde047' : '#86efac',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          {isAIvsAI ? '⏸️ Freeze' : '▶️ Play'}
        </button>
        <button
          onClick={handleRestartMatch}
          style={{
            padding: '6px',
            background: 'rgba(239,68,68,0.2)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          🔄 Restart
        </button>
        <button
          onClick={() => setShowH2HStats(true)}
          style={{
            padding: '6px',
            background: 'rgba(56,189,248,0.2)',
            border: '1px solid #38bdf8',
            color: '#bae6fd',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          📊 ATP H2H
        </button>
      </div>

      {/* 1. Court Surface Selector */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#facc15', marginBottom: '6px' }}>
          🏟️ Tennisplatz-Belag:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {[
            { id: 'clay' as const, label: '🧱 Sandplatz', desc: 'Roland Garros', col: '#ea580c' },
            { id: 'grass' as const, label: '🌿 Rasen', desc: 'Wimbledon', col: '#16a34a' },
            { id: 'hardcourt' as const, label: '🎾 Hardcourt', desc: 'US Open Blue', col: '#2563eb' },
            { id: 'cyber' as const, label: '⚡ Cyber Neon', desc: 'Night Stadium', col: '#38bdf8' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCourtSurface(item.id)}
              style={{
                padding: '6px 8px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '6px',
                border: `1px solid ${courtSurface === item.id ? item.col : 'rgba(255,255,255,0.1)'}`,
                background: courtSurface === item.id ? `${item.col}30` : 'rgba(255,255,255,0.05)',
                color: courtSurface === item.id ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>{item.label}</div>
              <div style={{ fontSize: '8px', color: '#64748b' }}>{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Broadcast Camera Selector */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🎥 Kamera- & Regie-Perspektiven:</span>
          {cameraMode === 'broadcast' && (
            <span style={{ fontSize: '9px', background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 900, animation: 'pulse 1.5s infinite' }}>
              🔴 AUTO-REGIE
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          {[
            { id: 'broadcast' as const, label: '📺 TV Broadcast (Auto-Regie)', special: true },
            { id: 'broadcast_south' as const, label: '🎥 3/4 Totale Süd (Sinner)' },
            { id: 'broadcast_north' as const, label: '🎥 3/4 Totale Nord (Alcaraz)' },
            { id: 'net' as const, label: '🕸️ Netzkanten-Cam' },
            { id: 'portrait' as const, label: '👤 Protagonisten-Portrait' },
            { id: 'ball' as const, label: '⚡ Ball-Tracking' },
            { id: 'crane1' as const, label: '🇮🇹 Sinner Hero (Kran 1)' },
            { id: 'crane2' as const, label: '🇪🇸 Alcaraz Hero (Kran 2)' },
            { id: 'umpire' as const, label: '🪑 Schiedsrichter' },
            { id: 'spectator' as const, label: '🏟️ Tribüne (Fan)' },
            { id: 'coach' as const, label: '👥 Trainer-Bank' },
            { id: 'free' as const, label: '🔓 Freier Orbit' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCameraMode(item.id)}
              style={{
                padding: '6px 8px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '6px',
                border: cameraMode === item.id 
                  ? (item.id === 'broadcast' ? '1px solid #ef4444' : '1px solid #38bdf8')
                  : '1px solid rgba(255,255,255,0.1)',
                background: cameraMode === item.id 
                  ? (item.id === 'broadcast' ? 'rgba(239,68,68,0.25)' : 'rgba(56,189,248,0.25)')
                  : 'rgba(255,255,255,0.05)',
                color: cameraMode === item.id 
                  ? (item.id === 'broadcast' ? '#fca5a5' : '#38bdf8') 
                  : '#94a3b8',
                cursor: 'pointer',
                textAlign: 'left',
                gridColumn: item.id === 'broadcast' ? 'span 2' : 'auto'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 🔥 SMASHES, LOB, STOPPBALL & SCHLÄGE */}
      <div style={{
        marginBottom: '14px',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(56,189,248,0.15))',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid rgba(56,189,248,0.35)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔥 Schlag- & Taktik-Arsenal:</span>
          <span style={{ fontSize: '9px', background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>ATP Pro</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => setManualDropTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(236,72,153,0.7)',
              background: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(244,63,94,0.2))',
              color: '#fce7f3',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>💫 Disguised Stoppball (Drop Shot)</span>
            <span style={{ fontSize: '9px', color: '#fbcfe8' }}>2.600 RPM</span>
          </button>

          <button
            onClick={() => setManualLaserTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(56,189,248,0.7)',
              background: 'linear-gradient(135deg, rgba(2,132,199,0.4), rgba(56,189,248,0.25))',
              color: '#e0f2fe',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>⚡ 132 km/h Sinner Rückhand-Laser</span>
            <span style={{ fontSize: '9px', color: '#bae6fd' }}>Down-the-Line</span>
          </button>

          <button
            onClick={() => setManualTopspinTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(245,158,11,0.7)',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(217,119,6,0.2))',
              color: '#fef3c7',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🌪️ 3.200 RPM Alcaraz Heavy-Topspin</span>
            <span style={{ fontSize: '9px', color: '#fde68a' }}>Inside-Out</span>
          </button>

          <button
            onClick={() => setManualSliceTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(16,185,129,0.7)',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.2))',
              color: '#d1fae5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🌀 3.100 RPM Alcaraz Backhand-Slice</span>
            <span style={{ fontSize: '9px', color: '#a7f3d0' }}>Rhythmuswechsel</span>
          </button>

          <button
            onClick={() => setManualTopspinLobTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(56,189,248,0.7)',
              background: 'linear-gradient(135deg, rgba(2,132,199,0.4), rgba(139,92,246,0.3))',
              color: '#e0f2fe',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🌈 10.5m Topspin-Lob Winner</span>
            <span style={{ fontSize: '9px', color: '#bae6fd' }}>Über den Kran</span>
          </button>

          <button
            onClick={() => setManualSkyLobTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(245,158,11,0.7)',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(234,179,8,0.2))',
              color: '#fef3c7',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🛡️ 11.2m Hohe Not-Kerze</span>
            <span style={{ fontSize: '9px', color: '#fde68a' }}>Sky-Lob / Flutlicht</span>
          </button>

          <button
            onClick={() => setManualSmashTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(239,68,68,0.7)',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.35), rgba(249,115,22,0.2))',
              color: '#fee2e2',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🔥 248 km/h Monster-Smash</span>
            <span style={{ fontSize: '9px', color: '#fca5a5' }}>Sofortiger Winner</span>
          </button>

          <button
            onClick={() => setManualVolleyTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(56,189,248,0.6)',
              background: 'linear-gradient(135deg, rgba(56,189,248,0.3), rgba(14,165,233,0.15))',
              color: '#e0f2fe',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>⚡ Blitz-Netzvolley Angriff</span>
            <span style={{ fontSize: '9px', color: '#bae6fd' }}>Direkt am Netz</span>
          </button>

          <button
            onClick={() => setManualNetErrorTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(239,68,68,0.7)',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.35), rgba(185,28,28,0.25))',
              color: '#fee2e2',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🕸️ Net Error (Ball im Netz)</span>
            <span style={{ fontSize: '9px', color: '#fca5a5' }}>Netzkante</span>
          </button>

          <button
            onClick={() => setManualOutErrorTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(234,88,12,0.7)',
              background: 'linear-gradient(135deg, rgba(234,88,12,0.35), rgba(194,65,12,0.25))',
              color: '#ffedd5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>⚠️ Out Error (Ball im Aus)</span>
            <span style={{ fontSize: '9px', color: '#fdba74' }}>Grundlinie/Korridor</span>
          </button>

          <button
            onClick={() => setManualServiceWinnerTrigger(n => n + 1)}
            style={{
              padding: '7px 10px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(234,179,8,0.7)',
              background: 'linear-gradient(135deg, rgba(234,179,8,0.35), rgba(202,138,4,0.2))',
              color: '#fef08a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🎯 228 km/h Service Winner</span>
            <span style={{ fontSize: '9px', color: '#fde047' }}>Return-Fehler</span>
          </button>
        </div>
      </div>

      {/* 🎾 BALL-KRAN DEPLOYMENT & CANNON LAUNCHER (AGENT 21: ball_crane_deployment) */}
      <div style={{
        marginBottom: '14px',
        background: 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(99,102,241,0.15))',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid rgba(56,189,248,0.45)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🎾 Vertikale Aufschlag-Abschussröhre (Agent 21)</span>
          <span style={{ fontSize: '9px', background: '#0284c7', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 900 }}>
            {hopperStateP1 ? `${hopperStateP1.loadedCount}/6` : '6/6'} • {hopperStateP2 ? `${hopperStateP2.loadedCount}/6 BÄLLE` : '6/6 BÄLLE'}
          </span>
        </div>

        {/* Status Indicators: Tube Magazine & Pressure */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px', fontSize: '10px' }}>
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', padding: '6px' }}>
            <div style={{ color: '#94a3b8', fontSize: '9px' }}>Druckluft-Ausstoß:</div>
            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '11px' }}>
              {hopperStateP1 ? `${hopperStateP1.pressureBar.toFixed(1)} Bar` : '8.4 Bar'} <span style={{ fontSize: '8px', color: '#22c55e' }}>● VERTIKAL BEREIT</span>
            </div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: '6px', padding: '6px' }}>
            <div style={{ color: '#94a3b8', fontSize: '9px' }}>Schlagführung:</div>
            <div style={{ fontWeight: 800, color: '#facc15', fontSize: '11px' }}>
              Realistisch <span style={{ fontSize: '8px', color: '#38bdf8' }}>ATP Pronation</span>
            </div>
          </div>
        </div>

        {/* Autonomous Practice Training Drills */}
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
          🎯 Pneumatische Trainings-Drills:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
          <button
            onClick={() => onTriggerCannonDrill && onTriggerCannonDrill('topspin_cross')}
            style={{
              padding: '5px 6px',
              fontSize: '9px',
              fontWeight: 800,
              borderRadius: '5px',
              border: '1px solid rgba(245,158,11,0.6)',
              background: 'rgba(245,158,11,0.2)',
              color: '#fef3c7',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div>🌪️ Topspin-Cross</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>178 km/h • 3.4k RPM</div>
          </button>

          <button
            onClick={() => onTriggerCannonDrill && onTriggerCannonDrill('backhand_laser')}
            style={{
              padding: '5px 6px',
              fontSize: '9px',
              fontWeight: 800,
              borderRadius: '5px',
              border: '1px solid rgba(56,189,248,0.6)',
              background: 'rgba(56,189,248,0.2)',
              color: '#e0f2fe',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div>⚡ Laser-Return</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>205 km/h • Flat</div>
          </button>

          <button
            onClick={() => onTriggerCannonDrill && onTriggerCannonDrill('smash_overhead')}
            style={{
              padding: '5px 6px',
              fontSize: '9px',
              fontWeight: 800,
              borderRadius: '5px',
              border: '1px solid rgba(239,68,68,0.6)',
              background: 'rgba(239,68,68,0.2)',
              color: '#fee2e2',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div>🛡️ Smash-Feeder</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>68° Apex-Bogen</div>
          </button>

          <button
            onClick={() => onTriggerCannonDrill && onTriggerCannonDrill('rapid_fire_rally')}
            style={{
              padding: '5px 6px',
              fontSize: '9px',
              fontWeight: 800,
              borderRadius: '5px',
              border: '1px solid rgba(168,85,247,0.6)',
              background: 'rgba(168,85,247,0.2)',
              color: '#f3e8ff',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div>🚀 Rapid-Fire</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>6 Bälle Repetierfeuer</div>
          </button>
        </div>

        {/* Ball Boy Feed Button */}
        <button
          onClick={() => onTriggerBallBoyFeed && onTriggerBallBoyFeed(1)}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '10px',
            fontWeight: 800,
            borderRadius: '6px',
            border: '1px solid rgba(34,197,94,0.6)',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(16,185,129,0.15))',
            color: '#86efac',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>🎾</span>
          <span>Ballkind-Zuspiel in Ladetrichter (Reload)</span>
        </button>
      </div>

      {/* 🎭 SPIELER-PSYCHOLOGIE & EMOTIONEN (AGENT 18: tennis_emotions) */}
      <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(250,204,21,0.2)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#facc15', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🎭 Spieler-Psychologie (Agent 18)</span>
          <span style={{ fontSize: '9px', background: 'rgba(250,204,21,0.2)', color: '#facc15', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>LIVE</span>
        </div>

        {/* Sinner vs Alcaraz Mini Profile */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px', fontSize: '10px' }}>
          <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', padding: '6px' }}>
            <div style={{ fontWeight: 800, color: '#38bdf8' }}>🇮🇹 Sinner (Ice-Focus)</div>
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>❄️ Eiserner Brustschlag</div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>🎾 7 Pre-Serve Bounces</div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>🙏 Netzroller-Entschuldigung</div>
          </div>
          <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: '6px', padding: '6px' }}>
            <div style={{ fontWeight: 800, color: '#facc15' }}>🇪🇸 Alcaraz (Explosive)</div>
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>👂 34° "Make Noise" Ear-Cup</div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>🌪️ 360° Racket-Twirls</div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>😡 Smash-Fake bei Frust</div>
          </div>
        </div>

        {/* Signature Gesten Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '9px' }}>
          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: '#e2e8f0' }}>👂 Ear-Cup</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: '#e2e8f0' }}>❄️ Chest-Thump</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: '#e2e8f0' }}>☝️ Finger-Wag</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: '#e2e8f0' }}>🙏 Apology-Wave</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: '#e2e8f0' }}>👏 Respekt-Applaus</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: '#e2e8f0' }}>👟 Sohlen-Tap</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: '#e2e8f0' }}>💨 Erschöpfung</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: '#e2e8f0' }}>🔍 Umpire-Inquiry</span>
        </div>
      </div>

      {/* 4. 👥 STADION-ELEMENTE & PUBLIKUM TOGGLES */}
      <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#facc15', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span>👥 Stadion & Publikum:</span>
          <span style={{ fontSize: '9px', color: '#94a3b8' }}>Sichtbarkeit steuern</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => setShowSpectators(!showSpectators)}
            style={{
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '6px',
              border: `1px solid ${showSpectators ? '#4ade80' : 'rgba(255,255,255,0.2)'}`,
              background: showSpectators ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
              color: showSpectators ? '#4ade80' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>👥 Publikum auf Tribünen</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{showSpectators ? '✅ SICHTBAR' : '❌ AUSGEBLENDET'}</span>
          </button>

          <button
            onClick={() => setShowCourtsideStaff(!showCourtsideStaff)}
            style={{
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '6px',
              border: `1px solid ${showCourtsideStaff ? '#38bdf8' : 'rgba(255,255,255,0.2)'}`,
              background: showCourtsideStaff ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
              color: showCourtsideStaff ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🪑 Schiedsrichter & Ballkinder</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{showCourtsideStaff ? '✅ SICHTBAR' : '❌ AUSGEBLENDET'}</span>
          </button>

          <button
            onClick={() => setShowGrandstands(!showGrandstands)}
            style={{
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '6px',
              border: `1px solid ${showGrandstands ? '#f59e0b' : 'rgba(255,255,255,0.2)'}`,
              background: showGrandstands ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
              color: showGrandstands ? '#f59e0b' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🏟️ Beton-Tribünen & LED-Banden</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{showGrandstands ? '✅ SICHTBAR' : '❌ AUSGEBLENDET'}</span>
          </button>

          <button
            onClick={() => setShowUmpireCall(!showUmpireCall)}
            style={{
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '6px',
              border: `1px solid ${showUmpireCall ? '#38bdf8' : 'rgba(255,255,255,0.2)'}`,
              background: showUmpireCall ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
              color: showUmpireCall ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🪑 Schiedsrichter-Durchsage</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{showUmpireCall ? '✅ AN' : '❌ AUS'}</span>
          </button>

          <button
            onClick={() => setShowScoreboard3D(!showScoreboard3D)}
            style={{
              padding: '6px 10px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '6px',
              border: `1px solid ${showScoreboard3D ? '#facc15' : 'rgba(255,255,255,0.2)'}`,
              background: showScoreboard3D ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255,255,255,0.05)',
              color: showScoreboard3D ? '#facc15' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🏟️ 3D-Grundlinien-Tafeln</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{showScoreboard3D ? '✅ AN' : '❌ AUS'}</span>
          </button>
        </div>
      </div>

      {/* 5. Match Simulation Speed */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '6px' }}>
          <span>Match-Geschwindigkeit:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#facc15' }}>{gameSpeed.toFixed(1)}x</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {[0.5, 1.0, 1.2, 1.5, 2.0].map(spd => (
            <button
              key={`spd-${spd}`}
              onClick={() => setGameSpeed(spd)}
              style={{
                padding: '4px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '4px',
                border: `1px solid ${gameSpeed === spd ? '#facc15' : 'rgba(255,255,255,0.1)'}`,
                background: gameSpeed === spd ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.05)',
                color: gameSpeed === spd ? '#fde047' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              {spd}x
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Autonomes Match:</span>
          <button
            onClick={() => setIsAIvsAI(!isAIvsAI)}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '4px',
              border: `1px solid ${isAIvsAI ? '#4ade80' : 'rgba(255,255,255,0.2)'}`,
              background: isAIvsAI ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255,255,255,0.08)',
              color: isAIvsAI ? '#4ade80' : '#94a3b8',
              cursor: 'pointer'
            }}
          >
            {isAIvsAI ? '🤖 SPIELT' : 'PAUSIERT'}
          </button>
        </div>
      </div>

      {/* 6. Match Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsAIvsAI(!isAIvsAI)}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '11px',
              fontWeight: 800,
              borderRadius: '6px',
              border: `1px solid ${isAIvsAI ? 'rgba(234,179,8,0.6)' : 'rgba(74,222,128,0.6)'}`,
              background: isAIvsAI ? 'linear-gradient(135deg, rgba(234,179,8,0.25), rgba(202,138,4,0.15))' : 'linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.15))',
              color: isAIvsAI ? '#fef08a' : '#86efac',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>{isAIvsAI ? '⏸️' : '▶️'}</span>
            <span>{isAIvsAI ? 'Stop (Einfrieren)' : 'Play (Fortsetzen)'}</span>
          </button>

          <button
            onClick={handleRestartMatch}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '11px',
              fontWeight: 800,
              borderRadius: '6px',
              border: '1px solid rgba(239,68,68,0.5)',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.15))',
              color: '#fca5a5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span> <span>Restart Match</span>
          </button>
        </div>

        <button
          onClick={() => setShowH2HStats(true)}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '11px',
            fontWeight: 800,
            borderRadius: '6px',
            border: '1px solid rgba(56,189,248,0.5)',
            background: 'linear-gradient(135deg, rgba(2,132,199,0.3), rgba(250,204,21,0.2))',
            color: '#fde047',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>📊</span> <span>ATP #1 vs #2 H2H & Match-Statistiken</span>
        </button>
      </div>
    </div>
  );
}
