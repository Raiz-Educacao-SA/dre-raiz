import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron job: verifica SLA de solicitações de análise DRE.
 * - Envia email de lembrete quando prazo está próximo (e ainda não lembrou)
 * - Envia email de breach quando prazo expirou (e ainda não notificou)
 * - Atualiza flags sla_reminded / sla_breached no banco
 *
 * Agendado via vercel.json cron a cada 15 minutos.
 */

const RESEND_EMAIL_FROM = 'DRE Raiz <onboarding@resend.dev>';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSlaEmail(params: {
  type: 'sla_warning' | 'sla_breach';
  recipientName: string;
  senderName: string;
  subject: string;
  deepLink: string;
  hoursLeft?: number;
}): string {
  const safeName = escapeHtml(params.recipientName);
  const safeSender = escapeHtml(params.senderName);
  const safeSubject = escapeHtml(params.subject);

  let title = '';
  let body = '';
  let ctaLabel = '';

  if (params.type === 'sla_warning') {
    const hours = params.hoursLeft != null ? `${params.hoursLeft}h` : 'poucas horas';
    title = 'Prazo se Aproximando';
    body = `
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">
        Você tem <strong>${hours}</strong> para responder a solicitação de <strong>${safeSender}</strong>: <strong>${safeSubject}</strong>
      </p>
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px;margin:0 0 16px;">
        <p style="font-size:13px;color:#92400e;margin:0;">Responda o quanto antes para evitar que o prazo expire.</p>
      </div>`;
    ctaLabel = 'Responder Agora';
  } else {
    title = 'Prazo Expirado';
    body = `
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">
        O prazo para responder a solicitação de <strong>${safeSender}</strong> expirou: <strong>${safeSubject}</strong>
      </p>
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;margin:0 0 16px;">
        <p style="font-size:13px;color:#991b1b;margin:0;">Esta solicitação está atrasada. Responda imediatamente.</p>
      </div>`;
    ctaLabel = 'Responder Agora';
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1B75BB 0%,#152e55 100%);padding:32px;text-align:center;">
    <p style="font-size:24px;font-weight:700;color:#ffffff;margin:0 0 4px;">${escapeHtml(title)}</p>
    <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:0;">DRE Raiz — Gestão Financeira</p>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:#374151;margin:0 0 20px;">Olá, <strong>${safeName}</strong></p>
    ${body}
    <div style="text-align:center;margin:28px 0;">
      <a href="${escapeHtml(params.deepLink)}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1B75BB 0%,#152e55 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;box-shadow:0 4px 16px rgba(27,117,187,0.35);">
        ${ctaLabel}
      </a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">DRE Raiz — Raiz Educação S.A.</p>
  </div>
</div>
</body></html>`;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: RESEND_EMAIL_FROM,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`Resend error for ${to}:`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Email send error for ${to}:`, err);
    return false;
  }
}

function buildDeepLink(inquiryId: number, filterContext: Record<string, unknown>, baseUrl: string): string {
  try {
    const filtersB64 = Buffer.from(JSON.stringify(filterContext)).toString('base64');
    return `${baseUrl}/?view=soma_tags&inquiry=${inquiryId}&filters=${filtersB64}`;
  } catch {
    return `${baseUrl}/?view=inbox`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Aceitar GET (cron) e POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VITE_APP_URL || 'https://dre-raiz.vercel.app';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const now = new Date();
  const results = { reminders_sent: 0, breaches_sent: 0, errors: 0 };

  try {
    // ─── 1. Buscar config de SLA para saber os reminder_hours ───
    const { data: slaConfigs } = await supabase
      .from('dre_inquiry_sla_config')
      .select('priority, deadline_hours, reminder_hours')
      .eq('active', true);

    const reminderHoursMap: Record<string, number> = {};
    (slaConfigs || []).forEach((c: any) => {
      reminderHoursMap[c.priority] = c.reminder_hours;
    });

    // ─── 2. Buscar solicitações ativas com SLA ───
    // Status que precisam de ação do responsável
    const activeStatuses = ['pending', 'reopened', 'rejected'];

    const { data: inquiries, error } = await supabase
      .from('dre_inquiries')
      .select('id, subject, question, priority, requester_email, requester_name, assignee_email, assignee_name, filter_context, sla_deadline_at, sla_breached, sla_reminded, status')
      .in('status', activeStatuses)
      .not('sla_deadline_at', 'is', null);

    if (error) {
      console.error('Erro ao buscar inquiries:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!inquiries || inquiries.length === 0) {
      return res.status(200).json({ message: 'Nenhuma solicitação ativa com SLA', ...results });
    }

    // ─── 3. Processar cada solicitação ───
    for (const inq of inquiries) {
      const deadline = new Date(inq.sla_deadline_at);
      const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      const reminderThreshold = reminderHoursMap[inq.priority] || (inq.priority === 'urgent' ? 6 : 24);

      const deepLink = buildDeepLink(inq.id, inq.filter_context || {}, BASE_URL);

      // ─── 3a. BREACH: prazo expirou e ainda não notificou ───
      if (hoursLeft <= 0 && !inq.sla_breached) {
        const html = buildSlaEmail({
          type: 'sla_breach',
          recipientName: inq.assignee_name,
          senderName: inq.requester_name,
          subject: inq.subject,
          deepLink,
        });

        const sent = await sendEmail(
          RESEND_KEY,
          inq.assignee_email,
          `[DRE Raiz] ⚠️ Prazo expirado: ${inq.subject}`,
          html,
        );

        // Atualizar flag no banco
        const { error: updateErr } = await supabase
          .from('dre_inquiries')
          .update({ sla_breached: true, sla_reminded: true })
          .eq('id', inq.id);

        if (updateErr) {
          console.error(`Erro ao atualizar sla_breached #${inq.id}:`, updateErr);
          results.errors++;
        } else if (sent) {
          results.breaches_sent++;
          console.log(`Breach email sent to ${inq.assignee_email} for inquiry #${inq.id}`);
        } else {
          results.errors++;
        }
      }
      // ─── 3b. REMINDER: dentro do threshold e ainda não lembrou ───
      else if (hoursLeft > 0 && hoursLeft <= reminderThreshold && !inq.sla_reminded) {
        const html = buildSlaEmail({
          type: 'sla_warning',
          recipientName: inq.assignee_name,
          senderName: inq.requester_name,
          subject: inq.subject,
          deepLink,
          hoursLeft: Math.round(hoursLeft),
        });

        const sent = await sendEmail(
          RESEND_KEY,
          inq.assignee_email,
          `[DRE Raiz] ⏰ Prazo se aproximando: ${inq.subject}`,
          html,
        );

        // Atualizar flag no banco
        const { error: updateErr } = await supabase
          .from('dre_inquiries')
          .update({ sla_reminded: true })
          .eq('id', inq.id);

        if (updateErr) {
          console.error(`Erro ao atualizar sla_reminded #${inq.id}:`, updateErr);
          results.errors++;
        } else if (sent) {
          results.reminders_sent++;
          console.log(`Reminder email sent to ${inq.assignee_email} for inquiry #${inq.id}`);
        } else {
          results.errors++;
        }
      }
    }

    return res.status(200).json({
      message: 'SLA check completed',
      checked: inquiries.length,
      ...results,
    });
  } catch (err: any) {
    console.error('SLA check fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
