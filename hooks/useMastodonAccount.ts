import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLocalStorage } from '@uidotdev/usehooks';

interface ServerConfig {
  baseUrl: string;
}

export const useMastodonAccount = (serverConfig?: ServerConfig) => {
  // try {
  //   localStorage.removeItem('accessToken');
  //   localStorage.removeItem('serverUrl');
  // } catch (error) {
  // }
  const [accessToken] = useLocalStorage<string | null>('accessToken', null);
  const [serverUrl] = useLocalStorage<string | null>('serverUrl', null);


  const hasApiCredentials = Boolean(accessToken && serverUrl);

  const handleFollowMutation = useMutation({
    mutationFn: async (acct: string) => {
      if (!hasApiCredentials) {
        toast.error('Access token or server URL is missing');
        throw new Error('Access token or server URL not found');
      }

      // Handle baseUrl adjustment for accounts without @
      if (!acct.includes('@') && serverConfig?.baseUrl !== serverUrl) {
        if (!serverConfig) {
          toast.error('Server config not found');
          throw new Error('Server config not found');
        }

        const url = new URL(serverConfig.baseUrl);
        let serverDomain = url.hostname;

        // Special handling for specific domains
        if (serverDomain === 'mastodon.bsd.cafe') {
          serverDomain = 'bsd.cafe';
        }

        acct = `${acct}@${serverDomain}`;
      }

      const resolveAccountUrl = `${serverUrl}/api/v1/accounts/lookup`;
      const resolveResponse = await axios.get(resolveAccountUrl, {
        params: { acct },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const accountId = resolveResponse.data.id;
      if (!accountId) {
        toast.error('Unable to resolve the account to follow');
        throw new Error('Failed to resolve account ID');
      }

      const followApiUrl = `${serverUrl}/api/v1/accounts/${accountId}/follow`;
      await axios.post(followApiUrl, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      toast.success('Successfully followed the user');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to follow the user');
    },
  });

  const handleFavoriteMutation = useMutation({
    mutationFn: async (postUrl: string) => {
      if (!hasApiCredentials) {
        toast.error('Access token or server URL is missing');
        throw new Error('Access token or server URL not found');
      }

      const searchApiUrl = `${serverUrl}/api/v2/search`;
      const searchResponse = await axios.get(searchApiUrl, {
        params: { q: postUrl, resolve: true },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const status = searchResponse.data.statuses?.[0];
      if (!status) {
        toast.error('Post not found on your server.');
        return;
        // throw new Error('Post not found');
      }

      const postId = status.id;
      const favoriteApiUrl = `${serverUrl}/api/v1/statuses/${postId}/favourite`;
      await axios.post(favoriteApiUrl, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      toast.success('Post favorited successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to favorite the post');
    },
  });

  const handleResolveUser = async (acct: string) => {
    if (!hasApiCredentials) {
      toast.error('Access token or server URL is missing');
      throw new Error('Access token or server URL not found');
    }

    try {
      const searchApiUrl = `${serverUrl}/api/v2/search`;
      const response = await axios.get(searchApiUrl, {
        params: { q: acct, resolve: true, type: 'accounts' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const account = response.data.accounts?.[0];
      if (!account) {
        toast.error('Account not found');
        throw new Error('Account not found');
      }

      return account;
    } catch (error) {
      toast.error('Failed to resolve user');
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return {
    handleFollow: handleFollowMutation.mutateAsync,
    handleFavorite: handleFavoriteMutation.mutateAsync,
    handleResolveUser,
    isFollowing: handleFollowMutation.isPending,
    isFavoriting: handleFavoriteMutation.isPending,
    hasApiCredentials,
    serverUrl,
  };
};

export default useMastodonAccount;