import * as THREE from 'three';

// Let's test the kinematic chain math of Supertechno 50
// Root -> Columns -> Beams -> Beam2 -> Beam3 -> Beam4 -> Neck -> Head
console.log('Scale is 0.01');
for (let ext = 0; ext <= 11.4; ext += 2.85) {
  const segStroke = ext * 30; // FBX units
  const totalStrokeLocal = (segStroke * 3) * 0.01; // 3 segments scaled
  console.log(`Extension: ${ext}m -> local Z shift of tip: +${totalStrokeLocal.toFixed(2)}m`);
}
