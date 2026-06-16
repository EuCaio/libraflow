// src/application/use-cases/CreateLoanUseCase.ts

import { Loan } from '../../domain/entities/Loan';
import { LoanDomainService, UserType } from '../../domain/services/LoanDomainService';
import { ILoanRepository } from '../../domain/repositories/ILoanRepository';
import { BookNotAvailableError } from '../../domain/errors/LibraFlowError';
import { ICatalogClient } from '../interfaces/ICatalogClient';
import { IEventPublisher } from '../interfaces/IEventPublisher';
import { CreateLoanDTO, LoanResponseDTO } from '../dtos/LoanDTO';
import { LoanMapper } from '../dtos/LoanMapper';

export class CreateLoanUseCase {
  constructor(
    private readonly loanRepository: ILoanRepository,
    private readonly catalogClient: ICatalogClient,
    private readonly eventPublisher: IEventPublisher,
    private readonly loanDomainService: LoanDomainService,
  ) {}

  async execute(dto: CreateLoanDTO): Promise<LoanResponseDTO> {
    // 1. Verify book exists and is available
    const book = await this.catalogClient.findBookById(dto.bookId);
    if (!book || !book.isAvailable) {
      throw new BookNotAvailableError(dto.bookId);
    }

    // 2. Get user's active loans and validate business rules
    const activeLoans = await this.loanRepository.findActiveByUserId(dto.userId);
    const userType = (dto.userType as UserType) ?? UserType.STUDENT;
    this.loanDomainService.validateUserCanBorrow(dto.userId, userType, activeLoans);

    // 3. Create loan entity
    const loan = new Loan({ userId: dto.userId, bookId: dto.bookId });

    // 4. Persist loan
    await this.loanRepository.save(loan);

    // 5. Decrement available copies in catalog
    await this.catalogClient.decrementAvailableCopies(dto.bookId);

    // 6. Publish domain event (async — notification-service will handle it)
    await this.eventPublisher.publish({
      name: 'loan.created',
      payload: {
        loanId: loan.getId(),
        userId: loan.getUserId(),
        bookId: loan.getBookId(),
        bookTitle: book.title,
        dueDate: loan.getDueDate().toISOString(),
      },
    });

    return LoanMapper.toDTO(loan);
  }
}
