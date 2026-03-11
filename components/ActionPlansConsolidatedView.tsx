import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Filter, Download, FileText, Clock, CheckCircle2, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronUp, Edit3, Trash2, Building2, Calendar, User, Search } from 'lucide-react';
import { getActionPlans, updateActionPlan, deleteActionPlan, subscribeActionPlans } from '../services/supabaseService';
import type { ActionPlan, ActionPlanFilters } from '../services/supabaseService';
import ExcelJS from 'exceljs';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ActionPlansConsolidatedViewProps {
  selectedMonth: string;
  selectedMarcas: string[];
}

type PlanStatus = ActionPlan['status'];
type SortKey = 'deadline_asc' | 'deadline_desc' | 'status' | 'marca' | 'created';

const STATUS_OPTIONS: PlanStatus[] = ['aberto', 'em_andamento', 'concluido', 'atrasado', 'cancelado'];

const STATUS_CONFIG: Record<PlanStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  aberto:        { label: 'Aberto',        bg: 'bg-amber-100',  text: 'text-amber-700',  icon: <Clock className="w-3.5 h-3.5" /> },
  em_andamento:  { label: 'Em andamento',  bg: 'bg-blue-100',   text: 'text-blue-700',   icon: <Loader2 className="w-3.5 h-3.5" /> },
  concluido:     { label: 'Concluído',     bg: 'bg-green-100',  text: 'text-green-700',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  atrasado:      { label: 'Atrasado',      bg: 'bg-red-100',    text: 'text-red-700',    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  cancelado:     { label: 'Cancelado',     bg: 'bg-gray-100',   text: 'text-gray-500',   icon: <XCircle className="w-3.5 h-3.5" /> },
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'deadline_asc',  label: 'Prazo \u2191' },
  { key: 'deadline_desc', label: 'Prazo \u2193' },
  { key: 'status',        label: 'Status' },
  { key: 'marca',         label: 'Marca' },
  { key: 'created',       label: 'Criação' },
];

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const STATUS_SORT_ORDER: Record<PlanStatus, number> = { atrasado: 0, aberto: 1, em_andamento: 2, concluido: 3, cancelado: 4 };

// ── Component ──────────────────────────────────────────────────────────────────
const ActionPlansConsolidatedView: React.FC<ActionPlansConsolidatedViewProps> = ({ selectedMonth, selectedMarcas }) => {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<PlanStatus>>(new Set(STATUS_OPTIONS));
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('deadline_asc');
  const [statusDropdownId, setStatusDropdownId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ActionPlanFilters = {};
      if (selectedMonth) filters.year_month = selectedMonth;
      if (selectedMarcas.length > 0) filters.marcas = selectedMarcas;
      const data = await getActionPlans(filters);
      setPlans(data);
    } catch (err) {
      console.error('Erro ao carregar planos de ação:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedMarcas]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    const unsub = subscribeActionPlans(() => { loadPlans(); });
    return () => { unsub?.unsubscribe?.(); };
  }, [loadPlans]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return plans.filter(p => {
      if (!statusFilter.has(p.status)) return false;
      if (q && ![p.what, p.why, p.who_responsible].some(f => f?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [plans, statusFilter, searchText]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case 'deadline_asc':  return arr.sort((a, b) => a.deadline.localeCompare(b.deadline));
      case 'deadline_desc': return arr.sort((a, b) => b.deadline.localeCompare(a.deadline));
      case 'status':        return arr.sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]);
      case 'marca':         return arr.sort((a, b) => (a.marca || '').localeCompare(b.marca || ''));
      case 'created':       return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
      default:              return arr;
    }
  }, [filtered, sortKey]);

  const kpis = useMemo(() => {
    const total = plans.length;
    const aberto = plans.filter(p => p.status === 'aberto').length;
    const em_andamento = plans.filter(p => p.status === 'em_andamento').length;
    const atrasado = plans.filter(p => p.status === 'atrasado').length;
    const concluido = plans.filter(p => p.status === 'concluido').length;
    const completionRate = total > 0 ? Math.round((concluido / total) * 100) : 0;
    return { total, aberto, em_andamento, atrasado, concluido, completionRate };
  }, [plans]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStatusChange = async (id: number, newStatus: PlanStatus) => {
    setStatusDropdownId(null);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'concluido') updates.completed_at = new Date().toISOString();
    await updateActionPlan(id, updates as any);
    loadPlans();
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirmId(null);
    await deleteActionPlan(id);
    loadPlans();
  };

  const toggleStatusFilter = (s: PlanStatus) => {
    setStatusFilter(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const isOverdue = (deadline: string, status: PlanStatus) => {
    if (status === 'concluido' || status === 'cancelado') return false;
    return new Date(deadline) < new Date();
  };

  // ── Excel Export ───────────────────────────────────────────────────────────
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Planos de Ação');

    const columns = [
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Mês', key: 'year_month', width: 12 },
      { header: 'Marca', key: 'marca', width: 18 },
      { header: 'Tag0', key: 'tag0', width: 22 },
      { header: 'Tag01', key: 'tag01', width: 22 },
      { header: 'O que', key: 'what', width: 40 },
      { header: 'Por que', key: 'why', width: 40 },
      { header: 'Como', key: 'how', width: 30 },
      { header: 'Responsável', key: 'who_responsible', width: 22 },
      { header: 'Prazo', key: 'deadline', width: 14 },
      { header: 'Desvio (R$)', key: 'variance_abs', width: 16 },
      { header: 'Desvio (%)', key: 'variance_pct', width: 12 },
      { header: 'Impacto Esperado', key: 'expected_impact', width: 30 },
      { header: 'Justificativa', key: 'justification', width: 40 },
      { header: 'Nota Progresso', key: 'progress_note', width: 30 },
      { header: 'Criado em', key: 'created_at', width: 18 },
    ];
    ws.columns = columns;

    // Header style
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sorted.forEach(p => {
      ws.addRow({
        status: STATUS_CONFIG[p.status].label,
        year_month: p.year_month,
        marca: p.marca || '',
        tag0: p.tag0 || '',
        tag01: p.tag01 || '',
        what: p.what,
        why: p.why,
        how: p.how || '',
        who_responsible: p.who_responsible,
        deadline: fmtDate(p.deadline),
        variance_abs: p.variance_abs ?? 0,
        variance_pct: p.variance_pct ?? 0,
        expected_impact: p.expected_impact || '',
        justification: p.justification || '',
        progress_note: p.progress_note || '',
        created_at: fmtDate(p.created_at),
      });
    });

    // Format currency column
    ws.getColumn('variance_abs').numFmt = '#,##0';

    const today = new Date().toISOString().slice(0, 10);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planos-acao-${today}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderStatusBadge = (plan: ActionPlan) => {
    const cfg = STATUS_CONFIG[plan.status];
    return (
      <div className="relative">
        <button
          onClick={e => { e.stopPropagation(); setStatusDropdownId(statusDropdownId === plan.id ? null : plan.id); }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} cursor-pointer hover:opacity-80 transition`}
        >
          {cfg.icon}
          {cfg.label}
          <ChevronDown className="w-3 h-3" />
        </button>
        {statusDropdownId === plan.id && (
          <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[150px]">
            {STATUS_OPTIONS.filter(s => s !== plan.status).map(s => {
              const c = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={e => { e.stopPropagation(); handleStatusChange(plan.id, s); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 ${c.text}`}
                >
                  {c.icon}
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderContaLinha = (p: ActionPlan) => {
    const parts = [p.tag0, p.tag01].filter(Boolean);
    if (parts.length === 0) return <span className="text-gray-400">—</span>;
    const text = parts.join(' > ');
    return <span className="text-xs text-gray-700" title={text}>{text.length > 35 ? text.slice(0, 35) + '...' : text}</span>;
  };

  const renderVariance = (p: ActionPlan) => {
    if (p.variance_abs == null && p.variance_pct == null) return <span className="text-gray-400">—</span>;
    const isNeg = (p.variance_abs ?? 0) < 0;
    const color = isNeg ? 'text-red-600' : 'text-green-600';
    return (
      <span className={`text-xs font-medium ${color}`}>
        {p.variance_abs != null && fmtBRL.format(p.variance_abs)}
        {p.variance_pct != null && <span className="ml-1 opacity-70">({p.variance_pct > 0 ? '+' : ''}{p.variance_pct.toFixed(1)}%)</span>}
      </span>
    );
  };

  // ── KPI Strip ──────────────────────────────────────────────────────────────
  const renderKpiStrip = () => {
    const cards: { label: string; count: number; color: string; bgLight: string; icon: React.ReactNode }[] = [
      { label: 'Total',          count: kpis.total,         color: 'text-gray-600',   bgLight: 'bg-gray-50',    icon: <Target className="w-5 h-5 text-gray-500" /> },
      { label: 'Aberto',         count: kpis.aberto,        color: 'text-amber-600',  bgLight: 'bg-amber-50',   icon: <Clock className="w-5 h-5 text-amber-500" /> },
      { label: 'Em andamento',   count: kpis.em_andamento,  color: 'text-blue-600',   bgLight: 'bg-blue-50',    icon: <Loader2 className="w-5 h-5 text-blue-500" /> },
      { label: 'Atrasado',       count: kpis.atrasado,      color: 'text-red-600',    bgLight: 'bg-red-50',     icon: <AlertTriangle className="w-5 h-5 text-red-500" /> },
      { label: 'Concluído',      count: kpis.concluido,     color: 'text-green-600',  bgLight: 'bg-green-50',   icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
    ];

    return (
      <div className="flex items-center gap-3 flex-wrap">
        {cards.map(c => (
          <div key={c.label} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-100 ${c.bgLight} min-w-[130px]`}>
            {c.icon}
            <div>
              <div className={`text-lg font-bold ${c.color}`}>{c.count}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">{c.label}</div>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-100 bg-white ml-auto">
          <div className="text-xs text-gray-500">Conclusão</div>
          <div className="text-lg font-bold text-indigo-600">{kpis.completionRate}%</div>
        </div>
      </div>
    );
  };

  // ── Filters Bar ────────────────────────────────────────────────────────────
  const renderFiltersBar = () => (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Status pills */}
      <div className="flex items-center gap-1">
        <Filter className="w-4 h-4 text-gray-400 mr-1" />
        {STATUS_OPTIONS.map(s => {
          const cfg = STATUS_CONFIG[s];
          const active = statusFilter.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${
                active
                  ? `${cfg.bg} ${cfg.text} border-transparent`
                  : 'bg-white text-gray-400 border-gray-200 opacity-50'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar ação, motivo, responsável..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {/* Sort */}
      <select
        value={sortKey}
        onChange={e => setSortKey(e.target.value as SortKey)}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>

      {/* Export Excel */}
      <button
        onClick={exportExcel}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
      >
        <Download className="w-3.5 h-3.5" />
        Excel
      </button>

      {/* Export PPT placeholder */}
      <button
        disabled
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
        title="Em breve"
      >
        <FileText className="w-3.5 h-3.5" />
        PPT
      </button>
    </div>
  );

  // ── Expanded Row ───────────────────────────────────────────────────────────
  const renderExpandedRow = (p: ActionPlan) => (
    <tr>
      <td colSpan={9} className="px-4 py-4 bg-gray-50/80 border-b border-gray-100">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-gray-500 font-medium mb-1">O que (What)</div>
            <div className="text-gray-800">{p.what}</div>
          </div>
          <div>
            <div className="text-gray-500 font-medium mb-1">Por que (Why)</div>
            <div className="text-gray-800">{p.why}</div>
          </div>
          <div>
            <div className="text-gray-500 font-medium mb-1">Como (How)</div>
            <div className="text-gray-800">{p.how || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500 font-medium mb-1">Responsável (Who)</div>
            <div className="text-gray-800 flex items-center gap-1"><User className="w-3.5 h-3.5 text-gray-400" />{p.who_responsible}{p.who_email && <span className="text-gray-400 ml-1">({p.who_email})</span>}</div>
          </div>
          <div>
            <div className="text-gray-500 font-medium mb-1">Prazo (When)</div>
            <div className="text-gray-800 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{fmtDate(p.deadline)}</div>
          </div>
          <div>
            <div className="text-gray-500 font-medium mb-1">Impacto Esperado</div>
            <div className="text-gray-800">{p.expected_impact || '—'}</div>
          </div>
          {p.justification && (
            <div className="col-span-2 lg:col-span-3">
              <div className="text-gray-500 font-medium mb-1">Justificativa</div>
              <div className="text-gray-800 whitespace-pre-wrap">{p.justification}</div>
            </div>
          )}
          {p.progress_note && (
            <div className="col-span-2 lg:col-span-3">
              <div className="text-gray-500 font-medium mb-1">Nota de Progresso</div>
              <div className="text-gray-800 whitespace-pre-wrap">{p.progress_note}</div>
            </div>
          )}
          <div className="col-span-2 lg:col-span-3 flex items-center gap-4 text-[10px] text-gray-400 pt-2 border-t border-gray-200">
            <span>Criado por: {p.created_by_name || p.created_by}</span>
            <span>Criado em: {fmtDate(p.created_at)}</span>
            <span>Atualizado: {fmtDate(p.updated_at)}</span>
            {p.completed_at && <span>Concluído em: {fmtDate(p.completed_at)}</span>}
            {p.ai_generated && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">IA</span>}
            {p.comparison_type && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">vs {p.comparison_type === 'orcado' ? 'Orçado' : 'A-1'}</span>}
          </div>
        </div>
      </td>
    </tr>
  );

  // ── Delete Confirm ─────────────────────────────────────────────────────────
  const renderDeleteConfirm = () => {
    if (deleteConfirmId == null) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full"><Trash2 className="w-5 h-5 text-red-600" /></div>
            <div>
              <div className="font-semibold text-gray-800">Excluir plano de ação</div>
              <div className="text-xs text-gray-500">Esta ação não pode ser desfeita.</div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => handleDelete(deleteConfirmId)} className="px-4 py-2 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700">Excluir</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {renderDeleteConfirm()}

      {/* KPI Strip */}
      {renderKpiStrip()}

      {/* Filters Bar */}
      {renderFiltersBar()}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Carregando planos de ação...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Target className="w-12 h-12 mb-3 opacity-40" />
          <div className="text-sm font-medium">Nenhum plano de ação encontrado para os filtros selecionados</div>
        </div>
      )}

      {/* Table */}
      {!loading && sorted.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Mês</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Marca</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Conta / Linha</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">O que</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Responsável</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Prazo</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Desvio</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const expanded = expandedId === p.id;
                const overdue = isOverdue(p.deadline, p.status);
                return (
                  <React.Fragment key={p.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      className={`border-b border-gray-100 cursor-pointer transition hover:bg-indigo-50/30 ${expanded ? 'bg-indigo-50/20' : ''}`}
                    >
                      <td className="px-3 py-2.5">{renderStatusBadge(p)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{p.year_month}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {p.marca || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{renderContaLinha(p)}</td>
                      <td className="px-3 py-2.5 text-gray-800 max-w-[250px] truncate" title={p.what}>{p.what}</td>
                      <td className="px-3 py-2.5 text-gray-700">{p.who_responsible}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${overdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {fmtDate(p.deadline)}
                      </td>
                      <td className="px-3 py-2.5 text-right">{renderVariance(p)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedId(expanded ? null : p.id); }}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Detalhes"
                          >
                            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                            className="p-1 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && renderExpandedRow(p)}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActionPlansConsolidatedView;
