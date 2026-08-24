export interface HawkEyeData {
  isOpen: boolean;
  distanceMm: number;
  lineType: 'baseline' | 'sideline' | 'serviceline';
  hitter: 1 | 2;
  hitterName: string;
  speedKmh: number;
  spinRpm?: number;
  shotType?: string;
  courtSurface: string;
}

interface TennisHawkEyeOverlayProps {
  data: HawkEyeData | null;
  onClose?: () => void;
}

export default function TennisHawkEyeOverlay({ data, onClose }: TennisHawkEyeOverlayProps) {
  if (!data || !data.isOpen) return null;

  const {
    distanceMm,
    lineType,
    hitterName,
    speedKmh,
    spinRpm,
    courtSurface
  } = data;

  const distanceCm = (distanceMm / 10).toFixed(1);
  const lineLabel = lineType === 'baseline'
    ? 'Grundlinie (Baseline)'
    : (lineType === 'sideline' ? 'Seitenlinie (Sideline)' : 'Aufschlaglinie (Service Line)');

  // Oberflächen-Hintergrundfarbe für den Top-Down Court
  const getSurfaceColor = () => {
    switch (courtSurface) {
      case 'clay': return '#9a3412';
      case 'grass': return '#166534';
      case 'concrete': return '#1e293b';
      case 'cyber': return '#090d16';
      default: return '#1e3a8a';
    }
  };

  const surfaceBg = getSurfaceColor();

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '380px',
        maxWidth: '92vw',
        background: 'rgba(9, 13, 24, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(239, 68, 68, 0.55)',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.25)',
        zIndex: 90,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#f8fafc',
        animation: 'fadeInSlideDown 0.25s ease-out'
      }}
    >
      {/* 🦅 HAWK-EYE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🦅</span>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#facc15', letterSpacing: '1px', textTransform: 'uppercase' }}>
              HAWK-EYE™ • ELECTRONIC LINE CALL
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
              Offizielle Linien-Überprüfung
            </div>
          </div>
        </div>

        {/* DECISION BADGE & CLOSE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            color: '#fff',
            fontWeight: 900,
            fontSize: '13px',
            padding: '4px 10px',
            borderRadius: '8px',
            boxShadow: '0 0 14px rgba(239, 68, 68, 0.6)',
            letterSpacing: '0.8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span>⚠️ OUT</span>
            <span style={{ fontSize: '11px', opacity: 0.9 }}>+{distanceMm} mm</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              title="Schließen"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '6px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                padding: 0
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 📐 2D TOP-DOWN HAWK-EYE COURT & LINE VISUALIZER */}
      <div style={{
        position: 'relative',
        height: '110px',
        background: surfaceBg,
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        marginBottom: '12px'
      }}>
        {/* IN & OUT ZONE LABELS */}
        <div style={{
          position: 'absolute',
          left: '14px',
          top: '8px',
          fontSize: '10px',
          fontWeight: 900,
          color: 'rgba(74, 222, 128, 0.7)',
          letterSpacing: '1px'
        }}>
          ✓ IM FELD (IN)
        </div>
        <div style={{
          position: 'absolute',
          right: '14px',
          top: '8px',
          fontSize: '10px',
          fontWeight: 900,
          color: 'rgba(248, 113, 113, 0.85)',
          letterSpacing: '1px'
        }}>
          ✗ AUS (OUT)
        </div>

        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* WEISSE PLATZLINIE (5 cm Originalbreite) */}
          <rect
            x="130"
            y="0"
            width="22"
            height="110"
            fill="#ffffff"
            filter="drop-shadow(0px 0px 4px rgba(255,255,255,0.8))"
          />

          {/* HAWK-EYE IMPACT OVAL & COMPRESSION SHADOW */}
          <ellipse
            cx="225"
            cy="55"
            rx="20"
            ry="16"
            fill="rgba(0, 0, 0, 0.45)"
          />
          <ellipse
            cx="222"
            cy="53"
            rx="18"
            ry="14"
            fill="#facc15"
            stroke="#eab308"
            strokeWidth="2"
            filter="drop-shadow(0px 0px 6px rgba(250, 204, 21, 0.6))"
          />

          {/* TENNIS BALL SEAM CURVE */}
          <path
            d="M 214 43 Q 222 53 214 63"
            fill="none"
            stroke="#65a30d"
            strokeWidth="1.5"
          />
          <path
            d="M 230 43 Q 222 53 230 63"
            fill="none"
            stroke="#65a30d"
            strokeWidth="1.5"
          />

          {/* GESTRICHELTE MESSLINIE (ABSTAND ZUR LINIE) */}
          <line
            x1="152"
            y1="53"
            x2="204"
            y2="53"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="3 3"
          />

          {/* DISTANZ-PFEILE */}
          <polygon points="152,50 152,56 148,53" fill="#ef4444" />
          <polygon points="204,50 204,56 208,53" fill="#ef4444" />

          {/* ABSTANDS-LABEL */}
          <rect x="156" y="38" width="44" height="15" rx="3" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
          <text x="178" y="49" fill="#f87171" fontSize="9" fontWeight="900" textAnchor="middle">
            {distanceCm} cm
          </text>
        </svg>
      </div>

      {/* 📊 DETAIL-TELEMETRIE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
        <div>
          <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{lineLabel}</span>
          <div style={{ color: '#64748b', fontSize: '10px' }}>{hitterName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#38bdf8', fontWeight: 800 }}>{speedKmh} km/h</div>
          {spinRpm ? <div style={{ color: '#a855f7', fontSize: '10px' }}>{spinRpm} RPM</div> : null}
        </div>
      </div>
    </div>
  );
}
