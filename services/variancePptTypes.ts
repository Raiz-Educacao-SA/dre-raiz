// ─── Variance PPT — Type Definitions ──────────────────────────────
import { BOOK_COLORS } from './bookDeResultadosTypes';

export { BOOK_COLORS };

export const VARIANCE_COLORS = {
  ...BOOK_COLORS,
  justified: '8B5CF6',   // purple
  approved: '10B981',    // green
  pending: 'F59E0B',     // amber
  rejected: 'EF4444',    // red
  aiSummaryBg: 'EEF2FF', // indigo-50
} as const;

export interface VariancePptNode {
  depth: number;            // 0=tag0, 1=tag01, 2=tag02, 3=tag03
  label: string;
  tag0: string;
  tag01: string;
  tag02: string | null;
  tag03: string | null;
  real: number;
  orcCompare: number;
  orcVarPct: number | null;
  orcAiSummary: string | null;
  a1Compare: number;
  a1VarPct: number | null;
  a1AiSummary: string | null;
  orcJustification: string | null;
  a1Justification: string | null;
  orcStatus: string;
  a1Status: string;
  ownerName: string | null;
  enrichedInsight: string | null;
  enrichedDrivers: string[] | null;
  children: VariancePptNode[];
}

export interface VariancePptSection {
  tag0: string;
  label: string;               // tag0 sem prefixo numérico
  invertDelta: boolean;
  sectionColor: string;
  node: VariancePptNode;       // nó tag0 com totais
  tag01Nodes: VariancePptNode[];
}

export interface VariancePptStats {
  totalLeaves: number;
  justified: number;
  approved: number;
  pending: number;
  rejected: number;
  notified: number;
  coveragePct: number;        // (justified+approved)/totalLeaves * 100
}

export interface VariancePptCalcRow {
  label: string;               // MARGEM DE CONTRIBUIÇÃO ou EBITDA
  real: number;
  orcado: number;
  a1: number;
  deltaOrcPct: number | null;
  deltaA1Pct: number | null;
}

export interface VariancePptData {
  monthLabel: string;          // 'Março 2026'
  monthShort: string;          // 'MAR/26'
  year: number;                // 2026
  a1Year: number;              // 2025
  marca: string | null;
  version: number;
  snapshotAt: string | null;
  sections: VariancePptSection[];
  calcRows: VariancePptCalcRow[];
  stats: VariancePptStats;
  executiveSummary: string | null;
  closingSummary: string | null;
}

export interface VarianceAiInsights {
  executive_summary: string;
  sections: Record<string, {
    insight: string;
    key_drivers: string[];
    risk_flag: string | null;
  }>;
  closing_summary: string;
}
