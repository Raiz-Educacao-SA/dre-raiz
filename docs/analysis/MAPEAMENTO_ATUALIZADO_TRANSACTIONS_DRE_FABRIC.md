# 🔄 Mapeamento ATUALIZADO: transactions ↔ dre_fabric

**Data:** 2026-02-03 (Atualizado após implementação da coluna TYPE)

---

## 📊 TABELA TRANSACTIONS (Destino)

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,              -- ✅ Classificação automática
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
  chave_id TEXT,                   -- ✅ Chave única do Fabric
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Total de colunas:** 19

---

## 📊 TABELA DRE_FABRIC (Origem)

```sql
CREATE TABLE dre_fabric (
  id BIGSERIAL PRIMARY KEY,
  chave TEXT,
  codlote TEXT,
  cia TEXT,
  filial TEXT,
  integraaplicacao TEXT,
  idpartida TEXT,
  ticket TEXT,
  fornecedor_padrao TEXT,
  anomes TEXT,
  valor NUMERIC,
  complemento TEXT,
  recorrente TEXT,
  conta TEXT,
  tag1 TEXT,
  tag2 TEXT,
  tag3 TEXT,
  tag4 TEXT,
  tag_orc TEXT,
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
  status_lanc_financeiro TEXT,
  anomes_original TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- ✅ COLUNAS ADICIONADAS VIA MIGRATION:
  type TEXT,                       -- ✅ Classificação automática via trigger
  scenario TEXT,                   -- ✅ Padrão 'Real'
  status TEXT,                     -- ✅ Mapeado de status_lanc_financeiro
  data DATE                        -- ✅ Data do lançamento
);
```

**Total de colunas:** 37 (33 originais + 4 adicionadas)

---

## ✅ MAPEAMENTO COMPLETO (transactions ← dre_fabric)

| transactions | dre_fabric | Status | Observação |
|--------------|------------|--------|------------|
| `id` | **gerar novo** | 🟡 | UUID gerado pela aplicação |
| `date` | `data` ou parse de `anomes` | ✅ | Converter YYYYMM para DATE |
| `description` | `complemento` | ✅ | Direto |
| `category` | `conta` | ✅ | Direto |
| `amount` | `valor` | ✅ | Direto |
| `type` | `type` (calculado) | ✅ | **Calculado via trigger no dre_fabric** |
| `scenario` | `scenario` | ✅ | **Sempre 'Real' no dre_fabric** |
| `status` | `status` ou `status_lanc_financeiro` | ✅ | Usar coluna `status` (nova) |
| `filial` | `filial` | ✅ | Direto |
| `marca` | `cia` | ✅ | Equivalente |
| `tag01` | `tag1` | ✅ | Equivalente |
| `tag02` | `tag2` | ✅ | Equivalente |
| `tag03` | `tag3` | ✅ | Equivalente |
| `vendor` | `fornecedor_padrao` | ✅ | Equivalente |
| `ticket` | `ticket` | ✅ | Direto |
| `nat_orc` | `tag_orc` | ✅ | Equivalente |
| `recurring` | `recorrente` | ✅ | Equivalente |
| `chave_id` | `chave` | ✅ | Chave única do Fabric |
| `created_at` | `created_at` | ✅ | Timestamp de criação |
| `updated_at` | `updated_at` | ✅ | Timestamp de atualização |

**Resultado:** 19/19 colunas mapeadas ✅ **(100%!)**

---

## 🎯 CÓDIGO DE MAPEAMENTO (Python/TypeScript)

### Exemplo em Python:

```python
def map_dre_fabric_to_transaction(fabric_row):
    """
    Mapeia um registro do dre_fabric para o formato transactions
    """
    return {
        # IDs
        'id': generate_uuid(),  # Gerar novo UUID
        'chave_id': fabric_row['chave'],

        # Dados principais
        'date': parse_anomes_to_date(fabric_row['anomes']),  # YYYYMM → YYYY-MM-DD
        'description': fabric_row['complemento'],
        'category': fabric_row['conta'],
        'amount': fabric_row['valor'],

        # Classificações (JÁ CALCULADAS NO FABRIC!)
        'type': fabric_row['type'],  # ✅ Já vem calculado do trigger!
        'scenario': fabric_row['scenario'],  # ✅ Sempre 'Real'
        'status': fabric_row['status'],  # ✅ Já mapeado no Fabric

        # Hierarquia
        'filial': fabric_row['filial'],
        'marca': fabric_row['cia'],

        # Tags
        'tag01': fabric_row['tag1'],
        'tag02': fabric_row['tag2'],
        'tag03': fabric_row['tag3'],

        # Outros
        'vendor': fabric_row['fornecedor_padrao'],
        'ticket': fabric_row['ticket'],
        'nat_orc': fabric_row['tag_orc'],
        'recurring': fabric_row['recorrente'],

        # Timestamps
        'created_at': fabric_row['created_at'],
        'updated_at': fabric_row['updated_at']
    }
```

### Exemplo em TypeScript:

```typescript
function mapDreFabricToTransaction(fabricRow: any): Transaction {
  return {
    // IDs
    id: generateUUID(),
    chave_id: fabricRow.chave,

    // Dados principais
    date: parseAnomesToDate(fabricRow.anomes),
    description: fabricRow.complemento,
    category: fabricRow.conta,
    amount: fabricRow.valor,

    // Classificações (JÁ CALCULADAS NO FABRIC!)
    type: fabricRow.type as TransactionType,  // ✅ Já vem calculado!
    scenario: fabricRow.scenario || 'Real',
    status: fabricRow.status as TransactionStatus,

    // Hierarquia
    filial: fabricRow.filial,
    marca: fabricRow.cia,

    // Tags
    tag01: fabricRow.tag1,
    tag02: fabricRow.tag2,
    tag03: fabricRow.tag3,

    // Outros
    vendor: fabricRow.fornecedor_padrao,
    ticket: fabricRow.ticket,
    nat_orc: fabricRow.tag_orc,
    recurring: fabricRow.recorrente
  };
}
```

---

## 🔧 FUNÇÕES AUXILIARES NECESSÁRIAS

### 1. Converter ANOMES para DATE

```python
def parse_anomes_to_date(anomes: str) -> str:
    """
    Converte YYYYMM (ex: '202601') para 'YYYY-MM-DD' (ex: '2026-01-01')
    """
    if not anomes or len(anomes) != 6:
        return None

    year = anomes[:4]
    month = anomes[4:6]
    return f"{year}-{month}-01"
```

### 2. Gerar UUID único

```python
import uuid

def generate_uuid() -> str:
    """Gera um UUID único para o id da transaction"""
    return str(uuid.uuid4())
```

---

## 📋 COLUNAS DO DRE_FABRIC NÃO USADAS EM TRANSACTIONS

As seguintes colunas existem no `dre_fabric` mas **não são necessárias** em `transactions`:

| Coluna | Motivo |
|--------|--------|
| `codlote` | Controle interno do Fabric |
| `integraaplicacao` | Metadado de integração |
| `idpartida` | ID interno do sistema origem |
| `tag4` | Não usado na aplicação |
| `original` | Flag de controle interno |
| `r_o` | Flag de controle interno |
| `cc` | Centro de custo (se necessário, adicionar depois) |
| `codcoligada` | Código interno Totvs |
| `codfilial` | Código interno Totvs |
| `usuario` | Usuário que criou no sistema origem |
| `conta_original` | Histórico de alterações |
| `tag1_original` | Histórico de alterações |
| `tag4_original` | Histórico de alterações |
| `tagorc_original` | Histórico de alterações |
| `integrachave_tratada` | Chave processada internamente |
| `anomes_original` | Histórico de alterações |
| `status_lanc_financeiro` | Substituído por `status` |

**Total:** 17 colunas não utilizadas (mas mantidas para auditoria e histórico)

---

## ✅ STATUS ATUAL DO MAPEAMENTO

### 🎉 SITUAÇÃO PERFEITA!

| Métrica | Valor |
|---------|-------|
| Colunas em transactions | 19 |
| Colunas mapeadas | **19 (100%)** ✅ |
| Colunas faltando | **0** ✅ |
| Colunas extras no Fabric | 17 (não usadas, OK) |

### 🎯 Conquistas:

✅ Coluna `type` implementada com trigger automático
✅ Coluna `scenario` adicionada (padrão 'Real')
✅ Coluna `status` adicionada e mapeada
✅ Coluna `data` adicionada para datas
✅ Todas as tags mapeadas (tag1, tag2, tag3)
✅ Chave única (`chave_id` ← `chave`) implementada
✅ 100% de correspondência alcançada!

---

## 🚀 PRÓXIMOS PASSOS (Sincronização)

### PASSO 1: Criar script de sincronização

```python
# fabric_to_supabase_sync.py
import pandas as pd
from supabase import create_client
from datetime import datetime
import uuid

def sync_fabric_to_transactions():
    """Sincroniza dre_fabric → transactions"""

    # 1. Conectar ao Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 2. Buscar dados do dre_fabric
    fabric_data = supabase.table('dre_fabric').select('*').execute()

    # 3. Transformar cada registro
    transactions = []
    for row in fabric_data.data:
        transaction = map_dre_fabric_to_transaction(row)
        transactions.append(transaction)

    # 4. Inserir em transactions (batch)
    result = supabase.table('transactions').upsert(
        transactions,
        on_conflict='chave_id'  # Evitar duplicatas
    ).execute()

    print(f"✅ Sincronizados {len(transactions)} registros!")
    return result
```

### PASSO 2: Executar sincronização

```bash
python fabric_to_supabase_sync.py
```

### PASSO 3: Validar dados

```sql
-- Verificar sincronização
SELECT
  COUNT(*) as total_transactions,
  COUNT(DISTINCT chave_id) as chaves_unicas,
  COUNT(DISTINCT filial) as filiais,
  COUNT(DISTINCT marca) as marcas,
  MIN(date) as data_inicial,
  MAX(date) as data_final
FROM transactions;

-- Comparar com dre_fabric
SELECT
  (SELECT COUNT(*) FROM transactions) as transactions_count,
  (SELECT COUNT(*) FROM dre_fabric) as dre_fabric_count,
  (SELECT COUNT(*) FROM transactions) - (SELECT COUNT(*) FROM dre_fabric) as diferenca;
```

---

## 🎯 CONCLUSÃO

### ✅ MAPEAMENTO 100% COMPLETO!

**Todas as 19 colunas** de `transactions` têm correspondência em `dre_fabric`.

**Benefícios:**
- ✅ Coluna `type` calculada automaticamente via trigger
- ✅ Sem necessidade de lógica externa de classificação
- ✅ Sincronização simplificada (mapeamento direto)
- ✅ Dados consistentes entre Fabric e aplicação

**Próxima etapa:**
Implementar o script de sincronização `fabric_to_supabase_sync.py`

---

**Última atualização:** 2026-02-03
**Status:** 🎉 100% Mapeado e Pronto para Sincronização!
