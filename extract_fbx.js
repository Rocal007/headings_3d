const fs = require('fs');
const buffer = fs.readFileSync('E:\\3D-headings\\public\\assets\\models\\st50_new\\ST50Plus_Textured.fbx');
const str = buffer.toString('ascii');
const matches = str.match(/[A-Za-z0-9_]{4,}/g);
if (matches) {
  const unique = [...new Set(matches)];
  const filtered = unique.filter(m => /pan|tilt|boom|arm|base|head|tele|dolly|track|column|lift|crane|supertechno|st50/i.test(m));
  console.log(filtered.join('\n'));
}
