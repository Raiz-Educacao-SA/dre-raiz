# Debug - Sistema de Aprovação de Usuários

## 🐛 Problema Reportado

**Sintoma:** Novos usuários fazem login mas voltam para tela de login. Não aparece tela de "Aguardando Aprovação".

---

## 🔍 Passo 1: Teste com Console Aberto

### Como Fazer:

1. **Abrir site em aba anônima:**
   ```
   https://dre-raiz.vercel.app
   ```

2. **Abrir Console (F12 → aba Console)**

3. **Fazer login com email NOVO**
   - Usar conta Google que NUNCA acessou o sistema
   - Ex: uma conta pessoal, teste, etc.

4. **Copiar TODOS os logs que aparecerem**

### Logs Esperados:

Se tudo estiver funcionando, você deve ver:

```
🔐 Iniciando login com Google...
✅ Login Google bem-sucedido: novousuario@gmail.com
🔍 Buscando usuário no banco: novousuario@gmail.com
🆕 Usuário não encontrado - criando novo com role PENDING
✅ Novo usuário criado: { email: ..., role: "pending" }
👤 Novo usuário retornado: { email: ..., role: "pending" }
✅ Dados do usuário carregados: { email: ..., role: "pending" }
🔎 App.tsx - Usuário autenticado: { email: ..., role: "pending" }
⏳ Mostrando tela de Aguardando Aprovação
```

### Se algo estiver errado:

**Cenário A: Role não é 'pending'**
```
✅ Novo usuário criado: { email: ..., role: "viewer" }  ❌ ERRADO!
```

**Cenário B: Erro ao criar usuário**
```
❌ Erro ao buscar dados do usuário: [mensagem de erro]
```

**Cenário C: Usuário já existe**
```
✅ Usuário encontrado no banco: { email: ..., role: "viewer" }
```
(Nesse caso, precisa deletar o usuário do banco e tentar novamente)

---

## 🗄️ Passo 2: Verificar no Banco Supabase

### Abrir Supabase SQL Editor:

1. Ir em: https://supabase.com/dashboard
2. Selecionar projeto
3. Clicar em "SQL Editor" no menu lateral
4. Cole o SQL abaixo:

```sql
-- Ver todos os usuários recentes
SELECT
  email,
  name,
  role,
  created_at,
  last_login
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

### O que procurar:

**✅ Correto:**
```
email                    | role    | created_at
-------------------------|---------|-------------------
novousuario@gmail.com   | pending | 2026-01-28 ...
```

**❌ Errado:**
```
email                    | role    | created_at
-------------------------|---------|-------------------
novousuario@gmail.com   | viewer  | 2026-01-28 ...
```

Se a role estiver como "viewer" ao invés de "pending", há um problema no código.

---

## 🔧 Passo 3: Soluções Possíveis

### Solução 1: Deletar Usuário de Teste e Tentar Novamente

Se você testou com um email e ele foi criado como "viewer":

```sql
-- ATENÇÃO: Só use este comando em usuários de TESTE!
-- Substituir pelo email do usuário de teste
DELETE FROM users
WHERE email = 'usuario-teste@gmail.com';
```

Depois tente fazer login novamente com esse email.

### Solução 2: Mudar Role Manualmente para Testar

Se quiser testar a tela de "Aguardando":

```sql
-- Mudar um usuário existente para pending
UPDATE users
SET role = 'pending'
WHERE email = 'usuario-teste@gmail.com';
```

Depois faça logout e login novamente. Deve aparecer a tela.

### Solução 3: Verificar Estrutura da Tabela

Verificar se a coluna 'role' aceita o valor 'pending':

```sql
-- Ver estrutura da tabela users
SELECT
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users';
```

Deve ter:
- Coluna: `role`
- Tipo: `text` ou `varchar`

---

## 🧪 Passo 4: Teste Completo

### Teste 1: Novo Usuário

```bash
1. Aba anônima → https://dre-raiz.vercel.app
2. Console aberto (F12)
3. Login com email NOVO
4. ✅ Deve ver tela "Aguardando Aprovação"
5. ✅ Console deve mostrar role: "pending"
```

### Teste 2: Admin Vê o Pendente

```bash
1. Login como admin
2. Ir em menu "Admin"
3. ✅ Deve ver alerta amarelo
4. ✅ Deve ver badge "⏳ Pendentes: 1"
5. ✅ Usuário na lista com badge "⏳ Pendente"
```

### Teste 3: Admin Aprova

```bash
1. Como admin, clicar no usuário pendente
2. Clicar em "Viewer"
3. ✅ Mensagem de sucesso
4. ✅ Badge muda para "Viewer"
```

### Teste 4: Usuário Acessa

```bash
1. Como usuário (fazer logout e login)
2. ✅ Não vê mais tela de aguardando
3. ✅ Entra no dashboard
```

---

## 📊 Diagnóstico por Sintomas

### Sintoma: "Loga e volta para login"

**Possíveis causas:**
1. ❌ Erro ao criar usuário no banco (ver console)
2. ❌ Role está null ou undefined
3. ❌ Firebase não está salvando sessão
4. ❌ Erro na função fetchUserData

**Debug:**
- Abrir console e ver mensagens de erro
- Verificar se usuário foi criado no banco
- Ver logs: "❌ Erro ao buscar dados do usuário"

### Sintoma: "Não aparece tela de aguardando"

**Possíveis causas:**
1. ❌ Role está como "viewer" ao invés de "pending"
2. ❌ Componente PendingApprovalScreen não importado
3. ❌ Verificação if (user.role === 'pending') não funciona

**Debug:**
- Ver no console: "🔎 App.tsx - Usuário autenticado"
- Verificar qual role está aparecendo
- Se não for "pending", problema no createUser

### Sintoma: "Não aparece para admin aprovar"

**Possíveis causas:**
1. ❌ Usuário não foi criado com role "pending"
2. ❌ AdminPanel não está verificando role "pending"
3. ❌ Cache do navegador (admin precisa recarregar)

**Debug:**
- Admin deve fazer hard refresh (Ctrl+F5)
- Verificar no banco se role é "pending"
- Ver no console do admin se há erros

---

## 🔄 Checklist de Verificação

### Código:

- [ ] AuthContext cria usuário com role: 'pending' ✅
- [ ] App.tsx verifica if (user.role === 'pending') ✅
- [ ] PendingApprovalScreen está importado ✅
- [ ] AdminPanel mostra alerta de pendentes ✅

### Banco de Dados:

- [ ] Tabela 'users' tem coluna 'role'
- [ ] Coluna 'role' aceita valor 'pending'
- [ ] Usuários sendo criados com role 'pending'
- [ ] Sem constraints impedindo o valor

### Deploy:

- [ ] Deploy foi feito com sucesso
- [ ] Build completou sem erros
- [ ] URL de produção está respondendo
- [ ] Hard refresh feito (Ctrl+F5)

---

## 📞 Próximos Passos

**Para resolver, preciso que você:**

1. ✅ Faça o teste com console aberto
2. ✅ Me envie os logs que aparecerem
3. ✅ Me diga o email usado no teste
4. ✅ Execute o SQL de verificação no Supabase
5. ✅ Me envie o resultado da query

Com essas informações vou identificar exatamente o problema!

---

## 🆘 Comandos Úteis

### Limpar usuário de teste:
```sql
DELETE FROM users WHERE email = 'teste@gmail.com';
```

### Ver último usuário criado:
```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;
```

### Contar usuários por role:
```sql
SELECT role, COUNT(*) FROM users GROUP BY role;
```

### Mudar role para pending (teste):
```sql
UPDATE users SET role = 'pending' WHERE email = 'teste@gmail.com';
```

---

**Aguardando seus logs para continuar o debug!** 🔍
