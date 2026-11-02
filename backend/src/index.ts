import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import documentsRouter from './routes/documents.js';
import chatRouter from './routes/chat.js';
import graphRouter from './routes/graph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root (.env) and local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Gemini-Key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/media/uploads', express.static(path.resolve(__dirname, '../uploads')));

// API Routes
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/graph', graphRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Plant Intelligence TypeScript Backend running at http://127.0.0.1:${PORT}`);
  console.log(`Endpoints available:`);
  console.log(`  - POST /api/documents/upload/`);
  console.log(`  - GET  /api/documents/`);
  console.log(`  - POST /api/documents/clear/`);
  console.log(`  - POST /api/chat/`);
  console.log(`  - GET  /api/chat/history/`);
  console.log(`  - POST /api/graph/query/`);
  console.log(`  - GET  /api/graph/summary/`);
});

