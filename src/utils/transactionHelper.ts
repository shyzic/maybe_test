import mongoose from 'mongoose';
import logger from './logger';
import { AppError } from './errors';

/**
 * Проверка поддержки транзакций
 */
const supportsTransactions = async (): Promise<boolean> => {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    
    const serverInfo = await admin.serverStatus();
    return serverInfo?.storageEngine?.supportsCommittedReads === true;
  } catch (error) {
    return false;
  }
};

/**
 * Выполнить операцию в транзакции (если поддерживается)
 */
export async function withTransaction<T>(
  operation: (session: mongoose.ClientSession) => Promise<T>,
  options?: any
): Promise<T> {
  const hasTransactionSupport = await supportsTransactions();
  
  if (!hasTransactionSupport) {
    // Выполнить без транзакции
    logger.warn('MongoDB transactions not supported, executing without transaction');
    const session = await mongoose.startSession();
    try {
      const result = await operation(session);
      return result;
    } finally {
      session.endSession();
    }
  }
  
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction(options);
    const result = await operation(session);
    await session.commitTransaction();
    logger.debug('Transaction committed successfully');
    return result;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Transaction aborted due to error:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

export async function executeInTransaction<T>(
  operations: ((session: mongoose.ClientSession) => Promise<any>)[],
  options?: any
): Promise<T[]> {
  return withTransaction(async (session) => {
    const results: any[] = [];
    for (const operation of operations) {
      const result = await operation(session);
      results.push(result);
    }
    return results;
  }, options);
}

export async function retryOnVersionError<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const isVersionError =
        error.name === 'VersionError' ||
        (error.message && error.message.includes('version')) ||
        (error.code === 11000);
      
      if (!isVersionError || attempt === maxRetries) {
        throw error;
      }
      
      logger.warn(`Version conflict detected, retrying... (attempt ${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError || new AppError('Retry failed');
}

interface IdempotencyRecord {
  key: string;
  result: any;
  createdAt: Date;
}

const idempotencyCache = new Map<string, IdempotencyRecord>();

export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  ttlMs: number = 86400000
): Promise<T> {
  const cached = idempotencyCache.get(key);
  
  if (cached) {
    const age = Date.now() - cached.createdAt.getTime();
    
    if (age < ttlMs) {
      logger.debug(`Idempotency key hit: ${key}`);
      return cached.result;
    } else {
      idempotencyCache.delete(key);
    }
  }
  
  const result = await operation();
  
  idempotencyCache.set(key, {
    key,
    result,
    createdAt: new Date(),
  });
  
  if (idempotencyCache.size > 10000) {
    cleanupIdempotencyCache(ttlMs);
  }
  
  return result;
}

function cleanupIdempotencyCache(ttlMs: number): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  idempotencyCache.forEach((record, key) => {
    const age = now - record.createdAt.getTime();
    if (age >= ttlMs) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach((key) => idempotencyCache.delete(key));
  
  logger.info(`Cleaned up ${keysToDelete.length} idempotency records`);
}

export async function updateWithOptimisticLock<T extends mongoose.Document>(
  model: mongoose.Model<T>,
  id: mongoose.Types.ObjectId,
  updateFn: (doc: T) => void | Promise<void>,
  maxRetries: number = 3
): Promise<T> {
  return retryOnVersionError(async () => {
    const doc = await model.findById(id);
    
    if (!doc) {
      throw new AppError('Document not found', 404);
    }
    
    await updateFn(doc);
    await doc.save();
    
    return doc;
  }, maxRetries);
}

export async function batchOperation<T, R>(
  items: T[],
  operation: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
    
    logger.debug(`Processed batch ${i / batchSize + 1}/${Math.ceil(items.length / batchSize)}`);
  }
  
  return results;
}

export async function verifyBalanceInvariant(): Promise<{
  valid: boolean;
  totalBalance: number;
  totalReserved: number;
  userCount: number;
}> {
  const User = mongoose.model('User');
  
  const result = await User.aggregate([
    {
      $group: {
        _id: null,
        totalBalance: { $sum: '$balance' },
        totalReserved: { $sum: '$reservedBalance' },
        count: { $sum: 1 },
      },
    },
  ]);
  
  const stats = result[0] || { totalBalance: 0, totalReserved: 0, count: 0 };
  
  const users = await User.find({
    $expr: { $gt: ['$reservedBalance', '$balance'] },
  });
  
  const valid = users.length === 0;
  
  return {
    valid,
    totalBalance: stats.totalBalance,
    totalReserved: stats.totalReserved,
    userCount: stats.count,
  };
}