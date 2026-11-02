import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { updateDocument, insertChunks, deleteAllDocuments } from '../db.js';
import { splitText } from './vectorstore.js';
import type { DocumentRecord, ChunkRecord } from '../types.js';

const CANDIDATE_EMBED_MODELS = [
  'text-embedding-004',
  'models/gemini-embedding-2-preview',
  'embedding-001'
];

export function getGeminiKey(userKey?: string): string {
  const key = userKey || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('Google API Key not configured. Please supply a key or add it to .env');
  }
  return key;
}

export async function getEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const key = getGeminiKey(apiKey);
  const genAI = new GoogleGenerativeAI(key);

  let lastError: any = null;
  for (const modelName of CANDIDATE_EMBED_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent(text);
      if (result.embedding?.values) {
        return result.embedding.values;
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('Failed to generate embedding with candidate models.');
}

export async function extractText(filePath: string, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text || '';
  } else {
    return fs.readFileSync(filePath, 'utf-8');
  }
}

export async function ingestDocument(document: DocumentRecord, apiKey?: string): Promise<void> {
  try {
    updateDocument(document.id, { status: 'chunking' });

    const rawText = await extractText(document.file_path, document.original_name);
    const textChunks = splitText(rawText, 700, 50);

    if (textChunks.length === 0) {
      updateDocument(document.id, { status: 'ready', num_chunks: 0 });
      return;
    }

    updateDocument(document.id, { status: 'embedding' });

    const chunkRecords: ChunkRecord[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batch = textChunks.slice(i, i + BATCH_SIZE);
      const embeddings = await Promise.all(
        batch.map((chunk) => getEmbedding(chunk, apiKey))
      );

      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j;
        chunkRecords.push({
          id: `${document.id}_chunk_${chunkIndex}`,
          document_id: document.id,
          source: document.original_name,
          content: batch[j],
          embedding: embeddings[j]
        });
      }
    }

    insertChunks(chunkRecords);

    updateDocument(document.id, {
      status: 'ready',
      num_chunks: chunkRecords.length
    });
  } catch (err: any) {
    console.error(`Error ingesting document ${document.original_name}:`, err);
    updateDocument(document.id, {
      status: 'failed',
      error_message: err?.message || String(err)
    });
  }
}

export function clearAll(uploadsDir: string): void {
  deleteAllDocuments();

  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(uploadsDir, file));
      } catch (e) {
        // ignore
      }
    }
  }
}
