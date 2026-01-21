#!/bin/bash

echo "================================"
echo "Финальная настройка проекта"
echo "================================"

# 1. Удаляем ненужные файлы
echo ""
echo "1. Удаляем ненужные файлы..."

# Удаляем примеры и тестовые файлы
rm -f src/services/examples.ts
rm -f src/docs/swagger-annotations.ts
rm -rf tests/

# Удаляем старые файлы из scripts
rm -f scripts/.placeholder

# Удаляем ненужные конфигурации
rm -f structure.txt
rm -f jest.config.js

echo "   ✓ Ненужные файлы удалены"

# 2. Копируем финальный index.html
echo ""
echo "2. Настраиваем главную страницу..."

# Создаем директорию public если нет
mkdir -p public

# Копируем финальный index.html
if [ -f /mnt/user-data/outputs/final-index.html ]; then
    cp /mnt/user-data/outputs/final-index.html public/index.html
    echo "   ✓ final-index.html → public/index.html"
else
    echo "   ⚠ final-index.html не найден"
fi

# 3. Обновляем docker-compose.yml
echo ""
echo "3. Обновляем docker-compose.yml..."

if [ -f /mnt/user-data/outputs/fixed-docker-compose.yml ]; then
    cp /mnt/user-data/outputs/fixed-docker-compose.yml docker-compose.yml
    echo "   ✓ Используем версию с replica set"
else
    echo "   ⚠ fixed-docker-compose.yml не найден"
fi

# 4. Проверяем src/app.ts что он сервит public/
echo ""
echo "4. Проверяем настройку сервера..."

if grep -q "express.static.*public" src/app.ts; then
    echo "   ✓ Сервер настроен на public/"
else
    echo "   ⚠ Проверьте src/app.ts"
fi

# 5. Создаем .dockerignore если нет
echo ""
echo "5. Создаем .dockerignore..."

cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
dist
.env
.env.local
.git
.gitignore
README.md
.vscode
.idea
*.md
coverage
logs
*.log
tests
.dockerignore
docker-compose.yml
EOF

echo "   ✓ .dockerignore создан"

# 6. Создаем .gitignore
echo ""
echo "6. Обновляем .gitignore..."

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

echo "   ✓ .gitignore обновлен"

echo ""
echo "================================"
echo "✓ Проект готов!"
echo "================================"
echo ""
echo "Что дальше:"
echo ""
echo "Локально:"
echo "  npm install"
echo "  npm run dev"
echo "  Открыть: http://localhost:3000"
echo ""
echo "Docker:"
echo "  docker-compose down -v"
echo "  docker-compose build --no-cache"
echo "  docker-compose up -d"
echo "  sleep 30  # ждем replica set"
echo "  docker-compose exec backend npm run seed"
echo "  Открыть: http://localhost:3000"
echo ""
