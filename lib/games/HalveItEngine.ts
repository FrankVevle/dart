import type { DartThrow } from '../DartsMatchEngine';

export type HalveItRound =
  | { type: 'number'; value: number }
  | { type: 'double' }
  | { type: 'triple' }
  | { type: 'bull' };

// Classic 10-round card: a plain number scores with any multiplier, a "double"/"triple" round
// scores on any segment as long as the multiplier matches, and "bull" scores on either bull ring.
export const HALVE_IT_ROUNDS: HalveItRound[] = [
  { type: 'number', value: 20 },
  { type: 'double' },
  { type: 'number', value: 19 },
  { type: 'triple' },
  { type: 'number', value: 18 },
  { type: 'number', value: 17 },
  { type: 'bull' },
  { type: 'number', value: 16 },
  { type: 'number', value: 15 },
  { type: 'double' }
];

export interface HalveItPlayer {
  id: string;
  name: string;
  score: number;
  dartsThrown: DartThrow[]; // every real dart thrown, for the board visualization
  photo?: string;
}

export interface HalveItMatchState {
  players: HalveItPlayer[];
  currentRoundIndex: number;
  currentPlayerIndex: number;
  dartsThisTurn: number;
  turnPointsScored: number;
  isMatchOver: boolean;
  winnerIds: string[];
}

export function halveItRoundLabel(round: HalveItRound): string {
  if (round.type === 'number') return String(round.value);
  if (round.type === 'double') return 'Double';
  if (round.type === 'triple') return 'Triple';
  return 'Bull';
}

/**
 * Halve-it: 10 fixed rounds, everyone throws 3 darts per round at that round's target.
 * Any dart that matches scores normally; if a player's whole turn misses the target
 * entirely (zero points that round), their running total is halved (rounded down).
 * Highest total after all rounds wins — ties share the win.
 */
export class HalveItEngine {
  public players: HalveItPlayer[];
  public currentRoundIndex: number = 0;
  public currentPlayerIndex: number = 0;
  public dartsThisTurn: number = 0;
  public turnPointsScored: number = 0;
  public isMatchOver: boolean = false;
  public winnerIds: string[] = [];

  private onChange?: (state: HalveItMatchState) => void;

  constructor(playerNames: string[], onChange?: (state: HalveItMatchState) => void) {
    this.players = playerNames.map((name, index) => ({
      id: `player_${index + 1}`,
      name,
      score: 0,
      dartsThrown: []
    }));
    this.onChange = onChange;
  }

  public static restore(state: HalveItMatchState, onChange?: (state: HalveItMatchState) => void): HalveItEngine {
    const engine = new HalveItEngine(
      state.players.map(p => p.name),
      onChange
    );
    engine.players = state.players.map(p => ({ ...p, dartsThrown: p.dartsThrown.map(d => ({ ...d })) }));
    engine.currentRoundIndex = state.currentRoundIndex;
    engine.currentPlayerIndex = state.currentPlayerIndex;
    engine.dartsThisTurn = state.dartsThisTurn;
    engine.turnPointsScored = state.turnPointsScored;
    engine.isMatchOver = state.isMatchOver;
    engine.winnerIds = [...state.winnerIds];
    return engine;
  }

  public toJSON(): HalveItMatchState {
    return {
      players: this.players.map(p => ({ ...p, dartsThrown: p.dartsThrown.map(d => ({ ...d })) })),
      currentRoundIndex: this.currentRoundIndex,
      currentPlayerIndex: this.currentPlayerIndex,
      dartsThisTurn: this.dartsThisTurn,
      turnPointsScored: this.turnPointsScored,
      isMatchOver: this.isMatchOver,
      winnerIds: [...this.winnerIds]
    };
  }

  private notifyChange(): void {
    this.onChange?.(this.toJSON());
  }

  public getActivePlayer(): HalveItPlayer {
    return this.players[this.currentPlayerIndex];
  }

  public getCurrentRound(): HalveItRound {
    return HALVE_IT_ROUNDS[this.currentRoundIndex];
  }

  private advanceTurn(): void {
    this.dartsThisTurn = 0;
    this.turnPointsScored = 0;
    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
      this.currentRoundIndex++;
      if (this.currentRoundIndex >= HALVE_IT_ROUNDS.length) {
        this.isMatchOver = true;
        const maxScore = Math.max(...this.players.map(p => p.score));
        this.winnerIds = this.players.filter(p => p.score === maxScore).map(p => p.id);
      }
    }
  }

  /**
   * @param segment 1-20 for a numbered wedge, 25 for the bull, or 0 for a miss
   * @param multiplier 1 = single/outer-bull, 2 = double/bullseye, 3 = triple (bull has no triple)
   */
  public throwDart(
    segment: number,
    multiplier: 1 | 2 | 3 = 1
  ): { status: 'hit' | 'miss' | 'win'; pointsScored: number; halved: boolean } {
    if (this.isMatchOver) throw new Error('Match has already concluded.');

    const player = this.getActivePlayer();
    if (segment > 0) player.dartsThrown.push({ segment, multiplier });
    this.dartsThisTurn++;

    const round = this.getCurrentRound();
    let pointsScored = 0;
    if (round.type === 'number') {
      if (segment === round.value) pointsScored = segment * multiplier;
    } else if (round.type === 'double') {
      if (segment > 0 && multiplier === 2) pointsScored = segment * 2;
    } else if (round.type === 'triple') {
      if (segment > 0 && segment !== 25 && multiplier === 3) pointsScored = segment * 3;
    } else if (round.type === 'bull') {
      if (segment === 25) pointsScored = multiplier === 2 ? 50 : 25;
    }

    if (pointsScored > 0) {
      player.score += pointsScored;
      this.turnPointsScored += pointsScored;
    }

    let halved = false;
    if (this.dartsThisTurn >= 3) {
      if (this.turnPointsScored === 0) {
        player.score = Math.floor(player.score / 2);
        halved = true;
      }
      this.advanceTurn();
    }

    this.notifyChange();
    if (this.isMatchOver) return { status: 'win', pointsScored, halved };
    return { status: pointsScored > 0 ? 'hit' : 'miss', pointsScored, halved };
  }
}
