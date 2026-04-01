# Sistema de Aprovação de Usuários

## ✅ Implementação Concluída

**Deploy:** 28 de Janeiro de 2026
**Status:** ✅ Ativo em Produção
**URL:** https://dre-raiz.vercel.app

---

## 🎯 O Que Mudou

### ANTES:
- ❌ Novos usuários eram criados automaticamente como "viewer"
- ❌ Tinham acesso imediato ao sistema
- ❌ Sem controle de quem entra

### AGORA:
- ✅ Novos usuários são criados com status "pending"
- ✅ Veem tela de "Aguardando Aprovação"
- ✅ Admin recebe alerta e deve aprovar manualmente
- ✅ Só podem acessar após aprovação

---

## 🔄 Fluxo Completo

### 1️⃣ Novo Usuário Faz Login

**O que acontece:**
1. Usuário clica em "Entrar com Google"
2. Faz autenticação com conta Google
3. Sistema cria registro com `role: 'pending'`
4. Usuário vê tela de "Aguardando Aprovação"

**Tela mostrada:**
```
┌─────────────────────────────────────────┐
│  ⏰ AGUARDANDO APROVAÇÃO                │
│                                         │
│  👤 Nome do Usuário                     │
│  📧 email@raizeducacao.com.br          │
│                                         │
│  🚨 Solicitação de Acesso Enviada      │
│  Aguarde análise do administrador       │
│                                         │
│  [Botão: Sair]                         │
└─────────────────────────────────────────┘
```

### 2️⃣ Administrador Recebe Notificação

**No Painel Admin:**
1. Badge "⏳ Pendentes" aparece nas estatísticas (com animação)
2. Alerta amarelo destacado no topo
3. Lista de todos os usuários pendentes
4. Clique para ver detalhes

**Visual:**
```
┌─────────────────────────────────────────┐
│  📊 Estatísticas                        │
│  Total: 15  Admins: 2  Gestores: 5      │
│  ⏳ Pendentes: 3 (ANIMADO)              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🚨 3 USUÁRIOS AGUARDANDO APROVAÇÃO     │
│                                         │
│  [👤 João Silva] [👤 Maria Santos]     │
│  [👤 Pedro Costa]                       │
│                                         │
│  Clique para aprovar →                  │
└─────────────────────────────────────────┘
```

### 3️⃣ Admin Aprova o Usuário

**Passos:**
1. Clicar no usuário pendente no alerta amarelo OU na lista
2. No painel direito, ver informações do usuário
3. Escolher role: **Viewer**, **Gestor** ou **Admin**
4. Clicar no botão da role desejada
5. Sistema atualiza role no banco

**Roles disponíveis:**
- **Viewer:** Acesso somente leitura
- **Gestor (Manager):** Pode criar solicitações de mudança
- **Admin:** Acesso total + aprovar mudanças + gerenciar usuários

### 4️⃣ Usuário Acessa o Sistema

**O que acontece:**
1. Usuário tenta fazer login novamente
2. Sistema detecta que `role !== 'pending'`
3. Usuário é direcionado para o dashboard
4. Tem acesso conforme role definido

---

## 👨‍💼 Guia do Administrador

### Como Aprovar Novos Usuários

#### Passo 1: Acessar Painel Admin
```
1. Fazer login como admin
2. Clicar no menu "Admin"
3. Ver alerta de usuários pendentes (se houver)
```

#### Passo 2: Selecionar Usuário
```
1. Clicar no card do usuário no alerta amarelo
   OU
2. Rolar até a lista de usuários
3. Procurar usuários com badge "⏳ Pendente" (com animação)
4. Clicar no usuário
```

#### Passo 3: Aprovar
```
1. Ver informações do usuário no painel direito
2. Na seção "Função no Sistema"
3. Clicar em um dos botões:
   [Viewer] [Gestor] [Admin]
4. Aguardar confirmação: "Função atualizada com sucesso!"
```

#### Passo 4: Configurar Permissões (Opcional)
```
Se o usuário precisar de permissões restritas:
1. Rolar até "Permissões de Acesso"
2. Selecionar tipo: Centro de Custo, CIA ou Filial
3. Digitar valor EXATO (ver helper de valores)
4. Clicar "Adicionar Permissão"
```

### Decisão: Que Role Dar?

**Viewer (Padrão):**
- ✅ Ver dashboard, DRE, KPIs
- ❌ Não pode criar solicitações de mudança
- ❌ Não pode aprovar nada
- ❌ Não pode acessar Admin

**Recomendado para:** Analistas, Consultores, Visualizadores

**Gestor (Manager):**
- ✅ Tudo do Viewer +
- ✅ Pode criar solicitações de mudança
- ❌ Não pode aprovar mudanças
- ❌ Não pode acessar Admin

**Recomendado para:** Gerentes de Filial, Coordenadores

**Admin:**
- ✅ Acesso total ao sistema
- ✅ Pode aprovar/reprovar mudanças
- ✅ Pode gerenciar usuários
- ✅ Pode configurar permissões

**Recomendado para:** Diretores, TI, Gestores Financeiros

---

## 👤 Guia do Novo Usuário

### O Que Fazer Ao Ver "Aguardando Aprovação"

**Não se preocupe! É normal! 🙂**

1. **Sua conta foi criada com sucesso**
   - O sistema já registrou suas informações
   - Você está na fila de aprovação

2. **Aguarde a aprovação do administrador**
   - Normalmente em até 1 dia útil
   - Você receberá acesso assim que aprovado

3. **Tente fazer login novamente em algumas horas**
   - Assim que aprovado, você entra normalmente
   - Não precisa fazer nada, só aguardar

4. **Precisa de acesso urgente?**
   - Entre em contato com o administrador
   - Informe seu email: [seu-email]

**Botão "Sair":**
- Clique para deslogar
- Pode tentar login novamente depois

---

## 🧪 Como Testar

### Teste 1: Novo Usuário Pendente

```bash
# Teste com uma conta Google que nunca acessou o sistema

1. Abrir https://dre-raiz.vercel.app em aba anônima
2. Clicar "Entrar com Google"
3. Fazer login com conta NOVA (nunca usada no sistema)
4. ✅ Deve aparecer tela "Aguardando Aprovação"
5. ✅ Não deve ter acesso ao dashboard
6. ✅ Botão "Sair" deve funcionar
```

### Teste 2: Admin Vê Alerta

```bash
1. Fazer login como admin
2. Ir no menu "Admin"
3. ✅ Deve ver badge "⏳ Pendentes: 1" com animação
4. ✅ Deve ver alerta amarelo no topo
5. ✅ Usuário deve aparecer no alerta
6. ✅ Badge "⏳ Pendente" na lista de usuários
```

### Teste 3: Admin Aprova

```bash
1. Como admin, clicar no usuário pendente
2. No painel direito, ver informações
3. Clicar em "Viewer"
4. ✅ Mensagem: "Função atualizada com sucesso!"
5. ✅ Badge muda de "⏳ Pendente" para "Viewer"
6. ✅ Alerta amarelo desaparece (se era o último)
7. ✅ Contador "Pendentes" diminui ou desaparece
```

### Teste 4: Usuário Acessa Após Aprovação

```bash
1. Como usuário aprovado, fazer logout
2. Fazer login novamente
3. ✅ Não vê mais tela de "Aguardando"
4. ✅ Entra direto no dashboard
5. ✅ Tem acesso conforme role definido
```

---

## 🗄️ Estrutura no Banco de Dados

### Tabela: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  photo_url TEXT,
  role TEXT NOT NULL, -- 'admin', 'manager', 'viewer', 'pending'
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

### Valores Possíveis de `role`:

| Role      | Descrição                    | Acesso                           |
|-----------|------------------------------|----------------------------------|
| `pending` | Aguardando aprovação         | Nenhum (tela de aguardando)      |
| `viewer`  | Visualizador                 | Somente leitura                  |
| `manager` | Gestor                       | Leitura + Criar solicitações     |
| `admin`   | Administrador                | Acesso total                     |

---

## 📊 Estatísticas e Métricas

### No Painel Admin:

**Antes:**
```
Total Usuários: 15
Admins: 2
Gestores: 5
```

**Agora (com pendentes):**
```
Total Usuários: 18
Admins: 2
Gestores: 5
⏳ Pendentes: 3 (ANIMADO)
```

---

## 🎨 Componentes Criados

### 1. `PendingApprovalScreen.tsx`
**Localização:** `components/PendingApprovalScreen.tsx`

**Função:** Tela mostrada para usuários com `role: 'pending'`

**Recursos:**
- Ícone de relógio animado
- Informações do usuário (foto, nome, email)
- Explicação do processo de aprovação
- Botão para fazer logout
- Design responsivo

### 2. Alerta no AdminPanel
**Localização:** Adicionado em `components/AdminPanel.tsx`

**Recursos:**
- Alerta amarelo destacado
- Lista de usuários pendentes
- Clique rápido para selecionar
- Badge animado nas estatísticas
- Contador em tempo real

---

## 🔧 Arquivos Modificados

1. ✅ `contexts/AuthContext.tsx`
   - Adicionar `'pending'` ao tipo `User.role`
   - Mudar criação de novos usuários de `'viewer'` para `'pending'`

2. ✅ `App.tsx`
   - Import do `PendingApprovalScreen`
   - Verificação: se `user.role === 'pending'` → mostrar tela

3. ✅ `components/PendingApprovalScreen.tsx` (NOVO)
   - Tela completa de aguardando aprovação

4. ✅ `components/AdminPanel.tsx`
   - Adicionar `'pending'` ao tipo `User.role`
   - Badge animado nas estatísticas
   - Alerta amarelo no topo
   - Badge "⏳ Pendente" na lista

5. ✅ `services/supabaseService.ts`
   - Adicionar `'pending'` ao tipo de `updateUserRole`

**Total:** 5 arquivos modificados

---

## 🚨 Importante: Primeiro Admin

### Problema: Como criar o primeiro admin?

Se TODOS os usuários novos começam como "pending", quem aprova o primeiro?

### Solução: Configurar Manualmente no Banco

**Opção 1: Pelo Supabase Dashboard**
```sql
-- 1. Encontrar seu usuário
SELECT * FROM users WHERE email = 'seu-email@raizeducacao.com.br';

-- 2. Atualizar para admin
UPDATE users
SET role = 'admin'
WHERE email = 'seu-email@raizeducacao.com.br';
```

**Opção 2: Via Interface (se já tiver um admin)**
- Login como admin existente
- Ir em Admin → Usuários
- Promover o novo usuário

---

## 📝 Notas Importantes

### Segurança
- ✅ Usuários pendentes não têm acesso a NENHUM dado
- ✅ Não podem ver dashboard, DRE, transações, nada
- ✅ Só podem ver a tela de aguardando e fazer logout
- ✅ Administrador tem controle total sobre aprovações

### UX
- ✅ Animação no badge "Pendentes" chama atenção do admin
- ✅ Alerta amarelo é impossível de ignorar
- ✅ Usuário pendente tem informações claras do que fazer
- ✅ Processo de aprovação é rápido (2 cliques)

### Performance
- ✅ Sem impacto em usuários ativos
- ✅ Verificação de role é instantânea
- ✅ Alerta só carrega se houver pendentes

---

## 🆘 Troubleshooting

### Problema: Usuário não vê tela de aguardando

**Possível causa:** Role não está como 'pending'

**Solução:**
```sql
-- Verificar role no banco
SELECT email, role FROM users WHERE email = 'usuario@email.com';

-- Se necessário, voltar para pending
UPDATE users SET role = 'pending' WHERE email = 'usuario@email.com';
```

### Problema: Admin não vê alerta de pendentes

**Possível causa 1:** Não há usuários pendentes

**Solução:** Verificar no banco:
```sql
SELECT COUNT(*) FROM users WHERE role = 'pending';
```

**Possível causa 2:** Cache do navegador

**Solução:**
- Fazer hard refresh (Ctrl+F5)
- Limpar cache e recarregar

### Problema: Após aprovar, usuário ainda vê tela de aguardando

**Causa:** Sessão antiga no navegador

**Solução:**
1. Usuário deve fazer logout
2. Fazer login novamente
3. Sistema vai carregar novo role do banco

---

## 🎓 Melhores Práticas

### Para Administradores:

1. **Revisar Pendentes Diariamente**
   - Checar painel admin ao menos 1x por dia
   - Aprovar rapidamente para não atrasar trabalho

2. **Escolher Role Apropriado**
   - Sempre começar com "Viewer"
   - Promover para Manager/Admin só quando necessário
   - Princípio do menor privilégio

3. **Documentar Decisões**
   - Manter registro de quem foi aprovado e por quê
   - Revisar roles periodicamente

4. **Configurar Permissões Específicas**
   - Se usuário precisa acesso a apenas 1 filial
   - Usar permissões granulares
   - Consultar "Valores Disponíveis" antes

### Para Usuários:

1. **Aguardar Aprovação**
   - Normal levar algumas horas
   - Não criar múltiplas contas

2. **Usar Email Corporativo**
   - Sempre @raizeducacao.com.br
   - Facilita identificação pelo admin

3. **Entrar em Contato se Urgente**
   - Informar ao admin via email/chat
   - Mencionar seu email usado no login

---

## 📅 Próximas Melhorias (Futuro)

### Potenciais Adições:

1. **Email Automático**
   - Notificar admin quando novo usuário registrar
   - Notificar usuário quando for aprovado

2. **Comentários na Aprovação**
   - Admin pode deixar nota sobre decisão
   - Histórico de mudanças de role

3. **Auto-Aprovação por Domínio**
   - Emails @raizeducacao.com.br aprovados automaticamente como viewer
   - Outros domínios ficam pendentes

4. **Dashboard de Aprovações**
   - Histórico de aprovações
   - Tempo médio de aprovação
   - Estatísticas de usuários

---

## ✅ Checklist de Deploy

- [x] Código implementado
- [x] Componentes criados
- [x] Tipos atualizados
- [x] Deploy realizado
- [x] Documentação criada
- [ ] Primeiro admin configurado no banco
- [ ] Equipe notificada sobre novo processo
- [ ] Testado em produção

---

**Criado em:** 28 de Janeiro de 2026
**Versão:** 1.0.0
**Status:** ✅ Ativo em Produção
**URL:** https://dre-raiz.vercel.app
