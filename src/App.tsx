import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import './App.css';
import Truck from './components/Truck';
import Crane from './components/Crane';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<'text' | 'truck' | 'crane'>('text');

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
        currentRotY: 0
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
      targetExplodeProgress += event.deltaY * 0.0015;
      targetExplodeProgress = Math.max(0, Math.min(1, targetExplodeProgress));
    };

    let touchStartY = 0;
    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0].clientY;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touchY = event.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      targetExplodeProgress += deltaY * 0.003;
      targetExplodeProgress = Math.max(0, Math.min(1, targetExplodeProgress));
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

      // Smooth dampening for the explosion progress
      currentExplodeProgress += (targetExplodeProgress - currentExplodeProgress) * 0.1;

      // Apply effects to cubes
      wordCubes.forEach((cube, index) => {
        // Base floating effect (only fully active when not exploded)
        const floatY = cube.userData.baseY + Math.sin(time * 1.5 + index * 0.2) * 0.6 * (1 - currentExplodeProgress);
        
        // Base idle rotation
        cube.userData.currentRotX += 0.003 * (1 - currentExplodeProgress);
        cube.userData.currentRotY += 0.006 * (1 - currentExplodeProgress);

        // Interpolate Position
        const targetX = cube.userData.baseX + cube.userData.explodeDir.x * currentExplodeProgress;
        const targetY = floatY + cube.userData.explodeDir.y * currentExplodeProgress;
        const targetZ = cube.userData.baseZ + cube.userData.explodeDir.z * currentExplodeProgress;
        cube.position.set(targetX, targetY, targetZ);

        // Interpolate Rotation
        const rotX = cube.userData.currentRotX + cube.userData.explodeRot.x * currentExplodeProgress;
        const rotY = cube.userData.currentRotY + cube.userData.explodeRot.y * currentExplodeProgress;
        const rotZ = cube.userData.explodeRot.z * currentExplodeProgress;
        cube.rotation.set(rotX, rotY, rotZ);
      });

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
        <button 
          onClick={() => setViewMode('text')}
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, padding: '10px 20px', cursor: 'pointer', background: '#e5c500', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          Show 3D Text
        </button>
        <Crane />
      </>
    );
  }

  return (
    <div className="app-container">
      <button 
        onClick={() => setViewMode('truck')}
        style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, padding: '10px 20px', cursor: 'pointer', background: '#e5c500', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
      >
        Show LKW (MAN TGL)
      </button>
      <button 
        onClick={() => setViewMode('crane')}
        style={{ position: 'absolute', top: 20, left: 230, zIndex: 100, padding: '10px 20px', cursor: 'pointer', background: '#e5c500', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
      >
        Show Kran (Supertechno 50)
      </button>
      <canvas id="antigravity-canvas" ref={canvasRef}></canvas>
    </div>
  );
}

export default App;
