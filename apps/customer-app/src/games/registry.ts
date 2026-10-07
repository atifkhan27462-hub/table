import React from 'react';

export interface GameProps {
  config?: Record<string, unknown>;
  promotion?: {
    active: boolean;
    text?: string;
    code?: string;
    discountPercent?: number;
  };
  onExit: () => void;
  onWin?: (score?: number, promoCode?: string) => void;
}

export interface RegisteredGame {
  slug: string;
  title: string;
  category: string;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  iconName: string;
  Component: React.ComponentType<GameProps>;
  defaultConfig?: Record<string, unknown>;
}

class GameRegistryService {
  private games: Map<string, RegisteredGame> = new Map();

  /**
   * Register a new modular game plugin.
   * Future games can be added anywhere without modifying launcher or existing game code.
   */
  public register(game: RegisteredGame): void {
    this.games.set(game.slug, game);
  }

  public get(slug: string): RegisteredGame | undefined {
    return this.games.get(slug);
  }

  public getAll(): RegisteredGame[] {
    return Array.from(this.games.values());
  }

  public has(slug: string): boolean {
    return this.games.has(slug);
  }
}

export const gameRegistry = new GameRegistryService();
