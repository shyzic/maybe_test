import mongoose, { Schema, Document, Model } from 'mongoose';
import { AuctionStatus, AUCTION_STATUSES } from '../config/constants';

export interface IAuction extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  totalItems: number;
  itemsPerRound: number;
  startTime: Date;
  roundDuration: number;
  antiSnipeWindow: number;
  antiSnipeExtension: number;
  maxExtensions?: number;
  minBid: number;
  minBidStep: number;
  currency: string;
  status: AuctionStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

export interface IAuctionMethods {
  isActive(): boolean;
  isScheduled(): boolean;
  isCompleted(): boolean;
  canAcceptBids(): boolean;
}

type AuctionModel = Model<IAuction, {}, IAuctionMethods>;

const auctionSchema = new Schema<IAuction, AuctionModel, IAuctionMethods>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    totalItems: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    itemsPerRound: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    roundDuration: {
      type: Number,
      required: true,
      min: 60, // 1 минута
      max: 604800, // 7 дней
    },
    antiSnipeWindow: {
      type: Number,
      required: true,
      min: 30,
      max: 300,
    },
    antiSnipeExtension: {
      type: Number,
      required: true,
      min: 30,
      max: 300,
    },
    maxExtensions: {
      type: Number,
      min: 0,
      max: 100,
    },
    minBid: {
      type: Number,
      required: true,
      min: 0.01,
    },
    minBidStep: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: 'STARS',
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(AUCTION_STATUSES),
      default: AUCTION_STATUSES.SCHEDULED,
      index: true,
    },
    currentRound: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalRounds: {
      type: Number,
      required: true,
      min: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    // versionKey: true,
  }
);

// Индексы
auctionSchema.index({ status: 1, startTime: 1 });
auctionSchema.index({ status: 1, currentRound: 1 });
auctionSchema.index({ createdBy: 1, createdAt: -1 });

// Виртуальные поля
auctionSchema.virtual('rounds', {
  ref: 'Round',
  localField: '_id',
  foreignField: 'auctionId',
});

// Методы
auctionSchema.methods.isActive = function (): boolean {
  return this.status === AUCTION_STATUSES.ACTIVE;
};

auctionSchema.methods.isScheduled = function (): boolean {
  return this.status === AUCTION_STATUSES.SCHEDULED;
};

auctionSchema.methods.isCompleted = function (): boolean {
  return this.status === AUCTION_STATUSES.COMPLETED;
};

auctionSchema.methods.canAcceptBids = function (): boolean {
  return this.status === AUCTION_STATUSES.ACTIVE;
};

// Валидация перед сохранением
auctionSchema.pre('save', function (next) {
  // Вычисляем totalRounds если это новый документ
  if (this.isNew) {
    this.totalRounds = Math.ceil(this.totalItems / this.itemsPerRound);
  }
  
  // Проверяем, что startTime в будущем для новых аукционов
  if (this.isNew && this.startTime <= new Date()) {
    next(new Error('Start time must be in the future'));
    return;
  }
  
  // Проверяем корректность currentRound
  if (this.currentRound > this.totalRounds) {
    next(new Error('Current round cannot exceed total rounds'));
    return;
  }
  
  next();
});

const Auction = mongoose.model<IAuction, AuctionModel>('Auction', auctionSchema);

export default Auction;
