import * as THREE from 'three';
import { createKofferSideTexture } from '../materials/truckTextures';

/**
 * 📦 Subagent 22.3: `truck_box_body` (Kofferaufbau & Laderaum Master)
 * 
 * Zuständigkeit:
 * - 100% echter, physisch hohler Sandwich-Kofferaufbau ohne feste Heckwand
 * - 45mm GFK/Plywood-Sandwich-Seitenwände mit Panel-Nähten, Nieten und Alu-Scheuerleisten
 * - 27mm Siebdruck-Multiplex-Ladeboden mit Antirutsch-Struktur & Rammschutz
 * - 2-reihige Airline-Zurrschienen, Spanngurte mit Ratschen & Ladungssicherung
 * - Integrierte Decken-LED-Lichtbänder & offenes Heckportal
 * - Supertechno 50 Teleskopschienen, Flightcases mit Kugelecken & Krangezubehör
 * - Obere Heckportal-Klappe (Top Flap) mit Scharnierkinematik (schwenkt nach oben auf)
 */

export interface TruckBoxBodyParams {
  wheelbase?: number;
  frontAxleZ?: number;
  loadEdgeHeight?: number;
  paintMat?: THREE.Material;
  chassisMat?: THREE.Material;
  plasticMat?: THREE.Material;
  silverMat?: THREE.Material;
  darkTrimMat?: THREE.Material;
  interiorMat?: THREE.Material;
}

export interface TruckBoxBodyResult {
  boxGroup: THREE.Group;
  cargoGroup: THREE.Group;
  topFlapGroup: THREE.Group;
  kofferLength: number;
  kofferWidth: number;
  kofferHeight: number;
  loadEdgeHeight: number;
  kofferY: number;
  kofferZ: number;
  kofferBackZ: number;
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  };
}

export function createTruckBoxBody(params: TruckBoxBodyParams = {}): TruckBoxBodyResult {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const regGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometries.push(geo);
    return geo;
  };
  const regMat = <T extends THREE.Material>(mat: T): T => {
    materials.push(mat);
    return mat;
  };
  const regTex = <T extends THREE.Texture>(tex: T): T => {
    textures.push(tex);
    return tex;
  };

  // Standard-Materialien
  const silverMat = params.silverMat || regMat(new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.26, metalness: 0.92 }));
  const darkTrimMat = params.darkTrimMat || regMat(new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 0.72, metalness: 0.10 }));
  const interiorMat = params.interiorMat || regMat(new THREE.MeshStandardMaterial({ color: '#1a1e24', roughness: 0.82, metalness: 0.08 }));
  const paintMat = params.paintMat || regMat(new THREE.MeshPhysicalMaterial({ color: '#f8f9fa', roughness: 0.16, metalness: 0.14, clearcoat: 1.0, clearcoatRoughness: 0.05, ior: 1.5 }));

  // --- Geometrie Parameter (Echte Maße: MAN TGL 12.250 Kofferaufbau) ---
  const kofferLength = 8.25;   // Außenlänge (~8.050mm Innenmaß + 200mm Rahmen/Stirnwand)
  const kofferWidth = 2.57;    // Außenbreite (~2.470mm Innenmaß + 2x50mm Wand)
  const kofferHeight = 2.68;   // Außenhöhe (~2.580mm Innenmaß + Boden/Dach)
  const loadEdgeHeight = params.loadEdgeHeight ?? 1.02; // Ladekantenhöhe
  const kofferY = loadEdgeHeight + kofferHeight / 2;    // Koffer-Zentrum Y
  const frontAxleZ = params.frontAxleZ ?? 3.5;
  const kofferFrontZ = frontAxleZ - 1.2;                // Koffer beginnt kurz hinter der Vorderachse
  const kofferZ = kofferFrontZ - kofferLength / 2;      // Koffer-Zentrum Z
  const kofferBackZ = kofferZ - kofferLength / 2;       // Koffer-Heckkante Z (Offenes Portal)

  const wallThickness = 0.045; // 45mm Sandwich-Paneelstärke

  const boxGroup = new THREE.Group();

  // 1. Texturierte PBR-Materialien für die Kofferaußenwände (Feiner Gelcoat-Glanz & Reflexionsverhalten)
  const kofferSideTex = regTex(createKofferSideTexture());
  const boxMat = regMat(new THREE.MeshPhysicalMaterial({ 
    color: '#f8f9fa', 
    roughness: 0.22, 
    metalness: 0.08,
    clearcoat: 0.90,
    clearcoatRoughness: 0.10,
    ior: 1.48
  }));
  const boxSideMat = regMat(new THREE.MeshPhysicalMaterial({ 
    map: kofferSideTex, 
    roughness: 0.22, 
    metalness: 0.08,
    clearcoat: 0.90,
    clearcoatRoughness: 0.10,
    ior: 1.48
  }));

  // =========================================================================
  // 🏢 2. ECHTE HOHLWAND-KONSTRUKTION (SEPARATE WÄNDE, DACH, STIRNWAND)
  // =========================================================================
  
  // Linke Sandwich-Seitenwand (Fahrerseite)
  const sideWallGeo = regGeo(new THREE.BoxGeometry(wallThickness, kofferHeight, kofferLength));
  const leftWallMesh = new THREE.Mesh(sideWallGeo, boxSideMat);
  leftWallMesh.position.set(kofferWidth / 2 - wallThickness / 2, kofferY, kofferZ);
  leftWallMesh.castShadow = true;
  leftWallMesh.receiveShadow = true;

  // Rechte Sandwich-Seitenwand (Beifahrerseite)
  const rightWallMesh = new THREE.Mesh(sideWallGeo, boxSideMat);
  rightWallMesh.position.set(-kofferWidth / 2 + wallThickness / 2, kofferY, kofferZ);
  rightWallMesh.castShadow = true;
  rightWallMesh.receiveShadow = true;

  // GFK-Stirnwand zur Fahrerkabine (Front Bulkhead)
  const frontBulkheadGeo = regGeo(new THREE.BoxGeometry(kofferWidth, kofferHeight, wallThickness));
  const frontBulkheadMesh = new THREE.Mesh(frontBulkheadGeo, boxMat);
  frontBulkheadMesh.position.set(0, kofferY, kofferZ + kofferLength / 2 - wallThickness / 2);
  frontBulkheadMesh.castShadow = true;
  frontBulkheadMesh.receiveShadow = true;

  // GFK-Dachpaneel (Insulated Roof Shell)
  const roofPanelGeo = regGeo(new THREE.BoxGeometry(kofferWidth, 0.04, kofferLength));
  const roofPanelMesh = new THREE.Mesh(roofPanelGeo, boxMat);
  roofPanelMesh.position.set(0, kofferY + kofferHeight / 2 - 0.02, kofferZ);
  roofPanelMesh.castShadow = true;
  roofPanelMesh.receiveShadow = true;

  boxGroup.add(leftWallMesh, rightWallMesh, frontBulkheadMesh, roofPanelMesh);

  // 3. Umlaufende eloxierte Aluminium-Eckprofile (Front-Rahmen & Längsträger)
  const frontPostGeo = regGeo(new THREE.BoxGeometry(0.08, kofferHeight, 0.08));
  const frontPostL = new THREE.Mesh(frontPostGeo, silverMat);
  frontPostL.position.set(kofferWidth / 2 - 0.04, kofferY, kofferZ + kofferLength / 2 - 0.04);
  const frontPostR = new THREE.Mesh(frontPostGeo, silverMat);
  frontPostR.position.set(-kofferWidth / 2 + 0.04, kofferY, kofferZ + kofferLength / 2 - 0.04);

  const frontLintelGeo = regGeo(new THREE.BoxGeometry(kofferWidth, 0.08, 0.08));
  const frontLintel = new THREE.Mesh(frontLintelGeo, silverMat);
  frontLintel.position.set(0, kofferY + kofferHeight / 2 - 0.04, kofferZ + kofferLength / 2 - 0.04);

  boxGroup.add(frontPostL, frontPostR, frontLintel);

  // Längs-Dachkantenprofile (Alu-Dachrahmen)
  const roofRailGeo = regGeo(new THREE.BoxGeometry(0.06, 0.06, kofferLength));
  const roofRailL = new THREE.Mesh(roofRailGeo, silverMat);
  roofRailL.position.set(kofferWidth / 2, kofferY + kofferHeight / 2 - 0.02, kofferZ);
  const roofRailR = new THREE.Mesh(roofRailGeo, silverMat);
  roofRailR.position.set(-kofferWidth / 2, kofferY + kofferHeight / 2 - 0.02, kofferZ);
  boxGroup.add(roofRailL, roofRailR);

  // =========================================================================
  // 🚪 3. HECKER-LADERAUM (VOLLSTÄNDIG EINSEHBARER HOHLRAUM)
  // =========================================================================
  const cargoGroup = new THREE.Group();

  // 4. Siebdruck-Multiplex-Ladeboden (27mm Antirutsch)
  const cargoFloorGeo = regGeo(new THREE.BoxGeometry(kofferWidth - wallThickness * 2, 0.035, kofferLength - wallThickness));
  const cargoFloor = new THREE.Mesh(cargoFloorGeo, interiorMat);
  cargoFloor.position.set(0, loadEdgeHeight + 0.035, kofferZ + wallThickness / 2);
  cargoFloor.receiveShadow = true;

  // 5. Innenwand-Schutzverkleidungen & 300mm Aluminium-Scheuerleisten (Rammschutz)
  const interiorWallMat = regMat(new THREE.MeshStandardMaterial({ color: '#242b35', roughness: 0.85 }));
  const wallInnerGeo = regGeo(new THREE.BoxGeometry(0.015, kofferHeight - 0.12, kofferLength - wallThickness));
  
  const wallInnerLeft = new THREE.Mesh(wallInnerGeo, interiorWallMat);
  wallInnerLeft.position.set(kofferWidth / 2 - wallThickness - 0.008, kofferY, kofferZ + wallThickness / 2);
  const wallInnerRight = new THREE.Mesh(wallInnerGeo, interiorWallMat);
  wallInnerRight.position.set(-kofferWidth / 2 + wallThickness + 0.008, kofferY, kofferZ + wallThickness / 2);

  // Untere Aluminium-Rammschutzleisten (Scuff Plates am Boden)
  const scuffGeo = regGeo(new THREE.BoxGeometry(0.012, 0.32, kofferLength - wallThickness));
  const scuffL = new THREE.Mesh(scuffGeo, silverMat);
  scuffL.position.set(kofferWidth / 2 - wallThickness - 0.014, loadEdgeHeight + 0.18, kofferZ + wallThickness / 2);
  const scuffR = new THREE.Mesh(scuffGeo, silverMat);
  scuffR.position.set(-kofferWidth / 2 + wallThickness + 0.014, loadEdgeHeight + 0.18, kofferZ + wallThickness / 2);

  // 6. Zweireihige Airline-Zurrschienen an beiden Längswänden
  const lashingRailGeo = regGeo(new THREE.BoxGeometry(0.015, 0.065, kofferLength - wallThickness));
  
  // Untere Reihe (Höhe 800mm)
  const lashingL1 = new THREE.Mesh(lashingRailGeo, silverMat);
  lashingL1.position.set(kofferWidth / 2 - wallThickness - 0.014, loadEdgeHeight + 0.80, kofferZ + wallThickness / 2);
  const lashingR1 = new THREE.Mesh(lashingRailGeo, silverMat);
  lashingR1.position.set(-kofferWidth / 2 + wallThickness + 0.014, loadEdgeHeight + 0.80, kofferZ + wallThickness / 2);

  // Obere Reihe (Höhe 1600mm)
  const lashingL2 = new THREE.Mesh(lashingRailGeo, silverMat);
  lashingL2.position.set(kofferWidth / 2 - wallThickness - 0.014, loadEdgeHeight + 1.60, kofferZ + wallThickness / 2);
  const lashingR2 = new THREE.Mesh(lashingRailGeo, silverMat);
  lashingR2.position.set(-kofferWidth / 2 + wallThickness + 0.014, loadEdgeHeight + 1.60, kofferZ + wallThickness / 2);

  // 7. Heckportal-Rahmen (Massiver offener Aluminium-Rahmen OHNE Mittelplatte!)
  const portalPostL = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.08, kofferHeight, 0.08)), silverMat);
  portalPostL.position.set(kofferWidth / 2 - 0.04, kofferY, kofferBackZ);
  const portalPostR = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.08, kofferHeight, 0.08)), silverMat);
  portalPostR.position.set(-kofferWidth / 2 + 0.04, kofferY, kofferBackZ);
  const portalTop = new THREE.Mesh(regGeo(new THREE.BoxGeometry(kofferWidth, 0.08, 0.08)), silverMat);
  portalTop.position.set(0, kofferY + kofferHeight / 2 - 0.04, kofferBackZ);
  const portalSill = new THREE.Mesh(regGeo(new THREE.BoxGeometry(kofferWidth - 0.04, 0.04, 0.08)), silverMat);
  portalSill.position.set(0, loadEdgeHeight + 0.02, kofferBackZ);

  // 8. Flightcases & Ladungssicherung für Supertechno 50
  const caseMat = regMat(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7, metalness: 0.35 }));
  const caseCornerMat = regMat(new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.25, metalness: 0.9 }));
  
  const createFlightcase = (w: number, h: number, d: number, x: number, z: number) => {
    const cg = new THREE.Group();
    const body = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w, h, d)), caseMat);
    body.position.set(0, h / 2, 0);
    body.castShadow = true;

    // Aluminium-Schutzkanten
    const edgeProfile = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w + 0.02, 0.03, d + 0.02)), caseCornerMat);
    edgeProfile.position.set(0, h, 0);
    const edgeBase = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w + 0.02, 0.03, d + 0.02)), caseCornerMat);
    edgeBase.position.set(0, 0.02, 0);

    // Kugelecken (8x Kugeln an den Ecken)
    const ballGeo = regGeo(new THREE.SphereGeometry(0.032, 8, 8));
    for (let bx of [-w/2, w/2]) {
      for (let by of [0.02, h]) {
        for (let bz of [-d/2, d/2]) {
          const ball = new THREE.Mesh(ballGeo, caseCornerMat);
          ball.position.set(bx, by, bz);
          cg.add(ball);
        }
      }
    }

    // Butterfly-Verschluss an der Front
    const latchGeo = regGeo(new THREE.BoxGeometry(0.08, 0.08, 0.015));
    const latch = new THREE.Mesh(latchGeo, caseCornerMat);
    latch.position.set(0, h * 0.6, d / 2 + 0.008);

    cg.add(body, edgeProfile, edgeBase, latch);
    cg.position.set(x, loadEdgeHeight + 0.04, z);
    return cg;
  };

  // Case 1: Remote Camera Head & Mitchell Mount Flightcase
  const caseHead = createFlightcase(0.80, 0.70, 1.15, 0.65, kofferBackZ + 1.25);
  // Case 2: Master Wheels & FIZ Optics Flightcase
  const caseWheels = createFlightcase(0.80, 0.70, 1.15, -0.65, kofferBackZ + 1.25);
  // Case 3: Counterweight Lead Platten Schwerlast-Case
  const caseWeights = createFlightcase(1.45, 0.55, 0.90, 0.0, kofferBackZ + 2.90);
  // Case 4: Cine Lenses & Power Distribution Rack
  const caseRack = createFlightcase(0.95, 0.85, 0.65, 0.60, kofferBackZ + 4.40);

  // 9. Supertechno 50 Teleskopschienen auf dem Ladeboden (mittig verankert)
  const railTrackGeo = regGeo(new THREE.BoxGeometry(0.08, 0.06, 5.20));
  const railTrackL = new THREE.Mesh(railTrackGeo, silverMat);
  railTrackL.position.set(0.42, loadEdgeHeight + 0.06, kofferBackZ + 2.80);
  const railTrackR = new THREE.Mesh(railTrackGeo, silverMat);
  railTrackR.position.set(-0.42, loadEdgeHeight + 0.06, kofferBackZ + 2.80);

  // Spanngurte über den Schienen (Ratsche & Gurtband)
  const strapMat = regMat(new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.6 }));
  const strapGeo = regGeo(new THREE.BoxGeometry(1.20, 0.02, 0.05));
  const strap1 = new THREE.Mesh(strapGeo, strapMat);
  strap1.position.set(0, loadEdgeHeight + 0.12, kofferBackZ + 1.80);
  const strap2 = new THREE.Mesh(strapGeo, strapMat);
  strap2.position.set(0, loadEdgeHeight + 0.12, kofferBackZ + 3.80);

  // 10. Laderaum-Deckenbeleuchtung (Dual LED Light Strips)
  const ledStripGeo = regGeo(new THREE.BoxGeometry(0.08, 0.02, kofferLength - 0.60));
  const ledStripMat = regMat(new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#e0f2fe', emissiveIntensity: 3.5 }));
  
  const ledStripL = new THREE.Mesh(ledStripGeo, ledStripMat);
  ledStripL.position.set(0.60, kofferY + kofferHeight / 2 - 0.04, kofferZ);
  const ledStripR = new THREE.Mesh(ledStripGeo, ledStripMat);
  ledStripR.position.set(-0.60, kofferY + kofferHeight / 2 - 0.04, kofferZ);

  // 2x PointLights für fotorealistische Ausleuchtung des Frachtraums
  const cargoLightRear = new THREE.PointLight('#e0f2fe', 4.5, 10.0, 2);
  cargoLightRear.position.set(0, kofferY + kofferHeight / 2 - 0.20, kofferBackZ + 2.0);
  const cargoLightFront = new THREE.PointLight('#e0f2fe', 4.0, 10.0, 2);
  cargoLightFront.position.set(0, kofferY + kofferHeight / 2 - 0.20, kofferBackZ + 5.5);

  cargoGroup.add(
    cargoFloor, wallInnerLeft, wallInnerRight, scuffL, scuffR,
    lashingL1, lashingR1, lashingL2, lashingR2,
    portalPostL, portalPostR, portalTop, portalSill,
    caseHead, caseWheels, caseWeights, caseRack,
    railTrackL, railTrackR, strap1, strap2,
    ledStripL, ledStripR, cargoLightRear, cargoLightFront
  );
  boxGroup.add(cargoGroup);

  // =========================================================================
  // 🪟 11. OBERE HECKPORTAL-KLAPPE (TOP FLAP / ROLLER SHUTTER)
  // =========================================================================
  const topFlapGroup = new THREE.Group();
  topFlapGroup.position.set(0, kofferY + kofferHeight / 2 - 0.05, kofferBackZ);
  
  const topFlapMesh = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(kofferWidth - 0.08, 0.62, 0.05)),
    paintMat
  );
  topFlapMesh.position.set(0, -0.31, 0);

  const topFlapHandle = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.35, 0.04, 0.03)), darkTrimMat);
  topFlapHandle.position.set(0, -0.58, 0.035);

  // Gasdruckdämpfer links & rechts
  const damperGeo = regGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8));
  damperGeo.rotateX(Math.PI / 4);
  const damperL = new THREE.Mesh(damperGeo, silverMat);
  damperL.position.set(kofferWidth / 2 - 0.08, -0.20, 0.08);
  const damperR = new THREE.Mesh(damperGeo, silverMat);
  damperR.position.set(-kofferWidth / 2 + 0.08, -0.20, 0.08);

  topFlapGroup.add(topFlapMesh, topFlapHandle, damperL, damperR);
  boxGroup.add(topFlapGroup);

  return {
    boxGroup,
    cargoGroup,
    topFlapGroup,
    kofferLength,
    kofferWidth,
    kofferHeight,
    loadEdgeHeight,
    kofferY,
    kofferZ,
    kofferBackZ,
    disposables: {
      geometries,
      materials,
      textures,
    },
  };
}
