import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

export const RATING_EXPLAINER_PATH = '/rules/rating';

export default function RatingHelpLink({ className = '' }: { className?: string }) {
  return (
    <Link
      href={RATING_EXPLAINER_PATH}
      aria-label="How rating works"
      title="How rating works"
      className={`inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5" />
      <span>How it works</span>
    </Link>
  );
}
