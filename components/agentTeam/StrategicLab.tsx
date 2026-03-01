import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  FlaskConical,
  Play,
  BarChart3,
  Shield,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import type {
  ScenarioConfig,
  SimulationBaseData,
  ScenarioSimulationResult,
} from '../../core/scenarioEngine';
import {
  runMultipleScenarios,
  PRESET_OPTIMISTIC,
  PRESET_CONSERVATIVE,
  PRESET_PESSIMISTIC,
  PRESET_EFFICIENCY,
  PRESET_INVESTMENT,
  PRESET_MACRO_MILD_RECESSION,
  PRESET_MACRO_SEVERE_RECESSION,
  PRESET_MACRO_ACCELERATED_GROWTH,
  PRESET_MACRO_HIGH_INFLATION,
  PRESET_MACRO_HIGH_INTEREST,
  PRESET_MACRO_STAGFLATION,
} from '../../core/scenarioEngine';
import { compareScenarios } from '../../core/scenarioComparison';
import type { ScenarioComparisonResult } from '../../core/scenarioComparison';
import { assessStrategicRisk } from '../../core/strategicRiskEngine';
import type { StrategicRiskAssessment, ScenarioRiskProfile } from '../../core/strategicRiskEngine';

// --------------------------------------------
// Props
// --------------------------------------------

interface StrategicLabProps {
  baseData: SimulationBaseData | null;
  loading?: boolean;
  onSimulationComplete?: (
    results: ScenarioSimulationResult[],
    comparison: ScenarioComparisonResult | null,
    riskAssessment: StrategicRiskAssessment | null,
  ) => void;
}

// Scenario with stable ID for React key
interface ScenarioEntry {
  id: string;
  config: ScenarioConfig;
}

// --------------------------------------------
// Constants
// --------------------------------------------

const MAX_SCENARIOS = 6;

// --------------------------------------------
// Slider Config
// --------------------------------------------

interface SliderDef {
  key: keyof ScenarioConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
}

const SLIDERS: SliderDef[] = [
  { key: 'revenue_variation_pct', label: 'Receita', min: -30, max: 30, step: 1, suffix: '%' },
  { key: 'variable_cost_variation_pct', label: 'Custos Variáveis', min: -30, max: 30, step: 1, suffix: '%' },
  { key: 'fixed_cost_variation_pct', label: 'Custos Fixos', min: -30, max: 30, step: 1, suffix: '%' },
  { key: 'sga_variation_pct', label: 'SG&A', min: -30, max: 30, step: 1, suffix: '%' },
  { key: 'ticket_variation_pct', label: 'Ticket Médio', min: -20, max: 20, step: 1, suffix: '%' },
  { key: 'student_count_variation_pct', label: 'Nº Alunos', min: -20, max: 20, step: 1, suffix: '%' },
  { key: 'scholarship_reduction_pct', label: 'Redução Bolsa', min: 0, max: 15, step: 0.5, suffix: '%' },
];

// --------------------------------------------
// Helpers
// --------------------------------------------

function formatDelta(value: number, suffix: string = '', decimals: number = 1): string {
  if (value === 0) return `0${suffix}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}${suffix}`;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

function deltaColor(value: number): string {
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

function riskBadge(level: string): { bg: string; text: string; label: string } {
  switch (level) {
    case 'very_low': return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Muito Baixo' };
    case 'low': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Baixo' };
    case 'moderate': return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Moderado' };
    case 'high': return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alto' };
    case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítico' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: level };
  }
}

// Presets list — internal scenarios
const PRESETS = [
  { label: 'Otimista', config: PRESET_OPTIMISTIC },
  { label: 'Conservador', config: PRESET_CONSERVATIVE },
  { label: 'Pessimista', config: PRESET_PESSIMISTIC },
  { label: 'Eficiência', config: PRESET_EFFICIENCY },
  { label: 'Investimento', config: PRESET_INVESTMENT },
];

// Macro presets — external/macro scenarios
const MACRO_PRESETS = [
  { label: 'Recessão Leve', config: PRESET_MACRO_MILD_RECESSION },
  { label: 'Recessão Forte', config: PRESET_MACRO_SEVERE_RECESSION },
  { label: 'Crescimento Acelerado', config: PRESET_MACRO_ACCELERATED_GROWTH },
  { label: 'Inflação Alta', config: PRESET_MACRO_HIGH_INFLATION },
  { label: 'Juros Elevados', config: PRESET_MACRO_HIGH_INTEREST },
  { label: 'Estagflação', config: PRESET_MACRO_STAGFLATION },
];

// Default empty scenario config
function createEmptyConfig(name: string): ScenarioConfig {
  return { name, description: '' };
}

// --------------------------------------------
// Slider Component (memoized)
// --------------------------------------------

const SliderInput = React.memo(function SliderInput({
  def,
  value,
  onChange,
}: {
  def: SliderDef;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-24 shrink-0">{def.label}</span>
      <input
        type="range"
        aria-label={`${def.label}: ${value}${def.suffix}`}
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 accent-indigo-600"
      />
      <span className={`text-[11px] font-mono w-14 text-right ${
        value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : 'text-gray-400'
      }`}>
        {value > 0 ? '+' : ''}{value}{def.suffix}
      </span>
    </div>
  );
});

// --------------------------------------------
// Scenario Card Component (memoized)
// --------------------------------------------

const ScenarioCard = React.memo(function ScenarioCard({
  config,
  index,
  onUpdateConfig,
  onRemove,
  result,
  riskProfile,
  stale,
}: {
  config: ScenarioConfig;
  index: number;
  onUpdateConfig: (idx: number, config: ScenarioConfig) => void;
  onRemove: (idx: number) => void;
  result: ScenarioSimulationResult | null;
  riskProfile: ScenarioRiskProfile | null;
  stale: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  const updateSlider = useCallback((key: keyof ScenarioConfig, value: number) => {
    onUpdateConfig(index, {
      ...config,
      [key]: value === 0 ? undefined : value,
    });
  }, [config, index, onUpdateConfig]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5 text-indigo-500" />
          <input
            type="text"
            aria-label="Nome do cenário"
            value={config.name}
            onChange={(e) => onUpdateConfig(index, { ...config, name: e.target.value })}
            className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none w-32"
          />
          {riskProfile && (() => {
            const badge = riskBadge(riskProfile.risk_level);
            return (
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label={expanded ? 'Recolher cenário' : 'Expandir cenário'}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="Remover cenário"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          {/* Sliders */}
          {SLIDERS.map((def) => (
            <SliderInput
              key={def.key}
              def={def}
              value={(config[def.key] as number) ?? 0}
              onChange={(v) => updateSlider(def.key, v)}
            />
          ))}

          {/* Results */}
          {result && (
            <div className={`mt-3 pt-3 border-t border-gray-100 ${stale ? 'opacity-50' : ''}`}>
              {stale && (
                <div className="text-[9px] text-amber-600 mb-1 font-medium">
                  Resultado desatualizado — clique Simular
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {/* Score */}
                <div className="text-center">
                  <div className="text-[9px] text-gray-400">Score</div>
                  <div className="text-lg font-bold text-gray-800">{result.score.score}</div>
                  <div className={`text-[10px] font-mono ${deltaColor(result.delta_vs_base.score_delta)}`}>
                    {formatDelta(result.delta_vs_base.score_delta, 'pts', 0)}
                  </div>
                </div>
                {/* EBITDA */}
                <div className="text-center">
                  <div className="text-[9px] text-gray-400">EBITDA</div>
                  <div className="text-sm font-bold text-gray-800">{formatCurrency(result.financial_summary.ebitda)}</div>
                  <div className={`text-[10px] font-mono ${deltaColor(result.delta_vs_base.ebitda_delta_pct)}`}>
                    {formatDelta(result.delta_vs_base.ebitda_delta_pct, '%')}
                  </div>
                </div>
                {/* Margem */}
                <div className="text-center">
                  <div className="text-[9px] text-gray-400">Margem</div>
                  <div className="text-sm font-bold text-gray-800">{result.financial_summary.margem_contribuicao_pct.toFixed(1)}%</div>
                  <div className={`text-[10px] font-mono ${deltaColor(result.delta_vs_base.margem_delta_pp)}`}>
                    {formatDelta(result.delta_vs_base.margem_delta_pp, 'pp')}
                  </div>
                </div>
              </div>

              {/* Stability & Risk */}
              {riskProfile && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                  <div className="text-[10px] text-gray-500">
                    <Shield className="w-3 h-3 inline -mt-0.5 mr-1" />
                    Estabilidade: {riskProfile.stability_index}/100
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Confiança: {riskProfile.confidence_index}/100
                  </div>
                </div>
              )}

              {/* Risk Alerts */}
              {riskProfile && riskProfile.risk_alerts.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {riskProfile.risk_alerts.map((alert, i) => (
                    <div key={i} className="text-[9px] text-red-600 flex items-start gap-1">
                      <span className="shrink-0 mt-0.5">!</span>
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// --------------------------------------------
// Comparison Panel (memoized)
// --------------------------------------------

const ComparisonPanel = React.memo(function ComparisonPanel({ comparison }: { comparison: ScenarioComparisonResult }) {
  const best = comparison.best_overall;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-indigo-600" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Comparação Multi-Cenário
        </span>
      </div>

      {/* Best overall */}
      <div className="bg-indigo-50 rounded-lg p-3 mb-3">
        <div className="text-[10px] text-indigo-600 font-medium">Melhor Cenário Geral</div>
        <div className="text-sm font-bold text-indigo-900">{best.scenario_name}</div>
        <div className="flex gap-4 mt-1 text-[10px] text-indigo-700">
          <span>Score: {best.score}</span>
          <span>EBITDA: {formatCurrency(best.ebitda)}</span>
          <span>Margem: {best.margin_pct.toFixed(1)}%</span>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-2 gap-2">
        {(['by_score', 'by_ebitda', 'by_margin', 'by_risk'] as const).map((key) => {
          const ranking = comparison.rankings[key];
          return (
            <div key={key} className="border border-gray-100 rounded p-2">
              <div className="text-[9px] text-gray-400 mb-1">{ranking.label}</div>
              {ranking.entries.map((e) => (
                <div key={e.scenario_index} className="flex items-center justify-between text-[10px]">
                  <span className={`${e.rank === 1 ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                    {e.rank}. {e.scenario_name}
                  </span>
                  <span className="font-mono text-gray-600">
                    {key === 'by_ebitda' ? formatCurrency(e.value) : e.value.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Pairwise */}
      {comparison.top_comparison && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-600">
          <span className="font-medium">{comparison.top_comparison.scenario_a}</span>
          {' vs '}
          <span className="font-medium">{comparison.top_comparison.scenario_b}</span>
          {': Score '}
          <span className={deltaColor(comparison.top_comparison.score_diff)}>
            {formatDelta(comparison.top_comparison.score_diff)}
          </span>
          {', EBITDA '}
          <span className={deltaColor(comparison.top_comparison.ebitda_diff)}>
            {formatDelta(comparison.top_comparison.ebitda_diff)}
          </span>
          {' → '}
          <span className="font-bold">{comparison.top_comparison.winner}</span>
        </div>
      )}
    </div>
  );
});

// --------------------------------------------
// Main Component
// --------------------------------------------

const StrategicLab: React.FC<StrategicLabProps> = ({ baseData, loading, onSimulationComplete }) => {
  const idCounter = useRef(0);

  const makeId = useCallback(() => {
    idCounter.current += 1;
    return `sc-${idCounter.current}`;
  }, []);

  const [scenarios, setScenarios] = useState<ScenarioEntry[]>(() => [
    { id: `sc-init-1`, config: { ...PRESET_OPTIMISTIC } },
    { id: `sc-init-2`, config: { ...PRESET_CONSERVATIVE } },
    { id: `sc-init-3`, config: { ...PRESET_PESSIMISTIC } },
  ]);
  const [results, setResults] = useState<ScenarioSimulationResult[] | null>(null);
  const [comparison, setComparison] = useState<ScenarioComparisonResult | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<StrategicRiskAssessment | null>(null);
  const [running, setRunning] = useState(false);
  const [stale, setStale] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const addScenario = useCallback(() => {
    setScenarios(prev => [
      ...prev,
      { id: makeId(), config: createEmptyConfig(`Cenário ${prev.length + 1}`) },
    ]);
    setStale(true);
  }, [makeId]);

  const addPreset = useCallback((preset: ScenarioConfig) => {
    setScenarios(prev => [...prev, { id: makeId(), config: { ...preset } }]);
    setPresetsOpen(false);
    setStale(true);
  }, [makeId]);

  const removeScenario = useCallback((idx: number) => {
    setScenarios(prev => prev.filter((_, i) => i !== idx));
    setResults(null);
    setComparison(null);
    setRiskAssessment(null);
    setStale(false);
  }, []);

  const updateScenarioConfig = useCallback((idx: number, config: ScenarioConfig) => {
    setScenarios(prev => prev.map((entry, i) => i === idx ? { ...entry, config } : entry));
    setStale(true);
  }, []);

  const resetAll = useCallback(() => {
    setScenarios([
      { id: `sc-init-1`, config: { ...PRESET_OPTIMISTIC } },
      { id: `sc-init-2`, config: { ...PRESET_CONSERVATIVE } },
      { id: `sc-init-3`, config: { ...PRESET_PESSIMISTIC } },
    ]);
    setResults(null);
    setComparison(null);
    setRiskAssessment(null);
    setStale(false);
  }, []);

  const runSimulations = useCallback(() => {
    if (!baseData || scenarios.length === 0) return;
    setRunning(true);

    try {
      const configs = scenarios.map(s => s.config);
      const simResults = runMultipleScenarios(baseData, configs);
      setResults(simResults);

      let comp: ScenarioComparisonResult | null = null;
      if (simResults.length >= 2) {
        comp = compareScenarios(...simResults);
      }
      setComparison(comp);

      const risk = assessStrategicRisk(simResults);
      setRiskAssessment(risk);
      setStale(false);

      // Notify parent with simulation results
      onSimulationComplete?.(simResults, comp, risk);
    } finally {
      setRunning(false);
    }
  }, [baseData, scenarios, onSimulationComplete]);

  // Map risk profiles by scenario index
  const riskProfileMap = useMemo(() => {
    if (!riskAssessment) return new Map<number, ScenarioRiskProfile>();
    const map = new Map<number, ScenarioRiskProfile>();
    riskAssessment.profiles.forEach((p, i) => map.set(i, p));
    return map;
  }, [riskAssessment]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!baseData) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">Dados financeiros não disponíveis</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-800">Laboratório de Simulação Estratégica</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Presets dropdown (state-controlled, keyboard accessible) */}
          <div className="relative">
            <button
              onClick={() => setPresetsOpen(p => !p)}
              aria-expanded={presetsOpen}
              aria-haspopup="listbox"
              className="text-[10px] px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Preset
            </button>
            {presetsOpen && (
              <div role="listbox" className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-72 overflow-y-auto">
                <div className="px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  Cenários Internos
                </div>
                {PRESETS.map((p) => (
                  <button
                    role="option"
                    key={p.label}
                    onClick={() => addPreset(p.config)}
                    className="block w-full text-left text-[10px] px-3 py-1.5 hover:bg-gray-50 text-gray-600"
                  >
                    {p.label}
                  </button>
                ))}
                <div className="px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-indigo-500 border-b border-t border-gray-100 bg-indigo-50/50">
                  Cenários Macro
                </div>
                {MACRO_PRESETS.map((p) => (
                  <button
                    role="option"
                    key={p.label}
                    onClick={() => addPreset(p.config)}
                    className="block w-full text-left text-[10px] px-3 py-1.5 hover:bg-indigo-50/30 text-indigo-700"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={addScenario}
            disabled={scenarios.length >= MAX_SCENARIOS}
            className="text-[10px] px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" /> Cenário
          </button>
          <button
            onClick={resetAll}
            className="text-[10px] px-2 py-1 border border-gray-200 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            title="Resetar tudo"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={runSimulations}
            disabled={scenarios.length === 0 || running}
            className="text-[10px] px-3 py-1.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Play className="w-3 h-3" />
            {running ? 'Simulando...' : 'Simular'}
          </button>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {scenarios.map((entry, i) => (
          <ScenarioCard
            key={entry.id}
            config={entry.config}
            index={i}
            onUpdateConfig={updateScenarioConfig}
            onRemove={removeScenario}
            result={results?.[i] ?? null}
            riskProfile={riskProfileMap.get(i) ?? null}
            stale={stale && results !== null}
          />
        ))}
      </div>

      {/* Comparison Panel */}
      {comparison && <ComparisonPanel comparison={comparison} />}

      {/* Risk Summary */}
      {riskAssessment && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Avaliação de Risco
            </span>
          </div>
          <div className="text-[11px] text-gray-600">{riskAssessment.summary}</div>
        </div>
      )}
    </div>
  );
};

export default StrategicLab;
