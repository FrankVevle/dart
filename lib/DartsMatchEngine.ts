// Exact board location of a single dart: segment 1-20, or 25 for the bull (multiplier 2 = bullseye/50).
export interface DartThrow {
  segment: number;
  multiplier: 1 | 2 | 3;
}

export interface DartPlayer {
  id: string;
  name: string;
  currentScore: number;
  legsWon: number;
  history: number[][][]; // history[legIndex][turnIndex] = darts, e.g. [[[20,60,5],[20,20,20]], [[60,60,60]]]
  dartsThrown: DartThrow[]; // every real (non-miss) dart this player has thrown, for board visualization
  photo?: string; // optional data URL, shown as the marker for this player's darts on the board
}

// Every dart that can be thrown as a non-final dart in a checkout combo (any single/double/
// triple/bull), ordered so the search below tends to surface the biggest/most common throws
// first (e.g. T20 over S20) when several options score the same.
const DART_OPTIONS: Array<{ value: number; label: string }> = [
  ...Array.from({ length: 20 }, (_, i) => ({ value: (20 - i) * 3, label: `T${20 - i}` })),
  ...Array.from({ length: 20 }, (_, i) => ({ value: (20 - i) * 2, label: `D${20 - i}` })),
  { value: 50, label: 'BULLSEYE' },
  ...Array.from({ length: 20 }, (_, i) => ({ value: 20 - i, label: `S${20 - i}` })),
  { value: 25, label: 'BULL' }
];

// Darts that can legally end a double-out leg.
const DOUBLE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 50, label: 'BULLSEYE' },
  ...Array.from({ length: 20 }, (_, i) => ({ value: (20 - i) * 2, label: `D${20 - i}` }))
];

export interface MatchConfig {
  startingScore: 301 | 501;
  doubleOut: boolean;
  legsToWin: number; // first to this many legs wins the match
  // "Duo" house rule: whenever a player's score, after a committed turn, exactly matches
  // another active player's current score, that opponent is sent back to startingScore.
  sameScorePenalty?: boolean;
}

// Everything needed to reconstruct a DartsMatchEngine exactly where it left off.
export interface MatchState {
  players: DartPlayer[];
  currentPlayerIndex: number;
  config: MatchConfig;
  currentTurnDarts: number[];
  isLegOver: boolean;
  isMatchOver: boolean;
  legWinnerId: string | null;
  matchWinnerId: string | null;
}

export class DartsMatchEngine {
  public players: DartPlayer[];
  public currentPlayerIndex: number = 0;
  public config: MatchConfig;
  public currentTurnDarts: number[] = []; // Up to 3 darts for the active turn
  public isLegOver: boolean = false;
  public isMatchOver: boolean = false;
  public legWinnerId: string | null = null;
  public matchWinnerId: string | null = null;

  /**
   * Called after every state-mutating action with the full serialized state.
   * Wire this to localStorage/AsyncStorage/a DB write/etc. to persist across reloads —
   * the engine itself stays storage-agnostic.
   */
  private onChange?: (state: MatchState) => void;

  constructor(
    playerNames: string[],
    config: MatchConfig = { startingScore: 501, doubleOut: true, legsToWin: 1 },
    onChange?: (state: MatchState) => void
  ) {
    this.config = config;
    this.players = playerNames.map((name, index) => ({
      id: `player_${index + 1}`,
      name,
      currentScore: config.startingScore,
      legsWon: 0,
      history: [[]], // one turn-array per leg, starting with leg 1
      dartsThrown: []
    }));
    this.onChange = onChange;
  }

  /**
   * Rebuild an engine from a previously persisted state (e.g. loaded from localStorage
   * on app startup) so an in-progress match survives a reload.
   */
  public static restore(state: MatchState, onChange?: (state: MatchState) => void): DartsMatchEngine {
    const engine = new DartsMatchEngine(
      state.players.map(p => p.name),
      state.config,
      onChange
    );
    engine.players = state.players.map(p => ({
      ...p,
      history: p.history.map(leg => leg.map(turn => [...turn])),
      dartsThrown: p.dartsThrown.map(d => ({ ...d }))
    }));
    engine.currentPlayerIndex = state.currentPlayerIndex;
    engine.currentTurnDarts = [...state.currentTurnDarts];
    engine.isLegOver = state.isLegOver;
    engine.isMatchOver = state.isMatchOver;
    engine.legWinnerId = state.legWinnerId;
    engine.matchWinnerId = state.matchWinnerId;
    return engine;
  }

  /**
   * Full, JSON-serializable snapshot of the match — persist this to bring it back later.
   */
  public toJSON(): MatchState {
    return {
      players: this.players.map(p => ({
        ...p,
        history: p.history.map(leg => leg.map(turn => [...turn])),
        dartsThrown: p.dartsThrown.map(d => ({ ...d }))
      })),
      currentPlayerIndex: this.currentPlayerIndex,
      config: this.config,
      currentTurnDarts: [...this.currentTurnDarts],
      isLegOver: this.isLegOver,
      isMatchOver: this.isMatchOver,
      legWinnerId: this.legWinnerId,
      matchWinnerId: this.matchWinnerId
    };
  }

  private notifyChange(): void {
    this.onChange?.(this.toJSON());
  }

  /**
   * Get the player whose turn it currently is
   */
  public getActivePlayer(): DartPlayer {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * Wipes the buffered darts for the in-progress turn without touching committed scores —
   * useful for a UI "undo turn" button when a dart was mis-entered.
   */
  public undoCurrentTurn(): void {
    this.currentTurnDarts = [];
    this.notifyChange();
  }

  /**
   * Records a single dart throw by its exact board location.
   * @param segment 1-20 for a numbered wedge, 25 for the bull, or 0 for a miss
   * @param multiplier 1 = single/outer-bull, 2 = double/bullseye, 3 = triple (bull has no triple)
   */
  public throwDart(
    segment: number,
    multiplier: 1 | 2 | 3 = 1
  ): { status: 'valid' | 'bust' | 'leg-win' | 'match-win'; scoreRemaining: number; sentBackPlayerIds?: string[] } {
    if (this.isMatchOver) throw new Error('Match has already concluded.');
    if (this.isLegOver) throw new Error('Leg has concluded. Call startNextLeg().');
    if (this.currentTurnDarts.length >= 3) throw new Error('Turn already complete. Call commitTurn().');

    const player = this.getActivePlayer();
    const value = segment * multiplier;
    const isDouble = multiplier === 2;

    // A miss (segment 0) has no real board location, so it isn't recorded for visualization.
    if (segment > 0) player.dartsThrown.push({ segment, multiplier });

    // Calculate what the score *would* be if this dart counts
    const currentTurnTotal = this.currentTurnDarts.reduce((a, b) => a + b, 0) + value;
    const projectScore = player.currentScore - currentTurnTotal;

    // 1. Win Check — must land on exactly 0, and on a double if doubleOut is required
    const checkoutValid = !this.config.doubleOut || isDouble;
    if (projectScore === 0 && checkoutValid) {
      this.currentTurnDarts.push(value);
      player.currentScore = 0;
      player.history[player.history.length - 1].push([...this.currentTurnDarts]);
      this.currentTurnDarts = [];

      player.legsWon += 1;
      this.legWinnerId = player.id;
      this.isLegOver = true;

      if (player.legsWon >= this.config.legsToWin) {
        this.isMatchOver = true;
        this.matchWinnerId = player.id;
        this.notifyChange();
        return { status: 'match-win', scoreRemaining: 0 };
      }
      this.notifyChange();
      return { status: 'leg-win', scoreRemaining: 0 };
    }

    // 2. Bust Condition Check
    // Bust if: score goes below 0, lands on exactly 1 under double-out (no dart scores 1),
    // or lands on exactly 0 without the required double (can't finish that way).
    const bustsOnZero = projectScore === 0 && !checkoutValid;
    if (projectScore < 0 || bustsOnZero || (this.config.doubleOut && projectScore === 1)) {
      // Clear current turn darts immediately due to a bust — whole turn is voided
      this.currentTurnDarts = [];
      player.history[player.history.length - 1].push([0, 0, 0]); // Log an empty/failed turn
      this.moveToNextPlayer();
      this.notifyChange();
      return { status: 'bust', scoreRemaining: player.currentScore };
    }

    // 3. Valid throw, append to current turn array
    this.currentTurnDarts.push(value);

    // If they have thrown all 3 darts, auto-commit the turn (commitTurn() notifies on its own)
    if (this.currentTurnDarts.length === 3) {
      const { sentBackPlayerIds } = this.commitTurn();
      const prevIndex =
        this.currentPlayerIndex === 0 ? this.players.length - 1 : this.currentPlayerIndex - 1;
      return { status: 'valid', scoreRemaining: this.players[prevIndex].currentScore, sentBackPlayerIds };
    }

    this.notifyChange();
    return { status: 'valid', scoreRemaining: player.currentScore - this.currentTurnDarts.reduce((a, b) => a + b, 0) };
  }

  /**
   * Commits the current (possibly partial) 3-dart turn and passes the turn forward.
   * Returns the ids of any opponents sent back to startingScore by the "duo" same-score
   * house rule (see MatchConfig.sameScorePenalty).
   */
  public commitTurn(): { sentBackPlayerIds?: string[] } {
    if (this.isMatchOver || this.isLegOver || this.currentTurnDarts.length === 0) {
      this.moveToNextPlayer();
      this.notifyChange();
      return {};
    }

    const player = this.getActivePlayer();
    const turnTotal = this.currentTurnDarts.reduce((a, b) => a + b, 0);

    player.currentScore -= turnTotal;
    player.history[player.history.length - 1].push([...this.currentTurnDarts]);

    let sentBackPlayerIds: string[] | undefined;
    if (this.config.sameScorePenalty) {
      const collisions = this.players.filter(p => p.id !== player.id && p.currentScore === player.currentScore);
      if (collisions.length > 0) {
        collisions.forEach(p => (p.currentScore = this.config.startingScore));
        sentBackPlayerIds = collisions.map(p => p.id);
      }
    }

    this.currentTurnDarts = [];
    this.moveToNextPlayer();
    this.notifyChange();
    return { sentBackPlayerIds };
  }

  /**
   * Cycles the active player index
   */
  private moveToNextPlayer(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  /**
   * Resets scores for a new leg after the current one has been won.
   * Loser of the previous leg throws first, per standard darts convention.
   */
  public startNextLeg(): void {
    if (this.isMatchOver) throw new Error('Match has already concluded.');
    if (!this.isLegOver) throw new Error('Current leg is still in progress.');

    this.players.forEach(p => {
      p.currentScore = this.config.startingScore;
      p.history.push([]); // open a fresh turn-array for the new leg
    });
    this.currentTurnDarts = [];
    this.isLegOver = false;

    const winnerIndex = this.players.findIndex(p => p.id === this.legWinnerId);
    this.currentPlayerIndex = (winnerIndex + 1) % this.players.length;
    this.legWinnerId = null;
    this.notifyChange();
  }

  /**
   * Finds a valid checkout for the given remaining score using at most `dartsRemaining`
   * darts (defaults to a fresh 3-dart turn) — respecting whether the match requires a
   * double (or bullseye) to finish. Returns null if there's no way to finish within that
   * many darts, including the seven classic "bogey" scores (169, 168, 166, 165, 163, 162,
   * 159) that no combination of real dart values can reach in 3.
   *
   * Capping the search to the darts actually left in the turn matters: a hint that assumes
   * 3 fresh darts are always available is nonsense (and misleading) once one or two have
   * already been thrown this turn.
   */
  public getCheckoutHint(score: number, dartsRemaining: number = 3): string[] | null {
    if (score > 170 || score <= 0 || dartsRemaining <= 0) return null;

    const finishOptions = this.config.doubleOut ? DOUBLE_OPTIONS : DART_OPTIONS;

    const direct = finishOptions.find(d => d.value === score);
    if (direct) return [direct.label];

    if (dartsRemaining >= 2) {
      for (const first of DART_OPTIONS) {
        if (first.value >= score) continue;
        const finish = finishOptions.find(d => d.value === score - first.value);
        if (finish) return [first.label, finish.label];
      }
    }

    if (dartsRemaining >= 3) {
      for (const first of DART_OPTIONS) {
        if (first.value >= score) continue;
        for (const second of DART_OPTIONS) {
          const remaining = score - first.value - second.value;
          if (remaining <= 0) continue;
          const finish = finishOptions.find(d => d.value === remaining);
          if (finish) return [first.label, second.label, finish.label];
        }
      }
    }

    return null;
  }
}

/**
 * Optional browser helper: persist an engine's state to localStorage on every change,
 * and restore it on load. Not used by DartsMatchEngine itself — the engine only knows
 * about the `onChange` callback, so swap this out for AsyncStorage/a DB write/etc.
 * on other platforms.
 */
export function createLocalStoragePersistedMatch(
  playerNames: string[],
  config: MatchConfig,
  storageKey: string = 'darts-match-state'
): DartsMatchEngine {
  const saved = window.localStorage.getItem(storageKey);
  const onChange = (state: MatchState) => window.localStorage.setItem(storageKey, JSON.stringify(state));

  if (saved) {
    return DartsMatchEngine.restore(JSON.parse(saved) as MatchState, onChange);
  }
  return new DartsMatchEngine(playerNames, config, onChange);
}
