# 📚 Documentação DRE RAIZ

Bem-vindo à documentação do sistema DRE RAIZ!

## 🎯 Por Onde Começar?

### Primeira vez aqui?
👉 **[QUICK_START.md](QUICK_START.md)** - Comece aqui! Deploy em 12 minutos

### Quer duplicar o projeto?
👉 **[RESUMO_DUPLICACAO.md](RESUMO_DUPLICACAO.md)** - Métodos rápidos de duplicação

### Precisa de detalhes técnicos?
👉 **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** - Guia técnico completo

---

## 📖 Guias Disponíveis

### 🚀 Deploy e Configuração

| Documento | Objetivo | Público | Tempo |
|-----------|----------|---------|-------|
| **[README.md](README.md)** | Visão geral do projeto | Todos | 5 min |
| **[QUICK_START.md](QUICK_START.md)** | Deploy rápido passo a passo | Iniciantes | 12 min |
| **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** | Configuração detalhada | Técnico | 20 min |
| **[CHECKLIST.md](CHECKLIST.md)** | Verificação de deploy | Todos | 5 min |

### 🔄 Duplicação de Instâncias

| Documento | Objetivo | Público | Tempo |
|-----------|----------|---------|-------|
| **[RESUMO_DUPLICACAO.md](RESUMO_DUPLICACAO.md)** | Resumo visual e métodos | Todos | 3 min |
| **[DUPLICACAO_GUIA.md](DUPLICACAO_GUIA.md)** | Guia completo de duplicação | Técnico | 15 min |
| **[duplicar-projeto.bat](duplicar-projeto.bat)** | Script automático Windows | Windows | Auto |
| **[duplicar-projeto.sh](duplicar-projeto.sh)** | Script automático Unix | Mac/Linux | Auto |

### 🗄️ Banco de Dados

| Documento | Objetivo | Público | Tempo |
|-----------|----------|---------|-------|
| **[schema.sql](schema.sql)** | Estrutura do banco Supabase | Dev/DBA | - |

### 🔧 Configuração

| Arquivo | Objetivo | Público |
|---------|----------|---------|
| **[.env.example](.env.example)** | Template de variáveis | Dev |
| **[package.json](package.json)** | Dependências do projeto | Dev |
| **[tsconfig.json](tsconfig.json)** | Configuração TypeScript | Dev |
| **[vite.config.ts](vite.config.ts)** | Configuração Vite | Dev |

---

## 🎓 Tutoriais por Cenário

### Cenário 1: Primeiro Deploy
```
1. Leia: QUICK_START.md
2. Siga os 5 passos
3. Verifique: CHECKLIST.md
✅ Tempo total: ~12 minutos
```

### Cenário 2: Duplicar para Nova Escola
```
1. Leia: RESUMO_DUPLICACAO.md
2. Execute: duplicar-projeto.bat (ou .sh)
3. Siga as instruções do script
4. Verifique: CHECKLIST.md
✅ Tempo total: ~20 minutos
```

### Cenário 3: Criar Ambiente de Teste
```
1. Leia: RESUMO_DUPLICACAO.md → Método 3
2. Copie a pasta
3. Use mesmo .env
4. Deploy com nome diferente
✅ Tempo total: ~5 minutos
```

### Cenário 4: Múltiplas Unidades (Multi-Tenant)
```
1. Leia: DUPLICACAO_GUIA.md → Opção 3
2. Implemente Row Level Security
3. Adicione campo tenant_id
4. Modifique supabaseService.ts
✅ Tempo estimado: 2-4 horas
```

---

## 🛠️ Arquitetura Técnica

### Stack Tecnológico
```
Frontend:  React 19 + TypeScript + Vite
Estilo:    TailwindCSS (inline)
Auth:      Firebase Authentication
Database:  Supabase (PostgreSQL)
IA:        Google Gemini
Gráficos:  Recharts
Deploy:    Vercel
```

### Estrutura de Pastas
```
📦 DRE RAIZ
├─ 📁 components/          # Componentes React
├─ 📁 services/            # Serviços (Supabase, Gemini)
├─ 📄 App.tsx              # Componente principal
├─ 📄 firebase.ts          # Config Firebase
├─ 📄 supabase.ts          # Config Supabase
├─ 📄 types.ts             # Definições TypeScript
├─ 📄 constants.ts         # Constantes do app
└─ 📚 Documentação/        # Você está aqui!
```

### Fluxo de Dados
```
Usuário → Firebase Auth → App React
                            ↓
                     Supabase DB
                            ↓
                    Google Gemini IA
```

---

## 🔐 Variáveis de Ambiente

O projeto requer 4 variáveis de ambiente:

| Variável | Origem | Usado Para |
|----------|--------|------------|
| `API_KEY` | Firebase Console | Autenticação Google |
| `VITE_SUPABASE_URL` | Supabase Dashboard | Conexão com banco |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard | Autenticação banco |
| `VITE_GEMINI_API_KEY` | Google AI Studio | Insights e IA |

**Veja**: [.env.example](.env.example) para template

---

## 📊 Banco de Dados

### Tabelas Principais

**transactions**
```sql
- id, date, description, category
- amount, type, scenario, status
- branch, brand, tag01, tag02, tag03
```

**manual_changes**
```sql
- id, transaction_id, type, field_changed
- old_value, new_value, justification
- status, requested_at, approved_at
- requested_by, approved_by
```

**Veja**: [schema.sql](schema.sql) para detalhes completos

---

## 🚨 Troubleshooting

### Problemas Comuns

**Erro: "Module not found"**
```bash
rm -rf node_modules
npm install
```

**Erro: "CORS"**
```
Firebase Console → Authentication → Settings
→ Adicionar domínio da Vercel
```

**Erro: "Cannot connect to Supabase"**
```
1. Verificar VITE_SUPABASE_URL no .env
2. Verificar VITE_SUPABASE_ANON_KEY no .env
3. Verificar se schema.sql foi executado
4. Verificar políticas RLS no Supabase
```

**Build falha na Vercel**
```
1. Verificar variáveis de ambiente na Vercel
2. Verificar se todas têm prefixo VITE_
3. Fazer redeploy após adicionar variáveis
```

---

## 📞 Suporte e Recursos

### Documentação Externa
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)

### Comandos Úteis
```bash
npm install              # Instalar dependências
npm run dev             # Rodar localmente (porta 3002)
npm run build           # Build para produção
npm run preview         # Preview do build

# Duplicação
duplicar-projeto.bat    # Windows
bash duplicar-projeto.sh # Mac/Linux
```

---

## ✅ Quick Reference

### URLs Importantes
- **Supabase**: https://supabase.com
- **Vercel**: https://vercel.com
- **Firebase Console**: https://console.firebase.google.com
- **Google AI Studio**: https://ai.google.dev

### Portas Padrão
- **Desenvolvimento**: http://localhost:3002
- **Super App**: http://localhost:3001

### Credenciais
⚠️ **Nunca compartilhe**:
- Arquivo `.env`
- API Keys
- Senhas do banco

✅ **Pode compartilhar**:
- Código fonte (sem `.env`)
- Documentação
- URLs públicas

---

## 🎉 Pronto para Começar?

1. **Novo no projeto?**
   - Leia [README.md](README.md) para entender o sistema
   - Siga [QUICK_START.md](QUICK_START.md) para fazer deploy

2. **Vai duplicar o projeto?**
   - Leia [RESUMO_DUPLICACAO.md](RESUMO_DUPLICACAO.md) primeiro
   - Execute os scripts de duplicação

3. **Quer entender tudo?**
   - Leia [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) para detalhes técnicos
   - Consulte [schema.sql](schema.sql) para estrutura do banco

4. **Dúvidas?**
   - Revise [CHECKLIST.md](CHECKLIST.md)
   - Consulte a seção Troubleshooting acima

---

**Desenvolvido para o Grupo Raiz Educação** 🎓
