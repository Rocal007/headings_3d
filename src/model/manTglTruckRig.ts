import * as THREE from 'three';
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
  createManRearLightTexture,
  createSideMarkerTexture,
} from '../materials/truckTextures';
import { createTruckBoxBody } from './truckBoxBody';

export interface ManTglTruckRig {
  truck: THREE.Group;
  leftDoorGroup: THREE.Group;
  rightDoorGroup: THREE.Group;
  steeringWheel: THREE.Group;
  tailLiftAssembly: THREE.Group;
  platformTiltGroup: THREE.Group;
  platformTipGroup: THREE.Group;
  topFlapGroup: THREE.Group;
  liftArmLGroup: THREE.Group;
  liftArmRGroup: THREE.Group;
  tailgateBlinkerMat: THREE.MeshStandardMaterial;
  wheels: THREE.Group[];
  wipers: THREE.Group[];
  leftSpot: THREE.SpotLight;
  rightSpot: THREE.SpotLight;
  headlightFlareL: THREE.PointLight;
  headlightFlareR: THREE.PointLight;
  headlightLensMat: THREE.MeshStandardMaterial;
  fogLampMat: THREE.MeshStandardMaterial;
  roofMarkerMat: THREE.MeshStandardMaterial;
  drlMat: THREE.MeshStandardMaterial;
  rearBrakeLightMat: THREE.MeshStandardMaterial;
  thirdBrakeLightMat: THREE.MeshStandardMaterial;
  rearBrakeLightL: THREE.PointLight;
  rearBrakeLightR: THREE.PointLight;
  rearBlinkerMatL: THREE.MeshStandardMaterial;
  rearBlinkerMatR: THREE.MeshStandardMaterial;
  frontBlinkerMatL: THREE.MeshStandardMaterial;
  frontBlinkerMatR: THREE.MeshStandardMaterial;
  biLedLensMat: THREE.MeshPhysicalMaterial;
  loadEdgeHeight: number;
  kofferBackZ: number;
  textures: THREE.Texture[];
}

/**
 * Erstellt den vollständigen, hochdetaillierten 3D MAN TGL 12.250 Koffer-LKW
 * mit allen Subagenten-Komponenten (22.1 - 22.13), Kinematik-Gelenken, Lichtquellen & Ladung.
 */
export function createManTglTruckRig(): ManTglTruckRig {
  const truck = new THREE.Group();

  // --- Materials (Realistic Car Paint with Clearcoat & Refined Light Response) ---
  const paintMat = new THREE.MeshPhysicalMaterial({ 
    color: '#f8f9fa', 
    roughness: 0.16, 
    metalness: 0.14, 
    clearcoat: 1.0, 
    clearcoatRoughness: 0.05,
    ior: 1.5,
  });
  
  const plasticMat = new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.70, metalness: 0.12 });
  const darkTrimMat = new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 0.72, metalness: 0.10 });
  const chassisMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.78, metalness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#1e3a5f', roughness: 0.04, metalness: 0.85, transparent: true, opacity: 0.68 });
  const visorMat = new THREE.MeshPhysicalMaterial({ color: '#0b1320', roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.85, transmission: 0.20 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#b0b8c0', roughness: 0.24, metalness: 0.86 });
  const silverMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.26, metalness: 0.92 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.06, metalness: 0.98 });
  const interiorMat = new THREE.MeshStandardMaterial({ color: '#1a1e24', roughness: 0.82, metalness: 0.08 });
  const seatFabricMat = new THREE.MeshStandardMaterial({ color: '#272c35', roughness: 0.88, metalness: 0.04 });
  
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

  // 1. Fahrgestell-Grundparameter (Echte Maße: Datenblatt MAN TGL 12.250)
  const wheelbase = 5.55;     // Radstand
  const frontAxleZ = 3.5;
  const rearAxleZ = frontAxleZ - wheelbase; // = -2.05

  // =========================================================================
  // 📦 Subagent 22.3: `truck_box_body` - HOHLRAUM-KOFFERAUFBAU & LADERAUM
  // =========================================================================
  const boxBodyResult = createTruckBoxBody({
    wheelbase,
    frontAxleZ,
    loadEdgeHeight: 1.02,
    paintMat,
    chassisMat,
    plasticMat,
    silverMat,
    darkTrimMat,
    interiorMat,
  });
  truck.add(boxBodyResult.boxGroup);

  const {
    kofferWidth,
    kofferHeight,
    loadEdgeHeight,
    kofferY,
    kofferBackZ,
    topFlapGroup,
  } = boxBodyResult;

  // 2. Chassis Frame (Langer Hauptträger)
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

  // 3. Hydraulische Ladebordwand (Dautel Cargolift Plattform)
  const tailgateBlinkerMat = new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#ff9900', emissiveIntensity: 0.0, roughness: 0.2 });

  const tailLiftAssembly = new THREE.Group();
  tailLiftAssembly.position.set(0, 1.02, kofferBackZ); // Drehpunkt exakt auf Ladekantenhöhe

  const platformTiltGroup = new THREE.Group();
  const platformTipGroup = new THREE.Group();

  const platformMaterials = [silverMat, silverMat, silverMat, silverMat, silverMat, tailLiftMat];
  const platformMesh = new THREE.Mesh(
    new THREE.BoxGeometry(kofferWidth - 0.06, 2.05, 0.05),
    platformMaterials
  );
  platformMesh.position.set(0, 1.025, -0.025);
  platformMesh.castShadow = true;

  const platEdgeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.05, 0.06), silverMat);
  platEdgeL.position.set(kofferWidth / 2 - 0.04, 1.025, -0.025);
  const platEdgeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.05, 0.06), silverMat);
  platEdgeR.position.set(-kofferWidth / 2 + 0.04, 1.025, -0.025);

  // 2x Sicherheits-Warnblinker
  const platBlinkerGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  const blinkerL = new THREE.Mesh(platBlinkerGeo, tailgateBlinkerMat);
  blinkerL.position.set(kofferWidth / 2 - 0.12, 1.95, -0.05);
  const blinkerR = new THREE.Mesh(platBlinkerGeo, tailgateBlinkerMat);
  blinkerR.position.set(-kofferWidth / 2 + 0.12, 1.95, -0.05);

  // 2x Boden-Laufrollen (Steel Ground Castors) an der Plattform-Unterkante
  const castorWheelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16);
  castorWheelGeo.rotateZ(Math.PI / 2);
  const castorL = new THREE.Mesh(castorWheelGeo, silverMat);
  castorL.position.set(0.65, 0.02, -0.04);
  const castorR = new THREE.Mesh(castorWheelGeo, silverMat);
  castorR.position.set(-0.65, 0.02, -0.04);

  // 2x Plattform-Aufnahmelaschen (Bracket Ears) zur Verbindung mit den Hubarmen
  const bracketGeo = new THREE.BoxGeometry(0.05, 0.16, 0.14);
  const platBracketL = new THREE.Mesh(bracketGeo, chassisMat);
  platBracketL.position.set(0.65, 0.06, -0.06);
  const platBracketR = new THREE.Mesh(bracketGeo, chassisMat);
  platBracketR.position.set(-0.65, 0.06, -0.06);

  // 2x Abrollsicherungen (Flap-up Roll-Off Stops) auf der Plattform
  const rollStopGeo = new THREE.BoxGeometry(0.55, 0.02, 0.04);
  const rollStopL = new THREE.Mesh(rollStopGeo, silverMat);
  rollStopL.position.set(0.65, 1.75, 0.01);
  const rollStopR = new THREE.Mesh(rollStopGeo, silverMat);
  rollStopR.position.set(-0.65, 1.75, 0.01);

  platformTipGroup.add(platformMesh, platEdgeL, platEdgeR, blinkerL, blinkerR, castorL, castorR, platBracketL, platBracketR, rollStopL, rollStopR);
  platformTiltGroup.add(platformTipGroup);
  platformTiltGroup.rotation.x = 0;
  tailLiftAssembly.add(platformTiltGroup);

  // 5. Vollständig artikulierte Parallelogramm-Hubschwingen & Zwillings-Hydraulikzylinder
  const createArticulatedLiftArm = (xOffset: number) => {
    const armRootGroup = new THREE.Group();
    armRootGroup.position.set(xOffset, 0.45, kofferBackZ + 0.25);

    // Haupt-Hubschwinge (Heavy Reinforced I-Beam Profile, L = 0.65m)
    const mainBeamGeo = new THREE.BoxGeometry(0.07, 0.10, 0.65);
    const mainBeam = new THREE.Mesh(mainBeamGeo, chassisMat);
    mainBeam.position.set(0, 0, -0.325);

    // Oberer Parallellenker (Parallel Guidance Tube Ø 32mm)
    const parTubeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.65, 12);
    parTubeGeo.rotateX(Math.PI / 2);
    const parTube = new THREE.Mesh(parTubeGeo, silverMat);
    parTube.position.set(0, 0.12, -0.325);

    // Silberne Lagerbolzen mit Kronenmuttern an beiden Enden
    const pinGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.09, 12);
    pinGeo.rotateZ(Math.PI / 2);
    const pinBaseMain = new THREE.Mesh(pinGeo, silverMat);
    pinBaseMain.position.set(0, 0, 0);
    const pinBasePar = new THREE.Mesh(pinGeo, silverMat);
    pinBasePar.position.set(0, 0.12, 0);
    const pinTipMain = new THREE.Mesh(pinGeo, silverMat);
    pinTipMain.position.set(0, 0, -0.65);
    const pinTipPar = new THREE.Mesh(pinGeo, silverMat);
    pinTipPar.position.set(0, 0.12, -0.65);

    // 1. Hydraulischer Hubzylinder (Anthrazit Zylinderkörper + Hochglanz-Chromkolben)
    const cylBarrelGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.35, 16);
    cylBarrelGeo.rotateX(Math.PI / 2);
    const cylBarrel = new THREE.Mesh(cylBarrelGeo, plasticMat);
    cylBarrel.position.set(0.045, -0.06, -0.175);

    const cylPistonGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.40, 16);
    cylPistonGeo.rotateX(Math.PI / 2);
    const cylPiston = new THREE.Mesh(cylPistonGeo, chromeMat);
    cylPiston.position.set(0.045, -0.06, -0.42);

    // 2. Hydraulischer Kippzylinder (Oben)
    const tiltCylBarrelGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.30, 12);
    tiltCylBarrelGeo.rotateX(Math.PI / 2);
    const tiltCylBarrel = new THREE.Mesh(tiltCylBarrelGeo, plasticMat);
    tiltCylBarrel.position.set(-0.045, 0.06, -0.16);

    const tiltCylPistonGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.35, 12);
    tiltCylPistonGeo.rotateX(Math.PI / 2);
    const tiltCylPiston = new THREE.Mesh(tiltCylPistonGeo, chromeMat);
    tiltCylPiston.position.set(-0.045, 0.06, -0.38);

    // Hydraulikschläuche & Messingverschraubungen
    const hoseGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.45, 8);
    hoseGeo.rotateX(Math.PI / 2);
    const hose = new THREE.Mesh(hoseGeo, darkTrimMat);
    hose.position.set(0.05, -0.09, -0.22);

    armRootGroup.add(
      mainBeam, parTube,
      pinBaseMain, pinBasePar, pinTipMain, pinTipPar,
      cylBarrel, cylPiston,
      tiltCylBarrel, tiltCylPiston,
      hose
    );
    return armRootGroup;
  };

  const liftArmLGroup = createArticulatedLiftArm(0.65);
  const liftArmRGroup = createArticulatedLiftArm(-0.65);

  // Hydraulik-Unterbau
  const tailBumperGeo = new THREE.BoxGeometry(2.4, 0.15, 0.3);
  const tailBumper = new THREE.Mesh(tailBumperGeo, chassisMat);
  tailBumper.position.set(0, 0.4, kofferBackZ + 0.15);
  
  // Unterfahrschutz Stange (Under-run bar)
  const underrunGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4);
  underrunGeo.rotateZ(Math.PI / 2);
  const underrun = new THREE.Mesh(underrunGeo, chassisMat);
  underrun.position.set(0, 0.25, kofferBackZ + 0.1);

  // Heck-Kennzeichen "SUPERTECHNO" & LED-Kennzeichenleuchten
  const rearPlateGeo = new THREE.BoxGeometry(0.80, 0.18, 0.04);
  const rearPlate = new THREE.Mesh(rearPlateGeo, plateMaterials);
  rearPlate.position.set(0, 0.42, kofferBackZ + 0.31);
  rearPlate.rotation.y = Math.PI;

  const plateLightGeo = new THREE.BoxGeometry(0.08, 0.03, 0.04);
  const plateLightMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.0 });
  const rearPlateLampL = new THREE.Mesh(plateLightGeo, plateLightMat);
  rearPlateLampL.position.set(0.25, 0.52, kofferBackZ + 0.29);
  const rearPlateLampR = new THREE.Mesh(plateLightGeo, plateLightMat);
  rearPlateLampR.position.set(-0.25, 0.52, kofferBackZ + 0.29);

  truck.add(tailLiftAssembly, liftArmLGroup, liftArmRGroup, tailBumper, underrun, rearPlate, rearPlateLampL, rearPlateLampR);

  // =========================================================================
  // 🚨 Subagent 22.12: `truck_rear_lights` - MAN 7-KAMMER HECKLEUCHTEN & BREMSLICHT
  // =========================================================================
  
  const rearLightTexL = createManRearLightTexture(true);
  const rearLightTexR = createManRearLightTexture(false);
  const sideMarkerTex = createSideMarkerTexture();

  const rearBlinkerMatL = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.0, roughness: 0.2 });
  const rearBlinkerMatR = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.0, roughness: 0.2 });
  const rearBrakeLightMat = new THREE.MeshStandardMaterial({ color: '#ff1100', emissive: '#ff0000', emissiveIntensity: 0.8, roughness: 0.2 });
  const rearReverseMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.0, roughness: 0.1 });
  const rearFogMat = new THREE.MeshStandardMaterial({ color: '#cc0000', emissive: '#cc0000', emissiveIntensity: 0.2, roughness: 0.3 });
  const thirdBrakeLightMat = new THREE.MeshStandardMaterial({ color: '#ff0022', emissive: '#ff0000', emissiveIntensity: 0.0, roughness: 0.2 });
  const outlineMarkerMat = new THREE.MeshStandardMaterial({ color: '#ff3300', emissive: '#ff2200', emissiveIntensity: 1.2, roughness: 0.2 });

  const createRearLightCluster = (side: 'left' | 'right') => {
    const clusterGroup = new THREE.Group();
    const s = side === 'left' ? 1 : -1;
    const blinkerMat = side === 'left' ? rearBlinkerMatL : rearBlinkerMatR;
    const lensTex = side === 'left' ? rearLightTexL : rearLightTexR;

    const housingGeo = new RoundedBoxGeometry(0.48, 0.16, 0.07, 3, 0.015);
    const housing = new THREE.Mesh(housingGeo, darkTrimMat);
    clusterGroup.add(housing);

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
      lensMesh.scale.set(-1, 1, 1);
    } else {
      lensMesh.scale.set(1, 1, 1);
    }
    clusterGroup.add(lensMesh);

    const socketGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12);
    socketGeo.rotateX(Math.PI / 2);
    const socket = new THREE.Mesh(socketGeo, darkTrimMat);
    socket.position.set(-0.16 * s, -0.09, 0.01);
    clusterGroup.add(socket);

    const blinkerGlow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.01), blinkerMat);
    blinkerGlow.position.set(-0.16 * s, 0, 0.034);

    const brakeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.01), rearBrakeLightMat);
    brakeGlow.position.set(-0.02 * s, 0, 0.034);

    const reverseGlow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.01), rearReverseMat);
    reverseGlow.position.set(0.10 * s, 0, 0.034);

    const fogGlow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.01), rearFogMat);
    fogGlow.position.set(0.19 * s, 0, 0.034);

    clusterGroup.add(blinkerGlow, brakeGlow, reverseGlow, fogGlow);

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
    
    markerGroup.position.set(-0.32 * s, -0.05, 0.02);
    markerGroup.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    clusterGroup.add(markerGroup);

    const cableGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8);
    cableGeo.rotateZ(-Math.PI / 3 * s);
    const cable = new THREE.Mesh(cableGeo, plasticMat);
    cable.position.set(-0.24 * s, -0.07, 0.01);
    clusterGroup.add(cable);

    clusterGroup.position.set(0.90 * s, 0.54, kofferBackZ - 0.04);
    clusterGroup.rotation.y = Math.PI;
    return clusterGroup;
  };

  const leftRearCluster = createRearLightCluster('left');
  const rightRearCluster = createRearLightCluster('right');

  const rearBrakeLightL = new THREE.PointLight('#ff1100', 1.5, 8.0, 2);
  rearBrakeLightL.position.set(0.90, 0.54, kofferBackZ - 0.40);
  const rearBrakeLightR = new THREE.PointLight('#ff1100', 1.5, 8.0, 2);
  rearBrakeLightR.position.set(-0.90, 0.54, kofferBackZ - 0.40);

  const thirdBrakeGeo = new THREE.BoxGeometry(0.36, 0.035, 0.03);
  const thirdBrakeLight = new THREE.Mesh(thirdBrakeGeo, thirdBrakeLightMat);
  thirdBrakeLight.position.set(0, kofferY + kofferHeight / 2 - 0.04, kofferBackZ - 0.02);
  thirdBrakeLight.rotation.y = Math.PI;

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
  spoilerShape.moveTo(1.9, 3.70);
  spoilerShape.quadraticCurveTo(3.2, 3.68, 3.5, 3.28);
  spoilerShape.lineTo(3.35, 3.28);
  spoilerShape.quadraticCurveTo(3.05, 3.62, 1.9, 3.62);
  spoilerShape.lineTo(1.9, 3.70);
  
  const spoilerExtrude = { depth: 2.22, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 };
  const spoilerGeo = new THREE.ExtrudeGeometry(spoilerShape, spoilerExtrude);
  spoilerGeo.rotateY(-Math.PI / 2);
  spoilerGeo.translate(1.11, 0, 0);
  const roofSpoiler = new THREE.Mesh(spoilerGeo, paintMat);
  truck.add(roofSpoiler);

  // Seitliche Windleitfender an der Kabinenhinterkante
  const deflectorGeo = new THREE.BoxGeometry(0.08, 2.4, 0.35);
  const leftDeflector = new THREE.Mesh(deflectorGeo, paintMat);
  leftDeflector.position.set(1.22, 2.15, 2.15);
  const rightDeflector = leftDeflector.clone();
  rightDeflector.position.set(-1.22, 2.15, 2.15);
  truck.add(leftDeflector, rightDeflector);

  // 3.2 Vollwertige Hohlraum-Fahrerkabine
  const rearWallGeo = new RoundedBoxGeometry(2.24, 2.25, 0.08, 3, 0.02);
  const rearWall = new THREE.Mesh(rearWallGeo, paintMat);
  rearWall.position.set(0, 2.20, 2.37);
  rearWall.castShadow = true;
  rearWall.receiveShadow = true;
  
  const rearLiningGeo = new THREE.BoxGeometry(2.16, 2.15, 0.02);
  const rearLining = new THREE.Mesh(rearLiningGeo, interiorMat);
  rearLining.position.set(0, 2.20, 2.42);
  truck.add(rearWall, rearLining);

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

  // 3.4 Sonnenblende (Exterior Sun Visor)
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

  // 3.5 Panorama-Windschutzscheibe (Subagent 22.7)
  const windshieldFrameGeo = createCurvedWindshieldGeometry(2.28, 1.20, 32, 16, 0.12);
  const windshieldFrame = new THREE.Mesh(windshieldFrameGeo, darkTrimMat);
  windshieldFrame.position.set(0, 2.70, 3.965);
  windshieldFrame.rotation.x = -Math.atan2(0.41, 1.12);

  const windScreenGeo = createCurvedWindshieldGeometry(2.25, 1.17, 32, 16, 0.12);
  const windScreen = new THREE.Mesh(windScreenGeo, windshieldMat);
  windScreen.position.set(0, 2.70, 3.975);
  windScreen.rotation.x = -Math.atan2(0.41, 1.12);
  truck.add(windshieldFrame, windScreen);

  const rainSensorGeo = new THREE.BoxGeometry(0.09, 0.09, 0.02);
  const rainSensorMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.2, metalness: 0.8 });
  const rainSensor = new THREE.Mesh(rainSensorGeo, rainSensorMat);
  rainSensor.position.set(0, 3.14, 3.80);
  rainSensor.rotation.x = -Math.atan2(0.41, 1.12);
  truck.add(rainSensor);

  const wiperCowlGeo = new RoundedBoxGeometry(2.26, 0.12, 0.20, 3, 0.02);
  const wiperCowl = new THREE.Mesh(wiperCowlGeo, darkTrimMat);
  wiperCowl.position.set(0, 2.14, 4.22);
  wiperCowl.rotation.x = -0.15;
  truck.add(wiperCowl);

  const wiperArmGeo = new THREE.BoxGeometry(0.02, 0.42, 0.02);
  const wiperBladeGeo = new THREE.BoxGeometry(0.52, 0.018, 0.02);
  const wipers: THREE.Group[] = [];

  const createWiper = (xOffset: number) => {
    const g = new THREE.Group();
    g.position.set(xOffset, 2.16, 4.26);
    g.rotation.x = -Math.atan2(0.41, 1.12);

    const pivot = new THREE.Group();
    const arm = new THREE.Mesh(wiperArmGeo, darkTrimMat);
    arm.position.set(0, 0.18, 0.01);
    const blade = new THREE.Mesh(wiperBladeGeo, darkTrimMat);
    blade.position.set(0.14, 0.35, 0.02);
    pivot.add(arm, blade);
    pivot.rotation.z = -0.35;
    g.add(pivot);
    wipers.push(pivot);
    return g;
  };
  truck.add(createWiper(-0.38), createWiper(0.28));

  const grabBarGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 12);
  grabBarGeo.rotateZ(Math.PI / 2);
  const leftGrab = new THREE.Mesh(grabBarGeo, chromeMat);
  leftGrab.position.set(0.65, 2.12, 4.31);
  const rightGrab = leftGrab.clone();
  rightGrab.position.set(-0.65, 2.12, 4.31);
  truck.add(leftGrab, rightGrab);

  // 3.6 MAN Frontmaske & Waben-Kühlergrill
  const grillGeo = new THREE.BoxGeometry(2.18, 1.18, 0.08);
  const grill = new THREE.Mesh(grillGeo, grillMaterials);
  grill.position.set(0, 1.58, 4.40);
  truck.add(grill);

  const aeroVaneGeo = new THREE.BoxGeometry(0.12, 0.85, 0.28);
  const leftAeroVane = new THREE.Mesh(aeroVaneGeo, paintMat);
  leftAeroVane.position.set(1.12, 1.62, 4.32);
  leftAeroVane.rotation.y = -0.35;
  const rightAeroVane = new THREE.Mesh(aeroVaneGeo, paintMat);
  rightAeroVane.position.set(-1.12, 1.62, 4.32);
  rightAeroVane.rotation.y = 0.35;
  truck.add(leftAeroVane, rightAeroVane);

  // 3.7 Stoßfänger & Kennzeichen vorne
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
  
  const frontBlinkerMatL = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.0, roughness: 0.2 });
  const frontBlinkerMatR = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.0, roughness: 0.2 });
  const biLedLensMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 3.5, roughness: 0.05, clearcoat: 1.0, transmission: 0.3 });
  const fogLampMat = new THREE.MeshStandardMaterial({ color: '#fffbf0', emissive: '#fff3d6', emissiveIntensity: 2.5, roughness: 0.15 });
  const roofMarkerMat = new THREE.MeshStandardMaterial({ color: '#e0f2fe', emissive: '#bae6fd', emissiveIntensity: 2.8, roughness: 0.2 });
  const drlMat = new THREE.MeshStandardMaterial({ color: '#e0f2fe', emissive: '#bae6fd', emissiveIntensity: 3.5, roughness: 0.1 });

  const headlightLensMat = new THREE.MeshStandardMaterial({
    map: hlTex,
    roughness: 0.06,
    metalness: 0.05,
    transparent: true,
    opacity: 0.94,
    emissive: '#ffffff',
    emissiveIntensity: 2.4,
  });

  const createFrontHeadlightCluster = (side: 'left' | 'right') => {
    const g = new THREE.Group();
    const s = side === 'left' ? 1 : -1;
    const blinkerMat = side === 'left' ? frontBlinkerMatL : frontBlinkerMatR;

    const housingGeo = new RoundedBoxGeometry(0.54, 0.28, 0.08, 3, 0.015);
    const housing = new THREE.Mesh(housingGeo, darkTrimMat);
    g.add(housing);

    const reflectorBedGeo = new THREE.BoxGeometry(0.51, 0.25, 0.03);
    const reflectorBed = new THREE.Mesh(reflectorBedGeo, chromeMat);
    reflectorBed.position.set(0, 0, 0.01);
    g.add(reflectorBed);

    // 1. Großer Reflektor & leuchtende Projektorlinse (Abblendlicht)
    const bowlLargeGeo = new THREE.CylinderGeometry(0.105, 0.065, 0.035, 24, 1, true);
    bowlLargeGeo.rotateX(Math.PI / 2);
    const bowlLarge = new THREE.Mesh(bowlLargeGeo, chromeMat);
    bowlLarge.position.set(-0.09 * s, 0, 0.02);

    const projectorDiscLarge = new THREE.Mesh(new THREE.CircleGeometry(0.092, 24), biLedLensMat);
    projectorDiscLarge.position.set(-0.09 * s, 0, 0.036);

    const bulbCapLarge = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), darkTrimMat);
    bulbCapLarge.position.set(-0.09 * s, 0, 0.038);
    g.add(bowlLarge, projectorDiscLarge, bulbCapLarge);

    // 2. Kleinerer Reflektor & Fernlichtlinse
    const bowlSmallGeo = new THREE.CylinderGeometry(0.085, 0.055, 0.03, 20, 1, true);
    bowlSmallGeo.rotateX(Math.PI / 2);
    const bowlSmall = new THREE.Mesh(bowlSmallGeo, chromeMat);
    bowlSmall.position.set(0.10 * s, 0, 0.02);

    const projectorDiscSmall = new THREE.Mesh(new THREE.CircleGeometry(0.074, 20), biLedLensMat);
    projectorDiscSmall.position.set(0.10 * s, 0, 0.033);

    const bulbCapSmall = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), darkTrimMat);
    bulbCapSmall.position.set(0.10 * s, 0, 0.035);
    g.add(bowlSmall, projectorDiscSmall, bulbCapSmall);

    // 3. Montagescharnier / Gehäuselasche
    const hingeGroup = new THREE.Group();
    const hingePlateGeo = new THREE.BoxGeometry(0.06, 0.22, 0.04);
    const hingePlate = new THREE.Mesh(hingePlateGeo, darkTrimMat);
    
    for (let yOffset of [-0.07, 0, 0.07]) {
      const barrelGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.035, 12);
      const barrel = new THREE.Mesh(barrelGeo, darkTrimMat);
      barrel.position.set(0.02 * s, yOffset, 0);
      hingeGroup.add(barrel);
    }
    hingeGroup.add(hingePlate);
    hingeGroup.position.set(0.30 * s, 0, 0);
    g.add(hingeGroup);

    // 4. Klarglas-Frontscheibe mit intensiv leuchtendem Emissive-Glow
    const outerLens = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26), headlightLensMat);
    outerLens.position.set(0, 0, 0.042);
    if (side === 'left') {
      outerLens.scale.set(1, 1, 1);
    } else {
      outerLens.scale.set(-1, 1, 1);
    }
    g.add(outerLens);

    // 5. LED DRL Lichtleiter-Streifen & LED Blinker
    const drlStrip = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.016, 0.015), drlMat);
    drlStrip.position.set(0, 0.118, 0.043);

    const blinkerGeo = new THREE.BoxGeometry(0.42, 0.022, 0.015);
    const blinker = new THREE.Mesh(blinkerGeo, blinkerMat);
    blinker.position.set(0, 0.095, 0.043);
    g.add(drlStrip, blinker);

    g.position.set(0.82 * s, 0.72, 4.53);
    return g;
  };

  const frontHlLeft = createFrontHeadlightCluster('left');
  const frontHlRight = createFrontHeadlightCluster('right');

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

  const roofMarkerGeo = new THREE.BoxGeometry(0.06, 0.025, 0.04);
  const roofMarkerL = new THREE.Mesh(roofMarkerGeo, roofMarkerMat);
  roofMarkerL.position.set(0.85, 3.42, 3.92);
  const roofMarkerR = new THREE.Mesh(roofMarkerGeo, roofMarkerMat);
  roofMarkerR.position.set(-0.85, 3.42, 3.92);

  const leftSpot = new THREE.SpotLight('#ffffff', 42, 65, Math.PI / 5, 0.45, 1.5);
  leftSpot.position.set(0.82, 0.72, 4.54);
  leftSpot.target.position.set(0.82, -0.5, 24);
  
  const rightSpot = new THREE.SpotLight('#ffffff', 42, 65, Math.PI / 5, 0.45, 1.5);
  rightSpot.position.set(-0.82, 0.72, 4.54);
  rightSpot.target.position.set(-0.82, -0.5, 24);

  // Nach vorne strahlende Linsen-Streulichter (Headlight Flares)
  const headlightFlareL = new THREE.PointLight('#ffffff', 4.0, 9.0, 2);
  headlightFlareL.position.set(0.82, 0.72, 4.62);
  const headlightFlareR = new THREE.PointLight('#ffffff', 4.0, 9.0, 2);
  headlightFlareR.position.set(-0.82, 0.72, 4.62);

  truck.add(
    frontHlLeft, frontHlRight,
    leftFog, leftFogRing, rightFog, rightFogRing,
    roofMarkerL, roofMarkerR,
    leftSpot, leftSpot.target, rightSpot, rightSpot.target,
    headlightFlareL, headlightFlareR
  );

  // 3.8 Ergo-Cockpit Interieur
  const cockpitGroup = new THREE.Group();
  cockpitGroup.position.set(0, 2.15, 3.32);

  const dashBodyGeo = new THREE.BoxGeometry(2.05, 0.45, 0.58);
  const dashBody = new THREE.Mesh(dashBodyGeo, interiorMat);
  dashBody.position.set(0, 0.05, 0.42);
  
  const clusterGeo = new THREE.BoxGeometry(0.45, 0.22, 0.04);
  const cluster = new THREE.Mesh(clusterGeo, dashMat);
  cluster.position.set(0.55, 0.28, 0.58);
  cluster.rotation.x = -0.25;

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

  const createSeat = (xPos: number) => {
    const seatGroup = new THREE.Group();
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.58), seatFabricMat);
    baseMesh.position.set(0, -0.92, -0.22);
    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.78, 0.14), seatFabricMat);
    backMesh.position.set(0, -0.44, -0.46);
    backMesh.rotation.x = 0.08;
    const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.12), seatFabricMat);
    headRest.position.set(0, 0.06, -0.50);
    seatGroup.add(baseMesh, backMesh, headRest);
    seatGroup.position.set(xPos, 0, 0);
    return seatGroup;
  };

  const domeLight = new THREE.PointLight('#e0f2fe', 1.8, 4.5, 2);
  domeLight.position.set(0, 1.05, -0.15);

  cockpitGroup.add(dashBody, cluster, column, steeringWheel, pedal1, pedal2, pedal3, createSeat(0.55), createSeat(-0.55), domeLight);
  truck.add(cockpitGroup);

  // 3.9 MAN Türen, Stufenfenster & Kinematik (Subagent 22.9)
  const winShape = new THREE.Shape();
  winShape.moveTo(0.02, 0.86);
  winShape.lineTo(0.44, 2.18);
  winShape.lineTo(1.80, 2.18);
  winShape.lineTo(1.80, 1.08);
  winShape.lineTo(0.85, 1.08);
  winShape.bezierCurveTo(0.65, 1.08, 0.45, 0.86, 0.25, 0.86);
  winShape.lineTo(0.02, 0.86);
  
  const sideWindowGeo = new THREE.ExtrudeGeometry(winShape, { depth: 0.015, bevelEnabled: false });
  sideWindowGeo.rotateY(Math.PI / 2);
  sideWindowGeo.translate(0.02, 0, 0);

  const mirrorTriShape = new THREE.Shape();
  mirrorTriShape.moveTo(0, 0.86);
  mirrorTriShape.lineTo(0.14, 1.35);
  mirrorTriShape.lineTo(0.28, 0.86);
  mirrorTriShape.lineTo(0, 0.86);
  const mirrorTriGeo = new THREE.ExtrudeGeometry(mirrorTriShape, { depth: 0.052, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 });
  mirrorTriGeo.rotateY(Math.PI / 2);

  const winDividerGeo = new THREE.BoxGeometry(0.035, 1.08, 0.02);

  const aPillarBeamGeo = new THREE.BoxGeometry(0.045, 1.39, 0.05);
  aPillarBeamGeo.rotateX(-Math.atan2(0.44, 1.32));
  const roofBeamGeo = new THREE.BoxGeometry(0.045, 0.05, 1.38);
  const bPillarBeamGeo = new THREE.BoxGeometry(0.045, 1.10, 0.05);

  const doorPanelShape = new THREE.Shape();
  doorPanelShape.moveTo(0, 0.86);
  doorPanelShape.lineTo(0.25, 0.86);
  doorPanelShape.bezierCurveTo(0.45, 0.86, 0.65, 1.08, 0.85, 1.08);
  doorPanelShape.lineTo(1.82, 1.08);
  doorPanelShape.lineTo(1.82, 0.0);
  doorPanelShape.lineTo(0, -0.22);
  doorPanelShape.lineTo(0, 0.86);
  
  const doorPanelGeo = new THREE.ExtrudeGeometry(doorPanelShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
  doorPanelGeo.rotateY(Math.PI / 2);

  const bodyCreaseGeo = new THREE.BoxGeometry(0.016, 0.035, 1.80);
  const handlePocketGeo = new RoundedBoxGeometry(0.020, 0.085, 0.22, 2, 0.008);
  const handleBarGeo = new THREE.BoxGeometry(0.022, 0.028, 0.16);

  const tglBadgeGeo = new THREE.BoxGeometry(0.012, 0.10, 0.36);
  const tglBadgeMatL = [new THREE.MeshStandardMaterial({ map: tglBadgeTex, roughness: 0.35, metalness: 0.6 }), darkTrimMat, darkTrimMat, darkTrimMat, darkTrimMat, darkTrimMat];
  const tglBadgeMatR = [darkTrimMat, new THREE.MeshStandardMaterial({ map: tglBadgeTex, roughness: 0.35, metalness: 0.6 }), darkTrimMat, darkTrimMat, darkTrimMat, darkTrimMat];

  const doorCardGeo = new THREE.BoxGeometry(0.04, 0.90, 1.72);
  const armrestGeo = new THREE.BoxGeometry(0.08, 0.10, 0.45);
  const innerHandleGeo = new THREE.BoxGeometry(0.03, 0.04, 0.10);
  const doorPocketGeo = new THREE.BoxGeometry(0.08, 0.28, 0.65);
  const sideTrimGeo = new THREE.BoxGeometry(0.024, 0.14, 1.80);

  // Linke Tür-Gruppe (Fahrerseite)
  const leftDoorGroup = new THREE.Group();
  leftDoorGroup.position.set(1.15, 1.08, 4.22);
  
  const leftWin = new THREE.Mesh(sideWindowGeo, glassMat);
  const leftMirrorTri = new THREE.Mesh(mirrorTriGeo, darkTrimMat);
  const leftDivider = new THREE.Mesh(winDividerGeo, darkTrimMat);
  leftDivider.position.set(0.02, 1.63, -1.45);

  const doorLeftAPillar = new THREE.Mesh(aPillarBeamGeo, paintMat);
  doorLeftAPillar.position.set(0.025, 1.52, -0.22);
  const doorLeftRoof = new THREE.Mesh(roofBeamGeo, paintMat);
  doorLeftRoof.position.set(0.025, 2.18, -1.13);
  const doorLeftBPillar = new THREE.Mesh(bPillarBeamGeo, paintMat);
  doorLeftBPillar.position.set(0.025, 1.63, -1.82);

  const leftPanel = new THREE.Mesh(doorPanelGeo, paintMat);
  const leftCrease = new THREE.Mesh(bodyCreaseGeo, paintMat);
  leftCrease.position.set(0.074, 0.58, -0.90);

  const leftBadge = new THREE.Mesh(tglBadgeGeo, tglBadgeMatL);
  leftBadge.position.set(0.076, 0.94, -1.30);
  
  const leftHandlePocket = new THREE.Mesh(handlePocketGeo, darkTrimMat);
  leftHandlePocket.position.set(0.074, 0.58, -1.68);
  const leftHandleBar = new THREE.Mesh(handleBarGeo, darkTrimMat);
  leftHandleBar.position.set(0.086, 0.58, -1.68);
  
  const leftTrimObj = new THREE.Mesh(sideTrimGeo, darkTrimMat);
  leftTrimObj.position.set(0.074, 0.0, -0.90);
  
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
  const rightDoorGroup = new THREE.Group();
  rightDoorGroup.position.set(-1.15, 1.08, 4.22);
  
  const rightWin = new THREE.Mesh(sideWindowGeo, glassMat);
  rightWin.scale.set(-1, 1, 1);
  const rightMirrorTri = new THREE.Mesh(mirrorTriGeo, darkTrimMat);
  rightMirrorTri.scale.set(-1, 1, 1);
  const rightDivider = new THREE.Mesh(winDividerGeo, darkTrimMat);
  rightDivider.position.set(-0.02, 1.63, -1.45);

  const doorRightAPillar = new THREE.Mesh(aPillarBeamGeo, paintMat);
  doorRightAPillar.position.set(-0.025, 1.52, -0.22);
  const doorRightRoof = new THREE.Mesh(roofBeamGeo, paintMat);
  doorRightRoof.position.set(-0.025, 2.18, -1.13);
  const doorRightBPillar = new THREE.Mesh(bPillarBeamGeo, paintMat);
  doorRightBPillar.position.set(-0.025, 1.63, -1.82);

  const rightPanel = new THREE.Mesh(doorPanelGeo, paintMat);
  rightPanel.scale.set(-1, 1, 1);
  
  const rightCrease = new THREE.Mesh(bodyCreaseGeo, paintMat);
  rightCrease.position.set(-0.074, 0.58, -0.90);

  const rightBadge = new THREE.Mesh(tglBadgeGeo, tglBadgeMatR);
  rightBadge.position.set(-0.076, 0.94, -1.30);
  
  const rightHandlePocket = new THREE.Mesh(handlePocketGeo, darkTrimMat);
  rightHandlePocket.position.set(-0.074, 0.58, -1.68);
  const rightHandleBar = new THREE.Mesh(handleBarGeo, darkTrimMat);
  rightHandleBar.position.set(-0.086, 0.58, -1.68);
  
  const rightTrimObj = new THREE.Mesh(sideTrimGeo, darkTrimMat);
  rightTrimObj.position.set(-0.074, 0.0, -0.90);
  
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

  // 3.10 Umfassendes 4-Spiegel-Sicherheitssystem
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

    const headMain = new THREE.Mesh(mirrorMainGeo, darkTrimMat);
    headMain.position.set(0.36 * s, 0.12, 0);
    const glassMain = new THREE.Mesh(glassMainGeo, glassMat);
    glassMain.position.set(0.36 * s, 0.12, -0.015);
    
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



  // Front-Anfahrspiegel
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

  // 8. Räder & Kotflügel
  const tireRadius = 0.408;
  const tireWidth = 0.265;
  const rimRadius = 0.222;
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

  truck.add(createWheel(1.1, tireRadius, frontAxleZ));
  truck.add(createWheel(-1.1, tireRadius, frontAxleZ));
  truck.add(createWheel(1.1, tireRadius, rearAxleZ, true));
  truck.add(createWheel(-1.1, tireRadius, rearAxleZ, true));

  // =========================================================================
  // 🛞 Subagent 22.11: `truck_front_wheel_arch` - VORDERER RADKASTEN
  // =========================================================================
  
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

  const rearWingGeo = new RoundedBoxGeometry(0.12, 0.38, 0.14, 2, 0.02);
  const sideMarkerGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16);
  sideMarkerGeo.rotateZ(Math.PI / 2);
  const sideMarkerMat = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 1.8, roughness: 0.2 });

  const frontMudflapGeo = new THREE.BoxGeometry(0.025, 0.24, 0.26);
  const innerArchGeo = new THREE.CylinderGeometry(0.49, 0.49, 0.24, 24, 1, false, 0, Math.PI);
  innerArchGeo.rotateZ(Math.PI / 2);

  const stepHousingGeo = new RoundedBoxGeometry(0.20, 0.36, 0.46, 2, 0.02);
  const stepPlateGeo = new THREE.BoxGeometry(0.18, 0.035, 0.38);
  const ledStripGeo = new THREE.BoxGeometry(0.025, 0.032, 0.42);
  const ledStripMat = new THREE.MeshStandardMaterial({ color: '#ffaa00', emissive: '#ff8800', emissiveIntensity: 2.2, roughness: 0.1 });

  const createFrontWheelArch = (side: 'left' | 'right') => {
    const group = new THREE.Group();
    const s = side === 'left' ? 1 : -1;

    const archLipMesh = new THREE.Mesh(archLipGeo, paintMat);
    if (side === 'left') {
      archLipMesh.position.set(1.10, 0.41, frontAxleZ);
    } else {
      archLipMesh.position.set(-1.10, 0.41, frontAxleZ);
      archLipMesh.scale.set(-1, 1, 1);
    }
    group.add(archLipMesh);

    const rearWing = new THREE.Mesh(rearWingGeo, paintMat);
    rearWing.position.set(1.16 * s, 0.36, frontAxleZ - 0.52);
    group.add(rearWing);

    const marker = new THREE.Mesh(sideMarkerGeo, sideMarkerMat);
    marker.position.set(1.23 * s, 0.44, frontAxleZ - 0.52);
    group.add(marker);

    const frontMudflap = new THREE.Mesh(frontMudflapGeo, plasticMat);
    frontMudflap.position.set(1.12 * s, 0.14, frontAxleZ - 0.52);
    group.add(frontMudflap);

    const innerArch = new THREE.Mesh(innerArchGeo, darkTrimMat);
    innerArch.position.set(0.86 * s, 0.41, frontAxleZ);
    group.add(innerArch);

    const stepHousing = new THREE.Mesh(stepHousingGeo, darkTrimMat);
    stepHousing.position.set(1.04 * s, 0.46, 2.66);
    const lowerStep = new THREE.Mesh(stepPlateGeo, silverMat);
    lowerStep.position.set(1.08 * s, 0.40, 2.66);
    const upperStep = new THREE.Mesh(stepPlateGeo, silverMat);
    upperStep.position.set(1.02 * s, 0.70, 2.66);
    group.add(stepHousing, lowerStep, upperStep);

    const ledStrip = new THREE.Mesh(ledStripGeo, ledStripMat);
    ledStrip.position.set(1.21 * s, 0.86, 2.66);
    group.add(ledStrip);

    return group;
  };
  truck.add(createFrontWheelArch('left'));
  truck.add(createFrontWheelArch('right'));

  // Kotflügel Rear
  const mudguardRearGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 16, 1, false, 0, Math.PI);
  mudguardRearGeo.rotateZ(Math.PI / 2);
  const createRearMudguard = (x: number, y: number, z: number) => {
    const mud = new THREE.Mesh(mudguardRearGeo, plasticMat);
    mud.position.set(x, y, z);
    return mud;
  };
  truck.add(createRearMudguard(1.1, 0.45, rearAxleZ));
  truck.add(createRearMudguard(-1.1, 0.45, rearAxleZ));

  return {
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
    loadEdgeHeight,
    kofferBackZ,
    textures: [
      grillTex,
      plateTex,
      hlTex,
      tglBadgeTex,
      dashTex,
      windshieldTex,
      ...boxBodyResult.disposables.textures,
      tailLiftTex,
      rearLightTexL,
      rearLightTexR,
      sideMarkerTex,
    ],
  };
}
