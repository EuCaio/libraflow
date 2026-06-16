// src/infrastructure/database/repositories/InMemoryLoanRepository.ts
// Used for unit tests — LSP: substitutable for PrismaLoanRepository

import { Loan } from '../../../domain/entities/Loan';
import {
  ILoanRepository,
  LoanFilters,
  PaginatedResult,
} from '../../../domain/repositories/ILoanRepository';

export class InMemoryLoanRepository implements ILoanRepository {
  private loans = new Map<string, Loan>();

  async findById(id: string): Promise<Loan | null> {
    return this.loans.get(id) ?? null;
  }

  async findAll(filters: LoanFilters): Promise<PaginatedResult<Loan>> {
    let data = Array.from(this.loans.values());
    if (filters.userId)  data = data.filter(l => l.getUserId() === filters.userId);
    if (filters.bookId)  data = data.filter(l => l.getBookId() === filters.bookId);
    if (filters.status)  data = data.filter(l => l.getStatus() === filters.status);
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;
    const start = (page - 1) * limit;
    return {
      data: data.slice(start, start + limit),
      total: data.length,
      page,
      limit,
    };
  }

  async findActiveByUserId(userId: string): Promise<Loan[]> {
    return Array.from(this.loans.values()).filter(
      l => l.getUserId() === userId &&
           (l.getStatus() === 'ACTIVE' || l.getStatus() === 'OVERDUE'),
    );
  }

  async findOverdue(): Promise<Loan[]> {
    return Array.from(this.loans.values()).filter(l => l.isOverdue());
  }

  async save(loan: Loan): Promise<void> {
    this.loans.set(loan.getId(), loan);
  }

  async update(loan: Loan): Promise<void> {
    this.loans.set(loan.getId(), loan);
  }

  async delete(id: string): Promise<void> {
    this.loans.delete(id);
  }

  async count(): Promise<number> {
    return this.loans.size;
  }

  // Test helpers
  clear(): void { this.loans.clear(); }
  all(): Loan[] { return Array.from(this.loans.values()); }
}
