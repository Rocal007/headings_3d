export type ContainerColorId = 'anthracite' | 'corten' | 'white' | 'cyber' | 'custom';

export interface ContainerColorOption {
  id: ContainerColorId;
  name: string;
  hex: string;
  roughness: number;
  metalness: number;
  description: string;
  borderHex: string;
}

export const CONTAINER_COLOR_OPTIONS: Record<ContainerColorId, ContainerColorOption> = {
  anthracite: {
    id: 'anthracite',
    name: 'Anthrazit Matt (RAL 7016)',
    hex: '#1f2429',
    roughness: 0.65,
    metalness: 0.45,
    description: 'Original Matt-Anthrazit des Wiener Galerie-Pavillons',
    borderHex: '#38424d',
  },
  corten: {
    id: 'corten',
    name: 'Corten-Stahl / Rost',
    hex: '#7c3f25',
    roughness: 0.88,
    metalness: 0.25,
    description: 'Industrieller Edelrost mit organischer Patina',
    borderHex: '#a0522d',
  },
  white: {
    id: 'white',
    name: 'Reinweiß (RAL 9010)',
    hex: '#e2e8f0',
    roughness: 0.4,
    metalness: 0.2,
    description: 'Minimalistischer White-Cube Pavillon',
    borderHex: '#cbd5e1',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Noir & Neon',
    hex: '#0a0d14',
    roughness: 0.3,
    metalness: 0.85,
    description: 'High-Tech Metallic mit Cyan & Amber Akzenten',
    borderHex: '#00dcff',
  },
  custom: {
    id: 'custom',
    name: 'Benutzerdefinierter Ton',
    hex: '#2b3748',
    roughness: 0.6,
    metalness: 0.4,
    description: 'Individuelle Farbanpassung über RGB-Wähler',
    borderHex: '#4a5d78',
  },
};

export type ContainerStackMode = 'double_stack' | 'single_story' | 'cantilever_offset' | 'side_by_side';

export interface ContainerStackOption {
  id: ContainerStackMode;
  name: string;
  icon: string;
  description: string;
}

export const CONTAINER_STACK_OPTIONS: Record<ContainerStackMode, ContainerStackOption> = {
  double_stack: {
    id: 'double_stack',
    name: '2-Story Double Stack',
    icon: '🏢',
    description: 'Klassischer zweistöckiger Kunstpavillon (wie Referenzfoto)',
  },
  single_story: {
    id: 'single_story',
    name: 'Single 20ft Pavillon (EG)',
    icon: '📦',
    description: 'Kompakter eingeschossiger Showroom mit Panorama-Glas',
  },
  cantilever_offset: {
    id: 'cantilever_offset',
    name: 'L-Shape / 1.5m Auskragung',
    icon: '🏗️',
    description: 'Architektonischer Überhang mit überdachtem Eingangsbereich',
  },
  side_by_side: {
    id: 'side_by_side',
    name: 'Side-by-Side (Breiter Raum)',
    icon: '↔️',
    description: '2 Container parallel nebeneinander für doppelte Galeriefläche',
  },
};

export type GalleryCameraId = 
  | 'free'
  | 'front'
  | 'rear'
  | 'hero' 
  | 'interior_eg' 
  | 'interior_og' 
  | 'side' 
  | 'drone' 
  | 'orbit';

export interface GalleryCameraPreset {
  id: GalleryCameraId;
  name: string;
  icon: string;
  description: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const GALLERY_CAMERA_PRESETS: Record<GalleryCameraId, GalleryCameraPreset> = {
  free: {
    id: 'free',
    name: '🎬 Freie Regie (Unbegrenzt)',
    icon: '🎬',
    description: 'Vollkommen freie 3D-Kameraführung per Maus/Touch (Pan, Orbit, Zoom & Walk-In)',
    position: [7.2, 3.2, 8.2],
    target: [0, 2.2, 0],
    fov: 42,
  },
  front: {
    id: 'front',
    name: '🏛️ Frontportal (Vorne)',
    icon: '🏛️',
    description: 'Orthogonaler frontaler Blick auf Glas- & Stahltür-Wechselarchitektur (Vorne)',
    position: [9.6, 2.6, 0.0],
    target: [0.0, 2.6, 0.0],
    fov: 34,
  },
  rear: {
    id: 'rear',
    name: '🚪 Heckportal (Hinten)',
    icon: '🚪',
    description: 'Orthogonaler Blick auf die hinteren Glas- & Stahltüren (Rückseite)',
    position: [-9.6, 2.6, 0.0],
    target: [0.0, 2.6, 0.0],
    fov: 34,
  },
  hero: {
    id: 'hero',
    name: 'Front 3/4 Hero Shot',
    icon: '👑',
    description: 'Klassische 3/4 Studio-Perspektive mit Fokus auf Glasfront & Containerstruktur',
    position: [6.8, 2.6, 7.8],
    target: [0, 2.4, 0],
    fov: 40,
  },
  interior_eg: {
    id: 'interior_eg',
    name: 'EG Galerie Walk-In',
    icon: '🚶‍♂️',
    description: 'Erdgeschoss-Innenraum mit Blick auf Kunstwerke und Ausstellungsflächen',
    position: [0.8, 1.45, 1.8],
    target: [-1.8, 1.4, -1.2],
    fov: 65,
  },
  interior_og: {
    id: 'interior_og',
    name: '1. OG Fenster-Ausblick',
    icon: '🖼️',
    description: 'Obergeschoss-Ausstellungsraum mit Blick durch die Panorama-Glasfassade',
    position: [1.2, 4.05, 1.6],
    target: [-2.0, 3.9, -1.0],
    fov: 62,
  },
  side: {
    id: 'side',
    name: 'Seitenprofil (6.06m)',
    icon: '📐',
    description: 'Orthogonale Seitenansicht der 2-stöckigen Container-Silhouette',
    position: [11.5, 2.5, 0],
    target: [0, 2.5, 0],
    fov: 36,
  },
  drone: {
    id: 'drone',
    name: 'Drohne Draufsicht',
    icon: '🛸',
    description: 'Senkrechte Vogelperspektive auf Drehteller & Containerdach',
    position: [0.1, 14.5, 0.1],
    target: [0, 0, 0],
    fov: 42,
  },
  orbit: {
    id: 'orbit',
    name: '360° Studio Orbit (Frei)',
    icon: '🌟',
    description: 'Rundumperspektive mit flüssiger 360°-Freirotation um den Drehteller',
    position: [8.5, 4.5, 8.5],
    target: [0, 2.6, 0],
    fov: 40,
  },
};

export type GalleryEnvironmentId = 
  | 'dark_studio' 
  | 'bright_studio' 
  | 'cyber_studio' 
  | 'warm_studio'
  | 'votivkirche';

export interface GalleryEnvironmentOption {
  id: GalleryEnvironmentId;
  name: string;
  icon: string;
  description: string;
  skyColor: string;
  groundColor: string;
  sunIntensity: number;
  ambientIntensity: number;
  sunPosition: [number, number, number];
  isDark: boolean;
}

export const GALLERY_ENVIRONMENTS: Record<GalleryEnvironmentId, GalleryEnvironmentOption> = {
  dark_studio: {
    id: 'dark_studio',
    name: 'Dark Tech Studio (wie LKW)',
    icon: '⭕',
    description: 'Eleganter dunkler Showroom mit Leuchtring-Drehteller & Studio-Softboxen',
    skyColor: '#0a0e14',
    groundColor: '#161c24',
    sunIntensity: 2.2,
    ambientIntensity: 0.85,
    sunPosition: [12, 18, 12],
    isDark: true,
  },
  bright_studio: {
    id: 'bright_studio',
    name: 'White High-Key Studio',
    icon: '💡',
    description: 'Minimalistischer weißer Endlos-Showroom für puren Designfokus',
    skyColor: '#f8fafc',
    groundColor: '#cbd5e1',
    sunIntensity: 2.0,
    ambientIntensity: 1.2,
    sunPosition: [10, 20, 10],
    isDark: false,
  },
  cyber_studio: {
    id: 'cyber_studio',
    name: 'Cyber Noir & Neon Glow',
    icon: '🌌',
    description: 'Futuristischer dunkler Raum mit intensivem Cyan & Amber Leuchtring',
    skyColor: '#050811',
    groundColor: '#0f172a',
    sunIntensity: 1.6,
    ambientIntensity: 0.6,
    sunPosition: [0, 18, 10],
    isDark: true,
  },
  warm_studio: {
    id: 'warm_studio',
    name: 'Warm Amber Studio',
    icon: '🌅',
    description: 'Warme Studioatmosphäre mit weichen Reflexionen auf Glas & Stahl',
    skyColor: '#181210',
    groundColor: '#291b15',
    sunIntensity: 2.0,
    ambientIntensity: 0.8,
    sunPosition: [12, 16, 12],
    isDark: true,
  },
  votivkirche: {
    id: 'votivkirche',
    name: 'Wiener Votivkirche & Sigmund-Freud-Park',
    icon: '🏛️',
    description: 'Originaler historischer Platz der Fotoreferenz vor der neugotischen Kathedrale in Wien',
    skyColor: '#87ceeb',
    groundColor: '#d6c7a1',
    sunIntensity: 2.5,
    ambientIntensity: 1.1,
    sunPosition: [14, 22, 16],
    isDark: false,
  },
};

export type ArtExhibitionId = 'abstract' | 'supertechno_cine' | 'bauhaus' | 'sculptures';

export interface ArtItem {
  id: string;
  floor: 'EG' | 'OG';
  title: string;
  artist: string;
  year: string;
  medium: string;
  dimensions: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  patternType: 'geometric' | 'gradient' | 'minimalist' | 'cinema' | 'sculpture';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface ArtCollection {
  id: ArtExhibitionId;
  name: string;
  curator: string;
  theme: string;
  icon: string;
  description: string;
  artworks: ArtItem[];
}

export const ART_COLLECTIONS: Record<ArtExhibitionId, ArtCollection> = {
  abstract: {
    id: 'abstract',
    name: 'Chroma & Form: Zeitgenössische Abstraktion',
    curator: 'Dr. Elena Rostova',
    theme: 'Farbfeldmalerei und strukturelle Spannung',
    icon: '🎨',
    description: 'Großformatige abstrakte Werke mit leuchtenden Farbfeldern und dynamischen Kontrasten.',
    artworks: [
      {
        id: 'art_eg_1',
        floor: 'EG',
        title: 'Resonanz in Ultramarin & Ocker',
        artist: 'Viktor Lindqvist',
        year: '2025',
        medium: 'Öl und Acryl auf belgischem Leinen',
        dimensions: '180 × 120 cm',
        description: 'Vielschichtige Lasurtechnik mit vibrierenden Farbübergängen.',
        primaryColor: '#1d4ed8',
        accentColor: '#eab308',
        patternType: 'gradient',
        position: [1.15, 1.45, -1.06],
        rotation: [0, 0, 0],
        scale: [1.6, 1.2, 0.05],
      },
      {
        id: 'art_eg_2',
        floor: 'EG',
        title: 'Geometrische Konvergenz #4',
        artist: 'Sarah Benali',
        year: '2024',
        medium: 'Pigmentdruck & Schellack auf Holz',
        dimensions: '140 × 90 cm',
        description: 'Strenge mathematische Gliederung mit dezenten Goldpartikeln.',
        primaryColor: '#0f172a',
        accentColor: '#f43f5e',
        patternType: 'geometric',
        position: [0.6, 1.45, -0.98],
        rotation: [0, 0, 0],
        scale: [1.2, 1.0, 0.05],
      },
      {
        id: 'art_og_1',
        floor: 'OG',
        title: 'Lichtbrechung im Zenit',
        artist: 'Mateo Morales',
        year: '2026',
        medium: 'Mischtechnik mit Quarzsand',
        dimensions: '200 × 130 cm',
        description: 'Reliefartige Textur, die auf wechselnden Lichteinfall reagiert.',
        primaryColor: '#059669',
        accentColor: '#38bdf8',
        patternType: 'gradient',
        position: [-1.15, 4.05, -1.06],
        rotation: [0, 0, 0],
        scale: [1.8, 1.2, 0.05],
      },
      {
        id: 'art_og_2',
        floor: 'OG',
        title: 'Monolithischer Horizont',
        artist: 'Clara Weiß',
        year: '2025',
        medium: 'Graphit & Blattgold auf Büttenpapier',
        dimensions: '120 × 120 cm',
        description: 'Meditation über Raum, Tiefe und Stille im städtischen Kontext.',
        primaryColor: '#18181b',
        accentColor: '#fbbf24',
        patternType: 'minimalist',
        position: [0.8, 4.05, -0.98],
        rotation: [0, 0, 0],
        scale: [1.1, 1.1, 0.05],
      },
    ],
  },
  supertechno_cine: {
    id: 'supertechno_cine',
    name: 'Cine-Kinematik: 50ft In Motion',
    curator: 'Markus von Berg',
    theme: 'Hollywood Kameratechnik & Technocrane Fotografie',
    icon: '🎥',
    description: 'Großformatige Set-Fotografien und technische Blaupausen des legendären Supertechno 50 Teleskopkrans.',
    artworks: [
      {
        id: 'cine_eg_1',
        floor: 'EG',
        title: 'Supertechno 50: Blueprint in Cyan',
        artist: 'Techno Studio Archives',
        year: '2024',
        medium: 'Archival Giclée Print auf Barytpapier',
        dimensions: '190 × 110 cm',
        description: 'Original-Konstruktionszeichnung der 4-stufigen Teleskopausleger.',
        primaryColor: '#0284c7',
        accentColor: '#e0f2fe',
        patternType: 'cinema',
        position: [1.15, 1.45, -1.06],
        rotation: [0, 0, 0],
        scale: [1.7, 1.1, 0.05],
      },
      {
        id: 'cine_eg_2',
        floor: 'EG',
        title: 'Night Shoot: ARRI Alexa Mini LF on Gimbal',
        artist: 'Fabian K.',
        year: '2025',
        medium: 'Diasec Acrylglas-Versiegelung',
        dimensions: '130 × 90 cm',
        description: 'Low-Light Aufnahme bei minus 4 Grad am Set.',
        primaryColor: '#0f172a',
        accentColor: '#f97316',
        patternType: 'cinema',
        position: [0.6, 1.45, -0.98],
        rotation: [0, 0, 0],
        scale: [1.2, 0.95, 0.05],
      },
      {
        id: 'cine_og_1',
        floor: 'OG',
        title: '15.2m Reach: Sunset Hero Sequence',
        artist: 'Studio Vienna',
        year: '2026',
        medium: 'Chromogener Abzug hinter Museumsglas',
        dimensions: '210 × 120 cm',
        description: 'Voll ausgefahrener Kranarm gegen die Silhouette historischer Kathedralen.',
        primaryColor: '#7c2d12',
        accentColor: '#fdba74',
        patternType: 'cinema',
        position: [-1.15, 4.05, -1.06],
        rotation: [0, 0, 0],
        scale: [1.8, 1.1, 0.05],
      },
      {
        id: 'cine_og_2',
        floor: 'OG',
        title: 'Fluid Wheels Precision: The MoCo Touch',
        artist: 'Anna Leitner',
        year: '2025',
        medium: 'Schwarz-Weiß-Silbergelatineabzug',
        dimensions: '120 × 120 cm',
        description: 'Messing-Handräder des Flightcase-Master-Desks in voller Konzentration.',
        primaryColor: '#27272a',
        accentColor: '#e5c500',
        patternType: 'cinema',
        position: [0.8, 4.05, -0.98],
        rotation: [0, 0, 0],
        scale: [1.1, 1.1, 0.05],
      },
    ],
  },
  bauhaus: {
    id: 'bauhaus',
    name: 'Form Follows Function: Neues Bauen',
    curator: 'Prof. Henrik Van Der Rohe',
    theme: 'Minimalismus, Raster und Primärfarben',
    icon: '📐',
    description: 'Hommage an Bauhaus, De Stijl und modernen Industrie-Funktionalismus.',
    artworks: [
      {
        id: 'bauhaus_eg_1',
        floor: 'EG',
        title: 'Komposition mit Rot, Gelb und Blau',
        artist: 'Studio Quadrat',
        year: '2025',
        medium: 'Lack auf Aluminiumverbundplatte',
        dimensions: '160 × 120 cm',
        description: 'Asymmetrische Rasterordnung mit reinen Primärfarben.',
        primaryColor: '#dc2626',
        accentColor: '#2563eb',
        patternType: 'geometric',
        position: [1.15, 1.45, -1.06],
        rotation: [0, 0, 0],
        scale: [1.5, 1.1, 0.05],
      },
      {
        id: 'bauhaus_eg_2',
        floor: 'EG',
        title: 'Axonometrie des Raumes',
        artist: 'Lukas Gruber',
        year: '2024',
        medium: 'Siebdruck auf Bütten',
        dimensions: '130 × 90 cm',
        description: 'Dreidimensionale Raumillusionen auf planer Fläche.',
        primaryColor: '#1e293b',
        accentColor: '#facc15',
        patternType: 'geometric',
        position: [0.6, 1.45, -0.98],
        rotation: [0, 0, 0],
        scale: [1.2, 0.95, 0.05],
      },
      {
        id: 'bauhaus_og_1',
        floor: 'OG',
        title: 'Diagonale Spannung #12',
        artist: 'Elena Rostova',
        year: '2026',
        medium: 'Acryl und Sand auf Leinwand',
        dimensions: '190 × 120 cm',
        description: 'Kraftvolle Diagonalen, die den Raum optisch öffnen.',
        primaryColor: '#475569',
        accentColor: '#ef4444',
        patternType: 'geometric',
        position: [-1.15, 4.05, -1.06],
        rotation: [0, 0, 0],
        scale: [1.7, 1.1, 0.05],
      },
      {
        id: 'bauhaus_og_2',
        floor: 'OG',
        title: 'Nullpunkt: Weiß auf Weiß',
        artist: 'Kasimir M.',
        year: '2025',
        medium: 'Strukturpaste auf Nessel',
        dimensions: '120 × 120 cm',
        description: 'Radikaler Minimalismus mit subtilsten Licht-Schatten-Gradienten.',
        primaryColor: '#f8fafc',
        accentColor: '#94a3b8',
        patternType: 'minimalist',
        position: [0.8, 4.05, -0.98],
        rotation: [0, 0, 0],
        scale: [1.1, 1.1, 0.05],
      },
    ],
  },
  sculptures: {
    id: 'sculptures',
    name: 'Skulpturales Volumen & Bronze',
    curator: 'Camilla Thorne',
    theme: 'Dreidimensionale Plastiken auf Museumssockeln',
    icon: '🗿',
    description: 'Skulpturen aus Bronze, poliertem Edelstahl und Carrara-Marmor auf weißen Ausstellungs-Cubes.',
    artworks: [
      {
        id: 'sculpture_eg_1',
        floor: 'EG',
        title: 'Torsion in Bronze #3',
        artist: 'Marcello Donati',
        year: '2025',
        medium: 'Gegossene und patinierte Bronze',
        dimensions: '65 × 40 × 40 cm',
        description: 'Organische Drehung mit polierten Lichtkanten.',
        primaryColor: '#b45309',
        accentColor: '#d97706',
        patternType: 'sculpture',
        position: [-1.2, 0.85, 0.0],
        rotation: [0, 0.4, 0],
        scale: [0.45, 0.65, 0.45],
      },
      {
        id: 'sculpture_og_1',
        floor: 'OG',
        title: 'Unendliche Schleife (Mirror Steel)',
        artist: 'Maya Lin-Kowalski',
        year: '2026',
        medium: 'Hochglanzpolierter Edelstahl',
        dimensions: '75 × 50 × 45 cm',
        description: 'Spiegelt die Umgebung und den Betrachter in kontinuierlicher Bewegung.',
        primaryColor: '#e2e8f0',
        accentColor: '#38bdf8',
        patternType: 'sculpture',
        position: [1.2, 3.45, 0.0],
        rotation: [0, -0.6, 0],
        scale: [0.5, 0.75, 0.5],
      },
      {
        id: 'sculpture_eg_wall',
        floor: 'EG',
        title: 'Marmor-Relief: Schichten der Zeit',
        artist: 'Gabriel S.',
        year: '2024',
        medium: 'Carrara-Marmor handbehauen',
        dimensions: '140 × 90 cm',
        description: 'Feinste Rillenstruktur in historischem Naturstein.',
        primaryColor: '#f1f5f9',
        accentColor: '#64748b',
        patternType: 'minimalist',
        position: [1.15, 1.45, -1.06],
        rotation: [0, 0, 0],
        scale: [1.2, 0.95, 0.05],
      },
      {
        id: 'sculpture_og_wall',
        floor: 'OG',
        title: 'Bronze-Foliant: Fragment VII',
        artist: 'Helena V.',
        year: '2025',
        medium: 'Oxidierte Kupferplatten auf Walzstahl',
        dimensions: '180 × 110 cm',
        description: 'Faszinierende Grünspan- und Tiefenschwarz-Nuancen.',
        primaryColor: '#065f46',
        accentColor: '#34d399',
        patternType: 'gradient',
        position: [-1.15, 4.05, -1.06],
        rotation: [0, 0, 0],
        scale: [1.7, 1.1, 0.05],
      },
    ],
  },
};

export interface GalleryContainerState {
  // Container & Staging
  stackMode: ContainerStackMode;
  containerColor: ContainerColorId;
  customColorHex: string;
  weathering: number;
  containerRotationY: number; // 0 to 360 deg
  turntableMotorActive: boolean;
  turntableSpeedRPM: number; // 0.5 to 10 RPM
  
  // Doors & Kinematics
  egDoorsOpen: number; // 0 (closed) to 1 (open 150 deg)
  ogDoorsOpen: number;
  slidingDoorOpen: number;
  
  // Lighting & CCT
  linearLedIntensity: number; // 0.0 to 2.5
  egLinearLed: number;
  ogLinearLed: number;
  cctKelvin: number;
  rgbColorGlow: string;
  useRgbGlow: boolean;
  spotlightsIntensity: number;
  exteriorUpLights: boolean;
  exteriorUpLightsIntensity: number;
  neonRingColorHex: string;
  
  // Environment & Scene
  environment: GalleryEnvironmentId;
  showVotivkirche: boolean;
  showPedestrians: boolean;
  autoRotate: boolean;
  
  // Art & Curation
  currentExhibition: ArtExhibitionId;
  selectedArtworkId: string | null;
  showArtworks: boolean; // true = curated exhibit, false = empty showroom
  
  // Active Camera Preset & Manual Director Optics
  activeCamera: GalleryCameraId;
  cameraFov: number; // 25 to 90 deg
}

export const DEFAULT_GALLERY_STATE: GalleryContainerState = {
  stackMode: 'double_stack',
  containerColor: 'anthracite',
  customColorHex: '#1f2429',
  weathering: 0.15,
  containerRotationY: 0,
  turntableMotorActive: false,
  turntableSpeedRPM: 1.5,
  
  egDoorsOpen: 0.0,
  ogDoorsOpen: 0.0,
  slidingDoorOpen: 0.0,
  
  linearLedIntensity: 1.6,
  egLinearLed: 1.6,
  ogLinearLed: 1.6,
  cctKelvin: 4000,
  rgbColorGlow: '#00dcff',
  useRgbGlow: false,
  spotlightsIntensity: 1.4,
  exteriorUpLights: true,
  exteriorUpLightsIntensity: 1.8,
  neonRingColorHex: '#00dcff',
  
  environment: 'dark_studio',
  showVotivkirche: false,
  showPedestrians: false,
  autoRotate: false,
  
  currentExhibition: 'abstract',
  selectedArtworkId: null,
  showArtworks: false,
  
  activeCamera: 'free',
  cameraFov: 42,
};

export function kelvinToHex(kelvin: number): string {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (temp <= 66) {
    red = 255;
  } else {
    red = temp - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);
    red = Math.max(0, Math.min(255, red));
  }

  if (temp <= 66) {
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
    green = Math.max(0, Math.min(255, green));
  } else {
    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
    green = Math.max(0, Math.min(255, green));
  }

  if (temp >= 66) {
    blue = 255;
  } else if (temp <= 19) {
    blue = 0;
  } else {
    blue = temp - 10;
    blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    blue = Math.max(0, Math.min(255, blue));
  }

  const r = Math.round(red).toString(16).padStart(2, '0');
  const g = Math.round(green).toString(16).padStart(2, '0');
  const b = Math.round(blue).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
