export const CONSTANTS = {
  // Лимиты аукциона
  MAX_TOTAL_ITEMS: 10000,
  MAX_ITEMS_PER_ROUND: 1000,
  MAX_ROUND_DURATION: 604800, // 7 дней в секундах
  MIN_ROUND_DURATION: 60, // 1 минута
  
  // Anti-sniping
  MIN_ANTI_SNIPE_WINDOW: 30,
  MAX_ANTI_SNIPE_WINDOW: 300,
  MIN_ANTI_SNIPE_EXTENSION: 30,
  MAX_ANTI_SNIPE_EXTENSION: 300,
  MAX_EXTENSIONS_LIMIT: 100,
  
  // Ставки
  MIN_BID_STEP_PERCENT: 1,
  MAX_BID_STEP_PERCENT: 100,
  
  // Демо режим
  DEMO_BOT_PREFIX: 'bot_',
  
  // Idempotency
  IDEMPOTENCY_KEY_TTL: 86400, // 24 часа в секундах
  
  // API
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

export const AUCTION_STATUSES = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const ROUND_STATUSES = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export const BID_STATUSES = {
  ACTIVE: 'active',
  WON: 'won',
  OUTBID: 'outbid',
  REFUNDED: 'refunded',
  CARRIED_OVER: 'carried_over',
} as const;

export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  BID_PLACED: 'bid_placed',
  BID_INCREASED: 'bid_increased',
  BID_WON: 'bid_won',
  BID_REFUNDED: 'bid_refunded',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
} as const;

export type AuctionStatus = typeof AUCTION_STATUSES[keyof typeof AUCTION_STATUSES];
export type RoundStatus = typeof ROUND_STATUSES[keyof typeof ROUND_STATUSES];
export type BidStatus = typeof BID_STATUSES[keyof typeof BID_STATUSES];
export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];
