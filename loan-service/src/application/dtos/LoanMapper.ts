// src/application/dtos/LoanMapper.ts

import { Loan } from '../../domain/entities/Loan';
import { LoanResponseDTO } from './LoanDTO';

export class LoanMapper {
  static toDTO(loan: Loan): LoanResponseDTO {
    return {
      id: loan.getId(),
      userId: loan.getUserId(),
      bookId: loan.getBookId(),
      borrowedAt: loan.getBorrowedAt().toISOString(),
      dueDate: loan.getDueDate().toISOString(),
      returnedAt: loan.getReturnedAt()?.toISOString() ?? null,
      renewalCount: loan.getRenewalCount(),
      status: loan.getStatus(),
      isOverdue: loan.isOverdue(),
      daysUntilDue: loan.daysUntilDue(),
    };
  }

  static toDomain(record: {
    id: string;
    userId: string;
    bookId: string;
    borrowedAt: Date;
    dueDate: Date;
    returnedAt: Date | null;
    renewalCount: number;
    status: string;
  }): Loan {
    const { LoanStatus } = require('../../domain/entities/LoanStatus');
    return new Loan({
      id: record.id,
      userId: record.userId,
      bookId: record.bookId,
      borrowedAt: record.borrowedAt,
      dueDate: record.dueDate,
      returnedAt: record.returnedAt,
      renewalCount: record.renewalCount,
      status: record.status as any,
    });
  }
}
