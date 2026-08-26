import * as THREE from 'three';

/**
 * ============================================================================
 * 🏎️ FIA GRAND PRIX TRACK ENGINE - TYPE DEFINITIONS (Subagent 22.14)
 * ============================================================================
 */

export interface TrackControlPoint {
  x: number;
  y: number; // 3D Topographie / Höhenprofil (Elevation in Metern)
  z: number;
  bankingDeg?: number; // Kurvenüberhöhung / Querneigung (Camber) in Grad
  kerbLeft?: boolean;  // Rot-Weißer Randstein links aktiv
  kerbRight?: boolean; // Rot-Weißer Randstein rechts aktiv
  runOff?: 'gravel' | 'tarmac' | 'grass' | 'none'; // Auslaufzonen-Typ
  runOffWidth?: number;
}

export interface TrackSectorInfo {
  uStart: number;
  uEnd: number;
  turnNum: number;
  name: string;
  code: string;
  f1Speed: number;     // F1-Geschwindigkeit in km/h laut offiziellem Guide
  f1Gear: number;      // F1-Gang (1 bis 8)
  f1GForce: number;    // F1 Querbeschleunigung in g
  drsZone?: string;    // 'DRS 1' | 'DRS 2' | 'DRS Detection 1' | 'DRS Detection 2'
  speedTarget: number; // LKW Zielgeschwindigkeit in km/h
  brakeMarker?: boolean; // 150m/100m/50m Bremstafeln vor Kurvenscheitel
}

export interface TracksideCamera {
  id: string;
  name: string;
  type: 'tower' | 'kerb' | 'gantry' | 'wire_cam';
  uTarget: number;       // Streckenfortschritt [0.0, 1.0)
  offsetSide: number;    // Querabstand von Fahrbahnmitte in Metern (+ = links, - = rechts)
  height: number;        // Höhe über der Fahrbahn in Metern
  focalLengthMm: number; // Äquivalente Brennweite (z.B. 24mm bis 600mm)
  description: string;
}

export type CircuitId = 'silverstone' | 'monza' | 'spa' | 'red_bull_ring';

export interface CircuitDefinition {
  id: CircuitId;
  name: string;
  country: string;
  flag: string;
  lengthKm: number;
  turnsCount: number;
  lapRecord: { time: string; driver: string; year: number };
  elevationGainM: number;
  description: string;
  trackWidth: number;
  scale: number;
  controlPoints: TrackControlPoint[];
  sectors: TrackSectorInfo[];
  cameras?: TracksideCamera[];
  racingLine?: { u: number; offset: number }[]; // Ideallinie-Offsets in Metern (+ = rechts, - = links)
}

export interface TrackMeshesResult {
  group: THREE.Group;
  trackCurve: THREE.CatmullRomCurve3;
  splineLength: number;
  trackLabelsGroup?: THREE.Group; // 3D-Streckenbeschriftungen & Kurvenmarkierungen (Ein/Aus schaltbar)
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  };
}
