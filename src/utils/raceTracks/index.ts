import type { CircuitDefinition, CircuitId, TrackSectorInfo } from './trackTypes';
import { SILVERSTONE_CIRCUIT } from './silverstoneCircuit';
import { MONZA_CIRCUIT } from './monzaCircuit';
import { SPA_CIRCUIT } from './spaCircuit';
import { RED_BULL_RING_CIRCUIT } from './redBullRingCircuit';

export * from './trackTypes';
export * from './trackGeometryBuilder';
export * from './silverstoneCircuit';
export * from './monzaCircuit';
export * from './spaCircuit';
export * from './redBullRingCircuit';

/** Offizielles Register aller FIA Grand Prix Rennstrecken */
export const CIRCUITS_REGISTRY: Record<CircuitId, CircuitDefinition> = {
  silverstone: SILVERSTONE_CIRCUIT,
  monza: MONZA_CIRCUIT,
  spa: SPA_CIRCUIT,
  red_bull_ring: RED_BULL_RING_CIRCUIT,
};

export const CIRCUITS_LIST: CircuitDefinition[] = [
  SILVERSTONE_CIRCUIT,
  MONZA_CIRCUIT,
  SPA_CIRCUIT,
  RED_BULL_RING_CIRCUIT,
];

/** Liefert die Definition einer GP-Strecke anhand ihrer ID */
export function getCircuit(id: CircuitId): CircuitDefinition {
  return CIRCUITS_REGISTRY[id] || SILVERSTONE_CIRCUIT;
}

/** Ermittelt den aktuellen Streckenabschnitt einer Strecke basierend auf u in [0, 1) */
export function getCircuitSector(circuit: CircuitDefinition, u: number): TrackSectorInfo {
  const normU = ((u % 1) + 1) % 1;
  for (const s of circuit.sectors) {
    if (normU >= s.uStart && normU < s.uEnd) {
      return s;
    }
  }
  return circuit.sectors[0];
}
