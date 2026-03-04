import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        strictPort: false,
        proxy: {},
      },
      plugins: [
        react(),
        // Custom dev middleware for /api/llm-proxy — routes to Anthropic or Groq based on ?action=
        {
          name: 'llm-proxy-middleware',
          configureServer(server) {
            server.middlewares.use('/api/llm-proxy', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
              if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type',
                });
                res.end();
                return;
              }
              if (req.method !== 'POST') {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Method not allowed' }));
                return;
              }

              const url = new URL(req.url || '/', `http://${req.headers.host}`);
              const action = url.searchParams.get('action');

              // Read body
              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(chunk as Buffer);
              const body = Buffer.concat(chunks).toString();

              try {
                if (action === 'anthropic') {
                  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-api-key': env.VITE_ANTHROPIC_API_KEY || '',
                      'anthropic-version': '2023-06-01',
                      'anthropic-beta': 'prompt-caching-2024-07-31',
                    },
                    body,
                  });
                  const data = await upstream.text();
                  res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
                  res.end(data);
                } else if (action === 'groq') {
                  const parsed = JSON.parse(body);
                  const groqMessages = parsed.system
                    ? [{ role: 'system', content: parsed.system }, ...parsed.messages]
                    : parsed.messages;
                  const groqBody = JSON.stringify({
                    model: parsed.model || 'llama-3.3-70b-versatile',
                    max_tokens: parsed.max_tokens || 1500,
                    messages: groqMessages,
                    temperature: parsed.temperature || 0.6,
                  });

                  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${env.VITE_GROQ_API_KEY || ''}`,
                    },
                    body: groqBody,
                  });

                  if (!upstream.ok) {
                    const errText = await upstream.text();
                    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Erro no serviço de IA (${upstream.status})` }));
                    return;
                  }

                  const data = await upstream.json() as any;
                  const text = data.choices?.[0]?.message?.content || '';
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
                } else if (action === 'generate-ai') {
                  const parsed = JSON.parse(body);
                  const ctx = parsed.context;
                  if (!ctx) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'context obrigatório' }));
                    return;
                  }

                  // Load prompts via Vite SSR
                  const prompts = await server.ssrLoadModule('./analysisPack/utils/prompts.ts') as any;
                  const systemPrompt = prompts.buildSystemPrompt();
                  const userPrompt = prompts.buildUserPrompt(ctx);

                  const apiKey = env.VITE_ANTHROPIC_API_KEY || '';
                  if (!apiKey) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'VITE_ANTHROPIC_API_KEY não configurado' }));
                    return;
                  }

                  const model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
                  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-api-key': apiKey,
                      'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                      model,
                      max_tokens: 5000,
                      system: systemPrompt,
                      messages: [{ role: 'user', content: userPrompt }],
                    }),
                  });

                  if (!upstream.ok) {
                    const errText = await upstream.text();
                    console.error('Claude API error:', upstream.status, errText);
                    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Erro Claude API (${upstream.status})`, message: errText }));
                    return;
                  }

                  const aiData = await upstream.json() as any;
                  const aiText = aiData?.content?.[0]?.text;
                  if (!aiText) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Resposta vazia do Claude' }));
                    return;
                  }

                  try {
                    const result = JSON.parse(aiText);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, data: result }));
                  } catch {
                    // Try extracting JSON from markdown
                    const match = aiText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || aiText.match(/(\{[\s\S]*\})/);
                    if (match) {
                      const result = JSON.parse(match[1]);
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: true, data: result }));
                    } else {
                      res.writeHead(422, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ error: 'IA retornou texto não-JSON' }));
                    }
                  }
                } else {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
                }
              } catch (err: any) {
                console.error('LLM proxy error:', err.message, err.stack);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Serviço de IA indisponível', message: err.message }));
              }
            });
          },
        },
        // Dev middleware for /api/send-welcome-email — Resend email proxy
        {
          name: 'send-welcome-email-middleware',
          configureServer(server) {
            server.middlewares.use('/api/send-welcome-email', async (req: IncomingMessage, res: ServerResponse) => {
              if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type',
                });
                res.end();
                return;
              }
              if (req.method !== 'POST') {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Method not allowed' }));
                return;
              }

              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(chunk as Buffer);
              const body = JSON.parse(Buffer.concat(chunks).toString());

              try {
                // Inject EMAIL_API_KEY into process.env for the handler
                process.env.EMAIL_API_KEY = env.EMAIL_API_KEY || process.env.EMAIL_API_KEY || '';

                const mod = await server.ssrLoadModule('./api/send-welcome-email.ts');
                const mockReq = { method: 'POST', body } as any;
                let mockResult: any = null;
                const mockRes = {
                  status: (code: number) => ({
                    json: (data: any) => { mockResult = { code, data }; return mockRes; }
                  }),
                } as any;

                await mod.default(mockReq, mockRes);

                const code = mockResult?.code || 200;
                res.writeHead(code, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(mockResult?.data || { error: 'Sem resposta do handler' }));
              } catch (err: any) {
                console.error('send-welcome-email dev error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Otimizações de bundle
        rollupOptions: {
          output: {
            // Separar dependências em chunks específicos
            manualChunks: {
              // React core
              'vendor-react': ['react', 'react-dom'],
              // Gráficos (separados por serem pesados)
              'vendor-charts-recharts': ['recharts'],
              'vendor-charts-echarts': ['echarts', 'echarts-for-react'],
              // Supabase
              'vendor-supabase': ['@supabase/supabase-js'],
              // UI e ícones
              'vendor-ui': ['lucide-react'],
              // Exportação (PDFs, DOCX, PPTX)
              'vendor-export': ['pdfmake', 'docx', 'pptxgenjs', 'file-saver'],
              // IA (usado apenas em views específicas)
              'vendor-ai': ['@anthropic-ai/sdk', '@google/genai', '@google/generative-ai', 'groq-sdk'],
              // Utilitários
              'vendor-utils': ['lodash.debounce', 'xlsx', 'zod']
            }
          }
        },
        // Aumentar limite de warning (já otimizado com chunks)
        chunkSizeWarningLimit: 600,
        // Minificação
        minify: 'esbuild',
        // Source maps apenas em dev
        sourcemap: false
      },
      // Vitest
      test: {
        include: ['core/__tests__/**/*.test.ts'],
        exclude: ['**/*.spec.ts', 'node_modules'],
      },
      // Otimizações de dependências
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'recharts',
          'lucide-react',
          '@supabase/supabase-js'
        ],
        exclude: [
          // Excluir pacotes grandes que são lazy-loaded
          '@anthropic-ai/sdk',
          'groq-sdk'
        ]
      }
    };
});
