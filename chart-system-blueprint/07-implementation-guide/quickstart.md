# Quickstart — Minimo Viavel

> Implemente um sistema de graficos funcional com o minimo de esforco.

---

## MVP: Grafico interativo a partir de texto

### O que voce precisa:
1. Um service de parsing de dados (CSV/JSON/key-value → estruturado)
2. Uma funcao de IA para interpretar texto → dados estruturados
3. Um componente de grafico (Recharts, ECharts, Chart.js, etc.)
4. Um toggle para ativar/desativar o modo grafico

### Stack minima:
- React + qualquer chart library
- API de LLM (Claude, GPT, etc.)
- 0 backend (tudo client-side)

---

## Passo 1: Crie o parser de dados (30 min)

Implemente uma funcao que aceita string e retorna array de objetos:

```typescript
function parseData(raw: string): { name: string; [key: string]: number | string }[] {
  // 1. Tenta JSON
  // 2. Tenta CSV (detecta delimitador)
  // 3. Tenta key:value
  // 4. Tenta lista simples
}
```

Referencia: `03-services/chart-generator.md` secao "Parsing de Dados"

---

## Passo 2: Crie a interpretacao IA (1h)

Implemente uma funcao que envia texto para LLM e recebe dados estruturados:

```typescript
async function interpretChartData(text: string): Promise<{
  chartType: string;
  title: string;
  data: { name: string; value: number }[];
} | null>
```

Use o system prompt documentado em `03-services/chart-interpret.md`.
Copie o prompt COMPLETO — ele e o coracao do sistema.

---

## Passo 3: Renderize o grafico (30 min)

Com Recharts:
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function SimpleChart({ data, type }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

## Passo 4: Conecte tudo (30 min)

```tsx
function ChatWithCharts() {
  const [chartData, setChartData] = useState(null);
  const [chartEnabled, setChartEnabled] = useState(false);

  async function handleSend(message) {
    if (chartEnabled) {
      const interpretation = await interpretChartData(message);
      if (interpretation) {
        setChartData(interpretation);
        return; // ou mostre junto com a resposta
      }
    }
    // fluxo normal do chat...
  }

  return (
    <div>
      <button onClick={() => setChartEnabled(!chartEnabled)}>
        {chartEnabled ? '📊 Grafico ON' : '📊 Grafico OFF'}
      </button>
      {chartData && <SimpleChart data={chartData.data} type={chartData.chartType} />}
      {/* chat UI... */}
    </div>
  );
}
```

---

## Resultado do MVP

Com ~2h de trabalho voce tem:
- Toggle para ativar modo grafico
- IA interpreta texto e extrai dados
- Grafico interativo renderiza no browser
- Suporte a bar/line/pie basico

Para evoluir para o sistema completo, siga `step-by-step.md`.
