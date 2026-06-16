FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/infrastructure/database/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate --schema ./prisma/schema.prisma
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
# Schema necessário para o prisma migrate deploy
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
RUN chown -R appuser:appgroup /app
USER appuser
ENTRYPOINT ["./entrypoint.sh"]
