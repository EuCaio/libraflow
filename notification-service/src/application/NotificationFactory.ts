// src/application/NotificationFactory.ts
// Design Pattern: Factory — centralizes notification creation

import { Notification, NotificationType } from '../domain/entities/Notification';
import { format, differenceInDays } from 'date-fns';

export class NotificationFactory {

  static createLoanConfirmation(payload: {
    bookTitle: string;
    recipientEmail: string;
    dueDate: string;
    userName?: string;
  }): Notification {
    const due = new Date(payload.dueDate);
    return new Notification({
      type: NotificationType.LOAN_CREATED,
      recipientEmail: payload.recipientEmail,
      subject: `Empréstimo confirmado: "${payload.bookTitle}"`,
      body: `Olá${payload.userName ? ` ${payload.userName}` : ''}!\n\nSeu empréstimo do livro "${payload.bookTitle}" foi confirmado.\n\nPrazo de devolução: ${format(due, 'dd/MM/yyyy')}\n\nBoa leitura!\n— LibraFlow`,
      metadata: { bookTitle: payload.bookTitle, dueDate: payload.dueDate },
    });
  }

  static createLoanReminder(payload: {
    bookTitle: string;
    recipientEmail: string;
    dueDate: string;
  }): Notification {
    const due = new Date(payload.dueDate);
    const daysLeft = differenceInDays(due, new Date());
    return new Notification({
      type: NotificationType.LOAN_REMINDER,
      recipientEmail: payload.recipientEmail,
      subject: `Lembrete: devolva "${payload.bookTitle}" em ${daysLeft} dias`,
      body: `Olá!\n\nEste é um lembrete de que o livro "${payload.bookTitle}" deve ser devolvido em ${daysLeft} dia(s) (${format(due, 'dd/MM/yyyy')}).\n\nVocê pode renovar o empréstimo pelo aplicativo, se necessário.\n\n— LibraFlow`,
      metadata: { bookTitle: payload.bookTitle, daysLeft, dueDate: payload.dueDate },
    });
  }

  static createOverdueAlert(payload: {
    bookTitle: string;
    recipientEmail: string;
    dueDate: string;
  }): Notification {
    const due = new Date(payload.dueDate);
    const daysOverdue = differenceInDays(new Date(), due);
    return new Notification({
      type: NotificationType.LOAN_OVERDUE,
      recipientEmail: payload.recipientEmail,
      subject: `⚠️ Livro em atraso: "${payload.bookTitle}" (${daysOverdue} dias)`,
      body: `Olá!\n\nO livro "${payload.bookTitle}" está em atraso há ${daysOverdue} dia(s).\n\nPor favor, devolva o livro o quanto antes para evitar bloqueio da sua conta.\n\n— LibraFlow`,
      metadata: { bookTitle: payload.bookTitle, daysOverdue, dueDate: payload.dueDate },
    });
  }

  static createReturnConfirmation(payload: {
    bookTitle: string;
    recipientEmail: string;
  }): Notification {
    return new Notification({
      type: NotificationType.LOAN_RETURNED,
      recipientEmail: payload.recipientEmail,
      subject: `Devolução confirmada: "${payload.bookTitle}"`,
      body: `Olá!\n\nA devolução do livro "${payload.bookTitle}" foi confirmada. Obrigado!\n\n— LibraFlow`,
      metadata: { bookTitle: payload.bookTitle },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/application/NotificationService.ts
// Design Pattern: Strategy — swappable email/push channels

export interface INotificationChannel {
  send(notification: Notification): Promise<void>;
  supports(type: string): boolean;
}

export class NotificationService {
  constructor(private readonly channels: INotificationChannel[]) {}

  async send(notification: Notification): Promise<void> {
    const available = this.channels.filter(c => c.supports('all'));

    if (available.length === 0) {
      console.warn('[NotificationService] No channel available for notification');
      return;
    }

    const results = await Promise.allSettled(
      available.map(c => c.send(notification)),
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length === results.length) {
      notification.markFailed('All channels failed');
      throw new Error('Failed to send notification through any channel');
    }

    notification.markSent();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/infrastructure/EmailChannel.ts

import nodemailer from 'nodemailer';

export class EmailChannel implements INotificationChannel {
  private transporter: nodemailer.Transporter;

  constructor(config: { host: string; port: number; user: string; pass: string }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: { user: config.user, pass: config.pass },
    });
  }

  supports(_type: string): boolean { return true; }

  async send(notification: Notification): Promise<void> {
    await this.transporter.sendMail({
      from: '"LibraFlow" <noreply@libraflow.app>',
      to: notification.recipientEmail,
      subject: notification.subject,
      text: notification.body,
    });
    console.log(`[EmailChannel] Sent to ${notification.recipientEmail}: ${notification.subject}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/infrastructure/RabbitMQConsumer.ts
// Design Pattern: Observer — consumes domain events from loan-service

import amqplib from 'amqplib';

export class RabbitMQConsumer {
  private handlers = new Map<string, (payload: any) => Promise<void>>();

  constructor(
    private readonly url: string,
    private readonly notificationService: NotificationService,
  ) {}

  on(eventName: string, handler: (payload: any) => Promise<void>): void {
    this.handlers.set(eventName, handler);
  }

  async start(): Promise<void> {
    const connection = await amqplib.connect(this.url);
    const channel    = await connection.createChannel();

    await channel.assertExchange('libraflow', 'topic', { durable: true });
    const { queue } = await channel.assertQueue('notification-service', { durable: true });

    for (const eventName of this.handlers.keys()) {
      await channel.bindQueue(queue, 'libraflow', eventName);
    }

    channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        const handler = this.handlers.get(event.name);
        if (handler) await handler(event.payload);
        channel.ack(msg);
      } catch (err) {
        console.error('[RabbitMQConsumer] Error processing message:', err);
        channel.nack(msg, false, false);
      }
    });

    console.log('[RabbitMQConsumer] Listening for events...');
  }
}
