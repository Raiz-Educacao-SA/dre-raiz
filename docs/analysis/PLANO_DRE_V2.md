# 🚀 PLANO DE IMPLEMENTAÇÃO - DRE V2

**Status:** 🟡 Em Desenvolvimento
**Arquivo:** `components/DREViewV2.tsx`

---

## 📋 MUDANÇAS IMPLEMENTADAS

### ✅ 1. Estrutura Básica
- [x] Duplicar DREView.tsx → DREViewV2.tsx
- [x] Renomear componente para DREViewV2
- [x] Adicionar estado `presentationMode` (executive | detailed)

### 🟡 2. Sprint 1 - Quick Wins (EM ANDAMENTO)

#### 2.1 Palette de Cores Profissional
- [ ] Substituir `text-emerald-300` → `text-emerald-700`
- [ ] Substituir `text-rose-100` → `text-rose-600`
- [ ] Criar constante `COLOR_SCHEME` com palette corporativa
- [ ] Aplicar em todas as células de valores

#### 2.2 Breadcrumbs Melhorados
- [ ] Aumentar tamanho de 8px → 14px
- [ ] Adicionar ícones para cada nível
- [ ] Hover mostra preview dos valores
- [ ] Botão "Voltar ao Topo" fixo

#### 2.3 Separação Filtros/Ações
- [ ] Criar `<FilterBar>` separado de `<ActionBar>`
- [ ] Agrupar filtros por categoria visual
- [ ] Adicionar contador de filtros ativos (badge)

#### 2.4 Skeleton Loading
- [ ] Substituir spinner simples por skeleton
- [ ] Mostrar estrutura da tabela enquanto carrega

---

### 🟡 3. Sprint 2 - UX (PENDENTE)

#### 3.1 Modo Executivo com Cards
- [ ] Criar componente `<DRECard>` expansível
- [ ] Layout em grid 3 colunas
- [ ] Cards principais: Receita, Custos, EBITDA
- [ ] Mini-gráfico sparkline em cada card
- [ ] Expandir mostra sub-itens

#### 3.2 Toggle Executivo/Detalhado
- [ ] Adicionar botão toggle no topo
- [ ] Ícones: 📊 Executiva | 📋 Detalhada
- [ ] Salvar preferência em localStorage

#### 3.3 Help & Tooltips
- [ ] Adicionar "?" ao lado de cada filtro
- [ ] Tooltip explica o que é TAG0, TAG01, etc.
- [ ] Tutorial no primeiro acesso

#### 3.4 Atalhos de Teclado
- [ ] Ctrl+E → Exportar
- [ ] Ctrl+R → Atualizar
- [ ] Ctrl+L → Limpar filtros
- [ ] Esc → Voltar drill-down

---

## 🎨 CONSTANTES DE ESTILO (A CRIAR)

```typescript
// Palette Profissional V2
export const COLORS_V2 = {
  // Valores Positivos
  positive: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hover: 'hover:bg-emerald-100'
  },

  // Valores Negativos
  negative: {
    text: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    hover: 'hover:bg-rose-100'
  },

  // Neutro
  neutral: {
    text: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    hover: 'hover:bg-slate-100'
  },

  // Primário (ações)
  primary: {
    text: 'text-blue-700',
    bg: 'bg-blue-600',
    border: 'border-blue-500',
    hover: 'hover:bg-blue-700'
  }
};

// Tamanhos de Fonte V2
export const FONT_SIZES_V2 = {
  title: 'text-xl',        // 20px
  subtitle: 'text-base',   // 16px
  body: 'text-sm',         // 14px
  caption: 'text-xs',      // 12px
  micro: 'text-[10px]'     // 10px
};

// Breadcrumbs V2
export const BREADCRUMB_CONFIG = {
  fontSize: 'text-sm',     // 14px (antes: 8px)
  iconSize: 16,            // 16px
  gap: 'gap-2',
  padding: 'px-3 py-2',
  hoverBg: 'hover:bg-blue-50'
};
```

---

## 📦 COMPONENTES NOVOS (A CRIAR)

### DRECard.tsx
```typescript
interface DRECardProps {
  title: string;
  value: number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  sparklineData: number[];
  expanded: boolean;
  onExpand: () => void;
  children?: React.ReactNode;
}
```

### FilterBar.tsx
```typescript
interface FilterBarProps {
  sections: Array<{
    title: string;
    filters: React.ReactNode[];
  }>;
}
```

### ActionBar.tsx
```typescript
interface ActionBarProps {
  actions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant: 'primary' | 'secondary' | 'danger';
  }>;
}
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Agora:** Implementar Toggle Executivo/Detalhado no topo
2. **Depois:** Criar DRECard e modo executivo básico
3. **Depois:** Aplicar nova palette de cores
4. **Por último:** Melhorar breadcrumbs e adicionar help

---

## 🧪 COMO TESTAR

1. Abrir guia DRE Gerencial
2. Ver **toggle V2** no topo (se implementado)
3. **Modo Executivo:** Cards expansíveis com sparklines
4. **Modo Detalhado:** Tabela completa (igual V1 mas com cores melhores)
5. Comparar com V1 lado a lado

---

**Última Atualização:** 2026-02-13 22:00
