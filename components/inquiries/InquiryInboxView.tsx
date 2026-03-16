import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Inbox, Send, Search, Filter, Clock, Zap, AlertTriangle,
  CheckCircle2, XCircle, RotateCcw, MessageCircleQuestion,
  Loader2, ChevronDown, ArrowUpDown, ArrowDown, ArrowUp,
  Pencil, Trash2, Save, X
} from 'lucide-react';
import { getMyInquiries, getPendingInquiryCount, getAnsweredInquiryCount, subscribeInquiries, deleteInquiry, updateInquiry, getSystemUsers, getAllInquiries } from '../../services/inquiryService';
import type { DreInquiry, DreInquiryFilterContext, InquiryStatus } from '../../types';
import InquiryThreadPanel from './InquiryThreadPanel';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

type TabMode = 'recebidas' | 'enviadas' | 'todas';
type SortField = 'created_at' | 'status' | 'priority' | 'subject' | 'sla_deadline_at';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; order: number }> = {
  pending:  { label: 'Pendente',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400', order: 1 },
  reopened: { label: 'Reaberta',   color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200',  dot: 'bg-purple-400', order: 2 },
  rejected: { label: 'Devolvida',  color: 'text-red-700',     bg: 'bg-red-50 border-red-200',        dot: 'bg-red-400', order: 3 },
  answered: { label: 'Respondida', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',      dot: 'bg-blue-400', order: 4 },
  approved: { label: 'Aprovada',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400', order: 5 },
  expired:  { label: 'Expirada',   color: 'text-gray-500',    bg: 'bg-gray-50 border-gray-200',      dot: 'bg-gray-400', order: 6 },
  closed:   { label: 'Encerrada',  color: 'text-gray-500',    bg: 'bg-gray-50 border-gray-200',      dot: 'bg-gray-400', order: 7 },
};

const ALL_STATUSES: InquiryStatus[] = ['pending', 'answered', 'approved', 'rejected', 'reopened', 'expired', 'closed'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', answered: 'Respondida', approved: 'Aprovada',
  rejected: 'Devolvida', reopened: 'Reaberta', expired: 'Expirada', closed: 'Encerrada',
};

const InquiryInboxView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const currentUser = useMemo(() => ({
    email: user?.email || '',
    name: user?.name || '',
  }), [user]);

  const [allInquiries, setAllInquiries] = useState<DreInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabMode>('recebidas');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedInquiry, setSelectedInquiry] = useState<DreInquiry | null>(null);

  // Admin edit/delete state
  const [editingInquiry, setEditingInquiry] = useState<DreInquiry | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editStatus, setEditStatus] = useState<InquiryStatus>('pending');
  const [editPriority, setEditPriority] = useState<'normal' | 'urgent'>('normal');
  const [editAssigneeEmail, setEditAssigneeEmail] = useState('');
  const [editAssigneeName, setEditAssigneeName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [systemUsers, setSystemUsers] = useState<Array<{ id: string; email: string; name: string; role: string }>>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser.email) return;
    setLoading(true);
    // Admin vê todas, usuário normal vê só as suas
    const data = isAdmin
      ? await getAllInquiries()
      : await getMyInquiries(currentUser.email);
    setAllInquiries(data);
    setLoading(false);
  }, [currentUser.email, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime
  useEffect(() => {
    if (!currentUser.email) return;
    const unsub = subscribeInquiries(currentUser.email, loadData);
    return unsub;
  }, [currentUser.email, loadData]);

  // Separar recebidas / enviadas
  const recebidas = useMemo(() =>
    allInquiries.filter(i => i.assignee_email === currentUser.email),
    [allInquiries, currentUser.email]
  );
  const enviadas = useMemo(() =>
    allInquiries.filter(i => i.requester_email === currentUser.email),
    [allInquiries, currentUser.email]
  );

  const baseList = tab === 'todas' ? allInquiries : tab === 'recebidas' ? recebidas : enviadas;

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    baseList.forEach(i => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return counts;
  }, [baseList]);

  // Filtrar e buscar
  const filteredList = useMemo(() => {
    let list = baseList;
    if (filterStatus) {
      list = list.filter(i => i.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.subject.toLowerCase().includes(q) ||
        i.question.toLowerCase().includes(q) ||
        i.requester_name.toLowerCase().includes(q) ||
        i.assignee_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [baseList, filterStatus, searchQuery]);

  // Ordenar
  const sortedList = useMemo(() => {
    const sorted = [...filteredList].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          cmp = (STATUS_CONFIG[a.status]?.order || 99) - (STATUS_CONFIG[b.status]?.order || 99);
          break;
        case 'priority':
          cmp = (a.priority === 'urgent' ? 0 : 1) - (b.priority === 'urgent' ? 0 : 1);
          break;
        case 'subject':
          cmp = a.subject.localeCompare(b.subject, 'pt-BR');
          break;
        case 'sla_deadline_at':
          cmp = (a.sla_deadline_at ? new Date(a.sla_deadline_at).getTime() : Infinity) -
                (b.sla_deadline_at ? new Date(b.sla_deadline_at).getTime() : Infinity);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredList, sortField, sortDir]);

  // Contadores para badges das abas
  const recebidasActionCount = recebidas.filter(i => ['pending', 'reopened', 'rejected'].includes(i.status)).length;
  const enviadasActionCount = enviadas.filter(i => i.status === 'answered').length;

  // ── Admin: Edit / Delete handlers ──
  const openEdit = async (e: React.MouseEvent, inq: DreInquiry) => {
    e.stopPropagation();
    setEditingInquiry(inq);
    setEditSubject(inq.subject);
    setEditStatus(inq.status);
    setEditPriority(inq.priority);
    setEditAssigneeEmail(inq.assignee_email);
    setEditAssigneeName(inq.assignee_name);
    if (systemUsers.length === 0) {
      const users = await getSystemUsers();
      setSystemUsers(users);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingInquiry) return;
    setSavingEdit(true);
    const updates: Record<string, unknown> = {};
    if (editSubject !== editingInquiry.subject) updates.subject = editSubject;
    if (editStatus !== editingInquiry.status) updates.status = editStatus;
    if (editPriority !== editingInquiry.priority) updates.priority = editPriority;
    if (editAssigneeEmail !== editingInquiry.assignee_email) {
      updates.assignee_email = editAssigneeEmail;
      updates.assignee_name = editAssigneeName;
      updates.original_assignee_email = editingInquiry.original_assignee_email || editingInquiry.assignee_email;
      updates.reassigned_by = currentUser.email;
      updates.reassigned_at = new Date().toISOString();
    }
    if (Object.keys(updates).length === 0) {
      toast.info('Nenhuma alteração detectada');
      setSavingEdit(false);
      return;
    }
    const ok = await updateInquiry(editingInquiry.id, updates as any);
    if (ok) {
      toast.success('Solicitação atualizada');
      setEditingInquiry(null);
      loadData();
    } else {
      toast.error('Erro ao atualizar');
    }
    setSavingEdit(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeletingId(id);
    const ok = await deleteInquiry(id);
    if (ok) {
      toast.success('Solicitação excluída');
      setConfirmDeleteId(null);
      loadData();
    } else {
      toast.error('Erro ao excluir');
    }
    setDeletingId(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={9} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ArrowUp size={9} className="text-[#1B75BB]" />
      : <ArrowDown size={9} className="text-[#1B75BB]" />;
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min`;
    const diffH = Math.round(diffMs / 3600000);
    if (diffH < 24) return `${diffH}h atrás`;
    const diffD = Math.round(diffMs / 86400000);
    if (diffD < 7) return `${diffD}d atrás`;
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatSla = (inq: DreInquiry) => {
    if (!inq.sla_deadline_at) return null;
    if (['approved', 'closed', 'expired'].includes(inq.status)) return { label: '✓', cls: 'text-gray-400' };
    if (inq.sla_breached) return { label: 'Expirado', cls: 'text-red-600 font-bold' };
    const remaining = new Date(inq.sla_deadline_at).getTime() - Date.now();
    const hoursLeft = Math.round(remaining / 3600000);
    if (hoursLeft < 0) return { label: 'Expirado', cls: 'text-red-600 font-bold' };
    if (hoursLeft < 6) return { label: `${hoursLeft}h`, cls: 'text-amber-600 font-bold' };
    if (hoursLeft < 24) return { label: `${hoursLeft}h`, cls: 'text-gray-600' };
    const daysLeft = Math.round(hoursLeft / 24);
    return { label: `${daysLeft}d`, cls: 'text-gray-400' };
  };

  const isClosed = (s: string) => ['approved', 'closed', 'expired'].includes(s);

  const handleUpdated = () => {
    loadData();
  };

  const activeStatuses = ['pending', 'reopened', 'rejected', 'answered'];
  const closedStatuses = ['approved', 'expired', 'closed'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1B75BB] to-[#152e55] shadow-lg">
            <MessageCircleQuestion size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Minhas Solicitações</h1>
            <p className="text-[10px] text-gray-500">Gerencie suas solicitações de análise</p>
          </div>
        </div>
      </div>

      {/* Tabs Recebidas / Enviadas */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setTab('recebidas'); setFilterStatus(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            tab === 'recebidas'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
          }`}
        >
          <Inbox size={14} />
          Recebidas
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            tab === 'recebidas' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {recebidas.length}
          </span>
          {recebidasActionCount > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse ${
              tab === 'recebidas' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
            }`}>
              {recebidasActionCount} ação
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('enviadas'); setFilterStatus(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            tab === 'enviadas'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
          }`}
        >
          <Send size={14} />
          Enviadas
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            tab === 'enviadas' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {enviadas.length}
          </span>
          {enviadasActionCount > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse ${
              tab === 'enviadas' ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'
            }`}>
              {enviadasActionCount} respondida{enviadasActionCount > 1 ? 's' : ''}
            </span>
          )}
        </button>
        {isAdmin && (
          <button
            onClick={() => { setTab('todas'); setFilterStatus(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'todas'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50'
            }`}
          >
            <Search size={14} />
            Todas
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              tab === 'todas' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {allInquiries.length}
            </span>
          </button>
        )}
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por assunto, pergunta ou participante..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </div>
          {/* Status pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setFilterStatus('')}
              className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                !filterStatus ? 'bg-[#1B75BB] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Todas ({baseList.length})
            </button>
            {activeStatuses.map(s => {
              const cfg = STATUS_CONFIG[s];
              const count = statusCounts[s] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                  className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    filterStatus === s ? `${cfg.bg} ${cfg.color} border` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label} ({count})
                </button>
              );
            })}
            {closedStatuses.map(s => {
              const cfg = STATUS_CONFIG[s];
              const count = statusCounts[s] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                  className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    filterStatus === s ? `${cfg.bg} ${cfg.color} border` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : sortedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <MessageCircleQuestion size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-400 font-bold">
              {searchQuery ? 'Nenhum resultado para a busca.' :
               filterStatus ? 'Nenhuma solicitação com este status.' :
               tab === 'recebidas' ? 'Nenhuma solicitação recebida.' :
               'Nenhuma solicitação enviada.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-8 px-2 py-2.5" />
                  <th
                    onClick={() => handleSort('status')}
                    className="px-3 py-2.5 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Status <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('subject')}
                    className="px-3 py-2.5 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Assunto <SortIcon field="subject" />
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      {tab === 'recebidas' ? 'Solicitante' : 'Responsável'}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('created_at')}
                    className="px-3 py-2.5 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Quando <SortIcon field="created_at" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('sla_deadline_at')}
                    className="px-3 py-2.5 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      SLA <SortIcon field="sla_deadline_at" />
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ação</span>
                  </th>
                  {isAdmin && (
                    <th className="px-3 py-2.5 text-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Admin</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedList.map(inq => {
                  const cfg = STATUS_CONFIG[inq.status] || STATUS_CONFIG.pending;
                  const closed = isClosed(inq.status);
                  const isMyTurn = (tab === 'recebidas' && ['pending', 'reopened', 'rejected'].includes(inq.status)) ||
                                   (tab === 'enviadas' && inq.status === 'answered');
                  const sla = formatSla(inq);
                  const otherPerson = tab === 'recebidas' ? inq.requester_name : inq.assignee_name;

                  return (
                    <tr
                      key={inq.id}
                      onClick={() => setSelectedInquiry(inq)}
                      className={`border-b border-gray-50 cursor-pointer transition-all ${
                        closed ? 'opacity-50 hover:opacity-75' :
                        isMyTurn ? 'bg-amber-50/40 hover:bg-amber-50' :
                        'hover:bg-blue-50/30'
                      }`}
                    >
                      {/* Priority */}
                      <td className="px-2 py-2.5 text-center">
                        {inq.priority === 'urgent' && (
                          <Zap size={12} className="text-red-500 mx-auto" />
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      {/* Subject + preview */}
                      <td className="px-3 py-2.5 max-w-[300px]">
                        <p className={`text-xs font-bold truncate ${closed ? 'text-gray-500' : 'text-gray-800'}`}>
                          {inq.subject}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{inq.question}</p>
                      </td>
                      {/* Person */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-700 shrink-0">
                            {otherPerson.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] text-gray-600 truncate max-w-[120px]">{otherPerson}</span>
                        </div>
                      </td>
                      {/* Date */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] text-gray-400">{formatDate(inq.created_at)}</span>
                      </td>
                      {/* SLA */}
                      <td className="px-3 py-2.5">
                        {sla ? (
                          <span className={`text-[10px] flex items-center gap-0.5 ${sla.cls}`}>
                            {inq.sla_breached ? <AlertTriangle size={9} /> : <Clock size={9} />}
                            {sla.label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>
                      {/* Action hint */}
                      <td className="px-3 py-2.5 text-center">
                        {isMyTurn && (
                          <span className={`text-[8px] font-black text-white px-2 py-1 rounded-full ${
                            tab === 'enviadas' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                          }`}>
                            {tab === 'recebidas' ? 'Responder' : 'Revisar'}
                          </span>
                        )}
                      </td>
                      {/* Admin actions */}
                      {isAdmin && (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            {confirmDeleteId === inq.id ? (
                              <>
                                <button
                                  onClick={(e) => handleDelete(e, inq.id)}
                                  disabled={deletingId === inq.id}
                                  className="text-[8px] font-bold px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all"
                                >
                                  {deletingId === inq.id ? <Loader2 size={10} className="animate-spin" /> : 'Sim'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                  className="text-[8px] font-bold px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
                                >
                                  Não
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => openEdit(e, inq)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#1B75BB] transition-all"
                                  title="Editar"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(inq.id); }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && sortedList.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              {sortedList.length} solicitação{sortedList.length !== 1 ? 'ões' : ''}{filterStatus || searchQuery ? ' (filtrado)' : ''}
            </span>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              {recebidasActionCount > 0 && tab === 'recebidas' && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {recebidasActionCount} para responder
                </span>
              )}
              {enviadasActionCount > 0 && tab === 'enviadas' && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {enviadasActionCount} respondida{enviadasActionCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Thread Panel */}
      {selectedInquiry && (
        <InquiryThreadPanel
          inquiry={selectedInquiry}
          currentUser={currentUser}
          isOpen={!!selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Admin Edit Modal */}
      {isAdmin && editingInquiry && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B75BB] to-[#152e55] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm">Editar Solicitação #{editingInquiry.id}</h3>
              </div>
              <button onClick={() => setEditingInquiry(null)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Assunto</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
                <div className="flex flex-wrap gap-1">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all ${
                        editStatus === s
                          ? `${STATUS_CONFIG[s]?.bg || 'bg-gray-100'} ${STATUS_CONFIG[s]?.color || 'text-gray-500'} ring-2 ring-offset-1 ring-blue-300 border`
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Prioridade</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditPriority('normal')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                      editPriority === 'normal' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-gray-100 text-gray-400'
                    }`}
                  >Normal</button>
                  <button
                    onClick={() => setEditPriority('urgent')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      editPriority === 'urgent' ? 'bg-red-100 text-red-700 ring-2 ring-red-300' : 'bg-gray-100 text-gray-400'
                    }`}
                  ><Zap size={10} /> Urgente</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Responsável</label>
                <select
                  value={editAssigneeEmail}
                  onChange={e => {
                    const u = systemUsers.find(u => u.email === e.target.value);
                    if (u) { setEditAssigneeEmail(u.email); setEditAssigneeName(u.name); }
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                >
                  {!systemUsers.find(u => u.email === editAssigneeEmail) && (
                    <option value={editAssigneeEmail}>{editAssigneeName} ({editAssigneeEmail})</option>
                  )}
                  {systemUsers.map(u => (
                    <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-[10px] text-gray-400 space-y-1">
                <p><strong>Solicitante:</strong> {editingInquiry.requester_name} ({editingInquiry.requester_email})</p>
                <p><strong>Criação:</strong> {new Date(editingInquiry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <div className="border-t border-gray-100 p-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingInquiry(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
              >Cancelar</button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#1B75BB] hover:bg-[#155a90] disabled:opacity-50 transition-all flex items-center gap-1"
              >
                {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryInboxView;
