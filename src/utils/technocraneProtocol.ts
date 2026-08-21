import * as THREE from 'three';
import {
  getBoomTipDistance,
  enforceCraneFloorLimits
} from './craneKinematics';

/**
 * ============================================================================
 * TECHNOCRANE CGI PROTOCOL ENGINE & MOTION-CONTROL KINEMATICS
 * Based on official Technocrane s.r.o. SDK (cgidata.h, cgidata.c)
 * Sync Value: 0x7F7A5AA5 (2138667685)
 * ============================================================================
 */

export const TDDE_SYNC_VAL = 0x7f7a5aa5;

export interface TimeCodeStruct {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
  dropFrame: boolean;
}

export interface TechnocraneLensData {
  focalLengthMm: number; // e.g. 24.0mm, 50.0mm
  focusDistM: number;    // Focus distance in meters (e.g. 3.5m)
  fStop: number;         // Aperture (e.g. 2.8)
  zoomRaw: number;       // Calibrated zoom = -focalLength
  focusRaw: number;      // Calibrated focus = -1.0 / focusDistM
  irisRaw: number;       // Calibrated iris = -fStop
}

export interface TechnocranePacket {
  syncVal: number;
  packetNumber: number;
  frameNumber: number;
  timeSeconds: number;
  timecode: TimeCodeStruct;
  timecodeString: string;
  
  // 6-DOF Cartesian Pose (in Meters and Degrees)
  cartesian: {
    x: number;
    y: number;
    z: number;
    pan: number;
    tilt: number;
    roll: number;
  };

  // Polar Crane Coordinates
  polar: {
    tele: number;       // Telescopic extension [m]
    basePan: number;    // Base azimuth [deg]
    boomTilt: number;   // Boom elevation [deg]
    track: number;      // Dolly position [m]
    columnElevation: number; // Lift [m]
  };

  // Remote Head Gimbal
  head: {
    pan: number;
    tilt: number;
    roll: number;
  };

  // Lens FIZ Data
  lens: TechnocraneLensData;

  // MoCo / Technodolly Status Flags
  status: {
    running: boolean;
    cameraOn: boolean;
    recording: boolean;
    syncDelayMicros: number;
  };

  checksum: number;
}

export interface TechnocraneKeyframe {
  id: string;
  time: number; // in seconds
  timecode: string;
  
  // Crane kinematics
  dollyTrack: number;
  columnElevation: number;
  basePan: number;
  boomTilt: number;
  teleExtension: number;
  
  // Remote head
  headPan: number;
  headTilt: number;
  headRoll: number;
  
  // Cine optics
  focalLengthMm: number;
  focusDistM: number;
  fStop: number;
}

/**
 * Converts seconds into SMPTE Timecode struct and string (e.g. 01:00:14:12 @ 24fps)
 */
export function secondsToSMPTE(totalSeconds: number, fps = 24, startHour = 1): { struct: TimeCodeStruct; string: string } {
  const safeSec = Math.max(0, totalSeconds);
  const totalFrames = Math.floor(safeSec * fps);
  
  const frames = totalFrames % fps;
  const totalSecs = Math.floor(safeSec);
  const seconds = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const minutes = totalMins % 60;
  const hours = (startHour + Math.floor(totalMins / 60)) % 24;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const tcString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;

  return {
    struct: {
      hours,
      minutes,
      seconds,
      frames,
      dropFrame: false
    },
    string: tcString
  };
}

/**
 * Computes official Technocrane 32-bit checksum according to cgidata.c
 */
export function calculateTechnocraneChecksum(values: number[]): number {
  if (values.length < 3) return 0;
  let sum = (0 - values[1]) >>> 0;
  for (let i = 2; i < values.length - 1; i++) {
    sum = (sum + values[i]) >>> 0;
  }
  return sum;
}

/**
 * Calculates accurate 6-DOF World Camera Cartesian Coordinates from Supertechno 50 Kinematics
 */
export function computeWorldCartesianPose(kin: {
  dollyTrack: number;
  columnElevation: number;
  basePan: number;
  boomTilt: number;
  teleExtension: number;
  headPan?: number;
  headTilt?: number;
  headRoll?: number;
}): { x: number; y: number; z: number; pan: number; tilt: number; roll: number } {
  const dollyZ = -(kin.dollyTrack || 0);
  const colY = Math.max(1.54, Math.min(3.63, kin.columnElevation || 1.54));
  const basePanRad = THREE.MathUtils.degToRad(-kin.basePan || 0);
  const boomTiltRad = THREE.MathUtils.degToRad(kin.boomTilt || 0);
  const L_front = getBoomTipDistance(kin.teleExtension || 0);

  // Pivot world position
  const pivotPos = new THREE.Vector3(0, colY, dollyZ);

  // Tip position relative to pivot:
  // In boom local space: tip is at z = -L_front, y = +0.05
  const tipLocal = new THREE.Vector3(0, 0.05, -L_front);
  
  // Rotate by boomTilt around local X
  tipLocal.applyAxisAngle(new THREE.Vector3(1, 0, 0), boomTiltRad);
  // Rotate by basePan around world Y
  tipLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), basePanRad);

  const tipWorld = pivotPos.clone().add(tipLocal);

  // Head and camera orientation
  const hPan = kin.headPan || 0;
  const hTilt = kin.headTilt || 0;
  const hRoll = kin.headRoll || 0;

  const totalPan = THREE.MathUtils.euclideanModulo(kin.basePan + hPan + 180, 360) - 180;
  const totalTilt = kin.boomTilt + hTilt;
  const totalRoll = hRoll;

  return {
    x: Number(tipWorld.x.toFixed(4)),
    y: Number(tipWorld.y.toFixed(4)),
    z: Number(tipWorld.z.toFixed(4)),
    pan: Number(totalPan.toFixed(3)),
    tilt: Number(totalTilt.toFixed(3)),
    roll: Number(totalRoll.toFixed(3))
  };
}

/**
 * Builds a valid Technocrane CGI Packet
 */
export function createTechnocranePacket(
  frameIndex: number,
  timeSec: number,
  kin: {
    dollyTrack: number;
    columnElevation: number;
    basePan: number;
    boomTilt: number;
    teleExtension: number;
    headPan?: number;
    headTilt?: number;
    headRoll?: number;
    focalLengthMm?: number;
    focusDistM?: number;
    fStop?: number;
  },
  isRunningMoCo = false,
  isRecording = false
): TechnocranePacket {
  const tc = secondsToSMPTE(timeSec, 24);
  const cart = computeWorldCartesianPose(kin);

  const focalLength = kin.focalLengthMm || 35.0;
  const focusDist = kin.focusDistM || 4.5;
  const fStop = kin.fStop || 2.8;

  const lens: TechnocraneLensData = {
    focalLengthMm: focalLength,
    focusDistM: focusDist,
    fStop: fStop,
    zoomRaw: -focalLength,
    focusRaw: -1.0 / Math.max(0.1, focusDist),
    irisRaw: -fStop
  };

  const packetNum = 1000000 + frameIndex;
  const dummyChecksum = 0x5a5a0000 + (packetNum % 65535);

  return {
    syncVal: TDDE_SYNC_VAL,
    packetNumber: packetNum,
    frameNumber: frameIndex,
    timeSeconds: timeSec,
    timecode: tc.struct,
    timecodeString: tc.string,
    cartesian: cart,
    polar: {
      tele: Number((kin.teleExtension || 0).toFixed(4)),
      basePan: Number((kin.basePan || 0).toFixed(3)),
      boomTilt: Number((kin.boomTilt || 0).toFixed(3)),
      track: Number((kin.dollyTrack || 0).toFixed(4)),
      columnElevation: Number((kin.columnElevation || 1.54).toFixed(4))
    },
    head: {
      pan: Number((kin.headPan || 0).toFixed(3)),
      tilt: Number((kin.headTilt || 0).toFixed(3)),
      roll: Number((kin.headRoll || 0).toFixed(3))
    },
    lens,
    status: {
      running: isRunningMoCo,
      cameraOn: true,
      recording: isRecording,
      syncDelayMicros: 120
    },
    checksum: dummyChecksum
  };
}

/**
 * Formats packets into standard Technocrane ASCII .cgi file format
 * Line format: R{frame},{x},{y},{z},{pan},{tilt},{roll},{zoom},{focus},{iris},{packetNumber},{trackPos}
 */
export function exportToTechnocraneASCII(packets: TechnocranePacket[]): string {
  const lines: string[] = [];
  packets.forEach(p => {
    const frame = p.frameNumber.toFixed(2);
    const x = p.cartesian.x.toFixed(4);
    const y = p.cartesian.y.toFixed(4);
    const z = p.cartesian.z.toFixed(4);
    const pan = p.cartesian.pan.toFixed(3);
    const tilt = p.cartesian.tilt.toFixed(3);
    const roll = p.cartesian.roll.toFixed(3);
    const zoom = p.lens.zoomRaw.toFixed(3);
    const focus = p.lens.focusRaw.toFixed(3);
    const iris = p.lens.irisRaw.toFixed(3);
    const packetNum = p.packetNumber.toString();
    const track = p.polar.track.toFixed(4);

    lines.push(`R${frame},${x},${y},${z},${pan},${tilt},${roll},${zoom},${focus},${iris},${packetNum},${track}`);
  });
  return lines.join('\n');
}

/**
 * Parses Technocrane ASCII .cgi file content into Keyframes / Packets
 */
export function parseTechnocraneASCII(cgiText: string): TechnocraneKeyframe[] {
  const lines = cgiText.split(/\r?\n/);
  const keyframes: TechnocraneKeyframe[] = [];

  let frameIdx = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith('R')) continue;

    // Remove leading 'R'
    const parts = line.substring(1).split(',');
    if (parts.length < 12) continue;

    const frameVal = parseFloat(parts[0]);
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);
    const pan = parseFloat(parts[4]);
    const tilt = parseFloat(parts[5]);
    const roll = parseFloat(parts[6]);
    const zoomRaw = parseFloat(parts[7]);
    const focusRaw = parseFloat(parts[8]);
    const irisRaw = parseFloat(parts[9]);
    const trackPos = parseFloat(parts[11]);

    const focalLengthMm = Math.abs(zoomRaw) > 0.01 ? Math.abs(zoomRaw) : 35.0;
    const focusDistM = Math.abs(focusRaw) > 0.0001 ? 1.0 / Math.abs(focusRaw) : 4.5;
    const fStop = Math.abs(irisRaw) > 0.01 ? Math.abs(irisRaw) : 2.8;

    const timeSec = frameVal / 24.0;
    const tc = secondsToSMPTE(timeSec, 24);

    // Approximate crane angles from cartesian/track
    const dollyTrack = isNaN(trackPos) ? -z : trackPos;
    const colElevation = Math.max(1.54, Math.min(3.63, y));
    const teleExtension = Math.min(11.3, Math.max(0, Math.sqrt(x * x + z * z) - 3.34));

    keyframes.push({
      id: `cgi-kf-${frameIdx++}`,
      time: timeSec,
      timecode: tc.string,
      dollyTrack: Number(dollyTrack.toFixed(3)),
      columnElevation: Number(colElevation.toFixed(3)),
      basePan: Number(pan.toFixed(2)),
      boomTilt: Number(tilt.toFixed(2)),
      teleExtension: Number(teleExtension.toFixed(3)),
      headPan: 0,
      headTilt: 0,
      headRoll: Number(roll.toFixed(2)),
      focalLengthMm: Number(focalLengthMm.toFixed(1)),
      focusDistM: Number(focusDistM.toFixed(2)),
      fStop: Number(fStop.toFixed(1))
    });
  }

  return keyframes;
}

/**
 * Smooth Cubic Spline (Catmull-Rom) Interpolation across all MoCo Keyframes
 */
export function interpolateKeyframes(keyframes: TechnocraneKeyframe[], currentTime: number): {
  dollyTrack: number;
  columnElevation: number;
  basePan: number;
  boomTilt: number;
  teleExtension: number;
  headPan: number;
  headTilt: number;
  headRoll: number;
  focalLengthMm: number;
  focusDistM: number;
  fStop: number;
} {
  if (!keyframes || keyframes.length === 0) {
    return {
      dollyTrack: 0,
      columnElevation: 1.85,
      basePan: 0,
      boomTilt: 0,
      teleExtension: 0,
      headPan: 0,
      headTilt: 0,
      headRoll: 0,
      focalLengthMm: 35,
      focusDistM: 4.5,
      fStop: 2.8
    };
  }

  if (keyframes.length === 1) {
    const k = keyframes[0];
    return { ...k };
  }

  // Sort by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const minTime = sorted[0].time;
  const maxTime = sorted[sorted.length - 1].time;

  if (currentTime <= minTime) return { ...sorted[0] };
  if (currentTime >= maxTime) return { ...sorted[sorted.length - 1] };

  // Find surrounding interval [i, i+1]
  let idx = 0;
  while (idx < sorted.length - 1 && sorted[idx + 1].time < currentTime) {
    idx++;
  }

  const p0 = sorted[Math.max(0, idx - 1)];
  const p1 = sorted[idx];
  const p2 = sorted[Math.min(sorted.length - 1, idx + 1)];
  const p3 = sorted[Math.min(sorted.length - 1, idx + 2)];

  const span = p2.time - p1.time;
  const t = span > 0.0001 ? (currentTime - p1.time) / span : 0;

  // Standard Catmull-Rom spline formula
  const catmullRom = (v0: number, v1: number, v2: number, v3: number, u: number) => {
    const u2 = u * u;
    const u3 = u2 * u;
    return 0.5 * (
      (2 * v1) +
      (-v0 + v2) * u +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * u2 +
      (-v0 + 3 * v1 - 3 * v2 + v3) * u3
    );
  };

  const rawPose = {
    dollyTrack: catmullRom(p0.dollyTrack, p1.dollyTrack, p2.dollyTrack, p3.dollyTrack, t),
    columnElevation: catmullRom(p0.columnElevation, p1.columnElevation, p2.columnElevation, p3.columnElevation, t),
    basePan: catmullRom(p0.basePan, p1.basePan, p2.basePan, p3.basePan, t),
    boomTilt: catmullRom(p0.boomTilt, p1.boomTilt, p2.boomTilt, p3.boomTilt, t),
    teleExtension: catmullRom(p0.teleExtension, p1.teleExtension, p2.teleExtension, p3.teleExtension, t),
    headPan: catmullRom(p0.headPan, p1.headPan, p2.headPan, p3.headPan, t),
    headTilt: catmullRom(p0.headTilt, p1.headTilt, p2.headTilt, p3.headTilt, t),
    headRoll: catmullRom(p0.headRoll, p1.headRoll, p2.headRoll, p3.headRoll, t),
    focalLengthMm: catmullRom(p0.focalLengthMm, p1.focalLengthMm, p2.focalLengthMm, p3.focalLengthMm, t),
    focusDistM: Math.max(0.5, catmullRom(p0.focusDistM, p1.focusDistM, p2.focusDistM, p3.focusDistM, t)),
    fStop: Math.max(1.2, catmullRom(p0.fStop, p1.fStop, p2.fStop, p3.fStop, t))
  };

  // Enforce kinematics safety boundaries (Ground Floor Y >= 0)
  enforceCraneFloorLimits(rawPose);

  return rawPose;
}

/**
 * 4 Pre-Configured Hollywood Film-Set Motion-Control Sequences
 */
export const TECHNODISPLAY_SHOT_PRESETS: {
  id: string;
  name: string;
  category: string;
  description: string;
  durationSec: number;
  keyframes: TechnocraneKeyframe[];
}[] = [
  {
    id: 'hero-reveal',
    name: '1. The Hero Reveal (Low-to-High Boom)',
    category: 'Epic Reveal',
    description: 'Dolly fährt vorwärts, Säule steigt auf 3.50m, Teleskoparm fährt auf 11.0m aus mit weichem Tilt nach unten.',
    durationSec: 8.0,
    keyframes: [
      {
        id: 'hr-1',
        time: 0.0,
        timecode: '01:00:00:00',
        dollyTrack: -4.0,
        columnElevation: 1.60,
        basePan: 0,
        boomTilt: -8.0,
        teleExtension: 1.2,
        headPan: 0,
        headTilt: 8.0,
        headRoll: 0,
        focalLengthMm: 24,
        focusDistM: 2.2,
        fStop: 2.0
      },
      {
        id: 'hr-2',
        time: 3.5,
        timecode: '01:00:03:12',
        dollyTrack: 0.0,
        columnElevation: 2.70,
        basePan: 15,
        boomTilt: 12.0,
        teleExtension: 6.5,
        headPan: -12,
        headTilt: -8.0,
        headRoll: 0,
        focalLengthMm: 35,
        focusDistM: 4.8,
        fStop: 2.8
      },
      {
        id: 'hr-3',
        time: 8.0,
        timecode: '01:00:08:00',
        dollyTrack: 4.5,
        columnElevation: 3.55,
        basePan: -25,
        boomTilt: 28.0,
        teleExtension: 11.2,
        headPan: 22,
        headTilt: -24.0,
        headRoll: 0,
        focalLengthMm: 50,
        focusDistM: 8.5,
        fStop: 4.0
      }
    ]
  },
  {
    id: 'matrix-360',
    name: '2. Matrix 360° Target Lock Orbit',
    category: 'Action MoCo',
    description: '360-Grad Säulendrehung um das Motiv mit gegenläufigem Remote-Head Schwenk (Objekt bleibt exakt im Bildzentrum).',
    durationSec: 10.0,
    keyframes: [
      {
        id: 'm360-1',
        time: 0.0,
        timecode: '01:00:00:00',
        dollyTrack: 0.0,
        columnElevation: 2.20,
        basePan: -120,
        boomTilt: 8.0,
        teleExtension: 5.0,
        headPan: 120,
        headTilt: -6.0,
        headRoll: 0,
        focalLengthMm: 32,
        focusDistM: 5.0,
        fStop: 2.8
      },
      {
        id: 'm360-2',
        time: 5.0,
        timecode: '01:00:05:00',
        dollyTrack: 0.0,
        columnElevation: 2.50,
        basePan: 0,
        boomTilt: 14.0,
        teleExtension: 6.2,
        headPan: 0,
        headTilt: -12.0,
        headRoll: 0,
        focalLengthMm: 32,
        focusDistM: 6.2,
        fStop: 2.8
      },
      {
        id: 'm360-3',
        time: 10.0,
        timecode: '01:00:10:00',
        dollyTrack: 0.0,
        columnElevation: 2.20,
        basePan: 120,
        boomTilt: 8.0,
        teleExtension: 5.0,
        headPan: -120,
        headTilt: -6.0,
        headRoll: 0,
        focalLengthMm: 32,
        focusDistM: 5.0,
        fStop: 2.8
      }
    ]
  },
  {
    id: 'vertigo-zoom',
    name: '3. Vertigo (Hitchcock Dolly-Zoom)',
    category: 'Optical Illusion',
    description: 'Dolly fährt rückwärts (Dolly Out), während die Cine-Linse synchron hineinzoomt (24mm -> 85mm).',
    durationSec: 6.0,
    keyframes: [
      {
        id: 'vz-1',
        time: 0.0,
        timecode: '01:00:00:00',
        dollyTrack: 3.5,
        columnElevation: 1.80,
        basePan: 0,
        boomTilt: 0,
        teleExtension: 2.0,
        headPan: 0,
        headTilt: 0,
        headRoll: 0,
        focalLengthMm: 21,
        focusDistM: 2.0,
        fStop: 1.8
      },
      {
        id: 'vz-2',
        time: 6.0,
        timecode: '01:00:06:00',
        dollyTrack: -4.5,
        columnElevation: 1.80,
        basePan: 0,
        boomTilt: 0,
        teleExtension: 2.0,
        headPan: 0,
        headTilt: 0,
        headRoll: 0,
        focalLengthMm: 85,
        focusDistM: 10.0,
        fStop: 2.8
      }
    ]
  },
  {
    id: 'fast-action-sweep',
    name: '4. Fast Action Floor Sweep & Push',
    category: 'Commercial & Sports',
    description: 'Rasante bodennahe Gleitfahrt auf der Schiene gefolgt von explosivem Teleskopausstoß auf 11.3 Meter.',
    durationSec: 7.0,
    keyframes: [
      {
        id: 'fa-1',
        time: 0.0,
        timecode: '01:00:00:00',
        dollyTrack: -5.0,
        columnElevation: 1.54,
        basePan: -30,
        boomTilt: -4.0,
        teleExtension: 0.0,
        headPan: 25,
        headTilt: 4.0,
        headRoll: 0,
        focalLengthMm: 18,
        focusDistM: 1.8,
        fStop: 2.0
      },
      {
        id: 'fa-2',
        time: 3.0,
        timecode: '01:00:03:00',
        dollyTrack: 0.0,
        columnElevation: 2.10,
        basePan: 0,
        boomTilt: 5.0,
        teleExtension: 4.5,
        headPan: 0,
        headTilt: -5.0,
        headRoll: 0,
        focalLengthMm: 28,
        focusDistM: 4.0,
        fStop: 2.8
      },
      {
        id: 'fa-3',
        time: 7.0,
        timecode: '01:00:07:00',
        dollyTrack: 5.0,
        columnElevation: 3.60,
        basePan: 45,
        boomTilt: 22.0,
        teleExtension: 11.3,
        headPan: -40,
        headTilt: -18.0,
        headRoll: 0,
        focalLengthMm: 65,
        focusDistM: 9.2,
        fStop: 4.0
      }
    ]
  }
];
