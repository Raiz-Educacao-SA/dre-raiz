# ⚡ Comandos Prontos - Copy & Paste

## 1️⃣ Iniciar o App

```bash
npm run dev
```

---

## 2️⃣ Adicionar Componente de Teste ao App.tsx

### Passo 1: Adicione este import no topo do App.tsx
```typescript
import { TransactionsContextTest } from './src/components/TransactionsContextTest';
```

### Passo 2: Adicione este componente após o header
Encontre esta linha no App.tsx (por volta da linha 563):
```typescript
<div className="px-6 pb-6">
```

Logo ANTES dela, adicione:
```typescript
<TransactionsContextTest />
```

**Exemplo completo:**
```typescript
        </div>

        <TransactionsContextTest />  {/* ← ADICIONE AQUI */}

        <div className="px-6 pb-6">
          {currentView === 'dashboard' && (
```

---

## 3️⃣ Debug no Console do Browser

Abra DevTools (F12) → Console → Cole e execute:

```javascript
// Verificar se Context está disponível
console.log('=== TESTE FASE 1 ===');
console.log('localStorage disponível:', !!window.localStorage);
console.log('Queue no storage:', localStorage.getItem('transactionsOperationQueue'));
console.log('React version:', React.version);
console.log('==================');
```

---

## 4️⃣ Verificar Estrutura de Arquivos

```bash
# Windows PowerShell
Test-Path "src/types/sync.ts"
Test-Path "src/services/OperationQueue.ts"
Test-Path "src/hooks/useTransactions.ts"
Test-Path "src/contexts/TransactionsContext.tsx"
Test-Path "src/components/TransactionsContextTest.tsx"

# Bash (Git Bash / WSL)
ls -la src/types/sync.ts
ls -la src/services/OperationQueue.ts
ls -la src/hooks/useTransactions.ts
ls -la src/contexts/TransactionsContext.tsx
ls -la src/components/TransactionsContextTest.tsx
```

---

## 5️⃣ Remover Componente de Teste (Após Confirmar)

### No App.tsx, remova:
```typescript
import { TransactionsContextTest } from './src/components/TransactionsContextTest';
```

E também remova:
```typescript
<TransactionsContextTest />
```

### Opcional: Deletar arquivo
```bash
# Windows
del "src\components\TransactionsContextTest.tsx"

# Bash
rm "src/components/TransactionsContextTest.tsx"
```

---

## 6️⃣ Commit (Após Teste Passar)

```bash
git add .
git commit -m "feat(sync): Fase 1 - Context API, OperationQueue e fundações

- Criado TransactionsContext com estado global
- Implementado OperationQueue com retry logic
- Adicionado campo updated_at ao Transaction type
- Criado hook useTransactions
- App.tsx integrado com TransactionsProvider
- Documentação completa da Fase 1

Próximo: Fase 2 - Optimistic Updates"
```

---

## 7️⃣ Build de Produção (Opcional)

```bash
npm run build
```

Resultado esperado:
```
✓ built in ~14s
```

---

## 🐛 Comandos de Debug

### Se houver erro de dependências:
```bash
npm install
```

### Se houver erro de cache:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Verificar tipos TypeScript:
```bash
npx tsc --noEmit
```

### Limpar build:
```bash
# Windows
rmdir /s /q dist

# Bash
rm -rf dist
```

---

## 📊 Ver Status no Console do Browser

Cole no Console (F12):

```javascript
// Ver estatísticas da OperationQueue
if (window.operationQueue) {
  console.table(window.operationQueue.getStats());
} else {
  console.log('operationQueue não está exposta no window (normal)');
}

// Ver localStorage
console.log('Queue Storage:', localStorage.getItem('transactionsOperationQueue'));

// Ver informações do React
console.log('React version:', React.version);
console.log('React DevTools:', !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
```

---

## 🎯 Checklist Visual

Marque conforme testa:

```
[ ] npm run dev executou sem erros
[ ] App abriu no navegador
[ ] Card de teste apareceu no canto inferior direito
[ ] Card mostra "✅ Context funcionando!"
[ ] Console não tem erros vermelhos
[ ] localStorage mostra "[]" ou null
[ ] Sidebar funciona
[ ] Dashboard carrega
[ ] Lançamentos abre
[ ] Filtros aparecem
```

---

## ✅ Se Tudo Passou

Execute:
```bash
echo "🎉 Fase 1 Completa!"
echo "Próximo: Fase 2 - Optimistic Updates"
```

Então:
1. Remova o componente de teste
2. Faça commit
3. Diga "próxima fase" ou "fase 2"

---

## ❌ Se Algo Falhou

Cole no console e envie o resultado:

```javascript
console.log({
  node_env: process.env.NODE_ENV,
  vite_mode: import.meta.env.MODE,
  base_url: import.meta.env.BASE_URL,
  has_supabase: !!import.meta.env.VITE_SUPABASE_URL,
  paths_exist: {
    note: 'Verifique manualmente se os arquivos existem'
  },
  localStorage_works: (() => {
    try {
      localStorage.setItem('test', '1');
      const works = localStorage.getItem('test') === '1';
      localStorage.removeItem('test');
      return works;
    } catch {
      return false;
    }
  })(),
  errors: window.__ERRORS__ || 'nenhum'
});
```

---

## 🚀 Iniciar Fase 2 (Quando Pronto)

Quando a Fase 1 estiver 100% testada e funcionando:

```bash
echo "Iniciando Fase 2: Optimistic Updates..."
```

E diga: **"próxima fase"** ou **"implementar fase 2"**
