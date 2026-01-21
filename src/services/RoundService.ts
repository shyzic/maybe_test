import mongoose, { Types } from 'mongoose';
import Round, { IRound } from '../models/Round';
import Auction from '../models/Auction';
import Bid from '../models/Bid';
import WonItem from '../models/WonItem';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { ROUND_STATUSES, BID_STATUSES, TRANSACTION_TYPES } from '../config/constants';
import {
  NotFoundError,
  ConflictError,
} from '../utils/errors';
import {
  validateObjectId,
} from '../utils/validation';
import {
  calculateStartItemNumber,
  isInAntiSnipeWindow,
} from '../utils/helpers';
import logger from '../utils/logger';
import { RoundQuery, PaginatedResponse } from '../types';

export class RoundService {
  /**
   * Получение раунда по ID
   */
  async getRoundById(roundId: string | Types.ObjectId): Promise<IRound> {
    try {
      const id = typeof roundId === 'string' ? roundId : roundId.toString();
      validateObjectId(id, 'Round ID');
      
      const round = await Round.findById(roundId);
      
      if (!round) {
        throw new NotFoundError('Round not found');
      }
      
      return round;
    } catch (error) {
      logger.error('Error getting round by ID:', error);
      throw error;
    }
  }

  /**
   * Получение раундов аукциона
   */
  async getAuctionRounds(
    auctionId: string | Types.ObjectId,
    query?: RoundQuery
  ): Promise<IRound[]> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const filter: any = { auctionId };
      
      if (query?.status) {
        if (Array.isArray(query.status)) {
          filter.status = { $in: query.status };
        } else {
          filter.status = query.status;
        }
      }
      
      if (query?.roundNumber) {
        filter.roundNumber = query.roundNumber;
      }
      
      return await Round.find(filter).sort({ roundNumber: 1 });
    } catch (error) {
      logger.error('Error getting auction rounds:', error);
      throw error;
    }
  }

  /**
   * Получение текущего активного раунда аукциона
   */
  async getCurrentRound(auctionId: string | Types.ObjectId): Promise<IRound | null> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      return await Round.findOne({
        auctionId,
        status: ROUND_STATUSES.ACTIVE,
      });
    } catch (error) {
      logger.error('Error getting current round:', error);
      throw error;
    }
  }

  /**
   * Запуск раунда
   */
  async startRound(roundId: string | Types.ObjectId): Promise<IRound> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const id = typeof roundId === 'string' ? roundId : roundId.toString();
      validateObjectId(id, 'Round ID');
      
      const round = await Round.findById(roundId).session(session);
      
      if (!round) {
        throw new NotFoundError('Round not found');
      }
      
      if (round.status !== ROUND_STATUSES.SCHEDULED) {
        throw new ConflictError('Round must be in scheduled status to start');
      }
      
      // Обновление раунда
      round.status = ROUND_STATUSES.ACTIVE;
      round.actualStartTime = new Date();
      round.actualEndTime = new Date(
        round.actualStartTime.getTime() + 
        (round.scheduledEndTime.getTime() - round.scheduledStartTime.getTime())
      );
      
      await round.save({ session });
      
      // Перенос ставок из предыдущего раунда
      if (round.roundNumber > 1) {
        await this.carryOverBids(round.auctionId, round.roundNumber, session);
      }
      
      // Обновление аукциона
      await Auction.updateOne(
        { _id: round.auctionId },
        { 
          $set: { 
            currentRound: round.roundNumber,
            status: 'active',
          }
        },
        { session }
      );
      
      await session.commitTransaction();
      
      logger.info(
        `Round ${round.roundNumber} started for auction ${round.auctionId}`
      );
      
      return round;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error starting round:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Перенос ставок из предыдущего раунда
   */
  private async carryOverBids(
    auctionId: Types.ObjectId,
    currentRoundNumber: number,
    session: mongoose.ClientSession
  ): Promise<void> {
    try {
      const previousRoundNumber = currentRoundNumber - 1;
      
      // Найти все ставки со статусом carried_over из предыдущего раунда
      const bidsToCarryOver = await Bid.find({
        auctionId,
        currentRound: previousRoundNumber,
        status: BID_STATUSES.CARRIED_OVER,
      }).session(session);
      
      // Обновить статус на active и currentRound на текущий раунд
      for (const bid of bidsToCarryOver) {
        bid.status = BID_STATUSES.ACTIVE;
        bid.currentRound = currentRoundNumber;
        
        bid.history.push({
          action: 'carried_over',
          amount: bid.amount,
          round: currentRoundNumber,
          timestamp: new Date(),
        });
        
        await bid.save({ session });
      }
      
      logger.info(
        `Carried over ${bidsToCarryOver.length} bids to round ${currentRoundNumber}`
      );
    } catch (error) {
      logger.error('Error carrying over bids:', error);
      throw error;
    }
  }

  /**
   * Продление раунда (anti-sniping)
   */
  async extendRound(
    roundId: string | Types.ObjectId,
    extensionSeconds: number
  ): Promise<IRound> {
    try {
      const id = typeof roundId === 'string' ? roundId : roundId.toString();
      validateObjectId(id, 'Round ID');
      
      const round = await this.getRoundById(roundId);
      const auction = await Auction.findById(round.auctionId);
      
      if (!auction) {
        throw new NotFoundError('Auction not found');
      }
      
      // Проверка возможности продления
      if (!round.canExtend(auction.maxExtensions)) {
        logger.warn(`Round ${round.roundNumber} cannot be extended (max reached)`);
        return round;
      }
      
      // Продление
      round.extend(extensionSeconds);
      await round.save();
      
      logger.info(
        `Round ${round.roundNumber} extended by ${extensionSeconds}s (${round.extensionsCount} extensions)`
      );
      
      // WebSocket событие
      const { emitRoundExtended } = require('../websocket/events');
      emitRoundExtended({
        auctionId: round.auctionId,
        roundNumber: round.roundNumber,
        newEndTime: round.actualEndTime!,
        extensionsCount: round.extensionsCount,
      });
      
      // Перепланировать завершение раунда
      const { rescheduleRoundEnd } = require('../jobs/queue');
      await rescheduleRoundEnd({
        roundId: round._id.toString(),
        auctionId: auction._id.toString(),
        newEndTime: round.actualEndTime!,
      });
      
      return round;
    } catch (error) {
      logger.error('Error extending round:', error);
      throw error;
    }
  }

  /**
   * Завершение раунда и определение победителей
   */
  async completeRound(roundId: string | Types.ObjectId): Promise<IRound> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const id = typeof roundId === 'string' ? roundId : roundId.toString();
      validateObjectId(id, 'Round ID');
      
      const round = await Round.findById(roundId).session(session);
      
      if (!round) {
        throw new NotFoundError('Round not found');
      }
      
      if (round.status !== ROUND_STATUSES.ACTIVE) {
        throw new ConflictError('Round must be active to complete');
      }
      
      const auction = await Auction.findById(round.auctionId).session(session);
      
      if (!auction) {
        throw new NotFoundError('Auction not found');
      }
      
      // Обработка победителей
      await this.processWinners(round, auction, session);
      
      // Обновление статуса раунда
      round.status = ROUND_STATUSES.COMPLETED;
      round.actualEndTime = new Date();
      round.winnersProcessed = true;
      
      await round.save({ session });
      
      await session.commitTransaction();
      
      logger.info(
        `Round ${round.roundNumber} completed for auction ${auction.name}`
      );
      
      return round;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error completing round:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Обработка победителей раунда
   */
  private async processWinners(
    round: IRound,
    auction: any,
    session: mongoose.ClientSession
  ): Promise<void> {
    try {
      // Получить все активные ставки раунда, отсортированные по сумме (по убыванию) и времени (по возрастанию)
      const bids = await Bid.find({
        auctionId: round.auctionId,
        currentRound: round.roundNumber,
        status: BID_STATUSES.ACTIVE,
      })
        .sort({ amount: -1, createdAt: 1 })
        .session(session);
      
      // Определить победителей
      const winnersCount = Math.min(round.itemsInRound, bids.length);
      const winners = bids.slice(0, winnersCount);
      const losers = bids.slice(winnersCount);
      
      // Рассчитать начальный номер предмета для раунда
      const startItemNumber = calculateStartItemNumber(
        round.roundNumber,
        auction.itemsPerRound
      );
      
      // Обработать победителей
      for (let i = 0; i < winners.length; i++) {
        const bid = winners[i];
        const itemNumber = startItemNumber + i;
        
        // Обновить ставку
        bid.status = BID_STATUSES.WON;
        bid.wonItemNumber = itemNumber;
        bid.wonInRound = round.roundNumber;
        bid.wonPosition = i + 1;
        
        bid.history.push({
          action: 'won',
          amount: bid.amount,
          round: round.roundNumber,
          timestamp: new Date(),
        });
        
        await bid.save({ session });
        
        // Обновить пользователя
        const user = await User.findById(bid.userId).session(session);
        
        if (user) {
          user.reservedBalance -= bid.amount;
          user.totalWins += 1;
          user.totalSpent += bid.amount;
          
          await user.save({ session });
          
          // Создать транзакцию
          await Transaction.create([{
            userId: bid.userId,
            type: TRANSACTION_TYPES.BID_WON,
            amount: bid.amount,
            auctionId: round.auctionId,
            bidId: bid._id,
            balanceBefore: user.balance + bid.amount,
            balanceAfter: user.balance,
            description: `Won item #${itemNumber} in auction ${auction.name}`,
          }], { session });
        }
        
        // Создать запись о выигрыше
        await WonItem.create([{
          auctionId: round.auctionId,
          userId: bid.userId,
          bidId: bid._id,
          itemNumber,
          roundNumber: round.roundNumber,
          positionInRound: i + 1,
          winningBidAmount: bid.amount,
        }], { session });
      }
      
      // Обработать проигравших
      const isLastRound = round.roundNumber >= auction.totalRounds;
      
      for (const bid of losers) {
        if (isLastRound) {
          // Последний раунд - возврат средств
          await this.refundBid(bid, auction, session);
        } else {
          // Перенос в следующий раунд
          bid.status = BID_STATUSES.CARRIED_OVER;
          bid.currentRound = round.roundNumber + 1;
          
          bid.history.push({
            action: 'carried_over',
            amount: bid.amount,
            round: round.roundNumber + 1,
            timestamp: new Date(),
          });
          
          await bid.save({ session });
        }
      }
      
      logger.info(
        `Processed ${winners.length} winners and ${losers.length} losers for round ${round.roundNumber}`
      );
    } catch (error) {
      logger.error('Error processing winners:', error);
      throw error;
    }
  }

  /**
   * Возврат средств за ставку
   */
  private async refundBid(
    bid: any,
    auction: any,
    session: mongoose.ClientSession
  ): Promise<void> {
    try {
      const user = await User.findById(bid.userId).session(session);
      
      if (!user) {
        logger.error(`User not found for bid ${bid._id}`);
        return;
      }
      
      // Вернуть из резерва в доступный баланс
      user.balance += bid.amount;
      user.reservedBalance -= bid.amount;
      
      await user.save({ session });
      
      // Обновить статус ставки
      bid.status = BID_STATUSES.REFUNDED;
      
      bid.history.push({
        action: 'refunded',
        amount: bid.amount,
        round: bid.currentRound,
        timestamp: new Date(),
      });
      
      await bid.save({ session });
      
      // Создать транзакцию
      await Transaction.create([{
        userId: bid.userId,
        type: TRANSACTION_TYPES.BID_REFUNDED,
        amount: bid.amount,
        auctionId: bid.auctionId,
        bidId: bid._id,
        balanceBefore: user.balance - bid.amount,
        balanceAfter: user.balance,
        description: `Refund for auction ${auction.name}`,
      }], { session });
      
      logger.info(`Refunded ${bid.amount} to user ${user.username}`);
    } catch (error) {
      logger.error('Error refunding bid:', error);
      throw error;
    }
  }

  /**
   * Получение активных раундов
   */
  async getActiveRounds(): Promise<IRound[]> {
    try {
      return await Round.find({
        status: ROUND_STATUSES.ACTIVE,
      }).sort({ scheduledEndTime: 1 });
    } catch (error) {
      logger.error('Error getting active rounds:', error);
      throw error;
    }
  }

  /**
   * Получение запланированных раундов, готовых к запуску
   */
  async getScheduledRounds(): Promise<IRound[]> {
    try {
      return await Round.find({
        status: ROUND_STATUSES.SCHEDULED,
        scheduledStartTime: { $lte: new Date() },
      }).sort({ scheduledStartTime: 1 });
    } catch (error) {
      logger.error('Error getting scheduled rounds:', error);
      throw error;
    }
  }

  /**
   * Получение раундов, готовых к завершению
   */
  async getCompletedRounds(): Promise<IRound[]> {
    try {
      return await Round.find({
        status: ROUND_STATUSES.ACTIVE,
        actualEndTime: { $lte: new Date() },
        winnersProcessed: false,
      }).sort({ actualEndTime: 1 });
    } catch (error) {
      logger.error('Error getting completed rounds:', error);
      throw error;
    }
  }

  /**
   * Проверка необходимости продления раунда при новой ставке
   */
  async checkAntiSnipe(
    roundId: string | Types.ObjectId,
    antiSnipeWindow: number,
    antiSnipeExtension: number,
    maxExtensions?: number
  ): Promise<boolean> {
    try {
      const round = await this.getRoundById(roundId);
      
      if (!round.actualEndTime) {
        return false;
      }
      
      // Проверка, находимся ли мы в окне anti-sniping
      const inWindow = isInAntiSnipeWindow(
        new Date(),
        round.actualEndTime,
        antiSnipeWindow
      );
      
      if (!inWindow) {
        return false;
      }
      
      // Проверка возможности продления
      if (!round.canExtend(maxExtensions)) {
        return false;
      }
      
      // Продление раунда
      await this.extendRound(roundId, antiSnipeExtension);
      
      return true;
    } catch (error) {
      logger.error('Error checking anti-snipe:', error);
      return false;
    }
  }
}

export default new RoundService();
