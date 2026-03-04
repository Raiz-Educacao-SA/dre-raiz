"use client";

import { useState } from "react";
import {
  SlideDeck,
  useChartRegistry,
  buildPpt,
  getMockContext,
  mockAnalysisPack,
  fetchAnalysisContext,
  type AnalysisPack,
  type AnalysisContext,
} from "../analysisPack";
import { Download, FileSpreadsheet, Sparkles, CheckCircle2, FlaskConical } from "lucide-react";

export default function TestAnalysisPack() {
  const [pack, setPack] = useState<AnalysisPack>(mockAnalysisPack);
  const [context, setContext] = useState<AnalysisContext>(getMockContext());
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(true);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});
  const chartRegistry = useChartRegistry();

  const runTest = (testName: string, fn: () => void | Promise<void>) => async () => {
    try {
      await fn();
      setTestResults(prev => ({ ...prev, [testName]: true }));
    } catch (error) {
      console.error(`Teste ${testName} falhou:`, error);
      setTestResults(prev => ({ ...prev, [testName]: false }));
      alert(`Erro no teste ${testName}: ${error.message}`);
    }
  };

  const handleGenerateReport = runTest('generate', async () => {
    setLoading(true);
    try {
      if (useMock) {
        setPack(mockAnalysisPack);
        setContext(getMockContext());
      } else {
        const ctx = await fetchAnalysisContext({
          scenario: "Real",
        });
        setContext(ctx);

        const response = await fetch("/api/llm-proxy?action=generate-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: ctx }),
        });

        if (!response.ok) {
          throw new Error("Falha ao gerar análise");
        }

        const { data } = await response.json();
        setPack(data);
      }
    } finally {
      setLoading(false);
    }
  });

  const handleExportPngs = runTest('exportPng', async () => {
    const pngs = await chartRegistry.exportAllPngBase64();
    console.log("✅ Gráficos exportados:", Object.keys(pngs));
    alert(`✅ ${Object.keys(pngs).length} gráficos exportados com sucesso!\nVerifique o console para ver os IDs.`);
  });

  const handleExportPpt = runTest('exportPpt', async () => {
    const pngs = await chartRegistry.exportAllPngBase64();
    await buildPpt({
      pack,
      chartImages: pngs,
      fileName: `Teste-AnalysisPack-${new Date().getTime()}.pptx`,
    });
    alert("✅ PowerPoint exportado com sucesso!");
  });

  const handleTestContext = runTest('context', async () => {
    const ctx = await fetchAnalysisContext({ scenario: "Real" });
    console.log("✅ Context:", ctx);
    alert(`✅ Context carregado!\n- Org: ${ctx.org_name}\n- KPIs: ${ctx.kpis.length}\n- Datasets: ${Object.keys(ctx.datasets).length}`);
  });

  const features = [
    {
      title: "1. Integração Supabase",
      description: "Busca dados reais + construção de datasets",
      test: handleTestContext,
      status: testResults['context']
    },
    {
      title: "2. Gerar Relatório",
      description: "Gera AnalysisPack completo (Mock ou Real)",
      test: handleGenerateReport,
      status: testResults['generate']
    },
    {
      title: "3. Exportar PNGs",
      description: "Exporta todos os gráficos como PNG base64",
      test: handleExportPngs,
      status: testResults['exportPng']
    },
    {
      title: "4. Exportar PowerPoint",
      description: "Gera apresentação .pptx completa",
      test: handleExportPpt,
      status: testResults['exportPpt']
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <FlaskConical className="text-purple-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                🧪 Teste - AnalysisPack
              </h1>
              <p className="text-sm text-gray-600">
                Sistema completo de análise financeira com IA
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                Slides
              </div>
              <div className="text-2xl font-black text-blue-900">
                {pack.slides.length}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="text-xs font-bold text-green-600 uppercase mb-1">
                Gráficos
              </div>
              <div className="text-2xl font-black text-green-900">
                {pack.charts.length}
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="text-xs font-bold text-orange-600 uppercase mb-1">
                KPIs
              </div>
              <div className="text-2xl font-black text-orange-900">
                {context.kpis.length}
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="text-xs font-bold text-purple-600 uppercase mb-1">
                Datasets
              </div>
              <div className="text-2xl font-black text-purple-900">
                {Object.keys(context.datasets).length}
              </div>
            </div>
          </div>
        </div>

        {/* Features Test Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">
            🎯 Funcionalidades Implementadas
          </h2>

          <div className="space-y-3">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{feature.title}</h3>
                    {feature.status !== undefined && (
                      <span className={`text-xs px-2 py-1 rounded-lg font-bold ${
                        feature.status
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {feature.status ? '✅ OK' : '❌ Falhou'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {feature.description}
                  </p>
                </div>
                <button
                  onClick={feature.test}
                  disabled={loading && feature.title.includes('Gerar')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-all"
                >
                  {loading && feature.title.includes('Gerar') ? 'Testando...' : 'Testar'}
                </button>
              </div>
            ))}
          </div>

          {/* Toggle Mock/Real */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-bold text-blue-900">
                  Usar dados Mock (desenvolvimento)
                </span>
                <p className="text-xs text-blue-700 mt-0.5">
                  {useMock
                    ? "✅ Usando dados fictícios (rápido, sem API)"
                    : "⚠️ Usando dados reais (lento, requer Supabase + API)"}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">
            ⚡ Ações Rápidas
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all"
            >
              <Sparkles size={18} />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>

            <button
              onClick={handleExportPngs}
              disabled={!pack}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all"
            >
              <Download size={18} />
              Exportar PNGs
            </button>

            <button
              onClick={handleExportPpt}
              disabled={!pack}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all"
            >
              <FileSpreadsheet size={18} />
              Exportar PowerPoint
            </button>

            <button
              onClick={handleTestContext}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold transition-all"
            >
              <CheckCircle2 size={18} />
              Testar Context
            </button>
          </div>
        </div>

        {/* Executive Summary Preview */}
        {pack && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">
                📊 Resumo Executivo
              </h2>
              <div className="text-xs text-gray-500">
                {context.org_name} • {context.period_label} • {context.scope_label}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-xl font-black text-gray-900 mb-3">
                {pack.executive_summary.headline}
              </h3>
              <ul className="space-y-2">
                {pack.executive_summary.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* SlideDeck Render */}
        {pack && context && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-6">
              🎨 SlideDeck Completo
            </h2>
            <SlideDeck
              pack={pack}
              ctx={context}
              onRegisterChart={chartRegistry.register}
            />
          </div>
        )}

        {/* Documentation Links */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-lg text-white">
          <h2 className="text-lg font-black mb-4">📚 Documentação</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <a href="#" className="bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-all">
              <div className="font-bold">CHECKLIST_COMPLETO.md</div>
              <div className="text-xs text-gray-300 mt-1">Guia de testes (90 min)</div>
            </a>
            <a href="#" className="bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-all">
              <div className="font-bold">FUNCIONALIDADES_IMPLEMENTADAS.md</div>
              <div className="text-xs text-gray-300 mt-1">Lista de features</div>
            </a>
            <a href="#" className="bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-all">
              <div className="font-bold">ECHARTS_GUIDE.md</div>
              <div className="text-xs text-gray-300 mt-1">Guia de gráficos</div>
            </a>
            <a href="#" className="bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-all">
              <div className="font-bold">PPT_EXPORT_GUIDE.md</div>
              <div className="text-xs text-gray-300 mt-1">Exportação PowerPoint</div>
            </a>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            📁 Localização: <code className="bg-white/10 px-2 py-1 rounded">analysisPack/*.md</code>
          </div>
        </div>
      </div>
    </div>
  );
}
