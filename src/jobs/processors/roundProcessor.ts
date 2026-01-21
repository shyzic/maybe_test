import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../config/redis';
import RoundService from '../../services/RoundService';
import AuctionService from '../../services/AuctionService';
import logger from '../../utils/logger';
import { emitRoundStarted, emitRoundCompleted } from '../../websocket/events';
import { scheduleRoundEnd } from '../queue';

// Используем единое соединение
const connection = getRedisConnection();

/**
 * Обработка задачи запуска раунда
 */
const processRoundStart = async (job: Job) => {
  const { roundId, auctionId } = job.data;
  
  try {
    logger.info(`Processing round start: ${roundId}`);
    
    const round = await RoundService.startRound(roundId);
    const auction = await AuctionService.getAuctionById(auctionId);
    
    // Отправка WebSocket события
    emitRoundStarted({
      auctionId: round.auctionId,
      roundNumber: round.roundNumber,
      itemsInRound: round.itemsInRound,
      scheduledEndTime: round.actualEndTime!,
    });
    
    // Планирование завершения раунда
    if (round.actualEndTime) {
      await scheduleRoundEnd({
        roundId: round._id.toString(),
        auctionId: auctionId,
        scheduledTime: round.actualEndTime,
      });
    }
    
    logger.info(`Round ${round.roundNumber} started successfully`);
  } catch (error) {
    logger.error(`Error processing round start ${roundId}:`, error);
    throw error;
  }
};

/**
 * Обработка задачи завершения раунда
 */
const processRoundEnd = async (job: Job) => {
  const { roundId, auctionId } = job.data;
  
  try {
    logger.info(`Processing round end: ${roundId}`);
    
    const round = await RoundService.completeRound(roundId);
    
    // Отправка WebSocket события
    const winnersCount = round.itemsInRound;
    emitRoundCompleted({
      auctionId: round.auctionId,
      roundNumber: round.roundNumber,
      winnersCount,
    });
    
    // Проверка завершения аукциона
    await AuctionService.checkAuctionCompletion(auctionId);
    
    logger.info(`Round ${round.roundNumber} ended successfully`);
  } catch (error) {
    logger.error(`Error processing round end ${roundId}:`, error);
    throw error;
  }
};

/**
 * Worker для обработки задач раундов
 */
export const roundWorker = new Worker(
  'rounds',
  async (job: Job) => {
    switch (job.name) {
      case 'start-round':
        await processRoundStart(job);
        break;
      case 'end-round':
        await processRoundEnd(job);
        break;
      default:
        logger.warn(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: connection as any,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

roundWorker.on('completed', (job) => {
  logger.info(`Round job ${job.id} completed`);
});

roundWorker.on('failed', (job, err) => {
  logger.error(`Round job ${job?.id} failed:`, err);
});

export default roundWorker;