// ============================================
// Portfolio Bridge — Converte dados reais do DRE (por marca)
// em CompanyFinancialSnapshot[] para os engines de holding
// Zero tabelas extras — usa get_soma_tags existente
// ============================================

import type { CompanyFinancialSnapshot } from './holdingTypes';
import type { SomaTagsRow } from '../services/supabaseService';
import { buildFinancialSummary } from '../api/agent-team/_lib/buildFinancialSummary';

/**
 * Converte array de SomaTagsRow (filtrado por marca) em CompanyFinancialSnapshot.
 * Usa buildFinancialSummary internamente para agregar receita/custos/EBITDA/margem.
 */
function rowsToSnapshot(
  marca: string,
  rows: SomaTagsRow[],
  totalRevenueAllMarcas: number,
): CompanyFinancialSnapshot | null {
  if (rows.length === 0) return null;

  let fs;
  try {
    fs = buildFinancialSummary(rows);
  } catch {
    return null;
  }

  const receita = fs.receita.real;
  const ebitda = fs.ebitda.real;
  const margem = fs.margem_contribuicao.pct_real;

  // Health score: composto de margem + EBITDA + gap orçado
  const marginScore = Math.min(100, Math.max(0, margem * 2)); // 50% margem = 100
  const ebitdaScore = ebitda > 0 ? Math.min(100, (ebitda / (Math.abs(receita) || 1)) * 300) : 0;
  const gapScore = Math.max(0, 100 - Math.abs(fs.receita.gap_pct) * 2);
  const healthScore = Math.round(marginScore * 0.4 + ebitdaScore * 0.35 + gapScore * 0.25);

  // Growth YoY
  const a1 = fs.ebitda.a1;
  const growthYoy = a1 !== 0 ? ((ebitda - a1) / Math.abs(a1)) * 100 : 0;

  // Portfolio weight baseado na participação na receita total
  const weight = totalRevenueAllMarcas !== 0
    ? (Math.abs(receita) / Math.abs(totalRevenueAllMarcas)) * 100
    : 0;

  return {
    organization_id: marca,
    display_name: marca,
    period: fs.periodo,
    receita_real: receita,
    receita_orcado: fs.receita.orcado,
    custos_variaveis_real: fs.custos_variaveis.real,
    custos_fixos_real: fs.custos_fixos.real,
    sga_real: fs.sga.real,
    rateio_real: fs.rateio.real,
    ebitda,
    margem_contribuicao_pct: margem,
    health_score: Math.min(100, Math.max(0, healthScore)),
    growth_yoy: Math.round(growthYoy * 10) / 10,
    portfolio_weight: Math.round(weight * 10) / 10,
  };
}

/**
 * Constrói array de CompanyFinancialSnapshot a partir de dados DRE reais.
 *
 * Recebe:
 * - marcas: lista de marcas disponíveis
 * - allRows: dados consolidados (todas as marcas juntas)
 * - rowsByMarca: Map<marca, SomaTagsRow[]> — dados já separados por marca
 *
 * Retorna snapshots prontos para os engines (holdingEngine, capitalAllocation, stressTest).
 */
export function buildPortfolioFromDRE(
  rowsByMarca: Map<string, SomaTagsRow[]>,
): CompanyFinancialSnapshot[] {
  // Calcular receita total para portfolio_weight
  let totalRevenue = 0;
  for (const [, rows] of rowsByMarca) {
    for (const r of rows) {
      if (r.scenario === 'Real' && r.tag0?.startsWith('01.')) {
        totalRevenue += r.total;
      }
    }
  }

  const snapshots: CompanyFinancialSnapshot[] = [];
  for (const [marca, rows] of rowsByMarca) {
    const snap = rowsToSnapshot(marca, rows, totalRevenue);
    if (snap) snapshots.push(snap);
  }

  // Ordenar por receita (maior primeiro)
  snapshots.sort((a, b) => Math.abs(b.receita_real) - Math.abs(a.receita_real));

  return snapshots;
}
