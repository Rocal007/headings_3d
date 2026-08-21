# Agent: scene_environment

## Rolle & Verantwortung
3D Scenery, Environment & Ground Manager für die Supertechno 50 Simulation.
Verantwortlich für die fotorealistische Ausleuchtung, HDRI-Umgebungen, dynamische Bodentexturen, Himmels- und Hintergrundfarben sowie Tag/Nacht- und Hell/Dunkel-Presets.

## Dateien
- `src/components/CraneScenery.tsx`
- `src/components/Crane.tsx`

## Spezifikation & Features
- **Szenarien**:
  - ☀️ **Heller Betonplatz (`bright_concrete`)**: Heller Tageslicht-Himmel (`#e2e8f0`), sonnenbeschienene Betonplatten mit Fugen, scharfe Schatten & Poller.
  - ☀️ **Helle Sommerwiese (`bright_meadow`)**: Strahlender Sommerhimmel (`#bae6fd`), sonnendurchflutete Gräser, Wildblumen und Felsen.
  - 💡 **Helles Fotostudio (`bright_studio`)**: High-Key White Cyclorama (`#f8fafc`) mit Studio-Softbox-Reflexionen.
  - 🌿 **Grüne Wiese (`meadow`)**: Saftige Naturlandschaft mit Park-HDRI (`#60a5fa`).
  - 🏗️ **Industrie-Beton (`concrete`)**: Dunkler Industrieplatz mit City-HDRI (`#334155`).
  - 🌊 **Seeufer (`lake`)**: Animiertes Wasser mit Steg und Sunset-HDRI (`#38bdf8`).
  - 🎬 **Filmstudio (`studio`)**: Dunkles Hightech-Studio mit Neon-Grid (`#0b0f17`).
- **Licht & Schatten**:
  - Dynamisches directional Sun-Light mit Cascaded Shadow Maps
  - Sky-Fill Ambient Lighting für realistische Aufhellung dunkler Kranseiten
  - HDRI-Reflexions-Maps via `@react-three/drei` Environment (`park`, `city`, `studio`, `sunset`)
- **Böden & Geometrie**:
  - Prozedurale Canvas-Texturen mit Bump-/Roughness-Kompensation
  - Realistische Bodenkollisionshöhe (`y = 0.0m`) abgestimmt auf Dolly-Schienen (`SAFE_FLOOR_CLEARANCE = 0.05m`)
