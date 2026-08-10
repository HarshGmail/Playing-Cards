import type { Metadata } from 'next';
// The canonical rules doc. Bundled as a string by the .md webpack rule in
// next.config.js, so this page and the repo doc can never drift apart.
import leastCountRules from '../../../../docs/LEAST_COUNT.md';
import MarkdownDoc from '@/components/common/MarkdownDoc';
import { GAMES } from '@/lib/games/catalog';

export const metadata: Metadata = {
  title: 'Least Count — Rules | Playing Cards',
  description: GAMES['least-count'].blurb,
};

export default function LeastCountRulesPage() {
  return <MarkdownDoc source={leastCountRules} />;
}
