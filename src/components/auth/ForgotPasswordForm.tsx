'use client';

import { useState } from 'react';
import {
  useRecoverVerifyMutation,
  useRecoverResetMutation,
} from '@/lib/queries/auth';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const INPUT_CLASSES =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

const LABEL_CLASSES =
  'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const VERIFY_FIELDS = [
  { key: 'username', label: 'Username', type: 'text', autoComplete: 'username' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'dob', label: 'Date of Birth', type: 'date', autoComplete: 'bday' },
] as const;

type VerifyData = Record<(typeof VERIFY_FIELDS)[number]['key'], string>;

const EMPTY_VERIFY_DATA: VerifyData = {
  username: '',
  email: '',
  phone: '',
  dob: '',
};

export default function ForgotPasswordForm({
  onSuccess,
  onCancel,
}: ForgotPasswordFormProps) {
  const verifyMutation = useRecoverVerifyMutation();
  const resetMutation = useRecoverResetMutation();
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [verifyData, setVerifyData] = useState<VerifyData>(EMPTY_VERIFY_DATA);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await verifyMutation.mutateAsync({
        username: verifyData.username.trim(),
        email: verifyData.email.trim(),
        phone: verifyData.phone.trim(),
        dob: verifyData.dob,
      });
      setStep('reset');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await resetMutation.mutateAsync({ password: newPassword });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    }
  };

  if (step === 'verify') {
    return (
      <form onSubmit={handleVerifySubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter your account details to verify your identity.
        </p>

        {VERIFY_FIELDS.map(({ key, label, type, autoComplete }) => (
          <div key={key}>
            <label htmlFor={`recover-${key}`} className={LABEL_CLASSES}>
              {label}
            </label>
            <input
              id={`recover-${key}`}
              type={type}
              autoComplete={autoComplete}
              value={verifyData[key]}
              onChange={(e) =>
                setVerifyData((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className={INPUT_CLASSES}
              required
              disabled={verifyMutation.isPending}
            />
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={verifyMutation.isPending}
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-300 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={verifyMutation.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleResetSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Enter your new password.
      </p>

      <div>
        <label htmlFor="recover-new-password" className={LABEL_CLASSES}>
          New Password
        </label>
        <input
          id="recover-new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={INPUT_CLASSES}
          placeholder="••••••••"
          required
          disabled={resetMutation.isPending}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Min 8 chars, 1 number, 1 special char (!@#$%^&*)
        </p>
      </div>

      <div>
        <label htmlFor="recover-confirm-password" className={LABEL_CLASSES}>
          Confirm Password
        </label>
        <input
          id="recover-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={INPUT_CLASSES}
          placeholder="••••••••"
          required
          disabled={resetMutation.isPending}
        />
      </div>

      <button
        type="submit"
        disabled={resetMutation.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}
