
import { Transaction, SchoolKPIs, IAInsight, AIChartResponse } from "../types";

// Vite proxy (dev) ou Vercel function (prod) — sempre URL relativa
const ANTHROPIC_API_URL = "/api/llm-proxy?action=anthropic";
const GROQ_API_URL      = "/api/llm-proxy?action=groq";

/** Verifica se o erro da Anthropic é por saldo insuficiente */
const isCreditError = (status: number, body: string): boolean =>
  status === 400 && body.includes('credit') ||
  status === 402 ||
  (status === 529); // overloaded

/** Chama o Groq como fallback — retorna texto no mesmo formato */
const callGroqFallback = async (
  system: string,
  userMsg: string,
  maxTokens: number,
  temperature: number
): Promise<string> => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      // Groq usa formato OpenAI: system vai dentro de messages
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userMsg },
      ],
      temperature,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error('Groq API error:', response.status, err);
    throw new Error(`Serviço de IA indisponível (${response.status})`);
  }
  const data = await response.json();
  // Groq retorna formato OpenAI: choices[0].message.content
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Resposta vazia do Groq');
  return text;
};

/**
 * getFinancialInsights generates 4 strategic insights using Claude (Anthropic)
 */
export const getFinancialInsights = async (transactions: Transaction[], kpis: SchoolKPIs): Promise<IAInsight[]> => {
  const systemInstruction = `Você é o Advisor de Inteligência Financeira da Raiz Educação para a Escola SAP.
Sua missão é analisar os dados financeiros e operacionais (DRE, Alunos, KPIs) e fornecer um Resumo Executivo.
Analise variações de EBITDA, margem e custos por aluno.
Identifique 'Top Drivers' de performance e sugira ações práticas.`;

  const prompt = `Analise os dados consolidados da unidade:
- Receita: R$ ${kpis.totalRevenue.toLocaleString()}
- EBITDA: R$ ${kpis.ebitda.toLocaleString()} (${kpis.netMargin.toFixed(1)}%)
- Alunos Ativos: ${kpis.activeStudents}
- Ticket Médio: R$ ${kpis.revenuePerStudent.toLocaleString()}
- Custo/Aluno: R$ ${kpis.costPerStudent.toLocaleString()}

Responda APENAS com um JSON válido (Array de objetos).
Cada objeto deve ter: title, description, priority ('high', 'medium', 'low') e category ('Driver Positivo', 'Driver Negativo', 'Ação Recomendada').
Gere exatamente 4 insights estratégicos.

Formato de resposta:
[
  {
    "title": "Título do insight",
    "description": "Descrição detalhada",
    "priority": "high",
    "category": "Driver Positivo"
  }
]`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 2000,
        system: systemInstruction,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", response.status, response.statusText, errorBody);
      throw new Error(`Serviço de IA indisponível (${response.status})`);
    }

    const data = await response.json();
    const text = data.content[0]?.text || "{}";

    // Try to parse as JSON
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed.insights && Array.isArray(parsed.insights)) {
        return parsed.insights;
      }
      // If object with keys, try to extract array
      const values = Object.values(parsed);
      if (values.length > 0 && Array.isArray(values[0])) {
        return values[0] as IAInsight[];
      }
    } catch (e) {
      console.error("JSON parse error:", e);
    }

    // Fallback insights
    return getFallbackInsights(kpis);
  } catch (error) {
    console.error("Erro IA Advisor (Anthropic):", error);
    return getFallbackInsights(kpis);
  }
};

/**
 * chatWithFinancialData enables conversational analysis with full context and history
 */
export const chatWithFinancialData = async (
  message: string,
  history: { role: 'user' | 'model', content: string }[],
  context: { transactions: Transaction[], kpis: SchoolKPIs }
) => {
  const systemContext = `Você é o "SAP Strategist", um assistente de IA sênior especializado em finanças escolares para a Escola SAP.
Você tem acesso aos KPIs atuais e à lista de transações.
Seu objetivo é ajudar a diretoria a entender os números, encontrar gargalos e sugerir melhorias.

KPIs ATUAIS:
- Receita Total: R$ ${context.kpis.totalRevenue.toLocaleString()}
- EBITDA: R$ ${context.kpis.ebitda.toLocaleString()} (Margem: ${context.kpis.netMargin.toFixed(1)}%)
- Custo por Aluno: R$ ${context.kpis.costPerStudent.toLocaleString()}
- Receita por Aluno: R$ ${context.kpis.revenuePerStudent.toLocaleString()}
- Alunos Ativos: ${context.kpis.activeStudents}
- Meta de Margem Raiz: 25%

Responda de forma executiva, profissional e baseada em dados.
Use **negrito** para destacar informações importantes.`;

  try {
    // Convert history to Anthropic format
    const messages: any[] = [];

    // Add history
    history.forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      });
    });

    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1500,
        system: systemContext,
        messages: messages,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Chat - Anthropic API error:", response.status, response.statusText, errorBody);

      if (response.status === 429) {
        return "⚠️ **Limite de requisições atingido**\n\nVocê atingiu o limite temporário de requisições da API. Aguarde alguns segundos e tente novamente.\n\n**Análise Básica dos Dados Atuais:**\n\n- **EBITDA**: R$ " + context.kpis.ebitda.toLocaleString() + " (" + context.kpis.netMargin.toFixed(1) + "%)\n- **Receita/Aluno**: R$ " + context.kpis.revenuePerStudent.toLocaleString() + "\n- **Custo/Aluno**: R$ " + context.kpis.costPerStudent.toLocaleString() + "\n- **Meta de Margem**: 25%";
      }

      throw new Error(`Serviço de IA indisponível (${response.status})`);
    }

    const data = await response.json();
    return data.content[0]?.text || "Desculpe, não consegui processar sua pergunta.";
  } catch (error: any) {
    console.error("Erro no Chat IA (Anthropic):", error);

    if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      return "⚠️ **Limite de requisições atingido**\n\nVocê atingiu o limite temporário de requisições do Claude. Aguarde alguns segundos e tente novamente.\n\n**Análise Básica dos Dados Atuais:**\n\n- **EBITDA**: R$ " + context.kpis.ebitda.toLocaleString() + " (" + context.kpis.netMargin.toFixed(1) + "%)\n- **Receita/Aluno**: R$ " + context.kpis.revenuePerStudent.toLocaleString() + "\n- **Custo/Aluno**: R$ " + context.kpis.costPerStudent.toLocaleString() + "\n- **Meta de Margem**: 25%";
    }

    return "Desculpe, tive um problema ao analisar seus dados. Verifique sua conexão e tente novamente.";
  }
};

/**
 * generateChartWithData enables AI to generate charts alongside text explanations
 */
export const generateChartWithData = async (
  message: string,
  history: { role: 'user' | 'model', content: string }[],
  context: { transactions: Transaction[], kpis: SchoolKPIs }
): Promise<AIChartResponse> => {
  const systemContext = `Você é o "SAP Strategist", um assistente de IA sênior especializado em finanças escolares para a Escola SAP.
Você tem acesso aos KPIs atuais e pode gerar gráficos para ilustrar suas análises.

KPIs ATUAIS:
- Receita Total: R$ ${context.kpis.totalRevenue.toLocaleString()}
- EBITDA: R$ ${context.kpis.ebitda.toLocaleString()} (Margem: ${context.kpis.netMargin.toFixed(1)}%)
- Custo por Aluno: R$ ${context.kpis.costPerStudent.toLocaleString()}
- Receita por Aluno: R$ ${context.kpis.revenuePerStudent.toLocaleString()}
- Alunos Ativos: ${context.kpis.activeStudents}
- Meta de Margem Raiz: 25%

TIPOS DE GRÁFICOS DISPONÍVEIS:
- "line": Evolução temporal de métricas (ex: "evolução do EBITDA mensal")
- "bar": Comparações entre categorias ou filiais (ex: "qual filial tem melhor desempenho")
- "waterfall": Breakdown do EBITDA desde receita até resultado final (ex: "como chegamos no EBITDA")
- "composed": Múltiplas métricas em um gráfico (ex: "compare receita Real vs Orçado")
- "heatmap": Matriz de performance mensal (ex: "mostre padrões mensais")

QUANDO GERAR GRÁFICOS:
- Gere gráficos quando a pergunta pedir visualização de dados, evolução, comparação ou breakdown
- NÃO gere gráficos para perguntas conceituais, de análise qualitativa ou que peçam apenas explicação
- Se gerar gráfico, sempre forneça também uma explicação em texto

FORMATO DE RESPOSTA (JSON válido):
{
  "explanation": "Sua análise em texto com **negrito** para destaques importantes",
  "chartConfig": {
    "type": "line",
    "title": "Título do Gráfico",
    "description": "Descrição curta do que mostra",
    "dataSpec": {
      "aggregation": "monthly",
      "metrics": ["ebitda"],
      "scenarios": ["Real", "Orçado"],
      "timeframe": { "start": 0, "end": 11 }
    }
  }
}

OU, se NÃO for gerar gráfico:
{
  "explanation": "Sua resposta em texto",
  "chartConfig": null
}

MÉTRICAS VÁLIDAS: "ebitda", "revenue", "fixedCosts", "variableCosts", "sgaCosts", "rateioCosts", "costs", "total"
CENÁRIOS VÁLIDOS: "Real", "Orçado", "Ano Anterior"
AGREGAÇÕES: "monthly" (0-11), "category", "filial"

Responda APENAS com JSON válido.`;

  try {
    // Convert history to Anthropic format (últimas 4 mensagens)
    const messages: any[] = [];
    const recentHistory = history.slice(-4);

    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      });
    });

    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1500,
        system: systemContext,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("generateChartWithData - Anthropic API error:", response.status, response.statusText, errorBody);

      if (response.status === 429) {
        return {
          explanation: "⚠️ **Limite de requisições atingido**\n\nAguarde alguns segundos e tente novamente.\n\n**Análise Básica:**\n- EBITDA: R$ " + context.kpis.ebitda.toLocaleString() + " (" + context.kpis.netMargin.toFixed(1) + "%)\n- Meta: 25%",
          chartConfig: null
        };
      }

      throw new Error(`Serviço de IA indisponível (${response.status})`);
    }

    const data = await response.json();
    const text = data.content[0]?.text || '{}';

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      const parsed = JSON.parse(jsonText) as AIChartResponse;

      // Validate structure
      if (!parsed.explanation) {
        parsed.explanation = "Não consegui processar sua solicitação corretamente.";
      }

      // Validate chartConfig if present
      if (parsed.chartConfig) {
        const validTypes = ['line', 'bar', 'waterfall', 'composed', 'heatmap'];
        if (!validTypes.includes(parsed.chartConfig.type)) {
          console.warn('Invalid chart type, setting to null');
          parsed.chartConfig = null;
        }
      }

      return parsed;
    } catch (e) {
      console.error("JSON parse error:", e, "Raw text:", text);
      return {
        explanation: text || "Desculpe, tive um problema ao processar sua solicitação. Tente reformular a pergunta.",
        chartConfig: null
      };
    }
  } catch (error: any) {
    console.error("Erro no generateChartWithData (Anthropic):", error);

    if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      return {
        explanation: "⚠️ **Limite de requisições atingido**\n\nAguarde alguns segundos e tente novamente.\n\n**Análise Básica:**\n- EBITDA: R$ " + context.kpis.ebitda.toLocaleString() + " (" + context.kpis.netMargin.toFixed(1) + "%)\n- Meta: 25%",
        chartConfig: null
      };
    }

    return {
      explanation: "Desculpe, tive um problema ao analisar seus dados. Verifique sua conexão e tente novamente.",
      chartConfig: null
    };
  }
};

/**
 * generateExecutiveSummary - Gera Resumo Executivo dinâmico baseado em filtros
 * Análise profunda com comparações Real vs Orçado vs A-1 e insights granulares
 */
export interface ExecutiveSummaryContext {
  // Filtros aplicados
  selectedMarca: string[];
  selectedFilial: string[];
  monthRange: { start: number; end: number };
  metric: 'revenue' | 'fixedCosts' | 'variableCosts' | 'sga' | 'ebitda';
  comparisonMode: 'budget' | 'lastYear';

  // Dados agregados
  realValue: number;
  comparisonValue: number;
  variation: number;

  // Transações relevantes (top 10 por impacto)
  topTransactions: Array<{
    vendor: string;
    ticket: string;
    amount: number;
    description: string;
    date: string;
  }>;

  // Dados contextuais
  kpis: SchoolKPIs;
}

export interface ExecutiveSummaryResponse {
  summary: string;           // Resumo inicial (2-3 parágrafos)
  detailedAnalysis: string;  // Análise detalhada expandida
  keyFindings: string[];     // 3-5 descobertas principais
  recommendations: string[]; // 3-5 ações recomendadas
}

export const generateExecutiveSummary = async (
  context: ExecutiveSummaryContext
): Promise<ExecutiveSummaryResponse> => {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const periodText = context.monthRange.start === context.monthRange.end
    ? monthNames[context.monthRange.start]
    : `${monthNames[context.monthRange.start]} a ${monthNames[context.monthRange.end]}`;

  const metricNames = {
    revenue: 'Receita Líquida',
    fixedCosts: 'Custos Fixos',
    variableCosts: 'Custos Variáveis',
    sga: 'Despesas Administrativas (SG&A)',
    ebitda: 'EBITDA'
  };

  const comparisonNames = {
    budget: 'Orçado',
    lastYear: 'Ano Anterior (A-1)'
  };

  // Construir contexto rico para a IA
  const scopeText = context.selectedMarca.length > 0
    ? `CIA(s): ${context.selectedMarca.join(', ')}`
    : context.selectedFilial.length > 0
    ? `Filial(is): ${context.selectedFilial.join(', ')}`
    : 'TODAS AS UNIDADES';

  const systemInstruction = `Você é um CFO experiente da Raiz Educação, especializado em análise financeira de escolas.
Sua missão é gerar um Resumo Executivo profundo e acionável baseado nos filtros selecionados pelo usuário.

CONTEXTO DA ANÁLISE:
- Escopo: ${scopeText}
- Período: ${periodText}/2026
- Métrica em foco: ${metricNames[context.metric]}
- Comparação: Real vs ${comparisonNames[context.comparisonMode]}

DADOS CONSOLIDADOS:
- Valor Real: R$ ${context.realValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Valor ${comparisonNames[context.comparisonMode]}: R$ ${context.comparisonValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Variação: ${context.variation.toFixed(1)}% ${context.variation > 0 ? '(acima)' : '(abaixo)'}

TOP TRANSAÇÕES POR IMPACTO:
${context.topTransactions.slice(0, 5).map((t, i) =>
  `${i + 1}. ${t.vendor || 'N/A'} | Ticket: ${t.ticket} | R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | ${t.description}`
).join('\n')}

KPIs GERAIS:
- EBITDA Total: R$ ${context.kpis.ebitda.toLocaleString('pt-BR')} (${context.kpis.netMargin.toFixed(1)}%)
- Alunos Ativos: ${context.kpis.activeStudents}
- Ticket Médio: R$ ${context.kpis.revenuePerStudent.toLocaleString('pt-BR')}
- Custo/Aluno: R$ ${context.kpis.costPerStudent.toLocaleString('pt-BR')}

SUAS RESPONSABILIDADES:
1. Explique O QUE aconteceu (variação, tendências)
2. Explique POR QUÊ aconteceu (drivers principais)
3. Destaque SURPRESAS nos dados (outliers, anomalias, oportunidades)
4. Sugira O QUE FAZER (ações práticas e priorizadas)

ESTILO:
- Executivo, direto ao ponto, baseado em dados
- Use números concretos das transações
- Mencione fornecedores/tickets específicos quando relevante
- Destaque insights surpreendentes ou contra-intuitivos
- Tom profissional mas acessível

Responda APENAS com JSON válido no formato:
{
  "summary": "Resumo inicial de 2-3 parágrafos",
  "detailedAnalysis": "Análise detalhada expandida com breakdowns e drill-downs",
  "keyFindings": ["Descoberta 1", "Descoberta 2", "Descoberta 3"],
  "recommendations": ["Ação 1", "Ação 2", "Ação 3"]
}`;

  const prompt = `Analise o contexto fornecido e gere um Resumo Executivo profundo e acionável.

Foque em:
- Comparar Real vs ${comparisonNames[context.comparisonMode]} para ${metricNames[context.metric]}
- Identificar os maiores drivers de variação
- Analisar as transações de maior impacto
- Encontrar padrões ou anomalias surpreendentes
- Sugerir ações práticas priorizadas por impacto

Responda APENAS com JSON válido.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 3000,
        system: systemInstruction,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ generateExecutiveSummary - Anthropic API error:", response.status, errorBody);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0]?.text || "{}";

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      const parsed = JSON.parse(jsonText) as ExecutiveSummaryResponse;

      // Validate structure
      if (!parsed.summary || !parsed.detailedAnalysis || !parsed.keyFindings || !parsed.recommendations) {
        throw new Error("Invalid response structure");
      }

      return parsed;
    } catch (e) {
      console.error("JSON parse error in generateExecutiveSummary:", e, "Raw text:", text);
      return getFallbackExecutiveSummary(context);
    }
  } catch (error) {
    console.error("Erro em generateExecutiveSummary:", error);
    return getFallbackExecutiveSummary(context);
  }
};

/**
 * Helper function to generate fallback executive summary
 */
function getFallbackExecutiveSummary(context: ExecutiveSummaryContext): ExecutiveSummaryResponse {
  const metricNames = {
    revenue: 'Receita Líquida',
    fixedCosts: 'Custos Fixos',
    variableCosts: 'Custos Variáveis',
    sga: 'SG&A',
    ebitda: 'EBITDA'
  };

  const comparisonNames = {
    budget: 'Orçado',
    lastYear: 'Ano Anterior'
  };

  const variationText = context.variation > 0 ? 'acima' : 'abaixo';
  const variationIcon = context.variation > 0 ? '📈' : '📉';

  return {
    summary: `${variationIcon} A ${metricNames[context.metric]} do período analisado está ${Math.abs(context.variation).toFixed(1)}% ${variationText} do ${comparisonNames[context.comparisonMode]}.\n\nValor Real: R$ ${context.realValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nValor ${comparisonNames[context.comparisonMode]}: R$ ${context.comparisonValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nAs principais transações representam ${context.topTransactions.length} lançamentos de alto impacto que merecem atenção especial.`,

    detailedAnalysis: `**Análise Detalhada:**\n\nAs ${context.topTransactions.length} principais transações somam R$ ${context.topTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.\n\nPrincipais fornecedores:\n${context.topTransactions.slice(0, 3).map((t, i) => `${i + 1}. ${t.vendor || 'N/A'}: R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')}\n\nA variação observada pode estar relacionada a mudanças operacionais, sazonalidade ou ajustes estratégicos no período.`,

    keyFindings: [
      `${metricNames[context.metric]} está ${variationText} do ${comparisonNames[context.comparisonMode]} em ${Math.abs(context.variation).toFixed(1)}%`,
      `${context.topTransactions.length} transações de alto impacto identificadas`,
      `Margem EBITDA atual: ${context.kpis.netMargin.toFixed(1)}% (Meta: 25%)`
    ],

    recommendations: [
      "Revisar as principais transações identificadas para validar conformidade",
      "Analisar tendência dos próximos meses para ajustar projeções",
      `${context.kpis.netMargin < 25 ? 'Implementar plano de ação para atingir meta de margem' : 'Manter monitoramento para sustentar performance'}`
    ]
  };
}

/**
 * generateDreNarrativeAnalysis — gera análise narrativa do DRE Gerencial via Claude
 * Recebe os somaRows filtrados e o contexto de filtros em texto e retorna o texto gerado.
 */
export const generateDreNarrativeAnalysis = async (
  somaRows: { tag0: string; tag01: string; scenario: string; month: string; total: number }[],
  filterContext: string
): Promise<string> => {
  // Agrega por tag0 + scenario (reduz centenas de linhas para ~60 células)
  const agg: Record<string, Record<string, number>> = {};
  for (const row of somaRows) {
    if (!agg[row.tag0]) agg[row.tag0] = {};
    agg[row.tag0][row.scenario] = (agg[row.tag0][row.scenario] || 0) + row.total;
  }

  const fmtVal = (v: number) => v === 0 ? '—' : 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const dreTable = Object.entries(agg)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag0, s]) => {
      const real   = s['Real']   || 0;
      const orcado = s['Orçado'] || 0;
      const a1     = s['A-1']    || 0;
      const dOrc = orcado !== 0 ? ((real - orcado) / Math.abs(orcado) * 100).toFixed(1) + '%' : 'N/D';
      const dA1  = a1     !== 0 ? ((real - a1)     / Math.abs(a1)     * 100).toFixed(1) + '%' : 'N/D';
      return `| ${tag0} | ${fmtVal(real)} | ${fmtVal(orcado)} | ${dOrc} | ${fmtVal(a1)} | ${dA1} |`;
    })
    .join('\n');

  const system = `Você é um analista financeiro sênior da Raiz Educação.
Redija uma análise narrativa do DRE Gerencial em português brasileiro.
A análise deve: (1) explicar principais desvios vs Orçado e vs A-1, (2) destacar grupos (tag0) com variações relevantes, (3) ser objetiva e executiva, (4) ter 3 a 5 parágrafos em prosa corrida.
Não inclua tabelas. Use valores em R$ formatados.`;

  const userMsg = `Filtros aplicados: ${filterContext}

DRE Gerencial — Dados Agregados:
| Grupo (tag0) | Real | Orçado | Δ% Orç | A-1 | Δ% A-1 |
|---|---|---|---|---|---|
${dreTable}

Redija a análise.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userMsg }],
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (isCreditError(response.status, errBody)) {
      console.warn('⚠️ Anthropic sem crédito — usando Groq (Llama) como fallback');
      return callGroqFallback(system, userMsg, 1500, 0.6);
    }
    console.error('Anthropic API error:', response.status, errBody);
    throw new Error(`Serviço de IA indisponível (${response.status})`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Resposta vazia da IA');
  return text;
};

/**
 * Helper function to generate fallback insights
 */
/**
 * improveDreNarrativeAnalysis — melhora e estrutura uma análise existente com visão de FP&A
 */
export const improveDreNarrativeAnalysis = async (
  existingText: string,
  filterContext: string
): Promise<string> => {
  const system = `Você é um analista sênior de FP&A (Financial Planning & Analysis) da Raiz Educação.
Sua tarefa é melhorar e estruturar uma análise narrativa do DRE Gerencial escrita por um colega.

Diretrizes de FP&A que você deve aplicar:
1. **Estrutura clara**: Contexto → Desvios principais → Causas-raiz → Impacto no EBITDA → Perspectiva
2. **Linguagem executiva**: direta, sem redundâncias, orientada a decisão
3. **Causalidade explícita**: toda variação deve ter uma causa identificada ("devido a", "em função de", "reflexo de")
4. **Forward-looking**: quando pertinente, inclua implicação para o restante do período ou ação recomendada
5. **Valores**: mantenha os números originais em R$; não invente dados novos
6. **Tamanho**: 3 a 5 parágrafos, prosa corrida — sem bullet points, sem tabelas
7. **Idioma**: português brasileiro, tom profissional-executivo

Não altere os fatos nem os números da análise original. Apenas melhore a redação, estrutura e profundidade analítica.`;

  const userMsg = `Filtros aplicados: ${filterContext}

Análise original a melhorar:
"""
${existingText}
"""

Reescreva com visão de FP&A conforme as diretrizes.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userMsg }],
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (isCreditError(response.status, errBody)) {
      console.warn('⚠️ Anthropic sem crédito — usando Groq (Llama) como fallback');
      return callGroqFallback(system, userMsg, 1500, 0.5);
    }
    console.error('Anthropic API error:', response.status, errBody);
    throw new Error(`Serviço de IA indisponível (${response.status})`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Resposta vazia da IA');
  return text;
};

/**
 * generateVarianceSummary — Síntese IA hierárquica para justificativas de desvios
 *
 * Nível 1 (tag02): resume justificativas das tag03 abaixo
 * Nível 2 (tag01): resume sínteses das tag02 abaixo
 * Nível 3 (ytd):   consolida sínteses mês a mês
 */
export type VarianceSummaryLevel = 'tag02' | 'tag01' | 'ytd';

export interface VarianceSummaryItem {
  label: string;       // tag03 name, tag02 name, ou year_month
  real: number;
  compare: number;
  variance_pct: number | null;
  text: string;        // justificativa do pacoteiro (tag02) ou ai_summary (tag01/ytd)
}

export const generateVarianceSummary = async (
  level: VarianceSummaryLevel,
  items: VarianceSummaryItem[],
  context: { parentLabel: string; marca?: string }
): Promise<string> => {
  const fmtVal = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const fmtPct = (v: number | null) => v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : 'N/D';

  const itemsTable = items.map(item =>
    `- ${item.label}: Real ${fmtVal(item.real)} | Comparação ${fmtVal(item.compare)} | Δ ${fmtPct(item.variance_pct)}\n  Justificativa/Síntese: ${item.text}`
  ).join('\n');

  let systemPrompt: string;
  let userPrompt: string;

  switch (level) {
    case 'tag02':
      systemPrompt = 'Você é um analista financeiro sênior da Raiz Educação. Seu papel é sintetizar justificativas de desvios orçamentários de forma objetiva e executiva.';
      userPrompt = `Resuma em 2-3 frases as justificativas dos projetos (tag03) abaixo para o segmento "${context.parentLabel}"${context.marca ? ` da marca ${context.marca}` : ''}. Seja objetivo e destaque os principais drivers de variação.\n\n${itemsTable}`;
      break;
    case 'tag01':
      systemPrompt = 'Você é um analista financeiro sênior da Raiz Educação. Seu papel é consolidar análises de segmentos em uma visão de centro de custo.';
      userPrompt = `Consolide em 2-3 frases as análises dos segmentos (tag02) abaixo para o centro de custo "${context.parentLabel}"${context.marca ? ` da marca ${context.marca}` : ''}. Destaque os segmentos mais relevantes e seus drivers.\n\n${itemsTable}`;
      break;
    case 'ytd':
      systemPrompt = 'Você é um analista financeiro sênior da Raiz Educação. Seu papel é produzir análises acumuladas (YTD) com visão de tendência.';
      userPrompt = `Consolide a análise acumulada (YTD) das justificativas mês a mês para "${context.parentLabel}"${context.marca ? ` da marca ${context.marca}` : ''}. Destaque tendências, evolução e padrões recorrentes.\n\n${itemsTable}`;
      break;
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (isCreditError(response.status, errBody)) {
        console.warn('⚠️ Anthropic sem crédito — usando Groq (Llama) como fallback para síntese');
        return callGroqFallback(systemPrompt, userPrompt, 800, 0.5);
      }
      console.error('Anthropic API error (variance summary):', response.status, errBody);
      throw new Error(`Serviço de IA indisponível (${response.status})`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Resposta vazia da IA');
    return text;
  } catch (error) {
    console.error('Erro em generateVarianceSummary:', error);
    throw error;
  }
};

// ── AI helpers for justification modal ────────────────────────────────

export interface VarianceContext {
  tag0: string;
  tag01: string;
  tag02?: string | null;
  marca?: string | null;
  real: number;
  compare: number;
  variancePct: number | null;
  comparisonType: 'orcado' | 'a1';
}

/**
 * aiAnalyzeVariance — IA gera uma justificativa a partir dos dados do desvio
 */
export const aiAnalyzeVariance = async (ctx: VarianceContext): Promise<string> => {
  const fmtVal = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const fmtP = (v: number | null) => v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : 'N/D';
  const compLabel = ctx.comparisonType === 'orcado' ? 'Orçado' : 'Ano Anterior';

  const systemPrompt = 'Você é um analista financeiro sênior da Raiz Educação. Gere uma justificativa profissional e objetiva para um desvio orçamentário. REGRAS DE FORMATO: escreva exatamente 2-3 frases, entre 150 e 250 caracteres no total. Seja direto, sem introduções. Use linguagem executiva e mencione causas prováveis.';
  const userPrompt = `Gere uma justificativa concisa (2-3 frases, máximo 250 caracteres) para o seguinte desvio:\n\n- Grupo: ${ctx.tag0}\n- Centro de Custo: ${ctx.tag01}${ctx.tag02 ? `\n- Segmento: ${ctx.tag02}` : ''}${ctx.marca ? `\n- Marca: ${ctx.marca}` : ''}\n- Real: ${fmtVal(ctx.real)}\n- ${compLabel}: ${fmtVal(ctx.compare)}\n- Variação: ${fmtP(ctx.variancePct)}\n\nResponda APENAS com a justificativa, sem prefácios ou aspas.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (isCreditError(response.status, errBody)) {
        return callGroqFallback(systemPrompt, userPrompt, 200, 0.6);
      }
      throw new Error(`IA indisponível (${response.status})`);
    }

    const data = await response.json();
    let text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error('Resposta vazia da IA');
    // Remove aspas se a IA envolver o texto nelas
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    return text;
  } catch (error) {
    console.error('Erro em aiAnalyzeVariance:', error);
    throw error;
  }
};

/**
 * aiImproveText — IA melhora o texto de justificativa escrito pelo usuário
 */
export const aiImproveText = async (originalText: string, ctx: VarianceContext): Promise<string> => {
  const fmtVal = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const compLabel = ctx.comparisonType === 'orcado' ? 'Orçado' : 'Ano Anterior';

  const systemPrompt = 'Você é um editor financeiro sênior da Raiz Educação. Melhore textos de justificativas de desvios orçamentários: torne mais claro, profissional e objetivo. REGRAS DE FORMATO: o resultado deve ter 2-3 frases, entre 150 e 250 caracteres. Mantenha o conteúdo original, melhore apenas redação e clareza. Responda APENAS com o texto melhorado, sem prefácios ou aspas.';
  const userPrompt = `Melhore o texto abaixo (resultado: 2-3 frases, máximo 250 caracteres).\n\nContexto:\n- ${ctx.tag0} › ${ctx.tag01}${ctx.tag02 ? ` › ${ctx.tag02}` : ''}${ctx.marca ? ` (${ctx.marca})` : ''}\n- Real: ${fmtVal(ctx.real)} vs ${compLabel}: ${fmtVal(ctx.compare)}\n\nTexto original:\n"${originalText}"\n\nTexto melhorado:`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (isCreditError(response.status, errBody)) {
        return callGroqFallback(systemPrompt, userPrompt, 200, 0.4);
      }
      throw new Error(`IA indisponível (${response.status})`);
    }

    const data = await response.json();
    let text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error('Resposta vazia da IA');
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    return text;
  } catch (error) {
    console.error('Erro em aiImproveText:', error);
    throw error;
  }
};

/**
 * aiGenerateActionPlan — IA gera plano de ação baseado na justificativa existente
 */
export const aiGenerateActionPlan = async (justification: string, ctx: VarianceContext): Promise<string> => {
  const fmtVal = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const compLabel = ctx.comparisonType === 'orcado' ? 'Orçado' : 'Ano Anterior';

  const systemPrompt = 'Você é um analista financeiro sênior da Raiz Educação. Com base na justificativa de um desvio orçamentário, proponha um plano de ação concreto e executável. REGRAS DE FORMATO: escreva 2-3 ações objetivas em uma única frase cada, separadas por ponto. Total entre 150 e 250 caracteres. Sem introduções, sem numeração, sem bullet points. Apenas as ações diretas.';
  const userPrompt = `Proponha um plano de ação (2-3 ações, máximo 250 caracteres) para o desvio abaixo.\n\nContexto:\n- ${ctx.tag0} › ${ctx.tag01}${ctx.tag02 ? ` › ${ctx.tag02}` : ''}${ctx.marca ? ` (${ctx.marca})` : ''}\n- Real: ${fmtVal(ctx.real)} vs ${compLabel}: ${fmtVal(ctx.compare)}\n\nJustificativa do desvio:\n"${justification}"\n\nPlano de ação:`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (isCreditError(response.status, errBody)) {
        return callGroqFallback(systemPrompt, userPrompt, 200, 0.5);
      }
      throw new Error(`IA indisponível (${response.status})`);
    }

    const data = await response.json();
    let text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error('Resposta vazia da IA');
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    return text;
  } catch (error) {
    console.error('Erro em aiGenerateActionPlan:', error);
    throw error;
  }
};

/**
 * aiImproveActionPlan — IA melhora o plano de ação existente com base na justificativa
 */
export const aiImproveActionPlan = async (actionPlan: string, justification: string, ctx: VarianceContext): Promise<string> => {
  const fmtVal = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const compLabel = ctx.comparisonType === 'orcado' ? 'Orçado' : 'Ano Anterior';

  const systemPrompt = 'Você é um editor financeiro sênior da Raiz Educação. Melhore planos de ação para desvios orçamentários: torne mais concreto, executável e objetivo. REGRAS DE FORMATO: resultado com 2-3 ações, entre 150 e 250 caracteres. Mantenha a intenção original. Responda APENAS com o plano melhorado, sem prefácios ou aspas.';
  const userPrompt = `Melhore o plano de ação abaixo (resultado: 2-3 ações, máximo 250 caracteres).\n\nContexto:\n- ${ctx.tag0} › ${ctx.tag01}${ctx.tag02 ? ` › ${ctx.tag02}` : ''}${ctx.marca ? ` (${ctx.marca})` : ''}\n- Real: ${fmtVal(ctx.real)} vs ${compLabel}: ${fmtVal(ctx.compare)}\n\nJustificativa do desvio:\n"${justification}"\n\nPlano de ação original:\n"${actionPlan}"\n\nPlano de ação melhorado:`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (isCreditError(response.status, errBody)) {
        return callGroqFallback(systemPrompt, userPrompt, 200, 0.4);
      }
      throw new Error(`IA indisponível (${response.status})`);
    }

    const data = await response.json();
    let text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error('Resposta vazia da IA');
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    return text;
  } catch (error) {
    console.error('Erro em aiImproveActionPlan:', error);
    throw error;
  }
};

function getFallbackInsights(kpis: SchoolKPIs): IAInsight[] {
  return [
    {
      title: "Análise de Margem",
      description: `Sua margem atual de ${kpis.netMargin.toFixed(1)}% está ${kpis.netMargin > 25 ? 'acima' : 'abaixo'} da meta institucional da Raiz Educação (25%). ${kpis.netMargin < 25 ? 'Recomenda-se revisar custos variáveis e fixos para otimização.' : 'Excelente performance, manter monitoramento.'}`,
      priority: kpis.netMargin < 20 ? "high" : "medium",
      category: kpis.netMargin < 25 ? "Driver Negativo" : "Driver Positivo"
    },
    {
      title: "EBITDA Atual",
      description: `EBITDA de R$ ${kpis.ebitda.toLocaleString()} representa ${kpis.netMargin.toFixed(1)}% da receita total. ${kpis.ebitda < 0 ? 'Situação crítica: resultado operacional negativo.' : 'Acompanhar tendência mensal para garantir sustentabilidade.'}`,
      priority: kpis.ebitda < 0 ? "high" : "medium",
      category: kpis.ebitda < 0 ? "Ação Recomendada" : "Driver Positivo"
    },
    {
      title: "Custo por Aluno",
      description: `Custo médio de R$ ${kpis.costPerStudent.toLocaleString()} por aluno. Revisar principais centros de custo para identificar oportunidades de otimização sem comprometer qualidade educacional.`,
      priority: "medium",
      category: "Ação Recomendada"
    },
    {
      title: "Receita por Aluno",
      description: `Ticket médio de R$ ${kpis.revenuePerStudent.toLocaleString()}. ${kpis.revenuePerStudent > kpis.costPerStudent * 1.4 ? 'Boa relação receita/custo, indicando operação saudável.' : 'Considerar estratégias de aumento de receita ou revisão de estrutura de custos.'}`,
      priority: "medium",
      category: kpis.revenuePerStudent > kpis.costPerStudent * 1.4 ? "Driver Positivo" : "Ação Recomendada"
    }
  ];
}
