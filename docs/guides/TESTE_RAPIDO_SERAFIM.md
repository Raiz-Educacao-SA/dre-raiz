# 🚨 Teste Rápido - Por que Serafim vê tudo?

## ⚡ Passo 1: Execute o Diagnóstico (2 min)

No **Supabase SQL Editor**:

```sql
-- Execute: DIAGNOSTICO_RLS_SERAFIM.sql
```

**Verifique a mensagem final:**
- ❌ "Usuário é ADMIN" → Problema encontrado!
- ❌ "Usuário SEM permissões" → Problema encontrado!
- ⚠️ "RLS está ATIVADO" → Pode causar problemas

---

## ⚡ Passo 2: Aplique as Correções (1 min)

No **Supabase SQL Editor**:

```sql
-- Execute: CORRIGIR_SERAFIM_NAO_FILTRA.sql
```

Isso vai:
1. ✅ Verificar se é admin (e avisar)
2. ✅ Limpar permissões antigas
3. ✅ Adicionar VENDAS e MARKETING
4. ✅ Desabilitar RLS (temporário)

---

## ⚡ Passo 3: Teste no App (3 min)

### 3.1 Logout/Login
1. Abra o app
2. **LOGOUT** (importante!)
3. **LOGIN** com `serafim.edmilson@gmail.com`

### 3.2 Abra o Console
1. Pressione **F12** (DevTools)
2. Vá para a aba **Console**
3. Deixe aberto enquanto testa

### 3.3 Vá para Lançamentos
1. Clique na guia **Lançamentos**
2. Clique em **Buscar Dados**

### 3.4 Veja os Logs no Console

**✅ Se estiver funcionando, vai aparecer:**
```
🔒 usePermissions: Carregando permissões para serafim.edmilson@gmail.com
🔒 usePermissions: Usuário encontrado no banco
🔒 usePermissions: Permissões carregadas [...]
🔒 usePermissions: Filtrando transações...
🔒 usePermissions: Filtragem concluída { totalOriginal: 119000, totalFiltrado: 5000 }
```

**❌ Se aparecer isso, é o PROBLEMA:**
```
🔒 usePermissions: Usuário é ADMIN - Acesso Total (sem restrições)
```
→ **Solução:** Mudar role para "viewer" no SQL

**❌ Ou se aparecer:**
```
🔒 usePermissions: SEM permissões configuradas - Acesso Total
```
→ **Solução:** Verificar se as permissões foram criadas no banco

---

## 📊 Passo 4: Verifique os Dados

Na guia **Lançamentos**, veja se:

- ✅ Total de registros é MENOR que antes?
- ✅ Só aparecem transações com TAG01 = 'VENDAS' ou 'MARKETING'?
- ❌ Ainda aparecem TODAS as transações?

---

## 🐛 Problemas Mais Comuns

### Problema 1: "Usuário é ADMIN"

**Console mostra:**
```
🔒 usePermissions: Usuário é ADMIN - Acesso Total
```

**Solução:**
```sql
-- No Supabase SQL Editor:
UPDATE users
SET role = 'viewer'
WHERE email = 'serafim.edmilson@gmail.com';
```

Depois: **LOGOUT → LOGIN** no app

---

### Problema 2: "SEM permissões configuradas"

**Console mostra:**
```
🔒 usePermissions: SEM permissões configuradas - Acesso Total
```

**Solução:**
```sql
-- Verificar se permissões existem:
SELECT * FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'serafim.edmilson@gmail.com';
```

Se retornar vazio, execute `CORRIGIR_SERAFIM_NAO_FILTRA.sql` novamente.

---

### Problema 3: Case Sensitivity

**Console mostra filtrando mas ainda vê tudo:**

**Causa:** Valor no banco é diferente (ex: "Vendas" vs "VENDAS")

**Verificar:**
```sql
-- Ver valores EXATOS no banco:
SELECT DISTINCT tag01
FROM transactions
WHERE tag01 ILIKE '%venda%'
   OR tag01 ILIKE '%marketing%';
```

**Corrigir:**
```sql
-- Usar valor EXATO do banco:
UPDATE user_permissions
SET permission_value = 'Vendas'  -- ← Usar valor exato
WHERE user_id = (SELECT id FROM users WHERE email = 'serafim.edmilson@gmail.com')
  AND permission_type = 'tag01'
  AND permission_value = 'VENDAS';
```

---

## 📸 Me Envie

Se não funcionar, me envie **screenshot do Console (F12)** mostrando os logs com `🔒`.

---

## ✅ Sucesso Esperado

**Console:**
```
🔒 usePermissions: Permissões carregadas [{ type: 'tag01', value: 'VENDAS' }, { type: 'tag01', value: 'MARKETING' }]
🔒 usePermissions: Filtrando transações... { allowedTag01: ['VENDAS', 'MARKETING'] }
🔒 usePermissions: Filtragem concluída { totalOriginal: 119000, totalFiltrado: 8500 }
```

**Tela:**
- Lançamentos mostra só 8.500 registros (ao invés de 119k)
- Todos têm TAG01 = 'VENDAS' ou 'MARKETING'
