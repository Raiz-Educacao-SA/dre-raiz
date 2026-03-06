# ChartAgentService — Orquestrador Content Studio

> Orquestra a geracao de graficos para o Content Studio, combinando IA + CEO_GRAFICO.
> Codigo fonte completo: `_reference-code/services/chart-agent.service.ts`

---

## Responsabilidade

Ponte entre o Content Studio e os servicos de grafico existentes:
1. Interpreta dados via IA (chart-interpret.service)
2. Aplica style guide (cores, fontes)
3. Gera grafico via CEO_GRAFICO (Python)

---

## Metodo Principal: generate(input)

```typescript
async generate(input: ChartAgentInput): Promise<ChartAgentResult>
```

### Fluxo:
```
1. interpretChartData(sourceContext) → InterpretationResult
   - Se falha de credito/config → erro amigavel
   - Se null → erro "dados sem valores numericos"
   - Se < 2 data points → erro "dados insuficientes"

2. Determina chartType: input.chartType || interpretation.chartType || 'bar'

3. buildChartOptions(options, styleGuide) → ChartOptions
   - Aplica show_values, show_grid, figsize, dpi
   - Aplica cores do styleGuide (primary, secondary, accent, neutral)
   - Aplica font_family do styleGuide
   - Override com colors de options se fornecido

4. ceoGenerateChart(extractedData, { chartType, title, chartOptions })
   - Se falha → retorna erro com interpretation (fallback client-side)

5. Retorna ChartAgentResult com svg, pngBase64, insights, interpretation
```

---

## Metodo: getRecommendations(sourceContext)

```typescript
async getRecommendations(sourceContext: string): Promise<{
  success: boolean;
  recommendations?: ChartRecommendation[];
  interpretation?: InterpretationResult;
  error?: string;
}>
```

### Fluxo:
```
1. interpretChartData(sourceContext) → dados estruturados
2. profileData(extractedData) → recomendacoes do CEO_GRAFICO
3. Retorna recomendacoes com scores
```

---

## buildChartOptions — Logica de Merge

```
Prioridade (menor para maior):
1. Defaults (nenhum)
2. StyleGuide colors (primary → secondary → accent → neutral)
3. StyleGuide font_family
4. Input options (show_values, show_grid, figsize, dpi)
5. Input options.colors (override final de cores)
```

---

## Tratamento de Erros

| Cenario | Mensagem para usuario |
|---------|----------------------|
| Erro de credito/billing/quota | "Servico temporariamente indisponivel" |
| API key nao configurada | "Servico temporariamente indisponivel" |
| IA retorna null | "Verifique se o texto contem valores numericos" |
| < 2 data points | "Sao necessarios pelo menos 2 pontos de dados" |
| CEO_GRAFICO falha | Retorna interpretation para fallback client-side |
| Erro generico | error.message |
