import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

export type CraneSceneryType = 
  | 'plate'
  | 'bright_concrete' 
  | 'pyramids'
  | 'machu_picchu'
  | 'bright_meadow' 
  | 'bright_studio' 
  | 'meadow' 
  | 'concrete' 
  | 'lake' 
  | 'studio';

export const sceneryBgColors: Record<CraneSceneryType, string> = {
  plate: '#0d1117',           // Showroom Drehteller-Plattform (wie LKW)
  bright_concrete: '#7dd3fc', // Strahlend blauer Himmel & Pyramiden
  pyramids: '#38bdf8',        // Klarer azurblauer Wüstenhimmel
  machu_picchu: '#38bdf8',    // Klarer Anden-Berghimmel über Machu Picchu
  bright_meadow: '#7dd3fc',   // Strahlender blauer Sommerhimmel
  bright_studio: '#f8fafc',   // High-Key Warm-White Studio
  meadow: '#60a5fa',          // Klassische grüne Wiese / blauer Himmel
  concrete: '#60a5fa',        // Blauer Industriehimmel
  lake: '#38bdf8',            // Frischer Seeufer-Himmel
  studio: '#0b0f17'           // Dunkles Tech-Studio
};

export interface SceneryOption {
  id: CraneSceneryType;
  label: string;
  shortLabel: string;
  desc: string;
  icon: string;
  color: string;
  isBright?: boolean;
}

export const sceneryOptions: SceneryOption[] = [
  {
    id: 'plate',
    label: '⭕ Showroom Platte (wie LKW)',
    shortLabel: 'Platte (LKW)',
    desc: 'Luxuriöse Drehteller-Plattform ohne Schienen mit Leuchtring & Studiobeleuchtung',
    icon: '⭕',
    color: '#00dcff',
    isBright: false
  },
  {
    id: 'bright_concrete',
    label: '☀️ Heller Platz & Pyramiden',
    shortLabel: 'Heller Platz',
    desc: 'Sonniger Vorplatz mit Pyramiden von Gizeh im Hintergrund',
    icon: '☀️',
    color: '#38bdf8',
    isBright: true
  },
  {
    id: 'pyramids',
    label: '🏜️ Gizeh Pyramiden',
    shortLabel: 'Pyramiden',
    desc: 'Monumentale Pyramiden von Gizeh, Wüstensand & warmer Horizont',
    icon: '🏜️',
    color: '#eab308',
    isBright: true
  },
  {
    id: 'machu_picchu',
    label: '⛰️ Machu Picchu (Anden)',
    shortLabel: 'Machu Picchu',
    desc: 'Inka-Zitadelle, Huayna Picchu Berggipfel & grüne Terrassen',
    icon: '⛰️',
    color: '#10b981',
    isBright: true
  },
  {
    id: 'bright_meadow',
    label: '☀️ Helle Sommerwiese',
    shortLabel: 'Sommerwiese',
    desc: 'Sonnendurchflutete Wiese & strahlender Himmel',
    icon: '🌾',
    color: '#4ade80',
    isBright: true
  },
  {
    id: 'bright_studio',
    label: '💡 Helles Studio (White)',
    shortLabel: 'White Studio',
    desc: 'High-Key White Cyclorama & weiches Softbox-Licht',
    icon: '💡',
    color: '#f59e0b',
    isBright: true
  },
  {
    id: 'meadow',
    label: '🌿 Grüne Wiese',
    shortLabel: 'Wiese',
    desc: 'Natur, sattes Gras & Wildblumen',
    icon: '🌿',
    color: '#22c55e',
    isBright: false
  },
  {
    id: 'concrete',
    label: '🏗️ Industrie-Beton',
    shortLabel: 'Betonplatz',
    desc: 'Industrie, Fugen, Container & Poller',
    icon: '🏗️',
    color: '#facc15',
    isBright: false
  },
  {
    id: 'lake',
    label: '🌊 Seeufer',
    shortLabel: 'Seeufer',
    desc: 'Wasserreflexion & Steg',
    icon: '🌊',
    color: '#0ea5e9',
    isBright: false
  },
  {
    id: 'studio',
    label: '🎬 Dark Studio',
    shortLabel: 'Dark Studio',
    desc: 'High-Tech Grid & Dark Floor',
    icon: '🎬',
    color: '#c084fc',
    isBright: false
  }
];

// --- ⚡ GLOBAL ZERO-LATENCY TEXTURE CACHE (SINGLETON PATTERN) ---
const GLOBAL_TEXTURE_CACHE = new Map<string, THREE.CanvasTexture>();

function getCachedCanvasTexture(key: string, generator: () => THREE.CanvasTexture): THREE.CanvasTexture {
  let tex = GLOBAL_TEXTURE_CACHE.get(key);
  if (!tex) {
    tex = generator();
    GLOBAL_TEXTURE_CACHE.set(key, tex);
  }
  return tex;
}

// --- ☁️ ATMOSPHERIC PROCEDURAL SKY DOME COMPONENT ---
export interface SkyDomeProps {
  zenithColor?: string;
  horizonColor?: string;
  groundColor?: string;
  sunPosition?: [number, number, number];
  sunColor?: string;
  sunSize?: number;
  sunIntensity?: number;
  cloudCoverage?: number;
  cloudDensity?: number;
  cloudSpeed?: number;
}

export function AtmosphericSkyDome({
  zenithColor = '#1d4ed8',
  horizonColor = '#7dd3fc',
  groundColor = '#cbd5e1',
  sunPosition = [25, 30, 20],
  sunColor = '#fffdf0',
  sunSize = 1.0,
  sunIntensity = 1.2,
  cloudCoverage = 0.16,
  cloudDensity = 0.85,
  cloudSpeed = 0.005
}: SkyDomeProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uZenithColor: { value: new THREE.Color(zenithColor) },
    uHorizonColor: { value: new THREE.Color(horizonColor) },
    uGroundColor: { value: new THREE.Color(groundColor) },
    uSunPosition: { value: new THREE.Vector3(...sunPosition) },
    uSunColor: { value: new THREE.Color(sunColor) },
    uSunSize: { value: sunSize },
    uSunIntensity: { value: sunIntensity },
    uCloudCoverage: { value: cloudCoverage },
    uCloudDensity: { value: cloudDensity },
    uCloudSpeed: { value: cloudSpeed },
    uTime: { value: 0 }
  }), [zenithColor, horizonColor, groundColor, sunPosition, sunColor, sunSize, sunIntensity, cloudCoverage, cloudDensity, cloudSpeed]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh scale={800}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vWorldPosition;
          varying vec3 vDirection;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uZenithColor;
          uniform vec3 uHorizonColor;
          uniform vec3 uGroundColor;
          uniform vec3 uSunPosition;
          uniform vec3 uSunColor;
          uniform float uSunSize;
          uniform float uSunIntensity;
          uniform float uCloudCoverage;
          uniform float uCloudDensity;
          uniform float uCloudSpeed;
          uniform float uTime;

          varying vec3 vWorldPosition;
          varying vec3 vDirection;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }

          float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            mat2 rot = mat2(0.87, 0.50, -0.50, 0.87);
            for (int i = 0; i < 4; ++i) {
              v += a * noise(p);
              p = rot * p * 2.02 + vec2(1.3, 2.7);
              a *= 0.5;
            }
            return v;
          }

          void main() {
            vec3 dir = normalize(vDirection);
            float height = clamp(dir.y, 0.0, 1.0);

            // 1. Rayleigh Zenith -> Horizon Rich Blue Sky Gradient
            float skyGradient = pow(1.0 - height, 1.4);
            vec3 skyColor = mix(uZenithColor, uHorizonColor, skyGradient);

            if (dir.y < 0.0) {
              skyColor = mix(uHorizonColor, uGroundColor, clamp(-dir.y * 5.0, 0.0, 1.0));
            }

            // 2. Solar Disk & Mie Corona Glow
            vec3 sunDir = normalize(uSunPosition);
            float sunDot = max(0.0, dot(dir, sunDir));
            float sunDisc = smoothstep(0.9990 - uSunSize * 0.0006, 0.9997, sunDot);
            float sunCorona = pow(sunDot, 48.0) * 0.65 + pow(sunDot, 8.0) * 0.25;
            vec3 sunGlow = uSunColor * (sunDisc * 3.5 + sunCorona * uSunIntensity);

            // 3. Dynamic Sparse Fluffy Clouds (upper hemisphere)
            if (dir.y > 0.03 && uCloudCoverage > 0.005) {
              vec2 cloudUV = (dir.xz / (dir.y + 0.18)) * 0.42;
              cloudUV += vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.35);

              float n1 = fbm(cloudUV * 3.2);
              float n2 = fbm(cloudUV * 6.5 + vec2(3.7, 1.9));
              float cloudNoise = n1 * 0.70 + n2 * 0.30;

              float threshold = 1.0 - uCloudCoverage * 0.70;
              float cloudMask = smoothstep(threshold, threshold + 0.15, cloudNoise);

              float horizonFade = smoothstep(0.03, 0.22, dir.y);
              cloudMask *= horizonFade;

              float sunLit = clamp(dot(sunDir, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5, 0.0, 1.0);
              vec3 cloudShade = mix(vec3(0.85, 0.90, 0.98), vec3(1.0, 1.0, 1.0), sunLit);
              vec3 cloudFinalColor = cloudShade + sunCorona * 0.5 * uSunColor;

              skyColor = mix(skyColor, cloudFinalColor, cloudMask * uCloudDensity);
            }

            skyColor += sunGlow;
            gl_FragColor = vec4(skyColor, 1.0);
          }
        `}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// --- 🔺 PROCEDURAL PYRAMID STONE & DESERT TEXTURES (OPTIMIZED & CACHED) ---
function createPyramidStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c8a77a';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const br = Math.random() * 50 - 25;
      ctx.fillStyle = br > 0 
        ? `rgba(255, 235, 200, ${br / 90})` 
        : `rgba(120, 85, 45, ${-br / 90})`;
      ctx.fillRect(x, y, 3, 3);
    }

    for (let y = 0; y <= 512; y += 16) {
      ctx.strokeStyle = 'rgba(75, 50, 25, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      for (let x = 16; x < 512; x += 36) {
        ctx.strokeStyle = 'rgba(70, 45, 20, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() * 4 - 2), y + 16);
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  return tex;
}

function createPyramidBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const val = Math.floor(Math.random() * 50 + 105);
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(x, y, 2, 2);
    }

    for (let y = 0; y <= 256; y += 12) {
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, y - 1, 256, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, y + 1, 256, 1.5);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  return tex;
}

function createPyramidCapTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ebdcc7';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.18})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}

function createDuneRippleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#dfbe8c';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y <= 256; y += 8) {
      ctx.strokeStyle = 'rgba(180, 130, 70, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 256; x += 16) {
        ctx.lineTo(x, y + Math.sin(x * 0.08) * 2.5);
      }
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}

function createHorizonPanoramaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.5, '#fed7aa');
    grad.addColorStop(1.0, '#c89b65');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#b48348';
    ctx.beginPath();
    ctx.moveTo(0, 70);
    for (let x = 0; x <= 512; x += 16) {
      const h = 60 + Math.sin(x * 0.04) * 18 + Math.cos(x * 0.08) * 10;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(512, 128);
    ctx.lineTo(0, 128);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

export function PyramidsOfGizaBackground() {
  const stoneTex = useMemo(() => getCachedCanvasTexture('pyr_stone', createPyramidStoneTexture), []);
  const bumpTex = useMemo(() => getCachedCanvasTexture('pyr_bump', createPyramidBumpTexture), []);
  const capTex = useMemo(() => getCachedCanvasTexture('pyr_cap', createPyramidCapTexture), []);
  const duneTex = useMemo(() => getCachedCanvasTexture('pyr_dune', createDuneRippleTexture), []);
  const horizonTex = useMemo(() => getCachedCanvasTexture('pyr_horiz', createHorizonPanoramaTexture), []);

  const matPyramidStone = useMemo(() => new THREE.MeshStandardMaterial({
    map: stoneTex,
    bumpMap: bumpTex,
    bumpScale: 0.28,
    color: 0xd6b685,
    roughness: 0.82,
    metalness: 0.05
  }), [stoneTex, bumpTex]);

  const matPyramidCap = useMemo(() => new THREE.MeshStandardMaterial({
    map: capTex,
    bumpMap: bumpTex,
    bumpScale: 0.08,
    color: 0xeee2ce,
    roughness: 0.52,
    metalness: 0.08
  }), [capTex, bumpTex]);

  const matDesertDune = useMemo(() => new THREE.MeshStandardMaterial({
    map: duneTex,
    bumpMap: duneTex,
    bumpScale: 0.12,
    color: 0xdfbe8c,
    roughness: 0.90,
    metalness: 0.02
  }), [duneTex]);

  const matDistantRock = useMemo(() => new THREE.MeshStandardMaterial({
    map: stoneTex,
    bumpMap: bumpTex,
    bumpScale: 0.35,
    color: 0xc8a16c,
    roughness: 0.95
  }), [stoneTex, bumpTex]);

  const matHorizonRing = useMemo(() => new THREE.MeshStandardMaterial({
    map: horizonTex,
    roughness: 0.95,
    side: THREE.BackSide
  }), [horizonTex]);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. KHUFU (CHEOPS) */}
      <group position={[-55, 0, -170]}>
        <mesh castShadow receiveShadow position={[0, 42, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[68, 84, 4]} />
          <primitive object={matPyramidStone} attach="material" />
        </mesh>
        <mesh receiveShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[98, 3, 98]} />
          <primitive object={matPyramidStone} attach="material" />
        </mesh>
      </group>

      {/* 2. KHAFRE (CHEPHREN) */}
      <group position={[65, 0, -220]}>
        <mesh castShadow receiveShadow position={[0, 39, 0]} rotation={[0, Math.PI / 4 + 0.05, 0]}>
          <coneGeometry args={[62, 78, 4]} />
          <primitive object={matPyramidStone} attach="material" />
        </mesh>
        <mesh castShadow position={[0, 68, 0]} rotation={[0, Math.PI / 4 + 0.05, 0]}>
          <coneGeometry args={[16.5, 21, 4]} />
          <primitive object={matPyramidCap} attach="material" />
        </mesh>
        <mesh receiveShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4 + 0.05, 0]}>
          <boxGeometry args={[90, 3, 90]} />
          <primitive object={matPyramidStone} attach="material" />
        </mesh>
      </group>

      {/* 3. MENKAURE (MYKERINOS) */}
      <group position={[145, 0, -155]}>
        <mesh castShadow receiveShadow position={[0, 19, 0]} rotation={[0, Math.PI / 4 - 0.08, 0]}>
          <coneGeometry args={[32, 38, 4]} />
          <primitive object={matPyramidStone} attach="material" />
        </mesh>
        <mesh receiveShadow position={[0, 1.0, 0]} rotation={[0, Math.PI / 4 - 0.08, 0]}>
          <boxGeometry args={[46, 2, 46]} />
          <primitive object={matPyramidStone} attach="material" />
        </mesh>
      </group>

      {/* 4. QUEENS' PYRAMIDS */}
      {[-12, 10, 32].map((xOff, qIdx) => (
        <group key={`queen-pyr-${qIdx}`} position={[130 + xOff, 0, -125 - qIdx * 12]}>
          <mesh castShadow receiveShadow position={[0, 6, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[10, 12, 4]} />
            <primitive object={matPyramidStone} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 5. SPHINX OUTCROP */}
      <group position={[-95, 0, -110]}>
        <mesh castShadow receiveShadow position={[0, 4.5, 0]}>
          <boxGeometry args={[26, 9, 44]} />
          <primitive object={matDistantRock} attach="material" />
        </mesh>
        <mesh castShadow position={[0, 11.5, 14]}>
          <boxGeometry args={[7, 6.5, 8]} />
          <primitive object={matDistantRock} attach="material" />
        </mesh>
      </group>

      {/* 6. SAND DUNES */}
      <mesh receiveShadow position={[-20, 1.8, -85]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[180, 45, 8, 4]} />
        <primitive object={matDesertDune} attach="material" />
      </mesh>
      <mesh receiveShadow position={[75, 2.4, -95]} rotation={[-Math.PI / 2, 0, -0.15]}>
        <planeGeometry args={[160, 50, 8, 4]} />
        <primitive object={matDesertDune} attach="material" />
      </mesh>

      {/* 7. Panoramic Ring */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[280, 280, 24, 32, 1, true]} />
        <primitive object={matHorizonRing} attach="material" />
      </mesh>
    </group>
  );
}

// --- ☀️ SCENERY 1: BRIGHT CONCRETE PLAZA ---
function createConcretePlazaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const brightness = Math.random() * 50 - 25;
      ctx.fillStyle = brightness > 0 
        ? `rgba(255, 255, 255, ${brightness / 120})` 
        : `rgba(100, 116, 139, ${-brightness / 160})`;
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(250, 204, 21, 0.65)';
    ctx.fillRect(22, 0, 14, 512);
    ctx.fillRect(476, 0, 14, 512);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

export function BrightConcreteSceneryEnvironment() {
  const concreteTexture = useMemo(() => getCachedCanvasTexture('bright_concrete_ground', createConcretePlazaTexture), []);

  const bollards = useMemo(() => {
    const items: Array<{ x: number; z: number }> = [];
    for (let z = -26; z <= 26; z += 6.5) {
      items.push({ x: -2.85, z });
      items.push({ x: 2.85, z });
    }
    return items;
  }, []);

  return (
    <group>
      <AtmosphericSkyDome
        zenithColor="#1e40af"
        horizonColor="#7dd3fc"
        groundColor="#cbd5e1"
        sunPosition={[25, 30, 20]}
        sunColor="#fffdf0"
        cloudCoverage={0.14}
        cloudDensity={0.88}
        cloudSpeed={0.005}
      />

      <directionalLight
        position={[25, 30, 20]}
        intensity={3.8}
        color="#fffdf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0001}
      />

      <ambientLight intensity={1.2} color="#f0f9ff" />
      <directionalLight position={[-20, 15, -20]} intensity={1.4} color="#bae6fd" />

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial map={concreteTexture} roughness={0.45} metalness={0.08} />
      </mesh>

      {bollards.map((b, idx) => (
        <group key={`b-bollard-${idx}`} position={[b.x, 0, b.z]}>
          <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.9, 12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.082, 0.082, 0.18, 12]} />
            <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      ))}

      <group position={[-28, 1.8, -10]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4.2, 3.6, 9.5]} />
          <meshStandardMaterial color="#0369a1" roughness={0.4} metalness={0.3} />
        </mesh>
      </group>
      <group position={[28, 1.8, 8]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4.2, 3.6, 9.5]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.2} />
        </mesh>
      </group>

      <PyramidsOfGizaBackground />
    </group>
  );
}

// --- 🏜️ SCENERY: GIZA PYRAMIDS DESERT ---
function createDesertSandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#dfbe8c';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const br = Math.random() * 30 - 15;
      ctx.fillStyle = br > 0 
        ? `rgba(255, 248, 220, ${br / 90})` 
        : `rgba(160, 110, 50, ${-br / 90})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  return tex;
}

export function PyramidsSceneryEnvironment() {
  const sandTexture = useMemo(() => getCachedCanvasTexture('desert_sand_ground', createDesertSandTexture), []);

  return (
    <group>
      <AtmosphericSkyDome
        zenithColor="#1d4ed8"
        horizonColor="#7dd3fc"
        groundColor="#d97706"
        sunPosition={[35, 42, 25]}
        sunColor="#fff8e7"
        sunSize={1.1}
        sunIntensity={1.4}
        cloudCoverage={0.12}
        cloudDensity={0.85}
        cloudSpeed={0.004}
      />

      <directionalLight
        position={[35, 42, 25]}
        intensity={4.2}
        color="#fff8e7"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.0001}
      />

      <ambientLight intensity={1.25} color="#fed7aa" />
      <directionalLight position={[-20, 16, -20]} intensity={1.6} color="#fde68a" />

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial map={sandTexture} roughness={0.88} metalness={0.02} />
      </mesh>

      <PyramidsOfGizaBackground />
    </group>
  );
}

// --- ⛰️ PROCEDURAL MACHU PICCHU & INCA CITADEL TEXTURES ---
function createIncaStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8e8b82';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const br = Math.random() * 60 - 30;
      ctx.fillStyle = br > 0 ? `rgba(240, 235, 225, ${br / 110})` : `rgba(40, 40, 45, ${-br / 110})`;
      ctx.fillRect(x, y, 2, 2);
    }

    for (let y = 0; y <= 256; y += 18) {
      ctx.strokeStyle = 'rgba(25, 25, 25, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function createIncaBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y <= 256; y += 18) {
      ctx.fillStyle = '#101010';
      ctx.fillRect(0, y - 1, 256, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, y + 1, 256, 1.5);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function createAndeanMountainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5 ? '#1e4620' : '#4a5d43';
      ctx.fillRect(x, y, 3, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

function createAndeanPanoramaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.5, '#6ee7b7');
    grad.addColorStop(1.0, '#065f46');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#1e3a2b';
    ctx.beginPath();
    ctx.moveTo(0, 70);
    for (let x = 0; x <= 512; x += 16) {
      const h = 50 + Math.sin(x * 0.04) * 25 + Math.cos(x * 0.08) * 15;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(512, 128);
    ctx.lineTo(0, 128);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

export function MachuPicchuCitadelBackground() {
  const incaStoneTex = useMemo(() => getCachedCanvasTexture('inca_stone', createIncaStoneTexture), []);
  const incaBumpTex = useMemo(() => getCachedCanvasTexture('inca_bump', createIncaBumpTexture), []);
  const mountainTex = useMemo(() => getCachedCanvasTexture('andean_mountain', createAndeanMountainTexture), []);
  const panoramaTex = useMemo(() => getCachedCanvasTexture('andean_panorama', createAndeanPanoramaTexture), []);

  const matIncaStone = useMemo(() => new THREE.MeshStandardMaterial({
    map: incaStoneTex,
    bumpMap: incaBumpTex,
    bumpScale: 0.22,
    color: 0x9e9a90,
    roughness: 0.85,
    metalness: 0.05
  }), [incaStoneTex, incaBumpTex]);

  const matMountain = useMemo(() => new THREE.MeshStandardMaterial({
    map: mountainTex,
    color: 0x2e5c26,
    roughness: 0.90,
    metalness: 0.02
  }), [mountainTex]);

  const matTerraceGrass = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x38a169,
    roughness: 0.82,
    metalness: 0.02
  }), []);

  const matThatchRoof = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x926127,
    roughness: 0.92,
    metalness: 0.04
  }), []);

  const matLlamaFur = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.95
  }), []);

  const matAndeanHorizon = useMemo(() => new THREE.MeshStandardMaterial({
    map: panoramaTex,
    roughness: 0.95,
    side: THREE.BackSide
  }), [panoramaTex]);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. HUAYNA PICCHU */}
      <group position={[-25, 0, -185]}>
        <mesh castShadow receiveShadow position={[0, 55, 0]}>
          <coneGeometry args={[46, 110, 16]} />
          <primitive object={matMountain} attach="material" />
        </mesh>
      </group>

      {/* 2. HUCHUY PICCHU */}
      <group position={[35, 0, -165]}>
        <mesh castShadow receiveShadow position={[0, 32, 0]}>
          <coneGeometry args={[28, 64, 12]} />
          <primitive object={matMountain} attach="material" />
        </mesh>
      </group>

      {/* 3. AGRICULTURAL TERRACES */}
      {[-80, -60, -40, -20, 0, 20, 40, 60, 80].map((xPos, idx) => (
        <group key={`terrace-${idx}`} position={[xPos, (idx % 3) * 1.5, -95 - (idx % 4) * 12]}>
          <mesh receiveShadow position={[0, 0.75, 0]}>
            <boxGeometry args={[18, 1.5, 8]} />
            <primitive object={matIncaStone} attach="material" />
          </mesh>
          <mesh receiveShadow position={[0, 1.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[18, 8]} />
            <primitive object={matTerraceGrass} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 4. INCA STONE HOUSES */}
      {[-45, -20, 15, 45].map((xPos, hIdx) => (
        <group key={`house-${hIdx}`} position={[xPos, 2.0, -75]}>
          <mesh castShadow receiveShadow position={[0, 2.0, 0]}>
            <boxGeometry args={[8, 4, 6]} />
            <primitive object={matIncaStone} attach="material" />
          </mesh>
          <mesh castShadow position={[0, 4.8, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[6.5, 3.2, 4]} />
            <primitive object={matThatchRoof} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 5. LLAMAS */}
      {[
        { x: -14, z: -35, rot: 0.4 },
        { x: -10, z: -38, rot: -0.2 },
        { x: 18, z: -40, rot: 2.1 }
      ].map((llama, lIdx) => (
        <group key={`llama-${lIdx}`} position={[llama.x, 0, llama.z]} rotation={[0, llama.rot, 0]} scale={0.75}>
          <mesh castShadow position={[0, 0.9, 0]}>
            <boxGeometry args={[0.7, 0.7, 1.2]} />
            <primitive object={matLlamaFur} attach="material" />
          </mesh>
          <mesh castShadow position={[0, 1.5, 0.5]}>
            <boxGeometry args={[0.3, 0.9, 0.35]} />
            <primitive object={matLlamaFur} attach="material" />
          </mesh>
          <mesh castShadow position={[0, 1.9, 0.7]}>
            <boxGeometry args={[0.32, 0.35, 0.5]} />
            <primitive object={matLlamaFur} attach="material" />
          </mesh>
          {[-0.25, 0.25].map((lx, legIdx1) =>
            [-0.45, 0.45].map((lz, legIdx2) => (
              <mesh key={`leg-${legIdx1}-${legIdx2}`} castShadow position={[lx, 0.45, lz]}>
                <cylinderGeometry args={[0.06, 0.05, 0.9, 8]} />
                <primitive object={matLlamaFur} attach="material" />
              </mesh>
            ))
          )}
        </group>
      ))}

      {/* 6. Distant Horizon Ring */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[260, 260, 24, 32, 1, true]} />
        <primitive object={matAndeanHorizon} attach="material" />
      </mesh>
    </group>
  );
}

function createAndeanGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2f7a38';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5 ? '#235e2b' : '#3ea34b';
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  return tex;
}

export function MachuPicchuSceneryEnvironment() {
  const grassTexture = useMemo(() => getCachedCanvasTexture('andean_grass_ground', createAndeanGrassTexture), []);

  return (
    <group>
      <AtmosphericSkyDome
        zenithColor="#0284c7"
        horizonColor="#a7f3d0"
        groundColor="#15803d"
        sunPosition={[28, 38, 22]}
        sunColor="#fffbeb"
        sunSize={1.05}
        sunIntensity={1.35}
        cloudCoverage={0.15}
        cloudDensity={0.80}
        cloudSpeed={0.005}
      />

      <directionalLight
        position={[28, 38, 22]}
        intensity={4.0}
        color="#fffbeb"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.0001}
      />

      <ambientLight intensity={1.2} color="#ecfdf5" />
      <directionalLight position={[-18, 18, -18]} intensity={1.5} color="#bae6fd" />

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial map={grassTexture} roughness={0.85} metalness={0.02} />
      </mesh>

      <MachuPicchuCitadelBackground />
    </group>
  );
}

// --- 🌾 SCENERY 2: BRIGHT SUMMER MEADOW ---
function createBrightMeadowGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5 ? '#22c55e' : '#86efac';
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  return tex;
}

export function BrightMeadowSceneryEnvironment() {
  const grassTexture = useMemo(() => getCachedCanvasTexture('bright_meadow_ground', createBrightMeadowGrassTexture), []);

  const wildflowers = useMemo(() => {
    const items: Array<{ x: number; z: number; color: string; size: number }> = [];
    const colors = ['#fde047', '#ffffff', '#fb7185', '#c084fc', '#f97316', '#38bdf8'];
    for (let i = 0; i < 120; i++) {
      const sign = Math.random() > 0.5 ? 1 : -1;
      const x = sign * (Math.random() * 38 + 2.5);
      const z = (Math.random() - 0.5) * 75;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 0.13 + 0.07;
      items.push({ x, z, color, size });
    }
    return items;
  }, []);

  return (
    <group>
      <AtmosphericSkyDome
        zenithColor="#1e40af"
        horizonColor="#7dd3fc"
        groundColor="#4ade80"
        sunPosition={[20, 28, 18]}
        sunColor="#fffdf0"
        cloudCoverage={0.14}
        cloudDensity={0.88}
        cloudSpeed={0.005}
      />

      <directionalLight
        position={[20, 28, 18]}
        intensity={3.6}
        color="#fffdf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0001}
      />
      <ambientLight intensity={1.15} color="#ecfdf5" />
      <directionalLight position={[-15, 12, -15]} intensity={1.3} color="#bae6fd" />

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial map={grassTexture} roughness={0.88} metalness={0.02} />
      </mesh>

      {wildflowers.map((wf, idx) => (
        <group key={`bm-wf-${idx}`} position={[wf.x, 0.04, wf.z]}>
          <mesh castShadow position={[0, 0, 0]}>
            <sphereGeometry args={[wf.size, 6, 6]} />
            <meshStandardMaterial color={wf.color} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- 💡 SCENERY 3: BRIGHT WHITE STUDIO CYCLORAMA ---
export function BrightStudioSceneryEnvironment() {
  return (
    <group>
      <AtmosphericSkyDome
        zenithColor="#ffffff"
        horizonColor="#f8fafc"
        groundColor="#f1f5f9"
        sunPosition={[15, 25, 15]}
        sunColor="#ffffff"
        cloudCoverage={0.0}
        sunIntensity={0.8}
      />

      <directionalLight position={[15, 25, 15]} intensity={3.0} color="#ffffff" castShadow />
      <ambientLight intensity={1.3} color="#ffffff" />
      <directionalLight position={[-15, 18, -15]} intensity={1.6} color="#f1f5f9" />

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.25} metalness={0.08} />
      </mesh>

      <Grid
        infiniteGrid
        fadeDistance={70}
        sectionColor="#94a3b8"
        sectionSize={5}
        cellColor="#cbd5e1"
        cellSize={1}
        position={[0, 0.001, 0]}
      />
    </group>
  );
}

// --- 🌿 SCENERY 4: PROCEDURAL FLOWER MEADOW ---
function createClassicMeadowGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2f6323';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5 ? '#224d17' : '#529638';
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  return tex;
}

export function MeadowSceneryEnvironment() {
  const grassTexture = useMemo(() => getCachedCanvasTexture('meadow_grass_ground', createClassicMeadowGrassTexture), []);

  return (
    <group>
      <AtmosphericSkyDome
        zenithColor="#2563eb"
        horizonColor="#bfdbfe"
        groundColor="#2f6323"
        sunPosition={[20, 25, 20]}
        sunColor="#fef08a"
        cloudCoverage={0.42}
        cloudDensity={0.70}
        cloudSpeed={0.009}
      />

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial map={grassTexture} roughness={0.92} metalness={0.04} />
      </mesh>
    </group>
  );
}

// --- 🏗️ SCENERY 5: INDUSTRIAL CONCRETE SLAB PLAZA ---
function createIndustrialConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const brightness = Math.random() * 40 - 20;
      ctx.fillStyle = brightness > 0 ? `rgba(255,255,255,${brightness / 130})` : `rgba(0,0,0,${-brightness / 130})`;
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.strokeStyle = '#272f3d';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

export function ConcreteSceneryEnvironment() {
  const concreteTexture = useMemo(() => getCachedCanvasTexture('industrial_concrete_ground', createIndustrialConcreteTexture), []);

  return (
    <group>
      <AtmosphericSkyDome
        zenithColor="#3b82f6"
        horizonColor="#94a3b8"
        groundColor="#64748b"
        sunPosition={[25, 28, 15]}
        sunColor="#fffbeb"
        cloudCoverage={0.48}
        cloudDensity={0.75}
        cloudSpeed={0.012}
      />

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial map={concreteTexture} roughness={0.65} metalness={0.15} />
      </mesh>
    </group>
  );
}

// --- 🌊 SCENERY 6: SCENIC LAKE SHORE ---
function createLakeShoreTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#6b5c4c';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#3d3228';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 256; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 26);
  return tex;
}

export function LakeSceneryEnvironment() {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (waterRef.current) {
      const t = clock.getElapsedTime();
      waterRef.current.position.y = -0.04 + Math.sin(t * 1.6) * 0.008;
    }
  });

  const shoreTexture = useMemo(() => getCachedCanvasTexture('lake_shore_ground', createLakeShoreTexture), []);

  return (
    <group>
      <AtmosphericSkyDome
        zenithColor="#0369a1"
        horizonColor="#fdba74"
        groundColor="#6b5c4c"
        sunPosition={[30, 10, 20]}
        sunColor="#ffedd5"
        sunIntensity={2.0}
        cloudCoverage={0.35}
        cloudDensity={0.65}
        cloudSpeed={0.007}
      />

      <mesh receiveShadow position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 160]} />
        <meshStandardMaterial map={shoreTexture} roughness={0.78} metalness={0.12} />
      </mesh>

      <mesh ref={waterRef} position={[24, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[65, 160]} />
        <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.85} transparent opacity={0.88} />
      </mesh>
    </group>
  );
}

// --- 🌟 SCENERY: LUXURY SHOWROOM TURNTABLE PLATFORM (MATCHING LKW SHOWROOM) ---
export function ShowroomPlateSceneryEnvironment() {
  const matFloor = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1f26',
    roughness: 0.55,
    metalness: 0.35,
  }), []);

  const matTurntable = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#161c24',
    roughness: 0.36,
    metalness: 0.65,
  }), []);

  const matOuterRing = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00dcff',
    emissive: '#00dcff',
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.8,
    side: THREE.DoubleSide,
  }), []);

  const matInnerRing = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#2a3b4c',
    side: THREE.DoubleSide,
  }), []);

  const matCenterRing = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#00dcff',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  }), []);

  return (
    <group>
      {/* 1. Haupt-Bodenplatte (Dark Showroom Studio Floor 160x160m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.041, 0]} receiveShadow material={matFloor}>
        <planeGeometry args={[160, 160]} />
      </mesh>

      {/* 2. Drehteller-Plattform (Turntable Platform Ø 18m, bündig auf Höhe 0.00m) */}
      <mesh position={[0, -0.04, 0]} receiveShadow material={matTurntable}>
        <cylinderGeometry args={[9.0, 9.2, 0.08, 64]} />
      </mesh>

      {/* 3. Gebürsteter Cyan-Glühring am Außenrand des Drehtellers (Ø 18m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} material={matOuterRing}>
        <ringGeometry args={[8.95, 9.15, 64]} />
      </mesh>

      {/* 4. Konzentrischer Zwischenring (Ø 9m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} material={matInnerRing}>
        <ringGeometry args={[4.5, 4.54, 48]} />
      </mesh>

      {/* 5. Subtiler Zentrierungs-Ring unter dem Dolly (Ø 4.5m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} material={matCenterRing}>
        <ringGeometry args={[2.2, 2.24, 48]} />
      </mesh>

      {/* 6. High-Tech Infinite Grid */}
      <Grid
        position={[0, -0.04, 0]}
        infiniteGrid
        fadeDistance={75}
        sectionColor="#00dcff"
        sectionSize={6}
        cellColor="#1e293b"
        cellSize={1.5}
      />

      {/* 7. Showroom Studio Akzentbeleuchtung (Golden Hour / Softbox Glow wie LKW) */}
      <directionalLight
        position={[28, 12, 22]}
        intensity={2.8}
        color="#ffe0b2"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <ambientLight color="#9cb8d9" intensity={0.55} />
      <pointLight position={[0, 4, 0]} intensity={1.5} distance={15} color="#38bdf8" />
    </group>
  );
}

// --- 🎬 SCENERY 7: DARK TECH STUDIO ---
export function DarkStudioSceneryEnvironment() {
  return (
    <group>
      <Grid
        infiniteGrid
        fadeDistance={65}
        sectionColor="#38bdf8"
        sectionSize={5}
        cellColor="#1e293b"
        cellSize={1}
      />
    </group>
  );
}

// --- 🌟 MASTER SCENERY RENDERER ---
export function CraneSceneryEnvironment({ sceneryMode }: { sceneryMode: CraneSceneryType }) {
  switch (sceneryMode) {
    case 'plate':
      return <ShowroomPlateSceneryEnvironment />;
    case 'bright_concrete':
      return <BrightConcreteSceneryEnvironment />;
    case 'pyramids':
      return <PyramidsSceneryEnvironment />;
    case 'machu_picchu':
      return <MachuPicchuSceneryEnvironment />;
    case 'bright_meadow':
      return <BrightMeadowSceneryEnvironment />;
    case 'bright_studio':
      return <BrightStudioSceneryEnvironment />;
    case 'meadow':
      return <MeadowSceneryEnvironment />;
    case 'concrete':
      return <ConcreteSceneryEnvironment />;
    case 'lake':
      return <LakeSceneryEnvironment />;
    case 'studio':
    default:
      return <DarkStudioSceneryEnvironment />;
  }
}
