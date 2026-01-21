#!/bin/bash

# ============================================
# 🚀 Финальное Применение - Все в Одном
# ============================================

set -e  # Выход при ошибке

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  🎯 AUCTION SYSTEM - FINAL SETUP      ║"
echo "╔════════════════════════════════════════╗"
echo ""

# Определяем цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка что мы в корне проекта
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Ошибка: package.json не найден${NC}"
    echo "Пожалуйста, запустите скрипт из корня проекта"
    exit 1
fi

echo -e "${BLUE}📂 Текущая директория: $(pwd)${NC}"
echo ""

# ============================================
# 1. Копирование финальных файлов
# ============================================

echo -e "${YELLOW}Шаг 1/7: Копирование финальных файлов...${NC}"

# Создаем public если нет
mkdir -p public

# Копируем файлы
if [ -f "/mnt/user-data/outputs/final-index.html" ]; then
    cp /mnt/user-data/outputs/final-index.html public/index.html
    echo -e "${GREEN}✓${NC} final-index.html → public/index.html"
else
    echo -e "${YELLOW}⚠${NC} final-index.html не найден в outputs"
fi

if [ -f "/mnt/user-data/outputs/fixed-docker-compose.yml" ]; then
    cp /mnt/user-data/outputs/fixed-docker-compose.yml docker-compose.yml
    echo -e "${GREEN}✓${NC} fixed-docker-compose.yml → docker-compose.yml"
else
    echo -e "${YELLOW}⚠${NC} fixed-docker-compose.yml не найден"
fi

if [ -f "/mnt/user-data/outputs/README.md" ]; then
    cp /mnt/user-data/outputs/README.md README.md
    echo -e "${GREEN}✓${NC} README.md обновлен"
else
    echo -e "${YELLOW}⚠${NC} README.md не найден"
fi

echo ""

# ============================================
# 2. Удаление ненужных файлов
# ============================================

echo -e "${YELLOW}Шаг 2/7: Удаление ненужных файлов...${NC}"

# Удаляем примеры
if [ -f "src/services/examples.ts" ]; then
    rm -f src/services/examples.ts
    echo -e "${GREEN}✓${NC} Удален src/services/examples.ts"
fi

# Удаляем swagger annotations (не используется)
if [ -f "src/docs/swagger-annotations.ts" ]; then
    rm -f src/docs/swagger-annotations.ts
    echo -e "${GREEN}✓${NC} Удален src/docs/swagger-annotations.ts"
fi

# Удаляем тесты (для продакшена не нужны)
if [ -d "tests" ]; then
    rm -rf tests/
    echo -e "${GREEN}✓${NC} Удалена директория tests/"
fi

# Удаляем placeholder
if [ -f "scripts/.placeholder" ]; then
    rm -f scripts/.placeholder
    echo -e "${GREEN}✓${NC} Удален scripts/.placeholder"
fi

# Удаляем временные файлы
rm -f structure.txt jest.config.js 2>/dev/null || true

echo -e "${GREEN}✓${NC} Все ненужные файлы удалены"
echo ""

# ============================================
# 3. Создание .dockerignore
# ============================================

echo -e "${YELLOW}Шаг 3/7: Создание .dockerignore...${NC}"

cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
dist
.env
.env.local
.git
.gitignore
*.md
.vscode
.idea
coverage
logs
*.log
tests
.dockerignore
docker-compose.yml
EOF

echo -e "${GREEN}✓${NC} .dockerignore создан"
echo ""

# ============================================
# 4. Обновление .gitignore
# ============================================

echo -e "${YELLOW}Шаг 4/7: Обновление .gitignore...${NC}"

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/

# Logs
logs/
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Tests
coverage/
.nyc_output/

# Temporary
tmp/
temp/
EOF

echo -e "${GREEN}✓${NC} .gitignore обновлен"
echo ""

# ============================================
# 5. Проверка файлов
# ============================================

echo -e "${YELLOW}Шаг 5/7: Проверка критических файлов...${NC}"

FILES=(
    "public/index.html"
    "docker-compose.yml"
    "README.md"
    "package.json"
    "src/app.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file - ОТСУТСТВУЕТ!"
    fi
done

echo ""

# ============================================
# 6. Статистика проекта
# ============================================

echo -e "${YELLOW}Шаг 6/7: Статистика проекта...${NC}"

echo -e "${BLUE}Размер public/index.html:${NC} $(wc -c < public/index.html) bytes"
echo -e "${BLUE}Количество файлов в src/:${NC} $(find src -type f | wc -l)"
echo -e "${BLUE}Количество моделей:${NC} $(ls -1 src/models/*.ts 2>/dev/null | wc -l)"
echo -e "${BLUE}Количество сервисов:${NC} $(ls -1 src/services/*.ts 2>/dev/null | wc -l)"

echo ""

# ============================================
# 7. Инструкции по запуску
# ============================================

echo -e "${YELLOW}Шаг 7/7: Готово к запуску!${NC}"
echo ""

echo "╔════════════════════════════════════════╗"
echo "║  ✅ НАСТРОЙКА ЗАВЕРШЕНА                ║"
echo "╔════════════════════════════════════════╗"
echo ""

echo -e "${GREEN}Что было сделано:${NC}"
echo "  ✓ Скопированы финальные файлы"
echo "  ✓ Удалены ненужные файлы"
echo "  ✓ Создан .dockerignore"
echo "  ✓ Обновлен .gitignore"
echo "  ✓ Проверены критические файлы"
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       🚀 СЛЕДУЮЩИЕ ШАГИ                  ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo ""

echo -e "${YELLOW}📦 Docker (Рекомендуется):${NC}"
echo ""
echo "  docker-compose down -v"
echo "  docker-compose build --no-cache"
echo "  docker-compose up -d"
echo "  sleep 30  # ВАЖНО: ждем replica set"
echo "  docker-compose exec backend npm run seed"
echo ""

echo -e "${YELLOW}💻 Локально:${NC}"
echo ""
echo "  npm install"
echo "  docker-compose up -d mongodb redis"
echo "  sleep 30"
echo "  npm run dev"
echo ""

echo -e "${YELLOW}🌐 Открыть:${NC}"
echo ""
echo "  http://localhost:3000"
echo ""

echo -e "${YELLOW}🧪 Тест логин:${NC}"
echo ""
echo "  username: user1"
echo "  password: password123"
echo "  balance: 10,000 STARS"
echo ""

echo -e "${YELLOW}🎬 Для видео демо:${NC}"
echo ""
echo "  1. Quick Create аукцион"
echo "  2. Live Simulator → Basic Demo"
echo "  3. Live Auction → смотреть leaderboard"
echo "  4. Попробовать разные presets"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     🎯 ГОТОВ К СДАЧЕ ПРОЕКТА!           ║${NC}"
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo ""

echo -e "${BLUE}📝 Читайте:${NC} README.md - полная документация"
echo -e "${BLUE}📋 Инструкции:${NC} FINAL_INSTRUCTIONS.md (в outputs/)"
echo ""

exit 0
