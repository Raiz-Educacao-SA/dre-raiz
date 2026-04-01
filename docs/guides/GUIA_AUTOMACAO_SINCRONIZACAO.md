# 🤖 Guia de Automação: dre_fabric → transactions

**Data:** 2026-02-03

---

## 📋 **3 OPÇÕES DE AUTOMAÇÃO**

### ⚡ **OPÇÃO A: TRIGGER (Tempo Real)**

**Como funciona:**
- Quando inserir/atualizar no `dre_fabric` → Automaticamente sincroniza para `transactions`

**Vantagens:**
- ✅ Tempo real
- ✅ Sempre sincronizado
- ✅ Automático

**Desvantagens:**
- ⚠️ Pode deixar inserções mais lentas (se houver muitos dados)
- ⚠️ Mais carga no banco

**Quando usar:**
- Quando precisa dos dados imediatamente em `transactions`
- Volume de inserções baixo/médio

---

### 🕐 **OPÇÃO B: FUNCTION AGENDADA (Periódica)**

**Como funciona:**
- Roda automaticamente a cada X minutos (ex: 5, 15, 60 minutos)
- Usa `pg_cron` do PostgreSQL

**Vantagens:**
- ✅ Não impacta performance de inserção
- ✅ Sincronização automática
- ✅ Controle de frequência

**Desvantagens:**
- ⚠️ Pode ter delay de alguns minutos
- ⚠️ Requer `pg_cron` habilitado (pode não estar no Free Tier)

**Quando usar:**
- Volume alto de inserções no `dre_fabric`
- Não precisa de dados em tempo real
- **RECOMENDADA para maioria dos casos** ⭐

---

### 👆 **OPÇÃO C: FUNCTION MANUAL (Sob Demanda)**

**Como funciona:**
- Você executa quando quiser sincronizar
- Via SQL ou chamada de API

**Vantagens:**
- ✅ Total controle
- ✅ Pode sincronizar apenas X registros por vez
- ✅ Sem dependências

**Desvantagens:**
- ⚠️ Precisa lembrar de executar
- ⚠️ Não é automático

**Quando usar:**
- Para testes
- Sincronização sob demanda
- Combinado com script externo (ex: cron job no servidor)

---

## 🚀 **COMO IMPLEMENTAR**

### **PASSO 1: Executar o arquivo base**

```bash
# Abrir no Supabase SQL Editor:
automacao_sincronizacao_COMPLETA.sql
```

1. Copie TODO o conteúdo
2. Cole no Supabase SQL Editor
3. Execute (▶️)

Isso vai criar:
- ✅ Função principal `sync_dre_fabric_to_transactions()`
- ✅ Índice único em `chave_id`
- ✅ View de monitoramento `vw_sync_status`

---

### **PASSO 2: Escolher e ativar uma opção**

#### **Se escolher OPÇÃO A (Trigger):**

Descomente o bloco no arquivo:

```sql
-- REMOVER os /* e */ ao redor do bloco "OPÇÃO A"
CREATE OR REPLACE FUNCTION trigger_sync_to_transactions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_dre_fabric_to_transactions(1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ... resto do código
```

Execute novamente no Supabase.

---

#### **Se escolher OPÇÃO B (Agendada):**

1. Verificar se `pg_cron` está habilitado:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. Se não estiver, habilitar:
   - Supabase Dashboard → Database → Extensions
   - Buscar `pg_cron` → Enable

3. Descomente o bloco no arquivo:

```sql
-- REMOVER os /* e */ ao redor do bloco "OPÇÃO B"
SELECT cron.schedule(
  'sync-fabric-to-transactions',
  '*/5 * * * *',  -- A cada 5 minutos
  $$SELECT sync_dre_fabric_to_transactions(NULL)$$
);
```

4. Execute no Supabase.

**Cron Expressions:**
- `*/5 * * * *` = A cada 5 minutos
- `*/15 * * * *` = A cada 15 minutos
- `0 * * * *` = A cada hora (no minuto 0)
- `0 */6 * * *` = A cada 6 horas
- `0 0 * * *` = Todo dia à meia-noite

---

#### **Se escolher OPÇÃO C (Manual):**

Já está pronta! Basta executar quando quiser:

```sql
-- Sincronizar TUDO
SELECT * FROM sync_dre_fabric_to_transactions(NULL);

-- Sincronizar apenas 1000 registros
SELECT * FROM sync_dre_fabric_to_transactions(1000);

-- Testar com 10 registros
SELECT * FROM sync_dre_fabric_to_transactions(10);
```

---

## 📊 **MONITORAMENTO**

### **Ver status da sincronização:**

```sql
SELECT * FROM vw_sync_status;
```

Retorna:
```
total_dre_fabric | total_transactions | diferenca | ultima_atualizacao_fabric | ultima_atualizacao_transactions
----------------+--------------------+-----------+--------------------------+--------------------------------
96797           | 50000              | 46797     | 2026-02-03 10:30:00      | 2026-02-03 10:15:00
```

---

### **Executar sincronização manual e ver resultado:**

```sql
SELECT * FROM sync_dre_fabric_to_transactions(NULL);
```

Retorna:
```
total_processados | novos_inseridos | atualizados | erros
-----------------+----------------+-------------+-------
1523             | 1500           | 23          | 0
```

---

### **Ver últimos registros sincronizados:**

```sql
SELECT
  chave_id,
  date,
  LEFT(description, 30) as description,
  amount,
  type,
  filial,
  updated_at
FROM transactions
ORDER BY updated_at DESC
LIMIT 10;
```

---

## 🔧 **GERENCIAMENTO**

### **Ver jobs agendados (se usar OPÇÃO B):**

```sql
SELECT * FROM cron.job;
```

### **Desagendar job:**

```sql
SELECT cron.unschedule('sync-fabric-to-transactions');
```

### **Reagendar com nova frequência:**

```sql
-- Desagendar o antigo
SELECT cron.unschedule('sync-fabric-to-transactions');

-- Agendar com nova frequência (ex: a cada 15 minutos)
SELECT cron.schedule(
  'sync-fabric-to-transactions',
  '*/15 * * * *',
  $$SELECT sync_dre_fabric_to_transactions(NULL)$$
);
```

### **Desabilitar triggers (se usar OPÇÃO A):**

```sql
DROP TRIGGER IF EXISTS after_insert_sync_transactions ON dre_fabric;
DROP TRIGGER IF EXISTS after_update_sync_transactions ON dre_fabric;
```

---

## 🎯 **RECOMENDAÇÃO**

### **Para começar:**

1. ✅ Execute o arquivo `automacao_sincronizacao_COMPLETA.sql` (cria as funções)
2. ✅ Teste com OPÇÃO C (manual):
   ```sql
   SELECT * FROM sync_dre_fabric_to_transactions(100);
   ```
3. ✅ Verifique o resultado:
   ```sql
   SELECT * FROM vw_sync_status;
   ```
4. ✅ Se funcionar bem, escolha:
   - **OPÇÃO B** (agendada) se disponível pg_cron ⭐
   - **OPÇÃO A** (trigger) se precisar tempo real
   - **OPÇÃO C** (manual) combinada com cron job externo

---

## 📝 **TABELA DE LOG (OPCIONAL)**

Se quiser manter histórico das sincronizações:

```sql
CREATE TABLE IF NOT EXISTS sync_log (
  id BIGSERIAL PRIMARY KEY,
  total_processados BIGINT,
  novos_inseridos BIGINT,
  atualizados BIGINT,
  erros BIGINT,
  duracao_ms INTEGER,
  sync_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modificar a função para logar
-- (adicionar no final da função sync_dre_fabric_to_transactions)
INSERT INTO sync_log (total_processados, novos_inseridos, atualizados, erros)
VALUES (v_processados, v_inseridos, v_atualizados, v_erros);

-- Ver histórico
SELECT * FROM sync_log ORDER BY sync_at DESC LIMIT 20;
```

---

## ⚠️ **NOTAS IMPORTANTES**

1. **Índice único em chave_id:**
   - É criado automaticamente pelo script
   - Necessário para o UPSERT funcionar (evita duplicatas)

2. **Performance:**
   - OPÇÃO A (trigger): Pode impactar inserções se volume for alto
   - OPÇÃO B (agendada): Melhor para alto volume
   - OPÇÃO C (manual): Flexível, você controla

3. **Supabase Free Tier:**
   - `pg_cron` pode não estar disponível
   - Nesse caso, use OPÇÃO A (trigger) ou OPÇÃO C (manual)

4. **Registros existentes:**
   - A função usa UPSERT (ON CONFLICT)
   - Não duplica registros
   - Atualiza se já existir

---

## 🆘 **TROUBLESHOOTING**

### **Erro: "relation transactions does not have unique constraint"**

**Solução:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_chave_id_unique
ON transactions(chave_id)
WHERE chave_id IS NOT NULL;
```

### **Erro: "pg_cron extension not found"**

**Solução:**
- Supabase Dashboard → Database → Extensions → Habilitar `pg_cron`
- OU use OPÇÃO A (trigger) ou OPÇÃO C (manual)

### **Sincronização não está funcionando**

**Verificar:**
```sql
-- 1. Ver se há registros novos no fabric
SELECT COUNT(*) FROM dre_fabric
WHERE type IS NOT NULL
  AND chave IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM transactions WHERE chave_id = dre_fabric.chave);

-- 2. Ver se trigger está ativo (se usar OPÇÃO A)
SELECT * FROM pg_trigger WHERE tgname LIKE '%sync%';

-- 3. Ver se job está agendado (se usar OPÇÃO B)
SELECT * FROM cron.job WHERE jobname = 'sync-fabric-to-transactions';
```

---

**Última atualização:** 2026-02-03
**Suporte:** Documentação completa em `automacao_sincronizacao_COMPLETA.sql`
