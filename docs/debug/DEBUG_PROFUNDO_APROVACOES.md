# Debug Profundo - Sistema de Aprovações

## 🎯 Objetivo

Adicionar logs extremamente detalhados para identificar EXATAMENTE onde está falhando o fluxo de ajustes e rateios.

---

## 📝 Modificações Realizadas

### 1. **services/supabaseService.ts**

#### Função `addManualChange()` - Logs adicionados:
- 🟦 Log no INÍCIO da função com todos os dados recebidos
- 🟦 Log APÓS conversão `manualChangeToDb()`
- 🟦 Log ao converter `original_transaction` de string para objeto
- 🟦 Log dos campos após limpeza (`cleanedChange`)
- 🟦 Log ANTES do INSERT no Supabase
- 🟦 Log da RESPOSTA do Supabase (error, data, hasError, hasData)
- ❌ Log DETALHADO de erro (código, mensagem, dados enviados)
- ✅ Log de SUCESSO
- ❌ Log de EXCEPTION com stack trace

#### Função `getAllManualChanges()` - Logs adicionados:
- 🟦 Log no INÍCIO da função
- 🟦 Log da resposta do Supabase
- ❌ Log detalhado de erro
- ✅ Log dos dados brutos (primeiros 2 registros)
- ✅ Log dos dados convertidos (primeiros 2 registros)

---

### 2. **App.tsx**

#### Função `handleRequestChange()` - Logs adicionados:
- 🔵 Log no INÍCIO da função
- 🔵 Log dos dados recebidos (transactionId, type, description, justification, newValues)
- ❌ Log se transação original NÃO for encontrada (com total de transações e primeiros 5 IDs)
- ✅ Log da transação original encontrada
- 📦 Log do ManualChange criado (com todos os campos)
- 🔄 Log ANTES de chamar `addManualChange`
- 🔄 Log do RETORNO de `addManualChange`
- 🔄 Log ANTES de chamar `updateTransaction`
- 🔄 Log do RETORNO de `updateTransaction`
- 🔍 Log verificando se ambos retornaram true
- ✅ Log ao atualizar estados locais (com contadores)
- ❌ Log de FALHA com motivo específico

#### useEffect de carregamento - Logs adicionados:
- 🔵 Log ao iniciar carregamento
- ✅ Log dos dados carregados (total, pendentes, aprovados, rejeitados, primeiros 5)
- ❌ Log de erro

---

### 3. **components/TransactionsView.tsx**

#### Função `handleSubmitAjuste()` - Logs adicionados:
- 🟢 Log no INÍCIO da função
- ❌ Log se `editingTransaction` é NULL
- ❌ Log se `justification` está vazia
- ✅ Log de validações OK (com transactionId e justification)
- 📦 Log dos dados do change (resumo)
- 🔄 Log ANTES de chamar `requestChange`
- ✅ Log após chamar `requestChange`

#### Função `handleSubmitRateio()` - Logs adicionados:
- 🟢 Log no INÍCIO da função
- ❌ Log se `rateioTransaction` é NULL
- ❌ Log se rateio não está totalmente alocado
- ❌ Log se `rateioJustification` está vazia
- ✅ Log de validações OK (com transactionId, justification, partsCount)
- 📦 Log das novas transações criadas (count, ids, amounts)
- 📦 Log dos dados do change (resumo)
- 🔄 Log ANTES de chamar `requestChange`
- ✅ Log após chamar `requestChange`

---

## 🧪 Como Testar

### Passo 1: Abrir Console do Navegador
1. Pressione `F12` (ou `Ctrl+Shift+I`)
2. Vá para a aba "Console"
3. Limpe o console (`Ctrl+L` ou botão de lixeira)

### Passo 2: Recarregar Aplicação
1. Pressione `F5` ou `Ctrl+R`
2. **OBSERVE:** Deve aparecer logs de carregamento:
   ```
   🔵 Carregando manual changes do Supabase...
   🟦 getAllManualChanges INICIADO
   🟦 Resposta do Supabase: { error: null, hasData: true, dataLength: X }
   ✅ Manual changes carregados: { total: X, pendentes: X, ... }
   ```

### Passo 3: Testar Ajuste Simples
1. Vá para a guia "Lançamentos"
2. Clique no ícone de edição (✏️) em qualquer transação
3. Preencha o campo "Justificativa" (exemplo: "Teste de debug")
4. Clique em "ENVIAR P/ APROVAÇÃO"

### Passo 4: Copiar TODOS os Logs
**No console, você deverá ver esta sequência completa:**

```
🟢 handleSubmitAjuste INICIADO
✅ Validações OK { transactionId: "...", justification: "...", ... }
📦 Dados do change (ajuste): { ... }
🔄 Chamando requestChange...
✅ requestChange chamado, fechando modal

🔵 handleRequestChange INICIADO
🔵 Dados recebidos: { transactionId: "...", type: "MULTI", ... }
✅ Transação original encontrada: { id: "...", ... }
📦 ManualChange criado: { id: "...", type: "MULTI", status: "Pendente", ... }
🔄 Chamando addManualChange...

🟦 addManualChange INICIADO: { id: "...", type: "MULTI", ... }
🟦 Após manualChangeToDb: { id: "...", justification: "...", ... }
🟦 Campos após limpeza: [ "id", "type", "transaction_id", "justification", ... ]
🟦 Dados limpos (resumo): { ... }
🔄 Iniciando INSERT no Supabase...
🟦 Resposta do Supabase: { error: null, data: [...], hasError: false, hasData: true }
✅ Manual change salvo com SUCESSO!
✅ Dados retornados: [...]

🔄 addManualChange retornou: true
🔄 Chamando updateTransaction...
🔄 updateTransaction retornou: true
🔍 Verificando sucesso: { successChange: true, successUpdate: true, ambosTrue: true }
✅ AMBOS SUCESSO - Atualizando estados locais
✅ manualChanges antes: X
✅ manualChanges depois: X+1
✅ Estados locais atualizados com SUCESSO!
```

### Passo 5: Verificar Comportamento Esperado

**SE TUDO FUNCIONAR:**
- ✅ Console mostra TODOS os logs acima
- ✅ Modal de ajuste fecha
- ✅ Transação fica com status "Pendente"
- ✅ Ao ir para guia "Aprovações", a solicitação aparece

**SE HOUVER ERRO:**
- ❌ Console mostra log de erro (vermelho) em algum ponto
- ❌ Pode aparecer:
  - `❌ ERRO ao salvar manual change`
  - `❌ Error fetching manual changes`
  - `❌ Transação original NÃO ENCONTRADA`
  - `❌ FALHA ao salvar`

---

## 📊 Pontos de Falha Possíveis

### 1. **addManualChange retorna false**
**Sintoma:** Log mostra `🔄 addManualChange retornou: false`

**Causas possíveis:**
- Erro no INSERT do Supabase
- Campo obrigatório faltando
- Problema de conversão de dados

**O que observar:**
- Log `🟦 Resposta do Supabase` → campo `error` não é null
- Log `❌ ERRO ao salvar manual change` → detalhes do erro
- Log `❌ Dados enviados (completo)` → JSON com problema

### 2. **updateTransaction retorna false**
**Sintoma:** Log mostra `🔄 updateTransaction retornou: false`

**Causas possíveis:**
- Erro ao atualizar status da transação
- Transação não existe mais
- Problema de permissão no Supabase

**O que observar:**
- Logs da função `updateTransaction` (se houver)

### 3. **Transação original não encontrada**
**Sintoma:** Log mostra `❌ Transação original NÃO ENCONTRADA`

**Causas possíveis:**
- ID da transação está incorreto
- Transação foi deletada
- Array `transactions` está vazio

**O que observar:**
- Log `❌ Total de transações disponíveis`
- Log `❌ Primeiras 5 IDs`

### 4. **getAllManualChanges retorna vazio**
**Sintoma:** Ao recarregar, log mostra `total: 0`

**Causas possíveis:**
- Tabela `manual_changes` está vazia
- Erro de conversão (`dbToManualChange`)
- Problema de permissão no Supabase

**O que observar:**
- Log `🟦 Resposta do Supabase` → `dataLength`
- Log `✅ Dados brutos` → se tem dados
- Log `✅ Dados convertidos` → se conversão funcionou

---

## 🔍 O Que Fazer Agora

### Passo 1: Execute o teste de ajuste simples
1. Abra o console (F12)
2. Limpe o console
3. Faça um ajuste simples
4. **COPIE TODOS OS LOGS** (Ctrl+A no console, Ctrl+C)

### Passo 2: Analise os logs
1. Procure por logs vermelhos (❌)
2. Identifique onde o fluxo parou
3. Veja qual foi o último log com sucesso (✅)

### Passo 3: Reporte os logs
**Envie:**
- TODOS os logs do console (completo, não resumido)
- Descreva o que você fez exatamente
- Descreva o que esperava acontecer
- Descreva o que realmente aconteceu

---

## 📌 Exemplo de Log de ERRO

Se você ver algo assim:

```
🟦 addManualChange INICIADO: { ... }
🟦 Após manualChangeToDb: { ... }
🟦 Campos após limpeza: [...]
🟦 Dados limpos (resumo): { ... }
🔄 Iniciando INSERT no Supabase...
🟦 Resposta do Supabase: { error: {...}, hasError: true, hasData: false }
❌ ERRO ao salvar manual change: { code: "...", message: "..." }
❌ Código do erro: "23502"
❌ Mensagem do erro: "null value in column 'justification' violates not-null constraint"
❌ Detalhes do erro: { ... }
❌ Dados enviados (completo): { ... }

🔄 addManualChange retornou: false
🔄 Chamando updateTransaction...
🔄 updateTransaction retornou: true
🔍 Verificando sucesso: { successChange: false, successUpdate: true, ambosTrue: false }
❌ FALHA ao salvar: { successChange: false, successUpdate: true, motivoFalha: "addManualChange falhou" }
```

**Neste exemplo:**
- ❌ O erro está no INSERT do Supabase
- ❌ Campo `justification` está NULL
- ❌ Mesmo com log mostrando `justification: "..."`, o Supabase recebeu NULL

**Solução:**
- Verificar conversão `manualChangeToDb()`
- Verificar se campo está sendo removido na limpeza
- Verificar tipo do campo no banco

---

## ✅ Build Status

```bash
npm run build
```

**Resultado:**
- ✅ 0 erros TypeScript
- ✅ 3153 módulos transformados
- ✅ Build concluído em ~26s

---

## 🎯 Próximos Passos

1. ✅ **Logs adicionados** (COMPLETO)
2. ⏳ **Teste pelo usuário** (AGUARDANDO)
3. ⏳ **Análise dos logs** (AGUARDANDO)
4. ⏳ **Identificação da causa raiz** (AGUARDANDO)
5. ⏳ **Correção do problema** (AGUARDANDO)

---

## 📝 Observações Importantes

### Sobre os Logs
- **🟦 Azul:** Logs de fluxo normal do supabaseService
- **🔵 Azul escuro:** Logs de fluxo normal do App.tsx
- **🟢 Verde:** Logs de fluxo normal dos componentes
- **✅ Verde check:** Logs de sucesso
- **❌ Vermelho:** Logs de erro
- **🔄 Seta circular:** Logs de chamadas de função
- **📦 Caixa:** Logs de dados estruturados

### Sobre a Justification
O campo `justification` é **obrigatório** (NOT NULL) no banco.
Se ele não chegar ao banco, o INSERT vai falhar com erro `23502`.

### Sobre os Estados Locais
Se `addManualChange` falhar, os estados locais NÃO são atualizados.
Isso significa que mesmo que a UI feche o modal, a aprovação não vai aparecer na guia "Aprovações".

---

**Data:** 05/02/2026
**Status:** Logs adicionados, aguardando teste
**Build:** ✅ Sem erros TypeScript
