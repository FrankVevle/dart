import type { DartThrow } from '../DartsMatchEngine';

export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25] as const;

export interface CricketPlayer {
  id: string;
  name: string;
  marks: Record<number, number>; // keyed by target segment (15-20, 25 for bull), 0-3
  score: number;
  dartsThrown: DartThrow[]; // every real dart thrown, for the board visualization
  photo?: string;
}

export interface CricketMatchState {
  players: CricketPlayer[];
  currentPlayerIndex: number;
  dartsThisTurn: number;
  isMatchOver: boolean;
  winnerId: string | null;
}

function freshMarks(): Record<number, number> {
  const marks: Record<number, number> = {};
  CRICKET_TARGETS.forEach(t => (marks[t] = 0));
  return marks;
}

/**
 * Cricket: 15-20 and Bull are each "closed" with 3 marks (single = 1, double = 2, triple = 3;
 * bull has no triple, so a bullseye is worth 2 marks). Once you've closed a number, extra marks
 * on it score points equal to its value — but only while at least one opponent still has it open.
 * Win requires having closed every number AND having a score at least equal to every opponent's.
 */
export class CricketEngine {
  public players: CricketPlayer[];
  public currentPlayerIndex: number = 0;
  public dartsThisTurn: number = 0;
  public isMatchOver: boolean = false;
  public winnerId: string | null = null;

  private onChange?: (state: CricketMatchState) => void;

  constructor(playerNames: string[], onChange?: (state: CricketMatchState) => void) {
    this.players = playerNames.map((name, index) => ({
      id: `player_${index + 1}`,
      name,
      marks: freshMarks(),
      score: 0,
      dartsThrown: []
    }));
    this.onChange = onChange;
  }

  public static restore(state: CricketMatchState, onChange?: (state: CricketMatchState) => void): CricketEngine {
    const engine = new CricketEngine(
      state.players.map(p => p.name),
      onChange
    );
    engine.players = state.players.map(p => ({ ...p, marks: { ...p.marks }, dartsThrown: p.dartsThrown.map(d => ({ ...d })) }));
    engine.currentPlayerIndex = state.currentPlayerIndex;
    engine.dartsThisTurn = state.dartsThisTurn;
    engine.isMatchOver = state.isMatchOver;
    engine.winnerId = state.winnerId;
    return engine;
  }

  public toJSON(): CricketMatchState {
    return {
      players: this.players.map(p => ({ ...p, marks: { ...p.marks }, dartsThrown: p.dartsThrown.map(d => ({ ...d })) })),
      currentPlayerIndex: this.currentPlayerIndex,
      dartsThisTurn: this.dartsThisTurn,
      isMatchOver: this.isMatchOver,
      winnerId: this.winnerId
    };
  }

  private notifyChange(): void {
    this.onChange?.(this.toJSON());
  }

  public getActivePlayer(): CricketPlayer {
    return this.players[this.currentPlayerIndex];
  }

  public isClosedByAll(target: number): boolean {
    return this.players.every(p => (p.marks[target] ?? 0) >= 3);
  }

  private moveToNextPlayer(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.dartsThisTurn = 0;
  }

  /**
   * @param segment 1-20 for a numbered wedge, 25 for the bull, or 0 for a miss — only 15-20
   *   and 25 are cricket targets, anything else counts as a miss for scoring purposes
   * @param multiplier 1 = single/outer-bull, 2 = double/bullseye, 3 = triple (bull has no triple,
   *   so a 3 here is clamped down to a bullseye's 2 marks)
   */
  public throwDart(segment: number, multiplier: 1 | 2 | 3 = 1): { status: 'hit' | 'miss' | 'win'; pointsScored: number } {
    if (this.isMatchOver) throw new Error('Match has already concluded.');

    const player = this.getActivePlayer();
    if (segment > 0) player.dartsThrown.push({ segment, multiplier });
    this.dartsThisTurn++;

    const isTarget = (CRICKET_TARGETS as readonly number[]).includes(segment);
    if (!isTarget) {
      if (this.dartsThisTurn >= 3) this.moveToNextPlayer();
      this.notifyChange();
      return { status: 'miss', pointsScored: 0 };
    }

    const effectiveMultiplier = segment === 25 ? (Math.min(multiplier, 2) as 1 | 2) : multiplier;
    const current = player.marks[segment] ?? 0;
    const marksUsedToClose = Math.min(effectiveMultiplier, 3 - current);
    const extraMarks = effectiveMultiplier - marksUsedToClose;
    player.marks[segment] = Math.min(3, current + effectiveMultiplier);

    let pointsScored = 0;
    if (extraMarks > 0) {
      const allOthersClosed = this.players.filter(p => p.id !== player.id).every(p => (p.marks[segment] ?? 0) >= 3);
      if (!allOthersClosed) {
        pointsScored = segment * extraMarks;
        player.score += pointsScored;
      }
    }

    const allClosed = CRICKET_TARGETS.every(t => (player.marks[t] ?? 0) >= 3);
    const maxOtherScore = Math.max(0, ...this.players.filter(p => p.id !== player.id).map(p => p.score));
    if (allClosed && player.score >= maxOtherScore) {
      this.isMatchOver = true;
      this.winnerId = player.id;
      this.dartsThisTurn = 0;
      this.notifyChange();
      return { status: 'win', pointsScored };
    }

    if (this.dartsThisTurn >= 3) this.moveToNextPlayer();
    this.notifyChange();
    return { status: 'hit', pointsScored };
  }
}
