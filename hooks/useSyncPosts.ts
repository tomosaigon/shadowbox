import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface SyncParams {
  older?: boolean;
  batch?: number;
}

export function useSyncPosts({
  server,
  invalidateTimeline,
  invalidateServerStats,
}: {
  server: string;
  invalidateTimeline: () => void;
  invalidateServerStats: () => void;
}): UseMutationResult<number, Error, SyncParams> {
  return useMutation<number, Error, SyncParams>({
    mutationFn: async ({ older = false, batch = 1 }) => {
      const res = await fetch(
        `/api/timeline-sync?server=${server}&older=${older}&batch=${batch}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        // throw new Error(`Sync failed: ${res.statusText}`);
        console.error('Error syncing posts:', res);
        toast.error('Failed to sync posts');
      }

      const data = await res.json();
      return data.newPosts;
    },
    onSuccess: (newPosts, { older }) => {
      if (newPosts > 0) {
        if (!older) {
          invalidateTimeline();
        }
        invalidateServerStats();
      }
    },
    onError: (error) => {
      console.error('Error syncing posts:', error);
      toast.error('Failed to sync posts');
    },
  });
}