import * as THREE from 'three';

/**
 * Procedural Canvas Texture and Geometry Generators for the MAN TGL 12.250 Truck Simulation.
 * Industrial Gold Standard & Senior Architecture Guidelines (Säule 4.2).
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

/** 1. MAN Kühlergrill mit Wabenstruktur, Löwen-Emblem & Chrom-Zierleiste */
export function createGrillTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Deep black matte base
    ctx.fillStyle = '#101214';
    ctx.fillRect(0, 0, 1024, 512);

    // Hexagonal Honeycomb mesh pattern
    ctx.strokeStyle = '#22252a';
    ctx.lineWidth = 2;
    const hexR = 14;
    const hexW = Math.sqrt(3) * hexR;
    const hexH = 2 * hexR;
    for (let y = 100; y < 490; y += hexH * 0.75) {
      for (let x = 30; x < 990; x += hexW) {
        const xOffset = (Math.round(y / (hexH * 0.75)) % 2 === 0) ? 0 : hexW / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          const hx = x + xOffset + hexR * Math.cos(angle);
          const hy = y + hexR * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Polished Upper Chrome / Silver Bar
    const chromeGrad = ctx.createLinearGradient(0, 30, 0, 120);
    chromeGrad.addColorStop(0, '#ffffff');
    chromeGrad.addColorStop(0.2, '#e0e4e8');
    chromeGrad.addColorStop(0.5, '#889098');
    chromeGrad.addColorStop(0.8, '#c8d0d8');
    chromeGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = chromeGrad;
    ctx.strokeStyle = '#4a5058';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(30, 45);
    ctx.lineTo(400, 45);
    ctx.lineTo(440, 115);
    ctx.lineTo(584, 115);
    ctx.lineTo(624, 45);
    ctx.lineTo(994, 45);
    ctx.lineTo(984, 90);
    ctx.lineTo(630, 90);
    ctx.lineTo(590, 135);
    ctx.lineTo(434, 135);
    ctx.lineTo(394, 90);
    ctx.lineTo(40, 90);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // MAN Lion Silhouette in Chrome Badge
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(512, 70, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c2024';
    ctx.beginPath();
    ctx.arc(512, 62, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(498, 80);
    ctx.lineTo(526, 80);
    ctx.lineTo(522, 68);
    ctx.lineTo(502, 68);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bold Embossed "MAN" Lettering
    const manGrad = ctx.createLinearGradient(0, 200, 0, 360);
    manGrad.addColorStop(0, '#ffffff');
    manGrad.addColorStop(0.3, '#f0f4f8');
    manGrad.addColorStop(0.5, '#788088');
    manGrad.addColorStop(0.7, '#d8e0e8');
    manGrad.addColorStop(1, '#505860');
    ctx.fillStyle = manGrad;
    ctx.font = '900 180px "Inter", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 10;
    ctx.fillText('MAN', 512, 290);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Lower Cooling Slits
    ctx.fillStyle = '#08090a';
    ctx.strokeStyle = '#22252a';
    ctx.lineWidth = 3;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(160, 410, 260, 45, 12);
      ctx.roundRect(604, 410, 260, 45, 12);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(160, 410, 260, 45);
      ctx.fillRect(604, 410, 260, 45);
    }
  }
  return finalizeCanvasTexture(c);
}

/** 2. "TGL 12.250" Typenplakette */
export function createTglBadgeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#16191d';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 250, 58);

    const grad = ctx.createLinearGradient(0, 10, 0, 50);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.font = 'bold 28px "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText('TGL 12.250', 128, 32);
  }
  return finalizeCanvasTexture(c);
}

/** 3. SUPERTECHNO Österreich/EU Kennzeichen */
export function createLicensePlateTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Retroreflektierender weißer Hintergrund
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 128);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.5, '#f1f5f9');
    bgGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 128);

    // Schwarzer Außenrahmen
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 122);

    // Österreichische rote Zierlinien oben und unten
    ctx.strokeStyle = '#c00000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(68, 8);
    ctx.lineTo(504, 8);
    ctx.moveTo(68, 114);
    ctx.lineTo(504, 114);
    ctx.stroke();

    // Blaues EU-Band links
    ctx.fillStyle = '#003399';
    ctx.fillRect(6, 6, 58, 110);

    // 12 Gelbe Europa-Sterne im Kreis
    ctx.fillStyle = '#ffcc00';
    const starRadius = 16;
    const starCenterX = 35;
    const starCenterY = 38;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const sx = starCenterX + Math.sin(angle) * starRadius;
      const sy = starCenterY - Math.cos(angle) * starRadius;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Länderkennung "A" (Österreich)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', 35, 82);

    // Wiener Landeswappen & Pickerl
    ctx.fillStyle = '#c00000';
    ctx.fillRect(76, 42, 26, 36);
    ctx.beginPath();
    ctx.arc(89, 78, 13, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(86, 42, 6, 44);
    ctx.fillRect(78, 56, 22, 6);
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(89, 24, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px "Inter", Arial';
    ctx.fillText('2026', 89, 24);

    // Geprägter "SUPERTECHNO" Schriftzug
    ctx.fillStyle = '#94a3b8';
    ctx.font = '900 52px "Inter", "Arial Black", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUPERTECHNO', 118, 67);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('SUPERTECHNO', 115, 62);

    ctx.fillStyle = '#05070a';
    ctx.fillText('SUPERTECHNO', 116, 64);

    // Kennzeichenrahmen-Leiste
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 114, 512, 14);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 8px "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ SUPERTECHNO • CINE CRANES VIENNA ★', 256, 121);
  }
  return finalizeCanvasTexture(c);
}

/** 4. Tank-Rippenstruktur (Moiré-Frei) */
export function createRibbedTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181b1f';
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 256; i += 16) {
      const grad = ctx.createLinearGradient(i, 0, i + 16, 0);
      grad.addColorStop(0, '#101214');
      grad.addColorStop(0.3, '#323740');
      grad.addColorStop(0.7, '#3a404a');
      grad.addColorStop(1, '#101214');
      ctx.fillStyle = grad;
      ctx.fillRect(i, 0, 16, 128);
    }
  }
  return finalizeCanvasTexture(c);
}

/** 5. MAN TGL H7 Doppel-Hauptscheinwerfer-Textur (Exakt nach Foto) */
export function createHeadlightTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // 1. Dunkler Außenrand & Gehäusedichtung
    ctx.fillStyle = '#0e1013';
    ctx.fillRect(0, 0, 1024, 512);

    // Klarglas-Einfassung mit abgerundeten Ecken
    ctx.fillStyle = '#1e2228';
    ctx.beginPath();
    ctx.roundRect(16, 16, 992, 480, 28);
    ctx.fill();
    ctx.strokeStyle = '#363b44';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Hochglanz-Chrom Trägerplatte (Reflektorwanne)
    const chromeGrad = ctx.createLinearGradient(0, 24, 0, 488);
    chromeGrad.addColorStop(0, '#dbe2ea');
    chromeGrad.addColorStop(0.3, '#f1f5f9');
    chromeGrad.addColorStop(0.7, '#cbd5e1');
    chromeGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = chromeGrad;
    ctx.beginPath();
    ctx.roundRect(24, 24, 976, 464, 22);
    ctx.fill();

    // Horizontale Führungsnuten auf der Trägerplatte
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(30, 190); ctx.lineTo(990, 190); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 322); ctx.lineTo(990, 322); ctx.stroke();

    // 3. Großer Hauptscheinwerfer-Reflektor links (Abblendlicht H7, R = 175)
    const cx1 = 300;
    const cy1 = 256;
    const r1 = 175;

    // Reflektor-Kessel
    const bowlGrad1 = ctx.createRadialGradient(cx1, cy1, 10, cx1, cy1, r1);
    bowlGrad1.addColorStop(0, '#ffffff');
    bowlGrad1.addColorStop(0.5, '#e2e8f0');
    bowlGrad1.addColorStop(0.85, '#94a3b8');
    bowlGrad1.addColorStop(1, '#334155');
    ctx.fillStyle = bowlGrad1;
    ctx.beginPath();
    ctx.arc(cx1, cy1, r1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Facettierte Prismen-Segmente im großen Reflektor
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
    ctx.lineWidth = 1.2;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      ctx.beginPath();
      ctx.moveTo(cx1 + Math.cos(angle) * 45, cy1 + Math.sin(angle) * 45);
      ctx.lineTo(cx1 + Math.cos(angle) * (r1 - 4), cy1 + Math.sin(angle) * (r1 - 4));
      ctx.stroke();
    }
    // Vertikale Fresnel-Riffeln in der oberen Hälfte
    for (let x = cx1 - 120; x <= cx1 + 120; x += 14) {
      const halfW = Math.sqrt(Math.max(0, (r1 - 15) ** 2 - (x - cx1) ** 2));
      if (halfW > 10) {
        ctx.beginPath();
        ctx.moveTo(x, cy1 - halfW);
        ctx.lineTo(x, cy1 - 40);
        ctx.stroke();
      }
    }

    // Horizontale Hell-Dunkel-Trennleiste
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx1 - r1 + 8, cy1 - 2, (r1 - 8) * 2, 4);

    // H7 Lampensockel & Kappe (Großer Reflektor)
    const capGrad1 = ctx.createRadialGradient(cx1, cy1, 4, cx1, cy1, 38);
    capGrad1.addColorStop(0, '#475569');
    capGrad1.addColorStop(0.6, '#0f172a');
    capGrad1.addColorStop(1, '#020617');
    ctx.fillStyle = capGrad1;
    ctx.beginPath();
    ctx.arc(cx1, cy1, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Kleinerer Zusatz-/Fernscheinwerfer-Reflektor rechts (R = 145)
    const cx2 = 660;
    const cy2 = 256;
    const r2 = 145;

    const bowlGrad2 = ctx.createRadialGradient(cx2, cy2, 10, cx2, cy2, r2);
    bowlGrad2.addColorStop(0, '#ffffff');
    bowlGrad2.addColorStop(0.5, '#e2e8f0');
    bowlGrad2.addColorStop(0.85, '#94a3b8');
    bowlGrad2.addColorStop(1, '#334155');
    ctx.fillStyle = bowlGrad2;
    ctx.beginPath();
    ctx.arc(cx2, cy2, r2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Rauten-Facettierung im kleinen Reflektor
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
    ctx.lineWidth = 1.2;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      ctx.beginPath();
      ctx.moveTo(cx2 + Math.cos(angle) * 35, cy2 + Math.sin(angle) * 35);
      ctx.lineTo(cx2 + Math.cos(angle) * (r2 - 4), cy2 + Math.sin(angle) * (r2 - 4));
      ctx.stroke();
    }

    // H7 Lampensockel (Kleiner Reflektor)
    ctx.fillStyle = capGrad1;
    ctx.beginPath();
    ctx.arc(cx2, cy2, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. ECE-Prüfzeichen & Lasergravur am unteren Glasrand
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px "Inter", Arial';
    ctx.fillText('MAN 81.25101-6677  •  ECE-R112 H7 E4  02 A PL', 60, 470);

    // 6. Klarglas-Lichtreflexion an der Oberkante
    const glassReflect = ctx.createLinearGradient(0, 24, 0, 160);
    glassReflect.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    glassReflect.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    glassReflect.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glassReflect;
    ctx.beginPath();
    ctx.roundRect(24, 24, 976, 140, [22, 22, 0, 0]);
    ctx.fill();
  }
  return finalizeCanvasTexture(c);
}

/** 6. Digitales Cockpit Dashboard */
export function createDashboardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(140, 128, 65, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Inter", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('KM/H', 140, 160);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(140, 128);
    ctx.lineTo(175, 90);
    ctx.stroke();

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(372, 128, 65, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RPM x100', 372, 160);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(372, 128);
    ctx.lineTo(405, 100);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(225, 75, 62, 106);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Inter", Arial';
    ctx.fillText('MAN', 256, 110);
    ctx.fillText('READY', 256, 140);
  }
  return finalizeCanvasTexture(c);
}

/** 7. Windschutzscheiben-Keramikmaske mit Blaukeil & Dot Matrix */
export function createWindshieldTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(28, 55, 88, 0.40)';
    ctx.fillRect(0, 0, 1024, 512);

    // Sunstrip Tint at Top
    const sunstripGrad = ctx.createLinearGradient(0, 0, 0, 150);
    sunstripGrad.addColorStop(0, 'rgba(10, 22, 38, 0.90)');
    sunstripGrad.addColorStop(0.5, 'rgba(15, 32, 55, 0.50)');
    sunstripGrad.addColorStop(1, 'rgba(28, 55, 88, 0.0)');
    ctx.fillStyle = sunstripGrad;
    ctx.fillRect(0, 0, 1024, 150);

    // Schwarzer Keramik-Siebdruckrand (Ceramic Frit Mask)
    ctx.fillStyle = '#05070a';
    const border = 36;
    ctx.fillRect(0, 0, 1024, border + 8);
    ctx.fillRect(0, 512 - border - 18, 1024, border + 18);
    ctx.fillRect(0, 0, border + 24, 512);
    ctx.fillRect(1024 - border - 24, 0, border + 24, 512);

    // Punktraster-Gradienten (Dot Matrix)
    ctx.fillStyle = '#05070a';
    for (let x = border + 24; x <= 1024 - border - 24; x += 14) {
      for (let y = border + 8; y < border + 36; y += 9) {
        const r = Math.max(1, 4.5 - (y - border - 8) * 0.16);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let y = 512 - border - 18; y > 512 - border - 44; y -= 9) {
        const r = Math.max(1, 4.5 - (512 - border - 18 - y) * 0.16);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let y = border + 8; y <= 512 - border - 18; y += 14) {
      for (let x = border + 24; x < border + 50; x += 9) {
        const r = Math.max(1, 4.5 - (x - border - 24) * 0.16);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let x = 1024 - border - 24; x > 1024 - border - 50; x -= 9) {
        const r = Math.max(1, 4.5 - (1024 - border - 24 - x) * 0.16);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Regensensor Keramik-Insel
    ctx.beginPath();
    ctx.moveTo(425, 0);
    ctx.lineTo(599, 0);
    ctx.lineTo(565, 115);
    ctx.lineTo(459, 115);
    ctx.closePath();
    ctx.fill();

    // Beheizte Wischer-Parkzone
    ctx.strokeStyle = 'rgba(230, 140, 50, 0.45)';
    ctx.lineWidth = 1.5;
    for (let y = 435; y < 485; y += 12) {
      ctx.beginPath();
      ctx.moveTo(110, y);
      ctx.lineTo(914, y);
      ctx.stroke();
    }
  }
  return finalizeCanvasTexture(c);
}

/** 8. Gewölbte Windschutzscheiben-Geometrie */
export function createCurvedWindshieldGeometry(width = 2.24, height = 1.18, segX = 32, segY = 16, curveDepth = 0.12): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const normX = x / (width / 2);
    const zOffset = -(normX * normX) * curveDepth;
    pos.setZ(i, zOffset);
  }
  geo.computeVertexNormals();
  return geo;
}

/** 9. Ladebordwand-Textur */
export function createTailLiftTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e8ebed';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 496, 496);

    ctx.fillStyle = '#ced4da';
    ctx.fillRect(32, 120, 448, 384);
    
    ctx.fillStyle = '#343a40';
    ctx.fillRect(32, 120, 448, 20);

    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 4;
    for (let i = 1; i <= 6; i++) {
      const x = 32 + (448 / 7) * i;
      ctx.beginPath();
      ctx.moveTo(x, 140);
      ctx.lineTo(x, 504);
      ctx.stroke();
    }

    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(40, 260, 40, 80);
    ctx.fillRect(432, 260, 40, 80);
    
    ctx.fillStyle = '#ffffff';
    for (let y = 260; y < 340; y += 20) {
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(80, y - 20); ctx.lineTo(80, y - 10); ctx.lineTo(40, y + 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(432, y); ctx.lineTo(472, y - 20); ctx.lineTo(472, y - 10); ctx.lineTo(432, y + 10); ctx.fill();
    }

    ctx.fillStyle = '#ffd700';
    ctx.fillRect(90, 470, 60, 20);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px "Inter", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAIMER', 120, 480);
  }
  return finalizeCanvasTexture(c);
}

/** 10. Kofferaufbau-Seitenwand-Textur */
export function createKofferSideTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f5f3f0';
    ctx.fillRect(0, 0, 2048, 512);

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2048, 512);

    const panels = 6;
    for (let i = 0; i <= panels; i++) {
      const x = (2048 / panels) * i;
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 1, 0); ctx.lineTo(x - 1, 512); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, 512); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 20; x < 2048; x += 50) {
      ctx.beginPath();
      ctx.arc(x, 18, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let x = 20; x < 2048; x += 50) {
      ctx.beginPath();
      ctx.arc(x, 494, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 490, 2048, 22);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 490, 2048, 22);
  }
  const tex = finalizeCanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** 11. MAN TGL Europoint / LC8 4-Kammer Heckleuchten-Textur (Exakt nach Foto) */
export function createManRearLightTexture(_isLeft = true): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // 1. Schwarzer Gehäuserahmen mit Gummilippe
    ctx.fillStyle = '#141618';
    ctx.fillRect(0, 0, 1024, 512);

    // Abgerundete Glaslinsen-Einfassung
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.roundRect(20, 20, 984, 472, 36);
    ctx.fill();
    ctx.strokeStyle = '#282b30';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Die 4 optischen Kammern (von links nach rechts)
    // Kammer 1: Nebelschluss / Rücklicht Rot (24 - 260)
    ctx.fillStyle = '#b80c1e';
    ctx.beginPath();
    ctx.roundRect(26, 26, 234, 460, [30, 0, 0, 30]);
    ctx.fill();

    // Vertikale Prismen-Riffelung in Kammer 1
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.25)';
    ctx.lineWidth = 3;
    for (let x = 36; x < 254; x += 8) {
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 482); ctx.stroke();
    }
    // Runder innerer Lampenreflektor
    const gradR1 = ctx.createRadialGradient(140, 256, 10, 140, 256, 90);
    gradR1.addColorStop(0, 'rgba(255, 120, 120, 0.6)');
    gradR1.addColorStop(0.6, 'rgba(200, 20, 30, 0.2)');
    gradR1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradR1;
    ctx.beginPath(); ctx.arc(140, 256, 90, 0, Math.PI * 2); ctx.fill();

    // Kammer 2: Rückfahrscheinwerfer Weiß / Klar (264 - 470)
    ctx.fillStyle = '#e2e7ec';
    ctx.fillRect(264, 26, 206, 460);

    // Feines Waben- & Rautenprismenmuster in Kammer 2
    ctx.strokeStyle = 'rgba(160, 175, 190, 0.4)';
    ctx.lineWidth = 1.5;
    for (let y = 30; y < 480; y += 10) {
      for (let x = 268; x < 466; x += 10) {
        ctx.strokeRect(x, y, 9, 9);
      }
    }
    // 2x Torx-Schrauben in Kammer 2
    const drawScrew = (sx: number, sy: number) => {
      ctx.fillStyle = '#9aa0a6';
      ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#555a60'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx - 8, sy); ctx.lineTo(sx + 8, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx, sy + 8); ctx.stroke();
    };
    drawScrew(367, 85);
    drawScrew(367, 425);

    // Kammer 3: Großes Brems- & Schlusslicht Rot mit Katzenaugen-Reflektor (474 - 750)
    ctx.fillStyle = '#cb0e22';
    ctx.fillRect(474, 26, 276, 460);

    // Quadratisches Rückstrahler-Muster (Catadioptre)
    ctx.strokeStyle = 'rgba(255, 90, 90, 0.28)';
    ctx.lineWidth = 2;
    for (let y = 34; y < 480; y += 14) {
      for (let x = 480; x < 744; x += 14) {
        ctx.strokeRect(x, y, 12, 12);
      }
    }

    // Kammer 4: Blinker Bernstein / Amber (754 - 998)
    ctx.fillStyle = '#ff9200';
    ctx.beginPath();
    ctx.roundRect(754, 26, 244, 460, [0, 30, 30, 0]);
    ctx.fill();

    // Rauten-Prismenmuster in Kammer 4
    ctx.strokeStyle = 'rgba(255, 210, 80, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 32; y < 480; y += 12) {
      for (let x = 760; x < 990; x += 12) {
        ctx.strokeRect(x, y, 10, 10);
      }
    }
    // 2x Torx-Schrauben in Kammer 4
    drawScrew(876, 85);
    drawScrew(876, 425);

    // 3. Schwarze Kammer-Trennstege
    ctx.fillStyle = '#111315';
    ctx.fillRect(260, 24, 4, 464);
    ctx.fillRect(470, 24, 4, 464);
    ctx.fillRect(750, 24, 4, 464);

    // 4. Glasglanz-Reflexion (Top- & Bottom-Glow)
    const glassGrad = ctx.createLinearGradient(0, 26, 0, 180);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    glassGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.roundRect(26, 26, 972, 160, [30, 30, 0, 0]);
    ctx.fill();
  }
  return finalizeCanvasTexture(c);
}

/** 12. MAN LED-Seitenmarkierungsleuchte (Kompakte gelbe Zusatzleuchte aus dem Foto) */
export function createSideMarkerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Schwarze Gummi-Sockelplatte mit Riffelung
    ctx.fillStyle = '#16181b';
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = '#ff9900';
    ctx.beginPath();
    ctx.roundRect(24, 24, 464, 208, 20);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Konzentrische Fresnel-Linsenringe im Zentrum
    ctx.strokeStyle = 'rgba(255, 230, 120, 0.5)';
    ctx.lineWidth = 2;
    for (let r = 10; r < 70; r += 10) {
      ctx.beginPath(); ctx.arc(256, 128, r, 0, Math.PI * 2); ctx.stroke();
    }

    // Diamant-Prismen
    ctx.strokeStyle = 'rgba(255, 200, 50, 0.3)';
    ctx.lineWidth = 1.5;
    for (let y = 34; y < 220; y += 12) {
      for (let x = 34; x < 470; x += 12) {
        ctx.strokeRect(x, y, 10, 10);
      }
    }

    // 2x Eck-Befestigungsschrauben
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.arc(50, 60, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(462, 196, 8, 0, Math.PI * 2); ctx.fill();
  }
  return finalizeCanvasTexture(c);
}

/** 13. PBR Straßenasphalt-Textur (Fotorealistischer Mineral- & Bitumen-Asphalt) */
export function createAsphaltTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (ctx) {
    // 1. Dunkle Bitumen-Grundierung
    ctx.fillStyle = '#1e2126';
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Grobe & feine Mineral-Splitt-Körnung (Granit, Basalt & Quarzit)
    const colors = [
      '#15171a', '#181b1f', '#262a32', '#2f343e', '#3a404c', '#48505e',
      '#101214', '#2b3038', '#545d6e', '#1c1f24', '#333944', '#646f82'
    ];
    
    // 35.000 feine Splitt-Punkte
    for (let i = 0; i < 35000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = Math.random() * 1.6 + 0.6;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6.000 größere Steinschotter-Körner mit Kanten
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const w = Math.random() * 3.5 + 1.5;
      const h = Math.random() * 3.5 + 1.5;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(x, y, w, h);
    }

    // 3. Teerverguss-Mikrofugen & Asphalt-Ausbesserungen
    ctx.strokeStyle = 'rgba(14, 16, 19, 0.4)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 18; i++) {
      let cx = Math.random() * 1024;
      let cy = Math.random() * 1024;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 5; j++) {
        cx += (Math.random() - 0.5) * 60;
        cy += (Math.random() - 0.5) * 60;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // 4. Reifenabrieb & feiner Gummiglanz
    const rubberGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 500);
    rubberGrad.addColorStop(0, 'rgba(16, 18, 22, 0.15)');
    rubberGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rubberGrad;
    ctx.fillRect(0, 0, 1024, 1024);
  }
  const tex = finalizeCanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** 14. Asphalt Normal-/Bump-Map für mikrogranulare Oberflächen-Rauheit */
export function createAsphaltBumpTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const val = Math.floor(Math.random() * 160 + 50);
      ctx.fillStyle = `rgb(${val},${val},${val})`;
      ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
    }
  }
  const tex = finalizeCanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** 15. Fahrbahn-Markierungsband (Weiße Leitlinien & gelbe Randstreifen) */
export function createRoadMarkingsTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 512, 1024);

    // Gelbe durchgezogene Randlinie links
    ctx.fillStyle = 'rgba(245, 180, 0, 0.88)';
    ctx.fillRect(20, 0, 14, 1024);

    // Gelbe durchgezogene Randlinie rechts
    ctx.fillStyle = 'rgba(245, 180, 0, 0.88)';
    ctx.fillRect(478, 0, 14, 1024);

    // Gestrichelte weiße Mittellinie (Dashed Centerline)
    ctx.fillStyle = 'rgba(240, 245, 255, 0.92)';
    for (let y = 40; y < 1024; y += 180) {
      ctx.fillRect(250, y, 12, 110);
    }
  }
  const tex = finalizeCanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
