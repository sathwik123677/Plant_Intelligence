import { Router } from 'express';
import { askGraph, getSummary } from '../services/graph.js';

const router = Router();

router.post('/query/', async (req, res) => {
  const question = (req.body?.question || '').trim();
  if (!question) {
    return res.status(400).json({ error: 'question is required.' });
  }

  const apiKey = (req.headers['x-gemini-key'] as string) || undefined;
  const result = await askGraph(question, apiKey);
  res.json(result);
});

router.get('/summary/', async (_req, res) => {
  const summary = await getSummary();
  res.json(summary);
});

export default router;
