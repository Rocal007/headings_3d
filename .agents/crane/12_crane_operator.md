# Agent: crane_operator

## Rolle & Verantwortung
Film Set Two-Operator Crew & Controls Master für die Supertechno 50 Kransimulation.
Verantwortlich für die 3D-Charakter-Modelle, realistische Motion-Capture-Kinematik, Steuerpult-Synchronisation und dynamische Bedienerinteraktion.

## Dateien
- `src/components/CraneOperator.tsx`
- `src/components/Crane.tsx`

## Spezifikation & Features

### 1. Heck-Kranführer (Rear Crane Operator)
- **Position**: $X = 0\,\text{m}, Y = 0\,\text{m}, Z = \text{dollyTrack} + 4.1\,\text{m}$ (steht direkt am Heck-Steuerstand hinter dem Gegengewichtsschlitten)
- **Rig & Styling**: Vintage "SUPERTECHNO CINE CRANE OPS" Trucker-Cap, Salt-&-Pepper Haar/Vollbart, In-Ear-Akustik-Spiralschlauch, Outdoor-Setjacke mit reflektierenden Streifen, Grip-Handschuhe
- **Synchronisation**:
  - Linke & rechte Hand synchronisiert auf die goldenen Fluid-Handräder (`basePan`, `boomTilt`)
  - Joystick-Steuerung für Teleskop-Hubweg (`teleExtension`)
- **Look-At IK**: Dynamisches Kopf- und Blick-Tracking zur Kranspitze / Linsenhöhe

### 2. DoP / Remote-Head Operator am Bodenpult (Floor Desk Operator)
- **Position**: $X = 3.2\,\text{m}, Y = 0\,\text{m}, Z = \text{dollyTrack} + 0.8\,\text{m}$ (Flightcase-Pult neben der Schiene)
- **Rig & Styling**: Film-Crew Hoodie ("TECHNOCRANE HEAD & MOCO OPERATOR"), Pro Cine-Headset mit Schwanenhals-Mikrofon
- **Synchronisation**:
  - 3x Master Wheels für Pan, Tilt, Roll (`headPan`, `headTilt`, `headRoll`)
  - FIZ-Kamerasteuerung (Focus, Iris, Zoom Handheld Unit)
- **Equipment**: Heavy-Duty Stativ, Flightcase-Basis, 17" ARRI Live-Master-Monitor (Frame Guides, Waveform, TC), 7" Zusatzmonitor, Snake-Multicore-Bodenkabel

### 3. Synchronisierte Walk-In/Walk-Out-Kinematik
- **Ablauf**: Flüssige Laufanimationen von Staging-Positionen zu den Pulten bei Aktivierung (`showCrew = true`) und Rückzug bei Deaktivierung.
- **Kamera-Modi**: Spezial-Fokus-Perspektiven (`case 'operator'`, `case 'desk'`).
