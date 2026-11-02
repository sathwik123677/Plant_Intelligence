export interface DocumentRecord {
  id: number;
  original_name: string;
  file_path: string;
  status: 'uploaded' | 'chunking' | 'embedding' | 'ready' | 'failed';
  num_chunks: number;
  error_message: string;
  uploaded_at: string;
}

export interface ChatMessageRecord {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Array<{ filename: string; snippet: string }>;
  created_at: string;
}

export interface ChunkRecord {
  id: string;
  document_id: number;
  source: string;
  content: string;
  embedding: number[];
}

