/**
 * CEO_GRAFICO Service
 * Integração Node.js ↔ Python via child_process
 *
 * Este serviço chama os scripts Python do CEO_GRAFICO
 * para gerar gráficos executivos de alta qualidade.
 */

import { spawn } from 'child_process';
import path from 'path';
import { getEnv } from '@/lib/config/env';

const PYTHON_CMD = getEnv('PYTHON_CMD') || (process.platform === 'win32' ? 'python' : 'python3');

// =============================================================================
// TIPOS
// =============================================================================

export interface ChartDataPoint {
  [key: string]: string | number | boolean | null;
}

export interface ChartGenerationRequest {
  action: 'generate' | 'profile' | 'insights';
  data: ChartDataPoint[];
  chart_type?: string;
  title?: string;
  options?: ChartOptions;
}

export interface ChartOptions {
  figsize?: [number, number];
  show_values?: boolean;
  donut?: boolean;
  small_threshold_pct?: number;
  max_slices?: number;
  x_col?: string;
  y_col?: string;
  size_col?: string;
  bar_width?: number;
  // Quality config overrides (from admin slides quality settings)
  colors?: string[];
  font_family?: string;
  dpi?: number;
  background_color?: string;
  show_grid?: boolean;
}

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

export interface ChartGenerationResult {
  success: boolean;
  chart_type?: string;
  svg?: string;
  png_base64?: string;
  insights?: ChartInsight[];
  phrases?: string[];
  profile?: Record<string, unknown>;
  compliance?: ComplianceResult;
  recommendations?: ChartRecommendation[];
  error?: string;
  traceback?: string;
}

export interface ProfileResult {
  success: boolean;
  profile?: Record<string, unknown>;
  recommendations?: ChartRecommendation[];
  error?: string;
}

export interface InfographicMetricItem {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
}

export interface InfographicMilestoneItem {
  date: string;
  title: string;
  description?: string;
  status?: 'completed' | 'in_progress' | 'pending';
}

export interface InfographicStepItem {
  number: number;
  title: string;
  description?: string;
}

export interface InfographicComparisonColumn {
  title: string;
  items: InfographicMetricItem[];
}

export type InfographicLayout = 'dashboard' | 'highlight' | 'timeline' | 'comparison' | 'process';
export type InfographicStyle = 'corporate' | 'dark' | 'minimal' | 'vibrant' | 'warm';

export interface InfographicSection {
  type: 'metrics' | 'text' | 'chart_data' | 'hero_metric' | 'milestones' | 'steps' | 'comparison';
  title?: string;
  content?: string;
  items?: InfographicMetricItem[] | InfographicMilestoneItem[] | InfographicStepItem[];
  chart_type?: string;
  data?: Array<{ name: string; value: number }>;
  // hero_metric fields
  label?: string;
  value?: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  // comparison fields
  column_a?: InfographicComparisonColumn;
  column_b?: InfographicComparisonColumn;
}

export interface InfographicData {
  title: string;
  subtitle?: string;
  layout?: InfographicLayout;
  style?: InfographicStyle;
  sections: InfographicSection[];
  footer?: string;
}

export interface InfographicGenerationResult {
  success: boolean;
  svg?: string;
  png_base64?: string;
  error?: string;
  traceback?: string;
}

// =============================================================================
// TIPOS PARA PRESENTATION (SlideSpec)
// =============================================================================

export interface SlideSpecThemeColors {
  bg: string;
  text: string;
  structure_blue: string;
  highlight_orange: string;
  aqua: string;
}

export interface SlideSpecTheme {
  name: string;
  font_family: string;
  font_fallbacks?: string[];
  colors: SlideSpecThemeColors;
}

export interface SlideSpecGrid {
  columns: number;
  margin_in: { left: number; right: number; top: number; bottom: number };
  gutter_in: number;
  baseline_grid_pt: number;
}

export interface SlideSpecUIRules {
  headline_max_lines: number;
  body_max_bullets: number;
  bullet_max_lines_each: number;
  one_visual_per_slide: boolean;
  no_decorative_icons: boolean;
  whitespace_priority: 'high' | 'medium' | 'low';
  color_constraints: {
    max_blue_elements_per_slide: number;
    max_orange_elements_per_slide: number;
    forbid_orange_in: string[];
  };
}

export interface SlideSpecDeck {
  title: string;
  style: 'mckinsey' | 'bain' | 'bcg' | 'deloitte';
  slide_size: { format: string; width_in: number; height_in: number };
  grid: SlideSpecGrid;
  theme: SlideSpecTheme;
  ui_rules: SlideSpecUIRules;
}

export interface SlideSpecElementStyle {
  fill?: { color: string; transparency?: number };
  line?: { color: string; width_pt: number };
  text?: {
    font_family?: string;
    font_pt?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    valign?: 'top' | 'middle' | 'bottom';
  };
}

export interface SlideSpecTextRun {
  text: string;
  style?: {
    font_pt?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
}

export interface SlideSpecParagraph {
  runs: SlideSpecTextRun[];
  bullet?: { level: number; indent_pt?: number; hanging_pt?: number };
  align?: string;
  line_spacing_pt?: number;
  space_after_pt?: number;
  space_before_pt?: number;
}

export interface SlideSpecChartSeries {
  name: string;
  values: number[];
  number_format?: string;
  color?: string;
}

export interface SlideSpecChartData {
  categories: string[];
  series: SlideSpecChartSeries[];
}

export interface SlideSpecTableCell {
  r: number;
  c: number;
  text: string;
  style?: {
    font_pt?: number;
    bold?: boolean;
    color?: string;
    fill?: string;
  };
}

export interface SlideSpecElement {
  id: string;
  kind: 'textbox' | 'chart' | 'table' | 'shape' | 'line' | 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  style?: SlideSpecElementStyle;
  content?: {
    // Textbox
    text_runs?: SlideSpecTextRun[];
    paragraphs?: SlideSpecParagraph[];
    text?: string;
    text_frame?: { word_wrap?: boolean; auto_size?: string };
    // Chart
    chart_type?: string;
    data?: SlideSpecChartData;
    axes?: { value_min?: number; value_max?: number; major_unit?: number };
    labels?: { show_values?: boolean; show_category?: boolean };
    style_hints?: { forbid_orange_on_chart?: boolean };
    // Table
    rows?: number;
    cols?: number;
    cells?: SlideSpecTableCell[];
    column_widths_in?: number[];
    row_heights_in?: number[];
    // Shape/Line
    shape_type?: string;
    fill?: { color: string; transparency?: number };
    line?: { color: string; width_pt: number };
    // Image
    image_base64?: string;
  };
  pptx_mapping?: { api: string; notes?: string };
}

export interface SlideSpecColorAuditItem {
  element_id: string;
  elemento: string;
  cor_hex: string;
}

export interface SlideSpecQualityChecks {
  so_what_clear: boolean;
  mece_ok: boolean;
  numbers_contextualized: boolean;
  standalone_readable: boolean;
  color_rules_ok: boolean;
}

export interface SlideSpecLayoutZone {
  zone: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SlideSpecSlide {
  slide_id: string;
  type:
    | 'title'
    | 'section'
    | 'key_message'
    | 'chart'
    | 'table'
    | 'matrix'
    | 'process'
    | 'summary'
    | 'appendix';
  question?: string;
  headline?: string;
  layout?: {
    name: string;
    zones: SlideSpecLayoutZone[];
  };
  elements: SlideSpecElement[];
  color_audit?: SlideSpecColorAuditItem[];
  speaker_notes?: string;
  quality_checks?: SlideSpecQualityChecks;
}

export interface SlideSpec {
  spec_version: string;
  render_target: string;
  deck: SlideSpecDeck;
  slides: SlideSpecSlide[];
  open_todos?: Array<{ ref: string; missing: string; allowed_fix: string }>;
}

export interface PresentationGenerationResult {
  success: boolean;
  chart_type?: string;
  pptx_base64?: string;
  slide_count?: number;
  error?: string;
  traceback?: string;
}

// =============================================================================
// SERVIÇO
// =============================================================================

/**
 * Tipos de gráfico suportados pelo CEO_GRAFICO
 */
export const SUPPORTED_CHART_TYPES = [
  'bar',
  'bar_chart',
  'line',
  'pie',
  'waterfall',
  'scatter',
  'area',
  'grouped_bar',
  'heatmap',
  'stacked_bar',
  'stacked100_bar',
  'combo',
  'bullet',
  'infographic',
] as const;

export type SupportedChartType = (typeof SUPPORTED_CHART_TYPES)[number];

/**
 * Caminho para o diretório do CEO_GRAFICO
 */
const CEO_GRAFICO_PATH = path.join(process.cwd(), 'ceo_grafico');

/**
 * Caminho para o script principal
 */
const MAIN_SCRIPT = path.join(CEO_GRAFICO_PATH, 'main.py');

/**
 * Timeout padrão para execução do Python (30 segundos)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Executa o script Python do CEO_GRAFICO
 */
async function executePython(request: ChartGenerationRequest): Promise<ChartGenerationResult> {
  return new Promise((resolve, _reject) => {
    const python = spawn(PYTHON_CMD, [MAIN_SCRIPT], {
      cwd: CEO_GRAFICO_PATH,
      timeout: DEFAULT_TIMEOUT,
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    python.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch {
          resolve({
            success: false,
            error: `Erro ao parsear resposta do Python: ${stdout.slice(0, 500)}`,
          });
        }
      } else {
        resolve({
          success: false,
          error: `Python exited with code ${code}`,
          traceback: stderr,
        });
      }
    });

    python.on('error', (err) => {
      resolve({
        success: false,
        error: `Erro ao executar Python: ${err.message}`,
      });
    });

    // Enviar dados para o script Python via stdin
    python.stdin.write(JSON.stringify(request));
    python.stdin.end();
  });
}

/**
 * Gera um gráfico executivo a partir dos dados
 */
export async function generateChart(
  data: ChartDataPoint[],
  options?: {
    chartType?: string;
    title?: string;
    chartOptions?: ChartOptions;
  }
): Promise<ChartGenerationResult> {
  if (!data || data.length === 0) {
    return {
      success: false,
      error: 'Dados não fornecidos ou vazios',
    };
  }

  const request: ChartGenerationRequest = {
    action: 'generate',
    data,
    chart_type: options?.chartType,
    title: options?.title || 'Gráfico',
    options: options?.chartOptions,
  };

  return executePython(request);
}

/**
 * Analisa os dados e retorna recomendações de tipos de gráfico
 */
export async function profileData(data: ChartDataPoint[]): Promise<ProfileResult> {
  if (!data || data.length === 0) {
    return {
      success: false,
      error: 'Dados não fornecidos ou vazios',
    };
  }

  const request: ChartGenerationRequest = {
    action: 'profile',
    data,
  };

  const result = await executePython(request);

  return {
    success: result.success,
    profile: result.profile,
    recommendations: result.recommendations,
    error: result.error,
  };
}

/**
 * Gera apenas insights a partir dos dados (sem gráfico)
 */
export async function generateInsights(
  data: ChartDataPoint[]
): Promise<{ success: boolean; insights?: ChartInsight[]; phrases?: string[]; error?: string }> {
  if (!data || data.length === 0) {
    return {
      success: false,
      error: 'Dados não fornecidos ou vazios',
    };
  }

  const request: ChartGenerationRequest = {
    action: 'insights',
    data,
  };

  const result = await executePython(request);

  return {
    success: result.success,
    insights: result.insights,
    phrases: result.phrases,
    error: result.error,
  };
}

/**
 * Gera um infografico a partir de dados estruturados
 */
export async function generateInfographic(
  infographicData: InfographicData
): Promise<InfographicGenerationResult> {
  if (!infographicData || !infographicData.sections || infographicData.sections.length === 0) {
    return {
      success: false,
      error: 'Dados do infografico nao fornecidos ou vazios',
    };
  }

  // Extrair dados flat para o campo data (usado pelo BaseRenderer)
  const flatData: ChartDataPoint[] = infographicData.sections.flatMap((s) => {
    if (s.type === 'metrics' && s.items) {
      return s.items.map((item) => ({
        label: item.label,
        value: item.value,
        trend: item.trend || 'neutral',
      }));
    }
    if (s.type === 'chart_data' && s.data) {
      return s.data as ChartDataPoint[];
    }
    return [];
  });

  const request: ChartGenerationRequest = {
    action: 'generate',
    data: flatData.length > 0 ? flatData : [{ placeholder: true }],
    chart_type: 'infographic',
    title: infographicData.title,
    options: {
      sections: infographicData.sections,
      subtitle: infographicData.subtitle,
      footer: infographicData.footer || 'rAIz Educacao',
      layout: infographicData.layout || 'dashboard',
      style: infographicData.style || 'corporate',
    } as unknown as ChartOptions,
  };

  return executePython(request);
}

/**
 * Gera uma apresentacao PPTX a partir de um SlideSpec JSON
 * Usa python-pptx via CEO_GRAFICO
 */
export async function generatePresentation(spec: SlideSpec): Promise<PresentationGenerationResult> {
  if (!spec || !spec.slides || spec.slides.length === 0) {
    return {
      success: false,
      error: 'SlideSpec nao fornecido ou sem slides',
    };
  }

  // Enviar request especial para tipo 'presentation'
  const request = {
    action: 'generate' as const,
    data: [] as ChartDataPoint[],
    chart_type: 'presentation',
    title: spec.deck?.title || 'Apresentacao',
    options: { spec } as unknown as ChartOptions,
  };

  return executePython(request) as Promise<PresentationGenerationResult>;
}

/**
 * Verifica se o ambiente Python está configurado corretamente
 */
export async function checkPythonEnvironment(): Promise<{
  available: boolean;
  pythonVersion?: string;
  missingDependencies?: string[];
  error?: string;
}> {
  return new Promise((resolve) => {
    // Verificar versão do Python
    const python = spawn(PYTHON_CMD, ['--version']);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    python.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        resolve({
          available: false,
          error: 'Python3 não encontrado no sistema',
        });
        return;
      }

      const version = (stdout || stderr).trim();

      // Verificar dependências
      const checkDeps = spawn(PYTHON_CMD, ['-c', 'import matplotlib, pandas, numpy, yaml']);

      checkDeps.on('close', (depCode) => {
        if (depCode !== 0) {
          resolve({
            available: false,
            pythonVersion: version,
            error:
              'Dependências Python não instaladas. Execute: pip install -r ceo_grafico/requirements.txt',
          });
        } else {
          resolve({
            available: true,
            pythonVersion: version,
          });
        }
      });

      checkDeps.on('error', () => {
        resolve({
          available: false,
          pythonVersion: version,
          error: 'Erro ao verificar dependências',
        });
      });
    });

    python.on('error', () => {
      resolve({
        available: false,
        error: 'Python3 não encontrado no sistema',
      });
    });
  });
}

/**
 * Converte dados de diferentes formatos para o formato esperado
 */
export function normalizeChartData(
  input: string | Record<string, unknown>[] | Record<string, unknown>
): ChartDataPoint[] {
  // Se já é um array de objetos, retornar
  if (Array.isArray(input)) {
    return input as ChartDataPoint[];
  }

  // Se é um objeto único, colocar em array
  if (typeof input === 'object' && input !== null) {
    return [input as ChartDataPoint];
  }

  // Se é string, tentar parsear como JSON
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [parsed];
    } catch {
      // Tentar parsear como CSV
      return parseCSV(input);
    }
  }

  return [];
}

/**
 * Parseia string CSV para array de objetos
 */
function parseCSV(csv: string): ChartDataPoint[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Detectar delimitador
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

  const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const data: ChartDataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ''));

    if (values.length !== headers.length) continue;

    const row: ChartDataPoint = {};
    for (let j = 0; j < headers.length; j++) {
      const value = values[j];
      // Tentar converter para número
      const numValue = parseFloat(value.replace(',', '.').replace(/\s/g, ''));
      row[headers[j]] = isNaN(numValue) ? value : numValue;
    }
    data.push(row);
  }

  return data;
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

const ceoGraficoService = {
  generateChart,
  generateInfographic,
  generatePresentation,
  profileData,
  generateInsights,
  checkPythonEnvironment,
  normalizeChartData,
  SUPPORTED_CHART_TYPES,
};

export default ceoGraficoService;
