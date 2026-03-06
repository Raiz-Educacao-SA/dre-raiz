# Chart Interpret Service — Interpretacao via IA

> Servico OBRIGATORIO para interpretacao de dados. TODOS os caminhos de geracao passam por aqui.
> Codigo fonte completo: `_reference-code/services/chart-interpret.service.ts`

---

## Funcao Principal

```typescript
async function interpretChartData(
  content: string,
  apiKey?: string
): Promise<InterpretationResult | null>
```

---

## System Prompt Completo

O prompt da IA segue 4 etapas obrigatorias:

### Etapa 1 - IDENTIFICACAO
- Ler texto inteiro
- Identificar TODOS os valores numericos
- Contar quantos numeros existem
- Listar cada numero com sua categoria

### Etapa 2 - ASSOCIACAO
- Para cada valor, determinar categoria associada
- Identificar se ha multiplas series (ex: receita E custo)
- Classificar tipo do valor (%, monetario, unidade)

### Etapa 3 - ESTRUTURACAO
- Montar JSON com extractedData
- Quantidade de entries = quantidade de categorias
- TODOS os numeros do texto representados

### Etapa 4 - VERIFICACAO
- data points == categorias da Etapa 1
- Cada valor numerico presente no extractedData
- Nenhum valor inventado

### Formato de saida esperado:
```json
{
  "chartType": "bar|line|pie|area|composed",
  "title": "titulo descritivo",
  "_analysis": {
    "numericValuesFound": 3,
    "categories": ["Jan", "Fev", "Mar"],
    "valuesListed": [100, 150, 200]
  },
  "extractedData": [
    { "name": "Jan", "value": 100 },
    { "name": "Fev", "value": 150 },
    { "name": "Mar", "value": 200 }
  ],
  "xAxisLabel": "Mes",
  "yAxisLabel": "Vendas",
  "insights": "observacao sobre os dados"
}
```

### Regras de tipo de grafico:
| Tipo | Quando usar |
|------|------------|
| pie | Proporcoes, %, distribuicao (max 8 itens) |
| bar | Comparacoes, rankings |
| line | Series temporais, tendencias |
| area | Volume acumulado no tempo |
| composed | Multiplas series com escalas diferentes |

### Regras de extracao:
1. NUNCA inventar valores — usar EXATAMENTE os numeros do texto
2. Converter % para numero (30% → 30)
3. Manter ordem original
4. Se sem numeros → retornar { "error": "INSUFFICIENT_DATA" }
5. NUNCA extrapolar ou interpolar

---

## Configuracao da chamada IA

```typescript
const response = await createCompletion([{ role: 'user', content }], {
  systemPrompt: CHART_INTERPRET_SYSTEM_PROMPT,
  temperature: 0.1,      // Quase deterministico
  maxTokens: 2048,
  apiKey,                 // Opcional — usa default se omitido
});
```

---

## Validacao: parseClaudeResponse(responseContent)

```
1. Extrai JSON do response (regex /\{[\s\S]*\}/)
2. Verifica se nao e erro (parsed.error)
3. Valida campos obrigatorios: chartType, title, extractedData
4. Valida chartType contra lista valida (fallback: 'bar')
5. Normaliza extractedData:
   - Aceita name/label/categoria como label
   - Converte strings numericas para number
   - Se nenhum valor numerico → dataPoint.value = 0
```

---

## Validacao: validateExtractedData(content, extractedData)

Verifica se valores extraidos realmente existem no texto original:

```
Para cada data point:
  Para cada valor numerico:
    Busca no texto: numStr, numInt, numStrBR (com virgula), num%
    Se nao encontrado → marca como warning

Se todos valores encontrados → data point valido
Se algum nao encontrado → data point removido (removed++)
```

Normaliza formato BR: `1.234,56` → `1234.56`

---

## Validacao: validateCompleteness(content, extractedData, analysis)

```
1. Conta numeros no texto (countNumbersInText)
   - Normaliza BR: 1.234,56 → 1234.56
   - Regex: /\d+(?:\.\d+)?/g
   - Deduplica

2. Conta numeros extraidos (soma de valores numericos em cada data point)

3. Score = extraidos / esperados

4. Complete se score >= 0.6 OU extraidos >= 2
```

---

## Retry Automatico

Se completude < 60% e texto tem > 2 numeros:

```typescript
const retryPrompt = `O texto contem ${numbersFound.length} valores: ${numbersFound.join(', ')}.
Extraia TODOS esses valores...
Texto original: ${content}`;

const retryResponse = await createCompletion(retryPrompt, {
  temperature: 0,  // Mais deterministico no retry
  maxTokens: 2048,
});
```

Se retry extraiu mais dados → usa resultado do retry.

---

## Fluxo Completo Resumido

```
content (texto bruto)
  │
  ├── createCompletion(content, { temp: 0.1 }) → JSON
  ├── parseClaudeResponse(response) → { parsed, extractedData }
  ├── validateCompleteness(content, data, analysis)
  │   └── Se incompleto → RETRY com prompt explicito
  ├── validateExtractedData(content, finalData) → remove inventados
  │
  └── Retorna InterpretationResult com _validation e _completeness
```
