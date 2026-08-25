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
  trackWidth: 12.0,
  scale: 4.8,
  controlPoints: [
    // 1. Start/Ziel-Gerade
    { x: -35, y: 0.0, z: -15, kerbLeft: false, kerbRight: false },
    { x: -10, y: 0.2, z: -15, kerbLeft: false, kerbRight: false }, // Start-Ziel-Gantry
    { x: 15, y: 0.4, z: -15, kerbLeft: false, kerbRight: false },  // Bremspunkt Niki Lauda Kurve (315 km/h)
    // 2. T1: Niki Lauda Kurve (Rechtskurve bergauf)
    { x: 26, y: 1.0, z: -13, bankingDeg: 3.5, kerbRight: true, runOff: 'tarmac' }, // T1 (150 km/h)
    { x: 30, y: 2.2, z: -4, kerbLeft: true, runOff: 'tarmac' },
    // 3. STEILER BERGAUF-SPRINT SCHÖNBERG (+35m Höhenunterschied, DRS 1, 335 km/h)
    { x: 32, y: 5.5, z: 12, kerbLeft: false, kerbRight: false },
    { x: 34, y: 9.0, z: 28, kerbLeft: false, kerbRight: false },
    { x: 35, y: 11.8, z: 44, kerbLeft: false, kerbRight: false }, // Höchster Streckenpunkt & Harter Bremspunkt Remus
    // 4. T3: REMUS HAIRPIN (Extrem enge 180° Spitzkehre Rechts am Berg, 65 km/h!)
    { x: 33, y: 12.0, z: 54, bankingDeg: 4.5, kerbRight: true, runOff: 'gravel' }, // T3 Apex
    { x: 25, y: 11.2, z: 56, kerbLeft: true, runOff: 'tarmac' },
    // 5. Schönberg Bergab-Passage (DRS 2, 330 km/h)
    { x: 12, y: 9.0, z: 46, kerbLeft: false, kerbRight: false },
    { x: -2, y: 6.5, z: 36, kerbLeft: false, kerbRight: false },
    { x: -14, y: 4.2, z: 28, kerbLeft: false, kerbRight: false }, // Bremspunkt Schlossgold
    // 6. T4: Schlossgold (90° Rechtskurve bergab)
    { x: -24, y: 2.8, z: 22, bankingDeg: 3.0, kerbRight: true, runOff: 'gravel' }, // T4 (130 km/h)
    { x: -30, y: 1.8, z: 14, kerbLeft: true, runOff: 'tarmac' },
    // 7. T5 & T6: Rauch & Gerhard Berger Kurve (Doppel-Links)
    { x: -36, y: 1.0, z: 6, bankingDeg: -3.5, kerbLeft: true, runOff: 'gravel' }, // T5 Rauch (190 km/h)
    { x: -44, y: 0.4, z: 0, bankingDeg: -4.0, kerbLeft: true, runOff: 'gravel' },  // T6 Berger (210 km/h)
    { x: -50, y: 0.0, z: -4, kerbRight: true, runOff: 'tarmac' },
    // 8. T7 & T8: Würth & Gösser Kurve (Rechtskurven)
    { x: -52, y: -0.2, z: -12, bankingDeg: 3.0, kerbRight: true, runOff: 'gravel' }, // T7 Würth (205 km/h)
    { x: -50, y: -0.3, z: -20, bankingDeg: 3.5, kerbRight: true, runOff: 'tarmac' }, // T8 (230 km/h)
    // 9. T9: Jochen Rindt Kurve (High-Speed Rechts)
    { x: -44, y: -0.2, z: -25, bankingDeg: 3.5, kerbRight: true, runOff: 'gravel' }, // T9 Rindt (220 km/h)
    // 10. T10: Red Bull Mobile Kurve (Rechtsknick auf Start/Ziel)
    { x: -38, y: 0.0, z: -22, bankingDeg: 2.5, kerbRight: true, runOff: 'tarmac' },  // T10 (215 km/h)
  ],
  sectors: [
    { uStart: 0.00, uEnd: 0.10, turnNum: 0, name: 'START/ZIEL GERADE', code: 'S/F', f1Speed: 315, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 3', speedTarget: 84.0 },
    { uStart: 0.10, uEnd: 0.18, turnNum: 1, name: 'T1 NIKI LAUDA KURVE', code: 'LAUDA', f1Speed: 150, f1Gear: 4, f1GForce: 3.2, speedTarget: 50.0, brakeMarker: true },
    { uStart: 0.18, uEnd: 0.35, turnNum: 0, name: 'SCHÖNBERG BERGAUF (+35M)', code: 'SCHÖNBERG', f1Speed: 335, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 1', speedTarget: 86.0 },
    { uStart: 0.35, uEnd: 0.44, turnNum: 3, name: 'T3 REMUS SPITZKEHRE (BERGGIPFEL)', code: 'REMUS', f1Speed: 65, f1Gear: 1, f1GForce: 2.2, speedTarget: 22.0, brakeMarker: true },
    { uStart: 0.44, uEnd: 0.55, turnNum: 0, name: 'SCHÖNBERG BERGAB (DRS 2)', code: 'DOWNHILL', f1Speed: 330, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 2', speedTarget: 88.0 },
    { uStart: 0.55, uEnd: 0.64, turnNum: 4, name: 'T4 SCHLOSSGOLD', code: 'SCHLOSSGOLD', f1Speed: 130, f1Gear: 3, f1GForce: 2.8, speedTarget: 38.0, brakeMarker: true },
    { uStart: 0.64, uEnd: 0.72, turnNum: 5, name: 'T5/T6 RAUCH & GERHARD BERGER', code: 'BERGER', f1Speed: 210, f1Gear: 5, f1GForce: 3.8, speedTarget: 58.0 },
    { uStart: 0.72, uEnd: 0.82, turnNum: 7, name: 'T7/T8 WÜRTH & GÖSSER', code: 'WÜRTH', f1Speed: 205, f1Gear: 5, f1GForce: 3.5, speedTarget: 56.0 },
    { uStart: 0.82, uEnd: 0.92, turnNum: 9, name: 'T9 JOCHEN RINDT KURVE', code: 'RINDT', f1Speed: 220, f1Gear: 6, f1GForce: 3.6, speedTarget: 60.0, brakeMarker: true },
    { uStart: 0.92, uEnd: 1.00, turnNum: 10, name: 'T10 RED BULL MOBILE', code: 'T10', f1Speed: 215, f1Gear: 5, f1GForce: 3.2, speedTarget: 62.0 },
  ]
};
