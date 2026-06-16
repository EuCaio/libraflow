// src/domain/entities/Loan.ts

import { addDays, differenceInDays } from 'date-fns';
import { LoanStatus } from './LoanStatus';
import {
  InvalidLoanError,
  LoanAlreadyReturnedError,
  MaxRenewalsExceededError,
  OverdueLoanRenewalError,
} from '../errors/LibraFlowError';

export interface LoanProps {
  id?: string;
  userId: string;
  bookId: string;
  borrowedAt?: Date;
  dueDate?: Date;
  returnedAt?: Date | null;
  renewalCount?: number;
  status?: LoanStatus;
}

export class Loan {
  private readonly id: string;
  private readonly userId: string;
  private readonly bookId: string;
  private readonly borrowedAt: Date;
  private dueDate: Date;
  private returnedAt: Date | null;
  private renewalCount: number;
  private status: LoanStatus;

  static readonly MAX_RENEWALS = 2;
  static readonly LOAN_DURATION_DAYS = 14;

  constructor(props: LoanProps) {
    this.validate(props);
    this.id = props.id ?? crypto.randomUUID();
    this.userId = props.userId;
    this.bookId = props.bookId;
    this.borrowedAt = props.borrowedAt ?? new Date();
    this.dueDate = props.dueDate ?? this.calculateDueDate(this.borrowedAt);
    this.returnedAt = props.returnedAt ?? null;
    this.renewalCount = props.renewalCount ?? 0;
    this.status = props.status ?? LoanStatus.ACTIVE;
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  public returnBook(): void {
    if (this.status !== LoanStatus.ACTIVE && this.status !== LoanStatus.OVERDUE) {
      throw new LoanAlreadyReturnedError(this.id);
    }
    this.returnedAt = new Date();
    this.status = LoanStatus.RETURNED;
  }

  public renew(): void {
    if (this.renewalCount >= Loan.MAX_RENEWALS) {
      throw new MaxRenewalsExceededError(this.id);
    }
    if (this.isOverdue()) {
      throw new OverdueLoanRenewalError(this.id);
    }
    this.dueDate = this.calculateDueDate(new Date());
    this.renewalCount += 1;
  }

  public markAsOverdue(): void {
    if (this.status === LoanStatus.ACTIVE && this.isOverdue()) {
      this.status = LoanStatus.OVERDUE;
    }
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  public isOverdue(): boolean {
    return (
      (this.status === LoanStatus.ACTIVE || this.status === LoanStatus.OVERDUE) &&
      new Date() > this.dueDate
    );
  }

  public daysUntilDue(): number {
    return differenceInDays(this.dueDate, new Date());
  }

  public daysOverdue(): number {
    if (!this.isOverdue()) return 0;
    return differenceInDays(new Date(), this.dueDate);
  }

  // ── Getters (immutable) ───────────────────────────────────────────────────

  getId(): string { return this.id; }
  getUserId(): string { return this.userId; }
  getBookId(): string { return this.bookId; }
  getBorrowedAt(): Date { return this.borrowedAt; }
  getDueDate(): Date { return this.dueDate; }
  getReturnedAt(): Date | null { return this.returnedAt; }
  getRenewalCount(): number { return this.renewalCount; }
  getStatus(): LoanStatus { return this.status; }

  // ── Private ───────────────────────────────────────────────────────────────

  private calculateDueDate(from: Date): Date {
    return addDays(from, Loan.LOAN_DURATION_DAYS);
  }

  private validate(props: LoanProps): void {
    if (!props.userId?.trim()) {
      throw new InvalidLoanError('userId is required');
    }
    if (!props.bookId?.trim()) {
      throw new InvalidLoanError('bookId is required');
    }
  }
}
