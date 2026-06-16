// src/presentation/routes/loanRoutes.ts

import { FastifyInstance } from 'fastify';
import { LoanController } from '../controllers/LoanController';

export async function loanRoutes(
  fastify: FastifyInstance,
  controller: LoanController,
): Promise<void> {
  fastify.get('/health', async (_req, reply) => {
    reply.send({ status: 'ok', service: 'loan-service', timestamp: new Date() });
  });

  fastify.get('/loans', {
    schema: {
      tags: ['Loans'],
      summary: 'List loans with optional filters',
      querystring: {
        type: 'object',
        properties: {
          userId:  { type: 'string' },
          bookId:  { type: 'string' },
          status:  { type: 'string', enum: ['ACTIVE', 'RETURNED', 'OVERDUE'] },
          page:    { type: 'integer', minimum: 1, default: 1 },
          limit:   { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    handler: controller.list.bind(controller),
  });

  fastify.get('/loans/:id', {
    schema: {
      tags: ['Loans'],
      summary: 'Get loan by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: controller.getById.bind(controller),
  });

  fastify.post('/loans', {
    schema: {
      tags: ['Loans'],
      summary: 'Create a new loan',
      body: {
        type: 'object',
        required: ['userId', 'bookId'],
        properties: {
          userId:   { type: 'string', format: 'uuid' },
          bookId:   { type: 'string', format: 'uuid' },
          userType: { type: 'string', enum: ['STUDENT', 'PROFESSOR', 'RESEARCHER'] },
        },
      },
    },
    handler: controller.create.bind(controller),
  });

  fastify.patch('/loans/:id/return', {
    schema: {
      tags: ['Loans'],
      summary: 'Return a borrowed book',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: controller.returnBook.bind(controller),
  });

  fastify.patch('/loans/:id/renew', {
    schema: {
      tags: ['Loans'],
      summary: 'Renew an active loan',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: controller.renew.bind(controller),
  });
}
