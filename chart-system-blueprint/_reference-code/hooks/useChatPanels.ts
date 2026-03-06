'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import type { ChartPanelMode } from '../ChartPanel';
import type { ChartExecutiveConfig } from '../ChartExecutivePanel';
import type { SlidesResult } from '../SlidesPreviewPanel';
import type { BrowserAgentResult } from '../BrowserAgentPanel';
import type { HubSpotAnalysisResult } from '@/lib/services/hubspot/analytics.service';
import type { GeneratedImage } from '../GeneratedImagePanel';
import type { OcrResultData } from '../OcrResultPanel';
import type { PendingAttachment } from '../ChatInput';
import type {
  DeepResearchProgress,
  DeepResearchResult,
} from '@/lib/services/deep-research.service';
import { type ChartConfig, type ChartType } from '@/lib/services/generators/chart-generator.service';
import {
  getDataSpecialistService,
  type DataAnalysisResult,
} from '@/lib/services/data-specialist.service';
import { getNlpService, type NlpAnalysisResult } from '@/lib/services/nlp.service';
import { useDashboardGeneration, type DashboardGenerationState } from '../DashboardPreviewPanel';
import type { InfographicResult } from '../InfographicPanel';

export interface ChatPanelsState {
  // Image generation
  generatedImage: GeneratedImage | null;
  isGeneratingImage: boolean;
  imageGenerationError: string | null;
  currentImagePrompt: string;

  // OCR
  ocrResult: OcrResultData | null;
  isProcessingOcr: boolean;
  ocrError: string | null;
  currentOcrImage: string;

  // Chart (unified)
  chartConfig: ChartConfig | null;
  isGeneratingChart: boolean;
  chartError: string | null;
  chartPanelMode: ChartPanelMode;
  executiveChartConfig: ChartExecutiveConfig | null;
  isGeneratingExecutiveChart: boolean;
  executiveChartError: string | null;
  lastChartContent: string;

  // Data analysis
  dataAnalysisResult: DataAnalysisResult | null;
  isAnalyzingData: boolean;
  dataAnalysisError: string | null;

  // NLP
  nlpResult: NlpAnalysisResult | null;
  isAnalyzingNlp: boolean;
  nlpError: string | null;

  // Slides
  slidesResult: SlidesResult | null;
  isGeneratingSlides: boolean;
  slidesError: string | null;

  // Browser agent
  browserAgentResult: BrowserAgentResult | null;
  isExecutingAgent: boolean;
  browserAgentError: string | null;

  // Deep Research
  deepResearchResult: DeepResearchResult | null;
  isResearching: boolean;
  deepResearchProgress: DeepResearchProgress | null;
  deepResearchError: string | null;

  // HubSpot
  hubspotResult: HubSpotAnalysisResult | null;
  isAnalyzingHubspot: boolean;
  hubspotError: string | null;

  // Infographic
  infographicResult: InfographicResult | null;
  isGeneratingInfographic: boolean;
  infographicError: string | null;

  // Document processor
  isDocumentProcessorOpen: boolean;

  // Program preview
  isProgramPreviewOpen: boolean;

  // Dashboard generation
  dashboardData: DashboardGenerationState['dashboardData'];
  isGeneratingDashboard: boolean;
  dashboardError: string | null;
}

export interface ChatPanelsActions {
  // Image generation
  generateImage: (prompt: string) => Promise<void>;
  setGeneratedImageFromAI: (imageData: {
    url?: string;
    base64?: string;
    prompt: string;
    revisedPrompt?: string;
    provider?: string;
    error?: string;
    downloadUrl?: string;
  }) => void;
  setIsGeneratingImage: (val: boolean) => void;
  handleCloseGeneratedImage: () => void;

  // OCR
  processOcr: (attachment: PendingAttachment) => Promise<void>;
  handleCloseOcrResult: () => void;
  handleInsertOcrText: (text: string) => void;

  // Chart
  setGeneratingChart: (flag: boolean) => void;
  onChartGenerated: (
    data:
      | {
          type: string;
          title: string;
          data: unknown[];
          series: unknown[];
          xAxisLabel?: string;
          yAxisLabel?: string;
          showLegend?: boolean;
          showGrid?: boolean;
        }
      | { svg?: string; png_base64?: string; chartType?: string; title?: string },
    isExecutive?: boolean
  ) => void;
  setChartError: (error: string | null) => void;
  handleChangeChartType: (type: ChartType) => void;
  handleRequestExecutiveChart: () => Promise<void>;
  handleChangeExecutiveChartType: (type: string) => Promise<void>;
  handleCloseChart: () => void;

  // Data analysis
  analyzeData: (content: string) => void;
  handleCloseDataAnalysis: () => void;

  // NLP
  analyzeNlp: (content: string) => void;
  handleCloseNlpResults: () => void;

  // Slides
  generateSlides: (content: string, conversationContext?: string) => Promise<void>;
  regenerateSlides: (slides: SlidesResult['slides']) => Promise<void>;
  handleCloseSlidesPreview: () => void;
  setGeneratingSlides: (loading: boolean) => void;
  onSlidesGenerated: (data: {
    slides: unknown[];
    slideCount: number;
    pptxBase64: string;
    filename: string;
    chartSvgs: Record<number, string>;
    downloadId?: string;
    downloadUrl?: string;
  }) => void;
  setSlidesError: (error: string | null) => void;

  // Browser agent
  executeBrowserAgent: (content: string) => Promise<void>;
  handleCloseBrowserAgent: () => void;

  // Deep Research
  executeDeepResearch: (query: string) => Promise<void>;
  handleDeepResearchClarify: (response: string) => Promise<void>;
  handleCancelDeepResearch: () => Promise<void>;
  handleCloseDeepResearch: () => void;

  // HubSpot
  analyzeHubSpot: () => Promise<void>;
  handleCloseHubSpot: () => void;

  // Infographic
  generateInfographic: (content: string) => Promise<void>;
  handleCloseInfographic: () => void;

  // Document processor
  handleOpenDocumentProcessor: () => void;
  handleCloseDocumentProcessor: () => void;

  // Program preview
  handleOpenProgramPreview: () => void;
  handleCloseProgramPreview: () => void;

  // Content insertion callback
  setInsertedContent: (content: string | null) => void;

  // Dashboard generation
  generateDashboard: (prompt: string, context?: string) => Promise<void>;
  handleCloseDashboard: () => void;
  handleRefreshDashboard: (dashboardId: string) => Promise<void>;
}

interface UseChatPanelsOptions {
  threadId?: string;
  threadTitle?: string | null;
  isAdmin?: boolean;
  onInsertContent?: (content: string) => void;
  workspaceId?: string;
  onDashboardGenerated?: (dashboardId: string) => void;
}

export function useChatPanels(
  options: UseChatPanelsOptions = {}
): ChatPanelsState & ChatPanelsActions {
  const { threadId, threadTitle, isAdmin = false, workspaceId, onDashboardGenerated } = options;

  // Dashboard generation hook
  const dashboardGeneration = useDashboardGeneration({
    workspaceId,
    onGenerated: onDashboardGenerated,
  });

  // Image generation state
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  const [currentImagePrompt, setCurrentImagePrompt] = useState<string>('');

  // OCR state
  const [ocrResult, setOcrResult] = useState<OcrResultData | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [currentOcrImage, setCurrentOcrImage] = useState<string>('');

  // Chart state (unified)
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartPanelMode, setChartPanelMode] = useState<ChartPanelMode>('interactive');
  const [executiveChartConfig, setExecutiveChartConfig] = useState<ChartExecutiveConfig | null>(
    null
  );
  const [isGeneratingExecutiveChart, setIsGeneratingExecutiveChart] = useState(false);
  const [executiveChartError, setExecutiveChartError] = useState<string | null>(null);
  const [lastChartContent, setLastChartContent] = useState<string>('');

  // Data analysis state
  const [dataAnalysisResult, setDataAnalysisResult] = useState<DataAnalysisResult | null>(null);
  const [isAnalyzingData, setIsAnalyzingData] = useState(false);
  const [dataAnalysisError, setDataAnalysisError] = useState<string | null>(null);

  // NLP analysis state
  const [nlpResult, setNlpResult] = useState<NlpAnalysisResult | null>(null);
  const [isAnalyzingNlp, setIsAnalyzingNlp] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);

  // Slides generation state
  const [slidesResult, setSlidesResult] = useState<SlidesResult | null>(null);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [slidesError, setSlidesError] = useState<string | null>(null);

  // Reset slides state when thread changes
  useEffect(() => {
    setSlidesResult(null);
    setSlidesError(null);
    setIsGeneratingSlides(false);
  }, [threadId]);

  // Browser agent state
  const [browserAgentResult, setBrowserAgentResult] = useState<BrowserAgentResult | null>(null);
  const [isExecutingAgent, setIsExecutingAgent] = useState(false);
  const [browserAgentError, setBrowserAgentError] = useState<string | null>(null);

  // Deep Research state
  const [deepResearchResult, setDeepResearchResult] = useState<DeepResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [deepResearchProgress, setDeepResearchProgress] = useState<DeepResearchProgress | null>(
    null
  );
  const [deepResearchError, setDeepResearchError] = useState<string | null>(null);

  // HubSpot analytics state
  const [hubspotResult, setHubspotResult] = useState<HubSpotAnalysisResult | null>(null);
  const [isAnalyzingHubspot, setIsAnalyzingHubspot] = useState(false);
  const [hubspotError, setHubspotError] = useState<string | null>(null);

  // Infographic state
  const [infographicResult, setInfographicResult] = useState<InfographicResult | null>(null);
  const [isGeneratingInfographic, setIsGeneratingInfographic] = useState(false);
  const [infographicError, setInfographicError] = useState<string | null>(null);

  // Document processor state
  const [isDocumentProcessorOpen, setIsDocumentProcessorOpen] = useState(false);

  // Program preview state
  const [isProgramPreviewOpen, setIsProgramPreviewOpen] = useState(false);

  // Content insertion state
  const [_insertedContent, setInsertedContent] = useState<string | null>(null);

  // ==================== IMAGE GENERATION ====================
  const generateImage = useCallback(async (prompt: string) => {
    setIsGeneratingImage(true);
    setImageGenerationError(null);
    setCurrentImagePrompt(prompt);

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const result = await response.json();

      if (!result.success) {
        setImageGenerationError(result.error?.message || 'Falha ao gerar imagem');
        return;
      }

      setGeneratedImage({
        url: result.data.imageUrl,
        base64: result.data.imageBase64,
        prompt,
        revisedPrompt: result.data.revisedPrompt,
        provider: result.data.provider,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error generating image:', err);
      setImageGenerationError(err instanceof Error ? err.message : 'Falha ao gerar imagem');
    } finally {
      setIsGeneratingImage(false);
      setCurrentImagePrompt('');
    }
  }, []);

  const handleCloseGeneratedImage = useCallback(() => {
    setGeneratedImage(null);
    setImageGenerationError(null);
    setIsGeneratingImage(false);
    setCurrentImagePrompt('');
  }, []);

  // Set generated image from AI tool (without calling API)
  const setGeneratedImageFromAI = useCallback(
    (imageData: {
      url?: string;
      base64?: string;
      prompt: string;
      revisedPrompt?: string;
      provider?: string;
      error?: string;
      downloadUrl?: string;
    }) => {
      if (imageData.error) {
        // Show error state in panel
        setImageGenerationError(imageData.error);
        setCurrentImagePrompt(imageData.prompt);
        setGeneratedImage(null);
      } else {
        setGeneratedImage({
          // Use downloadUrl as image source when base64 was stripped
          url: imageData.url || imageData.downloadUrl,
          base64: imageData.base64,
          prompt: imageData.prompt,
          revisedPrompt: imageData.revisedPrompt,
          provider: imageData.provider as 'openai' | 'google' | undefined,
          generatedAt: new Date().toISOString(),
        });
        setImageGenerationError(null);
      }
      setIsGeneratingImage(false);
    },
    []
  );

  // ==================== OCR ====================
  const processOcr = useCallback(async (attachment: PendingAttachment) => {
    setIsProcessingOcr(true);
    setOcrError(null);
    setCurrentOcrImage(attachment.file.name);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(attachment.file);
      });

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: attachment.mimeType,
          language: 'pt-BR',
          mode: 'text',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setOcrError(result.error?.message || 'Falha ao extrair texto');
        return;
      }

      setOcrResult({
        text: result.data.text,
        structured: result.data.structured,
        confidence: result.data.confidence,
        processingTime: result.data.processingTime,
        imageName: attachment.file.name,
        extractedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error processing OCR:', err);
      setOcrError(err instanceof Error ? err.message : 'Falha ao extrair texto');
    } finally {
      setIsProcessingOcr(false);
      setCurrentOcrImage('');
    }
  }, []);

  const handleCloseOcrResult = useCallback(() => {
    setOcrResult(null);
    setOcrError(null);
    setIsProcessingOcr(false);
    setCurrentOcrImage('');
  }, []);

  const handleInsertOcrText = useCallback(
    (text: string) => {
      setInsertedContent(text);
      handleCloseOcrResult();
    },
    [handleCloseOcrResult]
  );

  // ==================== CHART ====================
  const setGeneratingChart = useCallback((flag: boolean) => {
    setIsGeneratingChart(flag);
    if (flag) {
      setChartConfig(null);
      setChartError(null);
      setChartPanelMode('interactive');
    }
  }, []);

  const onChartGenerated = useCallback(
    (
      data:
        | {
            type: string;
            title: string;
            data: unknown[];
            series: unknown[];
            xAxisLabel?: string;
            yAxisLabel?: string;
            showLegend?: boolean;
            showGrid?: boolean;
          }
        | { svg?: string; png_base64?: string; chartType?: string; title?: string },
      isExecutive?: boolean
    ) => {
      if (isExecutive || ('svg' in data && data.svg) || ('png_base64' in data && data.png_base64)) {
        const execData = data as {
          svg?: string;
          png_base64?: string;
          chartType?: string;
          title?: string;
        };
        setExecutiveChartConfig({
          success: true,
          chart_type: execData.chartType,
          svg: execData.svg,
          png_base64: execData.png_base64,
        });
        setChartPanelMode('executive');
      } else {
        setChartConfig(data as unknown as ChartConfig);
      }
      setIsGeneratingChart(false);
      setChartError(null);
    },
    []
  );

  const setChartErrorCallback = useCallback((error: string | null) => {
    setChartError(error);
  }, []);

  const handleChangeChartType = useCallback(
    (type: ChartType) => {
      if (chartConfig) {
        setChartConfig({ ...chartConfig, type });
      }
    },
    [chartConfig]
  );

  const handleRequestExecutiveChart = useCallback(async () => {
    // Use structured chart data
    const structuredData = chartConfig?.data;
    if (!structuredData || structuredData.length === 0) {
      setExecutiveChartError('Nenhum dado estruturado disponivel para gerar analise executiva');
      return;
    }

    setIsGeneratingExecutiveChart(true);
    setExecutiveChartError(null);

    try {
      const response = await fetch('/api/charts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: structuredData,
          chartType: chartConfig?.type,
          title: chartConfig?.title || threadTitle || 'Grafico Executivo',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setExecutiveChartError(result.error || 'Falha ao gerar analise executiva');
        return;
      }

      setExecutiveChartConfig(result);
      setChartPanelMode('executive');
    } catch (err) {
      console.error('Error generating executive chart:', err);
      setExecutiveChartError(
        err instanceof Error ? err.message : 'Falha ao gerar analise executiva'
      );
    } finally {
      setIsGeneratingExecutiveChart(false);
    }
  }, [chartConfig, threadTitle]);

  const handleChangeExecutiveChartType = useCallback(
    async (type: string) => {
      if (!executiveChartConfig) return;

      setIsGeneratingExecutiveChart(true);
      setExecutiveChartError(null);

      try {
        const response = await fetch('/api/charts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: executiveChartConfig,
            chartType: type,
            title: threadTitle || 'Grafico Executivo',
          }),
        });

        const result = await response.json();

        if (!result.success) {
          setExecutiveChartError(result.error || 'Falha ao alterar tipo de grafico');
          return;
        }

        setExecutiveChartConfig(result);
      } catch (err) {
        console.error('Error changing executive chart type:', err);
        setExecutiveChartError(
          err instanceof Error ? err.message : 'Falha ao alterar tipo de grafico'
        );
      } finally {
        setIsGeneratingExecutiveChart(false);
      }
    },
    [executiveChartConfig, threadTitle]
  );

  const handleCloseChart = useCallback(() => {
    setChartConfig(null);
    setChartError(null);
    setIsGeneratingChart(false);
    setExecutiveChartConfig(null);
    setExecutiveChartError(null);
    setIsGeneratingExecutiveChart(false);
    setChartPanelMode('interactive');
    setLastChartContent('');
  }, []);

  // ==================== DATA ANALYSIS ====================
  const analyzeData = useCallback((content: string) => {
    setIsAnalyzingData(true);
    setDataAnalysisError(null);

    setTimeout(() => {
      try {
        const dataService = getDataSpecialistService();
        const result = dataService.analyzeData({
          rawData: content,
          includeCorrelations: true,
          detectOutliers: true,
        });

        if (!result.success) {
          setDataAnalysisError(result.error || 'Nao foi possivel analisar os dados.');
          return;
        }

        setDataAnalysisResult(result);
      } catch (err) {
        console.error('Error analyzing data:', err);
        setDataAnalysisError(err instanceof Error ? err.message : 'Falha ao analisar dados');
      } finally {
        setIsAnalyzingData(false);
      }
    }, 100);
  }, []);

  const handleCloseDataAnalysis = useCallback(() => {
    setDataAnalysisResult(null);
    setDataAnalysisError(null);
    setIsAnalyzingData(false);
  }, []);

  // ==================== NLP ====================
  const analyzeNlp = useCallback((content: string) => {
    setIsAnalyzingNlp(true);
    setNlpError(null);

    setTimeout(() => {
      try {
        const nlpService = getNlpService();
        const result = nlpService.analyzeText({ text: content });

        if (!result.success) {
          setNlpError(result.error || 'Nao foi possivel analisar o texto.');
          return;
        }

        setNlpResult(result);
      } catch (err) {
        console.error('Error analyzing text with NLP:', err);
        setNlpError(err instanceof Error ? err.message : 'Falha ao analisar texto');
      } finally {
        setIsAnalyzingNlp(false);
      }
    }, 100);
  }, []);

  const handleCloseNlpResults = useCallback(() => {
    setNlpResult(null);
    setNlpError(null);
    setIsAnalyzingNlp(false);
  }, []);

  // ==================== SLIDES ====================
  const generateSlides = useCallback(
    async (content: string, conversationContext?: string) => {
      setIsGeneratingSlides(true);
      setSlidesError(null);
      setSlidesResult(null);

      try {
        const response = await fetch('/api/generate/slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            title: threadTitle || 'Apresentacao',
            conversationContext,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          setSlidesError(result.error?.message || 'Falha ao gerar apresentacao');
          return;
        }

        setSlidesResult({
          slides: result.data.slides,
          slideCount: result.data.slideCount,
          pptxBase64: result.data.pptxBase64,
          filename: result.data.filename,
          chartSvgs: result.data.chartSvgs || {},
        });
      } catch (err) {
        console.error('Error generating slides:', err);
        setSlidesError(err instanceof Error ? err.message : 'Falha ao gerar apresentacao');
      } finally {
        setIsGeneratingSlides(false);
      }
    },
    [threadTitle]
  );

  const handleCloseSlidesPreview = useCallback(() => {
    setSlidesResult(null);
    setSlidesError(null);
    setIsGeneratingSlides(false);
  }, []);

  const regenerateSlides = useCallback(
    async (slides: SlidesResult['slides']) => {
      try {
        const response = await fetch('/api/generate/slides', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slides,
            title: threadTitle || 'Apresentacao',
          }),
        });

        const result = await response.json();

        if (result.success) {
          setSlidesResult({
            slides: result.data.slides,
            slideCount: result.data.slideCount,
            pptxBase64: result.data.pptxBase64,
            filename: result.data.filename,
            chartSvgs: slidesResult?.chartSvgs || {},
          });
        }
      } catch (err) {
        console.error('Error regenerating slides:', err);
      }
    },
    [threadTitle, slidesResult?.chartSvgs]
  );

  const setGeneratingSlides = useCallback((loading: boolean) => {
    setIsGeneratingSlides(loading);
    if (loading) {
      setSlidesError(null);
      setSlidesResult(null);
    }
  }, []);

  const onSlidesGenerated = useCallback(
    (data: {
      slides: unknown[];
      slideCount: number;
      pptxBase64: string;
      filename: string;
      chartSvgs: Record<number, string>;
      downloadId?: string;
      downloadUrl?: string;
    }) => {
      setSlidesResult({
        slides: data.slides as SlidesResult['slides'],
        slideCount: data.slideCount,
        pptxBase64: data.pptxBase64,
        filename: data.filename,
        chartSvgs: data.chartSvgs,
        downloadId: data.downloadId,
        downloadUrl: data.downloadUrl,
      });
      setIsGeneratingSlides(false);
      setSlidesError(null);
    },
    []
  );

  // ==================== INFOGRAPHIC ====================
  const generateInfographic = useCallback(async (content: string) => {
    setIsGeneratingInfographic(true);
    setInfographicError(null);

    try {
      const response = await fetch('/api/infographic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();

      if (!result.success) {
        setInfographicError(result.error?.message || 'Falha ao gerar infografico');
        return;
      }

      // New API returns structured data for client-side rendering
      // Old API returned svg/png_base64 from Python (still supported as fallback)
      const hasStructuredData = result.data.layout && result.data.sections;
      setInfographicResult({
        svg: result.data.svg,
        pngBase64: result.data.png_base64,
        title: result.data.title || 'Infografico',
        generatedAt: new Date().toISOString(),
        structuredData: hasStructuredData
          ? {
              title: result.data.title,
              subtitle: result.data.subtitle,
              layout: result.data.layout,
              style: result.data.style,
              sections: result.data.sections,
              footer: result.data.footer,
            }
          : undefined,
      });
    } catch (err) {
      console.error('Error generating infographic:', err);
      setInfographicError(err instanceof Error ? err.message : 'Falha ao gerar infografico');
    } finally {
      setIsGeneratingInfographic(false);
    }
  }, []);

  const handleCloseInfographic = useCallback(() => {
    setInfographicResult(null);
    setInfographicError(null);
    setIsGeneratingInfographic(false);
  }, []);

  // ==================== BROWSER AGENT ====================
  const executeBrowserAgent = useCallback(async (content: string) => {
    setIsExecutingAgent(true);
    setBrowserAgentError(null);

    try {
      const urlMatch = content.match(/https?:\/\/[^\s]+/);
      const startUrl = urlMatch ? urlMatch[0] : undefined;

      const response = await fetch('/api/browser-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: content,
          startUrl,
          maxActions: 5,
        }),
      });

      const result = await response.json();

      if (!result.success && !result.data) {
        setBrowserAgentError(result.error?.message || 'Falha ao executar agente');
        return;
      }

      setBrowserAgentResult({
        actions: result.data.actions,
        extractedData: result.data.extractedData,
        screenshot: result.data.screenshot,
        session: result.data.session,
      });
    } catch (err) {
      console.error('Error executing browser agent:', err);
      setBrowserAgentError(err instanceof Error ? err.message : 'Falha ao executar agente');
    } finally {
      setIsExecutingAgent(false);
    }
  }, []);

  const handleCloseBrowserAgent = useCallback(() => {
    setBrowserAgentResult(null);
    setBrowserAgentError(null);
    setIsExecutingAgent(false);
  }, []);

  // ==================== DEEP RESEARCH ====================
  const executeDeepResearch = useCallback(
    async (query: string) => {
      if (!isAdmin) {
        console.warn('Deep Research requires admin access');
        return;
      }

      setIsResearching(true);
      setDeepResearchError(null);
      setDeepResearchProgress(null);
      setDeepResearchResult(null);

      try {
        const response = await fetch('/api/deep-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        const result = await response.json();

        if (!result.success) {
          setDeepResearchError(result.error?.message || 'Falha ao iniciar pesquisa');
          setIsResearching(false);
          return;
        }

        setDeepResearchResult({
          id: result.data.id,
          query: result.data.query,
          status: result.data.status,
          created_at: new Date(result.data.created_at),
        } as DeepResearchResult);

        const streamUrl = result.data.streamUrl;
        const eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'progress') {
              setDeepResearchProgress({
                status: data.status,
                step: data.step,
                message: data.message,
                progress: data.progress,
                timestamp: new Date(data.timestamp),
              });
            }

            if (data.type === 'complete' || data.type === 'error') {
              setDeepResearchResult((prev) => ({
                ...prev!,
                status: data.status,
                final_report: data.final_report,
                research_brief: data.research_brief,
                raw_notes: data.raw_notes,
                error: data.error,
                duration: data.duration,
                completed_at: new Date(),
              }));
              setIsResearching(false);
              eventSource.close();
            }
          } catch (err) {
            console.error('Error parsing SSE event:', err);
          }
        };

        eventSource.onerror = () => {
          setDeepResearchError('Conexao perdida com o servidor de pesquisa');
          setIsResearching(false);
          eventSource.close();
        };
      } catch (err) {
        console.error('Error executing deep research:', err);
        setDeepResearchError(err instanceof Error ? err.message : 'Falha ao iniciar pesquisa');
        setIsResearching(false);
      }
    },
    [isAdmin]
  );

  const handleDeepResearchClarify = useCallback(
    async (response: string) => {
      if (!deepResearchResult?.id) return;

      try {
        const res = await fetch(`/api/deep-research/${deepResearchResult.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response }),
        });

        const result = await res.json();

        if (!result.success) {
          setDeepResearchError(result.error?.message || 'Falha ao enviar clarificacao');
        }
      } catch (err) {
        console.error('Error submitting clarification:', err);
        setDeepResearchError(err instanceof Error ? err.message : 'Falha ao enviar clarificacao');
      }
    },
    [deepResearchResult?.id]
  );

  const handleCancelDeepResearch = useCallback(async () => {
    if (!deepResearchResult?.id) return;

    try {
      await fetch(`/api/deep-research/${deepResearchResult.id}`, { method: 'DELETE' });

      setIsResearching(false);
      setDeepResearchResult((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: 'Pesquisa cancelada pelo usuario',
            }
          : null
      );
    } catch (err) {
      console.error('Error cancelling research:', err);
    }
  }, [deepResearchResult?.id]);

  const handleCloseDeepResearch = useCallback(() => {
    setDeepResearchResult(null);
    setDeepResearchProgress(null);
    setDeepResearchError(null);
    setIsResearching(false);
  }, []);

  // ==================== HUBSPOT ====================
  const analyzeHubSpot = useCallback(async () => {
    setIsAnalyzingHubspot(true);
    setHubspotError(null);
    setHubspotResult(null);

    try {
      const response = await fetch('/api/hubspot/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType: 'overview',
          includeStalled: true,
          stalledDaysThreshold: 14,
          recentContactsLimit: 10,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setHubspotError(result.error?.message || 'Falha ao analisar HubSpot');
        return;
      }

      setHubspotResult(result.data);
    } catch (err) {
      console.error('Error analyzing HubSpot:', err);
      setHubspotError(err instanceof Error ? err.message : 'Falha ao analisar HubSpot');
    } finally {
      setIsAnalyzingHubspot(false);
    }
  }, []);

  const handleCloseHubSpot = useCallback(() => {
    setHubspotResult(null);
    setHubspotError(null);
    setIsAnalyzingHubspot(false);
  }, []);

  // ==================== DOCUMENT PROCESSOR ====================
  const handleOpenDocumentProcessor = useCallback(() => {
    setIsDocumentProcessorOpen(true);
  }, []);

  const handleCloseDocumentProcessor = useCallback(() => {
    setIsDocumentProcessorOpen(false);
  }, []);

  // ==================== PROGRAM PREVIEW ====================
  const handleOpenProgramPreview = useCallback(() => {
    setIsProgramPreviewOpen(true);
  }, []);

  const handleCloseProgramPreview = useCallback(() => {
    setIsProgramPreviewOpen(false);
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  // Group by domain for better stability
  return useMemo(
    () => ({
      // Image generation state
      generatedImage,
      isGeneratingImage,
      imageGenerationError,
      currentImagePrompt,

      // OCR state
      ocrResult,
      isProcessingOcr,
      ocrError,
      currentOcrImage,

      // Chart state
      chartConfig,
      isGeneratingChart,
      chartError,
      chartPanelMode,
      executiveChartConfig,
      isGeneratingExecutiveChart,
      executiveChartError,
      lastChartContent,

      // Data analysis state
      dataAnalysisResult,
      isAnalyzingData,
      dataAnalysisError,

      // NLP state
      nlpResult,
      isAnalyzingNlp,
      nlpError,

      // Slides state
      slidesResult,
      isGeneratingSlides,
      slidesError,

      // Browser agent state
      browserAgentResult,
      isExecutingAgent,
      browserAgentError,

      // Deep Research state
      deepResearchResult,
      isResearching,
      deepResearchProgress,
      deepResearchError,

      // HubSpot state
      hubspotResult,
      isAnalyzingHubspot,
      hubspotError,

      // Infographic state
      infographicResult,
      isGeneratingInfographic,
      infographicError,

      // Document processor state
      isDocumentProcessorOpen,

      // Program preview state
      isProgramPreviewOpen,

      // Actions
      generateImage,
      setGeneratedImageFromAI,
      setIsGeneratingImage,
      handleCloseGeneratedImage,
      processOcr,
      handleCloseOcrResult,
      handleInsertOcrText,
      setGeneratingChart,
      onChartGenerated,
      setChartError: setChartErrorCallback,
      handleChangeChartType,
      handleRequestExecutiveChart,
      handleChangeExecutiveChartType,
      handleCloseChart,
      analyzeData,
      handleCloseDataAnalysis,
      analyzeNlp,
      handleCloseNlpResults,
      generateSlides,
      regenerateSlides,
      handleCloseSlidesPreview,
      setGeneratingSlides,
      onSlidesGenerated,
      setSlidesError,
      generateInfographic,
      handleCloseInfographic,
      executeBrowserAgent,
      handleCloseBrowserAgent,
      executeDeepResearch,
      handleDeepResearchClarify,
      handleCancelDeepResearch,
      handleCloseDeepResearch,
      analyzeHubSpot,
      handleCloseHubSpot,
      handleOpenDocumentProcessor,
      handleCloseDocumentProcessor,
      handleOpenProgramPreview,
      handleCloseProgramPreview,
      setInsertedContent,

      // Dashboard generation
      dashboardData: dashboardGeneration.dashboardData,
      isGeneratingDashboard: dashboardGeneration.isGenerating,
      dashboardError: dashboardGeneration.error,
      generateDashboard: dashboardGeneration.generateDashboard,
      handleCloseDashboard: dashboardGeneration.clearDashboard,
      handleRefreshDashboard: dashboardGeneration.refreshData,
    }),
    [
      // Image generation deps
      generatedImage,
      isGeneratingImage,
      imageGenerationError,
      currentImagePrompt,
      generateImage,
      setGeneratedImageFromAI,
      handleCloseGeneratedImage,

      // OCR deps
      ocrResult,
      isProcessingOcr,
      ocrError,
      currentOcrImage,
      processOcr,
      handleCloseOcrResult,
      handleInsertOcrText,

      // Chart deps
      chartConfig,
      isGeneratingChart,
      chartError,
      chartPanelMode,
      executiveChartConfig,
      isGeneratingExecutiveChart,
      executiveChartError,
      lastChartContent,
      setGeneratingChart,
      onChartGenerated,
      setChartErrorCallback,
      handleChangeChartType,
      handleRequestExecutiveChart,
      handleChangeExecutiveChartType,
      handleCloseChart,

      // Data analysis deps
      dataAnalysisResult,
      isAnalyzingData,
      dataAnalysisError,
      analyzeData,
      handleCloseDataAnalysis,

      // NLP deps
      nlpResult,
      isAnalyzingNlp,
      nlpError,
      analyzeNlp,
      handleCloseNlpResults,

      // Slides deps
      slidesResult,
      isGeneratingSlides,
      slidesError,
      generateSlides,
      regenerateSlides,
      handleCloseSlidesPreview,
      setGeneratingSlides,
      onSlidesGenerated,

      // Infographic deps
      infographicResult,
      isGeneratingInfographic,
      infographicError,
      generateInfographic,
      handleCloseInfographic,

      // Browser agent deps
      browserAgentResult,
      isExecutingAgent,
      browserAgentError,
      executeBrowserAgent,
      handleCloseBrowserAgent,

      // Deep Research deps
      deepResearchResult,
      isResearching,
      deepResearchProgress,
      deepResearchError,
      executeDeepResearch,
      handleDeepResearchClarify,
      handleCancelDeepResearch,
      handleCloseDeepResearch,

      // HubSpot deps
      hubspotResult,
      isAnalyzingHubspot,
      hubspotError,
      analyzeHubSpot,
      handleCloseHubSpot,

      // Document processor deps
      isDocumentProcessorOpen,
      handleOpenDocumentProcessor,
      handleCloseDocumentProcessor,

      // Program preview deps
      isProgramPreviewOpen,
      handleOpenProgramPreview,
      handleCloseProgramPreview,

      // Misc deps
      setInsertedContent,

      // Dashboard generation deps
      dashboardGeneration.dashboardData,
      dashboardGeneration.isGenerating,
      dashboardGeneration.error,
      dashboardGeneration.generateDashboard,
      dashboardGeneration.clearDashboard,
      dashboardGeneration.refreshData,
    ]
  );
}
