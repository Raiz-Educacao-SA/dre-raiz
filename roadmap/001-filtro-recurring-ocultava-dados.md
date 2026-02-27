# BUG #001 — Filtro de recorrência ocultava dados do Real (QI - Freguesia e outros)

**Data:** 2026-02-27
**Severidade:** Alta — dados reais desapareciam da DRE Gerencial
**Status:** Corrigido

## Sintoma

Transações da filial "QI - Freguesia" com cenário "Real" existiam no banco (confirmado via RPC `get_soma_tags` com `p_recurring=null`), mas NÃO apareciam na tela do DRE Gerencial.

Tag01s **invisíveis** com o filtro padrão:
- Receita De Mensalidade
- Integral
- Folha (Professores)
- Devoluções & Cancelamentos
- Adiant_Fornec
- Rateio Raiz
- Jurídico & Auditoria

## Causa Raiz

O filtro de recorrência no `SomaTagsView.tsx` tinha default `'Sim'`:

```tsx
// ANTES (bug) — linha 202 do SomaTagsView.tsx
const [recurring, setRecurring] = useState<'Sim' | 'Não' | null>('Sim');
```

Isso passava `p_recurring = 'Sim'` para o RPC `get_soma_tags`, que no SQL fazia:

```sql
AND (p_recurring IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
```

Qualquer transação com `recurring = 'Não'` era **excluída** da query. Como várias tag01s de "QI - Freguesia" (e possivelmente outras filiais) tinham `recurring = 'Não'`, elas desapareciam.

### Evidência numérica (QI - Freguesia, Real, 2026)
| Filtro | Rows | Tag01s distintas |
|--------|------|-----------------|
| `recurring = 'Sim'` | 427 | 11 |
| `recurring = null` (Todos) | 437 | 18 |

**7 tag01s inteiras ficavam invisíveis**, incluindo a maior delas: "Receita De Mensalidade".

## Correção

Mudou o default do estado `recurring` para `null` (equivale a "Todos"):

```tsx
// DEPOIS (corrigido)
const [recurring, setRecurring] = useState<'Sim' | 'Não' | null>(null);
```

E atualizou o `recurringRef` correspondente:

```tsx
const recurringRef = useRef<'Sim' | 'Não' | null>(null);
```

Quando `recurring = null`, o RPC recebe `p_recurring = null`, e a condição SQL `(p_recurring IS NULL OR ...)` retorna **todas as transações**, independente do campo `recurring`.

O usuário ainda pode filtrar manualmente clicando no toggle "Recorr" (Sim / Não / Todos).

## Arquivos Modificados
- `components/SomaTagsView.tsx` — linhas 202 e 247 (default de `'Sim'` para `null`)

## Como Validar
1. Abrir DRE Gerencial
2. Selecionar filial "QI - Freguesia" no filtro
3. Verificar que tag01s como "Receita De Mensalidade", "Integral", "Folha (Professores)" aparecem
4. Verificar que o toggle "Recorr" mostra "Todos" por padrão
5. Clicar "Sim" no toggle → confirmar que filtra corretamente
6. Clicar "Todos" → confirmar que volta a mostrar tudo

## Impacto
- **Todas as filiais** eram afetadas — qualquer transação com `recurring = 'Não'` ficava oculta
- "QI - Freguesia" era a mais impactada por ter muitas transações não-recorrentes
- O Dashboard também era afetado (carrega via `getSomaTags` sem filtro de recurring)
- A correção não altera nenhuma lógica SQL — apenas o valor padrão do frontend
