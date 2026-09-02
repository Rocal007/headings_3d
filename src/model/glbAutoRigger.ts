import * as THREE from 'three';

export interface GlbAutoRig {
  steerPivots: THREE.Group[];
  allWheels: THREE.Group[];
  hoodPivot: THREE.Group | null;
  steeringWheel: THREE.Object3D | null;
  headlights: THREE.SpotLight[];
  headlightFlares: THREE.PointLight[];
  emissiveMaterials: THREE.MeshStandardMaterial[];
  bodyMaterials: THREE.MeshStandardMaterial[];
  lightsGroup: THREE.Group;
  meshCount: number;
  triangleCount: number;
  dimensions: THREE.Vector3;
}

/**
 * Wendet eine benutzerdefinierte Lackierung/Farbtonung auf alle erkannten Karosserie-Materialien an.
 */
export function applyBodyColorTint(autoRig: GlbAutoRig, colorHex: string): void {
  const targetColor = new THREE.Color(colorHex);
  autoRig.bodyMaterials.forEach((mat) => {
    mat.color.copy(targetColor);
    mat.needsUpdate = true;
  });
}

/**
 * Automatischer High-Precision Rigger für beliebige GLB-Fahrzeuge:
 * 1. Isoliert und riggt die 4 Räder (Felgen + Reifen) mit synchroner Lenkung & Rollen.
 * 2. Setzt Scheinwerfer-Spots, Flares und emissive Materialien.
 * 3. Erkennt Karosseriematerialien für Farbanpassungen.
 * 4. Liefert detaillierte Metriken (Meshes, Dreiecke, Maße).
 */
export function autoRigGlbModel(scene: THREE.Group): GlbAutoRig {
  const steerPivots: THREE.Group[] = [];
  const allWheels: THREE.Group[] = [];
  let hoodPivot: THREE.Group | null = null;
  let steeringWheel: THREE.Object3D | null = null;
  const headlights: THREE.SpotLight[] = [];
  const headlightFlares: THREE.PointLight[] = [];
  const emissiveMaterials: THREE.MeshStandardMaterial[] = [];
  const bodyMaterials: THREE.MeshStandardMaterial[] = [];
  const lightsGroup = new THREE.Group();
  lightsGroup.name = 'AutoRigged_Lights';

  scene.updateMatrixWorld(true);
  const carBbox = new THREE.Box3().setFromObject(scene);
  const carSize = carBbox.getSize(new THREE.Vector3());
  const carCenter = carBbox.getCenter(new THREE.Vector3());

  // 1. Alle Roh-Meshes sammeln und Scheinwerfer/Materialien scannen
  const rawMeshes: THREE.Mesh[] = [];
  let totalTriangles = 0;

  const modelStructureLog: Array<{
    name: string;
    parent: string;
    isMesh: boolean;
    triangles: number;
    sizeX: string;
    sizeY: string;
    sizeZ: string;
    relX: string;
    relY: string;
    relZ: string;
    material: string;
  }> = [];

  scene.traverse((obj) => {
    const isMesh = (obj as THREE.Mesh).isMesh;
    if (isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rawMeshes.push(mesh);

      mesh.updateMatrixWorld(true);
      const mBox = new THREE.Box3().setFromObject(mesh);
      const mCenter = mBox.getCenter(new THREE.Vector3());
      const mSize = mBox.getSize(new THREE.Vector3());

      const rX = mCenter.x - carCenter.x;
      const rY = mCenter.y - carBbox.min.y;
      const rZ = mCenter.z - carCenter.z;

      const triCount = (mesh.geometry?.index ? mesh.geometry.index.count : mesh.geometry?.attributes?.position?.count || 0) / 3;
      totalTriangles += Math.round(triCount);

      const matName = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.name || 'unnamed').join(', ')
        : mesh.material?.name || 'unnamed';

      modelStructureLog.push({
        name: obj.name || '(kein Name)',
        parent: obj.parent?.name || 'root',
        isMesh: true,
        triangles: Math.round(triCount),
        sizeX: mSize.x.toFixed(2),
        sizeY: mSize.y.toFixed(2),
        sizeZ: mSize.z.toFixed(2),
        relX: rX.toFixed(2),
        relY: rY.toFixed(2),
        relZ: rZ.toFixed(2),
        material: matName,
      });

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (mat && 'emissive' in mat) {
          const stdMat = mat as THREE.MeshStandardMaterial;
          const mName = (stdMat.name || '').toLowerCase();
          const nodeName = obj.name.toLowerCase();

          // 1. Scheinwerfer / Leuchtflächen erkennen
          if (
            mName.includes('light') ||
            mName.includes('lamp') ||
            mName.includes('lens') ||
            mName.includes('headlight') ||
            mName.includes('scheinwerfer') ||
            nodeName.includes('light') ||
            nodeName.includes('headlight')
          ) {
            stdMat.emissive = new THREE.Color('#fff4cc');
            stdMat.emissiveIntensity = 0.8;
            if (!emissiveMaterials.includes(stdMat)) {
              emissiveMaterials.push(stdMat);
            }
          }

          // 2. Glas / Scheiben / Scheinwerfergläser (Transparent & Reflektiv statt Vollweiß!)
          if (
            mName.includes('glass') ||
            mName.includes('windsh') ||
            mName.includes('window') ||
            mName.includes('fritte') ||
            mName.includes('scheibe') ||
            mName.includes('glas') ||
            nodeName.includes('glass') ||
            nodeName.includes('window')
          ) {
            if (!stdMat.map) {
              stdMat.color.set('#cbe4f4');
            }
            stdMat.transparent = true;
            stdMat.opacity = 0.32;
            stdMat.roughness = 0.05;
            stdMat.metalness = 0.15;
            stdMat.needsUpdate = true;
          }

          // 3. Reifen & Gummiteile (Dunkles PBR-Gummi statt Weiß!)
          else if (
            mName.includes('tyre') ||
            mName.includes('tire') ||
            mName.includes('wheel_b') ||
            mName.includes('rubber') ||
            mName.includes('reifen') ||
            nodeName.includes('tyre') ||
            nodeName.includes('tire')
          ) {
            if (!stdMat.map) {
              stdMat.color.set('#18191c');
            }
            stdMat.roughness = 0.85;
            stdMat.metalness = 0.05;
            stdMat.needsUpdate = true;
          }

          // 4. Felgen, Bremsscheiben & Metallteile (Silber-Metallic statt Weiß!)
          else if (
            mName.includes('rim') ||
            mName.includes('disk') ||
            mName.includes('disc') ||
            mName.includes('caliper') ||
            mName.includes('felge') ||
            nodeName.includes('rim') ||
            nodeName.includes('disk')
          ) {
            if (!stdMat.map) {
              stdMat.color.set('#c8cdd2');
            }
            stdMat.roughness = 0.28;
            stdMat.metalness = 0.85;
            stdMat.needsUpdate = true;
          }

          // 5. Chrom, Sterne, Embleme & Spiegel (Hochglanz-Chrom)
          else if (
            mName.includes('chrome') ||
            mName.includes('badge') ||
            mName.includes('emblem') ||
            mName.includes('mirror') ||
            mName.includes('stern')
          ) {
            if (!stdMat.map) {
              stdMat.color.set('#f1f5f9');
            }
            stdMat.roughness = 0.08;
            stdMat.metalness = 0.95;
            stdMat.needsUpdate = true;
          }

          // 6. Dunkler Kunststoff, Stoßstangen & Kühlergrill
          else if (
            mName.includes('plastic') ||
            mName.includes('bumper') ||
            mName.includes('grill') ||
            mName.includes('kühler') ||
            mName.includes('trim')
          ) {
            if (!stdMat.map) {
              stdMat.color.set('#222428');
            }
            stdMat.roughness = 0.75;
            stdMat.metalness = 0.10;
            stdMat.needsUpdate = true;
          }

          // 7. Innenraum, Sitze, Teppich, Leder
          else if (
            mName.includes('leather') ||
            mName.includes('interior') ||
            mName.includes('carpet') ||
            mName.includes('dash') ||
            mName.includes('seat') ||
            mName.includes('wood')
          ) {
            if (!stdMat.map) {
              stdMat.color.set('#1a1c1e');
            }
            stdMat.roughness = 0.80;
            stdMat.metalness = 0.05;
            stdMat.needsUpdate = true;
          }

          // 8. Karosserie-Lack-Materialien erkennen
          else if (
            (mName.includes('paint') ||
              mName.includes('body') ||
              mName.includes('car') ||
              mName.includes('lack') ||
              mName.includes('color') ||
              mName.includes('exterior') ||
              mName.includes('chassis') ||
              nodeName.includes('body') ||
              nodeName.includes('hood') ||
              nodeName.includes('karosserie')) &&
            !mName.includes('tire') &&
            !mName.includes('wheel') &&
            !mName.includes('glass') &&
            !mName.includes('interior') &&
            !mName.includes('seat')
          ) {
            if (!bodyMaterials.includes(stdMat)) {
              bodyMaterials.push(stdMat);
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

  // Struktur-Übersicht in der Entwicklerkonsole
  console.groupCollapsed(`🚗 [GLB MODELL INSPEKTOR] ${rawMeshes.length} Meshes in '${scene.name || 'Fahrzeug'}'`);
  console.log('Fahrzeug-Maße:', {
    laengeZ: carSize.z.toFixed(2) + ' m',
    breiteX: carSize.x.toFixed(2) + ' m',
    hoeheY: carSize.y.toFixed(2) + ' m',
    dreiecke: totalTriangles.toLocaleString(),
    zentrum: carCenter,
  });
  console.table(modelStructureLog);
  console.groupEnd();

  // 2. Räder an den 4 Ecken isolieren
  const candidateWheelsFL: THREE.Mesh[] = [];
  const candidateWheelsFR: THREE.Mesh[] = [];
  const candidateWheelsRL: THREE.Mesh[] = [];
  const candidateWheelsRR: THREE.Mesh[] = [];
  const riggedWheelMeshes = new Set<THREE.Mesh>();

  rawMeshes.forEach((mesh) => {
    const meshName = mesh.name.toLowerCase();

    mesh.updateMatrixWorld(true);
    const mBox = new THREE.Box3().setFromObject(mesh);
    const mCenter = mBox.getCenter(new THREE.Vector3());

    const relY = mCenter.y - carBbox.min.y;
    const relZ = mCenter.z - carCenter.z;

    // Reserverad am Heck ausschließen
    const isSpare = relZ < -carSize.z * 0.32 && relY > carSize.y * 0.28;
    if (isSpare || meshName.includes('spare') || meshName.includes('ersatz')) {
      return;
    }

    const mSize = mBox.getSize(new THREE.Vector3());
    const relX = mCenter.x - carCenter.x;

    // Geometrische Kriterien für Räder (Reifen, Felgen, Bremsen)
    const isNarrow = mSize.x <= 0.42;
    const isWheelDiameter =
      mSize.y >= 0.15 &&
      mSize.y <= 1.10 &&
      mSize.z >= 0.15 &&
      mSize.z <= 1.10;

    const maxYZ = Math.max(mSize.y, mSize.z);
    const minYZ = Math.min(mSize.y, mSize.z);
    const isCircular = maxYZ > 0.001 ? minYZ / maxYZ >= 0.60 : false;

    const isLowWheelArea = relY <= carSize.y * 0.60;
    const isOuterSide = Math.abs(relX) >= carSize.x * 0.15;
    const isAxleZone = Math.abs(relZ) >= carSize.z * 0.05;

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
      riggedWheelMeshes.add(mesh);
      const isFront = relZ >= 0;
      const isLeft = relX >= 0;

      if (isFront && isLeft) candidateWheelsFL.push(mesh);
      else if (isFront && !isLeft) candidateWheelsFR.push(mesh);
      else if (!isFront && isLeft) candidateWheelsRL.push(mesh);
      else candidateWheelsRR.push(mesh);
    }
  });

  // 3. 2-Stufen-Rad-Pivots aufbauen
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
      const steerGroup = new THREE.Group();
      steerGroup.name = `${namePrefix}_SteerGroup`;
      steerGroup.position.copy(localCenter);
      scene.add(steerGroup);

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

  // 4. Motorhaube isolieren & am hinteren Scharnier riggen
  const hoodMeshes = rawMeshes.filter((m) => {
    const name = m.name.toLowerCase();
    const parentName = (m.parent?.name || '').toLowerCase();
    return name.includes('hood') || name.includes('haube') || parentName.includes('hood');
  });

  if (hoodMeshes.length > 0) {
    scene.updateMatrixWorld(true);
    const hoodBox = new THREE.Box3();
    hoodMeshes.forEach((m) => hoodBox.union(new THREE.Box3().setFromObject(m)));

    const hingeWorld = new THREE.Vector3(
      hoodBox.getCenter(new THREE.Vector3()).x,
      hoodBox.max.y,
      hoodBox.min.z
    );
    const localHinge = scene.worldToLocal(hingeWorld.clone());

    const hoodGroup = new THREE.Group();
    hoodGroup.name = 'Hood_HingePivot';
    hoodGroup.position.copy(localHinge);
    scene.add(hoodGroup);

    scene.updateMatrixWorld(true);
    hoodMeshes.forEach((mesh) => {
      mesh.matrixAutoUpdate = true;
      hoodGroup.attach(mesh);
    });

    hoodPivot = hoodGroup;
  }

  // 5. Dynamische 3D-Scheinwerfer & Lichtkegel
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
    hoodPivot,
    steeringWheel,
    headlights,
    headlightFlares,
    emissiveMaterials,
    bodyMaterials,
    lightsGroup,
    meshCount: rawMeshes.length,
    triangleCount: totalTriangles,
    dimensions: carSize,
  };
}
