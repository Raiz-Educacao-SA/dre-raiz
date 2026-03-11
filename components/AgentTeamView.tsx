import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Brain, Play, Loader2, ChevronDown, Users, Clock, Flag, Building2, Layers, CalendarDays, LayoutGrid, Columns, Trash2, X, AlertTriangle, Target, UserCheck, Filter, GitCompare, Download, FileText, Timer, TrendingUp, TrendingDown, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { getSomaTags, getDREFilterOptions, getVarianceJustifications, getLatestVarianceVersion } from '../services/supabaseService';
import type { DREFilterOptions, VarianceJustification } from '../services/supabaseService';
import type { Team, Agent, TeamAgent, AgentRun, AgentStep, FinancialSummary } from '../types/agentTeam';
import * as agentTeamService from '../services/agentTeamService';
import { exportComparePPT } from '../services/compareExportPptService';
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
  const { allowedMarcas, allowedFiliais, allowedTag01, hasPermissions } = usePermissions();

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
  const [historyLimit, setHistoryLimit] = useState(5);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareSteps, setCompareSteps] = useState<Record<string, AgentStep[]>>({});
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareTab, setCompareTab] = useState<'overview' | 'kpis' | 'agents' | 'summary'>('overview');
  const [exportingCompare, setExportingCompare] = useState(false);

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

  // Duration helper
  const formatDuration = useCallback((startedAt: string, completedAt: string | null): string => {
    if (!completedAt) return '—';
    const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${sec}s`;
  }, []);

  // Load steps when compare modal opens
  useEffect(() => {
    if (!showCompareModal || compareLoading) return;
    const ids = Array.from(compareIds);
    if (ids.length !== 2) return;
    const missing = ids.filter(id => !(id in compareSteps));
    if (missing.length === 0) return;
    setCompareLoading(true);
    Promise.all(missing.map(id => agentTeamService.getRun(id)))
      .then(results => {
        setCompareSteps(prev => {
          const next = { ...prev };
          results.forEach((res, i) => { next[missing[i]] = res.steps; });
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setCompareLoading(false));
  }, [showCompareModal, compareIds]);

  // Filtered runs for history
  const filteredRuns = useMemo(() => {
    if (historyStatusFilter === 'all') return runs;
    return runs.filter(r => r.status === historyStatusFilter);
  }, [runs, historyStatusFilter]);

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
    agentTeamService.listRuns(50).then((data) => setRuns(data.runs));
    getDREFilterOptions({ monthFrom: '2026-01', monthTo: '2026-12' }).then(opts => {
      // Filtrar opções por permissões do usuário
      if (hasPermissions) {
        if (allowedMarcas.length > 0) opts.marcas = opts.marcas.filter(m => allowedMarcas.includes(m));
        if (allowedFiliais.length > 0) opts.nome_filiais = opts.nome_filiais.filter(f => allowedFiliais.includes(f));
        if (allowedTag01.length > 0) opts.tags01 = opts.tags01.filter(t => allowedTag01.includes(t));
      }
      setFilterOptions(opts);
    });
  }, [hasPermissions, allowedMarcas, allowedFiliais, allowedTag01]);

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
          agentTeamService.listRuns(50).then((data) => setRuns(data.runs));
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
    // Marcas efetivas: seleção do usuário ou permissões
    const effMarcas = selectedMarcas.length > 0 ? selectedMarcas : (hasPermissions && allowedMarcas.length > 0 ? allowedMarcas : []);
    const effFiliais = selectedFiliais.length > 0 ? selectedFiliais : (hasPermissions && allowedFiliais.length > 0 ? allowedFiliais : []);
    const effTags01 = selectedTags01.length > 0 ? selectedTags01 : (hasPermissions && allowedTag01.length > 0 ? allowedTag01 : []);
    const hasMarcaFilter = effMarcas.length > 0;

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
          if (item.tag02 && item.marca && effMarcas.includes(item.marca)) {
            tag0sComTag02.add(item.tag0);
          }
        }

        for (const item of allVarItems) {
          const itemTag0 = item.tag0;
          const temDetalhe = tag0sComTag02.has(itemTag0);

          if (temDetalhe) {
            // Tag0 COM tag02+marca: agregar a partir dos items tag02
            if (!item.tag02) continue; // pular consolidados
            if (!item.marca || !effMarcas.includes(item.marca)) continue;
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
      dreSnapshot = await getSomaTags(mFrom, mTo, effMarcas.length > 0 ? effMarcas : undefined, effFiliais.length > 0 ? effFiliais : undefined, undefined, effTags01.length > 0 ? effTags01 : undefined) as Record<string, unknown>[];
      console.log(`⚡ Sem foto disponível, usando dados ao vivo: ${dreSnapshot.length} rows`);
    }

    setSnapshotAt(snapDate);

    const monthsLabel = selectedMonths.length > 0 ? selectedMonths.join(', ') : 'Jan-Dez';
    const filterContext: Record<string, unknown> = {
      year: '2026',
      months_range: monthsLabel,
      data_source: usedSnapshot ? 'snapshot' : 'live',
    };
    if (effMarcas.length > 0) filterContext.marcas = effMarcas;
    if (effFiliais.length > 0) filterContext.filiais = effFiliais;
    if (effTags01.length > 0) filterContext.tags01 = effTags01;
    if (snapDate) filterContext.snapshot_at = snapDate;
    if (Object.keys(versionsByMonth).length > 0) filterContext.snapshot_versions = versionsByMonth;

    // Coletar dados per-marca para Denilson (quando nenhuma marca selecionada)
    if (selectedMarcas.length === 0 && allVarItems.length > 0) {
      const perMarcaAgg = new Map<string, { real: number; orcado: number }>();
      for (const item of allVarItems) {
        if (!item.tag02 || !item.marca) continue; // só items com marca
        if (item.comparison_type !== 'orcado') continue; // evitar double-count
        const key = `${item.marca}|${item.tag0}`;
        const existing = perMarcaAgg.get(key) || { real: 0, orcado: 0 };
        existing.real += Number(item.real_value || 0);
        existing.orcado += Number(item.compare_value || 0);
        perMarcaAgg.set(key, existing);
      }
      const perMarcaSummary: { marca: string; tag0: string; real: number; orcado: number; delta_pct: number }[] = [];
      for (const [key, vals] of perMarcaAgg) {
        const [marca, tag0] = key.split('|');
        const denominator = Math.abs(vals.orcado);
        const delta_pct = denominator > 0 ? Math.round(((vals.real - vals.orcado) / denominator) * 10000) / 100 : 0;
        perMarcaSummary.push({ marca, tag0, real: Math.round(vals.real * 100) / 100, orcado: Math.round(vals.orcado * 100) / 100, delta_pct });
      }
      if (perMarcaSummary.length > 0) {
        filterContext.per_marca_summary = perMarcaSummary;
        console.log(`📊 Per-marca summary: ${perMarcaSummary.length} items para ${new Set(perMarcaSummary.map(p => p.marca)).size} marcas`);
      }
    }

    return { dreSnapshot, filterContext };
  }, [selectedMonths, selectedMarcas, selectedFiliais, selectedTags01, hasPermissions, allowedMarcas, allowedFiliais, allowedTag01]);

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
      agentTeamService.listRuns(50).then((data) => setRuns(data.runs));
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
      const { runs: updated } = await agentTeamService.listRuns(50);
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
            Análise Financeira 2.0
          </h1>
          <p className="text-xs text-gray-500">Análise automatizada por agentes IA | Equipe Alpha</p>
        </div>
      </div>

      {/* Team Selection + Objective */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 space-y-4">
        {/* Pipeline — 5 agentes fixos */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Users size={13} className="text-gray-400" />
          {['Alex (Plan)', 'Carlos', 'Denilson', 'Edmundo', 'Alex (Final)'].map((name, i) => (
            <React.Fragment key={name}>
              {i > 0 && <span className="text-gray-300 text-[10px]">&rarr;</span>}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                {name}
              </span>
            </React.Fragment>
          ))}
        </div>

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
                        {/* Quality Score (Alex plan absorveu Bruna) */}
                        {out.quality_score !== undefined && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-600">Confiabilidade dos Dados:</span>
                            <span className={`text-lg font-bold ${out.quality_score >= 80 ? 'text-green-600' : out.quality_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {Math.round(out.quality_score)}/100
                            </span>
                          </div>
                        )}
                        {/* Alertas de Qualidade */}
                        {out.alertas_qualidade?.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Alertas de Qualidade</h4>
                            {out.alertas_qualidade.map((alerta: string, i: number) => (
                              <p key={i} className="text-[10px] text-gray-700 ml-2">• {alerta}</p>
                            ))}
                          </div>
                        )}
                        {/* Backward compat: Bruna old fields */}
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
                                </div>
                                <p className="text-[11px] text-gray-700">{fp.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {out.recommended_caution_level && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600">Nível de Confiança:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${out.recommended_caution_level === 'alta_confianca' || out.recommended_caution_level === 'high_confidence' ? 'bg-green-100 text-green-700' : out.recommended_caution_level.includes('critica') || out.recommended_caution_level.includes('critical') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {out.recommended_caution_level === 'alta_confianca' ? 'Alta Confiança' : out.recommended_caution_level === 'cautela_moderada' ? 'Cautela Moderada' : out.recommended_caution_level === 'cautela_critica' ? 'Cautela Crítica' : out.recommended_caution_level.replace(/_/g, ' ')}
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
                        {/* Denilson — Resumo Executivo (Real vs Orçado) */}
                        {out.resumo_executivo && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">Resumo Real vs Orçado</h4>
                            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-line">{out.resumo_executivo}</p>
                          </div>
                        )}
                        {/* Denilson — Análise por Linha (modo marca selecionada) */}
                        {out.analise_por_linha?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Análise por Linha DRE ({out.analise_por_linha.length})</h4>
                            {out.analise_por_linha.map((linha: any, i: number) => (
                              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-1.5">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-[11px] font-bold text-gray-700">{linha.tag0}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${linha.classificacao === 'favoravel' ? 'bg-green-100 text-green-700' : linha.classificacao === 'desfavoravel' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {linha.classificacao === 'favoravel' ? 'Favorável' : linha.classificacao === 'desfavoravel' ? 'Desfavorável' : 'Neutro'}
                                  </span>
                                  <span className="text-[9px] text-gray-400">Δ {linha.delta_pct > 0 ? '+' : ''}{linha.delta_pct}%</span>
                                </div>
                                <div className="flex gap-4 text-[10px] text-gray-500 mb-1">
                                  <span>Real: <b className="text-gray-700">R$ {Number(linha.real_brl).toLocaleString('pt-BR')}</b></span>
                                  <span>Orçado: <b className="text-gray-700">R$ {Number(linha.orcado_brl).toLocaleString('pt-BR')}</b></span>
                                </div>
                                {linha.destaques_tag01?.length > 0 && (
                                  <div className="ml-3 mt-1 space-y-0.5">
                                    {linha.destaques_tag01.map((d: any, j: number) => (
                                      <div key={j} className="text-[10px] text-gray-600">
                                        <span className="font-medium">{d.tag01}</span>: R$ {Number(d.real_brl).toLocaleString('pt-BR')} vs R$ {Number(d.orcado_brl).toLocaleString('pt-BR')} ({d.delta_pct > 0 ? '+' : ''}{d.delta_pct}%) — {d.comentario}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <p className="text-[10px] text-blue-700 mt-1 font-medium">{linha.recado}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Denilson — Análise por Marca (modo sem marca selecionada) */}
                        {out.analise_por_marca?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Análise por Marca ({out.analise_por_marca.length})</h4>
                            {out.analise_por_marca.map((m: any, i: number) => (
                              <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">{m.marca?.slice(0, 2)}</span>
                                  <span className="text-[12px] font-bold text-gray-800">{m.marca}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${m.situacao_geral === 'acima_do_orcado' ? 'bg-green-100 text-green-700' : m.situacao_geral === 'abaixo_do_orcado' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {m.situacao_geral === 'acima_do_orcado' ? 'Acima do Orçado' : m.situacao_geral === 'abaixo_do_orcado' ? 'Abaixo do Orçado' : 'No Orçado'}
                                  </span>
                                  {m.ebitda_estimado !== undefined && m.ebitda_estimado !== 0 && (
                                    <span className="text-[9px] text-gray-400">EBITDA: R$ {Number(m.ebitda_estimado).toLocaleString('pt-BR')}</span>
                                  )}
                                </div>
                                <div className="space-y-0.5 ml-1">
                                  {m.linhas?.map((l: any, j: number) => (
                                    <div key={j} className="flex items-start gap-1.5 text-[10px]">
                                      <span className={`flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${l.classificacao === 'favoravel' ? 'bg-green-500' : l.classificacao === 'desfavoravel' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                                      <span className="text-gray-500 w-32 flex-shrink-0">{l.tag0}</span>
                                      <span className="text-gray-700">R$ {Number(l.real_brl).toLocaleString('pt-BR')}</span>
                                      <span className="text-gray-400">vs</span>
                                      <span className="text-gray-700">R$ {Number(l.orcado_brl).toLocaleString('pt-BR')}</span>
                                      <span className={`font-medium ${l.delta_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>({l.delta_pct > 0 ? '+' : ''}{l.delta_pct}%)</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[10px] text-blue-700 mt-1.5 leading-relaxed">{m.recado_marca}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Denilson — Recado Final */}
                        {out.recado_final && (
                          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                              <Target size={12} />
                              Recado Final
                            </h4>
                            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-line">{out.recado_final}</p>
                          </div>
                        )}
                        {/* Edmundo — Resumo Projeção */}
                        {out.resumo_projecao && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">Projeção & Cenários</h4>
                            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-line">{out.resumo_projecao}</p>
                          </div>
                        )}
                        {/* Edmundo — Projeções por Marca */}
                        {out.projecoes_por_marca?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Projeções por Marca ({out.projecoes_por_marca.length})</h4>
                            {out.projecoes_por_marca.map((p: any, i: number) => (
                              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-1.5">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-bold text-gray-800">{p.marca}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.confianca === 'alta' ? 'bg-green-100 text-green-700' : p.confianca === 'baixa' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {p.confianca}
                                  </span>
                                </div>
                                <div className="flex gap-3 text-[10px] text-gray-500">
                                  <span>Base: <b className="text-gray-700">R$ {Number(p.ebitda_base).toLocaleString('pt-BR')}</b></span>
                                  <span>Target: <b className="text-blue-700">R$ {Number(p.ebitda_target).toLocaleString('pt-BR')}</b></span>
                                  <span>Stress: <b className="text-red-600">R$ {Number(p.ebitda_stress).toLocaleString('pt-BR')}</b></span>
                                </div>
                                <p className="text-[10px] text-gray-600 mt-0.5">{p.comentario}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Edmundo — Riscos */}
                        {out.riscos?.length > 0 && out.riscos[0]?.titulo && (
                          <div>
                            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1.5">Riscos Identificados ({out.riscos.length})</h4>
                            {out.riscos.map((r: any, i: number) => (
                              <div key={i} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1.5">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-bold text-gray-800">{r.titulo}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.probabilidade === 'alta' ? 'bg-red-100 text-red-700' : r.probabilidade === 'baixa' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {r.probabilidade}
                                  </span>
                                  {r.marca_afetada && <span className="text-[9px] text-gray-400">{r.marca_afetada}</span>}
                                  {r.impacto_estimado_brl ? <span className="text-[9px] text-red-500 font-medium">R$ {Number(r.impacto_estimado_brl).toLocaleString('pt-BR')}</span> : null}
                                </div>
                                <p className="text-[10px] text-gray-700">{r.descricao}</p>
                                <p className="text-[10px] text-green-600 mt-0.5">Mitigação: {r.mitigacao}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Edmundo — Recado Estratégico */}
                        {out.recado_estrategico && (
                          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                              <Target size={12} />
                              Recado Estratégico
                            </h4>
                            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-line">{out.recado_estrategico}</p>
                          </div>
                        )}
                        {/* Alex Consolidation — Perguntas da Diretoria */}
                        {out.perguntas_diretoria?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Perguntas da Diretoria ({out.perguntas_diretoria.length})</h4>
                            {out.perguntas_diretoria.map((q: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 mb-1">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">?</span>
                                <p className="text-[11px] text-gray-800">{q}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Alex Consolidation — Nível de Prontidão */}
                        {out.nivel_prontidao && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600">Prontidão:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${out.nivel_prontidao === 'pronto' ? 'bg-green-100 text-green-700' : out.nivel_prontidao === 'nao_pronto' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {out.nivel_prontidao === 'pronto' ? 'Pronto' : out.nivel_prontidao === 'precisa_ajustes' ? 'Precisa Ajustes' : out.nivel_prontidao === 'nao_pronto' ? 'Não Pronto' : out.nivel_prontidao}
                            </span>
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
              carlos: { name: 'Carlos', color: '#3b82f6' },
              denilson: { name: 'Denilson', color: '#10b981' },
              edmundo: { name: 'Edmundo', color: '#6366f1' },
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
      {runs.length > 0 && (() => {
        const visibleRuns = filteredRuns.slice(0, historyLimit);
        const hasMore = filteredRuns.length > historyLimit;
        const completedCount = runs.filter(r => r.status === 'completed').length;
        const failedCount = runs.filter(r => r.status === 'failed').length;
        const compareArray = Array.from(compareIds);
        const compareRunA = compareArray[0] ? runs.find(r => r.id === compareArray[0]) : null;
        const compareRunB = compareArray[1] ? runs.find(r => r.id === compareArray[1]) : null;
        return (
          <div className="bg-white p-5 rounded-lg border border-gray-200 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                Histórico
                <span className="text-[10px] font-normal text-gray-400">({filteredRuns.length}{historyStatusFilter !== 'all' ? ` de ${runs.length}` : ''})</span>
              </h2>
              <div className="flex items-center gap-2">
                {/* Compare toggle */}
                <button
                  onClick={() => { setCompareMode(m => !m); setCompareIds(new Set()); }}
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                    compareMode ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-indigo-600'
                  }`}
                  title="Comparar análises"
                >
                  <GitCompare size={12} />
                  Comparar
                </button>
                {runs.length > 1 && (
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Excluir TODAS as ${runs.length} análises? Esta ação não pode ser desfeita.`)) return;
                      for (const r of runs) {
                        try { await agentTeamService.deleteRun(r.id); } catch {}
                      }
                      if (pollingRef.current) clearInterval(pollingRef.current);
                      pollingRef.current = null;
                      setActiveRunId(null);
                      setActiveRun(null);
                      setActiveSteps([]);
                      const { runs: updated } = await agentTeamService.listRuns(50);
                      setRuns(updated);
                    }}
                    className="text-[10px] text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1">
              {([
                { key: 'all' as const, label: 'Todos', count: runs.length },
                { key: 'completed' as const, label: 'Completos', count: completedCount },
                { key: 'failed' as const, label: 'Falhos', count: failedCount },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setHistoryStatusFilter(tab.key); setHistoryLimit(5); }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    historyStatusFilter === tab.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Compare bar */}
            {compareMode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg text-[10px] text-indigo-700">
                <GitCompare size={12} />
                <span>Selecione 2 análises para comparar ({compareIds.size}/2)</span>
                {compareIds.size === 2 && (
                  <button
                    onClick={() => setShowCompareModal(true)}
                    className="ml-auto px-3 py-1 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Ver Comparação
                  </button>
                )}
              </div>
            )}

            {/* Run list */}
            <div className="space-y-2">
              {visibleRuns.map((run) => {
                const duration = formatDuration(run.started_at, run.completed_at);
                const summaryPreview = run.consolidated_summary
                  ? run.consolidated_summary.replace(/[#*_\n]+/g, ' ').slice(0, 120)
                  : null;
                const isSelected = compareIds.has(run.id);
                return (
                  <div
                    key={run.id}
                    className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs transition-all ${
                      isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Compare checkbox */}
                    {compareMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setCompareIds(prev => {
                            const next = new Set(prev);
                            if (next.has(run.id)) { next.delete(run.id); }
                            else if (next.size < 2) { next.add(run.id); }
                            return next;
                          });
                        }}
                        className="mt-1 accent-indigo-600 shrink-0"
                      />
                    )}
                    <button
                      onClick={() => setActiveRunId(run.id)}
                      className="flex-1 flex flex-col text-left min-w-0 gap-1"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900">{run.objective.slice(0, 80)}</span>
                          <span className="text-gray-400 ml-2">
                            {new Date(run.started_at).toLocaleDateString('pt-BR')} {new Date(run.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Duration badge */}
                          {duration !== '—' && (
                            <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                              <Timer size={10} />
                              {duration}
                            </span>
                          )}
                          {/* Status badge */}
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            run.status === 'completed' ? 'bg-green-100 text-green-700' :
                            run.status === 'failed' ? 'bg-red-100 text-red-700' :
                            run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {run.status}
                          </span>
                        </div>
                      </div>
                      {/* Meta row: user + filters */}
                      <div className="flex items-center gap-2">
                        {run.started_by_name && (
                          <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                            <UserCheck size={9} />
                            {run.started_by_name}
                          </span>
                        )}
                        <FilterBadges filterContext={run.filter_context} size="compact" />
                      </div>
                      {/* Summary preview */}
                      {summaryPreview && (
                        <p className="text-[10px] text-gray-400 leading-tight truncate max-w-full">
                          <FileText size={9} className="inline mr-1 -mt-0.5" />
                          {summaryPreview}…
                        </p>
                      )}
                    </button>
                    {/* Action buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      {/* Export button */}
                      {run.status === 'completed' && run.consolidated_summary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const text = `# Análise Financeira — ${run.objective}\n\nData: ${new Date(run.started_at).toLocaleDateString('pt-BR')}\nDuração: ${duration}\nUsuário: ${run.started_by_name || '—'}\n\n${run.consolidated_summary}`;
                            const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `analise-${new Date(run.started_at).toISOString().slice(0,10)}.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Exportar análise"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRun(run.id); }}
                        disabled={deletingId === run.id}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Excluir análise"
                      >
                        {deletingId === run.id ? (
                          <Loader2 size={14} className="animate-spin text-red-400" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Paginação */}
            {hasMore && (
              <button
                onClick={() => setHistoryLimit(prev => prev + 10)}
                className="w-full py-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Mostrar mais ({filteredRuns.length - historyLimit} restantes)
              </button>
            )}
            {historyLimit > 5 && (
              <button
                onClick={() => setHistoryLimit(5)}
                className="w-full py-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Recolher
              </button>
            )}
          </div>
        );
      })()}

      {/* Compare Modal */}
      {showCompareModal && (() => {
        const ids = Array.from(compareIds);
        const runA = runs.find(r => r.id === ids[0]);
        const runB = runs.find(r => r.id === ids[1]);
        if (!runA || !runB) return null;

        const stepsA = compareSteps[runA.id] || [];
        const stepsB = compareSteps[runB.id] || [];
        const fsA = runA.financial_summary as FinancialSummary | null;
        const fsB = runB.financial_summary as FinancialSummary | null;

        const AGENT_LABELS: Record<string, string> = {
          alex: 'Alex — Supervisor', carlos: 'Carlos — Performance',
          denilson: 'Denilson — Otimização', edmundo: 'Edmundo — Forecast',
        };
        const AGENT_COLORS: Record<string, string> = {
          alex: '#8b5cf6', carlos: '#3b82f6', denilson: '#10b981', edmundo: '#6366f1',
        };

        const fmtBRL = (v: number | undefined | null) => {
          if (v == null) return '—';
          return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
        };
        const fmtPct = (v: number | undefined | null) => {
          if (v == null) return '—';
          return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
        };

        const totalTokens = (steps: AgentStep[]) => steps.reduce((s, st) => s + (st.tokens_input || 0) + (st.tokens_output || 0), 0);

        // Compute KPI comparison rows
        const kpiRows = fsA && fsB ? [
          { label: 'Receita Líquida', valA: fsA.receita.real, valB: fsB.receita.real, orcA: fsA.receita.orcado, orcB: fsB.receita.orcado },
          { label: 'Custos Variáveis', valA: fsA.custos_variaveis.real, valB: fsB.custos_variaveis.real, orcA: fsA.custos_variaveis.orcado, orcB: fsB.custos_variaveis.orcado },
          { label: 'Custos Fixos', valA: fsA.custos_fixos.real, valB: fsB.custos_fixos.real, orcA: fsA.custos_fixos.orcado, orcB: fsB.custos_fixos.orcado },
          { label: 'SG&A', valA: fsA.sga.real, valB: fsB.sga.real, orcA: fsA.sga.orcado, orcB: fsB.sga.orcado },
          { label: 'Rateio Raiz', valA: fsA.rateio.real, valB: fsB.rateio.real, orcA: fsA.rateio.orcado, orcB: fsB.rateio.orcado },
          { label: 'Margem Contrib.', valA: fsA.margem_contribuicao.real, valB: fsB.margem_contribuicao.real, orcA: fsA.margem_contribuicao.orcado, orcB: fsB.margem_contribuicao.orcado },
          { label: 'EBITDA', valA: fsA.ebitda.real, valB: fsB.ebitda.real, orcA: fsA.ebitda.orcado, orcB: fsB.ebitda.orcado },
        ] : [];

        const COMPARE_TABS = [
          { key: 'overview' as const, label: 'Visão Geral', icon: BarChart3 },
          { key: 'kpis' as const, label: 'KPIs Financeiros', icon: TrendingUp },
          { key: 'agents' as const, label: 'Por Agente', icon: Users },
          { key: 'summary' as const, label: 'Resumo Consolidado', icon: FileText },
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowCompareModal(false); setCompareTab('overview'); }}>
            <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <GitCompare size={16} className="text-indigo-500" />
                  Comparação de Análises
                </h3>
                <div className="flex items-center gap-2">
                  {/* Tab navigation */}
                  {COMPARE_TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setCompareTab(tab.key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        compareTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <tab.icon size={12} />
                      {tab.label}
                    </button>
                  ))}
                  {/* Export PPT */}
                  <button
                    onClick={async () => {
                      if (!runA || !runB) return;
                      setExportingCompare(true);
                      try {
                        await exportComparePPT({
                          runA, runB,
                          stepsA: compareSteps[runA.id] || [],
                          stepsB: compareSteps[runB.id] || [],
                        });
                      } catch (err) {
                        console.error('Erro ao exportar PPT:', err);
                      } finally {
                        setExportingCompare(false);
                      }
                    }}
                    disabled={exportingCompare || compareLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 ml-1"
                    title="Exportar comparação em PPT"
                  >
                    {exportingCompare ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    Exportar PPT
                  </button>
                  <button onClick={() => { setShowCompareModal(false); setCompareTab('overview'); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 ml-2">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Loading */}
              {compareLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-indigo-400" />
                  <span className="ml-2 text-sm text-gray-500">Carregando dados...</span>
                </div>
              )}

              {/* TAB: Overview */}
              {!compareLoading && compareTab === 'overview' && (
                <div className="flex-1 overflow-auto p-6 space-y-6">
                  {/* Side-by-side meta cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {[runA, runB].map((run, idx) => {
                      const fs = idx === 0 ? fsA : fsB;
                      const steps = idx === 0 ? stepsA : stepsB;
                      const tokens = totalTokens(steps);
                      return (
                        <div key={run.id} className={`rounded-xl border-2 p-4 space-y-3 ${idx === 0 ? 'border-indigo-200 bg-indigo-50/30' : 'border-purple-200 bg-purple-50/30'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${idx === 0 ? 'bg-indigo-500' : 'bg-purple-500'}`}>
                              {idx === 0 ? 'A' : 'B'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">{run.objective.slice(0, 70)}</p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span>{new Date(run.started_at).toLocaleDateString('pt-BR')} {new Date(run.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                {run.completed_at && <span className="flex items-center gap-0.5"><Timer size={9} />{formatDuration(run.started_at, run.completed_at)}</span>}
                                {run.started_by_name && <span>{run.started_by_name}</span>}
                              </div>
                            </div>
                            <span className={`ml-auto px-2 py-0.5 rounded-full font-bold uppercase text-[9px] shrink-0 ${
                              run.status === 'completed' ? 'bg-green-100 text-green-700' : run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                            }`}>{run.status}</span>
                          </div>
                          <FilterBadges filterContext={run.filter_context} size="compact" />
                          {/* Quick KPI summary */}
                          {fs && (
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white rounded-lg p-2 text-center">
                                <p className="text-[9px] text-gray-400 uppercase">Receita</p>
                                <p className="text-xs font-bold text-gray-900">{fmtBRL(fs.receita.real)}</p>
                                <p className={`text-[9px] font-medium ${fs.receita.gap_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtPct(fs.receita.gap_pct)} vs orç</p>
                              </div>
                              <div className="bg-white rounded-lg p-2 text-center">
                                <p className="text-[9px] text-gray-400 uppercase">EBITDA</p>
                                <p className="text-xs font-bold text-gray-900">{fmtBRL(fs.ebitda.real)}</p>
                                {fs.ebitda.pct_real != null && <p className="text-[9px] text-gray-500">Margem {fs.ebitda.pct_real.toFixed(1)}%</p>}
                              </div>
                              <div className="bg-white rounded-lg p-2 text-center">
                                <p className="text-[9px] text-gray-400 uppercase">Margem Contrib</p>
                                <p className="text-xs font-bold text-gray-900">{fmtBRL(fs.margem_contribuicao.real)}</p>
                                <p className={`text-[9px] font-medium ${
                                  fs.margem_contribuicao.health === 'healthy' ? 'text-green-600' :
                                  fs.margem_contribuicao.health === 'attention' ? 'text-amber-600' : 'text-red-500'
                                }`}>{fs.margem_contribuicao.pct_real?.toFixed(1)}%</p>
                              </div>
                            </div>
                          )}
                          {/* Agent steps summary */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {steps.filter(s => s.agent_code !== 'alex' || s.step_type !== 'consolidate').map(step => (
                              <span
                                key={step.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium text-white"
                                style={{ backgroundColor: AGENT_COLORS[step.agent_code] || '#6b7280' }}
                              >
                                {step.agent_code}
                                {step.status === 'completed' ? ' ✓' : step.status === 'failed' ? ' ✗' : ''}
                              </span>
                            ))}
                            <span className="text-[9px] text-gray-400 ml-1">{tokens.toLocaleString('pt-BR')} tokens</span>
                          </div>
                          {/* Top variations */}
                          {fs?.top5_variacoes && fs.top5_variacoes.length > 0 && (
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase mb-1">Top Variações vs Orçado</p>
                              <div className="space-y-0.5">
                                {fs.top5_variacoes.slice(0, 5).map((v, i) => (
                                  <div key={i} className="flex items-center justify-between text-[10px]">
                                    <span className="text-gray-700 truncate max-w-[60%]">{v.tag01}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">{fmtBRL(v.real)}</span>
                                      <span className={`font-medium ${v.delta_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtPct(v.delta_pct)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: KPIs Financeiros */}
              {!compareLoading && compareTab === 'kpis' && (
                <div className="flex-1 overflow-auto p-6">
                  {kpiRows.length > 0 ? (
                    <div className="space-y-4">
                      {/* KPI comparison table */}
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-2 text-gray-500 font-medium w-[20%]">Linha DRE</th>
                            <th className="text-right py-2 font-medium w-[16%]"><span className="text-indigo-600">A</span> Real</th>
                            <th className="text-right py-2 font-medium w-[16%]"><span className="text-purple-600">B</span> Real</th>
                            <th className="text-right py-2 font-medium text-gray-400 w-[12%]">Δ A→B</th>
                            <th className="text-right py-2 font-medium w-[16%]"><span className="text-indigo-600">A</span> Orçado</th>
                            <th className="text-right py-2 font-medium w-[16%]"><span className="text-purple-600">B</span> Orçado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpiRows.map((row, i) => {
                            const deltaReal = row.valA && row.valB ? ((row.valB - row.valA) / Math.abs(row.valA)) * 100 : null;
                            const isEbitda = row.label === 'EBITDA';
                            return (
                              <tr key={i} className={`border-b ${isEbitda ? 'bg-gray-50 font-semibold' : ''}`}>
                                <td className="py-2 text-gray-700">{row.label}</td>
                                <td className="py-2 text-right text-indigo-700">{fmtBRL(row.valA)}</td>
                                <td className="py-2 text-right text-purple-700">{fmtBRL(row.valB)}</td>
                                <td className="py-2 text-right">
                                  {deltaReal != null && (
                                    <span className={`inline-flex items-center gap-0.5 ${deltaReal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                      {deltaReal >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                      {fmtPct(deltaReal)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 text-right text-indigo-400">{fmtBRL(row.orcA)}</td>
                                <td className="py-2 text-right text-purple-400">{fmtBRL(row.orcB)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Margem + Health comparison */}
                      {fsA && fsB && (
                        <div className="grid grid-cols-2 gap-4">
                          {[{ label: 'A', fs: fsA, color: 'indigo' }, { label: 'B', fs: fsB, color: 'purple' }].map(item => (
                            <div key={item.label} className={`rounded-lg border border-${item.color}-200 p-3 space-y-2`}>
                              <p className={`text-[10px] font-bold text-${item.color}-600 uppercase`}>Análise {item.label}</p>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div>
                                  <span className="text-gray-400">Margem Real:</span>{' '}
                                  <span className="font-semibold">{item.fs.margem_contribuicao.pct_real?.toFixed(1)}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Margem Orç:</span>{' '}
                                  <span className="font-semibold">{item.fs.margem_contribuicao.pct_orcado?.toFixed(1)}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">EBITDA %:</span>{' '}
                                  <span className="font-semibold">{item.fs.ebitda.pct_real?.toFixed(1)}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Saúde:</span>{' '}
                                  <span className={`font-semibold ${
                                    item.fs.margem_contribuicao.health === 'healthy' ? 'text-green-600' :
                                    item.fs.margem_contribuicao.health === 'attention' ? 'text-amber-600' : 'text-red-500'
                                  }`}>
                                    {item.fs.margem_contribuicao.health === 'healthy' ? '● Saudável' :
                                     item.fs.margem_contribuicao.health === 'attention' ? '● Atenção' : '● Crítico'}
                                  </span>
                                </div>
                              </div>
                              {/* Top receita + custo */}
                              {item.fs.top5_tags01_receita && item.fs.top5_tags01_receita.length > 0 && (
                                <div>
                                  <p className="text-[9px] text-gray-400 uppercase mt-1">Top Receita</p>
                                  {item.fs.top5_tags01_receita.slice(0, 3).map((t, j) => (
                                    <div key={j} className="flex justify-between text-[10px]">
                                      <span className="text-gray-600 truncate">{t.tag01}</span>
                                      <span className="font-medium">{fmtBRL(t.total)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.fs.top5_tags01_custo && item.fs.top5_tags01_custo.length > 0 && (
                                <div>
                                  <p className="text-[9px] text-gray-400 uppercase mt-1">Top Custo</p>
                                  {item.fs.top5_tags01_custo.slice(0, 3).map((t, j) => (
                                    <div key={j} className="flex justify-between text-[10px]">
                                      <span className="text-gray-600 truncate">{t.tag01}</span>
                                      <span className="font-medium text-red-500">{fmtBRL(t.total)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Monthly trend comparison */}
                      {fsA?.tendencia_mensal && fsB?.tendencia_mensal && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Tendência Mensal</p>
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="border-b text-gray-400">
                                <th className="text-left py-1">Mês</th>
                                <th className="text-right py-1"><span className="text-indigo-500">A</span> Receita</th>
                                <th className="text-right py-1"><span className="text-purple-500">B</span> Receita</th>
                                <th className="text-right py-1"><span className="text-indigo-500">A</span> EBITDA</th>
                                <th className="text-right py-1"><span className="text-purple-500">B</span> EBITDA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fsA.tendencia_mensal.map((mA, i) => {
                                const mB = fsB.tendencia_mensal?.[i];
                                return (
                                  <tr key={i} className="border-b border-gray-100">
                                    <td className="py-1 text-gray-600">{mA.mes}</td>
                                    <td className="py-1 text-right text-indigo-600">{fmtBRL(mA.receita)}</td>
                                    <td className="py-1 text-right text-purple-600">{mB ? fmtBRL(mB.receita) : '—'}</td>
                                    <td className="py-1 text-right text-indigo-600">{fmtBRL(mA.ebitda)}</td>
                                    <td className="py-1 text-right text-purple-600">{mB ? fmtBRL(mB.ebitda) : '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-8">Dados financeiros não disponíveis para comparação</p>
                  )}
                </div>
              )}

              {/* TAB: Por Agente */}
              {!compareLoading && compareTab === 'agents' && (
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  {['alex', 'carlos', 'denilson', 'edmundo'].map(agentCode => {
                    const stepA = stepsA.find(s => s.agent_code === agentCode && s.step_type !== 'consolidate');
                    const stepB = stepsB.find(s => s.agent_code === agentCode && s.step_type !== 'consolidate');
                    if (!stepA && !stepB) return null;

                    const extractSummary = (step: AgentStep | undefined): string => {
                      if (!step?.output_data) return 'Sem output';
                      const out = step.output_data as Record<string, unknown>;
                      // Try common summary fields
                      for (const key of ['resumo_executivo', 'resumo_projecao', 'executive_summary', 'plan_summary', 'summary', 'recado_final', 'recado_estrategico']) {
                        if (typeof out[key] === 'string' && out[key]) return out[key] as string;
                      }
                      // Try nested object with resumo
                      for (const val of Object.values(out)) {
                        if (val && typeof val === 'object' && 'resumo' in (val as Record<string, unknown>)) {
                          return (val as Record<string, unknown>).resumo as string;
                        }
                      }
                      return JSON.stringify(out).slice(0, 300) + '...';
                    };

                    return (
                      <div key={agentCode} className="border rounded-lg overflow-hidden">
                        <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: `${AGENT_COLORS[agentCode]}10`, borderBottom: `2px solid ${AGENT_COLORS[agentCode]}` }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: AGENT_COLORS[agentCode] }}>
                            <Zap size={10} className="text-white" />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: AGENT_COLORS[agentCode] }}>
                            {AGENT_LABELS[agentCode] || agentCode}
                          </span>
                          <div className="ml-auto flex items-center gap-3 text-[9px] text-gray-400">
                            {stepA && <span><span className="text-indigo-500 font-medium">A</span> {(stepA.tokens_input + stepA.tokens_output).toLocaleString('pt-BR')} tok • {stepA.status}</span>}
                            {stepB && <span><span className="text-purple-500 font-medium">B</span> {(stepB.tokens_input + stepB.tokens_output).toLocaleString('pt-BR')} tok • {stepB.status}</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 divide-x">
                          {[stepA, stepB].map((step, idx) => (
                            <div key={idx} className="p-3 max-h-[250px] overflow-auto">
                              {step ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1">
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${idx === 0 ? 'bg-indigo-500' : 'bg-purple-500'}`}>
                                      {idx === 0 ? 'A' : 'B'}
                                    </span>
                                    <span className={`text-[9px] font-medium ${step.status === 'completed' ? 'text-green-600' : step.status === 'failed' ? 'text-red-500' : 'text-gray-400'}`}>
                                      {step.status === 'completed' ? '✓ Concluído' : step.status === 'failed' ? '✗ Falhou' : step.status}
                                    </span>
                                  </div>
                                  {step.error_message && (
                                    <p className="text-[10px] text-red-500 bg-red-50 rounded p-1.5">{step.error_message}</p>
                                  )}
                                  <div className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {extractSummary(step).slice(0, 800)}
                                    {extractSummary(step).length > 800 && '…'}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-400 italic">Agente não executou nesta análise</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Consolidation step (alex consolidate) */}
                  {(() => {
                    const consA = stepsA.find(s => s.agent_code === 'alex' && s.step_type === 'consolidate');
                    const consB = stepsB.find(s => s.agent_code === 'alex' && s.step_type === 'consolidate');
                    if (!consA && !consB) return null;
                    return (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="px-4 py-2 flex items-center gap-2 bg-violet-50 border-b-2 border-violet-400">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-violet-500">
                            <Target size={10} className="text-white" />
                          </div>
                          <span className="text-xs font-semibold text-violet-600">Alex — Consolidação Final</span>
                        </div>
                        <div className="grid grid-cols-2 divide-x">
                          {[consA, consB].map((step, idx) => (
                            <div key={idx} className="p-3 max-h-[200px] overflow-auto">
                              {step?.output_data ? (
                                <div className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {(() => {
                                    const out = step.output_data as Record<string, unknown>;
                                    const exec = out.executive_summary || out.resumo_executivo || '';
                                    return typeof exec === 'string' ? exec.slice(0, 600) : JSON.stringify(out).slice(0, 400);
                                  })()}
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-400 italic">{step ? 'Sem output' : 'Não executou'}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB: Resumo Consolidado */}
              {!compareLoading && compareTab === 'summary' && (
                <div className="flex-1 overflow-auto grid grid-cols-2 divide-x">
                  {[runA, runB].map((run, idx) => (
                    <div key={run.id} className="p-5 space-y-3 overflow-auto">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${idx === 0 ? 'bg-indigo-500' : 'bg-purple-500'}`}>
                          {idx === 0 ? 'A' : 'B'}
                        </span>
                        <span className="text-xs font-semibold text-gray-900">{run.objective.slice(0, 60)}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {new Date(run.started_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <FilterBadges filterContext={run.filter_context} size="compact" />
                      <div className="border-t pt-3">
                        {run.consolidated_summary ? (
                          <div className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {run.consolidated_summary}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">Sem resumo consolidado</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AgentTeamView;
