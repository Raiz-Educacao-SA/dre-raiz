# Debug dos Filtros DRE

## 1. Verificar no Console do Browser

Quando abrir a DRE, procure por este log:
```
🔍 DRE: Filtros aplicados: {
  marcas: [...],
  filiais: [...],
  filiaisLabels: [...],
  tags01: [...]
}
```

## 2. Verificar Dados Brutos no Banco

Execute este SQL no Supabase SQL Editor:

```sql
-- Ver marcas e filiais únicas
SELECT DISTINCT marca, nome_filial
FROM transactions
WHERE date >= '2026-01-01'
ORDER BY marca, nome_filial
LIMIT 50;
```

## 3. Testar RPC Diretamente

```sql
-- Testar sem filtros (deve retornar dados)
SELECT * FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL) LIMIT 10;

-- Testar com marca
SELECT * FROM get_dre_summary('2026-01', '2026-12', ARRAY['QI'], NULL, NULL) LIMIT 10;

-- Testar com filial (IMPORTANTE: ver formato exato no banco)
SELECT * FROM get_dre_summary('2026-01', '2026-12', NULL, ARRAY['UNIDADE 1'], NULL) LIMIT 10;
```

## 4. Possíveis Problemas

### A) Formato do nome_filial no banco é diferente
**Exemplo**: Se no banco está "Unidade 1" (minúscula) e estamos buscando "UNIDADE 1" (maiúscula), não vai dar match.

**Solução**: Modificar SQL para case-insensitive:
```sql
WHERE (p_nome_filiais IS NULL OR LOWER(t.nome_filial) = ANY(SELECT LOWER(unnest(p_nome_filiais))))
```

### B) Espaços extras
**Exemplo**: "UNIDADE 1 " (com espaço) vs "UNIDADE 1" (sem espaço)

**Solução**: Usar TRIM:
```sql
WHERE (p_nome_filiais IS NULL OR TRIM(t.nome_filial) = ANY(p_nome_filiais))
```

### C) Filial está vindo com a CIA
**Exemplo**: No banco está "QI - UNIDADE 1" completo

**Solução**: Reverter minha mudança e enviar o label completo

## 5. Debug Step-by-Step

1. Não selecione NENHUM filtro → cards devem mostrar valores
2. Selecione apenas 1 marca → cards devem filtrar
3. Selecione apenas 1 filial → cards devem filtrar
4. Compare os logs do console com os dados do banco
