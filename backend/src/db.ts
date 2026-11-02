import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DocumentRecord, ChatMessageRecord, ChunkRecord } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data.sqlite');

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL,
    num_chunks INTEGER DEFAULT 0,
    error_message TEXT DEFAULT '',
    uploaded_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    document_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL
  );
`);

export function getAllDocuments(): DocumentRecord[] {
  const query = db.prepare('SELECT * FROM documents ORDER BY id DESC');
  return query.all() as unknown as DocumentRecord[];
}

export function getDocumentById(id: number): DocumentRecord | undefined {
  const query = db.prepare('SELECT * FROM documents WHERE id = ?');
  return query.get(id) as unknown as DocumentRecord | undefined;
}

export function createDocument(originalName: string, filePath: string, status: string = 'uploaded'): DocumentRecord {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO documents (original_name, file_path, status, num_chunks, error_message, uploaded_at)
    VALUES (?, ?, ?, 0, '', ?)
  `);
  const result = insert.run(originalName, filePath, status, now);
  const id = Number(result.lastInsertRowid);
  return {
    id,
    original_name: originalName,
    file_path: filePath,
    status: status as any,
    num_chunks: 0,
    error_message: '',
    uploaded_at: now
  };
}

export function updateDocument(id: number, updates: Partial<DocumentRecord>): void {
  const fields = Object.keys(updates);
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => (updates as any)[f]);

  const query = db.prepare(`UPDATE documents SET ${setClause} WHERE id = ?`);
  query.run(...values, id);
}

export function deleteAllDocuments(): void {
  db.exec('DELETE FROM documents');
  db.exec('DELETE FROM chunks');
}

export function insertChunks(chunks: ChunkRecord[]): void {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO chunks (id, document_id, source, content, embedding)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const chunk of chunks) {
    insert.run(chunk.id, chunk.document_id, chunk.source, chunk.content, JSON.stringify(chunk.embedding));
  }
}

export function getAllChunks(): ChunkRecord[] {
  const query = db.prepare('SELECT id, document_id, source, content, embedding FROM chunks');
  const rows = query.all() as any[];
  return rows.map((r) => ({
    id: r.id,
    document_id: r.document_id,
    source: r.source,
    content: r.content,
    embedding: JSON.parse(r.embedding)
  }));
}

export function createChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  sources: Array<{ filename: string; snippet: string }> = []
): ChatMessageRecord {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO chat_messages (session_id, role, content, sources, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = insert.run(sessionId, role, content, JSON.stringify(sources), now);
  return {
    id: Number(result.lastInsertRowid),
    session_id: sessionId,
    role,
    content,
    sources,
    created_at: now
  };
}

export function getChatHistory(sessionId: string): ChatMessageRecord[] {
  const query = db.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC');
  const rows = query.all(sessionId) as any[];
  return rows.map((r) => ({
    id: r.id,
    session_id: r.session_id,
    role: r.role,
    content: r.content,
    sources: JSON.parse(r.sources || '[]'),
    created_at: r.created_at
  }));
}

export function clearAllChatMessages(): void {
  db.exec('DELETE FROM chat_messages');
}

export default db;

