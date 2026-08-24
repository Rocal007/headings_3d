import { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type MatchScore, getTennisPointsLabel, formatMatchTime } from './TennisScoreboardHUD';

interface TennisStadiumScoreboardProps {
  matchScore: MatchScore;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

// ⚡ SINGLETON 2048x1024 HIGH-RES CANVAS & TEXTURE ENGINE
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedTexture: THREE.CanvasTexture | null = null;
let lastRenderKey = '';
let lastRenderTime = 0;

function drawScoreboardCanvas(ctx: CanvasRenderingContext2D, matchScore: MatchScore, pulseVal: number) {
  const set1 = matchScore.setHistory && matchScore.setHistory[0] ? matchScore.setHistory[0] : { p1: 6, p2: 4 };
  const set2 = matchScore.setHistory && matchScore.setHistory[1] ? matchScore.setHistory[1] : { p1: 4, p2: 6 };
  const currentSetNum = matchScore.currentSet || 3;

  // 1. Deep Midnight Navy Background (2048 x 1024)
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, 2048, 1024);

  // 2. High-Tech Subtile LED Grid Texture
  ctx.fillStyle = '#080e1e';
  ctx.fillRect(20, 20, 2008, 984);

  // 🏆 HEADER BANNER: NITTO ATP FINALS CHAMPIONSHIP MATCH
  const headerGrad = ctx.createLinearGradient(0, 0, 2048, 0);
  headerGrad.addColorStop(0, '#0c284d');
  headerGrad.addColorStop(0.5, '#1e1b4b');
  headerGrad.addColorStop(1, '#3b0764');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(32, 32, 1984, 110);

  // Goldene Rahmenlinie
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 5;
  ctx.strokeRect(32, 32, 1984, 110);

  ctx.fillStyle = '#facc15';
  ctx.font = '900 48px "Inter", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🏆 NITTO ATP FINALS • CENTRE COURT TURIN', 64, 106);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 42px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`⏱️ ${formatMatchTime(matchScore.matchTimeSeconds || 6505)} • SET ${currentSetNum} (DECIDER)`, 1980, 106);

  // 📊 TABLE HEADER ROW: PLAYER | SET 1 | SET 2 | SET 3 | POINTS
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(32, 160, 1984, 80);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 160, 1984, 80);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '900 34px "Inter", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PLAYER / COUNTRY', 64, 214);

  ctx.textAlign = 'center';
  ctx.fillStyle = currentSetNum === 1 ? '#38bdf8' : '#64748b';
  ctx.fillText('SET 1', 1100, 214);

  ctx.fillStyle = currentSetNum === 2 ? '#38bdf8' : '#64748b';
  ctx.fillText('SET 2', 1300, 214);

  ctx.fillStyle = currentSetNum === 3 ? '#facc15' : '#64748b';
  ctx.fillText('SET 3', 1500, 214);

  ctx.fillStyle = '#facc15';
  ctx.fillText('POINTS', 1820, 214);

  // 🇮🇹 ROW 1: JANNIK SINNER
  const p1Server = matchScore.server === 1;
  ctx.fillStyle = p1Server ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(32, 255, 1984, 180);
  ctx.strokeStyle = p1Server ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = p1Server ? 4 : 2;
  ctx.strokeRect(32, 255, 1984, 180);

  // Sinner Name & Flag
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px "Inter", sans-serif';
  ctx.fillText('🇮🇹 [1] J. SINNER', 64, 368);

  if (p1Server) {
    const pulseGlow = Math.sin(pulseVal * 4) * 6 + 18;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(680, 348, pulseGlow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '900 24px sans-serif';
    ctx.fillText('🎾', 668, 356);

    if (matchScore.serveAttempt === 2) {
      ctx.fillStyle = '#fde047';
      ctx.font = '900 24px monospace';
      ctx.fillText('2nd', 720, 356);
    }
  }

  // Sinner Set 1
  ctx.textAlign = 'center';
  ctx.fillStyle = set1.p1 > set1.p2 ? '#ffffff' : '#64748b';
  ctx.font = set1.p1 > set1.p2 ? '900 76px monospace' : '700 68px monospace';
  ctx.fillText(`${set1.p1}`, 1100, 372);

  // Sinner Set 2
  ctx.fillStyle = set2.p1 > set2.p2 ? '#ffffff' : '#64748b';
  ctx.font = set2.p1 > set2.p2 ? '900 76px monospace' : '700 68px monospace';
  ctx.fillText(`${set2.p1}`, 1300, 372);

  // Sinner Set 3 (Current Active Set Games)
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 88px monospace';
  ctx.fillText(`${matchScore.p1Games}`, 1500, 376);

  // Sinner Points Box
  const p1Leading = matchScore.p1Points > matchScore.p2Points;
  ctx.fillStyle = p1Leading ? '#0284c7' : 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(1700, 275, 240, 140);
  ctx.strokeStyle = p1Leading ? '#38bdf8' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1700, 275, 240, 140);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 80px monospace';
  ctx.fillText(getTennisPointsLabel(matchScore.p1Points, matchScore.isTiebreak, matchScore.p1TiebreakPoints), 1820, 375);

  // 🇪🇸 ROW 2: CARLOS ALCARAZ
  const p2Server = matchScore.server === 2;
  ctx.fillStyle = p2Server ? 'rgba(250, 204, 21, 0.18)' : 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(32, 450, 1984, 180);
  ctx.strokeStyle = p2Server ? '#facc15' : 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = p2Server ? 4 : 2;
  ctx.strokeRect(32, 450, 1984, 180);

  // Alcaraz Name & Flag
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px "Inter", sans-serif';
  ctx.fillText('🇪🇸 [2] C. ALCARAZ', 64, 562);

  if (p2Server) {
    const pulseGlow = Math.sin(pulseVal * 4) * 6 + 18;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(750, 542, pulseGlow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '900 24px sans-serif';
    ctx.fillText('🎾', 738, 550);

    if (matchScore.serveAttempt === 2) {
      ctx.fillStyle = '#fde047';
      ctx.font = '900 24px monospace';
      ctx.fillText('2nd', 790, 550);
    }
  }

  // Alcaraz Set 1
  ctx.textAlign = 'center';
  ctx.fillStyle = set1.p2 > set1.p1 ? '#ffffff' : '#64748b';
  ctx.font = set1.p2 > set1.p1 ? '900 76px monospace' : '700 68px monospace';
  ctx.fillText(`${set1.p2}`, 1100, 566);

  // Alcaraz Set 2
  ctx.fillStyle = set2.p2 > set2.p1 ? '#ffffff' : '#64748b';
  ctx.font = set2.p2 > set2.p1 ? '900 76px monospace' : '700 68px monospace';
  ctx.fillText(`${set2.p2}`, 1300, 566);

  // Alcaraz Set 3 (Current Active Set Games)
  ctx.fillStyle = '#facc15';
  ctx.font = '900 88px monospace';
  ctx.fillText(`${matchScore.p2Games}`, 1500, 570);

  // Alcaraz Points Box
  const p2Leading = matchScore.p2Points > matchScore.p1Points;
  ctx.fillStyle = p2Leading ? '#d97706' : 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(1700, 470, 240, 140);
  ctx.strokeStyle = p2Leading ? '#facc15' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1700, 470, 240, 140);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 80px monospace';
  ctx.fillText(getTennisPointsLabel(matchScore.p2Points, matchScore.isTiebreak, matchScore.p2TiebreakPoints), 1820, 570);

  // ⚡ BOTTOM SECTION: RADAR SPEED & REAL MATCH SITUATION
  // Linke Box: Live Radar Velocity & Shot Speed Meter
  ctx.fillStyle = '#020617';
  ctx.fillRect(32, 650, 976, 340);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 650, 976, 340);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 36px "Inter", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('⚡ LIVE SHOT & SERVE SPEED RADAR', 64, 710);

  const kmhMatch = matchScore.lastMessage.match(/(\d{2,3})\s*km\/h/i);
  const speedVal = kmhMatch ? parseInt(kmhMatch[1], 10) : 196;
  const displayKmh = `${speedVal} KM/H`;
  const displayMph = `${Math.round(speedVal * 0.621371)} MPH`;

  ctx.fillStyle = speedVal >= 230 ? '#ef4444' : speedVal >= 190 ? '#facc15' : '#22c55e';
  ctx.font = '900 120px monospace';
  ctx.fillText(displayKmh, 64, 850);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 38px monospace';
  ctx.fillText(`(${displayMph}) • RALLY: ${matchScore.rallyCount} SHOTS`, 64, 930);

  // Rechte Box: Umpire & Live Match Action / Situation
  ctx.fillStyle = '#020617';
  ctx.fillRect(1040, 650, 976, 340);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1040, 650, 976, 340);

  ctx.fillStyle = '#facc15';
  ctx.font = '900 36px "Inter", sans-serif';
  ctx.fillText('🪑 CHAIR UMPIRE CALL & SITUATION', 1072, 710);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 56px monospace';
  ctx.fillText(matchScore.umpireCall, 1072, 795);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 30px "Inter", sans-serif';
  const truncatedMsg = matchScore.lastMessage.length > 40 
    ? matchScore.lastMessage.substring(0, 40) + '...' 
    : matchScore.lastMessage;
  ctx.fillText(truncatedMsg, 1072, 865);

  // Situation Alert Footer
  let situationText = 'DECIDING 3RD SET IN PROGRESS';
  let situationColor = '#38bdf8';
  if (matchScore.p1Points === 40 && matchScore.p2Points < 40 && matchScore.server === 2) {
    situationText = '🔥 BREAK POINT SINNER';
    situationColor = '#ef4444';
  } else if (matchScore.p2Points === 40 && matchScore.p1Points < 40 && matchScore.server === 1) {
    situationText = '🔥 BREAK POINT ALCARAZ';
    situationColor = '#ef4444';
  } else if (matchScore.p1Points === 40 && matchScore.p2Points === 40) {
    situationText = '⚖️ DEUCE (40 - 40)';
    situationColor = '#facc15';
  }
  ctx.fillStyle = situationColor;
  ctx.font = '900 32px "Inter", sans-serif';
  ctx.fillText(`STATUS: ${situationText}`, 1072, 935);
}

function updateSharedTexture(matchScore: MatchScore, now: number): THREE.CanvasTexture {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCanvas.width = 2048;
    sharedCanvas.height = 1024;
    sharedTexture = new THREE.CanvasTexture(sharedCanvas);
    sharedTexture.colorSpace = THREE.SRGBColorSpace;
    sharedTexture.minFilter = THREE.LinearFilter;
    sharedTexture.magFilter = THREE.LinearFilter;
    const ctx = sharedCanvas.getContext('2d');
    if (ctx) {
      drawScoreboardCanvas(ctx, matchScore, now * 0.001);
      sharedTexture.needsUpdate = true;
    }
  }

  const renderKey = `${matchScore.p1Points}_${matchScore.p2Points}_${matchScore.p1Games}_${matchScore.p2Games}_${matchScore.p1Sets}_${matchScore.p2Sets}_${matchScore.server}_${matchScore.serveAttempt}_${matchScore.matchTimeSeconds}_${matchScore.lastMessage}_${matchScore.umpireCall}_${matchScore.isTiebreak}_${matchScore.p1TiebreakPoints}_${matchScore.p2TiebreakPoints}`;

  if (renderKey === lastRenderKey && (now - lastRenderTime < 250)) {
    return sharedTexture!;
  }

  lastRenderKey = renderKey;
  lastRenderTime = now;

  const ctx = sharedCanvas.getContext('2d');
  if (ctx) {
    drawScoreboardCanvas(ctx, matchScore, now * 0.001);
    if (sharedTexture) {
      sharedTexture.needsUpdate = true;
    }
  }

  return sharedTexture!;
}

export default function TennisStadiumScoreboard({
  matchScore,
  position = [0, 4.8, -20.5],
  rotation = [0, 0, 0],
  scale = 1.0
}: TennisStadiumScoreboardProps) {
  // Initiale Erstellung & Update bei Zustandswechsel
  useEffect(() => {
    updateSharedTexture(matchScore, performance.now());
  }, [matchScore]);

  // Sanfte periodische Aktualisierung für Uhrzeit/Pulse (max 4x pro Sekunde)
  useFrame((state) => {
    updateSharedTexture(matchScore, state.clock.elapsedTime * 1000);
  });

  const texture = useMemo(() => {
    return updateSharedTexture(matchScore, performance.now());
  }, []);

  // PBR-Materialien für den 3D-Rahmen und die LED-Anzeige
  const matFrameSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0a0f1d,
    metalness: 0.85,
    roughness: 0.25
  }), []);

  const matDisplayScreen = useMemo(() => new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    side: THREE.DoubleSide
  }), [texture]);

  const matTrussPoles = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.3
  }), []);

  const matBacklight = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  }), []);

  // 🏟️ GROSSE GRUNDLINIEN-ANZEIGETAFEL (11.0m x 5.5m - HINTEN & VORNE)
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Haupt-LED-Display Screen (Vor dem Gehäuse bei Z = +0.18m platziert -> 100% frei sichtbar!) */}
      <mesh position={[0, 0, 0.18]}>
        <planeGeometry args={[11.0, 5.5]} />
        <primitive object={matDisplayScreen} attach="material" />
      </mesh>

      {/* 2. Solider PBR Stahlrahmen mit Kanten (Hinter dem Screen zentriert bei Z = 0) */}
      <mesh material={matFrameSteel} castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[11.5, 6.0, 0.32]} />
      </mesh>

      {/* 3. Goldene & Blaue LED-Zierleisten oben und unten */}
      <mesh position={[0, 2.92, 0.2]}>
        <boxGeometry args={[11.3, 0.08, 0.08]} />
        <meshBasicMaterial color="#facc15" toneMapped={false} />
      </mesh>
      <mesh position={[0, -2.92, 0.2]}>
        <boxGeometry args={[11.3, 0.08, 0.08]} />
        <meshBasicMaterial color="#38bdf8" toneMapped={false} />
      </mesh>

      {/* 4. Subtiles Ambient LED Backlight / Glow hinter der Anzeigetafel */}
      <mesh position={[0, 0, -0.22]}>
        <planeGeometry args={[12.6, 7.2]} />
        <primitive object={matBacklight} attach="material" />
      </mesh>

      {/* 5. Schwere Industrielle Trägerkonstruktion (Truss Mount Towers bis zum Boden) */}
      <mesh material={matTrussPoles} castShadow position={[-5.2, -3.2, -0.1]}>
        <cylinderGeometry args={[0.14, 0.16, 7.0, 16]} />
      </mesh>
      <mesh material={matTrussPoles} castShadow position={[5.2, -3.2, -0.1]}>
        <cylinderGeometry args={[0.14, 0.16, 7.0, 16]} />
      </mesh>
      {/* Horizontale Querstrebe */}
      <mesh material={matTrussPoles} castShadow position={[0, -2.4, -0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.11, 10.4, 12]} />
      </mesh>
    </group>
  );
}
