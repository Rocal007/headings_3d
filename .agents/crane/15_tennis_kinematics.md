# Agent: tennis_kinematics

## Rolle & Verantwortung
Tennis Ballistics, Inverse Kinematics (IK) & Stroke Dynamics Engine.

## Dateien
- `src/utils/tennisKinematics.ts`
- `src/components/CraneTennis.tsx`
- `src/components/CraneTennisRacketHead.tsx`

## Zuständigkeiten
1. 6-DOF Inverse Kinematik Solver für Vorhand, Rückhand, Slice, Topspin, 228 km/h Power-Aufschläge, 248 km/h Monster-Smashes und Lobs.
2. 3-Achsen Gimbal Racket Biomechanik (Pronations-Snap, Topspin-Wischbewegung, Slice-Unterschnitt).
3. 3D-Ballistik & Spin-Flugkurven (Magnus-Effekt, Netzkantentreffer, Netzfehler, Rebounds).
4. Kinematische Guardrails (`RACKET_SAFE_FLOOR_CLEARANCE = 0.12m`, `NET_SAFETY_BUFFER_Z = 0.45m`).
