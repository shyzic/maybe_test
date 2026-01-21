# Примеры использования сервисов

## Полный жизненный цикл аукциона

### 1. Регистрация пользователей

```typescript
import UserService from './services/UserService';

// Создание администратора
const { user: admin, token: adminToken } = await UserService.register({
  username: 'admin',
  password: 'admin123',
  initialBalance: 0,
});

// Создание участников
const { user: alice } = await UserService.register({
  username: 'alice',
  password: 'alice123',
  initialBalance: 10000,
});

const { user: bob } = await UserService.register({
  username: 'bob',
  password: 'bob123',
  initialBalance: 15000,
});
```

### 2. Создание аукциона

```typescript
import AuctionService from './services/AuctionService';

const auction = await AuctionService.createAuction({
  name: 'Premium NFT Collection',
  description: 'Limited edition digital collectibles',
  totalItems: 200,
  itemsPerRound: 50,
  startTime: new Date(Date.now() + 60000), // Через 1 минуту
  roundDuration: 3600, // 1 час
  antiSnipeWindow: 60,
  antiSnipeExtension: 60,
  maxExtensions: 10,
  minBid: 100,
  minBidStep: 5,
  currency: 'STARS',
  createdBy: admin._id,
});

console.log(`Created auction with ${auction.totalRounds} rounds`);
// Output: Created auction with 4 rounds
```

### 3. Запуск первого раунда

```typescript
import RoundService from './services/RoundService';

// Получить первый раунд
const rounds = await RoundService.getAuctionRounds(auction._id);
const firstRound = rounds[0];

// Запустить раунд
const activeRound = await RoundService.startRound(firstRound._id);

console.log(`Round ${activeRound.roundNumber} started`);
console.log(`End time: ${activeRound.actualEndTime}`);
```

### 4. Размещение ставок

```typescript
import BidService from './services/BidService';

// Alice делает ставку
const aliceBid = await BidService.placeBid({
  auctionId: auction._id,
  userId: alice._id,
  amount: 500,
});

console.log(`Alice bid: ${aliceBid.amount} STARS`);

// Bob делает ставку
const bobBid = await BidService.placeBid({
  auctionId: auction._id,
  userId: bob._id,
  amount: 600,
});

console.log(`Bob bid: ${bobBid.amount} STARS`);
```

### 5. Повышение ставки

```typescript
// Alice повышает свою ставку
const increasedBid = await BidService.increaseBid({
  bidId: aliceBid._id,
  userId: alice._id,
  newAmount: 700, // +40% (больше минимального шага 5%)
});

console.log(`Alice increased bid to: ${increasedBid.amount} STARS`);
```

### 6. Просмотр Leaderboard

```typescript
const leaderboard = await BidService.getRoundLeaderboard(
  auction._id,
  1, // Round number
  alice._id // Current user
);

console.log('Leaderboard:');
leaderboard.entries.forEach(entry => {
  const winning = entry.position <= leaderboard.cutoffPosition ? '✓' : '✗';
  const current = entry.isCurrentUser ? '(YOU)' : '';
  console.log(
    `${entry.position}. ${entry.username} ${current}: ${entry.amount} STARS ${winning}`
  );
});

// Output:
// Leaderboard:
// 1. alice (YOU): 700 STARS ✓
// 2. bob: 600 STARS ✓
```

### 7. Проверка позиции пользователя

```typescript
const position = await BidService.getUserPosition(
  auction._id,
  alice._id,
  1
);

if (position) {
  console.log(`Position: ${position.position}/${position.totalBids}`);
  console.log(`Winning: ${position.isWinning ? 'Yes' : 'No'}`);
}
```

### 8. Anti-sniping сценарий

```typescript
// Ставка делается в последние 30 секунд раунда
// Anti-sniping автоматически срабатывает при placeBid/increaseBid

const lateBid = await BidService.placeBid({
  auctionId: auction._id,
  userId: charlie._id,
  amount: 800,
});

// Round автоматически продлится на 60 секунд
const updatedRound = await RoundService.getRoundById(activeRound._id);
console.log(`Extensions count: ${updatedRound.extensionsCount}`);
console.log(`New end time: ${updatedRound.actualEndTime}`);
```

### 9. Завершение раунда

```typescript
// После окончания времени раунда
const completedRound = await RoundService.completeRound(activeRound._id);

console.log(`Round completed. Winners processed: ${completedRound.winnersProcessed}`);

// Проверка результатов
const stats = await BidService.getAuctionBidStats(auction._id);
console.log('Auction stats:', {
  totalBids: stats.totalBids,
  activeBids: stats.activeBids,
  uniqueBidders: stats.uniqueBidders,
  averageBid: stats.averageBid,
});
```

### 10. Запуск следующего раунда

```typescript
// Ставки автоматически переносятся
const secondRound = rounds[1];
const activeRound2 = await RoundService.startRound(secondRound._id);

// Проигравшие из Round 1 автоматически участвуют в Round 2
const round2Bids = await BidService.getAuctionBids(auction._id, 2);
console.log(`Round 2 started with ${round2Bids.length} bids`);
```

### 11. Просмотр истории транзакций

```typescript
import TransactionService from './services/TransactionService';

const aliceTransactions = await TransactionService.getUserTransactions(
  alice._id,
  { page: 1, limit: 10 }
);

aliceTransactions.data.forEach(tx => {
  console.log(`${tx.type}: ${tx.amount} (${tx.description})`);
});

// Output:
// deposit: 10000 (Initial balance)
// bid_placed: 500 (Bid placed in Premium NFT Collection)
// bid_increased: 200 (Bid increased from 500 to 700...)
```

### 12. Статистика пользователя

```typescript
const aliceStats = await UserService.getUserStats(alice._id);

console.log('Alice stats:', {
  totalBids: aliceStats.totalBids,
  totalWins: aliceStats.totalWins,
  totalSpent: aliceStats.totalSpent,
  averageWinAmount: aliceStats.averageWinAmount,
});
```

### 13. Проверка баланса

```typescript
const aliceUser = await UserService.getUserById(alice._id);

console.log('Alice balance:', {
  total: aliceUser.balance,
  reserved: aliceUser.reservedBalance,
  available: aliceUser.getAvailableBalance(),
});

// Output:
// Alice balance: {
//   total: 10000,
//   reserved: 700,
//   available: 9300
// }
```

### 14. Отмена ставки (до начала раунда)

```typescript
// Можно отменить только до начала раунда
const cancelled = await BidService.cancelBid(someBid._id, user._id);

console.log(`Bid cancelled. Status: ${cancelled.status}`);
// Средства возвращаются автоматически
```

## Автоматические фоновые задачи

### Запуск запланированных раундов

```typescript
// Выполняется каждую минуту через Job Queue
async function processScheduledRounds() {
  const rounds = await RoundService.getScheduledRounds();
  
  for (const round of rounds) {
    try {
      await RoundService.startRound(round._id);
      logger.info(`Auto-started round ${round.roundNumber}`);
    } catch (error) {
      logger.error(`Failed to start round ${round.roundNumber}:`, error);
    }
  }
}
```

### Завершение раундов

```typescript
// Выполняется каждую минуту через Job Queue
async function processCompletedRounds() {
  const rounds = await RoundService.getCompletedRounds();
  
  for (const round of rounds) {
    try {
      await RoundService.completeRound(round._id);
      logger.info(`Auto-completed round ${round.roundNumber}`);
    } catch (error) {
      logger.error(`Failed to complete round ${round.roundNumber}:`, error);
    }
  }
}
```

### Проверка завершения аукционов

```typescript
async function checkAuctionCompletions() {
  const activeAuctions = await AuctionService.getActiveAuctions();
  
  for (const auction of activeAuctions) {
    try {
      await AuctionService.checkAuctionCompletion(auction._id);
    } catch (error) {
      logger.error(`Failed to check auction ${auction._id}:`, error);
    }
  }
}
```

## Обработка ошибок

```typescript
import {
  NotFoundError,
  ConflictError,
  InsufficientBalanceError,
  BidTooLowError,
} from './utils/errors';

try {
  await BidService.placeBid({
    auctionId: auction._id,
    userId: user._id,
    amount: 50, // Меньше минимума
  });
} catch (error) {
  if (error instanceof BidTooLowError) {
    console.log('Bid is too low. Minimum:', auction.minBid);
  } else if (error instanceof InsufficientBalanceError) {
    console.log('Not enough balance');
  } else if (error instanceof ConflictError) {
    console.log('You already have an active bid');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Полный сценарий аукциона

```typescript
async function runCompleteAuction() {
  // 1. Создание пользователей
  const users = await createUsers(10);
  
  // 2. Создание аукциона
  const auction = await createAuction(admin._id);
  
  // 3. Для каждого раунда
  for (let roundNum = 1; roundNum <= auction.totalRounds; roundNum++) {
    // Запуск раунда
    const round = await startRound(auction._id, roundNum);
    
    // Пользователи делают ставки
    for (const user of users) {
      await placeBid(auction._id, user._id, randomBid());
    }
    
    // Некоторые повышают ставки
    for (let i = 0; i < 5; i++) {
      const user = users[i];
      await increaseBid(user.activeBid, higherBid());
    }
    
    // Ждем окончания раунда
    await waitForRoundEnd(round);
    
    // Завершение раунда
    await RoundService.completeRound(round._id);
    
    // Логируем результаты
    const winners = await getWinners(auction._id, roundNum);
    console.log(`Round ${roundNum}: ${winners.length} winners`);
  }
  
  // 4. Проверка завершения аукциона
  await AuctionService.checkAuctionCompletion(auction._id);
  
  // 5. Финальная статистика
  const stats = await AuctionService.getAuctionStats(auction._id);
  console.log('Auction completed!', stats);
}
```
