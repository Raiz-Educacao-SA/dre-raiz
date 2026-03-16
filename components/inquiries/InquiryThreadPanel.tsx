import React, { useState, useEffect, useRef } from 'react';
import { X, Send, CheckCircle2, XCircle, RotateCcw, Clock, Zap, AlertTriangle, ChevronDown } from 'lucide-react';
import { getInquiryMessages, addMessage, approveInquiry, rejectInquiry, reopenInquiry, updateInquiryStatus, sendInquiryEmail, buildInquiryDeepLink, formatFilterContextSummary } from '../../services/inquiryService';
import type { DreInquiry, DreInquiryMessage, InquiryMessageType } from '../../types';
import { toast } from 'sonner';

interface InquiryThreadPanelProps {
  inquiry: DreInquiry;
  currentUser: { email: string; name: string };
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onRestoreFilters?: (ctx: DreInquiry['filter_context']) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pendente',   color: 'bg-amber-100 text-amber-700' },
  answered: { label: 'Respondida', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Aprovada',   color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Devolvida',  color: 'bg-red-100 text-red-700' },
  reopened: { label: 'Reaberta',   color: 'bg-purple-100 text-purple-700' },
  expired:  { label: 'Expirada',   color: 'bg-gray-100 text-gray-500' },
  closed:   { label: 'Encerrada',  color: 'bg-gray-100 text-gray-500' },
};

const MSG_TYPE_COLORS: Record<InquiryMessageType, string> = {
  question:  'bg-blue-50 border-blue-200',
  response:  'bg-emerald-50 border-emerald-200',
  counter:   'bg-amber-50 border-amber-200',
  approval:  'bg-emerald-50 border-emerald-300',
  rejection: 'bg-red-50 border-red-200',
  system:    'bg-gray-50 border-gray-200',
};

const InquiryThreadPanel: React.FC<InquiryThreadPanelProps> = ({
  inquiry, currentUser, isOpen, onClose, onUpdated, onRestoreFilters,
}) => {
  const [messages, setMessages] = useState<DreInquiryMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isRequester = inquiry.requester_email === currentUser.email;
  const isAssignee = inquiry.assignee_email === currentUser.email;

  useEffect(() => {
    if (isOpen && inquiry.id) {
      setLoading(true);
      getInquiryMessages(inquiry.id).then(msgs => {
        setMessages(msgs);
        setLoading(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
    }
  }, [isOpen, inquiry.id]);

  if (!isOpen) return null;

  const statusInfo = STATUS_LABELS[inquiry.status] || STATUS_LABELS.pending;

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);

    // Determinar tipo de mensagem
    let messageType: InquiryMessageType = 'response';
    if (isRequester) messageType = 'counter';

    const msg = await addMessage(inquiry.id, {
      author_email: currentUser.email,
      author_name: currentUser.name,
      message: newMessage.trim(),
      message_type: messageType,
    });

    if (msg) {
      setMessages(prev => [...prev, msg]);
      setNewMessage('');

      // Atualizar status
      if (isAssignee && (inquiry.status === 'pending' || inquiry.status === 'reopened' || inquiry.status === 'rejected')) {
        await updateInquiryStatus(inquiry.id, 'answered');
      }

      // Email para o outro participante
      const recipientEmail = isRequester ? inquiry.assignee_email : inquiry.requester_email;
      const recipientName = isRequester ? inquiry.assignee_name : inquiry.requester_name;
      const deepLink = buildInquiryDeepLink(inquiry.id, inquiry.filter_context);

      await sendInquiryEmail({
        type: isRequester ? 'rejection' : 'response', // reusa template
        recipientEmail,
        recipientName,
        senderName: currentUser.name,
        subject: inquiry.subject,
        question: inquiry.question,
        message: newMessage.trim(),
        filterSummary: formatFilterContextSummary(inquiry.filter_context),
        deepLink,
      });

      onUpdated();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setSending(false);
  };

  const handleApprove = async () => {
    setActionLoading('approve');
    const ok = await approveInquiry(inquiry.id, 'Análise aprovada.', currentUser.email, currentUser.name);
    if (ok) {
      toast.success('Solicitação aprovada!');
      const deepLink = buildInquiryDeepLink(inquiry.id, inquiry.filter_context);
      await sendInquiryEmail({
        type: 'approval',
        recipientEmail: inquiry.assignee_email,
        recipientName: inquiry.assignee_name,
        senderName: currentUser.name,
        subject: inquiry.subject,
        question: inquiry.question,
        filterSummary: formatFilterContextSummary(inquiry.filter_context),
        deepLink,
      });
      onUpdated();
      onClose();
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!newMessage.trim()) { toast.error('Escreva o motivo da devolução'); return; }
    setActionLoading('reject');
    const ok = await rejectInquiry(inquiry.id, newMessage.trim(), currentUser.email, currentUser.name);
    if (ok) {
      toast.success('Solicitação devolvida');
      const deepLink = buildInquiryDeepLink(inquiry.id, inquiry.filter_context);
      await sendInquiryEmail({
        type: 'rejection',
        recipientEmail: inquiry.assignee_email,
        recipientName: inquiry.assignee_name,
        senderName: currentUser.name,
        subject: inquiry.subject,
        question: inquiry.question,
        message: newMessage.trim(),
        filterSummary: formatFilterContextSummary(inquiry.filter_context),
        deepLink,
      });
      setNewMessage('');
      onUpdated();
    }
    setActionLoading(null);
  };

  const handleReopen = async () => {
    if (!newMessage.trim()) { toast.error('Escreva sua réplica'); return; }
    setActionLoading('reopen');
    const ok = await reopenInquiry(inquiry.id, newMessage.trim(), currentUser.email, currentUser.name);
    if (ok) {
      toast.success('Réplica enviada');
      const deepLink = buildInquiryDeepLink(inquiry.id, inquiry.filter_context);
      await sendInquiryEmail({
        type: 'rejection',
        recipientEmail: inquiry.assignee_email,
        recipientName: inquiry.assignee_name,
        senderName: currentUser.name,
        subject: inquiry.subject,
        question: inquiry.question,
        message: newMessage.trim(),
        filterSummary: formatFilterContextSummary(inquiry.filter_context),
        deepLink,
      });
      setNewMessage('');
      onUpdated();
    }
    setActionLoading(null);
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Quem pode agir
  const canRespond = isAssignee && ['pending', 'reopened', 'rejected'].includes(inquiry.status);
  const canApprove = isRequester && inquiry.status === 'answered';
  const canReply = isRequester && ['answered'].includes(inquiry.status);
  const isClosed = ['approved', 'closed', 'expired'].includes(inquiry.status);
  const canChat = (isRequester || isAssignee) && !isClosed;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end bg-black/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B75BB] to-[#152e55] p-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                {inquiry.priority === 'urgent' && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-0.5">
                    <Zap size={8} /> Urgente
                  </span>
                )}
              </div>
              <h3 className="text-white font-bold text-sm truncate">{inquiry.subject}</h3>
              <p className="text-white/50 text-[10px] mt-0.5">
                {inquiry.requester_name} → {inquiry.assignee_name} • {formatDate(inquiry.created_at)}
              </p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-2">
              <X size={18} />
            </button>
          </div>
          {/* Filtros */}
          <div className="mt-2 bg-white/10 rounded-lg px-3 py-1.5 flex items-center justify-between">
            <p className="text-[10px] text-white/70 truncate flex-1">{formatFilterContextSummary(inquiry.filter_context)}</p>
            {onRestoreFilters && (
              <button
                onClick={() => { onRestoreFilters(inquiry.filter_context); onClose(); }}
                className="text-[10px] bg-white/20 hover:bg-white/40 text-white font-black ml-2 shrink-0 px-3 py-1.5 rounded-lg border border-white/30 transition-all uppercase tracking-wider"
              >
                Aplicar filtros
              </button>
            )}
          </div>
          {/* SLA */}
          {inquiry.sla_deadline_at && !isClosed && (
            <div className={`mt-2 flex items-center gap-1 text-[9px] ${
              inquiry.sla_breached ? 'text-red-300' :
              new Date(inquiry.sla_deadline_at) < new Date(Date.now() + 6 * 3600000) ? 'text-amber-300' : 'text-white/50'
            }`}>
              <Clock size={10} />
              {inquiry.sla_breached ? 'Prazo expirado' : `Prazo: ${formatDate(inquiry.sla_deadline_at)}`}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : messages.map(msg => {
            const isMe = msg.author_email === currentUser.email;
            const typeColor = MSG_TYPE_COLORS[msg.message_type] || MSG_TYPE_COLORS.system;
            const isSystem = msg.message_type === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center">
                  <span className="text-[9px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full inline-block">{msg.message}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] border rounded-xl px-3 py-2.5 ${typeColor}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 bg-white/60 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-600">
                      {msg.author_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[9px] font-bold text-gray-700">{msg.author_name}</span>
                    <span className="text-[8px] text-gray-400">{formatDate(msg.created_at)}</span>
                  </div>
                  <p className="text-[12px] text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input + Actions */}
        {!isClosed && (
          <div className="border-t border-gray-200 p-3 bg-white shrink-0">
            {/* Action buttons */}
            {canApprove && (
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all"
                >
                  <CheckCircle2 size={13} /> Aprovar
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!actionLoading || !newMessage.trim()}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-all"
                  title="Escreva o motivo abaixo antes de devolver"
                >
                  <XCircle size={13} /> Devolver
                </button>
              </div>
            )}
            {canReply && !canApprove && (
              <button
                onClick={handleReopen}
                disabled={!!actionLoading || !newMessage.trim()}
                className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 disabled:opacity-50 transition-all mb-2"
              >
                <RotateCcw size={13} /> Enviar Réplica
              </button>
            )}

            {/* Text input */}
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={
                  canRespond ? 'Escreva sua análise/resposta...' :
                  canApprove ? 'Motivo (obrigatório para devolver, opcional para aprovar)...' :
                  canReply ? 'Escreva sua réplica...' :
                  'Escreva uma mensagem...'
                }
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none"
                rows={2}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && canChat) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              {canChat && (
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="px-3 rounded-lg bg-gradient-to-r from-[#1B75BB] to-[#152e55] text-white disabled:opacity-40 hover:shadow-lg transition-all"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Closed message */}
        {isClosed && (
          <div className="border-t border-gray-200 p-3 bg-gray-50 text-center">
            <p className="text-[10px] text-gray-400 font-semibold">Esta solicitação foi {statusInfo.label.toLowerCase()}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InquiryThreadPanel;
