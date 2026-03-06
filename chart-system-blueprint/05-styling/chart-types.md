# Tipos de Graficos Suportados

---

## Tier 1 — Interativo (Recharts)

| Tipo | Label PT | Quando Usar | Auto-detect |
|------|----------|------------|-------------|
| `bar` | Barras | Comparacoes entre categorias, rankings | 1 serie OU ≤6 items |
| `line` | Linhas | Series temporais, tendencias, evolucao | >10 items |
| `area` | Area | Volume acumulado ao longo do tempo | Especificado pela IA |
| `pie` | Pizza | Proporcoes, %, distribuicao (max 8) | 1 serie + ≤8 items |
| `composed` | Composto | Mix de bar+line+area, multiplas escalas | >2 series |

---

## Tier 2 — Executivo (CEO_GRAFICO / Python)

| Tipo | Label PT | Quando Usar |
|------|----------|------------|
| `bar` | Barras | Comparacoes simples |
| `bar_chart` | Barras | Alias de bar |
| `line` | Linhas | Tendencias temporais |
| `pie` | Pizza | Distribuicao de partes |
| `area` | Area | Volume acumulado |
| `waterfall` | Cascata | Variacao entre valores (financeiro) |
| `scatter` | Dispersao | Correlacao entre 2 variaveis |
| `grouped_bar` | Barras Agrupadas | Multiplas series lado a lado |
| `stacked_bar` | Barras Empilhadas | Composicao de valores |
| `stacked100_bar` | Barras 100% | Composicao normalizada |
| `heatmap` | Mapa de Calor | Densidade em matriz |
| `combo` | Combinado | Mix de tipos |
| `bullet` | Bullet | Meta vs realizado |
| `infographic` | Infografico | Layout visual complexo |

---

## ECharts Builder (Fallback)

| Tipo | Builder Function | Notas |
|------|-----------------|-------|
| `bar` | buildBarOption | borderRadius [4,4,0,0] |
| `line` | buildLineOption | smooth: true |
| `pie` | buildPieOption | Donut 40%-70% |
| `area` | buildLineOption(withArea=true) | fillOpacity 0.15 |
| `waterfall` | buildWaterfallOption | Stack invisivel + visivel |
| `scatter` | buildScatterOption | symbolSize 12 |
| `grouped_bar` | buildBarOption (reutiliza) | Series side-by-side |
| `stacked_bar` | buildStackedBarOption | stack: 'total' |
| `heatmap` | buildHeatmapOption | visualMap gradiente |

---

## Regras de Auto-Deteccao (IA)

O system prompt da IA segue estas regras:

```
1. "pie" — Proporcoes, percentuais, distribuicao de partes de um todo (max 8)
2. "bar" — Comparacoes entre categorias, rankings
3. "line" — Series temporais, tendencias ao longo do tempo, evolucao
4. "area" — Volume acumulado ao longo do tempo
5. "composed" — Multiplas series com escalas diferentes
```

## Regras de Auto-Deteccao (ChartGeneratorService)

```
1 serie + ≤8 items                 → pie
>10 items                          → line
1 serie OU ≤6 items                → bar
>2 series                          → composed
Default                            → bar
```
