import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface CraneTennisRacketHeadProps {
  kinematicsRef: React.MutableRefObject<{
    dollyTrack: number;
    columnElevation: number;
    basePan: number;
    boomTilt: number;
    teleExtension: number;
    headPan: number;
    headTilt: number;
    headRoll: number;
  }>;
  teamColor?: string;
  stringGlow?: string;
  autoLevel?: boolean;
  position?: [number, number, number];
  scale?: number;
  racketScale?: number;
  racketTargetRef?: React.RefObject<THREE.Group | null>;
}

/**
 * ============================================================================
 * 🎾 CRANE TENNIS RACKET HEAD (REALISTISCHE 1:1 ITF GRAND SLAM PRO SPECS)
 * Standardisierte Abmessungen nach offiziellem ITF / ATP Tour Reglement:
 * - Gesamtlänge: 68.58 cm (27.0 Zoll)
 * - Kopfgröße: ~98-100 sq in (Breite 26.0 cm, Höhe 34.0 cm)
 * - Griffumfang: L3 / 4 3/8" (8-Kant-Ergonomie mit Overgrip-Wicklung)
 * - Bespannungsmuster: 16 × 19 Pro-Stock mit echter 3D-Verwebung
 * - 3-Achsen Hochgeschwindigkeits-Servo-Gimbal auf Mitchell-Mount Basis
 * ============================================================================
 */
export function CraneTennisRacketHead({
  kinematicsRef,
  teamColor = '#38bdf8',
  stringGlow = '#bae6fd',
  autoLevel = true,
  position = [0, 0, 0],
  scale = 1.0,
  racketScale = 3.0,
  racketTargetRef
}: CraneTennisRacketHeadProps) {
  // Gelenk-Refs für frame-genaue 120 FPS Three.js Kinematik
  const levelPitchRef = useRef<THREE.Group>(null);
  const panRef = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);
  const rollWristRef = useRef<THREE.Group>(null);

  // --- MATERIALIEN & OBERFLÄCHEN ---
  const matBlackAnodized = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x16181d,
    metalness: 0.88,
    roughness: 0.22,
    envMapIntensity: 1.4
  }), []);

  const matDarkTitanium = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x22262e,
    metalness: 0.92,
    roughness: 0.18,
    envMapIntensity: 1.8
  }), []);

  const matChromeSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.96,
    roughness: 0.12,
    envMapIntensity: 2.0
  }), []);

  const matTeamCarbon = useMemo(() => new THREE.MeshStandardMaterial({
    color: teamColor,
    metalness: 0.82,
    roughness: 0.24,
    envMapIntensity: 1.6
  }), [teamColor]);

  const matGraphiteDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f1115,
    metalness: 0.55,
    roughness: 0.45
  }), []);

  const matStrings = useMemo(() => new THREE.MeshStandardMaterial({
    color: stringGlow,
    emissive: stringGlow,
    emissiveIntensity: 0.35,
    metalness: 0.55,
    roughness: 0.16,
    envMapIntensity: 1.8
  }), [stringGlow]);

  const matGrommetStrip = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.65,
    metalness: 0.25
  }), []);

  const matBumperGuard = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e2229,
    roughness: 0.75,
    metalness: 0.20
  }), []);

  const matDampener = useMemo(() => new THREE.MeshStandardMaterial({
    color: teamColor,
    roughness: 0.35,
    metalness: 0.15,
    envMapIntensity: 1.2
  }), [teamColor]);

  const matGripTape = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.92,
    metalness: 0.08
  }), []);

  const matRubberCollar = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.85,
    metalness: 0.10
  }), []);

  // --- REALISTISCHE TENNISSCHLÄGER-GEOMETRIE (ITF 27 ZOLL STANDARD) ---
  // Schlägerkopf: 98 sq in Kopfgröße (Breite 26.0 cm, Höhe 34.0 cm)
  const baseHeadRadiusX = 0.130; // 26 cm Außenbreite
  const baseHeadRadiusY = 0.170; // 34 cm Außenhöhe
  const baseFrameThickness = 0.0105; // 21 mm aerodynamisches Kasten-/Aero-Profil
  const headCenterY = 0.515; // Exakte Lage des Kopfzentrums (Sweet Spot) ab Griffkappe

  // Echte 3D-Ellipsenkurve für den Carbon-Schlägerkopfrahmen
  const headEllipticalCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segs = 64;
    for (let i = 0; i <= segs; i++) {
      const theta = (i / segs) * Math.PI * 2;
      const x = baseHeadRadiusX * Math.cos(theta);
      const y = baseHeadRadiusY * Math.sin(theta);
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  }, [baseHeadRadiusX, baseHeadRadiusY]);

  // Obere Bumper-Guard-Kurve (Schutzleiste für den oberen Rahmenkopf)
  const bumperCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segs = 32;
    // Bogen von PI*0.15 bis PI*0.85 (oberer Halbbogen)
    for (let i = 0; i <= segs; i++) {
      const theta = (Math.PI * 0.15) + (i / segs) * (Math.PI * 0.70);
      const x = (baseHeadRadiusX + 0.003) * Math.cos(theta);
      const y = (baseHeadRadiusY + 0.003) * Math.sin(theta);
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return new THREE.CatmullRomCurve3(pts, false);
  }, [baseHeadRadiusX, baseHeadRadiusY]);

  // 16 × 19 Pro-Stock Saitenmuster mit realistischer 3D-Webung
  const strings16x19Grid = useMemo(() => {
    const mains: Array<{ p1: [number, number, number]; p2: [number, number, number]; isCenter: boolean }> = [];
    const crosses: Array<{ p1: [number, number, number]; p2: [number, number, number]; zOffset: number }> = [];
    const grommetPoints: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [];

    const numMains = 16;
    const numCrosses = 19;

    // Innenkante des Rahmens (exakte Begrenzung des Saitenbetts)
    const innerRadiusX = baseHeadRadiusX - baseFrameThickness * 0.95;
    const innerRadiusY = baseHeadRadiusY - baseFrameThickness * 0.95;

    // 1. Längssaiten (16 Mains)
    for (let i = 1; i <= numMains; i++) {
      const u = ((i - 0.5) / numMains) * 2 - 1; // [-1, 1]
      const x = u * (innerRadiusX - 0.008);
      const halfH = innerRadiusY * Math.sqrt(Math.max(0, 1 - (x / innerRadiusX) ** 2));
      
      if (halfH > 0.025) {
        const isCenter = Math.abs(x) < 0.025;
        mains.push({
          p1: [x, -halfH, 0],
          p2: [x, halfH, 0],
          isCenter
        });

        // Ösen außen am Rahmen
        grommetPoints.push({ pos: [x, halfH + baseFrameThickness * 0.85, 0], rot: [0, 0, 0] });
        grommetPoints.push({ pos: [x, -halfH - baseFrameThickness * 0.85, 0], rot: [0, 0, 0] });
      }
    }

    // 2. Quersaiten (19 Crosses mit alternierendem 3D-Z-Versatz)
    for (let j = 1; j <= numCrosses; j++) {
      const v = ((j - 0.5) / numCrosses) * 2 - 1;
      const y = v * (innerRadiusY - 0.008);
      const halfW = innerRadiusX * Math.sqrt(Math.max(0, 1 - (y / innerRadiusY) ** 2));
      
      if (halfW > 0.025) {
        const zOffset = (j % 2 === 0 ? 0.0012 : -0.0012);
        crosses.push({
          p1: [-halfW, y, zOffset],
          p2: [halfW, y, zOffset],
          zOffset
        });

        // Ösen außen am Rahmen
        grommetPoints.push({ pos: [-halfW - baseFrameThickness * 0.85, y, 0], rot: [0, 0, Math.PI / 2] });
        grommetPoints.push({ pos: [halfW + baseFrameThickness * 0.85, y, 0], rot: [0, 0, Math.PI / 2] });
      }
    }

    return { mains, crosses, grommets: grommetPoints };
  }, [baseHeadRadiusX, baseHeadRadiusY, baseFrameThickness]);

  // --- ECHTZEIT-KINEMATIK-SYNCHRONISATION IN useFrame ---
  useFrame(() => {
    const kin = kinematicsRef.current;
    if (!kin) return;

    // 1. Gyro-AutoLeveling (Kompensation der Auslegerneigung)
    if (levelPitchRef.current) {
      const offset = autoLevel ? -THREE.MathUtils.degToRad(kin.boomTilt || 0) : 0;
      levelPitchRef.current.rotation.x = offset;
    }

    // 2. Pan-Achse (Ausschwung / Yaw-Schwenk)
    if (panRef.current) {
      panRef.current.rotation.y = THREE.MathUtils.degToRad((-kin.headPan || 0) + 180);
    }

    // 3. Tilt-Achse (Schlagwinkel / Pitch-Neigung für Smash, Laser & Lob)
    if (tiltRef.current) {
      tiltRef.current.rotation.x = THREE.MathUtils.degToRad(kin.headTilt || 0);
    }

    // 4. Roll- / Wrist-Achse (Handgelenk-Pronation & Spin-Engine)
    if (rollWristRef.current) {
      rollWristRef.current.rotation.z = THREE.MathUtils.degToRad(kin.headRoll || 0);
    }
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* ================================================================== */}
      {/* 1. TOP-MOUNTED MITCHELL BASE FLANGE (OBEN AUF DEM AUSLEGERKOPF)    */}
      {/* ================================================================== */}
      <group position={[0, 0.08, 0]}>
        {/* Mitchell Mount Base Flanschplatte */}
        <mesh castShadow receiveShadow material={matDarkTitanium}>
          <cylinderGeometry args={[0.075, 0.068, 0.024, 32]} />
        </mesh>
        <mesh castShadow material={matBlackAnodized} position={[0, 0.014, 0]}>
          <cylinderGeometry args={[0.060, 0.060, 0.010, 32]} />
        </mesh>

        {/* 3-Flügel Schlossmutter (Mitchell Castle Tie-Down Ring) */}
        <group position={[0, 0.024, 0]}>
          <mesh castShadow material={matChromeSteel}>
            <cylinderGeometry args={[0.016, 0.016, 0.018, 16]} />
          </mesh>
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, idx) => (
            <mesh
              key={`mitchell-wing-${idx}`}
              castShadow
              material={matBlackAnodized}
              position={[Math.sin(angle) * 0.030, 0, Math.cos(angle) * 0.030]}
              rotation={[0, angle, 0]}
            >
              <boxGeometry args={[0.026, 0.012, 0.009]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ================================================================== */}
      {/* 2. AUTO-HORIZON PITCH LEVELING STAGE (NACH OBEN GERICHTET)         */}
      {/* ================================================================== */}
      <group ref={levelPitchRef} position={[0, 0.12, 0]}>
        {/* Untere Schwenkbrücke (Lower Pan Mount Bridge) */}
        <mesh castShadow receiveShadow material={matDarkTitanium} position={[0, 0.012, 0]}>
          <boxGeometry args={[0.15, 0.024, 0.09]} />
        </mesh>

        {/* ================================================================ */}
        {/* 3. PAN-ACHSE (YAW-DREHUNG / 360° AUSSCHWUNG-MOTOR)                */}
        {/* ================================================================ */}
        <group ref={panRef} position={[0, 0.035, 0]}>
          {/* Pan-Servo-Motorzylinder */}
          <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0.022, 0]}>
            <cylinderGeometry args={[0.042, 0.042, 0.045, 32]} />
          </mesh>
          <mesh castShadow material={matTeamCarbon} position={[0, 0.022, 0]}>
            <ringGeometry args={[0.043, 0.047, 32]} />
          </mesh>

          {/* Doppelarmige Kohlefaser-Gabel (Steht aufrecht nach OBEN) */}
          <group position={[0, 0.045, 0]}>
            {/* Linker Gabelholm */}
            <mesh castShadow receiveShadow material={matDarkTitanium} position={[-0.082, 0.075, 0]}>
              <boxGeometry args={[0.024, 0.15, 0.042]} />
            </mesh>
            <mesh castShadow material={matTeamCarbon} position={[-0.095, 0.075, 0]}>
              <boxGeometry args={[0.003, 0.12, 0.030]} />
            </mesh>

            {/* Rechter Gabelholm */}
            <mesh castShadow receiveShadow material={matDarkTitanium} position={[0.082, 0.075, 0]}>
              <boxGeometry args={[0.024, 0.15, 0.042]} />
            </mesh>
            <mesh castShadow material={matTeamCarbon} position={[0.095, 0.075, 0]}>
              <boxGeometry args={[0.003, 0.12, 0.030]} />
            </mesh>

            {/* Tilt-Lageraugen am oberen Gabelende */}
            <mesh castShadow material={matChromeSteel} position={[-0.082, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.020, 0.020, 0.028, 24]} />
            </mesh>
            <mesh castShadow material={matChromeSteel} position={[0.082, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.020, 0.020, 0.028, 24]} />
            </mesh>

            {/* ============================================================== */}
            {/* 4. TILT-ACHSE (PITCH / SCHLAGWINKEL-MOTOR OBEN AUF DER GABEL)  */}
            {/* ============================================================== */}
            <group ref={tiltRef} position={[0, 0.14, 0]}>
              {/* Tilt-Zentraltraverse */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.026, 0.026, 0.16, 32]} />
              </mesh>

              {/* Handgelenks-Rotationsmodul (Nach oben ragender Actuator Pod) */}
              <mesh castShadow receiveShadow material={matDarkTitanium} position={[0, 0.035, 0]}>
                <cylinderGeometry args={[0.034, 0.038, 0.065, 32]} />
              </mesh>
              <mesh castShadow material={matTeamCarbon} position={[0, 0.035, 0]}>
                <torusGeometry args={[0.038, 0.0035, 12, 32]} />
              </mesh>

              {/* ============================================================ */}
              {/* 5. ROLL / WRIST-ACHSE (HANDGELENK-PRONATION & SPIN)         */}
              {/* ============================================================ */}
              <group ref={rollWristRef} position={[0, 0.07, 0]}>
                {/* Racket-Schaft-Spannfutter (Titan-Schnellwechselkupplung) */}
                <mesh castShadow receiveShadow material={matChromeSteel} position={[0, 0.016, 0]}>
                  <cylinderGeometry args={[0.022, 0.019, 0.036, 24]} />
                </mesh>
                <mesh castShadow material={matDarkTitanium} position={[0, 0.034, 0]}>
                  <cylinderGeometry args={[0.018, 0.022, 0.018, 24]} />
                </mesh>

                {/* ========================================================== */}
                {/* 6. HIGH-MODULUS CARBON TENNISSCHLÄGER (REAL 68.58 CM / 27") */}
                {/* ========================================================== */}
                <group position={[0, 0.035, 0.015]} scale={[racketScale, racketScale, racketScale]}>
                  {/* A. SCHLÄGER-ENDKAPPE (BUTT CAP MIT 8-KANT-PROFIL & FASE) */}
                  <mesh castShadow material={matTeamCarbon} position={[0, 0.009, 0]}>
                    <cylinderGeometry args={[0.0175, 0.0195, 0.018, 8]} />
                  </mesh>
                  <mesh castShadow material={matGraphiteDark} position={[0, 0.001, 0]}>
                    <cylinderGeometry args={[0.015, 0.015, 0.003, 16]} />
                  </mesh>

                  {/* B. ERGONOMISCHER 8-KANT-GRIFF MIT OVERGRIP-WICKLUNG (17.4 CM) */}
                  <mesh castShadow material={matGripTape} position={[0, 0.105, 0]}>
                    <cylinderGeometry args={[0.0155, 0.0165, 0.174, 8]} />
                  </mesh>
                  {/* Overgrip-Wicklungsrillen (Feine Rillen für fotorealistische Haptik) */}
                  {[0.04, 0.07, 0.10, 0.13, 0.16].map((yOffset, idx) => (
                    <mesh key={`grip-wrap-${idx}`} material={matGraphiteDark} position={[0, yOffset, 0]}>
                      <torusGeometry args={[0.0162, 0.0006, 8, 16]} />
                    </mesh>
                  ))}

                  {/* C. GRIFF-ABSCHLUSSBAND / RUBBER FINISHING COLLAR */}
                  <mesh castShadow material={matRubberCollar} position={[0, 0.197, 0]}>
                    <cylinderGeometry args={[0.0165, 0.0165, 0.010, 16]} />
                  </mesh>

                  {/* D. SCHAFT (AERODYNAMISCHER CARBON-SCHAFTÜBERGANG) */}
                  <mesh castShadow material={matTeamCarbon} position={[0, 0.215, 0]}>
                    <cylinderGeometry args={[0.0125, 0.0145, 0.026, 12]} />
                  </mesh>

                  {/* E. SCHLÄGER-HERZ (V-STRUTS THROAT MIT INNENKANAL) */}
                  {/* Linker Holm */}
                  <mesh castShadow material={matTeamCarbon} position={[-0.030, 0.285, 0]} rotation={[0, 0, 0.26]}>
                    <cylinderGeometry args={[0.0075, 0.0090, 0.125, 12]} />
                  </mesh>
                  {/* Rechter Holm */}
                  <mesh castShadow material={matTeamCarbon} position={[0.030, 0.285, 0]} rotation={[0, 0, -0.26]}>
                    <cylinderGeometry args={[0.0075, 0.0090, 0.125, 12]} />
                  </mesh>
                  {/* Horizontale Herzbrücke (Throat Crossbar Bridge bei Y = 0.345 m) */}
                  <mesh castShadow material={matGraphiteDark} position={[0, 0.345, 0]}>
                    <boxGeometry args={[0.082, 0.014, 0.022]} />
                  </mesh>

                  {/* F. SCHLÄGERKOPF-HAUPTRAHMEN (ECHTE 3D-CARBON-ELLIPSE BEI Y = 0.515 M) */}
                  {/* Äußerer Carbon-Hauptrahmen */}
                  <mesh castShadow receiveShadow material={matTeamCarbon} position={[0, headCenterY, 0]}>
                    <tubeGeometry args={[headEllipticalCurve, 64, baseFrameThickness, 16, true]} />
                  </mesh>
                  {/* Innerer Graphit-Kern & Zierstreifen */}
                  <mesh castShadow material={matGraphiteDark} position={[0, headCenterY, 0]}>
                    <tubeGeometry args={[headEllipticalCurve, 64, baseFrameThickness * 0.55, 8, true]} />
                  </mesh>

                  {/* G. BUMPER GUARD (SCHUTZLEISTE AM OBEREN KOPF-POL) */}
                  <mesh castShadow material={matBumperGuard} position={[0, headCenterY, 0]}>
                    <tubeGeometry args={[bumperCurve, 32, baseFrameThickness * 1.08, 8, false]} />
                  </mesh>

                  {/* H. RAHMEN-ÖSENBAND & GROMMETS */}
                  {strings16x19Grid.grommets.map((g, idx) => (
                    <mesh
                      key={`grommet-${idx}`}
                      material={matGrommetStrip}
                      position={[g.pos[0], headCenterY + g.pos[1], g.pos[2]]}
                      rotation={g.rot}
                    >
                      <cylinderGeometry args={[0.0028, 0.0028, 0.004, 6]} />
                    </mesh>
                  ))}

                  {/* I. SWEET SPOT & RACKET-CAM TARGET (EXAKT AM KOPFZENTRUM BEI Y = 0.515 M) */}
                  <group ref={racketTargetRef} position={[0, headCenterY, 0]}>
                    {/* 1. Längssaiten (16 Mains) */}
                    {strings16x19Grid.mains.map((m, idx) => {
                      const len = m.p2[1] - m.p1[1];
                      return (
                        <mesh
                          key={`main-str-${idx}`}
                          material={matStrings}
                          position={[m.p1[0], 0, 0]}
                        >
                          <cylinderGeometry args={[0.00065, 0.00065, len, 4]} />
                        </mesh>
                      );
                    })}

                    {/* 2. Quersaiten (19 Crosses mit alternierendem 3D-Webungs-Z-Versatz) */}
                    {strings16x19Grid.crosses.map((c, idx) => {
                      const len = c.p2[0] - c.p1[0];
                      return (
                        <mesh
                          key={`cross-str-${idx}`}
                          material={matStrings}
                          position={[0, c.p1[1], c.zOffset]}
                          rotation={[0, 0, Math.PI / 2]}
                        >
                          <cylinderGeometry args={[0.00065, 0.00065, len, 4]} />
                        </mesh>
                      );
                    })}

                    {/* 3. Pro-Tour Silikon-Vibrationsdämpfer (Vibration Dampener am Saitenbettfuß) */}
                    <group position={[0, -baseHeadRadiusY * 0.75, 0]}>
                      <mesh castShadow material={matDampener} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.014, 0.014, 0.008, 16]} />
                      </mesh>
                      <mesh material={matBlackAnodized} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.007, 0.007, 0.009, 16]} />
                      </mesh>
                    </group>

                    {/* 4. Kinetischer Sweet-Spot-Treffpunkt & Stencil-Zentrum */}
                    <mesh material={matStrings} position={[0, 0.01, 0]}>
                      <ringGeometry args={[0.028, 0.034, 24]} />
                    </mesh>
                    <pointLight color={stringGlow} intensity={1.2} distance={0.9} />
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export default CraneTennisRacketHead;
