import { useState, useEffect, useCallback } from 'react';
import type { MatchScore } from '../components/TennisScoreboardHUD';

/**
 * ============================================================================
 * TENNIS MATCH ENGINE & STATE MACHINE (AGENT 13 / 17 / 18)
 * Kapselung der gesamten Tennis-Spiellogik, Sätze, Games, Punkte und Tiebreaks
 * ============================================================================
 */

export const INITIAL_MATCH_SCORE: MatchScore = {
  p1Points: 15,
  p2Points: 30,
  p1Games: 4,
  p2Games: 3,
  p1Sets: 1,
  p2Sets: 1,
  setHistory: [
    { p1: 6, p2: 4 },
    { p1: 4, p2: 6 }
  ],
  currentSet: 3,
  isTiebreak: false,
  p1TiebreakPoints: 0,
  p2TiebreakPoints: 0,
  server: 1,
  serveAttempt: 1,
  matchTimeSeconds: 6505, // 1h 48m 25s
  lastMessage: '🏆 3. ENTSCHEIDUNGSSATZ: Sinner serviert bei 15-30 (4:3)!',
  umpireCall: '15 - 30 (4:3)',
  rallyCount: 4,
  isCheering: false,
  cheerIntensity: 0.0
};

export function useTennisMatchEngine() {
  const [matchScore, setMatchScore] = useState<MatchScore>(INITIAL_MATCH_SCORE);
  const [manualResetTrigger, setManualResetTrigger] = useState(0);

  // ⏱️ Real-time Match Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setMatchScore(s => ({
        ...s,
        matchTimeSeconds: (s.matchTimeSeconds || 0) + 1
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const restartMatch = useCallback(() => {
    setManualResetTrigger(n => n + 1);
    setMatchScore({
      p1Points: 0,
      p2Points: 0,
      p1Games: 0,
      p2Games: 0,
      p1Sets: 0,
      p2Sets: 0,
      setHistory: [],
      currentSet: 1,
      isTiebreak: false,
      p1TiebreakPoints: 0,
      p2TiebreakPoints: 0,
      server: 1,
      serveAttempt: 1,
      matchTimeSeconds: 0,
      lastMessage: '🏆 ARENA INTRO: 11.3m Ausleger-Show • Matchstart!',
      umpireCall: 'Love-All (0:0)',
      rallyCount: 0,
      isCheering: false,
      cheerIntensity: 0.0
    });
  }, []);

  return {
    matchScore,
    setMatchScore,
    manualResetTrigger,
    setManualResetTrigger,
    restartMatch
  };
}
