import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export function useAuth(required = false) {
  const router = useRouter();
  const { user, isLoading, error, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && required && !user) {
      router.push('/');
    }
  }, [isLoading, user, required, router]);

  return { user, isLoading, error };
}
