import mongoose, { Schema, Document, Model } from 'mongoose';
import { TransactionType, TRANSACTION_TYPES } from '../config/constants';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  auctionId?: mongoose.Types.ObjectId;
  bidId?: mongoose.Types.ObjectId;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: Date;
}

type TransactionModel = Model<ITransaction>;

const transactionSchema = new Schema<ITransaction, TransactionModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(TRANSACTION_TYPES),
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      index: true,
    },
    bidId: {
      type: Schema.Types.ObjectId,
      ref: 'Bid',
      index: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Только createdAt
  }
);

// Составные индексы
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ auctionId: 1, createdAt: -1 });
transactionSchema.index({ bidId: 1 });

// Статический метод для создания транзакции
transactionSchema.statics.createTransaction = async function (
  userId: mongoose.Types.ObjectId,
  type: TransactionType,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  description: string,
  auctionId?: mongoose.Types.ObjectId,
  bidId?: mongoose.Types.ObjectId
) {
  return this.create({
    userId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    auctionId,
    bidId,
  });
};

const Transaction = mongoose.model<ITransaction, TransactionModel>('Transaction', transactionSchema);

export default Transaction;
