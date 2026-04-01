# 🧪 Como Testar a Fase 1 - Guia Prático

## 1️⃣ Teste Básico - Verificar se o App Inicia

### Passo 1: Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

### Passo 2: Abrir o navegador
Acesse: `http://localhost:5173` (ou a porta que aparecer no terminal)

### ✅ Resultado Esperado:
- App carrega sem erros
- Não há erros no console do navegador (F12)
- Sidebar e dashboard aparecem normalmente

### ❌ Se der erro:
- Verifique se todas as dependências estão instaladas: `npm install`
- Verifique se há erros de TypeScript no terminal

---

## 2️⃣ Teste do Context - Verificar se TransactionsProvider está ativo

### Passo 1: Abrir DevTools (F12)

### Passo 2: No Console, executar:
```javascript
// Verificar se o React DevTools está instalado
// Instale: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi
```

### Passo 3: Na aba "Components" do React DevTools:
Procure por: `TransactionsProvider`

### ✅ Resultado Esperado:
```
App
└── TransactionsProvider
    └── div
        └── Sidebar
        └── main
            └── ... (outros componentes)
```

---

## 3️⃣ Teste da OperationQueue - Verificar localStorage

### Passo 1: Abrir DevTools (F12) → Aba "Console"

### Passo 2: Executar:
```javascript
localStorage.getItem('transactionsOperationQueue')
```

### ✅ Resultado Esperado:
- Primeira vez: `null` (fila vazia)
- Após operações: `"[]"` ou array com operações

### Passo 3: Verificar log no console:
Procure por:
```
📦 Loaded 0 operations from localStorage
```

---

## 4️⃣ Teste de Navegação - Verificar TransactionsView

### Passo 1: Clicar na aba "Lançamentos" no menu lateral

### ✅ Resultado Esperado:
- Página de lançamentos carrega normalmente
- Tabela aparece (vazia ou com dados)
- Filtros estão visíveis
- Botão "Buscar" está funcional

### ❌ Se der erro:
- Verifique o console para erros do TransactionsView
- TransactionsView ainda usa props (normal na Fase 1)

---

## 5️⃣ Teste do Hook useTransactions (Avançado)

### Criar arquivo de teste temporário:
**Arquivo:** `test-context.tsx` (na raiz do projeto)

```typescript
import React from 'react';
import { useTransactions } from './src/hooks/useTransactions';

export const TestContext: React.FC = () => {
  try {
    const context = useTransactions();

    return (
      <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px' }}>
        <h2>✅ TransactionsContext está funcionando!</h2>
        <pre>{JSON.stringify({
          transactionsCount: context.transactions.length,
          isLoading: context.isLoading,
          isSyncing: context.isSyncing,
          hasError: !!context.error,
          connectionStatus: context.connectionStatus,
          pendingOps: context.pendingOperations.length,
          conflicts: context.conflicts.length
        }, null, 2)}</pre>
      </div>
    );
  } catch (error) {
    return (
      <div style={{ padding: '20px', background: '#fee', margin: '20px' }}>
        <h2>❌ Erro ao acessar TransactionsContext</h2>
        <pre>{error.message}</pre>
      </div>
    );
  }
};
```

### Adicionar ao App.tsx (temporário):
```typescript
import { TestContext } from './test-context';

// Dentro do render, antes do switch de views:
<TestContext />
```

### ✅ Resultado Esperado:
```json
{
  "transactionsCount": 0,
  "isLoading": false,
  "isSyncing": false,
  "hasError": false,
  "connectionStatus": "disconnected",
  "pendingOps": 0,
  "conflicts": 0
}
```

---

## 6️⃣ Checklist de Verificação Completo

### Arquitetura
- [ ] Pasta `src/types/` existe
- [ ] Pasta `src/services/` existe
- [ ] Pasta `src/hooks/` existe
- [ ] Pasta `src/contexts/` existe

### Arquivos Criados
- [ ] `src/types/sync.ts` existe
- [ ] `src/services/OperationQueue.ts` existe
- [ ] `src/hooks/useTransactions.ts` existe
- [ ] `src/contexts/TransactionsContext.tsx` existe

### Modificações
- [ ] `types.ts` tem campo `updated_at: string`
- [ ] `services/supabaseService.ts` mapeou `updated_at`
- [ ] `App.tsx` tem `<TransactionsProvider>`

### Funcionalidade
- [ ] App inicia sem erros
- [ ] Console não mostra erros críticos
- [ ] TransactionsProvider aparece no React DevTools
- [ ] OperationQueue carrega do localStorage
- [ ] TransactionsView renderiza normalmente

---

## 🐛 Problemas Comuns e Soluções

### Erro: "Cannot find module './src/contexts/TransactionsContext'"
**Solução:** Verificar se o caminho de import está correto no App.tsx
```typescript
// Correto:
import { TransactionsProvider } from './src/contexts/TransactionsContext';
```

### Erro: "useTransactions must be used within a TransactionsProvider"
**Solução:** Componente está tentando usar o hook fora do Provider.
- Certifique-se que App.tsx está envolvido com `<TransactionsProvider>`

### Erro: "Property 'updated_at' does not exist on type 'Transaction'"
**Solução:** TypeScript cache desatualizado
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Aviso: localStorage não persiste
**Causa:** Normal - localStorage é limpo quando o browser fecha (modo privado)
**Solução:** Não é um problema, é comportamento esperado

---

## 📊 Logs Esperados no Console

Ao iniciar o app:
```
📦 Loaded 0 operations from localStorage
```

Ao navegar para Lançamentos:
```
🔍 TransactionsContext: Aplicando filtros { ... }
✅ TransactionsContext: N transações carregadas
```

Se houver operações na fila:
```
✅ Operation enqueued: UPDATE for transaction abc123
```

---

## ✅ Critérios de Sucesso da Fase 1

**Funcionalidade Básica:**
- [x] App inicia sem crashes
- [x] TransactionsProvider está montado
- [x] Hook useTransactions funciona
- [x] OperationQueue persiste no localStorage
- [x] TransactionsView continua funcionando

**Arquitetura:**
- [x] Estrutura src/ criada
- [x] Tipos TypeScript compilam
- [x] Context API funcional
- [x] Separation of concerns mantida

**Compatibilidade:**
- [x] Nenhuma funcionalidade quebrada
- [x] Props existentes ainda funcionam
- [x] Navegação entre views funciona

---

## 🚀 Se Tudo Passou - Próxima Etapa

Se todos os testes acima passaram, você está pronto para a **Fase 2: Optimistic Updates**!

### Fase 2 implementará:
1. SyncManager service
2. Optimistic updates no Context
3. Conflict detection no Supabase
4. Migração do TransactionsView para usar Context
5. Loading states visuais

**Tempo estimado:** 2-3 horas de desenvolvimento

---

## 📞 Debug Rápido

Se algo não funcionar, execute este comando no console:
```javascript
console.log({
  localStorage: !!window.localStorage,
  queueData: localStorage.getItem('transactionsOperationQueue'),
  reactVersion: React.version,
  hasProvider: !!document.querySelector('[data-testid="transactions-provider"]')
});
```

Envie o resultado para análise se precisar de ajuda.
