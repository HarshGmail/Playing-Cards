'use client';

import { Check, Loader2, X } from 'lucide-react';
import type { UsernameAvailability } from './useUsernameAvailability';
import { ERROR_CLASS, HINT_CLASS, INPUT_CLASS, LABEL_CLASS, SUCCESS_CLASS } from './fieldStyles';

interface UsernameFieldProps {
  value: string;
  onChange: (raw: string) => void;
  rejection: string | null;
  formatError: string | null;
  availability: UsernameAvailability;
  alternatives: string[];
  onPickAlternative: (candidate: string) => void;
  showErrors: boolean;
  disabled: boolean;
}

function StatusIcon({ availability }: { availability: UsernameAvailability }) {
  if (availability === 'checking') return <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden />;
  if (availability === 'available') return <Check className="h-4 w-4 text-emerald-600" aria-hidden />;
  if (availability === 'taken') return <X className="h-4 w-4 text-red-600" aria-hidden />;
  return null;
}

function statusMessage(value: string, availability: UsernameAvailability): { text: string; tone: 'ok' | 'error' | 'neutral' } | null {
  if (availability === 'available') return { text: `@${value} is available`, tone: 'ok' };
  if (availability === 'taken') return { text: `@${value} is taken`, tone: 'error' };
  if (availability === 'unknown') return { text: "Couldn't check right now. You can still try it", tone: 'neutral' };
  return null;
}

export default function UsernameField({
  value,
  onChange,
  rejection,
  formatError,
  availability,
  alternatives,
  onPickAlternative,
  showErrors,
  disabled,
}: UsernameFieldProps) {
  const formatMessage = value || showErrors ? formatError : null;
  const status = value && !formatError ? statusMessage(value, availability) : null;
  const message = rejection ?? formatMessage;
  const describedBy = 'username-message';

  return (
    <div>
      <label htmlFor="signup-username" className={LABEL_CLASS}>
        Username
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">@</span>
        <input
          id="signup-username"
          type="text"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="john_doe"
          aria-invalid={!!message || availability === 'taken'}
          aria-describedby={describedBy}
          disabled={disabled}
          className={`${INPUT_CLASS} pl-9 pr-10`}
        />
        <span className="absolute inset-y-0 right-4 flex items-center">
          <StatusIcon availability={value && !formatError ? availability : 'idle'} />
        </span>
      </div>

      <div id={describedBy} aria-live="polite">
        {message && (
          <p role="alert" className={ERROR_CLASS}>
            {message}
          </p>
        )}
        {!message && status?.tone === 'ok' && <p className={SUCCESS_CLASS}>{status.text}</p>}
        {!message && status?.tone === 'error' && <p className={ERROR_CLASS}>{status.text}</p>}
        {!message && status?.tone === 'neutral' && <p className={HINT_CLASS}>{status.text}</p>}
        {!message && !status && !value && <p className={HINT_CLASS}>Filled from your name. Change it if you like</p>}
      </div>

      {availability === 'taken' && alternatives.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {alternatives.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => onPickAlternative(candidate)}
              disabled={disabled}
              className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-200"
            >
              @{candidate}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
