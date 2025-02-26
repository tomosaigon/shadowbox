import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

const deletePostsApi = async (server: string) => {
  const res = await fetch(`/api/timeline-sync?server=${server}&delete=true`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error(`Delete failed: ${res.statusText}`);
  }
};

const destroyDatabaseApi = async () => {
  const res = await fetch(`/api/timeline-sync?delete=true`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error(`Destroy failed: ${res.statusText}`);
  }
};

export const useDestroyPosts = (invalidateTimeline: () => void, invalidateServerStats: () => void) => {
  const deletePosts = useMutation({
    mutationFn: async (server: string) => {
      const confirmed = confirm('Are you sure you want to delete all posts?');
      if (!confirmed) throw new Error('User cancelled post deletion.');
      await deletePostsApi(server);
    },
    onSuccess: () => {
      toast.success('Posts deleted successfully!');
      invalidateTimeline();
      invalidateServerStats();
    },
    onError: (error: Error) => {
      if (error.message !== 'User cancelled post deletion.') {
        toast.error(`Failed to delete posts: ${error.message}`);
      }
    },
  });

  const destroyDatabase = useMutation({
    mutationFn: async () => {
      const confirmed = confirm('Are you sure you want to destroy the database? This will delete ALL posts from ALL servers.');
      if (!confirmed) throw new Error('User cancelled database destruction.');
      await destroyDatabaseApi();
    },
    onSuccess: () => {
      toast.success('Database destroyed successfully!');
      invalidateTimeline();
      invalidateServerStats();
    },
    onError: (error: Error) => {
      if (error.message !== 'User cancelled database destruction.') {
        toast.error(`Failed to destroy database: ${error.message}`);
      }
    },
  });

  return {
    deletePosts: deletePosts.mutateAsync,
    destroyDatabase: destroyDatabase.mutateAsync,
  };
};