import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Bucket, determineBucket } from './bucket';
import { exportDatabaseToSQL } from './dump';

export class DatabaseManager {
  private db: Database.Database;
  private tableMappings: { [key: string]: () => void };

  constructor() {
    const dbPath = process.env.DATABASE_FILE || 'mastodon.db';
    // console.log('Database path:', dbPath);
    if (!fs.existsSync(dbPath)) {
      this.initializeDatabase(dbPath);
    }
    this.db = new Database(dbPath);

    this.tableMappings = {
      mastodon_servers: () => this.createMastodonServersTable(),
      posts: () => this.createPostsTable(),
      reasons: () => this.createReasonsTable(),
      account_tags: () => this.createAccountTagsTable(),
      muted_words: () => this.createMutedWordsTable(),
      credentials: () => this.createCredentialsTable()
    };

    this.ensureTablesExist();
  }

  private initializeDatabase(dbPath: string): void {
    console.log(`Initializing new database at: ${dbPath}`);
    const db = new Database(dbPath);

    // Ingest all .sql files from db/imports/
    const importDir = path.resolve(process.cwd(), 'db/imports');
    const sqlFiles = fs.readdirSync(importDir).filter(file => file.endsWith('.sql'));

    for (const file of sqlFiles) {
      const filePath = path.join(importDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      console.log(`Executed SQL from file: ${file}`);
    }

    db.close();
  }

  private ensureTablesExist(): void {
    Object.keys(this.tableMappings).forEach(table => {
      if (!this.tableExists(table)) {
        this.tableMappings[table]();
      }
    });
  }

  private tableExists(tableName: string): boolean {
    const result = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(tableName);
    return !!result;
  }

  public resetDatabase(serverSlug?: string): void {
    if (serverSlug) {
      this.db.prepare('DELETE FROM posts WHERE server_slug = ?').run(serverSlug);
    } else {
      Object.keys(this.tableMappings).forEach(table => {
        this.db.exec(`DROP TABLE IF EXISTS ${table}`);
      });
      this.ensureTablesExist();
    }
  }

  public exportDatabase(outputDir: string): void {
    exportDatabaseToSQL(this.db, outputDir);
  }

  private createMastodonServersTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mastodon_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uri TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private createPostsTable() {
    this.db.exec(`
      CREATE TABLE posts (
        id TEXT NOT NULL UNIQUE,
        server_slug TEXT NOT NULL,
        bucket TEXT NOT NULL,
        uri TEXT,
        url TEXT,
        parent_id TEXT,
        was_reblogged	INTEGER DEFAULT 0,
        seen INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT,
        in_reply_to_id TEXT,
        in_reply_to_account_id TEXT,
        account_id TEXT,
        account_username TEXT NOT NULL,
        account_acct TEXT,
        account_display_name TEXT NOT NULL,
        account_url TEXT,
        account_avatar TEXT,
        media_attachments TEXT NOT NULL DEFAULT '[]',
        visibility TEXT,
        favourites_count INTEGER DEFAULT 0,
        reblogs_count INTEGER DEFAULT 0,
        replies_count INTEGER DEFAULT 0,
        card TEXT,
        poll TEXT,
        saved	INTEGER DEFAULT 0,
        PRIMARY KEY(id, server_slug)
        FOREIGN KEY(parent_id) REFERENCES posts(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
      CREATE INDEX IF NOT EXISTS idx_posts_account_id ON posts(account_id);
      CREATE INDEX IF NOT EXISTS idx_posts_account_username ON posts(account_username);
      CREATE INDEX IF NOT EXISTS idx_posts_server_slug ON posts(server_slug);
    `);
  }

  private createReasonsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reason TEXT NOT NULL UNIQUE,
        active INTEGER DEFAULT 1,
        filter INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private createAccountTagsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS account_tags (
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        tag TEXT NOT NULL,
        server_slug TEXT NOT NULL DEFAULT '',
        count INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, tag)
      );
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_account_tags_user_id ON account_tags(user_id);
      CREATE INDEX IF NOT EXISTS idx_account_tags_tag ON account_tags(tag);
      CREATE INDEX IF NOT EXISTS idx_account_tags_server_slug ON account_tags(server_slug);
    `);
  }

  private createMutedWordsTable() {
    this.db.exec(`
        CREATE TABLE muted_words (
            word TEXT PRIMARY KEY
        );
    `);
  }

  private createCredentialsTable() {
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_url TEXT NOT NULL,
            access_token TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
  }

  public getAllServers(): Server[] {
    const stmt = this.db.prepare(`
      SELECT * FROM mastodon_servers ORDER BY created_at DESC
    `);
    return stmt.all() as Server[];
  }
  
  public createServer(data: ServerData): boolean {
    const { uri, slug, name, enabled } = data;
    const stmt = this.db.prepare(`
      INSERT INTO mastodon_servers (uri, slug, name, enabled)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(uri, slug, name, enabled ? 1 : 0);
    return result.changes > 0;
  }
  
  public updateServer(id: number, data: ServerData): boolean {
    const { uri, slug, name, enabled } = data;
    const stmt = this.db.prepare(`
      UPDATE mastodon_servers
      SET uri = ?, slug = ?, name = ?, enabled = ?
      WHERE id = ?
    `);
    const result = stmt.run(uri, slug, name, enabled ? 1 : 0, id);
    return result.changes > 0;
  }
  
  public deleteServer(id: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM mastodon_servers WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public getAllReasons(): Reason[] {
    const stmt = this.db.prepare("SELECT * FROM reasons ORDER BY created_at ASC");
    return stmt.all() as Reason[];
  }

  public createReason(data: ReasonData): boolean {
    const { reason, active = 1, filter = 0 } = data;

    const result = this.db
      .prepare("INSERT OR IGNORE INTO reasons (reason, active, filter) VALUES (?, ?, ?)")
      .run(reason, active, filter);
    
    return result.changes > 0;
  }

  public deleteReasonById(id: number): boolean {
    const result = this.db.prepare("DELETE FROM reasons WHERE id = ?").run(id);
    return result.changes > 0;
  }
  
  public updateReasonById(id: number, updates: ReasonData): boolean {
    const { reason, active, filter } = updates;
  
    if (!reason || active === undefined || filter === undefined) {
      throw new Error('All fields (reason, active, filter) must be provided for an update.');
    }
  
    const query = `
      UPDATE reasons
      SET reason = ?, active = ?, filter = ?
      WHERE id = ?
    `;
  
    const result = this.db.prepare(query).run(reason, active, filter, id);
    return result.changes > 0;
  }
  
  public getMutedWords(): string[] {
    const rows = this.db.prepare("SELECT word FROM muted_words").all() as { word: string }[];
    return rows.map(row => row.word);
  }

  public createMutedWord(word: string): void {
      this.db.prepare("INSERT OR IGNORE INTO muted_words (word) VALUES (?)").run(word);
  }

  public deleteMutedWord(word: string): void {
      this.db.prepare("DELETE FROM muted_words WHERE word = ?").run(word);
  }

  public fetchAllCredentials(): { id: number; server_url: string; access_token: string; created_at: string }[] {
    const stmt = this.db.prepare("SELECT * FROM credentials");
    return stmt.all() as { id: number; server_url: string; access_token: string; created_at: string }[];
  }

  public getTokenByServer(serverUrl: string): string | null {
    const stmt = this.db.prepare(`
      SELECT access_token 
      FROM credentials 
      WHERE server_url = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    const result = stmt.get(serverUrl) as { access_token: string } | undefined;
    
    return result?.access_token || null;
  }

  public insertCredential(serverUrl: string, accessToken: string): boolean {
    const stmt = this.db.prepare(`
        INSERT INTO credentials (server_url, access_token)
        VALUES (?, ?)
    `);
    const result = stmt.run(serverUrl, accessToken);
    return result.changes > 0;
  }

  public credentialExists(serverUrl: string): boolean {
    const stmt = this.db.prepare("SELECT id FROM credentials WHERE server_url = ?");
    return !!stmt.get(serverUrl);
  }

  public removeCredential(serverUrl: string, id: number): boolean {
    const stmt = this.db.prepare(`
        DELETE FROM credentials
        WHERE server_url = ? AND id = ?
    `);
    const result = stmt.run(serverUrl, id);
    return result.changes > 0;
  }

  public insertPost(post: Post) {
    const stmt = this.db.prepare(`
      INSERT INTO posts (
        id, parent_id, was_reblogged, seen, created_at, content, language, in_reply_to_id, in_reply_to_account_id, uri, url,
        account_id, account_username, account_acct, account_display_name, account_url, account_avatar,
        media_attachments, visibility, favourites_count, reblogs_count, replies_count,
        server_slug, bucket, card, poll
      ) 
      VALUES (
        @id, @parent_id, @was_reblogged, @seen, @created_at, @content, @language, @in_reply_to_id, @in_reply_to_account_id, @uri, @url,
        @account_id, @account_username, @account_acct, @account_display_name, @account_url, @account_avatar,
        @media_attachments, @visibility,
        COALESCE(@favourites_count, 0),
        COALESCE(@reblogs_count, 0),
        COALESCE(@replies_count, 0),
        @server_slug, @bucket, @card, @poll
      )
    `);
      // ON CONFLICT(id, server_slug) DO NOTHING
  
    const postData = {
      ...post,
      media_attachments: Array.isArray(post.media_attachments)
        ? JSON.stringify(post.media_attachments)
        : post.media_attachments || '[]',
      card: post.card ? JSON.stringify(post.card) : null, // Stringify card object
      poll: post.poll ? JSON.stringify(post.poll) : null, // Stringify poll object
      bucket: determineBucket(post),
    };
  
    // console.log('Inserting post:', postData);
  
    try {
      const result = stmt.run(postData);
    
      if (result.changes === 0) {
        console.log(`No new post inserted (ID: ${post.id}, Server: ${post.server_slug})`);
      }
    
      return result;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        console.log(`Post already exists (ID: ${post.id}, Server: ${post.server_slug})`);
      }
    }
    return undefined;
  }

  public getServerStats(serverSlug: string | null): ServerStatsPayload {
    try {
      const whereClause = serverSlug ? "WHERE server_slug = ?" : "";
  
      // Fetch the basic stats including unique account count
      const stats = this.db
        .prepare(
          `
          SELECT 
            COUNT(*) AS totalPosts,
            SUM(CASE WHEN seen = 1 THEN 1 ELSE 0 END) AS seenPosts,
            MIN(created_at) AS oldestPostDate,
            MAX(created_at) AS latestPostDate,
            COUNT(DISTINCT account_id) AS uniqueAccounts
          FROM posts
          ${whereClause}
          `
        )
        .get(serverSlug ? [serverSlug] : []) as {
        totalPosts: number;
        seenPosts: number;
        oldestPostDate: string | null;
        latestPostDate: string | null;
        uniqueAccounts: number;
      };
  
      // Initialize the category counts
      const categoryCounts: Record<Bucket, { seen: number; unseen: number }> = {} as Record<
        Bucket,
        { seen: number; unseen: number }
      >;
  
      Object.values(Bucket).forEach((bucket) => {
        categoryCounts[bucket] = { seen: 0, unseen: 0 };
      });
  
      // Fetch category-wise counts for seen and unseen posts
      const categoryData = this.db
        .prepare(
          `
          SELECT 
            bucket,
            SUM(CASE WHEN seen = 1 THEN 1 ELSE 0 END) AS seen,
            SUM(CASE WHEN seen = 0 THEN 1 ELSE 0 END) AS unseen
          FROM posts
          ${whereClause}
          GROUP BY bucket
          `
        )
        .all(serverSlug ? [serverSlug] : []) as { bucket: Bucket; seen: number; unseen: number }[];
  
      categoryData.forEach((row) => {
        if (categoryCounts[row.bucket]) {
          categoryCounts[row.bucket].seen = row.seen;
          categoryCounts[row.bucket].unseen = row.unseen;
        }
      });
  
      return { ...stats, categoryCounts };
    } catch (error) {
      console.error("Error in getServerStats:", error);
  
      // Return default structure on error
      const defaultCategoryCounts: Record<Bucket, { seen: number; unseen: number }> = {} as Record<
        Bucket,
        { seen: number; unseen: number }
      >;
      Object.values(Bucket).forEach((bucket) => {
        defaultCategoryCounts[bucket] = { seen: 0, unseen: 0 };
      });
  
      return {
        totalPosts: 0,
        seenPosts: 0,
        oldestPostDate: null,
        latestPostDate: null,
        uniqueAccounts: 0,
        categoryCounts: defaultCategoryCounts,
      };
    }
  }
  
  public getLatestPostId(serverSlug: string): string | undefined {
    const result = this.db.prepare(`
      SELECT id 
      FROM posts 
      WHERE server_slug = ? AND was_reblogged = 0
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(serverSlug) as { id: string } | undefined;

    return result?.id;
  }

  public getOldestPostId(serverSlug: string): string | undefined {
    const result = this.db.prepare(`
      SELECT id 
      FROM posts 
      WHERE server_slug = ? AND was_reblogged = 0
      ORDER BY created_at ASC 
      LIMIT 1
    `).get(serverSlug) as { id: string } | undefined;

    return result?.id;
  }

  // special case getBucketedPostsByCategory
  public getSavedPosts(
    serverSlug: string,
    // bucket: Bucket,
    limit: number = 20,
    offset: number = 0
  ): Post[] {
    try {
      // no p.seen = 0 
      const rows = this.db
        .prepare(
          `
          SELECT * 
          FROM posts
          WHERE server_slug = ? AND saved = 1
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `
        )
        .all(serverSlug, limit, offset) as SQLitePost[];

      return rows.map((row) => this.transformSQLitePost(row));
    } catch (error) {
      console.error('Error in getSavedPosts:', error);
      return [];
    }
  }

  public markPostSaved(
    serverSlug: string,
    postId: string,
    saved: boolean
  ): boolean {
    const stmt = this.db.prepare(`
      UPDATE posts
      SET saved = ?
      WHERE server_slug = ? AND id = ?
    `);
    const result = stmt.run(saved ? 1 : 0, serverSlug, postId);
    return result.changes > 0;
  }

  public getReblogs(
    serverSlug: string,
    limit: number = 20,
    offset: number = 0,
    chronological: boolean = true
  ): Post[] {
    try {
      const order = chronological ? 'ASC' : 'DESC';
      const rows = this.db
        .prepare(
          `
          SELECT 
            p.*, 
            rp.id AS reblog_id,
            rp.parent_id AS reblog_parent_id,
            rp.was_reblogged AS reblog_was_reblogged,
            rp.seen AS reblog_seen,
            rp.created_at AS reblog_created_at,
            rp.content AS reblog_content,
            rp.language AS reblog_language,
            rp.in_reply_to_id AS reblog_in_reply_to_id,
            rp.in_reply_to_account_id AS reblog_in_reply_to_account_id,
            rp.uri AS reblog_uri,
            rp.url AS reblog_url,
            rp.account_id AS reblog_account_id,
            rp.account_username AS reblog_account_username,
            rp.account_acct AS reblog_account_acct,
            rp.account_display_name AS reblog_account_display_name,
            rp.account_url AS reblog_account_url,
            rp.account_avatar AS reblog_account_avatar,
            rp.media_attachments AS reblog_media_attachments,
            rp.visibility AS reblog_visibility,
            rp.favourites_count AS reblog_favourites_count,
            rp.reblogs_count AS reblog_reblogs_count,
            rp.replies_count AS reblog_replies_count,
            rp.server_slug AS reblog_server_slug,
            rp.bucket AS reblog_bucket,
            rp.card AS reblog_card,
            rp.poll AS reblog_poll,
            rp.saved AS reblog_saved,
            GROUP_CONCAT(at.tag) AS account_tags
          FROM posts p
          LEFT JOIN posts rp ON p.parent_id = rp.id
          LEFT JOIN account_tags at ON p.account_id = at.user_id
          WHERE 
            p.server_slug = ? AND p.seen = 0 AND (rp.seen IS NULL or rp.seen = 0)
            AND p.parent_id IS NOT NULL
          GROUP BY p.id
          ORDER BY p.created_at ${order}
          LIMIT ? OFFSET ?
        `
        )
        .all(serverSlug, limit, offset) as SQLitePost[];
        // p.parent_id IS NOT NULL implies that the post is a reblog

      // return rows.map((row) => this.transformSQLitePost(row));
      const posts = rows.map((row: SQLitePostWithReblog) => {
        const transformRow = (row: SQLitePostWithReblog): SQLitePost => ({
          id: row.reblog_id!,
          parent_id: row.reblog_parent_id!,
          was_reblogged: row.reblog_was_reblogged!,
          seen: row.reblog_seen!,
          created_at: row.reblog_created_at!,
          content: row.reblog_content!,
          language: row.reblog_language!,
          in_reply_to_id: row.reblog_in_reply_to_id!,
          in_reply_to_account_id: row.reblog_in_reply_to_account_id!,
          uri: row.reblog_uri!,
          url: row.reblog_url!,
          account_id: row.reblog_account_id!,
          account_username: row.reblog_account_username!,
          account_acct: row.reblog_account_acct!,
          account_display_name: row.reblog_account_display_name!,
          account_url: row.reblog_account_url!,
          account_avatar: row.reblog_account_avatar!,
          account_bot: row.reblog_account_bot!,
          media_attachments: row.reblog_media_attachments!,
          visibility: row.reblog_visibility!,
          favourites_count: row.reblog_favourites_count!,
          reblogs_count: row.reblog_reblogs_count!,
          replies_count: row.reblog_replies_count!,
          server_slug: row.reblog_server_slug!,
          bucket: row.reblog_bucket!,
          card: row.reblog_card!,
          poll: row.reblog_poll!,
          saved: row.reblog_saved!,
        });
      
        const mainPost = this.transformSQLitePost(row);
        const reblog = row.parent_id ? this.transformSQLitePost(transformRow(row)) : null;
        if (reblog) {
          // console.log('Reblog:', reblog);
        }
      
        return { ...mainPost, reblog };
      });
  
      return posts;
    } catch (error) {
      console.error('Error in getRebloggedPosts:', error);
      return [];
    }
  }

  public getBucketedPostsByCategory(
    serverSlug: string,
    bucket: Bucket,
    limit: number = 20,
    offset: number = 0,
    chronological: boolean = true
  ): Post[] {
    // if (bucket === Bucket.saved) {
    //   return this.getSavedPosts(serverSlug, limit, offset);
    // }
    if (bucket === Bucket.reblogs) {
      return this.getReblogs(serverSlug, limit, offset, chronological);
    }

    try {
      const order = chronological ? 'ASC' : 'DESC';
      const NOREBLOG = 'p.parent_id IS NULL AND p.was_reblogged = 0 AND'; // XXX
      const rows = this.db
        .prepare(
          `
          SELECT 
            p.*, 
            rp.id AS reblog_id,
            rp.parent_id AS reblog_parent_id,
            rp.was_reblogged AS reblog_was_reblogged,
            rp.seen AS reblog_seen,
            rp.created_at AS reblog_created_at,
            rp.content AS reblog_content,
            rp.language AS reblog_language,
            rp.in_reply_to_id AS reblog_in_reply_to_id,
            rp.in_reply_to_account_id AS reblog_in_reply_to_account_id,
            rp.uri AS reblog_uri,
            rp.url AS reblog_url,
            rp.account_id AS reblog_account_id,
            rp.account_username AS reblog_account_username,
            rp.account_acct AS reblog_account_acct,
            rp.account_display_name AS reblog_account_display_name,
            rp.account_url AS reblog_account_url,
            rp.account_avatar AS reblog_account_avatar,
            rp.media_attachments AS reblog_media_attachments,
            rp.visibility AS reblog_visibility,
            rp.favourites_count AS reblog_favourites_count,
            rp.reblogs_count AS reblog_reblogs_count,
            rp.replies_count AS reblog_replies_count,
            rp.server_slug AS reblog_server_slug,
            rp.bucket AS reblog_bucket,
            rp.card AS reblog_card,
            rp.poll AS reblog_poll,
            rp.saved AS reblog_saved,
            GROUP_CONCAT(at.tag) AS account_tags
          FROM posts p
          LEFT JOIN posts rp ON p.parent_id = rp.id
          LEFT JOIN account_tags at ON p.account_id = at.user_id
          WHERE 
            ${NOREBLOG}
            p.server_slug = ? AND p.seen = 0 AND (rp.seen IS NULL or rp.seen = 0)
            AND (
              (p.parent_id IS NOT NULL AND rp.bucket = ?)
              OR (p.parent_id IS NULL AND p.bucket = ?)
            )
          GROUP BY p.id
          ORDER BY p.created_at ${order}
          LIMIT ? OFFSET ?
        `
        )
        .all(serverSlug, bucket, bucket, limit, offset) as SQLitePostWithReblog[];
        // ORDER BY p.created_at DESC
  
      const posts = rows.map((row: SQLitePostWithReblog) => {
        const _transformRow = (row: SQLitePostWithReblog): SQLitePost => ({
          id: row.reblog_id!,
          parent_id: row.reblog_parent_id!,
          was_reblogged: row.reblog_was_reblogged!,
          seen: row.reblog_seen!,
          created_at: row.reblog_created_at!,
          content: row.reblog_content!,
          language: row.reblog_language!,
          in_reply_to_id: row.reblog_in_reply_to_id!,
          in_reply_to_account_id: row.reblog_in_reply_to_account_id!,
          uri: row.reblog_uri!,
          url: row.reblog_url!,
          account_id: row.reblog_account_id!,
          account_username: row.reblog_account_username!,
          account_acct: row.reblog_account_acct!,
          account_display_name: row.reblog_account_display_name!,
          account_url: row.reblog_account_url!,
          account_avatar: row.reblog_account_avatar!,
          account_bot: row.reblog_account_bot!,
          media_attachments: row.reblog_media_attachments!,
          visibility: row.reblog_visibility!,
          favourites_count: row.reblog_favourites_count!,
          reblogs_count: row.reblog_reblogs_count!,
          replies_count: row.reblog_replies_count!,
          server_slug: row.reblog_server_slug!,
          bucket: row.reblog_bucket!,
          card: row.reblog_card!,
          poll: row.reblog_poll!,
          saved: row.reblog_saved!,
        });
      
        const mainPost = this.transformSQLitePost(row);
        const reblog = row.parent_id ? this.transformSQLitePost(_transformRow(row)) : null;
        if (reblog) {
          // console.log('Reblog:', reblog);
        }
      
        return { ...mainPost, reblog };
      });
  
      return posts;
    } catch (error) {
      console.error('Error in getBucketedPostsByCategory:', error);
      return [];
    }
  }

  public getCategoryCounts(serverSlug: string): Record<Bucket, number> {
    const counts: Record<Bucket, number> = {} as Record<Bucket, number>;

    Object.values(Bucket).forEach(bucket => {
      counts[bucket] = 0;
    });

    try {
      const NOREBLOG = 'was_reblogged = 0 AND'; // XXX

      const posts = this.db.prepare(`
        SELECT bucket, COUNT(*) as count
        FROM posts 
        WHERE 
        ${NOREBLOG}
        server_slug = ? AND seen = 0
        GROUP BY bucket
      `).all(serverSlug) as { bucket: Bucket, count: number }[];
      // If the database contains an unexpected value for bucket 
      // (e.g., one not part of the Bucket enum), it could cause runtime issues.

      posts.forEach(row => {
        counts[row.bucket] = row.count;
      });

      const saved = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM posts 
        WHERE server_slug = ? AND saved = 1
      `).all(serverSlug) as { count: number }[];
      counts[Bucket.saved] = saved[0].count;

      return counts;
    } catch (error) {
      console.error('Error in getCategoryCounts:', error);
      return counts;
    }
  }

  public getPostsByAccount(
    accountId: string,
    limit: number = 20,
    offset: number = 0
  ): Post[] {
    try {
      const rows = this.db
        .prepare(
          `
          SELECT p.*
          FROM posts p
          WHERE p.account_id = ?
          AND p.bucket != 'reblogs'
          ORDER BY p.created_at DESC
          LIMIT ? OFFSET ?
          `
        )
        .all(accountId, limit, offset) as SQLitePostWithReblog[];
  
      return rows.map((row) => this.transformSQLitePost(row));
    } catch (error) {
      console.error('Error in getPostsByAccount:', error);
      return [];
    }
  }

  public tagAccount(userId: string, username: string, tag: string, serverSlug: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO account_tags (user_id, username, tag, server_slug)
      VALUES (@userId, @username, @tag, @serverSlug)
      ON CONFLICT(user_id, tag) DO UPDATE SET
      count = count + 1
    `);

    stmt.run({ userId, username, tag, serverSlug });
  }

  public clearAccountTag(userId: string, tag: string, serverSlug: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM account_tags 
      WHERE user_id = ? AND tag = ? AND 
        (server_slug = ? OR server_slug = '')
    `);
    stmt.run(userId, tag, serverSlug);
  }

  public getAccountTags(userId: string): AccountTag[] {
    const stmt = this.db.prepare(`
      SELECT tag, count, server_slug
      FROM account_tags 
      WHERE user_id = ?
      ORDER BY count DESC
    `);

    const rows = stmt.all(userId) as AccountTag[];

    return rows;
  }

  public markPostsAsSeen(serverSlug: string, bucket: string, seenFrom: string, seenTo: string): number {
    console.log(`Marking posts as seen for server: ${serverSlug}, bucket: ${bucket}, from: ${seenFrom}, to: ${seenTo}`);

    // const stmt = this.db.prepare(`
    //   UPDATE posts
    //   SET seen = 1
    //   WHERE server_slug = ? AND bucket = ? AND created_at BETWEEN ? AND ?
    // `);
    // const result = stmt.run(serverSlug, bucket, seenFrom, seenTo);

    // Marks the reblogging, but not the original post which may be out of the timeline.
    const stmt = this.db.prepare(`
      UPDATE posts
      SET seen = 1
      WHERE server_slug = ? 
        AND created_at BETWEEN ? AND ?
        AND (
          bucket = ? OR id IN (SELECT p.id FROM posts p JOIN posts rp ON p.parent_id = rp.id WHERE rp.bucket = ?)
        )
    `);
    const result = stmt.run(serverSlug, seenFrom, seenTo, bucket, bucket);

    console.log(`Rows updated: ${result.changes}`);
    return result.changes;
  }

  public markAccountsAsSeen(serverSlug: string, acct: string): number {
    console.log(`Marking acct as seen for server: ${serverSlug}, acct: ${acct}`);

    const stmt = this.db.prepare(`
      UPDATE posts
      SET seen = 1
      WHERE server_slug = ? 
        AND account_acct = ?
        AND seen = 0
    `);
    const result = stmt.run(serverSlug, acct);

    console.log(`Rows updated: ${result.changes}`);
    return result.changes;
  }


  private transformSQLitePost(sqlitePost: SQLitePost): Post {
    return {
      ...sqlitePost,
      media_attachments: JSON.parse(sqlitePost.media_attachments),
      card: sqlitePost.card ? JSON.parse(sqlitePost.card) : null,
      account_tags: this.getAccountTags(sqlitePost.account_id), // XXX: This is a separate query, looped
      poll: sqlitePost.poll ? JSON.parse(sqlitePost.poll) : null,
      reblog: null, // Reblogs are handled separately
    };
  }
}

// Raw database type without account_tags field
interface SQLitePost {
  id: string;
  parent_id: string | null; // -- The ID of the original post if this post is a reblog. NULL for normal posts.
  was_reblogged: number; // 0 for normal posts, 1 for reblogs
  seen: number; // bool
  created_at: string;
  content: string;
  language: string | null;
  in_reply_to_id: string | null;
  in_reply_to_account_id: string | null;
  uri: string;
  url: string;
  account_id: string;
  account_username: string;
  account_acct: string;
  account_display_name: string;
  account_url: string;
  account_avatar: string;
  account_bot: boolean;
  media_attachments: string;
  visibility: string;
  favourites_count: number;
  reblogs_count: number;
  replies_count: number;
  server_slug: string;
  bucket: string;
  card: string | null;
  poll: string | null;
  saved?: number; // bool
}

interface SQLitePostWithReblog extends SQLitePost {
  reblog_id?: string;
  reblog_parent_id?: string | null;
  reblog_was_reblogged?: number;
  reblog_seen?: number;
  reblog_created_at?: string;
  reblog_content?: string;
  reblog_language?: string | null;
  reblog_in_reply_to_id?: string | null;
  reblog_in_reply_to_account_id?: string | null;
  reblog_uri?: string | null;
  reblog_url?: string | null;
  reblog_account_id?: string | null;
  reblog_account_username?: string;
  reblog_account_acct?: string;
  reblog_account_display_name?: string;
  reblog_account_url?: string | null;
  reblog_account_avatar?: string | null;
  reblog_account_bot?: boolean;
  reblog_media_attachments?: string;
  reblog_visibility?: string | null;
  reblog_favourites_count?: number;
  reblog_reblogs_count?: number;
  reblog_replies_count?: number;
  reblog_server_slug?: string;
  reblog_bucket?: string;
  reblog_card?: string | null;
  reblog_poll?: string | null;
  reblog_saved?: number; // bool
}

// Account tags come from JOIN with account_tags table
export interface Post extends Omit<SQLitePost, 'media_attachments' | 'card' | 'poll'> {
  media_attachments: IMediaAttachment[]; // Transform media_attachments to array of objects
  card: PostCard | null; // Transform card to PostCard type
  poll: Poll | null; // Transform poll to Poll type
  account_tags: AccountTag[]; // Join account_tags to include associated tags
  reblog: Post | null;
}

export interface PostCard {
  type: string;
  url: string;
  title: string;
  description: string;
  image?: string;
  author_name?: string;
}

export interface IMediaAttachment {
  description: string | undefined;
  type: string;
  url?: string;
  preview_url?: string;
}

export interface PollOption {
  title: string;
  votes_count: number;
}

export interface Poll {
  id: string;
  options: PollOption[];
  votes_count: number;
  expires_at: string | null;
  expired: boolean;
  multiple: boolean;
  voters_count: number | null;
}

export type BucketedPosts = {
  [K in Bucket]: Post[];
};

export type Server = {
  id: number;
  uri: string;
  slug: string;
  name: string;
  enabled: boolean;
  created_at: string;
};

export type ServerData = Omit<Server, 'id' | 'created_at'>;

export type ServerStatsPayload = {
  totalPosts: number;
  seenPosts: number;
  oldestPostDate: string | null;
  latestPostDate: string | null;
  uniqueAccounts: number;
  categoryCounts: Record<Bucket, { seen: number; unseen: number }>;
};

export type Reason = {
  id: number; 
  reason: string; 
  active: number; 
  filter: number; 
  created_at: string; 
};

export type ReasonData = {
  reason: string; 
  active?: number; 
  filter?: number; 
};

export interface AccountTag {
  tag: string;
  count: number;
  // serverSlug: string;
  server_slug: string;
}

