import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import fs from 'fs';

global.THREE = THREE;
global.window = {};
global.document = {
  createElement: () => ({ addEventListener: () => {}, removeEventListener: () => {}, setAttribute: () => {}, getContext: () => null }),
  createElementNS: () => ({ addEventListener: () => {}, removeEventListener: () => {}, setAttribute: () => {}, getContext: () => null })
};

const loader = new FBXLoader();
const buffer = fs.readFileSync('public/models/ST50Plus_Rigged.FBX');
const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const fbx = loader.parse(ab, '');
fbx.traverse(c => {
  if (c.isSkinnedMesh) {
    const sm = c;
    console.log('SkinnedMesh:', sm.name, 'Bones count:', sm.skeleton.bones.length);
    sm.skeleton.bones.forEach((b, i) => console.log(`Bone ${i}: ${b.name}`));
    
    // Check skinIndex and skinWeight
    const skinIndex = sm.geometry.attributes.skinIndex;
    const skinWeight = sm.geometry.attributes.skinWeight;
    console.log('Total vertices:', sm.geometry.attributes.position.count);
    
    // Find bone indices for jointGravity, jointNeck, jointHead
    const targetBones = ['jointGravity', 'jointNeck', 'jointHead'];
    const targetIndices = [];
    sm.skeleton.bones.forEach((b, i) => {
      if (targetBones.includes(b.name)) targetIndices.push(i);
    });
    console.log('Target bone indices to hide:', targetIndices);
  }
});

console.log('--- Checking beam and tip positions relative to jointBeams ---');
const nodes = {};
const initialPos = {};
fbx.traverse(c => {
  nodes[c.name] = c;
  initialPos[c.name] = c.position.clone();
});

function testExtension(extMeters) {
  const ext = Math.max(0, Math.min(11.3, extMeters));
  const retractOffset = 380 * (1 - ext / 11.3);
  
  nodes.jointBeam2.position.z = initialPos.jointBeam2.z + retractOffset;
  nodes.jointBeam3.position.z = initialPos.jointBeam3.z + retractOffset;
  nodes.jointBeam4.position.z = initialPos.jointBeam4.z + retractOffset;

  fbx.updateMatrixWorld(true);

  // Position of jointBeam4 and jointGravity in jointBeams local coordinate space:
  const beamsInv = new THREE.Matrix4().copy(nodes.jointBeams.matrixWorld).invert();
  
  const beam4World = new THREE.Vector3();
  nodes.jointBeam4.getWorldPosition(beam4World);
  const beam4InBeams = beam4World.clone().applyMatrix4(beamsInv);

  const gravWorld = new THREE.Vector3();
  nodes.jointGravity.getWorldPosition(gravWorld);
  const gravInBeams = gravWorld.clone().applyMatrix4(beamsInv);

  // Let's compute the world coordinates of all vertices in the skinned mesh when retracted vs extended
  // To do this accurately with Three.js CPU skinning:
  const sm = nodes.ST50Plus_Rigged;
  const geom = sm.geometry;
  const positionAttr = geom.attributes.position;
  const skinIndex = geom.attributes.skinIndex;
  const skinWeight = geom.attributes.skinWeight;

  
  // Let's inspect the vertex coordinates of beam4 transformed by bone matrices:
  // In FBXLoader / Three.js, a SkinnedMesh vertex position in world space:
  // p_world = sum( weight_i * boneMatrix_i * bindMatrixInverse * p_local )
  // Let's inspect bone matrices:
  sm.updateMatrixWorld(true);
  sm.skeleton.update();
  
  const boneMatrices = sm.skeleton.boneMatrices; // Float32Array (16 floats per bone)
  const boneInverses = sm.skeleton.boneInverses; // Matrix4 array
  
  let minNoseZ = Infinity;
  let maxNoseZ = -Infinity;
  let noseVertices = [];

  for (let i = 0; i < positionAttr.count; i++) {
    const vx = positionAttr.getX(i);
    const vy = positionAttr.getY(i);
    const vz = positionAttr.getZ(i);
    
    const b0 = skinIndex.getX(i), w0 = skinWeight.getX(i);
    const b1 = skinIndex.getY(i), w1 = skinWeight.getY(i);
    const b2 = skinIndex.getZ(i), w2 = skinWeight.getZ(i);
    const b3 = skinIndex.getW(i), w3 = skinWeight.getW(i);

    // If vertex belongs to beam4 (bone 12)
    if ((b0 === 12 && w0 > 0.5) || (b1 === 12 && w1 > 0.5) || (b2 === 12 && w2 > 0.5) || (b3 === 12 && w3 > 0.5)) {
      // Calculate skinned position in world / beams space:
      const v = new THREE.Vector3(vx, vy, vz);
      // Transform by bone12:
      // In Three.js skinning: skinVertex = boneMat * boneInverse * v
      const boneMat = sm.skeleton.bones[12].matrixWorld;
      const boneInv = boneInverses[12];
      const skinnedV = v.clone().applyMatrix4(boneInv).applyMatrix4(boneMat);
      const inBeams = skinnedV.applyMatrix4(beamsInv);

      if (inBeams.z < minNoseZ) minNoseZ = inBeams.z;
    }
  }
}


console.log('=== INSPECTING FBX WORLD COORDINATES AT REST (dollyTrack=0, pan=0, tilt=0, ext=0) ===');
fbx.updateMatrixWorld(true);

const checkNodes = [
  'ST50Plus_Rigged',
  'Root',
  'jointRoot',
  'jointColumns',
  'jointColumn1',
  'jointColumn2',
  'jointColumn3',
  'jointBeams',
  'jointBeam1',
  'jointBeam2',
  'jointBeam3',
  'jointBeam4',
  'jointGravity',
  'jointFrontAxis',
  'jointRearAxis',
  'jointWheelFL',
  'jointWheelFR',
  'jointWheelRL',
  'jointWheelRR'
];

checkNodes.forEach(name => {
  const node = nodes[name];
  if (node) {
    const wp = new THREE.Vector3();
    node.getWorldPosition(wp);
    console.log(`Node "${name}": World Pos = [${wp.x.toFixed(4)}m, ${wp.y.toFixed(4)}m, ${wp.z.toFixed(4)}m]`);
  }
});








