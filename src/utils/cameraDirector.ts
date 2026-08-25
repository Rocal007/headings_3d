import * as THREE from 'three';

/**
 * ============================================================================
 * SUPERTECHNO 50 CAMERA DIRECTOR & BROADCAST REGIE ENGINE (Agent 20)
 * Automated Cinematography, Multi-Camera Switcher, Cut Pacing & Safety Guardrails
 * ============================================================================
 */

// --- 🎥 CAMERA SAFETY GUARDRAIL CONSTANTS ---
export const MIN_CAMERA_SAFE_Y = 0.85;       // Strict floor clearance: Camera position Y must never dip below 0.85m
export const MIN_TARGET_SAFE_Y = 0.40;       // Minimum target look-at Y floor clearance (m)
export const DEFAULT_TRANSITION_LERP = 3.5;  // Default exponential dampening factor for smooth transitions
export const MIN_SHOT_DURATION_SEC = 2.4;    // Minimum shot holding time in Auto-Director mode (prevents jarring rapid cuts)
export const MAX_SHOT_DURATION_SEC = 9.0;    // Maximum shot holding time before director triggers a dynamic angle change

// --- 📺 BROADCAST & FILM CAMERA TYPES ---
export type FilmCameraPresetId =
  | 'full'        // Studio Rig Overview
  | 'cinematic'   // Closed-Loop 8-Stage Catmull-Rom Hollywood Flight Path
  | 'profile'     // Flanken-Perspektive & Ausleger-Teleskop-Sicht
  | 'top'         // Vogelperspektive / Top-Down Blueprint
  | 'head'        // Macro Close-Up auf den 3-Achs Remote Head & Linse
  | 'weight'      // Gegengewichtswagen- & Spindel-Fahrt
  | 'cable'       // Festoon-Schleppkabel-Trasse & Führungswagen
  | 'operator'    // Kranführer am Heck-Pult
  | 'desk'        // DoP & Head-Operator am Boden-Flightcase
  | 'dolly'       // Froschperspektive am Schienen-Fahrwerk
  | 'pov'         // Subjektiver Blick durch die optische Achse (Angenieux Optimo)
  | 'free';       // 100% Freier interaktiver Orbit (OrbitControls)

export type TennisBroadcastCameraId =
  | 'broadcast'         // TV-Hauptkamera (Center Court High-Angle)
  | 'broadcast_south'   // TV-Totale von hinten Süd (3/4 Sinner-Seite)
  | 'broadcast_north'   // TV-Totale von hinten Nord (3/4 Alcaraz-Seite)
  | 'net'               // Netzkanten-Nahaufnahme (Net-Cord Macro Cam)
  | 'portrait'          // Protagonisten-Portrait (Intimer Cine-Fokus auf Gesicht & Oberkörper)
  | 'ball'              // Dynamische 3D-Ballverfolgungskamera
  | 'crane1'            // Spieler 1 (Sinner) Kranspitzen-Nahaufnahme
  | 'crane2'            // Spieler 2 (Alcaraz) Kranspitzen-Nahaufnahme
  | 'umpire'            // Schiedsrichterstuhl & Entscheidungs-Perspektive
  | 'spectator'         // Tribünen-Zuschauerperspektive (Courtside View)
  | 'coach'             // Trainerbox & Emotionen
  | 'free';             // Freie interaktive Benutzer-Kamera

export type TallyState = 'off' | 'preview' | 'on_air' | 'cue';

export type CameraTransitionType =
  | 'cut'         // Hard instantaneous cut (1 Frame)
  | 'smooth_lerp' // Dynamic exponential lerp (Smooth Cinema Move)
  | 'whip_pan'    // Rapid high-speed snap pan on fast tennis action
  | 'spline_flow';// Continuous Hermite/Catmull-Rom flight path

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov?: number;
  roll?: number;
}

export interface DirectorShotInfo {
  id: FilmCameraPresetId | TennisBroadcastCameraId;
  name: string;
  desc: string;
  icon: string;
  category: 'broadcast' | 'action' | 'cinematic' | 'technical' | 'operator';
  minHoldDuration: number;
  preferredTransitions: CameraTransitionType[];
}

export interface DirectorState {
  activeCameraId: FilmCameraPresetId | TennisBroadcastCameraId;
  previewCameraId: FilmCameraPresetId | TennisBroadcastCameraId | null;
  tally: TallyState;
  shotStartTime: number;
  timeInCurrentShot: number;
  autoDirectorActive: boolean;
  directorInterval: number;
  lastEventTrigger?: string;
}

// --- ⚡ ZERO-GC SCRATCH OBJECTS FOR REALTIME FRAME LOOPS (120 FPS SAFE) ---
const _scratchOffset = new THREE.Vector3();
const _scratchAxisX = new THREE.Vector3(1, 0, 0);
const _scratchAxisY = new THREE.Vector3(0, 1, 0);
const _scratchMastWorld = new THREE.Vector3();
const _scratchHeadPos = new THREE.Vector3();
const _scratchCwPos = new THREE.Vector3();

// --- 📋 FILM CAMERA REGIE DEFINITIONEN ---
export const FILM_CAMERA_PRESETS: Record<FilmCameraPresetId, DirectorShotInfo> = {
  full: {
    id: 'full',
    name: 'Rig Overview',
    desc: 'Gesamtübersicht des Krans im Studio/Außenset',
    icon: '🏗️',
    category: 'cinematic',
    minHoldDuration: 3.5,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic Flight Path',
    desc: '360° Hollywood Catmull-Rom Rundflug (8 Keyframe-Stationen)',
    icon: '🌟',
    category: 'cinematic',
    minHoldDuration: 8.0,
    preferredTransitions: ['spline_flow']
  },
  profile: {
    id: 'profile',
    name: 'Flanken-Profil',
    desc: 'Seitenansicht & Ausleger-Teleskopauszug (11.3m)',
    icon: '📐',
    category: 'technical',
    minHoldDuration: 3.0,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  top: {
    id: 'top',
    name: 'Top-Down Blueprint',
    desc: 'Senkrechte Draufsicht von oben (Grundriss-Kinematik)',
    icon: '🗺️',
    category: 'technical',
    minHoldDuration: 2.5,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  head: {
    id: 'head',
    name: 'Macro Gyro Head',
    desc: '3-Achs Remote Head, Horizont-Nivellierung & Cine-Optik',
    icon: '🎥',
    category: 'action',
    minHoldDuration: 3.0,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  weight: {
    id: 'weight',
    name: 'Gegengewichtswagen',
    desc: 'Spindel-Schlittenfahrt & Massen-Kompensation',
    icon: '⚖️',
    category: 'technical',
    minHoldDuration: 2.8,
    preferredTransitions: ['smooth_lerp']
  },
  cable: {
    id: 'cable',
    name: 'Festoon-Kabeltrasse',
    desc: 'Schleppkabel-Dynamik & Führungswagen am Träger',
    icon: '➰',
    category: 'technical',
    minHoldDuration: 2.8,
    preferredTransitions: ['smooth_lerp']
  },
  operator: {
    id: 'operator',
    name: 'Heck-Kranführer',
    desc: 'Kranführer am Heck mit Handrädern & Steuerbügel',
    icon: '👷',
    category: 'operator',
    minHoldDuration: 3.2,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  desk: {
    id: 'desk',
    name: 'DoP Boden-Pult',
    desc: 'Head-Operator am 17" ARRI Master-Viewfinder Flightcase',
    icon: '🎛️',
    category: 'operator',
    minHoldDuration: 3.2,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  dolly: {
    id: 'dolly',
    name: 'Schienen-Froschperspektive',
    desc: 'Bodennahe Dynamik entlang der Fahrstrecke',
    icon: '🏎️',
    category: 'action',
    minHoldDuration: 2.5,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  pov: {
    id: 'pov',
    name: 'Cine Linsen-POV',
    desc: 'Subjektiver Blick durch die optische ARRI/Angenieux Achse',
    icon: '👁️',
    category: 'action',
    minHoldDuration: 4.0,
    preferredTransitions: ['cut', 'smooth_lerp']
  },
  free: {
    id: 'free',
    name: 'Freier Orbit',
    desc: 'Manuelle 3D-Kamerasteuerung via Maus/Touch',
    icon: '🔄',
    category: 'technical',
    minHoldDuration: 0.0,
    preferredTransitions: ['cut']
  }
};

// --- 🎾 TENNIS BROADCAST REGIE DEFINITIONEN ---
export const TENNIS_CAMERA_PRESETS: Record<TennisBroadcastCameraId, DirectorShotInfo> = {
  broadcast: {
    id: 'broadcast',
    name: 'Broadcast Main',
    desc: 'Klassische TV-Center-Perspektive mit Überblick über das gesamte Spielfeld',
    icon: '📺',
    category: 'broadcast',
    minHoldDuration: 3.5,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  broadcast_south: {
    id: 'broadcast_south',
    name: '3/4 Totale Süd (Sinner)',
    desc: 'Leicht erhöhte TV-Einstellung von der Seite Sinners mit Blick auf beide Spieler',
    icon: '🎥',
    category: 'broadcast',
    minHoldDuration: 3.5,
    preferredTransitions: ['cut']
  },
  broadcast_north: {
    id: 'broadcast_north',
    name: '3/4 Totale Nord (Alcaraz)',
    desc: 'Leicht erhöhte TV-Einstellung von der Seite Alcaraz mit Blick auf beide Spieler',
    icon: '🎥',
    category: 'broadcast',
    minHoldDuration: 3.5,
    preferredTransitions: ['cut']
  },
  net: {
    id: 'net',
    name: 'Netzkanten-Nahaufnahme',
    desc: 'Intimes Macro-Close-Up an der Netzkante bei Netzfehlern und Netzrollern',
    icon: '🕸️',
    category: 'action',
    minHoldDuration: 2.2,
    preferredTransitions: ['cut']
  },
  portrait: {
    id: 'portrait',
    name: 'Protagonisten-Portrait',
    desc: 'Intimes Cine-Close-Up des Hauptakteurs (Sinner / Alcaraz) vor dem Aufschlag & nach dem Punkt',
    icon: '👤',
    category: 'broadcast',
    minHoldDuration: 2.2,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  ball: {
    id: 'ball',
    name: 'Ball-Follow Tracker',
    desc: 'Dynamische 3D-Verfolgung der Ball-Trajektorie im Flug',
    icon: '⚡',
    category: 'action',
    minHoldDuration: 2.4,
    preferredTransitions: ['smooth_lerp']
  },
  crane1: {
    id: 'crane1',
    name: 'Player 1 Hero (Sinner)',
    desc: 'Nord-Grundlinien-Perspektive fokussiert auf Jannik Sinner',
    icon: '🇮🇹',
    category: 'broadcast',
    minHoldDuration: 2.8,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  crane2: {
    id: 'crane2',
    name: 'Player 2 Hero (Alcaraz)',
    desc: 'Süd-Grundlinien-Perspektive fokussiert auf Carlos Alcaraz',
    icon: '🇪🇸',
    category: 'broadcast',
    minHoldDuration: 2.8,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  umpire: {
    id: 'umpire',
    name: 'Umpire Chair',
    desc: 'Schiedsrichterstuhl-Perspektive bei Overrules & Netzkanten-Calls',
    icon: '🪑',
    category: 'technical',
    minHoldDuration: 2.5,
    preferredTransitions: ['cut', 'smooth_lerp']
  },
  spectator: {
    id: 'spectator',
    name: 'Tribünen-Atmo',
    desc: 'Courtside-Zuschauerperspektive mit Grandstand-Atmosphäre',
    icon: '🏟️',
    category: 'cinematic',
    minHoldDuration: 3.2,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  coach: {
    id: 'coach',
    name: 'Trainerbox / VIP',
    desc: 'Seiten-Perspektive auf die Spielerbox und Trainer',
    icon: '👥',
    category: 'cinematic',
    minHoldDuration: 2.8,
    preferredTransitions: ['cut', 'smooth_lerp']
  },
  free: {
    id: 'free',
    name: 'Freier Orbit',
    desc: 'Manuelle 3D-Kameraführung',
    icon: '🔄',
    category: 'technical',
    minHoldDuration: 0.0,
    preferredTransitions: ['cut']
  }
};

/**
 * Enforces strict floor clearance guardrails for camera position and look-at target.
 * Guarantees Camera Y >= 0.85m and Target Y >= 0.40m at all times.
 */
export function enforceCameraSafetyFloorLimits(
  camPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  minSafeY = MIN_CAMERA_SAFE_Y,
  minTargetY = MIN_TARGET_SAFE_Y
): void {
  if (camPos.y < minSafeY) {
    camPos.y = minSafeY;
  }
  if (targetPos.y < minTargetY) {
    targetPos.y = minTargetY;
  }
}

/**
 * Calculates exponential framerate-independent camera dampening for smooth cinematic transitions:
 * \( x_{t+1} = \text{lerp}(x_t, x_{\text{target}}, 1 - e^{-\lambda \cdot \Delta t}) \)
 */
export function dampCameraExp(
  currentPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  lambda: number,
  delta: number
): void {
  const t = 1 - Math.exp(-Math.max(0, lambda) * Math.max(0.0001, delta));
  currentPos.lerp(targetPos, t);
}

/**
 * Calculates the exact 3D camera pose (position and look-at target) for a given Film Crane Preset.
 * Zero-GC implementation using local scratch calculations.
 */
export function computeFilmCameraPose(
  mode: FilmCameraPresetId,
  kinematics: {
    dollyTrack: number;
    columnLift: number;
    basePan: number;
    boomTilt: number;
    teleExtension: number;
  },
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3
): void {
  const panRad = THREE.MathUtils.degToRad(kinematics.basePan || 0);
  const tiltRad = THREE.MathUtils.degToRad(kinematics.boomTilt || 0);
  const colH = kinematics.columnLift || 2.15;
  const dollyZ = kinematics.dollyTrack || 0;
  const ext = kinematics.teleExtension || 0;

  // Mast World Pivot
  _scratchMastWorld.set(0, colH, dollyZ);

  // Boom Tip Geometry
  const tExt = Math.max(0, Math.min(1.0, ext / 11.3));
  const tipZ = -3.34 - tExt * 11.40;
  const tipY = 0.05;
  const tipX = -0.01;

  // Local Head Position in World
  _scratchHeadPos.set(tipX, tipY, tipZ);
  _scratchHeadPos.applyAxisAngle(_scratchAxisX, tiltRad);
  _scratchHeadPos.applyAxisAngle(_scratchAxisY, panRad);
  _scratchHeadPos.add(_scratchMastWorld);

  // Local Counterweight Position in World
  const sledZ = THREE.MathUtils.lerp(-0.80, 3.28, tExt);
  _scratchCwPos.set(0, 0.15, sledZ);
  _scratchCwPos.applyAxisAngle(_scratchAxisX, tiltRad);
  _scratchCwPos.applyAxisAngle(_scratchAxisY, panRad);
  _scratchCwPos.add(_scratchMastWorld);

  switch (mode) {
    case 'profile':
      outTarget.set(0, Math.max(2.5, colH + 2.0), dollyZ - 3.5);
      outPos.set(-26.0, Math.max(4.5, colH + 4.0), dollyZ - 3.5);
      break;

    case 'top':
      outTarget.set(0, 0.8, dollyZ + 0.15);
      outPos.set(0.001, 18.5, dollyZ + 0.15);
      break;

    case 'head':
      outTarget.set(_scratchHeadPos.x, Math.max(0.6, _scratchHeadPos.y), _scratchHeadPos.z);
      _scratchOffset.set(-1.6, 0.55, 2.5).applyAxisAngle(_scratchAxisY, panRad);
      outPos.copy(_scratchHeadPos).add(_scratchOffset);
      break;

    case 'weight':
      outTarget.set(_scratchCwPos.x, Math.max(0.6, _scratchCwPos.y), _scratchCwPos.z);
      _scratchOffset.set(-2.4, 0.45, 0.8).applyAxisAngle(_scratchAxisY, panRad);
      outPos.copy(_scratchCwPos).add(_scratchOffset);
      break;

    case 'cable':
      outTarget.set(_scratchCwPos.x, Math.max(0.6, _scratchCwPos.y), _scratchCwPos.z);
      _scratchOffset.set(-3.2, 0.8, 1.8).applyAxisAngle(_scratchAxisY, panRad);
      outPos.copy(_scratchCwPos).add(_scratchOffset);
      break;

    case 'operator':
      const opOrbitRadius = 4.2;
      const opX = -opOrbitRadius * Math.sin(panRad);
      const opZ = dollyZ + opOrbitRadius * Math.cos(panRad);
      outTarget.set(opX, 1.35, opZ);
      _scratchOffset.set(-2.6, 0.7, 2.2).applyAxisAngle(_scratchAxisY, panRad);
      outPos.set(opX, 1.35, opZ).add(_scratchOffset);
      break;

    case 'desk':
      outTarget.set(3.2, 1.25, dollyZ + 0.8);
      outPos.set(5.8, 1.85, dollyZ + 2.4);
      break;

    case 'pov':
      outPos.set(tipX, tipY - 0.785, tipZ + 0.30);
      outPos.applyAxisAngle(_scratchAxisX, tiltRad);
      outPos.applyAxisAngle(_scratchAxisY, panRad);
      outPos.add(_scratchMastWorld);

      outTarget.set(tipX, tipY - 0.785, tipZ + 25.0);
      outTarget.applyAxisAngle(_scratchAxisX, tiltRad);
      outTarget.applyAxisAngle(_scratchAxisY, panRad);
      outTarget.add(_scratchMastWorld);
      break;

    case 'dolly':
      outTarget.set(0, Math.max(0.6, colH * 0.4), dollyZ + tipZ * 0.2);
      outPos.set(-4.5, 1.35, dollyZ + 4.2);
      break;

    case 'full':
    default:
      outTarget.set(0, 5.5, dollyZ - 2.0);
      outPos.set(16, 11.5, dollyZ + 17);
      break;
  }

  enforceCameraSafetyFloorLimits(outPos, outTarget);
}

/**
 * Computes the First-Person Racket POV Camera Pose (Sweet-Spot Cam)
 * Mounted directly on the active tennis crane remote head looking through carbon strings.
 */
export function computeRacketSweetSpotCameraPose(
  activeShooter: 1 | 2,
  racketWorldPos: THREE.Vector3,
  racketWorldQuat: THREE.Quaternion,
  ballWorldPos: THREE.Vector3 | null,
  outCamPos: THREE.Vector3,
  outTargetPos: THREE.Vector3
): void {
  // Forward and up vectors in world space from racket quaternion
  const forwardDir = new THREE.Vector3(0, 0, activeShooter === 1 ? 1 : -1)
    .applyQuaternion(racketWorldQuat)
    .normalize();
  const upDir = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(racketWorldQuat)
    .normalize();

  // Camera sits 55cm behind the sweet spot and 10cm above it
  outCamPos.copy(racketWorldPos)
    .sub(forwardDir.clone().multiplyScalar(0.55))
    .add(upDir.clone().multiplyScalar(0.10));

  // Look-at target: Looking through strings forward along stroke vector
  outTargetPos.copy(outCamPos).add(forwardDir.clone().multiplyScalar(10.0));
  if (ballWorldPos) {
    outTargetPos.lerp(ballWorldPos, 0.45);
  }

  enforceCameraSafetyFloorLimits(outCamPos, outTargetPos, 0.45, 0.20);
}

// --- 🎭 DYNAMIC TENNIS BROADCAST DIRECTOR VARIATION ENGINE ---
export type PreServeDirectorStyle =
  | 'ball_dribble_detail'  // 🎾 Close-Up auf das Ball-Aufprellen am Boden (Dribbel-Detail)
  | 'portrait_full_body'   // 👤 Ganzkörper-Einstellung des Aufschlägers an der Grundlinie
  | 'portrait_tight_face'  // 👤 Intimes Protagonisten-Portrait auf Kopf-/Brusthöhe (Fokus & Mimik)
  | 'receiver_ready'       // 👀 Lauernder Receiver auf der Gegenseite im Ready-Stance
  | 'baseline_hero_jib'    // 🎬 Low-Angle Grundlinien Hero Jib (Aufschläger von schräg unten)
  | 'coach_box';           // 👥 Trainerbox beobachtet die Aufschlag-Positionierung

export type PostPointDirectorStyle = 'portrait_winner' | 'portrait_loser' | 'coach_box' | 'spectator_crowd' | 'umpire_chair' | 'net_closeup';

export type RallyDirectorCameraAngle = 'broadcast' | 'broadcast_south' | 'broadcast_north';

export type PortraitAngleType = 'frontal' | 'three_quarter_left' | 'three_quarter_right' | 'low_hero' | 'high_dramatic';
export type NetCamAngleType = 'left_post_macro' | 'right_post_macro' | 'frontal_mesh' | 'low_rebound';
export type CoachAngleType = 'tight_coach' | 'two_shot_box' | 'low_angle_bench';

export interface PointDirectorPlan {
  pointId: number;
  preServeStyle: PreServeDirectorStyle;
  postPointStyle: PostPointDirectorStyle;
  rallyCameraAngle: RallyDirectorCameraAngle;
  // 🎬 Close-Up Variation Engine (Timing, Winkel, Zoom/Distanz & FOV):
  portraitAngle: PortraitAngleType;
  portraitDistance: number;      // 1.55m (Tight Close-Up) bis 2.85m (Medium Cowboy Shot)
  portraitElevation: number;     // -0.35m (Hero Low-Angle) bis +0.45m (High-Angle)
  portraitLateralOffset: number; // -1.1m (3/4 Left) bis +0.8m (3/4 Right)
  portraitFov: number;           // 35° (85mm Telephoto) bis 48° (Standard)
  netCamAngle: NetCamAngleType;
  netCamDistance: number;        // 1.5m bis 2.8m
  netCamFov: number;             // 38° bis 52°
  coachAngle: CoachAngleType;
  coachDistance: number;         // 3.8m bis 6.2m
  closeUpStage1Duration: number; // 1.9s bis 3.5s variable Hold-Dauer
}

/**
 * Generates a non-repetitive, dynamically varied TV Director Plan for each tennis point.
 * Ensures that consecutive points never use the same directorial shot combinations.
 */
export function generatePointDirectorPlan(
  pointId: number,
  server?: 1 | 2,
  lastPlan?: PointDirectorPlan | null
): PointDirectorPlan {
  const preServeStyles: PreServeDirectorStyle[] = [
    'ball_dribble_detail',
    'portrait_tight_face',
    'portrait_full_body',
    'receiver_ready',
    'baseline_hero_jib',
    'coach_box'
  ];

  const postStyles: PostPointDirectorStyle[] = [
    'portrait_winner',
    'portrait_loser',
    'coach_box',
    'spectator_crowd',
    'umpire_chair',
    'net_closeup'
  ];

  const portraitAngles: PortraitAngleType[] = ['frontal', 'three_quarter_left', 'three_quarter_right', 'low_hero', 'high_dramatic'];
  const netCamAngles: NetCamAngleType[] = ['left_post_macro', 'right_post_macro', 'frontal_mesh', 'low_rebound'];
  const coachAngles: CoachAngleType[] = ['tight_coach', 'two_shot_box', 'low_angle_bench'];

  // Filter out the last point's styles to guarantee high visual variety
  const availPre = preServeStyles.filter(s => s !== lastPlan?.preServeStyle);
  const availPost = postStyles.filter(s => s !== lastPlan?.postPointStyle);
  const availPortrait = portraitAngles.filter(s => s !== lastPlan?.portraitAngle);

  const preServeStyle = availPre[Math.floor(Math.random() * availPre.length)] || 'portrait_tight_face';
  const postPointStyle = availPost[Math.floor(Math.random() * availPost.length)] || 'portrait_winner';
  const portraitAngle = availPortrait[Math.floor(Math.random() * availPortrait.length)] || 'three_quarter_left';
  const netCamAngle = netCamAngles[Math.floor(Math.random() * netCamAngles.length)];
  const coachAngle = coachAngles[Math.floor(Math.random() * coachAngles.length)];

  // 🎾 Dynamische Auswahl der Totale für den Ballwechsel (55% Center Gantry, 45% Totale von hinten Süd/Nord)
  const rallyRoll = Math.random();
  let rallyCameraAngle: RallyDirectorCameraAngle = 'broadcast';
  if (rallyRoll < 0.28) {
    rallyCameraAngle = server === 2 ? 'broadcast_north' : 'broadcast_south'; // Totale von hinten (Aufschläger-Rücken)
  } else if (rallyRoll < 0.45) {
    rallyCameraAngle = server === 2 ? 'broadcast_south' : 'broadcast_north'; // Totale von hinten (Rückschläger-Rücken)
  } else {
    rallyCameraAngle = 'broadcast'; // Klassische Seitentotale (Wimbledon High-Centre Gantry)
  }

  // Nicht 2x hintereinander exakt die gleiche Totale von hinten erzwingen
  if (lastPlan && lastPlan.rallyCameraAngle !== 'broadcast' && rallyCameraAngle === lastPlan.rallyCameraAngle) {
    rallyCameraAngle = 'broadcast';
  }

  // 🎬 Zufällige Zoom-, Distanz-, Elevations- und FOV-Variationen für Nahaufnahmen:
  let portraitDistance = 2.10;
  let portraitElevation = 0.05;
  let portraitFov = 44;
  let portraitLateralOffset = -0.68;

  switch (portraitAngle) {
    case 'frontal':
      portraitDistance = 1.65 + Math.random() * 0.45; // 1.65m - 2.10m (Intimes Frontal-Close-Up)
      portraitElevation = 0.02 + Math.random() * 0.10;
      portraitFov = 38 + Math.random() * 5; // 38° - 43° Telephoto-Crop
      portraitLateralOffset = -0.10 + (Math.random() - 0.5) * 0.20;
      break;
    case 'three_quarter_left':
      portraitDistance = 1.95 + Math.random() * 0.65; // 1.95m - 2.60m
      portraitElevation = 0.08 + Math.random() * 0.18;
      portraitFov = 42 + Math.random() * 5;
      portraitLateralOffset = -0.82 - Math.random() * 0.30; // Versetzt nach links
      break;
    case 'three_quarter_right':
      portraitDistance = 1.85 + Math.random() * 0.60;
      portraitElevation = 0.06 + Math.random() * 0.16;
      portraitFov = 40 + Math.random() * 5;
      portraitLateralOffset = 0.45 + Math.random() * 0.35; // Versetzt nach rechts
      break;
    case 'low_hero':
      portraitDistance = 1.70 + Math.random() * 0.55;
      portraitElevation = -0.28 - Math.random() * 0.20; // Hero-Untersicht von schräg unten
      portraitFov = 46 + Math.random() * 5;
      portraitLateralOffset = -0.60 - Math.random() * 0.25;
      break;
    case 'high_dramatic':
      portraitDistance = 2.20 + Math.random() * 0.65;
      portraitElevation = 0.40 + Math.random() * 0.22; // Dramatische Aufsicht von oben
      portraitFov = 39 + Math.random() * 5;
      portraitLateralOffset = -0.45 + (Math.random() - 0.5) * 0.35;
      break;
  }

  const netCamDistance = 1.65 + Math.random() * 0.85; // 1.65m - 2.50m
  const netCamFov = 40 + Math.random() * 8;
  const coachDistance = 4.2 + Math.random() * 1.6;
  const closeUpStage1Duration = 2.0 + Math.random() * 1.4; // 2.0s - 3.4s variable Hold-Dauer

  return {
    pointId,
    preServeStyle,
    postPointStyle,
    rallyCameraAngle,
    portraitAngle,
    portraitDistance,
    portraitElevation,
    portraitLateralOffset,
    portraitFov,
    netCamAngle,
    netCamDistance,
    netCamFov,
    coachAngle,
    coachDistance,
    closeUpStage1Duration
  };
}

export interface DirectorCutDecision {
  targetCam: TennisBroadcastCameraId;
  label: string;
  reason: string;
}

/**
 * Evaluates the live dynamic director decision with authentic Grand Slam / Wimbledon BBC TV principles:
 * 1. LIVE RALLY INVARIANT: During active ball exchanges, the camera ALWAYS remains in 'broadcast' (High-Centre Gantry)
 *    so the user sees 100% of the rally, both players, ball trajectory, and tactical play.
 * 2. PRE-SERVE PHASE: Varied cinematic setups (Ball Dribble Close-Up, Full Body, Tight Face, Receiver Stance, Coach Box).
 * 3. POST-POINT PHASE: Multi-stage emotional sequence (Winner Fist pump / Loser Frust, Coach Box, Umpire Score Calls).
 */
export function evaluateDynamicTennisDirectorDecision(
  plan: PointDirectorPlan,
  state: {
    shot: {
      isServe: boolean;
      servePhase: number;
      serveReadyFraction?: number;
      serveBounceCount?: number;
      isSmash: boolean;
      shotType: string;
      speedKmh?: number;
      volleyKind?: string;
      isLob?: boolean;
      isNetError?: boolean;
      isOutError?: boolean;
      isNetCord?: boolean;
      isFault?: boolean;
      netHeight?: number;
      shooter: 1 | 2;
      progress: number;
    };
    matchScore: {
      p1Points: number;
      p2Points: number;
      p1Games: number;
      p2Games: number;
      isTiebreak: boolean;
      server: 1 | 2;
    };
    celebrationTimer: number;
    celebrationTotalDuration: number;
    celebrationWinner: 1 | 2;
    activeEmotionP1?: string;
    activeEmotionP2?: string;
    sideChangeTimer: number;
    sideChangeTotalDuration?: number;
    showcaseTimer: number;
    rallyCount: number;
    directorShotTimer: number;
  }
): DirectorCutDecision {
  const {
    shot,
    matchScore,
    celebrationTimer,
    celebrationTotalDuration,
    celebrationWinner,
    activeEmotionP1,
    activeEmotionP2,
    sideChangeTimer,
    sideChangeTotalDuration,
    showcaseTimer,
    rallyCount
  } = state;

  const { p1Points, p2Points, server } = matchScore;
  const isBreakPoint = (p1Points === 45 || (p1Points === 40 && p2Points <= 30 && server === 2)) ||
                       (p2Points === 45 || (p2Points === 40 && p1Points <= 30 && server === 1));

  // 1. 🔄 SEITENWECHSEL / SHOWCASE (CHANGE OF ENDS)
  if (sideChangeTimer > 0) {
    const totalSideDur = Math.max(6.0, sideChangeTotalDuration || 8.5);
    const elapsedSide = totalSideDur - sideChangeTimer;

    if (elapsedSide < totalSideDur * 0.55) {
      return {
        targetCam: 'spectator',
        label: '🏟️ Centre Court Seitenwechsel',
        reason: 'Wimbledon Seitenwechsel • AELTC Centre Court Atmosphäre'
      };
    } else {
      return {
        targetCam: 'umpire',
        label: '🪑 Umpire Chair Seitenwechsel',
        reason: 'Schiedsrichterstuhl-Blick auf die Netzpassage & Einparken'
      };
    }
  }

  if (showcaseTimer > 0) {
    const isWinnerP1 = celebrationWinner === 1;
    return {
      targetCam: isWinnerP1 ? 'crane1' : 'crane2',
      label: isWinnerP1 ? '🇮🇹 Sinner Triumph' : '🇪🇸 Alcaraz Triumph',
      reason: 'Wimbledon Game/Satzgewinn • 11.3m Ausleger-Jubel'
    };
  }

  // 2. 👑 MULTI-STAGE EMOTIONALE REGIE-SEQUENZ (NACH DEM BALLWECHSEL)
  if (celebrationTimer > 0) {
    const winner = celebrationWinner || 1;
    const loser = winner === 1 ? 2 : 1;
    const winnerName = winner === 1 ? 'Jannik Sinner 🇮🇹' : 'Carlos Alcaraz 🇪🇸';
    const loserName = loser === 1 ? 'Jannik Sinner 🇮🇹' : 'Carlos Alcaraz 🇪🇸';
    const totalPause = Math.max(4.5, celebrationTotalDuration || 6.0);
    const elapsed = totalPause - celebrationTimer; // Sekunden seit dem Punktende
    const winnerEmotion = winner === 1 ? activeEmotionP1 : activeEmotionP2;
    const loserEmotion = loser === 1 ? activeEmotionP1 : activeEmotionP2;

    // 🎭 STUFE 1: UNMITTELBARE SIEGER- / VERLIERER-EMOTION (Variable Dauer: 1.9s bis 3.5s)
    const stage1Dur = plan.closeUpStage1Duration || 2.8;
    if (elapsed < stage1Dur) {
      // 🕸️ GELEGENTLICHES NETZKANTEN-CLOSE-UP BEI NETZFEHLERN / NETZROLLERN
      const isNetBall = shot.isNetError || shot.isNetCord || (shot.isServe && shot.isFault && (shot.netHeight ?? 1.0) <= 1.0);
      if (isNetBall && plan.postPointStyle === 'net_closeup') {
        return {
          targetCam: 'net',
          label: '🕸️ NETZKANTEN-NAHAUFNAHME',
          reason: 'Macro-Close-Up an der Netzkante • Ball trifft das Netzband & rollt ab'
        };
      }

      if (winnerEmotion === 'ear_cup_celebration') {
        return {
          targetCam: 'portrait',
          label: '🔥 ¡VAMOS! ALCARAZ',
          reason: '34° Faustpumpen & Ohr-Geste zu den tobenden Rängen 🇪🇸'
        };
      } else if (winnerEmotion === 'steely_chest_thump') {
        return {
          targetCam: 'portrait',
          label: '❄️ ICE-FIST: SINNER',
          reason: 'Stoizistisches Brustklopfen & laserfokussiertes Nicken 🇮🇹'
        };
      } else if (winnerEmotion === 'apology_wave') {
        return {
          targetCam: 'portrait',
          label: '🙏 NETZROLLER-ENTSCHULDIGUNG',
          reason: 'Traditionelle Wimbledon Apology Wave nach glücklichem Ball'
        };
      } else if (winnerEmotion === 'finger_wag_winner') {
        return {
          targetCam: 'portrait',
          label: '☝️ MAGIC WINNER',
          reason: 'Erleichtertes Lächeln & Zeigefinger-Geste nach Zauberschlag'
        };
      } else if (loserEmotion === 'umpire_challenge_furious' || loserEmotion === 'rage_racket_slam_fake') {
        return {
          targetCam: 'portrait',
          label: `😤 ${loserName} Frust`,
          reason: `Ungläubiger Blick zum Abdruck & Frust-Reaktion`
        };
      } else if (loserEmotion === 'blown_tire_exhaustion') {
        return {
          targetCam: 'portrait',
          label: '💨 PULS 195 BPM ERSCHÖPFUNG',
          reason: 'Hände auf den Knien nach epischem Marathon-Ballwechsel'
        };
      } else {
        return {
          targetCam: 'portrait',
          label: `👑 ${winnerName} Jubel`,
          reason: `Protagonisten-Portrait: ${winnerName} feiert den Punkt`
        };
      }
    }

    // 👥 STUFE 2: TRAINERBOX, GEGNER-REAKTION ODER SCHIEDSRICHTER (3.2s bis ca. 6.0s)
    if (elapsed < 6.0) {
      if (isBreakPoint || winnerEmotion === 'ear_cup_celebration' || winnerEmotion === 'steely_chest_thump') {
        return {
          targetCam: 'coach',
          label: '👥 PLAYER BOX APPLAUS',
          reason: 'Trainer (Darren Cahill / Simone Vagnozzi / Ferrero) steht auf & applaudiert'
        };
      } else if (loserEmotion === 'umpire_challenge_furious') {
        return {
          targetCam: 'umpire',
          label: '🪑 CHAIR UMPIRE CALL',
          reason: 'Schiedsrichter prüft die Netzkante / Linie & bestätigt den Score'
        };
      } else if (winnerEmotion === 'clapping_opponent') {
        return {
          targetCam: 'coach',
          label: '👥 TRAINERBOX FEEDBACK',
          reason: 'Trainerteam nickt anerkennend nach spektakulärem Ballwechsel'
        };
      } else {
        return {
          targetCam: loser === 1 ? 'crane1' : 'crane2',
          label: `😤 ${loserName} Frust-Reset`,
          reason: `${loserName} schüttelt den Kopf, wischt den Schweiß ab & sammelt sich`
        };
      }
    }

    // 🏟️ STUFE 3: CENTRE COURT KULISSE & GRANDSTAND (6.0s bis ca. totalPause - 2.5s)
    if (elapsed < totalPause - 2.5) {
      return {
        targetCam: 'spectator',
        label: '🏟️ CENTRE COURT ATMOSPHÄRE',
        reason: 'Standing Ovations & Beifall im Wimbledon Centre Court'
      };
    }

    // 👤 STUFE 4: AUFSCHLAG-RESET & VORBEREITUNG (letzte 2.5 Sekunden der Pause)
    const nextServer = winner;
    const nextServerName = nextServer === 1 ? 'Jannik Sinner 🇮🇹' : 'Carlos Alcaraz 🇪🇸';
    return {
      targetCam: 'portrait',
      label: `👤 ${nextServerName} Protagonist`,
      reason: `Protagonisten-Portrait: ${nextServerName} tritt an die Grundlinie`
    };
  }

  // 3. 🎾 PRE-SERVE PHASE: VARIENREICHE REGIE-EINSTELLUNGEN VOR DEM AUFSCHLAG
  // Solange der Spieler sich an der Grundlinie vorbereitet & den Ball dribbelt (shot.isServe && shot.progress < readyFraction):
  const isServing = shot.isServe;
  const readyFraction = shot.serveReadyFraction ?? 0.44;
  const isPreServePreparation = isServing && shot.progress < readyFraction;

  if (isPreServePreparation) {
    const srv = shot.shooter;
    const rec = srv === 1 ? 2 : 1;
    const srvName = srv === 1 ? 'Jannik Sinner 🇮🇹' : 'Carlos Alcaraz 🇪🇸';
    const recName = rec === 1 ? 'Jannik Sinner 🇮🇹' : 'Carlos Alcaraz 🇪🇸';
    const bounceCount = shot.serveBounceCount ?? (srv === 1 ? 5 : 6);
    const preProgress = shot.progress / readyFraction; // 0.0 bis 1.0 innerhalb der Konzentrationsphase

    // Bei Breakball: Spannungs-Cut zwischen Aufschläger und Receiver
    if (isBreakPoint) {
      if (preProgress < 0.50) {
        return {
          targetCam: 'portrait',
          label: `⚡ BREAKBALL: ${srvName}`,
          reason: `Protagonisten-Portrait: ${srvName} hochkonzentriert bei Breakball (${bounceCount} Dribbles)`
        };
      } else {
        return {
          targetCam: rec === 1 ? 'crane1' : 'crane2',
          label: `👀 BREAK-CHANCE: ${recName}`,
          reason: `${recName} in aggressiver Return-Antizipation`
        };
      }
    }

    switch (plan.preServeStyle) {
      case 'ball_dribble_detail':
        // 🎾 DETAIL: Nahaufnahme auf das Aufprellen des Tennisballs am Boden
        if (preProgress < 0.65) {
          return {
            targetCam: 'ball',
            label: '🎾 Ball-Aufprellen Detail',
            reason: `Makro-Close-Up: ${srvName} prellt den Ball auf den Boden (${bounceCount} Dribbles)`
          };
        } else {
          return {
            targetCam: 'portrait',
            label: `👤 ${srvName} Fokus`,
            reason: `Protagonisten-Portrait: ${srvName} schaut zum Zielfeld`
          };
        }

      case 'portrait_full_body':
        // 👤 GANZKÖRPER: Volle Statur des Aufschlägers an der Grundlinie
        return {
          targetCam: srv === 1 ? 'crane1' : 'crane2',
          label: `👤 ${srvName} Ganzkörper`,
          reason: `Volle Grundlinien-Präsenz & Haltung von ${srvName}`
        };

      case 'receiver_ready':
        // 👀 RECEIVER: Lauernder Rückschläger in Ready-Position
        return {
          targetCam: rec === 1 ? 'crane1' : 'crane2',
          label: `👀 ${recName} Return-Fokus`,
          reason: `${recName} in federnder Lauerstellung auf den Aufschlag`
        };

      case 'baseline_hero_jib':
        // 🎬 BASELINE HERO: Low-Angle-Untersicht von der Grundlinie
        return {
          targetCam: srv === 1 ? 'crane1' : 'crane2',
          label: '🎬 Baseline Hero Jib',
          reason: `Grundlinien-Perspektive mit Centre Court Zuschauerrängen`
        };

      case 'coach_box':
        // 👥 TRAINERBOX: Coach beobachtet das Setup
        if (preProgress < 0.45) {
          return {
            targetCam: 'coach',
            label: '📋 Trainerbox Fokus',
            reason: 'Trainerteam beobachtet die Aufschlag-Positionierung'
          };
        } else {
          return {
            targetCam: 'portrait',
            label: `👤 ${srvName} Protagonist`,
            reason: `Protagonisten-Portrait: ${srvName} vor dem Aufwurf`
          };
        }

      case 'portrait_tight_face':
      default:
        // 👤 PROTAGONISTEN-PORTRAIT: Intimes Brust-/Kopf-Portrait
        return {
          targetCam: 'portrait',
          label: `👤 ${srvName} Protagonist`,
          reason: `Protagonisten-Portrait: ${srvName} fokussiert & dribbelt den Ball (${bounceCount} Dribbles)`
        };
    }
  }

  // 4. 📺 DER AUFSCHLAG & LIVE-BALLWECHSEL (AB BALLWURF & BALLFLUG)
  // Sobald der Ballwurf / die Aufschlag-Bewegung beginnt (shot.isServe && shot.progress >= readyFraction)
  // sowie während des gesamten anschließenden Ballwechsels:
  // ➜ Variiert dynamisch zwischen:
  //    1. 'broadcast' (Center Court High-Centre Gantry)
  //    2. 'broadcast_south' (Totale von hinten Süd / End-to-End hinter Süd-Grundlinie)
  //    3. 'broadcast_north' (Totale von hinten Nord / End-to-End hinter Nord-Grundlinie)
  const rallyCam = plan.rallyCameraAngle || 'broadcast';

  if (rallyCam === 'broadcast_south') {
    return {
      targetCam: 'broadcast_south',
      label: '🎥 3/4 Totale Süd (Sinner)',
      reason: isServing
        ? '🎾 Aufschlag-Perspektive von Sinner-Seite • Volle Sicht auf beide Spieler'
        : `Live-Ballwechsel von Sinner-Seite (${rallyCount > 0 ? `${rallyCount}. Schlag` : 'Ball im Spiel'}) • Beide Spieler im Blick`
    };
  } else if (rallyCam === 'broadcast_north') {
    return {
      targetCam: 'broadcast_north',
      label: '🎥 3/4 Totale Nord (Alcaraz)',
      reason: isServing
        ? '🎾 Aufschlag-Perspektive von Alcaraz-Seite • Volle Sicht auf beide Spieler'
        : `Live-Ballwechsel von Alcaraz-Seite (${rallyCount > 0 ? `${rallyCount}. Schlag` : 'Ball im Spiel'}) • Beide Spieler im Blick`
    };
  } else {
    return {
      targetCam: 'broadcast',
      label: '📺 High-Centre Gantry',
      reason: isServing 
        ? `🎾 Aufschlag-Bewegung & Ballflug • Volle Spielfeld-Sicht`
        : `Live-Ballwechsel (${rallyCount > 0 ? `${rallyCount}. Schlag` : 'Ball im Spiel'}) • Volle Übersicht`
    };
  }
}

/**
 * 180° Broadcast Action Line Validator:
 * Ensures all automated cuts stay on the primary broadcasting side of the court
 * to prevent jarring spatial disorientation (Achsensprung).
 */
export function validate180DegreeAxis(
  cameraPosition: THREE.Vector3,
  courtAxisSide: 'west' | 'east' = 'west'
): boolean {
  // For standard west-side broadcast layout, Camera X must remain <= -1.0m
  if (courtAxisSide === 'west' && cameraPosition.x > -1.0) {
    return false;
  }
  if (courtAxisSide === 'east' && cameraPosition.x < 1.0) {
    return false;
  }
  return true;
}

/**
 * Aspect Ratio & Safe Area Framing Guide Definitions for Director Viewfinder HUD
 */
/**
 * Aspect Ratio & Safe Area Framing Guide Definitions for Director Viewfinder HUD
 */
export const CINE_FRAMING_GUIDES = {
  anamorphic_239: { ratio: 2.39, name: '2.39:1 CinemaScope', safeArea: 0.90 },
  academy_185: { ratio: 1.85, name: '1.85:1 Flat Academy', safeArea: 0.90 },
  broadcast_169: { ratio: 16 / 9, name: '16:9 UHD Broadcast', safeArea: 0.92 },
  social_916: { ratio: 9 / 16, name: '9:16 Mobile Story/Reels', safeArea: 0.85 }
};

// ============================================================================
// 🚚 TRUCK CAMERA DIRECTOR & CINEMATOGRAPHY ENGINE (Agent 20 / 22)
// ============================================================================

export type TruckCameraPresetId =
  | 'free'          // Freier Orbit (User OrbitControls)
  | 'follow'        // Dynamische 3rd-Person Verfolgerkamera (Chase-Cam)
  | 'cockpit'       // Cockpit First-Person Sicht durch die Windschutzscheibe
  | 'side_mirror'   // Rückspiegel-Blick entlang der Fahrzeugflanke
  | 'wheel'         // Radkasten- & Lenkungs-Action-Cam (Tiefe Froschperspektive)
  | 'tailgate'      // Heck- & Ladebordwand-Fokus (Frachtraum & Heckleuchten)
  | 'front_hero'    // Front Low-Angle Hero-Perspektive
  | 'drone'         // Vogelperspektive / Drone Overhead
  | 'cinematic'     // Hollywood Catmull-Rom Rundflug
  | 'auto_director';// Vollautomatischer intelligenter TV-Schnitt

export const TRUCK_CAMERA_PRESETS: Record<TruckCameraPresetId, DirectorShotInfo> = {
  free: {
    id: 'free' as any,
    name: 'Freier Orbit',
    desc: 'Freies Drehen, Zoomen und Schwenken mit der Maus',
    icon: '🖱️',
    category: 'operator',
    minHoldDuration: 0,
    preferredTransitions: ['smooth_lerp']
  },
  follow: {
    id: 'follow' as any,
    name: 'Verfolger (Chase-Cam)',
    desc: 'Dynamische 3rd-Person Kamera hinter dem fahrenden LKW',
    icon: '🚘',
    category: 'broadcast',
    minHoldDuration: 3.0,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  cockpit: {
    id: 'cockpit' as any,
    name: 'Fahrerhaus (Cockpit)',
    desc: 'First-Person Blick vom Fahrersitz über Armaturenbrett & Straße',
    icon: '💺',
    category: 'action',
    minHoldDuration: 3.5,
    preferredTransitions: ['cut', 'smooth_lerp']
  },
  side_mirror: {
    id: 'side_mirror' as any,
    name: 'Rückspiegel (Flanke)',
    desc: 'Blick vom Außenspiegel nach hinten entlang des Kofferaufbaus',
    icon: '🪞',
    category: 'cinematic',
    minHoldDuration: 3.0,
    preferredTransitions: ['cut', 'smooth_lerp']
  },
  wheel: {
    id: 'wheel' as any,
    name: 'Radkasten Action-Cam',
    desc: 'Tiefe Froschperspektive auf das einlenkende Vorderrad',
    icon: '🛞',
    category: 'action',
    minHoldDuration: 2.5,
    preferredTransitions: ['cut', 'whip_pan']
  },
  tailgate: {
    id: 'tailgate' as any,
    name: 'Heck & Ladebordwand',
    desc: 'Fokus auf Heckleuchten, Ladebordwand und Frachtraum',
    icon: '📦',
    category: 'technical',
    minHoldDuration: 3.0,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  front_hero: {
    id: 'front_hero' as any,
    name: 'Front Hero (Low-Angle)',
    desc: 'Monumentale Froschperspektive von vorne auf Grill & Scheinwerfer',
    icon: '🌟',
    category: 'cinematic',
    minHoldDuration: 3.0,
    preferredTransitions: ['smooth_lerp', 'cut']
  },
  drone: {
    id: 'drone' as any,
    name: 'Drohnen-Übersicht',
    desc: 'Weite 45° Vogelperspektive von schräg oben',
    icon: '🛸',
    category: 'broadcast',
    minHoldDuration: 4.0,
    preferredTransitions: ['smooth_lerp']
  },
  cinematic: {
    id: 'cinematic' as any,
    name: 'Hollywood Rundflug',
    desc: 'Fließender kontinuierlicher 360° Kamera-Flug um den LKW',
    icon: '🎬',
    category: 'cinematic',
    minHoldDuration: 6.0,
    preferredTransitions: ['spline_flow']
  },
  auto_director: {
    id: 'auto_director' as any,
    name: 'Live Auto-Regie',
    desc: 'Intelligenter automatischer TV-Schnitt basierend auf Fahrdynamik',
    icon: '📡',
    category: 'broadcast',
    minHoldDuration: 3.0,
    preferredTransitions: ['cut', 'smooth_lerp']
  }
};

// Reusable scratch objects for zero GC in truck camera calculations (Säule 1.1)
const _tTruckPos = new THREE.Vector3();
const _tCamPos = new THREE.Vector3();
const _tCamTgt = new THREE.Vector3();
const _tPoseResult = { position: _tCamPos, target: _tCamTgt, fov: 48 };

/**
 * Calculates real-time 3D Camera & LookAt poses for the MAN TGL Truck (Zero-GC)
 */
export function calculateTruckCameraPose(
  presetId: TruckCameraPresetId,
  truckWorldPos: { x: number; y: number; z: number },
  heading: number,
  time: number
): { position: THREE.Vector3; target: THREE.Vector3; fov: number } {
  _tTruckPos.set(truckWorldPos.x, truckWorldPos.y, truckWorldPos.z);
  
  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);

  // Helper to transform local truck offset [lx, ly, lz] into target Vector3 without allocation
  const setLocalToWorld = (target: THREE.Vector3, lx: number, ly: number, lz: number): void => {
    // Local: +X is right, +Y is up, +Z is forward (cab direction)
    const wx = _tTruckPos.x + (lx * cosH + lz * sinH);
    const wy = _tTruckPos.y + ly;
    const wz = _tTruckPos.z + (-lx * sinH + lz * cosH);
    target.set(wx, wy, wz);
  };

  switch (presetId) {
    case 'follow': {
      // Behind the truck (Z = -10.5m), elevated (Y = 3.6m)
      setLocalToWorld(_tCamPos, 0, 3.6, -10.5);
      setLocalToWorld(_tCamTgt, 0, 1.8, 1.5);
      _tPoseResult.fov = 48;
      return _tPoseResult;
    }

    case 'cockpit': {
      // Driver's eye view: X = 0.55m (left side in Europe), Y = 2.35m, Z = 3.10m
      setLocalToWorld(_tCamPos, 0.55, 2.35, 3.10);
      setLocalToWorld(_tCamTgt, 0.55, 1.95, 35.0); // Looking far down the road
      _tPoseResult.fov = 62;
      return _tPoseResult;
    }

    case 'side_mirror': {
      // Looking back from outer left mirror
      setLocalToWorld(_tCamPos, 1.35, 2.30, 4.10);
      setLocalToWorld(_tCamTgt, 1.15, 1.20, -12.0); // Looking back along the body
      _tPoseResult.fov = 52;
      return _tPoseResult;
    }

    case 'wheel': {
      // Low angle beside front right wheel
      setLocalToWorld(_tCamPos, 1.65, 0.50, 3.60);
      setLocalToWorld(_tCamTgt, 0.80, 0.45, 3.20);
      _tPoseResult.fov = 58;
      return _tPoseResult;
    }

    case 'tailgate': {
      // Focused on rear loading lift
      setLocalToWorld(_tCamPos, 0, 1.6, -9.5);
      setLocalToWorld(_tCamTgt, 0, 1.2, -5.2);
      _tPoseResult.fov = 46;
      return _tPoseResult;
    }

    case 'front_hero': {
      // Low front angle facing the truck
      setLocalToWorld(_tCamPos, 2.4, 0.8, 8.8);
      setLocalToWorld(_tCamTgt, 0, 1.6, 3.5);
      _tPoseResult.fov = 44;
      return _tPoseResult;
    }

    case 'drone': {
      // Overhead high-angle drone
      setLocalToWorld(_tCamPos, 11.0, 15.0, 12.0);
      setLocalToWorld(_tCamTgt, 0, 1.5, 0);
      _tPoseResult.fov = 40;
      return _tPoseResult;
    }

    case 'cinematic': {
      // Smooth dynamic 360° circular trajectory around the truck
      const orbitR = 14.0;
      const angle = time * 0.25;
      const ox = Math.cos(angle) * orbitR;
      const oz = Math.sin(angle) * orbitR;
      const oy = 2.8 + Math.sin(time * 0.4) * 1.5;
      setLocalToWorld(_tCamPos, ox, oy, oz);
      setLocalToWorld(_tCamTgt, 0, 1.6, 0);
      _tPoseResult.fov = 45;
      return _tPoseResult;
    }

    case 'free':
    default: {
      // Free orbit around the truck center
      _tCamPos.set(_tTruckPos.x + 16, _tTruckPos.y + 6, _tTruckPos.z + 18);
      _tCamTgt.set(_tTruckPos.x, _tTruckPos.y + 1.8, _tTruckPos.z);
      _tPoseResult.fov = 45;
      return _tPoseResult;
    }
  }
}

/**
 * Intelligent Auto-Director Cut Engine for the Truck
 */
export function evaluateAutoDirectorTruckCut(
  currentCam: TruckCameraPresetId,
  timeInCurrentShot: number,
  speedKmh: number,
  steerDeg: number,
  isTailgateActive: boolean
): { nextCam: TruckCameraPresetId; reason: string } {
  // 1. High-Priority Event: Tailgate / Platform Action
  if (isTailgateActive && currentCam !== 'tailgate') {
    return {
      nextCam: 'tailgate',
      reason: '📦 Ladebordwand-Aktivität erkannt • Automatischer Heck-Fokus'
    };
  }

  // 2. Minimum hold duration check (prevent jarring rapid cutting)
  if (timeInCurrentShot < 3.8) {
    return { nextCam: currentCam, reason: 'Kamera-Haltedauer aktiv' };
  }

  // 3. Dynamic Steering Curve Action: Cut to Wheel Cam or Side Mirror
  if (Math.abs(steerDeg) > 12.0) {
    const curveCams: TruckCameraPresetId[] = ['wheel', 'side_mirror', 'front_hero'];
    const filtered = curveCams.filter(c => c !== currentCam);
    const chosen = filtered[Math.floor(Math.random() * filtered.length)];
    return {
      nextCam: chosen,
      reason: `🌀 Kurvenfahrt (${Math.abs(steerDeg).toFixed(1)}° Lenkeinschlag) • Dynamische Action-Perspektive`
    };
  }

  // 4. High-Speed Cruising: Alternate between Follow, Cockpit, Front Hero, and Drone
  if (speedKmh > 20.0) {
    const cruiseCams: TruckCameraPresetId[] = ['follow', 'cockpit', 'front_hero', 'drone', 'cinematic'];
    const filtered = cruiseCams.filter(c => c !== currentCam);
    const chosen = filtered[Math.floor(Math.random() * filtered.length)];
    return {
      nextCam: chosen,
      reason: `🚀 Schnelle Geradeausfahrt (${speedKmh.toFixed(0)} km/h) • Filmreifer Regie-Schnitt`
    };
  }

  // 5. Default Periodic Rotation
  const defaultCams: TruckCameraPresetId[] = ['follow', 'front_hero', 'cinematic', 'side_mirror'];
  const filtered = defaultCams.filter(c => c !== currentCam);
  const chosen = filtered[Math.floor(Math.random() * filtered.length)];
  return {
    nextCam: chosen,
    reason: '🎬 Periodischer TV-Broadcast-Perspektivenwechsel'
  };
}
