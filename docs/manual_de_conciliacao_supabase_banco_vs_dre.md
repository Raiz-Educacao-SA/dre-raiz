# Manual de Conciliação Supabase – Banco vs DRE

## 1. Objetivo
Este manual documenta **todo o processo de conciliação automática** entre as tabelas **`dre_fabric`** (fonte oficial da DRE) e **`transactions`** (base financeira operacional), garantindo que a tabela `transactions` reflita fielmente os dados consolidados da DRE.

O processo foi projetado para ser:
- Seguro (transacional)
- Auditável (logs de execução)
- Reutilizável
- Automatizado via `pg_cron`

---

## 2. Visão Geral do Fluxo

```text
dre_fabric  ──┐
              ├─► VIEW de Conciliação (status por chave_id)
transactions ─┘

VIEW
 ├─► resumo_conciliacao (4 linhas – controle)
 ├─► DELETE status 2 e 3 (limpeza da transactions)
 └─► INSERT status 4 (inclusão de faltantes)
```

---

## 3. Conceitos de Status

| Status | Descrição | Ação |
|------|----------|------|
| **1** | Cruzou certo sem diferenças | Nenhuma |
| **2** | Cruzou com diferenças | DELETE |
| **3** | Só tem na transactions | DELETE |
| **4** | Só tem na dre_fabric | INSERT |

---

## 4. VIEW de Conciliação (Regra-Mãe)

### `vw_conciliacao_dre_transactions`

Responsável por:
- Unificar as chaves (`chave_id`)
- Somar valores
- Calcular diferenças
- Definir o status de conciliação

```sql
create or replace view public.vw_conciliacao_dre_transactions as
with
dre as (
  select
    chave_id,
    sum(coalesce(valor, 0))::numeric as valor_dre_fabric
  from public.dre_fabric
  group by chave_id
),
trx as (
  select
    chave_id,
    sum(coalesce(amount, 0))::numeric as valor_transactions
  from public.transactions
  group by chave_id
)
select
  coalesce(dre.chave_id, trx.chave_id) as chave_id,
  coalesce(dre.valor_dre_fabric, 0) as valor_dre_fabric,
  coalesce(trx.valor_transactions, 0) as valor_transactions,
  (coalesce(dre.valor_dre_fabric, 0) - coalesce(trx.valor_transactions, 0)) as valor_diferenca,
  case
    when dre.chave_id is not null and trx.chave_id is not null
         and (coalesce(dre.valor_dre_fabric, 0) - coalesce(trx.valor_transactions, 0)) = 0
      then '1. Cruzou certo sem diferenças'
    when dre.chave_id is not null and trx.chave_id is not null
         and (coalesce(dre.valor_dre_fabric, 0) - coalesce(trx.valor_transactions, 0)) <> 0
      then '2. Cruzou com diferenças'
    when dre.chave_id is null and trx.chave_id is not null
      then '3. So tem na transactions'
    when dre.chave_id is not null and trx.chave_id is null
      then '4. so tem na Dre_fabric'
  end as status
from dre
full outer join trx
  on dre.chave_id = trx.chave_id;
```

---

## 5. Tabela de Resumo da Conciliação

### Estrutura
```sql
create table if not exists public.resumo_conciliacao (
  status text primary key,
  valor_dre_fabric numeric not null,
  valor_transactions numeric not null,
  valor_diferenca numeric not null,
  updated_at timestamptz not null default now()
);
```

### Atualização do resumo
```sql
truncate table public.resumo_conciliacao;

insert into public.resumo_conciliacao (status, valor_dre_fabric, valor_transactions, valor_diferenca, updated_at)
select
  status,
  sum(valor_dre_fabric),
  sum(valor_transactions),
  sum(valor_diferenca),
  now()
from public.vw_conciliacao_dre_transactions
group by status;
```

---

## 6. DELETE – Limpeza da `transactions`

Remove registros inconsistentes ou excedentes.

```sql
delete from public.transactions t
where exists (
  select 1
  from public.vw_conciliacao_dre_transactions v
  where v.chave_id = t.chave_id
    and v.status in (
      '2. Cruzou com diferenças',
      '3. So tem na transactions'
    )
);
```

> Seguro: se não houver linhas, não ocorre erro.

---

## 7. INSERT – Inclusão dos Faltantes (Status 4)

### Regra de Data
- Origem: `dre_fabric.anomes` (AAAAMM)
- Destino: `transactions.date` (YYYY-MM-DD)
- Utiliza sempre o **1º dia do mês**

```sql
set statement_timeout = '5min';

insert into public.transactions (
  id,
  date,
  description,
  category,
  amount,
  type,
  scenario,
  filial,
  marca,
  tag01,
  tag02,
  tag03,
  conta_contabil,
  vendor,
  ticket,
  nat_orc,
  chave_id
)
select
  gen_random_uuid()::text as id,
  to_char(to_date(df.anomes || '01', 'YYYYMMDD'), 'YYYY-MM-DD') as date,
  coalesce(df.complemento, '') as description,
  'DRE' as category,
  v.valor_dre_fabric as amount,
  coalesce(df.type, 'DRE') as type,
  coalesce(df.scenario, 'Real') as scenario,
  df.filial,
  df.cia as marca,
  df.tag1 as tag01,
  df.tag2 as tag02,
  df.tag3 as tag03,
  df.conta as conta_contabil,
  df.fornecedor_padrao as vendor,
  df.ticket,
  df.tag_orc as nat_orc,
  v.chave_id
from public.vw_conciliacao_dre_transactions v
join public.dre_fabric df
  on df.chave_id = v.chave_id
where v.status = '4. so tem na Dre_fabric';
```

---

## 8. Script Único (Manual)

- Atualiza resumo
- Deleta status 2 e 3
- Insere status 4
- Atualiza resumo novamente

Executado dentro de `BEGIN / COMMIT`.

---

## 9. Automação – Função `run_conciliacao()`

- Encapsula todo o processo
- Mantém execução manual e automática
- Registra log

```sql
select public.run_conciliacao();
```

---

## 10. Log de Execução

### Tabela
```sql
create table if not exists public.concil_exec_log (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  deleted_rows integer not null default 0,
  inserted_rows integer not null default 0,
  error_message text
);
```

---

## 11. Agendamento Automático (pg_cron)

### Execução de hora em hora
```sql
select cron.schedule(
  'concil_dre_transactions_hourly',
  '0 * * * *',
  $$select public.run_conciliacao();$$
);
```

---

## 12. Operação no Dia a Dia

- Rodar manualmente:
```sql
select public.run_conciliacao();
```

- Ver histórico:
```sql
select * from public.concil_exec_log order by id desc;
```

- Ver status atual:
```sql
select * from public.resumo_conciliacao order by status;
```

---

## 13. Passo a passo para atualizar a função no Supabase (mudança de formato de data)

Este procedimento deve ser seguido sempre que houver ajuste na lógica da função `run_conciliacao()`.

### Passo 1 – Pausar a automação
Evita execução durante a atualização da função.

```sql
select cron.unschedule(
  (select jobid from cron.job where jobname = 'concil_dre_transactions_hourly')
);
```

### Passo 2 – Atualizar a função
No **SQL Editor do Supabase**, executar o script completo de:

```sql
create or replace function public.run_conciliacao()
```

Certifique-se de que o campo `date` esteja no formato **`YYYY-MM-DD`**:

```sql
to_char(to_date(df.anomes || '01', 'YYYYMMDD'), 'YYYY-MM-DD') as date
```

### Passo 3 – Testar manualmente

```sql
select public.run_conciliacao();
```

Validar:
```sql
select * from public.concil_exec_log order by id desc limit 1;
```

### Passo 4 – Conferir o formato das datas gravadas

```sql
select date from public.transactions order by created_at desc limit 20;
```

### Passo 5 – Reativar a automação

```sql
select cron.schedule(
  'concil_dre_transactions_hourly',
  '0 * * * *',
  $$select public.run_conciliacao();$$
);
```

---

## 14. Boas Práticas
```

---

## 13. Boas Práticas
- Não alterar a VIEW sem revisar impactos
- Monitorar `concil_exec_log`
- Ajustar frequência do cron conforme volume
- Preferir VIEW (não materializada) para evitar duplicação de dados

---

**Documento oficial – Manual de Conciliação Supabase – Banco vs DRE**

