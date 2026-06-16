// src/main.ts

import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import {
  GenerateReportUseCase,
  ReportQuery,
  ReportDataPoint,
} from './application/ReportQueryBuilder';
import {
  ReportQueryBuilder,
  Metric,
  Dimension,
} from './application/ReportQueryBuilder';
import { startOfMonth, endOfMonth } from 'date-fns';

async function bootstrap() {
  const PORT = parseInt(process.env.PORT ?? '3005');
  const prisma = new PrismaClient();
  await prisma.$connect();

  // Simple report repository using raw Prisma queries
  const reportRepository = {
    async getLoansByPeriod(query: ReportQuery): Promise<ReportDataPoint[]> {
      // In a real implementation this would query the loan database
      // For demo purposes, we return mock data
      const points: ReportDataPoint[] = [];
      const current = new Date(query.startDate);
      while (current <= query.endDate) {
        points.push({
          period: current.toISOString().split('T')[0],
          loans:    Math.floor(Math.random() * 20),
          returns:  Math.floor(Math.random() * 15),
          overdue:  Math.floor(Math.random() * 5),
          renewals: Math.floor(Math.random() * 8),
        });
        current.setDate(current.getDate() + 7); // week by week
      }
      return points;
    },
  };

  const generateReport = new GenerateReportUseCase(reportRepository);

  const app = Fastify({ logger: true });
  await app.register(swagger, { openapi: { info: { title: 'LibraFlow — Report Service', version: '1.0.0' } } });
  await app.register(swaggerUi, { routePrefix: '/api-docs' });

  app.get('/health', async () => ({ status: 'ok', service: 'report-service' }));

  app.get('/reports/loans', async (req, reply) => {
    try {
      const q = req.query as any;
      const query = new ReportQueryBuilder()
        .forPeriod(
          q.startDate ? new Date(q.startDate) : startOfMonth(new Date()),
          q.endDate   ? new Date(q.endDate)   : endOfMonth(new Date()),
        )
        .withMetrics(Metric.LOANS, Metric.RETURNS, Metric.OVERDUE, Metric.RENEWALS)
        .groupBy(q.groupBy ?? Dimension.WEEK)
        .build();

      const result = await generateReport.execute(query);
      reply.send(result);
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  const shutdown = async () => { await app.close(); await prisma.$disconnect(); process.exit(0); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`[report-service] Listening on port ${PORT}`);
}

bootstrap().catch(err => { console.error(err); process.exit(1); });
