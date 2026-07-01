import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { Session } from '../models/session.model';
import { AppError } from '../middleware/errorHandler';
import { SessionStatus } from '../types';
import mongoose from 'mongoose';

// POST /users
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, email, phone } = req.body;

    if (!fullName || !email || !phone) {
      throw new AppError('fullName, email, and phone are required', 400);
    }

    const user = await User.create({ fullName, email, phone });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// GET /users/:id/sessions
export const getUserSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid user ID', 400);
    }

    const userExists = await User.findById(id).lean();
    if (!userExists) {
      throw new AppError('User not found', 404);
    }

    // Aggregation pipeline: separate upcoming and completed sessions with teacher details
    const result = await Session.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(id),
          status: { $in: [SessionStatus.BOOKED, SessionStatus.COMPLETED] },
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
          completedAt: 1,
          createdAt: 1,
          'teacher._id': 1,
          'teacher.fullName': 1,
          'teacher.email': 1,
          'teacher.specialization': 1,
          'teacher.experience': 1,
        },
      },
      {
        $facet: {
          upcomingSessions: [
            { $match: { status: SessionStatus.BOOKED } },
            { $sort: { startTime: 1 } },
          ],
          completedSessions: [
            { $match: { status: SessionStatus.COMPLETED } },
            { $sort: { completedAt: -1 } },
          ],
        },
      },
      {
        $project: {
          upcomingSessions: 1,
          completedSessions: 1,
          totalUpcoming: { $size: '$upcomingSessions' },
          totalCompleted: { $size: '$completedSessions' },
        },
      },
    ]);

    const sessionData = result[0] || {
      upcomingSessions: [],
      completedSessions: [],
      totalUpcoming: 0,
      totalCompleted: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: userExists._id,
          fullName: userExists.fullName,
          email: userExists.email,
        },
        upcomingSessions: sessionData.upcomingSessions,
        completedSessions: sessionData.completedSessions,
        meta: {
          totalUpcoming: sessionData.totalUpcoming,
          totalCompleted: sessionData.totalCompleted,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
