import * as THREE from 'three';
import fs from 'fs';

// Let's inspect the FBX joint hierarchy
const buf = fs.readFileSync('public/models/ST50Plus_Rigged.FBX');
const str = buf.toString('latin1');

// Find all properties or joint definitions
const joints = ['jointRoot', 'jointColumns', 'jointBeams', 'jointBeam1', 'jointBeam2', 'jointBeam3', 'jointBeam4', 'jointNeck', 'jointHead'];
for (const j of joints) {
  const re = new RegExp(`Model::${j}[\\s\\S]*?Lcl Translation[\\s\\S]*?([-\\d.]+),([-\\d.]+),([-\\d.]+)`, 'm');
  const m = str.match(re);
  if (m) {
    console.log(`${j} Translation: x=${m[1]}, y=${m[2]}, z=${m[3]}`);
  } else {
    console.log(`${j}: regex not matched`);
  }
}
