import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Swords, Zap, Timer, Flag, Equal, History, Crown, Percent, Gauge, Flame, Award, CalendarDays } from 'lucide-react';
import RatingPlayground from '@/components/rating/RatingPlayground';
import { BASE_K, START_RATING, MAX_ROUNDS_WEIGHT } from '@/lib/domain/rating';
import { TIER_BADGE_CLASSES } from '@/lib/domain/ratingTier';
import {
  tierRanges,
  formatTierRange,
  winChanceByGap,
  weightByRounds,
  roundsAtMaxWeight,
} from '@/lib/domain/ratingExplainer';

export const metadata: Metadata = {
  title: 'How Rating Works | Playing Cards',
  description:
    'A chess-style rating for card nights: beat people, climb; upsets and long matches count for more.',
};

const RATING_GAPS = [0, 50, 100, 200, 400];
const SAMPLE_ROUND_COUNTS = [1, 3, 5, 10, 15, roundsAtMaxWeight()];

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function multiplier(value: number): string {
  return `${value.toFixed(1)}×`;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
  );
}

function IdeaCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{children}</p>
    </div>
  );
}

function FactRow({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{children}</p>
      </div>
    </li>
  );
}

function Bar({ fraction, className }: { fraction: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}

export default function RatingExplainerPage() {
  const winChances = winChanceByGap(RATING_GAPS);
  const roundWeights = weightByRounds(SAMPLE_ROUND_COUNTS);
  const tiers = tierRanges();

  return (
    <article className="space-y-14">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-10 sm:px-10 text-white shadow-lg">
        <span aria-hidden className="pointer-events-none absolute -right-6 -top-10 select-none text-[11rem] leading-none opacity-10">
          ♠
        </span>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">Rating</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold">One number for how well you play</h1>
        <p className="mt-3 max-w-xl text-blue-50/90 leading-relaxed">
          Everyone starts at <strong className="text-white">{START_RATING}</strong>. Finish ahead of people
          and it goes up; finish behind them and it goes down. It works like a chess rating, adapted for
          tables of three, four or more players.
        </p>
      </header>

      <section className="space-y-5">
        <SectionHeading eyebrow="The short version" title="Three ideas" />
        <div className="grid gap-4 sm:grid-cols-3">
          <IdeaCard icon={<Swords className="w-5 h-5" />} title="Every opponent is a duel">
            A four-player match counts as six head-to-heads. You win the duel against everyone you finished
            above and lose it to everyone who finished above you.
          </IdeaCard>
          <IdeaCard icon={<Zap className="w-5 h-5" />} title="Upsets pay more">
            Beating a higher-rated player earns more than beating a lower-rated one. Losing to someone the
            rating expected you to beat costs more.
          </IdeaCard>
          <IdeaCard icon={<Timer className="w-5 h-5" />} title="Long matches count more">
            Winning a 10-round match proves more than winning a 3-round one, so a longer match moves ratings
            further.
          </IdeaCard>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Upsets" title="What the rating expects" />
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Before each duel, the gap between two ratings sets how likely the higher-rated player is to win.
          You gain points when you do better than expected and lose them when you do worse.
        </p>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 space-y-3">
          {winChances.map(({ gap, chance }) => (
            <div key={gap} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {gap === 0 ? 'Equal ratings' : `${gap} points ahead`}
              </span>
              <Bar fraction={chance} className="bg-gradient-to-r from-blue-500 to-indigo-500" />
              <span className="text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                {percent(chance)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          So if you are 200 points ahead, beating that player is expected and earns little, while losing
          to them costs a lot.
        </p>
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Match length" title="More rounds, bigger swings" />
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Each match&apos;s rating change is multiplied by a weight that grows with the number of rounds,
          up to {multiplier(MAX_ROUNDS_WEIGHT)} from {roundsAtMaxWeight()} rounds on. A lucky hand can win
          a short match; a long one is harder to fluke.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {roundWeights.map(({ rounds, weight }) => (
            <div
              key={rounds}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-center"
            >
              <p className="text-xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                {multiplier(weight)}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {rounds} {rounds === 1 ? 'round' : 'rounds'}
              </p>
              <div className="mt-2">
                <Bar fraction={weight / MAX_ROUNDS_WEIGHT} className="bg-amber-400" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <RatingPlayground />
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="The fine print" title="What counts" />
        <ul className="space-y-4">
          <FactRow icon={<Flag className="w-4 h-4" />} title="Only finished matches">
            A match changes ratings when its creator ends it. Live matches show a leader but don&apos;t
            move anyone&apos;s rating yet.
          </FactRow>
          <FactRow icon={<Equal className="w-4 h-4" />} title="Ties split the duel">
            Two players who share a position each get half a win against each other.
          </FactRow>
          <FactRow icon={<Gauge className="w-4 h-4" />} title="Dropping out counts as last">
            A player who leaves mid-match (DNF) is placed below everyone who finished.
          </FactRow>
          <FactRow icon={<History className="w-4 h-4" />} title="Always rebuilt from history">
            Ratings are replayed from every finished match in the order they ended, so correcting a
            round&apos;s scores afterwards fixes everyone&apos;s rating too.
          </FactRow>
        </ul>
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Tiers" title="Where you stand" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-center"
            >
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${TIER_BADGE_CLASSES[tier.name]}`}
              >
                {tier.name}
              </span>
              <p className="mt-2 text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
                {formatTierRange(tier)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Other numbers on your profile" title="Rating vs Win % vs match wins" />
        <div className="grid gap-4 sm:grid-cols-3">
          <IdeaCard icon={<Gauge className="w-5 h-5" />} title="Rating">
            How strong you are, taking into account who you played and how long the matches were. Used to
            rank the leaderboards.
          </IdeaCard>
          <IdeaCard icon={<Percent className="w-5 h-5" />} title="Win %">
            Rounds you won divided by rounds you played, across every match, finished or not.
          </IdeaCard>
          <IdeaCard icon={<Crown className="w-5 h-5" />} title="Match wins">
            Finished matches where you came first. Each one is a crown in your trophy cabinet.
          </IdeaCard>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Just for fun" title="Streaks & milestones" />
        <div className="grid gap-4 sm:grid-cols-3">
          <IdeaCard icon={<Flame className="w-5 h-5" />} title="Hat-tricks and streak fire">
            Win three rounds in a row within a match for a hat-trick. Four, five and six in a row are
            counted too. While a streak of two or more is alive you get a 🔥 next to your name, and a
            match-win streak earns a ⚡. Rounds you sit out do not break a streak, and a new match starts
            fresh.
          </IdeaCard>
          <IdeaCard icon={<CalendarDays className="w-5 h-5" />} title="Days active">
            Every day you score in at least one round counts as an active day. Play on consecutive days to
            grow the streak; skip a whole day and it resets.
          </IdeaCard>
          <IdeaCard icon={<Award className="w-5 h-5" />} title="Milestones">
            Badges for round wins, match wins, matches played and streaks. You get a notification when you
            unlock one, and your profile shows what is next. They never affect your rating.
          </IdeaCard>
        </div>
      </section>

      <details className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-5">
        <summary className="cursor-pointer list-none font-semibold text-gray-900 dark:text-white flex items-center justify-between">
          The exact formula
          <span className="text-gray-400 transition group-open:rotate-45 text-xl leading-none">+</span>
        </summary>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          <p>For every pair of players A and B in a finished match:</p>
          <pre className="overflow-x-auto rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-3 text-xs text-gray-800 dark:text-gray-200">
{`expected = 1 / (1 + 10^((ratingB − ratingA) / 400))
actual   = 1 if A finished above B, ½ if tied, 0 if below
K        = ${BASE_K} × roundsWeight / (players − 1)
change   = K × (actual − expected)`}
          </pre>
          <p>
            A gains <code>change</code> and B loses the same amount, so points move between players rather
            than appearing from nowhere. Dividing K by the number of opponents keeps a big table from
            swinging ratings more than a small one.
          </p>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/profile"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          See your rating
        </Link>
        <Link
          href="/rules"
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Game rules
        </Link>
      </div>
    </article>
  );
}
