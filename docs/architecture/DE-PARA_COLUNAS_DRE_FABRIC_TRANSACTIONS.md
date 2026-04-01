# 🔄 DE-PARA: dre_fabric → transactions

## Mapeamento de Colunas

| **dre_fabric** | → | **transactions** | **Observações** |
|----------------|---|------------------|-----------------|
| `chave_id` | → | `chave_id` | ✅ Chave única (CODCOLIGADA + INTEGRACHAVE_TRATADA + contador) |
| `data` | → | `date` | ✅ Data do lançamento (formato: YYYY-MM-DD) |
| `complemento` | → | `description` | ✅ Descrição da transação |
| `conta` | → | `category` | ⚠️ Precisa fazer JOIN com conta_contabil para pegar categoria |
| `valor` | → | `amount` | ✅ Valor numérico |
| `cia` | → | `marca` | ✅ Companhia/Marca |
| `filial` | → | `filial` | ✅ Código da filial |
| `fornecedor_padrao` | → | `vendor` | ✅ Nome do fornecedor |
| `ticket` | → | `ticket` | ✅ Número do ticket |
| `tag01` | → | `tag01` | ✅ Tag 01 (Centro de Custo) |
| - | → | `tag02` | ❌ Não existe em dre_fabric |
| - | → | `tag03` | ❌ Não existe em dre_fabric |
| - | → | `type` | ⚠️ Derivado da categoria (REVENUE, FIXED_COST, etc) |
| `codcoligada` | → | - | ℹ️ Não usado em transactions |
| `codfilial` | → | - | ℹ️ Não usado em transactions |
| `usuario` | → | - | ℹ️ Não usado em transactions |
| `codigofornecedor` | → | - | ℹ️ Não usado em transactions |
| `idlancamento` | → | - | ℹ️ Faz parte da chave_id |
| `idpartida` | → | - | ℹ️ Faz parte da chave_id |

## Colunas Fixas em transactions

| **Coluna** | **Valor Fixo/Padrão** | **Observações** |
|------------|----------------------|-----------------|
| `id` | UUID gerado | Gerar novo UUID para cada registro |
| `scenario` | `'Real'` | Sempre "Real" para dados do Fabric |
| `status` | `'Normal'` | Status inicial |
| `nat_orc` | NULL | Não mapeado |
| `recurring` | NULL ou derivado | Verificar lógica |
| `created_at` | NOW() | Timestamp atual |
| `updated_at` | NOW() | Timestamp atual |

## ⚠️ Atenções Importantes

### 1. **chave_id - ATENÇÃO!**
- ✅ **CORRETO:** `dre_fabric.chave_id` → `transactions.chave_id`
- ❌ **ERRADO:** `dre_fabric.id` → `transactions.chave_id` (ID do Supabase!)
- ❌ **ERRADO:** `dre_fabric.chave` → `transactions.chave_id` (Campo antigo!)

### 2. **fornecedor_padrao vs vendor**
- ✅ **CORRETO:** `dre_fabric.fornecedor_padrao` → `transactions.vendor`
- ❌ **ERRADO:** Qualquer outro campo → `transactions.vendor`

### 3. **ticket**
- ✅ **CORRETO:** `dre_fabric.ticket` → `transactions.ticket`
- ⚠️ **NOTA:** No banco atual, `ticket` está vazio na dre_fabric

### 4. **conta → category**
- ⚠️ **ATENÇÃO:** `dre_fabric.conta` contém código da conta (ex: "1.1.01.01")
- ⚠️ **NECESSÁRIO:** Fazer JOIN com tabela `conta_contabil` para pegar categoria
- ⚠️ **EXEMPLO:**
  ```sql
  LEFT JOIN conta_contabil cc ON dre_fabric.conta = cc.codigo
  -- Usar cc.categoria ou cc.descricao
  ```

### 5. **type (TransactionType)**
Derivar baseado na categoria:
- `'REVENUE'` - Se categoria for receita
- `'FIXED_COST'` - Se categoria for custo fixo
- `'VARIABLE_COST'` - Se categoria for custo variável
- `'SGA'` - Se categoria for SG&A
- `'RATEIO'` - Se for rateio

## 📝 Exemplo de Query Correta

```sql
INSERT INTO transactions (
    id,
    chave_id,        -- ← dre_fabric.chave
    date,            -- ← dre_fabric.data
    description,     -- ← dre_fabric.complemento
    category,        -- ← JOIN com conta_contabil
    amount,          -- ← dre_fabric.valor
    marca,           -- ← dre_fabric.cia
    filial,          -- ← dre_fabric.filial
    vendor,          -- ← dre_fabric.fornecedor_padrao
    ticket,          -- ← dre_fabric.ticket
    tag01,           -- ← dre_fabric.tag01
    type,            -- ← Derivado da categoria
    scenario,
    status
)
SELECT
    gen_random_uuid()::text,        -- id
    df.chave_id,                     -- chave_id ✅ CORRETO!
    df.data,                         -- date
    df.complemento,                  -- description
    COALESCE(cc.categoria, 'Outros'), -- category (via JOIN)
    df.valor,                        -- amount
    df.cia,                          -- marca
    df.filial,                       -- filial
    df.fornecedor_padrao,            -- vendor ✅
    df.ticket,                       -- ticket ✅
    df.tag01,                        -- tag01
    'REVENUE',                       -- type (ajustar lógica)
    'Real',                          -- scenario
    'Normal'                         -- status
FROM dre_fabric df
LEFT JOIN conta_contabil cc ON df.conta = cc.codigo;
```

## ❌ Erros Comuns

### Erro 1: Mapear ID errado
```sql
-- ❌ ERRADO
chave_id = df.id     -- Isso é o ID sequencial do Supabase!
chave_id = df.chave  -- Isso é o campo antigo!

-- ✅ CORRETO
chave_id = df.chave_id  -- Essa é a coluna correta!
```

### Erro 2: Não fazer JOIN com conta_contabil
```sql
-- ❌ ERRADO
category = df.conta  -- Isso é o código, não a categoria!

-- ✅ CORRETO
category = cc.categoria  -- Via JOIN com conta_contabil
```

### Erro 3: Usar fornecedor errado
```sql
-- ❌ ERRADO
vendor = df.fornecedor_original

-- ✅ CORRETO
vendor = df.fornecedor_padrao
```

## 🔍 Validação

Para validar se o mapeamento está correto:

```sql
-- Verificar uma transação
SELECT
    t.chave_id,
    t.vendor,
    t.ticket,
    df.chave_id,
    df.fornecedor_padrao,
    df.ticket
FROM transactions t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id
WHERE t.id = 'SEU_ID_AQUI'
LIMIT 1;
```

Se estiver correto:
- ✅ `t.chave_id` = `df.chave_id` (AMBOS devem ter o mesmo valor!)
- ✅ `t.vendor` = `df.fornecedor_padrao`
- ✅ `t.ticket` = `df.ticket`

## 📊 Resumo Visual

```
dre_fabric                  →    transactions
══════════════════════════      ════════════════════
chave_id                    →    chave_id ✅ CORRETO!
data                        →    date
complemento                 →    description
conta + JOIN conta_contabil →    category ⚠️
valor                       →    amount
cia                         →    marca
filial                      →    filial
fornecedor_padrao           →    vendor ✅
ticket                      →    ticket ✅
tag01                       →    tag01
[derivado]                  →    type
[fixo: 'Real']             →    scenario
[fixo: 'Normal']           →    status
[UUID]                      →    id
```

---

**Data de criação:** 2026-02-03
**Versão:** 1.0
