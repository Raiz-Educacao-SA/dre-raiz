# Guia de Deploy - Supabase + Vercel

Este guia mostra como configurar o banco de dados no Supabase e publicar o projeto na Vercel.

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em "New Project"
3. Escolha:
   - **Organization**: Selecione ou crie uma organização
   - **Project Name**: `ap-proposta` (ou outro nome de sua preferência)
   - **Database Password**: Crie uma senha forte (guarde ela!)
   - **Region**: `South America (São Paulo)` (mais próximo)
   - **Pricing Plan**: Free (para começar)
4. Clique em "Create new project" e aguarde a criação (leva ~2 minutos)

## 2. Configurar o Banco de Dados

1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em "New query"
3. Copie todo o conteúdo do arquivo `schema.sql` deste projeto
4. Cole no editor SQL
5. Clique em "Run" para executar o script
6. Você verá uma mensagem de sucesso e as tabelas serão criadas

## 3. Obter as Credenciais do Supabase

1. No painel do Supabase, clique em **Settings** (⚙️) no menu lateral
2. Clique em **API**
3. Copie as seguintes informações:
   - **Project URL**: `https://xxxxxxxxx.supabase.co`
   - **anon public key**: Uma chave longa começando com `eyJ...`

## 4. Criar Arquivo .env Local

1. Crie um arquivo `.env` na raiz do projeto (copie de `.env.example`)
2. Preencha com suas credenciais:

```env
# Firebase (mantido para autenticação)
API_KEY=sua_firebase_api_key

# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...sua_chave_aqui

# Google Gemini AI
VITE_GEMINI_API_KEY=sua_gemini_api_key
```

## 5. Testar Localmente

```bash
npm run dev
```

Acesse http://localhost:3002 e verifique se tudo funciona.

## 6. Publicar na Vercel

### Opção A: Via Interface Web (Recomendado)

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "Add New..." → "Project"
3. Importe o repositório Git (ou faça upload da pasta)
4. Configure as **Environment Variables**:
   - Clique em "Environment Variables"
   - Adicione cada variável do arquivo `.env`:
     - `API_KEY`
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_GEMINI_API_KEY`
5. Clique em "Deploy"
6. Aguarde o deploy finalizar (~2 minutos)
7. Pronto! Seu projeto estará no ar em uma URL como `https://seu-projeto.vercel.app`

### Opção B: Via CLI

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm install -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Seguir as instruções no terminal
# Adicionar as variáveis de ambiente quando solicitado
```

## 7. Configurar Variáveis de Ambiente na Vercel

Se você usou a CLI ou precisa adicionar/editar variáveis:

1. Acesse seu projeto no dashboard da Vercel
2. Vá em "Settings" → "Environment Variables"
3. Adicione/edite as variáveis necessárias
4. Após alterar, faça um novo deploy (ou a Vercel fará automaticamente)

## 8. Próximos Passos

- Configurar domínio customizado na Vercel (Settings → Domains)
- Ajustar políticas de segurança do Supabase (RLS) conforme necessário
- Configurar backups automáticos no Supabase
- Monitorar uso e performance no dashboard da Vercel

## Troubleshooting

### Erro de CORS
Se tiver erro de CORS ao acessar o Supabase:
1. Vá em Authentication → URL Configuration
2. Adicione a URL da Vercel em "Site URL"

### Variáveis de ambiente não funcionam
- Certifique-se de usar o prefixo `VITE_` para variáveis do frontend
- Após alterar variáveis na Vercel, faça um novo deploy

### Tabelas não aparecem
- Verifique se o script SQL foi executado com sucesso
- Verifique as políticas RLS no Supabase
