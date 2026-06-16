// src/application/use-cases/ListLoansUseCase.ts

import { ILoanRepository, PaginatedResult } from '../../domain/repositories/ILoanRepository';
import { ListLoansDTO, LoanResponseDTO } from '../dtos/LoanDTO';
import { LoanMapper } from '../dtos/LoanMapper';

export class ListLoansUseCase {
  constructor(private readonly loanRepository: ILoanRepository) {}

  async execute(dto: ListLoansDTO): Promise<PaginatedResult<LoanResponseDTO>> {
    const result = await this.loanRepository.findAll({
      userId: dto.userId,
      bookId: dto.bookId,
      status: dto.status,
      page: dto.page ?? 1,
      limit: Math.min(dto.limit ?? 20, 100),
    });

    return {
      ...result,
      data: result.data.map(LoanMapper.toDTO),
    };
  }
}
