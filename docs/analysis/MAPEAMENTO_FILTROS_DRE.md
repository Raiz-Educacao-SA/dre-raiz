# Mapeamento dos Filtros DRE → Banco de Dados

## 📋 Resumo dos Filtros

| Filtro UI | Campo Banco | Tabela | Observações |
|-----------|-------------|--------|-------------|
| **Marca** | `marca` | `transactions` | Comparação exata (=) |
| **Filial** | `nome_filial` | `transactions` | Extrai após " - " do label |
| **Pacotes (Tag01)** | `tag01` | `transactions` | Comparação exata (=) |

## 🔧 Como os Filtros Funcionam

### 1. Filtro de MARCA
```typescript
// UI
selectedMarcas = ["QI", "CGS"]

// Enviado ao banco
p_marcas = ["QI", "CGS"]

// SQL
WHERE (p_marcas IS NULL OR t.marca = ANY(p_marcas))
```
**Campo do banco**: `transactions.marca`
**Tipo**: Comparação exata, case-sensitive

---

### 2. Filtro de FILIAL
```typescript
// UI (labels da tabela filial)
selectedFiliais = ["QI - UNIDADE 1", "CGS - UNIDADE 2"]

// Processado no código (extrai apenas o nome)
finalFiliais = ["UNIDADE 1", "UNIDADE 2"]

// Enviado ao banco
p_nome_filiais = ["UNIDADE 1", "UNIDADE 2"]

// SQL
WHERE (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
```
**Campo do banco**: `transactions.nome_filial`
**Tipo**: Comparação exata, case-sensitive
**Transformação**: Remove a parte "CIA - " do label antes de enviar

---

### 3. Filtro de PACOTES (Tag01)
```typescript
// UI
selectedTags01 = ["MENSALIDADE", "MATERIAL DIDÁTICO"]

// Enviado ao banco
p_tags01 = ["MENSALIDADE", "MATERIAL DIDÁTICO"]

// SQL
WHERE (p_tags01 IS NULL OR t.tag01 = ANY(p_tags01))
```
**Campo do banco**: `transactions.tag01`
**Tipo**: Comparação exata, case-sensitive

---

## 🐛 Possíveis Problemas

### A) Case Sensitivity
Se no banco está "unidade 1" (minúscula) e enviamos "UNIDADE 1" (maiúscula), não vai dar match.

**Solução**: Modificar SQL para case-insensitive:
```sql
WHERE (p_nome_filiais IS NULL OR LOWER(t.nome_filial) = ANY(SELECT LOWER(unnest(p_nome_filiais))))
```

### B) Espaços Extras
Se no banco está "UNIDADE 1 " (com espaço) e enviamos "UNIDADE 1" (sem espaço), não vai dar match.

**Solução**: Usar TRIM:
```sql
WHERE (p_nome_filiais IS NULL OR TRIM(t.nome_filial) = ANY(p_nome_filiais))
```

### C) Formato Diferente
Se `transactions.nome_filial` tem o formato "QI - UNIDADE 1" (completo) em vez de apenas "UNIDADE 1", minha extração vai falhar.

**Solução**: Reverter para enviar o label completo ou verificar o formato real no banco.

---

## 🧪 Como Testar

1. **Execute** `TEST_FILTROS_SQL.sql` no Supabase SQL Editor
2. **Veja** o formato exato dos dados no banco
3. **Compare** com o que está sendo enviado pelo frontend
4. **Ajuste** a comparação SQL conforme necessário

---

## 📊 Função SQL Atual

```sql
-- create_dre_rpc_functions.sql
CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL
)
...
WHERE
  (p_month_from IS NULL OR t.date >= p_month_from || '-01')
  AND (p_month_to IS NULL OR t.date <= p_month_to || '-31')
  AND (p_marcas IS NULL OR t.marca = ANY(p_marcas))
  AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
  AND (p_tags01 IS NULL OR t.tag01 = ANY(p_tags01))
```

---

## 🔍 Debug no Console

Quando selecionar filtros, procure por estes logs:

```
🔍 DRE: Filtros aplicados: {
  marcas: ["QI"],
  filiais: ["UNIDADE 1"],
  filiaisLabels: ["QI - UNIDADE 1"],
  tags01: ["MENSALIDADE"]
}

🔍 RPC params sendo enviados: {
  p_month_from: "2026-01",
  p_month_to: "2026-12",
  p_marcas: ["QI"],
  p_nome_filiais: ["UNIDADE 1"],
  p_tags01: ["MENSALIDADE"]
}

✅ getDRESummary: 1234 linhas agregadas retornadas
```

Se aparecer:
```
⚠️ ATENÇÃO: Filtros aplicados mas nenhum resultado retornado!
```

Significa que os valores não estão dando match no banco!
