# 🚀 Instruções de Deploy na Vercel - DRE RAIZ

## Passo 1: Acessar Vercel
1. Abra seu navegador
2. Acesse: **https://vercel.com**
3. Faça login com sua conta

---

## Passo 2: Criar Novo Projeto
1. Clique no botão **"Add New..."** (canto superior direito)
2. Selecione **"Project"**
3. Se aparecer opção de GitHub, clique em **"Browse"** ou procure por **"Deploy without Git"**
4. Escolha **"Upload Files"** ou **"Deploy from Directory"**

---

## Passo 3: Upload da Pasta
1. Arraste a pasta do projeto OU clique para selecionar:
   **Caminho**: `C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta`

2. Aguarde o upload completar (pode demorar alguns minutos dependendo da conexão)

---

## Passo 4: Configurar o Projeto

### Nome do Projeto:
- Digite: **`dre-raiz`** (ou escolha outro nome único)

### Framework Preset:
- Selecione: **Vite**
- Se não aparecer automaticamente, não se preocupe - o vercel.json já está configurado

### Build Settings (geralmente detecta automaticamente):
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅
- **Install Command**: `npm install` ✅

---

## Passo 5: Adicionar Variáveis de Ambiente

**IMPORTANTE**: Clique em **"Environment Variables"** para expandir

Adicione as 4 variáveis abaixo, **UMA POR VEZ**:

### Variável 1:
- **Name**: `API_KEY`
- **Value**: `temporario-sem-login-google`
- Clique em **"Add"**

### Variável 2:
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://vafmufhlompwsdrlhkfz.supabase.co`
- Clique em **"Add"**

### Variável 3:
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzIyOTEsImV4cCI6MjA4NTAwODI5MX0.clOvf8kNdpIUiqhAf2oAs6ETaNaoC93TWLrvGucm_I4`
- Clique em **"Add"**

### Variável 4:
- **Name**: `VITE_GEMINI_API_KEY`
- **Value**: `temporario-sem-ia`
- Clique em **"Add"**

---

## Passo 6: Deploy!

1. Verifique se todas as 4 variáveis foram adicionadas ✅
2. Clique no botão grande **"Deploy"**
3. Aguarde o deploy (~2-3 minutos)
4. Você verá um progresso com:
   - Installing dependencies...
   - Building...
   - Deploying...

---

## Passo 7: Sucesso! 🎉

Quando terminar, você verá:
- ✅ Mensagem de sucesso
- 🌐 URL do seu app: `https://dre-raiz.vercel.app` (ou similar)
- 🎊 Animação de confete

**Clique na URL para abrir seu app!**

---

## ⚠️ Observações Importantes

### Funcionalidades Ativas:
- ✅ Dashboard
- ✅ Movimentações
- ✅ DRE
- ✅ KPIs
- ✅ Previsões
- ✅ Banco de dados (Supabase)

### Funcionalidades Temporariamente Desativadas:
- ⚠️ Login com Google (precisa adicionar API Key do Firebase)
- ⚠️ Insights de IA (precisa adicionar API Key do Gemini)

### Para Adicionar Depois:
1. Na Vercel, vá em: Projeto → Settings → Environment Variables
2. Edite as variáveis `API_KEY` e `VITE_GEMINI_API_KEY`
3. Faça um Redeploy

---

## 🆘 Problemas Comuns

### "Build Failed"
- Verifique se todas as 4 variáveis foram adicionadas
- Certifique-se que o Framework é "Vite"

### "Função não funciona"
- Verifique as variáveis de ambiente
- Faça um Redeploy

### "Página em branco"
- Abra o Console do navegador (F12)
- Verifique se há erros
- Me envie os erros que aparecem

---

**BOA SORTE! 🚀**
