import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

const handleMongooseCastError = (err: MongooseError.CastError): AppError => {
  const message = `Invalid ${err.path}: "${err.value}"`;
  return new AppError(message, 400);
};

const handleMongooseDuplicateKey = (err: MongoError): AppError => {
  const field = Object.keys(err.keyValue || {}).join(', ');
  const message = `Duplicate value for field: ${field}. Please use a different value.`;
  return new AppError(message, 409);
};

const handleMongooseValidationError = (
  err: MongooseError.ValidationError
): AppError => {
  const errors = Object.values(err.errors).map((e) => e.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: Error | AppError | MongooseError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = err as AppError;

  // Mongoose CastError (invalid ObjectId)
  if (err instanceof MongooseError.CastError) {
    error = handleMongooseCastError(err);
  }

  // MongoDB duplicate key error
  if ((err as MongoError).code === 11000) {
    error = handleMongooseDuplicateKey(err as MongoError);
  }

  // Mongoose validation error
  if (err instanceof MongooseError.ValidationError) {
    error = handleMongooseValidationError(err);
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal Server Error';

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('Unhandled Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && statusCode === 500
      ? { stack: err.stack }
      : {}),
  });
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
