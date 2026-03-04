import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { host, port, username, password, from_name, from_email, use_tls, test_email } = req.body as {
      host: string;
      port: number;
      username: string;
      password: string;
      from_name: string;
      from_email: string;
      use_tls: boolean;
      test_email: string;
    };

    if (!host || !port || !username || !password || !from_email || !test_email) {
      return res.status(400).json({ error: 'Campos obrigatórios: host, port, username, password, from_email, test_email' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: username,
        pass: password,
      },
      tls: use_tls ? { rejectUnauthorized: false } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // Verifica conexão
    await transporter.verify();

    // Envia email de teste
    const info = await transporter.sendMail({
      from: `${from_name || 'DRE Raiz'} <${from_email}>`,
      to: test_email,
      subject: 'Teste de Configuração SMTP - DRE Raiz',
      html: `
        <div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto; padding:24px;">
          <div style="background:linear-gradient(135deg,#0284c7,#0369a1); padding:24px; border-radius:12px 12px 0 0; text-align:center;">
            <h1 style="color:#fff; font-size:20px; margin:0;">Teste SMTP OK</h1>
          </div>
          <div style="background:#fff; padding:24px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 12px 12px;">
            <p style="color:#374151; font-size:14px; line-height:1.6;">
              A configuração SMTP foi testada com sucesso!
            </p>
            <table style="width:100%; font-size:13px; color:#6b7280;">
              <tr><td style="padding:4px 0; font-weight:600;">Servidor</td><td style="text-align:right;">${host}:${port}</td></tr>
              <tr><td style="padding:4px 0; font-weight:600;">TLS</td><td style="text-align:right;">${use_tls ? 'Ativado' : 'Desativado'}</td></tr>
              <tr><td style="padding:4px 0; font-weight:600;">Remetente</td><td style="text-align:right;">${from_email}</td></tr>
              <tr><td style="padding:4px 0; font-weight:600;">Data</td><td style="text-align:right;">${new Date().toLocaleString('pt-BR')}</td></tr>
            </table>
            <p style="color:#9ca3af; font-size:12px; margin-top:16px;">
              Este email foi enviado automaticamente para verificar a configuração SMTP do DRE Raiz.
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: `Email de teste enviado para ${test_email}`,
    });
  } catch (err: any) {
    console.error('Erro no teste SMTP:', err);
    return res.status(200).json({
      success: false,
      error: err.message || 'Falha na conexão SMTP',
      code: err.code,
    });
  }
}
