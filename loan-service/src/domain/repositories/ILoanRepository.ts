// src/domain/repositories/ILoanRepository.ts

import { Loan } from '../entities/Loan';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface LoanFilters {
  userId?: string;
  bookId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ILoanRepository {
  findById(id: string): Promise<Loan | null>;
  findAll(filters: LoanFilters): Promise<PaginatedResult<Loan>>;
  findActiveByUserId(userId: string): Promise<Loan[]>;
  findOverdue(): Promise<Loan[]>;
  save(loan: Loan): Promise<void>;
  update(loan: Loan): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
