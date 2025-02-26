import { DatabaseManager, Post } from './database';

// Set the environment variable for the database file to use an in-memory SQLite database
process.env.DATABASE_FILE = ':memory:';

let dbManager: DatabaseManager;

// Mocked Post data
const testPost1: Post = {
  id: '123',
  seen: 0,
  was_reblogged: 0,
  created_at: new Date('2023-01-01T00:00:00Z').toISOString(),
  content: 'Hello world!',
  language: 'en',
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  uri: 'https://example.com',
  url: 'https://example.com',
  account_id: '1001',
  account_username: 'user123',
  account_acct: 'user123@example.com',
  account_display_name: 'User 123',
  account_url: 'https://example.com/user123',
  account_avatar: 'https://example.com/avatar1.png',
  media_attachments: [],
  visibility: 'public',
  favourites_count: 10,
  reblogs_count: 5,
  replies_count: 2,
  server_slug: 'test-server',
  bucket: 'regular',
  card: null,
  account_tags: [],
  account_bot: false,
  poll: null,
  parent_id: null,
  reblog: null,
};

const testPost2: Post = {
  id: '124',
  seen: 0,
  was_reblogged: 0,
  created_at: new Date('2023-01-02T00:00:00Z').toISOString(),
  content: 'Check out this image!',
  language: 'en',
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  uri: 'https://example.com',
  url: 'https://example.com',
  account_id: '1002',
  account_username: 'user124',
  account_acct: 'user124@example.com',
  account_display_name: 'User 124',
  account_url: 'https://example.com/user124',
  account_avatar: 'https://example.com/avatar2.png',
  media_attachments: [{
    description: 'Image attachment',
    type: 'image',
    url: 'https://example.com/image.png'
  }],
  visibility: 'public',
  favourites_count: 20,
  reblogs_count: 10,
  replies_count: 5,
  server_slug: 'test-server',
  bucket: 'withImages',
  card: null,
  account_tags: [],
  account_bot: false,
  poll: null,
  parent_id: null,
  reblog: null,
};

const testPost3: Post = {
  id: '125',
  seen: 0,
  was_reblogged: 0,
  created_at: new Date('2023-01-03T00:00:00Z').toISOString(),
  content: 'Replying to post',
  language: 'en',
  in_reply_to_id: '123',
  in_reply_to_account_id: 'luser',
  uri: 'https://example.com',
  url: 'https://example.com',
  account_id: '1003',
  account_username: 'user125',
  account_acct: 'user125@example.com',
  account_display_name: 'User 125',
  account_url: 'https://example.com/user125',
  account_avatar: 'https://example.com/avatar3.png',
  media_attachments: [],
  visibility: 'public',
  favourites_count: 30,
  reblogs_count: 15,
  replies_count: 7,
  server_slug: 'test-server',
  bucket: 'asReplies',
  card: null,
  account_tags: [],
  account_bot: false,
  poll: null,
  parent_id: null,
  reblog: null,
};

const testPost4: Post = {
  id: '126',
  seen: 0,
  was_reblogged: 0,
  created_at: new Date('2023-01-04T00:00:00Z').toISOString(),
  content: 'boop beep bop',
  language: 'en',
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  uri: 'https://example.com',
  url: 'https://example.com',
  account_id: '1004',
  account_username: 'user126',
  account_acct: 'user126@example.com',
  account_display_name: 'User 126',
  account_url: 'https://example.com/user126',
  account_avatar: 'https://example.com/avatar4.png',
  media_attachments: [],
  visibility: 'public',
  favourites_count: 40,
  reblogs_count: 20,
  replies_count: 10,
  server_slug: 'test-server',
  bucket: 'fromBots',
  card: null,
  account_tags: [],
  account_bot: true,
  poll: null,
  parent_id: null,
  reblog: null,
};

const testPost5: Post = {
  id: '127',
  seen: 0,
  was_reblogged: 0,
  created_at: new Date('2023-01-05T00:00:00Z').toISOString(),
  content: 'Check this out <a href="https://blog.example.com/protocol/" target="_blank" rel="nofollow noopener noreferrer"><span class="invisible">https://</span><span class="ellipsis">blog.example.com/</span><span class="invisible">ext-protocol/</span></a>',
  language: 'en',
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  uri: 'https://example.com',
  url: 'https://example.com',
  account_id: '1005',
  account_username: 'user127',
  account_acct: 'user127@example.com',
  account_display_name: 'User 127',
  account_url: 'https://example.com/user127',
  account_avatar: 'https://example.com/avatar5.png',
  media_attachments: [],
  visibility: 'public',
  favourites_count: 50,
  reblogs_count: 25,
  replies_count: 12,
  server_slug: 'test-server',
  bucket: 'withLinks',
  card: null,
  account_tags: [],
  account_bot: false,
  poll: null,
  parent_id: null,
  reblog: null,
};

const testPost6: Post = {
  id: '128',
  seen: 0,
  was_reblogged: 0,
  created_at: new Date('2023-01-06T00:00:00Z').toISOString(),
  content: 'Hola Mundo!',
  language: 'es',
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  uri: 'https://example.com',
  url: 'https://example.com',
  account_id: '1006',
  account_username: 'user128',
  account_acct: 'user128@example.com',
  account_display_name: 'User 128',
  account_url: 'https://example.com/user128',
  account_avatar: 'https://example.com/avatar6.png',
  media_attachments: [],
  visibility: 'public',
  favourites_count: 60,
  reblogs_count: 30,
  replies_count: 15,
  server_slug: 'test-server',
  bucket: 'nonEnglish',
  card: null,
  account_tags: [],
  account_bot: false,
  poll: null,
  parent_id: null,
  reblog: null,
};

const testPost7: Post = {
  id: '129',
  seen: 0,
  was_reblogged: 0,
  created_at: new Date('2023-01-07T00:00:00Z').toISOString(),
  content: '<a href="https://fosstodon.org/tags/example" class="mention hashtag" rel="tag">#<span>example</span></a>',
  language: 'en',
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  uri: 'https://example.com',
  url: 'https://example.com',
  account_id: '1007',
  account_username: 'user129',
  account_acct: 'user129@example.com',
  account_display_name: 'User 129',
  account_url: 'https://example.com/user129',
  account_avatar: 'https://example.com/avatar7.png',
  media_attachments: [],
  visibility: 'public',
  favourites_count: 70,
  reblogs_count: 35,
  replies_count: 17,
  server_slug: 'test-server',
  bucket: 'directMentions',
  card: null,
  account_tags: [],
  account_bot: false,
  poll: null,
  parent_id: null,
  reblog: null,
};

describe('DatabaseManager Tests', () => {
  beforeAll(() => {
    dbManager = new DatabaseManager();
  });

  afterAll(() => {
    // No need to clean up the in-memory database
  });

  test('Database initializes with schema', () => {
    expect(dbManager.getLatestPostId('test-server')).toBeUndefined();
  });

  test('Insert posts and verify latest post ID', () => {
    dbManager.insertPost(testPost1);
    dbManager.insertPost(testPost2);
    const latestId = dbManager.getLatestPostId('test-server');
    expect(latestId).toBe('124');
  });

  test('Get category counts', () => {
    dbManager.insertPost(testPost1);
    dbManager.insertPost(testPost2);
    dbManager.insertPost(testPost2);
    // disabled replies for now
    // dbManager.insertPost(testPost3);
    dbManager.insertPost(testPost4);
    dbManager.insertPost(testPost5);
    dbManager.insertPost(testPost6);
    dbManager.insertPost(testPost7);

    const categoryCounts = dbManager.getCategoryCounts('test-server');
    expect(categoryCounts).toEqual({
      nonEnglish: 1,
      reblogs: 0,
      videos: 0,
      withImages: 1,
      // asReplies: 1,
      asReplies: 0,
      directMentions: 0,
      hashtags: 1,
      withLinks: 1,
      fromBots: 1,
      questions: 0,
      regular: 1,
      saved: 0,
      subscribed: 0,
    });
  });

  test('Reset the database and verify getLatestPostId fails', () => {
    dbManager.resetDatabase();
    const latestPost = dbManager.getLatestPostId('test-server');
    expect(latestPost).toBeUndefined();
  });
});

describe('Account Tags', () => {
  beforeEach(() => {
    dbManager = new DatabaseManager();
  });

  it('should tag account and retrieve tags', () => {
    const userId = '1001';
    const username = 'testuser';
    
    // Add tags
    dbManager.tagAccount(userId, username, 'spam', 'test-server');
    dbManager.tagAccount(userId, username, 'bitter', 'test-server');
    dbManager.tagAccount(userId, username, 'spam', 'test-server'); // Increment spam count
    
    // Get tags
    const tags = dbManager.getAccountTags(userId);
    
    expect(tags).toEqual([
      { tag: 'spam', count: 2, server_slug: 'test-server' },
      { tag: 'bitter', count: 1, server_slug: 'test-server' }
    ]);
  });

  it('should return empty array for user with no tags', () => {
    const tags = dbManager.getAccountTags('nonexistent');
    expect(tags).toEqual([]);
  });

  it('should increment count for duplicate tags', () => {
    const userId = '1001';
    const username = 'testuser';

    dbManager.tagAccount(userId, username, 'spam', 'test-server');
    dbManager.tagAccount(userId, username, 'spam', 'test-server');
    dbManager.tagAccount(userId, username, 'spam', 'test-server');

    const tags = dbManager.getAccountTags(userId);
    expect(tags).toEqual([
      { tag: 'spam', count: 3, server_slug: 'test-server' }
    ]);
  });
});