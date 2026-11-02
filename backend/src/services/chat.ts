import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEmbedding, getGeminiKey } from './ingest.js';
import { searchSimilarChunks } from './vectorstore.js';

const CANDIDATE_CHAT_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash'
];

const PROMPT_TEMPLATE = `You are a knowledge assistant answering questions about the documents that have been uploaded and indexed (which may include a pre-loaded industrial plant knowledge base, or documents the user uploaded themselves).

Context:
{context}

Question: {question}

Answer:`;

export async function askChat(
  question: string,
  k: number = 5,
  apiKey?: string
): Promise<{ answer: string; sources: Array<{ filename: string; snippet: string }> }> {
  const queryEmbedding = await getEmbedding(question, apiKey);
  const searchResults = searchSimilarChunks(queryEmbedding, k);

  const context = searchResults.map((r) => r.chunk.content).join('\n\n');
  const prompt = PROMPT_TEMPLATE
    .replace('{context}', context || 'No relevant documents found.')
    .replace('{question}', question);

  const key = getGeminiKey(apiKey);
  const genAI = new GoogleGenerativeAI(key);

  let responseText = '';
  let lastError: any = null;

  for (const modelName of CANDIDATE_CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0 }
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) {
        responseText = text;
        break;
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  if (!responseText && lastError) {
    throw lastError;
  }

  const sources: Array<{ filename: string; snippet: string }> = [];
  const seen = new Set<string>();

  for (const item of searchResults) {
    const filename = item.chunk.source;
    if (!seen.has(filename)) {
      seen.add(filename);
      sources.push({
        filename,
        snippet: item.chunk.content.slice(0, 220)
      });
    }
  }

  return {
    answer: responseText,
    sources
  };
}
