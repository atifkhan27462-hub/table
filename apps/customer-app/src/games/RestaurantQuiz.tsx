'use client';

import React, { useState } from 'react';
import { GameProps } from './registry';
import { RotateCcw, Check, X as XIcon, Trophy, Sparkles, Award } from 'lucide-react';

interface Question {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

const TRIVIA_QUESTIONS: Question[] = [
  {
    q: 'Which legendary French region exclusively produces genuine Champagne?',
    options: ['Bordeaux', 'Champagne, France', 'Burgundy', 'Rhône Valley'],
    answer: 1,
    explanation: 'Only sparkling wine produced in the Champagne region under strict appellation rules can legally be called Champagne.',
  },
  {
    q: 'What is the primary culinary purpose of dry-aging USDA Prime beef for 45 days?',
    options: ['Preserve color', 'Concentrate natural umami and break down enzymes for tenderness', 'Add salt crystals', 'Prevent cooking shrinkage'],
    answer: 1,
    explanation: 'Dry-aging allows natural enzymes to tenderize muscle fibers while moisture loss concentrates beefy, nutty umami.',
  },
  {
    q: 'What rare foraged ingredient is celebrated as the "White Diamond of Alba"?',
    options: ['Morel Mushroom', 'Alba White Truffle (Tuber magnatum)', 'Black Chanterelle', 'Matsutake'],
    answer: 1,
    explanation: 'Alba white truffles from Piedmont, Italy cannot be cultivated and are foraged with trained dogs in late autumn.',
  },
  {
    q: 'What is the ideal cellar temperature to serve a bold Cabernet Sauvignon?',
    options: ['4°C (39°F)', '16°C – 18°C (60°F – 65°F)', '25°C (77°F)', '0°C (32°F)'],
    answer: 1,
    explanation: 'Full-bodied red wines express their dark fruit complexity best at 16°C–18°C, never ice-cold or room temperature.',
  },
  {
    q: 'What is the classic emulsified butter sauce flavored with tarragon, shallots, and chervil?',
    options: ['Hollandaise', 'Béarnaise', 'Velouté', 'Demi-Glace'],
    answer: 1,
    explanation: 'Béarnaise is a child of hollandaise, traditionally paired with grilled prime steaks.',
  },
];

export const RestaurantQuizGame: React.FC<GameProps> = ({ promotion, onExit, onWin }) => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const currentQ = TRIVIA_QUESTIONS[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < TRIVIA_QUESTIONS.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      const finalScorePct = Math.round(((score + (selectedOption === currentQ.answer ? 0 : 0)) / TRIVIA_QUESTIONS.length) * 100);
      if (finalScorePct >= 80 && onWin && promotion?.active) {
        onWin(finalScorePct, promotion.code);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  return (
    <div className="flex flex-col items-center justify-between h-full max-w-lg mx-auto p-4 select-none space-y-4 animate-fadeIn">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-black text-white">Restaurant & Wine Trivia Quiz</h3>
          <p className="text-[11px] text-slate-400">Culinary heritage, pairings, and kitchen craftsmanship</p>
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
            <span className="font-bold">{promotion.text || 'Score 80%+ to unlock a table discount!'}</span>
          </div>
          {promotion.code && (
            <span className="font-mono bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[11px]">
              {promotion.code}
            </span>
          )}
        </div>
      )}

      {/* Quiz Body */}
      {!isFinished ? (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between text-xs font-black text-slate-400">
            <span>Question {currentIdx + 1} of {TRIVIA_QUESTIONS.length}</span>
            <span className="text-emerald-400 font-mono">Score: {score}</span>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
            <h4 className="text-sm font-extrabold text-white leading-relaxed">{currentQ.q}</h4>

            <div className="space-y-2">
              {currentQ.options.map((opt, idx) => {
                const isCorrect = idx === currentQ.answer;
                const isSelected = idx === selectedOption;

                let btnStyle = 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-200';
                if (isAnswered) {
                  if (isCorrect) btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black';
                  else if (isSelected) btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 font-black';
                  else btnStyle = 'bg-slate-950 border-slate-900 opacity-50 text-slate-500';
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-3.5 rounded-2xl border text-xs text-left flex items-center justify-between transition-all ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && isCorrect && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                    {isAnswered && isSelected && !isCorrect && <XIcon className="h-4 w-4 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-[11px] text-slate-300 leading-relaxed animate-fadeIn">
                <span className="font-bold text-sky-400 block mb-0.5">Sommelier Note:</span>
                {currentQ.explanation}
              </div>
            )}
          </div>

          {isAnswered && (
            <button
              onClick={handleNextQuestion}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-2xl shadow-xl shadow-sky-600/30 active:scale-95 transition-all"
            >
              {currentIdx + 1 < TRIVIA_QUESTIONS.length ? 'Next Question →' : 'See Results 🏆'}
            </button>
          )}
        </div>
      ) : (
        /* Results View */
        <div className="w-full p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 shadow-2xl animate-fadeIn">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
            <Award className="h-8 w-8" />
          </div>

          <div>
            <h4 className="text-xl font-black text-white">Quiz Completed!</h4>
            <p className="text-xs text-slate-400 mt-1">
              You scored <span className="text-emerald-400 font-bold">{score}</span> out of {TRIVIA_QUESTIONS.length} ({Math.round((score / TRIVIA_QUESTIONS.length) * 100)}%)
            </p>
          </div>

          {Math.round((score / TRIVIA_QUESTIONS.length) * 100) >= 80 ? (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl space-y-1">
              <span className="text-xs font-black text-emerald-300 flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Gourmet Connoisseur Level Reached!
              </span>
              {promotion?.code && (
                <p className="text-xs text-slate-300">
                  Use promo code <span className="font-mono font-black text-amber-400">{promotion.code}</span> for your discount!
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Great effort! Score 80%+ to unlock promotional rewards.</p>
          )}

          <button
            onClick={handleRestart}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 mx-auto active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retake Quiz</span>
          </button>
        </div>
      )}
    </div>
  );
};
