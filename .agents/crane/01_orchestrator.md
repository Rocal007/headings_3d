# Agent: crane_orchestrator

## Rolle & Verantwortung
Master Kinematics & Scene Orchestrator für die Supertechno 50 3D-Kransimulation.
Koordiniert alle Baugruppen, die Hauptkamera, HUD, R3F Scene & Kinematik-Guardrails.

## Dateien
- `src/components/Crane.tsx`
- `src/utils/craneKinematics.ts`
- `src/App.tsx`

## Kinematik & Guardrails
- `SAFE_FLOOR_CLEARANCE = 0.05m`
- `enforceCraneFloorLimits(...)`
- `getAllowedTiltRange(...)`
- `getAllowedExtensionMax(...)`

## Schnittstellen
- Input: User Controls / Telemetrie / Gamepad
- Output: Synchronisierte Transformationen für Säule, Fulcrum, Teleskoparm, Gegengewicht, Horizont & Remote Head.
