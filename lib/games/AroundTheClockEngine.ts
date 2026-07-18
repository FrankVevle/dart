import type { DartThrow } from '../DartsMatchEngine';

export interface ClockPlayer {
  id: string;
  name: string;
  currentTarget: number; // 1-20; 21 means finished (won)
  dartsThrown: DartThrow[]; // every real dart thrown, for the board visualization
  photo?: string;
}

export interface ClockMatchState {
  players: ClockPlayer[];
  currentPlayerIndex: number;
  dartsThisTurn: number;
  isMatchOver: boolean;
  winnerId: string | null;
}

/**
 * Around the Clock ("Rundt klokka"): each player has a running target starting at 1.
 * Hitting the target (any single/double/triple) advances it by 1; missing ends the turn
 * immediately, even with darts left. First to advance past 20 wins the match outright —
 * there's no leg/set structure, it's a single race.
 */
export class AroundTheClockEngine {
  public players: ClockPlayer[];
  public currentPlayerIndex: number = 0;
  public dartsThisTurn: number = 0;
  public isMatchOver: boolean = false;
  public winnerId: string | null = null;

  private onChange?: (state: ClockMatchState) => void;

  constructor(playerNames: string[], onChange?: (state: ClockMatchState) => void) {
    this.players = playerNames.map((name, index) => ({
      id: `player_${index + 1}`,
      name,
      currentTarget: 1,
      dartsThrown: []
    }));
    this.onChange = onChange;
  }

  public static restore(state: ClockMatchState, onChange?: (state: ClockMatchState) => void): AroundTheClockEngine {
    const engine = new AroundTheClockEngine(
      state.players.map(p => p.name),
      onChange
    );
    engine.players = state.players.map(p => ({ ...p, dartsThrown: p.dartsThrown.map(d => ({ ...d })) }));
    engine.currentPlayerIndex = state.currentPlayerIndex;
    engine.dartsThisTurn = state.dartsThisTurn;
    engine.isMatchOver = state.isMatchOver;
    engine.winnerId = state.winnerId;
    return engine;
  }

  public toJSON(): ClockMatchState {
    return {
      players: this.players.map(p => ({ ...p, dartsThrown: p.dartsThrown.map(d => ({ ...d })) })),
      currentPlayerIndex: this.currentPlayerIndex,
      dartsThisTurn: this.dartsThisTurn,
      isMatchOver: this.isMatchOver,
      winnerId: this.winnerId
    };
  }

  private notifyChange(): void {
    this.onChange?.(this.toJSON());
  }

  public getActivePlayer(): ClockPlayer {
    return this.players[this.currentPlayerIndex];
  }

  private moveToNextPlayer(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.dartsThisTurn = 0;
  }

  /**
   * @param segment 1-20 for a numbered wedge, 25 for the bull (never a valid target), or 0 for a miss
   * @param multiplier any multiplier counts the same — it just needs to land on the current target
   */
  public throwDart(segment: number, multiplier: 1 | 2 | 3 = 1): { status: 'hit' | 'miss' | 'win' } {
    if (this.isMatchOver) throw new Error('Match has already concluded.');

    const player = this.getActivePlayer();
    if (segment > 0) player.dartsThrown.push({ segment, multiplier });
    this.dartsThisTurn++;

    if (segment !== player.currentTarget) {
      this.moveToNextPlayer();
      this.notifyChange();
      return { status: 'miss' };
    }

    player.currentTarget++;
    if (player.currentTarget > 20) {
      this.isMatchOver = true;
      this.winnerId = player.id;
      this.dartsThisTurn = 0;
      this.notifyChange();
      return { status: 'win' };
    }

    // A hit doesn't end the turn, but the turn is still capped at 3 darts.
    if (this.dartsThisTurn >= 3) {
      this.moveToNextPlayer();
      this.notifyChange();
      return { status: 'hit' };
    }

    this.notifyChange();
    return { status: 'hit' };
  }
}
