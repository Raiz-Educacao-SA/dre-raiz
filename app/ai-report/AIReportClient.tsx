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
} from "@/analysisPack";

export default function AIReportClient() {
  const [pack, setPack] = useState<AnalysisPack>(mockAnalysisPack);
  const [context, setContext] = useState<AnalysisContext>(getMockContext());
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(true);
  const chartRegistry = useChartRegistry();

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      if (useMock) {
        // Usar dados mock
        setPack(mockAnalysisPack);
        setContext(getMockContext());
      } else {
        // Buscar dados reais
        const ctx = await fetchAnalysisContext({
          scenario: "Real",
        });
        setContext(ctx);

        // Gerar AnalysisPack com IA
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
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      alert("Erro ao gerar relatório. Usando dados mock.");
      setPack(mockAnalysisPack);
      setContext(getMockContext());
    } finally {
      setLoading(false);
    }
  };

  const handleExportPngs = async () => {
    const pngs = await chartRegistry.exportAllPngBase64();
    console.log("Gráficos exportados:", Object.keys(pngs));

    // Download todos os PNGs
    Object.entries(pngs).forEach(([chartId, dataURL]) => {
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `${chartId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleExportPpt = async () => {
    try {
      const pngs = await chartRegistry.exportAllPngBase64();
      await buildPpt({
        pack,
        chartImages: pngs,
        fileName: `Analise-${context.period_label}.pptx`,
      });
    } catch (error) {
      console.error("Erro ao exportar PowerPoint:", error);
      alert("Erro ao exportar PowerPoint");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                🤖 Análise Financeira com IA
              </h1>
              <p className="text-sm text-gray-600">
                {context.org_name} • {context.period_label} • {context.scope_label}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle Mock/Real */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useMock}
                  onChange={(e) => setUseMock(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-700">Usar dados mock</span>
              </label>

              {/* Gerar Relatório */}
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "⏳ Gerando..." : "🔄 Gerar Relatório"}
              </button>

              {/* Exportar PNGs */}
              <button
                onClick={handleExportPngs}
                className="rounded-lg bg-gray-600 px-4 py-2 font-bold text-white hover:bg-gray-700"
              >
                📸 PNGs
              </button>

              {/* Exportar PowerPoint */}
              <button
                onClick={handleExportPpt}
                className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
              >
                📊 PowerPoint
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-4xl">⏳</div>
              <div className="text-lg font-semibold text-gray-900">
                Gerando análise...
              </div>
              <div className="text-sm text-gray-600">
                Processando dados e gerando insights com IA
              </div>
            </div>
          </div>
        ) : (
          <SlideDeck
            pack={pack}
            ctx={context}
            onRegisterChart={chartRegistry.register}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              💡 <strong>{pack.slides.length}</strong> slides •{" "}
              <strong>{pack.charts.length}</strong> gráficos •{" "}
              <strong>{context.kpis.length}</strong> KPIs
            </div>
            <div>
              Desenvolvido com{" "}
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:underline"
              >
                Claude Code
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
