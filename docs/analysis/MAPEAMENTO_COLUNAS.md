# 📊 Mapeamento de Colunas - Transactions

## DE-PARA: Banco de Dados ↔ Interface ↔ UI

Este documento mostra o mapeamento completo entre as colunas da tabela `transactions` no Supabase, a interface TypeScript `Transaction`, e como são exibidas na UI de Lançamentos.

---

## 📋 Tabela Completa de Mapeamento

| # | Banco de Dados<br/>(DatabaseTransaction) | Interface TypeScript<br/>(Transaction) | UI - Lançamentos<br/>(TransactionsView) | Tipo | Obrigatório | Notas |
|---|------------------------------------------|----------------------------------------|------------------------------------------|------|-------------|-------|
| 1 | `id` | `id` | (Coluna oculta) | string | ✅ Sim | Chave primária (UUID) |
| 2 | `date` | `date` | **Data** | string | ✅ Sim | Formato: YYYY-MM-DD |
| 3 | `description` | `description` | **Descrição** | string | ✅ Sim | Texto livre |
| 4 | `conta_contabil` | `conta_contabil` | **Conta** | string | ✅ Sim | Conta contábil (popula coluna "Conta" na UI) |
| 4b | `category` | `category` | (Não usado) | string | ⚪ Opcional | Existe no banco, reservado para futuro |
| 5 | `amount` | `amount` | **Valor** | number | ✅ Sim | Valor numérico (R$) |
| 6 | `type` | `type` | (Implícito pela categoria) | TransactionType | ✅ Sim | REVENUE, FIXED_COST, VARIABLE_COST, SGA, RATEIO |
| 7 | `scenario` | `scenario` | **Cen** (Cenário) | string | ✅ Sim | Real, Orçado, Forecast, etc |
| 8 | `status` | `status` | **Status** | TransactionStatus | ✅ Sim | Normal, Pendente, Ajustado, Rateado, Excluído |
| 9 | `filial` | `filial` | **Filial** (ou **Unidade**) | string | ✅ Sim | Nome da filial/unidade |
| 10 | `marca` | `marca` | **Mar** (Marca) | string | ⚪ Opcional | Cogna, Vasta, Saber, etc |
| 11 | `tag01` | `tag01` | **Tag01** | string | ⚪ Opcional | Tag customizada 1 |
| 12 | `tag02` | `tag02` | **Tag02** | string | ⚪ Opcional | Tag customizada 2 |
| 13 | `tag03` | `tag03` | **Tag03** | string | ⚪ Opcional | Tag customizada 3 |
| 14 | `recurring` | `recurring` | **Recorrência** (ou Recorrente) | string | ⚪ Opcional | Sim, Não, Mensal, etc |
| 15 | `ticket` | `ticket` | **Tick** (Ticket) | string | ⚪ Opcional | Número do ticket |
| 16 | `vendor` | `vendor` | **Fornecedor** | string | ⚪ Opcional | Nome do fornecedor |
| 17 | `nat_orc` | `nat_orc` | (Não exibido na UI) | string | ⚪ Opcional | Natureza orçamentária |
| 18 | `chave_id` | `chave_id` | **ID** (na exportação) | string | ⚪ Opcional | ID externo/chave |
| 19 | `created_at` | (não mapeado) | (Não exibido) | string | ⚪ Auto | Timestamp de criação |
| 20 | `updated_at` | `updated_at` | (Não exibido) | string | ✅ Sim | Timestamp de atualização (para sync) |
| 21 | (não existe) | `justification` | **Justificativa** (na exportação) | string | ⚪ Opcional | Usado apenas em ManualChange |

---

## 🔍 Detalhamento por Coluna

### 1. ID (`id`)
- **Banco:** `id` (varchar/uuid)
- **Interface:** `id: string`
- **UI:** Não exibido na tabela principal (apenas em logs/debug)
- **Geração:** UUID gerado automaticamente pelo Supabase
- **Exemplo:** `"550e8400-e29b-41d4-a716-446655440000"`

---

### 2. Data (`date`)
- **Banco:** `date` (date ou text)
- **Interface:** `date: string`
- **UI:** Coluna **"Data"** (formato visual: MM/YYYY ou DD/MM/YYYY)
- **Formato armazenado:** `"YYYY-MM-DD"` (ex: `"2025-01-15"`)
- **Edição:** Input type="month" (UI aceita YYYY-MM e adiciona "-01")
- **Obrigatório:** ✅ Sim

---

### 3. Descrição (`description`)
- **Banco:** `description` (text)
- **Interface:** `description: string`
- **UI:** Coluna **"Descrição"** (largura: 180px, truncado com ellipsis)
- **Exemplo:** `"Compra de material didático para Q1"`
- **Edição:** Textarea multilinha no modal
- **Obrigatório:** ✅ Sim

---

### 4. Conta Contábil (`conta_contabil`)
- **Banco:** `conta_contabil` (text)
- **Interface:** `conta_contabil: string`
- **UI:** Coluna **"Conta"** (largura: 105px)
- **Exemplo:** `"Custos Variáveis > Material Didático"`
- **Filtro:** MultiSelect com valores dinâmicos do banco
- **Edição:** Select com opções de `ALL_CATEGORIES`
- **Obrigatório:** ✅ Sim
- **Nota:** Este é o campo que popula a coluna "Conta" na UI

### 4b. Categoria (`category`) - Reservado para Futuro
- **Banco:** `category` (text, nullable)
- **Interface:** `category?: string`
- **UI:** **Não exibido** (reservado para uso futuro)
- **Obrigatório:** ⚪ Opcional
- **Nota:** Campo existe no banco mas não é usado no momento

---

### 5. Valor (`amount`)
- **Banco:** `amount` (numeric ou float)
- **Interface:** `amount: number`
- **UI:** Coluna **"Valor"** (alinhado à direita, formato: R$ 1.234,56)
- **Exemplo:** `1500.50` → exibido como `"R$ 1.500,50"`
- **Edição:** Input type="number" com validação
- **Obrigatório:** ✅ Sim

---

### 6. Tipo (`type`)
- **Banco:** `type` (text)
- **Interface:** `type: TransactionType`
- **UI:** Não exibido diretamente (implícito pela categoria)
- **Valores possíveis:**
  - `'REVENUE'` - Receita
  - `'FIXED_COST'` - Custo Fixo
  - `'VARIABLE_COST'` - Custo Variável
  - `'SGA'` - Despesas Administrativas
  - `'RATEIO'` - Rateio
- **Obrigatório:** ✅ Sim

---

### 7. Cenário (`scenario`)
- **Banco:** `scenario` (text)
- **Interface:** `scenario?: string` (opcional na interface, mas tem default)
- **UI:** Coluna **"Cen"** (largura: 50px)
- **Valores comuns:** `"Real"`, `"Orçado"`, `"Forecast"`, `"Budget"`
- **Default:** `"Orçado"` (se não especificado)
- **Filtro:** Abas na UI (Real, Orçado, Forecast, etc)
- **Obrigatório:** ✅ Sim (com default)

---

### 8. Status (`status`)
- **Banco:** `status` (text)
- **Interface:** `status: TransactionStatus`
- **UI:** Coluna **"Status"** (largura: 70px, centralizado)
- **Valores possíveis:**
  - `'Normal'` - Badge verde
  - `'Pendente'` - Badge amarelo
  - `'Ajustado'` - Badge azul
  - `'Rateado'` - Badge roxo
  - `'Excluído'` - Badge vermelho
- **Obrigatório:** ✅ Sim

---

### 9. Filial (`filial`)
- **Banco:** `filial` (text)
- **Interface:** `filial: string`
- **UI:** Coluna **"Filial"** ou **"Unidade"** (largura: 100px)
- **Exemplo:** `"Filial São Paulo"`, `"Unidade RJ Centro"`
- **Filtro:** MultiSelect com valores de `BRANCHES` ou dinâmicos do banco
- **Obrigatório:** ✅ Sim

---

### 10. Marca (`marca`)
- **Banco:** `marca` (text, nullable)
- **Interface:** `marca?: string`
- **UI:** Coluna **"Mar"** (largura: 45px, abreviado)
- **Valores comuns:** `"Cogna"`, `"Vasta"`, `"Saber"`, `"Platos"`
- **Filtro:** MultiSelect com valores dinâmicos
- **Obrigatório:** ⚪ Opcional (mas recomendado)

---

### 11-13. Tags (`tag01`, `tag02`, `tag03`)
- **Banco:** `tag01`, `tag02`, `tag03` (text, nullable)
- **Interface:** `tag01?: string`, `tag02?: string`, `tag03?: string`
- **UI:** Colunas **"Tag01"** (75px), **"Tag02"** (85px), **"Tag03"** (85px)
- **Uso:** Tags customizáveis para categorização adicional
- **Exemplos:**
  - Tag01: `"Projeto X"`
  - Tag02: `"Q1 2025"`
  - Tag03: `"Departamento TI"`
- **Filtro:** MultiSelect com valores dinâmicos
- **Obrigatório:** ⚪ Opcional

---

### 14. Recorrência (`recurring`)
- **Banco:** `recurring` (text, nullable)
- **Interface:** `recurring?: string`
- **UI:** Filtro **"Recorrência"** (não exibido como coluna, mas disponível no filtro)
- **Valores comuns:** `"Sim"`, `"Não"`, `"Mensal"`, `"Anual"`
- **Edição:** Select no modal de edição
- **Obrigatório:** ⚪ Opcional

---

### 15. Ticket (`ticket`)
- **Banco:** `ticket` (text, nullable)
- **Interface:** `ticket?: string`
- **UI:** Coluna **"Tick"** (largura: 60px)
- **Exemplo:** `"TKT-12345"`
- **Filtro:** Input de texto
- **Obrigatório:** ⚪ Opcional

---

### 16. Fornecedor (`vendor`)
- **Banco:** `vendor` (text, nullable)
- **Interface:** `vendor?: string`
- **UI:** Coluna **"Fornecedor"** (largura: 120px)
- **Exemplo:** `"Editora ABC Ltda"`
- **Filtro:** Input de texto
- **Obrigatório:** ⚪ Opcional

---

### 17. Natureza Orçamentária (`nat_orc`)
- **Banco:** `nat_orc` (text, nullable)
- **Interface:** `nat_orc?: string`
- **UI:** **Não exibido na tabela** (campo técnico)
- **Uso:** Classificação orçamentária interna
- **Obrigatório:** ⚪ Opcional

---

### 18. Chave ID Externa (`chave_id`)
- **Banco:** `chave_id` (text, nullable)
- **Interface:** `chave_id?: string`
- **UI:** Exibido apenas na **exportação Excel** como coluna **"ID"**
- **Uso:** ID de sistema externo (ERP, integração)
- **Filtro:** MultiSelect com valores dinâmicos
- **Obrigatório:** ⚪ Opcional

---

### 19. Created At (`created_at`)
- **Banco:** `created_at` (timestamptz, auto)
- **Interface:** Não mapeado (não existe na interface Transaction)
- **UI:** Não exibido
- **Geração:** Timestamp automático do Supabase na criação
- **Obrigatório:** ⚪ Auto-gerado

---

### 20. Updated At (`updated_at`)
- **Banco:** `updated_at` (timestamptz)
- **Interface:** `updated_at: string`
- **UI:** **Não exibido na tabela** (usado apenas para sincronização)
- **Uso crítico:**
  - Detecção de conflitos (optimistic locking)
  - Realtime subscription
  - Audit log
- **Formato:** ISO 8601 (`"2025-01-15T10:30:00.000Z"`)
- **Atualização:** Automática via trigger do Supabase ou manual
- **Obrigatório:** ✅ Sim (para sync bidirecional)

---

### 21. Justificativa (`justification`)
- **Banco:** Não existe na tabela `transactions`
- **Interface:** `justification?: string`
- **UI:** Exibido na **exportação Excel** como coluna **"Justificativa"**
- **Uso:** Usado apenas na tabela `manual_changes` (não em transactions)
- **Obrigatório:** ⚪ Opcional (N/A para transactions)

---

## 📤 Mapeamento na Exportação Excel

Quando o usuário exporta para Excel, as colunas aparecem nesta ordem:

| Ordem | Nome da Coluna (Excel) | Campo (Transaction) |
|-------|------------------------|---------------------|
| 1 | Cenário | `scenario` |
| 2 | Data | `date` |
| 3 | Tag 01 | `tag01` |
| 4 | Tag 02 | `tag02` |
| 5 | Tag 03 | `tag03` |
| 6 | Conta | `conta_contabil` |
| 7 | Unidade | `filial` |
| 8 | Marca | `marca` |
| 9 | Ticket | `ticket` |
| 10 | Fornecedor | `vendor` |
| 11 | Descrição | `description` |
| 12 | Valor | `amount` |
| 13 | Recorrente | `recurring` |
| 14 | ID | `chave_id` |
| 15 | Status | `status` |
| 16 | Justificativa | `justification` (sempre vazio em transactions) |

**Código da exportação:**
```typescript
const headers = [
  "Cenário", "Data", "Tag 01", "Tag 02", "Tag 03",
  "Conta", "Unidade", "Marca", "Ticket", "Fornecedor",
  "Descrição", "Valor", "Recorrente", "ID", "Status", "Justificativa"
];

const rows = filteredAndSorted.map(t => [
  t.scenario,
  t.date,
  t.tag01 || '',
  t.tag02 || '',
  t.tag03 || '',
  t.category,
  t.filial,
  t.marca || '',
  t.ticket || '',
  t.vendor || '',
  t.description,
  t.amount,
  t.recurring || '',
  t.chave_id || '',
  t.status,
  t.justification || ''  // Sempre vazio para transactions
]);
```

---

## 🔄 Funções de Conversão

### `dbToTransaction()` - Banco → Interface

```typescript
const dbToTransaction = (db: DatabaseTransaction): Transaction => ({
  id: db.id,
  date: db.date,
  description: db.description,
  conta_contabil: db.conta_contabil,  // Campo que popula coluna "Conta" na UI
  category: db.category || undefined,  // Reservado para futuro
  amount: db.amount,
  type: db.type as TransactionType,
  scenario: db.scenario,
  status: db.status,
  filial: db.filial,
  marca: db.marca || undefined,
  tag01: db.tag01 || undefined,
  tag02: db.tag02 || undefined,
  tag03: db.tag03 || undefined,
  recurring: db.recurring || undefined,
  ticket: db.ticket || undefined,
  vendor: db.vendor || undefined,
  nat_orc: db.nat_orc || undefined,
  chave_id: db.chave_id || undefined,
  updated_at: db.updated_at || new Date().toISOString()
});
```

**Observações:**
- `conta_contabil` é obrigatório e popula coluna "Conta" na UI
- `category` é opcional (reservado para futuro uso)
- Campos `null` do banco são convertidos para `undefined`
- `updated_at` usa fallback para ISO string atual se não existir

---

### `transactionToDb()` - Interface → Banco

```typescript
const transactionToDb = (t: Transaction): DatabaseTransaction => {
  const dbTransaction: any = {
    id: t.id,
    date: t.date,
    description: t.description,
    conta_contabil: t.conta_contabil,  // Campo que popula coluna "Conta" na UI
    amount: t.amount,
    type: t.type,
    scenario: t.scenario || 'Orçado',
    status: t.status,
    filial: t.filial
  };

  // Adicionar campos opcionais apenas se existirem
  if (t.category) dbTransaction.category = t.category;  // Reservado para futuro
  if (t.marca) dbTransaction.marca = t.marca;
  if (t.tag01) dbTransaction.tag01 = t.tag01;
  if (t.tag02) dbTransaction.tag02 = t.tag02;
  if (t.tag03) dbTransaction.tag03 = t.tag03;
  if (t.recurring) dbTransaction.recurring = t.recurring;
  if (t.ticket) dbTransaction.ticket = t.ticket;
  if (t.vendor) dbTransaction.vendor = t.vendor;
  if (t.nat_orc) dbTransaction.nat_orc = t.nat_orc;
  if (t.chave_id) dbTransaction.chave_id = t.chave_id;

  return dbTransaction;
};
```

**Observações:**
- `conta_contabil` é obrigatório e popula coluna "Conta" na UI
- `category` é opcional (reservado para futuro uso)
- Campos opcionais só são incluídos se tiverem valor
- `scenario` usa default `"Orçado"` se não especificado
- `justification` não é mapeado (não existe no banco transactions)

---

## ⚠️ Campos Problemáticos / Notas Importantes

### 1. `justification` não existe em `transactions`
- **Problema:** Interface `Transaction` tem `justification?: string`, mas a tabela `transactions` no banco NÃO tem esta coluna
- **Onde existe:** Apenas na tabela `manual_changes`
- **Impacto:** Quando exporta para Excel, coluna "Justificativa" sempre vazia
- **Solução recomendada:** Remover `justification` da interface `Transaction` ou documentar que é apenas para ManualChange

### 2. `type` não é editável na UI
- **Observação:** Campo obrigatório no banco, mas não tem input direto na UI
- **Como é definido:** Implicitamente pela `category` escolhida (cada categoria pertence a um tipo)
- **Recomendação:** Manter assim (UX mais simples)

### 3. `nat_orc` não é visível
- **Observação:** Campo existe no banco mas não aparece na UI
- **Uso:** Provavelmente campo técnico para integração
- **Recomendação:** Se não for usado, considerar remover

### 4. `created_at` não é mapeado
- **Observação:** Banco tem `created_at` mas interface não
- **Impacto:** Timestamp de criação não está disponível no app
- **Recomendação:** Se precisar rastrear criação, adicionar à interface

### 5. Diferença de nomenclatura: "Filial" vs "Unidade"
- **No código:** Sempre `filial`
- **Na UI:** Às vezes "Filial", às vezes "Unidade"
- **Recomendação:** Padronizar para um termo (sugestão: "Unidade")

---

## 🎯 Checklist de Validação

Use este checklist para validar se o mapeamento está correto:

```
Banco → Interface:
[ ] id mapeado corretamente
[ ] date mapeado corretamente
[ ] description mapeado corretamente
[ ] category mapeado corretamente
[ ] amount mapeado corretamente
[ ] type mapeado corretamente
[ ] scenario com default 'Orçado'
[ ] status mapeado corretamente
[ ] filial mapeado corretamente
[ ] marca (opcional) mapeado
[ ] tag01/02/03 (opcionais) mapeados
[ ] recurring (opcional) mapeado
[ ] ticket (opcional) mapeado
[ ] vendor (opcional) mapeado
[ ] nat_orc (opcional) mapeado
[ ] chave_id (opcional) mapeado
[ ] updated_at mapeado com fallback
[ ] Campos null convertidos para undefined

Interface → UI:
[ ] Data exibido como "Data"
[ ] Description exibido como "Descrição"
[ ] Category exibido como "Conta"
[ ] Amount exibido como "Valor" (formatado R$)
[ ] Scenario exibido como "Cen"
[ ] Status exibido com badges coloridos
[ ] Filial exibido como "Filial" ou "Unidade"
[ ] Marca exibido como "Mar"
[ ] Tags exibidas como "Tag01", "Tag02", "Tag03"
[ ] Ticket exibido como "Tick"
[ ] Vendor exibido como "Fornecedor"

Exportação Excel:
[ ] Todas as 16 colunas presentes
[ ] Ordem correta das colunas
[ ] Valores formatados corretamente
[ ] Campos opcionais com '' se vazios
```

---

## 📝 Resumo Executivo

**Campos Obrigatórios (10):**
1. `id` - Chave primária
2. `date` - Data da transação
3. `description` - Descrição
4. `conta_contabil` - Conta contábil (popula coluna "Conta" na UI)
5. `amount` - Valor
6. `type` - Tipo (REVENUE, FIXED_COST, etc)
7. `scenario` - Cenário (Real, Orçado, etc)
8. `status` - Status (Normal, Pendente, etc)
9. `filial` - Filial/Unidade
10. `updated_at` - Timestamp de atualização (para sync)

**Campos Opcionais (12):**
1. `category` - Reservado para futuro (existe no banco mas não usado)
2. `marca` - Marca (Cogna, Vasta, etc)
3. `tag01` - Tag customizada 1
4. `tag02` - Tag customizada 2
5. `tag03` - Tag customizada 3
6. `recurring` - Recorrência
7. `ticket` - Número do ticket
8. `vendor` - Fornecedor
9. `nat_orc` - Natureza orçamentária
10. `chave_id` - ID externo
11. `created_at` - Timestamp de criação (auto, não mapeado)
12. `justification` - Justificativa (NÃO existe em transactions!)

**Total:** 22 campos (10 obrigatórios + 12 opcionais)

---

**Última atualização:** 04/02/2026
**Versão do sistema:** Fase 5 completa
