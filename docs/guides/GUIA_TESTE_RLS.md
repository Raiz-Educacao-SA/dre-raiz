# 🔐 Guia de Teste RLS - DRE RAIZ

Sistema com **RLS ATIVO** configurado e pronto para testes!

---

## ✅ Status do Sistema

| Item | Status | Detalhes |
|------|--------|----------|
| **RLS** | 🟢 ATIVO | Row-Level Security funcionando |
| **Servidor** | 🟢 Rodando | Porta 5176 |
| **Usuários** | ✅ 12 cadastrados | 9 reais + 3 teste |
| **Permissões** | ✅ 13 configuradas | Por CIA, filial, tag01 |
| **Dados** | ✅ 122k+ registros | Banco populado |

---

## 🌐 Acesse o App

```
http://localhost:5176
```

---

## 👥 Usuários Disponíveis para Teste

### 🔴 ADMINS (Acesso Total - 122k registros)

**1. edmilson.serafim@raizeducacao.com.br**
- Seu usuário principal
- Vê TODOS os dados
- Pode editar/aprovar tudo

**2. admin@raiz.com** (usuário de teste)
- Vê TODOS os dados
- Acesso administrativo completo

---

### 🟡 MANAGERS (Acesso de Leitura/Escrita)

**3. andre.gusman@raizeducacao.com.br**
- Vê todos os dados (sem restrições por permissões)
- Pode editar transações

**4. manager.sp01@raiz.com** (usuário de teste)
- Vê apenas: filial = SP01
- Pode editar dentro da permissão

---

### 🟢 VIEWERS com Permissões Específicas

**5. gabriel.araujo@raizeducacao.com.br**
- Vê apenas 7 tags01 específicas:
  * Vendas & Marketing
  * Devoluções & Cancelamentos
  * Integral
  * Material Didático
  * Receita De Mensalidade
  * Receitas Extras
  * Tributos

**6. victor.santana@raizeducacao.com.br**
- Vê apenas: CIA = CGS

**7. carla.vianna@raizeducacao.com.br**
- Vê apenas: CIA = AP

**8. yago.monte@raizeducacao.com.br**
- Vê apenas: Centro de Custo = Salários Professores

**9. viewer.mensalidades@raiz.com** (usuário de teste)
- Vê apenas: tag01 = Mensalidades

---

### 🔴 VIEWERS sem Permissões (Verão NADA)

**10. raquel.sobrinho@raizeducacao.com.br**
- Sem permissões configuradas
- Não verá dados

**11. fabiana.ferreira@raizeducacao.com.br**
- Sem permissões configuradas
- Não verá dados

---

## 🧪 Roteiro de Teste

### Teste 1: Usuário SEM LOGIN (Bloqueado por RLS)

1. Acesse: http://localhost:5176
2. **NÃO faça login**
3. Vá para "Lançamentos"
4. Clique em "Buscar Dados"
5. **Resultado Esperado:**
   - ❌ Nenhum dado aparece
   - ✅ RLS bloqueou acesso!

---

### Teste 2: ADMIN (Vê Tudo)

1. Acesse: http://localhost:5176
2. Faça **LOGIN** como: `edmilson.serafim@raizeducacao.com.br`
3. Vá para "Lançamentos"
4. Clique em "Buscar Dados"
5. **Resultado Esperado:**
   - ✅ Vê **122k+ registros**
   - ✅ Todos os filtros funcionam
   - ✅ Pode editar qualquer transação

---

### Teste 3: VIEWER com Permissão Específica

1. **Faça LOGOUT** (se estiver logado)
2. Faça **LOGIN** como: `gabriel.araujo@raizeducacao.com.br`
3. Vá para "Lançamentos"
4. Clique em "Buscar Dados"
5. **Resultado Esperado:**
   - ✅ Vê apenas transações das 7 tags01 permitidas
   - ✅ NÃO vê outras tags
   - ❌ NÃO pode editar

---

### Teste 4: VIEWER sem Permissões (Bloqueado)

1. **Faça LOGOUT**
2. Faça **LOGIN** como: `raquel.sobrinho@raizeducacao.com.br`
3. Vá para "Lançamentos"
4. Clique em "Buscar Dados"
5. **Resultado Esperado:**
   - ❌ Nenhum dado aparece
   - ✅ RLS bloqueou (sem permissões configuradas)

---

### Teste 5: MANAGER com Filial Específica

1. **Faça LOGOUT**
2. Faça **LOGIN** como: `manager.sp01@raiz.com`
3. Vá para "Lançamentos"
4. Clique em "Buscar Dados"
5. **Resultado Esperado:**
   - ✅ Vê apenas transações da filial SP01
   - ✅ NÃO vê outras filiais
   - ✅ Pode editar transações da SP01

---

## 📊 Testando DRE com RLS

### Com ADMIN:
1. Login como admin
2. Guia "DRE"
3. Selecione período
4. Clique "Atualizar DRE"
5. **Resultado:** Vê DRE completo com todos os dados

### Com VIEWER restrito:
1. Login como gabriel.araujo (7 tags01)
2. Guia "DRE"
3. Selecione período
4. Clique "Atualizar DRE"
5. **Resultado:** Vê DRE apenas com as 7 tags01 permitidas

---

## 🔍 Como Verificar se RLS está Funcionando

### Método 1: Contar Registros

**Admin (vê tudo):**
```
Login → Buscar Dados → Vê ~122.026 registros
```

**Viewer (permissões específicas):**
```
Login → Buscar Dados → Vê menos registros (só os permitidos)
```

**Sem login:**
```
Buscar Dados → Vê 0 registros
```

---

### Método 2: Verificar Filtros

**Admin:**
- Todos os filtros mostram todas as opções

**Viewer restrito (ex: gabriel.araujo):**
- Filtro tag01 mostra apenas as 7 tags permitidas
- Outras tags não aparecem

---

### Método 3: Tentar Editar

**Admin/Manager:**
- Clique duplo em célula → Pode editar

**Viewer:**
- Clique duplo em célula → Não pode editar (bloqueado)

---

## 🐛 Troubleshooting

### Problema: "Nenhum dado aparece" mesmo logado

**Possíveis causas:**
1. Usuário não tem permissões configuradas
2. RLS está bloqueando acesso
3. Permissões configuradas não batem com dados existentes

**Solução:**
- Verifique no Supabase se o usuário tem permissões
- Execute: `SELECT * FROM user_permissions WHERE user_id = '...'`
- Verifique se os valores de permissão existem nos dados

---

### Problema: "Vejo TODOS os dados" mas deveria ver só alguns

**Possíveis causas:**
1. Usuário é admin ou manager (vê tudo por padrão)
2. RLS não está ativo
3. Usando service_role key (bypassa RLS)

**Solução:**
- Verifique o role do usuário (deve ser 'viewer' para filtrar)
- Confirme que .env.local usa anon key (não service_role)
- Execute no SQL: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'transactions';`

---

### Problema: RLS bloqueou TUDO (nem admin vê)

**Possível causa:**
- Política RLS muito restritiva
- Função `can_access_transaction_with_tags` com erro

**Solução:**
- Desativar RLS temporariamente:
  ```sql
  ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
  ```
- Revisar políticas RLS
- Reativar:
  ```sql
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  ```

---

## 📝 Checklist de Validação

Use este checklist para validar que o RLS está funcionando:

- [ ] ✅ Sem login → 0 registros
- [ ] ✅ Admin → 122k+ registros
- [ ] ✅ Manager → vê todos ou por filial
- [ ] ✅ Viewer com permissões → vê apenas dados permitidos
- [ ] ✅ Viewer sem permissões → 0 registros
- [ ] ✅ DRE filtra corretamente por usuário
- [ ] ✅ Dashboards mostram apenas dados permitidos
- [ ] ✅ Exportação respeita permissões
- [ ] ✅ Admin pode editar
- [ ] ✅ Manager pode editar (dentro da permissão)
- [ ] ✅ Viewer NÃO pode editar

---

## 🎓 Entendendo o Sistema RLS

```
┌─────────────────────────────────────────────────────┐
│ Fluxo de Acesso com RLS                             │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 1. Usuário faz LOGIN (Firebase Auth)                │
│    └─> Email extraído do token JWT                  │
│                                                      │
│ 2. Buscar dados no Supabase                         │
│    └─> RLS verifica email no JWT                    │
│                                                      │
│ 3. Função can_access_transaction_with_tags()        │
│    └─> Busca role do usuário na tabela 'users'      │
│    └─> Se admin: retorna TRUE (vê tudo)             │
│    └─> Se viewer: verifica 'user_permissions'       │
│                                                      │
│ 4. Filtrar dados                                    │
│    └─> Retorna apenas registros permitidos          │
│                                                      │
│ 5. App mostra dados filtrados                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Para Adicionar Novo Usuário com Permissões

### Via SQL Editor:

```sql
-- 1. Criar usuário
INSERT INTO users (email, name, role)
VALUES ('novo.usuario@raiz.com', 'Novo Usuario', 'viewer');

-- 2. Pegar ID do usuário
SELECT id FROM users WHERE email = 'novo.usuario@raiz.com';

-- 3. Adicionar permissões
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES
  ('ID_DO_USUARIO', 'filial', 'RJ01'),
  ('ID_DO_USUARIO', 'tag01', 'Marketing');
```

### Via Script Python:

```bash
python configurar_rls_completo.py
# Edite o script para adicionar o novo usuário
```

---

## 📞 Suporte

Se algo não estiver funcionando:

1. Verifique os logs do console do navegador (F12)
2. Verifique o SQL Editor do Supabase
3. Execute `VERIFICAR_PERMISSOES.sql` para diagnóstico
4. Consulte `SCRIPT_COMPLETO_RLS.sql` para referência

---

**Última atualização:** 10/02/2026
**Versão:** 2.0 com RLS ativo
**Status:** ✅ Pronto para testes
