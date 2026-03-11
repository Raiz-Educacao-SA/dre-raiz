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

    // Buscar snapshot da foto (variance_justifications) — SEMPRE a versão mais recente
    const allVarItems: VarianceJustification[] = [];
    const versionsByMonth: Record<string, number> = {};
    const marcasFilter = selectedMarcas.length > 0 ? selectedMarcas : undefined;

    for (const ym of yearMonths) {
      const latestVersion = await getLatestVarianceVersion(ym, marcasFilter);
      if (latestVersion === 0) continue; // sem foto para este mês
      versionsByMonth[ym] = latestVersion;
      const items = await getVarianceJustifications({
        year_month: ym,
        marcas: marcasFilter,
        version: latestVersion,
      });
      allVarItems.push(...items);
    }

    if (allVarItems.length > 0) {
      // Agregar valores por (tag0, tag01, scenario, month) — pré-agregar para evitar duplicatas
      const aggMap = new Map<string, number>();
      for (const item of allVarItems) {
        if (item.tag02) continue; // só depth 0-1 (tag0+tag01)

        // Real
        const keyReal = `${item.tag0}|${item.tag01 || ''}|Real|${item.year_month}`;
        aggMap.set(keyReal, (aggMap.get(keyReal) || 0) + Number(item.real_value || 0));

        // Orçado ou A-1
        const scenarioLabel = item.comparison_type === 'orcado' ? 'Orçado' : 'Ano Anterior';
        const keyComp = `${item.tag0}|${item.tag01 || ''}|${scenarioLabel}|${item.year_month}`;
        aggMap.set(keyComp, (aggMap.get(keyComp) || 0) + Number(item.compare_value || 0));
      }

      const somaTagsRows: Record<string, unknown>[] = [];
      for (const [key, total] of aggMap) {
        const [tag0, tag01, scenario, month] = key.split('|');
        somaTagsRows.push({ tag0, tag01, scenario, month, total });
      }

      if (somaTagsRows.length > 0) {
        dreSnapshot = somaTagsRows;
        usedSnapshot = true;
        const snapDates = allVarItems.map(i => i.snapshot_at).filter(Boolean).sort().reverse();
        snapDate = snapDates[0] || null;
        console.log(`📸 Usando foto v${JSON.stringify(versionsByMonth)}: ${somaTagsRows.length} rows, snapshot_at=${snapDate}`);
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

  // 4c. Testar agente isolado (Alex plan)
  const handleTestAlex = useCallback(async () => {
    if (!objective.trim()) return;
    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const { dreSnapshot, filterContext } = await fetchDreData();
      const result = await agentTeamService.testSingleAgent(
        'alex',
        'plan',
        objective.trim(),
        dreSnapshot,
        filterContext,
      );
      setTestResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao testar Alex';
      setError(msg);
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

        {/* Start button + Test Alex + snapshot badge */}
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
            onClick={handleTestAlex}
            disabled={!objective.trim() || isStarting || isRunning || isTesting}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
          >
            {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
            Testar Alex
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

        {/* Test Result Panel — Friendly View */}
        {testResult && (() => {
          const out = testResult.output as any;
          const AGENT_NAMES: Record<string, string> = {
            bruna: 'Bruna', carlos: 'Carlos', denilson: 'Denilson',
            edmundo: 'Edmundo', falcao: 'Falcão',
          };
          const AGENT_COLORS: Record<string, string> = {
            bruna: 'bg-purple-100 text-purple-700 border-purple-200',
            carlos: 'bg-blue-100 text-blue-700 border-blue-200',
            denilson: 'bg-green-100 text-green-700 border-green-200',
            edmundo: 'bg-cyan-100 text-cyan-700 border-cyan-200',
            falcao: 'bg-red-100 text-red-700 border-red-200',
          };
          return (
            <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <Brain size={16} />
                  Alex — Plano Estratégico
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${testResult.zodValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {testResult.zodValid ? 'Válido' : 'Zod Falhou'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                    {testResult.model} · {Math.round(testResult.durationMs / 1000)}s · {testResult.tokensInput}→{testResult.tokensOutput} tok
                  </span>
                  <button onClick={() => setTestResult(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {testResult.zodErrors && (
                <div className="text-xs text-red-600 bg-red-50 px-4 py-2 border-b border-red-200">
                  {testResult.zodErrors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}

              <div className="p-4 space-y-4">
                {/* Executive Summary */}
                {out.executive_summary && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <Target size={12} />
                      Resumo Executivo
                    </h4>
                    <p className="text-sm text-gray-800 leading-relaxed">{out.executive_summary}</p>
                  </div>
                )}

                {/* Priority Areas */}
                {out.priority_areas?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} />
                      Áreas Prioritárias ({out.priority_areas.length})
                    </h4>
                    <div className="space-y-1.5">
                      {out.priority_areas.map((area: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-xs text-gray-800 leading-relaxed">{area}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignments */}
                {out.assignments?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <UserCheck size={12} />
                      Direcionamento dos Agentes ({out.assignments.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {out.assignments.map((a: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 hover:shadow-sm transition-shadow">
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${AGENT_COLORS[a.agent_code] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {AGENT_NAMES[a.agent_code] || a.agent_code}
                          </span>
                          <p className="text-xs text-gray-700 leading-relaxed">{a.focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
