import type { DartThrow } from '../DartsMatchEngine';

export interface KillerPlayer {
  id: string;
  name: string;
  assignedNumber: number; // 1-20, unique per player — this player's own number
  marks: number; // 0-3, progress toward becoming a killer (Cricket-style: single=1, double=2, triple=3)
  isKiller: boolean;
  lives: number;
  dartsThrown: DartThrow[]; // every real dart thrown, for the board visualization
  photo?: string;
}

export interface KillerMatchState {
  players: KillerPlayer[];
  currentPlayerIndex: number;
  dartsThisTurn: number;
  startingLives: number;
  isMatchOver: boolean;
  winnerId: string | null;
}

export type KillerThrowStatus = 'miss' | 'building' | 'became-killer' | 'self-hit' | 'opponent-hit' | 'win';

export interface KillerThrowResult {
  status: KillerThrowStatus;
  livesLost: number;
  targetPlayerId?: string;
}

function shuffledNumbers(count: number): number[] {
  const pool = Array.from({ length: 20 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Killer: each player is randomly assigned a distinct number (1-20). Hitting your own number
 * builds marks (single=1, double=2, triple=3, Cricket-style) — 3 marks makes you a "killer".
 * Once you're a killer, you can hit any opponent's number to remove lives from them (equal to
 * the multiplier), but hitting your OWN number now costs you your own lives ("friendly fire").
 * Last player left with lives remaining wins.
 */
export class KillerEngine {
  public players: KillerPlayer[];
  public currentPlayerIndex: number = 0;
  public dartsThisTurn: number = 0;
  public startingLives: number;
  public isMatchOver: boolean = false;
  public winnerId: string | null = null;

  private onChange?: (state: KillerMatchState) => void;

  constructor(playerNames: string[], startingLives: number = 5, onChange?: (state: KillerMatchState) => void) {
    if (playerNames.length > 20) throw new Error('For mange spillere for Killer (maks 20).');
    const numbers = shuffledNumbers(playerNames.length);
    this.startingLives = Math.max(1, startingLives);
    this.players = playerNames.map((name, index) => ({
      id: `player_${index + 1}`,
      name,
      assignedNumber: numbers[index],
      marks: 0,
      isKiller: false,
      lives: this.startingLives,
      dartsThrown: []
    }));
    this.onChange = onChange;
  }

  public static restore(state: KillerMatchState, onChange?: (state: KillerMatchState) => void): KillerEngine {
    const engine = new KillerEngine(
      state.players.map(p => p.name),
      state.startingLives,
      onChange
    );
    engine.players = state.players.map(p => ({ ...p, dartsThrown: p.dartsThrown.map(d => ({ ...d })) }));
    engine.currentPlayerIndex = state.currentPlayerIndex;
    engine.dartsThisTurn = state.dartsThisTurn;
    engine.isMatchOver = state.isMatchOver;
    engine.winnerId = state.winnerId;
    return engine;
  }

  public toJSON(): KillerMatchState {
    return {
      players: this.players.map(p => ({ ...p, dartsThrown: p.dartsThrown.map(d => ({ ...d })) })),
      currentPlayerIndex: this.currentPlayerIndex,
      dartsThisTurn: this.dartsThisTurn,
      startingLives: this.startingLives,
      isMatchOver: this.isMatchOver,
      winnerId: this.winnerId
    };
  }

  private notifyChange(): void {
    this.onChange?.(this.toJSON());
  }

  public getActivePlayer(): KillerPlayer {
    return this.players[this.currentPlayerIndex];
  }

  private moveToNextPlayer(): void {
    this.dartsThisTurn = 0;
    let next = this.currentPlayerIndex;
    do {
      next = (next + 1) % this.players.length;
    } while (this.players[next].lives <= 0 && next !== this.currentPlayerIndex);
    this.currentPlayerIndex = next;
  }

  /**
   * @param segment 1-20 for a numbered wedge, or 0 for a miss — Killer only uses numbered
   *   wedges (no bull); anything else is treated as a miss
   * @param multiplier 1 = single, 2 = double, 3 = triple
   */
  public throwDart(segment: number, multiplier: 1 | 2 | 3 = 1): KillerThrowResult {
    if (this.isMatchOver) throw new Error('Match has already concluded.');

    const player = this.getActivePlayer();
    if (segment > 0) player.dartsThrown.push({ segment, multiplier });
    this.dartsThisTurn++;

    let status: KillerThrowStatus = 'miss';
    let livesLost = 0;
    let targetPlayerId: string | undefined;

    if (!player.isKiller) {
      if (segment === player.assignedNumber) {
        const before = player.marks;
        player.marks = Math.min(3, player.marks + multiplier);
        if (before < 3 && player.marks >= 3) {
          player.isKiller = true;
          status = 'became-killer';
        } else {
          status = 'building';
        }
      }
    } else if (segment === player.assignedNumber) {
      livesLost = multiplier;
      player.lives = Math.max(0, player.lives - livesLost);
      status = 'self-hit';
      targetPlayerId = player.id;
    } else {
      const target = this.players.find(p => p.id !== player.id && p.assignedNumber === segment && p.lives > 0);
      if (target) {
        livesLost = multiplier;
        target.lives = Math.max(0, target.lives - livesLost);
        status = 'opponent-hit';
        targetPlayerId = target.id;
      }
    }

    const alive = this.players.filter(p => p.lives > 0);
    if (alive.length <= 1) {
      this.isMatchOver = true;
      this.winnerId = alive.length === 1 ? alive[0].id : null;
      this.dartsThisTurn = 0;
      this.notifyChange();
      return { status: 'win', livesLost, targetPlayerId };
    }

    if (player.lives <= 0 || this.dartsThisTurn >= 3) {
      this.moveToNextPlayer();
    }

    this.notifyChange();
    return { status, livesLost, targetPlayerId };
  }
}
