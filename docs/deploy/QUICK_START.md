# Quick Start - Configuração Rápida DRE RAIZ

## Passo 1: Criar Projeto no Supabase (5 minutos)

1. Acesse https://supabase.com e faça login
2. Clique em "New Project"
3. Preencha:
   - **Project Name**: `dre-raiz`
   - **Database Password**: Crie uma senha forte
   - **Region**: `South America (São Paulo)`
4. Clique em "Create new project"
5. Aguarde 2 minutos

## Passo 2: Criar Tabelas (2 minutos)

1. No menu lateral, clique em **SQL Editor**
2. Clique em "New query"
3. Abra o arquivo `schema.sql` deste projeto
4. Copie TUDO e cole no editor
5. Clique em "Run"
6. Pronto! Tabelas criadas ✅

## Passo 3: Pegar as Credenciais (1 minuto)

1. No menu lateral, clique em **Settings** → **API**
2. Copie:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (chave longa)

## Passo 4: Criar Arquivo .env (1 minuto)

Crie um arquivo `.env` na raiz do projeto com:

```env
API_KEY=sua_firebase_api_key_aqui
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...sua_chave_aqui
VITE_GEMINI_API_KEY=sua_gemini_api_key_aqui
```

## Passo 5: Publicar na Vercel (3 minutos)

### Via Interface Web (Mais Fácil):

1. Acesse https://vercel.com e faça login
2. Clique em "Add New..." → "Project"
3. Conecte com GitHub ou faça upload da pasta
4. Em **Environment Variables**, adicione as mesmas do `.env`:
   - `API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
5. Clique em "Deploy"
6. Aguarde 2 minutos
7. Pronto! ✅ Seu app está no ar!

## Resumo

**Total: ~12 minutos**

1. ✅ Supabase criado
2. ✅ Banco configurado
3. ✅ App publicado

Sua URL será algo como: `https://dre-raiz.vercel.app`

---

## Precisa de Ajuda?

Veja o arquivo `DEPLOY_GUIDE.md` para instruções detalhadas.

## Próximos Passos (Opcional)

- Migrar dados do localStorage para Supabase (se tiver dados locais)
- Configurar domínio customizado na Vercel
- Ajustar políticas de segurança no Supabase
