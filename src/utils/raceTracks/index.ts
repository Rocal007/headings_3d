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
  red_bull_ring: RED_BULL_RING_CIRCUIT,
  silverstone: SILVERSTONE_CIRCUIT,
  monza: MONZA_CIRCUIT,
  spa: SPA_CIRCUIT,
};

export const CIRCUITS_LIST: CircuitDefinition[] = [
  RED_BULL_RING_CIRCUIT,
];

/** Liefert die Definition einer GP-Strecke anhand ihrer ID */
export function getCircuit(id: CircuitId): CircuitDefinition {
  return CIRCUITS_REGISTRY[id] || RED_BULL_RING_CIRCUIT;
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

/** Ermittelt den dynamischen Querversatz der Ideallinie (Racing Line) am Scheitelpunkt in Metern */
export function getCircuitRacingLineOffset(circuit: CircuitDefinition, u: number): number {
  if (!circuit.racingLine || circuit.racingLine.length === 0) return 0;
  const kf = circuit.racingLine;
  const n = kf.length;
  const normU = ((u % 1.0) + 1.0) % 1.0;

  let idx0 = n - 1;
  let idx1 = 0;
  for (let i = 0; i < n; i++) {
    const nextI = (i + 1) % n;
    const u0 = kf[i].u;
    let u1 = kf[nextI].u;
    if (u1 <= u0) u1 += 1.0;
    let testU = normU;
    if (testU < u0) testU += 1.0;
    if (testU >= u0 && testU < u1) {
      idx0 = i;
      idx1 = nextI;
      break;
    }
  }

  const k0 = kf[idx0];
  const k1 = kf[idx1];
  let u0 = k0.u;
  let u1 = k1.u;
  if (u1 <= u0) u1 += 1.0;
  let curU = normU;
  if (curU < u0) curU += 1.0;

  const t = Math.max(0, Math.min(1, (curU - u0) / (u1 - u0)));
  // C1-glatte kubische Hermite-Interpolation (Smoothstep)
  const smoothT = t * t * (3.0 - 2.0 * t);
  return k0.offset + (k1.offset - k0.offset) * smoothT;
}
