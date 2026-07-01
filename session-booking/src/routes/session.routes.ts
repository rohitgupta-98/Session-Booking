import { Router } from 'express';
import {
  createSession,
  getAvailableSessions,
  bookSession,
  completeSession,
} from '../controllers/session.controller';

const router = Router();

// POST /sessions - Create a new session
router.post('/', createSession);

// GET /sessions/available?dateTimestamp={timestamp} - Available sessions for a date

router.get('/available', getAvailableSessions);

// POST /sessions/:id/book - Book a session
router.post('/:id/book', bookSession);

// PATCH /sessions/:id/complete - Mark session as complete
router.patch('/:id/complete', completeSession);

export default router;
