// src/infrastructure/database/repositories/PrismaLoanRepository.ts

import { PrismaClient } from '@prisma/client';
import { Loan } from '../../../domain/entities/Loan';
import { LoanStatus } from '../../../domain/entities/LoanStatus';
import {
  ILoanRepository,
  LoanFilters,
  PaginatedResult,
} from '../../../domain/repositories/ILoanRepository';
import { LoanMapper } from '../../../application/dtos/LoanMapper';

export class PrismaLoanRepository implements ILoanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Loan | null> {
    const record = await this.prisma.loan.findUnique({ where: { id } });
    return record ? LoanMapper.toDomain(record) : null;
  }

  async findAll(filters: LoanFilters): Promise<PaginatedResult<Loan>> {
    const { userId, bookId, status, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (userId) where.userId = userId;
    if (bookId) where.bookId = bookId;
    if (status) where.status = status;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { borrowedAt: 'desc' },
      }),
      this.prisma.loan.count({ where }),
    ]);

    return {
      data: records.map(LoanMapper.toDomain),
      total,
      page,
      limit,
    };
  }

  async findActiveByUserId(userId: string): Promise<Loan[]> {
    const records = await this.prisma.loan.findMany({
      where: { userId, status: { in: ['ACTIVE', 'OVERDUE'] } },
    });
    return records.map(LoanMapper.toDomain);
  }

  async findOverdue(): Promise<Loan[]> {
    const now = new Date();
    const records = await this.prisma.loan.findMany({
      where: {
        status: 'ACTIVE',
        dueDate: { lt: now },
      },
    });
    return records.map(LoanMapper.toDomain);
  }

  async save(loan: Loan): Promise<void> {
    await this.prisma.loan.create({
      data: {
        id: loan.getId(),
        userId: loan.getUserId(),
        bookId: loan.getBookId(),
        borrowedAt: loan.getBorrowedAt(),
        dueDate: loan.getDueDate(),
        returnedAt: loan.getReturnedAt(),
        renewalCount: loan.getRenewalCount(),
        status: loan.getStatus() as any,
      },
    });
  }

  async update(loan: Loan): Promise<void> {
    await this.prisma.loan.update({
      where: { id: loan.getId() },
      data: {
        dueDate: loan.getDueDate(),
        returnedAt: loan.getReturnedAt(),
        renewalCount: loan.getRenewalCount(),
        status: loan.getStatus() as any,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.loan.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return this.prisma.loan.count();
  }
}
