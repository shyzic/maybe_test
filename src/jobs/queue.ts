import { Queue, QueueEvents } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import logger from '../utils/logger';

// Получаем единое соединение
const connection = getRedisConnection();

// Очереди
export const roundQueue = new Queue('rounds', { connection: connection as any });
export const auctionQueue = new Queue('auctions', { connection: connection as any });
export const notificationQueue = new Queue('notifications', { connection: connection as any });

// События очередей
const roundQueueEvents = new QueueEvents('rounds', { connection: connection as any });
const auctionQueueEvents = new QueueEvents('auctions', { connection: connection as any });

roundQueueEvents.on('completed', ({ jobId }: { jobId: string }) => {
  logger.info(`Round job ${jobId} completed`);
});

roundQueueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
  logger.error(`Round job ${jobId} failed: ${failedReason}`);
});

auctionQueueEvents.on('completed', ({ jobId }: { jobId: string }) => {
  logger.info(`Auction job ${jobId} completed`);
});

auctionQueueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
  logger.error(`Auction job ${jobId} failed: ${failedReason}`);
});

/**
 * Добавление задачи запуска раунда
 */
export const scheduleRoundStart = async (data: {
  roundId: string;
  auctionId: string;
  scheduledTime: Date;
}) => {
  const delay = data.scheduledTime.getTime() - Date.now();
  
  if (delay > 0) {
    await roundQueue.add(
      'start-round',
      data,
      {
        delay,
        jobId: `start-round-${data.roundId}`,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
    
    logger.info(`Scheduled round ${data.roundId} to start in ${Math.floor(delay / 1000)}s`);
  }
};

/**
 * Добавление задачи завершения раунда
 */
export const scheduleRoundEnd = async (data: {
  roundId: string;
  auctionId: string;
  scheduledTime: Date;
}) => {
  const delay = data.scheduledTime.getTime() - Date.now();
  
  if (delay > 0) {
    await roundQueue.add(
      'end-round',
      data,
      {
        delay,
        jobId: `end-round-${data.roundId}`,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
    
    logger.info(`Scheduled round ${data.roundId} to end in ${Math.floor(delay / 1000)}s`);
  }
};

/**
 * Перепланирование завершения раунда (при продлении)
 */
export const rescheduleRoundEnd = async (data: {
  roundId: string;
  auctionId: string;
  newEndTime: Date;
}) => {
  // Удаляем старую задачу
  await roundQueue.remove(`end-round-${data.roundId}`);
  
  // Создаем новую
  await scheduleRoundEnd({
    roundId: data.roundId,
    auctionId: data.auctionId,
    scheduledTime: data.newEndTime,
  });
  
  logger.info(`Rescheduled round ${data.roundId} end time`);
};

/**
 * Добавление задачи отправки уведомления
 */
export const scheduleNotification = async (data: {
  userId: string;
  type: string;
  message: string;
  data?: any;
}) => {
  await notificationQueue.add('send-notification', data, {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
};

export default {
  roundQueue,
  auctionQueue,
  notificationQueue,
  scheduleRoundStart,
  scheduleRoundEnd,
  rescheduleRoundEnd,
  scheduleNotification,
};
