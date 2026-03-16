import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircleQuestion, ChevronDown, ChevronRight, PlusCircle, Clock, Zap, User, Loader2, Inbox, Send as SendIcon } from 'lucide-react';
import { getInquiriesByFilterHash, getMyInquiries, getPendingInquiryCount, getAnsweredInquiryCount } from '../../services/inquiryService';
import type { DreInquiry, DreInquiryFilterContext, InquiryStatus } from '../../types';
import InquiryCreateModal from './InquiryCreateModal';
import InquiryThreadPanel from './InquiryThreadPanel';

interface InquiryListPanelProps {
  filterHash: string;
  filterContext: DreInquiryFilterContext;
  filterContextLabel: string;
  dreSnapshot?: Record<string, number> | null;
  currentUser: { email: string; name: string };
  onRestoreFilters?: (ctx: DreInquiryFilterContext) => void;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  pending:  { label: 'Pendente',   dot: 'bg-amber-400' },
  answered: { label: 'Respondida', dot: 'bg-blue-400' },
  approved: { label: 'Aprovada',   dot: 'bg-emerald-400' },
  rejected: { label: 'Devolvida',  dot: 'bg-red-400' },
  reopened: { label: 'Reaberta',   dot: 'bg-purple-400' },
  expired:  { label: 'Expirada',   dot: 'bg-gray-400' },
  closed:   { label: 'Encerrada',  dot: 'bg-gray-400' },
};

type ViewMode = 'contexto' | 'recebidas' | 'enviadas';

const InquiryListPanel: React.FC<InquiryListPanelProps> = ({
  filterHash, filterContext, filterContextLabel, dreSnapshot, currentUser, onRestoreFilters,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('contexto');
  const [contextInquiries, setContextInquiries] = useState<DreInquiry[]>([]);
  const [allInquiries, setAllInquiries] = useState<DreInquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<DreInquiry | null>(null);
  const [myPendingCount, setMyPendingCount] = useState(0);
  const [myAnsweredCount, setMyAnsweredCount] = useState(0);

  const loadContextInquiries = useCallback(async () => {
    if (!filterHash) return;
    const data = await getInquiriesByFilterHash(filterHash);
    setContextInquiries(data);
  }, [filterHash]);

  const loadAllInquiries = useCallback(async () => {
    setLoading(true);
    const data = await getMyInquiries(currentUser.email);
    setAllInquiries(data);
    setLoading(false);
  }, [currentUser.email]);

  const refreshCounts = useCallback(() => {
    getPendingInquiryCount(currentUser.email).then(setMyPendingCount).catch(() => {});
    getAnsweredInquiryCount(currentUser.email).then(setMyAnsweredCount).catch(() => {});
  }, [currentUser.email]);

  useEffect(() => {
    loadContextInquiries();
    refreshCounts();
  }, [loadContextInquiries, refreshCounts]);

  const handleCreated = () => {
    loadContextInquiries();
    if (viewMode !== 'contexto') loadAllInquiries();
    refreshCounts();
  };

  const handleUpdated = () => {
    loadContextInquiries();
    if (viewMode !== 'contexto') loadAllInquiries();
    refreshCounts();
    if (selectedInquiry) {
      // Refresh the selected inquiry from the reloaded list
      setTimeout(() => {
        const list = viewMode === 'contexto' ? contextInquiries : allInquiries;
        const updated = list.find(i => i.id === selectedInquiry.id);
        if (updated) setSelectedInquiry({ ...updated });
      }, 300);
    }
  };

  // Filtrar listas por papel do usuário
  const recebidas = useMemo(() =>
    allInquiries.filter(i => i.assignee_email === currentUser.email),
    [allInquiries, currentUser.email]
  );
  const enviadas = useMemo(() =>
    allInquiries.filter(i => i.requester_email === currentUser.email),
    [allInquiries, currentUser.email]
  );

  const recebidasPending = recebidas.filter(i => ['pending', 'reopened', 'rejected'].includes(i.status)).length;
  const enviadasAnswered = enviadas.filter(i => i.status === 'answered').length;

  const isClosed = (s: string) => ['approved', 'closed', 'expired'].includes(s);

  // Ativas primeiro, finalizadas depois
  const sortByActive = (list: DreInquiry[]) => {
    const ativas = list.filter(i => !isClosed(i.status));
    const finalizadas = list.filter(i => isClosed(i.status));
    return { ativas, finalizadas };
  };

  const rawList = viewMode === 'contexto' ? contextInquiries :
                  viewMode === 'recebidas' ? recebidas : enviadas;
  const { ativas: displayAtivas, finalizadas: displayFinalizadas } = sortByActive(rawList);

  const pendingCount = contextInquiries.filter(i => ['pending', 'reopened'].includes(i.status)).length;

  const formatDate = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    const diffH = Math.round((now.getTime() - dt.getTime()) / 3600000);
    if (diffH < 1) return 'Agora';
    if (diffH < 24) return `${diffH}h atrás`;
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const renderInquiryCard = (inq: DreInquiry, faded = false) => {
    const cfg = STATUS_CONFIG[inq.status] || STATUS_CONFIG.pending;
    const isMyTurn = (inq.assignee_email === currentUser.email && ['pending', 'reopened', 'rejected'].includes(inq.status)) ||
                     (inq.requester_email === currentUser.email && inq.status === 'answered');
    const roleLabel = inq.assignee_email === currentUser.email ? 'Você responde' : 'Você solicitou';
    return (
      <button
        key={inq.id}
        onClick={() => setSelectedInquiry(inq)}
        className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${
          faded ? 'border-gray-100 bg-gray-50/50 opacity-60' :
          isMyTurn ? 'border-amber-300 bg-amber-50/50' : 'border-gray-100 hover:border-gray-200'
        }`}
      >
        <div className="flex items-start gap-2">
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold truncate ${faded ? 'text-gray-500' : 'text-gray-800'}`}>{inq.subject}</span>
              {inq.priority === 'urgent' && <Zap size={10} className="text-red-500 shrink-0" />}
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{inq.question}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] text-gray-400">
                {inq.requester_name} → {inq.assignee_name}
              </span>
              <span className="text-[8px] text-gray-300">•</span>
              <span className="text-[8px] text-gray-400">{formatDate(inq.created_at)}</span>
              <span className="text-[8px] text-gray-300">•</span>
              <span className={`text-[8px] font-bold ${cfg.dot.replace('bg-', 'text-')}`}>{cfg.label}</span>
              {viewMode === 'contexto' && (
                <>
                  <span className="text-[8px] text-gray-300">•</span>
                  <span className="text-[7px] text-gray-400 italic">{roleLabel}</span>
                </>
              )}
            </div>
          </div>
          {isMyTurn && (
            <span className={`text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full shrink-0 ${
              inq.requester_email === currentUser.email ? 'bg-emerald-500' : 'bg-amber-400'
            }`}>
              {inq.requester_email === currentUser.email ? 'Respondida' : 'Sua vez'}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="mt-4 border border-gray-200 rounded-xl bg-white shadow-sm">
        {/* Header */}
        <div
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded && viewMode !== 'contexto' && allInquiries.length === 0) loadAllInquiries();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-xl cursor-pointer"
        >
          {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          <MessageCircleQuestion size={16} className="text-[#1B75BB]" />
          <span className="text-sm font-bold text-gray-800">Solicitações de Análise</span>
          {contextInquiries.length > 0 && (
            <span className="text-[9px] font-bold bg-[#1B75BB] text-white px-2 py-0.5 rounded-full">
              {contextInquiries.length}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-[9px] font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full animate-pulse">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={e => { e.stopPropagation(); setShowCreateModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#1B75BB] to-[#152e55] text-white text-[10px] font-bold hover:shadow-lg transition-all"
          >
            <PlusCircle size={12} /> Solicitar Análise
          </button>
        </div>

        {/* Body */}
        {isExpanded && (
          <div className="border-t border-gray-100 px-4 py-3">
            {/* Tabs: Contexto / Recebidas / Enviadas */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                onClick={() => setViewMode('contexto')}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all ${
                  viewMode === 'contexto' ? 'bg-[#1B75BB] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                Este contexto ({contextInquiries.length})
              </button>
              <button
                onClick={() => { setViewMode('recebidas'); if (allInquiries.length === 0) loadAllInquiries(); }}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                  viewMode === 'recebidas' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Inbox size={10} />
                Para responder
                {recebidasPending > 0 && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center animate-pulse ${
                    viewMode === 'recebidas' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
                  }`}>
                    {recebidasPending}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setViewMode('enviadas'); if (allInquiries.length === 0) loadAllInquiries(); }}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                  viewMode === 'enviadas' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <SendIcon size={10} />
                Aguardando resposta
                {enviadasAnswered > 0 && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center animate-pulse ${
                    viewMode === 'enviadas' ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'
                  }`}>
                    {enviadasAnswered}
                  </span>
                )}
              </button>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : (displayAtivas.length === 0 && displayFinalizadas.length === 0) ? (
              <div className="text-center py-6">
                <MessageCircleQuestion size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">
                  {viewMode === 'contexto' ? 'Nenhuma solicitação para este contexto.' :
                   viewMode === 'recebidas' ? 'Nenhuma solicitação para responder.' :
                   'Nenhuma solicitação aguardando resposta.'}
                </p>
                {viewMode === 'contexto' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-2 text-[10px] text-[#1B75BB] font-bold hover:underline"
                  >
                    Criar primeira solicitação
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {/* Ativas */}
                {displayAtivas.map(inq => renderInquiryCard(inq))}

                {/* Divisor finalizadas */}
                {displayFinalizadas.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                      Finalizadas ({displayFinalizadas.length})
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                {displayFinalizadas.map(inq => renderInquiryCard(inq, true))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <InquiryCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        filterHash={filterHash}
        filterContext={filterContext}
        filterContextLabel={filterContextLabel}
        dreSnapshot={dreSnapshot}
        currentUser={currentUser}
        onCreated={handleCreated}
      />

      {/* Thread Panel */}
      {selectedInquiry && (
        <InquiryThreadPanel
          inquiry={selectedInquiry}
          currentUser={currentUser}
          isOpen={!!selectedInquiry}
          onClose={() => { setSelectedInquiry(null); refreshCounts(); }}
          onUpdated={handleUpdated}
          onRestoreFilters={onRestoreFilters}
        />
      )}
    </>
  );
};

export default InquiryListPanel;
