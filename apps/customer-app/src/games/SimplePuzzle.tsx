'use client';

import React, { useState, useEffect } from 'react';
import { GameProps } from './registry';
import { RotateCcw, Trophy, Sparkles, Move } from 'lucide-react';

const SOLVED_TILES = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 represents the blank tile

export const SimplePuzzleGame: React.FC<GameProps> = ({ promotion, onExit, onWin }) => {
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  const initPuzzle = () => {
    // Start with a solvable scrambled state
    let state = [...SOLVED_TILES];
    let blankPos = 8;
    // Perform 30 random valid sliding moves to ensure solvability
    for (let i = 0; i < 30; i++) {
      const neighbors = getAdjacentIndices(blankPos);
      const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      // Swap blank with neighbor
      [state[blankPos], state[randomNeighbor]] = [state[randomNeighbor], state[blankPos]];
      blankPos = randomNeighbor;
    }
    setTiles(state);
    setMoves(0);
    setIsSolved(false);
  };

  useEffect(() => {
    initPuzzle();
  }, []);

  const getAdjacentIndices = (index: number): number[] => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const adjacent: number[] = [];
    if (row > 0) adjacent.push(index - 3); // Up
    if (row < 2) adjacent.push(index + 3); // Down
    if (col > 0) adjacent.push(index - 1); // Left
    if (col < 2) adjacent.push(index + 1); // Right
    return adjacent;
  };

  const handleTileClick = (index: number) => {
    if (isSolved || tiles[index] === 0) return;

    const blankIndex = tiles.indexOf(0);
    const adjacent = getAdjacentIndices(index);

    if (adjacent.includes(blankIndex)) {
      // Valid slide into blank space
      const newTiles = [...tiles];
      [newTiles[index], newTiles[blankIndex]] = [newTiles[blankIndex], newTiles[index]];
      setTiles(newTiles);
      setMoves((m) => m + 1);

      // Check if solved
      const solved = newTiles.every((val, idx) => val === SOLVED_TILES[idx]);
      if (solved) {
        setIsSolved(true);
        if (onWin && promotion?.active) onWin(100, promotion.code);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full max-w-lg mx-auto p-4 select-none space-y-4 animate-fadeIn">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-black text-white">Gourmet Chef Sliding Puzzle</h3>
          <p className="text-[11px] text-slate-400">Slide tiles into numerical order (1 to 8)</p>
        </div>
        <button
          onClick={onExit}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
        >
          Exit Game
        </button>
      </div>

      {/* Promotion Reward Banner */}
      {promotion?.active && (
        <div className="w-full bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-purple-500/20 border border-amber-500/40 rounded-2xl p-2.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-bold">{promotion.text || 'Solve the puzzle to unlock table rewards!'}</span>
          </div>
          {promotion.code && (
            <span className="font-mono bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[11px]">
              {promotion.code}
            </span>
          )}
        </div>
      )}

      {/* Move Counter */}
      <div className="w-full flex items-center justify-between px-2 text-xs font-black text-slate-400">
        <div className="flex items-center gap-1.5 text-sky-400">
          <Move className="h-4 w-4" />
          <span>Moves: {moves}</span>
        </div>
        <span>Target: 1 2 3 / 4 5 6 / 7 8 [ ]</span>
      </div>

      {/* 3x3 Puzzle Grid */}
      <div className="grid grid-cols-3 gap-3 w-72 h-72 aspect-square p-2 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl">
        {tiles.map((val, idx) => {
          if (val === 0) {
            return <div key={idx} className="rounded-2xl bg-slate-950/40 border border-dashed border-slate-800/50" />;
          }
          return (
            <button
              key={idx}
              onClick={() => handleTileClick(idx)}
              className={`rounded-2xl text-2xl font-black flex items-center justify-center transition-all select-none ${
                isSolved
                  ? 'bg-emerald-500 text-slate-950 scale-105'
                  : 'bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 active:scale-95 border border-slate-700/80 text-white shadow-lg'
              }`}
            >
              {val}
            </button>
          );
        })}
      </div>

      {/* Solved Celebration */}
      {isSolved && (
        <div className="w-full bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-3 text-center space-y-1 animate-bounce">
          <span className="text-xs font-black text-emerald-300 flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4" /> Master Chef Solved! Finished in {moves} moves!
          </span>
        </div>
      )}

      {/* Reset Control */}
      <div className="w-full flex justify-center pt-2">
        <button
          onClick={initPuzzle}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-md"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Scramble & Reset</span>
        </button>
      </div>
    </div>
  );
};
