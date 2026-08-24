import type { MatchScore } from '../TennisScoreboardHUD';

/**
 * ============================================================================
 * TENNIS UMPIRE CALL WINDOW (AGENT 13 / 17)
 * 2D DOM Schiedsrichter-Durchsagefenster mit Audio/Visuellem Status
 * ============================================================================
 */

export interface TennisUmpireCallWindowProps {
  show: boolean;
  onClose: () => void;
  isControlsOpen: boolean;
  matchScore: MatchScore;
}

export function TennisUmpireCallWindow({
  show,
  onClose,
  isControlsOpen,
  matchScore
}: TennisUmpireCallWindowProps) {
  if (!show) return null;

  return (
    <div style={{
      position: 'absolute',
      top: isControlsOpen ? 'auto' : '72px',
      bottom: isControlsOpen ? '20px' : 'auto',
      right: '20px',
      width: isControlsOpen ? '320px' : '260px',
      background: 'linear-gradient(135deg, rgba(11, 18, 33, 0.96) 0%, rgba(6, 10, 20, 0.98) 100%)',
      border: '1px solid rgba(56, 189, 248, 0.45)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(56, 189, 248, 0.2)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 48,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      pointerEvents: 'auto',
      transition: 'all 0.25s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          <span style={{ fontSize: '14px' }}>🪑</span>
          <span>Schiedsrichter</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e'
            }} />
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#86efac', letterSpacing: '0.5px' }}>LIVE</span>
          </div>
          <button
            onClick={onClose}
            title="Schiedsrichter-Fenster schließen"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#94a3b8',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 900,
              padding: 0,
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239,68,68,0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{
        fontSize: '15px',
        fontWeight: 900,
        color: '#ffffff',
        fontFamily: 'monospace',
        letterSpacing: '0.4px',
        marginBottom: '3px'
      }}>
        "{matchScore.umpireCall}"
      </div>

      <div style={{
        fontSize: '10.5px',
        fontWeight: 700,
        color: '#38bdf8',
        letterSpacing: '0.1px',
        lineHeight: 1.35
      }}>
        {matchScore.lastMessage}
      </div>
    </div>
  );
}
