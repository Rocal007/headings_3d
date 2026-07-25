import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';

import { Supertechno50FBXModel } from '../model/Supertechno50FBXModel';

// --- INNER R3F SCENE COMPONENT ---
function CraneScene({ 
  kinematicsRef, 
  sliderRefs 
}: { 
  kinematicsRef: React.MutableRefObject<any>,
  sliderRefs: Record<string, React.RefObject<HTMLInputElement | null>>
}) {
  const [crane, setCrane] = useState<Supertechno50FBXModel | null>(null);
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const model = new Supertechno50FBXModel(() => {
      setCrane(model);
    });
    return () => {
      model.dispose();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = 5.0 * delta;
    const kin = kinematicsRef.current;
    const k = keys.current;

    // Keyboard Logic
    if (k['w']) kin.teleExtension += speed * 2;
    if (k['s']) kin.teleExtension -= speed * 2;
    if (k['q']) kin.boomTilt += speed * 10;
    if (k['e']) kin.boomTilt -= speed * 10;
    if (k['a']) kin.dollyTrack -= speed;
    if (k['d']) kin.dollyTrack += speed;
    if (k['r']) kin.columnLift += speed;
    if (k['f']) kin.columnLift -= speed;
    if (k['arrowleft'] && !k['shift']) kin.headPan -= speed * 15;
    if (k['arrowright'] && !k['shift']) kin.headPan += speed * 15;
    if (k['arrowup']) kin.headTilt += speed * 15;
    if (k['arrowdown']) kin.headTilt -= speed * 15;
    if (k['z']) kin.headRoll -= speed * 15;
    if (k['x']) kin.headRoll += speed * 15;
    if (k['arrowleft'] && k['shift']) kin.basePan += speed * 10;
    if (k['arrowright'] && k['shift']) kin.basePan -= speed * 10;

    // Clamp values
    kin.teleExtension = Math.max(0, Math.min(11.4, kin.teleExtension));
    kin.boomTilt = Math.max(-57, Math.min(60, kin.boomTilt));
    kin.columnLift = Math.max(0, Math.min(1.54, kin.columnLift));
    kin.headPan = Math.max(-1080, Math.min(1080, kin.headPan));
    kin.headTilt = Math.max(-1080, Math.min(1080, kin.headTilt));
    kin.headRoll = Math.max(-1080, Math.min(1080, kin.headRoll));

    // Sync UI Sliders
    if (sliderRefs.basePan.current) sliderRefs.basePan.current.value = kin.basePan.toString();
    if (sliderRefs.boomTilt.current) sliderRefs.boomTilt.current.value = kin.boomTilt.toString();
    if (sliderRefs.teleExtension.current) sliderRefs.teleExtension.current.value = kin.teleExtension.toString();
    if (sliderRefs.dollyTrack.current) sliderRefs.dollyTrack.current.value = kin.dollyTrack.toString();
    if (sliderRefs.headPan.current) sliderRefs.headPan.current.value = kin.headPan.toString();
    if (sliderRefs.headTilt.current) sliderRefs.headTilt.current.value = kin.headTilt.toString();
    if (sliderRefs.headRoll.current) sliderRefs.headRoll.current.value = kin.headRoll.toString();

    // Update Model Kinematics
    if (crane && crane.isLoaded) {
      crane.updateNodes(kin);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 15]} intensity={1.5} castShadow />
      
      {/* Studio Environment for Photorealistic Reflections */}
      <Environment preset="studio" />
      
      {/* Floor Grid */}
      <Grid infiniteGrid fadeDistance={50} sectionColor="#444444" cellColor="#222222" />
      
      {/* 3D Model Injection */}
      {crane && <primitive object={crane.group} />}
      
      {/* Camera Controls */}
      <OrbitControls target={[0, 2, 0]} enableDamping dampingFactor={0.05} />
    </>
  );
}

// --- MAIN CRANE COMPONENT ---
export default function Crane() {
  const basePanRef = useRef<HTMLInputElement>(null);
  const boomTiltRef = useRef<HTMLInputElement>(null);
  const teleExtensionRef = useRef<HTMLInputElement>(null);
  const dollyTrackRef = useRef<HTMLInputElement>(null);
  const headPanRef = useRef<HTMLInputElement>(null);
  const headTiltRef = useRef<HTMLInputElement>(null);
  const headRollRef = useRef<HTMLInputElement>(null);

  const sliderRefs = {
    basePan: basePanRef,
    boomTilt: boomTiltRef,
    teleExtension: teleExtensionRef,
    dollyTrack: dollyTrackRef,
    headPan: headPanRef,
    headTilt: headTiltRef,
    headRoll: headRollRef
  };

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

  const handleSliderChange = (key: keyof typeof kinematicsRef.current, value: number) => {
    kinematicsRef.current[key] = value;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
      {/* React Three Fiber Canvas */}
      <Canvas 
        shadows 
        camera={{ position: [15, 10, 20], fov: 45 }}
        style={{ width: '100%', height: '100%', outline: 'none', touchAction: 'none' }}
      >
        <color attach="background" args={['#1a1a1a']} />
        <CraneScene kinematicsRef={kinematicsRef} sliderRefs={sliderRefs} />
      </Canvas>
      
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
          🎛️ 2D Kran Dashboard (R3F)
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
