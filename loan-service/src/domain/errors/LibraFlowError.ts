// src/domain/errors/LibraFlowError.ts

export abstract class LibraFlowError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BookNotAvailableError extends LibraFlowError {
  readonly code = 'BOOK_NOT_AVAILABLE';
  readonly httpStatus = 409;
  constructor(bookId: string) {
    super(`Book '${bookId}' is not available for loan`, { bookId });
  }
}

export class LoanNotFoundError extends LibraFlowError {
  readonly code = 'LOAN_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(loanId: string) {
    super(`Loan '${loanId}' not found`, { loanId });
  }
}

export class LoanAlreadyReturnedError extends LibraFlowError {
  readonly code = 'LOAN_ALREADY_RETURNED';
  readonly httpStatus = 422;
  constructor(loanId: string) {
    super(`Loan '${loanId}' has already been returned`, { loanId });
  }
}

export class MaxRenewalsExceededError extends LibraFlowError {
  readonly code = 'MAX_RENEWALS_EXCEEDED';
  readonly httpStatus = 422;
  constructor(loanId: string) {
    super(`Loan '${loanId}' has reached the maximum renewal limit of 2`, { loanId });
  }
}

export class OverdueLoanRenewalError extends LibraFlowError {
  readonly code = 'OVERDUE_LOAN_RENEWAL';
  readonly httpStatus = 422;
  constructor(loanId: string) {
    super(`Cannot renew overdue loan '${loanId}'. Please return the book first.`, { loanId });
  }
}

export class InvalidLoanError extends LibraFlowError {
  readonly code = 'INVALID_LOAN';
  readonly httpStatus = 400;
  constructor(reason: string) {
    super(`Invalid loan: ${reason}`);
  }
}

export class UserHasOverdueLoansError extends LibraFlowError {
  readonly code = 'USER_HAS_OVERDUE_LOANS';
  readonly httpStatus = 422;
  constructor(userId: string) {
    super(`User '${userId}' has overdue loans and cannot borrow new books`, { userId });
  }
}

export class LoanLimitExceededError extends LibraFlowError {
  readonly code = 'LOAN_LIMIT_EXCEEDED';
  readonly httpStatus = 422;
  constructor(userId: string, limit: number) {
    super(`User '${userId}' has reached the loan limit of ${limit}`, { userId, limit });
  }
}
