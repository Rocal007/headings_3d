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

console.log('Available joints:');
Object.keys(nodes).forEach(k => console.log(' -', k));

// If we scale jointGravity, jointNeck, jointHead to 0.0001:
if (nodes.jointGravity) nodes.jointGravity.scale.set(0.0001, 0.0001, 0.0001);
if (nodes.jointNeck) nodes.jointNeck.scale.set(0.0001, 0.0001, 0.0001);
if (nodes.jointHead) nodes.jointHead.scale.set(0.0001, 0.0001, 0.0001);
fbx.updateMatrixWorld(true);
console.log('Successfully scaled dummy head bones to 0!');
