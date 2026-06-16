// src/application/interfaces/IEventPublisher.ts

export interface DomainEvent {
  name: string;
  payload: Record<string, unknown>;
  occurredAt?: Date;
}

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
