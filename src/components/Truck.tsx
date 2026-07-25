import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// --- Canvas Texture Generators ---
function createGrillTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, 0, 512, 256);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(10, 30);
    ctx.lineTo(200, 30);
    ctx.lineTo(220, 80); 
    ctx.lineTo(292, 80); 
    ctx.lineTo(312, 30); 
    ctx.lineTo(502, 30);
    ctx.stroke();

    ctx.fillStyle = '#cccccc';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(256, 50, 8, 0, Math.PI * 2); 
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(246, 65);
    ctx.lineTo(266, 65);
    ctx.lineTo(268, 55);
    ctx.lineTo(244, 55);
    ctx.fill(); 

    const gradient = ctx.createLinearGradient(0, 110, 0, 190);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#dddddd');
    gradient.addColorStop(0.6, '#888888');
    gradient.addColorStop(1, '#444444');
    ctx.fillStyle = gradient;
    ctx.font = 'bold 95px "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.fillText('MAN', 256, 155);

    ctx.fillStyle = '#050505';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(100, 210, 120, 25, 10);
      ctx.roundRect(292, 210, 120, 25, 10);
      ctx.fill();
    } else {
      ctx.fillRect(100, 210, 120, 25);
      ctx.fillRect(292, 210, 120, 25);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLicensePlateTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 60);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 26px "Inter", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAIMER', 128, 24);
    
    ctx.font = 'bold 12px "Inter", Arial';
    ctx.fillText('NUTZFAHRZEUGE', 128, 48);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRibbedTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111'; // Dunkler Hintergrund
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#333'; // Hellere Rippen
    for (let i = 0; i < 256; i += 16) {
      ctx.fillRect(i, 0, 8, 128);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHeadlightTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 128, 128);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(90, 25);
    ctx.lineTo(30, 25);
    ctx.lineTo(30, 103);
    ctx.lineTo(90, 103);
    ctx.stroke();
    ctx.stroke();

    ctx.fillStyle = '#ffeaa7';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(64, 64, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTailLiftTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Base color
    ctx.fillStyle = '#e8ebed';
    ctx.fillRect(0, 0, 512, 512);

    // Roter Rahmen (Koffer-Kanten)
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 496, 496);

    // Graue Ladebordwand (Hebebühne) Platte
    ctx.fillStyle = '#ced4da';
    ctx.fillRect(32, 120, 448, 384);
    
    // Obere Gummilippe an der Ladebordwand
    ctx.fillStyle = '#343a40';
    ctx.fillRect(32, 120, 448, 20);

    // Vertikale Verstrebungen (Rippen)
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 4;
    for (let i = 1; i <= 6; i++) {
      const x = 32 + (448 / 7) * i;
      ctx.beginPath();
      ctx.moveTo(x, 140);
      ctx.lineTo(x, 504);
      ctx.stroke();
    }

    // Rot-Weiße Warnschraffur (Warnmarkierung)
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(40, 260, 40, 80); // Links
    ctx.fillRect(432, 260, 40, 80); // Rechts
    
    ctx.fillStyle = '#ffffff';
    for(let y = 260; y < 340; y+=20) {
      // Links Streifen
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(80, y - 20); ctx.lineTo(80, y - 10); ctx.lineTo(40, y + 10); ctx.fill();
      // Rechts Streifen
      ctx.beginPath(); ctx.moveTo(432, y); ctx.lineTo(472, y - 20); ctx.lineTo(472, y - 10); ctx.lineTo(432, y + 10); ctx.fill();
    }

    // LAIMER Sticker unten links auf der Hebebühne
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(90, 470, 60, 20);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px "Inter", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAIMER', 120, 480);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKofferSideTexture() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Basis: leicht warmes Weiß
    ctx.fillStyle = '#f5f3f0';
    ctx.fillRect(0, 0, 2048, 512);

    // Subtiler vertikaler Verlauf (oben heller, unten leicht dunkler)
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2048, 512);

    // Vertikale Panel-Nähte (6 Panels wie auf dem Foto)
    const panels = 6;
    for (let i = 0; i <= panels; i++) {
      const x = (2048 / panels) * i;
      // Dunkle Linie (Schatten links der Naht)
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 1, 0); ctx.lineTo(x - 1, 512); ctx.stroke();
      // Helle Linie (Lichtreflex rechts der Naht)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, 512); ctx.stroke();
    }

    // Horizontale Nietenreihe oben
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 20; x < 2048; x += 50) {
      ctx.beginPath();
      ctx.arc(x, 18, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Horizontale Nietenreihe unten
    for (let x = 20; x < 2048; x += 50) {
      ctx.beginPath();
      ctx.arc(x, 494, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Unterer Alu-Streifen (Bodenleiste)
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 490, 2048, 22);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 490, 2048, 22);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function Truck() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDriving, setIsDriving] = useState(true);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [isBsod, setIsBsod] = useState(false);
  const drivingRef = useRef(true);
  const doorsRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');
    scene.fog = new THREE.Fog('#000000', 10, 80);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Move camera out to see the long truck
    camera.position.set(18, 6, 20);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2, -2);
    controls.maxPolarAngle = Math.PI / 2 - 0.01;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const truck = new THREE.Group();
    scene.add(truck);

    // --- Materials (Realistic Car Paint with Clearcoat) ---
    const paintMat = new THREE.MeshPhysicalMaterial({ 
      color: '#f8f9fa', 
      roughness: 0.1, 
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });
    
    const kofferSideTex = createKofferSideTexture();
    const boxMat = new THREE.MeshPhysicalMaterial({ 
      color: '#f8f9fa', 
      roughness: 0.1, 
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });
    const boxSideMat = new THREE.MeshPhysicalMaterial({ 
      map: kofferSideTex, 
      roughness: 0.1, 
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });
    
    const plasticMat = new THREE.MeshStandardMaterial({ color: '#181818', roughness: 0.8, metalness: 0.1 });
    const chassisMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: '#2a4b6c', roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.7 });
    // @ts-ignore
    const visorMat = new THREE.MeshStandardMaterial({ color: '#001f3f', roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.85 }); // Dark blue sun visor
    const rimMat = new THREE.MeshStandardMaterial({ color: '#aaaaaa', roughness: 0.3, metalness: 0.8 });
    const silverMat = new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.4, metalness: 0.9 });
    
    const grillTex = createGrillTexture();
    const plateTex = createLicensePlateTexture();
    const hlTex = createHeadlightTexture();

    const grillMaterials = [plasticMat, plasticMat, plasticMat, plasticMat, new THREE.MeshStandardMaterial({ map: grillTex, roughness: 0.6 }), plasticMat];
    const hlMaterials = [plasticMat, plasticMat, plasticMat, plasticMat, new THREE.MeshStandardMaterial({ map: hlTex, emissiveMap: hlTex, emissive: '#fff', emissiveIntensity: 1 }), plasticMat];
    const plateMaterials = [plasticMat, plasticMat, plasticMat, plasticMat, new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }), plasticMat];
    
    const tailLiftTex = createTailLiftTexture();
    const tailLiftMat = new THREE.MeshStandardMaterial({ map: tailLiftTex, roughness: 0.4, metalness: 0.1 });
    // Faces: [+x, -x, +y, -y, +z (front), -z (back)]
    const kofferMaterials = [boxSideMat, boxSideMat, boxMat, boxMat, boxMat, tailLiftMat]; 

    // --- Geometrie Parameter (Echte Maße: Datenblatt MAN TGL 10.250) ---
    // Reifen 265/70R17.5 → Ø 815mm → r=0.408m
    // Radstand: 5550mm, Koffer Innen: 8050x2470x2580mm
    // Ladekantenhöhe: 1020mm, Ladebordwand: 2500x2000mm
    const kofferLength = 8.25;  // Außen (~8050 + 2x100mm Wand)
    const kofferWidth = 2.57;   // Außen (~2470 + 2x50mm Wand)
    const kofferHeight = 2.68;  // Außen (~2580 + 100mm Boden/Dach)
    const loadEdgeHeight = 1.02; // Ladekantenhöhe
    const kofferY = loadEdgeHeight + kofferHeight / 2; // Unterkante auf 1.02m
    const wheelbase = 5.55;     // Radstand
    const frontAxleZ = 3.5;
    const rearAxleZ = frontAxleZ - wheelbase; // = -2.05
    const kofferFrontZ = frontAxleZ - 1.2; // Koffer beginnt kurz hinter der Vorderachse
    const kofferZ = kofferFrontZ - kofferLength / 2; // Center

    // 1. Chassis Frame (Langer Hauptträger)
    const kofferBackZ = kofferZ - kofferLength / 2;
    const chassisLength = 3.5 - kofferBackZ; // Von unter der Kabine bis exakt ans Heck
    const chassisCenterZ = kofferBackZ + chassisLength / 2;

    const chassisGeo = new THREE.BoxGeometry(0.8, 0.4, chassisLength);
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.set(0, 0.6, chassisCenterZ);
    chassis.castShadow = true;
    truck.add(chassis);

    // Seiten-Unterfahrschutz (Silver Side Rails from photo)
    const sideRailLength = frontAxleZ - rearAxleZ - 1.6;
    const sideRailGeo = new THREE.BoxGeometry(0.05, 0.15, sideRailLength);
    const leftSideRail = new THREE.Mesh(sideRailGeo, silverMat);
    leftSideRail.position.set(1.22, 0.55, (frontAxleZ + rearAxleZ) / 2);
    const rightSideRail = leftSideRail.clone();
    rightSideRail.position.set(-1.22, 0.55, (frontAxleZ + rearAxleZ) / 2);
    truck.add(leftSideRail, rightSideRail);

    // Tank / Batterie-Kästen (Ribbed Texture)
    const ribbedTex = createRibbedTexture();
    const ribbedMat = new THREE.MeshStandardMaterial({ map: ribbedTex, roughness: 0.8, metalness: 0.2 });
    const tankGeo = new THREE.BoxGeometry(0.5, 0.4, 1.2);
    const tank = new THREE.Mesh(tankGeo, ribbedMat);
    tank.position.set(0.9, 0.65, 1.5);
    truck.add(tank);

    // LAIMER Schild am Unterfahrschutz
    const smallPlateGeo = new THREE.BoxGeometry(0.06, 0.12, 0.4);
    const sidePlate = new THREE.Mesh(smallPlateGeo, new THREE.MeshStandardMaterial({color: '#ffd700'}));
    sidePlate.position.set(1.23, 0.55, 2.0);
    truck.add(sidePlate);

    // 2. Kofferaufbau (Echte Maße, leicht gerundet)
    const kofferGeo = new RoundedBoxGeometry(kofferWidth, kofferHeight, kofferLength, 4, 0.06);
    const koffer = new THREE.Mesh(kofferGeo, kofferMaterials);
    koffer.position.set(0, kofferY, kofferZ);
    koffer.castShadow = true;
    koffer.receiveShadow = true;
    truck.add(koffer);

    // Koffer Frame Edges (Alu-Leisten)
    const edgeGeo = new THREE.BoxGeometry(kofferWidth + 0.02, kofferHeight + 0.02, 0.1);
    const frontEdge = new THREE.Mesh(edgeGeo, silverMat);
    frontEdge.position.set(0, kofferY, kofferZ + kofferLength/2 - 0.05);
    const backEdge = new THREE.Mesh(edgeGeo, silverMat);
    backEdge.position.set(0, kofferY, kofferZ - kofferLength/2 + 0.05);
    truck.add(frontEdge, backEdge);
    
    // Hebebühne / Heckunterbau (Tail Lift Mechanism)
    // Alles schließt bündig mit der Rückseite ab (kofferBackZ)
    const tailBumperGeo = new THREE.BoxGeometry(2.4, 0.15, 0.3);
    const tailBumper = new THREE.Mesh(tailBumperGeo, chassisMat);
    tailBumper.position.set(0, 0.4, kofferBackZ + 0.15);
    
    // Unterfahrschutz Stange (Under-run bar)
    const underrunGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4);
    underrunGeo.rotateZ(Math.PI / 2);
    const underrun = new THREE.Mesh(underrunGeo, chassisMat);
    underrun.position.set(0, 0.25, kofferBackZ + 0.1);
    
    // Hydraulic arms / folding mechanism
    const liftMechGeo = new THREE.BoxGeometry(1.2, 0.4, 0.6);
    const liftMech = new THREE.Mesh(liftMechGeo, plasticMat);
    liftMech.position.set(0, 0.35, kofferBackZ + 0.4);
    truck.add(tailBumper, underrun, liftMech);

    // Rücklichter (Tail lights)
    const tailLightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
    const tailLightMat = new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#ff0000', emissiveIntensity: 0.8 });
    const leftTailLight = new THREE.Mesh(tailLightGeo, tailLightMat);
    leftTailLight.position.set(1.0, 0.6, kofferBackZ + 0.05);
    const rightTailLight = leftTailLight.clone();
    rightTailLight.position.set(-1.0, 0.6, kofferBackZ + 0.05);
    
    // Rotes Umgebungslicht der Rücklichter
    const leftTailLightLight = new THREE.PointLight('#ff0000', 5, 10, 2);
    leftTailLightLight.position.set(1.0, 0.6, kofferBackZ + 0.1);
    const rightTailLightLight = new THREE.PointLight('#ff0000', 5, 10, 2);
    rightTailLightLight.position.set(-1.0, 0.6, kofferBackZ + 0.1);
    
    truck.add(leftTailLight, rightTailLight, leftTailLightLight, rightTailLightLight);
    
    // Staukästen (Toolboxes) vor der Hinterachse
    const toolboxGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
    const leftToolbox = new THREE.Mesh(toolboxGeo, plasticMat);
    leftToolbox.position.set(1.0, 0.6, rearAxleZ + 1.2);
    const rightToolbox = leftToolbox.clone();
    rightToolbox.position.set(-1.0, 0.6, rearAxleZ + 1.2);
    truck.add(leftToolbox, rightToolbox);

    // Mudflaps (Schmutzfänger) behind rear wheels
    const mudflapGeo = new THREE.BoxGeometry(0.5, 0.6, 0.05);
    const leftFlap = new THREE.Mesh(mudflapGeo, plasticMat);
    leftFlap.position.set(1.1, 0.3, rearAxleZ - 0.7);
    const rightFlap = leftFlap.clone();
    rightFlap.position.set(-1.1, 0.3, rearAxleZ - 0.7);
    truck.add(leftFlap, rightFlap);

    // Dachspoiler (Windschild auf der Kabine)
    const spoilerShape = new THREE.Shape();
    spoilerShape.moveTo(1.9, 3.70); // Koffer top front
    spoilerShape.quadraticCurveTo(3.2, 3.70, 3.5, 3.25); // Bogen nach vorne unten
    spoilerShape.lineTo(3.3, 3.25); // Dicke
    spoilerShape.quadraticCurveTo(3.0, 3.65, 1.9, 3.65); // Bogen zurück
    spoilerShape.lineTo(1.9, 3.70);
    
    const spoilerExtrude = { depth: 2.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 };
    const spoilerGeo = new THREE.ExtrudeGeometry(spoilerShape, spoilerExtrude);
    spoilerGeo.rotateY(-Math.PI / 2);
    spoilerGeo.translate(1.1, 0, 0); // Zentrieren über die Breite der Kabine
    
    const roofSpoiler = new THREE.Mesh(spoilerGeo, paintMat);
    truck.add(roofSpoiler);

    // Windleitbleche (Side Deflectors) hinten an der Kabine
    const deflectorGeo = new THREE.BoxGeometry(0.1, 2.5, 0.4);
    const leftDeflector = new THREE.Mesh(deflectorGeo, paintMat);
    leftDeflector.position.set(1.2, 2.1, 2.1); // Between Cabin (2.2) and Koffer (1.9)
    const rightDeflector = leftDeflector.clone();
    rightDeflector.position.set(-1.2, 2.1, 2.1);
    truck.add(leftDeflector, rightDeflector);

    // 3. Fahrerkabine (Custom Profile für die abgeschrägte Front)
    const cabShape = new THREE.Shape();
    cabShape.moveTo(-1.0, 0); // Hinten unten
    cabShape.lineTo(-1.0, 2.3); // Hinten oben
    cabShape.lineTo(0.3, 2.3); // Vorne oben (Dachkante)
    cabShape.lineTo(0.9, 1.2); // Vorne mitte (Unterkante Windschutzscheibe - Schräge)
    cabShape.lineTo(1.0, 0); // Vorne unten (Front)
    cabShape.lineTo(-1.0, 0);
    
    const cabExtrude = { depth: 2.2, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 6 };
    const cabinGeo = new THREE.ExtrudeGeometry(cabShape, cabExtrude);
    cabinGeo.center(); // Zentriert
    cabinGeo.rotateY(-Math.PI / 2); // Z-Ausrichtung
    
    const cabin = new THREE.Mesh(cabinGeo, paintMat);
    cabin.position.set(0, 2.1, 3.3);
    cabin.castShadow = true;
    truck.add(cabin);

    // 2 Lampen (Dachbegrenzungsleuchten) und Antenne auf dem Dach vorne
    const roofLampGeo = new THREE.BoxGeometry(0.1, 0.05, 0.1);
    const roofLampMat = new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#ff6600', emissiveIntensity: 0.8 });
    
    const leftRoofLamp = new THREE.Mesh(roofLampGeo, roofLampMat);
    leftRoofLamp.position.set(1.0, 3.25, 3.65);
    const rightRoofLamp = leftRoofLamp.clone();
    rightRoofLamp.position.set(-1.0, 3.25, 3.65);
    
    const antennaGeo = new THREE.CylinderGeometry(0.005, 0.008, 0.8, 8);
    const antennaMat = new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.8, roughness: 0.2 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(0, 3.65, 3.55); // In der Mitte
    
    truck.add(leftRoofLamp, rightRoofLamp, antenna);

    // Windscreen (starke Neigung angepasst an Kabinen-Schräge)
    const windScreenGeo = new RoundedBoxGeometry(2.3, 1.2, 0.1, 4, 0.05);
    const windScreen = new THREE.Mesh(windScreenGeo, glassMat);
    windScreen.position.set(0, 2.7, 4.0); // Mitte der Schräge
    windScreen.rotation.x = -Math.atan2(0.6, 1.1); // Exakter Winkel der Kabinenschräge
    truck.add(windScreen);

    // Geometries für die Türen (Fenster, Griff, Trim)
    const sideTrimGeo = new THREE.BoxGeometry(0.05, 0.4, 0.2);
    const handleGeo = new THREE.BoxGeometry(0.05, 0.08, 0.15);
    
    const winShape = new THREE.Shape();
    winShape.moveTo(-0.5, 0); // Hinten unten
    winShape.lineTo(-0.5, 1.0); // Hinten oben
    winShape.lineTo(0.25, 1.0); // Vorne oben (Dachkante)
    winShape.lineTo(0.8, 0); // Vorne unten (Schräge)
    winShape.lineTo(-0.5, 0);
    const winExtrude = { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    const sideWindowGeo = new THREE.ExtrudeGeometry(winShape, winExtrude);
    sideWindowGeo.center();
    sideWindowGeo.rotateY(-Math.PI / 2);

    // Door panels
    const doorPanelShape = new THREE.Shape();
    doorPanelShape.moveTo(-0.5, 0); // Hinten oben (gleicht Fenster-Unterkante)
    doorPanelShape.lineTo(0.8, 0);  // Vorne oben (gleicht Fenster-Unterkante)
    doorPanelShape.lineTo(0.9, -1.0); // Vorne unten
    doorPanelShape.lineTo(-0.5, -1.0); // Hinten unten
    doorPanelShape.lineTo(-0.5, 0);
    const doorPanelGeo = new THREE.ExtrudeGeometry(doorPanelShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
    doorPanelGeo.center();
    doorPanelGeo.rotateY(-Math.PI / 2);

    // Linke Tür-Gruppe (Scharnier vorne an der A-Säule bei Z = 4.1)
    const leftDoorGroup = new THREE.Group();
    leftDoorGroup.position.set(1.23, 2.15, 4.1); // Hinge position
    
    const leftWin = new THREE.Mesh(sideWindowGeo, glassMat);
    leftWin.position.set(0, 0.5, -0.6); // Relativ zum Hinge
    const leftPanel = new THREE.Mesh(doorPanelGeo, paintMat);
    leftPanel.position.set(0, -0.5, -0.6);
    const leftTrimObj = new THREE.Mesh(sideTrimGeo, plasticMat);
    leftTrimObj.position.set(0.05, -0.85, -1.1);
    const leftHandleObj = new THREE.Mesh(handleGeo, plasticMat);
    leftHandleObj.position.set(0.07, -0.45, -1.4);
    
    leftDoorGroup.add(leftWin, leftPanel, leftTrimObj, leftHandleObj);
    
    // Rechte Tür-Gruppe
    const rightDoorGroup = new THREE.Group();
    rightDoorGroup.position.set(-1.23, 2.15, 4.1); // Hinge position
    
    const rightWin = leftWin.clone();
    const rightPanel = leftPanel.clone();
    const rightTrimObj = leftTrimObj.clone();
    rightTrimObj.position.set(-0.05, -0.85, -1.1);
    const rightHandleObj = leftHandleObj.clone();
    rightHandleObj.position.set(-0.07, -0.45, -1.4);
    
    rightDoorGroup.add(rightWin, rightPanel, rightTrimObj, rightHandleObj);
    
    truck.add(leftDoorGroup, rightDoorGroup);
    
    // Vent (Lüftung an der Kabine, nicht an der Tür)
    const sideVentGeo = new THREE.BoxGeometry(0.05, 0.5, 0.1);
    const leftVent = new THREE.Mesh(sideVentGeo, plasticMat);
    leftVent.position.set(1.18, 2.3, 2.3);
    const rightVent = leftVent.clone();
    rightVent.position.set(-1.18, 2.3, 2.3);
    truck.add(leftVent, rightVent);

    // 4. Bumper & Grill & Mudguards
    const bumperGeo = new RoundedBoxGeometry(2.45, 0.8, 0.6, 4, 0.1);
    const bumper = new THREE.Mesh(bumperGeo, plasticMat);
    bumper.position.set(0, 0.7, 4.2);
    bumper.castShadow = true;
    truck.add(bumper);

    const grillGeo = new THREE.BoxGeometry(2.2, 1.2, 0.1);
    const grill = new THREE.Mesh(grillGeo, grillMaterials);
    grill.position.set(0, 1.6, 4.41);
    truck.add(grill);

    const hlGeo = new THREE.BoxGeometry(0.5, 0.4, 0.1);
    const hlLeft = new THREE.Mesh(hlGeo, hlMaterials);
    hlLeft.position.set(0.8, 0.7, 4.51);
    const hlRight = new THREE.Mesh(hlGeo, hlMaterials);
    hlRight.position.set(-0.8, 0.7, 4.51);
    
    // Echte Spotlight-Lichtkegel für die Frontscheinwerfer
    const leftSpot = new THREE.SpotLight('#ffffff', 30, 60, Math.PI / 5, 0.5, 1.5);
    leftSpot.position.set(0.8, 0.7, 4.51);
    leftSpot.target.position.set(0.8, -0.5, 20); // Zielt nach vorne unten auf den Boden
    
    const rightSpot = new THREE.SpotLight('#ffffff', 30, 60, Math.PI / 5, 0.5, 1.5);
    rightSpot.position.set(-0.8, 0.7, 4.51);
    rightSpot.target.position.set(-0.8, -0.5, 20);

    // Füge Lichter und deren Targets dem Truck hinzu, damit sie mitfahren
    truck.add(hlLeft, hlRight, leftSpot, leftSpot.target, rightSpot, rightSpot.target);

    const plateGeo = new THREE.BoxGeometry(0.8, 0.2, 0.1);
    const plate = new THREE.Mesh(plateGeo, plateMaterials);
    plate.position.set(0, 0.45, 4.51);
    truck.add(plate);

    // 6. Spiegel (Side Mirrors & Front Rampenspiegel)
    // Spiegel sind vorne an der Karosserie (Bugspiegel-Stil) befestigt
    const mirrorArmGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4);
    mirrorArmGeo.rotateZ(Math.PI / 2);
    const verticalArmGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
    
    const mirrorMainGeo = new RoundedBoxGeometry(0.12, 0.4, 0.22, 4, 0.03);
    const mirrorSubGeo = new RoundedBoxGeometry(0.12, 0.2, 0.22, 4, 0.03);
    const glassMainGeo = new THREE.BoxGeometry(0.13, 0.38, 0.2);
    const glassSubGeo = new THREE.BoxGeometry(0.13, 0.18, 0.2);

    const createMirror = (xOffset: number, side: 'left' | 'right') => {
      const mirrorGroup = new THREE.Group();
      const s = side === 'left' ? 1 : -1;
      
      // Befestigungsarm an der vorderen Karosserie
      const armMain = new THREE.Mesh(mirrorArmGeo, plasticMat);
      armMain.position.set(0.15 * s, 0, 0); 
      
      // Senkrechte Stange für die Spiegel
      const armVert = new THREE.Mesh(verticalArmGeo, plasticMat);
      armVert.position.set(0.35 * s, 0, 0);

      // Hauptspiegel (oben)
      const headMain = new THREE.Mesh(mirrorMainGeo, plasticMat);
      headMain.position.set(0.35 * s, 0.1, 0);
      const glassMain = new THREE.Mesh(glassMainGeo, glassMat);
      glassMain.position.set(0.35 * s, 0.1, -0.015);
      
      // Zusatzspiegel (unten)
      const headSub = new THREE.Mesh(mirrorSubGeo, plasticMat);
      headSub.position.set(0.35 * s, -0.3, 0);
      const glassSub = new THREE.Mesh(glassSubGeo, glassMat);
      glassSub.position.set(0.35 * s, -0.3, -0.015);
      
      mirrorGroup.add(armMain, armVert, headMain, glassMain, headSub, glassSub);
      
      // Montagepunkt weit vorne an der A-Säule / Karosserie-Ecke
      mirrorGroup.position.set(xOffset, 2.3, 4.3); 
      return mirrorGroup;
    };
    truck.add(createMirror(1.15, 'left'));
    truck.add(createMirror(-1.15, 'right'));


    // 8. Räder & Kotflügel (265/70R17.5: Ø=815mm, r=0.408m, Breite=265mm)
    const tireRadius = 0.408;
    const tireWidth = 0.265;
    const rimRadius = 0.222; // 17.5" / 2
    const wheelGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 32);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth + 0.02, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, tireWidth + 0.04, 16);
    hubGeo.rotateZ(Math.PI / 2);

    const wheels: THREE.Group[] = [];
    const createWheel = (x: number, y: number, z: number, isRear = false) => {
      const wGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, plasticMat); 
      const rim = new THREE.Mesh(rimGeo, rimMat);
      if (isRear) {
        rim.scale.set(1, 0.6, 1); 
      }
      const hub = new THREE.Mesh(hubGeo, plasticMat);
      
      wGroup.add(tire, rim, hub);
      wGroup.position.set(x, y, z);
      tire.castShadow = true;
      wheels.push(wGroup);
      return wGroup;
    };

    // Front Axle
    truck.add(createWheel(1.1, tireRadius, frontAxleZ));
    truck.add(createWheel(-1.1, tireRadius, frontAxleZ));
    // Rear Axle (Very far back)
    truck.add(createWheel(1.1, tireRadius, rearAxleZ, true));
    truck.add(createWheel(-1.1, tireRadius, rearAxleZ, true));
    // === Vorderer Radkasten-Bereich (exakt nach Foto) ===
    const greyPlasticMat = new THREE.MeshStandardMaterial({ color: '#555555', roughness: 0.85, metalness: 0.1 });
    const stepMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', roughness: 0.5, metalness: 0.6 }); // Alu-Tritte
    const blinkerGeo = new THREE.BoxGeometry(0.08, 0.04, 0.06);
    const blinkerMat = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 1.5 });

    const createFrontWheelArch = (side: 'left' | 'right') => {
      const group = new THREE.Group();
      const s = side === 'left' ? 1 : -1;

      // 1. Radkastenausschnitt (Wheel Arch Liner) - Halbkreis über dem Rad
      const archGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.25, 24, 1, false, 0, Math.PI);
      archGeo.rotateZ(Math.PI / 2);
      const arch = new THREE.Mesh(archGeo, greyPlasticMat);
      arch.position.set(0.12 * s, 0.45, frontAxleZ);
      group.add(arch);

      // 2. Radkasten-Verkleidung vorne (Plastik vor dem Rad)
      const archFrontGeo = new THREE.BoxGeometry(0.25, 0.6, 0.15);
      const archFront = new THREE.Mesh(archFrontGeo, greyPlasticMat);
      archFront.position.set(0.12 * s, 0.55, frontAxleZ + 0.55);
      group.add(archFront);

      // 3. Einstiegsbereich (Step Block) - hinter dem Vorderrad
      const stepBlockGeo = new THREE.BoxGeometry(0.25, 1.0, 0.8);
      const stepBlock = new THREE.Mesh(stepBlockGeo, plasticMat);
      stepBlock.position.set(0.12 * s, 0.65, frontAxleZ - 0.85);
      group.add(stepBlock);

      // 4. Anti-Rutsch Trittstufen (3 Alu-Stufen)
      const treadGeo = new THREE.BoxGeometry(0.28, 0.04, 0.35);
      for (let i = 0; i < 3; i++) {
        const tread = new THREE.Mesh(treadGeo, stepMat);
        tread.position.set(0.12 * s, 0.35 + i * 0.28, frontAxleZ - 0.85);
        group.add(tread);
      }

      // 5. Schwarzes Panel unter der Tür (Lower Door Panel)
      const lowerPanelGeo = new THREE.BoxGeometry(0.06, 0.5, 1.0);
      const lowerPanel = new THREE.Mesh(lowerPanelGeo, plasticMat);
      lowerPanel.position.set(1.18 * s, 1.05, frontAxleZ - 0.5);
      group.add(lowerPanel);

      // 6. Schmutzfänger hinten am Radkasten
      const flapGeo = new THREE.BoxGeometry(0.25, 0.35, 0.04);
      const flap = new THREE.Mesh(flapGeo, plasticMat);
      flap.position.set(0.12 * s, 0.2, frontAxleZ - 0.6);
      group.add(flap);

      // 7. Orangener Seitenblinker (am Ende des Trittbretts)
      const blinker = new THREE.Mesh(blinkerGeo, blinkerMat);
      blinker.position.set(1.22 * s, 0.95, frontAxleZ - 1.2);
      group.add(blinker);

      return group;
    };
    truck.add(createFrontWheelArch('left'));
    truck.add(createFrontWheelArch('right'));

    // Kotflügel Rear (Standard semi-circles)
    const mudguardRearGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 16, 1, false, 0, Math.PI);
    mudguardRearGeo.rotateZ(Math.PI / 2);
    const createRearMudguard = (x: number, y: number, z: number) => {
      const mud = new THREE.Mesh(mudguardRearGeo, plasticMat);
      mud.position.set(x, y, z);
      return mud;
    };
    truck.add(createRearMudguard(1.1, 0.45, rearAxleZ));
    truck.add(createRearMudguard(-1.1, 0.45, rearAxleZ));

    // 9. Ground Plane (Dark Void)
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.MeshStandardMaterial({ color: '#000000', roughness: 1.0, metalness: 0.0 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.y = 0;
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Grid for motion perception
    const grid = new THREE.GridHelper(200, 100, 0x333333, 0x111111);
    grid.position.y = 0.01;
    scene.add(grid);

    truck.rotation.y = 0;
    truck.position.set(0, 0, 0);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let animationId: number;
    let t = 0;
    let camAngle = 0;
    const radius = 20;
    const truckSpeed = 0.004;
    const wheelRadius = 0.408; // Match tireRadius

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (drivingRef.current) {
        t += truckSpeed;
      }

      // Achter-Kurve (Lissajous: x = sin(t), z = sin(2t)/2)
      const x = Math.sin(t) * radius;
      const z = Math.sin(t * 2) * (radius * 0.5);

      // Richtung berechnen (Tangente der Kurve)
      const dx = Math.cos(t) * radius;
      const dz = Math.cos(t * 2) * radius;
      const heading = Math.atan2(dx, dz);

      truck.position.x = x;
      truck.position.z = z;
      truck.rotation.y = heading;

      // Räder drehen nur wenn er fährt
      if (drivingRef.current) {
        const dist = truckSpeed * radius;
        wheels.forEach(w => {
          w.children[0].rotation.x += dist / wheelRadius;
          w.children[1].rotation.x += dist / wheelRadius;
          w.children[2].rotation.x += dist / wheelRadius;
        });
      }

      // Türen animieren
      const targetDoorAngle = doorsRef.current ? Math.PI / 3 : 0; // 60 Grad öffnen
      leftDoorGroup.rotation.y += (targetDoorAngle - leftDoorGroup.rotation.y) * 0.1;
      rightDoorGroup.rotation.y += (-targetDoorAngle - rightDoorGroup.rotation.y) * 0.1;

      // Cinematic Kamera: Kreist langsam um den Truck (auch vertikal)
      camAngle += 0.003; // Rotationsgeschwindigkeit der Kamera
      const camRadius = 18; // Abstand der Kamera
      const camHeight = 6 + Math.sin(camAngle * 1.2) * 4;  // Höhe schwankt sanft zwischen 2 und 10
      
      const camOffsetX = Math.sin(camAngle) * camRadius;
      const camOffsetZ = Math.cos(camAngle) * camRadius;
      
      const idealCamPos = new THREE.Vector3(x + camOffsetX, camHeight, z + camOffsetZ);
      camera.position.lerp(idealCamPos, 0.03);

      const lookTarget = new THREE.Vector3(x, 2.5, z);
      controls.target.lerp(lookTarget, 0.05);
      controls.update();

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      pmremGenerator.dispose();
      
      grillTex.dispose();
      plateTex.dispose();
      hlTex.dispose();
      kofferSideTex.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
      
      {/* UI Controls */}
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 16, pointerEvents: 'auto',
      }}>
        <button
          onClick={() => {
            const driving = !isDriving;
            setIsDriving(driving);
            drivingRef.current = driving;
            // Wenn er fährt, Türen schließen
            if (driving) {
              setDoorsOpen(false);
              doorsRef.current = false;
            }
          }}
          style={{
            padding: '12px 24px', borderRadius: 8, border: 'none',
            background: isDriving ? '#e74c3c' : '#2ecc71', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            transition: 'background 0.2s',
          }}
        >
          {isDriving ? '🛑 Anhalten' : '▶️ Weiterfahren'}
        </button>

        <button
          onClick={() => {
            const open = !doorsOpen;
            setDoorsOpen(open);
            doorsRef.current = open;
            // Wenn Türen öffnen, anhalten
            if (open) {
              setIsDriving(false);
              drivingRef.current = false;
            }
          }}
          style={{
            padding: '12px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: doorsOpen ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.6)', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
          }}
        >
          {doorsOpen ? '🚪 Türen schließen' : '🚪 Türen öffnen'}
        </button>
        
        <button
          onClick={() => setIsBsod(true)}
          style={{
            padding: '12px 16px', borderRadius: 8, border: 'none',
            background: '#0078D7', color: '#fff',
            fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          💻 Crash
        </button>
      </div>

      {/* BSOD Overlay */}
      {isBsod && (
        <div 
          onClick={() => setIsBsod(false)}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
            background: '#0078D7', color: '#fff', zIndex: 9999,
            display: 'flex', flexDirection: 'column', padding: '10%',
            fontFamily: '"Segoe UI", "Inter", sans-serif', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '8rem', marginBottom: '2rem' }}>:(</div>
          <div style={{ fontSize: '2rem', marginBottom: '2rem', maxWidth: '80%' }}>
            Your 3D Truck ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.
          </div>
          <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>
            0% complete<br/><br/>
            For more information about this issue and possible fixes, visit https://windows.com/stopcode<br/><br/>
            If you call a support person, give them this info:<br/>
            Stop code: CRITICAL_TRUCK_FAILURE<br/>
            Failed: MAN_TGL.sys
          </div>
        </div>
      )}
    </div>
  );
}
