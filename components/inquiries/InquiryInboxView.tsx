import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Inbox, Send, Search, Filter, Clock, Zap, AlertTriangle,
  CheckCircle2, XCircle, RotateCcw, MessageCircleQuestion,
  Loader2, ChevronDown, ArrowUpDown, ArrowDown, ArrowUp
} from 'lucide-react';
import { getMyInquiries, getPendingInquiryCount, getAnsweredInquiryCount, subscribeInquiries } from '../../services/inquiryService';
import type { DreInquiry, DreInquiryFilterContext } from '../../types';
import InquiryThreadPanel from './InquiryThreadPanel';
import { useAuth } from '../../contexts/AuthContext';

type TabMode = 'recebidas' | 'enviadas';
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

const InquiryInboxView: React.FC = () => {
  const { user } = useAuth();
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

  const loadData = useCallback(async () => {
    if (!currentUser.email) return;
    setLoading(true);
    const data = await getMyInquiries(currentUser.email);
    setAllInquiries(data);
    setLoading(false);
  }, [currentUser.email]);

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

  const baseList = tab === 'recebidas' ? recebidas : enviadas;

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
    </div>
  );
};

export default InquiryInboxView;
