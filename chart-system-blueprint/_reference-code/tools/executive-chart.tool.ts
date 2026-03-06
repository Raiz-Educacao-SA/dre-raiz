/**
 * Executive Chart Tool
 *
 * Wraps CeoGraficoService to expose high-quality executive chart
 * generation (Python/matplotlib) as an LLM-callable platform tool.
 */

// ============================================
// Tool Definition
// ============================================

export const executiveChartToolDefinition = {
  name: 'ExecutiveChart',
  description: 'Gera graficos executivos de alta qualidade via Python (matplotlib). Produz SVG e PNG. Suporta: bar, line, pie, waterfall, scatter, area, grouped_bar, heatmap, stacked_bar, combo, bullet, infographic. Requer Python3 com matplotlib/pandas/numpy instalados.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['generate', 'profile', 'insights'],
        description: 'Acao: generate (gerar grafico), profile (analisar dados e recomendar tipo), insights (extrair insights sem grafico)',
      },
      data: {
        type: 'array',
        items: { type: 'object' },
        description: 'Array de objetos com os dados. Ex: [{"mes": "Jan", "valor": 100}, {"mes": "Fev", "valor": 150}]',
      },
      chartType: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'waterfall', 'scatter', 'area', 'grouped_bar', 'heatmap', 'stacked_bar', 'stacked100_bar', 'combo', 'bullet', 'infographic'],
        description: 'Tipo de grafico (auto-seleciona se omitido, baseado no perfil dos dados)',
      },
      title: {
        type: 'string',
        description: 'Titulo do grafico',
      },
      options: {
        type: 'object',
        description: 'Opcoes avancadas de renderizacao',
        properties: {
          figsize: { type: 'array', items: { type: 'number' }, description: 'Dimensoes [largura, altura] em polegadas' },
          show_values: { type: 'boolean', description: 'Mostrar valores nas barras/pontos' },
          donut: { type: 'boolean', description: 'Formato donut para pie charts' },
          x_col: { type: 'string', description: 'Coluna para eixo X' },
          y_col: { type: 'string', description: 'Coluna para eixo Y' },
          color_palette: { type: 'string', description: 'Paleta de cores' },
        },
      },
    },
    required: ['action', 'data'],
  },
};

// ============================================
// Types
// ============================================

export interface ExecutiveChartInput {
  action: 'generate' | 'profile' | 'insights';
  data: Record<string, unknown>[];
  chartType?: string;
  title?: string;
  options?: Record<string, unknown>;
}

export interface ExecutiveChartToolResult {
  success: boolean;
  content: string;
  error?: string;
}

// ============================================
// Execute Function
// ============================================

export async function executeExecutiveChart(input: ExecutiveChartInput): Promise<ExecutiveChartToolResult> {
  try {
    if (!input.action) {
      return { success: false, content: '', error: 'Campo obrigatorio ausente: action' };
    }
    if (!input.data || input.data.length === 0) {
      return { success: false, content: '', error: 'Campo obrigatorio ausente: data (array de objetos)' };
    }

    // Check Python environment first
    const ceoGrafico = await import('@/lib/services/ceo-grafico.service');
    const envCheck = await ceoGrafico.checkPythonEnvironment();

    if (!envCheck.available) {
      return {
        success: false,
        content: '',
        error: `Python nao disponivel: ${envCheck.error || 'Python3 com matplotlib/pandas/numpy nao encontrado'}. Execute "raiz setup" para instalar dependencias.`,
      };
    }

    switch (input.action) {
      case 'generate': {
        // Validar que cada item tem pelo menos 1 valor numerico
        const hasValidData = input.data.every(item =>
          Object.values(item).some(v => typeof v === 'number')
        );

        if (!hasValidData) {
          // Dados nao tem formato correto - passar por interpretacao IA primeiro
          const { interpretChartData } = await import('@/lib/services/generators/chart-interpret.service');
          const interpretation = await interpretChartData(JSON.stringify(input.data));

          if (!interpretation || !interpretation.extractedData || interpretation.extractedData.length < 2) {
            return {
              success: false,
              content: '',
              error: 'Dados invalidos: cada item deve conter pelo menos um valor numerico. Exemplo: [{"mes": "Jan", "valor": 100}]',
            };
          }

          // Usar dados interpretados pela IA
          input.data = interpretation.extractedData as Record<string, unknown>[];
          if (!input.chartType && interpretation.chartType) {
            input.chartType = interpretation.chartType;
          }
          if (!input.title && interpretation.title) {
            input.title = interpretation.title;
          }
        }

        const result = await ceoGrafico.generateChart(input.data, {
          chart_type: input.chartType,
          title: input.title,
          ...input.options,
        });

        if (!result.success) {
          return { success: false, content: '', error: result.error || 'Falha ao gerar grafico' };
        }

        const lines: string[] = [];
        lines.push('## Grafico Executivo Gerado');
        lines.push(`- Tipo: ${result.chart_type || input.chartType || 'auto'}`);
        if (input.title) lines.push(`- Titulo: ${input.title}`);

        if (result.insights && result.insights.length > 0) {
          lines.push('');
          lines.push('### Insights');
          for (const insight of result.insights) {
            lines.push(`- ${insight.text || insight.description || JSON.stringify(insight)}`);
          }
        }

        if (result.recommendations && result.recommendations.length > 0) {
          lines.push('');
          lines.push('### Recomendacoes');
          for (const rec of result.recommendations) {
            lines.push(`- ${rec.text || rec.description || JSON.stringify(rec)}`);
          }
        }

        if (result.svg) {
          lines.push('');
          lines.push(`[SVG_CHART]${result.svg}[/SVG_CHART]`);
        }
        if (result.png_base64) {
          lines.push(`[PNG_BASE64]${result.png_base64}[/PNG_BASE64]`);
        }

        return { success: true, content: lines.join('\n') };
      }

      case 'profile': {
        const result = await ceoGrafico.profileData(input.data);

        if (!result.success) {
          return { success: false, content: '', error: result.error || 'Falha ao perfilar dados' };
        }

        const lines: string[] = [];
        lines.push('## Perfil dos Dados');
        lines.push(JSON.stringify(result.profile, null, 2));

        if (result.recommended_charts) {
          lines.push('');
          lines.push('### Graficos Recomendados');
          for (const chart of result.recommended_charts) {
            lines.push(`- ${chart}`);
          }
        }

        return { success: true, content: lines.join('\n') };
      }

      case 'insights': {
        const result = await ceoGrafico.generateInsights(input.data);

        if (!result.success) {
          return { success: false, content: '', error: result.error || 'Falha ao gerar insights' };
        }

        const lines: string[] = [];
        lines.push('## Insights dos Dados');

        if (result.insights && result.insights.length > 0) {
          for (const insight of result.insights) {
            lines.push(`- ${insight.text || insight.description || JSON.stringify(insight)}`);
          }
        }

        if (result.phrases && result.phrases.length > 0) {
          lines.push('');
          lines.push('### Frases Narrativas');
          for (const phrase of result.phrases) {
            lines.push(`- ${phrase}`);
          }
        }

        return { success: true, content: lines.join('\n') };
      }

      default:
        return { success: false, content: '', error: `Acao desconhecida: ${input.action}` };
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Erro desconhecido na geracao de grafico executivo',
    };
  }
}
