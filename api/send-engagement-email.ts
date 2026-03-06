import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as nodemailer from 'nodemailer';

const RESEND_EMAIL_FROM = 'DRE Raiz <onboarding@resend.dev>';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Nivel de engajamento (mesma logica do frontend)
function getLevel(score: number): { level: string; emoji: string; color: string; badgeBg: string } {
  if (score >= 75) return { level: 'Campeao(a)', emoji: '&#127942;', color: '#D97706', badgeBg: '#FEF3C7' };
  if (score >= 50) return { level: 'Engajado(a)', emoji: '&#128293;', color: '#059669', badgeBg: '#D1FAE5' };
  if (score >= 25) return { level: 'Moderado(a)', emoji: '&#11088;', color: '#2563EB', badgeBg: '#DBEAFE' };
  if (score > 0) return { level: 'Iniciante', emoji: '&#128065;', color: '#EA580C', badgeBg: '#FED7AA' };
  return { level: 'Inativo(a)', emoji: '&#9888;', color: '#DC2626', badgeBg: '#FEE2E2' };
}

function buildEngagementEmail(params: {
  name: string;
  email: string;
  score: number;
  days_inactive: number;
  total_sessions: number;
  total_minutes: number;
  active_days: number;
}): string {
  const { name, score, days_inactive, total_sessions, total_minutes, active_days } = params;
  const safeName = escapeHtml(name);
  const lvl = getLevel(score);

  // Titulo, saudacao, mensagem e CTA variam por nivel
  let bannerTitle: string;
  let bannerSubtitle: string;
  let bannerGradient: string;
  let greeting: string;
  let mainMessage: string;
  let closingMessage: string;
  let ctaText: string;
  let ctaGradient: string;

  if (score >= 75) {
    // CAMPEAO — celebracao
    bannerTitle = 'Voce e referencia no DRE Raiz!';
    bannerSubtitle = 'Seu engajamento esta excelente';
    bannerGradient = 'linear-gradient(135deg,#F59E0B 0%,#D97706 40%,#B45309 100%)';
    greeting = `Parabens, ${safeName}!`;
    mainMessage = `Voce e um(a) verdadeiro(a) <strong>campeao(a)</strong> de engajamento! Seu uso consistente da plataforma demonstra comprometimento com os resultados e com o rito do resultado. Continue assim — voce e exemplo para toda a equipe.`;
    closingMessage = 'Seu acompanhamento frequente e essencial para manter a qualidade das analises e antecipar desvios. A equipe de FP&A agradece sua dedicacao!';
    ctaText = 'Continuar acompanhando';
    ctaGradient = 'linear-gradient(135deg,#F59E0B,#D97706)';
  } else if (score >= 50) {
    // ENGAJADO — incentivo positivo
    bannerTitle = 'Bom trabalho, continue assim!';
    bannerSubtitle = 'Seu engajamento esta no caminho certo';
    bannerGradient = 'linear-gradient(135deg,#10B981 0%,#059669 40%,#047857 100%)';
    greeting = `Ola, ${safeName}!`;
    mainMessage = `Voce esta com um otimo ritmo de uso da plataforma! Seu nivel <strong>Engajado(a)</strong> mostra que voce acompanha os resultados com regularidade. Com um pouco mais de frequencia, voce pode chegar ao nivel <strong>Campeao(a)</strong>!`;
    closingMessage = 'Que tal dedicar mais alguns minutos esta semana para revisar a DRE e garantir que esta tudo sob controle? Cada acesso conta!';
    ctaText = 'Conferir resultados';
    ctaGradient = 'linear-gradient(135deg,#10B981,#059669)';
  } else if (score >= 25) {
    // MODERADO — convite a melhorar
    bannerTitle = 'Que tal acompanhar mais de perto?';
    bannerSubtitle = 'Seu engajamento pode melhorar';
    bannerGradient = 'linear-gradient(135deg,#3B82F6 0%,#2563EB 40%,#1D4ED8 100%)';
    greeting = `Ola, ${safeName}!`;
    mainMessage = `Percebemos que voce acessa o DRE Raiz de forma <strong>moderada</strong>. Sabemos que a rotina e corrida, mas o acompanhamento regular da DRE e fundamental para identificar desvios a tempo e garantir o cumprimento do orcado.`;
    closingMessage = 'Bastam <strong>10 a 15 minutos por dia</strong> para se manter atualizado. Sua participacao e importante para o rito do resultado — conte com a gente!';
    ctaText = 'Acessar DRE Raiz';
    ctaGradient = 'linear-gradient(135deg,#3B82F6,#1D4ED8)';
  } else if (score > 0) {
    // INICIANTE — chamado firme mas acolhedor
    bannerTitle = 'Precisamos de voce no DRE Raiz!';
    bannerSubtitle = 'Seu acompanhamento faz diferenca';
    bannerGradient = 'linear-gradient(135deg,#F97316 0%,#EA580C 40%,#C2410C 100%)';
    greeting = `Ola, ${safeName}!`;
    mainMessage = `Notamos que seu uso da plataforma esta <strong>abaixo do esperado</strong> esta semana. O acompanhamento da DRE nao e apenas uma formalidade — e a ferramenta que nos permite agir rapido quando algo sai do planejado.`;
    closingMessage = `Voce acessou apenas <strong>${total_sessions} vez(es)</strong> e ficou <strong>${total_minutes < 60 ? total_minutes + ' minutos' : Math.floor(total_minutes / 60) + 'h' + (total_minutes % 60 > 0 ? total_minutes % 60 + 'min' : '')}</strong> na plataforma nos ultimos 7 dias. Precisamos que voce participe mais ativamente para garantir a governanca dos resultados.`;
    ctaText = 'Acessar agora';
    ctaGradient = 'linear-gradient(135deg,#F97316,#EA580C)';
  } else {
    // INATIVO — urgencia
    bannerTitle = 'Sentimos sua falta!';
    bannerSubtitle = days_inactive > 1 ? 'Voce nao acessa ha ' + days_inactive + ' dias' : 'Voce nao utilizou a plataforma esta semana';
    bannerGradient = 'linear-gradient(135deg,#EF4444 0%,#DC2626 40%,#B91C1C 100%)';
    greeting = `Ola, ${safeName}!`;
    mainMessage = days_inactive > 7
      ? `Faz <strong>${days_inactive} dias</strong> que voce nao acessa o DRE Raiz. Sem o seu acompanhamento, desvios podem passar despercebidos e comprometer o cumprimento do orcado. <strong>Precisamos muito da sua participacao!</strong>`
      : `Voce <strong>nao utilizou a plataforma DRE Raiz esta semana</strong>. Mesmo que voce tenha feito login, nao houve nenhuma sessao de analise registrada nos ultimos 7 dias. Sem o seu acompanhamento ativo, desvios podem passar despercebidos e comprometer o cumprimento do orcado.`;
    closingMessage = 'O rito do resultado depende de cada pessoa da equipe. Sem sua analise, decisoes importantes podem ser tomadas sem a visao completa. Por favor, acesse a plataforma e dedique alguns minutos para revisar os resultados.';
    ctaText = 'Voltar ao DRE Raiz';
    ctaGradient = 'linear-gradient(135deg,#EF4444,#DC2626)';
  }

  const timeFormatted = total_minutes < 60 ? total_minutes + ' min' : Math.floor(total_minutes / 60) + 'h ' + (total_minutes % 60) + 'min';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${bannerTitle} - DRE Raiz</title>
</head>
<body style="margin:0; padding:24px 16px; background-color:#f3f4f6; font-family:'Inter',Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; margin:0 auto;">
<tr><td>
<div style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- BANNER -->
<div style="background:${bannerGradient}; padding:40px 32px; text-align:center;">
  <div style="width:56px; height:56px; background:rgba(255,255,255,0.2); border-radius:50%; margin:0 auto 16px; text-align:center; line-height:56px;">
    <span style="font-size:28px;">${lvl.emoji}</span>
  </div>
  <h1 style="font-size:22px; font-weight:700; color:#ffffff; margin:0 0 6px;">${bannerTitle}</h1>
  <p style="font-size:14px; color:rgba(255,255,255,0.85); margin:0;">${bannerSubtitle}</p>
</div>

<!-- BODY -->
<div style="padding:32px;">
  <p style="font-size:17px; font-weight:600; color:#111827; margin:0 0 12px;">${greeting}</p>
  <p style="font-size:14px; line-height:1.7; color:#4b5563; margin:0 0 24px;">${mainMessage}</p>

  <!-- NIVEL BADGE + STATS -->
  <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:20px; margin-bottom:24px;">
    <div style="text-align:center; margin-bottom:16px;">
      <span style="display:inline-block; background:${lvl.badgeBg}; color:${lvl.color}; font-size:14px; font-weight:700; padding:6px 20px; border-radius:20px; border:2px solid ${lvl.color};">
        ${lvl.emoji} ${lvl.level} &mdash; Score: ${score}/100
      </span>
    </div>
    <p style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 10px;">Seu resumo da semana</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:6px 0; border-bottom:1px solid #F1F5F9; font-size:13px; color:#64748b;">Sessoes</td>
        <td style="padding:6px 0; border-bottom:1px solid #F1F5F9; font-size:13px; font-weight:700; color:#111827; text-align:right;">${total_sessions}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; border-bottom:1px solid #F1F5F9; font-size:13px; color:#64748b;">Tempo total</td>
        <td style="padding:6px 0; border-bottom:1px solid #F1F5F9; font-size:13px; font-weight:700; color:#111827; text-align:right;">${timeFormatted}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; border-bottom:1px solid #F1F5F9; font-size:13px; color:#64748b;">Dias ativos</td>
        <td style="padding:6px 0; border-bottom:1px solid #F1F5F9; font-size:13px; font-weight:700; color:#111827; text-align:right;">${active_days}/7</td>
      </tr>
      <tr>
        <td style="padding:6px 0; font-size:13px; color:#64748b;">Ultimo acesso</td>
        <td style="padding:6px 0; font-size:13px; font-weight:700; color:${days_inactive > 7 ? '#DC2626' : days_inactive > 3 ? '#EA580C' : '#059669'}; text-align:right;">${days_inactive === 0 ? 'Hoje' : days_inactive === 1 ? 'Ontem' : days_inactive + ' dias atras'}</td>
      </tr>
    </table>
  </div>

  <p style="font-size:14px; line-height:1.7; color:#4b5563; margin:0 0 24px;">${closingMessage}</p>

  <!-- CTA -->
  <div style="text-align:center; margin:28px 0;">
    <a href="https://dre-raiz.vercel.app" target="_blank" style="display:inline-block; background:${ctaGradient}; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; padding:14px 40px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
      ${ctaText}
    </a>
  </div>

  <div style="height:1px; background:linear-gradient(to right,transparent,#e5e7eb,transparent); margin:24px 0;"></div>
  <p style="font-size:12px; color:#9ca3af; text-align:center; margin:0;">
    Este e um lembrete enviado pela plataforma DRE Raiz.<br>
    Em caso de duvidas, entre em contato com o time de FP&amp;A.
  </p>
</div>
</div>
</td></tr>
</table>
</body>
</html>`;
}

async function getSmtpConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase.from('smtp_config').select('*').eq('enabled', true).limit(1).single();
  return data;
}

async function sendViaSmtp(config: any, to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.use_tls,
    auth: { user: config.username, pass: config.password_encrypted },
  });
  await transporter.sendMail({
    from: `${config.from_name} <${config.from_email}>`,
    to,
    subject,
    html,
  });
  return { sent: true };
}

async function sendViaResend(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_EMAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return { sent: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, score, days_inactive, total_sessions, total_minutes, active_days } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'name and email required' });

  const s = score ?? 0;
  const lvl = getLevel(s);
  const subject = s >= 75
    ? `Parabens! Voce e referencia no DRE Raiz`
    : s >= 50
    ? `Bom trabalho! Continue acompanhando o DRE Raiz`
    : s >= 25
    ? `Lembrete: Acompanhe seus resultados no DRE Raiz`
    : s > 0
    ? `Precisamos de voce no DRE Raiz!`
    : `Sentimos sua falta no DRE Raiz!`;

  const html = buildEngagementEmail({ name, email, score: s, days_inactive: days_inactive || 0, total_sessions: total_sessions || 0, total_minutes: total_minutes || 0, active_days: active_days || 0 });

  // Attempt 1: SMTP
  try {
    const smtpConfig = await getSmtpConfig();
    if (smtpConfig) {
      const result = await sendViaSmtp(smtpConfig, email, subject, html);
      return res.status(200).json({ ...result, provider: 'smtp' });
    }
  } catch (err: any) {
    console.warn('SMTP failed, falling back to Resend:', err.message);
  }

  // Attempt 2: Resend
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No email provider configured' });

  try {
    const result = await sendViaResend(apiKey, email, subject, html);
    return res.status(200).json({ ...result, provider: 'resend' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
