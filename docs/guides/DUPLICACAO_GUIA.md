# 🔄 Guia de Duplicação - DRE RAIZ

Este guia mostra como criar múltiplas instâncias independentes do sistema DRE RAIZ.

## 📋 Casos de Uso

Você pode querer duplicar este projeto para:
- ✅ Criar uma instância separada para cada escola/marca
- ✅ Ter ambientes separados (produção, homologação, desenvolvimento)
- ✅ Criar versões customizadas para diferentes unidades
- ✅ Testar novas funcionalidades sem afetar a produção

---

## 🚀 Opção 1: Duplicação Completa (Novo Projeto)

Use esta opção para criar uma instância 100% independente com seu próprio banco de dados.

### Passo 1: Copiar os Arquivos (2 minutos)

**Método A - Copiar Pasta:**
```bash
# Windows
xcopy "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta" "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\DRE_RAIZ_Escola_XYZ" /E /I

# macOS/Linux
cp -r "/caminho/original/Ap proposta" "/caminho/novo/DRE_RAIZ_Escola_XYZ"
```

**Método B - Via GitHub:**
1. Crie um novo repositório no GitHub
2. Faça upload dos arquivos do projeto
3. Clone o repositório em outro local
```bash
git clone https://github.com/seu-usuario/dre-raiz-escola-xyz.git
cd dre-raiz-escola-xyz
```

### Passo 2: Limpar e Renomear (3 minutos)

1. Entre na nova pasta
2. Delete a pasta `node_modules` (se existir)
3. Delete o arquivo `.env` (se existir)
4. Abra o `package.json` e altere o nome:

```json
{
  "name": "dre-raiz-escola-xyz",
  ...
}
```

### Passo 3: Criar Novo Projeto no Supabase (5 minutos)

1. Acesse https://supabase.com
2. Clique em "New Project"
3. Preencha:
   - **Project Name**: `dre-raiz-escola-xyz` (nome único)
   - **Database Password**: Crie uma senha DIFERENTE
   - **Region**: `South America (São Paulo)`
4. Aguarde a criação (~2 minutos)

### Passo 4: Configurar Banco de Dados (2 minutos)

1. No novo projeto do Supabase, vá em **SQL Editor**
2. Clique em "New query"
3. Copie o conteúdo de `schema.sql`
4. Cole e clique em "Run"
5. Tabelas criadas ✅

### Passo 5: Configurar Variáveis de Ambiente (3 minutos)

1. No Supabase, vá em **Settings** → **API**
2. Copie as novas credenciais:
   - Project URL
   - anon public key

3. Crie um novo arquivo `.env` na raiz do projeto duplicado:

```env
# Firebase (pode usar o mesmo ou criar novo)
API_KEY=sua_firebase_api_key

# Supabase (NOVOS valores do projeto duplicado)
VITE_SUPABASE_URL=https://novo-projeto-xyz.supabase.co
VITE_SUPABASE_ANON_KEY=nova_chave_anon_aqui

# Gemini AI (pode usar o mesmo)
VITE_GEMINI_API_KEY=sua_gemini_api_key
```

### Passo 6: Instalar e Testar (3 minutos)

```bash
# Instalar dependências
npm install

# Testar localmente
npm run dev
```

Acesse http://localhost:3002 e verifique se funciona!

### Passo 7: Deploy na Vercel (3 minutos)

1. Acesse https://vercel.com
2. Clique em "Add New..." → "Project"
3. Importe o novo projeto
4. Configure as variáveis de ambiente (as NOVAS do `.env`)
5. Clique em "Deploy"

Pronto! Sua nova instância está no ar em uma URL diferente! ✅

**Tempo total: ~21 minutos**

---

## 🔁 Opção 2: Duplicação Rápida (Mesmo Banco)

Use esta opção se quiser múltiplas instâncias acessando o MESMO banco de dados.

⚠️ **Atenção**: Todas as instâncias verão e modificarão os mesmos dados!

### Quando usar:
- Deploy em múltiplos domínios
- Ambiente de testes apontando para produção
- Múltiplos front-ends (web, mobile) no mesmo banco

### Passos:

1. Copie a pasta do projeto
2. Use o MESMO arquivo `.env` (mesmas credenciais)
3. Faça deploy na Vercel com um nome diferente
4. Pronto! Ambas as instâncias compartilham o mesmo banco

**Tempo total: ~5 minutos**

---

## 📊 Opção 3: Multi-Tenant (Banco Compartilhado com Isolamento)

Use esta opção para ter UMA instância do app que serve múltiplas escolas/unidades com dados isolados.

### Arquitetura:

```
App Único → Banco Supabase
             ├─ Escola A (via RLS)
             ├─ Escola B (via RLS)
             └─ Escola C (via RLS)
```

### Implementação:

Esta opção requer modificações no código:

1. **Adicionar campo `tenant_id` nas tabelas:**

```sql
ALTER TABLE transactions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE manual_changes ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_manual_changes_tenant ON manual_changes(tenant_id);
```

2. **Implementar Row Level Security (RLS):**

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;

-- Criar novas políticas com tenant_id
CREATE POLICY "Enable read access by tenant" ON transactions
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant')::TEXT);

CREATE POLICY "Enable insert access by tenant" ON transactions
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant')::TEXT);
```

3. **Modificar código para filtrar por tenant_id**

Isso requer modificações no `supabaseService.ts` e componentes.

**Complexidade**: Alta
**Tempo de implementação**: 2-4 horas
**Benefício**: Uma instância serve múltiplas unidades

---

## 🎯 Comparação das Opções

| Característica | Opção 1<br/>Duplicação Completa | Opção 2<br/>Mesmo Banco | Opção 3<br/>Multi-Tenant |
|----------------|----------------------------------|------------------------|--------------------------|
| **Banco de dados** | Independente | Compartilhado | Compartilhado |
| **Isolamento** | Total | Nenhum | Por tenant |
| **Complexidade** | Baixa | Muito Baixa | Alta |
| **Tempo setup** | ~21 min | ~5 min | ~4 horas |
| **Custo Supabase** | Por projeto | Único | Único |
| **Manutenção** | Independente | Sincronizada | Única |
| **Melhor para** | Escolas separadas | Teste/Staging | Multi-unidade |

---

## 📝 Checklist de Duplicação

Ao duplicar, certifique-se de:

- [ ] Copiar TODOS os arquivos do projeto
- [ ] Criar NOVO projeto no Supabase
- [ ] Executar `schema.sql` no NOVO banco
- [ ] Criar NOVO arquivo `.env` com as NOVAS credenciais
- [ ] Instalar dependências: `npm install`
- [ ] Testar localmente: `npm run dev`
- [ ] Fazer deploy na Vercel com nome ÚNICO
- [ ] Configurar variáveis de ambiente na Vercel
- [ ] Testar a nova instância em produção
- [ ] Documentar a URL e credenciais

---

## 🔐 Segurança ao Duplicar

**IMPORTANTE**: Cada instância duplicada DEVE ter:
- ✅ Seu próprio banco Supabase (ou usar RLS)
- ✅ Suas próprias credenciais (`.env` único)
- ✅ Variáveis de ambiente configuradas na Vercel
- ❌ NUNCA commitar o arquivo `.env` no Git
- ❌ NUNCA compartilhar credenciais entre ambientes diferentes

---

## 📞 Exemplos Práticos

### Exemplo 1: Uma instância por escola

```
DRE_RAIZ_ESCOLA_A    → Supabase: dre-escola-a    → Vercel: dre-escola-a.vercel.app
DRE_RAIZ_ESCOLA_B    → Supabase: dre-escola-b    → Vercel: dre-escola-b.vercel.app
DRE_RAIZ_ESCOLA_C    → Supabase: dre-escola-c    → Vercel: dre-escola-c.vercel.app
```

### Exemplo 2: Ambientes (Dev, Staging, Prod)

```
DRE_RAIZ_DEV         → Supabase: dre-dev         → Vercel: dre-dev.vercel.app
DRE_RAIZ_STAGING     → Supabase: dre-staging     → Vercel: dre-staging.vercel.app
DRE_RAIZ_PROD        → Supabase: dre-prod        → Vercel: dre-raiz.vercel.app
```

---

## 💡 Dicas

1. **Nomenclatura**: Use nomes consistentes para projeto, Supabase e Vercel
2. **Documentação**: Crie uma planilha com todas as URLs e credenciais
3. **Versionamento**: Se usar Git, um repositório por instância
4. **Sincronização**: Use Git para manter código sincronizado entre instâncias
5. **Backups**: Configure backups no Supabase para cada projeto

---

## ❓ Precisa de Ajuda?

- Para deploy básico: Veja `QUICK_START.md`
- Para configuração detalhada: Veja `DEPLOY_GUIDE.md`
- Para checklist completo: Veja `CHECKLIST.md`
