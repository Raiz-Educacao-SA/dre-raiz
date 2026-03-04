import type { AnalysisContext, CurrencyCode } from "../../types";
import type { SomaTagsRow } from "../../services/supabaseService";
import { getMockContext } from "../mock/mockContext";
import { getSomaTags } from "../../services/supabaseService";
import { buildDatasets, buildKPIs } from "./dataBuilder";

export interface FetchContextParams {
  periodId?: string;
  scopeId?: string;
  marca?: string;
  filial?: string;
  scenario?: string;
  startDate?: string;
  endDate?: string;
  currency?: CurrencyCode;
  org_name?: string;
}

/**
 * Busca o contexto de análise real do Supabase via get_soma_tags
 * Retorna dados Real, Orçado e A-1 agregados por tag0+tag01+mês
 */
export async function fetchAnalysisContext(
  params?: FetchContextParams
): Promise<AnalysisContext> {
  // Se modo mock ativado, retornar mock
  if (process.env.AI_REPORT_USE_MOCK === "1" || import.meta.env.VITE_AI_REPORT_USE_MOCK === "1") {
    console.log("📦 Usando contexto MOCK (AI_REPORT_USE_MOCK=1)");
    return getMockContext();
  }

  try {
    // Usar params.startDate/endDate se fornecidos, senão mês atual
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = params?.endDate || currentMonth;
    const startMonth = params?.startDate || endMonth;

    console.log(`🔄 Buscando dados DRE via get_soma_tags [${startMonth} → ${endMonth}]...`);

    // Buscar dados agregados (Real + Orçado + A-1 em uma só chamada)
    const marcas = params?.marca ? [params.marca] : undefined;
    const filiais = params?.filial ? [params.filial] : undefined;

    const somaData = await getSomaTags(
      startMonth,
      endMonth,
      marcas,
      filiais,
      undefined, // tags02
      undefined, // tags01
      'Sim',     // recurring
    );

    if (!somaData || somaData.length === 0) {
      throw new Error(`Nenhum dado encontrado para o período ${startMonth} → ${endMonth}. Verifique os filtros.`);
    }

    console.log(`✅ ${somaData.length} linhas de get_soma_tags`);

    // Separar por cenário
    const realRows = somaData.filter(r => r.scenario === 'Real');
    const orcadoRows = somaData.filter(r => r.scenario === 'Orçado');
    const a1Rows = somaData.filter(r => r.scenario === 'A-1');

    console.log(`📊 Real: ${realRows.length} | Orçado: ${orcadoRows.length} | A-1: ${a1Rows.length}`);

    // Construir datasets e KPIs com dados reais
    const datasets = buildDatasets(realRows, orcadoRows, a1Rows);
    const kpis = buildKPIs(realRows, orcadoRows, a1Rows);

    // Labels de período e escopo
    const period_label = params?.periodId || detectPeriodLabel(realRows);
    const scope_label = params?.scopeId || detectScopeLabel(params);

    const context: AnalysisContext = {
      org_name: params?.org_name || "RAIZ EDUCAÇÃO",
      currency: params?.currency || "BRL",
      period_label,
      scope_label,
      kpis,
      datasets,
      analysis_rules: {
        prefer_pareto: true,
        highlight_threshold_currency: 100000,
        highlight_threshold_percent: 0.03,
      },
    };

    console.log("✅ Contexto de análise construído com dados reais");
    return context;

  } catch (error) {
    console.error("❌ Erro ao buscar contexto de análise:", error);
    throw error;
  }
}

/** Detecta label do período a partir dos meses nos dados */
function detectPeriodLabel(rows: SomaTagsRow[]): string {
  if (!rows.length) return "Período não especificado";

  const months = [...new Set(rows.map(r => r.month))].sort();
  const first = months[0];
  const last = months[months.length - 1];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const [fy, fm] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);

  if (fy === ly && fm === lm) {
    return `${monthNames[fm - 1]}/${fy}`;
  } else if (months.length >= 12) {
    return `R12M até ${monthNames[lm - 1]}/${ly}`;
  } else {
    return `YTD ${monthNames[lm - 1]}/${ly}`;
  }
}

/** Detecta label de escopo */
function detectScopeLabel(params?: FetchContextParams): string {
  if (!params) return "Consolidado";
  const parts: string[] = [];
  if (params.marca) parts.push(`Marca: ${params.marca}`);
  if (params.filial) parts.push(`Filial: ${params.filial}`);
  return parts.length > 0 ? parts.join(" | ") : "Consolidado";
}
