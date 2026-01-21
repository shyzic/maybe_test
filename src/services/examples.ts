/**
 * Примеры использования сервисов
 */

import mongoose from 'mongoose';
import UserService from './UserService';
import TransactionService from './TransactionService';
import logger from '../utils/logger';

/**
 * Пример 1: Создание пользователя и пополнение баланса
 */
export async function exampleCreateUserAndDeposit() {
  try {
    const { user } = await UserService.register({
      username: 'john_doe_' + Date.now(),
      email: `john_${Date.now()}@example.com`,
      password: 'password123',
      initialBalance: 1000,
    });
    
    logger.info(`Created user: ${user.username} with balance ${user.balance}`);
    
    const updatedUser = await UserService.deposit({
      userId: user._id,
      amount: 500,
      description: 'Demo deposit'
    });
    
    logger.info(`Updated balance: ${updatedUser.balance}`);
    
    return updatedUser;
  } catch (error) {
    logger.error('Error in exampleCreateUserAndDeposit:', error);
    throw error;
  }
}

/**
 * Пример 2: Вывод средств
 */
export async function exampleWithdraw(
  userId: mongoose.Types.ObjectId,
  amount: number
) {
  try {
    const user = await UserService.withdraw({
      userId,
      amount,
      description: 'Demo withdrawal'
    });
    
    logger.info(`Withdrawn ${amount} from user ${userId}`);
    logger.info(`New balance: ${user.balance}`);
    
    return user;
  } catch (error) {
    logger.error('Error in exampleWithdraw:', error);
    throw error;
  }
}

/**
 * Пример 3: Получение истории транзакций
 */
export async function exampleGetTransactionHistory(userId: mongoose.Types.ObjectId) {
  try {
    const result = await TransactionService.getUserTransactions(userId, {
      page: 1,
      limit: 10,
    });
    
    logger.info(
      `Found ${result.pagination.total} transactions for user ${userId}`
    );
    
    result.data.forEach((tx) => {
      logger.info(
        `${tx.type}: ${tx.amount} (${tx.description}) - ` +
        `Balance: ${tx.balanceBefore} → ${tx.balanceAfter}`
      );
    });
    
    return result;
  } catch (error) {
    logger.error('Error in exampleGetTransactionHistory:', error);
    throw error;
  }
}

/**
 * Пример 4: Статистика транзакций пользователя
 */
export async function exampleGetUserStats(userId: mongoose.Types.ObjectId) {
  try {
    const stats = await TransactionService.getUserTransactionStats(userId);
    
    logger.info(`User ${userId} transaction statistics:`);
    logger.info(`  Total deposits: ${stats.totalDeposits}`);
    logger.info(`  Total withdrawals: ${stats.totalWithdrawals}`);
    logger.info(`  Total bid placed: ${stats.totalBidPlaced}`);
    logger.info(`  Total bid won: ${stats.totalBidWon}`);
    logger.info(`  Total refunded: ${stats.totalRefunded}`);
    
    return stats;
  } catch (error) {
    logger.error('Error in exampleGetUserStats:', error);
    throw error;
  }
}

/**
 * Пример 5: Статистика пользователя
 */
export async function exampleGetUserProfileStats(userId: mongoose.Types.ObjectId) {
  try {
    const stats = await UserService.getUserStats(userId);
    
    logger.info(`User ${userId} profile statistics:`);
    logger.info(`  Total bids: ${stats.totalBids}`);
    logger.info(`  Total wins: ${stats.totalWins}`);
    logger.info(`  Total spent: ${stats.totalSpent}`);
    logger.info(`  Average win amount: ${stats.averageWinAmount}`);
    
    return stats;
  } catch (error) {
    logger.error('Error in exampleGetUserProfileStats:', error);
    throw error;
  }
}

/**
 * Пример 6: Фильтрация транзакций по типу
 */
export async function exampleFilterTransactionsByType(
  userId: mongoose.Types.ObjectId,
  type: string
) {
  try {
    const result = await TransactionService.getUserTransactions(userId, {
      type,
      page: 1,
      limit: 20,
    });
    
    logger.info(`Found ${result.pagination.total} ${type} transactions`);
    
    return result;
  } catch (error) {
    logger.error('Error in exampleFilterTransactionsByType:', error);
    throw error;
  }
}

/**
 * Пример 7: Фильтрация транзакций по датам
 */
export async function exampleFilterTransactionsByDate(
  userId: mongoose.Types.ObjectId,
  fromDate: Date,
  toDate: Date
) {
  try {
    const result = await TransactionService.getUserTransactions(userId, {
      fromDate,
      toDate,
      page: 1,
      limit: 50,
    });
    
    logger.info(
      `Found ${result.pagination.total} transactions between ` +
      `${fromDate.toISOString()} and ${toDate.toISOString()}`
    );
    
    return result;
  } catch (error) {
    logger.error('Error in exampleFilterTransactionsByDate:', error);
    throw error;
  }
}

/**
 * Пример 8: Полный flow пользователя
 */
export async function exampleCompleteUserFlow() {
  try {
    // 1. Регистрация
    logger.info('Step 1: Register user');
    const { user, token } = await UserService.register({
      username: 'demo_user_' + Date.now(),
      email: `demo_${Date.now()}@example.com`,
      password: 'password123',
      initialBalance: 5000,
    });
    
    logger.info(`Created user: ${user.username} with token`);
    
    // 2. Пополнение баланса
    logger.info('Step 2: Deposit funds');
    await UserService.deposit({
      userId: user._id,
      amount: 3000,
      description: 'Initial deposit'
    });
    
    // 3. Вывод средств
    logger.info('Step 3: Withdraw funds');
    await UserService.withdraw({
      userId: user._id,
      amount: 500,
      description: 'Partial withdrawal'
    });
    
    // 4. Получение обновленного профиля
    logger.info('Step 4: Get updated profile');
    const updatedUser = await UserService.getUserById(user._id);
    logger.info(`Current balance: ${updatedUser.balance}`);
    
    // 5. История транзакций
    logger.info('Step 5: Get transaction history');
    const transactions = await TransactionService.getUserTransactions(user._id, {
      page: 1,
      limit: 10,
    });
    logger.info(`Total transactions: ${transactions.pagination.total}`);
    
    // 6. Статистика
    logger.info('Step 6: Get user statistics');
    const stats = await UserService.getUserStats(user._id);
    logger.info(`User statistics: ${JSON.stringify(stats, null, 2)}`);
    
    return {
      user: updatedUser,
      transactions,
      stats,
    };
  } catch (error) {
    logger.error('Error in exampleCompleteUserFlow:', error);
    throw error;
  }
}

/**
 * Запуск всех примеров (для тестирования)
 */
export async function runAllExamples() {
  try {
    logger.info('=== Running Service Examples ===');
    
    // Пример 1
    logger.info('\n--- Example 1: Create User and Deposit ---');
    const user = await exampleCreateUserAndDeposit();
    
    // Пример 2
    logger.info('\n--- Example 2: Withdraw ---');
    await exampleWithdraw(user._id, 100);
    
    // Пример 3
    logger.info('\n--- Example 3: Transaction History ---');
    await exampleGetTransactionHistory(user._id);
    
    // Пример 4
    logger.info('\n--- Example 4: Transaction Stats ---');
    await exampleGetUserStats(user._id);
    
    // Пример 5
    logger.info('\n--- Example 5: User Profile Stats ---');
    await exampleGetUserProfileStats(user._id);
    
    // Пример 6
    logger.info('\n--- Example 6: Filter by Type ---');
    await exampleFilterTransactionsByType(user._id, 'deposit');
    
    // Пример 7
    logger.info('\n--- Example 7: Filter by Date ---');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await exampleFilterTransactionsByDate(user._id, yesterday, now);
    
    // Пример 8
    logger.info('\n--- Example 8: Complete User Flow ---');
    await exampleCompleteUserFlow();
    
    logger.info('\n=== All Examples Completed Successfully ===');
  } catch (error) {
    logger.error('Error running examples:', error);
    throw error;
  }
}