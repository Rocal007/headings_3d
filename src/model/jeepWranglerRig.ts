import * as THREE from 'three';
import { createWranglerTextures } from '../materials/wranglerTextures';

export type WranglerLivery =
  | 'sunburst_orange'
  | 'black_clearcoat'
  | 'flame_red'
  | 'bright_white'
  | 'rescue_green'
  | 'hydro_blue';

export interface WranglerRigOptions {
  livery?: WranglerLivery;
}

export interface JeepWranglerRig {
  jeep: THREE.Group;
  bodyTubGroup: THREE.Group;
  steerFrontLeft: THREE.Group;
  steerFrontRight: THREE.Group;
  allWheels: THREE.Group[];
  doorLPivot: THREE.Group;
  doorRPivot: THREE.Group;
  hoodPivotGroup: THREE.Group;
  windshieldPivotGroup: THREE.Group;
  steeringWheelGroup: THREE.Group;
  headlightL: THREE.SpotLight;
  headlightR: THREE.SpotLight;
  headlightLensMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  bodyPaintMat: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
}

const LIVERY_COLORS: Record<WranglerLivery, string> = {
  sunburst_orange: '#d95d1e',
  black_clearcoat: '#141517',
  flame_red: '#b91c1c',
  bright_white: '#f1f5f9',
  rescue_green: '#47553b',
  hydro_blue: '#0284c7',
};

/**
 * Erzeugt ein hochpräzises, modulares 3D-Rig des 2007 Jeep Wrangler Rubicon JK (2-Door 4x4)
 * mit 100% nativer Three.js Geometrie und sauber entkoppelter 2-Stufen-Kinematik.
 */
export function createJeepWranglerRig(options: WranglerRigOptions = {}): JeepWranglerRig {
  const { livery = 'sunburst_orange' } = options;
  const wranglerTex = createWranglerTextures();
  const collectedTextures: THREE.Texture[] = [
    wranglerTex.grilleMap,
    wranglerTex.rubiconHoodMap,
    wranglerTex.tireTreadMap,
    wranglerTex.spareCoverMap,
    wranglerTex.dashboardMap,
    wranglerTex.trailRatedMap,
    wranglerTex.tailLightMap,
  ];

  const root = new THREE.Group();
  root.name = 'Jeep_Wrangler_Rubicon_2007_Rig';

  // --- Material-Bibliothek ---
  const bodyPaintColor = LIVERY_COLORS[livery] || '#d95d1e';
  const bodyPaintMat = new THREE.MeshStandardMaterial({
    color: bodyPaintColor,
    roughness: 0.25,
    metalness: 0.75,
  });

  const blackMatteMat = new THREE.MeshStandardMaterial({
    color: '#16181b',
    roughness: 0.85,
    metalness: 0.1,
  });

  const darkInteriorMat = new THREE.MeshStandardMaterial({
    color: '#1e2229',
    roughness: 0.9,
    metalness: 0.05,
  });

  const leatherSeatMat = new THREE.MeshStandardMaterial({
    color: '#282c34',
    roughness: 0.7,
    metalness: 0.1,
  });

  const alloyWheelMat = new THREE.MeshStandardMaterial({
    color: '#d4d4d8',
    roughness: 0.2,
    metalness: 0.85,
  });

  const tireRubberMat = new THREE.MeshStandardMaterial({
    color: '#1a1b1e',
    roughness: 0.95,
    metalness: 0.05,
    map: wranglerTex.tireTreadMap,
  });

  const brakeDiscMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.35,
    metalness: 0.9,
  });

  const redCaliperMat = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    roughness: 0.3,
    metalness: 0.4,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0f172a',
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 0.02,
  });

  const headlightLensMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#fff4cc',
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.9,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#dc2626',
    emissiveIntensity: 0.8,
    map: wranglerTex.tailLightMap,
  });

  const amberTurnMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    emissive: '#d97706',
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });

  // --- Abmessungen ---
  const WHEELBASE = 2.424; // 95.4" Radstand
  const TRACK_WIDTH = 1.572; // 61.9" Spurbreite
  const WHEEL_RADIUS = 0.41; // 32" Off-Road Reifen (Radius = 41cm)
  const CHASSIS_Y = 0.42;

  // --- 1. Chassis & Leiterrahmen (Starrachsbauweise) ---
  const chassisGroup = new THREE.Group();
  chassisGroup.name = 'Chassis_Drivetrain';
  root.add(chassisGroup);

  // Leiterrahmen Längsträger (Box Section Steel Rails)
  const railGeo = new THREE.BoxGeometry(0.12, 0.16, 3.8);
  const railL = new THREE.Mesh(railGeo, blackMatteMat);
  railL.position.set(0.48, CHASSIS_Y, 0);
  railL.castShadow = true;
  chassisGroup.add(railL);

  const railR = new THREE.Mesh(railGeo, blackMatteMat);
  railR.position.set(-0.48, CHASSIS_Y, 0);
  railR.castShadow = true;
  chassisGroup.add(railR);

  // Querträger & Skid Plates
  const cross1 = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.12, 0.14), blackMatteMat);
  cross1.position.set(0, CHASSIS_Y, 1.2);
  chassisGroup.add(cross1);

  const cross2 = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.12, 0.14), blackMatteMat);
  cross2.position.set(0, CHASSIS_Y, -1.2);
  chassisGroup.add(cross2);

  // Dana 44 Vorderachse (Solid Axle Tube + Differential Pumpkin)
  const axleFrontGeo = new THREE.CylinderGeometry(0.045, 0.045, TRACK_WIDTH, 16);
  const axleFront = new THREE.Mesh(axleFrontGeo, blackMatteMat);
  axleFront.rotation.z = Math.PI / 2;
  axleFront.position.set(0, WHEEL_RADIUS, WHEELBASE / 2);
  chassisGroup.add(axleFront);

  const diffFront = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), blackMatteMat);
  diffFront.scale.set(1.2, 1.0, 1.3);
  diffFront.position.set(0.18, WHEEL_RADIUS, WHEELBASE / 2);
  chassisGroup.add(diffFront);

  // Dana 44 Hinterachse
  const axleRear = new THREE.Mesh(axleFrontGeo, blackMatteMat);
  axleRear.rotation.z = Math.PI / 2;
  axleRear.position.set(0, WHEEL_RADIUS, -WHEELBASE / 2);
  chassisGroup.add(axleRear);

  const diffRear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), blackMatteMat);
  diffRear.scale.set(1.2, 1.0, 1.3);
  diffRear.position.set(0.18, WHEEL_RADIUS, -WHEELBASE / 2);
  chassisGroup.add(diffRear);

  // Kardanwelle (Driveshaft)
  const driveShaftGeo = new THREE.CylinderGeometry(0.03, 0.03, WHEELBASE - 0.4, 12);
  const driveShaft = new THREE.Mesh(driveShaftGeo, alloyWheelMat);
  driveShaft.rotation.x = Math.PI / 2;
  driveShaft.position.set(0.18, WHEEL_RADIUS + 0.02, 0);
  chassisGroup.add(driveShaft);

  // --- 2. Karosseriewanne & Cockpit (Body Tub) ---
  const bodyTubGroup = new THREE.Group();
  bodyTubGroup.name = 'Body_Tub_Group';
  bodyTubGroup.position.set(0, 0, 0);
  root.add(bodyTubGroup);

  // Untere Karosseriewanne (Hauptkörper)
  const tubMainGeo = new THREE.BoxGeometry(1.64, 0.58, 2.9);
  const tubMain = new THREE.Mesh(tubMainGeo, bodyPaintMat);
  tubMain.position.set(0, 0.78, -0.2);
  tubMain.castShadow = true;
  tubMain.receiveShadow = true;
  bodyTubGroup.add(tubMain);

  // Kotflügelverbreiterungen (Trapezoidal Matte Black Fender Flares)
  const flareFrontGeo = new THREE.BoxGeometry(0.24, 0.14, 0.88);
  const flareFL = new THREE.Mesh(flareFrontGeo, blackMatteMat);
  flareFL.position.set(0.92, 0.78, WHEELBASE / 2);
  flareFL.castShadow = true;
  bodyTubGroup.add(flareFL);

  const flareFR = new THREE.Mesh(flareFrontGeo, blackMatteMat);
  flareFR.position.set(-0.92, 0.78, WHEELBASE / 2);
  flareFR.castShadow = true;
  bodyTubGroup.add(flareFR);

  const flareRearGeo = new THREE.BoxGeometry(0.22, 0.14, 0.84);
  const flareRL = new THREE.Mesh(flareRearGeo, blackMatteMat);
  flareRL.position.set(0.91, 0.78, -WHEELBASE / 2);
  flareRL.castShadow = true;
  bodyTubGroup.add(flareRL);

  const flareRR = new THREE.Mesh(flareRearGeo, blackMatteMat);
  flareRR.position.set(-0.91, 0.78, -WHEELBASE / 2);
  flareRR.castShadow = true;
  bodyTubGroup.add(flareRR);

  // Frontgrille-Maske (7-Slot Grille & Scheinwerfereinfassung)
  const grillePanelGeo = new THREE.BoxGeometry(1.58, 0.54, 0.08);
  const grillePanelMat = new THREE.MeshStandardMaterial({
    color: bodyPaintColor,
    roughness: 0.3,
    metalness: 0.7,
  });
  const grillePanel = new THREE.Mesh(grillePanelGeo, grillePanelMat);
  grillePanel.position.set(0, 0.84, 1.84);
  grillePanel.castShadow = true;
  bodyTubGroup.add(grillePanel);

  // 7-Slot Grille Inlay Canvas
  const grilleInlayGeo = new THREE.PlaneGeometry(1.18, 0.44);
  const grilleInlayMat = new THREE.MeshStandardMaterial({
    map: wranglerTex.grilleMap,
    roughness: 0.8,
    metalness: 0.2,
  });
  const grilleInlay = new THREE.Mesh(grilleInlayGeo, grilleInlayMat);
  grilleInlay.position.set(0, 0.84, 1.885);
  bodyTubGroup.add(grilleInlay);

  // Runde 7" Klarglas-Hauptscheinwerfer
  const headlightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24);
  headlightGeo.rotateX(Math.PI / 2);

  const hlLeftMesh = new THREE.Mesh(headlightGeo, headlightLensMat);
  hlLeftMesh.position.set(0.62, 0.85, 1.88);
  bodyTubGroup.add(hlLeftMesh);

  const hlRightMesh = new THREE.Mesh(headlightGeo, headlightLensMat);
  hlRightMesh.position.set(-0.62, 0.85, 1.88);
  bodyTubGroup.add(hlRightMesh);

  // Blinker (Amber Turn Signals unter den Scheinwerfern)
  const turnGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16);
  turnGeo.rotateX(Math.PI / 2);

  const turnL = new THREE.Mesh(turnGeo, amberTurnMat);
  turnL.position.set(0.62, 0.68, 1.88);
  bodyTubGroup.add(turnL);

  const turnR = new THREE.Mesh(turnGeo, amberTurnMat);
  turnR.position.set(-0.62, 0.68, 1.88);
  bodyTubGroup.add(turnR);

  // Trail Rated 4x4 Plaketten auf den vorderen Kotflügeln
  const badgeGeo = new THREE.CircleGeometry(0.05, 16);
  const badgeMat = new THREE.MeshStandardMaterial({
    map: wranglerTex.trailRatedMap,
    roughness: 0.3,
    metalness: 0.7,
  });
  const badgeL = new THREE.Mesh(badgeGeo, badgeMat);
  badgeL.rotation.y = Math.PI / 2;
  badgeL.position.set(0.825, 0.94, 1.05);
  bodyTubGroup.add(badgeL);

  const badgeR = new THREE.Mesh(badgeGeo, badgeMat);
  badgeR.rotation.y = -Math.PI / 2;
  badgeR.position.set(-0.825, 0.94, 1.05);
  bodyTubGroup.add(badgeR);

  // Frontstoßstange mit Nebelscheinwerfern & Schleppösen
  const bumperFrontGeo = new THREE.BoxGeometry(1.88, 0.18, 0.22);
  const bumperFront = new THREE.Mesh(bumperFrontGeo, blackMatteMat);
  bumperFront.position.set(0, 0.48, 1.98);
  bumperFront.castShadow = true;
  bodyTubGroup.add(bumperFront);

  const fogGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16);
  fogGeo.rotateX(Math.PI / 2);
  const fogL = new THREE.Mesh(fogGeo, headlightLensMat);
  fogL.position.set(0.38, 0.48, 2.10);
  bodyTubGroup.add(fogL);

  const fogR = new THREE.Mesh(fogGeo, headlightLensMat);
  fogR.position.set(-0.38, 0.48, 2.10);
  bodyTubGroup.add(fogR);

  // Heckstoßstange mit Anhängerkupplung
  const bumperRearGeo = new THREE.BoxGeometry(1.86, 0.18, 0.2);
  const bumperRear = new THREE.Mesh(bumperRearGeo, blackMatteMat);
  bumperRear.position.set(0, 0.48, -1.78);
  bumperRear.castShadow = true;
  bodyTubGroup.add(bumperRear);

  // Heckleuchten
  const tailGeo = new THREE.BoxGeometry(0.12, 0.18, 0.08);
  const tailL = new THREE.Mesh(tailGeo, taillightMat);
  tailL.position.set(0.72, 0.85, -1.68);
  bodyTubGroup.add(tailL);

  const tailR = new THREE.Mesh(tailGeo, taillightMat);
  tailR.position.set(-0.72, 0.85, -1.68);
  bodyTubGroup.add(tailR);

  // --- 3. Motorhaube mit "RUBICON" Schriftzug (Scharnier am Windlauf) ---
  const hoodPivotGroup = new THREE.Group();
  hoodPivotGroup.name = 'Wrangler_Hood_Hinge';
  hoodPivotGroup.position.set(0, 1.08, 0.58);
  bodyTubGroup.add(hoodPivotGroup);

  const hoodBodyGeo = new THREE.BoxGeometry(1.48, 0.14, 1.24);
  const hoodBody = new THREE.Mesh(hoodBodyGeo, bodyPaintMat);
  hoodBody.position.set(0, 0.04, 0.62);
  hoodBody.castShadow = true;
  hoodPivotGroup.add(hoodBody);

  // Power Bulge (Aufwölbung auf Haubenmitte)
  const bulgeGeo = new THREE.BoxGeometry(0.92, 0.05, 1.05);
  const bulge = new THREE.Mesh(bulgeGeo, bodyPaintMat);
  bulge.position.set(0, 0.13, 0.62);
  hoodPivotGroup.add(bulge);

  // "RUBICON" Stencil-Schriftzug auf den Haubenseiten
  const rubiconDecalGeo = new THREE.PlaneGeometry(0.98, 0.18);
  const rubiconDecalMat = new THREE.MeshStandardMaterial({
    map: wranglerTex.rubiconHoodMap,
    transparent: true,
    roughness: 0.3,
  });

  const rubiconL = new THREE.Mesh(rubiconDecalGeo, rubiconDecalMat);
  rubiconL.rotation.y = Math.PI / 2;
  rubiconL.position.set(0.745, 0.06, 0.62);
  hoodPivotGroup.add(rubiconL);

  const rubiconR = new THREE.Mesh(rubiconDecalGeo, rubiconDecalMat);
  rubiconR.rotation.y = -Math.PI / 2;
  rubiconR.position.set(-0.745, 0.06, 0.62);
  hoodPivotGroup.add(rubiconR);

  // --- 4. Windschutzscheibe (Klappbar) & Scheibenrahmen ---
  const windshieldPivotGroup = new THREE.Group();
  windshieldPivotGroup.name = 'Wrangler_Windshield_Hinge';
  windshieldPivotGroup.position.set(0, 1.10, 0.54);
  bodyTubGroup.add(windshieldPivotGroup);

  const wsFrameGeo = new THREE.BoxGeometry(1.54, 0.68, 0.06);
  const wsFrame = new THREE.Mesh(wsFrameGeo, bodyPaintMat);
  wsFrame.position.set(0, 0.32, -0.06);
  wsFrame.rotation.x = -0.18; // Leichte aerodynamische JK-Neigung
  windshieldPivotGroup.add(wsFrame);

  const wsGlassGeo = new THREE.PlaneGeometry(1.36, 0.52);
  const wsGlass = new THREE.Mesh(wsGlassGeo, glassMat);
  wsGlass.position.set(0, 0.32, -0.02);
  wsGlass.rotation.x = -0.18;
  windshieldPivotGroup.add(wsGlass);

  // Rückspiegel
  const mirrorGeo = new THREE.BoxGeometry(0.16, 0.06, 0.03);
  const mirror = new THREE.Mesh(mirrorGeo, blackMatteMat);
  mirror.position.set(0, 0.55, -0.10);
  windshieldPivotGroup.add(mirror);

  // --- 5. Türen (Fahrertür Links & Beifahrertür Rechts mit Scharnier) ---
  // Fahrertür (Links)
  const doorLPivot = new THREE.Group();
  doorLPivot.name = 'Wrangler_DoorL_Hinge';
  doorLPivot.position.set(0.82, 0.78, 0.48); // Scharnier an vorderer Säule
  bodyTubGroup.add(doorLPivot);

  const doorBodyGeo = new THREE.BoxGeometry(0.08, 0.62, 0.94);
  const doorLMesh = new THREE.Mesh(doorBodyGeo, bodyPaintMat);
  doorLMesh.position.set(0, 0, -0.47);
  doorLMesh.castShadow = true;
  doorLPivot.add(doorLMesh);

  // Türgriff & Außenspiegel Links
  const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), blackMatteMat);
  handleL.position.set(0.06, 0.16, -0.80);
  doorLPivot.add(handleL);

  const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), blackMatteMat);
  mirrorL.position.set(0.16, 0.34, -0.12);
  doorLPivot.add(mirrorL);

  // Beifahrertür (Rechts)
  const doorRPivot = new THREE.Group();
  doorRPivot.name = 'Wrangler_DoorR_Hinge';
  doorRPivot.position.set(-0.82, 0.78, 0.48);
  bodyTubGroup.add(doorRPivot);

  const doorRMesh = new THREE.Mesh(doorBodyGeo, bodyPaintMat);
  doorRMesh.position.set(0, 0, -0.47);
  doorRMesh.castShadow = true;
  doorRPivot.add(doorRMesh);

  const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), blackMatteMat);
  handleR.position.set(-0.06, 0.16, -0.80);
  doorRPivot.add(handleR);

  const mirrorR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), blackMatteMat);
  mirrorR.position.set(-0.16, 0.34, -0.12);
  doorRPivot.add(mirrorR);

  // --- 6. Sport-Überrollbügel (Roll Cage) ---
  const rollBarMat = new THREE.MeshStandardMaterial({
    color: '#1a1d20',
    roughness: 0.6,
    metalness: 0.3,
  });

  const bPillarBarGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.48, 16);
  bPillarBarGeo.rotateZ(Math.PI / 2);
  const bPillarCross = new THREE.Mesh(bPillarBarGeo, rollBarMat);
  bPillarCross.position.set(0, 1.62, -0.45);
  bPillarCross.castShadow = true;
  bodyTubGroup.add(bPillarCross);

  const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.85, 16);
  const bLegL = new THREE.Mesh(legGeo, rollBarMat);
  bLegL.position.set(0.72, 1.22, -0.45);
  bodyTubGroup.add(bLegL);

  const bLegR = new THREE.Mesh(legGeo, rollBarMat);
  bLegR.position.set(-0.72, 1.22, -0.45);
  bodyTubGroup.add(bLegR);

  // Längsstreben nach hinten
  const rearBarGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.25, 16);
  rearBarGeo.rotateX(0.55);

  const rearBarL = new THREE.Mesh(rearBarGeo, rollBarMat);
  rearBarL.position.set(0.72, 1.34, -1.02);
  bodyTubGroup.add(rearBarL);

  const rearBarR = new THREE.Mesh(rearBarGeo, rollBarMat);
  rearBarR.position.set(-0.72, 1.34, -1.02);
  bodyTubGroup.add(rearBarR);

  // --- 7. Innenraum & Cockpit ---
  // Armaturenbrett mit Tacho-Display
  const dashGeo = new THREE.BoxGeometry(1.48, 0.38, 0.32);
  const dashboard = new THREE.Mesh(dashGeo, darkInteriorMat);
  dashboard.position.set(0, 1.02, 0.36);
  bodyTubGroup.add(dashboard);

  const clusterGeo = new THREE.PlaneGeometry(0.48, 0.22);
  const clusterMat = new THREE.MeshStandardMaterial({
    map: wranglerTex.dashboardMap,
    roughness: 0.4,
    metalness: 0.2,
  });
  const cluster = new THREE.Mesh(clusterGeo, clusterMat);
  cluster.rotation.x = -0.25;
  cluster.position.set(0.38, 1.06, 0.21);
  bodyTubGroup.add(cluster);

  // Beifahrer-Haltegriff ("Jeep Since 1941")
  const grabGeo = new THREE.BoxGeometry(0.32, 0.04, 0.04);
  const grabHandle = new THREE.Mesh(grabGeo, blackMatteMat);
  grabHandle.position.set(-0.38, 1.04, 0.20);
  bodyTubGroup.add(grabHandle);

  // Lenkrad (Mitdrehend bei Lenkung)
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.name = 'Wrangler_Steering_Wheel';
  steeringWheelGroup.position.set(0.38, 1.02, 0.08);
  steeringWheelGroup.rotation.x = -0.45;
  bodyTubGroup.add(steeringWheelGroup);

  const wheelRimGeo = new THREE.TorusGeometry(0.17, 0.022, 16, 32);
  const wheelRim = new THREE.Mesh(wheelRimGeo, leatherSeatMat);
  steeringWheelGroup.add(wheelRim);

  const wheelHubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
  wheelHubGeo.rotateX(Math.PI / 2);
  const wheelHub = new THREE.Mesh(wheelHubGeo, blackMatteMat);
  steeringWheelGroup.add(wheelHub);

  // 2x Schalensitze Vorne
  const seatBaseGeo = new THREE.BoxGeometry(0.52, 0.16, 0.52);
  const seatBackGeo = new THREE.BoxGeometry(0.48, 0.64, 0.14);

  // Fahrersitz (Links)
  const seatL = new THREE.Group();
  seatL.position.set(0.38, 0.68, -0.15);
  const sBaseL = new THREE.Mesh(seatBaseGeo, leatherSeatMat);
  const sBackL = new THREE.Mesh(seatBackGeo, leatherSeatMat);
  sBackL.position.set(0, 0.36, -0.20);
  sBackL.rotation.x = -0.12;
  seatL.add(sBaseL, sBackL);
  bodyTubGroup.add(seatL);

  // Beifahrersitz (Rechts)
  const seatR = new THREE.Group();
  seatR.position.set(-0.38, 0.68, -0.15);
  const sBaseR = new THREE.Mesh(seatBaseGeo, leatherSeatMat);
  const sBackR = new THREE.Mesh(seatBackGeo, leatherSeatMat);
  sBackR.position.set(0, 0.36, -0.20);
  sBackR.rotation.x = -0.12;
  seatR.add(sBaseR, sBackR);
  bodyTubGroup.add(seatR);

  // Rücksitzbank
  const rearSeatGeo = new THREE.BoxGeometry(1.24, 0.16, 0.44);
  const rearSeat = new THREE.Mesh(rearSeatGeo, leatherSeatMat);
  rearSeat.position.set(0, 0.72, -1.05);
  bodyTubGroup.add(rearSeat);

  // --- 8. Räder & Felgen Builder (2-Stufen Scharnier: Steer Y -> Roll X) ---
  const allWheels: THREE.Group[] = [];

  const createWheelAssembly = (name: string, isLeft: boolean): THREE.Group => {
    const wheelGroup = new THREE.Group();
    wheelGroup.name = name;

    // 1. 32" Mud-Terrain Off-Road Reifen
    const tireGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.28, 32);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireRubberMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // 2. 17" 5-Speichen Rubicon Leichtmetallfelge
    const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.29, 24);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, alloyWheelMat);
    wheelGroup.add(rim);

    // 5 massive Speichen
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spokeGeo = new THREE.BoxGeometry(0.295, 0.16, 0.05);
      const spoke = new THREE.Mesh(spokeGeo, alloyWheelMat);
      spoke.rotation.x = angle;
      wheelGroup.add(spoke);
    }

    // Zentraler Jeep-Nabendeckel
    const hubCapGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.31, 16);
    hubCapGeo.rotateZ(Math.PI / 2);
    const hubCap = new THREE.Mesh(hubCapGeo, blackMatteMat);
    wheelGroup.add(hubCap);

    // Bremsscheibe & Roter Bremssattel
    const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24);
    discGeo.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, brakeDiscMat);
    disc.position.x = isLeft ? -0.06 : 0.06;
    wheelGroup.add(disc);

    const caliperGeo = new THREE.BoxGeometry(0.08, 0.12, 0.09);
    const caliper = new THREE.Mesh(caliperGeo, redCaliperMat);
    caliper.position.set(isLeft ? -0.06 : 0.06, 0.10, 0);
    wheelGroup.add(caliper);

    return wheelGroup;
  };

  // Vorderrad Links (Steer Y -> Roll X)
  const steerFrontLeft = new THREE.Group();
  steerFrontLeft.name = 'Steer_FrontLeft';
  steerFrontLeft.position.set(TRACK_WIDTH / 2, WHEEL_RADIUS, WHEELBASE / 2);
  root.add(steerFrontLeft);

  const rollFrontLeft = new THREE.Group();
  rollFrontLeft.name = 'Roll_FrontLeft';
  steerFrontLeft.add(rollFrontLeft);
  const wheelFL = createWheelAssembly('Mesh_WheelFL', true);
  rollFrontLeft.add(wheelFL);
  allWheels.push(rollFrontLeft);

  // Vorderrad Rechts (Steer Y -> Roll X)
  const steerFrontRight = new THREE.Group();
  steerFrontRight.name = 'Steer_FrontRight';
  steerFrontRight.position.set(-TRACK_WIDTH / 2, WHEEL_RADIUS, WHEELBASE / 2);
  root.add(steerFrontRight);

  const rollFrontRight = new THREE.Group();
  rollFrontRight.name = 'Roll_FrontRight';
  steerFrontRight.add(rollFrontRight);
  const wheelFR = createWheelAssembly('Mesh_WheelFR', false);
  rollFrontRight.add(wheelFR);
  allWheels.push(rollFrontRight);

  // Hinterrad Links (Nur Roll X)
  const rollRearLeft = new THREE.Group();
  rollRearLeft.name = 'Roll_RearLeft';
  rollRearLeft.position.set(TRACK_WIDTH / 2, WHEEL_RADIUS, -WHEELBASE / 2);
  root.add(rollRearLeft);
  const wheelRL = createWheelAssembly('Mesh_WheelRL', true);
  rollRearLeft.add(wheelRL);
  allWheels.push(rollRearLeft);

  // Hinterrad Rechts (Nur Roll X)
  const rollRearRight = new THREE.Group();
  rollRearRight.name = 'Roll_RearRight';
  rollRearRight.position.set(-TRACK_WIDTH / 2, WHEEL_RADIUS, -WHEELBASE / 2);
  root.add(rollRearRight);
  const wheelRR = createWheelAssembly('Mesh_WheelRR', false);
  rollRearRight.add(wheelRR);
  allWheels.push(rollRearRight);

  // --- 9. Reserverad auf Heckklappe (Fest arretiert mit Jeep-Cover) ---
  const spareGroup = new THREE.Group();
  spareGroup.name = 'Tailgate_Spare_Tire';
  spareGroup.position.set(0, 0.94, -1.82);
  bodyTubGroup.add(spareGroup);

  const spareTireGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.26, 32);
  spareTireGeo.rotateX(Math.PI / 2);
  const spareTire = new THREE.Mesh(spareTireGeo, tireRubberMat);
  spareTire.castShadow = true;
  spareGroup.add(spareTire);

  // Reserverad-Cover mit "Jeep" Logo
  const coverGeo = new THREE.CircleGeometry(WHEEL_RADIUS * 0.95, 32);
  const coverMat = new THREE.MeshStandardMaterial({
    map: wranglerTex.spareCoverMap,
    roughness: 0.6,
    metalness: 0.1,
  });
  const cover = new THREE.Mesh(coverGeo, coverMat);
  cover.rotation.y = Math.PI;
  cover.position.set(0, 0, -0.135);
  spareGroup.add(cover);

  // --- 10. Dynamische 3D-Scheinwerfer ---
  const headlightL = new THREE.SpotLight('#fff4d6', 5.5, 35, Math.PI / 5, 0.45, 1.2);
  headlightL.position.set(0.62, 0.85, 1.92);
  const targetL = new THREE.Object3D();
  targetL.position.set(0.62, 0.65, 14);
  root.add(targetL);
  headlightL.target = targetL;
  headlightL.castShadow = true;
  headlightL.shadow.mapSize.width = 1024;
  headlightL.shadow.mapSize.height = 1024;
  headlightL.shadow.bias = -0.0004;
  root.add(headlightL);

  const flareL = new THREE.PointLight('#fff9e6', 2.0, 3.5);
  flareL.position.copy(headlightL.position);
  root.add(flareL);

  const headlightR = new THREE.SpotLight('#fff4d6', 5.5, 35, Math.PI / 5, 0.45, 1.2);
  headlightR.position.set(-0.62, 0.85, 1.92);
  const targetR = new THREE.Object3D();
  targetR.position.set(-0.62, 0.65, 14);
  root.add(targetR);
  headlightR.target = targetR;
  headlightR.castShadow = true;
  headlightR.shadow.mapSize.width = 1024;
  headlightR.shadow.mapSize.height = 1024;
  headlightR.shadow.bias = -0.0004;
  root.add(headlightR);

  const flareR = new THREE.PointLight('#fff9e6', 2.0, 3.5);
  flareR.position.copy(headlightR.position);
  root.add(flareR);

  return {
    jeep: root,
    bodyTubGroup,
    steerFrontLeft,
    steerFrontRight,
    allWheels,
    doorLPivot,
    doorRPivot,
    hoodPivotGroup,
    windshieldPivotGroup,
    steeringWheelGroup,
    headlightL,
    headlightR,
    headlightLensMat,
    taillightMat,
    bodyPaintMat,
    textures: collectedTextures,
  };
}
