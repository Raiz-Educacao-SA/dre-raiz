# 📚 Índice da Documentação - DRE RAIZ 2.0

Guia completo de toda a documentação do projeto, organizada por categoria.

---

## 🚀 Para Começar

| Documento | Descrição | Tempo | Público |
|-----------|-----------|-------|---------|
| **[README.md](README.md)** | Documentação completa do projeto | 15 min | Todos |
| **[SETUP_LOCAL.md](SETUP_LOCAL.md)** | Guia rápido para rodar localmente | 5 min | Desenvolvedores |

---

## 📖 Documentação Técnica

### Arquitetura e Decisões

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| **[MEMORY.md](.claude/projects/.../memory/MEMORY.md)** | Histórico de decisões técnicas | Para entender o "porquê" das escolhas |
| **[fases-sync.md](fases-sync.md)** | Fases 1-5 da sincronização bidirecional | Para entender o sistema de sync |
| **[ajustes-06-02-2026.md](ajustes-06-02-2026.md)** | Ajustes recentes de filtros e paginação | Para ver as últimas mudanças |

### Mapeamento e Estrutura

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| **[MAPEAMENTO_COLUNAS.md](MAPEAMENTO_COLUNAS.md)** | DE-PARA banco ↔ UI (22 campos) | Para entender o mapeamento de dados |
| **[PAGINACAO_SERVER_SIDE.md](PAGINACAO_SERVER_SIDE.md)** | Documentação da paginação | Para entender a paginação otimizada |
| **[types.ts](types.ts)** | Types TypeScript do projeto | Para ver as interfaces e tipos |

### Funcionalidades Avançadas

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| **[guia-slides-graficos-raiz.md](guia-slides-graficos-raiz.md)** | Sistema de slides e exportação | Para entender exportação PPT/PDF/DOCX |
| **[fase6-scroll-infinito.md](fase6-scroll-infinito.md)** | Histórico do scroll infinito | Para entender por que foi removido |

---

## 🗄️ Scripts e Banco de Dados

### Scripts SQL

| Arquivo | Descrição | Quando Executar |
|---------|-----------|-----------------|
| **[create_dre_rpc_functions.sql](create_dre_rpc_functions.sql)** | Funções RPC PostgreSQL | Setup inicial + Deploy |
| **[SCRIPT_COMPLETO_RLS.sql](SCRIPT_COMPLETO_RLS.sql)** | Row-Level Security | Setup inicial + Deploy |
| **[ADICIONAR_PERMISSOES_GABRIEL.sql](ADICIONAR_PERMISSOES_GABRIEL.sql)** | Adicionar permissões de usuário | Quando adicionar usuários |
| **[CORRIGIR_RLS_EMAIL.sql](CORRIGIR_RLS_EMAIL.sql)** | Corrigir políticas RLS por email | Troubleshooting RLS |
| **[VALIDAR_RLS_GABRIEL.sql](VALIDAR_RLS_GABRIEL.sql)** | Validar permissões RLS | Troubleshooting RLS |

### Scripts Python

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **[fabric_to_supabase_v2.py](fabric_to_supabase_v2.py)** | Pipeline Microsoft Fabric → Supabase | Sync automático de dados |
| **[executar_sql_supabase.py](executar_sql_supabase.py)** | Executar scripts SQL via Python | Automação de scripts |

---

## 🎨 Componentes React

### Componentes Principais

| Arquivo | Descrição | Responsabilidade |
|---------|-----------|------------------|
| **[App.tsx](App.tsx)** | Componente raiz da aplicação | Roteamento e layout geral |
| **[index.tsx](index.tsx)** | Entry point do React | Bootstrap da aplicação |

### Views (Guias)

| Arquivo | Descrição | O que faz |
|---------|-----------|-----------|
| **[TransactionsView.tsx](components/TransactionsView.tsx)** | Guia "Lançamentos" | Tabela de transações, filtros, edição |
| **[DREView.tsx](components/DREView.tsx)** | Guia "DRE" | DRE gerencial com drill-down |
| **[Dashboard.tsx](components/Dashboard.tsx)** | Guia "Dashboard" | Dashboard principal |
| **[DashboardEnhanced.tsx](components/DashboardEnhanced.tsx)** | Dashboard avançado | Dashboard com exportação |
| **[ExecutiveDashboard.tsx](components/ExecutiveDashboard.tsx)** | Dashboard executivo | Visão executiva |
| **[KPIsView.tsx](components/KPIsView.tsx)** | Guia "KPIs" | Métricas e indicadores |
| **[ForecastingView.tsx](components/ForecastingView.tsx)** | Guia "Previsões" | Forecasting com ML |
| **[ManualChangesView.tsx](components/ManualChangesView.tsx)** | Aprovação de mudanças | Workflow de aprovação |
| **[AdminPanel.tsx](components/AdminPanel.tsx)** | Painel Admin | Configurações e permissões |
| **[XDREView.tsx](components/XDREView.tsx)** | DRE alternativo | Versão experimental |

### Componentes Auxiliares

| Arquivo | Descrição | Onde é usado |
|---------|-----------|--------------|
| **[Sidebar.tsx](components/Sidebar.tsx)** | Menu lateral | Navegação principal |
| **[ContaContabilSelector.tsx](components/ContaContabilSelector.tsx)** | Seletor de conta contábil | Filtros de DRE |

---

## 🛠️ Serviços

### Serviços Backend

| Arquivo | Descrição | Responsabilidade |
|---------|-----------|------------------|
| **[supabaseService.ts](services/supabaseService.ts)** | Queries Supabase | CRUD, filtros, paginação |
| **[SyncManager.ts](services/SyncManager.ts)** | Circuit breaker | Resiliência em sync |
| **[OperationQueue.ts](services/OperationQueue.ts)** | Retry logic | Tentativas automáticas |

### Serviços de Exportação

| Arquivo | Descrição | Formatos |
|---------|-----------|----------|
| **[slidePptxService.ts](services/slidePptxService.ts)** | Exportação PPT avançado | 12 layouts + 9 temas |
| **[pptExportService.ts](services/pptExportService.ts)** | Exportação PPT simples | Slides básicos |
| **[pdfExportService.ts](services/pdfExportService.ts)** | Exportação PDF | Via pdfmake |
| **[docxExportService.ts](services/docxExportService.ts)** | Exportação DOCX | Via docx |
| **[slideTypes.ts](services/slideTypes.ts)** | Types para slides | Interfaces |

---

## 🔧 Configuração

### Arquivos de Configuração

| Arquivo | Descrição | Quando Editar |
|---------|-----------|---------------|
| **[.env.example](.env.example)** | Exemplo de variáveis de ambiente | Referência para setup |
| **[.env.local](.env.local)** | Variáveis de ambiente locais | Setup inicial (não commitado) |
| **[vite.config.ts](vite.config.ts)** | Configuração do Vite | Customização do build |
| **[tsconfig.json](tsconfig.json)** | Configuração TypeScript | Customização do TS |
| **[package.json](package.json)** | Dependências e scripts | Adicionar deps/scripts |

### Contextos React

| Arquivo | Descrição | Estado gerenciado |
|---------|-----------|-------------------|
| **[TransactionsContext.tsx](contexts/TransactionsContext.tsx)** | Estado global de transações | Transações + Realtime |

### Utilitários

| Arquivo | Descrição | Funções |
|---------|-----------|---------|
| **[chartDataTransformer.ts](utils/chartDataTransformer.ts)** | Transformação de dados para gráficos | Agregações, formatação |

---

## 📊 Dados e Schemas

| Arquivo | Descrição | Conteúdo |
|---------|-----------|----------|
| **[supabase.ts](supabase.ts)** | Cliente Supabase + Types | DatabaseTransaction, DatabaseManualChange |
| **[types.ts](types.ts)** | Types gerais do projeto | Transaction, PaginationParams, etc. |
| **[metadata.json](metadata.json)** | Metadados do projeto | Configuração geral |

---

## 📱 UI e Estilos

| Arquivo | Descrição | Tecnologia |
|---------|-----------|------------|
| **[index.html](index.html)** | HTML raiz | TailwindCSS CDN |
| **[index.css](index.css)** | Estilos globais | CSS customizado |

---

## 🔍 Como Navegar na Documentação

### Para Setup Inicial
1. Comece com **[SETUP_LOCAL.md](SETUP_LOCAL.md)** (15 min)
2. Configure o banco com **[create_dre_rpc_functions.sql](create_dre_rpc_functions.sql)**
3. Configure RLS com **[SCRIPT_COMPLETO_RLS.sql](SCRIPT_COMPLETO_RLS.sql)**

### Para Entender o Sistema
1. Leia o **[README.md](README.md)** completo
2. Consulte **[MEMORY.md](.claude/projects/.../memory/MEMORY.md)** para decisões técnicas
3. Veja **[MAPEAMENTO_COLUNAS.md](MAPEAMENTO_COLUNAS.md)** para entender os dados

### Para Desenvolver
1. Explore os componentes em **[components/](components/)**
2. Consulte os serviços em **[services/](services/)**
3. Veja os types em **[types.ts](types.ts)**

### Para Troubleshooting
1. Consulte seção "Troubleshooting" no **[README.md](README.md)**
2. Execute scripts de validação: **[VALIDAR_RLS_GABRIEL.sql](VALIDAR_RLS_GABRIEL.sql)**
3. Verifique logs no console do navegador

### Para Entender Funcionalidades Específicas
- **Paginação:** [PAGINACAO_SERVER_SIDE.md](PAGINACAO_SERVER_SIDE.md)
- **Exportação:** [guia-slides-graficos-raiz.md](guia-slides-graficos-raiz.md)
- **Sincronização:** [fases-sync.md](fases-sync.md)
- **DRE:** [create_dre_rpc_functions.sql](create_dre_rpc_functions.sql) + [DREView.tsx](components/DREView.tsx)

---

## 🎯 Documentos por Público

### Para Product Owners / Gestores
- **[README.md](README.md)** - Visão geral e funcionalidades
- **[SETUP_LOCAL.md](SETUP_LOCAL.md)** - Como testar localmente

### Para Desenvolvedores Frontend
- **[components/](components/)** - Componentes React
- **[types.ts](types.ts)** - Interfaces TypeScript
- **[MAPEAMENTO_COLUNAS.md](MAPEAMENTO_COLUNAS.md)** - Mapeamento de dados

### Para Desenvolvedores Backend
- **[services/supabaseService.ts](services/supabaseService.ts)** - Queries e APIs
- **[create_dre_rpc_functions.sql](create_dre_rpc_functions.sql)** - Funções PostgreSQL
- **[fabric_to_supabase_v2.py](fabric_to_supabase_v2.py)** - Pipeline de dados

### Para DevOps / Infraestrutura
- **[vite.config.ts](vite.config.ts)** - Configuração de build
- **[.env.example](.env.example)** - Variáveis de ambiente
- **[SCRIPT_COMPLETO_RLS.sql](SCRIPT_COMPLETO_RLS.sql)** - Segurança

### Para QA / Testes
- **[SETUP_LOCAL.md](SETUP_LOCAL.md)** - Ambiente de testes
- Seção "Testando o Sistema" no **[README.md](README.md)**
- Scripts de validação SQL

---

## 📌 Documentos Importantes

### ⚠️ Leitura Obrigatória antes de Deploy
1. **[README.md](README.md)** - Documentação completa
2. **[create_dre_rpc_functions.sql](create_dre_rpc_functions.sql)** - Funções RPC
3. **[SCRIPT_COMPLETO_RLS.sql](SCRIPT_COMPLETO_RLS.sql)** - Segurança RLS
4. **[.env.example](.env.example)** - Variáveis de ambiente

### 📝 Atualizar ao Modificar o Sistema
- **[MEMORY.md](.claude/projects/.../memory/MEMORY.md)** - Decisões técnicas
- **[README.md](README.md)** - Funcionalidades e docs
- **[types.ts](types.ts)** - Interfaces (se mudar estrutura)

---

## 🆘 Precisa de Ajuda?

### Ordem de Consulta
1. **[README.md](README.md)** - Seção "Troubleshooting"
2. **[SETUP_LOCAL.md](SETUP_LOCAL.md)** - Seção "Problemas Comuns"
3. **Issues do GitHub** - Problemas conhecidos
4. **Time de Dev** - Contato direto

---

**Última atualização:** 10/02/2026
**Versão:** 2.0
