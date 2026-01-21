import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document, IUserMethods {
  _id: mongoose.Types.ObjectId;
  username: string;
  email?: string;
  passwordHash?: string;
  balance: number;
  reservedBalance: number;
  totalBids: number;
  totalWins: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  hasAvailableBalance(amount: number): boolean;
  getAvailableBalance(): number;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    passwordHash: {
      type: String,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalBids: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalWins: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    // versionKey: true, // Включаем __v для оптимистичной блокировки
  }
);

// Индексы
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });

// Методы
userSchema.methods.hasAvailableBalance = function (amount: number): boolean {
  return this.balance - this.reservedBalance >= amount;
};

userSchema.methods.getAvailableBalance = function (): number {
  return Math.max(0, this.balance - this.reservedBalance);
};

// Валидация перед сохранением
userSchema.pre('save', function (next) {
  // Проверяем, что reservedBalance не превышает balance
  if (this.reservedBalance > this.balance) {
    next(new Error('Reserved balance cannot exceed total balance'));
    return;
  }
  next();
});

const User = mongoose.model<IUser, UserModel>('User', userSchema);

export default User;
