// src/application/use-cases/RenewLoanUseCase.ts

import { ILoanRepository } from '../../domain/repositories/ILoanRepository';
import { LoanNotFoundError } from '../../domain/errors/LibraFlowError';
import { IEventPublisher } from '../interfaces/IEventPublisher';
import { LoanResponseDTO } from '../dtos/LoanDTO';
import { LoanMapper } from '../dtos/LoanMapper';

export class RenewLoanUseCase {
  constructor(
    private readonly loanRepository: ILoanRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(loanId: string): Promise<LoanResponseDTO> {
    const loan = await this.loanRepository.findById(loanId);
    if (!loan) throw new LoanNotFoundError(loanId);

    loan.renew();
    await this.loanRepository.update(loan);

    await this.eventPublisher.publish({
      name: 'loan.renewed',
      payload: {
        loanId: loan.getId(),
        userId: loan.getUserId(),
        bookId: loan.getBookId(),
        newDueDate: loan.getDueDate().toISOString(),
        renewalCount: loan.getRenewalCount(),
      },
    });

    return LoanMapper.toDTO(loan);
  }
}
