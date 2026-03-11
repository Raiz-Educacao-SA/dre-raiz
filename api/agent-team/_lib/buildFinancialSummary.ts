import type { FinancialSummary, VendorBreakdown } from '../../../types/agentTeam';
import { FinancialSummarySchema } from '../../../types/agentTeamSchemas';

// --------------------------------------------
// Input type (espelho de SomaTagsRow do supabaseService)
// --------------------------------------------

interface SomaTagsRow {
  tag0: string;
  tag01: string;
  scenario: string;
  month: string;
  total: number;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function safePct(numerator: number, denominator: number): number {
  if (!denominator || !isFinite(numerator) || !isFinite(denominator)) return 0;
  return round2((numerator / Math.abs(denominator)) * 100);
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function formatPeriodo(months: string[]): string {
  if (months.length === 0) return 'Sem dados';
  const sorted = [...months].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const mm1 = first.split('-')[1];
  const mm2 = last.split('-')[1];
  const year = last.split('-')[0];
  return `${MONTH_NAMES[mm1] || mm1}-${MONTH_NAMES[mm2] || mm2} ${year}`;
}

type Category = 'receita' | 'custos_variaveis' | 'custos_fixos' | 'sga' | 'rateio';

function categorize(tag0: string): Category | null {
  if (tag0.startsWith('01.')) return 'receita';
  if (tag0.startsWith('02.')) return 'custos_variaveis';
  if (tag0.startsWith('03.')) return 'custos_fixos';
  if (tag0.startsWith('04.')) return 'sga';
  if (tag0.startsWith('05.')) return 'rateio';
  return null;
}

type Scenario = 'real' | 'orcado' | 'a1';

function mapScenario(scenario: string): Scenario | null {
  const lower = scenario.toLowerCase();
  if (lower === 'real') return 'real';
  if (lower === 'orçado' || lower === 'orcado') return 'orcado';
  if (lower === 'ano anterior' || lower === 'a-1' || lower === 'a1') return 'a1';
  return null;
}

// --------------------------------------------
// Aggregação principal
// --------------------------------------------

export function buildFinancialSummary(rows: SomaTagsRow[], vendorData?: VendorBreakdown[]): FinancialSummary {
  // 1. Acumuladores por categoria + scenario
  const acc: Record<Category, Record<Scenario, number>> = {
    receita:           { real: 0, orcado: 0, a1: 0 },
    custos_variaveis:  { real: 0, orcado: 0, a1: 0 },
    custos_fixos:      { real: 0, orcado: 0, a1: 0 },
    sga:               { real: 0, orcado: 0, a1: 0 },
    rateio:            { real: 0, orcado: 0, a1: 0 },
  };

  // 2. Acumuladores por tag01 + scenario (para top5)
  const byTag01: Record<string, Record<Scenario, number>> = {};

  // 3. Acumuladores mensais (para tendência)
  const byMonth: Record<string, Record<Category, number>> = {};

  // 4. Coletar meses únicos
  const monthsSet = new Set<string>();

  // 5. Iterar uma vez sobre todos os rows
  for (const row of rows) {
    const cat = categorize(row.tag0);
    if (!cat) continue;

    const sc = mapScenario(row.scenario);
    if (!sc) continue;

    monthsSet.add(row.month);

    // Acumular por categoria
    acc[cat][sc] += row.total;

    // Acumular por tag01
    if (!byTag01[row.tag01]) {
      byTag01[row.tag01] = { real: 0, orcado: 0, a1: 0 };
    }
    byTag01[row.tag01][sc] += row.total;

    // Acumular mensal (só Real)
    if (sc === 'real') {
      if (!byMonth[row.month]) {
        byMonth[row.month] = { receita: 0, custos_variaveis: 0, custos_fixos: 0, sga: 0, rateio: 0 };
      }
      byMonth[row.month][cat] += row.total;
    }
  }

  // 6. Categorias
  const receita = {
    real: round2(acc.receita.real),
    orcado: round2(acc.receita.orcado),
    a1: round2(acc.receita.a1),
    gap_pct: safePct(acc.receita.real - acc.receita.orcado, acc.receita.orcado),
  };

  const custos_variaveis = {
    real: round2(acc.custos_variaveis.real),
    orcado: round2(acc.custos_variaveis.orcado),
    a1: round2(acc.custos_variaveis.a1),
  };

  const custos_fixos = {
    real: round2(acc.custos_fixos.real),
    orcado: round2(acc.custos_fixos.orcado),
    a1: round2(acc.custos_fixos.a1),
  };

  const sga = {
    real: round2(acc.sga.real),
    orcado: round2(acc.sga.orcado),
    a1: round2(acc.sga.a1),
  };

  const rateio = {
    real: round2(acc.rateio.real),
    orcado: round2(acc.rateio.orcado),
    a1: round2(acc.rateio.a1),
  };

  // 7. Margem de contribuição = receita + custos variáveis + custos fixos (custos são negativos)
  const mcReal = acc.receita.real + acc.custos_variaveis.real + acc.custos_fixos.real;
  const mcOrcado = acc.receita.orcado + acc.custos_variaveis.orcado + acc.custos_fixos.orcado;

  const pctReal = safePct(mcReal, acc.receita.real);
  const pctOrcado = safePct(mcOrcado, acc.receita.orcado);

  const margem_contribuicao = {
    real: round2(mcReal),
    orcado: round2(mcOrcado),
    pct_real: pctReal,
    pct_orcado: pctOrcado,
    health: (pctReal >= 30 ? 'healthy' : pctReal >= 15 ? 'attention' : 'critical') as 'healthy' | 'attention' | 'critical',
  };

  // 8. EBITDA = receita + CV + CF + SGA + rateio (custos são negativos)
  const ebitdaReal = acc.receita.real + acc.custos_variaveis.real + acc.custos_fixos.real + acc.sga.real + acc.rateio.real;
  const ebitdaOrcado = acc.receita.orcado + acc.custos_variaveis.orcado + acc.custos_fixos.orcado + acc.sga.orcado + acc.rateio.orcado;
  const ebitdaA1 = acc.receita.a1 + acc.custos_variaveis.a1 + acc.custos_fixos.a1 + acc.sga.a1 + acc.rateio.a1;

  const ebitda = {
    real: round2(ebitdaReal),
    orcado: round2(ebitdaOrcado),
    a1: round2(ebitdaA1),
    pct_real: safePct(ebitdaReal, acc.receita.real),
  };

  // 9. Top 5 variações (|real - orcado|) desc
  const variacoes = Object.entries(byTag01)
    .map(([tag01, vals]) => ({
      tag01,
      real: round2(vals.real),
      orcado: round2(vals.orcado),
      delta_pct: safePct(vals.real - vals.orcado, vals.orcado),
    }))
    .sort((a, b) => Math.abs(b.real - b.orcado) - Math.abs(a.real - a.orcado))
    .slice(0, 5);

  // 10. Top 5 tags01 receita (apenas tag0 com prefix '01.', scenario Real)
  const receitaTags: Record<string, number> = {};
  for (const row of rows) {
    if (!row.tag0.startsWith('01.')) continue;
    if (mapScenario(row.scenario) !== 'real') continue;
    receitaTags[row.tag01] = (receitaTags[row.tag01] || 0) + row.total;
  }
  const top5_tags01_receita = Object.entries(receitaTags)
    .map(([tag01, total]) => ({ tag01, total: round2(total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 11. Top 5 tags01 custo (CV + CF + SGA + rateio, scenario Real, por valor absoluto)
  const custoTags: Record<string, number> = {};
  for (const row of rows) {
    const cat = categorize(row.tag0);
    if (!cat || cat === 'receita') continue;
    if (mapScenario(row.scenario) !== 'real') continue;
    custoTags[row.tag01] = (custoTags[row.tag01] || 0) + row.total;
  }
  const top5_tags01_custo = Object.entries(custoTags)
    .map(([tag01, total]) => ({ tag01, total: round2(total) }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 5);

  // 12. Tendência mensal
  const tendencia_mensal = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, cats]) => ({
      mes,
      receita: round2(cats.receita),
      ebitda: round2(cats.receita + cats.custos_variaveis + cats.custos_fixos + cats.sga + cats.rateio),
    }));

  // 13. Período
  const periodo = formatPeriodo([...monthsSet]);

  // 14. Montar resultado
  const result: FinancialSummary = {
    periodo,
    receita,
    custos_variaveis,
    custos_fixos,
    sga,
    rateio,
    margem_contribuicao,
    ebitda,
    top5_variacoes: variacoes,
    top5_tags01_receita,
    top5_tags01_custo,
    tendencia_mensal,
    top_fornecedores_por_tag01: vendorData || [],
  };

  // 15. Validar com Zod — lança se inválido
  FinancialSummarySchema.parse(result);

  return result;
}
