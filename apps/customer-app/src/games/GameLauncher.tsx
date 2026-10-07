'use client';

import React, { useState, useEffect } from 'react';
import {
  gameRegistry,
  RegisteredGame,
} from './registry';
import { TicTacToeGame } from './TicTacToe';
import { MemoryMatchGame } from './MemoryMatch';
import { LudoGame } from './LudoGame';
import { RestaurantQuizGame } from './RestaurantQuiz';
import { SimplePuzzleGame } from './SimplePuzzle';
import { ChessGame } from './ChessGame';
import {
  Gamepad2,
  Trophy,
  Users,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  ArrowLeft,
  Gift,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Grid3X3,
  Layers,
  HelpCircle,
  Puzzle,
  Crown,
  Dices,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// Self-register initial games into the modular registry
if (!gameRegistry.has('tic-tac-toe')) {
  gameRegistry.register({
    slug: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    category: 'Classic',
    minPlayers: 1,
    maxPlayers: 2,
    description: '3-in-a-row challenge. Play head-to-head at your table or duel the Chef AI.',
    iconName: 'Grid3X3',
    Component: TicTacToeGame,
  });
}

if (!gameRegistry.has('memory-match')) {
  gameRegistry.register({
    slug: 'memory-match',
    title: 'Memory Match',
    category: 'Memory',
    minPlayers: 1,
    maxPlayers: 2,
    description: 'Flip culinary ingredient cards and pair gourmet dishes before the timer expires.',
    iconName: 'Layers',
    Component: MemoryMatchGame,
  });
}

if (!gameRegistry.has('ludo-game')) {
  gameRegistry.register({
    slug: 'ludo-game',
    title: 'Ludo Tabletop',
    category: 'Board',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'Classic four-corner family board game with 3D rolling dice and turn tracker.',
    iconName: 'Dices',
    Component: LudoGame,
  });
}

if (!gameRegistry.has('restaurant-quiz')) {
  gameRegistry.register({
    slug: 'restaurant-quiz',
    title: 'Culinary Trivia',
    category: 'Trivia',
    minPlayers: 1,
    maxPlayers: 4,
    description: 'Test your food knowledge! Score 80%+ to unlock kitchen chef rewards.',
    iconName: 'HelpCircle',
    Component: RestaurantQuizGame,
  });
}

if (!gameRegistry.has('simple-puzzle')) {
  gameRegistry.register({
    slug: 'simple-puzzle',
    title: 'Sliding Food Puzzle',
    category: 'Puzzle',
    minPlayers: 1,
    maxPlayers: 1,
    description: 'Slide delicious numbered food tiles back in order with minimum moves.',
    iconName: 'Puzzle',
    Component: SimplePuzzleGame,
  });
}

if (!gameRegistry.has('chess')) {
  gameRegistry.register({
    slug: 'chess',
    title: 'Grandmaster Chess',
    category: 'Strategy',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Full 8x8 touch chessboard with piece move validation, capture cemetery, and logs.',
    iconName: 'Crown',
    Component: ChessGame,
  });
}

interface BackendGameData {
  id: string;
  slug: string;
  title: string;
  category: string;
  is_active: boolean;
  config: Record<string, any>;
  promotion_active: boolean;
  promotion_text?: string;
  promotion_code?: string;
  promotion_discount_percent?: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Grid3X3: <Grid3X3 className="h-7 w-7 text-amber-600" />,
  Layers: <Layers className="h-7 w-7 text-orange-600" />,
  Dices: <Dices className="h-7 w-7 text-rose-600" />,
  HelpCircle: <HelpCircle className="h-7 w-7 text-indigo-600" />,
  Puzzle: <Puzzle className="h-7 w-7 text-emerald-600" />,
  Crown: <Crown className="h-7 w-7 text-amber-700" />,
};

interface GameLauncherProps {
  onBackToMenu?: () => void;
}

export const GameLauncher: React.FC<GameLauncherProps> = ({ onBackToMenu }) => {
  const [games, setGames] = useState<RegisteredGame[]>([]);
  const [backendMeta, setBackendMeta] = useState<Record<string, BackendGameData>>({});
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [gameResetCounter, setGameResetCounter] = useState<number>(0);
  const [rewardWon, setRewardWon] = useState<{ score?: number; promoCode?: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isExpandedTable, setIsExpandedTable] = useState<boolean>(false);

  // Load registered games and sync with backend configurations
  useEffect(() => {
    const registered = gameRegistry.getAll();
    setGames(registered);

    const fetchBackendGames = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const res = await fetch(`${apiUrl}/api/v1/games`);
        if (res.ok) {
          const data: BackendGameData[] = await res.json();
          const metaMap: Record<string, BackendGameData> = {};
          data.forEach((item) => {
            metaMap[item.slug] = item;
          });
          setBackendMeta(metaMap);
        }
      } catch (err) {
        console.warn('Game Launcher: Using local offline game registry', err);
      }
    };

    fetchBackendGames();
  }, []);

  const activeGame = activeSlug ? gameRegistry.get(activeSlug) : null;
  const activeBackend = activeSlug ? backendMeta[activeSlug] : null;

  // Filter games based on category or promotion
  const filteredGames = games.filter((game) => {
    const meta = backendMeta[game.slug];
    if (meta && meta.is_active === false) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'promos') return meta?.promotion_active;
    return game.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const categories = ['all', 'Classic', 'Memory', 'Board', 'Trivia', 'Puzzle', 'Strategy', 'promos'];

  const handleWin = (score?: number, promoCode?: string) => {
    setRewardWon({ score, promoCode });
  };

  const handleCopyPromo = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12 select-none">
      {/* Non-interference Session Safety Badge */}
      <div className="bg-white border border-stone-200/80 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-black text-stone-900 block">Tabletop Safe-Play Sandbox</span>
            <span className="text-[11px] text-stone-500">
              Games run in isolated memory. Your current bill, kitchen orders, and table session remain 100% untouched.
            </span>
          </div>
        </div>

        {onBackToMenu && (
          <button
            onClick={onBackToMenu}
            className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Menu
          </button>
        )}
      </div>

      {/* ACTIVE GAME CONTAINER */}
      {activeGame ? (
        <div
          className={`${
            isExpandedTable
              ? 'fixed inset-0 z-50 bg-[#FAF8F5] p-4 md:p-6 shadow-2xl space-y-4 overflow-y-auto'
              : 'bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xl space-y-4'
          }`}
        >
          {/* Active Game Header Bar */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveSlug(null);
                  setRewardWon(null);
                  setIsExpandedTable(false);
                }}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl transition-all"
                title="Back to Game Hub"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-stone-900">{activeGame.title}</h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {activeGame.category}
                  </span>
                  {isExpandedTable && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200">
                      32" Giant Fullscreen
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  {activeGame.minPlayers === activeGame.maxPlayers
                    ? `${activeGame.minPlayers} Players`
                    : `${activeGame.minPlayers}-${activeGame.maxPlayers} Players`}{' '}
                  • Interactive Touch
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen / Enlarge Screen Toggle */}
              <button
                onClick={() => setIsExpandedTable((prev) => !prev)}
                className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
                  isExpandedTable
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 text-white shadow-orange-500/20'
                }`}
                title="Enlarge screen for 32-inch dining table"
              >
                {isExpandedTable ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>⛶ Enlarge Screen (Full Table)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setGameResetCounter((prev) => prev + 1)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restart Game
              </button>
              <button
                onClick={() => {
                  setActiveSlug(null);
                  setRewardWon(null);
                  setIsExpandedTable(false);
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black rounded-xl transition-all"
              >
                Exit Game
              </button>
            </div>
          </div>

          {/* Active Game Sandbox Component */}
          <div className="min-h-[480px] flex items-center justify-center bg-stone-50 rounded-2xl border border-stone-200/80 p-4">
            <activeGame.Component
              key={`${activeSlug}-${gameResetCounter}`}
              config={activeBackend?.config || activeGame.defaultConfig}
              promotion={{
                active: !!activeBackend?.promotion_active,
                text: activeBackend?.promotion_text,
                code: activeBackend?.promotion_code,
                discountPercent: activeBackend?.promotion_discount_percent,
              }}
              onExit={() => {
                setActiveSlug(null);
                setRewardWon(null);
              }}
              onWin={handleWin}
            />
          </div>
        </div>
      ) : (
        /* GAME HUB / CATALOG VIEW */
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-200 p-8 shadow-xs">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Table Entertainment Hub
                </div>
                <h2 className="text-3xl font-black text-stone-900 tracking-tight">Play, Compete &amp; Win Rewards</h2>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Enjoy tabletop classics with dining guests while our master chefs prepare your order.
                  Win promotion matches to unlock exclusive discount vouchers!
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-white border border-stone-200 p-4 rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] uppercase font-black text-stone-500 block">Available</span>
                  <span className="text-2xl font-black text-stone-900">{games.length} Games</span>
                </div>
                <div className="bg-white border border-amber-300 p-4 rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] uppercase font-black text-amber-700 block">Promotions</span>
                  <span className="text-2xl font-black text-amber-800">
                    {Object.values(backendMeta).filter((g) => g.promotion_active).length || 1} Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black capitalize whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                      : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-300 hover:text-stone-900 shadow-xs'
                  }`}
                >
                  {cat === 'promos' ? (
                    <>
                      <Flame className="h-3.5 w-3.5 text-amber-600" /> Special Rewards
                    </>
                  ) : cat === 'all' ? (
                    'All Games'
                  ) : (
                    cat
                  )}
                </button>
              );
            })}
          </div>

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => {
              const meta = backendMeta[game.slug];
              const hasPromotion = meta?.promotion_active;

              return (
                <div
                  key={game.slug}
                  className={`group relative bg-white border rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-xs hover:shadow-lg hover:-translate-y-0.5 ${
                    hasPromotion
                      ? 'border-amber-300 hover:border-amber-400'
                      : 'border-stone-200/80 hover:border-amber-300'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                        {CATEGORY_ICONS[game.iconName] || <Gamepad2 className="h-7 w-7 text-amber-600" />}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {game.minPlayers === game.maxPlayers
                            ? `${game.minPlayers}P`
                            : `${game.minPlayers}-${game.maxPlayers}P`}
                        </span>
                        {hasPromotion && (
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 animate-pulse">
                            <Gift className="h-3 w-3" /> Reward Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-stone-900 group-hover:text-amber-700 transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-xs text-stone-600 leading-relaxed mt-1.5">
                        {game.description}
                      </p>
                    </div>

                    {hasPromotion && meta?.promotion_text && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="font-bold line-clamp-1">{meta.promotion_text}</span>
                      </div>
                    )}
                  </div>

                  {/* Play Action Button */}
                  <button
                    onClick={() => setActiveSlug(game.slug)}
                    className="w-full py-3.5 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all min-h-[48px] shadow-md bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-500/20"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    <span>Launch {game.title}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PROMOTION REWARD CELEBRATION MODAL */}
      {rewardWon && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl relative">
            <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 animate-bounce">
              <Trophy className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-amber-700 tracking-wider">Victory Celebration!</span>
              <h3 className="text-2xl font-black text-stone-900">Table Reward Unlocked</h3>
              <p className="text-xs text-stone-600">
                Outstanding match! You completed the challenge and earned an exclusive promotion voucher for your table.
              </p>
            </div>

            {rewardWon.promoCode && (
              <div className="bg-stone-50 border border-amber-300 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">
                  Promotional Coupon Code
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xl font-black text-amber-800 tracking-wider">
                    {rewardWon.promoCode}
                  </span>
                  <button
                    onClick={() => handleCopyPromo(rewardWon.promoCode!)}
                    className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition-all"
                    title="Copy code"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {copiedCode && (
                  <span className="text-[11px] text-emerald-700 font-bold block animate-fadeIn">
                    Copied to clipboard! Apply during bill checkout.
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRewardWon(null)}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all"
              >
                Keep Playing
              </button>
              <button
                onClick={() => {
                  setRewardWon(null);
                  setActiveSlug(null);
                  if (onBackToMenu) onBackToMenu();
                }}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all"
              >
                Use Code on Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
