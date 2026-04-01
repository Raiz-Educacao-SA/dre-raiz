# 🚀 Configurar Variáveis de Ambiente no Vercel - Produção

## ✅ Deploy Realizado com Sucesso!

**URL de Produção**: https://dre-raiz.vercel.app

Agora precisamos configurar as variáveis de ambiente para o sistema funcionar em produção.

---

## 📋 PASSO 1: Adicionar Variáveis de Ambiente no Vercel

### Método Rápido (Dashboard Web):

1. **Acesse**: https://vercel.com/edmilson-serafims-projects/dre-raiz/settings/environment-variables

2. **Adicione cada variável abaixo**:

Para cada variável, clique em **"Add New"** e preencha:

#### Firebase (6 variáveis):

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyCtDyIeO2gSoMT_06zlmQjr-uIQntPMPks` | Production, Preview, Development |
| `VITE_FIREBASE_AUTH_DOMAIN` | `dre-raiz.firebaseapp.com` | Production, Preview, Development |
| `VITE_FIREBASE_PROJECT_ID` | `dre-raiz` | Production, Preview, Development |
| `VITE_FIREBASE_STORAGE_BUCKET` | `dre-raiz.firebasestorage.app` | Production, Preview, Development |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `4072161302` | Production, Preview, Development |
| `VITE_FIREBASE_APP_ID` | `1:4072161302:web:bbbbaf1a2b709d07487537` | Production, Preview, Development |

#### Supabase (2 variáveis):

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://vafmufhlompwsdrlhkfz.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzIyOTEsImV4cCI6MjA4NTAwODI5MX0.clOvf8kNdpIUiqhAf2oAs6ETaNaoC93TWLrvGucm_I4` | Production, Preview, Development |

#### Google Gemini (1 variável - opcional):

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_GEMINI_API_KEY` | `temporario-sem-ia` | Production, Preview, Development |

3. **Marque os 3 ambientes** para cada variável:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. **Clique em "Save"** para cada variável

---

## 📋 PASSO 2: Adicionar Domínio ao Firebase

Para o login funcionar em produção, você precisa autorizar o domínio do Vercel no Firebase:

1. **Acesse**: https://console.firebase.google.com

2. **Selecione o projeto**: `dre-raiz`

3. **Menu lateral** → **Authentication**

4. **Aba "Settings"** (Configurações)

5. Role até **"Authorized domains"** (Domínios autorizados)

6. Clique em **"Add domain"** (Adicionar domínio)

7. **Adicione estes domínios**:
   - `dre-raiz.vercel.app`
   - `dre-raiz-dvjrr98t1-edmilson-serafims-projects.vercel.app` (domínio de preview)

8. Clique em **"Add"** para cada um

---

## 📋 PASSO 3: Fazer Novo Deploy

Após adicionar as variáveis, faça um novo deploy para aplicá-las:

### Opção A - Via CLI (Mais Rápido):
```bash
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
vercel --prod
```

### Opção B - Via Dashboard:
1. Acesse: https://vercel.com/edmilson-serafims-projects/dre-raiz
2. Clique em **"Redeploy"**
3. Marque **"Use existing Build Cache"**
4. Clique em **"Redeploy"**

---

## ✅ PASSO 4: Testar o Sistema em Produção

1. **Acesse**: https://dre-raiz.vercel.app

2. **Clique em "Entrar com Google"**

3. **Faça login** com sua conta

4. **Verifique**:
   - ✅ Login funciona
   - ✅ Dados carregam do Supabase
   - ✅ Painel Admin disponível
   - ✅ Todas funcionalidades operacionais

---

## 🔍 Verificar se as Variáveis Foram Aplicadas

### No Console do Navegador (F12):

Após fazer login, verifique se não há erros relacionados a:
- `Firebase: Error (auth/invalid-api-key)` ❌
- `Supabase: No API key found` ❌

Se aparecer esses erros, as variáveis não foram aplicadas corretamente.

### Comandos Úteis:

```bash
# Ver todas as variáveis configuradas
vercel env ls

# Ver logs de produção
vercel logs dre-raiz.vercel.app

# Inspecionar deploy
vercel inspect dre-raiz.vercel.app
```

---

## 📸 Exemplo Visual - Como Adicionar Variável

No Dashboard do Vercel:

1. **Environment Variable Name**: `VITE_FIREBASE_API_KEY`
2. **Value**: `AIzaSyCtDyIeO2gSoMT_06zlmQjr-uIQntPMPks`
3. **Environments**: ✅ Production ✅ Preview ✅ Development
4. **Clique em "Save"**

Repita para cada uma das 9 variáveis.

---

## 🆘 Solução de Problemas

### Erro: "Firebase: Error (auth/unauthorized-domain)"
**Solução**: Você esqueceu de adicionar o domínio no Firebase (PASSO 2)

### Erro: "Cannot read properties of undefined"
**Solução**: Variáveis de ambiente não foram aplicadas. Refaça o deploy após adicionar.

### Login funciona mas não carrega dados
**Solução**: Verifique a variável `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

### Página em branco
**Solução**:
1. Abra o Console (F12)
2. Veja os erros
3. Provavelmente falta alguma variável de ambiente

---

## 🎯 Checklist Final

Após configurar tudo:

- [ ] 6 variáveis Firebase adicionadas no Vercel
- [ ] 2 variáveis Supabase adicionadas no Vercel
- [ ] 1 variável Gemini adicionada no Vercel (opcional)
- [ ] Domínios autorizados no Firebase
- [ ] Novo deploy realizado
- [ ] Login testado em produção
- [ ] Dados carregando do Supabase
- [ ] Painel Admin acessível

---

## 🎉 Sistema em Produção!

Quando tudo estiver funcionando:

✅ **Localhost**: http://localhost:3002
✅ **Produção**: https://dre-raiz.vercel.app

Ambos com:
- Login Google
- Sistema de permissões
- Painel Admin
- RLS ativo
- Auditoria completa

---

## 📞 Precisa de Ajuda?

Se algo não funcionar:
1. Tire um print do erro
2. Copie os logs do Vercel
3. Verifique o Console do navegador (F12)
4. Me avise e vou ajudar!

---

**Boa sorte! 🚀**
