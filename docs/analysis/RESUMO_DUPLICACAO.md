# 🚀 Resumo Rápido - Como Duplicar o DRE RAIZ

## 📌 3 Métodos de Duplicação

### Método 1: Script Automático (Mais Rápido) ⚡
```bash
# Windows
duplicar-projeto.bat

# Mac/Linux
bash duplicar-projeto.sh
```
**Tempo: ~5 minutos + configuração**

---

### Método 2: Manual Completo (Mais Controle) 🎯

#### Passo 1: Copiar Pasta
```bash
# Copie a pasta inteira para um novo local
# Exclua: node_modules, .env, dist
```

#### Passo 2: Novo Supabase
1. https://supabase.com → New Project
2. Nome: `dre-raiz-escola-xyz`
3. Região: São Paulo
4. SQL Editor → Cole `schema.sql` → Run

#### Passo 3: Configurar `.env`
```env
VITE_SUPABASE_URL=https://novo-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=nova_chave_aqui
```

#### Passo 4: Instalar e Testar
```bash
npm install
npm run dev
```

#### Passo 5: Deploy Vercel
1. https://vercel.com → Add New Project
2. Importar pasta/repositório
3. Configurar variáveis de ambiente
4. Deploy!

**Tempo: ~20 minutos**

---

### Método 3: Mesmo Banco (Teste/Staging) 🔄

Para criar múltiplas URLs acessando o MESMO banco:

```bash
# 1. Copie a pasta
# 2. Use o MESMO arquivo .env
# 3. Deploy na Vercel com nome diferente
```

**Tempo: ~5 minutos**
**⚠️ Atenção: Dados compartilhados entre todas as instâncias!**

---

## 📊 Comparação Rápida

| | Método 1<br/>Script | Método 2<br/>Manual | Método 3<br/>Mesmo DB |
|---|---|---|---|
| **Tempo** | 5 min | 20 min | 5 min |
| **Dificuldade** | Fácil | Média | Muito Fácil |
| **Banco** | Novo | Novo | Compartilhado |
| **Isolamento** | Total | Total | Nenhum |
| **Melhor para** | Rapidez | Controle | Teste |

---

## 🎯 Casos de Uso

### Uma instância por escola
```
Escola A → dre-escola-a.vercel.app → Banco A
Escola B → dre-escola-b.vercel.app → Banco B
Escola C → dre-escola-c.vercel.app → Banco C
```
**Use: Método 1 ou 2**

### Ambientes (Dev/Staging/Prod)
```
Dev     → dre-dev.vercel.app     → Banco Dev
Staging → dre-staging.vercel.app → Banco Staging
Prod    → dre-raiz.vercel.app    → Banco Prod
```
**Use: Método 1 ou 2**

### Múltiplos Domínios (Mesmo Sistema)
```
app.escola.com.br   → Banco Único
admin.escola.com.br → Banco Único
```
**Use: Método 3**

---

## ⚡ Quick Reference

### Arquivos para Duplicar
✅ Copiar TUDO exceto:
- ❌ `node_modules/`
- ❌ `.env`
- ❌ `dist/`
- ❌ `.git/`

### Comandos Essenciais
```bash
npm install              # Instalar dependências
npm run dev             # Rodar localmente (porta 3002)
npm run build           # Build para produção
```

### URLs Importantes
- Supabase: https://supabase.com
- Vercel: https://vercel.com
- Firebase: https://console.firebase.google.com

### Variáveis de Ambiente (.env)
```env
API_KEY=                    # Firebase
VITE_SUPABASE_URL=          # Supabase Project URL
VITE_SUPABASE_ANON_KEY=     # Supabase Anon Key
VITE_GEMINI_API_KEY=        # Google Gemini
```

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

1. **QUICK_START.md** - Deploy inicial
2. **DUPLICACAO_GUIA.md** - Guia completo de duplicação
3. **DEPLOY_GUIDE.md** - Detalhes técnicos de deploy
4. **CHECKLIST.md** - Checklist completo

---

## 💡 Dicas Importantes

1. **Nomenclatura Consistente**: Use o mesmo nome base em:
   - Nome da pasta
   - package.json
   - Projeto Supabase
   - Deploy Vercel

2. **Documentação**: Mantenha uma planilha com:
   - Nome do projeto
   - URL do app
   - URL do Supabase
   - Credenciais (em local seguro!)

3. **Git**: Um repositório por instância facilita manutenção

4. **Segurança**:
   - NUNCA comite o arquivo `.env`
   - Use credenciais diferentes para cada ambiente
   - Configure RLS no Supabase para produção

---

## 🆘 Problemas Comuns

### "Cannot find module..."
```bash
# Solução: Reinstalar dependências
rm -rf node_modules
npm install
```

### "CORS Error"
```
Adicione a URL da Vercel no Firebase Auth:
Authentication → Settings → Authorized domains
```

### "Database connection failed"
```
Verifique:
1. URL do Supabase está correta no .env
2. Anon key está correta no .env
3. Tabelas foram criadas (schema.sql executado)
```

---

## ✅ Checklist Rápido

- [ ] Pasta copiada
- [ ] Novo projeto no Supabase
- [ ] schema.sql executado
- [ ] .env configurado
- [ ] npm install executado
- [ ] Testado localmente
- [ ] Deploy na Vercel feito
- [ ] Variáveis na Vercel configuradas
- [ ] App funcionando online

---

**Pronto!** Sua nova instância do DRE RAIZ está no ar! 🎉
