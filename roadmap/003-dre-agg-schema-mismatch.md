# BUG #003 — dre_agg recriada com schema errado (colunas month/total ao invés de year_month/total_amount)

**Data:** 2026-02-27
**Severidade:** Crítica — DRE Gerencial inteiro parou de funcionar (tabela vazia, filtros Marca/Filial não carregam)
**Status:** Corrigido

## Sintoma

Após executar `database/fix_recurring_normalization.sql` no Supabase, o DRE Gerencial parou de mostrar dados. Filtros de Marca e Filial não carregavam opções. Drill-down não funcionava.

## Causa Raiz

O `fix_recurring_normalization.sql` (Parte 3) recriou a materialized view `dre_agg` com **schema incorreto**:

| Coluna no SQL errado | Coluna esperada | Impacto |
|----------------------|-----------------|---------|
| `month` | `year_month` | `get_dre_dimension` e `get_dre_filter_options` referenciam `year_month` |
| `total` | `total_amount` | `get_dre_dimension` faz `SUM(total_amount)` |
| *(ausente)* | `conta_contabil` | `get_dre_dimension` filtra por `conta_contabil` |
| *(ausente)* | `tx_count` | Coluna de contagem esperada pelo schema |

As RPCs `get_dre_dimension` e `get_dre_filter_options` falhavam com erro de coluna inexistente, resultando em HTTP 500 no frontend.

## Como Aconteceu

1. Ao criar o script de normalização do recurring, a Parte 3 (dre_agg) foi escrita usando o schema da `get_soma_tags` (que usa `month`/`total`) ao invés do schema correto da dre_agg (que usa `year_month`/`total_amount`/`conta_contabil`/`tx_count`)
2. O `SET statement_timeout = 0` estava presente, então o DROP + CREATE executaram com sucesso — mas com colunas erradas
3. As RPCs que dependem de `dre_agg` imediatamente quebraram

## Correção

Criado `database/fix_dre_agg_restore.sql` com 5 partes:

1. **Normalização de dados** — UPDATE recurring para 'Sim'/'Não' nas 3 tabelas
2. **Recriação dre_agg** com schema CORRETO:
   - `tag0, tag01, tag02, tag03, conta_contabil, vendor, year_month, scenario, marca, nome_filial, recurring, total_amount, tx_count`
   - `INITCAP(COALESCE(t.recurring, 'Sim'))` para normalizar recurring
   - 7 índices de performance
3. **Restauração get_dre_dimension** com filtro `p_recurring` ($11) usando INITCAP
4. **Restauração get_dre_filter_options** (lê de dre_agg)
5. **Atualização get_soma_tags** (8 params) com INITCAP no recurring

## Arquivos Modificados

- `database/fix_dre_agg_restore.sql` (NOVO — SQL de emergência para restaurar tudo)
- `database/fix_recurring_normalization.sql` (ESTE CONTÉM O BUG — não executar)

## Como Executar

1. Abrir Supabase SQL Editor
2. Colar e executar `database/fix_dre_agg_restore.sql` **inteiro**
3. Aguardar conclusão (pode demorar ~1-2 minutos por causa do CREATE MATERIALIZED VIEW)
4. Testar no app: DRE Gerencial → dados devem aparecer, filtros Marca/Filial devem carregar

## Lições Aprendidas

1. **Sempre verificar o schema da dre_agg** antes de recriá-la — comparar com `restaurar_dre_agg.sql` (fonte da verdade)
2. **dre_agg usa colunas diferentes de get_soma_tags**: `year_month` (não `month`), `total_amount` (não `total`), inclui `conta_contabil` e `tx_count`
3. **Testar RPCs dependentes** (`get_dre_dimension`, `get_dre_filter_options`) imediatamente após recriar dre_agg
4. **Nunca confiar em schema de memória** — sempre ler o arquivo SQL de referência antes de recriar views materializadas
