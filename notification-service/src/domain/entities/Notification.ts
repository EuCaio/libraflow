// src/domain/entities/Notification.ts

export enum NotificationType {
  LOAN_CREATED   = 'LOAN_CREATED',
  LOAN_REMINDER  = 'LOAN_REMINDER',
  LOAN_OVERDUE   = 'LOAN_OVERDUE',
  LOAN_RETURNED  = 'LOAN_RETURNED',
  LOAN_RENEWED   = 'LOAN_RENEWED',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT    = 'SENT',
  FAILED  = 'FAILED',
}

export interface NotificationProps {
  id?: string;
  type: NotificationType;
  recipientEmail: string;
  subject: string;
  body: string;
  status?: NotificationStatus;
  sentAt?: Date | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export class Notification {
  private readonly id: string;
  readonly type: NotificationType;
  readonly recipientEmail: string;
  readonly subject: string;
  readonly body: string;
  private status: NotificationStatus;
  private sentAt: Date | null;
  private errorMessage: string | null;
  readonly metadata: Record<string, unknown>;

  constructor(props: NotificationProps) {
    this.id             = props.id ?? crypto.randomUUID();
    this.type           = props.type;
    this.recipientEmail = props.recipientEmail;
    this.subject        = props.subject;
    this.body           = props.body;
    this.status         = props.status ?? NotificationStatus.PENDING;
    this.sentAt         = props.sentAt ?? null;
    this.errorMessage   = props.errorMessage ?? null;
    this.metadata       = props.metadata ?? {};
  }

  markSent(): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
  }

  markFailed(error: string): void {
    this.status = NotificationStatus.FAILED;
    this.errorMessage = error;
  }

  getId(): string               { return this.id; }
  getStatus(): NotificationStatus { return this.status; }
  getSentAt(): Date | null      { return this.sentAt; }
  getErrorMessage(): string | null { return this.errorMessage; }
}
