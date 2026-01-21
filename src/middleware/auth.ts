import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import UserService from '../services/UserService';
import { UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

// Расширяем Request для добавления userId
declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
      user?: any;
    }
  }
}

/**
 * Middleware для проверки JWT токена
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Получение токена из заголовка
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }
    
    const token = authHeader.substring(7); // Убираем "Bearer "
    
    // Проверка токена
    const userId = UserService.verifyToken(token);
    
    // Добавляем userId в request
    req.userId = userId;
    
    // Опционально: загрузка пользователя
    const user = await UserService.getUserById(userId);
    req.user = user;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * Опциональная аутентификация (не обязательная)
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userId = UserService.verifyToken(token);
      req.userId = userId;
      
      const user = await UserService.getUserById(userId);
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Игнорируем ошибки при опциональной аутентификации
    next();
  }
};

/**
 * Проверка роли администратора
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // В будущем можно добавить проверку роли
  // Пока просто проверяем аутентификацию
  if (!req.userId) {
    next(new UnauthorizedError('Admin access required'));
    return;
  }
  
  next();
};
