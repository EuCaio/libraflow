// tests/unit/domain/LoanDomainService.spec.ts

import { subDays } from 'date-fns';
import { Loan } from '../../../src/domain/entities/Loan';
import { LoanStatus } from '../../../src/domain/entities/LoanStatus';
import { LoanDomainService, UserType } from '../../../src/domain/services/LoanDomainService';
import {
  LoanLimitExceededError,
  UserHasOverdueLoansError,
} from '../../../src/domain/errors/LibraFlowError';

const makeActiveLoan = () =>
  new Loan({ userId: 'user-001', bookId: 'book-001' });

const makeOverdueLoan = () =>
  new Loan({
    userId: 'user-001',
    bookId: 'book-002',
    borrowedAt: subDays(new Date(), 20),
    dueDate: subDays(new Date(), 6),
    status: LoanStatus.ACTIVE,
  });

describe('LoanDomainService', () => {
  let service: LoanDomainService;

  beforeEach(() => {
    service = new LoanDomainService();
  });

  describe('validateUserCanBorrow()', () => {
    it('should pass when user has no loans', () => {
      expect(() =>
        service.validateUserCanBorrow('user-001', UserType.STUDENT, []),
      ).not.toThrow();
    });

    it('should throw UserHasOverdueLoansError when user has overdue loans', () => {
      const loans = [makeOverdueLoan()];
      expect(() =>
        service.validateUserCanBorrow('user-001', UserType.STUDENT, loans),
      ).toThrow(UserHasOverdueLoansError);
    });

    it.each([
      [UserType.STUDENT,    3],
      [UserType.PROFESSOR,  10],
      [UserType.RESEARCHER, 15],
    ])(
      'should throw LoanLimitExceededError when %s reaches limit of %i',
      (userType, limit) => {
        const loans = Array.from({ length: limit }, () => makeActiveLoan());
        expect(() =>
          service.validateUserCanBorrow('user-001', userType, loans),
        ).toThrow(LoanLimitExceededError);
      },
    );

    it.each([
      [UserType.STUDENT,    2],
      [UserType.PROFESSOR,  9],
      [UserType.RESEARCHER, 14],
    ])(
      'should pass when %s has %i loans (below limit)',
      (userType, count) => {
        const loans = Array.from({ length: count }, () => makeActiveLoan());
        expect(() =>
          service.validateUserCanBorrow('user-001', userType, loans),
        ).not.toThrow();
      },
    );
  });

  describe('getLoanLimit()', () => {
    it('should return 3 for STUDENT', () => {
      expect(service.getLoanLimit(UserType.STUDENT)).toBe(3);
    });
    it('should return 10 for PROFESSOR', () => {
      expect(service.getLoanLimit(UserType.PROFESSOR)).toBe(10);
    });
    it('should return 15 for RESEARCHER', () => {
      expect(service.getLoanLimit(UserType.RESEARCHER)).toBe(15);
    });
  });
});
