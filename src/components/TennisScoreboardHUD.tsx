export interface SetScore {
  p1: number;
  p2: number;
  tiebreak?: string;
}

export interface MatchScore {
  p1Points: number;
  p2Points: number;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  setHistory: SetScore[];
  currentSet: number;
  isTiebreak: boolean;
  p1TiebreakPoints: number;
  p2TiebreakPoints: number;
  server: 1 | 2;
  serveAttempt: 1 | 2;
  matchTimeSeconds: number;
  lastMessage: string;
  umpireCall: string;
  rallyCount: number;
  isCheering: boolean;
  cheerIntensity: number;
}

export interface TennisScoreboardHUDProps {
  matchScore: MatchScore;
  isAIvsAI: boolean;
  onToggleFreeze: () => void;
  onRestartMatch: () => void;
  showH2HStats: boolean;
  setShowH2HStats: (show: boolean) => void;
}

export const getTennisPointsLabel = (pts: number, isTiebreak?: boolean, tbPts?: number): string => {
  if (isTiebreak && tbPts !== undefined) {
    return `${tbPts}`;
  }
  if (pts === 0) return '0';
  if (pts === 15) return '15';
  if (pts === 30) return '30';
  if (pts === 40) return '40';
  if (pts === 45) return 'AD';
  return '0';
};

export const formatMatchTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

export default function TennisScoreboardHUD({
  showH2HStats,
  setShowH2HStats
}: TennisScoreboardHUDProps) {
  // Das 2D-Overlay unten links wurde entfernt – der Spielstand steht real auf den 3D-Grundlinientafeln.
  // Hier wird nur das H2H-Statistik-Modal gerendert, wenn der Nutzer es anfordert.
  if (!showH2HStats) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '580px',
      maxWidth: '92vw',
      background: 'rgba(11, 16, 28, 0.96)',
      color: '#fff',
      padding: '24px',
      borderRadius: '16px',
      fontFamily: 'Inter, system-ui, sans-serif',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(56, 189, 248, 0.4)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.2)',
      zIndex: 100
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
            🏆 ATP GRAND SLAM / MASTERS FINALE
          </div>
          <div style={{ fontSize: '17px', fontWeight: 900, color: '#fff' }}>
            Head-to-Head & Offizielle ATP Statistiken
          </div>
        </div>
        <button
          onClick={() => setShowH2HStats(false)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontWeight: 900,
            fontSize: '14px'
          }}
        >
          ✕
        </button>
      </div>

      {/* Players Comparison Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', marginBottom: '18px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Player 1 Sinner */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>🇮🇹</span>
            <span style={{ color: '#38bdf8', fontWeight: 900, fontSize: '15px' }}>Jannik SINNER</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>ATP Weltrangliste #1 (11.830 Pkt)</div>
          <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 800 }}>"The Fox" • Baseline Firepower</div>
        </div>

        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800 }}>H2H TOTAL</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#facc15', fontFamily: 'monospace' }}>7 – 10</div>
          <div style={{ fontSize: '9px', color: '#64748b' }}>Grand Slam: 2–4</div>
        </div>

        {/* Player 2 Alcaraz */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
            <span style={{ color: '#facc15', fontWeight: 900, fontSize: '15px' }}>Carlos ALCARAZ</span>
            <span style={{ fontSize: '18px' }}>🇪🇸</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>ATP Weltrangliste #2 (9.850 Pkt)</div>
          <div style={{ fontSize: '10px', color: '#facc15', fontWeight: 800 }}>"Carlitos" • All-Court Dynamo</div>
        </div>
      </div>

      {/* Statistical Breakdown Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '11px', marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(56,189,248,0.08)', borderRadius: '6px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>124 – 132 km/h (77 mph 👑)</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>Rückhand-Geschwindigkeit</span>
          <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>115 – 122 km/h</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(250,204,21,0.08)', borderRadius: '6px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>2.287 RPM (Flat Bullet)</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>Vorhand-Topspin Spinrate</span>
          <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>3.200 RPM (Heavy Topspin 👑)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>234 km/h (Flat Bomb)</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>Max. Aufschlag-Tempo</span>
          <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>228 km/h (Heavy Kick)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>64 % (88 % gewonnene Service-Games)</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>1. Aufschlag im Feld</span>
          <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>66 % (86 % gewonnene Service-Games)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(250,204,21,0.08)', borderRadius: '6px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>58 % (Selektiver Einsatz)</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>Stoppball / Drop Shot Quote</span>
          <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>74 % (Signature Weapon 👑)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(56,189,248,0.08)', borderRadius: '6px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>Dominant auf Hardcourt & Rasen</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>Belags-Dominanz</span>
          <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>Dominant auf Sand & All-Court</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(239,68,68,0.12)', borderRadius: '6px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>24 UEs / Match (14 Out 👑 • 10 Netz)</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>Unforced Errors (Out vs Netz)</span>
          <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>31 UEs / Match (18 Out 👑 • 13 Netz)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>58% Out • 37% Netz • 5% Netzroller</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>Fehler-Verteilung</span>
          <span style={{ color: '#facc15', fontWeight: 900, textAlign: 'right' }}>58% Out • 37% Netz • 5% Netzroller</span>
        </div>
      </div>

      {/* Tactical Frequency Matrix */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '11px', fontWeight: 900, color: '#facc15', marginBottom: '6px', textAlign: 'center' }}>
          🎯 Taktische Schlag- & Häufigkeits-Matrix (Wer, Wann, Wie oft)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', fontSize: '10px' }}>
          <div style={{ color: '#bae6fd', lineHeight: 1.5 }}>
            <div>• <b>52% Vorhand</b> / <b>48% Rückhand</b></div>
            <div>• <b>92% Flat Laser</b> (128–134 km/h)</div>
            <div>• <b>34% Down-the-Line</b> Rückhand</div>
            <div>• <b>4% Stoppball</b> (nur bei extremer Tiefe)</div>
            <div>• <b>12% Netzangriff</b> (Grundlinien-Fokus)</div>
            <div>• <b>85% Smash</b> bei hohen Lobs</div>
            <div>• <b>Out-Quote:</b> 14% (Knapp hinter Grundlinie)</div>
            <div>• <b>Netzfehler:</b> 10% an der Netzkante</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ color: '#fde68a', textAlign: 'right', lineHeight: 1.5 }}>
            <div><b>65% Vorhand</b> / <b>35% Rückhand</b> •</div>
            <div><b>80% Heavy Topspin</b> (3.200 RPM) •</div>
            <div><b>38% Backhand-Slice</b> (Rhythmusbruch) •</div>
            <div><b>20% Disguised Stoppball</b> (Signature) •</div>
            <div><b>28% Netzangriff & Volleys</b> •</div>
            <div><b>92% Monster-Smash</b> (248 km/h) •</div>
            <div><b>Out-Quote:</b> 18% (Inside-Out & Power) •</div>
            <div><b>Netzfehler:</b> 13% bei extremen Winkeln •</div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setShowH2HStats(false)}
          style={{
            padding: '8px 24px',
            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 900,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🎾 ZURÜCK ZUM LIVE MATCH
        </button>
      </div>
    </div>
  );
}
