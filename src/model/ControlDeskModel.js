import * as THREE from 'three';

/**
 * Procedural canvas texture generator for the authentic TECHNOHEAD Control Console top faceplate
 */
function createTechnoheadFaceplateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // 1. Deep Matte Dark Anodized Aluminum Base (#14161a)
  ctx.fillStyle = '#14161a';
  ctx.fillRect(0, 0, 2048, 1024);

  // Brushed aluminum micro surface grain
  for (let i = 0; i < 35000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.03)';
    ctx.fillRect(Math.random() * 2048, Math.random() * 1024, 2 + Math.random() * 4, 1);
  }

  // 2. Subtle Precision Chamfer / Border Guide Lines
  ctx.strokeStyle = '#282d35';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 1992, 968);
  ctx.strokeStyle = '#181b20';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, 1976, 952);

  // Hex Socket Screw Drawing
  const drawHexScrew = (x, y, r = 15) => {
    ctx.save();
    ctx.translate(x, y);
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.55, '#94a3b8');
    grad.addColorStop(1, '#334155');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const hx = Math.cos(a) * (r * 0.52);
      const hy = Math.sin(a) * (r * 0.52);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Perimeter Screws
  drawHexScrew(70, 60);
  drawHexScrew(440, 60);
  drawHexScrew(960, 60);
  drawHexScrew(1480, 60);
  drawHexScrew(1978, 60);

  drawHexScrew(70, 964);
  drawHexScrew(440, 964);
  drawHexScrew(960, 964);
  drawHexScrew(1690, 964);
  drawHexScrew(1978, 964);

  drawHexScrew(56, 360);
  drawHexScrew(56, 680);
  drawHexScrew(1992, 360);
  drawHexScrew(1992, 680);

  // 3. Top-Left: Focus / FIZ Wheel Cutout Frame & Screws
  const fwX = 350;
  const fwY = 240;
  ctx.fillStyle = '#090a0d';
  ctx.beginPath();
  ctx.roundRect(fwX - 110, fwY - 80, 220, 160, 14);
  ctx.fill();
  ctx.strokeStyle = '#333842';
  ctx.lineWidth = 4;
  ctx.stroke();
  drawHexScrew(fwX - 95, fwY - 65, 8);
  drawHexScrew(fwX + 95, fwY - 65, 8);
  drawHexScrew(fwX - 95, fwY + 65, 8);
  drawHexScrew(fwX + 95, fwY + 65, 8);

  // 4. Mid-Left: ROLL Knob Graphic & Calibration Arc
  const rollX = 630;
  const rollY = 260;
  ctx.save();
  ctx.translate(rollX, rollY);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 78, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-55, -55);
  ctx.lineTo(-40, -64);
  ctx.lineTo(-46, -48);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(55, -55);
  ctx.lineTo(46, -48);
  ctx.lineTo(40, -64);
  ctx.fill();

  ctx.font = '800 24px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROLL', 0, -96);

  for (let a = -Math.PI * 0.8; a <= -Math.PI * 0.2; a += Math.PI * 0.1) {
    const x1 = Math.cos(a) * 62;
    const y1 = Math.sin(a) * 62;
    const x2 = Math.cos(a) * 68;
    const y2 = Math.sin(a) * 68;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Lower-Left: W/T Rocker Switch Bezel & Screws
  const rkX = 630;
  const rkY = 510;
  ctx.save();
  ctx.translate(rkX, rkY);
  ctx.fillStyle = '#090a0d';
  ctx.beginPath();
  ctx.roundRect(-46, -96, 92, 192, 8);
  ctx.fill();
  ctx.strokeStyle = '#2d333b';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawHexScrew(0, -80, 9);
  drawHexScrew(0, 80, 9);
  ctx.restore();

  // 6. Upper-Right: Joystick Base Plate & Screws
  const joyX = 1320;
  const joyY = 260;
  ctx.save();
  ctx.translate(joyX, joyY);
  ctx.fillStyle = '#0a0c10';
  ctx.beginPath();
  ctx.roundRect(-125, -125, 250, 250, 10);
  ctx.fill();
  ctx.strokeStyle = '#2d333b';
  ctx.lineWidth = 4;
  ctx.stroke();

  drawHexScrew(-100, -100, 11);
  drawHexScrew(100, -100, 11);
  drawHexScrew(-100, 100, 11);
  drawHexScrew(100, 100, 11);
  ctx.restore();

  // 7. Top-Right: Status LED Bezel
  const ledX = 1600;
  const ledY = 200;
  ctx.save();
  ctx.translate(ledX, ledY);
  drawHexScrew(0, 0, 16);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 8. 🌟 PROMINENT "TECHNOHEAD" LOGO
  ctx.save();
  ctx.translate(1480, 520);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 68px "Arial Black", "Helvetica Neue", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TECHNOHEAD', 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural canvas texture generator for the Rocker Switch paddle (W / T)
 */
function createRockerPaddleFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 256, 512);

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#272a30');
  grad.addColorStop(0.5, '#0f1115');
  grad.addColorStop(1, '#272a30');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', 128, 120);
  ctx.fillText('T', 128, 392);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 🎛️ Full 3D Model class for the authentic TECHNOHEAD Control Console
 */
export class ControlDeskModel {
  constructor() {
    this.group = new THREE.Group();

    // Textures
    this.topTexture = createTechnoheadFaceplateTexture();
    this.rockerTexture = createRockerPaddleFaceTexture();

    // Materials
    this.matChassis = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.42, metalness: 0.65 });
    this.matTop = new THREE.MeshStandardMaterial({ map: this.topTexture, roughness: 0.38, metalness: 0.52 });
    this.matRocker = new THREE.MeshStandardMaterial({ map: this.rockerTexture, roughness: 0.48, metalness: 0.2 });
    this.matMetal = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.92 });
    this.matWhiteRing = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.05 });
    this.matRubber = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.1 });
    this.matBolt = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.12 });
    this.matLed = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 1.8, roughness: 0.2 });

    this.buildConsole();
  }

  buildConsole() {
    // 1. Heavy Pedestal Stand & Base
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.90, 24), this.matChassis);
    pedestal.position.set(0, 0.45, 0);
    pedestal.castShadow = true;
    this.group.add(pedestal);

    const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 0.05, 32), this.matChassis);
    basePlate.position.set(0, 0.025, 0);
    basePlate.receiveShadow = true;
    this.group.add(basePlate);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.045, 24), this.matMetal);
    collar.position.set(0, 0.78, 0);
    this.group.add(collar);

    // 2. Main TECHNOHEAD CNC Console Box (Angled for ergonomics)
    this.consoleHead = new THREE.Group();
    this.consoleHead.position.set(0, 0.96, 0);
    this.consoleHead.rotation.x = 0.22; // Slanted towards operator
    this.group.add(this.consoleHead);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.44), this.matChassis);
    body.castShadow = true;
    body.receiveShadow = true;
    this.consoleHead.add(body);

    // Top Faceplate with laser-etched TECHNOHEAD graphics
    const topPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.836, 0.436), this.matTop);
    topPlate.position.set(0, 0.0605, 0);
    topPlate.rotation.x = -Math.PI / 2;
    this.consoleHead.add(topPlate);

    // 3. Top-Left Focus / FIZ Wheel
    const focusGroup = new THREE.Group();
    focusGroup.position.set(-0.27, 0.062, -0.11);
    this.focusWheel = new THREE.Group();
    this.focusWheel.rotation.z = Math.PI / 2;

    const whiteRing = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.032, 24), this.matWhiteRing);
    whiteRing.position.y = 0.016;
    const knurledGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.030, 24), this.matChassis);
    knurledGrip.position.y = -0.016;
    this.focusWheel.add(whiteRing, knurledGrip);
    focusGroup.add(this.focusWheel);
    this.consoleHead.add(focusGroup);

    // 4. Mid-Left Silver Knurled Roll Knob
    const rollGroup = new THREE.Group();
    rollGroup.position.set(-0.155, 0.062, -0.10);
    this.rollKnob = new THREE.Group();
    this.rollKnob.position.y = 0.020;
    const rollDial = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.024, 24), this.matMetal);
    rollDial.castShadow = true;
    this.rollKnob.add(rollDial);
    rollGroup.add(this.rollKnob);
    this.consoleHead.add(rollGroup);

    // 5. Lower-Left W/T Rocker Switch
    const rockerGroup = new THREE.Group();
    rockerGroup.position.set(-0.155, 0.062, 0.025);
    this.rockerSwitch = new THREE.Group();
    this.rockerSwitch.position.y = 0.016;
    const rockerPaddle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.022, 0.065), this.matRocker);
    rockerPaddle.castShadow = true;
    this.rockerSwitch.add(rockerPaddle);
    rockerGroup.add(this.rockerSwitch);
    this.consoleHead.add(rockerGroup);

    // 6. Upper-Right Precision 2-Axis Joystick
    const joyGroup = new THREE.Group();
    joyGroup.position.set(0.13, 0.062, -0.10);

    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.042, 0.028, 16), this.matRubber);
    boot.position.y = 0.018;
    joyGroup.add(boot);

    this.joystickStick = new THREE.Group();
    this.joystickStick.position.y = 0.024;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 12), this.matMetal);
    shaft.position.y = 0.045;
    const handleHead = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.010, 0.045, 16), this.matChassis);
    handleHead.position.y = 0.092;
    const crownTip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 16), this.matChassis);
    crownTip.position.y = 0.116;
    this.joystickStick.add(shaft, handleHead, crownTip);
    joyGroup.add(this.joystickStick);
    this.consoleHead.add(joyGroup);

    // 7. Top-Right Status LED
    const ledGroup = new THREE.Group();
    ledGroup.position.set(0.245, 0.062, -0.13);
    const ledBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 16), this.matBolt);
    const ledDome = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 12), this.matLed);
    ledDome.position.y = 0.006;
    ledGroup.add(ledBezel, ledDome);
    this.consoleHead.add(ledGroup);

    // 8. Rear Crossbar & LEMO Connector Rig
    const rearRig = new THREE.Group();
    rearRig.position.set(0, 0.04, -0.26);
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.76, 20), this.matChassis);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.y = 0.07;
    rearRig.add(crossbar);

    const lemoConnector = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.055, 16), this.matMetal);
    lemoConnector.rotation.z = Math.PI / 2;
    lemoConnector.position.set(0.18, 0.07, 0);
    rearRig.add(lemoConnector);

    this.consoleHead.add(rearRig);

    // Interactive Mesh Tagging
    this.joystickStick.userData = { type: 'joystick' };
    this.rockerSwitch.userData = { type: 'rocker' };
    this.focusWheel.userData = { type: 'focusWheel' };
    this.rollKnob.userData = { type: 'rollKnob' };

    this.interactiveMeshes = [];
    this.joystickStick.traverse(c => { if (c.isMesh) { c.userData = this.joystickStick.userData; this.interactiveMeshes.push(c); } });
    this.rockerSwitch.traverse(c => { if (c.isMesh) { c.userData = this.rockerSwitch.userData; this.interactiveMeshes.push(c); } });
    this.focusWheel.traverse(c => { if (c.isMesh) { c.userData = this.focusWheel.userData; this.interactiveMeshes.push(c); } });
    this.rollKnob.traverse(c => { if (c.isMesh) { c.userData = this.rollKnob.userData; this.interactiveMeshes.push(c); } });
  }

  // Update visual state from external kinematics
  updateVisuals(kinematics) {
    // 2-Axis Joystick tilting
    const maxAngle = Math.PI / 6;
    const mappedTilt = THREE.MathUtils.clamp(((kinematics.headTilt || 0) / 180) * maxAngle, -maxAngle, maxAngle);
    const mappedPan = THREE.MathUtils.clamp(((-kinematics.headPan || 0) / 180) * maxAngle, -maxAngle, maxAngle);
    if (this.joystickStick) {
      this.joystickStick.rotation.x = mappedTilt;
      this.joystickStick.rotation.z = mappedPan;
    }

    // Rocker switch (Tele extension)
    if (this.rockerSwitch) {
      const rockerAngle = THREE.MathUtils.mapLinear(kinematics.teleExtension || 0, 0, 11.4, -0.22, 0.22);
      this.rockerSwitch.rotation.x = rockerAngle;
    }

    // Focus wheel & Roll knob
    if (this.focusWheel) {
      this.focusWheel.rotation.x = THREE.MathUtils.degToRad((kinematics.headRoll || 0) * 1.5);
    }
    if (this.rollKnob) {
      this.rollKnob.rotation.y = THREE.MathUtils.degToRad((kinematics.headRoll || 0) * 2.0);
    }
  }
}

