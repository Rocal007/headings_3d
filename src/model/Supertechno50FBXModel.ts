import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class Supertechno50FBXModel {
  group: THREE.Group;
  isLoaded: boolean = false;
  nodes: Record<string, THREE.Object3D> = {};
  materials: THREE.Material[] = [];
  textures: THREE.Texture[] = [];

  constructor(onLoad?: () => void) {
    this.group = new THREE.Group();
    
    // 1. Texturen laden
    const textureLoader = new THREE.TextureLoader();
    const tColor = textureLoader.load('/models/ST50Plus_Textures/ST050PlusModel_ST050Plus_mat_BaseColor.png');
    tColor.colorSpace = THREE.SRGBColorSpace;
    const tNormal = textureLoader.load('/models/ST50Plus_Textures/ST050PlusModel_ST050Plus_mat_Normal.png');
    const tORM = textureLoader.load('/models/ST50Plus_Textures/ST050PlusModel_ST050Plus_mat_OcclusionRoughnessMetallic.png');
    this.textures.push(tColor, tNormal, tORM);
    
    const loader = new FBXLoader();
    
    // 2. FBX laden
    loader.load('/models/ST50Plus_Rigged.FBX', (fbx) => {
      // Skalierung anpassen, falls das FBX zu groß/klein exportiert wurde
      fbx.scale.set(0.01, 0.01, 0.01); 
      
      fbx.traverse((child) => {
        // Material anwenden
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          const mat = new THREE.MeshStandardMaterial({
            map: tColor,
            normalMap: tNormal,
            aoMap: tORM,
            roughnessMap: tORM,
            metalnessMap: tORM,
            metalness: 1,
            roughness: 1,
          });
          mesh.material = mat;
          this.materials.push(mat);
        }
        
        // Gelenke (Bones) aus dem FBX auslesen und speichern
        const name = child.name;
        if (name === 'jointRoot') this.nodes.root = child;
        if (name === 'jointColumns') this.nodes.columns = child;
        if (name === 'jointColumn1') this.nodes.col1 = child;
        if (name === 'jointColumn2') this.nodes.col2 = child;
        if (name === 'jointColumn3') this.nodes.col3 = child;
        if (name === 'jointBeams') this.nodes.beams = child;
        if (name === 'jointBeam2') this.nodes.beam2 = child;
        if (name === 'jointBeam3') this.nodes.beam3 = child;
        if (name === 'jointBeam4') this.nodes.beam4 = child;
        if (name === 'jointNeck') this.nodes.neck = child;
        if (name === 'jointHead') this.nodes.head = child;
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

    // Dolly Fahrt (vor/zurück)
    if (this.nodes.root) {
      this.nodes.root.position.x = kinematics.dollyTrack * 100; // Multiplikator evtl. anpassen wg. Skalierung
    }
    
    // Kran Basis Rotation (Pan)
    if (this.nodes.columns) {
      this.nodes.columns.rotation.y = THREE.MathUtils.degToRad(-kinematics.basePan);
    }
    
    // Arm Neigung (Tilt)
    if (this.nodes.beams) {
      // Abhängig vom Rigging-Koordinatensystem ist es meist X oder Z
      this.nodes.beams.rotation.x = THREE.MathUtils.degToRad(kinematics.boomTilt);
    }

    // Teleskop Ausfahren
    // Das FBX hat mehrere jointBeam(s), wir teilen die Distanz auf
    const segStroke = kinematics.teleExtension * 30; // 30 = Scale modifier
    if (this.nodes.beam2) this.nodes.beam2.position.z = segStroke;
    if (this.nodes.beam3) this.nodes.beam3.position.z = segStroke;
    if (this.nodes.beam4) this.nodes.beam4.position.z = segStroke;
    
    // Kamerakopf (Pan, Tilt, Roll)
    // Bei typischen Kränen hat der Neck PAN und TILT, der Head hat ROLL
    if (this.nodes.neck) {
       this.nodes.neck.rotation.y = THREE.MathUtils.degToRad(-kinematics.headPan);
       this.nodes.neck.rotation.x = THREE.MathUtils.degToRad(kinematics.headTilt);
    }
    if (this.nodes.head) {
       this.nodes.head.rotation.z = THREE.MathUtils.degToRad(kinematics.headRoll);
    }
  }

  dispose() {
    this.textures.forEach(t => t.dispose());
    this.materials.forEach(m => m.dispose());
  }
}
