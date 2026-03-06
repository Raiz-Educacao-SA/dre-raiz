# Paleta de Cores

> Cores centralizadas para graficos. Usar em TODA renderizacao de graficos.
> Codigo fonte completo: `_reference-code/utils/chart-colors.ts`

---

## CHART_COLORS_HEX (para canvas/SVG/chart libraries)

| Index | Hex | Nome | Uso |
|-------|-----|------|-----|
| 0 | `#F08700` | Orange (accent) | Serie primaria |
| 1 | `#3B82F6` | Blue (info) | Serie secundaria |
| 2 | `#10B981` | Emerald (success) | Serie terciaria |
| 3 | `#F59E0B` | Amber (warning) | Serie 4 |
| 4 | `#EF4444` | Red (error) | Serie 5 |
| 5 | `#8B5CF6` | Violet | Serie 6 |
| 6 | `#EC4899` | Pink | Serie 7 |
| 7 | `#06B6D4` | Cyan | Serie 8 |
| 8 | `#84CC16` | Lime | Serie 9 |
| 9 | `#14B8A6` | Teal | Serie 10 |

---

## CHART_COLORS (CSS variables — para DOM)

```css
var(--qi-accent)       /* #F08700 */
var(--qi-info-fg)      /* #3B82F6 */
var(--qi-success-fg)   /* #10B981 */
var(--qi-warning-fg)   /* #F59E0B */
var(--qi-error-fg)     /* #EF4444 */
#8B5CF6                /* violet (sem CSS var) */
#EC4899                /* pink (sem CSS var) */
#06B6D4                /* cyan (sem CSS var) */
#84CC16                /* lime (sem CSS var) */
#14B8A6                /* teal (sem CSS var) */
```

---

## QI_COLORS (ECharts builder)

```
#3b82f6, #10b981, #f59e0b, #ef4444,
#8b5cf6, #ec4899, #06b6d4, #84cc16
```

Nota: QI_COLORS comeca com Blue, nao Orange (diferente de CHART_COLORS_HEX).

---

## DEFAULT_COLORS (ChartGeneratorService)

```
#3b82f6, #10b981, #f59e0b, #ef4444,
#8b5cf6, #ec4899, #06b6d4, #84cc16
```

Mesma sequencia do QI_COLORS.

---

## Cores Especiais

| Nome | Hex | Uso |
|------|-----|-----|
| HubSpot Brand | `#FF7A59` | Graficos de dados HubSpot |
| Google Blue | `#4285F4` | Integracao Google |
| Google Green | `#34A853` | Integracao Google |
| Google Yellow | `#FBBC05` | Integracao Google |
| Google Red | `#EA4335` | Integracao Google |

---

## Regra de Aplicacao

```
Para cada serie no grafico:
  cor = palette[index % palette.length]
```

Se `styleGuide.colorPalette` fornecido, usa cores do style guide na ordem:
1. primary
2. secondary
3. accent
4. neutral

Se `options.colors` fornecido explicitamente, sobrescreve tudo.
