// src/application/dtos/LoanDTO.ts

import { LoanStatus } from '../../domain/entities/LoanStatus';

export interface CreateLoanDTO {
  userId: string;
  bookId: string;
  userType?: string;
}

export interface LoanResponseDTO {
  id: string;
  userId: string;
  bookId: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  renewalCount: number;
  status: LoanStatus;
  isOverdue: boolean;
  daysUntilDue: number;
}

export interface ReturnBookDTO {
  loanId: string;
}

export interface RenewLoanDTO {
  loanId: string;
}

export interface ListLoansDTO {
  userId?: string;
  bookId?: string;
  status?: string;
  page?: number;
  limit?: number;
}
