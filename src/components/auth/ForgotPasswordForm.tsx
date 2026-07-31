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

export default function ForgotPasswordForm({
  onSuccess,
  onCancel,
}: ForgotPasswordFormProps) {
  const verifyMutation = useRecoverVerifyMutation();
  const resetMutation = useRecoverResetMutation();
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await verifyMutation.mutateAsync({ email });
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
      await resetMutation.mutateAsync({
        email,
        code: '', // Code would typically come from the verify step
        newPassword,
      });

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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={verifyMutation.isPending}
          />
        </div>

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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
          required
          disabled={resetMutation.isPending || verifyMutation.isPending}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Min 8 chars, 1 number, 1 special char (!@#$%^&*)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
          required
          disabled={resetMutation.isPending || verifyMutation.isPending}
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
