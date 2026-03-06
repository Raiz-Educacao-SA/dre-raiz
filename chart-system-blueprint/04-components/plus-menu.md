# Plus Menu — Sistema de Feature Toggles

> Entry point para ativacao de graficos no chat.
> Codigo fonte completo: `_reference-code/components/PlusMenu.tsx`

---

## Conceito

O Plus Menu e um dropdown que aparece no chat input. Cada feature e um **toggle independente**.
Quando `chartEnabled = true`, mensagens do usuario sao processadas para detectar dados de grafico.

---

## Interface de Toggle States

```typescript
interface PlusMenuToggleStates {
  chartEnabled: boolean;           // Toggle de grafico
  generateImageEnabled: boolean;
  agentEnabled: boolean;
  slidesEnabled: boolean;
  ocrEnabled: boolean;
  dataEnabled: boolean;
  nlpEnabled: boolean;
  infographicEnabled: boolean;
  hubspotEnabled: boolean;
  deepResearchEnabled: boolean;
  // ... mais toggles
}
```

Default: **todos desabilitados**.

---

## Permissoes

Cada feature requer permissao verificada via hook `usePermissions()`:

```typescript
const permissions = useMemo(() => ({
  chart: hasFullAccess || canUsePlusMenuFeature('chart'),
  // ... outros
}), [canUsePlusMenuFeature, hasFullAccess]);
```

- `hasFullAccess` = isSuperAdmin OU isAdmin prop
- `canUsePlusMenuFeature('chart')` = verifica plano/role do usuario

Se sem permissao, o toggle NAO aparece no menu.

---

## Layout

```
┌─────────────────────────────────────┐
│ ┌─────────────┬─────────────────┐   │
│ │ Geracao de  │ Modos de        │   │
│ │ Conteudo    │ Processamento   │   │
│ │             │                 │   │
│ │ □ Imagem    │ □ OCR           │   │
│ │ □ Browser   │ □ Data          │   │
│ │ □ Slides    │ □ NLP           │   │
│ │             │ □ Grafico  ←──────── Toggle de graficos
│ │ Ferramentas │ □ Infografico   │   │
│ │             │ □ HubSpot       │   │
│ │ > Templates │                 │   │
│ │ > Automacao │ ─── Avancado ── │   │
│ │ > Docs      │ □ Pesquisa      │   │
│ │ > Preview   │   Profunda      │   │
│ └─────────────┴─────────────────┘   │
│ ? Ajuda                             │
└─────────────────────────────────────┘
```

---

## Comportamento do Toggle

1. Usuario clica no toggle "Grafico"
2. `onToggleChange('chartEnabled')` → callback para o parent
3. Parent (ChatView) atualiza `plusMenuStates.chartEnabled`
4. Proxima mensagem enviada → verifica se `chartEnabled === true`
5. Se sim → processa mensagem para detectar dados e gerar grafico

---

## Aspectos de UI

### Toggle Component
```
┌────────────┐
│ ○          │  Desabilitado (bg cinza)
└────────────┘

┌────────────┐
│          ● │  Habilitado (bg accent)
└────────────┘
```

### ToggleItem ativo
- Background: accent-muted com borda accent
- Icone: cor interactive
- Toggle: cor interactive

### ToggleItem inativo
- Background: transparente
- Icone: cor text-secondary
- Toggle: cor bg-tertiary
