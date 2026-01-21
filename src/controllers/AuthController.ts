import { Request, Response } from 'express';
import UserService from '../services/UserService';
import { asyncHandler } from '../middleware/errorHandler';

export class AuthController {
  /**
   * Регистрация нового пользователя
   * POST /api/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, initialBalance } = req.body;
    
    const result = await UserService.register({
      username,
      email,
      password,
      initialBalance,
    });
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: result.user._id,
          username: result.user.username,
          email: result.user.email,
          balance: result.user.balance,
          reservedBalance: result.user.reservedBalance,
        },
        token: result.token,
      },
    });
  });

  /**
   * Вход пользователя
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    
    const result = await UserService.login({
      username,
      password,
    });
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: result.user._id,
          username: result.user.username,
          email: result.user.email,
          balance: result.user.balance,
          reservedBalance: result.user.reservedBalance,
        },
        token: result.token,
      },
    });
  });

  /**
   * Получение текущего пользователя
   * GET /api/auth/me
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.getUserById(req.userId!);
    
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        reservedBalance: user.reservedBalance,
        totalBids: user.totalBids,
        totalWins: user.totalWins,
        totalSpent: user.totalSpent,
      },
    });
  });
}

export default new AuthController();
