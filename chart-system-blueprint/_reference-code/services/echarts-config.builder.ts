/**
 * ECharts Config Builder
 *
 * Converts InterpretationResult (AI-extracted structured data) into ECharts option objects.
 * Provides functions to update title, axis labels, colors, and chart type without re-generating.
 */

import type { EChartsOption } from 'echarts';

// ============================================
// Types
// ============================================

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number | boolean | null;
}

export interface InterpretationData {
  extractedData: ChartDataPoint[];
  chartType: string;
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface InteractiveChartConfig {
  option: EChartsOption;
  chartType: string;
  dataPoints: ChartDataPoint[];
  seriesKeys: string[];
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  colors: string[];
}

export interface ChartOverrides {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  colors: string[];
  showValues: boolean;
  showGrid: boolean;
}

// ============================================
// Constants
// ============================================

export const QI_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

const CHART_TYPE_LABELS: Record<string, string> = {
  bar: 'Barras',
  line: 'Linhas',
  pie: 'Pizza',
  area: 'Area',
  waterfall: 'Waterfall',
  scatter: 'Dispersao',
  grouped_bar: 'Barras Agrupadas',
  stacked_bar: 'Barras Empilhadas',
  heatmap: 'Mapa de Calor',
};

// ============================================
// Helper Functions
// ============================================

/** Extract numeric series keys from data points (everything except 'name') */
function getSeriesKeys(dataPoints: ChartDataPoint[]): string[] {
  if (dataPoints.length === 0) return ['value'];
  const keys = new Set<string>();
  for (const dp of dataPoints) {
    for (const [key, val] of Object.entries(dp)) {
      if (key !== 'name' && typeof val === 'number') {
        keys.add(key);
      }
    }
  }
  return keys.size > 0 ? Array.from(keys) : ['value'];
}

/** Format number in BR locale */
function formatBR(val: number): string {
  return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/** Build tooltip formatter for BR locale */
function buildTooltip(): EChartsOption['tooltip'] {
  return {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: { color: '#374151', fontSize: 13 },
    formatter: (params: unknown) => {
      if (!Array.isArray(params)) return '';
      const items = params as Array<{
        seriesName: string;
        value: number | number[];
        color: string;
        axisValueLabel: string;
      }>;
      if (items.length === 0) return '';
      let html = `<strong>${items[0].axisValueLabel}</strong><br/>`;
      for (const item of items) {
        const val = Array.isArray(item.value) ? item.value[1] : item.value;
        if (typeof val === 'number') {
          html += `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};margin-right:6px;"></span>`;
          html += `${item.seriesName}: <strong>${formatBR(val)}</strong><br/>`;
        }
      }
      return html;
    },
  };
}

/** Build pie tooltip */
function buildPieTooltip(): EChartsOption['tooltip'] {
  return {
    trigger: 'item',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: { color: '#374151', fontSize: 13 },
    formatter: (params: unknown) => {
      const p = params as { name: string; value: number; percent: number; color: string };
      return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.name}: <strong>${formatBR(p.value)}</strong> (${p.percent?.toFixed(1)}%)`;
    },
  };
}

/** Build toolbox */
function buildToolbox(): EChartsOption['toolbox'] {
  return {
    show: true,
    right: 16,
    top: 8,
    feature: {
      dataZoom: { yAxisIndex: 'none', title: { zoom: 'Zoom', back: 'Voltar' } },
      restore: { title: 'Restaurar' },
      saveAsImage: { title: 'Salvar', type: 'png', pixelRatio: 2 },
    },
    iconStyle: { borderColor: '#9ca3af' },
    emphasis: { iconStyle: { borderColor: '#3b82f6' } },
  };
}

// ============================================
// Chart Type Builders
// ============================================

function buildBarOption(
  dataPoints: ChartDataPoint[],
  seriesKeys: string[],
  colors: string[],
  overrides?: Partial<ChartOverrides>
): EChartsOption {
  return {
    xAxis: {
      type: 'category',
      data: dataPoints.map((d) => d.name),
      name: overrides?.xAxisLabel || '',
      nameLocation: 'center',
      nameGap: 35,
      axisLabel: { fontSize: 12, color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      name: overrides?.yAxisLabel || '',
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: {
        fontSize: 12,
        color: '#6b7280',
        formatter: (val: number) => formatBR(val),
      },
    },
    series: seriesKeys.map((key, i) => ({
      name: key === 'value' ? '' : key,
      type: 'bar' as const,
      data: dataPoints.map((d) => (typeof d[key] === 'number' ? d[key] : 0)),
      itemStyle: { color: colors[i % colors.length], borderRadius: [4, 4, 0, 0] },
      label: overrides?.showValues !== false
        ? { show: true, position: 'top' as const, fontSize: 11, formatter: (p: { value: number }) => formatBR(p.value) }
        : undefined,
    })),
    tooltip: buildTooltip(),
    grid: { left: 60, right: 24, top: 60, bottom: 50, containLabel: true },
  };
}

function buildLineOption(
  dataPoints: ChartDataPoint[],
  seriesKeys: string[],
  colors: string[],
  overrides?: Partial<ChartOverrides>,
  withArea = false
): EChartsOption {
  return {
    xAxis: {
      type: 'category',
      data: dataPoints.map((d) => d.name),
      name: overrides?.xAxisLabel || '',
      nameLocation: 'center',
      nameGap: 35,
      axisLabel: { fontSize: 12, color: '#6b7280' },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: overrides?.yAxisLabel || '',
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: {
        fontSize: 12,
        color: '#6b7280',
        formatter: (val: number) => formatBR(val),
      },
    },
    series: seriesKeys.map((key, i) => ({
      name: key === 'value' ? '' : key,
      type: 'line' as const,
      data: dataPoints.map((d) => (typeof d[key] === 'number' ? d[key] : 0)),
      smooth: true,
      itemStyle: { color: colors[i % colors.length] },
      lineStyle: { width: 2.5 },
      ...(withArea ? { areaStyle: { opacity: 0.15 } } : {}),
      label: overrides?.showValues !== false
        ? { show: true, position: 'top' as const, fontSize: 11, formatter: (p: { value: number }) => formatBR(p.value) }
        : undefined,
    })),
    tooltip: buildTooltip(),
    grid: { left: 60, right: 24, top: 60, bottom: 50, containLabel: true },
  };
}

function buildPieOption(
  dataPoints: ChartDataPoint[],
  seriesKeys: string[],
  colors: string[]
): EChartsOption {
  const valueKey = seriesKeys[0] || 'value';
  return {
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '55%'],
        data: dataPoints.map((d, i) => ({
          name: d.name,
          value: typeof d[valueKey] === 'number' ? d[valueKey] : 0,
          itemStyle: { color: colors[i % colors.length] },
        })),
        label: {
          show: true,
          fontSize: 12,
          formatter: (p: { name: string; percent: number }) => `${p.name}\n${p.percent.toFixed(1)}%`,
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.15)' },
        },
      },
    ],
    tooltip: buildPieTooltip(),
  };
}

function buildWaterfallOption(
  dataPoints: ChartDataPoint[],
  seriesKeys: string[],
  colors: string[],
  overrides?: Partial<ChartOverrides>
): EChartsOption {
  const valueKey = seriesKeys[0] || 'value';
  const values = dataPoints.map((d) => (typeof d[valueKey] === 'number' ? (d[valueKey] as number) : 0));

  // Build waterfall: invisible base + visible bar
  const invisibleData: (number | string)[] = [];
  const visibleData: (number | string)[] = [];
  let cumulative = 0;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (i === 0) {
      // First bar starts from 0
      invisibleData.push(0);
      visibleData.push(val);
      cumulative = val;
    } else if (i === values.length - 1 && dataPoints[i].name?.toLowerCase().includes('total')) {
      // Last item as total
      invisibleData.push(0);
      visibleData.push(cumulative + val);
    } else {
      if (val >= 0) {
        invisibleData.push(cumulative);
        visibleData.push(val);
      } else {
        invisibleData.push(cumulative + val);
        visibleData.push(Math.abs(val));
      }
      cumulative += val;
    }
  }

  return {
    xAxis: {
      type: 'category',
      data: dataPoints.map((d) => d.name),
      name: overrides?.xAxisLabel || '',
      nameLocation: 'center',
      nameGap: 35,
      axisLabel: { fontSize: 12, color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      name: overrides?.yAxisLabel || '',
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: { fontSize: 12, color: '#6b7280', formatter: (val: number) => formatBR(val) },
    },
    series: [
      {
        name: 'Base',
        type: 'bar',
        stack: 'waterfall',
        data: invisibleData,
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
      },
      {
        name: valueKey === 'value' ? '' : valueKey,
        type: 'bar',
        stack: 'waterfall',
        data: visibleData.map((val, i) => ({
          value: val,
          itemStyle: {
            color: i === 0 || (i === values.length - 1 && dataPoints[i].name?.toLowerCase().includes('total'))
              ? colors[0]
              : values[i] >= 0
                ? colors[1] || '#10b981'
                : colors[3] || '#ef4444',
            borderRadius: [4, 4, 0, 0],
          },
        })),
        label: overrides?.showValues !== false
          ? { show: true, position: 'top' as const, fontSize: 11, formatter: (p: { value: number }) => formatBR(p.value) }
          : undefined,
      },
    ],
    tooltip: buildTooltip(),
    grid: { left: 60, right: 24, top: 60, bottom: 50, containLabel: true },
  };
}

function buildScatterOption(
  dataPoints: ChartDataPoint[],
  seriesKeys: string[],
  colors: string[],
  overrides?: Partial<ChartOverrides>
): EChartsOption {
  const xKey = seriesKeys[0] || 'value';
  const yKey = seriesKeys[1] || seriesKeys[0] || 'value';

  return {
    xAxis: {
      type: 'value',
      name: overrides?.xAxisLabel || xKey,
      nameLocation: 'center',
      nameGap: 35,
      axisLabel: { fontSize: 12, color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      name: overrides?.yAxisLabel || yKey,
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: { fontSize: 12, color: '#6b7280' },
    },
    series: [
      {
        type: 'scatter',
        data: dataPoints.map((d) => [
          typeof d[xKey] === 'number' ? d[xKey] : 0,
          typeof d[yKey] === 'number' ? d[yKey] : 0,
        ]),
        symbolSize: 12,
        itemStyle: { color: colors[0] },
      },
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: (params: unknown) => {
        const p = params as { value: number[]; dataIndex: number };
        const name = dataPoints[p.dataIndex]?.name || '';
        return `<strong>${name}</strong><br/>${xKey}: ${formatBR(p.value[0])}<br/>${yKey}: ${formatBR(p.value[1])}`;
      },
    },
    grid: { left: 60, right: 24, top: 60, bottom: 50, containLabel: true },
  };
}

function buildStackedBarOption(
  dataPoints: ChartDataPoint[],
  seriesKeys: string[],
  colors: string[],
  overrides?: Partial<ChartOverrides>
): EChartsOption {
  return {
    xAxis: {
      type: 'category',
      data: dataPoints.map((d) => d.name),
      name: overrides?.xAxisLabel || '',
      nameLocation: 'center',
      nameGap: 35,
      axisLabel: { fontSize: 12, color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      name: overrides?.yAxisLabel || '',
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: { fontSize: 12, color: '#6b7280', formatter: (val: number) => formatBR(val) },
    },
    series: seriesKeys.map((key, i) => ({
      name: key,
      type: 'bar' as const,
      stack: 'total',
      data: dataPoints.map((d) => (typeof d[key] === 'number' ? d[key] : 0)),
      itemStyle: { color: colors[i % colors.length] },
      label: overrides?.showValues !== false && i === seriesKeys.length - 1
        ? { show: true, position: 'top' as const, fontSize: 11 }
        : undefined,
    })),
    tooltip: buildTooltip(),
    grid: { left: 60, right: 24, top: 60, bottom: 50, containLabel: true },
  };
}

function buildHeatmapOption(
  dataPoints: ChartDataPoint[],
  seriesKeys: string[],
  colors: string[]
): EChartsOption {
  // Build heatmap data: [xIndex, yIndex, value]
  const categories = dataPoints.map((d) => d.name);
  const heatmapData: [number, number, number][] = [];
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let yi = 0; yi < seriesKeys.length; yi++) {
    for (let xi = 0; xi < dataPoints.length; xi++) {
      const val = typeof dataPoints[xi][seriesKeys[yi]] === 'number'
        ? (dataPoints[xi][seriesKeys[yi]] as number)
        : 0;
      heatmapData.push([xi, yi, val]);
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  }

  return {
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 12, color: '#6b7280' },
    },
    yAxis: {
      type: 'category',
      data: seriesKeys,
      axisLabel: { fontSize: 12, color: '#6b7280' },
    },
    visualMap: {
      min: minVal,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 8,
      inRange: {
        color: [colors[0] + '22', colors[0]],
      },
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: { show: true, fontSize: 11, formatter: (p: { value: number[] }) => formatBR(p.value[2]) },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.15)' } },
      },
    ],
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { value: number[] };
        return `${categories[p.value[0]]} / ${seriesKeys[p.value[1]]}: <strong>${formatBR(p.value[2])}</strong>`;
      },
    },
    grid: { left: 80, right: 24, top: 40, bottom: 80, containLabel: true },
  };
}

// ============================================
// Main Builder Functions
// ============================================

/**
 * Build a complete ECharts option from interpretation data.
 */
export function buildEChartsOption(
  interpretation: InterpretationData,
  chartType: string,
  overrides?: Partial<ChartOverrides>
): InteractiveChartConfig {
  const dataPoints = interpretation.extractedData;
  const seriesKeys = getSeriesKeys(dataPoints);
  const colors = overrides?.colors || QI_COLORS;
  const title = overrides?.title || interpretation.title;
  const xAxisLabel = overrides?.xAxisLabel || interpretation.xAxisLabel || '';
  const yAxisLabel = overrides?.yAxisLabel || interpretation.yAxisLabel || '';

  const fullOverrides: Partial<ChartOverrides> = {
    ...overrides,
    title,
    xAxisLabel,
    yAxisLabel,
    colors,
  };

  let chartOption: EChartsOption;

  switch (chartType) {
    case 'line':
      chartOption = buildLineOption(dataPoints, seriesKeys, colors, fullOverrides);
      break;
    case 'pie':
      chartOption = buildPieOption(dataPoints, seriesKeys, colors);
      break;
    case 'area':
      chartOption = buildLineOption(dataPoints, seriesKeys, colors, fullOverrides, true);
      break;
    case 'waterfall':
      chartOption = buildWaterfallOption(dataPoints, seriesKeys, colors, fullOverrides);
      break;
    case 'scatter':
      chartOption = buildScatterOption(dataPoints, seriesKeys, colors, fullOverrides);
      break;
    case 'grouped_bar':
      chartOption = buildBarOption(dataPoints, seriesKeys, colors, fullOverrides);
      break;
    case 'stacked_bar':
      chartOption = buildStackedBarOption(dataPoints, seriesKeys, colors, fullOverrides);
      break;
    case 'heatmap':
      chartOption = buildHeatmapOption(dataPoints, seriesKeys, colors);
      break;
    case 'bar':
    default:
      chartOption = buildBarOption(dataPoints, seriesKeys, colors, fullOverrides);
      break;
  }

  // Add common options
  chartOption.title = {
    text: title,
    left: 'center',
    top: 8,
    textStyle: { fontSize: 16, fontWeight: 600, color: '#1f2937' },
  };

  if (chartType !== 'pie' && chartType !== 'heatmap') {
    chartOption.legend = {
      show: seriesKeys.length > 1,
      bottom: 0,
      textStyle: { fontSize: 12, color: '#6b7280' },
    };
  }

  if (overrides?.showGrid !== false && chartType !== 'pie' && chartType !== 'heatmap') {
    if (chartOption.yAxis && !Array.isArray(chartOption.yAxis)) {
      (chartOption as Record<string, unknown>).yAxis = {
        ...(chartOption.yAxis as Record<string, unknown>),
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      };
    }
  }

  chartOption.toolbox = buildToolbox();
  chartOption.animationDuration = 600;
  chartOption.animationEasing = 'cubicOut';

  return {
    option: chartOption,
    chartType,
    dataPoints,
    seriesKeys,
    title,
    xAxisLabel,
    yAxisLabel,
    colors,
  };
}

/**
 * Change chart type and rebuild the option from existing data.
 */
export function changeChartType(
  config: InteractiveChartConfig,
  newType: string
): InteractiveChartConfig {
  return buildEChartsOption(
    {
      extractedData: config.dataPoints,
      chartType: newType,
      title: config.title,
      xAxisLabel: config.xAxisLabel,
      yAxisLabel: config.yAxisLabel,
    },
    newType,
    {
      title: config.title,
      xAxisLabel: config.xAxisLabel,
      yAxisLabel: config.yAxisLabel,
      colors: config.colors,
    }
  );
}

/**
 * Update chart title. Returns partial option for setOption() merge.
 */
export function updateTitle(title: string): Partial<EChartsOption> {
  return {
    title: { text: title },
  };
}

/**
 * Update axis labels. Returns partial option for setOption() merge.
 */
export function updateAxisLabels(xLabel: string, yLabel: string): Partial<EChartsOption> {
  return {
    xAxis: { name: xLabel },
    yAxis: { name: yLabel },
  };
}

/**
 * Update colors - requires full rebuild since colors are per-series.
 */
export function updateColors(
  config: InteractiveChartConfig,
  newColors: string[]
): InteractiveChartConfig {
  return buildEChartsOption(
    {
      extractedData: config.dataPoints,
      chartType: config.chartType,
      title: config.title,
      xAxisLabel: config.xAxisLabel,
      yAxisLabel: config.yAxisLabel,
    },
    config.chartType,
    {
      title: config.title,
      xAxisLabel: config.xAxisLabel,
      yAxisLabel: config.yAxisLabel,
      colors: newColors,
    }
  );
}

export { CHART_TYPE_LABELS };
