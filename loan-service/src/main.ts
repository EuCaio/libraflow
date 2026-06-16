// src/main.ts

import 'reflect-metadata';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import { PrismaLoanRepository } from './infrastructure/database/repositories/PrismaLoanRepository';
import { RabbitMQPublisher, NoOpEventPublisher } from './infrastructure/messaging/RabbitMQPublisher';
import { CatalogHttpClient } from './infrastructure/http/CatalogHttpClient';
import { LoanDomainService } from './domain/services/LoanDomainService';
import { CreateLoanUseCase } from './application/use-cases/CreateLoanUseCase';
import { ReturnBookUseCase } from './application/use-cases/ReturnBookUseCase';
import { RenewLoanUseCase } from './application/use-cases/RenewLoanUseCase';
import { ListLoansUseCase } from './application/use-cases/ListLoansUseCase';
import { LoanController } from './presentation/controllers/LoanController';
import { loanRoutes } from './presentation/routes/loanRoutes';

async function bootstrap() {
  const PORT = parseInt(process.env.PORT ?? '3003');

  // ── Infrastructure ─────────────────────────────────────────────────────────
  const prisma = new PrismaClient();
  await prisma.$connect();

  const eventPublisher = process.env.RABBITMQ_URL
    ? new RabbitMQPublisher(process.env.RABBITMQ_URL)
    : new NoOpEventPublisher();

  if (eventPublisher instanceof RabbitMQPublisher) {
    await eventPublisher.connect();
  } else {
    console.log('[loan-service] RabbitMQ não configurado. Eventos serão ignorados no deploy simplificado.');
  }

  // ── Repositories & Clients ─────────────────────────────────────────────────
  const loanRepository  = new PrismaLoanRepository(prisma);
  const catalogClient   = new CatalogHttpClient(
    process.env.CATALOG_SERVICE_URL ?? 'http://localhost:3002',
  );

  // ── Domain Services ────────────────────────────────────────────────────────
  const loanDomainService = new LoanDomainService();

  // ── Use Cases ──────────────────────────────────────────────────────────────
  const createLoanUseCase = new CreateLoanUseCase(
    loanRepository, catalogClient, eventPublisher, loanDomainService,
  );
  const returnBookUseCase = new ReturnBookUseCase(loanRepository, catalogClient, eventPublisher);
  const renewLoanUseCase  = new RenewLoanUseCase(loanRepository, eventPublisher);
  const listLoansUseCase  = new ListLoansUseCase(loanRepository);

  // ── Controller ─────────────────────────────────────────────────────────────
  const loanController = new LoanController(
    createLoanUseCase, returnBookUseCase, renewLoanUseCase, listLoansUseCase,
  );

  // ── HTTP Server ────────────────────────────────────────────────────────────
  const app = Fastify({ logger: true });

  await app.register(swagger, {
    openapi: {
      info: { title: 'LibraFlow — Loan Service', version: '1.0.0' },
      tags: [{ name: 'Loans', description: 'Loan management endpoints' }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/api-docs' });

  await loanRoutes(app, loanController);

  // Health check para Render
  app.get('/health', async () => ({ status: 'ok', service: 'loan-service' }));

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = async () => {
    console.log('[loan-service] Shutting down...');
    await app.close();
    if (eventPublisher instanceof RabbitMQPublisher) await eventPublisher.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT',  shutdown);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`[loan-service] Listening on port ${PORT}`);
}

bootstrap().catch(err => {
  console.error('[loan-service] Fatal error:', err);
  process.exit(1);
});
