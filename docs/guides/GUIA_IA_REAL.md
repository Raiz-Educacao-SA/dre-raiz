# 🤖 Guia - Análises com IA Real (Claude)

Sistema configurado para gerar análises financeiras com dados reais usando Claude AI.

---

## 🎯 O Que Foi Implementado

### ✅ Backend API (Novo!)

Criado servidor Express na porta 3002 que:
- Recebe requisições do frontend
- Busca dados reais do Supabase via `fetchAnalysisContext`
- Chama Claude API (Sonnet 4.5) para gerar análises
- Retorna `AnalysisPack` estruturado

**Arquivo:** `server.cjs`

### ✅ Endpoint da API

```
POST http://localhost:3002/api/analysis/generate-ai
```

**Body:**
```json
{
  "context": {
    "org_name": "RAIZ Educação",
    "currency": "BRL",
    "period_label": "Jan/2026",
    "scope_label": "Consolidado",
    "kpis": [...],
    "datasets": {...}
  },
  "type": "summary" | "actions" | "full"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meta": {...},
    "executive_summary": {...},
    "actions": [...],
    "charts": [...],
    "slides": [...]
  }
}
```

---

## 🚀 Como Iniciar

### Opção 1: Script Automático (Recomendado)

```bash
# No Windows, clique duas vezes em:
INICIAR-COM-IA.bat

# Ou execute no terminal:
.\INICIAR-COM-IA.bat
```

Isso abrirá duas janelas:
1. **Backend (porta 3002)** - Servidor da API
2. **Frontend (porta 3000)** - Interface React

### Opção 2: Manual (Duas Janelas Separadas)

**Terminal 1 - Backend:**
```bash
npm run backend
```

Aguarde ver:
```
✅ Servidor rodando: http://localhost:3002
🔑 Anthropic API Key: ✅ Configurado
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Aguarde ver:
```
✅ Local: http://localhost:3000
```

---

## 🔧 Passo a Passo Completo

### 1. Fechar Processos Antigos

**IMPORTANTE:** Antes de iniciar, feche qualquer processo Node.js em execução.

**No Windows:**
```cmd
# Abrir Task Manager (Ctrl + Shift + Esc)
# Procurar por "Node.js"
# Finalizar todos os processos Node.js
```

Ou use o comando:
```cmd
taskkill /F /IM node.exe
```

### 2. Iniciar Servidores

Use o script `INICIAR-COM-IA.bat` ou inicie manualmente (opções acima).

### 3. Verificar Status

**Backend (porta 3002):**
```bash
curl http://localhost:3002/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2026-01-31T...",
  "anthropic_key": "✅ Configurado"
}
```

**Frontend (porta 3000):**
Abrir http://localhost:3000 no navegador.

---

## 🎨 Como Usar

### 1. Acessar Análise Financeira

1. Login no sistema (http://localhost:3000)
2. Clicar em "📊 Análise Financeira" no menu
3. Aplicar filtros (opcional):
   - 🏴 MARCA: Selecionar marca específica
   - 🏢 FILIAL: Selecionar filial específica

### 2. Gerar Sumário Executivo (IA Real)

1. Ir para aba "Sumário Executivo"
2. Clicar **"Gerar Sumário Executivo"** (botão laranja)
3. Aguardar 10-20 segundos
4. ✅ Sumário gerado com dados reais!

**O que acontece:**
```
Frontend (port 3000)
  ↓ POST /api/analysis/generate-ai
Backend (port 3002)
  ↓ fetchAnalysisContext() → Supabase
  ↓ buildPrompts() com dados reais
  ↓ Claude API (Sonnet 4.5)
  ↓ Gera executive_summary
  ↓ Retorna JSON estruturado
Frontend
  ↓ Renderiza sumário
```

### 3. Gerar Plano de Ação (IA Real)

1. Ir para aba "Plano de Ação"
2. Clicar **"Gerar Plano de Ação"**
3. Aguardar 10-20 segundos
4. ✅ Ações recomendadas geradas!

### 4. Gerar Slides Completos (IA Real)

1. Ir para aba "Slides de Análise"
2. Clicar **"Gerar Slides"**
3. Aguardar 15-30 segundos (análise completa demora mais)
4. ✅ Slides completos gerados!
5. Opcional: Clicar **"Exportar PowerPoint"**

---

## 🔍 Como Identificar IA Real vs Mock

### Console do Browser (F12)

**Dados Reais:**
```
✅ Nenhuma mensagem de warning
✅ Tempo de resposta: 10-30 segundos
✅ Análise única para seus dados
```

**Dados Mock (fallback):**
```
⚠️ API não disponível, usando mock data: [erro]
✅ Tempo de resposta: < 1 segundo
✅ Análise genérica (sempre a mesma)
```

### Logs do Backend (Terminal 1)

**Quando chamar IA real:**
```
2026-01-31T12:30:00.000Z - POST /api/analysis/generate-ai
🤖 Gerando análise full para RAIZ Educação...
📡 Chamando Claude API...
✅ Resposta recebida do Claude
✅ Análise gerada com sucesso!
```

### Dados Gerados

**Mock Data:**
- Sempre mesmos valores
- Org: "RAIZ Educação"
- Período: "Jan/2026"
- Valores fictícios

**Dados Reais:**
- Valores do seu Supabase
- Org/Período conforme filtros
- Análise única baseada nos seus dados
- Insights específicos da sua organização

---

## 🛠️ Configuração

### Variáveis de Ambiente (.env)

```bash
# Anthropic Claude AI (OBRIGATÓRIO)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Supabase (OBRIGATÓRIO)
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...

# Gemini (opcional, para chat IA)
GEMINI_API_KEY=AIza...
```

### Verificar Configuração

```bash
# Verificar se API key está configurada:
cat .env | grep ANTHROPIC_API_KEY

# Ou verificar via health check:
curl http://localhost:3002/health
```

---

## 🎯 Diferenças: Mock vs Real

### Mock Data (Fallback)

**Vantagens:**
- ✅ Rápido (< 1s)
- ✅ Sem custo
- ✅ Funciona offline
- ✅ Bom para desenvolvimento

**Limitações:**
- ❌ Dados fictícios
- ❌ Análise genérica
- ❌ Não reflete sua realidade

### IA Real (Claude)

**Vantagens:**
- ✅ Análise baseada nos seus dados reais
- ✅ Insights específicos da sua org
- ✅ Recomendações personalizadas
- ✅ Valores do Supabase
- ✅ Análises únicas a cada geração

**Considerações:**
- ⏱️ Mais lento (10-30s)
- 💰 Usa créditos da API Claude
- 📡 Requer internet
- 🔑 Requer API key configurada

---

## 📊 Fluxo Completo

```
1. Usuário clica "Gerar Sumário"
   ↓
2. Frontend: fetchAnalysisContext()
   - Busca transações do Supabase
   - Filtra por marca/filial (se selecionado)
   - Calcula KPIs
   - Gera datasets (R12, waterfall, pareto, heatmap)
   ↓
3. Frontend → POST http://localhost:3002/api/analysis/generate-ai
   Body: { context: {...}, type: 'summary' }
   ↓
4. Backend recebe requisição
   ↓
5. Backend: buildPrompts()
   - System prompt (instruções para IA)
   - User prompt (dados + contexto)
   ↓
6. Backend → Claude API (Anthropic)
   - Model: claude-sonnet-4-5-20250929
   - Max tokens: 5000
   - JSON schema output
   ↓
7. Claude processa e retorna JSON:
   {
     "meta": {...},
     "executive_summary": {
       "headline": "Receita cresceu 15% vs plano...",
       "bullets": [...],
       "risks": [...],
       "opportunities": [...]
     },
     "actions": [...],
     "charts": [...],
     "slides": [...]
   }
   ↓
8. Backend valida JSON
   ↓
9. Backend → Frontend (resposta)
   ↓
10. Frontend renderiza sumário/ações/slides
```

---

## 🐛 Troubleshooting

### ❌ Backend não inicia

**Erro:** `Port 3002 is already in use`

**Solução:**
```cmd
# Matar processo na porta 3002:
taskkill /F /IM node.exe

# Ou Task Manager → Finalizar Node.js
```

---

### ❌ Frontend não inicia

**Erro:** `Port 3000 is already in use`

**Solução:**
```cmd
# Matar todos os processos Node:
taskkill /F /IM node.exe

# Reiniciar:
npm run dev
```

---

### ❌ API key não configurada

**Erro no backend:**
```
❌ ANTHROPIC_API_KEY não configurado no .env
```

**Solução:**
1. Abrir `.env`
2. Verificar linha:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
3. Se vazia, adicionar sua API key
4. Reiniciar backend

---

### ❌ Erro ao chamar Claude

**Erro:**
```
Claude API erro 401: Unauthorized
```

**Causa:** API key inválida ou expirada

**Solução:**
1. Verificar API key no .env
2. Testar API key em: https://console.anthropic.com
3. Gerar nova API key se necessário

---

### ❌ Resposta muito lenta

**Causa:** Claude demora 10-30 segundos

**Normal!** IA leva tempo para processar.

**Alternativas:**
- Reduzir `maxTokens` no `server.cjs` (linha com `max_tokens: 5000`)
- Usar tipo específico (`summary` ou `actions`) ao invés de `full`

---

### ❌ Ainda usa mock data

**Console mostra:**
```
⚠️ API não disponível, usando mock data
```

**Causas possíveis:**
1. Backend não está rodando (porta 3002)
2. Erro ao chamar Claude
3. Rede bloqueando requisição

**Soluções:**
1. Verificar se backend está rodando:
   ```
   curl http://localhost:3002/health
   ```
2. Ver logs do backend (terminal 1)
3. Verificar console do browser (F12)

---

### ❌ JSON inválido retornado

**Erro:**
```
IA retornou JSON inválido
```

**Causa:** Claude retornou estrutura incorreta

**Solução:**
- Tentar gerar novamente (pode ser instabilidade)
- Verificar prompts em `server.cjs`
- Aumentar `maxTokens` se resposta foi cortada

---

## 💰 Custos da API

### Claude Sonnet 4.5

**Modelo:** `claude-sonnet-4-5-20250929`

**Preços (aproximados):**
- Input: $3.00 / milhão de tokens
- Output: $15.00 / milhão de tokens

**Estimativa por geração:**
- Sumário: ~2000 tokens → $0.03
- Ações: ~1500 tokens → $0.02
- Full (slides): ~4000 tokens → $0.06

**Mensal (uso moderado):**
- ~100 gerações/mês → $3-5

---

## 📈 Performance

### Tempos Esperados

**Sumário Executivo:**
- Com IA: 10-15 segundos
- Com mock: < 1 segundo

**Plano de Ação:**
- Com IA: 10-15 segundos
- Com mock: < 1 segundo

**Slides Completos:**
- Com IA: 20-30 segundos
- Com mock: < 1 segundo

### Otimizações

**Para reduzir tempo:**
1. Usar tipos específicos (`summary`, `actions`) ao invés de `full`
2. Reduzir `maxTokens` (mas pode cortar resposta)
3. Filtrar dados antes de enviar para IA

**Para reduzir custo:**
1. Cache de análises geradas
2. Regenerar apenas quando dados mudarem
3. Usar mock para desenvolvimento/testes

---

## ✅ Checklist de Funcionamento

### Pré-requisitos
- [ ] Node.js instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] `.env` configurado com `ANTHROPIC_API_KEY`
- [ ] `.env` configurado com `VITE_SUPABASE_URL`

### Servidores
- [ ] Backend rodando na porta 3002
- [ ] Frontend rodando na porta 3000
- [ ] Health check retorna status ok

### Geração com IA Real
- [ ] Clicar "Gerar Sumário" → Aguardar 10-15s → Sumário aparece
- [ ] Console NÃO mostra warning de mock data
- [ ] Logs do backend mostram "Chamando Claude API"
- [ ] Análise é baseada nos dados do Supabase

### Fallback para Mock
- [ ] Se backend offline → Mock funciona
- [ ] Se API key inválida → Mock funciona
- [ ] Console mostra warning explicando uso de mock

---

## 🎉 Resumo

### ✅ Implementado

- ✅ Servidor backend Express (porta 3002)
- ✅ Endpoint `/api/analysis/generate-ai`
- ✅ Integração com Claude API (Sonnet 4.5)
- ✅ Prompts otimizados para análise financeira
- ✅ Validação de JSON retornado
- ✅ Suporte a tipos: summary, actions, full
- ✅ Fallback automático para mock se API falhar
- ✅ Health check endpoint
- ✅ Logs detalhados
- ✅ Scripts de inicialização

### ✅ Como Testar

```bash
# 1. Fechar processos antigos:
taskkill /F /IM node.exe

# 2. Iniciar:
.\INICIAR-COM-IA.bat

# 3. Abrir:
http://localhost:3000

# 4. Testar:
- Login
- Análise Financeira
- Gerar Sumário/Ações/Slides
- Verificar console (F12) → Sem warning de mock
- Verificar logs do backend → "Chamando Claude API"

✅ Análises agora são geradas com DADOS REAIS!
```

---

**Data:** 31 de Janeiro de 2026
**Versão:** 3.0.0
**Status:** ✅ IA REAL IMPLEMENTADA

🤖 **Análises agora usam Claude AI com dados reais!**
