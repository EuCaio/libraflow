// src/main.ts

import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import { RegisterUserUseCase } from './application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from './application/use-cases/LoginUseCase';

async function bootstrap( ) {
  const PORT = parseInt(process.env.PORT ?? '3001');
  const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret';

  const prisma = new PrismaClient();
  await prisma.$connect();

  // Simple Prisma user repository inline
  const userRepository = {
    async findById(id: string) {
      const r = await prisma.user.findUnique({ where: { id } });
      if (!r) return null;
      const { User } = await import('./domain/entities/User');
      return new User({ id: r.id, name: r.name, email: r.email, passwordHash: r.passwordHash, userType: r.userType as any, status: r.status as any });
    },
    async findByEmail(email: string) {
      const r = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!r) return null;
      const { User } = await import('./domain/entities/User');
      return new User({ id: r.id, name: r.name, email: r.email, passwordHash: r.passwordHash, userType: r.userType as any, status: r.status as any });
    },
    async save(user: any) {
      await prisma.user.create({ data: { id: user.getId(), name: user.getName(), email: user.getEmail(), passwordHash: user.getPasswordHash(), userType: user.getUserType(), status: user.getStatus() } });
    },
    async update(user: any) {
      await prisma.user.update({ where: { id: user.getId() }, data: { name: user.getName(), status: user.getStatus() } });
    },
  };

  const registerUseCase = new RegisterUserUseCase(userRepository as any);
  const loginUseCase    = new LoginUseCase(userRepository as any, JWT_SECRET);

  const app = Fastify({ logger: true });
  await app.register(swagger, { openapi: { info: { title: 'LibraFlow — Auth Service', version: '1.0.0' } } });
  await app.register(swaggerUi, { routePrefix: '/api-docs' });

  app.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));

  app.post('/register', async (req, reply) => {
    try {
      const result = await registerUseCase.execute(req.body as any);
      reply.code(201).send(result);
    } catch (err: any) {
      reply.code(err.httpStatus ?? 500 ).send({ error: err.code, message: err.message });
    }
  });

  app.post('/login', async (req, reply) => {
    try {
      const result = await loginUseCase.execute(req.body as any);
      reply.send(result);
    } catch (err: any) {
      reply.code(err.httpStatus ?? 500 ).send({ error: err.code, message: err.message });
    }
  });

  const shutdown = async () => { await app.close(); await prisma.$disconnect(); process.exit(0); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`[auth-service] Listening on port ${PORT}`);
}

bootstrap().catch(err => { console.error(err); process.exit(1); });
