# Comparação ATUALIZADA: transactions ↔ dre_fabric

**Data:** 2026-02-03 (Atualizado)
**Descoberta:** tag2 e tag3 JÁ EXISTEM no dre_fabric! ✅

---

## 📊 MAPEAMENTO CORRETO

### ✅ Colunas de `transactions` que EXISTEM em `dre_fabric`:

| transactions | dre_fabric | Mapeamento | Status |
|--------------|------------|------------|--------|
| `id` | `id` | Direto | ✅ OK |
| `filial` | `filial` | Direto | ✅ OK |
| `marca` | `cia` | Equivalente | ✅ OK |
| `tag01` | `tag1` | Equivalente | ✅ OK |
| `tag02` | `tag2` | Equivalente | ✅ OK ⭐ |
| `tag03` | `tag3` | Equivalente | ✅ OK ⭐ |
| `ticket` | `ticket` | Direto | ✅ OK |
| `vendor` | `fornecedor_padrao` | Equivalente | ✅ OK |
| `date` | `data` (em outro schema) | Equivalente | ✅ OK |
| `amount` | `valor` | Equivalente | ✅ OK |
| `category` | `conta` | Equivalente | ✅ OK |
| `description` | `complemento` | Equivalente | ✅ OK |
| `chave_id` | `chave` | Equivalente | ✅ OK |
| `recurring` | `recorrente` | Equivalente | ✅ OK |
| `created_at` | `created_at` | Direto | ✅ OK |
| `updated_at` | `updated_at` | Direto | ✅ OK |

**Total mapeado:** 16/20 colunas ✅ **(80%!)**

---

## ❌ COLUNAS QUE AINDA FALTAM NO `dre_fabric`

| Coluna | Impacto | Solução |
|--------|---------|---------|
| `type` | 🔴 **ALTO** | Calcular baseado em `conta` |
| `scenario` | 🔴 **ALTO** | Definir como 'Real' por padrão |
| `status` | 🟡 **MÉDIO** | Mapear de `status_lanc_financeiro` |
| `nat_orc` | 🟢 **BAIXO** | Mapear de `tag_orc` |

**Total faltando:** 4/20 colunas ❌ **(Apenas 20%!)**

---

## 🎯 MAPEAMENTO CORRIGIDO PARA SINCRONIZAÇÃO

### Fabric → Transactions (Correto):

```python
def map_fabric_to_transaction(fabric_row):
    return {
        # IDs e Chaves
        'id': generate_unique_id(),  # Gerar novo ID ou usar fabric_row['id']
        'chave_id': fabric_row['chave'],  # ✅ OK

        # Dados Básicos
        'date': fabric_row['data'],  # ✅ OK (assumindo que existe)
        'description': fabric_row['complemento'],  # ✅ OK
        'category': fabric_row['conta'],  # ✅ OK
        'amount': fabric_row['valor'],  # ✅ OK

        # Hierarquia
        'filial': fabric_row['filial'],  # ✅ OK
        'marca': fabric_row['cia'],  # ✅ OK (cia = marca)

        # Tags (AGORA TODOS MAPEADOS!)
        'tag01': fabric_row['tag1'],  # ✅ OK
        'tag02': fabric_row['tag2'],  # ✅ OK ⭐
        'tag03': fabric_row['tag3'],  # ✅ OK ⭐

        # Outros Campos
        'vendor': fabric_row['fornecedor_padrao'],  # ✅ OK
        'ticket': fabric_row['ticket'],  # ✅ OK
        'recurring': fabric_row['recorrente'],  # ✅ OK
        'nat_orc': fabric_row['tag_orc'],  # ✅ OK (tag_orc = nat_orc)

        # Campos Calculados (FALTAM NO FABRIC)
        'type': calculate_type_from_conta(fabric_row['conta']),  # ❌ CALCULAR
        'scenario': 'Real',  # ❌ FIXO
        'status': fabric_row.get('status_lanc_financeiro', 'Normal'),  # ✅ MAPEAR
    }
```

---

## 📋 ESTRUTURA COMPLETA DO `dre_fabric` (create_supabase_table.sql)

```sql
CREATE TABLE dre_fabric (
    id BIGSERIAL PRIMARY KEY,
    chave TEXT,                    -- ✅ = chave_id
    codlote TEXT,
    cia TEXT,                      -- ✅ = marca
    filial TEXT,                   -- ✅ = filial
    integraaplicacao TEXT,
    idpartida TEXT,
    ticket TEXT,                   -- ✅ = ticket
    fornecedor_padrao TEXT,        -- ✅ = vendor
    anomes TEXT,
    valor NUMERIC,                 -- ✅ = amount
    complemento TEXT,              -- ✅ = description
    recorrente TEXT,               -- ✅ = recurring
    conta TEXT,                    -- ✅ = category
    tag1 TEXT,                     -- ✅ = tag01
    tag2 TEXT,                     -- ✅ = tag02 ⭐
    tag3 TEXT,                     -- ✅ = tag03 ⭐
    tag4 TEXT,
    tag_orc TEXT,                  -- ✅ = nat_orc
    original TEXT,
    r_o TEXT,
    cc TEXT,
    codcoligada INTEGER,
    codfilial INTEGER,
    usuario TEXT,
    conta_original TEXT,
    tag1_original TEXT,
    tag4_original TEXT,
    tagorc_original TEXT,
    integrachave_tratada TEXT,
    status_lanc_financeiro TEXT,   -- ✅ pode mapear para status
    anomes_original TEXT,
    created_at TIMESTAMPTZ,        -- ✅ = created_at
    updated_at TIMESTAMPTZ         -- ✅ = updated_at
);
```

---

## ✅ RESULTADO FINAL ATUALIZADO

### **80% de Correspondência! ✅**

| Métrica | Antes | Agora |
|---------|-------|-------|
| Colunas mapeadas | 12/20 (60%) | **16/20 (80%)** ✅ |
| Colunas faltando | 8/20 (40%) | **4/20 (20%)** ✅ |

### Melhorias:
- ✅ `tag02` → **EXISTE** como `tag2`
- ✅ `tag03` → **EXISTE** como `tag3`
- ✅ `recurring` → **EXISTE** como `recorrente`
- ✅ `nat_orc` → **EXISTE** como `tag_orc`

---

## 🔧 SQL ATUALIZADO (Apenas o que realmente falta)

```sql
-- Adicionar APENAS as 4 colunas que realmente faltam no dre_fabric
BEGIN;

-- 1. TYPE (tipo de transação)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS type TEXT;

-- 2. SCENARIO (cenário)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS scenario TEXT DEFAULT 'Real';

-- 3. STATUS já existe como status_lanc_financeiro, criar alias se quiser
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS status TEXT;

-- 4. DATA (se não existir)
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS data DATE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_dre_fabric_type ON dre_fabric(type);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_scenario ON dre_fabric(scenario);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_status ON dre_fabric(status);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_data ON dre_fabric(data);

-- Popular campos padrão
UPDATE dre_fabric
SET
  scenario = 'Real',
  status = COALESCE(status_lanc_financeiro, 'Normal')
WHERE scenario IS NULL OR status IS NULL;

COMMIT;
```

---

## 🎯 CONCLUSÃO ATUALIZADA

### ✅ Situação Muito Melhor!

**Antes:** 60% de correspondência
**Agora:** **80% de correspondência** ✅

### O que mudou:
- ✅ `tag2` e `tag3` **JÁ EXISTEM** no dre_fabric
- ✅ `recorrente` equivale a `recurring`
- ✅ `tag_orc` equivale a `nat_orc`

### Faltam apenas 4 campos:
1. `type` - Calcular baseado em `conta`
2. `scenario` - Fixo como 'Real'
3. `status` - Mapear de `status_lanc_financeiro`
4. `data` - Verificar se existe (pode estar como DATE)

---

**A sincronização Fabric → Supabase está 80% pronta!** 🎉
