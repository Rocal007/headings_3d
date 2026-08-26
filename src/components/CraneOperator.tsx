import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getBoomTipDistance,
  getFrontLowestY,
  getRearLowestY
} from '../utils/craneKinematics';
import { ReadyPlayerMeAvatar, type AvatarIkParams } from './rpm/ReadyPlayerMeAvatar';

export type CraneOperatorMode = 'hidden' | 'walking_in' | 'operating' | 'walking_out';

export interface CraneOperatorProps {
  mode: CraneOperatorMode;
  avatarType?: 'classic' | 'rpm';
  rpmUrl?: string;
  rpmPresetId?: string;
  onArrivedAtControls?: () => void;
  onExited?: () => void;
  dollyTrack?: number;
  columnElevation?: number;
  basePan?: number;
  boomTilt?: number;
  teleExtension?: number;
  headPan?: number;
  headTilt?: number;
  headRoll?: number;
}

// --- ⚡ GLOBAL TEXTURE CACHE FOR OPERATORS (ZERO GC / ZERO LAG) ---
const OPERATOR_TEX_CACHE = new Map<string, THREE.CanvasTexture>();

function getOperatorTexture(key: string, generator: () => THREE.CanvasTexture): THREE.CanvasTexture {
  let tex = OPERATOR_TEX_CACHE.get(key);
  if (!tex) {
    tex = generator();
    OPERATOR_TEX_CACHE.set(key, tex);
  }
  return tex;
}

/**
 * Procedural canvas texture generator for the two-tone Trucker Cap front badge
 */
function createCapFrontTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }

  ctx.save();
  ctx.translate(256, 260);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  ctx.strokeRect(-180, -90, 360, 180);

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.strokeRect(-170, -80, 340, 160);

  ctx.fillStyle = '#1e293b';
  ctx.font = '900 44px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUPERTECHNO', 0, -20);

  ctx.fillStyle = '#475569';
  ctx.font = '700 22px "Arial", sans-serif';
  ctx.fillText('– CINE CRANE DEPT –', 0, 20);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 16px "Courier New", monospace';
  ctx.fillText('★ CRANE OPERATOR ★', 0, 52);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Procedural canvas texture generator for the Desk Operator Hoodie / T-Shirt
 */
function createDeskOperatorShirtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  // Yellow & White Cine Crew Branding on Chest
  ctx.save();
  ctx.translate(256, 200);

  ctx.fillStyle = '#facc15';
  ctx.font = '900 36px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TECHNOCRANE', 0, -10);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 20px "Arial", sans-serif';
  ctx.fillText('HEAD & MOCO OPERATOR', 0, 24);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 14px "Courier New", monospace';
  ctx.fillText('DIRECTOR OF PHOTOGRAPHY', 0, 48);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * 🎛️ Procedural canvas texture generator for the authentic TECHNOHEAD Control Console top faceplate
 */
export function createTechnoheadTopTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Matte Dark Anodized Aluminum Base (#14161a)
  ctx.fillStyle = '#14161a';
  ctx.fillRect(0, 0, 2048, 1024);

  // Micro surface grain / brushed aluminum texture
  for (let i = 0; i < 35000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.03)';
    ctx.fillRect(Math.random() * 2048, Math.random() * 1024, 2 + Math.random() * 4, 1);
  }

  // 2. Subtle Precision Chamfer / Border Guide Lines
  ctx.strokeStyle = '#282d35';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 1992, 968);
  ctx.strokeStyle = '#181b20';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, 1976, 952);

  // Function to draw realistic silver countersunk hex socket screws
  const drawHexScrew = (x: number, y: number, r: number = 15) => {
    ctx.save();
    ctx.translate(x, y);
    // Outer silver chamfer ring
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.55, '#94a3b8');
    grad.addColorStop(1, '#334155');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner hex socket
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const hx = Math.cos(a) * (r * 0.52);
      const hy = Math.sin(a) * (r * 0.52);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Perimeter Screws (as seen on real TECHNOHEAD unit)
  // Top edge
  drawHexScrew(70, 60);
  drawHexScrew(440, 60);
  drawHexScrew(960, 60);
  drawHexScrew(1480, 60);
  drawHexScrew(1978, 60);

  // Bottom edge
  drawHexScrew(70, 964);
  drawHexScrew(440, 964);
  drawHexScrew(960, 964);
  drawHexScrew(1690, 964);
  drawHexScrew(1978, 964);

  // Left & Right edges
  drawHexScrew(56, 360);
  drawHexScrew(56, 680);
  drawHexScrew(1992, 360);
  drawHexScrew(1992, 680);

  // 3. Top-Left: Focus / FIZ Wheel Cutout Frame & Screws
  const fwX = 350;
  const fwY = 240;
  ctx.fillStyle = '#090a0d';
  ctx.beginPath();
  ctx.roundRect(fwX - 110, fwY - 80, 220, 160, 14);
  ctx.fill();
  ctx.strokeStyle = '#333842';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Fixing screws for focus bezel
  drawHexScrew(fwX - 95, fwY - 65, 8);
  drawHexScrew(fwX + 95, fwY - 65, 8);
  drawHexScrew(fwX - 95, fwY + 65, 8);
  drawHexScrew(fwX + 95, fwY + 65, 8);

  // 4. Mid-Left: ROLL Knob Graphic & Calibration Arc
  const rollX = 630;
  const rollY = 260;
  ctx.save();
  ctx.translate(rollX, rollY);
  
  // White curved arrows and "ROLL" text
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 78, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();

  // Left arrowhead
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-55, -55);
  ctx.lineTo(-40, -64);
  ctx.lineTo(-46, -48);
  ctx.fill();

  // Right arrowhead
  ctx.beginPath();
  ctx.moveTo(55, -55);
  ctx.lineTo(46, -48);
  ctx.lineTo(40, -64);
  ctx.fill();

  // "ROLL" typography
  ctx.font = '800 24px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROLL', 0, -96);

  // Calibration tick marks
  for (let a = -Math.PI * 0.8; a <= -Math.PI * 0.2; a += Math.PI * 0.1) {
    const x1 = Math.cos(a) * 62;
    const y1 = Math.sin(a) * 62;
    const x2 = Math.cos(a) * 68;
    const y2 = Math.sin(a) * 68;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Lower-Left: W/T Rocker Switch Bezel & Screws
  const rkX = 630;
  const rkY = 510;
  ctx.save();
  ctx.translate(rkX, rkY);
  ctx.fillStyle = '#090a0d';
  ctx.beginPath();
  ctx.roundRect(-46, -96, 92, 192, 8);
  ctx.fill();
  ctx.strokeStyle = '#2d333b';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawHexScrew(0, -80, 9);
  drawHexScrew(0, 80, 9);
  ctx.restore();

  // 6. Upper-Right: Joystick Base Plate & Screws
  const joyX = 1320;
  const joyY = 260;
  ctx.save();
  ctx.translate(joyX, joyY);
  ctx.fillStyle = '#0a0c10';
  ctx.beginPath();
  ctx.roundRect(-125, -125, 250, 250, 10);
  ctx.fill();
  ctx.strokeStyle = '#2d333b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 4 Corner screws
  drawHexScrew(-100, -100, 11);
  drawHexScrew(100, -100, 11);
  drawHexScrew(-100, 100, 11);
  drawHexScrew(100, 100, 11);
  ctx.restore();

  // 7. Top-Right: Status LED Bezel
  const ledX = 1600;
  const ledY = 200;
  ctx.save();
  ctx.translate(ledX, ledY);
  drawHexScrew(0, 0, 16);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 8. 🌟 PROMINENT "TECHNOHEAD" LOGO (BOTTOM RIGHT QUADRANT)
  ctx.save();
  ctx.translate(1480, 520);
  ctx.fillStyle = '#ffffff';
  // Slanted / Italic Heavy Sans-Serif Typography matching the real TECHNOHEAD laser-engraving
  ctx.font = 'italic 900 68px "Arial Black", "Helvetica Neue", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TECHNOHEAD', 0, 0);

  // Subtle metallic reflection / glow on logo
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillText('TECHNOHEAD', 1, -1);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 🎛️ Procedural canvas texture generator for the Rocker Switch paddle (W / T)
 */
export function createRockerPaddleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 256, 512);

  // Subtle curved lighting gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#272a30');
  grad.addColorStop(0.5, '#0f1115');
  grad.addColorStop(1, '#272a30');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // White "W" (Wide) on Upper Flange
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', 128, 120);

  // White "T" (Tele) on Lower Flange
  ctx.fillText('T', 128, 392);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural mesh netting texture for the trucker cap rear dome
 */
function createTruckerMeshTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * Procedural canvas texture for Film Crew All-Access VIP Lanyard Badge
 */
function createLanyardBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 384);

  // Top header color band
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 70);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 24px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALL ACCESS', 128, 42);

  // Hologram strip
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(16, 85, 224, 8);

  // Photo Box Placeholder
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(58, 110, 140, 140);
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(128, 160, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(128, 240, 60, Math.PI, Math.PI * 2);
  ctx.fill();

  // Name & Role
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 18px "Arial", sans-serif';
  ctx.fillText('TECHNOCRANE', 128, 280);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 14px "Courier New", monospace';
  ctx.fillText('CREW OPERATOR', 128, 305);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px "Courier New", monospace';
  ctx.fillText('PASS ID: #ST50-9942', 128, 340);

  // Barcode
  for (let x = 24; x < 232; x += Math.random() * 8 + 3) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, 355, 2, 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Procedural canvas texture for Motorola UHF Two-Way Radio LCD Screen
 */
function createRadioScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 128, 64);

  ctx.fillStyle = '#22c55e';
  ctx.font = '900 20px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CH: 08', 64, 32);

  ctx.fillStyle = '#4ade80';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText('CRANE 1 [TX]', 64, 52);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Helper to format SMPTE running timecode HH:MM:SS:FF at 24fps
 */
function formatSMPTETimecode(totalSeconds: number): string {
  const fps = 24;
  const totalFrames = Math.floor(totalSeconds * fps);
  const frames = totalFrames % 24;
  const totalSecs = Math.floor(totalFrames / 24);
  const s = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const m = totalMins % 60;
  const h = (Math.floor(totalMins / 60) + 1) % 24;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export interface TelemetryRenderData {
  teleExtension: number;
  boomTilt: number;
  basePan: number;
  columnElevation: number;
  dollyTrack: number;
  headPan: number;
  headTilt: number;
  headRoll: number;
  time: number;
}

/**
 * High-definition procedural canvas renderer for the 7" Supertechno 50 Live Telemetry Screen
 */
export function renderDeskTelemetryScreen(
  canvas: HTMLCanvasElement,
  data: TelemetryRenderData
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const ext = Math.max(0, Math.min(11.3, data.teleExtension || 0));
  const extFt = ext * 3.28084;
  const colH = Math.max(1.54, Math.min(3.63, data.columnElevation || 1.54));
  const tiltDeg = data.boomTilt || 0;
  const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
  const basePan = data.basePan || 0;
  const dollyTrack = data.dollyTrack || 0;
  const headPan = data.headPan || 0;
  const headTilt = data.headTilt || 0;
  const headRoll = data.headRoll || 0;

  // Kinematic derivations (calibrated for Supertechno 50)
  const boomTipDist = getBoomTipDistance(ext);
  const horizontalReach = boomTipDist * Math.cos(tiltRad);
  const tipY = colH + 0.05 * Math.cos(tiltRad) + boomTipDist * Math.sin(tiltRad);
  const lensHeight = Math.max(0, tipY - 0.785);
  const lensHeightFt = (lensHeight * 3.28084).toFixed(1);
  const frontLowestY = Math.max(0, getFrontLowestY(colH, tiltDeg, ext));
  const rearLowestY = Math.max(0, getRearLowestY(colH, tiltDeg, ext));
  const groundClearance = Math.min(frontLowestY, rearLowestY);

  // Background
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, w, h);

  // Fine tech grid lines
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Glowing boundary frame
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  // 1. TOP HEADER BAR
  ctx.fillStyle = '#0c1322';
  ctx.fillRect(8, 8, w - 16, 44);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 52);
  ctx.lineTo(w - 8, 52);
  ctx.stroke();

  // Model Badge
  ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
  ctx.fillRect(20, 16, 76, 26);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 16, 76, 26);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 13px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ST-50', 58, 29);

  // Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 18px "Arial", sans-serif';
  ctx.fillText('SUPERTECHNO 50 PLUS', 108, 29);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 13px "Courier New", monospace';
  ctx.fillText('• LIVE MOCO TELEMETRY & KINEMATICS', 335, 29);

  // Top-Right Badges
  const isBlink = Math.floor(data.time * 2) % 2 === 0;
  ctx.fillStyle = isBlink ? '#22c55e' : '#16a34a';
  ctx.beginPath();
  ctx.arc(810, 29, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4ade80';
  ctx.font = '700 12px "Courier New", monospace';
  ctx.fillText('ONLINE', 822, 30);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('SYNC 100%', 890, 30);

  ctx.fillStyle = '#22c55e';
  ctx.fillText('ENC: LOCK', 960, 30);

  // Helper function to draw cards
  const drawCard = (x: number, y: number, cw: number, ch: number, bg = '#090e18', border = '#1e293b') => {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cw, ch);
    // Corner marks
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 6); ctx.lineTo(x, y); ctx.lineTo(x + 6, y);
    ctx.moveTo(x + cw - 6, y); ctx.lineTo(x + cw, y); ctx.lineTo(x + cw, y + 6);
    ctx.moveTo(x, y + ch - 6); ctx.lineTo(x, y + ch); ctx.lineTo(x + 6, y + ch);
    ctx.moveTo(x + cw - 6, y + ch); ctx.lineTo(x + cw, y + ch); ctx.lineTo(x + cw, y + ch - 6);
    ctx.stroke();
  };

  // 2. LEFT COLUMN (Width ~ 560px)
  // CARD 1: TELESCOPIC EXTENSION (EXT)
  drawCard(20, 64, 560, 84, '#0a0f1d');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 12px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('TELESCOPIC STROKE (EXT)', 34, 82);

  ctx.fillStyle = '#facc15';
  ctx.font = '900 28px "Arial Black", sans-serif';
  ctx.fillText(`EXT: ${ext.toFixed(2)} m`, 34, 114);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '700 15px "Courier New", monospace';
  ctx.fillText(`(${extFt.toFixed(1)} ft / max 11.30 m)`, 270, 112);

  // Extension Progress Bar
  const barX = 34;
  const barY = 124;
  const barW = 530;
  const barH = 14;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(barX, barY, barW, barH);
  const fillW = (ext / 11.3) * barW;
  const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.7, '#38bdf8');
  grad.addColorStop(1, '#facc15');
  ctx.fillStyle = grad;
  ctx.fillRect(barX, barY, fillW, barH);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // CARD 2 & 3: BOOM TILT & BASE PAN
  drawCard(20, 158, 274, 80);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText('BOOM TILT ANGLE', 32, 174);
  const tiltSign = tiltDeg >= 0 ? '+' : '';
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 26px "Arial Black", sans-serif';
  ctx.fillText(`${tiltSign}${tiltDeg.toFixed(1)}°`, 32, 206);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Courier New", monospace';
  ctx.fillText('RANGE: -45° .. +55°', 32, 226);

  drawCard(306, 158, 274, 80);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText('BASE PAN (SLEWING)', 318, 174);
  const panSign = basePan >= 0 ? '+' : '';
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 26px "Arial Black", sans-serif';
  ctx.fillText(`${panSign}${basePan.toFixed(1)}°`, 318, 206);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Courier New", monospace';
  ctx.fillText('360° SLEWING RING', 318, 226);

  // CARD 4 & 5: COLUMN ELEVATION & HORIZONTAL REACH
  drawCard(20, 248, 274, 80);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText('COLUMN ELEVATION', 32, 264);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = '900 24px "Arial Black", sans-serif';
  ctx.fillText(`${colH.toFixed(2)} m`, 32, 296);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Courier New", monospace';
  ctx.fillText('STROKE: 1.54m - 3.63m', 32, 316);

  drawCard(306, 248, 274, 80);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText('HORIZONTAL REACH', 318, 264);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = '900 24px "Arial Black", sans-serif';
  ctx.fillText(`${horizontalReach.toFixed(2)} m`, 318, 296);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Courier New", monospace';
  ctx.fillText(`${(horizontalReach * 3.28084).toFixed(1)} ft from fulcrum`, 318, 316);

  // CARD 6: OPTICAL LENS HEIGHT (HERO)
  drawCard(20, 338, 560, 94, 'rgba(6, 78, 59, 0.3)', '#10b981');
  ctx.fillStyle = '#34d399';
  ctx.font = '700 12px "Courier New", monospace';
  ctx.fillText('OPTICAL LENS HEIGHT (OVER GROUND)', 34, 356);

  ctx.fillStyle = '#4ade80';
  ctx.font = '900 36px "Arial Black", sans-serif';
  ctx.fillText(`${lensHeight.toFixed(2)} m`, 34, 396);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '700 20px "Courier New", monospace';
  ctx.fillText(`(${lensHeightFt} ft)`, 220, 394);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '600 12px "Courier New", monospace';
  ctx.fillText('MAX LENS HT: 15.11 m (49.6 ft) • HEAD OFFSET: -0.78m', 34, 420);

  // CARD 7 & 8: DOLLY TRACK & GROUND CLEARANCE
  drawCard(20, 442, 274, 76);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText('DOLLY TRACK (Z)', 32, 458);
  const trackSign = dollyTrack >= 0 ? '+' : '';
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 24px "Arial Black", sans-serif';
  ctx.fillText(`${trackSign}${dollyTrack.toFixed(2)} m`, 32, 488);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Courier New", monospace';
  ctx.fillText('RAIL LIMITS: NOMINAL', 32, 506);

  const isLowClearance = groundClearance < 0.20;
  drawCard(306, 442, 274, 76, isLowClearance ? 'rgba(153, 27, 27, 0.4)' : '#090e18', isLowClearance ? '#ef4444' : '#1e293b');
  ctx.fillStyle = isLowClearance ? '#fca5a5' : '#94a3b8';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText('MIN FLOOR CLEARANCE', 318, 458);
  ctx.fillStyle = isLowClearance ? '#ef4444' : '#4ade80';
  ctx.font = '900 24px "Arial Black", sans-serif';
  ctx.fillText(`${groundClearance.toFixed(2)} m`, 318, 488);
  ctx.fillStyle = isLowClearance ? '#f87171' : '#22c55e';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText(isLowClearance ? '⚠️ LOW CLEARANCE' : '✅ CLEARANCE SAFE', 318, 506);

  // 3. RIGHT COLUMN (X: 596 .. 1000, W: 404)
  // CARD: 2D VECTOR CRANE KINEMATICS PROFILE
  drawCard(596, 64, 408, 256, '#080d1a');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 12px "Courier New", monospace';
  ctx.fillText('CRANE KINEMATICS PROFILE (2D)', 610, 82);

  // Draw 2D Vector Blueprint
  const gy = 265; // ground Y
  const ox = 705; // origin base X

  // Ground Line
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(610, gy);
  ctx.lineTo(990, gy);
  ctx.stroke();

  // Rails & Dolly Base
  ctx.fillStyle = '#334155';
  ctx.fillRect(ox - 35, gy - 8, 70, 8);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(ox - 28, gy - 2, 56, 2);

  // Column Height (extending from 1.54 to 3.63m -> 25 to 65 px)
  const colPx = 25 + ((colH - 1.54) / (3.63 - 1.54)) * 40;
  const py = gy - 8 - colPx; // Fulcrum Pivot Y
  ctx.fillStyle = '#64748b';
  ctx.fillRect(ox - 8, py, 16, colPx);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 8, py, 16, colPx);

  // Fulcrum Pivot Ring
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(ox, py, 6, 0, Math.PI * 2);
  ctx.fill();

  // Rear Boom
  const rearLen = 42;
  const rx = ox + rearLen * Math.cos(tiltRad + Math.PI);
  const ry = py - rearLen * Math.sin(tiltRad + Math.PI);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ox, py);
  ctx.lineTo(rx, ry);
  ctx.stroke();

  // Moving Counterweight Sled on Rear
  const tExt = ext / 11.3;
  const sledDist = 12 + tExt * 26;
  const sx = ox + sledDist * Math.cos(tiltRad + Math.PI);
  const sy = py - sledDist * Math.sin(tiltRad + Math.PI);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(sx - 5, sy - 5, 10, 10);

  // Front Telescopic Boom (4 stages)
  const frontLen = 45 + tExt * 145;
  const tx = ox + frontLen * Math.cos(tiltRad);
  const ty = py - frontLen * Math.sin(tiltRad);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(ox, py);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // Boom Stage lines
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  for (let s = 1; s <= 3; s++) {
    const stgLen = 45 + (tExt * 145 * s) / 3;
    const stgx = ox + stgLen * Math.cos(tiltRad);
    const stgy = py - stgLen * Math.sin(tiltRad);
    ctx.beginPath();
    ctx.arc(stgx, stgy, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Remote Head & Camera at Tip
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx, ty + 16);
  ctx.stroke();
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(tx - 4, ty + 16, 12, 8); // camera body

  // Lens Height Dimension Line
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(tx + 18, gy);
  ctx.lineTo(tx + 18, ty + 20);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#4ade80';
  ctx.font = '700 11px "Courier New", monospace';
  ctx.fillText(`${lensHeight.toFixed(1)}m`, tx + 22, (gy + ty + 20) / 2);

  // CARD: REMOTE HEAD 3-AXIS GIMBAL
  drawCard(596, 330, 408, 188, '#080d1a');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 12px "Courier New", monospace';
  ctx.fillText('REMOTE HEAD 3-AXIS GIMBAL', 610, 348);

  const hPanSign = headPan >= 0 ? '+' : '';
  const hTiltSign = headTilt >= 0 ? '+' : '';
  const hRollSign = headRoll >= 0 ? '+' : '';

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 13px "Courier New", monospace';
  ctx.fillText('HEAD PAN :', 610, 376);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 20px "Arial Black", sans-serif';
  ctx.fillText(`${hPanSign}${headPan.toFixed(1)}°`, 725, 378);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 13px "Courier New", monospace';
  ctx.fillText('HEAD TILT:', 610, 408);
  ctx.fillStyle = '#facc15';
  ctx.font = '900 20px "Arial Black", sans-serif';
  ctx.fillText(`${hTiltSign}${headTilt.toFixed(1)}°`, 725, 410);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 13px "Courier New", monospace';
  ctx.fillText('HEAD ROLL:', 610, 440);
  ctx.fillStyle = '#4ade80';
  ctx.font = '900 20px "Arial Black", sans-serif';
  ctx.fillText(`${hRollSign}${headRoll.toFixed(1)}°`, 725, 442);

  // Mini Gyro Horizon Circle
  const gx = 910;
  const gyCenter = 415;
  const gr = 34;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(gx, gyCenter, gr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx - gr, gyCenter); ctx.lineTo(gx + gr, gyCenter);
  ctx.moveTo(gx, gyCenter - gr); ctx.lineTo(gx, gyCenter + gr);
  ctx.stroke();

  // Tilted Roll & Tilt Horizon
  const rollRad = THREE.MathUtils.degToRad(headRoll);
  const tiltOff = (headTilt / 45) * 15;
  ctx.save();
  ctx.translate(gx, gyCenter);
  ctx.rotate(rollRad);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-gr + 6, tiltOff);
  ctx.lineTo(gr - 6, tiltOff);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10px "Courier New", monospace';
  ctx.fillText('AUTO-HORIZON: ACTIVE', 610, 485);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('MITCHELL MOUNT: LOCKED', 785, 485);

  // 4. BOTTOM FOOTER BAR
  ctx.fillStyle = '#0a0f1c';
  ctx.fillRect(8, 528, w - 16, 102);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(8, 528, w - 16, 102);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 12px "Courier New", monospace';
  ctx.fillText('SYS BUS: 48.4V [STABLE]', 24, 554);
  ctx.fillText('SERVO DRIVES: ALL ENGAGED', 280, 554);
  ctx.fillText('LIMIT SWITCHES: NOMINAL', 540, 554);
  ctx.fillText('SAFETY INTERLOCK: ACTIVE (Y >= 0.12m)', 760, 554);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Courier New", monospace';
  ctx.fillText('SUPERTECHNO MOTION CONTROL SYSTEM • CALIBRATED RIG GEOMETRY • 100% COLLISION PROTECTED', 24, 584);
  ctx.fillText(`HECK-GEGENGEWICHT Z: ${sledDist.toFixed(1)}m • REACH EXTENDED: ${frontLen.toFixed(1)}m • TIMESTAMP: ${data.time.toFixed(2)}s`, 24, 608);
}

export interface CineMonitorRenderData {
  headPan: number;
  headTilt: number;
  headRoll: number;
  time: number;
}

/**
 * High-definition procedural canvas renderer for the 17" Master ARRI Cine Viewfinder Monitor
 */
export function renderDeskCineMonitorScreen(
  canvas: HTMLCanvasElement,
  data: CineMonitorRenderData
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Dark Cine Viewport
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, w, h);

  // Subtle Sensor Ambient Vignette
  const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.6);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 16:9 Frame Guides (White)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 36, w - 128, h - 72);

  // 2.39:1 Anamorphic Frame Guides (Gold)
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 96, w - 128, h - 192);

  // Dynamic Artificial Horizon Line
  const rollRad = THREE.MathUtils.degToRad(data.headRoll || 0);
  const tiltShift = ((data.headTilt || 0) / 45) * 30;
  ctx.save();
  ctx.translate(w / 2, h / 2 + tiltShift);
  ctx.rotate(rollRad);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(-160, 0);
  ctx.lineTo(160, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Center Crosshair
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 30, h / 2);
  ctx.lineTo(w / 2 + 30, h / 2);
  ctx.moveTo(w / 2, h / 2 - 30);
  ctx.lineTo(w / 2, h / 2 + 30);
  ctx.stroke();

  // Corner Ticks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  const tickLen = 20;
  // Top-Left
  ctx.beginPath(); ctx.moveTo(80, 80 + tickLen); ctx.lineTo(80, 80); ctx.lineTo(80 + tickLen, 80); ctx.stroke();
  // Top-Right
  ctx.beginPath(); ctx.moveTo(w - 80 - tickLen, 80); ctx.lineTo(w - 80, 80); ctx.lineTo(w - 80, 80 + tickLen); ctx.stroke();
  // Bottom-Left
  ctx.beginPath(); ctx.moveTo(80, h - 80 - tickLen); ctx.lineTo(80, h - 80); ctx.lineTo(80 + tickLen, h - 80); ctx.stroke();
  // Bottom-Right
  ctx.beginPath(); ctx.moveTo(w - 80 - tickLen, h - 80); ctx.lineTo(w - 80, h - 80); ctx.lineTo(w - 80, h - 80 - tickLen); ctx.stroke();

  // Top OSD Overlay
  const isRecBlink = Math.floor(data.time * 2) % 2 === 0;
  if (isRecBlink) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(84, 58, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = isRecBlink ? '#ef4444' : '#f87171';
  ctx.font = '900 16px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('REC', 98, 64);

  ctx.fillStyle = '#4ade80';
  ctx.font = '700 16px "Courier New", monospace';
  ctx.fillText('24.000 FPS', 150, 64);
  ctx.fillText('SHUTTER 180.0°', 280, 64);
  ctx.fillText('EI 800', 440, 64);
  ctx.fillText('WB 5600K', 530, 64);

  // Running SMPTE Timecode
  const tc = formatSMPTETimecode(data.time);
  ctx.fillStyle = '#facc15';
  ctx.font = '900 18px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`TC: ${tc}`, w - 80, 64);

  // Bottom OSD Overlay
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4ade80';
  ctx.font = '700 16px "Courier New", monospace';
  ctx.fillText('ARRI ALEXA MINI LF', 80, h - 54);
  ctx.fillText('LENS: 35mm T2.0', 300, h - 54);

  const pSign = data.headPan >= 0 ? '+' : '';
  const tSign = data.headTilt >= 0 ? '+' : '';
  const rSign = data.headRoll >= 0 ? '+' : '';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`HEAD [P:${pSign}${data.headPan.toFixed(0)}° T:${tSign}${data.headTilt.toFixed(0)}° R:${rSign}${data.headRoll.toFixed(0)}°]`, 500, h - 54);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('BAT: 14.6V (92%)  SSD: 64 min', w - 80, h - 54);

  // Stereo Audio Peak VU Meters on left edge
  const vuL = Math.sin(data.time * 8) * 0.3 + 0.65;
  const vuR = Math.cos(data.time * 7) * 0.3 + 0.62;
  const vuH = 120;
  const vuY = h / 2 - vuH / 2;

  // L channel
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.fillRect(40, vuY, 6, vuH);
  ctx.fillStyle = vuL > 0.85 ? '#ef4444' : vuL > 0.7 ? '#facc15' : '#22c55e';
  ctx.fillRect(40, vuY + vuH * (1 - vuL), 6, vuH * vuL);

  // R channel
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.fillRect(48, vuY, 6, vuH);
  ctx.fillStyle = vuR > 0.85 ? '#ef4444' : vuR > 0.7 ? '#facc15' : '#22c55e';
  ctx.fillRect(48, vuY + vuH * (1 - vuR), 6, vuH * vuR);
}
function createAcousticSpiralCurve(): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  points.push(new THREE.Vector3(0.095, 0.12, 0.01));
  points.push(new THREE.Vector3(0.098, 0.08, -0.01));

  const coilRadius = 0.012;
  const coilLength = 0.14;
  const turns = 7;
  const numSteps = 40;

  for (let i = 0; i <= numSteps; i++) {
    const frac = i / numSteps;
    const angle = frac * turns * Math.PI * 2;
    const y = 0.07 - frac * coilLength;
    const x = 0.098 + Math.cos(angle) * coilRadius;
    const z = -0.01 + Math.sin(angle) * coilRadius;
    points.push(new THREE.Vector3(x, y, z));
  }

  points.push(new THREE.Vector3(0.092, -0.10, 0.02));
  points.push(new THREE.Vector3(0.080, -0.16, 0.06));
  return new THREE.CatmullRomCurve3(points);
}

/**
 * 🖐️ HIGH-FIDELITY 5-FINGER ARTICULATED CINE HAND (3-PHALANX POWER GRIP)
 */
function ArticulatedCineHand({
  isRight,
  isGlove = true,
  grip = 0.5,
  matSkin,
  matGlove
}: {
  isRight: boolean;
  isGlove?: boolean;
  grip?: number;
  matSkin: THREE.Material;
  matGlove: THREE.Material;
}) {
  const sideMul = isRight ? 1 : -1;
  const matMain = isGlove ? matGlove : matSkin;

  return (
    <group scale={[sideMul, 1, 1]}>
      {/* Palm Base / Metacarpal Arch */}
      <mesh castShadow position={[0, -0.036, 0]}>
        <boxGeometry args={[0.076, 0.072, 0.026]} />
        <primitive object={matMain} attach="material" />
      </mesh>
      {/* Tactical Knuckle Guard Bar */}
      {isGlove && (
        <mesh position={[0, -0.012, 0.010]}>
          <boxGeometry args={[0.078, 0.016, 0.012]} />
          <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.4} />
        </mesh>
      )}

      {/* Opposable Thumb wrapping tightly under the handle bar */}
      <group position={[0.036, -0.018, 0.005]} rotation={[0.42 * grip, 0.35 * grip, -0.55 * grip]}>
        {/* Thumb Metacarpal */}
        <mesh castShadow position={[0, -0.014, 0]}>
          <cylinderGeometry args={[0.011, 0.010, 0.028, 8]} />
          <primitive object={matMain} attach="material" />
        </mesh>
        {/* Thumb Proximal Phalanx */}
        <group position={[0, -0.028, 0]} rotation={[0.75 * grip, -0.20 * grip, 0.35 * grip]}>
          <mesh castShadow position={[0, -0.012, 0]}>
            <cylinderGeometry args={[0.0095, 0.0085, 0.024, 8]} />
            <primitive object={matMain} attach="material" />
          </mesh>
          {/* Thumb Distal Tip */}
          <group position={[0, -0.024, 0]} rotation={[0.85 * grip, 0, 0]}>
            <mesh castShadow position={[0, -0.010, 0]}>
              <sphereGeometry args={[0.0082, 8, 8]} />
              <primitive object={matMain} attach="material" />
            </mesh>
          </group>
        </group>
      </group>

      {/* 4 Articulated Fingers (Index, Middle, Ring, Pinky) wrapping completely UNDER the bar */}
      {[
        { x: 0.027, l: 0.038, w: 0.0092 }, // Index
        { x: 0.009, l: 0.042, w: 0.0098 }, // Middle
        { x: -0.009, l: 0.039, w: 0.0092 }, // Ring
        { x: -0.026, l: 0.032, w: 0.0082 }  // Pinky
      ].map((f, i) => (
        <group key={`finger-${i}`} position={[f.x, -0.072, 0]} rotation={[grip * 1.05, 0, 0]}>
          {/* 1. Proximal Phalanx (curves over front of the bar) */}
          <mesh castShadow position={[0, 0, 0]}>
            <sphereGeometry args={[f.w * 1.05, 8, 8]} />
            <primitive object={matMain} attach="material" />
          </mesh>
          <mesh castShadow position={[0, -f.l * 0.22, 0]}>
            <cylinderGeometry args={[f.w, f.w * 0.95, f.l * 0.44, 8]} />
            <primitive object={matMain} attach="material" />
          </mesh>

          {/* 2. Intermediate Phalanx (curves around the bottom of the bar) */}
          <group position={[0, -f.l * 0.44, 0]} rotation={[grip * 1.15, 0, 0]}>
            <mesh castShadow position={[0, 0, 0]}>
              <sphereGeometry args={[f.w * 0.95, 8, 8]} />
              <primitive object={matMain} attach="material" />
            </mesh>
            <mesh castShadow position={[0, -f.l * 0.18, 0]}>
              <cylinderGeometry args={[f.w * 0.92, f.w * 0.85, f.l * 0.36, 8]} />
              <primitive object={matMain} attach="material" />
            </mesh>

            {/* 3. Distal Phalanx & Fingertip (hooks up under the bar) */}
            <group position={[0, -f.l * 0.36, 0]} rotation={[grip * 1.05, 0, 0]}>
              <mesh castShadow position={[0, 0, 0]}>
                <sphereGeometry args={[f.w * 0.85, 8, 8]} />
                <primitive object={matMain} attach="material" />
              </mesh>
              <mesh castShadow position={[0, -f.l * 0.12, 0]}>
                <cylinderGeometry args={[f.w * 0.82, f.w * 0.68, f.l * 0.24, 8]} />
                <primitive object={matMain} attach="material" />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

/**
 * 📻 MOTOROLA / KENWOOD UHF SET WALKIE-TALKIE
 */
function CineCrewWalkieTalkie({ radioScreenTexture }: { radioScreenTexture: THREE.CanvasTexture }) {
  return (
    <group position={[-0.14, 0.32, 0.13]} rotation={[-0.1, 0.2, -0.15]} scale={0.82}>
      {/* Radio Chassis */}
      <mesh castShadow>
        <boxGeometry args={[0.052, 0.11, 0.034]} />
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.6} />
      </mesh>
      {/* Green LCD Display */}
      <mesh position={[0, 0.02, 0.0175]}>
        <planeGeometry args={[0.04, 0.022]} />
        <meshBasicMaterial map={radioScreenTexture} />
      </mesh>
      {/* Orange PTT Talk Button */}
      <mesh position={[-0.028, 0.022, 0]}>
        <boxGeometry args={[0.005, 0.032, 0.014]} />
        <meshStandardMaterial color="#ea580c" roughness={0.3} />
      </mesh>
      {/* Channel Selector & Volume Dials */}
      <mesh position={[-0.014, 0.062, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.014, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.014, 0.062, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.014, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Rubber Whip Antenna */}
      <mesh position={[0.016, 0.14, 0]} rotation={[0.04, 0, -0.04]}>
        <cylinderGeometry args={[0.0022, 0.0038, 0.15, 8]} />
        <meshStandardMaterial color="#09090b" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * 🪪 ALL-ACCESS VIP FILM CREW PASS LANYARD
 */
function CrewLanyardPass({ passTexture }: { passTexture: THREE.CanvasTexture }) {
  return (
    <group position={[0, 0.20, 0.135]} rotation={[0.08, 0, 0]}>
      {/* Lanyard Straps */}
      <mesh position={[-0.08, 0.14, -0.03]} rotation={[0.1, 0, 0.35]}>
        <cylinderGeometry args={[0.007, 0.007, 0.28, 6]} />
        <meshStandardMaterial color="#0284c7" roughness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.14, -0.03]} rotation={[0.1, 0, -0.35]}>
        <cylinderGeometry args={[0.007, 0.007, 0.28, 6]} />
        <meshStandardMaterial color="#0284c7" roughness={0.7} />
      </mesh>
      {/* Swivel Carabiner Metal Clip */}
      <mesh position={[0, 0.02, 0]}>
        <torusGeometry args={[0.009, 0.0028, 8, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Laminated PVC Badge */}
      <mesh castShadow position={[0, -0.06, 0.002]}>
        <boxGeometry args={[0.076, 0.114, 0.003]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.06, 0.004]}>
        <planeGeometry args={[0.072, 0.108]} />
        <meshBasicMaterial map={passTexture} />
      </mesh>
    </group>
  );
}

/**
 * 🥾 HIGH-DETAIL TIMBERLAND / RED-WING WORK SAFETY BOOTS
 */
function WorkSafetyBoots({ matBoots }: { matBoots: THREE.Material }) {
  return (
    <group position={[0, -0.42, 0.04]}>
      {/* Heavy Lugged Rubber Sole with Heel Block */}
      <mesh castShadow position={[0, -0.038, 0.015]}>
        <boxGeometry args={[0.112, 0.026, 0.25]} />
        <meshStandardMaterial color="#09090b" roughness={0.9} />
      </mesh>
      {/* Elevated Heel Block */}
      <mesh castShadow position={[0, -0.048, -0.065]}>
        <boxGeometry args={[0.108, 0.022, 0.08]} />
        <meshStandardMaterial color="#09090b" roughness={0.9} />
      </mesh>
      {/* Goodyear Welt Stitched Midsole Accent */}
      <mesh position={[0, -0.024, 0.015]}>
        <boxGeometry args={[0.114, 0.008, 0.252]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.7} />
      </mesh>
      {/* Leather Boot Upper */}
      <mesh castShadow position={[0, 0.014, 0.012]}>
        <boxGeometry args={[0.102, 0.076, 0.225]} />
        <primitive object={matBoots} attach="material" />
      </mesh>
      {/* Reinforced Curved Safety Toe Box */}
      <mesh castShadow position={[0, 0.005, 0.088]}>
        <sphereGeometry args={[0.052, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Ankle Collar Cushion */}
      <mesh castShadow position={[0, 0.062, -0.02]}>
        <cylinderGeometry args={[0.054, 0.056, 0.075, 16]} />
        <primitive object={matBoots} attach="material" />
      </mesh>
      {/* Padded Ankle Rim */}
      <mesh position={[0, 0.096, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.053, 0.008, 8, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Boot Lacing Strip & Brass Eyelets */}
      <group position={[0, 0.045, 0.048]} rotation={[0.42, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.042, 0.075, 0.008]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {/* Yellow / Gold Kevlar Boot Laces */}
        {[-0.024, -0.008, 0.008, 0.024].map((y, i) => (
          <group key={`lace-${i}`} position={[0, y, 0.006]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.0018, 0.0018, 0.038, 6]} />
              <meshStandardMaterial color="#eab308" roughness={0.5} />
            </mesh>
            <mesh position={[-0.019, 0, 0]}>
              <sphereGeometry args={[0.0028, 6, 6]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.019, 0, 0]}>
              <sphereGeometry args={[0.0028, 6, 6]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * 🎧 BROADCAST PRO DUAL-EARCUP HEADSET
 */
function BroadcastHeadsetPro() {
  return (
    <group position={[0, 0.11, 0]}>
      {/* Headband Steel Spring */}
      <mesh castShadow position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.115, 0.012, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Top Headband Cushion */}
      <mesh castShadow position={[0, 0.185, 0]}>
        <boxGeometry args={[0.11, 0.018, 0.035]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} />
      </mesh>
      {/* Left Earcup */}
      <group position={[-0.108, 0, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.042, 0.044, 0.03, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[-0.016, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.043, 0.043, 0.012, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      </group>
      {/* Right Earcup */}
      <group position={[0.108, 0, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.042, 0.044, 0.03, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0.016, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.043, 0.043, 0.012, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      </group>
      {/* Gooseneck Mic Boom */}
      <group position={[-0.11, -0.01, 0.01]} rotation={[0.42, -0.32, 0]}>
        <mesh castShadow position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.13, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh castShadow position={[0, 0, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.011, 0.02, 8, 12]} />
          <meshStandardMaterial color="#020617" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * 👤 HIGH-FIDELITY ANATOMICAL FACE, EYES, NOSE, LIPS & OPTIONAL 3D BEARD
 */
function RealisticFaceFeatures({
  matSkin,
  hasBeard = false,
  matBeard,
  matHair
}: {
  matSkin: THREE.Material;
  hasBeard?: boolean;
  matBeard?: THREE.Material;
  matHair: THREE.Material;
}) {
  return (
    <group position={[0, 0, 0]}>
      {/* Cranium / Head Sphere (Vertically Proportioned) */}
      <mesh castShadow position={[0, 0.10, -0.005]} scale={[1.0, 1.14, 1.06]}>
        <sphereGeometry args={[0.094, 32, 28]} />
        <primitive object={matSkin} attach="material" />
      </mesh>

      {/* Forehead & Soft Brow Ridge */}
      <mesh castShadow position={[0, 0.125, 0.045]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.098, 0.038, 0.045]} />
        <primitive object={matSkin} attach="material" />
      </mesh>

      {/* Jawline & Chin Structure */}
      <mesh castShadow position={[0, 0.045, 0.022]} rotation={[-0.14, 0, 0]}>
        <boxGeometry args={[0.086, 0.068, 0.082]} />
        <primitive object={matSkin} attach="material" />
      </mesh>
      {/* Rounded Chin Prominence */}
      <mesh castShadow position={[0, 0.028, 0.055]}>
        <sphereGeometry args={[0.022, 16, 16]} />
        <primitive object={matSkin} attach="material" />
      </mesh>

      {/* Anatomical Ears with Helix & Lobe (Left & Right) */}
      <group position={[-0.096, 0.088, -0.012]} rotation={[0, -0.18, -0.08]}>
        <mesh castShadow>
          <torusGeometry args={[0.021, 0.0055, 8, 16, Math.PI * 1.35]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        <mesh position={[0.003, -0.015, 0]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
      </group>
      <group position={[0.096, 0.088, -0.012]} rotation={[0, 0.18, 0.08]}>
        <mesh castShadow>
          <torusGeometry args={[0.021, 0.0055, 8, 16, Math.PI * 1.35]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        <mesh position={[-0.003, -0.015, 0]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
      </group>

      {/* Almond Eyes with Eyelids, Iris, Specular Highlights & Brows */}
      {/* Left Eye */}
      <group position={[-0.034, 0.106, 0.083]}>
        {/* Sclera Eyeball */}
        <mesh>
          <sphereGeometry args={[0.0115, 16, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.15} />
        </mesh>
        {/* Iris */}
        <mesh position={[0, 0, 0.0095]}>
          <circleGeometry args={[0.0058, 16]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Pupil */}
        <mesh position={[0, 0, 0.0102]}>
          <circleGeometry args={[0.0028, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Specular Wet Highlight */}
        <mesh position={[-0.0018, 0.0018, 0.0108]}>
          <circleGeometry args={[0.0012, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Upper Eyelid Curve */}
        <mesh position={[0, 0.006, 0.004]} rotation={[0.22, 0, 0]}>
          <boxGeometry args={[0.024, 0.004, 0.01]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        {/* Lower Eyelid Curve */}
        <mesh position={[0, -0.006, 0.004]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[0.024, 0.003, 0.01]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        {/* Natural Eyebrow */}
        <mesh position={[0, 0.015, 0.006]} rotation={[0, 0, 0.06]}>
          <boxGeometry args={[0.028, 0.0055, 0.008]} />
          <primitive object={matHair} attach="material" />
        </mesh>
      </group>

      {/* Right Eye */}
      <group position={[0.034, 0.106, 0.083]}>
        {/* Sclera Eyeball */}
        <mesh>
          <sphereGeometry args={[0.0115, 16, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.15} />
        </mesh>
        {/* Iris */}
        <mesh position={[0, 0, 0.0095]}>
          <circleGeometry args={[0.0058, 16]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Pupil */}
        <mesh position={[0, 0, 0.0102]}>
          <circleGeometry args={[0.0028, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Specular Wet Highlight */}
        <mesh position={[-0.0018, 0.0018, 0.0108]}>
          <circleGeometry args={[0.0012, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Upper Eyelid Curve */}
        <mesh position={[0, 0.006, 0.004]} rotation={[0.22, 0, 0]}>
          <boxGeometry args={[0.024, 0.004, 0.01]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        {/* Lower Eyelid Curve */}
        <mesh position={[0, -0.006, 0.004]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[0.024, 0.003, 0.01]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        {/* Natural Eyebrow */}
        <mesh position={[0, 0.015, 0.006]} rotation={[0, 0, -0.06]}>
          <boxGeometry args={[0.028, 0.0055, 0.008]} />
          <primitive object={matHair} attach="material" />
        </mesh>
      </group>

      {/* Anatomical Nose with Bridge, Tip & Nostrils */}
      <group position={[0, 0.082, 0.093]}>
        {/* Nasal Bridge */}
        <mesh castShadow position={[0, 0.014, -0.004]} rotation={[-0.18, 0, 0]}>
          <boxGeometry args={[0.013, 0.026, 0.016]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        {/* Rounded Nasal Tip Bulb */}
        <mesh castShadow position={[0, -0.002, 0.008]}>
          <sphereGeometry args={[0.0078, 12, 12]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        {/* Left Nostril Wing */}
        <mesh position={[-0.0075, -0.006, 0.003]} rotation={[0, 0.3, 0]}>
          <sphereGeometry args={[0.0055, 8, 8]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
        {/* Right Nostril Wing */}
        <mesh position={[0.0075, -0.006, 0.003]} rotation={[0, -0.3, 0]}>
          <sphereGeometry args={[0.0055, 8, 8]} />
          <primitive object={matSkin} attach="material" />
        </mesh>
      </group>

      {/* Natural Lips with Cupid's Bow */}
      <group position={[0, 0.046, 0.085]}>
        {/* Upper Lip */}
        <mesh position={[0, 0.0035, 0]}>
          <boxGeometry args={[0.025, 0.005, 0.007]} />
          <meshStandardMaterial color="#c27762" roughness={0.35} />
        </mesh>
        {/* Lower Lip Cushion */}
        <mesh position={[0, -0.0045, 0]}>
          <boxGeometry args={[0.022, 0.006, 0.008]} />
          <meshStandardMaterial color="#b86d58" roughness={0.35} />
        </mesh>
      </group>

      {/* Salt & Pepper Groomed 3D Beard */}
      {hasBeard && matBeard && (
        <group position={[0, 0.042, 0.04]}>
          {/* Mustache hugging upper lip */}
          <mesh castShadow position={[0, 0.016, 0.048]} rotation={[0.06, 0, 0]}>
            <boxGeometry args={[0.046, 0.014, 0.016]} />
            <primitive object={matBeard} attach="material" />
          </mesh>
          {/* Chin Tuft / Goatee */}
          <mesh castShadow position={[0, -0.014, 0.038]}>
            <boxGeometry args={[0.062, 0.036, 0.044]} />
            <primitive object={matBeard} attach="material" />
          </mesh>
          {/* Jawline Side Beards */}
          <mesh position={[-0.043, 0.016, 0.008]} rotation={[0, 0.16, -0.18]}>
            <boxGeometry args={[0.018, 0.056, 0.054]} />
            <primitive object={matBeard} attach="material" />
          </mesh>
          <mesh position={[0.043, 0.016, 0.008]} rotation={[0, -0.16, 0.18]}>
            <boxGeometry args={[0.018, 0.056, 0.054]} />
            <primitive object={matBeard} attach="material" />
          </mesh>
        </group>
      )}
    </group>
  );
}

// =============================================================================
// 1. REAR CRANE OPERATOR (Kranführer am Ausleger/Heck)
// =============================================================================
function RearCraneOperatorRig({
  mode,
  dollyTrack = 0,
  columnElevation = 1.54,
  basePan = 0,
  boomTilt = 0,
  teleExtension = 0,
  animT = 1.0,
  walkTime = 0
}: {
  mode: CraneOperatorMode;
  dollyTrack: number;
  columnElevation?: number;
  basePan: number;
  boomTilt: number;
  teleExtension?: number;
  animT: number;
  walkTime: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);

  const rightShoulderRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);

  const leftHipRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightHipRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);

  const capFrontTexture = useMemo(() => getOperatorTexture('cap_front', createCapFrontTexture), []);
  const truckerMeshTexture = useMemo(() => getOperatorTexture('trucker_mesh', createTruckerMeshTexture), []);
  const passTexture = useMemo(() => getOperatorTexture('crew_pass', createLanyardBadgeTexture), []);
  const radioScreenTexture = useMemo(() => getOperatorTexture('radio_screen', createRadioScreenTexture), []);
  const acousticCurve = useMemo(() => createAcousticSpiralCurve(), []);

  const matSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e5ab82', roughness: 0.55, metalness: 0.05 }), []);
  const matHairSaltPepper = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.85, metalness: 0.1 }), []);
  const matBeard = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 0.9, metalness: 0.05 }), []);
  const matCapFront = useMemo(() => new THREE.MeshStandardMaterial({ map: capFrontTexture, roughness: 0.7, metalness: 0.05 }), [capFrontTexture]);
  const matCapBrimTop = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6, metalness: 0.05 }), []);
  const matCapMesh = useMemo(() => new THREE.MeshStandardMaterial({ map: truckerMeshTexture, roughness: 0.8, metalness: 0.1 }), [truckerMeshTexture]);
  const matAcousticCoil = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f1f5f9', transmission: 0.75, opacity: 0.85, transparent: true, roughness: 0.2, ior: 1.45 }), []);
  const matJacket = useMemo(() => new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.78, metalness: 0.15 }), []);
  const matJacketCollar = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.82, metalness: 0.1 }), []);
  const matPants = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85, metalness: 0.05 }), []);
  const matBoots = useMemo(() => new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.45, metalness: 0.3 }), []);
  const matBelt = useMemo(() => new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.5, roughness: 0.4 }), []);
  const matGlove = useMemo(() => new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.55, metalness: 0.25 }), []);

  useFrame(() => {
    if (!rootRef.current) return;

    // 🎯 EXACT ANALYTICAL KINEMATICS FOR REAR CRANE OPERATOR AT THE HECK
    const panRad = THREE.MathUtils.degToRad(-basePan); // Matches scene pan rotation
    const tiltRad = THREE.MathUtils.degToRad(boomTilt); // Matches scene boom tilt

    const rearLeverArm = 3.74; // Distance to rear Henkel / grab rails
    const rearHandleYLocal = -0.16; // Lower main handlebar height at waist/chest level

    // Local rotated coordinates of rear Henkel relative to pivot
    const handleZRot = rearLeverArm * Math.cos(tiltRad) + rearHandleYLocal * Math.sin(tiltRad);
    const handleYRot = rearHandleYLocal * Math.cos(tiltRad) - rearLeverArm * Math.sin(tiltRad);
    const handleWorldY = Math.max(0.15, (columnElevation || 1.54) + handleYRot);

    // Operator stance offset 0.22m directly behind the Henkel
    const standDist = 0.22;
    const opRadius = handleZRot + standDist;
    const targetX = -opRadius * Math.sin(panRad);
    const targetZ = (dollyTrack || 0) + opRadius * Math.cos(panRad);
    const targetRotY = Math.PI + panRad; // Faces the crane boom from behind

    const spawnX = -6.5;
    const spawnZ = (dollyTrack || 0) + 7.5;

    const isWalking = mode === 'walking_in' || mode === 'walking_out';

    if (isWalking) {
      const smoothT = animT * animT * (3 - 2 * animT);
      const currentX = THREE.MathUtils.lerp(spawnX, targetX, smoothT);
      const currentZ = THREE.MathUtils.lerp(spawnZ, targetZ, smoothT);
      const stepSin = Math.sin(walkTime);

      rootRef.current.position.set(currentX, Math.abs(stepSin) * 0.045, currentZ);
      const dx = targetX - spawnX;
      const dz = targetZ - spawnZ;
      const walkAngle = Math.atan2(dx, dz) + Math.PI;
      rootRef.current.rotation.y = THREE.MathUtils.lerp(walkAngle, targetRotY, smoothT);

      if (leftHipRef.current && rightHipRef.current && leftKneeRef.current && rightKneeRef.current) {
        leftHipRef.current.rotation.x = stepSin * 0.55;
        rightHipRef.current.rotation.x = -stepSin * 0.55;
        leftKneeRef.current.rotation.x = Math.max(0, -stepSin) * 0.75;
        rightKneeRef.current.rotation.x = Math.max(0, stepSin) * 0.75;
      }
      if (leftShoulderRef.current && rightShoulderRef.current) {
        leftShoulderRef.current.rotation.x = -stepSin * 0.45;
        leftShoulderRef.current.rotation.z = -0.12;
        rightShoulderRef.current.rotation.x = stepSin * 0.45;
        rightShoulderRef.current.rotation.z = 0.12;
      }
      if (leftElbowRef.current && rightElbowRef.current) {
        leftElbowRef.current.rotation.x = 0.25 + Math.abs(stepSin) * 0.2;
        rightElbowRef.current.rotation.x = 0.25 + Math.abs(stepSin) * 0.2;
      }
      if (spineRef.current) {
        spineRef.current.rotation.y = stepSin * 0.08;
      }
      if (headRef.current) {
        headRef.current.rotation.y = stepSin * 0.04;
        headRef.current.rotation.x = -0.05;
      }
    } else if (mode === 'operating') {
      const breathe = Math.sin(walkTime * 0.3) * 0.012;
      rootRef.current.position.set(targetX, 0, targetZ);
      rootRef.current.rotation.y = targetRotY;

      // 🦾 NATURAL ATHLETIC FORWARD LEAN & 2-BONE IK TO FIRMLY GRIP THE HECK-HENKEL
      // Natural forward lean of the upper torso towards the handle
      const crouchFactor = handleWorldY < 1.35 ? THREE.MathUtils.clamp((1.35 - handleWorldY) / 0.85, 0, 1) : 0;
      const spinePitch = -0.15 - crouchFactor * 0.20; // Leans forward (negative X rotation)
      const kneeBend = 0.08 + crouchFactor * 0.40;
      const hipPitch = 0.04 + crouchFactor * 0.18;

      // Exact shoulder joint position accounting for forward spine lean
      const spineLength = 0.38;
      const shoulderForwardZ = -Math.sin(spinePitch) * spineLength; // Forward shift (+Z)
      const shoulderWorldY = 1.08 + Math.cos(spinePitch) * spineLength - crouchFactor * 0.15; // Vertical height

      const deltaZ = Math.max(0.10, standDist - shoulderForwardZ + 0.04);
      const deltaY = handleWorldY - shoulderWorldY;

      const L1 = 0.26; // Upper arm length
      const L2 = 0.24; // Forearm length
      const rawDist = Math.sqrt(deltaZ * deltaZ + deltaY * deltaY);
      const L = Math.max(0.15, Math.min(L1 + L2 - 0.008, rawDist));

      // Base elevation angle from straight down (+Y down) to target
      const baseAngle = Math.atan2(deltaZ, -deltaY);

      // Law of cosines for elbow
      const cosElbow = THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - L * L) / (2 * L1 * L2), -1, 1);
      const elbowAngle = Math.PI - Math.acos(cosElbow);

      // Law of cosines for shoulder
      const cosShoulder = THREE.MathUtils.clamp((L1 * L1 + L * L - L2 * L2) / (2 * L1 * L), -1, 1);
      const shoulderOffset = Math.acos(cosShoulder);

      // Shoulder pitch (negative swings arm forward towards crane)
      const shoulderPitch = baseAngle - shoulderOffset;
      // Wrist palmar flexion (wraps palm directly onto the top of the bar and fingers curl underneath)
      const handPitch = 0.75 + elbowAngle * 0.30;

      if (leftHipRef.current && rightHipRef.current && leftKneeRef.current && rightKneeRef.current) {
        leftHipRef.current.rotation.set(-hipPitch, 0.05, -0.04);
        rightHipRef.current.rotation.set(-hipPitch, -0.05, 0.04);
        leftKneeRef.current.rotation.x = kneeBend;
        rightKneeRef.current.rotation.x = kneeBend;
      }
      if (spineRef.current) {
        spineRef.current.rotation.x = spinePitch + Math.sin(walkTime * 0.25) * 0.012;
        spineRef.current.scale.set(1 + breathe * 0.02, 1 + breathe * 0.008, 1 + breathe * 0.025);
        spineRef.current.position.y = breathe;
      }
      if (headRef.current) {
        const lookUpAngle = THREE.MathUtils.clamp(-0.16 - (boomTilt * Math.PI / 180) * 0.24, -0.38, 0.22);
        headRef.current.rotation.x = lookUpAngle;
      }

      // Left hand firmly locked onto the left rubber grip sleeve of the Henkel
      if (leftShoulderRef.current && leftElbowRef.current && leftHandRef.current) {
        leftShoulderRef.current.rotation.set(-shoulderPitch, 0.06, -0.04);
        leftElbowRef.current.rotation.set(elbowAngle, 0, 0);
        leftHandRef.current.rotation.set(handPitch, 0.04, 0.06);
      }

      // Right hand firmly locked onto the right rubber grip sleeve of the Henkel & thumb on rocker switch
      if (rightShoulderRef.current && rightElbowRef.current && rightHandRef.current) {
        rightShoulderRef.current.rotation.set(-shoulderPitch, -0.06, 0.04);
        rightElbowRef.current.rotation.set(elbowAngle, 0, 0);
        rightHandRef.current.rotation.set(handPitch, -0.04, -0.06 + ((teleExtension || 0) / 11.3 - 0.5) * 0.15);
      }
    }
  });

  return (
    <group ref={rootRef}>
      {/* Humanoid Rig */}
      <group ref={hipsRef} position={[0, 0.96, 0]}>
        {/* Pelvis in Work Trousers */}
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.32, 0.18, 0.22]} />
          <primitive object={matPants} attach="material" />
        </mesh>

        {/* Heavy Leather Work Belt & Double-Pin Steel Buckle */}
        <mesh castShadow position={[0, 0.095, 0]}>
          <boxGeometry args={[0.33, 0.048, 0.228]} />
          <primitive object={matBelt} attach="material" />
        </mesh>
        {/* Steel Belt Buckle */}
        <mesh position={[0, 0.095, 0.116]}>
          <boxGeometry args={[0.052, 0.042, 0.012]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.095, 0.122]}>
          <cylinderGeometry args={[0.0022, 0.0022, 0.028, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
        </mesh>

        <group ref={spineRef} position={[0, 0.12, 0]}>
          {/* Main Weatherproof Set Jacket */}
          <mesh castShadow position={[0, 0.23, 0]}>
            <boxGeometry args={[0.38, 0.42, 0.24]} />
            <primitive object={matJacket} attach="material" />
          </mesh>

          {/* Heavy-Duty Central Steel Zipper Track */}
          <mesh position={[0, 0.22, 0.122]}>
            <boxGeometry args={[0.014, 0.39, 0.006]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.88} roughness={0.2} />
          </mesh>
          {/* Silver Zipper Pull Slider */}
          <mesh position={[0, 0.35, 0.128]}>
            <boxGeometry args={[0.008, 0.026, 0.008]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.95} roughness={0.1} />
          </mesh>

          {/* Left & Right Flap Chest Pockets with Metal Snap Studs */}
          <group position={[-0.10, 0.27, 0.122]}>
            <mesh castShadow>
              <boxGeometry args={[0.088, 0.095, 0.012]} />
              <primitive object={matJacket} attach="material" />
            </mesh>
            <mesh position={[0, 0.035, 0.008]}>
              <sphereGeometry args={[0.0038, 8, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
          <group position={[0.10, 0.27, 0.122]}>
            <mesh castShadow>
              <boxGeometry args={[0.088, 0.095, 0.012]} />
              <primitive object={matJacket} attach="material" />
            </mesh>
            <mesh position={[0, 0.035, 0.008]}>
              <sphereGeometry args={[0.0038, 8, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>

          {/* Ribbed Bottom Waist Hem Band */}
          <mesh castShadow position={[0, 0.03, 0]}>
            <boxGeometry args={[0.36, 0.045, 0.23]} />
            <primitive object={matJacketCollar} attach="material" />
          </mesh>

          {/* Storm Collar with Ribbed Neck Trim */}
          <mesh castShadow position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.11, 0.13, 0.10, 16]} />
            <primitive object={matJacketCollar} attach="material" />
          </mesh>

          {/* Solid Anatomical Neck */}
          <mesh castShadow position={[0, 0.49, 0]}>
            <cylinderGeometry args={[0.048, 0.052, 0.08, 16]} />
            <primitive object={matSkin} attach="material" />
          </mesh>

          {/* Film Crew Walkie-Talkie on Shoulder */}
          <CineCrewWalkieTalkie radioScreenTexture={radioScreenTexture} />

          {/* All-Access VIP Pass Lanyard */}
          <CrewLanyardPass passTexture={passTexture} />

          {/* Head, Cap & Facial Features */}
          <group ref={headRef} position={[0, 0.54, 0]}>
            <RealisticFaceFeatures
              matSkin={matSkin}
              hasBeard={true}
              matBeard={matBeard}
              matHair={matHairSaltPepper}
            />

            {/* Hair (Trimmed neatly at back and sides under cap) */}
            <mesh castShadow position={[0, 0.085, -0.02]}>
              <sphereGeometry args={[0.098, 16, 16]} />
              <primitive object={matHairSaltPepper} attach="material" />
            </mesh>

            {/* In-Ear Acoustic Secret Service Style Coil */}
            <group position={[-0.095, 0.08, 0]}>
              <mesh castShadow>
                <tubeGeometry args={[acousticCurve, 24, 0.003, 8, false]} />
                <primitive object={matAcousticCoil} attach="material" />
              </mesh>
            </group>

            {/* Vintage Trucker Cap (Properly Fitted on Top of Cranium) */}
            <group position={[0, 0.11, 0]} rotation={[-0.04, 0, 0]}>
              {/* Rear Mesh Dome */}
              <mesh castShadow position={[0, 0.02, -0.015]}>
                <sphereGeometry args={[0.102, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                <primitive object={matCapMesh} attach="material" />
              </mesh>
              {/* Front Foam Panel */}
              <mesh castShadow position={[0, 0.03, 0.045]} rotation={[-0.22, 0, 0]}>
                <boxGeometry args={[0.125, 0.065, 0.035]} />
                <primitive object={matCapFront} attach="material" />
              </mesh>
              {/* Visor / Brim */}
              <mesh castShadow position={[0, 0.008, 0.095]} rotation={[0.14, 0, 0]}>
                <boxGeometry args={[0.135, 0.008, 0.085]} />
                <primitive object={matCapBrimTop} attach="material" />
              </mesh>
            </group>
          </group>

          {/* Left Arm with 5-Finger Articulated Hand */}
          <group ref={leftShoulderRef} position={[-0.22, 0.38, 0]}>
            {/* Shoulder Deltoid & Upper Arm */}
            <mesh castShadow position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.054, 0.046, 0.24, 16]} />
              <primitive object={matJacket} attach="material" />
            </mesh>
            <group ref={leftElbowRef} position={[0, -0.25, 0]}>
              {/* Forearm & Sleeve Cuff */}
              <mesh castShadow position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.046, 0.038, 0.24, 16]} />
                <primitive object={matJacket} attach="material" />
              </mesh>
              <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.039, 0.006, 8, 16]} />
                <primitive object={matJacketCollar} attach="material" />
              </mesh>
              <group ref={leftHandRef} position={[0, -0.24, 0]}>
                <ArticulatedCineHand
                  isRight={false}
                  isGlove={true}
                  grip={1.0}
                  matSkin={matSkin}
                  matGlove={matGlove}
                />
              </group>
            </group>
          </group>

          {/* Right Arm with 5-Finger Articulated Hand */}
          <group ref={rightShoulderRef} position={[0.22, 0.38, 0]}>
            {/* Shoulder Deltoid & Upper Arm */}
            <mesh castShadow position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.054, 0.046, 0.24, 16]} />
              <primitive object={matJacket} attach="material" />
            </mesh>
            <group ref={rightElbowRef} position={[0, -0.25, 0]}>
              {/* Forearm & Sleeve Cuff */}
              <mesh castShadow position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.046, 0.038, 0.24, 16]} />
                <primitive object={matJacket} attach="material" />
              </mesh>
              <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.039, 0.006, 8, 16]} />
                <primitive object={matJacketCollar} attach="material" />
              </mesh>
              <group ref={rightHandRef} position={[0, -0.24, 0]}>
                <ArticulatedCineHand
                  isRight={true}
                  isGlove={true}
                  grip={1.0}
                  matSkin={matSkin}
                  matGlove={matGlove}
                />
              </group>
            </group>
          </group>
        </group>

        {/* Left Leg with Cargo Work Trousers & Boots */}
        <group ref={leftHipRef} position={[-0.12, -0.06, 0]}>
          {/* Thigh */}
          <mesh castShadow position={[0, -0.20, 0]}>
            <cylinderGeometry args={[0.066, 0.056, 0.40, 16]} />
            <primitive object={matPants} attach="material" />
          </mesh>
          {/* Side Cargo Pocket */}
          <mesh castShadow position={[-0.062, -0.16, 0]}>
            <boxGeometry args={[0.018, 0.11, 0.085]} />
            <primitive object={matPants} attach="material" />
          </mesh>
          <group ref={leftKneeRef} position={[0, -0.40, 0]}>
            {/* Knee Reinforcement Seam */}
            <mesh position={[0, 0, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
              <sphereGeometry args={[0.052, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
              <primitive object={matPants} attach="material" />
            </mesh>
            {/* Calf in Trousers */}
            <mesh castShadow position={[0, -0.19, 0]}>
              <cylinderGeometry args={[0.055, 0.048, 0.38, 16]} />
              <primitive object={matPants} attach="material" />
            </mesh>
            <WorkSafetyBoots matBoots={matBoots} />
          </group>
        </group>

        {/* Right Leg with Cargo Work Trousers & Boots */}
        <group ref={rightHipRef} position={[0.12, -0.06, 0]}>
          {/* Thigh */}
          <mesh castShadow position={[0, -0.20, 0]}>
            <cylinderGeometry args={[0.066, 0.056, 0.40, 16]} />
            <primitive object={matPants} attach="material" />
          </mesh>
          {/* Side Cargo Pocket */}
          <mesh castShadow position={[0.062, -0.16, 0]}>
            <boxGeometry args={[0.018, 0.11, 0.085]} />
            <primitive object={matPants} attach="material" />
          </mesh>
          <group ref={rightKneeRef} position={[0, -0.40, 0]}>
            {/* Knee Reinforcement Seam */}
            <mesh position={[0, 0, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
              <sphereGeometry args={[0.052, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
              <primitive object={matPants} attach="material" />
            </mesh>
            {/* Calf in Trousers */}
            <mesh castShadow position={[0, -0.19, 0]}>
              <cylinderGeometry args={[0.055, 0.048, 0.38, 16]} />
              <primitive object={matPants} attach="material" />
            </mesh>
            <WorkSafetyBoots matBoots={matBoots} />
          </group>
        </group>
      </group>
    </group>
  );
}

// =============================================================================
// 2. FLOOR CONTROL DESK & DOP OPERATOR (Boden-Steuerpult daneben)
// =============================================================================
function FloorControlDeskAndOperatorRig({
  mode,
  dollyTrack = 0,
  columnElevation = 1.54,
  basePan = 0,
  boomTilt = 0,
  teleExtension = 0,
  headPan = 0,
  headTilt = 0,
  headRoll = 0,
  animT = 1.0,
  walkTime = 0,
  hideHuman = false
}: {
  mode: CraneOperatorMode;
  dollyTrack: number;
  columnElevation?: number;
  basePan?: number;
  boomTilt?: number;
  teleExtension?: number;
  headPan: number;
  headTilt: number;
  headRoll: number;
  animT: number;
  walkTime: number;
  hideHuman?: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);

  const rightShoulderRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);

  const leftHipRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightHipRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);

  const joystickRef = useRef<THREE.Group>(null);
  const rockerSwitchRef = useRef<THREE.Group>(null);
  const focusWheelRef = useRef<THREE.Group>(null);
  const rollKnobRef = useRef<THREE.Group>(null);

  const shirtTexture = useMemo(() => getOperatorTexture('desk_shirt', createDeskOperatorShirtTexture), []);
  const passTexture = useMemo(() => getOperatorTexture('crew_pass', createLanyardBadgeTexture), []);
  const radioScreenTexture = useMemo(() => getOperatorTexture('radio_screen', createRadioScreenTexture), []);
  const technoheadTopTexture = useMemo(() => getOperatorTexture('technohead_top', createTechnoheadTopTexture), []);
  const rockerPaddleTexture = useMemo(() => getOperatorTexture('rocker_paddle', createRockerPaddleTexture), []);

  // 📺 Dynamic Real-Time Canvas Textures for Desk Displays (1024x640 Telemetry + 1024x576 Cine Master Monitor)
  const { telemetryTexture, telemetryCanvas } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Initial draw to guarantee instant visibility
    renderDeskTelemetryScreen(canvas, {
      teleExtension,
      boomTilt,
      basePan,
      columnElevation,
      dollyTrack,
      headPan,
      headTilt,
      headRoll,
      time: 0
    });
    texture.needsUpdate = true;
    return { telemetryTexture: texture, telemetryCanvas: canvas };
  }, []);

  const { cineMonitorTexture, cineMonitorCanvas } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Initial draw to guarantee instant visibility
    renderDeskCineMonitorScreen(canvas, {
      headPan,
      headTilt,
      headRoll,
      time: 0
    });
    texture.needsUpdate = true;
    return { cineMonitorTexture: texture, cineMonitorCanvas: canvas };
  }, []);

  const matSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f2c1a0', roughness: 0.46, metalness: 0.02 }), []);
  const matHairDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.85 }), []);
  const matShirt = useMemo(() => new THREE.MeshStandardMaterial({ map: shirtTexture, roughness: 0.8, metalness: 0.1 }), [shirtTexture]);
  const matPants = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85, metalness: 0.05 }), []);
  const matBelt = useMemo(() => new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.4, roughness: 0.5 }), []);
  const matBoots = useMemo(() => new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.45, metalness: 0.25 }), []);
  const matTechnoheadChassis = useMemo(() => new THREE.MeshStandardMaterial({ color: '#14161a', roughness: 0.42, metalness: 0.65 }), []);
  const matTechnoheadTop = useMemo(() => new THREE.MeshStandardMaterial({ map: technoheadTopTexture, roughness: 0.38, metalness: 0.52 }), [technoheadTopTexture]);
  const matRockerPaddle = useMemo(() => new THREE.MeshStandardMaterial({ map: rockerPaddleTexture, roughness: 0.48, metalness: 0.2 }), [rockerPaddleTexture]);
  const matKnurledAlu = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.92, roughness: 0.18 }), []);
  const matWhiteRing = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.25, metalness: 0.05 }), []);
  const matRubberGaiter = useMemo(() => new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.85, metalness: 0.1 }), []);
  const matChromeBolt = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.95, roughness: 0.12 }), []);
  const matLedGreen = useMemo(() => new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#16a34a', emissiveIntensity: 1.8, roughness: 0.2 }), []);
  const matAluTrim = useMemo(() => new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.35, metalness: 0.85 }), []);
  const matMonitorScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: cineMonitorTexture }), [cineMonitorTexture]);
  const matTelemetryScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: telemetryTexture }), [telemetryTexture]);
  const matGlove = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.6, metalness: 0.2 }), []);

  const lastDrawTime = useRef<number>(0);

  useFrame((state) => {
    // ⚡ Real-Time Dynamic Screen Updates (~30 FPS throttle)
    const now = state.clock.getElapsedTime();
    if (now - lastDrawTime.current > 0.033) {
      lastDrawTime.current = now;
      
      // Update 7" Telemetry Display
      renderDeskTelemetryScreen(telemetryCanvas, {
        teleExtension,
        boomTilt,
        basePan,
        columnElevation,
        dollyTrack,
        headPan,
        headTilt,
        headRoll,
        time: now
      });
      telemetryTexture.needsUpdate = true;

      // Update 17" Master Cine Monitor
      renderDeskCineMonitorScreen(cineMonitorCanvas, {
        headPan,
        headTilt,
        headRoll,
        time: now
      });
      cineMonitorTexture.needsUpdate = true;
    }

    if (!rootRef.current) return;
    const spawnX = 7.5;
    const spawnZ = dollyTrack + 4.5;
    const targetX = 3.2;
    const targetZ = dollyTrack + 0.8;

    const isWalking = mode === 'walking_in' || mode === 'walking_out';

    if (isWalking) {
      const smoothT = animT * animT * (3 - 2 * animT);
      const currentX = THREE.MathUtils.lerp(spawnX, targetX, smoothT);
      const currentZ = THREE.MathUtils.lerp(spawnZ, targetZ, smoothT);
      const stepSin = Math.sin(walkTime + 0.5);

      rootRef.current.position.set(currentX, Math.abs(stepSin) * 0.045, currentZ);
      const dx = targetX - spawnX;
      const dz = targetZ - spawnZ;
      const walkAngle = Math.atan2(dx, dz) + Math.PI;
      rootRef.current.rotation.y = THREE.MathUtils.lerp(walkAngle, -Math.PI * 0.65, smoothT);

      if (leftHipRef.current && rightHipRef.current && leftKneeRef.current && rightKneeRef.current) {
        leftHipRef.current.rotation.x = stepSin * 0.55;
        rightHipRef.current.rotation.x = -stepSin * 0.55;
        leftKneeRef.current.rotation.x = Math.max(0, -stepSin) * 0.75;
        rightKneeRef.current.rotation.x = Math.max(0, stepSin) * 0.75;
      }
      if (leftShoulderRef.current && rightShoulderRef.current) {
        leftShoulderRef.current.rotation.x = -stepSin * 0.45;
        rightShoulderRef.current.rotation.x = stepSin * 0.45;
      }
      if (spineRef.current) {
        spineRef.current.rotation.y = stepSin * 0.08;
      }
    } else if (mode === 'operating') {
      const breathe = Math.sin((walkTime + 1.0) * 0.3) * 0.015;
      rootRef.current.position.set(targetX, 0, targetZ);
      rootRef.current.rotation.y = -Math.PI * 0.65; // Facing desk and monitors

      if (spineRef.current) {
        spineRef.current.rotation.x = 0.08;
        spineRef.current.position.y = breathe;
      }
      if (headRef.current) {
        headRef.current.rotation.x = 0.16; // Looks down at the monitor screen and TECHNOHEAD controls
        headRef.current.rotation.y = 0.04;
      }
      // 🦾 Hands accurately resting on the TECHNOHEAD joystick and focus/rocker controls
      if (leftShoulderRef.current && leftElbowRef.current && leftHandRef.current) {
        leftShoulderRef.current.rotation.set(-0.68, -0.16, -0.08);
        leftElbowRef.current.rotation.set(-0.65, 0, 0);
        leftHandRef.current.rotation.set(0.14, 0, (headRoll * Math.PI / 180) * 0.4);
      }
      if (rightShoulderRef.current && rightElbowRef.current && rightHandRef.current) {
        rightShoulderRef.current.rotation.set(-0.72, 0.18, 0.08);
        rightElbowRef.current.rotation.set(-0.62, 0, 0);
        rightHandRef.current.rotation.set(0.12, 0, (headTilt * Math.PI / 180) * 0.4);
      }
      // Interactive Real-Time TECHNOHEAD Controls
      if (joystickRef.current) {
        const joyTilt = THREE.MathUtils.clamp((headTilt * Math.PI / 180) * 0.4, -0.42, 0.42);
        const joyPan = THREE.MathUtils.clamp((-headPan * Math.PI / 180) * 0.4, -0.42, 0.42);
        joystickRef.current.rotation.set(joyTilt, 0, joyPan);
      }
      if (rockerSwitchRef.current) {
        const rockerTilt = THREE.MathUtils.mapLinear(teleExtension || 0, 0, 11.3, -0.22, 0.22);
        rockerSwitchRef.current.rotation.x = rockerTilt;
      }
      if (focusWheelRef.current) {
        focusWheelRef.current.rotation.x = (headRoll * Math.PI / 180) * 1.5;
      }
      if (rollKnobRef.current) {
        rollKnobRef.current.rotation.y = (headRoll * Math.PI / 180) * 2.0;
      }
    }
  });

  return (
    <group ref={rootRef}>
      {/* 1. AUTHENTIC TECHNOHEAD CONTROL CONSOLE & PEDESTAL STAND */}
      <group position={[0, 0, 0.65]} rotation={[0, Math.PI, 0]}>
        {/* Heavy Studio Pedestal Column & Base */}
        <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.90, 24]} />
          <primitive object={matTechnoheadChassis} attach="material" />
        </mesh>
        {/* Machined Locking Collar Clamp */}
        <mesh castShadow position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.062, 0.062, 0.045, 24]} />
          <primitive object={matAluTrim} attach="material" />
        </mesh>
        <mesh castShadow position={[0.065, 0.78, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.06, 12]} />
          <primitive object={matAluTrim} attach="material" />
        </mesh>
        {/* Heavy Circular Studio Floor Base */}
        <mesh castShadow receiveShadow position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.38, 0.40, 0.05, 32]} />
          <primitive object={matTechnoheadChassis} attach="material" />
        </mesh>
        <mesh position={[0, 0.052, 0]}>
          <cylinderGeometry args={[0.18, 0.24, 0.03, 24]} />
          <primitive object={matTechnoheadChassis} attach="material" />
        </mesh>

        {/* Main TECHNOHEAD CNC Console Box (Angled for ergonomics) */}
        <group position={[0, 0.96, 0]} rotation={[0.22, 0, 0]}>
          {/* Main Anodized Chassis Box */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.84, 0.12, 0.44]} />
            <primitive object={matTechnoheadChassis} attach="material" />
          </mesh>

          {/* Top Faceplate with Laser-Engraved TECHNOHEAD Graphic */}
          <mesh position={[0, 0.0605, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.836, 0.436]} />
            <primitive object={matTechnoheadTop} attach="material" />
          </mesh>

          {/* Front Face Chamfer Trim & Hex Socket Screws */}
          <mesh position={[0, 0, 0.221]}>
            <planeGeometry args={[0.836, 0.116]} />
            <primitive object={matTechnoheadChassis} attach="material" />
          </mesh>
          {/* 4 Silver Hex Screws on Front Panel */}
          <mesh position={[-0.38, 0.035, 0.222]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.003, 12]} />
            <primitive object={matChromeBolt} attach="material" />
          </mesh>
          <mesh position={[-0.38, -0.035, 0.222]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.003, 12]} />
            <primitive object={matChromeBolt} attach="material" />
          </mesh>
          <mesh position={[0.38, 0.035, 0.222]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.003, 12]} />
            <primitive object={matChromeBolt} attach="material" />
          </mesh>
          <mesh position={[0.38, -0.035, 0.222]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.003, 12]} />
            <primitive object={matChromeBolt} attach="material" />
          </mesh>

          {/* 4 Silver Hex Screws on Left & Right Side Panels */}
          <mesh position={[-0.421, 0.03, 0.10]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.003, 12]} />
            <primitive object={matChromeBolt} attach="material" />
          </mesh>
          <mesh position={[-0.421, -0.03, 0.10]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.003, 12]} />
            <primitive object={matChromeBolt} attach="material" />
          </mesh>
          <mesh position={[0.421, 0.03, 0.10]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.003, 12]} />
            <primitive object={matChromeBolt} attach="material" />
          </mesh>
          <mesh position={[0.421, -0.03, 0.10]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.003, 12]} />
            <primitive object={matChromeBolt} attach="material" />
          </mesh>

          {/* --- 🎛️ TOP PANEL CONTROLS --- */}

          {/* 1. TOP-LEFT: FOCUS / FIZ CYLINDER WHEEL */}
          <group position={[-0.27, 0.062, -0.11]}>
            {/* Bezel Cutout Recess */}
            <mesh position={[0, -0.015, 0]}>
              <boxGeometry args={[0.095, 0.04, 0.075]} />
              <meshBasicMaterial color="#050608" />
            </mesh>
            {/* Dual-Tone Focus Wheel */}
            <group ref={focusWheelRef} rotation={[0, 0, Math.PI / 2]}>
              {/* Left: Smooth White Index Drum */}
              <mesh castShadow position={[0, 0.016, 0]}>
                <cylinderGeometry args={[0.032, 0.032, 0.032, 24]} />
                <primitive object={matWhiteRing} attach="material" />
              </mesh>
              {/* Right: Black Knurled Grip Ring */}
              <mesh castShadow position={[0, -0.016, 0]}>
                <cylinderGeometry args={[0.033, 0.033, 0.030, 24]} />
                <primitive object={matTechnoheadChassis} attach="material" />
              </mesh>
            </group>
          </group>

          {/* 2. MID-LEFT: SILVER KNURLED ROLL KNOB */}
          <group position={[-0.155, 0.062, -0.10]}>
            {/* Silver Hex Collar Nut */}
            <mesh position={[0, 0.005, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.008, 6]} />
              <primitive object={matKnurledAlu} attach="material" />
            </mesh>
            {/* Knurled Aluminum Dial */}
            <group ref={rollKnobRef} position={[0, 0.020, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.018, 0.018, 0.024, 24]} />
                <primitive object={matKnurledAlu} attach="material" />
              </mesh>
              {/* Top Indicator Dot */}
              <mesh position={[0, 0.0125, -0.012]}>
                <sphereGeometry args={[0.0025, 8, 8]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
            </group>
          </group>

          {/* 3. LOWER-LEFT: W/T (WIDE / TELE) ROCKER SWITCH */}
          <group position={[-0.155, 0.062, 0.025]}>
            {/* Rectangular Bezel */}
            <mesh position={[0, 0.002, 0]}>
              <boxGeometry args={[0.042, 0.006, 0.088]} />
              <primitive object={matTechnoheadChassis} attach="material" />
            </mesh>
            {/* Moving Rocker Switch Paddle */}
            <group ref={rockerSwitchRef} position={[0, 0.016, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.028, 0.022, 0.065]} />
                <primitive object={matRockerPaddle} attach="material" />
              </mesh>
            </group>
          </group>

          {/* 4. UPPER-RIGHT: PRECISION 2-AXIS JOYSTICK */}
          <group position={[0.13, 0.062, -0.10]}>
            {/* Square Base Flange */}
            <mesh position={[0, 0.003, 0]}>
              <boxGeometry args={[0.105, 0.008, 0.105]} />
              <primitive object={matTechnoheadChassis} attach="material" />
            </mesh>
            {/* 4 Silver Corner Screws */}
            <mesh position={[-0.042, 0.008, -0.042]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.003, 8]} />
              <primitive object={matChromeBolt} attach="material" />
            </mesh>
            <mesh position={[0.042, 0.008, -0.042]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.003, 8]} />
              <primitive object={matChromeBolt} attach="material" />
            </mesh>
            <mesh position={[-0.042, 0.008, 0.042]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.003, 8]} />
              <primitive object={matChromeBolt} attach="material" />
            </mesh>
            <mesh position={[0.042, 0.008, 0.042]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.003, 8]} />
              <primitive object={matChromeBolt} attach="material" />
            </mesh>

            {/* Rubber Corrugated Boot / Gaiter Bellows */}
            <mesh position={[0, 0.018, 0]}>
              <cylinderGeometry args={[0.024, 0.042, 0.028, 16]} />
              <primitive object={matRubberGaiter} attach="material" />
            </mesh>
            <mesh position={[0, 0.028, 0]}>
              <torusGeometry args={[0.025, 0.006, 8, 16]} />
              <primitive object={matRubberGaiter} attach="material" />
            </mesh>

            {/* Articulated 2-Axis Joystick Stick */}
            <group ref={joystickRef} position={[0, 0.024, 0]}>
              {/* Steel Shaft */}
              <mesh castShadow position={[0, 0.045, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.07, 12]} />
                <primitive object={matKnurledAlu} attach="material" />
              </mesh>
              {/* Tapered Knurled Grip Head */}
              <mesh castShadow position={[0, 0.092, 0]}>
                <cylinderGeometry args={[0.014, 0.010, 0.045, 16]} />
                <primitive object={matTechnoheadChassis} attach="material" />
              </mesh>
              {/* Smooth Rounded Crown Tip */}
              <mesh position={[0, 0.116, 0]}>
                <sphereGeometry args={[0.012, 16, 16]} />
                <primitive object={matTechnoheadChassis} attach="material" />
              </mesh>
            </group>
          </group>

          {/* 5. TOP-RIGHT: STATUS LED INDICATOR */}
          <group position={[0.245, 0.062, -0.13]}>
            {/* Chrome Bezel Ring */}
            <mesh position={[0, 0.004, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.006, 16]} />
              <primitive object={matChromeBolt} attach="material" />
            </mesh>
            {/* Green Glowing Lens */}
            <mesh position={[0, 0.008, 0]}>
              <sphereGeometry args={[0.0045, 12, 12]} />
              <primitive object={matLedGreen} attach="material" />
            </mesh>
            <pointLight position={[0, 0.03, 0]} intensity={0.6} distance={0.4} color="#22c55e" />
          </group>

          {/* --- 🔌 REAR ACCESSORY CROSSBAR & INDUSTRIAL CONNECTOR HARNESS --- */}
          <group position={[0, 0.04, -0.26]}>
            {/* Central Support Riser Clamp */}
            <mesh castShadow position={[0, 0.03, 0]}>
              <boxGeometry args={[0.045, 0.08, 0.04]} />
              <primitive object={matTechnoheadChassis} attach="material" />
            </mesh>
            {/* Horizontal Cylindrical Support Bar */}
            <mesh castShadow position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.76, 20]} />
              <primitive object={matTechnoheadChassis} attach="material" />
            </mesh>
            {/* 3x Black Rotary Potentiometer Knobs on Crossbar */}
            <mesh position={[-0.18, 0.09, 0]}>
              <cylinderGeometry args={[0.010, 0.010, 0.022, 16]} />
              <primitive object={matTechnoheadChassis} attach="material" />
            </mesh>
            <mesh position={[-0.10, 0.09, 0]}>
              <cylinderGeometry args={[0.010, 0.010, 0.022, 16]} />
              <primitive object={matTechnoheadChassis} attach="material" />
            </mesh>
            <mesh position={[-0.02, 0.09, 0]}>
              <cylinderGeometry args={[0.010, 0.010, 0.022, 16]} />
              <primitive object={matTechnoheadChassis} attach="material" />
            </mesh>

            {/* Industrial Multi-Pin Metal Connector (LEMO / Fischer style) */}
            <group position={[0.18, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.014, 0.014, 0.055, 16]} />
                <primitive object={matKnurledAlu} attach="material" />
              </mesh>
              <mesh position={[0, 0.035, 0]}>
                <cylinderGeometry args={[0.010, 0.012, 0.025, 16]} />
                <primitive object={matRubberGaiter} attach="material" />
              </mesh>
            </group>

            {/* Colored Breakout Wiring Harness (Blue, Green, Black) */}
            <mesh position={[0.19, 0.06, -0.06]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.12, 8]} />
              <meshStandardMaterial color="#0284c7" roughness={0.4} />
            </mesh>
            <mesh position={[0.21, 0.05, -0.07]} rotation={[0.4, 0.2, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.14, 8]} />
              <meshStandardMaterial color="#16a34a" roughness={0.4} />
            </mesh>
            <mesh position={[0.17, 0.04, -0.08]} rotation={[0.5, -0.1, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 0.16, 8]} />
              <meshStandardMaterial color="#09090b" roughness={0.6} />
            </mesh>

            {/* Dual Articulated Monitor Arms holding the Displays */}
            {/* 17" Master Cine Viewfinder Monitor */}
            <group position={[-0.14, 0.32, 0.02]} rotation={[-0.45, 0, 0]}>
              {/* Support Arm Bracket */}
              <mesh position={[0, -0.16, -0.02]}>
                <cylinderGeometry args={[0.008, 0.008, 0.30, 12]} />
                <primitive object={matAluTrim} attach="material" />
              </mesh>
              <mesh castShadow>
                <boxGeometry args={[0.48, 0.32, 0.03]} />
                <primitive object={matTechnoheadChassis} attach="material" />
              </mesh>
              <mesh position={[0, 0, 0.016]}>
                <planeGeometry args={[0.45, 0.28]} />
                <primitive object={matMonitorScreen} attach="material" />
              </mesh>
              {/* Real-Time ARRI Monitor Ambient Glow */}
              <pointLight position={[0, 0, 0.15]} intensity={1.2} distance={1.6} color="#38bdf8" />
            </group>

            {/* 7" Supertechno 50 Live Kinematics Telemetry Monitor */}
            <group position={[0.26, 0.26, 0.04]} rotation={[-0.45, -0.22, 0]}>
              {/* Support Arm Bracket */}
              <mesh position={[0, -0.14, -0.02]}>
                <cylinderGeometry args={[0.007, 0.007, 0.24, 12]} />
                <primitive object={matAluTrim} attach="material" />
              </mesh>
              <mesh castShadow>
                <boxGeometry args={[0.24, 0.16, 0.02]} />
                <primitive object={matTechnoheadChassis} attach="material" />
              </mesh>
              <mesh position={[0, 0, 0.012]}>
                <planeGeometry args={[0.22, 0.14]} />
                <primitive object={matTelemetryScreen} attach="material" />
              </mesh>
              {/* Real-Time Telemetry Screen Ambient Glow */}
              <pointLight position={[0, 0, 0.12]} intensity={0.9} distance={1.3} color="#00f0ff" />
            </group>
          </group>
        </group>

        {/* Floor Cable Snake leading towards crane track */}
        <mesh position={[-1.2, 0.01, 0.2]} rotation={[-Math.PI / 2, 0, 0.35]}>
          <planeGeometry args={[2.5, 0.06]} />
          <meshBasicMaterial color="#09090b" />
        </mesh>
      </group>

      {/* 2. DOP / HEAD OPERATOR HUMANOID */}
      {!hideHuman && (
        <group position={[0, 0.96, 0]}>
          {/* Pelvis in Work Trousers */}
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.32, 0.18, 0.22]} />
            <primitive object={matPants} attach="material" />
          </mesh>

          {/* Heavy Leather Belt & Steel Buckle */}
          <mesh castShadow position={[0, 0.095, 0]}>
            <boxGeometry args={[0.33, 0.048, 0.228]} />
            <primitive object={matBelt} attach="material" />
          </mesh>
          <mesh position={[0, 0.095, 0.116]}>
            <boxGeometry args={[0.052, 0.042, 0.012]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
          </mesh>

          <group ref={spineRef} position={[0, 0.12, 0]}>
            {/* Main Crew Hoodie / Shirt */}
            <mesh castShadow position={[0, 0.23, 0]}>
              <boxGeometry args={[0.38, 0.42, 0.24]} />
              <primitive object={matShirt} attach="material" />
            </mesh>

            {/* Solid Anatomical Neck */}
            <mesh castShadow position={[0, 0.49, 0]}>
              <cylinderGeometry args={[0.048, 0.052, 0.08, 16]} />
              <primitive object={matSkin} attach="material" />
            </mesh>

            {/* Film Crew Walkie-Talkie on Shoulder */}
            <CineCrewWalkieTalkie radioScreenTexture={radioScreenTexture} />

            {/* All-Access VIP Pass Lanyard */}
            <CrewLanyardPass passTexture={passTexture} />

            {/* Head & Headset */}
            <group ref={headRef} position={[0, 0.54, 0]}>
              <RealisticFaceFeatures
                matSkin={matSkin}
                hasBeard={false}
                matHair={matHairDark}
              />

              {/* Dark Textured Hair */}
              <mesh castShadow position={[0, 0.102, -0.01]}>
                <sphereGeometry args={[0.098, 16, 16]} />
                <primitive object={matHairDark} attach="material" />
              </mesh>

              {/* Cine Broadcast Pro Headset with Boom Mic */}
              <BroadcastHeadsetPro />
            </group>

            {/* Arms with 5-Finger Articulated Hands */}
            <group ref={leftShoulderRef} position={[-0.22, 0.38, 0]}>
              <mesh castShadow position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.054, 0.046, 0.24, 16]} />
                <primitive object={matShirt} attach="material" />
              </mesh>
              <group ref={leftElbowRef} position={[0, -0.25, 0]}>
                <mesh castShadow position={[0, -0.12, 0]}>
                  <cylinderGeometry args={[0.046, 0.038, 0.24, 16]} />
                  <primitive object={matSkin} attach="material" />
                </mesh>
                <group ref={leftHandRef} position={[0, -0.24, 0]} rotation={[0.3, 0, 0.2]}>
                  <ArticulatedCineHand
                    isRight={false}
                    isGlove={true}
                    grip={0.62}
                    matSkin={matSkin}
                    matGlove={matGlove}
                  />
                </group>
              </group>
            </group>

            <group ref={rightShoulderRef} position={[0.22, 0.38, 0]}>
              <mesh castShadow position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.054, 0.046, 0.24, 16]} />
                <primitive object={matShirt} attach="material" />
              </mesh>
              <group ref={rightElbowRef} position={[0, -0.25, 0]}>
                <mesh castShadow position={[0, -0.12, 0]}>
                  <cylinderGeometry args={[0.046, 0.038, 0.24, 16]} />
                  <primitive object={matSkin} attach="material" />
                </mesh>
                <group ref={rightHandRef} position={[0, -0.24, 0]} rotation={[0.3, 0, -0.2]}>
                  <ArticulatedCineHand
                    isRight={true}
                    isGlove={true}
                    grip={0.62}
                    matSkin={matSkin}
                    matGlove={matGlove}
                  />
                </group>
              </group>
            </group>
          </group>

          {/* Legs with Cargo Work Trousers & Boots */}
          <group ref={leftHipRef} position={[-0.12, -0.06, 0]}>
            <mesh castShadow position={[0, -0.20, 0]}>
              <cylinderGeometry args={[0.066, 0.056, 0.40, 16]} />
              <primitive object={matPants} attach="material" />
            </mesh>
            {/* Side Cargo Pocket */}
            <mesh castShadow position={[-0.062, -0.16, 0]}>
              <boxGeometry args={[0.018, 0.11, 0.085]} />
              <primitive object={matPants} attach="material" />
            </mesh>
            <group ref={leftKneeRef} position={[0, -0.40, 0]}>
              <mesh position={[0, 0, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[0.052, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                <primitive object={matPants} attach="material" />
              </mesh>
              <mesh castShadow position={[0, -0.19, 0]}>
                <cylinderGeometry args={[0.055, 0.048, 0.38, 16]} />
                <primitive object={matPants} attach="material" />
              </mesh>
              <WorkSafetyBoots matBoots={matBoots} />
            </group>
          </group>

          <group ref={rightHipRef} position={[0.12, -0.06, 0]}>
            <mesh castShadow position={[0, -0.20, 0]}>
              <cylinderGeometry args={[0.066, 0.056, 0.40, 16]} />
              <primitive object={matPants} attach="material" />
            </mesh>
            {/* Side Cargo Pocket */}
            <mesh castShadow position={[0.062, -0.16, 0]}>
              <boxGeometry args={[0.018, 0.11, 0.085]} />
              <primitive object={matPants} attach="material" />
            </mesh>
            <group ref={rightKneeRef} position={[0, -0.40, 0]}>
              <mesh position={[0, 0, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[0.052, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                <primitive object={matPants} attach="material" />
              </mesh>
              <mesh castShadow position={[0, -0.19, 0]}>
                <cylinderGeometry args={[0.055, 0.048, 0.38, 16]} />
                <primitive object={matPants} attach="material" />
              </mesh>
              <WorkSafetyBoots matBoots={matBoots} />
            </group>
          </group>
        </group>
      )}
    </group>
  );
}

// =============================================================================
// RPM AVATAR CRANE OPERATOR RIGS
// =============================================================================
function RearCraneOperatorRpmRig({
  mode,
  dollyTrack = 0,
  columnElevation = 1.54,
  basePan = 0,
  boomTilt = 0,
  teleExtension = 0,
  animT = 1.0,
  walkTime = 0,
  rpmUrl,
  rpmPresetId
}: {
  mode: CraneOperatorMode;
  dollyTrack: number;
  columnElevation?: number;
  basePan: number;
  boomTilt: number;
  teleExtension?: number;
  animT: number;
  walkTime: number;
  rpmUrl?: string;
  rpmPresetId?: string;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const ikParamsRef = useRef<AvatarIkParams>({
    spinePitch: -0.15,
    shoulderPitch: -0.65,
    elbowAngle: 0.85,
    handPitch: 0.75,
    hipPitch: 0.04,
    kneeBend: 0.08,
    lookUpAngle: -0.22,
    handRollOffset: 0,
    grip: 0.92
  });

  useFrame(() => {
    if (!rootRef.current) return;
    const panRad = THREE.MathUtils.degToRad(-basePan);
    const tiltRad = THREE.MathUtils.degToRad(boomTilt);

    // Dynamic handle grip point on rear safety cage:
    // When boom tilts up (> 12°), upper handlebar (Y_local = +0.32) is at ergonomic waist/chest height.
    // When boom is level or down (<= 12°), lower handlebar (Y_local = -0.16) is at ergonomic chest height.
    const upperHandleWeight = THREE.MathUtils.clamp(((boomTilt || 0) - 8) / 14, 0, 1);
    const rearHandleYLocal = THREE.MathUtils.lerp(-0.16, 0.32, upperHandleWeight);
    const rearLeverArm = 3.74;

    const handleZRot = rearLeverArm * Math.cos(tiltRad) + rearHandleYLocal * Math.sin(tiltRad);
    const handleYRot = rearHandleYLocal * Math.cos(tiltRad) - rearLeverArm * Math.sin(tiltRad);
    const handleWorldY = THREE.MathUtils.clamp((columnElevation || 1.54) + handleYRot, 0.65, 2.15);

    // Operator stance: positioned at ideal arm reach distance (0.34m from handle grip)
    // with safety clamp so operator never clips into crane chassis
    const standDist = 0.34;
    const opRadius = THREE.MathUtils.clamp(handleZRot + standDist, 3.45, 4.15);
    const targetX = -opRadius * Math.sin(panRad);
    const targetZ = (dollyTrack || 0) + opRadius * Math.cos(panRad);
    const targetRotY = Math.PI + panRad;

    const spawnX = -6.5;
    const spawnZ = (dollyTrack || 0) + 7.5;
    const isWalking = mode === 'walking_in' || mode === 'walking_out';

    if (isWalking) {
      const smoothT = animT * animT * (3 - 2 * animT);
      const currentX = THREE.MathUtils.lerp(spawnX, targetX, smoothT);
      const currentZ = THREE.MathUtils.lerp(spawnZ, targetZ, smoothT);
      const stepSin = Math.sin(walkTime);
      rootRef.current.position.set(currentX, Math.abs(stepSin) * 0.045, currentZ);
      const dx = targetX - spawnX;
      const dz = targetZ - spawnZ;
      const walkAngle = Math.atan2(dx, dz) + Math.PI;
      rootRef.current.rotation.y = THREE.MathUtils.lerp(walkAngle, targetRotY, smoothT);
      ikParamsRef.current.grip = 0.35;
    } else {
      rootRef.current.position.set(targetX, 0, targetZ);
      rootRef.current.rotation.y = targetRotY;

      // 🦾 ADAPTIVE ERGONOMIC POSTURE & 2-BONE ANALYTICAL IK
      const targetHipY = 0.93; // Fixed standing hip height - feet strictly on ground Y=0
      const crouchFactor = handleWorldY < 1.35 ? THREE.MathUtils.clamp((1.35 - handleWorldY) / 0.65, 0, 1) : 0;
      const kneeBend = crouchFactor * 0.08;
      const hipPitch = crouchFactor * 0.04;
      const spinePitch = -0.06 - crouchFactor * 0.10;

      const spineLength = 0.41;
      const shoulderForwardZ = -Math.sin(spinePitch) * spineLength;
      const shoulderWorldY = targetHipY + Math.cos(spinePitch) * spineLength;

      // Actual distance from shoulder to handle grip in sagittal plane:
      const actualStandDist = opRadius - handleZRot;
      const deltaZ = Math.max(0.18, actualStandDist - shoulderForwardZ);
      const deltaY = handleWorldY - shoulderWorldY;

      const L1 = 0.28; // Upper arm length
      const L2 = 0.26; // Forearm length
      const rawDist = Math.sqrt(deltaZ * deltaZ + deltaY * deltaY);
      const D = THREE.MathUtils.clamp(rawDist, Math.abs(L1 - L2) + 0.02, L1 + L2 - 0.005);

      // Angle of target line from downward vertical towards forward (+Z):
      const phiTarget = Math.atan2(deltaZ, -deltaY);

      // Law of cosines:
      const cosAlpha = THREE.MathUtils.clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1);
      const alpha = Math.acos(cosAlpha);

      const cosBeta = THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1);
      const beta = Math.acos(cosBeta);

      const shoulderPitch = THREE.MathUtils.clamp(phiTarget - alpha, 0.10, 2.10);
      const elbowAngle = THREE.MathUtils.clamp(Math.PI - beta, 0.20, 2.30);
      const handPitch = THREE.MathUtils.clamp((shoulderPitch + elbowAngle) - Math.PI * 0.5, 0.05, 1.20);

      // Head tracks boom tip, but tilts naturally relative to torso:
      const lookUpAngle = THREE.MathUtils.clamp(-0.16 - (boomTilt * Math.PI / 180) * 0.20 - spinePitch * 0.5, -0.45, 0.35);
      const rollOff = ((teleExtension || 0) / 11.3 - 0.5) * 0.15;

      ikParamsRef.current.hipY = targetHipY;
      ikParamsRef.current.spinePitch = spinePitch;
      ikParamsRef.current.shoulderPitch = shoulderPitch;
      ikParamsRef.current.elbowAngle = elbowAngle;
      ikParamsRef.current.handPitch = handPitch;
      ikParamsRef.current.hipPitch = hipPitch;
      ikParamsRef.current.kneeBend = kneeBend;
      ikParamsRef.current.lookUpAngle = lookUpAngle;
      ikParamsRef.current.handRollOffset = rollOff;
      ikParamsRef.current.grip = 0.92;
    }
  });

  const isWalking = mode === 'walking_in' || mode === 'walking_out';
  const pose = isWalking ? 'walk' : 'crane_rear';

  return (
    <group ref={rootRef}>
      <ReadyPlayerMeAvatar
        url={rpmUrl || 'https://models.readyplayer.me/6460d35a9ae3d45ddfc82bff.glb'}
        presetId={rpmPresetId || 'crane_operator_max'}
        pose={pose}
        ikParams={ikParamsRef.current}
        scale={1.0}
      />
    </group>
  );
}

function FloorDeskRpmOperatorRig({
  mode,
  dollyTrack = 0,
  animT = 1.0,
  walkTime = 0,
  rpmUrl,
  rpmPresetId
}: {
  mode: CraneOperatorMode;
  dollyTrack: number;
  animT: number;
  walkTime: number;
  rpmUrl?: string;
  rpmPresetId?: string;
}) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!rootRef.current) return;
    const spawnX = 7.5;
    const spawnZ = dollyTrack + 4.5;
    const targetX = 3.2;
    const targetZ = dollyTrack + 0.8 + 0.32;
    const isWalking = mode === 'walking_in' || mode === 'walking_out';

    if (isWalking) {
      const smoothT = animT * animT * (3 - 2 * animT);
      const currentX = THREE.MathUtils.lerp(spawnX, targetX, smoothT);
      const currentZ = THREE.MathUtils.lerp(spawnZ, targetZ, smoothT);
      const stepSin = Math.sin(walkTime + 0.5);
      rootRef.current.position.set(currentX, Math.abs(stepSin) * 0.045, currentZ);
      const dx = targetX - spawnX;
      const dz = targetZ - spawnZ;
      const walkAngle = Math.atan2(dx, dz) + Math.PI;
      rootRef.current.rotation.y = THREE.MathUtils.lerp(walkAngle, -Math.PI * 0.65, smoothT);
    } else {
      rootRef.current.position.set(targetX, 0, targetZ);
      rootRef.current.rotation.y = -Math.PI * 0.65;
    }
  });

  const isWalking = mode === 'walking_in' || mode === 'walking_out';
  const pose = isWalking ? 'walk' : 'crane_desk';

  return (
    <group ref={rootRef}>
      <ReadyPlayerMeAvatar
        url={rpmUrl || 'https://models.readyplayer.me/6460d4b39ae3d45ddfc83120.glb'}
        presetId={rpmPresetId || 'dop_elena'}
        pose={pose}
        scale={1.0}
      />
    </group>
  );
}

// =============================================================================
// 🌟 MASTER EXPORT: CRANE OPERATOR CREW (BEIDE OPERATOREN)
// =============================================================================
export function CraneOperatorCrew({
  mode,
  avatarType = 'classic',
  rpmUrl,
  rpmPresetId,
  onArrivedAtControls,
  onExited,
  dollyTrack = 0,
  columnElevation = 1.54,
  basePan = 0,
  boomTilt = 0,
  teleExtension = 0,
  headPan = 0,
  headTilt = 0,
  headRoll = 0
}: CraneOperatorProps) {
  const masterGroupRef = useRef<THREE.Group>(null);
  const animProgress = useRef<number>(0);
  const walkTime = useRef<number>(0);

  useFrame((_, delta) => {
    if (!masterGroupRef.current) return;
    if (mode === 'hidden') {
      masterGroupRef.current.visible = false;
      return;
    }
    masterGroupRef.current.visible = true;

    if (mode === 'walking_in') {
      animProgress.current = Math.min(1.0, animProgress.current + delta * 0.32);
      walkTime.current += delta * 6.8;
      if (animProgress.current >= 1.0 && onArrivedAtControls) {
        onArrivedAtControls();
      }
    } else if (mode === 'walking_out') {
      animProgress.current = Math.max(0.0, animProgress.current - delta * 0.35);
      walkTime.current += delta * 6.8;
      if (animProgress.current <= 0.0 && onExited) {
        onExited();
      }
    } else if (mode === 'operating') {
      animProgress.current = 1.0;
      walkTime.current += delta * 2.0;
    }
  });

  return (
    <group ref={masterGroupRef}>
      {avatarType === 'rpm' ? (
        <>
          {/* 1. RPM Avatar am Heck mit 2-Bone-IK & Hand-Grip */}
          <RearCraneOperatorRpmRig
            mode={mode}
            dollyTrack={dollyTrack}
            columnElevation={columnElevation}
            basePan={basePan}
            boomTilt={boomTilt}
            teleExtension={teleExtension}
            animT={animProgress.current}
            walkTime={walkTime.current}
            rpmUrl={rpmUrl}
            rpmPresetId={rpmPresetId}
          />

          {/* 2. Flightcase Master Desk & Displays (ohne menschliches Mesh) */}
          <FloorControlDeskAndOperatorRig
            mode={mode}
            dollyTrack={dollyTrack}
            columnElevation={columnElevation}
            basePan={basePan}
            boomTilt={boomTilt}
            teleExtension={teleExtension}
            headPan={headPan}
            headTilt={headTilt}
            headRoll={headRoll}
            animT={animProgress.current}
            walkTime={walkTime.current}
            hideHuman={true}
          />

          {/* 3. RPM Avatar am Bodensteuerpult */}
          <FloorDeskRpmOperatorRig
            mode={mode}
            dollyTrack={dollyTrack}
            animT={animProgress.current}
            walkTime={walkTime.current}
            rpmUrl={rpmUrl}
            rpmPresetId={rpmPresetId}
          />
        </>
      ) : (
        <>
          {/* 1. Klassischer Kranführer am Heck */}
          <RearCraneOperatorRig
            mode={mode}
            dollyTrack={dollyTrack}
            columnElevation={columnElevation}
            basePan={basePan}
            boomTilt={boomTilt}
            teleExtension={teleExtension}
            animT={animProgress.current}
            walkTime={walkTime.current}
          />

          {/* 2. Klassischer Remote Head & Kamera-Operator am Bodenpult */}
          <FloorControlDeskAndOperatorRig
            mode={mode}
            dollyTrack={dollyTrack}
            columnElevation={columnElevation}
            basePan={basePan}
            boomTilt={boomTilt}
            teleExtension={teleExtension}
            headPan={headPan}
            headTilt={headTilt}
            headRoll={headRoll}
            animT={animProgress.current}
            walkTime={walkTime.current}
            hideHuman={false}
          />
        </>
      )}
    </group>
  );
}

// Backward-compatible alias
export const CraneOperator = CraneOperatorCrew;
export default CraneOperatorCrew;
