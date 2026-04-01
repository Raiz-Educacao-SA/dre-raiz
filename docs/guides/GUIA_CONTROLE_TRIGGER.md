# 🔧 Guia de Controle do Trigger de Sincronização

## 📋 O que foi implementado?

Implementamos a **Opção 2**: O trigger é desabilitado durante a carga de dados e reabilitado automaticamente após a conclusão, executando a comparação manual ao final.

## 🎯 Como funciona?

### Fluxo Antigo (Problema):
```
1. Script Python começa a inserir dados em batches
2. Trigger dispara DURANTE a carga (após primeiro batch)
3. Comparação executa com dados incompletos ❌
```

### Fluxo Novo (Solução):
```
1. Script Python desabilita o trigger
2. Script insere TODOS os dados
3. Script reabilita o trigger
4. Script executa comparação manualmente
5. Comparação roda com dados completos ✅
```

## 📦 Arquivos Criados

### 1. `criar_funcoes_controle_trigger.sql`
SQL com 3 funções:
- `desabilitar_trigger_sincronizacao()` - Desabilita o trigger
- `habilitar_trigger_sincronizacao()` - Habilita o trigger
- `verificar_status_trigger()` - Verifica se está habilitado/desabilitado

### 2. `instalar_controle_trigger.py`
Script Python para testar se as funções foram instaladas corretamente.

### 3. `fabric_to_supabase_v2.py` (Modificado)
Pipeline ETL atualizado com controle de trigger.

## 🚀 Como Instalar

### Passo 1: Executar o SQL no Supabase

1. Acesse o SQL Editor do Supabase:
   ```
   https://supabase.com/dashboard/project/vafmufhlompwsdrlhkfz/sql
   ```

2. Abra o arquivo `criar_funcoes_controle_trigger.sql`

3. Copie TODO o conteúdo do arquivo

4. Cole no SQL Editor do Supabase

5. Clique em **RUN** para executar

### Passo 2: Validar a Instalação

Execute o script de validação:

```bash
python instalar_controle_trigger.py
```

Você deve ver:
```
[OK] Função verificar_status_trigger existe!
```

### Passo 3: Testar o Pipeline Completo

Execute o pipeline ETL:

```bash
python fabric_to_supabase_v2.py
```

Você verá as novas etapas:
```
[>] Desabilitando trigger de sincronização...
[OK] Trigger desabilitado

[>] Carregando dados na tabela 'dre_fabric'...
... (carga de dados) ...

[>] Habilitando trigger de sincronização...
[OK] Trigger habilitado

[>] Executando comparação e sincronização...
[OK] Comparação executada com sucesso!
```

## 🔍 Como Verificar se Funcionou?

### Verificar status do trigger manualmente:

```sql
SELECT * FROM verificar_status_trigger();
```

Retorno esperado:
```json
{
  "trigger_name": "trigger_sincronizacao_automatica",
  "table_name": "dre_fabric",
  "status": "HABILITADO",
  "timestamp": "2026-02-04T..."
}
```

### Verificar última comparação:

```sql
SELECT * FROM cruzamento_resumo
ORDER BY data_execucao DESC
LIMIT 1;
```

A data_execucao deve ser APÓS a conclusão da carga.

## 🛡️ Segurança

**Importante:** O script sempre tenta reabilitar o trigger, mesmo em caso de erro:

```python
except Exception as e:
    # Tentar reabilitar trigger mesmo em caso de erro
    try:
        supabase = conectar_supabase()
        habilitar_trigger(supabase)
    except:
        pass
```

Isso garante que o trigger não fique permanentemente desabilitado.

## 🔧 Comandos Úteis

### Desabilitar trigger manualmente:
```sql
SELECT * FROM desabilitar_trigger_sincronizacao();
```

### Habilitar trigger manualmente:
```sql
SELECT * FROM habilitar_trigger_sincronizacao();
```

### Executar comparação manualmente:
```sql
SELECT * FROM executar_comparacao_e_sincronizacao();
```

## ❓ Perguntas Frequentes

### 1. E se o script falhar no meio da carga?

O trigger será reabilitado automaticamente no bloco `except` do código. Se isso falhar, você pode reabilitar manualmente:

```sql
SELECT * FROM habilitar_trigger_sincronizacao();
```

### 2. Como saber se o trigger está habilitado?

Execute:
```sql
SELECT * FROM verificar_status_trigger();
```

### 3. Posso executar a comparação sem rodar todo o pipeline?

Sim! Execute:
```sql
SELECT * FROM executar_comparacao_e_sincronizacao();
```

### 4. O trigger vai disparar em outras atualizações?

Sim! O trigger continua funcionando normalmente para outras atualizações. Ele só é desabilitado temporariamente durante a execução do script Python.

## 📊 Monitoramento

Para monitorar as execuções:

```sql
-- Ver últimas 5 comparações
SELECT
  data_execucao,
  qtd_status_1 as iguais,
  qtd_status_2 as diferentes,
  qtd_status_3 as so_transactions,
  qtd_status_4 as so_dre_fabric,
  registros_sincronizados,
  tempo_execucao_ms
FROM cruzamento_resumo
ORDER BY data_execucao DESC
LIMIT 5;
```

## ✅ Checklist de Instalação

- [ ] Executei `criar_funcoes_controle_trigger.sql` no Supabase
- [ ] Executei `python instalar_controle_trigger.py` com sucesso
- [ ] Executei `python fabric_to_supabase_v2.py` e vi as mensagens de controle do trigger
- [ ] Verifiquei que a comparação executou após a carga completa
- [ ] Confirmei que o trigger está habilitado novamente

## 📞 Suporte

Se encontrar problemas:

1. Verifique o status do trigger: `SELECT * FROM verificar_status_trigger();`
2. Verifique os logs do script Python
3. Verifique a tabela `cruzamento_controle` para ver última execução
