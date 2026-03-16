import React, { useState, useEffect, useRef } from 'react';
import { X, Send, AlertTriangle, Search, User, Zap } from 'lucide-react';
import { getSystemUsers, createInquiry, sendInquiryEmail, buildInquiryDeepLink, formatFilterContextSummary } from '../../services/inquiryService';
import type { DreInquiryFilterContext } from '../../types';
import { toast } from 'sonner';

interface InquiryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterHash: string;
  filterContext: DreInquiryFilterContext;
  filterContextLabel: string;
  dreSnapshot?: Record<string, number> | null;
  currentUser: { email: string; name: string };
  onCreated: () => void;
}

const InquiryCreateModal: React.FC<InquiryCreateModalProps> = ({
  isOpen, onClose, filterHash, filterContext, filterContextLabel,
  dreSnapshot, currentUser, onCreated,
}) => {
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string; role: string }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      getSystemUsers().then(setUsers);
      setSubject('');
      setQuestion('');
      setPriority('normal');
      setAssigneeEmail('');
      setAssigneeName('');
      setUserSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!isOpen) return null;

  const filteredUsers = users.filter(u =>
    u.email !== currentUser.email &&
    (u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const selectUser = (u: { email: string; name: string }) => {
    setAssigneeEmail(u.email);
    setAssigneeName(u.name);
    setUserSearch(u.name);
    setShowUserDropdown(false);
  };

  const handleSubmit = async () => {
    if (!subject.trim()) { toast.error('Preencha o assunto'); return; }
    if (!question.trim()) { toast.error('Descreva sua dúvida'); return; }
    if (!assigneeEmail) { toast.error('Selecione o responsável'); return; }

    setSubmitting(true);
    try {
      const inquiry = await createInquiry({
        subject: subject.trim(),
        question: question.trim(),
        priority,
        requester_email: currentUser.email,
        requester_name: currentUser.name,
        assignee_email: assigneeEmail,
        assignee_name: assigneeName,
        filter_hash: filterHash,
        filter_context: filterContext,
        dre_snapshot: dreSnapshot || null,
      });

      if (!inquiry) {
        toast.error('Erro ao criar solicitação');
        setSubmitting(false);
        return;
      }

      // Enviar email
      const deepLink = buildInquiryDeepLink(inquiry.id, filterContext);
      await sendInquiryEmail({
        type: 'new_request',
        recipientEmail: assigneeEmail,
        recipientName: assigneeName,
        senderName: currentUser.name,
        subject: subject.trim(),
        question: question.trim(),
        priority,
        filterSummary: formatFilterContextSummary(filterContext),
        deepLink,
        dreSnapshot,
      });

      toast.success('Solicitação enviada com sucesso!');
      onCreated();
      onClose();
    } catch (err) {
      console.error('Erro ao criar solicitação:', err);
      toast.error('Erro ao criar solicitação');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B75BB] to-[#152e55] p-5 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">Solicitar Análise</h2>
            <p className="text-white/60 text-[10px] mt-0.5">Envie uma dúvida sobre os dados para um responsável</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Filtros aplicados */}
        <div className="px-5 pt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contexto DRE (filtros atuais)</p>
            <p className="text-[11px] text-slate-600">{filterContextLabel}</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Assunto */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Assunto</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ex: Receita abaixo do esperado em Março"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
              maxLength={200}
            />
          </div>

          {/* Dúvida */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Dúvida / Observação</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Descreva o que você encontrou de estranho ou que precisa de explicação..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none"
              rows={4}
            />
          </div>

          {/* Responsável */}
          <div ref={dropdownRef} className="relative">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Responsável</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); setAssigneeEmail(''); }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Buscar usuário por nome ou email..."
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
              />
              {assigneeEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    Selecionado
                  </span>
                </div>
              )}
            </div>
            {showUserDropdown && filteredUsers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-700">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{u.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prioridade */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Prioridade</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPriority('normal')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                  priority === 'normal'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setPriority('urgent')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                  priority === 'urgent'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Zap size={12} /> Urgente
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !subject.trim() || !question.trim() || !assigneeEmail}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-[#1B75BB] to-[#152e55] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            {submitting ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={13} />
            )}
            Enviar Solicitação
          </button>
        </div>
      </div>
    </div>
  );
};

export default InquiryCreateModal;
