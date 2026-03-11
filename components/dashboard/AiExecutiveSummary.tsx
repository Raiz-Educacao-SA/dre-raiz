import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Loader2, Sparkles, AlertCircle, Zap, Database, Brain } from 'lucide-react';
import { ExecutiveSummaryResponse } from '../../services/anthropicService';
import { Transaction, SchoolKPIs } from '../../types';
import { getLatestCompletedRun, getLatestCompletedRunSteps } from '../../services/agentTeamService';
import { getVarianceJustifications, getLatestVarianceVersion } from '../../services/supabaseService';
import type { AgentRun, AgentStep, FinancialSummary } from '../../types/agentTeam';

// API URL for Claude calls
const ANTHROPIC_API_URL = '/api/llm-proxy?action=anthropic';

interface AiExecutiveSummaryProps {
  transactions: Transaction[];
  kpis: SchoolKPIs;
  selectedMarca: string[];
  selectedFilial: string[];
  monthRange: { start: number; end: number };
  comparisonMode: 'budget' | 'prevYear';
}

type DataSource = 'agents' | 'justificativas' | 'raw' | null;

export const AiExecutiveSummary: React.FC<AiExecutiveSummaryProps> = ({
  transactions, kpis, selectedMarca, selectedFilial, monthRange, comparisonMode,
}) => {
  const [aiSummary, setAiSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('dre-raiz:cockpit:section-ai') === 'true'; } catch { return false; }
  });
  const [isStale, setIsStale] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const isGeneratingRef = useRef(false);
  const lastFilterRef = useRef('');

  // Persist collapse state
  useEffect(() => {
    try { localStorage.setItem('dre-raiz:cockpit:section-ai', String(isCollapsed)); } catch {}
  }, [isCollapsed]);

  // Detect filter changes to mark summary as stale
  useEffect(() => {
    const filterKey = `${selectedMarca.join(',')}_${selectedFilial.join(',')}_${monthRange.start}_${monthRange.end}_${comparisonMode}`;
    if (lastFilterRef.current && lastFilterRef.current !== filterKey && aiSummary) {
      setIsStale(true);
    }
    lastFilterRef.current = filterKey;
  }, [selectedMarca, selectedFilial, monthRange.start, monthRange.end, comparisonMode]);

  // ============================================
  // ESTRATÉGIA 1: Dados dos Agentes (mais rápido)
  // ============================================
  const tryAgentData = async (): Promise<{ context: string; source: DataSource } | null> => {
    try {
      const run = await getLatestCompletedRun();
      if (!run || !run.financial_summary) return null;

      const fs = run.financial_summary as FinancialSummary;
      const steps = await getLatestCompletedRunSteps(run.id);

      // Extract agent insights
      const agentInsights: string[] = [];
      for (const step of steps) {
        if (!step.output_data || step.status !== 'completed') continue;
        const out = step.output_data as Record<string, unknown>;
        // Try common summary fields from each agent
        for (const key of ['resumo_executivo', 'resumo_projecao', 'executive_summary', 'plan_summary', 'recado_final', 'recado_estrategico']) {
          if (typeof out[key] === 'string' && (out[key] as string).length > 20) {
            agentInsights.push(`[${step.agent_code.toUpperCase()} — ${step.step_type}]\n${out[key]}`);
            break;
          }
        }
      }

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const period = monthRange.start === monthRange.end
        ? monthNames[monthRange.start]
        : `${monthNames[monthRange.start]} a ${monthNames[monthRange.end]}`;

      const scope = selectedMarca.length > 0
        ? `Marca(s): ${selectedMarca.join(', ')}`
        : selectedFilial.length > 0
        ? `Filial(is): ${selectedFilial.join(', ')}`
        : 'CONSOLIDADO (todas as marcas)';

      // Build rich context from financial_summary + agent outputs
      const context = `FONTE: Equipe Alpha — Análise de Agentes IA (${new Date(run.completed_at || run.started_at).toLocaleDateString('pt-BR')})
PERÍODO: ${period}/2026 | ESCOPO: ${scope}

═══ DADOS FINANCEIROS (DRE SNAPSHOT) ═══
• Receita Líquida Real: ${fmtBRL(fs.receita.real)} | Orçado: ${fmtBRL(fs.receita.orcado)} | A-1: ${fmtBRL(fs.receita.a1)} | Gap: ${fs.receita.gap_pct?.toFixed(1)}%
• Custos Variáveis Real: ${fmtBRL(fs.custos_variaveis.real)} | Orçado: ${fmtBRL(fs.custos_variaveis.orcado)}
• Custos Fixos Real: ${fmtBRL(fs.custos_fixos.real)} | Orçado: ${fmtBRL(fs.custos_fixos.orcado)}
• SG&A Real: ${fmtBRL(fs.sga.real)} | Orçado: ${fmtBRL(fs.sga.orcado)}
• Rateio Raiz Real: ${fmtBRL(fs.rateio.real)} | Orçado: ${fmtBRL(fs.rateio.orcado)}
• Margem Contribuição Real: ${fmtBRL(fs.margem_contribuicao.real)} (${fs.margem_contribuicao.pct_real?.toFixed(1)}%) | Orçado: ${fmtBRL(fs.margem_contribuicao.orcado)} (${fs.margem_contribuicao.pct_orcado?.toFixed(1)}%)
• EBITDA Real: ${fmtBRL(fs.ebitda.real)} (${fs.ebitda.pct_real?.toFixed(1)}%) | Orçado: ${fmtBRL(fs.ebitda.orcado)}
• Saúde Margem: ${fs.margem_contribuicao.health === 'healthy' ? 'SAUDÁVEL ✅' : fs.margem_contribuicao.health === 'attention' ? 'ATENÇÃO ⚠️' : 'CRÍTICO 🔴'}

═══ TOP 5 VARIAÇÕES vs ORÇADO ═══
${(fs.top5_variacoes || []).slice(0, 5).map((v, i) =>
  `${i + 1}. ${v.tag01} — Real: ${fmtBRL(v.real)} vs Orçado: ${fmtBRL(v.orcado)} → ${v.delta_pct >= 0 ? '+' : ''}${v.delta_pct.toFixed(1)}%`
).join('\n')}

═══ TOP RECEITA (por centro de custo) ═══
${(fs.top5_tags01_receita || []).slice(0, 5).map((t, i) => `${i + 1}. ${t.tag01}: ${fmtBRL(t.total)}`).join('\n')}

═══ TOP CUSTO (por centro de custo) ═══
${(fs.top5_tags01_custo || []).slice(0, 5).map((t, i) => `${i + 1}. ${t.tag01}: ${fmtBRL(t.total)}`).join('\n')}

${fs.tendencia_mensal && fs.tendencia_mensal.length > 0 ? `═══ TENDÊNCIA MENSAL ═══
${fs.tendencia_mensal.map(m => `${m.mes}: Receita ${fmtBRL(m.receita)} | EBITDA ${fmtBRL(m.ebitda)}`).join('\n')}` : ''}

${agentInsights.length > 0 ? `═══ INSIGHTS DOS AGENTES IA ═══
${agentInsights.join('\n\n')}` : ''}

${run.consolidated_summary ? `═══ RESUMO CONSOLIDADO (Alex) ═══
${run.consolidated_summary.slice(0, 2000)}` : ''}`;

      return { context, source: 'agents' };
    } catch (err) {
      console.warn('Agent data not available:', err);
      return null;
    }
  };

  // ============================================
  // ESTRATÉGIA 2: Justificativas de Desvios
  // ============================================
  const tryVarianceData = async (): Promise<{ context: string; source: DataSource } | null> => {
    try {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const period = monthRange.start === monthRange.end
        ? monthNames[monthRange.start]
        : `${monthNames[monthRange.start]} a ${monthNames[monthRange.end]}`;
      const scope = selectedMarca.length > 0
        ? `Marca(s): ${selectedMarca.join(', ')}`
        : 'CONSOLIDADO';

      // Get latest variance version for the end month
      const yearMonth = `2026-${String(monthRange.end + 1).padStart(2, '0')}`;
      const version = await getLatestVarianceVersion(yearMonth, selectedMarca.length > 0 ? selectedMarca : undefined);
      if (!version) return null;

      const items = await getVarianceJustifications({
        year_month: yearMonth,
        marcas: selectedMarca.length > 0 ? selectedMarca : undefined,
        version,
        comparison_type: comparisonMode === 'budget' ? 'orcado' : 'a1',
      });

      if (!items || items.length === 0) return null;

      // Aggregate by tag0 (DRE lines)
      const tag0Map = new Map<string, { real: number; compare: number; variance: number; justifications: string[] }>();
      for (const item of items) {
        if (!item.tag0) continue;
        const existing = tag0Map.get(item.tag0) || { real: 0, compare: 0, variance: 0, justifications: [] };
        // Only aggregate leaf-level items to avoid double-counting
        if (item.tag02 || (!item.tag01 && !item.tag02)) {
          existing.real += item.real_value || 0;
          existing.compare += item.compare_value || 0;
          existing.variance += item.variance_abs || 0;
        }
        if (item.justification && item.justification.length > 10) {
          existing.justifications.push(`${item.tag01 || ''}${item.tag02 ? ' > ' + item.tag02 : ''}: ${item.justification.slice(0, 200)}`);
        }
        if (item.ai_summary && item.ai_summary.length > 10 && !existing.justifications.some(j => j.includes(item.ai_summary!.slice(0, 50)))) {
          existing.justifications.push(`[IA] ${item.tag01 || item.tag0}: ${item.ai_summary.slice(0, 200)}`);
        }
        tag0Map.set(item.tag0, existing);
      }

      // Top deviations
      const topDeviations = items
        .filter(i => i.variance_pct != null && Math.abs(i.variance_pct) > 5 && i.tag01)
        .sort((a, b) => Math.abs(b.variance_abs) - Math.abs(a.variance_abs))
        .slice(0, 10);

      const justifiedItems = items.filter(i => i.justification && i.justification.length > 10);

      const context = `FONTE: Justificativas de Desvios — Snapshot v${version} (${yearMonth})
PERÍODO: ${period}/2026 | ESCOPO: ${scope} | Comparação: ${comparisonMode === 'budget' ? 'Real vs Orçado' : 'Real vs A-1'}

═══ RESUMO DRE POR LINHA ═══
${Array.from(tag0Map.entries()).map(([tag0, data]) => {
  const pct = data.compare !== 0 ? ((data.real - data.compare) / Math.abs(data.compare) * 100).toFixed(1) : '—';
  return `• ${tag0}: Real ${fmtBRL(data.real)} | ${comparisonMode === 'budget' ? 'Orçado' : 'A-1'} ${fmtBRL(data.compare)} | Δ ${pct}%`;
}).join('\n')}

═══ TOP 10 MAIORES DESVIOS ═══
${topDeviations.map((d, i) =>
  `${i + 1}. ${d.tag01}${d.tag02 ? ' > ' + d.tag02 : ''} — ${d.variance_pct?.toFixed(1)}% (${fmtBRL(d.variance_abs)})${d.justification ? ' ← "' + d.justification.slice(0, 100) + '"' : ''}`
).join('\n')}

═══ JUSTIFICATIVAS DOS RESPONSÁVEIS (${justifiedItems.length} de ${items.length}) ═══
${justifiedItems.slice(0, 15).map(j =>
  `• ${j.tag01}${j.tag02 ? ' > ' + j.tag02 : ''}${j.marca ? ' [' + j.marca + ']' : ''}: ${j.justification!.slice(0, 200)}`
).join('\n')}

${Array.from(tag0Map.entries()).some(([, d]) => d.justifications.length > 0) ? `═══ SÍNTESES IA POR LINHA DRE ═══
${Array.from(tag0Map.entries()).filter(([, d]) => d.justifications.length > 0).map(([tag0, d]) =>
  `▸ ${tag0}:\n${d.justifications.slice(0, 3).join('\n')}`
).join('\n\n')}` : ''}`;

      return { context, source: 'justificativas' };
    } catch (err) {
      console.warn('Variance data not available:', err);
      return null;
    }
  };

  // ============================================
  // ESTRATÉGIA 3: Raw transactions (fallback)
  // ============================================
  const buildRawContext = (): { context: string; source: DataSource } => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const period = monthRange.start === monthRange.end
      ? monthNames[monthRange.start]
      : `${monthNames[monthRange.start]} a ${monthNames[monthRange.end]}`;
    const scope = selectedMarca.length > 0
      ? `Marca(s): ${selectedMarca.join(', ')}`
      : selectedFilial.length > 0
      ? `Filial(is): ${selectedFilial.join(', ')}`
      : 'CONSOLIDADO';

    const filteredTrans = transactions.filter(t => {
      const month = parseInt(t.date.substring(5, 7), 10) - 1;
      return t.scenario === 'Real'
        && month >= monthRange.start && month <= monthRange.end
        && (selectedMarca.length === 0 || selectedMarca.includes(t.marca || ''))
        && (selectedFilial.length === 0 || selectedFilial.includes(t.nome_filial || t.filial || ''));
    });

    let realRevenue = 0;
    for (const t of filteredTrans) {
      if ((t.tag0 || '').startsWith('01.')) realRevenue += t.amount;
    }

    const compScenario = comparisonMode === 'budget' ? 'Orçado' : 'A-1';
    const compTrans = transactions.filter(t => {
      const month = parseInt(t.date.substring(5, 7), 10) - 1;
      return t.scenario === compScenario
        && month >= monthRange.start && month <= monthRange.end
        && (selectedMarca.length === 0 || selectedMarca.includes(t.marca || ''))
        && (selectedFilial.length === 0 || selectedFilial.includes(t.nome_filial || t.filial || ''));
    });

    let compRevenue = 0;
    for (const t of compTrans) {
      if ((t.tag0 || '').startsWith('01.')) compRevenue += t.amount;
    }

    const variation = compRevenue !== 0 ? ((realRevenue - compRevenue) / Math.abs(compRevenue)) * 100 : 0;
    const topTrans = filteredTrans
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 10);

    const context = `FONTE: Transações brutas (sem análise prévia de agentes)
PERÍODO: ${period}/2026 | ESCOPO: ${scope}

═══ DADOS AGREGADOS ═══
• Receita Real: ${fmtBRL(realRevenue)} | ${compScenario}: ${fmtBRL(compRevenue)} | Variação: ${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%
• EBITDA: ${fmtBRL(kpis.ebitda)} (Margem: ${kpis.netMargin.toFixed(1)}%)
• Alunos: ${kpis.activeStudents} | Ticket: ${fmtBRL(kpis.revenuePerStudent)} | Custo/Aluno: ${fmtBRL(kpis.costPerStudent)}

═══ TOP TRANSAÇÕES POR IMPACTO ═══
${topTrans.map((t, i) =>
  `${i + 1}. ${t.vendor || 'N/A'} | ${t.ticket || ''} | ${fmtBRL(t.amount)} | ${t.description || ''}`
).join('\n')}`;

    return { context, source: 'raw' };
  };

  // ============================================
  // MAIN GENERATE
  // ============================================
  const handleGenerate = async () => {
    if (isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setIsLoadingSummary(true);
    setIsStale(false);
    setDataSource(null);

    try {
      // Cascata: Agentes → Justificativas → Raw
      let result = await tryAgentData();
      if (!result) result = await tryVarianceData();
      if (!result) result = buildRawContext();

      setDataSource(result.source);

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const period = monthRange.start === monthRange.end
        ? monthNames[monthRange.start]
        : `${monthNames[monthRange.start]} a ${monthNames[monthRange.end]}`;

      const systemPrompt = `Você é o CFO da Raiz Educação, especialista em análise financeira de escolas.
Gere um Resumo Executivo CONCISO e DE ALTO IMPACTO baseado nos dados fornecidos.

FORMATO OBRIGATÓRIO — responda APENAS com JSON válido:
{
  "summary": "2-3 parágrafos: o que aconteceu, por quê, e o que significa",
  "keyFindings": ["3-5 bullets: DESTAQUES (positivos ou negativos, com números)", "...", "..."],
  "detailedAnalysis": "Análise mais profunda: riscos identificados, oportunidades detectadas, tendências",
  "recommendations": ["3-5 bullets: AÇÕES CONCRETAS priorizadas por impacto", "...", "..."]
}

REGRAS:
- Sempre use valores em R$ e percentuais concretos dos dados — nunca invente números
- keyFindings = mix de destaques positivos e alertas (❗para riscos, ✅ para oportunidades)
- recommendations = ações práticas com prazo sugerido (curto/médio/longo prazo)
- Se houver justificativas de responsáveis, incorpore o contexto deles
- Se houver insights de agentes IA, sintetize sem repetir — agregue valor novo
- Tom: executivo, direto, baseado em dados, orientado a decisão
- Período: ${period}/2026`;

      const userMessage = `Analise os dados abaixo e gere o Resumo Executivo no formato JSON especificado.\n\n${result.context}`;

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ AI Summary API error:', response.status, errorBody);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '{}';

      // Parse JSON (handle markdown code blocks)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(jsonText) as ExecutiveSummaryResponse;

      if (!parsed.summary || !parsed.keyFindings) {
        throw new Error('Invalid response structure');
      }

      // Ensure arrays
      if (!parsed.detailedAnalysis) parsed.detailedAnalysis = '';
      if (!parsed.recommendations) parsed.recommendations = [];

      setAiSummary(parsed);
    } catch (error) {
      console.error('Erro ao gerar resumo executivo:', error);
      setAiSummary({
        summary: 'Não foi possível gerar o resumo executivo com IA neste momento.',
        detailedAnalysis: 'Tente novamente em alguns instantes.',
        keyFindings: ['Erro ao processar dados — verifique a conexão'],
        recommendations: ['Tente novamente ou verifique os filtros aplicados'],
      });
    } finally {
      setIsLoadingSummary(false);
      isGeneratingRef.current = false;
    }
  };

  const sourceLabel: Record<string, { text: string; icon: typeof Zap; color: string; bg: string }> = {
    agents: { text: 'Equipe Alpha', icon: Brain, color: 'text-purple-700', bg: 'bg-purple-100' },
    justificativas: { text: 'Justificativas', icon: Database, color: 'text-blue-700', bg: 'bg-blue-100' },
    raw: { text: 'Transações', icon: Zap, color: 'text-gray-600', bg: 'bg-gray-100' },
  };

  return (
    <section>
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="flex items-center gap-2 mb-3 group">
        <div className="h-6 w-1.5 bg-blue-500 rounded-full"></div>
        <h2 className="text-xl font-black text-gray-900">Resumo Executivo IA</h2>
        {isCollapsed ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronUp size={18} className="text-gray-400" />}
      </button>

      {!isCollapsed && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">Análise inteligente com IA</p>
              {isStale && aiSummary && (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                  <AlertCircle size={10} />
                  Filtros alterados — clique para atualizar
                </span>
              )}
              {/* Data source badge */}
              {dataSource && sourceLabel[dataSource] && !isLoadingSummary && (
                <span className={`flex items-center gap-1 px-2 py-1 ${sourceLabel[dataSource].bg} ${sourceLabel[dataSource].color} text-[10px] font-bold rounded-full`}>
                  {React.createElement(sourceLabel[dataSource].icon, { size: 10 })}
                  Fonte: {sourceLabel[dataSource].text}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={isLoadingSummary}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tight transition-all ${
                  isLoadingSummary
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isStale
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md animate-pulse'
                      : 'bg-gradient-to-r from-[#1B75BB] to-[#1557BB] text-white hover:shadow-lg'
                }`}
              >
                {isLoadingSummary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isLoadingSummary ? 'Analisando...' : aiSummary ? 'Atualizar Resumo' : 'Gerar Resumo'}
              </button>
              {!isLoadingSummary && aiSummary && (
                <button onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-300 transition-colors">
                  {isSummaryExpanded ? <><ChevronUp size={16} /><span className="text-sm font-medium">Menos</span></> : <><ChevronDown size={16} /><span className="text-sm font-medium">Mais</span></>}
                </button>
              )}
            </div>
          </div>

          {isLoadingSummary ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-sm text-gray-600 font-medium">Coletando dados e gerando análise...</p>
                <p className="text-[10px] text-gray-400">Agentes → Justificativas → IA</p>
              </div>
            </div>
          ) : aiSummary ? (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">{aiSummary.summary}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-emerald-100">
                <h4 className="text-md font-bold text-emerald-700 mb-3">Destaques, Riscos & Oportunidades</h4>
                <ul className="space-y-2">
                  {aiSummary.keyFindings.map((finding, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span className="text-gray-700 text-sm">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {isSummaryExpanded && (
                <div className="space-y-4 animate-in slide-in-from-top duration-300">
                  <div className="bg-white p-4 rounded-lg border border-blue-100">
                    <h4 className="text-md font-bold text-blue-700 mb-3">Análise Detalhada</h4>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-sm">{aiSummary.detailedAnalysis}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-amber-100">
                    <h4 className="text-md font-bold text-amber-700 mb-3">Ações Recomendadas</h4>
                    <ol className="space-y-3">
                      {aiSummary.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <span className="text-gray-700 text-sm pt-0.5">{rec}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <Sparkles size={32} className="text-blue-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">Resumo Executivo com IA</p>
              <p className="text-gray-400 text-sm">Busca dados da Equipe Alpha, justificativas de desvios e transações para gerar análise inteligente</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// Helpers
function fmtBRL(v: number | undefined | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}
