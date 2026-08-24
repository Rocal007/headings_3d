import * as THREE from 'three';

/**
 * ============================================================================
 * SUPERTECHNO 50 TENNIS EMOTIONS & PSYCHOLOGY ENGINE (Agent 18: tennis_emotions)
 * Player Psychology, Pre-Serve Rituals, Signature Celebrations, Loser Reactions,
 * Crowd Resonance & Umpire Interaction Dynamics
 * ============================================================================
 */

export type TennisPlayerId = 1 | 2; // 1 = Jannik Sinner 🇮🇹, 2 = Carlos Alcaraz 🇪🇸

export type PlayerEmotionalState = 
  | 'idle_ready'              // Federnder Ready-Stance vor dem Ballwechsel
  | 'serve_ritual'            // Ball-Dribbeln, Fokussierung & Schlägerjustierung
  | 'celebrating_winner'      // Klassischer Faustballen-Impuls & Nicken
  | 'celebrating_game'        // Spielgewinn / Break / Satzgewinn (11.3m Ausleger-Show)
  | 'ear_cup_celebration'     // 👂 Alcaraz Trademark "Make Noise" Hand/Schläger ans Ohr
  | 'finger_wag_winner'       // ☝️ Zeigefinger-Schwung nach unmöglichem Passierball
  | 'steely_chest_thump'      // ❄️ Sinner stoischer Faustschlag auf die Brust vor Big Points
  | 'apology_wave'            // 🙏 Hand/Schläger-Hebe-Geste nach Netzroller
  | 'clapping_opponent'       // 👏 Respektvoller Schläger-Applaus (Bespannungsklopfen)
  | 'shoe_clay_tap'           // 👟 Schläger an Tennisschuhe klopfen (Sohlen-Ausklopfen)
  | 'blown_tire_exhaustion'   // 💨 Erschöpfung nach ≥10 Schläge Marathon ("Hands on knees")
  | 'rage_racket_slam_fake'   // 😡 Frust-Smash Andeutung bei vergebenem Breakball
  | 'umpire_challenge_furious'// 🔍 Schiedsrichter-Diskussion / Ballabdruck-Prüfung
  | 'disappointed_error'      // Kopfschütteln & Blick zu den Scheinwerfern
  | 'umpire_inquiry'          // Fragender Blick zum Schiedsrichter
  | 'towel_routine';          // Gang zur Handtuchbox & Schweißabwischen

export interface PlayerPsychologyProfile {
  name: string;
  country: string;
  flag: string;
  archetype: 'ice_focus' | 'explosive_fire';
  baseConfidence: number; // 0.0 .. 1.0
  fistPumpIntensity: number; // 0.0 .. 1.0
  racketTwirlProbability: number; // 0.0 .. 1.0
  vamosTiltAngle: number; // Grad Ausleger-Hebung bei Jubel
  headNodFrequency: number; // Hz
  readyStanceBounceFreq: number; // Hz
  serveDribbleCount: number; // Anzahl Pre-Serve Bounces
}

/**
 * Live-Zustand der Spielerpsychologie während des Matches
 */
export interface PlayerLivePsychology {
  momentum: number;          // -1.0 (im Tief) bis +1.0 (On Fire / Im Flow)
  frustration: number;       // 0.0 (Zen) bis 1.0 (Kochend)
  stamina: number;           // 0.0 (Erschöpft) bis 1.0 (Vollgas)
  consecutiveWinners: number;// Anzahl aufeinanderfolgender Winner
  consecutiveErrors: number; // Anzahl aufeinanderfolgender Fehler
  currentEmotion: PlayerEmotionalState;
}

/**
 * Offizielle psychologische Spielerprofile für Sinner und Alcaraz
 */
export const PLAYER_PSYCHOLOGY_PROFILES: Record<TennisPlayerId, PlayerPsychologyProfile> = {
  1: {
    name: 'Jannik Sinner',
    country: 'ITA',
    flag: '🇮🇹',
    archetype: 'ice_focus',
    baseConfidence: 0.95,
    fistPumpIntensity: 0.65, // Ruhig, kontrolliert, fokussiert an der Hüfte
    racketTwirlProbability: 0.12, // Selten, stoisch
    vamosTiltAngle: 14.0, // Dezenter, fokussierter Ausleger-Hub
    headNodFrequency: 1.6, // Ruhiges, bejahendes Nicken
    readyStanceBounceFreq: 1.4, // Ruhige, ökonomische Gewichtsverlagerung
    serveDribbleCount: 7, // 7 präzise, monotone Ballaufpralle
  },
  2: {
    name: 'Carlos Alcaraz',
    country: 'ESP',
    flag: '🇪🇸',
    archetype: 'explosive_fire',
    baseConfidence: 0.96,
    fistPumpIntensity: 1.0, // Hochexplosiv, voller Körpereinsatz ("¡VAMOS!")
    racketTwirlProbability: 0.88, // Häufiger Schläger-Twirl & Finger ans Ohr
    vamosTiltAngle: 34.0, // Monumentaler 34° Ausleger-Aufschwung
    headNodFrequency: 2.4, // Schnelles, energisches Nicken & Box-Blick
    readyStanceBounceFreq: 2.2, // Hochenergetischer, federnder Split-Step
    serveDribbleCount: 5, // 5 dynamische, druckvolle Bounces
  }
};

/**
 * Metadaten und Badge-Texte für emotionale Zustände
 */
export const EMOTION_METADATA: Record<PlayerEmotionalState, { icon: string; label: string; duration: number }> = {
  idle_ready: { icon: '🎾', label: 'READY STANCE', duration: 0 },
  serve_ritual: { icon: '🎯', label: 'PRE-SERVE RITUAL', duration: 2.5 },
  celebrating_winner: { icon: '🔥', label: 'WINNER FIST PUMP', duration: 2.6 },
  celebrating_game: { icon: '👑', label: 'GAME / SET TRIUMPH', duration: 4.8 },
  ear_cup_celebration: { icon: '👂', label: '¡VAMOS! MAKE NOISE', duration: 3.2 },
  finger_wag_winner: { icon: '☝️', label: 'MAGIC PASSING WINNER', duration: 2.8 },
  steely_chest_thump: { icon: '❄️', label: 'ICE-MODE CHEST THUMP', duration: 2.6 },
  apology_wave: { icon: '🙏', label: 'NETZROLLER-ENTSCHULDIGUNG', duration: 2.4 },
  clapping_opponent: { icon: '👏', label: 'RESPEKT-APPLAUS', duration: 2.6 },
  shoe_clay_tap: { icon: '👟', label: 'CLAY SOLE TAP', duration: 2.2 },
  blown_tire_exhaustion: { icon: '💨', label: 'PULS 195 BPM • ERSCHÖPFUNG', duration: 3.4 },
  rage_racket_slam_fake: { icon: '😡', label: 'FRUST-MOMENT', duration: 2.8 },
  umpire_challenge_furious: { icon: '🔍', label: 'BALLABDRUCK-PRÜFUNG', duration: 3.0 },
  disappointed_error: { icon: '💔', label: 'KOPFSCHÜTTELN', duration: 2.4 },
  umpire_inquiry: { icon: '❓', label: 'BLICK ZUM SCHIEDSRICHTER', duration: 2.4 },
  towel_routine: { icon: '🧴', label: 'TOWEL ROUTINE', duration: 2.6 }
};

export interface PlayerEmotionTiming {
  delay: number;     // Startverzögerung der Geste in Sekunden
  duration: number;  // Dauer der spezifischen Geste in Sekunden
}

export interface PostRallyEmotionResult {
  p1Emotion: PlayerEmotionalState;
  p2Emotion: PlayerEmotionalState;
  p1Timing: PlayerEmotionTiming;
  p2Timing: PlayerEmotionTiming;
  totalPauseDuration: number;
}

export interface EmotionKinematicOffset {
  deltaDolly: number;
  deltaColumn: number;
  deltaBoomTilt: number;
  deltaTele: number;
  deltaBasePan: number;
  deltaHeadPan: number;
  deltaHeadTilt: number;
  deltaHeadRoll: number;
  racketSpinAngle: number; // Zusätzlicher 360° Racket Spin (Roll)
}

/**
 * Berechnet hochgradig realistische, physikalisch gedämpfte kinetische Gesten 
 * für den Supertechno 50 Ausleger mit weichem Ease-In/Ease-Out.
 */
export function calculateEmotionKinematicOffsets(
  playerId: TennisPlayerId,
  isWinner: boolean,
  progress: number, // 0.0 (Beginn der Geste) bis 1.0 (Ende)
  isGameOrSetWin: boolean = false,
  _shotType?: string,
  emotionalState?: PlayerEmotionalState
): EmotionKinematicOffset {
  const profile = PLAYER_PSYCHOLOGY_PROFILES[playerId];
  const offset: EmotionKinematicOffset = {
    deltaDolly: 0,
    deltaColumn: 0,
    deltaBoomTilt: 0,
    deltaTele: 0,
    deltaBasePan: 0,
    deltaHeadPan: 0,
    deltaHeadTilt: 0,
    deltaHeadRoll: 0,
    racketSpinAngle: 0,
  };

  const p = THREE.MathUtils.clamp(progress, 0, 1);
  // Sanfte kubische Glockenkurve für weiches Ein- und Ausfedern (Inertia Damping)
  const smoothP = p * p * (3 - 2 * p);
  const envelope = Math.sin(smoothP * Math.PI); 

  // Falls ein spezifischer Zustand angegeben wurde, wende dessen maßgeschneiderte Kinematik an:
  const state: PlayerEmotionalState = emotionalState || (
    isGameOrSetWin ? 'celebrating_game' : (isWinner ? 'celebrating_winner' : 'disappointed_error')
  );

  switch (state) {
    case 'ear_cup_celebration': {
      // 👂 Carlos Alcaraz Signature: Majestätischer "Make Noise" Ausleger-Hub & Schläger ans Ohr
      const risePhase = Math.sin(Math.min(1, p * 1.5) * Math.PI * 0.5);
      const decay = Math.exp(-p * 0.9);
      const peak = risePhase * decay;
      offset.deltaBoomTilt = 28.0 * peak;
      offset.deltaColumn = 0.26 * peak;
      offset.deltaTele = 0.80 * envelope;
      // Remote Head dreht sich geschmeidig zur Fankurve (60°), wippt mit 2.5 Hz und neigt sich
      offset.deltaBasePan = (playerId === 2 ? 12 : -12) * envelope;
      offset.deltaHeadPan = 58.0 * envelope;
      offset.deltaHeadTilt = -15.0 * peak + 6.0 * Math.sin(p * Math.PI * 4);
      offset.deltaHeadRoll = 38.0 * envelope; // Schlägerblatt ans "Ohr" gelegt
      offset.racketSpinAngle = THREE.MathUtils.smoothstep(p, 0, 0.45) * Math.PI * 2;
      break;
    }

    case 'steely_chest_thump': {
      // ❄️ Jannik Sinner Signature: Diskreter, kraftvoller Faustschlag auf die Brust
      const thumpImpulse = Math.sin(p * Math.PI * 1.1) * Math.exp(-p * 1.1);
      offset.deltaBoomTilt = 13.0 * thumpImpulse;
      offset.deltaColumn = 0.12 * thumpImpulse;
      offset.deltaTele = 0.32 * envelope;
      // Geschmeidiger Ruck des Remote Heads nach unten/innen (Faustschlag auf die Brust)
      const heartBeat = Math.sin(p * Math.PI * 5) * Math.exp(-p * 2.5);
      offset.deltaHeadTilt = -22.0 * thumpImpulse + 5.0 * heartBeat;
      offset.deltaHeadRoll = -18.0 * thumpImpulse;
      offset.deltaHeadPan = -6.0 * thumpImpulse; // Diskreter Tunnelblick zur Box
      break;
    }

    case 'finger_wag_winner': {
      // ☝️ Zeigefinger-Wackeln nach Zauber-Passierball (ruhige 3.5 Hz Schwingung)
      offset.deltaBoomTilt = 16.0 * envelope;
      offset.deltaColumn = 0.14 * envelope;
      offset.deltaTele = 0.40 * envelope;
      const wag = Math.sin(p * Math.PI * 6);
      offset.deltaHeadRoll = 20.0 * wag * envelope;
      offset.deltaHeadPan = 10.0 * envelope;
      offset.deltaHeadTilt = -8.0 * envelope;
      break;
    }

    case 'apology_wave': {
      // 🙏 Respektvolle Handhebe-Entschuldigung nach Netzroller
      offset.deltaBoomTilt = 7.0 * envelope;
      offset.deltaTele = 0.20 * envelope;
      offset.deltaHeadTilt = -16.0 * envelope;
      offset.deltaHeadRoll = 12.0 * envelope;
      offset.deltaHeadPan = 0; // Direkter Blick zum Gegner
      break;
    }

    case 'clapping_opponent': {
      // 👏 Schläger-Applaus (weiches 4.5 Hz Bespannungsklopfen für den Gegner)
      offset.deltaBoomTilt = 3.5 * envelope;
      offset.deltaColumn = -0.04 * envelope;
      const clap = Math.abs(Math.sin(p * Math.PI * 8));
      offset.deltaHeadTilt = (-12.0 - 8.0 * clap) * envelope;
      offset.deltaHeadRoll = 8.0 * envelope;
      offset.deltaHeadPan = 4.0 * envelope;
      break;
    }

    case 'shoe_clay_tap': {
      // 👟 Schlägerkopf tippt 2x bedächtig auf den Boden / Schienenbereich
      const tap1 = Math.sin(THREE.MathUtils.clamp((p - 0.15) * 6, 0, 1) * Math.PI);
      const tap2 = Math.sin(THREE.MathUtils.clamp((p - 0.50) * 6, 0, 1) * Math.PI);
      const totalTap = tap1 + tap2;
      offset.deltaBoomTilt = -9.0 * envelope - 6.0 * totalTap;
      offset.deltaColumn = -0.12 * envelope;
      offset.deltaHeadTilt = 28.0 * totalTap; // Schläger zielt sanft nach unten
      offset.deltaHeadRoll = -16.0 * envelope;
      break;
    }

    case 'blown_tire_exhaustion': {
      // 💨 Erschöpfung nach Marathon-Ballwechsel: Ausleger sackt tief ab, Säule sinkt
      const exhale = Math.sin(p * Math.PI);
      offset.deltaColumn = -0.28 * exhale;
      offset.deltaBoomTilt = -12.0 * exhale;
      offset.deltaTele = -0.50 * exhale;
      // Schlägerkopf zeigt nach unten, ruhiges tiefes Durchatmen (1.2 Hz)
      const panting = Math.sin(p * Math.PI * 3) * 0.02;
      offset.deltaHeadTilt = 20.0 * exhale + panting * 40;
      offset.deltaHeadRoll = 6.0 * exhale;
      offset.deltaHeadPan = 3.0 * Math.sin(p * Math.PI * 1.5);
      break;
    }

    case 'rage_racket_slam_fake': {
      // 😡 Frust: Alcaraz bremst Schläger-Smash knapp über Boden ab; Sinner atmet tief durch
      if (profile.archetype === 'explosive_fire') {
        const slamPhase = THREE.MathUtils.clamp(p * 2.5, 0, 1);
        const recoveryPhase = THREE.MathUtils.clamp((p - 0.4) / 0.6, 0, 1);
        const slam = Math.sin(slamPhase * Math.PI * 0.5);
        const recover = 1.0 - Math.sin(recoveryPhase * Math.PI * 0.5);
        offset.deltaBoomTilt = -15.0 * slam * recover;
        offset.deltaColumn = -0.18 * slam * recover;
        offset.deltaHeadTilt = 34.0 * slam * recover;
        offset.deltaHeadRoll = 26.0 * slam * recover;
        offset.deltaHeadPan = 14.0 * Math.sin(p * Math.PI * 3) * envelope;
      } else {
        const exhale = Math.sin(p * Math.PI);
        const shake = Math.sin(p * Math.PI * 3);
        offset.deltaBoomTilt = -5.0 * exhale;
        offset.deltaHeadTilt = -15.0 * exhale;
        offset.deltaHeadPan = 11.0 * shake * envelope;
        offset.deltaHeadRoll = -9.0 * exhale;
      }
      break;
    }

    case 'umpire_challenge_furious': {
      // 🔍 Ballabdruck-Prüfung & Schiedsrichter-Diskussion
      offset.deltaDolly = (playerId === 1 ? 0.35 : -0.35) * envelope;
      offset.deltaBoomTilt = 5.0 * envelope;
      offset.deltaTele = 0.50 * envelope;
      offset.deltaHeadTilt = 18.0 * envelope;
      offset.deltaHeadPan = (playerId === 1 ? -22.0 : 22.0) * envelope;
      offset.deltaHeadRoll = 14.0 * envelope;
      break;
    }

    case 'celebrating_game': {
      // 👑 Spiel-/Satzgewinn Showcase
      const peak = Math.sin(p * Math.PI * 0.7) * Math.exp(-p * 0.4);
      offset.deltaBoomTilt = (profile.vamosTiltAngle + 6) * peak;
      offset.deltaColumn = 0.30 * peak;
      offset.deltaTele = 1.0 * envelope;
      const twirlCycles = profile.archetype === 'explosive_fire' ? 2 : 1;
      offset.racketSpinAngle = THREE.MathUtils.smoothstep(p, 0, 0.65) * Math.PI * 2 * twirlCycles;
      offset.deltaHeadTilt = -24 * Math.sin(p * Math.PI * 1.5);
      offset.deltaHeadPan = 16 * Math.sin(p * Math.PI * 1.2);
      offset.deltaHeadRoll = 20 * Math.sin(p * Math.PI * 2);
      offset.deltaBasePan = 10 * Math.sin(p * Math.PI);
      break;
    }

    case 'celebrating_winner': {
      // 🏆 Standard Winner Celebration
      if (profile.archetype === 'explosive_fire') {
        const peakTime = Math.min(1, p * 1.8);
        const impulse = Math.sin(peakTime * Math.PI * 0.5) * Math.exp(-p * 1.2);
        offset.deltaBoomTilt = profile.vamosTiltAngle * impulse;
        offset.deltaColumn = 0.24 * impulse;
        offset.deltaTele = 0.75 * envelope;
        offset.racketSpinAngle = THREE.MathUtils.smoothstep(p, 0, 0.55) * Math.PI * 2;
        offset.deltaHeadTilt = -20 * Math.sin(p * Math.PI * 1.5);
        offset.deltaHeadPan = 12 * Math.sin(p * Math.PI * 1.2);
        offset.deltaHeadRoll = 16 * Math.sin(p * Math.PI * 2);
        offset.deltaBasePan = 7 * envelope;
      } else {
        const impulse = Math.sin(p * Math.PI * 0.8) * Math.exp(-p * 0.7);
        offset.deltaBoomTilt = profile.vamosTiltAngle * impulse;
        offset.deltaColumn = 0.10 * impulse;
        offset.deltaTele = 0.30 * envelope;
        const nod = Math.sin(p * Math.PI * 2.5 * profile.headNodFrequency);
        offset.deltaHeadTilt = -10 * impulse + 4 * nod * envelope;
        offset.deltaHeadPan = -5 * impulse;
        offset.deltaHeadRoll = 3 * nod * envelope;
      }
      break;
    }

    case 'disappointed_error':
    default: {
      // 💔 Loser / Error Reactions (ruhiges, menschliches Kopfschütteln)
      if (profile.archetype === 'explosive_fire') {
        const headShake = Math.sin(p * Math.PI * 3.5);
        offset.deltaHeadPan = 14 * headShake * envelope;
        offset.deltaHeadTilt = 15 * envelope;
        offset.deltaBoomTilt = -5 * envelope;
        offset.deltaColumn = -0.07 * envelope;
        offset.deltaHeadRoll = 6 * headShake * envelope;
      } else {
        const calmExhale = Math.sin(p * Math.PI);
        offset.deltaBoomTilt = -3.5 * calmExhale;
        offset.deltaHeadTilt = -12 * calmExhale;
        offset.deltaHeadPan = 3.5 * Math.sin(p * Math.PI * 1.5);
        offset.deltaHeadRoll = -8 * calmExhale;
      }
      break;
    }
  }

  return offset;
}

/**
 * Wählt nach jedem Ballwechsel basierend auf physikalischen Parametern, Match-Situation
 * und Spielerpsychologie den treffendsten emotionalen Zustand UND asynchrone Timings für beide Spieler aus.
 */
export function selectPostRallyEmotions(params: {
  winner: TennisPlayerId;
  shotType?: string;
  speedKmH: number;
  rallyCount: number;
  isNetCord: boolean;
  isNetError: boolean;
  isOutError: boolean;
  isAce: boolean;
  isSmash: boolean;
  isGameOrSetWin: boolean;
  isBreakPoint?: boolean;
  p1Psych: PlayerLivePsychology;
  p2Psych: PlayerLivePsychology;
}): PostRallyEmotionResult {
  const {
    winner,
    speedKmH,
    rallyCount,
    isNetCord,
    isNetError,
    isOutError,
    isAce,
    isSmash,
    isGameOrSetWin,
    isBreakPoint,
    p1Psych,
    p2Psych
  } = params;

  let p1Emotion: PlayerEmotionalState = 'idle_ready';
  let p2Emotion: PlayerEmotionalState = 'idle_ready';
  let p1Timing: PlayerEmotionTiming = { delay: 0.25, duration: 2.8 };
  let p2Timing: PlayerEmotionTiming = { delay: 0.50, duration: 2.4 };

  // 1. Großes Spiel-/Satzgewinn-Event (11.3m Ausleger-Showcase: 6.8s - 8.6s)
  if (isGameOrSetWin) {
    if (winner === 1) {
      p1Emotion = 'celebrating_game';
      p1Timing = { delay: 0.15, duration: 5.4 };
      p2Emotion = 'towel_routine';
      p2Timing = { delay: 0.70, duration: 4.2 };
    } else {
      p1Emotion = 'towel_routine';
      p1Timing = { delay: 0.80, duration: 4.2 };
      p2Emotion = 'celebrating_game';
      p2Timing = { delay: 0.10, duration: 5.6 };
    }
    const totalPauseDuration = 6.8 + Math.random() * 1.8;
    return { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration };
  }

  // 2. Erschöpfung nach epischem Marathon-Ballwechsel (≥10 Schläge: 6.2s - 8.2s lange Verschnaufpause)
  if (rallyCount >= 10) {
    if (winner === 1) {
      p1Emotion = 'steely_chest_thump';
      p1Timing = { delay: 0.60, duration: 4.0 };
      p2Emotion = 'blown_tire_exhaustion';
      p2Timing = { delay: 0.08, duration: 5.2 };
    } else {
      p1Emotion = 'blown_tire_exhaustion';
      p1Timing = { delay: 0.08, duration: 5.2 };
      p2Emotion = 'ear_cup_celebration';
      p2Timing = { delay: 0.50, duration: 4.6 };
    }
    const totalPauseDuration = 9.0 + Math.min(3.5, (rallyCount - 10) * 0.4) + Math.random() * 2.0;
    return { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration };
  }

  // 3. Vergebener Breakball oder Schiedsrichter-Challenge (8.5s - 12.0s Drama-Pause)
  if (isBreakPoint || (winner === 1 ? p2Psych.frustration > 0.6 : p1Psych.frustration > 0.6)) {
    if (winner === 1) {
      p1Emotion = 'steely_chest_thump';
      p1Timing = { delay: 0.30, duration: 4.8 };
      p2Emotion = isOutError ? 'umpire_challenge_furious' : (isNetError ? 'rage_racket_slam_fake' : 'disappointed_error');
      p2Timing = { delay: 0.10, duration: 5.2 };
    } else {
      p1Emotion = isOutError ? 'umpire_challenge_furious' : (isNetError ? 'rage_racket_slam_fake' : 'disappointed_error');
      p1Timing = { delay: 0.10, duration: 5.0 };
      p2Emotion = 'ear_cup_celebration';
      p2Timing = { delay: 0.35, duration: 5.4 };
    }
    const totalPauseDuration = 8.5 + Math.random() * 3.5;
    return { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration };
  }

  // 4. Monster-Smash (≥238 km/h) oder Highlight-Winner (7.2s - 9.8s Ekstase-Pause)
  if (isSmash && speedKmH >= 238) {
    if (winner === 2) {
      p2Emotion = 'ear_cup_celebration'; // Alcaraz feuert das Publikum an
      p2Timing = { delay: 0.15, duration: 4.8 };
      p1Emotion = 'clapping_opponent'; // Sinner spendet Schläger-Applaus
      p1Timing = { delay: 0.85, duration: 3.2 };
    } else {
      p1Emotion = 'steely_chest_thump';
      p1Timing = { delay: 0.25, duration: 4.5 };
      p2Emotion = 'clapping_opponent';
      p2Timing = { delay: 0.80, duration: 3.0 };
    }
    const totalPauseDuration = 7.2 + Math.random() * 2.6;
    return { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration };
  }

  // 5. Dramatischer Netzroller (5.5s - 7.5s Entschuldigungs-Pause)
  if (isNetCord) {
    if (winner === 1) {
      p1Emotion = 'apology_wave'; // Sinner entschuldigt sich sofort
      p1Timing = { delay: 0.12, duration: 3.8 };
      p2Emotion = 'disappointed_error'; // Alcaraz reagiert ungläubig
      p2Timing = { delay: 0.45, duration: 4.0 };
    } else {
      p1Emotion = 'disappointed_error';
      p1Timing = { delay: 0.50, duration: 3.8 };
      p2Emotion = 'apology_wave';
      p2Timing = { delay: 0.15, duration: 3.8 };
    }
    const totalPauseDuration = 5.5 + Math.random() * 2.0;
    return { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration };
  }

  // 6. Direktes Ass / Laser-Winner (5.0s - 6.8s Pause)
  if (isAce || speedKmH >= 225) {
    if (winner === 1) {
      p1Emotion = 'finger_wag_winner';
      p1Timing = { delay: 0.22, duration: 3.6 };
      p2Emotion = 'shoe_clay_tap';
      p2Timing = { delay: 0.80, duration: 3.0 };
    } else {
      p1Emotion = 'shoe_clay_tap';
      p1Timing = { delay: 0.75, duration: 3.0 };
      p2Emotion = 'finger_wag_winner';
      p2Timing = { delay: 0.18, duration: 3.8 };
    }
    const totalPauseDuration = 5.0 + Math.random() * 1.8;
    return { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration };
  }

  // 7. Schneller Fehler / Routine-Punkt (4.5s - 6.2s zügige Pause)
  const isQuickError = isNetError || isOutError;
  if (isQuickError) {
    if (winner === 1) {
      p1Emotion = 'celebrating_winner';
      p1Timing = { delay: 0.20, duration: 2.8 };
      p2Emotion = 'shoe_clay_tap';
      p2Timing = { delay: 0.40, duration: 2.6 };
    } else {
      p1Emotion = 'shoe_clay_tap';
      p1Timing = { delay: 0.40, duration: 2.6 };
      p2Emotion = 'celebrating_winner';
      p2Timing = { delay: 0.18, duration: 3.0 };
    }
    const totalPauseDuration = 4.5 + Math.random() * 1.7;
    return { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration };
  }

  // 8. Standard-Punktgewinn (5.8s - 8.2s variable Pause)
  if (winner === 1) {
    p1Emotion = Math.random() > 0.4 ? 'celebrating_winner' : 'steely_chest_thump';
    p1Timing = { delay: 0.20 + Math.random() * 0.15, duration: 3.4 + Math.random() * 0.8 };
    p2Emotion = Math.random() > 0.5 ? 'shoe_clay_tap' : 'disappointed_error';
    p2Timing = { delay: 0.50 + Math.random() * 0.25, duration: 2.8 + Math.random() * 0.6 };
  } else {
    p1Emotion = Math.random() > 0.5 ? 'shoe_clay_tap' : 'disappointed_error';
    p1Timing = { delay: 0.55 + Math.random() * 0.25, duration: 2.8 + Math.random() * 0.6 };
    p2Emotion = Math.random() > 0.35 ? 'ear_cup_celebration' : 'celebrating_winner';
    p2Timing = { delay: 0.18 + Math.random() * 0.15, duration: 3.6 + Math.random() * 0.8 };
  }

  const totalPauseDuration = 5.8 + Math.random() * 2.4;
  return { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration };
}

/**
 * Aktualisiert die Live-Psychologie-Werte (Momentum, Frustration, Stamina) beider Spieler.
 */
export function updatePlayerPsychology(
  prevPsych: PlayerLivePsychology,
  isWinner: boolean,
  rallyCount: number,
  isAce: boolean,
  isSmash: boolean,
  isError: boolean,
  isBreakPoint: boolean = false
): PlayerLivePsychology {
  let momentum = prevPsych.momentum;
  let frustration = prevPsych.frustration;
  let stamina = prevPsych.stamina;
  let consecutiveWinners = prevPsych.consecutiveWinners;
  let consecutiveErrors = prevPsych.consecutiveErrors;

  // Stamina-Verbrauch durch Ballwechsellänge
  const staminaDrain = THREE.MathUtils.clamp(rallyCount * 0.025, 0.05, 0.35);
  stamina = THREE.MathUtils.clamp(stamina - staminaDrain + 0.08, 0.15, 1.0); // Regeneriert leicht in der Pause

  if (isWinner) {
    consecutiveWinners += 1;
    consecutiveErrors = 0;
    const boost = (isAce ? 0.35 : isSmash ? 0.40 : 0.20) + (isBreakPoint ? 0.30 : 0.0);
    momentum = THREE.MathUtils.clamp(momentum + boost, -1.0, 1.0);
    frustration = THREE.MathUtils.clamp(frustration - 0.25, 0.0, 1.0);
  } else {
    consecutiveErrors += 1;
    consecutiveWinners = 0;
    const drop = (isError ? 0.25 : 0.15) + (isBreakPoint ? 0.35 : 0.0);
    momentum = THREE.MathUtils.clamp(momentum - drop, -1.0, 1.0);
    frustration = THREE.MathUtils.clamp(frustration + (isError ? 0.30 : 0.15), 0.0, 1.0);
  }

  return {
    momentum,
    frustration,
    stamina,
    consecutiveWinners,
    consecutiveErrors,
    currentEmotion: prevPsych.currentEmotion
  };
}

/**
 * Berechnet die federnde Ready-Stance Schwingung beider Kräne vor dem Aufschlag.
 */
export function calculateReadyStanceOscillation(
  playerId: TennisPlayerId,
  time: number
): { deltaDolly: number; deltaTilt: number; deltaRoll: number; deltaHeight: number } {
  const profile = PLAYER_PSYCHOLOGY_PROFILES[playerId];
  const freq = profile.readyStanceBounceFreq;
  const phase = time * Math.PI * 2 * freq;

  if (profile.archetype === 'explosive_fire') {
    // Alcaraz: Schneller federnder Split-Step auf den Ballen
    return {
      deltaDolly: Math.sin(phase * 0.5) * 0.08,
      deltaTilt: Math.sin(phase) * 1.8,
      deltaRoll: Math.cos(phase * 0.5) * 2.2,
      deltaHeight: (Math.abs(Math.sin(phase)) - 0.5) * 0.04,
    };
  } else {
    // Sinner: Ruhige, balancierte Bereitschaft
    return {
      deltaDolly: Math.sin(phase * 0.4) * 0.04,
      deltaTilt: Math.sin(phase * 0.8) * 1.0,
      deltaRoll: Math.cos(phase * 0.4) * 1.2,
      deltaHeight: (Math.abs(Math.sin(phase * 0.8)) - 0.5) * 0.02,
    };
  }
}

/**
 * Berechnet die atmosphärische Publikumsresonanz und Schiedsrichter-Callouts
 * basierend auf Schussgeschwindigkeit, Rallye-Länge und Matchsituation.
 */
export function calculateCrowdAndAtmosphere(
  rallyLength: number,
  speedKmH: number,
  isDecisive: boolean,
  isAce: boolean,
  isSmash: boolean,
  isNetCord: boolean
): { cheerIntensity: number; stadiumAnnouncement: string; crowdMood: 'cheering' | 'roaring' | 'applause' | 'gasp' } {
  let intensity = 0.35;
  let mood: 'cheering' | 'roaring' | 'applause' | 'gasp' = 'applause';
  let announcement = '';

  if (isNetCord) {
    intensity = 0.85;
    mood = 'gasp';
    announcement = '😱 Kollektives Raunen im Stadion! Dramatischer Netzroller!';
  } else if (isSmash && speedKmH >= 240) {
    intensity = 1.0;
    mood = 'roaring';
    announcement = `🔥 ${speedKmH} km/h MONSTER-SMASH! Das Stadion tobt in ohrenbetäubendem Jubel!`;
  } else if (isAce && speedKmH >= 225) {
    intensity = 0.90;
    mood = 'cheering';
    announcement = `⚡ ${speedKmH} km/h DIREKTES ASS! Tosender Beifall auf den Rängen!`;
  } else if (rallyLength >= 12) {
    intensity = 0.95;
    mood = 'roaring';
    announcement = `🎾 EPISCHER ${rallyLength}-SCHLÄGE BALLWECHSEL! Standing Ovations in der Arena!`;
  } else if (isDecisive) {
    intensity = 0.70;
    mood = 'cheering';
    announcement = '👏 Wichtiger Punktgewinn! Starker Beifall.';
  }

  return {
    cheerIntensity: THREE.MathUtils.clamp(intensity, 0, 1),
    stadiumAnnouncement: announcement,
    crowdMood: mood,
  };
}

