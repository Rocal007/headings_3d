export interface RpmAvatarPreset {
  id: string;
  name: string;
  role: string;
  category: 'crane' | 'tennis' | 'truck' | 'director' | 'custom';
  url: string;
  description: string;
  icon: string;
  badgeColor: string;
  initialPose: AvatarPose;
}

export type AvatarPose = 
  | 'idle' 
  | 'walk' 
  | 'crane_rear' 
  | 'crane_desk' 
  | 'tennis_ready' 
  | 'tennis_serve' 
  | 'wave' 
  | 'dance' 
  | 'driving';

export interface AvatarMorphSettings {
  smile: number;
  blink: number;
  jawOpen: number;
  browUp: number;
  winkLeft: number;
  winkRight: number;
  autoBlink: boolean;
}

/**
 * Standard Ready Player Me CDN URLs with optimized parameters
 * Query parameters:
 * - morphTargets: ARKit (52 facial blendshapes), Oculus Visemes
 * - textureAtlas: 1024 (balanced for web performance)
 * - pose: T
 * - lod: 1
 */
export const RPM_PRESETS: RpmAvatarPreset[] = [
  {
    id: 'crane_operator_max',
    name: 'Max Lindemann',
    role: 'Kranführer (Heck-Operator)',
    category: 'crane',
    url: 'https://models.readyplayer.me/6460d35a9ae3d45ddfc82bff.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024',
    description: 'Erfahrener Supertechno 50 Operator mit Cap, Hoodie und Grip-Handschuhen.',
    icon: '🎬',
    badgeColor: '#e5c500',
    initialPose: 'crane_rear'
  },
  {
    id: 'dop_elena',
    name: 'Elena Vance',
    role: 'DoP & Head-Operatorin',
    category: 'director',
    url: 'https://models.readyplayer.me/6460d4b39ae3d45ddfc83120.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024',
    description: 'Kamera-Direktorin an den Master Wheels des Flightcase-Bodensteuerpults.',
    icon: '🎛️',
    badgeColor: '#38bdf8',
    initialPose: 'crane_desk'
  },
  {
    id: 'tennis_carlos',
    name: 'Carlos Rivera',
    role: 'ATP Tennis Pro',
    category: 'tennis',
    url: 'https://models.readyplayer.me/6460d3f89ae3d45ddfc82d56.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024',
    description: 'Athletischer Tennis-Champion für Aufschlag- und Smash-Duelle gegen den Kran.',
    icon: '🎾',
    badgeColor: '#4ade80',
    initialPose: 'tennis_ready'
  },
  {
    id: 'trucker_jake',
    name: 'Jake Sullivan',
    role: 'MAN TGL Logistik-Master',
    category: 'truck',
    url: 'https://models.readyplayer.me/6460d5369ae3d45ddfc8326a.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024',
    description: 'Schwerlast- und Equipment-Fahrer für den MAN TGL 12.250 Fuhrpark.',
    icon: '🚚',
    badgeColor: '#fb923c',
    initialPose: 'driving'
  },
  {
    id: 'cyber_neo',
    name: 'Neo Kusanagi',
    role: 'Virtual Production Lead',
    category: 'director',
    url: 'https://models.readyplayer.me/6460d5b59ae3d45ddfc833ec.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024',
    description: 'Cyberpunk Visionär für LED-Volume und Unreal Engine MoCo Tracking.',
    icon: '🕶️',
    badgeColor: '#ec4899',
    initialPose: 'idle'
  }
];

export const SAVED_RPM_URL_KEY = 'supertechno_rpm_custom_url';
export const SAVED_RPM_PRESET_KEY = 'supertechno_rpm_active_preset_id';
