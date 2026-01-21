import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Глобальный обработчик ошибок
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Логирование ошибки
  logger.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.userId,
  });
  
  // Обработка кастомных ошибок
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }
  
  // Обработка ошибок валидации Mongoose
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message,
      statusCode: 400,
    });
    return;
  }
  
  // Обработка ошибок CastError (невалидный ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      statusCode: 400,
    });
    return;
  }
  
  // Обработка ошибок дублирования (unique constraint)
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Duplicate key error',
      statusCode: 409,
    });
    return;
  }
  
  // Неизвестная ошибка
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    statusCode: 500,
  });
};

/**
 * Обработчик для несуществующих маршрутов
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
  });
};

/**
 * Async wrapper для обработки ошибок в async функциях
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
