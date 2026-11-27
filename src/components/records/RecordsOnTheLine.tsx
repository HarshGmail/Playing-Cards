'use client';

import { Flag } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import { useRecordChancesQuery } from '@/lib/queries/records';
import { describeChance, describeRecordToBeat } from '@/lib/domain/recordCopy';
import type { PlayersById, RecordChanceView } from '@/types';

interface RecordsOnTheLineProps {
  matchId: string;
  roundsPlayed: number;
  active: boolean;
  playersById: PlayersById;
}

function chanceCopy(chance: RecordChanceView) {
  const input = { ...chance, record: chance.record ? { name: chance.record.name, count: chance.record.count } : null };
  return { headline: describeChance(input), recordLine: describeRecordToBeat(input) };
}

export default function RecordsOnTheLine({ matchId, roundsPlayed, active, playersById }: RecordsOnTheLineProps) {
  const { data } = useRecordChancesQuery(matchId, roundsPlayed, active);
  const chances = data?.chances ?? [];
  if (!active || chances.length === 0) return null;

  return (
    <section
      aria-labelledby="records-on-the-line-heading"
      className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 dark:border-violet-800/60 dark:from-violet-900/20 dark:to-fuchsia-900/10"
    >
      <h3
        id="records-on-the-line-heading"
        className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200"
      >
        <Flag className="h-4 w-4" aria-hidden />
        Records on the line
      </h3>
      <p className="mt-0.5 text-xs text-violet-700/80 dark:text-violet-300/80">
        Fastest-to records in {data?.gameName} someone here could break this match.
      </p>
      <ul className="mt-3 space-y-2.5">
        {chances.map((chance) => {
          const { headline, recordLine } = chanceCopy(chance);
          const identity = playersById[chance.playerId];
          return (
            <li key={`${chance.playerId}-${chance.kind}-${chance.threshold}`} className="flex items-start gap-2.5">
              <Avatar name={chance.playerName} profilePicUrl={identity?.profilePicUrl} size={28} />
              <div className="min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-semibold">{chance.playerName}</span>: {headline}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{recordLine}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
