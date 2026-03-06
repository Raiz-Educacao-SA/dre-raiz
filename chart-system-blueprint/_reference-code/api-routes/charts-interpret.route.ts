export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuth, handleApiError } from '@/lib/auth/api-error-helpers';
import { z } from 'zod';
import { ZodError } from 'zod';
import { interpretChartData } from '@/lib/services/generators/chart-interpret.service';
import { withObservability } from '@/lib/observability';

// Schema for interpret request
const interpretChartSchema = z.object({
  content: z.string().min(1).max(10000),
});

/**
 * POST /api/charts/interpret
 * Interpret a chart request using Claude AI via shared service.
 */
const postHandler = withAuth(async (_user, request) => {
  try {
    const body = await request.json();
    const { content } = interpretChartSchema.parse(body);

    const interpretation = await interpretChartData(content);

    if (!interpretation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERPRETATION_FAILED',
            message: 'Nao foi possivel interpretar o pedido. Tente fornecer dados mais claros.',
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: interpretation,
        validation: interpretation._validation || null,
        completeness: interpretation._completeness || null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return handleApiError(error, 'charts:interpret');
  }
});

export const POST = withObservability(postHandler, { routeName: '/api/charts/interpret' });
