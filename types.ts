
export type TransactionType = 'REVENUE' | 'FIXED_COST' | 'VARIABLE_COST' | 'SGA' | 'RATEIO';
export type TransactionStatus = 'Normal' | 'Pendente' | 'Ajustado' | 'Rateado' | 'Excluído' | 'Manual';

export interface User {
  name: string;
  email: string;
  photo: string;
  role: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  conta_contabil: string;  // Campo que popula coluna "Conta" na UI
  category?: string;  // Existe no banco mas não é usada no momento (reservada para futuro)
  type: TransactionType;
  filial: string;
  status: TransactionStatus;
  scenario?: string;
  tag0?: string;
  tag01?: string;
  tag02?: string;
  tag03?: string;
  marca?: string;
  ticket?: string;
  vendor?: string;
  recurring?: string;
  nat_orc?: string;
  chave_id?: string;
  nome_filial?: string;
  justification?: string;
  updated_at: string;  // Campo obrigatório para optimistic locking e detecção de conflitos
  created_at?: string; // Data de inclusão no banco (para rastreio de novos lançamentos)
}

export interface ManualChange {
  id: string;
  transactionId: string;
  originalTransaction: Transaction;
  description: string;
  type: 'CONTA' | 'DATA' | 'RATEIO' | 'EXCLUSAO' | 'MARCA' | 'FILIAL' | 'MULTI';
  fieldChanged?: string;     // Campo que foi alterado (para MULTI, CONTA, etc)
  oldValue: string;
  newValue: string;
  justification?: string;    // Justificativa da mudança (obrigatório no banco)
  status: 'Pendente' | 'Aplicado' | 'Reprovado';
  requestedAt: string;
  requestedBy: string;
  requestedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;  // NEW FIELD
}

export interface SchoolKPIs {
  totalRevenue: number;
  totalFixedCosts: number;
  totalVariableCosts: number;
  sgaCosts: number;
  ebitda: number;
  netMargin: number;
  costPerStudent: number;
  revenuePerStudent: number;
  activeStudents: number;
  breakEvenPoint: number;
  defaultRate: number;
  targetEbitda: number;
  costReductionNeeded: number;
  marginOfSafety: number;
  churnRate: number;
  waterPerStudent: number;
  energyPerClassroom: number;
  consumptionMaterialPerStudent: number;
  eventsPerStudent: number;
}

export interface IAInsight {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: 'Driver Positivo' | 'Driver Negativo' | 'Ação Recomendada';
}

export type ViewType = 'dashboard' | 'dre' | 'forecasting' | 'manual_changes' | 'movements' | 'admin' | 'analysis' | 'soma_tags' | 'executive_dashboard' | 'holding_dashboard' | 'agent_team' | 'justificativas' | 'inbox';

// Chart Types for AI-Generated Visualizations
export type ChartType = 'bar' | 'line' | 'waterfall' | 'composed' | 'heatmap';

export interface ChartConfig {
  type: ChartType;
  title: string;
  description: string;
  dataSpec: {
    aggregation: 'monthly' | 'category' | 'filial';
    metrics: string[];
    scenarios: string[];
    timeframe: { start: number; end: number };
  };
}

export interface AIChartResponse {
  explanation: string;
  chartConfig: ChartConfig | null;
}

// ============================================
// Analysis Pack Types
// ============================================

export type CurrencyCode = "BRL" | "USD" | "EUR";

export type KPI = {
  code: string;
  name: string;
  unit: "currency" | "percent" | "number";
  actual: number;
  plan?: number | null;
  prior?: number | null;
  delta_vs_plan?: number | null;
  delta_vs_prior?: number | null;
};

export type WaterfallStep = { label: string; value: number };

export type DatasetRegistry = {
  r12?: {
    x: string[];
    series: Array<{ key: string; name: string; data: number[]; unit: "currency" | "number" | "percent" }>;
  };
  ebitda_bridge_vs_plan_ytd?: {
    start_label: string;
    end_label: string;
    start_value: number;
    end_value: number;
    steps: WaterfallStep[];
  };
  pareto_cost_variance_ytd?: {
    items: Array<{ name: string; value: number }>;
  };
  heatmap_variance?: {
    x: string[];
    y: string[];
    values: Array<[number, number, number]>;
    unit: "currency" | "number" | "percent";
  };
  drivers_table?: {
    columns: string[];
    rows: Array<Array<string | number>>;
  };
};

export type AnalysisContext = {
  org_name: string;
  currency: CurrencyCode;
  period_label: string;
  scope_label: string;
  kpis: KPI[];
  datasets: DatasetRegistry;
  analysis_rules?: {
    prefer_pareto?: boolean;
    highlight_threshold_currency?: number;
    highlight_threshold_percent?: number;
  };
};

export type SlideBlock =
  | { type: "text"; title?: string; bullets: string[] }
  | { type: "callout"; intent: "positive" | "negative" | "neutral"; title: string; bullets: string[] }
  | { type: "kpi_grid"; title?: string; kpi_codes: string[] }
  | { type: "chart"; chart_id: string; height: "sm" | "md" | "lg"; note?: string }
  | { type: "table"; title?: string; dataset_key: "drivers_table" };

export type Slide = {
  title: string;
  subtitle?: string;
  blocks: SlideBlock[];
};

export type ChartDef =
  | { id: string; kind: "line"; dataset_key: "r12"; title: string; series_keys: string[] }
  | { id: string; kind: "waterfall"; dataset_key: "ebitda_bridge_vs_plan_ytd"; title: string }
  | { id: string; kind: "pareto"; dataset_key: "pareto_cost_variance_ytd"; title: string; top_n: number }
  | { id: string; kind: "heatmap"; dataset_key: "heatmap_variance"; title: string };

export type AnalysisPack = {
  meta: {
    org_name: string;
    period_label: string;
    scope_label: string;
    currency: CurrencyCode;
    generated_at_iso: string;
  };
  executive_summary: {
    headline: string;
    bullets: string[];
    risks: string[];
    opportunities: string[];
  };
  actions: Array<{ owner: string; action: string; eta: string; expected_impact: string }>;
  charts: ChartDef[];
  slides: Slide[];
};

// ============================================
// Conta Contábil (Hierarquia)
// ============================================

export interface ContaContabilOption {
  cod_conta: string;
  nome_nat_orc: string | null;
  tag0: string | null;   // Nível 1 - resolvido via tag0_map (ex: RECEITA, CUSTOS)
  tag01: string | null;  // Nível 2 - direto de transactions (ex: Receita Bruta)
  tag02: string | null;  // Nível 3
  tag03: string | null;  // Nível 4
}

// ============================================
// Virtual Scrolling & Pagination Types
// ============================================

export interface PaginationParams {
  pageNumber: number;  // 1, 2, 3, ...
  pageSize: number;    // Registros por página (ex: 200, 500, 50000)
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================
// ── Anexos de chat ────────────────────────────────────────────────────────────
export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// DRE Analyses
// ============================================

export interface DreAnalysis {
  id: string;
  filter_hash: string;
  filter_context: {
    year: string;
    months: string[];
    marcas: string[];
    filiais: string[];
    tags01: string[];
    tags02: string[];
    tags03: string[];
    recurring: string | null;
    vendors?: string[];
  };
  title: string;
  content: string;
  requested_by: string;         // email — mesmo padrão do ManualChange
  requested_by_name: string;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
}

// ── Solicitações de Análise DRE (Q&A / Accountability) ──

export type InquiryStatus = 'pending' | 'answered' | 'approved' | 'rejected' | 'reopened' | 'expired' | 'closed';

export interface DreInquiryFilterContext {
  year: string;
  months: string[];
  marcas: string[];
  filiais: string[];
  tags01: string[];
  tags02: string[];
  tags03: string[];
  recurring: string | null;
  vendors?: string[];
}

export interface DreInquiry {
  id: number;
  subject: string;
  question: string;
  priority: 'normal' | 'urgent';
  requester_email: string;
  requester_name: string;
  assignee_email: string;
  assignee_name: string;
  filter_hash: string;
  filter_context: DreInquiryFilterContext;
  dre_snapshot: Record<string, number> | null;
  status: InquiryStatus;
  sla_deadline_at: string | null;
  sla_breached: boolean;
  sla_reminded: boolean;
  original_assignee_email: string | null;
  reassigned_by: string | null;
  reassigned_at: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export type InquiryMessageType = 'question' | 'response' | 'counter' | 'approval' | 'rejection' | 'system';

export interface DreInquiryMessage {
  id: number;
  inquiry_id: number;
  author_email: string;
  author_name: string;
  message: string;
  message_type: InquiryMessageType;
  created_at: string;
  attachments?: Attachment[];
}

export interface InquirySlaConfig {
  id: number;
  priority: 'normal' | 'urgent';
  deadline_hours: number;
  reminder_hours: number;
  escalate_to: string | null;
  active: boolean;
  updated_at: string;
}

export interface InquiryStats {
  total: number;
  pending: number;
  answered: number;
  approved: number;
  rejected: number;
  reopened: number;
  expired: number;
  closed: number;
}
