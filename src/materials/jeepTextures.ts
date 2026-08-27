import * as THREE from 'three';

/**
 * Procedural Canvas Texture and Geometry Generators for the Willys MB 1/4-Ton 4x4 Jeep Simulation.
 * Industrial Gold Standard & Senior Architecture Guidelines.
 */

/** Helper zur Mipmap-Generierung und 16x Anisotropie (Eliminiert Flimmern & Moiré) */
function finalizeCanvasTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 16;
  return tex;
}

/**
 * 1. Willys MB 9-Slot Kühlergrill mit vertikalen Schlitzen, Scheinwerfereinfassungen & Befestigungsbolzen.
 */
export function createWillysGrillTexture(bodyColor = '#3a442e'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Grundfarbe passend zur Karosserie (z. B. Olive Drab)
    ctx.fillStyle = bodyColor;
    ctx.fillRect(0, 0, 1024, 512);

    // Kanten-Schattierung & Blechprägung
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 1004, 492);

    // 9 vertikale Kühlschlitze (Zentraler Bereich)
    const slotCount = 9;
    const slotWidth = 36;
    const slotHeight = 320;
    const slotSpacing = 68;
    const startX = (1024 - (slotCount * slotSpacing)) / 2 + 16;
    const startY = 110;

    for (let i = 0; i < slotCount; i++) {
      const sx = startX + i * slotSpacing;

      // Schlitz-Hintergrund (Kühlerlamellen im Schatten)
      ctx.fillStyle = '#101410';
      ctx.beginPath();
      ctx.roundRect(sx, startY, slotWidth, slotHeight, 18);
      ctx.fill();

      // Schlitz-Innenkanten-Highlight (Lichtabfall von oben)
      const grad = ctx.createLinearGradient(sx, startY, sx + slotWidth, startY);
      grad.addColorStop(0, 'rgba(0,0,0,0.85)');
      grad.addColorStop(0.3, 'rgba(20,25,20,0.9)');
      grad.addColorStop(0.7, 'rgba(30,35,30,0.5)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(sx, startY, slotWidth, slotHeight, 18);
      ctx.fill();

      // Horizontale feine Kühlerrippen im Hintergrund
      ctx.strokeStyle = 'rgba(60, 70, 50, 0.35)';
      ctx.lineWidth = 2;
      for (let y = startY + 8; y < startY + slotHeight - 8; y += 12) {
        ctx.beginPath();
        ctx.moveTo(sx + 4, y);
        ctx.lineTo(sx + slotWidth - 4, y);
        ctx.stroke();
      }

      // Blech-Prägekante um den Schlitz herum
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(sx - 2, startY - 2, slotWidth + 4, slotHeight + 4, 20);
      ctx.stroke();
    }

    // Äußere Scheinwerfer-Ausschnitte / Marker-Positionen
    // Links
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(95, 270, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Rechts
    ctx.beginPath();
    ctx.arc(1024 - 95, 270, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Befestigungsschrauben / Nieten
    ctx.fillStyle = '#1c221a';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    const rivetPoints = [
      [40, 40], [200, 40], [512, 40], [824, 40], [984, 40],
      [40, 472], [200, 472], [512, 472], [824, 472], [984, 472]
    ];
    for (const [rx, ry] of rivetPoints) {
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  return finalizeCanvasTexture(c);
}

/**
 * 2. US Army WWII Invasionsstern Decal für Motorhaube & Karosserie ("U.S.A. 2045819-S").
 */
export function createMilitaryStarDecalTexture(inverted = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 1024, 1024);

    const starColor = inverted ? '#111111' : '#f4f4f0';
    const cx = 512;
    const cy = 460;
    const outerR = 340;
    const innerR = 140;

    // Kreisförmiger Außenring (US Army WWII Invasion Star Ring)
    ctx.strokeStyle = starColor;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(cx, cy, 380, 0, Math.PI * 2);
    ctx.stroke();

    // 5-Zackiger Stern
    ctx.fillStyle = starColor;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + (2 * Math.PI) / 10;
      
      const ox = cx + outerR * Math.cos(outerAngle);
      const oy = cy + outerR * Math.sin(outerAngle);
      const ix = cx + innerR * Math.cos(innerAngle);
      const iy = cy + innerR * Math.sin(innerAngle);

      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();

    // Leichter Stencil-Weathering-Effekt (Vintage Schablonenschnitt)
    ctx.strokeStyle = inverted ? '#ffffff' : '#3a442e';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 380, -Math.PI / 6, -Math.PI / 6 + 0.12);
    ctx.arc(cx, cy, 380, Math.PI / 2, Math.PI / 2 + 0.12);
    ctx.stroke();

    // US Army Registrierungs-Schriftzug unter dem Stern
    ctx.fillStyle = starColor;
    ctx.font = '900 68px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('U.S.A. 2045819-S', cx, 910);
  }
  return finalizeCanvasTexture(c);
}

/**
 * 3. Willys MB Armaturenbrett mit klassischen 4 Rundinstrumenten & 3 Datenplaketten.
 */
export function createJeepDashboardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Olive Drab Blech-Hintergrund
    ctx.fillStyle = '#323c28';
    ctx.fillRect(0, 0, 1024, 512);

    // Kanten und Versteifungssicken
    ctx.strokeStyle = '#22291b';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 1004, 492);

    // Linke Seite: 4 Rundinstrumente
    const gauges = [
      { name: 'SPEED', min: '0', max: '60', unit: 'MPH', x: 180, y: 220, r: 85 },
      { name: 'OIL', min: '0', max: '60', unit: 'LBS', x: 340, y: 150, r: 48 },
      { name: 'TEMP', min: '100', max: '220', unit: '°F', x: 440, y: 150, r: 48 },
      { name: 'AMPS', min: '-30', max: '+30', unit: '', x: 340, y: 280, r: 48 },
      { name: 'FUEL', min: 'E', max: 'F', unit: 'GAS', x: 440, y: 280, r: 48 },
    ];

    for (const g of gauges) {
      // Chrom/Messing-Lünette
      ctx.fillStyle = '#1a1f18';
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a9280';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Schwarzes Zifferblatt
      ctx.fillStyle = '#080a08';
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();

      // Skalenstriche & Beschriftung
      ctx.strokeStyle = '#e0e6d6';
      ctx.fillStyle = '#e0e6d6';
      ctx.lineWidth = 2;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';

      for (let a = -Math.PI * 0.75; a <= Math.PI * 0.75; a += Math.PI * 0.25) {
        const x1 = g.x + (g.r - 12) * Math.cos(a);
        const y1 = g.y + (g.r - 12) * Math.sin(a);
        const x2 = g.x + (g.r - 4) * Math.cos(a);
        const y2 = g.y + (g.r - 4) * Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Zeiger (Vintage Weiß)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + (g.r - 18) * Math.cos(-0.2), g.y + (g.r - 18) * Math.sin(-0.2));
      ctx.stroke();

      // Zeigermutter
      ctx.fillStyle = '#c5a059';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Text im Instrument
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(g.name, g.x, g.y + (g.r * 0.45));
    }

    // Rechte Seite: 3 metallene WWII Datenplaketten (Data Plates)
    const plates = [
      { title: 'WILLYS-OVERLAND MOTORS', sub: 'MODEL MB 1/4 TON 4x4', x: 570, y: 90, w: 200, h: 100 },
      { title: 'SPECIAL GEAR SHIFTING', sub: 'CAUTION: FRONT AXLE DRIVE', x: 790, y: 90, w: 200, h: 100 },
      { title: 'MAXIMUM SPEED & LOAD', sub: 'MAX 65 MPH - 800 LBS', x: 680, y: 220, w: 220, h: 90 }
    ];

    for (const p of plates) {
      // Messing/Zink-Platte
      ctx.fillStyle = '#b59a57';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#4a3f1d';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      // Nieten an den Ecken
      ctx.fillStyle = '#2e2712';
      ctx.beginPath();
      ctx.arc(p.x + 6, p.y + 6, 2.5, 0, Math.PI * 2);
      ctx.arc(p.x + p.w - 6, p.y + 6, 2.5, 0, Math.PI * 2);
      ctx.arc(p.x + 6, p.y + p.h - 6, 2.5, 0, Math.PI * 2);
      ctx.arc(p.x + p.w - 6, p.y + p.h - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eingeätzter Text
      ctx.fillStyle = '#1f1a0b';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.title, p.x + p.w / 2, p.y + 24);
      ctx.font = '9px monospace';
      ctx.fillText(p.sub, p.x + p.w / 2, p.y + 46);
      ctx.fillText('SERIAL NO: 2045819', p.x + p.w / 2, p.y + 66);
    }

    // Choke & Throttle Zugknöpfe
    ctx.fillStyle = '#111410';
    ctx.beginPath();
    ctx.arc(180, 390, 16, 0, Math.PI * 2);
    ctx.arc(260, 390, 16, 0, Math.PI * 2);
    ctx.arc(340, 390, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d0d8c0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('THROTTLE', 180, 422);
    ctx.fillText('CHOKE', 260, 422);
    ctx.fillText('IGNITION', 340, 422);
  }
  return finalizeCanvasTexture(c);
}

/**
 * 4. 20L US Jerrycan Textur mit "U.S. Q.M.C." Prägung & Versteifungskreuz.
 */
export function createJerryCanTexture(color = '#3a442e'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);

    // Kantenprofil
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, 472, 472);

    // Geprägtes "X" (Versteifungssicken der Stahlkanister)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(80, 80);
    ctx.lineTo(432, 432);
    ctx.moveTo(432, 80);
    ctx.lineTo(80, 432);
    ctx.stroke();

    // Highlight auf dem geprägten Kreuz
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(82, 78);
    ctx.lineTo(434, 430);
    ctx.moveTo(430, 78);
    ctx.lineTo(78, 430);
    ctx.stroke();

    // US Quartermaster Corps Prägung
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('U. S.', 256, 170);
    ctx.font = 'bold 28px monospace';
    ctx.fillText('Q. M. C.', 256, 210);
    ctx.font = 'bold 22px monospace';
    ctx.fillText('1943 - 20 L', 256, 360);
  }
  return finalizeCanvasTexture(c);
}

/**
 * 5. 6.00-16 NDT (Non-Directional Tread) Reifenprofil-Textur für Militär-Geländereifen.
 */
export function createNdtTireTreadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Mattschwarzer Reifengummi
    ctx.fillStyle = '#161816';
    ctx.fillRect(0, 0, 512, 512);

    // Charakteristisches NDT-Militär-Zacken-Profil (Non-Directional Chevron Lugs)
    ctx.fillStyle = '#0a0c0a';
    const lugCount = 16;
    const stepY = 512 / lugCount;

    for (let i = 0; i < lugCount; i++) {
      const y = i * stepY;

      // Linker Stollen
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(220, y + stepY * 0.4);
      ctx.lineTo(200, y + stepY * 0.85);
      ctx.lineTo(0, y + stepY * 0.45);
      ctx.closePath();
      ctx.fill();

      // Rechter Stollen (gegenläufig versetzt)
      ctx.beginPath();
      ctx.moveTo(512, y + stepY * 0.5);
      ctx.lineTo(292, y + stepY * 0.9);
      ctx.lineTo(312, y + stepY * 1.35);
      ctx.lineTo(512, y + stepY * 0.95);
      ctx.closePath();
      ctx.fill();

      // Profilkanten-Schatten
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Mittelrille
    ctx.fillStyle = '#060806';
    ctx.fillRect(236, 0, 40, 512);
  }
  return finalizeCanvasTexture(c);
}

/**
 * 6. Blackout Drive Marker Scheinwerfer Textur (Schlitzblende).
 */
export function createBlackoutDriveTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1a2216';
    ctx.fillRect(0, 0, 256, 256);

    // Ovales Gehäuse
    ctx.fillStyle = '#080a06';
    ctx.beginPath();
    ctx.ellipse(128, 128, 110, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Schmaler horizontaler Lichtschlitz
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.roundRect(40, 115, 176, 26, 12);
    ctx.fill();

    // Weicher Lichtglanz
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 90);
    grad.addColorStop(0, 'rgba(255, 234, 167, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 200, 50, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return finalizeCanvasTexture(c);
}

/**
 * 7. Pioneer Tools Textur (Holzstiel & geschmiedeter Stahl für Schaufel & Axt).
 */
export function createPioneerToolsTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Hickory-Holzmaserung für den Werkzeugstiel
    const woodGrad = ctx.createLinearGradient(0, 0, 0, 128);
    woodGrad.addColorStop(0, '#8c5828');
    woodGrad.addColorStop(0.3, '#a36932');
    woodGrad.addColorStop(0.7, '#75441d');
    woodGrad.addColorStop(1, '#593315');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, 0, 512, 128);

    // Holzmaserungs-Linien
    ctx.strokeStyle = 'rgba(50, 25, 10, 0.4)';
    ctx.lineWidth = 1.5;
    for (let y = 10; y < 120; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y) * 4);
      ctx.bezierCurveTo(150, y - 6, 350, y + 6, 512, y + Math.cos(y) * 4);
      ctx.stroke();
    }

    // Geschmiedeter Werkzeugstahl am rechten Ende
    ctx.fillStyle = '#2d3330';
    ctx.fillRect(380, 0, 132, 128);
    ctx.strokeStyle = '#85908b';
    ctx.lineWidth = 3;
    ctx.strokeRect(380, 0, 132, 128);
  }
  return finalizeCanvasTexture(c);
}
