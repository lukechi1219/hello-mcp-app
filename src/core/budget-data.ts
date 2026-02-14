import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas - types are derived from these using z.infer
// ---------------------------------------------------------------------------

const BudgetCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  defaultPercent: z.number(),
});

const HistoricalMonthSchema = z.object({
  month: z.string(),
  allocations: z.record(z.string(), z.number()),
});

const BenchmarkPercentilesSchema = z.object({
  p25: z.number(),
  p50: z.number(),
  p75: z.number(),
});

const StageBenchmarkSchema = z.object({
  stage: z.string(),
  categoryBenchmarks: z.record(z.string(), BenchmarkPercentilesSchema),
});

const BudgetConfigSchema = z.object({
  categories: z.array(BudgetCategorySchema),
  presetBudgets: z.array(z.number()),
  defaultBudget: z.number(),
  currency: z.string(),
  currencySymbol: z.string(),
});

const BudgetAnalyticsSchema = z.object({
  history: z.array(HistoricalMonthSchema),
  benchmarks: z.array(StageBenchmarkSchema),
  stages: z.array(z.string()),
  defaultStage: z.string(),
});

export const BudgetDataResponseSchema = z.object({
  config: BudgetConfigSchema,
  analytics: BudgetAnalyticsSchema,
});

// ---------------------------------------------------------------------------
// Types derived from schemas
// ---------------------------------------------------------------------------

export type BudgetDataResponse = z.infer<typeof BudgetDataResponseSchema>;
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;
export type BenchmarkPercentiles = z.infer<typeof BenchmarkPercentilesSchema>;
export type StageBenchmark = z.infer<typeof StageBenchmarkSchema>;
export type HistoricalMonth = z.infer<typeof HistoricalMonthSchema>;
export type BudgetConfig = z.infer<typeof BudgetConfigSchema>;
export type BudgetAnalytics = z.infer<typeof BudgetAnalyticsSchema>;

// Internal type (not part of API schema - includes trendPerMonth for data generation)
type BudgetCategoryInternal = BudgetCategory & {
  trendPerMonth: number;
};

// ---------------------------------------------------------------------------
// Budget Categories with Trend Data
// ---------------------------------------------------------------------------

const CATEGORIES: BudgetCategoryInternal[] = [
  { id: 'marketing', name: 'Marketing', color: '#3b82f6', defaultPercent: 25, trendPerMonth: 0.15 },
  { id: 'engineering', name: 'Engineering', color: '#10b981', defaultPercent: 35, trendPerMonth: -0.1 },
  { id: 'operations', name: 'Operations', color: '#f59e0b', defaultPercent: 15, trendPerMonth: 0.05 },
  { id: 'sales', name: 'Sales', color: '#ef4444', defaultPercent: 15, trendPerMonth: 0.08 },
  { id: 'rd', name: 'R&D', color: '#8b5cf6', defaultPercent: 10, trendPerMonth: -0.18 },
];

// ---------------------------------------------------------------------------
// Industry Benchmarks by Company Stage
// ---------------------------------------------------------------------------

const BENCHMARKS: StageBenchmark[] = [
  {
    stage: 'Seed',
    categoryBenchmarks: {
      marketing: { p25: 15, p50: 20, p75: 25 },
      engineering: { p25: 40, p50: 47, p75: 55 },
      operations: { p25: 8, p50: 12, p75: 15 },
      sales: { p25: 10, p50: 15, p75: 20 },
      rd: { p25: 5, p50: 10, p75: 15 },
    },
  },
  {
    stage: 'Series A',
    categoryBenchmarks: {
      marketing: { p25: 20, p50: 25, p75: 30 },
      engineering: { p25: 35, p50: 40, p75: 45 },
      operations: { p25: 10, p50: 14, p75: 18 },
      sales: { p25: 15, p50: 20, p75: 25 },
      rd: { p25: 8, p50: 12, p75: 15 },
    },
  },
  {
    stage: 'Series B',
    categoryBenchmarks: {
      marketing: { p25: 22, p50: 27, p75: 32 },
      engineering: { p25: 30, p50: 35, p75: 40 },
      operations: { p25: 12, p50: 16, p75: 20 },
      sales: { p25: 18, p50: 23, p75: 28 },
      rd: { p25: 8, p50: 12, p75: 15 },
    },
  },
  {
    stage: 'Growth',
    categoryBenchmarks: {
      marketing: { p25: 25, p50: 30, p75: 35 },
      engineering: { p25: 25, p50: 30, p75: 35 },
      operations: { p25: 15, p50: 18, p75: 22 },
      sales: { p25: 20, p50: 25, p75: 30 },
      rd: { p25: 5, p50: 8, p75: 12 },
    },
  },
];

// ---------------------------------------------------------------------------
// Historical Data Generation
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function generateHistory(categories: BudgetCategoryInternal[]): HistoricalMonth[] {
  const months: HistoricalMonth[] = [];
  const now = new Date();
  const random = seededRandom(42);

  for (let i = 23; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const rawAllocations: Record<string, number> = {};

    for (const category of categories) {
      const monthsFromStart = 23 - i;
      const trend = monthsFromStart * category.trendPerMonth;
      const noise = (random() - 0.5) * 3;
      rawAllocations[category.id] = Math.max(0, Math.min(100, category.defaultPercent + trend + noise));
    }

    const total = Object.values(rawAllocations).reduce((a, b) => a + b, 0);
    const allocations: Record<string, number> = {};
    for (const id of Object.keys(rawAllocations)) {
      allocations[id] = Math.round((rawAllocations[id] / total) * 1000) / 10;
    }

    months.push({ month: monthStr, allocations });
  }

  return months;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getBudgetData(): BudgetDataResponse {
  return {
    config: {
      categories: CATEGORIES.map(({ id, name, color, defaultPercent }) => ({
        id,
        name,
        color,
        defaultPercent,
      })),
      presetBudgets: [50000, 100000, 250000, 500000],
      defaultBudget: 100000,
      currency: 'USD',
      currencySymbol: '$',
    },
    analytics: {
      history: generateHistory(CATEGORIES),
      benchmarks: BENCHMARKS,
      stages: ['Seed', 'Series A', 'Series B', 'Growth'],
      defaultStage: 'Series A',
    },
  };
}

export function formatBudgetSummary(data: BudgetDataResponse): string {
  const lines: string[] = [
    'Budget Allocator Configuration',
    '==============================',
    '',
    `Default Budget: ${data.config.currencySymbol}${data.config.defaultBudget.toLocaleString()}`,
    `Available Presets: ${data.config.presetBudgets.map((b) => `${data.config.currencySymbol}${b.toLocaleString()}`).join(', ')}`,
    '',
    'Categories:',
    ...data.config.categories.map((c) => `  - ${c.name}: ${c.defaultPercent}% default`),
    '',
    `Historical Data: ${data.analytics.history.length} months`,
    `Benchmark Stages: ${data.analytics.stages.join(', ')}`,
    `Default Stage: ${data.analytics.defaultStage}`,
  ];
  return lines.join('\n');
}
