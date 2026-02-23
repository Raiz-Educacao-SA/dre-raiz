# Controle de Acesso por Permissão (RLS) — Firebase + Supabase

## Visão Geral

O sistema usa duas camadas de controle de acesso:

| Camada | Onde | O que faz |
|--------|------|-----------|
| **Camada 1 — Banco** | Supabase RLS + `get_soma_tags` | Filtra dados no PostgreSQL antes de chegar ao frontend |
| **Camada 2 — Frontend** | `filterTransactions` (App.tsx) | Filtra transações nas views de Lançamentos/KPIs |

---

## 1. Configurar o Provider Firebase no Supabase

### 1.1 Acessar as configurações

1. Acesse o painel do Supabase → **Authentication → Providers**
2. Localize e expanda o provider **Firebase**

### 1.2 Preencher as credenciais

- **Project ID**: ID do projeto Firebase (encontrado no console Firebase → Configurações do Projeto)
- **Service Account Key** (chave secreta): JSON da conta de serviço Firebase

> Para gerar a chave: Firebase Console → Configurações do Projeto → Contas de Serviço → Gerar nova chave privada

### 1.3 Opções importantes

| Opção | Valor | Motivo |
|-------|-------|--------|
| **Skip nonce checks** | ✅ Ativar | Tokens Firebase padrão não incluem nonce |
| **Allow users without an email** | ❌ Não ativar | O sistema usa `auth.email()` nas RLS policies |

Salvar as configurações.

---

## 2. Integrar a Sessão Firebase com o Supabase no Código

### Arquivo: `contexts/AuthContext.tsx`

Após o login Firebase ser bem-sucedido, enviar o ID Token para o Supabase:

```typescript
// No onAuthStateChanged (restaura sessão ao recarregar página)
const idToken = await firebaseUser.getIdToken();
await supabase.auth.signInWithIdToken({ provider: 'firebase', token: idToken });

// No signInWithGoogle (login ativo)
const idToken = await result.user.getIdToken();
await supabase.auth.signInWithIdToken({ provider: 'firebase', token: idToken });

// No signOut (limpa sessão)
await supabase.auth.signOut();
```

> **Atenção**: o `provider` deve ser `'firebase'`, não `'google'`. Usar `'google'` faz o token ser rejeitado pelo Supabase.

---

## 3. Habilitar RLS nas Tabelas

### Verificar estado atual

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'transactions_orcado', 'transactions_ano_anterior', 'tag0_map');
```

### Ativar RLS

```sql
ALTER TABLE transactions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_orcado         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_ano_anterior   ENABLE ROW LEVEL SECURITY;
```

> `tag0_map` é uma tabela de mapeamento estática — pode ficar sem RLS.

### Criar policies de leitura para usuários autenticados

```sql
-- Permite que usuários autenticados leiam (o filtro fino é feito via parâmetros do RPC)
CREATE POLICY "authenticated can read transactions"
  ON transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can read transactions_orcado"
  ON transactions_orcado FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can read transactions_ano_anterior"
  ON transactions_ano_anterior FOR SELECT TO authenticated USING (true);
```

---

## 4. Adicionar Filtro de Permissão na Função RPC

A função `get_soma_tags` recebe parâmetros de permissão e os aplica como cláusulas `WHERE`.

### Parâmetros disponíveis

| Parâmetro | Tipo | Filtra por |
|-----------|------|-----------|
| `p_marcas` | `text[]` | Marca (CIA) |
| `p_nome_filiais` | `text[]` | Filial |
| `p_tags02` | `text[]` | Tag02 (UI) |
| `p_tags01` | `text[]` | Tag01 (permissão) |

### Padrão SQL para cada parâmetro

```sql
AND (p_tags01 IS NULL OR t.tag01 = ANY(p_tags01))
```

Quando o parâmetro é `NULL` (usuário sem restrição), a cláusula é ignorada → acesso total.
Quando preenchido, somente os valores permitidos retornam.

> Ver arquivo `fix_get_soma_tags_v7_tags01.sql` para a versão atual completa.

---

## 5. Tabela de Permissões no Supabase

### Estrutura da tabela `user_permissions`

| Coluna | Tipo | Valores possíveis |
|--------|------|-------------------|
| `id` | uuid | — |
| `user_id` | uuid | FK → `users.id` |
| `permission_type` | text | `cia`, `filial`, `centro_custo`, `tag01`, `tag02`, `tag03` |
| `permission_value` | text | Ex: `'Folha (Funcionários)'`, `'SP-001'` |

### Exemplo: restringir usuário à tag01 "Folha"

```sql
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES (
  (SELECT id FROM users WHERE email = 'serafim.edmilson@gmail.com'),
  'tag01',
  'Folha (Funcionários)'
);
```

### Verificar permissões de um usuário

```sql
SELECT u.email, u.role, p.permission_type, p.permission_value
FROM users u
LEFT JOIN user_permissions p ON p.user_id = u.id
WHERE u.email = 'serafim.edmilson@gmail.com';
```

---

## 6. Roles de Usuário

| Role | Acesso |
|------|--------|
| `admin` | Total — ignora todas as restrições |
| `manager` | Filtrado pelas permissões em `user_permissions` |
| `viewer` | Filtrado pelas permissões em `user_permissions` |
| `approver` | Filtrado, com permissão de aprovar/reprovar mudanças |
| `pending` | Bloqueado — vê tela de aguardando aprovação |

> Usuários `admin` retornam da função `usePermissions` com `hasPermissions: false`, ou seja, sem nenhuma restrição aplicada.

---

## 7. Como Adicionar um Novo Tipo de Permissão

Para adicionar, por exemplo, filtro por `tag02` na função RPC:

### Passo 1 — SQL: adicionar parâmetro

```sql
-- Já existe p_tags02. Para um novo tipo, ex: p_marcas_extra:
CREATE OR REPLACE FUNCTION get_soma_tags(
  ...
  p_novo_campo text[] DEFAULT NULL
)
...
AND (p_novo_campo IS NULL OR t.novo_campo = ANY(p_novo_campo))
```

### Passo 2 — TypeScript: `services/supabaseService.ts`

```typescript
export const getSomaTags = async (
  ...
  novoCampo?: string[],
) => {
  ...
  p_novo_campo: novoCampo && novoCampo.length > 0 ? novoCampo : null,
```

### Passo 3 — Componente: `SomaTagsView.tsx`

```typescript
// Props
allowedNovoCampo?: string[];

// fetchData
const novoCampoPerm = allowedNovoCampo?.length ? allowedNovoCampo : undefined;
getSomaTags(mFrom, mTo, marcas, filiais, tags02, tags01, novoCampoPerm)

// Deps do useCallback
}, [..., allowedNovoCampo]);
```

### Passo 4 — App.tsx

```typescript
// Dashboard
getSomaTags(..., allowedNovoCampo.length > 0 ? allowedNovoCampo : undefined)

// SomaTagsView
<SomaTagsView ... allowedNovoCampo={allowedNovoCampo.length > 0 ? allowedNovoCampo : undefined} />
```

---

## 8. Diagnóstico de Problemas

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| Usuário vê todos os dados mesmo com permissão | `filterTransactions` desabilitado | Verificar `App.tsx` linha `filteredTransactions` |
| Sessão Supabase não estabelecida | Provider errado | Trocar `'google'` → `'firebase'` no `signInWithIdToken` |
| RPC retorna todos os dados | `p_tags01` não chegou | Verificar se `allowedTag01` foi passado para SomaTagsView e Dashboard |
| Usuário admin vê dados restritos | Role errado no banco | `UPDATE users SET role = 'admin' WHERE email = '...'` |
| Usuário sem permissão vê tudo | Nenhuma linha em `user_permissions` | Inserir permissões na tabela |

---

## Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `contexts/AuthContext.tsx` | Login Firebase + sessão Supabase |
| `hooks/usePermissions.ts` | Carrega permissões do banco e expõe `filterTransactions` |
| `services/supabaseService.ts` | Função `getSomaTags` com parâmetros de permissão |
| `components/SomaTagsView.tsx` | Recebe `allowedTag01`, passa para RPC |
| `App.tsx` | Orquestra permissões → SomaTagsView, Dashboard, filterTransactions |
| `fix_get_soma_tags_v7_tags01.sql` | SQL atual da função RPC com `p_tags01` |
