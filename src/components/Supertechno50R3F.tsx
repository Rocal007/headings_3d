import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import * as THREE from 'three';

export interface Kinematics {
  dollyTrack: number;
  columnLift: number;
  basePan: number;
  boomTilt: number;
  teleExtension: number;
  headPan: number;
  headTilt: number;
  headRoll: number;
}

interface Props {
  kinematicsRef: React.MutableRefObject<Kinematics>;
}

export default function Supertechno50R3F({ kinematicsRef }: Props) {
  // Load the FBX. useFBX uses Suspense under the hood.
  const fbx = useFBX('/models/ST50Plus_Textured.fbx');
  
  // Clone it so we don't mutate the cached version
  const clonedFbx = useMemo(() => fbx.clone(true), [fbx]);
  
  // Create a mapping of known nodes to easily access them in useFrame
  const nodes = useMemo(() => {
    const map: Record<string, THREE.Object3D> = {};
    
    // Improve materials for PBR rendering
    clonedFbx.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        if (mesh.material) {
          const makeShinier = (mat: THREE.Material) => {
             if ('shininess' in mat) (mat as any).shininess = 60;
             if ('roughness' in mat) (mat as any).roughness = 0.4;
             if ('metalness' in mat) (mat as any).metalness = 0.6;
          };
          
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(makeShinier);
          } else {
            makeShinier(mesh.material);
          }
        }
      }
      
      const name = child.name.toLowerCase();
      if (name.includes('base') || name.includes('dolly') || name.includes('track')) map.base = child;
      
      if (name.includes('column') || name.includes('lift')) {
        if (!map.column1) map.column1 = child;
        else if (!map.column2) map.column2 = child;
        else if (!map.column3) map.column3 = child;
      }
      if (name === 'jointcolumn1') map.column1 = child;
      if (name === 'jointcolumn2') map.column2 = child;
      if (name === 'jointcolumn3') map.column3 = child;
      
      if (name.includes('pan') && !name.includes('head')) map.basePan = child;
      if (name.includes('boom') || name.includes('tilt') && !name.includes('head')) map.boomTilt = child;
      
      if (name.includes('tele') || name.includes('arm')) {
         if (!map.arm1) map.arm1 = child;
         else if (!map.arm2) map.arm2 = child;
         else if (!map.arm3) map.arm3 = child;
      }
      
      if (name.includes('head') && name.includes('pan')) map.headPan = child;
      if (name.includes('head') && name.includes('tilt')) map.headTilt = child;
      if (name.includes('head') && name.includes('roll')) map.headRoll = child;
      if (name === 'jointhead') map.head = child;
    });
    
    return map;
  }, [clonedFbx]);

  useFrame(() => {
    const kin = kinematicsRef.current;
    
    if (nodes.base) {
      nodes.base.position.x = kin.dollyTrack;
    }
    
    if (nodes.basePan) {
      nodes.basePan.rotation.y = THREE.MathUtils.degToRad(-kin.basePan);
    }
    
    if (nodes.boomTilt) {
      nodes.boomTilt.rotation.x = THREE.MathUtils.degToRad(kin.boomTilt);
    }

    if (nodes.column1) nodes.column1.position.y = kin.columnLift / 3;
    if (nodes.column2) nodes.column2.position.y = kin.columnLift / 3;
    if (nodes.column3) nodes.column3.position.y = kin.columnLift / 3;

    const segStroke = kin.teleExtension / 3.0;
    if (nodes.arm1) nodes.arm1.position.z = segStroke;
    if (nodes.arm2) nodes.arm2.position.z = segStroke;
    if (nodes.arm3) nodes.arm3.position.z = segStroke;
    
    if (nodes.headPan) nodes.headPan.rotation.y = THREE.MathUtils.degToRad(-kin.headPan);
    if (nodes.headTilt) nodes.headTilt.rotation.x = THREE.MathUtils.degToRad(kin.headTilt);
    if (nodes.headRoll) nodes.headRoll.rotation.z = THREE.MathUtils.degToRad(kin.headRoll);
    
    if (nodes.head && !nodes.headPan && !nodes.headTilt && !nodes.headRoll) {
       nodes.head.rotation.set(
         THREE.MathUtils.degToRad(kin.headTilt),
         THREE.MathUtils.degToRad(-kin.headPan),
         THREE.MathUtils.degToRad(kin.headRoll)
       );
    }
  });

  // Scale down since standard FBX is often 100x larger (cm vs m)
  return <primitive object={clonedFbx} scale={0.01} />;
}
