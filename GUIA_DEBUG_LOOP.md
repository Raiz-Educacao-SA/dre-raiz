# 🔍 Guia para Diagnosticar Loop no DRE Gerencial

## Logs Adicionados

Adicionamos logs críticos no código para rastrear exatamente o que está causando o loop:

### 1. **🔥 COMPONENTE RENDERIZADO** (a cada render)
- Mostra quantas vezes o componente renderizou
- Timestamp de cada render

### 2. **🚀 MOUNT** (quando componente monta)
- Mostra quantas vezes o componente montou
- Dispara o fetch inicial

### 3. **💥 UNMOUNT** (quando componente desmonta)
- Mostra quantas vezes o componente desmontou
- Se estiver desmontando/remontando repetidamente, é aqui que veremos

### 4. **🚀🚀🚀 fetchDREData() CHAMADO**
- Mostra cada vez que a busca de dados é disparada
- Com timestamp e contador

---

## Como Testar

### Passo 1: Abrir o Console do Navegador
1. Abra o navegador
2. Acesse: http://localhost:5179
3. Pressione **F12** para abrir DevTools
4. Vá para a aba **Console**

### Passo 2: Acessar DRE Gerencial
1. Faça login se necessário
2. Clique na guia **"DRE Gerencial"** ou **"DRE"**

### Passo 3: Observar os Logs
Aguarde 30-60 segundos e observe o padrão:

#### ✅ Comportamento Normal (SEM LOOP):
```
🔥 COMPONENTE RENDERIZADO (renderCount: 1)
🚀 MOUNT (Mount #1)
🚀🚀🚀 fetchDREData() CHAMADO! (Call #1)
```

#### ⚠️ Comportamento com LOOP:
```
🔥 COMPONENTE RENDERIZADO (renderCount: 1)
🚀 MOUNT (Mount #1)
🚀🚀🚀 fetchDREData() CHAMADO! (Call #1)
[aguarda alguns segundos]
🚀🚀🚀 fetchDREData() CHAMADO! (Call #2)  ← LOOP!
[aguarda alguns segundos]
🚀🚀🚀 fetchDREData() CHAMADO! (Call #3)  ← LOOP!
```

#### ⚠️ Componente Remontando (possível causa do loop):
```
🔥 COMPONENTE RENDERIZADO (renderCount: 1)
🚀 MOUNT (Mount #1)
💥 UNMOUNT (Unmount #1)  ← Desmontou!
🔥 COMPONENTE RENDERIZADO (renderCount: 2)
🚀 MOUNT (Mount #2)  ← Montou de novo!
```

---

## O Que Procurar

### Cenário A: Loop em fetchDREData SEM remontagem
- `fetchDREData()` chamado múltiplas vezes
- Mas `MOUNT` só acontece 1x
- **Causa provável:** Algum useEffect ou callback disparando repetidamente

### Cenário B: Componente remontando
- `MOUNT` e `UNMOUNT` acontecendo múltiplas vezes
- **Causa provável:** Componente pai (App.tsx) está forçando remontagem

### Cenário C: Re-renders infinitos
- `COMPONENTE RENDERIZADO` aumentando rapidamente (100+)
- **Causa provável:** Estado mudando infinitamente

---

## Próximos Passos

Após observar o padrão no console, copie e cole os logs aqui para analisarmos juntos.

**Exemplo do que copiar:**
```
🔥 COMPONENTE RENDERIZADO - renderCount: 1, timestamp: 2026-02-19T15:30:00.000Z
🚀 MOUNT - Mount #1, timestamp: 2026-02-19T15:30:00.100Z
🚀🚀🚀 fetchDREData() CHAMADO! - Call #1, timestamp: 2026-02-19T15:30:00.150Z
[aguarda]
🚀🚀🚀 fetchDREData() CHAMADO! - Call #2, timestamp: 2026-02-19T15:30:05.200Z
```

Com esses logs, conseguiremos identificar:
1. **O que** está causando o loop
2. **Quando** acontece (intervalo entre chamadas)
3. **Onde** está o problema (render, mount, ou estado)
