# 🔥 Guia Completo: Configurar Firebase (em Português)

## 📱 PASSO 1: Criar o Projeto Firebase

1. **Acesse**: https://console.firebase.google.com
2. **Faça login** com sua conta Google da Raiz Educação
3. Clique no botão **"Adicionar projeto"** ou **"Criar um projeto"**

### Tela 1 - Nome do Projeto
- **Nome do projeto**: Digite `dre-raiz`
- Clique em **"Continuar"**

### Tela 2 - Google Analytics
- **Desmarque** a opção "Ativar o Google Analytics para este projeto"
  (não precisamos disso)
- Clique em **"Criar projeto"**

### Aguarde
- O Firebase vai criar o projeto (demora 10-30 segundos)
- Quando aparecer "Seu novo projeto está pronto", clique em **"Continuar"**

---

## 🔐 PASSO 2: Ativar Autenticação com Google

1. No menu lateral esquerdo, procure e clique em **"Authentication"** ou **"Autenticação"**
   - Se não aparecer, clique em **"Todos os produtos"** e encontre **"Authentication"**

2. Clique no botão **"Vamos começar"** ou **"Começar"**

3. Na aba **"Método de login"** ou **"Sign-in method"**:
   - Você verá uma lista de provedores (Google, Email/senha, etc.)
   - Clique na linha do **"Google"**

4. Na tela que abrir:
   - Clique no **toggle** (botão deslizante) para **ATIVAR** ✅
   - Em **"E-mail de suporte do projeto"**: selecione seu e-mail
   - Clique no botão **"Salvar"** no canto inferior direito

5. Pronto! Agora o Google deve aparecer como **"Ativado"** na lista

---

## 🌐 PASSO 3: Adicionar App da Web

1. No canto superior esquerdo, ao lado do nome do projeto, clique no **ícone de engrenagem ⚙️**

2. Clique em **"Configurações do projeto"** ou **"Project settings"**

3. Role a página para baixo até a seção **"Seus aplicativos"** ou **"Your apps"**

4. Clique no ícone **</>** (código, ícone da Web)

5. Na tela "Adicionar o Firebase ao seu app da Web":
   - **Apelido do app**: Digite `dre-raiz-web`
   - **NÃO** marque a opção "Configurar também o Firebase Hosting"
   - Clique em **"Registrar app"** ou **"Registrar aplicativo"**

---

## 📋 PASSO 4: Copiar as Credenciais

Após registrar o app, você verá um código JavaScript assim:

```javascript
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "dre-raiz.firebaseapp.com",
  projectId: "dre-raiz",
  storageBucket: "dre-raiz.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### **IMPORTANTE**: Você precisa copiar os 6 valores:

1. **apiKey**: `AIzaSyDxxxxx...`
2. **authDomain**: `dre-raiz.firebaseapp.com`
3. **projectId**: `dre-raiz`
4. **storageBucket**: `dre-raiz.appspot.com`
5. **messagingSenderId**: `123456789012`
6. **appId**: `1:123456789012:web:abc...`

**DICA**: Clique no botão de copiar ou selecione tudo e cole num bloco de notas temporariamente.

Depois clique em **"Continuar no console"**

---

## 📝 PASSO 5: Atualizar o arquivo .env

1. **Abra a pasta do projeto**:
   ```
   C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta
   ```

2. **Abra o arquivo `.env`** (com bloco de notas ou VSCode)

3. **APAGUE estas linhas**:
   ```env
   # Firebase (Temporário - adicionar depois para login Google)
   API_KEY=temporario-sem-login-google
   ```

4. **ADICIONE estas linhas** (substitua os valores pelos que você copiou do Firebase):

   ```env
   # Firebase - DRE RAIZ (✅ Configurado!)
   VITE_FIREBASE_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_FIREBASE_AUTH_DOMAIN=dre-raiz.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=dre-raiz
   VITE_FIREBASE_STORAGE_BUCKET=dre-raiz.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   ```

5. **Mantenha o resto do arquivo** (não mexa no Supabase):
   ```env
   # Supabase - DRE RAIZ (✅ Configurado!)
   VITE_SUPABASE_URL=https://vafmufhlompwsdrlhkfz.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Google Gemini AI (Temporário - adicionar depois para insights IA)
   VITE_GEMINI_API_KEY=temporario-sem-ia
   ```

6. **Salve o arquivo** (Ctrl+S)

---

## 🔄 PASSO 6: Reiniciar o Servidor

1. **Vá para o terminal** onde o servidor está rodando

2. **Pare o servidor**: Pressione `Ctrl+C`

3. **Inicie novamente**: Digite o comando:
   ```bash
   npm run dev
   ```

4. **Aguarde** a mensagem:
   ```
   VITE v6.4.1  ready in XXX ms
   ➜  Local:   http://localhost:3002/
   ```

---

## ✅ PASSO 7: Testar o Login

1. **Abra o navegador**: http://localhost:3002

2. Você verá a tela de login com o botão **"Entrar com Google"**

3. **Clique em "Entrar com Google"**

4. **Selecione sua conta** do Google (edmilson.serafim@raizeducacao.com.br)

5. Se aparecer uma tela pedindo permissões, clique em **"Permitir"** ou **"Allow"**

6. **SUCESSO!** 🎉 Você deve entrar no sistema e ver:
   - Seu nome e foto no sidebar
   - Menu "ADMIN" disponível
   - Dados carregando do banco

---

## 📸 Exemplo Visual do arquivo .env

```env
# ===================================================
# ARQUIVO .env - DRE RAIZ
# ===================================================

# Firebase - Login com Google (✅ CONFIGURADO)
VITE_FIREBASE_API_KEY=AIzaSyBcD1EfGh2IjKlMnOpQrStUvWxYz3456789
VITE_FIREBASE_AUTH_DOMAIN=dre-raiz.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dre-raiz
VITE_FIREBASE_STORAGE_BUCKET=dre-raiz.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321098
VITE_FIREBASE_APP_ID=1:987654321098:web:abc123def456ghi789

# Supabase - Banco de Dados (✅ JÁ ESTAVA CONFIGURADO)
VITE_SUPABASE_URL=https://vafmufhlompwsdrlhkfz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzIyOTEsImV4cCI6MjA4NTAwODI5MX0.clOvf8kNdpIUiqhAf2oAs6ETaNaoC93TWLrvGucm_I4

# Google Gemini AI - IA Insights (OPCIONAL)
VITE_GEMINI_API_KEY=temporario-sem-ia
```

---

## 🔍 Verificar se está funcionando

### No Console do Navegador (F12):

Abra o console (pressione F12) e procure por estas mensagens:

✅ **BOM** - Significa que está configurado:
```
🔐 Iniciando login com Google...
✅ Login Google bem-sucedido: edmilson.serafim@raizeducacao.com.br
✅ Dados do usuário carregados: {name: "Edmilson Serafim", role: "admin"}
```

❌ **RUIM** - Significa que precisa configurar:
```
🔴 FIREBASE NÃO CONFIGURADO!
📖 Leia o arquivo INSTRUCOES-FIREBASE.md
```

---

## 🆘 Resolução de Problemas

### Problema 1: "Erro ao fazer login. Tente novamente."
**Causa**: Firebase não configurado ou configurado errado
**Solução**:
1. Verifique se todas as 6 variáveis estão no .env
2. Verifique se não tem espaços antes/depois dos valores
3. Reinicie o servidor (Ctrl+C e npm run dev)

### Problema 2: "auth/unauthorized-domain"
**Causa**: O localhost não está nos domínios autorizados
**Solução**:
1. Firebase Console → Authentication
2. Clique na aba "Settings" ou "Configurações"
3. Role até "Domínios autorizados" ou "Authorized domains"
4. Verifique se `localhost` está na lista
5. Se não estiver, clique em "Adicionar domínio" e adicione `localhost`

### Problema 3: Popup bloqueado
**Causa**: Navegador bloqueou o popup do Google
**Solução**:
1. Clique no ícone de "bloqueado" na barra de endereço
2. Permita popups para localhost
3. Tente fazer login novamente

### Problema 4: "auth/invalid-api-key"
**Causa**: A API Key está errada
**Solução**:
1. Volte no Firebase Console
2. Configurações do projeto → Seus aplicativos
3. Verifique se você copiou o valor correto do `apiKey`
4. Copie novamente se necessário

### Problema 5: Servidor não reiniciou
**Causa**: Variáveis de ambiente não foram recarregadas
**Solução**:
1. Feche COMPLETAMENTE o terminal (X)
2. Abra um novo terminal
3. Navegue até a pasta do projeto
4. Execute `npm run dev` novamente

---

## 📞 Ainda com problemas?

Se continuar com erro:

1. **Tire um print** da tela de erro
2. **Abra o Console do navegador** (F12) → aba Console
3. **Copie** as mensagens de erro que aparecerem em vermelho
4. **Me avise** e vou te ajudar a resolver!

---

## ✨ Próximos Passos (depois que funcionar)

Quando o login estiver funcionando no localhost, você pode:

1. **Configurar no Vercel** (produção):
   - Adicionar as mesmas variáveis VITE_FIREBASE_* no Vercel
   - Adicionar domínio `dre-raiz.vercel.app` aos domínios autorizados no Firebase

2. **Testar com outros usuários**:
   - Convide colegas para fazer login
   - Gerencie permissões deles no painel Admin

3. **Explorar o sistema**:
   - Dashboard com KPIs
   - DRE dinâmico
   - Sistema de aprovações
   - Painel Admin

---

**🎯 RESUMO RÁPIDO:**

1. Firebase Console → Criar projeto "dre-raiz"
2. Ativar Authentication → Google
3. Adicionar App Web → Copiar credenciais
4. Colar no arquivo .env com prefixo VITE_FIREBASE_
5. Reiniciar servidor (Ctrl+C e npm run dev)
6. Testar login em http://localhost:3002

**Boa sorte! Qualquer dúvida, me avise! 🚀**
