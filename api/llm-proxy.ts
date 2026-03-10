import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── CORS ──

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

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Anthropic handler ──

async function handleAnthropic(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  try {
    const { model, max_tokens, system, messages, temperature } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: max_tokens || 2000,
        system,
        messages,
        temperature: temperature || 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Erro no serviço de IA (${response.status})`
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error calling Anthropic API:', error);
    return res.status(500).json({
      error: 'Serviço de IA indisponível'
    });
  }
}

// ── Groq handler ──

async function handleGroq(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

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

// ── Generate AI handler ──

// Lazy imports — só carregam quando handleGenerateAi é chamado
// Evita crash na inicialização da serverless function para outras actions
type AnalysisContext = import('../types').AnalysisContext;

function analysisPackJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      meta: {
        type: "object",
        additionalProperties: false,
        properties: {
          org_name: { type: "string" },
          period_label: { type: "string" },
          scope_label: { type: "string" },
          currency: { type: "string", enum: ["BRL", "USD", "EUR"] },
          generated_at_iso: { type: "string" },
        },
        required: ["org_name", "period_label", "scope_label", "currency", "generated_at_iso"],
      },
      executive_summary: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          opportunities: { type: "array", items: { type: "string" } },
        },
        required: ["headline", "bullets", "risks", "opportunities"],
      },
      actions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            owner: { type: "string" },
            action: { type: "string" },
            eta: { type: "string" },
            expected_impact: { type: "string" },
          },
          required: ["owner", "action", "eta", "expected_impact"],
        },
      },
      charts: { type: "array", items: { type: "object" } },
      slides: { type: "array", items: { type: "object" } },
    },
    required: ["meta", "executive_summary", "actions", "charts", "slides"],
  };
}

async function handleGenerateAi(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Lazy imports — só carrega quando esta action é chamada
    const { callClaudeJSON } = await import('../services/claudeService');
    const { buildSystemPrompt, buildUserPrompt } = await import('../analysisPack/utils/prompts');
    const { AnalysisPackSchema } = await import('../analysisPack/types/schema');

    const body = req.body as { context: AnalysisContext };

    if (!body?.context) {
      return res.status(400).json({
        error: 'context obrigatório',
        message: 'O body deve conter um objeto "context" do tipo AnalysisContext'
      });
    }

    const system = buildSystemPrompt();
    const user = buildUserPrompt(body.context);

    const raw = await callClaudeJSON({
      system,
      user,
      jsonSchema: analysisPackJsonSchema(),
      maxTokens: 5000,
    });

    const parsed = AnalysisPackSchema.safeParse(raw);
    if (!parsed.success) {
      return res.status(422).json({
        error: 'IA retornou JSON inválido (Zod)',
        issues: parsed.error.issues
      });
    }

    return res.status(200).json({
      success: true,
      data: parsed.data
    });

  } catch (error: any) {
    console.error('Error generating AnalysisPack with AI:', error);

    if (error.message?.includes('Claude API erro')) {
      return res.status(502).json({
        error: 'Erro ao comunicar com Claude API',
        message: error.message
      });
    }

    if (error.message?.includes('not configured')) {
      return res.status(500).json({
        error: 'API key não configurada',
        message: 'Configure ANTHROPIC_API_KEY no .env'
      });
    }

    return res.status(500).json({
      error: 'Erro interno ao gerar análise',
      message: error.message
    });
  }
}

// ── Enrich Variance handler ──

async function handleEnrichVariance(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Anthropic API key not configured' });

  try {
    const { system, user } = req.body;
    if (!system || !user) {
      return res.status(400).json({ error: 'system e user são obrigatórios' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system,
        messages: [{ role: 'user', content: user }],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error (enrich-variance):', response.status, errText);
      return res.status(response.status).json({ error: `Erro Claude API (${response.status})` });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'Resposta vazia do Claude' });

    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      const match = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || text.match(/(\{[\s\S]*\})/);
      if (match) {
        return res.status(200).json(JSON.parse(match[1]));
      }
      return res.status(422).json({ error: 'IA retornou texto não-JSON' });
    }
  } catch (error: any) {
    console.error('Error enriching variance:', error);
    return res.status(500).json({ error: 'Serviço de IA indisponível' });
  }
}

// ── Router ──

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  switch (action) {
    case 'anthropic': return handleAnthropic(req, res);
    case 'groq': return handleGroq(req, res);
    case 'generate-ai': return handleGenerateAi(req, res);
    case 'enrich-variance': return handleEnrichVariance(req, res);
    default: return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}
