import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import fs from 'fs';

// Node polyfill for loaders
global.THREE = THREE;

const data = fs.readFileSync('public/models/ST50Plus_Rigged.FBX');
const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

const loader = new FBXLoader();
try {
  const fbx = loader.parse(arrayBuffer, '');
  console.log('FBX parsed successfully!');
  
  function printHierarchy(obj, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}- [${obj.type}] "${obj.name}" (children: ${obj.children.length})`);
    for (const child of obj.children) {
      printHierarchy(child, depth + 1);
    }
  }
  
  printHierarchy(fbx);
} catch (e) {
  console.error('Error parsing FBX:', e);
}
