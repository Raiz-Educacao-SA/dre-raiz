# ✅ Checklist de Setup - DRE RAIZ 2.0

Use este checklist para garantir que tudo está configurado corretamente.

---

## 📋 Pre-Flight Checklist

### 1. Pré-requisitos

- [ ] Node.js v18+ instalado
  ```bash
  node --version
  # Deve mostrar v18.x.x ou superior
  ```

- [ ] npm instalado
  ```bash
  npm --version
  # Deve mostrar alguma versão
  ```

- [ ] Git instalado (opcional, para clone)
  ```bash
  git --version
  ```

### 2. Projeto Clonado/Baixado

- [ ] Repositório clonado ou arquivos extraídos
- [ ] Navegado para o diretório do projeto
  ```bash
  cd "Ap proposta"
  ```

- [ ] Dependências instaladas
  ```bash
  npm install
  # Aguarde 2-5 minutos
  ```

### 3. Supabase Configurado

- [ ] Conta criada em https://app.supabase.com/
- [ ] Novo projeto criado no Supabase
- [ ] Aguardou ~2 minutos para provisionamento
- [ ] Tabela `transactions` criada (via SQL Editor)
- [ ] Tabela `manual_changes` criada (via SQL Editor)
- [ ] Índices criados para performance
- [ ] Dados de teste inseridos (pelo menos 4 transações)
- [ ] Credenciais copiadas (Project URL + anon key)

### 4. Variáveis de Ambiente

- [ ] Arquivo `.env.local` criado (copiado de `.env.example`)
- [ ] `VITE_SUPABASE_URL` configurado
- [ ] `VITE_SUPABASE_ANON_KEY` configurado
- [ ] Outras variáveis opcionais configuradas (se necessário)

### 5. Servidor de Desenvolvimento

- [ ] Servidor iniciado
  ```bash
  npm run dev
  ```

- [ ] Sem erros no terminal
- [ ] URL exibida: `http://localhost:5173`
- [ ] Navegador aberto automaticamente (ou abrir manualmente)

---

## 🧪 Testes de Funcionalidade

### Guia Lançamentos

- [ ] Página carrega sem erros
- [ ] Botão "Buscar Dados" funciona
- [ ] Tabela exibe as 4 transações de teste
- [ ] Filtros aparecem no topo
- [ ] Paginação aparece (se houver mais de 1000 registros)
- [ ] Edição inline funciona (clique duplo em célula)
- [ ] Botão "Exportar para Excel" funciona

#### Teste de Filtros
- [ ] Filtro de data funciona
- [ ] Filtro de cenário funciona
- [ ] Filtro de marca funciona
- [ ] Filtro de filial funciona
- [ ] Filtros de tags funcionam
- [ ] Busca de texto funciona (vendor, ticket, description)

### Guia Dashboard

- [ ] Página carrega sem erros
- [ ] KPIs aparecem no topo (cards com números)
- [ ] Gráficos renderizam corretamente
- [ ] Gráficos são interativos (hover mostra tooltips)
- [ ] Filtro de período funciona
- [ ] Botão "Exportar" aparece (se DashboardEnhanced)

### Guia DRE

- [ ] Página carrega sem erros
- [ ] Filtros de período aparecem
- [ ] Filtros de marca/filial/tags aparecem
- [ ] Botão "Atualizar DRE" funciona
- [ ] Hierarquia de 3 níveis aparece (tag0 → tag01 → conta_contabil)
- [ ] Setas de expansão aparecem à esquerda
- [ ] Expandir/colapsar linhas funciona
- [ ] MARGEM e EBITDA calculados corretamente

### Guia KPIs

- [ ] Página carrega sem erros
- [ ] Métricas agregadas aparecem
- [ ] Comparação de cenários funciona (REAL vs BUDGET)
- [ ] Variações percentuais calculadas

### Guia Forecasting

- [ ] Página carrega sem erros
- [ ] Previsões aparecem
- [ ] Gráficos de tendência renderizam
- [ ] Intervalos de confiança visíveis

### Painel Admin

- [ ] Página carrega sem erros
- [ ] Lista de mudanças manuais pendentes aparece
- [ ] Botões de aprovar/rejeitar funcionam
- [ ] Configurações de permissões aparecem

---

## 🔧 Funcionalidades Avançadas (Opcional)

### Funções RPC (DRE Otimizado)

- [ ] Arquivo `create_dre_rpc_functions.sql` executado no Supabase
- [ ] Função `get_dre_summary` criada
- [ ] Função `get_dre_dimension` criada
- [ ] Função `get_dre_filter_options` criada
- [ ] DRE carrega mais rápido com RPC

#### Validar Funções RPC
```sql
-- Execute no SQL Editor do Supabase
SELECT * FROM pg_proc WHERE proname = 'get_dre_summary';
-- Deve retornar 1 linha

SELECT * FROM pg_proc WHERE proname = 'get_dre_dimension';
-- Deve retornar 1 linha

SELECT * FROM pg_proc WHERE proname = 'get_dre_filter_options';
-- Deve retornar 1 linha
```

### RLS (Row-Level Security)

- [ ] Arquivo `SCRIPT_COMPLETO_RLS.sql` executado no Supabase
- [ ] Políticas RLS criadas
- [ ] Políticas habilitadas nas tabelas
- [ ] Usuários configurados com metadados
- [ ] Acesso restrito funcionando corretamente

#### Validar RLS
```sql
-- Execute no SQL Editor do Supabase
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'transactions';
-- Deve retornar várias políticas

-- Teste de acesso (como usuário autenticado)
SELECT * FROM transactions;
-- Deve retornar apenas registros que o usuário tem permissão
```

### Firebase (Autenticação)

- [ ] Projeto Firebase criado
- [ ] Web App adicionado ao projeto
- [ ] Credenciais copiadas para `.env.local`
- [ ] Login com Google funciona
- [ ] Logout funciona
- [ ] Proteção de rotas funciona

### Claude AI (Relatórios)

- [ ] API key da Anthropic configurada
- [ ] Backend proxy iniciado (`npm run backend`)
- [ ] Geração de relatórios com IA funciona
- [ ] Relatórios aparecem no dashboard

### Google Gemini (Insights)

- [ ] API key do Gemini configurada
- [ ] Insights com IA aparecem
- [ ] Previsões funcionam

---

## 🚨 Troubleshooting

### Erros Comuns e Soluções

#### ❌ "Supabase URL and Anon Key must be set"

**Solução:**
- [ ] Verificar se `.env.local` existe
- [ ] Verificar se variáveis estão corretas
- [ ] Reiniciar servidor (`Ctrl+C` e `npm run dev`)

#### ❌ "Failed to fetch"

**Solução:**
- [ ] Verificar se Supabase está acessível
- [ ] Testar URL no navegador
- [ ] Verificar credenciais
- [ ] Verificar RLS (pode estar bloqueando)

#### ❌ "Function get_dre_summary does not exist"

**Solução:**
- [ ] Executar `create_dre_rpc_functions.sql` no SQL Editor
- [ ] Verificar se funções foram criadas (query acima)

#### ❌ Tabela vazia / Sem dados

**Solução:**
- [ ] Executar INSERT de dados de teste
- [ ] Verificar no Table Editor se dados existem
- [ ] Verificar RLS (pode estar bloqueando)

#### ❌ Performance lenta

**Solução:**
- [ ] Verificar se índices foram criados
- [ ] Usar paginação (não "Buscar Tudo")
- [ ] Reduzir filtros simultâneos
- [ ] Verificar plano de query no Supabase

#### ❌ Erro ao exportar PPT/PDF/DOCX

**Solução:**
- [ ] Executar `npm install` novamente
- [ ] Verificar console do navegador
- [ ] Tentar com menos dados
- [ ] Limpar cache do navegador

#### ❌ "Port 5173 is already in use"

**Solução:**
- [ ] Matar processo: `npx kill-port 5173`
- [ ] Ou usar outra porta: `npm run dev -- --port 5174`

---

## 📊 Validação de Dados

### Verificar Dados no Banco

Execute no SQL Editor do Supabase:

```sql
-- Contar transações
SELECT COUNT(*) FROM transactions;
-- Deve retornar >= 4 (dados de teste)

-- Ver tipos de transações
SELECT type, COUNT(*) FROM transactions GROUP BY type;
-- Deve mostrar REVENUE, COST, EXPENSE

-- Ver cenários
SELECT scenario, COUNT(*) FROM transactions GROUP BY scenario;
-- Deve mostrar REAL (e BUDGET se tiver)

-- Ver marcas
SELECT marca, COUNT(*) FROM transactions GROUP BY marca;
-- Deve mostrar as marcas inseridas

-- Ver filiais
SELECT filial, COUNT(*) FROM transactions GROUP BY filial;
-- Deve mostrar as filiais inseridas
```

### Verificar Estrutura das Tabelas

```sql
-- Ver colunas da tabela transactions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions';
-- Deve mostrar 22 colunas

-- Ver índices
SELECT indexname FROM pg_indexes WHERE tablename = 'transactions';
-- Deve mostrar vários índices
```

---

## 🎯 Checklist Final

### Antes de Considerar "Pronto"

- [ ] Servidor de desenvolvimento roda sem erros
- [ ] Todas as guias carregam corretamente
- [ ] Dados de teste aparecem
- [ ] Filtros funcionam
- [ ] Paginação funciona (se aplicável)
- [ ] Edição inline funciona
- [ ] Gráficos renderizam
- [ ] Exportação funciona (pelo menos Excel)
- [ ] Console do navegador sem erros críticos

### Opcionais (se configurado)

- [ ] Funções RPC funcionando
- [ ] RLS configurado e testado
- [ ] Firebase autenticação funcionando
- [ ] Claude AI gerando relatórios
- [ ] Gemini gerando insights

---

## 📝 Notas

### Comandos Úteis

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Parar servidor
Ctrl+C

# Reinstalar dependências
npm install

# Limpar node_modules e reinstalar
rm -rf node_modules
npm install

# Build para produção
npm run build

# Preview da build
npm run preview

# Verificar porta em uso
npx kill-port 5173
```

### URLs Importantes

- **App Local:** http://localhost:5173
- **Supabase Dashboard:** https://app.supabase.com/
- **Firebase Console:** https://console.firebase.google.com/
- **Claude AI Console:** https://console.anthropic.com/
- **Gemini API:** https://makersuite.google.com/app/apikey

---

## ✅ Status Final

Marque quando completar:

- [ ] ✅ Setup básico completo (Supabase + .env)
- [ ] ✅ Servidor rodando sem erros
- [ ] ✅ Dados de teste inseridos
- [ ] ✅ Todas as guias testadas
- [ ] ✅ Funcionalidades principais funcionando
- [ ] ✅ Pronto para desenvolvimento/uso

---

**Data de Conclusão:** ___/___/______
**Tempo Total:** _____ minutos
**Problemas Encontrados:** ___________________________
**Soluções Aplicadas:** ___________________________

---

**Última atualização:** 10/02/2026
**Versão:** 2.0
