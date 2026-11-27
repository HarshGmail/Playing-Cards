'use client';

import { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { passwordChecks } from '@/lib/domain/signupForm';
import { ERROR_CLASS, HINT_CLASS, INPUT_CLASS, LABEL_CLASS } from './fieldStyles';

interface PasswordFieldsProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  showErrors: boolean;
  disabled: boolean;
}

export default function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  showErrors,
  disabled,
}: PasswordFieldsProps) {
  const [visible, setVisible] = useState(false);
  const checks = passwordChecks(password);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const missingConfirm = showErrors && !confirmPassword;
  const weakPassword = showErrors && !checks.every((check) => check.passed);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="signup-password" className={LABEL_CLASS}>
          Password
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={visible ? 'text' : 'password'}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="••••••••"
            disabled={disabled}
            aria-describedby="password-checks"
            aria-invalid={weakPassword}
            className={`${INPUT_CLASS} pr-12`}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
        <ul id="password-checks" className="mt-2 flex flex-wrap gap-2">
          {checks.map((check) => (
            <li
              key={check.label}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                check.passed
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {check.passed && <Check className="h-3 w-3" aria-hidden />}
              {check.label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label htmlFor="signup-confirm" className={LABEL_CLASS}>
          Confirm password
        </label>
        <input
          id="signup-confirm"
          type={visible ? 'text' : 'password'}
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => onConfirmChange(event.target.value)}
          placeholder="••••••••"
          disabled={disabled}
          aria-invalid={mismatch || missingConfirm}
          className={INPUT_CLASS}
        />
        {mismatch && <p className={ERROR_CLASS}>Passwords don&apos;t match yet</p>}
        {missingConfirm && !mismatch && <p className={ERROR_CLASS}>Type your password again</p>}
        {!mismatch && !missingConfirm && confirmPassword && password === confirmPassword && (
          <p className={HINT_CLASS}>Passwords match</p>
        )}
      </div>
    </div>
  );
}
