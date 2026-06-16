// tests/bdd/step-definitions/loan.steps.ts

import { Given, When, Then, Before, World } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { subDays, addDays, differenceInDays } from 'date-fns';
import { Loan } from '../../../src/domain/entities/Loan';
import { LoanStatus } from '../../../src/domain/entities/LoanStatus';
import { InMemoryLoanRepository } from '../../../src/infrastructure/database/repositories/InMemoryLoanRepository';
import { MockCatalogClient } from '../../../src/infrastructure/http/CatalogHttpClient';
import { NoOpEventPublisher } from '../../../src/infrastructure/messaging/RabbitMQPublisher';
import { LoanDomainService } from '../../../src/domain/services/LoanDomainService';
import { CreateLoanUseCase } from '../../../src/application/use-cases/CreateLoanUseCase';
import { ReturnBookUseCase } from '../../../src/application/use-cases/ReturnBookUseCase';
import { RenewLoanUseCase } from '../../../src/application/use-cases/RenewLoanUseCase';
import { LoanResponseDTO } from '../../../src/application/dtos/LoanDTO';

// ── World state ───────────────────────────────────────────────────────────────

interface LoanWorld extends World {
  loanRepository: InMemoryLoanRepository;
  catalogClient: MockCatalogClient;
  eventPublisher: NoOpEventPublisher;
  createLoanUseCase: CreateLoanUseCase;
  returnBookUseCase: ReturnBookUseCase;
  renewLoanUseCase: RenewLoanUseCase;
  result: LoanResponseDTO | null;
  error: any;
  userProfiles: Record<string, string>;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

Before(function (this: LoanWorld) {
  this.loanRepository = new InMemoryLoanRepository();
  this.catalogClient  = new MockCatalogClient();
  this.eventPublisher = new NoOpEventPublisher();
  this.userProfiles   = {};
  this.result         = null;
  this.error          = null;

  const domainService = new LoanDomainService();

  this.createLoanUseCase = new CreateLoanUseCase(
    this.loanRepository, this.catalogClient, this.eventPublisher, domainService,
  );
  this.returnBookUseCase = new ReturnBookUseCase(
    this.loanRepository, this.catalogClient, this.eventPublisher,
  );
  this.renewLoanUseCase = new RenewLoanUseCase(
    this.loanRepository, this.eventPublisher,
  );
});

// ── Given ─────────────────────────────────────────────────────────────────────

Given(
  'que existe um usuário ativo com id {string} e perfil {string}',
  function (this: LoanWorld, userId: string, profile: string) {
    this.userProfiles[userId] = profile;
  },
);

Given(
  'que existe um livro disponível com id {string}',
  function (this: LoanWorld, bookId: string) {
    this.catalogClient.mockBookAvailable(bookId, `Book ${bookId}`);
  },
);

Given(
  'que o livro {string} está indisponível',
  function (this: LoanWorld, bookId: string) {
    this.catalogClient.mockBookUnavailable(bookId);
  },
);

Given(
  'que o usuário {string} não possui empréstimos ativos',
  function (_userId: string) { /* nothing to do */ },
);

Given(
  'que o usuário {string} possui {int} empréstimo em atraso',
  async function (this: LoanWorld, userId: string, _count: number) {
    const overdue = new Loan({
      userId,
      bookId: 'book-overdue-seed',
      borrowedAt: subDays(new Date(), 20),
      dueDate: subDays(new Date(), 6),
    });
    await this.loanRepository.save(overdue);
  },
);

Given(
  'que o usuário {string} tem perfil {string}',
  function (this: LoanWorld, userId: string, profile: string) {
    this.userProfiles[userId] = profile;
  },
);

Given(
  'que o usuário {string} possui {string} empréstimos ativos',
  async function (this: LoanWorld, userId: string, countStr: string) {
    const count = parseInt(countStr);
    for (let i = 0; i < count; i++) {
      await this.loanRepository.save(new Loan({ userId, bookId: `seed-book-${i}` }));
    }
  },
);

Given(
  'que existe um empréstimo ativo com id {string} para o usuário {string}',
  async function (this: LoanWorld, loanId: string, userId: string) {
    const loan = new Loan({ id: loanId, userId, bookId: 'book-fixture-001' });
    await this.loanRepository.save(loan);
  },
);

Given(
  'que o empréstimo {string} já foi devolvido',
  async function (this: LoanWorld, loanId: string) {
    const loan = await this.loanRepository.findById(loanId);
    assert.ok(loan, `Loan ${loanId} not found in repository`);
    loan.returnBook();
    await this.loanRepository.update(loan);
  },
);

Given(
  'que o empréstimo {string} foi renovado {int} vezes',
  async function (this: LoanWorld, loanId: string, times: number) {
    const loan = await this.loanRepository.findById(loanId);
    assert.ok(loan);
    for (let i = 0; i < times; i++) loan.renew();
    await this.loanRepository.update(loan);
  },
);

Given(
  'que o empréstimo {string} está em atraso',
  async function (this: LoanWorld, loanId: string) {
    const overdue = new Loan({
      id: loanId,
      userId: 'user-bdd-001',
      bookId: 'book-bdd-001',
      borrowedAt: subDays(new Date(), 20),
      dueDate: subDays(new Date(), 6),
    });
    await this.loanRepository.save(overdue);
  },
);

// ── When ──────────────────────────────────────────────────────────────────────

When(
  'ele solicita empréstimo do livro {string}',
  async function (this: LoanWorld, bookId: string) {
    const userId = 'user-bdd-001';
    const userType = this.userProfiles[userId] ?? 'STUDENT';
    try {
      this.result = await this.createLoanUseCase.execute({ userId, bookId, userType });
    } catch (err) {
      this.error = err;
    }
  },
);

When(
  'o usuário solicita devolução do empréstimo {string}',
  async function (this: LoanWorld, loanId: string) {
    try {
      this.result = await this.returnBookUseCase.execute(loanId);
    } catch (err) {
      this.error = err;
    }
  },
);

When(
  'o usuário solicita renovação do empréstimo {string}',
  async function (this: LoanWorld, loanId: string) {
    try {
      this.result = await this.renewLoanUseCase.execute(loanId);
    } catch (err) {
      this.error = err;
    }
  },
);

// ── Then ──────────────────────────────────────────────────────────────────────

Then(
  'o empréstimo deve ser criado com status {string}',
  function (this: LoanWorld, status: string) {
    assert.ok(this.result, 'Expected a result but got none');
    assert.equal(this.result.status, status);
  },
);

Then(
  'o prazo de devolução deve ser de 14 dias a partir de hoje',
  function (this: LoanWorld) {
    assert.ok(this.result);
    const due = new Date(this.result.dueDate);
    const diff = differenceInDays(due, new Date());
    assert.ok(diff >= 13 && diff <= 14, `Expected ~14 days, got ${diff}`);
  },
);

Then(
  'o evento {string} deve ter sido publicado',
  function (this: LoanWorld, eventName: string) {
    const events = this.eventPublisher.getPublishedEvents();
    const found = events.some(e => e.name === eventName);
    assert.ok(found, `Event '${eventName}' was not published. Got: ${events.map(e => e.name).join(', ')}`);
  },
);

Then(
  'deve ocorrer um erro com código {string}',
  function (this: LoanWorld, code: string) {
    assert.ok(this.error, `Expected error with code '${code}' but no error was thrown`);
    assert.equal(this.error.code, code, `Expected error code '${code}' but got '${this.error.code}'`);
  },
);

Then(
  'nenhum empréstimo deve ter sido criado',
  async function (this: LoanWorld) {
    const count = await this.loanRepository.count();
    assert.equal(count, 0);
  },
);

Then(
  'o resultado deve ser {string}',
  function (this: LoanWorld, expected: string) {
    if (expected === 'SUCESSO') {
      assert.ok(this.result, 'Expected success but got error');
      assert.equal(this.error, null);
    } else {
      assert.ok(this.error, `Expected error '${expected}' but got success`);
      assert.equal(this.error.code, expected);
    }
  },
);

Then(
  'o empréstimo deve ter status {string}',
  function (this: LoanWorld, status: string) {
    assert.ok(this.result);
    assert.equal(this.result.status, status);
  },
);

Then(
  'a data de devolução deve estar preenchida',
  function (this: LoanWorld) {
    assert.ok(this.result);
    assert.ok(this.result.returnedAt, 'returnedAt should be set');
  },
);

Then(
  'o contador de renovações deve ser {int}',
  function (this: LoanWorld, count: number) {
    assert.ok(this.result);
    assert.equal(this.result.renewalCount, count);
  },
);

Then(
  'o prazo deve ser estendido por 14 dias',
  function (this: LoanWorld) {
    assert.ok(this.result);
    const due = new Date(this.result.dueDate);
    const diff = differenceInDays(due, new Date());
    assert.ok(diff >= 13 && diff <= 14, `Expected ~14 days, got ${diff}`);
  },
);
