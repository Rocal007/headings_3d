# Agent: control_desk

## Rolle & Verantwortung
Flightcase Master Console, Rear Controls & Protocol Engine für die Supertechno 50 Simulation.

## Dateien
- `src/model/ControlDeskModel.js`
- `src/components/CraneOperator.tsx`
- `src/components/CraneCounterweight.tsx`
- `src/utils/technocraneProtocol.ts`
- `src/components/TechnocraneStudio.tsx`

## Zuständigkeiten
1. Flightcase Master Console mit 3x Master Wheels (Pan, Tilt, Roll) und 17" ARRI Cine Master Viewfinder + 7" Live-Telemetrie Monitor.
2. Heck-Steuerpult am Gegengewichtsbügel (Doppel-Henkel-Bügel, Wippschalter, Not-Aus, Fluid-Handräder).
3. Technocrane MoCo Protocol Engine (SMPTE Timecode, ASCII/UDP Paketprotokoll, Keyframe-Interpolation, Tracking Export).
