import { Router } from 'express';
import { createChatMessage, getChatHistory } from '../db.js';
import { askChat } from '../services/chat.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const message = (req.body?.message || '').trim();
    const sessionId = req.body?.session_id || 'default';

    if (!message) {
      return res.status(400).json({ error: 'message is required.' });
    }

    createChatMessage(sessionId, 'user', message);

    const apiKey = (req.headers['x-gemini-key'] as string) || undefined;
    const result = await askChat(message, 5, apiKey);

    createChatMessage(sessionId, 'assistant', result.answer, result.sources);

    return res.json(result);
  } catch (err: any) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: err?.message || 'Chat error occurred.' });
  }
});

router.get('/history/', (req, res) => {
  const sessionId = (req.query.session_id as string) || 'default';
  const history = getChatHistory(sessionId);
  res.json(history);
});

export default router;
