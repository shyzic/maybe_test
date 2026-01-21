import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import User, { IUser } from '../models/User';
import Transaction from '../models/Transaction';
import env from '../config/env';
import { TRANSACTION_TYPES } from '../config/constants';
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  InsufficientBalanceError,
} from '../utils/errors';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateAmount,
  validateObjectId,
  sanitizeString,
} from '../utils/validation';
import logger from '../utils/logger';
import {
  CreateUserInput,
  UpdateUserInput,
  DepositInput,
  WithdrawalInput,
  UserStats,
} from '../types';

export class UserService {
  /**
   * Регистрация нового пользователя
   */
  async register(input: {
    username: string;
    email?: string;
    password?: string;
    initialBalance?: number;
  }): Promise<{ user: IUser; token: string }> {
    try {
      // Валидация
      validateUsername(input.username);
      
      if (input.email) {
        validateEmail(input.email);
      }
      
      if (input.password) {
        validatePassword(input.password);
      }
      
      // Проверка уникальности username
      const existingUser = await User.findOne({
        username: sanitizeString(input.username),
      });
      
      if (existingUser) {
        throw new ConflictError('Username already exists');
      }
      
      // Проверка уникальности email
      if (input.email) {
        const existingEmail = await User.findOne({
          email: input.email.toLowerCase(),
        });
        
        if (existingEmail) {
          throw new ConflictError('Email already exists');
        }
      }
      
      // Хеширование пароля
      let passwordHash: string | undefined;
      if (input.password) {
        passwordHash = await bcrypt.hash(input.password, 10);
      }
      
      // Создание пользователя
      const user = await User.create({
        username: sanitizeString(input.username),
        email: input.email?.toLowerCase(),
        passwordHash,
        balance: input.initialBalance || env.demoInitialBalance,
        reservedBalance: 0,
      });
      
      // Создание транзакции для начального баланса
      if (user.balance > 0) {
        await Transaction.create({
          userId: user._id,
          type: TRANSACTION_TYPES.DEPOSIT,
          amount: user.balance,
          balanceBefore: 0,
          balanceAfter: user.balance,
          description: 'Initial balance',
        });
      }
      
      // Генерация JWT токена
      const token = this.generateToken(user._id);
      
      logger.info(`User registered: ${user.username}`);
      
      return { user, token };
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Вход пользователя
   */
  async login(input: {
    username: string;
    password: string;
  }): Promise<{ user: IUser; token: string }> {
    try {
      validateUsername(input.username);
      validatePassword(input.password);
      
      // Поиск пользователя
      const user = await User.findOne({
        username: sanitizeString(input.username),
      });
      
      if (!user) {
        throw new UnauthorizedError('Invalid username or password');
      }
      
      if (!user.passwordHash) {
        throw new UnauthorizedError('Password not set for this user');
      }
      
      // Проверка пароля
      const isPasswordValid = await bcrypt.compare(
        input.password,
        user.passwordHash
      );
      
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid username or password');
      }
      
      // Генерация токена
      const token = this.generateToken(user._id);
      
      logger.info(`User logged in: ${user.username}`);
      
      return { user, token };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    }
  }

  /**
   * Получение пользователя по ID
   */
  async getUserById(userId: string | Types.ObjectId): Promise<IUser> {
    try {
      const id = typeof userId === 'string' ? userId : userId.toString();
      validateObjectId(id, 'User ID');
      
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      return user;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Получение пользователя по username
   */
  async getUserByUsername(username: string): Promise<IUser> {
    try {
      validateUsername(username);
      
      const user = await User.findOne({
        username: sanitizeString(username),
      });
      
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      return user;
    } catch (error) {
      logger.error('Error getting user by username:', error);
      throw error;
    }
  }

  /**
   * Обновление профиля пользователя
   */
  async updateUser(
    userId: string | Types.ObjectId,
    input: UpdateUserInput
  ): Promise<IUser> {
    try {
      const id = typeof userId === 'string' ? userId : userId.toString();
      validateObjectId(id, 'User ID');
      
      const user = await this.getUserById(userId);
      
      // Валидация и обновление username
      if (input.username) {
        validateUsername(input.username);
        
        const existingUser = await User.findOne({
          username: sanitizeString(input.username),
          _id: { $ne: user._id },
        });
        
        if (existingUser) {
          throw new ConflictError('Username already exists');
        }
        
        user.username = sanitizeString(input.username);
      }
      
      // Валидация и обновление email
      if (input.email) {
        validateEmail(input.email);
        
        const existingEmail = await User.findOne({
          email: input.email.toLowerCase(),
          _id: { $ne: user._id },
        });
        
        if (existingEmail) {
          throw new ConflictError('Email already exists');
        }
        
        user.email = input.email.toLowerCase();
      }
      
      await user.save();
      
      logger.info(`User updated: ${user.username}`);
      
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Пополнение баланса (демо режим)
   */
  async deposit(input: DepositInput): Promise<IUser> {
    try {
      validateObjectId(input.userId.toString(), 'User ID');
      validateAmount(input.amount, 'Deposit amount');
      
      const user = await this.getUserById(input.userId);
      
      const balanceBefore = user.balance;
      user.balance += input.amount;
      
      await user.save();
      
      // Создание транзакции
      await Transaction.create({
        userId: user._id,
        type: TRANSACTION_TYPES.DEPOSIT,
        amount: input.amount,
        balanceBefore,
        balanceAfter: user.balance,
        description: input.description || 'Balance deposit',
      });
      
      logger.info(
        `User ${user.username} deposited ${input.amount}. New balance: ${user.balance}`
      );
      
      return user;
    } catch (error) {
      logger.error('Error depositing funds:', error);
      throw error;
    }
  }

  /**
   * Вывод средств (демо режим)
   */
  async withdraw(input: WithdrawalInput): Promise<IUser> {
    try {
      validateObjectId(input.userId.toString(), 'User ID');
      validateAmount(input.amount, 'Withdrawal amount');
      
      const user = await this.getUserById(input.userId);
      
      // Проверка доступного баланса
      const availableBalance = user.getAvailableBalance();
      
      if (availableBalance < input.amount) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Available: ${availableBalance}, Requested: ${input.amount}`
        );
      }
      
      const balanceBefore = user.balance;
      user.balance -= input.amount;
      
      await user.save();
      
      // Создание транзакции
      await Transaction.create({
        userId: user._id,
        type: TRANSACTION_TYPES.WITHDRAWAL,
        amount: input.amount,
        balanceBefore,
        balanceAfter: user.balance,
        description: input.description || 'Balance withdrawal',
      });
      
      logger.info(
        `User ${user.username} withdrew ${input.amount}. New balance: ${user.balance}`
      );
      
      return user;
    } catch (error) {
      logger.error('Error withdrawing funds:', error);
      throw error;
    }
  }

  /**
   * Получение статистики пользователя
   */
  async getUserStats(userId: string | Types.ObjectId): Promise<UserStats> {
    try {
      const id = typeof userId === 'string' ? userId : userId.toString();
      validateObjectId(id, 'User ID');
      
      const user = await this.getUserById(userId);
      
      return {
        userId: user._id,
        totalBids: user.totalBids,
        activeBids: 0, // Будет вычисляться в BidService
        totalWins: user.totalWins,
        totalSpent: user.totalSpent,
        averageWinAmount: user.totalWins > 0 ? user.totalSpent / user.totalWins : 0,
        participatedAuctions: 0, // Будет вычисляться в BidService
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Проверка JWT токена
   */
  verifyToken(token: string): Types.ObjectId {
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as { userId: string };
      return new Types.ObjectId(decoded.userId);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /**
   * Генерация JWT токена
   */
private generateToken(userId: Types.ObjectId): string {
  // Мы используем 'as Secret', чтобы гарантировать наличие ключа.
  // Также убедись, что expiresIn — это строка или число.
  return jwt.sign(
    { userId: userId.toString() }, 
    env.jwtSecret as string, 
    {
      expiresIn: env.jwtExpiresIn as any, // as any нужен, если в env тип не строго StringValue
    }
  );
}

  /**
   * Получение списка пользователей (для админа)
   */
  async getAllUsers(params: {
    page?: number;
    limit?: number;
  }): Promise<{ users: IUser[]; total: number }> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(),
      ]);
      
      return { users, total };
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }
}

export default new UserService();
