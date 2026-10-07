'use client';

import React, { useState, useEffect } from 'react';
import { GameProps } from './registry';
import { RotateCcw, Sparkles, Trophy, Clock } from 'lucide-react';

interface CardItem {
  id: number;
  pairId: number;
  emoji: string;
  name: string;
  flipped: boolean;
  matched: boolean;
}

const CULINARY_PAIRS = [
  { pairId: 1, emoji: '🥩', name: 'Prime Ribeye' },
  { pairId: 2, emoji: '🐟', name: 'Chilean Sea Bass' },
  { pairId: 3, emoji: '🍄', name: 'Black Truffle' },
  { pairId: 4, emoji: '🍷', name: 'Cabernet Reserve' },
  { pairId: 5, emoji: '🍸', name: 'Old Fashioned' },
  { pairId: 6, emoji: '🍣', name: 'King Salmon Nigiri' },
  { pairId: 7, emoji: '🍕', name: 'Wood-Fired Pizza' },
  { pairId: 8, emoji: '🍰', name: 'Vanilla Crème Brûlée' },
];

export const MemoryMatchGame: React.FC<GameProps> = ({ promotion, onExit, onWin }) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);

  const initGame = () => {
    const deck: CardItem[] = [];
    let idCounter = 0;
    CULINARY_PAIRS.forEach((item) => {
      // 2 of each pair
      deck.push({ id: idCounter++, pairId: item.pairId, emoji: item.emoji, name: item.name, flipped: false, matched: false });
      deck.push({ id: idCounter++, pairId: item.pairId, emoji: item.emoji, name: item.name, flipped: false, matched: false });
    });

    // Shuffle deck
    deck.sort(() => Math.random() - 0.5);
    setCards(deck);
    setSelectedCards([]);
    setMoves(0);
    setIsWon(false);
    setSeconds(0);
  };

  useEffect(() => {
    initGame();
  }, []);

  // Timer
  useEffect(() => {
    if (isWon) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isWon]);

  const handleCardClick = (index: number) => {
    if (cards[index].flipped || cards[index].matched || selectedCards.length === 2) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newSelected;
      if (newCards[firstIdx].pairId === newCards[secondIdx].pairId) {
        // Matched!
        newCards[firstIdx].matched = true;
        newCards[secondIdx].matched = true;
        setCards(newCards);
        setSelectedCards([]);

        // Check if all matched
        if (newCards.every((c) => c.matched)) {
          setIsWon(true);
          if (onWin && promotion?.active) onWin(100, promotion.code);
        }
      } else {
        // Not a match: flip back after 700ms
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstIdx].flipped = false;
          resetCards[secondIdx].flipped = false;
          setCards(resetCards);
          setSelectedCards([]);
        }, 700);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full max-w-lg mx-auto p-4 select-none space-y-4 animate-fadeIn">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-black text-white">Culinary Memory Match</h3>
          <p className="text-[11px] text-slate-400">Match 8 pairs of gourmet dining ingredients</p>
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
            <span className="font-bold">{promotion.text || 'Match all cards to unlock a reward!'}</span>
          </div>
          {promotion.code && (
            <span className="font-mono bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[11px]">
              {promotion.code}
            </span>
          )}
        </div>
      )}

      {/* Status Indicators */}
      <div className="w-full flex items-center justify-between px-2 text-xs font-black text-slate-300">
        <div className="flex items-center gap-1.5 text-sky-400">
          <Clock className="h-4 w-4" />
          <span>{Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}</span>
        </div>
        <div>
          <span>Moves: <span className="text-white">{moves}</span></span>
        </div>
        <div>
          <span>Pairs: <span className="text-emerald-400">{cards.filter((c) => c.matched).length / 2} / 8</span></span>
        </div>
      </div>

      {/* 4x4 Grid of 16 Cards */}
      <div className="grid grid-cols-4 gap-3 w-80 h-80 p-2 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl">
        {cards.map((card, idx) => {
          const isRevealed = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(idx)}
              className={`rounded-2xl flex flex-col items-center justify-center transition-all duration-200 select-none ${
                card.matched
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : isRevealed
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'bg-slate-950 hover:bg-slate-800 active:scale-95 border border-slate-800 text-slate-600'
              }`}
            >
              {isRevealed ? (
                <div className="flex flex-col items-center animate-fadeIn">
                  <span className="text-2xl">{card.emoji}</span>
                  <span className="text-[8px] font-bold mt-1 text-center truncate max-w-[56px] leading-tight opacity-90">
                    {card.name}
                  </span>
                </div>
              ) : (
                <span className="text-base font-black">?</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Win Celebration */}
      {isWon && (
        <div className="w-full bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-3 text-center space-y-1 animate-bounce">
          <span className="text-xs font-black text-emerald-300 flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4" /> Extraordinary Memory! Solved in {moves} moves!
          </span>
        </div>
      )}

      {/* Reset Control */}
      <div className="w-full flex justify-center pt-2">
        <button
          onClick={initGame}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-md"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>New Game</span>
        </button>
      </div>
    </div>
  );
};
