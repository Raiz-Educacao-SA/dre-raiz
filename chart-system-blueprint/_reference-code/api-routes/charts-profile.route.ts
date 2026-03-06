export const dynamic = 'force-dynamic';

/**
 * API Route: POST /api/charts/profile
 * Analisa dados e retorna recomendações de tipos de gráfico
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-error-helpers';
import { withObservability } from '@/lib/observability';
import {
  profileData,
  normalizeChartData,
  type ChartDataPoint,
} from '@/lib/services/ceo-grafico.service';

export interface ProfileDataRequest {
  data: ChartDataPoint[] | string;
}

const postHandler = withAuth(async (_user, request) => {
  try {
    const body = (await request.json()) as ProfileDataRequest;

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

    // Analisar dados
    const result = await profileData(normalizedData);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erro ao analisar dados:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
});

export const POST = withObservability(postHandler, { routeName: '/api/charts/profile' });
