import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMeQuery } from '@/lib/queries/auth';

export function useAuth(required = false) {
  const router = useRouter();
  const { data, isLoading, error } = useMeQuery();
  const user = data?.user ?? null;

  useEffect(() => {
    if (!isLoading && required && !user) {
      router.push('/');
    }
  }, [isLoading, user, required, router]);

  return { user, isLoading, error };
}
