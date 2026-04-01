# 🚀 Setup Local Rápido - DRE RAIZ 2.0

Guia rápido para rodar o projeto localmente em **~15 minutos**.

---

## ⚡ Passos Rápidos

### 1️⃣ Pré-requisitos (2 min)

```bash
# Verifique se tem Node.js 18+
node --version

# Se não tiver, baixe em: https://nodejs.org/
```

### 2️⃣ Clone e Instale (3 min)

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd "Ap proposta"

# Instale as dependências
npm install
```

### 3️⃣ Configure o Supabase (5 min)

#### A. Crie uma conta no Supabase
- Acesse: https://app.supabase.com/
- Crie um novo projeto
- Aguarde ~2 minutos para provisionar

#### B. Crie as tabelas
1. No Supabase, vá em **SQL Editor**
2. Cole e execute este script:

```sql
-- Tabela de transações
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT,
  conta_contabil TEXT,
  category TEXT,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  scenario TEXT NOT NULL DEFAULT 'REAL',
  status TEXT NOT NULL DEFAULT 'active',
  filial TEXT,
  marca TEXT,
  tag0 TEXT,
  tag01 TEXT,
  tag02 TEXT,
  tag03 TEXT,
  recurring TEXT,
  ticket TEXT,
  vendor TEXT,
  nat_orc TEXT,
  chave_id TEXT,
  nome_filial TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_scenario ON transactions(scenario);
CREATE INDEX idx_transactions_date_id ON transactions(date DESC, id ASC);

-- Tabela de mudanças manuais
CREATE TABLE manual_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id),
  type TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT NOT NULL,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  requested_by TEXT NOT NULL,
  requested_by_name TEXT NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  approved_by_name TEXT,
  original_transaction JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dados de teste
INSERT INTO transactions (date, description, conta_contabil, amount, type, scenario, status, marca, filial, tag0, tag01)
VALUES
  ('2026-01-01', 'Receita de vendas', '4.1.001', 100000, 'REVENUE', 'REAL', 'active', 'RAIZ', 'SP01', 'RECEITAS', 'Vendas'),
  ('2026-01-01', 'Custo de vendas', '3.1.001', -30000, 'COST', 'REAL', 'active', 'RAIZ', 'SP01', 'CUSTOS', 'CMV'),
  ('2026-01-01', 'Salários', '3.2.001', -20000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Pessoal'),
  ('2026-01-01', 'Marketing', '3.2.002', -5000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Marketing');
```

#### C. Pegue as credenciais
1. Vá em **Settings → API**
2. Copie:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public key** (ex: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`)

### 4️⃣ Configure as Variáveis de Ambiente (2 min)

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite o .env.local
# No Windows: notepad .env.local
# No Mac/Linux: nano .env.local
```

Cole suas credenciais:

```env
# OBRIGATÓRIO
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# OPCIONAL (pode deixar em branco por enquanto)
VITE_FIREBASE_API_KEY=
VITE_ANTHROPIC_API_KEY=
VITE_GEMINI_API_KEY=
```

### 5️⃣ Rode o Projeto (1 min)

```bash
npm run dev
```

Abra o navegador em: **http://localhost:5173**

---

## ✅ Teste Rápido

1. **Guia Lançamentos**
   - Clique em "Buscar Dados"
   - Você deve ver as 4 transações de teste
   - Teste editar uma célula (clique duplo)

2. **Guia Dashboard**
   - Visualize os KPIs
   - Veja os gráficos interativos

3. **Guia DRE**
   - Selecione período: Janeiro 2026 a Janeiro 2026
   - Clique em "Atualizar DRE"
   - Expanda as linhas (setas)

---

## 🔧 Funcionalidades Opcionais

### Firebase (Autenticação)

Se quiser autenticação com Google:

1. Crie projeto em: https://console.firebase.google.com/
2. Adicione um Web App
3. Copie as credenciais para `.env.local`:

```env
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Claude AI (Relatórios com IA)

Se quiser relatórios gerados por IA:

1. Crie conta em: https://console.anthropic.com/
2. Gere uma API key
3. Adicione ao `.env.local`:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Google Gemini (Insights IA)

Se quiser insights com Gemini:

1. Crie API key em: https://makersuite.google.com/app/apikey
2. Adicione ao `.env.local`:

```env
VITE_GEMINI_API_KEY=AIzaSyC...
```

---

## 📊 Funções RPC Avançadas (Opcional)

Para usar o DRE com agregação otimizada:

1. No Supabase, vá em **SQL Editor**
2. Execute o arquivo `create_dre_rpc_functions.sql`:

```bash
# Windows PowerShell:
Get-Content create_dre_rpc_functions.sql | Set-Clipboard

# Mac/Linux:
cat create_dre_rpc_functions.sql | pbcopy
```

3. Cole no SQL Editor e execute

Isso cria:
- `get_dre_summary()` - Agregação otimizada
- `get_dre_dimension()` - Drill-down dinâmico
- `get_dre_filter_options()` - Filtros dinâmicos

---

## 🔐 RLS (Row-Level Security) - Opcional

Para ambientes multi-tenant com controle de acesso:

1. Execute o arquivo `SCRIPT_COMPLETO_RLS.sql` no SQL Editor
2. Configure os metadados dos usuários:

```sql
-- Exemplo: dar acesso completo a um usuário
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'marca', ARRAY['RAIZ'],
  'nome_filial', ARRAY['SP01', 'RJ01'],
  'tag01', ARRAY['Vendas', 'Marketing']
)
WHERE email = 'usuario@exemplo.com';
```

---

## 🐛 Problemas Comuns

### "Supabase URL and Anon Key must be set"
- Verifique se o arquivo `.env.local` existe
- Verifique se as variáveis estão corretas
- Reinicie o servidor (`Ctrl+C` e `npm run dev`)

### "Failed to fetch"
- Verifique se o Supabase está acessível
- Teste a URL no navegador: `https://seu-projeto.supabase.co`

### Tabela vazia
- Execute o script SQL novamente
- Verifique no Supabase Table Editor se as transações foram criadas

### Porta 5173 já está em uso
```bash
# Mate o processo
npx kill-port 5173

# Ou use outra porta
npm run dev -- --port 5174
```

---

## 📚 Próximos Passos

Agora que está rodando localmente:

1. **Leia o README.md completo** - Documentação detalhada
2. **Explore os componentes** - Entenda a estrutura
3. **Adicione seus dados** - Importe via CSV ou API
4. **Configure RLS** - Para ambientes de produção
5. **Deploy** - Veja a seção de deploy no README.md

---

## 🆘 Precisa de Ajuda?

- **README.md** - Documentação completa
- **Issues do GitHub** - Reporte problemas
- **Time de Dev** - Entre em contato

---

**Tempo total:** ~15 minutos ⏱️

**Status:** ✅ Projeto rodando localmente com dados de teste

**Próximo passo:** Explore as funcionalidades e leia a documentação completa!
