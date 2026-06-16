#!/bin/sh
set -e

echo "Sincronizando banco com Prisma..."
npx prisma db push --accept-data-loss

echo "Iniciando aplicação..."
exec node dist/main.js
