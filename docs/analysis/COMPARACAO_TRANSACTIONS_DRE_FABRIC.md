# Comparação: transactions (Supabase) ↔ dre_fabric (Fabric)

**Data:** 2026-02-03
**Objetivo:** Verificar correspondência de colunas entre as duas tabelas

---

## 📊 ESTRUTURA DAS TABELAS

### Tabela `transactions` (Supabase)
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
  nat_orc TEXT,
  recurring TEXT,
  chave_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Total:** 20 colunas

---

### Tabela `dre_fabric` (Microsoft Fabric)
```sql
CREATE TABLE dre_fabric (
  id BIGSERIAL PRIMARY KEY,
  chave TEXT,
  codlote TEXT,
  cia TEXT,
  filial TEXT,
  integraaplicacao TEXT,
  idlancamento BIGINT,
  idpartida TEXT,
  ticket TEXT,
  data DATE,
  fornecedor_padrao TEXT,
  fornecedor_original TEXT,
  anomes TEXT,
  valor NUMERIC,
  complemento TEXT,
  conta TEXT,
  tag01 TEXT,
  codcoligada INTEGER,
  codfilial INTEGER,
  usuario TEXT,
  codigofornecedor TEXT,
  integrachave_tratada TEXT,
  status_lanc_financeiro TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Total:** 25 colunas

---

## ✅ MAPEAMENTO DE COLUNAS

### Colunas de `transactions` que EXISTEM em `dre_fabric`:

| transactions | dre_fabric | Tipo Match | Status |
|--------------|------------|------------|--------|
| `filial` | `filial` | ✅ Direto | OK |
| `marca` | `cia` | ✅ Equivalente | OK |
| `tag01` | `tag01` | ✅ Direto | OK |
| `ticket` | `ticket` | ✅ Direto | OK |
| `vendor` | `fornecedor_padrao` | ✅ Equivalente | OK |
| `date` | `data` | ✅ Equivalente | OK |
| `amount` | `valor` | ✅ Equivalente | OK |
| `category` | `conta` | ✅ Equivalente | OK |
| `description` | `complemento` | ✅ Equivalente | OK |
| `chave_id` | `chave` | ✅ Equivalente | OK |
| `created_at` | `created_at` | ✅ Direto | OK |
| `updated_at` | `updated_at` | ✅ Direto | OK |

**Total mapeado:** 12/20 colunas ✅

---

## ❌ COLUNAS DE `transactions` QUE **NÃO EXISTEM** EM `dre_fabric`

| Coluna | Tipo | Uso | Impacto |
|--------|------|-----|---------|
| `id` | TEXT | ID único gerado pela app | ⚠️ Não vem do Fabric |
| `type` | TEXT | REVENUE/COST/SGA/RATEIO | ⚠️ Calculado pela app |
| `scenario` | TEXT | Real/Orçado/A-1 | ⚠️ Não vem do Fabric |
| `status` | TEXT | Normal/Pendente/Ajustado | ⚠️ Calculado pela app |
| `tag02` | TEXT | Segmento | ⚠️ Não vem do Fabric |
| `tag03` | TEXT | Projeto | ⚠️ Não vem do Fabric |
| `nat_orc` | TEXT | Natureza orçamentária | ⚠️ Não vem do Fabric |
| `recurring` | TEXT | Recorrência | ⚠️ Não vem do Fabric |

**Total não mapeado:** 8/20 colunas ❌

---

## ✅ COLUNAS DE `dre_fabric` QUE **NÃO EXISTEM** EM `transactions`

| Coluna | Tipo | Uso | Observação |
|--------|------|-----|------------|
| `codlote` | TEXT | Código do lote | Não usado na app |
| `integraaplicacao` | TEXT | Integração | Não usado na app |
| `idlancamento` | BIGINT | ID lançamento ERP | Não usado na app |
| `idpartida` | TEXT | ID partida ERP | Não usado na app |
| `fornecedor_original` | TEXT | Fornecedor original | Temos apenas `vendor` |
| `anomes` | TEXT | Ano/Mês YYYYMM | Pode ser calculado de `date` |
| `codcoligada` | INTEGER | Código coligada | Não usado na app |
| `codfilial` | INTEGER | Código filial (numérico) | Temos `filial` (texto) |
| `usuario` | TEXT | Usuário do lançamento | Não usado na app |
| `codigofornecedor` | TEXT | Código fornecedor | Não usado na app |
| `integrachave_tratada` | TEXT | Chave tratada | Não usado na app |
| `status_lanc_financeiro` | TEXT | Status financeiro | Similar a `status` |

**Total exclusivo do Fabric:** 12/25 colunas

---

## 📋 ANÁLISE DE CORRESPONDÊNCIA

### ✅ RESULTADO FINAL:

**Colunas de `transactions` mapeadas para `dre_fabric`:** 12/20 (60%)

**Colunas de `transactions` NÃO existentes no `dre_fabric`:** 8/20 (40%)

---

## ⚠️ COLUNAS CRÍTICAS FALTANDO NO `dre_fabric`

### 1. **`type`** (REVENUE/COST/SGA/RATEIO)
**Status:** ❌ NÃO EXISTE
**Impacto:** ALTO
**Solução:** Precisa ser calculado baseado em `conta` (categoria contábil)

### 2. **`scenario`** (Real/Orçado/A-1)
**Status:** ❌ NÃO EXISTE
**Impacto:** ALTO
**Solução:** Provavelmente todos os registros do Fabric são "Real"

### 3. **`tag02` e `tag03`** (Segmento e Projeto)
**Status:** ❌ NÃO EXISTEM
**Impacto:** MÉDIO
**Solução:** Podem ser deixados NULL ou calculados de outra fonte

### 4. **`nat_orc`** (Natureza Orçamentária)
**Status:** ❌ NÃO EXISTE
**Impacto:** BAIXO
**Solução:** Pode ser mapeado da tabela `conta_contabil`

### 5. **`recurring`** (Recorrência)
**Status:** ❌ NÃO EXISTE
**Impacto:** BAIXO
**Solução:** Pode ser inferido baseado na conta ou deixado NULL

---

## 🔧 CAMPOS QUE PRECISAM SER ADICIONADOS NO `dre_fabric`

Para ter 100% de correspondência, seria necessário adicionar em `dre_fabric`:

```sql
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS scenario TEXT DEFAULT 'Real',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS tag02 TEXT,
ADD COLUMN IF NOT EXISTS tag03 TEXT,
ADD COLUMN IF NOT EXISTS nat_orc TEXT,
ADD COLUMN IF NOT EXISTS recurring TEXT;
```

---

## 📊 MAPEAMENTO SUGERIDO PARA SINCRONIZAÇÃO

### Script de Mapeamento (Fabric → Transactions):

```python
def map_fabric_to_transaction(fabric_row):
    return {
        'id': generate_unique_id(),  # Gerar novo ID
        'date': fabric_row['data'],
        'description': fabric_row['complemento'] or 'Sem descrição',
        'category': fabric_row['conta'],
        'amount': fabric_row['valor'],
        'type': calculate_type_from_conta(fabric_row['conta']),  # ⚠️ CALCULAR
        'scenario': 'Real',  # ⚠️ FIXO (assumir que Fabric = Real)
        'status': 'Normal',  # ⚠️ FIXO
        'filial': fabric_row['filial'],
        'marca': fabric_row['cia'],
        'tag01': fabric_row['tag01'],
        'tag02': None,  # ⚠️ NÃO EXISTE NO FABRIC
        'tag03': None,  # ⚠️ NÃO EXISTE NO FABRIC
        'vendor': fabric_row['fornecedor_padrao'],
        'ticket': fabric_row['ticket'],
        'nat_orc': None,  # ⚠️ BUSCAR DE conta_contabil
        'recurring': None,  # ⚠️ NÃO EXISTE NO FABRIC
        'chave_id': fabric_row['chave']
    }
```

---

## 🎯 CONCLUSÃO

### ✅ Pontos Positivos:
- **60%** das colunas de `transactions` existem no `dre_fabric`
- Campos principais estão mapeados: data, valor, filial, marca, categoria
- Relacionamento via `chave_id` ↔ `chave` está OK

### ⚠️ Pontos de Atenção:
- **40%** das colunas de `transactions` NÃO existem no `dre_fabric`
- Campos críticos como `type` e `scenario` precisam ser calculados
- `tag02` e `tag03` não vêm do Fabric (precisam de outra fonte)

### 📝 Recomendações:

1. **Para sincronizar Fabric → Supabase:**
   - Calcular `type` baseado na `conta` contábil
   - Definir `scenario = 'Real'` por padrão
   - Definir `status = 'Normal'` por padrão
   - Deixar `tag02`, `tag03`, `nat_orc`, `recurring` como NULL

2. **Para completar os dados:**
   - Criar tabela de mapeamento `conta → type`
   - Integrar com tabela `conta_contabil` para buscar `nat_orc`
   - Criar lógica para inferir `tag02` e `tag03` se necessário

3. **Estrutura ideal:**
   - Adicionar colunas faltantes no `dre_fabric` (se possível)
   - OU aceitar que alguns campos serão NULL na sincronização
   - OU criar tabelas auxiliares com os dados complementares

---

## 📄 SCRIPTS DE VERIFICAÇÃO

### 1. Verificar colunas de dre_fabric:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
ORDER BY ordinal_position;
```

### 2. Verificar colunas de transactions:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

### 3. Contar registros com chave_id:
```sql
-- Em transactions
SELECT COUNT(*) as total, COUNT(chave_id) as com_chave
FROM transactions;

-- Em dre_fabric
SELECT COUNT(*) as total, COUNT(chave) as com_chave
FROM dre_fabric;
```

---

**Última atualização:** 2026-02-03
**Autor:** Claude Sonnet 4.5
