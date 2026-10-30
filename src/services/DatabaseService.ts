import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';


SQLite.enablePromise(true);
SQLite.DEBUG(false);

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  personality_id?: string | null;
  document_name?: string | null;
  message_count?: number;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SearchResult {
  session_id: number;
  session_title: string;
  message_role: 'user' | 'assistant';
  message_content: string;
  message_timestamp: string;
}

export interface MemoryRecord {
  id: number;
  session_id: number;
  summary: string;
  metadata: string; // JSON string
  created_at: string;
}

class DatabaseService {
  private db: SQLiteDatabase | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('Database already initialized');
        return;
      }

      console.log('Initializing database...');
      
      // Open database
      this.db = await SQLite.openDatabase({
        name: 'byte.db',
        location: 'default',
      });

      // Create tables
      await this.createTables();
      
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      if (error instanceof Error) {
        console.error('Database error message:', error.message);
        console.error('Database error stack:', error.stack);
      }
      console.error('Database error full details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not opened');

    // Create sessions table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        personality_id TEXT
      )
    `);

    // Create index on updated_at for fast sorting
    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_sessions_updated 
      ON sessions(updated_at DESC)
    `);

    // Create messages table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Create compound index on session_id and timestamp for O(log n) retrieval
    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_messages_session_timestamp 
      ON messages(session_id, timestamp)
    `);

    // Try to create FTS5 virtual table for blazing fast full-text search
    // FTS5 may not be available on all devices, so make it optional
    try {
      await this.db.executeSql(`
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts 
        USING fts5(
          session_id UNINDEXED,
          role UNINDEXED,
          content,
          timestamp UNINDEXED,
          content=messages,
          content_rowid=id
        )
      `);

      // Create triggers to keep FTS5 table in sync
      await this.db.executeSql(`
        CREATE TRIGGER IF NOT EXISTS messages_fts_insert 
        AFTER INSERT ON messages BEGIN
          INSERT INTO messages_fts(rowid, session_id, role, content, timestamp)
          VALUES (new.id, new.session_id, new.role, new.content, new.timestamp);
        END
      `);

      await this.db.executeSql(`
        CREATE TRIGGER IF NOT EXISTS messages_fts_delete 
        AFTER DELETE ON messages BEGIN
          DELETE FROM messages_fts WHERE rowid = old.id;
        END
      `);

      await this.db.executeSql(`
        CREATE TRIGGER IF NOT EXISTS messages_fts_update 
        AFTER UPDATE ON messages BEGIN
          DELETE FROM messages_fts WHERE rowid = old.id;
          INSERT INTO messages_fts(rowid, session_id, role, content, timestamp)
          VALUES (new.id, new.session_id, new.role, new.content, new.timestamp);
        END
      `);

      console.log('FTS5 full-text search enabled');
    } catch (ftsError) {
      console.warn('FTS5 not available on this device, search will use LIKE queries');
      console.warn('FTS5 error:', ftsError);
    }

    // Create memories table — one summary per session
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL UNIQUE,
        summary TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_memories_created
      ON memories(created_at DESC)
    `);

    // Migration: add document_name column if it doesn't exist yet
    try {
      await this.db.executeSql(
        'ALTER TABLE sessions ADD COLUMN document_name TEXT'
      );
      console.log('Migration: added document_name column to sessions');
    } catch (_) {
      // Column already exists — safe to ignore
    }

    console.log('Database tables and indexes created successfully');
  }

  // Session CRUD operations
  async createSession(title: string, documentName?: string, personalityId?: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const result = await this.db.executeSql(
      'INSERT INTO sessions (title, created_at, updated_at, personality_id, document_name) VALUES (?, ?, ?, ?, ?)',
      [title, now, now, personalityId || null, documentName || null]
    );

    const sessionId = result[0].insertId;
    console.log('Created session:', sessionId);
    return sessionId;
  }

  async getSession(id: number): Promise<ChatSession | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql(
      'SELECT * FROM sessions WHERE id = ?',
      [id]
    );

    if (result[0].rows.length === 0) return null;
    return result[0].rows.item(0);
  }

  async getAllSessions(): Promise<ChatSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql(`
      SELECT 
        s.id,
        s.title,
        s.created_at,
        s.updated_at,
        s.personality_id,
        s.document_name,
        COUNT(m.id) as message_count
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `);

    const sessions: ChatSession[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      sessions.push(result[0].rows.item(i));
    }

    return sessions;
  }

  async updateSessionTitle(id: number, title: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      'UPDATE sessions SET title = ? WHERE id = ?',
      [title, id]
    );
  }

  async updateSessionTimestamp(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    await this.db.executeSql(
      'UPDATE sessions SET updated_at = ? WHERE id = ?',
      [now, id]
    );
  }

  async deleteSession(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM sessions WHERE id = ?', [id]);
    console.log('Deleted session:', id);
  }

  // Message CRUD operations
  async saveMessage(
    sessionId: number,
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date
  ): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql(
      'INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)',
      [sessionId, role, content, timestamp.toISOString()]
    );

    // Update session timestamp
    await this.updateSessionTimestamp(sessionId);

    return result[0].insertId;
  }

  async getMessages(sessionId: number): Promise<ChatMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    );

    const messages: ChatMessage[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      messages.push(result[0].rows.item(i));
    }

    return messages;
  }

  async getSessionPreview(sessionId: number): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql(
      `SELECT content FROM messages 
       WHERE session_id = ? AND role = 'user' 
       ORDER BY timestamp ASC 
       LIMIT 1`,
      [sessionId]
    );

    if (result[0].rows.length === 0) return 'New Chat';
    
    const content = result[0].rows.item(0).content;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }

  // FTS5 full-text search
  async searchMessages(query: string): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Use FTS5 MATCH for fast search
    const result = await this.db.executeSql(`
      SELECT 
        m.session_id,
        s.title as session_title,
        m.role as message_role,
        m.content as message_content,
        m.timestamp as message_timestamp
      FROM messages_fts fts
      JOIN messages m ON fts.rowid = m.id
      JOIN sessions s ON m.session_id = s.id
      WHERE messages_fts MATCH ?
      ORDER BY m.timestamp DESC
      LIMIT 50
    `, [query]);

    const results: SearchResult[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      results.push(result[0].rows.item(i));
    }

    return results;
  }

  // Memory CRUD operations
  async saveMemory(
    sessionId: number,
    summary: string,
    metadata: { message_count: number; session_title: string }
  ): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const metaJson = JSON.stringify(metadata);

    // Use INSERT OR REPLACE so re-summarizing a session updates the existing row
    const result = await this.db.executeSql(
      `INSERT OR REPLACE INTO memories (session_id, summary, metadata, created_at)
       VALUES (?, ?, ?, ?)`,
      [sessionId, summary, metaJson, now]
    );

    console.log('Saved memory for session:', sessionId);
    return result[0].insertId;
  }

  async getAllMemories(): Promise<MemoryRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql(
      'SELECT * FROM memories ORDER BY created_at DESC'
    );

    const records: MemoryRecord[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      records.push(result[0].rows.item(i));
    }
    return records;
  }

  async getMemoryBySession(sessionId: number): Promise<MemoryRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql(
      'SELECT * FROM memories WHERE session_id = ? LIMIT 1',
      [sessionId]
    );

    if (result[0].rows.length === 0) return null;
    return result[0].rows.item(0);
  }

  async deleteAllMemories(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.executeSql('DELETE FROM memories');
    console.log('Deleted all memories');
  }

  // Wipe every chat session, its messages and their memories.
  // Deleted explicitly since ON DELETE CASCADE needs PRAGMA foreign_keys.
  async deleteAllChats(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.executeSql('DELETE FROM memories');
    await this.db.executeSql('DELETE FROM messages');
    await this.db.executeSql('DELETE FROM sessions');
    console.log('Deleted all chats');
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('Database closed');
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export default new DatabaseService();
