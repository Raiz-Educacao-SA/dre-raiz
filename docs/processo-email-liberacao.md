# Email de Liberação de Acesso — Documentação

## Visão Geral

Quando um admin configura um novo usuário no sistema (que estava com status `pending`), o sistema oferece enviar um email profissional de boas-vindas informando que o acesso foi liberado.

## Arquivos Envolvidos

| Arquivo | Função |
|---------|--------|
| `emails/welcome-access-approved.html` | Template HTML de referência (preview no navegador) |
| `api/send-welcome-email.ts` | Vercel serverless function — monta HTML + envia via Resend |
| `components/AdminPanel.tsx` | Botão manual + modal automático na aba Usuários |
| `vite.config.ts` | Middleware dev para rotear `/api/send-welcome-email` |

## Mecanismos de Disparo

### 1. Modal Automático (Híbrido)
- **Quando**: Admin troca role de `pending` → qualquer perfil ativo (Viewer, Gestor, Aprovador, Admin)
- **O que acontece**: Modal aparece com dados do usuário perguntando "Deseja enviar email de boas-vindas?"
- **Botões**: "Enviar Email" ou "Não, obrigado"
- **Código**: `handleUpdateRole()` detecta `wasPending && newRole !== 'pending'` → `setShowWelcomeModal(true)`

### 2. Botão Manual (Reenvio)
- **Quando**: Sempre visível para usuários com role ≠ `pending`
- **Onde**: Painel direito da aba Usuários, seção "Notificar Usuário" (laranja)
- **Uso**: Reforçar liberação, reenviar se usuário não viu, ou após alterar permissões

## Dados Capturados Automaticamente

| Campo | Fonte |
|-------|-------|
| Nome | `selectedUser.name` |
| Email | `selectedUser.email` |
| Perfil | `selectedUser.role` (traduzido: admin→Administrador, manager→Gestor, etc.) |
| Marcas | Permissões tipo `cia` do `user_permissions` (ou "Acesso total" se nenhuma) |
| Data | Gerada no momento do envio (`toLocaleDateString('pt-BR')`) |

## Infraestrutura de Email

### Provedor: Resend (https://resend.com)
- **API**: `https://api.resend.com/emails`
- **Autenticação**: Bearer token via `EMAIL_API_KEY`
- **Remetente atual**: `DRE Raiz <onboarding@resend.dev>` (domínio de teste)
- **Remetente produção**: `DRE Raiz <noreply@raizeducacao.com.br>` (requer verificação DNS)

### Variável de Ambiente
```
EMAIL_API_KEY=re_xxxxxxxxxx
```

Deve estar em:
- `.env` (local dev)
- Vercel → Settings → Environment Variables (produção)

### Limitação do Domínio de Teste
Com `onboarding@resend.dev`, emails só são entregues para o email da conta Resend.
Para enviar para qualquer destinatário, verificar domínio `raizeducacao.com.br` no Resend:
1. Resend → Domains → Add Domain → `raizeducacao.com.br`
2. Configurar registros DNS (MX, TXT, DKIM) no provedor do domínio
3. Após verificação, trocar remetente em `api/send-welcome-email.ts`:
   ```ts
   const EMAIL_FROM = 'DRE Raiz <noreply@raizeducacao.com.br>';
   ```

## Template do Email

### Estrutura Visual
| Seção | Conteúdo |
|-------|----------|
| **Banner** | Gradiente laranja→turquesa, logo RAIZ + GraduationCap, check icon |
| **Saudação** | "Olá, {nome}!" + mensagem de aprovação |
| **Card de Acesso** | Email, Perfil (badge), Marcas, Data liberação |
| **3 Passos** | Acessar → Login Google → Explorar DRE |
| **Botão CTA** | "Acessar DRE Raiz" → https://dre-raiz.vercel.app |
| **Features** | DRE Gerencial, Lançamentos, Análise IA |
| **Ajuda** | Contato FP&A |
| **Footer** | RAIZ educação, link do site |

### Cores da Marca
- Primária (laranja): `#F08700`
- Secundária (turquesa): `#7AC5BF`
- Gradiente banner: `linear-gradient(135deg, #F08700, #e07c00, #7AC5BF)`

## Dev vs Produção

| Ambiente | Roteamento | Observação |
|----------|-----------|------------|
| **Dev (Vite)** | Middleware em `vite.config.ts` → ssrLoadModule do handler | Injeta `EMAIL_API_KEY` do `.env` via `loadEnv` |
| **Produção (Vercel)** | Serverless function `api/send-welcome-email.ts` direto | `EMAIL_API_KEY` das env vars do Vercel |

## Fluxo Completo

```
1. Admin abre aba Usuários no AdminPanel
2. Seleciona usuário com status "pending"
3. Clica em um perfil (Viewer/Gestor/Aprovador/Admin)
4. Role atualizado no Supabase
5. Modal aparece: "Usuário Aprovado! Enviar email?"
6. Admin clica "Enviar Email"
7. Frontend POST /api/send-welcome-email { name, email, role, marcas }
8. Handler monta HTML com dados → Resend API envia
9. Toast: "Email de liberação enviado para xxx@xxx.com!"
10. Usuário recebe email profissional com link para dre-raiz.vercel.app
```
