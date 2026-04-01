# 🚀 Como Iniciar o Projeto com IA Sonnet

## Problema Identificado
O erro **"Desculpe, tive um problema ao analisar seus dados"** ocorre porque o servidor proxy da API Anthropic não está rodando.

## ✅ Solução: Iniciar Ambos os Servidores

### Opção 1: Dois Terminais (Recomendado para Windows)

#### Terminal 1 - Servidor Proxy da IA:
```bash
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
npm run proxy
```

Você deve ver:
```
✅ Anthropic proxy server running on http://localhost:3021
🔑 API Key loaded: sk-ant-api03-E540m4h...
```

#### Terminal 2 - Aplicação React:
```bash
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
npm run dev
```

### Opção 2: Script Único (Experimental)
```bash
npm run dev:full
```

## 🧪 Como Testar se Está Funcionando

1. Abra a aplicação no navegador (geralmente `http://localhost:5173`)
2. Navegue até a seção **"IA Financeira"**
3. Clique em **"Gerar Novo Resumo"** ou envie uma mensagem no chat
4. Se aparecer insights ou respostas da IA, está funcionando! ✅

## 🔍 Verificação de Logs

### No Terminal do Proxy:
- Você verá logs de requisições quando a IA for chamada
- Erros aparecerão com `❌`

### No Console do Navegador (F12):
- Abra as ferramentas de desenvolvedor
- Vá em "Console"
- Procure por mensagens de erro relacionadas ao Anthropic

## 🔑 Configuração da API Key

A chave da API já está configurada em:
- `.env.local` ✅ (para desenvolvimento)
- `.env` ✅ (backup)

Chave atual: `sk-ant-api03-E540m4h_Dnucrti0V8...`

## ❗ Problemas Comuns

### 1. Porta 3021 já está em uso
```bash
# Encontrar o processo que está usando a porta
netstat -ano | findstr :3021

# Matar o processo (substitua PID pelo número encontrado)
taskkill /PID <número_do_processo> /F
```

### 2. API Key inválida
- Verifique se a chave em `.env.local` está correta
- Teste a chave diretamente na API da Anthropic

### 3. Erro de CORS
- Certifique-se de que o proxy está rodando
- Verifique se a URL do proxy está correta em `services/anthropicService.ts` (linha 6)

## 📝 Arquivos Importantes

- `proxy-server.cjs` - Servidor proxy que faz a ponte com a API Anthropic
- `services/anthropicService.ts` - Serviço que chama a IA
- `components/AIFinancialView.tsx` - Interface da IA
- `.env.local` - Chaves da API (desenvolvimento)

## 🎯 Próximos Passos

Depois de iniciar ambos os servidores, a IA Sonnet deve funcionar perfeitamente para:
- Gerar insights automáticos sobre DRE
- Responder perguntas no chat conversacional
- Analisar KPIs e sugerir ações estratégicas
