import * as THREE from 'three';

/**
 * Supertechno 50+ Ultra-Faithful Custom GLSL Shaders
 * Original-grade matte dark steel, cast iron, plexiglass, decals, and checkerplate materials.
 */

// 1. High-Detail Matte Black / Anthracite Steel Shader for Main Crane Frame
export const SupertechnoMetalShader = {
  uniforms: {
    uBaseColor: { value: new THREE.Color(0x14171d) }, // Matte Dark Anthracite Black
    uMetalness: { value: 0.90 },
    uRoughness: { value: 0.28 },
    uLightPosition: { value: new THREE.Vector3(12, 25, 18) }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying vec3 vViewDir;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vViewDir = normalize(cameraPosition - worldPosition.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform float uMetalness;
    uniform float uRoughness;
    uniform vec3 uLightPosition;
    
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying vec3 vViewDir;
    
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    
    void main() {
      vec3 N = normalize(vNormal);
      vec3 L = normalize(uLightPosition - vWorldPosition);
      vec3 V = normalize(vViewDir);
      vec3 H = normalize(L + V);
      
      float scratch = hash(vUv * vec2(300.0, 8.0)) * 0.06;
      vec3 albedo = uBaseColor + vec3(scratch);
      
      float NdotL = max(dot(N, L), 0.0);
      vec3 diffuse = albedo * NdotL * 0.75;
      
      float NdotH = max(dot(N, H), 0.0);
      float specPower = mix(256.0, 32.0, uRoughness);
      float specular = pow(NdotH, specPower) * uMetalness;
      
      float NdotV = max(dot(N, V), 0.0);
      float fresnel = pow(1.0 - NdotV, 4.0) * 0.35;
      
      vec3 finalColor = diffuse + vec3(specular * 0.65) + (vec3(0.8, 0.9, 1.0) * fresnel);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// 2. Cast Iron Steel Gray Shader for Counterweight Bricks ("445" Stencil)
export const CastIronWeightShader = {
  uniforms: {
    uBaseColor: { value: new THREE.Color(0x3e444c) }, // Cast Iron Steel Gray
    uLightPosition: { value: new THREE.Vector3(10, 20, 15) }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uLightPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec3 N = normalize(vNormal);
      vec3 L = normalize(uLightPosition - vWorldPosition);
      
      float grain = (noise(vUv * 90.0) - 0.5) * 0.12;
      vec3 color = uBaseColor + vec3(grain);
      
      float diffuse = max(dot(N, L), 0.25);
      gl_FragColor = vec4(color * diffuse, 1.0);
    }
  `
};

// 3. Hydraulic Chrome Cylinder Shader
export const HydraulicChromeShader = {
  uniforms: {},
  vertexShader: `
    varying vec3 vReflect;
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vec3 viewDir = normalize(worldPos.xyz - cameraPosition);
      vReflect = reflect(viewDir, normalize(mat3(modelMatrix) * normal));
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying vec3 vReflect;
    varying vec3 vNormal;
    
    void main() {
      vec3 N = normalize(vNormal);
      vec3 lightDir = normalize(vec3(1.0, 2.5, 1.5));
      float spec = pow(max(dot(reflect(-lightDir, N), normalize(-vReflect)), 0.0), 48.0);
      
      vec3 chromeBase = vec3(0.92, 0.94, 0.98);
      vec3 color = chromeBase + vec3(spec * 0.95);
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// 4. Safety Hazard Stripe Shader
export const HazardStripeShader = {
  uniforms: {
    uStripeFrequency: { value: 35.0 },
    uColorA: { value: new THREE.Color(0xffd700) },
    uColorB: { value: new THREE.Color(0x111318) }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uStripeFrequency;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      float pattern = sin((vUv.x + vUv.y) * uStripeFrequency);
      float stripe = step(0.0, pattern);
      vec3 color = mix(uColorA, uColorB, stripe);
      
      vec3 lightDir = normalize(vec3(0.6, 1.0, 0.8));
      float lighting = max(dot(vNormal, lightDir), 0.35);
      
      gl_FragColor = vec4(color * lighting, 1.0);
    }
  `
};

// 5. Director Monitor Focus Peaking / CRT Shader
export const DirectorMonitorShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFocusPeaking: { value: 1.0 },
    uChromaticAberration: { value: 0.002 },
    uVignette: { value: 0.45 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uFocusPeaking;
    uniform float uChromaticAberration;
    uniform float uVignette;
    varying vec2 vUv;
    
    float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      
      float r = texture2D(tDiffuse, uv + vec2(uChromaticAberration, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(uChromaticAberration, 0.0)).b;
      vec3 color = vec3(r, g, b);
      
      if (uFocusPeaking > 0.5) {
        vec2 texel = vec2(1.0 / 380.0, 1.0 / 214.0);
        float n = texture2D(tDiffuse, uv + vec2(0.0, -texel.y)).g;
        float s = texture2D(tDiffuse, uv + vec2(0.0, texel.y)).g;
        float e = texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).g;
        float w = texture2D(tDiffuse, uv + vec2(-texel.x, 0.0)).g;
        
        float edge = abs(n - s) + abs(e - w);
        if (edge > 0.15) {
          color = mix(color, vec3(0.0, 1.0, 0.4), 0.85);
        }
      }
      
      float scanline = sin(uv.y * 700.0) * 0.02;
      color -= scanline;
      
      float noise = rand(uv + vec2(uTime * 0.015, uTime * 0.03)) * 0.03;
      color += noise;
      
      float dist = distance(uv, vec2(0.5));
      color *= smoothstep(0.85, uVignette, dist);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

/**
 * Canvas Procedural Texture Helper for Scale Marks & Warning Decals
 */
export function createLengthScaleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#14171d';
  ctx.fillRect(0, 0, 1024, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Orbitron, sans-serif';
  ctx.textAlign = 'center';

  const feetMarks = ['38\'', '36\'', '34\'', '32\'', '30\'', '28\'', '26\'', '24\'', '22\'', '20\'', '18\''];
  const step = 1024 / (feetMarks.length - 1);

  feetMarks.forEach((txt, i) => {
    const x = i * step;
    ctx.fillRect(x - 2, 0, 4, 35);
    ctx.fillText(txt, x, 75);

    // Intermediate ticks
    if (i < feetMarks.length - 1) {
      const midX = x + step / 2;
      ctx.fillRect(midX - 1, 0, 2, 20);
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createBrandBadgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Clear background
  ctx.clearRect(0, 0, 1024, 256);

  // Yellow Outline Box
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, 984, 216);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 82px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SUPERTECHNO 50 PLUS', 512, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createWarningDecalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 256);

  // Red Border
  ctx.fillStyle = '#ff1122';
  ctx.fillRect(10, 10, 492, 236);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(20, 20, 472, 216);

  // Warning Header
  ctx.fillStyle = '#ff1122';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚠️ WARNING / ACHTUNG ⚠️', 256, 55);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('DO NOT OPERATE CRANE IF ANY', 256, 100);
  ctx.fillText('PLEXIGLASS PANELS ARE MISSING', 256, 125);

  ctx.fillStyle = '#ff1122';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('KEEP CRANE OUT OF REACH OF', 256, 170);
  ctx.fillText('ANY ELECTRICAL POWERLINES', 256, 195);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createCheckerplateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#222830';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#3a424d';
  for (let x = 0; x < 256; x += 32) {
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.ellipse(x + 16, y + 16, 10, 3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(x + 32, y + 32, 10, 3, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}
