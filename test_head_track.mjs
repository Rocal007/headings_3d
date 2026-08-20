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

// Check head world pos
const headW = new THREE.Vector3();
nodes.jointHead.getWorldPosition(headW);
console.log('Head world pos at rest:', headW);

// Let's test rotating boom tilt
nodes.jointBeams.rotation.x = THREE.MathUtils.degToRad(30);
fbx.updateMatrixWorld(true);
nodes.jointHead.getWorldPosition(headW);
console.log('Head world pos at 30 deg tilt:', headW);
