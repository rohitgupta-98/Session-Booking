import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Session } from '../models/session.model';
import { Teacher } from '../models/teacher.model';
import { User } from '../models/user.model';
import { AppError } from '../middleware/errorHandler';
import { SessionStatus } from '../types';

// POST /sessions
export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { teacherId, startTime, endTime } = req.body;

    if (!teacherId || !startTime || !endTime) {
      throw new AppError('teacherId, startTime, and endTime are required', 400);
    }

    if (!mongoose.isValidObjectId(teacherId)) {
      throw new AppError('Invalid teacherId', 400);
    }

    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid date format for startTime or endTime', 400);
    }

    if (end <= start) {
      throw new AppError('endTime must be greater than startTime', 400);
    }

    const session = await Session.create({
      teacherId,
      startTime: start,
      endTime: end,
      status: SessionStatus.AVAILABLE,
    });

    // Populate teacher info for the response
    const populated = await Session.findById(session._id)
      .populate('teacherId', 'fullName email specialization experience')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /sessions/available?dateTimestamp={timestamp}
export const getAvailableSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dateTimestamp } = req.query as { dateTimestamp?: string };

    if (!dateTimestamp) {
      throw new AppError('dateTimestamp query parameter is required', 400);
    }

    const timestamp = Number(dateTimestamp);
    if (isNaN(timestamp)) {
      throw new AppError('dateTimestamp must be a valid Unix timestamp (ms)', 400);
    }

    // Build start and end of the requested day (UTC)
    const requestedDate = new Date(timestamp);
    const dayStart = new Date(requestedDate);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(requestedDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Mandatory: Aggregation Pipeline
    const sessions = await Session.aggregate([
      {
        $match: {
          status: SessionStatus.AVAILABLE,
          startTime: {
            $gte: dayStart,
            $lte: dayEnd,
          },
        },
      },
      {
        $lookup: {
          from: 'teachers',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: {
          path: '$teacher',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          startTime: 1,
          endTime: 1,
          status: 1,
          createdAt: 1,
          'teacher._id': 1,
          'teacher.fullName': 1,
          'teacher.email': 1,
          'teacher.specialization': 1,
          'teacher.experience': 1,
        },
      },
      {
        $sort: { startTime: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: sessions,
      meta: {
        date: dayStart.toISOString().split('T')[0],
        total: sessions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /sessions/:id/book
export const bookSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new AppError('userId is required in request body', 400);
    }

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid session ID', 400);
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError('Invalid userId', 400);
    }

    // Check user exists
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check session exists
    const session = await Session.findById(id);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Only AVAILABLE sessions can be booked
    if (session.status === SessionStatus.BOOKED) {
      throw new AppError('Session is already booked', 409);
    }

    if (session.status === SessionStatus.COMPLETED) {
      throw new AppError('Session is already completed and cannot be booked', 409);
    }

    if (session.status !== SessionStatus.AVAILABLE) {
      throw new AppError('Only AVAILABLE sessions can be booked', 400);
    }

    // Update session
    session.status = SessionStatus.BOOKED;
    session.userId = new mongoose.Types.ObjectId(userId);
    await session.save();

    const populated = await Session.findById(session._id)
      .populate('teacherId', 'fullName email specialization experience')
      .populate('userId', 'fullName email phone')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Session booked successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:id/complete
export const completeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid session ID', 400);
    }

    const session = await Session.findById(id);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.status === SessionStatus.AVAILABLE) {
      throw new AppError(
        'Session must be BOOKED before it can be marked as completed',
        400
      );
    }

    if (session.status === SessionStatus.COMPLETED) {
      throw new AppError('Session is already marked as completed', 409);
    }

    if (session.status !== SessionStatus.BOOKED) {
      throw new AppError('Only BOOKED sessions can be marked as completed', 400);
    }

    session.status = SessionStatus.COMPLETED;
    session.completedAt = new Date();
    await session.save();

    const populated = await Session.findById(session._id)
      .populate('teacherId', 'fullName email specialization experience')
      .populate('userId', 'fullName email phone')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Session marked as completed',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};
