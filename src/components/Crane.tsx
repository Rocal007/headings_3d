import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';

export default function Crane() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const basePanRef = useRef<HTMLInputElement>(null);
  const boomTiltRef = useRef<HTMLInputElement>(null);
  const teleExtensionRef = useRef<HTMLInputElement>(null);
  const dollyTrackRef = useRef<HTMLInputElement>(null);
  const headPanRef = useRef<HTMLInputElement>(null);
  const headTiltRef = useRef<HTMLInputElement>(null);
  const headRollRef = useRef<HTMLInputElement>(null);

  const kinematicsRef = useRef({
    dollyTrack: 0,
    columnLift: 0,
    basePan: 0,
    boomTilt: 0,
    teleExtension: 0,
    headPan: 0,
    headTilt: 0,
    headRoll: 0,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(15, 10, 20);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2, 0);

    const grid = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    scene.add(grid);

    const crane = new Supertechno50FBXModel();
    scene.add(crane.group);

    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId: number;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const speed = 5.0 * dt;
      const kin = kinematicsRef.current;

      if (keys['w']) kin.teleExtension += speed * 2;
      if (keys['s']) kin.teleExtension -= speed * 2;
      
      if (keys['q']) kin.boomTilt += speed * 10;
      if (keys['e']) kin.boomTilt -= speed * 10;
      
      if (keys['a']) kin.dollyTrack -= speed;
      if (keys['d']) kin.dollyTrack += speed;

      if (keys['r']) kin.columnLift += speed;
      if (keys['f']) kin.columnLift -= speed;

      if (keys['arrowleft'] && !keys['shift']) kin.headPan -= speed * 15;
      if (keys['arrowright'] && !keys['shift']) kin.headPan += speed * 15;
      if (keys['arrowup']) kin.headTilt += speed * 15;
      if (keys['arrowdown']) kin.headTilt -= speed * 15;

      if (keys['z']) kin.headRoll -= speed * 15;
      if (keys['x']) kin.headRoll += speed * 15;

      if (keys['arrowleft'] && keys['shift']) kin.basePan += speed * 10;
      if (keys['arrowright'] && keys['shift']) kin.basePan -= speed * 10;

      // Clamp values
      kin.teleExtension = Math.max(0, Math.min(11.4, kin.teleExtension));
      kin.boomTilt = Math.max(-57, Math.min(60, kin.boomTilt));
      kin.columnLift = Math.max(0, Math.min(1.54, kin.columnLift));
      kin.headPan = Math.max(-1080, Math.min(1080, kin.headPan));
      kin.headTilt = Math.max(-1080, Math.min(1080, kin.headTilt));
      kin.headRoll = Math.max(-1080, Math.min(1080, kin.headRoll));

      // Sync the DOM slider values with the internal kinematics
      if (basePanRef.current) basePanRef.current.value = kin.basePan.toString();
      if (boomTiltRef.current) boomTiltRef.current.value = kin.boomTilt.toString();
      if (teleExtensionRef.current) teleExtensionRef.current.value = kin.teleExtension.toString();
      if (dollyTrackRef.current) dollyTrackRef.current.value = kin.dollyTrack.toString();
      if (headPanRef.current) headPanRef.current.value = kin.headPan.toString();
      if (headTiltRef.current) headTiltRef.current.value = kin.headTilt.toString();
      if (headRollRef.current) headRollRef.current.value = kin.headRoll.toString();

      crane.updateNodes(kin);
      controls.update();
      renderer.render(scene, camera);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      pmremGenerator.dispose();
    };
  }, []);

  const handleSliderChange = (key: keyof typeof kinematicsRef.current, value: number) => {
    kinematicsRef.current[key] = value;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none', touchAction: 'none' }} />
      
      {/* 2D DASHBOARD UI */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '30px',
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#fff',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'sans-serif',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        width: '280px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>
          🎛️ 2D Kran Dashboard
        </h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#ffd700', marginBottom: '5px' }}>Base Pan (°)</label>
          <input type="range" ref={basePanRef} min="-180" max="180" step="0.1" defaultValue="0" 
            onChange={(e) => handleSliderChange('basePan', parseFloat(e.target.value))} 
            style={{ width: '100%' }} />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#ffd700', marginBottom: '5px' }}>Boom Tilt (°)</label>
          <input type="range" ref={boomTiltRef} min="-57" max="60" step="0.1" defaultValue="0" 
            onChange={(e) => handleSliderChange('boomTilt', parseFloat(e.target.value))} 
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#ffd700', marginBottom: '5px' }}>Telescope (m)</label>
          <input type="range" ref={teleExtensionRef} min="0" max="11.4" step="0.1" defaultValue="0" 
            onChange={(e) => handleSliderChange('teleExtension', parseFloat(e.target.value))} 
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#ffd700', marginBottom: '5px' }}>Dolly Track (m)</label>
          <input type="range" ref={dollyTrackRef} min="-20" max="20" step="0.1" defaultValue="0" 
            onChange={(e) => handleSliderChange('dollyTrack', parseFloat(e.target.value))} 
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#ff5500', marginBottom: '5px' }}>Head Pan (°)</label>
          <input type="range" ref={headPanRef} min="-1080" max="1080" step="1" defaultValue="0" 
            onChange={(e) => handleSliderChange('headPan', parseFloat(e.target.value))} 
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#ff5500', marginBottom: '5px' }}>Head Tilt (°)</label>
          <input type="range" ref={headTiltRef} min="-1080" max="1080" step="1" defaultValue="0" 
            onChange={(e) => handleSliderChange('headTilt', parseFloat(e.target.value))} 
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#ff5500', marginBottom: '5px' }}>Head Roll (°)</label>
          <input type="range" ref={headRollRef} min="-1080" max="1080" step="1" defaultValue="0" 
            onChange={(e) => handleSliderChange('headRoll', parseFloat(e.target.value))} 
            style={{ width: '100%' }} />
        </div>
      </div>
      
      {/* Keyboard Controls Legend UI */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'sans-serif',
        backdropFilter: 'blur(5px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        pointerEvents: 'none'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>
          ⌨️ KONTROLLEN (Supertechno 50)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '13px' }}>
          <strong style={{ color: '#ffd700' }}>W / S</strong> <span>Teleskop Aus/Einfahren</span>
          <strong style={{ color: '#ffd700' }}>Q / E</strong> <span>Arm Neigung (Tilt)</span>
          <strong style={{ color: '#ffd700' }}>A / D</strong> <span>Dolly Fahrt (Track)</span>
          <strong style={{ color: '#ffd700' }}>R / F</strong> <span>Säule Heben/Senken</span>
          <strong style={{ color: '#ffd700' }}>Pfeiltasten</strong> <span>Kamerakopf Pan / Tilt</span>
          <strong style={{ color: '#ffd700' }}>Z / X</strong> <span>Kamerakopf Roll</span>
          <strong style={{ color: '#ffd700' }}>Shift+Pfeil L/R</strong> <span>Kran Basis Pan</span>
        </div>
      </div>
    </div>
  );
}
