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
    const geom = sm.geometry;
    const pos = geom.attributes.position;
    const skinIndex = geom.attributes.skinIndex;
    const skinWeight = geom.attributes.skinWeight;
    const index = geom.index;
    
    const targetBones = new Set([13, 14, 15]); // jointGravity, jointNeck, jointHead
    const isDummyVertex = new Uint8Array(pos.count);
    
    for (let i = 0; i < pos.count; i++) {
      const b0 = skinIndex.getX(i);
      const b1 = skinIndex.getY(i);
      const b2 = skinIndex.getZ(i);
      const b3 = skinIndex.getW(i);
      
      const w0 = skinWeight.getX(i);
      const w1 = skinWeight.getY(i);
      const w2 = skinWeight.getZ(i);
      const w3 = skinWeight.getW(i);
      
      if ((targetBones.has(b0) && w0 > 0.4) ||
          (targetBones.has(b1) && w1 > 0.4) ||
          (targetBones.has(b2) && w2 > 0.4) ||
          (targetBones.has(b3) && w3 > 0.4)) {
        isDummyVertex[i] = 1;
      }
    }
    
    console.log(`Index count before: ${index.count}`);
    const newIndices = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      
      if (!isDummyVertex[a] && !isDummyVertex[b] && !isDummyVertex[c]) {
        newIndices.push(a, b, c);
      }
    }
    console.log(`Index count after filtering out dummy head: ${newIndices.length}`);
    geom.setIndex(newIndices);
    console.log('Geometry successfully cleaned of all dummy head triangles!');
  }
});
