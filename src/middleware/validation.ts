import { Request, Response, NextFunction } from 'express';
import { ValidationError as CustomValidationError } from '../utils/errors';

/**
 * Middleware для валидации тела запроса
 */
export const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Простая валидация required полей
      if (schema.required) {
        for (const field of schema.required) {
          if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
            throw new CustomValidationError(`Field '${field}' is required`);
          }
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware для валидации query параметров
 */
export const validateQuery = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Простая валидация
      if (schema.required) {
        for (const field of schema.required) {
          if (!req.query[field]) {
            throw new CustomValidationError(`Query parameter '${field}' is required`);
          }
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware для валидации params
 */
export const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.required) {
        for (const field of schema.required) {
          if (!req.params[field]) {
            throw new CustomValidationError(`Parameter '${field}' is required`);
          }
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
