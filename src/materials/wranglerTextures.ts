import * as THREE from 'three';

/**
 * Erzeugt hochauflösende prozedurale Canvas-Texturen für den 2007 Jeep Wrangler Rubicon JK:
 * 1. 7-Slot Grille & Frontmaske mit Waben-Kühlergitter
 * 2. "RUBICON" Hauben-Schriftzug (beidseitig)
 * 3. 32" Off-Road Reifenprofil (Mud-Terrain Profil & Seitenwand-Schrift)
 * 4. Reserverad-Abdeckung mit legendärem "Jeep"-Schriftzug
 * 5. Modernes Armaturenbrett & Rundinstrumente (Tacho, Drehzahlmesser, 4x4 Telemetrie)
 * 6. "Trail Rated 4x4" Plakette für die vorderen Kotflügel
 * 7. Heckleuchten-Cluster (Rot/Weiß mit Wabenreflektor)
 */

export interface WranglerTextures {
  grilleMap: THREE.CanvasTexture;
  rubiconHoodMap: THREE.CanvasTexture;
  tireTreadMap: THREE.CanvasTexture;
  spareCoverMap: THREE.CanvasTexture;
  dashboardMap: THREE.CanvasTexture;
  trailRatedMap: THREE.CanvasTexture;
  tailLightMap: THREE.CanvasTexture;
}

export function createWranglerTextures(): WranglerTextures {
  // 1. 7-Slot Grille & Waben-Kühler
  const grilleCanvas = document.createElement('canvas');
  grilleCanvas.width = 1024;
  grilleCanvas.height = 512;
  const ctxG = grilleCanvas.getContext('2d')!;

  ctxG.fillStyle = '#181818';
  ctxG.fillRect(0, 0, 1024, 512);

  // Waben-Kühlergitter Hintergrund
  ctxG.fillStyle = '#080808';
  ctxG.fillRect(80, 80, 864, 350);

  ctxG.strokeStyle = '#222222';
  ctxG.lineWidth = 2;
  const hexSize = 14;
  for (let y = 90; y < 420; y += hexSize * 1.5) {
    for (let x = 90; x < 930; x += hexSize * 1.8) {
      ctxG.beginPath();
      ctxG.arc(x, y, hexSize * 0.6, 0, Math.PI * 2);
      ctxG.stroke();
    }
  }

  // 7 vertikale Slots
  const slotWidth = 72;
  const slotHeight = 310;
  const slotSpacing = 44;
  const startX = 140;

  for (let i = 0; i < 7; i++) {
    const sx = startX + i * (slotWidth + slotSpacing);
    const sy = 100;

    // Slot-Ausschnitt
    ctxG.save();
    ctxG.fillStyle = '#000000';
    ctxG.beginPath();
    ctxG.roundRect(sx, sy, slotWidth, slotHeight, 32);
    ctxG.fill();

    // Tiefe & Schatten
    ctxG.strokeStyle = '#333333';
    ctxG.lineWidth = 6;
    ctxG.stroke();

    // Innengitter
    ctxG.strokeStyle = '#1a1a1a';
    ctxG.lineWidth = 3;
    for (let gy = sy + 20; gy < sy + slotHeight - 10; gy += 18) {
      ctxG.beginPath();
      ctxG.moveTo(sx + 10, gy);
      ctxG.lineTo(sx + slotWidth - 10, gy);
      ctxG.stroke();
    }
    ctxG.restore();
  }

  const grilleMap = new THREE.CanvasTexture(grilleCanvas);
  grilleMap.colorSpace = THREE.SRGBColorSpace;

  // 2. "RUBICON" Hauben-Schriftzug
  const hoodCanvas = document.createElement('canvas');
  hoodCanvas.width = 1024;
  hoodCanvas.height = 256;
  const ctxH = hoodCanvas.getContext('2d')!;

  ctxH.clearRect(0, 0, 1024, 256);

  ctxH.font = '900 96px "Impact", "Arial Black", sans-serif';
  ctxH.letterSpacing = '14px';
  ctxH.textAlign = 'center';
  ctxH.textBaseline = 'middle';

  // Schwarzer Rand
  ctxH.strokeStyle = '#050505';
  ctxH.lineWidth = 14;
  ctxH.strokeText('R U B I C O N', 512, 128);

  // Silber/Grauer Kern
  ctxH.fillStyle = '#d1d5db';
  ctxH.fillText('R U B I C O N', 512, 128);

  const rubiconHoodMap = new THREE.CanvasTexture(hoodCanvas);
  rubiconHoodMap.colorSpace = THREE.SRGBColorSpace;

  // 3. 32" Off-Road Reifenprofil
  const tireCanvas = document.createElement('canvas');
  tireCanvas.width = 512;
  tireCanvas.height = 1024;
  const ctxT = tireCanvas.getContext('2d')!;

  ctxT.fillStyle = '#1c1d1f';
  ctxT.fillRect(0, 0, 512, 1024);

  // Massive Mud-Terrain Profilblöcke
  ctxT.fillStyle = '#0a0a0b';
  for (let y = 0; y < 1024; y += 64) {
    // Äußere Stollen Links
    ctxT.beginPath();
    ctxT.roundRect(16, y + 8, 120, 48, 8);
    ctxT.fill();

    // Äußere Stollen Rechts
    ctxT.beginPath();
    ctxT.roundRect(376, y + 8, 120, 48, 8);
    ctxT.fill();

    // Mittlere Zick-Zack Blöcke
    ctxT.beginPath();
    ctxT.roundRect(160, y + 24, 192, 40, 6);
    ctxT.fill();

    // Rillen-Highlights
    ctxT.fillStyle = '#2a2b2e';
    ctxT.fillRect(16, y + 28, 110, 6);
    ctxT.fillRect(386, y + 28, 110, 6);
    ctxT.fillRect(170, y + 42, 172, 4);
    ctxT.fillStyle = '#0a0a0b';
  }

  const tireTreadMap = new THREE.CanvasTexture(tireCanvas);
  tireTreadMap.wrapS = THREE.RepeatWrapping;
  tireTreadMap.wrapT = THREE.RepeatWrapping;
  tireTreadMap.repeat.set(1, 4);

  // 4. Reserverad-Abdeckung mit legendärem "Jeep"-Schriftzug
  const spareCanvas = document.createElement('canvas');
  spareCanvas.width = 512;
  spareCanvas.height = 512;
  const ctxS = spareCanvas.getContext('2d')!;

  // Genarbtes schwarzes Vinyl
  ctxS.fillStyle = '#141618';
  ctxS.fillRect(0, 0, 512, 512);

  // Ziernaht-Kreis
  ctxS.strokeStyle = '#22252a';
  ctxS.lineWidth = 6;
  ctxS.setLineDash([8, 8]);
  ctxS.beginPath();
  ctxS.arc(256, 256, 230, 0, Math.PI * 2);
  ctxS.stroke();
  ctxS.setLineDash([]);

  // "Jeep" Markenlogo
  ctxS.font = '900 110px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  ctxS.fillStyle = '#e2e8f0';
  ctxS.textAlign = 'center';
  ctxS.textBaseline = 'middle';
  ctxS.shadowColor = '#000000';
  ctxS.shadowBlur = 12;
  ctxS.shadowOffsetX = 3;
  ctxS.shadowOffsetY = 4;
  ctxS.fillText('Jeep', 256, 256);

  const spareCoverMap = new THREE.CanvasTexture(spareCanvas);
  spareCoverMap.colorSpace = THREE.SRGBColorSpace;

  // 5. Modernes Armaturenbrett & Rundinstrumente
  const dashCanvas = document.createElement('canvas');
  dashCanvas.width = 1024;
  dashCanvas.height = 512;
  const ctxD = dashCanvas.getContext('2d')!;

  ctxD.fillStyle = '#121418';
  ctxD.fillRect(0, 0, 1024, 512);

  // Tacho (Links) & Drehzahlmesser (Rechts)
  const drawGauge = (cx: number, cy: number, r: number, label: string) => {
    ctxD.fillStyle = '#080a0c';
    ctxD.beginPath();
    ctxD.arc(cx, cy, r, 0, Math.PI * 2);
    ctxD.fill();

    ctxD.strokeStyle = '#38bdf8';
    ctxD.lineWidth = 4;
    ctxD.beginPath();
    ctxD.arc(cx, cy, r - 6, THREE.MathUtils.degToRad(140), THREE.MathUtils.degToRad(400));
    ctxD.stroke();

    ctxD.fillStyle = '#ffffff';
    ctxD.font = 'bold 20px sans-serif';
    ctxD.textAlign = 'center';
    ctxD.fillText(label, cx, cy + r * 0.45);

    // Zeiger
    ctxD.strokeStyle = '#ef4444';
    ctxD.lineWidth = 4;
    ctxD.beginPath();
    ctxD.moveTo(cx, cy);
    ctxD.lineTo(cx + Math.cos(THREE.MathUtils.degToRad(210)) * (r - 20), cy + Math.sin(THREE.MathUtils.degToRad(210)) * (r - 20));
    ctxD.stroke();
  };

  drawGauge(280, 256, 120, '220 KM/H');
  drawGauge(744, 256, 120, '7000 RPM');

  // Digitales Display in der Mitte
  ctxD.fillStyle = '#001a14';
  ctxD.fillRect(440, 200, 144, 110);
  ctxD.strokeStyle = '#10b981';
  ctxD.lineWidth = 2;
  ctxD.strokeRect(440, 200, 144, 110);

  ctxD.fillStyle = '#34d399';
  ctxD.font = 'bold 22px "Courier New", monospace';
  ctxD.textAlign = 'center';
  ctxD.fillText('4x4 HIGH', 512, 240);
  ctxD.fillText('D44 LOCK', 512, 280);

  const dashboardMap = new THREE.CanvasTexture(dashCanvas);
  dashboardMap.colorSpace = THREE.SRGBColorSpace;

  // 6. "Trail Rated 4x4" Plakette
  const trailCanvas = document.createElement('canvas');
  trailCanvas.width = 256;
  trailCanvas.height = 256;
  const ctxTr = trailCanvas.getContext('2d')!;

  ctxTr.fillStyle = '#94a3b8';
  ctxTr.beginPath();
  ctxTr.arc(128, 128, 120, 0, Math.PI * 2);
  ctxTr.fill();

  ctxTr.fillStyle = '#0f172a';
  ctxTr.beginPath();
  ctxTr.arc(128, 128, 108, 0, Math.PI * 2);
  ctxTr.fill();

  ctxTr.fillStyle = '#f8fafc';
  ctxTr.font = '900 24px sans-serif';
  ctxTr.textAlign = 'center';
  ctxTr.fillText('TRAIL', 128, 90);
  ctxTr.fillText('RATED', 128, 125);
  ctxTr.font = '900 36px sans-serif';
  ctxTr.fillStyle = '#ef4444';
  ctxTr.fillText('4x4', 128, 175);

  const trailRatedMap = new THREE.CanvasTexture(trailCanvas);
  trailRatedMap.colorSpace = THREE.SRGBColorSpace;

  // 7. Heckleuchten-Cluster
  const tailCanvas = document.createElement('canvas');
  tailCanvas.width = 256;
  tailCanvas.height = 256;
  const ctxTl = tailCanvas.getContext('2d')!;

  ctxTl.fillStyle = '#880808';
  ctxTl.fillRect(0, 0, 256, 170);

  ctxTl.fillStyle = '#d4d4d8';
  ctxTl.fillRect(0, 170, 256, 86);

  ctxTl.strokeStyle = '#550000';
  ctxTl.lineWidth = 3;
  for (let y = 0; y < 170; y += 12) {
    for (let x = 0; x < 256; x += 12) {
      ctxTl.strokeRect(x, y, 12, 12);
    }
  }

  const tailLightMap = new THREE.CanvasTexture(tailCanvas);
  tailLightMap.colorSpace = THREE.SRGBColorSpace;

  return {
    grilleMap,
    rubiconHoodMap,
    tireTreadMap,
    spareCoverMap,
    dashboardMap,
    trailRatedMap,
    tailLightMap,
  };
}
