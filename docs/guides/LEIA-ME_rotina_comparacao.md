# 🚀 Rotina Automática de Comparação DRE_FABRIC vs TRANSACTIONS

## 📋 Visão Geral

Sistema automatizado que compara dados entre as tabelas `dre_fabric` e `transactions`, salvando os resultados em tabelas de histórico e executando automaticamente sempre que houver atualizações.

## ✅ Instalação

### Passo 1: Executar o Script Principal

No Supabase SQL Editor, execute o arquivo:
```
criar_rotina_automatica_comparacao.sql
```

**Tempo estimado:** 1-2 minutos

### Passo 2: Verificar Instalação

Execute no SQL Editor:
```sql
-- Verificar se tabelas foram criadas
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('comparacao_historico', 'comparacao_resumo', 'comparacao_controle');

-- Verificar se trigger foi criado
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trigger_atualizar_comparacao';

-- Verificar se views foram criadas
SELECT table_name
FROM information_schema.views
WHERE table_name LIKE 'vw_%comparacao%';
```

Se retornar resultados, está tudo OK! ✅

### Passo 3: Executar Primeira Comparação

```sql
SELECT * FROM executar_comparacao_manual();
```

### Passo 4: Verificar Resultados

```sql
-- Ver resumo
SELECT * FROM vw_ultimo_resumo;

-- Ver primeiros 20 registros
SELECT * FROM vw_ultima_comparacao LIMIT 20;
```

## 🎯 Como Funciona

### Modo Automático

Toda vez que você executar:
```sql
INSERT INTO dre_fabric ...
UPDATE dre_fabric ...
```

O sistema **automaticamente**:
1. ✅ Compara `dre_fabric` com `transactions`
2. ✅ Salva resultados em `comparacao_historico`
3. ✅ Gera resumo em `comparacao_resumo`
4. ✅ Atualiza as views para consulta

**Proteção:** Executa no máximo 1 vez a cada 5 minutos (evita sobrecarga)

### Modo Manual

Quando quiser executar imediatamente:
```sql
SELECT * FROM executar_comparacao_manual();
```

## 📊 Consultando Resultados

### Consultas Rápidas

```sql
-- Ver resumo da última execução
SELECT * FROM vw_ultimo_resumo;

-- Ver últimos 100 registros comparados
SELECT * FROM vw_ultima_comparacao LIMIT 100;

-- Ver APENAS problemas (diferenças e faltantes)
SELECT * FROM vw_problemas_ultima_comparacao;

-- Ver histórico de execuções
SELECT * FROM vw_historico_execucoes;
```

### Dashboard Completo

```sql
-- Situação atual completa
SELECT
  r.data_execucao,
  r.total_registros,
  r.qtd_valores_iguais as ok,
  r.qtd_valores_diferentes as diferentes,
  r.qtd_so_dre_fabric as faltam,
  r.perc_valores_iguais as perc_ok,
  r.diferenca_total
FROM vw_ultimo_resumo r;
```

### Análises Específicas

```sql
-- Top 20 maiores diferenças
SELECT chave_id, df_valor, t_amount, diferenca_valor, df_descricao
FROM vw_ultima_comparacao
WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'
ORDER BY ABS(diferenca_valor) DESC
LIMIT 20;

-- Registros que faltam no TRANSACTIONS
SELECT chave_id, df_valor, df_data, df_categoria, df_descricao
FROM vw_ultima_comparacao
WHERE status = '4. SO TEM NA DRE_FABRIC'
ORDER BY ABS(df_valor) DESC;

-- Análise por filial
SELECT
  df_filial,
  COUNT(*) as total,
  SUM(CASE WHEN status LIKE '1.%' THEN 1 ELSE 0 END) as ok,
  SUM(CASE WHEN status LIKE '2.%' THEN 1 ELSE 0 END) as diferentes,
  SUM(CASE WHEN status LIKE '4.%' THEN 1 ELSE 0 END) as faltam
FROM vw_ultima_comparacao
GROUP BY df_filial
ORDER BY total DESC;
```

## 🔧 Manutenção

### Limpar Histórico Antigo

Por padrão, mantém últimos 30 dias. Para limpar:

```sql
-- Limpar registros com mais de 30 dias
SELECT * FROM limpar_historico_comparacao(30);

-- Limpar registros com mais de 7 dias (apenas última semana)
SELECT * FROM limpar_historico_comparacao(7);
```

### Desabilitar Trigger Temporariamente

Útil quando for fazer carga em massa:

```sql
-- Desabilitar
SELECT desabilitar_trigger_comparacao();

-- Fazer suas operações em massa
INSERT INTO dre_fabric ...

-- Reabilitar
SELECT habilitar_trigger_comparacao();

-- Executar comparação manualmente
SELECT * FROM executar_comparacao_manual();
```

## 🔍 Classificações dos Status

| Status | Significado |
|--------|-------------|
| `1. Tem na TRANSACTIONS e DRE_FABRIC \| COM VALORES IGUAIS` | ✅ Registro OK - existe em ambas com mesmo valor |
| `2. TEM NA TRANSACTIONS e DRE_FABRIC \| COM VALORES DIFERENTES` | ⚠️ Existe em ambas mas valores divergem |
| `3. SO TEM NA TRANSACTIONS` | 🔍 Existe apenas no TRANSACTIONS (extra) |
| `4. SO TEM NA DRE_FABRIC` | ❌ Falta no TRANSACTIONS (precisa sincronizar) |

## 📈 Estrutura das Tabelas

### `comparacao_historico`
Detalhes de CADA registro comparado
- `chave_id`: Chave única
- `status`: Classificação (1-4)
- `df_*`: Campos do DRE_FABRIC
- `t_*`: Campos do TRANSACTIONS
- `diferenca_valor`: Diferença calculada
- `data_execucao`: Quando foi executado

### `comparacao_resumo`
Resumo estatístico de CADA execução
- `data_execucao`: Quando foi executado
- `total_registros`: Total comparado
- `qtd_valores_iguais`: Quantos estão OK
- `qtd_valores_diferentes`: Quantos divergem
- `qtd_so_dre_fabric`: Quantos faltam no TRANSACTIONS
- `perc_*`: Percentuais de cada categoria
- `tempo_execucao_ms`: Tempo de processamento

### `comparacao_controle`
Controle de execução do trigger
- `ultima_execucao`: Última vez que rodou
- `execucao_em_andamento`: Se está processando

## 🚨 Troubleshooting

### Problema: Trigger não está executando

**Verificar:**
```sql
-- Ver se trigger está ativo
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_atualizar_comparacao';
```

**Solução:**
```sql
SELECT habilitar_trigger_comparacao();
```

### Problema: Resultados desatualizados

**Verificar última execução:**
```sql
SELECT ultima_execucao, execucao_em_andamento
FROM comparacao_controle;
```

**Forçar atualização:**
```sql
SELECT * FROM executar_comparacao_manual();
```

### Problema: Performance lenta

**Verificar índices:**
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('comparacao_historico', 'dre_fabric', 'transactions');
```

**Limpar histórico:**
```sql
SELECT * FROM limpar_historico_comparacao(7);  -- Manter apenas 7 dias
```

### Problema: Muitas execuções seguidas

O sistema já tem proteção (máx. 1x a cada 5 min), mas se precisar:

```sql
-- Desabilitar temporariamente
SELECT desabilitar_trigger_comparacao();

-- Fazer operações

-- Reabilitar e executar manualmente
SELECT habilitar_trigger_comparacao();
SELECT * FROM executar_comparacao_manual();
```

## 📦 Arquivos do Projeto

1. **`criar_rotina_automatica_comparacao.sql`**
   - Script principal de instalação
   - Cria tabelas, funções, trigger e views

2. **`exemplos_uso_rotina_comparacao.sql`**
   - Exemplos práticos de consultas
   - Análises avançadas
   - Relatórios executivos

3. **`comparacao_chave_id_FINAL.sql`**
   - Versão anterior (sem automação)
   - Pode ser usado para comparações ad-hoc

4. **`LEIA-ME_rotina_comparacao.md`**
   - Este arquivo
   - Guia de instalação e uso

## 🎓 Dicas de Uso

### Para Análise Diária
```sql
-- Dashboard rápido
SELECT * FROM vw_ultimo_resumo;
SELECT * FROM vw_problemas_ultima_comparacao LIMIT 20;
```

### Para Investigação Profunda
```sql
-- Análise por dimensões
SELECT df_filial, df_categoria, COUNT(*)
FROM vw_problemas_ultima_comparacao
GROUP BY df_filial, df_categoria
ORDER BY COUNT(*) DESC;
```

### Para Monitoramento Contínuo
```sql
-- Ver evolução ao longo do tempo
SELECT
  data_execucao::DATE,
  perc_valores_iguais,
  qtd_valores_diferentes + qtd_so_dre_fabric as total_problemas
FROM vw_historico_execucoes
ORDER BY data_execucao DESC
LIMIT 30;
```

### Para Carga em Massa
```sql
-- 1. Desabilitar trigger
SELECT desabilitar_trigger_comparacao();

-- 2. Fazer carga
COPY dre_fabric FROM '/caminho/arquivo.csv' CSV HEADER;

-- 3. Reabilitar e processar
SELECT habilitar_trigger_comparacao();
SELECT * FROM executar_comparacao_manual();
```

## 🆘 Suporte

Em caso de dúvidas ou problemas:

1. Verifique se todas as tabelas foram criadas corretamente
2. Confirme que o trigger está ativo
3. Execute uma comparação manual para testar
4. Consulte os exemplos no arquivo `exemplos_uso_rotina_comparacao.sql`

## 📝 Notas Importantes

- ✅ Histórico mantém últimos 30 dias (configurável)
- ✅ Execução automática protegida (máx 1x/5min)
- ✅ Não bloqueia operações de INSERT/UPDATE
- ✅ Índices otimizados para performance
- ✅ Views prontas para consulta rápida
- ✅ Funções para manutenção e controle

## 🎉 Pronto para Usar!

Após executar o script de instalação, o sistema já está funcionando automaticamente.

Basta fazer suas operações normais no `dre_fabric` e consultar os resultados nas views.
