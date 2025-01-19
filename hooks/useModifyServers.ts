import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Server } from '@/db/database';

const addServerApi = async (server: Omit<Server, 'id' | 'created_at'>) => {
  const response = await fetch('/api/servers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(server),
  });
  if (!response.ok) {
    throw new Error('Failed to add server');
  }
};

const updateServerApi = async (id: number, server: Partial<Server>) => {
  const response = await fetch('/api/servers', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...server }),
  });
  if (!response.ok) {
    throw new Error('Failed to update server');
  }
};

const removeServerApi = async (id: number) => {
  const response = await fetch('/api/servers', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error('Failed to delete server');
  }
};

export const useModifyServers = () => {
  const queryClient = useQueryClient();
  const SERVERS_QUERY_KEY = ['servers'];

  const invalidateServers = () => {
    queryClient.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
  };

  const addServer = useMutation({
    mutationFn: (server: Omit<Server, 'id' | 'created_at'>) => addServerApi(server),
    onSuccess: invalidateServers,
  });

  const updateServer = useMutation({
    mutationFn: ({ id, server }: { id: number; server: Partial<Server> }) =>
      updateServerApi(id, server),
    onSuccess: invalidateServers,
  });

  const removeServer = useMutation({
    mutationFn: (id: number) => removeServerApi(id),
    onSuccess: invalidateServers,
  });

  return {
    addServer: addServer.mutateAsync,
    updateServer: updateServer.mutateAsync,
    removeServer: removeServer.mutateAsync,
  };
};