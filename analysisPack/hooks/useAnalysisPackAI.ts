import { useState, useCallback } from 'react';
import type { AnalysisPack, AnalysisContext } from '../../types';

interface UseAnalysisPackAIReturn {
  analysisPack: AnalysisPack | null;
  loading: boolean;
  error: string | null;
  generate: (context: AnalysisContext) => Promise<void>;
  reset: () => void;
}

/**
 * Hook para gerar AnalysisPack usando IA via API endpoint
 */
export function useAnalysisPackAI(): UseAnalysisPackAIReturn {
  const [analysisPack, setAnalysisPack] = useState<AnalysisPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (context: AnalysisContext) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/llm-proxy?action=generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Erro ao gerar análise');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido ao gerar análise');
      }

      setAnalysisPack(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao gerar análise com IA:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalysisPack(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    analysisPack,
    loading,
    error,
    generate,
    reset,
  };
}
