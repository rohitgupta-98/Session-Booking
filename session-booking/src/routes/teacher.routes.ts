import { Router } from 'express';
import { createTeacher, getAllTeachers } from '../controllers/teacher.controller';

const router = Router();

// POST /teachers - Create a teacher (seed data helper)
router.post('/', createTeacher);

// GET /teachers - List all teachers
router.get('/', getAllTeachers);

export default router;
