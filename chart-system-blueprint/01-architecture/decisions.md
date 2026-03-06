# Decisoes Arquiteturais

## 1. Por que 2 Tiers?

**Problema**: Usuarios querem feedback rapido, mas tambem precisam de graficos profissionais para apresentacoes.

**Decisao**: Separar em 2 camadas:
- **Tier 1 (Interativo)**: Recharts no browser. Instantaneo (~1-3s incluindo IA).
- **Tier 2 (Executivo)**: Python/matplotlib no servidor. Mais lento (~5-15s) mas com SVG/PNG de alta qualidade, insights automaticos e compliance visual.

**Trade-offs**:
- (+) UX fluida: usuario ve resultado rapido e pode "upgradar" se quiser
- (+) Funciona sem Python (fallback gracioso)
- (-) Duplicacao de logica de renderizacao (JS + Python)
- (-) Complexidade de 2 pipelines

## 2. Por que IA para Interpretacao?

**Problema**: Dados chegam em formatos variados — texto livre, CSV, JSON, bullets, numeros soltos.

**Decisao**: Usar Claude AI como parser universal com prompt especializado de 4 etapas.

**Trade-offs**:
- (+) Funciona com qualquer formato de input
- (+) Detecta automaticamente tipo de grafico ideal
- (+) Gera titulo e labels contextuais
- (-) Custo de API por requisicao
- (-) Latencia adicional (1-2s)
- (-) Possivel alucinacao (mitigada com validacao contra texto original)

## 3. Por que Recharts para Tier 1?

**Alternativas consideradas**: D3.js, Chart.js, ECharts, Victory

**Decisao**: Recharts (com ECharts como fallback no Content Studio)

**Razoes**:
- Recharts: API declarativa React-native, composable, leve
- ECharts: Mais tipos de graficos, melhor para waterfall/heatmap/scatter

## 4. Por que Python via child_process?

**Alternativas**: API REST separada, WebAssembly, Node canvas

**Decisao**: child_process com stdin/stdout JSON

**Razoes**:
- (+) Sem servidor adicional para manter
- (+) Protocolo simples (JSON in → JSON out)
- (+) matplotlib produz graficos superiores a qualquer lib JS
- (+) Ecossistema Python (pandas, numpy) para analise
- (-) Requer Python instalado no servidor
- (-) Latencia de spawn (~200ms)
- (-) Timeout management necessario

## 5. Por que Feature Toggle (Plus Menu)?

**Decisao**: Cada feature do chat e um toggle independente no Plus Menu.

**Razoes**:
- (+) Usuario controla o que esta ativo
- (+) Permissoes granulares por feature
- (+) Nao polui a UX com features nao desejadas
- (-) Mais complexidade no state management

## 6. Sanitizacao SVG

**Decisao**: Usar DOMPurify com config especifica para SVG.

**Razao**: SVG do Python pode conter scripts maliciosos (XSS). DOMPurify remove tags/atributos perigosos mantendo renderizacao correta.

## 7. Validacao de Dados Extraidos

**Decisao**: Dupla validacao — completude + veracidade.

```
1. Completude: Quantos numeros do texto foram extraidos? (score 0-1)
   Se < 60%, retry com prompt explicito listando os numeros encontrados

2. Veracidade: Cada valor no extractedData existe no texto original?
   Remove data points com valores inventados pela IA
```

## 8. Singleton Pattern nos Services

**Decisao**: Services criticos usam singleton (getChartGeneratorService, getChartAgentService).

**Razao**: Evita multiplas instancias, reutiliza estado interno, simplifica testes com mock.
