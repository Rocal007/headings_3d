import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class Supertechno50FBXModel {
  group: THREE.Group;
  isLoaded: boolean = false;
  nodes: Record<string, THREE.Object3D> = {};

  constructor(onLoad?: () => void) {
    this.group = new THREE.Group();
    
    const loader = new FBXLoader();
    
    // Load the textured FBX model
    loader.load('/models/ST50Plus_Textured.fbx', (fbx) => {
      // Scale down or up if necessary based on FBX export unit
      fbx.scale.set(0.01, 0.01, 0.01); 
      
      // Improve material looks if needed
      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          if (mesh.material) {
            // Ensure textures show correctly
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                if ('shininess' in mat) (mat as any).shininess = 30;
              });
            } else {
              if ('shininess' in mesh.material) (mesh.material as any).shininess = 30;
            }
          }
        }
        
        // Log node names to help with debugging/mapping
        console.log("FBX Node:", child.name);
        
        // Save references to known joints/bones based on typical rigging naming
        const name = child.name.toLowerCase();
        if (name.includes('base') || name.includes('dolly') || name.includes('track')) this.nodes.base = child;
        
        if (name.includes('column') || name.includes('lift')) {
          if (!this.nodes.column1) this.nodes.column1 = child;
          else if (!this.nodes.column2) this.nodes.column2 = child;
          else if (!this.nodes.column3) this.nodes.column3 = child;
        }
        
        // The FBX parse log showed things like "jointColumn1", "jointColumn2", "jointColumn3", "jointHead"
        if (name === 'jointcolumn1') this.nodes.column1 = child;
        if (name === 'jointcolumn2') this.nodes.column2 = child;
        if (name === 'jointcolumn3') this.nodes.column3 = child;
        
        if (name.includes('pan') && !name.includes('head')) this.nodes.basePan = child;
        if (name.includes('boom') || name.includes('tilt') && !name.includes('head')) this.nodes.boomTilt = child;
        
        if (name.includes('tele') || name.includes('arm')) {
           if (!this.nodes.arm1) this.nodes.arm1 = child;
           else if (!this.nodes.arm2) this.nodes.arm2 = child;
           else if (!this.nodes.arm3) this.nodes.arm3 = child;
        }
        
        if (name.includes('head') && name.includes('pan')) this.nodes.headPan = child;
        if (name.includes('head') && name.includes('tilt')) this.nodes.headTilt = child;
        if (name.includes('head') && name.includes('roll')) this.nodes.headRoll = child;
        
        // General head joint from log
        if (name === 'jointhead') this.nodes.head = child;
      });

      this.group.add(fbx);
      this.isLoaded = true;
      
      if (onLoad) onLoad();
    }, undefined, (error) => {
      console.error('Error loading FBX model:', error);
    });
  }

  updateNodes(kinematics: any) {
    if (!this.isLoaded) return;

    // Map the kinematics to the discovered nodes.
    
    if (this.nodes.base) {
      this.nodes.base.position.x = kinematics.dollyTrack;
    }
    
    if (this.nodes.basePan) {
      this.nodes.basePan.rotation.y = THREE.MathUtils.degToRad(-kinematics.basePan);
    }
    if (this.nodes.boomTilt) {
      this.nodes.boomTilt.rotation.x = THREE.MathUtils.degToRad(kinematics.boomTilt);
    }

    // Column Lift
    if (this.nodes.column1) this.nodes.column1.position.y = kinematics.columnLift / 3;
    if (this.nodes.column2) this.nodes.column2.position.y = kinematics.columnLift / 3;
    if (this.nodes.column3) this.nodes.column3.position.y = kinematics.columnLift / 3;

    // Telescope extension
    const segStroke = kinematics.teleExtension / 3.0;
    if (this.nodes.arm1) this.nodes.arm1.position.z = segStroke;
    if (this.nodes.arm2) this.nodes.arm2.position.z = segStroke;
    if (this.nodes.arm3) this.nodes.arm3.position.z = segStroke;
    
    // Head kinematics
    if (this.nodes.headPan) this.nodes.headPan.rotation.y = THREE.MathUtils.degToRad(-kinematics.headPan);
    if (this.nodes.headTilt) this.nodes.headTilt.rotation.x = THREE.MathUtils.degToRad(kinematics.headTilt);
    if (this.nodes.headRoll) this.nodes.headRoll.rotation.z = THREE.MathUtils.degToRad(kinematics.headRoll);
    
    // If there's just a general 'jointHead' node from rigging
    if (this.nodes.head && !this.nodes.headPan && !this.nodes.headTilt && !this.nodes.headRoll) {
       this.nodes.head.rotation.set(
         THREE.MathUtils.degToRad(kinematics.headTilt),
         THREE.MathUtils.degToRad(-kinematics.headPan),
         THREE.MathUtils.degToRad(kinematics.headRoll)
       );
    }
  }
}
