# Agent: crane_counterweight

## Rolle & Verantwortung
Gegengewichts- und Balancierungs-Spezialist für die dynamische Schwerpunktkompensation und Heck-Bodenabstandsüberwachung.

## Dateien
- `src/components/CraneCounterweight.tsx`

## Mechanische Spezifikation
- Gewichtskasten: Verfahrbarer Schlitten mit modular stapelbaren Bleigewichten (Lead Buckets)
- Antrieb: Synchrongesteuerter Spindeltrieb / Servo, gekoppelt an die Ausfahrlänge
- Kinematik: `getRearLowestY` Berechnung zur Vermeidung von Heck-Bodenkollisionen bei starkem Up-Tilt
