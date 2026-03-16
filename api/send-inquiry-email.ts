import type { VercelRequest, VercelResponse } from '@vercel/node';

const RESEND_EMAIL_FROM = 'DRE Raiz <onboarding@resend.dev>';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildInquiryEmail(params: {
  type: string;
  recipientName: string;
  senderName: string;
  subject: string;
  question: string;
  message?: string;
  priority?: string;
  filterSummary: string;
  deepLink: string;
  dreSnapshot?: Record<string, number> | null;
}): string {
  const safeName = escapeHtml(params.recipientName);
  const safeSender = escapeHtml(params.senderName);
  const safeSubject = escapeHtml(params.subject);
  const safeQuestion = escapeHtml(params.question).replace(/\n/g, '<br/>');
  const safeMessage = params.message ? escapeHtml(params.message).replace(/\n/g, '<br/>') : '';
  const safeFilters = escapeHtml(params.filterSummary);
  const priorityBadge = params.priority === 'urgent'
    ? '<span style="display:inline-block;background:#dc2626;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;margin-left:8px;">URGENTE</span>'
    : '';

  // Snapshot de valores
  let snapshotHtml = '';
  if (params.dreSnapshot && Object.keys(params.dreSnapshot).length > 0) {
    const rows = Object.entries(params.dreSnapshot).map(([k, v]) =>
      `<tr><td style="padding:4px 8px;font-size:12px;color:#6b7280;">${escapeHtml(k)}</td><td style="padding:4px 8px;font-size:12px;font-weight:600;color:#111827;text-align:right;">R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`
    ).join('');
    snapshotHtml = `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;margin:16px 0;">
      <p style="font-size:12px;font-weight:600;color:#166534;margin:0 0 8px;">Valores DRE no momento da solicitação:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
    </div>`;
  }

  // Título e corpo variam por tipo
  let title = '';
  let body = '';
  let ctaLabel = 'Ver no DRE Raiz';

  switch (params.type) {
    case 'new_request':
      title = 'Nova Solicitação de Análise';
      body = `
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          <strong>${safeSender}</strong> solicitou sua análise sobre um ponto na DRE.${priorityBadge}
        </p>
        <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin:0 0 16px;">
          <p style="font-size:11px;font-weight:700;color:#1e40af;text-transform:uppercase;margin:0 0 8px;">Assunto</p>
          <p style="font-size:14px;font-weight:600;color:#1e3a5f;margin:0 0 12px;">${safeSubject}</p>
          <p style="font-size:11px;font-weight:700;color:#1e40af;text-transform:uppercase;margin:0 0 8px;">Dúvida</p>
          <p style="font-size:13px;color:#1e3a5f;margin:0;line-height:1.6;">${safeQuestion}</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:0 0 16px;">
          <p style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 6px;">Filtros aplicados</p>
          <p style="font-size:12px;color:#374151;margin:0;">${safeFilters}</p>
        </div>
        ${snapshotHtml}`;
      ctaLabel = 'Abrir DRE e Responder';
      break;

    case 'response':
      title = 'Resposta à sua Solicitação';
      body = `
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          <strong>${safeSender}</strong> respondeu sua solicitação sobre: <strong>${safeSubject}</strong>
        </p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:0 0 16px;">
          <p style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;margin:0 0 8px;">Resposta</p>
          <p style="font-size:13px;color:#14532d;margin:0;line-height:1.6;">${safeMessage}</p>
        </div>`;
      ctaLabel = 'Ver Resposta Completa';
      break;

    case 'approval':
      title = 'Sua Análise foi Aprovada';
      body = `
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          <strong>${safeSender}</strong> aprovou sua análise sobre: <strong>${safeSubject}</strong>
        </p>
        ${safeMessage ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;margin:0 0 16px;"><p style="font-size:13px;color:#14532d;margin:0;">${safeMessage}</p></div>` : ''}`;
      ctaLabel = 'Ver Detalhes';
      break;

    case 'rejection':
      title = 'Solicitação Devolvida';
      body = `
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          <strong>${safeSender}</strong> devolveu a solicitação sobre: <strong>${safeSubject}</strong>
        </p>
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 16px;">
          <p style="font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;margin:0 0 8px;">Motivo</p>
          <p style="font-size:13px;color:#7f1d1d;margin:0;line-height:1.6;">${safeMessage}</p>
        </div>`;
      ctaLabel = 'Responder Novamente';
      break;

    case 'sla_warning':
      title = 'Prazo se Aproximando';
      body = `
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          Você tem poucas horas para responder a solicitação de <strong>${safeSender}</strong>: <strong>${safeSubject}</strong>
        </p>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px;margin:0 0 16px;">
          <p style="font-size:13px;color:#92400e;margin:0;">Responda o quanto antes para evitar que o prazo expire.</p>
        </div>`;
      ctaLabel = 'Responder Agora';
      break;

    case 'sla_breach':
      title = 'Prazo Expirado';
      body = `
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          O prazo para responder a solicitação de <strong>${safeSender}</strong> expirou: <strong>${safeSubject}</strong>
        </p>
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;margin:0 0 16px;">
          <p style="font-size:13px;color:#991b1b;margin:0;">Esta solicitação está atrasada. Responda imediatamente.</p>
        </div>`;
      ctaLabel = 'Responder Agora';
      break;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1B75BB 0%,#152e55 100%);padding:32px;text-align:center;">
    <p style="font-size:24px;font-weight:700;color:#ffffff;margin:0 0 4px;">${escapeHtml(title)}</p>
    <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:0;">DRE Raiz — Gestão Financeira</p>
  </div>

  <!-- Body -->
  <div style="padding:32px;">
    <p style="font-size:15px;color:#374151;margin:0 0 20px;">Olá, <strong>${safeName}</strong></p>
    ${body}

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${escapeHtml(params.deepLink)}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1B75BB 0%,#152e55 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;box-shadow:0 4px 16px rgba(27,117,187,0.35);">
        ${ctaLabel}
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">DRE Raiz — Raiz Educação S.A.</p>
  </div>
</div>
</body></html>`;
}

function getEmailSubject(type: string, subject: string, senderName: string): string {
  switch (type) {
    case 'new_request': return `[DRE Raiz] Nova solicitação de análise: ${subject}`;
    case 'response': return `[DRE Raiz] Resposta: ${subject}`;
    case 'approval': return `[DRE Raiz] Análise aprovada: ${subject}`;
    case 'rejection': return `[DRE Raiz] Solicitação devolvida: ${subject}`;
    case 'sla_warning': return `[DRE Raiz] Prazo se aproximando: ${subject}`;
    case 'sla_breach': return `[DRE Raiz] Prazo expirado: ${subject}`;
    default: return `[DRE Raiz] ${subject}`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    type, recipientEmail, recipientName, senderName, subject, question,
    message, priority, filterSummary, deepLink, dreSnapshot,
  } = req.body || {};

  if (!type || !recipientEmail || !recipientName || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const html = buildInquiryEmail({
    type, recipientName, senderName, subject, question: question || '',
    message, priority, filterSummary: filterSummary || '', deepLink: deepLink || '',
    dreSnapshot,
  });

  const emailSubject = getEmailSubject(type, subject, senderName);

  // Enviar via Resend
  const RESEND_KEY = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    console.error('EMAIL_API_KEY não configurada');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_EMAIL_FROM,
        to: [recipientEmail],
        subject: emailSubject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email', details: err });
    }

    const result = await response.json();
    return res.status(200).json({ ok: true, id: result.id });
  } catch (err: any) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
