// src/application/use-cases/ReturnBookUseCase.ts

import { ILoanRepository } from '../../domain/repositories/ILoanRepository';
import { LoanNotFoundError } from '../../domain/errors/LibraFlowError';
import { ICatalogClient } from '../interfaces/ICatalogClient';
import { IEventPublisher } from '../interfaces/IEventPublisher';
import { LoanResponseDTO } from '../dtos/LoanDTO';
import { LoanMapper } from '../dtos/LoanMapper';

export class ReturnBookUseCase {
  constructor(
    private readonly loanRepository: ILoanRepository,
    private readonly catalogClient: ICatalogClient,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(loanId: string): Promise<LoanResponseDTO> {
    const loan = await this.loanRepository.findById(loanId);
    if (!loan) throw new LoanNotFoundError(loanId);

    const wasOverdue = loan.isOverdue();
    const daysOverdue = loan.daysOverdue();

    loan.returnBook();
    await this.loanRepository.update(loan);

    await this.catalogClient.incrementAvailableCopies(loan.getBookId());

    await this.eventPublisher.publish({
      name: 'loan.returned',
      payload: {
        loanId: loan.getId(),
        userId: loan.getUserId(),
        bookId: loan.getBookId(),
        wasOverdue,
        daysOverdue,
        returnedAt: loan.getReturnedAt()?.toISOString(),
      },
    });

    return LoanMapper.toDTO(loan);
  }
}
