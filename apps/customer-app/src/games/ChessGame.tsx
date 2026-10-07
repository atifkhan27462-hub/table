'use client';

import React, { useState } from 'react';
import { GameProps } from './registry';
import { RotateCcw, Trophy, Sparkles } from 'lucide-react';

type Piece = string | null;

const INITIAL_CHESS_BOARD: Piece[][] = [
  ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'], // Black back row
  ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'], // Black pawns
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'], // White pawns
  ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'], // White back row
];

export const ChessGame: React.FC<GameProps> = ({ promotion, onExit, onWin }) => {
  const [board, setBoard] = useState<Piece[][]>(INITIAL_CHESS_BOARD);
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);

  const isWhitePiece = (piece: string | null) => {
    if (!piece) return false;
    return ['♔', '♕', '♖', '♗', '♘', '♙'].includes(piece);
  };

  const isBlackPiece = (piece: string | null) => {
    if (!piece) return false;
    return ['♚', '♛', '♜', '♝', '♞', '♟'].includes(piece);
  };

  const handleSquareClick = (r: number, c: number) => {
    const piece = board[r][c];

    // If already selected a piece, attempt to move
    if (selectedCoord) {
      const [sr, sc] = selectedCoord;
      if (sr === r && sc === c) {
        // Deselect
        setSelectedCoord(null);
        return;
      }

      const sourcePiece = board[sr][sc];
      const targetPiece = board[r][c];

      // Prevent friendly fire
      if (turn === 'white' && isWhitePiece(targetPiece)) {
        setSelectedCoord([r, c]);
        return;
      }
      if (turn === 'black' && isBlackPiece(targetPiece)) {
        setSelectedCoord([r, c]);
        return;
      }

      // Execute Move
      const newBoard = board.map((row) => [...row]);
      newBoard[r][c] = sourcePiece;
      newBoard[sr][sc] = null;
      setBoard(newBoard);

      // Track captured piece
      if (targetPiece) {
        if (isWhitePiece(targetPiece)) {
          setCapturedWhite((prev) => [...prev, targetPiece]);
        } else {
          setCapturedBlack((prev) => [...prev, targetPiece]);
        }
      }

      setSelectedCoord(null);
      setMoveCount((m) => m + 1);
      setTurn((t) => (t === 'white' ? 'black' : 'white'));
      return;
    }

    // Select piece if it belongs to current player's turn
    if (piece) {
      if ((turn === 'white' && isWhitePiece(piece)) || (turn === 'black' && isBlackPiece(piece))) {
        setSelectedCoord([r, c]);
      }
    }
  };

  const handleReset = () => {
    setBoard(INITIAL_CHESS_BOARD);
    setSelectedCoord(null);
    setTurn('white');
    setCapturedWhite([]);
    setCapturedBlack([]);
    setMoveCount(0);
  };

  return (
    <div className="flex flex-col items-center justify-between h-full max-w-lg mx-auto p-4 select-none space-y-3 animate-fadeIn">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-black text-white">Classic Tabletop Chess</h3>
          <p className="text-[11px] text-slate-400">Touch to select piece and legal square</p>
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
            <span className="font-bold">{promotion.text || 'Win chess to unlock a complimentary pairing!'}</span>
          </div>
          {promotion.code && (
            <span className="font-mono bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[11px]">
              {promotion.code}
            </span>
          )}
        </div>
      )}

      {/* Turn & Status Bar */}
      <div className="w-full flex items-center justify-between px-2 text-xs font-black">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Turn:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
            turn === 'white' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}>
            {turn === 'white' ? 'White Move' : 'Black Move'}
          </span>
        </div>
        <span className="text-slate-400">Moves: {moveCount}</span>
      </div>

      {/* 8x8 Chessboard */}
      <div className="grid grid-cols-8 gap-0.5 w-80 h-80 p-2 bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const isLight = (r + c) % 2 === 0;
            const isSelected = selectedCoord && selectedCoord[0] === r && selectedCoord[1] === c;

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleSquareClick(r, c)}
                className={`flex items-center justify-center text-2xl font-normal transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 scale-105 shadow-md z-10 rounded-md'
                    : isLight
                    ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-900'
                }`}
              >
                {piece}
              </button>
            );
          })
        )}
      </div>

      {/* Captured Pieces Cemetery */}
      <div className="w-full flex items-center justify-between px-3 text-xs bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto text-base">
          <span className="text-[10px] text-slate-500 uppercase font-black mr-1">W Lost:</span>
          {capturedWhite.join(' ')}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto text-base">
          <span className="text-[10px] text-slate-500 uppercase font-black mr-1">B Lost:</span>
          {capturedBlack.join(' ')}
        </div>
      </div>

      {/* Reset Control */}
      <div className="w-full flex justify-center pt-1">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-md"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Chessboard</span>
        </button>
      </div>
    </div>
  );
};
