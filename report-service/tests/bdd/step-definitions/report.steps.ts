// tests/bdd/step-definitions/report.steps.ts

import { Given, When, Then, Before, World } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  ReportQueryBuilder,
  GenerateReportUseCase,
  Metric,
  Dimension,
  ReportResult,
} from '../../../src/application/ReportQueryBuilder';

interface ReportWorld extends World {
  useCase: GenerateReportUseCase;
  result: ReportResult | null;
  error: any;
}

Before(function (this: ReportWorld) {
  const mockRepo = {
    getLoansByPeriod: async () => [
      { period: '2024-W01', loans: 10, returns: 8,  overdue: 2, renewals: 3 },
      { period: '2024-W02', loans: 15, returns: 12, overdue: 3, renewals: 5 },
      { period: '2024-W03', loans: 8,  returns: 7,  overdue: 1, renewals: 2 },
    ],
  };
  this.useCase = new GenerateReportUseCase(mockRepo as any);
  this.result  = null;
  this.error   = null;
});

Given('que existem dados de empréstimos nos últimos 30 dias', function () { /* mocked in Before */ });

When('eu gero um relatório do mês atual com todas as métricas', async function (this: ReportWorld) {
  const query = new ReportQueryBuilder()
    .forPeriod(startOfMonth(new Date()), endOfMonth(new Date()))
    .withMetrics(Metric.LOANS, Metric.RETURNS, Metric.OVERDUE, Metric.RENEWALS)
    .groupBy(Dimension.WEEK)
    .build();
  this.result = await this.useCase.execute(query);
});

When('eu tento gerar um relatório sem especificar o período', function (this: ReportWorld) {
  try {
    new ReportQueryBuilder().withMetrics(Metric.LOANS).build();
  } catch (err) { this.error = err; }
});

When('eu tento gerar um relatório com data de início após a data de fim', function (this: ReportWorld) {
  try {
    new ReportQueryBuilder().forPeriod(new Date(), subDays(new Date(), 5)).build();
  } catch (err) { this.error = err; }
});

Then('o relatório deve conter dados agrupados por semana', function (this: ReportWorld) {
  assert.ok(this.result);
  assert.ok(this.result.data.length > 0);
  assert.equal(this.result.query.groupBy, Dimension.WEEK);
});

Then('o relatório deve incluir o total de empréstimos', function (this: ReportWorld) {
  assert.ok(this.result);
  assert.ok(typeof this.result.summary.totalLoans === 'number');
  assert.ok(this.result.summary.totalLoans > 0);
});

Then('o relatório deve incluir a taxa de atraso', function (this: ReportWorld) {
  assert.ok(this.result);
  assert.ok(this.result.summary.overdueRate);
  assert.ok(this.result.summary.overdueRate.endsWith('%'));
});

Then('deve ocorrer um erro com mensagem {string}', function (this: ReportWorld, message: string) {
  assert.ok(this.error, `Expected error with message '${message}' but none was thrown`);
  assert.ok(
    (this.error as Error).message.includes(message),
    `Expected "${message}" in "${(this.error as Error).message}"`,
  );
});
