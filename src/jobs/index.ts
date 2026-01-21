import roundWorker from './processors/roundProcessor';
import { startSchedulers } from './schedulers';
import logger from '../utils/logger';

/**
 * Запуск всех workers и планировщиков
 */
export const startWorkers = () => {
  // Запуск workers
  logger.info('Starting workers...');
  
  // roundWorker уже создан и запущен в roundProcessor.ts
  
  // Запуск планировщиков
  startSchedulers();
  
  logger.info('All workers and schedulers started');
};

/**
 * Graceful shutdown всех workers
 */
export const stopWorkers = async () => {
  logger.info('Stopping workers...');
  
  await roundWorker.close();
  
  logger.info('All workers stopped');
};

export default {
  startWorkers,
  stopWorkers,
};
