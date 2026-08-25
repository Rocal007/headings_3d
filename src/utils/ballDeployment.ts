import * as THREE from 'three';
import { 
  type TennisSpinType,
  calculateBallBounceReboundVelocity,
  stepRK4TennisPhysics,
  type TennisRK4Sample,
  type TennisBallState
} from './tennisKinematics';

/**
 * ============================================================================
 * SUPERTECHNO 50 TENNIS BALL DEPLOYMENT & LAUNCH CANNON ENGINE (Agent 21)
 * Multi-Ball Hopper, Pneumatic Ballistics, Ballboy Delivery & Training Drills
 * ============================================================================
 */

export const HOPPER_MAX_CAPACITY = 6;
export const CANNON_MIN_VELOCITY_KMH = 50;
export const CANNON_MAX_VELOCITY_KMH = 260;
export const CANNON_NOMINAL_PRESSURE_BAR = 8.4;
export const CANNON_SAFE_CLEARANCE = 1.20; // Safety radius in meters

export type DeploymentMode = 'match' | 'training_drill' | 'rapid_fire' | 'ballboy_reload';

export type TrainingDrillPreset = 
  | 'topspin_cross' 
  | 'smash_overhead' 
  | 'backhand_laser' 
  | 'drop_net' 
  | 'rapid_fire_rally';

export interface BallHopperState {
  capacity: number;
  loadedCount: number;
  isReloading: boolean;
  reloadProgress: number; // 0.0 to 1.0
  currentChamberIndex: number; // 0 to 5
  chamberAngleDeg: number; // 0 to 360
  pressureBar: number; // Nominal ~8.4 Bar
  mode: DeploymentMode;
  lastFiredTime: number;
  cooldownSec: number;
}

export interface BallCannonConfig {
  muzzleVelocityKmh: number;
  launchPitchDeg: number; // Elevation angle (10° to 75°)
  launchYawDeg: number;   // Azimuth angle (-35° to +35°)
  spinRpm: number;        // -4000 to +4500 RPM
  spinType: TennisSpinType;
  barrelLengthM: number;
  pressureBar: number;
  barrelGlowIntensity: number;
}

export interface BallBoyFeedEvent {
  ballBoyIndex: 0 | 1 | 2 | 3;
  startPos: THREE.Vector3;
  targetHopperPos: THREE.Vector3;
  feedType: 'hand_toss' | 'ground_roll';
  duration: number;
  progress: number;
  spinType: TennisSpinType;
  rpm: number;
  isActive: boolean;
}

export interface CannonShotTrajectory {
  startPos: THREE.Vector3;
  muzzleVel: THREE.Vector3;
  apexPos: THREE.Vector3;
  bouncePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  duration: number;
  speedKmh: number;
  spinRpm: number;
  spinType: TennisSpinType;
  samples: TennisRK4Sample[];
}

/**
 * Creates the default initial state of the Multi-Ball Hopper.
 */
export function createDefaultHopperState(): BallHopperState {
  return {
    capacity: HOPPER_MAX_CAPACITY,
    loadedCount: HOPPER_MAX_CAPACITY,
    isReloading: false,
    reloadProgress: 0.0,
    currentChamberIndex: 0,
    chamberAngleDeg: 0.0,
    pressureBar: CANNON_NOMINAL_PRESSURE_BAR,
    mode: 'match',
    lastFiredTime: 0,
    cooldownSec: 0.85
  };
}

/**
 * Advances the hopper reload and chamber index animation over time.
 */
export function stepHopperState(
  state: BallHopperState,
  dt: number
): BallHopperState {
  const next = { ...state };

  // 1. Chamber index rotation interpolation
  const targetAngle = next.currentChamberIndex * (360.0 / next.capacity);
  next.chamberAngleDeg = THREE.MathUtils.lerp(next.chamberAngleDeg, targetAngle, dt * 10.0);

  // 2. Pressure recharging
  if (next.pressureBar < CANNON_NOMINAL_PRESSURE_BAR) {
    next.pressureBar = Math.min(CANNON_NOMINAL_PRESSURE_BAR, next.pressureBar + dt * 1.8);
  }

  // 3. Reload progression if currently in reload state
  if (next.isReloading) {
    next.reloadProgress += dt / 1.4; // 1.4s reload cycle
    if (next.reloadProgress >= 1.0) {
      next.reloadProgress = 0.0;
      next.isReloading = false;
      next.loadedCount = Math.min(next.capacity, next.loadedCount + 1);
      next.currentChamberIndex = (next.currentChamberIndex + 1) % next.capacity;
    }
  }

  return next;
}

/**
 * Calculates 3D muzzle initial velocity vector for the pneumatic ball cannon.
 */
export function calculateCannonLaunchVelocity(
  config: BallCannonConfig,
  baseOrientation: 'north' | 'south' = 'south'
): THREE.Vector3 {
  const speedMs = (config.muzzleVelocityKmh * 1000.0) / 3600.0;
  const pitchRad = THREE.MathUtils.degToRad(config.launchPitchDeg);
  const yawRad = THREE.MathUtils.degToRad(config.launchYawDeg);

  const forwardSign = baseOrientation === 'south' ? 1.0 : -1.0;

  const vx = Math.sin(yawRad) * Math.cos(pitchRad) * speedMs * forwardSign;
  const vy = Math.sin(pitchRad) * speedMs;
  const vz = Math.cos(yawRad) * Math.cos(pitchRad) * speedMs * forwardSign;

  return new THREE.Vector3(vx, vy, vz);
}

/**
 * Solves a complete 3D Runge-Kutta 4th-Order (RK4) trajectory for a cannon-launched tennis ball.
 */
export function simulateCannonShotTrajectoryRK4(
  config: BallCannonConfig,
  muzzleStartPos: THREE.Vector3,
  surface: 'clay' | 'grass' | 'hardcourt' | 'cyber' = 'hardcourt',
  samplesCount: number = 80,
  baseOrientation: 'north' | 'south' = 'south'
): CannonShotTrajectory {
  const muzzleVel = calculateCannonLaunchVelocity(config, baseOrientation);
  const rpm = config.spinRpm;
  const omegaMag = (Math.abs(rpm) * 2.0 * Math.PI) / 60.0;
  const fwdSign = baseOrientation === 'south' ? 1.0 : -1.0;

  // Spin vector
  let spinAxis = new THREE.Vector3(fwdSign, 0, 0);
  if (config.spinType === 'slice' || config.spinType === 'dropshot') {
    spinAxis = new THREE.Vector3(-fwdSign, 0, 0);
  } else if (config.spinType === 'kick') {
    spinAxis = new THREE.Vector3(fwdSign * 0.7, 0, fwdSign * 0.7).normalize();
  }
  const spinVector = spinAxis.multiplyScalar(omegaMag);

  const totalDuration = 1.35;
  const dt = totalDuration / samplesCount;

  let state: TennisBallState = {
    pos: muzzleStartPos.clone(),
    vel: muzzleVel.clone(),
    spin: spinVector,
    time: 0.0
  };

  const samples: TennisRK4Sample[] = [];
  samples.push({
    progress: 0.0,
    pos: state.pos.clone(),
    vel: state.vel.clone(),
    time: 0.0
  });

  const floorY = 0.065;
  let hasBounced = false;
  let bouncePos = new THREE.Vector3(0, floorY, baseOrientation === 'south' ? 6.5 : -6.5);
  let apexPos = muzzleStartPos.clone();

  for (let i = 1; i <= samplesCount; i++) {
    state = stepRK4TennisPhysics(state, dt);
    const p = i / samplesCount;

    if (state.pos.y > apexPos.y) {
      apexPos.copy(state.pos);
    }

    if (!hasBounced && state.pos.y <= floorY && p > 0.25) {
      hasBounced = true;
      state.pos.y = floorY;
      bouncePos.copy(state.pos);
      state.vel = calculateBallBounceReboundVelocity(
        state.vel,
        surface,
        config.spinType,
        Math.abs(rpm)
      );
    }

    samples.push({
      progress: p,
      pos: state.pos.clone(),
      vel: state.vel.clone(),
      time: state.time
    });
  }

  const targetPos = samples[samples.length - 1].pos.clone();

  return {
    startPos: muzzleStartPos.clone(),
    muzzleVel,
    apexPos,
    bouncePos,
    targetPos,
    duration: totalDuration,
    speedKmh: config.muzzleVelocityKmh,
    spinRpm: config.spinRpm,
    spinType: config.spinType,
    samples
  };
}

/**
 * Calculates the exact 3D position of a BallBoy delivery toss or roll at progress p in [0, 1].
 */
export function computeBallBoyDeliveryPosition(
  event: BallBoyFeedEvent,
  progress: number
): THREE.Vector3 {
  const p = THREE.MathUtils.clamp(progress, 0.0, 1.0);
  const result = new THREE.Vector3();

  if (event.feedType === 'hand_toss') {
    // Parabolic smooth air toss directly into the crane hopper opening
    result.x = THREE.MathUtils.lerp(event.startPos.x, event.targetHopperPos.x, p);
    result.z = THREE.MathUtils.lerp(event.startPos.z, event.targetHopperPos.z, p);
    const arcHeight = 1.45 * Math.sin(p * Math.PI);
    result.y = THREE.MathUtils.lerp(event.startPos.y, event.targetHopperPos.y, p) + arcHeight;
  } else {
    // Smooth ground roll across the sideline towards the crane dolly
    result.x = THREE.MathUtils.lerp(event.startPos.x, event.targetHopperPos.x, p);
    result.z = THREE.MathUtils.lerp(event.startPos.z, event.targetHopperPos.z, p);
    // Micro rolling bounce
    const microHop = Math.sin(p * Math.PI * 8.0) * 0.03 * (1.0 - p);
    result.y = 0.065 + microHop;
  }

  return result;
}

/**
 * Creates an active BallBoy feed delivery event to reload the crane hopper.
 */
export function createBallBoyFeedEvent(
  ballBoyKey: 'ballboy_south_east' | 'ballboy_south_west' | 'ballboy_north_east' | 'ballboy_north_west' | 0 | 1 | 2 | 3,
  targetHopperPos: THREE.Vector3,
  feedType: 'hand_toss' | 'ground_roll' = 'hand_toss'
): BallBoyFeedEvent {
  let startX = 6.2;
  let startZ = -14.5;
  let boyIdx: 0 | 1 | 2 | 3 = 0;

  if (ballBoyKey === 'ballboy_south_west' || ballBoyKey === 1) {
    startX = -6.2;
    startZ = -14.5;
    boyIdx = 1;
  } else if (ballBoyKey === 'ballboy_north_east' || ballBoyKey === 2) {
    startX = 6.2;
    startZ = 14.5;
    boyIdx = 2;
  } else if (ballBoyKey === 'ballboy_north_west' || ballBoyKey === 3) {
    startX = -6.2;
    startZ = 14.5;
    boyIdx = 3;
  }

  return {
    ballBoyIndex: boyIdx,
    startPos: new THREE.Vector3(startX, 0.75, startZ),
    targetHopperPos: targetHopperPos.clone(),
    feedType,
    duration: 1.25,
    progress: 0.0,
    spinType: 'topspin',
    rpm: 1200,
    isActive: true
  };
}

/**
 * Provides predefined training drill presets for autonomous practice sessions.
 */
export function getTrainingDrillConfig(preset: TrainingDrillPreset): BallCannonConfig {
  switch (preset) {
    case 'topspin_cross':
      return {
        muzzleVelocityKmh: 178,
        launchPitchDeg: 24,
        launchYawDeg: 14,
        spinRpm: 3400,
        spinType: 'topspin',
        barrelLengthM: 0.85,
        pressureBar: 8.4,
        barrelGlowIntensity: 0.75
      };
    case 'smash_overhead':
      return {
        muzzleVelocityKmh: 125,
        launchPitchDeg: 68,
        launchYawDeg: 0,
        spinRpm: 1200,
        spinType: 'slice',
        barrelLengthM: 0.85,
        pressureBar: 7.2,
        barrelGlowIntensity: 0.60
      };
    case 'backhand_laser':
      return {
        muzzleVelocityKmh: 205,
        launchPitchDeg: 16,
        launchYawDeg: -12,
        spinRpm: 1800,
        spinType: 'flat',
        barrelLengthM: 0.85,
        pressureBar: 9.6,
        barrelGlowIntensity: 0.95
      };
    case 'drop_net':
      return {
        muzzleVelocityKmh: 82,
        launchPitchDeg: 38,
        launchYawDeg: 6,
        spinRpm: 2800,
        spinType: 'dropshot',
        barrelLengthM: 0.85,
        pressureBar: 5.8,
        barrelGlowIntensity: 0.40
      };
    case 'rapid_fire_rally':
    default:
      return {
        muzzleVelocityKmh: 165,
        launchPitchDeg: 22,
        launchYawDeg: 0,
        spinRpm: 2600,
        spinType: 'topspin',
        barrelLengthM: 0.85,
        pressureBar: 8.4,
        barrelGlowIntensity: 0.80
      };
  }
}

/**
 * Enforces safety guardrails: limits velocity, elevation angles, and minimum safe floor clearance.
 */
export function clampCannonSafetyGuardrails(config: BallCannonConfig): BallCannonConfig {
  return {
    ...config,
    muzzleVelocityKmh: THREE.MathUtils.clamp(config.muzzleVelocityKmh, CANNON_MIN_VELOCITY_KMH, CANNON_MAX_VELOCITY_KMH),
    launchPitchDeg: THREE.MathUtils.clamp(config.launchPitchDeg, 10.0, 75.0),
    launchYawDeg: THREE.MathUtils.clamp(config.launchYawDeg, -35.0, 35.0),
    spinRpm: THREE.MathUtils.clamp(config.spinRpm, -4000, 4500),
    pressureBar: THREE.MathUtils.clamp(config.pressureBar, 4.0, 12.0)
  };
}

/**
 * Calculates the exact 3D pneumatic serve toss trajectory from the dolly tube muzzle
 * to the optimal racket hitting apex (Trophy Stance strike point).
 */
export function calculatePneumaticServeTossPosition(
  muzzlePos: THREE.Vector3,
  apexPos: THREE.Vector3,
  tossProgress: number // 0.0 to 1.0
): THREE.Vector3 {
  const p = THREE.MathUtils.clamp(tossProgress, 0.0, 1.0);
  const smoothP = THREE.MathUtils.smoothstep(p, 0.0, 1.0);
  
  // Parabolic launch arc under gravity
  const posX = THREE.MathUtils.lerp(muzzlePos.x, apexPos.x, smoothP);
  const posZ = THREE.MathUtils.lerp(muzzlePos.z, apexPos.z, smoothP);
  
  // Height starts at muzzle and reaches apex with initial pneumatic speed deceleration
  const arcBonus = Math.sin(p * Math.PI) * 0.25;
  const posY = THREE.MathUtils.lerp(muzzlePos.y, apexPos.y, Math.sin(p * (Math.PI / 2))) + arcBonus;

  return new THREE.Vector3(posX, posY, posZ);
}

/**
 * Calculates the exact 3D world position of a tennis ball being pneumatically sucked /
 * vacuum-accelerated forward through the top-boom transparent tube from the rear intake (z = -1.18m)
 * towards the front launch chamber (z = -3.38m) on Beam 1.
 * Speed curve & transit dynamics vary dynamically depending on the serve shot type.
 */
export function calculatePneumaticTubeSuctionPosition(
  beamWorldPos: THREE.Vector3,
  beamWorldQuat: THREE.Quaternion,
  suctionProgress: number, // 0.0 to 1.0 (raw phase 1 progress)
  serveType: string = 'flat'
): { pos: THREE.Vector3; suctionSpeedFactor: number; transitProgress: number } {
  // Tube local geometry coordinates on Beam 1:
  // Rear intake funnel: Z = -1.18m
  // Front launch chamber: Z = -3.38m
  // Height above boom pivot axis: Y = 0.38m
  const rearZ = -1.18;
  const frontZ = -3.38;
  const tubeY = 0.38;

  const rawP = THREE.MathUtils.clamp(suctionProgress, 0.0, 1.0);
  
  // Custom non-linear vacuum suction velocity profile depending on serve type:
  let transitP = rawP;
  let speedFactor = 1.0;

  const lowerType = serveType.toLowerCase();

  if (lowerType.includes('flat') || lowerType.includes('laser') || lowerType.includes('234') || lowerType.includes('power')) {
    // ⚡ Flat Power Serve (e.g. Sinner 234 km/h): High-speed rapid vacuum acceleration / snap intake
    transitP = Math.pow(rawP, 1.6);
    speedFactor = 1.8;
  } else if (lowerType.includes('kick') || lowerType.includes('topspin') || lowerType.includes('3200')) {
    // 🌪️ Heavy Kick / Topspin (e.g. Alcaraz 3200 RPM): Progressive vacuum suction ramp-up
    transitP = THREE.MathUtils.smoothstep(rawP, 0.0, 1.0);
    speedFactor = 1.3;
  } else if (lowerType.includes('slice')) {
    // 🌀 Slice / Disguised Serve: Smooth aerodynamic laminar flow glide
    transitP = Math.sin(rawP * (Math.PI / 2));
    speedFactor = 0.9;
  } else {
    // Standard controlled suction
    transitP = Math.pow(rawP, 1.2);
    speedFactor = 1.1;
  }

  // Local position inside the top-boom transparent tube
  const localZ = THREE.MathUtils.lerp(rearZ, frontZ, transitP);
  const localPos = new THREE.Vector3(0, tubeY, localZ);

  // Transform local tube position to 3D world space using the crane beam's current world transform
  const worldPos = localPos.clone().applyQuaternion(beamWorldQuat).add(beamWorldPos);

  return {
    pos: worldPos,
    suctionSpeedFactor: speedFactor,
    transitProgress: transitP
  };
}

