// src/main.ts

import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import {
  CreateBookUseCase,
  SearchBooksUseCase,
  AdjustCopiesUseCase,
} from './application/use-cases/BookUseCases';

async function bootstrap() {
  const PORT = parseInt(process.env.PORT ?? '3002');
  const prisma = new PrismaClient();
  await prisma.$connect();

  // Simple Prisma repository (production)
  const bookRepository = {
    async findById(id: string) {
      const r = await prisma.book.findUnique({ where: { id } });
      if (!r) return null;
      const { Book } = await import('./domain/entities/Book');
      return new Book({ id: r.id, title: r.title, isbn: r.isbn, authors: r.authors as string[], categoryId: r.categoryId, totalCopies: r.totalCopies, availableCopies: r.availableCopies, publishedYear: r.publishedYear ?? undefined, description: r.description ?? undefined });
    },
    async findByIsbn(isbn: string) {
      const r = await prisma.book.findUnique({ where: { isbn } });
      if (!r) return null;
      const { Book } = await import('./domain/entities/Book');
      return new Book({ id: r.id, title: r.title, isbn: r.isbn, authors: r.authors as string[], categoryId: r.categoryId, totalCopies: r.totalCopies, availableCopies: r.availableCopies });
    },
    async search(query: any) {
      const where: any = {};
      if (query.term) where.title = { contains: query.term, mode: 'insensitive' };
      if (query.categoryId) where.categoryId = query.categoryId;
      const [records, total] = await prisma.$transaction([
        prisma.book.findMany({ where, skip: ((query.page??1)-1)*(query.limit??20), take: query.limit??20 }),
        prisma.book.count({ where }),
      ]);
      const { Book } = await import('./domain/entities/Book');
      return { data: records.map((r: any) => new Book({ id: r.id, title: r.title, isbn: r.isbn, authors: r.authors as string[], categoryId: r.categoryId, totalCopies: r.totalCopies, availableCopies: r.availableCopies })), total, page: query.page??1, limit: query.limit??20 };
    },
    async save(book: any) {
      await prisma.book.create({ data: { id: book.getId(), title: book.getTitle(), isbn: book.getIsbn(), authors: book.getAuthors(), categoryId: book.getCategoryId(), totalCopies: book.getTotalCopies(), availableCopies: book.getAvailableCopies() } });
    },
    async update(book: any) {
      await prisma.book.update({ where: { id: book.getId() }, data: { availableCopies: book.getAvailableCopies() } });
    },
    async delete(id: string) { await prisma.book.delete({ where: { id } }); },
  };

  const createBook   = new CreateBookUseCase(bookRepository as any);
  const searchBooks  = new SearchBooksUseCase(bookRepository as any);
  const adjustCopies = new AdjustCopiesUseCase(bookRepository as any);

  const app = Fastify({ logger: true });
  await app.register(swagger, { openapi: { info: { title: 'LibraFlow — Catalog Service', version: '1.0.0' } } });
  await app.register(swaggerUi, { routePrefix: '/api-docs' });

  app.get('/health', async () => ({ status: 'ok', service: 'catalog-service' }));

  app.get('/books', async (req, reply) => {
    try {
      const q = req.query as any;
      reply.send(await searchBooks.execute({ term: q.term, categoryId: q.categoryId, page: q.page ? +q.page : 1, limit: q.limit ? +q.limit : 20 }));
    } catch (e: any) { reply.code(e.httpStatus ?? 500).send({ error: e.code, message: e.message }); }
  });

  app.get('/books/:id', async (req, reply) => {
    const { id } = req.params as any;
    try {
      const b = await bookRepository.findById(id);
      if (!b) return reply.code(404).send({ error: 'BOOK_NOT_FOUND' });
      reply.send({ id: b.getId(), title: b.getTitle(), isbn: b.getIsbn(), authors: b.getAuthors(), availableCopies: b.getAvailableCopies(), isAvailable: b.isAvailable() });
    } catch (e: any) { reply.code(500).send({ error: e.message }); }
  });

  app.post('/books', async (req, reply) => {
    try { reply.code(201).send(await createBook.execute(req.body as any)); }
    catch (e: any) { reply.code(e.httpStatus ?? 500).send({ error: e.code, message: e.message }); }
  });

  app.patch('/books/:id/decrement-copies', async (req, reply) => {
    try { await adjustCopies.decrement((req.params as any).id); reply.send({ ok: true }); }
    catch (e: any) { reply.code(e.httpStatus ?? 500).send({ error: e.code, message: e.message }); }
  });

  app.patch('/books/:id/increment-copies', async (req, reply) => {
    try { await adjustCopies.increment((req.params as any).id); reply.send({ ok: true }); }
    catch (e: any) { reply.code(e.httpStatus ?? 500).send({ error: e.code, message: e.message }); }
  });

  const shutdown = async () => { await app.close(); await prisma.$disconnect(); process.exit(0); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`[catalog-service] Listening on port ${PORT}`);
}

bootstrap().catch(err => { console.error(err); process.exit(1); });
