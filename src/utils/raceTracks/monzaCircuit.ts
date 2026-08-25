import type { CircuitDefinition } from './trackTypes';

/**
 * 🇮🇹 AUTODROMO NAZIONALE MONZA (Temple of Speed)
 * Das High-Speed-Mekka mit 11 Kurven, extremen Bremszonen und der legendären Parabolica
 */
export const MONZA_CIRCUIT: CircuitDefinition = {
  id: 'monza',
  name: 'Autodromo Nazionale Monza',
  country: 'Italien',
  flag: '🇮🇹',
  lengthKm: 5.793,
  turnsCount: 11,
  lapRecord: { time: '1:21.046', driver: 'Rubens Barrichello', year: 2004 },
  elevationGainM: 12.8,
  description: 'Der legendäre "Temple of Speed" im königlichen Park von Monza mit High-Speed-Geraden und harten Schikanen.',
  trackWidth: 28.0,
  scale: 4.8,
  controlPoints: [
    // 1. Rettifilo Straight (Start/Ziel - Läuft von Süden nach Norden)
    { x: -18, y: 0.0, z: 42, kerbLeft: false, kerbRight: false },
    { x: -18, y: 0.2, z: 15, kerbLeft: false, kerbRight: false }, // Start-Ziel-Gantry
    { x: -18, y: 0.4, z: -18, kerbLeft: false, kerbRight: false },
    { x: -18, y: 0.5, z: -48, kerbLeft: false, kerbRight: false }, // Harter Bremspunkt (350 km/h)
    // 2. T1 & T2: Variante del Rettifilo (Rechts-Links Schikane)
    { x: -16, y: 0.4, z: -56, bankingDeg: 2.5, kerbRight: true, runOff: 'tarmac' }, // T1 Rechts (75 km/h)
    { x: -21, y: 0.3, z: -62, bankingDeg: -2.5, kerbLeft: true, runOff: 'gravel' }, // T2 Links (85 km/h)
    { x: -17, y: 0.2, z: -68, kerbRight: true, runOff: 'grass' },
    // 3. T3: Curva Grande (Curva Biassono - Schneller Rechtsbogen)
    { x: -10, y: -0.2, z: -76, bankingDeg: 3.0, kerbRight: true, runOff: 'grass' },
    { x: 5, y: -0.6, z: -80, bankingDeg: 4.0, kerbRight: true, runOff: 'tarmac' }, // T3 Curva Grande Apex (300 km/h)
    { x: 22, y: -0.8, z: -76, bankingDeg: 2.5, kerbRight: true, runOff: 'grass' },
    // 4. Gerade Richtung Roggia
    { x: 34, y: -0.7, z: -64, kerbLeft: false, kerbRight: false },
    { x: 42, y: -0.5, z: -48, kerbLeft: false, kerbRight: false }, // Bremspunkt (330 km/h)
    // 5. T4 & T5: Variante della Roggia (Links-Rechts Schikane)
    { x: 45, y: -0.3, z: -42, bankingDeg: -3.0, kerbLeft: true, runOff: 'gravel' }, // T4 Links (115 km/h)
    { x: 49, y: -0.1, z: -37, bankingDeg: 3.0, kerbRight: true, runOff: 'gravel' }, // T5 Rechts (130 km/h)
    { x: 50, y: 0.1, z: -30, kerbLeft: true, runOff: 'tarmac' },
    // 6. T6 & T7: Curva di Lesmo 1 & Lesmo 2
    { x: 54, y: 0.5, z: -20, bankingDeg: 3.5, kerbRight: true, runOff: 'gravel' }, // T6 Lesmo 1 (195 km/h)
    { x: 53, y: 0.8, z: -10, kerbLeft: true, runOff: 'grass' },
    { x: 54, y: 1.0, z: 2, bankingDeg: 3.5, kerbRight: true, runOff: 'gravel' }, // T7 Lesmo 2 (165 km/h)
    { x: 48, y: 1.1, z: 12, kerbLeft: true, runOff: 'grass' },
    // 7. Curva del Serraglio (Unterführung der alten Steilkurve)
    { x: 40, y: 0.6, z: 20, kerbLeft: false, kerbRight: false },
    { x: 32, y: 0.0, z: 26, kerbLeft: false, kerbRight: false },
    { x: 20, y: -0.4, z: 32, kerbLeft: false, kerbRight: false }, // Anfahrt Ascari (340 km/h)
    // 8. T8, T9, T10: Variante Ascari (Links-Rechts-Links)
    { x: 12, y: -0.6, z: 35, bankingDeg: -3.0, kerbLeft: true, runOff: 'tarmac' }, // T8 Ascari 1 (175 km/h)
    { x: 4, y: -0.5, z: 34, bankingDeg: 4.0, kerbRight: true, runOff: 'gravel' }, // T9 Ascari 2 (215 km/h)
    { x: -4, y: -0.3, z: 37, bankingDeg: -3.0, kerbLeft: true, runOff: 'tarmac' }, // T10 Ascari 3 (235 km/h)
    // 9. Rettifilo Posteriore (Gegengerade - Top Speed 350 km/h)
    { x: -14, y: 0.0, z: 42, kerbLeft: false, kerbRight: false },
    { x: -26, y: 0.3, z: 50, kerbLeft: false, kerbRight: false },
    { x: -38, y: 0.6, z: 58, kerbLeft: false, kerbRight: false }, // Bremspunkt Parabolica
    // 10. T11: Curva Parabolica (Curva Alboreto - Monumentaler 180° Rechtsbogen)
    { x: -48, y: 0.8, z: 62, bankingDeg: 3.5, kerbRight: true, runOff: 'gravel' }, // T11 Entry (215 km/h)
    { x: -56, y: 0.5, z: 56, bankingDeg: 4.0, kerbRight: true, runOff: 'tarmac' }, // Parabolica Mid
    { x: -52, y: 0.2, z: 46, bankingDeg: 3.0, kerbRight: true, runOff: 'tarmac' }, // Parabolica Exit (270 km/h)
    { x: -36, y: 0.0, z: 42, kerbLeft: true, runOff: 'tarmac' }, // Beschleunigung auf Start/Ziel
  ],
  sectors: [
    { uStart: 0.00, uEnd: 0.12, turnNum: 0, name: 'RETTIFILO START/ZIEL', code: 'S/F', f1Speed: 350, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 1', speedTarget: 88.0 },
    { uStart: 0.12, uEnd: 0.18, turnNum: 1, name: 'T1/T2 VARIANTE RETTIFILO', code: 'RETTIFILO', f1Speed: 75, f1Gear: 2, f1GForce: 2.4, speedTarget: 26.0, brakeMarker: true },
    { uStart: 0.18, uEnd: 0.30, turnNum: 3, name: 'T3 CURVA GRANDE (BIASSONO)', code: 'BIASSONO', f1Speed: 300, f1Gear: 8, f1GForce: 3.4, speedTarget: 78.0 },
    { uStart: 0.30, uEnd: 0.38, turnNum: 0, name: 'SERRAGLIO APPROACH', code: 'STRAIGHT', f1Speed: 330, f1Gear: 8, f1GForce: 1.0, speedTarget: 86.0 },
    { uStart: 0.38, uEnd: 0.46, turnNum: 4, name: 'T4/T5 VARIANTE DELLA ROGGIA', code: 'ROGGIA', f1Speed: 115, f1Gear: 2, f1GForce: 2.6, speedTarget: 34.0, brakeMarker: true },
    { uStart: 0.46, uEnd: 0.54, turnNum: 6, name: 'T6 CURVA DI LESMO 1', code: 'LESMO 1', f1Speed: 195, f1Gear: 5, f1GForce: 3.2, speedTarget: 52.0, brakeMarker: true },
    { uStart: 0.54, uEnd: 0.62, turnNum: 7, name: 'T7 CURVA DI LESMO 2', code: 'LESMO 2', f1Speed: 165, f1Gear: 4, f1GForce: 3.5, speedTarget: 46.0 },
    { uStart: 0.62, uEnd: 0.72, turnNum: 0, name: 'CURVA DEL SERRAGLIO', code: 'SERRAGLIO', f1Speed: 340, f1Gear: 8, f1GForce: 1.0, drsZone: 'DRS 2', speedTarget: 88.0 },
    { uStart: 0.72, uEnd: 0.82, turnNum: 8, name: 'T8-T10 VARIANTE ASCARI', code: 'ASCARI', f1Speed: 175, f1Gear: 4, f1GForce: 3.8, speedTarget: 48.0, brakeMarker: true },
    { uStart: 0.82, uEnd: 0.90, turnNum: 0, name: 'RETTIFILO POSTERIORE', code: 'BACK STRAIGHT', f1Speed: 350, f1Gear: 8, f1GForce: 1.0, speedTarget: 88.0 },
    { uStart: 0.90, uEnd: 1.00, turnNum: 11, name: 'T11 CURVA PARABOLICA (ALBORETO)', code: 'PARABOLICA', f1Speed: 215, f1Gear: 5, f1GForce: 3.6, speedTarget: 65.0, brakeMarker: true },
  ],
  cameras: [
    { id: 'mon_sf_gantry', name: 'Monza Start/Finish Gantry Cam', type: 'gantry', uTarget: 0.02, offsetSide: 0.0, height: 7.5, focalLengthMm: 50, description: 'Overhead Start/Ziel Kamera Monza' },
    { id: 'mon_rettifilo_tower', name: 'Variante del Rettifilo Tower', type: 'tower', uTarget: 0.14, offsetSide: 28.0, height: 8.5, focalLengthMm: 420, description: 'Bremszonen-Turm Rettifilo Schikane 350 -> 75 km/h' },
    { id: 'mon_biassono_cam', name: 'Curva Grande High Speed Cam', type: 'tower', uTarget: 0.24, offsetSide: -24.0, height: 7.0, focalLengthMm: 300, description: 'High-Speed Bogen Curva Grande' },
    { id: 'mon_roggia_tower', name: 'Variante della Roggia Tower', type: 'tower', uTarget: 0.40, offsetSide: 25.0, height: 8.0, focalLengthMm: 350, description: 'Außenturm Roggia Schikane' },
    { id: 'mon_lesmo_cam', name: 'Curva di Lesmo 1 & 2 Apex Cam', type: 'tower', uTarget: 0.52, offsetSide: -20.0, height: 6.5, focalLengthMm: 280, description: 'Doppelkurve Lesmo' },
    { id: 'mon_serraglio_zoom', name: 'Serraglio Super-Speed Zoom', type: 'tower', uTarget: 0.66, offsetSide: 22.0, height: 6.0, focalLengthMm: 500, description: 'Tele-Verfolgung unter der alten Steilkurven-Brücke' },
    { id: 'mon_ascari_tower', name: 'Variante Ascari Scaffolding Tower', type: 'tower', uTarget: 0.76, offsetSide: 26.0, height: 9.0, focalLengthMm: 360, description: 'Ascari Schikanen-Komplex' },
    { id: 'mon_parabolica_high', name: 'Curva Parabolica Monumental High Tower', type: 'tower', uTarget: 0.94, offsetSide: 32.0, height: 11.5, focalLengthMm: 600, description: 'Monumentaler TV-Turm an der 180° Parabolica-Kurve' },
  ]
};
