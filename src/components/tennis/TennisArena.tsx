import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import RealisticTennisNet from '../RealisticTennisNet';

/**
 * ============================================================================
 * TENNIS ARENA & COURT SUB-ASSEMBLY (AGENT 13)
 * PBR-Beläge (Clay, Grass, Hardcourt, Cyber), Linien & Turniertennisnetz
 * Exakte ITF / ATP Grand Slam Abmessungen für Spielfeld & Sand-Auslaufzone
 * ============================================================================
 */

export type CourtSurface = 'clay' | 'grass' | 'hardcourt' | 'cyber';

export interface TennisCourtArenaProps {
  surface?: CourtSurface;
}

export function TennisCourtArena({ surface = 'clay' }: TennisCourtArenaProps) {
  // 📐 Offizielle ATP / ITF Spielfeld- & Auslauf-Maße
  const courtLength = 23.77;   // Standard-Spielfeld Länge (m)
  const courtWidth = 10.97;    // Doppel-Spielfeld Breite (m)
  const singlesWidth = 8.23;   // Einzel-Spielfeld Breite (m)
  const serviceLineZ = 6.40;   // Aufschlaglinie Abstand zum Netz (m)

  // 🏛️ Offizielle ITF Grand Slam Auslaufzone (Run-off Box: 18.50m × 37.00m)
  // Nur DIESER Bereich ist der eigentliche Sandplatz mit Ziegelmehl & Auslauf!
  const runOffWidth = 18.50;   // 10.97m + 2 × 3.765m Seitenauslauf
  const runOffLength = 37.00;  // 23.77m + 2 × 6.615m Hinterauslauf (schließt die Kranschienen ein)

  // 🏟️ Äußere Arena & Stadion-Boden (Rest der Arena außerhalb des Sandplatzes)
  const arenaFloorWidth = 52.0;
  const arenaFloorLength = 76.0;

  // 1. Prozedurale Textur für das Spielfeld & die Sand-Auslaufzone
  const { courtTexture, courtBumpTexture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bCtx = bumpCanvas.getContext('2d');

    if (!ctx || !bCtx) return { courtTexture: null, courtBumpTexture: null };

    // Neutraler Bump-Hintergrund
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);

    if (surface === 'clay') {
      // 🧱 ECHTE TAKTILE SANDKÖRNUNG (DISCRETE BRICK & QUARTZ GRAIN PARTICLES)
      const imgData = ctx.createImageData(512, 512);
      const bImgData = bCtx.createImageData(512, 512);
      const data = imgData.data;
      const bData = bImgData.data;

      // Pixel-genaue Generierung von Ziegelmehl-, Quarz- und Basalt-Sandkörnern
      for (let y = 0; y < 512; y++) {
        // Schleppnetz-Abziehrillen in Längsrichtung
        const broomWave = Math.sin(y * 0.45) * 10 + Math.sin(y * 0.12) * 6;
        // Feuchtigkeits- und Makro-Schattierung
        const macroVariation = Math.sin(y * 0.015) * 8 + Math.cos(y * 0.025) * 6;

        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4;

          // Grundpigment Roland Garros / Monte Carlo Ziegelmehl
          let baseR = 194 + broomWave + macroVariation;
          let baseG = 74 + (broomWave * 0.35) + (macroVariation * 0.3);
          let baseB = 30 + (broomWave * 0.2) + (macroVariation * 0.15);
          let bumpVal = 128 + broomWave * 1.5;

          // 🔬 MIKRO-SANDKÖRNUNG
          const grainRandom = Math.random();

          if (grainRandom > 0.91) {
            const grainBoost = Math.random() * 55 + 25;
            baseR = Math.min(255, baseR + grainBoost * 1.15);
            baseG = Math.min(255, baseG + grainBoost * 0.80);
            baseB = Math.min(255, baseB + grainBoost * 0.45);
            bumpVal = Math.min(255, bumpVal + 75);
          } else if (grainRandom < 0.12) {
            const grainDrop = Math.random() * 45 + 20;
            baseR = Math.max(30, baseR - grainDrop * 1.2);
            baseG = Math.max(12, baseG - grainDrop * 1.0);
            baseB = Math.max(5, baseB - grainDrop * 0.8);
            bumpVal = Math.max(20, bumpVal - 65);
          } else {
            const microNoise = (Math.random() - 0.5) * 28;
            baseR = Math.min(255, Math.max(0, baseR + microNoise));
            baseG = Math.min(255, Math.max(0, baseG + microNoise * 0.5));
            baseB = Math.min(255, Math.max(0, baseB + microNoise * 0.3));
            bumpVal = Math.min(255, Math.max(0, bumpVal + microNoise * 1.8));
          }

          data[idx] = Math.round(baseR);
          data[idx + 1] = Math.round(baseG);
          data[idx + 2] = Math.round(baseB);
          data[idx + 3] = 255;

          bData[idx] = Math.round(bumpVal);
          bData[idx + 1] = Math.round(bumpVal);
          bData[idx + 2] = Math.round(bumpVal);
          bData[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      bCtx.putImageData(bImgData, 0, 0);

      // Sanfte Rutschspuren im Sand überlagern
      for (let i = 0; i < 14; i++) {
        const sx = (i % 2 === 0 ? 70 : 330) + (Math.random() - 0.5) * 80;
        const sy = 30 + i * 34 + (Math.random() - 0.5) * 15;
        const len = 50 + Math.random() * 40;
        
        ctx.strokeStyle = 'rgba(235, 120, 60, 0.18)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + len * 0.5, sy - 8, sx + len, sy + 4);
        ctx.stroke();
      }
    } else if (surface === 'grass') {
      ctx.fillStyle = '#1e5e22';
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 32) {
        ctx.fillStyle = (y / 32) % 2 === 0 ? 'rgba(30, 94, 34, 0.85)' : 'rgba(46, 125, 50, 0.85)';
        ctx.fillRect(0, y, 512, 32);
      }
      for (let i = 0; i < 8000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(76, 175, 80, 0.15)' : 'rgba(20, 60, 20, 0.15)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
    } else if (surface === 'hardcourt') {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 6000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(37, 99, 235, 0.2)' : 'rgba(29, 78, 216, 0.2)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
      }
    } else {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= 512; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y <= 512; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    const bTex = new THREE.CanvasTexture(bumpCanvas);

    if (surface === 'clay') {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(16, 32);
      tex.anisotropy = 16;

      bTex.wrapS = THREE.RepeatWrapping;
      bTex.wrapT = THREE.RepeatWrapping;
      bTex.repeat.set(16, 32);
      bTex.anisotropy = 16;
    } else {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      bTex.wrapS = THREE.ClampToEdgeWrapping;
      bTex.wrapT = THREE.ClampToEdgeWrapping;
    }

    return { courtTexture: tex, courtBumpTexture: bTex };
  }, [surface]);

  // 2. Prozedurale Textur für den äußeren Stadion-Boden (Anthrazit / Betonplatten / Apron)
  const { apronTexture, apronBumpTexture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const bCanvas = document.createElement('canvas');
    bCanvas.width = 512;
    bCanvas.height = 512;
    const bCtx = bCanvas.getContext('2d');

    if (!ctx || !bCtx) return { apronTexture: null, apronBumpTexture: null };

    // Dunkler eleganter Grand Slam Stadion-Apron (Slate Anthrazit)
    ctx.fillStyle = surface === 'cyber' ? '#040711' : '#141a24';
    ctx.fillRect(0, 0, 512, 512);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);

    // Raster aus Beton-Plattenfugen (Slabs Grid)
    const tileSize = 128;
    ctx.strokeStyle = 'rgba(8, 12, 18, 0.75)';
    ctx.lineWidth = 3;
    bCtx.strokeStyle = '#303030';
    bCtx.lineWidth = 3;

    for (let i = 0; i <= 512; i += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(0, i);
      bCtx.lineTo(512, i);
      bCtx.stroke();

      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(i, 0);
      bCtx.lineTo(i, 512);
      bCtx.stroke();
    }

    // Feine Kornstruktur & Schattierung
    for (let i = 0; i < 3500; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const alpha = Math.random() * 0.08;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha * 1.5})`;
      ctx.fillRect(rx, ry, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const bTex = new THREE.CanvasTexture(bCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 26);
    tex.anisotropy = 8;

    bTex.wrapS = THREE.RepeatWrapping;
    bTex.wrapT = THREE.RepeatWrapping;
    bTex.repeat.set(18, 26);
    bTex.anisotropy = 8;

    return { apronTexture: tex, apronBumpTexture: bTex };
  }, [surface]);

  // Ressourcen-Freigabe bei Wechsel oder Unmount (Industrial Gold Standard)
  useEffect(() => {
    return () => {
      courtTexture?.dispose();
      courtBumpTexture?.dispose();
      apronTexture?.dispose();
      apronBumpTexture?.dispose();
    };
  }, [courtTexture, courtBumpTexture, apronTexture, apronBumpTexture]);

  const matLineWhite = useMemo(() => new THREE.MeshStandardMaterial({
    color: surface === 'cyber' ? '#38bdf8' : '#ffffff',
    emissive: surface === 'cyber' ? '#38bdf8' : '#000000',
    emissiveIntensity: surface === 'cyber' ? 0.8 : 0,
    roughness: 0.35,
    metalness: 0.08
  }), [surface]);

  // 🧱 Material für die offizielle Sand-Auslaufzone (18.50m × 37.00m)
  const matRunOff = useMemo(() => new THREE.MeshStandardMaterial({
    color: surface === 'clay' ? '#9e3916' : surface === 'hardcourt' ? '#047857' : surface === 'grass' ? '#14532d' : '#040711',
    bumpMap: courtBumpTexture || undefined,
    bumpScale: surface === 'clay' ? 0.035 : 0.0,
    roughness: surface === 'clay' ? 0.92 : 0.85,
    metalness: 0.02
  }), [surface, courtBumpTexture]);

  // 🏟️ Material für den äußeren Stadion-Apron-Boden (NICHT Sand, sondern dunkler Arena-Boden)
  const matStadiumApron = useMemo(() => new THREE.MeshStandardMaterial({
    color: surface === 'cyber' ? '#040711' : '#141a24',
    map: apronTexture || undefined,
    bumpMap: apronBumpTexture || undefined,
    bumpScale: 0.025,
    roughness: 0.78,
    metalness: 0.12
  }), [surface, apronTexture, apronBumpTexture]);

  // 🔲 Dezenter Einfassungs-Rand / Court Curb um das 18.50m × 37.00m Sand-Rechteck
  const matCourtBorder = useMemo(() => new THREE.MeshStandardMaterial({
    color: surface === 'cyber' ? '#0284c7' : '#1e2634',
    roughness: 0.55,
    metalness: 0.45
  }), [surface]);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Äußerer Stadion-Boden (Anthrazit / Betonplatten) – Füllt die gesamte Arena */}
      <mesh receiveShadow position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[arenaFloorWidth, arenaFloorLength]} />
        <primitive object={matStadiumApron} attach="material" />
      </mesh>

      {/* 2. Offizielle ITF/ATP Sandplatz-Auslaufzone (18.50m × 37.00m) – NUR HIER IST SAND! */}
      <mesh receiveShadow position={[0, -0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[runOffWidth, runOffLength]} />
        <primitive object={matRunOff} attach="material" />
      </mesh>

      {/* 3. Architektonische Einfassungskante (Curb Border) um das 18.50m × 37.00m Sandfeld */}
      {/* Nord- & Süd-Kante */}
      <mesh receiveShadow castShadow material={matCourtBorder} position={[0, -0.003, -runOffLength / 2]}>
        <boxGeometry args={[runOffWidth + 0.12, 0.012, 0.08]} />
      </mesh>
      <mesh receiveShadow castShadow material={matCourtBorder} position={[0, -0.003, runOffLength / 2]}>
        <boxGeometry args={[runOffWidth + 0.12, 0.012, 0.08]} />
      </mesh>
      {/* West- & Ost-Kante */}
      <mesh receiveShadow castShadow material={matCourtBorder} position={[-runOffWidth / 2, -0.003, 0]}>
        <boxGeometry args={[0.08, 0.012, runOffLength]} />
      </mesh>
      <mesh receiveShadow castShadow material={matCourtBorder} position={[runOffWidth / 2, -0.003, 0]}>
        <boxGeometry args={[0.08, 0.012, runOffLength]} />
      </mesh>

      {/* 4. Inneres Haupt-Spielfeld (10.97m × 23.77m) mit taktilem Ziegelmehl & Rutschspuren */}
      <mesh receiveShadow position={[0, -0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[courtWidth, courtLength]} />
        {courtTexture && (
          <meshStandardMaterial
            map={courtTexture}
            bumpMap={courtBumpTexture || undefined}
            bumpScale={surface === 'clay' ? 0.045 : 0.004}
            roughness={surface === 'clay' ? 0.92 : 0.7}
            metalness={surface === 'clay' ? 0.02 : 0.08}
          />
        )}
      </mesh>

      {/* 5. Weiße Linien-Markierungen (0.05m / 0.10m PVC Bänder) */}
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, -courtLength / 2]}>
        <boxGeometry args={[courtWidth, 0.004, 0.10]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, courtLength / 2]}>
        <boxGeometry args={[courtWidth, 0.004, 0.10]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[-courtWidth / 2, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, courtLength]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[courtWidth / 2, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, courtLength]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[-singlesWidth / 2, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, courtLength]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[singlesWidth / 2, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, courtLength]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, -serviceLineZ]}>
        <boxGeometry args={[singlesWidth, 0.004, 0.05]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, serviceLineZ]}>
        <boxGeometry args={[singlesWidth, 0.004, 0.05]} />
      </mesh>
      <mesh receiveShadow material={matLineWhite} position={[0, 0.001, 0]}>
        <boxGeometry args={[0.05, 0.004, serviceLineZ * 2]} />
      </mesh>

      {/* 6. 🎾 GRAND SLAM TOURNAMENT TENNIS NET */}
      <RealisticTennisNet surface={surface} singlesWidth={singlesWidth} />
    </group>
  );
}
