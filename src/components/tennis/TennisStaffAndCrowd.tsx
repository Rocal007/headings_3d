import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ============================================================================
 * TENNIS STAFF & CROWD SUB-ASSEMBLY (AGENT 13 / 18)
 * Enthält Schiedsrichter, Linienrichter, Ballkinder, Trainer & 3D-Zuschauer
 * ============================================================================
 */

export interface TennisUmpireProps {
  ballPos: THREE.Vector3;
}

export function TennisUmpire({ ballPos }: TennisUmpireProps) {
  const headRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (headRef.current) {
      const angle = THREE.MathUtils.clamp(-ballPos.z * 0.065, -0.9, 0.9);
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, angle, 0.12);
    }
  });

  const matBlazer = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.6 }), []);
  const matPants = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7 }), []);
  const matSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbcfe8', roughness: 0.5 }), []);
  const matCap = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4 }), []);

  return (
    <group position={[7.2, 0, 0]}>
      <group rotation={[0, -Math.PI / 2, 0]}>
        {[-0.4, 0.4].map((lx, i) =>
          [-0.4, 0.4].map((lz, j) => (
            <mesh key={`leg-${i}-${j}`} castShadow position={[lx, 1.1, lz]}>
              <cylinderGeometry args={[0.025, 0.035, 2.2, 12]} />
              <meshStandardMaterial color={0x0f172a} metalness={0.8} roughness={0.3} />
            </mesh>
          ))
        )}
        <mesh castShadow position={[0, 2.0, 0]}>
          <boxGeometry args={[0.9, 0.05, 0.9]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 2.35, 0.15]}>
          <boxGeometry args={[0.65, 0.65, 0.1]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 2.05, -0.1]}>
          <boxGeometry args={[0.65, 0.06, 0.45]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 3.05, 0]}>
          <boxGeometry args={[1.1, 0.04, 1.1]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} />
        </mesh>
      </group>

      <group position={[0, 2.08, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh castShadow material={matPants} position={[-0.14, 0.22, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.42, 12]} />
        </mesh>
        <mesh castShadow material={matPants} position={[0.14, 0.22, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.42, 12]} />
        </mesh>
        <mesh castShadow material={matPants} position={[-0.14, -0.05, -0.42]}>
          <cylinderGeometry args={[0.05, 0.045, 0.45, 12]} />
        </mesh>
        <mesh castShadow material={matPants} position={[0.14, -0.05, -0.42]}>
          <cylinderGeometry args={[0.05, 0.045, 0.45, 12]} />
        </mesh>

        <mesh castShadow material={matBlazer} position={[0, 0.52, 0]}>
          <boxGeometry args={[0.38, 0.48, 0.24]} />
        </mesh>

        <mesh castShadow material={matBlazer} position={[-0.22, 0.45, -0.15]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.38, 10]} />
        </mesh>
        <mesh castShadow material={matBlazer} position={[0.22, 0.45, -0.15]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.38, 10]} />
        </mesh>

        <mesh castShadow position={[0, 0.42, -0.32]} rotation={[-0.6, 0, 0]}>
          <boxGeometry args={[0.26, 0.18, 0.02]} />
          <meshStandardMaterial color={0x0284c7} emissive="#0284c7" emissiveIntensity={0.4} />
        </mesh>

        <group ref={headRef} position={[0, 0.85, 0]}>
          <mesh castShadow material={matSkin}>
            <sphereGeometry args={[0.12, 16, 16]} />
          </mesh>
          <mesh castShadow material={matCap} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.125, 0.13, 0.08, 16]} />
          </mesh>
          <mesh castShadow material={matCap} position={[0, 0.06, -0.10]}>
            <boxGeometry args={[0.14, 0.02, 0.10]} />
          </mesh>
          <mesh castShadow position={[0.13, 0.02, -0.08]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 6]} />
            <meshStandardMaterial color={0x111111} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function TennisCourtsideStaff() {
  const matNavy = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 }), []);
  const matWhite = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 }), []);
  const matYellowKit = useMemo(() => new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.5 }), []);
  const matSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.4 }), []);
  const matDarkSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.4 }), []);
  const matCoachBlue = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.6 }), []);
  const matCoachGold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.6 }), []);

  const lineJudges = useMemo(() => [
    { pos: [-6.4, 0, -12.6], rot: 0.2, name: 'Baseline Left Judge South' },
    { pos: [6.4, 0, -12.6], rot: -0.2, name: 'Baseline Right Judge South' },
    { pos: [-6.4, 0, 12.6], rot: Math.PI - 0.2, name: 'Baseline Left Judge North' },
    { pos: [6.4, 0, 12.6], rot: Math.PI + 0.2, name: 'Baseline Right Judge North' },
    { pos: [-6.8, 0, -6.4], rot: Math.PI / 2, name: 'Service Judge South' },
    { pos: [-6.8, 0, 6.4], rot: Math.PI / 2, name: 'Service Judge North' },
  ], []);

  const ballKids = useMemo(() => [
    { pos: [-6.5, 0, -0.6], rot: Math.PI / 2, isKneeling: true },
    { pos: [-6.5, 0, 0.6], rot: Math.PI / 2, isKneeling: true },
    { pos: [5.8, 0, -12.2], rot: -0.3, isKneeling: false },
    { pos: [-5.8, 0, 12.2], rot: Math.PI + 0.3, isKneeling: false },
  ], []);

  return (
    <group>
      {lineJudges.map((lj, idx) => (
        <group key={`lj-${idx}`} position={lj.pos as [number, number, number]} rotation={[0, lj.rot, 0]}>
          <mesh castShadow material={matWhite} position={[-0.10, 0.42, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.84, 8]} />
          </mesh>
          <mesh castShadow material={matWhite} position={[0.10, 0.42, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.84, 8]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 1.15, 0]}>
            <boxGeometry args={[0.34, 0.65, 0.20]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[-0.19, 1.12, 0.05]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.03, 0.55, 6]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0.19, 1.12, 0.05]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.03, 0.55, 6]} />
          </mesh>
          <mesh castShadow material={idx % 2 === 0 ? matSkin : matDarkSkin} position={[0, 1.58, 0]}>
            <sphereGeometry args={[0.10, 12, 12]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 1.66, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.05, 10]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 1.65, -0.08]}>
            <boxGeometry args={[0.12, 0.02, 0.08]} />
          </mesh>
        </group>
      ))}

      {ballKids.map((bk, idx) => (
        <group key={`bk-${idx}`} position={bk.pos as [number, number, number]} rotation={[0, bk.rot, 0]}>
          {bk.isKneeling ? (
            <group position={[0, 0, 0]}>
              <mesh castShadow material={matNavy} position={[0, 0.25, 0]} rotation={[0.6, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.04, 0.55, 8]} />
              </mesh>
              <mesh castShadow material={matYellowKit} position={[0, 0.65, 0]}>
                <boxGeometry args={[0.30, 0.45, 0.18]} />
              </mesh>
              <mesh castShadow material={matSkin} position={[0, 0.98, 0]}>
                <sphereGeometry args={[0.09, 12, 12]} />
              </mesh>
              <mesh castShadow material={matWhite} position={[0, 1.05, 0]}>
                <cylinderGeometry args={[0.095, 0.095, 0.04, 8]} />
              </mesh>
            </group>
          ) : (
            <group position={[0, 0, 0]}>
              <mesh castShadow material={matNavy} position={[-0.10, 0.35, 0]} rotation={[-0.15, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.04, 0.70, 8]} />
              </mesh>
              <mesh castShadow material={matNavy} position={[0.10, 0.35, 0]} rotation={[-0.15, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.04, 0.70, 8]} />
              </mesh>
              <mesh castShadow material={matYellowKit} position={[0, 0.95, -0.05]} rotation={[0.15, 0, 0]}>
                <boxGeometry args={[0.30, 0.52, 0.18]} />
              </mesh>
              <mesh castShadow material={matSkin} position={[0, 1.32, -0.08]}>
                <sphereGeometry args={[0.09, 12, 12]} />
              </mesh>
              <mesh castShadow material={matWhite} position={[0, 1.39, -0.08]}>
                <cylinderGeometry args={[0.095, 0.095, 0.04, 8]} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Crane 1 Coach (Sinner Box) */}
      <group position={[-7.5, 0, -3.2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[1.4, 0.06, 0.55]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh castShadow material={matNavy} position={[-0.2, 0.35, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.35, 8]} />
        </mesh>
        <mesh castShadow material={matCoachBlue} position={[-0.2, 0.85, 0]}>
          <boxGeometry args={[0.34, 0.50, 0.22]} />
        </mesh>
        <mesh castShadow material={matSkin} position={[-0.2, 1.20, 0]}>
          <sphereGeometry args={[0.10, 12, 12]} />
        </mesh>
        <mesh castShadow position={[-0.2, 0.78, -0.22]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.22, 0.15, 0.02]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>

      {/* Crane 2 Coach (Alcaraz Box - Juan Carlos Ferrero) */}
      <group position={[-7.5, 0, 3.2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[1.4, 0.06, 0.55]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh castShadow material={matNavy} position={[0.2, 0.35, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.35, 8]} />
        </mesh>
        <mesh castShadow material={matCoachGold} position={[0.2, 0.85, 0]}>
          <boxGeometry args={[0.34, 0.50, 0.22]} />
        </mesh>
        <mesh castShadow material={matDarkSkin} position={[0.2, 1.20, 0]}>
          <sphereGeometry args={[0.10, 12, 12]} />
        </mesh>
      </group>

      {/* Courtside Photographers */}
      {[
        { pos: [-7.6, 0, -7.5], rot: 0.6 },
        { pos: [-7.6, 0, 7.5], rot: Math.PI - 0.6 }
      ].map((p, idx) => (
        <group key={`photo-${idx}`} position={p.pos as [number, number, number]} rotation={[0, p.rot, 0]}>
          <mesh castShadow position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.5, 12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 0.65, 0]}>
            <boxGeometry args={[0.32, 0.45, 0.22]} />
          </mesh>
          <mesh castShadow material={matSkin} position={[0, 0.98, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
          <mesh castShadow material={matNavy} position={[0, 1.05, 0]}>
            <cylinderGeometry args={[0.095, 0.095, 0.04, 8]} />
          </mesh>
          <mesh castShadow position={[0, 0.88, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 0.35, 12]} />
            <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 0.88, -0.08]}>
            <boxGeometry args={[0.12, 0.09, 0.08]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function SeatedSpectator({
  x,
  y,
  z,
  facing,
  shirtColor,
  chairColor,
  hasFlag
}: {
  x: number;
  y: number;
  z: number;
  facing: 'east' | 'west';
  shirtColor: string;
  chairColor: string;
  hasFlag: boolean;
}) {
  const rotY = facing === 'west' ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      {/* 1. 3D Stadium Bucket Chair */}
      <mesh castShadow position={[0, 0.18, 0.05]}>
        <boxGeometry args={[0.44, 0.06, 0.40]} />
        <meshStandardMaterial color={chairColor} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.44, -0.15]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.44, 0.46, 0.06]} />
        <meshStandardMaterial color={chairColor} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, -0.10, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 2. Seated Human Figure */}
      <mesh castShadow position={[0, 0.26, 0.10]}>
        <boxGeometry args={[0.34, 0.10, 0.32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.10, 0.02, 0.26]}>
        <cylinderGeometry args={[0.045, 0.04, 0.40, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.10, 0.02, 0.26]}>
        <cylinderGeometry args={[0.045, 0.04, 0.40, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.58, 0]}>
        <boxGeometry args={[0.36, 0.52, 0.22]} />
        <meshStandardMaterial color={shirtColor} roughness={0.6} />
      </mesh>
      <group position={[0, 0.96, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.05, 10]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
        <mesh castShadow position={[0, 0.07, 0.08]}>
          <boxGeometry args={[0.13, 0.02, 0.08]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
      </group>
      <mesh castShadow position={[-0.22, 0.72, 0.04]} rotation={[0.4, 0, 0.2]}>
        <cylinderGeometry args={[0.035, 0.03, 0.40, 6]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      <mesh castShadow position={[0.22, 0.72, 0.04]} rotation={[0.4, 0, -0.2]}>
        <cylinderGeometry args={[0.035, 0.03, 0.40, 6]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>

      {/* Team Flag */}
      {hasFlag && (
        <group position={[0.25, 0.85, 0.2]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.8, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.22, 0.60, 0]}>
            <planeGeometry args={[0.40, 0.26]} />
            <meshBasicMaterial color={facing === 'west' ? '#38bdf8' : '#facc15'} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function TennisStadiumSpectators({ 
  showSpectators = false,
  showGrandstands = false
}: { 
  showSpectators?: boolean;
  showGrandstands?: boolean;
}) {
  const { westSpectators, eastSpectators } = useMemo(() => {
    const wList: Array<{ x: number; y: number; z: number; color: string; hasFlag: boolean }> = [];
    const eList: Array<{ x: number; y: number; z: number; color: string; hasFlag: boolean }> = [];

    const shirtColors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#f8fafc', '#1e293b', '#0284c7', '#84cc16'
    ];

    const rows = 5;
    const cols = 15;

    for (let r = 0; r < rows; r++) {
      const standY = r * 0.85 + 0.42;
      for (let c = 0; c < cols; c++) {
        const z = -18 + c * 2.6;
        const color = shirtColors[(r * cols + c) % shirtColors.length];
        const hasFlag = (r * cols + c) % 5 === 0;

        wList.push({
          x: -12.8 - r * 1.6,
          y: standY,
          z,
          color,
          hasFlag
        });

        eList.push({
          x: 12.8 + r * 1.6,
          y: standY,
          z,
          color,
          hasFlag
        });
      }
    }

    return { westSpectators: wList, eastSpectators: eList };
  }, []);

  const matStandConcrete = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.2
  }), []);

  const matLedBanner = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: '#0369a1',
    emissiveIntensity: 0.6,
    roughness: 0.2
  }), []);

  return (
    <group>
      {/* 1. Concrete Grandstand Structures */}
      {showGrandstands && (
        <>
          <group position={[-17.5, 0, 0]}>
            {[0, 1, 2, 3, 4, 5].map(r => (
              <mesh key={`west-tier-${r}`} castShadow receiveShadow material={matStandConcrete} position={[-(r * 1.6), r * 0.85 + 0.42, 0]}>
                <boxGeometry args={[2.0, 0.85, 46]} />
              </mesh>
            ))}
            <mesh castShadow receiveShadow material={matLedBanner} position={[5.8, 0.5, 0]}>
              <boxGeometry args={[0.2, 1.0, 46]} />
            </mesh>
          </group>

          <group position={[17.5, 0, 0]}>
            {[0, 1, 2, 3, 4, 5].map(r => (
              <mesh key={`east-tier-${r}`} castShadow receiveShadow material={matStandConcrete} position={[(r * 1.6), r * 0.85 + 0.42, 0]}>
                <boxGeometry args={[2.0, 0.85, 46]} />
              </mesh>
            ))}
            <mesh castShadow receiveShadow material={matLedBanner} position={[-5.8, 0.5, 0]}>
              <boxGeometry args={[0.2, 1.0, 46]} />
            </mesh>
          </group>
        </>
      )}

      {/* 2. Seated Spectators on Chairs */}
      {showSpectators && (
        <>
          {westSpectators.map((spec, i) => (
            <SeatedSpectator
              key={`w-spec-${i}`}
              x={spec.x}
              y={spec.y}
              z={spec.z}
              facing="west"
              shirtColor={spec.color}
              chairColor="#0284c7"
              hasFlag={spec.hasFlag}
            />
          ))}

          {eastSpectators.map((spec, i) => (
            <SeatedSpectator
              key={`e-spec-${i}`}
              x={spec.x}
              y={spec.y}
              z={spec.z}
              facing="east"
              shirtColor={spec.color}
              chairColor="#d97706"
              hasFlag={spec.hasFlag}
            />
          ))}
        </>
      )}
    </group>
  );
}
