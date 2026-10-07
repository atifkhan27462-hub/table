'use client';

import React, { useState } from 'react';
import { GameProps } from './registry';
import { RotateCcw, X, Sparkles, User, Bot, Trophy } from 'lucide-react';

type SquareValue = 'X' | 'O' | null;

export const TicTacToeGame: React.FC<GameProps> = ({ config, promotion, onExit, onWin }) => {
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [vsAI, setVsAI] = useState<boolean>(false);
  const [scores, setScores] = useState({ X: 0, O: 0, ties: 0 });
  const [hasCelebratedWin, setHasCelebratedWin] = useState<boolean>(false);

  const calculateWinner = (squares: SquareValue[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    return null;
  };

  const result = calculateWinner(board);
  const isDraw = !result && board.every((sq) => sq !== null);

  const handleSquareClick = (index: number) => {
    if (board[index] || result) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const winCheck = calculateWinner(newBoard);
    if (winCheck) {
      setScores((prev) => ({ ...prev, [winCheck.winner]: prev[winCheck.winner as 'X' | 'O'] + 1 }));
      if (!hasCelebratedWin) {
        setHasCelebratedWin(true);
        if (onWin && promotion?.active) onWin(100, promotion.code);
      }
      return;
    }

    if (newBoard.every((sq) => sq !== null)) {
      setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
      return;
    }

    if (vsAI && isXNext) {
      setIsXNext(false);
      // AI Move after short delay
      setTimeout(() => {
        makeAiMove(newBoard);
      }, 400);
    } else {
      setIsXNext(!isXNext);
    }
  };

  const makeAiMove = (currentBoard: SquareValue[]) => {
    const emptyIndices = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((val): val is number => val !== null);

    if (emptyIndices.length === 0 || calculateWinner(currentBoard)) return;

    // Pick random empty square or center
    const aiChoice = emptyIndices.includes(4) ? 4 : emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const aiBoard = [...currentBoard];
    aiBoard[aiChoice] = 'O';
    setBoard(aiBoard);

    const winCheck = calculateWinner(aiBoard);
    if (winCheck) {
      setScores((prev) => ({ ...prev, O: prev.O + 1 }));
    } else if (aiBoard.every((sq) => sq !== null)) {
      setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
    }
    setIsXNext(true);
  };

  const handleReset = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setHasCelebratedWin(false);
  };

  return (
    <div className="flex flex-col items-center justify-between h-full max-w-lg mx-auto p-4 select-none space-y-4 animate-fadeIn">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => { setVsAI(false); handleReset(); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                !vsAI ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="h-3 w-3" /> 2-Player Table
            </button>
            <button
              onClick={() => { setVsAI(true); handleReset(); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                vsAI ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="h-3 w-3" /> vs Chef AI
            </button>
          </div>
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
            <span className="font-bold">{promotion.text || 'Win to unlock a special table reward!'}</span>
          </div>
          {promotion.code && (
            <span className="font-mono bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[11px]">
              {promotion.code}
            </span>
          )}
        </div>
      )}

      {/* Scoreboard */}
      <div className="w-full grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[10px] uppercase font-black text-sky-400 block tracking-wider">Player X</span>
          <span className="text-xl font-black text-white">{scores.X}</span>
        </div>
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Ties</span>
          <span className="text-xl font-black text-white">{scores.ties}</span>
        </div>
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <span className="text-[10px] uppercase font-black text-emerald-400 block tracking-wider">
            {vsAI ? 'Chef AI (O)' : 'Player O'}
          </span>
          <span className="text-xl font-black text-white">{scores.O}</span>
        </div>
      </div>

      {/* Status Bar */}
      <div className="text-sm font-black text-center text-slate-300 h-6">
        {result ? (
          <span className="text-emerald-400 flex items-center justify-center gap-1.5 animate-bounce">
            <Sparkles className="h-4 w-4" /> Winner: Player {result.winner}!
          </span>
        ) : isDraw ? (
          <span className="text-amber-400">Game Drawn! Good match.</span>
        ) : (
          <span>Turn: Player {isXNext ? 'X' : 'O'}</span>
        )}
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-3 w-72 h-72 aspect-square p-2 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl">
        {board.map((val, idx) => {
          const isWinningSq = result?.line.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleSquareClick(idx)}
              className={`rounded-2xl text-4xl font-black flex items-center justify-center transition-all ${
                isWinningSq
                  ? 'bg-emerald-500 text-slate-950 scale-105 shadow-xl shadow-emerald-500/50'
                  : 'bg-slate-950 hover:bg-slate-800 active:scale-95 border border-slate-800/80'
              } ${val === 'X' ? 'text-sky-400' : 'text-emerald-400'}`}
            >
              {val}
            </button>
          );
        })}
      </div>

      {/* Reset Controls */}
      <div className="w-full flex justify-center pt-2">
        <button
          onClick={handleReset}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-md"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Board</span>
        </button>
      </div>
    </div>
  );
};
