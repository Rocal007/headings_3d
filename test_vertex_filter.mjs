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
    const pos = sm.geometry.attributes.position;
    const skinIndex = sm.geometry.attributes.skinIndex;
    const skinWeight = sm.geometry.attributes.skinWeight;
    
    const targetBones = new Set([13, 14, 15]); // jointGravity, jointNeck, jointHead
    let hiddenCount = 0;
    
    for (let i = 0; i < pos.count; i++) {
      const b0 = skinIndex.getX(i);
      const b1 = skinIndex.getY(i);
      const b2 = skinIndex.getZ(i);
      const b3 = skinIndex.getW(i);
      
      const w0 = skinWeight.getX(i);
      const w1 = skinWeight.getY(i);
      const w2 = skinWeight.getZ(i);
      const w3 = skinWeight.getW(i);
      
      let isTarget = false;
      if (targetBones.has(b0) && w0 > 0.5) isTarget = true;
      if (targetBones.has(b1) && w1 > 0.5) isTarget = true;
      if (targetBones.has(b2) && w2 > 0.5) isTarget = true;
      if (targetBones.has(b3) && w3 > 0.5) isTarget = true;
      
      if (isTarget) {
        hiddenCount++;
      }
    }
    console.log(`Found ${hiddenCount} vertices belonging to the dummy head out of ${pos.count}`);
  }
});
