import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Filter, Download, FileText, Clock, CheckCircle2, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronUp, Trash2, Building2, Calendar, User, Search, Pencil } from 'lucide-react';
import { getActionPlans, updateActionPlan, deleteActionPlan, subscribeActionPlans } from '../services/supabaseService';
import type { ActionPlan, ActionPlanFilters } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import ActionPlanForm from './ActionPlanForm';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ActionPlansConsolidatedViewProps {
  selectedMonth: string;
  selectedMarcas: string[];
}

type PlanStatus = ActionPlan['status'];
type SortKey = 'deadline_asc' | 'deadline_desc' | 'status' | 'marca' | 'created';
type Density = 'comfortable' | 'compact' | 'ultra';

const DENSITY_KEY = 'action_plans_density_v1';
const DENSITY_LABELS: Record<Density, string> = { comfortable: 'Conf.', compact: 'Comp.', ultra: 'Ultra' };
const DENSITY_CYCLE: Density[] = ['comfortable', 'compact', 'ultra'];

interface DensCfg { cellPy: string; cellPx: string; textSize: string; badgeSize: string; iconSize: number; kpiPy: string; kpiIcon: number; kpiText: string; kpiLabel: string; }
const DENSITY_CFG: Record<Density, DensCfg> = {
  comfortable: { cellPy: 'py-2.5', cellPx: 'px-3', textSize: 'text-xs', badgeSize: 'px-2.5 py-1', iconSize: 14, kpiPy: 'py-2.5 px-4', kpiIcon: 20, kpiText: 'text-lg', kpiLabel: 'text-[10px]' },
  compact:     { cellPy: 'py-1.5', cellPx: 'px-2', textSize: 'text-[11px]', badgeSize: 'px-2 py-0.5', iconSize: 12, kpiPy: 'py-1.5 px-3', kpiIcon: 16, kpiText: 'text-base', kpiLabel: 'text-[9px]' },
  ultra:       { cellPy: 'py-0.5', cellPx: 'px-1.5', textSize: 'text-[10px]', badgeSize: 'px-1.5 py-0.5', iconSize: 10, kpiPy: 'py-1 px-2', kpiIcon: 14, kpiText: 'text-sm', kpiLabel: 'text-[8px]' },
};

const STATUS_OPTIONS: PlanStatus[] = ['aberto', 'em_andamento', 'concluido', 'atrasado', 'cancelado'];

const STATUS_CONFIG: Record<PlanStatus, { label: string; bg: string; text: string; border: string; iconEl: (s: number) => React.ReactNode }> = {
  aberto:       { label: 'Aberto',       bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', iconEl: (s) => <Clock size={s} /> },
  em_andamento: { label: 'Em andamento', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  iconEl: (s) => <Loader2 size={s} /> },
  concluido:    { label: 'Concluído',    bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', iconEl: (s) => <CheckCircle2 size={s} /> },
  atrasado:     { label: 'Atrasado',     bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   iconEl: (s) => <AlertTriangle size={s} /> },
  cancelado:    { label: 'Cancelado',    bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',  iconEl: (s) => <XCircle size={s} /> },
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'deadline_asc', label: 'Prazo \u2191' },
  { key: 'deadline_desc', label: 'Prazo \u2193' },
  { key: 'status', label: 'Status' },
  { key: 'marca', label: 'Marca' },
  { key: 'created', label: 'Criação' },
];

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const STATUS_SORT_ORDER: Record<PlanStatus, number> = { atrasado: 0, aberto: 1, em_andamento: 2, concluido: 3, cancelado: 4 };

// ── Component ──────────────────────────────────────────────────────────────────
const ActionPlansConsolidatedView: React.FC<ActionPlansConsolidatedViewProps> = ({ selectedMonth, selectedMarcas }) => {
  const { user, isAdmin } = useAuth();
  const { allowedMarcas, allowedTag01, hasPermissions } = usePermissions();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<PlanStatus>>(new Set(STATUS_OPTIONS));
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('deadline_asc');
  const [statusDropdownId, setStatusDropdownId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
  const [density, setDensity] = useState<Density>(() => {
    try { return (localStorage.getItem(DENSITY_KEY) as Density) || 'compact'; } catch { return 'compact'; }
  });

  const dc = DENSITY_CFG[density];

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ActionPlanFilters = {};
      if (selectedMonth) filters.year_month = selectedMonth;
      // Marcas: prop do pai (já filtrada por permissão) ou fallback para permissões
      const effMarcas = selectedMarcas.length > 0
        ? selectedMarcas
        : (hasPermissions && allowedMarcas.length > 0 ? allowedMarcas : []);
      if (effMarcas.length > 0) filters.marcas = effMarcas;
      const data = await getActionPlans(filters);
      // Client-side filter by tag01 permissions
      const tag01Filtered = (hasPermissions && allowedTag01.length > 0)
        ? data.filter(p => !p.tag01 || allowedTag01.includes(p.tag01))
        : data;
      setPlans(tag01Filtered);
    } catch (err) {
      console.error('Erro ao carregar planos de ação:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedMarcas, hasPermissions, allowedMarcas, allowedTag01]);

  useEffect(() => { loadPlans(); }, [loadPlans]);
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

  const cycleDensity = () => {
    setDensity(prev => {
      const next = DENSITY_CYCLE[(DENSITY_CYCLE.indexOf(prev) + 1) % DENSITY_CYCLE.length];
      try { localStorage.setItem(DENSITY_KEY, next); } catch {}
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
    ws.columns = [
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
      { header: 'Real (R$)', key: 'real_value', width: 16 },
      { header: 'Orçado (R$)', key: 'compare_value', width: 16 },
      { header: 'Desvio (R$)', key: 'variance_abs', width: 16 },
      { header: 'Desvio (%)', key: 'variance_pct', width: 12 },
      { header: 'Impacto Esperado', key: 'expected_impact', width: 30 },
      { header: 'Justificativa', key: 'justification', width: 40 },
      { header: 'Nota Progresso', key: 'progress_note', width: 30 },
      { header: 'Criado em', key: 'created_at', width: 18 },
    ];
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sorted.forEach(p => {
      ws.addRow({
        status: STATUS_CONFIG[p.status].label, year_month: p.year_month, marca: p.marca || '',
        tag0: p.tag0 || '', tag01: p.tag01 || '', what: p.what, why: p.why, how: p.how || '',
        who_responsible: p.who_responsible, deadline: fmtDate(p.deadline),
        real_value: p.real_value ?? 0, compare_value: p.compare_value ?? 0,
        variance_abs: p.variance_abs ?? 0, variance_pct: p.variance_pct ?? 0,
        expected_impact: p.expected_impact || '', justification: p.justification || '',
        progress_note: p.progress_note || '', created_at: fmtDate(p.created_at),
      });
    });
    ws.getColumn('real_value').numFmt = '#,##0';
    ws.getColumn('compare_value').numFmt = '#,##0';
    ws.getColumn('variance_abs').numFmt = '#,##0';
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planos-acao-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render: Status Badge ──────────────────────────────────────────────────
  const renderStatusBadge = (plan: ActionPlan) => {
    const cfg = STATUS_CONFIG[plan.status];
    return (
      <div className="relative">
        <button
          onClick={e => { e.stopPropagation(); if (isAdmin) setStatusDropdownId(statusDropdownId === plan.id ? null : plan.id); }}
          className={`inline-flex items-center gap-1 ${dc.badgeSize} rounded-full ${dc.textSize} font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border} ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition`}
        >
          {cfg.iconEl(dc.iconSize)}
          {density !== 'ultra' && cfg.label}
          {isAdmin && <ChevronDown size={dc.iconSize - 2} />}
        </button>
        {statusDropdownId === plan.id && (
          <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            {STATUS_OPTIONS.filter(s => s !== plan.status).map(s => {
              const c = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={e => { e.stopPropagation(); handleStatusChange(plan.id, s); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 ${c.text}`}
                >
                  {c.iconEl(12)} {c.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Render: Expanded Row (Cards) ──────────────────────────────────────────
  const renderExpandedRow = (p: ActionPlan) => {
    const cfg = STATUS_CONFIG[p.status];
    return (
      <tr>
        <td colSpan={11} className="p-0">
          <div className={`mx-2 my-2 rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
            {/* Financial Summary */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white/90 rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-[10px] font-bold uppercase text-gray-400">Real</span>
                <span className="text-sm font-bold text-gray-800">{p.real_value != null ? fmtBRL.format(p.real_value) : '—'}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/90 rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-[10px] font-bold uppercase text-gray-400">{p.comparison_type === 'a1' ? 'A-1' : 'Orçado'}</span>
                <span className="text-sm font-bold text-gray-500">{p.compare_value != null ? fmtBRL.format(p.compare_value) : '—'}</span>
              </div>
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${(p.variance_abs ?? 0) < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <span className="text-[10px] font-bold uppercase text-gray-400">Desvio</span>
                <span className={`text-sm font-bold ${(p.variance_abs ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {p.variance_abs != null ? fmtBRL.format(p.variance_abs) : '—'}
                  {p.variance_pct != null && <span className="opacity-70 ml-1 text-xs">({p.variance_pct > 0 ? '+' : ''}{p.variance_pct.toFixed(1)}%)</span>}
                </span>
              </div>
            </div>

            {/* 5W1H Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              {/* What */}
              <DetailCard label="O que (What)" color="indigo">
                {p.what}
              </DetailCard>

              {/* Why */}
              <DetailCard label="Por que (Why)" color="purple">
                {p.why}
              </DetailCard>

              {/* How */}
              <DetailCard label="Como (How)" color="blue">
                {p.how || '—'}
              </DetailCard>

              {/* Who */}
              <DetailCard label="Responsável (Who)" color="amber">
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-amber-500 flex-shrink-0" />
                  <span>{p.who_responsible}</span>
                  {p.who_email && <span className="text-gray-400 text-[10px]">({p.who_email})</span>}
                </div>
              </DetailCard>

              {/* When */}
              <DetailCard label="Prazo (When)" color="rose">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-rose-500 flex-shrink-0" />
                  <span className={isOverdue(p.deadline, p.status) ? 'text-red-600 font-bold' : ''}>{fmtDate(p.deadline)}</span>
                </div>
              </DetailCard>

              {/* Impact */}
              <DetailCard label="Impacto Esperado" color="emerald">
                {p.expected_impact || '—'}
              </DetailCard>
            </div>

            {/* Justification (full width) */}
            {p.justification && (
              <div className="bg-white/80 rounded-lg border border-gray-200 p-3 mb-3">
                <div className="text-[10px] font-bold uppercase text-gray-400 mb-1">Justificativa</div>
                <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{p.justification}</div>
              </div>
            )}

            {/* Progress note */}
            {p.progress_note && (
              <div className="bg-white/80 rounded-lg border border-gray-200 p-3 mb-3">
                <div className="text-[10px] font-bold uppercase text-gray-400 mb-1">Nota de Progresso</div>
                <div className="text-xs text-gray-700 whitespace-pre-wrap">{p.progress_note}</div>
              </div>
            )}

            {/* Meta footer */}
            <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-400 pt-2 border-t border-gray-200/60">
              <span>Criado por: {p.created_by_name || p.created_by}</span>
              <span>Criado em: {fmtDate(p.created_at)}</span>
              <span>Atualizado: {fmtDate(p.updated_at)}</span>
              {p.completed_at && <span>Concluído: {fmtDate(p.completed_at)}</span>}
              {p.ai_generated && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-semibold">IA</span>}
              {p.comparison_type && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">vs {p.comparison_type === 'orcado' ? 'Orçado' : 'A-1'}</span>}
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); setEditingPlan(p); }}
                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 transition"
                >
                  <Pencil size={10} /> Editar Plano
                </button>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Delete Confirm */}
      {deleteConfirmId != null && (
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
      )}

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <h3 className="text-sm font-black uppercase tracking-tight mb-3 text-indigo-600">
                Editar Plano de Ação
              </h3>
              <ActionPlanForm
                item={{
                  id: editingPlan.id,
                  year_month: editingPlan.year_month,
                  marca: editingPlan.marca || '',
                  tag0: editingPlan.tag0 || '',
                  tag01: editingPlan.tag01 || '',
                  tag02: editingPlan.tag02 || null,
                  comparison_type: editingPlan.comparison_type as 'orcado' | 'a1',
                  real_value: editingPlan.real_value ?? 0,
                  compare_value: editingPlan.compare_value ?? 0,
                  variance_abs: editingPlan.variance_abs ?? 0,
                  variance_pct: editingPlan.variance_pct ?? null,
                  justification: editingPlan.justification,
                  status: editingPlan.status,
                }}
                initialPlan={{
                  what: editingPlan.what,
                  why: editingPlan.why,
                  how: editingPlan.how || '',
                  who_responsible: editingPlan.who_responsible,
                  who_email: editingPlan.who_email || '',
                  deadline: editingPlan.deadline,
                  expected_impact: editingPlan.expected_impact || '',
                  status: editingPlan.status,
                }}
                userName={user?.display_name || user?.email || ''}
                userEmail={user?.email || ''}
                onSave={async (data) => {
                  const updates: Record<string, unknown> = {};
                  if (data.justification) updates.justification = data.justification;
                  if (data.actionPlan) {
                    updates.what = data.actionPlan.what;
                    updates.why = data.actionPlan.why;
                    updates.how = data.actionPlan.how;
                    updates.who_responsible = data.actionPlan.who_responsible;
                    updates.who_email = data.actionPlan.who_email;
                    updates.deadline = data.actionPlan.deadline;
                    updates.expected_impact = data.actionPlan.expected_impact;
                    updates.status = data.actionPlan.status === 'Aberto' ? 'aberto'
                      : data.actionPlan.status === 'Em andamento' ? 'em_andamento'
                      : data.actionPlan.status === 'Concluído' ? 'concluido'
                      : data.actionPlan.status === 'Atrasado' ? 'atrasado'
                      : data.actionPlan.status === 'Cancelado' ? 'cancelado'
                      : data.actionPlan.status;
                  }
                  await updateActionPlan(editingPlan.id, updates as any);
                  toast.success('Plano de ação atualizado');
                  setEditingPlan(null);
                  loadPlans();
                }}
                onClose={() => setEditingPlan(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { label: 'Total', count: kpis.total, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', iconEl: <Target size={dc.kpiIcon} className="text-gray-400" /> },
          { label: 'Aberto', count: kpis.aberto, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', iconEl: <Clock size={dc.kpiIcon} className="text-amber-500" /> },
          { label: 'Em andamento', count: kpis.em_andamento, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', iconEl: <Loader2 size={dc.kpiIcon} className="text-blue-500" /> },
          { label: 'Atrasado', count: kpis.atrasado, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', iconEl: <AlertTriangle size={dc.kpiIcon} className="text-red-500" /> },
          { label: 'Concluído', count: kpis.concluido, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', iconEl: <CheckCircle2 size={dc.kpiIcon} className="text-green-500" /> },
        ] as const).map(c => (
          <div key={c.label} className={`flex items-center gap-2 ${dc.kpiPy} rounded-lg border ${c.border} ${c.bg}`}>
            {c.iconEl}
            <div>
              <div className={`${dc.kpiText} font-bold ${c.color} leading-none`}>{c.count}</div>
              <div className={`${dc.kpiLabel} text-gray-500 uppercase tracking-wide`}>{c.label}</div>
            </div>
          </div>
        ))}
        <div className={`flex items-center gap-1.5 ${dc.kpiPy} rounded-lg border border-indigo-200 bg-indigo-50 ml-auto`}>
          <div className={`${dc.kpiLabel} text-gray-500`}>Conclusão</div>
          <div className={`${dc.kpiText} font-bold text-indigo-600 leading-none`}>{kpis.completionRate}%</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Density Toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          {DENSITY_CYCLE.map(d => (
            <button key={d}
              onClick={() => { setDensity(d); try { localStorage.setItem(DENSITY_KEY, d); } catch {} }}
              className={`px-2 py-1 text-[10px] font-bold transition ${density === d ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {DENSITY_LABELS[d]}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200 shrink-0" />

        {/* Status pills */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {STATUS_OPTIONS.map(s => {
            const cfg = STATUS_CONFIG[s];
            const active = statusFilter.has(s);
            return (
              <button key={s} onClick={() => toggleStatusFilter(s)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition border ${
                  active ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-white text-gray-400 border-gray-200 opacity-40'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Buscar ação, motivo, responsável..."
            value={searchText} onChange={e => setSearchText(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {/* Sort */}
        <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
          className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        {/* Export */}
        <button onClick={exportExcel}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Download size={12} /> Excel
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          <span className="ml-2 text-xs text-gray-500">Carregando planos de ação...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Target className="w-10 h-10 mb-2 opacity-40" />
          <div className="text-xs font-medium">Nenhum plano de ação encontrado</div>
        </div>
      )}

      {/* Table */}
      {!loading && sorted.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className={`w-full ${dc.textSize}`}>
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                {['Status', 'Mês', 'Marca', 'Conta / Linha', 'O que', 'Responsável', 'Prazo', 'Real', 'Orçado', 'Desvio', ''].map((h, i) => (
                  <th key={i} className={`${dc.cellPx} ${dc.cellPy} text-left font-semibold text-gray-500 uppercase tracking-wider ${dc.kpiLabel} ${i >= 7 && i <= 9 ? 'text-right' : ''} ${i === 10 ? 'text-center w-16' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const expanded = expandedId === p.id;
                const overdue = isOverdue(p.deadline, p.status);
                const contaParts = [p.tag0, p.tag01].filter(Boolean).join(' > ');
                return (
                  <React.Fragment key={p.id}>
                    <tr onClick={() => setExpandedId(expanded ? null : p.id)}
                      className={`border-b border-gray-100 cursor-pointer transition hover:bg-indigo-50/30 ${expanded ? 'bg-indigo-50/20' : ''}`}
                    >
                      <td className={`${dc.cellPx} ${dc.cellPy}`}>{renderStatusBadge(p)}</td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-gray-500 whitespace-nowrap`}>{p.year_month}</td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-gray-700 whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={dc.iconSize} className="text-gray-400" />
                          {p.marca || '—'}
                        </span>
                      </td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-gray-600 max-w-[180px]`}>
                        <span title={contaParts}>{contaParts.length > 30 ? contaParts.slice(0, 30) + '...' : contaParts || '—'}</span>
                      </td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-gray-800 max-w-[220px] truncate font-medium`} title={p.what}>{p.what}</td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-gray-600 whitespace-nowrap`}>{p.who_responsible}</td>
                      <td className={`${dc.cellPx} ${dc.cellPy} whitespace-nowrap ${overdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                        {fmtDate(p.deadline)}
                      </td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-right whitespace-nowrap text-gray-700 font-medium`}>
                        {p.real_value != null ? fmtBRL.format(p.real_value) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-right whitespace-nowrap text-gray-500`}>
                        {p.compare_value != null ? fmtBRL.format(p.compare_value) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-right whitespace-nowrap`}>
                        {p.variance_abs != null ? (
                          <span className={`font-medium ${(p.variance_abs ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {fmtBRL.format(p.variance_abs)}
                            {p.variance_pct != null && <span className="opacity-60 ml-0.5">({p.variance_pct > 0 ? '+' : ''}{p.variance_pct.toFixed(1)}%)</span>}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`${dc.cellPx} ${dc.cellPy} text-center`}>
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={e => { e.stopPropagation(); setExpandedId(expanded ? null : p.id); }}
                            className="p-0.5 hover:bg-gray-100 rounded" title="Detalhes"
                          >
                            {expanded ? <ChevronUp size={dc.iconSize} className="text-gray-400" /> : <ChevronDown size={dc.iconSize} className="text-gray-400" />}
                          </button>
                          {isAdmin && (
                            <button onClick={e => { e.stopPropagation(); setEditingPlan(p); }}
                              className="p-0.5 hover:bg-indigo-50 rounded" title="Editar"
                            >
                              <Pencil size={dc.iconSize} className="text-indigo-400 hover:text-indigo-600" />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                              className="p-0.5 hover:bg-red-50 rounded" title="Excluir"
                            >
                              <Trash2 size={dc.iconSize} className="text-red-400 hover:text-red-600" />
                            </button>
                          )}
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

// ── Detail Card Sub-component ────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; border: string; label: string }> = {
  indigo:  { bg: 'bg-indigo-50/80',  border: 'border-indigo-200', label: 'text-indigo-500' },
  purple:  { bg: 'bg-purple-50/80',  border: 'border-purple-200', label: 'text-purple-500' },
  blue:    { bg: 'bg-blue-50/80',    border: 'border-blue-200',   label: 'text-blue-500' },
  amber:   { bg: 'bg-amber-50/80',   border: 'border-amber-200',  label: 'text-amber-600' },
  rose:    { bg: 'bg-rose-50/80',    border: 'border-rose-200',   label: 'text-rose-500' },
  emerald: { bg: 'bg-emerald-50/80', border: 'border-emerald-200', label: 'text-emerald-600' },
};

function DetailCard({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-2.5`}>
      <div className={`text-[10px] font-bold uppercase tracking-wide ${c.label} mb-1`}>{label}</div>
      <div className="text-xs text-gray-800 leading-relaxed">{children}</div>
    </div>
  );
}

export default ActionPlansConsolidatedView;
