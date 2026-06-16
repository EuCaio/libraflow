// src/presentation/controllers/LoanController.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateLoanUseCase } from '../../application/use-cases/CreateLoanUseCase';
import { ReturnBookUseCase } from '../../application/use-cases/ReturnBookUseCase';
import { RenewLoanUseCase } from '../../application/use-cases/RenewLoanUseCase';
import { ListLoansUseCase } from '../../application/use-cases/ListLoansUseCase';
import { LibraFlowError } from '../../domain/errors/LibraFlowError';

export class LoanController {
  constructor(
    private readonly createLoanUseCase: CreateLoanUseCase,
    private readonly returnBookUseCase: ReturnBookUseCase,
    private readonly renewLoanUseCase: RenewLoanUseCase,
    private readonly listLoansUseCase: ListLoansUseCase,
  ) {}

  async create(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = req.body as { userId: string; bookId: string; userType?: string };
      const result = await this.createLoanUseCase.execute(body);
      reply.code(201).send(result);
    } catch (err) {
      this.handleError(err, reply);
    }
  }

  async returnBook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const result = await this.returnBookUseCase.execute(id);
      reply.send(result);
    } catch (err) {
      this.handleError(err, reply);
    }
  }

  async renew(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const result = await this.renewLoanUseCase.execute(id);
      reply.send(result);
    } catch (err) {
      this.handleError(err, reply);
    }
  }

  async list(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = req.query as any;
      const result = await this.listLoansUseCase.execute({
        userId: query.userId,
        bookId: query.bookId,
        status: query.status,
        page: query.page ? parseInt(query.page) : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
      });
      reply.send(result);
    } catch (err) {
      this.handleError(err, reply);
    }
  }

  async getById(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const result = await this.listLoansUseCase.execute({ userId: undefined });
      const loan = result.data.find(l => l.id === id);
      if (!loan) return reply.code(404).send({ error: 'Loan not found' });
      reply.send(loan);
    } catch (err) {
      this.handleError(err, reply);
    }
  }

  private handleError(err: unknown, reply: FastifyReply): void {
    if (err instanceof LibraFlowError) {
      reply.code(err.httpStatus).send({
        error: err.code,
        message: err.message,
        context: err.context,
      });
      return;
    }
    console.error('[LoanController] Unexpected error:', err);
    reply.code(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
}
