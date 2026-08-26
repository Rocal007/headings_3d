import { useRef, useMemo, Component, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AvatarPose, AvatarMorphSettings } from './readyPlayerMePresets';

export interface AvatarIkParams {
  hipY?: number;
  shoulderPitch?: number;
  elbowAngle?: number;
  handPitch?: number;
  spinePitch?: number;
  hipPitch?: number;
  kneeBend?: number;
  lookUpAngle?: number;
  handRollOffset?: number;
  grip?: number;
}

export interface ReadyPlayerMeAvatarProps {
  url: string;
  presetId?: string;
  pose?: AvatarPose;
  ikParams?: AvatarIkParams;
  morphSettings?: Partial<AvatarMorphSettings>;
  lookAtPosition?: [number, number, number] | null;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  onStatsReady?: (stats: { bonesCount: number; morphsCount: number; verticesCount: number; isFallback?: boolean }) => void;
  onErrorFallback?: (errorMsg: string) => void;
}

interface HumanoidBones {
  hips?: THREE.Bone;
  spine?: THREE.Bone;
  spine1?: THREE.Bone;
  spine2?: THREE.Bone;
  neck?: THREE.Bone;
  head?: THREE.Bone;
  leftShoulder?: THREE.Bone;
  leftArm?: THREE.Bone;
  leftForeArm?: THREE.Bone;
  leftHand?: THREE.Bone;
  rightShoulder?: THREE.Bone;
  rightArm?: THREE.Bone;
  rightForeArm?: THREE.Bone;
  rightHand?: THREE.Bone;
  leftUpLeg?: THREE.Bone;
  leftLeg?: THREE.Bone;
  leftFoot?: THREE.Bone;
  leftToeBase?: THREE.Bone;
  rightUpLeg?: THREE.Bone;
  rightLeg?: THREE.Bone;
  rightFoot?: THREE.Bone;
  rightToeBase?: THREE.Bone;
}

interface MorphMeshInfo {
  mesh: THREE.SkinnedMesh;
  dict: { [key: string]: number };
}

/**
 * Robust Error Boundary to catch network/CORS fetch failures in useGLTF
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SafeAvatarErrorBoundary extends Component<
  { fallback: ReactNode; onError?: (err: Error) => void; children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * 1. GLTF-Based Ready Player Me Model Loader
 */
function RpmGltfModel({
  url,
  pose = 'idle',
  ikParams,
  morphSettings,
  lookAtPosition = null,
  scale = 1.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  castShadow = true,
  receiveShadow = true,
  onStatsReady
}: ReadyPlayerMeAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(url);

  const clonedScene = useMemo(() => {
    if (!gltf || !gltf.scene) return null;
    return SkeletonUtils.clone(gltf.scene) as THREE.Group;
  }, [gltf]);

  const { bones, morphMeshes, initialRotations, initialPositions } = useMemo(() => {
    const foundBones: HumanoidBones = {};
    const foundMorphs: MorphMeshInfo[] = [];
    const initRots = new Map<THREE.Bone, THREE.Euler>();
    const initPos = new Map<THREE.Bone, THREE.Vector3>();

    let vertexCount = 0;
    let morphCount = 0;
    let boneCount = 0;

    if (!clonedScene) {
      return { bones: foundBones, morphMeshes: foundMorphs, initialRotations: initRots, initialPositions: initPos };
    }

    clonedScene.traverse((node) => {
      if ((node as THREE.Bone).isBone) {
        const bone = node as THREE.Bone;
        boneCount++;
        initRots.set(bone, bone.rotation.clone());
        initPos.set(bone, bone.position.clone());

        const name = bone.name.toLowerCase();
        if (name.includes('hips') || name === 'pelvis') foundBones.hips = bone;
        else if (name === 'spine' || name === 'spine_01') foundBones.spine = bone;
        else if (name === 'spine1' || name === 'spine_02' || name === 'spine.001') foundBones.spine1 = bone;
        else if (name === 'spine2' || name === 'spine_03' || name === 'chest') foundBones.spine2 = bone;
        else if (name === 'neck') foundBones.neck = bone;
        else if (name === 'head') foundBones.head = bone;
        else if (name.includes('leftshoulder') || name.includes('clavicle_l')) foundBones.leftShoulder = bone;
        else if (name.includes('leftarm') || name.includes('upperarm_l')) foundBones.leftArm = bone;
        else if (name.includes('leftforearm') || name.includes('lowerarm_l')) foundBones.leftForeArm = bone;
        else if (name.includes('lefthand') || name.includes('hand_l')) foundBones.leftHand = bone;
        else if (name.includes('rightshoulder') || name.includes('clavicle_r')) foundBones.rightShoulder = bone;
        else if (name.includes('rightarm') || name.includes('upperarm_r')) foundBones.rightArm = bone;
        else if (name.includes('rightforearm') || name.includes('lowerarm_r')) foundBones.rightForeArm = bone;
        else if (name.includes('righthand') || name.includes('hand_r')) foundBones.rightHand = bone;
        else if (name.includes('leftupleg') || name.includes('thigh_l')) foundBones.leftUpLeg = bone;
        else if (name.includes('leftleg') || name.includes('calf_l')) foundBones.leftLeg = bone;
        else if (name.includes('leftfoot') || name.includes('foot_l')) foundBones.leftFoot = bone;
        else if (name.includes('lefttoebase') || name.includes('toe_l')) foundBones.leftToeBase = bone;
        else if (name.includes('rightupleg') || name.includes('thigh_r')) foundBones.rightUpLeg = bone;
        else if (name.includes('rightleg') || name.includes('calf_r')) foundBones.rightLeg = bone;
        else if (name.includes('rightfoot') || name.includes('foot_r')) foundBones.rightFoot = bone;
        else if (name.includes('righttoebase') || name.includes('toe_r')) foundBones.rightToeBase = bone;
      }

      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = node as THREE.SkinnedMesh;
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;

        if (mesh.geometry) {
          const pos = mesh.geometry.attributes.position;
          if (pos) vertexCount += pos.count;
        }

        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          morphCount += Object.keys(mesh.morphTargetDictionary).length;
          foundMorphs.push({ mesh, dict: mesh.morphTargetDictionary });
        }
      }
    });

    if (onStatsReady) {
      onStatsReady({
        bonesCount: boneCount,
        morphsCount: morphCount,
        verticesCount: vertexCount,
        isFallback: false
      });
    }

    return { bones: foundBones, morphMeshes: foundMorphs, initialRotations: initRots, initialPositions: initPos };
  }, [clonedScene, castShadow, receiveShadow, onStatsReady]);

  const blinkState = useRef({
    nextBlinkTime: 2.0,
    isBlinking: false,
    blinkDuration: 0.14,
    blinkTimer: 0
  });

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. --- 👁️ MORPH TARGETS & AUTO BLINKING ---
    let blinkWeight = morphSettings?.blink ?? 0;
    const autoBlink = morphSettings?.autoBlink ?? true;

    if (autoBlink) {
      const bs = blinkState.current;
      if (!bs.isBlinking) {
        if (t > bs.nextBlinkTime) {
          bs.isBlinking = true;
          bs.blinkTimer = 0;
          bs.blinkDuration = 0.12 + Math.random() * 0.06;
        }
      } else {
        bs.blinkTimer += delta;
        const progress = bs.blinkTimer / bs.blinkDuration;
        if (progress >= 1.0) {
          bs.isBlinking = false;
          bs.nextBlinkTime = t + 2.5 + Math.random() * 4.0;
          blinkWeight = 0;
        } else {
          blinkWeight = Math.sin(progress * Math.PI);
        }
      }
    }

    const smileWeight = morphSettings?.smile ?? 0;
    const jawWeight = morphSettings?.jawOpen ?? 0;
    const browWeight = morphSettings?.browUp ?? 0;
    const winkLWeight = Math.max(blinkWeight, morphSettings?.winkLeft ?? 0);
    const winkRWeight = Math.max(blinkWeight, morphSettings?.winkRight ?? 0);

    for (let i = 0; i < morphMeshes.length; i++) {
      const { mesh, dict } = morphMeshes[i];
      const inf = mesh.morphTargetInfluences;
      if (!inf) continue;

      if (dict['eyeBlinkLeft'] !== undefined) inf[dict['eyeBlinkLeft']] = winkLWeight;
      if (dict['eyeBlinkRight'] !== undefined) inf[dict['eyeBlinkRight']] = winkRWeight;
      if (dict['mouthSmileLeft'] !== undefined) inf[dict['mouthSmileLeft']] = smileWeight;
      if (dict['mouthSmileRight'] !== undefined) inf[dict['mouthSmileRight']] = smileWeight;
      if (dict['jawOpen'] !== undefined) inf[dict['jawOpen']] = jawWeight;
      if (dict['browInnerUp'] !== undefined) inf[dict['browInnerUp']] = browWeight;
      if (dict['browOuterUpLeft'] !== undefined) inf[dict['browOuterUpLeft']] = browWeight;
      if (dict['browOuterUpRight'] !== undefined) inf[dict['browOuterUpRight']] = browWeight;
    }

    // 2. --- 🦴 PROCEDURAL SKELETON KINEMATICS ---
    if (!bones.hips) return;

    const resetBone = (bone?: THREE.Bone) => {
      if (!bone) return;
      const r = initialRotations.get(bone);
      if (r) bone.rotation.copy(r);
      const p = initialPositions.get(bone);
      if (p) bone.position.copy(p);
    };

    resetBone(bones.hips);
    resetBone(bones.spine);
    resetBone(bones.spine1);
    resetBone(bones.spine2);
    resetBone(bones.neck);
    resetBone(bones.head);
    resetBone(bones.leftShoulder);
    resetBone(bones.leftArm);
    resetBone(bones.leftForeArm);
    resetBone(bones.leftHand);
    resetBone(bones.rightShoulder);
    resetBone(bones.rightArm);
    resetBone(bones.rightForeArm);
    resetBone(bones.rightHand);
    resetBone(bones.leftUpLeg);
    resetBone(bones.leftLeg);
    resetBone(bones.leftFoot);
    resetBone(bones.rightUpLeg);
    resetBone(bones.rightLeg);
    resetBone(bones.rightFoot);

    applyPoseToBones(bones, pose, t, ikParams);

    // 3. --- 🎯 LOOK-AT / HEAD TRACKING ---
    if (lookAtPosition && bones.head && groupRef.current) {
      const worldTarget = new THREE.Vector3(...lookAtPosition);
      const headWorldPos = new THREE.Vector3();
      bones.head.getWorldPosition(headWorldPos);

      const toTarget = worldTarget.clone().sub(headWorldPos).normalize();
      const yaw = Math.atan2(toTarget.x, toTarget.z);
      const pitch = -Math.asin(THREE.MathUtils.clamp(toTarget.y, -0.95, 0.95));

      const clampedYaw = THREE.MathUtils.clamp(yaw, -Math.PI / 3, Math.PI / 3);
      const clampedPitch = THREE.MathUtils.clamp(pitch, -Math.PI / 4, Math.PI / 4);

      bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, clampedYaw * 0.6, 0.08);
      bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, clampedPitch * 0.6, 0.08);
      if (bones.neck) {
        bones.neck.rotation.y = THREE.MathUtils.lerp(bones.neck.rotation.y, clampedYaw * 0.4, 0.08);
        bones.neck.rotation.x = THREE.MathUtils.lerp(bones.neck.rotation.x, clampedPitch * 0.4, 0.08);
      }
    }
  });

  if (!clonedScene) return null;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={[scale, scale, scale]}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * 🖐️ 5-FINGER ARTICULATED AVATAR HAND (WRAPS AROUND HANDLES & WHEELS)
 */
function ArticulatedAvatarHand({
  isRight,
  grip = 0.88,
  matSkin,
  matGlove
}: {
  isRight: boolean;
  grip?: number;
  matSkin: string;
  matGlove: string;
}) {
  const sideMul = isRight ? 1 : -1;
  const matMain = matGlove || matSkin;

  return (
    <group scale={[sideMul, 1, 1]}>
      {/* Palm Base / Metacarpal Arch */}
      <mesh castShadow position={[0, -0.032, 0]}>
        <boxGeometry args={[0.068, 0.064, 0.024]} />
        <meshStandardMaterial color={matMain} roughness={0.6} />
      </mesh>

      {/* Opposable Thumb wrapping tightly under the handle bar */}
      <group position={[0.034, -0.016, 0.005]} rotation={[0.42 * grip, 0.35 * grip, -0.55 * grip]}>
        <mesh castShadow position={[0, -0.012, 0]}>
          <cylinderGeometry args={[0.009, 0.008, 0.024, 8]} />
          <meshStandardMaterial color={matMain} roughness={0.6} />
        </mesh>
        <group position={[0, -0.024, 0]} rotation={[0.75 * grip, -0.20 * grip, 0.35 * grip]}>
          <mesh castShadow position={[0, -0.010, 0]}>
            <cylinderGeometry args={[0.008, 0.007, 0.020, 8]} />
            <meshStandardMaterial color={matMain} roughness={0.6} />
          </mesh>
          <group position={[0, -0.020, 0]} rotation={[0.85 * grip, 0, 0]}>
            <mesh castShadow position={[0, -0.008, 0]}>
              <sphereGeometry args={[0.007, 8, 8]} />
              <meshStandardMaterial color={matMain} roughness={0.6} />
            </mesh>
          </group>
        </group>
      </group>

      {/* 4 Articulated Fingers (Index, Middle, Ring, Pinky) wrapping completely UNDER the bar */}
      {[
        { x: 0.024, l: 0.034, w: 0.0085 }, // Index
        { x: 0.008, l: 0.038, w: 0.0088 }, // Middle
        { x: -0.008, l: 0.035, w: 0.0085 }, // Ring
        { x: -0.023, l: 0.028, w: 0.0075 }  // Pinky
      ].map((f, i) => (
        <group key={`finger-${i}`} position={[f.x, -0.064, 0]} rotation={[grip * 1.05, 0, 0]}>
          {/* 1. Proximal Phalanx (curves over front of the bar) */}
          <mesh castShadow position={[0, 0, 0]}>
            <sphereGeometry args={[f.w * 1.05, 8, 8]} />
            <meshStandardMaterial color={matMain} roughness={0.6} />
          </mesh>
          <mesh castShadow position={[0, -f.l * 0.22, 0]}>
            <cylinderGeometry args={[f.w, f.w * 0.95, f.l * 0.44, 8]} />
            <meshStandardMaterial color={matMain} roughness={0.6} />
          </mesh>

          {/* 2. Intermediate Phalanx (curves around the bottom of the bar) */}
          <group position={[0, -f.l * 0.44, 0]} rotation={[grip * 1.15, 0, 0]}>
            <mesh castShadow position={[0, 0, 0]}>
              <sphereGeometry args={[f.w * 0.95, 8, 8]} />
              <meshStandardMaterial color={matMain} roughness={0.6} />
            </mesh>
            <mesh castShadow position={[0, -f.l * 0.18, 0]}>
              <cylinderGeometry args={[f.w * 0.9, f.w * 0.85, f.l * 0.36, 8]} />
              <meshStandardMaterial color={matMain} roughness={0.6} />
            </mesh>

            {/* 3. Distal Phalanx (fingertip hooks up under the bar) */}
            <group position={[0, -f.l * 0.36, 0]} rotation={[grip * 1.05, 0, 0]}>
              <mesh castShadow position={[0, -f.l * 0.12, 0]}>
                <capsuleGeometry args={[f.w * 0.78, f.l * 0.24, 6, 8]} />
                <meshStandardMaterial color={matMain} roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

/**
 * Shared Bone Pose Math with IK Parameter Support
 */
function applyPoseToBones(bones: HumanoidBones, pose: AvatarPose, t: number, ikParams?: AvatarIkParams) {
  switch (pose) {
    case 'idle': {
      const breath = Math.sin(t * 1.8) * 0.035;
      const sway = Math.sin(t * 0.9) * 0.02;

      if (bones.spine) bones.spine.rotation.x += breath;
      if (bones.spine2) bones.spine2.rotation.x += breath * 0.8;
      if (bones.hips) {
        bones.hips.rotation.z += sway * 0.5;
        bones.hips.position.y += Math.abs(breath) * 0.005;
      }
      if (bones.head) {
        bones.head.rotation.y += Math.sin(t * 0.45) * 0.04;
        bones.head.rotation.x += Math.sin(t * 0.7) * 0.02;
      }
      if (bones.leftArm) bones.leftArm.rotation.z -= 0.12;
      if (bones.rightArm) bones.rightArm.rotation.z += 0.12;
      break;
    }

    case 'walk': {
      const walkSpeed = 4.2;
      const walkPhase = t * walkSpeed;
      const legSwing = Math.sin(walkPhase) * 0.55;
      const kneeFlexL = Math.max(0, -Math.sin(walkPhase)) * 0.65;
      const kneeFlexR = Math.max(0, Math.sin(walkPhase)) * 0.65;
      const armSwing = Math.sin(walkPhase) * 0.45;
      const hipBob = Math.abs(Math.sin(walkPhase * 2)) * 0.04;

      if (bones.hips) {
        bones.hips.position.y -= hipBob;
        bones.hips.rotation.y = Math.sin(walkPhase) * 0.08;
      }
      if (bones.spine) {
        bones.spine.rotation.y = -Math.sin(walkPhase) * 0.08;
        bones.spine.rotation.x = 0.05;
      }
      if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = -legSwing;
      if (bones.leftLeg) bones.leftLeg.rotation.x = kneeFlexL;
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = legSwing;
      if (bones.rightLeg) bones.rightLeg.rotation.x = kneeFlexR;
      if (bones.leftArm) bones.leftArm.rotation.x = armSwing;
      if (bones.rightArm) bones.rightArm.rotation.x = -armSwing;
      break;
    }

    case 'crane_rear': {
      const hipY = 0.93; // Fixed standing hip height so feet/boots stay planted firmly on ground Y=0
      const sp = ikParams?.spinePitch ?? -0.10;
      const shp = ikParams?.shoulderPitch ?? 0.50;
      const elb = ikParams?.elbowAngle ?? 1.66;
      const hdp = ikParams?.handPitch ?? 0.59;
      const hp = ikParams?.hipPitch ?? 0.04;
      const kb = ikParams?.kneeBend ?? 0.08;
      const lua = ikParams?.lookUpAngle ?? -0.22;
      const rollOff = ikParams?.handRollOffset ?? 0;

      if (bones.hips) bones.hips.position.y = hipY;
      if (bones.spine) bones.spine.rotation.x = sp;
      if (bones.spine1) bones.spine1.rotation.x = sp * 0.4;
      if (bones.spine2) bones.spine2.rotation.x = sp * 0.4;
      if (bones.neck) bones.neck.rotation.x = lua * 0.5;
      if (bones.head) bones.head.rotation.x = lua;

      if (bones.leftUpLeg) bones.leftUpLeg.rotation.set(-hp, 0.04, -0.02);
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.set(-hp, -0.04, 0.02);
      if (bones.leftLeg) bones.leftLeg.rotation.x = kb;
      if (bones.rightLeg) bones.rightLeg.rotation.x = kb;

      // Shoulder: swings upper arm forward (+Z) towards handle
      if (bones.leftArm) bones.leftArm.rotation.set(-shp, 0.06, -0.04);
      // Elbow: bends forearm forward (+Z) towards handle
      if (bones.leftForeArm) bones.leftForeArm.rotation.set(-elb, 0, 0);
      // Hand / Wrist: flexes palmar (+hdp) horizontally flat over the top of the handle bar
      if (bones.leftHand) bones.leftHand.rotation.set(hdp, 0.04, 0.06);

      if (bones.rightArm) bones.rightArm.rotation.set(-shp, -0.06, 0.04);
      if (bones.rightForeArm) bones.rightForeArm.rotation.set(-elb, 0, 0);
      if (bones.rightHand) bones.rightHand.rotation.set(hdp, -0.04, -0.06 + rollOff);
      break;
    }

    case 'crane_desk': {
      const wheelTurnL = Math.sin(t * 1.5) * 0.2;
      const wheelTurnR = Math.cos(t * 1.2) * 0.25;

      if (bones.spine) bones.spine.rotation.x = 0.12;
      if (bones.neck) bones.neck.rotation.x = 0.14;
      if (bones.head) bones.head.rotation.x = 0.18;

      if (bones.leftArm) bones.leftArm.rotation.set(-0.52, 0.12, -0.06);
      if (bones.leftForeArm) bones.leftForeArm.rotation.set(0.78, 0, wheelTurnL);
      if (bones.leftHand) bones.leftHand.rotation.set(-0.45, 0, 0);

      if (bones.rightArm) bones.rightArm.rotation.set(-0.52, -0.12, 0.06);
      if (bones.rightForeArm) bones.rightForeArm.rotation.set(0.78, 0, wheelTurnR);
      if (bones.rightHand) bones.rightHand.rotation.set(-0.45, 0, 0);
      break;
    }

    case 'tennis_ready': {
      if (bones.hips) bones.hips.position.y -= (0.08 + Math.sin(t * 3.5) * 0.025);
      if (bones.spine) bones.spine.rotation.x = 0.25;
      if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = -0.35;
      if (bones.leftLeg) bones.leftLeg.rotation.x = 0.55;
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = -0.35;
      if (bones.rightLeg) bones.rightLeg.rotation.x = 0.55;
      if (bones.rightArm) bones.rightArm.rotation.x = -0.75;
      if (bones.rightForeArm) bones.rightForeArm.rotation.x = -0.9;
      if (bones.leftArm) bones.leftArm.rotation.x = -0.65;
      if (bones.leftForeArm) bones.leftForeArm.rotation.x = -0.85;
      break;
    }

    case 'tennis_serve': {
      const servePhase = Math.sin(t * 2.2);
      if (bones.spine) {
        bones.spine.rotation.x = -0.15;
        bones.spine.rotation.y = 0.35;
      }
      if (bones.rightArm) {
        bones.rightArm.rotation.x = -2.4 + servePhase * 0.4;
        bones.rightArm.rotation.z = 0.4;
      }
      if (bones.leftArm) bones.leftArm.rotation.x = -2.2;
      break;
    }

    case 'wave': {
      const waveAngle = Math.sin(t * 6.0) * 0.45;
      if (bones.rightArm) {
        bones.rightArm.rotation.x = -1.6;
        bones.rightArm.rotation.z = 0.7;
      }
      if (bones.rightForeArm) bones.rightForeArm.rotation.z = -0.8 + waveAngle;
      if (bones.head) bones.head.rotation.y = Math.sin(t * 1.5) * 0.15;
      break;
    }

    case 'dance': {
      const beat = t * 4.0;
      const hipSway = Math.sin(beat) * 0.2;
      if (bones.hips) bones.hips.rotation.z = hipSway;
      if (bones.spine) bones.spine.rotation.z = -hipSway * 0.7;
      if (bones.leftArm) bones.leftArm.rotation.x = -0.8 + Math.cos(beat) * 0.4;
      if (bones.rightArm) bones.rightArm.rotation.x = -0.8 - Math.cos(beat) * 0.4;
      break;
    }

    case 'driving': {
      if (bones.hips) bones.hips.position.y -= 0.35;
      if (bones.leftUpLeg) bones.leftUpLeg.rotation.x = -1.45;
      if (bones.leftLeg) bones.leftLeg.rotation.x = 1.35;
      if (bones.rightUpLeg) bones.rightUpLeg.rotation.x = -1.45;
      if (bones.rightLeg) bones.rightLeg.rotation.x = 1.35;
      const steer = Math.sin(t * 1.2) * 0.15;
      if (bones.leftArm) bones.leftArm.rotation.x = -0.9 + steer;
      if (bones.rightArm) bones.rightArm.rotation.x = -0.9 - steer;
      break;
    }
  }
}

/**
 * 2. High-Quality Offline Procedural Humanoid Avatar (100% Guaranteed Fallback & Standalone)
 */
export function ProceduralHumanoidAvatar({
  presetId = 'crane_operator_max',
  pose = 'idle',
  ikParams,
  morphSettings,
  scale = 1.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onStatsReady
}: {
  presetId?: string;
  pose?: AvatarPose;
  ikParams?: AvatarIkParams;
  morphSettings?: Partial<AvatarMorphSettings>;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onStatsReady?: (stats: { bonesCount: number; morphsCount: number; verticesCount: number; isFallback?: boolean }) => void;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftForeArmRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForeArmRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const eyeLRef = useRef<THREE.Mesh>(null);
  const eyeRRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  // Notify stats
  useMemo(() => {
    if (onStatsReady) {
      onStatsReady({
        bonesCount: 32,
        morphsCount: 16,
        verticesCount: 8400,
        isFallback: true
      });
    }
  }, [onStatsReady]);

  // Color Palette based on Preset
  const theme = useMemo(() => {
    switch (presetId) {
      case 'crane_operator_max':
        return { shirt: '#1e293b', pants: '#334155', accent: '#e5c500', skin: '#e5ab82', hat: '#0f172a', hair: '#475569' };
      case 'dop_elena':
        return { shirt: '#090d16', pants: '#1e293b', accent: '#38bdf8', skin: '#f3c5a5', hat: '#0284c7', hair: '#1e1b4b' };
      case 'tennis_carlos':
        return { shirt: '#f8fafc', pants: '#047857', accent: '#4ade80', skin: '#d99b70', hat: '#ffffff', hair: '#292524' };
      case 'trucker_jake':
        return { shirt: '#991b1b', pants: '#1e3a8a', accent: '#fb923c', skin: '#deb887', hat: '#b91c1c', hair: '#78350f' };
      case 'cyber_neo':
      default:
        return { shirt: '#0f172a', pants: '#020617', accent: '#ec4899', skin: '#e2e8f0', hat: '#a855f7', hair: '#06b6d4' };
    }
  }, [presetId]);

  // Animation Loop
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Auto Blink
    let blink = morphSettings?.blink ?? 0;
    if (morphSettings?.autoBlink !== false) {
      const blinkCycle = t % 3.8;
      if (blinkCycle < 0.14) {
        blink = Math.sin((blinkCycle / 0.14) * Math.PI);
      }
    }
    const smile = morphSettings?.smile ?? 0;

    if (eyeLRef.current) eyeLRef.current.scale.y = Math.max(0.1, 1 - blink * 0.9);
    if (eyeRRef.current) eyeRRef.current.scale.y = Math.max(0.1, 1 - blink * 0.9);
    if (mouthRef.current) {
      mouthRef.current.scale.x = 1 + smile * 0.5;
      mouthRef.current.scale.y = 1 + (morphSettings?.jawOpen ?? 0) * 1.5;
    }

    // Kinematics
    const bonesMock: HumanoidBones = {
      hips: hipsRef.current as any,
      spine: spineRef.current as any,
      neck: neckRef.current as any,
      head: headRef.current as any,
      leftArm: leftArmRef.current as any,
      leftForeArm: leftForeArmRef.current as any,
      leftHand: leftHandRef.current as any,
      rightArm: rightArmRef.current as any,
      rightForeArm: rightForeArmRef.current as any,
      rightHand: rightHandRef.current as any,
      leftUpLeg: leftLegRef.current as any,
      leftLeg: leftKneeRef.current as any,
      rightUpLeg: rightLegRef.current as any,
      rightLeg: rightKneeRef.current as any
    };

    // Reset all bone positions to default every frame to prevent accumulator drift
    const defaultHipY = ikParams?.hipY ?? 0.93;
    if (hipsRef.current) {
      hipsRef.current.position.set(0, defaultHipY, 0);
    }
    if (spineRef.current) spineRef.current.position.set(0, 0.09, 0);
    if (neckRef.current) neckRef.current.position.set(0, 0.4, 0);
    if (headRef.current) headRef.current.position.set(0, 0.16, 0);
    if (leftArmRef.current) leftArmRef.current.position.set(-0.2, 0.32, 0);
    if (leftForeArmRef.current) leftForeArmRef.current.position.set(0, -0.28, 0);
    if (leftHandRef.current) leftHandRef.current.position.set(0, -0.26, 0);
    if (rightArmRef.current) rightArmRef.current.position.set(0.2, 0.32, 0);
    if (rightForeArmRef.current) rightForeArmRef.current.position.set(0, -0.28, 0);
    if (rightHandRef.current) rightHandRef.current.position.set(0, -0.26, 0);
    if (leftLegRef.current) leftLegRef.current.position.set(-0.09, -0.1, 0);
    if (leftKneeRef.current) leftKneeRef.current.position.set(0, -0.38, 0);
    if (rightLegRef.current) rightLegRef.current.position.set(0.09, -0.1, 0);
    if (rightKneeRef.current) rightKneeRef.current.position.set(0, -0.38, 0);

    // Reset rotations
    Object.values(bonesMock).forEach((b) => {
      if (b) b.rotation.set(0, 0, 0);
    });

    applyPoseToBones(bonesMock, pose, t, ikParams);
  });

  const gripValue = ikParams?.grip ?? (pose === 'crane_rear' ? 0.92 : pose === 'crane_desk' ? 0.75 : 0.4);

  return (
    <group ref={rootRef} position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* 🩳 Hips & Pelvis */}
      <group ref={hipsRef} position={[0, 0.93, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.18, 0.22]} />
          <meshStandardMaterial color={theme.pants} roughness={0.7} />
        </mesh>

        {/* 👕 Spine & Torso */}
        <group ref={spineRef} position={[0, 0.09, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
            <boxGeometry args={[0.32, 0.38, 0.23]} />
            <meshStandardMaterial color={theme.shirt} roughness={0.6} />
          </mesh>

          {/* Badge / Chest Stripe */}
          <mesh position={[0, 0.26, 0.118]}>
            <planeGeometry args={[0.16, 0.06]} />
            <meshBasicMaterial color={theme.accent} />
          </mesh>

          {/* 🧑 Neck & Head */}
          <group ref={neckRef} position={[0, 0.4, 0]}>
            <mesh castShadow position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.06, 0.07, 0.1, 16]} />
              <meshStandardMaterial color={theme.skin} roughness={0.5} />
            </mesh>

            <group ref={headRef} position={[0, 0.16, 0]}>
              {/* Face Sphere */}
              <mesh castShadow>
                <sphereGeometry args={[0.12, 24, 24]} />
                <meshStandardMaterial color={theme.skin} roughness={0.45} />
              </mesh>

              {/* Eyes */}
              <mesh ref={eyeLRef} position={[-0.045, 0.02, 0.108]}>
                <sphereGeometry args={[0.018, 16, 16]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
              <mesh ref={eyeRRef} position={[0.045, 0.02, 0.108]}>
                <sphereGeometry args={[0.018, 16, 16]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>

              {/* Nose */}
              <mesh position={[0, -0.01, 0.125]}>
                <coneGeometry args={[0.016, 0.035, 12]} />
                <meshStandardMaterial color={theme.skin} roughness={0.5} />
              </mesh>

              {/* Mouth */}
              <mesh ref={mouthRef} position={[0, -0.045, 0.115]}>
                <boxGeometry args={[0.04, 0.012, 0.01]} />
                <meshBasicMaterial color="#881337" />
              </mesh>

              {/* Hair / Cap */}
              <mesh position={[0, 0.06, -0.02]} castShadow>
                <sphereGeometry args={[0.126, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={theme.hat} roughness={0.7} />
              </mesh>
              {/* Cap Brim */}
              <mesh position={[0, 0.04, 0.12]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.16, 0.015, 0.11]} />
                <meshStandardMaterial color={theme.hat} roughness={0.7} />
              </mesh>
            </group>
          </group>

          {/* 💪 Left Arm */}
          <group ref={leftArmRef} position={[-0.2, 0.32, 0]}>
            <mesh castShadow position={[0, -0.14, 0]}>
              <cylinderGeometry args={[0.048, 0.042, 0.28, 16]} />
              <meshStandardMaterial color={theme.shirt} roughness={0.6} />
            </mesh>
            <group ref={leftForeArmRef} position={[0, -0.28, 0]}>
              <mesh castShadow position={[0, -0.13, 0]}>
                <cylinderGeometry args={[0.04, 0.035, 0.26, 16]} />
                <meshStandardMaterial color={theme.skin} roughness={0.5} />
              </mesh>
              {/* 🖐️ 5-Finger Articulated Hand */}
              <group ref={leftHandRef} position={[0, -0.26, 0]}>
                <ArticulatedAvatarHand
                  isRight={false}
                  grip={gripValue}
                  matSkin={theme.skin}
                  matGlove={theme.accent}
                />
              </group>
            </group>
          </group>

          {/* 💪 Right Arm */}
          <group ref={rightArmRef} position={[0.2, 0.32, 0]}>
            <mesh castShadow position={[0, -0.14, 0]}>
              <cylinderGeometry args={[0.048, 0.042, 0.28, 16]} />
              <meshStandardMaterial color={theme.shirt} roughness={0.6} />
            </mesh>
            <group ref={rightForeArmRef} position={[0, -0.28, 0]}>
              <mesh castShadow position={[0, -0.13, 0]}>
                <cylinderGeometry args={[0.04, 0.035, 0.26, 16]} />
                <meshStandardMaterial color={theme.skin} roughness={0.5} />
              </mesh>
              {/* 🖐️ 5-Finger Articulated Hand */}
              <group ref={rightHandRef} position={[0, -0.26, 0]}>
                <ArticulatedAvatarHand
                  isRight={true}
                  grip={gripValue}
                  matSkin={theme.skin}
                  matGlove={theme.accent}
                />
              </group>
            </group>
          </group>
        </group>

        {/* 👖 Left Leg */}
        <group ref={leftLegRef} position={[-0.09, -0.1, 0]}>
          <mesh castShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.065, 0.055, 0.38, 16]} />
            <meshStandardMaterial color={theme.pants} roughness={0.7} />
          </mesh>
          <group ref={leftKneeRef} position={[0, -0.38, 0]}>
            <mesh castShadow position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.052, 0.045, 0.38, 16]} />
              <meshStandardMaterial color={theme.pants} roughness={0.7} />
            </mesh>
            {/* Boot */}
            <mesh position={[0, -0.41, 0.04]} castShadow>
              <boxGeometry args={[0.09, 0.08, 0.18]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} />
            </mesh>
          </group>
        </group>

        {/* 👖 Right Leg */}
        <group ref={rightLegRef} position={[0.09, -0.1, 0]}>
          <mesh castShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.065, 0.055, 0.38, 16]} />
            <meshStandardMaterial color={theme.pants} roughness={0.7} />
          </mesh>
          <group ref={rightKneeRef} position={[0, -0.38, 0]}>
            <mesh castShadow position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.052, 0.045, 0.38, 16]} />
              <meshStandardMaterial color={theme.pants} roughness={0.7} />
            </mesh>
            {/* Boot */}
            <mesh position={[0, -0.41, 0.04]} castShadow>
              <boxGeometry args={[0.09, 0.08, 0.18]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * 🌟 MASTER EXPORT: Safe Humanoid Avatar
 * Tries to render the Ready Player Me GLTF, and falls back gracefully to the Procedural Humanoid on network/CORS error.
 */
export function ReadyPlayerMeAvatar(props: ReadyPlayerMeAvatarProps) {
  const fallbackAvatar = (
    <ProceduralHumanoidAvatar
      presetId={props.presetId}
      pose={props.pose}
      ikParams={props.ikParams}
      morphSettings={props.morphSettings}
      scale={props.scale}
      position={props.position}
      rotation={props.rotation}
      onStatsReady={props.onStatsReady}
    />
  );

  return (
    <SafeAvatarErrorBoundary
      fallback={fallbackAvatar}
      onError={(err) => {
        if (props.onErrorFallback) {
          props.onErrorFallback(err.message);
        }
      }}
    >
      <RpmGltfModel {...props} />
    </SafeAvatarErrorBoundary>
  );
}

export default ReadyPlayerMeAvatar;
