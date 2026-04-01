# 🚀 Teste Rápido - Fase 2 (Optimistic Updates)

## ⚡ Teste em 3 Minutos

### 1. Iniciar o App
```bash
npm run dev
```

### 2. Verificar Badge no Header

Logo ao iniciar, você verá um **badge no header** (ao lado das permissões):

✅ **Se mostrar:**
- "Carregando..." (azul com spinner) → Normal, dados carregando
- Depois "Offline (Fase 3)" (cinza) → **PERFEITO!** Isso é esperado

❌ **Se NÃO aparecer:**
- Verifique se TransactionsSyncUI foi importado no App.tsx

---

### 3. Testar Optimistic Update (⭐ PRINCIPAL)

**Passo a passo:**

1. **Navegar** para "Lançamentos"
2. **Fazer busca** com algum filtro (ex: Janeiro 2025)
3. **Clicar em editar** em qualquer transação
4. **Mudar o valor** (ex: de R$ 500 para R$ 1.000)
5. **Salvar**

**✅ Resultado Esperado:**

- Valor muda **INSTANTANEAMENTE** na tabela (não espera)
- Badge muda para "Sincronizando..." com spinner azul
- Após ~1 segundo: badge volta para "Sincronizado" (verde)

**⚡ Isso é OPTIMISTIC UPDATE funcionando!**

---

### 4. Testar Rollback (Desconectado)

**Passo a passo:**

1. **Desconectar WiFi** (ou desativar rede)
2. **Editar transação** e mudar valor
3. **Salvar**

**✅ Resultado Esperado:**

- Valor muda instantaneamente
- Badge mostra "Sincronizando..." por ~5s
- Depois: **valor VOLTA ao original** (rollback!)
- Badge mostra "1 operação pendente" (laranja)
- Console mostra: "🔄 Executando rollback"

**4a. Reconectar WiFi:**
- Após 1s: operação executada automaticamente
- Badge volta para "Sincronizado"

**⚡ Isso é ROLLBACK automático + RETRY funcionando!**

---

### 5. Testar Conflito (Avançado - Opcional)

**Passo a passo:**

1. **Abrir app em duas abas** diferentes
2. **Aba 1:** Editar transação X, mudar para R$ 1.000, **salvar**
3. **Aba 2:** Editar MESMA transação X, mudar para R$ 2.000, **salvar**

**✅ Resultado Esperado (Aba 2):**

- **ConflictModal aparece** automaticamente!
- Mostra **diff lado-a-lado**:
  - Esquerda: Sua versão (R$ 2.000)
  - Direita: Versão servidor (R$ 1.000)
- Campos conflitantes em **vermelho**
- Badge mostra "1 conflito detectado" (amarelo)

**Escolher:**
- "Manter Minha Versão" → R$ 2.000 vence
- "Usar Versão do Servidor" → R$ 1.000 vence

**⚡ Isso é CONFLICT DETECTION funcionando!**

---

## 📊 Checklist Rápido

Marque conforme testa:

```
[ ] App inicia sem erros
[ ] Badge aparece no header
[ ] Badge inicial: "Carregando..." → "Offline (Fase 3)"
[ ] Navegar para Lançamentos funciona
[ ] Fazer busca funciona
[ ] Editar transação: valor muda INSTANTANEAMENTE
[ ] Badge mostra "Sincronizando..." durante operação
[ ] Badge volta para "Sincronizado" após sucesso
[ ] Desconectar WiFi: rollback funciona
[ ] Badge mostra "1 operação pendente"
[ ] Reconectar WiFi: retry automático funciona
[ ] (Opcional) ConflictModal aparece em conflitos
```

---

## 🎯 Estados do Badge

| Badge | Ícone | Cor | Significa |
|-------|-------|-----|-----------|
| Carregando... | 🔄 | Azul | Dados iniciais carregando |
| Sincronizando... | 🔄 | Azul | Operação em andamento |
| Sincronizado | ✅ | Verde | Tudo OK |
| Offline (Fase 3) | 📡 | Cinza | Realtime desconectado (normal) |
| 1 operação pendente | ⏰ | Laranja | Retry aguardando |
| 1 conflito detectado | ⚠️ | Amarelo | Conflito requer atenção |
| Erro de Sincronização | ❌ | Vermelho | Erro crítico |

---

## 🐛 Problemas Comuns

### Badge não aparece
**Causa:** Import faltando
**Solução:** Verificar se App.tsx tem:
```typescript
import { TransactionsSyncUI } from './src/components/TransactionsSyncUI';
// E no render:
<TransactionsSyncUI />
```

### Valor não muda instantaneamente
**Causa:** Optimistic update não implementado
**Solução:** Verificar se TransactionsContext foi atualizado com Fase 2

### ConflictModal não aparece
**Causa:** updated_at não está sendo comparado
**Solução:** Verificar se trigger SQL existe no banco

### Rollback não funciona
**Causa:** Backup de estado não armazenado
**Solução:** Verificar logs - deve mostrar "🔄 Executando rollback"

---

## 📝 Logs no Console

**Abrir DevTools (F12) → Console**

### Logs Esperados (Sucesso):

```
✏️ TransactionsContext: Atualizando transação (optimistic) abc123
✅ SyncManager: Operação UPDATE concluída com sucesso
✅ TransactionsContext: Transação atualizada com sucesso (optimistic)
```

### Logs Esperados (Rollback):

```
✏️ TransactionsContext: Atualizando transação (optimistic) abc123
❌ SyncManager: Erro na operação UPDATE: Network error
🔄 TransactionsContext: Executando rollback
⚠️ Operation failed (attempt 1/3): Network error
```

### Logs Esperados (Conflito):

```
✏️ TransactionsContext: Atualizando transação (optimistic) abc123
🔍 Verificando conflito para transação abc123
⚠️ Conflito detectado! Versões divergiram.
⚠️ SyncManager: Conflito detectado na transação abc123
```

---

## ✅ Se Tudo Passou

**Parabéns! Fase 2 está funcionando perfeitamente!** 🎉

### Próximos passos:

1. **Remover componente de teste da Fase 1** (se ainda estiver)
2. **Commit das mudanças:**
```bash
git add .
git commit -m "feat(sync): Fase 2 - Optimistic Updates e Conflict Detection

- Implementado optimistic updates (UI instantânea)
- Adicionado SyncManager para orquestração
- Criado ConflictModal com diff lado-a-lado
- Badge de status de sincronização
- Rollback automático em caso de erro
- Detecção de conflitos via updated_at

Próximo: Fase 3 - Realtime Subscription"
```

3. **Iniciar Fase 3** (quando pronto):
   - Diga "próxima fase" ou "implementar realtime"

---

## 🚀 Preview da Fase 3

**O que vem a seguir:**

- 📡 **Realtime Subscription** - Mudanças de outros usuários aparecem automaticamente
- 🔌 **Auto-reconexão** - Quando conexão cair, reconecta sozinho
- ⚡ **Throttling** - Máx 1 update/segundo (performance)
- 🎯 **Filtros Realtime** - Apenas dados relevantes
- 🔄 **Merge inteligente** - Evita sobrescrever edições locais

Badge mudará de "Offline (Fase 3)" para **"Conectado"** (verde)!

---

## 📚 Documentação Completa

- **Guia Detalhado:** `SINCRONIZACAO_FASE2_COMPLETA.md`
- **Memória Claude:** `.claude/memory/MEMORY.md`
- **Este Guia:** `TESTE_RAPIDO_FASE2.md`

---

**Build Status:** ✅ Passou sem erros (3146 módulos, ~13s)

**Pronto para testar?** Execute `npm run dev` e siga este guia!
