import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWonItem extends Document {
  _id: mongoose.Types.ObjectId;
  auctionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bidId: mongoose.Types.ObjectId;
  itemNumber: number;
  roundNumber: number;
  positionInRound: number;
  winningBidAmount: number;
  createdAt: Date;
}

export interface IWonItemMethods {
  getDisplayNumber(): string;
}

type WonItemModel = Model<IWonItem, {}, IWonItemMethods>;

const wonItemSchema = new Schema<IWonItem, WonItemModel, IWonItemMethods>(
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
    bidId: {
      type: Schema.Types.ObjectId,
      ref: 'Bid',
      required: true,
      unique: true, // Одна ставка может выиграть только один предмет
      index: true,
    },
    itemNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    positionInRound: {
      type: Number,
      required: true,
      min: 1,
    },
    winningBidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Только createdAt
  }
);

// Составные индексы
wonItemSchema.index({ auctionId: 1, itemNumber: 1 }, { unique: true }); // Уникальность номера предмета в аукционе
wonItemSchema.index({ auctionId: 1, roundNumber: 1, positionInRound: 1 });
wonItemSchema.index({ userId: 1, createdAt: -1 });
wonItemSchema.index({ auctionId: 1, userId: 1 });

// Виртуальные поля
wonItemSchema.virtual('auction', {
  ref: 'Auction',
  localField: 'auctionId',
  foreignField: '_id',
  justOne: true,
});

wonItemSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

wonItemSchema.virtual('bid', {
  ref: 'Bid',
  localField: 'bidId',
  foreignField: '_id',
  justOne: true,
});

// Методы
wonItemSchema.methods.getDisplayNumber = function (): string {
  return `#${this.itemNumber}`;
};

// Статические методы
wonItemSchema.statics.findByAuction = function (auctionId: mongoose.Types.ObjectId) {
  return this.find({ auctionId }).sort({ itemNumber: 1 });
};

wonItemSchema.statics.findByUser = function (userId: mongoose.Types.ObjectId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

wonItemSchema.statics.findByRound = function (
  auctionId: mongoose.Types.ObjectId,
  roundNumber: number
) {
  return this.find({ auctionId, roundNumber }).sort({ positionInRound: 1 });
};

wonItemSchema.statics.countByAuction = function (auctionId: mongoose.Types.ObjectId) {
  return this.countDocuments({ auctionId });
};

wonItemSchema.statics.countByUser = function (userId: mongoose.Types.ObjectId) {
  return this.countDocuments({ userId });
};

wonItemSchema.statics.getLeaderboard = function (
  auctionId: mongoose.Types.ObjectId,
  limit: number = 100
) {
  return this.aggregate([
    { $match: { auctionId } },
    {
      $group: {
        _id: '$userId',
        totalWins: { $sum: 1 },
        totalSpent: { $sum: '$winningBidAmount' },
        items: { $push: '$itemNumber' },
      },
    },
    { $sort: { totalWins: -1, totalSpent: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        username: '$user.username',
        totalWins: 1,
        totalSpent: 1,
        items: 1,
      },
    },
  ]);
};

// Валидация
wonItemSchema.pre('save', function (next) {
  // Проверяем, что positionInRound корректна
  if (this.positionInRound < 1) {
    next(new Error('Position in round must be at least 1'));
    return;
  }
  
  next();
});

const WonItem = mongoose.model<IWonItem, WonItemModel>('WonItem', wonItemSchema);

export default WonItem;
