'use client';

import { MAX_TARGET_ROUNDS } from '@/lib/schemas/match';

interface TargetRoundsFieldProps {
  value: number | null;
  onChange: (value: number | null) => void;
  fieldClassName: string;
  labelClassName: string;
}

const ROUND_OPTIONS = Array.from({ length: MAX_TARGET_ROUNDS }, (_, i) => i + 1);
const NO_TARGET = '';

export default function TargetRoundsField({
  value,
  onChange,
  fieldClassName,
  labelClassName,
}: TargetRoundsFieldProps) {
  return (
    <div>
      <label htmlFor="target-rounds" className={labelClassName}>
        Planned rounds
      </label>
      <select
        id="target-rounds"
        value={value ?? NO_TARGET}
        onChange={(e) => onChange(e.target.value === NO_TARGET ? null : Number(e.target.value))}
        className={fieldClassName}
      >
        <option value={NO_TARGET}>Not set</option>
        {ROUND_OPTIONS.map((rounds) => (
          <option key={rounds} value={rounds}>
            {rounds} {rounds === 1 ? 'round' : 'rounds'}
          </option>
        ))}
      </select>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        One round is one game per player, so 3 rounds with 5 players is 15 games. Setting this turns
        on live win chances.
      </p>
    </div>
  );
}
