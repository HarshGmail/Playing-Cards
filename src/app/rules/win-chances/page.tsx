import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Target, History, Sun, Dices, Scale, Trophy } from 'lucide-react';
import {
  DEFAULT_SIMULATIONS,
  HISTORY_GAMES_PER_PLAYER,
  PRIOR_PSEUDO_GAMES,
  TODAY_WEIGHT,
  ZERO_WINNER_SHARE,
} from '@/lib/domain/winProbability';

export const metadata: Metadata = {
  title: 'How Win Chances Work | Playing Cards',
  description:
    'How the live win percentage during a match is worked out from past games and how today is going.',
};

const PERCENT = 100;
const EXAMPLE_PLAYERS = 5;
const EXAMPLE_ROUNDS = 3;
const EXAMPLE_GAMES_PLAYED = 8;

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

function IdeaCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{children}</p>
    </div>
  );
}

export default function WinChancesExplainerPage() {
  const exampleTargetGames = EXAMPLE_PLAYERS * EXAMPLE_ROUNDS;
  const exampleRemaining = exampleTargetGames - EXAMPLE_GAMES_PLAYED;

  return (
    <article className="space-y-14">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-10 text-white shadow-lg sm:px-10">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 select-none text-[11rem] leading-none opacity-10"
        >
          ♦
        </span>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">Win chances</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
          Who is likely to take this match?
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-blue-50/90">
          When a match has a planned number of rounds, the leaderboard shows each player&apos;s
          chance of finishing first. It updates after every game.
        </p>
      </header>

      <section className="space-y-5">
        <SectionHeading eyebrow="Setting it up" title="Planned rounds" />
        <p className="leading-relaxed text-gray-600 dark:text-gray-400">
          Pick <strong>Planned rounds</strong> when creating a match, or later from the gear button
          on the match page. One round is one game per active player. With {EXAMPLE_PLAYERS}{' '}
          players, {EXAMPLE_ROUNDS} rounds is {exampleTargetGames} games, so after{' '}
          {EXAMPLE_GAMES_PLAYED} games there are {exampleRemaining} left to play. If you keep going
          past the plan, the target extends to the next full round.
        </p>
      </section>

      <section className="space-y-5">
        <SectionHeading
          eyebrow="The short version"
          title="Play the rest of the match thousands of times"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <IdeaCard icon={<Dices className="h-5 w-5" />} title="Simulate">
            The remaining games are played out {DEFAULT_SIMULATIONS.toLocaleString()} times on the
            computer, each time with a different, realistic set of scores.
          </IdeaCard>
          <IdeaCard icon={<Trophy className="h-5 w-5" />} title="Count the wins">
            Your win chance is the share of those simulated matches where you finish first. Ties
            split the win.
          </IdeaCard>
          <IdeaCard icon={<Target className="h-5 w-5" />} title="Start from now">
            Every simulation starts from the real totals on the board, so a big lead counts, and it
            matters more the fewer games are left.
          </IdeaCard>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading
          eyebrow="Where the scores come from"
          title="Your own history in this game"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <IdeaCard icon={<History className="h-5 w-5" />} title="Past games">
            Each simulated score is drawn from your own past scores in the same game, up to your
            last {HISTORY_GAMES_PER_PLAYER}. Least Count history is not mixed with Exploding
            Kittens.
          </IdeaCard>
          <IdeaCard icon={<Sun className="h-5 w-5" />} title="How today is going">
            Games you played today, in any match, count {TODAY_WEIGHT}× as much as older ones. A hot
            or cold day shifts your chances.
          </IdeaCard>
          <IdeaCard icon={<Scale className="h-5 w-5" />} title="New players">
            Everyone is blended with about {PRIOR_PSEUDO_GAMES} games of the group&apos;s typical
            scores, so a couple of lucky games can&apos;t make someone a runaway favourite.
          </IdeaCard>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Least Count" title="Who wins each game" />
        <p className="leading-relaxed text-gray-600 dark:text-gray-400">
          In Least Count the player who shows scores 0 and everyone else scores their leftover
          cards. So for each simulated game, a winner is picked first, weighted by how often each
          player wins games (today counting {TODAY_WEIGHT}× again). Everyone else gets one of their
          own past losing scores. This kicks in for any lowest-wins game where the best score is 0
          in at least {Math.round(ZERO_WINNER_SHARE * PERCENT)}% of games; other games just draw
          every player&apos;s score from their history.
        </p>
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Keep in mind" title="What it does not know" />
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-gray-600 dark:text-gray-400">
          <li>
            It treats each player&apos;s game on its own. It does not know that people play
            differently when chasing a lead or protecting one.
          </li>
          <li>
            A chance is not a promise: a player at 20% should still win about one match in five.
          </li>
          <li>
            Win chances only show while a match is active and has planned rounds. They never affect
            ratings, stats or milestones.
          </li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/rules/rating"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          How rating works
        </Link>
        <Link
          href="/rules"
          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Game rules
        </Link>
      </div>
    </article>
  );
}
