# De-Para Conta Contábil

Rotina que padroniza o campo `conta_contabil` em todas as tabelas de transações com base em um mapeamento cadastrado pelos administradores.

---

## O que faz

Quando a mesma conta contábil aparece com valores diferentes entre importações (ex: `4.2.1.02` vs `04.02.01.02`), o De-Para garante que todos os registros usem a forma canônica definida pela equipe.

A rotina percorre cada mapeamento cadastrado e aplica um `UPDATE` nas 4 tabelas de transações:

| Tabela | Cenário |
|--------|---------|
| `transactions` | Real |
| `transactions_orcado` | Orçado |
| `transactions_ano_anterior` | Ano Anterior |
| `transactions_manual` | Lançamentos manuais |

Ao final, se houve qualquer alteração, a view materializada `dre_agg` é atualizada automaticamente para refletir as mudanças na DRE.

---

## Onde está na interface

**Admin → Conta Contábil → sub-aba De-Para Conta Contábil**

---

## Tabela de mapeamento: `depara_conta_contabil`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `conta_de` | TEXT (PK) | Valor original que chega na importação |
| `descricao_de` | TEXT | Descrição da conta de origem (opcional) |
| `conta_para` | TEXT | Valor padronizado que deve prevalecer |
| `descricao_para` | TEXT | Descrição da conta de destino (opcional) |
| `updated_at` | TIMESTAMPTZ | Atualizado automaticamente a cada alteração |

---

## Como cadastrar mapeamentos

### Manualmente (um por vez)
1. Acesse **Admin → Conta Contábil → De-Para Conta Contábil**
2. Preencha os campos **Conta De**, **Conta Para** (descrições são opcionais)
3. Clique em **Adicionar**

### Via Excel (em lote)
1. Prepare uma planilha com as colunas:

| Conta De | Descrição De | Conta Para | Descrição Para |
|----------|-------------|------------|----------------|
| 4.2.1.02 | Licença SW  | 4.2.1.02.01 | Licença de Software |

2. Salve como `.xlsx` ou `.csv`
3. Clique em **Importar Excel** e selecione o arquivo
4. Revise o preview e confirme

> O import usa **upsert** — se a `Conta De` já existir, o registro é atualizado. Se não existir, é inserido.

---

## Como executar a normalização

### Manual
Clique em **Executar Agora** na toolbar da sub-aba De-Para Conta Contábil.

A mensagem de retorno mostra quantos registros foram atualizados por tabela:
```
Normalização concluída! 312 registros — Real: 180 | Orçado: 90 | Ano Anterior: 42 | Manual: 0
```

### Automática (pg_cron)
A função roda automaticamente **todo dia às 03:30 UTC (00:30 BRT)**, 30 minutos após a normalização de fornecedores.

Para ativar o agendamento, execute UMA VEZ no Supabase SQL Editor:
```sql
SELECT cron.schedule(
  'normalizar-conta-contabil',
  '30 3 * * *',
  $$SELECT normalizar_conta_contabil()$$
);
```

---

## Função SQL

```sql
normalizar_conta_contabil() → JSONB
```

Retorno:
```json
{
  "status": "ok",
  "real": 180,
  "orcado": 90,
  "ano_anterior": 42,
  "manual": 0,
  "total": 312,
  "executado_em": "2026-04-01T03:30:00Z"
}
```

O arquivo SQL está em: `database/normalizar_conta_contabil.sql`

---

## Fluxo completo

```
Usuário clica "Executar Agora"
        ↓
supabaseService.runNormalizarContaContabil()
        ↓
RPC: normalizar_conta_contabil()
        ↓
Para cada linha em depara_conta_contabil:
  UPDATE transactions          SET conta_contabil = conta_para WHERE conta_contabil = conta_de
  UPDATE transactions_orcado   SET conta_contabil = conta_para WHERE conta_contabil = conta_de
  UPDATE transactions_ano_anterior ...
  UPDATE transactions_manual   ...
        ↓
Se total > 0: REFRESH MATERIALIZED VIEW dre_agg
        ↓
Retorna JSON com contagem por tabela
        ↓
UI exibe mensagem de sucesso com detalhamento
```

---

## Analogia com De-Para Fornecedores

O comportamento é idêntico ao `normalizar_fornecedores()`, trocando apenas:

| De-Para Fornecedores | De-Para Conta Contábil |
|---------------------|----------------------|
| Tabela: `depara_fornec` | Tabela: `depara_conta_contabil` |
| Coluna: `vendor` | Coluna: `conta_contabil` |
| RPC: `normalizar_fornecedores()` | RPC: `normalizar_conta_contabil()` |
| Agendamento: `03:00 UTC` | Agendamento: `03:30 UTC` |

---

## Observações importantes

- **Mapeamentos idênticos são ignorados** (`conta_de = conta_para`) — a função não executa updates desnecessários.
- **A função é idempotente** — rodar múltiplas vezes não causa problemas.
- **O `dre_agg` só é refreshado se houver mudanças** — evita timeout desnecessário.
- **RLS**: apenas usuários com `role = 'admin'` podem chamar a RPC.
