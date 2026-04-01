# 🧪 Teste de RLS com TAG01 - Passo a Passo

## Contexto

O sistema agora suporta filtragem por **tag01**, **tag02** e **tag03** através do hook `usePermissions`. Vamos testar com o usuário `serafim.edmilson@gmail.com`.

---

## 📋 Passo 1: Verificar Permissões Atuais

1. Abra o **Supabase Dashboard** → SQL Editor
2. Execute o arquivo: `VERIFICAR_PERMISSOES_SERAFIM.sql`
3. Analise os resultados:
   - ✅ Dados do usuário Serafim
   - ✅ Permissões atuais dele
   - ✅ Valores disponíveis de TAG01 no banco
   - ✅ Valores de MARCA e FILIAL

**Anote:**
- Quais valores de TAG01 existem na base?
- O Serafim já tem permissões configuradas?

---

## 📋 Passo 2: Configurar Permissão de Teste

### Cenário A: Testar TAG01 (Recomendado)

1. Abra o arquivo `CONFIGURAR_TESTE_TAG01_SERAFIM.sql`
2. Escolha um valor de TAG01 que existe na base (ex: `RECEITAS`)
3. Edite a linha 48 com o valor correto:
   ```sql
   INSERT INTO user_permissions (user_id, permission_type, permission_value)
   VALUES (serafim_id, 'tag01', 'RECEITAS')  -- ← Substituir pelo valor correto
   ```
4. Execute o script completo
5. Verifique que a permissão foi criada

### Cenário B: Testar Acesso Total (Remover Restrições)

1. No arquivo `CONFIGURAR_TESTE_TAG01_SERAFIM.sql`
2. Descomente as linhas 23-24:
   ```sql
   DELETE FROM user_permissions WHERE user_id = serafim_id;
   RAISE NOTICE '✅ Todas as permissões removidas - Acesso Total';
   ```
3. Execute o script
4. O usuário terá acesso a TODOS os dados

---

## 📋 Passo 3: Testar no App

### 3.1 Fazer Logout/Login

1. Abra o app no navegador
2. Faça **logout** se já estiver logado
3. Faça **login** com `serafim.edmilson@gmail.com`
4. ✅ O sistema vai recarregar as permissões do banco

### 3.2 Testar Guia Lançamentos

1. Vá para a guia **Lançamentos**
2. Clique em **Buscar Dados** (para carregar transações)
3. **Verifique:**
   - ✅ As transações carregadas têm apenas TAG01 permitida?
   - ✅ O filtro está funcionando?
   - ✅ Não aparecem dados fora do escopo?

### 3.3 Testar DRE Gerencial

1. Vá para a guia **DRE Gerencial**
2. **Verifique:**
   - ✅ A DRE carrega sem entrar em loop?
   - ✅ Os dados exibidos respeitam a permissão de TAG01?
   - ⚠️ Se ainda entrar em loop, o problema é nas funções RPC

---

## 📋 Passo 4: Verificar Console do Navegador

1. Abra o **DevTools** (F12)
2. Vá para a aba **Console**
3. Procure por logs:
   ```
   🔒 uniqueBrands filtrado por permissão: [...]
   🔒 availableBranches filtrado por permissão: [...]
   ```
4. **Verifique:**
   - ✅ Os logs mostram que o filtro está sendo aplicado?
   - ✅ As opções dos dropdowns estão limitadas?

---

## 🐛 Problemas Esperados e Soluções

### Problema 1: DRE Gerencial ainda fica em loop

**Causa:** As funções RPC (`get_dre_summary`, `get_dre_dimension`) estão sendo bloqueadas pelo RLS porque o JWT não está configurado.

**Solução:** Precisamos desabilitar o RLS temporariamente ou modificar as funções RPC para usar `SECURITY DEFINER`.

**Script de correção:**
```sql
-- Executar no SQL Editor do Supabase
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
```

### Problema 2: Lançamentos traz todos os dados

**Causa:** A filtragem no cliente não está funcionando corretamente.

**Verificar:**
1. O console mostra logs de filtragem?
2. As permissões foram carregadas no `usePermissions`?
3. Fazer logout/login para recarregar permissões

### Problema 3: Nenhum dado aparece

**Causa:** A permissão está configurada com um valor que não existe ou está escrito diferente (case-sensitive).

**Solução:**
1. Execute novamente `VERIFICAR_PERMISSOES_SERAFIM.sql`
2. Compare o valor da permissão com os valores reais na tabela transactions
3. Ajuste a permissão para usar o valor exato

---

## 📊 Resultados Esperados

### ✅ Sucesso

- Lançamentos mostra apenas transações com TAG01 permitida
- DRE Gerencial carrega sem loop e mostra apenas dados filtrados
- Dropdowns de filtros mostram apenas opções permitidas
- Console mostra logs de filtragem

### ❌ Falha

- Lançamentos mostra TODOS os dados (sem filtro)
- DRE Gerencial fica em loop infinito
- Dropdowns não são filtrados
- Console não mostra logs de filtragem

---

## 📝 Próximos Passos (Se Der Problema)

1. **Se Lançamentos não filtrar:**
   - Verificar se `filterTransactions()` está sendo chamado no App.tsx
   - Verificar logs do console
   - Testar com outro usuário

2. **Se DRE ficar em loop:**
   - Desabilitar RLS temporariamente: `ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;`
   - OU modificar funções RPC para não depender de RLS
   - OU configurar JWT do Firebase no Supabase

3. **Se tudo falhar:**
   - Usar `service_role` key (bypass RLS completamente)
   - Manter filtragem 100% no cliente via `usePermissions`

---

## 🎯 Teste Final

Após configurar e testar:

**Marque os itens testados:**
- [ ] Permissões do Serafim verificadas no banco
- [ ] Permissão de TAG01 configurada
- [ ] Logout/Login realizado
- [ ] Lançamentos respeitam TAG01
- [ ] DRE Gerencial não entra em loop
- [ ] DRE Gerencial respeita TAG01
- [ ] Console mostra logs de filtragem
- [ ] Dropdowns são filtrados por permissões

**Me avise:**
- ✅ O que funcionou
- ❌ O que deu erro
- 📋 Logs/erros do console (se houver)
