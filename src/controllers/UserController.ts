import { Request, Response } from 'express';
import UserService from '../services/UserService';
import TransactionService from '../services/TransactionService';
import WonItem from '../models/WonItem';
import { asyncHandler } from '../middleware/errorHandler';

export class UserController {
  /**
   * Получение текущего пользователя
   * GET /api/users/me
   */
  getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.getUserById(req.userId!);
    
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        reservedBalance: user.reservedBalance,
        availableBalance: user.getAvailableBalance(),
        totalBids: user.totalBids,
        totalWins: user.totalWins,
        totalSpent: user.totalSpent,
      },
    });
  });

  /**
   * Получение профиля пользователя
   * GET /api/users/:id
   */
  getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.getUserById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        totalBids: user.totalBids,
        totalWins: user.totalWins,
        totalSpent: user.totalSpent,
      },
    });
  });

  /**
   * Обновление профиля
   * PUT /api/users/me
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const { username, email } = req.body;
    
    const user = await UserService.updateUser(req.userId!, {
      username,
      email,
    });
    
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  });

  /**
   * Получение баланса
   * GET /api/users/me/balance
   */
  getBalance = asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.getUserById(req.userId!);
    
    res.status(200).json({
      success: true,
      data: {
        balance: user.balance,
        reservedBalance: user.reservedBalance,
        availableBalance: user.getAvailableBalance(),
      },
    });
  });

  /**
   * Пополнение баланса (демо)
   * POST /api/users/me/deposit
   */
  deposit = asyncHandler(async (req: Request, res: Response) => {
    const { amount, description } = req.body;
    
    const user = await UserService.deposit({
      userId: req.userId!,
      amount,
      description,
    });
    
    res.status(200).json({
      success: true,
      data: {
        balance: user.balance,
        reservedBalance: user.reservedBalance,
        availableBalance: user.getAvailableBalance(),
      },
      message: `Deposited ${amount} successfully`,
    });
  });

  /**
   * Вывод средств (демо)
   * POST /api/users/me/withdraw
   */
  withdraw = asyncHandler(async (req: Request, res: Response) => {
    const { amount, description } = req.body;
    
    const user = await UserService.withdraw({
      userId: req.userId!,
      amount,
      description,
    });
    
    res.status(200).json({
      success: true,
      data: {
        balance: user.balance,
        reservedBalance: user.reservedBalance,
        availableBalance: user.getAvailableBalance(),
      },
      message: `Withdrawn ${amount} successfully`,
    });
  });

  /**
   * Получение транзакций пользователя
   * GET /api/users/me/transactions
   */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, type, fromDate, toDate } = req.query;
    
    const result = await TransactionService.getUserTransactions(req.userId!, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as any,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    });
    
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Получение выигрышей пользователя
   * GET /api/users/me/wins
   */
  getMyWins = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const [wins, total] = await Promise.all([
      WonItem.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('auctionId', 'name currency'),
      WonItem.countDocuments({ userId: req.userId }),
    ]);
    
    const totalPages = Math.ceil(total / Number(limit));
    
    res.status(200).json({
      success: true,
      data: wins,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    });
  });

  /**
   * Получение статистики пользователя
   * GET /api/users/me/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await UserService.getUserStats(req.userId!);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  });
}

export default new UserController();
