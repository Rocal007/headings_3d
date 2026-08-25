import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  createGrillTexture,
  createRibbedTexture,
  createHeadlightTexture,
  createDashboardTexture,
  createWindshieldTexture,
  createCurvedWindshieldGeometry,
  createTailLiftTexture,
  createKofferSideTexture,
} from '../materials/truckTextures';

export type TruckStudioCameraId = 'orbit' | 'cockpit' | 'hero' | 'tailgate' | 'side';

export interface TruckStudioCameraPreset {
  id: TruckStudioCameraId;
  name: string;
  icon: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export const TRUCK_STUDIO_CAMERAS: Record<TruckStudioCameraId, TruckStudioCameraPreset> = {
  orbit: {
    id: 'orbit',
    name: '360° Studio Orbit (Frei)',
    icon: '🌟',
    position: new THREE.Vector3(14, 5.5, 14),
    target: new THREE.Vector3(0, 1.8, 0),
    fov: 45,
  },
  hero: {
    id: 'hero',
    name: 'Front 3/4 Hero Shot',
    icon: '👑',
    position: new THREE.Vector3(7.5, 2.6, 9.5),
    target: new THREE.Vector3(0, 1.8, 2.5),
    fov: 38,
  },
  cockpit: {
    id: 'cockpit',
    name: 'Fahrerkabine & Cockpit',
    icon: '💺',
    position: new THREE.Vector3(0.62, 2.38, 3.45),
    target: new THREE.Vector3(0.62, 2.15, 6.5),
    fov: 65,
  },
  tailgate: {
    id: 'tailgate',
    name: 'Ladebordwand & Frachtraum',
    icon: '📦',
    position: new THREE.Vector3(0, 2.4, -9.5),
    target: new THREE.Vector3(0, 1.6, -2.5),
    fov: 42,
  },
  side: {
    id: 'side',
    name: 'Seitenprofil (5550mm Radstand)',
    icon: '🪟',
    position: new THREE.Vector3(15, 2.2, 0),
    target: new THREE.Vector3(0, 1.8, 0),
    fov: 35,
  },
};

export default function Truck({ onOpenRace }: { onOpenRace?: () => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [doorsOpen, setDoorsOpen] = useState(false);
  const [tailgateOpen, setTailgateOpen] = useState(false);
  const [platformLowered, setPlatformLowered] = useState(false);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [wipersActive, setWipersActive] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeCam, setActiveCam] = useState<TruckStudioCameraId>('orbit');

  const doorsRef = useRef(false);
  const tailgateRef = useRef(false);
  const platformLoweredRef = useRef(false);
  const headlightsRef = useRef(true);
  const wipersRef = useRef(false);
  const autoRotateRef = useRef(false);
  const activeCamRef = useRef<TruckStudioCameraId>('orbit');

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0e14');

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.2, 1000);
    camera.position.set(14, 5.5, 14);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
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
    controls.target.set(0, 1.8, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Nicht unter den Boden blicken
    controls.minDistance = 2.0;
    controls.maxDistance = 45.0;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // 🌟 Showroom Studio Floor: Luxuriöser Drehteller mit konzentrischen Ringen & Kontaktschatten
    const studioFloorGroup = new THREE.Group();
    
    // Haupt-Bodenplatte
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0d1117',
      roughness: 0.82,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    studioFloorGroup.add(floorMesh);

    // Drehteller-Plattform (Turntable Platform Ø 18m)
    const turntableGeo = new THREE.CylinderGeometry(9.0, 9.2, 0.08, 64);
    const turntableMat = new THREE.MeshStandardMaterial({
      color: '#161c24',
      roughness: 0.45,
      metalness: 0.55,
    });
    const turntableMesh = new THREE.Mesh(turntableGeo, turntableMat);
    turntableMesh.position.y = 0.04;
    turntableMesh.receiveShadow = true;
    studioFloorGroup.add(turntableMesh);

    // Gebürsteter Aluminium-Außenring am Drehteller
    const ringGeo = new THREE.RingGeometry(8.95, 9.15, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#00dcff',
      emissive: '#00dcff',
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.082;
    studioFloorGroup.add(ringMesh);

    // Subtile konzentrische Linien & Studio Grid
    const innerRingGeo = new THREE.RingGeometry(4.5, 4.54, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: '#2a3b4c', side: THREE.DoubleSide });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.rotation.x = -Math.PI / 2;
    innerRingMesh.position.y = 0.082;
    studioFloorGroup.add(innerRingMesh);

    scene.add(studioFloorGroup);

    // 💡 3-Point Showroom Beleuchtung
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.4);
    keyLight.position.set(15, 24, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0002;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa5c4e8, 1.4);
    fillLight.position.set(-18, 18, -12);
    scene.add(fillLight);

    const overheadRimLight = new THREE.DirectionalLight(0xffffff, 1.6);
    overheadRimLight.position.set(0, 32, -15);
    scene.add(overheadRimLight);

    // Spotlights für Scheinwerfer-Glow & Bodenakzente
    const floorSpot = new THREE.SpotLight(0x00dcff, 3.5, 30, Math.PI / 4, 0.4);
    floorSpot.position.set(0, 18, 0);
    floorSpot.target.position.set(0, 0, 0);
    scene.add(floorSpot, floorSpot.target);

    // =========================================================================
    // 🚚 MAN TGL 12.250 3D FAHRZEUG-AUFBAU (Subagenten 22.1 - 22.13)
    // =========================================================================
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
    const rimMat = new THREE.MeshStandardMaterial({ color: '#b0b8c0', roughness: 0.3, metalness: 0.8 });
    const seatFabricMat = new THREE.MeshStandardMaterial({ color: '#272c35', roughness: 0.92, metalness: 0.02 });
    
    const grillTex = createGrillTexture();
    const hlTex = createHeadlightTexture();
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
    
    const tailLiftTex = createTailLiftTexture();
    const tailLiftMat = new THREE.MeshStandardMaterial({ map: tailLiftTex, roughness: 0.4, metalness: 0.1 });
    const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
    const kofferMaterials = [boxSideMat, boxSideMat, boxMat, boxMat, boxMat, invisibleMat]; 

    const kofferLength = 8.25;
    const kofferWidth = 2.57;
    const kofferHeight = 2.68;
    const loadEdgeHeight = 1.02;
    const kofferY = loadEdgeHeight + kofferHeight / 2;
    const wheelbase = 5.55;
    const frontAxleZ = 3.5;
    const rearAxleZ = frontAxleZ - wheelbase;
    const kofferFrontZ = frontAxleZ - 1.2;
    const kofferZ = kofferFrontZ - kofferLength / 2;

    const kofferBackZ = kofferZ - kofferLength / 2;
    const chassisLength = 3.5 - kofferBackZ;
    const chassisCenterZ = kofferBackZ + chassisLength / 2;

    // 1. Leiterrahmen & Unterbau
    const chassisRailGeo = new THREE.BoxGeometry(0.12, 0.28, chassisLength);
    const leftRail = new THREE.Mesh(chassisRailGeo, chassisMat);
    leftRail.position.set(0.43, 0.72, chassisCenterZ);
    const rightRail = new THREE.Mesh(chassisRailGeo, chassisMat);
    rightRail.position.set(-0.43, 0.72, chassisCenterZ);
    truck.add(leftRail, rightRail);

    const crossMemberGeo = new THREE.BoxGeometry(0.74, 0.14, 0.12);
    for (let z = kofferBackZ + 0.5; z <= 3.2; z += 1.3) {
      const cross = new THREE.Mesh(crossMemberGeo, chassisMat);
      cross.position.set(0, 0.72, z);
      truck.add(cross);
    }

    // 2. Kofferaufbau (Subagent 22.3)
    const kofferOuter = new THREE.Mesh(new THREE.BoxGeometry(kofferWidth, kofferHeight, kofferLength), kofferMaterials);
    kofferOuter.position.set(0, kofferY, kofferZ);
    kofferOuter.castShadow = true;
    kofferOuter.receiveShadow = true;
    truck.add(kofferOuter);

    const wallThickness = 0.06;
    const floorThickness = 0.10;
    const woodFloorTex = createRibbedTexture();
    const woodFloorMat = new THREE.MeshStandardMaterial({ map: woodFloorTex, roughness: 0.8, bumpScale: 0.05 });

    const kofferFloor = new THREE.Mesh(new THREE.BoxGeometry(kofferWidth - 2 * wallThickness, floorThickness, kofferLength - wallThickness), woodFloorMat);
    kofferFloor.position.set(0, loadEdgeHeight + floorThickness / 2, kofferZ + wallThickness / 2);
    kofferFloor.receiveShadow = true;
    truck.add(kofferFloor);

    // 3. Supertechno 50 Flightcase-Beladung im Koffer (Subagent 22.5)
    const cargoGroup = new THREE.Group();
    cargoGroup.position.set(0, loadEdgeHeight + floorThickness, kofferZ);
    
    const flightcaseMat = new THREE.MeshStandardMaterial({ color: '#1a1f26', roughness: 0.6, metalness: 0.3 });
    const aluEdgeMat = new THREE.MeshStandardMaterial({ color: '#c0c8d0', roughness: 0.25, metalness: 0.85 });
    
    const mainBox = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.2, 5.2, 3, 0.04), flightcaseMat);
    mainBox.position.set(0, 0.6, 0.3);
    mainBox.castShadow = true;
    const boxAlu = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 5.22), aluEdgeMat);
    boxAlu.position.set(0, 0.6, 0.3);
    cargoGroup.add(mainBox, boxAlu);
    truck.add(cargoGroup);

    // 4. Ladebordwand Kinematik (Subagent 22.10)
    const tailgateHinge = new THREE.Group();
    tailgateHinge.position.set(0, loadEdgeHeight, kofferBackZ);
    
    const tailgatePlatform = new THREE.Group();
    const tailgatePlateGeo = new THREE.BoxGeometry(kofferWidth - 0.04, 0.08, 2.15);
    const tailgatePlate = new THREE.Mesh(tailgatePlateGeo, tailLiftMat);
    tailgatePlate.position.set(0, 0.04, -1.075);
    tailgatePlate.castShadow = true;
    tailgatePlatform.add(tailgatePlate);
    tailgateHinge.add(tailgatePlatform);
    truck.add(tailgateHinge);

    // 5. MAN Fahrerkabine & Cockpit (Subagent 22.1)
    const cabinGroup = new THREE.Group();
    const cabinWidth = 2.34;
    const cabinHeight = 2.15;
    const cabinLength = 2.18;
    const cabinBottomY = 1.08;
    const cabinCenterZ = 4.22;

    const cabinMainGeo = new RoundedBoxGeometry(cabinWidth, cabinHeight, cabinLength, 4, 0.08);
    const cabinMain = new THREE.Mesh(cabinMainGeo, paintMat);
    cabinMain.position.set(0, cabinBottomY + cabinHeight / 2, cabinCenterZ);
    cabinMain.castShadow = true;
    cabinGroup.add(cabinMain);

    // Grill & MAN Emblem
    const grillMesh = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.88, 0.12), grillMaterials);
    grillMesh.position.set(0, 1.52, 5.32);
    cabinGroup.add(grillMesh);

    // Windschutzscheibe
    const windshieldGeo = createCurvedWindshieldGeometry(2.18, 1.12, 0.18, 16);
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
    windshield.position.set(0, 2.52, 5.08);
    cabinGroup.add(windshield);

    // Cockpit Innenraum
    const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.55, 0.65), dashMat);
    dashMesh.position.set(0, 2.12, 4.65);
    cabinGroup.add(dashMesh);

    const seatL = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.85, 0.58, 3, 0.05), seatFabricMat);
    seatL.position.set(0.62, 1.85, 3.85);
    const seatR = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.85, 0.58, 3, 0.05), seatFabricMat);
    seatR.position.set(-0.62, 1.85, 3.85);
    cabinGroup.add(seatL, seatR);

    truck.add(cabinGroup);

    // 6. Fahrertüren Hinge-Kinematik (Subagent 22.9)
    const doorGeo = new RoundedBoxGeometry(0.14, 1.62, 1.35, 3, 0.04);
    const leftDoorGroup = new THREE.Group();
    leftDoorGroup.position.set(1.16, 1.08, 4.85);
    const leftDoorPanel = new THREE.Mesh(doorGeo, paintMat);
    leftDoorPanel.position.set(0, 0.81, -0.675);
    leftDoorGroup.add(leftDoorPanel);

    const rightDoorGroup = new THREE.Group();
    rightDoorGroup.position.set(-1.16, 1.08, 4.85);
    const rightDoorPanel = new THREE.Mesh(doorGeo, paintMat);
    rightDoorPanel.position.set(0, 0.81, -0.675);
    rightDoorGroup.add(rightDoorPanel);

    truck.add(leftDoorGroup, rightDoorGroup);

    // 7. Räder & Fahrwerk (265/70R17.5: r=0.408m)
    const tireRadius = 0.408;
    const tireWidth = 0.265;
    const rimRadius = 0.222;
    const wheelGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 32);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth + 0.02, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const createWheel = (x: number, y: number, z: number, isRear = false) => {
      const wGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, plasticMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, rimMat);
      if (isRear) rim.scale.set(1, 0.6, 1);
      wGroup.add(tire, rim);
      wGroup.position.set(x, y, z);
      return wGroup;
    };

    truck.add(createWheel(1.1, tireRadius, frontAxleZ));
    truck.add(createWheel(-1.1, tireRadius, frontAxleZ));
    truck.add(createWheel(1.1, tireRadius, rearAxleZ, true));
    truck.add(createWheel(-1.1, tireRadius, rearAxleZ, true));

    // 8. Scheinwerfer & Spotlights (Subagent 22.13)
    const hlGeo = new THREE.BoxGeometry(0.38, 0.22, 0.08);
    const hlMat = new THREE.MeshStandardMaterial({ map: hlTex, roughness: 0.2, emissive: '#ffffff', emissiveIntensity: 2.2 });
    const hlL = new THREE.Mesh(hlGeo, hlMat);
    hlL.position.set(0.82, 1.25, 5.34);
    const hlR = new THREE.Mesh(hlGeo, hlMat);
    hlR.position.set(-0.82, 1.25, 5.34);
    truck.add(hlL, hlR);

    const spotlightL = new THREE.SpotLight(0xffffff, 4.5, 35, Math.PI / 6, 0.35);
    spotlightL.position.set(0.82, 1.25, 5.35);
    spotlightL.target.position.set(0.82, 0.2, 25);
    const spotlightR = new THREE.SpotLight(0xffffff, 4.5, 35, Math.PI / 6, 0.35);
    spotlightR.position.set(-0.82, 1.25, 5.35);
    spotlightR.target.position.set(-0.82, 0.2, 25);
    truck.add(spotlightL, spotlightL.target, spotlightR, spotlightR.target);

    // Scheibenwischer
    const wiperGeo = new THREE.BoxGeometry(0.02, 0.48, 0.02);
    const wiperL = new THREE.Mesh(wiperGeo, darkTrimMat);
    wiperL.position.set(0.35, 2.05, 5.22);
    const wiperR = new THREE.Mesh(wiperGeo, darkTrimMat);
    wiperR.position.set(-0.35, 2.05, 5.22);
    truck.add(wiperL, wiperR);

    // =========================================================================
    // 🔄 RENDER-LOOP MIT SMOOTH KINEMATIK
    // =========================================================================
    let animationId: number;
    let flapProgress = 0;
    let lowerProgress = 0;
    const clock = new THREE.Clock();

    const handleResize = () => {
      if (!canvasRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // 1. Auto-Rotate Drehteller
      if (autoRotateRef.current) {
        truck.rotation.y += 0.25 * delta;
      }

      // 2. Fahrertüren Kinematik
      const targetDoorAngle = doorsRef.current ? 1.18 : 0.0;
      leftDoorGroup.rotation.y = THREE.MathUtils.lerp(leftDoorGroup.rotation.y, targetDoorAngle, 1 - Math.exp(-6.0 * delta));
      rightDoorGroup.rotation.y = THREE.MathUtils.lerp(rightDoorGroup.rotation.y, -targetDoorAngle, 1 - Math.exp(-6.0 * delta));

      // 3. Ladebordwand 2-Stufen-Kinematik
      const targetFlap = tailgateRef.current ? 1.0 : 0.0;
      flapProgress = THREE.MathUtils.lerp(flapProgress, targetFlap, 1 - Math.exp(-4.5 * delta));
      tailgateHinge.rotation.x = flapProgress * (Math.PI / 2);

      const targetLower = platformLoweredRef.current ? 1.0 : 0.0;
      lowerProgress = THREE.MathUtils.lerp(lowerProgress, targetLower, 1 - Math.exp(-3.5 * delta));
      tailgatePlatform.position.y = -lowerProgress * (loadEdgeHeight - 0.06);

      // 4. Scheinwerfer & Licht
      const isLights = headlightsRef.current;
      hlMat.emissiveIntensity = isLights ? 2.8 : 0.0;
      spotlightL.intensity = isLights ? 5.5 : 0.0;
      spotlightR.intensity = isLights ? 5.5 : 0.0;

      // 5. Scheibenwischer Kinematik
      if (wipersRef.current) {
        const wiperSweep = (Math.sin(elapsedTime * 8.0) * 0.5 + 0.5) * 1.15;
        wiperL.rotation.z = -0.3 + wiperSweep;
        wiperR.rotation.z = -0.3 + wiperSweep;
      } else {
        wiperL.rotation.z = THREE.MathUtils.lerp(wiperL.rotation.z, -0.3, 1 - Math.exp(-6.0 * delta));
        wiperR.rotation.z = THREE.MathUtils.lerp(wiperR.rotation.z, -0.3, 1 - Math.exp(-6.0 * delta));
      }

      // 6. Kamera-Fokus bei Preset-Umschaltung
      const activePreset = TRUCK_STUDIO_CAMERAS[activeCamRef.current];
      if (activeCamRef.current !== 'orbit') {
        const camDamp = 1 - Math.exp(-5.0 * delta);
        camera.position.lerp(activePreset.position, camDamp);
        controls.target.lerp(activePreset.target, camDamp);
        if (Math.abs(camera.fov - activePreset.fov) > 0.2) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, activePreset.fov, camDamp);
          camera.updateProjectionMatrix();
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      pmremGenerator.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none' }} />

      {/* 🌟 Showroom Header & Navigation */}
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 50,
        display: 'flex', gap: 10, alignItems: 'center'
      }}>
        {onOpenRace && (
          <button
            onClick={onOpenRace}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 12,
              fontFamily: '"Inter", sans-serif',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(236, 72, 153, 0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            🏎️ Zu Grand Prix Rennen
          </button>
        )}
      </div>

      {/* 📡 Studio Showroom Info & Specs Card (Rechts Oben) */}
      <div style={{
        position: 'absolute', top: 20, right: 20, width: 300,
        background: 'rgba(13, 17, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 220, 255, 0.25)',
        borderRadius: 12,
        padding: '16px',
        color: '#ffffff',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        pointerEvents: 'auto',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,220,255,0.2)', paddingBottom: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🚚</span>
            <span style={{ fontWeight: 800, color: '#00dcff', fontSize: 12, letterSpacing: 0.8 }}>MAN TGL SHOWROOM</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(0, 220, 255, 0.15)', color: '#00dcff', border: '1px solid rgba(0, 220, 255, 0.3)' }}>
            STUDIO 3D
          </span>
        </div>

        {/* Specs Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: '#cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>MODELL:</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>MAN TGL 12.250 4x2 BL</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>MOTOR:</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>D0836 • 6-Zyl. Bi-Turbo</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>LEISTUNG:</span>
            <span style={{ fontWeight: 700, color: '#ffd700' }}>250 PS / 184 kW • 1050 Nm</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>RADSTAND:</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>5.550 mm</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>KOFFERAUFBAU:</span>
            <span style={{ fontWeight: 700, color: '#00dcff' }}>8.050 × 2.470 × 2.580 mm</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>PAYLOAD:</span>
            <span style={{ fontWeight: 700, color: '#2ecc71' }}>Supertechno 50 Flightcase-Kran</span>
          </div>
        </div>

        {/* 📷 Kamera-Perspektiven Dropdown */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#8899aa', fontSize: 8.5, fontWeight: 700, marginBottom: 5 }}>📷 KAMERA-PERSPEKTIVE:</div>
          <select
            value={activeCam}
            onChange={(e) => {
              const camId = e.target.value as TruckStudioCameraId;
              setActiveCam(camId);
              activeCamRef.current = camId;
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(0, 220, 255, 0.3)',
              background: 'rgba(10, 15, 25, 0.95)',
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {(Object.keys(TRUCK_STUDIO_CAMERAS) as TruckStudioCameraId[]).map((camKey) => {
              const preset = TRUCK_STUDIO_CAMERAS[camKey];
              return (
                <option key={camKey} value={camKey} style={{ background: '#0b0f19', color: '#ffffff' }}>
                  {preset.icon} {preset.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* 🎮 Showroom Interaktive Steuerungsleiste (Unten Mitte) */}
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'auto',
        background: 'rgba(10, 15, 25, 0.85)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        zIndex: 50
      }}>
        <button
          onClick={() => {
            const next = !doorsOpen;
            setDoorsOpen(next);
            doorsRef.current = next;
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: doorsOpen ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
            background: doorsOpen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.06)',
            color: doorsOpen ? '#38bdf8' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          🚪 {doorsOpen ? 'Türen Schließen' : 'Türen Öffnen'}
        </button>

        <button
          onClick={() => {
            if (!tailgateOpen) {
              setTailgateOpen(true);
              tailgateRef.current = true;
            } else if (!platformLowered) {
              setPlatformLowered(true);
              platformLoweredRef.current = true;
            } else {
              setPlatformLowered(false);
              platformLoweredRef.current = false;
              setTailgateOpen(false);
              tailgateRef.current = false;
            }
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: tailgateOpen ? '1px solid #2ecc71' : '1px solid rgba(255,255,255,0.15)',
            background: tailgateOpen ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255,255,255,0.06)',
            color: tailgateOpen ? '#2ecc71' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          📦 {!tailgateOpen ? 'Ladebordwand Öffnen' : !platformLowered ? 'Plattform Absenken' : 'Ladebordwand Schließen'}
        </button>

        <button
          onClick={() => {
            const next = !headlightsOn;
            setHeadlightsOn(next);
            headlightsRef.current = next;
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: headlightsOn ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.15)',
            background: headlightsOn ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255,255,255,0.06)',
            color: headlightsOn ? '#ffd700' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          💡 {headlightsOn ? 'Licht: AN' : 'Licht: AUS'}
        </button>

        <button
          onClick={() => {
            const next = !wipersActive;
            setWipersActive(next);
            wipersRef.current = next;
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: wipersActive ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.15)',
            background: wipersActive ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.06)',
            color: wipersActive ? '#c084fc' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          🌧️ {wipersActive ? 'Wischer: AN' : 'Wischer: AUS'}
        </button>

        <button
          onClick={() => {
            const next = !autoRotate;
            setAutoRotate(next);
            autoRotateRef.current = next;
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: autoRotate ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.15)',
            background: autoRotate ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255,255,255,0.06)',
            color: autoRotate ? '#00dcff' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          🔄 {autoRotate ? 'Drehteller: AN' : 'Drehteller: AUS'}
        </button>
      </div>
    </div>
  );
}
