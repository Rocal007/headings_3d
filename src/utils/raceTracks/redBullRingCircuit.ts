import type { CircuitDefinition } from './trackTypes';

/**
 * 🇦🇹 RED BULL RING SPIELBERG (Alpine High-Speed Arena)
 * Mit 10 Kurven, extremem 35m-Bergauf-Sprint zur Remus-Spitzkehre und Rindt-Kurve
 */
export const RED_BULL_RING_CIRCUIT: CircuitDefinition = {
  id: 'red_bull_ring',
  name: 'Red Bull Ring Spielberg',
  country: 'Österreich',
  flag: '🇦🇹',
  lengthKm: 4.318,
  turnsCount: 10,
  lapRecord: { time: '1:05.619', driver: 'Carlos Sainz', year: 2020 },
  elevationGainM: 65.0,
  description: 'Die alpine Berg-und-Talbahn in der Steiermark mit dramatischem Höhenprofil und rasanten Bremszonen.',
  trackWidth: 28.0,
  scale: 4.8,
  controlPoints: [
    // 1. Start/Ziel-Gerade (z = -15) - 100% Schnurgerade
    { x: -35, y: 0.0, z: -15, kerbLeft: false, kerbRight: false },
    { x: -10, y: 0.2, z: -15, kerbLeft: false, kerbRight: false }, // Start-Ziel-Gantry
    { x: 15, y: 0.4, z: -15, kerbLeft: false, kerbRight: false },  // Bremspunkt Niki Lauda Kurve (318 km/h)
    // 2. T1: Niki Lauda Kurve (Harmonische 90° Rechtskurve bergauf)
    { x: 28, y: 1.0, z: -12, bankingDeg: 3.5, kerbRight: true, runOff: 'tarmac' }, // T1 Apex (150 km/h)
    { x: 30, y: 2.2, z: 0, kerbLeft: true, runOff: 'tarmac' },                     // T1 Exit
    // 3. STEILER BERGAUF-SPRINT SCHÖNBERG (x = 30) - 100% Schnurgerade Steigung (+35m, DRS 1, 338 km/h)!
    { x: 30, y: 5.5, z: 15, kerbLeft: false, kerbRight: false },
    { x: 30, y: 9.0, z: 30, kerbLeft: false, kerbRight: false },
    { x: 30, y: 11.8, z: 45, kerbLeft: false, kerbRight: false }, // Höchster Streckenpunkt & Harter Bremspunkt Remus
    // 4. T3: REMUS HAIRPIN (180° Spitzkehre am Berggipfel, 65 km/h!)
    { x: 26, y: 12.0, z: 56, bankingDeg: 4.5, kerbRight: true, runOff: 'gravel' }, // T3 Apex
    { x: 18, y: 11.2, z: 52, kerbLeft: true, runOff: 'tarmac' },                    // T3 Exit
    // 5. Schönberg Bergab-Passage (DRS 2, 335 km/h) - 100% Schnurgerade Bergabfahrt!
    { x: 10, y: 9.0, z: 44, kerbLeft: false, kerbRight: false },
    { x: 0, y: 6.5, z: 34, kerbLeft: false, kerbRight: false },
    { x: -10, y: 4.2, z: 24, kerbLeft: false, kerbRight: false }, // Bremspunkt Schlossgold
    // 6. T4: Schlossgold (90° Rechtskurve bergab, 130 km/h)
    { x: -20, y: 2.8, z: 18, bankingDeg: 3.0, kerbRight: true, runOff: 'gravel' }, // T4 Apex
    { x: -28, y: 1.8, z: 12, kerbLeft: true, runOff: 'tarmac' },
    // 7. T5 & T6: Rauch & Gerhard Berger Kurve (Doppel-Links, 210 km/h)
    { x: -36, y: 1.0, z: 6, bankingDeg: -3.5, kerbLeft: true, runOff: 'gravel' }, // T5 Rauch
    { x: -44, y: 0.4, z: 0, bankingDeg: -4.0, kerbLeft: true, runOff: 'gravel' },  // T6 Berger
    { x: -50, y: 0.0, z: -4, kerbRight: true, runOff: 'tarmac' },
    // 8. T7 & T8: Würth & Gösser Kurve (Rechtskurven, 205 km/h)
    { x: -52, y: -0.2, z: -12, bankingDeg: 3.0, kerbRight: true, runOff: 'gravel' }, // T7 Würth
    { x: -50, y: -0.3, z: -20, bankingDeg: 3.5, kerbRight: true, runOff: 'tarmac' }, // T8 Gösser
    // 9. T9: Jochen Rindt Kurve (High-Speed Rechts, 225 km/h)
    { x: -44, y: -0.2, z: -25, bankingDeg: 3.5, kerbRight: true, runOff: 'gravel' }, // T9 Rindt
    // 10. T10: Red Bull Mobile Kurve (Rechtsknick auf Start/Ziel, 215 km/h)
    { x: -38, y: 0.0, z: -22, bankingDeg: 2.5, kerbRight: true, runOff: 'tarmac' },  // T10
  ],
  sectors: [
    { uStart: 0.000, uEnd: 0.185, turnNum: 0, name: 'START/ZIEL GERADE', code: 'S/F', f1Speed: 318, f1Gear: 7, f1GForce: 1.0, drsZone: 'DRS 3', speedTarget: 86.0 },
    { uStart: 0.185, uEnd: 0.282, turnNum: 1, name: 'T1 NIKI LAUDA KURVE', code: 'LAUDA', f1Speed: 150, f1Gear: 4, f1GForce: 3.4, speedTarget: 48.0, brakeMarker: true },
    { uStart: 0.282, uEnd: 0.448, turnNum: 0, name: 'SCHÖNBERG BERGAUF (+35M)', code: 'SCHÖNBERG', f1Speed: 338, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 1', speedTarget: 88.0 },
    { uStart: 0.448, uEnd: 0.527, turnNum: 3, name: 'T3 REMUS SPITZKEHRE (BERGGIPFEL)', code: 'REMUS', f1Speed: 65, f1Gear: 1, f1GForce: 2.2, speedTarget: 22.0, brakeMarker: true },
    { uStart: 0.527, uEnd: 0.673, turnNum: 0, name: 'SCHÖNBERG BERGAB (DRS 2)', code: 'DOWNHILL', f1Speed: 335, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 2', speedTarget: 88.0 },
    { uStart: 0.673, uEnd: 0.754, turnNum: 4, name: 'T4 SCHLOSSGOLD', code: 'SCHLOSSGOLD', f1Speed: 130, f1Gear: 3, f1GForce: 3.0, speedTarget: 38.0, brakeMarker: true },
    { uStart: 0.754, uEnd: 0.854, turnNum: 5, name: 'T5/T6 RAUCH & GERHARD BERGER', code: 'BERGER', f1Speed: 210, f1Gear: 5, f1GForce: 4.1, speedTarget: 58.0 },
    { uStart: 0.854, uEnd: 0.955, turnNum: 0, name: 'T7-T9 WÜRTH • GÖSSER • RINDT SWEEP', code: 'RINDT', f1Speed: 238, f1Gear: 6, f1GForce: 1.8, speedTarget: 68.0 },
    { uStart: 0.955, uEnd: 1.000, turnNum: 10, name: 'T10 RED BULL MOBILE', code: 'T10', f1Speed: 215, f1Gear: 5, f1GForce: 3.2, speedTarget: 62.0, brakeMarker: true },
  ],
  cameras: [
    { id: 'rbr_sf_gantry', name: 'Red Bull Ring Start/Finish Gantry Cam', type: 'gantry', uTarget: 0.093, offsetSide: 0.0, height: 7.5, focalLengthMm: 50, description: 'Start-Ziel Red Bull Ring Spielberg' },
    { id: 'rbr_lauda_tower', name: 'Niki Lauda Kurve Turn 1 Tower', type: 'tower', uTarget: 0.236, offsetSide: 25.0, height: 7.2, focalLengthMm: 300, description: 'Steile Rechtskurve Turn 1 Niki Lauda' },
    { id: 'rbr_remus_peak', name: 'Remus Hairpin Mountain Peak Tower', type: 'tower', uTarget: 0.493, offsetSide: 32.0, height: 11.0, focalLengthMm: 500, description: 'Monumentaler TV-Turm am Berggipfel der Remus Spitzkehre (+35m Bergauf)' },
    { id: 'rbr_downhill_zoom', name: 'Schönberg Downhill Long Zoom', type: 'tower', uTarget: 0.600, offsetSide: -24.0, height: 8.0, focalLengthMm: 450, description: 'High-Speed Bergabfahrt nach Schlossgold' },
    { id: 'rbr_schlossgold_cam', name: 'Schlossgold Braking Cam', type: 'tower', uTarget: 0.717, offsetSide: 26.0, height: 7.5, focalLengthMm: 320, description: 'Bremszone Schlossgold Kurve' },
    { id: 'rbr_rindt_tower', name: 'Jochen Rindt Kurve Apex Tower', type: 'tower', uTarget: 0.946, offsetSide: -22.0, height: 8.0, focalLengthMm: 350, description: 'Schneller Doppel-Rechtsbogen Jochen Rindt Kurve' },
    { id: 'rbr_t10_kerb', name: 'Red Bull Mobile Final Kerb Cam', type: 'kerb', uTarget: 0.971, offsetSide: -9.0, height: 0.35, focalLengthMm: 24, description: 'Randsteinkamera Kurve 10 zur Start-Ziel-Geraden' },
  ],
  racingLine: [
    // 1. Start/Ziel-Gerade: Vollkommen stabile Außen-Links-Linie (-7.0m) ohne Schlangenlinien
    { u: 0.000, offset: -7.0 },
    { u: 0.170, offset: -7.0 }, // Schnurgerade Vorbereitung auf T1
    { u: 0.236, offset: +8.0 }, // T1 Niki Lauda Apex: Innen Rechts am Scheitelpunkt-Randstein
    { u: 0.282, offset: -7.5 }, // T1 Ausgang: Weit Außen Links
    // 2. Schönberg Bergauf (+35m): Stabile, schnurgerade Außen-Links-Linie (-7.0m)
    { u: 0.295, offset: -7.0 },
    { u: 0.440, offset: -7.0 }, // Felsenfest gerade bergauf bis zum Remus-Bremspunkt
    { u: 0.493, offset: +8.5 }, // T3 Remus Spitzkehre Apex: Innen Rechts am Berggipfel-Randstein
    { u: 0.527, offset: -7.5 }, // T3 Remus Ausgang: Weit Außen Links
    // 3. Schönberg Bergab (DRS 2): Stabile Außen-Links-Linie (-7.0m)
    { u: 0.540, offset: -7.0 },
    { u: 0.665, offset: -7.0 }, // Felsenfest gerade bergab bis zum Schlossgold-Bremspunkt
    { u: 0.717, offset: +8.5 }, // T4 Schlossgold Apex: Innen Rechts am Scheitelpunkt
    { u: 0.754, offset: -7.0 }, // T4 Schlossgold Ausgang: Weit Außen Links
    // 4. Infield: T5/T6 Rauch & Berger (Schnelle Doppel-Links)
    { u: 0.770, offset: +6.0 }, // Einlenken Außen Rechts
    { u: 0.810, offset: -7.5 }, // Berger Apex: Innen Links am Scheitelpunkt
    { u: 0.840, offset: +3.0 }, // Sanfter Übergang
    // 5. T7, T8, T9 FLOWING SWEEP (Flacher, voll durchgezogener Hochgeschwindigkeits-Bogen)
    // Zieht ruhig und stabil von Mitte nach Außen-Links für T10
    { u: 0.860, offset: 0.0 },   // Ruhig durch T7 Würth
    { u: 0.890, offset: -2.5 },  // Sanfter Bogen durch T8 Gösser
    { u: 0.930, offset: -6.5 },  // Weit Außen Links durch T9 Jochen Rindt (Geraden-Charakter)
    // 6. T10 RED BULL MOBILE (Die einzige echte Kurve am Ende vor Start/Ziel)
    { u: 0.955, offset: -6.5 },  // Anbremsen & Einlenken von Außen Links
    { u: 0.975, offset: +7.5 },  // T10 Apex: Innen Rechts am Scheitelpunkt
    { u: 0.995, offset: -7.0 },  // Herausbeschleunigen auf Start/Ziel
  ]
};
