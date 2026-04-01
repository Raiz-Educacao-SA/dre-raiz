# 🚀 COMECE AQUI - DRE RAIZ

**Bem-vindo ao Sistema DRE RAIZ!**

Este é o ponto de partida para deploy e duplicação do sistema.

---

## ❓ O que você quer fazer?

### 1️⃣ Fazer o Primeiro Deploy
**"Quero colocar o sistema no ar pela primeira vez"**

📖 Leia: **[QUICK_START.md](QUICK_START.md)**
⏱️ Tempo: 12 minutos
🎯 Resultado: Sistema funcionando na Vercel

```bash
# Passos resumidos:
1. Criar projeto no Supabase (5 min)
2. Executar schema.sql (2 min)
3. Copiar credenciais (1 min)
4. Criar arquivo .env (1 min)
5. Deploy na Vercel (3 min)
```

---

### 2️⃣ Duplicar o Sistema
**"Quero criar uma nova instância para outra escola/unidade"**

📖 Leia: **[RESUMO_DUPLICACAO.md](RESUMO_DUPLICACAO.md)**
⏱️ Tempo: 5-20 minutos (depende do método)
🎯 Resultado: Nova instância independente

**Método Rápido (Windows):**
```bash
duplicar-projeto.bat
```

**Método Rápido (Mac/Linux):**
```bash
bash duplicar-projeto.sh
```

**Ou siga o guia completo:** [DUPLICACAO_GUIA.md](DUPLICACAO_GUIA.md)

---

### 3️⃣ Entender o Projeto
**"Quero entender como funciona o sistema"**

📖 Leia: **[README.md](README.md)**
⏱️ Tempo: 5 minutos
🎯 Resultado: Visão geral do sistema

Depois explore:
- **[INDEX.md](INDEX.md)** - Índice completo da documentação
- Estrutura de pastas e arquitetura
- Stack tecnológico utilizado

---

### 4️⃣ Consultar Detalhes Técnicos
**"Preciso de informações técnicas detalhadas"**

📖 Leia: **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)**
⏱️ Tempo: 20 minutos
🎯 Resultado: Conhecimento técnico completo

Inclui:
- Configuração detalhada do Supabase
- Variáveis de ambiente
- Troubleshooting
- Segurança e boas práticas

---

### 5️⃣ Verificar se Está Tudo Certo
**"Quero confirmar que não esqueci nada"**

📖 Use: **[CHECKLIST.md](CHECKLIST.md)**
⏱️ Tempo: 5 minutos
🎯 Resultado: Garantia de deploy completo

Contém checklists para:
- Configuração do Supabase
- Configuração local
- Deploy na Vercel
- Verificação pós-deploy
- Duplicação (se aplicável)

---

## 📊 Fluxograma de Decisão

```
┌─────────────────────────────┐
│   Você tem o sistema        │
│   rodando localmente?       │
└──────────┬─────────┬────────┘
           │         │
        SIM│         │NÃO
           │         │
           ▼         ▼
    ┌───────────┐  ┌───────────┐
    │ Vai       │  │ Primeiro  │
    │ duplicar? │  │ Deploy    │
    └─────┬─────┘  └─────┬─────┘
          │              │
       SIM│ NÃO          │
          │  │           │
          │  └───────────┤
          │              │
          ▼              ▼
    ┌──────────┐   ┌──────────┐
    │ RESUMO_  │   │ QUICK_   │
    │ DUPLICA  │   │ START    │
    │ CAO.md   │   │ .md      │
    └──────────┘   └──────────┘
```

---

## 🎯 Guia Rápido por Perfil

### Gestor/Diretor
**Você quer: Sistema funcionando rápido**

1. Passe para equipe técnica: [QUICK_START.md](QUICK_START.md)
2. Peça para seguir: [CHECKLIST.md](CHECKLIST.md)
3. Pronto! Foque no uso do sistema

### Desenvolvedor Júnior
**Você quer: Instruções passo a passo**

1. Comece: [QUICK_START.md](QUICK_START.md)
2. Siga exatamente cada passo
3. Use: [CHECKLIST.md](CHECKLIST.md) para verificar
4. Em dúvida? [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

### Desenvolvedor Sênior
**Você quer: Visão técnica completa**

1. Leia: [README.md](README.md) para arquitetura
2. Veja: [schema.sql](schema.sql) para banco
3. Configure conforme: [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)
4. Personalize: Modifique conforme necessário

### DevOps/SysAdmin
**Você quer: Deploy em múltiplos ambientes**

1. Leia: [DUPLICACAO_GUIA.md](DUPLICACAO_GUIA.md)
2. Use scripts: `duplicar-projeto.bat/.sh`
3. Configure CI/CD conforme necessidade
4. Implemente: Opção 3 (Multi-Tenant) se necessário

---

## 📚 Todos os Documentos Disponíveis

### 📖 Guias Principais
- **[START_HERE.md](START_HERE.md)** ← Você está aqui!
- **[README.md](README.md)** - Visão geral do projeto
- **[INDEX.md](INDEX.md)** - Índice completo da documentação

### 🚀 Deploy e Configuração
- **[QUICK_START.md](QUICK_START.md)** - Deploy rápido em 5 passos
- **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** - Guia técnico detalhado
- **[CHECKLIST.md](CHECKLIST.md)** - Checklist de verificação

### 🔄 Duplicação
- **[RESUMO_DUPLICACAO.md](RESUMO_DUPLICACAO.md)** - Resumo visual
- **[DUPLICACAO_GUIA.md](DUPLICACAO_GUIA.md)** - Guia completo
- **[duplicar-projeto.bat](duplicar-projeto.bat)** - Script Windows
- **[duplicar-projeto.sh](duplicar-projeto.sh)** - Script Unix

### 🗄️ Banco de Dados
- **[schema.sql](schema.sql)** - Estrutura completa do banco

### ⚙️ Configuração
- **[.env.example](.env.example)** - Template de variáveis
- **[package.json](package.json)** - Dependências

---

## 💡 Dicas Importantes

### ⚠️ Antes de Começar
- ✅ Tenha conta no Supabase (gratuita)
- ✅ Tenha conta na Vercel (gratuita)
- ✅ Tenha as API Keys (Firebase, Gemini)
- ✅ Node.js instalado (versão 18+)

### 🔐 Segurança
- ❌ NUNCA comite o arquivo `.env`
- ❌ NUNCA compartilhe suas API Keys
- ✅ Use `.env.example` como template
- ✅ Configure variáveis na Vercel

### 📊 Suporte
- Dúvidas técnicas? → [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)
- Problemas? → Veja seção Troubleshooting
- Duplicação? → [DUPLICACAO_GUIA.md](DUPLICACAO_GUIA.md)

---

## 🎉 Pronto para Começar!

Escolha seu caminho acima e siga o guia correspondente.

**Boa sorte com seu deploy! 🚀**

---

**Projeto DRE RAIZ - Grupo Raiz Educação** 🎓
