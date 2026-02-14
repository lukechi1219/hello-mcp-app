import type { App } from '@modelcontextprotocol/ext-apps';
import { Chart, registerables } from 'chart.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  BenchmarkPercentiles,
  BudgetCategory,
  BudgetDataResponse,
} from '../../core/budget-data.js';
import './BudgetAllocator.css';

// Register Chart.js components once
Chart.register(...registerables);

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, symbol: string): string {
  if (amount >= 1000) {
    return `${symbol}${Math.round(amount / 1000)}K`;
  }
  return `${symbol}${amount.toLocaleString()}`;
}

function formatCurrencyFull(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString()}`;
}

function calculatePercentile(value: number, benchmarks: BenchmarkPercentiles): number {
  if (value <= benchmarks.p25) {
    return 25 * (value / benchmarks.p25);
  }
  if (value <= benchmarks.p50) {
    return 25 + 25 * ((value - benchmarks.p25) / (benchmarks.p50 - benchmarks.p25));
  }
  if (value <= benchmarks.p75) {
    return 50 + 25 * ((value - benchmarks.p50) / (benchmarks.p75 - benchmarks.p50));
  }
  const extraRange = benchmarks.p75 - benchmarks.p50;
  return 75 + 25 * Math.min(1, (value - benchmarks.p75) / extraRange);
}

function getPercentileClass(percentile: number): string {
  if (percentile >= 40 && percentile <= 60) return 'percentile-normal';
  if (percentile > 60) return 'percentile-high';
  return 'percentile-low';
}

function getPercentileIcon(percentile: number): string {
  if (percentile >= 40 && percentile <= 60) return '';
  if (percentile > 60) return '';
  return '';
}

function drawSparkline(canvas: HTMLCanvasElement, data: number[], color: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || data.length < 2) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 2;

  ctx.clearRect(0, 0, width, height);

  const min = Math.min(...data) - 2;
  const max = Math.max(...data) + 2;
  const range = max - min || 1;

  // Area fill
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  data.forEach((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(width - padding, height - padding);
  ctx.closePath();
  ctx.fillStyle = `${color}20`;
  ctx.fill();

  // Line
  ctx.beginPath();
  data.forEach((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SparklineProps {
  data: number[];
  color: string;
  tooltip: string;
}

function Sparkline({ data, color, tooltip }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawSparkline(canvasRef.current, data, color);
    }
  }, [data, color]);

  return (
    <div class="budget-sparkline-wrapper">
      <canvas ref={canvasRef} class="budget-sparkline" width={50} height={28} />
      <span class="budget-sparkline-tooltip">{tooltip}</span>
    </div>
  );
}

interface SliderRowProps {
  category: BudgetCategory;
  allocation: number;
  totalBudget: number;
  historyData: number[];
  benchmarks: BenchmarkPercentiles | undefined;
  highlighted: boolean;
  onAllocationChange: (categoryId: string, value: number) => void;
  onHighlight: (categoryId: string) => void;
  onClearHighlight: () => void;
}

function SliderRow({
  category,
  allocation,
  totalBudget,
  historyData,
  benchmarks,
  highlighted,
  onAllocationChange,
  onHighlight,
  onClearHighlight,
}: SliderRowProps) {
  const amount = (allocation / 100) * totalBudget;
  const symbol = '$';

  const firstVal = historyData[0] ?? 0;
  const lastVal = historyData[historyData.length - 1] ?? 0;
  const trendDiff = lastVal - firstVal;
  const trendArrow = Math.abs(trendDiff) < 0.5 ? '' : trendDiff > 0 ? ' +' : ' ';
  const tooltipText = `Past allocations: ${firstVal.toFixed(0)}%${trendArrow}${trendDiff.toFixed(1)}%`;

  const percentile = benchmarks ? calculatePercentile(allocation, benchmarks) : null;

  return (
    <div
      class={`budget-slider-row${highlighted ? ' highlighted' : ''}`}
      onMouseEnter={() => onHighlight(category.id)}
      onMouseLeave={onClearHighlight}
    >
      <label class="budget-slider-label">
        <span class="budget-color-dot" style={{ backgroundColor: category.color }} />
        <span class="budget-label-text">{category.name}</span>
      </label>

      <Sparkline data={historyData} color={category.color} tooltip={tooltipText} />

      <div class="budget-slider-container">
        <input
          type="range"
          class="budget-slider"
          min={0}
          max={100}
          step={1}
          value={allocation}
          onInput={(event) => onAllocationChange(category.id, parseFloat((event.target as HTMLInputElement).value))}
        />
      </div>

      <span class="budget-slider-value">
        <span class="percent">{allocation.toFixed(1)}%</span>
        <span class="amount">{formatCurrency(amount, symbol)}</span>
      </span>

      <span class={`budget-percentile-badge${percentile !== null ? ` ${getPercentileClass(percentile)}` : ''}`}>
        {percentile !== null && (
          <>
            <span class="percentile-icon">{getPercentileIcon(percentile)}</span>
            {Math.round(percentile)}th
          </>
        )}
      </span>
    </div>
  );
}

interface StatusBarProps {
  totalAllocated: number;
  totalBudget: number;
  currencySymbol: string;
}

function StatusBar({ totalAllocated, totalBudget, currencySymbol }: StatusBarProps) {
  const allocatedAmount = (totalAllocated / 100) * totalBudget;
  const isBalanced = Math.abs(totalAllocated - 100) < 0.1;

  let statusIcon: string;
  let statusClass: string;

  if (isBalanced) {
    statusIcon = '';
    statusClass = 'status-balanced';
  } else if (totalAllocated > 100) {
    statusIcon = ' Over';
    statusClass = 'status-warning status-over';
  } else {
    statusIcon = ' Under';
    statusClass = 'status-warning status-under';
  }

  return (
    <div class={`budget-status-bar ${statusClass}`}>
      Allocated: {formatCurrencyFull(allocatedAmount, currencySymbol)} / {formatCurrencyFull(totalBudget, currencySymbol)}
      <span class="status-icon">{statusIcon}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Doughnut Chart
// ---------------------------------------------------------------------------

interface DoughnutChartProps {
  categories: BudgetCategory[];
  allocations: Record<string, number>;
  onCategoryClick: (categoryId: string) => void;
  onCategoryHover: (categoryId: string | null) => void;
}

function DoughnutChart({ categories, allocations, onCategoryClick, onCategoryHover }: DoughnutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<'doughnut'> | null>(null);

  // Create chart on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: categories.map((c) => c.name),
        datasets: [
          {
            data: categories.map((c) => allocations[c.id] ?? c.defaultPercent),
            backgroundColor: categories.map((c) => c.color),
            borderWidth: 2,
            borderColor: isDarkMode ? '#1f2937' : '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = ctx.parsed;
                return `${ctx.label}: ${pct.toFixed(1)}%`;
              },
            },
          },
        },
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            onCategoryClick(categories[elements[0].index].id);
          }
        },
        onHover: (_event, elements) => {
          if (elements.length > 0) {
            onCategoryHover(categories[elements[0].index].id);
          } else {
            onCategoryHover(null);
          }
        },
      },
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => {
      if (chartRef.current && canvasRef.current) {
        chartRef.current.destroy();
        const dark = mediaQuery.matches;
        chartRef.current = new Chart(canvasRef.current, {
          type: 'doughnut',
          data: {
            labels: categories.map((c) => c.name),
            datasets: [
              {
                data: categories.map((c) => allocations[c.id] ?? c.defaultPercent),
                backgroundColor: categories.map((c) => c.color),
                borderWidth: 2,
                borderColor: dark ? '#1f2937' : '#ffffff',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: { legend: { display: false } },
          },
        });
      }
    };
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      chartRef.current?.destroy();
    };
  }, [categories]);

  // Update chart data when allocations change
  useEffect(() => {
    if (!chartRef.current) return;
    const data = categories.map((c) => allocations[c.id] ?? 0);
    chartRef.current.data.datasets[0].data = data;
    chartRef.current.update('none');
  }, [allocations, categories]);

  return (
    <section class="budget-chart-section">
      <canvas ref={canvasRef} class="budget-chart-canvas" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main BudgetAllocator Component
// ---------------------------------------------------------------------------

interface BudgetAllocatorProps {
  data: BudgetDataResponse;
  app: App;
}

export function BudgetAllocator({ data }: BudgetAllocatorProps) {
  const { config, analytics } = data;

  const [totalBudget, setTotalBudget] = useState(config.defaultBudget);
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const category of config.categories) {
      initial[category.id] = category.defaultPercent;
    }
    return initial;
  });
  const [selectedStage, setSelectedStage] = useState(analytics.defaultStage);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  const stageBenchmark = useMemo(
    () => analytics.benchmarks.find((b) => b.stage === selectedStage),
    [analytics.benchmarks, selectedStage],
  );

  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + v, 0),
    [allocations],
  );

  const historyByCategory = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const category of config.categories) {
      map[category.id] = analytics.history.map((h) => h.allocations[category.id] ?? 0);
    }
    return map;
  }, [config.categories, analytics.history]);

  const handleAllocationChange = useCallback((categoryId: string, value: number) => {
    setAllocations((previous) => ({ ...previous, [categoryId]: value }));
  }, []);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setHighlightedCategory(categoryId);
  }, []);

  const handleCategoryHover = useCallback((categoryId: string | null) => {
    setHighlightedCategory(categoryId);
  }, []);

  // Comparison summary
  const comparisonSummary = useMemo(() => {
    if (!stageBenchmark) return null;

    let maxDeviation = 0;
    let maxDeviationCategory: BudgetCategory | null = null;
    let maxDeviationDirection = '';

    for (const category of config.categories) {
      const allocation = allocations[category.id] ?? category.defaultPercent;
      const benchmark = stageBenchmark.categoryBenchmarks[category.id];
      if (!benchmark) continue;

      const deviation = allocation - benchmark.p50;
      if (Math.abs(deviation) > Math.abs(maxDeviation)) {
        maxDeviation = deviation;
        maxDeviationCategory = category;
        maxDeviationDirection = deviation > 0 ? 'above' : 'below';
      }
    }

    if (maxDeviationCategory && Math.abs(maxDeviation) > 3) {
      return {
        category: maxDeviationCategory.name,
        deviation: Math.abs(Math.round(maxDeviation)),
        direction: maxDeviationDirection,
        isAbove: maxDeviation > 0,
      };
    }
    return null;
  }, [config.categories, allocations, stageBenchmark]);

  return (
    <div class="budget-view">
      <header class="budget-header">
        <h1 class="budget-title">Budget Allocator</h1>
        <select
          class="budget-select"
          value={totalBudget}
          onChange={(event) => setTotalBudget(parseInt((event.target as HTMLSelectElement).value))}
        >
          {config.presetBudgets.map((amount) => (
            <option key={amount} value={amount}>
              {formatCurrencyFull(amount, config.currencySymbol)}
            </option>
          ))}
        </select>
      </header>

      <DoughnutChart
        categories={config.categories}
        allocations={allocations}
        onCategoryClick={handleCategoryClick}
        onCategoryHover={handleCategoryHover}
      />

      <section class="budget-sliders-section">
        {config.categories.map((category) => (
          <SliderRow
            key={category.id}
            category={category}
            allocation={allocations[category.id] ?? category.defaultPercent}
            totalBudget={totalBudget}
            historyData={historyByCategory[category.id] ?? []}
            benchmarks={stageBenchmark?.categoryBenchmarks[category.id]}
            highlighted={highlightedCategory === category.id}
            onAllocationChange={handleAllocationChange}
            onHighlight={setHighlightedCategory}
            onClearHighlight={() => setHighlightedCategory(null)}
          />
        ))}
      </section>

      <footer class="budget-footer">
        <StatusBar
          totalAllocated={totalAllocated}
          totalBudget={totalBudget}
          currencySymbol={config.currencySymbol}
        />

        <div class="budget-comparison-bar">
          <span>
            {comparisonSummary ? (
              <>
                vs. Industry: <span class="budget-comparison-highlight">{comparisonSummary.category}</span>
                {' '}{comparisonSummary.isAbove ? '\u2191' : '\u2193'} {comparisonSummary.deviation}% {comparisonSummary.direction} avg
              </>
            ) : (
              'vs. Industry: similar to peers'
            )}
          </span>

          <label class="budget-stage-label">
            Stage:
            <select
              class="budget-stage-select"
              value={selectedStage}
              onChange={(event) => setSelectedStage((event.target as HTMLSelectElement).value)}
            >
              {analytics.stages.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
        </div>
      </footer>
    </div>
  );
}
