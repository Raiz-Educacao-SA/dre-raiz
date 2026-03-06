/**
 * Chart Generator Service
 *
 * Generates chart configurations from data.
 * Supports parsing data from text and creating various chart types.
 */

/**
 * Supported chart types
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'composed';

/**
 * Data point for charts
 */
export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

/**
 * Series configuration
 */
export interface ChartSeries {
  dataKey: string;
  name: string;
  color: string;
  type?: 'bar' | 'line' | 'area';
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  /** Chart type */
  type: ChartType;
  /** Chart title */
  title: string;
  /** Data points */
  data: ChartDataPoint[];
  /** Series configurations */
  series: ChartSeries[];
  /** X-axis label */
  xAxisLabel?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** Show legend */
  showLegend?: boolean;
  /** Show grid */
  showGrid?: boolean;
}

/**
 * Chart generation request
 */
export interface ChartGenerationRequest {
  /** Raw data (CSV, JSON, or text) */
  rawData: string;
  /** Preferred chart type */
  chartType?: ChartType;
  /** Chart title */
  title?: string;
}

/**
 * Chart generation result
 */
export interface ChartGenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Generated chart configuration */
  config?: ChartConfig;
  /** Error message if failed */
  error?: string;
}

/**
 * Chart interpretation result from AI
 */
export interface ChartInterpretation {
  /** Recommended chart type */
  chartType: ChartType;
  /** Suggested title */
  title: string;
  /** Extracted data points */
  extractedData: ChartDataPoint[];
  /** X-axis label */
  xAxisLabel?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** AI insights about the data */
  insights?: string;
}

/**
 * Default colors for chart series
 */
const DEFAULT_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

/**
 * Chart Generator Service
 */
export class ChartGeneratorService {
  /**
   * Generate a chart configuration from raw data
   */
  generateChart(request: ChartGenerationRequest): ChartGenerationResult {
    try {
      const { rawData, chartType, title } = request;

      if (!rawData || rawData.trim().length === 0) {
        return {
          success: false,
          error: 'No data provided',
        };
      }

      // Try to parse the data
      const parsedData = this.parseData(rawData);

      if (!parsedData || parsedData.length === 0) {
        return {
          success: false,
          error: 'Could not parse data. Please provide data in CSV format or as key-value pairs.',
        };
      }

      // Detect series from data
      const series = this.detectSeries(parsedData);

      if (series.length === 0) {
        return {
          success: false,
          error: 'No numeric data found to chart.',
        };
      }

      // Determine chart type
      const detectedType = chartType || this.detectChartType(parsedData, series);

      // Build chart configuration
      const config: ChartConfig = {
        type: detectedType,
        title: title || 'Grafico',
        data: parsedData,
        series,
        showLegend: series.length > 1,
        showGrid: true,
      };

      return {
        success: true,
        config,
      };
    } catch (error) {
      console.error('[ChartGenerator] Error generating chart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate chart',
      };
    }
  }

  /**
   * Parse raw data into chart data points
   */
  private parseData(rawData: string): ChartDataPoint[] {
    const trimmed = rawData.trim();

    // Try JSON first
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return this.normalizeJsonArray(parsed);
        }
        // Single object
        return this.normalizeJsonArray([parsed]);
      } catch {
        // Not valid JSON, continue
      }
    }

    // Try CSV
    if (trimmed.includes(',') || trimmed.includes('\t') || trimmed.includes(';')) {
      return this.parseCSV(trimmed);
    }

    // Try key-value pairs (one per line)
    if (trimmed.includes(':') || trimmed.includes('=')) {
      return this.parseKeyValuePairs(trimmed);
    }

    // Try simple list with numbers
    return this.parseSimpleList(trimmed);
  }

  /**
   * Normalize a JSON array to chart data points
   */
  private normalizeJsonArray(arr: Record<string, unknown>[]): ChartDataPoint[] {
    return arr.map((item, index) => {
      const point: ChartDataPoint = {
        name: String(item.name || item.label || item.categoria || item.category || `Item ${index + 1}`),
      };

      // Copy numeric values
      for (const [key, value] of Object.entries(item)) {
        if (key !== 'name' && key !== 'label' && key !== 'categoria' && key !== 'category') {
          if (typeof value === 'number') {
            point[key] = value;
          } else if (typeof value === 'string') {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              point[key] = num;
            }
          }
        }
      }

      return point;
    });
  }

  /**
   * Parse CSV data
   */
  private parseCSV(data: string): ChartDataPoint[] {
    const lines = data.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return [];
    }

    // Detect delimiter
    const delimiter = data.includes('\t') ? '\t' : data.includes(';') ? ';' : ',';

    // Parse header
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

    // Parse data rows
    const result: ChartDataPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ''));

      if (values.length >= headers.length) {
        const point: ChartDataPoint = {
          name: values[0] || `Item ${i}`,
        };

        for (let j = 1; j < headers.length; j++) {
          const num = parseFloat(values[j]);
          if (!isNaN(num)) {
            point[headers[j]] = num;
          }
        }

        result.push(point);
      }
    }

    return result;
  }

  /**
   * Parse key-value pairs
   */
  private parseKeyValuePairs(data: string): ChartDataPoint[] {
    const lines = data.split('\n').filter((line) => line.trim().length > 0);
    const result: ChartDataPoint[] = [];

    for (const line of lines) {
      const delimiter = line.includes(':') ? ':' : '=';
      const parts = line.split(delimiter);

      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parseFloat(parts.slice(1).join(delimiter).trim());

        if (!isNaN(value)) {
          result.push({
            name,
            value,
          });
        }
      }
    }

    return result;
  }

  /**
   * Parse simple list (one item per line, with number)
   */
  private parseSimpleList(data: string): ChartDataPoint[] {
    const lines = data.split('\n').filter((line) => line.trim().length > 0);
    const result: ChartDataPoint[] = [];

    for (const line of lines) {
      // Try to extract name and number
      const match = line.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/);

      if (match) {
        const name = match[1].trim();
        const value = parseFloat(match[2].replace(',', '.'));

        if (!isNaN(value)) {
          result.push({ name, value });
        }
      } else {
        // Just a number
        const num = parseFloat(line.replace(',', '.'));
        if (!isNaN(num)) {
          result.push({
            name: `Item ${result.length + 1}`,
            value: num,
          });
        }
      }
    }

    return result;
  }

  /**
   * Detect series from data
   */
  private detectSeries(data: ChartDataPoint[]): ChartSeries[] {
    if (data.length === 0) {
      return [];
    }

    // Get all numeric keys from first data point
    const firstPoint = data[0];
    const numericKeys = Object.keys(firstPoint).filter(
      (key) => key !== 'name' && typeof firstPoint[key] === 'number'
    );

    return numericKeys.map((key, index) => ({
      dataKey: key,
      name: this.formatSeriesName(key),
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
  }

  /**
   * Format series name for display
   */
  private formatSeriesName(key: string): string {
    // Convert camelCase or snake_case to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }

  /**
   * Detect the best chart type for the data
   */
  private detectChartType(data: ChartDataPoint[], series: ChartSeries[]): ChartType {
    // Pie chart for single series with few items
    if (series.length === 1 && data.length <= 8) {
      return 'pie';
    }

    // Line chart for time series or many data points
    if (data.length > 10) {
      return 'line';
    }

    // Bar chart for comparisons
    if (series.length === 1 || data.length <= 6) {
      return 'bar';
    }

    // Composed chart for multiple series
    if (series.length > 2) {
      return 'composed';
    }

    // Default to bar
    return 'bar';
  }

  /**
   * Extract data from conversation text
   */
  extractDataFromText(text: string): string | null {
    // Look for data patterns in text
    const lines = text.split('\n');
    const dataLines: string[] = [];
    let inDataBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for code block markers
      if (trimmed.startsWith('```')) {
        inDataBlock = !inDataBlock;
        continue;
      }

      // Check for data patterns
      const hasNumbers = /\d+/.test(trimmed);
      const hasDelimiter = /[,;:\t=]/.test(trimmed);
      const isBulletOrNumber = /^[-*•\d]+[.)\s]/.test(trimmed);

      if (inDataBlock || (hasNumbers && (hasDelimiter || isBulletOrNumber))) {
        // Clean up bullet points
        const cleaned = trimmed.replace(/^[-*•\d]+[.)\s]+/, '').trim();
        if (cleaned.length > 0) {
          dataLines.push(cleaned);
        }
      }
    }

    if (dataLines.length >= 2) {
      return dataLines.join('\n');
    }

    return null;
  }
}

// Singleton instance
let chartGeneratorService: ChartGeneratorService | null = null;

/**
 * Get the singleton ChartGeneratorService instance
 */
export function getChartGeneratorService(): ChartGeneratorService {
  if (!chartGeneratorService) {
    chartGeneratorService = new ChartGeneratorService();
  }
  return chartGeneratorService;
}
