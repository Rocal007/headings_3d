import { useRef } from 'react';

export interface PerformanceSnapshot {
  fps: number;
  frameMs: number;
  qualityGrade: 'optimal' | 'good' | 'heavy';
}

export function usePerformanceMetrics(onUpdate?: (metrics: PerformanceSnapshot) => void) {
  const perfRef = useRef({
    frameCount: 0,
    lastSampleTime: performance.now(),
    accumulatedDelta: 0,
    currentFps: 60,
    currentMs: 16.6
  });

  const recordFrame = (delta: number) => {
    const p = perfRef.current;
    p.frameCount++;
    p.accumulatedDelta += delta;

    const now = performance.now();
    const elapsed = now - p.lastSampleTime;

    if (elapsed >= 400) {
      const realFps = (p.frameCount / elapsed) * 1000;
      const smoothFps = Math.round(realFps * 10) / 10;
      const frameMs = Math.round((elapsed / Math.max(1, p.frameCount)) * 10) / 10;
      
      p.currentFps = smoothFps;
      p.currentMs = frameMs;
      p.frameCount = 0;
      p.accumulatedDelta = 0;
      p.lastSampleTime = now;

      if (onUpdate) {
        const qualityGrade: 'optimal' | 'good' | 'heavy' = smoothFps >= 55 ? 'optimal' : smoothFps >= 38 ? 'good' : 'heavy';
        onUpdate({
          fps: smoothFps,
          frameMs,
          qualityGrade
        });
      }
    }
  };

  return { recordFrame, perfRef };
}
