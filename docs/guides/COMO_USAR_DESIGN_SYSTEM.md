# Como Usar o Design System da Raiz Educação

Este guia explica como aplicar o Design System da Raiz Educação no projeto DRE.

## 📁 Arquivos Criados

1. **`theme.ts`** - Tokens de design completos (cores, tipografia, espaçamento, etc.)
2. **`index.css`** - Variáveis CSS globais e classes utilitárias
3. **`DESIGN_SYSTEM.md`** - Documentação completa do sistema

## 🎨 Principais Mudanças

### Cores Atualizadas

| Antes | Depois | Uso |
|-------|--------|-----|
| #F44C00 (laranja mais avermelhado) | #F08700 (laranja oficial Raiz) | Cor primária - botões, CTAs, destaques |
| #1B75BB (azul) | #7AC5BF (turquesa) | Cor secundária - navegação, elementos secundários |
| - | #F9FAFB | Background padrão (gray-50) |

### Estrutura de Cores

```typescript
// Cores Primárias (Laranja)
colors.primary.500 = '#F08700'  // Principal
colors.primary.50  = '#FFF4E6'  // Fundos suaves
colors.primary.600 = '#CC7300'  // Hover

// Cores Secundárias (Turquesa)
colors.secondary.500 = '#7AC5BF'  // Principal
colors.secondary.50  = '#F0FFFE'  // Fundos suaves
colors.secondary.600 = '#5FA39E'  // Hover
```

## 🔧 3 Formas de Usar o Design System

### 1. Usando Variáveis CSS (Recomendado para novos componentes)

```tsx
// Exemplo: Botão com variáveis CSS
<button
  style={{
    backgroundColor: 'var(--color-primary-500)',
    color: 'var(--color-white)',
    padding: 'var(--spacing-3) var(--spacing-6)',
    borderRadius: 'var(--radius-default)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'var(--transition-all)',
    border: 'none',
    fontWeight: 'var(--font-semibold)',
    fontSize: 'var(--text-md)',
    cursor: 'pointer'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-primary-md)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
  }}
>
  Salvar
</button>
```

### 2. Usando Classes CSS Utilitárias

```tsx
// Exemplo: Botão com classes utilitárias
<button className="btn-primary">
  Salvar
</button>

// Exemplo: Card
<div className="card">
  <h3>Título do Card</h3>
  <p>Conteúdo do card</p>
</div>

// Exemplo: Badge
<span className="badge badge-success">Aprovado</span>
<span className="badge badge-error">Erro</span>
<span className="badge badge-warning">Atenção</span>
```

### 3. Usando Tokens TypeScript (Para lógica no código)

```tsx
import theme from './theme';

const MyComponent = () => {
  return (
    <div
      style={{
        backgroundColor: theme.colors.primary[500],
        padding: theme.spacing[4],
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.boxShadow.md,
      }}
    >
      Conteúdo
    </div>
  );
};
```

## 📦 Componentes Reutilizáveis Prontos

### Classes CSS Disponíveis

#### Botões
```tsx
<button className="btn-primary">Botão Primário</button>
<button className="btn-secondary">Botão Secundário</button>
```

#### Cards
```tsx
<div className="card">
  <h3>Título</h3>
  <p>Conteúdo</p>
</div>
```

#### Badges
```tsx
<span className="badge">Padrão</span>
<span className="badge badge-success">Sucesso</span>
<span className="badge badge-error">Erro</span>
<span className="badge badge-warning">Aviso</span>
<span className="badge badge-info">Info</span>
```

#### Inputs
```tsx
<input type="text" className="input" placeholder="Digite aqui..." />
```

#### Cores Utilitárias
```tsx
<div className="bg-primary text-white">Background primário</div>
<div className="bg-secondary text-white">Background secundário</div>
<div className="text-primary">Texto primário</div>
<div className="border-primary">Borda primária</div>
```

#### Sombras
```tsx
<div className="shadow-sm">Sombra pequena</div>
<div className="shadow-md">Sombra média</div>
<div className="shadow-lg">Sombra grande</div>
<div className="shadow-primary">Sombra laranja</div>
<div className="shadow-secondary">Sombra turquesa</div>
```

#### Animações
```tsx
<div className="animate-fadeIn">Fade in</div>
<div className="animate-slideIn">Slide in</div>
<div className="animate-bounce">Bounce</div>
<div className="animate-spin">Spin (loading)</div>
<div className="animate-pulse">Pulse</div>
```

## 🎯 Exemplos Práticos

### Exemplo 1: Botão com Ícone

```tsx
import { Save } from 'lucide-react';

<button
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    backgroundColor: 'var(--color-primary-500)',
    color: 'var(--color-white)',
    padding: 'var(--spacing-3) var(--spacing-6)',
    borderRadius: 'var(--radius-default)',
    border: 'none',
    fontWeight: 'var(--font-semibold)',
    fontSize: 'var(--text-md)',
    cursor: 'pointer',
    transition: 'var(--transition-all)',
  }}
>
  <Save size={16} />
  Salvar Alterações
</button>
```

### Exemplo 2: Card com Hover

```tsx
<div
  style={{
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-gray-200)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-4)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'var(--transition-all)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
  }}
>
  <h3 style={{ color: 'var(--color-gray-800)', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
    Total de Receitas
  </h3>
  <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-md)', marginTop: 'var(--spacing-2)' }}>
    R$ 1.234.567,89
  </p>
</div>
```

### Exemplo 3: Modal

```tsx
{showModal && (
  <>
    {/* Overlay */}
    <div className="modal-overlay" onClick={() => setShowModal(false)} />

    {/* Modal Container */}
    <div className="modal-container">
      <div style={{ padding: 'var(--spacing-6)' }}>
        <h2 style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--font-bold)',
          color: 'var(--color-gray-800)',
          marginBottom: 'var(--spacing-4)'
        }}>
          Confirmar Ação
        </h2>
        <p style={{
          color: 'var(--color-gray-600)',
          marginBottom: 'var(--spacing-6)'
        }}>
          Tem certeza que deseja continuar?
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  </>
)}
```

### Exemplo 4: Lista com Badge de Status

```tsx
<div className="card">
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--color-gray-800)' }}>
        Transação #1234
      </h4>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: 'var(--spacing-1)' }}>
        15/02/2026
      </p>
    </div>
    <span className="badge badge-success">Aprovado</span>
  </div>
</div>
```

### Exemplo 5: Input com Label e Erro

```tsx
<div style={{ marginBottom: 'var(--spacing-4)' }}>
  <label
    htmlFor="email"
    style={{
      display: 'block',
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--font-medium)',
      color: 'var(--color-gray-700)',
      marginBottom: 'var(--spacing-1)',
    }}
  >
    E-mail *
  </label>
  <input
    id="email"
    type="email"
    className="input"
    placeholder="seuemail@raizeducacao.com.br"
  />
  {error && (
    <p style={{
      fontSize: 'var(--text-sm)',
      color: 'var(--color-error-500)',
      marginTop: 'var(--spacing-1)',
    }}>
      {error}
    </p>
  )}
</div>
```

## 🎨 Paleta de Cores Completa

### Primárias (Laranja)
- 50: `#FFF4E6` - Fundos suaves
- 100: `#FFE8CC` - Badges, alertas
- 500: `#F08700` - **COR PRINCIPAL**
- 600: `#CC7300` - Hover
- 700: `#A35C00` - Active

### Secundárias (Turquesa)
- 50: `#F0FFFE` - Fundos suaves
- 100: `#E1FFFC` - Badges info
- 500: `#7AC5BF` - **COR SECUNDÁRIA**
- 600: `#5FA39E` - Hover
- 700: `#47817D` - Active

### Neutras (Grays)
- 50: `#F9FAFB` - Fundos de página
- 200: `#E5E7EB` - Bordas
- 400: `#9CA3AF` - Placeholders
- 600: `#374151` - Textos padrão
- 800: `#111827` - Headings

### Status
- **Sucesso**: `#10B981` (verde)
- **Erro**: `#EF4444` (vermelho)
- **Aviso**: `#F59E0B` (amarelo)
- **Info**: `#3B82F6` (azul)

## 📏 Espaçamento (4-point grid)

```typescript
spacing[1] = 4px    // Gaps mínimos
spacing[2] = 8px    // Padding botões pequenos
spacing[3] = 12px   // Padding padrão botões/badges
spacing[4] = 16px   // Padding cards, gaps
spacing[6] = 24px   // Margens entre seções
spacing[8] = 32px   // Padding de páginas
```

## 🔤 Tipografia

```typescript
fontSize.xs = 11px    // Badges, meta info
fontSize.sm = 12px    // Captions, timestamps
fontSize.md = 14px    // Corpo de texto padrão
fontSize.lg = 16px    // Subtítulos
fontSize.xl = 20px    // Títulos de seções
fontSize['2xl'] = 22px // Títulos cards (mobile)
fontSize['3xl'] = 28px // Títulos principais
```

## 🔲 Bordas

```typescript
borderRadius.sm = 4px     // Badges
borderRadius.default = 8px // Botões, cards, inputs
borderRadius.lg = 12px    // Cards principais
borderRadius.xl = 16px    // Containers grandes
borderRadius.full = 9999px // Avatares, pills
```

## 🌟 Sombras

```typescript
boxShadow.sm = '0 1px 3px rgba(0,0,0,0.1)'    // Cards padrão
boxShadow.md = '0 4px 12px rgba(0,0,0,0.15)'  // Hover
boxShadow.lg = '0 8px 24px rgba(0,0,0,0.2)'   // Modais
boxShadow.primaryMd = '0 4px 12px rgba(240,135,0,0.3)' // Hover laranja
```

## ⏱️ Transições

```typescript
transitions.duration.fast = '0.15s'   // Hover states
transitions.duration.normal = '0.2s'  // Padrão
transitions.duration.slow = '0.3s'    // Modais, sidebars
transitions.duration.slower = '0.6s'  // Barras de progresso
```

## 🚀 Próximos Passos

1. **Migração Gradual**: Comece migrando componentes novos primeiro
2. **Refatoração**: Aos poucos, refatore componentes antigos
3. **Consistência**: Use sempre as variáveis CSS em vez de valores hardcoded
4. **Documentação**: Adicione comentários ao criar novos componentes

## 📚 Recursos

- **Documentação Completa**: Ver `DESIGN_SYSTEM.md`
- **Tokens TypeScript**: Ver `theme.ts`
- **Variáveis CSS**: Ver `index.css`
- **Componente Exemplo**: Ver `components/DesignSystemExample.tsx` (a criar)

## 💡 Dicas

1. **Sempre use variáveis CSS** em vez de valores hardcoded
2. **Prefira classes utilitárias** para componentes simples
3. **Use tokens TypeScript** quando precisar de lógica/cálculos
4. **Mantenha consistência** nos espaçamentos (4-point grid)
5. **Teste em diferentes telas** (mobile, tablet, desktop)

## 🆘 Problemas Comuns

### As cores não aparecem

Certifique-se de que o `index.css` está sendo importado no arquivo principal:

```tsx
// Em index.tsx ou main.tsx
import './index.css';
```

### Variáveis CSS não funcionam

Verifique se está usando a sintaxe correta:

```tsx
// ✅ Correto
style={{ color: 'var(--color-primary-500)' }}

// ❌ Errado
style={{ color: 'var(color-primary-500)' }}  // Faltou --
```

### Hover não funciona

Use `onMouseEnter` e `onMouseLeave` para controlar estados de hover em inline styles:

```tsx
<div
  style={{ backgroundColor: 'var(--color-gray-100)' }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'}
>
  Hover me
</div>
```

---

**Última atualização**: 18/02/2026
**Versão**: 1.0
**Baseado em**: DESIGN_SYSTEM.md da Raiz Educação
