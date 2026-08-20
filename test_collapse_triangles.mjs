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
    
    const targetBones = new Set([13, 14, 15]); // jointGravity, jointNeck, jointHead
    let collapsedTriangles = 0;
    
    // Non-indexed: each 3 vertices is 1 triangle
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
        
        if ((targetBones.has(b0) && w0 > 0.3) ||
            (targetBones.has(b1) && w1 > 0.3) ||
            (targetBones.has(b2) && w2 > 0.3) ||
            (targetBones.has(b3) && w3 > 0.3)) {
          isDummy = true;
          break;
        }
      }
      
      if (isDummy) {
        collapsedTriangles++;
        // Collapse all 3 vertices of this triangle to (0, 0, 0) with zero weights
        for (let v = 0; v < 3; v++) {
          const i = t + v;
          pos.setXYZ(i, 0, 0, 0);
          skinWeight.setXYZW(i, 0, 0, 0, 0);
        }
      }
    }
    pos.needsUpdate = true;
    skinWeight.needsUpdate = true;
    console.log(`Collapsed ${collapsedTriangles} dummy head triangles out of ${pos.count / 3} total triangles!`);
  }
});
