import * as THREE from 'three';
import {
  createWillysGrillTexture,
  createMilitaryStarDecalTexture,
  createJeepDashboardTexture,
  createJerryCanTexture,
  createNdtTireTreadTexture,
  createBlackoutDriveTexture,
  createPioneerToolsTexture,
} from '../materials/jeepTextures';

export type WillysJeepLivery = 'ww2_olive_drab' | 'desert_sand' | 'postwar_cj_red';

export interface WillysJeepOptions {
  livery?: WillysJeepLivery;
  showSoftTop?: boolean;
}

export interface WillysJeepRig {
  jeep: THREE.Group;
  bodyTubGroup: THREE.Group;
  windshieldPivotGroup: THREE.Group;
  hoodPivotGroup: THREE.Group;
  steerFrontLeft: THREE.Group;
  steerFrontRight: THREE.Group;
  steeringWheelGroup: THREE.Group;
  frontWheels: THREE.Group[];
  rearWheels: THREE.Group[];
  allWheels: THREE.Group[];
  headlightL: THREE.SpotLight;
  headlightR: THREE.SpotLight;
  headlightLensMat: THREE.MeshStandardMaterial;
  boDriveLensMat: THREE.MeshStandardMaterial;
  tailLightMat: THREE.MeshStandardMaterial;
  softTopGroup: THREE.Group;
  pioneerRackGroup: THREE.Group;
  jerryCanGroup: THREE.Group;
  spareWheelGroup: THREE.Group;
  textures: THREE.Texture[];
}

/**
 * Erstellt den vollständigen, hochdetaillierten 3D Willys MB 1/4-Ton 4x4 Reconnaissance Jeep
 * mit allen Subagenten-Komponenten (26.1 - 26.8), Kinematik-Gelenken, Lichtquellen & Militär-Ausrüstung.
 */
export function createWillysJeepRig(options: WillysJeepOptions = {}): WillysJeepRig {
  const jeep = new THREE.Group();
  const livery = options.livery || 'ww2_olive_drab';

  // --- Farbpaletten & PBR-Materialien ---
  let bodyColorHex = '#3e4832'; // 1944 WWII US Army Olive Drab Matte
  let bodyRoughness = 0.88;
  let bodyMetalness = 0.12;

  if (livery === 'desert_sand') {
    bodyColorHex = '#c4a675'; // SAS / Long Range Desert Group Matte Sand
    bodyRoughness = 0.90;
    bodyMetalness = 0.08;
  } else if (livery === 'postwar_cj_red') {
    bodyColorHex = '#a8201a'; // Post-War Civilian Gloss Red
    bodyRoughness = 0.28;
    bodyMetalness = 0.25;
  }

  const paintMat = new THREE.MeshStandardMaterial({
    color: bodyColorHex,
    roughness: bodyRoughness,
    metalness: bodyMetalness,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#1c1f1c',
    roughness: 0.72,
    metalness: 0.45,
  });

  const chassisMat = new THREE.MeshStandardMaterial({
    color: '#141614',
    roughness: 0.85,
    metalness: 0.25,
  });

  const canvasMat = new THREE.MeshStandardMaterial({
    color: livery === 'desert_sand' ? '#bfa06d' : '#47523a',
    roughness: 0.95,
    metalness: 0.02,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: '#181a18',
    roughness: 0.92,
    metalness: 0.05,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#e8f4f8',
    roughness: 0.04,
    metalness: 0.10,
    transmission: 0.88,
    ior: 1.52,
    transparent: true,
    opacity: 0.65,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    depthWrite: false,
  });

  const headlightLensMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#fff2a8',
    emissiveIntensity: 1.2,
    roughness: 0.15,
    metalness: 0.8,
  });

  const boDriveLensMat = new THREE.MeshStandardMaterial({
    color: '#1a2216',
    emissive: '#ffd166',
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });

  const tailLightMat = new THREE.MeshStandardMaterial({
    color: '#6b0f0f',
    emissive: '#d90429',
    emissiveIntensity: 0.9,
    roughness: 0.35,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: '#c5a059',
    roughness: 0.35,
    metalness: 0.85,
  });

  const engineBlockMat = new THREE.MeshStandardMaterial({
    color: '#28382b',
    roughness: 0.75,
    metalness: 0.4,
  });

  // Texturen registrieren
  const grillTex = createWillysGrillTexture(bodyColorHex);
  const starTex = createMilitaryStarDecalTexture();
  const dashTex = createJeepDashboardTexture();
  const jerryTex = createJerryCanTexture(bodyColorHex);
  const ndtTex = createNdtTireTreadTexture();
  const boTex = createBlackoutDriveTexture();
  const pioneerTex = createPioneerToolsTexture();

  const textures = [grillTex, starTex, dashTex, jerryTex, ndtTex, boTex, pioneerTex];

  // Geometrische Grundkonstanten des Willys MB (1:1 Maßstab in Metern)
  const wheelbase = 2.032; // 80 Zoll
  const frontAxleZ = wheelbase / 2;
  const rearAxleZ = -wheelbase / 2;
  const trackWidth = 1.232; // 48.5 Zoll
  const wheelRadius = 0.385; // 6.00-16 Reifen (~30.3 Zoll Durchmesser)
  const axleY = wheelRadius;

  // =========================================================================
  // 1. Subagent 26.2: `jeep_chassis_drivetrain` (LEITERRAHMEN & ANTRIEBSSTRANG)
  // =========================================================================
  const chassisGroup = new THREE.Group();
  jeep.add(chassisGroup);

  // 1.1 Kastenleiterrahmen (Zwei Längsträger)
  const railLength = 3.25;
  const railSpacing = 0.74;
  const railGeo = new THREE.BoxGeometry(0.06, 0.12, railLength);

  const leftRail = new THREE.Mesh(railGeo, chassisMat);
  leftRail.position.set(railSpacing / 2, axleY + 0.08, -0.05);
  leftRail.castShadow = true;
  chassisGroup.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, chassisMat);
  rightRail.position.set(-railSpacing / 2, axleY + 0.08, -0.05);
  rightRail.castShadow = true;
  chassisGroup.add(rightRail);

  // 1.2 Querträger (Crossmembers)
  const crossZ = [1.55, 0.70, 0.0, -0.75, -1.60];
  crossZ.forEach((cz) => {
    const crossGeo = new THREE.BoxGeometry(railSpacing + 0.04, 0.06, 0.06);
    const cross = new THREE.Mesh(crossGeo, chassisMat);
    cross.position.set(0, axleY + 0.08, cz);
    chassisGroup.add(cross);
  });

  // 1.3 Frontstoßstange (Stahl-U-Profil) mit Abschleppösen
  const frontBumperGeo = new THREE.BoxGeometry(1.48, 0.10, 0.06);
  const frontBumper = new THREE.Mesh(frontBumperGeo, paintMat);
  frontBumper.position.set(0, axleY + 0.08, 1.62);
  frontBumper.castShadow = true;
  chassisGroup.add(frontBumper);

  // Stoßstangen-Abschlepphaken vorn
  const hookGeo = new THREE.TorusGeometry(0.04, 0.015, 8, 16);
  const hookL = new THREE.Mesh(hookGeo, darkMetalMat);
  hookL.rotation.y = Math.PI / 2;
  hookL.position.set(0.32, axleY + 0.08, 1.66);
  chassisGroup.add(hookL);

  const hookR = new THREE.Mesh(hookGeo, darkMetalMat);
  hookR.rotation.y = Math.PI / 2;
  hookR.position.set(-0.32, axleY + 0.08, 1.66);
  chassisGroup.add(hookR);

  // 1.4 Heck-Kupplung (Pintle Tow Hook) & Hecktraverse
  const pintleGroup = new THREE.Group();
  pintleGroup.position.set(0, axleY + 0.08, -1.64);
  const pintleMount = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), darkMetalMat);
  const pintleHook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 8, 16), darkMetalMat);
  pintleHook.rotation.x = Math.PI / 2;
  pintleHook.position.set(0, 0, -0.05);
  pintleGroup.add(pintleMount, pintleHook);
  chassisGroup.add(pintleGroup);

  // 1.5 Längsblattfedern (Leaf Spring Packs 4x)
  const springLength = 0.92;
  
  const addLeafSpring = (x: number, z: number) => {
    const spring = new THREE.Group();
    spring.position.set(x, axleY - 0.04, z);
    
    // Hauptblatt
    const mainLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, springLength), darkMetalMat);
    mainLeaf.position.y = 0.01;
    // 4 gestufte Unterblätter
    const leaf2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, springLength * 0.8), darkMetalMat);
    leaf2.position.y = -0.005;
    const leaf3 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, springLength * 0.6), darkMetalMat);
    leaf3.position.y = -0.02;
    const leaf4 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, springLength * 0.4), darkMetalMat);
    leaf4.position.y = -0.035;

    // Federbügel (U-Bolts)
    const uBolt = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.08), darkMetalMat);
    spring.add(mainLeaf, leaf2, leaf3, leaf4, uBolt);
    chassisGroup.add(spring);
  };

  addLeafSpring(trackWidth / 2 - 0.12, frontAxleZ);
  addLeafSpring(-trackWidth / 2 + 0.12, frontAxleZ);
  addLeafSpring(trackWidth / 2 - 0.12, rearAxleZ);
  addLeafSpring(-trackWidth / 2 + 0.12, rearAxleZ);

  // 1.6 Dana 25 / Dana 27 Starrachsen & Differentiale
  const axleGeo = new THREE.CylinderGeometry(0.035, 0.035, trackWidth - 0.15, 12);
  const diffGeo = new THREE.SphereGeometry(0.095, 12, 10);
  diffGeo.scale(1.0, 1.0, 1.25);

  // Vorderachse
  const frontAxle = new THREE.Mesh(axleGeo, darkMetalMat);
  frontAxle.rotation.z = Math.PI / 2;
  frontAxle.position.set(0, axleY, frontAxleZ);
  const frontDiff = new THREE.Mesh(diffGeo, darkMetalMat);
  frontDiff.position.set(0.14, axleY, frontAxleZ); // Offset nach links beim Willys MB
  chassisGroup.add(frontAxle, frontDiff);

  // Hinterachse
  const rearAxle = new THREE.Mesh(axleGeo, darkMetalMat);
  rearAxle.rotation.z = Math.PI / 2;
  rearAxle.position.set(0, axleY, rearAxleZ);
  const rearDiff = new THREE.Mesh(diffGeo, darkMetalMat);
  rearDiff.position.set(0.14, axleY, rearAxleZ);
  chassisGroup.add(rearAxle, rearDiff);

  // Kardanwellen (Driveshafts) & Verteilergetriebe
  const shaftFrontGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8);
  const frontShaft = new THREE.Mesh(shaftFrontGeo, darkMetalMat);
  frontShaft.rotation.x = Math.PI / 2.3;
  frontShaft.position.set(0.08, axleY + 0.08, 0.55);
  chassisGroup.add(frontShaft);

  const shaftRearGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8);
  const rearShaft = new THREE.Mesh(shaftRearGeo, darkMetalMat);
  rearShaft.rotation.x = -Math.PI / 2.3;
  rearShaft.position.set(0.08, axleY + 0.08, -0.55);
  chassisGroup.add(rearShaft);

  // 1.7 Go-Devil L134 4-Zylinder Reihenmotor (Motorraum)
  const engineGroup = new THREE.Group();
  engineGroup.position.set(0, axleY + 0.28, 0.90);
  
  // Zylinderblock & Zylinderkopf
  const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.32, 0.52), engineBlockMat);
  blockMesh.position.y = 0.08;
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.50), darkMetalMat);
  headMesh.position.y = 0.28;
  
  // Ölwanne
  const oilPan = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.44), darkMetalMat);
  oilPan.position.y = -0.14;

  // Vergaser & runder Ölbad-Luftfilter
  const carbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.10), brassMat);
  carbMesh.position.set(0.18, 0.26, 0.05);
  const airFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 16), darkMetalMat);
  airFilter.position.set(0.22, 0.36, 0.05);

  // Wasserkühler & Lüfterrad vor dem Motor
  const radiatorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.08), darkMetalMat);
  radiatorMesh.position.set(0, 0.18, 0.38);
  const fanMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 8), brassMat);
  fanMesh.rotation.x = Math.PI / 2;
  fanMesh.position.set(0, 0.18, 0.32);

  // Lichtmaschine & Auspuffkrümmer
  const generatorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.20, 12), darkMetalMat);
  generatorMesh.rotation.x = Math.PI / 2;
  generatorMesh.position.set(-0.20, 0.12, 0.10);

  engineGroup.add(blockMesh, headMesh, oilPan, carbMesh, airFilter, radiatorMesh, fanMesh, generatorMesh);
  chassisGroup.add(engineGroup);

  // Auspuffrohr & Schalldämpfer unter der Beifahrerseite
  const mufflerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 12), darkMetalMat);
  mufflerMesh.rotation.x = Math.PI / 2;
  mufflerMesh.position.set(-0.38, axleY + 0.02, -0.45);
  const tailPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.90, 8), darkMetalMat);
  tailPipe.rotation.x = Math.PI / 2;
  tailPipe.position.set(-0.38, axleY + 0.02, -1.15);
  chassisGroup.add(mufflerMesh, tailPipe);

  // =========================================================================
  // 2. Subagent 26.1: `jeep_body_tub` (KAROSSERIEWANNE, GRILL & MOTORHAUBE)
  // =========================================================================
  const bodyTubGroup = new THREE.Group();
  jeep.add(bodyTubGroup);

  const tubBaseY = axleY + 0.18; // Unterkante der Wanne

  // 2.1 Bodenwanne (Floor Pan & Riser)
  const frontFloor = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.03, 0.85), paintMat);
  frontFloor.position.set(0, tubBaseY, 0.0);
  frontFloor.receiveShadow = true;

  // Mitteltunnel für Getriebe
  const tunnelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.65, 8, 1, false, 0, Math.PI), paintMat);
  tunnelMesh.rotation.z = -Math.PI / 2;
  tunnelMesh.position.set(0, tubBaseY + 0.06, 0.05);

  // Heckboden (Cargo Bed)
  const rearFloor = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.03, 1.10), paintMat);
  rearFloor.position.set(0, tubBaseY + 0.18, -0.92);
  rearFloor.receiveShadow = true;

  // Riser (Verbindungsblech zwischen Front- und Heckboden)
  const riserMesh = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.18, 0.03), paintMat);
  riserMesh.position.set(0, tubBaseY + 0.09, -0.37);

  bodyTubGroup.add(frontFloor, tunnelMesh, rearFloor, riserMesh);

  // 2.2 Seitenwände & charakteristische türenlose Einstiegsmulden
  // Heck-Seitenwände (Links & Rechts)
  const rearSideGeo = new THREE.BoxGeometry(0.04, 0.38, 1.15);
  const leftRearSide = new THREE.Mesh(rearSideGeo, paintMat);
  leftRearSide.position.set(0.62, tubBaseY + 0.36, -0.92);
  const rightRearSide = new THREE.Mesh(rearSideGeo, paintMat);
  rightRearSide.position.set(-0.62, tubBaseY + 0.36, -0.92);

  // Heck-Radkästen (Innenkästen im Laderaum)
  const wheelBoxGeo = new THREE.BoxGeometry(0.24, 0.28, 0.82);
  const leftWheelBox = new THREE.Mesh(wheelBoxGeo, paintMat);
  leftWheelBox.position.set(0.50, tubBaseY + 0.32, rearAxleZ);
  const rightWheelBox = new THREE.Mesh(wheelBoxGeo, paintMat);
  rightWheelBox.position.set(-0.50, tubBaseY + 0.32, rearAxleZ);

  // Heckklappe / Rückwand (Feste Rückwand beim Willys MB mit Sicken)
  const rearWallGeo = new THREE.BoxGeometry(1.28, 0.40, 0.04);
  const rearWall = new THREE.Mesh(rearWallGeo, paintMat);
  rearWall.position.set(0, tubBaseY + 0.37, -1.48);
  rearWall.castShadow = true;

  // Einstiegs-Schwellen (Türausschnitte)
  const doorCurbGeo = new THREE.BoxGeometry(0.04, 0.16, 0.70);
  const leftDoorCurb = new THREE.Mesh(doorCurbGeo, paintMat);
  leftDoorCurb.position.set(0.62, tubBaseY + 0.08, 0.0);
  const rightDoorCurb = new THREE.Mesh(doorCurbGeo, paintMat);
  rightDoorCurb.position.set(-0.62, tubBaseY + 0.08, 0.0);

  // Seitliche Haltegriffe (Grab Handles 4x)
  const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.20, 8);
  const addHandle = (x: number, y: number, z: number, rotY = 0) => {
    const handle = new THREE.Mesh(handleGeo, darkMetalMat);
    handle.rotation.y = rotY;
    handle.position.set(x, y, z);
    bodyTubGroup.add(handle);
  };
  addHandle(0.65, tubBaseY + 0.38, -0.45);
  addHandle(-0.65, tubBaseY + 0.38, -0.45);
  addHandle(0.65, tubBaseY + 0.38, -1.40);
  addHandle(-0.65, tubBaseY + 0.38, -1.40);

  bodyTubGroup.add(leftRearSide, rightRearSide, leftWheelBox, rightWheelBox, rearWall, leftDoorCurb, rightDoorCurb);

  // 2.3 Spritzwand & Front-Cowl (Kasten vor der Scheibe)
  const cowlMesh = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.38, 0.28), paintMat);
  cowlMesh.position.set(0, tubBaseY + 0.38, 0.48);
  cowlMesh.castShadow = true;
  bodyTubGroup.add(cowlMesh);

  // 2.4 Flache Kotflügel vorn (Flat Fenders)
  const fenderWidth = 0.28;
  const fenderLength = 0.95;
  const fenderGeo = new THREE.BoxGeometry(fenderWidth, 0.03, fenderLength);
  
  const leftFender = new THREE.Mesh(fenderGeo, paintMat);
  leftFender.position.set(0.48, tubBaseY + 0.38, 1.05);
  leftFender.castShadow = true;

  // Kotflügelschürze nach unten
  const skirtGeo = new THREE.BoxGeometry(0.03, 0.26, fenderLength);
  const leftSkirt = new THREE.Mesh(skirtGeo, paintMat);
  leftSkirt.position.set(0.62, tubBaseY + 0.25, 1.05);

  const rightFender = new THREE.Mesh(fenderGeo, paintMat);
  rightFender.position.set(-0.48, tubBaseY + 0.38, 1.05);
  rightFender.castShadow = true;

  const rightSkirt = new THREE.Mesh(skirtGeo, paintMat);
  rightSkirt.position.set(-0.62, tubBaseY + 0.25, 1.05);

  bodyTubGroup.add(leftFender, leftSkirt, rightFender, rightSkirt);

  // 2.5 Willys 9-Slot Kühlergrill (Front Grille)
  const grillMat = new THREE.MeshStandardMaterial({
    map: grillTex,
    roughness: 0.85,
    metalness: 0.15,
  });
  const grillMesh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.04), grillMat);
  grillMesh.position.set(0, tubBaseY + 0.32, 1.54);
  grillMesh.castShadow = true;
  bodyTubGroup.add(grillMesh);

  // 2.6 Aufklappbare Motorhaube (Willys Hood with Hinge)
  const hoodPivotGroup = new THREE.Group();
  hoodPivotGroup.position.set(0, tubBaseY + 0.57, 0.38); // Scharnier an der Spritzwand
  bodyTubGroup.add(hoodPivotGroup);

  const hoodLength = 1.15;
  const hoodGeo = new THREE.BoxGeometry(0.70, 0.03, hoodLength);
  const hoodMesh = new THREE.Mesh(hoodGeo, paintMat);
  hoodMesh.position.set(0, 0, hoodLength / 2);
  hoodMesh.castShadow = true;

  // Abgeschrägte Hauben-Seitenteile
  const hoodSideGeo = new THREE.BoxGeometry(0.03, 0.18, hoodLength);
  const leftHoodSide = new THREE.Mesh(hoodSideGeo, paintMat);
  leftHoodSide.position.set(0.34, -0.09, hoodLength / 2);
  const rightHoodSide = new THREE.Mesh(hoodSideGeo, paintMat);
  rightHoodSide.position.set(-0.34, -0.09, hoodLength / 2);

  // US Army Invasionsstern Decal auf der Motorhaube
  const starDecalGeo = new THREE.PlaneGeometry(0.62, 0.62);
  const starDecalMat = new THREE.MeshStandardMaterial({
    map: starTex,
    transparent: true,
    roughness: 0.9,
    depthWrite: false,
  });
  const starDecal = new THREE.Mesh(starDecalGeo, starDecalMat);
  starDecal.rotation.x = -Math.PI / 2;
  starDecal.position.set(0, 0.02, hoodLength / 2 + 0.08);

  // Gummiauflage-Puffer für die umgeklappte Scheibe (2x Wood/Rubber Hood Blocks)
  const padGeo = new THREE.BoxGeometry(0.08, 0.035, 0.16);
  const padL = new THREE.Mesh(padGeo, canvasMat);
  padL.position.set(0.24, 0.03, hoodLength * 0.45);
  const padR = new THREE.Mesh(padGeo, canvasMat);
  padR.position.set(-0.24, 0.03, hoodLength * 0.45);

  // Hauben-Spannverschlüsse (Latches)
  const latchGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6);
  const latchL = new THREE.Mesh(latchGeo, darkMetalMat);
  latchL.position.set(0.36, -0.08, hoodLength * 0.85);
  const latchR = new THREE.Mesh(latchGeo, darkMetalMat);
  latchR.position.set(-0.36, -0.08, hoodLength * 0.85);

  hoodPivotGroup.add(hoodMesh, leftHoodSide, rightHoodSide, starDecal, padL, padR, latchL, latchR);

  // =========================================================================
  // 3. Subagent 26.7: `jeep_kinematics_physics` - KLAPPSCHEIBE (SPLIT WINDSHIELD)
  // =========================================================================
  const windshieldPivotGroup = new THREE.Group();
  // Drehpunkt an den Scharnieren am Fuß der Cowl
  windshieldPivotGroup.position.set(0, tubBaseY + 0.57, 0.35);
  bodyTubGroup.add(windshieldPivotGroup);

  const frameWidth = 1.20;
  const frameHeight = 0.58;
  const tubeThick = 0.032;

  // Äußerer Rohrrahmen
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, tubeThick, tubeThick), paintMat);
  frameTop.position.set(0, frameHeight, 0);
  const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, tubeThick, tubeThick), paintMat);
  frameBottom.position.set(0, tubeThick / 2, 0);
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(tubeThick, frameHeight, tubeThick), paintMat);
  frameLeft.position.set(frameWidth / 2 - tubeThick / 2, frameHeight / 2, 0);
  const frameRight = new THREE.Mesh(new THREE.BoxGeometry(tubeThick, frameHeight, tubeThick), paintMat);
  frameRight.position.set(-frameWidth / 2 + tubeThick / 2, frameHeight / 2, 0);

  // Mittelsteg (Split-Window Divider)
  const frameCenter = new THREE.Mesh(new THREE.BoxGeometry(tubeThick, frameHeight, tubeThick), paintMat);
  frameCenter.position.set(0, frameHeight / 2, 0);

  // Zwei getrennte Glasscheiben (Left & Right Pane)
  const paneWidth = (frameWidth - 3 * tubeThick) / 2;
  const paneHeight = frameHeight - 2 * tubeThick;
  const paneGeo = new THREE.BoxGeometry(paneWidth, paneHeight, 0.008);

  const leftGlass = new THREE.Mesh(paneGeo, glassMat);
  leftGlass.position.set(paneWidth / 2 + tubeThick / 2, frameHeight / 2, 0);
  const rightGlass = new THREE.Mesh(paneGeo, glassMat);
  rightGlass.position.set(-paneWidth / 2 - tubeThick / 2, frameHeight / 2, 0);

  // Handbetriebene Scheibenwischer oben am Rahmen (Willys Hand Wipers)
  const wiperGroupL = new THREE.Group();
  wiperGroupL.position.set(paneWidth / 2, frameHeight - 0.02, 0.02);
  const wiperMotorL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), darkMetalMat);
  const wiperArmL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.22, 0.008), darkMetalMat);
  wiperArmL.position.set(0.04, -0.10, 0.01);
  wiperArmL.rotation.z = -0.3;
  const wiperBladeL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.24, 0.01), darkMetalMat);
  wiperBladeL.position.set(0.08, -0.12, 0.015);
  wiperBladeL.rotation.z = -0.3;
  wiperGroupL.add(wiperMotorL, wiperArmL, wiperBladeL);

  const wiperGroupR = new THREE.Group();
  wiperGroupR.position.set(-paneWidth / 2, frameHeight - 0.02, 0.02);
  const wiperMotorR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), darkMetalMat);
  const wiperArmR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.22, 0.008), darkMetalMat);
  wiperArmR.position.set(0.04, -0.10, 0.01);
  wiperArmR.rotation.z = -0.3;
  const wiperBladeR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.24, 0.01), darkMetalMat);
  wiperBladeR.position.set(0.08, -0.12, 0.015);
  wiperBladeR.rotation.z = -0.3;
  wiperGroupR.add(wiperMotorR, wiperArmR, wiperBladeR);

  // Rückspiegel am linken Scheibenrahmen (Round Driver Mirror)
  const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 8), darkMetalMat);
  mirrorArm.rotation.z = Math.PI / 3;
  mirrorArm.position.set(frameWidth / 2 + 0.10, frameHeight * 0.6, 0.04);
  const mirrorHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 16), darkMetalMat);
  mirrorHead.rotation.x = Math.PI / 2;
  mirrorHead.position.set(frameWidth / 2 + 0.20, frameHeight * 0.72, 0.04);
  const mirrorGlass = new THREE.Mesh(new THREE.CircleGeometry(0.056, 16), glassMat);
  mirrorGlass.position.set(frameWidth / 2 + 0.20, frameHeight * 0.72, 0.048);

  windshieldPivotGroup.add(
    frameTop, frameBottom, frameLeft, frameRight, frameCenter,
    leftGlass, rightGlass, wiperGroupL, wiperGroupR,
    mirrorArm, mirrorHead, mirrorGlass
  );

  // =========================================================================
  // 4. Subagent 26.4: `jeep_interior_cockpit` (ARMATURENBRETT, SITZE & HEBEL)
  // =========================================================================
  const interiorGroup = new THREE.Group();
  bodyTubGroup.add(interiorGroup);

  // 4.1 Armaturenbrett (Dashboard Face)
  const dashMat = new THREE.MeshStandardMaterial({
    map: dashTex,
    roughness: 0.6,
    metalness: 0.2,
  });
  const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.28, 0.03), dashMat);
  dashMesh.position.set(0, tubBaseY + 0.44, 0.35);
  interiorGroup.add(dashMesh);

  // 4.2 Lenksäule & 3-Speichen-Lenkrad (Linksgesteuert, LHD)
  const steeringColGroup = new THREE.Group();
  steeringColGroup.position.set(0.32, tubBaseY + 0.34, 0.34);
  
  const steerColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 12), darkMetalMat);
  steerColumn.rotation.x = Math.PI / 3.8;
  steerColumn.position.set(0, 0.15, -0.15);

  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(0, 0.38, -0.32);
  steeringWheelGroup.rotation.x = Math.PI / 3.8;

  // Äußerer Lenkradkranz
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.016, 12, 24), darkMetalMat);
  // Nabe
  const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), darkMetalMat);
  hubMesh.rotation.x = Math.PI / 2;
  // 3 Speichen
  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.19, 0.008), darkMetalMat);
    spoke.rotation.z = (s * Math.PI * 2) / 3;
    spoke.position.set(Math.sin((s * Math.PI * 2) / 3) * 0.09, Math.cos((s * Math.PI * 2) / 3) * 0.09, 0);
    steeringWheelGroup.add(spoke);
  }
  steeringWheelGroup.add(rimMesh, hubMesh);
  steeringColGroup.add(steerColumn, steeringWheelGroup);
  interiorGroup.add(steeringColGroup);

  // 4.3 Die 3 Schalthebel auf dem Mitteltunnel
  // Haupt-Schalthebel (T-84 3-Speed Cane Shifter)
  const mainShift = new THREE.Group();
  mainShift.position.set(0.04, tubBaseY + 0.12, 0.14);
  const mainStick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.32, 8), darkMetalMat);
  mainStick.rotation.x = -0.2;
  const mainKnob = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), darkMetalMat);
  mainKnob.position.set(0, 0.16, -0.03);
  mainShift.add(mainStick, mainKnob);

  // Allrad-Zuschalthebel (Front Axle Drive Engage)
  const fwdShift = new THREE.Group();
  fwdShift.position.set(0.12, tubBaseY + 0.12, 0.22);
  const fwdStick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.20, 8), darkMetalMat);
  const fwdKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), darkMetalMat);
  fwdKnob.position.set(0, 0.10, 0);
  fwdShift.add(fwdStick, fwdKnob);

  // Untersetzungshebel (Transfer Case High/Low)
  const tcShift = new THREE.Group();
  tcShift.position.set(0.18, tubBaseY + 0.12, 0.22);
  const tcStick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.20, 8), darkMetalMat);
  const tcKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), darkMetalMat);
  tcKnob.position.set(0, 0.10, 0);
  tcShift.add(tcStick, tcKnob);

  interiorGroup.add(mainShift, fwdShift, tcShift);

  // 4.4 Historische Rohrrahmen-Sitze (Driver & Passenger Canvas Bucket Seats)
  const createJeepSeat = (x: number) => {
    const seatGroup = new THREE.Group();
    seatGroup.position.set(x, tubBaseY + 0.04, -0.12);

    // Rohrgestell-Beine
    const legGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.22, 8);
    const legFL = new THREE.Mesh(legGeo, darkMetalMat);
    legFL.position.set(0.20, 0.11, 0.20);
    const legFR = new THREE.Mesh(legGeo, darkMetalMat);
    legFR.position.set(-0.20, 0.11, 0.20);
    const legBL = new THREE.Mesh(legGeo, darkMetalMat);
    legBL.position.set(0.20, 0.11, -0.20);
    const legBR = new THREE.Mesh(legGeo, darkMetalMat);
    legBR.position.set(-0.20, 0.11, -0.20);

    // Sitzpolster (Canvas Kissen)
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), canvasMat);
    cushion.position.set(0, 0.22, 0);
    cushion.castShadow = true;

    // Rückenlehne (Abgeschrägt)
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.06), canvasMat);
    backrest.position.set(0, 0.42, -0.20);
    backrest.rotation.x = -0.15;
    backrest.castShadow = true;

    seatGroup.add(legFL, legFR, legBL, legBR, cushion, backrest);
    return seatGroup;
  };

  const driverSeat = createJeepSeat(0.32);
  const passengerSeat = createJeepSeat(-0.32);
  interiorGroup.add(driverSeat, passengerSeat);

  // Heck-Sitzbank (Rear Passenger Jump Bench)
  const rearBenchGroup = new THREE.Group();
  rearBenchGroup.position.set(0, tubBaseY + 0.18, -0.92);
  const benchCushion = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.08, 0.38), canvasMat);
  benchCushion.position.set(0, 0.16, 0);
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.32, 0.05), canvasMat);
  benchBack.position.set(0, 0.34, -0.18);
  benchBack.rotation.x = -0.12;
  rearBenchGroup.add(benchCushion, benchBack);
  interiorGroup.add(rearBenchGroup);

  // Gewehrhalterung an der Windschutzscheibe (Rifle Scabbard Holder)
  const scabbardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.06), canvasMat);
  scabbardMesh.position.set(0, tubBaseY + 0.54, 0.30);
  interiorGroup.add(scabbardMesh);

  // =========================================================================
  // 5. Subagent 26.5: `jeep_lighting_electrical` (SCHEINWERFER & BLACKOUT-LICHT)
  // =========================================================================
  const lightingGroup = new THREE.Group();
  jeep.add(lightingGroup);

  // 5.1 7-Zoll Sealed-Beam Hauptscheinwerfer
  const headlightRadius = 0.095;
  const headlightLGroup = new THREE.Group();
  headlightLGroup.position.set(0.24, tubBaseY + 0.35, 1.56);
  const hlMeshL = new THREE.Mesh(new THREE.CylinderGeometry(headlightRadius, headlightRadius, 0.04, 20), headlightLensMat);
  hlMeshL.rotation.x = Math.PI / 2;
  const hlRingL = new THREE.Mesh(new THREE.TorusGeometry(headlightRadius, 0.014, 8, 20), paintMat);
  headlightLGroup.add(hlMeshL, hlRingL);

  const headlightRGroup = new THREE.Group();
  headlightRGroup.position.set(-0.24, tubBaseY + 0.35, 1.56);
  const hlMeshR = new THREE.Mesh(new THREE.CylinderGeometry(headlightRadius, headlightRadius, 0.04, 20), headlightLensMat);
  hlMeshR.rotation.x = Math.PI / 2;
  const hlRingR = new THREE.Mesh(new THREE.TorusGeometry(headlightRadius, 0.014, 8, 20), paintMat);
  headlightRGroup.add(hlMeshR, hlRingR);

  // Three.js Spotlights für authentischen Lichtkegel im 3D-Raum
  const headlightL = new THREE.SpotLight(0xfffaed, 4.5, 35, Math.PI / 6, 0.45, 1.2);
  headlightL.position.set(0.24, tubBaseY + 0.35, 1.60);
  headlightL.target.position.set(0.24, tubBaseY + 0.10, 15);
  jeep.add(headlightL.target);

  const headlightR = new THREE.SpotLight(0xfffaed, 4.5, 35, Math.PI / 6, 0.45, 1.2);
  headlightR.position.set(-0.24, tubBaseY + 0.35, 1.60);
  headlightR.target.position.set(-0.24, tubBaseY + 0.10, 15);
  jeep.add(headlightR.target);

  lightingGroup.add(headlightLGroup, headlightRGroup, headlightL, headlightR);

  // 5.2 Blackout Drive Marker Lamp auf dem linken Kotflügel (Fahrerseite)
  const boDriveGroup = new THREE.Group();
  boDriveGroup.position.set(0.48, tubBaseY + 0.43, 1.35);
  const boHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 16), paintMat);
  boHousing.rotation.x = Math.PI / 2;
  const boLens = new THREE.Mesh(new THREE.CircleGeometry(0.042, 16), boDriveLensMat);
  boLens.position.set(0, 0, 0.042);
  const boHood = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.06), paintMat);
  boHood.position.set(0, 0.035, 0.02);
  boDriveGroup.add(boHousing, boLens, boHood);
  lightingGroup.add(boDriveGroup);

  // 5.3 Blackout Marker Lights im Grill (Kleine Schlitzleuchten unter den Scheinwerfern)
  const boMarkerGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12);
  const boMarkerL = new THREE.Mesh(boMarkerGeo, boDriveLensMat);
  boMarkerL.rotation.x = Math.PI / 2;
  boMarkerL.position.set(0.24, tubBaseY + 0.18, 1.56);
  const boMarkerR = new THREE.Mesh(boMarkerGeo, boDriveLensMat);
  boMarkerR.rotation.x = Math.PI / 2;
  boMarkerR.position.set(-0.24, tubBaseY + 0.18, 1.56);
  lightingGroup.add(boMarkerL, boMarkerR);

  // 5.4 Heck-Rücklichter (Oval Blackout Tail Lamps 2x)
  const tailLightGeo = new THREE.BoxGeometry(0.09, 0.06, 0.04);
  const tailLightL = new THREE.Mesh(tailLightGeo, tailLightMat);
  tailLightL.position.set(0.52, tubBaseY + 0.22, -1.50);
  const tailLightR = new THREE.Mesh(tailLightGeo, tailLightMat);
  tailLightR.position.set(-0.52, tubBaseY + 0.22, -1.50);
  lightingGroup.add(tailLightL, tailLightR);

  // =========================================================================
  // 6. Subagent 26.6: `jeep_military_gear_accessories` (PIONEER RACK, JERRYCAN, RAD)
  // =========================================================================
  const gearGroup = new THREE.Group();
  jeep.add(gearGroup);

  // 6.1 Pioneer Tool Rack (Schaufel & Axt auf der Fahrerseite +X)
  const pioneerRackGroup = new THREE.Group();
  pioneerRackGroup.position.set(0.64, tubBaseY + 0.28, 0.0);

  const pioneerMat = new THREE.MeshStandardMaterial({
    map: pioneerTex,
    roughness: 0.7,
    metalness: 0.3,
  });

  // Schaufel (US Military Spade)
  const shovelShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.88, 8), pioneerMat);
  shovelShaft.rotation.z = Math.PI / 2.05;
  shovelShaft.position.set(0, -0.04, 0.0);
  const shovelBlade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.18, 0.24), darkMetalMat);
  shovelBlade.position.set(0, -0.05, 0.46);
  const shovelHandle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), pioneerMat);
  shovelHandle.position.set(0, -0.03, -0.46);

  // Axt (US Army Fire/Pioneer Axe)
  const axeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.72, 8), pioneerMat);
  axeShaft.rotation.z = Math.PI / 1.95;
  axeShaft.position.set(0.02, 0.08, -0.08);
  const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.18), darkMetalMat);
  axeHead.position.set(0.02, 0.09, -0.42);

  // Halteklammern (Straps / Clamps)
  const clamp1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.04), canvasMat);
  clamp1.position.set(0, 0, 0.2);
  const clamp2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.04), canvasMat);
  clamp2.position.set(0, 0, -0.2);

  pioneerRackGroup.add(shovelShaft, shovelBlade, shovelHandle, axeShaft, axeHead, clamp1, clamp2);
  gearGroup.add(pioneerRackGroup);

  // 6.2 20-Liter Kraftstoff-Jerrycan am Heckträger
  const jerryCanGroup = new THREE.Group();
  jerryCanGroup.position.set(-0.35, tubBaseY + 0.38, -1.62);

  const jerryMat = new THREE.MeshStandardMaterial({
    map: jerryTex,
    roughness: 0.85,
    metalness: 0.15,
  });
  // Kanister-Hauptkörper
  const canBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.34), jerryMat);
  canBody.castShadow = true;

  // 3-Steg Tragegriff oben
  const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.22), paintMat);
  handleTop.position.set(0, 0.24, 0);
  // Schraubdeckel / Stutzen
  const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12), brassMat);
  capMesh.position.set(0.04, 0.24, 0.10);

  // Haltebügel (Jerry Can Bracket & Strap)
  const canBracket = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.30, 0.36), canvasMat);
  canBracket.position.set(0, -0.05, 0);

  jerryCanGroup.add(canBody, handleTop, capMesh, canBracket);
  gearGroup.add(jerryCanGroup);

  // 6.3 5. Reserverad am Heckträger (Mounted Spare Tire)
  const spareWheelGroup = new THREE.Group();
  spareWheelGroup.position.set(0.22, tubBaseY + 0.38, -1.64);
  
  // Halteplatte & Dreiecksbock
  const spareCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.12), darkMetalMat);
  spareCarrier.position.set(0, 0, 0.06);
  spareWheelGroup.add(spareCarrier);

  // =========================================================================
  // 7. Subagent 26.3: `jeep_wheels_tires` (COMBAT SPLIT RIMS & 6.00-16 NDT REIFEN)
  // =========================================================================
  const frontWheels: THREE.Group[] = [];
  const rearWheels: THREE.Group[] = [];
  const allWheels: THREE.Group[] = [];

  const tireWidth = 0.17;
  const rimRadius = 0.22;

  // Prozeduraler Reifen- & Felgen-Builder
  const createWillysWheel = (_isSpare = false): THREE.Group => {
    const wheelGroup = new THREE.Group();

    // 7.1 NDT-Reifen Lauffläche (Tread Cylinder)
    const treadGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, tireWidth, 24);
    const treadMat = new THREE.MeshStandardMaterial({
      map: ndtTex,
      roughness: 0.94,
      metalness: 0.05,
    });
    const treadMesh = new THREE.Mesh(treadGeo, treadMat);
    treadMesh.rotation.z = Math.PI / 2;
    treadMesh.castShadow = true;

    // 7.2 Flanken-Wulst (Tire Sidewalls)
    const sidewallGeo = new THREE.TorusGeometry(rimRadius + 0.08, 0.085, 12, 24);
    const leftSidewall = new THREE.Mesh(sidewallGeo, tireMat);
    leftSidewall.position.x = tireWidth / 2 - 0.02;
    const rightSidewall = new THREE.Mesh(sidewallGeo, tireMat);
    rightSidewall.position.x = -tireWidth / 2 + 0.02;

    // 7.3 Combat Split Rim Stahlfelge (Geteilte Militärfelge mit Schraubenkranz)
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth * 0.7, 20);
    const rimMesh = new THREE.Mesh(rimGeo, paintMat);
    rimMesh.rotation.z = Math.PI / 2;

    // Felgen-Schüssel mit Mittelsteg
    const discGeo = new THREE.CylinderGeometry(rimRadius * 0.85, rimRadius * 0.85, 0.03, 16);
    const discMesh = new THREE.Mesh(discGeo, paintMat);
    discMesh.rotation.z = Math.PI / 2;
    discMesh.position.x = 0.02;

    // Radnabe / Achskappe
    const hubCapGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 12);
    const hubCap = new THREE.Mesh(hubCapGeo, darkMetalMat);
    hubCap.rotation.z = Math.PI / 2;
    hubCap.position.x = tireWidth / 2 + 0.02;

    // 6x Radbolzen & Nieten (Combat Rim Flange Bolts)
    for (let b = 0; b < 6; b++) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), darkMetalMat);
      bolt.rotation.z = Math.PI / 2;
      const angle = (b * Math.PI * 2) / 6;
      bolt.position.set(0.05, Math.sin(angle) * 0.13, Math.cos(angle) * 0.13);
      wheelGroup.add(bolt);
    }

    wheelGroup.add(treadMesh, leftSidewall, rightSidewall, rimMesh, discMesh, hubCap);
    return wheelGroup;
  };

  // Reserverad am Heckträger montieren
  const spareWheel = createWillysWheel(true);
  spareWheelGroup.add(spareWheel);
  gearGroup.add(spareWheelGroup);

  // Vorderrad-Lenkgelenke (Spindles für Ackermann-Lenkung)
  const steerFrontLeft = new THREE.Group();
  steerFrontLeft.position.set(trackWidth / 2, axleY, frontAxleZ);
  const wheelFL = createWillysWheel();
  steerFrontLeft.add(wheelFL);
  jeep.add(steerFrontLeft);

  const steerFrontRight = new THREE.Group();
  steerFrontRight.position.set(-trackWidth / 2, axleY, frontAxleZ);
  const wheelFR = createWillysWheel();
  wheelFR.rotation.y = Math.PI; // Nach außen gerichtet
  steerFrontRight.add(wheelFR);
  jeep.add(steerFrontRight);

  // Hinterräder (Starre Befestigung am Chassis)
  const wheelRLGroup = new THREE.Group();
  wheelRLGroup.position.set(trackWidth / 2, axleY, rearAxleZ);
  const wheelRL = createWillysWheel();
  wheelRLGroup.add(wheelRL);
  jeep.add(wheelRLGroup);

  const wheelRRGroup = new THREE.Group();
  wheelRRGroup.position.set(-trackWidth / 2, axleY, rearAxleZ);
  const wheelRR = createWillysWheel();
  wheelRR.rotation.y = Math.PI;
  wheelRRGroup.add(wheelRR);
  jeep.add(wheelRRGroup);

  frontWheels.push(wheelFL, wheelFR);
  rearWheels.push(wheelRL, wheelRR);
  allWheels.push(wheelFL, wheelFR, wheelRL, wheelRR);

  // =========================================================================
  // 8. Canvas-Verdeck (Soft Top & Folding Bows)
  // =========================================================================
  const softTopGroup = new THREE.Group();
  softTopGroup.position.set(0, tubBaseY, 0);

  // Zusammengeklapptes Verdeckgestänge am Heck
  const bowFoldedGeo = new THREE.TorusGeometry(0.58, 0.018, 8, 16, Math.PI);
  const bowFolded = new THREE.Mesh(bowFoldedGeo, darkMetalMat);
  bowFolded.rotation.x = Math.PI / 2.2;
  bowFolded.position.set(0, 0.42, -1.42);

  // Aufgerollte Verdeckplane (Canvas Roll)
  const topRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.18, 12), canvasMat);
  topRoll.rotation.z = Math.PI / 2;
  topRoll.position.set(0, 0.42, -1.45);
  topRoll.castShadow = true;

  softTopGroup.add(bowFolded, topRoll);
  bodyTubGroup.add(softTopGroup);

  return {
    jeep,
    bodyTubGroup,
    windshieldPivotGroup,
    hoodPivotGroup,
    steerFrontLeft,
    steerFrontRight,
    steeringWheelGroup,
    frontWheels,
    rearWheels,
    allWheels,
    headlightL,
    headlightR,
    headlightLensMat,
    boDriveLensMat,
    tailLightMat,
    softTopGroup,
    pioneerRackGroup,
    jerryCanGroup,
    spareWheelGroup,
    textures,
  };
}
