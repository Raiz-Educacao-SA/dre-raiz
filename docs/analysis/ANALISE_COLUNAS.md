# Análise de Correspondência: Colunas Interface ↔ Banco de Dados

**Data:** 2026-02-03
**Objetivo:** Verificar se todas as colunas da interface existem no banco de dados

---

## 📊 COMPARAÇÃO COMPLETA

### Interface `Transaction` (types.ts)
```typescript
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: TransactionType;
  filial: string;
  status: TransactionStatus;
  scenario?: string;
  tag01?: string;
  tag02?: string;
  tag03?: string;
  marca?: string;
  ticket?: string;
  vendor?: string;
  recurring?: string;
  justification?: string;  // ⚠️ NÃO é campo da tabela (usado apenas em mudanças manuais)
}
```

### Interface `DatabaseTransaction` (supabase.ts)
```typescript
export interface DatabaseTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
  scenario: string;
  status: string;
  filial: string;
  marca?: string | null;
  tag01?: string | null;
  tag02?: string | null;
  tag03?: string | null;
  recurring?: string | null;
  ticket?: string | null;
  vendor?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

### Tabela `transactions` (schema.sql)
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  scenario TEXT NOT NULL,
  status TEXT DEFAULT 'Normal',
  filial TEXT NOT NULL,
  marca TEXT,
  tag01 TEXT,
  tag02 TEXT,
  tag03 TEXT,
  vendor TEXT,
  ticket TEXT,
  nat_orc TEXT,           -- ⚠️ EXISTE NO DB MAS NÃO NO TYPESCRIPT
  recurring TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ CAMPOS EM COMUM (Mapeados Corretamente)

| Campo na Interface | Campo no DB | Status |
|-------------------|-------------|--------|
| `id` | `id` | ✅ OK |
| `date` | `date` | ✅ OK |
| `description` | `description` | ✅ OK |
| `category` | `category` | ✅ OK |
| `amount` | `amount` | ✅ OK |
| `type` | `type` | ✅ OK |
| `scenario` | `scenario` | ✅ OK |
| `status` | `status` | ✅ OK |
| `filial` | `filial` | ✅ OK |
| `marca` | `marca` | ✅ OK |
| `tag01` | `tag01` | ✅ OK |
| `tag02` | `tag02` | ✅ OK |
| `tag03` | `tag03` | ✅ OK |
| `vendor` | `vendor` | ✅ OK |
| `ticket` | `ticket` | ✅ OK |
| `recurring` | `recurring` | ✅ OK |

**Total:** 16 campos mapeados corretamente ✅

---

## ⚠️ DISCREPÂNCIAS ENCONTRADAS

### 1. Campo `nat_orc` - Existe no DB mas NÃO nas interfaces TypeScript

**Status:** ❌ FALTA adicionar nas interfaces

**Onde existe:**
- ✅ Tabela `transactions` no Supabase
- ❌ Interface `Transaction` (types.ts)
- ❌ Interface `DatabaseTransaction` (supabase.ts)

**Uso atual:**
- Existe em `api/sync/conta-contabil.ts` (mas parece ser para outra tabela)

**Ação necessária:** Adicionar `nat_orc` nas interfaces TypeScript

---

### 2. Campo `justification` - Existe na interface mas NÃO no DB

**Status:** ✅ CORRETO (não é campo da tabela)

**Explicação:**
- `justification` é usado apenas para mudanças manuais (manual_changes)
- Não precisa estar na tabela `transactions`
- É um campo transitório da interface

---

### 3. Campos `created_at` e `updated_at`

**Status:** ✅ OK (automáticos)

**Explicação:**
- Existem no DB com valores DEFAULT NOW()
- São preenchidos automaticamente pelo banco
- Não precisam ser obrigatórios na interface

---

## 🔧 CORREÇÃO NECESSÁRIA

### Adicionar `nat_orc` nas interfaces TypeScript

#### 1. Atualizar `types.ts`:
```typescript
export interface Transaction {
  // ... campos existentes ...
  recurring?: string;
  nat_orc?: string;      // ✨ ADICIONAR
  justification?: string;
}
```

#### 2. Atualizar `supabase.ts`:
```typescript
export interface DatabaseTransaction {
  // ... campos existentes ...
  vendor?: string | null;
  nat_orc?: string | null;  // ✨ ADICIONAR
  created_at?: string;
  updated_at?: string;
}
```

#### 3. Atualizar `services/supabaseService.ts`:

**Função `transactionToDb`:**
```typescript
if (t.nat_orc) dbTransaction.nat_orc = t.nat_orc;
```

**Função `dbToTransaction`:**
```typescript
const dbToTransaction = (db: DatabaseTransaction): Transaction => ({
  // ... campos existentes ...
  recurring: db.recurring || undefined,
  nat_orc: db.nat_orc || undefined,  // ✨ ADICIONAR
  ticket: db.ticket || undefined,
  vendor: db.vendor || undefined
});
```

---

## 📋 RESUMO FINAL

### ✅ Status Geral: **95% Completo**

**Campos OK:** 16/17 (94%)
**Campos faltando:** 1 (`nat_orc`)

### ✅ Próximos Passos:
1. ✅ Coluna `nat_orc` já existe no banco (criada)
2. ⚠️ Adicionar `nat_orc` nas interfaces TypeScript
3. ⚠️ Adicionar `nat_orc` no supabaseService.ts
4. ✅ Build e testar

---

## 🎯 CONCLUSÃO

A tabela `transactions` no Supabase tem **TODAS** as colunas necessárias para a interface de Lançamentos.

A única pendência é adicionar o campo `nat_orc` nas interfaces TypeScript para ter 100% de correspondência.

**Observação:** O campo `nat_orc` (Natureza Orçamentária) foi criado no banco mas ainda não foi integrado ao código TypeScript. Provavelmente será usado para classificação de despesas conforme o orçamento.
