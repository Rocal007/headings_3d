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
fbx.scale.set(0.01, 0.01, 0.01);
fbx.updateMatrixWorld(true);

const nodes = {};
fbx.traverse(c => {
  if (c.name.startsWith('joint')) nodes[c.name] = c;
});

const rest2 = nodes.jointBeam2.position.z;
const rest3 = nodes.jointBeam3.position.z;
const rest4 = nodes.jointBeam4.position.z;

for (let ext = 0; ext <= 11.4; ext += 2.85) {
  const t = ext / 11.4;
  const retractOffset = 380 * (1 - t);
  nodes.jointBeam2.position.z = rest2 + retractOffset;
  nodes.jointBeam3.position.z = rest3 + retractOffset;
  nodes.jointBeam4.position.z = rest4 + retractOffset;
  fbx.updateMatrixWorld(true);

  const headW = new THREE.Vector3();
  nodes.jointHead.getWorldPosition(headW);
  const beamInv = nodes.jointBeams.matrixWorld.clone().invert();
  const headLocal = headW.clone().applyMatrix4(beamInv);
  console.log(`Extension: ${ext.toFixed(2)}m -> Head Z in Beams Local: ${headLocal.z.toFixed(2)}m (World Z: ${headW.z.toFixed(2)}m)`);
}
