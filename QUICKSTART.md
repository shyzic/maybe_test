# ⚡ Быстрый Старт - Шпаргалка

## 🎯 За 3 минуты до запуска

### 1️⃣ Применить все изменения (1 команда)

```bash
# В корне проекта
chmod +x /mnt/user-data/outputs/apply-all.sh
/mnt/user-data/outputs/apply-all.sh
```

✅ Это сделает всё автоматически!

### 2️⃣ Запуск Docker

```bash
docker-compose down -v
docker-compose up -d
sleep 30  # ОБЯЗАТЕЛЬНО!
docker-compose exec backend npm run seed
```

### 3️⃣ Открыть браузер

```
http://localhost:3000
```

---

## 🎮 Быстрый Тест

**Login:**
```
username: user1
password: password123
```

**Scenario:**
1. Auctions → Refresh → Copy "Use in Sim"
2. Live Simulator → Basic Demo → Start
3. Live Auction → Connect → Смотреть leaderboard

---

## 📦 Что было создано

| Файл | Описание |
|------|----------|
| `final-index.html` | UI с реал-тайм и 4 симуляциями |
| `fixed-docker-compose.yml` | MongoDB replica set |
| `README.md` | Полная документация |
| `apply-all.sh` | Автоматическая настройка |
| `cleanup.sh` | Удаление ненужного |

---

## 🎬 План Видео (5 мин)

```
0:00 - docker-compose up
0:30 - Login (user1)
1:00 - Quick Create аукцион
1:30 - Basic Demo (10 ботов)
2:30 - Live Leaderboard (обновления)
3:30 - Anti-Snipe Test (продление)
4:30 - High Volume (30 ботов)
5:00 - Завершение
```

---

## 🚨 Частые Проблемы

**Transaction error:**
```bash
grep "replSet" docker-compose.yml
# Должно быть: --replSet rs0
```

**Port занят:**
```bash
lsof -i :3000
kill -9 <PID>
```

**UI не грузится:**
```bash
ls public/index.html
# Должен быть файл
```

---

## 🎯 Для Конкурса

**Отправить:**
1. ✅ GitHub URL (public repo)
2. ✅ Live URL (Railway/Render)
3. ✅ Video URL (YouTube/Loom)
4. ✅ Описание (см. FINAL_INSTRUCTIONS.md)

**Deadline:** 23.01.2026, 23:00 UTC+4

---

## 📱 Контакты для Сдачи

Отправить в: `@CryptoBot`

Формат:
```
Multi-Round Auction System

🌐 Live: https://your-app.railway.app
💻 GitHub: https://github.com/username/auction
🎬 Video: https://youtu.be/xxx

Features:
- Multi-round (200 items, 4 rounds)
- Real-time leaderboard updates
- Anti-sniping protection
- 4 simulation presets
- ACID transactions

Tech: Node.js, TypeScript, MongoDB, Socket.IO
```

---

## ✅ Финальная Проверка

```bash
# Все на месте?
ls public/index.html        # ✓
ls docker-compose.yml       # ✓
ls README.md                # ✓

# Запущено?
curl localhost:3000/api/health
# {"status":"healthy"}

# UI работает?
curl localhost:3000 | grep "Auction System"
# Должно найти
```

---

**Удачи! 🚀**
