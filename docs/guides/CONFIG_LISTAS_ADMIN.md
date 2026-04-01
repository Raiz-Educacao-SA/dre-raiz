# 🎛️ CONFIGURAÇÃO DAS LISTAS - ADMIN PANEL

**Arquivo:** `components/AdminPanel.tsx`

---

## 📍 ONDE AS LISTAS SÃO GERADAS

### Função: `loadAvailableValues()` - Linha 74-92

```typescript
const loadAvailableValues = async () => {
  try {
    const transactions = await supabaseService.getAllTransactions();

    // 1️⃣ MARCA (CIA)
    const marcas = [...new Set(transactions.map(t => t.marca).filter(Boolean))].sort();

    // 2️⃣ FILIAL ✅ CORRIGIDO
    const filiais = [...new Set(transactions.map(t => t.nome_filial).filter(Boolean))].sort();

    // 3️⃣ CATEGORIA (Centro de Custo)
    const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort();

    // 4️⃣ TAG01
    const tag01Values = [...new Set(transactions.map(t => t.tag01).filter(Boolean))].sort();

    // 5️⃣ TAGS (Todas - tag01, tag02, tag03)
    const tags = [...new Set([
      ...transactions.map(t => t.tag01).filter(Boolean),
      ...transactions.map(t => t.tag02).filter(Boolean),
      ...transactions.map(t => t.tag03).filter(Boolean)
    ])].sort();

    // Salvar no estado
    setAvailableValues({ marcas, filiais, categories, tags, tag01Values });
  } catch (error) {
    console.error('Erro ao carregar valores disponíveis:', error);
  }
};
```

---

## 🎨 ONDE AS LISTAS SÃO EXIBIDAS

### Input com Datalist - Linha 1003-1024

```typescript
<input
  type="text"
  value={newPermissionValue}
  onChange={(e) => setNewPermissionValue(e.target.value)}
  placeholder="Digite o valor..."
  list={`suggestions-${newPermissionType}`}
/>

<datalist id={`suggestions-${newPermissionType}`}>
  {/* 1️⃣ CIA (MARCA) */}
  {newPermissionType === 'cia' && availableValues.marcas.map(m => (
    <option key={m} value={m} />
  ))}

  {/* 2️⃣ FILIAL */}
  {newPermissionType === 'filial' && availableValues.filiais.map(f => (
    <option key={f} value={f} />
  ))}

  {/* 3️⃣ CENTRO DE CUSTO */}
  {newPermissionType === 'centro_custo' && availableValues.categories.map(c => (
    <option key={c} value={c} />
  ))}

  {/* 4️⃣ TAG01 */}
  {newPermissionType === 'tag01' && availableValues.tag01Values.map(t => (
    <option key={t} value={t} />
  ))}
</datalist>
```

---

## 📊 MAPEAMENTO COMPLETO

| Tipo Selecionado | Campo Buscado | Variável do Estado | Exemplo de Valores |
|------------------|---------------|-------------------|-------------------|
| **CIA** | `t.marca` | `availableValues.marcas` | ["RAIZ", "SABER", "CLV"] |
| **Filial** | `t.nome_filial` ✅ | `availableValues.filiais` | ["CLV - Alfa", "RAIZ - Centro"] |
| **Centro de Custo** | `t.category` | `availableValues.categories` | ["Educação", "Admin"] |
| **TAG01** | `t.tag01` | `availableValues.tag01Values` | ["Marketing", "Vendas"] |

---

## 🔍 VERIFICAÇÃO - O QUE ESTÁ CORRETO

### ✅ Linha 78: MARCA
```typescript
const marcas = [...new Set(transactions.map(t => t.marca).filter(Boolean))].sort();
```
**Retorna:** `["RAIZ", "SABER", "CLV"]`

### ✅ Linha 79: FILIAL (CORRIGIDO)
```typescript
const filiais = [...new Set(transactions.map(t => t.nome_filial).filter(Boolean))].sort();
```
**Antes (ERRADO):** `t.filial` → `["01", "02", "03"]`
**Depois (CORRETO):** `t.nome_filial` → `["CLV - Alfa", "RAIZ - Centro", "SABER - Sul"]`

### ✅ Linha 81: TAG01
```typescript
const tag01Values = [...new Set(transactions.map(t => t.tag01).filter(Boolean))].sort();
```
**Retorna:** `["Marketing", "Vendas", "Operações"]`

---

## 🧪 COMO TESTAR

### 1. Recarregar o AdminPanel

Se o AdminPanel já estava aberto, precisa recarregar para buscar novos valores:

**No código - Linha 70-72:**
```typescript
useEffect(() => {
  loadUsers();
  loadAvailableValues();  // ← Carrega as listas
}, []);
```

Isso carrega apenas quando o componente monta. Para forçar reload:
1. Sair e entrar na guia Admin novamente
2. Ou adicionar um botão de "Recarregar"

### 2. Testar no Navegador

1. **Abrir Admin Panel**
2. **Selecionar um usuário**
3. **Adicionar Permissão:**
   - Selecionar tipo: **"Filial"**
   - Começar a digitar no campo "Digite o valor..."
   - ✅ **Deve aparecer:** `CLV - Alfa`, `RAIZ - Centro`, etc.
   - ❌ **NÃO deve aparecer:** `01`, `02`, `03`

4. **Adicionar Permissão TAG01:**
   - Selecionar tipo: **"Tag 01"**
   - Começar a digitar no campo "Digite o valor..."
   - ✅ **Deve aparecer:** `Marketing`, `Vendas`, `Operações`, etc.

---

## 🔄 FLUXO COMPLETO

```
1. AdminPanel carrega
   ↓
2. useEffect chama loadAvailableValues()
   ↓
3. getAllTransactions() busca todas as transações
   ↓
4. Extrai valores únicos:
   - marca → availableValues.marcas
   - nome_filial → availableValues.filiais ✅
   - tag01 → availableValues.tag01Values ✅
   ↓
5. Usuário seleciona tipo de permissão
   ↓
6. Datalist mostra opções correspondentes
   ↓
7. Usuário digita e seleciona valor
   ↓
8. Valor é salvo no banco
```

---

## 🐛 SE NÃO APARECER

### Possível Causa 1: Cache do Navegador
**Solução:**
```javascript
// No navegador, console (F12):
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Possível Causa 2: Transações sem nome_filial
**Verificar no banco:**
```sql
-- Ver se transações têm nome_filial
SELECT
  COUNT(*) as total,
  COUNT(nome_filial) as com_nome_filial,
  COUNT(*) - COUNT(nome_filial) as sem_nome_filial
FROM transactions;

-- Ver exemplos de nome_filial
SELECT DISTINCT nome_filial
FROM transactions
WHERE nome_filial IS NOT NULL
LIMIT 20;
```

### Possível Causa 3: AdminPanel não recarregou
**Solução:**
1. Sair da guia Admin
2. Ir para outra guia (Dashboard)
3. Voltar para Admin
4. Isso força o useEffect a rodar novamente

---

## 📝 CÓDIGO PARA COPIAR/COLAR

Se quiser adicionar um botão de "Recarregar Opções":

```typescript
// Adicionar próximo ao botão "Adicionar Permissão"
<button
  onClick={loadAvailableValues}
  className="text-xs text-blue-600 hover:text-blue-800 font-bold"
>
  🔄 Recarregar Opções
</button>
```

---

## ✅ STATUS ATUAL

| Item | Status | Linha |
|------|--------|-------|
| **Busca de MARCA** | ✅ Correto | 78 |
| **Busca de FILIAL** | ✅ Corrigido (`nome_filial`) | 79 |
| **Busca de TAG01** | ✅ Correto | 81 |
| **Datalist de MARCA** | ✅ Correto | 1012-1014 |
| **Datalist de FILIAL** | ✅ Correto | 1015-1017 |
| **Datalist de TAG01** | ✅ Correto | 1021-1023 |

---

## 🎯 RESULTADO ESPERADO

Quando você seleciona **"Filial"** e começa a digitar:

```
┌─────────────────────────────────┐
│ Tipo: [Filial ▼]                │
│                                  │
│ Digite o valor...                │
│ ┌─────────────────────────────┐ │
│ │ CLV - Alfa                  │ │ ← ✅ CORRETO
│ │ CLV - Beta                  │ │
│ │ RAIZ - Centro               │ │
│ │ RAIZ - Norte                │ │
│ │ SABER - Sul                 │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**NÃO deve aparecer:**
```
❌ 01
❌ 02
❌ 03
```

---

**A correção já foi aplicada!**
Se não estiver aparecendo, recarregue a guia Admin. ✅
