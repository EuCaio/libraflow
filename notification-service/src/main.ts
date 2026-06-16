// src/main.ts

import Fastify from 'fastify';
import {
  NotificationFactory,
  NotificationService,
  EmailChannel,
  RabbitMQConsumer,
} from './application/NotificationFactory';

async function bootstrap() {
  const PORT = parseInt(process.env.PORT ?? '3004');

  const emailChannel = new EmailChannel({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  });

  const notificationService = new NotificationService([emailChannel]);

  // ── RabbitMQ event handlers (Observer Pattern) ────────────────────────────
  const consumer = new RabbitMQConsumer(
    process.env.RABBITMQ_URL ?? 'amqp://localhost',
    notificationService,
  );

  consumer.on('loan.created', async (payload) => {
    const notification = NotificationFactory.createLoanConfirmation({
      bookTitle:      payload.bookTitle ?? 'Unknown Book',
      recipientEmail: payload.userEmail ?? payload.userId,
      dueDate:        payload.dueDate,
    });
    await notificationService.send(notification);
  });

  consumer.on('loan.returned', async (payload) => {
    if (payload.userEmail) {
      const notification = NotificationFactory.createReturnConfirmation({
        bookTitle:      payload.bookTitle ?? 'Unknown Book',
        recipientEmail: payload.userEmail,
      });
      await notificationService.send(notification);
    }
  });

  consumer.on('loan.overdue', async (payload) => {
    const notification = NotificationFactory.createOverdueAlert({
      bookTitle:      payload.bookTitle ?? 'Unknown Book',
      recipientEmail: payload.userEmail ?? payload.userId,
      dueDate:        payload.dueDate,
    });
    await notificationService.send(notification);
  });

  await consumer.start();

  // ── HTTP (health + manual trigger) ───────────────────────────────────────
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ status: 'ok', service: 'notification-service' }));

  // Manual send endpoint (for testing)
  app.post('/send-reminder', async (req, reply) => {
    try {
      const body = req.body as any;
      const n = NotificationFactory.createLoanReminder({
        bookTitle:      body.bookTitle,
        recipientEmail: body.email,
        dueDate:        body.dueDate,
      });
      await notificationService.send(n);
      reply.send({ ok: true, notificationId: n.getId() });
    } catch (err: any) {
      reply.code(500).send({ error: err.message });
    }
  });

  const shutdown = async () => { await app.close(); process.exit(0); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`[notification-service] Listening on port ${PORT}`);
}

bootstrap().catch(err => { console.error(err); process.exit(1); });
