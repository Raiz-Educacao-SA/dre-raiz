import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import type { ConsolidationOutput, Recommendation } from '../../types/agentTeam';

// ════════════════════════════════════════════════
// ACTION: send-completion-email
// ════════════════════════════════════════════════

const DIRECTOR_EMAILS: string[] = [];
const EMAIL_FROM = 'DRE Raiz <noreply@raizeducacao.com.br>';

async function handleSendCompletionEmail(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { runId } = req.body as { runId: string };

    if (!runId) {
      return res.status(400).json({ error: 'Campo obrigatório: runId' });
    }

    const apiKey = process.env.EMAIL_API_KEY;
    if (!apiKey) {
      console.error('⚠️ EMAIL_API_KEY não configurado — email não enviado');
      return res.status(200).json({ sent: false, reason: 'EMAIL_API_KEY não configurado' });
    }

    const sb = supabaseAdmin();

    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('id, objective, status, started_by, started_by_name, consolidated_summary, started_at, completed_at')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Run não encontrado' });
    }

    if (run.status !== 'completed') {
      return res.status(400).json({ error: `Run não está completed (status: ${run.status})` });
    }

    const { data: consolidationStep } = await sb
      .from('agent_steps')
      .select('output_data')
      .eq('run_id', runId)
      .eq('step_type', 'consolidate')
      .eq('status', 'completed')
      .order('step_order', { ascending: false })
      .limit(1)
      .single();

    const outputData = consolidationStep?.output_data as ConsolidationOutput | null;
    const confidence = outputData?.confidence_level ?? 0;
    const recommendations = (outputData?.final_recommendations || []).slice(0, 3);

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.APP_BASE_URL || 'http://localhost:5173';

    const runLink = `${baseUrl}/?view=agent_team&runId=${runId}`;

    const html = buildCompletionEmailHtml({
      objective: run.objective,
      startedByName: run.started_by_name || run.started_by,
      consolidatedSummary: run.consolidated_summary || outputData?.consolidated_summary || '—',
      confidence,
      recommendations,
      runLink,
      completedAt: run.completed_at,
    });

    const recipients = [run.started_by, ...DIRECTOR_EMAILS].filter(Boolean);
    if (recipients.length === 0) {
      return res.status(200).json({ sent: false, reason: 'Nenhum destinatário' });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: recipients,
        subject: `Análise Concluída — ${run.objective.slice(0, 60)}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('⚠️ Resend API erro:', emailRes.status, errBody);
      return res.status(200).json({ sent: false, reason: `Resend ${emailRes.status}` });
    }

    return res.status(200).json({ sent: true });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('⚠️ send-completion-email erro:', msg);
    return res.status(200).json({ sent: false, reason: msg });
  }
}

// ── Completion Email HTML Builder ──

interface CompletionEmailData {
  objective: string;
  startedByName: string;
  consolidatedSummary: string;
  confidence: number;
  recommendations: Recommendation[];
  runLink: string;
  completedAt: string | null;
}

function buildCompletionEmailHtml(data: CompletionEmailData): string {
  const confidenceColor =
    data.confidence >= 80 ? '#16a34a' :
    data.confidence >= 60 ? '#ca8a04' : '#dc2626';

  const completedDate = data.completedAt
    ? new Date(data.completedAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const recommendationsHtml = data.recommendations.length > 0
    ? data.recommendations.map((r) => {
        const prioColor =
          r.priority === 'high' ? '#dc2626' :
          r.priority === 'medium' ? '#ca8a04' : '#6b7280';
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;">
              <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;text-transform:uppercase;color:white;background:${prioColor};">${r.priority}</span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
              <strong style="font-size:13px;color:#111827;">${escapeHtml(r.area)}</strong><br>
              <span style="font-size:12px;color:#4b5563;">${escapeHtml(r.action)}</span>
              ${r.expected_impact ? `<br><span style="font-size:11px;color:#9ca3af;">Impacto: ${escapeHtml(r.expected_impact)}</span>` : ''}
            </td>
          </tr>
        `;
      }).join('')
    : '<tr><td style="padding:12px;color:#9ca3af;font-size:12px;">Nenhuma recomendação gerada.</td></tr>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);border-radius:12px 12px 0 0;padding:24px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:18px;font-weight:800;">Equipe Financeira 2.0</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Análise automatizada concluída</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">

      <!-- Meta -->
      <table style="width:100%;font-size:12px;color:#6b7280;margin-bottom:16px;">
        <tr>
          <td><strong>Objetivo:</strong> ${escapeHtml(data.objective)}</td>
        </tr>
        <tr>
          <td><strong>Solicitado por:</strong> ${escapeHtml(data.startedByName)} &nbsp;|&nbsp; <strong>Concluído em:</strong> ${completedDate}</td>
        </tr>
      </table>

      <!-- Confidence -->
      <div style="text-align:center;margin-bottom:20px;">
        <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Nível de Confiança</span><br>
        <span style="font-size:32px;font-weight:800;color:${confidenceColor};">${Math.round(data.confidence)}%</span>
      </div>

      <!-- Summary -->
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px;">
        <h3 style="margin:0 0 8px;font-size:13px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Resumo Executivo</h3>
        <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;white-space:pre-line;">${escapeHtml(data.consolidatedSummary)}</p>
      </div>

      <!-- Recommendations -->
      <h3 style="margin:0 0 8px;font-size:13px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Top Recomendações</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${recommendationsHtml}
      </table>

      <!-- CTA -->
      <div style="text-align:center;margin-top:24px;">
        <a href="${data.runLink}" style="display:inline-block;padding:10px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;">
          Ver Análise Completa
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px;">
      DRE Raiz — Raiz Educação S.A. | Este email foi gerado automaticamente.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ════════════════════════════════════════════════
// ACTION: variance-notify
// ════════════════════════════════════════════════

function supabaseAdminForVariance() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado');
  return createClient(url, key);
}

async function handleVarianceNotify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { yearMonth, marca, tag0 } = req.body as {
      yearMonth: string;
      marca?: string;
      tag0?: string;
    };

    if (!yearMonth) {
      return res.status(400).json({ error: 'Campo obrigatório: yearMonth' });
    }

    const apiKey = process.env.EMAIL_API_KEY;
    if (!apiKey) {
      console.error('⚠️ EMAIL_API_KEY não configurado — email não enviado');
      return res.status(200).json({ sent: false, reason: 'EMAIL_API_KEY não configurado' });
    }

    const sb = supabaseAdminForVariance();

    let query = sb
      .from('variance_justifications')
      .select('*')
      .eq('year_month', yearMonth)
      .in('status', ['pending', 'notified'])
      .not('owner_email', 'is', null)
      .not('tag03', 'is', null);

    if (marca) query = query.eq('marca', marca);
    if (tag0) query = query.eq('tag0', tag0);

    const { data: items, error: fetchErr } = await query;
    if (fetchErr || !items || items.length === 0) {
      return res.status(200).json({ sent: false, reason: 'Nenhum item pendente encontrado', count: 0 });
    }

    const byOwner = new Map<string, typeof items>();
    for (const item of items) {
      if (!item.owner_email) continue;
      const list = byOwner.get(item.owner_email) || [];
      list.push(item);
      byOwner.set(item.owner_email, list);
    }

    let sentCount = 0;
    const updatedIds: number[] = [];

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.APP_BASE_URL || 'http://localhost:5173';

    for (const [email, ownerItems] of byOwner) {
      const ownerName = ownerItems[0].owner_name || email.split('@')[0];
      const justificativasLink = `${baseUrl}/?view=justificativas`;

      const html = buildVarianceNotificationEmail({
        ownerName,
        yearMonth,
        items: ownerItems,
        link: justificativasLink,
      });

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [email],
          subject: `Justificativa de Desvios — ${yearMonth} (${ownerItems.length} itens)`,
          html,
        }),
      });

      if (emailRes.ok) {
        sentCount++;
        updatedIds.push(...ownerItems.map((i: any) => i.id));
      } else {
        const errBody = await emailRes.text();
        console.error(`⚠️ Resend erro para ${email}:`, emailRes.status, errBody);
      }
    }

    if (updatedIds.length > 0) {
      await sb
        .from('variance_justifications')
        .update({ status: 'notified', notified_at: new Date().toISOString() })
        .in('id', updatedIds);
    }

    return res.status(200).json({ sent: true, count: sentCount });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('⚠️ variance/notify erro:', msg);
    return res.status(200).json({ sent: false, reason: msg });
  }
}

// ── Variance Notification Email HTML Builder ──

interface VarianceNotificationData {
  ownerName: string;
  yearMonth: string;
  items: any[];
  link: string;
}

function buildVarianceNotificationEmail(data: VarianceNotificationData): string {
  const fmtBRL = (v: number) =>
    v === 0 ? '—' : 'R$ ' + Math.round(v).toLocaleString('pt-BR');

  const fmtPct = (v: number | null) => {
    if (v === null || v === undefined) return 'N/D';
    return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  };

  const rowsHtml = data.items
    .slice(0, 20)
    .map(item => {
      const pctColor = (item.variance_pct ?? 0) < 0 ? '#dc2626' : '#16a34a';
      const typeBadge = item.comparison_type === 'orcado'
        ? '<span style="background:#eff6ff;color:#2563eb;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:bold;">vs Orç</span>'
        : '<span style="background:#fff7ed;color:#ea580c;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:bold;">vs A-1</span>';
      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:6px 8px;font-size:11px;color:#374151;">${escapeHtml(item.tag0?.slice(0, 3) || '')}</td>
          <td style="padding:6px 8px;font-size:11px;color:#374151;">${escapeHtml(item.tag01 || '')}</td>
          <td style="padding:6px 8px;font-size:11px;color:#374151;">${escapeHtml(item.tag02 || '')}</td>
          <td style="padding:6px 8px;font-size:11px;font-weight:bold;color:#374151;">${escapeHtml(item.tag03 || '')}</td>
          <td style="padding:6px 4px;text-align:center;">${typeBadge}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;">${fmtBRL(item.real_value)}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;">${fmtBRL(item.compare_value)}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:bold;color:${pctColor};">${fmtPct(item.variance_pct)}</td>
        </tr>
      `;
    })
    .join('');

  const extraText = data.items.length > 20
    ? `<p style="font-size:11px;color:#9ca3af;padding:8px;">... e mais ${data.items.length - 20} itens</p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:24px;">

    <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);border-radius:12px 12px 0 0;padding:20px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:16px;font-weight:800;">Justificativa de Desvios</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:11px;">Período: ${escapeHtml(data.yearMonth)}</p>
    </div>

    <div style="background:white;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">

      <p style="font-size:13px;color:#374151;margin:0 0 16px;">
        Olá <strong>${escapeHtml(data.ownerName)}</strong>,
      </p>
      <p style="font-size:12px;color:#4b5563;margin:0 0 16px;">
        Foram identificados <strong>${data.items.length} desvio(s)</strong> nas linhas da DRE sob sua responsabilidade
        que necessitam de justificativa. Acesse a plataforma para registrar suas justificativas.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#6b7280;">Tag0</th>
            <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#6b7280;">Tag01</th>
            <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#6b7280;">Tag02</th>
            <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#6b7280;">Tag03</th>
            <th style="padding:6px 4px;text-align:center;font-size:9px;text-transform:uppercase;color:#6b7280;">Tipo</th>
            <th style="padding:6px 8px;text-align:right;font-size:9px;text-transform:uppercase;color:#6b7280;">Real</th>
            <th style="padding:6px 8px;text-align:right;font-size:9px;text-transform:uppercase;color:#6b7280;">Comp.</th>
            <th style="padding:6px 8px;text-align:right;font-size:9px;text-transform:uppercase;color:#6b7280;">Δ %</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      ${extraText}

      <div style="text-align:center;margin-top:20px;">
        <a href="${data.link}" style="display:inline-block;padding:10px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;">
          Justificar Desvios
        </a>
      </div>
    </div>

    <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px;">
      DRE Raiz — Raiz Educação S.A. | Este email foi gerado automaticamente.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ── Shared escape ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ════════════════════════════════════════════════
// Router
// ════════════════════════════════════════════════

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  switch (action) {
    case 'send-completion-email': return handleSendCompletionEmail(req, res);
    case 'variance-notify': return handleVarianceNotify(req, res);
    default: return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}
