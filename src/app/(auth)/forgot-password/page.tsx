'use client';

import { useRouter } from 'next/navigation';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reset Password
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Verify your identity to reset your password
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <ForgotPasswordForm
          onSuccess={() => router.push('/?tab=login')}
          onCancel={() => router.push('/')}
        />
      </div>
    </div>
  );
}
