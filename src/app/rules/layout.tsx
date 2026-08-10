import Link from 'next/link';

/**
 * Rules pages live outside the (app) route group because they are public — the
 * point is being able to send the link to someone who has not signed up yet, so
 * they cannot depend on the authenticated shell or its Header.
 */
export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span>♠</span>
            <span className="hidden sm:inline">Playing Cards</span>
          </Link>
          <Link
            href="/rules"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            All game rules
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
