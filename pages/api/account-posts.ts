import { DatabaseManager } from '@/db/database';
import { NextApiRequest, NextApiResponse } from 'next';

const dbManager = new DatabaseManager();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    accountId,
    offset = '0',
    limit = '100'
  } = req.query;

  if (!accountId || typeof accountId !== 'string') {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  // Get posts for specific account
  const posts = dbManager.getPostsByAccount(
    accountId,
    parseInt(limit as string),
    parseInt(offset as string)
  );

  return res.status(200).json({ posts });
}
