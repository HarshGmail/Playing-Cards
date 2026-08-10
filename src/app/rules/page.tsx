import type { Metadata } from 'next';
import Link from 'next/link';
import { GAMES, GAME_TYPES } from '@/lib/games/catalog';

export const metadata: Metadata = {
  title: 'Game Rules | Playing Cards',
  description: 'House rules for the card games this app keeps score for.',
};

export default function RulesIndexPage() {
  const documented = GAME_TYPES.map((type) => GAMES[type]).filter(
    (game) => game.rulesPath !== null
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Game rules</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        House rules for the games this app keeps score for. Share these links freely — no
        account needed to read them.
      </p>

      <ul className="mt-8 space-y-3">
        {documented.map((game) => (
          <li key={game.type}>
            <Link
              href={game.rulesPath as string}
              className="block rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-blue-500 dark:hover:border-blue-500 transition"
            >
              <span className="font-semibold text-gray-900 dark:text-white">
                {game.label}
              </span>
              <span className="block mt-1 text-sm text-gray-600 dark:text-gray-400">
                {game.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
