import mongoose, { Types } from 'mongoose';
import Bid, { IBid } from '../models/Bid';
import User from '../models/User';
import Auction from '../models/Auction';
import Round from '../models/Round';
import Transaction from '../models/Transaction';
import RoundService from './RoundService';
import { BID_STATUSES, TRANSACTION_TYPES } from '../config/constants';
import {
  NotFoundError,
  ConflictError,
  InsufficientBalanceError,
  AuctionNotActiveError,
  RoundNotActiveError,
  BidTooLowError,
  ValidationError,
} from '../utils/errors';
import {
  validateObjectId,
  validateAmount,
} from '../utils/validation';
import {
  calculateMinNextBid,
} from '../utils/helpers';
import logger from '../utils/logger';
import {
  PlaceBidInput,
  IncreaseBidInput,
  BidQuery,
  PaginatedResponse,
  LeaderboardEntry,
  RoundLeaderboard,
} from '../types';

export class BidService {
  /**
   * Размещение новой ставки
   */
  async placeBid(input: PlaceBidInput): Promise<IBid> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      validateObjectId(input.auctionId.toString(), 'Auction ID');
      validateObjectId(input.userId.toString(), 'User ID');
      validateAmount(input.amount, 'Bid amount');
      
      // Получение аукциона
      const auction = await Auction.findById(input.auctionId).session(session);
      
      if (!auction) {
        throw new NotFoundError('Auction not found');
      }
      
      if (!auction.canAcceptBids()) {
        throw new AuctionNotActiveError('Auction is not accepting bids');
      }
      
      // Получение текущего раунда
      const currentRound = await Round.findOne({
        auctionId: input.auctionId,
        status: 'active',
      }).session(session);
      
      if (!currentRound) {
        throw new RoundNotActiveError('No active round found');
      }
      
      // Проверка минимальной ставки
      if (input.amount < auction.minBid) {
        throw new BidTooLowError(
          `Bid must be at least ${auction.minBid} ${auction.currency}`
        );
      }
      
      // Получение пользователя
      const user = await User.findById(input.userId).session(session);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Проверка наличия активной ставки
      const existingBid = await Bid.findOne({
        auctionId: input.auctionId,
        userId: input.userId,
        status: BID_STATUSES.ACTIVE,
      }).session(session);
      
      if (existingBid) {
        throw new ConflictError(
          'You already have an active bid. Use increaseBid to raise your bid.'
        );
      }
      
      // Проверка доступного баланса
      if (!user.hasAvailableBalance(input.amount)) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Available: ${user.getAvailableBalance()}, Required: ${input.amount}`
        );
      }
      
      // Резервирование средств
      const balanceBefore = user.balance;
      user.reservedBalance += input.amount;
      user.totalBids += 1;
      
      await user.save({ session });
      
      // Создание ставки
      const bid = await Bid.create([{
        auctionId: input.auctionId,
        userId: input.userId,
        amount: input.amount,
        originalAmount: input.amount,
        createdInRound: currentRound.roundNumber,
        currentRound: currentRound.roundNumber,
        status: BID_STATUSES.ACTIVE,
        history: [], // Будет добавлено в pre-save hook
      }], { session });
      
      // Создание транзакции
      await Transaction.create([{
        userId: input.userId,
        type: TRANSACTION_TYPES.BID_PLACED,
        amount: input.amount,
        auctionId: input.auctionId,
        bidId: bid[0]._id,
        balanceBefore,
        balanceAfter: user.balance,
        description: `Bid placed in ${auction.name}`,
      }], { session });
      
      await session.commitTransaction();
      
      logger.info(
        `Bid placed: ${input.amount} ${auction.currency} by user ${user.username} in auction ${auction.name}`
      );
      
      // WebSocket события
      const { emitBidPlaced, emitLeaderboardUpdated } = require('../websocket/events');
      emitBidPlaced({
        auctionId: bid[0].auctionId,
        bidId: bid[0]._id,
        userId: user._id,
        username: user.username,
        amount: bid[0].amount,
        roundNumber: currentRound.roundNumber,
      });
      emitLeaderboardUpdated({
        auctionId: auction._id,
        roundNumber: currentRound.roundNumber,
      });
      
      // Проверка anti-sniping (вне транзакции)
      await RoundService.checkAntiSnipe(
        currentRound._id,
        auction.antiSnipeWindow,
        auction.antiSnipeExtension,
        auction.maxExtensions
      );
      
      return bid[0];
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error placing bid:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Повышение существующей ставки
   */
  async increaseBid(input: IncreaseBidInput): Promise<IBid> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      validateObjectId(input.bidId.toString(), 'Bid ID');
      validateObjectId(input.userId.toString(), 'User ID');
      validateAmount(input.newAmount, 'New bid amount');
      
      // Получение ставки с оптимистичной блокировкой
      const bid = await Bid.findById(input.bidId).session(session);
      
      if (!bid) {
        throw new NotFoundError('Bid not found');
      }
      
      // Проверка владельца
      if (bid.userId.toString() !== input.userId.toString()) {
        throw new ConflictError('You can only increase your own bids');
      }
      
      // Проверка статуса
      if (!bid.canIncrease()) {
        throw new ConflictError('Bid cannot be increased in current status');
      }
      
      // Получение аукциона
      const auction = await Auction.findById(bid.auctionId).session(session);
      
      if (!auction) {
        throw new NotFoundError('Auction not found');
      }
      
      // Проверка минимального шага
      const minNextBid = calculateMinNextBid(bid.amount, auction.minBidStep);
      
      if (input.newAmount < minNextBid) {
        throw new BidTooLowError(
          `New bid must be at least ${minNextBid.toFixed(2)} ${auction.currency} (${auction.minBidStep}% increase)`
        );
      }
      
      // Вычисление разницы
      const difference = input.newAmount - bid.amount;
      
      // Получение пользователя
      const user = await User.findById(input.userId).session(session);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Проверка доступного баланса
      if (!user.hasAvailableBalance(difference)) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Available: ${user.getAvailableBalance()}, Required: ${difference}`
        );
      }
      
      // Резервирование дополнительных средств
      const balanceBefore = user.balance;
      user.reservedBalance += difference;
      
      await user.save({ session });
      
      // Обновление ставки
      const previousAmount = bid.amount;
      bid.amount = input.newAmount;
      
      bid.history.push({
        action: 'increased',
        amount: input.newAmount,
        round: bid.currentRound,
        timestamp: new Date(),
        previousAmount,
      });
      
      await bid.save({ session });
      
      // Создание транзакции
      await Transaction.create([{
        userId: input.userId,
        type: TRANSACTION_TYPES.BID_INCREASED,
        amount: difference,
        auctionId: bid.auctionId,
        bidId: bid._id,
        balanceBefore,
        balanceAfter: user.balance,
        description: `Bid increased from ${previousAmount} to ${input.newAmount} in ${auction.name}`,
      }], { session });
      
      await session.commitTransaction();
      
      logger.info(
        `Bid increased: ${previousAmount} → ${input.newAmount} ${auction.currency} by user ${user.username}`
      );
      
      // WebSocket события
      const { emitBidIncreased, emitLeaderboardUpdated } = require('../websocket/events');
      emitBidIncreased({
        auctionId: bid.auctionId,
        bidId: bid._id,
        userId: user._id,
        username: user.username,
        previousAmount,
        newAmount: input.newAmount,
        roundNumber: bid.currentRound,
      });
      emitLeaderboardUpdated({
        auctionId: auction._id,
        roundNumber: bid.currentRound,
      });
      
      // Проверка anti-sniping (вне транзакции)
      const currentRound = await Round.findOne({
        auctionId: bid.auctionId,
        roundNumber: bid.currentRound,
        status: 'active',
      });
      
      if (currentRound) {
        await RoundService.checkAntiSnipe(
          currentRound._id,
          auction.antiSnipeWindow,
          auction.antiSnipeExtension,
          auction.maxExtensions
        );
      }
      
      return bid;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error increasing bid:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Получение ставки по ID
   */
  async getBidById(bidId: string | Types.ObjectId): Promise<IBid> {
    try {
      const id = typeof bidId === 'string' ? bidId : bidId.toString();
      validateObjectId(id, 'Bid ID');
      
      const bid = await Bid.findById(bidId)
        .populate('userId', 'username')
        .populate('auctionId', 'name currency');
      
      if (!bid) {
        throw new NotFoundError('Bid not found');
      }
      
      return bid;
    } catch (error) {
      logger.error('Error getting bid by ID:', error);
      throw error;
    }
  }

  /**
   * Получение ставок пользователя
   */
  async getUserBids(
    userId: string | Types.ObjectId,
    query?: BidQuery & { page?: number; limit?: number }
  ): Promise<PaginatedResponse<IBid>> {
    try {
      const id = typeof userId === 'string' ? userId : userId.toString();
      validateObjectId(id, 'User ID');
      
      const page = query?.page || 1;
      const limit = query?.limit || 20;
      const skip = (page - 1) * limit;
      
      // Построение фильтра
      const filter: any = { userId };
      
      if (query?.auctionId) {
        filter.auctionId = query.auctionId;
      }
      
      if (query?.status) {
        if (Array.isArray(query.status)) {
          filter.status = { $in: query.status };
        } else {
          filter.status = query.status;
        }
      }
      
      if (query?.currentRound) {
        filter.currentRound = query.currentRound;
      }
      
      // Получение данных
      const [bids, total] = await Promise.all([
        Bid.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('auctionId', 'name currency status'),
        Bid.countDocuments(filter),
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: bids,
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
      logger.error('Error getting user bids:', error);
      throw error;
    }
  }

  /**
   * Получение активных ставок аукциона
   */
  async getAuctionBids(
    auctionId: string | Types.ObjectId,
    roundNumber?: number
  ): Promise<IBid[]> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const filter: any = {
        auctionId,
        status: BID_STATUSES.ACTIVE,
      };
      
      if (roundNumber) {
        filter.currentRound = roundNumber;
      }
      
      return await Bid.find(filter)
        .sort({ amount: -1, createdAt: 1 })
        .populate('userId', 'username');
    } catch (error) {
      logger.error('Error getting auction bids:', error);
      throw error;
    }
  }

  /**
   * Получение leaderboard раунда
   */
  async getRoundLeaderboard(
    auctionId: string | Types.ObjectId,
    roundNumber: number,
    currentUserId?: Types.ObjectId
  ): Promise<RoundLeaderboard> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const auction = await Auction.findById(auctionId);
      
      if (!auction) {
        throw new NotFoundError('Auction not found');
      }
      
      const round = await Round.findOne({
        auctionId,
        roundNumber,
      });
      
      if (!round) {
        throw new NotFoundError('Round not found');
      }
      
      // Получение всех активных ставок раунда
      const bids = await Bid.find({
        auctionId,
        currentRound: roundNumber,
        status: BID_STATUSES.ACTIVE,
      })
        .sort({ amount: -1, createdAt: 1 })
        .populate('userId', 'username');
      
      // Формирование leaderboard
      const entries: LeaderboardEntry[] = bids.map((bid, index) => ({
        position: index + 1,
        userId: bid.userId._id,
        username: (bid.userId as any).username,
        amount: bid.amount,
        isCurrentUser: currentUserId 
          ? bid.userId._id.toString() === currentUserId.toString()
          : false,
      }));
      
      return {
        auctionId: auction._id,
        roundNumber,
        totalBids: bids.length,
        itemsInRound: round.itemsInRound,
        entries,
        cutoffPosition: round.itemsInRound,
      };
    } catch (error) {
      logger.error('Error getting round leaderboard:', error);
      throw error;
    }
  }

  /**
   * Получение позиции пользователя в leaderboard
   */
  async getUserPosition(
    auctionId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    roundNumber?: number
  ): Promise<{ position: number; totalBids: number; isWinning: boolean } | null> {
    try {
      const auctionOid = typeof auctionId === 'string' ? new Types.ObjectId(auctionId) : auctionId;
      const userOid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
      
      validateObjectId(auctionOid.toString(), 'Auction ID');
      validateObjectId(userOid.toString(), 'User ID');
      
      // Получение ставки пользователя
      const userBid = await Bid.findOne({
        auctionId: auctionOid,
        userId: userOid,
        status: BID_STATUSES.ACTIVE,
        ...(roundNumber ? { currentRound: roundNumber } : {}),
      });
      
      if (!userBid) {
        return null;
      }
      
      // Подсчет позиции (количество ставок выше)
      const higherBids = await Bid.countDocuments({
        auctionId: auctionOid,
        currentRound: userBid.currentRound,
        status: BID_STATUSES.ACTIVE,
        $or: [
          { amount: { $gt: userBid.amount } },
          { 
            amount: userBid.amount,
            createdAt: { $lt: userBid.createdAt }
          },
        ],
      });
      
      const position = higherBids + 1;
      
      // Общее количество ставок
      const totalBids = await Bid.countDocuments({
        auctionId: auctionOid,
        currentRound: userBid.currentRound,
        status: BID_STATUSES.ACTIVE,
      });
      
      // Проверка, выигрывает ли пользователь
      const round = await Round.findOne({
        auctionId: auctionOid,
        roundNumber: userBid.currentRound,
      });
      
      const isWinning = round ? position <= round.itemsInRound : false;
      
      return {
        position,
        totalBids,
        isWinning,
      };
    } catch (error) {
      logger.error('Error getting user position:', error);
      throw error;
    }
  }

  /**
   * Отмена ставки (если разрешено)
   */
  async cancelBid(
    bidId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<IBid> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      validateObjectId(bidId.toString(), 'Bid ID');
      validateObjectId(userId.toString(), 'User ID');
      
      const bid = await Bid.findById(bidId).session(session);
      
      if (!bid) {
        throw new NotFoundError('Bid not found');
      }
      
      // Проверка владельца
      if (bid.userId.toString() !== userId.toString()) {
        throw new ConflictError('You can only cancel your own bids');
      }
      
      // Проверка статуса
      if (bid.status !== BID_STATUSES.ACTIVE) {
        throw new ConflictError('Only active bids can be cancelled');
      }
      
      // Проверка, начался ли раунд
      const round = await Round.findOne({
        auctionId: bid.auctionId,
        roundNumber: bid.currentRound,
      }).session(session);
      
      if (round && round.status === 'active') {
        throw new ConflictError('Cannot cancel bid after round has started');
      }
      
      // Возврат средств
      const user = await User.findById(userId).session(session);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      const balanceBefore = user.balance;
      user.balance += bid.amount;
      user.reservedBalance -= bid.amount;
      
      await user.save({ session });
      
      // Обновление ставки
      bid.status = BID_STATUSES.REFUNDED;
      
      bid.history.push({
        action: 'refunded',
        amount: bid.amount,
        round: bid.currentRound,
        timestamp: new Date(),
      });
      
      await bid.save({ session });
      
      // Создание транзакции
      await Transaction.create([{
        userId,
        type: TRANSACTION_TYPES.BID_REFUNDED,
        amount: bid.amount,
        auctionId: bid.auctionId,
        bidId: bid._id,
        balanceBefore,
        balanceAfter: user.balance,
        description: 'Bid cancelled by user',
      }], { session });
      
      await session.commitTransaction();
      
      logger.info(`Bid cancelled by user ${user.username}`);
      
      return bid;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error cancelling bid:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Получение статистики ставок аукциона
   */
  async getAuctionBidStats(auctionId: string | Types.ObjectId): Promise<{
    totalBids: number;
    activeBids: number;
    uniqueBidders: number;
    totalAmount: number;
    averageBid: number;
    highestBid: number;
    lowestBid: number;
  }> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const [stats] = await Bid.aggregate([
        { $match: { auctionId: new Types.ObjectId(id) } },
        {
          $group: {
            _id: null,
            totalBids: { $sum: 1 },
            activeBids: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            uniqueBidders: { $addToSet: '$userId' },
            totalAmount: { $sum: '$amount' },
            highestBid: { $max: '$amount' },
            lowestBid: { $min: '$amount' },
          },
        },
        {
          $project: {
            totalBids: 1,
            activeBids: 1,
            uniqueBidders: { $size: '$uniqueBidders' },
            totalAmount: 1,
            averageBid: {
              $cond: [
                { $gt: ['$totalBids', 0] },
                { $divide: ['$totalAmount', '$totalBids'] },
                0
              ]
            },
            highestBid: 1,
            lowestBid: 1,
          },
        },
      ]);
      
      return stats || {
        totalBids: 0,
        activeBids: 0,
        uniqueBidders: 0,
        totalAmount: 0,
        averageBid: 0,
        highestBid: 0,
        lowestBid: 0,
      };
    } catch (error) {
      logger.error('Error getting auction bid stats:', error);
      throw error;
    }
  }
}

export default new BidService();
