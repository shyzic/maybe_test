import mongoose, { Schema, Document, Model } from 'mongoose';
import { RoundStatus, ROUND_STATUSES } from '../config/constants';


export interface IRoundMethods {
  isActive(): boolean;
  isCompleted(): boolean;
  canExtend(maxExtensions?: number): boolean;
  getRemainingTime(): number;
  extend(extensionSeconds: number): void;
}

export interface IRound extends Document, IRoundMethods {
  _id: mongoose.Types.ObjectId;
  auctionId: mongoose.Types.ObjectId;
  roundNumber: number;
  itemsInRound: number;
  scheduledStartTime: Date;
  actualStartTime?: Date;
  scheduledEndTime: Date;
  actualEndTime?: Date;
  extensionsCount: number;
  lastExtensionAt?: Date;
  status: RoundStatus;
  winnersProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type RoundModel = Model<IRound, {}, IRoundMethods>;

const roundSchema = new Schema<IRound, RoundModel, IRoundMethods>(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    itemsInRound: {
      type: Number,
      required: true,
      min: 1,
    },
    scheduledStartTime: {
      type: Date,
      required: true,
      index: true,
    },
    actualStartTime: {
      type: Date,
    },
    scheduledEndTime: {
      type: Date,
      required: true,
      index: true,
    },
    actualEndTime: {
      type: Date,
    },
    extensionsCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastExtensionAt: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ROUND_STATUSES),
      default: ROUND_STATUSES.SCHEDULED,
      index: true,
    },
    winnersProcessed: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    // versionKey: true,
  }
);

// Составные индексы
roundSchema.index({ auctionId: 1, roundNumber: 1 }, { unique: true });
roundSchema.index({ auctionId: 1, status: 1 });
roundSchema.index({ status: 1, scheduledStartTime: 1 });
roundSchema.index({ status: 1, scheduledEndTime: 1 });

// Виртуальные поля
roundSchema.virtual('auction', {
  ref: 'Auction',
  localField: 'auctionId',
  foreignField: '_id',
  justOne: true,
});

roundSchema.virtual('bids', {
  ref: 'Bid',
  localField: 'auctionId',
  foreignField: 'auctionId',
  match: function() {
    return { currentRound: this.roundNumber };
  },
});

// Методы
roundSchema.methods.isActive = function (): boolean {
  return this.status === ROUND_STATUSES.ACTIVE;
};

roundSchema.methods.isCompleted = function (): boolean {
  return this.status === ROUND_STATUSES.COMPLETED;
};

roundSchema.methods.canExtend = function (maxExtensions?: number): boolean {
  if (!this.isActive()) {
    return false;
  }
  
  if (maxExtensions !== undefined && this.extensionsCount >= maxExtensions) {
    return false;
  }
  
  return true;
};

roundSchema.methods.getRemainingTime = function (): number {
  if (!this.actualEndTime) {
    return 0;
  }
  
  const remaining = this.actualEndTime.getTime() - Date.now();
  return Math.max(0, Math.floor(remaining / 1000)); // в секундах
};

roundSchema.methods.extend = function (extensionSeconds: number): void {
  if (!this.actualEndTime) {
    throw new Error('Cannot extend round without actualEndTime');
  }
  
  this.actualEndTime = new Date(this.actualEndTime.getTime() + extensionSeconds * 1000);
  this.extensionsCount += 1;
  this.lastExtensionAt = new Date();
};

// Статические методы
roundSchema.statics.findActiveRounds = function () {
  return this.find({ status: ROUND_STATUSES.ACTIVE });
};

roundSchema.statics.findScheduledRounds = function () {
  return this.find({ 
    status: ROUND_STATUSES.SCHEDULED,
    scheduledStartTime: { $lte: new Date() }
  });
};

roundSchema.statics.findCompletedRounds = function () {
  return this.find({
    status: ROUND_STATUSES.ACTIVE,
    actualEndTime: { $lte: new Date() }
  });
};

// Валидация
roundSchema.pre('save', function (next) {
  // Проверяем, что scheduledEndTime после scheduledStartTime
  if (this.scheduledEndTime <= this.scheduledStartTime) {
    next(new Error('Scheduled end time must be after scheduled start time'));
    return;
  }
  
  // Проверяем actualStartTime и actualEndTime
  if (this.actualStartTime && this.actualEndTime) {
    if (this.actualEndTime <= this.actualStartTime) {
      next(new Error('Actual end time must be after actual start time'));
      return;
    }
  }
  
  next();
});

const Round = mongoose.model<IRound, RoundModel>('Round', roundSchema);

export default Round;
