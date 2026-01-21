import { Types } from 'mongoose';
import { AuctionStatus, RoundStatus, BidStatus } from './config/constants';

// ========== Auction Types ==========

export interface CreateAuctionInput {
  name: string;
  description?: string;
  imageUrl?: string;
  totalItems: number;
  itemsPerRound: number;
  startTime: Date | string;
  roundDuration: number;
  antiSnipeWindow: number;
  antiSnipeExtension: number;
  maxExtensions?: number;
  minBid: number;
  minBidStep: number;
  currency: string;
  createdBy: Types.ObjectId;
}

export interface UpdateAuctionInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  status?: AuctionStatus;
}

export interface AuctionQuery {
  status?: AuctionStatus | AuctionStatus[];
  createdBy?: Types.ObjectId;
  startTimeFrom?: Date;
  startTimeTo?: Date;
}

// ========== Round Types ==========

export interface CreateRoundInput {
  auctionId: Types.ObjectId;
  roundNumber: number;
  itemsInRound: number;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
}

export interface RoundQuery {
  auctionId?: Types.ObjectId;
  status?: RoundStatus | RoundStatus[];
  roundNumber?: number;
}

// ========== Bid Types ==========

export interface PlaceBidInput {
  auctionId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
}

export interface IncreaseBidInput {
  bidId: Types.ObjectId;
  userId: Types.ObjectId;
  newAmount: number;
}

export interface BidQuery {
  auctionId?: Types.ObjectId;
  userId?: Types.ObjectId;
  status?: BidStatus | BidStatus[];
  currentRound?: number;
}

// ========== User Types ==========

export interface CreateUserInput {
  username: string;
  email?: string;
  passwordHash?: string;
  initialBalance?: number;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
}

export interface DepositInput {
  userId: Types.ObjectId;
  amount: number;
  description?: string;
}

export interface WithdrawalInput {
  userId: Types.ObjectId;
  amount: number;
  description?: string;
}

// ========== Transaction Types ==========

export interface TransactionQuery {
  userId?: Types.ObjectId;
  auctionId?: Types.ObjectId;
  type?: string | string[];
  fromDate?: Date;
  toDate?: Date;
}

// ========== Pagination Types ==========

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ========== Leaderboard Types ==========

export interface LeaderboardEntry {
  position: number;
  userId: Types.ObjectId;
  username: string;
  amount: number;
  isCurrentUser?: boolean;
}

export interface RoundLeaderboard {
  auctionId: Types.ObjectId;
  roundNumber: number;
  totalBids: number;
  itemsInRound: number;
  entries: LeaderboardEntry[];
  cutoffPosition: number; // Позиция, которая выигрывает
}

// ========== WebSocket Event Types ==========

export interface AuctionStartedEvent {
  auctionId: string;
  name: string;
  currentRound: number;
  startTime: Date;
}

export interface AuctionCompletedEvent {
  auctionId: string;
  totalRounds: number;
  totalWinners: number;
}

export interface RoundStartedEvent {
  auctionId: string;
  roundNumber: number;
  itemsInRound: number;
  scheduledEndTime: Date;
}

export interface RoundExtendedEvent {
  auctionId: string;
  roundNumber: number;
  newEndTime: Date;
  extensionsCount: number;
}

export interface RoundCompletedEvent {
  auctionId: string;
  roundNumber: number;
  winnersCount: number;
}

export interface BidPlacedEvent {
  auctionId: string;
  bidId: string;
  userId: string;
  username: string;
  amount: number;
  roundNumber: number;
  timestamp: Date;
}

export interface BidIncreasedEvent {
  auctionId: string;
  bidId: string;
  userId: string;
  username: string;
  previousAmount: number;
  newAmount: number;
  roundNumber: number;
  timestamp: Date;
}

export interface LeaderboardUpdatedEvent {
  auctionId: string;
  roundNumber: number;
  leaderboard: RoundLeaderboard;
}

// ========== API Response Types ==========

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  details?: any;
}

// ========== Job Queue Types ==========

export interface ProcessRoundEndJob {
  roundId: string;
  auctionId: string;
}

export interface StartScheduledRoundJob {
  roundId: string;
  auctionId: string;
}

export interface SendNotificationJob {
  userId: string;
  type: string;
  data: any;
}

// ========== Statistics Types ==========

export interface AuctionStats {
  auctionId: Types.ObjectId;
  totalBids: number;
  totalBidders: number;
  totalAmount: number;
  averageBid: number;
  highestBid: number;
  lowestBid: number;
  completedRounds: number;
  itemsDistributed: number;
}

export interface UserStats {
  userId: Types.ObjectId;
  totalBids: number;
  activeBids: number;
  totalWins: number;
  totalSpent: number;
  averageWinAmount: number;
  participatedAuctions: number;
}
