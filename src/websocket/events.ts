import { Types } from 'mongoose';
import { getWebSocketServer } from './server';
import logger from '../utils/logger';

/**
 * Событие: Аукцион начался
 */
export const emitAuctionStarted = (data: {
  auctionId: Types.ObjectId;
  name: string;
  currentRound: number;
  startTime: Date;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToAuction(data.auctionId.toString(), 'auction:started', {
      auctionId: data.auctionId.toString(),
      name: data.name,
      currentRound: data.currentRound,
      startTime: data.startTime,
    });
    logger.info(`Event: auction:started for ${data.auctionId}`);
  } catch (error) {
    logger.error('Error emitting auction:started:', error);
  }
};

/**
 * Событие: Аукцион завершен
 */
export const emitAuctionCompleted = (data: {
  auctionId: Types.ObjectId;
  totalRounds: number;
  totalWinners: number;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToAuction(data.auctionId.toString(), 'auction:completed', {
      auctionId: data.auctionId.toString(),
      totalRounds: data.totalRounds,
      totalWinners: data.totalWinners,
    });
    logger.info(`Event: auction:completed for ${data.auctionId}`);
  } catch (error) {
    logger.error('Error emitting auction:completed:', error);
  }
};

/**
 * Событие: Раунд начался
 */
export const emitRoundStarted = (data: {
  auctionId: Types.ObjectId;
  roundNumber: number;
  itemsInRound: number;
  scheduledEndTime: Date;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToAuction(data.auctionId.toString(), 'round:started', {
      auctionId: data.auctionId.toString(),
      roundNumber: data.roundNumber,
      itemsInRound: data.itemsInRound,
      scheduledEndTime: data.scheduledEndTime,
    });
    logger.info(`Event: round:started for auction ${data.auctionId}, round ${data.roundNumber}`);
  } catch (error) {
    logger.error('Error emitting round:started:', error);
  }
};

/**
 * Событие: Раунд продлен (anti-sniping)
 */
export const emitRoundExtended = (data: {
  auctionId: Types.ObjectId;
  roundNumber: number;
  newEndTime: Date;
  extensionsCount: number;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToAuction(data.auctionId.toString(), 'round:extended', {
      auctionId: data.auctionId.toString(),
      roundNumber: data.roundNumber,
      newEndTime: data.newEndTime,
      extensionsCount: data.extensionsCount,
    });
    logger.info(`Event: round:extended for auction ${data.auctionId}, round ${data.roundNumber}`);
  } catch (error) {
    logger.error('Error emitting round:extended:', error);
  }
};

/**
 * Событие: Раунд завершен
 */
export const emitRoundCompleted = (data: {
  auctionId: Types.ObjectId;
  roundNumber: number;
  winnersCount: number;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToAuction(data.auctionId.toString(), 'round:completed', {
      auctionId: data.auctionId.toString(),
      roundNumber: data.roundNumber,
      winnersCount: data.winnersCount,
    });
    logger.info(`Event: round:completed for auction ${data.auctionId}, round ${data.roundNumber}`);
  } catch (error) {
    logger.error('Error emitting round:completed:', error);
  }
};

/**
 * Событие: Ставка размещена
 */
export const emitBidPlaced = (data: {
  auctionId: Types.ObjectId;
  bidId: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  amount: number;
  roundNumber: number;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToAuction(data.auctionId.toString(), 'bid:placed', {
      auctionId: data.auctionId.toString(),
      bidId: data.bidId.toString(),
      userId: data.userId.toString(),
      username: data.username,
      amount: data.amount,
      roundNumber: data.roundNumber,
      timestamp: new Date(),
    });
    logger.info(`Event: bid:placed by ${data.username} for ${data.amount}`);
  } catch (error) {
    logger.error('Error emitting bid:placed:', error);
  }
};

/**
 * Событие: Ставка повышена
 */
export const emitBidIncreased = (data: {
  auctionId: Types.ObjectId;
  bidId: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  previousAmount: number;
  newAmount: number;
  roundNumber: number;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToAuction(data.auctionId.toString(), 'bid:increased', {
      auctionId: data.auctionId.toString(),
      bidId: data.bidId.toString(),
      userId: data.userId.toString(),
      username: data.username,
      previousAmount: data.previousAmount,
      newAmount: data.newAmount,
      roundNumber: data.roundNumber,
      timestamp: new Date(),
    });
    logger.info(`Event: bid:increased by ${data.username} from ${data.previousAmount} to ${data.newAmount}`);
  } catch (error) {
    logger.error('Error emitting bid:increased:', error);
  }
};

/**
 * Событие: Leaderboard обновлен
 */
export const emitLeaderboardUpdated = (data: {
  auctionId: Types.ObjectId;
  roundNumber: number;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToAuction(data.auctionId.toString(), 'leaderboard:updated', {
      auctionId: data.auctionId.toString(),
      roundNumber: data.roundNumber,
      timestamp: new Date(),
    });
    logger.info(`Event: leaderboard:updated for auction ${data.auctionId}, round ${data.roundNumber}`);
  } catch (error) {
    logger.error('Error emitting leaderboard:updated:', error);
  }
};

/**
 * Событие: Пользователь выиграл
 */
export const emitUserWon = (data: {
  userId: Types.ObjectId;
  auctionId: Types.ObjectId;
  itemNumber: number;
  amount: number;
  roundNumber: number;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToUser(data.userId.toString(), 'user:won', {
      auctionId: data.auctionId.toString(),
      itemNumber: data.itemNumber,
      amount: data.amount,
      roundNumber: data.roundNumber,
    });
    logger.info(`Event: user:won for user ${data.userId}, item #${data.itemNumber}`);
  } catch (error) {
    logger.error('Error emitting user:won:', error);
  }
};

/**
 * Событие: Ставка возвращена
 */
export const emitBidRefunded = (data: {
  userId: Types.ObjectId;
  auctionId: Types.ObjectId;
  amount: number;
}): void => {
  try {
    const ws = getWebSocketServer();
    ws.emitToUser(data.userId.toString(), 'bid:refunded', {
      auctionId: data.auctionId.toString(),
      amount: data.amount,
    });
    logger.info(`Event: bid:refunded for user ${data.userId}, amount ${data.amount}`);
  } catch (error) {
    logger.error('Error emitting bid:refunded:', error);
  }
};
