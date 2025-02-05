import { DatabaseManager } from '../../db/database';
import { NextApiRequest, NextApiResponse } from 'next';

const dbManager = new DatabaseManager();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const credentials = dbManager.fetchAllCredentials();
      return res.status(200).json({ credentials });
    } catch (error) {
      console.error('Error fetching credentials:', error);
      return res.status(500).json({ error: 'Failed to fetch credentials' });
    }
  }

  if (req.method === 'POST') {
    const { serverUrl, accessToken } = req.body;

    if (!serverUrl || !accessToken || typeof serverUrl !== 'string' || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "serverUrl" or "accessToken" fields' });
    }

    try {
      // if (dbManager.credentialExists(serverUrl)) {
        // return res.status(409).json({ error: `Credential for server "${serverUrl}" already exists` });
      // }

      const wasInserted = dbManager.insertCredential(serverUrl, accessToken);
      if (wasInserted) {
        return res.status(201).json({ message: 'Credential saved successfully' });
      } else {
        return res.status(500).json({ error: 'Failed to save credential' });
      }
    } catch (error) {
      console.error('Error saving credential:', error);
      return res.status(500).json({ error: 'Failed to save credential' });
    }
  }

  if (req.method === 'DELETE') {
    const { serverUrl, id } = req.body;

    if (!serverUrl || !id || typeof serverUrl !== 'string' || typeof id !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid "serverUrl" or "id" fields' });
    }

    try {
      const wasDeleted = dbManager.removeCredential(serverUrl, id);
      if (wasDeleted) {
        return res.status(200).json({ message: 'Credential deleted successfully' });
      } else {
        return res.status(404).json({ error: 'Credential not found' });
      }
    } catch (error) {
      console.error('Error deleting credential:', error);
      return res.status(500).json({ error: 'Failed to delete credential' });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}