# ChartGeneratorService — Parsing e Geracao (Client-side)

> Servico responsavel por converter dados brutos em ChartConfig para renderizacao com Recharts.
> Codigo fonte completo: `_reference-code/services/chart-generator.service.ts`

---

## Responsabilidades

1. **Parse de dados** — Aceita CSV, JSON, key-value, lista simples
2. **Deteccao de series** — Identifica colunas numericas automaticamente
3. **Deteccao de tipo** — Escolhe bar/line/pie/area/composed baseado nos dados
4. **Geracao de config** — Produz ChartConfig pronto para Recharts

---

## Metodo Principal: generateChart(request)

```typescript
generateChart(request: ChartGenerationRequest): ChartGenerationResult
```

### Fluxo:
```
1. Valida rawData nao vazio
2. parseData(rawData) → ChartDataPoint[]
3. detectSeries(data) → ChartSeries[]
4. detectChartType(data, series) → ChartType
5. Monta ChartConfig
6. Retorna { success: true, config }
```

---

## Parsing de Dados: parseData(rawData)

### Ordem de tentativa:
1. **JSON** — Se comeca com `[` ou `{`
2. **CSV** — Se contem `,`, `\t`, ou `;`
3. **Key-value** — Se contem `:` ou `=`
4. **Lista simples** — Uma entrada por linha com numero

### JSON
```
Input: [{"name":"Jan","value":100},{"name":"Fev","value":150}]
→ normalizeJsonArray(): converte para ChartDataPoint[]
→ Aceita campos: name/label/categoria/category como label
→ Converte strings numericas para number
```

### CSV
```
Input:
mes,valor
Jan,100
Fev,150

→ Detecta delimitador: \t > ; > ,
→ Primeira linha = headers
→ Demais linhas = dados
→ Valores numericos convertidos automaticamente
```

### Key-value
```
Input:
Jan: 100
Fev: 150
Mar: 200

→ Detecta delimitador: : ou =
→ Nome = parte antes, valor = parte depois
→ Resultado: [{ name: "Jan", value: 100 }, ...]
```

### Lista simples
```
Input:
Cafe 150
Cha 80
Suco 120

→ Regex: /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/
→ Converte , para . em decimais
→ Resultado: [{ name: "Cafe", value: 150 }, ...]
```

---

## Deteccao de Series: detectSeries(data)

```
1. Pega primeiro data point
2. Filtra keys que NAO sao 'name' e cujo valor e number
3. Para cada key, cria ChartSeries com:
   - dataKey: nome da key
   - name: formatSeriesName(key) → camelCase/snake_case para Title Case
   - color: DEFAULT_COLORS[index % 8]
```

### Cores padrão:
```
#3b82f6 (Blue), #10b981 (Green), #f59e0b (Amber), #ef4444 (Red),
#8b5cf6 (Purple), #ec4899 (Pink), #06b6d4 (Cyan), #84cc16 (Lime)
```

---

## Deteccao de Tipo: detectChartType(data, series)

```
Regra                              → Tipo
1 serie + ≤8 items                 → pie
>10 items                          → line
1 serie OU ≤6 items                → bar
>2 series                          → composed
Default                            → bar
```

---

## Metodo auxiliar: extractDataFromText(text)

Extrai blocos de dados de texto de conversa:
```
1. Percorre linhas procurando padroes de dados
2. Detecta code blocks (```) como delimitadores
3. Identifica linhas com numeros + delimitadores
4. Limpa bullet points (-, *, •)
5. Retorna string com dados ou null se < 2 linhas
```

---

## Singleton

```typescript
let chartGeneratorService: ChartGeneratorService | null = null;

function getChartGeneratorService(): ChartGeneratorService {
  if (!chartGeneratorService) {
    chartGeneratorService = new ChartGeneratorService();
  }
  return chartGeneratorService;
}
```
