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
 * 🎾 CRANE TENNIS RACKET HEAD (DEDIZIERTER TENNIS-SCHLÄGER-GIMBAL-HEAD)
 * 3-Achsen Hochgeschwindigkeits-Servo-Aktuator mit integriertem Carbon-Racket,
 * Handgelenks-Pronations-/Supinations-Antrieb, Sweet-Spot-Sensorik und
 * Mitchell-Mount-Auslegerkopplung für den Supertechno 50.
 * ============================================================================
 */
export function CraneTennisRacketHead({
  kinematicsRef,
  teamColor = '#38bdf8',
  stringGlow = '#bae6fd',
  autoLevel = true,
  position = [0, 0, 0],
  scale = 1.0,
  racketScale = 1.9,
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
    emissiveIntensity: 0.85,
    metalness: 0.2,
    roughness: 0.2
  }), [stringGlow]);

  const matGripTape = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.92,
    metalness: 0.08
  }), []);

  // --- TENNISSCHLÄGER-SAITENBESPANNUNG (SWEET SPOT GRID) ---
  const baseHeadRadiusX = 0.22;
  const baseHeadRadiusY = 0.32;
  const baseFrameThickness = 0.018;

  const stringsGrid = useMemo(() => {
    const lines: Array<{ p1: [number, number, number]; p2: [number, number, number] }> = [];
    const countV = 10;
    const countH = 14;

    for (let i = 1; i < countV; i++) {
      const u = (i / countV) * 2 - 1;
      const x = u * (baseHeadRadiusX - 0.02);
      const halfH = baseHeadRadiusY * Math.sqrt(Math.max(0, 1 - (x / baseHeadRadiusX) ** 2));
      if (halfH > 0.03) {
        lines.push({ p1: [x, -halfH, 0], p2: [x, halfH, 0] });
      }
    }

    for (let j = 1; j < countH; j++) {
      const v = (j / countH) * 2 - 1;
      const y = v * (baseHeadRadiusY - 0.02);
      const halfW = baseHeadRadiusX * Math.sqrt(Math.max(0, 1 - (y / baseHeadRadiusY) ** 2));
      if (halfW > 0.03) {
        lines.push({ p1: [-halfW, y, 0], p2: [halfW, y, 0] });
      }
    }

    return lines;
  }, [baseHeadRadiusX, baseHeadRadiusY]);

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
      {/* 1. MITCHELL MOUNT FLANGE & GYRO LEVELING BASE                     */}
      {/* ================================================================== */}
      <group position={[0, 0.02, 0]}>
        {/* Mitchell Mount Base Flansch */}
        <mesh castShadow receiveShadow material={matDarkTitanium}>
          <cylinderGeometry args={[0.095, 0.105, 0.040, 32]} />
        </mesh>
        <mesh castShadow material={matBlackAnodized} position={[0, -0.025, 0]}>
          <cylinderGeometry args={[0.082, 0.082, 0.016, 32]} />
        </mesh>

        {/* 3-Flügel Schlossmutter (Mitchell Castle Tie-Down Ring) */}
        <group position={[0, 0.032, 0]}>
          <mesh castShadow material={matChromeSteel}>
            <cylinderGeometry args={[0.022, 0.022, 0.028, 16]} />
          </mesh>
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, idx) => (
            <mesh
              key={`mitchell-wing-${idx}`}
              castShadow
              material={matBlackAnodized}
              position={[Math.sin(angle) * 0.045, 0, Math.cos(angle) * 0.045]}
              rotation={[0, angle, 0]}
            >
              <boxGeometry args={[0.038, 0.018, 0.014]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ================================================================== */}
      {/* 2. AUTO-HORIZON PITCH LEVELING STAGE                              */}
      {/* ================================================================== */}
      <group ref={levelPitchRef} position={[0, -0.08, 0]}>
        {/* Obere Schwenkgabel (Upper Pan Mount Bridge) */}
        <mesh castShadow receiveShadow material={matDarkTitanium} position={[0, 0.01, 0]}>
          <boxGeometry args={[0.22, 0.038, 0.14]} />
        </mesh>

        {/* ================================================================ */}
        {/* 3. PAN-ACHSE (YAW-DREHUNG / AUSSCHWUNG-MOTOR)                     */}
        {/* ================================================================ */}
        <group ref={panRef} position={[0, -0.07, 0]}>
          {/* Pan-Servo-Motorzylinder mit Kühllamellen */}
          <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.070, 32]} />
          </mesh>
          <mesh castShadow material={matTeamCarbon} position={[0, 0.04, 0]}>
            <ringGeometry args={[0.066, 0.072, 32]} />
          </mesh>

          {/* Doppelarmige Kohlefaser-Gabel (Dual Carbon Yoke Arms) */}
          <group position={[0, -0.04, 0]}>
            {/* Linker Gabelholm */}
            <mesh castShadow receiveShadow material={matDarkTitanium} position={[-0.14, -0.08, 0]}>
              <boxGeometry args={[0.036, 0.22, 0.060]} />
            </mesh>
            <mesh castShadow material={matTeamCarbon} position={[-0.158, -0.08, 0]}>
              <boxGeometry args={[0.004, 0.18, 0.044]} />
            </mesh>

            {/* Rechter Gabelholm */}
            <mesh castShadow receiveShadow material={matDarkTitanium} position={[0.14, -0.08, 0]}>
              <boxGeometry args={[0.036, 0.22, 0.060]} />
            </mesh>
            <mesh castShadow material={matTeamCarbon} position={[0.158, -0.08, 0]}>
              <boxGeometry args={[0.004, 0.18, 0.044]} />
            </mesh>

            {/* Tilt-Lageraugen (Links & Rechts) */}
            <mesh castShadow material={matChromeSteel} position={[-0.14, -0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.028, 0.028, 0.042, 24]} />
            </mesh>
            <mesh castShadow material={matChromeSteel} position={[0.14, -0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.028, 0.028, 0.042, 24]} />
            </mesh>

            {/* ============================================================== */}
            {/* 4. TILT-ACHSE (PITCH / SCHLAGWINKEL-MOTOR)                     */}
            {/* ============================================================== */}
            <group ref={tiltRef} position={[0, -0.16, 0]}>
              {/* Tilt-Zentraltraverse */}
              <mesh castShadow receiveShadow material={matBlackAnodized} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.042, 0.042, 0.24, 32]} />
              </mesh>

              {/* Handgelenks-Rotationsmodul (Wrist Roll Actuator Pod) */}
              <mesh castShadow receiveShadow material={matDarkTitanium} position={[0, -0.04, 0]}>
                <cylinderGeometry args={[0.052, 0.048, 0.085, 32]} />
              </mesh>
              <mesh castShadow material={matTeamCarbon} position={[0, -0.04, 0]}>
                <torusGeometry args={[0.053, 0.005, 12, 32]} />
              </mesh>

              {/* ============================================================ */}
              {/* 5. ROLL / WRIST-ACHSE (HANDGELENK-PRONATION & SPIN)         */}
              {/* ============================================================ */}
              <group ref={rollWristRef} position={[0, -0.08, 0]}>
                {/* Racket-Schaft-Spannfutter (Titan-Kupplung) */}
                <mesh castShadow receiveShadow material={matChromeSteel} position={[0, -0.02, 0]}>
                  <cylinderGeometry args={[0.024, 0.028, 0.045, 24]} />
                </mesh>
                <mesh castShadow material={matDarkTitanium} position={[0, -0.045, 0]}>
                  <cylinderGeometry args={[0.030, 0.024, 0.025, 24]} />
                </mesh>

                {/* ========================================================== */}
                {/* 6. HIGH-MODULUS CARBON-GRAPHITE TENNISSCHLÄGER (SKALIERT)  */}
                {/* ========================================================== */}
                <group position={[0, -0.06, 0.04]} scale={[racketScale, racketScale, racketScale]}>
                  {/* Schläger-Griffbasis & Griffband (Grip Tape) */}
                  <mesh castShadow material={matTeamCarbon} position={[0, -0.16, 0]}>
                    <cylinderGeometry args={[0.028, 0.024, 0.03, 8]} />
                  </mesh>
                  <mesh castShadow material={matGripTape} position={[0, -0.07, 0]}>
                    <cylinderGeometry args={[0.022, 0.020, 0.16, 12]} />
                  </mesh>
                  <mesh castShadow material={matTeamCarbon} position={[0, 0.04, 0]}>
                    <cylinderGeometry args={[0.018, 0.018, 0.16, 12]} />
                  </mesh>

                  {/* Schläger-Herz (Racket Throat V-Struts) */}
                  <mesh castShadow material={matTeamCarbon} position={[-0.05, 0.16, 0]} rotation={[0, 0, -0.28]}>
                    <cylinderGeometry args={[0.016, 0.018, 0.18, 12]} />
                  </mesh>
                  <mesh castShadow material={matTeamCarbon} position={[0.05, 0.16, 0]} rotation={[0, 0, 0.28]}>
                    <cylinderGeometry args={[0.016, 0.018, 0.18, 12]} />
                  </mesh>
                  <mesh castShadow material={matGraphiteDark} position={[0, 0.22, 0]}>
                    <boxGeometry args={[0.11, 0.022, 0.03]} />
                  </mesh>

                  {/* Schlägerkopf-Hauptrahmen (Carbon Rim) */}
                  <mesh castShadow receiveShadow material={matTeamCarbon} position={[0, baseHeadRadiusY + 0.14, 0]}>
                    <torusGeometry args={[baseHeadRadiusX, baseFrameThickness, 16, 32]} />
                  </mesh>
                  <mesh castShadow material={matGraphiteDark} position={[0, baseHeadRadiusY + 0.14, 0]}>
                    <torusGeometry args={[baseHeadRadiusX + 0.006, baseFrameThickness * 0.45, 8, 32]} />
                  </mesh>

                  {/* SWEET SPOT & RACKET-CAM TARGET (TREFFPUNKT & FIRST-PERSON-POV) */}
                  <group ref={racketTargetRef} position={[0, baseHeadRadiusY + 0.14, 0]}>
                    {/* Saitengitter (High-Tension String Bed) */}
                    {stringsGrid.map((str, idx) => {
                      const midX = (str.p1[0] + str.p2[0]) / 2;
                      const midY = (str.p1[1] + str.p2[1]) / 2;
                      const len = Math.hypot(str.p2[0] - str.p1[0], str.p2[1] - str.p1[1]);
                      const angle = Math.atan2(str.p2[1] - str.p1[1], str.p2[0] - str.p1[0]);
                      return (
                        <mesh
                          key={`str-${idx}`}
                          material={matStrings}
                          position={[midX, midY, 0]}
                          rotation={[0, 0, angle - Math.PI / 2]}
                        >
                          <cylinderGeometry args={[0.002, 0.002, len, 4]} />
                        </mesh>
                      );
                    })}

                    {/* Kinetischer Sweet-Spot-Ring (Impact Center) */}
                    <mesh material={matStrings} position={[0, 0, 0]}>
                      <ringGeometry args={[0.06, 0.075, 20]} />
                    </mesh>
                    <pointLight color={stringGlow} intensity={2.2} distance={1.8} />
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
