'use client';

/**
 * ChartExecutivePanel
 * Painel para exibição de gráficos executivos gerados pelo CEO_GRAFICO
 */

import React, { useState, useCallback } from 'react';
import { sanitizeSvg, sanitizeHighlight } from '@/lib/utils/sanitize';
import {
  X,
  Download,
  RefreshCw,
  ChevronDown,
  Lightbulb,
  BarChart2,
  LineChart,
  PieChart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

export interface ChartRecommendation {
  type: string;
  score: number;
  rule_id: string;
  rationale: string;
}

export interface ChartInsight {
  type: string;
  category: string;
  indicator: string;
  score: number;
  [key: string]: unknown;
}

export interface ComplianceResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  warnings: string[];
  errors: string[];
}

export interface ChartExecutiveConfig {
  success: boolean;
  chart_type?: string;
  svg?: string;
  png_base64?: string;
  insights?: ChartInsight[];
  phrases?: string[];
  recommendations?: ChartRecommendation[];
  compliance?: ComplianceResult;
  error?: string;
  downloadUrl?: string;
}

export interface ChartExecutivePanelProps {
  config: ChartExecutiveConfig | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onChangeType?: (type: string) => void;
  onRegenerate?: () => void;
}

// =============================================================================
// MAPEAMENTO DE ÍCONES
// =============================================================================

const CHART_TYPE_ICONS: Record<string, React.ReactNode> = {
  bar: <BarChart2 className="h-4 w-4" />,
  bar_chart: <BarChart2 className="h-4 w-4" />,
  line: <LineChart className="h-4 w-4" />,
  pie: <PieChart className="h-4 w-4" />,
  area: <TrendingUp className="h-4 w-4" />,
  grouped_bar: <BarChart2 className="h-4 w-4" />,
  waterfall: <BarChart2 className="h-4 w-4" />,
  scatter: <TrendingUp className="h-4 w-4" />,
  heatmap: <BarChart2 className="h-4 w-4" />,
};

const CHART_TYPE_LABELS: Record<string, string> = {
  bar: 'Barras',
  bar_chart: 'Barras',
  line: 'Linhas',
  pie: 'Pizza',
  area: 'Área',
  grouped_bar: 'Barras Agrupadas',
  waterfall: 'Cascata',
  scatter: 'Dispersão',
  heatmap: 'Mapa de Calor',
  stacked_bar: 'Barras Empilhadas',
  stacked100_bar: 'Barras 100%',
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ChartExecutivePanel({
  config,
  isLoading,
  error,
  onClose,
  onChangeType,
  onRegenerate,
}: ChartExecutivePanelProps) {
  const [showInsights, setShowInsights] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Handler para download PNG
  const handleDownloadPng = useCallback(async () => {
    // Prefer URL-based download (binary store)
    if (config?.downloadUrl) {
      try {
        const res = await fetch(config.downloadUrl);
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `grafico-executivo-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.error('[ChartExecutivePanel] URL download failed:', err);
      }
    }
    // Fallback to base64
    if (!config?.png_base64) return;
    const link = document.createElement('a');
    link.href = config.png_base64;
    link.download = `grafico-executivo-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [config?.png_base64, config?.downloadUrl]);

  // Handler para download SVG
  const handleDownloadSvg = useCallback(async () => {
    // Prefer URL-based download for large SVGs (binary store)
    if (!config?.svg && config?.downloadUrl) {
      try {
        const res = await fetch(config.downloadUrl);
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `grafico-executivo-${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.error('[ChartExecutivePanel] URL download failed:', err);
      }
    }
    if (!config?.svg) return;
    const blob = new Blob([config.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grafico-executivo-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [config?.svg, config?.downloadUrl]);

  // Renderizar estado de loading
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--qi-border)] bg-[var(--qi-surface)] p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--qi-text-primary)]">Gráfico Executivo</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-[var(--qi-bg-secondary)]"
          >
            <X className="h-5 w-5 text-[var(--qi-text-tertiary)]" />
          </button>
        </div>
        <div className="flex h-64 flex-col items-center justify-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-semantic-info"></div>
          <p className="text-[var(--qi-text-secondary)]">Gerando gráfico executivo...</p>
          <p className="mt-2 text-sm text-[var(--qi-text-tertiary)]">
            Analisando dados e aplicando compliance visual
          </p>
        </div>
      </div>
    );
  }

  // Renderizar estado de erro
  if (error || (config && !config.success)) {
    return (
      <div className="border-semantic-error/20 rounded-lg border bg-[var(--qi-surface)] p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-semantic-error">Erro ao Gerar Gráfico</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-[var(--qi-bg-secondary)]"
          >
            <X className="h-5 w-5 text-[var(--qi-text-tertiary)]" />
          </button>
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-semantic-error-bg p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-semantic-error" />
          <div>
            <p className="text-semantic-error">{error || config?.error || 'Erro desconhecido'}</p>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="mt-3 flex items-center gap-2 text-sm text-semantic-error hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Renderizar gráfico
  if (!config) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--qi-border)] bg-[var(--qi-surface)] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--qi-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-[var(--qi-text-primary)]">Gráfico Executivo</h3>
          {config.chart_type && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-semantic-info-bg px-2 py-0.5 text-xs font-medium text-semantic-info">
              {CHART_TYPE_ICONS[config.chart_type]}
              {CHART_TYPE_LABELS[config.chart_type] || config.chart_type}
            </span>
          )}
          {config.compliance?.passed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-semantic-success-bg px-2 py-0.5 text-xs font-medium text-semantic-success">
              <CheckCircle className="h-3 w-3" />
              Compliance OK
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de tipo */}
          {config.recommendations && config.recommendations.length > 1 && onChangeType && (
            <div className="relative">
              <button
                onClick={() => setShowTypeSelector(!showTypeSelector)}
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-[var(--qi-text-secondary)] transition-colors hover:bg-[var(--qi-bg-secondary)]"
              >
                Alterar tipo
                <ChevronDown className="h-4 w-4" />
              </button>
              {showTypeSelector && (
                <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-[var(--qi-border)] bg-[var(--qi-surface)] shadow-lg">
                  {config.recommendations.map((rec) => (
                    <button
                      key={rec.type}
                      onClick={() => {
                        onChangeType(rec.type);
                        setShowTypeSelector(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-[var(--qi-bg-secondary)] ${
                        rec.type === config.chart_type ? 'bg-semantic-info-bg' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {CHART_TYPE_ICONS[rec.type]}
                        <span>{CHART_TYPE_LABELS[rec.type] || rec.type}</span>
                      </div>
                      <span className="text-xs text-[var(--qi-text-tertiary)]">
                        {Math.round(rec.score * 100)}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Download buttons */}
          <button
            onClick={handleDownloadPng}
            disabled={!config.png_base64 && !config.downloadUrl}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--qi-text-secondary)] transition-colors hover:bg-[var(--qi-bg-secondary)] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            PNG
          </button>
          <button
            onClick={handleDownloadSvg}
            disabled={!config.svg && !config.downloadUrl}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--qi-text-secondary)] transition-colors hover:bg-[var(--qi-bg-secondary)] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            SVG
          </button>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors hover:bg-[var(--qi-bg-secondary)]"
          >
            <X className="h-5 w-5 text-[var(--qi-text-tertiary)]" />
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <div className="p-4">
        {config.svg ? (
          <div
            className="flex w-full justify-center overflow-hidden rounded-lg bg-[var(--qi-surface)]"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(config.svg) }}
          />
        ) : config.png_base64 ? (
          <img
            src={config.png_base64}
            alt="Gráfico Executivo"
            className="h-auto w-full rounded-lg"
          />
        ) : config.downloadUrl ? (
          <img
            src={config.downloadUrl}
            alt="Gráfico Executivo"
            className="h-auto w-full rounded-lg"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-[var(--qi-text-tertiary)]">
            Nenhum gráfico disponível
          </div>
        )}
      </div>

      {/* Insights */}
      {config.phrases && config.phrases.length > 0 && (
        <div className="border-t border-[var(--qi-border)]">
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--qi-bg-secondary)]"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-semantic-warning" />
              <span className="font-medium text-[var(--qi-text-primary)]">
                Insights ({config.phrases.length})
              </span>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-[var(--qi-text-tertiary)] transition-transform ${
                showInsights ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showInsights && (
            <div className="px-4 pb-4">
              <ul className="space-y-2">
                {config.phrases.map((phrase, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-[var(--qi-text-secondary)]"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-semantic-info-bg text-xs font-medium text-semantic-info">
                      {index + 1}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHighlight(
                          phrase.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        ),
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Compliance warnings */}
      {config.compliance && config.compliance.warnings.length > 0 && (
        <div className="border-t border-[var(--qi-border)] bg-semantic-warning-bg px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-semantic-warning" />
            <div className="text-sm text-semantic-warning">
              <p className="font-medium">Avisos de compliance:</p>
              <ul className="mt-1 list-inside list-disc">
                {config.compliance.warnings.map((warning, index) => (
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

export default ChartExecutivePanel;
