import React, { useState, useCallback } from 'react';
import {
  FileText, Sparkles, Loader2, Save, X, AlertTriangle,
  CheckCircle2, Calendar, User, Target, ArrowUpRight,
  ArrowDownRight, ChevronDown, ChevronUp, Wand2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionPlanFormProps {
  item: {
    id: number;
    year_month: string;
    marca: string;
    tag0: string;
    tag01: string;
    tag02: string | null;
    comparison_type: 'orcado' | 'a1';
    real_value: number;
    compare_value: number;
    variance_abs: number;
    variance_pct: number | null;
    justification: string | null;
    status: string;
  };
  userName: string;
  userEmail: string;
  readOnly?: boolean;
  onSave: (data: { justification: string; actionPlan?: ActionPlanData }) => Promise<void>;
  onClose: () => void;
}

interface ActionPlanData {
  what: string;
  why: string;
  how: string;
  who_responsible: string;
  who_email: string;
  deadline: string;
  expected_impact: string;
  status: string;
  ai_generated: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const fmtPct = (v: number | null) =>
  v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—';

const defaultDeadline = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

const ACTION_STATUS_OPTIONS = [
  'Aberto',
  'Em andamento',
  'Concluído',
  'Atrasado',
  'Cancelado',
] as const;

// ---------------------------------------------------------------------------
// AI helper
// ---------------------------------------------------------------------------

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  const res = await fetch('/api/llm-proxy?action=anthropic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('AI call failed:', res.status, errText);
    throw new Error(`AI request failed (${res.status})`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '';
  if (!text) {
    console.error('AI returned empty response:', JSON.stringify(data));
    throw new Error('AI returned empty response');
  }
  return text;
}

const SYSTEM_PROMPT =
  'Voce e um assistente de CFO especializado em analise de DRE (Demonstracao de Resultado do Exercicio) ' +
  'para uma rede educacional brasileira. Responda sempre em portugues de forma concisa, objetiva e executiva.';

function buildContext(item: ActionPlanFormProps['item']) {
  const cmp = item.comparison_type === 'orcado' ? 'Orcado' : 'Ano Anterior';
  return (
    `Marca: ${item.marca} | Mes: ${item.year_month} | ` +
    `${item.tag0} > ${item.tag01}${item.tag02 ? ` > ${item.tag02}` : ''}\n` +
    `Real: ${fmtBRL(item.real_value)} | ${cmp}: ${fmtBRL(item.compare_value)} | ` +
    `Desvio: ${fmtBRL(item.variance_abs)} (${fmtPct(item.variance_pct)})`
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ActionPlanForm({ item, userName, userEmail, readOnly, onSave, onClose }: ActionPlanFormProps) {
  // Form state
  const [justification, setJustification] = useState(item.justification ?? '');
  const [actionExpanded, setActionExpanded] = useState(item.variance_abs < 0);

  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [how, setHow] = useState('');
  const [whoResp, setWhoResp] = useState(userName);
  const [whoEmail, setWhoEmail] = useState(userEmail);
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [expectedImpact, setExpectedImpact] = useState('');
  const [actionStatus, setActionStatus] = useState<string>('Aberto');

  // UI state
  const [saving, setSaving] = useState(false);
  const [aiLoadingJust, setAiLoadingJust] = useState<'generate' | 'improve' | null>(null);
  const [aiLoadingPlan, setAiLoadingPlan] = useState<'generate' | 'improve' | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Derived
  const isNegative = item.variance_abs < 0;
  const justRequired =
    (item.variance_pct != null && Math.abs(item.variance_pct) > 5) ||
    Math.abs(item.variance_abs) > 10000;
  const planRequired = isNegative;
  const cmpLabel = item.comparison_type === 'orcado' ? 'vs Orcado' : 'vs A-1';
  const cmpValueLabel = item.comparison_type === 'orcado' ? 'Orcado' : 'A-1';

  // ------ AI: Justification ------
  const handleAIJustification = useCallback(
    async (mode: 'generate' | 'improve') => {
      setAiLoadingJust(mode);
      try {
        const ctx = buildContext(item);
        const userPrompt =
          mode === 'generate'
            ? `Analise o seguinte desvio financeiro e gere uma justificativa concisa e objetiva (maximo 3 frases):\n\n${ctx}`
            : `Melhore a seguinte justificativa de desvio financeiro, tornando-a mais clara e executiva. Mantenha o sentido original.\n\nContexto:\n${ctx}\n\nJustificativa atual:\n${justification}`;
        const text = await callAI(SYSTEM_PROMPT, userPrompt, 500);
        setJustification(text.trim());
      } catch (err) {
        console.error('Erro ao gerar justificativa com IA:', err);
        setErrors(['Erro ao chamar a IA. Tente novamente.']);
      } finally {
        setAiLoadingJust(null);
      }
    },
    [item, justification],
  );

  // ------ AI: Action Plan ------
  const handleAIPlan = useCallback(
    async (mode: 'generate' | 'improve') => {
      setAiLoadingPlan(mode);
      try {
        const ctx = buildContext(item);
        const existing =
          mode === 'improve'
            ? `\n\nPlano atual:\nO que: ${what}\nObjetivo: ${why}\nComo: ${how}\nResponsavel: ${whoResp}\nImpacto esperado: ${expectedImpact}`
            : '';
        const userPrompt =
          mode === 'generate'
            ? `Dado o desvio financeiro abaixo, gere um plano de acao 5W1H em JSON com as chaves: what, why, how, who_responsible, deadline (YYYY-MM-DD), expected_impact. Responda SOMENTE o JSON.\n\n${ctx}`
            : `Melhore o plano de acao abaixo para o desvio financeiro, tornando-o mais especifico e executivo. Responda SOMENTE o JSON com as chaves: what, why, how, who_responsible, deadline (YYYY-MM-DD), expected_impact.\n\n${ctx}${existing}`;
        const raw = await callAI(SYSTEM_PROMPT, userPrompt, 800);
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON');
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('AI plan parsed:', parsed);
        if (parsed.what) setWhat(parsed.what);
        if (parsed.why) setWhy(parsed.why);
        if (parsed.how) setHow(parsed.how);
        if (parsed.who_responsible) setWhoResp(parsed.who_responsible);
        if (parsed.deadline) setDeadline(parsed.deadline);
        if (parsed.expected_impact) setExpectedImpact(parsed.expected_impact);
        if (!actionExpanded) setActionExpanded(true);
      } catch (err) {
        console.error('Erro ao gerar plano com IA:', err);
        setErrors(['Erro ao gerar plano com IA. Tente novamente.']);
      } finally {
        setAiLoadingPlan(null);
      }
    },
    [item, what, why, how, whoResp, expectedImpact, actionExpanded],
  );

  // ------ Save ------
  const handleSave = async () => {
    const errs: string[] = [];
    if (justRequired && !justification.trim()) {
      errs.push('Justificativa e obrigatoria para este desvio.');
    }
    if (planRequired) {
      if (!what.trim()) errs.push('Campo "O que sera feito" e obrigatorio.');
      if (!why.trim()) errs.push('Campo "Objetivo da acao" e obrigatorio.');
      if (!whoResp.trim()) errs.push('Campo "Responsavel" e obrigatorio.');
      if (!deadline) errs.push('Campo "Prazo" e obrigatorio.');
    }
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      const hasActionPlan = what.trim() || why.trim() || how.trim();
      await onSave({
        justification: justification.trim(),
        actionPlan: hasActionPlan
          ? {
              what: what.trim(),
              why: why.trim(),
              how: how.trim(),
              who_responsible: whoResp.trim(),
              who_email: whoEmail.trim(),
              deadline,
              expected_impact: expectedImpact.trim(),
              status: actionStatus,
              ai_generated: false,
            }
          : undefined,
      });
    } catch {
      setErrors(['Erro ao salvar. Tente novamente.']);
    } finally {
      setSaving(false);
    }
  };

  // ------ Render helpers ------
  const DeviationArrow = item.variance_abs >= 0 ? ArrowUpRight : ArrowDownRight;
  const deviationColor = item.variance_abs >= 0 ? 'text-emerald-600' : 'text-red-600';
  const deviationBg = item.variance_abs >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-5 p-1">
      {/* ============================================================= */}
      {/* DEVIATION SUMMARY HEADER                                      */}
      {/* ============================================================= */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        {/* Top tags */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold text-xs">
            {item.marca}
          </span>
          <span className="text-gray-400">|</span>
          <span className="font-medium text-gray-700">
            <Calendar className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {item.year_month}
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            {item.tag0} &gt; {item.tag01}
            {item.tag02 ? ` > ${item.tag02}` : ''}
          </span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
            {cmpLabel}
          </span>
        </div>

        {/* Mini cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniCard label="Real" value={fmtBRL(item.real_value)} />
          <MiniCard label={cmpValueLabel} value={fmtBRL(item.compare_value)} />
          <MiniCard
            label="Desvio R$"
            value={fmtBRL(item.variance_abs)}
            className={deviationBg}
            valueClass={deviationColor}
            icon={<DeviationArrow className={`w-4 h-4 ${deviationColor}`} />}
          />
          <MiniCard
            label="Desvio %"
            value={fmtPct(item.variance_pct)}
            className={deviationBg}
            valueClass={deviationColor}
            icon={<DeviationArrow className={`w-4 h-4 ${deviationColor}`} />}
          />
        </div>
      </div>

      {/* ============================================================= */}
      {/* JUSTIFICATION CARD                                            */}
      {/* ============================================================= */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            Justificativa do Desvio
          </h3>
          {justRequired ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Obrigatoria
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">
              Opcional
            </span>
          )}
        </div>

        <textarea
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-y"
          placeholder="Descreva o motivo do desvio..."
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
        />

        <div className="flex gap-2">
          <AIButton
            label="Gerar com IA"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            loading={aiLoadingJust === 'generate'}
            disabled={aiLoadingJust !== null}
            onClick={() => handleAIJustification('generate')}
          />
          <AIButton
            label="Melhorar com IA"
            icon={<Wand2 className="w-3.5 h-3.5" />}
            loading={aiLoadingJust === 'improve'}
            disabled={aiLoadingJust !== null || !justification.trim()}
            onClick={() => handleAIJustification('improve')}
          />
        </div>
      </div>

      {/* ============================================================= */}
      {/* ACTION PLAN CARD                                              */}
      {/* ============================================================= */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header (clickable to collapse) */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          onClick={() => setActionExpanded((p) => !p)}
        >
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            Plano de Acao — 5W1H
          </h3>
          <div className="flex items-center gap-2">
            {planRequired ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Obrigatorio
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                Opcional
              </span>
            )}
            {actionExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {actionExpanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
            {/* AI buttons */}
            <div className="flex gap-2">
              <AIButton
                label="Gerar Plano com IA"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                loading={aiLoadingPlan === 'generate'}
                disabled={aiLoadingPlan !== null}
                onClick={() => handleAIPlan('generate')}
              />
              <AIButton
                label="Melhorar Plano com IA"
                icon={<Wand2 className="w-3.5 h-3.5" />}
                loading={aiLoadingPlan === 'improve'}
                disabled={aiLoadingPlan !== null || !what.trim()}
                onClick={() => handleAIPlan('improve')}
              />
            </div>

            {/* Fields */}
            <FormField
              label="O que sera feito"
              required={planRequired}
              textarea
              rows={2}
              value={what}
              onChange={setWhat}
              placeholder="Descreva a acao corretiva..."
            />
            <FormField
              label="Objetivo da acao"
              required={planRequired}
              textarea
              rows={2}
              value={why}
              onChange={setWhy}
              placeholder="Qual o objetivo desta acao..."
            />
            <FormField
              label="Como sera executado"
              textarea
              rows={2}
              value={how}
              onChange={setHow}
              placeholder="Descreva os passos de execucao..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Responsavel"
                required={planRequired}
                value={whoResp}
                onChange={setWhoResp}
                placeholder="Nome do responsavel"
                icon={<User className="w-4 h-4 text-gray-400" />}
              />
              <FormField
                label="E-mail do responsavel"
                type="email"
                value={whoEmail}
                onChange={setWhoEmail}
                placeholder="email@empresa.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                label="Prazo"
                type="date"
                required={planRequired}
                value={deadline}
                onChange={setDeadline}
                icon={<Calendar className="w-4 h-4 text-gray-400" />}
              />
              <FormField
                label="Impacto esperado"
                value={expectedImpact}
                onChange={setExpectedImpact}
                placeholder="Ex: Reducao de R$ 50k/mes"
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                >
                  {ACTION_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* ERRORS                                                        */}
      {/* ============================================================= */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {e}
            </p>
          ))}
        </div>
      )}

      {/* ============================================================= */}
      {/* FOOTER                                                        */}
      {/* ============================================================= */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {readOnly ? 'Fechar' : 'Cancelar'}
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MiniCard({
  label,
  value,
  className = 'bg-gray-50 border-gray-200',
  valueClass = 'text-gray-800',
  icon,
}: {
  label: string;
  value: string;
  className?: string;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${className}`}>
      <p className="text-[11px] text-gray-500 font-medium mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}

function AIButton({
  label,
  icon,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function FormField({
  label,
  required,
  textarea,
  rows,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const base =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none';
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && !textarea && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        )}
        {textarea ? (
          <textarea
            rows={rows ?? 2}
            className={`${base} resize-y`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type={type}
            className={`${base} ${icon ? 'pl-9' : ''}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export default ActionPlanForm;
