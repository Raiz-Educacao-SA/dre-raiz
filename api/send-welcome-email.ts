import type { VercelRequest, VercelResponse } from '@vercel/node';

// Domínio de teste do Resend — trocar para 'DRE Raiz <noreply@raizeducacao.com.br>' após verificar domínio
const EMAIL_FROM = 'DRE Raiz <onboarding@resend.dev>';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function roleLabel(role: string): string {
  switch (role) {
    case 'admin': return 'Administrador';
    case 'manager': return 'Gestor';
    case 'approver': return 'Aprovador';
    case 'viewer': return 'Visualizador';
    default: return role;
  }
}

function buildWelcomeEmail(params: {
  name: string;
  email: string;
  role: string;
  marcas: string;
  date: string;
}): string {
  const { name, email, role, marcas, date } = params;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeRole = escapeHtml(roleLabel(role));
  const safeMarcas = escapeHtml(marcas);
  const safeDate = escapeHtml(date);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Seu acesso ao DRE Raiz foi liberado!</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
</head>
<body style="margin:0; padding:24px 16px; background-color:#f3f4f6; font-family:'Inter',Arial,Helvetica,sans-serif; -webkit-font-smoothing:antialiased;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; margin:0 auto;">
<tr><td>
<div style="max-width:640px; margin:0 auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- BANNER -->
<div style="background:linear-gradient(135deg,#F08700 0%,#e07c00 40%,#7AC5BF 100%); padding:48px 40px 40px; text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
    <tr>
      <td style="width:48px; height:48px; background:rgba(255,255,255,0.2); border-radius:12px; text-align:center; vertical-align:middle;">
        <img src="https://img.icons8.com/ios-filled/48/ffffff/graduation-cap.png" alt="" width="28" height="28" style="display:inline-block;" />
      </td>
      <td style="padding-left:12px; text-align:left; vertical-align:middle;">
        <div style="font-size:28px; font-weight:700; color:#ffffff; letter-spacing:2px; line-height:1;">RAIZ</div>
        <div style="font-size:13px; font-weight:400; color:rgba(255,255,255,0.85); letter-spacing:1px;">educação</div>
      </td>
    </tr>
  </table>

  <div style="width:72px; height:72px; background:rgba(255,255,255,0.2); border-radius:50%; margin:0 auto 20px; border:2px solid rgba(255,255,255,0.3); text-align:center; line-height:72px;">
    <span style="font-size:36px; color:#ffffff;">&#10003;</span>
  </div>

  <h1 style="font-size:24px; font-weight:600; color:#ffffff; margin:0 0 8px;">Seu acesso foi liberado!</h1>
  <p style="font-size:15px; color:rgba(255,255,255,0.9); margin:0;">Bem-vindo(a) à plataforma DRE Raiz</p>
</div>

<!-- BODY -->
<div style="padding:40px;">

  <p style="font-size:18px; font-weight:600; color:#111827; margin:0 0 16px;">Olá, ${safeName}!</p>

  <p style="font-size:15px; line-height:1.7; color:#4b5563; margin:0 0 32px;">
    Sua solicitação de acesso à plataforma <strong>DRE Raiz</strong> foi aprovada.
    Agora você pode acessar o sistema e utilizar todas as funcionalidades disponíveis
    para o seu perfil.
  </p>

  <!-- INFO CARD -->
  <div style="background:linear-gradient(135deg,#FFF7ED 0%,#FFF4E6 100%); border:1px solid #FFE8CC; border-radius:12px; padding:24px; margin-bottom:32px;">
    <p style="font-size:14px; font-weight:600; color:#F08700; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 16px;">
      &#9432; Dados do seu acesso
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:8px 0; border-bottom:1px solid rgba(240,135,0,0.1); font-size:13px; color:#92400e; font-weight:500;">Email</td>
        <td style="padding:8px 0; border-bottom:1px solid rgba(240,135,0,0.1); font-size:13px; color:#78350f; font-weight:600; text-align:right;">${safeEmail}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; border-bottom:1px solid rgba(240,135,0,0.1); font-size:13px; color:#92400e; font-weight:500;">Perfil</td>
        <td style="padding:8px 0; border-bottom:1px solid rgba(240,135,0,0.1); text-align:right;">
          <span style="display:inline-block; background:#F08700; color:#ffffff; font-size:12px; font-weight:600; padding:3px 10px; border-radius:20px;">${safeRole}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0; border-bottom:1px solid rgba(240,135,0,0.1); font-size:13px; color:#92400e; font-weight:500;">Marcas</td>
        <td style="padding:8px 0; border-bottom:1px solid rgba(240,135,0,0.1); font-size:13px; color:#78350f; font-weight:600; text-align:right;">${safeMarcas}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:13px; color:#92400e; font-weight:500;">Liberado em</td>
        <td style="padding:8px 0; font-size:13px; color:#78350f; font-weight:600; text-align:right;">${safeDate}</td>
      </tr>
    </table>
  </div>

  <!-- STEPS -->
  <p style="font-size:16px; font-weight:600; color:#111827; margin:0 0 20px;">Como começar:</p>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
    <tr>
      <td style="width:32px; vertical-align:top;">
        <div style="width:32px; height:32px; background:linear-gradient(135deg,#F08700,#e07c00); color:#ffffff; font-size:14px; font-weight:700; border-radius:50%; text-align:center; line-height:32px;">1</div>
      </td>
      <td style="padding-left:16px; vertical-align:top;">
        <p style="font-size:14px; font-weight:600; color:#111827; margin:0 0 4px;">Acesse a plataforma</p>
        <p style="font-size:13px; color:#6b7280; margin:0; line-height:1.5;">Clique no botão abaixo ou acesse diretamente pelo navegador.</p>
      </td>
    </tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
    <tr>
      <td style="width:32px; vertical-align:top;">
        <div style="width:32px; height:32px; background:linear-gradient(135deg,#F08700,#e07c00); color:#ffffff; font-size:14px; font-weight:700; border-radius:50%; text-align:center; line-height:32px;">2</div>
      </td>
      <td style="padding-left:16px; vertical-align:top;">
        <p style="font-size:14px; font-weight:600; color:#111827; margin:0 0 4px;">Faça login com Google</p>
        <p style="font-size:13px; color:#6b7280; margin:0; line-height:1.5;">Use o mesmo email corporativo: <strong>${safeEmail}</strong></p>
      </td>
    </tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:36px;">
    <tr>
      <td style="width:32px; vertical-align:top;">
        <div style="width:32px; height:32px; background:linear-gradient(135deg,#F08700,#e07c00); color:#ffffff; font-size:14px; font-weight:700; border-radius:50%; text-align:center; line-height:32px;">3</div>
      </td>
      <td style="padding-left:16px; vertical-align:top;">
        <p style="font-size:14px; font-weight:600; color:#111827; margin:0 0 4px;">Explore o DRE Gerencial</p>
        <p style="font-size:13px; color:#6b7280; margin:0; line-height:1.5;">Navegue pela DRE, visualize lançamentos e acompanhe os resultados da sua marca.</p>
      </td>
    </tr>
  </table>

  <!-- CTA BUTTON -->
  <div style="text-align:center; margin:36px 0;">
    <a href="https://dre-raiz.vercel.app" target="_blank" style="display:inline-block; background:linear-gradient(135deg,#F08700 0%,#e07c00 100%); color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:16px 48px; border-radius:12px; letter-spacing:0.3px; box-shadow:0 4px 16px rgba(240,135,0,0.35);">
      Acessar DRE Raiz
    </a>
    <p style="margin:12px 0 0; font-size:13px; color:#9ca3af;">dre-raiz.vercel.app</p>
  </div>

  <!-- DIVIDER -->
  <div style="height:1px; background:linear-gradient(to right,transparent,#e5e7eb,transparent); margin:32px 0;"></div>

  <!-- FEATURES -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
    <tr>
      <td style="width:33%; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:20px 12px; text-align:center; vertical-align:top;">
        <div style="width:40px; height:40px; background:linear-gradient(135deg,#FFF4E6,#FFE8CC); border-radius:10px; margin:0 auto 12px; line-height:40px;">
          <span style="font-size:18px;">📊</span>
        </div>
        <p style="font-size:13px; font-weight:600; color:#111827; margin:0 0 4px;">DRE Gerencial</p>
        <p style="font-size:12px; color:#6b7280; margin:0; line-height:1.4;">Resultado consolidado</p>
      </td>
      <td style="width:8px;"></td>
      <td style="width:33%; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:20px 12px; text-align:center; vertical-align:top;">
        <div style="width:40px; height:40px; background:linear-gradient(135deg,#FFF4E6,#FFE8CC); border-radius:10px; margin:0 auto 12px; line-height:40px;">
          <span style="font-size:18px;">📋</span>
        </div>
        <p style="font-size:13px; font-weight:600; color:#111827; margin:0 0 4px;">Lançamentos</p>
        <p style="font-size:12px; color:#6b7280; margin:0; line-height:1.4;">Consulta e edição</p>
      </td>
      <td style="width:8px;"></td>
      <td style="width:33%; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:20px 12px; text-align:center; vertical-align:top;">
        <div style="width:40px; height:40px; background:linear-gradient(135deg,#FFF4E6,#FFE8CC); border-radius:10px; margin:0 auto 12px; line-height:40px;">
          <span style="font-size:18px;">🤖</span>
        </div>
        <p style="font-size:13px; font-weight:600; color:#111827; margin:0 0 4px;">Análise IA</p>
        <p style="font-size:12px; color:#6b7280; margin:0; line-height:1.4;">Narrativas inteligentes</p>
      </td>
    </tr>
  </table>

  <!-- HELP BOX -->
  <div style="background:linear-gradient(135deg,#F0FFFE 0%,#E1FFFC 100%); border:1px solid #C3FFF9; border-radius:12px; padding:20px 24px; margin-bottom:8px;">
    <p style="font-size:13px; color:#305F5C; line-height:1.5; margin:0;">
      <strong>Dúvidas?</strong> Entre em contato com o time de <strong>FP&amp;A</strong> ou responda este email.
    </p>
  </div>

</div>

<!-- FOOTER -->
<div style="background:#f9fafb; padding:32px 40px; text-align:center; border-top:1px solid #f3f4f6;">
  <p style="margin:0 0 4px;">
    <span style="font-size:18px; font-weight:700; color:#F08700; letter-spacing:1.5px;">RAIZ</span>
    <span style="font-size:11px; color:#7AC5BF; font-weight:500; margin-left:6px;">educação</span>
  </p>
  <p style="font-size:12px; color:#9ca3af; margin:8px 0 4px;"><strong>Raiz Educação S.A.</strong></p>
  <p style="font-size:12px; color:#9ca3af; margin:0 0 8px;">Plataforma DRE — Demonstração de Resultado do Exercício</p>
  <p style="margin:0 0 16px;"><a href="https://dre-raiz.vercel.app" style="color:#F08700; text-decoration:none; font-size:12px; font-weight:500;">dre-raiz.vercel.app</a></p>
  <p style="font-size:11px; color:#d1d5db; margin:0;">Este email foi enviado automaticamente. Por favor, não responda diretamente.</p>
</div>

</div>
</td></tr>
</table>

</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, role, marcas } = req.body as {
      name: string;
      email: string;
      role: string;
      marcas: string;
    };

    if (!email || !name) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, email' });
    }

    const apiKey = process.env.EMAIL_API_KEY;
    if (!apiKey) {
      console.error('⚠️ EMAIL_API_KEY não configurado');
      return res.status(200).json({ sent: false, reason: 'EMAIL_API_KEY não configurado' });
    }

    const date = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = buildWelcomeEmail({
      name,
      email,
      role: role || 'viewer',
      marcas: marcas || 'Acesso total',
      date,
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
        subject: 'Seu acesso ao DRE Raiz foi liberado!',
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('⚠️ Resend API erro:', emailRes.status, errBody);
      return res.status(200).json({ sent: false, reason: `Resend ${emailRes.status}: ${errBody}` });
    }

    const result = await emailRes.json();
    return res.status(200).json({ sent: true, id: result.id });
  } catch (err: any) {
    console.error('❌ Erro ao enviar email de boas-vindas:', err);
    return res.status(500).json({ error: err.message });
  }
}
