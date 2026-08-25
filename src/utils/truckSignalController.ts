import type { ManTglTruckRig } from '../model/manTglTruckRig';

/**
 * 🚨 Subagent 22.15: `truck_turn_signals` (Fahrtrichtungsanzeiger, Warnblinkanlage & Relais Master)
 * 
 * Normen & Spezifikationen:
 * - ECE-R48 Richtlinien für Fahrzeug-Signalanlagen:
 *   - Blinkfrequenz: 1.5 Hz (90 Impulse/Minute ± 30)
 *   - Hell-/Dunkelverhältnis: 50% / 50%
 *   - Lichtfarbe: Amber / Blinker-Orange (#ff8800 / #ff9900)
 * - Unterstützte Betriebsmodi:
 *   - 'off': Signalanlage inaktiv (Standby)
 *   - 'left': Fahrtrichtungsanzeiger links (Front-LED, Seitenblinker Radkasten, 7-Kammer Heckleuchte)
 *   - 'right': Fahrtrichtungsanzeiger rechts (Front-LED, Seitenblinker Radkasten, 7-Kammer Heckleuchte)
 *   - 'hazard': Warnblinkanlage synchron alle 4 Ecken + Ladebordwand-Eckleuchten
 */

export type BlinkerMode = 'off' | 'left' | 'right' | 'hazard';

export interface BlinkerState {
  mode: BlinkerMode;
  isLeftOn: boolean;
  isRightOn: boolean;
  isHazardOn: boolean;
  flashPhase: number;
}

export class TruckSignalController {
  private mode: BlinkerMode = 'off';
  private readonly frequencyHz: number = 1.5; // 90 Blinks / Minute

  constructor(initialMode: BlinkerMode = 'off') {
    this.mode = initialMode;
  }

  public setMode(mode: BlinkerMode) {
    this.mode = mode;
  }

  public getMode(): BlinkerMode {
    return this.mode;
  }

  public toggleMode(targetMode: BlinkerMode) {
    if (this.mode === targetMode) {
      this.mode = 'off';
    } else {
      this.mode = targetMode;
    }
    return this.mode;
  }

  /**
   * Berechnet den aktuellen Phasen- und Einschaltzustand der Blinkleuchten
   */
  public evaluate(elapsedTime: number): BlinkerState {
    const cycleTime = 1.0 / this.frequencyHz; // ~0.667s pro Zyklus
    const phaseInCycle = (elapsedTime % cycleTime) / cycleTime; // 0.0 bis 1.0
    const isLampLit = phaseInCycle < 0.52; // 52% Hellphase nach ECE-R48

    let isLeftOn = false;
    let isRightOn = false;
    let isHazardOn = false;

    switch (this.mode) {
      case 'left':
        isLeftOn = isLampLit;
        break;
      case 'right':
        isRightOn = isLampLit;
        break;
      case 'hazard':
        isLeftOn = isLampLit;
        isRightOn = isLampLit;
        isHazardOn = isLampLit;
        break;
      case 'off':
      default:
        isLeftOn = false;
        isRightOn = false;
        isHazardOn = false;
        break;
    }

    return {
      mode: this.mode,
      isLeftOn,
      isRightOn,
      isHazardOn,
      flashPhase: phaseInCycle,
    };
  }

  /**
   * Aktualisiert alle 3D-Blinkermaterialien am LKW-Rig in Echtzeit
   */
  public updateRig(rig: ManTglTruckRig, elapsedTime: number, platformActive: boolean = false): BlinkerState {
    const state = this.evaluate(elapsedTime);
    const emHigh = 5.5; // Gleichmäßig ultra-intensiver LED-Blinker-Glow (Front & Heck)
    const emLow = 0.0;

    // 1. Front-Hauptblinker, Front-Eckblinker & Radkasten-Seitenblinker
    rig.frontBlinkerMatL.emissiveIntensity = state.isLeftOn ? emHigh : emLow;
    rig.frontBlinkerMatR.emissiveIntensity = state.isRightOn ? emHigh : emLow;

    // 2. 7-Kammer-Heckleuchten Blinker
    rig.rearBlinkerMatL.emissiveIntensity = state.isLeftOn ? emHigh : emLow;
    rig.rearBlinkerMatR.emissiveIntensity = state.isRightOn ? emHigh : emLow;

    // 3. Dynamische Front- & Heckblinker-PointLights für sichtbare Umgebungs-Ausleuchtung
    if (rig.frontBlinkerLightL) {
      rig.frontBlinkerLightL.intensity = state.isLeftOn ? 8.5 : 0.0;
    }
    if (rig.frontBlinkerLightR) {
      rig.frontBlinkerLightR.intensity = state.isRightOn ? 8.5 : 0.0;
    }
    if (rig.rearBlinkerLightL) {
      rig.rearBlinkerLightL.intensity = state.isLeftOn ? 7.0 : 0.0;
    }
    if (rig.rearBlinkerLightR) {
      rig.rearBlinkerLightR.intensity = state.isRightOn ? 7.0 : 0.0;
    }

    // 4. Sicherheits-Blinker an den Ecken der Ladebordwand
    if (state.isHazardOn || platformActive) {
      const isPlatformBlink = (elapsedTime % 0.4) < 0.22; // Schnelleres Warnblinken an der Ladebordwand
      rig.tailgateBlinkerMat.emissiveIntensity = isPlatformBlink ? 3.8 : 0.2;
    } else {
      rig.tailgateBlinkerMat.emissiveIntensity = 0.0;
    }

    return state;
  }
}
