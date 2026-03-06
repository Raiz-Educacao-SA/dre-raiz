# Setup do Backend Python

---

## Estrutura Esperada

```
ceo_grafico/
├── main.py              # Entry point — le stdin JSON, processa, escreve stdout JSON
├── requirements.txt     # Dependencias Python
├── renderers/           # Renderers por tipo de grafico
│   ├── bar.py
│   ├── line.py
│   ├── pie.py
│   ├── waterfall.py
│   ├── scatter.py
│   ├── heatmap.py
│   └── ...
├── profiler.py          # Analise e recomendacao de tipo
├── insights.py          # Geracao de insights
├── compliance.py        # Verificacao de compliance visual
└── utils/
    ├── colors.py        # Paleta de cores
    └── formatters.py    # Formatacao pt-BR
```

---

## requirements.txt (minimo)

```
matplotlib>=3.7
pandas>=2.0
numpy>=1.24
pyyaml>=6.0
```

---

## Instalacao

```bash
cd ceo_grafico/
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

---

## main.py — Estrutura Minima

```python
#!/usr/bin/env python3
"""CEO_GRAFICO — Chart generation engine"""

import sys
import json
import io
import base64
import matplotlib
matplotlib.use('Agg')  # Backend nao-interativo
import matplotlib.pyplot as plt
import pandas as pd

def main():
    # Ler request do stdin
    request_str = sys.stdin.read()
    request = json.loads(request_str)

    action = request.get('action', 'generate')
    data = request.get('data', [])
    chart_type = request.get('chart_type', 'bar')
    title = request.get('title', 'Grafico')
    options = request.get('options', {})

    try:
        if action == 'generate':
            result = generate_chart(data, chart_type, title, options)
        elif action == 'profile':
            result = profile_data(data)
        elif action == 'insights':
            result = generate_insights(data)
        else:
            result = {'success': False, 'error': f'Acao desconhecida: {action}'}
    except Exception as e:
        import traceback
        result = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }

    # Escrever response no stdout
    json.dump(result, sys.stdout, ensure_ascii=False)
    sys.stdout.flush()

def generate_chart(data, chart_type, title, options):
    df = pd.DataFrame(data)

    figsize = tuple(options.get('figsize', [10, 6]))
    dpi = options.get('dpi', 150)
    colors = options.get('colors', ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'])

    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    # Renderizar baseado no tipo
    if chart_type in ('bar', 'bar_chart'):
        render_bar(ax, df, colors, options)
    elif chart_type == 'line':
        render_line(ax, df, colors, options)
    elif chart_type == 'pie':
        render_pie(ax, df, colors, options)
    # ... outros tipos

    ax.set_title(title, fontsize=14, fontweight='bold', pad=15)

    if options.get('show_grid', True):
        ax.grid(True, alpha=0.3)

    plt.tight_layout()

    # Converter para SVG
    svg_buffer = io.StringIO()
    fig.savefig(svg_buffer, format='svg', bbox_inches='tight')
    svg = svg_buffer.getvalue()

    # Converter para PNG base64
    png_buffer = io.BytesIO()
    fig.savefig(png_buffer, format='png', bbox_inches='tight', dpi=dpi)
    png_buffer.seek(0)
    png_base64 = 'data:image/png;base64,' + base64.b64encode(png_buffer.read()).decode()

    plt.close(fig)

    return {
        'success': True,
        'chart_type': chart_type,
        'svg': svg,
        'png_base64': png_base64,
        'insights': [],
        'phrases': [],
        'recommendations': [],
        'compliance': {
            'passed': True,
            'checks': [],
            'warnings': [],
            'errors': []
        }
    }

def render_bar(ax, df, colors, options):
    name_col = df.columns[0]
    value_cols = [c for c in df.columns if c != name_col and pd.api.types.is_numeric_dtype(df[c])]
    x = range(len(df))
    for i, col in enumerate(value_cols):
        ax.bar(x, df[col], color=colors[i % len(colors)], label=col)
    ax.set_xticks(x)
    ax.set_xticklabels(df[name_col], rotation=45, ha='right')
    if options.get('show_values', False):
        for i, col in enumerate(value_cols):
            for j, val in enumerate(df[col]):
                ax.text(j, val, f'{val:,.0f}', ha='center', va='bottom', fontsize=9)

def render_line(ax, df, colors, options):
    name_col = df.columns[0]
    value_cols = [c for c in df.columns if c != name_col and pd.api.types.is_numeric_dtype(df[c])]
    for i, col in enumerate(value_cols):
        ax.plot(df[name_col], df[col], color=colors[i % len(colors)], marker='o', label=col)

def render_pie(ax, df, colors, options):
    name_col = df.columns[0]
    value_col = [c for c in df.columns if c != name_col and pd.api.types.is_numeric_dtype(df[c])][0]
    ax.pie(df[value_col], labels=df[name_col], colors=colors[:len(df)],
           autopct='%1.1f%%', startangle=90)

def profile_data(data):
    df = pd.DataFrame(data)
    return {'success': True, 'profile': {}, 'recommendations': []}

def generate_insights(data):
    return {'success': True, 'insights': [], 'phrases': []}

if __name__ == '__main__':
    main()
```

---

## Variavel de Ambiente

```
PYTHON_CMD=python3    # Ou 'python' no Windows
```

O service Node.js usa esta variavel para saber qual comando executar.

---

## Teste Manual

```bash
echo '{"action":"generate","data":[{"name":"A","value":10},{"name":"B","value":20}],"chart_type":"bar","title":"Test"}' | python3 ceo_grafico/main.py | python3 -m json.tool
```
