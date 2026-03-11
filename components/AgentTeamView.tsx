import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Brain, Play, Loader2, ChevronDown, Users, Clock, Flag, Building2, Layers, CalendarDays, LayoutGrid, Columns, Trash2, X, AlertTriangle, Target, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSomaTags, getDREFilterOptions, getVarianceJustifications, getLatestVarianceVersion } from '../services/supabaseService';
import type { DREFilterOptions, VarianceJustification } from '../services/supabaseService';
import type { Team, Agent, TeamAgent, AgentRun, AgentStep } from '../types/agentTeam';
import * as agentTeamService from '../services/agentTeamService';
import MultiSelectFilter from './MultiSelectFilter';
import RunHeader, { FilterBadges } from './agentTeam/RunHeader';
import AgentWorkstation from './agentTeam/AgentWorkstation';
import ConsolidationPanel from './agentTeam/ConsolidationPanel';
import ScheduleManager from './agentTeam/ScheduleManager';

const MONTH_OPTIONS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTH_MAP: Record<string, string> = {
  Jan:'01', Fev:'02', Mar:'03', Abr:'04', Mai:'05', Jun:'06',
  Jul:'07', Ago:'08', Set:'09', Out:'10', Nov:'11', Dez:'12',
};

const AgentTeamView: React.FC = () => {
  const { user, isAdmin } = useAuth();

  // Team selection
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamAgents, setTeamAgents] = useState<(TeamAgent & { agent: Agent })[]>([]);

  // Run state
  const [objective, setObjective] = useState('');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);
  const [activeSteps, setActiveSteps] = useState<AgentStep[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [filterOptions, setFilterOptions] = useState<DREFilterOptions>({ marcas: [], nome_filiais: [], tags01: [] });
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);
  const [selectedTags01, setSelectedTags01] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // Snapshot info
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  // Single agent test
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<agentTeamService.SingleAgentTestResult | null>(null);

  // View mode: 'cards' (grid with expand/collapse) or 'tabs' (single tab view)
  const [viewMode, setViewMode] = useState<'cards' | 'tabs'>('cards');
  const [activeTabStepId, setActiveTabStepId] = useState<string | null>(null);

  // Polling ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived
  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  const consolidationStep = useMemo(
    () => activeSteps.find((s) => s.agent_code === 'alex' && s.step_type === 'consolidate'),
    [activeSteps],
  );

  const isRunning = activeRun?.status === 'running';

  // Auto-select tab in tabs mode
  useEffect(() => {
    if (viewMode !== 'tabs' || activeSteps.length === 0) return;
    const running = activeSteps.find(s => s.status === 'running');
    if (running) { setActiveTabStepId(running.id); return; }
    if (activeTabStepId && activeSteps.some(s => s.id === activeTabStepId)) return;
    const lastCompleted = [...activeSteps].reverse().find(s => s.status === 'completed');
    setActiveTabStepId(lastCompleted?.id ?? activeSteps[0].id);
  }, [activeSteps, viewMode]);

  // Filiais cascata — filtra por marca selecionada
  const filiaisFiltradas = useMemo(() => {
    if (selectedMarcas.length === 0) return filterOptions.nome_filiais;
    return filterOptions.nome_filiais.filter(f =>
      selectedMarcas.some(m => f.startsWith(m + ' - ') || f.startsWith(m + '-'))
    );
  }, [selectedMarcas, filterOptions.nome_filiais]);

  // Limpar filiais quando marca muda e invalida seleção
  useEffect(() => {
    if (selectedMarcas.length > 0) {
      setSelectedFiliais(prev => prev.filter(f => filiaisFiltradas.includes(f)));
    }
  }, [filiaisFiltradas, selectedMarcas.length]);

  // 1. Carregar teams + filter options no mount
  useEffect(() => {
    agentTeamService.getTeams().then((data) => {
      setTeams(data);
      if (data.length === 1) setSelectedTeamId(data[0].id);
    });
    agentTeamService.listRuns(10).then((data) => setRuns(data.runs));
    getDREFilterOptions({ monthFrom: '2026-01', monthTo: '2026-12' }).then(setFilterOptions);
  }, []);

  // 2. Carregar agents quando team muda
  useEffect(() => {
    if (!selectedTeamId) {
      setTeamAgents([]);
      return;
    }
    agentTeamService.getTeamAgents(selectedTeamId).then(setTeamAgents);
  }, [selectedTeamId]);

  // 3. Polling do run ativo
  useEffect(() => {
    if (!activeRunId) return;

    const poll = async () => {
      try {
        const { run, steps } = await agentTeamService.getRun(activeRunId);
        setActiveRun(run);
        setActiveSteps(steps);
        if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          agentTeamService.listRuns(10).then((data) => setRuns(data.runs));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Polling error';
        console.error('Polling error:', msg);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeRunId]);

  // 4. Helper — busca DRE snapshot (foto ou ao vivo)
  const fetchDreData = useCallback(async () => {
    const sortedMonths = selectedMonths.map(m => MONTH_MAP[m]).sort();
    const yearMonths = sortedMonths.length > 0
      ? sortedMonths.map(mm => `2026-${mm}`)
      : ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'];

    let dreSnapshot: Record<string, unknown>[] = [];
    let usedSnapshot = false;
    let snapDate: string | null = null;

    // Buscar snapshot da foto (variance_justifications) — SEMPRE a versão mais recente por mês
    const allVarItems: VarianceJustification[] = [];
    const versionsByMonth: Record<string, number> = {};
    const hasMarcaFilter = selectedMarcas.length > 0;

    for (const ym of yearMonths) {
      // Versão é por snapshot (mês), NÃO por marca — buscar sem filtro de marca
      const latestVersion = await getLatestVarianceVersion(ym);
      if (latestVersion === 0) continue; // sem foto para este mês
      versionsByMonth[ym] = latestVersion;
      // Buscar TODOS os items da versão (com e sem marca) para poder agregar corretamente
      const items = await getVarianceJustifications({
        year_month: ym,
        version: latestVersion,
      });
      allVarItems.push(...items);
    }

    if (allVarItems.length > 0) {
      // Agregar valores por (tag0, tag01, scenario, month)
      // ATENÇÃO: cada tag01 tem 2 rows (orcado + a1), ambas com mesmo real_value
      // Real deve ser contado UMA vez por (tag0, tag01, month) — usar apenas comparison_type='orcado'
      const aggMap = new Map<string, number>();

      if (hasMarcaFilter) {
        // MARCA SELECIONADA: usar items tag02+marca (depth 2) e agregar UP para tag0+tag01
        // Para tag0 que NÃO tem items tag02 para a marca selecionada, usar consolidado (marca='')
        // 1. Descobrir quais tag0 têm detalhamento tag02 com a marca selecionada
        const tag0sComTag02 = new Set<string>();
        for (const item of allVarItems) {
          if (item.tag02 && item.marca && selectedMarcas.includes(item.marca)) {
            tag0sComTag02.add(item.tag0);
          }
        }

        for (const item of allVarItems) {
          const itemTag0 = item.tag0;
          const temDetalhe = tag0sComTag02.has(itemTag0);

          if (temDetalhe) {
            // Tag0 COM tag02+marca: agregar a partir dos items tag02
            if (!item.tag02) continue; // pular consolidados
            if (!item.marca || !selectedMarcas.includes(item.marca)) continue;
          } else {
            // Tag0 SEM tag02 para esta marca: usar consolidados (marca='')
            if (item.tag02) continue; // só tag0+tag01
          }

          // Real — contar apenas via orcado para não duplicar
          if (item.comparison_type === 'orcado') {
            const keyReal = `${itemTag0}|${item.tag01 || ''}|Real|${item.year_month}`;
            aggMap.set(keyReal, (aggMap.get(keyReal) || 0) + Number(item.real_value || 0));
          }

          // Orçado ou A-1
          const scenarioLabel = item.comparison_type === 'orcado' ? 'Orçado' : 'Ano Anterior';
          const keyComp = `${itemTag0}|${item.tag01 || ''}|${scenarioLabel}|${item.year_month}`;
          aggMap.set(keyComp, (aggMap.get(keyComp) || 0) + Number(item.compare_value || 0));
        }
      } else {
        // SEM MARCA: usar items tag0+tag01 consolidados (marca='')
        for (const item of allVarItems) {
          if (item.tag02) continue; // só depth 0-1 (tag0+tag01)

          // Real — contar apenas via orcado para não duplicar
          if (item.comparison_type === 'orcado') {
            const keyReal = `${item.tag0}|${item.tag01 || ''}|Real|${item.year_month}`;
            aggMap.set(keyReal, (aggMap.get(keyReal) || 0) + Number(item.real_value || 0));
          }

          // Orçado ou A-1
          const scenarioLabel = item.comparison_type === 'orcado' ? 'Orçado' : 'Ano Anterior';
          const keyComp = `${item.tag0}|${item.tag01 || ''}|${scenarioLabel}|${item.year_month}`;
          aggMap.set(keyComp, (aggMap.get(keyComp) || 0) + Number(item.compare_value || 0));
        }
      }

      const somaTagsRows: Record<string, unknown>[] = [];
      for (const [key, total] of aggMap) {
        const [tag0, tag01, scenario, month] = key.split('|');
        somaTagsRows.push({ tag0, tag01, scenario, month, total });
      }

      // Gerar CalcRows (linhas calculadas da DRE) — mesma lógica do SomaTagsView
      // Acumular totais por (tag0_prefix, scenario, month)
      const calcAgg = new Map<string, number>();
      for (const row of somaTagsRows) {
        const prefix = ((row.tag0 as string) || '').slice(0, 3); // '01.', '02.', etc.
        const k = `${prefix}|${row.scenario}|${row.month}`;
        calcAgg.set(k, (calcAgg.get(k) || 0) + Number(row.total || 0));
      }

      // Helper para somar prefixos por (scenario, month)
      const sumPrefixes = (prefixes: string[], scenario: string, month: string) =>
        prefixes.reduce((acc, p) => acc + (calcAgg.get(`${p}|${scenario}|${month}`) || 0), 0);

      // Coletar combinações únicas de (scenario, month)
      const scenarioMonths = new Set<string>();
      for (const row of somaTagsRows) {
        scenarioMonths.add(`${row.scenario}|${row.month}`);
      }

      for (const sm of scenarioMonths) {
        const [scenario, month] = sm.split('|');
        // MARGEM DE CONTRIBUIÇÃO = 01 + 02 + 03
        const margem = sumPrefixes(['01.', '02.', '03.'], scenario, month);
        somaTagsRows.push({ tag0: '▶ MARGEM DE CONTRIBUIÇÃO', tag01: '', scenario, month, total: margem });

        // EBITDA (S/ RATEIO RAIZ CSC) = 01 + 02 + 03 + 04
        const ebitdaSemRateio = sumPrefixes(['01.', '02.', '03.', '04.'], scenario, month);
        somaTagsRows.push({ tag0: '▶ EBITDA (S/ RATEIO RAIZ CSC)', tag01: '', scenario, month, total: ebitdaSemRateio });

        // EBITDA TOTAL = 01 + 02 + 03 + 04 + 05
        const ebitdaTotal = sumPrefixes(['01.', '02.', '03.', '04.', '05.'], scenario, month);
        somaTagsRows.push({ tag0: '▶ EBITDA TOTAL', tag01: '', scenario, month, total: ebitdaTotal });
      }

      if (somaTagsRows.length > 0) {
        dreSnapshot = somaTagsRows;
        usedSnapshot = true;
        const snapDates = allVarItems.map(i => i.snapshot_at).filter(Boolean).sort().reverse();
        snapDate = snapDates[0] || null;
        console.log(`📸 Usando foto v${JSON.stringify(versionsByMonth)}: ${somaTagsRows.length} rows (incl. CalcRows), snapshot_at=${snapDate}`);
      }
    }

    // Fallback: dados ao vivo
    if (!usedSnapshot) {
      const mFrom = yearMonths[0];
      const mTo = yearMonths[yearMonths.length - 1];
      dreSnapshot = await getSomaTags(mFrom, mTo, selectedMarcas.length > 0 ? selectedMarcas : undefined, selectedFiliais.length > 0 ? selectedFiliais : undefined, undefined, selectedTags01.length > 0 ? selectedTags01 : undefined) as Record<string, unknown>[];
      console.log(`⚡ Sem foto disponível, usando dados ao vivo: ${dreSnapshot.length} rows`);
    }

    setSnapshotAt(snapDate);

    const monthsLabel = selectedMonths.length > 0 ? selectedMonths.join(', ') : 'Jan-Dez';
    const filterContext: Record<string, unknown> = {
      year: '2026',
      months_range: monthsLabel,
      data_source: usedSnapshot ? 'snapshot' : 'live',
    };
    if (selectedMarcas.length > 0) filterContext.marcas = selectedMarcas;
    if (selectedFiliais.length > 0) filterContext.filiais = selectedFiliais;
    if (selectedTags01.length > 0) filterContext.tags01 = selectedTags01;
    if (snapDate) filterContext.snapshot_at = snapDate;
    if (Object.keys(versionsByMonth).length > 0) filterContext.snapshot_versions = versionsByMonth;

    return { dreSnapshot, filterContext };
  }, [selectedMonths, selectedMarcas, selectedFiliais, selectedTags01]);

  // 4b. Iniciar pipeline completo
  const handleStart = useCallback(async () => {
    if (!selectedTeamId || !objective.trim() || !user) return;
    setIsStarting(true);
    setError(null);

    try {
      const { dreSnapshot, filterContext } = await fetchDreData();

      const { runId } = await agentTeamService.startPipeline(
        selectedTeamId,
        objective.trim(),
        dreSnapshot,
        filterContext,
        user.email,
        user.name
      );
      setActiveRunId(runId);
      setObjective('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar pipeline';
      setError(msg);
    } finally {
      setIsStarting(false);
    }
  }, [selectedTeamId, objective, user, fetchDreData]);

  // 4c. Testar pipeline até agente-alvo (Alex → ... → alvo)
  const [testingStep, setTestingStep] = useState<string | null>(null);
  const [pipelineResults, setPipelineResults] = useState<agentTeamService.SingleAgentTestResult[]>([]);

  const handleTestPipeline = useCallback(async (targetAgent: string) => {
    if (!objective.trim()) return;
    setIsTesting(true);
    setError(null);
    setTestResult(null);
    setPipelineResults([]);
    setTestingStep('Carregando dados...');

    try {
      const { dreSnapshot, filterContext } = await fetchDreData();
      const result = await agentTeamService.testPipelineUpTo(
        targetAgent,
        objective.trim(),
        dreSnapshot,
        filterContext,
        (stepResult, idx, total) => {
          setPipelineResults(prev => [...prev, stepResult]);
          if (idx < total - 1) {
            const next = idx + 1 < total ? `Step ${idx + 2}...` : '';
            setTestingStep(`${stepResult.agentCode} ✓ ${next}`);
          }
        },
      );
      // Último resultado como testResult principal (para compatibilidade)
      const lastStep = result.steps[result.steps.length - 1];
      setTestResult(lastStep);
      setTestingStep(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Erro ao testar pipeline até ${targetAgent}`;
      setError(msg);
      setTestingStep(null);
    } finally {
      setIsTesting(false);
    }
  }, [objective, fetchDreData]);

  // 4d. Cancelar pipeline
  const handleCancel = useCallback(async () => {
    if (!activeRunId) return;
    try {
      await agentTeamService.cancelRun(activeRunId);
      setActiveRunId(null);
      setActiveRun(null);
      setActiveSteps([]);
      agentTeamService.listRuns(10).then((data) => setRuns(data.runs));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cancelar';
      setError(msg);
    }
  }, [activeRunId]);

  // 5. Continuar pipeline (fallback manual)
  const handleContinue = useCallback(async () => {
    if (!activeRunId) return;
    try {
      await agentTeamService.processNextStep(activeRunId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao continuar';
      setError(msg);
    }
  }, [activeRunId]);

  // 6. Review step
  const handleReview = useCallback(async (
    stepId: string,
    action: 'approved' | 'revision_requested',
    comment: string,
  ) => {
    if (!user) return;
    try {
      await agentTeamService.reviewStep(stepId, action, comment, user.email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao revisar';
      setError(msg);
    }
  }, [user]);

  // 7. Rerun single step
  const handleRerun = useCallback(async (stepId: string) => {
    try {
      const { runId } = await agentTeamService.rerunStep(stepId, '');
      setActiveRunId(runId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao reexecutar';
      setError(msg);
    }
  }, []);

  // 8. Full rerun — rerun from first step
  const handleFullRerun = useCallback(async () => {
    if (activeSteps.length === 0) return;
    const firstStep = activeSteps.reduce((min, s) =>
      s.step_order < min.step_order ? s : min, activeSteps[0]);
    try {
      const { runId } = await agentTeamService.rerunStep(firstStep.id, 'Reexecução completa');
      setActiveRunId(runId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao reexecutar pipeline';
      setError(msg);
    }
  }, [activeSteps]);

  // 9. Deletar run
  const handleDeleteRun = useCallback(async (runId: string) => {
    if (!window.confirm('Excluir esta análise? Esta ação não pode ser desfeita.')) return;
    setDeletingId(runId);
    try {
      await agentTeamService.deleteRun(runId);
      // Se era o run ativo, limpar a view
      if (activeRunId === runId) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setActiveRunId(null);
        setActiveRun(null);
        setActiveSteps([]);
      }
      // Refresh lista
      const { runs: updated } = await agentTeamService.listRuns(10);
      setRuns(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  }, [activeRunId]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary-100)' }}>
          <Brain size={24} style={{ color: 'var(--color-primary-600)' }} />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-gray-900)' }}>
            Equipe Financeira 2.0
          </h1>
          <p className="text-xs text-gray-500">Análise automatizada por agentes IA</p>
        </div>
      </div>

      {/* Team Selection + Objective */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 space-y-4">
        {/* Team dropdown */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">
            Time
          </label>
          <div className="relative">
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              disabled={isRunning}
              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
            >
              <option value="">Selecione um time...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.description}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Pipeline composition */}
        {teamAgents.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Users size={14} className="text-gray-400" />
            {teamAgents.map((ta, i) => (
              <React.Fragment key={ta.id}>
                {i > 0 && <span className="text-gray-300 text-xs">&rarr;</span>}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{ backgroundColor: ta.agent.avatar_color + '20', color: ta.agent.avatar_color }}
                >
                  {ta.agent.name} / {ta.step_type}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Filtros DRE */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            Filtros de dados
          </label>
          <div className="flex items-start gap-2 flex-wrap">
            <MultiSelectFilter
              label="Marca"
              icon={<Flag size={12} />}
              options={filterOptions.marcas}
              selected={selectedMarcas}
              onChange={setSelectedMarcas}
              colorScheme="orange"
              compact
            />
            <MultiSelectFilter
              label="Filial"
              icon={<Building2 size={12} />}
              options={filiaisFiltradas}
              selected={selectedFiliais}
              onChange={setSelectedFiliais}
              colorScheme="blue"
              compact
            />
            <MultiSelectFilter
              label="Tag01"
              icon={<Layers size={12} />}
              options={filterOptions.tags01}
              selected={selectedTags01}
              onChange={setSelectedTags01}
              colorScheme="purple"
              compact
            />
            <MultiSelectFilter
              label="Mês"
              icon={<CalendarDays size={12} />}
              options={MONTH_OPTIONS}
              selected={selectedMonths}
              onChange={setSelectedMonths}
              colorScheme="blue"
              compact
            />
          </div>
        </div>

        {/* Objective */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">
            Objetivo da análise
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            disabled={isRunning}
            placeholder="Ex: Analisar performance do DRE 2026 com foco em desvios de custos variáveis..."
            rows={2}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
          />
        </div>

        {/* Start button + Test Pipeline + snapshot badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleStart}
            disabled={!selectedTeamId || !objective.trim() || isStarting || isRunning || isTesting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primary-500)' }}
          >
            {isStarting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Iniciar Análise
          </button>
          <button
            onClick={() => handleTestPipeline('carlos')}
            disabled={!objective.trim() || isStarting || isRunning || isTesting}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
            {isTesting && testingStep ? testingStep : 'Testar até Carlos'}
          </button>
          {snapshotAt && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <CalendarDays size={10} />
              Foto {new Date(snapshotAt).toLocaleDateString('pt-BR')} {new Date(snapshotAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
        )}

        {/* Pipeline Test Results */}
        {pipelineResults.length > 0 && (() => {
          const STEP_STYLES: Record<string, { bg: string; border: string; headerBg: string; headerText: string; label: string }> = {
            'alex/plan': { bg: 'border-amber-200', border: 'border-amber-200', headerBg: 'bg-amber-50', headerText: 'text-amber-800', label: 'Alex — Plano Estratégico' },
            'bruna/execute': { bg: 'border-purple-200', border: 'border-purple-200', headerBg: 'bg-purple-50', headerText: 'text-purple-800', label: 'Bruna — Qualidade de Dados' },
            'carlos/execute': { bg: 'border-blue-200', border: 'border-blue-200', headerBg: 'bg-blue-50', headerText: 'text-blue-800', label: 'Carlos — Performance' },
            'denilson/execute': { bg: 'border-green-200', border: 'border-green-200', headerBg: 'bg-green-50', headerText: 'text-green-800', label: 'Denilson — Otimização' },
            'edmundo/execute': { bg: 'border-cyan-200', border: 'border-cyan-200', headerBg: 'bg-cyan-50', headerText: 'text-cyan-800', label: 'Edmundo — Forecast' },
            'falcao/execute': { bg: 'border-red-200', border: 'border-red-200', headerBg: 'bg-red-50', headerText: 'text-red-800', label: 'Falcão — Risco' },
          };

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pipeline de Teste ({pipelineResults.length} steps)</span>
                <button onClick={() => { setPipelineResults([]); setTestResult(null); }} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              {pipelineResults.map((r, idx) => {
                const key = `${r.agentCode}/${r.stepType}`;
                const style = STEP_STYLES[key] || { bg: 'border-gray-200', border: 'border-gray-200', headerBg: 'bg-gray-50', headerText: 'text-gray-800', label: `${r.agentCode} — ${r.stepType}` };
                const out = r.output as any;
                return (
                  <details key={idx} open={idx === pipelineResults.length - 1}>
                    <summary className={`cursor-pointer ${style.headerBg} border ${style.border} rounded-lg px-4 py-2.5 flex items-center justify-between`}>
                      <span className={`text-sm font-bold ${style.headerText} flex items-center gap-2`}>
                        <Brain size={14} />
                        {style.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.zodValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.zodValid ? 'Válido' : 'Zod Falhou'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                          {r.model} · {Math.round(r.durationMs / 1000)}s · {r.tokensInput}→{r.tokensOutput} tok
                        </span>
                      </div>
                    </summary>
                    <div className={`border ${style.border} border-t-0 rounded-b-lg p-4 bg-white`}>
                      {r.zodErrors && (
                        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded mb-3">
                          {r.zodErrors.map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                      )}
                      {/* Render genérico dos campos do output */}
                      <div className="space-y-3">
                        {out.executive_summary && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1.5">Resumo Executivo</h4>
                            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-line">{out.executive_summary}</p>
                          </div>
                        )}
                        {out.executive_data_quality_summary && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">Resumo Qualidade de Dados</h4>
                            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-line">{out.executive_data_quality_summary}</p>
                          </div>
                        )}
                        {out.dre_highlights && (
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Destaques DRE</h4>
                            {Object.entries(out.dre_highlights).map(([k, v]) => (
                              <div key={k} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{k.replace(/_/g, ' ')}</span>
                                <p className="text-[11px] text-gray-700 mt-0.5">{String(v)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {out.quality_score !== undefined && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-600">Score:</span>
                            <span className={`text-lg font-bold ${out.quality_score >= 80 ? 'text-green-600' : out.quality_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {Math.round(out.quality_score)}/100
                            </span>
                          </div>
                        )}
                        {out.fragility_points?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Fragilidades ({out.fragility_points.length})</h4>
                            {out.fragility_points.map((fp: any, i: number) => (
                              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-1.5">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${fp.severity === 'critical' ? 'bg-red-100 text-red-700' : fp.severity === 'high' ? 'bg-orange-100 text-orange-700' : fp.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {fp.severity}
                                  </span>
                                  <span className="text-[10px] font-medium text-gray-500">{fp.affected_area}</span>
                                  <span className="text-[9px] text-gray-400 font-mono">{fp.type}</span>
                                </div>
                                <p className="text-[11px] text-gray-700">{fp.description}</p>
                                {fp.probable_cause && <p className="text-[10px] text-gray-400 mt-0.5">Causa: {fp.probable_cause}</p>}
                                {fp.suggested_fix && <p className="text-[10px] text-green-600 mt-0.5">Correção: {fp.suggested_fix}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                        {out.data_integrity_risk_summary && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1.5">Risco Informacional</h4>
                            <p className="text-[10px] text-gray-700"><strong>Performance:</strong> {out.data_integrity_risk_summary.impact_on_performance}</p>
                            <p className="text-[10px] text-gray-700"><strong>Otimização:</strong> {out.data_integrity_risk_summary.impact_on_optimization}</p>
                            <p className="text-[10px] text-gray-700"><strong>Forecast:</strong> {out.data_integrity_risk_summary.impact_on_forecast}</p>
                            {out.data_integrity_risk_summary.interpretive_caution && (
                              <p className="text-[10px] text-amber-700 font-medium mt-1">{out.data_integrity_risk_summary.interpretive_caution}</p>
                            )}
                          </div>
                        )}
                        {out.recommended_caution_level && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600">Cautela:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${out.recommended_caution_level === 'high_confidence' ? 'bg-green-100 text-green-700' : out.recommended_caution_level.includes('critical') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {out.recommended_caution_level.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        {/* Carlos — Resposta ao Objetivo do Usuário */}
                        {out.user_objective_response && (
                          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                              <Target size={12} />
                              Resposta ao seu Objetivo
                            </h4>
                            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-line">{out.user_objective_response}</p>
                          </div>
                        )}
                        {/* Carlos — Performance Summary */}
                        {out.executive_performance_summary && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">Resumo de Performance</h4>
                            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-line">{out.executive_performance_summary}</p>
                          </div>
                        )}
                        {/* Carlos — Ranked Variations */}
                        {out.ranked_variations?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Variações Ranqueadas ({out.ranked_variations.length})</h4>
                            {out.ranked_variations.map((v: any, i: number) => (
                              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-1.5">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                                  <span className="text-[10px] font-bold text-gray-700">{v.tag01}</span>
                                  <span className="text-[9px] text-gray-400">{v.dre_line}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${v.gap_vs_budget_pct > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {v.gap_vs_budget_pct > 0 ? '+' : ''}{typeof v.gap_vs_budget_pct === 'number' ? v.gap_vs_budget_pct.toFixed(1) : v.gap_vs_budget_pct}%
                                  </span>
                                  <span className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 text-[8px] font-mono">{v.variation_nature}</span>
                                </div>
                                <p className="text-[11px] text-gray-700">{v.cause_explanation}</p>
                                {v.ebitda_impact && <p className="text-[10px] text-blue-600 mt-0.5">EBITDA: {v.ebitda_impact}</p>}
                                {v.recurrence_expectation && <p className="text-[10px] text-gray-400 mt-0.5">Recorrência: {v.recurrence_expectation}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Carlos — Margin/EBITDA Impact */}
                        {out.margin_ebitda_impact && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                            <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Impacto Margem & EBITDA</h4>
                            {out.margin_ebitda_impact.ebitda_pressures?.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-red-600">Pressões:</span>
                                {out.margin_ebitda_impact.ebitda_pressures.map((p: string, i: number) => (
                                  <p key={i} className="text-[10px] text-gray-700 ml-2">• {p}</p>
                                ))}
                              </div>
                            )}
                            {out.margin_ebitda_impact.ebitda_reliefs?.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-green-600">Alívios:</span>
                                {out.margin_ebitda_impact.ebitda_reliefs.map((r: string, i: number) => (
                                  <p key={i} className="text-[10px] text-gray-700 ml-2">• {r}</p>
                                ))}
                              </div>
                            )}
                            {out.margin_ebitda_impact.consolidated_impact_reading && (
                              <p className="text-[10px] text-indigo-700 font-medium mt-1">{out.margin_ebitda_impact.consolidated_impact_reading}</p>
                            )}
                          </div>
                        )}
                        {/* Carlos — Recommended Actions */}
                        {out.recommended_actions && (
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Ações Recomendadas</h4>
                            {out.recommended_actions.items_to_deepen?.length > 0 && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <span className="text-[10px] font-bold text-gray-500">Aprofundar:</span>
                                {out.recommended_actions.items_to_deepen.map((item: string, i: number) => (
                                  <p key={i} className="text-[10px] text-gray-700 ml-2">• {item}</p>
                                ))}
                              </div>
                            )}
                            {out.recommended_actions.lines_to_monitor?.length > 0 && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <span className="text-[10px] font-bold text-gray-500">Monitorar:</span>
                                {out.recommended_actions.lines_to_monitor.map((item: string, i: number) => (
                                  <p key={i} className="text-[10px] text-gray-700 ml-2">• {item}</p>
                                ))}
                              </div>
                            )}
                            {out.recommended_actions.budget_assumptions_to_review?.length > 0 && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <span className="text-[10px] font-bold text-gray-500">Revisar premissas:</span>
                                {out.recommended_actions.budget_assumptions_to_review.map((item: string, i: number) => (
                                  <p key={i} className="text-[10px] text-gray-700 ml-2">• {item}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {out.priority_areas?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Áreas Prioritárias</h4>
                            {out.priority_areas.map((area: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 mb-1">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                <p className="text-[11px] text-gray-800">{area}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {out.assignments?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Direcionamento</h4>
                            {out.assignments.map((a: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">{a.agent_code}</span>
                                <p className="text-[11px] text-gray-700">{a.focus}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Run Header */}
      {activeRun && (
        <RunHeader
          run={activeRun}
          steps={activeSteps}
          teamName={selectedTeam?.name ?? ''}
          isAdmin={isAdmin}
          onContinue={handleContinue}
          onRerun={handleFullRerun}
          onCancel={handleCancel}
          onDelete={() => handleDeleteRun(activeRun.id)}
        />
      )}

      {/* Agent Workstations — Cards or Tabs */}
      {activeSteps.length > 0 && (
        <div className="space-y-2">
          {/* View mode toggle */}
          <div className="flex justify-end">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  viewMode === 'cards' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={13} />
                Cards
              </button>
              <button
                onClick={() => setViewMode('tabs')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  viewMode === 'tabs' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Columns size={13} />
                Guias
              </button>
            </div>
          </div>

          {/* Cards view */}
          {viewMode === 'cards' && (
            <div className="grid md:grid-cols-2 gap-4">
              {activeSteps.map((step) => (
                <AgentWorkstation
                  key={step.id}
                  step={step}
                  totalSteps={activeSteps.length}
                  isAdmin={isAdmin}
                  onReview={handleReview}
                  onRerun={handleRerun}
                />
              ))}
            </div>
          )}

          {/* Tabs view */}
          {viewMode === 'tabs' && (() => {
            const TAB_META: Record<string, { name: string; color: string }> = {
              alex: { name: 'Alex', color: '#8b5cf6' },
              bruna: { name: 'Bruna', color: '#f59e0b' },
              carlos: { name: 'Carlos', color: '#3b82f6' },
              denilson: { name: 'Denilson', color: '#10b981' },
              edmundo: { name: 'Edmundo', color: '#6366f1' },
              falcao: { name: 'Falcão', color: '#ef4444' },
              diretor: { name: 'Diretor', color: '#475569' },
              ceo: { name: 'CEO', color: '#1e293b' },
            };
            const TAB_STEP: Record<string, string> = {
              plan: 'Plan', execute: 'Exec', consolidate: 'Consol', review: 'Review',
            };
            const selectedStep = activeSteps.find(s => s.id === activeTabStepId) ?? null;
            return (
              <div>
                {/* Tab bar */}
                <div className="flex gap-0.5 overflow-x-auto bg-gray-100 rounded-t-lg p-1">
                  {activeSteps.map((step) => {
                    const meta = TAB_META[step.agent_code] || { name: step.agent_code, color: '#6b7280' };
                    const isActive = step.id === activeTabStepId;
                    const isStepRunning = step.status === 'running';
                    const isStepCompleted = step.status === 'completed';
                    const isStepFailed = step.status === 'failed';
                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveTabStepId(step.id)}
                        className={`relative flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all ${
                          isActive ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${isStepRunning ? 'animate-pulse' : ''}`}
                          style={{
                            backgroundColor: isStepCompleted ? meta.color : isStepFailed ? '#ef4444' : isStepRunning ? meta.color : '#d1d5db',
                          }}
                        />
                        {meta.name}
                        <span className="text-[9px] text-gray-400 font-normal">{TAB_STEP[step.step_type] || step.step_type}</span>
                        {isActive && (
                          <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Tab content */}
                {selectedStep && (
                  <AgentWorkstation
                    key={selectedStep.id}
                    step={selectedStep}
                    totalSteps={activeSteps.length}
                    isAdmin={isAdmin}
                    onReview={handleReview}
                    onRerun={handleRerun}
                    defaultExpanded
                  />
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Consolidation Panel */}
      {activeRun && (
        <ConsolidationPanel
          run={activeRun}
          consolidationStep={consolidationStep}
        />
      )}

      {/* Schedule Manager */}
      <ScheduleManager teams={teams} selectedTeamId={selectedTeamId} />

      {/* History */}
      {runs.length > 0 && (
        <div className="bg-white p-5 rounded-lg border border-gray-200 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            Histórico
          </h2>
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-gray-50 transition-all"
              >
                <button
                  onClick={() => setActiveRunId(run.id)}
                  className="flex-1 flex items-center justify-between text-left min-w-0"
                >
                  <div className="min-w-0 space-y-1">
                    <div>
                      <span className="font-medium text-gray-900">{run.objective.slice(0, 80)}</span>
                      <span className="text-gray-400 ml-2">
                        {new Date(run.started_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <FilterBadges filterContext={run.filter_context} size="compact" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] shrink-0 ${
                    run.status === 'completed' ? 'bg-green-100 text-green-700' :
                    run.status === 'failed' ? 'bg-red-100 text-red-700' :
                    run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {run.status}
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteRun(run.id); }}
                  disabled={run.status === 'running' || deletingId === run.id}
                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title="Excluir análise"
                >
                  {deletingId === run.id ? (
                    <Loader2 size={14} className="animate-spin text-red-400" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentTeamView;
