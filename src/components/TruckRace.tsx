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
    name: 'Ultra (2K Schatten, Retina)',
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
    name: 'High (1K Schatten, 60 FPS)',
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
    name: 'Medium (512px Schatten, 1.0x)',
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
    name: 'Eco / Potato (Max FPS, Schatten AUS)',
    shortDesc: 'Schatten AUS • 0.85x DPI • Maximale FPS',
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
  const [quality, setQuality] = useState<GraphicQualityId>('high');
  const qualityRef = useRef<GraphicQualityId>('high');
  const qualityChangeTriggerRef = useRef<((id: GraphicQualityId) => void) | null>(null);
  const [activeCam, setActiveCam] = useState<TruckCameraPresetId>('follow');
  const activeCamRef = useRef<TruckCameraPresetId>('follow');
  const effectiveCamRef = useRef<TruckCameraPresetId>('follow');
  const timeInShotRef = useRef<number>(0);

  const [selectedCircuit, setSelectedCircuit] = useState<CircuitId>('silverstone');
  const selectedCircuitRef = useRef<CircuitId>('silverstone');
  const circuitChangeTriggerRef = useRef<((id: CircuitId) => void) | null>(null);

  const drivingRef = useRef(true);
  const turboRef = useRef(false);
  const doorsRef = useRef(false);
  const tailgateRef = useRef(false);
  const platformLoweredRef = useRef(false);
  const wipersActiveRef = useRef(false);

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
      rearBrakeLightMat,
      thirdBrakeLightMat,
      rearBrakeLightL,
      rearBrakeLightR,
      rearBlinkerMatL,
      rearBlinkerMatR,
      frontBlinkerMatL,
      frontBlinkerMatR,
      kofferBackZ,
      textures,
    } = createManTglTruckRig();
    scene.add(truck);

    // 9. Grand Prix Rennstrecken & 3D-Topographie-Engine (Subagent 22.14: truck_race_tracks)
    let currentCircuitDef = getCircuit(selectedCircuitRef.current);
    let currentCircuitResult: TrackMeshesResult = buildCircuit3D(currentCircuitDef);
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
    let trackU = 0.0; // Streckenfortschritt auf dem Kurs [0.0, 1.0)
    let flapProgress = 0;   // 0 = zu, 1 = waagerecht offen an Ladekante
    let lowerProgress = 0;  // 0 = an Ladekante Y=1.02m, 1 = am Boden Y=0.06m
    let currentSteerAngle = 0; // Aktueller Lenkwinkel der Vorderräder
    let currentSpeed = 0;      // Momentangeschwindigkeit in m/s
    let currentPitch = 0;      // Fahrgestell-Nickwinkel (Beschleunigen/Bremsen)
    let currentRoll = 0;       // Fahrgestell-Wankwinkel (Fliehkraft in Kurven)
    const wheelRadius = 0.408; // Match tireRadius
    const clock = new THREE.Clock();

    let frameCount = 0;
    let lastPerfSample = performance.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Delta-Time Normalisierung für 60Hz / 120Hz / 144Hz (Säule 1.2)
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

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
      // 🏎️ Grand Prix Streckenkinematik, 3D-Höhenprofil & Kurvendynamik
      // =======================================================================
      const currentU = ((trackU % 1.0) + 1.0) % 1.0;
      const pt = currentCircuitResult.trackCurve.getPointAt(currentU, _ptScratch);
      const tangent = currentCircuitResult.trackCurve.getTangentAt(currentU, _tangentScratch);
      const splineLength = currentCircuitResult.splineLength;
      const x = pt.x;
      const y = pt.y;
      const z = pt.z;

      // Sonnenlicht-Target folgt dem LKW sanft für stets perfekte Kontaktschatten
      dirLight.position.set(x + 35, y + 60, z + 45);
      dirLight.target.position.set(x, y + 1.5, z);
      dirLight.target.updateMatrixWorld();

      // Ausrichtung des LKWs (Tangentenwinkel)
      const heading = Math.atan2(tangent.x, tangent.z);
      // 3D-Geländeneigung (Nickwinkel bei Steigungen / Gefälle wie Eau Rouge / Schönberg)
      const roadPitch = Math.atan2(-tangent.y, Math.hypot(tangent.x, tangent.z));

      // Streckenkrümmung vorausschauend analysieren (18 Meter Vorausschau)
      const lookaheadMeters = 18.0;
      const duAhead = lookaheadMeters / splineLength;
      const nextTangent = currentCircuitResult.trackCurve.getTangentAt((currentU + duAhead) % 1.0, _nextTangentScratch);
      let dHeading = Math.atan2(nextTangent.x, nextTangent.z) - heading;
      if (dHeading > Math.PI) dHeading -= Math.PI * 2;
      if (dHeading < -Math.PI) dHeading += Math.PI * 2;
      const curvature = Math.abs(dHeading) / lookaheadMeters; // 1/m

      // Aktueller Streckenabschnitt der gewählten Rennstrecke
      const sector = getCircuitSector(currentCircuitDef, currentU);

      // Dynamisches Geschwindigkeitsprofil in km/h & m/s:
      const isTurboActive = turboRef.current;
      let targetSpeedKmh = 0.0;
      if (drivingRef.current) {
        if (isTurboActive) {
          // 🚀 F1 TELEMETRIE-MODUS: Echte Formula 1 Rundenzeiten, Grip & Speeds
          const baseF1Speed = sector.f1Speed || 290.0;
          const drsBoost = sector.drsZone ? 24.0 : 0.0;
          targetSpeedKmh = Math.max(85.0, (baseF1Speed + drsBoost) - curvature * 450.0);
        } else {
          // Standard 12t LKW Fahrdynamik
          targetSpeedKmh = Math.max(24.0, sector.speedTarget - curvature * 360.0);
        }
      }

      const targetSpeedMps = targetSpeedKmh / 3.6;
      const accelRate = isTurboActive 
        ? ((targetSpeedMps > currentSpeed) ? 6.5 : 12.5) 
        : ((targetSpeedMps > currentSpeed) ? 1.8 : 3.8);

      const prevSpeed = currentSpeed;
      currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeedMps, 1 - Math.exp(-accelRate * delta));
      const currentAccel = (currentSpeed - prevSpeed) / Math.max(delta, 0.001); // m/s^2

      // Reale gefahrene Distanz & Streckenfortschritt trackU (Exakte physikalische Geschwindigkeit)
      const distanceTravelled = currentSpeed * delta;
      trackU = (trackU + distanceTravelled / splineLength) % 1.0;

      // 1. Nick-Dynamik (Chassis Pitch + 3D-Geländeneigung)
      const pitchMult = isTurboActive ? 0.012 : 0.008;
      const targetPitch = THREE.MathUtils.clamp(-currentAccel * pitchMult, -0.055, 0.085);
      currentPitch = THREE.MathUtils.lerp(currentPitch, targetPitch, 1 - Math.exp(-9.0 * delta));

      // 2. Wank-Dynamik (Chassis Roll: 12t Kofferaufbau neigt sich durch Fliehkraft in Kurven)
      const lateralAccel = (currentSpeed * currentSpeed) * (dHeading / lookaheadMeters); // m/s^2
      const rollMult = isTurboActive ? 0.0035 : 0.007; // F1 steifere Aufhängung
      const targetRoll = THREE.MathUtils.clamp(-lateralAccel * rollMult, -0.065, 0.065);
      currentRoll = THREE.MathUtils.lerp(currentRoll, targetRoll, 1 - Math.exp(-7.0 * delta));

      // 3. Fahrbahn-Rumpeln & 6-Zylinder Diesel Motorvibration (bei Turbo Hochfrequenz-Pfeifen)
      const vibeFreq = isTurboActive ? 85.0 : 45.0;
      const vibeAmp = isTurboActive ? 0.0012 : 0.0025;
      const roadVibe = (currentSpeed > 0.1) ? (Math.sin(clock.getElapsedTime() * vibeFreq) * vibeAmp) * Math.min(1.0, currentSpeed / 20.0) : 0;
      const engineIdle = Math.sin(clock.getElapsedTime() * (isTurboActive ? 40.0 : 22.0)) * 0.0008;

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
      const targetSteerAngle = (currentSpeed > 0.1) ? THREE.MathUtils.clamp((dHeading / lookaheadMeters) * 12.0, -0.44, 0.44) : 0;
      const steerDamp = 1 - Math.exp(-10 * delta);
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
          const f1GearNum = Math.min(8, Math.max(1, Math.floor(speedKmh / 42) + 1));
          gearName = `G${f1GearNum}`;
          const gearFrac = (speedKmh % 42) / 42;
          rpm = 8500 + gearFrac * 3800; // 8.500 bis 12.300 RPM
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
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
      
      {/* 🌟 Quick Switch to LKW Showroom */}
      {onOpenStudio && (
        <div style={{ position: 'absolute', top: 20, right: 320, zIndex: 50 }}>
          <button
            onClick={onOpenStudio}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(229, 197, 0, 0.4)',
              background: 'rgba(229, 197, 0, 0.15)',
              color: '#ffd700',
              fontWeight: 700,
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)'
            }}
          >
            🚚 Zum LKW Showroom
          </button>
        </div>
      )}

      {/* 📡 Telemetrie-HUD Fenster rechts oben (Subagent 22.6) */}
      <div style={{
        position: 'absolute', top: 20, right: 20, width: 280,
        background: 'rgba(10, 15, 25, 0.82)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(0, 220, 255, 0.25)',
        borderRadius: 12,
        padding: '14px 16px',
        color: '#ffffff',
        fontFamily: '"JetBrains Mono", "SF Mono", "Consolas", monospace',
        fontSize: 11,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 12px rgba(0, 220, 255, 0.05)',
        pointerEvents: 'auto',
        userSelect: 'none',
        zIndex: 50,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,220,255,0.2)', paddingBottom: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>📡</span>
            <span style={{ fontWeight: 700, letterSpacing: 0.8, color: '#00dcff', fontSize: 11 }}>MAN TELEMATICS HUD</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span ref={telemetryFpsRef} style={{
              fontSize: 8.5, fontWeight: 800, padding: '2px 5px', borderRadius: 4,
              background: 'rgba(0,0,0,0.5)', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.4)',
              fontFamily: 'monospace'
            }}>
              60 FPS • 16.6ms
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              background: isDriving ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
              color: isDriving ? '#2ecc71' : '#e74c3c',
              border: isDriving ? '1px solid #2ecc71' : '1px solid #e74c3c'
            }}>
              {isDriving ? '● DRIVING' : '○ IDLE'}
            </span>
          </div>
        </div>

        {/* FIA Grand Prix Circuit Selector & Sector Display */}
        <div style={{
          background: 'rgba(0, 220, 255, 0.08)',
          border: '1px solid rgba(0, 220, 255, 0.22)',
          borderRadius: 6,
          padding: '6px 8px',
          marginBottom: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#8899aa', fontSize: 8, fontWeight: 700, letterSpacing: 0.5 }}>🏎️ FIA GRAND PRIX STRECKE:</span>
            <span ref={telemetryDrsRef} style={{ display: 'none', background: '#ffd700', color: '#000', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3 }}>
              DRS
            </span>
          </div>

          {/* Circuit Switcher Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 2 }}>
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
                    padding: '4px 6px',
                    borderRadius: 4,
                    border: isActive ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.1)',
                    background: isActive ? 'rgba(0, 220, 255, 0.22)' : 'rgba(0,0,0,0.35)',
                    color: isActive ? '#00dcff' : '#94a3b8',
                    fontFamily: 'inherit',
                    fontSize: 9,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{c.flag}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span ref={telemetrySectorRef} style={{ color: isTurbo ? '#ec4899' : '#00dcff', fontWeight: 800, fontSize: 11, letterSpacing: 0.3 }}>
              HAMILTON STRAIGHT
            </span>
            <div ref={telemetryF1Ref} style={{ color: '#94a3b8', fontSize: 8, fontWeight: 600, fontFamily: 'monospace', marginTop: 2 }}>
              F1 REF: 290 km/h • GANG 7 • 1.0 G
            </div>
          </div>

          {/* ⚡ F1 TELEMETRIE TURBO BOOST BUTTON */}
          <button
            onClick={() => {
              const next = !isTurbo;
              setIsTurbo(next);
              turboRef.current = next;
            }}
            style={{
              marginTop: 6,
              padding: '6px 8px',
              borderRadius: 6,
              border: isTurbo ? '1px solid #ec4899' : '1px solid rgba(255, 215, 0, 0.4)',
              background: isTurbo
                ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.35) 0%, rgba(139, 92, 246, 0.35) 100%)'
                : 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(0, 220, 255, 0.08) 100%)',
              color: isTurbo ? '#ffffff' : '#ffd700',
              fontFamily: 'inherit',
              fontSize: 9,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: isTurbo ? '0 0 14px rgba(236, 72, 153, 0.5), inset 0 0 6px rgba(236, 72, 153, 0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12 }}>{isTurbo ? '🔥' : '⚡'}</span>
              <span>{isTurbo ? 'F1 TELEMETRIE: 350 KM/H' : 'F1 TURBO BOOST: AUS'}</span>
            </div>
            <span style={{
              fontSize: 7.5,
              padding: '1px 4px',
              borderRadius: 3,
              background: isTurbo ? '#ec4899' : 'rgba(255,255,255,0.12)',
              color: '#ffffff'
            }}>
              [T]
            </span>
          </button>
        </div>

        {/* Speed & Gear Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ color: '#8899aa' }}>GESCHWINDIGKEIT:</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span ref={telemetryGearRef} style={{ color: '#ffd700', fontWeight: 800, fontSize: 13 }}>D1</span>
            <span ref={telemetrySpeedRef} style={{ fontWeight: 700, fontSize: 16, color: '#00dcff' }}>0.0 km/h</span>
          </div>
        </div>
        {/* Speed Progress Bar */}
        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <div ref={telemetrySpeedBarRef} style={{ width: '0%', height: '100%', background: 'linear-gradient(90deg, #00dcff, #3498db)', transition: 'width 0.1s linear' }} />
        </div>

        {/* RPM Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ color: '#8899aa' }}>DREHZAHL:</span>
          <span ref={telemetryRpmRef} style={{ fontWeight: 600, color: '#ffffff' }}>750 RPM</span>
        </div>
        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <div ref={telemetryRpmBarRef} style={{ width: '10%', height: '100%', background: 'linear-gradient(90deg, #2ecc71, #f1c40f, #e74c3c)', transition: 'width 0.1s linear' }} />
        </div>

        {/* 2-Column Grid for Dynamics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <div style={{ color: '#8899aa', fontSize: 9 }}>LÄNGS G-KRAFT:</div>
            <div ref={telemetryAccelRef} style={{ fontWeight: 700, fontSize: 12, color: '#ffffff' }}>+0.00 g</div>
          </div>
          <div>
            <div style={{ color: '#8899aa', fontSize: 9 }}>QUER G-KRAFT:</div>
            <div ref={telemetryLateralGRef} style={{ fontWeight: 700, fontSize: 12, color: '#ffffff' }}>+0.00 g</div>
          </div>
          <div>
            <div style={{ color: '#8899aa', fontSize: 9 }}>LENKWINKEL:</div>
            <div ref={telemetrySteerRef} style={{ fontWeight: 700, fontSize: 12, color: '#ffd700' }}>GERADE</div>
          </div>
          <div>
            <div style={{ color: '#8899aa', fontSize: 9 }}>NICKWINKEL (PITCH):</div>
            <div ref={telemetryPitchRef} style={{ fontWeight: 700, fontSize: 12, color: '#ffffff' }}>0.0° LEVEL</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ color: '#8899aa', fontSize: 9 }}>WANKWINKEL (BODY ROLL):</div>
            <div ref={telemetryRollRef} style={{ fontWeight: 700, fontSize: 12, color: '#ffffff' }}>0.0° LEVEL</div>
          </div>
        </div>

        {/* 🎥 Kamera-Perspektiven Dropdown (Subagent 20: Broadcast Regie) */}
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          background: 'rgba(0, 220, 255, 0.06)',
          border: '1px solid rgba(0, 220, 255, 0.25)',
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ color: '#8899aa', fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5 }}>🎥 KAMERA-PERSPEKTIVE:</span>
            {activeCam === 'auto_director' && (
              <span style={{
                background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 800,
                padding: '1px 5px', borderRadius: 3,
              }}>
                ● ON AIR
              </span>
            )}
          </div>

          <select
            value={activeCam}
            onChange={(e) => {
              const nextCam = e.target.value as TruckCameraPresetId;
              setActiveCam(nextCam);
              activeCamRef.current = nextCam;
              effectiveCamRef.current = nextCam;
              timeInShotRef.current = 0;
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: activeCam === 'auto_director' ? '1px solid #ef4444' : '1px solid rgba(0, 220, 255, 0.4)',
              background: activeCam === 'auto_director' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(10, 15, 25, 0.95)',
              color: activeCam === 'auto_director' ? '#fca5a5' : '#00dcff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              boxShadow: activeCam === 'auto_director' ? '0 0 12px rgba(239, 68, 68, 0.3)' : 'none',
            }}
          >
            {(Object.keys(TRUCK_CAMERA_PRESETS) as TruckCameraPresetId[]).map((presetKey) => {
              const preset = TRUCK_CAMERA_PRESETS[presetKey];
              return (
                <option
                  key={presetKey}
                  value={presetKey}
                  style={{ background: '#0b0f19', color: '#ffffff' }}
                >
                  {preset.icon} {preset.name} {presetKey === 'auto_director' ? '• (TV-Regie)' : ''}
                </option>
              );
            })}
          </select>

          {/* Live Auto-Regie Tally Badge */}
          {activeCam === 'auto_director' && (
            <div 
              ref={directorBadgeRef}
              style={{
                marginTop: 6,
                padding: '4px 6px',
                borderRadius: 4,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: 8.5,
                fontWeight: 600,
                textAlign: 'center',
                fontFamily: '"JetBrains Mono", monospace'
              }}
            >
              ● ON AIR [AUTO-REGIE]
            </div>
          )}
        </div>

        {/* ⚙️ Grafik-Detailtreue & Performance-Stufe (Subagent 19: Performance Governance) */}
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ color: '#8899aa', fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5 }}>⚙️ DETAILTREUE / GRAFIK:</span>
            <span style={{
              fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3,
              background: quality === 'ultra' ? '#ec4899' : quality === 'high' ? '#3b82f6' : quality === 'medium' ? '#10b981' : '#f59e0b',
              color: '#ffffff'
            }}>
              {quality.toUpperCase()}
            </span>
          </div>

          <select
            value={quality}
            onChange={(e) => {
              const nextQ = e.target.value as GraphicQualityId;
              setQuality(nextQ);
              qualityRef.current = nextQ;
              if (qualityChangeTriggerRef.current) {
                qualityChangeTriggerRef.current(nextQ);
              }
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(10, 15, 25, 0.95)',
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {(Object.keys(GRAPHIC_QUALITY_PRESETS) as GraphicQualityId[]).map((qKey) => {
              const qPreset = GRAPHIC_QUALITY_PRESETS[qKey];
              return (
                <option
                  key={qKey}
                  value={qKey}
                  style={{ background: '#0b0f19', color: '#ffffff' }}
                >
                  {qPreset.icon} {qPreset.name}
                </option>
              );
            })}
          </select>

          <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 8, fontFamily: 'monospace' }}>
            {GRAPHIC_QUALITY_PRESETS[quality].shortDesc}
          </div>
        </div>

        {/* Footer Vehicle Specs */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', color: '#667788', fontSize: 9 }}>
          <span>MAN TGL 12.250</span>
          <span>D0836 • 1050 Nm</span>
        </div>
      </div>
      
      {/* UI Controls */}
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'auto',
      }}>
        <button
          onClick={() => {
            const driving = !isDriving;
            setIsDriving(driving);
            drivingRef.current = driving;
            // Wenn er fährt, Türen & Ladebordwand schließen
            if (driving) {
              setDoorsOpen(false);
              doorsRef.current = false;
              setTailgateOpen(false);
              tailgateRef.current = false;
              setPlatformLowered(false);
              platformLoweredRef.current = false;
            }
          }}
          style={{
            padding: '12px 20px', borderRadius: 8, border: 'none',
            background: isDriving ? '#e74c3c' : '#2ecc71', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            transition: 'background 0.2s',
          }}
        >
          {isDriving ? '🛑 Anhalten' : '▶️ Weiterfahren'}
        </button>

        <button
          onClick={() => {
            const next = !isTurbo;
            setIsTurbo(next);
            turboRef.current = next;
          }}
          style={{
            padding: '12px 20px', borderRadius: 8,
            border: isTurbo ? '1px solid #ec4899' : '1px solid rgba(255,215,0,0.4)',
            background: isTurbo ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'rgba(0,0,0,0.6)',
            color: isTurbo ? '#ffffff' : '#ffd700',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            boxShadow: isTurbo ? '0 0 16px rgba(236, 72, 153, 0.6)' : '0 4px 12px rgba(0,0,0,0.5)',
            transition: 'all 0.2s',
          }}
        >
          {isTurbo ? '🔥 F1 Turbo: AN (350 km/h)' : '⚡ F1 Turbo: AUS'}
        </button>

        <button
          onClick={() => {
            const open = !doorsOpen;
            setDoorsOpen(open);
            doorsRef.current = open;
            if (open) {
              setIsDriving(false);
              drivingRef.current = false;
            }
          }}
          style={{
            padding: '12px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: doorsOpen ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.6)', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
          }}
        >
          {doorsOpen ? '🚪 Türen schließen' : '🚪 Türen öffnen'}
        </button>

        {/* KNOPF 1: Heckklappe & Ladebordwand öffnen / schließen (Abklappen auf Ladekante) */}
        <button
          onClick={() => {
            const open = !tailgateOpen;
            setTailgateOpen(open);
            tailgateRef.current = open;
            if (!open) {
              // Beim Schließen automatisch auch wieder anheben
              setPlatformLowered(false);
              platformLoweredRef.current = false;
            }
            if (open) {
              setIsDriving(false);
              drivingRef.current = false;
            }
          }}
          style={{
            padding: '12px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: tailgateOpen ? 'rgba(234, 179, 8, 0.35)' : 'rgba(0,0,0,0.6)', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            boxShadow: tailgateOpen ? '0 0 16px rgba(234, 179, 8, 0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {tailgateOpen ? '📦 Heckklappe schließen' : '📦 Heckklappe öffnen'}
        </button>

        {/* KNOPF 2: Ladebordwand heben / senken (Auf den Boden absenken / zur Ladekante heben) */}
        <button
          onClick={() => {
            const lower = !platformLowered;
            setPlatformLowered(lower);
            platformLoweredRef.current = lower;
            if (lower) {
              // Beim Senken automatisch auch Klappe öffnen
              setTailgateOpen(true);
              tailgateRef.current = true;
              setIsDriving(false);
              drivingRef.current = false;
            }
          }}
          style={{
            padding: '12px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: platformLowered ? 'rgba(249, 115, 22, 0.35)' : 'rgba(0,0,0,0.6)', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            boxShadow: platformLowered ? '0 0 16px rgba(249, 115, 22, 0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {platformLowered ? '⬆️ Ladebordwand heben' : '⬇️ Ladebordwand senken'}
        </button>

        <button
          onClick={() => {
            const active = !wipersActive;
            setWipersActive(active);
            wipersActiveRef.current = active;
          }}
          style={{
            padding: '12px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: wipersActive ? 'rgba(56, 189, 248, 0.35)' : 'rgba(0,0,0,0.6)', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            boxShadow: wipersActive ? '0 0 16px rgba(56, 189, 248, 0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {wipersActive ? '🌧️ Wischer: AN' : '🌧️ Wischer: AUS'}
        </button>
        
        <button
          onClick={() => setIsBsod(true)}
          style={{
            padding: '12px 16px', borderRadius: 8, border: 'none',
            background: '#0078D7', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          💻 Crash
        </button>
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
