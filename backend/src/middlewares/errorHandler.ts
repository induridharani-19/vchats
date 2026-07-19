import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/appError';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('API Error:', err);
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    // Mongoose bad ObjectId format
    statusCode = 400;
    message = 'Invalid resource ID';
  } else if ((err as any).code === 11000) {
    // Mongoose duplicate key error
    statusCode = 400;
    const key = Object.keys((err as any).keyValue)[0];
    message = `Duplicate field value: ${key}. Please use another value!`;
  }

  // Set response headers to JSON
  res.setHeader('Content-Type', 'application/json');

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
