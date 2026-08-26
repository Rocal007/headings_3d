import * as THREE from 'three';

/**
 * ============================================================================
 * CRANE KINEMATICS & GROUND-FLOOR BOUNDARY SAFETY ENFORCEMENT (Y >= 0)
 * Calibrated for SuperTechno 50 Plus with RemoteCameraHead & Counterweight Cage.
 * ============================================================================
 */

export const SAFE_FLOOR_CLEARANCE = 0.12; // 12cm safety buffer above the floor/tracks
export const HEAD_BOTTOM_DROP = 1.18;     // 1.18m total drop from tip axis to lowest point of camera/mattebox/rods/bracket
export const REAR_CAGE_DROP = 0.38;       // 0.38m drop from boom axis to bottom rung of rear cage
export const REAR_CAGE_Z = 3.76;          // 3.76m distance along boom axis from pivot to rear cage
export const TIP_Z_RETRACTED = 3.34;      // 3.34m from pivot to front nose mounting point
export const TELESCOPIC_STROKE = 11.40;   // 11.40m maximum telescopic extension stroke

/**
 * 🧑 Ergonomic reach limits for the Rear Hand Crane Operator standing at ground level.
 * Ground operator height: ~1.80m, comfortable handle reach from ground: 0.82m to 2.05m.
 * Rear handle along boom: Z = 3.74m, Y_local = -0.16m.
 */
export const OPERATOR_HANDLE_Z = 3.74;
export const OPERATOR_HANDLE_Y = -0.16;
export const OPERATOR_MIN_REACH_Y = 0.82; // Ergonomic low reach with knees bent
export const OPERATOR_MAX_REACH_Y = 2.05; // Ergonomic high reach with arms overhead
export const OPERATOR_MAX_COLUMN_ELEVATION = 2.15; // Max column lift while standing operator holds handle

export interface CraneKinematics {
  dollyTrack: number;
  columnElevation: number; // 1.54m to 3.63m
  basePan: number;         // -90°..+90° (180° mode) or -180°..+180° (360° mode)
  boomTilt: number;        // Dynamically constrained so front and rear Y >= floorLimit
  teleExtension: number;   // 0m to 11.3m (dynamically constrained so front Y >= floorLimit)
  headPan: number;
  headTilt: number;
  headRoll: number;
}

/**
 * Distance from fulcrum (pivot) to boom tip along the boom axis.
 * Retracted: 3.34m; Fully extended: 3.34m + 11.40m = 14.74m.
 */
export function getBoomTipDistance(teleExtension: number): number {
  const ext = Math.max(0, Math.min(11.30, teleExtension || 0));
  return TIP_Z_RETRACTED + (ext / 11.30) * TELESCOPIC_STROKE;
}

/**
 * Lowest World Y coordinate of the Front End (Boom Tip + Remote Camera Head).
 */
export function getFrontLowestY(
  columnElevation: number,
  boomTiltDeg: number,
  teleExtension: number
): number {
  const colH = Math.max(1.54, Math.min(3.63, columnElevation || 1.54));
  const tiltRad = THREE.MathUtils.degToRad(boomTiltDeg || 0);
  const L_front = getBoomTipDistance(teleExtension);
  
  // World Y of the tip: colH + tipY * cos(tilt) + L_front * sin(tilt)
  // When boomTiltDeg < 0, sin(tilt) is negative (front moves downward)
  const tipY = colH + 0.05 * Math.cos(tiltRad) + L_front * Math.sin(tiltRad);
  return tipY - HEAD_BOTTOM_DROP;
}

/**
 * Lowest World Y coordinate of the Rear End of the Crane.
 */
export function getRearLowestY(
  columnElevation: number,
  boomTiltDeg: number,
  teleExtension = 0
): number {
  const colH = Math.max(1.54, Math.min(3.63, columnElevation || 1.54));
  const tiltRad = THREE.MathUtils.degToRad(boomTiltDeg || 0);

  // 1. Rear Safety Cage bottom rung & outer cage frame
  const cageY = colH - REAR_CAGE_DROP * Math.cos(tiltRad) - REAR_CAGE_Z * Math.sin(tiltRad);

  // 2. Rear boom girder tip
  const girderY = colH - 0.28 * Math.cos(tiltRad) - 3.66 * Math.sin(tiltRad);

  // 3. Dynamic U-Saddle Counterweight Sled
  const tExt = Math.max(0, Math.min(1.0, (teleExtension || 0) / 11.3));
  const sledZ = THREE.MathUtils.lerp(0.68, 3.52, tExt);
  const sledY = colH - 0.19 * Math.cos(tiltRad) - sledZ * Math.sin(tiltRad);

  // 4. Underslung electronics bay
  const underBayY = colH - 0.41 * Math.cos(tiltRad) - 2.90 * Math.sin(tiltRad);

  return Math.min(cageY, girderY, sledY, underBayY);
}

/**
 * Calculates the dynamic allowed Tilt Range [minTilt, maxTilt] in degrees
 * such that Front lowest Y >= floorLimit AND Rear lowest Y >= floorLimit.
 * If isOperatorActive === true, strictly clamps range to the standing operator's reachable grasp window!
 */
export function getAllowedTiltRange(
  columnElevation: number,
  teleExtension: number,
  floorLimit = SAFE_FLOOR_CLEARANCE,
  isOperatorActive = false
): { minTilt: number; maxTilt: number } {
  const colH = Math.max(1.54, Math.min(3.63, columnElevation || 1.54));
  const ext = Math.max(0, Math.min(11.3, teleExtension || 0));

  // Max Tilt UP (strictly constrained by rear safety cage dipping toward floor):
  // colH - REAR_CAGE_DROP cos(tilt) - REAR_CAGE_Z sin(tilt) >= floorLimit
  const R_rear = Math.sqrt(REAR_CAGE_DROP * REAR_CAGE_DROP + REAR_CAGE_Z * REAR_CAGE_Z);
  const phi_rear = Math.atan2(REAR_CAGE_DROP, REAR_CAGE_Z);
  const targetRearRatio = (colH - floorLimit) / R_rear;
  
  let maxTiltDeg = 55.0;
  if (targetRearRatio <= -1.0) {
    maxTiltDeg = -50.0;
  } else if (targetRearRatio >= 1.0) {
    maxTiltDeg = 55.0;
  } else {
    const maxTiltRad = Math.asin(targetRearRatio) - phi_rear;
    maxTiltDeg = Math.min(55.0, Math.max(-50.0, THREE.MathUtils.radToDeg(maxTiltRad)));
  }

  // Min Tilt DOWN (constrained by front camera head dipping toward floor):
  // colH + 0.05 cos(alpha) - L_front sin(alpha) - HEAD_BOTTOM_DROP >= floorLimit (with alpha = -tilt > 0)
  const L_front = getBoomTipDistance(ext);
  const R_front = Math.sqrt(0.05 * 0.05 + L_front * L_front);
  const phi_front = Math.atan2(0.05, L_front);
  const targetFrontRatio = (colH - HEAD_BOTTOM_DROP - floorLimit) / R_front;

  let minTiltDeg = -50.0;
  if (targetFrontRatio <= 0) {
    minTiltDeg = 0.0; // Cannot tilt down below horizontal at all if headroom <= 0
  } else if (targetFrontRatio >= 1.0) {
    minTiltDeg = -50.0;
  } else {
    const maxAlphaRad = Math.asin(targetFrontRatio) + phi_front;
    minTiltDeg = Math.max(-50.0, Math.min(0.0, -THREE.MathUtils.radToDeg(maxAlphaRad)));
  }

  // 🧑 HUMAN OPERATOR REACH RESTRICTIONS (When hand operator is active at the rear)
  if (isOperatorActive) {
    const R_op = Math.sqrt(OPERATOR_HANDLE_Y * OPERATOR_HANDLE_Y + OPERATOR_HANDLE_Z * OPERATOR_HANDLE_Z);
    const phi_op = Math.atan2(-OPERATOR_HANDLE_Y, OPERATOR_HANDLE_Z); // atan2(0.16, 3.74)

    // Operator Max Tilt UP (handle moves DOWN toward minimum reach 0.82m):
    const maxOpRatio = THREE.MathUtils.clamp((colH - OPERATOR_MIN_REACH_Y) / R_op, -1, 1);
    const maxOpTiltRad = Math.asin(maxOpRatio) - phi_op;
    const maxOpTiltDeg = THREE.MathUtils.radToDeg(maxOpTiltRad);
    maxTiltDeg = Math.min(maxTiltDeg, maxOpTiltDeg);

    // Operator Min Tilt DOWN (handle moves UP toward maximum reach 2.05m):
    const minOpRatio = THREE.MathUtils.clamp((colH - OPERATOR_MAX_REACH_Y) / R_op, -1, 1);
    const minOpTiltRad = Math.asin(minOpRatio) - phi_op;
    const minOpTiltDeg = THREE.MathUtils.radToDeg(minOpTiltRad);
    minTiltDeg = Math.max(minTiltDeg, minOpTiltDeg);
  }

  return {
    minTilt: Math.min(minTiltDeg, maxTiltDeg),
    maxTilt: Math.max(minTiltDeg, maxTiltDeg)
  };
}

/**
 * Calculates the maximum allowed telescopic extension (0 to 11.3m)
 * for a given tilt angle and column elevation so Front lowest Y >= floorLimit.
 */
export function getAllowedExtensionMax(
  columnElevation: number,
  boomTiltDeg: number,
  floorLimit = SAFE_FLOOR_CLEARANCE
): number {
  const colH = Math.max(1.54, Math.min(3.63, columnElevation || 1.54));
  if (boomTiltDeg >= 0) return 11.3; // When horizontal or tilting UP, full 11.3m is always safe

  const tiltRad = THREE.MathUtils.degToRad(boomTiltDeg);
  const sinMag = Math.abs(Math.sin(tiltRad));
  if (sinMag < 0.0001) return 11.3;

  const availableHeadroom = colH + 0.05 * Math.cos(tiltRad) - HEAD_BOTTOM_DROP - floorLimit;
  if (availableHeadroom <= 0) return 0;

  const maxLFront = availableHeadroom / sinMag;
  const maxExt = (maxLFront - TIP_Z_RETRACTED) * (11.30 / TELESCOPIC_STROKE);
  return Math.max(0, Math.min(11.3, maxExt));
}

/**
 * Minimum column elevation (1.54m to 3.63m) needed to achieve a target (tilt, extension)
 * without front or rear penetrating the floor (y < floorLimit).
 */
export function getMinColumnElevationForPose(
  boomTiltDeg: number,
  teleExtension: number,
  floorLimit = SAFE_FLOOR_CLEARANCE
): number {
  const tiltRad = THREE.MathUtils.degToRad(boomTiltDeg);
  let minCol = 1.54;

  if (boomTiltDeg > 0) {
    // Rear moves down when tilting UP
    const reqRear = floorLimit + REAR_CAGE_DROP * Math.cos(tiltRad) + REAR_CAGE_Z * Math.sin(tiltRad);
    minCol = Math.max(minCol, reqRear);
  } else if (boomTiltDeg < 0) {
    // Front moves down when tilting DOWN
    const L_front = getBoomTipDistance(teleExtension);
    const reqFront = floorLimit + HEAD_BOTTOM_DROP - 0.05 * Math.cos(tiltRad) + L_front * Math.abs(Math.sin(tiltRad));
    minCol = Math.max(minCol, reqFront);
  }

  return Math.max(1.54, Math.min(3.63, minCol));
}

/**
 * Clamps Boom Tilt to the exact allowable range [minTilt, maxTilt] for the current pose.
 * If isOperatorActive === true, hard-stops at the hand operator's reachable window!
 */
export function clampBoomTilt(
  targetTiltDeg: number,
  columnElevation: number,
  teleExtension: number,
  floorLimit = SAFE_FLOOR_CLEARANCE,
  isOperatorActive = false
): number {
  const { minTilt, maxTilt } = getAllowedTiltRange(columnElevation, teleExtension, floorLimit, isOperatorActive);
  return Math.max(minTilt, Math.min(maxTilt, targetTiltDeg));
}

/**
 * Clamps Column Elevation to the exact allowable range [minCol, maxCol] for the current pose.
 * If isOperatorActive === true, restricts max column lift to OPERATOR_MAX_COLUMN_ELEVATION (2.15m).
 */
export function clampColumnElevation(
  targetColElevation: number,
  boomTiltDeg: number,
  teleExtension: number,
  floorLimit = SAFE_FLOOR_CLEARANCE,
  isOperatorActive = false
): number {
  const minCol = getMinColumnElevationForPose(boomTiltDeg, teleExtension, floorLimit);
  const maxCol = isOperatorActive ? OPERATOR_MAX_COLUMN_ELEVATION : 3.63;
  return Math.max(minCol, Math.min(maxCol, targetColElevation));
}

/**
 * Clamps Telescopic Extension to the exact allowable range [0m, maxExt] for the current pose
 * without altering column elevation or boom tilt.
 * Hard stop: Extending the boom simply stops at the maximum safe reach ("dass es nicht weiter geht").
 */
export function clampTeleExtension(
  targetExtension: number,
  columnElevation: number,
  boomTiltDeg: number,
  floorLimit = SAFE_FLOOR_CLEARANCE
): number {
  const maxExt = getAllowedExtensionMax(columnElevation, boomTiltDeg, floorLimit);
  return Math.max(0, Math.min(maxExt, targetExtension));
}

/**
 * Clamps Base Pan rotation to the configured range mode (-90°..+90° or -180°..+180°).
 */
export function clampBasePan(
  targetPanDeg: number,
  panRangeMode: '180' | '360' = '180'
): number {
  const maxPan = panRangeMode === '180' ? 90 : 180;
  return Math.max(-maxPan, Math.min(maxPan, targetPanDeg));
}

/**
 * Strictly clamps kinematics state to ensure floor invariant (Y >= SAFE_FLOOR_CLEARANCE)
 * and operator reach invariant when hand operator is active.
 */
export function enforceCraneFloorLimits(
  kin: Record<string, any>,
  panRangeMode: '180' | '360' = '180',
  floorLimit = SAFE_FLOOR_CLEARANCE,
  isOperatorActive = false
): void {
  // Clamp Column Elevation
  const maxCol = isOperatorActive ? OPERATOR_MAX_COLUMN_ELEVATION : 3.63;
  kin.columnElevation = Math.max(1.54, Math.min(maxCol, kin.columnElevation || 1.54));

  // Clamp Base Pan
  kin.basePan = clampBasePan(kin.basePan || 0, panRangeMode);

  // Clamp Head Rotations
  kin.headPan = Math.max(-1080, Math.min(1080, kin.headPan || 0));
  kin.headTilt = Math.max(-1080, Math.min(1080, kin.headTilt || 0));
  kin.headRoll = Math.max(-1080, Math.min(1080, kin.headRoll || 0));

  // Clamp Extension
  const maxExt = getAllowedExtensionMax(kin.columnElevation, kin.boomTilt || 0, floorLimit);
  kin.teleExtension = Math.max(0, Math.min(maxExt, kin.teleExtension || 0));

  // Clamp Tilt
  const { minTilt, maxTilt } = getAllowedTiltRange(kin.columnElevation, kin.teleExtension, floorLimit, isOperatorActive);
  kin.boomTilt = Math.max(minTilt, Math.min(maxTilt, kin.boomTilt || 0));

  // Secondary verification of Column Height if tilt was already at an extreme
  const minCol = getMinColumnElevationForPose(kin.boomTilt, kin.teleExtension, floorLimit);
  if (kin.columnElevation < minCol) {
    kin.columnElevation = minCol;
  }
}

