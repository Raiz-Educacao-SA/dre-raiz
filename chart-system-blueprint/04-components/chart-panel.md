# ChartPanel — Componente Unificado

> Componente principal que exibe graficos em modo interativo (Recharts) ou executivo (SVG/PNG).
> Codigo fonte completo: `_reference-code/components/ChartPanel.tsx`

---

## Conceito

Um unico componente que opera em 2 modos:
- **interactive**: Renderiza com Recharts (client-side)
- **executive**: Exibe SVG/PNG do CEO_GRAFICO (server-side)

O usuario comeca em modo interativo e pode "upgradar" clicando "Analise Executiva".

---

## Props

```typescript
interface ChartPanelProps {
  interactiveConfig: ChartConfig | null;       // Config Recharts
  executiveConfig: ChartExecutiveConfig | null; // Config do CEO_GRAFICO
  mode: 'interactive' | 'executive';
  isGeneratingInteractive: boolean;
  isGeneratingExecutive: boolean;
  error: string | null;
  onClose: () => void;
  onChangeType?: (type: ChartType) => void;
  onRequestExecutive?: () => void;
  onChangeExecutiveType?: (type: string) => void;
}
```

---

## Layout

```
┌──────────────────────────────────────────────────────┐
│ Header                                                │
│ 📊 Titulo do Grafico  [Executivo] [Compliance OK]     │
│              [Tipo ▼] [Analise Executiva] [⬇] [⛶] [×] │
├──────────────────────────────────────────────────────┤
│                                                       │
│                  AREA DO GRAFICO                      │
│                                                       │
│  Modo interativo: <ResponsiveContainer> + Recharts    │
│  Modo executivo: SVG sanitizado ou PNG base64          │
│                                                       │
├──────────────────────────────────────────────────────┤
│ Insights (modo executivo)                             │
│ 💡 Insights (3)                              [▼]     │
│   1. Crescimento de 50% entre Jan e Mar               │
│   2. Pico em Marco com 200 unidades                   │
│   3. Media do periodo: 150 unidades                   │
├──────────────────────────────────────────────────────┤
│ ⚠ Avisos de compliance (se houver)                    │
│   • Eixo Y nao inicia em zero                         │
└──────────────────────────────────────────────────────┘
```

---

## Renderizacao Recharts: renderChart(config, type)

5 tipos com renderizacao especifica:

### Bar Chart
```tsx
<BarChart data={data}>
  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
  <YAxis tick={{ fontSize: 12 }} />
  <Tooltip />
  <Legend />  {/* se showLegend */}
  {series.map(s => <Bar dataKey={s.dataKey} name={s.name} fill={s.color} />)}
</BarChart>
```

### Line Chart
```tsx
<LineChart data={data}>
  ...grid, axes, tooltip, legend...
  {series.map(s => (
    <Line type="monotone" dataKey={s.dataKey} stroke={s.color} strokeWidth={2} dot={{ fill: s.color }} />
  ))}
</LineChart>
```

### Area Chart
```tsx
<AreaChart data={data}>
  ...grid, axes, tooltip, legend...
  {series.map(s => (
    <Area type="monotone" dataKey={s.dataKey} stroke={s.color} fill={s.color} fillOpacity={0.3} />
  ))}
</AreaChart>
```

### Pie Chart
```tsx
<PieChart>
  <Pie data={data} dataKey={series[0].dataKey} nameKey="name" cx="50%" cy="50%" outerRadius={100}
    label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`}>
    {data.map((_, i) => <Cell fill={color[i]} />)}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

### Composed Chart
```tsx
<ComposedChart data={data}>
  ...grid, axes, tooltip, legend...
  {series.map((s, i) => {
    const type = s.type || ['bar','line','area'][i % 3];
    switch(type) {
      case 'line': return <Line .../>;
      case 'area': return <Area .../>;
      default:     return <Bar .../>;
    }
  })}
</ComposedChart>
```

---

## Download PNG (modo interativo)

```typescript
1. chartRef.current.querySelector('svg')
2. XMLSerializer().serializeToString(svg)
3. new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
4. URL.createObjectURL(svgBlob) → img.src
5. img.onload → canvas (2x scale) → ctx.drawImage → canvas.toDataURL('image/png')
6. <a download=filename href=dataURL>.click()
```

---

## Fullscreen

Toggle entre:
- Normal: `mx-lg mb-md` (dentro do chat)
- Fullscreen: `fixed inset-4 z-50 shadow-2xl` (overlay)

Tamanho do grafico ajusta:
- Normal: `h-[300px] md:h-[400px]`
- Fullscreen: `h-[calc(100vh-200px)]`

---

## Seletor de Tipo

### Modo interativo
- `<select>` com 5 opcoes: Barras, Linhas, Area, Pizza, Composto
- onChange → handleTypeChange(type) → setChartConfig({ ...config, type })

### Modo executivo
- Dropdown com recomendacoes do CEO_GRAFICO
- Cada opcao mostra tipo + score percentual
- onClick → onChangeExecutiveType(rec.type) → re-gera via API

---

## Sanitizacao

SVG do modo executivo e sanitizado com DOMPurify antes de renderizar:
```typescript
<div dangerouslySetInnerHTML={{ __html: sanitizeSvg(executiveConfig.svg) }} />
```

Insights com markdown bold sao sanitizados:
```typescript
phrase.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
→ sanitizeHighlight(html) // Permite apenas mark, strong, em, b, i, span
```
