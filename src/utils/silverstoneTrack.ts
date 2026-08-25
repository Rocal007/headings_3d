import * as THREE from 'three';

/**
 * ============================================================================
 * 🏎️ SILVERSTONE GRAND PRIX CIRCUIT (3D Track Model & Kinematics)
 * Authentisches FIA Streckenlayout mit Kurvennamen, Kerbs & Telemetrie
 * ============================================================================
 */

export interface TrackSectorInfo {
  uStart: number;
  uEnd: number;
  name: string;
  code: string;
  speedTarget: number; // Zielgeschwindigkeit (0.18 bis 0.42)
}

// 30 markante Kontrollpunkte des offiziellen Silverstone GP Layouts
const RAW_SILVERSTONE_COORDS: [number, number][] = [
  [-30, -35], // 0. Hamilton Straight (Start/Finish)
  [-10, -35], // 1. Start-Ziel-Linie
  [8, -33],   // 2. Abbey (Turn 1 - Fast Right)
  [20, -28],  // 3. Farm Curve (Turn 2 - Gentle Left)
  [30, -31],  // 4. Village (Turn 3 - Sharp Right)
  [34, -38],  // 5. The Loop Entry
  [28, -44],  // 6. The Loop Apex Hairpin (Turn 4 - Slow Left)
  [18, -40],  // 7. The Loop Exit
  [12, -30],  // 8. Aintree (Turn 5)
  [-5, -10],  // 9. Wellington Straight
  [-20, 8],   // 10. Wellington Straight End
  [-32, 20],  // 11. Brooklands (Turn 6 - Left Sweeper)
  [-44, 22],  // 12. Luffield Entry (Turn 7)
  [-46, 12],  // 13. Luffield Apex (Right Hairpin)
  [-38, 2],   // 14. Woodcote (Turn 8)
  [-20, -6],  // 15. National Pits Straight
  [-4, -12],  // 16. Copse Entry
  [10, -8],   // 17. Copse Exit (Turn 9 - High Speed Right)
  [24, -2],   // 18. Maggotts (Turn 10 - Fast Left)
  [36, 6],    // 19. Becketts (Turn 11 - Fast Right)
  [42, 16],   // 20. Becketts Apex (Turn 12 - Fast Left)
  [34, 26],   // 21. Chapel (Turn 13 - Right Exit)
  [20, 34],   // 22. Hangar Straight Entry
  [-10, 42],  // 23. Hangar Straight Mid
  [-35, 48],  // 24. Hangar Straight End (Top Speed)
  [-48, 44],  // 25. Stowe Corner (Turn 14 - Fast Right)
  [-55, 30],  // 26. Vale Approach
  [-54, 10],  // 27. Vale Chicane (Turn 15 - Hard Braking Left)
  [-48, -10], // 28. Club Corner Entry (Turn 16)
  [-42, -26], // 29. Club Corner Exit (Turn 17 onto Hamilton Straight)
];

/** Silverstone Catmull-Rom 3D Spline Curve */
export function createSilverstoneSpline(): THREE.CatmullRomCurve3 {
  const points = RAW_SILVERSTONE_COORDS.map(([x, z]) => new THREE.Vector3(x, 0, z));
  return new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
}

/** Streckenabschnitte & Kurven für Telemetrie & dynamische Geschwindigkeitsregelung */
export const SILVERSTONE_SECTORS: TrackSectorInfo[] = [
  { uStart: 0.00, uEnd: 0.08, name: 'HAMILTON STRAIGHT', code: 'S/F', speedTarget: 0.38 },
  { uStart: 0.08, uEnd: 0.14, name: 'ABBEY & FARM CURVE (T1/T2)', code: 'ABBEY', speedTarget: 0.30 },
  { uStart: 0.14, uEnd: 0.22, name: 'VILLAGE & THE LOOP (T3/T4)', code: 'LOOP', speedTarget: 0.16 },
  { uStart: 0.22, uEnd: 0.33, name: 'WELLINGTON STRAIGHT', code: 'WELLINGTON', speedTarget: 0.39 },
  { uStart: 0.33, uEnd: 0.44, name: 'BROOKLANDS & LUFFIELD (T6/T7)', code: 'LUFFIELD', speedTarget: 0.18 },
  { uStart: 0.44, uEnd: 0.52, name: 'WOODCOTE & COPSE (T8/T9)', code: 'COPSE', speedTarget: 0.34 },
  { uStart: 0.52, uEnd: 0.66, name: 'MAGGOTTS & BECKETTS (T10-T13)', code: 'BECKETTS', speedTarget: 0.26 },
  { uStart: 0.66, uEnd: 0.80, name: 'HANGAR STRAIGHT (TOP SPEED)', code: 'HANGAR', speedTarget: 0.42 },
  { uStart: 0.80, uEnd: 0.88, name: 'STOWE CORNER (T14)', code: 'STOWE', speedTarget: 0.28 },
  { uStart: 0.88, uEnd: 0.95, name: 'VALE CHICANE (T15)', code: 'VALE', speedTarget: 0.15 },
  { uStart: 0.95, uEnd: 1.00, name: 'CLUB CORNER (T16/T17)', code: 'CLUB', speedTarget: 0.27 },
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
 * Erzeugt die 3D BufferGeometry für die 8m breite Silverstone-Asphaltrennstrecke
 * inklusive rot-weißen FIA Kerbs (Randsteinen) und Start-Ziel-Markierung.
 */
export function createSilverstoneTrackGeometry(
  curve: THREE.CatmullRomCurve3,
  segments: number = 400,
  trackWidth: number = 8.0,
  kerbWidth: number = 0.9
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

    // 1. Asphalt-Hauptfahrbahn
    const lx = pt.x - normX * halfW;
    const lz = pt.z - normZ * halfW;
    const rx = pt.x + normX * halfW;
    const rz = pt.z + normZ * halfW;

    trackPositions.push(lx, 0.003, lz);
    trackUvs.push(0, u * 32);
    trackPositions.push(rx, 0.003, rz);
    trackUvs.push(1, u * 32);

    if (i < segments) {
      const b = i * 2;
      trackIndices.push(b, b + 1, b + 2);
      trackIndices.push(b + 1, b + 3, b + 2);
    }

    // 2. Rot-Weiße Kerbs links (Außenrand)
    const klx = pt.x - normX * (halfW + kerbWidth);
    const klz = pt.z - normZ * (halfW + kerbWidth);
    kLPositions.push(klx, 0.012, klz);
    kLUvs.push(0, u * 90);
    kLPositions.push(lx, 0.004, lz);
    kLUvs.push(1, u * 90);

    // 3. Rot-Weiße Kerbs rechts (Außenrand)
    const krx = pt.x + normX * (halfW + kerbWidth);
    const krz = pt.z + normZ * (halfW + kerbWidth);
    kRPositions.push(rx, 0.004, rz);
    kRUvs.push(0, u * 90);
    kRPositions.push(krx, 0.012, krz);
    kRUvs.push(1, u * 90);

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
  const sfL = 2.0; // Länge des Schachbrettstreifens
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
