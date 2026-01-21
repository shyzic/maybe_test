import mongoose from 'mongoose';
import UserService from '../src/services/UserService';
import AuctionService from '../src/services/AuctionService';
import BidService from '../src/services/BidService';
import { connectDatabase } from '../src/config/database';
import logger from '../src/utils/logger';

async function seed() {
  try {
    logger.info('Starting seed...');

    // Подключение к БД
    await connectDatabase();

    // Очистка БД (опционально)
    // await mongoose.connection.dropDatabase();

    // 1. Создание пользователей
    logger.info('Creating users...');
    
    const admin = await UserService.register({
      username: 'admin',
      password: 'admin123',
      email: 'admin@auction.com',
      initialBalance: 0,
    });

    const users = [];
    for (let i = 1; i <= 10; i++) {
      const user = await UserService.register({
        username: `user${i}`,
        password: 'password123',
        email: `user${i}@example.com`,
        initialBalance: 10000,
      });
      users.push(user.user);
    }

    logger.info(`Created ${users.length + 1} users`);

    // 2. Создание аукциона
    logger.info('Creating auction...');
    
    const auction = await AuctionService.createAuction({
      name: 'Premium NFT Collection - Demo',
      description: 'Limited edition digital collectibles for demo purposes',
      totalItems: 200,
      itemsPerRound: 50,
      startTime: new Date(Date.now() + 2 * 60 * 1000), // Через 2 минуты
      roundDuration: 600, // 10 минут
      antiSnipeWindow: 60,
      antiSnipeExtension: 60,
      maxExtensions: 10,
      minBid: 100,
      minBidStep: 5,
      currency: 'STARS',
      createdBy: admin.user._id,
    });

    logger.info(`Created auction: ${auction.name}`);
    logger.info(`  - Total items: ${auction.totalItems}`);
    logger.info(`  - Total rounds: ${auction.totalRounds}`);
    logger.info(`  - Start time: ${auction.startTime}`);

    // 3. Создание начальных ставок (опционально)
    logger.info('Creating sample bids...');
    
    // Делаем ставки только после начала аукциона
    // Для демо можно запустить аукцион вручную или подождать

    logger.info('Seed completed successfully!');
    logger.info('\nQuick start:');
    logger.info('1. Wait 2 minutes for auction to start');
    logger.info('2. Login as admin: username=admin, password=admin123');
    logger.info('3. Or login as user1-10: username=user1, password=password123');
    logger.info(`4. Auction ID: ${auction._id}`);

    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
