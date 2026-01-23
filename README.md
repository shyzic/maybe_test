# 🎯 Multi-Round Auction System

> **Professional multi-round auction platform with real-time bidding, anti-sniping protection, and advanced simulation capabilities.**

[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6-black.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Auction Mechanics](#auction-mechanics)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Real-Time Updates](#real-time-updates)
- [Simulation Modes](#simulation-modes)
- [Testing](#testing)

---

## 🎯 Overview

A sophisticated multi-round auction system designed for distributing limited digital assets (NFTs, collectibles, etc.) where **multiple items** are auctioned across **multiple rounds**. Users place bids that carry over between rounds until they either win or the auction completes.

**Perfect for:**
- NFT collections (e.g., 200 unique items)
- Limited edition merchandise
- Digital collectibles (Telegram Stars gifts)
- Event tickets with tiered pricing

---

## ✨ Key Features

### Core Auction Mechanics
- ✅ **Multi-Round System** - Distribute 200+ items across 4-10 rounds
- ✅ **Bid Carry-Over** - Losing bids automatically move to next round
- ✅ **Anti-Sniping Protection** - Last-second bids extend the round
- ✅ **Fair Distribution** - Highest N bids win N items per round
- ✅ **Balance Management** - Reserved/available balance tracking

### Real-Time Features
- 🔴 **Live Leaderboard** - See all bids update in real-time
- ⚡ **WebSocket Updates** - Instant bid notifications
- 📊 **Activity Feed** - Track every bid as it happens
- 🎯 **Position Tracking** - Know if you're winning

### Advanced Simulation
- 🤖 **Bot Simulator** - Test with 5-50 automated bidders
- 📋 **4 Preset Modes** - Basic, Anti-Snipe, High-Volume, Competitive
- 📈 **Real-Time Stats** - Monitor bots, bids, errors
- 🎬 **Perfect for Demos** - Showcase system under load

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │ (React-style SPA, WebSocket)
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────┐
│          Express REST API                    │
│  ┌────────────┬──────────────┬────────────┐ │
│  │Controllers │  Middleware  │   Routes   │ │
│  └─────┬──────┴──────┬───────┴──────┬─────┘ │
│        │             │              │       │
│  ┌─────▼─────────────▼──────────────▼─────┐ │
│  │            Services Layer              │ │
│  │  • AuctionService                      │ │
│  │  • RoundService (Anti-Snipe Logic)    │ │
│  │  • BidService (Transactions)          │ │
│  │  • UserService (Balance)              │ │
│  └─────┬──────────────────────────────────┘ │
└────────┼────────────────────────────────────┘
         │
┌────────▼─────────┐      ┌──────────────┐
│   MongoDB 7      │      │  Socket.IO   │
│  (Replica Set)   │      │  WebSocket   │
│  • ACID Trans.   │      │  • Events    │
│  • Optimistic    │      │  • Rooms     │
│    Locking       │      └──────────────┘
└──────────────────┘
         │
┌────────▼─────────┐
│    Redis 7       │
│  • BullMQ Queue  │
│  • Job Schedule  │
└──────────────────┘
```

### Data Flow

```
User Places Bid
    ↓
1. Check balance (User.availableBalance)
2. Reserve funds (User.reservedBalance += amount)
3. Create Bid (status: active)
4. Create Transaction (type: bid_placed)
    ↓
[MongoDB Transaction - ACID]
    ↓
5. WebSocket → broadcast to auction room
6. Check anti-snipe window
7. Extend round if needed
```

---

## 🎲 Auction Mechanics

### How It Works

1. **Auction Creation**
   - Admin sets: total items (200), items per round (50)
   - System calculates: 4 rounds needed
   - Rounds auto-created with scheduled start/end times

2. **Round Flow**
   ```
   Round 1: 50 items, 100 bids placed
   → Top 50 bids WIN items #1-50
   → Bottom 50 bids CARRY OVER to Round 2
   
   Round 2: 50 items, 50 carried + 30 new = 80 bids
   → Top 50 WIN items #51-100
   → Bottom 30 CARRY OVER to Round 3
   
   ... continues until all items distributed
   ```

3. **Anti-Sniping**
   ```
   Round ends at: 10:00:00
   Anti-snipe window: last 60 seconds
   
   User bids at: 09:59:45
   → Round extends by +60 seconds
   → New end time: 10:01:00
   
   Max extensions: 10
   ```

4. **Balance Management**
   - Total Balance: 10,000 STARS
   - Reserved: 500 (active bid)
   - **Available: 9,500** (can bid up to this)

5. **Winner Selection**
   ```
   Sort all active bids by:
   1. Amount (DESC)
   2. Created time (ASC) - earlier wins ties
   
   Take top N bids = N items won
   ```

---

## 🛠️ Technology Stack

### Backend
- **Node.js 20** - Runtime
- **TypeScript 5** - Type safety
- **Express 4** - REST API
- **Socket.IO 4** - Real-time updates
- **Mongoose 8** - MongoDB ODM
- **BullMQ 5** - Job queue (round scheduling)
- **node-cron** - Periodic tasks

### Database
- **MongoDB 7** - Primary database (replica set for transactions)
- **Redis 7** - Queue & caching

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Winston** - Logging

### Frontend
- **Vanilla JS** - No framework overhead
- **WebSocket Client** - Real-time updates
- **CSS Animations** - Smooth UX

---

## 🚀 Quick Start

### Prerequisites
```bash
# Required
- Docker & Docker Compose
- Node.js 20+ (for local dev)

# Optional
- MongoDB 7
- Redis 7
```

### 1. Docker Deployment (Recommended)

```bash
# Build and start all services
docker-compose up -d

# Wait for MongoDB replica set (IMPORTANT!)
echo "Waiting 30 seconds for replica set initialization..."
sleep 30

# Seed demo data
docker-compose exec backend npm run seed

# Check status
docker-compose ps
docker-compose logs backend | tail -20
```

**Access:**
- Web Demo: http://localhost:3000/demo
- API: http://localhost:3000/api
- Health: http://localhost:3000/api/health

### 2. Local Development

```bash
# Install dependencies
npm install

# Start MongoDB & Redis
docker-compose up -d mongodb redis

# Configure environment
cp .env.example .env

# Run in dev mode
npm run dev
```

---

## 📚 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "username": "john_doe",
  "password": "password123",
  "email": "john@example.com"  # optional
}

# Login
POST /api/auth/login
{
  "username": "john_doe",
  "password": "password123"
}
# Returns: { token: "jwt-token", user: {...} }

# Get current user
GET /api/auth/me
Headers: Authorization: Bearer <token>
```

### Auctions

```bash
# List auctions
GET /api/auctions?status=active&page=1&limit=20

# Get auction details
GET /api/auctions/:id

# Create auction (admin)
POST /api/auctions
Headers: Authorization: Bearer <admin-token>
{
  "name": "Premium NFT Collection",
  "totalItems": 200,
  "itemsPerRound": 50,
  "startTime": "2026-01-23T12:00:00Z",
  "roundDuration": 3600,  # seconds
  "antiSnipeWindow": 60,
  "antiSnipeExtension": 60,
  "maxExtensions": 10,
  "minBid": 100,
  "minBidStep": 5,  # percentage
  "currency": "STARS"
}

# Get auction stats
GET /api/auctions/:id/stats

# Get current round
GET /api/auctions/:id/current-round

# Get leaderboard
GET /api/auctions/:auctionId/rounds/:roundNumber/leaderboard
```

### Bidding

```bash
# Place bid
POST /api/bids
Headers: Authorization: Bearer <token>
{
  "auctionId": "...",
  "amount": 500
}

# Increase bid
PUT /api/bids/:id
{
  "newAmount": 750  # must be +5% minimum
}

# Get my bids
GET /api/bids/my-bids?page=1&limit=20

# Get my position
GET /api/auctions/:auctionId/my-position
```

### User

```bash
# Get balance
GET /api/users/me/balance

# Deposit (demo)
POST /api/users/me/deposit
{ "amount": 5000 }

# Get transactions
GET /api/users/me/transactions?page=1
```

---

## 🔴 Real-Time Updates

### WebSocket Events

**Client → Server:**
```javascript
// Connect
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

// Subscribe to auction
socket.emit('subscribe:auction', auctionId);
```

**Server → Client:**
```javascript
// Auction started
socket.on('auction:started', (data) => {
  // { auctionId, name, currentRound, startTime }
});

// Round started
socket.on('round:started', (data) => {
  // { auctionId, roundNumber, itemsInRound, scheduledEndTime }
});

// Round extended (anti-snipe)
socket.on('round:extended', (data) => {
  // { auctionId, roundNumber, newEndTime, extensionsCount }
});

// Bid placed
socket.on('bid:placed', (data) => {
  // { auctionId, bidId, userId, username, amount, roundNumber }
});

// Bid increased
socket.on('bid:increased', (data) => {
  // { auctionId, bidId, username, previousAmount, newAmount }
});

// Round completed
socket.on('round:completed', (data) => {
  // { auctionId, roundNumber, winnersCount }
});

// You won!
socket.on('user:won', (data) => {
  // { auctionId, itemNumber, amount, roundNumber }
});
```

---

## 🎮 Simulation Modes

### 4 Built-in Presets

**1. Basic Demo (10 bots, 2s frequency)**
- Perfect for: First-time demos
- Shows: Steady bidding flow
- Use case: Explaining mechanics

**2. Anti-Snipe Test (15 bots, 1s frequency)**
- Perfect for: Demonstrating protection
- Shows: Round extensions in action
- Use case: Security features showcase

**3. High Volume (30 bots, 800ms frequency)**
- Perfect for: Stress testing
- Shows: System handles load
- Use case: Performance demonstration

**4. Competitive (20 bots, 1.5s frequency)**
- Perfect for: Realistic auction
- Shows: Natural competition
- Use case: Production-like demo

### Running Simulation

```bash
# Via UI
1. Create auction (Quick Create button)
2. Go to "Live Simulator"
3. Select preset
4. Click "Start Simulation"

# Via API
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auctionId":"...","amount":500}'
```

---

## 🧪 Testing

### Seed Demo Data

```bash
# Creates:
# - 1 admin user (admin / admin123)
# - 10 regular users (user1-10 / password123)
# - 1 demo auction (starts in 30 seconds)

docker-compose exec backend npm run seed

# Or locally
npm run seed
```

### Test Credentials

```
Admin:
  username: admin
  password: admin123

Users:
  username: user1, user2, ..., user10
  password: password123
  balance: 10,000 STARS each
```

### Manual Testing Flow

```bash
# 1. Register/Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"password123"}'
# Save token

# 2. View auctions
curl http://localhost:3000/api/auctions

# 3. Place bid
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auctionId":"...","amount":500}'

# 4. Check leaderboard
curl http://localhost:3000/api/auctions/$AUCTION_ID/rounds/1/leaderboard

# 5. Get my position
curl http://localhost:3000/api/auctions/$AUCTION_ID/my-position \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Key Implementation Details

### ACID Transactions

All financial operations use MongoDB transactions:

```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Reserve user balance
  user.reservedBalance += amount;
  await user.save({ session });
  
  // 2. Create bid
  const bid = await Bid.create([{...}], { session });
  
  // 3. Record transaction
  await Transaction.create([{...}], { session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

### Anti-Sniping Logic

```typescript
// Check if in anti-snipe window
const timeUntilEnd = roundEndTime - Date.now();
const inWindow = timeUntilEnd <= antiSnipeWindow * 1000;

if (inWindow && extensionsCount < maxExtensions) {
  // Extend round
  round.actualEndTime = new Date(
    round.actualEndTime.getTime() + antiSnipeExtension * 1000
  );
  round.extensionsCount++;
  
  // Reschedule completion job
  await rescheduleRoundEnd(round._id, round.actualEndTime);
}
```

### Winner Selection

```typescript
// Get all active bids for round
const bids = await Bid.find({
  auctionId,
  currentRound: roundNumber,
  status: 'active'
})
.sort({ amount: -1, createdAt: 1 }); // DESC amount, ASC time

// Top N win
const winners = bids.slice(0, itemsInRound);
const losers = bids.slice(itemsInRound);

// Process winners
for (const bid of winners) {
  bid.status = 'won';
  user.balance -= bid.amount;
  user.reservedBalance -= bid.amount;
  // ...
}

// Carry over losers (if not last round)
for (const bid of losers) {
  bid.status = 'carried_over';
  bid.currentRound += 1;
  // ...
}
```

---

## 🎯 Production Considerations

### Scaling

- **Horizontal:** Multiple API instances behind load balancer
- **Database:** MongoDB sharding for >100k auctions
- **Queue:** Redis Cluster for high-volume jobs
- **WebSocket:** Sticky sessions or Redis adapter

### Security

- ✅ JWT with short expiration (7 days)
- ✅ Rate limiting (10 requests/second per user)
- ✅ Input validation & sanitization
- ✅ CORS protection
- ✅ Helmet security headers
- ⚠️ Add: HTTPS, API keys, 2FA for production

### Monitoring

```bash
# Health check
curl http://localhost:3000/api/health

# Logs
docker-compose logs -f backend

# MongoDB status
docker-compose exec mongodb mongosh --eval "rs.status()"

# Redis info
docker-compose exec redis redis-cli INFO
```

---

## 📝 Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://mongodb:27017/auction?replicaSet=rs0
REDIS_URL=redis://redis:6379

# Auth
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Demo
DEMO_INITIAL_BALANCE=10000

# Auction Defaults
DEFAULT_ROUND_DURATION=3600
DEFAULT_ITEMS_PER_ROUND=50
DEFAULT_MIN_BID=100
DEFAULT_MIN_BID_STEP=5
DEFAULT_ANTI_SNIPE_WINDOW=60
DEFAULT_ANTI_SNIPE_EXTENSION=60
DEFAULT_MAX_EXTENSIONS=10
```

---

## 🐛 Troubleshooting

### MongoDB Transaction Errors

**Error:** "Transaction numbers are only allowed on a replica set"

**Solution:**
```bash
# Ensure using fixed-docker-compose.yml with replica set
docker-compose down -v
cp fixed-docker-compose.yml docker-compose.yml
docker-compose up -d
sleep 30  # Wait for replica set init
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### WebSocket Connection Failed

**Check:**
1. Server running: `curl http://localhost:3000/api/health`
2. CORS settings in `src/app.ts`
3. Token valid: Check JWT expiration
4. Network settings: Check firewall

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Credits

Built with ❤️ using:
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Socket.IO](https://socket.io/)
- [Express](https://expressjs.com/)
- [Docker](https://www.docker.com/)

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review API examples

---

**Made by shyzo**

*Demonstrating professional multi-round auction mechanics with real-time updates and anti-sniping protection.*
