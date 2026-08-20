import * as THREE from 'three';
import fs from 'fs';

const buf = fs.readFileSync('public/models/ST50Plus_Rigged.FBX');
const str = buf.toString('latin1');
const jointNames = ['jointHead', 'jointNeck', 'jointBeam4'];
for (const j of jointNames) {
  const idx = str.indexOf(j);
  console.log(j, 'found at index:', idx);
}
