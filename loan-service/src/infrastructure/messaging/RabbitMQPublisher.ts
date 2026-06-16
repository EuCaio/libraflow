// src/infrastructure/messaging/RabbitMQPublisher.ts

import * as amqplib from 'amqplib';
import { DomainEvent, IEventPublisher } from '../../application/interfaces/IEventPublisher';

export class RabbitMQPublisher implements IEventPublisher {
  private connection: any = null;
  private channel: any = null;
  private readonly exchange = 'libraflow';

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    this.connection = await amqplib.connect(this.url);
    if (this.connection) {
      this.channel = await this.connection.createChannel();
      if (this.channel) {
        await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
        console.log('[RabbitMQ] Connected and exchange asserted');
      }
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    const message = JSON.stringify({
      ...event,
      occurredAt: event.occurredAt ?? new Date(),
    });

    this.channel.publish(
      this.exchange,
      event.name,
      Buffer.from(message),
      { persistent: true, contentType: 'application/json' },
    );

    console.log(`[RabbitMQ] Published event: ${event.name}`);
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

// No-op publisher for testing
export class NoOpEventPublisher implements IEventPublisher {
  private events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  getPublishedEvents(): DomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
