// tests/unit/application/ReturnBookUseCase.spec.ts

import { ReturnBookUseCase } from '../../../src/application/use-cases/ReturnBookUseCase';
import { RenewLoanUseCase } from '../../../src/application/use-cases/RenewLoanUseCase';
import { InMemoryLoanRepository } from '../../../src/infrastructure/database/repositories/InMemoryLoanRepository';
import { MockCatalogClient } from '../../../src/infrastructure/http/CatalogHttpClient';
import { NoOpEventPublisher } from '../../../src/infrastructure/messaging/RabbitMQPublisher';
import { Loan } from '../../../src/domain/entities/Loan';
import { LoanStatus } from '../../../src/domain/entities/LoanStatus';
import {
  LoanNotFoundError,
  LoanAlreadyReturnedError,
  MaxRenewalsExceededError,
  OverdueLoanRenewalError,
} from '../../../src/domain/errors/LibraFlowError';
import { subDays } from 'date-fns';

// ── ReturnBookUseCase ─────────────────────────────────────────────────────────

describe('ReturnBookUseCase', () => {
  let sut: ReturnBookUseCase;
  let loanRepository: InMemoryLoanRepository;
  let catalogClient: MockCatalogClient;
  let eventPublisher: NoOpEventPublisher;

  beforeEach(() => {
    loanRepository = new InMemoryLoanRepository();
    catalogClient  = new MockCatalogClient();
    eventPublisher = new NoOpEventPublisher();
    sut = new ReturnBookUseCase(loanRepository, catalogClient, eventPublisher);
  });

  it('should return an active loan successfully', async () => {
    const loan = new Loan({ userId: 'user-001', bookId: 'book-001' });
    await loanRepository.save(loan);

    const result = await sut.execute(loan.getId());

    expect(result.status).toBe(LoanStatus.RETURNED);
    expect(result.returnedAt).not.toBeNull();
  });

  it('should publish loan.returned event', async () => {
    const loan = new Loan({ userId: 'user-001', bookId: 'book-001' });
    await loanRepository.save(loan);

    await sut.execute(loan.getId());

    const events = eventPublisher.getPublishedEvents();
    expect(events[0].name).toBe('loan.returned');
    expect(events[0].payload.loanId).toBe(loan.getId());
  });

  it('should throw LoanNotFoundError for non-existent loan', async () => {
    await expect(sut.execute('non-existent-id')).rejects.toThrow(LoanNotFoundError);
  });

  it('should throw LoanAlreadyReturnedError for already returned loan', async () => {
    const loan = new Loan({ userId: 'user-001', bookId: 'book-001' });
    loan.returnBook();
    await loanRepository.save(loan);

    await expect(sut.execute(loan.getId())).rejects.toThrow(LoanAlreadyReturnedError);
  });

  it('should flag wasOverdue=true in event when returning overdue loan', async () => {
    const loan = new Loan({
      userId: 'user-001',
      bookId: 'book-001',
      borrowedAt: subDays(new Date(), 20),
      dueDate: subDays(new Date(), 6),
    });
    await loanRepository.save(loan);

    await sut.execute(loan.getId());

    const events = eventPublisher.getPublishedEvents();
    expect(events[0].payload.wasOverdue).toBe(true);
    expect(events[0].payload.daysOverdue).toBeGreaterThan(0);
  });
});

// ── RenewLoanUseCase ─────────────────────────────────────────────────────────

describe('RenewLoanUseCase', () => {
  let sut: RenewLoanUseCase;
  let loanRepository: InMemoryLoanRepository;
  let eventPublisher: NoOpEventPublisher;

  beforeEach(() => {
    loanRepository = new InMemoryLoanRepository();
    eventPublisher = new NoOpEventPublisher();
    sut = new RenewLoanUseCase(loanRepository, eventPublisher);
  });

  it('should renew an active loan', async () => {
    const loan = new Loan({ userId: 'user-001', bookId: 'book-001' });
    await loanRepository.save(loan);

    const result = await sut.execute(loan.getId());

    expect(result.renewalCount).toBe(1);
    expect(new Date(result.dueDate) > new Date()).toBe(true);
  });

  it('should publish loan.renewed event', async () => {
    const loan = new Loan({ userId: 'user-001', bookId: 'book-001' });
    await loanRepository.save(loan);

    await sut.execute(loan.getId());

    const events = eventPublisher.getPublishedEvents();
    expect(events[0].name).toBe('loan.renewed');
    expect(events[0].payload.renewalCount).toBe(1);
  });

  it('should throw LoanNotFoundError for non-existent loan', async () => {
    await expect(sut.execute('ghost-id')).rejects.toThrow(LoanNotFoundError);
  });

  it('should throw MaxRenewalsExceededError after 2 renewals', async () => {
    const loan = new Loan({ userId: 'user-001', bookId: 'book-001' });
    loan.renew();
    loan.renew();
    await loanRepository.save(loan);

    await expect(sut.execute(loan.getId())).rejects.toThrow(MaxRenewalsExceededError);
  });

  it('should throw OverdueLoanRenewalError for overdue loan', async () => {
    const loan = new Loan({
      userId: 'user-001',
      bookId: 'book-001',
      borrowedAt: subDays(new Date(), 20),
      dueDate: subDays(new Date(), 6),
    });
    await loanRepository.save(loan);

    await expect(sut.execute(loan.getId())).rejects.toThrow(OverdueLoanRenewalError);
  });
});
