import { ordinal } from './milestones';
import { formatWinPct } from './ratingTier';
import { formatStrikeRate, matchWinRate, strikeRate } from './winRates';

export type StatKind =
  | 'matchesPlayed'
  | 'matchWins'
  | 'matchWinPct'
  | 'gamesPlayed'
  | 'gamesWon'
  | 'gameStrikeRate'
  | 'averageRank'
  | 'dayStreak'
  | 'podiums';

export type CardSuit = '♠' | '♥' | '♦' | '♣';

export interface StatRecord {
  matchesPlayed: number;
  matchWins: number;
  gamesPlayed: number;
  gamesWon: number;
  averageRank?: number;
  currentDayStreak?: number;
  longestDayStreak?: number;
  podiums?: { first: number; second: number; third: number };
}

export interface StatExplanation {
  kind: StatKind;
  title: string;
  value: string;
  suit: CardSuit;
  scope: string;
  meaning: string;
  calculation: string | null;
  detail: string | null;
  hint: string;
}

export const ALL_GAMES_SCOPE = 'All games combined';

function count(n: number): string {
  return n.toLocaleString('en-IN');
}

function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count(n)} ${n === 1 ? singular : pluralForm}`;
}

function oneInEvery(rate: number, unit: string): string | null {
  if (rate <= 0) return null;
  const every = Math.round(1 / rate);
  return every <= 1 ? `You win almost every ${unit} you play.` : `That's about 1 in every ${every} ${unit}s.`;
}

function explainMatchesPlayed(record: StatRecord, scope: string): StatExplanation {
  return {
    kind: 'matchesPlayed',
    title: 'Matches',
    value: count(record.matchesPlayed),
    suit: '♣',
    scope,
    meaning:
      'A match is one whole session with your friends, from the first round until it ends. Matches still in progress count too.',
    calculation: null,
    detail:
      record.matchesPlayed > 0
        ? `You finished 1st in ${count(record.matchWins)} of them.`
        : 'Play your first match to start the count.',
    hint: 'Every match you have played',
  };
}

function explainMatchWins(record: StatRecord, scope: string): StatExplanation {
  return {
    kind: 'matchWins',
    title: 'Match Wins',
    value: count(record.matchWins),
    suit: '♥',
    scope,
    meaning: 'Matches where you finished 1st once the match ended. Sharing 1st place still counts as a win.',
    calculation: null,
    detail:
      record.matchesPlayed > 0
        ? `${plural(record.matchWins, 'win')} from ${plural(record.matchesPlayed, 'match', 'matches')}.`
        : null,
    hint: 'Matches you finished 1st',
  };
}

function explainMatchWinPct(record: StatRecord, scope: string): StatExplanation {
  const rate = matchWinRate(record.matchWins, record.matchesPlayed);
  const value = formatWinPct(rate);
  return {
    kind: 'matchWinPct',
    title: 'Match Win %',
    value,
    suit: '♥',
    scope,
    meaning: 'How often you win the whole match.',
    calculation:
      record.matchesPlayed > 0
        ? `${plural(record.matchWins, 'match win')} ÷ ${plural(record.matchesPlayed, 'match', 'matches')} × 100 = ${value}`
        : null,
    detail: oneInEvery(rate, 'match'),
    hint: 'Share of matches you won',
  };
}

function explainGamesPlayed(record: StatRecord, scope: string): StatExplanation {
  return {
    kind: 'gamesPlayed',
    title: 'Games',
    value: count(record.gamesPlayed),
    suit: '♣',
    scope,
    meaning: 'A game is one round inside a match. This counts every round you had a score in.',
    calculation: null,
    detail:
      record.matchesPlayed > 0
        ? `About ${Math.round(record.gamesPlayed / record.matchesPlayed)} games per match on average.`
        : null,
    hint: 'Every round you played',
  };
}

function explainGamesWon(record: StatRecord, scope: string): StatExplanation {
  return {
    kind: 'gamesWon',
    title: 'Game Wins',
    value: count(record.gamesWon),
    suit: '♦',
    scope,
    meaning: 'Rounds where you had the best score. If two players tie for the best score, both get the win.',
    calculation: null,
    detail:
      record.gamesPlayed > 0
        ? `${plural(record.gamesWon, 'win')} from ${plural(record.gamesPlayed, 'game')}.`
        : null,
    hint: 'Rounds you won',
  };
}

function explainGameStrikeRate(record: StatRecord, scope: string): StatExplanation {
  const rate = strikeRate(record.gamesWon, record.gamesPlayed);
  const value = formatStrikeRate(rate);
  return {
    kind: 'gameStrikeRate',
    title: 'Game Strike Rate',
    value,
    suit: '♦',
    scope,
    meaning: 'How often you win a single round, as a percentage.',
    calculation:
      record.gamesPlayed > 0
        ? `${plural(record.gamesWon, 'game win')} ÷ ${plural(record.gamesPlayed, 'game')} × 100 = ${value}`
        : null,
    detail: oneInEvery(rate, 'game'),
    hint: 'Share of rounds you won',
  };
}

function explainAverageRank(record: StatRecord, scope: string): StatExplanation {
  const average = record.averageRank ?? 0;
  return {
    kind: 'averageRank',
    title: 'Avg Rank',
    value: average.toFixed(1),
    suit: '♠',
    scope,
    meaning: 'Your average finishing position in matches that have ended. Lower is better: 1.0 would mean you won every one.',
    calculation: null,
    detail: average > 0 ? `On average you finish around ${ordinal(Math.round(average))}.` : null,
    hint: 'Average finishing position',
  };
}

function explainDayStreak(record: StatRecord, scope: string): StatExplanation {
  const current = record.currentDayStreak ?? 0;
  const best = record.longestDayStreak ?? 0;
  return {
    kind: 'dayStreak',
    title: 'Day Streak',
    value: count(current),
    suit: '♠',
    scope,
    meaning: 'Days in a row you have played at least one round. Missing a day resets it.',
    calculation: null,
    detail: `Your best run is ${plural(best, 'day')}.`,
    hint: 'Days in a row you played',
  };
}

function explainPodiums(record: StatRecord, scope: string): StatExplanation {
  const podiums = record.podiums ?? { first: 0, second: 0, third: 0 };
  const silverAndBronze = podiums.second + podiums.third;
  return {
    kind: 'podiums',
    title: 'Silver & Bronze',
    value: count(silverAndBronze),
    suit: '♠',
    scope,
    meaning: 'Matches where you finished 2nd or 3rd once the match ended.',
    calculation: `${count(podiums.second)} silver + ${count(podiums.third)} bronze = ${count(silverAndBronze)}`,
    detail: `Add your ${plural(podiums.first, 'win')} and you have been on the podium ${plural(podiums.first + silverAndBronze, 'time')}.`,
    hint: 'Matches you finished 2nd or 3rd',
  };
}

const EXPLAINERS: Record<StatKind, (record: StatRecord, scope: string) => StatExplanation> = {
  matchesPlayed: explainMatchesPlayed,
  matchWins: explainMatchWins,
  matchWinPct: explainMatchWinPct,
  gamesPlayed: explainGamesPlayed,
  gamesWon: explainGamesWon,
  gameStrikeRate: explainGameStrikeRate,
  averageRank: explainAverageRank,
  dayStreak: explainDayStreak,
  podiums: explainPodiums,
};

export function explainStat(kind: StatKind, record: StatRecord, scope = ALL_GAMES_SCOPE): StatExplanation {
  return EXPLAINERS[kind](record, scope);
}
