// tests/unit/domain/Loan.spec.ts

import { addDays, subDays } from 'date-fns';
import { Loan } from '../../../src/domain/entities/Loan';
import { LoanStatus } from '../../../src/domain/entities/LoanStatus';
import {
  InvalidLoanError,
  LoanAlreadyReturnedError,
  MaxRenewalsExceededError,
  OverdueLoanRenewalError,
} from '../../../src/domain/errors/LibraFlowError';

// ── Factories ─────────────────────────────────────────────────────────────────

const makeActiveLoan = (overrides = {}) =>
  new Loan({ userId: 'user-001', bookId: 'book-001', ...overrides });

const makeOverdueLoan = () =>
  new Loan({
    userId: 'user-001',
    bookId: 'book-001',
    borrowedAt: subDays(new Date(), 20),
    dueDate: subDays(new Date(), 6),
    status: LoanStatus.ACTIVE,
  });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Loan — Domain Entity', () => {

  describe('constructor', () => {
    it('should create an active loan with default values', () => {
      const loan = makeActiveLoan();

      expect(loan.getId()).toBeDefined();
      expect(loan.getUserId()).toBe('user-001');
      expect(loan.getBookId()).toBe('book-001');
      expect(loan.getStatus()).toBe(LoanStatus.ACTIVE);
      expect(loan.getRenewalCount()).toBe(0);
      expect(loan.getReturnedAt()).toBeNull();
    });

    it('should set due date 14 days from borrowedAt', () => {
      const borrowedAt = new Date('2024-01-01');
      const loan = makeActiveLoan({ borrowedAt });

      const expectedDue = addDays(borrowedAt, 14);
      expect(loan.getDueDate().toDateString()).toBe(expectedDue.toDateString());
    });

    it('should throw InvalidLoanError when userId is empty', () => {
      expect(() => makeActiveLoan({ userId: '' })).toThrow(InvalidLoanError);
    });

    it('should throw InvalidLoanError when bookId is empty', () => {
      expect(() => makeActiveLoan({ bookId: '' })).toThrow(InvalidLoanError);
    });

    it('should generate unique IDs for each loan', () => {
      const loan1 = makeActiveLoan();
      const loan2 = makeActiveLoan();
      expect(loan1.getId()).not.toBe(loan2.getId());
    });
  });

  describe('returnBook()', () => {
    it('should set status to RETURNED and record returnedAt', () => {
      const loan = makeActiveLoan();
      loan.returnBook();

      expect(loan.getStatus()).toBe(LoanStatus.RETURNED);
      expect(loan.getReturnedAt()).toBeInstanceOf(Date);
    });

    it('should allow returning an overdue loan', () => {
      const loan = makeOverdueLoan();
      loan.returnBook();

      expect(loan.getStatus()).toBe(LoanStatus.RETURNED);
    });

    it('should throw LoanAlreadyReturnedError when returning twice', () => {
      const loan = makeActiveLoan();
      loan.returnBook();

      expect(() => loan.returnBook()).toThrow(LoanAlreadyReturnedError);
    });

    it('should throw error with the correct loanId in context', () => {
      const loan = makeActiveLoan();
      loan.returnBook();

      try {
        loan.returnBook();
        fail('Expected error was not thrown');
      } catch (err: any) {
        expect(err.context?.loanId).toBe(loan.getId());
      }
    });
  });

  describe('renew()', () => {
    it('should extend due date by 14 days from today', () => {
      const loan = makeActiveLoan();
      const before = new Date();
      loan.renew();

      const expectedDue = addDays(before, 14);
      const diff = Math.abs(
        loan.getDueDate().getTime() - expectedDue.getTime(),
      );
      expect(diff).toBeLessThan(5000); // within 5 seconds
    });

    it('should increment renewalCount after each renewal', () => {
      const loan = makeActiveLoan();
      loan.renew();
      expect(loan.getRenewalCount()).toBe(1);
      loan.renew();
      expect(loan.getRenewalCount()).toBe(2);
    });

    it('should throw MaxRenewalsExceededError after 2 renewals', () => {
      const loan = makeActiveLoan();
      loan.renew();
      loan.renew();

      expect(() => loan.renew()).toThrow(MaxRenewalsExceededError);
    });

    it('should throw OverdueLoanRenewalError for overdue loan', () => {
      const loan = makeOverdueLoan();

      expect(() => loan.renew()).toThrow(OverdueLoanRenewalError);
    });
  });

  describe('isOverdue()', () => {
    it('should return false for active loan within due date', () => {
      const loan = makeActiveLoan();
      expect(loan.isOverdue()).toBe(false);
    });

    it('should return true for loan past due date', () => {
      const loan = makeOverdueLoan();
      expect(loan.isOverdue()).toBe(true);
    });

    it('should return false for returned loan even if past due date', () => {
      const loan = makeOverdueLoan();
      loan.returnBook();
      expect(loan.isOverdue()).toBe(false);
    });
  });

  describe('daysUntilDue()', () => {
    it('should return positive days for active loan', () => {
      const loan = makeActiveLoan();
      expect(loan.daysUntilDue()).toBeGreaterThan(0);
    });

    it('should return negative days for overdue loan', () => {
      const loan = makeOverdueLoan();
      expect(loan.daysUntilDue()).toBeLessThan(0);
    });
  });

  describe('daysOverdue()', () => {
    it('should return 0 for non-overdue loan', () => {
      const loan = makeActiveLoan();
      expect(loan.daysOverdue()).toBe(0);
    });

    it('should return positive number of days overdue', () => {
      const loan = makeOverdueLoan();
      expect(loan.daysOverdue()).toBeGreaterThan(0);
    });
  });
});
