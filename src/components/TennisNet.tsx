import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface TennisNetProps {
  surface?: 'clay' | 'grass' | 'hardcourt' | 'cyber';
  impactBurst?: { pos: THREE.Vector3; time: number } | null;
  isNetError?: boolean;
  isNetCord?: boolean;
  ballPos?: THREE.Vector3;
}

// --- 📐 ITF TOURNAMENT SPECIFICATIONS ---
const POST_X = 6.2;              // Pfostenabstand vom Zentrum (±6.2m = 12.4m Gesamtbreite)
const SINGLES_STICK_X = 5.03;    // Einzelstützen (0.914m außerhalb der Einzellinie 4.115m)
const POST_HEIGHT = 1.07;        // Höhe an den Pfosten & Einzelstützen (1.07m / 3.5 ft)
const CENTER_HEIGHT = 0.914;     // Höhe am Mittelgurt (0.914m / 3.0 ft / 36 Zoll)
const BOTTOM_Y = 0.04;           // Bodenabstand Unterkante (4 cm)
const SEGMENTS_X = 64;           // Feinheit Maschengitter X
const SEGMENTS_Y = 16;           // Feinheit Maschengitter Y

/**
 * Berechnet die physikalische Katenoiden-Höhe des Netzkabels an Position X
 */
export function getNetCatenaryHeight(x: number): number {
  const absX = Math.min(Math.abs(x), POST_X);
  if (absX <= SINGLES_STICK_X) {
    const ratio = absX / SINGLES_STICK_X;
    return CENTER_HEIGHT + (POST_HEIGHT - CENTER_HEIGHT) * (ratio * ratio);
  }
  return POST_HEIGHT;
}

/**
 * 🎾 DEDIZIERTER SPEZIAL-AGENT: tennis_net
 * Verwaltet die vollständige Kinematik, Geometrie, PBR-Materialien und dynamische
 * Impakt-Wellenphysik des Turnier-Tennisnetzes nach ITF/ATP-Standards.
 */
export default function TennisNet({
  surface = 'clay',
  impactBurst,
  isNetError,
  isNetCord,
  ballPos: _ballPos
}: TennisNetProps) {
  const netMeshRef = useRef<THREE.Mesh>(null);
  const bandMeshRef = useRef<THREE.Mesh>(null);
  const activeImpactRef = useRef<{ pos: THREE.Vector3; time: number; intensity: number; dirZ: number } | null>(null);

  // Reagiert auf neue Netztreffer
  useEffect(() => {
    if (impactBurst) {
      const dirZ = impactBurst.pos.z < 0 ? 1 : -1;
      const intensity = isNetCord ? 0.06 : isNetError ? 0.14 : 0.09;
      activeImpactRef.current = {
        pos: impactBurst.pos.clone(),
        time: impactBurst.time,
        intensity,
        dirZ
      };
    }
  }, [impactBurst, isNetError, isNetCord]);

  // --- 🎨 PROZEDURALE TEXTUREN FÜR NETZMASCHEN & DOPPELT-VERSTÄRKTES GEWEBE ---
  const netMeshTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 512, 512);

    // Feines geflochtenes Polyethylen-Gittermuster (~45mm Maschenweite)
    const step = 16;
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#111827'; // Tiefschwarzer, matter Synthetikfaden

    for (let x = 0; x <= 512; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    for (let y = 0; y <= 512; y += step) {
      // Obere 18% des Netzes: Double-Top-Netting (Doppelfaden-Verstärkung)
      if (y < 96) {
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = '#030712';
      } else {
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#181e29';
      }
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Knotenpunkte an den Kreuzungen (Knotless/Knotted Micro-Punkte)
    ctx.fillStyle = '#0b0f17';
    for (let x = 0; x <= 512; x += step) {
      for (let y = 0; y <= 512; y += step) {
        ctx.beginPath();
        const r = y < 96 ? 2.2 : 1.4;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(52, 7); // Entspricht ca. 280 x 24 echten Maschen
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Textur für das weiße Vinyl-Kantenband mit Doppelnaht
  const headbandTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Weißes Schwerlast-Vinyl
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 64);

    // Doppelte Nahtlinie oben & unten (Heavy-duty Polyester-Garn)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(512, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 56);
    ctx.lineTo(512, 56);
    ctx.stroke();

    // Mittlerer Knickfalz über dem Stahlkabel
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, 32);
    ctx.lineTo(512, 32);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(32, 1);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // --- 🏷️ PBR MATERIALIEN ---
  const matNetPost = useMemo(() => {
    const postColor = surface === 'clay' ? '#143823' // Roland Garros Forest Green
      : surface === 'grass' ? '#092b15'            // Wimbledon Dark Green
      : surface === 'hardcourt' ? '#1e293b'        // US Open Graphite Slate
      : '#090d16';                                 // Cyber Black

    return new THREE.MeshStandardMaterial({
      color: postColor,
      metalness: 0.75,
      roughness: 0.28,
      emissive: surface === 'cyber' ? '#38bdf8' : '#000000',
      emissiveIntensity: surface === 'cyber' ? 0.3 : 0
    });
  }, [surface]);

  const matWinchChrome = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.95,
    roughness: 0.15
  }), []);

  const matBrassHandle = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#d97706',
    metalness: 0.85,
    roughness: 0.3
  }), []);

  const matHeadband = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: headbandTexture || undefined,
    roughness: 0.35,
    metalness: 0.05,
    emissive: surface === 'cyber' ? '#38bdf8' : '#000000',
    emissiveIntensity: surface === 'cyber' ? 0.2 : 0
  }), [headbandTexture, surface]);

  const matCenterStrap = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.45,
    metalness: 0.05
  }), []);

  const matCenterBuckle = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.92,
    roughness: 0.2
  }), []);

  const matSinglesStick = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ca8a04', // Gebeiztes Eschenholz / Alustütze
    roughness: 0.55,
    metalness: 0.15
  }), []);

  const matSteelCable = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.9,
    roughness: 0.25
  }), []);

  const matBottomBand = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.7,
    metalness: 0.1
  }), []);

  // --- 🕸️ PROZEDURALES KATENOIDEN-NETZGITTER (INITIAL) ---
  const { initialPositions, indices, uvs } = useMemo(() => {
    const numVerts = (SEGMENTS_X + 1) * (SEGMENTS_Y + 1);
    const pos = new Float32Array(numVerts * 3);
    const uvsArr = new Float32Array(numVerts * 2);
    const ind: number[] = [];

    let vIdx = 0;
    for (let j = 0; j <= SEGMENTS_Y; j++) {
      const v = j / SEGMENTS_Y;
      for (let i = 0; i <= SEGMENTS_X; i++) {
        const u = i / SEGMENTS_X;
        const x = -POST_X + u * (POST_X * 2);
        const topY = getNetCatenaryHeight(x);
        const y = BOTTOM_Y + v * (topY - BOTTOM_Y);
        const z = 0;

        pos[vIdx * 3] = x;
        pos[vIdx * 3 + 1] = y;
        pos[vIdx * 3 + 2] = z;

        uvsArr[vIdx * 2] = u;
        uvsArr[vIdx * 2 + 1] = v;

        vIdx++;
      }
    }

    for (let j = 0; j < SEGMENTS_Y; j++) {
      for (let i = 0; i < SEGMENTS_X; i++) {
        const a = j * (SEGMENTS_X + 1) + i;
        const b = a + 1;
        const c = (j + 1) * (SEGMENTS_X + 1) + i;
        const d = c + 1;

        ind.push(a, b, c);
        ind.push(b, d, c);
      }
    }

    return {
      initialPositions: pos,
      indices: ind,
      uvs: uvsArr
    };
  }, []);

  // Initiale Geometrie für das gewölbte Netzkantenband (Headband)
  const headbandGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const bandSegments = 64;
    const bandVerts = (bandSegments + 1) * 2;
    const pos = new Float32Array(bandVerts * 3);
    const uvsArr = new Float32Array(bandVerts * 2);
    const ind: number[] = [];

    const bandHalfH = 0.032; // 64mm Gesamthöhe

    for (let i = 0; i <= bandSegments; i++) {
      const u = i / bandSegments;
      const x = -POST_X + u * (POST_X * 2);
      const topY = getNetCatenaryHeight(x);

      // Unterkante Band
      pos[i * 6] = x;
      pos[i * 6 + 1] = topY - bandHalfH;
      pos[i * 6 + 2] = 0;

      uvsArr[i * 4] = u;
      uvsArr[i * 4 + 1] = 0;

      // Oberkante Band
      pos[i * 6 + 3] = x;
      pos[i * 6 + 4] = topY + bandHalfH * 0.4;
      pos[i * 6 + 5] = 0;

      uvsArr[i * 4 + 2] = u;
      uvsArr[i * 4 + 3] = 1;
    }

    for (let i = 0; i < bandSegments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      ind.push(a, b, c);
      ind.push(b, d, c);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvsArr, 2));
    geom.setIndex(ind);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Initiale Geometrie für das Netzmesh
  const netMeshGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(initialPositions), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [initialPositions, indices, uvs]);

  // --- 🌊 DYNAMISCHE IMPAKT- & WELLEN-PHYSIK (useFrame) ---
  useFrame((state) => {
    const netMesh = netMeshRef.current;
    if (!netMesh || !netMesh.geometry) return;

    const posAttr = netMesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!posAttr) return;
    const posArray = posAttr.array as Float32Array;
    const now = Date.now();
    const tSec = state.clock.getElapsedTime();

    const impact = activeImpactRef.current;
    let hasActiveImpulse = false;
    let dtImpact = 0;

    if (impact) {
      dtImpact = (now - impact.time) / 1000;
      if (dtImpact < 2.2) {
        hasActiveImpulse = true;
      } else {
        activeImpactRef.current = null;
      }
    }

    let vIdx = 0;
    for (let j = 0; j <= SEGMENTS_Y; j++) {
      const v = j / SEGMENTS_Y;
      for (let i = 0; i <= SEGMENTS_X; i++) {
        const u = i / SEGMENTS_X;
        const x = -POST_X + u * (POST_X * 2);
        const topY = getNetCatenaryHeight(x);
        const baseY = BOTTOM_Y + v * (topY - BOTTOM_Y);

        // Subtiler natürlicher Wind-Drift (< 1.8mm)
        let zDisp = Math.sin(tSec * 2.8 + x * 0.8) * Math.cos(tSec * 1.9 + v * 2.0) * 0.0018;

        // Impakt-Wellenberechnung bei Ballkontakt
        if (hasActiveImpulse && impact) {
          const dx = x - impact.pos.x;
          const dy = baseY - impact.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // 2D Radialwellen-Gleichung mit exponentieller Dämpfung
          const waveSpeed = 8.5; // m/s
          const waveFreq = 16.0; // rad/s
          const decay = Math.exp(-dtImpact * 2.8);
          const spatialFalloff = Math.exp(-(dist * dist) / 1.8);

          const wavePhase = dtImpact * waveSpeed - dist;
          if (wavePhase > -0.2) {
            const wave = Math.sin(wavePhase * waveFreq) * decay * spatialFalloff;
            // Randbedingungen: Pfosten (X = ±POST_X) und Unterkante (v = 0) sind fixiert
            const edgeBoundaryX = Math.sin((u * Math.PI));
            const edgeBoundaryY = Math.sin((v * Math.PI * 0.85) + 0.15);
            zDisp += wave * impact.intensity * impact.dirZ * edgeBoundaryX * edgeBoundaryY;
          }
        }

        posArray[vIdx * 3] = x;
        posArray[vIdx * 3 + 1] = baseY;
        posArray[vIdx * 3 + 2] = zDisp;

        vIdx++;
      }
    }

    posAttr.needsUpdate = true;
    netMesh.geometry.computeVertexNormals();

    // Synchronisiere auch das Netzkantenband (Headband) bei Treffern nahe der Netzkante
    const bandMesh = bandMeshRef.current;
    if (bandMesh && bandMesh.geometry && hasActiveImpulse && impact) {
      const bandPosAttr = bandMesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (bandPosAttr) {
        const bandPosArr = bandPosAttr.array as Float32Array;
        const bandSegs = 64;
        const bandHalfH = 0.032;

        for (let i = 0; i <= bandSegs; i++) {
          const u = i / bandSegs;
          const x = -POST_X + u * (POST_X * 2);
          const topY = getNetCatenaryHeight(x);

          const dx = x - impact.pos.x;
          const dy = topY - impact.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const decay = Math.exp(-dtImpact * 3.2);
          const spatialFalloff = Math.exp(-(dist * dist) / 1.4);
          const edgeBoundaryX = Math.sin((u * Math.PI));
          const bandDisp = Math.sin(dtImpact * 18.0 - dist * 4.0) * decay * spatialFalloff * impact.intensity * 0.65 * impact.dirZ * edgeBoundaryX;

          bandPosArr[i * 6] = x;
          bandPosArr[i * 6 + 1] = topY - bandHalfH;
          bandPosArr[i * 6 + 2] = bandDisp;

          bandPosArr[i * 6 + 3] = x;
          bandPosArr[i * 6 + 4] = topY + bandHalfH * 0.4;
          bandPosArr[i * 6 + 5] = bandDisp;
        }
        bandPosAttr.needsUpdate = true;
        bandMesh.geometry.computeVertexNormals();
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. 🏁 PFOSTEN LINKS (X = -6.2m) MIT BODENHÜLSE & SEIL-ÖSE */}
      <group position={[-POST_X, 0, 0]}>
        {/* Bodenhülse & Montageflansch */}
        <mesh receiveShadow material={matNetPost} position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.04, 24]} />
        </mesh>
        <mesh receiveShadow material={matWinchChrome} position={[0, 0.041, 0]}>
          <ringGeometry args={[0.045, 0.075, 16]} />
        </mesh>

        {/* Haupt-Pfostenrohr */}
        <mesh castShadow receiveShadow material={matNetPost} position={[0, POST_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[0.042, 0.045, POST_HEIGHT, 24]} />
        </mesh>

        {/* Pfostenkopf mit Seilführungs-Umlenkrolle */}
        <mesh castShadow material={matNetPost} position={[0, POST_HEIGHT + 0.015, 0]}>
          <cylinderGeometry args={[0.048, 0.045, 0.03, 24]} />
        </mesh>
        <mesh castShadow material={matBrassHandle} position={[0.01, POST_HEIGHT + 0.022, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.024, 16]} />
        </mesh>

        {/* Kabelanker-Öse & Spannschloss (links) */}
        <mesh castShadow material={matWinchChrome} position={[0.045, 0.65, 0]}>
          <boxGeometry args={[0.03, 0.04, 0.03]} />
        </mesh>
        <mesh castShadow material={matWinchChrome} position={[0.065, 0.65, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.016, 0.005, 8, 16]} />
        </mesh>

        {/* Seitliche Netzschnürung / Spannstab */}
        <mesh castShadow material={matSteelCable} position={[0.09, 0.52, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.94, 12]} />
        </mesh>
      </group>

      {/* 2. 🏁 PFOSTEN RECHTS (X = +6.2m) MIT SPANNKURBEL-GETRIEBE */}
      <group position={[POST_X, 0, 0]}>
        {/* Bodenhülse */}
        <mesh receiveShadow material={matNetPost} position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.04, 24]} />
        </mesh>
        <mesh receiveShadow material={matWinchChrome} position={[0, 0.041, 0]}>
          <ringGeometry args={[0.045, 0.075, 16]} />
        </mesh>

        {/* Haupt-Pfostenrohr */}
        <mesh castShadow receiveShadow material={matNetPost} position={[0, POST_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[0.042, 0.045, POST_HEIGHT, 24]} />
        </mesh>

        {/* Pfostenkopf mit Seilführungs-Umlenkrolle */}
        <mesh castShadow material={matNetPost} position={[0, POST_HEIGHT + 0.015, 0]}>
          <cylinderGeometry args={[0.048, 0.045, 0.03, 24]} />
        </mesh>
        <mesh castShadow material={matBrassHandle} position={[-0.01, POST_HEIGHT + 0.022, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.024, 16]} />
        </mesh>

        {/* Ratchet-Spanngetriebe Gehäuse (Rechts) */}
        <mesh castShadow material={matNetPost} position={[0.02, 0.65, 0]}>
          <boxGeometry args={[0.08, 0.12, 0.09]} />
        </mesh>
        <mesh castShadow material={matWinchChrome} position={[0.065, 0.65, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        </mesh>
        <mesh castShadow material={matBrassHandle} position={[0.02, 0.72, 0.04]}>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
        </mesh>

        {/* Kurbelarm & Messing-Drehgriff */}
        <group position={[0.075, 0.65, 0]} rotation={[0, 0, 0.6]}>
          <mesh castShadow material={matWinchChrome} position={[0, 0.07, 0]}>
            <boxGeometry args={[0.015, 0.15, 0.008]} />
          </mesh>
          <mesh castShadow material={matBrassHandle} position={[0, 0.14, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.014, 0.07, 16]} />
          </mesh>
        </group>

        {/* Seitlicher Spannstab */}
        <mesh castShadow material={matSteelCable} position={[-0.09, 0.52, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.94, 12]} />
        </mesh>
      </group>

      {/* 3. 🪵 EINZELNETZSTÜTZEN (SINGLES STICKS BEI X = ±5.03m) */}
      {/* Linke Einzelstütze */}
      <group position={[-SINGLES_STICK_X, 0, 0]}>
        {/* Bodenplatte & Gummipuffer */}
        <mesh receiveShadow material={matWinchChrome} position={[0, 0.008, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.016, 16]} />
        </mesh>
        {/* Hauptstab (32mm x 32mm Turnier-Holz/Alu) */}
        <mesh castShadow receiveShadow material={matSinglesStick} position={[0, POST_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.032, POST_HEIGHT - 0.02, 0.032]} />
        </mesh>
        {/* Obere U-Gabel zur Seilaufnahme */}
        <mesh castShadow material={matWinchChrome} position={[0, POST_HEIGHT - 0.004, 0]}>
          <boxGeometry args={[0.036, 0.018, 0.036]} />
        </mesh>
      </group>

      {/* Rechte Einzelstütze */}
      <group position={[SINGLES_STICK_X, 0, 0]}>
        <mesh receiveShadow material={matWinchChrome} position={[0, 0.008, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.016, 16]} />
        </mesh>
        <mesh castShadow receiveShadow material={matSinglesStick} position={[0, POST_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.032, POST_HEIGHT - 0.02, 0.032]} />
        </mesh>
        <mesh castShadow material={matWinchChrome} position={[0, POST_HEIGHT - 0.004, 0]}>
          <boxGeometry args={[0.036, 0.018, 0.036]} />
        </mesh>
      </group>

      {/* 4. 🪢 WEISSES NETZKANTEN-BAND (HEADBAND) MIT DOPPELNAHT */}
      <mesh
        ref={bandMeshRef}
        castShadow
        receiveShadow
        geometry={headbandGeom}
        material={matHeadband}
      />

      {/* 5. 🕸️ DYNAMISCHES MICRO-MESH MASCHENGITTER (KATENOIDE & IMPAKT-WELLEN) */}
      <mesh
        ref={netMeshRef}
        castShadow
        receiveShadow
        geometry={netMeshGeom}
      >
        <meshStandardMaterial
          map={netMeshTexture || undefined}
          transparent={true}
          opacity={0.88}
          roughness={0.78}
          metalness={0.12}
          side={THREE.DoubleSide}
          color="#0f172a"
        />
      </mesh>

      {/* 6. 🖤 UNTERE VINYL-EINFASSUNG (BOTTOM BINDING CORD) */}
      <mesh receiveShadow material={matBottomBand} position={[0, BOTTOM_Y, 0]}>
        <boxGeometry args={[POST_X * 2 - 0.16, 0.022, 0.014]} />
      </mesh>

      {/* 7. ⚓ MITTELGURT (CENTER STRAP MIT VERCHROMTER SPANNSCHNALLE & BODENANKER) */}
      <group position={[0, 0, 0]}>
        {/* Bodenanker-Platte im Platzboden eingelassen */}
        <mesh receiveShadow material={matCenterBuckle} position={[0, 0.002, 0]}>
          <cylinderGeometry args={[0.045, 0.048, 0.004, 20]} />
        </mesh>
        {/* Boden-Öse (D-Ring) */}
        <mesh castShadow material={matCenterBuckle} position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.014, 0.004, 8, 16]} />
        </mesh>

        {/* Weißer 50mm Schwerlast-Mittelgurt */}
        <mesh castShadow receiveShadow material={matCenterStrap} position={[0, CENTER_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.052, CENTER_HEIGHT - 0.015, 0.024]} />
        </mesh>

        {/* Verchromte Spannschnalle / Turnbuckle bei Y = 0.52m */}
        <mesh castShadow material={matCenterBuckle} position={[0, 0.52, 0.013]}>
          <boxGeometry args={[0.062, 0.038, 0.012]} />
        </mesh>
        <mesh castShadow material={matCenterBuckle} position={[0, 0.52, -0.013]}>
          <boxGeometry args={[0.062, 0.038, 0.012]} />
        </mesh>
        {/* Schnallen-Querzapfen */}
        <mesh castShadow material={matCenterBuckle} position={[0, 0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.068, 12]} />
        </mesh>

        {/* Herunterhängendes Gurt-Ende */}
        <mesh castShadow material={matCenterStrap} position={[0, 0.44, 0.016]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.048, 0.12, 0.005]} />
        </mesh>
      </group>
    </group>
  );
}
