import 'dotenv/config';
import express, { Request, Response } from 'express';
import { connectDB } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import userRoutes from './routes/user.routes';
import teacherRoutes from './routes/teacher.routes';
import sessionRoutes from './routes/session.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Session Booking API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/users', userRoutes);
app.use('/teachers', teacherRoutes);
app.use('/sessions', sessionRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\nAvailable endpoints:');
    console.log('  GET    /health');
    console.log('  POST   /users');
    console.log('  GET    /users/:id/sessions');
    console.log('  POST   /teachers');
    console.log('  GET    /teachers');
    console.log('  POST   /sessions');
    console.log('  GET    /sessions/available?dateTimestamp={ts}');
    console.log('  POST   /sessions/:id/book');
    console.log('  PATCH  /sessions/:id/complete');
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
