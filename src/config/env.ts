import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  demoInitialBalance: number;
  defaultRoundDuration: number;
  defaultItemsPerRound: number;
  defaultMinBid: number;
  defaultMinBidStep: number;
  defaultAntiSnipeWindow: number;
  defaultAntiSnipeExtension: number;
  defaultMaxExtensions: number;
}

const env: EnvConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auction',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  demoInitialBalance: parseInt(process.env.DEMO_INITIAL_BALANCE || '10000', 10),
  defaultRoundDuration: parseInt(process.env.DEFAULT_ROUND_DURATION || '3600', 10),
  defaultItemsPerRound: parseInt(process.env.DEFAULT_ITEMS_PER_ROUND || '50', 10),
  defaultMinBid: parseInt(process.env.DEFAULT_MIN_BID || '100', 10),
  defaultMinBidStep: parseInt(process.env.DEFAULT_MIN_BID_STEP || '5', 10),
  defaultAntiSnipeWindow: parseInt(process.env.DEFAULT_ANTI_SNIPE_WINDOW || '60', 10),
  defaultAntiSnipeExtension: parseInt(process.env.DEFAULT_ANTI_SNIPE_EXTENSION || '60', 10),
  defaultMaxExtensions: parseInt(process.env.DEFAULT_MAX_EXTENSIONS || '10', 10),
};

export default env;
