// Экспорт всех сервисов для удобного импорта
export { UserService } from './UserService';
export { TransactionService } from './TransactionService';
export { AuctionService } from './AuctionService';
export { RoundService } from './RoundService';
export { BidService } from './BidService';

import UserServiceInstance from './UserService';
import TransactionServiceInstance from './TransactionService';
import AuctionServiceInstance from './AuctionService';
import RoundServiceInstance from './RoundService';
import BidServiceInstance from './BidService';

export const userService = UserServiceInstance;
export const transactionService = TransactionServiceInstance;

export default {
  UserService: UserServiceInstance,
  TransactionService: TransactionServiceInstance,
  AuctionService: AuctionServiceInstance,
  RoundService: RoundServiceInstance,
  BidService: BidServiceInstance,
};
