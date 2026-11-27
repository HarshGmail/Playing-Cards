import Link from 'next/link';
import { LogIn, Plus } from 'lucide-react';

const PRIMARY_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950';
const SECONDARY_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus-visible:ring-offset-gray-950';

export default function QuickActions() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link href="/matches/create" className={PRIMARY_CLASS}>
        <Plus className="h-4 w-4" aria-hidden />
        Start a match
      </Link>
      <Link href="/matches/join" className={SECONDARY_CLASS}>
        <LogIn className="h-4 w-4" aria-hidden />
        Join with code
      </Link>
    </div>
  );
}
