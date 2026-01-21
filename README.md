# 🎯 Auction Backend System

Многораундовая аукционная система для распределения ограниченных цифровых товаров. Backend для приложения типа Telegram Gift Auctions.

## ✨ Основные возможности

- ✅ **Многораундовые аукционы** с автоматическим созданием раундов
- ✅ **Real-time обновления** через WebSocket
- ✅ **Anti-sniping защита** с автоматическим продлением раундов
- ✅ **Умная система ставок** с резервированием баланса
- ✅ **Job Queue** для фоновых задач
- ✅ **Автоматические планировщики** для запуска/завершения раундов
- ✅ **REST API** с JWT аутентификацией
- ✅ **MongoDB транзакции** для консистентности данных

## 🚀 Быстрый старт

### Docker Compose (рекомендуется)

```bash
# 1. Клонировать и распаковать
tar -xzf auction-backend-part8.tar.gz
cd auction-backend

# 2. Запустить все сервисы
docker-compose up -d

# 3. Создать демо данные
docker-compose exec backend npm run seed

# 4. Проверить статус
curl http://localhost:3000/api/health
```

Готово! API доступен на `http://localhost:3000/api`

### Без Docker

```bash
# Требования: Node.js 20+, MongoDB 7, Redis 7

# 1. Установить зависимости
npm install

# 2. Запустить MongoDB и Redis
docker run -d -p 27017:27017 mongo:7
docker run -d -p 6379:6379 redis:7-alpine

# 3. Настроить .env
cp .env.example .env

# 4. Запустить
npm run dev
```

## 📡 Endpoints

**Base URL:** `http://localhost:3000/api`

### Auth
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `GET /auth/me` - Текущий пользователь

### Auctions
- `POST /auctions` - Создать (admin)
- `GET /auctions` - Список
- `GET /auctions/:id` - Детали
- `GET /auctions/:id/rounds/:num/leaderboard` - Leaderboard

### Bids
- `POST /bids` - Разместить ставку
- `PUT /bids/:id` - Повысить ставку
- `GET /bids/my-bids` - Мои ставки

**Полная документация:** [WEBSOCKET.md](./WEBSOCKET.md)

## 🔌 WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

socket.emit('join:auction', auctionId);

socket.on('bid:placed', (data) => {
  console.log('New bid:', data.amount);
});

socket.on('round:extended', (data) => {
  console.log('Round extended:', data.newEndTime);
});
```

## 🧪 Тестирование

```bash
# Unit тесты
npm test

# Seed демо данных
npm run seed

# Создаст:
# - admin / admin123
# - user1-10 / password123
# - 1 демо аукцион
```

## 📂 Структура

```
src/
├── models/         # 6 моделей (User, Auction, Round, Bid, etc)
├── services/       # 5 сервисов (бизнес-логика)
├── controllers/    # 4 контроллера (HTTP handlers)
├── routes/         # API маршруты
├── websocket/      # Socket.IO + 10 событий
├── jobs/           # BullMQ + Cron планировщики
└── middleware/     # Auth, validation, errors
```

## 🔧 Технологии

- **Backend:** Node.js 20, TypeScript 5, Express 4
- **Database:** MongoDB 7, Mongoose
- **Cache/Queue:** Redis 7, BullMQ 5
- **Real-time:** Socket.IO 4
- **Auth:** JWT, Bcrypt
- **Logging:** Winston
- **Scheduler:** node-cron

## 📊 Архитектура

```
Client → Express API → Services → MongoDB
           ↓
        Socket.IO → Events
           ↓
        BullMQ → Background Jobs
```

## 🌱 Примеры использования

### Создание аукциона
```bash
curl -X POST http://localhost:3000/api/auctions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NFT Collection",
    "totalItems": 200,
    "itemsPerRound": 50,
    "startTime": "2024-12-25T12:00:00Z",
    "roundDuration": 3600,
    "minBid": 100,
    "currency": "STARS"
  }'
```

### Размещение ставки
```bash
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "auctionId": "<auction-id>",
    "amount": 500
  }'
```

Больше примеров: [EXAMPLES.md](./EXAMPLES.md)

## 🐳 Docker

```bash
# Собрать образ
docker build -t auction-backend .

# Запустить с compose
docker-compose up -d

# Просмотр логов
docker-compose logs -f backend

# Остановить
docker-compose down
```

## 🔐 Безопасность

- ✅ JWT аутентификация
- ✅ Bcrypt хеширование
- ✅ Helmet security headers
- ✅ CORS protection
- ✅ Input validation
- ✅ MongoDB transactions

## 📝 Environment Variables

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/auction
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## 🚨 Troubleshooting

**MongoDB connection failed:**
```bash
docker-compose logs mongodb
docker-compose restart mongodb
```

**Redis connection failed:**
```bash
docker-compose exec redis redis-cli ping
```

**Jobs not processing:**
```bash
docker-compose logs backend | grep Worker
```

## 📄 Лицензия

MIT

## 🙏 Credits

Разработано с использованием TypeScript, MongoDB, Socket.IO и ❤️

---

**Made by:** shyzo
**Version:** 1.0.0  
**Last Updated:** January 2026
