import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  createGrillTexture,
  createTglBadgeTexture,
  createLicensePlateTexture,
  createRibbedTexture,
  createHeadlightTexture,
  createDashboardTexture,
  createWindshieldTexture,
  createCurvedWindshieldGeometry,
  createTailLiftTexture,
  createKofferSideTexture,
  createManRearLightTexture,
  createSideMarkerTexture,
  createAsphaltTexture,
  createAsphaltBumpTexture,
} from '../materials/truckTextures';
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

// Module-level scratch objects for Zero-GC in Render-Loop (Säule 1.1 Architecture Standard)
const _ptScratch = new THREE.Vector3();
const _tangentScratch = new THREE.Vector3();
const _nextTangentScratch = new THREE.Vector3();
const _truckPosScratch = { x: 0, y: 0, z: 0 };

export default function Truck() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDriving, setIsDriving] = useState(true);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [tailgateOpen, setTailgateOpen] = useState(false);
  const [platformLowered, setPlatformLowered] = useState(false);
  const [wipersActive, setWipersActive] = useState(false);
  const [isBsod, setIsBsod] = useState(false);
  const [activeCam, setActiveCam] = useState<TruckCameraPresetId>('follow');
  const activeCamRef = useRef<TruckCameraPresetId>('follow');
  const effectiveCamRef = useRef<TruckCameraPresetId>('follow');
  const timeInShotRef = useRef<number>(0);

  const [selectedCircuit, setSelectedCircuit] = useState<CircuitId>('silverstone');
  const selectedCircuitRef = useRef<CircuitId>('silverstone');
  const circuitChangeTriggerRef = useRef<((id: CircuitId) => void) | null>(null);

  const drivingRef = useRef(true);
  const doorsRef = useRef(false);
  const tailgateRef = useRef(false);
  const platformLoweredRef = useRef(false);
  const wipersActiveRef = useRef(false);

  // DOM-Refs für Telemetrie-HUD (Subagent 22.6: 60fps Zero-Garbage Live Updates)
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
    scene.background = new THREE.Color('#0d1117');
    // Kein entfernungsabhängiger schwarzer Nebel mehr (Kameraabstand bleibt immer gleich hell)
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 2500);
    // Move camera out to see the long truck
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

    // Ausgewogene, entfernungsunabhängige Ausleuchtung (Subagent 11: scene_environment)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334455, 0.75);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(12, 22, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 70;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.65);
    fillLight.position.set(-12, 16, -14);
    scene.add(fillLight);

    const truck = new THREE.Group();
    scene.add(truck);

    // --- Materials (Realistic Car Paint with Clearcoat) ---
    const paintMat = new THREE.MeshPhysicalMaterial({ 
      color: '#f8f9fa', 
      roughness: 0.1, 
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    });
    
    const kofferSideTex = createKofferSideTexture();
    const boxMat = new THREE.MeshPhysicalMaterial({ 
      color: '#f8f9fa', 
      roughness: 0.1, 
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });
    const boxSideMat = new THREE.MeshPhysicalMaterial({ 
      map: kofferSideTex, 
      roughness: 0.1, 
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });
    
    const plasticMat = new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.85, metalness: 0.1 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 0.9, metalness: 0.05 });
    const chassisMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: '#1e3a5f', roughness: 0.04, metalness: 0.85, transparent: true, opacity: 0.68 });
    const visorMat = new THREE.MeshPhysicalMaterial({ color: '#0b1320', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.85, transmission: 0.15 });
    const rimMat = new THREE.MeshStandardMaterial({ color: '#b0b8c0', roughness: 0.3, metalness: 0.8 });
    const silverMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35, metalness: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0.98 });
    const interiorMat = new THREE.MeshStandardMaterial({ color: '#1a1e24', roughness: 0.88, metalness: 0.05 });
    const seatFabricMat = new THREE.MeshStandardMaterial({ color: '#272c35', roughness: 0.92, metalness: 0.02 });
    
    const grillTex = createGrillTexture();
    const plateTex = createLicensePlateTexture();
    const hlTex = createHeadlightTexture();
    const tglBadgeTex = createTglBadgeTexture();
    const dashTex = createDashboardTexture();
    const windshieldTex = createWindshieldTexture();

    const dashMat = new THREE.MeshStandardMaterial({ map: dashTex, roughness: 0.4, emissive: '#0284c7', emissiveIntensity: 0.4 });
    const windshieldMat = new THREE.MeshPhysicalMaterial({ 
      map: windshieldTex, 
      color: '#ffffff', 
      roughness: 0.03, 
      metalness: 0.15, 
      transmission: 0.75, 
      ior: 1.52, 
      thickness: 0.05, 
      transparent: true, 
      opacity: 0.96, 
      clearcoat: 1.0, 
      clearcoatRoughness: 0.02,
      depthWrite: false
    });

    const grillMaterials = [plasticMat, plasticMat, plasticMat, plasticMat, new THREE.MeshStandardMaterial({ map: grillTex, roughness: 0.55, metalness: 0.2 }), plasticMat];
    const plateMaterials = [plasticMat, plasticMat, plasticMat, plasticMat, new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }), plasticMat];
    
    const tailLiftTex = createTailLiftTexture();
    const tailLiftMat = new THREE.MeshStandardMaterial({ map: tailLiftTex, roughness: 0.4, metalness: 0.1 });
    const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
    // Faces: [+x, -x, +y, -y, +z (front), -z (back - offener Innenraum)]
    const kofferMaterials = [boxSideMat, boxSideMat, boxMat, boxMat, boxMat, invisibleMat]; 

    // --- Geometrie Parameter (Echte Maße: Datenblatt MAN TGL 10.250 / 12.250) ---
    // Reifen 265/70R17.5 → Ø 815mm → r=0.408m
    // Radstand: 5550mm, Koffer Innen: 8050x2470x2580mm
    // Ladekantenhöhe: 1020mm, Ladebordwand: 2500x2000mm
    const kofferLength = 8.25;  // Außen (~8050 + 2x100mm Wand)
    const kofferWidth = 2.57;   // Außen (~2470 + 2x50mm Wand)
    const kofferHeight = 2.68;  // Außen (~2580 + 100mm Boden/Dach)
    const loadEdgeHeight = 1.02; // Ladekantenhöhe
    const kofferY = loadEdgeHeight + kofferHeight / 2; // Unterkante auf 1.02m
    const wheelbase = 5.55;     // Radstand
    const frontAxleZ = 3.5;
    const rearAxleZ = frontAxleZ - wheelbase; // = -2.05
    const kofferFrontZ = frontAxleZ - 1.2; // Koffer beginnt kurz hinter der Vorderachse
    const kofferZ = kofferFrontZ - kofferLength / 2; // Center

    // 1. Chassis Frame (Langer Hauptträger)
    const kofferBackZ = kofferZ - kofferLength / 2;
    const chassisLength = 3.5 - kofferBackZ; // Von unter der Kabine bis exakt ans Heck
    const chassisCenterZ = kofferBackZ + chassisLength / 2;

    const chassisGeo = new THREE.BoxGeometry(0.8, 0.4, chassisLength);
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.set(0, 0.6, chassisCenterZ);
    chassis.castShadow = true;
    truck.add(chassis);

    // Seiten-Unterfahrschutz (Silver Side Rails from photo - sitzt sauber zwischen Fahrerhaus & Hinterachse)
    const sideRailLength = 3.65;
    const sideRailCenterZ = 0.40;
    const sideRailGeo = new THREE.BoxGeometry(0.05, 0.15, sideRailLength);
    const leftSideRail = new THREE.Mesh(sideRailGeo, silverMat);
    leftSideRail.position.set(1.22, 0.55, sideRailCenterZ);
    const rightSideRail = leftSideRail.clone();
    rightSideRail.position.set(-1.22, 0.55, sideRailCenterZ);
    truck.add(leftSideRail, rightSideRail);

    // Tank / Batterie-Kästen (Ribbed Texture)
    const ribbedTex = createRibbedTexture();
    const ribbedMat = new THREE.MeshStandardMaterial({ map: ribbedTex, roughness: 0.8, metalness: 0.2 });
    const tankGeo = new THREE.BoxGeometry(0.5, 0.4, 1.2);
    const tank = new THREE.Mesh(tankGeo, ribbedMat);
    tank.position.set(0.9, 0.65, 1.3);
    truck.add(tank);

    // LAIMER Schild am Unterfahrschutz (Gelber Reflektor)
    const smallPlateGeo = new THREE.BoxGeometry(0.06, 0.12, 0.4);
    const sidePlate = new THREE.Mesh(smallPlateGeo, new THREE.MeshStandardMaterial({color: '#ffd700', roughness: 0.3, metalness: 0.5}));
    sidePlate.position.set(1.24, 0.55, 1.60);
    truck.add(sidePlate);

    // 2. Kofferaufbau (Echte Maße, leicht gerundet)
    const kofferGeo = new RoundedBoxGeometry(kofferWidth, kofferHeight, kofferLength, 4, 0.06);
    const koffer = new THREE.Mesh(kofferGeo, kofferMaterials);
    koffer.position.set(0, kofferY, kofferZ);
    koffer.castShadow = true;
    koffer.receiveShadow = true;
    truck.add(koffer);

    // Koffer Frame Edges (Alu-Leisten - saubere Einfassung ohne Z-Fighting)
    const edgeGeo = new THREE.BoxGeometry(kofferWidth + 0.04, kofferHeight + 0.04, 0.12);
    const frontEdge = new THREE.Mesh(edgeGeo, silverMat);
    frontEdge.position.set(0, kofferY, kofferZ + kofferLength/2 - 0.05);
    const backEdge = new THREE.Mesh(edgeGeo, silverMat);
    backEdge.position.set(0, kofferY, kofferZ - kofferLength/2 + 0.05);
    truck.add(frontEdge, backEdge);

    // =========================================================================
    // 📦 22.10 `truck_tailgate_kinematics` - LADEBORDWAND & HECKKINEMATIK
    // =========================================================================

    // 1. Laderaum-Innenraum (Sichtbare Supertechno 50 Fracht bei geöffneter Heckklappe)
    const cargoGroup = new THREE.Group();

    // Laderaum-Boden (Multiplex-Sperrholz & Aluminium - sitzt sauber im Koffer über der Bodenplatte)
    const cargoFloorGeo = new THREE.BoxGeometry(kofferWidth - 0.12, 0.03, 4.5);
    const cargoFloor = new THREE.Mesh(cargoFloorGeo, interiorMat);
    cargoFloor.position.set(0, loadEdgeHeight + 0.035, kofferBackZ + 2.25);

    // Laderaum-Innenwände (hellgrau / Nadelfilz)
    const interiorWallMat = new THREE.MeshStandardMaterial({ color: '#2a3441', roughness: 0.85 });
    const wallLeftGeo = new THREE.BoxGeometry(0.04, kofferHeight - 0.1, 4.5);
    const wallLeft = new THREE.Mesh(wallLeftGeo, interiorWallMat);
    wallLeft.position.set(kofferWidth / 2 - 0.04, kofferY, kofferBackZ + 2.25);
    const wallRight = wallLeft.clone();
    wallRight.position.set(-kofferWidth / 2 + 0.04, kofferY, kofferBackZ + 2.25);

    // Zurrleisten / Airlineschienen an den Wänden
    const lashingRailGeo = new THREE.BoxGeometry(0.02, 0.06, 4.4);
    const lashingL = new THREE.Mesh(lashingRailGeo, silverMat);
    lashingL.position.set(kofferWidth / 2 - 0.06, kofferY, kofferBackZ + 2.25);
    const lashingR = new THREE.Mesh(lashingRailGeo, silverMat);
    lashingR.position.set(-kofferWidth / 2 + 0.06, kofferY, kofferBackZ + 2.25);

    // Heckportal-Rahmen (Alu-Portalprofil um die Ladeöffnung)
    const portalPostL = new THREE.Mesh(new THREE.BoxGeometry(0.08, kofferHeight, 0.08), silverMat);
    portalPostL.position.set(kofferWidth / 2 - 0.04, kofferY, kofferBackZ);
    const portalPostR = new THREE.Mesh(new THREE.BoxGeometry(0.08, kofferHeight, 0.08), silverMat);
    portalPostR.position.set(-kofferWidth / 2 + 0.04, kofferY, kofferBackZ);
    const portalTop = new THREE.Mesh(new THREE.BoxGeometry(kofferWidth, 0.08, 0.08), silverMat);
    portalTop.position.set(0, kofferY + kofferHeight / 2 - 0.04, kofferBackZ);
    const portalSill = new THREE.Mesh(new THREE.BoxGeometry(kofferWidth - 0.04, 0.04, 0.08), silverMat);
    portalSill.position.set(0, loadEdgeHeight + 0.02, kofferBackZ);

    // Flightcases (Aluminium-Kugelecken & schwarzes Plywood)
    const caseGeo = new THREE.BoxGeometry(0.75, 0.65, 1.10);
    const caseMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7, metalness: 0.3 });
    const case1 = new THREE.Mesh(caseGeo, caseMat);
    case1.position.set(0.60, loadEdgeHeight + 0.35, kofferBackZ + 1.20);
    const case2 = new THREE.Mesh(caseGeo, caseMat);
    case2.position.set(-0.60, loadEdgeHeight + 0.35, kofferBackZ + 1.20);
    const case3 = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.55, 0.85), caseMat);
    case3.position.set(0, loadEdgeHeight + 0.30, kofferBackZ + 2.80);

    // Supertechno 50 Teleskopschienen auf dem Ladeboden
    const railTrackGeo = new THREE.BoxGeometry(0.08, 0.06, 3.20);
    const railTrackL = new THREE.Mesh(railTrackGeo, silverMat);
    railTrackL.position.set(0.40, loadEdgeHeight + 0.05, kofferBackZ + 1.80);
    const railTrackR = new THREE.Mesh(railTrackGeo, silverMat);
    railTrackR.position.set(-0.40, loadEdgeHeight + 0.05, kofferBackZ + 1.80);

    // Laderaum-Deckenbeleuchtung (White LED Strip)
    const cargoCeilLight = new THREE.PointLight('#e0f2fe', 3.0, 8.0, 2);
    cargoCeilLight.position.set(0, kofferY + kofferHeight / 2 - 0.20, kofferBackZ + 2.0);

    cargoGroup.add(
      cargoFloor, wallLeft, wallRight, lashingL, lashingR,
      portalPostL, portalPostR, portalTop, portalSill,
      case1, case2, case3, railTrackL, railTrackR, cargoCeilLight
    );
    truck.add(cargoGroup);

    // 2. Obere Heckportal-Klappe (Top Flap / Roller Shutter)
    const topFlapGroup = new THREE.Group();
    topFlapGroup.position.set(0, kofferY + kofferHeight / 2 - 0.05, kofferBackZ);
    const topFlapMesh = new THREE.Mesh(
      new THREE.BoxGeometry(kofferWidth - 0.08, 0.62, 0.05),
      paintMat
    );
    topFlapMesh.position.set(0, -0.31, 0);
    const topFlapHandle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.03), darkTrimMat);
    topFlapHandle.position.set(0, -0.58, 0.035);
    topFlapGroup.add(topFlapMesh, topFlapHandle);
    truck.add(topFlapGroup);

    // 3. Hydraulische Ladebordwand (Dautel Cargolift Plattform mit 3-Phasen Kinematik)
    const tailgateBlinkerMat = new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#ff9900', emissiveIntensity: 0.0, roughness: 0.2 });

    const tailLiftAssembly = new THREE.Group();
    tailLiftAssembly.position.set(0, 1.02, kofferBackZ); // Drehpunkt exakt auf Ladekantenhöhe

    // Plattform-Kippachse (Dreht Plattform von senkrecht 0° auf waagerecht -90°)
    const platformTiltGroup = new THREE.Group();

    // Plattform-Spitzenneigung (Neigt Spitze um 3.5° auf den Boden)
    const platformTipGroup = new THREE.Group();

    // Plattform-Materialien: Innenseite Silber-Riffelblech, Außenseite Dautel Warn-Design
    const platformMaterials = [silverMat, silverMat, silverMat, silverMat, silverMat, tailLiftMat];

    // Die eigentliche Alu-Ladebordwand-Plattform
    const platformMesh = new THREE.Mesh(
      new THREE.BoxGeometry(kofferWidth - 0.06, 2.05, 0.05),
      platformMaterials
    );
    platformMesh.position.set(0, 1.025, -0.025);
    platformMesh.castShadow = true;

    // Plattform Alu-Kantenschutz & Warnblinker
    const platEdgeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.05, 0.06), silverMat);
    platEdgeL.position.set(kofferWidth / 2 - 0.04, 1.025, -0.025);
    const platEdgeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.05, 0.06), silverMat);
    platEdgeR.position.set(-kofferWidth / 2 + 0.04, 1.025, -0.025);

    // 2x Blinkende Sicherheits-LEDs an den Plattform-Außenecken
    const platBlinkerGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const blinkerL = new THREE.Mesh(platBlinkerGeo, tailgateBlinkerMat);
    blinkerL.position.set(kofferWidth / 2 - 0.12, 1.95, -0.05);
    const blinkerR = new THREE.Mesh(platBlinkerGeo, tailgateBlinkerMat);
    blinkerR.position.set(-kofferWidth / 2 + 0.12, 1.95, -0.05);

    platformTipGroup.add(platformMesh, platEdgeL, platEdgeR, blinkerL, blinkerR);
    platformTiltGroup.add(platformTipGroup);
    platformTiltGroup.rotation.x = 0; // Im geschlossenen Zustand senkrecht stehend
    tailLiftAssembly.add(platformTiltGroup);

    // 4. Mechanische Parallelogramm-Hubarme mit integrierten Hydraulikzylindern
    const liftArmLGroup = new THREE.Group();
    liftArmLGroup.position.set(0.65, 0.45, kofferBackZ + 0.25);
    const liftArmRGroup = new THREE.Group();
    liftArmRGroup.position.set(-0.65, 0.45, kofferBackZ + 0.25);

    // Hauptträger (Unterer Schwenkarm)
    const liftArmGeo = new THREE.BoxGeometry(0.06, 0.08, 0.72);
    const liftArmMeshL = new THREE.Mesh(liftArmGeo, chassisMat);
    liftArmMeshL.position.set(0, 0, -0.36);
    liftArmLGroup.add(liftArmMeshL);

    const liftArmMeshR = new THREE.Mesh(liftArmGeo, chassisMat);
    liftArmMeshR.position.set(0, 0, -0.36);
    liftArmRGroup.add(liftArmMeshR);

    // Integrierter Hydraulikzylinder & verchromte Kolbenstange (Oberer Parallel-Lenker)
    const cylBodyGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.38, 12);
    cylBodyGeo.rotateX(Math.PI / 2);
    const cylRodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.42, 12);
    cylRodGeo.rotateX(Math.PI / 2);

    const cylBodyL = new THREE.Mesh(cylBodyGeo, plasticMat);
    cylBodyL.position.set(0, 0.08, -0.19);
    const cylRodL = new THREE.Mesh(cylRodGeo, chromeMat);
    cylRodL.position.set(0, 0.08, -0.48);
    liftArmLGroup.add(cylBodyL, cylRodL);

    const cylBodyR = new THREE.Mesh(cylBodyGeo, plasticMat);
    cylBodyR.position.set(0, 0.08, -0.19);
    const cylRodR = new THREE.Mesh(cylRodGeo, chromeMat);
    cylRodR.position.set(0, 0.08, -0.48);
    liftArmRGroup.add(cylBodyR, cylRodR);

    // Hydraulik-Unterbau
    const tailBumperGeo = new THREE.BoxGeometry(2.4, 0.15, 0.3);
    const tailBumper = new THREE.Mesh(tailBumperGeo, chassisMat);
    tailBumper.position.set(0, 0.4, kofferBackZ + 0.15);
    
    // Unterfahrschutz Stange (Under-run bar)
    const underrunGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4);
    underrunGeo.rotateZ(Math.PI / 2);
    const underrun = new THREE.Mesh(underrunGeo, chassisMat);
    underrun.position.set(0, 0.25, kofferBackZ + 0.1);

    // Heck-Kennzeichen "SUPERTECHNO" & LED-Kennzeichenleuchten (Subagent 22.8)
    const rearPlateGeo = new THREE.BoxGeometry(0.80, 0.18, 0.04);
    const rearPlate = new THREE.Mesh(rearPlateGeo, plateMaterials);
    rearPlate.position.set(0, 0.42, kofferBackZ + 0.31);
    rearPlate.rotation.y = Math.PI; // Nach hinten ausgerichtet

    const plateLightGeo = new THREE.BoxGeometry(0.08, 0.03, 0.04);
    const plateLightMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.0 });
    const rearPlateLampL = new THREE.Mesh(plateLightGeo, plateLightMat);
    rearPlateLampL.position.set(0.25, 0.52, kofferBackZ + 0.29);
    const rearPlateLampR = new THREE.Mesh(plateLightGeo, plateLightMat);
    rearPlateLampR.position.set(-0.25, 0.52, kofferBackZ + 0.29);

    truck.add(tailLiftAssembly, liftArmLGroup, liftArmRGroup, tailBumper, underrun, rearPlate, rearPlateLampL, rearPlateLampR);

    // =========================================================================
    // 🚨 Subagent 22.12: `truck_rear_lights` - MAN 7-KAMMER HECKLEUCHTEN & BREMSLICHT (EXAKT NACH FOTO)
    // =========================================================================
    
    // 1. Texturen für die 4 optischen Kammern & Seitenmarkierungsleuchte
    const rearLightTexL = createManRearLightTexture(true);
    const rearLightTexR = createManRearLightTexture(false);
    const sideMarkerTex = createSideMarkerTexture();

    // 2. Materialien für die einzelnen Lichtkammern & dynamische Emissive-Shaders
    const rearBlinkerMatL = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.0, roughness: 0.2 });
    const rearBlinkerMatR = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.0, roughness: 0.2 });
    const rearBrakeLightMat = new THREE.MeshStandardMaterial({ color: '#ff1100', emissive: '#ff0000', emissiveIntensity: 0.8, roughness: 0.2 });
    const rearReverseMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.0, roughness: 0.1 });
    const rearFogMat = new THREE.MeshStandardMaterial({ color: '#cc0000', emissive: '#cc0000', emissiveIntensity: 0.2, roughness: 0.3 });
    const thirdBrakeLightMat = new THREE.MeshStandardMaterial({ color: '#ff0022', emissive: '#ff0000', emissiveIntensity: 0.0, roughness: 0.2 });
    const outlineMarkerMat = new THREE.MeshStandardMaterial({ color: '#ff3300', emissive: '#ff2200', emissiveIntensity: 1.2, roughness: 0.2 });

    // 3. Erstellung des fotorealistischen MAN Heckleuchten-Clusters
    const createRearLightCluster = (side: 'left' | 'right') => {
      const clusterGroup = new THREE.Group();
      const s = side === 'left' ? 1 : -1;
      const blinkerMat = side === 'left' ? rearBlinkerMatL : rearBlinkerMatR;
      const lensTex = side === 'left' ? rearLightTexL : rearLightTexR;

      // Hauptgehäuse (Schwarzer Kunststoffkasten mit Dichtungsrand)
      const housingGeo = new RoundedBoxGeometry(0.48, 0.16, 0.07, 3, 0.015);
      const housing = new THREE.Mesh(housingGeo, darkTrimMat);
      clusterGroup.add(housing);

      // Hochauflösende 4-Kammer Glaslinse (Texturierte Frontblende aus dem Foto)
      const lensMat = new THREE.MeshStandardMaterial({
        map: lensTex,
        roughness: 0.12,
        metalness: 0.05,
        transparent: true,
        opacity: 0.95
      });
      const lensMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.14), lensMat);
      lensMesh.position.set(0, 0, 0.036);
      if (side === 'left') {
        lensMesh.scale.set(-1, 1, 1); // Spiegeln damit Blinker außen liegt
      } else {
        lensMesh.scale.set(1, 1, 1);
      }
      clusterGroup.add(lensMesh);

      // Unterer Bajonett-Kabelanschluss / Verschraubung (aus dem Foto)
      const socketGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12);
      socketGeo.rotateX(Math.PI / 2);
      const socket = new THREE.Mesh(socketGeo, darkTrimMat);
      socket.position.set(-0.16 * s, -0.09, 0.01);
      clusterGroup.add(socket);

      // Dynamische innere Leuchtkammern (liegen hauchdünn hinter der Frontlinse für intensives Glühen)
      // Kammer 1: Blinker (Außen)
      const blinkerGlow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.01), blinkerMat);
      blinkerGlow.position.set(-0.16 * s, 0, 0.034);

      // Kammer 2: Brems- & Schlusslicht (Mitte-Außen)
      const brakeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.01), rearBrakeLightMat);
      brakeGlow.position.set(-0.02 * s, 0, 0.034);

      // Kammer 3: Rückfahrscheinwerfer (Mitte-Innen)
      const reverseGlow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.01), rearReverseMat);
      reverseGlow.position.set(0.10 * s, 0, 0.034);

      // Kammer 4: Nebelschlussleuchte & Rückstrahler (Innen)
      const fogGlow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.01), rearFogMat);
      fogGlow.position.set(0.19 * s, 0, 0.034);

      clusterGroup.add(blinkerGlow, brakeGlow, reverseGlow, fogGlow);

      // 4. MAN Seitenmarkierungsleuchte mit Verbindungskabel (Kompakte gelbe Leuchte aus dem Foto)
      const markerGroup = new THREE.Group();
      const markerBodyGeo = new RoundedBoxGeometry(0.12, 0.045, 0.025, 2, 0.006);
      const markerBody = new THREE.Mesh(markerBodyGeo, darkTrimMat);
      
      const markerLensMat = new THREE.MeshStandardMaterial({
        map: sideMarkerTex,
        roughness: 0.2,
        emissive: '#ff9900',
        emissiveIntensity: 0.6
      });
      const markerLens = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.038), markerLensMat);
      markerLens.position.set(0, 0, 0.013);
      markerGroup.add(markerBody, markerLens);
      
      // Am äußeren Unterfahrschutz nach außen gerichtet positionieren
      markerGroup.position.set(-0.32 * s, -0.05, 0.02);
      markerGroup.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      clusterGroup.add(markerGroup);

      // Schwarzes Verbindungskabel vom Markierer zum Heckleuchtensockel
      const cableGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8);
      cableGeo.rotateZ(-Math.PI / 3 * s);
      const cable = new THREE.Mesh(cableGeo, plasticMat);
      cable.position.set(-0.24 * s, -0.07, 0.01);
      clusterGroup.add(cable);

      clusterGroup.position.set(0.90 * s, 0.54, kofferBackZ - 0.04);
      clusterGroup.rotation.y = Math.PI; // 🚨 WICHTIG: Nach hinten (-Z) ausrichten!
      return clusterGroup;
    };

    const leftRearCluster = createRearLightCluster('left');
    const rightRearCluster = createRearLightCluster('right');

    // 5. Rotes Umgebungs-Bremslicht (PointLights für Bodenreflexion nach hinten)
    const rearBrakeLightL = new THREE.PointLight('#ff1100', 1.5, 8.0, 2);
    rearBrakeLightL.position.set(0.90, 0.54, kofferBackZ - 0.40);
    const rearBrakeLightR = new THREE.PointLight('#ff1100', 1.5, 8.0, 2);
    rearBrakeLightR.position.set(-0.90, 0.54, kofferBackZ - 0.40);

    // 6. 3. Bremsleuchte oben zentriert am Heckportal (nach hinten gerichtet)
    const thirdBrakeGeo = new THREE.BoxGeometry(0.36, 0.035, 0.03);
    const thirdBrakeLight = new THREE.Mesh(thirdBrakeGeo, thirdBrakeLightMat);
    thirdBrakeLight.position.set(0, kofferY + kofferHeight / 2 - 0.04, kofferBackZ - 0.02);
    thirdBrakeLight.rotation.y = Math.PI;

    // 7. Obere Umrissleuchten an den Heckkanten des Koffers
    const outlineMarkerGeo = new THREE.BoxGeometry(0.04, 0.06, 0.04);
    const outlineL = new THREE.Mesh(outlineMarkerGeo, outlineMarkerMat);
    outlineL.position.set(kofferWidth / 2 - 0.02, kofferY + kofferHeight / 2 - 0.08, kofferBackZ - 0.02);
    const outlineR = new THREE.Mesh(outlineMarkerGeo, outlineMarkerMat);
    outlineR.position.set(-kofferWidth / 2 + 0.02, kofferY + kofferHeight / 2 - 0.08, kofferBackZ - 0.02);

    truck.add(
      leftRearCluster, rightRearCluster,
      rearBrakeLightL, rearBrakeLightR,
      thirdBrakeLight, outlineL, outlineR
    );
    
    // Staukästen (Toolboxes) vor der Hinterachse
    const toolboxGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
    const leftToolbox = new THREE.Mesh(toolboxGeo, plasticMat);
    leftToolbox.position.set(1.0, 0.6, rearAxleZ + 1.2);
    const rightToolbox = leftToolbox.clone();
    rightToolbox.position.set(-1.0, 0.6, rearAxleZ + 1.2);
    truck.add(leftToolbox, rightToolbox);

    // Mudflaps (Schmutzfänger) behind rear wheels
    const mudflapGeo = new THREE.BoxGeometry(0.5, 0.6, 0.05);
    const leftFlap = new THREE.Mesh(mudflapGeo, plasticMat);
    leftFlap.position.set(1.1, 0.3, rearAxleZ - 0.7);
    const rightFlap = leftFlap.clone();
    rightFlap.position.set(-1.1, 0.3, rearAxleZ - 0.7);
    truck.add(leftFlap, rightFlap);

    // ==========================================
    // 🚚 3. NEUE MAN TGL 12.250 FAHRERKABINE
    // ==========================================

    // 3.1 Aerodynamischer Dachspoiler (Windleitkörper zum Koffer)
    const spoilerShape = new THREE.Shape();
    spoilerShape.moveTo(1.9, 3.70); // Oberkante Koffer front
    spoilerShape.quadraticCurveTo(3.2, 3.68, 3.5, 3.28); // Sanfter Bogen nach vorne unten
    spoilerShape.lineTo(3.35, 3.28);
    spoilerShape.quadraticCurveTo(3.05, 3.62, 1.9, 3.62);
    spoilerShape.lineTo(1.9, 3.70);
    
    const spoilerExtrude = { depth: 2.22, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 };
    const spoilerGeo = new THREE.ExtrudeGeometry(spoilerShape, spoilerExtrude);
    spoilerGeo.rotateY(-Math.PI / 2);
    spoilerGeo.translate(1.11, 0, 0);
    const roofSpoiler = new THREE.Mesh(spoilerGeo, paintMat);
    truck.add(roofSpoiler);

    // Seitliche Windleitfender an der Kabinenhinterkante (Spaltabdeckung zum Koffer)
    const deflectorGeo = new THREE.BoxGeometry(0.08, 2.4, 0.35);
    const leftDeflector = new THREE.Mesh(deflectorGeo, paintMat);
    leftDeflector.position.set(1.22, 2.15, 2.15);
    const rightDeflector = leftDeflector.clone();
    rightDeflector.position.set(-1.22, 2.15, 2.15);
    truck.add(leftDeflector, rightDeflector);



    // 3.2 Vollwertige Hohlraum-Fahrerkabine (Modular Hollow Cabin Architecture)
    // 3.2.1 Rückwand & Innenverkleidung
    const rearWallGeo = new RoundedBoxGeometry(2.24, 2.25, 0.08, 3, 0.02);
    const rearWall = new THREE.Mesh(rearWallGeo, paintMat);
    rearWall.position.set(0, 2.20, 2.37);
    rearWall.castShadow = true;
    rearWall.receiveShadow = true;
    
    const rearLiningGeo = new THREE.BoxGeometry(2.16, 2.15, 0.02);
    const rearLining = new THREE.Mesh(rearLiningGeo, interiorMat);
    rearLining.position.set(0, 2.20, 2.42);
    truck.add(rearWall, rearLining);

    // 3.2.2 Aerodynamische Dachschale & Dach-Querträger
    const roofShape = new THREE.Shape();
    roofShape.moveTo(2.35, 3.32);
    roofShape.quadraticCurveTo(3.10, 3.38, 3.76, 3.30);
    roofShape.lineTo(3.76, 3.24);
    roofShape.quadraticCurveTo(3.10, 3.32, 2.35, 3.26);
    roofShape.lineTo(2.35, 3.32);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 2.24, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 });
    roofGeo.rotateY(-Math.PI / 2);
    roofGeo.translate(1.12, 0, 0);
    const roofMesh = new THREE.Mesh(roofGeo, paintMat);
    roofMesh.castShadow = true;

    const roofHeaderGeo = new RoundedBoxGeometry(2.24, 0.14, 0.16, 3, 0.02);
    const roofHeader = new THREE.Mesh(roofHeaderGeo, paintMat);
    roofHeader.position.set(0, 3.26, 3.78);
    truck.add(roofMesh, roofHeader);

    // 3.2.3 Kabinenboden & erhöhter Motortunnel
    const floorGeo = new RoundedBoxGeometry(2.20, 0.08, 1.82, 3, 0.02);
    const floorMesh = new THREE.Mesh(floorGeo, darkTrimMat);
    floorMesh.position.set(0, 1.08, 3.28);
    floorMesh.receiveShadow = true;

    const tunnelGeo = new RoundedBoxGeometry(0.48, 0.24, 1.25, 3, 0.03);
    const tunnelMesh = new THREE.Mesh(tunnelGeo, interiorMat);
    tunnelMesh.position.set(0, 1.22, 3.20);

    const shifterGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
    const shifter = new THREE.Mesh(shifterGeo, chromeMat);
    shifter.position.set(0.12, 1.38, 3.45);
    const knobGeo = new THREE.SphereGeometry(0.028, 8, 8);
    const knob = new THREE.Mesh(knobGeo, darkTrimMat);
    knob.position.set(0.12, 1.44, 3.45);
    truck.add(floorMesh, tunnelMesh, shifter, knob);

    // 3.2.4 A-Säulen, B-Säulen, Dachholme & Einstiegsschweller (Tür- & Scheibenrahmen)
    const aPillarGeo = new THREE.BoxGeometry(0.10, 1.25, 0.12);
    const leftAPillar = new THREE.Mesh(aPillarGeo, paintMat);
    leftAPillar.position.set(1.09, 2.70, 3.97);
    leftAPillar.rotation.x = -Math.atan2(0.41, 1.12);
    leftAPillar.rotation.z = -0.04;
    leftAPillar.castShadow = true;

    const rightAPillar = new THREE.Mesh(aPillarGeo, paintMat);
    rightAPillar.position.set(-1.09, 2.70, 3.97);
    rightAPillar.rotation.x = -Math.atan2(0.41, 1.12);
    rightAPillar.rotation.z = 0.04;
    rightAPillar.castShadow = true;

    const bPillarGeo = new THREE.BoxGeometry(0.08, 2.20, 0.12);
    const leftBPillar = new THREE.Mesh(bPillarGeo, paintMat);
    leftBPillar.position.set(1.09, 2.20, 2.40);
    const rightBPillar = leftBPillar.clone();
    rightBPillar.position.set(-1.09, 2.20, 2.40);

    const sillGeo = new THREE.BoxGeometry(0.08, 0.12, 1.70);
    const leftSill = new THREE.Mesh(sillGeo, paintMat);
    leftSill.position.set(1.09, 1.12, 3.28);
    const rightSill = leftSill.clone();
    rightSill.position.set(-1.09, 1.12, 3.28);

    const roofRailGeo = new THREE.BoxGeometry(0.08, 0.10, 1.40);
    const leftRoofRail = new THREE.Mesh(roofRailGeo, paintMat);
    leftRoofRail.position.set(1.09, 3.28, 3.10);
    const rightRoofRail = leftRoofRail.clone();
    rightRoofRail.position.set(-1.09, 3.28, 3.10);

    // Frontmasken-Trägerblech unter der Scheibe
    const frontMaskGeo = new RoundedBoxGeometry(2.24, 0.95, 0.14, 3, 0.04);
    const frontMask = new THREE.Mesh(frontMaskGeo, paintMat);
    frontMask.position.set(0, 1.62, 4.30);
    frontMask.castShadow = true;

    truck.add(leftAPillar, rightAPillar, leftBPillar, rightBPillar, leftSill, rightSill, leftRoofRail, rightRoofRail, frontMask);

    // 3.3 Dachbegrenzungsleuchten & CB-Funkantenne
    const roofLampGeo = new THREE.BoxGeometry(0.12, 0.04, 0.08);
    const roofLampMat = new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#ff6600', emissiveIntensity: 1.2, roughness: 0.3 });
    const leftRoofLamp = new THREE.Mesh(roofLampGeo, roofLampMat);
    leftRoofLamp.position.set(0.95, 3.38, 3.68);
    const rightRoofLamp = leftRoofLamp.clone();
    rightRoofLamp.position.set(-0.95, 3.38, 3.68);
    
    const antennaGeo = new THREE.CylinderGeometry(0.004, 0.008, 0.85, 8);
    const antenna = new THREE.Mesh(antennaGeo, silverMat);
    antenna.position.set(0, 3.75, 3.58);
    truck.add(leftRoofLamp, rightRoofLamp, antenna);

    // 3.4 Sonnenblende (Exterior Sun Visor) über der Windschutzscheibe
    const visorShape = new THREE.Shape();
    visorShape.moveTo(-1.12, 0);
    visorShape.lineTo(1.12, 0);
    visorShape.lineTo(1.10, -0.22);
    visorShape.quadraticCurveTo(0, -0.16, -1.10, -0.22);
    visorShape.lineTo(-1.12, 0);
    const visorGeo = new THREE.ExtrudeGeometry(visorShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
    const sunVisor = new THREE.Mesh(visorGeo, visorMat);
    sunVisor.position.set(0, 3.28, 3.96);
    sunVisor.rotation.x = -0.32;
    truck.add(sunVisor);

    // 3.5 Aerodynamisch gewölbte Panorama-Windschutzscheibe, Gummidichtung & Cowl Tray (Subagent 22.7)
    // 1. Umlaufende Gummidichtung / Einbaurahmen
    const windshieldFrameGeo = createCurvedWindshieldGeometry(2.28, 1.20, 32, 16, 0.12);
    const windshieldFrame = new THREE.Mesh(windshieldFrameGeo, darkTrimMat);
    windshieldFrame.position.set(0, 2.70, 3.965);
    windshieldFrame.rotation.x = -Math.atan2(0.41, 1.12);

    // 2. Gewölbtes Verbundglas mit schwarzem Siebdruckrand & Blaukeil
    const windScreenGeo = createCurvedWindshieldGeometry(2.25, 1.17, 32, 16, 0.12);
    const windScreen = new THREE.Mesh(windScreenGeo, windshieldMat);
    windScreen.position.set(0, 2.70, 3.975);
    windScreen.rotation.x = -Math.atan2(0.41, 1.12);
    truck.add(windshieldFrame, windScreen);

    // 3. Regensensor & Lichtsensor-Gehäuse an der Scheiben-Oberkante
    const rainSensorGeo = new THREE.BoxGeometry(0.09, 0.09, 0.02);
    const rainSensorMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.2, metalness: 0.8 });
    const rainSensor = new THREE.Mesh(rainSensorGeo, rainSensorMat);
    rainSensor.position.set(0, 3.14, 3.80);
    rainSensor.rotation.x = -Math.atan2(0.41, 1.12);
    truck.add(rainSensor);

    // 4. Schwarze Wischerwanne (Wiper Cowl Panel) an der Scheibenunterkante
    const wiperCowlGeo = new RoundedBoxGeometry(2.26, 0.12, 0.20, 3, 0.02);
    const wiperCowl = new THREE.Mesh(wiperCowlGeo, darkTrimMat);
    wiperCowl.position.set(0, 2.14, 4.22);
    wiperCowl.rotation.x = -0.15;
    truck.add(wiperCowl);

    // 5. Scheibenwischer mit synchroner Gelenk-Kinematik auf der Cowl-Wanne
    const wiperArmGeo = new THREE.BoxGeometry(0.02, 0.42, 0.02);
    const wiperBladeGeo = new THREE.BoxGeometry(0.52, 0.018, 0.02);
    const wipers: THREE.Group[] = [];

    const createWiper = (xOffset: number) => {
      const g = new THREE.Group();
      // Auf Höhe der Scheibenunterkante montieren
      g.position.set(xOffset, 2.16, 4.26);
      g.rotation.x = -Math.atan2(0.41, 1.12);

      const pivot = new THREE.Group();
      const arm = new THREE.Mesh(wiperArmGeo, darkTrimMat);
      arm.position.set(0, 0.18, 0.01);
      const blade = new THREE.Mesh(wiperBladeGeo, darkTrimMat);
      blade.position.set(0.14, 0.35, 0.02);
      pivot.add(arm, blade);
      pivot.rotation.z = -0.35; // Ruhelage
      g.add(pivot);
      wipers.push(pivot);
      return g;
    };
    truck.add(createWiper(-0.38), createWiper(0.28));

    // Haltegriffe unter der Scheibe (Maintenance Grab Bars)
    const grabBarGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 12);
    grabBarGeo.rotateZ(Math.PI / 2);
    const leftGrab = new THREE.Mesh(grabBarGeo, chromeMat);
    leftGrab.position.set(0.65, 2.12, 4.31);
    const rightGrab = leftGrab.clone();
    rightGrab.position.set(-0.65, 2.12, 4.31);
    truck.add(leftGrab, rightGrab);

    // 3.6 MAN Frontmaske, Waben-Kühlergrill & Eck-Windleitkörper
    const grillGeo = new THREE.BoxGeometry(2.18, 1.18, 0.08);
    const grill = new THREE.Mesh(grillGeo, grillMaterials);
    grill.position.set(0, 1.58, 4.40);
    truck.add(grill);

    // Eck-Windleitkörper (Corner Aero Vanes) beidseitig des Grills
    const aeroVaneGeo = new THREE.BoxGeometry(0.12, 0.85, 0.28);
    const leftAeroVane = new THREE.Mesh(aeroVaneGeo, paintMat);
    leftAeroVane.position.set(1.12, 1.62, 4.32);
    leftAeroVane.rotation.y = -0.35;
    const rightAeroVane = new THREE.Mesh(aeroVaneGeo, paintMat);
    rightAeroVane.position.set(-1.12, 1.62, 4.32);
    rightAeroVane.rotation.y = 0.35;
    truck.add(leftAeroVane, rightAeroVane);

    // 3.7 Bumper (Stoßfänger mit Kühleinlass & Kennzeichen)
    const bumperGeo = new RoundedBoxGeometry(2.46, 0.78, 0.58, 4, 0.08);
    const bumper = new THREE.Mesh(bumperGeo, plasticMat);
    bumper.position.set(0, 0.72, 4.22);
    bumper.castShadow = true;
    truck.add(bumper);

    const plateGeo = new THREE.BoxGeometry(0.80, 0.18, 0.04);
    const plate = new THREE.Mesh(plateGeo, plateMaterials);
    plate.position.set(0, 0.48, 4.54);
    truck.add(plate);

    // =========================================================================
    // 💡 Subagent 22.13: `truck_headlights` - MAN LED-FRONTSCHEINWERFER & DRL
    // =========================================================================
    
    // 1. Scheinwerfer-Materialien
    const frontBlinkerMatL = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.0, roughness: 0.2 });
    const frontBlinkerMatR = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.0, roughness: 0.2 });
    const biLedLensMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.8, roughness: 0.05, clearcoat: 1.0, transmission: 0.4 });
    const fogLampMat = new THREE.MeshStandardMaterial({ color: '#fffbf0', emissive: '#fff3d6', emissiveIntensity: 1.4, roughness: 0.15 });
    const roofMarkerMat = new THREE.MeshStandardMaterial({ color: '#e0f2fe', emissive: '#bae6fd', emissiveIntensity: 2.2, roughness: 0.2 });

    // 2. Erstellung der originalen MAN H7 Doppel-Hauptscheinwerfer (Exakt nach Foto)
    const createFrontHeadlightCluster = (side: 'left' | 'right') => {
      const g = new THREE.Group();
      const s = side === 'left' ? 1 : -1;
      const blinkerMat = side === 'left' ? frontBlinkerMatL : frontBlinkerMatR;

      // Hauptgehäuse (Schwarzer Kunststoffträger mit abgerundetem Dichtungsrand)
      const housingGeo = new RoundedBoxGeometry(0.54, 0.28, 0.08, 3, 0.015);
      const housing = new THREE.Mesh(housingGeo, darkTrimMat);
      g.add(housing);

      // Verchromte Trägerwanne / Reflektor-Bett
      const reflectorBedGeo = new THREE.BoxGeometry(0.51, 0.25, 0.03);
      const reflectorBed = new THREE.Mesh(reflectorBedGeo, chromeMat);
      reflectorBed.position.set(0, 0, 0.01);
      g.add(reflectorBed);

      // 1. Großer parabolischer H7-Reflektor (Abblendlicht - innenliegend)
      const bowlLargeGeo = new THREE.CylinderGeometry(0.105, 0.065, 0.035, 24, 1, true);
      bowlLargeGeo.rotateX(Math.PI / 2);
      const bowlLarge = new THREE.Mesh(bowlLargeGeo, chromeMat);
      bowlLarge.position.set(-0.09 * s, 0, 0.02);

      // Große H7 Lampenkappe & Glühfaden
      const bulbCapLarge = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), darkTrimMat);
      bulbCapLarge.position.set(-0.09 * s, 0, 0.038);
      const bulbGlowLarge = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), biLedLensMat);
      bulbGlowLarge.position.set(-0.09 * s, 0, 0.035);
      g.add(bowlLarge, bulbCapLarge, bulbGlowLarge);

      // 2. Kleinerer H7-Reflektor (Fernlicht/Zusatz - außenliegend)
      const bowlSmallGeo = new THREE.CylinderGeometry(0.085, 0.055, 0.03, 20, 1, true);
      bowlSmallGeo.rotateX(Math.PI / 2);
      const bowlSmall = new THREE.Mesh(bowlSmallGeo, chromeMat);
      bowlSmall.position.set(0.10 * s, 0, 0.02);

      // Kleine H7 Lampenkappe
      const bulbCapSmall = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), darkTrimMat);
      bulbCapSmall.position.set(0.10 * s, 0, 0.035);
      const bulbGlowSmall = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), biLedLensMat);
      bulbGlowSmall.position.set(0.10 * s, 0, 0.032);
      g.add(bowlSmall, bulbCapSmall, bulbGlowSmall);

      // 3. Äußeres Montagescharnier / Befestigungslasche (aus dem Foto rechts)
      const hingeGroup = new THREE.Group();
      const hingePlateGeo = new THREE.BoxGeometry(0.06, 0.22, 0.04);
      const hingePlate = new THREE.Mesh(hingePlateGeo, darkTrimMat);
      
      // 3x Scharnier-Zylinder / Bohrungen
      for (let yOffset of [-0.07, 0, 0.07]) {
        const barrelGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.035, 12);
        const barrel = new THREE.Mesh(barrelGeo, darkTrimMat);
        barrel.position.set(0.02 * s, yOffset, 0);
        hingeGroup.add(barrel);
      }
      hingeGroup.add(hingePlate);
      hingeGroup.position.set(0.30 * s, 0, 0);
      g.add(hingeGroup);

      // 4. Klarglas-Frontscheibe mit Doppel-Reflektor HD-Map & ECE-Prüfzeichen
      const outerLensMat = new THREE.MeshStandardMaterial({
        map: hlTex,
        roughness: 0.08,
        metalness: 0.05,
        transparent: true,
        opacity: 0.90
      });
      const outerLens = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26), outerLensMat);
      outerLens.position.set(0, 0, 0.042);
      if (side === 'left') {
        outerLens.scale.set(1, 1, 1);
      } else {
        outerLens.scale.set(-1, 1, 1); // Spiegeln für rechte Seite
      }
      g.add(outerLens);

      // 5. LED Frontblinker-Streifen (Oben)
      const blinkerGeo = new THREE.BoxGeometry(0.42, 0.025, 0.015);
      const blinker = new THREE.Mesh(blinkerGeo, blinkerMat);
      blinker.position.set(0, 0.11, 0.04);
      g.add(blinker);

      g.position.set(0.82 * s, 0.72, 4.53);
      return g;
    };

    const frontHlLeft = createFrontHeadlightCluster('left');
    const frontHlRight = createFrontHeadlightCluster('right');

    // 3. Untere Nebelscheinwerfer & Abbiegelicht in den Stoßfängerecken
    const fogGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16);
    fogGeo.rotateX(Math.PI / 2);
    const fogRingGeo = new THREE.TorusGeometry(0.058, 0.01, 10, 20);

    const leftFog = new THREE.Mesh(fogGeo, fogLampMat);
    const leftFogRing = new THREE.Mesh(fogRingGeo, chromeMat);
    leftFog.position.set(0.88, 0.40, 4.54);
    leftFogRing.position.set(0.88, 0.40, 4.55);

    const rightFog = new THREE.Mesh(fogGeo, fogLampMat);
    const rightFogRing = new THREE.Mesh(fogRingGeo, chromeMat);
    rightFog.position.set(-0.88, 0.40, 4.54);
    rightFogRing.position.set(-0.88, 0.40, 4.55);

    // 4. Dach-Positionsleuchten (Roof Clearance Lights an der Sonnenblende)
    const roofMarkerGeo = new THREE.BoxGeometry(0.06, 0.025, 0.04);
    const roofMarkerL = new THREE.Mesh(roofMarkerGeo, roofMarkerMat);
    roofMarkerL.position.set(0.85, 3.42, 3.92);
    const roofMarkerR = new THREE.Mesh(roofMarkerGeo, roofMarkerMat);
    roofMarkerR.position.set(-0.85, 3.42, 3.92);

    // 5. Front Spotlights mit fotometrischem Lichtkegel auf den Asphalt
    const leftSpot = new THREE.SpotLight('#ffffff', 32, 60, Math.PI / 5, 0.45, 1.5);
    leftSpot.position.set(0.82, 0.72, 4.54);
    leftSpot.target.position.set(0.82, -0.5, 22);
    
    const rightSpot = new THREE.SpotLight('#ffffff', 32, 60, Math.PI / 5, 0.45, 1.5);
    rightSpot.position.set(-0.82, 0.72, 4.54);
    rightSpot.target.position.set(-0.82, -0.5, 22);

    truck.add(
      frontHlLeft, frontHlRight,
      leftFog, leftFogRing, rightFog, rightFogRing,
      roofMarkerL, roofMarkerR,
      leftSpot, leftSpot.target, rightSpot, rightSpot.target
    );

    // 3.8 Ergo-Cockpit Interieur (Dashboard, Lenkrad, Sitze im Hohlraum)
    const cockpitGroup = new THREE.Group();
    cockpitGroup.position.set(0, 2.15, 3.32);

    // Armaturenbrett (Curved Dashboard)
    const dashBodyGeo = new THREE.BoxGeometry(2.05, 0.45, 0.58);
    const dashBody = new THREE.Mesh(dashBodyGeo, interiorMat);
    dashBody.position.set(0, 0.05, 0.42);
    
    // Tacho-Instrumenteneinheit (Fahrerseite links)
    const clusterGeo = new THREE.BoxGeometry(0.45, 0.22, 0.04);
    const cluster = new THREE.Mesh(clusterGeo, dashMat);
    cluster.position.set(0.55, 0.28, 0.58);
    cluster.rotation.x = -0.25;

    // MAN Lenkrad & Lenksäule
    const columnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 12);
    const column = new THREE.Mesh(columnGeo, darkTrimMat);
    column.position.set(0.55, 0.08, 0.36);
    column.rotation.x = -0.65;

    const wheelTorusGeo = new THREE.TorusGeometry(0.20, 0.024, 12, 24);
    const wheelCenterGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16);
    wheelCenterGeo.rotateX(Math.PI / 2);
    const wheelCenter = new THREE.Mesh(wheelCenterGeo, darkTrimMat);
    const wheelTorus = new THREE.Mesh(wheelTorusGeo, darkTrimMat);
    const steeringWheel = new THREE.Group();
    steeringWheel.add(wheelTorus, wheelCenter);
    steeringWheel.position.set(0.55, 0.22, 0.24);
    steeringWheel.rotation.x = -0.65;

    // Fahrer-Pedale (Gas, Bremse, Kupplung)
    const pedalGeo = new THREE.BoxGeometry(0.06, 0.10, 0.02);
    const pedal1 = new THREE.Mesh(pedalGeo, silverMat);
    pedal1.position.set(0.46, -0.88, 0.55);
    pedal1.rotation.x = -0.35;
    const pedal2 = new THREE.Mesh(pedalGeo, silverMat);
    pedal2.position.set(0.55, -0.86, 0.56);
    pedal2.rotation.x = -0.35;
    const pedal3 = new THREE.Mesh(pedalGeo, silverMat);
    pedal3.position.set(0.64, -0.84, 0.57);
    pedal3.rotation.x = -0.35;

    // Ergonomische Sitze mit Kopfstützen (sitzen auf dem Kabinenboden bei Y = 1.08m)
    const createSeat = (xPos: number) => {
      const seatGroup = new THREE.Group();
      // Sitzkissen
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.58), seatFabricMat);
      baseMesh.position.set(0, -0.92, -0.22);
      // Rückenlehne
      const backMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.78, 0.14), seatFabricMat);
      backMesh.position.set(0, -0.44, -0.46);
      backMesh.rotation.x = 0.08;
      // Kopfstütze
      const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.12), seatFabricMat);
      headRest.position.set(0, 0.06, -0.50);
      seatGroup.add(baseMesh, backMesh, headRest);
      seatGroup.position.set(xPos, 0, 0);
      return seatGroup;
    };

    // Dezente Innenraum-Deckenbeleuchtung
    const domeLight = new THREE.PointLight('#e0f2fe', 1.8, 4.5, 2);
    domeLight.position.set(0, 1.05, -0.15);

    cockpitGroup.add(dashBody, cluster, column, steeringWheel, pedal1, pedal2, pedal3, createSeat(0.55), createSeat(-0.55), domeLight);
    truck.add(cockpitGroup);

    // 3.9 MAN Türen, Stufenfenster & Kinematik (Subagent 22.9 - Fugenloser Blueprint-Sitz)
    // 1. MAN Stufenfenster (Glasklare getönte Scheibe exakt parallel zur Windschutzscheibe)
    const winShape = new THREE.Shape();
    winShape.moveTo(0.02, 0.86);                         // Vorne am tiefen Spiegeldreieck
    winShape.lineTo(0.44, 2.18);                         // A-Säulen-Schräge nach oben-hinten (exakt parallel zur Windschutzscheibe)
    winShape.lineTo(1.80, 2.18);                         // Dachkante hinten an B-Säule
    winShape.lineTo(1.80, 1.08);                         // B-Säule Fensterunterkante
    winShape.lineTo(0.85, 1.08);                         // Hohe horizontale Brüstungslinie hinten
    winShape.bezierCurveTo(0.65, 1.08, 0.45, 0.86, 0.25, 0.86); // MAN charakteristische S-Kurve
    winShape.lineTo(0.02, 0.86);
    
    const sideWindowGeo = new THREE.ExtrudeGeometry(winShape, { depth: 0.015, bevelEnabled: false });
    sideWindowGeo.rotateY(Math.PI / 2); // Map Shape(X, Y) -> (-Z, Y), depth -> +X
    sideWindowGeo.translate(0.02, 0, 0);

    // 2. Schwarzes Kunststoff-Spiegeldreieck (Mirror Triangle Base) vorne am Scheibeneck
    const mirrorTriShape = new THREE.Shape();
    mirrorTriShape.moveTo(0, 0.86);
    mirrorTriShape.lineTo(0.14, 1.35);
    mirrorTriShape.lineTo(0.28, 0.86);
    mirrorTriShape.lineTo(0, 0.86);
    const mirrorTriGeo = new THREE.ExtrudeGeometry(mirrorTriShape, { depth: 0.052, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 });
    mirrorTriGeo.rotateY(Math.PI / 2);

    // 3. Vertikaler Fensterführungs-Steg (Divider Bar nach Blueprint)
    const winDividerGeo = new THREE.BoxGeometry(0.035, 1.08, 0.02);

    // 4. Modulare, fehlerfreie Scheibenrahmen-Holme (A-Säule, Dachholm, B-Säule in paintMat)
    // A-Säulen-Schrägholm (neigt sich nach hinten-oben parallel zur A-Säule)
    const aPillarBeamGeo = new THREE.BoxGeometry(0.045, 1.39, 0.05);
    aPillarBeamGeo.rotateX(-Math.atan2(0.44, 1.32)); // Negativ = neigt sich nach hinten (-Z)!
    // Dachholm
    const roofBeamGeo = new THREE.BoxGeometry(0.045, 0.05, 1.38);
    // B-Säulen-Vertikalholm
    const bPillarBeamGeo = new THREE.BoxGeometry(0.045, 1.10, 0.05);

    // 5. Türblatt-Unterbau (Außenhaut mit S-Kurven-Brüstungslinie & Einstiegsüberdeckung)
    const doorPanelShape = new THREE.Shape();
    doorPanelShape.moveTo(0, 0.86);
    doorPanelShape.lineTo(0.25, 0.86);
    doorPanelShape.bezierCurveTo(0.45, 0.86, 0.65, 1.08, 0.85, 1.08);
    doorPanelShape.lineTo(1.82, 1.08);
    doorPanelShape.lineTo(1.82, 0.0);                   // B-Säule unten
    doorPanelShape.lineTo(0, -0.22);                    // Einstiegsüberdeckung vorne über die obere Stufe
    doorPanelShape.lineTo(0, 0.86);
    
    const doorPanelGeo = new THREE.ExtrudeGeometry(doorPanelShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
    doorPanelGeo.rotateY(Math.PI / 2);

    // 6. Horizontale Karosseriesicke (3D-Lichtkante auf Y = 0.58m nach Blueprint)
    const bodyCreaseGeo = new THREE.BoxGeometry(0.016, 0.035, 1.80);

    // 7. Bügeltürgriff mit eingelassener Griffmulde (an der B-Säule auf Sickenhöhe)
    const handlePocketGeo = new RoundedBoxGeometry(0.020, 0.085, 0.22, 2, 0.008);
    const handleBarGeo = new THREE.BoxGeometry(0.022, 0.028, 0.16);

    // 8. "TGL 12.250" Typenplakette
    const tglBadgeGeo = new THREE.BoxGeometry(0.012, 0.10, 0.36);
    const tglBadgeMatL = [new THREE.MeshStandardMaterial({ map: tglBadgeTex, roughness: 0.35, metalness: 0.6 }), darkTrimMat, darkTrimMat, darkTrimMat, darkTrimMat, darkTrimMat];
    const tglBadgeMatR = [darkTrimMat, new THREE.MeshStandardMaterial({ map: tglBadgeTex, roughness: 0.35, metalness: 0.6 }), darkTrimMat, darkTrimMat, darkTrimMat, darkTrimMat];

    // 9. Tür-Innenverkleidung (Door Card)
    const doorCardGeo = new THREE.BoxGeometry(0.04, 0.90, 1.72);
    const armrestGeo = new THREE.BoxGeometry(0.08, 0.10, 0.45);
    const innerHandleGeo = new THREE.BoxGeometry(0.03, 0.04, 0.10);
    const doorPocketGeo = new THREE.BoxGeometry(0.08, 0.28, 0.65);
    const sideTrimGeo = new THREE.BoxGeometry(0.024, 0.14, 1.80);

    // Linke Tür-Gruppe (Fahrerseite)
    // Hinge Pivot exakt am Übergang von Frontmaske zu A-Säule: (X = 1.15, Y = 1.08, Z = 4.22)
    const leftDoorGroup = new THREE.Group();
    leftDoorGroup.position.set(1.15, 1.08, 4.22);
    
    const leftWin = new THREE.Mesh(sideWindowGeo, glassMat);
    const leftMirrorTri = new THREE.Mesh(mirrorTriGeo, darkTrimMat);
    const leftDivider = new THREE.Mesh(winDividerGeo, darkTrimMat);
    leftDivider.position.set(0.02, 1.63, -1.45);

    // Rahmen-Holme links
    const doorLeftAPillar = new THREE.Mesh(aPillarBeamGeo, paintMat);
    doorLeftAPillar.position.set(0.025, 1.52, -0.22);
    const doorLeftRoof = new THREE.Mesh(roofBeamGeo, paintMat);
    doorLeftRoof.position.set(0.025, 2.18, -1.13);
    const doorLeftBPillar = new THREE.Mesh(bPillarBeamGeo, paintMat);
    doorLeftBPillar.position.set(0.025, 1.63, -1.82);

    const leftPanel = new THREE.Mesh(doorPanelGeo, paintMat);
    
    // Horizontale Sicke links (Sauberer Z-Offset gegen Flimmern)
    const leftCrease = new THREE.Mesh(bodyCreaseGeo, paintMat);
    leftCrease.position.set(0.074, 0.58, -0.90);

    // "TGL 12.250" Plakette links
    const leftBadge = new THREE.Mesh(tglBadgeGeo, tglBadgeMatL);
    leftBadge.position.set(0.076, 0.94, -1.30);
    
    // Türgriff mit Griffmulde links
    const leftHandlePocket = new THREE.Mesh(handlePocketGeo, darkTrimMat);
    leftHandlePocket.position.set(0.074, 0.58, -1.68);
    const leftHandleBar = new THREE.Mesh(handleBarGeo, darkTrimMat);
    leftHandleBar.position.set(0.086, 0.58, -1.68);
    
    // Schwarzer Schutzstreifen unten links
    const leftTrimObj = new THREE.Mesh(sideTrimGeo, darkTrimMat);
    leftTrimObj.position.set(0.074, 0.0, -0.90);
    
    // Innen-Verkleidung links
    const leftCard = new THREE.Mesh(doorCardGeo, interiorMat);
    leftCard.position.set(-0.025, 0.52, -0.90);
    const leftArmrest = new THREE.Mesh(armrestGeo, darkTrimMat);
    leftArmrest.position.set(-0.055, 0.60, -0.85);
    const leftInnerHandle = new THREE.Mesh(innerHandleGeo, chromeMat);
    leftInnerHandle.position.set(-0.055, 0.85, -1.60);
    const leftPocket = new THREE.Mesh(doorPocketGeo, interiorMat);
    leftPocket.position.set(-0.055, 0.24, -0.85);

    leftDoorGroup.add(leftWin, leftMirrorTri, leftDivider, doorLeftAPillar, doorLeftRoof, doorLeftBPillar, leftPanel, leftCrease, leftBadge, leftHandlePocket, leftHandleBar, leftTrimObj, leftCard, leftArmrest, leftInnerHandle, leftPocket);

    // Rechte Tür-Gruppe (Beifahrerseite)
    // Hinge Pivot exakt am Übergang von Frontmaske zu A-Säule: (X = -1.15, Y = 1.08, Z = 4.22)
    const rightDoorGroup = new THREE.Group();
    rightDoorGroup.position.set(-1.15, 1.08, 4.22);
    
    const rightWin = new THREE.Mesh(sideWindowGeo, glassMat);
    rightWin.scale.set(-1, 1, 1);
    const rightMirrorTri = new THREE.Mesh(mirrorTriGeo, darkTrimMat);
    rightMirrorTri.scale.set(-1, 1, 1);
    const rightDivider = new THREE.Mesh(winDividerGeo, darkTrimMat);
    rightDivider.position.set(-0.02, 1.63, -1.45);

    // Rahmen-Holme rechts
    const doorRightAPillar = new THREE.Mesh(aPillarBeamGeo, paintMat);
    doorRightAPillar.position.set(-0.025, 1.52, -0.22);
    const doorRightRoof = new THREE.Mesh(roofBeamGeo, paintMat);
    doorRightRoof.position.set(-0.025, 2.18, -1.13);
    const doorRightBPillar = new THREE.Mesh(bPillarBeamGeo, paintMat);
    doorRightBPillar.position.set(-0.025, 1.63, -1.82);

    const rightPanel = new THREE.Mesh(doorPanelGeo, paintMat);
    rightPanel.scale.set(-1, 1, 1);
    
    // Horizontale Sicke rechts
    const rightCrease = new THREE.Mesh(bodyCreaseGeo, paintMat);
    rightCrease.position.set(-0.074, 0.58, -0.90);

    // "TGL 12.250" Plakette rechts
    const rightBadge = new THREE.Mesh(tglBadgeGeo, tglBadgeMatR);
    rightBadge.position.set(-0.076, 0.94, -1.30);
    
    // Türgriff mit Griffmulde rechts
    const rightHandlePocket = new THREE.Mesh(handlePocketGeo, darkTrimMat);
    rightHandlePocket.position.set(-0.074, 0.58, -1.68);
    const rightHandleBar = new THREE.Mesh(handleBarGeo, darkTrimMat);
    rightHandleBar.position.set(-0.086, 0.58, -1.68);
    
    // Schwarzer Schutzstreifen unten rechts
    const rightTrimObj = new THREE.Mesh(sideTrimGeo, darkTrimMat);
    rightTrimObj.position.set(-0.074, 0.0, -0.90);
    
    // Innen-Verkleidung rechts
    const rightCard = new THREE.Mesh(doorCardGeo, interiorMat);
    rightCard.position.set(0.025, 0.52, -0.90);
    const rightArmrest = new THREE.Mesh(armrestGeo, darkTrimMat);
    rightArmrest.position.set(0.055, 0.60, -0.85);
    const rightInnerHandle = new THREE.Mesh(innerHandleGeo, chromeMat);
    rightInnerHandle.position.set(0.055, 0.85, -1.60);
    const rightPocket = new THREE.Mesh(doorPocketGeo, interiorMat);
    rightPocket.position.set(0.055, 0.24, -0.85);

    rightDoorGroup.add(rightWin, rightMirrorTri, rightDivider, doorRightAPillar, doorRightRoof, doorRightBPillar, rightPanel, rightCrease, rightBadge, rightHandlePocket, rightHandleBar, rightTrimObj, rightCard, rightArmrest, rightInnerHandle, rightPocket);
    truck.add(leftDoorGroup, rightDoorGroup);

    // 3.10 Umfassendes 4-Spiegel-Sicherheitssystem (Haupt-, Weitwinkel-, Rampen- & Frontspiegel)
    const mirrorArmGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.42, 12);
    mirrorArmGeo.rotateZ(Math.PI / 2);
    const verticalArmGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.85, 12);
    
    const mirrorMainGeo = new RoundedBoxGeometry(0.14, 0.44, 0.24, 4, 0.03);
    const mirrorSubGeo = new RoundedBoxGeometry(0.14, 0.22, 0.24, 4, 0.03);
    const glassMainGeo = new THREE.BoxGeometry(0.145, 0.42, 0.22);
    const glassSubGeo = new THREE.BoxGeometry(0.145, 0.20, 0.22);

    const createMirror = (xOffset: number, side: 'left' | 'right') => {
      const mirrorGroup = new THREE.Group();
      const s = side === 'left' ? 1 : -1;
      
      const armMain = new THREE.Mesh(mirrorArmGeo, darkTrimMat);
      armMain.position.set(0.16 * s, 0, 0); 
      
      const armVert = new THREE.Mesh(verticalArmGeo, darkTrimMat);
      armVert.position.set(0.36 * s, 0, 0);

      // Hauptspiegel
      const headMain = new THREE.Mesh(mirrorMainGeo, darkTrimMat);
      headMain.position.set(0.36 * s, 0.12, 0);
      const glassMain = new THREE.Mesh(glassMainGeo, glassMat);
      glassMain.position.set(0.36 * s, 0.12, -0.015);
      
      // Weitwinkelspiegel
      const headSub = new THREE.Mesh(mirrorSubGeo, darkTrimMat);
      headSub.position.set(0.36 * s, -0.28, 0);
      const glassSub = new THREE.Mesh(glassSubGeo, glassMat);
      glassSub.position.set(0.36 * s, -0.28, -0.015);
      
      mirrorGroup.add(armMain, armVert, headMain, glassMain, headSub, glassSub);
      mirrorGroup.position.set(xOffset, 2.35, 4.30); 
      return mirrorGroup;
    };
    truck.add(createMirror(1.15, 'left'));
    truck.add(createMirror(-1.15, 'right'));

    // Rampenspiegel (Kerb Mirror) beifahrerseitig oben
    const kerbMirrorGroup = new THREE.Group();
    const kerbArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), darkTrimMat);
    kerbArm.position.set(0, 0, 0.12);
    kerbArm.rotation.x = Math.PI / 4;
    const kerbHead = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.12, 0.22, 3, 0.02), darkTrimMat);
    kerbHead.position.set(0, -0.10, 0.25);
    kerbHead.rotation.x = 0.55;
    const kerbGlass = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.20), glassMat);
    kerbGlass.position.set(0, -0.10, 0.24);
    kerbGlass.rotation.x = 0.55;
    kerbMirrorGroup.add(kerbArm, kerbHead, kerbGlass);
    kerbMirrorGroup.position.set(-1.18, 3.25, 3.95);
    truck.add(kerbMirrorGroup);

    // Front-Anfahrspiegel (Front Blind-Spot Mirror) zentral über der Windschutzscheibe
    const frontMirrorGroup = new THREE.Group();
    const frontArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.30, 8), darkTrimMat);
    frontArm.position.set(0, -0.08, 0.12);
    frontArm.rotation.x = 0.65;
    const frontHead = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.12, 0.16, 3, 0.02), darkTrimMat);
    frontHead.position.set(0, -0.18, 0.22);
    frontHead.rotation.x = 0.85;
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.14), glassMat);
    frontGlass.position.set(0, -0.18, 0.21);
    frontGlass.rotation.x = 0.85;
    frontMirrorGroup.add(frontArm, frontHead, frontGlass);
    frontMirrorGroup.position.set(0, 3.32, 4.02);
    truck.add(frontMirrorGroup);


    // 8. Räder & Kotflügel (265/70R17.5: Ø=815mm, r=0.408m, Breite=265mm)
    const tireRadius = 0.408;
    const tireWidth = 0.265;
    const rimRadius = 0.222; // 17.5" / 2
    const wheelGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 32);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth + 0.02, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, tireWidth + 0.04, 16);
    hubGeo.rotateZ(Math.PI / 2);

    const wheels: THREE.Group[] = [];
    const createWheel = (x: number, y: number, z: number, isRear = false) => {
      const wGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, plasticMat); 
      const rim = new THREE.Mesh(rimGeo, rimMat);
      if (isRear) {
        rim.scale.set(1, 0.6, 1); 
      }
      const hub = new THREE.Mesh(hubGeo, plasticMat);
      
      wGroup.add(tire, rim, hub);
      wGroup.position.set(x, y, z);
      tire.castShadow = true;
      wheels.push(wGroup);
      return wGroup;
    };

    // Front Axle
    truck.add(createWheel(1.1, tireRadius, frontAxleZ));
    truck.add(createWheel(-1.1, tireRadius, frontAxleZ));
    // Rear Axle (Very far back)
    truck.add(createWheel(1.1, tireRadius, rearAxleZ, true));
    truck.add(createWheel(-1.1, tireRadius, rearAxleZ, true));
    // =========================================================================
    // 🛞 Subagent 22.11: `truck_front_wheel_arch` - VORDERER RADKASTEN NACH BLUEPRINT
    // =========================================================================
    
    // 1. Aerodynamischer Außen-Kotflügelbogen (Flared Outer Arch Lip)
    const archLipShape = new THREE.Shape();
    archLipShape.absarc(0, 0, 0.55, 0, Math.PI, false);
    archLipShape.absarc(0, 0, 0.46, Math.PI, 0, true);
    archLipShape.closePath();

    const archLipGeo = new THREE.ExtrudeGeometry(archLipShape, { 
      depth: 0.12, 
      bevelEnabled: true, 
      bevelThickness: 0.015, 
      bevelSize: 0.015, 
      bevelSegments: 2 
    });
    archLipGeo.rotateY(Math.PI / 2);

    // 2. Hintere Kotflügelschwinge (Rear Fender Wing)
    const rearWingGeo = new RoundedBoxGeometry(0.12, 0.38, 0.14, 2, 0.02);

    // 3. Runder Reflektor / Seitenmarkierung auf der hinteren Schwinge
    const sideMarkerGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16);
    sideMarkerGeo.rotateZ(Math.PI / 2);
    const sideMarkerMat = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 1.8, roughness: 0.2 });

    // 4. Schmutzfänger (Mudflap)
    const frontMudflapGeo = new THREE.BoxGeometry(0.025, 0.24, 0.26);

    // 5. Radkasten-Innenschale (Wheelhouse Splash Liner)
    const innerArchGeo = new THREE.CylinderGeometry(0.49, 0.49, 0.24, 24, 1, false, 0, Math.PI);
    innerArchGeo.rotateZ(Math.PI / 2);

    // 6. Einstiegswanne & Stufen (Cab Entry Step Housing & Treads)
    const stepHousingGeo = new RoundedBoxGeometry(0.20, 0.36, 0.46, 2, 0.02);
    const stepPlateGeo = new THREE.BoxGeometry(0.18, 0.035, 0.38);

    // 7. Horizontale LED-Blinkerleiste an der Türeinstiegskante
    const ledStripGeo = new THREE.BoxGeometry(0.025, 0.032, 0.42);
    const ledStripMat = new THREE.MeshStandardMaterial({ color: '#ffaa00', emissive: '#ff8800', emissiveIntensity: 2.2, roughness: 0.1 });

    const createFrontWheelArch = (side: 'left' | 'right') => {
      const group = new THREE.Group();
      const s = side === 'left' ? 1 : -1;

      // 1. Äußerer Kotflügelbogen in Fahrerhauslackierung
      const archLipMesh = new THREE.Mesh(archLipGeo, paintMat);
      if (side === 'left') {
        archLipMesh.position.set(1.10, 0.41, frontAxleZ);
      } else {
        archLipMesh.position.set(-1.10, 0.41, frontAxleZ);
        archLipMesh.scale.set(-1, 1, 1);
      }
      group.add(archLipMesh);

      // 2. Hintere Kotflügelschwinge
      const rearWing = new THREE.Mesh(rearWingGeo, paintMat);
      rearWing.position.set(1.16 * s, 0.36, frontAxleZ - 0.52);
      group.add(rearWing);

      // 3. Runder Seitenblinker auf der Schwinge
      const marker = new THREE.Mesh(sideMarkerGeo, sideMarkerMat);
      marker.position.set(1.23 * s, 0.44, frontAxleZ - 0.52);
      group.add(marker);

      // 4. Schmutzfänger
      const frontMudflap = new THREE.Mesh(frontMudflapGeo, plasticMat);
      frontMudflap.position.set(1.12 * s, 0.14, frontAxleZ - 0.52);
      group.add(frontMudflap);

      // 5. Innenschale im Radhaus
      const innerArch = new THREE.Mesh(innerArchGeo, darkTrimMat);
      innerArch.position.set(0.86 * s, 0.41, frontAxleZ);
      group.add(innerArch);

      // 6. Einstiegskasten & Trittstufen
      const stepHousing = new THREE.Mesh(stepHousingGeo, darkTrimMat);
      stepHousing.position.set(1.04 * s, 0.46, 2.66);
      const lowerStep = new THREE.Mesh(stepPlateGeo, silverMat);
      lowerStep.position.set(1.08 * s, 0.40, 2.66);
      const upperStep = new THREE.Mesh(stepPlateGeo, silverMat);
      upperStep.position.set(1.02 * s, 0.70, 2.66);
      group.add(stepHousing, lowerStep, upperStep);

      // 7. Horizontale LED-Blinkerleiste
      const ledStrip = new THREE.Mesh(ledStripGeo, ledStripMat);
      ledStrip.position.set(1.21 * s, 0.86, 2.66);
      group.add(ledStrip);

      return group;
    };
    truck.add(createFrontWheelArch('left'));
    truck.add(createFrontWheelArch('right'));

    // Kotflügel Rear (Standard semi-circles)
    const mudguardRearGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 16, 1, false, 0, Math.PI);
    mudguardRearGeo.rotateZ(Math.PI / 2);
    const createRearMudguard = (x: number, y: number, z: number) => {
      const mud = new THREE.Mesh(mudguardRearGeo, plasticMat);
      mud.position.set(x, y, z);
      return mud;
    };
    truck.add(createRearMudguard(1.1, 0.45, rearAxleZ));
    truck.add(createRearMudguard(-1.1, 0.45, rearAxleZ));

    // 9. PBR Asphalt-Boden & Grand Prix Rennstrecken-Engine (Subagent 22.14: truck_race_tracks)
    const asphaltColorTex = createAsphaltTexture();
    asphaltColorTex.repeat.set(180, 180);
    const asphaltBumpTex = createAsphaltBumpTexture();
    asphaltBumpTex.repeat.set(180, 180);

    const planeGeo = new THREE.PlaneGeometry(1800, 1800, 32, 32);
    const planeMat = new THREE.MeshStandardMaterial({ 
      color: '#242930', 
      map: asphaltColorTex,
      bumpMap: asphaltBumpTex,
      bumpScale: 0.022,
      roughness: 0.88, 
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: 3,
      polygonOffsetUnits: 3
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.y = -0.01;
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // 9.1 Initialen Grand Prix Circuit aufbauen
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

    truck.rotation.y = 0;
    truck.position.set(0, 0, 0);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

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

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Delta-Time Normalisierung für 60Hz / 120Hz / 144Hz (Säule 1.2)
      const delta = Math.min(clock.getDelta(), 0.1);

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
      const targetSpeedKmh = drivingRef.current ? Math.max(24.0, sector.speedTarget - curvature * 360.0) : 0.0;
      const targetSpeedMps = targetSpeedKmh / 3.6;
      const accelRate = (targetSpeedMps > currentSpeed) ? 1.8 : 3.8; // Bremsen greift dynamischer als Beschleunigen
      const prevSpeed = currentSpeed;
      currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeedMps, 1 - Math.exp(-accelRate * delta));
      const currentAccel = (currentSpeed - prevSpeed) / Math.max(delta, 0.001); // m/s^2

      // Reale gefahrene Distanz & Streckenfortschritt trackU (Exakte physikalische Geschwindigkeit)
      const distanceTravelled = currentSpeed * delta;
      trackU = (trackU + distanceTravelled / splineLength) % 1.0;

      // 1. Nick-Dynamik (Chassis Pitch + 3D-Geländeneigung)
      const targetPitch = THREE.MathUtils.clamp(-currentAccel * 0.008, -0.045, 0.065);
      currentPitch = THREE.MathUtils.lerp(currentPitch, targetPitch, 1 - Math.exp(-8.0 * delta));

      // 2. Wank-Dynamik (Chassis Roll: 12t Kofferaufbau neigt sich durch Fliehkraft in Kurven)
      const lateralAccel = (currentSpeed * currentSpeed) * (dHeading / lookaheadMeters); // m/s^2
      const targetRoll = THREE.MathUtils.clamp(-lateralAccel * 0.007, -0.065, 0.065);
      currentRoll = THREE.MathUtils.lerp(currentRoll, targetRoll, 1 - Math.exp(-6.0 * delta));

      // 3. Fahrbahn-Rumpeln & 6-Zylinder Diesel Motorvibration
      const roadVibe = (currentSpeed > 0.1) ? (Math.sin(clock.getElapsedTime() * 45.0) * 0.0025 + Math.cos(clock.getElapsedTime() * 85.0) * 0.0012) * Math.min(1.0, currentSpeed / 20.0) : 0;
      const engineIdle = Math.sin(clock.getElapsedTime() * 22.0) * 0.0008;

      truck.position.x = x;
      truck.position.y = y + roadVibe + engineIdle;
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

      if (telemetrySpeedRef.current) {
        telemetrySpeedRef.current.textContent = `${speedKmh.toFixed(1)} km/h`;
      }
      if (telemetrySpeedBarRef.current) {
        telemetrySpeedBarRef.current.style.width = `${Math.min(100, (speedKmh / 90) * 100)}%`;
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
        telemetryRpmBarRef.current.style.width = `${Math.min(100, Math.max(5, ((rpm - 600) / 1600) * 100))}%`;
      }
      if (telemetryGearRef.current) {
        telemetryGearRef.current.textContent = gearName;
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
          telemetryDrsRef.current.textContent = sector.drsZone;
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

      const elapsedTime = clock.getElapsedTime();

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
        const targetPose = calculateTruckCameraPose(effectiveCam, _truckPosScratch, heading, elapsedTime);

        if (isCut) {
          // ⚡ ECHTER BROADCAST-SCHNITT: 1-Frame Hard Cut (Keine interpolierende Kamerafahrt)
          camera.position.copy(targetPose.position);
          controls.target.copy(targetPose.target);
          camera.fov = targetPose.fov;
          camera.updateProjectionMatrix();
          camera.lookAt(controls.target);
        } else {
          // Innerhalb der laufenden Einstellung:
          // Cockpit, Spiegel, Radkasten, Front-Hero & Heck sind starr am LKW montiert (Zero-Lag)
          if (
            effectiveCam === 'cockpit' ||
            effectiveCam === 'wheel' ||
            effectiveCam === 'side_mirror' ||
            effectiveCam === 'front_hero' ||
            effectiveCam === 'tailgate'
          ) {
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
      
      grillTex.dispose();
      plateTex.dispose();
      hlTex.dispose();
      tglBadgeTex.dispose();
      dashTex.dispose();
      windshieldTex.dispose();
      kofferSideTex.dispose();
      tailLiftTex.dispose();
      rearLightTexL.dispose();
      rearLightTexR.dispose();
      sideMarkerTex.dispose();
      asphaltColorTex.dispose();
      asphaltBumpTex.dispose();

      currentCircuitResult.disposables.geometries.forEach(g => g.dispose());
      currentCircuitResult.disposables.materials.forEach(m => m.dispose());
      currentCircuitResult.disposables.textures.forEach(t => t.dispose());
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
      
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
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: isDriving ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
            color: isDriving ? '#2ecc71' : '#e74c3c',
            border: isDriving ? '1px solid #2ecc71' : '1px solid #e74c3c'
          }}>
            {isDriving ? '● DRIVING' : '○ IDLE'}
          </span>
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
            <span ref={telemetrySectorRef} style={{ color: '#00dcff', fontWeight: 800, fontSize: 11, letterSpacing: 0.3 }}>
              HAMILTON STRAIGHT
            </span>
            <div ref={telemetryF1Ref} style={{ color: '#94a3b8', fontSize: 8, fontWeight: 600, fontFamily: 'monospace', marginTop: 2 }}>
              F1 REF: 290 km/h • GANG 7 • 1.0 G
            </div>
          </div>
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

      {/* 🎬 Subagent 20: Broadcast-Kamera-Regie Leiste (Oben Mitte) */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        zIndex: 50, userSelect: 'none', pointerEvents: 'auto'
      }}>
        {/* Live Tally / Director Info Badge */}
        <div 
          ref={directorBadgeRef}
          style={{
            background: activeCam === 'auto_director' ? 'rgba(231, 76, 60, 0.85)' : 'rgba(15, 23, 42, 0.85)',
            border: activeCam === 'auto_director' ? '1px solid #e74c3c' : '1px solid rgba(0, 220, 255, 0.3)',
            borderRadius: 20, padding: '4px 14px',
            color: '#ffffff', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700,
            boxShadow: activeCam === 'auto_director' ? '0 0 16px rgba(231, 76, 60, 0.6)' : '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)', letterSpacing: 0.5,
            transition: 'all 0.2s'
          }}
        >
          {activeCam === 'auto_director' ? '● ON AIR [AUTO-REGIE] • Intelligenter TV-Schnitt aktiv' : `🎥 KAMERA: ${TRUCK_CAMERA_PRESETS[activeCam]?.name?.toUpperCase()}`}
        </div>

        {/* Camera Preset Switcher Bar */}
        <div style={{
          display: 'flex', gap: 4, background: 'rgba(10, 15, 25, 0.85)',
          padding: '4px 6px', borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          {(Object.keys(TRUCK_CAMERA_PRESETS) as TruckCameraPresetId[]).map((presetKey) => {
            const preset = TRUCK_CAMERA_PRESETS[presetKey];
            const isCurrent = activeCam === presetKey;
            return (
              <button
                key={presetKey}
                onClick={() => {
                  setActiveCam(presetKey);
                  activeCamRef.current = presetKey;
                  effectiveCamRef.current = presetKey;
                  timeInShotRef.current = 0;
                }}
                title={preset.desc}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 10px', borderRadius: 6,
                  border: isCurrent ? '1px solid #00dcff' : '1px solid transparent',
                  background: isCurrent ? 'rgba(0, 220, 255, 0.25)' : 'transparent',
                  color: isCurrent ? '#00dcff' : '#cbd5e1',
                  fontFamily: '"Inter", sans-serif', fontSize: 11, fontWeight: isCurrent ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: isCurrent ? '0 0 10px rgba(0, 220, 255, 0.3)' : 'none'
                }}
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </button>
            );
          })}
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
