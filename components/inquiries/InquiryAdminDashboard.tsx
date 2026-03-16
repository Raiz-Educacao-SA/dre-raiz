import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircleQuestion, Clock, CheckCircle2, XCircle, AlertTriangle, Zap, Loader2, RotateCcw, Save, User, Trash2, Pencil, X } from 'lucide-react';
import { getAllInquiries, getInquiryStats, getSlaConfig, updateSlaConfig, deleteInquiry, updateInquiry, getSystemUsers } from '../../services/inquiryService';
import type { DreInquiry, InquiryStats, InquirySlaConfig, InquiryStatus } from '../../types';
import InquiryThreadPanel from './InquiryThreadPanel';
import { toast } from 'sonner';

interface InquiryAdminDashboardProps {
  currentUser: { email: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  answered: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  reopened: 'bg-purple-100 text-purple-700',
  expired:  'bg-gray-100 text-gray-500',
  closed:   'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', answered: 'Respondida', approved: 'Aprovada',
  rejected: 'Devolvida', reopened: 'Reaberta', expired: 'Expirada', closed: 'Encerrada',
};

const ALL_STATUSES: InquiryStatus[] = ['pending', 'answered', 'approved', 'rejected', 'reopened', 'expired', 'closed'];

const InquiryAdminDashboard: React.FC<InquiryAdminDashboardProps> = ({ currentUser }) => {
  const [stats, setStats] = useState<InquiryStats | null>(null);
  const [inquiries, setInquiries] = useState<DreInquiry[]>([]);
  const [slaConfig, setSlaConfig] = useState<InquirySlaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedInquiry, setSelectedInquiry] = useState<DreInquiry | null>(null);
  const [savingSla, setSavingSla] = useState(false);

  // Edit modal state
  const [editingInquiry, setEditingInquiry] = useState<DreInquiry | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editStatus, setEditStatus] = useState<InquiryStatus>('pending');
  const [editPriority, setEditPriority] = useState<'normal' | 'urgent'>('normal');
  const [editAssigneeEmail, setEditAssigneeEmail] = useState('');
  const [editAssigneeName, setEditAssigneeName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [systemUsers, setSystemUsers] = useState<Array<{ id: string; email: string; name: string; role: string }>>([]);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Editable SLA values
  const [normalHours, setNormalHours] = useState(48);
  const [normalReminder, setNormalReminder] = useState(24);
  const [urgentHours, setUrgentHours] = useState(24);
  const [urgentReminder, setUrgentReminder] = useState(6);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [s, inqs, sla] = await Promise.all([
      getInquiryStats(),
      getAllInquiries(filterStatus ? { status: filterStatus as InquiryStatus } : undefined),
      getSlaConfig(),
    ]);
    setStats(s);
    setInquiries(inqs);
    setSlaConfig(sla);
    // Init SLA form
    const n = sla.find(c => c.priority === 'normal');
    const u = sla.find(c => c.priority === 'urgent');
    if (n) { setNormalHours(n.deadline_hours); setNormalReminder(n.reminder_hours); }
    if (u) { setUrgentHours(u.deadline_hours); setUrgentReminder(u.reminder_hours); }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveSla = async () => {
    setSavingSla(true);
    await Promise.all([
      updateSlaConfig('normal', normalHours, normalReminder),
      updateSlaConfig('urgent', urgentHours, urgentReminder),
    ]);
    toast.success('SLA atualizado');
    setSavingSla(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    const ok = await deleteInquiry(id);
    if (ok) {
      toast.success('Solicitação excluída');
      setConfirmDeleteId(null);
      loadData();
    } else {
      toast.error('Erro ao excluir solicitação');
    }
    setDeletingId(null);
  };

  const openEdit = async (inq: DreInquiry) => {
    setEditingInquiry(inq);
    setEditSubject(inq.subject);
    setEditStatus(inq.status);
    setEditPriority(inq.priority);
    setEditAssigneeEmail(inq.assignee_email);
    setEditAssigneeName(inq.assignee_name);
    // Load users for reassignment dropdown
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Pendentes', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Respondidas', value: stats.answered, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Aprovadas', value: stats.approved, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Devolvidas', value: stats.rejected, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Reabertas', value: stats.reopened, color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'Expiradas', value: stats.expired, color: 'text-gray-500', bg: 'bg-gray-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-gray-100`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* SLA Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#1B75BB]" />
            <h3 className="text-sm font-bold text-gray-800">Configuração de SLA</h3>
          </div>
          <button
            onClick={handleSaveSla}
            disabled={savingSla}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1B75BB] text-white text-[10px] font-bold disabled:opacity-50"
          >
            {savingSla ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Salvar SLA
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
            <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Normal</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] text-gray-500 block">Prazo (horas)</label>
                <input type="number" value={normalHours} onChange={e => setNormalHours(Number(e.target.value))}
                  className="w-full border border-blue-200 rounded px-2 py-1 text-xs font-bold text-center" min={1} />
              </div>
              <div>
                <label className="text-[8px] text-gray-500 block">Lembrete antes (h)</label>
                <input type="number" value={normalReminder} onChange={e => setNormalReminder(Number(e.target.value))}
                  className="w-full border border-blue-200 rounded px-2 py-1 text-xs font-bold text-center" min={1} />
              </div>
            </div>
          </div>
          <div className="bg-red-50/50 rounded-lg p-3 border border-red-100">
            <p className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1"><Zap size={10} /> Urgente</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[8px] text-gray-500 block">Prazo (horas)</label>
                <input type="number" value={urgentHours} onChange={e => setUrgentHours(Number(e.target.value))}
                  className="w-full border border-red-200 rounded px-2 py-1 text-xs font-bold text-center" min={1} />
              </div>
              <div>
                <label className="text-[8px] text-gray-500 block">Lembrete antes (h)</label>
                <input type="number" value={urgentReminder} onChange={e => setUrgentReminder(Number(e.target.value))}
                  className="w-full border border-red-200 rounded px-2 py-1 text-xs font-bold text-center" min={1} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Todas as Solicitações</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setFilterStatus('')}
              className={`text-[8px] font-bold px-2 py-1 rounded-full ${!filterStatus ? 'bg-[#1B75BB] text-white' : 'bg-gray-100 text-gray-500'}`}>
              Todas
            </button>
            {['pending', 'answered', 'approved', 'rejected', 'reopened', 'expired'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-[8px] font-bold px-2 py-1 rounded-full ${filterStatus === s ? 'bg-[#1B75BB] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">#</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Assunto</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Solicitante</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Responsável</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Status</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Prioridade</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">Criação</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase">SLA</th>
                <th className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-400 text-xs">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : inquiries.map(inq => {
                const slaBreached = inq.sla_breached;
                const slaClose = !slaBreached && inq.sla_deadline_at && new Date(inq.sla_deadline_at) < new Date(Date.now() + 6 * 3600000);
                const isConfirmingDelete = confirmDeleteId === inq.id;
                return (
                  <tr
                    key={inq.id}
                    className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{inq.id}</td>
                    <td
                      className="px-3 py-2 font-bold text-gray-700 max-w-[200px] truncate cursor-pointer hover:text-[#1B75BB]"
                      onClick={() => setSelectedInquiry(inq)}
                    >
                      {inq.subject}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{inq.requester_name}</td>
                    <td className="px-3 py-2 text-gray-500">{inq.assignee_name}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[inq.status]}`}>
                        {STATUS_LABELS[inq.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {inq.priority === 'urgent' ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-0.5 w-fit">
                          <Zap size={8} /> Urgente
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400">Normal</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-400">{formatDate(inq.created_at)}</td>
                    <td className="px-3 py-2">
                      {slaBreached ? (
                        <span className="text-[9px] font-bold text-red-600 flex items-center gap-0.5">
                          <AlertTriangle size={9} /> Expirado
                        </span>
                      ) : slaClose ? (
                        <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5">
                          <Clock size={9} /> Próximo
                        </span>
                      ) : inq.sla_deadline_at ? (
                        <span className="text-[9px] text-gray-400">{formatDate(inq.sla_deadline_at)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        {isConfirmingDelete ? (
                          <>
                            <button
                              onClick={() => handleDelete(inq.id)}
                              disabled={deletingId === inq.id}
                              className="text-[8px] font-bold px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all"
                            >
                              {deletingId === inq.id ? <Loader2 size={10} className="animate-spin" /> : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[8px] font-bold px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(inq)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#1B75BB] transition-all"
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(inq.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingInquiry && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal header */}
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
              {/* Assunto */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Assunto</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
                <div className="flex flex-wrap gap-1">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all ${
                        editStatus === s
                          ? `${STATUS_COLORS[s]} ring-2 ring-offset-1 ring-blue-300`
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prioridade */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Prioridade</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditPriority('normal')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                      editPriority === 'normal'
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => setEditPriority('urgent')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      editPriority === 'urgent'
                        ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Zap size={10} /> Urgente
                  </button>
                </div>
              </div>

              {/* Responsável */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Responsável</label>
                <select
                  value={editAssigneeEmail}
                  onChange={e => {
                    const u = systemUsers.find(u => u.email === e.target.value);
                    if (u) {
                      setEditAssigneeEmail(u.email);
                      setEditAssigneeName(u.name);
                    }
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                >
                  {/* Current assignee may not be in list yet */}
                  {!systemUsers.find(u => u.email === editAssigneeEmail) && (
                    <option value={editAssigneeEmail}>{editAssigneeName} ({editAssigneeEmail})</option>
                  )}
                  {systemUsers.map(u => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Info */}
              <div className="bg-gray-50 rounded-lg p-3 text-[10px] text-gray-400 space-y-1">
                <p><strong>Solicitante:</strong> {editingInquiry.requester_name} ({editingInquiry.requester_email})</p>
                <p><strong>Criação:</strong> {formatDate(editingInquiry.created_at)}</p>
                {editingInquiry.closed_at && <p><strong>Encerrada:</strong> {formatDate(editingInquiry.closed_at)}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 p-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingInquiry(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
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

      {/* Thread Panel */}
      {selectedInquiry && (
        <InquiryThreadPanel
          inquiry={selectedInquiry}
          currentUser={currentUser}
          isOpen={!!selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
};

export default InquiryAdminDashboard;
