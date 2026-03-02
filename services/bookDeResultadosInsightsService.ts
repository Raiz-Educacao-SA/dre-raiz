// ─── Book de Resultados — Insights Service (Deterministic Templates) ──
import {
  BookDREGroup, BookCalcRow, DRESectionConfig, StatusBadge,
  PerformanceBlock, BookKPI,
} from './bookDeResultadosTypes';

// ─── Formatação ──────────────────────────────────────────────────

function fmtK(v: number): string {
  return Math.round(v / 1000).toLocaleString('pt-BR');
}

function fmtPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function fmtDelta(v: number, invert: boolean): string {
  const favorable = invert ? v <= 0 : v >= 0;
  const sign = v >= 0 ? '+' : '';
  return `${sign}${fmtK(v)}`;
}

// ─── Section Insights ────────────────────────────────────────────

export function generateSectionInsights(group: BookDREGroup, config: DRESectionConfig): string[] {
  const insights: string[] = [];
  const { totalReal, totalOrcado, totalA1, deltaOrc, deltaA1, deltaOrcPct, deltaA1Pct } = group;

  // 1. Resultado principal
  const orcFavorable = config.invertDelta ? deltaOrc <= 0 : deltaOrc >= 0;
  if (orcFavorable) {
    insights.push(`${config.label} totalizaram R$ ${fmtK(totalReal)} mil, ${config.invertDelta ? 'abaixo' : 'acima'} do orçado em R$ ${fmtK(Math.abs(deltaOrc))} mil (${fmtPct(deltaOrcPct)}).`);
  } else {
    insights.push(`${config.label} totalizaram R$ ${fmtK(totalReal)} mil, ${config.invertDelta ? 'acima' : 'abaixo'} do orçado em R$ ${fmtK(Math.abs(deltaOrc))} mil (${fmtPct(deltaOrcPct)}).`);
  }

  // 2. Comparação YoY
  const a1Favorable = config.invertDelta ? deltaA1 <= 0 : deltaA1 >= 0;
  if (a1Favorable) {
    insights.push(`Variação positiva de ${fmtPct(Math.abs(deltaA1Pct))} em relação ao ano anterior.`);
  } else {
    insights.push(`Queda de ${fmtPct(Math.abs(deltaA1Pct))} em relação ao ano anterior.`);
  }

  // 3. Top item (maior contribuição)
  if (group.items.length > 0) {
    const sorted = [...group.items].sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
    const top = sorted[0];
    insights.push(`Principal componente: ${top.tag01} com R$ ${fmtK(top.real)} mil (${((top.real / totalReal) * 100).toFixed(0)}% do total).`);
  }

  // 4. Item com maior desvio
  if (group.items.length > 1) {
    const byDeviation = [...group.items].sort((a, b) => Math.abs(b.deltaOrc) - Math.abs(a.deltaOrc));
    const worst = byDeviation[0];
    const isFavorable = config.invertDelta ? worst.deltaOrc <= 0 : worst.deltaOrc >= 0;
    insights.push(`Maior desvio: ${worst.tag01} com ${isFavorable ? 'resultado favorável' : 'resultado desfavorável'} de R$ ${fmtK(Math.abs(worst.deltaOrc))} mil vs orçado.`);
  }

  return insights;
}

// ─── Performance Analysis (DRE Completo) ─────────────────────────

export function generatePerformanceAnalysis(groups: BookDREGroup[], calcRows: BookCalcRow[]): PerformanceBlock[] {
  const blocks: PerformanceBlock[] = [];
  const ebitda = calcRows.find(c => c.label === 'EBITDA');
  const margem = calcRows.find(c => c.label === 'MARGEM DE CONTRIBUIÇÃO');
  const receita = groups.find(g => g.tag0.startsWith('01.'));
  const custos = groups.filter(g => g.tag0.startsWith('02.') || g.tag0.startsWith('03.'));

  // 1. Resultado
  if (ebitda) {
    const trend = ebitda.deltaOrcPct >= 0 ? 'acima' : 'abaixo';
    blocks.push({
      icon: '📊',
      title: 'Resultado',
      text: `EBITDA de R$ ${fmtK(ebitda.real)} mil, ${trend} do orçado em ${fmtPct(ebitda.deltaOrcPct)}. Variação YoY de ${fmtPct(ebitda.deltaA1Pct)}.`,
      color: ebitda.deltaOrcPct >= 0 ? '10B981' : 'EF4444',
    });
  }

  // 2. Eficiência operacional
  if (receita && custos.length > 0) {
    const totalCusto = custos.reduce((s, g) => s + g.totalReal, 0);
    const custoOrc   = custos.reduce((s, g) => s + g.totalOrcado, 0);
    const eficiencia = custoOrc !== 0 ? ((totalCusto / custoOrc) * 100) : 100;
    blocks.push({
      icon: '⚙️',
      title: 'Eficiência Operacional',
      text: `Custos operacionais em ${eficiencia.toFixed(1)}% do orçado. ${eficiencia <= 100 ? 'Gestão de custos controlada.' : 'Custos acima do planejado — atenção requerida.'}`,
      color: eficiencia <= 100 ? '10B981' : 'D4A044',
    });
  }

  // 3. Pontos de atenção
  const desfavoraveis = groups.filter(g => {
    const isExpense = g.tag0.startsWith('02.') || g.tag0.startsWith('03.') || g.tag0.startsWith('04.');
    return isExpense ? g.deltaOrc > 0 : g.deltaOrc < 0;
  });
  if (desfavoraveis.length > 0) {
    const nomes = desfavoraveis.slice(0, 2).map(g => g.label).join(', ');
    blocks.push({
      icon: '⚠️',
      title: 'Pontos de Atenção',
      text: `${desfavoraveis.length} grupo(s) com desvio desfavorável: ${nomes}.`,
      color: 'EF4444',
    });
  } else {
    blocks.push({
      icon: '✅',
      title: 'Performance',
      text: 'Todos os grupos dentro ou melhor que o orçado.',
      color: '10B981',
    });
  }

  // 4. Comparativo anual
  if (margem) {
    const margemPctReal = receita && receita.totalReal !== 0
      ? ((margem.real / receita.totalReal) * 100)
      : 0;
    const margemPctA1 = receita && receita.totalA1 !== 0
      ? ((margem.a1 / receita.totalA1) * 100)
      : 0;
    const diff = margemPctReal - margemPctA1;
    blocks.push({
      icon: '📈',
      title: 'Comparativo Anual',
      text: `Margem de contribuição de ${margemPctReal.toFixed(1)}% (vs ${margemPctA1.toFixed(1)}% no ano anterior). ${diff >= 0 ? 'Melhoria' : 'Redução'} de ${Math.abs(diff).toFixed(1)} p.p.`,
      color: diff >= 0 ? '10B981' : 'EF4444',
    });
  }

  return blocks;
}

// ─── Status Badge ────────────────────────────────────────────────

export function computeStatusBadge(ebitdaReal: number, ebitdaOrcado: number): StatusBadge {
  if (ebitdaOrcado === 0) return { text: 'Neutro', color: '6B7280' };
  const pct = ((ebitdaReal - ebitdaOrcado) / Math.abs(ebitdaOrcado)) * 100;
  if (pct >= 10)   return { text: 'Excelente', color: '10B981' };
  if (pct >= 0)    return { text: 'Positivo',  color: '3B82F6' };
  if (pct >= -10)  return { text: 'Atenção',   color: 'D4A044' };
  return              { text: 'Crítico',   color: 'EF4444' };
}

// ─── EBITDA KPIs ─────────────────────────────────────────────────

export function computeEbitdaKpis(ebitda: BookCalcRow): BookKPI[] {
  const vsOrc = ebitda.deltaOrcPct;
  const vsA1  = ebitda.deltaA1Pct;
  return [
    {
      label: 'EBITDA VS ORÇADO',
      value: fmtPct(vsOrc),
      color: vsOrc >= 0 ? '10B981' : 'EF4444',
    },
    {
      label: 'VARIAÇÃO VS ANO ANT.',
      value: fmtPct(vsA1),
      color: vsA1 >= 0 ? '10B981' : 'EF4444',
    },
  ];
}
