import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  getAllDocuments,
  getDocumentById,
  createDocument,
  deleteAllDocuments
} from '../db.js';
import { ingestDocument, clearAll } from '../services/ingest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = `${base}-${Date.now()}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .pdf and .txt files are supported.'));
    }
  }
});

const router = Router();

router.post('/upload/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const document = createDocument(req.file.originalname, req.file.path, 'uploaded');
    const apiKey = (req.headers['x-gemini-key'] as string) || undefined;

    // Process in background asynchronously
    setTimeout(() => {
      ingestDocument(document, apiKey).catch((e) => console.error('Ingest error:', e));
    }, 0);

    return res.status(201).json(document);
  });
});

router.get('/', (_req, res) => {
  const documents = getAllDocuments();
  res.json(documents);
});

router.get('/:id/', (req, res) => {
  const doc = getDocumentById(Number(req.params.id));
  if (!doc) {
    return res.status(404).json({ error: 'Not found.' });
  }
  res.json(doc);
});

router.post('/clear/', (_req, res) => {
  clearAll(UPLOADS_DIR);
  res.json({ status: 'cleared' });
});

export default router;

