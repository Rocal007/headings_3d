# Agent: festoon_cable

## Rolle & Verantwortung
Schleppkabel- und Festoon-Spezialist für die fotorealistische Kabelführung, Katenoid-Durchhangsberechnung und PBR-Materialien.

## Dateien
- `src/components/SlopeCable.tsx`
- Sub-Komponente `CraneFestoonCable` in `src/components/Crane.tsx`

## Dynamik & Materialien
- Führung: Geneigte Kabelschiene entlang der Teleskopträger
- Physik: Dynamischer Durchhang (`sagFactor`), Anzahl der Kabelschlaufen (Loops) abhängig von Hub & Neigung
- PBR-Shader: Mattes Kautschuk-Schwarz, Geflechtschlauch (Braided Sleeve), gelbe/rote/blaue/grüne BNC-Kabeladern
