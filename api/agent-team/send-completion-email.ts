import { supabaseAdmin } from './_lib/supabaseAdmin';
import type { ConsolidationOutput, Recommendation } from '../../types/agentTeam';

// --------------------------------------------
// Config
// --------------------------------------------

const DIRECTOR_EMAILS: string[] = [
  // Adicionar emails de diretores aqui
  // 'diretor@raizeducacao.com.br',
];

const EMAIL_FROM = 'DRE Raiz <noreply@raizeducacao.com.br>';

// --------------------------------------------
// Handler
// --------------------------------------------

export async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { runId } = req.body as { runId: string };

    // 1. Validar
    if (!runId) {
      return res.status(400).json({ error: 'Campo obrigatório: runId' });
    }

    const apiKey = process.env.EMAIL_API_KEY;
    if (!apiKey) {
      console.error('⚠️ EMAIL_API_KEY não configurado — email não enviado');
      return res.status(200).json({ sent: false, reason: 'EMAIL_API_KEY não configurado' });
    }

    // 2. Supabase
    const sb = supabaseAdmin();

    // 3. Buscar run
    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('id, objective, status, started_by, started_by_name, consolidated_summary, started_at, completed_at')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Run não encontrado' });
    }

    // 4. Validar status
    if (run.status !== 'completed') {
      return res.status(400).json({ error: `Run não está completed (status: ${run.status})` });
    }

    // 5. Buscar consolidation step
    const { data: consolidationStep } = await sb
      .from('agent_steps')
      .select('output_data')
      .eq('run_id', runId)
      .eq('step_type', 'consolidate')
      .eq('status', 'completed')
      .order('step_order', { ascending: false })
      .limit(1)
      .single();

    // 6. Extrair dados
    const outputData = consolidationStep?.output_data as ConsolidationOutput | null;
    const confidence = outputData?.confidence_level ?? 0;
    const recommendations = (outputData?.final_recommendations || []).slice(0, 3);

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.APP_BASE_URL || 'http://localhost:5173';

    const runLink = `${baseUrl}/?view=agent_team&runId=${runId}`;

    // 7. Montar HTML
    const html = buildEmailHtml({
      objective: run.objective,
      startedByName: run.started_by_name || run.started_by,
      consolidatedSummary: run.consolidated_summary || outputData?.consolidated_summary || '—',
      confidence,
      recommendations,
      runLink,
      completedAt: run.completed_at,
    });

    // 8. Destinatários
    const recipients = [run.started_by, ...DIRECTOR_EMAILS].filter(Boolean);
    if (recipients.length === 0) {
      return res.status(200).json({ sent: false, reason: 'Nenhum destinatário' });
    }

    // 9. Enviar via Resend API (fetch direto)
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
    // Nunca retornar 500 — email não deve bloquear pipeline
    return res.status(200).json({ sent: false, reason: msg });
  }
}

// --------------------------------------------
// HTML Builder
// --------------------------------------------

interface EmailData {
  objective: string;
  startedByName: string;
  consolidatedSummary: string;
  confidence: number;
  recommendations: Recommendation[];
  runLink: string;
  completedAt: string | null;
}

function buildEmailHtml(data: EmailData): string {
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
    ? data.recommendations.map((r, i) => {
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default handler;
