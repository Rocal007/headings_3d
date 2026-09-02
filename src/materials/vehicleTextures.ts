import * as THREE from 'three';

export type TextureMapType = 'baseColor' | 'normal' | 'roughness' | 'metalness' | 'emissive' | 'ao';
export type TextureTargetLayer = 'body' | 'wheels' | 'interior' | 'all';

export interface AppliedTextureInfo {
  id: string;
  fileName: string;
  mapType: TextureMapType;
  targetLayer: TextureTargetLayer;
  dataUrl?: string;
  matchedMaterials?: string[];
  timestamp: number;
}

/**
 * Bereinigt Dateinamen und extrahiert den semantischen Identifikator
 * (entfernt Index-Suffixe wie _29, @channels=A, Dateiendungen).
 */
export function cleanTextureIdentifier(fileName: string): string {
  return fileName
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/@channels=[a-zA-Z0-9]+/gi, '')
    .replace(/_[0-9]+$/g, '')
    .trim();
}

/**
 * Normalisiert Zeichenketten für exaktes / unscharfes Matching (Kleinbuchstaben, Worttrenner).
 */
export function normalizeSemanticString(str: string): string {
  return str
    .toLowerCase()
    .replace(/\.[0-9]+$/, '')
    .replace(/@channels=[a-z0-9]+/gi, '')
    .replace(/\.(png|jpg|jpeg|webp|ktx2|dds|tga)$/i, '')
    .replace(/_[0-9]+$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Erkennt anhand des Dateinamens automatisch den passenden PBR-Texture-Typ.
 */
export function detectTextureMapType(fileName: string): TextureMapType {
  const lower = fileName.toLowerCase();
  if (
    lower.includes('normal') ||
    lower.includes('_nor') ||
    lower.includes('_nrm') ||
    lower.includes('_nm') ||
    lower.includes('bump')
  ) {
    return 'normal';
  }
  if (
    lower.includes('rough') ||
    lower.includes('_rgh') ||
    lower.includes('gloss')
  ) {
    return 'roughness';
  }
  if (
    lower.includes('metal') ||
    lower.includes('_met') ||
    lower.includes('spec')
  ) {
    return 'metalness';
  }
  if (
    lower.includes('emiss') ||
    lower.includes('_emit') ||
    lower.includes('glow')
  ) {
    return 'emissive';
  }
  if (
    lower.includes('_occ') ||
    lower.includes('_ao') ||
    lower.includes('ambient') ||
    lower.includes('occlusion')
  ) {
    return 'ao';
  }
  // Standard: BaseColor / Albedo / Diffuse
  return 'baseColor';
}

/**
 * Erstellt eine Three.js Textur aus einer hochgeladenen Bilddatei (PNG, JPG, WebP).
 */
export function createTextureFromFile(
  file: File,
  forcedMapType?: TextureMapType
): Promise<{ texture: THREE.Texture; mapType: TextureMapType; fileName: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const mapType = forcedMapType || detectTextureMapType(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        if (mapType === 'baseColor' || mapType === 'emissive') {
          texture.colorSpace = THREE.SRGBColorSpace;
        } else {
          texture.colorSpace = THREE.NoColorSpace;
        }

        texture.needsUpdate = true;
        resolve({ texture, mapType, fileName: file.name, dataUrl });
      };

      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Erstellt eine Three.js Textur direkt aus einer Data-URL.
 */
export function createTextureFromDataUrl(
  dataUrl: string,
  mapType: TextureMapType
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const texture = new THREE.Texture(img);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      if (mapType === 'baseColor' || mapType === 'emissive') {
        texture.colorSpace = THREE.SRGBColorSpace;
      } else {
        texture.colorSpace = THREE.NoColorSpace;
      }

      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

/**
 * Berechnet einen Matching-Score zwischen einem Material/Mesh und einem Textur-Dateinamen.
 */
export function calculateMaterialMatchScore(
  mat: THREE.Material,
  objName: string,
  fileName: string
): number {
  const normFile = normalizeSemanticString(fileName);
  const normMat = normalizeSemanticString(mat.name || '');
  const normObj = normalizeSemanticString(objName || '');

  // 0. Direkter Abgleich gegen die originale GLTF Image-Definition (100% EXAKT!)
  const gltfBase = mat.userData?.gltfBaseImage ? normalizeSemanticString(mat.userData.gltfBaseImage) : '';
  const gltfNorm = mat.userData?.gltfNormalImage ? normalizeSemanticString(mat.userData.gltfNormalImage) : '';
  const gltfAo = mat.userData?.gltfAoImage ? normalizeSemanticString(mat.userData.gltfAoImage) : '';

  if (gltfBase && (normFile === gltfBase || normFile.startsWith(gltfBase) || gltfBase.startsWith(normFile))) {
    return 1000;
  }
  if (gltfNorm && (normFile === gltfNorm || normFile.startsWith(gltfNorm) || gltfNorm.startsWith(normFile))) {
    return 1000;
  }
  if (gltfAo && (normFile === gltfAo || normFile.startsWith(gltfAo) || gltfAo.startsWith(normFile))) {
    return 1000;
  }

  // 1. Exakte Übereinstimmung
  if (normMat === normFile) return 100;
  if (normMat.includes(normFile) || normFile.includes(normMat)) return 85;

  // 2. Map-Name Übereinstimmung (falls Three.js den ursprünglichen Textur-Namen hat)
  const stdMat = mat as THREE.MeshStandardMaterial;
  const existingMapName = stdMat.map?.name ? normalizeSemanticString(stdMat.map.name) : '';
  if (existingMapName && (existingMapName === normFile || normFile.includes(existingMapName) || existingMapName.includes(normFile))) {
    return 95;
  }

  // 3. Token-basierte semantische Übereinstimmung
  const stopWords = new Set(['ext', 'int', 'misc', 'occ', 'the', 'a', 'd', 'd2', 'nm', 'temp', 'channels']);
  const fileTokens = normFile.split(' ').filter((w) => w.length > 1 && !stopWords.has(w));
  const matTokens = normMat.split(' ').filter((w) => w.length > 1 && !stopWords.has(w));
  const objTokens = normObj.split(' ').filter((w) => w.length > 1 && !stopWords.has(w));

  let score = 0;

  for (const ft of fileTokens) {
    // Abgleich gegen Material-Namen
    for (const mt of matTokens) {
      if (mt === ft) {
        score += 35;
      } else if (mt.includes(ft) || ft.includes(mt)) {
        score += 20;
      }
    }

    // Abgleich gegen Mesh-Namen
    for (const ot of objTokens) {
      if (ot === ft) {
        score += 25;
      } else if (ot.includes(ft) || ft.includes(ot)) {
        score += 15;
      }
    }
  }

  // Spezielle Fahrzeug-Domain Mappings
  const lowerFile = fileName.toLowerCase();
  const lowerMat = (mat.name || '').toLowerCase();

  // Reifen / Tyre
  if ((lowerFile.includes('tyre') || lowerFile.includes('tire') || lowerFile.includes('wheel')) && (lowerMat.includes('tyre') || lowerMat.includes('tire') || lowerMat.includes('wheel'))) {
    score += 40;
  }
  // Scheinwerfer & Rückleuchten / Lights
  if (lowerFile.includes('light') && lowerMat.includes('light')) {
    score += 40;
  }
  // Glas / Windows / Windscreen
  if ((lowerFile.includes('glass') || lowerFile.includes('window')) && (lowerMat.includes('glass') || lowerMat.includes('window') || lowerMat.includes('windscreen'))) {
    score += 40;
  }
  // Leder / Seats / Steering
  if ((lowerFile.includes('leather') || lowerFile.includes('seat')) && (lowerMat.includes('leather') || lowerMat.includes('seat') || lowerMat.includes('steer'))) {
    score += 40;
  }
  // Felgen / Rims / Disks
  if ((lowerFile.includes('rim') || lowerFile.includes('disk')) && (lowerMat.includes('rim') || lowerMat.includes('disk'))) {
    score += 40;
  }
  // Carbon
  if (lowerFile.includes('carbon') && lowerMat.includes('carbon')) {
    score += 50;
  }
  // Teppich / Carpet
  if (lowerFile.includes('carpet') && lowerMat.includes('carpet')) {
    score += 50;
  }

  return score;
}

/**
 * Prüft, ob ein Material zu einer bestimmten Zielschicht (Karosserie, Räder, Innenraum) gehört.
 */
export function isMaterialInTargetLayer(
  mat: THREE.Material,
  objName: string,
  targetLayer: TextureTargetLayer
): boolean {
  if (targetLayer === 'all') return true;

  const mName = (mat.name || '').toLowerCase();
  const oName = (objName || '').toLowerCase();
  const combined = `${mName} ${oName}`;

  if (targetLayer === 'wheels') {
    return (
      combined.includes('wheel') ||
      combined.includes('tire') ||
      combined.includes('tyre') ||
      combined.includes('rim') ||
      combined.includes('rad') ||
      combined.includes('reifen') ||
      combined.includes('felge') ||
      combined.includes('disk') ||
      combined.includes('caliper')
    );
  }

  if (targetLayer === 'interior') {
    return (
      combined.includes('int_') ||
      combined.includes('interior') ||
      combined.includes('seat') ||
      combined.includes('dash') ||
      combined.includes('cockpit') ||
      combined.includes('sitz') ||
      combined.includes('innen') ||
      combined.includes('steer') ||
      combined.includes('carpet') ||
      combined.includes('speaker') ||
      combined.includes('belt') ||
      combined.includes('stitching')
    );
  }

  if (targetLayer === 'body') {
    const isWheel =
      combined.includes('wheel') ||
      combined.includes('tire') ||
      combined.includes('tyre') ||
      combined.includes('rim') ||
      combined.includes('reifen') ||
      combined.includes('felge');
    const isGlass =
      combined.includes('glass') ||
      combined.includes('glas') ||
      combined.includes('window') ||
      combined.includes('windscreen');
    const isInterior =
      combined.includes('int_') ||
      combined.includes('interior') ||
      combined.includes('seat') ||
      combined.includes('cockpit') ||
      combined.includes('carpet');

    return !isWheel && !isGlass && !isInterior;
  }

  return true;
}

/**
 * Wendet eine Textur-Map auf ein spezifisches MeshStandardMaterial an.
 */
export function assignTextureToMaterial(
  mat: THREE.MeshStandardMaterial,
  texture: THREE.Texture,
  mapType: TextureMapType
): void {
  switch (mapType) {
    case 'baseColor':
      mat.map = texture;
      break;
    case 'normal':
      mat.normalMap = texture;
      if (mat.normalScale) mat.normalScale.set(1, 1);
      break;
    case 'roughness':
      mat.roughnessMap = texture;
      mat.roughness = 0.9;
      break;
    case 'metalness':
      mat.metalnessMap = texture;
      mat.metalness = 0.9;
      break;
    case 'emissive':
      mat.emissiveMap = texture;
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveIntensity = 1.5;
      break;
    case 'ao':
      mat.aoMap = texture;
      mat.aoMapIntensity = 1.0;
      break;
  }
  mat.needsUpdate = true;
}

/**
 * Wendet eine Textur intelligent auf das 3D-Modell an:
 * - Wenn spezifische Materialien per Matching gefunden werden (Score >= 20), wird die Textur NUR diesen zugewiesen.
 * - Andernfalls (oder bei expliziter Layer-Auswahl) wird sie auf den Ziel-Layer angewendet.
 */
export function applyTextureSmart(
  rootScene: THREE.Object3D,
  texture: THREE.Texture,
  fileName: string,
  forcedMapType?: TextureMapType,
  targetLayer: TextureTargetLayer = 'all'
): { matchedMaterials: string[]; mapType: TextureMapType } {
  const mapType = forcedMapType || detectTextureMapType(fileName);
  const matchedMaterials: string[] = [];

  // 1. Alle Materialien & Scores sammeln
  const candidates: Array<{ mat: THREE.MeshStandardMaterial; score: number }> = [];

  rootScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((mat) => {
        if (mat && ('isMeshStandardMaterial' in mat || 'isMeshPhysicalMaterial' in mat || 'isMeshBasicMaterial' in mat)) {
          const stdMat = mat as THREE.MeshStandardMaterial;
          const score = calculateMaterialMatchScore(mat, child.name, fileName);
          candidates.push({ mat: stdMat, score });
        }
      });
    }
  });

  const bestScore = candidates.reduce((max, c) => Math.max(max, c.score), 0);

  // 2. Wenn mindestens ein klares Matching vorliegt (Score >= 25)
  if (bestScore >= 25) {
    const threshold = Math.max(25, bestScore * 0.65);
    const assignedSet = new Set<THREE.MeshStandardMaterial>();

    candidates.forEach(({ mat, score }) => {
      if (score >= threshold && !assignedSet.has(mat)) {
        assignedSet.add(mat);
        assignTextureToMaterial(mat, texture, mapType);
        matchedMaterials.push(mat.name || 'unnamed_material');
      }
    });
  } else {
    // 3. Fallback: Auf alle Materialien im gewählten Target-Layer anwenden
    rootScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((mat) => {
          if (mat && isMaterialInTargetLayer(mat, child.name, targetLayer)) {
            const stdMat = mat as THREE.MeshStandardMaterial;
            assignTextureToMaterial(stdMat, texture, mapType);
            matchedMaterials.push(mat.name || child.name);
          }
        });
      }
    });
  }

  return { matchedMaterials, mapType };
}

/**
 * Wendet eine Textur manuell/gezielt auf einen bestimmten Layer an.
 */
export function applyTextureToModel(
  rootScene: THREE.Object3D,
  texture: THREE.Texture,
  mapType: TextureMapType,
  targetLayer: TextureTargetLayer = 'body'
): number {
  let appliedCount = 0;

  rootScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((mat) => {
        if (!mat || !('isMeshStandardMaterial' in mat || 'isMeshPhysicalMaterial' in mat || 'isMeshBasicMaterial' in mat)) {
          return;
        }

        if (isMaterialInTargetLayer(mat, child.name, targetLayer)) {
          const stdMat = mat as THREE.MeshStandardMaterial;
          assignTextureToMaterial(stdMat, texture, mapType);
          appliedCount++;
        }
      });
    }
  });

  return appliedCount;
}

/**
 * Entfernt eine Textur-Map von allen Materialien eines Ziel-Layers oder bestimmten Materialien.
 */
export function removeTextureFromModel(
  rootScene: THREE.Object3D,
  mapType: TextureMapType,
  targetLayer: TextureTargetLayer = 'body',
  specificMaterialNames?: string[]
): void {
  rootScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((mat) => {
        if (!mat) return;
        const matName = mat.name || '';
        const shouldRemove = specificMaterialNames && specificMaterialNames.length > 0
          ? specificMaterialNames.includes(matName)
          : isMaterialInTargetLayer(mat, child.name, targetLayer);

        if (shouldRemove) {
          const stdMat = mat as THREE.MeshStandardMaterial;
          switch (mapType) {
            case 'baseColor':
              stdMat.map = null;
              break;
            case 'normal':
              stdMat.normalMap = null;
              break;
            case 'roughness':
              stdMat.roughnessMap = null;
              break;
            case 'metalness':
              stdMat.metalnessMap = null;
              break;
            case 'emissive':
              stdMat.emissiveMap = null;
              break;
            case 'ao':
              stdMat.aoMap = null;
              break;
          }
          stdMat.needsUpdate = true;
        }
      });
    }
  });
}

/* ========================================================================= */
/* PROZEDURALE TEXTUR-GENERATOREN                                            */
/* ========================================================================= */

/**
 * Prozedurale Carbonfaser-Gewebe Textur (256x256 Seamless).
 */
export function createCarbonFiberTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, size, size);

    const step = 8;
    for (let x = 0; x < size; x += step) {
      for (let y = 0; y < size; y += step) {
        const isAlternate = ((x / step) % 2 === 0) !== ((y / step) % 2 === 0);
        ctx.fillStyle = isAlternate ? '#27272a' : '#09090b';
        ctx.fillRect(x, y, step, step);

        // Sub-Weave Linien
        ctx.fillStyle = isAlternate ? '#3f3f46' : '#18181b';
        ctx.fillRect(x, y + step / 2, step, 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Prozedurale Camouflage / Militär-Tarnung Textur (512x512 Seamless).
 */
export function createCamoTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#2d3b29'; // Olivgrün Basis
    ctx.fillRect(0, 0, size, size);

    const colors = ['#4b5320', '#1c221a', '#6f5a43', '#8b7355'];
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const rx = 30 + Math.random() * 65;
      const ry = 25 + Math.random() * 50;
      ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Prozedurale Mud-Splatter / Offroad-Schlammspritzer Textur.
 */
export function createMudSplatterTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#452b14';
    ctx.fillRect(0, 0, size, size);

    // Feine Schlamm-Partikel & Dreckspritzer
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2b180a' : '#5c3d20';
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 4.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Prozedurale Racing-Livery / Rallye-Streifen Textur.
 */
export function createRacingLiveryTexture(primaryColor = '#0284c7', stripeColor = '#ffffff'): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, size, size);

    // Rallye Doppelstreifen
    ctx.fillStyle = stripeColor;
    ctx.fillRect(size * 0.40, 0, size * 0.08, size);
    ctx.fillRect(size * 0.52, 0, size * 0.08, size);

    // Nummernbadge
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(size * 0.22, size * 0.5, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('07', size * 0.22, size * 0.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
