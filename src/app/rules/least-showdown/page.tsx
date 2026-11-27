import type { Metadata } from 'next';
import leastShowdownRules from '../../../../docs/LEAST_SHOWDOWN.md';
import MarkdownDoc from '@/components/common/MarkdownDoc';
import { LEAST_SHOWDOWN } from '@/lib/games/catalog';

export const metadata: Metadata = {
  title: 'Least Showdown — Rules | Playing Cards',
  description: LEAST_SHOWDOWN.blurb,
};

export default function LeastShowdownRulesPage() {
  return <MarkdownDoc source={leastShowdownRules} />;
}
