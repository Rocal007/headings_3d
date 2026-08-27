import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { saveModelToCache, loadModelFromCache } from '../utils/modelCache';
import { autoRigGlbModel, type GlbAutoRig } from '../model/glbAutoRigger';

export type JeepCameraPresetId = 'orbit' | 'hero' | 'cockpit' | 'engine' | 'gear' | 'side';

export interface JeepCameraPreset {
  id: JeepCameraPresetId;
  name: string;
  icon: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export const JEEP_CAMERAS: Record<JeepCameraPresetId, JeepCameraPreset> = {
  orbit: {
    id: 'orbit',
    name: '360° Studio Orbit',
    icon: '🌟',
    position: new THREE.Vector3(5.4, 2.2, 5.4),
    target: new THREE.Vector3(0, 0.85, 0),
    fov: 45,
  },
  hero: {
    id: 'hero',
    name: 'Front 3/4 Hero Shot',
    icon: '👑',
    position: new THREE.Vector3(3.2, 1.5, 3.8),
    target: new THREE.Vector3(0, 0.80, 0.8),
    fov: 38,
  },
  cockpit: {
    id: 'cockpit',
    name: 'Cockpit & Dashboard',
    icon: '💺',
    position: new THREE.Vector3(0.38, 1.55, -0.65),
    target: new THREE.Vector3(0.35, 1.05, 0.45),
    fov: 62,
  },
  engine: {
    id: 'engine',
    name: 'Motor & Haube',
    icon: '🔧',
    position: new THREE.Vector3(1.8, 1.7, 2.0),
    target: new THREE.Vector3(0, 0.85, 1.0),
    fov: 42,
  },
  gear: {
    id: 'gear',
    name: 'Heck & Reserverad',
    icon: '🛞',
    position: new THREE.Vector3(2.0, 1.3, -2.2),
    target: new THREE.Vector3(0.2, 0.80, -0.8),
    fov: 45,
  },
  side: {
    id: 'side',
    name: 'Seitenprofil & Radstand',
    icon: '📐',
    position: new THREE.Vector3(6.4, 1.2, 0),
    target: new THREE.Vector3(0, 0.85, 0),
    fov: 36,
  },
};

export type JeepEnvironmentMode = 'dark_studio' | 'normandy_bocage' | 'sahara_desert';

const CACHE_KEY = 'willys_jeep_custom_model';

function computeMeshBoundingBox(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  let hasValidMesh = false;

  root.updateMatrixWorld(true);
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
      const mesh = child as THREE.Mesh;
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }
      if (mesh.geometry.boundingBox) {
        const meshBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        if (!isNaN(meshBox.min.x) && isFinite(meshBox.min.x)) {
          box.union(meshBox);
          hasValidMesh = true;
        }
      }
    }
  });

  if (!hasValidMesh) {
    box.setFromObject(root);
  }
  return box;
}

export default function Jeep() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadedFileName, setLoadedFileName] = useState<string | null>('2007_jeep_wrangler_rubicon.glb');
  const [modelRealLength, setModelRealLength] = useState<number>(4.22);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interaktive Kinematik-Zustände
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [hoodOpen, setHoodOpen] = useState(false);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [steeringAngle, setSteeringAngle] = useState(0);
  const [envMode, setEnvMode] = useState<JeepEnvironmentMode>('dark_studio');
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeCam, setActiveCam] = useState<JeepCameraPresetId>('orbit');
  const [isDriving, setIsDriving] = useState(false);
  const [driveSpeed, setDriveSpeed] = useState(35);

  // Synchronisations-Refs für 60fps Render-Loop
  const doorsRef = useRef(false);
  const hoodRef = useRef(false);
  const headlightsRef = useRef(true);
  const steeringRef = useRef(0);
  const autoRotateRef = useRef(false);
  const activeCamRef = useRef<JeepCameraPresetId>('orbit');
  const isDrivingRef = useRef(false);
  const driveSpeedRef = useRef(35);

  const customRigRef = useRef<GlbAutoRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const customGlbWrapperRef = useRef<THREE.Group>(new THREE.Group());
  const rawGlbSceneRef = useRef<THREE.Group | null>(null);

  useEffect(() => { doorsRef.current = doorsOpen; }, [doorsOpen]);
  useEffect(() => { hoodRef.current = hoodOpen; }, [hoodOpen]);
  useEffect(() => { headlightsRef.current = headlightsOn; }, [headlightsOn]);
  useEffect(() => { steeringRef.current = steeringAngle; }, [steeringAngle]);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { activeCamRef.current = activeCam; }, [activeCam]);
  useEffect(() => { isDrivingRef.current = isDriving; }, [isDriving]);
  useEffect(() => { driveSpeedRef.current = driveSpeed; }, [driveSpeed]);

  const applyModelTransform = useCallback((rawScene: THREE.Group) => {
    rawScene.position.set(0, 0, 0);
    rawScene.rotation.set(0, 0, 0);
    rawScene.scale.set(1, 1, 1);
    rawScene.updateMatrixWorld(true);

    const bbox = computeMeshBoundingBox(rawScene);
    const size = bbox.getSize(new THREE.Vector3());

    const longestAxis = Math.max(size.x, size.z, 0.001);
    const targetLengthMeters = 4.22;
    const baseScale = targetLengthMeters / longestAxis;

    rawScene.scale.setScalar(baseScale);
    rawScene.updateMatrixWorld(true);

    const scaledBbox = computeMeshBoundingBox(rawScene);
    const scaledCenter = scaledBbox.getCenter(new THREE.Vector3());

    rawScene.position.x = -scaledCenter.x;
    rawScene.position.z = -scaledCenter.z;
    rawScene.position.y = -scaledBbox.min.y;

    const finalBbox = computeMeshBoundingBox(rawScene);
    const finalSize = finalBbox.getSize(new THREE.Vector3());
    setModelRealLength(Math.max(finalSize.x, finalSize.z));
  }, []);

  const mountParsedGlbScene = useCallback((loadedScene: THREE.Group, fileName: string) => {
    rawGlbSceneRef.current = loadedScene;

    if (customRigRef.current) {
      customRigRef.current.lightsGroup.clear();
      customRigRef.current = null;
    }

    while (customGlbWrapperRef.current.children.length > 0) {
      customGlbWrapperRef.current.remove(customGlbWrapperRef.current.children[0]);
    }
    customGlbWrapperRef.current.add(loadedScene);

    applyModelTransform(loadedScene);
    const autoRig = autoRigGlbModel(loadedScene);
    customRigRef.current = autoRig;

    setLoadedFileName(fileName);
  }, [applyModelTransform]);

  useEffect(() => {
    let isCancelled = false;
    async function initModel() {
      try {
        const cached = await loadModelFromCache(CACHE_KEY);
        if (cached && !isCancelled) {
          const loader = new GLTFLoader();
          loader.parse(
            cached.data,
            '',
            (gltf) => {
              if (!isCancelled) {
                mountParsedGlbScene(gltf.scene, cached.fileName);
              }
            },
            (err) => console.warn('Cache parse error:', err)
          );
        }
      } catch (err) {
        console.warn('Cache check failed:', err);
      }
    }
    initModel();
    return () => { isCancelled = true; };
  }, [mountParsedGlbScene]);

  const processAndSaveArrayBuffer = async (buffer: ArrayBuffer, fileName: string) => {
    try {
      await saveModelToCache(CACHE_KEY, buffer, fileName);
    } catch (err) {
      console.warn('Could not save to IndexedDB:', err);
    }

    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      '',
      (gltf) => {
        mountParsedGlbScene(gltf.scene, fileName);
        setToastMessage(`✅ ${fileName} geladen & gesichert!`);
        setTimeout(() => setToastMessage(null), 4500);
      },
      (error) => {
        console.error('GLTF Parse Error:', error);
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await processAndSaveArrayBuffer(buffer, file.name);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
      const buffer = await file.arrayBuffer();
      await processAndSaveArrayBuffer(buffer, file.name);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    if (envMode === 'sahara_desert') {
      scene.background = new THREE.Color('#2e2518');
      scene.fog = new THREE.FogExp2('#3d301f', 0.025);
    } else if (envMode === 'normandy_bocage') {
      scene.background = new THREE.Color('#162217');
      scene.fog = new THREE.FogExp2('#1c2a1e', 0.022);
    } else {
      scene.background = new THREE.Color('#0c1015');
      scene.fog = new THREE.FogExp2('#0c1015', 0.03);
    }

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5.4, 2.2, 5.4);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.minDistance = 1.0;
    controls.maxDistance = 35;
    controls.target.set(0, 0.85, 0);

    // Beleuchtung
    const ambientLight = new THREE.AmbientLight(
      envMode === 'sahara_desert' ? '#ffd8a8' : envMode === 'normandy_bocage' ? '#d3f9d8' : '#e0e7ff',
      0.95
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      envMode === 'sahara_desert' ? '#fff3bf' : '#ffffff',
      2.8
    );
    sunLight.position.set(10, 14, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight('#74c0fc', 0.8);
    fillLight.position.set(-8, 6, -6);
    scene.add(fillLight);

    // Boden & Grid
    let groundColor = '#141820';
    let groundRoughness = 0.85;
    if (envMode === 'sahara_desert') {
      groundColor = '#a88350';
      groundRoughness = 0.95;
    } else if (envMode === 'normandy_bocage') {
      groundColor = '#2b3a24';
      groundRoughness = 0.90;
    }

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80, 32, 32),
      new THREE.MeshStandardMaterial({ color: groundColor, roughness: groundRoughness, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    if (envMode === 'dark_studio') {
      const grid = new THREE.GridHelper(24, 24, '#4a5568', '#1f2937');
      grid.position.y = 0.002;
      scene.add(grid);
    }

    scene.add(customGlbWrapperRef.current);

    let currentDoorAngle = 0;
    let currentHoodAngle = 0;
    let wheelRotation = 0;

    let animFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // 1. Türen
      const targetDoorAngle = doorsRef.current ? THREE.MathUtils.degToRad(55) : 0;
      currentDoorAngle += (targetDoorAngle - currentDoorAngle) * 6 * delta;

      if (customRigRef.current?.doorLPivot) {
        customRigRef.current.doorLPivot.rotation.y = currentDoorAngle;
      }
      if (customRigRef.current?.doorRPivot) {
        customRigRef.current.doorRPivot.rotation.y = -currentDoorAngle;
      }

      // 2. Haube
      const targetHoodAngle = hoodRef.current ? -Math.PI / 2.6 : 0;
      currentHoodAngle += (targetHoodAngle - currentHoodAngle) * 5 * delta;

      if (customRigRef.current?.hoodPivot) {
        customRigRef.current.hoodPivot.rotation.x = currentHoodAngle * 0.72;
      }

      // 3. Lenkung
      const steerRad = THREE.MathUtils.degToRad(steeringRef.current);
      const innerFactor = steerRad > 0 ? 1.08 : 0.92;
      const outerFactor = steerRad > 0 ? 0.92 : 1.08;

      if (customRigRef.current) {
        customRigRef.current.steerPivots.forEach((p, idx) => {
          p.rotation.y = steerRad * (idx % 2 === 0 ? innerFactor : outerFactor);
        });
        if (customRigRef.current.steeringWheel) {
          customRigRef.current.steeringWheel.rotation.z = -steerRad * 3.2;
        }
      }

      // 4. Fahrantrieb & 100% Drehende Räder
      if (isDrivingRef.current) {
        const speedMps = (driveSpeedRef.current * 1000) / 3600;
        const wheelCircumference = 2 * Math.PI * 0.41;
        const rotDelta = (speedMps / wheelCircumference) * (Math.PI * 2) * delta;
        wheelRotation += rotDelta;

        if (customRigRef.current) {
          customRigRef.current.allWheels.forEach((w) => {
            w.rotation.x = wheelRotation;
          });
        }

        const shake = Math.sin(clock.getElapsedTime() * 24) * 0.003;
        customGlbWrapperRef.current.position.y = shake;
      } else {
        customGlbWrapperRef.current.position.y = 0;
      }

      // 5. Scheinwerfer
      const hlOn = headlightsRef.current;
      if (customRigRef.current) {
        customRigRef.current.headlights.forEach((l) => { l.intensity = hlOn ? 5.5 : 0; });
        customRigRef.current.headlightFlares.forEach((f) => { f.intensity = hlOn ? 2.0 : 0; });
        customRigRef.current.emissiveMaterials.forEach((m) => { m.emissiveIntensity = hlOn ? 1.5 : 0.05; });
      }

      // 6. Auto-Rotate & Kamera
      if (autoRotateRef.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.2;
      } else {
        controls.autoRotate = false;
      }

      const activeCamId = activeCamRef.current;
      const preset = JEEP_CAMERAS[activeCamId];
      if (preset && activeCamId !== 'orbit') {
        camera.position.lerp(preset.position, 4 * delta);
        controls.target.lerp(preset.target, 4 * delta);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      pmremGenerator.dispose();
      roomEnv.dispose();
    };
  }, [envMode]);

  const selectCamera = (id: JeepCameraPresetId) => {
    setActiveCam(id);
    setAutoRotate(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(196, 166, 117, 0.25)',
            backdropFilter: 'blur(8px)',
            border: '4px dashed #c4a675',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            pointerEvents: 'none',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <span style={{ fontSize: 48, marginBottom: 12 }}>📦</span>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Jeep Wrangler .GLB Datei hier ablegen!</div>
        </div>
      )}

      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(16, 185, 129, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 12,
            padding: '10px 20px',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.45)',
            zIndex: 2000,
            pointerEvents: 'none',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* 1. Header & Typenschild */}
      <div
        style={{
          position: 'absolute',
          top: 74,
          left: 20,
          background: 'rgba(11, 16, 24, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 14,
          padding: '12px 18px',
          color: '#f8fafc',
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          fontFamily: '"Inter", system-ui, sans-serif',
          pointerEvents: 'auto',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🚙</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.04em', color: '#c4a675' }}>
                JEEP WRANGLER RUBICON (2007)
              </div>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid #38bdf855',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                📦 HIGH-POLY .GLB
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              3.8L V6 / 2.8L CRD • Rock-Trac 4WD • Dana 44 Achsen • Länge: {modelRealLength.toFixed(2)} m
            </div>
          </div>
        </div>
      </div>

      {/* 2. Kamera-Presets & GLB-Import Button */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 20,
          display: 'flex',
          gap: 6,
          background: 'rgba(11, 16, 24, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 12,
          padding: 6,
          zIndex: 100,
        }}
      >
        {Object.values(JEEP_CAMERAS).map((cam) => {
          const isActive = activeCam === cam.id;
          return (
            <button
              key={cam.id}
              onClick={() => selectCamera(cam.id)}
              title={cam.name}
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #c4a675 0%, #8c6d3d 100%)'
                  : 'rgba(255, 255, 255, 0.06)',
                color: isActive ? '#000000' : '#e2e8f0',
                border: 'none',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.2s',
              }}
            >
              <span>{cam.icon}</span>
              <span style={{ display: window.innerWidth > 900 ? 'inline' : 'none' }}>{cam.name}</span>
            </button>
          );
        })}

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
          }}
          title="GLB Datei neu laden"
        >
          <span>📂</span>
          <span>GLB Datei</span>
        </button>
      </div>

      {/* 3. Steuer-Panel & Kinematik-Drawer */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(11, 16, 24, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 16,
          padding: '16px 20px',
          width: 340,
          color: '#f8fafc',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          fontFamily: '"Inter", system-ui, sans-serif',
          zIndex: 100,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: '#c4a675', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          ⚙️ 3D Fahrzeug & Kinematik
        </div>

        {/* 1. Türen & Haube Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setDoorsOpen(!doorsOpen)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: doorsOpen ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🚪 {doorsOpen ? 'Türen zu' : 'Türen öffnen'}
          </button>

          <button
            onClick={() => setHoodOpen(!hoodOpen)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: hoodOpen ? '#eab308' : 'rgba(255, 255, 255, 0.08)',
              color: hoodOpen ? '#000000' : '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🔧 {hoodOpen ? 'Haube zu' : 'Haube öffnen'}
          </button>
        </div>

        {/* 2. Scheinwerfer & Lichter */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setHeadlightsOn(!headlightsOn)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: headlightsOn ? '#22c55e' : 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            💡 {headlightsOn ? 'Scheinwerfer An' : 'Scheinwerfer Aus'}
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: autoRotate ? '#8b5cf6' : 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🔄 {autoRotate ? 'Orbit Stopp' : '360° Drehen'}
          </button>
        </div>

        {/* 3. Lenkwinkel-Slider */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#cbd5e1' }}>
            <span>🛞 Lenkwinkel (Vorderräder & Lenkrad)</span>
            <span style={{ fontWeight: 700, color: '#c4a675' }}>{steeringAngle > 0 ? `+${steeringAngle}°` : `${steeringAngle}°`}</span>
          </div>
          <input
            type="range"
            min="-32"
            max="32"
            value={steeringAngle}
            onChange={(e) => setSteeringAngle(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#c4a675' }}
          />
        </div>

        {/* 4. Fahrantrieb & 100% Drehende Räder */}
        <div style={{ marginBottom: 12, padding: '8px 10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>🚙 Allrad-Antrieb (4x4)</span>
            <button
              onClick={() => setIsDriving(!isDriving)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                background: isDriving ? '#ef4444' : '#10b981',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isDriving ? '⏹️ Stopp' : '▶️ Fahren (Räder drehen)'}
            </button>
          </div>
          {isDriving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Tempo:</span>
              <input
                type="range"
                min="10"
                max="85"
                value={driveSpeed}
                onChange={(e) => setDriveSpeed(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer', accentColor: '#10b981' }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#c4a675', minWidth: 42 }}>{driveSpeed} km/h</span>
            </div>
          )}
        </div>

        {/* 5. Umgebungs-Wähler */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: '#cbd5e1' }}>🌍 3D-Gelände</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <button
              onClick={() => setEnvMode('dark_studio')}
              style={{
                padding: '6px 4px',
                borderRadius: 6,
                border: envMode === 'dark_studio' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🏢 Studio
            </button>
            <button
              onClick={() => setEnvMode('normandy_bocage')}
              style={{
                padding: '6px 4px',
                borderRadius: 6,
                border: envMode === 'normandy_bocage' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                background: '#14532d',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🌿 Normandie
            </button>
            <button
              onClick={() => setEnvMode('sahara_desert')}
              style={{
                padding: '6px 4px',
                borderRadius: 6,
                border: envMode === 'sahara_desert' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                background: '#78350f',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🏜️ Sahara
            </button>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* 4. Telemetrie-HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'rgba(11, 16, 24, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 14,
          padding: '12px 18px',
          color: '#f8fafc',
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          fontFamily: '"Courier New", monospace',
          fontSize: 11,
          lineHeight: 1.6,
          zIndex: 100,
        }}
      >
        <div style={{ color: '#c4a675', fontWeight: 900, marginBottom: 4 }}>
          [ JEEP WRANGLER RUBICON GLB TELEMETRY ]
        </div>
        <div>DRIVE: {isDriving ? '🟢 4x4 ALL-WHEEL DRIVE (ACTIVE ROTATION)' : '⚪ STATIONARY'}</div>
        <div>TEMPO: {isDriving ? `${driveSpeed} KM/H` : '0.0 KM/H'}</div>
        <div>STEERING: {steeringAngle > 0 ? `+${steeringAngle}° R` : steeringAngle < 0 ? `${steeringAngle}° L` : '0° CTR'}</div>
        <div>DOORS: {doorsOpen ? 'OPEN (+55°)' : 'CLOSED (LATCHED)'}</div>
        <div>HOOD: {hoodOpen ? 'OPEN (EXPOSED)' : 'LATCHED'}</div>
        <div>HEADLIGHTS: {headlightsOn ? 'ON (ACTIVE 3D BEAMS)' : 'OFF'}</div>
        <div>MODEL: {loadedFileName || '2007_jeep_wrangler_rubicon.glb'} • {modelRealLength.toFixed(2)} M</div>
      </div>
    </div>
  );
}
