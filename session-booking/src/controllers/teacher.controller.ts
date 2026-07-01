import { Request, Response, NextFunction } from 'express';
import { Teacher } from '../models/teacher.model';
import { AppError } from '../middleware/errorHandler';

// POST /teachers  (helper endpoint — not in spec but needed to seed data)
export const createTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, email, specialization, experience } = req.body;

    if (!fullName || !email || !specialization || experience === undefined) {
      throw new AppError(
        'fullName, email, specialization, and experience are required',
        400
      );
    }

    const teacher = await Teacher.create({
      fullName,
      email,
      specialization,
      experience,
    });

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

// GET /teachers
export const getAllTeachers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teachers = await Teacher.find().lean();

    res.status(200).json({
      success: true,
      data: teachers,
      meta: { total: teachers.length },
    });
  } catch (error) {
    next(error);
  }
};
