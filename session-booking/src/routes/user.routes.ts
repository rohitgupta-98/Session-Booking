import { Router } from 'express';
import { createUser, getUserSessions } from '../controllers/user.controller';

const router = Router();

// POST /users - Create a new user
router.post('/', createUser);

// GET /users/:id/sessions - Get all sessions for a user
router.get('/:id/sessions', getUserSessions);

export default router;
