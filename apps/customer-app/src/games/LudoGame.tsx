'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GameProps } from './registry';
import {
  RotateCcw,
  Dices,
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Users,
  Star,
  Crown,
  HelpCircle,
  Flame,
  CheckCircle2,
} from 'lucide-react';

/* =========================================================================
   1. SOUND SYNTHESIS ENGINE (Pure Web Audio API - Zero External Files)
   ========================================================================= */
function playSound(type: 'dice' | 'move' | 'safe' | 'capture' | 'win', enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'dice') {
      [0, 0.07, 0.14, 0.22, 0.32].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 4 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(idx === 4 ? 140 : 380 + Math.random() * 220, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + (idx === 4 ? 0.15 : 0.04));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.16);
      });
    } else if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === 'safe') {
      [587.33, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.22);
      });
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.36);
      });
    }
  } catch {
    // Ignore audio error if user blocked audio context
  }
}

/* =========================================================================
   2. MATHEMATICAL 15x15 LUDO BOARD COORDINATES & RULES
   ========================================================================= */
export interface PlayerConfig {
  id: number;
  name: string;
  seatLabel: string;
  tableSide: 'Side 1' | 'Side 2';
  color: string;
  textColor: string;
  bgGlow: string;
  borderColor: string;
  badgeHex: string;
  startTrackIdx: number;
  homeRow: number;
  homeColStart: number;
  homeColDir: 1 | -1;
  homeOrientation: 'horizontal' | 'vertical';
}

export const PLAYERS_METADATA: PlayerConfig[] = [
  {
    id: 0,
    name: 'Red Seat',
    seatLabel: 'Seat 1 (West)',
    tableSide: 'Side 1',
    color: 'bg-rose-500',
    textColor: 'text-rose-400',
    bgGlow: 'shadow-rose-500/30 ring-rose-500',
    borderColor: 'border-rose-500',
    badgeHex: '#f43f5e',
    startTrackIdx: 0,
    homeRow: 7,
    homeColStart: 1,
    homeColDir: 1,
    homeOrientation: 'horizontal',
  },
  {
    id: 1,
    name: 'Green Seat',
    seatLabel: 'Seat 2 (North)',
    tableSide: 'Side 1',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    bgGlow: 'shadow-emerald-500/30 ring-emerald-500',
    borderColor: 'border-emerald-500',
    badgeHex: '#10b981',
    startTrackIdx: 39,
    homeRow: 1,
    homeColStart: 7,
    homeColDir: 1,
    homeOrientation: 'vertical',
  },
  {
    id: 2,
    name: 'Yellow Seat',
    seatLabel: 'Seat 3 (East)',
    tableSide: 'Side 2',
    color: 'bg-amber-500',
    textColor: 'text-amber-400',
    bgGlow: 'shadow-amber-500/30 ring-amber-500',
    borderColor: 'border-amber-500',
    badgeHex: '#f59e0b',
    startTrackIdx: 26,
    homeRow: 7,
    homeColStart: 13,
    homeColDir: -1,
    homeOrientation: 'horizontal',
  },
  {
    id: 3,
    name: 'Blue Seat',
    seatLabel: 'Seat 4 (South)',
    tableSide: 'Side 2',
    color: 'bg-sky-500',
    textColor: 'text-sky-400',
    bgGlow: 'shadow-sky-500/30 ring-sky-500',
    borderColor: 'border-sky-500',
    badgeHex: '#0284c7',
    startTrackIdx: 13,
    homeRow: 13,
    homeColStart: 7,
    homeColDir: -1,
    homeOrientation: 'vertical',
  },
];

// 52 Common Track Cells in clockwise sequence starting from Red's entry square (8, 1)
const TRACK_CELLS: [number, number][] = [
  [8, 1],  [8, 2],  [8, 3],  [8, 4],  [8, 5],
  [9, 6],  [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7],
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9],  [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14],
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8],  [4, 8],  [3, 8],  [2, 8],  [1, 8],  [0, 8],
  [0, 7],
  [0, 6],  [1, 6],  [2, 6],  [3, 6],  [4, 6],  [5, 6],
  [6, 5],  [6, 4],  [6, 3],  [6, 2],  [6, 1],  [6, 0],
  [7, 0],
  [8, 0],
];

// Safe Star Coordinates (Tokens cannot be captured here)
const SAFE_STAR_COORDS: [number, number][] = [
  [8, 1],  // Red Start
  [12, 6], // Bottom Star
  [13, 8], // Blue Start
  [8, 12], // Right Star
  [6, 13], // Yellow Start
  [2, 8],  // Top Star
  [1, 6],  // Green Start
  [6, 2],  // Left Star
];

function isSafeSquare(r: number, c: number): boolean {
  return SAFE_STAR_COORDS.some(([sr, sc]) => sr === r && sc === c);
}

// Convert step index (0-56) to (row, col) coordinates
function getCoordinatesForStep(playerIdx: number, step: number): [number, number] {
  if (step < 0) return [-1, -1]; // in yard

  // Step 0 to 50: on common 52-cell track
  if (step <= 50) {
    const trackIndex = (PLAYERS_METADATA[playerIdx].startTrackIdx + step) % 52;
    return TRACK_CELLS[trackIndex];
  }

  // Step 51 to 55: Home straight (5 colored cells)
  const homeOffset = step - 51; // 0..4
  if (playerIdx === 0) {
    // Red home straight: row 7, cols 1..5
    return [7, 1 + homeOffset];
  } else if (playerIdx === 1) {
    // Green home straight: col 7, rows 1..5
    return [1 + homeOffset, 7];
  } else if (playerIdx === 2) {
    // Yellow home straight: row 7, cols 13..9
    return [7, 13 - homeOffset];
  } else {
    // Blue home straight: col 7, rows 13..9
    return [13 - homeOffset, 7];
  }
}

interface LudoToken {
  id: number;
  playerIdx: number;
  step: number; // -1 = Yard, 0..50 = Common Track, 51..55 = Home Run, 56 = Home Completed
}

/* =========================================================================
   3. 3D TACTILE DICE COMPONENT WITH REAL PIP DOTS
   ========================================================================= */
const DiceFace: React.FC<{ value: number | null; isRolling: boolean; colorHex?: string }> = ({
  value,
  isRolling,
}) => {
  const displayVal = value || 1;

  // Dot positions for 1 through 6
  const renderDots = () => {
    switch (displayVal) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 shadow-md ring-1 ring-rose-400" />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1.5">
            <div className="flex justify-start"><span className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-sm" /></div>
            <div className="flex justify-end"><span className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-sm" /></div>
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1.5">
            <div className="flex justify-start"><span className="w-2.5 h-2.5 rounded-full bg-slate-900" /></div>
            <div className="flex justify-center"><span className="w-2.5 h-2.5 rounded-full bg-slate-900" /></div>
            <div className="flex justify-end"><span className="w-2.5 h-2.5 rounded-full bg-slate-900" /></div>
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1.5">
            <div className="flex justify-between">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            </div>
            <div className="flex justify-between">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1.5">
            <div className="flex justify-between">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            </div>
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-sm" />
            </div>
            <div className="flex justify-between">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1.5">
            <div className="flex justify-between">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            </div>
            <div className="flex justify-between">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            </div>
            <div className="flex justify-between">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-white via-slate-100 to-slate-200 border-2 border-slate-300 shadow-2xl flex items-center justify-center relative transition-all duration-300 ${
        isRolling ? 'animate-bounce rotate-180 scale-110' : 'hover:scale-105'
      }`}
      style={{
        boxShadow: '0 8px 20px -2px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.9)',
      }}
    >
      {renderDots()}
    </div>
  );
};

/* =========================================================================
   4. MAIN DELUXE LUDO TABLETOP COMPONENT
   ========================================================================= */
export const LudoGame: React.FC<GameProps> = ({ promotion, onExit, onWin }) => {
  // Game Configuration State
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [tokensPerPlayer, setTokensPerPlayer] = useState<number>(2); // 2 = Speed Dining Mode, 4 = Classic
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreenTable, setIsFullscreenTable] = useState<boolean>(false);
  const [boardScale, setBoardScale] = useState<'standard' | 'large' | 'giant'>('large');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Active Play State
  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollingStation, setRollingStation] = useState<'side1' | 'side2' | null>(null);
  const [movableTokenIds, setMovableTokenIds] = useState<number[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameLog, setGameLog] = useState<string>('Game started! Side 1 (Red Seat), roll your dice.');
  const [consecutiveSixes, setConsecutiveSixes] = useState<number>(0);

  // Initialize Tokens
  const [tokens, setTokens] = useState<LudoToken[]>(() => {
    const initial: LudoToken[] = [];
    for (let p = 0; p < 4; p++) {
      for (let t = 0; t < 4; t++) {
        initial.push({ id: t, playerIdx: p, step: -1 });
      }
    }
    return initial;
  });

  const fullScreenRef = useRef<HTMLDivElement>(null);

  // Toggle Native Fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreenTable) {
      setIsFullscreenTable(true);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreenTable(false);
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Check which tokens can move for the active player with current dice value
  const getEligibleMovableTokens = (pIdx: number, roll: number): number[] => {
    const playerTokens = tokens.filter((t) => t.playerIdx === pIdx && t.id < tokensPerPlayer);
    const eligible: number[] = [];

    playerTokens.forEach((t) => {
      if (t.step === -1) {
        // Can enter track only on a 6
        if (roll === 6) eligible.push(t.id);
      } else if (t.step >= 0 && t.step < 56) {
        // Can move if does not overshoot 56
        if (t.step + roll <= 56) {
          eligible.push(t.id);
        }
      }
    });

    return eligible;
  };

  // Roll Dice Handler from either Side 1 or Side 2 Controller
  const handleRollDice = (station: 'side1' | 'side2') => {
    if (isRolling || winner) return;

    // Check if it is this side's turn (or allow casual override)
    const activePlayerSide = PLAYERS_METADATA[currentPlayer].tableSide;
    const requestedSide = station === 'side1' ? 'Side 1' : 'Side 2';

    if (activePlayerSide !== requestedSide) {
      setGameLog(`⚠️ It is currently ${PLAYERS_METADATA[currentPlayer].name}'s turn on ${activePlayerSide}!`);
      return;
    }

    setIsRolling(true);
    setRollingStation(station);
    setMovableTokenIds([]);
    playSound('dice', soundEnabled);

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      setRollingStation(null);

      const eligible = getEligibleMovableTokens(currentPlayer, rolled);

      if (eligible.length === 0) {
        // No moves possible
        setGameLog(
          `${PLAYERS_METADATA[currentPlayer].name} rolled a ${rolled}. No valid moves available. Passing turn.`
        );
        setTimeout(() => {
          advanceToNextTurn(false);
        }, 1200);
      } else if (eligible.length === 1) {
        // Only 1 token can move -> automatic swift move
        setGameLog(`${PLAYERS_METADATA[currentPlayer].name} rolled a ${rolled}! Moving token...`);
        setTimeout(() => {
          executeMoveToken(currentPlayer, eligible[0], rolled);
        }, 400);
      } else {
        // Multiple choices -> highlight movable tokens for tap
        setMovableTokenIds(eligible);
        setGameLog(
          `🎯 ${PLAYERS_METADATA[currentPlayer].name} rolled a ${rolled}! Tap one of your highlighted tokens to move.`
        );
      }
    }, 600);
  };

  // Move Token Execution
  const executeMoveToken = (pIdx: number, tokenId: number, roll: number) => {
    playSound('move', soundEnabled);
    setMovableTokenIds([]);

    setTokens((prev) => {
      const next = prev.map((t) => ({ ...t }));
      const targetToken = next.find((t) => t.playerIdx === pIdx && t.id === tokenId);
      if (!targetToken) return prev;

      if (targetToken.step === -1 && roll === 6) {
        // Token enters the track at step 0
        targetToken.step = 0;
        setGameLog(`🚀 ${PLAYERS_METADATA[pIdx].name} brought Token #${tokenId + 1} onto the track!`);
      } else {
        targetToken.step = Math.min(56, targetToken.step + roll);
      }

      // Check capture of opponent's token if on common track
      let capturedOpponent = false;
      if (targetToken.step >= 0 && targetToken.step <= 50) {
        const [targetRow, targetCol] = getCoordinatesForStep(pIdx, targetToken.step);
        if (!isSafeSquare(targetRow, targetCol)) {
          next.forEach((opp) => {
            if (opp.playerIdx !== pIdx && opp.step >= 0 && opp.step <= 50) {
              const [oppRow, oppCol] = getCoordinatesForStep(opp.playerIdx, opp.step);
              if (oppRow === targetRow && oppCol === targetCol) {
                // Captured!
                opp.step = -1;
                capturedOpponent = true;
                playSound('capture', soundEnabled);
                setGameLog(
                  `💥 BOOM! ${PLAYERS_METADATA[pIdx].name} captured ${PLAYERS_METADATA[opp.playerIdx].name}'s token! Bonus roll awarded!`
                );
              }
            }
          });
        } else {
          playSound('safe', soundEnabled);
        }
      }

      // Check Win Condition
      const activePlayerTokens = next.filter((t) => t.playerIdx === pIdx && t.id < tokensPerPlayer);
      const allFinished = activePlayerTokens.every((t) => t.step === 56);

      if (allFinished && !winner) {
        setWinner(PLAYERS_METADATA[pIdx].name);
        playSound('win', soundEnabled);
        setGameLog(`👑 VICTORY! ${PLAYERS_METADATA[pIdx].name} won the Atif & Abdullah Foods Ludo Match!`);
        if (onWin && promotion?.active) {
          onWin(100, promotion.code);
        }
        return next;
      }

      // Determine next turn
      const getsBonusRoll = roll === 6 || capturedOpponent;
      if (getsBonusRoll && consecutiveSixes < 2) {
        setConsecutiveSixes((prevCount) => prevCount + 1);
        setGameLog((prev) => `${prev} 🎉 Bonus turn awarded! Roll again.`);
      } else {
        setConsecutiveSixes(0);
        advanceToNextTurn(false);
      }

      return next;
    });
  };

  const advanceToNextTurn = (wasBonusRoll: boolean) => {
    if (wasBonusRoll) return;
    setMovableTokenIds([]);
    setCurrentPlayer((prev) => (prev + 1) % playerCount);
  };

  const handleResetGame = () => {
    setCurrentPlayer(0);
    setDiceValue(null);
    setIsRolling(false);
    setWinner(null);
    setMovableTokenIds([]);
    setConsecutiveSixes(0);
    setGameLog('Match restarted! Side 1 (Red Seat), your turn to roll.');
    setTokens((prev) => prev.map((t) => ({ ...t, step: -1 })));
  };

  // Size styling classes for the board
  const boardSizeStyles = {
    standard: 'w-[360px] h-[360px] md:w-[440px] md:h-[440px]',
    large: 'w-[420px] h-[420px] md:w-[540px] md:h-[540px]',
    giant: 'w-[480px] h-[480px] md:w-[680px] md:h-[680px]',
  }[boardScale];

  return (
    <div
      ref={fullScreenRef}
      className={`w-full select-none transition-all duration-300 ${
        isFullscreenTable
          ? 'fixed inset-0 z-50 bg-[#070b14] p-3 md:p-6 overflow-y-auto flex flex-col justify-between'
          : 'relative space-y-4'
      }`}
    >
      {/* 1. TOP UTILITY & BRANDING BAR */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 via-amber-500 to-sky-600 flex items-center justify-center shadow-lg shadow-rose-600/20 text-white font-black">
            <Dices className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-wide">
                Ludo Tabletop Deluxe
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Atif & Abdullah Foods
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Dual-Controller Interactive Dining Table Board Game
            </p>
          </div>
        </div>

        {/* Action Controls: Size Switcher, Fullscreen Toggle, Sound, Reset, Rules */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Board Scale Switcher */}
          <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1 text-[11px]">
            <button
              onClick={() => setBoardScale('standard')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                boardScale === 'standard' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact View"
            >
              Standard
            </button>
            <button
              onClick={() => setBoardScale('large')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                boardScale === 'large' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Expanded View"
            >
              Large
            </button>
            <button
              onClick={() => setBoardScale('giant')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                boardScale === 'giant' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Giant 32-inch Full Screen Tabletop"
            >
              Giant 32"
            </button>
          </div>

          {/* Fullscreen Expand / Restore Button (User request 1) */}
          <button
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isFullscreenTable
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-600/30'
            }`}
          >
            {isFullscreenTable ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span>⛶ Enlarge Screen (Full Table)</span>
              </>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs transition-all ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Sound On' : 'Sound Muted'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Rules Modal */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all"
            title="Ludo Rules"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Reset Button */}
          <button
            onClick={handleResetGame}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all"
            title="Restart Match"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Exit Game */}
          {onExit && (
            <button
              onClick={onExit}
              className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition-all"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* 2. MATCH PREFERENCES & LIVE TURN BANNER */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-2 text-xs">
        {/* Player Count & Token Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-400">Players:</span>
            {[2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                onClick={() => {
                  setPlayerCount(cnt);
                  handleResetGame();
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  playerCount === cnt ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {cnt}P
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400">Tokens:</span>
            <button
              onClick={() => {
                setTokensPerPlayer(2);
                handleResetGame();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                tokensPerPlayer === 2 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              2 Fast
            </button>
            <button
              onClick={() => {
                setTokensPerPlayer(4);
                handleResetGame();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                tokensPerPlayer === 4 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              4 Classic
            </button>
          </div>
        </div>

        {/* Live Active Turn Indicator */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-1 rounded-xl">
          <div
            className={`w-3 h-3 rounded-full ${PLAYERS_METADATA[currentPlayer].color} animate-ping`}
          />
          <span className="text-slate-400 font-bold text-[11px]">Current Turn:</span>
          <span className={`font-black text-xs ${PLAYERS_METADATA[currentPlayer].textColor}`}>
            {PLAYERS_METADATA[currentPlayer].name} • {PLAYERS_METADATA[currentPlayer].seatLabel}
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {PLAYERS_METADATA[currentPlayer].tableSide}
          </span>
        </div>
      </div>

      {/* 3. DUAL-CONTROLLER GAMING SURFACE: SIDE 1 CONTROLLER + GIANT BOARD + SIDE 2 CONTROLLER */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 my-auto">
        {/* =========================================================================
            DICE CONTROLLER 1: TABLE SIDE 1 (WEST / NORTH - SEATS 1 & 2: RED / GREEN)
            ========================================================================= */}
        <div
          className={`w-full lg:w-60 bg-slate-900/95 border-2 rounded-3xl p-4 shadow-2xl flex flex-col justify-between space-y-3 transition-all duration-300 ${
            PLAYERS_METADATA[currentPlayer].tableSide === 'Side 1' && !winner
              ? 'border-rose-500 shadow-rose-500/20 ring-4 ring-rose-500/30'
              : 'border-slate-800/80 opacity-85'
          }`}
        >
          {/* Station Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                Table Side 1 Controller
              </span>
              <span className="text-xs font-bold text-white">Seats 1 & 2 (Red & Green)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" title="Red Seat" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" title="Green Seat" />
            </div>
          </div>

          {/* Turn Prompt or Status */}
          <div className="text-center py-1">
            {PLAYERS_METADATA[currentPlayer].tableSide === 'Side 1' && !winner ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black animate-pulse">
                👉 YOUR TURN TO ROLL!
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">Waiting for Side 2...</span>
            )}
          </div>

          {/* 3D Tactile Dice Display */}
          <div className="flex items-center justify-center py-2">
            <DiceFace
              value={PLAYERS_METADATA[currentPlayer].tableSide === 'Side 1' ? diceValue : null}
              isRolling={isRolling && rollingStation === 'side1'}
            />
          </div>

          {/* Roll Button for Side 1 */}
          <button
            onClick={() => handleRollDice('side1')}
            disabled={isRolling || !!winner}
            className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl ${
              PLAYERS_METADATA[currentPlayer].tableSide === 'Side 1' && !winner
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Dices className={`h-4 w-4 ${isRolling && rollingStation === 'side1' ? 'animate-spin' : ''}`} />
            <span>{isRolling && rollingStation === 'side1' ? 'Rolling Dice...' : 'Roll Dice (Side 1)'}</span>
          </button>
        </div>

        {/* =========================================================================
            CENTERPIECE: AUTHENTIC 15x15 HIGH-FIDELITY LUDO BOARD
            ========================================================================= */}
        <div
          className={`${boardSizeStyles} aspect-square bg-[#0e1422] border-4 border-slate-700/80 rounded-3xl p-2.5 shadow-2xl relative select-none`}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* 15x15 Grid Layout */}
          <div
            className="w-full h-full gap-0.5 bg-slate-900 rounded-2xl overflow-hidden relative"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
            }}
          >
            {/* 1. GREEN YARD (Top-Left: Rows 0..5, Cols 0..5) */}
            <div
              style={{ gridRow: '1 / span 6', gridColumn: '1 / span 6' }}
              className="bg-emerald-600/90 border-2 border-emerald-400/40 p-2 md:p-3 flex flex-col justify-between rounded-tl-2xl shadow-inner relative"
            >
              <div className="flex items-center justify-between text-white font-black text-[10px] md:text-xs">
                <span>Green Base</span>
                <span className="text-[9px] bg-emerald-800/80 px-1.5 py-0.5 rounded">Seat 2</span>
              </div>
              {/* White Courtyard with 4 Token Pedestals */}
              <div className="w-full h-4/5 bg-white/95 rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].slice(0, tokensPerPlayer).map((tId) => {
                  const token = tokens.find((t) => t.playerIdx === 1 && t.id === tId);
                  const inYard = token?.step === -1;
                  const isMovable = movableTokenIds.includes(tId) && currentPlayer === 1;

                  return (
                    <button
                      key={tId}
                      onClick={() => isMovable && executeMoveToken(1, tId, diceValue!)}
                      disabled={!isMovable}
                      className={`rounded-full border-2 border-emerald-500/50 flex items-center justify-center transition-all ${
                        inYard
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-emerald-100 text-emerald-300'
                      } ${isMovable ? 'ring-4 ring-emerald-400 animate-bounce cursor-pointer' : ''}`}
                    >
                      {inYard && (
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-600 border border-white text-white text-[10px] font-black flex items-center justify-center shadow">
                          G{tId + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. YELLOW YARD (Top-Right: Rows 0..5, Cols 10..15) */}
            <div
              style={{ gridRow: '1 / span 6', gridColumn: '10 / span 6' }}
              className="bg-amber-500/90 border-2 border-amber-300/40 p-2 md:p-3 flex flex-col justify-between rounded-tr-2xl shadow-inner relative"
            >
              <div className="flex items-center justify-between text-slate-950 font-black text-[10px] md:text-xs">
                <span>Yellow Base</span>
                <span className="text-[9px] bg-amber-700/80 text-white px-1.5 py-0.5 rounded">Seat 3</span>
              </div>
              <div className="w-full h-4/5 bg-white/95 rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].slice(0, tokensPerPlayer).map((tId) => {
                  const token = tokens.find((t) => t.playerIdx === 2 && t.id === tId);
                  const inYard = token?.step === -1;
                  const isMovable = movableTokenIds.includes(tId) && currentPlayer === 2;

                  return (
                    <button
                      key={tId}
                      onClick={() => isMovable && executeMoveToken(2, tId, diceValue!)}
                      disabled={!isMovable}
                      className={`rounded-full border-2 border-amber-500/50 flex items-center justify-center transition-all ${
                        inYard
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-amber-100 text-amber-300'
                      } ${isMovable ? 'ring-4 ring-amber-400 animate-bounce cursor-pointer' : ''}`}
                    >
                      {inYard && (
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-600 border border-white text-slate-950 text-[10px] font-black flex items-center justify-center shadow">
                          Y{tId + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. RED YARD (Bottom-Left: Rows 10..15, Cols 0..5) */}
            <div
              style={{ gridRow: '10 / span 6', gridColumn: '1 / span 6' }}
              className="bg-rose-600/90 border-2 border-rose-400/40 p-2 md:p-3 flex flex-col justify-between rounded-bl-2xl shadow-inner relative"
            >
              <div className="flex items-center justify-between text-white font-black text-[10px] md:text-xs">
                <span>Red Base</span>
                <span className="text-[9px] bg-rose-800/80 px-1.5 py-0.5 rounded">Seat 1</span>
              </div>
              <div className="w-full h-4/5 bg-white/95 rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].slice(0, tokensPerPlayer).map((tId) => {
                  const token = tokens.find((t) => t.playerIdx === 0 && t.id === tId);
                  const inYard = token?.step === -1;
                  const isMovable = movableTokenIds.includes(tId) && currentPlayer === 0;

                  return (
                    <button
                      key={tId}
                      onClick={() => isMovable && executeMoveToken(0, tId, diceValue!)}
                      disabled={!isMovable}
                      className={`rounded-full border-2 border-rose-500/50 flex items-center justify-center transition-all ${
                        inYard
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-rose-100 text-rose-300'
                      } ${isMovable ? 'ring-4 ring-rose-400 animate-bounce cursor-pointer' : ''}`}
                    >
                      {inYard && (
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-rose-600 border border-white text-white text-[10px] font-black flex items-center justify-center shadow">
                          R{tId + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. BLUE YARD (Bottom-Right: Rows 10..15, Cols 10..15) */}
            <div
              style={{ gridRow: '10 / span 6', gridColumn: '10 / span 6' }}
              className="bg-sky-600/90 border-2 border-sky-400/40 p-2 md:p-3 flex flex-col justify-between rounded-br-2xl shadow-inner relative"
            >
              <div className="flex items-center justify-between text-white font-black text-[10px] md:text-xs">
                <span>Blue Base</span>
                <span className="text-[9px] bg-sky-800/80 px-1.5 py-0.5 rounded">Seat 4</span>
              </div>
              <div className="w-full h-4/5 bg-white/95 rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].slice(0, tokensPerPlayer).map((tId) => {
                  const token = tokens.find((t) => t.playerIdx === 3 && t.id === tId);
                  const inYard = token?.step === -1;
                  const isMovable = movableTokenIds.includes(tId) && currentPlayer === 3;

                  return (
                    <button
                      key={tId}
                      onClick={() => isMovable && executeMoveToken(3, tId, diceValue!)}
                      disabled={!isMovable}
                      className={`rounded-full border-2 border-sky-500/50 flex items-center justify-center transition-all ${
                        inYard
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-sky-100 text-sky-300'
                      } ${isMovable ? 'ring-4 ring-sky-400 animate-bounce cursor-pointer' : ''}`}
                    >
                      {inYard && (
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-sky-600 border border-white text-white text-[10px] font-black flex items-center justify-center shadow">
                          B{tId + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. CENTERPIECE HOME TRIANGLE (Rows 6..8, Cols 6..8) */}
            <div
              style={{ gridRow: '7 / span 3', gridColumn: '7 / span 3' }}
              className="bg-slate-950 border-2 border-amber-400/60 rounded-xl relative flex items-center justify-center overflow-hidden shadow-2xl"
            >
              {/* 4 Colored Triangular Insets */}
              <div className="absolute inset-0">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Top Green Triangle */}
                  <polygon points="0,0 100,0 50,50" fill="#059669" opacity="0.8" />
                  {/* Right Yellow Triangle */}
                  <polygon points="100,0 100,100 50,50" fill="#d97706" opacity="0.8" />
                  {/* Bottom Blue Triangle */}
                  <polygon points="100,100 0,100 50,50" fill="#0284c7" opacity="0.8" />
                  {/* Left Red Triangle */}
                  <polygon points="0,100 0,0 50,50" fill="#e11d48" opacity="0.8" />
                </svg>
              </div>

              {/* Center Golden Brand Emblem */}
              <div className="relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-950/90 border-2 border-amber-400 flex flex-col items-center justify-center shadow-lg text-center p-1">
                <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-[7px] md:text-[8px] font-black text-amber-300 leading-tight">
                  ATIF & ABDULLAH
                </span>
              </div>
            </div>

            {/* 6. INDIVIDUAL 15x15 TRACK CELLS */}
            {Array.from({ length: 15 }).map((_, r) =>
              Array.from({ length: 15 }).map((_, c) => {
                // Ignore cells inside the 4 bases or center (already rendered)
                const inGreenYard = r < 6 && c < 6;
                const inYellowYard = r < 6 && c > 8;
                const inRedYard = r > 8 && c < 6;
                const inBlueYard = r > 8 && c > 8;
                const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

                if (inGreenYard || inYellowYard || inRedYard || inBlueYard || inCenter) {
                  return null;
                }

                // Check cell properties
                const isRedHomeStraight = r === 7 && c >= 1 && c <= 5;
                const isGreenHomeStraight = c === 7 && r >= 1 && r <= 5;
                const isYellowHomeStraight = r === 7 && c >= 9 && c <= 13;
                const isBlueHomeStraight = c === 7 && r >= 9 && r <= 13;

                const isRedStart = r === 8 && c === 1;
                const isGreenStart = r === 1 && c === 6;
                const isYellowStart = r === 6 && c === 13;
                const isBlueStart = r === 13 && c === 8;

                const isSafe = isSafeSquare(r, c);

                // Cell background styling
                let cellBg = 'bg-white hover:bg-slate-100';
                if (isRedHomeStraight || isRedStart) cellBg = 'bg-rose-500 text-white';
                else if (isGreenHomeStraight || isGreenStart) cellBg = 'bg-emerald-500 text-white';
                else if (isYellowHomeStraight || isYellowStart) cellBg = 'bg-amber-400 text-slate-950';
                else if (isBlueHomeStraight || isBlueStart) cellBg = 'bg-sky-500 text-white';

                // Find tokens present on this square
                const tokensOnSquare: { pIdx: number; tId: number; isMovable: boolean }[] = [];
                tokens.forEach((tok) => {
                  if (tok.id < tokensPerPlayer && tok.step >= 0 && tok.step <= 56) {
                    const [tokRow, tokCol] = getCoordinatesForStep(tok.playerIdx, tok.step);
                    if (tokRow === r && tokCol === c) {
                      tokensOnSquare.push({
                        pIdx: tok.playerIdx,
                        tId: tok.id,
                        isMovable: movableTokenIds.includes(tok.id) && currentPlayer === tok.playerIdx,
                      });
                    }
                  }
                });

                return (
                  <div
                    key={`cell-${r}-${c}`}
                    style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
                    className={`w-full h-full border border-slate-300/40 relative flex items-center justify-center transition-all ${cellBg}`}
                  >
                    {/* Safe Star Icon */}
                    {isSafe && tokensOnSquare.length === 0 && (
                      <Star className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-amber-500 fill-amber-400 drop-shadow" />
                    )}

                    {/* Tokens Stacked on this Cell */}
                    {tokensOnSquare.map(({ pIdx, tId, isMovable }) => (
                      <button
                        key={`${pIdx}-${tId}`}
                        onClick={() => isMovable && executeMoveToken(pIdx, tId, diceValue!)}
                        disabled={!isMovable}
                        className={`absolute w-4 h-4 md:w-5 md:h-5 rounded-full border border-white flex items-center justify-center font-black text-[9px] shadow-lg transition-transform ${
                          PLAYERS_METADATA[pIdx].color
                        } ${isMovable ? 'ring-4 ring-white animate-bounce cursor-pointer z-30 scale-125' : 'z-20'}`}
                      >
                        <span className="text-white text-[8px]">
                          {pIdx === 0 ? 'R' : pIdx === 1 ? 'G' : pIdx === 2 ? 'Y' : 'B'}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            DICE CONTROLLER 2: TABLE SIDE 2 (EAST / SOUTH - SEATS 3 & 4: YELLOW / BLUE)
            ========================================================================= */}
        <div
          className={`w-full lg:w-60 bg-slate-900/95 border-2 rounded-3xl p-4 shadow-2xl flex flex-col justify-between space-y-3 transition-all duration-300 ${
            PLAYERS_METADATA[currentPlayer].tableSide === 'Side 2' && !winner
              ? 'border-amber-500 shadow-amber-500/20 ring-4 ring-amber-500/30'
              : 'border-slate-800/80 opacity-85'
          }`}
        >
          {/* Station Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Table Side 2 Controller
              </span>
              <span className="text-xs font-bold text-white">Seats 3 & 4 (Yellow & Blue)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" title="Yellow Seat" />
              <span className="w-3 h-3 rounded-full bg-sky-500 shadow-sm" title="Blue Seat" />
            </div>
          </div>

          {/* Turn Prompt or Status */}
          <div className="text-center py-1">
            {PLAYERS_METADATA[currentPlayer].tableSide === 'Side 2' && !winner ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black animate-pulse">
                👉 YOUR TURN TO ROLL!
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">Waiting for Side 1...</span>
            )}
          </div>

          {/* 3D Tactile Dice Display */}
          <div className="flex items-center justify-center py-2">
            <DiceFace
              value={PLAYERS_METADATA[currentPlayer].tableSide === 'Side 2' ? diceValue : null}
              isRolling={isRolling && rollingStation === 'side2'}
            />
          </div>

          {/* Roll Button for Side 2 */}
          <button
            onClick={() => handleRollDice('side2')}
            disabled={isRolling || !!winner}
            className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl ${
              PLAYERS_METADATA[currentPlayer].tableSide === 'Side 2' && !winner
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-amber-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Dices className={`h-4 w-4 ${isRolling && rollingStation === 'side2' ? 'animate-spin' : ''}`} />
            <span>{isRolling && rollingStation === 'side2' ? 'Rolling Dice...' : 'Roll Dice (Side 2)'}</span>
          </button>
        </div>
      </div>

      {/* 4. FOOTER: LIVE EVENT TICKER & VICTORY BANNER */}
      <div className="w-full space-y-2">
        {/* Victory Celebration */}
        {winner && (
          <div className="w-full bg-gradient-to-r from-emerald-600/30 via-amber-500/30 to-sky-600/30 border-2 border-amber-400 rounded-3xl p-4 text-center space-y-2 shadow-2xl animate-bounce">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-base md:text-lg">
              <Trophy className="h-6 w-6 text-amber-400" />
              <span>👑 {winner} WINS TABLETOP LUDO!</span>
              <Sparkles className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-xs text-slate-200">
              Incredible dining match at Atif and Abdullah Foods! All tokens successfully reached Home.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={handleResetGame}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
              >
                Play Rematch
              </button>
            </div>
          </div>
        )}

        {/* Live Match Log Banner */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 shadow-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            <span className="font-mono text-slate-400 text-[11px]">Match Commentary:</span>
            <span className="font-bold text-white">{gameLog}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <span>Roll a 6 to release token from base & get extra turn.</span>
          </div>
        </div>
      </div>

      {/* 5. RULES & CHEAT SHEET MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-black text-white">How to Play Tabletop Ludo</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Dual Tabletop Controllers:</strong> Side 1 (West/North) controls Red & Green seats. Side 2 (East/South) controls Yellow & Blue seats.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Releasing Tokens:</strong> You must roll a <span className="font-mono text-amber-300 font-bold">6</span> to move a token from your yard onto your starting track cell.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Capturing Opponents:</strong> Landing on an opponent’s token on any regular white cell captures it, sending it back to their yard and granting you a bonus roll!
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Safe Star Squares (⭐):</strong> Tokens standing on star squares are 100% immune to capture. Multiple tokens can share a star square safely.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Victory:</strong> First player to guide all their tokens into the center Home triangle wins the Atif & Abdullah Foods championship!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Got it, Let's Play!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
