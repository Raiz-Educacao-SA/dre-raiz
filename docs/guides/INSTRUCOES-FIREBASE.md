# 🔥 Configuração do Firebase para Login Google

## Por que preciso configurar o Firebase?

O Firebase Authentication é usado para o login com Google. Sem configurá-lo, o sistema não consegue autenticar usuários.

## 📋 Passo a Passo - Configuração Completa

### Etapa 1: Criar/Acessar Projeto Firebase

1. **Acesse o Firebase Console**: https://console.firebase.google.com
2. **Faça login** com sua conta Google da Raiz Educação
3. Você tem 2 opções:

#### Opção A: Usar o projeto existente "escola-sap-financeiro"
- Se já existe, clique nele
- Vá direto para **Etapa 2**

#### Opção B: Criar novo projeto "dre-raiz"
- Clique em **"Adicionar projeto"** ou **"Add project"**
- Nome: `dre-raiz`
- Desabilite o Google Analytics (não é necessário)
- Clique em **"Criar projeto"**

### Etapa 2: Ativar Authentication

1. No menu lateral, clique em **"Authentication"** (🔐)
2. Clique em **"Get Started"** (se for primeira vez)
3. Na aba **"Sign-in method"**:
   - Clique em **"Google"**
   - **Ative** o toggle (Enable)
   - Em "Project support email", selecione seu email
   - Clique em **"Save"**

### Etapa 3: Adicionar Domínio Autorizado

1. Ainda em **Authentication > Settings**
2. Role até **"Authorized domains"**
3. Por padrão, `localhost` já está autorizado ✅
4. Se não estiver, clique em **"Add domain"** e adicione:
   - `localhost`

### Etapa 4: Criar Web App

1. No canto superior esquerdo, clique no ⚙️ (ícone de configurações) ao lado do nome do projeto
2. Clique em **"Project settings"**
3. Role até a seção **"Your apps"**
4. Clique no ícone **</>** (Web)
5. Configure:
   - App nickname: `dre-raiz-web`
   - ✅ **NÃO** marque "Firebase Hosting" (não é necessário)
   - Clique em **"Register app"**

### Etapa 5: Copiar Credenciais

Após registrar o app, você verá um código JavaScript com as credenciais. Copie os valores:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",           // 👈 COPIE ESTE
  authDomain: "projeto.firebaseapp.com",   // 👈 COPIE ESTE
  projectId: "projeto",            // 👈 COPIE ESTE
  storageBucket: "projeto.appspot.com",    // 👈 COPIE ESTE
  messagingSenderId: "123456789",  // 👈 COPIE ESTE
  appId: "1:123:web:abc..."       // 👈 COPIE ESTE
};
```

### Etapa 6: Atualizar arquivo .env

Abra o arquivo `.env` na raiz do projeto e atualize com suas credenciais:

**ANTES:**
```env
# Firebase (Temporário - adicionar depois para login Google)
API_KEY=temporario-sem-login-google
```

**DEPOIS:**
```env
# Firebase - DRE RAIZ (✅ Configurado!)
VITE_FIREBASE_API_KEY=AIzaSyC... # Cole sua apiKey aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc...
```

### Etapa 7: Atualizar firebase.ts

Abra o arquivo `firebase.ts` e atualize:

**ANTES:**
```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY || "temporario-sem-login-google",
  authDomain: "escola-sap-financeiro.firebaseapp.com",
  projectId: "escola-sap-financeiro",
  storageBucket: "escola-sap-financeiro.appspot.com",
  messagingSenderId: "748291038475",
  appId: "1:748291038475:web:a1b2c3d4e5f6g7h8i9j0"
};
```

**DEPOIS:**
```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

### Etapa 8: Reiniciar o Servidor

No terminal, pressione `Ctrl+C` para parar o servidor, depois execute:
```bash
npm run dev
```

O servidor vai recarregar com as novas credenciais do `.env`

### Etapa 9: Testar o Login

1. Acesse: http://localhost:3002
2. Clique em **"Entrar com Google"**
3. Selecione sua conta Google
4. ✅ Login deve funcionar!

## 🔧 Configuração do Vercel (Produção)

Depois que funcionar no localhost, configure as mesmas variáveis no Vercel:

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **dre-raiz**
3. Vá em **Settings > Environment Variables**
4. Adicione cada variável:
   - `VITE_FIREBASE_API_KEY` = sua chave
   - `VITE_FIREBASE_AUTH_DOMAIN` = seu domínio
   - `VITE_FIREBASE_PROJECT_ID` = seu projeto
   - `VITE_FIREBASE_STORAGE_BUCKET` = seu bucket
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = seu sender id
   - `VITE_FIREBASE_APP_ID` = seu app id
5. Clique em **"Redeploy"** para aplicar

## ⚠️ Importante

### Domínios Autorizados em Produção

Quando fizer deploy no Vercel, adicione o domínio de produção aos domínios autorizados:

1. Firebase Console > Authentication > Settings > Authorized domains
2. Clique em **"Add domain"**
3. Adicione: `dre-raiz.vercel.app` (ou seu domínio custom)

## 🆘 Solução de Problemas

### Erro: "Firebase: Error (auth/invalid-api-key)"
**Solução**: A API key está incorreta ou não foi configurada. Verifique o arquivo `.env`

### Erro: "Firebase: Error (auth/unauthorized-domain)"
**Solução**: Adicione o domínio aos domínios autorizados no Firebase Console

### Erro: "Firebase: Error (auth/popup-blocked)"
**Solução**: O navegador bloqueou o popup. Permita popups para localhost

### Login funciona mas não cria usuário no Supabase
**Solução**: Verifique se o email do Firebase está no Supabase. O sistema cria automaticamente no primeiro login.

### Erro: "auth/configuration-not-found"
**Solução**: Reinicie o servidor após configurar as variáveis de ambiente

## 📊 Verificar se está funcionando

Abra o Console do Navegador (F12) e procure por:
- ✅ `🔐 Iniciando login com Google...`
- ✅ `✅ Login Google bem-sucedido: seu-email@raizeducacao.com.br`
- ✅ `✅ Dados do usuário carregados:`

Se ver essas mensagens, está tudo certo! 🎉

## 💡 Dica: Ambiente de Desenvolvimento

Para facilitar o desenvolvimento, você pode criar dois arquivos:
- `.env.local` - Credenciais de desenvolvimento
- `.env.production` - Credenciais de produção (usado no Vercel)

O Vite prioriza `.env.local` sobre `.env` em desenvolvimento.

## 🔒 Segurança

- ✅ **NUNCA** commite o arquivo `.env` no Git
- ✅ O `.gitignore` já está configurado para ignorar `.env`
- ✅ As chaves do Firebase são públicas (podem estar no frontend)
- ✅ A segurança real está no Supabase RLS que configuramos

## 📚 Documentação Oficial

- Firebase Auth: https://firebase.google.com/docs/auth/web/start
- Firebase Console: https://console.firebase.google.com
- Vite Environment Variables: https://vitejs.dev/guide/env-and-mode.html
