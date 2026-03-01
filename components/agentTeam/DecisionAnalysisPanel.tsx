import React, { useMemo } from 'react';
import {
  Lightbulb,
  ArrowRight,
  Zap,
  ShieldAlert,
  Scale,
  Target,
  Ban,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { ScenarioSimulationResult } from '../../core/scenarioEngine';
import type { ScenarioComparisonResult } from '../../core/scenarioComparison';
import type { StrategicRiskAssessment } from '../../core/strategicRiskEngine';
import { generateDecisionAnalysis } from '../../core/strategicDecisionEngine';
import type {
  DecisionAnalysisResult,
  StrategicRecommendation,
  StrategicTradeoff,
  QuickWin,
  RecommendationPriority,
} from '../../core/strategicDecisionEngine';

// --------------------------------------------
// Props
// --------------------------------------------

interface DecisionAnalysisPanelProps {
  scenarios: ScenarioSimulationResult[] | null;
  comparison: ScenarioComparisonResult | null;
  riskAssessment: StrategicRiskAssessment | null;
  loading?: boolean;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function priorityConfig(p: RecommendationPriority): { bg: string; text: string; label: string } {
  switch (p) {
    case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítico' };
    case 'high': return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alto' };
    case 'medium': return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Médio' };
    case 'low': return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Baixo' };
  }
}

function horizonLabel(h: string): string {
  switch (h) {
    case 'immediate': return 'Imediato';
    case 'short_term': return 'Curto Prazo';
    case 'medium_term': return 'Médio Prazo';
    case 'long_term': return 'Longo Prazo';
    default: return h;
  }
}

function deltaColor(v: number): string {
  if (v > 0) return 'text-emerald-600';
  if (v < 0) return 'text-red-600';
  return 'text-gray-500';
}

function formatDelta(v: number, suffix: string = ''): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}${suffix}`;
}

// --------------------------------------------
// Sub-components
// --------------------------------------------

const RecommendationCard: React.FC<{ rec: StrategicRecommendation; primary?: boolean }> = ({ rec, primary }) => {
  const p = priorityConfig(rec.priority);
  return (
    <div className={`rounded-lg border p-3 ${primary ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {primary && <Target className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
          <span className={`text-xs font-bold ${primary ? 'text-indigo-900' : 'text-gray-800'}`}>
            {rec.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${p.bg} ${p.text}`}>
            {p.label}
          </span>
          <span className="text-[9px] text-gray-400">
            {horizonLabel(rec.time_horizon)}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-600 mb-2">{rec.description}</p>
      <div className="flex items-center gap-4 text-[10px]">
        <span className={deltaColor(rec.expected_score_impact)}>
          Score: {formatDelta(rec.expected_score_impact, 'pts')}
        </span>
        <span className={deltaColor(rec.expected_ebitda_impact_pct)}>
          EBITDA: {formatDelta(rec.expected_ebitda_impact_pct, '%')}
        </span>
        {rec.based_on_scenarios.length > 0 && (
          <span className="text-gray-400">
            Base: {rec.based_on_scenarios.join(', ')}
          </span>
        )}
      </div>
      {rec.rationale && (
        <p className="text-[9px] text-gray-400 mt-1.5 italic">{rec.rationale}</p>
      )}
    </div>
  );
};

const TradeoffCard: React.FC<{ tradeoff: StrategicTradeoff }> = ({ tradeoff }) => {
  const verdictLabel = tradeoff.verdict === 'favor_a'
    ? tradeoff.scenario_a
    : tradeoff.verdict === 'favor_b'
    ? tradeoff.scenario_b
    : 'Depende do contexto';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Scale className="w-3.5 h-3.5 text-purple-500" />
        <span className="text-xs font-bold text-gray-800">{tradeoff.description}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="text-[10px]">
          <span className="font-medium text-emerald-600">{tradeoff.scenario_a}</span>
          <p className="text-gray-500 mt-0.5">Ganho: {tradeoff.gain}</p>
        </div>
        <div className="text-[10px]">
          <span className="font-medium text-amber-600">{tradeoff.scenario_b}</span>
          <p className="text-gray-500 mt-0.5">Perda: {tradeoff.loss}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        <ArrowRight className="w-3 h-3 text-gray-400" />
        <span className="font-medium text-gray-700">Veredicto: {verdictLabel}</span>
      </div>
    </div>
  );
};

const QuickWinCard: React.FC<{ win: QuickWin; index: number }> = ({ win, index }) => (
  <div className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-b-0">
    <span className="text-[9px] font-bold w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
      {index + 1}
    </span>
    <div className="flex-1">
      <p className="text-[11px] text-gray-800 font-medium">{win.action}</p>
      <div className="flex items-center gap-3 mt-0.5 text-[10px]">
        <span className="text-emerald-600">Score: +{win.score_uplift.toFixed(1)}pts</span>
        <span className="text-emerald-600">EBITDA: +{win.ebitda_uplift_pct.toFixed(1)}%</span>
        <span className="text-gray-400">Risco: {win.risk}</span>
      </div>
    </div>
  </div>
);

// --------------------------------------------
// Main Component
// --------------------------------------------

const DecisionAnalysisPanel: React.FC<DecisionAnalysisPanelProps> = ({
  scenarios,
  comparison,
  riskAssessment,
  loading,
}) => {
  // Run decision analysis (pure, synchronous)
  const analysis = useMemo<DecisionAnalysisResult | null>(() => {
    if (!scenarios || scenarios.length < 2 || !comparison || !riskAssessment) return null;
    try {
      return generateDecisionAnalysis(scenarios, comparison, riskAssessment);
    } catch {
      return null;
    }
  }, [scenarios, comparison, riskAssessment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">Simule ao menos 2 cenários no Laboratório para gerar análise de decisão</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            Síntese Estratégica
          </span>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed">{analysis.executive_summary}</p>
      </div>

      {/* Recommended Scenario */}
      <div className="bg-white rounded-xl border border-emerald-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Cenário Recomendado
          </span>
        </div>
        <div className="text-sm font-bold text-gray-900">{analysis.recommended_scenario.name}</div>
        <p className="text-[11px] text-gray-500 mt-1">{analysis.recommended_scenario.reason}</p>
      </div>

      {/* Primary Recommendation */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Recomendação Principal
        </div>
        <RecommendationCard rec={analysis.primary_recommendation} primary />
      </div>

      {/* All Recommendations */}
      {analysis.recommendations.length > 1 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
            Recomendações Adicionais
          </div>
          <div className="space-y-2">
            {analysis.recommendations.slice(1).map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins + Actions to Avoid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Wins */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Quick Wins
            </span>
          </div>
          {analysis.quick_wins.length > 0 ? (
            <div>
              {analysis.quick_wins.map((win, i) => (
                <QuickWinCard key={i} win={win} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-gray-400">
              Nenhum quick win identificado nos cenários atuais
            </div>
          )}
        </div>

        {/* Actions to Avoid */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Ações a Evitar
            </span>
          </div>
          {analysis.actions_to_avoid.length > 0 ? (
            <div className="space-y-2">
              {analysis.actions_to_avoid.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-red-700">
                  <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-gray-400">
              Nenhuma ação de risco identificada
            </div>
          )}
        </div>
      </div>

      {/* Trade-offs */}
      {analysis.tradeoffs.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
            Trade-offs Estratégicos
          </div>
          <div className="space-y-2">
            {analysis.tradeoffs.map((tradeoff, i) => (
              <TradeoffCard key={i} tradeoff={tradeoff} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionAnalysisPanel;
