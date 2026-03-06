/* eslint-disable no-console */
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 1 minute for chart generation

/**
 * Content Studio Chart API Route
 *
 * POST - Generate an executive chart using CEO_GRAFICO
 * GET - Get available chart types and options
 *
 * Uses the chart-agent.service which reuses:
 * - chart-interpret.service: AI-powered data interpretation
 * - ceo-grafico.service: Python/matplotlib chart generation
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withAuth,
  handleApiError,
  parseJsonBody,
  apiSuccess,
  apiError,
} from '@/lib/auth/api-error-helpers';
import { getChartAgentService } from '@/lib/services/content-studio/chart-agent.service';
import { getContentArtifactRepository } from '@/lib/db/repositories/content-studio.repository';
import { checkPythonEnvironment } from '@/lib/services/ceo-grafico.service';

// =============================================
// Schema
// =============================================

const generateChartSchema = z.object({
  sourceContext: z.string().min(10, 'Dados sao obrigatorios (minimo 10 caracteres)'),
  communicativeIntent: z.string().max(500).optional(),
  chartType: z
    .enum([
      'bar',
      'line',
      'pie',
      'area',
      'waterfall',
      'scatter',
      'grouped_bar',
      'heatmap',
      'stacked_bar',
    ])
    .optional(),
  title: z.string().max(200).optional(),
  options: z
    .object({
      show_values: z.boolean().optional(),
      show_grid: z.boolean().optional(),
      figsize: z.tuple([z.number(), z.number()]).optional(),
      dpi: z.number().min(72).max(300).optional(),
      colors: z.array(z.string()).optional(),
    })
    .optional(),
  workspaceId: z.string().uuid().optional(),
  saveArtifact: z.boolean().optional().default(true),
});

// =============================================
// POST - Generate Chart
// =============================================

export const POST = withAuth(async (user, request: Request) => {
  try {
    const userId = user.id;

    // Parse and validate request body
    const bodyResult = await parseJsonBody(request, generateChartSchema);
    if ('error' in bodyResult) return bodyResult.error;
    const input = bodyResult.data;

    // Get chart agent service
    const chartAgent = getChartAgentService();

    // Generate chart
    console.log('[API] Chart generation - starting for user:', userId);
    const result = await chartAgent.generate({
      sourceContext: input.sourceContext,
      communicativeIntent: input.communicativeIntent,
      chartType: input.chartType,
      title: input.title,
      options: input.options,
    });

    if (!result.success) {
      // If AI interpretation succeeded but Python failed, return partial success
      // Frontend can render interactive chart via ECharts from interpretation data
      if (result.interpretation) {
        console.log('[API] Python unavailable, returning interpretation for client-side rendering');
        return apiSuccess({
          chart_type: result.interpretation.chartType,
          title: result.interpretation.title,
          interpretation: {
            extractedData: result.interpretation.extractedData,
            chartType: result.interpretation.chartType,
            title: result.interpretation.title,
            xAxisLabel: result.interpretation.xAxisLabel,
            yAxisLabel: result.interpretation.yAxisLabel,
          },
          latencyMs: result.latencyMs,
        });
      }
      // Log the full error server-side, return safe message to client
      const rawError = result.error || '';
      console.error('[API:chart] Generation failed:', rawError);
      const isUpstreamError =
        /API|credit|Anthropic|billing|quota|not configured|indisponivel|temporariamente/i.test(
          rawError
        );
      const safeMsg = isUpstreamError
        ? 'Servico de geracao temporariamente indisponivel. Tente novamente em alguns minutos.'
        : result.error || 'Erro ao gerar grafico. Verifique os dados e tente novamente.';
      return apiError('CHART_GENERATION_FAILED', safeMsg, isUpstreamError ? 503 : 400);
    }

    // Optionally save as artifact
    let artifactId: string | undefined;
    if (input.saveArtifact && result.pngBase64) {
      try {
        const artifactRepo = getContentArtifactRepository();
        const artifact = await artifactRepo.create({
          user_id: userId,
          workspace_id: input.workspaceId || null,
          content_type: 'chart',
          title: result.title || 'Grafico',
          description: input.communicativeIntent || null,
          source_context: input.sourceContext,
          communicative_intent: input.communicativeIntent || null,
          status: 'completed',
          metadata: {
            chartType: result.chartType,
            insights: result.insights,
          },
        });
        artifactId = artifact.id;

        // Update with final image (would need to save to storage in production)
        // For now, we return the base64 directly
      } catch (artifactError) {
        console.error('[API] Failed to save chart artifact:', artifactError);
        // Continue - chart was generated successfully
      }
    }

    console.log('[API] Chart generation completed:', {
      chartType: result.chartType,
      hasSvg: !!result.svg,
      hasPng: !!result.pngBase64,
      insightsCount: result.insights?.length || 0,
      latencyMs: result.latencyMs,
    });

    return apiSuccess({
      chart_type: result.chartType,
      title: result.title,
      svg: result.svg,
      png_base64: result.pngBase64,
      insights: result.insights,
      artifactId,
      latencyMs: result.latencyMs,
      // Structured data for client-side interactive rendering (ECharts)
      interpretation: result.interpretation
        ? {
            extractedData: result.interpretation.extractedData,
            chartType: result.interpretation.chartType,
            title: result.interpretation.title,
            xAxisLabel: result.interpretation.xAxisLabel,
            yAxisLabel: result.interpretation.yAxisLabel,
          }
        : undefined,
    });
  } catch (error) {
    // Check for Python environment errors
    if (error instanceof Error && error.message.includes('Python')) {
      return apiError('PYTHON_ENV_ERROR', 'Ambiente Python nao configurado corretamente', 503);
    }

    return handleApiError(error, 'content-studio:chart:generate');
  }
});

// =============================================
// GET - Get Available Options
// =============================================

const AVAILABLE_CHART_TYPES = [
  { id: 'auto', name: 'Automatico', description: 'A IA escolhe o melhor tipo baseado nos dados' },
  { id: 'bar', name: 'Barras', description: 'Comparacao entre categorias' },
  { id: 'line', name: 'Linhas', description: 'Tendencias e series temporais' },
  { id: 'pie', name: 'Pizza', description: 'Proporcoes e distribuicoes' },
  { id: 'area', name: 'Area', description: 'Volume acumulado ao longo do tempo' },
  { id: 'waterfall', name: 'Waterfall', description: 'Variacao entre valores' },
  { id: 'scatter', name: 'Dispersao', description: 'Correlacao entre variaveis' },
  { id: 'grouped_bar', name: 'Barras Agrupadas', description: 'Multiplas series por categoria' },
  { id: 'heatmap', name: 'Mapa de Calor', description: 'Densidade de valores em matriz' },
  { id: 'stacked_bar', name: 'Barras Empilhadas', description: 'Composicao de valores' },
];

export async function GET() {
  // Check Python environment status
  let pythonStatus: { available: boolean; pythonVersion?: string; error?: string } = {
    available: false,
  };

  try {
    pythonStatus = await checkPythonEnvironment();
  } catch {
    pythonStatus = { available: false, error: 'Erro ao verificar ambiente Python' };
  }

  return NextResponse.json({
    success: true,
    data: {
      chartTypes: AVAILABLE_CHART_TYPES,
      pythonEnvironment: pythonStatus,
      supportedFormats: ['svg', 'png'],
      defaultOptions: {
        show_values: true,
        show_grid: true,
        dpi: 150,
      },
    },
  });
}
