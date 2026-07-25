import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { 
  SupertechnoMetalShader, 
  CastIronWeightShader, 
  HazardStripeShader, 
  HydraulicChromeShader,
  createLengthScaleTexture,
  createBrandBadgeTexture,
  createWarningDecalTexture,
  createCheckerplateTexture
} from '../shaders/craneShaders.js';

/**
 * Supertechno 50+ 100% Authentic Mechanical 3D Mesh Model
 * Matching every frame and photo from reference materials:
 * - ZIF Remote 3-Axis Gyro Head with Top Heat Sink, Bellows, L1-L5 Scale & Spirit Level
 * - Arm Section 1 with 38'-18' Length Scale Bar & SUPERTECHNO 50 PLUS Badge
 * - Side Enclosure with 3 Cooling Fans in a row & Red E-Stop Mushroom Button
 * - Transparent Plexiglass Side Panels with WARNING Decals
 * - Pedestal Column with 4 Triangular Gusset Ribs & Slewing Ring Cable Coil
 * - Cast Iron Counterweight Carriage with Stenciled "445" Bricks & Spindle Handwheel
 * - Rear Pulley Drive Belt Wheel & Top Safety Cage
 * - Base Dolly with Diamond Plate Steel, Yellow Wheel Chocks & EZION Box
 */
export class Supertechno50Model {
  constructor() {
    this.group = new THREE.Group();
    this.isModelLoaded = false;

    // Procedural Textures
    this.texLengthScale = createLengthScaleTexture();
    this.texBrandBadge = createBrandBadgeTexture();
    this.texWarningDecal = createWarningDecalTexture();
    this.texCheckerplate = createCheckerplateTexture();

    // Authentic Manufacturer Materials
    this.matChassisDark = new THREE.ShaderMaterial({
      ...SupertechnoMetalShader,
      uniforms: {
        ...SupertechnoMetalShader.uniforms,
        uBaseColor: { value: new THREE.Color(0x14171d) } // Matte Dark Anthracite Black
      }
    });

    this.matAluminumExtrusion = new THREE.MeshStandardMaterial({
      color: 0x8a939d,
      metalness: 0.94,
      roughness: 0.2
    });
    // Heat‑Sink polished metal material for remote head
    this.matHeatSink = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.95, roughness: 0.15 });

    this.matCastIronWeight = new THREE.ShaderMaterial(CastIronWeightShader);
    this.matHazard = new THREE.ShaderMaterial(HazardStripeShader);
    this.matChrome = new THREE.ShaderMaterial(HydraulicChromeShader);

    this.matYellowAccent = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.65,
      roughness: 0.25
    });

    this.matRedStrap = new THREE.MeshStandardMaterial({
      color: 0xee2222,
      roughness: 0.7
    });

    this.matOrangeStrap = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      roughness: 0.7
    });

    this.matBlackRubber = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.92
    });

    this.matBellowsAccordion = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.85
    });

    this.matCameraBody = new THREE.MeshStandardMaterial({
      color: 0x121418,
      metalness: 0.90,
      roughness: 0.20
    });

    this.matGlassLens = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      opacity: 1,
      transparent: true,
      roughness: 0.02,
      ior: 1.52
    });

    this.matPlexiglassWindow = new THREE.MeshPhysicalMaterial({
      color: 0x99ccff,
      transmission: 0.85,
      opacity: 0.6,
      transparent: true,
      roughness: 0.1
    });

    this.matOledScreen = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.matScaleText = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.matRedEStop = new THREE.MeshStandardMaterial({ color: 0xee1122, roughness: 0.3 });

    // Cable Connector Mats (LEMO / Neutrik Plugs)
    this.matCableRed = new THREE.MeshStandardMaterial({ color: 0xee2233, roughness: 0.3 });
    this.matCableGreen = new THREE.MeshStandardMaterial({ color: 0x22cc44, roughness: 0.3 });
    this.matCableBlue = new THREE.MeshStandardMaterial({ color: 0x2288ff, roughness: 0.3 });
    this.matCableYellow = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3 });

    // Material with Textures
    this.matLengthScale = new THREE.MeshBasicMaterial({
      map: this.texLengthScale,
      transparent: true
    });

    this.matBrandBadge = new THREE.MeshBasicMaterial({
      map: this.texBrandBadge,
      transparent: true
    });

    this.matWarningDecal = new THREE.MeshBasicMaterial({
      map: this.texWarningDecal,
      transparent: true
    });

    this.matCheckerplateFloor = new THREE.MeshStandardMaterial({
      map: this.texCheckerplate,
      metalness: 0.85,
      roughness: 0.35
    });

    // Kinematic Graph Transformation Nodes
    this.nodeDolly = new THREE.Group();
    this.nodeColumn = new THREE.Group();
    this.nodeBasePan = new THREE.Group();
    this.nodeBoomTilt = new THREE.Group();
    this.nodeSec1Outer = new THREE.Group();
    this.nodeSec2Inner = new THREE.Group();
    this.nodeSec3Inner = new THREE.Group();
    this.nodeSec4Inner = new THREE.Group();
    this.nodeCounterweight = new THREE.Group();
    this.nodeCascadeCables = new THREE.Group();
    this.nodeHeadPan = new THREE.Group();
    this.nodeHeadTilt = new THREE.Group();
    this.nodeHeadRoll = new THREE.Group();
    this.nodeCamera = new THREE.Group();

    this.buildModel();
  }

  hideProceduralMeshes() {
    const nodesToHide = [
      this.nodeDolly, this.nodeColumn, this.nodeBasePan, 
      this.nodeBoomTilt, this.nodeSec1Outer, this.nodeSec2Inner, 
      this.nodeSec3Inner, this.nodeSec4Inner, this.nodeCounterweight, 
      this.nodeCascadeCables, this.nodeHeadPan, this.nodeHeadTilt, 
      this.nodeHeadRoll, this.nodeCamera
    ];
    
    nodesToHide.forEach(node => {
      node.traverse((child) => {
        if (child.isMesh) {
          child.visible = false;
        }
      });
    });
  }

  buildModel() {
    // this.buildTrack(); // Rails disabled
    this.buildChassis();
    this.buildColumn();
    // this.buildTurntable(); // removed per user request
    this.buildFulcrum();
    this.buildCounterweightSystem();
    this.buildTelescopicArm();
    this.buildBracingStruts();
    this.buildSafetyCage();
    this.buildCascadeCables();
    this.buildRemoteHead(); // Restored remote head
    this.buildCinemaCamera();

    // Kinematic Graph Assembly
    this.group.add(this.nodeDolly);
    this.nodeDolly.add(this.nodeColumn);
    this.nodeColumn.add(this.nodeBasePan);
    this.nodeBasePan.add(this.nodeBoomTilt);

    this.nodeBoomTilt.add(this.nodeSec1Outer);
    this.nodeBoomTilt.add(this.nodeCounterweight);

    this.nodeSec1Outer.add(this.nodeSec2Inner);
    this.nodeSec2Inner.add(this.nodeSec3Inner);
    this.nodeSec3Inner.add(this.nodeSec4Inner);
    this.nodeSec1Outer.add(this.nodeCascadeCables);

    this.nodeSec4Inner.add(this.nodeHeadPan);
    // Shift the pivot point of the head to the tip of the crane
    this.nodeHeadPan.position.set(0, 1.88, 3.85);

    this.nodeHeadPan.add(this.nodeHeadTilt);
    this.nodeHeadTilt.add(this.nodeHeadRoll);
    this.nodeHeadRoll.add(this.nodeCamera);
  }

  buildTrack() {
    const trackGroup = new THREE.Group();
    const trackLength = 40.0;
    const trackGauge = 1.0;

    const railGeo = new THREE.CylinderGeometry(0.045, 0.045, trackLength, 16);
    railGeo.rotateX(Math.PI / 2);

    const railLeft = new THREE.Mesh(railGeo, this.matChrome);
    railLeft.position.set(-trackGauge / 2, 0.045, 0);
    const railRight = new THREE.Mesh(railGeo, this.matChrome);
    railRight.position.set(trackGauge / 2, 0.045, 0);

    trackGroup.add(railLeft, railRight);

    const tieGeo = new THREE.BoxGeometry(1.25, 0.05, 0.12);
    for (let z = -trackLength / 2; z <= trackLength / 2; z += 1.2) {
      const tie = new THREE.Mesh(tieGeo, this.matChassisDark);
      tie.position.set(0, 0.025, z);
      trackGroup.add(tie);
    }

    this.group.add(trackGroup);
  }

  buildChassis() {
    // Heavy Steel Chassis Frame with Diamond Plate Floor Deck (From photos 3.jpeg & 4.jpeg)
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.38, 2.45), this.matChassisDark);
    baseMesh.position.y = 0.46;

    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.02, 2.40), this.matCheckerplateFloor);
    deckMesh.position.y = 0.66;
    this.nodeDolly.add(baseMesh, deckMesh);

    // Treaded Rubber Tires (Twin tires per corner as seen in video 15.18.23)
    const tireGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 24);
    tireGeo.rotateZ(Math.PI / 2);

    const tireCoords = [
      [-0.75, 0.26, -1.0], [0.75, 0.26, -1.0],
      [-0.75, 0.26, 1.0],  [0.75, 0.26, 1.0]
    ];

    tireCoords.forEach(([x, y, z]) => {
      const tire = new THREE.Mesh(tireGeo, this.matBlackRubber);
      tire.position.set(x, y, z);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.19, 16), this.matChrome);
      hub.rotateZ(Math.PI / 2);
      hub.position.set(x, y, z);

      // Yellow Wheel Chocks / Wedges under tires (From 4.jpeg)
      const chock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.28), this.matYellowAccent);
      chock.position.set(x, 0.06, z + (z > 0 ? 0.25 : -0.25));

      this.nodeDolly.add(tire, hub, chock);
    });

    // Outriggers with Threaded Brass Leveling Jack Screws (From 4.jpeg)
    const outriggerCoords = [
      [-0.94, 0.46, -1.1, -Math.PI / 4],
      [0.94, 0.46, -1.1, Math.PI / 4],
      [-0.94, 0.46, 1.1, -Math.PI * 0.75],
      [0.94, 0.46, 1.1, Math.PI * 0.75]
    ];

    outriggerCoords.forEach(([x, y, z, angle]) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 16), this.matChassisDark);
      pad.position.set(x + Math.sin(angle) * 0.45, 0.08, z + Math.cos(angle) * 0.45);

      const brassScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 12), this.matYellowAccent);
      brassScrew.position.set(x + Math.sin(angle) * 0.45, 0.35, z + Math.cos(angle) * 0.45);

      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, 0.04), this.matChassisDark);
      handle.position.set(x + Math.sin(angle) * 0.45, 0.6, z + Math.cos(angle) * 0.45);

      this.nodeDolly.add(pad, brassScrew, handle);
    });

    // Deck-Mounted "EZION" Power Junction & Distribution Box (From mov1.mp4 01:21)
    const ezionBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.42), this.matChassisDark);
    ezionBox.position.set(0.45, 0.77, 0.7);

    for (let p = 0; p < 4; p++) {
      const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12), this.matChrome);
      plug.position.set(0.25 + (p * 0.1), 0.88, 0.85);
      this.nodeDolly.add(plug);
    }
    this.nodeDolly.add(ezionBox);

    // Orange & Red Ratchet Transport Tie-Down Straps (From mov1.mp4 01:13 & 3.jpeg)
    const strapGeo = new THREE.BoxGeometry(0.06, 0.02, 1.3);
    const strap1 = new THREE.Mesh(strapGeo, this.matOrangeStrap);
    strap1.position.set(-0.65, 0.4, -0.2);
    strap1.rotateY(Math.PI / 5);
    strap1.rotateZ(Math.PI / 4);

    const strap2 = new THREE.Mesh(strapGeo, this.matRedStrap);
    strap2.position.set(0.65, 0.4, 0.2);
    strap2.rotateY(-Math.PI / 5);
    strap2.rotateZ(-Math.PI / 4);

    this.nodeDolly.add(strap1, strap2);

    // Operator Chair & Swivel Console (From 3.jpeg)
    const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12), this.matChassisDark);
    chairBase.position.set(0.65, 0.85, -0.85);

    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), this.matBlackRubber);
    chairSeat.position.set(0.65, 1.05, -0.85);

    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.06), this.matBlackRubber);
    chairBack.position.set(0.65, 1.3, -1.05);

    this.nodeDolly.add(chairBase, chairSeat, chairBack);
  }

  buildColumn() {
    // Tapered Main Pedestal Column (From photos 3.jpeg & 4.jpeg)
    const outerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.25, 24), this.matChassisDark);
    outerCol.position.y = 1.08;
    this.nodeDolly.add(outerCol);

    // 4 Vertical Triangular Gusset Support Ribs at Column Base (From photos 3.jpeg & 4.jpeg)
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2;
      const gussetShape = new THREE.Shape();
      gussetShape.moveTo(0, 0);
      gussetShape.lineTo(0.35, 0);
      gussetShape.lineTo(0, 0.65);
      gussetShape.closePath();

      const extrudeSettings = { depth: 0.03, bevelEnabled: false };
      const gussetGeo = new THREE.ExtrudeGeometry(gussetShape, extrudeSettings);
      const gusset = new THREE.Mesh(gussetGeo, this.matChassisDark);
      gusset.rotation.y = angle;
      gusset.position.set(0, 0.67, 0);
      this.nodeDolly.add(gusset);
    }

    // Two Inner Telescoping Columns with Chrome Finish
    const innerCol1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.2, 24), this.matChrome);
    innerCol1.position.y = 0.6;

    const innerCol2 = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 1.2, 24), this.matChrome);
    innerCol2.position.y = 1.1;

    this.nodeColumn.add(innerCol1, innerCol2);
  }

  buildTurntable() {
    // Slewing Ring (Turntable) with Coiled Gray Umbilical Cable (From mov1.mp4 00:26 & 4.jpeg)
    const ringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.18, 32), this.matChassisDark);
    ringMesh.position.y = 1.75;

    const silverEncoder = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 32), this.matChrome);
    silverEncoder.position.y = 1.84;

    // Coiled Gray Cable Bundle around Pedestal Column
    const cableCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.06, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.6 })
    );
    cableCoil.rotateX(Math.PI / 2);
    cableCoil.position.set(0, 1.68, 0);

    this.nodeBasePan.add(ringMesh, silverEncoder, cableCoil);
  }

  buildFulcrum() {
    // Trunnion Pivot Fork Stands with "SR" Logo Badge (From mov1.mp4 00:29)
    const forkLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.88, 0.44), this.matChassisDark);
    forkLeft.position.set(-0.38, 2.18, 0);
    const forkRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.88, 0.44), this.matChassisDark);
    forkRight.position.set(0.38, 2.18, 0);

    // "SR" (Supertechno / Technocrane) Metallic Logo Badge
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.16, 0.22), this.matScaleText);
    badge.position.set(-0.445, 2.35, 0);

    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.86, 24), this.matChrome);
    axle.rotateZ(Math.PI / 2);
    axle.position.set(0, 2.48, 0);

    // Friction Clamp Brake Levers
    const tiltBrakeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), this.matYellowAccent);
    tiltBrakeLeft.position.set(-0.46, 2.18, 0.15);

    this.nodeBasePan.add(forkLeft, forkRight, badge, axle, tiltBrakeLeft);
  }

  buildCounterweightSystem() {
    // Top Counterweight Guide Rails (Matte Dark Steel)
    const railMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 2.7), this.matChassisDark);
    railMesh.position.set(0, 2.48, -1.35);
    this.nodeBoomTilt.add(railMesh);

    // Steel Counterweight Carriage Frame
    const carriageFrame = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.60, 0.88), this.matChassisDark);
    carriageFrame.position.set(0, 2.48, 0);
    this.nodeCounterweight.add(carriageFrame);

    // 60x Cast Iron Counterweight Bricks with Stenciled Serial Number "445" (From mov1.mp4 00:47)
    for (let i = 0; i < 10; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.048, 0.82), this.matCastIronWeight);
      plate.position.set(0, -0.22 + (i * 0.048), 0);

      // Stenciled Serial Number Badge ("445" / "305")
      const stampText = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.01), this.matScaleText);
      stampText.position.set(0, -0.22 + (i * 0.048), 0.415);

      // Retaining Threaded Bolts
      const boltL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 12), this.matChrome);
      boltL.position.set(-0.33, 0, 0);
      const boltR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 12), this.matChrome);
      boltR.position.set(0.33, 0, 0);

      this.nodeCounterweight.add(plate, stampText, boltL, boltR);
    }

    // Lead-Screw Spindle Handwheel for Fine Weight Adjustment (From mov1.mp4 00:43)
    const spindleWheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 12, 24), this.matChrome);
    spindleWheel.position.set(0, 2.82, -2.65);
    this.nodeBoomTilt.add(spindleWheel);

    // Rear Pulley Drive Belt Wheel (From video 15.18.23 00:00)
    const pulleyWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 24), this.matChassisDark);
    pulleyWheel.rotateZ(Math.PI / 2);
    pulleyWheel.position.set(-0.35, 2.48, -2.55);
    this.nodeBoomTilt.add(pulleyWheel);

    // Dual Swivel Operator Monitors (From mov1.mp4 01:02 & 4.jpeg)
    const sideElectronics = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.48, 1.25), this.matChassisDark);
    sideElectronics.position.set(-0.36, 2.08, -0.6);

    const monFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.54), this.matChassisDark);
    monFrame.position.set(-0.36, 1.78, -0.9);
    const monScreen = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.30, 0.50), this.matOledScreen);
    monScreen.position.set(-0.385, 1.78, -0.9);

    this.nodeBoomTilt.add(sideElectronics, monFrame, monScreen);
  }

  buildTelescopicArm() {
    // Section 1 Outer Arm Body in Matte Dark Anthracite Steel
    const sec1Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 5.35), this.matChassisDark);
    sec1Mesh.position.set(0, 2.48, 2.675);
    this.nodeSec1Outer.add(sec1Mesh);

    // ---- Cable Routing Visualization ----
    // Create a thin black cable that follows the arm length.
    // Initial length matches the static part of the arm (5.35 units).
    const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, 5.35, 8);
    // Use existing black rubber material for visibility.
    const cableMat = this.matCableYellow.clone();
    cableMat.transparent = false;
    this.cableMesh = new THREE.Mesh(cableGeo, cableMat);
    // Align the cylinder along the Z axis (the arm direction).
    this.cableMesh.rotation.x = Math.PI / 2;
    // Position the cable at the start of the arm (center of sec1 mesh).
    this.cableMesh.position.set(0, 2.48, 2.675);
    this.nodeSec1Outer.add(this.cableMesh);

    // Length Scale Bar (38' to 18' in feet) Along Top Edge of Section 1 (From photos 3.jpeg & 4.jpeg)
    const scaleGeo = new THREE.PlaneGeometry(4.8, 0.12);
    const scaleMeshL = new THREE.Mesh(scaleGeo, this.matLengthScale);
    scaleMeshL.position.set(-0.285, 2.74, 2.65);
    scaleMeshL.rotateY(-Math.PI / 2);

    const scaleMeshR = new THREE.Mesh(scaleGeo, this.matLengthScale);
    scaleMeshR.position.set(0.285, 2.74, 2.65);
    scaleMeshR.rotateY(Math.PI / 2);

    this.nodeSec1Outer.add(scaleMeshL, scaleMeshR);

    // Transparent Plexiglass Side Protection Shields (From mov1.mp4 & 3.jpeg)
    const glassWindowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.40, 3.6), this.matPlexiglassWindow);
    glassWindowLeft.position.set(-0.285, 2.48, 2.65);
    const glassWindowRight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.40, 3.6), this.matPlexiglassWindow);
    glassWindowRight.position.set(0.285, 2.48, 2.65);
    this.nodeSec1Outer.add(glassWindowLeft, glassWindowRight);

    // Acrylic Branding Badge: `SUPERTECHNO 50 PLUS` with Yellow Rectangle (From 3.jpeg & 4.jpeg)
    const brandGeo = new THREE.PlaneGeometry(2.4, 0.28);
    const brandMeshL = new THREE.Mesh(brandGeo, this.matBrandBadge);
    brandMeshL.position.set(-0.295, 2.48, 2.65);
    brandMeshL.rotateY(-Math.PI / 2);

    const brandMeshR = new THREE.Mesh(brandGeo, this.matBrandBadge);
    brandMeshR.position.set(0.295, 2.48, 2.65);
    brandMeshR.rotateY(Math.PI / 2);

    this.nodeSec1Outer.add(brandMeshL, brandMeshR);

    // WARNING Safety Decal Badge (From mov1.mp4 00:51)
    const warnGeo = new THREE.PlaneGeometry(0.6, 0.3);
    const warnMesh = new THREE.Mesh(warnGeo, this.matWarningDecal);
    warnMesh.position.set(-0.295, 2.15, 2.0);
    warnMesh.rotateY(-Math.PI / 2);
    this.nodeSec1Outer.add(warnMesh);

    // Side Electronics Box with 3 Cooling Fans in a row + Red E-Stop Mushroom Button (From mov1.mp4 00:50 - 00:54)
    const fanBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.38, 1.4), this.matChassisDark);
    fanBox.position.set(-0.39, 2.08, 1.5);

    // 3 Circular Cooling Fans
    for (let f = 0; f < 3; f++) {
      const fanRim = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.015, 12, 24), this.matChrome);
      fanRim.rotateY(Math.PI / 2);
      fanRim.position.set(-0.505, 2.08, 1.05 + (f * 0.45));

      const fanGrill = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 16), this.matBlackRubber);
      fanGrill.rotateZ(Math.PI / 2);
      fanGrill.position.set(-0.50, 2.08, 1.05 + (f * 0.45));

      this.nodeSec1Outer.add(fanRim, fanGrill);
    }

    // Red Emergency Stop Push Button (From mov1.mp4 00:51)
    const estopBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), this.matYellowAccent);
    estopBase.position.set(-0.50, 2.08, 2.35);

    const estopButton = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16), this.matRedEStop);
    estopButton.rotateZ(Math.PI / 2);
    estopButton.position.set(-0.53, 2.08, 2.35);

    this.nodeSec1Outer.add(fanBox, estopBase, estopButton);

    // Section 2
    const sec2Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 4.3), this.matAluminumExtrusion);
    sec2Mesh.position.set(0, 2.48, 2.15);
    this.nodeSec2Inner.add(sec2Mesh);

    // Section 3
    const sec3Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 4.1), this.matAluminumExtrusion);
    sec3Mesh.position.set(0, 2.48, 2.05);
    this.nodeSec3Inner.add(sec3Mesh);

    // Section 4 Tip
    const sec4Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 3.9), this.matAluminumExtrusion);
    sec4Mesh.position.set(0, 2.48, 1.95);
    this.nodeSec4Inner.add(sec4Mesh);
  }

  buildBracingStruts() {
    const strutMat = this.matChassisDark;

    // Top Longitudinal Tension Brace Rods
    const topRodFront = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 4.6, 12), strutMat);
    topRodFront.rotateX(Math.PI / 2.3);
    topRodFront.position.set(0, 2.98, 3.25);

    const topRodBack = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.9, 12), strutMat);
    topRodBack.rotateX(-Math.PI / 2.4);
    topRodBack.position.set(0, 2.98, -0.45);

    this.nodeSec1Outer.add(topRodFront, topRodBack);
  }

  buildSafetyCage() {
    // Outer Tubular Guard Rails Framing Top Rear Arm (From mov1.mp4 00:31 & 3.jpeg)
    const cageMat = this.matChassisDark;

    const railTopL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.6, 12), cageMat);
    railTopL.rotateX(Math.PI / 2);
    railTopL.position.set(-0.46, 3.22, 0.5);

    const railTopR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.6, 12), cageMat);
    railTopR.rotateX(Math.PI / 2);
    railTopR.position.set(0.46, 3.22, 0.5);

    for (let z = -2.2; z <= 3.2; z += 1.2) {
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 12), cageMat);
      postL.position.set(-0.46, 2.82, z);

      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 12), cageMat);
      postR.position.set(0.46, 2.82, z);

      this.nodeBoomTilt.add(postL, postR);
    }

    this.nodeBoomTilt.add(railTopL, railTopR);
  }

  buildCascadeCables() {
    // Hanging Cable Carrier Loops along Top Guide Rail (From mov1.mp4 01:36 & 3.jpeg)
    for (let i = 0; i < 10; i++) {
      const loopGeo = new THREE.TorusGeometry(0.26, 0.025, 12, 24, Math.PI);
      const loopMesh = new THREE.Mesh(loopGeo, this.matBlackRubber);
      loopMesh.rotateY(Math.PI / 2);
      loopMesh.position.set(-0.36, 2.08, 0.5 + (i * 0.42));

      this.nodeCascadeCables.add(loopMesh);
    }
  }

  buildRemoteHead() {

    // 3. Bellows (stack of torus rings)
    for (let b = 0; b < 6; b++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 12, 24), this.matBellowsAccordion);
      ring.rotateX(Math.PI / 2);
      ring.position.set(0, 0.66 - b * 0.04, 0);
      this.nodeHeadPan.add(ring);
    }

    // 4. Scale rods L1-L5 (vertical guide columns)
    const rodSpacing = 0.07; // approximate spacing between L-labels
    for (let i = 0; i < 5; i++) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 16), this.matChrome);
      rod.position.set(-0.28 + i * rodSpacing, 0.27, 0);
      this.nodeHeadPan.add(rod);
      // optional numeric decal could be added here using a texture material
    }

    // 5. Spirit-level vial (transparent glass)
    const spiritLevel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 12), this.matGlassLens);
    spiritLevel.rotateZ(Math.PI / 2);
    spiritLevel.position.set(0, 0.40, 0);
    this.nodeHeadPan.add(spiritLevel);

    // 6. LEMO plugs (yellow, blue, green, red)
    const cableMats = [this.matCableYellow, this.matCableBlue, this.matCableGreen, this.matCableRed];
    for (let c = 0; c < 4; c++) {
      const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 12), cableMats[c]);
      plug.position.set(-0.22 + c * 0.05, 0.50, -0.13);
      this.nodeHeadPan.add(plug);
    }

    // 7. Outer horseshoe yoke ring
    const rollRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 16, 32), this.matChassisDark);
    rollRing.position.set(0, 0, 0);
    this.nodeHeadRoll.add(rollRing);

    // 8. Optional cable bundle around the yoke (simple cylinder for visibility)
    const cableBundle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12), this.matCableYellow);
    cableBundle.rotation.x = Math.PI / 2;
    cableBundle.position.set(0, 0, 0);
    this.nodeHeadRoll.add(cableBundle);
  }

  buildCinemaCamera() {
    // ARRI Alexa 35 Style Cinema Camera Rig (From mov1.mp4 00:03)
    const camGroup = new THREE.Group();

    // Body
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.38), this.matCameraBody);
    bodyMesh.position.set(0, 0, 0);

    // Matte Box Filter Tray
    const matteBox = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.21, 0.10), this.matChassisDark);
    matteBox.position.set(0, 0, 0.47);

    // Lens Barrel
    const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.30, 24), this.matCameraBody);
    lensBarrel.rotateX(Math.PI / 2);
    lensBarrel.position.set(0, 0, 0.27);

    // Glass Front Element
    const lensGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.02, 24), this.matGlassLens);
    lensGlass.rotateX(Math.PI / 2);
    lensGlass.position.set(0, 0, 0.42);

    // Top Handle & Battery Block
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.32), this.matChassisDark);
    handle.position.set(0, 0.18, 0);

    const battery = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.12), this.matChassisDark);
    battery.position.set(0, 0, -0.25);

    camGroup.add(bodyMesh, matteBox, lensBarrel, lensGlass, handle, battery);
    this.nodeCamera.add(camGroup);
  }

  updateNodes(kinematics) {
    this.nodeDolly.position.x = kinematics.dollyTrack;
    this.nodeColumn.position.y = kinematics.columnLift;

    this.nodeBasePan.rotation.y = THREE.MathUtils.degToRad(-kinematics.basePan);
    this.nodeBoomTilt.rotation.x = THREE.MathUtils.degToRad(kinematics.boomTilt);

    const segStroke = kinematics.teleExtension / 3.0;
    this.nodeSec2Inner.position.z = segStroke;
    this.nodeSec3Inner.position.z = segStroke;
    this.nodeSec4Inner.position.z = segStroke;

    this.nodeCascadeCables.scale.z = 1.0 + (kinematics.teleExtension * 0.18);

    // Manufacturer Dynamic Counterweight Carriage Kinematics:
    // As telescopic arm extends, counterweight carriage slides backward along rear tracks
    this.nodeCounterweight.position.z = - (kinematics.teleExtension * 0.28);

    // ---- Update cable mesh length ----
    if (this.cableMesh) {
      // Total arm length = static section (5.35) + dynamic teleExtension
      const totalLength = 5.35 + kinematics.teleExtension;
      // Scale the cylinder's Z axis to match total length (initial geometry length = 5.35)
      this.cableMesh.scale.set(1, totalLength / 5.35, 1);
      // Reposition the cable so its center stays at the start of the arm
      this.cableMesh.position.set(0, 2.48, 2.675 + totalLength / 2);
    }

    this.nodeHeadPan.rotation.y = THREE.MathUtils.degToRad(-kinematics.headPan);
    this.nodeHeadTilt.rotation.x = THREE.MathUtils.degToRad(kinematics.headTilt);
    this.nodeHeadRoll.rotation.z = THREE.MathUtils.degToRad(kinematics.headRoll);
  }
}
