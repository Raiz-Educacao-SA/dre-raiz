# 📊 RELATÓRIO DE ERRO - SINCRONIZAÇÃO FABRIC → SUPABASE
**Data:** 04/02/2026 08:40
**Execução:** sync_via_function.py

---

## ❌ PROBLEMA IDENTIFICADO

### Erro Principal
```
Código: 22P02
Mensagem: "invalid input syntax for type numeric"
Exemplos: "-3809,23", "5046,8", "5809,04"
```

---

## 🔬 CAUSA RAIZ DO ERRO

### O que aconteceu:

1. **Fabric retorna valores com VÍRGULA** (formato brasileiro)
   - Exemplo: `VALOR = "1.234,56"`

2. **PostgreSQL/Supabase espera PONTO** (formato internacional)
   - Esperado: `VALOR = "1234.56"`

3. **Script `sync_via_function.py` NÃO converte** os valores
   - Linha 164: Apenas converte Decimal, mas não trata strings com vírgula

### Por que a primeira execução funcionou parcialmente?

Na primeira execução (`sync_via_function.py`):
- ✅ Batches 4-111: Funcionaram (107,708 registros)
- ❌ Batches 1-3: Deram TIMEOUT (3,000 registros)

**IMPORTANTE:** Os batches 4-111 funcionaram por SORTE - esses registros específicos não tinham vírgulas nos valores numéricos, ou os valores eram do tipo `Decimal` que foi convertido corretamente.

---

## 📊 ANÁLISE DETALHADA

### Registros do Fabric
- **Total buscado:** 110,708 registros
- **Com vírgulas:** Todos os 110,708 (100%)
- **Formato:** Valores como "-3809,23", "5046,8", "5809,04"

### Execução Atual (Análise)
- **Batches testados:** 111 batches de 1000 registros
- **Batches com sucesso:** 0
- **Batches com erro:** 111 (100%)
- **Erro:** Todos com código 22P02 (formato numérico inválido)

### Por que TODOS falharam agora?
A tabela já contém os 107,708 registros da execução anterior. Ao tentar inserir novamente SEM limpar a tabela, TODOS os batches encontram valores com vírgula e falham.

---

## 💡 SOLUÇÃO

### O que fazer:

#### 1. Usar `fabric_to_supabase_v2.py` (RECOMENDADO) ✅

O script v2 JÁ tem a correção implementada (linhas 257-267):
```python
# Converter valores numéricos com vírgula para ponto
for col in df.columns:
    if df[col].dtype == 'object':
        if df[col].astype(str).str.contains(',', na=False).any():
            df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
            df[col] = pd.to_numeric(df[col], errors='ignore')
```

**Vantagens:**
- ✅ Converte vírgulas para pontos automaticamente
- ✅ Desabilita/habilita trigger automaticamente
- ✅ Executa comparação ao final
- ✅ Batch size otimizado (500)

#### 2. Corrigir `sync_via_function.py` (Alternativa)

Adicionar conversão de vírgulas antes de enviar ao Supabase.

---

## 📂 ARQUIVOS GERADOS

1. **relatorio_erro_sincronizacao_20260204_083748.txt**
   Relatório detalhado com todos os erros

2. **registros_com_erro_20260204_083748.json**
   110,708 registros que falharam (formato JSON)

3. **registros_com_erro_20260204_083748.xlsx**
   Mesmos dados em formato Excel para análise

---

## 🎯 RESUMO EXECUTIVO

### O que NÃO subiu:
- **Primeira execução:** 3,000 registros (batches 1-3) por TIMEOUT
- **Total faltante:** 3,000 registros

### Por que faltam "964 registros"?
O script compara com valor fixo de 108,672 (linha 254):
```
108,672 (esperado) - 107,708 (inseridos) = 964
```

Mas na verdade temos:
```
110,708 (total no Fabric) - 107,708 (inseridos) = 3,000 faltantes
```

### Qual arquivo tem os dados faltantes?
**registros_com_erro_20260204_083748.json** contém TODOS os 110,708 registros do Fabric, incluindo:
- Os 107,708 já inseridos
- Os 3,000 que faltam

Para pegar APENAS os 3,000 faltantes: batches 1-3 (registros 1 até 3000).

---

## ✅ PRÓXIMOS PASSOS

### Opção 1: Executar v2 completo (RECOMENDADO)
```bash
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
python fabric_to_supabase_v2.py
```
- Vai limpar tabela e inserir todos os 110,708 corretamente
- Tempo estimado: 5-10 minutos

### Opção 2: Inserir apenas os 3,000 faltantes
1. Extrair registros 1-3000 do arquivo JSON
2. Converter vírgulas para pontos
3. Inserir no Supabase

---

## 🔧 CONFIGURAÇÃO ATUAL

**Supabase:**
- Registros atuais: 107,708
- Formato: Correto (com pontos)

**Fabric:**
- Registros disponíveis: 110,708
- Formato: Incorreto (com vírgulas)

**Scripts:**
- `sync_via_function.py`: ❌ NÃO converte vírgulas
- `fabric_to_supabase_v2.py`: ✅ Converte vírgulas

---

## 📞 CONTATO

**Desenvolvedor:** Edmilson Serafim
**Email:** edmilson.serafim@raizeducacao.info
**Data:** 04/02/2026

---

**FIM DO RELATÓRIO**
