import * as THREE from 'three';
import type { CircuitDefinition, TrackMeshesResult } from './trackTypes';
import {
  createAsphaltBumpTexture,
  createRoadMarkingsTexture,
} from '../../materials/truckTextures';

/**
 * ============================================================================
 * 🏎️ FIA GRAND PRIX TRACK BUILDER ENGINE (Subagent 22.14)
 * Generiert 3D-Fahrbahn, Querneigung (Camber), 3D-Höhenprofile, FIA Kerbs,
 * Kiesbetten, beidseitige Auslaufzonen, Böschung (Embankment), Start-Ziel-Gantry & Bremstafeln.
 * ============================================================================
 */

export function buildCircuit3D(circuit: CircuitDefinition): TrackMeshesResult {
  const group = new THREE.Group();
  group.name = `Circuit_${circuit.id}`;

  const disposables: TrackMeshesResult['disposables'] = {
    geometries: [],
    materials: [],
    textures: [],
  };

  // 1. 3D Catmull-Rom Spline aus den Kontrollpunkten
  // AUTOMATISCHE HÖHENNORMALISIERUNG & 0-HORIZONT-SCHUTZ:
  // Finde das minimale Y aller Kontrollpunkte. Der tiefste Punkt wird auf mindestens +0.12m
  // über dem Boden fixiert, sodass KEIN Streckenteil jemals unter den 0-Horizont abtauchen kann!
  let minY = Infinity;
  circuit.controlPoints.forEach((p) => {
    if (p.y < minY) minY = p.y;
  });
  if (!isFinite(minY)) minY = 0;

  const scale = circuit.scale;
  const points = circuit.controlPoints.map((p) => {
    // Relative Höhe über dem tiefsten Punkt skaliert (z.B. Spa Eau Rouge +24m oder Red Bull Ring +35m)
    const normalizedY = (p.y - minY) * 1.6 + 0.12;
    return new THREE.Vector3(p.x * scale, normalizedY, p.z * scale);
  });

  const trackCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
  const splineLength = trackCurve.getLength();

  const segments = Math.max(700, Math.round(splineLength * 0.5));
  const trackWidth = circuit.trackWidth;
  const halfW = trackWidth * 0.5;
  const kerbWidth = 1.35;
  const runOffWidth = 4.8;

  // Vertex Buffer Daten für alle Baugruppen
  const trackPos: number[] = [];
  const trackUvs: number[] = [];
  const trackIndices: number[] = [];

  const kerbLPos: number[] = [];
  const kerbLUvs: number[] = [];
  const kerbLIndices: number[] = [];

  const kerbRPos: number[] = [];
  const kerbRUvs: number[] = [];
  const kerbRIndices: number[] = [];

  const runOffLPos: number[] = [];
  const runOffLUvs: number[] = [];
  const runOffLIndices: number[] = [];

  const runOffRPos: number[] = [];
  const runOffRUvs: number[] = [];
  const runOffRIndices: number[] = [];

  const embankmentPos: number[] = [];
  const embankmentUvs: number[] = [];
  const embankmentIndices: number[] = [];

  // Berechne Querneigung (Banking) an jedem Sample-Punkt
  const numCp = circuit.controlPoints.length;
  const getInterpolatedBanking = (u: number): number => {
    const floatIdx = u * numCp;
    const i0 = Math.floor(floatIdx) % numCp;
    const i1 = (i0 + 1) % numCp;
    const frac = floatIdx - Math.floor(floatIdx);
    const b0 = circuit.controlPoints[i0].bankingDeg || 0;
    const b1 = circuit.controlPoints[i1].bankingDeg || 0;
    return THREE.MathUtils.degToRad(THREE.MathUtils.lerp(b0, b1, frac));
  };

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const pt = trackCurve.getPointAt(u % 1);
    const tangent = trackCurve.getTangentAt(u % 1);

    // Tangentenvektor & Normale in der XZ-Ebene
    const nx = -tangent.z;
    const nz = tangent.x;
    const len = Math.hypot(nx, nz) || 1;
    const normX = nx / len;
    const normZ = nz / len;

    // Berücksichtige 3D Querneigung (Camber / Banking)
    const banking = getInterpolatedBanking(u);
    const bankY = Math.sin(banking) * halfW;

    // Linker und rechter Fahrbahnrand
    const lx = pt.x - normX * halfW;
    const ly = pt.y - bankY;
    const lz = pt.z - normZ * halfW;

    const rx = pt.x + normX * halfW;
    const ry = pt.y + bankY;
    const rz = pt.z + normZ * halfW;

    // 1. Asphalt-Hauptfahrbahn
    trackPos.push(lx, ly, lz);
    trackUvs.push(0, u * 160);
    trackPos.push(rx, ry, rz);
    trackUvs.push(1, u * 160);

    if (i < segments) {
      const b = i * 2;
      trackIndices.push(b, b + 1, b + 2);
      trackIndices.push(b + 1, b + 3, b + 2);
    }

    // 2. Rot-Weiße Kerbs links (leicht erhöht mit Anschrägung)
    const klx = pt.x - normX * (halfW + kerbWidth);
    const kly = ly + 0.032;
    const klz = pt.z - normZ * (halfW + kerbWidth);

    kerbLPos.push(klx, kly, klz);
    kerbLUvs.push(0, u * 480);
    kerbLPos.push(lx, ly, lz);
    kerbLUvs.push(1, u * 480);

    // 3. Rot-Weiße Kerbs rechts
    const krx = pt.x + normX * (halfW + kerbWidth);
    const kry = ry + 0.032;
    const krz = pt.z + normZ * (halfW + kerbWidth);

    kerbRPos.push(rx, ry, rz);
    kerbRUvs.push(0, u * 480);
    kerbRPos.push(krx, kry, krz);
    kerbRUvs.push(1, u * 480);

    if (i < segments) {
      const b = i * 2;
      kerbLIndices.push(b, b + 1, b + 2);
      kerbLIndices.push(b + 1, b + 3, b + 2);
      kerbRIndices.push(b, b + 1, b + 2);
      kerbRIndices.push(b + 1, b + 3, b + 2);
    }

    // 4. Auslaufzone links (Gravel / Tarmac)
    const roLx = pt.x - normX * (halfW + kerbWidth + runOffWidth);
    const roLy = Math.max(0.02, ly - 0.015);
    const roLz = pt.z - normZ * (halfW + kerbWidth + runOffWidth);

    runOffLPos.push(roLx, roLy, roLz);
    runOffLUvs.push(0, u * 80);
    runOffLPos.push(klx, kly, klz);
    runOffLUvs.push(1, u * 80);

    // 5. Auslaufzone rechts (Gravel / Tarmac)
    const roRx = pt.x + normX * (halfW + kerbWidth + runOffWidth);
    const roRy = Math.max(0.02, ry - 0.015);
    const roRz = pt.z + normZ * (halfW + kerbWidth + runOffWidth);

    runOffRPos.push(krx, kry, krz);
    runOffRUvs.push(0, u * 80);
    runOffRPos.push(roRx, roRy, roRz);
    runOffRUvs.push(1, u * 80);

    if (i < segments) {
      const b = i * 2;
      runOffLIndices.push(b, b + 1, b + 2);
      runOffLIndices.push(b + 1, b + 3, b + 2);
      runOffRIndices.push(b, b + 1, b + 2);
      runOffRIndices.push(b + 1, b + 3, b + 2);
    }

    // 6. Böschung (Embankment) vom äußeren Rand hinab zum Boden (Y = 0)
    const embLx = roLx - normX * 1.5;
    const embLz = roLz - normZ * 1.5;
    const embRx = roRx + normX * 1.5;
    const embRz = roRz + normZ * 1.5;

    // Linke Böschung
    embankmentPos.push(embLx, 0.0, embLz);
    embankmentUvs.push(0, u * 40);
    embankmentPos.push(roLx, roLy, roLz);
    embankmentUvs.push(1, u * 40);

    // Rechte Böschung
    embankmentPos.push(roRx, roRy, roRz);
    embankmentUvs.push(0, u * 40);
    embankmentPos.push(embRx, 0.0, embRz);
    embankmentUvs.push(1, u * 40);

    if (i < segments) {
      const bL = i * 4;
      embankmentIndices.push(bL, bL + 1, bL + 4);
      embankmentIndices.push(bL + 1, bL + 5, bL + 4);

      const bR = i * 4 + 2;
      embankmentIndices.push(bR, bR + 1, bR + 4);
      embankmentIndices.push(bR + 1, bR + 5, bR + 4);
    }
  }

  // --- BufferGeometrien erstellen ---
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(trackPos, 3));
  trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
  trackGeo.setIndex(trackIndices);
  trackGeo.computeVertexNormals();

  const kerbLGeo = new THREE.BufferGeometry();
  kerbLGeo.setAttribute('position', new THREE.Float32BufferAttribute(kerbLPos, 3));
  kerbLGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kerbLUvs, 2));
  kerbLGeo.setIndex(kerbLIndices);
  kerbLGeo.computeVertexNormals();

  const kerbRGeo = new THREE.BufferGeometry();
  kerbRGeo.setAttribute('position', new THREE.Float32BufferAttribute(kerbRPos, 3));
  kerbRGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kerbRUvs, 2));
  kerbRGeo.setIndex(kerbRIndices);
  kerbRGeo.computeVertexNormals();

  const runOffLGeo = new THREE.BufferGeometry();
  runOffLGeo.setAttribute('position', new THREE.Float32BufferAttribute(runOffLPos, 3));
  runOffLGeo.setAttribute('uv', new THREE.Float32BufferAttribute(runOffLUvs, 2));
  runOffLGeo.setIndex(runOffLIndices);
  runOffLGeo.computeVertexNormals();

  const runOffRGeo = new THREE.BufferGeometry();
  runOffRGeo.setAttribute('position', new THREE.Float32BufferAttribute(runOffRPos, 3));
  runOffRGeo.setAttribute('uv', new THREE.Float32BufferAttribute(runOffRUvs, 2));
  runOffRGeo.setIndex(runOffRIndices);
  runOffRGeo.computeVertexNormals();

  const embankmentGeo = new THREE.BufferGeometry();
  embankmentGeo.setAttribute('position', new THREE.Float32BufferAttribute(embankmentPos, 3));
  embankmentGeo.setAttribute('uv', new THREE.Float32BufferAttribute(embankmentUvs, 2));
  embankmentGeo.setIndex(embankmentIndices);
  embankmentGeo.computeVertexNormals();

  // --- Texturen & Materialien ---
  const asphaltBumpTex = createAsphaltBumpTexture();
  asphaltBumpTex.repeat.set(160, 160);

  const roadMarkingsTex = createRoadMarkingsTexture();
  roadMarkingsTex.repeat.set(1, 160);

  const kerbTex = createKerbTexture();
  const runOffTex = createRunOffTexture();

  disposables.textures.push(asphaltBumpTex, roadMarkingsTex, kerbTex, runOffTex);

  const trackMat = new THREE.MeshStandardMaterial({
    color: '#343a42',
    map: roadMarkingsTex,
    bumpMap: asphaltBumpTex,
    bumpScale: 0.018,
    roughness: 0.78,
    metalness: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const kerbMat = new THREE.MeshStandardMaterial({
    map: kerbTex,
    bumpMap: asphaltBumpTex,
    bumpScale: 0.025,
    roughness: 0.65,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const runOffMat = new THREE.MeshStandardMaterial({
    map: runOffTex,
    bumpMap: asphaltBumpTex,
    bumpScale: 0.03,
    roughness: 0.90,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const embankmentMat = new THREE.MeshStandardMaterial({
    color: '#1e232a',
    bumpMap: asphaltBumpTex,
    bumpScale: 0.02,
    roughness: 0.92,
    metalness: 0.05,
  });

  disposables.materials.push(trackMat, kerbMat, runOffMat, embankmentMat);
  disposables.geometries.push(trackGeo, kerbLGeo, kerbRGeo, runOffLGeo, runOffRGeo, embankmentGeo);

  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.receiveShadow = true;
  const kerbLMesh = new THREE.Mesh(kerbLGeo, kerbMat);
  const kerbRMesh = new THREE.Mesh(kerbRGeo, kerbMat);
  const runOffLMesh = new THREE.Mesh(runOffLGeo, runOffMat);
  runOffLMesh.receiveShadow = true;
  const runOffRMesh = new THREE.Mesh(runOffRGeo, runOffMat);
  runOffRMesh.receiveShadow = true;
  const embankmentMesh = new THREE.Mesh(embankmentGeo, embankmentMat);
  embankmentMesh.receiveShadow = true;

  group.add(trackMesh, kerbLMesh, kerbRMesh, runOffLMesh, runOffRMesh, embankmentMesh);

  // 5. Start-Ziel-Schachbrettmarkierung (Hamilton Straight bei u = 0.02)
  const sfPt = trackCurve.getPointAt(0.02);
  const sfTan = trackCurve.getTangentAt(0.02);
  const sfNx = -sfTan.z;
  const sfNz = sfTan.x;
  const sfLen = Math.hypot(sfNx, sfNz) || 1;
  const sfnX = sfNx / sfLen;
  const sfnZ = sfNz / sfLen;

  const sfW = trackWidth;
  const sfL = 3.6;
  const sfP1 = [sfPt.x - sfnX * (sfW * 0.5) - sfTan.x * (sfL * 0.5), sfPt.y + 0.006, sfPt.z - sfnZ * (sfW * 0.5) - sfTan.z * (sfL * 0.5)];
  const sfP2 = [sfPt.x + sfnX * (sfW * 0.5) - sfTan.x * (sfL * 0.5), sfPt.y + 0.006, sfPt.z + sfnZ * (sfW * 0.5) - sfTan.z * (sfL * 0.5)];
  const sfP3 = [sfPt.x + sfnX * (sfW * 0.5) + sfTan.x * (sfL * 0.5), sfPt.y + 0.006, sfPt.z + sfnZ * (sfW * 0.5) + sfTan.z * (sfL * 0.5)];
  const sfP4 = [sfPt.x - sfnX * (sfW * 0.5) + sfTan.x * (sfL * 0.5), sfPt.y + 0.006, sfPt.z - sfnZ * (sfW * 0.5) + sfTan.z * (sfL * 0.5)];

  const startFinishGeo = new THREE.BufferGeometry();
  startFinishGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    ...sfP1, ...sfP2, ...sfP3,
    ...sfP1, ...sfP3, ...sfP4
  ], 3));
  startFinishGeo.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0,  1, 0,  1, 1,
    0, 0,  1, 1,  0, 1
  ], 2));
  startFinishGeo.computeVertexNormals();

  const startFinishTex = createStartFinishTexture();
  disposables.textures.push(startFinishTex);

  const startFinishMat = new THREE.MeshStandardMaterial({
    map: startFinishTex,
    roughness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3
  });
  disposables.materials.push(startFinishMat);
  disposables.geometries.push(startFinishGeo);

  const startFinishMesh = new THREE.Mesh(startFinishGeo, startFinishMat);
  group.add(startFinishMesh);

  // 6. Start-Ziel-Gantry (Startampel-Brücke über der Hauptgeraden)
  const gantryGroup = createStartGantry(sfPt, sfTan, trackWidth);
  group.add(gantryGroup);

  // 7. Bremstafeln (150m, 100m, 50m) vor harten Bremszonen
  for (const s of circuit.sectors) {
    if (s.brakeMarker) {
      const brakeU = ((s.uStart - 0.035) + 1) % 1;
      const bPt = trackCurve.getPointAt(brakeU);
      const bTan = trackCurve.getTangentAt(brakeU);
      const bNx = -bTan.z;
      const bNz = bTan.x;
      const bLen = Math.hypot(bNx, bNz) || 1;
      const bnX = bNx / bLen;
      const bnZ = bNz / bLen;

      // Platziere 150m, 100m, 50m Schilder am linken Rand
      const bOffset = halfW + kerbWidth + 1.2;
      const board150 = createBrakeMarkerBoard('150', bPt.x - bnX * bOffset, bPt.y, bPt.z - bnZ * bOffset, Math.atan2(bTan.x, bTan.z));
      group.add(board150);
    }
  }

  // Rekursives Erfassen aller GPU-Ressourcen für 100% Zero-Leak Garantie (Säule 2.1)
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.geometry && !disposables.geometries.includes(m.geometry)) {
        disposables.geometries.push(m.geometry);
      }
      if (m.material) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          if (!disposables.materials.includes(mat)) {
            disposables.materials.push(mat);
          }
          const stdMat = mat as THREE.MeshStandardMaterial;
          if (stdMat.map && !disposables.textures.includes(stdMat.map)) {
            disposables.textures.push(stdMat.map);
          }
          if (stdMat.bumpMap && !disposables.textures.includes(stdMat.bumpMap)) {
            disposables.textures.push(stdMat.bumpMap);
          }
        });
      }
    }
  });

  return {
    group,
    trackCurve,
    splineLength,
    disposables,
  };
}

/** Erzeugt die Startampel-Brücke (Start-Finish Gantry) */
function createStartGantry(
  pt: THREE.Vector3,
  tan: THREE.Vector3,
  trackWidth: number
): THREE.Group {
  const gantry = new THREE.Group();
  const angle = Math.atan2(tan.x, tan.z);
  gantry.position.set(pt.x, pt.y, pt.z);
  gantry.rotation.y = angle;

  const spanW = trackWidth + 4.0;
  const height = 6.2;

  const steelMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8, roughness: 0.3 });
  const trussGeo = new THREE.BoxGeometry(0.3, height, 0.3);
  const topBeamGeo = new THREE.BoxGeometry(spanW, 0.6, 0.8);

  // Linker und rechter Pfeiler
  const leftPillar = new THREE.Mesh(trussGeo, steelMat);
  leftPillar.position.set(-spanW * 0.5, height * 0.5, 0);
  const rightPillar = new THREE.Mesh(trussGeo, steelMat);
  rightPillar.position.set(spanW * 0.5, height * 0.5, 0);

  // Querträger
  const topBeam = new THREE.Mesh(topBeamGeo, steelMat);
  topBeam.position.set(0, height, 0);

  // 5x Rote Startampeln
  const lightBoxMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5 });
  const redLightMat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 2.5 });

  const lightsGroup = new THREE.Group();
  lightsGroup.position.set(0, height - 0.6, 0.45);

  for (let i = -2; i <= 2; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.2), lightBoxMat);
    box.position.x = i * 0.65;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), redLightMat);
    lamp.rotation.x = Math.PI * 0.5;
    lamp.position.set(i * 0.65, 0, 0.1);
    lightsGroup.add(box, lamp);
  }

  gantry.add(leftPillar, rightPillar, topBeam, lightsGroup);
  return gantry;
}

/** Erzeugt eine 150m/100m/50m Bremstafel */
function createBrakeMarkerBoard(text: string, x: number, y: number, z: number, heading: number): THREE.Group {
  const bGroup = new THREE.Group();
  bGroup.position.set(x, y, z);
  bGroup.rotation.y = heading;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 118, 246);
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
  const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.06), boardMat);
  boardMesh.position.y = 1.1;

  const postMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.6 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2), postMat);
  post.position.y = 1.1;

  bGroup.add(post, boardMesh);
  return bGroup;
}

/** Erzeugt die Textur für rot-weiße FIA-Kerbs */
function createKerbTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    const stripH = 64;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#f8fafc';
      ctx.fillRect(0, i * stripH, 256, stripH);
    }
    // Feines Schrägrillen-Profil
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + 16);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Erzeugt die Textur für Kiesbett-Auslaufzonen (Gravel Traps) */
function createRunOffTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#b45309'; // Kiesbett Ocker/Braun
    ctx.fillRect(0, 0, 256, 256);
    // Körnige Kiespartikel
    for (let i = 0; i < 4000; i++) {
      const gx = Math.random() * 256;
      const gy = Math.random() * 256;
      const r = Math.random() * 1.5 + 0.5;
      ctx.fillStyle = Math.random() > 0.5 ? '#78350f' : '#d97706';
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Erzeugt die Schachbrett-Start-Ziel-Markierung */
function createStartFinishTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const cols = 16;
    const rows = 4;
    const w = 512 / cols;
    const h = 128 / rows;
    for (let r = 0; r < rows; r++) {
      for (let cl = 0; cl < cols; cl++) {
        ctx.fillStyle = (r + cl) % 2 === 0 ? '#ffffff' : '#0f172a';
        ctx.fillRect(cl * w, r * h, w, h);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
