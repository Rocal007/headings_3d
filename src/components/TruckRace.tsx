import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createManTglTruckRig } from '../model/manTglTruckRig';
import {
  TRUCK_CAMERA_PRESETS,
  calculateTruckCameraPose,
  evaluateAutoDirectorTruckCut,
} from '../utils/cameraDirector';
import type { TruckCameraPresetId } from '../utils/cameraDirector';
import {
  CIRCUITS_LIST,
  getCircuit,
  getCircuitSector,
  getCircuitRacingLineOffset,
  buildCircuit3D,
} from '../utils/raceTracks';
import type { CircuitId, TrackMeshesResult } from '../utils/raceTracks';

export type GraphicQualityId = 'ultra' | 'high' | 'medium' | 'eco';

export interface GraphicQualityPreset {
  id: GraphicQualityId;
  name: string;
  shortDesc: string;
  icon: string;
  shadows: boolean;
  shadowMapSize: number;
  pixelRatioCap: number;
  cloudDensity: number;
  cloudCoverage: number;
  cloudSpeed: number;
}

export const GRAPHIC_QUALITY_PRESETS: Record<GraphicQualityId, GraphicQualityPreset> = {
  ultra: {
    id: 'ultra',
    name: 'Ultra (100% - 2K Schatten, Retina)',
    shortDesc: '2048px Schatten • 2.0x Retina • fBM Wolken',
    icon: '🚀',
    shadows: true,
    shadowMapSize: 2048,
    pixelRatioCap: 2.0,
    cloudDensity: 0.88,
    cloudCoverage: 0.22,
    cloudSpeed: 0.0035,
  },
  high: {
    id: 'high',
    name: 'High (75% - 1K Schatten, 60 FPS)',
    shortDesc: '1024px Schatten • 1.5x DPI • Ausgewogen',
    icon: '⚡',
    shadows: true,
    shadowMapSize: 1024,
    pixelRatioCap: 1.5,
    cloudDensity: 0.75,
    cloudCoverage: 0.18,
    cloudSpeed: 0.0025,
  },
  medium: {
    id: 'medium',
    name: 'Medium (50% - 512px Schatten, 1.0x)',
    shortDesc: '512px Schatten • 1.0x DPI • Leichte Last',
    icon: '🌱',
    shadows: true,
    shadowMapSize: 512,
    pixelRatioCap: 1.0,
    cloudDensity: 0.50,
    cloudCoverage: 0.12,
    cloudSpeed: 0.0015,
  },
  eco: {
    id: 'eco',
    name: '25% Grafik (Eco • Max FPS)',
    shortDesc: 'Schatten AUS • 0.85x DPI • Maximale Performance',
    icon: '🔋',
    shadows: false,
    shadowMapSize: 256,
    pixelRatioCap: 0.85,
    cloudDensity: 0.0,
    cloudCoverage: 0.0,
    cloudSpeed: 0.0,
  },
};

// Module-level scratch objects for Zero-GC in Render-Loop (Säule 1.1 Architecture Standard)
const _ptScratch = new THREE.Vector3();
const _tangentScratch = new THREE.Vector3();
const _nextTangentScratch = new THREE.Vector3();
const _nextPtScratch = new THREE.Vector3();
const _steerPtScratch = new THREE.Vector3();
const _steerTanScratch = new THREE.Vector3();
const _truckPosScratch = { x: 0, y: 0, z: 0 };

export default function TruckRace({ onOpenStudio }: { onOpenStudio?: () => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDriving, setIsDriving] = useState(true);
  const [isTurbo, setIsTurbo] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [tailgateOpen, setTailgateOpen] = useState(false);
  const [platformLowered, setPlatformLowered] = useState(false);
  const [wipersActive, setWipersActive] = useState(false);
  const [isBsod, setIsBsod] = useState(false);
  const [quality, setQuality] = useState<GraphicQualityId>('eco');
  const qualityRef = useRef<GraphicQualityId>('eco');
  const qualityChangeTriggerRef = useRef<((id: GraphicQualityId) => void) | null>(null);
  const [activeCam, setActiveCam] = useState<TruckCameraPresetId>('free');
  const activeCamRef = useRef<TruckCameraPresetId>('free');
  const effectiveCamRef = useRef<TruckCameraPresetId>('free');
  const timeInShotRef = useRef<number>(0);

  const [showTrackLabels, setShowTrackLabels] = useState(true);
  const showTrackLabelsRef = useRef(true);
  const trackLabelsGroupRef = useRef<THREE.Group | null>(null);

  const [selectedCircuit, setSelectedCircuit] = useState<CircuitId>('red_bull_ring');
  const selectedCircuitRef = useRef<CircuitId>('red_bull_ring');
  const circuitChangeTriggerRef = useRef<((id: CircuitId) => void) | null>(null);

  const drivingRef = useRef(true);
  const turboRef = useRef(false);
  const doorsRef = useRef(false);
  const tailgateRef = useRef(false);
  const platformLoweredRef = useRef(false);
  const wipersActiveRef = useRef(false);

  // ⚔️ Grand Prix Duell Modus: LKW vs. Supertechno 50 Teleskopkran
  const [isDuelMode, setIsDuelMode] = useState(true);
  const isDuelModeRef = useRef(true);

  // 📂 Ausklappbare Untermenüs (Submenus Accordion Drawer)
  type SubmenuType = 'vehicle' | 'camera' | 'track' | 'settings' | null;
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>(null);
  const [isHudMinimized, setIsHudMinimized] = useState(false);

  // DOM-Refs für Telemetrie-HUD (Subagent 22.6: 60fps Zero-Garbage Live Updates)
  const telemetryFpsRef = useRef<HTMLSpanElement>(null);
  const directorBadgeRef = useRef<HTMLDivElement>(null);
  const telemetrySectorRef = useRef<HTMLSpanElement>(null);
  const telemetryF1Ref = useRef<HTMLDivElement>(null);
  const telemetryDrsRef = useRef<HTMLSpanElement>(null);
  const telemetrySpeedRef = useRef<HTMLSpanElement>(null);
  const telemetrySpeedBarRef = useRef<HTMLDivElement>(null);
  const telemetryGearRef = useRef<HTMLSpanElement>(null);
  const telemetryRpmRef = useRef<HTMLSpanElement>(null);
  const telemetryRpmBarRef = useRef<HTMLDivElement>(null);
  const telemetryAccelRef = useRef<HTMLDivElement>(null);
  const telemetryLateralGRef = useRef<HTMLDivElement>(null);
  const telemetrySteerRef = useRef<HTMLDivElement>(null);
  const telemetryPitchRef = useRef<HTMLDivElement>(null);
  const telemetryRollRef = useRef<HTMLDivElement>(null);

  // DOM-Refs für Grand Prix Duell Leaderboard
  const duelP1BadgeRef = useRef<HTMLDivElement>(null);
  const duelP2BadgeRef = useRef<HTMLDivElement>(null);
  const duelGapBadgeRef = useRef<HTMLSpanElement>(null);
  const duelTruck2SpeedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    // Kein entfernungsabhängiger schwarzer Nebel
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3000);
    camera.position.set(18, 6, 20);

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2, -2);
    controls.maxPolarAngle = Math.PI / 2 - 0.01;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // ☁️ Ultra-Realistischer Prozeduraler Atmosphären-Himmelsdom (Rayleigh & Mie-Scattering, fBM-Wolken)
    const sky = createRealisticAtmosphericSky();
    scene.add(sky.mesh);

    // ☀️ Ausgewogene, fotorealistische Sonnen- & Himmelsausleuchtung (Subagent 11: scene_environment)
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x24421b, 0.90);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffef0, 2.3);
    dirLight.position.set(25, 45, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.bias = -0.0004;
    scene.add(dirLight);
    scene.add(dirLight.target);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    fillLight.position.set(-25, 35, -28);
    scene.add(fillLight);

    const {
      truck,
      leftDoorGroup,
      rightDoorGroup,
      steeringWheel,
      tailLiftAssembly,
      platformTiltGroup,
      platformTipGroup,
      topFlapGroup,
      liftArmLGroup,
      liftArmRGroup,
      tailgateBlinkerMat,
      wheels,
      wipers,
      leftSpot,
      rightSpot,
      headlightFlareL,
      headlightFlareR,
      headlightLensMat,
      fogLampMat,
      roofMarkerMat,
      drlMat,
      rearBrakeLightMat,
      thirdBrakeLightMat,
      rearBrakeLightL,
      rearBrakeLightR,
      rearBlinkerMatL,
      rearBlinkerMatR,
      frontBlinkerMatL,
      frontBlinkerMatR,
      biLedLensMat,
      kofferBackZ,
      textures,
    } = createManTglTruckRig();
    scene.add(truck);

    // 8.1 🔴 MAN TGL 12.250 Race Truck 2 (Red Bull Racing Livery)
    const truck2Rig = createManTglTruckRig({ livery: 'red_bull_racing' });
    const truck2 = truck2Rig.truck;
    scene.add(truck2);

    // 9. Grand Prix Rennstrecken & 3D-Topographie-Engine (Subagent 22.14: truck_race_tracks)
    let currentCircuitDef = getCircuit(selectedCircuitRef.current);
    let currentCircuitResult: TrackMeshesResult = buildCircuit3D(currentCircuitDef);
    trackLabelsGroupRef.current = currentCircuitResult.trackLabelsGroup || null;
    if (currentCircuitResult.trackLabelsGroup) {
      currentCircuitResult.trackLabelsGroup.visible = showTrackLabelsRef.current;
    }
    scene.add(currentCircuitResult.group);

    // Dynamischer Strecken-Umschalter
    circuitChangeTriggerRef.current = (newId: CircuitId) => {
      // 1. Altes Streckennetz entfernen & GPU Memory freigeben
      scene.remove(currentCircuitResult.group);
      currentCircuitResult.disposables.geometries.forEach(g => g.dispose());
      currentCircuitResult.disposables.materials.forEach(m => m.dispose());
      currentCircuitResult.disposables.textures.forEach(t => t.dispose());

      // 2. Neues Streckennetz aufbauen
      currentCircuitDef = getCircuit(newId);
      currentCircuitResult = buildCircuit3D(currentCircuitDef);
      trackLabelsGroupRef.current = currentCircuitResult.trackLabelsGroup || null;
      if (currentCircuitResult.trackLabelsGroup) {
        currentCircuitResult.trackLabelsGroup.visible = showTrackLabelsRef.current;
      }
      scene.add(currentCircuitResult.group);
      trackU = 0.0;
    };

    // ⚙️ Dynamischer Grafik-Detailtreue & Performance-Umschalter
    qualityChangeTriggerRef.current = (newQ: GraphicQualityId) => {
      const preset = GRAPHIC_QUALITY_PRESETS[newQ];
      
      // 1. Pixel Ratio (DPI-Skalierung)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatioCap));
      
      // 2. Schattenwurf
      renderer.shadowMap.enabled = preset.shadows;
      dirLight.castShadow = preset.shadows;
      if (preset.shadows) {
        dirLight.shadow.mapSize.width = preset.shadowMapSize;
        dirLight.shadow.mapSize.height = preset.shadowMapSize;
        if (dirLight.shadow.map) {
          dirLight.shadow.map.dispose();
          (dirLight.shadow as any).map = null;
        }
      }
      
      // 3. Prozedurale Himmels- & Wolkenkomplexität
      sky.uniforms.uCloudDensity.value = preset.cloudDensity;
      sky.uniforms.uCloudCoverage.value = preset.cloudCoverage;
      sky.uniforms.uCloudSpeed.value = preset.cloudSpeed;
    };

    // Initiale Grafik-Qualität anwenden
    const initQuality = GRAPHIC_QUALITY_PRESETS[qualityRef.current];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, initQuality.pixelRatioCap));
    renderer.shadowMap.enabled = initQuality.shadows;
    dirLight.castShadow = initQuality.shadows;
    dirLight.shadow.mapSize.width = initQuality.shadowMapSize;
    dirLight.shadow.mapSize.height = initQuality.shadowMapSize;
    sky.uniforms.uCloudDensity.value = initQuality.cloudDensity;
    sky.uniforms.uCloudCoverage.value = initQuality.cloudCoverage;
    sky.uniforms.uCloudSpeed.value = initQuality.cloudSpeed;

    truck.rotation.y = 0;
    truck.position.set(0, 0, 0);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') {
        const next = !turboRef.current;
        turboRef.current = next;
        setIsTurbo(next);
      }
      if (e.key === 'l' || e.key === 'L') {
        const next = !showTrackLabelsRef.current;
        showTrackLabelsRef.current = next;
        setShowTrackLabels(next);
        if (trackLabelsGroupRef.current) {
          trackLabelsGroupRef.current.visible = next;
        }
      }
      if (e.key === 'd' || e.key === 'D') {
        const next = !isDuelModeRef.current;
        isDuelModeRef.current = next;
        setIsDuelMode(next);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // WebGL Context Loss & Recovery Handling (Säule 6.2)
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(animationId);
    };
    const handleContextRestored = () => {
      animate();
    };
    const canvas = canvasRef.current;
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    let animationId: number;
    let trackU = 0.0; // Streckenfortschritt des LKW auf dem Kurs [0.0, 1.0)
    let flapProgress = 0;   // 0 = zu, 1 = waagerecht offen an Ladekante
    let lowerProgress = 0;  // 0 = an Ladekante Y=1.02m, 1 = am Boden Y=0.06m
    let currentSteerAngle = 0; // Aktueller Lenkwinkel der Vorderräder
    let currentSpeed = 0;      // Momentangeschwindigkeit in m/s
    let currentPitch = 0;      // Fahrgestell-Nickwinkel (Beschleunigen/Bremsen)
    let currentRoll = 0;       // Fahrgestell-Wankwinkel (Fliehkraft in Kurven)

    // 🔴 MAN TGL 12.250 Race Truck 2 (Red Bull Racing) Variablen
    let trackU2 = 0.985;       // Startet auf P2 knapp hinter dem White LKW
    let currentSpeed2 = 0;     // Momentangeschwindigkeit in m/s
    let currentPitch2 = 0;
    let currentRoll2 = 0;
    let currentSteerAngle2 = 0;
    let truck2Heading = 0;
    const _truck2PosVec = new THREE.Vector3();

    const wheelRadius = 0.408; // Match tireRadius
    const timer = new THREE.Timer();

    let frameCount = 0;
    let lastPerfSample = performance.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Delta-Time Normalisierung für 60Hz / 120Hz / 144Hz (Säule 1.2)
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.1);
      const elapsedTime = timer.getElapsed();

      // ⏱️ FPS & GPU-Frame-Dauer Profiling (Aktualisierung alle 400ms)
      frameCount++;
      const nowPerf = performance.now();
      if (nowPerf - lastPerfSample >= 400) {
        const elapsedPerf = nowPerf - lastPerfSample;
        const fps = (frameCount / elapsedPerf) * 1000;
        const ms = elapsedPerf / Math.max(1, frameCount);
        if (telemetryFpsRef.current) {
          telemetryFpsRef.current.innerText = `${fps.toFixed(0)} FPS • ${ms.toFixed(1)}ms`;
          telemetryFpsRef.current.style.color = fps >= 55 ? '#2ecc71' : fps >= 35 ? '#f1c40f' : '#e74c3c';
        }
        frameCount = 0;
        lastPerfSample = nowPerf;
      }

      // ☁️ Himmelsdom & dynamische Wolkendrift aktualisieren (zentriert auf Kamera)
      sky.uniforms.uTime.value = elapsedTime;
      sky.mesh.position.copy(camera.position);

      // =======================================================================
      // 🏎️ Grand Prix Streckenkinematik, Dynamische Ideallinie & Kurvendynamik
      // =======================================================================
      const currentU = ((trackU % 1.0) + 1.0) % 1.0;
      const isTurboActive = turboRef.current;
      const pt = currentCircuitResult.trackCurve.getPointAt(currentU, _ptScratch);
      const tangent = currentCircuitResult.trackCurve.getTangentAt(currentU, _tangentScratch);
      const splineLength = currentCircuitResult.splineLength;

      // Streckennormale in der XZ-Ebene (für Querversatz der Ideallinie)
      const nx = -tangent.z;
      const nz = tangent.x;
      const len = Math.hypot(nx, nz) || 1;
      const normX = nx / len;
      const normZ = nz / len;

      // 🏎️ DYNAMISCHE IDEALLINIE (AUSSEN ANFAHREN -> SCHEITELPUNKT INNEN -> AUSSEN HERAUSBESCHLEUNIGEN)
      const rawOffset = getCircuitRacingLineOffset(currentCircuitDef, currentU);
      const racingOffset = isTurboActive ? rawOffset : rawOffset * 0.45; // LKW nutzt gemäßigten Offset

      const x = pt.x + normX * racingOffset;
      const y = pt.y;
      const z = pt.z + normZ * racingOffset;

      // Vorausschauende Fahrtrichtung (Heading) entlang der realen Ideallinien-Trajektorie
      const duHeading = Math.max(0.001, 6.0 / splineLength);
      const uAhead = (currentU + duHeading) % 1.0;
      const ptAhead = currentCircuitResult.trackCurve.getPointAt(uAhead, _nextPtScratch);
      const tanAhead = currentCircuitResult.trackCurve.getTangentAt(uAhead, _nextTangentScratch);
      const nxA = -tanAhead.z;
      const nzA = tanAhead.x;
      const lenA = Math.hypot(nxA, nzA) || 1;
      const rawOffsetAhead = getCircuitRacingLineOffset(currentCircuitDef, uAhead);
      const racingOffsetAhead = isTurboActive ? rawOffsetAhead : rawOffsetAhead * 0.45;

      const xAhead = ptAhead.x + (nxA / lenA) * racingOffsetAhead;
      const zAhead = ptAhead.z + (nzA / lenA) * racingOffsetAhead;

      const heading = Math.atan2(xAhead - x, zAhead - z);
      const roadPitch = Math.atan2(-tangent.y, Math.hypot(tangent.x, tangent.z));

      // Vorausschauendes Einlenken auf den nächsten Scheitelpunkt (18 Meter Vorausschau)
      const lookaheadMeters = 18.0;
      const duSteer = lookaheadMeters / splineLength;
      const uSteer = (currentU + duSteer) % 1.0;
      const ptSteer = currentCircuitResult.trackCurve.getPointAt(uSteer, _steerPtScratch);
      const tanSteer = currentCircuitResult.trackCurve.getTangentAt(uSteer, _steerTanScratch);
      const nxS = -tanSteer.z;
      const nzS = tanSteer.x;
      const lenS = Math.hypot(nxS, nzS) || 1;
      const rawOffSteer = getCircuitRacingLineOffset(currentCircuitDef, uSteer);
      const offSteer = isTurboActive ? rawOffSteer : rawOffSteer * 0.45;

      const xSteer = ptSteer.x + (nxS / lenS) * offSteer;
      const zSteer = ptSteer.z + (nzS / lenS) * offSteer;
      const headingSteer = Math.atan2(xSteer - x, zSteer - z);
      let dHeading = headingSteer - heading;
      if (dHeading > Math.PI) dHeading -= Math.PI * 2;
      if (dHeading < -Math.PI) dHeading += Math.PI * 2;
      // Deadzone für absolute Ruhe und spurtreue Geradeausfahrt:
      if (Math.abs(dHeading) < 0.008) dHeading = 0.0;

      // Aktueller Streckenabschnitt der gewählten Rennstrecke
      const sector = getCircuitSector(currentCircuitDef, currentU);

      // Dynamisches, stufenloses Geschwindigkeitsprofil ohne Phantom-Bremsungen:
      let targetSpeedKmh = 0.0;
      if (drivingRef.current) {
        // Exakte Streckensegment-Berechnung mit vorausschauender Bremszonen-Interpolation
        const sectors = currentCircuitDef.sectors;
        let curIdx = 0;
        for (let sIdx = 0; sIdx < sectors.length; sIdx++) {
          if (currentU >= sectors[sIdx].uStart && currentU < sectors[sIdx].uEnd) {
            curIdx = sIdx;
            break;
          }
        }
        const curSec = sectors[curIdx];
        const nextIdx = (curIdx + 1) % sectors.length;
        const nextSec = sectors[nextIdx];

        const curBase = isTurboActive
          ? (curSec.f1Speed + (curSec.drsZone ? 24.0 : 0.0))
          : curSec.speedTarget;
        const nextBase = isTurboActive
          ? (nextSec.f1Speed + (nextSec.drsZone ? 24.0 : 0.0))
          : nextSec.speedTarget;

        const secLen = Math.max(0.001, curSec.uEnd - curSec.uStart);
        const progressInSec = THREE.MathUtils.clamp((currentU - curSec.uStart) / secLen, 0.0, 1.0);

        if (curSec.turnNum === 0 && nextSec.turnNum > 0) {
          // Gerade vor Bremszone: Volle Höchstgeschwindigkeit, erst in den letzten 26% sanftes Anbremsen
          const brakeThreshold = isTurboActive ? 0.74 : 0.78;
          if (progressInSec < brakeThreshold) {
            targetSpeedKmh = curBase;
          } else {
            const brakeT = (progressInSec - brakeThreshold) / (1.0 - brakeThreshold);
            const smoothDecel = Math.sin(brakeT * Math.PI * 0.5);
            targetSpeedKmh = THREE.MathUtils.lerp(curBase, nextBase, smoothDecel);
          }
        } else if (curSec.turnNum > 0 && nextSec.turnNum === 0) {
          // Kurvenausgang auf Gerade: Apex-Speed halten, in den letzten 32% progressive Beschleunigung
          if (progressInSec < 0.68) {
            targetSpeedKmh = curBase;
          } else {
            const accelT = (progressInSec - 0.68) / 0.32;
            const smoothPower = accelT * accelT;
            targetSpeedKmh = THREE.MathUtils.lerp(curBase, nextBase, smoothPower);
          }
        } else {
          // Kurve-zu-Kurve oder Gerade-zu-Gerade
          if (progressInSec < 0.78) {
            targetSpeedKmh = curBase;
          } else {
            const t = (progressInSec - 0.78) / 0.22;
            const smoothT = t * t * (3.0 - 2.0 * t);
            targetSpeedKmh = THREE.MathUtils.lerp(curBase, nextBase, smoothT);
          }
        }
      }

      const targetSpeedMps = targetSpeedKmh / 3.6;
      const accelRate = isTurboActive 
        ? ((targetSpeedMps > currentSpeed) ? 7.5 : 14.5) 
        : ((targetSpeedMps > currentSpeed) ? 2.0 : 4.0);

      const prevSpeed = currentSpeed;
      currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeedMps, 1 - Math.exp(-accelRate * delta));
      const currentAccel = (currentSpeed - prevSpeed) / Math.max(delta, 0.001); // m/s^2

      // Reale gefahrene Distanz & Streckenfortschritt trackU (Exakte physikalische Geschwindigkeit)
      const distanceTravelled = currentSpeed * delta;
      trackU = (trackU + distanceTravelled / splineLength) % 1.0;

      // 1. Nick-Dynamik (Chassis Pitch + 3D-Geländeneigung)
      const pitchMult = isTurboActive ? 0.008 : 0.006;
      const targetPitch = THREE.MathUtils.clamp(-currentAccel * pitchMult, -0.045, 0.065);
      currentPitch = THREE.MathUtils.lerp(currentPitch, targetPitch, 1 - Math.exp(-9.0 * delta));

      // 2. Wank-Dynamik (Chassis Roll: Fliehkraft in Kurven)
      const lateralAccel = (currentSpeed * currentSpeed) * (dHeading / lookaheadMeters); // m/s^2
      const rollMult = isTurboActive ? 0.0024 : 0.006; // F1 straffere Wankstabilisierung
      const targetRoll = THREE.MathUtils.clamp(-lateralAccel * rollMult, -0.055, 0.055);
      currentRoll = THREE.MathUtils.lerp(currentRoll, targetRoll, 1 - Math.exp(-8.0 * delta));

      // 3. Fahrbahn-Rumpeln & 6-Zylinder Diesel Motorvibration (bei Turbo Hochfrequenz-Pfeifen)
      const vibeFreq = isTurboActive ? 85.0 : 45.0;
      const vibeAmp = isTurboActive ? 0.0010 : 0.0022;
      const roadVibe = (currentSpeed > 0.1) ? (Math.sin(elapsedTime * vibeFreq) * vibeAmp) * Math.min(1.0, currentSpeed / 20.0) : 0;
      const engineIdle = Math.sin(elapsedTime * (isTurboActive ? 40.0 : 22.0)) * 0.0008;

      truck.position.x = x;
      truck.position.y = y + 0.10 + roadVibe + engineIdle;
      truck.position.z = z;

      // Ausrichtung mit YXZ-Euler-Ordnung (Heading + Nick + Geländeneigung + Wank)
      truck.rotation.order = 'YXZ';
      truck.rotation.y = heading;
      truck.rotation.x = currentPitch + roadPitch;
      truck.rotation.z = currentRoll;

      // Sonnenlicht folgt dem LKW für scharfe Schatten
      dirLight.position.set(x + 20, y + 32, z + 24);
      dirLight.target.position.set(x, y + 1.8, z);
      dirLight.target.updateMatrixWorld();
      fillLight.position.set(x - 18, y + 22, z - 20);

      // 4. Vorderräder lenken synchron mit der Kurvenfahrt (Ackermann-Geometrie)
      const targetSteerAngle = (currentSpeed > 0.1) ? THREE.MathUtils.clamp(dHeading * 1.5, -0.40, 0.40) : 0;
      const steerDamp = 1 - Math.exp(-9.0 * delta);
      currentSteerAngle = THREE.MathUtils.lerp(currentSteerAngle, targetSteerAngle, steerDamp);

      if (wheels.length >= 2) {
        wheels[0].rotation.y = currentSteerAngle; // Linkes Vorderrad
        wheels[1].rotation.y = currentSteerAngle; // Rechtes Vorderrad
      }

      // Lenkrad im Cockpit dreht sich synchron mit
      steeringWheel.rotation.z = -currentSteerAngle * 3.5;

      // 5. Räder drehen sich synchron zur echten Momentangeschwindigkeit (Null Schlupf)
      if (currentSpeed > 0.01) {
        wheels.forEach(w => {
          w.children[0].rotation.x += distanceTravelled / wheelRadius;
          w.children[1].rotation.x += distanceTravelled / wheelRadius;
          w.children[2].rotation.x += distanceTravelled / wheelRadius;
        });
      }

      // =======================================================================
      // 🔴 MAN TGL 12.250 TRUCK 2 (RED BULL RACING): PHYSIK & DUELL-DYNAMIK
      // =======================================================================
      let truck2SpeedKmh = 0;

      if (isDuelModeRef.current) {
        truck2.visible = true;

        // 1. Position & Überhol-Linie
        const t2CurSec = getCircuitSector(currentCircuitDef, trackU2);
        const t2Pt = currentCircuitResult.trackCurve.getPointAt(trackU2);
        const t2Tan = currentCircuitResult.trackCurve.getTangentAt(trackU2);
        truck2Heading = Math.atan2(t2Tan.x, t2Tan.z);
        const t2RoadPitch = Math.atan2(-t2Tan.y, Math.hypot(t2Tan.x, t2Tan.z));

        const t2Nx = -t2Tan.z;
        const t2Nz = t2Tan.x;
        const t2Len = Math.hypot(t2Nx, t2Nz) || 1;
        const t2nX = t2Nx / t2Len;
        const t2nZ = t2Nz / t2Len;

        // Taktische Ideallinie des Red Bull LKWs:
        // Attackiert die Gegen-Spur & fährt Windschatten-Manöver
        const truckOffsetAtT2 = getCircuitRacingLineOffset(currentCircuitDef, trackU2);
        const t2Offset = (t2CurSec.turnNum === 0)
          ? (truckOffsetAtT2 >= 0 ? -4.5 : 4.5)
          : (truckOffsetAtT2 >= 0 ? -4.0 : 4.0);

        _truck2PosVec.set(
          t2Pt.x + t2nX * t2Offset,
          t2Pt.y,
          t2Pt.z + t2nZ * t2Offset
        );

        // 2. Lookahead
        const t2LookaheadM = Math.min(1.0, (currentSpeed2 > 10 ? (currentSpeed2 * 0.45) : 6.0) / splineLength);
        const t2LookU = (trackU2 + t2LookaheadM) % 1.0;
        const t2NextTan = currentCircuitResult.trackCurve.getTangentAt(t2LookU);
        const t2NextHeading = Math.atan2(t2NextTan.x, t2NextTan.z);
        let t2DHeading = t2NextHeading - truck2Heading;
        while (t2DHeading > Math.PI) t2DHeading -= Math.PI * 2;
        while (t2DHeading < -Math.PI) t2DHeading += Math.PI * 2;

        // 3. Geschwindigkeits-Regelung (Red Bull Racing Power)
        const t2BaseKmh = isTurboActive
          ? (t2CurSec.f1Speed + (t2CurSec.drsZone ? 28.0 : 5.0))
          : (t2CurSec.speedTarget * 1.05);
        // Oszillierende Renn-Dynamik (Führungswechsel)
        const t2Swing = 1.0 + Math.cos(elapsedTime * 0.42) * 0.08;
        const t2TargetKmh = drivingRef.current ? (t2BaseKmh * t2Swing) : 0;
        const t2TargetMps = t2TargetKmh / 3.6;

        const prevT2Speed = currentSpeed2;
        const t2AccelRate = isTurboActive ? 8.5 : 3.2;
        currentSpeed2 = THREE.MathUtils.lerp(currentSpeed2, t2TargetMps, 1 - Math.exp(-t2AccelRate * delta));
        const t2Accel = (currentSpeed2 - prevT2Speed) / Math.max(delta, 0.001);
        truck2SpeedKmh = currentSpeed2 * 3.6;

        const t2DistTravelled = currentSpeed2 * delta;
        trackU2 = (trackU2 + t2DistTravelled / splineLength) % 1.0;

        // 4. Nick & Wank
        const t2TargetPitch = THREE.MathUtils.clamp(-t2Accel * 0.006, -0.04, 0.05);
        currentPitch2 = THREE.MathUtils.lerp(currentPitch2, t2TargetPitch, 1 - Math.exp(-9.0 * delta));
        const t2LateralG = (currentSpeed2 * currentSpeed2) * (t2DHeading / Math.max(1, t2LookaheadM * splineLength));
        const t2TargetRoll = THREE.MathUtils.clamp(-t2LateralG * 0.003, -0.045, 0.045);
        currentRoll2 = THREE.MathUtils.lerp(currentRoll2, t2TargetRoll, 1 - Math.exp(-8.0 * delta));

        // 5. Lenkung & Räder
        const t2TargetSteer = (currentSpeed2 > 0.1) ? THREE.MathUtils.clamp(t2DHeading * 1.5, -0.40, 0.40) : 0;
        currentSteerAngle2 = THREE.MathUtils.lerp(currentSteerAngle2, t2TargetSteer, 1 - Math.exp(-9.0 * delta));

        if (truck2Rig.wheels.length >= 2) {
          truck2Rig.wheels[0].rotation.y = currentSteerAngle2;
          truck2Rig.wheels[1].rotation.y = currentSteerAngle2;
        }
        if (currentSpeed2 > 0.01) {
          truck2Rig.wheels.forEach(w => {
            w.children[0].rotation.x += t2DistTravelled / wheelRadius;
            w.children[1].rotation.x += t2DistTravelled / wheelRadius;
            w.children[2].rotation.x += t2DistTravelled / wheelRadius;
          });
        }

        // 6. Transform Update
        truck2.position.set(_truck2PosVec.x, _truck2PosVec.y, _truck2PosVec.z);
        truck2.rotation.y = truck2Heading;
        truck2.rotation.x = currentPitch2 + t2RoadPitch;
        truck2.rotation.z = currentRoll2;
      } else {
        truck2.visible = false;
      }

      // =======================================================================
      // 📡 Subagent 22.6: Live-Telemetrie-HUD Aktualisierung (60fps Zero-Garbage)
      // =======================================================================
      const speedKmh = currentSpeed * 3.6;
      const accelG = currentAccel / 9.81;
      const steerDeg = currentSteerAngle * (180 / Math.PI);
      const pitchDeg = currentPitch * (180 / Math.PI);
      const rollDeg = currentRoll * (180 / Math.PI);
      const lateralG = lateralAccel / 9.81;
      
      let rpm = 750;
      let gearName = 'N';
      if (drivingRef.current && currentSpeed > 0.1) {
        if (isTurboActive) {
          // F1 8-Gang Seamless-Shift Getriebe
          let f1GearNum = 1;
          if (speedKmh < 80) f1GearNum = 1;
          else if (speedKmh < 120) f1GearNum = 2;
          else if (speedKmh < 160) f1GearNum = 3;
          else if (speedKmh < 200) f1GearNum = 4;
          else if (speedKmh < 245) f1GearNum = 5;
          else if (speedKmh < 285) f1GearNum = 6;
          else if (speedKmh < 320) f1GearNum = 7;
          else f1GearNum = 8;
          gearName = `G${f1GearNum}`;

          const gearMinSpeed = [0, 0, 80, 120, 160, 200, 245, 285, 320][f1GearNum];
          const gearMaxSpeed = [0, 80, 120, 160, 200, 245, 285, 320, 365][f1GearNum];
          const gearFrac = THREE.MathUtils.clamp((speedKmh - gearMinSpeed) / Math.max(1, gearMaxSpeed - gearMinSpeed), 0, 1);
          rpm = 8800 + gearFrac * 3800; // 8.800 bis 12.600 RPM
        } else {
          if (speedKmh < 18) {
            gearName = 'D1';
            rpm = 800 + (speedKmh / 18) * 1100;
          } else if (speedKmh < 36) {
            gearName = 'D2';
            rpm = 1000 + ((speedKmh - 18) / 18) * 1000;
          } else if (speedKmh < 54) {
            gearName = 'D3';
            rpm = 1100 + ((speedKmh - 36) / 18) * 950;
          } else if (speedKmh < 72) {
            gearName = 'D4';
            rpm = 1200 + ((speedKmh - 54) / 18) * 900;
          } else {
            gearName = 'D5';
            rpm = 1300 + ((speedKmh - 72) / 20) * 800;
          }
        }
      }

      if (telemetrySpeedRef.current) {
        telemetrySpeedRef.current.textContent = `${speedKmh.toFixed(1)} km/h`;
        telemetrySpeedRef.current.style.color = isTurboActive ? '#ec4899' : '#00dcff';
      }
      if (telemetrySpeedBarRef.current) {
        const maxGaugeSpeed = isTurboActive ? 360 : 90;
        telemetrySpeedBarRef.current.style.width = `${Math.min(100, (speedKmh / maxGaugeSpeed) * 100)}%`;
        telemetrySpeedBarRef.current.style.background = isTurboActive
          ? 'linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6)'
          : 'linear-gradient(90deg, #00dcff, #3498db)';
      }
      if (telemetryAccelRef.current) {
        telemetryAccelRef.current.textContent = `${accelG >= 0 ? '+' : ''}${accelG.toFixed(2)} g`;
        telemetryAccelRef.current.style.color = accelG > 0.05 ? '#2ecc71' : accelG < -0.05 ? '#e74c3c' : '#ffffff';
      }
      if (telemetrySteerRef.current) {
        telemetrySteerRef.current.textContent = Math.abs(steerDeg) < 0.5 ? 'GERADE' : steerDeg > 0 ? `◀ ${steerDeg.toFixed(1)}° L` : `▶ ${Math.abs(steerDeg).toFixed(1)}° R`;
      }
      if (telemetryLateralGRef.current) {
        telemetryLateralGRef.current.textContent = `${lateralG >= 0 ? '+' : ''}${lateralG.toFixed(2)} g`;
        telemetryLateralGRef.current.style.color = Math.abs(lateralG) > 2.0 ? '#ec4899' : '#ffffff';
      }
      if (telemetryPitchRef.current) {
        telemetryPitchRef.current.textContent = `${pitchDeg.toFixed(1)}° ${pitchDeg > 0.4 ? '🔻 DIVE' : pitchDeg < -0.3 ? '🔺 SQUAT' : 'LEVEL'}`;
      }
      if (telemetryRollRef.current) {
        telemetryRollRef.current.textContent = `${rollDeg.toFixed(1)}° ${rollDeg > 0.3 ? '◀ ROLL' : rollDeg < -0.3 ? '▶ ROLL' : 'LEVEL'}`;
      }
      if (telemetryRpmRef.current) {
        telemetryRpmRef.current.textContent = `${Math.round(rpm)} RPM`;
      }
      if (telemetryRpmBarRef.current) {
        const maxRpm = isTurboActive ? 13000 : 2200;
        const minRpm = isTurboActive ? 4000 : 600;
        telemetryRpmBarRef.current.style.width = `${Math.min(100, Math.max(5, ((rpm - minRpm) / (maxRpm - minRpm)) * 100))}%`;
        telemetryRpmBarRef.current.style.background = isTurboActive
          ? (rpm > 11500 ? 'linear-gradient(90deg, #3b82f6, #6366f1, #ec4899)' : 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)')
          : 'linear-gradient(90deg, #2ecc71, #f1c40f, #e74c3c)';
      }
      if (telemetryGearRef.current) {
        telemetryGearRef.current.textContent = gearName;
        telemetryGearRef.current.style.color = isTurboActive ? '#f43f5e' : '#ffd700';
      }
      if (telemetrySectorRef.current) {
        telemetrySectorRef.current.textContent = sector.name;
      }
      if (telemetryF1Ref.current) {
        telemetryF1Ref.current.textContent = `F1 REF: ${sector.f1Speed} km/h • GANG ${sector.f1Gear} • ${sector.f1GForce.toFixed(1)} G`;
      }
      if (telemetryDrsRef.current) {
        if (sector.drsZone) {
          telemetryDrsRef.current.style.display = 'inline-block';
          telemetryDrsRef.current.textContent = isTurboActive ? `⚡ DRS OPEN (+25 KM/H)` : sector.drsZone;
          telemetryDrsRef.current.style.background = isTurboActive ? '#22c55e' : '#ffd700';
          telemetryDrsRef.current.style.color = '#000';
        } else {
          telemetryDrsRef.current.style.display = 'none';
        }
      }

      // =======================================================================
      // 🏆 Grand Prix Duell Leaderboard (LKW 1 White vs. LKW 2 Red Bull Racing)
      // =======================================================================
      if (isDuelModeRef.current) {
        // Sortiere die 2 LKW-Racer nach Fortschritt trackU auf der Runde
        const racers = [
          { id: 'truck1', name: '🚚 MAN TGL [White]', color: '#00dcff', u: trackU, speed: currentSpeed * 3.6 },
          { id: 'truck2', name: '🔴 MAN TGL [Red Bull]', color: '#ef4444', u: trackU2, speed: truck2SpeedKmh },
        ];

        // Berechne relative Führung
        racers.sort((a, b) => {
          let diff = (b.u - a.u + 1.0) % 1.0;
          return diff > 0.5 ? -1 : 1;
        });

        const p1 = racers[0];
        const p2 = racers[1];

        let p2GapU = (p1.u - p2.u + 1.0) % 1.0;
        if (p2GapU > 0.5) p2GapU -= 1.0;
        const p2GapM = Math.abs(p2GapU) * splineLength;
        const p2GapS = p2GapM / Math.max(1.0, p1.speed / 3.6);

        if (duelP1BadgeRef.current) {
          duelP1BadgeRef.current.textContent = `🥇 P1: ${p1.name}`;
          duelP1BadgeRef.current.style.color = p1.color;
        }
        if (duelP2BadgeRef.current) {
          duelP2BadgeRef.current.textContent = `🥈 P2: ${p2.name} (+${p2GapS.toFixed(2)}s)`;
          duelP2BadgeRef.current.style.color = p2.color;
        }
        if (duelGapBadgeRef.current) {
          duelGapBadgeRef.current.textContent = `GAP: +${p2GapS.toFixed(2)}s (${p2GapM.toFixed(1)}m)`;
        }
        if (duelTruck2SpeedRef.current) {
          duelTruck2SpeedRef.current.textContent = `${truck2SpeedKmh.toFixed(1)} km/h`;
        }
      }

      // Türen animieren mit exponentieller Dämpfung (Subagent 22.9 Kinematik)
      const targetDoorAngle = doorsRef.current ? Math.PI * 0.35 : 0; // 63 Grad öffnen
      const doorDamp = 1 - Math.exp(-8 * delta);
      leftDoorGroup.rotation.y = THREE.MathUtils.lerp(leftDoorGroup.rotation.y, -targetDoorAngle, doorDamp);
      rightDoorGroup.rotation.y = THREE.MathUtils.lerp(rightDoorGroup.rotation.y, targetDoorAngle, doorDamp);

      // =======================================================================
      // 📦 Subagent 22.10: 2-Knopf Kinematik (1. Öffnen/Schließen, 2. Heben/Senken)
      // =======================================================================
      
      // 1. Öffnen/Schließen (Heckklappe oben & Plattform auf 90° Waagerechte abklappen)
      const targetFlap = (tailgateRef.current || platformLoweredRef.current) ? 1.0 : 0.0;
      const flapDamp = 1 - Math.exp(-4.0 * delta);
      flapProgress = THREE.MathUtils.lerp(flapProgress, targetFlap, flapDamp);

      topFlapGroup.rotation.x = -flapProgress * Math.PI * 0.48;
      platformTiltGroup.rotation.x = -flapProgress * (Math.PI * 0.5);

      // 2. Heben/Senken (Parallelogrammarme senken Plattform von Y=1.02m auf Y=0.06m)
      // Senken darf erst erfolgen wenn Plattform überwiegend aufgeklappt ist (> 0.6)
      const targetLower = (platformLoweredRef.current && flapProgress > 0.6) ? 1.0 : 0.0;
      const lowerDamp = 1 - Math.exp(-3.5 * delta);
      lowerProgress = THREE.MathUtils.lerp(lowerProgress, targetLower, lowerDamp);

      tailLiftAssembly.position.y = THREE.MathUtils.lerp(1.02, 0.06, lowerProgress);
      tailLiftAssembly.position.z = THREE.MathUtils.lerp(kofferBackZ, kofferBackZ - 0.06, lowerProgress);

      // Mechanische Hubarme schwenken mit
      const armAngle = Math.atan2(tailLiftAssembly.position.y - 0.45, (kofferBackZ + 0.25) - tailLiftAssembly.position.z);
      liftArmLGroup.rotation.x = armAngle;
      liftArmRGroup.rotation.x = armAngle;

      // Plattformspitze neigt sich als Roll-Off Rampe zum Boden wenn unten angekommen (> 0.75)
      const tipTiltT = THREE.MathUtils.clamp((lowerProgress - 0.75) / 0.25, 0, 1);
      platformTipGroup.rotation.x = -tipTiltT * 0.06;

      // Sicherheits-Blinker an den Plattformecken blinken bei Aktivität
      if (flapProgress > 0.05 || lowerProgress > 0.05) {
        const isBlink = Math.sin(elapsedTime * 12.0) > 0;
        tailgateBlinkerMat.emissiveIntensity = isBlink ? 2.5 : 0.2;
      } else {
        tailgateBlinkerMat.emissiveIntensity = 0.0;
      }

      // =======================================================================
      // 🚨 Subagent 22.12: Dynamische Heckleuchten & Bremslicht-Steuerung
      // =======================================================================
      const isBraking = currentAccel < -0.06 || !drivingRef.current;
      if (isBraking) {
        // Bremsleuchten aktiv (volles rotes Aufleuchten)
        rearBrakeLightMat.emissiveIntensity = 3.8;
        thirdBrakeLightMat.emissiveIntensity = 4.2;
        rearBrakeLightL.intensity = 8.5;
        rearBrakeLightR.intensity = 8.5;
      } else {
        // Normales Schlusslicht
        rearBrakeLightMat.emissiveIntensity = 0.8;
        thirdBrakeLightMat.emissiveIntensity = 0.0;
        rearBrakeLightL.intensity = 1.2;
        rearBrakeLightR.intensity = 1.2;
      }

      // =======================================================================
      // 💡 Subagent 22.13: Dynamische Frontscheinwerfer & Blinker-Steuerung
      // =======================================================================
      const blinkFreq = Math.sin(elapsedTime * 16.0) > 0;
      if (currentSteerAngle > 0.08) {
        rearBlinkerMatL.emissiveIntensity = blinkFreq ? 3.0 : 0.2;
        rearBlinkerMatR.emissiveIntensity = 0.0;
        frontBlinkerMatL.emissiveIntensity = blinkFreq ? 3.2 : 0.0;
        frontBlinkerMatR.emissiveIntensity = 0.0;
      } else if (currentSteerAngle < -0.08) {
        rearBlinkerMatR.emissiveIntensity = blinkFreq ? 3.0 : 0.2;
        rearBlinkerMatL.emissiveIntensity = 0.0;
        frontBlinkerMatR.emissiveIntensity = blinkFreq ? 3.2 : 0.0;
        frontBlinkerMatL.emissiveIntensity = 0.0;
      } else {
        rearBlinkerMatL.emissiveIntensity = 0.0;
        rearBlinkerMatR.emissiveIntensity = 0.0;
        frontBlinkerMatL.emissiveIntensity = 0.0;
        frontBlinkerMatR.emissiveIntensity = 0.0;
      }

      // Volle Frontscheinwerfer-Illumination
      biLedLensMat.emissiveIntensity = 4.5;
      headlightLensMat.emissiveIntensity = 2.8;
      drlMat.emissiveIntensity = 3.5;
      fogLampMat.emissiveIntensity = 2.0;
      roofMarkerMat.emissiveIntensity = 2.8;
      leftSpot.intensity = 42;
      rightSpot.intensity = 42;
      headlightFlareL.intensity = 4.0;
      headlightFlareR.intensity = 4.0;

      // Adaptives Kurvenlicht: Lichtkegel schwenken mit dem Lenkwinkel dynamisch mit
      leftSpot.target.position.set(0.82 + currentSteerAngle * 4.0, -0.5, 22);
      rightSpot.target.position.set(-0.82 + currentSteerAngle * 4.0, -0.5, 22);

      // Scheibenwischer animieren (Subagent 22.7 Kinematik)
      if (wipersActiveRef.current) {
        const wiperAngle = (Math.sin(elapsedTime * 18.0) * 0.5 + 0.5) * 1.35; // Synchron-Pendeln 0° - 77°
        wipers.forEach(w => {
          w.rotation.z = -0.35 + wiperAngle;
        });
      } else {
        const wiperDamp = 1 - Math.exp(-6 * delta);
        wipers.forEach(w => {
          w.rotation.z = THREE.MathUtils.lerp(w.rotation.z, -0.35, wiperDamp); // Sanftes Zurückfahren in Ruhelage
        });
      }

      // =======================================================================
      // 🎬 Subagent 20: `camera_director` - ECHTE BROADCAST-SCHNITTE (HARD CUTS)
      // =======================================================================
      timeInShotRef.current += delta;
      let effectiveCam = activeCamRef.current;
      let isCut = false;

      if (activeCamRef.current === 'auto_director') {
        const isTailgateActive = flapProgress > 0.05 || lowerProgress > 0.05;
        const cut = evaluateAutoDirectorTruckCut(
          effectiveCamRef.current,
          timeInShotRef.current,
          speedKmh,
          steerDeg,
          isTailgateActive
        );
        if (cut.nextCam !== effectiveCamRef.current) {
          effectiveCamRef.current = cut.nextCam;
          timeInShotRef.current = 0;
          isCut = true; // Sofortiger harter Kameraschnitt (Keine Kamerafahrt!)
          if (directorBadgeRef.current) {
            directorBadgeRef.current.textContent = `● ON AIR [${TRUCK_CAMERA_PRESETS[cut.nextCam]?.name?.toUpperCase() || cut.nextCam}] • ${cut.reason}`;
          }
        }
        effectiveCam = effectiveCamRef.current;
      } else {
        if (effectiveCamRef.current !== activeCamRef.current) {
          isCut = true;
          timeInShotRef.current = 0;
        }
        effectiveCamRef.current = activeCamRef.current;
        effectiveCam = activeCamRef.current;
      }

      if (effectiveCam === 'free') {
        // Freie interaktive OrbitControls
        controls.enabled = true;
        if (drivingRef.current) {
          controls.target.set(x, y + 1.8, z);
        }
        controls.update();
      } else {
        controls.enabled = false;
        _truckPosScratch.x = x;
        _truckPosScratch.y = y;
        _truckPosScratch.z = z;
        const targetPose = calculateTruckCameraPose(
          effectiveCam,
          _truckPosScratch,
          heading,
          elapsedTime,
          {
            cameras: currentCircuitDef.cameras,
            trackCurve: currentCircuitResult.trackCurve,
            currentU: trackU,
            truck2WorldPos: isDuelModeRef.current ? { x: _truck2PosVec.x, y: _truck2PosVec.y, z: _truck2PosVec.z } : undefined,
            truck2Heading: truck2Heading,
          }
        );

        if (isCut) {
          // ⚡ ECHTER BROADCAST-SCHNITT: 1-Frame Hard Cut (Keine interpolierende Kamerafahrt)
          camera.position.copy(targetPose.position);
          controls.target.copy(targetPose.target);
          camera.fov = targetPose.fov;
          camera.updateProjectionMatrix();
          camera.lookAt(controls.target);
        } else {
          // Innerhalb der laufenden Einstellung:
          if (effectiveCam === 'trackside_tv') {
            // 📺 TV-Streckenkameraturm: Position ist fest auf dem Gerüst, Kamera schwenkt dem LKW hinterher
            camera.position.copy(targetPose.position);
            const panDamp = 1 - Math.exp(-14.0 * delta);
            controls.target.lerp(targetPose.target, panDamp);
            camera.lookAt(controls.target);
          } else if (
            effectiveCam === 'cockpit' ||
            effectiveCam === 'side_mirror' ||
            effectiveCam === 'front_hero' ||
            effectiveCam === 'tailgate'
          ) {
            // Cockpit, Spiegel, Front-Hero & Heck sind starr am LKW montiert (Zero-Lag)
            camera.position.copy(targetPose.position);
            controls.target.copy(targetPose.target);
            camera.lookAt(controls.target);
          } else {
            // Verfolger (Follow), Drohne und Cinematic folgen mit sanfter Nachführung
            const camDamp = 1 - Math.exp(-8.0 * delta);
            camera.position.lerp(targetPose.position, camDamp);
            controls.target.lerp(targetPose.target, camDamp);
            camera.lookAt(controls.target);
          }

          if (Math.abs(camera.fov - targetPose.fov) > 0.1) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetPose.fov, 1 - Math.exp(-6.0 * delta));
            camera.updateProjectionMatrix();
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      cancelAnimationFrame(animationId);
      
      // Vollständiges GPU Resource Disposing (Säule 2.1: Zero-Leak Policy)
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });

      renderer.dispose();
      pmremGenerator.dispose();
      textures.forEach(t => t.dispose());

      currentCircuitResult.disposables.geometries.forEach(g => g.dispose());
      currentCircuitResult.disposables.materials.forEach(m => m.dispose());
      currentCircuitResult.disposables.textures.forEach(t => t.dispose());

      truck2Rig.textures.forEach(t => t.dispose());
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
      


      {/* 📡 SPEED TELEMETRIE HUD (Minimalistisch, Ultra-Präzise & Fokussiert auf Geschwindigkeit) */}
      <div style={{
        position: 'absolute', top: 20, right: 20, width: isHudMinimized ? 160 : 270,
        background: 'rgba(10, 15, 25, 0.86)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 220, 255, 0.28)',
        borderRadius: 14,
        padding: isHudMinimized ? '10px 12px' : '14px 16px',
        color: '#ffffff',
        fontFamily: '"JetBrains Mono", "SF Mono", "Consolas", monospace',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), inset 0 0 16px rgba(0, 220, 255, 0.06)',
        pointerEvents: 'auto',
        userSelect: 'none',
        zIndex: 50,
        transition: 'all 0.25s ease',
      }}>
        {/* Header mit Minimieren-Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,220,255,0.18)', paddingBottom: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>📡</span>
            <span style={{ fontWeight: 800, letterSpacing: 0.8, color: '#00dcff', fontSize: 10.5 }}>SPEED TELEMETRIE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span ref={telemetryFpsRef} style={{
              fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 4,
              background: 'rgba(0,0,0,0.5)', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.4)',
              fontFamily: 'monospace'
            }}>
              60 FPS
            </span>
            <button
              onClick={() => setIsHudMinimized(!isHudMinimized)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: 4,
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 900
              }}
              title={isHudMinimized ? "Maximieren" : "Minimieren"}
            >
              {isHudMinimized ? '□' : '–'}
            </button>
          </div>
        </div>

        {/* 🚀 Große Geschwindigkeitsanzeige (Prominent & Edel) */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span ref={telemetrySpeedRef} style={{ fontWeight: 900, fontSize: isHudMinimized ? 24 : 34, color: '#00dcff', letterSpacing: -0.5, textShadow: '0 0 20px rgba(0,220,255,0.65)' }}>
              0.0
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>km/h</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span ref={telemetryGearRef} style={{ color: isTurbo ? '#ec4899' : '#ffd700', fontWeight: 900, fontSize: 14, background: isTurbo ? 'rgba(236,72,153,0.15)' : 'rgba(255,215,0,0.15)', border: isTurbo ? '1px solid rgba(236,72,153,0.4)' : '1px solid rgba(255,215,0,0.4)', padding: '2px 7px', borderRadius: 5 }}>
              D1
            </span>
            <span ref={telemetryDrsRef} style={{ display: 'none', background: '#22c55e', color: '#000', fontSize: 8, fontWeight: 900, padding: '2px 5px', borderRadius: 4 }}>
              DRS
            </span>
          </div>
        </div>

        {/* Dynamic Speed Progress Bar */}
        <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginTop: 6, marginBottom: isHudMinimized ? 0 : 8 }}>
          <div ref={telemetrySpeedBarRef} style={{ width: '0%', height: '100%', background: isTurbo ? 'linear-gradient(90deg, #3b82f6, #ec4899, #f43f5e)' : 'linear-gradient(90deg, #00dcff, #3b82f6)', transition: 'width 0.08s linear' }} />
        </div>

        {!isHudMinimized && (
          <>
            {/* Sektor-Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 220, 255, 0.06)', border: '1px solid rgba(0, 220, 255, 0.15)', borderRadius: 6, padding: '4px 8px', marginTop: 4 }}>
              <span ref={telemetrySectorRef} style={{ color: isTurbo ? '#ec4899' : '#38bdf8', fontWeight: 800, fontSize: 9.5, letterSpacing: 0.3 }}>
                START/ZIEL GERADE
              </span>
              <span ref={telemetryF1Ref} style={{ color: '#94a3b8', fontSize: 8, fontFamily: 'monospace' }}>
                F1 REF: 315 km/h
              </span>
            </div>

            {/* ⚔️ GRAND PRIX 2-LKW DUELL: MINI-LEADERBOARD */}
            {isDuelMode && (
              <div style={{
                marginTop: 8,
                padding: '6px 8px',
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(0, 220, 255, 0.10) 100%)',
                border: '1px solid rgba(0, 220, 255, 0.25)',
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ color: '#ffd700', fontSize: 8.5, fontWeight: 900, letterSpacing: 0.5 }}>⚔️ 2-LKW DUELL RANKING</span>
                  <span ref={duelGapBadgeRef} style={{ background: '#0f172a', color: '#38bdf8', fontSize: 7.5, fontWeight: 800, padding: '1px 4px', borderRadius: 3, border: '1px solid #38bdf8' }}>
                    GAP: +0.14s
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div ref={duelP1BadgeRef} style={{ fontSize: 9, fontWeight: 800, color: '#00dcff' }}>
                    🥇 P1: 🚚 MAN TGL [White]
                  </div>
                  <div ref={duelP2BadgeRef} style={{ fontSize: 8.5, fontWeight: 700, color: '#ef4444' }}>
                    🥈 P2: 🔴 MAN TGL [Red Bull] (+0.14s)
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🎛️ MODULARES AUSKLAPPBARES STEUERUNGSZENTRUM (UNTERMENÜS) */}
      {/* ========================================================================= */}
      <div style={{
        position: 'absolute', bottom: 25, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        pointerEvents: 'auto', zIndex: 60,
      }}>
        {/* 📂 AUSGEKLAPPTES UNTERMENÜ-FENSTER (FLOATING GLASS PANEL) */}
        {activeSubmenu && (
          <div style={{
            background: 'rgba(10, 15, 25, 0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 220, 255, 0.35)',
            borderRadius: 14,
            padding: '16px 20px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(0, 220, 255, 0.15)',
            color: '#fff',
            fontFamily: '"Inter", sans-serif',
            minWidth: 360,
            maxWidth: '90vw',
            animation: 'fadeIn 0.2s ease',
          }}>
            {/* 1. UNTERMENÜ: FAHRZEUG & RENNEN */}
            {activeSubmenu === 'vehicle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#00dcff' }}>🏎️ FAHRZEUG & RENN-SETUP</span>
                  <button onClick={() => setActiveSubmenu(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    onClick={() => {
                      const driving = !isDriving;
                      setIsDriving(driving);
                      drivingRef.current = driving;
                      if (driving) {
                        setDoorsOpen(false); doorsRef.current = false;
                        setTailgateOpen(false); tailgateRef.current = false;
                        setPlatformLowered(false); platformLoweredRef.current = false;
                      }
                    }}
                    style={{
                      padding: '10px 14px', borderRadius: 8, border: 'none',
                      background: isDriving ? '#e74c3c' : '#2ecc71', color: '#fff',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <span>{isDriving ? '🛑' : '▶️'}</span>
                    <span>{isDriving ? 'Anhalten' : 'Weiterfahren'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = !isTurbo;
                      setIsTurbo(next);
                      turboRef.current = next;
                    }}
                    style={{
                      padding: '10px 14px', borderRadius: 8,
                      border: isTurbo ? '1px solid #ec4899' : '1px solid rgba(255,215,0,0.4)',
                      background: isTurbo ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'rgba(255,255,255,0.06)',
                      color: isTurbo ? '#fff' : '#ffd700',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <span>{isTurbo ? '🔥' : '⚡'}</span>
                    <span>{isTurbo ? 'F1 Turbo: AN [T]' : 'F1 Turbo: AUS [T]'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = !isDuelMode;
                      setIsDuelMode(next);
                      isDuelModeRef.current = next;
                    }}
                    style={{
                      gridColumn: 'span 2',
                      padding: '10px 14px', borderRadius: 8,
                      border: isDuelMode ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.2)',
                      background: isDuelMode ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%)' : 'rgba(255,255,255,0.06)',
                      color: isDuelMode ? '#ffd700' : '#fff',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <span>⚔️</span>
                    <span>{isDuelMode ? '2-LKW Duell: White vs. Red Bull (AN) [D]' : 'Solo: Nur LKW 1 [D]'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                  <button
                    onClick={() => {
                      const open = !doorsOpen;
                      setDoorsOpen(open);
                      doorsRef.current = open;
                      if (open) { setIsDriving(false); drivingRef.current = false; }
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                      background: doorsOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', color: '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {doorsOpen ? '🚪 Türen zu' : '🚪 Türen auf'}
                  </button>

                  <button
                    onClick={() => {
                      const open = !tailgateOpen;
                      setTailgateOpen(open);
                      tailgateRef.current = open;
                      if (!open) { setPlatformLowered(false); platformLoweredRef.current = false; }
                      if (open) { setIsDriving(false); drivingRef.current = false; }
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                      background: tailgateOpen ? 'rgba(234, 179, 8, 0.35)' : 'rgba(255,255,255,0.05)', color: '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {tailgateOpen ? '📦 Klappe zu' : '📦 Klappe auf'}
                  </button>

                  <button
                    onClick={() => {
                      const lower = !platformLowered;
                      setPlatformLowered(lower);
                      platformLoweredRef.current = lower;
                      if (lower) { setTailgateOpen(true); tailgateRef.current = true; setIsDriving(false); drivingRef.current = false; }
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                      background: platformLowered ? 'rgba(249, 115, 22, 0.35)' : 'rgba(255,255,255,0.05)', color: '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {platformLowered ? '⬆️ Bordwand heben' : '⬇️ Bordwand senken'}
                  </button>

                  <button
                    onClick={() => {
                      const active = !wipersActive;
                      setWipersActive(active);
                      wipersActiveRef.current = active;
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                      background: wipersActive ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255,255,255,0.05)', color: '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {wipersActive ? '🌧️ Wischer: AN' : '🌧️ Wischer: AUS'}
                  </button>
                </div>
              </div>
            )}

            {/* 2. UNTERMENÜ: KAMERA & TV-REGIE */}
            {activeSubmenu === 'camera' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 420 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#00dcff' }}>🎥 KAMERA & TV-REGIE</span>
                    {activeCam === 'auto_director' && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: 8.5, fontWeight: 900, padding: '2px 6px', borderRadius: 4 }}>
                        ● ON AIR [AUTO-REGIE]
                      </span>
                    )}
                  </div>
                  <button onClick={() => setActiveSubmenu(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, maxHeight: '50vh', overflowY: 'auto' }}>
                  {(Object.keys(TRUCK_CAMERA_PRESETS) as TruckCameraPresetId[]).map((camKey) => {
                    const preset = TRUCK_CAMERA_PRESETS[camKey];
                    const isSelected = activeCam === camKey;
                    return (
                      <button
                        key={camKey}
                        onClick={() => {
                          setActiveCam(camKey);
                          activeCamRef.current = camKey;
                          effectiveCamRef.current = camKey;
                          timeInShotRef.current = 0;
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: isSelected ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.1)',
                          background: isSelected ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255,255,255,0.05)',
                          color: isSelected ? '#00dcff' : '#cbd5e1',
                          fontFamily: 'inherit',
                          fontSize: 10,
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{preset.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. UNTERMENÜ: STRECKE & BESCHRIFTUNG */}
            {activeSubmenu === 'track' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 360 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#00dcff' }}>🗺️ FIA GRAND PRIX STRECKE</span>
                  <button onClick={() => setActiveSubmenu(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {CIRCUITS_LIST.map((c) => {
                    const isActive = selectedCircuit === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          if (selectedCircuit !== c.id) {
                            setSelectedCircuit(c.id);
                            selectedCircuitRef.current = c.id;
                            if (circuitChangeTriggerRef.current) {
                              circuitChangeTriggerRef.current(c.id);
                            }
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: isActive ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.1)',
                          background: isActive ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255,255,255,0.05)',
                          color: isActive ? '#00dcff' : '#cbd5e1',
                          fontWeight: isActive ? 800 : 500,
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{c.flag}</span>
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                  <button
                    onClick={() => {
                      const next = !showTrackLabels;
                      setShowTrackLabels(next);
                      showTrackLabelsRef.current = next;
                      if (trackLabelsGroupRef.current) {
                        trackLabelsGroupRef.current.visible = next;
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: showTrackLabels ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.15)',
                      background: showTrackLabels ? 'linear-gradient(135deg, rgba(0, 220, 255, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)' : 'rgba(255,255,255,0.06)',
                      color: showTrackLabels ? '#00dcff' : '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🏷️</span>
                      <span>3D Kurven- & Geradennamen</span>
                    </div>
                    <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>
                      {showTrackLabels ? 'AN [L]' : 'AUS [L]'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. UNTERMENÜ: GRAFIK & SETTINGS */}
            {activeSubmenu === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 320 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#00dcff' }}>⚙️ GRAFIK & SETTINGS</span>
                  <button onClick={() => setActiveSubmenu(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#8899aa', fontWeight: 700 }}>GRAFIK-DETAILTREUE:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {(Object.keys(GRAPHIC_QUALITY_PRESETS) as GraphicQualityId[]).map((qKey) => {
                      const qPreset = GRAPHIC_QUALITY_PRESETS[qKey];
                      const isSelected = quality === qKey;
                      return (
                        <button
                          key={qKey}
                          onClick={() => {
                            setQuality(qKey);
                            qualityRef.current = qKey;
                            if (qualityChangeTriggerRef.current) {
                              qualityChangeTriggerRef.current(qKey);
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                            background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.05)',
                            color: isSelected ? '#38bdf8' : '#fff',
                            fontWeight: isSelected ? 800 : 500,
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span>{qPreset.icon}</span>
                          <span>{qPreset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {onOpenStudio && (
                  <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                    <button
                      onClick={onOpenStudio}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(229, 197, 0, 0.4)',
                        background: 'linear-gradient(135deg, rgba(229, 197, 0, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)',
                        color: '#ffd700',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <span>🚚</span>
                      <span>Zum LKW Showroom</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 🎛️ HAUPT-KONTROLLEISTE MIT 4 AUSKLAPPBAREN HAUPT-BUTTONS */}
        <div style={{
          display: 'flex',
          gap: 10,
          background: 'rgba(10, 15, 25, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 220, 255, 0.3)',
          borderRadius: 14,
          padding: '8px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <button
            onClick={() => setActiveSubmenu(activeSubmenu === 'vehicle' ? null : 'vehicle')}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: activeSubmenu === 'vehicle' ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.15)',
              background: activeSubmenu === 'vehicle' ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255,255,255,0.06)',
              color: activeSubmenu === 'vehicle' ? '#00dcff' : '#fff',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.18s ease'
            }}
          >
            <span>🏎️</span>
            <span>Fahrzeug & Rennen</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{activeSubmenu === 'vehicle' ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={() => setActiveSubmenu(activeSubmenu === 'camera' ? null : 'camera')}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: activeSubmenu === 'camera' ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.15)',
              background: activeSubmenu === 'camera' ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255,255,255,0.06)',
              color: activeSubmenu === 'camera' ? '#00dcff' : '#fff',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.18s ease'
            }}
          >
            <span>🎥</span>
            <span>Kamera & Regie</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{activeSubmenu === 'camera' ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={() => setActiveSubmenu(activeSubmenu === 'track' ? null : 'track')}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: activeSubmenu === 'track' ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.15)',
              background: activeSubmenu === 'track' ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255,255,255,0.06)',
              color: activeSubmenu === 'track' ? '#00dcff' : '#fff',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.18s ease'
            }}
          >
            <span>🗺️</span>
            <span>Rennstrecke</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{activeSubmenu === 'track' ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={() => setActiveSubmenu(activeSubmenu === 'settings' ? null : 'settings')}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: activeSubmenu === 'settings' ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.15)',
              background: activeSubmenu === 'settings' ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255,255,255,0.06)',
              color: activeSubmenu === 'settings' ? '#00dcff' : '#fff',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.18s ease'
            }}
          >
            <span>⚙️</span>
            <span>Grafik</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{activeSubmenu === 'settings' ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={() => setIsBsod(true)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'rgba(0, 120, 215, 0.4)',
              color: '#fff',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
            title="BSOD Crash Simulation"
          >
            💻
          </button>
        </div>
      </div>

      {/* BSOD Overlay */}
      {isBsod && (
        <div 
          onClick={() => setIsBsod(false)}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
            background: '#0078D7', color: '#fff', zIndex: 9999,
            display: 'flex', flexDirection: 'column', padding: '10%',
            fontFamily: '"Segoe UI", "Inter", sans-serif', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '8rem', marginBottom: '2rem' }}>:(</div>
          <div style={{ fontSize: '2rem', marginBottom: '2rem', maxWidth: '80%' }}>
            Your 3D Truck ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.
          </div>
          <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>
            0% complete<br/><br/>
            For more information about this issue and possible fixes, visit https://windows.com/stopcode<br/><br/>
            If you call a support person, give them this info:<br/>
            Stop code: CRITICAL_TRUCK_FAILURE<br/>
            Failed: MAN_TGL.sys
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ☁️ Erzeugt einen ultra-realistischen, prozeduralen Atmosphären-Himmelsdom
 * mit physikalischer Rayleigh- & Mie-Streuung, Sonnenscheibe, Corona-Glow und fraktalen Kumuluswolken.
 */
function createRealisticAtmosphericSky(): {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  uniforms: {
    uZenithColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uGroundColor: { value: THREE.Color };
    uSunPosition: { value: THREE.Vector3 };
    uSunColor: { value: THREE.Color };
    uSunSize: { value: number };
    uSunIntensity: { value: number };
    uCloudCoverage: { value: number };
    uCloudDensity: { value: number };
    uCloudSpeed: { value: number };
    uTime: { value: number };
  };
} {
  const uniforms = {
    uZenithColor: { value: new THREE.Color('#1040a0') }, // Tiefes Königsblau am Zenit
    uHorizonColor: { value: new THREE.Color('#85c8f8') }, // Azurblauer Dunst am Horizont
    uGroundColor: { value: new THREE.Color('#2d5022') },  // Natürlicher Wiesengrund
    uSunPosition: { value: new THREE.Vector3(250, 380, 220).normalize() },
    uSunColor: { value: new THREE.Color('#fffef4') },     // Brillantes Sonnenweiß
    uSunSize: { value: 1.0 },
    uSunIntensity: { value: 1.35 },
    uCloudCoverage: { value: 0.22 },                      // Realistische Schäfchenwolken
    uCloudDensity: { value: 0.88 },
    uCloudSpeed: { value: 0.0035 },
    uTime: { value: 0 },
  };

  const vertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vDirection;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vDirection = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uZenithColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uGroundColor;
    uniform vec3 uSunPosition;
    uniform vec3 uSunColor;
    uniform float uSunSize;
    uniform float uSunIntensity;
    uniform float uCloudCoverage;
    uniform float uCloudDensity;
    uniform float uCloudSpeed;
    uniform float uTime;

    varying vec3 vWorldPosition;
    varying vec3 vDirection;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.87, 0.50, -0.50, 0.87);
      for (int i = 0; i < 5; ++i) {
        v += a * noise(p);
        p = rot * p * 2.04 + vec2(1.35, 2.65);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 dir = normalize(vDirection);
      float height = clamp(dir.y, 0.0, 1.0);

      // 1. Rayleigh-Streuung (Atmosphärischer Himmelsgradient von Zenith bis Horizont)
      float skyGradient = pow(1.0 - height, 1.55);
      vec3 skyColor = mix(uZenithColor, uHorizonColor, skyGradient);

      if (dir.y < 0.0) {
        // Horizontdunst bis zum Boden
        skyColor = mix(uHorizonColor, uGroundColor, clamp(-dir.y * 4.0, 0.0, 1.0));
      }

      // 2. Sonnenscheibe & Mie-Streuung (Corona Glow)
      vec3 sunDir = normalize(uSunPosition);
      float sunDot = max(0.0, dot(dir, sunDir));
      float sunDisc = smoothstep(0.9992 - uSunSize * 0.0005, 0.9998, sunDot);
      float sunCorona = pow(sunDot, 64.0) * 0.75 + pow(sunDot, 12.0) * 0.35;
      vec3 sunGlow = uSunColor * (sunDisc * 4.0 + sunCorona * uSunIntensity);

      // 3. Mehrschichtige fraktale Kumulus-Wolken (Driften mit Windgeschwindigkeit)
      if (dir.y > 0.02 && uCloudCoverage > 0.005) {
        vec2 cloudUV = (dir.xz / (dir.y + 0.16)) * 0.38;
        cloudUV += vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.45);

        float n1 = fbm(cloudUV * 2.8);
        float n2 = fbm(cloudUV * 5.8 + vec2(4.2, 1.8));
        float cloudNoise = n1 * 0.68 + n2 * 0.32;

        float threshold = 1.0 - uCloudCoverage * 0.75;
        float cloudMask = smoothstep(threshold, threshold + 0.18, cloudNoise);

        // Sanfter Horizont-Schwund
        float horizonFade = smoothstep(0.02, 0.20, dir.y);
        cloudMask *= horizonFade;

        // Wolkenbeleuchtung & Silberränder zur Sonne
        float sunLit = clamp(dot(sunDir, dir) * 0.5 + 0.5, 0.0, 1.0);
        vec3 cloudBaseShade = mix(vec3(0.82, 0.88, 0.96), vec3(0.98, 0.99, 1.0), sunLit);
        vec3 cloudFinalColor = cloudBaseShade + sunCorona * 0.6 * uSunColor;

        skyColor = mix(skyColor, cloudFinalColor, cloudMask * uCloudDensity);
      }

      skyColor += sunGlow;
      gl_FragColor = vec4(skyColor, 1.0);
    }
  `;

  const skyGeo = new THREE.SphereGeometry(2200, 48, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  return { mesh: skyMesh, material: skyMat, uniforms };
}
