// tests/unit/application/CreateLoanUseCase.spec.ts

import { CreateLoanUseCase } from '../../../src/application/use-cases/CreateLoanUseCase';
import { LoanDomainService } from '../../../src/domain/services/LoanDomainService';
import { InMemoryLoanRepository } from '../../../src/infrastructure/database/repositories/InMemoryLoanRepository';
import { MockCatalogClient } from '../../../src/infrastructure/http/CatalogHttpClient';
import { NoOpEventPublisher } from '../../../src/infrastructure/messaging/RabbitMQPublisher';
import { LoanStatus } from '../../../src/domain/entities/LoanStatus';
import {
  BookNotAvailableError,
  UserHasOverdueLoansError,
  LoanLimitExceededError,
} from '../../../src/domain/errors/LibraFlowError';
import { subDays } from 'date-fns';
import { Loan } from '../../../src/domain/entities/Loan';

describe('CreateLoanUseCase', () => {
  let sut: CreateLoanUseCase;
  let loanRepository: InMemoryLoanRepository;
  let catalogClient: MockCatalogClient;
  let eventPublisher: NoOpEventPublisher;
  let loanDomainService: LoanDomainService;

  beforeEach(() => {
    loanRepository    = new InMemoryLoanRepository();
    catalogClient     = new MockCatalogClient();
    eventPublisher    = new NoOpEventPublisher();
    loanDomainService = new LoanDomainService();

    sut = new CreateLoanUseCase(
      loanRepository,
      catalogClient,
      eventPublisher,
      loanDomainService,
    );
  });

  it('should create a loan successfully when book is available', async () => {
    catalogClient.mockBookAvailable('book-123', 'Clean Code');

    const result = await sut.execute({ userId: 'user-456', bookId: 'book-123' });

    expect(result.id).toBeDefined();
    expect(result.status).toBe(LoanStatus.ACTIVE);
    expect(result.userId).toBe('user-456');
    expect(result.bookId).toBe('book-123');
    expect(result.renewalCount).toBe(0);
  });

  it('should persist the loan in the repository', async () => {
    catalogClient.mockBookAvailable('book-123');

    const result = await sut.execute({ userId: 'user-456', bookId: 'book-123' });

    const saved = await loanRepository.findById(result.id);
    expect(saved).not.toBeNull();
    expect(saved!.getUserId()).toBe('user-456');
  });

  it('should publish a loan.created event', async () => {
    catalogClient.mockBookAvailable('book-123');

    await sut.execute({ userId: 'user-456', bookId: 'book-123' });

    const events = eventPublisher.getPublishedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('loan.created');
    expect(events[0].payload.userId).toBe('user-456');
  });

  it('should throw BookNotAvailableError when book is unavailable', async () => {
    catalogClient.mockBookUnavailable('book-789');

    await expect(
      sut.execute({ userId: 'user-456', bookId: 'book-789' }),
    ).rejects.toThrow(BookNotAvailableError);

    expect(await loanRepository.count()).toBe(0);
    expect(eventPublisher.getPublishedEvents()).toHaveLength(0);
  });

  it('should throw BookNotAvailableError when book does not exist', async () => {
    // book not mocked = not found
    await expect(
      sut.execute({ userId: 'user-456', bookId: 'non-existent' }),
    ).rejects.toThrow(BookNotAvailableError);
  });

  it('should throw UserHasOverdueLoansError when user has overdue loans', async () => {
    catalogClient.mockBookAvailable('book-123');

    // Seed an overdue loan for the user
    const overdueLoan = new Loan({
      userId: 'user-456',
      bookId: 'book-999',
      borrowedAt: subDays(new Date(), 20),
      dueDate: subDays(new Date(), 6),
    });
    await loanRepository.save(overdueLoan);

    await expect(
      sut.execute({ userId: 'user-456', bookId: 'book-123' }),
    ).rejects.toThrow(UserHasOverdueLoansError);
  });

  it('should throw LoanLimitExceededError when student reaches limit of 3', async () => {
    catalogClient.mockBookAvailable('book-new');

    // Seed 3 active loans
    for (let i = 0; i < 3; i++) {
      catalogClient.mockBookAvailable(`book-00${i}`);
      await loanRepository.save(new Loan({ userId: 'user-456', bookId: `book-00${i}` }));
    }

    await expect(
      sut.execute({ userId: 'user-456', bookId: 'book-new', userType: 'STUDENT' }),
    ).rejects.toThrow(LoanLimitExceededError);
  });

  it('should allow PROFESSOR to have up to 10 loans', async () => {
    for (let i = 0; i < 9; i++) {
      await loanRepository.save(new Loan({ userId: 'prof-001', bookId: `book-${i}` }));
    }
    catalogClient.mockBookAvailable('book-10');

    const result = await sut.execute({
      userId: 'prof-001',
      bookId: 'book-10',
      userType: 'PROFESSOR',
    });

    expect(result.status).toBe(LoanStatus.ACTIVE);
  });
});
