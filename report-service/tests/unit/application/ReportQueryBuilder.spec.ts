// tests/unit/application/ReportQueryBuilder.spec.ts

import {
  ReportQueryBuilder,
  Metric,
  Dimension,
  GenerateReportUseCase,
} from '../../../src/application/ReportQueryBuilder';
import { addDays, subDays } from 'date-fns';

describe('ReportQueryBuilder', () => {
  it('should build a valid query with all options', () => {
    const start = subDays(new Date(), 30);
    const end   = new Date();

    const query = new ReportQueryBuilder()
      .forPeriod(start, end)
      .byCategory('cat-001')
      .withMetrics(Metric.LOANS, Metric.OVERDUE)
      .groupBy(Dimension.WEEK)
      .build();

    expect(query.startDate).toEqual(start);
    expect(query.endDate).toEqual(end);
    expect(query.categoryId).toBe('cat-001');
    expect(query.metrics).toContain(Metric.LOANS);
    expect(query.groupBy).toBe(Dimension.WEEK);
  });

  it('should throw when period is not set', () => {
    expect(() =>
      new ReportQueryBuilder().withMetrics(Metric.LOANS).build(),
    ).toThrow('Period is required');
  });

  it('should throw when startDate is after endDate', () => {
    const start = new Date();
    const end   = subDays(new Date(), 5);
    expect(() =>
      new ReportQueryBuilder().forPeriod(start, end).build(),
    ).toThrow('startDate must be before endDate');
  });

  it('should default to all metrics when none specified', () => {
    const query = new ReportQueryBuilder()
      .forPeriod(subDays(new Date(), 7), new Date())
      .build();
    expect(query.metrics.length).toBeGreaterThan(0);
  });

  it('should support method chaining (fluent interface)', () => {
    const builder = new ReportQueryBuilder();
    const result = builder.forPeriod(subDays(new Date(), 7), new Date());
    expect(result).toBe(builder);
  });
});

describe('GenerateReportUseCase', () => {
  it('should return report with summary', async () => {
    const mockRepo = {
      getLoansByPeriod: jest.fn().mockResolvedValue([
        { period: '2024-01-01', loans: 10, returns: 8, overdue: 2 },
        { period: '2024-01-08', loans: 15, returns: 12, overdue: 3 },
      ]),
    };

    const sut = new GenerateReportUseCase(mockRepo as any);
    const query = new ReportQueryBuilder()
      .forPeriod(subDays(new Date(), 14), new Date())
      .withMetrics(Metric.LOANS, Metric.RETURNS, Metric.OVERDUE)
      .build();

    const result = await sut.execute(query);

    expect(result.data).toHaveLength(2);
    expect(result.summary.totalLoans).toBe(25);
    expect(result.summary.totalReturns).toBe(20);
    expect(result.summary.totalOverdue).toBe(5);
    expect(result.summary.overdueRate).toBe('20.0%');
    expect(result.generatedAt).toBeDefined();
  });
});
