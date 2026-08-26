import * as THREE from 'three';
import { Supertechno50FBXModel } from '../../model/Supertechno50FBXModel';
import { createCheckerplateTexture, createKnurlingTexture } from '../../materials/craneMaterials';

export interface RaceCraneRigResult {
  craneRoot: THREE.Group;
  craneModel: Supertechno50FBXModel;
  wheels: THREE.Group[];
  frontSteerKnuckles: THREE.Group[];
  updateKinematics: (
    pos: THREE.Vector3,
    heading: number,
    pitch: number,
    roll: number,
    speed: number,
    steerAngle: number,
    boomTilt: number,
    teleExtension: number,
    basePan: number,
    delta: number
  ) => void;
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  };
}

/**
 * 🏗️ Erzeugt das vollständige Supertechno 50 High-Speed Race Crane Rig
 * für das Grand Prix Duell LKW vs. Teleskopkran auf dem Red Bull Ring.
 */
export function createRaceSupertechnoCraneRig(onLoad?: () => void): RaceCraneRigResult {
  const craneRoot = new THREE.Group();
  craneRoot.name = 'RaceSupertechnoCraneRig';

  const disposables = {
    geometries: [] as THREE.BufferGeometry[],
    materials: [] as THREE.Material[],
    textures: [] as THREE.Texture[],
  };

  // Texturen
  const checkerplateTex = createCheckerplateTexture();
  const knurlingTex = createKnurlingTexture();
  disposables.textures.push(checkerplateTex, knurlingTex);

  // Materialien
  const matChassisDark = new THREE.MeshStandardMaterial({
    color: 0x141820,
    roughness: 0.38,
    metalness: 0.82,
  });
  const matRacingYellow = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.6,
  });
  const matCyanAccent = new THREE.MeshStandardMaterial({
    color: 0x00dcff,
    emissive: 0x00dcff,
    emissiveIntensity: 0.6,
    roughness: 0.25,
    metalness: 0.8,
  });
  const matDeck = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.35,
    metalness: 0.85,
    bumpMap: checkerplateTex,
    bumpScale: 0.05,
  });
  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.12,
    metalness: 0.98,
  });
  const matTireRubber = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.85,
    metalness: 0.08,
  });
  const matAlloyRim = new THREE.MeshStandardMaterial({
    color: 0xc4ccd8,
    roughness: 0.22,
    metalness: 0.95,
  });
  const matBrakeCaliper = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.3,
    metalness: 0.7,
  });
  const matBrakeRotor = new THREE.MeshStandardMaterial({
    color: 0x3e444c,
    roughness: 0.35,
    metalness: 0.9,
  });
  const matUnderglow = new THREE.MeshBasicMaterial({
    color: 0x00dcff,
    transparent: true,
    opacity: 0.7,
  });
  const matCameraBody = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.35,
    metalness: 0.8,
  });
  const matLensGlass = new THREE.MeshStandardMaterial({
    color: 0x003366,
    roughness: 0.05,
    metalness: 0.95,
  });
  const matTallyLight = new THREE.MeshBasicMaterial({
    color: 0xff0033,
  });

  disposables.materials.push(
    matChassisDark,
    matRacingYellow,
    matCyanAccent,
    matDeck,
    matChrome,
    matTireRubber,
    matAlloyRim,
    matBrakeCaliper,
    matBrakeRotor,
    matUnderglow,
    matCameraBody,
    matLensGlass,
    matTallyLight
  );

  // 1. FBX Supertechno 50 Model
  const craneModel = new Supertechno50FBXModel(() => {
    if (onLoad) onLoad();
  });
  craneRoot.add(craneModel.group);

  // 2. High-Speed Dolly Race Platform
  const dollyGroup = new THREE.Group();
  dollyGroup.name = 'CraneRaceDollyBase';

  // Haupt-Plattform
  const deckGeo = new THREE.BoxGeometry(2.4, 0.22, 4.4);
  disposables.geometries.push(deckGeo);
  const deckMesh = new THREE.Mesh(deckGeo, matDeck);
  deckMesh.position.set(0, 0.42, 0);
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  dollyGroup.add(deckMesh);

  // Seitenschweller & Racing Stripes (Gelb & Cyan)
  const sideGeo = new THREE.BoxGeometry(0.18, 0.24, 4.4);
  disposables.geometries.push(sideGeo);
  const sideL = new THREE.Mesh(sideGeo, matRacingYellow);
  sideL.position.set(-1.25, 0.42, 0);
  const sideR = new THREE.Mesh(sideGeo, matRacingYellow);
  sideR.position.set(1.25, 0.42, 0);
  dollyGroup.add(sideL, sideR);

  // Front-Splitter / Aerodynamischer Renndiffusor
  const splitterGeo = new THREE.BoxGeometry(2.6, 0.08, 0.8);
  disposables.geometries.push(splitterGeo);
  const frontSplitter = new THREE.Mesh(splitterGeo, matCyanAccent);
  frontSplitter.position.set(0, 0.22, -2.4);
  const rearDiffuser = new THREE.Mesh(splitterGeo, matChassisDark);
  rearDiffuser.position.set(0, 0.26, 2.4);
  dollyGroup.add(frontSplitter, rearDiffuser);

  // 4x Neon Ground-Effect Underglow Lights
  const underglowGeo = new THREE.PlaneGeometry(2.2, 4.0);
  disposables.geometries.push(underglowGeo);
  const underglow = new THREE.Mesh(underglowGeo, matUnderglow);
  underglow.rotation.x = -Math.PI * 0.5;
  underglow.position.set(0, 0.08, 0);
  dollyGroup.add(underglow);

  // 3. 4x Racing Räder & Bremsanlage
  const wheels: THREE.Group[] = [];
  const frontSteerKnuckles: THREE.Group[] = [];

  const wheelPositions = [
    { x: -1.35, y: 0.40, z: -1.6, isFront: true, isLeft: true },   // Vorne Links
    { x: 1.35, y: 0.40, z: -1.6, isFront: true, isLeft: false },   // Vorne Rechts
    { x: -1.35, y: 0.40, z: 1.6, isFront: false, isLeft: true },   // Hinten Links
    { x: 1.35, y: 0.40, z: 1.6, isFront: false, isLeft: false },   // Hinten Rechts
  ];

  const tireGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.32, 24);
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.33, 16);
  const rotorGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.04, 16);
  const caliperGeo = new THREE.BoxGeometry(0.12, 0.16, 0.10);
  disposables.geometries.push(tireGeo, rimGeo, rotorGeo, caliperGeo);

  wheelPositions.forEach((wp) => {
    const knuckle = new THREE.Group();
    knuckle.position.set(wp.x, wp.y, wp.z);

    const wheelGroup = new THREE.Group();
    wheelGroup.rotation.z = Math.PI * 0.5;

    // Reifen
    const tire = new THREE.Mesh(tireGeo, matTireRubber);
    tire.castShadow = true;
    tire.receiveShadow = true;

    // Felge
    const rim = new THREE.Mesh(rimGeo, matAlloyRim);
    // Bremsscheibe
    const rotor = new THREE.Mesh(rotorGeo, matBrakeRotor);
    rotor.position.y = wp.isLeft ? 0.08 : -0.08;

    wheelGroup.add(tire, rim, rotor);

    // Bremssattel (fest an der Achse montiert, dreht sich nicht mit dem Rad)
    const caliper = new THREE.Mesh(caliperGeo, matBrakeCaliper);
    caliper.position.set(0, 0.14, wp.isLeft ? 0.08 : -0.08);
    knuckle.add(caliper);

    knuckle.add(wheelGroup);
    dollyGroup.add(knuckle);

    wheels.push(wheelGroup);
    if (wp.isFront) {
      frontSteerKnuckles.push(knuckle);
    }
  });

  craneRoot.add(dollyGroup);

  // 4. ARRI Cinema Kamera Rig an der Krannase (Remote Head Payload)
  const cameraRig = new THREE.Group();
  cameraRig.name = 'CraneArriCinePayload';

  const bodyGeo = new THREE.BoxGeometry(0.38, 0.42, 0.55);
  const lensGeo = new THREE.CylinderGeometry(0.14, 0.15, 0.35, 20);
  const tallyGeo = new THREE.SphereGeometry(0.035, 12, 12);
  disposables.geometries.push(bodyGeo, lensGeo, tallyGeo);

  const camBody = new THREE.Mesh(bodyGeo, matCameraBody);
  const camLens = new THREE.Mesh(lensGeo, matLensGlass);
  camLens.rotation.x = Math.PI * 0.5;
  camLens.position.set(0, 0, -0.42);
  const tally = new THREE.Mesh(tallyGeo, matTallyLight);
  tally.position.set(0.14, 0.18, -0.28);

  cameraRig.add(camBody, camLens, tally);
  cameraRig.position.set(0, 3.2, -5.5);
  craneRoot.add(cameraRig);

  // Kinematik-Update-Funktion
  let totalWheelRot = 0;
  const updateKinematics = (
    pos: THREE.Vector3,
    heading: number,
    pitch: number,
    roll: number,
    speed: number,
    steerAngle: number,
    boomTilt: number,
    teleExtension: number,
    basePan: number,
    delta: number
  ) => {
    // 1. Wurzel-Position & Orientierung
    craneRoot.position.copy(pos);
    craneRoot.rotation.order = 'YXZ';
    craneRoot.rotation.y = heading;
    craneRoot.rotation.x = pitch;
    craneRoot.rotation.z = roll;

    // 2. Raddrehung synchron zur Fahrgeschwindigkeit
    const wheelRadius = 0.40;
    const angDist = (speed * delta) / wheelRadius;
    totalWheelRot += angDist;
    wheels.forEach((w) => {
      w.rotation.x = totalWheelRot;
    });

    // 3. Lenkwinkel der Vorderräder
    frontSteerKnuckles.forEach((k) => {
      k.rotation.y = steerAngle;
    });

    // 4. FBX Supertechno 50 Kinematik (Ausleger, Hubsäule, Neigung)
    craneModel.updateNodes({
      dollyTrack: 0,
      columnElevation: 2.10,
      boomTilt: boomTilt,
      teleExtension: teleExtension,
      basePan: basePan,
    });

    // 5. ARRI Kamera-Position folgt dynamisch dem Ausfahrzustand
    const armLength = 4.2 + teleExtension * 0.95;
    const radTilt = THREE.MathUtils.degToRad(boomTilt);
    const radPan = THREE.MathUtils.degToRad(basePan);
    cameraRig.position.set(
      -Math.sin(radPan) * Math.cos(radTilt) * armLength,
      2.10 + Math.sin(radTilt) * armLength + 0.35,
      -Math.cos(radPan) * Math.cos(radTilt) * armLength
    );
    cameraRig.rotation.y = radPan;
    cameraRig.rotation.x = radTilt;
  };

  return {
    craneRoot,
    craneModel,
    wheels,
    frontSteerKnuckles,
    updateKinematics,
    disposables,
  };
}
