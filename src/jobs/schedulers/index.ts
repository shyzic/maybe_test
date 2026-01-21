import cron from 'node-cron';
import RoundService from '../../services/RoundService';
import AuctionService from '../../services/AuctionService';
import logger from '../../utils/logger';
import { scheduleRoundStart, scheduleRoundEnd } from '../queue';

/**
 * Проверка и запуск запланированных раундов
 * Запускается каждую минуту
 */
const checkScheduledRounds = cron.schedule('* * * * *', async () => {
  try {
    const rounds = await RoundService.getScheduledRounds();
    
    for (const round of rounds) {
      try {
        await RoundService.startRound(round._id);
        logger.info(`Auto-started round ${round.roundNumber} for auction ${round.auctionId}`);
      } catch (error) {
        logger.error(`Failed to auto-start round ${round._id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error in checkScheduledRounds:', error);
  }
});

/**
 * Проверка и завершение раундов
 * Запускается каждую минуту
 */
const checkCompletedRounds = cron.schedule('* * * * *', async () => {
  try {
    const rounds = await RoundService.getCompletedRounds();
    
    for (const round of rounds) {
      try {
        await RoundService.completeRound(round._id);
        logger.info(`Auto-completed round ${round.roundNumber} for auction ${round.auctionId}`);
      } catch (error) {
        logger.error(`Failed to auto-complete round ${round._id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error in checkCompletedRounds:', error);
  }
});

/**
 * Проверка завершения аукционов
 * Запускается каждые 5 минут
 */
const checkAuctionCompletions = cron.schedule('*/5 * * * *', async () => {
  try {
    const auctions = await AuctionService.getActiveAuctions();
    
    for (const auction of auctions) {
      try {
        await AuctionService.checkAuctionCompletion(auction._id);
      } catch (error) {
        logger.error(`Failed to check completion for auction ${auction._id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error in checkAuctionCompletions:', error);
  }
});

/**
 * Планирование всех раундов аукциона
 */
export const scheduleAuctionRounds = async (auctionId: string) => {
  try {
    const rounds = await RoundService.getAuctionRounds(auctionId);
    
    for (const round of rounds) {
      // Планируем запуск раунда
      await scheduleRoundStart({
        roundId: round._id.toString(),
        auctionId: auctionId,
        scheduledTime: round.scheduledStartTime,
      });
      
      // Не планируем завершение заранее, т.к. может быть продление
      // Завершение планируется при запуске раунда
    }
    
    logger.info(`Scheduled ${rounds.length} rounds for auction ${auctionId}`);
  } catch (error) {
    logger.error(`Error scheduling auction rounds:`, error);
    throw error;
  }
};

/**
 * Запуск всех планировщиков
 */
export const startSchedulers = () => {
  checkScheduledRounds.start();
  checkCompletedRounds.start();
  checkAuctionCompletions.start();
  
  logger.info('All schedulers started');
};

/**
 * Остановка всех планировщиков
 */
export const stopSchedulers = () => {
  checkScheduledRounds.stop();
  checkCompletedRounds.stop();
  checkAuctionCompletions.stop();
  
  logger.info('All schedulers stopped');
};

export default {
  startSchedulers,
  stopSchedulers,
  scheduleAuctionRounds,
};
