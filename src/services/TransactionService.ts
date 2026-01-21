import { Types } from 'mongoose';
import Transaction, { ITransaction } from '../models/Transaction';
import { TransactionType, TRANSACTION_TYPES } from '../config/constants';
import { validateObjectId, validatePagination } from '../utils/validation';
import logger from '../utils/logger';
import { TransactionQuery, PaginatedResponse } from '../types';

export class TransactionService {
  /**
   * Создание транзакции
   */
  async createTransaction(input: {
    userId: Types.ObjectId;
    type: TransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    auctionId?: Types.ObjectId;
    bidId?: Types.ObjectId;
  }): Promise<ITransaction> {
    try {
      const transaction = await Transaction.create({
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        description: input.description,
        auctionId: input.auctionId,
        bidId: input.bidId,
      });
      
      logger.info(
        `Transaction created: ${input.type} for user ${input.userId}, amount: ${input.amount}`
      );
      
      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Получение транзакции по ID
   */
  async getTransactionById(transactionId: string | Types.ObjectId): Promise<ITransaction> {
    try {
      const id = typeof transactionId === 'string' ? transactionId : transactionId.toString();
      validateObjectId(id, 'Transaction ID');
      
      const transaction = await Transaction.findById(transactionId);
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      return transaction;
    } catch (error) {
      logger.error('Error getting transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Получение транзакций пользователя
   */
  async getUserTransactions(
    userId: string | Types.ObjectId,
    query?: TransactionQuery & { page?: number; limit?: number }
  ): Promise<PaginatedResponse<ITransaction>> {
    try {
      const id = typeof userId === 'string' ? userId : userId.toString();
      validateObjectId(id, 'User ID');
      
      const { page, limit } = validatePagination({
        page: query?.page,
        limit: query?.limit,
      });
      
      const skip = (page - 1) * limit;
      
      // Построение фильтра
      const filter: any = { userId };
      
      if (query?.type) {
        if (Array.isArray(query.type)) {
          filter.type = { $in: query.type };
        } else {
          filter.type = query.type;
        }
      }
      
      if (query?.auctionId) {
        filter.auctionId = query.auctionId;
      }
      
      if (query?.fromDate || query?.toDate) {
        filter.createdAt = {};
        if (query.fromDate) {
          filter.createdAt.$gte = query.fromDate;
        }
        if (query.toDate) {
          filter.createdAt.$lte = query.toDate;
        }
      }
      
      // Получение данных
      const [transactions, total] = await Promise.all([
        Transaction.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Transaction.countDocuments(filter),
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error getting user transactions:', error);
      throw error;
    }
  }

  /**
   * Получение статистики транзакций пользователя
   */
  async getUserTransactionStats(userId: string | Types.ObjectId): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalBidPlaced: number;
    totalBidWon: number;
    totalRefunded: number;
  }> {
    try {
      const id = typeof userId === 'string' ? userId : userId.toString();
      validateObjectId(id, 'User ID');
      
      const stats = await Transaction.aggregate([
        { $match: { userId: new Types.ObjectId(id) } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]);
      
      const result = {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBidPlaced: 0,
        totalBidWon: 0,
        totalRefunded: 0,
      };
      
      stats.forEach((stat) => {
        switch (stat._id) {
          case TRANSACTION_TYPES.DEPOSIT:
            result.totalDeposits = stat.total;
            break;
          case TRANSACTION_TYPES.WITHDRAWAL:
            result.totalWithdrawals = stat.total;
            break;
          case TRANSACTION_TYPES.BID_PLACED:
          case TRANSACTION_TYPES.BID_INCREASED:
            result.totalBidPlaced += stat.total;
            break;
          case TRANSACTION_TYPES.BID_WON:
            result.totalBidWon = stat.total;
            break;
          case TRANSACTION_TYPES.BID_REFUNDED:
            result.totalRefunded = stat.total;
            break;
        }
      });
      
      return result;
    } catch (error) {
      logger.error('Error getting user transaction stats:', error);
      throw error;
    }
  }

  /**
   * Получение последних транзакций
   */
  async getRecentTransactions(query?: {
    page?: number;
    limit?: number;
    type?: TransactionType | TransactionType[];
  }): Promise<PaginatedResponse<ITransaction>> {
    try {
      const { page, limit } = validatePagination({
        page: query?.page,
        limit: query?.limit,
      });
      
      const skip = (page - 1) * limit;
      
      const filter: any = {};
      
      if (query?.type) {
        if (Array.isArray(query.type)) {
          filter.type = { $in: query.type };
        } else {
          filter.type = query.type;
        }
      }
      
      const [transactions, total] = await Promise.all([
        Transaction.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'username')
          .populate('auctionId', 'name'),
        Transaction.countDocuments(filter),
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      throw error;
    }
  }
}

export default new TransactionService();
