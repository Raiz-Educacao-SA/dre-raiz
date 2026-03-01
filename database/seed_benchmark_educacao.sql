-- ============================================
-- Seed: Benchmark Aggregates — Segmento Educacional
-- Dados de referência para o setor de educação privada no Brasil
-- Faixa: medium (receita anual R$ 50M - R$ 500M)
-- Execute APÓS create_benchmark_aggregates.sql
-- ============================================

-- Período 2025 (referência consolidada)
INSERT INTO benchmark_aggregates (
  industry_segment,
  revenue_range,
  avg_margin,
  avg_ebitda,
  avg_growth,
  avg_score,
  percentile_25_margin,
  percentile_50_margin,
  percentile_75_margin,
  percentile_25_ebitda,
  percentile_50_ebitda,
  percentile_75_ebitda,
  percentile_25_score,
  percentile_50_score,
  percentile_75_score,
  percentile_25_growth,
  percentile_50_growth,
  percentile_75_growth,
  sample_count,
  reference_period,
  source
) VALUES (
  'educacao',
  'medium',
  -- Médias do setor educacional privado (medium)
  32.5,                -- avg_margin: margem contribuição média 32.5%
  8500000,             -- avg_ebitda: EBITDA médio R$ 8.5M
  6.8,                 -- avg_growth: crescimento médio 6.8% a.a.
  68,                  -- avg_score: health score médio 68

  -- Percentis Margem (%)
  22.0,                -- P25 margin
  31.0,                -- P50 margin (mediana)
  42.0,                -- P75 margin

  -- Percentis EBITDA (R$)
  3200000,             -- P25 EBITDA: R$ 3.2M
  7800000,             -- P50 EBITDA: R$ 7.8M
  14500000,            -- P75 EBITDA: R$ 14.5M

  -- Percentis Score (0-100)
  52,                  -- P25 score
  67,                  -- P50 score
  81,                  -- P75 score

  -- Percentis Growth (%)
  1.5,                 -- P25 growth
  5.5,                 -- P50 growth
  11.0,                -- P75 growth

  12,                  -- sample_count: 12 empresas no agregado
  '2025',              -- reference_period
  'mixed'              -- source: dados internos + pesquisa de mercado
)
ON CONFLICT (industry_segment, revenue_range, reference_period)
DO UPDATE SET
  avg_margin = EXCLUDED.avg_margin,
  avg_ebitda = EXCLUDED.avg_ebitda,
  avg_growth = EXCLUDED.avg_growth,
  avg_score = EXCLUDED.avg_score,
  percentile_25_margin = EXCLUDED.percentile_25_margin,
  percentile_50_margin = EXCLUDED.percentile_50_margin,
  percentile_75_margin = EXCLUDED.percentile_75_margin,
  percentile_25_ebitda = EXCLUDED.percentile_25_ebitda,
  percentile_50_ebitda = EXCLUDED.percentile_50_ebitda,
  percentile_75_ebitda = EXCLUDED.percentile_75_ebitda,
  percentile_25_score = EXCLUDED.percentile_25_score,
  percentile_50_score = EXCLUDED.percentile_50_score,
  percentile_75_score = EXCLUDED.percentile_75_score,
  percentile_25_growth = EXCLUDED.percentile_25_growth,
  percentile_50_growth = EXCLUDED.percentile_50_growth,
  percentile_75_growth = EXCLUDED.percentile_75_growth,
  sample_count = EXCLUDED.sample_count,
  source = EXCLUDED.source;
