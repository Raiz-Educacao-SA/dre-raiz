# Instruções: Row Level Security (RLS)

## 📋 Visão Geral

O sistema agora possui controle de acesso baseado em permissões. Os usuários podem ter acesso restrito a:
- **CIA (Marcas)**: Ex: "SAP", "RAIZ"
- **Filial**: Ex: "SAP Alphaville", "RAIZ Barra"
- **Centro de Custo**: Ex: "Marketing", "Tecnologia"

## 🔧 Como Ativar o RLS no Supabase

### Passo 1: Executar o Script SQL

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione o projeto **dre-raiz**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**
5. Abra o arquivo `schema-rls.sql` deste projeto
6. Copie todo o conteúdo e cole no editor SQL
7. Clique em **RUN** para executar

### Passo 2: Verificar a Execução

Após executar o script, você verá:
- ✅ Funções criadas: `has_permission`, `can_access_transaction`
- ✅ Políticas RLS criadas para todas as tabelas
- ✅ Views auxiliares criadas

## 🎯 Como Funciona

### Sistema de Permissões

1. **Admin** - Acesso total a todos os dados
2. **Manager** - Pode solicitar alterações, acesso baseado em permissões
3. **Viewer** - Visualização apenas, acesso baseado em permissões

### Regras de Acesso

- **Sem permissões configuradas** = Acesso total a todos os dados
- **Com permissões configuradas** = Acesso apenas aos dados permitidos

### Exemplo Prático

**Cenário 1: Gestor de Filial**
```
Usuário: joao@raizeducacao.com.br
Função: Manager
Permissões:
  - Tipo: filial
  - Valor: SAP Alphaville

Resultado: João vê APENAS transações da filial SAP Alphaville
```

**Cenário 2: Gerente Regional**
```
Usuário: maria@raizeducacao.com.br
Função: Manager
Permissões:
  - Tipo: cia
  - Valor: SAP
  - Tipo: cia
  - Valor: RAIZ

Resultado: Maria vê transações de todas filiais das marcas SAP e RAIZ
```

**Cenário 3: Diretor Financeiro**
```
Usuário: carlos@raizeducacao.com.br
Função: Admin
Permissões: (nenhuma)

Resultado: Carlos vê TODOS os dados (admin tem acesso total)
```

## 🔐 Configurando Permissões de Usuários

### Via Painel Admin

1. Faça login como **admin**
2. Acesse o menu **ADMIN** no sidebar
3. Selecione o usuário desejado
4. Escolha a função (Viewer/Manager/Admin)
5. Adicione permissões:
   - Selecione o tipo (Centro de Custo/CIA/Filial)
   - Digite o valor exato
   - Clique em "Adicionar Permissão"

### Via SQL (Direto no Supabase)

```sql
-- 1. Encontrar o ID do usuário
SELECT id, email, name FROM users WHERE email = 'usuario@raizeducacao.com.br';

-- 2. Adicionar permissão de filial
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES ('uuid-do-usuario', 'filial', 'SAP Alphaville');

-- 3. Adicionar permissão de CIA
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES ('uuid-do-usuario', 'cia', 'SAP');

-- 4. Ver todas as permissões do usuário
SELECT
  u.email,
  u.name,
  u.role,
  up.permission_type,
  up.permission_value
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'usuario@raizeducacao.com.br';
```

## 🚀 Ativando Segurança Total (Produção)

Por padrão, as políticas RLS estão em modo **público** (TRUE) para compatibilidade durante desenvolvimento. Para ativar segurança total em produção:

### 1. Editar o arquivo `schema-rls.sql`

Localize as linhas com comentários `-- Em produção:` e descomente-as.

**Antes:**
```sql
CREATE POLICY "Users can read transactions based on permissions" ON transactions
  FOR SELECT USING (
    -- Por enquanto, mantemos acesso público para compatibilidade
    -- can_access_transaction(current_setting('app.user_email', true), brand, branch)
    TRUE
  );
```

**Depois:**
```sql
CREATE POLICY "Users can read transactions based on permissions" ON transactions
  FOR SELECT USING (
    can_access_transaction(current_setting('app.user_email', true), brand, branch)
  );
```

### 2. Re-executar o script no Supabase

Execute novamente o script SQL atualizado no Supabase SQL Editor.

### 3. Configurar sessão do usuário

No código do app, ao fazer queries, definir o email do usuário:

```typescript
// Antes da query
await supabase.rpc('set_config', {
  setting: 'app.user_email',
  value: user.email
});

// Depois fazer a query normalmente
const { data } = await supabase.from('transactions').select('*');
```

## ⚠️ Importante

1. **Backup**: Sempre faça backup do banco antes de executar scripts SQL
2. **Teste**: Teste em ambiente de desenvolvimento antes de produção
3. **Permissões Vazias**: Usuários sem permissões específicas têm acesso total
4. **Admin Sempre Total**: Admin sempre tem acesso completo, independente de permissões

## 🧪 Como Testar

1. **Criar usuário de teste**:
   - Faça login com uma conta Google diferente
   - Sistema criará automaticamente como "viewer"

2. **Configurar permissões**:
   - Como admin, acesse painel Admin
   - Configure permissões restritas para o usuário de teste

3. **Testar acesso**:
   - Faça logout
   - Faça login com o usuário de teste
   - Verifique que só vê dados permitidos
   - Veja o indicador "Acesso Restrito" no cabeçalho

## 📊 Monitoramento

Para ver quem está acessando o quê:

```sql
-- Ver todos os usuários e suas permissões
SELECT * FROM users_with_permissions;

-- Contar transações por usuário (baseado em permissões)
SELECT
  u.email,
  u.role,
  COUNT(DISTINCT t.id) as total_transactions
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
LEFT JOIN transactions t ON (
  up.permission_type = 'filial' AND t.branch = up.permission_value
  OR up.permission_type = 'cia' AND t.brand = up.permission_value
)
GROUP BY u.email, u.role;
```

## 🆘 Solução de Problemas

### Problema: "Usuário não vê dados após configurar permissões"

**Solução**: Verifique se os valores das permissões correspondem EXATAMENTE aos dados no banco.

```sql
-- Ver valores únicos no banco
SELECT DISTINCT brand FROM transactions WHERE brand IS NOT NULL;
SELECT DISTINCT branch FROM transactions WHERE branch IS NOT NULL;

-- Ver permissões do usuário
SELECT * FROM user_permissions WHERE user_id = 'uuid-do-usuario';
```

### Problema: "Admin não consegue acessar painel Admin"

**Solução**: Verificar se o role está correto:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'seu-email@raizeducacao.com.br';
```

## 📚 Documentação Adicional

- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Policies**: https://www.postgresql.org/docs/current/sql-createpolicy.html
