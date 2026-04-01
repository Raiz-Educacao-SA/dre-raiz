# 🗄️ TABELAS E OBJETOS FILTRADOS PELO RLS

**Sistema:** DRE Raiz - Controle de Row Level Security
**Última Atualização:** 11/02/2026

---

## 📊 VISÃO GERAL

O sistema de RLS filtra dados em **9 tabelas principais** do Supabase, aplicando permissões baseadas em **5 campos de filtro**.

---

## 🎯 CAMPOS DE FILTRO (PERMISSÕES)

| Campo Permissão | Tipo DB | Coluna Filtrada | Exemplos de Valores | Status |
|-----------------|---------|-----------------|---------------------|--------|
| **CIA (Marca)** | `text` | `marca` | "RAIZ", "SABER", "CLV" | ✅ Ativo |
| **Filial** | `text` | `nome_filial` | "CLV - Alfa", "RAIZ - Centro" | ✅ Ativo |
| **TAG01** | `text` | `tag01` | "Marketing", "Vendas" | ✅ Ativo |
| **TAG02** | `text` | `tag02` | "Operacional", "Estratégico" | ⚠️ Disponível |
| **TAG03** | `text` | `tag03` | "Projeto X", "Iniciativa Y" | ⚠️ Disponível |

---

## 🗃️ TABELAS DO BANCO DE DADOS

### 1️⃣ **transactions** (PRINCIPAL)

**Descrição:** Tabela principal com todas as transações financeiras

**Objeto TypeScript:** `Transaction`

**Campos Filtrados pelo RLS:**

| Campo DB | Tipo | Descrição | Filtro RLS |
|----------|------|-----------|------------|
| `marca` | text | Marca/CIA da transação | ✅ `IN (allowedMarcas)` |
| `nome_filial` | text | Nome completo da filial | ✅ `IN (allowedFiliais)` |
| `tag01` | text | Tag de Nível 2 | ✅ `IN (allowedTag01)` |
| `tag02` | text | Tag de Nível 3 | ✅ `IN (allowedTag02)` |
| `tag03` | text | Tag de Nível 4 | ✅ `IN (allowedTag03)` |

**Outros Campos Importantes (NÃO filtrados por RLS):**
- `id` (uuid, PK)
- `description` (text)
- `amount` (numeric)
- `date` (date)
- `conta_contabil` (text)
- `type` (text: REVENUE, FIXED_COST, VARIABLE_COST, SGA, RATEIO)
- `filial` (text - código da filial: "01", "02", etc.)
- `status` (text)
- `scenario` (text)
- `tag0` (text - Nível 1)
- `ticket`, `vendor`, `recurring`, `nat_orc`, `chave_id`, `justification`
- `updated_at` (timestamp)

**Queries que aplicam RLS:**
```sql
-- Via permissionsService.ts (applyPermissionFilters)
SELECT * FROM transactions
WHERE marca IN ('RAIZ', 'SABER')
  AND nome_filial IN ('CLV - Alfa', 'RAIZ - Centro')
  AND tag01 IN ('Marketing', 'Vendas')
```

**Funções RPC que aplicam filtros:**
- `get_dre_summary(p_marcas, p_nome_filiais, p_tags01)`
- `get_dre_dimension(p_marcas, p_nome_filiais, p_tags01)`

**Onde é usada:**
- ✅ TransactionsView (query direta)
- ✅ Dashboard, KPIs, Analysis, Forecasting (filtro client-side)
- ✅ DREView (via RPC)
- ✅ AdminPanel (carrega opções de dropdown)

---

### 2️⃣ **transactions_orcado** (CENÁRIO: ORÇADO)

**Descrição:** Tabela de transações do cenário "Orçado" - dados planejados/orçamentários

**Objeto TypeScript:** `Transaction` (mesma interface)

**Campos Filtrados pelo RLS:**

| Campo DB | Tipo | Descrição | Filtro RLS |
|----------|------|-----------|------------|
| `marca` | text | Marca/CIA da transação | ✅ `IN (allowedMarcas)` |
| `nome_filial` | text | Nome completo da filial | ✅ `IN (allowedFiliais)` |
| `tag01` | text | Tag de Nível 2 | ✅ `IN (allowedTag01)` |
| `tag02` | text | Tag de Nível 3 | ✅ `IN (allowedTag02)` |
| `tag03` | text | Tag de Nível 4 | ✅ `IN (allowedTag03)` |

**Estrutura:** Idêntica a `transactions` (mesmos campos)

**Diferenças:**
- `scenario` = "Orçado" por padrão
- Dados de planejamento/orçamento (não realizados)

**Políticas RLS:**
```sql
-- Via APLICAR_RLS_SCENARIO_TABLES.sql
SELECT * FROM transactions_orcado
WHERE marca = ANY(get_user_permissions('cia'))
  AND nome_filial = ANY(get_user_permissions('filial'))
  AND tag01 = ANY(get_user_permissions('tag01'))
```

**Onde é usada:**
- ✅ DREView (comparação Realizado vs Orçado)
- ✅ Dashboard (análise de variância)

---

### 3️⃣ **transactions_ano_anterior** (CENÁRIO: ANO ANTERIOR)

**Descrição:** Tabela de transações do cenário "A-1" - dados do ano anterior

**Objeto TypeScript:** `Transaction` (mesma interface)

**Campos Filtrados pelo RLS:**

| Campo DB | Tipo | Descrição | Filtro RLS |
|----------|------|-----------|------------|
| `marca` | text | Marca/CIA da transação | ✅ `IN (allowedMarcas)` |
| `nome_filial` | text | Nome completo da filial | ✅ `IN (allowedFiliais)` |
| `tag01` | text | Tag de Nível 2 | ✅ `IN (allowedTag01)` |
| `tag02` | text | Tag de Nível 3 | ✅ `IN (allowedTag02)` |
| `tag03` | text | Tag de Nível 4 | ✅ `IN (allowedTag03)` |

**Estrutura:** Idêntica a `transactions` (mesmos campos)

**Diferenças:**
- `scenario` = "A-1" por padrão
- Dados históricos do ano anterior
- Datas no ano 2025 (ano anterior a 2026)

**Políticas RLS:**
```sql
-- Via APLICAR_RLS_SCENARIO_TABLES.sql
SELECT * FROM transactions_ano_anterior
WHERE marca = ANY(get_user_permissions('cia'))
  AND nome_filial = ANY(get_user_permissions('filial'))
  AND tag01 = ANY(get_user_permissions('tag01'))
```

**Onde é usada:**
- ✅ DREView (comparação Realizado vs A-1)
- ✅ Dashboard (análise YoY - Year over Year)

---

### 4️⃣ **manual_changes**

**Descrição:** Tabela com solicitações de alterações manuais em transações

**Objeto TypeScript:** `ManualChange`

**Filtros Aplicados:**
- ❌ **NÃO aplica filtros de RLS diretamente**
- ✅ Filtrado **indiretamente** via `transactionId` (a transação original já foi filtrada)

**Campos:**
- `id` (uuid, PK)
- `transactionId` (uuid, FK → transactions.id)
- `originalTransaction` (jsonb)
- `description` (text)
- `type` (text)
- `fieldChanged`, `oldValue`, `newValue`, `justification`
- `status` (text: Pendente, Aplicado, Reprovado)
- `requestedAt`, `requestedBy`, `requestedByName`
- `approvedAt`, `approvedBy`, `approvedByName`

**Onde é usada:**
- ManualChangesView (mostra apenas mudanças das transações que o usuário pode ver)

---

### 5️⃣ **users**

**Descrição:** Usuários do sistema

**Objeto TypeScript:** `User` (simplificado na UI), banco tem mais campos

**Filtros RLS:**
- ❌ **NÃO filtrado** - Admins veem todos os usuários

**Campos:**
- `id` (uuid, PK)
- `email` (text)
- `name` (text)
- `role` (text: admin, editor, viewer)
- `photo` (text - URL)
- `created_at` (timestamp)

**Onde é usada:**
- AdminPanel (gerenciamento de usuários)
- AuthContext (usuário logado)

---

### 6️⃣ **user_permissions**

**Descrição:** Permissões de RLS atribuídas aos usuários

**Objeto TypeScript:** (estrutura interna, não exportada)

**Filtros RLS:**
- ❌ **NÃO filtrado** - Admins veem todas as permissões

**Campos:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `permission_type` (text: "cia", "filial", "centro_custo", "tag01")
- `permission_value` (text: valor específico da permissão)
- `created_at` (timestamp)

**Onde é usada:**
- AdminPanel (CRUD de permissões)
- AuthContext (carrega permissões do usuário logado)
- permissionsService (aplica filtros baseados nas permissões)

---

### 7️⃣ **tag0_map**

**Descrição:** Mapeamento de códigos de tag0 (hierarquia DRE)

**Filtros RLS:**
- ❌ **NÃO filtrado** - Tabela de referência pública

**Campos:**
- `cod_tag0` (text, PK - ex: "01.01", "02.01")
- `nome_tag0` (text - ex: "RECEITA", "CUSTOS")

**Onde é usada:**
- DREView (resolução de hierarquia)

---

### 8️⃣ **filial**

**Descrição:** Cadastro de filiais

**Filtros RLS:**
- ❌ **NÃO filtrado** - Tabela de referência pública

**Campos:**
- Estrutura não totalmente mapeada, mas inclui:
- Código da filial
- Nome da filial
- Marca associada

**Onde é usada:**
- MultiSelect de filtros (lista de filiais disponíveis)

---

### 9️⃣ **conta_contabil**

**Descrição:** Plano de contas contábeis (hierarquia)

**Objeto TypeScript:** `ContaContabilOption`

**Filtros RLS:**
- ❌ **NÃO filtrado** - Tabela de referência pública

**Campos:**
- `cod_conta` (text, PK - código da conta)
- `nome_nat_orc` (text - nome da natureza orçamentária)
- `tag0` (text - Nível 1)
- `tag01` (text - Nível 2)
- `tag02` (text - Nível 3)
- `tag03` (text - Nível 4)

**Onde é usada:**
- DREView (hierarquia de contas)
- TransactionsView (lista de contas disponíveis)

---

## 🔧 OBJETOS TYPESCRIPT

### Interface: `Transaction`

```typescript
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  conta_contabil: string;
  category?: string;
  type: TransactionType;
  filial: string;
  status: TransactionStatus;
  scenario?: string;

  // 🔒 CAMPOS FILTRADOS PELO RLS
  marca?: string;         // Filtro: CIA
  nome_filial?: string;   // Filtro: FILIAL
  tag01?: string;         // Filtro: TAG01
  tag02?: string;         // Filtro: TAG02
  tag03?: string;         // Filtro: TAG03

  // Outros campos
  tag0?: string;
  ticket?: string;
  vendor?: string;
  recurring?: string;
  nat_orc?: string;
  chave_id?: string;
  justification?: string;
  updated_at: string;
}
```

### Interface: `ManualChange`

```typescript
export interface ManualChange {
  id: string;
  transactionId: string;  // 🔒 FK para transaction filtrada
  originalTransaction: Transaction;
  description: string;
  type: 'CONTA' | 'DATA' | 'RATEIO' | 'EXCLUSAO' | 'MARCA' | 'FILIAL' | 'MULTI';
  fieldChanged?: string;
  oldValue: string;
  newValue: string;
  justification?: string;
  status: 'Pendente' | 'Aplicado' | 'Reprovado';
  requestedAt: string;
  requestedBy: string;
  requestedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
}
```

### Interface: `ContaContabilOption`

```typescript
export interface ContaContabilOption {
  cod_conta: string;
  nome_nat_orc: string | null;
  tag0: string | null;   // Nível 1
  tag01: string | null;  // Nível 2 (usado no RLS)
  tag02: string | null;  // Nível 3 (usado no RLS)
  tag03: string | null;  // Nível 4 (usado no RLS)
}
```

---

## 📍 PONTOS DE APLICAÇÃO DO RLS

### 🔹 Server-Side (Supabase)

| Método | Arquivo | Tabela | Como Filtra |
|--------|---------|--------|-------------|
| `applyPermissionFilters()` | permissionsService.ts | `transactions` | Query builder `.in()` |
| `addPermissionFiltersToObject()` | permissionsService.ts | `transactions` | Adiciona ao objeto de filtros |
| `get_dre_summary()` | RPC PostgreSQL | `transactions` | WHERE com parâmetros |
| `get_dre_dimension()` | RPC PostgreSQL | `transactions` | WHERE com parâmetros |

### 🔹 Client-Side (React)

| Método | Arquivo | Onde Usado |
|--------|---------|------------|
| `filterTransactionsByPermissions()` | permissionsService.ts | Dashboard, KPIs, Analysis, Forecasting |
| Props `allowedMarcas/Filiais/Tag01` | DREView.tsx | DRE Gerencial |

---

## 🎯 FLUXO COMPLETO DE FILTRO

```
1. Login do Usuário
   ↓
2. AuthContext carrega user_permissions do banco
   ↓
3. Transforma em allowedMarcas/allowedFiliais/allowedTag01/etc
   ↓
4. permissionsService armazena globalmente
   ↓
5. CADA QUERY aplica filtros:

   A) Server-side (TransactionsView, DRE RPCs):
      SELECT * FROM transactions
      WHERE marca IN ('RAIZ')
        AND nome_filial IN ('CLV - Alfa')
        AND tag01 IN ('Marketing')

   B) Client-side (Dashboard, KPIs, etc):
      transactions.filter(t =>
        allowedMarcas.includes(t.marca) &&
        allowedFiliais.includes(t.nome_filial) &&
        allowedTag01.includes(t.tag01)
      )
   ↓
6. Usuário vê SOMENTE dados permitidos em TODAS as guias
```

---

## 📋 RESUMO

| Item | Quantidade |
|------|------------|
| **Tabelas filtradas diretamente** | 3 (transactions, transactions_orcado, transactions_ano_anterior) |
| **Tabelas filtradas indiretamente** | 1 (manual_changes via FK) |
| **Tabelas não filtradas** | 5 (users, user_permissions, tag0_map, filial, conta_contabil) |
| **Campos de filtro ativos** | 3 (marca, nome_filial, tag01) |
| **Campos de filtro disponíveis** | 5 (+ tag02, tag03) |
| **Pontos de aplicação RLS** | 9 (3 server + 6 client) |
| **Interfaces TypeScript** | 3 principais (Transaction, ManualChange, ContaContabilOption) |

---

## ⚠️ IMPORTANTE

**TUDO se baseia nas 3 tabelas de transações!**

- ✅ `transactions` = Dados realizados (cenário atual)
- ✅ `transactions_orcado` = Dados planejados (cenário orçamentário)
- ✅ `transactions_ano_anterior` = Dados históricos (ano anterior)
- ✅ Todas têm a **MESMA estrutura** e os **MESMOS filtros de RLS**
- ✅ `manual_changes` é automaticamente filtrado via FK
- ✅ Tabelas de referência (tag0_map, filial, conta_contabil) são públicas

**Para adicionar novo filtro:**
1. Adicionar campo nas 3 tabelas de transações (`transactions`, `transactions_orcado`, `transactions_ano_anterior`)
2. Adicionar em `user_permissions.permission_type`
3. Adicionar em `permissionsService.ts` (3 funções)
4. Adicionar em `DREView.tsx` (props + 2 aplicações)
5. Adicionar em RPCs PostgreSQL (`get_dre_summary`, `get_dre_dimension`)
6. Adicionar políticas RLS nas 3 tabelas (via SQL - ver `APLICAR_RLS_SCENARIO_TABLES.sql`)
7. Atualizar `AdminPanel.tsx` (lista de opções)

---

**MAPEAMENTO COMPLETO E ATUALIZADO** ✅
