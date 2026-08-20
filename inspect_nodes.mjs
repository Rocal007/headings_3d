import fs from 'fs';

const buf = fs.readFileSync('public/models/ST50Plus_Rigged.FBX');
const str = buf.toString('latin1');
const matches = str.match(/joint[A-Za-z0-9_]+/g);
console.log('Joint matches:', matches ? [...new Set(matches)] : 'none');
