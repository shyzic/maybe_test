import { Types } from 'mongoose';
import Auction, { IAuction } from '../models/Auction';
import Round from '../models/Round';
import Bid from '../models/Bid';
import WonItem from '../models/WonItem';
import { AUCTION_STATUSES } from '../config/constants';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errors';
import {
  validateObjectId,
  validateString,
  validateAuctionParams,
  validatePagination,
  sanitizeString,
} from '../utils/validation';
import {
  calculateTotalRounds,
  calculateItemsInRound,
  addSeconds,
} from '../utils/helpers';
import logger from '../utils/logger';
import {
  CreateAuctionInput,
  UpdateAuctionInput,
  AuctionQuery,
  PaginatedResponse,
  AuctionStats,
} from '../types';

export class AuctionService {
  /**
   * Создание аукциона с автоматическим созданием всех раундов
   */
  async createAuction(input: CreateAuctionInput): Promise<IAuction> {
    try {
      // Валидация
      validateString(input.name, 'Auction name', { minLength: 3, maxLength: 200 });
      
      if (input.description) {
        validateString(input.description, 'Description', { maxLength: 2000 });
      }
      
      validateAuctionParams({
        totalItems: input.totalItems,
        itemsPerRound: input.itemsPerRound,
        roundDuration: input.roundDuration,
        antiSnipeWindow: input.antiSnipeWindow,
        antiSnipeExtension: input.antiSnipeExtension,
        maxExtensions: input.maxExtensions,
        minBid: input.minBid,
        minBidStep: input.minBidStep,
      });
      
      // Парсинг даты
      const startTime = typeof input.startTime === 'string' 
        ? new Date(input.startTime) 
        : input.startTime;
      
      if (startTime.getTime() <= Date.now()) {
        throw new ValidationError('Start time must be in the future');
      }
      
      // Вычисление количества раундов
      const totalRounds = calculateTotalRounds(
        input.totalItems,
        input.itemsPerRound
      );
      
      // Создание аукциона
      const auction = await Auction.create({
        name: sanitizeString(input.name),
        description: input.description ? sanitizeString(input.description) : undefined,
        imageUrl: input.imageUrl,
        totalItems: input.totalItems,
        itemsPerRound: input.itemsPerRound,
        startTime,
        roundDuration: input.roundDuration,
        antiSnipeWindow: input.antiSnipeWindow,
        antiSnipeExtension: input.antiSnipeExtension,
        maxExtensions: input.maxExtensions,
        minBid: input.minBid,
        minBidStep: input.minBidStep,
        currency: input.currency.toUpperCase(),
        status: AUCTION_STATUSES.SCHEDULED,
        currentRound: 0,
        totalRounds,
        createdBy: input.createdBy,
      });
      
      // Создание всех раундов
      await this.createRoundsForAuction(auction);
      
      logger.info(
        `Auction created: ${auction.name} (${totalRounds} rounds, ${input.totalItems} items)`
      );
      
      return auction;
    } catch (error) {
      logger.error('Error creating auction:', error);
      throw error;
    }
  }

  /**
   * Создание всех раундов для аукциона
   */
  private async createRoundsForAuction(auction: IAuction): Promise<void> {
    const rounds = [];
    let currentStartTime = new Date(auction.startTime);
    
    for (let i = 1; i <= auction.totalRounds; i++) {
      const itemsInRound = calculateItemsInRound(
        i,
        auction.totalItems,
        auction.itemsPerRound,
        auction.totalRounds
      );
      
      const scheduledEndTime = addSeconds(currentStartTime, auction.roundDuration);
      
      rounds.push({
        auctionId: auction._id,
        roundNumber: i,
        itemsInRound,
        scheduledStartTime: currentStartTime,
        scheduledEndTime,
        actualStartTime: undefined,
        actualEndTime: undefined,
        extensionsCount: 0,
        status: 'scheduled',
        winnersProcessed: false,
      });
      
      // Следующий раунд начинается сразу после предыдущего
      currentStartTime = new Date(scheduledEndTime);
    }
    
    await Round.insertMany(rounds);
    
    logger.info(`Created ${rounds.length} rounds for auction ${auction.name}`);
  }

  /**
   * Получение аукциона по ID
   */
  async getAuctionById(auctionId: string | Types.ObjectId): Promise<IAuction> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const auction = await Auction.findById(auctionId);
      
      if (!auction) {
        throw new NotFoundError('Auction not found');
      }
      
      return auction;
    } catch (error) {
      logger.error('Error getting auction by ID:', error);
      throw error;
    }
  }

  /**
   * Получение списка аукционов
   */
  async getAuctions(query?: AuctionQuery & {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<IAuction>> {
    try {
      const { page, limit } = validatePagination({
        page: query?.page,
        limit: query?.limit,
      });
      
      const skip = (page - 1) * limit;
      
      // Построение фильтра
      const filter: any = {};
      
      if (query?.status) {
        if (Array.isArray(query.status)) {
          filter.status = { $in: query.status };
        } else {
          filter.status = query.status;
        }
      }
      
      if (query?.createdBy) {
        filter.createdBy = query.createdBy;
      }
      
      if (query?.startTimeFrom || query?.startTimeTo) {
        filter.startTime = {};
        if (query.startTimeFrom) {
          filter.startTime.$gte = query.startTimeFrom;
        }
        if (query.startTimeTo) {
          filter.startTime.$lte = query.startTimeTo;
        }
      }
      
      // Получение данных
      const [auctions, total] = await Promise.all([
        Auction.find(filter)
          .sort({ startTime: -1 })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'username'),
        Auction.countDocuments(filter),
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: auctions,
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
      logger.error('Error getting auctions:', error);
      throw error;
    }
  }

  /**
   * Обновление аукциона
   */
  async updateAuction(
    auctionId: string | Types.ObjectId,
    input: UpdateAuctionInput
  ): Promise<IAuction> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const auction = await this.getAuctionById(auctionId);
      
      // Проверка, что аукцион еще не начался
      if (auction.status !== AUCTION_STATUSES.SCHEDULED) {
        throw new ConflictError('Cannot update auction that has already started');
      }
      
      // Обновление полей
      if (input.name) {
        validateString(input.name, 'Auction name', { minLength: 3, maxLength: 200 });
        auction.name = sanitizeString(input.name);
      }
      
      if (input.description !== undefined) {
        if (input.description) {
          validateString(input.description, 'Description', { maxLength: 2000 });
          auction.description = sanitizeString(input.description);
        } else {
          auction.description = undefined;
        }
      }
      
      if (input.imageUrl !== undefined) {
        auction.imageUrl = input.imageUrl;
      }
      
      if (input.status) {
        auction.status = input.status;
      }
      
      await auction.save();
      
      logger.info(`Auction updated: ${auction.name}`);
      
      return auction;
    } catch (error) {
      logger.error('Error updating auction:', error);
      throw error;
    }
  }

  /**
   * Отмена аукциона
   */
  async cancelAuction(auctionId: string | Types.ObjectId): Promise<IAuction> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const auction = await this.getAuctionById(auctionId);
      
      if (auction.status === AUCTION_STATUSES.COMPLETED) {
        throw new ConflictError('Cannot cancel completed auction');
      }
      
      if (auction.status === AUCTION_STATUSES.CANCELLED) {
        throw new ConflictError('Auction is already cancelled');
      }
      
      auction.status = AUCTION_STATUSES.CANCELLED;
      await auction.save();
      
      // TODO: Возврат средств всем участникам (будет в BidService)
      
      logger.info(`Auction cancelled: ${auction.name}`);
      
      return auction;
    } catch (error) {
      logger.error('Error cancelling auction:', error);
      throw error;
    }
  }

  /**
   * Запуск аукциона (принудительный старт)
   */
  async startAuction(auctionId: string | Types.ObjectId): Promise<IAuction> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const auction = await this.getAuctionById(auctionId);
      
      if (auction.status !== AUCTION_STATUSES.SCHEDULED) {
        throw new ConflictError('Auction must be in scheduled status to start');
      }
      
      auction.status = AUCTION_STATUSES.ACTIVE;
      auction.currentRound = 1;
      await auction.save();
      
      // Запуск первого раунда через RoundService будет в следующем шаге
      
      logger.info(`Auction started: ${auction.name}`);
      
      return auction;
    } catch (error) {
      logger.error('Error starting auction:', error);
      throw error;
    }
  }

  /**
   * Получение статистики аукциона
   */
  async getAuctionStats(auctionId: string | Types.ObjectId): Promise<AuctionStats> {
    try {
      const id = typeof auctionId === 'string' ? auctionId : auctionId.toString();
      validateObjectId(id, 'Auction ID');
      
      const auction = await this.getAuctionById(auctionId);
      
      // Агрегация статистики по ставкам
      const [bidStats] = await Bid.aggregate([
        { $match: { auctionId: auction._id } },
        {
          $group: {
            _id: null,
            totalBids: { $sum: 1 },
            totalBidders: { $addToSet: '$userId' },
            totalAmount: { $sum: '$amount' },
            highestBid: { $max: '$amount' },
            lowestBid: { $min: '$amount' },
          },
        },
        {
          $project: {
            totalBids: 1,
            totalBidders: { $size: '$totalBidders' },
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
      
      // Количество завершенных раундов
      const completedRounds = await Round.countDocuments({
        auctionId: auction._id,
        status: 'completed',
      });
      
      // Количество распределенных товаров
      const itemsDistributed = await WonItem.countDocuments({
        auctionId: auction._id,
      });
      
      return {
        auctionId: auction._id,
        totalBids: bidStats?.totalBids || 0,
        totalBidders: bidStats?.totalBidders || 0,
        totalAmount: bidStats?.totalAmount || 0,
        averageBid: bidStats?.averageBid || 0,
        highestBid: bidStats?.highestBid || 0,
        lowestBid: bidStats?.lowestBid || 0,
        completedRounds,
        itemsDistributed,
      };
    } catch (error) {
      logger.error('Error getting auction stats:', error);
      throw error;
    }
  }

  /**
   * Получение активных аукционов
   */
  async getActiveAuctions(): Promise<IAuction[]> {
    try {
      return await Auction.find({
        status: AUCTION_STATUSES.ACTIVE,
      }).sort({ currentRound: 1 });
    } catch (error) {
      logger.error('Error getting active auctions:', error);
      throw error;
    }
  }

  /**
   * Получение запланированных аукционов
   */
  async getScheduledAuctions(): Promise<IAuction[]> {
    try {
      return await Auction.find({
        status: AUCTION_STATUSES.SCHEDULED,
        startTime: { $lte: new Date() },
      }).sort({ startTime: 1 });
    } catch (error) {
      logger.error('Error getting scheduled auctions:', error);
      throw error;
    }
  }

  /**
   * Проверка, завершен ли аукцион
   */
  async checkAuctionCompletion(auctionId: string | Types.ObjectId): Promise<void> {
    try {
      const auction = await this.getAuctionById(auctionId);
      
      if (auction.status !== AUCTION_STATUSES.ACTIVE) {
        return;
      }
      
      // Проверяем, завершились ли все раунды
      const activeRounds = await Round.countDocuments({
        auctionId: auction._id,
        status: { $ne: 'completed' },
      });
      
      if (activeRounds === 0 && auction.currentRound >= auction.totalRounds) {
        auction.status = AUCTION_STATUSES.COMPLETED;
        await auction.save();
        
        logger.info(`Auction completed: ${auction.name}`);
      }
    } catch (error) {
      logger.error('Error checking auction completion:', error);
      throw error;
    }
  }
}

export default new AuctionService();
