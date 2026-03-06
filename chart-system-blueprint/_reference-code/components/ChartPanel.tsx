'use client';

/**
 * ChartPanel - Componente Unificado de Graficos
 *
 * Combina as funcionalidades de ChartPreview (rapido/interativo) e
 * ChartExecutivePanel (executivo/insights) em um unico componente.
 *
 * Modo padrao: "Rapido Primeiro" - Preview interativo instantaneo com Recharts
 * Opcao: "Analise Executiva" - Enriquece com insights via CEO_GRAFICO
 */

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeSvg, sanitizeHighlight } from '@/lib/utils/sanitize';
import {
  X,
  Download,
  BarChart3,
  Loader2,
  Lightbulb,
  ChevronDown,
  Sparkles,
  CheckCircle,
  AlertCircle,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { ChartConfig, ChartType } from '@/lib/services/generators/chart-generator.service';
import { CHART_COLORS_HEX } from '@/lib/ui/chart-colors';
import type { ChartExecutiveConfig, ChartRecommendation } from './ChartExecutivePanel';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';

// =============================================================================
// TIPOS
// =============================================================================

export type ChartPanelMode = 'interactive' | 'executive';

export interface ChartPanelProps {
  /** Configuração do grafico interativo (Recharts) */
  interactiveConfig: ChartConfig | null;
  /** Configuração do grafico executivo (CEO_GRAFICO) */
  executiveConfig: ChartExecutiveConfig | null;
  /** Modo atual do painel */
  mode: ChartPanelMode;
  /** Se esta gerando grafico interativo */
  isGeneratingInteractive: boolean;
  /** Se esta gerando grafico executivo */
  isGeneratingExecutive: boolean;
  /** Erro ao gerar */
  error: string | null;
  /** Callback para fechar o painel */
  onClose: () => void;
  /** Callback para mudar tipo de grafico interativo */
  onChangeType?: (type: ChartType) => void;
  /** Callback para solicitar analise executiva */
  onRequestExecutive?: () => void;
  /** Callback para mudar tipo de grafico executivo */
  onChangeExecutiveType?: (type: string) => void;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'bar', label: 'Barras', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { value: 'line', label: 'Linhas', icon: <LineChartIcon className="w-3.5 h-3.5" /> },
  { value: 'area', label: 'Area', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { value: 'pie', label: 'Pizza', icon: <PieChartIcon className="w-3.5 h-3.5" /> },
  { value: 'composed', label: 'Composto', icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

const EXECUTIVE_CHART_TYPE_LABELS: Record<string, string> = {
  bar: 'Barras',
  bar_chart: 'Barras',
  line: 'Linhas',
  pie: 'Pizza',
  area: 'Area',
  grouped_bar: 'Barras Agrupadas',
  waterfall: 'Cascata',
  scatter: 'Dispersao',
  heatmap: 'Mapa de Calor',
  stacked_bar: 'Barras Empilhadas',
  stacked100_bar: 'Barras 100%',
};

const DEFAULT_COLORS = CHART_COLORS_HEX;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ChartPanel({
  interactiveConfig,
  executiveConfig,
  mode,
  isGeneratingInteractive,
  isGeneratingExecutive,
  error,
  onClose,
  onChangeType,
  onRequestExecutive,
  onChangeExecutiveType,
}: ChartPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<ChartType>(interactiveConfig?.type || 'bar');
  const [showInsights, setShowInsights] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isLoading = isGeneratingInteractive || isGeneratingExecutive;
  const hasInteractive = interactiveConfig !== null;
  const hasExecutive = executiveConfig !== null && executiveConfig.success;
  const showExecutiveContent = mode === 'executive' && hasExecutive;

  // Handler para mudanca de tipo (modo interativo)
  const handleTypeChange = useCallback(
    (type: ChartType) => {
      setSelectedType(type);
      if (onChangeType) {
        onChangeType(type);
      }
    },
    [onChangeType]
  );

  // Handler para download PNG (modo interativo via canvas)
  const handleDownloadPng = useCallback(() => {
    if (showExecutiveContent && executiveConfig?.png_base64) {
      // Modo executivo: usar PNG do backend
      const link = document.createElement('a');
      link.href = executiveConfig.png_base64;
      link.download = `grafico-executivo-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Modo interativo: converter SVG para PNG
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.download = `grafico-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = url;
  }, [showExecutiveContent, executiveConfig?.png_base64]);

  // Handler para download SVG (modo executivo)
  const handleDownloadSvg = useCallback(() => {
    if (!executiveConfig?.svg) return;

    const blob = new Blob([executiveConfig.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grafico-executivo-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [executiveConfig?.svg]);

  // Nao renderizar se nao ha nada para mostrar
  if (!isLoading && !hasInteractive && !hasExecutive && !error) {
    return null;
  }

  const currentType = interactiveConfig?.type || selectedType;

  return (
    <div
      className={cn(
        'bg-[var(--qi-surface)]',
        'border border-[var(--qi-border)]',
        'rounded-[var(--qi-radius-md)]',
        'overflow-hidden',
        'transition-all duration-300',
        isFullscreen
          ? 'fixed inset-4 z-50 mx-0 mb-0 shadow-2xl'
          : 'mx-[var(--qi-spacing-lg)] mb-[var(--qi-spacing-md)]'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between',
          'px-[var(--qi-spacing-md)] py-[var(--qi-spacing-sm)]',
          'bg-[var(--qi-bg-secondary)]',
          'border-b border-[var(--qi-border)]'
        )}
      >
        <div className="flex items-center gap-[var(--qi-spacing-sm)]">
          <BarChart3
            strokeWidth={1.75}
            className={cn(
              'w-4 h-4',
              isLoading ? 'text-[var(--qi-interactive)] animate-pulse' : 'text-[var(--qi-text-secondary)]'
            )}
          />
          <span className="text-[var(--qi-font-size-body-sm)] font-medium text-[var(--qi-text-primary)]">
            {isGeneratingExecutive
              ? 'Gerando análise executiva...'
              : isGeneratingInteractive
                ? 'Gerando gráfico...'
                : interactiveConfig?.title || 'Gráfico'
            }
          </span>

          {/* Badge de modo */}
          {showExecutiveContent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-semantic-warning-bg text-semantic-warning">
              <Sparkles className="w-3 h-3" />
              Executivo
            </span>
          )}

          {/* Badge de compliance (modo executivo) */}
          {showExecutiveContent && executiveConfig?.compliance?.passed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-semantic-success-bg text-semantic-success">
              <CheckCircle className="w-3 h-3" />
              Compliance OK
            </span>
          )}
        </div>

        <div className="flex items-center gap-[var(--qi-spacing-xs)]">
          {/* Seletor de tipo - modo interativo */}
          {hasInteractive && !showExecutiveContent && (
            <select
              value={currentType}
              onChange={(e) => handleTypeChange(e.target.value as ChartType)}
              className={cn(
                'px-[var(--qi-spacing-sm)] py-[var(--qi-spacing-xs)]',
                'text-[var(--qi-font-size-body-xs)]',
                'bg-[var(--qi-surface)]',
                'border border-[var(--qi-border)]',
                'rounded-[var(--qi-radius-sm)]',
                'text-[var(--qi-text-primary)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--qi-interactive)]'
              )}
            >
              {CHART_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          )}

          {/* Seletor de tipo - modo executivo com recomendações */}
          {showExecutiveContent && executiveConfig?.recommendations && executiveConfig.recommendations.length > 1 && onChangeExecutiveType && (
            <div className="relative">
              <button
                onClick={() => setShowTypeSelector(!showTypeSelector)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1',
                  'text-[var(--qi-font-size-body-xs)]',
                  'text-[var(--qi-text-secondary)]',
                  'hover:bg-[var(--qi-bg-tertiary)]',
                  'rounded-[var(--qi-radius-sm)]',
                  'transition-colors'
                )}
              >
                Alterar tipo
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showTypeSelector && (
                <div className="absolute right-0 mt-1 w-56 bg-[var(--qi-surface)] rounded-[var(--qi-radius-md)] shadow-lg border border-[var(--qi-border)] z-10">
                  {executiveConfig.recommendations.map((rec: ChartRecommendation) => (
                    <button
                      key={rec.type}
                      onClick={() => {
                        onChangeExecutiveType(rec.type);
                        setShowTypeSelector(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-[var(--qi-font-size-body-sm)]',
                        'hover:bg-[var(--qi-bg-secondary)]',
                        rec.type === executiveConfig.chart_type && 'bg-[var(--qi-accent-muted)]'
                      )}
                    >
                      <span>{EXECUTIVE_CHART_TYPE_LABELS[rec.type] || rec.type}</span>
                      <span className="text-[var(--qi-text-tertiary)] text-[var(--qi-font-size-body-xs)]">
                        {Math.round(rec.score * 100)}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botao Análise Executiva (quando nao esta no modo executivo) */}
          {hasInteractive && !showExecutiveContent && !isGeneratingExecutive && onRequestExecutive && (
            <button
              type="button"
              onClick={onRequestExecutive}
              className={cn(
                'flex items-center gap-1.5',
                'px-[var(--qi-spacing-sm)] py-[var(--qi-spacing-xs)]',
                'text-[var(--qi-font-size-body-xs)] font-medium',
                'bg-semantic-warning-bg text-semantic-warning',
                'border border-semantic-warning/20',
                'rounded-[var(--qi-radius-sm)]',
                'hover:opacity-90',
                'transition-colors duration-[var(--qi-duration-fast)]'
              )}
              title="Gera versão com insights e compliance visual"
            >
              <Sparkles strokeWidth={1.75} className="w-3.5 h-3.5" />
              Análise Executiva
            </button>
          )}

          {/* Loading indicator para análise executiva */}
          {isGeneratingExecutive && (
            <div className="flex items-center gap-1.5 px-2 py-1 text-[var(--qi-font-size-body-xs)] text-semantic-warning">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analisando...
            </div>
          )}

          {/* Download PNG */}
          {(hasInteractive || hasExecutive) && !isLoading && (
            <button
              type="button"
              onClick={handleDownloadPng}
              className={cn(
                'p-[var(--qi-spacing-xs)]',
                'rounded-[var(--qi-radius-sm)]',
                'text-[var(--qi-text-tertiary)]',
                'hover:text-[var(--qi-text-primary)] hover:bg-[var(--qi-bg-tertiary)]',
                'transition-colors duration-[var(--qi-duration-fast)]'
              )}
              title="Download PNG"
            >
              <Download strokeWidth={1.75} className="w-4 h-4" />
            </button>
          )}

          {/* Download SVG (apenas modo executivo) */}
          {showExecutiveContent && executiveConfig?.svg && (
            <button
              type="button"
              onClick={handleDownloadSvg}
              className={cn(
                'px-2 py-1',
                'rounded-[var(--qi-radius-sm)]',
                'text-[var(--qi-font-size-body-xs)]',
                'text-[var(--qi-text-tertiary)]',
                'hover:text-[var(--qi-text-primary)] hover:bg-[var(--qi-bg-tertiary)]',
                'transition-colors duration-[var(--qi-duration-fast)]'
              )}
              title="Download SVG"
            >
              SVG
            </button>
          )}

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={cn(
              'p-[var(--qi-spacing-xs)]',
              'rounded-[var(--qi-radius-sm)]',
              'text-[var(--qi-text-tertiary)]',
              'hover:text-[var(--qi-text-primary)] hover:bg-[var(--qi-bg-tertiary)]',
              'transition-colors duration-[var(--qi-duration-fast)]',
              'min-w-[44px] min-h-[44px] flex items-center justify-center' // Touch-friendly
            )}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? (
              <Minimize2 strokeWidth={1.75} className="w-4 h-4" />
            ) : (
              <Maximize2 strokeWidth={1.75} className="w-4 h-4" />
            )}
          </button>

          {/* Fechar */}
          <button
            type="button"
            onClick={() => {
              setIsFullscreen(false);
              onClose();
            }}
            className={cn(
              'p-[var(--qi-spacing-xs)]',
              'rounded-[var(--qi-radius-sm)]',
              'text-[var(--qi-text-tertiary)]',
              'hover:text-[var(--qi-text-primary)] hover:bg-[var(--qi-bg-tertiary)]',
              'transition-colors duration-[var(--qi-duration-fast)]',
              'min-w-[44px] min-h-[44px] flex items-center justify-center' // Touch-friendly
            )}
            title="Fechar"
          >
            <X strokeWidth={1.75} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-[var(--qi-spacing-md)]">
        {/* Loading state - Gerando */}
        {isGeneratingInteractive && !hasInteractive && (
          <div className="flex flex-col items-center justify-center py-[var(--qi-spacing-xl)]">
            <Loader2
              strokeWidth={1.75}
              className="w-8 h-8 text-[var(--qi-interactive)] animate-spin mb-[var(--qi-spacing-md)]"
            />
            <p className="text-[var(--qi-font-size-body-sm)] text-[var(--qi-text-secondary)]">
              Gerando gráfico...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div
            className={cn(
              'flex items-start gap-3 p-[var(--qi-spacing-md)]',
              'bg-semantic-error-bg',
              'rounded-[var(--qi-radius-sm)]'
            )}
          >
            <AlertCircle className="w-5 h-5 text-semantic-error flex-shrink-0 mt-0.5" />
            <p className="text-semantic-error text-[var(--qi-font-size-body-sm)]">
              {error}
            </p>
          </div>
        )}

        {/* Gráfico - Modo Executivo (SVG/PNG) */}
        {showExecutiveContent && (executiveConfig?.svg || executiveConfig?.png_base64) && (
          <div ref={chartRef} className="w-full flex justify-center bg-[var(--qi-surface)] rounded-[var(--qi-radius-sm)] overflow-hidden">
            {executiveConfig.svg ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeSvg(executiveConfig.svg) }} />
            ) : executiveConfig.png_base64 ? (
              /* eslint-disable-next-line @next/next/no-img-element -- base64 data URIs cannot be optimized by next/image */
              <img src={executiveConfig.png_base64} alt="Gráfico Executivo" className="w-full h-auto" />
            ) : null}
          </div>
        )}

        {/* Gráfico - Modo Interativo (Recharts) */}
        {!showExecutiveContent && hasInteractive && !isGeneratingInteractive && (
          <div
            ref={chartRef}
            className={cn(
              'w-full',
              'min-h-[300px]', // Mobile minimum height
              isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[300px] md:h-[400px]'
            )}
          >
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(interactiveConfig, currentType)}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Insights (modo executivo) */}
      {showExecutiveContent && executiveConfig?.phrases && executiveConfig.phrases.length > 0 && (
        <div className="border-t border-[var(--qi-border)]">
          <button
            onClick={() => setShowInsights(!showInsights)}
            className={cn(
              'w-full flex items-center justify-between',
              'px-[var(--qi-spacing-md)] py-[var(--qi-spacing-sm)]',
              'hover:bg-[var(--qi-bg-secondary)]',
              'transition-colors'
            )}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-semantic-warning" />
              <span className="text-[var(--qi-font-size-body-sm)] font-medium text-[var(--qi-text-primary)]">
                Insights ({executiveConfig.phrases.length})
              </span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-[var(--qi-text-tertiary)]',
                'transition-transform',
                showInsights && 'rotate-180'
              )}
            />
          </button>
          {showInsights && (
            <div className="px-[var(--qi-spacing-md)] pb-[var(--qi-spacing-md)]">
              <ul className="space-y-2">
                {executiveConfig.phrases.map((phrase, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-[var(--qi-font-size-body-sm)] text-[var(--qi-text-secondary)]"
                  >
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--qi-accent-muted)] text-[var(--qi-interactive)] text-[var(--qi-font-size-body-xs)] font-medium">
                      {index + 1}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHighlight(phrase.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--qi-text-primary)]">$1</strong>')) }} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Compliance warnings (modo executivo) */}
      {showExecutiveContent && executiveConfig?.compliance && executiveConfig.compliance.warnings.length > 0 && (
        <div className={cn(
          'border-t border-[var(--qi-border)]',
          'px-[var(--qi-spacing-md)] py-[var(--qi-spacing-sm)]',
          'bg-semantic-warning-bg'
        )}>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-semantic-warning flex-shrink-0 mt-0.5" />
            <div className="text-[var(--qi-font-size-body-xs)] text-semantic-warning">
              <p className="font-medium">Avisos de compliance:</p>
              <ul className="mt-1 list-disc list-inside">
                {executiveConfig.compliance.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Função DE RENDERIZACAO DO GRAFICO (RECHARTS)
// =============================================================================

function renderChart(config: ChartConfig, type: ChartType): JSX.Element {
  const { data, series, showLegend, showGrid } = config;

  switch (type) {
    case 'bar':
      return (
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} />
          ))}
        </BarChart>
      );

    case 'line':
      return (
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ fill: s.color }}
            />
          ))}
        </LineChart>
      );

    case 'area':
      return (
        <AreaChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.3}
            />
          ))}
        </AreaChart>
      );

    case 'pie':
      return (
        <PieChart>
          <Pie
            data={data}
            dataKey={series[0]?.dataKey || 'value'}
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={series[index % series.length]?.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </PieChart>
      );

    case 'composed':
      return (
        <ComposedChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {showLegend && <Legend />}
          {series.map((s, index) => {
            const chartType = s.type || ['bar', 'line', 'area'][index % 3];
            switch (chartType) {
              case 'line':
                return (
                  <Line
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                  />
                );
              case 'area':
                return (
                  <Area
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.3}
                  />
                );
              default:
                return (
                  <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} />
                );
            }
          })}
        </ComposedChart>
      );

    default:
      return (
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} />
          ))}
        </BarChart>
      );
  }
}

export default ChartPanel;
