/**
 * Generate Chart Tool
 *
 * Wraps ChartGeneratorService to expose interactive chart generation
 * as an LLM-callable platform tool.
 */

// ============================================
// Tool Definition
// ============================================

export const generateChartToolDefinition = {
  name: 'GenerateChart',
  description: 'Gera configuracoes de graficos interativos (bar, line, pie, area, composed) a partir de dados brutos. Retorna configuracao JSON para renderizacao no frontend. Auto-detecta tipo de grafico se nao especificado.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      rawData: {
        type: 'string',
        description: 'Dados brutos em CSV, JSON (array de objetos), ou texto formatado com chave:valor',
      },
      chartType: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'area', 'composed'],
        description: 'Tipo de grafico preferido (auto-detecta se omitido)',
      },
      title: {
        type: 'string',
        description: 'Titulo do grafico',
      },
    },
    required: ['rawData'],
  },
};

// ============================================
// Types
// ============================================

export interface GenerateChartInput {
  rawData: string;
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'composed';
  title?: string;
  apiKey?: string;
}

export interface GenerateChartToolResult {
  success: boolean;
  content: string;
  error?: string;
  chartData?: unknown;
}

// ============================================
// Execute Function
// ============================================

export async function executeGenerateChart(input: GenerateChartInput): Promise<GenerateChartToolResult> {
  try {
    if (!input.rawData || input.rawData.trim().length === 0) {
      return { success: false, content: '', error: 'Campo obrigatorio ausente: rawData' };
    }

    // PASSO 1: Interpretar dados com IA (OBRIGATORIO)
    const { interpretChartData } = await import('@/lib/services/generators/chart-interpret.service');
    const interpretation = await interpretChartData(input.rawData, input.apiKey);

    if (!interpretation) {
      return {
        success: false,
        content: '',
        error: 'IA nao conseguiu interpretar os dados para gerar o grafico. Forneca dados numericos claros.',
      };
    }

    if (!interpretation.extractedData || interpretation.extractedData.length < 2) {
      return {
        success: false,
        content: '',
        error: 'Dados insuficientes para gerar grafico. Minimo de 2 pontos de dados necessarios.',
      };
    }

    // PASSO 2: Gerar grafico com dados estruturados da IA
    const { getChartGeneratorService } = await import('@/lib/services/generators/chart-generator.service');
    const service = getChartGeneratorService();

    const result = service.generateChart({
      rawData: JSON.stringify(interpretation.extractedData),
      chartType: input.chartType || interpretation.chartType,
      title: input.title || interpretation.title,
    });

    if (!result.success || !result.config) {
      return { success: false, content: '', error: result.error || 'Falha ao gerar grafico' };
    }

    // Aplicar labels da interpretacao
    const config = result.config;
    if (interpretation.xAxisLabel) config.xAxisLabel = interpretation.xAxisLabel;
    if (interpretation.yAxisLabel) config.yAxisLabel = interpretation.yAxisLabel;

    const lines: string[] = [];
    lines.push('## Grafico Gerado');
    lines.push(`- Tipo: ${config.type}`);
    if (config.title) lines.push(`- Titulo: ${config.title}`);
    lines.push(`- Pontos de dados: ${config.data.length}`);
    lines.push(`- Series: ${config.series.map(s => s.name || s.dataKey).join(', ')}`);
    lines.push('');
    lines.push('### Configuracao JSON');
    lines.push('```json');
    lines.push(JSON.stringify(config, null, 2));
    lines.push('```');

    if (interpretation.insights) {
      lines.push('');
      lines.push('### Interpretacao');
      lines.push(`- ${interpretation.insights}`);
    }

    return { success: true, content: lines.join('\n'), chartData: config };
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Erro desconhecido na geracao de grafico',
    };
  }
}
