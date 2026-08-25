import type { CircuitDefinition } from './trackTypes';

/**
 * 🇧🇪 CIRCUIT DE SPA-FRANCORCHAMPS (The Ardennes Rollercoaster)
 * Mit 19 Kurven, der weltberühmten Eau Rouge / Raidillon 3D-Steigung (+24m) und Pouhon
 */
export const SPA_CIRCUIT: CircuitDefinition = {
  id: 'spa',
  name: 'Circuit de Spa-Francorchamps',
  country: 'Belgien',
  flag: '🇧🇪',
  lengthKm: 7.004,
  turnsCount: 19,
  lapRecord: { time: '1:46.286', driver: 'Valtteri Bottas', year: 2018 },
  elevationGainM: 102.2,
  description: 'Die "Achterbahn der Ardennen" mit extremen Höhenunterschieden, der legendären Eau Rouge & Raidillon und Pouhon.',
  trackWidth: 13.0,
  scale: 4.5,
  controlPoints: [
    // 1. Start/Ziel-Gerade
    { x: -8, y: 0.0, z: -35, kerbLeft: false, kerbRight: false },
    { x: 4, y: 0.2, z: -38, kerbLeft: false, kerbRight: false }, // Start-Ziel-Gantry
    { x: 16, y: 0.4, z: -40, kerbLeft: false, kerbRight: false }, // Harter Bremspunkt La Source
    // 2. T1: La Source (Spitzkehre Rechts)
    { x: 22, y: 0.3, z: -42, bankingDeg: 3.0, kerbRight: true, runOff: 'tarmac' }, // T1 Apex (70 km/h)
    { x: 20, y: 0.0, z: -34, kerbLeft: true, runOff: 'tarmac' },
    // 3. Bergab-Gerade hinab zur Eau Rouge
    { x: 15, y: -2.5, z: -20, kerbLeft: false, kerbRight: false },
    { x: 12, y: -5.0, z: -6, kerbLeft: false, kerbRight: false }, // Tiefster Punkt an der Eau Rouge Senke (-5.5m)
    // 4. T2, T3, T4: EAU ROUGE & RAIDILLON (Steiler 3D-Anstieg auf +7.5m Höhe, 305 km/h, 4.5g!)
    { x: 10, y: -4.8, z: 2, bankingDeg: -4.0, kerbLeft: true, runOff: 'tarmac' },  // T2 Eau Rouge Links-Knick
    { x: 7, y: 0.5, z: 12, bankingDeg: 5.0, kerbRight: true, runOff: 'tarmac' },   // T3 Raidillon Rechts (Kompression)
    { x: 4, y: 6.5, z: 22, bankingDeg: -3.0, kerbLeft: true, runOff: 'tarmac' },   // T4 Raidillon Links (Kuppe)
    { x: 2, y: 7.8, z: 32, kerbLeft: false, kerbRight: false },                    // Scheitel der Kuppe
    // 5. Kemmel Straight (Lange Vollgas-Gerade auf der Hochebene, DRS 1, 345 km/h)
    { x: 0, y: 8.0, z: 48, kerbLeft: false, kerbRight: false },
    { x: -4, y: 8.1, z: 68, kerbLeft: false, kerbRight: false },
    { x: -8, y: 8.0, z: 88, kerbLeft: false, kerbRight: false }, // Bremspunkt Les Combes
    // 6. T5, T6, T7: Les Combes & Malmedy (Rechts-Links-Rechts)
    { x: -14, y: 7.6, z: 96, bankingDeg: 3.0, kerbRight: true, runOff: 'gravel' }, // T5 Rechts (140 km/h)
    { x: -22, y: 7.2, z: 98, bankingDeg: -3.0, kerbLeft: true, runOff: 'gravel' },  // T6 Links (160 km/h)
    { x: -28, y: 6.6, z: 94, bankingDeg: 3.0, kerbRight: true, runOff: 'tarmac' }, // T7 Malmedy (180 km/h)
    // 7. T8: Bruxelles / Rivage (180° Gefälle-Rechtskehre)
    { x: -36, y: 5.2, z: 84, kerbLeft: true, runOff: 'grass' },
    { x: -44, y: 3.5, z: 74, bankingDeg: 4.0, kerbRight: true, runOff: 'gravel' }, // T8 Bruxelles (110 km/h)
    { x: -40, y: 2.2, z: 62, kerbLeft: true, runOff: 'grass' },
    // 8. T9: Speakers Corner (Linkskurve bergab)
    { x: -35, y: 1.0, z: 54, bankingDeg: -3.0, kerbLeft: true, runOff: 'gravel' }, // T9 (150 km/h)
    // 9. T10 & T11: POUHON (Monumentale High-Speed Doppel-Links bergab, 290 km/h, 4.8g!)
    { x: -38, y: -0.5, z: 42, bankingDeg: -4.5, kerbLeft: true, runOff: 'gravel' }, // T10 Pouhon Apex 1
    { x: -46, y: -1.8, z: 30, bankingDeg: -4.5, kerbLeft: true, runOff: 'tarmac' }, // T11 Pouhon Apex 2
    { x: -42, y: -2.5, z: 18, kerbRight: true, runOff: 'tarmac' },
    // 10. T12 & T13: Fagnes (Rechts-Links-Schikane)
    { x: -36, y: -2.8, z: 10, bankingDeg: 3.0, kerbRight: true, runOff: 'gravel' }, // T12 Rechts (170 km/h)
    { x: -32, y: -3.0, z: 2, bankingDeg: -3.0, kerbLeft: true, runOff: 'gravel' },   // T13 Links (185 km/h)
    // 11. T14 & T15: Campus & Stavelot (Rechtskurven bergauf)
    { x: -32, y: -2.6, z: -8, bankingDeg: 3.0, kerbRight: true, runOff: 'grass' },
    { x: -36, y: -2.0, z: -18, bankingDeg: 3.5, kerbRight: true, runOff: 'tarmac' }, // T15 Stavelot (220 km/h)
    // 12. T16 & T17: Paul Frère & Blanchimont (Vollgas-Linkskurve 315 km/h)
    { x: -32, y: -1.0, z: -26, kerbLeft: false, kerbRight: false },
    { x: -24, y: -0.4, z: -32, bankingDeg: -3.5, kerbLeft: true, runOff: 'tarmac' }, // Blanchimont (315 km/h)
    { x: -16, y: -0.1, z: -35, kerbLeft: false, kerbRight: false },
    // 13. T18 & T19: Bus Stop Schikane (Rechts-Links-Bremspunkt vor Start/Ziel)
    { x: -12, y: 0.0, z: -37, bankingDeg: 2.5, kerbRight: true, runOff: 'tarmac' }, // T18 Bus Stop (80 km/h)
    { x: -10, y: 0.0, z: -33, bankingDeg: -2.5, kerbLeft: true, runOff: 'tarmac' },  // T19 Bus Stop Exit (110 km/h)
  ],
  sectors: [
    { uStart: 0.00, uEnd: 0.06, turnNum: 0, name: 'START/ZIEL GERADE', code: 'S/F', f1Speed: 310, f1Gear: 7, f1GForce: 1.0, speedTarget: 82.0 },
    { uStart: 0.06, uEnd: 0.12, turnNum: 1, name: 'T1 LA SOURCE HAIRPIN', code: 'LA SOURCE', f1Speed: 70, f1Gear: 1, f1GForce: 2.2, speedTarget: 24.0, brakeMarker: true },
    { uStart: 0.12, uEnd: 0.18, turnNum: 2, name: 'EAU ROUGE DOWNHILL', code: 'EAU ROUGE', f1Speed: 310, f1Gear: 7, f1GForce: 2.8, speedTarget: 78.0 },
    { uStart: 0.18, uEnd: 0.28, turnNum: 3, name: 'T3/T4 RAIDILLON 3D-STEIGUNG (+24M)', code: 'RAIDILLON', f1Speed: 305, f1Gear: 8, f1GForce: 4.5, speedTarget: 74.0 },
    { uStart: 0.28, uEnd: 0.42, turnNum: 0, name: 'KEMMEL STRAIGHT (DRS 1)', code: 'KEMMEL', f1Speed: 345, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 1', speedTarget: 88.0 },
    { uStart: 0.42, uEnd: 0.50, turnNum: 5, name: 'T5-T7 LES COMBES & MALMEDY', code: 'LES COMBES', f1Speed: 140, f1Gear: 3, f1GForce: 3.4, speedTarget: 38.0, brakeMarker: true },
    { uStart: 0.50, uEnd: 0.58, turnNum: 8, name: 'T8 BRUXELLES (RIVAGE)', code: 'BRUXELLES', f1Speed: 110, f1Gear: 2, f1GForce: 2.5, speedTarget: 32.0, brakeMarker: true },
    { uStart: 0.58, uEnd: 0.64, turnNum: 9, name: 'T9 SPEAKERS CORNER', code: 'SPEAKERS', f1Speed: 150, f1Gear: 3, f1GForce: 2.8, speedTarget: 42.0 },
    { uStart: 0.64, uEnd: 0.74, turnNum: 10, name: 'T10/T11 POUHON (MAX-G LEFT)', code: 'POUHON', f1Speed: 290, f1Gear: 7, f1GForce: 4.8, speedTarget: 70.0 },
    { uStart: 0.74, uEnd: 0.82, turnNum: 12, name: 'T12/T13 FAGNES CHICANE', code: 'FAGNES', f1Speed: 170, f1Gear: 4, f1GForce: 3.2, speedTarget: 45.0, brakeMarker: true },
    { uStart: 0.82, uEnd: 0.88, turnNum: 14, name: 'T14/T15 CAMPUS & STAVELOT', code: 'STAVELOT', f1Speed: 220, f1Gear: 5, f1GForce: 3.0, speedTarget: 58.0 },
    { uStart: 0.88, uEnd: 0.94, turnNum: 16, name: 'T16/T17 BLANCHIMONT', code: 'BLANCHIMONT', f1Speed: 315, f1Gear: 8, f1GForce: 3.8, speedTarget: 82.0 },
    { uStart: 0.94, uEnd: 1.00, turnNum: 18, name: 'T18/T19 BUS STOP CHICANE', code: 'BUS STOP', f1Speed: 80, f1Gear: 2, f1GForce: 2.6, speedTarget: 28.0, brakeMarker: true },
  ],
  cameras: [
    { id: 'spa_sf_gantry', name: 'Spa Start/Finish Gantry Cam', type: 'gantry', uTarget: 0.02, offsetSide: 0.0, height: 8.0, focalLengthMm: 50, description: 'Start-Ziel-Gerade Spa' },
    { id: 'spa_lasource_tower', name: 'La Source Hairpin Tower', type: 'tower', uTarget: 0.09, offsetSide: -16.0, height: 7.0, focalLengthMm: 220, description: 'Enge Spitzkehre La Source' },
    { id: 'spa_eaurouge_crest', name: 'Eau Rouge / Raidillon Monumental Tower', type: 'tower', uTarget: 0.23, offsetSide: 30.0, height: 12.5, focalLengthMm: 450, description: 'Spektakulärer Panoramaturm oben am Raidillon-Kamm (+24m Steigung)' },
    { id: 'spa_kemmel_zoom', name: 'Kemmel Straight 800mm Box Lens', type: 'tower', uTarget: 0.36, offsetSide: -22.0, height: 7.5, focalLengthMm: 800, description: 'Extreme 800mm Telephoto-Kamera auf der 345 km/h Kemmel-Geraden' },
    { id: 'spa_combes_tower', name: 'Les Combes Braking Tower', type: 'tower', uTarget: 0.46, offsetSide: 28.0, height: 8.0, focalLengthMm: 340, description: 'Bremszone Les Combes am Ende der Kemmel-Geraden' },
    { id: 'spa_pouhon_high', name: 'Pouhon Double-Apex High-G Tower', type: 'tower', uTarget: 0.69, offsetSide: 32.0, height: 9.5, focalLengthMm: 400, description: 'High-Speed Doppel-Links Pouhon mit 4.8g Querbeschleunigung' },
    { id: 'spa_blanchimont_cam', name: 'Blanchimont 315 km/h Sweep Cam', type: 'tower', uTarget: 0.90, offsetSide: 25.0, height: 7.5, focalLengthMm: 380, description: 'Vollgas-Linksknick Blanchimont' },
    { id: 'spa_busstop_kerb', name: 'Bus Stop Chicane Kerb Cam', type: 'kerb', uTarget: 0.97, offsetSide: -10.0, height: 0.35, focalLengthMm: 28, description: 'Randstein-Actionkamera an der Bus Stop Schikane vor Start/Ziel' },
  ]
};
