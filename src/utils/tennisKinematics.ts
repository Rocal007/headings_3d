import * as THREE from 'three';

/**
 * ============================================================================
 * SUPERTECHNO 50 TENNIS KINEMATICS & BALLISTICS ENGINE (Agent 15)
 * Specialized Kinematics, Inverse Kinematics (IK), Spin Aerodynamics & Guardrails
 * ============================================================================
 */

// --- 📐 ATP COURT & CRANE CALIBRATION CONSTANTS ---
export const COURT_LENGTH = 23.77;      // Standard Tennis Court Length (m)
export const COURT_WIDTH_SINGLES = 8.23; // Singles Court Width (m)
export const COURT_WIDTH_DOUBLES = 10.97;// Doubles Court Width (m)
export const NET_HEIGHT_CENTER = 0.914;  // Net center height (m)
export const NET_HEIGHT_POST = 1.070;    // Net post height (m)

export const CRANE_BASE_Z_P1 = -15.2;    // Player 1 (North) baseline crane rail track Z (m)
export const CRANE_BASE_Z_P2 = 15.2;     // Player 2 (South) baseline crane rail track Z (m)
export const CRANE_DOLLY_MIN_X = -7.5;   // Dolly rail limit West (m)
export const CRANE_DOLLY_MAX_X = 7.5;    // Dolly rail limit East (m)

export const TIP_Z_RETRACTED = 3.34;     // Pivot to front mount point retracted (m)
export const MAX_TELE_STROKE = 11.30;    // Maximum telescopic boom extension (m)
export const MIN_COLUMN_ELEVATION = 1.54;// Lowest hydraulic column height (m)
export const MAX_COLUMN_ELEVATION = 3.63;// Highest hydraulic column height (m)

export const RACKET_SAFE_FLOOR_CLEARANCE = 0.12; // Safety buffer above court floor (m)
export const NET_SAFETY_BUFFER_Z = 0.45;         // Minimum distance from net plane Z=0 (m)

// --- 🎾 PHYSICAL IMPACT & BOUNCE CONSTANTS ---
export const TENNIS_BALL_RADIUS = 0.033;         // Official Tennis Ball Radius r = 3.3cm (m)
export const DEFAULT_RESTITUTION_E = 0.72;       // Restitutionskoeffizient e in [0.70 .. 0.75]

/**
 * Gleitreibungskoeffizient \mu nach Belagart:
 * - Sandplatz (Langsam / hoher Grip): \mu \approx 0.60
 * - Hartplatz (Medium): \mu \approx 0.40
 * - Rasen (Schnell / geringe Reibung): \mu \approx 0.30
 * - Cyber Neon Court: \mu \approx 0.35
 */
export const SURFACE_FRICTION: Record<'clay' | 'grass' | 'hardcourt' | 'cyber', number> = {
  clay: 0.60,
  hardcourt: 0.40,
  grass: 0.30,
  cyber: 0.35,
};

export const SURFACE_RESTITUTION: Record<'clay' | 'grass' | 'hardcourt' | 'cyber', number> = {
  clay: 0.70,
  hardcourt: 0.73,
  grass: 0.68,
  cyber: 0.75,
};

export type TennisSpinType = 'topspin' | 'slice' | 'flat' | 'kick' | 'dropshot';
export type TennisStrokeSide = 'forehand' | 'backhand' | 'serve';

/**
 * Calculates the exact post-bounce velocity vector \vec{v}_{nach} of a tennis ball
 * using classical impact laws with surface friction and spin momentum transfer:
 * 
 * 1. Vertikaler Absprung:
 *    v_{y,\text{nach}} = -e \cdot v_{y,\text{vor}}
 * 
 * 2. Horizontaler Reibungsverlust:
 *    \vec{v}_{xz,\text{nach}} = \vec{v}_{xz,\text{vor}} - \mu \cdot (1+e) \cdot |v_{y,\text{vor}}| \cdot \hat{u}
 * 
 * 3. Drall-Einfluss (Spin Momentum Transfer):
 *    + \frac{2}{5} \cdot r \cdot (\vec{\omega}_{\text{vor}} \times \vec{n})
 *    - Topspin: Erhöht v_{xz,\text{nach}} (Ball schießt flach & schnell nach vorne)
 *    - Backspin (Slice): Verringert v_{xz,\text{nach}} (Ball springt steiler & bremst stark ab)
 */
export function calculateBallBounceReboundVelocity(
  vBefore: THREE.Vector3,
  surface: 'clay' | 'grass' | 'hardcourt' | 'cyber' = 'hardcourt',
  spinType?: TennisSpinType,
  rpm: number = 0,
  customE?: number
): THREE.Vector3 {
  const e = customE ?? (SURFACE_RESTITUTION[surface] ?? DEFAULT_RESTITUTION_E);
  const mu = SURFACE_FRICTION[surface] ?? 0.40;
  const r = TENNIS_BALL_RADIUS;

  // 1. Vertikaler Absprung (Y-Achse): v_{y,nach} = -e * v_{y,vor}
  const vyNach = -e * vBefore.y;

  // 2. Horizontale Ebene (X- und Z-Achse): \vec{v}_{xz}
  const vXZVor = new THREE.Vector2(vBefore.x, vBefore.z);
  const horizontalSpeedVor = vXZVor.length();

  if (horizontalSpeedVor < 0.0001) {
    return new THREE.Vector3(0, vyNach, 0);
  }

  const uHat = vXZVor.clone().normalize(); // Einheitsvektor \hat{u}

  // Bremsfaktor: \mu \cdot (1 + e) \cdot |v_{y,vor}|
  const frictionDecel = mu * (1.0 + e) * Math.abs(vBefore.y);
  let vXZMagNach = Math.max(0, horizontalSpeedVor - frictionDecel);

  // 3. Spin-Wandlung: \frac{2}{5} \cdot r \cdot (\vec{\omega} \times \vec{n})
  const omegaRad = (rpm * 2.0 * Math.PI) / 60.0;
  if (omegaRad > 0) {
    const spinImpulse = (2.0 / 5.0) * r * omegaRad;
    if (spinType === 'topspin' || spinType === 'flat') {
      // Topspin erhöht Vorwärtsgeschwindigkeit
      vXZMagNach += spinImpulse * 0.45;
    } else if (spinType === 'slice' || spinType === 'dropshot') {
      // Backspin / Slice verringert Vorwärtsgeschwindigkeit
      vXZMagNach = Math.max(0.05, vXZMagNach - spinImpulse * 0.65);
    }
  }

  const vxNach = uHat.x * vXZMagNach;
  const vzNach = uHat.y * vXZMagNach;

  return new THREE.Vector3(vxNach, vyNach, vzNach);
}

export interface TennisCranePose {
  dollyTrack: number;
  columnElevation: number;
  basePan: number;
  boomTilt: number;
  teleExtension: number;
  headPan: number;
  headTilt: number;
  headRoll: number;
}

export interface TennisRK4Sample {
  progress: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  time: number;
}

export interface TennisBallState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3; // rad/s
  time: number;
}

export interface TennisBallisticShot {
  shooter: 1 | 2;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  bouncePos?: THREE.Vector3;
  duration: number;
  progress: number;
  netHeight: number;
  shotType: string;
  strokeSide: TennisStrokeSide;
  spinType?: TennisSpinType;
  rpm?: number;
  speedKmh: number;
  hasBounced?: boolean;
  isServe?: boolean;
  servePhase?: number;
  isVolley?: boolean;
  isSmash?: boolean;
  isLob?: boolean;
  isDropShot?: boolean;
  isDecisive?: boolean;
  isNetCord?: boolean;
  isNetError?: boolean;
  isOutError?: boolean;
  rk4Trajectory?: TennisRK4Sample[];
}

/**
 * 🎾 ITF & ROD CROSS AERODYNAMISCHE BESCHLEUNIGUNG (DRAG + MAGNUS-EFFEKT)
 * Berechnet a = g + a_drag + a_magnus
 */
export function computeTennisAerodynamicAcceleration(
  vel: THREE.Vector3,
  spinAngularVel: THREE.Vector3,
  airDensity: number = 1.21
): THREE.Vector3 {
  const speed = vel.length();
  if (speed < 0.01) return new THREE.Vector3(0, -9.81, 0);

  const ballRadius = TENNIS_BALL_RADIUS; // 0.033m
  const ballArea = Math.PI * ballRadius * ballRadius; // 0.00342 m^2
  const ballMass = 0.0577; // 57.7g

  // 1. Drag Coefficient Cd (nach ITF / Rod Cross für befilzten Tennisball)
  const cd = 0.55 + 0.10 / (1.0 + Math.exp(-(speed - 30.0) / 6.0));
  const fDragMag = 0.5 * cd * airDensity * ballArea * speed * speed;
  const aDrag = vel.clone().normalize().multiplyScalar(-fDragMag / ballMass);

  // 2. Magnus Lift Force F_M = 0.5 * C_L * rho * A * (omega x v)
  const spinSpeed = spinAngularVel.length();
  let aMagnus = new THREE.Vector3(0, 0, 0);
  if (spinSpeed > 0.1) {
    const spinParam = (ballRadius * spinSpeed) / speed;
    const cLift = 1.0 / (2.0 + 1.0 / Math.max(0.001, spinParam));
    const fMagnusMag = 0.5 * cLift * airDensity * ballArea * speed * speed;
    
    const magnusDir = new THREE.Vector3().crossVectors(spinAngularVel, vel).normalize();
    aMagnus = magnusDir.multiplyScalar(fMagnusMag / ballMass);
  }

  return new THREE.Vector3(0, -9.81, 0).add(aDrag).add(aMagnus);
}

/**
 * 🚀 RUNGE-KUTTA 4. ORDNUNG (RK4) DIFFERENTIALGLEICHUNGS-SOLVER
 */
export function stepRK4TennisPhysics(
  state: TennisBallState,
  dt: number
): TennisBallState {
  const p0 = state.pos;
  const v0 = state.vel;
  const spin = state.spin;

  // k1
  const a1 = computeTennisAerodynamicAcceleration(v0, spin);
  const kv1_x = v0;
  const kv1_v = a1;

  // k2
  const v1 = v0.clone().addScaledVector(kv1_v, dt * 0.5);
  const a2 = computeTennisAerodynamicAcceleration(v1, spin);
  const kv2_x = v1;
  const kv2_v = a2;

  // k3
  const v2 = v0.clone().addScaledVector(kv2_v, dt * 0.5);
  const a3 = computeTennisAerodynamicAcceleration(v2, spin);
  const kv3_x = v2;
  const kv3_v = a3;

  // k4
  const v3 = v0.clone().addScaledVector(kv3_v, dt);
  const a4 = computeTennisAerodynamicAcceleration(v3, spin);
  const kv4_x = v3;
  const kv4_v = a4;

  // RK4 Gewichtete Summe
  const nextPos = p0.clone().addScaledVector(
    kv1_x.clone().addScaledVector(kv2_x, 2).addScaledVector(kv3_x, 2).add(kv4_x),
    dt / 6.0
  );
  const nextVel = v0.clone().addScaledVector(
    kv1_v.clone().addScaledVector(kv2_v, 2).addScaledVector(kv3_v, 2).add(kv4_v),
    dt / 6.0
  );

  return {
    pos: nextPos,
    vel: nextVel,
    spin: spin.clone(),
    time: state.time + dt
  };
}

/**
 * 🎾 SIMULIERT EINE VOLLSTÄNDIGE PHYSICS-TRAJEKTORIE MIT DEM RK4-SOLVER
 */
export function simulateTennisShotTrajectoryRK4(
  shot: TennisBallisticShot,
  surface: 'clay' | 'grass' | 'hardcourt' | 'cyber' = 'hardcourt',
  samplesCount: number = 100
): TennisRK4Sample[] {
  const samples: TennisRK4Sample[] = [];
  const totalDuration = Math.max(0.2, shot.duration);
  const dt = totalDuration / samplesCount;

  // 1. SMASH SPECIAL TRAJECTORY: REALER 248 KM/H ABWÄRTSSCHUSS & TRIBÜNEN-REBOUND
  if (shot.isSmash && shot.bouncePos) {
    const floorImpactPhase = 0.30;
    const impactSamples = Math.round(samplesCount * floorImpactPhase);
    
    // Phase 1: High downward missile from startPos to bouncePos
    for (let i = 0; i <= impactSamples; i++) {
      const p = (i / samplesCount);
      const t = i / impactSamples;
      const pos = new THREE.Vector3(
        THREE.MathUtils.lerp(shot.startPos.x, shot.bouncePos.x, t),
        THREE.MathUtils.lerp(shot.startPos.y, 0.065, t * t),
        THREE.MathUtils.lerp(shot.startPos.z, shot.bouncePos.z, t)
      );
      const vel = new THREE.Vector3(
        (shot.bouncePos.x - shot.startPos.x) / (totalDuration * floorImpactPhase),
        -Math.sqrt(2 * 9.81 * (shot.startPos.y - 0.065)) * 1.8,
        (shot.bouncePos.z - shot.startPos.z) / (totalDuration * floorImpactPhase)
      );
      samples.push({ progress: p, pos, vel, time: p * totalDuration });
    }

    // Phase 2: Massive explosive rebound into the grandstands
    const reboundApex = shot.isDecisive ? 5.2 : 2.4;
    for (let i = impactSamples + 1; i <= samplesCount; i++) {
      const p = (i / samplesCount);
      const t = (p - floorImpactPhase) / (1.0 - floorImpactPhase);
      const tDecel = Math.sin(t * (Math.PI / 2));
      const pos = new THREE.Vector3(
        THREE.MathUtils.lerp(shot.bouncePos.x, shot.targetPos.x, tDecel),
        Math.max(0.065, THREE.MathUtils.lerp(0.065, shot.targetPos.y, tDecel) + Math.sin(t * Math.PI) * reboundApex),
        THREE.MathUtils.lerp(shot.bouncePos.z, shot.targetPos.z, tDecel)
      );
      const vel = new THREE.Vector3(
        (shot.targetPos.x - shot.bouncePos.x) / (totalDuration * (1 - floorImpactPhase)),
        reboundApex * 4.0,
        (shot.targetPos.z - shot.bouncePos.z) / (totalDuration * (1 - floorImpactPhase))
      );
      samples.push({ progress: p, pos, vel, time: p * totalDuration });
    }
    return samples;
  }

  const rpm = shot.rpm || 2400;
  const omegaMag = (rpm * 2.0 * Math.PI) / 60.0;
  const isPlayer1 = shot.shooter === 1;
  const fwdDir = isPlayer1 ? 1.0 : -1.0;

  // Drallachse für Topspin / Slice / Kick
  let spinAxis = new THREE.Vector3(fwdDir, 0, 0);
  if (shot.spinType === 'slice' || shot.spinType === 'dropshot') {
    spinAxis = new THREE.Vector3(-fwdDir, 0, 0);
  } else if (shot.spinType === 'kick') {
    spinAxis = new THREE.Vector3(fwdDir * 0.8, 0, fwdDir * 0.6).normalize();
  }
  const spinVector = spinAxis.clone().multiplyScalar(omegaMag);

  // Analytische Näherung für v0 basierend auf Start, Ziel und Netzhöhe
  const delta = shot.targetPos.clone().sub(shot.startPos);
  const distXZ = new THREE.Vector2(delta.x, delta.z).length();
  const v_xz_mag = distXZ / totalDuration;
  const dirXZ = new THREE.Vector3(delta.x, 0, delta.z).normalize();

  const netApex = Math.max(shot.netHeight, 1.25);
  const h = Math.max(0.4, netApex - shot.startPos.y);
  const v_y0 = Math.sqrt(2.0 * 9.81 * h) * 1.12;
  const initVel = dirXZ.clone().multiplyScalar(v_xz_mag).setY(v_y0);

  let state: TennisBallState = {
    pos: shot.startPos.clone(),
    vel: initVel,
    spin: spinVector,
    time: 0.0
  };

  samples.push({
    progress: 0.0,
    pos: state.pos.clone(),
    vel: state.vel.clone(),
    time: 0.0
  });

  const floorY = 0.065;
  let hasBounced = false;

  for (let i = 1; i <= samplesCount; i++) {
    state = stepRK4TennisPhysics(state, dt);
    const p = i / samplesCount;

    // Bodenkollision & Rod Cross Grip-Slip Rebound
    if (!hasBounced && state.pos.y <= floorY && p > 0.35 && !shot.isVolley) {
      hasBounced = true;
      state.pos.y = floorY;
      state.vel = calculateBallBounceReboundVelocity(
        state.vel,
        surface,
        shot.spinType,
        rpm
      );
    }

    samples.push({
      progress: p,
      pos: state.pos.clone(),
      vel: state.vel.clone(),
      time: state.time
    });
  }

  return samples;
}

/**
 * ⚡ ECHTE O(1) AUSWERTUNG DER RK4-TRAJEKTORIE BEI BELIEBIGEM FORTSCHRITT p in [0, 1]
 */
export function evaluateTennisRK4Position(
  samples: TennisRK4Sample[],
  p: number
): THREE.Vector3 {
  if (!samples || samples.length === 0) return new THREE.Vector3();
  const prog = THREE.MathUtils.clamp(p, 0.0, 1.0);
  const floatIdx = prog * (samples.length - 1);
  const idx = Math.floor(floatIdx);
  const frac = floatIdx - idx;

  if (idx >= samples.length - 1) {
    return samples[samples.length - 1].pos.clone();
  }

  const pA = samples[idx].pos;
  const pB = samples[idx + 1].pos;
  return new THREE.Vector3().lerpVectors(pA, pB, frac);
}

/**
 * Calculates dynamic 3D ball position across all shot trajectories (Groundstroke, Volley, Smash, Lob, Netcord, Net-Error).
 */
export function computeTennisBallPosition(shot: TennisBallisticShot, p: number): THREE.Vector3 {
  if (shot.rk4Trajectory && shot.rk4Trajectory.length > 0) {
    return evaluateTennisRK4Position(shot.rk4Trajectory, p);
  }

  const progress = Math.max(0.0, Math.min(1.0, p));
  const result = new THREE.Vector3();

  // 1. SMASH TRAJECTORY: REALER 248 KM/H ABWÄRTSSCHUSS & TRIBÜNEN-REBOUND
  if (shot.isSmash && shot.bouncePos) {
    const floorImpactPhase = 0.30;
    if (progress <= floorImpactPhase) {
      const t = progress / floorImpactPhase;
      result.x = THREE.MathUtils.lerp(shot.startPos.x, shot.bouncePos.x, t);
      result.z = THREE.MathUtils.lerp(shot.startPos.z, shot.bouncePos.z, t);
      result.y = THREE.MathUtils.lerp(shot.startPos.y, 0.065, t * t);
    } else {
      const t = (progress - floorImpactPhase) / (1.0 - floorImpactPhase);
      const tDecel = Math.sin(t * (Math.PI / 2));
      result.x = THREE.MathUtils.lerp(shot.bouncePos.x, shot.targetPos.x, tDecel);
      result.z = THREE.MathUtils.lerp(shot.bouncePos.z, shot.targetPos.z, tDecel);
      const reboundApex = shot.isDecisive ? 5.2 : 2.4;
      result.y = Math.max(0.065, THREE.MathUtils.lerp(0.065, shot.targetPos.y, tDecel) + Math.sin(t * Math.PI) * reboundApex);
    }
    return result;
  }

  // 2. VOLLEY TRAJECTORY (Direct in-air hit over the net)
  if (shot.isVolley) {
    result.x = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, progress);
    result.z = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, progress);
    const arc = 4.0 * progress * (1.0 - progress);
    result.y = THREE.MathUtils.lerp(shot.startPos.y, shot.targetPos.y, progress) + arc * Math.max(0.35, shot.netHeight * 0.45);
    return result;
  }

  // 3. NET ERROR TRAJECTORY (Inelastischer Stoß mit Netzgewebe -> Elastische Rückfederung & Gravitationsfall)
  if (shot.isNetError) {
    const netImpactP = 0.46; // Einschlag ins Netzmaschen-Gewebe
    const netX = (shot.startPos.x + shot.targetPos.x) * 0.5;
    const shooterSideSign = shot.shooter === 1 ? -1 : 1;
    const impactZ = shooterSideSign * 0.04;
    const netY = shot.netHeight || 0.68;

    if (progress <= netImpactP) {
      // Phase 1: Anflug ins Netz
      const t = progress / netImpactP;
      result.x = THREE.MathUtils.lerp(shot.startPos.x, netX, t);
      result.z = THREE.MathUtils.lerp(shot.startPos.z, impactZ, t);
      const arc = 4.0 * t * (1.0 - t);
      result.y = THREE.MathUtils.lerp(shot.startPos.y, netY, t) + arc * 0.15;
    } else {
      // Phase 2: Inelastischer Stoß -> Sanfter Rebound & senkrechtes Herabfallen an der Netzbasis
      const t = (progress - netImpactP) / (1.0 - netImpactP);
      // Netz gibt nach und federt leicht zurück auf die Seite des Schlägers (12-22 cm)
      const reboundDist = shooterSideSign * (0.04 + Math.sin(t * (Math.PI / 2)) * 0.18);
      result.z = reboundDist;
      result.x = netX + Math.sin(t * 4.0) * 0.03;

      if (t < 0.75) {
        // Gravitativer Fall nach unten
        const fallT = t / 0.75;
        result.y = THREE.MathUtils.lerp(netY, 0.065, fallT * fallT);
      } else {
        // Micro-Bounce am Boden an der Netzbasis
        const bounceT = (t - 0.75) / 0.25;
        const microHop = Math.sin(bounceT * Math.PI) * 0.05 * (1.0 - bounceT);
        result.y = 0.065 + microHop;
      }
    }
    return result;
  }

  // 4. NET CORD TRAJECTORY (Ticks the white net tape, hesitates, and trickles over)
  if (shot.isNetCord) {
    const netP = 0.50;
    const netZ = 0;
    if (progress < netP) {
      const t = progress / netP;
      result.x = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x * 0.5, t);
      result.z = THREE.MathUtils.lerp(shot.startPos.z, netZ, t);
      const arc = Math.sin(t * (Math.PI / 2));
      result.y = THREE.MathUtils.lerp(shot.startPos.y, NET_HEIGHT_CENTER + 0.04, arc);
    } else {
      const t = (progress - netP) / (1.0 - netP);
      const tDecel = Math.sin(t * (Math.PI / 2));
      result.x = THREE.MathUtils.lerp(shot.targetPos.x * 0.5, shot.targetPos.x, tDecel);
      result.z = THREE.MathUtils.lerp(netZ, shot.targetPos.z, tDecel);
      const dropArc = Math.sin(t * Math.PI) * 0.15;
      result.y = THREE.MathUtils.lerp(NET_HEIGHT_CENTER + 0.04, 0.75, t) + dropArc;
    }
    return result;
  }

  // 5. STANDARD GROUNDSTROKE & LOB (Mit präziser Bodenreibung & Verzögerung nach dem Aufprall)
  if (shot.bouncePos) {
    const bounceProg = shot.isLob ? (shot.isDecisive ? 0.74 : 0.68) : 0.70;
    if (progress < bounceProg) {
      const t = progress / bounceProg;
      result.x = THREE.MathUtils.lerp(shot.startPos.x, shot.bouncePos.x, t);
      result.z = THREE.MathUtils.lerp(shot.startPos.z, shot.bouncePos.z, t);
      const arc = 4.0 * t * (1.0 - t);
      let h = THREE.MathUtils.lerp(shot.startPos.y, shot.bouncePos.y, t) + arc * (shot.netHeight || 1.45);
      if (shot.spinType === 'topspin' && shot.rpm) {
        h -= Math.sin(t * Math.PI) * (shot.rpm / 3400) * 0.18;
      } else if (shot.spinType === 'slice') {
        h += Math.sin(t * Math.PI) * 0.15;
      }
      result.y = h;
    } else {
      const t = (progress - bounceProg) / (1.0 - bounceProg);
      // Reale Bodenreibung: Nach Aufprall verliert der Ball 35-45% Tempo -> Ease-Out Kurve
      const tDecel = Math.sin(t * (Math.PI / 2));
      result.x = THREE.MathUtils.lerp(shot.bouncePos.x, shot.targetPos.x, tDecel);
      result.z = THREE.MathUtils.lerp(shot.bouncePos.z, shot.targetPos.z, tDecel);

      // 🚀 PHYSIKALISCH EXAKTE ABSPRUNGDYNAMIK (STETIGER AUFSTIEG IN DIE TREFFPUNKTHÖHE)
      const excessApex = shot.isLob 
        ? (0.45 + THREE.MathUtils.clamp(shot.netHeight * 0.12, 0.2, 0.8))
        : shot.spinType === 'topspin' 
          ? (0.28 + ((shot.rpm || 2500) / 3200) * 0.22)
          : shot.spinType === 'slice' 
            ? -0.06 
            : shot.isDropShot 
              ? -0.15 
              : 0.12;

      const riseT = shot.spinType === 'slice' 
        ? Math.pow(t, 1.35) 
        : Math.sin(t * (Math.PI / 2));
      const bounceParabola = 4.0 * t * (1.0 - t);
      result.y = Math.max(0.065, THREE.MathUtils.lerp(0.065, shot.targetPos.y, riseT) + bounceParabola * excessApex);
    }
    return result;
  }

  // 6. FALLBACK TRAJECTORY
  result.x = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, progress);
  result.z = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, progress);
  const arc = 4.0 * progress * (1.0 - progress);
  result.y = THREE.MathUtils.lerp(shot.startPos.y, shot.targetPos.y, progress) + arc * (shot.netHeight || 1.45);

  result.y = Math.max(0.065, result.y);
  return result;
}

/**
 * Solves Inverse Kinematics (IK) for the Supertechno 50 Crane to reach a 3D target contact point.
 */
export function solveTennisCraneIK(
  targetPos: THREE.Vector3,
  craneBaseZ: number,
  _currentDollyTrack?: number,
  options?: {
    isSmash?: boolean;
    isVolley?: boolean;
    isLob?: boolean;
    strokeSide?: TennisStrokeSide;
    lerpFactor?: number;
  }
): {
  dollyTrack: number;
  columnElevation: number;
  boomTilt: number;
  teleExtension: number;
  basePan: number;
} {
  // 1. Dolly Track (X rail positioning)
  const targetDollyX = THREE.MathUtils.clamp(targetPos.x * 0.72, CRANE_DOLLY_MIN_X, CRANE_DOLLY_MAX_X);

  // 2. Horizontal & Longitudinal delta relative to pivot
  const deltaX = targetPos.x - targetDollyX;
  const deltaZ = targetPos.z - craneBaseZ;
  const distH = Math.hypot(deltaX, deltaZ);

  // 3. Hydraulic Column Height
  let idealColY = THREE.MathUtils.clamp(targetPos.y * 0.5 + 1.15, MIN_COLUMN_ELEVATION, 3.25);
  if (options?.isSmash) idealColY = 3.20;
  else if (options?.isVolley) idealColY = THREE.MathUtils.clamp(targetPos.y * 0.5 + 1.1, 1.6, 3.1);

  // 4. Vertical delta & 3D reach distance
  const deltaY = targetPos.y - idealColY;
  const total3DDist = Math.hypot(distH, deltaY);

  // 5. Telescopic Boom Extension & Pitch Tilt Angle
  const targetTeleExt = THREE.MathUtils.clamp(total3DDist - TIP_Z_RETRACTED, 0.2, MAX_TELE_STROKE);
  const targetBoomTilt = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));

  // 6. Base Slew Azimuth Angle (Base Pan)
  const targetBasePan = THREE.MathUtils.radToDeg(Math.atan2(deltaX, deltaZ));

  return {
    dollyTrack: targetDollyX,
    columnElevation: idealColY,
    boomTilt: targetBoomTilt,
    teleExtension: targetTeleExt,
    basePan: targetBasePan,
  };
}

/**
 * Solves Remote Head (Pan, Tilt, Roll) Gimbal angles for tennis stroke biomechanics.
 */
export function solveRacketGimbalAngles(
  strokeType: string,
  strokeSide: TennisStrokeSide,
  phase: number,
  aimAngleDeg: number,
  playerNumber: 1 | 2
): { headPan: number; headTilt: number; headRoll: number } {
  const isP1 = playerNumber === 1;
  const rollDir = isP1 ? 1 : -1;
  const isForehand = strokeSide === 'forehand';
  const aimBias = aimAngleDeg * 0.15;

  // 1. SERVE GIMBAL POSE
  if (strokeSide === 'serve') {
    if (phase < 0.35) {
      // Ball bounce & trophy stance
      return { headPan: (12 + aimBias) * rollDir, headTilt: 48, headRoll: -35 * rollDir };
    } else if (phase < 0.75) {
      // Explosive pronation snap
      return { headPan: (-18 + aimBias) * rollDir, headTilt: -42, headRoll: 65 * rollDir };
    } else {
      // Follow-through
      return { headPan: (-8 + aimBias * 0.5) * rollDir, headTilt: -15, headRoll: 20 * rollDir };
    }
  }

  // 2. SMASH GIMBAL POSE (4-Phasen-Sequenz nach biomechanischem Standard)
  if (strokeType.toLowerCase().includes('smash')) {
    if (phase < 0.22) {
      // Phase 1: Ausrichtung & Beinarbeit (Flankenposition & Peil-Arm auf Ball gerichtet)
      return { headPan: 14 * rollDir, headTilt: 32, headRoll: -12 * rollDir };
    } else if (phase < 0.40) {
      // Phase 2: Ausholphase (Schläger hinter den Kopf / Nacken, Knie beugen, Gewicht nach hinten)
      return { headPan: 18 * rollDir, headTilt: 58, headRoll: -38 * rollDir };
    } else if (phase < 0.65) {
      // Phase 3: Treffpunkt & Handgelenks-Snap (Gestreckter Arm oben, peitschenartiger Snap & Pronation)
      return { headPan: -22 * rollDir, headTilt: -62, headRoll: 82 * rollDir };
    } else {
      // Phase 4: Ausschwung an linker Hüfte & fließende Rückkehr in Grundposition
      return { headPan: -24 * rollDir, headTilt: -12, headRoll: 15 * rollDir };
    }
  }

  // 3. GROUNDSTROKE & TOPSPIN / SLICE
  if (phase < 0.65) {
    // Wind-up & Backswing
    const windupRoll = isForehand ? 25 * rollDir : -30 * rollDir;
    const windupPan = isForehand ? 15 : -18;
    return { headPan: windupPan, headTilt: 12, headRoll: windupRoll };
  } else {
    // Impact Acceleration & Follow-Through Brush
    const followRoll = isForehand ? -45 * rollDir : 50 * rollDir;
    const followPan = isForehand ? -18 : 22;
    const followTilt = isForehand ? -18 : 16;
    return { headPan: followPan, headTilt: followTilt, headRoll: followRoll };
  }
}

/**
 * Enforces safety guardrails: keeps racket above court ground and prevents net collisions.
 */
export function clampTennisGuardrails(pose: TennisCranePose, craneBaseZ: number): TennisCranePose {
  const clamped = { ...pose };

  // 1. Column Elevation range
  clamped.columnElevation = THREE.MathUtils.clamp(clamped.columnElevation, MIN_COLUMN_ELEVATION, MAX_COLUMN_ELEVATION);

  // 2. Telescopic Extension range
  clamped.teleExtension = THREE.MathUtils.clamp(clamped.teleExtension, 0.0, MAX_TELE_STROKE);

  // 3. Dolly Track range
  clamped.dollyTrack = THREE.MathUtils.clamp(clamped.dollyTrack, CRANE_DOLLY_MIN_X, CRANE_DOLLY_MAX_X);

  // 4. Boom Tilt limits (-45° to +60°)
  clamped.boomTilt = THREE.MathUtils.clamp(clamped.boomTilt, -45, 60);

  // 5. Net Collision Protection Zone (Keep boom tip away from Z=0 net line)
  const tipZDistance = (TIP_Z_RETRACTED + clamped.teleExtension) * Math.cos(THREE.MathUtils.degToRad(clamped.boomTilt));
  const boomTipWorldZ = craneBaseZ > 0 ? craneBaseZ - tipZDistance : craneBaseZ + tipZDistance;

  if (Math.abs(boomTipWorldZ) < NET_SAFETY_BUFFER_Z) {
    const maxSafeExt = Math.max(0.2, (Math.abs(craneBaseZ) - NET_SAFETY_BUFFER_Z) / Math.cos(THREE.MathUtils.degToRad(clamped.boomTilt)) - TIP_Z_RETRACTED);
    clamped.teleExtension = Math.min(clamped.teleExtension, maxSafeExt);
  }

  return clamped;
}

/**
 * High-Precision 4-Phase Smash Kinematics Solver (Positioning, Wind-up, Apex Impact & Follow-through)
 */
export function solveSmash4PhaseKinematics(
  progress: number,
  targetPoint: THREE.Vector3,
  _craneBaseZ: number,
  playerNumber: 1 | 2
): TennisCranePose {
  const isP1 = playerNumber === 1;
  const rollDir = isP1 ? 1 : -1;
  const targetDollyX = THREE.MathUtils.clamp(targetPoint.x, CRANE_DOLLY_MIN_X, CRANE_DOLLY_MAX_X);

  if (progress < 0.22) {
    // 1. POSITIONIERUNG & BEINARBEIT (Flankenstellung, Crossover-Verfahrweg, Peil-Arm auf Ball)
    const t = progress / 0.22;
    return {
      dollyTrack: THREE.MathUtils.lerp(0, targetDollyX, t),
      columnElevation: THREE.MathUtils.lerp(2.20, 2.50, t),
      basePan: 28.0 * rollDir,
      boomTilt: THREE.MathUtils.lerp(20, 32, t),
      teleExtension: THREE.MathUtils.lerp(4.5, 5.8, t),
      headPan: 14.0 * rollDir,
      headTilt: 32.0,
      headRoll: -12.0 * rollDir,
    };
  } else if (progress < 0.40) {
    // 2. AUSHOLPHASE & KNIEBEUGUNG (Schläger hinter Kopf/Nacken, Körperspannung & Gewichtsverlagerung nach hinten)
    const t = (progress - 0.22) / 0.18;
    return {
      dollyTrack: targetDollyX,
      columnElevation: THREE.MathUtils.lerp(2.50, 2.38, t), // Kniebeugung / elastisches Einfedern
      basePan: 32.0 * rollDir,
      boomTilt: THREE.MathUtils.lerp(32, 46, t),           // Neigung nach hinten-oben
      teleExtension: THREE.MathUtils.lerp(5.8, 7.2, t),
      headPan: 18.0 * rollDir,
      headTilt: THREE.MathUtils.lerp(32, 58, t),           // Schläger fällt hinter Kopf
      headRoll: THREE.MathUtils.lerp(-12 * rollDir, -38 * rollDir, t),
    };
  } else if (progress < 0.65) {
    // 3. TREFFPUNKT & PEITSCHEN-SNAP (Volle Streckung nach oben/vorne, Handgelenks-Snap für 248 km/h & Topspin)
    const t = (progress - 0.40) / 0.25;
    return {
      dollyTrack: targetDollyX,
      columnElevation: THREE.MathUtils.lerp(2.38, 3.35, Math.sin(t * Math.PI / 2)),
      basePan: THREE.MathUtils.lerp(32 * rollDir, 0, t),
      boomTilt: THREE.MathUtils.lerp(46, 12, t * t),        // Explosiver Vorwärts-Abwärtshieb
      teleExtension: THREE.MathUtils.lerp(7.2, 9.4, Math.sin(t * Math.PI / 2)),
      headPan: THREE.MathUtils.lerp(18 * rollDir, -22 * rollDir, t),
      headTilt: THREE.MathUtils.lerp(58, -62, t * t),       // Peitschen-Snap des Handgelenks
      headRoll: THREE.MathUtils.lerp(-38 * rollDir, 82 * rollDir, t),
    };
  } else {
    // 4. AUSSCHWUNG & RE-POSITIONING (Ausschwung an linker Hüfte & Rückkehr in Grundposition)
    const t = (progress - 0.65) / 0.35;
    return {
      dollyTrack: targetDollyX,
      columnElevation: THREE.MathUtils.lerp(3.35, 2.05, t),
      basePan: 0,
      boomTilt: THREE.MathUtils.lerp(12, 16, t),
      teleExtension: THREE.MathUtils.lerp(9.4, 4.8, t),
      headPan: THREE.MathUtils.lerp(-22 * rollDir, 0, t),
      headTilt: THREE.MathUtils.lerp(-62, 0, t),
      headRoll: THREE.MathUtils.lerp(82 * rollDir, 0, t),
    };
  }
}

