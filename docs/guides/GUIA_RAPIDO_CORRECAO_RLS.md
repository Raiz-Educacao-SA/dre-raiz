# 🚀 GUIA RÁPIDO: Corrigir RLS do Gabriel

## 📝 RESUMO DO PROBLEMA

O Gabriel está vendo TODAS as transações no painel, mas deveria ver apenas as transações com tag01 específicas.

**Causa**: As políticas RLS estão com `TRUE` (acesso público) e não verificam as permissões.

## ⚡ CORREÇÃO EM 3 PASSOS

### PASSO 1: Executar Scripts SQL no Supabase

Vá para o **Supabase Dashboard** → **SQL Editor** e execute nesta ordem:

#### 1.1 Diagnóstico (Ver estado atual)
```bash
Arquivo: diagnostico_rls_gabriel.sql
```
- Veja o email do Gabriel
- Veja as permissões atuais
- Veja os valores de tag01 no sistema

#### 1.2 Corrigir RLS e adicionar tag01
```bash
Arquivo: fix_rls_tag01.sql
```
Este script:
- ✅ Adiciona 'tag01', 'tag02', 'tag03' aos tipos de permissão
- ✅ Cria função que verifica acesso por tag01
- ✅ Aplica políticas RLS que filtram baseado em permissões

#### 1.3 Configurar Permissões do Gabriel

**IMPORTANTE**: Antes de executar, abra o arquivo `configurar_permissoes_gabriel.sql` e ajuste:

**Linha 8**: Email correto do Gabriel
```sql
gabriel_email TEXT := 'gabriel@raizeducacao.com.br'; -- ⬅️ AJUSTE AQUI
```

**Linhas 42-48**: Valores de tag01 que ele pode ver
```sql
-- Exemplo: Se Gabriel pode ver tag01 = '001' e '002'
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES (gabriel_id, 'tag01', '001');  -- ⬅️ AJUSTE AQUI

INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES (gabriel_id, 'tag01', '002');  -- ⬅️ AJUSTE AQUI
```

Depois execute:
```bash
Arquivo: configurar_permissoes_gabriel.sql
```

#### 1.4 Testar (Validar configuração)
```bash
Arquivo: testar_rls_gabriel.sql
```
- Veja quantas transações Gabriel deveria ver
- Compare com o total no sistema

---

### PASSO 2: Código Frontend já foi corrigido ✅

O arquivo `services/supabaseService.ts` já foi atualizado automaticamente!

**Alteração feita:**
```typescript
// ANTES:
permissionType: 'centro_custo' | 'cia' | 'filial'

// DEPOIS:
permissionType: 'centro_custo' | 'cia' | 'filial' | 'tag01' | 'tag02' | 'tag03'
```

**Localização**: `services/supabaseService.ts:1054`

---

### PASSO 3: Testar no Painel Admin

1. **Rebuild da aplicação** (se necessário):
```bash
npm run build
# ou
npm run dev
```

2. **Fazer login como Gabriel** no painel

3. **Verificar se ele vê apenas as tags permitidas**:
   - Vá para a página de transações
   - Verifique se só aparecem transações com tag01 permitidas
   - Compare com o resultado do script de teste

---

## 📊 VALORES DE TAG01 NO SEU SISTEMA

Para descobrir quais valores de tag01 existem, execute no Supabase:

```sql
SELECT tag01, COUNT(*) as total
FROM transactions
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY tag01;
```

Exemplo de resultado:
```
tag01  | total
-------|-------
001    | 1500
002    | 2300
003    | 800
...
```

Use esses valores para configurar as permissões do Gabriel.

---

## ✅ CHECKLIST RÁPIDO

```
BANCO DE DADOS:
□ Executei diagnostico_rls_gabriel.sql
□ Anotei o email do Gabriel: ___________________
□ Anotei os valores de tag01 que ele deve ver: ___________________
□ Executei fix_rls_tag01.sql
□ Ajustei configurar_permissoes_gabriel.sql (email + tags)
□ Executei configurar_permissoes_gabriel.sql
□ Executei testar_rls_gabriel.sql
□ Resultado do teste mostra filtro correto

FRONTEND:
□ Arquivo supabaseService.ts já foi atualizado ✅
□ Rebuild da aplicação (se necessário)

TESTE:
□ Login como Gabriel
□ Verificou que vê apenas tags permitidas
□ Verificou que admin ainda vê tudo
```

---

## 🎯 EXEMPLO COMPLETO

### Cenário: Gabriel deve ver apenas tag01 = '001' e '002'

**1. No SQL Editor do Supabase:**

```sql
-- 1) Executar fix_rls_tag01.sql
-- (já cria tudo necessário)

-- 2) Ajustar e executar configurar_permissoes_gabriel.sql
-- Ajustar linha 8:
gabriel_email TEXT := 'gabriel.silva@raizeducacao.com.br';

-- Ajustar linhas 42-48:
INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES (gabriel_id, 'tag01', '001');

INSERT INTO user_permissions (user_id, permission_type, permission_value)
VALUES (gabriel_id, 'tag01', '002');
```

**2. Rebuild e teste:**

```bash
npm run dev
```

**3. Login como Gabriel → Deve ver apenas transações com tag01 = '001' ou '002'**

---

## 🐛 SE NÃO FUNCIONAR

### Gabriel ainda vê tudo:

1. Verificar se as políticas RLS foram aplicadas:
```sql
SELECT policyname, qual FROM pg_policies WHERE tablename = 'transactions';
```
Deve mostrar políticas com funções, não `TRUE`.

2. Verificar permissões do Gabriel:
```sql
SELECT u.email, up.permission_type, up.permission_value
FROM users u
JOIN user_permissions up ON u.id = up.user_id
WHERE u.email ILIKE '%gabriel%';
```

3. Verificar se a função existe:
```sql
SELECT proname FROM pg_proc WHERE proname = 'can_access_transaction_with_tags';
```

### Gabriel não vê nada:

1. Verificar se o email está correto no banco
2. Verificar se as permissões foram inseridas
3. Verificar os logs do console do navegador (F12)

---

## 📞 SUPORTE

Leia o arquivo `RESUMO_PROBLEMA_RLS.md` para detalhes técnicos completos.

---

**Tempo estimado**: 10-15 minutos
**Dificuldade**: Fácil (copiar e colar scripts)
**Reversível**: Sim (pode voltar as políticas para TRUE se precisar)
