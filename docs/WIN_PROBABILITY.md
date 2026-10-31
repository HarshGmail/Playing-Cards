# Win probability (live win chances)

Technical reference for the per-player "chance to win this match" shown on an active
match's leaderboard. The player-facing explainer is `/rules/win-chances`
(`src/app/rules/win-chances/page.tsx`).

## Where the code lives

| Piece | File |
| --- | --- |
| Pure model: sampling, Monte Carlo, helpers | `src/lib/domain/winProbability.ts` |
| Unit tests | `src/lib/domain/winProbability.test.ts` |
| DB loader: history, today, current totals | `src/lib/stats/winProbability.ts` (`computeWinForecast`) |
| API | `src/app/api/matches/[id]/forecast/route.ts` |
| Client hook | `useWinForecastQuery` in `src/lib/queries/matchDetail.ts` |
| Query key | `matchKeys.forecast(id, version)` in `src/lib/queries/keys.ts` |
| UI | `src/components/match/WinChancePanel.tsx`, the `winChanceById` prop on `components/match/Leaderboard.tsx` |
| Planned-rounds input | `src/components/match/TargetRoundsField.tsx` (create step 1 and match settings) |

## Inputs

### `Match.targetRounds`

`number | null`, 1 to `MAX_TARGET_ROUNDS` (20, in `lib/schemas/match.ts`). It is set on
`POST /api/matches` and `PATCH /api/matches/[id]/settings`, and returned by
`GET /api/matches/[id]`. Older matches don't have the field, which reads as `null`.
With no target, no forecast is computed.

A **round** is one game per active player, so:

```
gamesPerRound = active players
targetGames   = max(targetRounds, ceil(gamesPlayed / gamesPerRound)) × gamesPerRound
remaining     = targetGames − gamesPlayed
```

Going past the plan extends the target to the next full round instead of letting
`remaining` go negative (`targetGameCount`).

### Score history

`computeWinForecast` loads every score from:

- the current match, and
- every non-deleted match of the **same game** with the same `rankPreference` that
  includes at least one of the active players.

"Same game" means:

- matches with no `gameType` count as Least Count;
- an `other` game matches on the exact `gameLabel`.

Each score row also gets a day key, which is the `enteredAt` date in `Asia/Kolkata`
(`APP_TIME_ZONE`).

For each active player the rows are split into:

- `today`: every game whose day key equals today's, from any match, including the
  current one.
- `history`: everything else, newest first, capped at `HISTORY_GAMES_PER_PLAYER` (60).

A row is marked `won` when its value equals the best score of its game (min for
`lowest-first`, max for `highest-first`). Ties all count as wins, which matches
`computeGamesWon`.

`currentTotal` comes from `computeMatchLeaderboard`, so DNF cut-offs are respected.

## The model

Everything below is in `src/lib/domain/winProbability.ts`.

### Zero-winner detection

`isZeroWinnerGame` returns true when `rankPreference` is `lowest-first` and the best
score of a game is `0` in at least `ZERO_WINNER_SHARE` (80%) of the loaded games. That
describes Least Count (the player who shows scores 0) and any house variant played the
same way. In production data, 288 of 304 Least Count games had exactly one 0.

### Per-player score sampler

Each player's score is drawn from a mix of three pools:

| Pool | Values | Weight |
| --- | --- | --- |
| today | player's scores today | `count × TODAY_WEIGHT` (3) |
| history | player's older scores | `count` |
| prior | every loaded score from all players | `PRIOR_PSEUDO_GAMES` (10) |

In zero-winner mode only losing scores go into the pools, because the winner of each
game is chosen separately (next section). The prior is what keeps a player with one or
two recorded games from swinging to extremes. It acts like 10 games of
"typical player" data.

### Game-win strength (zero-winner mode)

```
strength = (wins_history + 3 × wins_today + 10 × 1/players)
         / (games_history + 3 × games_today + 10)
```

This is a smoothed win rate that starts at an even share (`1/players`) and moves toward
the player's own record as data accumulates (`gameWinStrength`).

### Simulation

`forecastWinProbabilities` runs `DEFAULT_SIMULATIONS` (4000) runs. Each run:

1. Starts from every player's `currentTotal`.
2. For each remaining game:
   - zero-winner mode: picks one winner with probability proportional to strength.
     The winner adds 0. Everyone else adds a draw from their sampler.
   - otherwise: every player adds a draw from their sampler.
3. Finds the best final total (min or max depending on `rankPreference`). Every player
   sharing it gets `1 / tiedCount` of a win.

`winProbability = wins / simulations`. `expectedTotal` is the mean final total.
Probabilities always sum to 1.

When `remaining = 0` the function returns the current standings (leader or leaders get
1, split on ties) without sampling. It returns `null` if remaining > 0 and some player
has no values in any pool. That only happens when the prior is empty, meaning there is
no score data at all.

### Determinism

The random number generator is a seeded mulberry32 (`createRng`). The seed is an FNV-1a
hash of `${matchId}:${match.version}` (`seedFrom`). The same match version always gives
the same numbers, so the percentages don't flicker on refetch. Every score entry, edit,
DNF change or settings save bumps `version`, which gives a new key and seed.

## API

```
GET /api/matches/[id]/forecast
-> { forecast: null | {
     targetRounds, gamesPlayed, targetGames, remainingGames,
     players: [{ playerId, winProbability, expectedTotal }]  // sorted by winProbability desc
   } }
```

- Visible to the creator, roster members and spectators. Anyone else gets 403.
- `forecast` is `null` when the match has ended, has no `targetRounds`, has fewer than
  two active players, or has no data to sample from.
- The client keys the query on `match.version` with `staleTime: Infinity`, so it only
  refetches when the match changes. `keepPreviousData` holds the old numbers while the
  new ones load.

Cost: two Mongo reads (same-game match ids, then their scores) plus the simulation.
Against production data this took about 300–400 ms per request. Only active matches
with a target are ever computed.

## Validation

To backtest, take every ended lowest-first Least Count / Least Count - 2 match with at
least 6 games, oldest first. Forecast each one from its halfway point, using only
matches that finished earlier as history. Run 2026-10-31 on 26 matches (87 player rows):

| Metric | Model | Halfway leader takes all |
| --- | --- | --- |
| Brier score (lower is better) | 0.136 | 0.161 |
| Favourite went on to win | 19 / 26 | 19 / 26 |

Calibration (predicted vs actual win rate):

| Predicted | n | Mean predicted | Actual |
| --- | --- | --- | --- |
| 0–20% | 42 | 9% | 10% |
| 20–40% | 18 | 28% | 22% |
| 40–60% | 13 | 53% | 46% |
| 60–80% | 11 | 71% | 82% |
| 80–100% | 3 | 85% | 100% |

The model picks the same favourite as "whoever leads at halfway". What it adds is
honest probabilities: low numbers are well calibrated, and the top end is slightly
under-confident. The sample is small, so treat this as a sanity check, not a tuning
target.

## Known limitations and tuning

- **Independence.** Each player's score is drawn on its own. The model doesn't capture
  players changing strategy based on the standings (going aggressive when behind,
  dropping safe when ahead).
- **No per-round trend.** In Least Count, losing scores don't depend on the round
  number, so history is treated as unordered. The only recency signal is the today
  versus older split.
- **Opponent mix.** History pools scores against whoever was at the table. A player's
  numbers are not adjusted for opponent strength (rating does that, separately).
- **Knobs.** `TODAY_WEIGHT`, `PRIOR_PSEUDO_GAMES`, `HISTORY_GAMES_PER_PLAYER`,
  `ZERO_WINNER_SHARE` and `DEFAULT_SIMULATIONS` are exported constants. The explainer
  page reads the same constants, so it stays in sync when they change. Re-run the
  backtest above after changing any of them.
