# De-Para Fornecedores — Normalização de Nomes

## Visão Geral

Rotina automatizada que padroniza nomes de fornecedores nas 3 tabelas de transactions:
- `transactions` (Real)
- `transactions_orcado` (Orçado)
- `transactions_ano_anterior` (Ano Anterior)

## Tabela: `depara_fornec`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `fornecedor_de` | TEXT (PK) | Nome original do fornecedor |
| `fornecedor_para` | TEXT NOT NULL | Nome normalizado |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização (trigger automático) |

- **PK em `fornecedor_de`**: garante que cada nome original mapeia para exatamente 1 nome normalizado.
- **RLS**: SELECT para todos autenticados, INSERT/UPDATE/DELETE apenas admin (`auth.email()`).
- **Realtime**: habilitado — alterações refletem instantaneamente na interface.

## Interface (AdminPanel → Aba "De-Para Fornec")

### Funcionalidades
1. **Importar Excel**: botão no header, aceita `.xlsx`, `.xls`, `.csv` com colunas `Fornecedor De` e `Fornecedor Para`. Upsert em batches de 100 (atualiza se já existe).
2. **Adicionar manual**: campos inline para novo registro.
3. **Editar inline**: clique no lápis, edite ambos os campos, salve.
4. **Excluir**: com confirmação.
5. **Busca**: filtra por nome (De ou Para).
6. **Executar Agora**: roda `normalizar_fornecedores()` manualmente.

### Feedback
A mensagem mostra o detalhe por tabela:
```
Normalização concluída! 275 registros — Real: 150 | Orçado: 80 | Ano Anterior: 45
```

## Função SQL: `normalizar_fornecedores()`

```sql
-- Para cada registro do de-para:
UPDATE transactions SET vendor = fornecedor_para WHERE vendor = fornecedor_de;
UPDATE transactions_orcado SET vendor = fornecedor_para WHERE vendor = fornecedor_de;
UPDATE transactions_ano_anterior SET vendor = fornecedor_para WHERE vendor = fornecedor_de;
```

Retorna JSONB: `{ status, real, orcado, ano_anterior, total, executado_em }`

## Automação (pg_cron)

```sql
-- Todo dia às 00:00 BRT (03:00 UTC)
SELECT cron.schedule('normalizar-fornecedores', '0 3 * * *', $$SELECT normalizar_fornecedores()$$);
```

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `database/create_depara_fornec.sql` | Criação da tabela + função + RLS |
| `database/migrate_depara_fornec_pk.sql` | Migração: id → fornecedor_de como PK |
| `database/seed_depara_fornec.sql` | Carga inicial (2933 registros) |
| `scripts/carga_depara_fornec.cjs` | Script Node.js para carga via CLI |
| `services/supabaseService.ts` | CRUD + Realtime + upsert batch + RPC |
| `components/AdminPanel.tsx` | Aba De-Para Fornec |

## SQL Executado no Supabase

1. `database/migrate_depara_fornec_pk.sql` — tabela com PK em fornecedor_de
2. `database/seed_depara_fornec.sql` — 2933 registros via import Excel
3. `CREATE OR REPLACE FUNCTION normalizar_fornecedores()` — 3 tabelas
4. `SELECT cron.schedule(...)` — pg_cron diário 00:00 BRT
