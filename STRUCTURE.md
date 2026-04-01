# Estrutura do Projeto — DRE Raiz

> Organizado em 27/03/2026. Build validado após reorganização.

---

## Raiz do Projeto (apenas o essencial)

```
/
├── App.tsx              # Componente raiz — roteamento e estado global
├── AuthContext.tsx       # Context de autenticação Firebase + Supabase
├── index.tsx            # Entry point React
├── index.html           # HTML shell (Tailwind CDN aqui)
├── index.css            # Design tokens CSS
├── constants.ts         # Constantes globais da aplicação
├── types.ts             # Tipos TypeScript globais
├── theme.ts             # Tema e tokens de cor
├── firebase.ts          # Inicialização Firebase
├── supabase.ts          # Inicialização Supabase
├── favicon-opcoes.html  # Preview das opções de favicon
│
├── package.json         # Dependências NPM
├── vite.config.ts       # Build Vite + proxies LLM
├── tsconfig.json        # TypeScript config (@/* alias → raiz)
├── tailwind.config.js   # Tailwind config
├── postcss.config.js    # PostCSS
├── vercel.json          # Deploy config Vercel
├── requirements.txt     # Dependências Python (scripts de sync)
│
├── README.md            # Documentação principal
├── CLAUDE.md            # Instruções para o Claude Code
├── CHANGELOG.md         # Histórico de versões
└── STRUCTURE.md         # Este arquivo
```

> **Nota**: `App.tsx`, `AuthContext.tsx`, etc. estão na raiz porque o path alias `@/*`
> aponta para a raiz do projeto (veja `tsconfig.json`). Mover esses arquivos
> quebraria todos os imports.

---

## Código-Fonte

### `/components/` — Componentes React
| Pasta | Conteúdo |
|-------|----------|
| `components/agentTeam/` | Workstation da Equipe Alpha (Alex, Bruna, Carlos...) |
| `components/dashboard/` | Cockpit Financeiro (CockpitDashboard, KPICards, etc.) |
| `components/holding/` | Dashboard Holding |
| `components/inquiries/` | Sistema de Solicitações de Análise |
| `components/*.tsx` | Componentes principais: AdminPanel, SomaTagsView, TransactionsView... |

### `/services/` — Camada de Dados e Integrações
| Arquivo | Responsabilidade |
|---------|-----------------|
| `supabaseService.ts` | **~66KB** — RPCs, CRUD, cache, filtros de permissão |
| `anthropicService.ts` | Claude API — insights e narrativas |
| `permissionsService.ts` | Singleton global de permissões (marcas, filiais, tags) |
| `transactionCache.ts` | Cache client-side com TTL |
| `pptExportService.ts` | Geração de PPT/PPTX |
| `pdfExportService.ts` | Exportação PDF |
| `docxExportService.ts` | Exportação Word |
| `variancePpt*.ts` | Serviços PPT de Justificativas de Desvios |

### `/hooks/` — React Hooks customizados
- `useDashboardKpis.ts`, `useAnomalyDetection.ts`, `useBranchData.ts`, `usePermissions.ts`, `useIsMobile.ts`

### `/contexts/` — React Contexts
- `AuthContext.tsx` (raiz), `src/contexts/TransactionsContext.tsx`

### `/types/` — Tipos TypeScript
- `agentTeam.ts`, `agentTeamSchemas.ts`

### `/features/` — Módulos de Feature
- `features/visualBlocks/` — Framework de blocos visuais (Chart, KPI, Table, Text)

### `/src/` — Módulos de Sincronização (legado refatorado)
Contém serviços de sync offline-first: `SyncManager`, `ConflictResolver`, `CircuitBreaker`, `OperationQueue`

### `/core/` — Agentes Alpha
- `core/agents/alpha/` — Definições dos 7 agentes da Equipe Alpha

---

## API / Backend

### `/api/` — Funções Serverless Vercel
| Arquivo | Rota |
|---------|------|
| `llm-proxy.ts` | `/api/llm-proxy` — proxy Anthropic/Groq |
| `send-welcome-email.ts` | Email onboarding de novos usuários |
| `send-engagement-email.ts` | Email de engajamento |
| `send-inquiry-email.ts` | Notificação de solicitações |
| `inquiry-sla-check.ts` | Verificação SLA |
| `agent-team/` | Pipeline da Equipe Alpha |
| `sync/conta-contabil.ts` | Sincronização Conta Contábil |

---

## Banco de Dados

### `/database/` — SQL de produção
Migrações e funções aplicadas no Supabase de produção.

### `/database/adhoc/` — Scripts SQL avulsos (211 arquivos)
Scripts de diagnóstico, correção pontual, RLS, testes de query.
> Não são aplicados automaticamente — uso manual via Supabase SQL Editor.

### `/migrations/` — Migrations Formais
7 migrations versionadas para evolução do schema.

---

## Scripts e Automações

### `/scripts/` — Scripts Utilitários
| Tipo | Conteúdo |
|------|----------|
| `*.py` | Sync Fabric→Supabase, diagnóstico, carga de dados |
| `*.mjs` / `*.cjs` | Checks de BD, debug, execução de carga |
| `*.bat` / `*.sh` | Launchers Windows (iniciar servidor, executar sync) |

---

## Documentação

### `/docs/` — Toda a documentação técnica e de processo
| Pasta | Conteúdo |
|-------|----------|
| `docs/analysis/` | Análises, diagnósticos, relatórios, status (~43 arquivos) |
| `docs/architecture/` | Arquitetura, design system, mapeamentos (~13 arquivos) |
| `docs/deploy/` | Deploy Vercel, setup local, checklists (~8 arquivos) |
| `docs/debug/` | Debug, correções, investigações (~11 arquivos) |
| `docs/guides/` | Guias de uso, testes, configuração (~38 arquivos) |
| `docs/screenshots/` | Capturas de tela e imagens (~17 arquivos) |
| `docs/data/` | Excel, PDF, PPT de referência (~12 arquivos) |
| `docs/notes/` | Anotações, rascunhos, notas de execução (~19 arquivos) |
| `docs/processo-*.md` | Processos operacionais: PDD, recorrência, email, fornecedores |
| `docs/manual-*.md` | Manuais de usuário |

### `/logs/` — Logs de Sincronização
- `erros_sincronizacao_*.json` — Erros do sync Fabric→Supabase
- `registros_com_erro_*.json` — Registros com problema de importação

---

## Outros Diretórios

| Pasta | Uso |
|-------|-----|
| `/public/` | Assets estáticos (favicon, ícones) |
| `/dist/` | Build de produção (gerado pelo `npm run build`) |
| `/tests/` | Testes Playwright E2E |
| `/emails/` | Templates HTML de email |
| `/archive/` | Arquivos arquivados, legado |
| `/old/` | Código antigo/deprecated |
| `/output/` | Outputs gerados (PPTs, excels exportados) |
| `/node_modules/` | Dependências NPM (não versionar) |
| `/google-sheets-sync/` | Scripts de sync Google Sheets |
| `/positioning/`, `/product/`, `/governance/`, `/executive/`, `/roadmap/` | Docs estratégicos de negócio |
| `/analysisPack/` | Protótipo de framework de análise |
| `/chart-system-blueprint/` | Blueprint arquitetural do sistema de charts |

---

## Comandos de Desenvolvimento

```bash
npm run dev          # Vite dev server — porta 5173
npm run backend      # Express backend — porta 3002 (proxy AI)
npm run dev:full     # Backend + frontend juntos
npm run build        # Build produção
npm run preview      # Preview do build
```
