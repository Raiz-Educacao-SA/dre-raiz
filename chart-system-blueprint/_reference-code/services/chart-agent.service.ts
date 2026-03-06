/**
 * Chart Agent Service
 *
 * Orchestrates chart generation for Content Studio by reusing existing services:
 * - chart-interpret.service.ts: AI-powered data interpretation
 * - ceo-grafico.service.ts: Python/matplotlib chart generation
 *
 * This service bridges the Content Studio workflow with the chart engine.
 */

import logger from '@/lib/observability/logger';
import { interpretChartData, type InterpretationResult } from '../chart-interpret.service';
import {
  generateChart as ceoGenerateChart,
  profileData,
  type ChartDataPoint,
  type ChartOptions,
  type ChartRecommendation,
} from '../ceo-grafico.service';
import type { StyleGuide } from './stylist-agent.service';

// ============================================
// Types
// ============================================

export interface ChartAgentInput {
  sourceContext: string;
  communicativeIntent?: string;
  chartType?: string;
  title?: string;
  styleGuide?: StyleGuide;
  options?: ChartAgentOptions;
}

export interface ChartAgentOptions {
  show_values?: boolean;
  show_grid?: boolean;
  figsize?: [number, number];
  dpi?: number;
  colors?: string[];
}

export interface ChartAgentResult {
  success: boolean;
  chartType?: string;
  title?: string;
  svg?: string;
  pngBase64?: string;
  insights?: Array<{
    type: string;
    category: string;
    indicator: string;
    score?: number;
  }>;
  recommendations?: ChartRecommendation[];
  interpretation?: InterpretationResult;
  error?: string;
  latencyMs?: number;
}

// ============================================
// Service
// ============================================

export class ChartAgentService {
  /**
   * Generate a chart from raw text data
   *
   * Flow:
   * 1. Interpret data using AI (chart-interpret.service)
   * 2. Apply style guide if provided
   * 3. Generate chart using CEO_GRAFICO (Python/matplotlib)
   */
  async generate(input: ChartAgentInput): Promise<ChartAgentResult> {
    const startTime = Date.now();

    try {
      // Step 1: Interpret data using AI
      logger.info('[ChartAgent] Interpreting data...', {
        sourceContextLength: input.sourceContext?.length,
        sourceContextPreview: input.sourceContext?.slice(0, 100),
      });

      let interpretation;
      try {
        interpretation = await interpretChartData(input.sourceContext);
      } catch (interpretError) {
        console.error('[ChartAgent] Error calling interpretChartData:', interpretError);
        const errMsg = interpretError instanceof Error ? interpretError.message : '';
        const isCreditError =
          /credit|billing|quota/i.test(errMsg) || /invalid_request_error/i.test(errMsg);
        const isConfigError = /api key|not configured/i.test(errMsg);
        return {
          success: false,
          error: isCreditError || isConfigError
            ? 'Servico de geracao temporariamente indisponivel. Tente novamente em alguns minutos.'
            : 'Erro ao interpretar os dados. Verifique se o texto contem valores numericos e tente novamente.',
          latencyMs: Date.now() - startTime,
        };
      }

      logger.info('[ChartAgent] Interpretation result:', interpretation ? 'success' : 'null');

      if (!interpretation) {
        return {
          success: false,
          error:
            'Nao foi possivel interpretar os dados. Verifique se o texto contem valores numericos. Se o problema persistir, verifique se a API da Anthropic esta configurada corretamente.',
          latencyMs: Date.now() - startTime,
        };
      }

      // Validate minimum data points
      if (interpretation.extractedData.length < 2) {
        return {
          success: false,
          error:
            'Dados insuficientes. Sao necessarios pelo menos 2 pontos de dados para gerar um grafico.',
          latencyMs: Date.now() - startTime,
        };
      }

      logger.info('[ChartAgent] Interpretation complete:', {
        chartType: interpretation.chartType,
        dataPoints: interpretation.extractedData.length,
      });

      // Step 2: Determine chart type
      const chartType = input.chartType || interpretation.chartType || 'bar';

      // Step 3: Apply style guide colors if provided
      const chartOptions = this.buildChartOptions(input.options, input.styleGuide);

      // Step 4: Generate chart using CEO_GRAFICO
      logger.info('[ChartAgent] Generating chart via CEO_GRAFICO...');
      const chartResult = await ceoGenerateChart(interpretation.extractedData as ChartDataPoint[], {
        chartType,
        title: input.title || interpretation.title,
        chartOptions,
      });

      if (!chartResult.success) {
        return {
          success: false,
          error: chartResult.error || 'Erro ao gerar grafico',
          interpretation,
          latencyMs: Date.now() - startTime,
        };
      }

      logger.info('[ChartAgent] Chart generated successfully');

      return {
        success: true,
        chartType: chartResult.chart_type || chartType,
        title: input.title || interpretation.title,
        svg: chartResult.svg,
        pngBase64: chartResult.png_base64,
        insights: chartResult.insights?.map((i) => ({
          type: i.type,
          category: i.category,
          indicator: i.indicator,
          score: i.score,
        })),
        interpretation,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[ChartAgent] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Profile data and get chart type recommendations
   */
  async getRecommendations(sourceContext: string): Promise<{
    success: boolean;
    recommendations?: ChartRecommendation[];
    interpretation?: InterpretationResult;
    error?: string;
  }> {
    try {
      // First interpret the data
      const interpretation = await interpretChartData(sourceContext);

      if (!interpretation || interpretation.extractedData.length < 2) {
        return {
          success: false,
          error: 'Dados insuficientes para analise',
        };
      }

      // Get recommendations from CEO_GRAFICO
      const profileResult = await profileData(interpretation.extractedData as ChartDataPoint[]);

      return {
        success: profileResult.success,
        recommendations: profileResult.recommendations,
        interpretation,
        error: profileResult.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao analisar dados',
      };
    }
  }

  /**
   * Build chart options from input options and style guide
   */
  private buildChartOptions(options?: ChartAgentOptions, styleGuide?: StyleGuide): ChartOptions {
    const chartOptions: ChartOptions = {};

    // Apply input options
    if (options?.show_values !== undefined) {
      chartOptions.show_values = options.show_values;
    }
    if (options?.show_grid !== undefined) {
      chartOptions.show_grid = options.show_grid;
    }
    if (options?.figsize) {
      chartOptions.figsize = options.figsize;
    }
    if (options?.dpi) {
      chartOptions.dpi = options.dpi;
    }

    // Apply style guide colors
    if (styleGuide?.colorPalette) {
      const colors: string[] = [];
      if (styleGuide.colorPalette.primary) colors.push(styleGuide.colorPalette.primary);
      if (styleGuide.colorPalette.secondary) colors.push(styleGuide.colorPalette.secondary);
      if (styleGuide.colorPalette.accent) colors.push(styleGuide.colorPalette.accent);
      if (styleGuide.colorPalette.neutral) colors.push(styleGuide.colorPalette.neutral);
      if (colors.length > 0) {
        chartOptions.colors = colors;
      }
    }

    // Apply style guide font
    if (styleGuide?.typographyIcons?.fontFamily) {
      chartOptions.font_family = styleGuide.typographyIcons.fontFamily;
    }

    // Apply custom colors from options
    if (options?.colors) {
      chartOptions.colors = options.colors;
    }

    return chartOptions;
  }
}

// ============================================
// Singleton
// ============================================

let chartAgentService: ChartAgentService | null = null;

export function getChartAgentService(): ChartAgentService {
  if (!chartAgentService) {
    chartAgentService = new ChartAgentService();
  }
  return chartAgentService;
}
