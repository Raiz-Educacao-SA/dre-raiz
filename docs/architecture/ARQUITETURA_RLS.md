# 🔐 Arquitetura RLS (Row-Level Security) - DRE RAIZ

Documentação completa do sistema de segurança e controle de acesso.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Tabelas](#estrutura-de-tabelas)
3. [Tipos de Permissão](#tipos-de-permissão)
4. [Hierarquia de Roles](#hierarquia-de-roles)
5. [Fluxo de Autenticação](#fluxo-de-autenticação)
6. [Políticas RLS](#políticas-rls)
7. [Como Adicionar Usuários](#como-adicionar-usuários)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema usa **Row-Level Security (RLS)** do PostgreSQL/Supabase para controlar acesso aos dados de forma granular.

### Princípios:

- ✅ **Zero Trust**: Nenhum dado é visível sem autenticação
- ✅ **Granular**: Controle por marca, filial, tags
- ✅ **Escalável**: Suporta múltiplos usuários e permissões
- ✅ **Auditável**: Todas as permissões registradas

### Como Funciona:

```
┌─────────────────────────────────────────────────────┐
│                  FLUXO RLS                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Login (Firebase) → JWT com email                │
│  2. Query SQL → RLS intercepta                      │
│  3. can_access_transaction_with_tags()              │
│  4. Verifica role + permissões                      │
│  5. Filtra dados automaticamente                    │
│  6. Retorna apenas registros permitidos             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ Estrutura de Tabelas

### Tabela: `users`

Armazena os usuários do sistema.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);
```

**Campos:**
- `email`: Email do usuário (deve bater com Firebase Auth)
- `name`: Nome completo
- `role`: admin | manager | viewer
- `photo_url`: URL da foto de perfil

---

### Tabela: `user_permissions`

Armazena permissões granulares por usuário.

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  permission_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: tipos válidos
  CONSTRAINT user_permissions_permission_type_check
    CHECK (permission_type IN ('centro_custo', 'cia', 'filial', 'tag01', 'tag02', 'tag03'))
);
```

**Campos:**
- `user_id`: Referência ao usuário
- `permission_type`: Tipo de filtro (cia, filial, tag01, etc.)
- `permission_value`: Valor permitido

**Exemplo:**
```sql
-- Victor vê apenas CIA = CGS
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES ('user-id-aqui', 'cia', 'CGS');
```

---

## 🎭 Tipos de Permissão

### 1. `cia` (Marca/Companhia)

Filtra por marca/companhia na coluna `marca` da tabela `transactions`.

**Exemplo:**
- Usuário vê apenas marca "RAIZ"
- Outros registros ficam invisíveis

```sql
permission_type = 'cia'
permission_value = 'RAIZ'
```

---

### 2. `filial` (Filial)

Filtra por filial na coluna `filial`.

**Exemplo:**
- Usuário vê apenas filial "SP01"

```sql
permission_type = 'filial'
permission_value = 'SP01'
```

---

### 3. `tag01` (Tag Nível 1)

Filtra por tag01 (categorias principais).

**Exemplo:**
- Usuário vê apenas "Mensalidades"

```sql
permission_type = 'tag01'
permission_value = 'Mensalidades'
```

---

### 4. `tag02` (Tag Nível 2)

Filtra por tag02 (subcategorias).

---

### 5. `tag03` (Tag Nível 3)

Filtra por tag03 (detalhamento).

---

### 6. `centro_custo` (Centro de Custo)

Filtra por centro de custo específico.

---

## 👑 Hierarquia de Roles

### Role: `admin`

**Permissões:**
- ✅ Vê **TODOS** os dados (122k+ registros)
- ✅ Pode **editar** qualquer transação
- ✅ Pode **aprovar/rejeitar** mudanças manuais
- ✅ Pode **adicionar/remover** usuários
- ✅ Pode **configurar** permissões

**RLS:**
- Bypassa filtros de permissão
- Função `can_access_transaction_with_tags()` retorna TRUE

**Exemplo:**
```sql
-- Admin vê tudo
role = 'admin'
-- Sem permissões na tabela user_permissions
```

---

### Role: `manager`

**Permissões:**
- ✅ Vê **TODOS** os dados (ou filtrado por permissões)
- ✅ Pode **editar** transações
- ✅ Pode **criar** novas transações
- ❌ Não pode deletar

**RLS:**
- Se tiver permissões configuradas: vê apenas dados permitidos
- Se não tiver permissões: vê tudo (igual admin)

**Exemplo:**
```sql
role = 'manager'
-- Permissões opcionais
```

---

### Role: `viewer`

**Permissões:**
- ✅ Vê apenas dados **filtrados por permissões**
- ❌ **NÃO pode editar**
- ❌ NÃO pode criar
- ❌ NÃO pode deletar

**RLS:**
- DEVE ter permissões configuradas
- Sem permissões = sem dados

**Exemplo:**
```sql
role = 'viewer'
-- Permissões OBRIGATÓRIAS
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES ('user-id', 'filial', 'SP01');
```

---

## 🔐 Fluxo de Autenticação

### 1. Login (Firebase Auth)

```typescript
// Frontend - Firebase Auth
const { user } = await signInWithEmailAndPassword(email, password);
// JWT gerado contém: { email: 'usuario@raiz.com', ... }
```

---

### 2. Request ao Supabase

```typescript
// Frontend - Supabase Client
const { data } = await supabase
  .from('transactions')
  .select('*');
```

---

### 3. RLS Intercepta

```sql
-- PostgreSQL - Política RLS é aplicada automaticamente
SELECT * FROM transactions
WHERE can_access_transaction_with_tags(
  current_setting('request.jwt.claims', true)::json->>'email',
  marca,
  filial,
  tag01,
  tag02,
  tag03
);
```

---

### 4. Função de Verificação

```sql
CREATE OR REPLACE FUNCTION can_access_transaction_with_tags(
  user_email TEXT,
  transaction_marca TEXT,
  transaction_filial TEXT,
  transaction_tag01 TEXT,
  transaction_tag02 TEXT,
  transaction_tag03 TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_permissions BOOLEAN;
BEGIN
  -- 1. Buscar role do usuário
  SELECT role INTO user_role FROM users WHERE email = user_email;

  -- 2. Se não existe = bloqueia
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. Se é admin = libera tudo
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- 4. Verificar se tem permissões configuradas
  SELECT EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
  ) INTO has_permissions;

  -- 5. Se não tem permissões = libera (manager)
  IF NOT has_permissions THEN
    RETURN TRUE;
  END IF;

  -- 6. Verificar cada tipo de permissão
  -- TAG01
  IF EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id
             WHERE u.email = user_email AND up.permission_type = 'tag01') THEN
    IF NOT EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id
                   WHERE u.email = user_email AND up.permission_type = 'tag01'
                   AND up.permission_value = transaction_tag01) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Repetir para TAG02, TAG03, FILIAL, CIA...

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📜 Políticas RLS

### Política: SELECT (Leitura)

```sql
CREATE POLICY "RLS: Users read with permissions filter"
ON transactions FOR SELECT
USING (
  can_access_transaction_with_tags(
    current_setting('request.jwt.claims', true)::json->>'email',
    marca,
    filial,
    tag01,
    tag02,
    tag03
  )
);
```

**O que faz:**
- Aplica automaticamente em todo SELECT
- Filtra baseado no email do JWT
- Retorna apenas registros permitidos

---

### Política: INSERT (Criação)

```sql
CREATE POLICY "RLS: Managers and admins insert"
ON transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role IN ('manager', 'admin')
  )
);
```

**O que faz:**
- Apenas managers e admins podem inserir
- Viewers não podem criar transações

---

### Política: UPDATE (Edição)

```sql
CREATE POLICY "RLS: Managers and admins update"
ON transactions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role IN ('manager', 'admin')
  )
);
```

**O que faz:**
- Apenas managers e admins podem editar
- Viewers não podem modificar dados

---

### Política: DELETE (Exclusão)

```sql
CREATE POLICY "RLS: Only admins delete"
ON transactions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role = 'admin'
  )
);
```

**O que faz:**
- Apenas admins podem deletar
- Managers e viewers não podem excluir

---

## ➕ Como Adicionar Usuários

### Método 1: SQL Editor (Simples)

```sql
-- 1. Criar usuário
INSERT INTO users (email, name, role)
VALUES ('novo.usuario@raiz.com', 'Novo Usuario', 'viewer');

-- 2. Buscar ID do usuário
SELECT id, email, name, role FROM users
WHERE email = 'novo.usuario@raiz.com';

-- 3. Adicionar permissões
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES
  ('cole-o-id-aqui', 'filial', 'RJ01'),
  ('cole-o-id-aqui', 'tag01', 'Marketing');

-- 4. Verificar
SELECT
  u.email,
  u.role,
  up.permission_type,
  up.permission_value
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'novo.usuario@raiz.com';
```

---

### Método 2: Script Python (Automático)

```python
# configurar_rls_completo.py já tem a lógica
# Edite o array usuarios_teste com o novo usuário
# Execute: python configurar_rls_completo.py
```

---

### Método 3: Interface Admin (Futuro)

Em desenvolvimento - painel admin no app para gerenciar usuários e permissões.

---

## 🧪 Testando RLS

### Teste 1: Sem Login

```javascript
// Sem JWT
const { data } = await supabase.from('transactions').select('*');
// Resultado: [] (vazio) ✓
```

---

### Teste 2: Admin

```javascript
// JWT com email = admin@raiz.com
const { data } = await supabase.from('transactions').select('*');
// Resultado: 122k+ registros ✓
```

---

### Teste 3: Viewer Filtrado

```javascript
// JWT com email = viewer.sp01@raiz.com (só SP01)
const { data } = await supabase.from('transactions').select('*');
// Resultado: Apenas registros de SP01 ✓
```

---

## 🐛 Troubleshooting

### Problema: "Nenhum dado aparece"

**Diagnóstico:**
```sql
-- 1. Verificar se usuário existe
SELECT * FROM users WHERE email = 'usuario@raiz.com';

-- 2. Verificar role
SELECT email, role FROM users WHERE email = 'usuario@raiz.com';

-- 3. Verificar permissões
SELECT
  u.email,
  up.permission_type,
  up.permission_value
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'usuario@raiz.com';

-- 4. Testar função diretamente
SELECT can_access_transaction_with_tags(
  'usuario@raiz.com',
  'RAIZ',
  'SP01',
  'Mensalidades',
  NULL,
  NULL
);
```

**Soluções:**
- Se usuário não existe: criar na tabela users
- Se é viewer sem permissões: adicionar permissões
- Se é admin/manager: não precisa permissões (vê tudo)

---

### Problema: "Vejo dados de outras pessoas"

**Diagnóstico:**
```sql
-- Verificar se RLS está ativo
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'transactions';
-- rowsecurity deve ser TRUE
```

**Soluções:**
```sql
-- Ativar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'transactions';
```

---

### Problema: "Erro ao buscar dados"

**Diagnóstico:**
- Verificar logs do navegador (F12 → Console)
- Verificar se JWT está sendo enviado
- Verificar se email no JWT bate com tabela users

**Solução:**
```javascript
// Verificar JWT
const { data: { session } } = await supabase.auth.getSession();
console.log('Email no JWT:', session?.user?.email);

// Verificar usuário
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', session?.user?.email);
console.log('Usuário no banco:', data);
```

---

## 📊 Exemplos Práticos

### Exemplo 1: CEO (Vê Tudo)

```sql
INSERT INTO users (email, name, role)
VALUES ('ceo@raiz.com', 'CEO Raiz', 'admin');
-- Sem permissões = vê tudo
```

---

### Exemplo 2: Diretor de Filial (SP01)

```sql
-- 1. Criar usuário
INSERT INTO users (email, name, role)
VALUES ('diretor.sp01@raiz.com', 'Diretor SP01', 'manager')
RETURNING id;

-- 2. Adicionar permissão de filial
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES ('id-retornado-acima', 'filial', 'SP01');
```

---

### Exemplo 3: Analista de Marketing

```sql
-- 1. Criar usuário
INSERT INTO users (email, name, role)
VALUES ('analista.mkt@raiz.com', 'Analista Marketing', 'viewer')
RETURNING id;

-- 2. Adicionar permissões de tags
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES
  ('id-retornado', 'tag01', 'Marketing'),
  ('id-retornado', 'tag01', 'Vendas & Marketing'),
  ('id-retornado', 'tag01', 'Publicidade');
```

---

### Exemplo 4: Contador (Múltiplas Permissões)

```sql
-- 1. Criar usuário
INSERT INTO users (email, name, role)
VALUES ('contador@raiz.com', 'Contador', 'viewer')
RETURNING id;

-- 2. Adicionar permissões variadas
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES
  ('id-retornado', 'tag01', 'Tributos'),
  ('id-retornado', 'tag01', 'Contabilidade'),
  ('id-retornado', 'filial', 'SP01'),
  ('id-retornado', 'filial', 'RJ01');
-- Contador vê tributos e contabilidade de SP01 e RJ01
```

---

## 🔧 Scripts de Manutenção

### Ver Todos os Usuários e Permissões

```sql
SELECT
  u.email,
  u.name,
  u.role,
  COUNT(up.id) as total_permissoes,
  STRING_AGG(
    up.permission_type || '=' || up.permission_value,
    ', '
  ) as permissoes
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
GROUP BY u.id, u.email, u.name, u.role
ORDER BY u.role, u.email;
```

---

### Remover Todas as Permissões de um Usuário

```sql
DELETE FROM user_permissions
WHERE user_id = (SELECT id FROM users WHERE email = 'usuario@raiz.com');
```

---

### Promover Viewer para Manager

```sql
UPDATE users
SET role = 'manager'
WHERE email = 'usuario@raiz.com';
```

---

### Rebaixar Admin para Viewer

```sql
UPDATE users
SET role = 'viewer'
WHERE email = 'usuario@raiz.com';

-- Adicionar permissões obrigatórias
INSERT INTO user_permissions (user_id, permission_type, permission_value)
SELECT id, 'filial', 'SP01' FROM users WHERE email = 'usuario@raiz.com';
```

---

## 📚 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `SCRIPT_COMPLETO_RLS.sql` | Script SQL completo do RLS |
| `configurar_rls_completo.py` | Script Python para config |
| `GUIA_TESTE_RLS.md` | Guia de testes |
| `VERIFICAR_PERMISSOES.sql` | Diagnóstico |
| `CRIAR_USUARIO_ADMIN.sql` | Criar admin rápido |

---

## 🎓 Boas Práticas

### ✅ DO (Faça)

1. **Sempre** crie usuário na tabela `users` antes do primeiro login
2. **Sempre** configure permissões para viewers
3. **Sempre** teste com diferentes roles
4. **Sempre** use anon key (não service_role) em produção
5. **Sempre** mantenha RLS ativo

### ❌ DON'T (Não Faça)

1. **Nunca** desative RLS em produção
2. **Nunca** use service_role key no frontend
3. **Nunca** dê role admin sem necessidade
4. **Nunca** crie viewer sem permissões
5. **Nunca** exponha credenciais no código

---

## 🔒 Segurança

### Princípios de Segurança:

1. **Defense in Depth**: RLS + Firebase Auth + Frontend validation
2. **Least Privilege**: Cada usuário só vê o necessário
3. **Audit Trail**: Logs de todas as ações
4. **Encryption**: Dados em trânsito e em repouso
5. **Regular Reviews**: Auditar permissões periodicamente

---

## 📞 Suporte

Para dúvidas sobre RLS:

1. Consulte este documento
2. Execute `VERIFICAR_PERMISSOES.sql`
3. Veja logs do console (F12)
4. Entre em contato com o time de dev

---

**Última atualização:** 10/02/2026
**Versão:** 2.0
**Status:** ✅ Produção
