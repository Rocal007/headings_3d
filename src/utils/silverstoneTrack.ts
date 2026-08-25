import * as THREE from 'three';

/**
 * ============================================================================
 * 🏎️ SILVERSTONE GRAND PRIX CIRCUIT (FIA Formula 1 Track Model & Kinematics)
 * 1:1 Fotoakkurates Streckenlayout nach offiziellem F1 Streckenguide
 * Mit Kurven T1 bis T18, F1-Referenzdaten (km/h, Gang, G-Kraft) & DRS-Zonen
 * ============================================================================
 */

export interface TrackSectorInfo {
  uStart: number;
  uEnd: number;
  turnNum: number;
  name: string;
  code: string;
  f1Speed: number;     // F1-Geschwindigkeit in km/h aus Guide
  f1Gear: number;      // F1-Gang (1 bis 8)
  f1GForce: number;    // F1 Fliehkräfte in g
  drsZone?: string;    // 'DRS 1' | 'DRS 2' | 'DRS Detection 1' | 'DRS Detection 2'
  speedTarget: number; // LKW Zielgeschwindigkeit
}

// 40 präzise Kontrollpunkte des offiziellen Silverstone GP Layouts (1:1 nach Streckengrafik)
const RAW_SILVERSTONE_COORDS: [number, number][] = [
  // 1. Hamilton Straight & Start/Finish (Obere Horizontale, von links nach rechts)
  [-30, -36], // Turn 18 Exit (Club Corner onto Start/Finish)
  [-12, -36], // Hamilton Straight Mid (T3 Finish Line)
  [2, -36],   // Start/Finish Gantry
  // 2. Turn 1 (Abbey) & Turn 2 (Farm Curve)
  [12, -34],  // Turn 1 (Abbey) Apex - Fast Right (290 km/h)
  [20, -26],  // Turn 2 (Farm Curve) - Gentle Left (185 km/h)
  // 3. Turn 3 (Village) & Turn 4 (The Loop) & Turn 5 (Aintree)
  [26, -18],  // Turn 3 (Village Corner) Entry (DRS Detection 1, 95 km/h)
  [29, -12],  // The Loop Entry
  [25, -6],   // Turn 4 (The Loop) Hairpin Apex (85 km/h)
  [19, -10],  // The Loop Exit
  [18, -16],  // Turn 5 (Aintree) Entry
  // 4. Wellington Straight (DRS 1) - Läuft senkrecht nach OBEN/Norden
  [18, -26],  // Wellington Straight Start
  [17, -42],  // Wellington Straight Mid (T1 Sector, 295 km/h)
  [16, -54],  // Wellington Straight End (Braking Zone)
  // 5. Turn 6 (Brooklands) & Turn 7 (Luffield) & Turn 8 (Woodcote)
  [12, -62],  // Turn 6 (Brooklands) Sharp Left (165 km/h)
  [2, -63],   // Brooklands Exit
  [-4, -58],  // Turn 7 (Luffield) Entry (120 km/h)
  [-6, -50],  // Luffield Apex 1
  [0, -45],   // Luffield Apex 2 (145 km/h)
  [10, -45],  // Turn 8 (Woodcote) Sweeper (270 km/h)
  // 6. Alte National Straight (nach Südosten hinab Richtung Copse)
  [24, -38],  // National Straight Mid
  [40, -28],  // Approaching Copse
  [52, -18],  // Turn 9 (Copse) Braking Zone (300 km/h)
  // 7. Turn 9 (Copse) - 90° High Speed Rechts
  [58, -10],  // Copse Apex (285 km/h, 4.5g)
  [56, 0],    // Copse Exit
  // 8. Turn 10 (Maggotts) & Turn 11/12 (Becketts) & Turn 13 (Chapel)
  [50, 8],    // Turn 10 (Maggotts) Fast Left (DRS Detection 2, 300 km/h)
  [44, 14],   // Turn 11 (Becketts Entry) Right (265 km/h, 3.7g)
  [38, 20],   // Turn 12 (Becketts Apex) Left (235 km/h, 5.0g Max-G)
  [30, 26],   // Turn 13 (Chapel) Fast Right (210 km/h -> 240 km/h)
  // 9. Hangar Straight (DRS 2) - Untere Horizontale, von rechts nach links
  [18, 30],   // Hangar Straight Entry
  [-8, 30],   // Hangar Straight Mid (T2 Sector, Speed Trap 310 km/h)
  [-36, 30],  // Hangar Straight End (Top Speed 310 km/h)
  // 10. Turn 15 (Stowe) & Gerade Richtung Vale
  [-48, 28],  // Turn 15 (Stowe) Apex - Fast Right (240 km/h, 3.2g)
  [-54, 18],  // Stowe Exit
  [-54, 4],   // Straight to Vale (270 km/h)
  [-53, -12], // Approach Vale Braking Zone
  // 11. Turn 16 (Vale) & Turn 17/18 (Club)
  [-52, -20], // Turn 16 (Vale) Left Chicane (105 km/h)
  [-56, -26], // Turn 17 (Vale Exit) Right Kink (135 km/h)
  [-54, -32], // Turn 18 (Club Corner Entry) Sweeping Right (225 km/h, 3.2g)
  [-44, -36], // Club Corner Apex onto Hamilton Straight
];

/** Maßstabs-Faktor: 5.0 (Skaliert die Rennstrecke auf realistische ~1.9 km Länge & 570m x 465m Ausdehnung) */
export const TRACK_SCALE = 5.0;

/** Silverstone Catmull-Rom 3D Spline Curve im realistischen Maßstab */
export function createSilverstoneSpline(scale: number = TRACK_SCALE): THREE.CatmullRomCurve3 {
  const points = RAW_SILVERSTONE_COORDS.map(([x, z]) => new THREE.Vector3(x * scale, 0, z * scale));
  return new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
}

/** Streckenabschnitte, Kurven T1-T18 & Telemetriedaten exakt nach FIA Streckenguide */
export const SILVERSTONE_SECTORS: TrackSectorInfo[] = [
  { uStart: 0.00, uEnd: 0.07, turnNum: 0, name: 'HAMILTON STRAIGHT', code: 'S/F', f1Speed: 290, f1Gear: 7, f1GForce: 1.0, speedTarget: 82.0 },
  { uStart: 0.07, uEnd: 0.12, turnNum: 1, name: 'T1 ABBEY', code: 'ABBEY', f1Speed: 290, f1Gear: 7, f1GForce: 4.0, speedTarget: 70.0 },
  { uStart: 0.12, uEnd: 0.16, turnNum: 2, name: 'T2 FARM CURVE', code: 'FARM', f1Speed: 185, f1Gear: 4, f1GForce: 2.2, speedTarget: 60.0 },
  { uStart: 0.16, uEnd: 0.20, turnNum: 3, name: 'T3 VILLAGE CORNER', code: 'VILLAGE', f1Speed: 95, f1Gear: 2, f1GForce: 2.0, drsZone: 'DRS Detection 1', speedTarget: 36.0 },
  { uStart: 0.20, uEnd: 0.25, turnNum: 4, name: 'T4 THE LOOP', code: 'LOOP', f1Speed: 85, f1Gear: 2, f1GForce: 1.2, speedTarget: 28.0 },
  { uStart: 0.25, uEnd: 0.28, turnNum: 5, name: 'T5 AINTREE', code: 'AINTREE', f1Speed: 140, f1Gear: 3, f1GForce: 1.5, speedTarget: 48.0 },
  { uStart: 0.28, uEnd: 0.38, turnNum: 0, name: 'WELLINGTON STRAIGHT', code: 'WELLINGTON', f1Speed: 295, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 1', speedTarget: 85.0 },
  { uStart: 0.38, uEnd: 0.43, turnNum: 6, name: 'T6 BROOKLANDS', code: 'BROOKLANDS', f1Speed: 165, f1Gear: 2, f1GForce: 1.4, speedTarget: 42.0 },
  { uStart: 0.43, uEnd: 0.50, turnNum: 7, name: 'T7 LUFFIELD', code: 'LUFFIELD', f1Speed: 120, f1Gear: 3, f1GForce: 2.2, speedTarget: 34.0 },
  { uStart: 0.50, uEnd: 0.55, turnNum: 8, name: 'T8 WOODCOTE', code: 'WOODCOTE', f1Speed: 270, f1Gear: 8, f1GForce: 1.9, speedTarget: 72.0 },
  { uStart: 0.55, uEnd: 0.62, turnNum: 9, name: 'T9 COPSE CORNER', code: 'COPSE', f1Speed: 300, f1Gear: 8, f1GForce: 4.5, speedTarget: 74.0 },
  { uStart: 0.62, uEnd: 0.66, turnNum: 10, name: 'T10 MAGGOTTS', code: 'MAGGOTTS', f1Speed: 300, f1Gear: 8, f1GForce: 1.8, drsZone: 'DRS Detection 2', speedTarget: 68.0 },
  { uStart: 0.66, uEnd: 0.70, turnNum: 11, name: 'T11 BECKETTS ENTRY', code: 'BECKETTS 1', f1Speed: 265, f1Gear: 7, f1GForce: 3.7, speedTarget: 56.0 },
  { uStart: 0.70, uEnd: 0.74, turnNum: 12, name: 'T12 BECKETTS APEX (MAX-G)', code: 'BECKETTS 2', f1Speed: 235, f1Gear: 6, f1GForce: 5.0, speedTarget: 48.0 },
  { uStart: 0.74, uEnd: 0.78, turnNum: 13, name: 'T13 CHAPEL', code: 'CHAPEL', f1Speed: 210, f1Gear: 5, f1GForce: 3.9, speedTarget: 62.0 },
  { uStart: 0.78, uEnd: 0.87, turnNum: 0, name: 'HANGAR STRAIGHT (TOP SPEED)', code: 'HANGAR', f1Speed: 310, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 2', speedTarget: 88.0 },
  { uStart: 0.87, uEnd: 0.91, turnNum: 15, name: 'T15 STOWE CORNER', code: 'STOWE', f1Speed: 240, f1Gear: 6, f1GForce: 3.2, speedTarget: 52.0 },
  { uStart: 0.91, uEnd: 0.94, turnNum: 16, name: 'T16 VALE CHICANE', code: 'VALE', f1Speed: 105, f1Gear: 2, f1GForce: 2.1, speedTarget: 30.0 },
  { uStart: 0.94, uEnd: 0.97, turnNum: 17, name: 'T17 VALE EXIT', code: 'VALE OUT', f1Speed: 135, f1Gear: 2, f1GForce: 2.3, speedTarget: 40.0 },
  { uStart: 0.97, uEnd: 1.00, turnNum: 18, name: 'T18 CLUB CORNER', code: 'CLUB', f1Speed: 225, f1Gear: 4, f1GForce: 3.2, speedTarget: 64.0 },
];

/** Ermittelt den aktuellen Streckenabschnitt basierend auf u in [0, 1) */
export function getSilverstoneSector(u: number): TrackSectorInfo {
  const normU = ((u % 1) + 1) % 1;
  for (const s of SILVERSTONE_SECTORS) {
    if (normU >= s.uStart && normU < s.uEnd) {
      return s;
    }
  }
  return SILVERSTONE_SECTORS[0];
}

/**
 * Erzeugt die 3D BufferGeometry für die 12.0m breite Silverstone-Asphaltrennstrecke
 * inklusive rot-weißen FIA Kerbs (Randsteinen) und Start-Ziel-Markierung.
 */
export function createSilverstoneTrackGeometry(
  curve: THREE.CatmullRomCurve3,
  segments: number = 800,
  trackWidth: number = 12.0,
  kerbWidth: number = 1.35
): {
  trackGeo: THREE.BufferGeometry;
  kerbLeftGeo: THREE.BufferGeometry;
  kerbRightGeo: THREE.BufferGeometry;
  startFinishGeo: THREE.BufferGeometry;
} {
  const trackPositions: number[] = [];
  const trackUvs: number[] = [];
  const trackIndices: number[] = [];

  const kLPositions: number[] = [];
  const kLUvs: number[] = [];
  const kLIndices: number[] = [];

  const kRPositions: number[] = [];
  const kRUvs: number[] = [];
  const kRIndices: number[] = [];

  const halfW = trackWidth * 0.5;

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const pt = curve.getPointAt(u % 1);
    const tangent = curve.getTangentAt(u % 1);

    // Normale senkrecht zur Fahrtrichtung in XZ-Ebene
    const nx = -tangent.z;
    const nz = tangent.x;
    const len = Math.hypot(nx, nz) || 1;
    const normX = nx / len;
    const normZ = nz / len;

    // 1. Asphalt-Hauptfahrbahn (12.0m breit)
    const lx = pt.x - normX * halfW;
    const lz = pt.z - normZ * halfW;
    const rx = pt.x + normX * halfW;
    const rz = pt.z + normZ * halfW;

    trackPositions.push(lx, 0.003, lz);
    trackUvs.push(0, u * 160);
    trackPositions.push(rx, 0.003, rz);
    trackUvs.push(1, u * 160);

    if (i < segments) {
      const b = i * 2;
      trackIndices.push(b, b + 1, b + 2);
      trackIndices.push(b + 1, b + 3, b + 2);
    }

    // 2. Rot-Weiße Kerbs links (Außenrand)
    const klx = pt.x - normX * (halfW + kerbWidth);
    const klz = pt.z - normZ * (halfW + kerbWidth);
    kLPositions.push(klx, 0.012, klz);
    kLUvs.push(0, u * 480);
    kLPositions.push(lx, 0.004, lz);
    kLUvs.push(1, u * 480);

    // 3. Rot-Weiße Kerbs rechts (Außenrand)
    const krx = pt.x + normX * (halfW + kerbWidth);
    const krz = pt.z + normZ * (halfW + kerbWidth);
    kRPositions.push(rx, 0.004, rz);
    kRUvs.push(0, u * 480);
    kRPositions.push(krx, 0.012, krz);
    kRUvs.push(1, u * 480);

    if (i < segments) {
      const b = i * 2;
      kLIndices.push(b, b + 1, b + 2);
      kLIndices.push(b + 1, b + 3, b + 2);
      kRIndices.push(b, b + 1, b + 2);
      kRIndices.push(b + 1, b + 3, b + 2);
    }
  }

  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(trackPositions, 3));
  trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
  trackGeo.setIndex(trackIndices);
  trackGeo.computeVertexNormals();

  const kerbLeftGeo = new THREE.BufferGeometry();
  kerbLeftGeo.setAttribute('position', new THREE.Float32BufferAttribute(kLPositions, 3));
  kerbLeftGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kLUvs, 2));
  kerbLeftGeo.setIndex(kLIndices);
  kerbLeftGeo.computeVertexNormals();

  const kerbRightGeo = new THREE.BufferGeometry();
  kerbRightGeo.setAttribute('position', new THREE.Float32BufferAttribute(kRPositions, 3));
  kerbRightGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kRUvs, 2));
  kerbRightGeo.setIndex(kRIndices);
  kerbRightGeo.computeVertexNormals();

  // 4. Start-Ziel-Linie (Hamilton Straight bei u = 0.02)
  const sfPt = curve.getPointAt(0.02);
  const sfTan = curve.getTangentAt(0.02);
  const sfNx = -sfTan.z;
  const sfNz = sfTan.x;
  const sfLen = Math.hypot(sfNx, sfNz) || 1;
  const sfnX = sfNx / sfLen;
  const sfnZ = sfNz / sfLen;

  const sfW = trackWidth;
  const sfL = 3.6; // Länge des Schachbrettstreifens
  const sfP1 = [sfPt.x - sfnX * (sfW * 0.5) - sfTan.x * (sfL * 0.5), 0.006, sfPt.z - sfnZ * (sfW * 0.5) - sfTan.z * (sfL * 0.5)];
  const sfP2 = [sfPt.x + sfnX * (sfW * 0.5) - sfTan.x * (sfL * 0.5), 0.006, sfPt.z + sfnZ * (sfW * 0.5) - sfTan.z * (sfL * 0.5)];
  const sfP3 = [sfPt.x + sfnX * (sfW * 0.5) + sfTan.x * (sfL * 0.5), 0.006, sfPt.z + sfnZ * (sfW * 0.5) + sfTan.z * (sfL * 0.5)];
  const sfP4 = [sfPt.x - sfnX * (sfW * 0.5) + sfTan.x * (sfL * 0.5), 0.006, sfPt.z - sfnZ * (sfW * 0.5) + sfTan.z * (sfL * 0.5)];

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

  return { trackGeo, kerbLeftGeo, kerbRightGeo, startFinishGeo };
}

/** Erzeugt die Textur für rot-weiße FIA-Kerbs */
export function createSilverstoneKerbTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    // 4 alternierende rote und weiße Streifen
    const stripH = 64;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#e11d48' : '#f8fafc';
      ctx.fillRect(0, i * stripH, 256, stripH);
    }
    // Feines Schrägrillen-Profil
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
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

/** Erzeugt die Schachbrett-Start-Ziel-Markierung */
export function createStartFinishTexture(): THREE.CanvasTexture {
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
        ctx.fillStyle = (r + cl) % 2 === 0 ? '#ffffff' : '#111827';
        ctx.fillRect(cl * w, r * h, w, h);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
