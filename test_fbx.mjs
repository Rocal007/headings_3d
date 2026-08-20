import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import fs from 'fs';

// Mock browser APIs for Node
global.THREE = THREE;
global.window = {};
global.document = {
  createElement: () => ({ addEventListener: () => {}, removeEventListener: () => {}, setAttribute: () => {}, getContext: () => null }),
  createElementNS: () => ({ addEventListener: () => {}, removeEventListener: () => {}, setAttribute: () => {}, getContext: () => null })
};

const loader = new FBXLoader();
const buffer = fs.readFileSync('public/models/ST50Plus_Rigged.FBX');
const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

try {
  const fbx = loader.parse(ab, '');
  fbx.scale.set(0.01, 0.01, 0.01);
  fbx.updateMatrixWorld(true);

  const beamsNode = fbx.getObjectByName('jointBeams');
  console.log('beamsNode:', beamsNode.position);

  // Let's test local points along the beam in Three.js coordinates
  // For beamsNode, in Three.js coordinate system:
  // Forward along the boom is along -Z
  // Rear of the boom is along +Z!
  // Let's verify by checking where jointBeam2 is relative to jointBeams:
  const beam2Node = fbx.getObjectByName('jointBeam2');
  console.log('beam2Node position relative to jointBeams:', beam2Node.position);
  // In Three.js: beam2 is at z = -539.36 (scaled: -5.39m)
  // So negative Z is the front/tip of the crane!
  // Positive Z is the REAR of the crane (where counterweights and rear cage are)!


} catch (e) {
  console.error('Error:', e);
}
