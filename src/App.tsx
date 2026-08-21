import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import './App.css';
import Truck from './components/Truck';
import Crane from './components/Crane';
import SlopeCable from './components/SlopeCable';
import CraneTennis from './components/CraneTennis';
import TechnocraneStudio from './components/TechnocraneStudio';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nebulaRef = useRef<HTMLDivElement>(null);
  const craneHudRef = useRef<HTMLDivElement>(null);
  const truckHudRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'text' | 'truck' | 'crane' | 'cable' | 'tennis' | 'technocrane'>('text');

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Check if renderer already exists to avoid recreating on hot reload
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true // Allow background to show through
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 2. Licht und Environment für den metallischen Look
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 5);
    scene.add(ambientLight, directionalLight);

    // --- Cinematic Environment: Fog & Clouds ---
    scene.fog = new THREE.FogExp2(0x0d0d12, 0.0); // Starts with 0 density

    function createCloudTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      if (context) {
        const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
      }
      return new THREE.CanvasTexture(canvas);
    }

    const cloudGeo = new THREE.BufferGeometry();
    const cloudCount = 1500;
    const cloudPos = new Float32Array(cloudCount * 3);
    for (let i = 0; i < cloudCount; i++) {
      cloudPos[i * 3] = (Math.random() - 0.5) * 400; // X spread
      cloudPos[i * 3 + 1] = -20 - Math.random() * 40; // Y between -20 and -60 (clouds are below the text)
      cloudPos[i * 3 + 2] = (Math.random() - 0.5) * 400; // Z spread
    }
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
    
    const cloudMat = new THREE.PointsMaterial({
      size: 40,
      map: createCloudTexture(),
      transparent: true,
      opacity: 0.15,
      color: 0x444455, // Dark storm clouds
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const cloudParticles = new THREE.Points(cloudGeo, cloudMat);
    scene.add(cloudParticles);

    // Helper: Dynamische Texturen generieren für einen Buchstaben
    function createLetterTextures(letter: string, theme: 'silver' | 'black' = 'silver') {
      const isBlack = theme === 'black';

      const canvasText = document.createElement('canvas');
      canvasText.width = 512;
      canvasText.height = 512;
      const ctx = canvasText.getContext('2d');
      
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = 512;
      colorCanvas.height = 512;
      const colorCtx = colorCanvas.getContext('2d');

      if (ctx && colorCtx) {
        // --- Bump Map (Tiefe) ---
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);

        ctx.lineWidth = 1;
        for (let i = 0; i < 4000; i++) {
          ctx.strokeStyle = `rgba(200, 200, 200, ${Math.random() * 0.01})`;
          ctx.beginPath();
          const y = Math.random() * 512;
          ctx.moveTo(0, y);
          ctx.lineTo(512, y);
          ctx.stroke();
        }

        ctx.font = 'bold 350px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const metrics = ctx.measureText(letter);
        const yOffset = 256 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;

        ctx.fillStyle = '#000000';
        ctx.filter = 'blur(8px)';
        ctx.fillText(letter, 256, yOffset);
        ctx.filter = 'none';

        // --- Color Map (Farbe) ---
        colorCtx.fillStyle = isBlack ? '#1a1a1a' : '#b0b0b0';
        colorCtx.fillRect(0, 0, 512, 512);

        colorCtx.lineWidth = 1;
        for (let i = 0; i < 4000; i++) {
          // Helle Reflexionsstreifen
          colorCtx.strokeStyle = isBlack 
            ? `rgba(255, 255, 255, ${Math.random() * 0.015})`
            : `rgba(255, 255, 255, ${Math.random() * 0.05})`;
          colorCtx.beginPath();
          const y1 = Math.random() * 512;
          colorCtx.moveTo(0, y1);
          colorCtx.lineTo(512, y1);
          colorCtx.stroke();
          
          // Dunkle Schmutz/Rillen-Streifen
          colorCtx.strokeStyle = isBlack 
            ? `rgba(0, 0, 0, ${Math.random() * 0.4})`
            : `rgba(50, 50, 50, ${Math.random() * 0.03})`;
          colorCtx.beginPath();
          const y2 = Math.random() * 512;
          colorCtx.moveTo(0, y2);
          colorCtx.lineTo(512, y2);
          colorCtx.stroke();
        }

        colorCtx.fillStyle = isBlack ? '#ffffff' : '#e5c500'; // Weiß für schwarze Würfel, Gold für silberne
        colorCtx.font = 'bold 350px Arial';
        colorCtx.textAlign = 'center';
        colorCtx.textBaseline = 'alphabetic';
        colorCtx.fillText(letter, 256, yOffset);
      }
      
      const bumpTexture = new THREE.CanvasTexture(canvasText);
      const colorTexture = new THREE.CanvasTexture(colorCanvas);
      colorTexture.colorSpace = THREE.SRGBColorSpace;
      
      return { bumpTexture, colorTexture };
    }

    const materials: THREE.MeshStandardMaterial[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const textures: THREE.Texture[] = [];

    // --- TECHNOGRIPS & VIENNA Cubes ---
    const technoLetters = ['T', 'E', 'C', 'H', 'N', 'O', 'G', 'R', 'I', 'P', 'S'];
    const viennaLetters = ['V', 'I', 'E', 'N', 'N', 'A'];
    
    const wordCubes: THREE.Mesh[] = [];
    // Würfel nochmals deutlich vergrößert (6x6x6)
    const wordGeometry = new RoundedBoxGeometry(6.0, 6.0, 6.0, 6, 0.72);
    geometries.push(wordGeometry);

    const spacing = 7.5; 
    
    // Positionen für TECHNOGRIPS (obere Reihe)
    const technoStartX = -((technoLetters.length - 1) * spacing) / 2;
    const technoYPos = 4.0; 

    // Helper: setup userData for explosion animation
    const setupExplosionData = (cube: THREE.Mesh, baseY: number, baseX: number) => {
      // Base direction outward to prevent massive path crossing
      const dir = new THREE.Vector3(baseX, baseY, 0);
      
      // Add strong random deviation so it looks chaotic and less like a perfect starburst
      dir.x += (Math.random() - 0.5) * 20;
      dir.y += (Math.random() - 0.5) * 20;
      dir.normalize();
      
      // Highly randomized distance
      const distance = 60 + Math.random() * 120; 

      const explodeDir = new THREE.Vector3(
        dir.x * distance,
        dir.y * distance,
        (Math.random() - 0.5) * 160 // Massive random depth (Z) so they fly past each other
      );
      
      const explodeRot = new THREE.Euler(
        (Math.random() - 0.5) * Math.PI * 10,
        (Math.random() - 0.5) * Math.PI * 10,
        (Math.random() - 0.5) * Math.PI * 10
      );
      cube.userData = {
        baseX: baseX,
        baseY: baseY,
        baseZ: 0,
        explodeDir,
        explodeRot,
        currentRotX: 0,
        currentRotY: 0,
        repulsionOffset: new THREE.Vector3(0, 0, 0)
      };
    };

    // Build TECHNOGRIPS (Black Theme)
    technoLetters.forEach((letter, index) => {
      const tex = createLetterTextures(letter, 'black');
      textures.push(tex.bumpTexture, tex.colorTexture);

      const mat = new THREE.MeshStandardMaterial({
        map: tex.colorTexture,
        roughness: 0.4,
        metalness: 0.6,
        bumpMap: tex.bumpTexture,
        bumpScale: 15 // Tieferer Deboss-Effekt für die schwarzen Würfel
      });
      materials.push(mat);

      const cube = new THREE.Mesh(wordGeometry, mat);
      const baseX = technoStartX + index * spacing;
      cube.position.x = baseX;
      cube.position.y = technoYPos;
      
      setupExplosionData(cube, technoYPos, baseX);
      scene.add(cube);
      wordCubes.push(cube);
    });

    // Positionen für VIENNA (untere Reihe)
    const viennaStartX = -((viennaLetters.length - 1) * spacing) / 2;
    const viennaYPos = -4.0;

    // Build VIENNA (Silver Theme)
    viennaLetters.forEach((letter, index) => {
      const tex = createLetterTextures(letter, 'silver');
      textures.push(tex.bumpTexture, tex.colorTexture);

      const mat = new THREE.MeshStandardMaterial({
        map: tex.colorTexture,
        roughness: 0.4,
        metalness: 0.6,
        bumpMap: tex.bumpTexture,
        bumpScale: 5
      });
      materials.push(mat);

      const cube = new THREE.Mesh(wordGeometry, mat);
      const baseX = viennaStartX + index * spacing;
      cube.position.x = baseX;
      cube.position.y = viennaYPos;
      
      setupExplosionData(cube, viennaYPos, baseX);
      scene.add(cube);
      wordCubes.push(cube);
    });

    camera.position.z = 35; // Z-Achse stark verringert für massivere optische Größe

    // --- Explosion Interaction Logic ---
    let targetExplodeProgress = 0;
    let currentExplodeProgress = 0;

    const handleWheel = (event: WheelEvent) => {
      targetExplodeProgress += event.deltaY * 0.0003;
      targetExplodeProgress = Math.max(0, Math.min(2.0, targetExplodeProgress));
    };

    let touchStartY = 0;
    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0].clientY;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touchY = event.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      targetExplodeProgress += deltaY * 0.001;
      targetExplodeProgress = Math.max(0, Math.min(2.0, targetExplodeProgress));
      touchStartY = touchY;
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Handle Window Resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // 5. Anti-Gravity & Render Loop
    const clock = new THREE.Clock();
    let animationFrameId: number;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth dampening for the explosion progress (slower, lazier movement)
      currentExplodeProgress += (targetExplodeProgress - currentExplodeProgress) * 0.04;

      // --- Multi-Phase Cinematic Camera & Fog Animation ---
      let targetCamZ = 35;
      let targetCamY = 0;
      let targetFogDensity = 0;

      if (currentExplodeProgress <= 0.4) {
        // Phase 1: Zoom out & text explodes
        const p = currentExplodeProgress / 0.4;
        targetCamZ = 35 + p * 45; // Zooms out to 80
      } else if (currentExplodeProgress <= 0.7) {
        // Phase 2: Sinking into dense clouds
        const p = (currentExplodeProgress - 0.4) / 0.3;
        targetCamZ = 80;
        targetCamY = 0 - p * 40; // Sink down to -40
        targetFogDensity = p * 0.08; // Fog thickens massively
      } else if (currentExplodeProgress <= 1.0) {
        // Phase 3: Fog clears, zooming in on the Crane HUD
        const p = (currentExplodeProgress - 0.7) / 0.3;
        targetCamZ = 80 - p * 45; // Zooms in to 35
        targetCamY = -40 - p * 5; // Sinks slightly further down
        targetFogDensity = 0.08 - p * 0.08; // Fog clears completely
      } else if (currentExplodeProgress <= 1.4) {
        // Phase 4: Zoom out again from Crane HUD
        const p = (currentExplodeProgress - 1.0) / 0.4;
        targetCamZ = 35 + p * 45; // Zooms out to 80
        targetCamY = -45;
        targetFogDensity = 0;
      } else if (currentExplodeProgress <= 1.7) {
        // Phase 5: Second Cloud Dive
        const p = (currentExplodeProgress - 1.4) / 0.3;
        targetCamZ = 80;
        targetCamY = -45 - p * 40; // Sink down to -85
        targetFogDensity = p * 0.08; // Fog thickens
      } else {
        // Phase 6: Fog clears, zooming in on the Truck HUD
        const p = (currentExplodeProgress - 1.7) / 0.3;
        targetCamZ = 80 - p * 45; // Zooms in to 35
        targetCamY = -85 - p * 5; // Sinks slightly further down to -90
        targetFogDensity = 0.08 - p * 0.08; // Fog clears completely
      }

      // Apply smooth camera movement
      camera.position.z += (targetCamZ - camera.position.z) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      
      if (scene.fog) {
        (scene.fog as THREE.FogExp2).density += (targetFogDensity - (scene.fog as THREE.FogExp2).density) * 0.05;
      }

      // Rotate clouds slowly
      if (cloudParticles) {
        cloudParticles.rotation.y = time * 0.02;
      }

      // Clamp text explosion progress so cubes don't fly away endlessly in phases 4-6
      const textExplodeProgress = Math.min(1.0, currentExplodeProgress);

      // Apply effects to cubes
      wordCubes.forEach((cube, index) => {
        // Base floating effect (only fully active when not exploded)
        const floatY = cube.userData.baseY + Math.sin(time * 1.5 + index * 0.2) * 0.6 * (1 - textExplodeProgress);
        
        // Base idle rotation
        cube.userData.currentRotX += 0.003 * (1 - textExplodeProgress);
        cube.userData.currentRotY += 0.006 * (1 - textExplodeProgress);

        // Interpolate Position
        const targetX = cube.userData.baseX + cube.userData.explodeDir.x * textExplodeProgress;
        const targetY = floatY + cube.userData.explodeDir.y * textExplodeProgress;
        const targetZ = cube.userData.baseZ + cube.userData.explodeDir.z * textExplodeProgress;
        cube.position.set(targetX, targetY, targetZ);
        
        // Smoothly decay any existing repulsion
        cube.userData.repulsionOffset.multiplyScalar(0.9);
      });

      // Calculate Repulsion (Bouncing off each other)
      if (textExplodeProgress > 0.0 && textExplodeProgress < 1.0) {
        // The cubes are 6x6x6, so face-to-face is 6, diagonal is ~10.4.
        // At progress=0 they are 7.5 apart. We increase minDistance as they explode to account for rotation.
        const minDistance = 7.5 + textExplodeProgress * 3.5; 
        
        for (let i = 0; i < wordCubes.length; i++) {
          for (let j = i + 1; j < wordCubes.length; j++) {
            const c1 = wordCubes[i];
            const c2 = wordCubes[j];
            
            const dist = c1.position.distanceTo(c2.position);
            if (dist < minDistance) {
              const overlap = minDistance - dist;
              const push = new THREE.Vector3().subVectors(c1.position, c2.position);
              if (push.lengthSq() < 0.001) push.set(1, 1, 0); // avoid zero vector
              push.normalize();
              
              const force = overlap * 0.15; // spring strength
              c1.userData.repulsionOffset.addScaledVector(push, force);
              c2.userData.repulsionOffset.addScaledVector(push, -force);
            }
          }
        }
      }

      // Apply Final Positions and Rotations
      wordCubes.forEach((cube) => {
        // Fade repulsion in/out based on explodeProgress so they still perfectly form the text at 0
        const bounceIntensity = Math.min(1, textExplodeProgress * 5);
        cube.position.addScaledVector(cube.userData.repulsionOffset, bounceIntensity);
        
        // Interpolate Rotation
        const rotX = cube.userData.currentRotX + cube.userData.explodeRot.x * textExplodeProgress;
        const rotY = cube.userData.currentRotY + cube.userData.explodeRot.y * textExplodeProgress;
        const rotZ = cube.userData.explodeRot.z * textExplodeProgress;
        cube.rotation.set(rotX, rotY, rotZ);
      });

      // Update DOM Overlays
      if (nebulaRef.current) {
        // Nebula fades in during phase 1, out in phase 3, in during phase 4, out in phase 6
        let nebulaOpacity = 0;
        if (currentExplodeProgress <= 0.7) {
          nebulaOpacity = Math.max(0, (currentExplodeProgress - 0.1) * 1.5);
        } else if (currentExplodeProgress <= 1.0) {
          nebulaOpacity = Math.max(0, 1 - (currentExplodeProgress - 0.7) * 2);
        } else if (currentExplodeProgress <= 1.7) {
          nebulaOpacity = Math.max(0, (currentExplodeProgress - 1.1) * 1.5);
        } else {
          nebulaOpacity = Math.max(0, 1 - (currentExplodeProgress - 1.7) * 2);
        }
        nebulaRef.current.style.opacity = Math.min(1, nebulaOpacity).toString();
      }
      
      if (craneHudRef.current) {
        // Crane HUD is visible between 0.7 and 1.2
        let craneOpacity = 0;
        if (currentExplodeProgress > 0.7 && currentExplodeProgress <= 1.0) {
          craneOpacity = (currentExplodeProgress - 0.7) * 3.33;
        } else if (currentExplodeProgress > 1.0 && currentExplodeProgress <= 1.2) {
          craneOpacity = 1 - (currentExplodeProgress - 1.0) * 5;
        }
        craneHudRef.current.style.opacity = Math.max(0, Math.min(1, craneOpacity)).toString();
        craneHudRef.current.style.transform = `translate(-50%, -50%) scale(${0.8 + craneOpacity * 0.2})`;
      }

      if (truckHudRef.current) {
        // Truck HUD fades in when > 1.7
        const truckOpacity = Math.max(0, (currentExplodeProgress - 1.7) * 3.33);
        truckHudRef.current.style.opacity = truckOpacity.toString();
        truckHudRef.current.style.transform = `translate(-50%, -50%) scale(${0.8 + truckOpacity * 0.2})`;
      }

      renderer.render(scene, camera);
    }

    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose());
      cloudGeo.dispose();
      cloudMat.dispose();
      if (cloudMat.map) cloudMat.map.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, [viewMode]); // re-run effect only when view changes

  if (viewMode === 'truck') {
    return (
      <>
        <button 
          onClick={() => setViewMode('text')}
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, padding: '10px 20px', cursor: 'pointer', background: '#e5c500', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          Show 3D Text
        </button>
        <Truck />
      </>
    );
  }

  if (viewMode === 'crane') {
    return (
      <>
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setViewMode('text')}
            style={{ padding: '10px 18px', cursor: 'pointer', background: '#e5c500', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          >
            ← Zurück zum 3D Text
          </button>
          <button 
            onClick={() => setViewMode('technocrane')}
            style={{ padding: '10px 18px', cursor: 'pointer', background: 'linear-gradient(135deg, #facc15, #eab308)', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 900, boxShadow: '0 4px 16px rgba(250, 204, 21, 0.45)' }}
          >
            🎬 Zu Technocrane VP & MoCo Studio
          </button>
        </div>
        <Crane onOpenTechnocraneStudio={() => setViewMode('technocrane')} />
      </>
    );
  }

  if (viewMode === 'cable') {
    return (
      <>
        <button 
          onClick={() => setViewMode('text')}
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, padding: '10px 20px', cursor: 'pointer', background: '#facc15', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
        >
          ← Zurück zum 3D Text
        </button>
        <SlopeCable />
      </>
    );
  }

  if (viewMode === 'tennis') {
    return (
      <>
        <button 
          onClick={() => setViewMode('text')}
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, padding: '10px 20px', cursor: 'pointer', background: '#38bdf8', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
        >
          ← Zurück zum 3D Text
        </button>
        <CraneTennis />
      </>
    );
  }

  if (viewMode === 'technocrane') {
    return (
      <>
        <button 
          onClick={() => setViewMode('text')}
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, padding: '10px 20px', cursor: 'pointer', background: '#facc15', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
        >
          ← Zurück zum 3D Text
        </button>
        <TechnocraneStudio />
      </>
    );
  }

  return (
    <div className="app-container">
      <div id="nebula-bg" ref={nebulaRef}></div>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => setViewMode('truck')}
          style={{ padding: '10px 18px', cursor: 'pointer', background: '#e5c500', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          Show LKW (MAN TGL)
        </button>
        <button 
          onClick={() => setViewMode('crane')}
          style={{ padding: '10px 18px', cursor: 'pointer', background: '#e5c500', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          Show Kran (Supertechno 50)
        </button>
        <button 
          onClick={() => setViewMode('technocrane')}
          style={{ padding: '10px 18px', cursor: 'pointer', background: 'linear-gradient(135deg, #facc15, #eab308)', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 900, boxShadow: '0 4px 16px rgba(250, 204, 21, 0.45)' }}
        >
          🎬 Technocrane VP & MoCo Studio
        </button>
        <button 
          onClick={() => setViewMode('cable')}
          style={{ padding: '10px 18px', cursor: 'pointer', background: '#facc15', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 16px rgba(250, 204, 21, 0.35)' }}
        >
          ⚡ Show Slope Schleppkabel
        </button>
        <button 
          onClick={() => setViewMode('tennis')}
          style={{ padding: '10px 18px', cursor: 'pointer', background: '#38bdf8', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 16px rgba(56, 189, 248, 0.35)' }}
        >
          🎾 Show Kran-Tennis Match (2 Kräne)
        </button>
      </div>
      
      <div id="crane-hud" ref={craneHudRef}>
        <div className="hud-container">
          <div className="hud-header">
            <h2>SUPERTECHNO 50</h2>
            <span className="hud-status">SYSTEM ONLINE</span>
          </div>
          <div className="hud-content">
            <img src="/assets/crane-hud.jpg" alt="Crane Blueprint" className="crane-blueprint" />
            <div className="hud-data-panel">
              <div className="data-row"><span>MAX LENS HEIGHT</span><span>50 FT / 15.24 M</span></div>
              <div className="data-row"><span>TELESCOPIC TRAVEL</span><span>37 FT / 11.3 M</span></div>
              <div className="data-row"><span>MAX PAYLOAD</span><span>65 LBS / 30 KG</span></div>
              <div className="data-row"><span>BASE PAN RATE</span><span>120° / SEC</span></div>
              <div className="data-row"><span>GYRO STABILIZED</span><span>ACTIVE</span></div>
              <div className="data-row"><span>POWER DRAW</span><span>48V DC</span></div>
            </div>
          </div>
        </div>
      </div>
      
      <div id="truck-hud" ref={truckHudRef}>
        <div className="hud-container">
          <div className="hud-header" style={{ borderColor: 'rgba(0, 136, 255, 0.3)' }}>
            <h2>MAN TGL 12.250</h2>
            <span className="hud-status" style={{ color: '#0088ff', background: 'rgba(0, 136, 255, 0.1)', borderColor: 'rgba(0, 136, 255, 0.2)' }}>DEPLOYED</span>
          </div>
          <div className="hud-content">
            <img src="/assets/truck-hud.jpg" alt="Truck Blueprint" className="crane-blueprint" style={{ filter: 'sepia(1) hue-rotate(200deg) saturate(3) brightness(0.9) contrast(1.2)' }} />
            <div className="hud-data-panel">
              <div className="data-row" style={{ borderLeftColor: 'rgba(0, 136, 255, 0.5)' }}><span>GROSS WEIGHT</span><span>11,990 KG</span></div>
              <div className="data-row" style={{ borderLeftColor: 'rgba(0, 136, 255, 0.5)' }}><span>ENGINE POWER</span><span>250 HP / 184 KW</span></div>
              <div className="data-row" style={{ borderLeftColor: 'rgba(0, 136, 255, 0.5)' }}><span>TORQUE</span><span>1050 NM</span></div>
              <div className="data-row" style={{ borderLeftColor: 'rgba(0, 136, 255, 0.5)' }}><span>WHEELBASE</span><span>4850 MM</span></div>
              <div className="data-row" style={{ borderLeftColor: 'rgba(0, 136, 255, 0.5)' }}><span>TRANSMISSION</span><span>TIPMATIC 12</span></div>
              <div className="data-row" style={{ borderLeftColor: 'rgba(0, 136, 255, 0.5)' }}><span>EMISSIONS</span><span>EURO 6D</span></div>
            </div>
          </div>
        </div>
      </div>
      <canvas id="antigravity-canvas" ref={canvasRef}></canvas>
    </div>
  );
}

export default App;
