import * as THREE from 'three';

export interface GlbAutoRig {
  steerPivots: THREE.Group[];
  allWheels: THREE.Group[];
  doorLPivot: THREE.Group | null;
  doorRPivot: THREE.Group | null;
  hoodPivot: THREE.Group | null;
  steeringWheel: THREE.Object3D | null;
  headlights: THREE.SpotLight[];
  headlightFlares: THREE.PointLight[];
  emissiveMaterials: THREE.MeshStandardMaterial[];
  lightsGroup: THREE.Group;
}

/**
 * Automatischer High-Precision Rigger für den 2007 Jeep Wrangler Rubicon GLB:
 * Arbeitet zu 100% in echten Welt-Metern (World Space Meters).
 * Dadurch greifen alle geometrischen Filter (Breite, Raddurchmesser, Kreisform)
 * absolut fehlerfrei, unabhängig von lokalen Modell-Skalierungen oder Einheiten.
 */
export function autoRigGlbModel(scene: THREE.Group): GlbAutoRig {
  const steerPivots: THREE.Group[] = [];
  const allWheels: THREE.Group[] = [];
  const doorLPivot: THREE.Group | null = null;
  const doorRPivot: THREE.Group | null = null;
  const hoodPivot: THREE.Group | null = null;
  let steeringWheel: THREE.Object3D | null = null;
  const headlights: THREE.SpotLight[] = [];
  const headlightFlares: THREE.PointLight[] = [];
  const emissiveMaterials: THREE.MeshStandardMaterial[] = [];
  const lightsGroup = new THREE.Group();
  lightsGroup.name = 'AutoRigged_Lights';

  scene.updateMatrixWorld(true);
  const carBbox = new THREE.Box3().setFromObject(scene);
  const carSize = carBbox.getSize(new THREE.Vector3());
  const carCenter = carBbox.getCenter(new THREE.Vector3());

  // 1. Alle Meshes sammeln und Scheinwerfer scannen
  const allMeshes: THREE.Mesh[] = [];

  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      allMeshes.push(mesh);

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (mat && 'emissive' in mat) {
          const stdMat = mat as THREE.MeshStandardMaterial;
          const matName = (stdMat.name || '').toLowerCase();
          const nodeName = obj.name.toLowerCase();
          if (
            matName.includes('light') ||
            matName.includes('lamp') ||
            matName.includes('glass') ||
            matName.includes('lens') ||
            matName.includes('headlight') ||
            matName.includes('scheinwerfer') ||
            nodeName.includes('light') ||
            nodeName.includes('headlight')
          ) {
            stdMat.emissive = new THREE.Color('#fff4cc');
            stdMat.emissiveIntensity = 1.0;
            if (!emissiveMaterials.includes(stdMat)) {
              emissiveMaterials.push(stdMat);
            }
          }
        }
      });
    }

    const name = obj.name.toLowerCase();
    if (!steeringWheel && (name.includes('steer') || name.includes('lenkrad') || name.includes('volant'))) {
      steeringWheel = obj;
    }
  });

  // 2. Reine Rad-Meshes in absoluten Welt-Metern klassifizieren
  const candidateWheelsFL: THREE.Mesh[] = [];
  const candidateWheelsFR: THREE.Mesh[] = [];
  const candidateWheelsRL: THREE.Mesh[] = [];
  const candidateWheelsRR: THREE.Mesh[] = [];

  allMeshes.forEach((mesh) => {
    const meshName = mesh.name.toLowerCase();

    mesh.updateMatrixWorld(true);
    const mBox = new THREE.Box3().setFromObject(mesh);
    const mCenter = mBox.getCenter(new THREE.Vector3());
    const mSize = mBox.getSize(new THREE.Vector3());

    // Relative Position zum Fahrzeugzentrum in echten Metern
    const relX = mCenter.x - carCenter.x;
    const relY = mCenter.y - carBbox.min.y; // Höhe über dem Boden in Metern
    const relZ = mCenter.z - carCenter.z;

    // 1. Reserverad am Heck ausschließen (sitzt hinten oben)
    const isSpare = relZ < -carSize.z * 0.32 && relY > carSize.y * 0.28;
    if (isSpare || meshName.includes('spare') || meshName.includes('ersatz')) {
      return;
    }

    // 2. Geometrische Kriterien in echten Welt-Metern:
    // a) Schmale Breite entlang der X-Achse (max 38cm)
    const isNarrow = mSize.x <= 0.38;

    // b) Typischer Raddurchmesser (zwischen 15cm und 95cm)
    const isWheelDiameter =
      mSize.y >= 0.15 &&
      mSize.y <= 0.95 &&
      mSize.z >= 0.15 &&
      mSize.z <= 0.95;

    // c) Kreisrunde Proportion in der Y-Z Ebene (min / max >= 0.62)
    const maxYZ = Math.max(mSize.y, mSize.z);
    const minYZ = Math.min(mSize.y, mSize.z);
    const isCircular = maxYZ > 0.001 ? minYZ / maxYZ >= 0.62 : false;

    // d) Räumliche Lage im Radkasten (untere Hälfte, außen)
    const isLowWheelArea = relY <= carSize.y * 0.55;
    const isOuterSide = Math.abs(relX) >= carSize.x * 0.16;
    const isAxleZone = Math.abs(relZ) >= carSize.z * 0.06;

    const isGeometricWheel = isNarrow && isWheelDiameter && isCircular && isLowWheelArea && isOuterSide && isAxleZone;

    const isExplicitWheelName =
      (meshName.includes('wheel') ||
        meshName.includes('tire') ||
        meshName.includes('tyre') ||
        meshName.includes('rim') ||
        meshName.includes('rad') ||
        meshName.includes('felge') ||
        meshName.includes('caliper') ||
        meshName.includes('brake') ||
        meshName.includes('disc') ||
        meshName.includes('rubber')) &&
      isNarrow &&
      isLowWheelArea &&
      isOuterSide;

    if (isGeometricWheel || isExplicitWheelName) {
      const isFront = relZ >= 0;
      const isLeft = relX >= 0;

      if (isFront && isLeft) candidateWheelsFL.push(mesh);
      else if (isFront && !isLeft) candidateWheelsFR.push(mesh);
      else if (!isFront && isLeft) candidateWheelsRL.push(mesh);
      else candidateWheelsRR.push(mesh);
    }
  });

  // 3. 2-Stufen-Rad-Pivots aufbauen mit THREE.Object3D.attach()
  const setupWheelCorner = (
    wheelMeshes: THREE.Mesh[],
    namePrefix: string,
    isSteerable: boolean
  ) => {
    if (wheelMeshes.length === 0) return;

    scene.updateMatrixWorld(true);

    const combinedBox = new THREE.Box3();
    wheelMeshes.forEach((m) => combinedBox.union(new THREE.Box3().setFromObject(m)));
    const worldCenter = combinedBox.getCenter(new THREE.Vector3());
    const localCenter = scene.worldToLocal(worldCenter.clone());

    if (isSteerable) {
      // 1. Äußere Lenkgruppe (dreht um Y an der Radnabe)
      const steerGroup = new THREE.Group();
      steerGroup.name = `${namePrefix}_SteerGroup`;
      steerGroup.position.copy(localCenter);
      scene.add(steerGroup);

      // 2. Innere Rollgruppe (dreht um X an der Radnabe)
      const rollGroup = new THREE.Group();
      rollGroup.name = `${namePrefix}_RollGroup`;
      rollGroup.position.set(0, 0, 0);
      steerGroup.add(rollGroup);

      scene.updateMatrixWorld(true);
      wheelMeshes.forEach((mesh) => {
        mesh.matrixAutoUpdate = true;
        rollGroup.attach(mesh);
      });

      steerPivots.push(steerGroup);
      allWheels.push(rollGroup);
    } else {
      // Hinterräder: Nur Rollgruppe
      const rollGroup = new THREE.Group();
      rollGroup.name = `${namePrefix}_RollGroup`;
      rollGroup.position.copy(localCenter);
      scene.add(rollGroup);

      scene.updateMatrixWorld(true);
      wheelMeshes.forEach((mesh) => {
        mesh.matrixAutoUpdate = true;
        rollGroup.attach(mesh);
      });

      allWheels.push(rollGroup);
    }
  };

  setupWheelCorner(candidateWheelsFL, 'Wheel_FrontLeft', true);
  setupWheelCorner(candidateWheelsFR, 'Wheel_FrontRight', true);
  setupWheelCorner(candidateWheelsRL, 'Wheel_RearLeft', false);
  setupWheelCorner(candidateWheelsRR, 'Wheel_RearRight', false);

  // 4. Dynamische 3D-Scheinwerfer
  const frontZ = carBbox.max.z;
  const lampY = carBbox.min.y + carSize.y * 0.48;
  const halfWidth = carSize.x * 0.28;

  const spotL = new THREE.SpotLight('#fff4d6', 5.5, 35, Math.PI / 5, 0.45, 1.2);
  spotL.position.set(halfWidth, lampY, frontZ + 0.1);
  const targetL = new THREE.Object3D();
  targetL.position.set(halfWidth, lampY - 0.2, frontZ + 14);
  lightsGroup.add(targetL);
  spotL.target = targetL;
  spotL.castShadow = true;
  spotL.shadow.mapSize.width = 1024;
  spotL.shadow.mapSize.height = 1024;
  spotL.shadow.bias = -0.0005;
  lightsGroup.add(spotL);
  headlights.push(spotL);

  const flareL = new THREE.PointLight('#fff9e6', 2.0, 3.5);
  flareL.position.copy(spotL.position);
  lightsGroup.add(flareL);
  headlightFlares.push(flareL);

  const spotR = new THREE.SpotLight('#fff4d6', 5.5, 35, Math.PI / 5, 0.45, 1.2);
  spotR.position.set(-halfWidth, lampY, frontZ + 0.1);
  const targetR = new THREE.Object3D();
  targetR.position.set(-halfWidth, lampY - 0.2, frontZ + 14);
  lightsGroup.add(targetR);
  spotR.target = targetR;
  spotR.castShadow = true;
  spotR.shadow.mapSize.width = 1024;
  spotR.shadow.mapSize.height = 1024;
  spotR.shadow.bias = -0.0005;
  lightsGroup.add(spotR);
  headlights.push(spotR);

  const flareR = new THREE.PointLight('#fff9e6', 2.0, 3.5);
  flareR.position.copy(spotR.position);
  lightsGroup.add(flareR);
  headlightFlares.push(flareR);

  scene.add(lightsGroup);

  return {
    steerPivots,
    allWheels,
    doorLPivot,
    doorRPivot,
    hoodPivot,
    steeringWheel,
    headlights,
    headlightFlares,
    emissiveMaterials,
    lightsGroup,
  };
}
