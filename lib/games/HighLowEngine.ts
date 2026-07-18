import type { DartThrow } from '../DartsMatchEngine';

export interface HighLowPlayer {
  id: string;
  name: string;
  roundWins: number;
  dartsThrown: DartThrow[]; // every real dart thrown, for the board visualization
  photo?: string;
}

export interface HighLowMatchState {
  players: HighLowPlayer[];
  currentPlayerIndex: number;
  dartsThisTurn: number;
  currentRoundSums: Record<string, number>;
  roundNumber: number;
  roundsToWin: number;
  lastRoundSums: Record<string, number> | null;
  lastRoundWinnerId: string | null;
  isMatchOver: boolean;
  winnerId: string | null;
}

/**
 * High-Low: every round, each player throws 3 darts and their sum is compared. Whoever has
 * the single highest sum takes the round point; an exact tie for the top sum awards nobody.
 * First to reach the configured number of round wins takes the match.
 */
export class HighLowEngine {
  public players: HighLowPlayer[];
  public currentPlayerIndex: number = 0;
  public dartsThisTurn: number = 0;
  public currentRoundSums: Record<string, number> = {};
  public roundNumber: number = 1;
  public roundsToWin: number;
  public lastRoundSums: Record<string, number> | null = null;
  public lastRoundWinnerId: string | null = null;
  public isMatchOver: boolean = false;
  public winnerId: string | null = null;

  private onChange?: (state: HighLowMatchState) => void;

  constructor(playerNames: string[], roundsToWin: number = 5, onChange?: (state: HighLowMatchState) => void) {
    this.players = playerNames.map((name, index) => ({
      id: `player_${index + 1}`,
      name,
      roundWins: 0,
      dartsThrown: []
    }));
    this.roundsToWin = Math.max(1, roundsToWin);
    this.onChange = onChange;
  }

  public static restore(state: HighLowMatchState, onChange?: (state: HighLowMatchState) => void): HighLowEngine {
    const engine = new HighLowEngine(
      state.players.map(p => p.name),
      state.roundsToWin,
      onChange
    );
    engine.players = state.players.map(p => ({ ...p, dartsThrown: p.dartsThrown.map(d => ({ ...d })) }));
    engine.currentPlayerIndex = state.currentPlayerIndex;
    engine.dartsThisTurn = state.dartsThisTurn;
    engine.currentRoundSums = { ...state.currentRoundSums };
    engine.roundNumber = state.roundNumber;
    engine.lastRoundSums = state.lastRoundSums ? { ...state.lastRoundSums } : null;
    engine.lastRoundWinnerId = state.lastRoundWinnerId;
    engine.isMatchOver = state.isMatchOver;
    engine.winnerId = state.winnerId;
    return engine;
  }

  public toJSON(): HighLowMatchState {
    return {
      players: this.players.map(p => ({ ...p, dartsThrown: p.dartsThrown.map(d => ({ ...d })) })),
      currentPlayerIndex: this.currentPlayerIndex,
      dartsThisTurn: this.dartsThisTurn,
      currentRoundSums: { ...this.currentRoundSums },
      roundNumber: this.roundNumber,
      roundsToWin: this.roundsToWin,
      lastRoundSums: this.lastRoundSums ? { ...this.lastRoundSums } : null,
      lastRoundWinnerId: this.lastRoundWinnerId,
      isMatchOver: this.isMatchOver,
      winnerId: this.winnerId
    };
  }

  private notifyChange(): void {
    this.onChange?.(this.toJSON());
  }

  public getActivePlayer(): HighLowPlayer {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * @param segment 1-20 for a numbered wedge, 25 for the bull, or 0 for a miss
   * @param multiplier 1 = single/outer-bull, 2 = double/bullseye, 3 = triple (bull has no triple)
   */
  public throwDart(segment: number, multiplier: 1 | 2 | 3 = 1): { value: number; roundComplete: boolean; matchOver: boolean } {
    if (this.isMatchOver) throw new Error('Match has already concluded.');

    const player = this.getActivePlayer();
    const value = segment * multiplier;
    if (segment > 0) player.dartsThrown.push({ segment, multiplier });
    this.dartsThisTurn++;
    this.currentRoundSums[player.id] = (this.currentRoundSums[player.id] ?? 0) + value;

    let roundComplete = false;
    if (this.dartsThisTurn >= 3) {
      this.dartsThisTurn = 0;
      this.currentPlayerIndex++;
      if (this.currentPlayerIndex >= this.players.length) {
        this.currentPlayerIndex = 0;
        roundComplete = true;

        const maxSum = Math.max(...this.players.map(p => this.currentRoundSums[p.id] ?? 0));
        const topPlayers = this.players.filter(p => (this.currentRoundSums[p.id] ?? 0) === maxSum);
        const roundWinner = topPlayers.length === 1 ? topPlayers[0] : null;
        if (roundWinner) roundWinner.roundWins++;

        this.lastRoundSums = { ...this.currentRoundSums };
        this.lastRoundWinnerId = roundWinner ? roundWinner.id : null;
        this.currentRoundSums = {};
        this.roundNumber++;

        if (roundWinner && roundWinner.roundWins >= this.roundsToWin) {
          this.isMatchOver = true;
          this.winnerId = roundWinner.id;
        }
      }
    }

    this.notifyChange();
    return { value, roundComplete, matchOver: this.isMatchOver };
  }
}
