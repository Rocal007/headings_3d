import type { CircuitDefinition } from './trackTypes';

/**
 * 🇬🇧 SILVERSTONE GRAND PRIX CIRCUIT
 * Offizielles Streckenlayout mit 18 Kurven, DRS-Zonen und realistischen Höhendetails
 */
export const SILVERSTONE_CIRCUIT: CircuitDefinition = {
  id: 'silverstone',
  name: 'Silverstone Grand Prix Circuit',
  country: 'Großbritannien',
  flag: '🇬🇧',
  lengthKm: 5.891,
  turnsCount: 18,
  lapRecord: { time: '1:27.097', driver: 'Max Verstappen', year: 2020 },
  elevationGainM: 11.3,
  description: 'Das "Home of British Motor Racing" mit legendären High-Speed-Kurven wie Copse, Maggotts & Becketts.',
  trackWidth: 12.5,
  scale: 5.0,
  controlPoints: [
    // 1. Hamilton Straight & Start/Finish (Top Horizontal, von links nach rechts)
    { x: -30, y: 0.0, z: -36, kerbRight: true, runOff: 'grass' },
    { x: -12, y: 0.2, z: -36, kerbLeft: false, kerbRight: false },
    { x: 2, y: 0.3, z: -36, kerbLeft: false, kerbRight: false }, // Start-Ziel-Gantry
    // 2. Turn 1 (Abbey) & Turn 2 (Farm Curve)
    { x: 12, y: 0.1, z: -34, bankingDeg: 1.5, kerbRight: true, runOff: 'tarmac' }, // T1 Abbey (290 km/h)
    { x: 20, y: -0.4, z: -26, bankingDeg: -1.0, kerbLeft: true, runOff: 'grass' }, // T2 Farm Curve (185 km/h)
    // 3. Turn 3 (Village) & Turn 4 (The Loop) & Turn 5 (Aintree)
    { x: 26, y: -0.8, z: -18, bankingDeg: 2.0, kerbRight: true, runOff: 'tarmac' }, // T3 Village (95 km/h)
    { x: 29, y: -1.0, z: -12, kerbRight: true, runOff: 'gravel' },
    { x: 25, y: -1.0, z: -6, bankingDeg: -2.5, kerbLeft: true, runOff: 'gravel' }, // T4 The Loop (85 km/h)
    { x: 19, y: -0.6, z: -10, kerbLeft: true, runOff: 'grass' },
    { x: 18, y: -0.2, z: -16, bankingDeg: -1.0, kerbLeft: true, runOff: 'grass' }, // T5 Aintree
    // 4. Wellington Straight (DRS 1) - Läuft nach Norden
    { x: 18, y: 0.4, z: -26, kerbLeft: false, kerbRight: false },
    { x: 17, y: 1.0, z: -42, kerbLeft: false, kerbRight: false }, // Wellington Mid
    { x: 16, y: 1.4, z: -54, kerbLeft: false, kerbRight: false }, // Braking Zone
    // 5. Turn 6 (Brooklands) & Turn 7 (Luffield) & Turn 8 (Woodcote)
    { x: 12, y: 1.2, z: -62, bankingDeg: -2.0, kerbLeft: true, runOff: 'gravel' }, // T6 Brooklands (165 km/h)
    { x: 2, y: 0.8, z: -63, kerbLeft: true, runOff: 'tarmac' },
    { x: -4, y: 0.4, z: -58, bankingDeg: 2.5, kerbRight: true, runOff: 'gravel' }, // T7 Luffield (120 km/h)
    { x: -6, y: 0.2, z: -50, bankingDeg: 2.5, kerbRight: true, runOff: 'gravel' },
    { x: 0, y: 0.0, z: -45, bankingDeg: 1.5, kerbRight: true, runOff: 'tarmac' },
    { x: 10, y: -0.2, z: -45, bankingDeg: 1.0, kerbRight: true, runOff: 'grass' }, // T8 Woodcote (270 km/h)
    // 6. Alte National Straight (Richtung Copse)
    { x: 24, y: -0.4, z: -38, kerbLeft: false, kerbRight: false },
    { x: 40, y: -0.6, z: -28, kerbLeft: false, kerbRight: false },
    { x: 52, y: -0.8, z: -18, kerbLeft: false, kerbRight: false },
    // 7. Turn 9 (Copse) - 90° High Speed Rechts
    { x: 58, y: -1.0, z: -10, bankingDeg: 2.0, kerbRight: true, runOff: 'tarmac' }, // T9 Copse (285 km/h)
    { x: 56, y: -0.8, z: 0, kerbLeft: true, runOff: 'tarmac' },
    // 8. Turn 10 (Maggotts) & Turn 11/12 (Becketts) & Turn 13 (Chapel)
    { x: 50, y: -0.5, z: 8, bankingDeg: -2.5, kerbLeft: true, runOff: 'grass' }, // T10 Maggotts (300 km/h)
    { x: 44, y: -0.2, z: 14, bankingDeg: 3.0, kerbRight: true, runOff: 'tarmac' }, // T11 Becketts Entry (265 km/h)
    { x: 38, y: 0.2, z: 20, bankingDeg: -3.5, kerbLeft: true, runOff: 'gravel' }, // T12 Becketts Apex (235 km/h, 5.0g)
    { x: 30, y: 0.5, z: 26, bankingDeg: 2.0, kerbRight: true, runOff: 'grass' }, // T13 Chapel (240 km/h)
    // 9. Hangar Straight (DRS 2) - Untere Horizontale
    { x: 18, y: 0.8, z: 30, kerbLeft: false, kerbRight: false },
    { x: -8, y: 0.9, z: 30, kerbLeft: false, kerbRight: false }, // Speed Trap 310 km/h
    { x: -36, y: 0.7, z: 30, kerbLeft: false, kerbRight: false }, // Braking Zone
    // 10. Turn 15 (Stowe) & Gerade Richtung Vale
    { x: -48, y: 0.4, z: 28, bankingDeg: 2.5, kerbRight: true, runOff: 'tarmac' }, // T15 Stowe (240 km/h)
    { x: -54, y: 0.2, z: 18, kerbLeft: true, runOff: 'tarmac' },
    { x: -54, y: 0.0, z: 4, kerbLeft: false, kerbRight: false },
    { x: -53, y: -0.2, z: -12, kerbLeft: false, kerbRight: false },
    // 11. Turn 16 (Vale) & Turn 17/18 (Club)
    { x: -52, y: -0.4, z: -20, bankingDeg: -2.0, kerbLeft: true, runOff: 'gravel' }, // T16 Vale (105 km/h)
    { x: -56, y: -0.3, z: -26, bankingDeg: 2.0, kerbRight: true, runOff: 'tarmac' }, // T17 Vale Exit (135 km/h)
    { x: -54, y: -0.2, z: -32, bankingDeg: 2.5, kerbRight: true, runOff: 'gravel' }, // T18 Club (225 km/h)
    { x: -44, y: -0.1, z: -36, kerbRight: true, runOff: 'tarmac' },
  ],
  sectors: [
    { uStart: 0.00, uEnd: 0.07, turnNum: 0, name: 'HAMILTON STRAIGHT', code: 'S/F', f1Speed: 290, f1Gear: 7, f1GForce: 1.0, speedTarget: 82.0 },
    { uStart: 0.07, uEnd: 0.12, turnNum: 1, name: 'T1 ABBEY', code: 'ABBEY', f1Speed: 290, f1Gear: 7, f1GForce: 4.0, speedTarget: 70.0, brakeMarker: true },
    { uStart: 0.12, uEnd: 0.16, turnNum: 2, name: 'T2 FARM CURVE', code: 'FARM', f1Speed: 185, f1Gear: 4, f1GForce: 2.2, speedTarget: 60.0 },
    { uStart: 0.16, uEnd: 0.20, turnNum: 3, name: 'T3 VILLAGE CORNER', code: 'VILLAGE', f1Speed: 95, f1Gear: 2, f1GForce: 2.0, drsZone: 'DRS Detection 1', speedTarget: 36.0, brakeMarker: true },
    { uStart: 0.20, uEnd: 0.25, turnNum: 4, name: 'T4 THE LOOP', code: 'LOOP', f1Speed: 85, f1Gear: 2, f1GForce: 1.2, speedTarget: 28.0 },
    { uStart: 0.25, uEnd: 0.28, turnNum: 5, name: 'T5 AINTREE', code: 'AINTREE', f1Speed: 140, f1Gear: 3, f1GForce: 1.5, speedTarget: 48.0 },
    { uStart: 0.28, uEnd: 0.38, turnNum: 0, name: 'WELLINGTON STRAIGHT', code: 'WELLINGTON', f1Speed: 295, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 1', speedTarget: 85.0 },
    { uStart: 0.38, uEnd: 0.43, turnNum: 6, name: 'T6 BROOKLANDS', code: 'BROOKLANDS', f1Speed: 165, f1Gear: 2, f1GForce: 1.4, speedTarget: 42.0, brakeMarker: true },
    { uStart: 0.43, uEnd: 0.50, turnNum: 7, name: 'T7 LUFFIELD', code: 'LUFFIELD', f1Speed: 120, f1Gear: 3, f1GForce: 2.2, speedTarget: 34.0 },
    { uStart: 0.50, uEnd: 0.55, turnNum: 8, name: 'T8 WOODCOTE', code: 'WOODCOTE', f1Speed: 270, f1Gear: 8, f1GForce: 1.9, speedTarget: 72.0 },
    { uStart: 0.55, uEnd: 0.62, turnNum: 9, name: 'T9 COPSE CORNER', code: 'COPSE', f1Speed: 300, f1Gear: 8, f1GForce: 4.5, speedTarget: 74.0, brakeMarker: true },
    { uStart: 0.62, uEnd: 0.66, turnNum: 10, name: 'T10 MAGGOTTS', code: 'MAGGOTTS', f1Speed: 300, f1Gear: 8, f1GForce: 1.8, drsZone: 'DRS Detection 2', speedTarget: 68.0 },
    { uStart: 0.66, uEnd: 0.70, turnNum: 11, name: 'T11 BECKETTS ENTRY', code: 'BECKETTS 1', f1Speed: 265, f1Gear: 7, f1GForce: 3.7, speedTarget: 56.0 },
    { uStart: 0.70, uEnd: 0.74, turnNum: 12, name: 'T12 BECKETTS APEX (MAX-G)', code: 'BECKETTS 2', f1Speed: 235, f1Gear: 6, f1GForce: 5.0, speedTarget: 48.0 },
    { uStart: 0.74, uEnd: 0.78, turnNum: 13, name: 'T13 CHAPEL', code: 'CHAPEL', f1Speed: 210, f1Gear: 5, f1GForce: 3.9, speedTarget: 62.0 },
    { uStart: 0.78, uEnd: 0.87, turnNum: 0, name: 'HANGAR STRAIGHT (TOP SPEED)', code: 'HANGAR', f1Speed: 310, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 2', speedTarget: 88.0 },
    { uStart: 0.87, uEnd: 0.91, turnNum: 15, name: 'T15 STOWE CORNER', code: 'STOWE', f1Speed: 240, f1Gear: 6, f1GForce: 3.2, speedTarget: 52.0, brakeMarker: true },
    { uStart: 0.91, uEnd: 0.94, turnNum: 16, name: 'T16 VALE CHICANE', code: 'VALE', f1Speed: 105, f1Gear: 2, f1GForce: 2.1, speedTarget: 30.0, brakeMarker: true },
    { uStart: 0.94, uEnd: 0.97, turnNum: 17, name: 'T17 VALE EXIT', code: 'VALE OUT', f1Speed: 135, f1Gear: 2, f1GForce: 2.3, speedTarget: 40.0 },
    { uStart: 0.97, uEnd: 1.00, turnNum: 18, name: 'T18 CLUB CORNER', code: 'CLUB', f1Speed: 225, f1Gear: 4, f1GForce: 3.2, speedTarget: 64.0 },
  ]
};
