// src/application/ReportQueryBuilder.ts
// Design Pattern: Builder — constructs complex report queries step by step

export enum Metric {
  LOANS    = 'LOANS',
  RETURNS  = 'RETURNS',
  OVERDUE  = 'OVERDUE',
  RENEWALS = 'RENEWALS',
}

export enum Dimension {
  DAY   = 'DAY',
  WEEK  = 'WEEK',
  MONTH = 'MONTH',
}

export interface ReportQuery {
  startDate: Date;
  endDate: Date;
  categoryId?: string;
  userId?: string;
  metrics: Metric[];
  groupBy: Dimension;
}

export class ReportQueryBuilder {
  private query: Partial<ReportQuery> = {
    metrics: [],
    groupBy: Dimension.DAY,
  };

  forPeriod(start: Date, end: Date): this {
    if (start >= end) throw new Error('startDate must be before endDate');
    this.query.startDate = start;
    this.query.endDate   = end;
    return this;
  }

  byCategory(categoryId: string): this {
    this.query.categoryId = categoryId;
    return this;
  }

  byUser(userId: string): this {
    this.query.userId = userId;
    return this;
  }

  withMetrics(...metrics: Metric[]): this {
    this.query.metrics = metrics;
    return this;
  }

  groupBy(dimension: Dimension): this {
    this.query.groupBy = dimension;
    return this;
  }

  build(): ReportQuery {
    if (!this.query.startDate || !this.query.endDate) {
      throw new Error('Period is required: call forPeriod() before build()');
    }
    if (!this.query.metrics?.length) {
      this.query.metrics = [Metric.LOANS, Metric.RETURNS, Metric.OVERDUE];
    }
    return this.query as ReportQuery;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/application/use-cases/GenerateReportUseCase.ts

export interface ReportDataPoint {
  period: string;
  loans?: number;
  returns?: number;
  overdue?: number;
  renewals?: number;
}

export interface ReportResult {
  query: ReportQuery;
  data: ReportDataPoint[];
  summary: {
    totalLoans?: number;
    totalReturns?: number;
    totalOverdue?: number;
    overdueRate?: string;
  };
  generatedAt: string;
}

export interface IReportRepository {
  getLoansByPeriod(query: ReportQuery): Promise<ReportDataPoint[]>;
}

export class GenerateReportUseCase {
  constructor(private readonly reportRepository: IReportRepository) {}

  async execute(query: ReportQuery): Promise<ReportResult> {
    const data = await this.reportRepository.getLoansByPeriod(query);

    const summary = this.calculateSummary(data, query.metrics);

    return {
      query,
      data,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  private calculateSummary(
    data: ReportDataPoint[],
    metrics: Metric[],
  ): ReportResult['summary'] {
    const summary: ReportResult['summary'] = {};

    if (metrics.includes(Metric.LOANS)) {
      summary.totalLoans = data.reduce((sum, d) => sum + (d.loans ?? 0), 0);
    }
    if (metrics.includes(Metric.RETURNS)) {
      summary.totalReturns = data.reduce((sum, d) => sum + (d.returns ?? 0), 0);
    }
    if (metrics.includes(Metric.OVERDUE)) {
      summary.totalOverdue = data.reduce((sum, d) => sum + (d.overdue ?? 0), 0);
      if (summary.totalLoans && summary.totalLoans > 0) {
        const rate = ((summary.totalOverdue / summary.totalLoans) * 100).toFixed(1);
        summary.overdueRate = `${rate}%`;
      }
    }

    return summary;
  }
}
