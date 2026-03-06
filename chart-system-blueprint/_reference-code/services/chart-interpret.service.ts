/**
 * Chart Interpretation Service
 *
 * Shared service for AI-powered chart data interpretation.
 * All chart generation paths MUST go through this service before
 * calling ChartGeneratorService.
 *
 * Flow: Text → interpretChartData() → structured JSON → ChartGeneratorService
 */

import logger from '@/lib/observability/logger';
import { createCompletion } from '@/lib/ai';
import type { ChartType, ChartDataPoint } from './chart-generator.service';

// ============================================
// System Prompt
// ============================================

const CHART_INTERPRET_SYSTEM_PROMPT = `Voce e um especialista em visualizacao de dados e graficos.
Sua tarefa e analisar o pedido do usuario e extrair TODOS os dados numericos para gerar um grafico.

SIGA ESTAS ETAPAS OBRIGATORIAMENTE:

ETAPA 1 - IDENTIFICACAO: Leia o texto inteiro e identifique TODOS os valores numericos presentes.
  - Conte quantos numeros existem no texto.
  - Liste cada numero e a categoria/label a que ele pertence.

ETAPA 2 - ASSOCIACAO: Para cada valor numerico, determine:
  - Qual e a categoria (nome/label) associada
  - Se ha multiplas series (ex: receita E custo para cada mes)
  - Se o valor e percentual, monetario ou unidade

ETAPA 3 - ESTRUTURACAO: Monte o JSON com extractedData contendo TODOS os valores encontrados na Etapa 1.
  - A quantidade de entries no extractedData DEVE ser igual a quantidade de categorias identificadas.
  - TODOS os numeros do texto devem estar representados.

ETAPA 4 - VERIFICACAO: Antes de retornar, confirme:
  - Quantidade de data points == quantidade de categorias da Etapa 1
  - Cada valor numerico do texto original esta presente no extractedData
  - Nenhum valor foi inventado ou estimado

RETORNE APENAS JSON VALIDO, sem markdown, sem explicacoes.

O JSON deve ter a seguinte estrutura:
{
  "chartType": "bar" | "line" | "pie" | "area" | "composed",
  "title": "string - titulo descritivo do grafico",
  "_analysis": {
    "numericValuesFound": number,
    "categories": ["string - lista de todas as categorias encontradas"],
    "valuesListed": [number - lista de todos os valores numericos encontrados no texto]
  },
  "extractedData": [
    { "name": "string - categoria/label", "value": number },
    ...
  ],
  "xAxisLabel": "string opcional - label do eixo X",
  "yAxisLabel": "string opcional - label do eixo Y",
  "insights": "string opcional - observacao sobre os dados"
}

REGRAS PARA ESCOLHA DO TIPO DE GRAFICO:
1. "pie" - Para proporcoes, percentuais, distribuicao de partes de um todo (maximo 8 itens)
2. "bar" - Para comparacoes entre categorias, rankings
3. "line" - Para series temporais, tendencias ao longo do tempo, evolucao
4. "area" - Para mostrar volume acumulado ao longo do tempo
5. "composed" - Quando ha multiplas series com escalas diferentes

REGRAS PARA EXTRACAO DE DADOS:
1. Identifique TODOS os valores numericos no texto - nao pule nenhum.
2. Associe cada valor a sua categoria/label correspondente.
3. Se houver multiplas series, use campos adicionais alem de "value" (ex: "receita", "custo", "meta").
4. Converta percentuais para numeros (ex: "30%" -> 30).
5. Mantenha a ordem original dos dados quando relevante.
6. NUNCA invente, estime ou arredonde valores. Use EXATAMENTE os numeros que aparecem no texto.
7. Se um valor nao esta explicitamente escrito no texto, NAO o inclua no extractedData.
8. SOMENTE se o texto NAO contem NENHUM numero (zero valores numericos), retorne:
   { "error": "INSUFFICIENT_DATA", "message": "O texto nao contem dados numericos para gerar um grafico. Forneca os dados no formato: categoria valor." }
   Se houver pelo menos 2 valores numericos no texto, SEMPRE extraia-os e gere o JSON normalmente.
9. NUNCA extrapole, interpole ou deduza valores que nao estejam literalmente no texto.
10. Mantenha a precisao exata dos numeros (ex: 1234.56 deve permanecer 1234.56, nao 1235).
11. A quantidade de entries em extractedData DEVE corresponder a quantidade de categorias/labels distintas no texto.
12. Se o texto contem numeros sem categorias claras, use categorias genericas numeradas (Item 1, Item 2, etc.).

REGRAS PARA TITULO:
1. Crie um titulo descritivo baseado no contexto
2. Se o usuario especificou um titulo, use-o
3. Senao, infira do conteudo (ex: "Vendas por Mes", "Distribuicao de Clientes")

EXEMPLOS:

Input: "Faca um grafico de vendas: Jan 100, Fev 150, Mar 200"
Output: {
  "chartType": "bar",
  "title": "Vendas por Mes",
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
  "yAxisLabel": "Vendas"
}

Input: "Distribuicao: Marketing 35%, Vendas 25%, TI 40%"
Output: {
  "chartType": "pie",
  "title": "Distribuicao por Area",
  "_analysis": {
    "numericValuesFound": 3,
    "categories": ["Marketing", "Vendas", "TI"],
    "valuesListed": [35, 25, 40]
  },
  "extractedData": [
    { "name": "Marketing", "value": 35 },
    { "name": "Vendas", "value": 25 },
    { "name": "TI", "value": 40 }
  ]
}

Input: "Evolucao de usuarios ativos: 2020=1000, 2021=1500, 2022=2200, 2023=3100"
Output: {
  "chartType": "line",
  "title": "Evolucao de Usuarios Ativos",
  "_analysis": {
    "numericValuesFound": 4,
    "categories": ["2020", "2021", "2022", "2023"],
    "valuesListed": [1000, 1500, 2200, 3100]
  },
  "extractedData": [
    { "name": "2020", "value": 1000 },
    { "name": "2021", "value": 1500 },
    { "name": "2022", "value": 2200 },
    { "name": "2023", "value": 3100 }
  ],
  "xAxisLabel": "Ano",
  "yAxisLabel": "Usuarios Ativos",
  "insights": "Crescimento consistente de aproximadamente 50% ao ano"
}

Input: "Em janeiro nossa receita foi de 500 mil e o custo foi 200 mil. Em fevereiro a receita subiu para 600 mil com custo de 250 mil. Marco fechou com receita de 750 mil e custo de 300 mil."
Output: {
  "chartType": "composed",
  "title": "Receita vs Custo por Mes",
  "_analysis": {
    "numericValuesFound": 6,
    "categories": ["Janeiro", "Fevereiro", "Marco"],
    "valuesListed": [500, 200, 600, 250, 750, 300]
  },
  "extractedData": [
    { "name": "Janeiro", "receita": 500, "custo": 200 },
    { "name": "Fevereiro", "receita": 600, "custo": 250 },
    { "name": "Marco", "receita": 750, "custo": 300 }
  ],
  "xAxisLabel": "Mes",
  "yAxisLabel": "Valor (mil)",
  "insights": "Receita crescente com margem estavel"
}

Input: "O relatorio mostra que a equipe de SP atendeu 450 chamados, RJ atendeu 380, MG fez 290, BA completou 210 e RS fechou com 175 atendimentos no trimestre."
Output: {
  "chartType": "bar",
  "title": "Chamados Atendidos por Equipe Regional",
  "_analysis": {
    "numericValuesFound": 5,
    "categories": ["SP", "RJ", "MG", "BA", "RS"],
    "valuesListed": [450, 380, 290, 210, 175]
  },
  "extractedData": [
    { "name": "SP", "value": 450 },
    { "name": "RJ", "value": 380 },
    { "name": "MG", "value": 290 },
    { "name": "BA", "value": 210 },
    { "name": "RS", "value": 175 }
  ],
  "xAxisLabel": "Regiao",
  "yAxisLabel": "Chamados Atendidos"
}

VALIDACAO CRITICA:
- O campo _analysis.numericValuesFound DEVE ser igual a quantidade de numeros distintos no texto.
- O campo _analysis.valuesListed DEVE conter TODOS os numeros encontrados no texto.
- extractedData DEVE conter entries para TODAS as categorias identificadas em _analysis.categories.
- Cada "value" no extractedData DEVE corresponder a um numero que aparece em _analysis.valuesListed.
- NAO adicione data points com valores inventados.
- Retorne INSUFFICIENT_DATA SOMENTE se nao ha NENHUM numero no texto (zero valores).
- Na duvida, extraia os dados que existem - e melhor um grafico completo com todos os dados do texto.`;

// ============================================
// Types
// ============================================

export interface InterpretationResult {
  chartType: ChartType;
  title: string;
  extractedData: ChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  insights?: string;
  _validation?: {
    totalExtracted: number;
    validated: number;
    removed: number;
    warnings: string[];
  };
  _completeness?: {
    score: number;
    numbersInText: number;
    numbersExtracted: number;
    complete: boolean;
    retried: boolean;
  };
}

// ============================================
// Internal Functions
// ============================================

/**
 * Parse Claude's response JSON and extract structured data points.
 */
function parseClaudeResponse(
  responseContent: string
): { parsed: Record<string, unknown>; extractedData: ChartDataPoint[] } | null {
  const jsonMatch = responseContent.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn('[Chart Interpret] Claude response did not contain valid JSON');
    return null;
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Check if Claude returned an error
  if (parsed.error) {
    console.warn('[Chart Interpret] Claude returned error:', parsed.error, parsed.message);
    return null;
  }

  // Validate basic structure
  if (!parsed.chartType || !parsed.title || !Array.isArray(parsed.extractedData)) {
    console.warn('[Chart Interpret] Claude response missing required fields');
    return null;
  }

  // Validate chartType
  const validChartTypes: ChartType[] = ['bar', 'line', 'pie', 'area', 'composed'];
  if (!validChartTypes.includes(parsed.chartType)) {
    parsed.chartType = 'bar';
  }

  // Ensure extractedData has correct structure
  const extractedData: ChartDataPoint[] = parsed.extractedData.map(
    (item: Record<string, unknown>, index: number) => {
      const dataPoint: ChartDataPoint = {
        name: String(item.name || item.label || item.categoria || `Item ${index + 1}`),
      };

      for (const [key, value] of Object.entries(item)) {
        if (key !== 'name' && key !== 'label' && key !== 'categoria') {
          if (typeof value === 'number') {
            dataPoint[key] = value;
          } else if (typeof value === 'string') {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              dataPoint[key] = num;
            }
          }
        }
      }

      if (!Object.keys(dataPoint).some((k) => k !== 'name' && typeof dataPoint[k] === 'number')) {
        dataPoint.value = 0;
      }

      return dataPoint;
    }
  );

  return { parsed, extractedData };
}

/**
 * Validate extracted data against original content.
 * Ensures numeric values in extractedData actually appear in the source text.
 */
function validateExtractedData(
  content: string,
  extractedData: ChartDataPoint[]
): { valid: ChartDataPoint[]; removed: number; warnings: string[] } {
  const warnings: string[] = [];
  const valid: ChartDataPoint[] = [];
  let removed = 0;

  // Normalize content for numeric matching (handle BR format: 1.234,56)
  const contentNormalized = content
    .replace(/(\d)\.(\d{3})/g, '$1$2') // Remove thousand separator dots
    .replace(/,/g, '.'); // Convert decimal comma to dot

  for (const point of extractedData) {
    let allValuesFound = true;

    for (const [key, value] of Object.entries(point)) {
      if (key === 'name' || typeof value !== 'number') continue;

      const numStr = String(value);
      const numInt = String(Math.round(value));
      const numStrBR = numStr.replace('.', ',');

      const found =
        content.includes(numStr) ||
        content.includes(numStrBR) ||
        content.includes(numInt) ||
        contentNormalized.includes(numStr) ||
        // Handle percentage: "30%" -> 30
        content.includes(`${numStr}%`) ||
        content.includes(`${numInt}%`);

      if (!found) {
        warnings.push(`Valor ${value} para "${point.name}" nao encontrado no texto original`);
        allValuesFound = false;
      }
    }

    if (allValuesFound) {
      valid.push(point);
    } else {
      removed++;
    }
  }

  return { valid, removed, warnings };
}

/**
 * Count distinct numeric values in a text string.
 * Handles integers, decimals, BR format (1.234,56), and percentages.
 */
function countNumbersInText(content: string): number[] {
  // Normalize BR format: 1.234,56 → 1234.56
  const normalized = content
    .replace(/(\d)\.(\d{3})(?=[,.\s\D]|$)/g, '$1$2') // Remove thousand separator dots
    .replace(/(\d),(\d)/g, '$1.$2'); // Convert decimal comma to dot

  const matches = normalized.match(/\d+(?:\.\d+)?/g);
  if (!matches) return [];

  // Convert to numbers and deduplicate
  const numbers = matches.map((m) => parseFloat(m));
  return Array.from(new Set(numbers));
}

/**
 * Validate completeness of extracted data vs numbers in source text.
 * Checks if the extraction captured all relevant numeric values.
 */
function validateCompleteness(
  content: string,
  extractedData: ChartDataPoint[],
  analysis?: { numericValuesFound?: number; valuesListed?: number[] }
): {
  complete: boolean;
  score: number;
  missing: number;
  numbersInText: number;
  numbersExtracted: number;
} {
  const numbersInText = countNumbersInText(content);
  const numbersExtracted = extractedData.reduce((count, point) => {
    const numericKeys = Object.keys(point).filter(
      (k) => k !== 'name' && typeof point[k] === 'number'
    );
    return count + numericKeys.length;
  }, 0);

  // Use the AI's own analysis if available for a more accurate count
  const expectedCount = analysis?.numericValuesFound || numbersInText.length;

  // Score: how many of the expected values were extracted
  const score = expectedCount > 0 ? numbersExtracted / expectedCount : 1;
  const missing = Math.max(0, expectedCount - numbersExtracted);
  const complete = score >= 0.6 || numbersExtracted >= 2;

  return {
    complete,
    score: Math.round(score * 100) / 100,
    missing,
    numbersInText: numbersInText.length,
    numbersExtracted,
  };
}

// ============================================
// Main Export
// ============================================

/**
 * Interpret chart data using Claude AI.
 *
 * This is the MANDATORY entry point for all chart generation paths.
 * It ensures data is properly interpreted by AI before being passed
 * to ChartGeneratorService.
 *
 * @param content - Raw text/data to interpret
 * @returns Structured interpretation result, or null if interpretation failed
 */
export async function interpretChartData(
  content: string,
  apiKey?: string
): Promise<InterpretationResult | null> {
  try {
    if (!content || content.trim().length === 0) {
      console.warn('[Chart Interpret] Empty content provided');
      return null;
    }

    // First pass: interpret with step-by-step prompt
    const response = await createCompletion([{ role: 'user', content }], {
      systemPrompt: CHART_INTERPRET_SYSTEM_PROMPT,
      temperature: 0.1,
      maxTokens: 2048,
      apiKey,
    });

    const result = parseClaudeResponse(response.content);
    if (!result) return null;

    const { parsed, extractedData } = result;

    // Extract _analysis from Claude's response
    const analysis = parsed._analysis as
      | { numericValuesFound?: number; valuesListed?: number[] }
      | undefined;

    // Validate completeness
    const completeness = validateCompleteness(content, extractedData, analysis);
    logger.info('[Chart Interpret] Completeness:', completeness);

    let finalExtractedData = extractedData;
    let retried = false;

    // If extraction is significantly incomplete, retry with explicit guidance
    if (!completeness.complete && completeness.score < 0.6 && completeness.numbersInText > 2) {
      console.warn('[Chart Interpret] Incomplete extraction, retrying with explicit prompt');
      retried = true;

      const numbersFound = countNumbersInText(content);
      const retryPrompt = `O texto a seguir contem ${numbersFound.length} valores numericos: ${numbersFound.join(', ')}.
Extraia TODOS esses valores e associe cada um a sua categoria/label correspondente.
Voce DEVE retornar exatamente ${numbersFound.length} valores no extractedData (ou no minimo um data point para cada categoria distinta).

Texto original:
${content}`;

      const retryResponse = await createCompletion([{ role: 'user', content: retryPrompt }], {
        systemPrompt: CHART_INTERPRET_SYSTEM_PROMPT,
        temperature: 0,
        maxTokens: 2048,
        apiKey,
      });

      const retryResult = parseClaudeResponse(retryResponse.content);
      if (retryResult && retryResult.extractedData.length > extractedData.length) {
        finalExtractedData = retryResult.extractedData;
        // Update parsed fields from retry if better
        if (retryResult.parsed.chartType) parsed.chartType = retryResult.parsed.chartType;
        if (retryResult.parsed.title) parsed.title = retryResult.parsed.title;
        if (retryResult.parsed.xAxisLabel) parsed.xAxisLabel = retryResult.parsed.xAxisLabel;
        if (retryResult.parsed.yAxisLabel) parsed.yAxisLabel = retryResult.parsed.yAxisLabel;
      }
    }

    // Validate extracted values against original content
    const validation = validateExtractedData(content, finalExtractedData);

    if (validation.warnings.length > 0) {
      console.warn('[Chart Interpret] Validation warnings:', validation.warnings);
    }

    // Use validated data if available; fallback to all data if none pass
    const finalData = validation.valid.length > 0 ? validation.valid : finalExtractedData;

    // Recalculate completeness with final data
    const finalCompleteness = validateCompleteness(content, finalData, analysis);

    return {
      chartType: parsed.chartType as ChartType,
      title: parsed.title as string,
      extractedData: finalData,
      xAxisLabel: parsed.xAxisLabel as string | undefined,
      yAxisLabel: parsed.yAxisLabel as string | undefined,
      insights: parsed.insights as string | undefined,
      _validation: {
        totalExtracted: finalExtractedData.length,
        validated: validation.valid.length,
        removed: validation.removed,
        warnings: validation.warnings,
      },
      _completeness: {
        score: finalCompleteness.score,
        numbersInText: finalCompleteness.numbersInText,
        numbersExtracted: finalCompleteness.numbersExtracted,
        complete: finalCompleteness.complete,
        retried,
      },
    };
  } catch (error) {
    console.error('[Chart Interpret] Error:', error);
    // Re-throw with context so callers can surface actionable error messages
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha na interpretacao via IA: ${msg}`);
  }
}
