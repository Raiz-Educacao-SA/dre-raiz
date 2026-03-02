// ─── Book de Resultados — Type Definitions ────────────────────────

/** Linha individual (tag01) com valores por cenário */
export interface BookDRELineItem {
  tag01: string;
  real: number;
  orcado: number;
  a1: number;
  deltaOrc: number;       // real - orcado
  deltaA1: number;        // real - a1
  deltaOrcPct: number;    // (real - orcado) / |orcado| * 100
  deltaA1Pct: number;     // (real - a1) / |a1| * 100
}

/** Grupo (tag0) com seus items */
export interface BookDREGroup {
  tag0: string;
  label: string;          // Nome limpo do grupo
  items: BookDRELineItem[];
  totalReal: number;
  totalOrcado: number;
  totalA1: number;
  deltaOrc: number;
  deltaA1: number;
  deltaOrcPct: number;
  deltaA1Pct: number;
}

/** Dados de uma marca */
export interface BookBrandData {
  marca: string;
  groups: BookDREGroup[];
}

/** Configuração visual de uma seção do DRE */
export interface DRESectionConfig {
  id: string;
  label: string;
  tag0Prefix: string;     // '01.', '02.', '03.', '04.'
  color: string;          // hex para gráficos
  invertDelta: boolean;   // true para custos (gastar menos = verde)
}

/** KPI card */
export interface BookKPI {
  label: string;
  value: string;
  color: string;          // hex
}

/** Dados de uma seção (receitas, custos, etc.) */
export interface BookSectionData {
  config: DRESectionConfig;
  consolidated: BookDREGroup;
  brands: { marca: string; group: BookDREGroup }[];
  kpis: BookKPI[];
  insights: string[];
}

/** CalcRow (MARGEM, EBITDA) */
export interface BookCalcRow {
  label: string;
  real: number;
  orcado: number;
  a1: number;
  deltaOrc: number;
  deltaA1: number;
  deltaOrcPct: number;
  deltaA1Pct: number;
}

/** Status badge */
export interface StatusBadge {
  text: string;           // 'Positivo' | 'Crítico' | 'Excelente' | 'Neutro'
  color: string;          // hex
}

/** DRE completo de uma entidade (marca ou consolidado) */
export interface BookFullDREData {
  entityName: string;     // 'CSC', 'CONSOLIDADO', ou nome da marca
  groups: BookDREGroup[];
  calcRows: BookCalcRow[];
  statusBadge: StatusBadge;
  performanceAnalysis: PerformanceBlock[];
  ebitdaKpis: BookKPI[];
}

/** Bloco de análise de performance */
export interface PerformanceBlock {
  icon: string;           // emoji or icon name
  title: string;
  text: string;
  color: string;          // border color
}

/** Dados completos para o Book inteiro */
export interface BookDeResultadosData {
  monthLabel: string;     // 'Janeiro 2026'
  monthShort: string;     // 'JAN/26'
  year: string;
  sections: BookSectionData[];
  cscDRE: BookFullDREData;
  consolidatedDRE: BookFullDREData;
  brandDREs: BookFullDREData[];
  allBrands: string[];
}

/** Input para gerar o book */
export interface BookGenerationInput {
  year: string;
  month: string;          // '01', '02', etc.
  marcas?: string[];
  recurring?: 'Sim' | 'Não' | null;
}

/** Cores do Book */
export const BOOK_COLORS = {
  headerBg: '1A2332',
  receitas: '1B75BB',
  custos: 'C0392B',
  sga: 'D4A044',
  consolidado: '166534',
  orcado: 'B0B8C4',
  deltaPositivo: '10B981',
  deltaNegativo: 'EF4444',
  accent: 'F44C00',
  teal: '7AC5BF',
  white: 'FFFFFF',
  lightGray: 'F3F4F6',
  darkText: '1F2937',
  mutedText: '6B7280',
} as const;

/** Seções padrão do DRE */
export const DRE_SECTIONS: DRESectionConfig[] = [
  { id: 'receitas',    label: 'Receitas Operacionais', tag0Prefix: '01.', color: BOOK_COLORS.receitas,    invertDelta: false },
  { id: 'custos_var',  label: 'Custos Variáveis',      tag0Prefix: '02.', color: BOOK_COLORS.custos,      invertDelta: true },
  { id: 'custos_fix',  label: 'Custos Fixos',          tag0Prefix: '03.', color: BOOK_COLORS.custos,      invertDelta: true },
  { id: 'sga',         label: 'SG&A',                  tag0Prefix: '04.', color: BOOK_COLORS.sga,         invertDelta: true },
];
