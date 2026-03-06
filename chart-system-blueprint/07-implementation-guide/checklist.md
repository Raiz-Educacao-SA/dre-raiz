# Checklist de Completude

---

## Tier 1 — Interativo

### Parsing de dados
- [ ] Parse JSON (array + objeto unico)
- [ ] Parse CSV (virgula, ponto-virgula, tab)
- [ ] Parse key-value (: e =)
- [ ] Parse lista simples (nome + numero)
- [ ] Normalizacao de JSON (aceita name/label/categoria/category)
- [ ] Conversao de strings numericas para number

### Interpretacao IA
- [ ] System prompt com 4 etapas
- [ ] Chamada ao LLM com temperature 0.1
- [ ] Parse do JSON do response
- [ ] Validacao de chartType contra lista valida
- [ ] Normalizacao de extractedData
- [ ] Validacao de completude (score >= 0.6)
- [ ] Retry automatico se incompleto
- [ ] Validacao contra texto original (veracidade)
- [ ] Remocao de data points com valores inventados

### Deteccao automatica
- [ ] Detecta series numericas
- [ ] Auto-detecta tipo de grafico
- [ ] Gera titulo contextual
- [ ] Gera labels de eixo

### Componente de grafico
- [ ] Bar chart
- [ ] Line chart
- [ ] Area chart
- [ ] Pie chart
- [ ] Composed chart (mix bar/line/area)
- [ ] ResponsiveContainer
- [ ] Tooltip
- [ ] Legend (quando > 1 serie)
- [ ] Grid (opcional)
- [ ] Seletor de tipo
- [ ] Download PNG
- [ ] Fullscreen toggle
- [ ] Loading state
- [ ] Error state

### Integracao no chat
- [ ] Feature toggle (Plus Menu ou equivalente)
- [ ] Permissoes por feature
- [ ] State management (hook ou store)
- [ ] Fluxo: toggle → mensagem → interpretacao → renderizacao
- [ ] Close/reset do grafico

---

## Tier 2 — Executivo

### Backend Python
- [ ] main.py com protocolo stdin/stdout
- [ ] Bar renderer
- [ ] Line renderer
- [ ] Pie renderer
- [ ] Area renderer
- [ ] Waterfall renderer
- [ ] Scatter renderer
- [ ] Grouped bar renderer
- [ ] Stacked bar renderer
- [ ] Heatmap renderer
- [ ] SVG output
- [ ] PNG base64 output
- [ ] Profile/recomendacao de tipo
- [ ] Insights (tendencia, outlier, comparacao)
- [ ] Frases narrativas
- [ ] Compliance checker

### Bridge Node↔Python
- [ ] spawn com stdin/stdout
- [ ] Timeout (30s)
- [ ] Tratamento de exit code != 0
- [ ] Parse de JSON do stdout
- [ ] Captura de stderr (traceback)
- [ ] normalizeChartData()
- [ ] checkPythonEnvironment()

### Modo executivo no frontend
- [ ] Botao "Analise Executiva"
- [ ] Exibicao de SVG sanitizado
- [ ] Exibicao de PNG base64
- [ ] Download SVG
- [ ] Download PNG
- [ ] Seletor de tipo com scores
- [ ] Insights numerados
- [ ] Compliance badges
- [ ] Compliance warnings

### API Routes
- [ ] POST /api/charts/generate
- [ ] POST /api/charts/interpret
- [ ] POST /api/charts/profile
- [ ] POST /api/content-studio/chart
- [ ] GET /api/content-studio/chart (lista tipos)

### Fallback
- [ ] Se Python indisponivel → retorna dados para rendering client-side
- [ ] ECharts builder como alternativa
- [ ] Mensagem amigavel quando servico indisponivel

---

## LLM Tools
- [ ] GenerateChart tool definition + execution
- [ ] ExecutiveChart tool definition + execution
- [ ] Verificacao de ambiente antes de executar

---

## Seguranca
- [ ] DOMPurify para SVG (config com tags SVG permitidas)
- [ ] Sanitizacao de highlights (apenas mark, strong, em)
- [ ] Auth em todas as API routes
- [ ] Validacao Zod nas entradas
- [ ] Timeout no processo Python
- [ ] Nao logar dados sensiveis

---

## Qualidade
- [ ] Testes unitarios do parser
- [ ] Testes unitarios da interpretacao
- [ ] Testes de integracao das API routes
- [ ] Testes E2E do fluxo completo
- [ ] Performance: lazy loading do panel
- [ ] Performance: memoizacao do state
- [ ] Mensagens de erro amigaveis em portugues
- [ ] Formatacao de numeros em pt-BR
