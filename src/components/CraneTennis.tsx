import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';
import TennisScoreboardHUD, { type MatchScore } from './TennisScoreboardHUD';
import TennisStadiumScoreboard from './TennisStadiumScoreboard';
import { TennisCourtArena, type CourtSurface } from './tennis/TennisArena';
import { TennisUmpire, TennisCourtsideStaff, TennisStadiumSpectators } from './tennis/TennisStaffAndCrowd';
import { MountedCranePlayer } from './tennis/TennisMountedRig';
import { TennisControlDrawer, type TennisCameraMode } from './tennis/TennisControlDrawer';
import { TennisUmpireCallWindow } from './tennis/TennisUmpireCallWindow';
import TennisHawkEyeOverlay, { type HawkEyeData } from './tennis/TennisHawkEyeOverlay';
import { AtmosphericSkyDome } from './CraneScenery';
import { useTennisMatchEngine } from '../hooks/useTennisMatchEngine';
import { 
  calculateBallBounceReboundVelocity, 
  SURFACE_FRICTION, 
  type TennisRK4Sample, 
  simulateTennisShotTrajectoryRK4,
  type TennisSpinType
} from '../utils/tennisKinematics';
import { 
  calculateEmotionKinematicOffsets, 
  selectPostRallyEmotions, 
  updatePlayerPsychology, 
  type PlayerEmotionalState, 
  type PlayerLivePsychology,
  type PlayerEmotionTiming,
  EMOTION_METADATA 
} from '../utils/tennisEmotions';
import {
  generatePointDirectorPlan,
  evaluateDynamicTennisDirectorDecision,
  type PointDirectorPlan
} from '../utils/cameraDirector';

export type { CourtSurface, TennisCameraMode };

interface RallyShot {
  shooter: 1 | 2;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  bouncePos: THREE.Vector3;
  duration: number;
  progress: number;
  netHeight: number;
  shotType: string;
  strokeSide: 'forehand' | 'backhand' | 'serve';
  spinType?: 'topspin' | 'slice' | 'flat' | 'kick' | 'dropshot';
  rpm?: number;
  speedKmh: number;
  hasBounced: boolean;
  isDecisive: boolean;
  isServe: boolean;
  serveAttempt?: 1 | 2;
  isFault?: boolean;
  servePhase: number;
  serveReadyDuration?: number;
  serveTossDuration?: number;
  serveBounceCount?: number;
  serveReadyFraction?: number;
  serveTossFraction?: number;
  isVolley?: boolean;
  isNetRush?: boolean;
  isSmash?: boolean;
  isLob?: boolean;
  isDropShot?: boolean;
  lobKind?: 'topspin_winner' | 'sky_moonball' | 'slice_defense';
  isLobSetup?: boolean;
  volleyKind?: 'drive' | 'stop' | 'reflex' | 'smash' | 'punch';
  isNetError?: boolean;
  isOutError?: boolean;
  isNetCord?: boolean;
  endReason?: string;
  pointWinner?: 1 | 2;
  rk4Trajectory?: TennisRK4Sample[];
}

// --- 🎾 MAIN CRANE TENNIS 3D SCENE ---
function CraneTennisScene({
  courtSurface,
  cameraMode,
  matchScore,
  setMatchScore,
  isAIvsAI,
  gameSpeed,
  orbitControlsRef,
  showSpectators,
  showCourtsideStaff,
  showGrandstands,
  manualVolleyTrigger,
  manualSmashTrigger,
  manualTopspinLobTrigger,
  manualSkyLobTrigger,
  manualServiceWinnerTrigger,
  manualDropTrigger,
  manualTopspinTrigger,
  manualLaserTrigger,
  manualSliceTrigger,
  manualNetErrorTrigger,
  manualOutErrorTrigger,
  manualResetTrigger,
  showScoreboard3D = true,
  onDirectorInfoChange,
  onHawkEyeTrigger
}: {
  courtSurface: CourtSurface;
  cameraMode: TennisCameraMode;
  matchScore: MatchScore;
  setMatchScore: React.Dispatch<React.SetStateAction<MatchScore>>;
  isAIvsAI: boolean;
  gameSpeed: number;
  orbitControlsRef: React.RefObject<any>;
  showSpectators: boolean;
  showCourtsideStaff: boolean;
  showGrandstands: boolean;
  showScoreboard3D?: boolean;
  manualVolleyTrigger?: number;
  manualSmashTrigger?: number;
  manualTopspinLobTrigger?: number;
  manualSkyLobTrigger?: number;
  manualServiceWinnerTrigger?: number;
  manualDropTrigger?: number;
  manualTopspinTrigger?: number;
  manualLaserTrigger?: number;
  manualSliceTrigger?: number;
  manualNetErrorTrigger?: number;
  manualOutErrorTrigger?: number;
  manualResetTrigger?: number;
  onDirectorInfoChange?: (info: { cam: TennisCameraMode; label: string; reason: string }) => void;
  onHawkEyeTrigger?: (data: HawkEyeData) => void;
}) {
  const [crane1, setCrane1] = useState<Supertechno50FBXModel | null>(null);
  const [crane2, setCrane2] = useState<Supertechno50FBXModel | null>(null);

  const outErrorDetailRef = useRef<{ cmOut: number; lineType: 'baseline' | 'sideline' | 'serviceline' } | null>(null);
  const showcaseTimerRef = useRef(4.8); // 4.8s Voll-Ausfahr- & Intro-Kamera-Sequenz
  const showcaseTypeRef = useRef<'intro' | 'gamewin'>('intro');

  useEffect(() => {
    if (manualResetTrigger && manualResetTrigger > 0) {
      showcaseTimerRef.current = 4.8;
      showcaseTypeRef.current = 'intro';
      currentPointIndexRef.current = 1;
      pointDirectorPlanRef.current = generatePointDirectorPlan(1, 1);
    }
  }, [manualResetTrigger]);

  const kin1Ref = useRef({
    dollyTrack: 0,
    columnElevation: 1.85,
    basePan: 0,
    boomTilt: 8,
    teleExtension: 5.5,
    headPan: 0,
    headTilt: 0,
    headRoll: 0
  });

  const kin2Ref = useRef({
    dollyTrack: 0,
    columnElevation: 1.85,
    basePan: 0,
    boomTilt: 8,
    teleExtension: 5.5,
    headPan: 0,
    headTilt: 0,
    headRoll: 0
  });

  const p1IsSouthRef = useRef(true);
  const sideChangeTimerRef = useRef(0);
  const sideChangeTotalDurationRef = useRef(8.0);
  const pendingSideChangeRef = useRef(false);
  const pendingShowcaseRef = useRef(false);

  const dolly1GroupRef = useRef<THREE.Group>(null);
  const dolly2GroupRef = useRef<THREE.Group>(null);

  const racket1WorldPos = useRef(new THREE.Vector3(0, 2.2, -9.8));
  const racket2WorldPos = useRef(new THREE.Vector3(0, 2.2, 9.8));
  const racket1WorldQuat = useRef(new THREE.Quaternion());
  const racket2WorldQuat = useRef(new THREE.Quaternion());

  // ⚡ ZERO-GC SCRATCH VECTORS FOR CAMERA & DIRECTOR (Agent 20)
  const _camDesiredPos = useRef(new THREE.Vector3()).current;
  const _camDesiredTarget = useRef(new THREE.Vector3()).current;

  // 🎬 AGENT 20: TV BROADCAST AUTO-DIRECTOR STATE REFS
  const pointDirectorPlanRef = useRef<PointDirectorPlan>(generatePointDirectorPlan(1, 1));
  const currentPointIndexRef = useRef(1);
  const directorCurrentCamRef = useRef<TennisCameraMode>('broadcast');
  const lastRenderedCamRef = useRef<TennisCameraMode | null>(null);
  const directorShotTimerRef = useRef(0);
  const directorCutReasonRef = useRef('TV-Hauptkamera (Center Court)');

  const [ballVisualPos, setBallVisualPos] = useState(new THREE.Vector3(0, 2.2, -9.8));
  const serveImpactPosRef = useRef(new THREE.Vector3());

  const shotRef = useRef<RallyShot>({
    shooter: 1,
    startPos: new THREE.Vector3(0, 2.2, -9.8),
    targetPos: new THREE.Vector3(0, 2.2, 9.8),
    bouncePos: new THREE.Vector3(0, 0.105, 5.5),
    duration: 1.4,
    progress: 1.0,
    netHeight: 1.6,
    shotType: '🎾 START-AUFSCHLAG (VORHAND TOPSPIN)',
    strokeSide: 'forehand',
    spinType: 'topspin',
    rpm: 2800,
    speedKmh: 148,
    hasBounced: false,
    isDecisive: false,
    isServe: false,
    servePhase: 0.0
  });

  const getUmpireScoreCall = (p1: number, p2: number, g1: number, g2: number, isTb?: boolean, tb1?: number, tb2?: number): string => {
    if (isTb) {
      return `Tiebreak: ${tb1 || 0} - ${tb2 || 0}`;
    }
    const terms: Record<number, string> = { 0: 'Love', 15: '15', 30: '30', 40: '40' };
    if (p1 === 45) return 'Advantage Sinner!';
    if (p2 === 45) return 'Advantage Alcaraz!';
    if (p1 === 40 && p2 === 40) return 'Deuce (Einstand)!';
    if (p1 === p2 && p1 > 0) return `${terms[p1]}-All`;
    return `${terms[p1]} - ${terms[p2]} (${g1}:${g2})`;
  };

  const triggerGrandSlamServe = (server: 1 | 2, forceWinner?: boolean, serveAttempt: 1 | 2 = 1) => {
    const receiver: 1 | 2 = server === 1 ? 2 : 1;
    const isSinner = server === 1;
    const isServerSouth = (server === 1 && p1IsSouthRef.current) || (server === 2 && !p1IsSouthRef.current);
    const isReceiverSouth = !isServerSouth;
    const totalPoints = (matchScore.p1Points || 0) + (matchScore.p2Points || 0);
    const isDeuceCourt = totalPoints % 2 === 0; // Gerade Punktzahl ➜ Einstand/Deuce (Rechts), Ungerade ➜ Vorteil/Ad (Links)

    // Position hinter der Grundlinie
    const serverZ = isServerSouth ? -13.8 : 13.8;
    const serverX = isServerSouth 
      ? (isDeuceCourt ? -2.2 : 2.2) 
      : (isDeuceCourt ? 2.2 : -2.2);

    // Diagonales Zielfeld (Aufschlagfeld des Gegners bei Z = ±6.2m)
    const targetServiceZ = isServerSouth ? 6.2 : -6.2;
    const servePlacement = Math.random();
    let targetX = 0;
    let targetDescription = '';

    if (isServerSouth) {
      if (isDeuceCourt) {
        // Von Süd-Rechts (-2.2) diagonal in Nord-Rechts (+0.35 bis +3.65)
        if (servePlacement < 0.45) { targetX = 0.40; targetDescription = 'T-LINIE (FLAT)'; }
        else if (servePlacement < 0.75) { targetX = 3.60; targetDescription = 'WEIT NACH AUSSEN (SLICE)'; }
        else { targetX = 1.90; targetDescription = 'KÖRPER-AUFSCHLAG (BODY)'; }
      } else {
        // Von Süd-Links (+2.2) diagonal in Nord-Links (-0.35 bis -3.65)
        if (servePlacement < 0.45) { targetX = -0.40; targetDescription = 'T-LINIE (FLAT)'; }
        else if (servePlacement < 0.75) { targetX = -3.60; targetDescription = 'WEIT NACH AUSSEN (KICK)'; }
        else { targetX = -1.90; targetDescription = 'KÖRPER-AUFSCHLAG (BODY)'; }
      }
    } else {
      if (isDeuceCourt) {
        // Von Nord-Rechts (+2.2) diagonal in Süd-Rechts (-0.35 bis -3.65)
        if (servePlacement < 0.45) { targetX = -0.40; targetDescription = 'T-LINIE (FLAT)'; }
        else if (servePlacement < 0.75) { targetX = -3.60; targetDescription = 'WEIT NACH AUSSEN (HEAVY SLICE)'; }
        else { targetX = -1.90; targetDescription = 'KÖRPER-AUFSCHLAG (BODY)'; }
      } else {
        // Von Nord-Links (-2.2) diagonal in Süd-Links (+0.35 bis +3.65)
        if (servePlacement < 0.45) { targetX = 0.40; targetDescription = 'T-LINIE (FLAT)'; }
        else if (servePlacement < 0.75) { targetX = 3.60; targetDescription = 'WEIT NACH AUSSEN (HEAVY KICK)'; }
        else { targetX = 1.90; targetDescription = 'KÖRPER-AUFSCHLAG (BODY)'; }
      }
    }

    const receiverTargetZ = isServerSouth ? 11.2 : -11.2;

    const p1Points = matchScore.p1Points || 0;
    const p2Points = matchScore.p2Points || 0;
    const isBreakPoint = (p1Points === 45 || (p1Points === 40 && p2Points <= 30 && server === 2)) ||
                         (p2Points === 45 || (p2Points === 40 && p1Points <= 30 && server === 1));
    const isDeuce = p1Points === 40 && p2Points === 40;
    const isTiebreak = !!matchScore.isTiebreak;

    // 🎯 Dynamisch variierende Aufschlag-Konzentrationsdauer (Pre-Serve Concentration Duration)
    let readyDuration = 3.2; // Sekunden Vorbereitung & Dribbeln
    let bounceCount = 5;

    if (isBreakPoint) {
      // ⚡ Breakball-Spannung: Maximale Konzentration, langes Durchatmen (4.8s - 6.4s, 8-10 Bounces)
      readyDuration = 4.8 + Math.random() * 1.6;
      bounceCount = Math.round(8 + Math.random() * 2);
    } else if (isDeuce || isTiebreak) {
      // 💥 Big Point (Einstand / Tiebreak): 3.8s - 5.2s, 6-8 Bounces
      readyDuration = 3.8 + Math.random() * 1.4;
      bounceCount = Math.round(6 + Math.random() * 2);
    } else if (serveAttempt === 2) {
      // 🎯 2. Aufschlag nach Fehler: Bedächtige Ballprüfung (3.0s - 4.4s, 5-6 Bounces)
      readyDuration = 3.0 + Math.random() * 1.4;
      bounceCount = Math.round(5 + Math.random() * 2);
    } else {
      // 🎾 1. Aufschlag mit natürlicher, menschlicher Varianz:
      const rhythmRoll = Math.random();
      if (rhythmRoll < 0.28) {
        // Zügiger Rhythmus (1.8s - 2.6s, 3-4 Bounces)
        readyDuration = 1.8 + Math.random() * 0.8;
        bounceCount = Math.round(3 + Math.random() * 1);
      } else if (rhythmRoll < 0.75) {
        // Standard Rhythmus (2.8s - 3.8s, 5-6 Bounces)
        readyDuration = 2.8 + Math.random() * 1.0;
        bounceCount = Math.round(5 + Math.random() * 1);
      } else {
        // Tiefer Fokus / Strings-Check (4.0s - 5.4s, 7-9 Bounces)
        readyDuration = 4.0 + Math.random() * 1.4;
        bounceCount = Math.round(7 + Math.random() * 2);
      }
    }

    const tossDuration = 1.15 + Math.random() * 0.15; // 1.15s - 1.30s Ballwurf
    const flightDuration = serveAttempt === 1 ? 1.70 : 1.85; // Ballflug nach Treffpunkt
    const totalServeDuration = readyDuration + tossDuration + flightDuration;
    const serveReadyFraction = readyDuration / totalServeDuration;
    const serveTossFraction = (readyDuration + tossDuration) / totalServeDuration;

    if (serveAttempt === 1) {
      // --- 1. AUFSCHLAG (FIRST SERVICE) ---
      const faultRoll = Math.random();
      const isFault = !forceWinner && faultRoll < 0.28; // 28% Fehlerquote beim 1. Aufschlag
      const speed = isSinner ? Math.round(228 + Math.random() * 12) : Math.round(220 + Math.random() * 14);

      if (isFault) {
        const isNetFault = Math.random() < 0.55;
        const serverSideSign = isReceiverSouth ? 1 : -1;
        const faultBounceZ = isNetFault ? (serverSideSign * 0.45) : (isReceiverSouth ? -7.8 : 7.8);
        const cmOut = Math.round(1.5 + Math.random() * 5.5);
        outErrorDetailRef.current = isNetFault ? null : { cmOut, lineType: 'serviceline' };
        
        shotRef.current = {
          shooter: server,
          startPos: new THREE.Vector3(serverX, 1.4, serverZ),
          targetPos: new THREE.Vector3(targetX, isNetFault ? 0.85 : 0.2, faultBounceZ),
          bouncePos: new THREE.Vector3(targetX * 0.8, 0.105, faultBounceZ),
          duration: totalServeDuration,
          progress: 0.0,
          netHeight: isNetFault ? 0.92 : 1.5,
          shotType: isNetFault ? `⚠️ ${speed} km/h 1. AUFSCHLAG (INS NETZ - FAULT)` : `⚠️ ${speed} km/h 1. AUFSCHLAG (KNAPP IM AUS - FAULT)`,
          strokeSide: 'serve',
          spinType: isSinner ? 'flat' : 'kick',
          rpm: isSinner ? 2150 : 3100,
          speedKmh: speed,
          hasBounced: false,
          isDecisive: false,
          isServe: true,
          serveAttempt: 1,
          isFault: true,
          servePhase: 0.0,
          serveReadyDuration: readyDuration,
          serveTossDuration: tossDuration,
          serveBounceCount: bounceCount,
          serveReadyFraction,
          serveTossFraction,
          endReason: 'FAULT',
          pointWinner: server
        };
        return;
      }

      // Gültiger 1. Aufschlag
      const serveRoll = Math.random();
      const isAce = !forceWinner && serveRoll < 0.07;
      const isServiceWinner = forceWinner || (!isAce && serveRoll < 0.22);
      const isDecisive = isAce || isServiceWinner;

      let shotType = isSinner ? `🎾 ${speed} km/h SINNER 1. AUFSCHLAG • ${targetDescription}` : `🎾 ${speed} km/h ALCARAZ 1. AUFSCHLAG • ${targetDescription}`;
      let endReason = '';

      if (isAce) {
        shotType = isSinner ? `⚡ DIREKTES ASS! (${speed} km/h SINNER BOMB)` : `⚡ DIREKTES ASS! (${speed} km/h ALCARAZ KICK)`;
        endReason = `ACE (${speed} km/h)`;
      } else if (isServiceWinner) {
        shotType = isSinner ? `🎯 232 km/h SINNER SERVICE WINNER (${targetDescription})` : `🎯 226 km/h ALCARAZ SERVICE WINNER (${targetDescription})`;
        endReason = `SERVICE WINNER (${speed} km/h)`;
      }

      shotRef.current = {
        shooter: server,
        startPos: new THREE.Vector3(serverX, 1.4, serverZ),
        targetPos: new THREE.Vector3(targetX, 2.1, receiverTargetZ),
        bouncePos: new THREE.Vector3(targetX, 0.105, targetServiceZ),
        duration: totalServeDuration,
        progress: 0.0,
        netHeight: 1.7,
        shotType,
        strokeSide: 'serve',
        spinType: isSinner ? 'flat' : 'kick',
        rpm: isSinner ? 2200 : 3200,
        speedKmh: speed,
        hasBounced: false,
        isDecisive,
        isServe: true,
        serveAttempt: 1,
        isFault: false,
        servePhase: 0.0,
        serveReadyDuration: readyDuration,
        serveTossDuration: tossDuration,
        serveBounceCount: bounceCount,
        serveReadyFraction,
        serveTossFraction,
        endReason,
        pointWinner: server
      };
    } else {
      // --- 2. AUFSCHLAG (SECOND SERVICE) ---
      const isDoubleFault = !forceWinner && Math.random() < 0.05;
      const speed = isSinner ? Math.round(186 + Math.random() * 12) : Math.round(178 + Math.random() * 14);

      if (isDoubleFault) {
        const isNetFault = Math.random() < 0.60;
        const serverSideSign = isReceiverSouth ? 1 : -1;
        const doubleFaultZ = isNetFault ? (serverSideSign * 0.45) : (isReceiverSouth ? -7.6 : 7.6);
        const cmOut = Math.round(1.2 + Math.random() * 4.8);
        outErrorDetailRef.current = isNetFault ? null : { cmOut, lineType: 'serviceline' };
        shotRef.current = {
          shooter: server,
          startPos: new THREE.Vector3(serverX, 1.4, serverZ),
          targetPos: new THREE.Vector3(targetX, isNetFault ? 0.75 : 0.2, doubleFaultZ),
          bouncePos: new THREE.Vector3(targetX * 0.8, 0.105, doubleFaultZ),
          duration: totalServeDuration,
          progress: 0.0,
          netHeight: isNetFault ? 0.88 : 1.45,
          shotType: isNetFault
            ? `❌ 2. AUFSCHLAG DOPPELFEHLER (Ins Netz • Punkt für ${receiver === 1 ? 'Sinner' : 'Alcaraz'})`
            : `❌ 2. AUFSCHLAG DOPPELFEHLER (${cmOut} cm im Aus • Punkt für ${receiver === 1 ? 'Sinner' : 'Alcaraz'})`,
          strokeSide: 'serve',
          spinType: 'kick',
          rpm: 2800,
          speedKmh: speed,
          hasBounced: false,
          isDecisive: true,
          isServe: true,
          serveAttempt: 2,
          isFault: true,
          servePhase: 0.0,
          serveReadyDuration: readyDuration,
          serveTossDuration: tossDuration,
          serveBounceCount: bounceCount,
          serveReadyFraction,
          serveTossFraction,
          endReason: 'DOUBLE FAULT',
          pointWinner: receiver
        };
      } else {
        shotRef.current = {
          shooter: server,
          startPos: new THREE.Vector3(serverX, 1.4, serverZ),
          targetPos: new THREE.Vector3(targetX, 2.1, receiverTargetZ),
          bouncePos: new THREE.Vector3(targetX, 0.105, targetServiceZ),
          duration: totalServeDuration,
          progress: 0.0,
          netHeight: 1.65,
          shotType: isSinner ? `🎾 ${speed} km/h SINNER 2. AUFSCHLAG (TOPSPIN DRIVE)` : `🎾 ${speed} km/h ALCARAZ 2. AUFSCHLAG (3.400 RPM HEAVY KICK)`,
          strokeSide: 'serve',
          spinType: 'kick',
          rpm: isSinner ? 2750 : 3400,
          speedKmh: speed,
          hasBounced: false,
          isDecisive: false,
          isServe: true,
          serveAttempt: 2,
          isFault: false,
          servePhase: 0.0,
          serveReadyDuration: readyDuration,
          serveTossDuration: tossDuration,
          serveBounceCount: bounceCount,
          serveReadyFraction,
          serveTossFraction,
          endReason: '',
          pointWinner: server
        };
      }
    }
  };

  const createNextShot = (
    fromHitter: 1 | 2,
    startPosition: THREE.Vector3,
    currentRally: number,
    forceMode?: 'volley' | 'smash' | 'lob_smash' | 'topspin_lob' | 'sky_lob' | 'stop' | 'net_error' | 'out_error'
  ): RallyShot => {
    const nextHitter = fromHitter === 1 ? 2 : 1;
    const isSinner = fromHitter === 1;
    const isAlcaraz = fromHitter === 2;
    const prevShot = shotRef.current;
    
    // Prüfen, ob der vorherige Schlag eine hohe defensive Kerze (Lob) war
    const wasIncomingLob = prevShot && (prevShot.isLobSetup || (prevShot.isLob && prevShot.lobKind === 'sky_moonball'));

    // Prüfen, ob der schlagende Kran am Netz steht (|Z| <= 5.2m)
    const wasShooterAtNet = Math.abs(startPosition.z) <= 5.2;

    // --- TAKTISCHE ENTSCHEIDUNGS-MATRIX: WER, WANN, WIE OFT ---
    // 1. Stoppball (Disguised Drop Shot): Alcaraz 20% ab Rally 2 (Signature Move), Sinner nur selten 4%
    const wantsDropShot = forceMode === 'stop' || (!wasIncomingLob && isAlcaraz && currentRally >= 2 && Math.random() < 0.20) || (isSinner && currentRally >= 4 && Math.random() < 0.04);

    // 2. Smash (Schmetterball): Bei hohem Lob (Alcaraz 92%, Sinner 85%)
    const wantsDirectSmash = forceMode === 'smash' || wasIncomingLob;

    // 3. Topspin-Lob Winner: Wenn der Gegner am Netz steht (Alcaraz 45%, Sinner 35%)
    const wantsTopspinLob = !wantsDirectSmash && (forceMode === 'topspin_lob' || (!wasIncomingLob && wasShooterAtNet && ((isAlcaraz && Math.random() < 0.45) || (isSinner && Math.random() < 0.35))));

    // 4. Defensive Sky-Notkerze: Aus Bedrängnis in die Flutlichter (Alcaraz 24%, Sinner 12%)
    const wantsSkyLob = !wantsDirectSmash && !wantsTopspinLob && (forceMode === 'sky_lob' || forceMode === 'lob_smash' || (!wasShooterAtNet && !wasIncomingLob && currentRally >= 3 && ((isAlcaraz && Math.random() < 0.24) || (isSinner && Math.random() < 0.12))));

    // 5. Netzangriff & Drive-Volley: Alcaraz 28% All-Court Rushes, Sinner 12%
    const wantsNetVolley = !wantsDirectSmash && !wantsSkyLob && !wantsTopspinLob && (
      forceMode === 'volley' || wantsDropShot || (!wasShooterAtNet && ((isAlcaraz && currentRally >= 1 && Math.random() < 0.28) || (isSinner && currentRally >= 3 && Math.random() < 0.12)))
    );

    // 6. Schlagseite (Vorhand vs. Rückhand Häufigkeit):
    // Sinner: 52% Vorhand, 48% Rückhand (Weltklasse-Balance, stärkste Rückhand der Tour)
    // Alcaraz: 65% Vorhand (umläuft aktiv die Rückhand für Inside-Out), 35% Rückhand
    const forehandRatio = isAlcaraz ? 0.65 : 0.52;
    const strokeSide: 'forehand' | 'backhand' = Math.random() < forehandRatio ? 'forehand' : 'backhand';

    // 7. Spin vs. Slice bei Rückhand:
    // Alcaraz nutzt zu 38% giftigen Backhand-Slice (Tempowechsel & flacher Absprung), Sinner zu 92% beidhändigen Flat/Topspin-Laser
    const isBackhandSlice = strokeSide === 'backhand' && ((isAlcaraz && Math.random() < 0.38) || (isSinner && Math.random() < 0.08));

    let targetZ: number;
    let targetY: number;
    let targetX = (Math.random() - 0.5) * 5.8;
    let isVolley = false;
    let isNetRush = false;
    let isSmash = false;
    let isLob = false;
    let isLobSetup = false;
    let isDropShot = false;
    let isNetError = false;
    let isOutError = false;
    let isNetCord = false;
    let lobKind: 'topspin_winner' | 'sky_moonball' | 'slice_defense' | undefined = undefined;
    let volleyKind: 'drive' | 'stop' | 'reflex' | 'smash' | 'punch' | undefined = undefined;
    let spinType: 'topspin' | 'slice' | 'flat' | 'kick' | 'dropshot' = 'topspin';
    let rpm = 2500;

    let chosenType = '';
    let speed = 175;
    let endReason = '';
    let isDecisive = currentRally >= 6 && Math.random() > 0.65;
    let pointWinner: 1 | 2 = fromHitter;

    const createRallyShot = (s: RallyShot): RallyShot => {
      s.rk4Trajectory = simulateTennisShotTrajectoryRK4(s, courtSurface, 100);
      return s;
    };

    const isNextHitterSouth = (nextHitter === 1 && p1IsSouthRef.current) || (nextHitter === 2 && !p1IsSouthRef.current);
    const nextHitterSideSign = isNextHitterSouth ? -1 : 1;
    const fromHitterSideSign = isNextHitterSouth ? 1 : -1;

    // Realistische ATP-Fehlerquote: ca. 28% aller offenen Schläge in Rallyes resultieren in einem Fehler (Out oder Netz)
    const isErrorChance = !forceMode && !wantsDirectSmash && !wantsTopspinLob && !wantsSkyLob && !wantsNetVolley && currentRally >= 2 && Math.random() < 0.28;

    if (forceMode === 'out_error' || (isErrorChance && Math.random() < 0.58)) {
      // ⚠️ OUT-FEHLER (58% aller Fehler nach realer ATP-Tour-Statistik: Grundlinie überzogen oder Seitenaus/Korridor)
      isOutError = true;
      isDecisive = true;
      pointWinner = nextHitter;
      speed = Math.round(148 + Math.random() * 32);
      spinType = strokeSide === 'backhand' && isAlcaraz ? 'slice' : (strokeSide === 'forehand' && isAlcaraz ? 'topspin' : 'flat');
      rpm = isAlcaraz ? 3100 : 2250;

      // 60% Grundlinie überzogen (Deep Out), 40% Seitenaus / Korridor (Wide Out)
      const isDeepOut = Math.random() < 0.60;
      let cmOut: number;

      if (isDeepOut) {
        // Deep Out: Ball segelt über die Grundlinie (Z = 11.885m) hinaus
        cmOut = Math.round(2 + Math.random() * 12);
        outErrorDetailRef.current = { cmOut, lineType: 'baseline' };
        const outDistM = cmOut / 100;
        targetZ = nextHitterSideSign * (11.885 + outDistM + 0.4);
        targetX = (Math.random() - 0.5) * 5.6;
        targetY = 0.9 + Math.random() * 0.4;

        if (isSinner) {
          chosenType = strokeSide === 'backhand'
            ? `⚠️ OUT! 132 km/h SINNER RÜCKHAND-LASER KNAPP IM AUS (${cmOut} cm hinter der Grundlinie)`
            : `⚠️ OUT! SINNER FLAT-VORHAND ZU LANG (${cmOut} cm Grundlinien-Aus)`;
          endReason = `SINNER OUT (${cmOut} cm Grundlinie)`;
        } else {
          chosenType = strokeSide === 'forehand'
            ? `⚠️ OUT! 3.200 RPM ALCARAZ TOPSPIN ÜBERZOGEN (${cmOut} cm hinter der Grundlinie)`
            : `⚠️ OUT! ALCARAZ SLICE SEGELT INS AUS (${cmOut} cm zu lang)`;
          endReason = `ALCARAZ OUT (${cmOut} cm Grundlinie)`;
        }
      } else {
        // Wide Out: Ball verzieht seitlich in den Korridor / ins Seitenaus (X = 4.115m)
        cmOut = Math.round(2 + Math.random() * 9);
        outErrorDetailRef.current = { cmOut, lineType: 'sideline' };
        const isRight = Math.random() > 0.5;
        const outDistM = cmOut / 100;
        targetX = isRight ? (4.115 + outDistM + 0.3) : (-4.115 - outDistM - 0.3);
        targetZ = nextHitterSideSign * (7.0 + Math.random() * 4.2);
        targetY = 0.8 + Math.random() * 0.4;

        if (isSinner) {
          chosenType = `⚠️ OUT! SINNER INSIDE-OUT VORHAND KNAPP IM SEITENAUS (${cmOut} cm im Korridor)`;
          endReason = `SINNER OUT (${cmOut} cm Seitenaus)`;
        } else {
          chosenType = `⚠️ OUT! ALCARAZ CROSS-WINKEL ZU WEIT (${cmOut} cm im Seitenaus)`;
          endReason = `ALCARAZ OUT (${cmOut} cm Seitenaus)`;
        }
      }

      const bouncePos = new THREE.Vector3(targetX, 0.105, targetZ * 0.96);

      return createRallyShot({
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos,
        duration: 1.15,
        progress: 0.0,
        netHeight: 1.55,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: true,
        isServe: false,
        servePhase: 0.0,
        isOutError: true,
        endReason,
        pointWinner
      });
    } else if (forceMode === 'net_error' || (isErrorChance && Math.random() < 0.92)) {
      // 🕸️ NETZFEHLER (37% aller Fehler: Ball bleibt im Netz / an der Netzkante hängen)
      isNetError = true;
      isDecisive = true;
      pointWinner = nextHitter; // Punkt für den Gegner!
      speed = Math.round(128 + Math.random() * 20);
      targetZ = fromHitterSideSign * 0.35; // Bleibt strikt auf der Seite des Schlägers an der Netzbasis
      targetY = 0.88 + Math.random() * 0.12; // Netzkante / oberes Netzband (0.88m - 1.00m)
      targetX = (Math.random() - 0.5) * 3.5;
      
      if (isSinner) {
        chosenType = strokeSide === 'backhand' 
          ? '🕸️ SINNER RÜCKHAND IM NETZ (Unforced Error am Netzkabel)' 
          : '🕸️ SINNER VORHAND-FEHLER (Knapp im Netz hängengeblieben)';
        endReason = 'SINNER NETZFEHLER (Unforced Error)';
      } else {
        chosenType = strokeSide === 'backhand' 
          ? '🕸️ ALCARAZ SLICE IM NETZ (Giftiger Ball zu tief angesetzt)' 
          : '🕸️ ALCARAZ HEAVY-TOPSPIN IM NETZ (Netzkanten-Fehler)';
        endReason = 'ALCARAZ NETZFEHLER (Unforced Error)';
      }

      return createRallyShot({
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, 0.065, targetZ),
        bouncePos: new THREE.Vector3(targetX, 0.065, targetZ),
        duration: 1.35,
        progress: 0.0,
        netHeight: targetY,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: true,
        isServe: false,
        servePhase: 0.0,
        isNetError: true,
        endReason,
        pointWinner
      });
    } else if (!forceMode && currentRally >= 4 && Math.random() < 0.05) {
      // 💫 NETZROLLER DRAMA (5% aller Fehler/Glücksbälle: Ball touchiert das Netzkabel)
      isNetCord = true;
      isDecisive = true;
      pointWinner = fromHitter;
      speed = 118;
      targetZ = nextHitterSideSign * (2.4 + Math.random() * 1.4);
      targetX = (Math.random() - 0.5) * 3.5;
      targetY = 0.4;
      chosenType = '💫 NETZROLLER! (Ball touchiert das Netzkabel und tropft unerreichbar ins Feld)';
      endReason = 'NETZROLLER WINNER (Net Cord)';

      return createRallyShot({
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: new THREE.Vector3(targetX, 0.105, targetZ),
        duration: 1.45,
        progress: 0.0,
        netHeight: 1.05,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: true,
        isServe: false,
        servePhase: 0.0,
        isNetCord: true,
        endReason,
        pointWinner
      });
    } else if (wantsTopspinLob) {
      // 🌈 10.5m TOPSPIN-LOB WINNER
      isLob = true;
      lobKind = 'topspin_winner';
      isDecisive = true;
      pointWinner = fromHitter;
      speed = Math.round(165 + Math.random() * 15);
      spinType = 'topspin';
      rpm = isAlcaraz ? 3250 : 2600;
      
      targetX = (Math.random() - 0.5) * 4.6;
      targetZ = nextHitterSideSign * (12.8 + Math.random() * 1.4);
      targetY = 1.1;
      const bounceZ = nextHitterSideSign * 11.4;
      const bouncePosition = new THREE.Vector3(targetX, 0.105, bounceZ);

      if (isSinner) {
        chosenType = '🌈 10.5m SINNER TOPSPIN-LOB WINNER (Millimetergenau auf die Grundlinie)';
        endReason = 'SINNER LOB WINNER';
      } else {
        chosenType = '🌈 10.5m ALCARAZ AKROBATIK-LOB (Aus vollem Lauf über den Ausleger)';
        endReason = 'ALCARAZ LOB WINNER';
      }

      return createRallyShot({
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: bouncePosition,
        duration: 1.72,
        progress: 0.0,
        netHeight: 10.5,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive,
        isServe: false,
        servePhase: 0.0,
        isLob: true,
        lobKind: 'topspin_winner',
        endReason,
        pointWinner
      });
    } else if (wantsSkyLob) {
      // 🛡️ 11.2m HOHE DEFENSIVE SKY-NOTKERZE
      isLob = true;
      isLobSetup = true;
      lobKind = 'sky_moonball';
      speed = 110;
      spinType = 'slice';
      rpm = 1800;
      targetZ = nextHitterSideSign * 6.5;
      targetY = 2.9;
      const bouncePosition = new THREE.Vector3(targetX * 0.5, 0.105, targetZ);

      return createRallyShot({
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: bouncePosition,
        duration: 1.95,
        progress: 0.0,
        netHeight: 11.2,
        shotType: isSinner ? '🛡️ 11.2m SINNER DEFENSIV-KERZE (Flug in die Flutlichter)' : '🛡️ 11.2m ALCARAZ NOTKERZE (Defensiver Sky-Moonball)',
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: false,
        isServe: false,
        servePhase: 0.0,
        isLob: true,
        isLobSetup: true,
        lobKind: 'sky_moonball',
        endReason: '',
        pointWinner
      });
    } else if (wantsDirectSmash) {
      // 🔥 MONSTER-SMASH
      isSmash = true;
      speed = isAlcaraz ? Math.round(246 + Math.random() * 12) : Math.round(240 + Math.random() * 10);
      spinType = 'flat';
      rpm = 2200;
      
      const isSmashWinner = forceMode === 'smash' ? (Math.random() < 0.70) : (Math.random() < 0.50);
      isDecisive = isSmashWinner;
      pointWinner = fromHitter;

      const frontCourtZ = nextHitterSideSign * (2.5 + Math.random() * 1.8);

      if (isSmashWinner) {
        const grandstandZ = nextHitterSideSign * 18.5;
        if (isAlcaraz) {
          chosenType = '🔥 248 km/h CARLITOS MONSTER-SMASH WINNER (Rebound über die Stadionwand)';
          endReason = `ALCARAZ SMASH (${speed} km/h)`;
        } else {
          chosenType = '🚀 244 km/h SINNER ÜBERKOPF-HAMMER (Boden-Einschlag & Tribünen-Kick)';
          endReason = `SINNER SMASH (${speed} km/h)`;
        }

        targetX = (Math.random() - 0.5) * 5.2;
        targetY = 6.5;
        targetZ = grandstandZ;
      } else {
        // 🛡️ SMASH WIRD AN DER GRUNDLINIE ERWISCHT
        const returnZ = nextHitterSideSign * (11.2 + Math.random() * 2.2);
        chosenType = isNextHitterSouth ? '🔥 242 km/h SCHMETTERBALL ➜ 🛡️ SINNER REFLEX-DIG AN DER GRUNDLINIE!' : '🔥 242 km/h SCHMETTERBALL ➜ 🛡️ ALCARAZ HECHTSPRUNG-RETURN!';
        endReason = '';

        targetX = (Math.random() - 0.5) * 4.6;
        targetY = 2.4 + Math.random() * 0.8;
        targetZ = returnZ;
      }

      const bouncePosition = new THREE.Vector3(targetX * 0.65, 0.065, frontCourtZ);

      // Smash-Treffpunkt liegt oben am Apex über dem Hitter im Halbfeld
      const smashStartPos = startPosition.clone();
      smashStartPos.y = 4.95;
      smashStartPos.z = fromHitterSideSign * 4.5;

      return createRallyShot({
        shooter: fromHitter,
        startPos: smashStartPos,
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: bouncePosition,
        duration: isSmashWinner ? 1.15 : 1.35,
        progress: 0.0,
        netHeight: 1.8,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive,
        isServe: false,
        servePhase: 0.0,
        isSmash: true,
        endReason,
        pointWinner
      });
    } else if (wantsDropShot) {
      // 💫 DISGUISED STOPPBALL (DROP SHOT) - ALCARAZ SIGNATURE WEAPON
      isDropShot = true;
      speed = Math.round(88 + Math.random() * 20);
      spinType = 'dropshot';
      rpm = isAlcaraz ? 2600 : 2100;
      targetZ = nextHitterSideSign * (2.2 + Math.random() * 1.4);
      targetY = 1.1;
      targetX = (Math.random() - 0.5) * 4.4;

      const dropBounceZ = nextHitterSideSign * (1.8 + Math.random() * 0.8);
      const dropBouncePos = new THREE.Vector3(targetX, 0.105, dropBounceZ);

      if (isAlcaraz) {
        chosenType = `💫 ${speed} km/h ALCARAZ DISGUISED STOPPBALL (2.600 RPM Backspin • Signature Move 👑)`;
        endReason = 'ALCARAZ DROP-SHOT WINNER';
      } else {
        chosenType = `🎯 ${speed} km/h SINNER GEFÜHLVOLLER STOPPBALL (Kurz hinters Netzkabel)`;
        endReason = 'SINNER DROP-SHOT WINNER';
      }

      return createRallyShot({
        shooter: fromHitter,
        startPos: startPosition.clone(),
        targetPos: new THREE.Vector3(targetX, targetY, targetZ),
        bouncePos: dropBouncePos,
        duration: 1.45,
        progress: 0.0,
        netHeight: 1.18,
        shotType: chosenType,
        strokeSide,
        spinType,
        rpm,
        speedKmh: speed,
        hasBounced: false,
        isDecisive: isDecisive || Math.random() < 0.45,
        isServe: false,
        servePhase: 0.0,
        isDropShot: true,
        isNetError,
        isOutError,
        isNetCord,
        endReason,
        pointWinner
      });
    } else if (wantsNetVolley) {
      // 🎾 RECEIVER RÜCKT WEIT VOR ANS NETZ
      isVolley = true;
      isNetRush = true;
      targetZ = nextHitterSideSign * (1.8 + Math.random() * 2.0);

      if (forceMode === 'volley') {
        volleyKind = 'drive';
      } else {
        const vTypes: Array<'drive' | 'stop' | 'reflex' | 'smash' | 'punch'> = ['drive', 'stop', 'reflex', 'punch'];
        volleyKind = vTypes[Math.floor(Math.random() * vTypes.length)];
      }

      if (volleyKind === 'stop' || volleyKind === 'reflex') {
        targetY = 1.1 + Math.random() * 0.4;
      } else {
        targetY = 1.5 + Math.random() * 0.6;
      }

      if (isDecisive) {
        if (volleyKind === 'stop') {
          chosenType = isAlcaraz ? '💫 GENIALER ALCARAZ STOPPVOLLEY WINNER (Direkt am Netzkabel)' : '🎯 GEFÜHLVOLLER SINNER STOPPVOLLEY WINNER';
          endReason = 'STOPPVOLLEY WINNER';
          speed = 135;
          spinType = 'slice';
          rpm = 2400;
        } else if (strokeSide === 'forehand') {
          chosenType = isAlcaraz ? '⚡ 216 km/h ALCARAZ DRIVE-VOLLEY WINNER (Am Netz)' : '⚡ 212 km/h SINNER VORHAND-DRIVE-VOLLEY WINNER';
          endReason = 'DRIVE-VOLLEY WINNER';
          speed = 214;
          spinType = 'topspin';
          rpm = 2800;
        } else {
          chosenType = isSinner ? '⚡ 132 km/h SINNER RÜCKHAND-LASER VOLLEY WINNER' : '🚀 204 km/h ALCARAZ RÜCKHAND-CROSS-VOLLEY WINNER';
          endReason = 'CROSS-VOLLEY WINNER';
          speed = 204;
          spinType = 'flat';
          rpm = 2200;
        }
        pointWinner = nextHitter;
      } else {
        if (volleyKind === 'stop') {
          chosenType = isAlcaraz ? '💫 ALCARAZ DISGUISED STOPPBALL (Gefühlvoll ans Netzkabel)' : '🎯 SINNER NETZ-STOPPVOLLEY';
          speed = 130;
          spinType = 'slice';
          rpm = 2200;
        } else if (volleyKind === 'reflex') {
          chosenType = '⚡ BLITZSCHNELLER REFLEX-VOLLEY AM NETZKABEL';
          speed = 198;
          spinType = 'flat';
          rpm = 2000;
        } else if (strokeSide === 'forehand') {
          chosenType = isAlcaraz ? '🌪️ ALCARAZ VORHAND-VOLLEY DIREKTABNAHME' : '⚡ SINNER VORHAND-VOLLEY PUNCH';
          speed = 192;
          spinType = 'topspin';
          rpm = 2600;
        } else {
          chosenType = isSinner ? '⚡ SINNER 2-HAND-RÜCKHAND VOLLEY' : '🌀 ALCARAZ RÜCKHAND-PUNCH-VOLLEY';
          speed = 188;
          spinType = 'flat';
          rpm = 2100;
        }
      }
    } else if (wasShooterAtNet) {
      const isDrop = Math.random() < 0.35;
      if (isDrop) {
        targetZ = nextHitter === 1 ? (-2.8 - Math.random() * 1.8) : (2.8 + Math.random() * 1.8);
        targetY = 1.3 + Math.random() * 0.4;
        targetX = (Math.random() - 0.5) * 4.2;
      } else {
        targetZ = nextHitterSideSign * 10.2;
        targetY = 1.6 + Math.random() * 0.8;
      }
    } else {
      targetZ = nextHitterSideSign * 9.8;
      targetY = 1.7 + Math.random() * 0.9;
    }

    if (!isVolley && !isSmash && !isLobSetup && !isDropShot && !isNetError && !isOutError && !isNetCord) {
      if (isDecisive) {
        if (isSinner) {
          // --- JANNIK SINNER WINNER SCHLÄGE ---
          if (strokeSide === 'backhand') {
            chosenType = '⚡ 132 km/h SINNER RÜCKHAND-LASER (Down-the-Line • ATP Tour-Best!)';
            endReason = 'SINNER BACKHAND LASER';
            speed = 132;
            spinType = 'flat';
            rpm = 2200;
          } else {
            chosenType = '💥 176 km/h SINNER FLAT-VORHAND WINNER (Tiefe Grundlinien-Laser)';
            endReason = 'SINNER FOREHAND WINNER';
            speed = 176;
            spinType = 'flat';
            rpm = 2287;
          }
        } else {
          // --- CARLOS ALCARAZ WINNER SCHLÄGE ---
          if (strokeSide === 'forehand') {
            chosenType = '🌪️ 3.200 RPM ALCARAZ HEAVY-TOPSPIN WINNER (Inside-Out Winkel)';
            endReason = 'ALCARAZ FOREHAND WINNER';
            speed = 182;
            spinType = 'topspin';
            rpm = 3200;
          } else {
            chosenType = '🚀 208 km/h ALCARAZ RÜCKHAND-LONGLINE PASSINGSHOT (Aus vollem Spagat)';
            endReason = 'ALCARAZ PASSINGSHOT';
            speed = 208;
            spinType = 'topspin';
            rpm = 2900;
          }
        }
        pointWinner = fromHitter;
      } else {
        if (isSinner) {
          // --- SINNER GRUNDLINIENSCHLÄGE ---
          if (strokeSide === 'forehand') {
            const fShots = [
              '💥 2.287 RPM SINNER FLAT-VORHAND (Hohe Grundlinien-Geschwindigkeit)',
              '⚡ SINNER INSIDE-OUT VORHAND (Präzision in die Ecken)',
              '🎯 SINNER VORHAND-CROSS (Aggressive Länge)'
            ];
            chosenType = fShots[Math.floor(Math.random() * fShots.length)];
            speed = Math.round(168 + Math.random() * 18);
            spinType = 'flat';
            rpm = 2287;
          } else {
            if (isBackhandSlice) {
              chosenType = '🎯 SINNER DEFENSIV-SLICE (Tiefe Grundlinien-Stabilisierung)';
              speed = Math.round(118 + Math.random() * 10);
              spinType = 'slice';
              rpm = 2100;
            } else {
              const bShots = [
                '⚡ 130 km/h SINNER 2-HAND-RÜCKHAND (Laser-Geschwindigkeit)',
                '🚀 SINNER RÜCKHAND-CROSS-SPEED (Ice-Cold Placement)',
                '🎯 SINNER RÜCKHAND-LONGLINE DRIVE (34% Down-the-Line)'
              ];
              chosenType = bShots[Math.floor(Math.random() * bShots.length)];
              speed = Math.round(126 + Math.random() * 10);
              spinType = 'flat';
              rpm = 2200;
            }
          }
        } else {
          // --- ALCARAZ GRUNDLINIENSCHLÄGE ---
          if (strokeSide === 'forehand') {
            const fShots = [
              '🌪️ 3.200 RPM ALCARAZ HEAVY-TOPSPIN (Hoher aggressiver Absprung)',
              '💥 ALCARAZ POWER-VORHAND (Mit dynamischem Absprung)',
              '💫 ALCARAZ INSIDE-IN FOREHAND (Peitsche in die Vorhand-Ecke)'
            ];
            chosenType = fShots[Math.floor(Math.random() * fShots.length)];
            speed = Math.round(165 + Math.random() * 22);
            spinType = 'topspin';
            rpm = 3200;
          } else {
            if (isBackhandSlice) {
              chosenType = '🌀 3.100 RPM ALCARAZ BACKHAND-SLICE (Flacher, giftiger Ballsprung)';
              speed = Math.round(112 + Math.random() * 14);
              spinType = 'slice';
              rpm = 3100;
            } else {
              const bShots = [
                '🚀 ALCARAZ RÜCKHAND-DRIVE (Vollgas aus der Drehung)',
                '🎯 ALCARAZ RÜCKHAND-CROSS TOPSPIN (Hohe Rotation)'
              ];
              chosenType = bShots[Math.floor(Math.random() * bShots.length)];
              speed = Math.round(138 + Math.random() * 25);
              spinType = 'topspin';
              rpm = 2850;
            }
          }
        }
      }
    }

    const isFast = chosenType.includes('WINNER') || speed > 200 || isVolley;
    const duration = isNetError ? 0.95 : isNetCord ? 1.45 : (isVolley ? 0.92 : (isFast ? 1.02 : (spinType === 'slice' ? 1.35 : 1.25)));
    const netHeight = isNetError ? (0.75 + Math.random() * 0.14) : isNetCord ? 1.05 : (isVolley ? (1.30 + Math.random() * 0.35) : (spinType === 'slice' ? 1.25 : (spinType === 'topspin' ? 1.95 : 1.65)));

    const bounceZ = nextHitterSideSign * (5.5 + Math.random() * 3.0);
    const bounceX = THREE.MathUtils.lerp(startPosition.x, targetX, 0.70);
    const bouncePosition = new THREE.Vector3(bounceX, 0.105, bounceZ);

    return createRallyShot({
      shooter: fromHitter,
      startPos: startPosition.clone(),
      targetPos: new THREE.Vector3(targetX, targetY, targetZ),
      bouncePos: bouncePosition,
      duration,
      progress: 0.0,
      netHeight,
      shotType: chosenType,
      strokeSide,
      spinType,
      rpm,
      speedKmh: speed,
      hasBounced: false,
      isDecisive,
      isServe: false,
      servePhase: 0.0,
      isVolley,
      isNetRush,
      isSmash,
      isLob,
      isDropShot,
      lobKind,
      isLobSetup,
      volleyKind,
      isNetError,
      isOutError,
      isNetCord,
      endReason,
      pointWinner
    });
  };

  const lastVolleyTrigger = useRef(manualVolleyTrigger || 0);
  const lastSmashTrigger = useRef(manualSmashTrigger || 0);
  const lastTopspinLobTrigger = useRef(manualTopspinLobTrigger || 0);
  const lastSkyLobTrigger = useRef(manualSkyLobTrigger || 0);
  const lastServiceWinnerTrigger = useRef(manualServiceWinnerTrigger || 0);
  const lastDropTrigger = useRef(manualDropTrigger || 0);
  const lastTopspinTrigger = useRef(manualTopspinTrigger || 0);
  const lastLaserTrigger = useRef(manualLaserTrigger || 0);
  const lastSliceTrigger = useRef(manualSliceTrigger || 0);
  const lastNetErrorTrigger = useRef(manualNetErrorTrigger || 0);
  const lastOutErrorTrigger = useRef(manualOutErrorTrigger || 0);
  const celebrationTimerRef = useRef(0);
  const celebrationTotalDurationRef = useRef(2.6);
  const celebrationIsGameWinRef = useRef(false);
  const celebrationWinnerRef = useRef<1 | 2 | null>(null);
  const p1PsychRef = useRef<PlayerLivePsychology>({
    momentum: 0.2,
    frustration: 0.1,
    stamina: 1.0,
    consecutiveWinners: 0,
    consecutiveErrors: 0,
    currentEmotion: 'idle_ready'
  });
  const p2PsychRef = useRef<PlayerLivePsychology>({
    momentum: 0.2,
    frustration: 0.1,
    stamina: 1.0,
    consecutiveWinners: 0,
    consecutiveErrors: 0,
    currentEmotion: 'idle_ready'
  });
  const p1ActiveEmotionRef = useRef<PlayerEmotionalState>('idle_ready');
  const p2ActiveEmotionRef = useRef<PlayerEmotionalState>('idle_ready');
  const p1TimingRef = useRef<PlayerEmotionTiming>({ delay: 0.25, duration: 2.8 });
  const p2TimingRef = useRef<PlayerEmotionTiming>({ delay: 0.50, duration: 2.4 });
  const nextServeConfigRef = useRef<{ server: 1 | 2; attempt: 1 | 2 } | null>(null);
  const ballCoastRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    spinType?: TennisSpinType;
    rpm?: number;
  } | null>(null);
  const prevBallPosRef = useRef(new THREE.Vector3(0, 2.2, -9.8));
  const ballVelocityRef = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (manualVolleyTrigger && manualVolleyTrigger !== lastVolleyTrigger.current) {
      lastVolleyTrigger.current = manualVolleyTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'volley');
      setMatchScore(s => ({
        ...s,
        lastMessage: '⚡ NETZANGRIFF! Volley-Duell am Netz ausgelöst!'
      }));
    }
  }, [manualVolleyTrigger]);

  useEffect(() => {
    if (manualSmashTrigger && manualSmashTrigger !== lastSmashTrigger.current) {
      lastSmashTrigger.current = manualSmashTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'smash');
      setMatchScore(s => ({
        ...s,
        lastMessage: '🔥 248 km/h MONSTER-SMASH AUSGELÖST!'
      }));
    }
  }, [manualSmashTrigger]);

  useEffect(() => {
    if (manualTopspinLobTrigger && manualTopspinLobTrigger !== lastTopspinLobTrigger.current) {
      lastTopspinLobTrigger.current = manualTopspinLobTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'topspin_lob');
      setMatchScore(s => ({
        ...s,
        lastMessage: '🌈 10.5m TOPSPIN-LOB WINNER AUSGELÖST!'
      }));
    }
  }, [manualTopspinLobTrigger]);

  useEffect(() => {
    if (manualSkyLobTrigger && manualSkyLobTrigger !== lastSkyLobTrigger.current) {
      lastSkyLobTrigger.current = manualSkyLobTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'sky_lob');
      setMatchScore(s => ({
        ...s,
        lastMessage: '🛡️ 11.2m DEFENSIVE NOT-KERZE (SKY-LOB)!'
      }));
    }
  }, [manualSkyLobTrigger]);

  useEffect(() => {
    if (manualServiceWinnerTrigger && manualServiceWinnerTrigger !== lastServiceWinnerTrigger.current) {
      lastServiceWinnerTrigger.current = manualServiceWinnerTrigger;
      const currentServer = matchScore.server;
      triggerGrandSlamServe(currentServer, true);
      setMatchScore(s => ({
        ...s,
        lastMessage: '🎯 228 km/h SERVICE WINNER (Return-Fehler) AUSGELÖST!'
      }));
    }
  }, [manualServiceWinnerTrigger]);

  useEffect(() => {
    if (manualDropTrigger && manualDropTrigger !== lastDropTrigger.current) {
      lastDropTrigger.current = manualDropTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'stop');
      setMatchScore(s => ({
        ...s,
        lastMessage: '💫 2.600 RPM ALCARAZ DISGUISED STOPPBALL AUSGELÖST!'
      }));
    }
  }, [manualDropTrigger]);

  useEffect(() => {
    if (manualTopspinTrigger && manualTopspinTrigger !== lastTopspinTrigger.current) {
      lastTopspinTrigger.current = manualTopspinTrigger;
      const currentHitter = 2; // Alcaraz Signature Topspin
      const currentPos = racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1);
      setMatchScore(s => ({
        ...s,
        lastMessage: '🌪️ 3.200 RPM HEAVY-TOPSPIN WINNER AUSGELÖST!'
      }));
    }
  }, [manualTopspinTrigger]);

  useEffect(() => {
    if (manualLaserTrigger && manualLaserTrigger !== lastLaserTrigger.current) {
      lastLaserTrigger.current = manualLaserTrigger;
      const currentHitter = 1; // Sinner Signature Backhand Laser
      const currentPos = racket1WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1);
      setMatchScore(s => ({
        ...s,
        lastMessage: '⚡ 132 km/h SINNER RÜCKHAND-LASER AUSGELÖST!'
      }));
    }
  }, [manualLaserTrigger]);

  useEffect(() => {
    if (manualSliceTrigger && manualSliceTrigger !== lastSliceTrigger.current) {
      lastSliceTrigger.current = manualSliceTrigger;
      const currentHitter = 2; // Alcaraz Signature Backhand Slice
      const currentPos = racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1);
      setMatchScore(s => ({
        ...s,
        lastMessage: '🌀 3.100 RPM ALCARAZ BACKHAND-SLICE AUSGELÖST!'
      }));
    }
  }, [manualSliceTrigger]);

  useEffect(() => {
    if (manualNetErrorTrigger && manualNetErrorTrigger !== lastNetErrorTrigger.current) {
      lastNetErrorTrigger.current = manualNetErrorTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'net_error');
      setMatchScore(s => ({
        ...s,
        lastMessage: '🕸️ NETZFEHLER! Ball bleibt im Netz hängen!'
      }));
    }
  }, [manualNetErrorTrigger]);

  useEffect(() => {
    if (manualOutErrorTrigger && manualOutErrorTrigger !== lastOutErrorTrigger.current) {
      lastOutErrorTrigger.current = manualOutErrorTrigger;
      const currentHitter = shotRef.current.shooter;
      const currentPos = currentHitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();
      shotRef.current = createNextShot(currentHitter, currentPos, matchScore.rallyCount + 1, 'out_error');
      setMatchScore(s => ({
        ...s,
        lastMessage: '⚠️ OUT! Ball segelt knapp hinter die Linie!'
      }));
    }
  }, [manualOutErrorTrigger]);

  useEffect(() => {
    const c1 = new Supertechno50FBXModel(() => setCrane1(c1));
    const c2 = new Supertechno50FBXModel(() => setCrane2(c2));
    return () => {
      c1.dispose();
      c2.dispose();
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const playFactor = isAIvsAI ? 1.0 : 0.0;
    const dt = Math.min(0.05, delta) * gameSpeed * playFactor;
    const shot = shotRef.current;

    const kin1 = kin1Ref.current;
    const kin2 = kin2Ref.current;

    // 🎾 UNIFIED CONTINUOUS BALL PHYSICS (LÄUFT IMMER FLÜSSIG WEITER, WENN EIN BALLWECHSEL BEENDET IST)
    const updateBallCoastingPhysics = (deltaTime: number) => {
      const bc = ballCoastRef.current;
      if (!bc || !bc.active) return;

      // 1. Aerodynamik & Schwerkraft
      bc.vel.y -= 9.81 * deltaTime;
      const speed = bc.vel.length();
      if (speed > 0.05) {
        // Luftwiderstand nach ITF-Parametern
        const dragFactor = Math.max(0, 1.0 - (0.008 + (speed / 100) * 0.012) * deltaTime);
        bc.vel.multiplyScalar(dragFactor);
      }
      bc.pos.addScaledVector(bc.vel, deltaTime);

      // 2. Bodenkollision & physikalischer Stoß / Rebound
      if (bc.pos.y <= 0.102) {
        bc.pos.y = 0.102;
        if (Math.abs(bc.vel.y) > 0.30) {
          // Elastischer Stoß mit Belagsreibung und Drall
          const vRebound = calculateBallBounceReboundVelocity(bc.vel, courtSurface, bc.spinType, bc.rpm || 0);
          bc.vel.copy(vRebound);
        } else {
          // Reines Rollen auf dem Boden mit Belagsreibung
          bc.vel.y = 0;
          const mu = SURFACE_FRICTION[courtSurface] ?? 0.40;
          const rollFriction = Math.max(0, 1.0 - (1.4 + mu * 2.8) * deltaTime);
          bc.vel.x *= rollFriction;
          bc.vel.z *= rollFriction;
        }
      }

      // 3. Netz-Kollision (Netz bei Z = 0, Höhe = 1.07m, Breite = ±6.4m)
      if (Math.abs(bc.pos.z) < 0.20 && Math.abs(bc.pos.x) < 6.4 && bc.pos.y < 1.07) {
        // Ball darf das Netz bei Y < 1.07m NIEMALS durchdringen!
        const approachSide = Math.sign(bc.pos.z - bc.vel.z * deltaTime) || Math.sign(bc.pos.z) || 1;
        bc.pos.z = approachSide * 0.20;
        bc.vel.z = -Math.sign(approachSide) * Math.abs(bc.vel.z) * 0.20; // Reboundet immer strikt zurück auf die Anflugseite
        bc.vel.x *= 0.5;
        bc.vel.y = Math.max(0, bc.vel.y * 0.3);
      }

      // 4. Stadion-Banden & Rückwand-Abprall (Z = ±21.5m, X = ±10.5m)
      if (Math.abs(bc.pos.z) > 21.5) {
        bc.pos.z = Math.sign(bc.pos.z) * 21.5;
        bc.vel.z = -bc.vel.z * 0.42;
        bc.vel.y = Math.max(0.5, bc.vel.y * 0.6 + 1.2); // Banden-Kick
      }
      if (Math.abs(bc.pos.x) > 10.5) {
        bc.pos.x = Math.sign(bc.pos.x) * 10.5;
        bc.vel.x = -bc.vel.x * 0.42;
        bc.vel.y = Math.max(0.5, bc.vel.y * 0.6 + 1.0);
      }

      // 5. Visualisierung kontinuierlich synchronisieren
      setBallVisualPos(bc.pos.clone());
    };

    // --- 🔄 DYNAMISCHER SEITENWECHSEL (CHANGE OF ENDS: KRÄNE FAHREN MIT UNTERSCHIEDLICHEN GESCHWINDIGKEITEN & EMOTIONEN) ---
    if (sideChangeTimerRef.current > 0) {
      sideChangeTimerRef.current -= dt;
      updateBallCoastingPhysics(dt);
      const totalDur = sideChangeTotalDurationRef.current || 8.0;
      const elapsed = Math.max(0, totalDur - sideChangeTimerRef.current);

      const isP1CurrentlySouth = p1IsSouthRef.current;
      const p1StartZ = isP1CurrentlySouth ? -15.2 : 15.2;
      const p1EndZ = isP1CurrentlySouth ? 15.2 : -15.2;
      const p2StartZ = isP1CurrentlySouth ? 15.2 : -15.2;
      const p2EndZ = isP1CurrentlySouth ? -15.2 : 15.2;

      // Bypass-Schienenbreite (X-Richtung): Kran 1 fährt auf Westseite (-8.6m), Kran 2 auf Ostseite (+8.6m)
      const p1BypassX = -8.6;
      const p2BypassX = 8.6;

      // ⏱️ KRAN 1 (Jannik Sinner 🇮🇹 - Bedächtig, stoisch, gleichmäßiges Tempo, Schläger-Check)
      // Sinner atmet erst 0.6s durch, fährt dann mit ruhigem, ökonomischem Tempo
      const p1T = THREE.MathUtils.clamp((elapsed - 0.6) / Math.max(1.0, totalDur - 1.2), 0, 1);
      let p1X = 0, p1Z = p1StartZ, p1RotY = isP1CurrentlySouth ? Math.PI : 0;

      if (p1T < 0.22) {
        // Phase 1 (Sinner): Ruhiges Ausscheren zur Westseite (-8.6m)
        const subP = p1T / 0.22;
        const smoothP = THREE.MathUtils.smoothstep(subP, 0, 1);
        p1X = THREE.MathUtils.lerp(0, p1BypassX, smoothP);
        p1Z = p1StartZ;
        p1RotY = isP1CurrentlySouth ? Math.PI : 0;

        kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 3.0, dt * 3.0);
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 2.15, dt * 3.0);
        kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 14.0, dt * 3.0);
        kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, isP1CurrentlySouth ? -20 : 20, dt * 3.0);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, -12.0, dt * 3.0); // Schaut konzentriert nach unten
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 3.0);
        kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 0, dt * 3.0);
      } else if (p1T < 0.78) {
        // Phase 2 (Sinner): Gleichmäßige, stoische Fahrt an der Westtribüne / Spielerbank vorbei
        const subP = (p1T - 0.22) / 0.56;
        const smoothP = subP < 0.5 ? 2 * subP * subP : 1 - Math.pow(-2 * subP + 2, 2) / 2;
        p1X = p1BypassX;
        p1Z = THREE.MathUtils.lerp(p1StartZ, p1EndZ, smoothP);
        p1RotY = isP1CurrentlySouth ? Math.PI : 0;

        // Saiten-Inspektion & ruhiges Nicken bei Netzpassage (Z ≈ 0)
        const nearNet = Math.sin(subP * Math.PI);
        kin1.teleExtension = 3.0 + nearNet * 0.4;
        kin1.boomTilt = 14.0 - nearNet * 2.0;
        kin1.headTilt = -18.0 + Math.sin(subP * Math.PI * 4) * 4.0; // Akribischer Blick auf die Bespannung
        kin1.headPan = nearNet * 22.0; // Blickkontakt rüber nach Ost zu Alcaraz & Chair Umpire
        kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, 0, dt * 2.0);
      } else {
        // Phase 3 (Sinner): Einschwenken auf die neue Grundlinie & stoischer Ready-Stance
        const subP = (p1T - 0.78) / 0.22;
        const smoothP = THREE.MathUtils.smoothstep(subP, 0, 1);
        p1X = THREE.MathUtils.lerp(p1BypassX, 0, smoothP);
        p1Z = p1EndZ;

        const targetRotP1 = isP1CurrentlySouth ? 0 : Math.PI;
        p1RotY = THREE.MathUtils.lerp(isP1CurrentlySouth ? Math.PI : 0, targetRotP1, smoothP);

        kin1.teleExtension = THREE.MathUtils.lerp(3.0, 4.2, smoothP);
        kin1.columnElevation = THREE.MathUtils.lerp(2.15, 1.85, smoothP);
        kin1.boomTilt = THREE.MathUtils.lerp(14.0, 8.0, smoothP);
        kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, 0, dt * 4.0);
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 4.0);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 0, dt * 4.0);
      }

      // ⏱️ KRAN 2 (Carlos Alcaraz 🇪🇸 - Spritziger Antritt, Fan-Interaktion, schnelleres Parken & Racket-Twirl)
      // Alcaraz startet sofort bei t=0.0s, sprintet los und parkt früher ein
      const p2T = THREE.MathUtils.clamp(elapsed / Math.max(1.0, totalDur - 1.6), 0, 1);
      let p2X = 0, p2Z = p2StartZ, p2RotY = isP1CurrentlySouth ? 0 : Math.PI;

      if (p2T < 0.16) {
        // Phase 1 (Alcaraz): Schnelles dynamisches Ausscheren zur Ostseite (+8.6m)
        const subP = p2T / 0.16;
        const smoothP = THREE.MathUtils.smoothstep(subP, 0, 1);
        p2X = THREE.MathUtils.lerp(0, p2BypassX, smoothP);
        p2Z = p2StartZ;
        p2RotY = isP1CurrentlySouth ? 0 : Math.PI;

        kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 3.4, dt * 5.0);
        kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 2.25, dt * 5.0);
        kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 18.0, dt * 5.0);
        kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, isP1CurrentlySouth ? 30 : -30, dt * 5.0);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 14.0, dt * 5.0); // Schaut stolz hoch zur Fankurve
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 40.0, dt * 5.0);
      } else if (p2T < 0.72) {
        // Phase 2 (Alcaraz): Energetische Fahrt zur Osttribüne mit Fan-Jubel & Schläger-Wippen
        const subP = (p2T - 0.16) / 0.56;
        // Dynamische S-Kurve: schnelles Anfahren, Verlangsamen am Netz für Fan-Jubel, schneller Schlussspurt
        const smoothP = subP < 0.5 ? 4 * subP * subP * subP : 1 - Math.pow(-2 * subP + 2, 3) / 2;
        p2X = p2BypassX;
        p2Z = THREE.MathUtils.lerp(p2StartZ, p2EndZ, smoothP);
        p2RotY = isP1CurrentlySouth ? 0 : Math.PI;

        const fanWave = Math.sin(subP * Math.PI * 3);
        const nearNet = Math.sin(subP * Math.PI);

        kin2.teleExtension = 3.4 + nearNet * 0.8;
        kin2.boomTilt = 18.0 + nearNet * 6.0; // Hebt den Ausleger stolz an
        kin2.columnElevation = 2.25 + nearNet * 0.15;
        kin2.headTilt = 12.0 + fanWave * 8.0; // Dynamisches Wippen
        kin2.headPan = THREE.MathUtils.lerp(45.0, -35.0, nearNet); // Schwenkt von der Tribüne kurz rüber zu Sinner
        kin2.headRoll = Math.sin(subP * Math.PI * 6) * 15.0; // Verspieltes Schläger-Kippen
      } else {
        // Phase 3 (Alcaraz): Flinkes Einschwenken auf die neue Grundlinie mit 360° Racket-Twirl
        const subP = (p2T - 0.72) / 0.28;
        const smoothP = THREE.MathUtils.smoothstep(subP, 0, 1);
        p2X = THREE.MathUtils.lerp(p2BypassX, 0, smoothP);
        p2Z = p2EndZ;

        const targetRotP2 = isP1CurrentlySouth ? Math.PI : 0;
        p2RotY = THREE.MathUtils.lerp(isP1CurrentlySouth ? 0 : Math.PI, targetRotP2, smoothP);

        // Spektakulärer Racket-Twirl beim Einparken
        const twirlAngle = (1.0 - smoothP) * 360.0;
        kin2.teleExtension = THREE.MathUtils.lerp(3.4, 4.2, smoothP);
        kin2.columnElevation = THREE.MathUtils.lerp(2.25, 1.85, smoothP);
        kin2.boomTilt = THREE.MathUtils.lerp(18.0, 8.0, smoothP);
        kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, 0, dt * 5.0);
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 5.0);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 0, dt * 5.0);
        kin2.headRoll = twirlAngle;
      }

      // 🎥 DYNAMISCHE TV-BROADCAST SEITENWECHSEL-KAMERA (Schwenkt mit beiden Kränen mit)
      if (orbitControlsRef.current) {
        const controls = orbitControlsRef.current;
        const globalP = Math.min(1.0, elapsed / totalDur);
        const camX = THREE.MathUtils.lerp(-25, -19, Math.sin(globalP * Math.PI));
        const camY = THREE.MathUtils.lerp(17, 11, Math.sin(globalP * Math.PI));
        const camZ = THREE.MathUtils.lerp(p1StartZ * 0.45, p1EndZ * 0.45, globalP);
        camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.08);
        controls.target.lerp(new THREE.Vector3(0, 2.0, 0), 0.08);
        controls.update();
      }

      // Position und Rotation der Dolly-Gruppen setzen
      if (dolly1GroupRef.current) {
        dolly1GroupRef.current.position.set(p1X, 0, p1Z);
        dolly1GroupRef.current.rotation.set(0, p1RotY, 0);
      }
      if (dolly2GroupRef.current) {
        dolly2GroupRef.current.position.set(p2X, 0, p2Z);
        dolly2GroupRef.current.rotation.set(0, p2RotY, 0);
      }

      if (crane1 && crane1.isLoaded) crane1.updateNodes({ ...kin1, dollyTrack: 0 });
      if (crane2 && crane2.isLoaded) crane2.updateNodes({ ...kin2, dollyTrack: 0 });

      // Nach Abschluss des Seitenwechsels Seiten-Zustand umkehren!
      if (sideChangeTimerRef.current <= 0) {
        p1IsSouthRef.current = !p1IsSouthRef.current;
        const nextServer = celebrationWinnerRef.current || 1;
        celebrationWinnerRef.current = null;

        // 🎬 AGENT 20: GENERATE DYNAMIC NON-REPETITIVE DIRECTOR PLAN FOR NEW GAME
        currentPointIndexRef.current += 1;
        pointDirectorPlanRef.current = generatePointDirectorPlan(
          currentPointIndexRef.current,
          nextServer,
          pointDirectorPlanRef.current
        );

        triggerGrandSlamServe(nextServer);
      }
      return;
    }

    // --- 🌟 FULL EXTENSION SHOWCASE & INTRODUCTORY CAMERA TOUR (MATCH START & AFTER EACH GAME) ---
    if (showcaseTimerRef.current > 0) {
      showcaseTimerRef.current -= dt;
      updateBallCoastingPhysics(dt);
      const totalDuration = 4.8;
      const tElapsed = totalDuration - showcaseTimerRef.current;
      const progress = Math.min(1.0, Math.max(0.0, tElapsed / totalDuration));

      if (progress < 0.50) {
        // Phase 1 (0.0 - 2.4s): MAJESTÄTISCHES VOLLES AUSFAHREN (bis 11.3m) & HUB (3.25m)
        const p1 = progress / 0.50;
        const smoothP = Math.sin(p1 * Math.PI / 2);

        const ext = THREE.MathUtils.lerp(5.5, 11.3, smoothP);
        const col = THREE.MathUtils.lerp(1.85, 3.25, smoothP);
        const tilt = THREE.MathUtils.lerp(8, 30, smoothP);

        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, 0, dt * 4.0);
        kin1.columnElevation = col;
        kin1.boomTilt = tilt;
        kin1.teleExtension = ext;
        kin1.headPan = Math.sin(tElapsed * 2.5) * 22.0;
        kin1.headTilt = -16 + Math.cos(tElapsed * 2.0) * 12.0;
        kin1.headRoll = Math.sin(tElapsed * 3.0) * 28.0;

        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, 0, dt * 4.0);
        kin2.columnElevation = col;
        kin2.boomTilt = tilt;
        kin2.teleExtension = ext;
        kin2.headPan = -Math.sin(tElapsed * 2.5) * 22.0;
        kin2.headTilt = -16 + Math.cos(tElapsed * 2.0) * 12.0;
        kin2.headRoll = -Math.sin(tElapsed * 3.0) * 28.0;
      } else {
        // Phase 2 (2.4 - 4.8s): MAJESTÄTISCHES EINFIEHREN & READY-STANCE (11.3m -> 5.5m)
        const p2 = (progress - 0.50) / 0.50;
        const smoothP = Math.sin(p2 * Math.PI / 2);

        const ext = THREE.MathUtils.lerp(11.3, 5.5, smoothP);
        const col = THREE.MathUtils.lerp(3.25, 1.85, smoothP);
        const tilt = THREE.MathUtils.lerp(30, 8, smoothP);

        kin1.columnElevation = col;
        kin1.boomTilt = tilt;
        kin1.teleExtension = ext;
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 6.0);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 0, dt * 6.0);
        kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 0, dt * 6.0);

        kin2.columnElevation = col;
        kin2.boomTilt = tilt;
        kin2.teleExtension = ext;
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 6.0);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 0, dt * 6.0);
        kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, 0, dt * 6.0);
      }

      // 🎥 INTRODUKTORISCHER PERSPEKTIVENWECHSEL (Einführender Kamera-Flug)
      if (orbitControlsRef.current) {
        const controls = orbitControlsRef.current;
        if (progress < 0.35) {
          // Perspektive 1: Spektakuläre Weitwinkel-Aufnahme von Südwest, blickt empor auf die 11.3m ausfahrenden Kräne
          const subP = progress / 0.35;
          const camX = THREE.MathUtils.lerp(-28, -22, subP);
          const camY = THREE.MathUtils.lerp(18, 14, subP);
          const camZ = THREE.MathUtils.lerp(-18, -4, subP);
          camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.12);
          controls.target.lerp(new THREE.Vector3(0, 3.8, 0), 0.12);
        } else if (progress < 0.70) {
          // Perspektive 2: Dynamischer Kurvenflug über das Center-Court Netz mit Blick auf beide Ausleger
          const subP = (progress - 0.35) / 0.35;
          const camX = THREE.MathUtils.lerp(-22, -18, subP);
          const camY = THREE.MathUtils.lerp(14, 11, subP);
          const camZ = THREE.MathUtils.lerp(-4, 16, subP);
          camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.12);
          controls.target.lerp(new THREE.Vector3(0, 2.5, 0), 0.12);
        } else {
          // Perspektive 3: Sanfte Landung in TV-Broadcast Position [-24, 16, 0]
          camera.position.lerp(new THREE.Vector3(-24, 16.0, 0), 0.14);
          controls.target.lerp(new THREE.Vector3(0, 1.2, 0), 0.14);
        }
        controls.update();
      }

      const isP1SouthShowcase = p1IsSouthRef.current;
      const baseZ1Showcase = isP1SouthShowcase ? -15.2 : 15.2;
      const rotY1Showcase = isP1SouthShowcase ? Math.PI : 0;
      const baseZ2Showcase = isP1SouthShowcase ? 15.2 : -15.2;
      const rotY2Showcase = isP1SouthShowcase ? 0 : Math.PI;

      if (dolly1GroupRef.current) {
        dolly1GroupRef.current.position.set(kin1.dollyTrack, 0, baseZ1Showcase);
        dolly1GroupRef.current.rotation.set(0, rotY1Showcase, 0);
      }
      if (dolly2GroupRef.current) {
        dolly2GroupRef.current.position.set(kin2.dollyTrack, 0, baseZ2Showcase);
        dolly2GroupRef.current.rotation.set(0, rotY2Showcase, 0);
      }
      if (crane1 && crane1.isLoaded) crane1.updateNodes({ ...kin1, dollyTrack: 0 });
      if (crane2 && crane2.isLoaded) crane2.updateNodes({ ...kin2, dollyTrack: 0 });

      if (showcaseTimerRef.current <= 0) {
        const nextServer = celebrationWinnerRef.current || 1;
        triggerGrandSlamServe(nextServer);
      }
      return;
    }

    // --- ⚡ CALM TRANSITION & BALL COAST-OUT BETWEEN POINTS (REALISTIC SPACING & ZERO FREEZE) ---
    if (celebrationTimerRef.current > 0) {
      celebrationTimerRef.current -= dt;
      updateBallCoastingPhysics(dt);

      // Beide Kräne gleiten mit lebendigen Gesten und asynchronen Emotionen in die Grundlinien-Bereitschaftsstellung zurück (Agent 18: tennis_emotions)
      const totalDur = celebrationTotalDurationRef.current || 3.2;
      const elapsed = Math.max(0, totalDur - celebrationTimerRef.current);
      const winner = celebrationWinnerRef.current || 1;
      const isGameWin = celebrationIsGameWinRef.current;

      const p1Progress = THREE.MathUtils.clamp((elapsed - p1TimingRef.current.delay) / Math.max(0.2, p1TimingRef.current.duration), 0, 1);
      const p2Progress = THREE.MathUtils.clamp((elapsed - p2TimingRef.current.delay) / Math.max(0.2, p2TimingRef.current.duration), 0, 1);

      const p1Off = calculateEmotionKinematicOffsets(1, winner === 1, p1Progress, isGameWin, shotRef.current?.shotType, p1ActiveEmotionRef.current);
      const p2Off = calculateEmotionKinematicOffsets(2, winner === 2, p2Progress, isGameWin, shotRef.current?.shotType, p2ActiveEmotionRef.current);

      kin1.dollyTrack = THREE.MathUtils.clamp(kin1.dollyTrack + p1Off.deltaDolly * dt * 3.0, -7.5, 7.5);
      kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 1.82 + p1Off.deltaColumn, dt * 4.0);
      kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 8.0 + p1Off.deltaBoomTilt, dt * 4.0);
      kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, 4.2 + p1Off.deltaTele, dt * 4.0);
      kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, p1Off.deltaBasePan, dt * 4.0);
      kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, p1Off.deltaHeadTilt, dt * 6.0);
      kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, p1Off.deltaHeadPan, dt * 6.0);
      kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, p1Off.deltaHeadRoll + p1Off.racketSpinAngle * 57.3, dt * 8.0);

      kin2.dollyTrack = THREE.MathUtils.clamp(kin2.dollyTrack + p2Off.deltaDolly * dt * 3.0, -7.5, 7.5);
      kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 1.82 + p2Off.deltaColumn, dt * 4.0);
      kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 8.0 + p2Off.deltaBoomTilt, dt * 4.0);
      kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, 4.2 + p2Off.deltaTele, dt * 4.0);
      kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, p2Off.deltaBasePan, dt * 4.0);
      kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, p2Off.deltaHeadTilt, dt * 6.0);
      kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, p2Off.deltaHeadPan, dt * 6.0);
      kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, p2Off.deltaHeadRoll + p2Off.racketSpinAngle * 57.3, dt * 8.0);

      const baseZ1Celeb = p1IsSouthRef.current ? -15.2 : 15.2;
      const baseZ2Celeb = p1IsSouthRef.current ? 15.2 : -15.2;
      const rotY1Celeb = p1IsSouthRef.current ? Math.PI : 0;
      const rotY2Celeb = p1IsSouthRef.current ? 0 : Math.PI;

      if (dolly1GroupRef.current) {
        dolly1GroupRef.current.position.set(kin1.dollyTrack, 0, baseZ1Celeb);
        dolly1GroupRef.current.rotation.set(0, rotY1Celeb, 0);
      }
      if (dolly2GroupRef.current) {
        dolly2GroupRef.current.position.set(kin2.dollyTrack, 0, baseZ2Celeb);
        dolly2GroupRef.current.rotation.set(0, rotY2Celeb, 0);
      }
      if (crane1 && crane1.isLoaded) crane1.updateNodes({ ...kin1, dollyTrack: 0 });
      if (crane2 && crane2.isLoaded) crane2.updateNodes({ ...kin2, dollyTrack: 0 });

      if (celebrationTimerRef.current <= 0) {
        ballCoastRef.current = null;
        kin1.headRoll = 0;
        kin2.headRoll = 0;
        kin1.basePan = 0;
        kin2.basePan = 0;
        kin1.headPan = 0;
        kin2.headPan = 0;

        if (pendingSideChangeRef.current) {
          pendingSideChangeRef.current = false;
          const sideChangeDur = 8.5 + Math.random() * 2.0;
          sideChangeTimerRef.current = sideChangeDur;
          sideChangeTotalDurationRef.current = sideChangeDur;
          return;
        }

        if (pendingShowcaseRef.current) {
          pendingShowcaseRef.current = false;
          const showcaseDur = 6.0 + Math.random() * 1.8;
          showcaseTimerRef.current = showcaseDur;
          showcaseTypeRef.current = 'gamewin';
          return;
        }

        if (nextServeConfigRef.current) {
          const cfg = nextServeConfigRef.current;
          nextServeConfigRef.current = null;
          triggerGrandSlamServe(cfg.server, false, cfg.attempt);
        } else {
          const nextServer = celebrationWinnerRef.current || 1;
          celebrationWinnerRef.current = null;
          triggerGrandSlamServe(nextServer);
        }
      }

      return;
    }

    shot.progress += dt / Math.max(0.2, shot.duration);
    const p = Math.min(1.0, shot.progress);

    let currentX = shot.startPos.x;
    let currentZ = shot.startPos.z;
    let currentY = 1.8;

    if (shot.isServe) {
      const server = shot.shooter;
      const isSinner = server === 1;
      const readyEndTime = shot.serveReadyFraction ?? 0.44; // Dynamisch variierende Konzentrationsdauer (1.8s bis 6.2s)
      const tossEndTime = shot.serveTossFraction ?? 0.68;  // Ballwurf in Trophy Pose (ca. 1.2s)
      const bounceCount = shot.serveBounceCount ?? (isSinner ? 5 : 6);
      const serverRacketPos = (server === 1 ? racket1WorldPos.current : racket2WorldPos.current).clone();
      const kinServer = server === 1 ? kin1 : kin2;
      const kinReceiver = server === 1 ? kin2 : kin1;
      const rollDir = server === 1 ? 1 : -1;
      const isP1South = p1IsSouthRef.current;
      const serverZSign = (server === 1 && isP1South) || (server === 2 && !isP1South) ? -1 : 1;

      // Dolly bleibt stabil an der Grundlinie
      kinServer.dollyTrack = THREE.MathUtils.lerp(kinServer.dollyTrack, shot.startPos.x, dt * 6.0);
      // Kranarm bleibt während des gesamten Aufschlags absolut eingefahren!
      kinServer.teleExtension = THREE.MathUtils.lerp(kinServer.teleExtension, 0.0, dt * 10.0);

      if (p < readyEndTime) {
        // 🎾 Phase 1: Ball bekommen, Konzentration & echtes physikalisches Ball-Dribbeln an der Grundlinie
        const dribbleProgress = p / readyEndTime;
        const dribbleAngle = dribbleProgress * bounceCount * Math.PI * 2;
        const bounceParabola = Math.abs(Math.sin(dribbleAngle));

        currentX = shot.startPos.x + (isSinner ? -0.28 : 0.28);
        currentZ = shot.startPos.z + serverZSign * 0.85;
        currentY = 0.065 + bounceParabola * 0.72; // Ball dotzt dynamisch bis auf 78cm Höhe

        // 🎾 Der Schläger bleibt während der gesamten Konzentrationsphase absolut ruhig, waagerecht und stabil (kein Wackeln!)
        kinServer.columnElevation = THREE.MathUtils.lerp(kinServer.columnElevation, 1.72, dt * 6.0);
        kinServer.boomTilt = THREE.MathUtils.lerp(kinServer.boomTilt, 8.0, dt * 6.0);
        kinServer.headTilt = THREE.MathUtils.lerp(kinServer.headTilt, 6.0, dt * 6.0);
        kinServer.headRoll = THREE.MathUtils.lerp(kinServer.headRoll, 0.0, dt * 6.0);
        kinServer.headPan = THREE.MathUtils.lerp(kinServer.headPan, 0.0, dt * 6.0);

        serveImpactPosRef.current.copy(serverRacketPos);

        // Receiver: Ruhiger, stabiler Ready-Stance
        kinReceiver.dollyTrack = THREE.MathUtils.lerp(kinReceiver.dollyTrack, shot.targetPos.x * 0.75, dt * 6.0);
        kinReceiver.columnElevation = THREE.MathUtils.lerp(kinReceiver.columnElevation, 1.82, dt * 6.0);
        kinReceiver.boomTilt = THREE.MathUtils.lerp(kinReceiver.boomTilt, 8.0, dt * 6.0);
        kinReceiver.teleExtension = THREE.MathUtils.lerp(kinReceiver.teleExtension, 4.5, dt * 6.0);
        kinReceiver.headTilt = THREE.MathUtils.lerp(kinReceiver.headTilt, -8.0, dt * 6.0);
        kinReceiver.headRoll = THREE.MathUtils.lerp(kinReceiver.headRoll, 0.0, dt * 6.0);
      } else if (p < tossEndTime) {
        // 🚀 Phase 2: Präziser, flüssiger Aufwurf direkt in den Sweet Spot des Schlägers (Trophy Stance)
        const tossT = (p - readyEndTime) / (tossEndTime - readyEndTime);
        const smoothToss = THREE.MathUtils.smoothstep(tossT, 0, 1);
        const tossArc = Math.sin(smoothToss * Math.PI); // Parabelbogen

        // Kran steigt synchron in die Trophy Pose
        kinServer.columnElevation = THREE.MathUtils.lerp(kinServer.columnElevation, 2.50, dt * 9.0);
        kinServer.boomTilt = THREE.MathUtils.lerp(kinServer.boomTilt, 24.0, dt * 9.0);
        kinServer.headTilt = THREE.MathUtils.lerp(kinServer.headTilt, 52.0, dt * 9.0);
        kinServer.headRoll = THREE.MathUtils.lerp(kinServer.headRoll, 32.0 * rollDir, dt * 9.0);
        kinServer.headPan = THREE.MathUtils.lerp(kinServer.headPan, -4.0 * rollDir, dt * 8.0);

        // Ball steigt aus der Hand direkt in den Schläger-Sweet-Spot auf
        currentX = THREE.MathUtils.lerp(shot.startPos.x, serverRacketPos.x, smoothToss);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z + serverZSign * 0.60, serverRacketPos.z, smoothToss);
        currentY = THREE.MathUtils.lerp(1.75, serverRacketPos.y, smoothToss) + tossArc * 0.40;

        // Kontinuierliche Speicherung des exakten Treffpunkts
        serveImpactPosRef.current.copy(serverRacketPos);
      } else {
        // ⚡ Phase 3: Treffpunkt & butterweicher, harmonischer Ausschwung
        const flightT = (p - tossEndTime) / (1.0 - tossEndTime);
        const impactPos = serveImpactPosRef.current; // Exakter 3D-Treffpunkt am Sweet Spot

        const serveBounceT = shot.isFault ? 0.82 : 0.60;
        if (flightT < serveBounceT) {
          const t = flightT / serveBounceT;
          currentX = THREE.MathUtils.lerp(impactPos.x, shot.bouncePos.x, t);
          currentZ = THREE.MathUtils.lerp(impactPos.z, shot.bouncePos.z, t);
          currentY = THREE.MathUtils.lerp(impactPos.y, 0.065, t * t);
        } else {
          const t = (flightT - serveBounceT) / (1.0 - serveBounceT);
          // Reibungs-Verzögerung nach dem Aufprall (verliert 35-40% Tempo)
          const tDecel = Math.sin(t * (Math.PI / 2));
          currentX = THREE.MathUtils.lerp(shot.bouncePos.x, shot.targetPos.x, tDecel);
          currentZ = THREE.MathUtils.lerp(shot.bouncePos.z, shot.targetPos.z, tDecel);
          
          // 🚀 Echter physikalischer Aufstieg aus der Servicebox in die Treffpunkthöhe
          const kickBonus = shot.spinType === 'kick' ? 0.32 : 0.12;
          const bounceParabola = 4.0 * t * (1.0 - t);
          currentY = Math.max(0.065, THREE.MathUtils.lerp(0.065, shot.targetPos.y, Math.sin(t * (Math.PI / 2))) + bounceParabola * kickBonus);
          if (!shot.hasBounced) {
            shot.hasBounced = true;
          }
        }

        // Explosiver Peitschenschlag direkt durch den Ball mit maximaler Pronation
        if (flightT < 0.28) {
          const strikeT = THREE.MathUtils.smoothstep(flightT / 0.28, 0, 1);
          const targetTilt = THREE.MathUtils.lerp(52.0, -56.0, strikeT);
          const targetRoll = THREE.MathUtils.lerp(32.0 * rollDir, 84.0 * rollDir, strikeT);

          kinServer.headTilt = THREE.MathUtils.lerp(kinServer.headTilt, targetTilt, dt * 26.0);
          kinServer.headRoll = THREE.MathUtils.lerp(kinServer.headRoll, targetRoll, dt * 26.0);
          kinServer.boomTilt = THREE.MathUtils.lerp(kinServer.boomTilt, 12.0, dt * 14.0);
          kinServer.teleExtension = THREE.MathUtils.lerp(kinServer.teleExtension, 0.0, dt * 10.0);
        } else {
          // Harmonischer Ausschwung & Zurückgleiten in die Grundstellung
          const recoveryT = THREE.MathUtils.smoothstep((flightT - 0.28) / 0.72, 0, 1);
          const recTilt = THREE.MathUtils.lerp(-56.0, 0.0, recoveryT);
          const recRoll = THREE.MathUtils.lerp(84.0 * rollDir, 0.0, recoveryT);

          kinServer.headTilt = THREE.MathUtils.lerp(kinServer.headTilt, recTilt, dt * 8.0);
          kinServer.headRoll = THREE.MathUtils.lerp(kinServer.headRoll, recRoll, dt * 8.0);
          kinServer.teleExtension = THREE.MathUtils.lerp(kinServer.teleExtension, 4.2 * recoveryT, dt * 6.0);
          kinServer.boomTilt = THREE.MathUtils.lerp(kinServer.boomTilt, 10.0, dt * 6.0);
          kinServer.columnElevation = THREE.MathUtils.lerp(kinServer.columnElevation, 1.85, dt * 6.0);
        }

        // Receiver: Ultra-präzise Interception-IK zum Treffpunkt des Aufschlags
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;
        const receiver: 1 | 2 = server === 1 ? 2 : 1;
        const isReceiver1 = receiver === 1;
        const isReceiverSouth = (receiver === 1 && p1IsSouthRef.current) || (receiver === 2 && !p1IsSouthRef.current);
        const baseZ = isReceiverSouth ? -15.2 : 15.2;
        const fwdSign = isReceiverSouth ? 1.0 : -1.0;

        const isForehand = ((targetX - kinReceiver.dollyTrack) * fwdSign) >= 0;
        const strikeOffset = isForehand ? (-0.80 * fwdSign) : (0.80 * fwdSign);

        const railX = THREE.MathUtils.clamp(targetX + strikeOffset, -7.5, 7.5);
        kinReceiver.dollyTrack = THREE.MathUtils.lerp(kinReceiver.dollyTrack, railX, dt * 8.5);

        const deltaX = targetX - kinReceiver.dollyTrack;
        const deltaZ = (targetZ - baseZ) * fwdSign;
        const distH = Math.hypot(deltaX, deltaZ);
        const idealColY = THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kinReceiver.columnElevation = THREE.MathUtils.lerp(kinReceiver.columnElevation, idealColY, dt * 7.5);

        const deltaY = targetY - (kinReceiver.columnElevation + 0.95);
        const total3DDist = Math.hypot(distH, deltaY);
        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.40, 0.2, 11.2);
        kinReceiver.teleExtension = THREE.MathUtils.lerp(kinReceiver.teleExtension, targetExt, dt * 9.0);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kinReceiver.boomTilt = THREE.MathUtils.lerp(kinReceiver.boomTilt, targetTiltDeg, dt * 9.0);

        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaX * fwdSign, deltaZ));

        if (flightT < 0.65) {
          // Unit Turn / Ausholbewegung
          const windupOffset = isForehand ? 20 : -20;
          kinReceiver.basePan = THREE.MathUtils.lerp(kinReceiver.basePan, aimAngleDeg + windupOffset, dt * 9.0);
          kinReceiver.headPan = THREE.MathUtils.lerp(kinReceiver.headPan, isForehand ? 16 : -16, dt * 9.0);
          kinReceiver.headRoll = THREE.MathUtils.lerp(kinReceiver.headRoll, isForehand ? 24 : -24, dt * 9.0);
          kinReceiver.headTilt = THREE.MathUtils.lerp(kinReceiver.headTilt, 10, dt * 9.0);
        } else {
          // Schwung nach vorne exakt zum Treffpunkt (Schläger steht absolut plan und zentriert auf dem Ball)
          kinReceiver.basePan = THREE.MathUtils.lerp(kinReceiver.basePan, aimAngleDeg, dt * 18.0);
          kinReceiver.headPan = THREE.MathUtils.lerp(kinReceiver.headPan, 0, dt * 18.0);
          kinReceiver.headTilt = THREE.MathUtils.lerp(kinReceiver.headTilt, 0, dt * 18.0);
          kinReceiver.headRoll = THREE.MathUtils.lerp(kinReceiver.headRoll, isForehand ? 10 : -10, dt * 18.0);
        }

        // 🎯 100% EXAKTE SWEET-SPOT KONVERGENZ BEIM RETURN
        if (flightT > 0.86 && !shot.isFault) {
          const rPos = (isReceiver1 ? racket1WorldPos.current : racket2WorldPos.current).clone();
          const blendT = THREE.MathUtils.smoothstep((flightT - 0.86) / 0.14, 0, 1);
          currentX = THREE.MathUtils.lerp(currentX, rPos.x, blendT);
          currentY = THREE.MathUtils.lerp(currentY, rPos.y, blendT);
          currentZ = THREE.MathUtils.lerp(currentZ, rPos.z, blendT);
        }
      }
    } else if (shot.isLob) {
      // 🌈 HOHER TENNIS-LOB / DEFENSIVE KERZE (Bis zu 11.2 Meter hoch in den Himmel!)
      const bounceProg = shot.isDecisive ? 0.74 : 0.68;
      if (p < bounceProg) {
        const t = p / bounceProg;
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.bouncePos.x, t);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.bouncePos.z, t);
        const arc = 4 * t * (1 - t);
        currentY = THREE.MathUtils.lerp(shot.startPos.y, shot.bouncePos.y, t) + arc * shot.netHeight;
      } else {
        const t = (p - bounceProg) / (1.0 - bounceProg);
        // 🚀 ECHTER PHYSIKALISCHER HOCH-ABSPRUNG NACH DEFENSIVE-LOB
        const tDecel = Math.sin(t * (Math.PI / 2));
        currentX = THREE.MathUtils.lerp(shot.bouncePos.x, shot.targetPos.x, tDecel);
        currentZ = THREE.MathUtils.lerp(shot.bouncePos.z, shot.targetPos.z, tDecel);
        const bounceParabola = 4.0 * t * (1.0 - t);
        const lobBonus = 0.45 + THREE.MathUtils.clamp(shot.netHeight * 0.12, 0.2, 0.8);
        currentY = Math.max(0.065, THREE.MathUtils.lerp(0.065, shot.targetPos.y, Math.sin(t * (Math.PI / 2))) + bounceParabola * lobBonus);
        if (!shot.hasBounced) {
          shot.hasBounced = true;
        }
      }

      // Kinematik für den schlagenden Kran beim Lob (Schaufelt steil von unten nach oben)
      if (shot.shooter === 1) {
        if (p < 0.25) {
          kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, 1.58, dt * 10.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 48, dt * 14.0);
        } else {
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 62, dt * 12.0);
          kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, 26, dt * 8.0);
        }
      } else {
        if (p < 0.25) {
          kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, 1.58, dt * 10.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 48, dt * 14.0);
        } else {
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 62, dt * 12.0);
          kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, 26, dt * 8.0);
        }
      }

      // Kinematik für den überlobbten Kran am Netz (schaut hoch und streckt sich nach hinten)
      const defender = shot.shooter === 1 ? 2 : 1;
      if (defender === 1) {
        const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.65, -7.5, 7.5);
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 7.0);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 58, dt * 14.0);
      } else if (defender === 2) {
        const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.65, -7.5, 7.5);
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 7.0);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 58, dt * 14.0);
      }
    } else if (shot.isSmash) {
      // 🚀 REALER ATP MONSTER-SMASH: DIREKTER 248 KM/H EINSCHLAG IN DEN PLATZ & EXPLOSIVER TRIBÜNEN-REBOUND
      const hitter = shot.shooter;
      const kinHitter = hitter === 1 ? kin1 : kin2;
      const rollDir = hitter === 1 ? 1 : -1;
      const floorImpact = 0.30; // 0.30s steiler Abwärtsschuss in den Boden

      // Dolly fährt stabil unter den Treffpunkt
      kinHitter.dollyTrack = THREE.MathUtils.lerp(kinHitter.dollyTrack, THREE.MathUtils.clamp(shot.startPos.x, -7.5, 7.5), dt * 14.0);

      if (p <= floorImpact) {
        // Phase 1 (0.00 -> 0.30): Explosiver Peitschenschlag direkt am Treffpunkt & 248 km/h steiler Schuss in den Boden
        const t = p / floorImpact;
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.bouncePos.x, t);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.bouncePos.z, t);
        currentY = THREE.MathUtils.lerp(shot.startPos.y, 0.065, t * t);

        // Handgelenk und Arm peitschen mit maximaler Pronation durch den Ball
        const strikeT = THREE.MathUtils.smoothstep(t, 0, 1);
        kinHitter.headTilt = THREE.MathUtils.lerp(48.0, -58.0, strikeT);
        kinHitter.headRoll = THREE.MathUtils.lerp(28.0 * rollDir, 86.0 * rollDir, strikeT);
        kinHitter.boomTilt = THREE.MathUtils.lerp(22.0, 10.0, strikeT);
        kinHitter.columnElevation = THREE.MathUtils.lerp(2.60, 2.10, strikeT);
        kinHitter.teleExtension = THREE.MathUtils.lerp(8.2, 6.8, strikeT);
      } else {
        // Phase 2 (0.30 -> 1.00): Brutaler 5m Rebound über die Grundlinie in die Zuschauerränge & Ausschwung
        const t = (p - floorImpact) / (1.0 - floorImpact);
        const tDecel = Math.sin(t * (Math.PI / 2));
        currentX = THREE.MathUtils.lerp(shot.bouncePos.x, shot.targetPos.x, tDecel);
        currentZ = THREE.MathUtils.lerp(shot.bouncePos.z, shot.targetPos.z, tDecel);
        
        // Hohe Rebound-Parabel in die Zuschauerränge
        const reboundApex = shot.isDecisive ? 5.2 : 2.4;
        currentY = Math.max(0.065, THREE.MathUtils.lerp(0.065, shot.targetPos.y, tDecel) + Math.sin(t * Math.PI) * reboundApex);

        if (!shot.hasBounced) {
          shot.hasBounced = true;
        }

        // Harmonischer Ausschwung & Zurückgleiten in die Grundstellung
        const recoveryT = THREE.MathUtils.smoothstep(t, 0, 1);
        kinHitter.headTilt = THREE.MathUtils.lerp(-58.0, 0.0, recoveryT);
        kinHitter.headRoll = THREE.MathUtils.lerp(86.0 * rollDir, 0.0, recoveryT);
        kinHitter.boomTilt = THREE.MathUtils.lerp(10.0, 12.0, recoveryT);
        kinHitter.teleExtension = THREE.MathUtils.lerp(6.8, 4.5, recoveryT);
        kinHitter.columnElevation = THREE.MathUtils.lerp(2.10, 1.85, recoveryT);
        kinHitter.basePan = THREE.MathUtils.lerp(kinHitter.basePan, 0.0, dt * 8.0);
      }

      // Verteidiger-Kran an der Grundlinie (Blickt nach oben auf den herannahenden Smash)
      const defender = shot.shooter === 1 ? 2 : 1;
      const kinDefender = defender === 1 ? kin1 : kin2;
      const railX = THREE.MathUtils.clamp(shot.targetPos.x * 0.70, -7.5, 7.5);

      kinDefender.dollyTrack = THREE.MathUtils.lerp(kinDefender.dollyTrack, railX, dt * 10.0);
      if (p > floorImpact) {
        kinDefender.columnElevation = THREE.MathUtils.lerp(kinDefender.columnElevation, 2.1, dt * 10.0);
        kinDefender.headTilt = THREE.MathUtils.lerp(kinDefender.headTilt, 48, dt * 14.0);
      }
    } else if (shot.isVolley) {
      // 🎾 VOLLEY-FLUGBAHN: DIREKTABNAHME IN DER LUFT (OHNE BODENAUFPRALL)
      currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x, p);
      currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.targetPos.z, p);

      const arc = 4 * p * (1 - p);
      currentY = THREE.MathUtils.lerp(shot.startPos.y, shot.targetPos.y, p) + arc * Math.max(0.35, shot.netHeight * 0.45);

      // --- KINEMATIK KRAN 1 ---
      if (shot.shooter === 2) {
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;

        const isP1South = p1IsSouthRef.current;
        const baseZ1 = isP1South ? -15.2 : 15.2;
        const fwdSign1 = isP1South ? 1.0 : -1.0;

        const railX = THREE.MathUtils.clamp(targetX * 0.70, -7.5, 7.5);
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 9.5);

        const deltaX = targetX - kin1.dollyTrack;
        const deltaZ = (targetZ - baseZ1) * fwdSign1;
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = shot.volleyKind === 'smash' ? 3.1 : shot.volleyKind === 'stop' ? 1.6 : THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, idealColY, dt * 8.5);

        const deltaY = targetY - kin1.columnElevation;
        const total3DDist = Math.hypot(distH, deltaY);

        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.34, 0.5, 11.2);
        kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, targetExt, dt * 10.5);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, targetTiltDeg, dt * 11.0);

        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaX * fwdSign1, deltaZ));
        const isForehand = (deltaX * fwdSign1) >= 0;

        if (p < 0.60) {
          const windupOffset = isForehand ? 16 : -18;
          kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, aimAngleDeg + windupOffset, dt * 12.0);
          kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, isForehand ? 12 : -15, dt * 12.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, isForehand ? 20 : -24, dt * 12.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 10, dt * 12.0);
        } else {
          // Volley-Punch: Schläger bleibt absolut plan und zentriert auf dem Ball
          kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, aimAngleDeg, dt * 22.0);
          kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 22.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, isForehand ? 8 : -8, dt * 22.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, shot.volleyKind === 'smash' ? -12 : 0, dt * 22.0);
        }
      } else {
        kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, 0, dt * 4.5);
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 4.5);
        kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 0, dt * 4.5);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 0, dt * 4.5);
      }

      // --- KINEMATIK KRAN 2 ---
      if (shot.shooter === 1) {
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;

        const isP2South = !p1IsSouthRef.current;
        const baseZ2 = isP2South ? -15.2 : 15.2;
        const fwdSign2 = isP2South ? 1.0 : -1.0;

        const railX = THREE.MathUtils.clamp(targetX * 0.70, -7.5, 7.5);
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 9.5);

        const deltaX = targetX - kin2.dollyTrack;
        const deltaZ = (targetZ - baseZ2) * fwdSign2;
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = shot.volleyKind === 'smash' ? 3.1 : shot.volleyKind === 'stop' ? 1.6 : THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, idealColY, dt * 8.5);

        const deltaY = targetY - kin2.columnElevation;
        const total3DDist = Math.hypot(distH, deltaY);

        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.34, 0.5, 11.2);
        kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, targetExt, dt * 10.5);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, targetTiltDeg, dt * 11.0);

        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaX * fwdSign2, deltaZ));
        const isForehand = (deltaX * fwdSign2) >= 0;

        if (p < 0.60) {
          const windupOffset = isForehand ? 16 : -18;
          kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, aimAngleDeg + windupOffset, dt * 12.0);
          kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, isForehand ? 12 : -15, dt * 12.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, isForehand ? 20 : -24, dt * 12.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 10, dt * 12.0);
        } else {
          // Volley-Punch: Schläger bleibt absolut plan und zentriert auf dem Ball
          kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, aimAngleDeg, dt * 22.0);
          kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 22.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, isForehand ? 8 : -8, dt * 22.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, shot.volleyKind === 'smash' ? -12 : 0, dt * 22.0);
        }
      } else {
        kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, 0, dt * 4.5);
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 4.5);
        kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, 0, dt * 4.5);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 0, dt * 4.5);
      }
    } else if (shot.isNetError) {
      // 🕸️ BALL FLIEGT INS NETZGEWEBE / AN DIE NETZKANTE, PRALLT AB UND FÄLLT AUF DER EIGENEN SEITE ZU BODEN
      const netHitProg = 0.46;
      const netX = (shot.startPos.x + shot.targetPos.x) * 0.5;
      const shooterSideSign = Math.sign(shot.startPos.z) || (shot.shooter === 1 ? -1 : 1);
      const impactZ = shooterSideSign * 0.05;
      const impactY = THREE.MathUtils.clamp(shot.netHeight || 0.88, 0.45, 1.05);

      if (p <= netHitProg) {
        // 1. Anflug zum Netz / zur Netzkante
        const t = p / netHitProg;
        currentX = THREE.MathUtils.lerp(shot.startPos.x, netX, t);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, impactZ, t);
        const arc = 4.0 * t * (1.0 - t);
        currentY = THREE.MathUtils.lerp(shot.startPos.y, impactY, t) + arc * 0.15;
      } else {
        // 2. Netzkontakt: Inelastische Dämpfung & Herabfallen strikt auf der EIGENEN Netzseite
        const t = (p - netHitProg) / (1.0 - netHitProg);
        // Netz federt zurück auf die Seite des Schlägers (bleibt strikt auf der eigenen Seite!)
        const reboundZ = shooterSideSign * (0.05 + Math.sin(t * (Math.PI / 2)) * 0.30);
        currentZ = reboundZ;
        currentX = netX + Math.sin(t * 4.0) * 0.03;

        if (t < 0.75) {
          // Gravitativer Fall nach unten
          const fallT = t / 0.75;
          currentY = THREE.MathUtils.lerp(impactY, 0.065, fallT * fallT);
        } else {
          // Kraftloser Micro-Bounce & Ausrollen an der Netzbasis auf der eigenen Seite
          const bounceT = (t - 0.75) / 0.25;
          const microHop = Math.sin(bounceT * Math.PI) * 0.04 * (1.0 - bounceT);
          currentY = 0.065 + microHop;
          if (!shot.hasBounced) {
            shot.hasBounced = true;
          }
        }
      }

      // Spieler schüttelt enttäuscht den Kopf über den Netzfehler
      if (shot.shooter === 1) {
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, -18, dt * 6.0);
      } else {
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, -18, dt * 6.0);
      }
    } else if (shot.isNetCord) {
      // 💫 NETZROLLER: Ball touchiert die Netzkante bei p=0.48 und tropft kurz hinters Netz
      const netHitProg = 0.48;
      if (p < netHitProg) {
        const t = p / netHitProg;
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.targetPos.x * 0.35, t);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, 0.0, t);
        const arc = 4 * t * (1 - t);
        currentY = THREE.MathUtils.lerp(shot.startPos.y, 1.05, t) + arc * 0.35;
      } else {
        const t = (p - netHitProg) / (1.0 - netHitProg);
        currentX = THREE.MathUtils.lerp(shot.targetPos.x * 0.35, shot.targetPos.x, t);
        currentZ = THREE.MathUtils.lerp(0.0, shot.targetPos.z, t);
        const dropArc = Math.sin(t * Math.PI) * 0.38;
        currentY = THREE.MathUtils.lerp(1.05, 0.105, t) + dropArc;
        if (!shot.hasBounced) {
          shot.hasBounced = true;
        }
      }
    } else {
      const bounceProg = 0.70;
      if (p < bounceProg) {
        const t = p / bounceProg;
        currentX = THREE.MathUtils.lerp(shot.startPos.x, shot.bouncePos.x, t);
        currentZ = THREE.MathUtils.lerp(shot.startPos.z, shot.bouncePos.z, t);
        const arc = 4 * t * (1 - t);
        currentY = THREE.MathUtils.lerp(shot.startPos.y, shot.bouncePos.y, t) + arc * shot.netHeight;
      } else {
        const t = (p - bounceProg) / (1.0 - bounceProg);
        // 🚀 ECHTE PHYSIKALISCHE ABSPRUNG-DYNAMIK MIT REIBUNGS-VERZÖGERUNG
        const tDecel = Math.sin(t * (Math.PI / 2));
        currentX = THREE.MathUtils.lerp(shot.bouncePos.x, shot.targetPos.x, tDecel);
        currentZ = THREE.MathUtils.lerp(shot.bouncePos.z, shot.targetPos.z, tDecel);

        const excessApex = (shot.isLobSetup || shot.netHeight > 3.2)
          ? (0.45 + THREE.MathUtils.clamp(shot.netHeight * 0.12, 0.2, 0.8))
          : shot.spinType === 'topspin'
            ? (0.28 + ((shot.rpm || 2500) / 3200) * 0.22)
            : shot.spinType === 'slice'
              ? -0.06
              : shot.spinType === 'dropshot'
                ? -0.15
                : 0.12;

        const riseT = shot.spinType === 'slice' 
          ? Math.pow(t, 1.35) 
          : Math.sin(t * (Math.PI / 2));
        const bounceParabola = 4.0 * t * (1.0 - t);
        currentY = Math.max(0.065, THREE.MathUtils.lerp(0.065, shot.targetPos.y, riseT) + bounceParabola * excessApex);

        if (!shot.hasBounced) {
          shot.hasBounced = true;
        }
      }

      // --- KINEMATIK KRAN 1 ---
      if (shot.shooter === 2) {
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;

        const isP1South = p1IsSouthRef.current;
        const baseZ1 = isP1South ? -15.2 : 15.2;
        const fwdSign1 = isP1South ? 1.0 : -1.0;

        const isForehand = ((targetX - kin1.dollyTrack) * fwdSign1) >= 0;
        const strikeOffset = isForehand ? (-0.80 * fwdSign1) : (0.80 * fwdSign1);

        const railX = THREE.MathUtils.clamp(targetX + strikeOffset, -7.5, 7.5);
        kin1.dollyTrack = THREE.MathUtils.lerp(kin1.dollyTrack, railX, dt * 9.0);

        const deltaX = targetX - kin1.dollyTrack;
        const deltaZ = (targetZ - baseZ1) * fwdSign1;
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = shot.isLobSetup ? 3.2 : THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin1.columnElevation = THREE.MathUtils.lerp(kin1.columnElevation, idealColY, dt * 7.5);

        const deltaY = targetY - (kin1.columnElevation + 0.95);
        const total3DDist = Math.hypot(distH, deltaY);

        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.40, 0.2, 11.2);
        kin1.teleExtension = THREE.MathUtils.lerp(kin1.teleExtension, targetExt, dt * 9.5);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin1.boomTilt = THREE.MathUtils.lerp(kin1.boomTilt, targetTiltDeg, dt * 9.5);

        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaX * fwdSign1, deltaZ));

        if (p < 0.65) {
          // 1. Ausholphase (Unit Turn / Backswing)
          const windupOffset = isForehand ? 20 : -20;
          kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, aimAngleDeg + windupOffset, dt * 9.0);
          kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, isForehand ? 16 : -16, dt * 9.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, isForehand ? 26 : -30, dt * 9.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 10, dt * 9.0);
        } else {
          // 2. Schwungphase nach vorne zum Treffpunkt (Schläger steht am Treffpunkt exakt plan und mittig auf dem Ball)
          kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, aimAngleDeg, dt * 18.0);
          kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 18.0);
          kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 0, dt * 18.0);
          kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, isForehand ? 8 : -8, dt * 18.0);
        }
      } else {
        kin1.basePan = THREE.MathUtils.lerp(kin1.basePan, 0, dt * 4.5);
        kin1.headPan = THREE.MathUtils.lerp(kin1.headPan, 0, dt * 4.5);
        kin1.headRoll = THREE.MathUtils.lerp(kin1.headRoll, 0, dt * 4.5);
        kin1.headTilt = THREE.MathUtils.lerp(kin1.headTilt, 0, dt * 4.5);
      }

      // --- KINEMATIK KRAN 2 ---
      if (shot.shooter === 1) {
        const targetX = shot.targetPos.x;
        const targetY = shot.targetPos.y;
        const targetZ = shot.targetPos.z;

        const isP2South = !p1IsSouthRef.current;
        const baseZ2 = isP2South ? -15.2 : 15.2;
        const fwdSign2 = isP2South ? 1.0 : -1.0;

        const isForehand = ((targetX - kin2.dollyTrack) * fwdSign2) >= 0;
        const strikeOffset = isForehand ? (-0.80 * fwdSign2) : (0.80 * fwdSign2);

        const railX = THREE.MathUtils.clamp(targetX + strikeOffset, -7.5, 7.5);
        kin2.dollyTrack = THREE.MathUtils.lerp(kin2.dollyTrack, railX, dt * 9.0);

        const deltaX = targetX - kin2.dollyTrack;
        const deltaZ = (targetZ - baseZ2) * fwdSign2;
        const distH = Math.hypot(deltaX, deltaZ);

        const idealColY = shot.isLobSetup ? 3.2 : THREE.MathUtils.clamp(targetY * 0.5 + 1.1, 1.54, 3.2);
        kin2.columnElevation = THREE.MathUtils.lerp(kin2.columnElevation, idealColY, dt * 7.5);

        const deltaY = targetY - (kin2.columnElevation + 0.95);
        const total3DDist = Math.hypot(distH, deltaY);

        const targetExt = THREE.MathUtils.clamp(total3DDist - 3.40, 0.2, 11.2);
        kin2.teleExtension = THREE.MathUtils.lerp(kin2.teleExtension, targetExt, dt * 9.5);

        const targetTiltDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaY, distH));
        kin2.boomTilt = THREE.MathUtils.lerp(kin2.boomTilt, targetTiltDeg, dt * 9.5);

        const aimAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(deltaX * fwdSign2, deltaZ));
        
        if (p < 0.65) {
          // 1. Ausholphase (Unit Turn / Backswing)
          const windupOffset = isForehand ? 20 : -20;
          kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, aimAngleDeg + windupOffset, dt * 9.0);
          kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, isForehand ? 16 : -16, dt * 9.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, isForehand ? 26 : -30, dt * 9.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 10, dt * 9.0);
        } else {
          // 2. Schwungphase nach vorne zum Treffpunkt (Schläger steht am Treffpunkt exakt plan und mittig auf dem Ball)
          kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, aimAngleDeg, dt * 18.0);
          kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 18.0);
          kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 0, dt * 18.0);
          kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, isForehand ? 8 : -8, dt * 18.0);
        }
      } else {
        kin2.basePan = THREE.MathUtils.lerp(kin2.basePan, 0, dt * 4.5);
        kin2.headPan = THREE.MathUtils.lerp(kin2.headPan, 0, dt * 4.5);
        kin2.headRoll = THREE.MathUtils.lerp(kin2.headRoll, 0, dt * 4.5);
        kin2.headTilt = THREE.MathUtils.lerp(kin2.headTilt, 0, dt * 4.5);
      }
    }

    // 🎯 100% EXAKTE SWEET-SPOT KONVERGENZ (BALL TRIFFT JEDEN SCHLÄGER AUF DEN MILLIMETER GENAU)
    if (!shot.isServe && !shot.isSmash && !shot.isNetError && p > 0.86) {
      const receiver = shot.shooter === 1 ? 2 : 1;
      const rPos = (receiver === 1 ? racket1WorldPos.current : racket2WorldPos.current).clone();
      const blendT = THREE.MathUtils.smoothstep((p - 0.86) / 0.14, 0, 1);
      currentX = THREE.MathUtils.lerp(currentX, rPos.x, blendT);
      currentY = THREE.MathUtils.lerp(currentY, rPos.y, blendT);
      currentZ = THREE.MathUtils.lerp(currentZ, rPos.z, blendT);
    }

    const currentBallPos = new THREE.Vector3(currentX, currentY, currentZ);
    setBallVisualPos(currentBallPos);

    if (dt > 0.0001) {
      ballVelocityRef.current.copy(currentBallPos).sub(prevBallPosRef.current).divideScalar(dt);
      prevBallPosRef.current.copy(currentBallPos);
    }

    if (p >= 1.0) {
      const hitter = shot.shooter === 1 ? 2 : 1;
      const hitPos = hitter === 1 ? racket1WorldPos.current.clone() : racket2WorldPos.current.clone();

      if (shot.isDecisive && shot.pointWinner) {
        const winner = shot.pointWinner;
        celebrationWinnerRef.current = winner;
        
        // 🎾 Realistische kontinuierliche Physik für den Ball (Punktgewinn / Aus / Netzfehler / Winner):
        const currentBallVel = ballVelocityRef.current.clone();
        if (currentBallVel.length() < 2.0) {
          currentBallVel.set(
            (shot.targetPos.x - shot.startPos.x) / Math.max(0.3, shot.duration),
            -4.0,
            (shot.targetPos.z - shot.startPos.z) / Math.max(0.3, shot.duration)
          );
        }

        let initVel: THREE.Vector3;
        if (shot.isNetError) {
          // Ball ist am Netz abgeprallt und liegt/rollt an der Netzbasis strikt auf der EIGENEN Seite
          const shooterSide = Math.sign(shot.startPos.z) || (shot.shooter === 1 ? -1 : 1);
          initVel = new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.0, shooterSide * 0.25);
        } else {
          // Ball behält seine volle kinetische Geschwindigkeit und prallt physikalisch ab
          initVel = calculateBallBounceReboundVelocity(currentBallVel, courtSurface, shot.spinType, shot.rpm || 1800);
        }

        ballCoastRef.current = {
          active: true,
          pos: currentBallPos.clone(),
          vel: initVel,
          spinType: shot.spinType,
          rpm: shot.rpm || 1800
        };

        setMatchScore(s => {
          let p1 = s.p1Points;
          let p2 = s.p2Points;
          let g1 = s.p1Games;
          let g2 = s.p2Games;
          let s1 = s.p1Sets;
          let s2 = s.p2Sets;
          const newSetHistory = s.setHistory ? [...s.setHistory] : [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }];
          let currentSet = s.currentSet || 3;
          let isTb = s.isTiebreak || false;
          let tb1 = s.p1TiebreakPoints || 0;
          let tb2 = s.p2TiebreakPoints || 0;

          if (isTb) {
            if (winner === 1) {
              tb1++;
            } else {
              tb2++;
            }

            if (tb1 >= 7 && tb1 - tb2 >= 2) {
              s1++;
              newSetHistory.push({ p1: 7, p2: 6, tiebreak: `7-6(${tb2})` });
              currentSet++;
              g1 = 0; g2 = 0; p1 = 0; p2 = 0; isTb = false; tb1 = 0; tb2 = 0;
            } else if (tb2 >= 7 && tb2 - tb1 >= 2) {
              s2++;
              newSetHistory.push({ p1: 6, p2: 7, tiebreak: `6-7(${tb1})` });
              currentSet++;
              g1 = 0; g2 = 0; p1 = 0; p2 = 0; isTb = false; tb1 = 0; tb2 = 0;
            }
          } else {
            if (winner === 1) {
              if (p1 === 40 && p2 < 40) {
                p1 = 0; p2 = 0; g1++;
              } else if (p1 === 40 && p2 === 40) {
                p1 = 45;
              } else if (p1 === 45) {
                p1 = 0; p2 = 0; g1++;
              } else if (p2 === 45) {
                p2 = 40;
              } else {
                const seq = [0, 15, 30, 40];
                p1 = seq[seq.indexOf(p1) + 1] || 40;
              }
            } else {
              if (p2 === 40 && p1 < 40) {
                p1 = 0; p2 = 0; g2++;
              } else if (p2 === 40 && p1 === 40) {
                p2 = 45;
              } else if (p2 === 45) {
                p1 = 0; p2 = 0; g2++;
              } else if (p1 === 45) {
                p1 = 40;
              } else {
                const seq = [0, 15, 30, 40];
                p2 = seq[seq.indexOf(p2) + 1] || 40;
              }
            }

            if (g1 === 6 && g2 === 6) {
              isTb = true;
              tb1 = 0;
              tb2 = 0;
            } else if (g1 >= 6 && g1 - g2 >= 2) {
              s1++;
              newSetHistory.push({ p1: g1, p2: g2 });
              currentSet++;
              g1 = 0;
              g2 = 0;
            } else if (g2 >= 6 && g2 - g1 >= 2) {
              s2++;
              newSetHistory.push({ p1: g1, p2: g2 });
              currentSet++;
              g1 = 0;
              g2 = 0;
            }
          }

          const isGameWon = (p1 === 0 && p2 === 0 && (g1 !== s.p1Games || g2 !== s.p2Games));
          const isSetWon = (s1 !== s.p1Sets || s2 !== s.p2Sets);
          const isGameOrSetWon = isGameWon || isSetWon;
          const isSideChangeDue = (isGameWon && ((g1 + g2) % 2 === 1)) || isSetWon;
          const isBreakPoint = (p1 === 45 || (p1 === 40 && p2 <= 30 && s.server === 2)) || (p2 === 45 || (p2 === 40 && p1 <= 30 && s.server === 1));

          const isAce = shot.shotType === 'service_winner' || (shot.isServe && !shot.isFault && shot.speedKmh >= 220);

          const { p1Emotion, p2Emotion, p1Timing, p2Timing, totalPauseDuration } = selectPostRallyEmotions({
            winner,
            shotType: shot.shotType,
            speedKmH: shot.speedKmh || (shot.isSmash ? 248 : 135),
            rallyCount: s.rallyCount,
            isNetCord: !!shot.isNetCord,
            isNetError: !!shot.isNetError,
            isOutError: !!shot.isOutError,
            isAce,
            isSmash: !!(shot.isSmash || shot.shotType === 'smash'),
            isGameOrSetWin: isGameOrSetWon,
            isBreakPoint,
            p1Psych: p1PsychRef.current,
            p2Psych: p2PsychRef.current
          });

          p1ActiveEmotionRef.current = p1Emotion;
          p2ActiveEmotionRef.current = p2Emotion;
          p1TimingRef.current = p1Timing;
          p2TimingRef.current = p2Timing;
          p1PsychRef.current = updatePlayerPsychology(p1PsychRef.current, winner === 1, s.rallyCount, isAce, !!(shot.isSmash || shot.shotType === 'smash'), !!(shot.isNetError || shot.isOutError), isBreakPoint);
          p2PsychRef.current = updatePlayerPsychology(p2PsychRef.current, winner === 2, s.rallyCount, isAce, !!(shot.isSmash || shot.shotType === 'smash'), !!(shot.isNetError || shot.isOutError), isBreakPoint);

          if (isSideChangeDue) {
            // 👑 Zuerst die volle Spiel-/Satzgewinn-Emotion (5.2s - 6.8s) mit Jubel & Trainerbox ausspielen!
            const celebDur = 5.2 + Math.random() * 1.6;
            celebrationTimerRef.current = celebDur;
            celebrationTotalDurationRef.current = celebDur;
            celebrationIsGameWinRef.current = true;
            pendingSideChangeRef.current = true;
            pendingShowcaseRef.current = false;
          } else if (isGameOrSetWon) {
            // 👑 Zuerst die volle Spielgewinn-Emotion (4.8s - 6.0s) ausspielen!
            const celebDur = 4.8 + Math.random() * 1.2;
            celebrationTimerRef.current = celebDur;
            celebrationTotalDurationRef.current = celebDur;
            celebrationIsGameWinRef.current = true;
            pendingSideChangeRef.current = false;
            pendingShowcaseRef.current = true;
          } else {
            celebrationTimerRef.current = totalPauseDuration;
            celebrationTotalDurationRef.current = totalPauseDuration;
            celebrationIsGameWinRef.current = false;
            pendingSideChangeRef.current = false;
            pendingShowcaseRef.current = false;
            nextServeConfigRef.current = { server: winner, attempt: 1 };
          }

          // 🎬 AGENT 20: GENERATE DYNAMIC NON-REPETITIVE DIRECTOR PLAN FOR NEXT POINT
          currentPointIndexRef.current += 1;
          pointDirectorPlanRef.current = generatePointDirectorPlan(
            currentPointIndexRef.current,
            winner,
            pointDirectorPlanRef.current
          );

          // 🦅 HAWK-EYE ELC LINE OVERLAY TRIGGER BEI KNAPPEM AUS
          if (shot.isOutError || (shot.isServe && shot.isFault)) {
            if (onHawkEyeTrigger) {
              const detail = outErrorDetailRef.current;
              const cmOut = detail?.cmOut ?? (2.4 + Math.random() * 4.0);
              const lineType = detail?.lineType ?? (shot.isServe ? 'serviceline' : 'baseline');
              onHawkEyeTrigger({
                isOpen: true,
                distanceMm: Math.round(cmOut * 10),
                lineType,
                hitter: shot.shooter,
                hitterName: shot.shooter === 1 ? 'Jannik Sinner 🇮🇹' : 'Carlos Alcaraz 🇪🇸',
                speedKmh: shot.speedKmh || 155,
                spinRpm: shot.rpm || (shot.shooter === 2 ? 3100 : 2250),
                shotType: shot.shotType,
                courtSurface
              });
            }
          }

          const winnerEmotion = winner === 1 ? p1Emotion : p2Emotion;
          const meta = EMOTION_METADATA[winnerEmotion];
          const emotionBadge = meta ? `${meta.icon} ${meta.label}` : '';
          let msg = `🏆 Punkt für ${winner === 1 ? 'Jannik Sinner 🇮🇹' : 'Carlos Alcaraz 🇪🇸'}! (${shot.endReason}) • ${emotionBadge}`;
          let umpireCall = getUmpireScoreCall(p1, p2, g1, g2, isTb, tb1, tb2);
          if (isSideChangeDue) {
            umpireCall = `Change of Ends! (${g1}:${g2})`;
            msg = `🔄 SEITENWECHSEL / CHANGE OF ENDS (${g1}:${g2}) • Die Kräne wechseln die Seiten!`;
          } else if (isGameOrSetWon) {
            msg = `🎮 GAME-WECHSEL (${g1}:${g2}) • 11.3m Ausleger-Show! • 👑 ${meta?.label || 'TRIUMPH'}`;
          }

          return {
            ...s,
            p1Points: p1,
            p2Points: p2,
            p1Games: g1,
            p2Games: g2,
            p1Sets: s1,
            p2Sets: s2,
            setHistory: newSetHistory,
            currentSet,
            isTiebreak: isTb,
            p1TiebreakPoints: tb1,
            p2TiebreakPoints: tb2,
            server: winner,
            serveAttempt: 1,
            rallyCount: 0,
            isCheering: false,
            cheerIntensity: 0.0,
            umpireCall,
            lastMessage: msg
          };
        });
      } else if (shot.isServe && shot.isFault && shot.serveAttempt === 1) {
        // ⚠️ 1. AUFSCHLAG WAR EIN FEHLER (FAULT) ➜ Ball rollt und dotzt mit realer Energie weiter!
        const currentBallVel = ballVelocityRef.current.clone();
        const shooterSide = Math.sign(shot.startPos.z) || (shot.shooter === 1 ? -1 : 1);
        if (currentBallVel.length() < 2.0) {
          currentBallVel.set((shot.targetPos.x - shot.startPos.x) / Math.max(0.3, shot.duration), -4.0, -shooterSide * (shot.speedKmh * 0.28));
        }

        const isNetFault = shot.netHeight <= 1.0;
        const initVel = isNetFault
          ? new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.0, shooterSide * 0.25)
          : calculateBallBounceReboundVelocity(currentBallVel, courtSurface, shot.spinType, shot.rpm || 2000);

        ballCoastRef.current = {
          active: true,
          pos: currentBallPos.clone(),
          vel: initVel,
          spinType: shot.spinType,
          rpm: shot.rpm || 2000
        };

        // 🦅 HAWK-EYE TRIGGER BEI 1. AUFSCHLAG IM AUS
        if (!isNetFault && onHawkEyeTrigger) {
          const detail = outErrorDetailRef.current;
          const cmOut = detail?.cmOut ?? 2.8;
          onHawkEyeTrigger({
            isOpen: true,
            distanceMm: Math.round(cmOut * 10),
            lineType: 'serviceline',
            hitter: shot.shooter,
            hitterName: shot.shooter === 1 ? 'Jannik Sinner 🇮🇹' : 'Carlos Alcaraz 🇪🇸',
            speedKmh: shot.speedKmh || 225,
            spinRpm: shot.rpm || 2800,
            shotType: shot.shotType,
            courtSurface
          });
        }

        p1ActiveEmotionRef.current = shot.shooter === 1 ? 'disappointed_error' : 'idle_ready';
        p2ActiveEmotionRef.current = shot.shooter === 2 ? 'disappointed_error' : 'idle_ready';
        p1TimingRef.current = { delay: 0.10, duration: 2.2 };
        p2TimingRef.current = { delay: 0.40, duration: 1.8 };

        const faultPause = 2.2 + Math.random() * 1.2; // 2.2s - 3.4s variable Pause vor 2. Aufschlag
        celebrationTimerRef.current = faultPause;
        celebrationTotalDurationRef.current = faultPause;
        celebrationWinnerRef.current = (shot.shooter === 1 ? 2 : 1);
        celebrationIsGameWinRef.current = false;
        nextServeConfigRef.current = { server: shot.shooter, attempt: 2 };

        // 🎬 AGENT 20: GENERATE DYNAMIC FAULT / 2ND SERVE DIRECTOR PLAN
        currentPointIndexRef.current += 1;
        pointDirectorPlanRef.current = generatePointDirectorPlan(
          currentPointIndexRef.current,
          shot.shooter,
          pointDirectorPlanRef.current
        );

        setMatchScore(s => ({
          ...s,
          umpireCall: `⚠️ FAULT! Zweiter Aufschlag...`,
          lastMessage: `⚠️ 1. Aufschlag im Netz / Aus (Fault)! Vorbereitung 2. Service...`
        }));
      } else {
        setMatchScore(s => ({
          ...s,
          rallyCount: s.rallyCount + 1,
          isCheering: false,
          cheerIntensity: 0.0,
          lastMessage: `${shot.shotType} • ${shot.speedKmh} km/h`
        }));

        if (shot.isSmash && !shot.isDecisive) {
          // 🛡️ SMASH WURDE AN DER GRUNDLINIE ABGEWEHRT! ➜ Spektakulärer Konter-Lob!
          const counterMode = Math.random() < 0.65 ? 'topspin_lob' : 'sky_lob';
          shotRef.current = createNextShot(hitter, hitPos, matchScore.rallyCount + 1, counterMode);
        } else if (shot.isLobSetup) {
          // Unmittelbar den Monster-Smash des gegnerischen Krans zünden!
          shotRef.current = createNextShot(hitter, hitPos, matchScore.rallyCount + 1, 'smash');
        } else {
          shotRef.current = createNextShot(hitter, hitPos, matchScore.rallyCount + 1);
        }
      }
    }

    const isP1South = p1IsSouthRef.current;
    const baseZ1 = isP1South ? -15.2 : 15.2;
    const rotY1 = isP1South ? Math.PI : 0;
    const baseZ2 = isP1South ? 15.2 : -15.2;
    const rotY2 = isP1South ? 0 : Math.PI;

    if (dolly1GroupRef.current) {
      dolly1GroupRef.current.position.set(kin1.dollyTrack, 0, baseZ1);
      dolly1GroupRef.current.rotation.set(0, rotY1, 0);
    }
    if (dolly2GroupRef.current) {
      dolly2GroupRef.current.position.set(kin2.dollyTrack, 0, baseZ2);
      dolly2GroupRef.current.rotation.set(0, rotY2, 0);
    }

    if (crane1 && crane1.isLoaded) crane1.updateNodes({ ...kin1, dollyTrack: 0 });
    if (crane2 && crane2.isLoaded) crane2.updateNodes({ ...kin2, dollyTrack: 0 });

    // 🎬 AGENT 20: DYNAMIC NON-REPETITIVE TV BROADCAST DIRECTOR CHOREOGRAPHY
    if (cameraMode === 'broadcast') {
      directorShotTimerRef.current += delta;

      const decision = evaluateDynamicTennisDirectorDecision(pointDirectorPlanRef.current, {
        shot: {
          isServe: !!shot.isServe,
          servePhase: shot.servePhase || 0,
          isSmash: !!(shot.isSmash || shot.shotType === 'smash' || shot.volleyKind === 'smash'),
          shotType: shot.shotType || '',
          speedKmh: shot.speedKmh,
          volleyKind: shot.volleyKind,
          isLob: !!shot.isLob,
          isNetError: !!shot.isNetError,
          isOutError: !!shot.isOutError,
          isNetCord: !!shot.isNetCord,
          shooter: shot.shooter,
          progress: shot.progress,
          serveReadyFraction: shot.serveReadyFraction,
          serveBounceCount: shot.serveBounceCount
        },
        matchScore: {
          p1Points: matchScore.p1Points,
          p2Points: matchScore.p2Points,
          p1Games: matchScore.p1Games,
          p2Games: matchScore.p2Games,
          isTiebreak: !!matchScore.isTiebreak,
          server: matchScore.server
        },
        celebrationTimer: celebrationTimerRef.current,
        celebrationTotalDuration: celebrationTotalDurationRef.current,
        celebrationWinner: celebrationWinnerRef.current || 1,
        activeEmotionP1: p1ActiveEmotionRef.current,
        activeEmotionP2: p2ActiveEmotionRef.current,
        sideChangeTimer: sideChangeTimerRef.current,
        sideChangeTotalDuration: sideChangeTotalDurationRef.current,
        showcaseTimer: showcaseTimerRef.current,
        rallyCount: matchScore.rallyCount,
        directorShotTimer: directorShotTimerRef.current
      });

      const targetCam = decision.targetCam;
      const cutReason = decision.reason;
      const cutLabel = decision.label;

      if (directorCurrentCamRef.current !== targetCam) {
        directorCurrentCamRef.current = targetCam;
        directorShotTimerRef.current = 0;
        directorCutReasonRef.current = cutReason;

        if (onDirectorInfoChange) {
          onDirectorInfoChange({
            cam: targetCam,
            label: cutLabel,
            reason: cutReason
          });
        }
      }
    }

    const effectiveCam = cameraMode === 'broadcast'
      ? directorCurrentCamRef.current
      : cameraMode;

    if (orbitControlsRef.current && cameraMode !== 'free') {
      const controls = orbitControlsRef.current;
      const isHardCut = lastRenderedCamRef.current !== effectiveCam;

      if (effectiveCam === 'broadcast') {
        // 📺 WIMBLEDON BBC HIGH-CENTRE GANTRY (Center Court TV-Hauptkamera)
        _camDesiredTarget.set(0, 1.15, 0);
        _camDesiredPos.set(-25.5, 17.2, 0);
        if (isHardCut) {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        } else {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        }
      } else if (effectiveCam === 'coach') {
        // 👥 WIMBLEDON PLAYER / COACH BOX CAM (Darren Cahill & Ferrero VIP Tribüne)
        const isSinnerBox = (celebrationWinnerRef.current || shot.shooter) === 1;
        const boxSideZ = isSinnerBox ? -10.5 : 10.5;
        _camDesiredTarget.set(-11.5, 2.2, boxSideZ);
        _camDesiredPos.set(-15.8, 4.4, boxSideZ + (isSinnerBox ? 2.5 : -2.5));
        if (isHardCut) {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        } else {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        }
      } else if (effectiveCam === 'spectator') {
        // 🏟️ WIMBLEDON ROYAL BOX & TRIBUNEN-PANORAMA
        _camDesiredTarget.set(0, 1.5, 0);
        _camDesiredPos.set(-21.0, 10.5, 18.0);
        if (isHardCut) {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        } else {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        }
      } else if (effectiveCam === 'ball') {
        // 🎾 DYNAMISCHE 3D BALL-TRACKING KAMERA & PRE-SERVE DRIBBLE-DETAIL
        const isPreServeDribble = shot.isServe && shot.progress < (shot.serveReadyFraction ?? 0.44);
        if (isPreServeDribble) {
          // Makro-Close-Up auf das Ball-Aufprellen am Boden an der Grundlinie
          const bX = currentBallPos.x;
          const bZ = currentBallPos.z;
          _camDesiredTarget.set(bX, 0.45, bZ);
          _camDesiredPos.set(bX - 1.15, 0.70, bZ + (shot.shooter === 1 ? 1.5 : -1.5));
        } else {
          _camDesiredTarget.copy(currentBallPos);
          _camDesiredPos.copy(currentBallPos).add(new THREE.Vector3(-4.5, 2.8, 5.0));
        }

        if (isHardCut) {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        } else {
          controls.target.lerp(_camDesiredTarget, 0.22);
          camera.position.lerp(_camDesiredPos, 0.20);
        }
      } else if (effectiveCam === 'crane1') {
        // 🇮🇹 WIMBLEDON NORTH BASELINE HERO JIB (Sinner / Baseline Setup)
        const isPreServePrep = shot.isServe && shot.progress < (shot.serveReadyFraction ?? 0.44);
        if (isPreServePrep) {
          _camDesiredTarget.set(racket1WorldPos.current.x * 0.5, 1.80, racket1WorldPos.current.z);
          _camDesiredPos.set(racket1WorldPos.current.x * 0.5 - 2.8, 2.20, racket1WorldPos.current.z + (shot.shooter === 1 ? 4.8 : -4.8));
        } else {
          _camDesiredTarget.copy(racket1WorldPos.current).add(new THREE.Vector3(0, 0.2, 0));
          _camDesiredPos.copy(racket1WorldPos.current).add(new THREE.Vector3(-2.2, 0.85, -3.4));
        }

        if (isHardCut) {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        } else {
          controls.target.lerp(_camDesiredTarget, 0.16);
          camera.position.lerp(_camDesiredPos, 0.16);
        }
      } else if (effectiveCam === 'crane2') {
        // 🇪🇸 WIMBLEDON SOUTH BASELINE HERO JIB (Alcaraz / Baseline Setup)
        const isPreServePrep = shot.isServe && shot.progress < (shot.serveReadyFraction ?? 0.44);
        if (isPreServePrep) {
          _camDesiredTarget.set(racket2WorldPos.current.x * 0.5, 1.80, racket2WorldPos.current.z);
          _camDesiredPos.set(racket2WorldPos.current.x * 0.5 - 2.8, 2.20, racket2WorldPos.current.z + (shot.shooter === 2 ? -4.8 : 4.8));
        } else {
          _camDesiredTarget.copy(racket2WorldPos.current).add(new THREE.Vector3(0, 0.2, 0));
          _camDesiredPos.copy(racket2WorldPos.current).add(new THREE.Vector3(-2.2, 0.85, 3.4));
        }

        if (isHardCut) {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        } else {
          controls.target.lerp(_camDesiredTarget, 0.16);
          camera.position.lerp(_camDesiredPos, 0.16);
        }
      } else if (effectiveCam === 'portrait') {
        // 👤 PROTAGONISTEN-PORTRAIT (DER SCHLÄGER GILT ALS GESICHT & KOPF DES PROTAGONISTEN)
        const isCelebration = celebrationTimerRef.current > 0;
        const activePlayer = isCelebration ? (celebrationWinnerRef.current || shot.shooter) : shot.shooter;
        const pPos = activePlayer === 1 ? racket1WorldPos.current : racket2WorldPos.current;
        
        // Ausrichtung: Blickt von der Feldseite frontal in das Schlägergesicht
        const isPlayerSouth = activePlayer === 1 ? p1IsSouthRef.current : !p1IsSouthRef.current;
        const frontZSign = isPlayerSouth ? 1 : -1; // Vom Netz in Richtung Schlägerblatt blickend

        const currentEmotion = isCelebration 
          ? (activePlayer === 1 ? p1ActiveEmotionRef.current : p2ActiveEmotionRef.current)
          : 'serve_ritual';

        const isHeroEmotion = currentEmotion === 'ear_cup_celebration' || currentEmotion === 'steely_chest_thump' || currentEmotion === 'celebrating_winner' || currentEmotion === 'finger_wag_winner';
        const isFrustration = currentEmotion === 'disappointed_error' || currentEmotion === 'rage_racket_slam_fake' || currentEmotion === 'blown_tire_exhaustion';

        // 🎯 TARGET: Der Schlägerkopf / Sweet Spot ist das Gesicht des Protagonisten!
        _camDesiredTarget.copy(pPos);

        // 🎬 POSITION: Kinoreife Portraiteinstellung frontal auf das Schlägergesicht mit Bespannung & Mimik
        if (isHeroEmotion) {
          // Hero-Untersicht: Schaut von leicht schräg unten ehrfürchtig auf das jubelnde Schlägergesicht
          _camDesiredPos.set(
            pPos.x - 0.70,
            Math.max(1.10, pPos.y - 0.20),
            pPos.z + frontZSign * 2.10
          );
        } else if (isFrustration) {
          // Frust-Aufsicht: Schaut von leicht oben auf das gesenkte, kopfschüttelnde Schlägergesicht
          _camDesiredPos.set(
            pPos.x - 0.65,
            pPos.y + 0.30,
            pPos.z + frontZSign * 2.25
          );
        } else {
          // Intimes Augenhöhe-Portrait auf das Schlägergesicht vor dem Aufschlag
          _camDesiredPos.set(
            pPos.x - 0.68,
            pPos.y + 0.05,
            pPos.z + frontZSign * 2.15
          );
        }

        if (isHardCut) {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        } else {
          controls.target.lerp(_camDesiredTarget, 0.18);
          camera.position.lerp(_camDesiredPos, 0.18);
        }
      } else if (effectiveCam === 'umpire') {
        // 🪑 WIMBLEDON CHAIR UMPIRE CAM (Elevated Net & Service Box View)
        _camDesiredTarget.set(0, 1.0, 0);
        _camDesiredPos.set(7.6, 3.6, 0);
        if (isHardCut) {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        } else {
          controls.target.copy(_camDesiredTarget);
          camera.position.copy(_camDesiredPos);
        }
      }

      if (isHardCut) {
        controls.update();
        lastRenderedCamRef.current = effectiveCam;
      }

      // Strict Floor Invariant: Camera Y >= 0.85m, Target Y >= 0.40m
      camera.position.y = Math.max(0.85, camera.position.y);
      if (controls.target.y < 0.40) {
        controls.target.y = 0.40;
      }
      controls.update();
    }
  });

  return (
    <>
      {/* ☀️ ATMOSPHÄRISCHER WIMBLEDON-HIMMEL MIT SANFTEN WOLKEN & WEICHEM SONNENLICHT */}
      {courtSurface !== 'cyber' && (
        <AtmosphericSkyDome
          zenithColor={courtSurface === 'grass' ? '#1d4ed8' : '#2563eb'}
          horizonColor={courtSurface === 'grass' ? '#93c5fd' : '#bfdbfe'}
          groundColor="#475569"
          sunPosition={[28, 32, 18]}
          sunColor="#fff7ed"
          sunSize={1.1}
          sunIntensity={0.95}
          cloudCoverage={0.34}
          cloudDensity={0.76}
          cloudSpeed={0.003}
        />
      )}

      {/* ☀️ HAUPTSONNE (VERSETZT AUF [28, 32, 18] MIT WEICHEM SCHATTEN-RADIUS & DIFFUSER AUSLEUCHTUNG) */}
      <directionalLight
        position={[28, 32, 18]}
        intensity={2.1}
        color="#fffbeb"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0002}
        shadow-radius={4.0}
      />

      {/* 🌤️ WEICHES HIMMEL- & KORONA-DIFFUSIONS-LICHT (HEMISPHERE LIGHT DURCH WOLKEN) */}
      <hemisphereLight
        color="#e0f2fe"
        groundColor={courtSurface === 'clay' ? '#7c2d12' : courtSurface === 'grass' ? '#14532d' : '#1e293b'}
        intensity={0.95}
      />

      {/* ☁️ SANFTE FILL-LICHTER (DIFFUSES STREULICHT) */}
      <ambientLight intensity={0.35} color="#f8fafc" />
      <directionalLight position={[-24, 18, -16]} intensity={0.65} color="#bae6fd" />
      <directionalLight position={[-12, 14, 22]} intensity={0.45} color="#fde68a" />

      <Environment preset={courtSurface === 'grass' ? 'park' : courtSurface === 'hardcourt' ? 'city' : 'sunset'} />

      <TennisCourtArena surface={courtSurface} />

      {/* 🪑 Official Chair Umpire & Staff (Togglable) */}
      {showCourtsideStaff && (
        <>
          <TennisUmpire ballPos={ballVisualPos} />
          <TennisCourtsideStaff />
        </>
      )}

      {/* 👥 Sitzendes Publikum auf echten Stadionsitzen (Togglable) */}
      <TennisStadiumSpectators 
        showSpectators={showSpectators}
        showGrandstands={showGrandstands}
      />

      {/* 🏟️ 3D STADIUM LED SCOREBOARDS (NUR VORNE & HINTEN AN DEN GRUNDLINIEN - AGENT 17) */}
      {showScoreboard3D && (
        <>
          {/* 1. Süd-Tafel (Hinten / hinter Kran 1 Sinner) */}
          <TennisStadiumScoreboard 
            matchScore={matchScore} 
            position={[0, 4.8, -20.5]} 
            rotation={[0, 0, 0]} 
            scale={1.0} 
          />
          {/* 2. Nord-Tafel (Vorne / hinter Kran 2 Alcaraz) */}
          <TennisStadiumScoreboard 
            matchScore={matchScore} 
            position={[0, 4.8, 20.5]} 
            rotation={[0, Math.PI, 0]} 
            scale={1.0} 
          />
        </>
      )}

      {/* 🇮🇹 KRAN 1 (SÜD / JANNIK SINNER) - HIERARCHISCH INTEGRIERT (ZERO GAP) */}
      <MountedCranePlayer
        crane={crane1}
        kinematicsRef={kin1Ref}
        teamColor="#38bdf8"
        stringGlow="#bae6fd"
        racketWorldPosRef={racket1WorldPos}
        racketWorldQuatRef={racket1WorldQuat}
        baseRotation={Math.PI}
        dollyTrackZ={-15.2}
        dollyGroupRef={dolly1GroupRef}
      />

      {/* 🇪🇸 KRAN 2 (NORD / CARLOS ALCARAZ) - HIERARCHISCH INTEGRIERT (ZERO GAP) */}
      <MountedCranePlayer
        crane={crane2}
        kinematicsRef={kin2Ref}
        teamColor="#facc15"
        stringGlow="#fef08a"
        racketWorldPosRef={racket2WorldPos}
        racketWorldQuatRef={racket2WorldQuat}
        baseRotation={0}
        dollyTrackZ={15.2}
        dollyGroupRef={dolly2GroupRef}
      />

      {/* 🎾 TENNISBALL MIT PROPORTIONALEM FAKTOR 3.0 (20.1 CM DURCHMESSER) & OPTIK-FILZ & AURA */}
      <group position={[ballVisualPos.x, ballVisualPos.y, ballVisualPos.z]}>
        {/* Haupt-Filzkern (Faktor 3.0: r = 0.1005 m / d = 20.1 cm) */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[shotRef.current.isSmash ? 0.108 : shotRef.current.isLob ? 0.105 : 0.1005, 32, 32]} />
          <meshStandardMaterial
            color={shotRef.current.isSmash ? "#fef08a" : shotRef.current.isLob ? "#7dd3fc" : "#ccff00"}
            emissive={shotRef.current.isSmash ? "#f59e0b" : shotRef.current.isLob ? "#0284c7" : "#84cc16"}
            emissiveIntensity={shotRef.current.isSmash ? 1.4 : shotRef.current.isLob ? 1.0 : 0.35}
            roughness={0.82}
            metalness={0.05}
          />
        </mesh>
        {/* Typische weiße Tennisball-Naht (Curved Seam, 3x Skalierung) */}
        <mesh rotation={[0.4, 0.6, 0]}>
          <torusGeometry args={[0.1014, 0.0048, 12, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.05} />
        </mesh>
        {/* Kinetische Leucht-Aura für perfekte TV-Sichtbarkeit aus jeder Broadcast-Distanz */}
        <mesh>
          <sphereGeometry args={[shotRef.current.isSmash ? 0.165 : shotRef.current.isLob ? 0.144 : 0.126, 16, 16]} />
          <meshBasicMaterial
            color={shotRef.current.isSmash ? "#ea580c" : shotRef.current.isLob ? "#38bdf8" : "#bef264"}
            transparent
            opacity={shotRef.current.isSmash ? 0.45 : shotRef.current.isLob ? 0.35 : 0.20}
          />
        </mesh>
        {/* Smash / Power Lichtquelle */}
        <pointLight
          color={shotRef.current.isSmash ? "#f59e0b" : "#bef264"}
          intensity={shotRef.current.isSmash ? 2.2 : 0.8}
          distance={3.6}
        />
      </group>

      <OrbitControls
        ref={orbitControlsRef}
        target={[0, 1.8, 0]}
        minDistance={3}
        maxDistance={75}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />
    </>
  );
}

// --- 🎾 MAIN TENNIS EXPORT CONTAINER & BROADCAST HUD UI ---
export default function CraneTennis() {
  const [courtSurface, setCourtSurface] = useState<CourtSurface>('clay');
  const [cameraMode, setCameraMode] = useState<TennisCameraMode>('broadcast');
  const [isAIvsAI, setIsAIvsAI] = useState(true);
  const [gameSpeed, setGameSpeed] = useState(1.2);
  const [showSpectators, setShowSpectators] = useState(false);
  const [showCourtsideStaff, setShowCourtsideStaff] = useState(false);
  const [showGrandstands, setShowGrandstands] = useState(false);
  const [showUmpireCall, setShowUmpireCall] = useState(true);
  const [showScoreboard3D, setShowScoreboard3D] = useState(true);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [showH2HStats, setShowH2HStats] = useState(false);
  const [directorLiveInfo, setDirectorLiveInfo] = useState<{ cam: TennisCameraMode; label: string; reason: string }>({
    cam: 'broadcast',
    label: '📺 Broadcast Main',
    reason: 'TV-Hauptkamera (Center Court)'
  });
  const orbitControlsRef = useRef<any>(null);

  // Stroke / Shot triggers
  const [manualVolleyTrigger, setManualVolleyTrigger] = useState(0);
  const [manualSmashTrigger, setManualSmashTrigger] = useState(0);
  const [manualTopspinLobTrigger, setManualTopspinLobTrigger] = useState(0);
  const [manualSkyLobTrigger, setManualSkyLobTrigger] = useState(0);
  const [manualServiceWinnerTrigger, setManualServiceWinnerTrigger] = useState(0);
  const [manualDropTrigger, setManualDropTrigger] = useState(0);
  const [manualTopspinTrigger, setManualTopspinTrigger] = useState(0);
  const [manualLaserTrigger, setManualLaserTrigger] = useState(0);
  const [manualSliceTrigger, setManualSliceTrigger] = useState(0);
  const [manualNetErrorTrigger, setManualNetErrorTrigger] = useState(0);
  const [manualOutErrorTrigger, setManualOutErrorTrigger] = useState(0);

  // 🦅 Hawk-Eye Line Replay Data State
  const [hawkEyeData, setHawkEyeData] = useState<HawkEyeData | null>(null);
  const hawkEyeTimerRef = useRef<number | null>(null);

  const handleHawkEyeTrigger = (data: HawkEyeData) => {
    if (hawkEyeTimerRef.current) {
      window.clearTimeout(hawkEyeTimerRef.current);
    }
    setHawkEyeData(data);
    hawkEyeTimerRef.current = window.setTimeout(() => {
      setHawkEyeData(prev => prev ? { ...prev, isOpen: false } : null);
    }, 3200);
  };

  // 🎾 Hook für Match-Scoring, Sätze & State Machine (SoC)
  const { matchScore, setMatchScore, manualResetTrigger, restartMatch } = useTennisMatchEngine();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      <Canvas
        shadows
        camera={{ position: [-24, 16.0, 0], fov: 45 }}
        style={{ width: '100%', height: '100%', outline: 'none', touchAction: 'none' }}
      >
        <color attach="background" args={[courtSurface === 'cyber' ? '#040711' : '#60a5fa']} />
        <CraneTennisScene
          courtSurface={courtSurface}
          cameraMode={cameraMode}
          matchScore={matchScore}
          setMatchScore={setMatchScore}
          isAIvsAI={isAIvsAI}
          gameSpeed={gameSpeed}
          orbitControlsRef={orbitControlsRef}
          showSpectators={showSpectators}
          showCourtsideStaff={showCourtsideStaff}
          showGrandstands={showGrandstands}
          showScoreboard3D={showScoreboard3D}
          manualVolleyTrigger={manualVolleyTrigger}
          manualSmashTrigger={manualSmashTrigger}
          manualTopspinLobTrigger={manualTopspinLobTrigger}
          manualSkyLobTrigger={manualSkyLobTrigger}
          manualServiceWinnerTrigger={manualServiceWinnerTrigger}
          manualDropTrigger={manualDropTrigger}
          manualTopspinTrigger={manualTopspinTrigger}
          manualLaserTrigger={manualLaserTrigger}
          manualSliceTrigger={manualSliceTrigger}
          manualNetErrorTrigger={manualNetErrorTrigger}
          manualOutErrorTrigger={manualOutErrorTrigger}
          manualResetTrigger={manualResetTrigger}
          onDirectorInfoChange={setDirectorLiveInfo}
          onHawkEyeTrigger={handleHawkEyeTrigger}
        />
      </Canvas>

      {/* 🔴 LIVE TV BROADCAST REGIE ON-AIR TALLY HUD (AGENT 20: CAMERA DIRECTOR) */}
      {cameraMode === 'broadcast' && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(11, 16, 28, 0.90)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(239, 68, 68, 0.55)',
          borderRadius: '10px',
          padding: '8px 14px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(239, 68, 68, 0.25)',
          zIndex: 40,
          pointerEvents: 'none',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 10px #ef4444',
            flexShrink: 0
          }} />
          <div>
            <div style={{ fontSize: '9px', fontWeight: 900, color: '#ef4444', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              🔴 LIVE TV-REGIE • ON-AIR
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9' }}>
              {directorLiveInfo.label} <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 600 }}>({directorLiveInfo.reason})</span>
            </div>
          </div>
        </div>
      )}

      {/* 🦅 HAWK-EYE ELECTRONIC LINE CALLING (ELC) OVERLAY */}
      <TennisHawkEyeOverlay
        data={hawkEyeData}
        onClose={() => setHawkEyeData(null)}
      />

      {/* 📺 Official ATP Grand Slam TV Broadcast Scoreboard HUD & H2H Modal */}
      <TennisScoreboardHUD
        matchScore={matchScore}
        isAIvsAI={isAIvsAI}
        onToggleFreeze={() => setIsAIvsAI(!isAIvsAI)}
        onRestartMatch={restartMatch}
        showH2HStats={showH2HStats}
        setShowH2HStats={setShowH2HStats}
      />

      {/* 🪑 Schiedsrichter Durchsage-Fenster */}
      <TennisUmpireCallWindow
        show={showUmpireCall}
        onClose={() => setShowUmpireCall(false)}
        isControlsOpen={isControlsOpen}
        matchScore={matchScore}
      />

      {/* 🎾 Collapsible Tennis Control Drawer */}
      <TennisControlDrawer
        isControlsOpen={isControlsOpen}
        setIsControlsOpen={setIsControlsOpen}
        isAIvsAI={isAIvsAI}
        setIsAIvsAI={setIsAIvsAI}
        handleRestartMatch={restartMatch}
        setShowH2HStats={setShowH2HStats}
        courtSurface={courtSurface}
        setCourtSurface={setCourtSurface}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
        gameSpeed={gameSpeed}
        setGameSpeed={setGameSpeed}
        showSpectators={showSpectators}
        setShowSpectators={setShowSpectators}
        showCourtsideStaff={showCourtsideStaff}
        setShowCourtsideStaff={setShowCourtsideStaff}
        showGrandstands={showGrandstands}
        setShowGrandstands={setShowGrandstands}
        showUmpireCall={showUmpireCall}
        setShowUmpireCall={setShowUmpireCall}
        showScoreboard3D={showScoreboard3D}
        setShowScoreboard3D={setShowScoreboard3D}
        setManualDropTrigger={setManualDropTrigger}
        setManualLaserTrigger={setManualLaserTrigger}
        setManualTopspinTrigger={setManualTopspinTrigger}
        setManualSliceTrigger={setManualSliceTrigger}
        setManualTopspinLobTrigger={setManualTopspinLobTrigger}
        setManualSkyLobTrigger={setManualSkyLobTrigger}
        setManualSmashTrigger={setManualSmashTrigger}
        setManualVolleyTrigger={setManualVolleyTrigger}
        setManualNetErrorTrigger={setManualNetErrorTrigger}
        setManualOutErrorTrigger={setManualOutErrorTrigger}
        setManualServiceWinnerTrigger={setManualServiceWinnerTrigger}
      />
    </div>
  );
}
