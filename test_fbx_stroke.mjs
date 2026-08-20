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

// Let's store the initial rest positions of beam2, beam3, beam4!
const rest2 = nodes.jointBeam2 ? nodes.jointBeam2.position.z : 0;
const rest3 = nodes.jointBeam3 ? nodes.jointBeam3.position.z : 0;
const rest4 = nodes.jointBeam4 ? nodes.jointBeam4.position.z : 0;
console.log(`Rest positions: Beam2=${rest2}, Beam3=${rest3}, Beam4=${rest4}`);

function testExt(extMeters) {
  // If extension is in meters, let's see how much FBX units
  // If 1m = 100 units (since scale is 0.01)
  const strokePerSegment = (extMeters / 3) * 100; // Divided across 3 beams
  nodes.jointBeam2.position.z = rest2 - strokePerSegment; // or + strokePerSegment
  nodes.jointBeam3.position.z = rest3 - strokePerSegment;
  nodes.jointBeam4.position.z = rest4 - strokePerSegment;
  fbx.updateMatrixWorld(true);

  const headW = new THREE.Vector3();
  const beamsW = new THREE.Vector3();
  nodes.jointHead.getWorldPosition(headW);
  nodes.jointBeams.getWorldPosition(beamsW);

  // In beam local space
  const beamInv = nodes.jointBeams.matrixWorld.clone().invert();
  const headLocal = headW.clone().applyMatrix4(beamInv);
  console.log(`Ext ${extMeters}m (-) -> Head in Beams Local: x=${headLocal.x.toFixed(2)}, y=${headLocal.y.toFixed(2)}, z=${headLocal.z.toFixed(2)}`);

  nodes.jointBeam2.position.z = rest2 + strokePerSegment;
  nodes.jointBeam3.position.z = rest3 + strokePerSegment;
  nodes.jointBeam4.position.z = rest4 + strokePerSegment;
  fbx.updateMatrixWorld(true);
  nodes.jointHead.getWorldPosition(headW);
  const headLocalPlus = headW.clone().applyMatrix4(beamInv);
  console.log(`Ext ${extMeters}m (+) -> Head in Beams Local: x=${headLocalPlus.x.toFixed(2)}, y=${headLocalPlus.y.toFixed(2)}, z=${headLocalPlus.z.toFixed(2)}`);
}

testExt(0);
testExt(5.0);
testExt(11.4);
