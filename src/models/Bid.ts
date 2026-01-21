import mongoose, { Schema, Document, Model } from 'mongoose';
import { BidStatus, BID_STATUSES } from '../config/constants';

export interface IBidHistoryEntry {
  action: 'created' | 'increased' | 'carried_over' | 'won' | 'refunded';
  amount: number;
  round: number;
  timestamp: Date;
  previousAmount?: number;
}

export interface IBid extends Document {
  _id: mongoose.Types.ObjectId;
  auctionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  originalAmount: number;
  createdInRound: number;
  currentRound: number;
  status: BidStatus;
  wonItemNumber?: number;
  wonInRound?: number;
  wonPosition?: number;
  history: IBidHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IBidMethods {
  isActive(): boolean;
  isWon(): boolean;
  canIncrease(): boolean;
  increaseAmount(newAmount: number, minBidStep: number): void;
  carryOverToNextRound(): void;
  markAsWon(itemNumber: number, roundNumber: number, position: number): void;
  markAsRefunded(): void;
}

type BidModel = Model<IBid, {}, IBidMethods>;

const bidHistoryEntrySchema = new Schema<IBidHistoryEntry>(
  {
    action: {
      type: String,
      required: true,
      enum: ['created', 'increased', 'carried_over', 'won', 'refunded'],
    },
    amount: {
      type: Number,
      required: true,
    },
    round: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    previousAmount: {
      type: Number,
    },
  },
  { _id: false }
);

const bidSchema = new Schema<IBid, BidModel, IBidMethods>(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    createdInRound: {
      type: Number,
      required: true,
      min: 1,
    },
    currentRound: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(BID_STATUSES),
      default: BID_STATUSES.ACTIVE,
      index: true,
    },
    wonItemNumber: {
      type: Number,
      min: 1,
    },
    wonInRound: {
      type: Number,
      min: 1,
    },
    wonPosition: {
      type: Number,
      min: 1,
    },
    history: {
      type: [bidHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    // versionKey: true, // Для оптимистичной блокировки
  }
);

// Составные индексы
bidSchema.index({ auctionId: 1, userId: 1, status: 1 });
bidSchema.index({ auctionId: 1, currentRound: 1, status: 1 });
bidSchema.index({ auctionId: 1, currentRound: 1, amount: -1 }); // Для сортировки по сумме
bidSchema.index({ auctionId: 1, currentRound: 1, status: 1, amount: -1, createdAt: 1 }); // Для leaderboard
bidSchema.index({ userId: 1, createdAt: -1 });
bidSchema.index({ userId: 1, status: 1 });

// Виртуальные поля
bidSchema.virtual('auction', {
  ref: 'Auction',
  localField: 'auctionId',
  foreignField: '_id',
  justOne: true,
});

bidSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Методы
bidSchema.methods.isActive = function (): boolean {
  return this.status === BID_STATUSES.ACTIVE;
};

bidSchema.methods.isWon = function (): boolean {
  return this.status === BID_STATUSES.WON;
};

bidSchema.methods.canIncrease = function (): boolean {
  return this.status === BID_STATUSES.ACTIVE;
};

bidSchema.methods.increaseAmount = function (newAmount: number, minBidStep: number): void {
  if (!this.canIncrease()) {
    throw new Error('Cannot increase bid in current status');
  }
  
  const minNextBid = this.amount * (1 + minBidStep / 100);
  if (newAmount < minNextBid) {
    throw new Error(`New amount must be at least ${minNextBid.toFixed(2)}`);
  }
  
  this.history.push({
    action: 'increased',
    amount: newAmount,
    round: this.currentRound,
    timestamp: new Date(),
    previousAmount: this.amount,
  });
  
  this.amount = newAmount;
};

bidSchema.methods.carryOverToNextRound = function (): void {
  this.history.push({
    action: 'carried_over',
    amount: this.amount,
    round: this.currentRound + 1,
    timestamp: new Date(),
  });
  
  this.currentRound += 1;
  this.status = BID_STATUSES.CARRIED_OVER;
};

bidSchema.methods.markAsWon = function (
  itemNumber: number,
  roundNumber: number,
  position: number
): void {
  this.status = BID_STATUSES.WON;
  this.wonItemNumber = itemNumber;
  this.wonInRound = roundNumber;
  this.wonPosition = position;
  
  this.history.push({
    action: 'won',
    amount: this.amount,
    round: roundNumber,
    timestamp: new Date(),
  });
};

bidSchema.methods.markAsRefunded = function (): void {
  this.status = BID_STATUSES.REFUNDED;
  
  this.history.push({
    action: 'refunded',
    amount: this.amount,
    round: this.currentRound,
    timestamp: new Date(),
  });
};

// Статические методы
bidSchema.statics.findActiveBidsByRound = function (
  auctionId: mongoose.Types.ObjectId,
  roundNumber: number
) {
  return this.find({
    auctionId,
    currentRound: roundNumber,
    status: BID_STATUSES.ACTIVE,
  }).sort({ amount: -1, createdAt: 1 }); // Сортировка для определения победителей
};

bidSchema.statics.findUserActiveBid = function (
  auctionId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
) {
  return this.findOne({
    auctionId,
    userId,
    status: BID_STATUSES.ACTIVE,
  });
};

bidSchema.statics.countActiveBidsByRound = function (
  auctionId: mongoose.Types.ObjectId,
  roundNumber: number
) {
  return this.countDocuments({
    auctionId,
    currentRound: roundNumber,
    status: BID_STATUSES.ACTIVE,
  });
};

// Middleware для добавления в историю при создании
bidSchema.pre('save', function (next) {
  if (this.isNew) {
    this.history.push({
      action: 'created',
      amount: this.amount,
      round: this.createdInRound,
      timestamp: new Date(),
    });
  }
  next();
});

const Bid = mongoose.model<IBid, BidModel>('Bid', bidSchema);

export default Bid;
