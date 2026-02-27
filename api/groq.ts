import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://dre-raiz.vercel.app',
  'https://dre-raiz-git-master.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getCorsOrigin(req: VercelRequest): string {
  const origin = req.headers.origin as string | undefined;
  if (origin && ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith('.vercel.app'))) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Groq API key not configured' });

  try {
    const { model, max_tokens, system, messages, temperature } = req.body;

    const groqMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        max_tokens: max_tokens || 1500,
        messages: groqMessages,
        temperature: temperature || 0.6,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', response.status, err);
      return res.status(response.status).json({ error: `Erro no serviço de IA (${response.status})` });
    }

    // Converte resposta OpenAI → formato Anthropic para o cliente não precisar saber do fallback
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (error: any) {
    console.error('Error calling Groq API:', error);
    return res.status(500).json({ error: 'Serviço de IA indisponível' });
  }
}
