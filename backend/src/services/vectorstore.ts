import type { ChunkRecord } from '../types.js';
import { getAllChunks, insertChunks } from '../db.js';

export function splitText(
  text: string,
  chunkSize: number = 700,
  chunkOverlap: number = 50
): string[] {
  const separators = ['\n\n', '\n', ' ', ''];

  function split(textToSplit: string, separatorIndex: number): string[] {
    if (textToSplit.length <= chunkSize || separatorIndex >= separators.length) {
      return textToSplit.trim() ? [textToSplit.trim()] : [];
    }

    const separator = separators[separatorIndex];
    let splits: string[] = [];

    if (separator === '') {
      for (let i = 0; i < textToSplit.length; i += chunkSize - chunkOverlap) {
        splits.push(textToSplit.slice(i, i + chunkSize));
      }
      return splits;
    } else {
      splits = textToSplit.split(separator);
    }

    const goodSplits: string[] = [];
    let currentChunk = '';

    for (const piece of splits) {
      if (!piece) continue;

      if ((currentChunk + separator + piece).length <= chunkSize) {
        currentChunk = currentChunk ? currentChunk + separator + piece : piece;
      } else {
        if (currentChunk) {
          goodSplits.push(currentChunk.trim());
        }

        if (piece.length > chunkSize) {
          const subChunks = split(piece, separatorIndex + 1);
          goodSplits.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = piece;
        }
      }
    }

    if (currentChunk) {
      goodSplits.push(currentChunk.trim());
    }

    return goodSplits.filter(Boolean);
  }

  return split(text, 0);
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function searchSimilarChunks(
  queryEmbedding: number[],
  topK: number = 5
): Array<{ chunk: ChunkRecord; score: number }> {
  const chunks = getAllChunks();
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export { insertChunks };

