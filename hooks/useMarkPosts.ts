import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

export const useMarkPosts = (server: string, bucket?: string) => {
  const markSeen = useMutation({
    mutationFn: async ({ posts, chronological, invalidateTimeline }: { posts: any[]; chronological: boolean, invalidateTimeline: () => void }) => {
      if (posts.length === 0) {
        throw new Error('No posts to mark as seen');
      }

      // Still needed?
      // const fetchId = ++latestFetchId.current;
      const seenFrom = posts[chronological ? 0 : posts.length - 1].created_at;
      const seenTo = posts[chronological ? posts.length - 1 : 0].created_at;

      const res = await fetch(
        `/api/mark-seen?server=${server}&seenFrom=${seenFrom}&seenTo=${seenTo}&bucket=${bucket}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        throw new Error(`Mark seen failed: ${res.statusText}`);
      }
      //   if (fetchId !== latestFetchId.current) return;
      invalidateTimeline();

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Marked ${data.updatedCount} posts as seen`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const markAccountSeen = useMutation({
    mutationFn: async ({ acct, invalidateTimeline }: { acct: string, invalidateTimeline: () => void }) => {
      const res = await fetch(`/api/mark-account-seen?server=${server}&acct=${acct}`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`Mark account seen failed: ${res.statusText}`);
      }
      invalidateTimeline();

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Marked ${data.updatedCount} posts as seen`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const markSaved = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/mark-saved?server=${server}&id=${postId}&saved=true`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`Mark saved failed: ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Marked ${data.updatedCount} posts as saved`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    markSeen: markSeen.mutateAsync,
    markAccountSeen: markAccountSeen.mutateAsync,
    markSaved: markSaved.mutateAsync,
  };
};