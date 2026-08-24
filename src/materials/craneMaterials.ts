import * as THREE from 'three';

/**
 * ============================================================================
 * CRANE & TENNIS SHARED PBR MATERIAL & TEXTURE REGISTRY (DRY GOLD STANDARD)
 * Zentraler, ressourceneffizienter Material- und Textur-Pool.
 * Vermeidet redundante Allokationen und sichert konsistente Shader-Standards.
 * ============================================================================
 */

// --- ⚙️ PROCEDURAL TEXTURE GENERATORS ---

/** Erzeugt eine hochauflösende 2D Checkerplate Bump-Map */
export function createCheckerplateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 256; x += 32) {
        ctx.fillRect(x + 4, y + 4, 10, 24);
        ctx.fillRect(x + 18, y + 10, 10, 12);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

/** Erzeugt eine Rändel-/Knurling-Normal-Map */
export function createKnurlingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#9090ff';
    ctx.lineWidth = 2;
    for (let i = -128; i < 256; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, 128);
      ctx.lineTo(i + 128, 0);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

// --- 🏗️ CRANE PBR MATERIALS FACTORY ---

export function createCranePBRMaterials() {
  const checkerplateTex = createCheckerplateTexture();
  const knurlingTex = createKnurlingTexture();

  return {
    // 1. Chassis & Heavy Machinery Metals
    matChassisDark: new THREE.MeshStandardMaterial({
      color: 0x181c24,
      roughness: 0.42,
      metalness: 0.78
    }),
    matDeckCheckerplate: new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.35,
      metalness: 0.85,
      bumpMap: checkerplateTex,
      bumpScale: 0.05
    }),
    matPedestalBlack: new THREE.MeshStandardMaterial({
      color: 0x0f131a,
      roughness: 0.35,
      metalness: 0.88
    }),
    matChromeSteel: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.12,
      metalness: 0.96
    }),
    matDarkTitanium: new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      roughness: 0.28,
      metalness: 0.90
    }),
    matBrassKnurled: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.30,
      metalness: 0.82,
      bumpMap: knurlingTex,
      bumpScale: 0.03
    }),
    matBrakeRotor: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.38,
      metalness: 0.92
    }),

    // 2. Rubber & Synthetics
    matTireRubber: new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      roughness: 0.88,
      metalness: 0.05
    }),
    matRubberFootPad: new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.82,
      metalness: 0.10
    }),
    matCableRubber: new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      roughness: 0.65,
      metalness: 0.15
    }),

    // 3. Safety & Accents
    matYellowSafetyAccent: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.28,
      metalness: 0.45
    }),
    matSafetyRed: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.32,
      metalness: 0.50
    }),

    // 4. Composites & Carbon
    matHighModulusCarbon: new THREE.MeshStandardMaterial({
      color: 0x11151c,
      roughness: 0.22,
      metalness: 0.60
    }),
    matGraphiteDark: new THREE.MeshStandardMaterial({
      color: 0x1e222d,
      roughness: 0.30,
      metalness: 0.70
    }),

    // 5. Optics & Glass
    matOpticalCoating: new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      ior: 1.55,
      reflectivity: 0.9
    }),
    matGlassLens: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.02,
      transmission: 0.95,
      ior: 1.52
    }),

    // Texturen für Disposal
    textures: [checkerplateTex, knurlingTex]
  };
}

// --- 🎾 TENNIS COURT PBR MATERIALS FACTORY ---

export function createTennisCourtMaterials(clayTex?: THREE.Texture, grassTex?: THREE.Texture, hardTex?: THREE.Texture) {
  return {
    matClay: new THREE.MeshStandardMaterial({
      color: 0xbd4c2a,
      roughness: 0.92,
      metalness: 0.02,
      map: clayTex || null
    }),
    matGrass: new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.85,
      metalness: 0.05,
      map: grassTex || null
    }),
    matHardcourt: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.68,
      metalness: 0.10,
      map: hardTex || null
    }),
    matCyber: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.85
    }),
    matLineWhite: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.15
    }),
    matSurround: new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.75,
      metalness: 0.08
    })
  };
}
