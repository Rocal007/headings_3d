import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { enforceCraneFloorLimits } from '../utils/craneKinematics';

export class Supertechno50FBXModel {
  group: THREE.Group;
  isLoaded: boolean = false;
  nodes: Record<string, THREE.Object3D> = {};
  initialPos: Record<string, THREE.Vector3> = {};
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
      // Räder exakt auf Bodenebene setzen (Y = 0.00m, Reifen liegen plan auf dem Boden auf)
      fbx.position.y = 0.293; 
      
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
            metalness: 0.85,
            roughness: 0.42,
            envMapIntensity: 1.2,
          });
          mesh.material = mat;
          this.materials.push(mat);

          // Remove the default dummy head from the FBX skinned mesh
          if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
            const sm = child as THREE.SkinnedMesh;
            const geom = sm.geometry;
            const pos = geom.attributes.position;
            const skinIndex = geom.attributes.skinIndex;
            const skinWeight = geom.attributes.skinWeight;

            if (pos && skinIndex && skinWeight) {
              const targetBones = new Set<number>();
              sm.skeleton.bones.forEach((b, idx) => {
                if (['jointGravity', 'jointNeck', 'jointHead', 'jointWheelRL', 'jointWheelRR', 'jointWheelFR', 'jointWheelFL', 'jointRoot', 'jointRearAxis', 'jointFrontAxis'].includes(b.name)) {
                  targetBones.add(idx);
                }
              });

              for (let t = 0; t < pos.count; t += 3) {
                let isDummy = false;
                for (let v = 0; v < 3; v++) {
                  const i = t + v;
                  const b0 = skinIndex.getX(i);
                  const b1 = skinIndex.getY(i);
                  const b2 = skinIndex.getZ(i);
                  const b3 = skinIndex.getW(i);
                  const w0 = skinWeight.getX(i);
                  const w1 = skinWeight.getY(i);
                  const w2 = skinWeight.getZ(i);
                  const w3 = skinWeight.getW(i);

                  if ((targetBones.has(b0) && w0 > 0.2) ||
                      (targetBones.has(b1) && w1 > 0.2) ||
                      (targetBones.has(b2) && w2 > 0.2) ||
                      (targetBones.has(b3) && w3 > 0.2)) {
                    isDummy = true;
                    break;
                  }
                }

                if (isDummy) {
                  for (let v = 0; v < 3; v++) {
                    const i = t + v;
                    pos.setXYZ(i, 0, 0, 0);
                    skinWeight.setXYZW(i, 0, 0, 0, 0);
                  }
                }
              }
              pos.needsUpdate = true;
              skinWeight.needsUpdate = true;
            }
          }
        }
        
        // Gelenke (Bones) aus dem FBX auslesen und speichern
        const name = child.name;
        if (name === 'jointRoot') {
          this.nodes.root = child;
          this.initialPos.root = child.position.clone();
        }
        if (name === 'jointColumns') {
          this.nodes.columns = child;
          this.initialPos.columns = child.position.clone();
        }
        if (name === 'jointColumn1') {
          this.nodes.col1 = child;
          this.initialPos.col1 = child.position.clone();
        }
        if (name === 'jointColumn2') {
          this.nodes.col2 = child;
          this.initialPos.col2 = child.position.clone();
        }
        if (name === 'jointColumn3') {
          this.nodes.col3 = child;
          this.initialPos.col3 = child.position.clone();
        }
        if (name === 'jointBeams') {
          this.nodes.beams = child;
          this.initialPos.beams = child.position.clone();
        }
        if (name === 'jointBeam2') {
          this.nodes.beam2 = child;
          this.initialPos.beam2 = child.position.clone();
        }
        if (name === 'jointBeam3') {
          this.nodes.beam3 = child;
          this.initialPos.beam3 = child.position.clone();
        }
        if (name === 'jointBeam4') {
          this.nodes.beam4 = child;
          this.initialPos.beam4 = child.position.clone();
        }
        if (name === 'jointGravity') {
          this.nodes.gravity = child;
          child.scale.set(0.00001, 0.00001, 0.00001);
        }
        if (name === 'jointNeck') {
          this.nodes.neck = child;
          this.initialPos.neck = child.position.clone();
          child.scale.set(0.00001, 0.00001, 0.00001);
        }
        if (name === 'jointHead') {
          this.nodes.head = child;
          this.initialPos.head = child.position.clone();
          child.scale.set(0.00001, 0.00001, 0.00001);
        }
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

    // Apply strict ground floor boundary limits (Y >= 0)
    const safeKin = { ...kinematics };
    enforceCraneFloorLimits(safeKin);

    // Dolly Fahrt (vorwärts / rückwärts entlang der Z-Achse)
    if (this.nodes.root) {
      this.nodes.root.position.x = 0;
      this.nodes.root.position.z = -(safeKin.dollyTrack || 0) * 100;
    }
    
    // Säulenhub / Column Elevation (1.54m bis 3.63m = 0m bis 2.09m Verfahrweg)
    const colH = safeKin.columnHeight !== undefined 
      ? safeKin.columnHeight 
      : (safeKin.columnElevation !== undefined ? safeKin.columnElevation : (1.54 + (safeKin.columnLift || 0)));
    const liftMeters = Math.max(0, Math.min(2.09, colH - 1.54));
    const tLift = liftMeters / 2.09;

    // 1. Kran-Basissäule (Pan / Azimut) - Bleibt fest auf dem Fahrgestell verankert (kein Loch/Lücke)!
    if (this.nodes.columns && this.initialPos.columns) {
      this.nodes.columns.position.y = this.initialPos.columns.y;
      this.nodes.columns.rotation.y = THREE.MathUtils.degToRad(-safeKin.basePan || 0);
    }

    // 2. Teleskopische Hubsäulen-Stufen (Stages 1, 2, 3)
    // FBX ist im maximal ausgefahrenen Zustand (3.63m) exportiert:
    const totalColExt = 237.2879; // initCol1Y: 80.93 + initCol2Y: 76.39 + initCol3Y: 79.97
    const retractColTotal = 209 * (1 - tLift);

    if (this.nodes.col1 && this.initialPos.col1) {
      this.nodes.col1.position.y = this.initialPos.col1.y - (this.initialPos.col1.y / totalColExt) * retractColTotal;
    }
    if (this.nodes.col2 && this.initialPos.col2) {
      this.nodes.col2.position.y = this.initialPos.col2.y - (this.initialPos.col2.y / totalColExt) * retractColTotal;
    }
    if (this.nodes.col3 && this.initialPos.col3) {
      this.nodes.col3.position.y = this.initialPos.col3.y - (this.initialPos.col3.y / totalColExt) * retractColTotal;
    }
    
    // Arm Neigung (Tilt / Pitch) - Gemäß Spezifikation & Ground Floor Lock (Y >= 0)
    if (this.nodes.beams) {
      this.nodes.beams.rotation.x = THREE.MathUtils.degToRad(safeKin.boomTilt || 0);
    }

    // Teleskop Ausfahren (0 bis 11.3m gemäß Supertechno 50+ Datenblatt)
    // FBX ist im ausgefahrenen Zustand exportiert
    const ext = Math.max(0, Math.min(11.3, safeKin.teleExtension || 0));
    const retractOffset = 380 * (1 - ext / 11.3);
    
    if (this.nodes.beam2 && this.initialPos.beam2) {
      this.nodes.beam2.position.z = this.initialPos.beam2.z + retractOffset;
    }
    if (this.nodes.beam3 && this.initialPos.beam3) {
      this.nodes.beam3.position.z = this.initialPos.beam3.z + retractOffset;
    }
    if (this.nodes.beam4 && this.initialPos.beam4) {
      this.nodes.beam4.position.z = this.initialPos.beam4.z + retractOffset;
    }

    // Dummy Head im FBX bleibt kollabiert/unsichtbar (scale 0.00001), 
    // damit ausschließlich der hochdetaillierte RemoteCameraHead gezeigt wird.
    if (this.nodes.gravity) this.nodes.gravity.scale.set(0.00001, 0.00001, 0.00001);
    if (this.nodes.neck) this.nodes.neck.scale.set(0.00001, 0.00001, 0.00001);
    if (this.nodes.head) this.nodes.head.scale.set(0.00001, 0.00001, 0.00001);
  }

  dispose() {
    this.textures.forEach(t => t.dispose());
    this.materials.forEach(m => m.dispose());
  }
}
