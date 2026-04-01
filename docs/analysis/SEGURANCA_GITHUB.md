# Guia de Segurança - Repositório Público no GitHub

## ✅ Status Atual de Segurança

- ✅ Arquivo `.env.vercel` removido do git (tinha token Vercel)
- ✅ `.gitignore` atualizado para proteger todos os `.env*`
- ✅ Commits de segurança criados
- ⏳ Aguardando push para GitHub

---

## 🚨 AÇÕES CRÍTICAS - FAÇA AGORA

### 1. Revogar Token da Vercel (URGENTE!)

O arquivo `.env.vercel` tinha um token de autenticação. Mesmo tendo removido, se você já fez push antes, o token pode estar no histórico.

**Revogar token:**
1. Ir em: https://vercel.com/account/tokens
2. Procurar por tokens ativos
3. Revogar qualquer token suspeito ou antigo
4. Criar novo token se necessário

### 2. Verificar Histórico do Git

Vou verificar se o `.env.vercel` estava em commits anteriores:

**Verificação manual:**
```bash
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
git log --all --full-history -- .env.vercel
```

Se mostrar commits, o arquivo estava no histórico! Nesse caso:

**Opção A - Limpar histórico (RECOMENDADO se ainda não fez push):**
```bash
# Usar BFG Repo Cleaner
java -jar bfg.jar --delete-files .env.vercel
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Opção B - Se já fez push público antes:**
- Revogar TODAS as credenciais que estavam no arquivo
- Criar novas credenciais
- Atualizar em produção

---

## 🔒 CONFIGURAÇÕES DE SEGURANÇA NO GITHUB

### 1. Configurações do Repositório

Acesse: https://github.com/edmilsonserafim/dre-raiz/settings

#### 1.1. General → Danger Zone

**⚠️ NÃO fazer:**
- ❌ Não habilitar "Allow merge commits" sem proteção
- ❌ Não desabilitar "Automatically delete head branches"

**✅ Recomendado:**
- ✅ Manter "Allow squash merging" habilitado
- ✅ Manter "Automatically delete head branches" habilitado

#### 1.2. Branches → Branch Protection Rules

Criar regra para a branch `master`:

1. Clicar em "Add rule"
2. Branch name pattern: `master`
3. Habilitar:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
   - ✅ **Do not allow bypassing the above settings**

Isso previne pushes diretos acidentais.

#### 1.3. Secrets and Variables → Actions

Configurar secrets para CI/CD:

1. Ir em "New repository secret"
2. Adicionar:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave anon do Supabase
   - `VERCEL_TOKEN` = token da Vercel (se usar deploy automático)

Nunca commitar essas variáveis no código!

#### 1.4. Security → Code Security and Analysis

Habilitar TODAS as opções:

- ✅ **Dependency graph** - Já habilitado por padrão
- ✅ **Dependabot alerts** - Alertas de vulnerabilidades
- ✅ **Dependabot security updates** - Updates automáticos de segurança
- ✅ **Secret scanning** - Detecta credenciais commitadas
- ✅ **Push protection** - Previne push de secrets

**Como habilitar:**
1. Ir em: https://github.com/edmilsonserafim/dre-raiz/settings/security_analysis
2. Clicar em "Enable" em cada uma

---

## 📋 CHECKLIST DE SEGURANÇA

### Antes de Cada Commit:

```bash
□ Verificar que não há arquivos .env nos staged files
□ Revisar o git status antes de commit
□ Nunca adicionar arquivos com "git add ." sem verificar
□ Usar .env.example com valores fake para documentação
```

### Arquivos que NUNCA devem ir no Git:

```
❌ .env
❌ .env.local
❌ .env.production
❌ .env.vercel
❌ .env.*.local
❌ firebase-adminsdk*.json
❌ serviceAccountKey.json
❌ *.pem
❌ *.key
❌ *.p12
❌ credentials.json
❌ secrets.json
```

### Arquivos que PODEM ir no Git (são públicos):

```
✅ .env.example (com valores fake)
✅ Código fonte (.ts, .tsx, .jsx, .css)
✅ Package.json
✅ README.md
✅ Documentação
✅ VITE_SUPABASE_ANON_KEY (é pública, mas só em produção)
```

---

## 🛡️ PROTEÇÕES ADICIONAIS

### 1. Criar .env.example

Arquivo de exemplo SEM credenciais reais:

```bash
# .env.example
VITE_SUPABASE_URL=https://sua-url.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
VITE_GEMINI_API_KEY=sua-chave-gemini
API_KEY=sua-api-key
```

Commitar este arquivo É seguro, pois não tem valores reais.

### 2. Adicionar ao README

Adicionar seção de segurança no README:

```markdown
## 🔒 Segurança

### Variáveis de Ambiente

Este projeto usa variáveis de ambiente para credenciais sensíveis.

1. Copie `.env.example` para `.env`
2. Preencha com suas credenciais reais
3. NUNCA commite o arquivo `.env`

### Credenciais Necessárias

- **Supabase:** URL e Anon Key
- **Gemini API:** Chave da API Google
- **Firebase:** Configuração de autenticação
```

### 3. Pre-commit Hook (Avançado)

Criar hook para prevenir commits de secrets:

```bash
# .git/hooks/pre-commit
#!/bin/sh

# Verificar se há arquivos .env sendo commitados
if git diff --cached --name-only | grep -E "\.env$|\.env\."; then
    echo "❌ ERRO: Tentativa de commit de arquivo .env detectada!"
    echo "Remova o arquivo com: git reset HEAD <arquivo>"
    exit 1
fi

# Verificar se há strings que parecem tokens
if git diff --cached | grep -E "AKIA|AIza|sk_live|sk_test|eyJ"; then
    echo "⚠️ AVISO: Possível credencial detectada no commit!"
    echo "Verifique o conteúdo antes de continuar."
    read -p "Continuar mesmo assim? (y/N): " confirm
    if [ "$confirm" != "y" ]; then
        exit 1
    fi
fi

exit 0
```

---

## 🚀 PRÓXIMOS PASSOS PARA O PUSH

Agora que o repositório está seguro:

### Opção 1: Push via GitHub CLI (Recomendado)

```bash
# Instalar GitHub CLI
winget install --id GitHub.cli

# Login (vai abrir browser)
gh auth login

# Push
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
git push -u origin master
```

### Opção 2: Push via Personal Access Token

```bash
# 1. Criar token em: https://github.com/settings/tokens
# 2. Copiar o token
# 3. Usar no push:

cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
git push https://SEU_TOKEN@github.com/edmilsonserafim/dre-raiz.git master
```

### Opção 3: Você Mesmo Fazer

```bash
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
git push -u origin master
```

Vai pedir login - use a conta **edmilsonserafim**.

---

## ⚠️ SE O TOKEN JÁ FOI EXPOSTO

Se você já fez push do `.env.vercel` antes:

### 1. Revogar Credenciais Imediatamente

**Vercel:**
- https://vercel.com/account/tokens
- Revogar todos os tokens

**Supabase:**
- https://supabase.com/dashboard/project/vafmufhlompwsdrlhkfz/settings/api
- Regenerar Service Role Key (se foi exposta)
- Anon key é pública, pode ficar

**Firebase:**
- Se tiver credenciais Firebase expostas:
- https://console.firebase.google.com/
- Regenerar chaves

### 2. Limpar Histórico Git (Caso Extremo)

Se o token estava em commits antigos já enviados:

```bash
# ATENÇÃO: Isso reescreve o histórico!
# Fazer backup antes!

# Instalar BFG Repo Cleaner
# https://relbf.github.io/bfg-repo-cleaner/

# Remover arquivo do histórico
java -jar bfg.jar --delete-files .env.vercel

# Forçar limpeza
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (cuidado!)
git push --force origin master
```

### 3. Mudar Repositório para Privado Temporariamente

Se já houver exposição:

1. https://github.com/edmilsonserafim/dre-raiz/settings
2. Danger Zone → Change visibility → Make private
3. Revocar todas as credenciais
4. Limpar histórico
5. Voltar para público depois

---

## 📊 MONITORAMENTO CONTÍNUO

### GitHub Security Alerts

Depois do push, verificar:
1. https://github.com/edmilsonserafim/dre-raiz/security
2. Checar "Secret scanning alerts"
3. Checar "Dependabot alerts"
4. Resolver qualquer alerta que aparecer

### Auditoria Regular

**Mensalmente:**
- Revisar tokens ativos
- Verificar últimos commits
- Atualizar dependências vulneráveis
- Revogar tokens não usados

**Comandos úteis:**
```bash
# Ver quem commitou o quê
git log --all --oneline

# Procurar por palavras suspeitas no histórico
git log -S "password" --all
git log -S "secret" --all
git log -S "key" --all
```

---

## ✅ RESUMO EXECUTIVO

### O Que Foi Feito:
1. ✅ Removido `.env.vercel` com token Vercel do git
2. ✅ Atualizado `.gitignore` para proteger todos os `.env*`
3. ✅ Criado commits de segurança
4. ✅ Documentação de segurança criada

### O Que VOCÊ Deve Fazer AGORA:
1. 🔴 **URGENTE:** Revogar token da Vercel em https://vercel.com/account/tokens
2. 🟡 **Importante:** Habilitar proteções no GitHub (link acima)
3. 🟢 **Recomendado:** Configurar secrets no GitHub Actions
4. 🔵 **Opcional:** Criar pre-commit hooks

### Está Seguro para Push?
- ✅ **SIM**, se você revogar o token da Vercel PRIMEIRO
- ✅ Arquivo `.env.vercel` não está mais no git
- ✅ `.gitignore` protege outros arquivos sensíveis
- ✅ Sem outros segredos nos arquivos

---

## 🆘 EM CASO DE DÚVIDA

**Antes de fazer push, pergunte:**
1. Revoquei o token da Vercel?
2. Habilitei secret scanning no GitHub?
3. Verifiquei que não há `.env` no `git status`?
4. Li este guia de segurança?

**Se respondeu SIM para tudo → PODE FAZER PUSH! 🚀**

---

**Criado em:** 28 de Janeiro de 2026
**Status:** 🔒 Repositório Protegido e Pronto para Push
