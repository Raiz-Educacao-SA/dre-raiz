import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        strictPort: false,
        proxy: {
          '/api/anthropic': {
            target: 'https://api.anthropic.com',
            changeOrigin: true,
            rewrite: () => '/v1/messages',
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('x-api-key', env.VITE_ANTHROPIC_API_KEY || '');
                proxyReq.setHeader('anthropic-version', '2023-06-01');
                proxyReq.removeHeader('origin');
                proxyReq.removeHeader('referer');
              });
            },
          },
          '/api/groq': {
            target: 'https://api.groq.com',
            changeOrigin: true,
            rewrite: () => '/openai/v1/chat/completions',
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Authorization', `Bearer ${env.VITE_GROQ_API_KEY || ''}`);
                proxyReq.removeHeader('origin');
                proxyReq.removeHeader('referer');
              });
            },
          },
        },
      },
      plugins: [react()],
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
