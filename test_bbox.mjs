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

const box = new THREE.Box3().setFromObject(fbx);
console.log('Rest FBX Bounding Box Min:', box.min, 'Max:', box.max);
console.log('Total Z size in rest:', box.max.z - box.min.z);
