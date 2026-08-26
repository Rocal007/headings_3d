import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createManTglTruckRig } from '../model/manTglTruckRig';
import { TruckSignalController, type BlinkerMode } from '../utils/truckSignalController';

export type TruckStudioCameraId = 'orbit' | 'cockpit' | 'hero' | 'tailgate' | 'side';

export interface TruckStudioCameraPreset {
  id: TruckStudioCameraId;
  name: string;
  icon: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export const TRUCK_STUDIO_CAMERAS: Record<TruckStudioCameraId, TruckStudioCameraPreset> = {
  orbit: {
    id: 'orbit',
    name: '360° Studio Orbit (Frei)',
    icon: '🌟',
    position: new THREE.Vector3(14, 5.58, 14),
    target: new THREE.Vector3(0, 1.88, 0),
    fov: 45,
  },
  hero: {
    id: 'hero',
    name: 'Front 3/4 Hero Shot',
    icon: '👑',
    position: new THREE.Vector3(6.5, 2.48, 8.5),
    target: new THREE.Vector3(0, 1.88, 3.5),
    fov: 38,
  },
  cockpit: {
    id: 'cockpit',
    name: 'Fahrerkabine & Cockpit',
    icon: '💺',
    position: new THREE.Vector3(0.55, 2.58, 2.95),
    target: new THREE.Vector3(0.55, 2.28, 4.2),
    fov: 65,
  },
  tailgate: {
    id: 'tailgate',
    name: 'Heck & Ladebordwand',
    icon: '📦',
    position: new THREE.Vector3(0, 2.88, -8.8),
    target: new THREE.Vector3(0, 1.58, -3.5),
    fov: 42,
  },
  side: {
    id: 'side',
    name: 'Seitenprofil (5550mm Radstand)',
    icon: '🪟',
    position: new THREE.Vector3(15, 2.28, 0),
    target: new THREE.Vector3(0, 1.88, 0),
    fov: 35,
  },
};

export default function Truck(_props: { onOpenRace?: () => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [doorsOpen, setDoorsOpen] = useState(false);
  const [tailgateOpen, setTailgateOpen] = useState(false);
  const [platformLowered, setPlatformLowered] = useState(false);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [wipersActive, setWipersActive] = useState(false);
  const [blinkerMode, setBlinkerMode] = useState<BlinkerMode>('off');
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeCam, setActiveCam] = useState<TruckStudioCameraId>('orbit');

  const doorsRef = useRef(false);
  const tailgateRef = useRef(false);
  const platformLoweredRef = useRef(false);
  const headlightsRef = useRef(true);
  const wipersRef = useRef(false);
  const blinkerModeRef = useRef<BlinkerMode>('off');
  const signalControllerRef = useRef(new TruckSignalController('off'));
  const autoRotateRef = useRef(false);
  const activeCamRef = useRef<TruckStudioCameraId>('orbit');

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0e14');

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.2, 1000);
    camera.position.set(14, 5.5, 14);

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
    renderer.toneMappingExposure = 1.15;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.88, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Nicht unter den Boden blicken
    controls.minDistance = 2.0;
    controls.maxDistance = 45.0;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // 🌟 Showroom Studio Floor: Luxuriöser Drehteller mit konzentrischen Ringen & Kontaktschatten
    const studioFloorGroup = new THREE.Group();
    
    // Haupt-Bodenplatte
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#1a1f26',
      roughness: 0.55,
      metalness: 0.35,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    studioFloorGroup.add(floorMesh);

    // Drehteller-Plattform (Turntable Platform Ø 18m)
    const turntableGeo = new THREE.CylinderGeometry(9.0, 9.2, 0.08, 64);
    const turntableMat = new THREE.MeshStandardMaterial({
      color: '#161c24',
      roughness: 0.36,
      metalness: 0.65,
    });
    const turntableMesh = new THREE.Mesh(turntableGeo, turntableMat);
    turntableMesh.position.y = 0.04;
    turntableMesh.receiveShadow = true;
    studioFloorGroup.add(turntableMesh);

    // Gebürsteter Aluminium-Außenring am Drehteller
    const ringGeo = new THREE.RingGeometry(8.95, 9.15, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#00dcff',
      emissive: '#00dcff',
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.082;
    studioFloorGroup.add(ringMesh);

    // Subtile konzentrische Linien & Studio Grid
    const innerRingGeo = new THREE.RingGeometry(4.5, 4.54, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: '#2a3b4c', side: THREE.DoubleSide });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.rotation.x = -Math.PI / 2;
    innerRingMesh.position.y = 0.082;
    studioFloorGroup.add(innerRingMesh);

    scene.add(studioFloorGroup);

    // 💡 17:00 Uhr Nachmittags-Beleuchtung (Golden Hour & lange dramatische Schatten)
    const ambientLight = new THREE.AmbientLight(0x9cb8d9, 0.58);
    scene.add(ambientLight);

    // 17:00 Uhr tiefstehende Nachmittagssonne (Winkel ~16°, wirft weite Schatten)
    const sun5pmLight = new THREE.DirectionalLight(0xffe0b2, 3.4);
    sun5pmLight.position.set(28, 9.5, 22);
    sun5pmLight.castShadow = true;
    sun5pmLight.shadow.mapSize.width = 4096;
    sun5pmLight.shadow.mapSize.height = 4096;
    sun5pmLight.shadow.bias = -0.00015;
    sun5pmLight.shadow.radius = 2.4; // Sanfte Penumbra-Weichheit
    sun5pmLight.shadow.camera.left = -28;
    sun5pmLight.shadow.camera.right = 28;
    sun5pmLight.shadow.camera.top = 28;
    sun5pmLight.shadow.camera.bottom = -28;
    sun5pmLight.shadow.camera.near = 1.0;
    sun5pmLight.shadow.camera.far = 140.0;
    scene.add(sun5pmLight);

    // Kühleres Himmels-Aufhelllicht (Gegenüberliegendes Himmelsblau)
    const skyFillLight = new THREE.DirectionalLight(0x82a9d1, 1.2);
    skyFillLight.position.set(-24, 16, -18);
    scene.add(skyFillLight);

    // Goldener Streiflicht-Akzent (Warmes Gegenlicht auf Lackkanten & Kofferprofil)
    const goldenRimLight = new THREE.DirectionalLight(0xffcc80, 1.5);
    goldenRimLight.position.set(-16, 8, 26);
    scene.add(goldenRimLight);

    // Spotlights für Scheinwerfer-Glow & Bodenakzente
    const floorSpot = new THREE.SpotLight(0x00dcff, 2.8, 32, Math.PI / 4, 0.45);
    floorSpot.position.set(0, 18, 0);
    floorSpot.target.position.set(0, 0, 0);
    scene.add(floorSpot, floorSpot.target);

    // =========================================================================
    // 🚚 VOLLSTÄNDIGER MAN TGL 12.250 3D LKW MIT ALLEN SUBAGENTEN-TEILEN
    // =========================================================================
    const truckRig = createManTglTruckRig();
    truckRig.truck.position.y = 0.08; // Exakte Höhe der Drehteller-Plattform (bündiger Stand)
    scene.add(truckRig.truck);

    // =========================================================================
    // 🔄 RENDER-LOOP MIT SMOOTH KINEMATIK
    // =========================================================================
    let animationId: number;
    let flapProgress = 0;
    let lowerProgress = 0;
    const clock = new THREE.Clock();

    const handleResize = () => {
      if (!canvasRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // 1. Auto-Rotate Drehteller
      if (autoRotateRef.current) {
        truckRig.truck.rotation.y += 0.25 * delta;
      }

      // 2. Fahrertüren Kinematik (68° Öffnungswinkel nach AUSSEN)
      const targetDoorAngle = doorsRef.current ? 1.18 : 0.0;
      truckRig.leftDoorGroup.rotation.y = THREE.MathUtils.lerp(truckRig.leftDoorGroup.rotation.y, -targetDoorAngle, 1 - Math.exp(-6.0 * delta));
      truckRig.rightDoorGroup.rotation.y = THREE.MathUtils.lerp(truckRig.rightDoorGroup.rotation.y, targetDoorAngle, 1 - Math.exp(-6.0 * delta));

      // 3. Dautel Cargolift Ladebordwand 3-Phasen Kinematik
      const targetFlap = (tailgateRef.current || platformLoweredRef.current) ? 1.0 : 0.0;
      flapProgress = THREE.MathUtils.lerp(flapProgress, targetFlap, 1 - Math.exp(-4.5 * delta));
      truckRig.topFlapGroup.rotation.x = -flapProgress * (Math.PI * 0.48); // Obere Klappe öffnet sich nach oben
      truckRig.platformTiltGroup.rotation.x = -flapProgress * (Math.PI * 0.5); // Plattform klappt waagerecht ab

      // Absenken darf erst erfolgen wenn Plattform überwiegend abgeklappt ist (> 0.5)
      const targetLower = (platformLoweredRef.current && flapProgress > 0.5) ? 1.0 : 0.0;
      lowerProgress = THREE.MathUtils.lerp(lowerProgress, targetLower, 1 - Math.exp(-3.5 * delta));

      // Plattform-Position in Y und Z (Bogenbahn der Parallelogrammarme)
      const platY = THREE.MathUtils.lerp(truckRig.loadEdgeHeight, 0.06, lowerProgress);
      const platZ = THREE.MathUtils.lerp(truckRig.kofferBackZ, truckRig.kofferBackZ - 0.16, lowerProgress);
      truckRig.tailLiftAssembly.position.y = platY;
      truckRig.tailLiftAssembly.position.z = platZ;

      // Mechanische Hubschwingen & Zwillingszylinder schwenken synchron mit
      const traverseY = 0.45;
      const traverseZ = truckRig.kofferBackZ + 0.25;
      const dy = platY - traverseY;
      const dz = traverseZ - platZ;
      const armAngle = Math.atan2(dy, dz);

      truckRig.liftArmLGroup.rotation.x = armAngle;
      truckRig.liftArmRGroup.rotation.x = armAngle;

      // Plattformspitze neigt sich als Auffahrrampe zum Boden wenn unten (> 0.75)
      const tipTiltT = THREE.MathUtils.clamp((lowerProgress - 0.75) / 0.25, 0, 1);
      truckRig.platformTipGroup.rotation.x = -tipTiltT * 0.065;

      // 3. Fahrtrichtungsanzeiger, Warnblinkanlage & Ladebordwand-Sicherheitsblinker (Subagent 22.15)
      signalControllerRef.current.setMode(blinkerModeRef.current);
      signalControllerRef.current.updateRig(
        truckRig,
        elapsedTime,
        flapProgress > 0.05 || lowerProgress > 0.05
      );

      // 4. Scheinwerfer & Beleuchtung (Volle Illumination)
      const isLights = headlightsRef.current;
      truckRig.biLedLensMat.emissiveIntensity = isLights ? 4.5 : 0.0;
      truckRig.headlightLensMat.emissiveIntensity = isLights ? 2.8 : 0.0;
      truckRig.drlMat.emissiveIntensity = isLights ? 3.5 : 0.4;
      truckRig.fogLampMat.emissiveIntensity = isLights ? 2.5 : 0.0;
      truckRig.roofMarkerMat.emissiveIntensity = isLights ? 2.8 : 0.0;
      truckRig.leftSpot.intensity = isLights ? 42 : 0.0;
      truckRig.rightSpot.intensity = isLights ? 42 : 0.0;
      truckRig.headlightFlareL.intensity = isLights ? 4.5 : 0.0;
      truckRig.headlightFlareR.intensity = isLights ? 4.5 : 0.0;

      // 5. Scheibenwischer Kinematik
      if (wipersRef.current) {
        const wiperSweep = (Math.sin(elapsedTime * 8.0) * 0.5 + 0.5) * 1.35;
        truckRig.wipers.forEach(w => {
          w.rotation.z = -0.35 + wiperSweep;
        });
      } else {
        truckRig.wipers.forEach(w => {
          w.rotation.z = THREE.MathUtils.lerp(w.rotation.z, -0.35, 1 - Math.exp(-6.0 * delta));
        });
      }

      // 6. Kamera-Fokus bei Preset-Umschaltung
      const activePreset = TRUCK_STUDIO_CAMERAS[activeCamRef.current];
      if (activeCamRef.current !== 'orbit') {
        const camDamp = 1 - Math.exp(-5.0 * delta);
        camera.position.lerp(activePreset.position, camDamp);
        controls.target.lerp(activePreset.target, camDamp);
        if (Math.abs(camera.fov - activePreset.fov) > 0.2) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, activePreset.fov, camDamp);
          camera.updateProjectionMatrix();
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      pmremGenerator.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 10, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none' }} />



      {/* 📡 Studio Showroom Info & Specs Card (Rechts Oben) */}
      <div style={{
        position: 'absolute', top: 20, right: 20, width: 300,
        background: 'rgba(13, 17, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 220, 255, 0.25)',
        borderRadius: 12,
        padding: '16px',
        color: '#ffffff',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        pointerEvents: 'auto',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,220,255,0.2)', paddingBottom: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🚚</span>
            <span style={{ fontWeight: 800, color: '#00dcff', fontSize: 12, letterSpacing: 0.8 }}>MAN TGL SHOWROOM</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(0, 220, 255, 0.15)', color: '#00dcff', border: '1px solid rgba(0, 220, 255, 0.3)' }}>
            STUDIO 3D
          </span>
        </div>

        {/* Specs Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: '#cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>MODELL:</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>MAN TGL 12.250 4x2 BL</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>MOTOR:</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>D0836 • 6-Zyl. Bi-Turbo</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>LEISTUNG:</span>
            <span style={{ fontWeight: 700, color: '#ffd700' }}>250 PS / 184 kW • 1050 Nm</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>RADSTAND:</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>5.550 mm</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>KOFFERAUFBAU:</span>
            <span style={{ fontWeight: 700, color: '#00dcff' }}>8.050 × 2.470 × 2.580 mm</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8899aa' }}>PAYLOAD:</span>
            <span style={{ fontWeight: 700, color: '#2ecc71' }}>Supertechno 50 Flightcase-Kran</span>
          </div>
        </div>

        {/* 📷 Kamera-Perspektiven Dropdown */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#8899aa', fontSize: 8.5, fontWeight: 700, marginBottom: 5 }}>📷 KAMERA-PERSPEKTIVE:</div>
          <select
            value={activeCam}
            onChange={(e) => {
              const camId = e.target.value as TruckStudioCameraId;
              setActiveCam(camId);
              activeCamRef.current = camId;
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(0, 220, 255, 0.3)',
              background: 'rgba(10, 15, 25, 0.95)',
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {(Object.keys(TRUCK_STUDIO_CAMERAS) as TruckStudioCameraId[]).map((camKey) => {
              const preset = TRUCK_STUDIO_CAMERAS[camKey];
              return (
                <option key={camKey} value={camKey} style={{ background: '#0b0f19', color: '#ffffff' }}>
                  {preset.icon} {preset.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* 🎮 Showroom Interaktive Steuerungsleiste (Unten Mitte) */}
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'auto',
        background: 'rgba(10, 15, 25, 0.85)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        zIndex: 50
      }}>
        <button
          onClick={() => {
            const next = !doorsOpen;
            setDoorsOpen(next);
            doorsRef.current = next;
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: doorsOpen ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
            background: doorsOpen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.06)',
            color: doorsOpen ? '#38bdf8' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          🚪 {doorsOpen ? 'Türen Schließen' : 'Türen Öffnen'}
        </button>

        <button
          onClick={() => {
            if (!tailgateOpen) {
              setTailgateOpen(true);
              tailgateRef.current = true;
            } else if (!platformLowered) {
              setPlatformLowered(true);
              platformLoweredRef.current = true;
            } else {
              setPlatformLowered(false);
              platformLoweredRef.current = false;
              setTailgateOpen(false);
              tailgateRef.current = false;
            }
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: tailgateOpen ? '1px solid #2ecc71' : '1px solid rgba(255,255,255,0.15)',
            background: tailgateOpen ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255,255,255,0.06)',
            color: tailgateOpen ? '#2ecc71' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          📦 {!tailgateOpen ? 'Ladebordwand Öffnen' : !platformLowered ? 'Plattform Absenken' : 'Ladebordwand Schließen'}
        </button>

        <button
          onClick={() => {
            const next = !headlightsOn;
            setHeadlightsOn(next);
            headlightsRef.current = next;
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: headlightsOn ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.15)',
            background: headlightsOn ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255,255,255,0.06)',
            color: headlightsOn ? '#ffd700' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          💡 {headlightsOn ? 'Licht: AN' : 'Licht: AUS'}
        </button>

        {/* 🚨 Subagent 22.15: Blinker & Warnblinker Kontrollleiste */}
        <div style={{
          display: 'flex', gap: 4, background: 'rgba(0, 0, 0, 0.45)', padding: '2px 4px',
          borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.35)', alignItems: 'center'
        }}>
          <button
            title="Blinker Links einschalten"
            onClick={() => {
              const next: BlinkerMode = blinkerMode === 'left' ? 'off' : 'left';
              setBlinkerMode(next);
              blinkerModeRef.current = next;
            }}
            style={{
              padding: '7px 10px', borderRadius: 6,
              border: blinkerMode === 'left' ? '1px solid #f59e0b' : '1px solid transparent',
              background: blinkerMode === 'left' ? 'rgba(245, 158, 11, 0.35)' : 'transparent',
              color: blinkerMode === 'left' ? '#fbbf24' : '#94a3b8',
              fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 11.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ⬅️ L
          </button>

          <button
            title="Warnblinkanlage (alle 4 Ecken + Heck) aktivieren"
            onClick={() => {
              const next: BlinkerMode = blinkerMode === 'hazard' ? 'off' : 'hazard';
              setBlinkerMode(next);
              blinkerModeRef.current = next;
            }}
            style={{
              padding: '7px 12px', borderRadius: 6,
              border: blinkerMode === 'hazard' ? '1px solid #ef4444' : '1px solid transparent',
              background: blinkerMode === 'hazard' ? 'rgba(239, 68, 68, 0.35)' : 'transparent',
              color: blinkerMode === 'hazard' ? '#fca5a5' : '#e2e8f0',
              fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 11.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ⚠️ Warnblinker
          </button>

          <button
            title="Blinker Rechts einschalten"
            onClick={() => {
              const next: BlinkerMode = blinkerMode === 'right' ? 'off' : 'right';
              setBlinkerMode(next);
              blinkerModeRef.current = next;
            }}
            style={{
              padding: '7px 10px', borderRadius: 6,
              border: blinkerMode === 'right' ? '1px solid #f59e0b' : '1px solid transparent',
              background: blinkerMode === 'right' ? 'rgba(245, 158, 11, 0.35)' : 'transparent',
              color: blinkerMode === 'right' ? '#fbbf24' : '#94a3b8',
              fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 11.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            R ➡️
          </button>
        </div>

        <button
          onClick={() => {
            const next = !wipersActive;
            setWipersActive(next);
            wipersRef.current = next;
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: wipersActive ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.15)',
            background: wipersActive ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.06)',
            color: wipersActive ? '#c084fc' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          🌧️ {wipersActive ? 'Wischer: AN' : 'Wischer: AUS'}
        </button>

        <button
          onClick={() => {
            const next = !autoRotate;
            setAutoRotate(next);
            autoRotateRef.current = next;
          }}
          style={{
            padding: '9px 14px', borderRadius: 8,
            border: autoRotate ? '1px solid #00dcff' : '1px solid rgba(255,255,255,0.15)',
            background: autoRotate ? 'rgba(0, 220, 255, 0.25)' : 'rgba(255,255,255,0.06)',
            color: autoRotate ? '#00dcff' : '#ffffff',
            fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          🔄 {autoRotate ? 'Drehteller: AN' : 'Drehteller: AUS'}
        </button>
      </div>
    </div>
  );
}
