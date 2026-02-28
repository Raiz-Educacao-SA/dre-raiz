// ============================================
// Core Financial Model
// Funções puras — zero side effects, zero I/O
// ============================================

import type { FinancialInputs, FinancialDeltas, FinancialMetrics } from './decisionTypes';

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula percentual seguro, retornando 0 para denominadores inválidos.
 * Usa valor absoluto do denominador para custos negativos.
 */
export function safePct(numerator: number, denominator: number): number {
  if (!denominator || !isFinite(numerator) || !isFinite(denominator)) return 0;
  return round2((numerator / Math.abs(denominator)) * 100);
}

// --------------------------------------------
// EBITDA
// --------------------------------------------

/**
 * EBITDA = receita + custos_variaveis + custos_fixos + sga + rateio
 * (custos são negativos no modelo DRE)
 */
export function calculateEbitda(inputs: FinancialInputs): number {
  return round2(
    inputs.receita_real +
    inputs.custos_variaveis_real +
    inputs.custos_fixos_real +
    inputs.sga_real +
    inputs.rateio_real
  );
}

// --------------------------------------------
// Margem de Contribuição
// --------------------------------------------

/**
 * Margem de contribuição em % = (receita + custos_variaveis) / |receita| * 100
 * (custos variáveis são negativos)
 */
export function calculateMargin(receita: number, custos_variaveis: number): number {
  return safePct(receita + custos_variaveis, receita);
}

/**
 * Margem de contribuição em valor absoluto = receita + custos_variaveis
 */
export function calculateMarginAbsolute(receita: number, custos_variaveis: number): number {
  return round2(receita + custos_variaveis);
}

// --------------------------------------------
// Apply Deltas (Simulação)
// --------------------------------------------

/**
 * Aplica deltas financeiros hipotéticos sobre os inputs originais.
 * Retorna novos FinancialInputs com os valores ajustados.
 * Rateio e orçados permanecem inalterados.
 */
export function applyDeltas(inputs: FinancialInputs, deltas: FinancialDeltas): FinancialInputs {
  return {
    receita_real: inputs.receita_real + deltas.revenue_delta,
    receita_orcado: inputs.receita_orcado,
    custos_variaveis_real: inputs.custos_variaveis_real + deltas.cv_delta,
    custos_variaveis_orcado: inputs.custos_variaveis_orcado,
    custos_fixos_real: inputs.custos_fixos_real + deltas.cf_delta,
    custos_fixos_orcado: inputs.custos_fixos_orcado,
    sga_real: inputs.sga_real + deltas.sga_delta,
    sga_orcado: inputs.sga_orcado,
    rateio_real: inputs.rateio_real,
    rateio_orcado: inputs.rateio_orcado,
  };
}

// --------------------------------------------
// Normalize (extract from FinancialSummary)
// --------------------------------------------

/**
 * Converte FinancialSummary do agentTeam para FinancialInputs puros.
 * Aceita um objeto genérico com as propriedades esperadas.
 */
export function normalizeFinancialInputs(summary: {
  receita: { real: number; orcado: number };
  custos_variaveis: { real: number; orcado: number };
  custos_fixos: { real: number; orcado: number };
  sga: { real: number; orcado: number };
  rateio: { real: number; orcado: number };
}): FinancialInputs {
  return {
    receita_real: summary.receita.real,
    receita_orcado: summary.receita.orcado,
    custos_variaveis_real: summary.custos_variaveis.real,
    custos_variaveis_orcado: summary.custos_variaveis.orcado,
    custos_fixos_real: summary.custos_fixos.real,
    custos_fixos_orcado: summary.custos_fixos.orcado,
    sga_real: summary.sga.real,
    sga_orcado: summary.sga.orcado,
    rateio_real: summary.rateio.real,
    rateio_orcado: summary.rateio.orcado,
  };
}

// --------------------------------------------
// Derived metrics (convenience)
// --------------------------------------------

/**
 * Calcula todas as métricas derivadas a partir dos inputs.
 */
export function deriveMetrics(inputs: FinancialInputs): FinancialMetrics {
  return {
    ebitda: calculateEbitda(inputs),
    margin: calculateMargin(inputs.receita_real, inputs.custos_variaveis_real),
    margin_absolute: calculateMarginAbsolute(inputs.receita_real, inputs.custos_variaveis_real),
  };
}
