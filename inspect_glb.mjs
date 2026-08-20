import fs from 'fs';

const buf = fs.readFileSync('public/models/st50plus_rigged.glb');
const str = buf.toString('latin1');
const jsonMatch = str.match(/\{"asset":[\s\S]*?\}(?=\s*BIN|\x00|$)/);
if (jsonMatch) {
  try {
    const gltf = JSON.parse(jsonMatch[0]);
    console.log('Nodes count:', gltf.nodes ? gltf.nodes.length : 0);
    if (gltf.nodes) {
      gltf.nodes.forEach((n, i) => console.log(i, n.name, n.children));
    }
  } catch(e) {
    console.error('Parse error:', e.message);
  }
}
