import axios from 'axios';
import { useState, useEffect } from 'react';
import { Server, useServers } from '@/context/ServersContext';
import UseTokenButton from '@/components/UseTokenButton';
import { toast } from 'react-hot-toast';

const CredentialsPage = () => {
  const { servers } = useServers();

  const [selectedServer, setSelectedServer] = useState<Server | undefined>(servers[0]);
  const [customServerUrl, setCustomServerUrl] = useState(servers[0]?.uri || '');
  const [accessToken, setAccessToken] = useState('');
  const [credentials, setCredentials] = useState<
    { id: number; server_url: string; access_token: string; created_at: string }[]
  >([]);
  const [visibleTokens, setVisibleTokens] = useState<{ [key: number]: boolean }>({});

  const handleServerChange = async (slug: string) => {
    const server = servers.find(s => s.slug === slug);
    setSelectedServer(server);
    setCustomServerUrl(server?.uri || '');
    setVisibleTokens({});
    fetchCredentials(server?.uri || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await axios.post('/api/credentials', {
        serverUrl: customServerUrl,
        accessToken,
      });
      toast.success('Credentials saved successfully!');
      setAccessToken('');
      fetchCredentials(customServerUrl);
    } catch (err) {
      console.error('Failed to save credentials:', err);
      toast.error('Failed to save credentials. Please try again.');
    }
  };

  const fetchCredentials = async (serverUrl: string) => {
    try {
      const response = await axios.get('/api/credentials', { params: { serverUrl } });
      setCredentials(response.data.credentials || []);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
      setCredentials([]);
    }
  };

  const toggleTokenVisibility = (id: number) => {
    setVisibleTokens((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRemoveCredential = async (serverUrl: string, id: number) => {
    try {
      await axios.delete('/api/credentials', { data: { serverUrl, id } });
      toast.success('Credential removed successfully!');
      fetchCredentials(customServerUrl);
    } catch (err) {
      console.error('Failed to remove credential:', err);
      toast.error('Failed to remove credential. Please try again.');
    }
  };

  useEffect(() => {
    fetchCredentials(customServerUrl);
  }, [customServerUrl]);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage Mastodon Credentials</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Server Selection */}
        <div>
          <label htmlFor="server" className="block text-sm font-medium text-gray-700">
            Server:
          </label>
          <select
            id="server"
            value={selectedServer?.slug || ''}
            onChange={(e) => handleServerChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300 focus:ring-opacity-50"
          >
            {servers.map((server) => (
              <option key={server.slug} value={server.slug}>
                {server.name}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Server URL */}
        <div>
          <label htmlFor="customServerUrl" className="block text-sm font-medium text-gray-700">
            Server URL:
          </label>
          <input
            type="text"
            id="customServerUrl"
            value={customServerUrl}
            onChange={(e) => setCustomServerUrl(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300 focus:ring-opacity-50"
          />
        </div>

        {/* Access Token */}
        <div>
          <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700">
            Access Token:
          </label>
          <input
            type="text"
            id="accessToken"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300 focus:ring-opacity-50"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-50"
        >
          Save Credentials
        </button>
      </form>

      {/* Credentials List */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Saved Credentials</h2>
        {credentials.length === 0 ? (
          <p className="text-gray-600">No credentials saved for this server.</p>
        ) : (
          <ul className="space-y-4">
            {credentials.map(({ id, server_url, access_token, created_at }) => (
              <li key={id} className="p-4 bg-white rounded-md shadow-sm border border-gray-200">
                <p className="text-sm text-gray-700">
                  <strong>ID:</strong> {id}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Server URL:</strong> {server_url}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Created At:</strong> {new Date(created_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Access Token:</strong>{' '}
                  {visibleTokens[id] ? (
                    <span onClick={() => toggleTokenVisibility(id)} className="cursor-pointer">
                      {access_token}
                    </span>
                  ) : (
                    <span
                      onClick={() => toggleTokenVisibility(id)}
                      className="cursor-pointer text-blue-500 underline"
                    >
                      Click to show
                    </span>
                  )}
                </p>

                {/* Use Token Button */}
                <UseTokenButton serverUrl={server_url} accessToken={access_token} />

                {/* Remove Credential Button */}
                <button
                  onClick={() => handleRemoveCredential(server_url, id)}
                  className="mt-2 ml-2 px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CredentialsPage;
