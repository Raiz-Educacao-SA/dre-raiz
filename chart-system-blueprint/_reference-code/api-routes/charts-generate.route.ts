export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * API Route: POST /api/charts/generate
 * Gera um gráfico executivo usando CEO_GRAFICO
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-error-helpers';
import { withObservability } from '@/lib/observability';
import {
  generateChart,
  normalizeChartData,
  type ChartDataPoint,
  type ChartOptions,
} from '@/lib/services/ceo-grafico.service';

export interface GenerateChartRequest {
  data: ChartDataPoint[] | string;
  chartType?: string;
  title?: string;
  options?: ChartOptions;
}

const postHandler = withAuth(async (_user, request) => {
  try {
    const body = (await request.json()) as GenerateChartRequest;

    // Validar dados
    if (!body.data) {
      return NextResponse.json({ success: false, error: 'Dados não fornecidos' }, { status: 400 });
    }

    // Normalizar dados
    const normalizedData = normalizeChartData(body.data);

    if (normalizedData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum dado válido encontrado' },
        { status: 400 }
      );
    }

    // Gerar gráfico
    const result = await generateChart(normalizedData, {
      chartType: body.chartType,
      title: body.title,
      chartOptions: body.options,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, traceback: result.traceback },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erro ao gerar gráfico:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
});

export const POST = withObservability(postHandler, { routeName: '/api/charts/generate' });
