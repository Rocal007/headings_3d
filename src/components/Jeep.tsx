import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  saveModelToCache,
  loadModelFromCache,
  clearModelCache,
  saveTextureToCache,
  loadTexturesForSlot,
  deleteTextureFromCache,
  clearAllTexturesForSlot,
  type CachedTextureRecord,
} from '../utils/modelCache';
import { autoRigGlbModel, applyBodyColorTint, type GlbAutoRig } from '../model/glbAutoRigger';
import {
  type VehicleSlot,
  DEFAULT_VEHICLE_SLOTS,
} from '../types/vehicleTypes';
import {
  createTextureFromFile,
  createTextureFromDataUrl,
  applyTextureSmart,
  applyTextureToModel,
  removeTextureFromModel,
  createCarbonFiberTexture,
  createCamoTexture,
  createMudSplatterTexture,
  createRacingLiveryTexture,
  type TextureMapType,
  type TextureTargetLayer,
  type AppliedTextureInfo,
} from '../materials/vehicleTextures';

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

const STORAGE_SLOTS_KEY = 'supertechno_vehicle_slots_v2';
const STORAGE_ACTIVE_SLOT_KEY = 'supertechno_active_vehicle_id_v2';

export function formatVehicleNameFromFileName(fileName: string): string {
  const baseName = fileName.replace(/\.(glb|gltf)$/i, '');
  const clean = baseName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return 'Benutzerdefiniertes Fahrzeug';

  return clean
    .split(' ')
    .map((word) => {
      if (/^\d+$/.test(word)) return word;
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

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
  const newSlotFileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);
  const textureFolderInputRef = useRef<HTMLInputElement>(null);

  // Multi-Vehicle Slots
  const [vehicleSlots, setVehicleSlots] = useState<VehicleSlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SLOTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load vehicle slots from storage:', e);
    }
    return DEFAULT_VEHICLE_SLOTS;
  });

  const [activeSlotId, setActiveSlotId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_SLOT_KEY);
      if (savedId) return savedId;
    } catch (e) {
      console.warn('Failed to load active slot from storage:', e);
    }
    return 'jeep_wrangler';
  });

  const activeSlot = vehicleSlots.find((s) => s.id === activeSlotId) || vehicleSlots[0];

  // Model-Zustände für aktiven Slot
  const [hasLoadedModel, setHasLoadedModel] = useState<boolean>(false);
  const [modelFileName, setModelFileName] = useState<string | null>(activeSlot.fileName || null);
  const [modelDimensions, setModelDimensions] = useState<{ length: number; width: number; height: number; triangles: number; meshes: number }>({
    length: activeSlot.targetLengthMeters || 4.22,
    width: 1.85,
    height: 1.78,
    triangles: 0,
    meshes: 0,
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Textur- & PBR-Map Zustände
  const [appliedTextures, setAppliedTextures] = useState<AppliedTextureInfo[]>([]);
  const [selectedMapType, setSelectedMapType] = useState<TextureMapType | 'auto'>('auto');
  const [selectedTargetLayer, setSelectedTargetLayer] = useState<TextureTargetLayer>('body');

  // Interaktive Kinematik-Zustände
  const [hoodOpen, setHoodOpen] = useState(false);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [steeringAngle, setSteeringAngle] = useState(0);
  const [envMode, setEnvMode] = useState<JeepEnvironmentMode>('dark_studio');
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeCam, setActiveCam] = useState<JeepCameraPresetId>('orbit');
  const [isDriving, setIsDriving] = useState(false);
  const [driveSpeed, setDriveSpeed] = useState(35);
  const [selectedColorTint, setSelectedColorTint] = useState<string>(activeSlot.colorTint || '#d95d1e');
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  // Synchronisations-Refs für 60fps Render-Loop
  const hoodRef = useRef(false);
  const headlightsRef = useRef(true);
  const steeringRef = useRef(0);
  const autoRotateRef = useRef(false);
  const activeCamRef = useRef<JeepCameraPresetId>('orbit');
  const isDrivingRef = useRef(false);
  const driveSpeedRef = useRef(35);

  const customRigRef = useRef<GlbAutoRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const vehicleWrapperRef = useRef<THREE.Group>(new THREE.Group());
  const standbyPedestalRef = useRef<THREE.Group>(new THREE.Group());

  useEffect(() => { hoodRef.current = hoodOpen; }, [hoodOpen]);
  useEffect(() => { headlightsRef.current = headlightsOn; }, [headlightsOn]);
  useEffect(() => { steeringRef.current = steeringAngle; }, [steeringAngle]);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { activeCamRef.current = activeCam; }, [activeCam]);
  useEffect(() => { isDrivingRef.current = isDriving; }, [isDriving]);
  useEffect(() => { driveSpeedRef.current = driveSpeed; }, [driveSpeed]);

  // Slots in LocalStorage sichern
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(vehicleSlots));
      localStorage.setItem(STORAGE_ACTIVE_SLOT_KEY, activeSlotId);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [vehicleSlots, activeSlotId]);

  // Bounding-Box Normalisierung & Skalierung auf Zielmaß
  const applyModelTransform = useCallback((rawScene: THREE.Group, targetLength: number) => {
    rawScene.position.set(0, 0, 0);
    rawScene.rotation.set(0, 0, 0);
    rawScene.scale.set(1, 1, 1);
    rawScene.updateMatrixWorld(true);

    const bbox = computeMeshBoundingBox(rawScene);
    const size = bbox.getSize(new THREE.Vector3());

    const longestAxis = Math.max(size.x, size.z, 0.001);
    const baseScale = targetLength / longestAxis;

    rawScene.scale.setScalar(baseScale);
    rawScene.updateMatrixWorld(true);

    const scaledBbox = computeMeshBoundingBox(rawScene);
    const scaledCenter = scaledBbox.getCenter(new THREE.Vector3());

    rawScene.position.x = -scaledCenter.x;
    rawScene.position.z = -scaledCenter.z;
    rawScene.position.y = -scaledBbox.min.y;

    const finalBbox = computeMeshBoundingBox(rawScene);
    const finalSize = finalBbox.getSize(new THREE.Vector3());
    return finalSize;
  }, []);

  // 3D-Standby-Podest erzeugen (falls kein GLB geladen ist)
  const buildStandbyPedestal = useCallback(() => {
    const group = standbyPedestalRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // 1. Zylindrisches High-Tech Podest
    const pedestalGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.15, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.35,
      metalness: 0.85,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = 0.075;
    pedestalMesh.receiveShadow = true;
    group.add(pedestalMesh);

    // 2. Leuchtender LED-Ring
    const ringGeo = new THREE.TorusGeometry(2.38, 0.025, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.15;
    group.add(ringMesh);

    // 3. Schwebende Fahrzeug-Drahtgitter-Silhouette
    const wireGeo = new THREE.BoxGeometry(1.8, 1.3, 3.8);
    const wireMat = new THREE.MeshBasicMaterial({
      color: '#c4a675',
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.y = 0.95;
    wireMesh.name = 'HologramWireframe';
    group.add(wireMesh);
  }, []);

  // Gespeicherte Texturen für den Slot laden und auf das 3D-Modell anwenden
  const restoreSlotTextures = useCallback(async (slot: VehicleSlot, rootGroup: THREE.Group) => {
    try {
      const records = await loadTexturesForSlot(slot.cacheKey);
      const appliedList: AppliedTextureInfo[] = [];

      for (const rec of records) {
        try {
          const tex = await createTextureFromDataUrl(rec.dataUrl, rec.mapType as TextureMapType);
          const matchResult = applyTextureSmart(
            rootGroup,
            tex,
            rec.fileName,
            rec.mapType as TextureMapType,
            rec.targetLayer as TextureTargetLayer
          );
          appliedList.push({
            id: rec.id,
            fileName: rec.fileName,
            mapType: rec.mapType as TextureMapType,
            targetLayer: rec.targetLayer as TextureTargetLayer,
            dataUrl: rec.dataUrl,
            matchedMaterials: matchResult.matchedMaterials,
            timestamp: rec.timestamp,
          });
        } catch (e) {
          console.warn('Could not restore texture:', rec.fileName, e);
        }
      }
      setAppliedTextures(appliedList);
    } catch (err) {
      console.warn('Failed to restore textures for slot:', slot.id, err);
      setAppliedTextures([]);
    }
  }, []);

  // GLB-Szene montieren & Auto-Rigging durchführen
  const mountParsedGlbScene = useCallback(
    (gltf: any, fileName: string, currentSlot: VehicleSlot) => {
      const loadedScene: THREE.Group = gltf.scene || gltf;
      setHasLoadedModel(true);
      standbyPedestalRef.current.visible = false;

      // GLTF Material Image Metadaten auf Three.js Materialien taggen für 100% exaktes Textur-Matching
      const json = gltf?.parser?.json;
      if (json && json.materials) {
        loadedScene.traverse((obj: THREE.Object3D) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat) => {
              if (!mat) return;
              const matDef = json.materials.find((m: any) => m.name === mat.name);
              if (matDef) {
                const pbr = matDef.pbrMetallicRoughness || {};
                if (pbr.baseColorTexture !== undefined) {
                  const t = json.textures?.[pbr.baseColorTexture.index];
                  const img = json.images?.[t?.source];
                  if (img?.name) mat.userData.gltfBaseImage = img.name;
                }
                if (matDef.normalTexture !== undefined) {
                  const t = json.textures?.[matDef.normalTexture.index];
                  const img = json.images?.[t?.source];
                  if (img?.name) mat.userData.gltfNormalImage = img.name;
                }
                if (matDef.occlusionTexture !== undefined) {
                  const t = json.textures?.[matDef.occlusionTexture.index];
                  const img = json.images?.[t?.source];
                  if (img?.name) mat.userData.gltfAoImage = img.name;
                }
              }
            });
          }
        });
      }

      if (customRigRef.current) {
        customRigRef.current.lightsGroup.clear();
        customRigRef.current = null;
      }

      while (vehicleWrapperRef.current.children.length > 0) {
        vehicleWrapperRef.current.remove(vehicleWrapperRef.current.children[0]);
      }
      vehicleWrapperRef.current.add(loadedScene);

      const targetLen = currentSlot.targetLengthMeters || 4.22;
      const finalSize = applyModelTransform(loadedScene, targetLen);
      const autoRig = autoRigGlbModel(loadedScene);
      customRigRef.current = autoRig;

      if (currentSlot.colorTint) {
        applyBodyColorTint(autoRig, currentSlot.colorTint);
      }

      restoreSlotTextures(currentSlot, loadedScene);

      setModelFileName(fileName);
      setModelDimensions({
        length: Math.max(finalSize.x, finalSize.z),
        width: Math.min(finalSize.x, finalSize.z),
        height: finalSize.y,
        triangles: autoRig.triangleCount,
        meshes: autoRig.meshCount,
      });
    },
    [applyModelTransform, restoreSlotTextures]
  );

  // Modell für den aktuellen Slot aus IndexedDB laden
  const loadSlotModel = useCallback(
    async (slot: VehicleSlot) => {
      buildStandbyPedestal();
      try {
        const cached = await loadModelFromCache(slot.cacheKey);
        if (cached) {
          const loader = new GLTFLoader();
          loader.parse(
            cached.data,
            '',
            (gltf) => {
              mountParsedGlbScene(gltf, cached.fileName, slot);
            },
            (err) => {
              console.warn(`Error parsing cached GLB for slot ${slot.id}:`, err);
              setHasLoadedModel(false);
              standbyPedestalRef.current.visible = true;
              while (vehicleWrapperRef.current.children.length > 0) {
                vehicleWrapperRef.current.remove(vehicleWrapperRef.current.children[0]);
              }
            }
          );
        } else {
          setHasLoadedModel(false);
          standbyPedestalRef.current.visible = true;
          while (vehicleWrapperRef.current.children.length > 0) {
            vehicleWrapperRef.current.remove(vehicleWrapperRef.current.children[0]);
          }
          setModelFileName(null);
        }
      } catch (err) {
        console.warn(`Failed to load model for slot ${slot.id}:`, err);
        setHasLoadedModel(false);
        standbyPedestalRef.current.visible = true;
      }
    },
    [buildStandbyPedestal, mountParsedGlbScene]
  );

  // Slot-Wechsel Handler
  const handleSelectSlot = (slotId: string) => {
    setActiveSlotId(slotId);
    const targetSlot = vehicleSlots.find((s) => s.id === slotId);
    if (targetSlot) {
      if (targetSlot.colorTint) {
        setSelectedColorTint(targetSlot.colorTint);
      }
      loadSlotModel(targetSlot);
    }
  };

  // Neues Fahrzeug-Slot direkt aus einer GLB-Datei erstellen & nach der Datei benennen
  const handleCreateSlotWithFile = async (file: File) => {
    const cleanName = formatVehicleNameFromFileName(file.name);
    const newSlotId = `custom_vehicle_${Date.now()}`;
    const newCacheKey = `vehicle_slot_custom_${Date.now()}`;
    const newSlot: VehicleSlot = {
      id: newSlotId,
      name: cleanName,
      category: '4x4 Offroad Custom',
      icon: '🚙',
      fileName: file.name,
      description: `${file.name} • 3D GLB Rig • 320 PS`,
      targetLengthMeters: 4.50,
      cacheKey: newCacheKey,
      colorTint: '#38bdf8',
      specs: {
        powerHp: 320,
        engine: '4x4 High-Torque V6/V8',
        drivetrain: 'Permanent AWD mit Differentialsperren',
        weightKg: 2050,
        groundClearanceMm: 280,
      },
      createdAt: Date.now(),
    };

    const updated = [...vehicleSlots, newSlot];
    setVehicleSlots(updated);
    setActiveSlotId(newSlot.id);

    const buffer = await file.arrayBuffer();
    try {
      await saveModelToCache(newCacheKey, buffer, file.name);
    } catch (err) {
      console.warn('Could not save to IndexedDB:', err);
    }

    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      '',
      (gltf) => {
        mountParsedGlbScene(gltf, file.name, newSlot);
        setToastMessage(`✨ Neues Fahrzeug '${cleanName}' aus GLB erstellt!`);
        setTimeout(() => setToastMessage(null), 4500);
      },
      (error) => {
        console.error('GLTF Parse Error:', error);
        setToastMessage(`❌ Fehler beim Parsen von ${file.name}`);
        setTimeout(() => setToastMessage(null), 4500);
      }
    );
  };

  const handleNewSlotFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleCreateSlotWithFile(file);
    e.target.value = '';
  };

  // Aktuellen oder ausgewählten Slot löschen
  const handleDeleteSlot = async (slotToDeleteId: string) => {
    const slot = vehicleSlots.find((s) => s.id === slotToDeleteId);
    if (!slot) return;

    try {
      await clearModelCache(slot.cacheKey);
      await clearAllTexturesForSlot(slot.cacheKey);
    } catch (e) {
      console.warn('Could not clear model/texture cache:', e);
    }

    if (vehicleSlots.length > 1) {
      const remaining = vehicleSlots.filter((s) => s.id !== slotToDeleteId);
      setVehicleSlots(remaining);
      const nextActiveId = slotToDeleteId === activeSlotId ? remaining[0].id : activeSlotId;
      handleSelectSlot(nextActiveId);
      setToastMessage(`🗑️ Fahrzeug '${slot.name}' gelöscht.`);
    } else {
      // Nur Modell leeren, wenn es der letzte Slot ist
      const resetSlot: VehicleSlot = {
        ...slot,
        name: 'Neues Fahrzeug (GLB)',
        fileName: undefined,
        description: 'Kein Modell geladen. Ziehe eine GLB-Datei hierher.',
      };
      setVehicleSlots([resetSlot]);
      setHasLoadedModel(false);
      setAppliedTextures([]);
      standbyPedestalRef.current.visible = true;
      while (vehicleWrapperRef.current.children.length > 0) {
        vehicleWrapperRef.current.remove(vehicleWrapperRef.current.children[0]);
      }
      setToastMessage(`🗑️ Modell aus '${slot.name}' gelöscht.`);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Benutzerdefinierte Texturen hochladen und intelligent anwenden
  const handleUploadTextureFiles = async (files: FileList | File[]) => {
    if (!hasLoadedModel && !vehicleWrapperRef.current.children.length) {
      setToastMessage('⚠️ Bitte zuerst ein 3D-Modell laden!');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const fileArray = Array.from(files);
    let successCount = 0;
    let totalMatchedMaterialsCount = 0;

    for (const file of fileArray) {
      try {
        const forcedType = selectedMapType === 'auto' ? undefined : selectedMapType;
        const result = await createTextureFromFile(file, forcedType);

        const matchResult = applyTextureSmart(
          vehicleWrapperRef.current,
          result.texture,
          result.fileName,
          forcedType,
          selectedTargetLayer
        );

        totalMatchedMaterialsCount += matchResult.matchedMaterials.length;

        const recId = `tex_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const record: CachedTextureRecord = {
          id: recId,
          slotKey: activeSlot.cacheKey,
          mapType: result.mapType,
          targetLayer: selectedTargetLayer,
          fileName: result.fileName,
          dataUrl: result.dataUrl,
          timestamp: Date.now(),
        };

        await saveTextureToCache(record);

        setAppliedTextures((prev) => [
          ...prev.filter((t) => !(t.fileName === result.fileName && t.mapType === result.mapType)),
          {
            id: recId,
            fileName: result.fileName,
            mapType: result.mapType,
            targetLayer: selectedTargetLayer,
            dataUrl: result.dataUrl,
            matchedMaterials: matchResult.matchedMaterials,
            timestamp: Date.now(),
          },
        ]);

        successCount++;
      } catch (err) {
        console.error('Texture upload error:', err);
      }
    }

    if (successCount > 0) {
      setToastMessage(`🖼️ ${successCount} Textur(en) auf ${totalMatchedMaterialsCount} Materialien von '${activeSlot.name}' gemappt!`);
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  // Prozedurale Textur-Presets anwenden
  const handleApplyProceduralTexture = (type: 'carbon' | 'camo' | 'mud' | 'racing') => {
    let tex: THREE.CanvasTexture;
    let label = '';

    if (type === 'carbon') {
      tex = createCarbonFiberTexture();
      label = 'Carbon-Gewebe';
    } else if (type === 'camo') {
      tex = createCamoTexture();
      label = 'Militär-Camo';
    } else if (type === 'mud') {
      tex = createMudSplatterTexture();
      label = 'Offroad-Schlamm';
    } else {
      tex = createRacingLiveryTexture(selectedColorTint || '#0284c7');
      label = 'Rallye-Racing';
    }

    applyTextureToModel(vehicleWrapperRef.current, tex, 'baseColor', selectedTargetLayer);
    setToastMessage(`✨ Preset '${label}' auf ${selectedTargetLayer.toUpperCase()} angewendet!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Einzelne Textur entfernen
  const handleRemoveTexture = async (tex: AppliedTextureInfo) => {
    removeTextureFromModel(vehicleWrapperRef.current, tex.mapType, tex.targetLayer, tex.matchedMaterials);
    try {
      await deleteTextureFromCache(tex.id);
    } catch (e) {
      console.warn('Could not delete texture from cache:', e);
    }
    setAppliedTextures((prev) => prev.filter((t) => t.id !== tex.id));
    setToastMessage(`🗑️ Textur '${tex.fileName}' entfernt.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Alle Texturen für das aktuelle Fahrzeug zurücksetzen
  const handleClearAllTextures = async () => {
    try {
      await clearAllTexturesForSlot(activeSlot.cacheKey);
      appliedTextures.forEach((tex) => {
        removeTextureFromModel(vehicleWrapperRef.current, tex.mapType, tex.targetLayer, tex.matchedMaterials);
      });
      setAppliedTextures([]);
      setToastMessage(`🧹 Alle Texturen für '${activeSlot.name}' zurückgesetzt.`);
    } catch (e) {
      console.warn('Could not clear textures:', e);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  // GLB-ArrayBuffer verarbeiten und für den aktiven Slot speichern (inklusive Auto-Benennung nach Datei!)
  const processAndSaveArrayBuffer = async (buffer: ArrayBuffer, fileName: string) => {
    try {
      await saveModelToCache(activeSlot.cacheKey, buffer, fileName);
    } catch (err) {
      console.warn('Could not save to IndexedDB:', err);
    }

    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      '',
      (gltf) => {
        const cleanName = formatVehicleNameFromFileName(fileName);
        const updatedSlot: VehicleSlot = {
          ...activeSlot,
          name: cleanName,
          fileName,
          description: `${fileName} • 3D GLB Rig • ${activeSlot.specs.powerHp} PS`,
        };
        setVehicleSlots((prev) => prev.map((s) => (s.id === activeSlot.id ? updatedSlot : s)));
        mountParsedGlbScene(gltf, fileName, updatedSlot);
        setToastMessage(`✅ Fahrzeug '${cleanName}' (${fileName}) geladen & gesichert!`);
        setTimeout(() => setToastMessage(null), 4500);
      },
      (error) => {
        console.error('GLTF Parse Error:', error);
        setToastMessage(`❌ Fehler beim Parsen von ${fileName}`);
        setTimeout(() => setToastMessage(null), 4500);
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
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const glbFile = files.find((f) => f.name.endsWith('.glb') || f.name.endsWith('.gltf'));
    const imageFiles = files.filter(
      (f) => /\.(png|jpe?g|webp|ktx2|bmp|svg)$/i.test(f.name) || f.type.startsWith('image/')
    );

    if (glbFile) {
      const buffer = await glbFile.arrayBuffer();
      await processAndSaveArrayBuffer(buffer, glbFile.name);
    }

    if (imageFiles.length > 0) {
      setTimeout(async () => {
        await handleUploadTextureFiles(imageFiles);
      }, glbFile ? 500 : 50);
    }
  };

  // Farb-Tönung ändern
  const handleColorChange = (hex: string) => {
    setSelectedColorTint(hex);
    if (customRigRef.current) {
      applyBodyColorTint(customRigRef.current, hex);
    }
    setVehicleSlots((prev) =>
      prev.map((s) => (s.id === activeSlot.id ? { ...s, colorTint: hex } : s))
    );
  };

  // Initialer Ladevorgang beim Start
  useEffect(() => {
    loadSlotModel(activeSlot);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Three.js 3D Scene Lifecycle
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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    let pmremGenerator: THREE.PMREMGenerator | null = null;
    let roomEnv: RoomEnvironment | null = null;
    try {
      pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      roomEnv = new RoomEnvironment();
      scene.environment = pmremGenerator.fromScene(roomEnv).texture;
    } catch (e) {
      console.warn('RoomEnvironment PMREM fallback in effect (WebGL restrictions):', e);
    }

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
      1.15
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      envMode === 'sahara_desert' ? '#fff3bf' : '#ffffff',
      3.2
    );
    sunLight.position.set(10, 14, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight('#74c0fc', 1.0);
    fillLight.position.set(-8, 6, -6);
    scene.add(fillLight);

    const topLight = new THREE.DirectionalLight('#ffffff', 1.2);
    topLight.position.set(0, 15, 0);
    scene.add(topLight);

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

    scene.add(vehicleWrapperRef.current);
    scene.add(standbyPedestalRef.current);

    let currentHoodAngle = 0;
    let wheelRotation = 0;

    let animFrameId: number;
    const timer = new THREE.Timer();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      timer.update();
      const delta = timer.getDelta();
      const elapsed = timer.getElapsed();

      // Standby-Hologramm Animation
      if (standbyPedestalRef.current.visible) {
        const wire = standbyPedestalRef.current.getObjectByName('HologramWireframe');
        if (wire) {
          wire.rotation.y = elapsed * 0.4;
          wire.position.y = 0.95 + Math.sin(elapsed * 2.5) * 0.05;
        }
      }

      // 1. Motorhaube Kinematik mit physikalischem Endanschlag bei 0°
      const targetHoodAngle = hoodRef.current ? -THREE.MathUtils.degToRad(58) : 0;
      currentHoodAngle += (targetHoodAngle - currentHoodAngle) * 6 * delta;

      if (!hoodRef.current && currentHoodAngle > -0.0005) {
        currentHoodAngle = 0;
      }
      const physicalHoodAngle = THREE.MathUtils.clamp(currentHoodAngle, -THREE.MathUtils.degToRad(60), 0);

      if (customRigRef.current?.hoodPivot) {
        customRigRef.current.hoodPivot.rotation.x = physicalHoodAngle;
      }

      // 2. Ackermann-Lenkung & Lenkrad
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

      // 3. 4x4 Allrad-Antrieb & Rotierende Räder
      if (isDrivingRef.current) {
        const speedMps = (driveSpeedRef.current * 1000) / 3600;
        const wheelCircumference = 2 * Math.PI * 0.42;
        const rotDelta = (speedMps / wheelCircumference) * (Math.PI * 2) * delta;
        wheelRotation += rotDelta;

        if (customRigRef.current) {
          customRigRef.current.allWheels.forEach((w) => {
            w.rotation.x = wheelRotation;
          });
        }

        const shake = Math.sin(elapsed * 24) * 0.003;
        vehicleWrapperRef.current.position.y = shake;
      } else {
        vehicleWrapperRef.current.position.y = 0;
      }

      // 4. Scheinwerfer & Lichter
      const hlOn = headlightsRef.current;
      if (customRigRef.current) {
        customRigRef.current.headlights.forEach((l) => { l.intensity = hlOn ? 5.5 : 0; });
        customRigRef.current.headlightFlares.forEach((f) => { f.intensity = hlOn ? 2.0 : 0; });
        customRigRef.current.emissiveMaterials.forEach((m) => { m.emissiveIntensity = hlOn ? 1.5 : 0.05; });
      }

      // 5. Auto-Rotate & Kamera
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
      camera.updateProjectionMatrix;
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      pmremGenerator?.dispose();
      roomEnv?.dispose();
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
            background: 'rgba(56, 189, 248, 0.25)',
            backdropFilter: 'blur(8px)',
            border: '4px dashed #38bdf8',
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
          <span style={{ fontSize: 52, marginBottom: 12 }}>📦</span>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {activeSlot.name} (.GLB / .GLTF) hier ablegen!
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            Wird automatisch geriggt und für diesen Slot dauerhaft gespeichert
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: 74,
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

      {/* 1. Header & Fahrzeug-Slot Umschalter (Links oben, unter Hauptnavigation) */}
      <div
        style={{
          position: 'absolute',
          top: 74,
          left: 20,
          background: 'rgba(11, 16, 24, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 14,
          padding: '10px 14px',
          color: '#f8fafc',
          boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
          fontFamily: '"Inter", system-ui, sans-serif',
          pointerEvents: 'auto',
          zIndex: 90,
          minWidth: 320,
          maxWidth: 'min(440px, calc(100vw - 40px))',
        }}
      >
        {/* Dropdown / Slot Quick Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <select
              value={activeSlotId}
              onChange={(e) => {
                if (e.target.value === '__add_new__') {
                  newSlotFileInputRef.current?.click();
                } else {
                  handleSelectSlot(e.target.value);
                }
              }}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#c4a675',
                border: '1px solid rgba(196, 166, 117, 0.45)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {vehicleSlots.map((slot) => (
                <option key={slot.id} value={slot.id} style={{ background: '#0b1018', color: '#f8fafc' }}>
                  {slot.icon} {slot.name}
                </option>
              ))}
              <option value="__add_new__" style={{ background: '#0b1018', color: '#38bdf8' }}>
                ➕ Neues GLB Fahrzeug erstellen...
              </option>
            </select>
          </div>

          <button
            onClick={() => newSlotFileInputRef.current?.click()}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px dashed rgba(56, 189, 248, 0.4)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Neues GLB-Modell laden (benennt das Fahrzeug automatisch nach der Datei)"
          >
            <span>➕</span>
            <span>Neues GLB</span>
          </button>

          <button
            onClick={() => handleDeleteSlot(activeSlot.id)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title={`Fahrzeug '${activeSlot.name}' löschen`}
          >
            <span>🗑️</span>
            <span>Löschen</span>
          </button>
        </div>

        {/* Specs & Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
            {activeSlot.description}
          </div>
          <span
            style={{
              background: hasLoadedModel ? 'rgba(34, 197, 94, 0.18)' : 'rgba(234, 179, 8, 0.18)',
              color: hasLoadedModel ? '#4ade80' : '#facc15',
              border: `1px solid ${hasLoadedModel ? '#22c55e55' : '#eab30855'}`,
              borderRadius: 6,
              padding: '2px 6px',
              fontSize: 10,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {hasLoadedModel ? '📦 GLB AKTIV' : '⚠️ KEIN GLB'}
          </span>
        </div>

        <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, display: 'flex', gap: 12 }}>
          <span>📏 {modelDimensions.length.toFixed(2)} m</span>
          <span>⚡ {activeSlot.specs.powerHp} PS</span>
          <span>⚖️ {activeSlot.specs.weightKg} kg</span>
        </div>
      </div>

      {/* 3. Kamera-Presets & GLB-Import Button (Rechts oben) */}
      <div
        style={{
          position: 'absolute',
          top: 74,
          right: 20,
          display: 'flex',
          gap: 6,
          background: 'rgba(11, 16, 24, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 12,
          padding: 6,
          zIndex: 90,
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
              <span style={{ display: window.innerWidth > 1080 ? 'inline' : 'none' }}>{cam.name}</span>
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
          title={`Eigenes GLB für '${activeSlot.name}' laden`}
        >
          <span>📂</span>
          <span>GLB</span>
        </button>

        <button
          onClick={() => textureFolderInputRef.current?.click()}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
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
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
          }}
          title="Ganzen Texturen-Ordner (z.B. textures/ mit 30+ Maps) mit 1 Klick laden & automatisch matchen"
        >
          <span>📁</span>
          <span>Ordner</span>
        </button>

        <button
          onClick={() => textureFileInputRef.current?.click()}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
          }}
          title={`Textur / PBR-Map für '${activeSlot.name}' laden (PNG, JPG, WebP)`}
        >
          <span>🖼️</span>
          <span>Textur</span>
        </button>
      </div>

      {/* 4. Leerer Slot Hinweis / Upload Aufforderung */}
      {!hasLoadedModel && (
        <div
          style={{
            position: 'absolute',
            top: '42%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(11, 16, 24, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 20,
            padding: '24px 32px',
            textAlign: 'center',
            color: '#f8fafc',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            pointerEvents: 'auto',
            zIndex: 80,
            maxWidth: 420,
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 8 }}>{activeSlot.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#c4a675' }}>
            {activeSlot.name}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 16px 0', lineHeight: 1.5 }}>
            Noch kein 3D-Modell für diesen Slot geladen. Ziehe eine <b>.GLB</b>-Datei hierher oder klicke auf den Button:
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 20px rgba(2, 132, 199, 0.5)',
            }}
          >
            <span>📂</span>
            <span>GLB / GLTF Modell laden</span>
          </button>
        </div>
      )}

      {/* 5. Steuer-Panel Toggle Button */}
      {!isDrawerOpen && (
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="drawer-toggle-btn"
          style={{
            position: 'absolute',
            bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            right: '20px',
            zIndex: 90,
            border: '1px solid rgba(196, 166, 117, 0.5)',
            color: '#c4a675',
          }}
          title="Fahrzeug-Kinematik öffnen"
          aria-label="Fahrzeug-Kinematik öffnen"
        >
          <span>🚙</span>
          <span>Kinematik & Setup</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>◀</span>
        </button>
      )}

      {/* 6. Steuer-Panel & Kinematik-Drawer (Slide-Out) */}
      <div
        className={`slide-drawer-right custom-scrollbar ${isDrawerOpen ? 'open' : 'closed'}`}
        style={{
          position: 'absolute',
          bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
          right: '20px',
          background: 'rgba(11, 16, 24, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 16,
          padding: '16px 18px',
          width: 'min(340px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          color: '#f8fafc',
          boxShadow: '0 16px 40px rgba(0,0,0,0.65)',
          fontFamily: '"Inter", system-ui, sans-serif',
          zIndex: 90,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#c4a675', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ⚙️ GLB Kinematik & Setup
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 4,
              color: '#94a3b8',
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Panel schließen"
          >
            ✕
          </button>
        </div>

        {/* Fahrzeug-Slots & Verwaltung */}
        <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>🚙 FAHRZEUG-SLOTS ({vehicleSlots.length})</div>
            <button
              onClick={() => newSlotFileInputRef.current?.click()}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px dashed rgba(56, 189, 248, 0.4)',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Neues Fahrzeug aus GLB erstellen"
            >
              ➕ Neues GLB
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
            {vehicleSlots.map((slot) => {
              const isSelected = slot.id === activeSlotId;
              return (
                <div
                  key={slot.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: 6,
                    background: isSelected ? 'rgba(196, 166, 117, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid #c4a675' : '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <button
                    onClick={() => handleSelectSlot(slot.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isSelected ? '#fde047' : '#e2e8f0',
                      fontSize: 11,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flex: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <span>{slot.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {slot.name}
                    </span>
                  </button>

                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 4,
                      color: '#f87171',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 5px',
                      marginLeft: 4,
                    }}
                    title={`Fahrzeug '${slot.name}' löschen`}
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lackierungs-Tönung */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 700 }}>🎨 Karosserie-Lackierung / Tönung</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[
              { label: '🟠 Orange', hex: '#d95d1e' },
              { label: '🔴 Red', hex: '#b91c1c' },
              { label: '🔵 Blue', hex: '#0284c7' },
              { label: '🟢 Olive', hex: '#3e4832' },
              { label: '🏜️ Sand', hex: '#c4a675' },
              { label: '⚫ Black', hex: '#141517' },
            ].map((c) => (
              <button
                key={c.hex}
                onClick={() => handleColorChange(c.hex)}
                style={{
                  padding: '6px 4px',
                  borderRadius: 6,
                  border: selectedColorTint === c.hex ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                  background: c.hex,
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Texturen & PBR-Maps */}
        <div style={{ marginBottom: 12, padding: '10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#c4a675', fontWeight: 800, textTransform: 'uppercase' }}>🖼️ Texturen & PBR-Maps</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => textureFolderInputRef.current?.click()}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 6px',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                title="Ganzen Ordner mit Texturen laden (z.B. textures/)"
              >
                <span>📁</span>
                <span>Ordner</span>
              </button>

              <button
                onClick={() => textureFileInputRef.current?.click()}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 6px',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                title="Einzelne Textur-Dateien hochladen (PNG, JPG, WebP)"
              >
                <span>➕</span>
                <span>Maps</span>
              </button>

              {appliedTextures.length > 0 && (
                <button
                  onClick={handleClearAllTextures}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 6,
                    padding: '4px 6px',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Alle zugewiesenen Texturen zurücksetzen"
                >
                  🧹 Reset
                </button>
              )}
            </div>
          </div>

          {/* Map-Typ & Ziel-Layer Wähler */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>MAP-TYP:</div>
              <select
                value={selectedMapType}
                onChange={(e) => setSelectedMapType(e.target.value as TextureMapType | 'auto')}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                <option value="auto">🔍 Auto-Erkennung (Smart)</option>
                <option value="baseColor">🎨 BaseColor (Diffuse)</option>
                <option value="normal">⚡ Normal Map</option>
                <option value="roughness">🌊 Roughness Map</option>
                <option value="metalness">✨ Metallic Map</option>
                <option value="emissive">💡 Emissive Map</option>
                <option value="ao">🌑 AO Map</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>ZIEL-LAYER / MODUS:</div>
              <select
                value={selectedTargetLayer}
                onChange={(e) => setSelectedTargetLayer(e.target.value as TextureTargetLayer)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                <option value="all">🌐 Smart Auto-Match (Empfohlen)</option>
                <option value="body">🚗 Karosserie (Body)</option>
                <option value="wheels">🛞 Räder & Felgen</option>
                <option value="interior">💺 Innenraum & Cockpit</option>
              </select>
            </div>
          </div>

          {/* Prozedurale Presets */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 3 }}>PROZEDURALE PRESETS:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
              <button
                onClick={() => handleApplyProceduralTexture('carbon')}
                style={{
                  padding: '4px 2px',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#18181b',
                  color: '#ffffff',
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Carbonfaser-Muster"
              >
                🏁 Carbon
              </button>
              <button
                onClick={() => handleApplyProceduralTexture('camo')}
                style={{
                  padding: '4px 2px',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#2d3b29',
                  color: '#ffffff',
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Militär Camouflage"
              >
                🌲 Camo
              </button>
              <button
                onClick={() => handleApplyProceduralTexture('mud')}
                style={{
                  padding: '4px 2px',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#452b14',
                  color: '#ffffff',
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Schlamm & Dreck"
              >
                🏜️ Schlamm
              </button>
              <button
                onClick={() => handleApplyProceduralTexture('racing')}
                style={{
                  padding: '4px 2px',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Rallye-Racing Streifen"
              >
                🏎️ Rallye
              </button>
            </div>
          </div>

          {/* Aktive Texturen Liste */}
          {appliedTextures.length > 0 && (
            <div style={{ marginTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: '#94a3b8' }}>AKTIVE TEXTUREN ({appliedTextures.length}):</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 110, overflowY: 'auto' }}>
                {appliedTextures.map((tex) => (
                  <div
                    key={tex.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '3px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: 10,
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190, color: '#cbd5e1' }}>
                      <span style={{ color: '#fde047', fontWeight: 800 }}>{tex.mapType.toUpperCase()}</span>: {tex.fileName}
                      {tex.matchedMaterials && tex.matchedMaterials.length > 0 && (
                        <div style={{ fontSize: 8, color: '#94a3b8' }}>
                          🎯 {tex.matchedMaterials.length} Mat: {tex.matchedMaterials.slice(0, 2).join(', ')}{tex.matchedMaterials.length > 2 ? '...' : ''}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveTexture(tex)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: '0 2px',
                        fontSize: 10,
                      }}
                      title="Textur entfernen"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Haube & Beleuchtung */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
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
            💡 {headlightsOn ? 'Licht An' : 'Licht Aus'}
          </button>
        </div>

        {/* 360° Orbit */}
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              width: '100%',
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
            🔄 {autoRotate ? 'Studio-Orbit Stoppen' : '360° Studio-Orbit Drehen'}
          </button>
        </div>

        {/* Lenkwinkel-Slider (Ackermann) */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#cbd5e1' }}>
            <span>🛞 Ackermann-Lenkung</span>
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

        {/* 4x4 Allrad-Fahrantrieb */}
        <div style={{ marginBottom: 12, padding: '8px 10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>🚙 4x4 Allradantrieb</span>
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
                max="100"
                value={driveSpeed}
                onChange={(e) => setDriveSpeed(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer', accentColor: '#10b981' }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#c4a675', minWidth: 42 }}>{driveSpeed} km/h</span>
            </div>
          )}
        </div>

        {/* Umgebungs-Wähler */}
        <div style={{ marginBottom: 12 }}>
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

        {/* Slot-Verwaltung */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
          <button
            onClick={() => handleDeleteSlot(activeSlot.id)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🗑️ Slot '{activeSlot.name}' löschen / leeren
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <input
        type="file"
        ref={newSlotFileInputRef}
        accept=".glb,.gltf"
        onChange={handleNewSlotFileUpload}
        style={{ display: 'none' }}
      />

      <input
        type="file"
        ref={textureFileInputRef}
        accept="image/*,.png,.jpg,.jpeg,.webp,.ktx2"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadTextureFiles(e.target.files);
            e.target.value = '';
          }
        }}
        style={{ display: 'none' }}
      />

      <input
        type="file"
        ref={textureFolderInputRef}
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadTextureFiles(e.target.files);
            e.target.value = '';
          }
        }}
        style={{ display: 'none' }}
      />

      {/* 7. Telemetrie-HUD (Links unten) */}
      <div
        className="hide-on-responsive"
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
          zIndex: 90,
        }}
      >
        <div style={{ color: '#c4a675', fontWeight: 900, marginBottom: 4 }}>
          [ GLB VEHICLE TELEMETRY: {activeSlot.name.toUpperCase()} ]
        </div>
        <div>DRIVE: {isDriving ? `🟢 4x4 ALL-WHEEL DRIVE (${driveSpeed} KM/H)` : '⚪ STATIONARY'}</div>
        <div>STEERING: {steeringAngle > 0 ? `+${steeringAngle}° R` : steeringAngle < 0 ? `${steeringAngle}° L` : '0° CTR'} (ACKERMANN)</div>
        <div>HOOD: {hoodOpen ? 'OPEN (EXPOSED)' : 'LATCHED (0.0°)'}</div>
        <div>LIGHTS: {headlightsOn ? 'ON (ACTIVE 3D BEAMS)' : 'OFF'}</div>
        <div>MODEL: {modelFileName || 'KEINE GLB GELADEN'} • {modelDimensions.length.toFixed(2)}m × {modelDimensions.width.toFixed(2)}m × {modelDimensions.height.toFixed(2)}m</div>
        <div>POLYCOUNT: {modelDimensions.triangles.toLocaleString()} DREIECKE • {modelDimensions.meshes} MESHES</div>
      </div>
    </div>
  );
}
