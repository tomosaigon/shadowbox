import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
// import { getServerBySlug } from '../../config/servers';

// Set up in-memory database
process.env.DATABASE_FILE = ':memory:';
import { dbManager } from '../../db';
import handler from './timeline-sync';

// const dbManager = new DatabaseManager();
// let dbManager: DatabaseManager;

// Load mock API response
import mockApiResponse from './timeline-sync.test.example.json';

// Mock dependencies
const mockAxios = new MockAdapter(axios);

describe('Timeline Sync Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.reset();
    // dbManager.resetDatabase();
    
    // (getServerBySlug as jest.Mock).mockReturnValue({
    //   slug: 'test-server',
    //   baseUrl: 'https://example.com'
    // });

    // Configure mock to return different responses based on URL
    mockAxios.onGet(/.*\/api\/v1\/timelines\/public.*/).reply((config) => {
      const hasMinId = config.url?.includes('min_id=');
      const response = hasMinId 
        ? mockApiResponse.slice(-5)  // Last 5 elements
        : mockApiResponse.slice(0, 5); // First 5 elements
      return [200, response];
    });
  });

  it('should store first post ID correctly in database', async () => {
    const req = {
      method: 'POST',
      query: { server: 'test-server' }
    } as unknown as NextApiRequest;
    
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as NextApiResponse;

    await handler(req, res);

    const latestId = dbManager.getLatestPostId('test-server');
    expect(latestId).toBe('113700238869579105');
  });

  it('should get latest post ID after storing multiple posts', async () => {
    const req = {
      method: 'POST',
      query: { server: 'test-server' }
    } as unknown as NextApiRequest;
    
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as NextApiResponse;

    await handler(req, res);
    const latestId = dbManager.getLatestPostId('test-server');
    expect(latestId).toBe(mockApiResponse[0].id);
  });

  it('should fetch and store older posts after initial refresh', async () => {
    // Initial refresh
    const req1 = {
      method: 'POST',
      query: { server: 'test-server' }
    } as unknown as NextApiRequest;
    
    const res1 = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as NextApiResponse;

    await handler(req1, res1);
    const firstBatchLatestId = dbManager.getLatestPostId('test-server');
    expect(firstBatchLatestId).toBe(mockApiResponse[0].id);

    // Fetch older posts
    const req2 = {
      method: 'POST',
      query: { 
        server: 'test-server',
        older: 'true'
      }
    } as unknown as NextApiRequest;
    
    const res2 = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as NextApiResponse;

    await handler(req2, res2);
    const secondBatchOldestId = dbManager.getOldestPostId('test-server');
    expect(secondBatchOldestId).toBe(mockApiResponse[9].id);
  });
});