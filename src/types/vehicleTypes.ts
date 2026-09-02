export interface VehicleSpecs {
  powerHp: number;
  engine: string;
  drivetrain: string;
  weightKg: number;
  groundClearanceMm: number;
}

export interface VehicleSlot {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  targetLengthMeters: number;
  cacheKey: string;
  fileName?: string;
  colorTint?: string;
  specs: VehicleSpecs;
  createdAt: number;
}

export const DEFAULT_VEHICLE_SLOTS: VehicleSlot[] = [
  {
    id: 'jeep_wrangler',
    name: 'Jeep Wrangler Rubicon',
    category: '4x4 Offroad SUV',
    icon: '🚙',
    description: '3.8L V6 EGH • Rock-Trac 4:1 4WD • Dana 44 Achsen • Tru-Lok',
    targetLengthMeters: 4.22,
    cacheKey: 'vehicle_slot_jeep_wrangler',
    fileName: '2007_jeep_wrangler_rubicon.glb',
    colorTint: '#d95d1e',
    specs: {
      powerHp: 205,
      engine: '3.8L V6 EGH SMPI',
      drivetrain: 'Rock-Trac 4WD (4:1 Low)',
      weightKg: 1815,
      groundClearanceMm: 260,
    },
    createdAt: 1,
  },
  {
    id: 'offroad_trophy_4x4',
    name: 'Offroad Trophy 4x4',
    category: 'Extreme Rock Crawler',
    icon: '🛻',
    description: '6.2L V8 Supercharged • Long-Travel Coilover • 37" All-Terrain',
    targetLengthMeters: 4.65,
    cacheKey: 'vehicle_slot_offroad_trophy_4x4',
    fileName: 'offroad_trophy_4x4.glb',
    colorTint: '#0284c7',
    specs: {
      powerHp: 480,
      engine: '6.2L V8 HEMI Supercharged',
      drivetrain: 'Permanent 4x4 mit Sperren',
      weightKg: 2150,
      groundClearanceMm: 340,
    },
    createdAt: 2,
  },
  {
    id: 'willys_recon_mb',
    name: 'Willys MB 1/4-Ton Recon',
    category: 'Militär-Klassiker',
    icon: '⭐',
    description: 'Go-Devil L134 4-Zylinder • T-84 3-Gang • Dana 25/27 Achsen',
    targetLengthMeters: 3.36,
    cacheKey: 'vehicle_slot_willys_recon_mb',
    fileName: 'willys_mb_recon_1944.glb',
    colorTint: '#3e4832',
    specs: {
      powerHp: 60,
      engine: '2.2L Willys Go-Devil L134',
      drivetrain: 'Zuschaltbarer Allrad (Spicer 18)',
      weightKg: 1040,
      groundClearanceMm: 220,
    },
    createdAt: 3,
  },
  {
    id: 'custom_slot_4',
    name: 'Custom GLB Fahrzeug 4',
    category: 'Benutzerdefiniertes GLB',
    icon: '📦',
    description: 'Eigener GLB / GLTF 3D-Fahrzeug-Import mit Auto-Rigging',
    targetLengthMeters: 4.50,
    cacheKey: 'vehicle_slot_custom_4',
    specs: {
      powerHp: 300,
      engine: 'Custom Powertrain',
      drivetrain: '4x4 / AWD',
      weightKg: 1900,
      groundClearanceMm: 250,
    },
    createdAt: 4,
  },
];
