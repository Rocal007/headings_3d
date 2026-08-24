import { useMemo } from 'react';
import * as THREE from 'three';

export interface RealisticTennisNetProps {
  surface?: 'clay' | 'grass' | 'hardcourt' | 'cyber';
  courtLength?: number;
  courtWidth?: number;
  singlesWidth?: number;
  useSinglesSticks?: boolean;
}

/**
 * ============================================================================
 * 🎾 REALISTIC TOURNAMENT TENNIS NET (GRAND SLAM & ATP TOUR SPECIFICATION)
 * 
 * Regeltreue ITF/ATP-Geometrie:
 * - Pfostenhöhe: 1.07 m (3.5 ft) bei X = ±6.40 m
 * - Netzhöhe im Zentrum: 0.914 m (3.0 ft) bei X = 0.0 m
 * - Parabolischer Katenoid-Durchhang des 4mm Edelstahl-Spannseils
 * - Hochpräzise geknüpfte Doppel-Kordel-Mesh-Textur mit Alpha-Transparenz
 * - Weißes Canvas-Einfassband mit Doppelnaht & Ösen
 * - Regulierband (Center Strap) mit Chrom-Klemmschnalle & Bodenanker
 * - Pulverbeschichtete Turniersäulen mit innenliegender Schneckenrad-Kurbel
 * - Regulation Einzelstützen (Singles Sticks) bei X = ±4.965 m
 * ============================================================================
 */
export function RealisticTennisNet({
  surface = 'clay',
  singlesWidth = 8.23,
  useSinglesSticks = true
}: RealisticTennisNetProps) {
  const postX = 6.40;
  const postHeight = 1.07;
  const centerHeight = 0.914;
  const singlesStickX = singlesWidth / 2 + 0.914; // 4.115 + 0.914 = 5.029m

  // --- 1. PROZEDURALE HOCHAUFLÖSENDE GEKNÜPFTE NETZ-TEXTUR (BRAIDED KNOT MESH) ---
  const netAlphaTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Vollständig transparenter Hintergrund
    ctx.clearRect(0, 0, 512, 512);

    const gridSize = 32;
    const cordThickness = 3.5;

    // Geknüpftes Quadratmaschen-Gitter (Schwarz mit geflochtenen Glanzlichtern)
    for (let x = 0; x <= 512; x += gridSize) {
      ctx.beginPath();
      ctx.strokeStyle = '#14171f';
      ctx.lineWidth = cordThickness;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    for (let y = 0; y <= 512; y += gridSize) {
      ctx.beginPath();
      ctx.strokeStyle = '#14171f';
      ctx.lineWidth = cordThickness;
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Knoten an jeder Maschenkreuzung (Braided Knots)
    ctx.fillStyle = '#0f1117';
    for (let x = 0; x <= 512; x += gridSize) {
      for (let y = 0; y <= 512; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, cordThickness * 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#333b4d';
        ctx.beginPath();
        ctx.arc(x - 0.5, y - 0.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f1117';
      }
    }

    // Obere Doppelmaschen-Verstärkung (Tournament Double Mesh Top Rows)
    for (let y = 0; y <= 96; y += gridSize / 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#14171f';
      ctx.lineWidth = cordThickness * 0.8;
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(72, 8);
    tex.anisotropy = 16;
    return tex;
  }, []);

  // --- 2. WEISSES EINFASSBAND-MATERIAL (HEAVY DUTY VINYL/CANVAS HEADBAND) ---
  const headbandTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Weißes/Cremefarbenes strapazierfähiges Turnier-Gurtband
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 1024, 128);

    // Feine Canvas-Webstruktur
    ctx.fillStyle = 'rgba(226, 232, 240, 0.4)';
    for (let x = 0; x < 1024; x += 4) {
      ctx.fillRect(x, 0, 2, 128);
    }

    // Doppelte Steppnaht oben und unten (Reinforced Seam Thread)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(1024, 18);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 110);
    ctx.lineTo(1024, 110);
    ctx.stroke();

    // Ösen-Punkte (Brass Eyelets) entlang der Unterkante
    ctx.setLineDash([]);
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    for (let x = 24; x < 1024; x += 48) {
      ctx.beginPath();
      ctx.arc(x, 112, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(x, 112, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(12, 1);
    return tex;
  }, []);

  // --- 3. PARABOLISCHE NETZ-TOPOLOGIE (ATP / ITF DURCHHANGS-BERECHNUNG) ---
  const { netMeshGeom, headbandGeom, bottomBandGeom, topCablePoints } = useMemo(() => {
    const segments = 80;
    const halfWidth = postX;
    const xStep = (halfWidth * 2) / segments;

    const netPositions: number[] = [];
    const netNormals: number[] = [];
    const netUvs: number[] = [];
    const netIndices: number[] = [];

    const headPositions: number[] = [];
    const headNormals: number[] = [];
    const headUvs: number[] = [];
    const headIndices: number[] = [];

    const botPositions: number[] = [];
    const botIndices: number[] = [];

    const cablePts: THREE.Vector3[] = [];

    // Höhenfunktion entlang der X-Achse
    const getTopY = (x: number) => {
      const absX = Math.abs(x);
      if (useSinglesSticks) {
        if (absX <= singlesStickX) {
          const ratio = absX / singlesStickX;
          return centerHeight + (postHeight - centerHeight) * Math.pow(ratio, 1.85);
        } else {
          const stickRatio = (absX - singlesStickX) / (halfWidth - singlesStickX);
          return postHeight - 0.02 * (1 - stickRatio);
        }
      } else {
        const ratio = absX / halfWidth;
        return centerHeight + (postHeight - centerHeight) * Math.pow(ratio, 2.0);
      }
    };

    const bottomY = 0.02;
    const headbandHalfHeight = 0.035; // 7cm Einfassband

    for (let i = 0; i <= segments; i++) {
      const x = -halfWidth + i * xStep;
      const topY = getTopY(x);
      const u = i / segments;

      cablePts.push(new THREE.Vector3(x, topY + headbandHalfHeight, 0));

      // --- NET MESH VERTICES (Vorder- und Rückseite) ---
      netPositions.push(x, topY - headbandHalfHeight, 0);
      netNormals.push(0, 0, 1);
      netUvs.push(u, 1.0);

      netPositions.push(x, bottomY + 0.03, 0);
      netNormals.push(0, 0, 1);
      netUvs.push(u, 0.0);

      // --- HEADBAND VERTICES (3D-Volumen / Doppelwandig) ---
      headPositions.push(x, topY + headbandHalfHeight, 0.014);
      headNormals.push(0, 0.4, 0.9);
      headUvs.push(u * 12, 1.0);

      headPositions.push(x, topY - headbandHalfHeight, 0.014);
      headNormals.push(0, -0.4, 0.9);
      headUvs.push(u * 12, 0.0);

      headPositions.push(x, topY + headbandHalfHeight, -0.014);
      headNormals.push(0, 0.4, -0.9);
      headUvs.push(u * 12, 1.0);

      headPositions.push(x, topY - headbandHalfHeight, -0.014);
      headNormals.push(0, -0.4, -0.9);
      headUvs.push(u * 12, 0.0);

      // --- BOTTOM WEIGHT BAND ---
      botPositions.push(x, bottomY + 0.03, 0.008);
      botPositions.push(x, bottomY, 0.008);
      botPositions.push(x, bottomY + 0.03, -0.008);
      botPositions.push(x, bottomY, -0.008);
    }

    // Indices erzeugen
    for (let i = 0; i < segments; i++) {
      // Net Mesh Quads
      const nTop1 = i * 2;
      const nBot1 = i * 2 + 1;
      const nTop2 = (i + 1) * 2;
      const nBot2 = (i + 1) * 2 + 1;

      netIndices.push(nTop1, nBot1, nTop2);
      netIndices.push(nTop2, nBot1, nBot2);
      netIndices.push(nTop2, nBot1, nTop1);
      netIndices.push(nBot2, nBot1, nTop2);

      // Headband Front Quads
      const hF1 = i * 4;
      const hF2 = i * 4 + 1;
      const hF3 = (i + 1) * 4;
      const hF4 = (i + 1) * 4 + 1;
      headIndices.push(hF1, hF2, hF3);
      headIndices.push(hF3, hF2, hF4);
      headIndices.push(hF3, hF2, hF1);
      headIndices.push(hF4, hF2, hF3);

      // Headband Back Quads
      const hB1 = i * 4 + 2;
      const hB2 = i * 4 + 3;
      const hB3 = (i + 1) * 4 + 2;
      const hB4 = (i + 1) * 4 + 3;
      headIndices.push(hB1, hB3, hB2);
      headIndices.push(hB3, hB4, hB2);
      headIndices.push(hB2, hB3, hB1);
      headIndices.push(hB2, hB4, hB3);

      // Headband Top Cap Quads
      headIndices.push(hF1, hF3, hB1);
      headIndices.push(hB1, hF3, hB3);

      // Bottom Band
      const b1 = i * 4;
      const b2 = i * 4 + 1;
      const b3 = (i + 1) * 4;
      const b4 = (i + 1) * 4 + 1;
      botIndices.push(b1, b2, b3);
      botIndices.push(b3, b2, b4);
      botIndices.push(b3, b2, b1);
      botIndices.push(b4, b2, b3);
    }

    const nGeom = new THREE.BufferGeometry();
    nGeom.setAttribute('position', new THREE.Float32BufferAttribute(netPositions, 3));
    nGeom.setAttribute('normal', new THREE.Float32BufferAttribute(netNormals, 3));
    nGeom.setAttribute('uv', new THREE.Float32BufferAttribute(netUvs, 2));
    nGeom.setIndex(netIndices);

    const hGeom = new THREE.BufferGeometry();
    hGeom.setAttribute('position', new THREE.Float32BufferAttribute(headPositions, 3));
    hGeom.setAttribute('normal', new THREE.Float32BufferAttribute(headNormals, 3));
    hGeom.setAttribute('uv', new THREE.Float32BufferAttribute(headUvs, 2));
    hGeom.setIndex(headIndices);

    const bGeom = new THREE.BufferGeometry();
    bGeom.setAttribute('position', new THREE.Float32BufferAttribute(botPositions, 3));
    bGeom.setIndex(botIndices);
    bGeom.computeVertexNormals();

    return {
      netMeshGeom: nGeom,
      headbandGeom: hGeom,
      bottomBandGeom: bGeom,
      topCablePoints: cablePts
    };
  }, [postX, postHeight, centerHeight, useSinglesSticks, singlesStickX]);

  // --- 4. MATERIALIEN ---
  const matNetMesh = useMemo(() => new THREE.MeshStandardMaterial({
    color: surface === 'cyber' ? 0x0284c7 : 0x11141a,
    emissive: surface === 'cyber' ? 0x0369a1 : 0x000000,
    emissiveIntensity: surface === 'cyber' ? 0.4 : 0,
    map: netAlphaTexture || undefined,
    alphaMap: netAlphaTexture || undefined,
    transparent: true,
    opacity: 0.92,
    roughness: 0.75,
    metalness: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false
  }), [netAlphaTexture, surface]);

  const matHeadband = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: headbandTexture || undefined,
    roughness: 0.38,
    metalness: 0.05,
    side: THREE.DoubleSide
  }), [headbandTexture]);

  const matBottomBand = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x090b10,
    roughness: 0.85,
    metalness: 0.1
  }), []);

  const matPostSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: surface === 'clay' ? 0x1e293b : surface === 'grass' ? 0x064e3b : 0x0f172a,
    metalness: 0.88,
    roughness: 0.22,
    envMapIntensity: 1.5
  }), [surface]);

  const matChromeHardware = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.96,
    roughness: 0.12,
    envMapIntensity: 2.2
  }), []);

  const matBrassWinch = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.85,
    roughness: 0.28
  }), []);

  const matWoodStick = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.65,
    metalness: 0.08
  }), []);

  const matCenterStrap = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.05
  }), []);

  return (
    <group position={[0, 0, 0]}>
      {/* ==================================================================== */}
      {/* 1. HAUPT-NETZFLÄCHE MIT PARABOLISCHEM DURCHHANG & DOPPELKNOTEN-MESH */}
      {/* ==================================================================== */}
      <mesh receiveShadow castShadow geometry={netMeshGeom} material={matNetMesh} />

      {/* ==================================================================== */}
      {/* 2. WEISSES CANVAS-EINFASSBAND (HEADBAND) MIT DOPPELSTEPPNAHT & ÖSEN  */}
      {/* ==================================================================== */}
      <mesh receiveShadow castShadow geometry={headbandGeom} material={matHeadband} />

      {/* ==================================================================== */}
      {/* 3. SCHWARZES BODEN-GEWICHTSBAND                                      */}
      {/* ==================================================================== */}
      <mesh receiveShadow castShadow geometry={bottomBandGeom} material={matBottomBand} />

      {/* ==================================================================== */}
      {/* 4. EDELSTAHL-SPANNSEIL (4mm AIRCRAFT TENSION CABLE IN HEADBAND)      */}
      {/* ==================================================================== */}
      {topCablePoints.length > 1 && (
        <mesh>
          <tubeGeometry args={[new THREE.CatmullRomCurve3(topCablePoints), 64, 0.0035, 6, false]} />
          <primitive object={matChromeHardware} attach="material" />
        </mesh>
      )}

      {/* ==================================================================== */}
      {/* 5. REGULIERBAND / MITTELBAND (CENTER STRAP & GROUND ANCHOR)          */}
      {/* ==================================================================== */}
      <group position={[0, 0, 0]}>
        {/* Weißes 5cm breites Polyester-Gurtband */}
        <mesh castShadow receiveShadow material={matCenterStrap} position={[0, centerHeight / 2, 0]}>
          <boxGeometry args={[0.054, centerHeight + 0.02, 0.032]} />
        </mesh>

        {/* Verstellbare Chrom-Klemmschnalle */}
        <mesh castShadow material={matChromeHardware} position={[0, centerHeight - 0.12, 0.02]}>
          <boxGeometry args={[0.062, 0.035, 0.012]} />
        </mesh>
        <mesh castShadow material={matChromeHardware} position={[0, centerHeight - 0.12, -0.02]}>
          <boxGeometry args={[0.062, 0.035, 0.012]} />
        </mesh>

        {/* Bodenanker-Platte im Center-Court */}
        <mesh receiveShadow material={matBrassWinch} position={[0, 0.003, 0]}>
          <cylinderGeometry args={[0.045, 0.052, 0.006, 16]} />
        </mesh>
        <mesh castShadow material={matChromeHardware} position={[0, 0.018, 0]}>
          <torusGeometry args={[0.016, 0.004, 8, 16]} />
        </mesh>
      </group>

      {/* ==================================================================== */}
      {/* 6. TURNIER-NETZPFOSTEN LINKS (WEST POST MIT SCHNECKENRAD-KURBEL)    */}
      {/* ==================================================================== */}
      <group position={[-postX, 0, 0]}>
        {/* Bodenhülse mit Flansch */}
        <mesh receiveShadow material={matChromeHardware} position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.068, 0.075, 0.03, 24]} />
        </mesh>
        <mesh receiveShadow material={matPostSteel} position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.058, 0.064, 0.02, 24]} />
        </mesh>

        {/* Hauptsäule (80mm Stahlrohr) */}
        <mesh castShadow receiveShadow material={matPostSteel} position={[0, postHeight / 2, 0]}>
          <cylinderGeometry args={[0.048, 0.048, postHeight, 32]} />
        </mesh>

        {/* Obere Abdeckkappe mit Seil-Umlenkrolle */}
        <mesh castShadow material={matChromeHardware} position={[0, postHeight + 0.015, 0]}>
          <cylinderGeometry args={[0.052, 0.050, 0.03, 24]} />
        </mesh>
        <mesh castShadow material={matBrassWinch} position={[0.02, postHeight + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.02, 16]} />
        </mesh>

        {/* Innenliegender Schneckenrad-Kurbelkasten */}
        <mesh castShadow material={matBrassWinch} position={[-0.045, postHeight * 0.68, 0]}>
          <boxGeometry args={[0.05, 0.12, 0.08]} />
        </mesh>
        {/* Chrom-Kurbelarm & Holzknauf */}
        <mesh castShadow material={matChromeHardware} position={[-0.08, postHeight * 0.68, 0]} rotation={[0, 0, 0.35]}>
          <cylinderGeometry args={[0.006, 0.006, 0.14, 12]} />
        </mesh>
        <mesh castShadow material={matWoodStick} position={[-0.095, postHeight * 0.68 + 0.06, 0]}>
          <sphereGeometry args={[0.016, 12, 12]} />
        </mesh>

        {/* Seitlicher Edelstahl-Spannstab */}
        <mesh castShadow material={matChromeHardware} position={[0.06, postHeight / 2, 0]}>
          <cylinderGeometry args={[0.005, 0.005, postHeight - 0.12, 12]} />
        </mesh>
        {[0.2, 0.45, 0.7, 0.95].map((yNorm, idx) => (
          <mesh key={`post-eyelet-l-${idx}`} material={matChromeHardware} position={[0.035, yNorm, 0]}>
            <torusGeometry args={[0.012, 0.003, 8, 12]} />
          </mesh>
        ))}
      </group>

      {/* ==================================================================== */}
      {/* 7. TURNIER-NETZPFOSTEN RECHTS (EAST POST MIT SPANNKETTE & HAKEN)    */}
      {/* ==================================================================== */}
      <group position={[postX, 0, 0]}>
        {/* Bodenhülse */}
        <mesh receiveShadow material={matChromeHardware} position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.068, 0.075, 0.03, 24]} />
        </mesh>
        <mesh receiveShadow material={matPostSteel} position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.058, 0.064, 0.02, 24]} />
        </mesh>

        {/* Hauptsäule */}
        <mesh castShadow receiveShadow material={matPostSteel} position={[0, postHeight / 2, 0]}>
          <cylinderGeometry args={[0.048, 0.048, postHeight, 32]} />
        </mesh>

        {/* Obere Abdeckkappe mit Seil-Umlenkrolle */}
        <mesh castShadow material={matChromeHardware} position={[0, postHeight + 0.015, 0]}>
          <cylinderGeometry args={[0.052, 0.050, 0.03, 24]} />
        </mesh>
        <mesh castShadow material={matBrassWinch} position={[-0.02, postHeight + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.02, 16]} />
        </mesh>

        {/* Seil-Fixierbolzen */}
        <mesh castShadow material={matChromeHardware} position={[0.035, postHeight * 0.75, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
        </mesh>

        {/* Seitlicher Edelstahl-Spannstab */}
        <mesh castShadow material={matChromeHardware} position={[-0.06, postHeight / 2, 0]}>
          <cylinderGeometry args={[0.005, 0.005, postHeight - 0.12, 12]} />
        </mesh>
        {[0.2, 0.45, 0.7, 0.95].map((yNorm, idx) => (
          <mesh key={`post-eyelet-r-${idx}`} material={matChromeHardware} position={[-0.035, yNorm, 0]}>
            <torusGeometry args={[0.012, 0.003, 8, 12]} />
          </mesh>
        ))}
      </group>

      {/* ==================================================================== */}
      {/* 8. REGULATION EINZELSTÜTZEN (SINGLES STICKS BEI X = ±5.029m)         */}
      {/* ==================================================================== */}
      {useSinglesSticks && (
        <>
          {/* Linke Einzelstütze */}
          <group position={[-singlesStickX, 0, 0]} rotation={[0, 0, -0.04]}>
            <mesh castShadow material={matWoodStick} position={[0, postHeight / 2, 0]}>
              <cylinderGeometry args={[0.022, 0.026, postHeight, 16]} />
            </mesh>
            <mesh castShadow material={matBrassWinch} position={[0, postHeight + 0.008, 0]}>
              <boxGeometry args={[0.032, 0.024, 0.032]} />
            </mesh>
            <mesh receiveShadow material={matBottomBand} position={[0, 0.012, 0]}>
              <cylinderGeometry args={[0.032, 0.036, 0.024, 16]} />
            </mesh>
          </group>

          {/* Rechte Einzelstütze */}
          <group position={[singlesStickX, 0, 0]} rotation={[0, 0, 0.04]}>
            <mesh castShadow material={matWoodStick} position={[0, postHeight / 2, 0]}>
              <cylinderGeometry args={[0.022, 0.026, postHeight, 16]} />
            </mesh>
            <mesh castShadow material={matBrassWinch} position={[0, postHeight + 0.008, 0]}>
              <boxGeometry args={[0.032, 0.024, 0.032]} />
            </mesh>
            <mesh receiveShadow material={matBottomBand} position={[0, 0.012, 0]}>
              <cylinderGeometry args={[0.032, 0.036, 0.024, 16]} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

export default RealisticTennisNet;
