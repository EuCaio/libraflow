// src/domain/services/LoanDomainService.ts

import { Loan } from '../entities/Loan';
import { LoanLimitExceededError, UserHasOverdueLoansError } from '../errors/LibraFlowError';

export enum UserType {
  STUDENT = 'STUDENT',
  PROFESSOR = 'PROFESSOR',
  RESEARCHER = 'RESEARCHER',
}

const LOAN_LIMITS: Record<UserType, number> = {
  [UserType.STUDENT]:    3,
  [UserType.PROFESSOR]:  10,
  [UserType.RESEARCHER]: 15,
};

export class LoanDomainService {

  validateUserCanBorrow(
    userId: string,
    userType: UserType,
    activeLoans: Loan[],
  ): void {
    this.ensureNoOverdueLoans(userId, activeLoans);
    this.ensureLoanLimitNotExceeded(userId, userType, activeLoans);
  }

  private ensureNoOverdueLoans(userId: string, loans: Loan[]): void {
    const hasOverdue = loans.some(loan => loan.isOverdue());
    if (hasOverdue) {
      throw new UserHasOverdueLoansError(userId);
    }
  }

  private ensureLoanLimitNotExceeded(
    userId: string,
    userType: UserType,
    loans: Loan[],
  ): void {
    const limit = this.getLoanLimitForUserType(userType);
    if (loans.length >= limit) {
      throw new LoanLimitExceededError(userId, limit);
    }
  }

  private getLoanLimitForUserType(userType: UserType): number {
    return LOAN_LIMITS[userType] ?? LOAN_LIMITS[UserType.STUDENT];
  }

  getLoanLimit(userType: UserType): number {
    return this.getLoanLimitForUserType(userType);
  }
}
