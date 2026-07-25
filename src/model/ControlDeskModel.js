import * as THREE from 'three';

export class ControlDeskModel {
  constructor() {
    this.group = new THREE.Group();

    // Materials
    this.matChassis = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.2 });
    this.matMetal = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.8 });
    this.matScreen = new THREE.MeshBasicMaterial({ color: 0x0a1526 });
    this.matRedAccent = new THREE.MeshStandardMaterial({ color: 0xaa1111, roughness: 0.6 });

    this.buildConsole();
  }

  buildConsole() {
    // Main Console Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.0, 2.5), this.matChassis);
    this.group.add(body);

    const slope = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 2.5), this.matChassis);
    slope.position.set(0, 0.6, -0.2);
    slope.rotation.x = Math.PI * 0.05; // Slight slope forward
    this.group.add(slope);

    // Right Joystick (Head Pan/Tilt)
    this.joystickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), this.matChassis);
    this.joystickBase.position.set(1.2, 0.75, 0.2);
    
    // The moving part of the joystick
    this.joystickStick = new THREE.Group();
    const stickMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 12), this.matChassis);
    stickMesh.position.y = 0.4;
    const stickTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), this.matRedAccent);
    stickTop.position.y = 0.8;
    this.joystickStick.add(stickMesh, stickTop);
    
    this.joystickBase.add(this.joystickStick);
    slope.add(this.joystickBase);

    // Front Handwheels (Base Pan & Boom Tilt)
    // Left Wheel
    this.wheelLeft = new THREE.Group();
    this.wheelLeft.position.set(-1.0, -0.2, 1.3);
    const wLMesh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 16, 32), this.matMetal);
    const wLSpoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12), this.matMetal);
    const wLHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), this.matChassis);
    wLHandle.rotation.x = Math.PI / 2;
    wLHandle.position.set(0, 0.4, 0.2);
    this.wheelLeft.add(wLMesh, wLSpoke, wLHandle);
    body.add(this.wheelLeft);

    // Right Wheel
    this.wheelRight = new THREE.Group();
    this.wheelRight.position.set(1.0, -0.2, 1.3);
    const wRMesh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 16, 32), this.matMetal);
    const wRSpoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12), this.matMetal);
    const wRHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), this.matChassis);
    wRHandle.rotation.x = Math.PI / 2;
    wRHandle.position.set(0, 0.4, 0.2);
    this.wheelRight.add(wRMesh, wRSpoke, wRHandle);
    body.add(this.wheelRight);

    // Left Rocker Switch (Telescope)
    this.rockerBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.8), this.matChassis);
    this.rockerBase.position.set(-1.2, 0.75, 0.2);
    
    this.rockerSwitch = new THREE.Group();
    const rockerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), this.matMetal);
    this.rockerSwitch.add(rockerMesh);
    this.rockerBase.add(this.rockerSwitch);
    slope.add(this.rockerBase);

    // Monitor Arm & Screens
    const monArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 12), this.matMetal);
    monArm.position.set(-1.8, 1.5, -1.0);
    body.add(monArm);

    const screen1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.1), this.matChassis);
    screen1.position.set(-2.0, 2.5, -1.0);
    
    const glass1 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), this.matScreen);
    glass1.position.set(0, 0, 0.06);
    screen1.add(glass1);
    
    body.add(screen1);

    // Make interactive parts easily identifiable
    this.joystickStick.userData = { type: 'joystick' };
    this.wheelLeft.userData = { type: 'wheelLeft' };
    this.wheelRight.userData = { type: 'wheelRight' };
    this.rockerSwitch.userData = { type: 'rocker' };
    
    // Add meshes to an array for raycasting
    this.interactiveMeshes = [];
    this.joystickStick.traverse(c => { if(c.isMesh) { c.userData = this.joystickStick.userData; this.interactiveMeshes.push(c); }});
    this.wheelLeft.traverse(c => { if(c.isMesh) { c.userData = this.wheelLeft.userData; this.interactiveMeshes.push(c); }});
    this.wheelRight.traverse(c => { if(c.isMesh) { c.userData = this.wheelRight.userData; this.interactiveMeshes.push(c); }});
    this.rockerSwitch.traverse(c => { if(c.isMesh) { c.userData = this.rockerSwitch.userData; this.interactiveMeshes.push(c); }});
  }

  // Update visual state from external kinematics
  updateVisuals(kinematics) {
    // Joystick tilt (max 30 degrees)
    // Map -1080 to 1080 to a visual angle, e.g. -30deg to +30deg
    const maxAngle = Math.PI / 6;
    const mappedTilt = THREE.MathUtils.clamp((kinematics.headTilt / 1080) * maxAngle, -maxAngle, maxAngle);
    const mappedPan = THREE.MathUtils.clamp((kinematics.headPan / 1080) * maxAngle, -maxAngle, maxAngle);
    this.joystickStick.rotation.x = mappedTilt;
    this.joystickStick.rotation.z = -mappedPan;

    // Handwheels
    // Infinite rotation, just link to angle
    this.wheelLeft.rotation.z = THREE.MathUtils.degToRad(kinematics.basePan * 5); // visually spin faster
    this.wheelRight.rotation.z = THREE.MathUtils.degToRad(kinematics.boomTilt * 5);

    // Rocker switch
    // Map 0 to 11.4m to -15deg to +15deg
    const rockerAngle = THREE.MathUtils.mapLinear(kinematics.teleExtension, 0, 11.4, -0.26, 0.26);
    this.rockerSwitch.rotation.x = rockerAngle;
  }
}
