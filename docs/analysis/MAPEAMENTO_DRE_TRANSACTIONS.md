# 📊 Mapeamento: Transactions → DRE Gerencial

## Objetivo
Este documento mapeia como os dados da tabela `transactions` alimentam a guia "DRE Gerencial" em tempo real.

---

## 🔗 Campos Mapeados

### 1. Linha da DRE (Hierarquia)
- **Campo:** `conta_contabil` (string)
- **Uso:** Define qual linha da hierarquia DRE esta transação pertence
- **Exemplo:** `"Mensalidades"` → Linha "Mensalidades" dentro de "01.1 RECEITAS ACADÊMICAS"

### 2. Cenário (Coluna de Dados)
- **Campo:** `scenario` (string)
- **Valores:** `"Real"`, `"Orçado"`, `"A-1"` (ano anterior)
- **Uso:** Define a coluna de dados na DRE
- **Normalização:** `"Original"` → `"Real"`, `undefined` → `"Real"`
- **Tabelas:**
  - Real → `transactions`
  - Orçado → `transactions_orcado`
  - A-1 → `transactions_ano_anterior`

### 3. Valor (Agregação)
- **Campo:** `amount` (number)
- **Uso:** Valor em R$ que será somado por mês/cenário
- **Agregação:** `SUM(amount) GROUP BY scenario, conta_contabil, MONTH(date)`

### 4. Mês (Período)
- **Campo:** `date` (string YYYY-MM-DD)
- **Uso:** Extrai mês (0-11) para colunas JAN-DEZ
- **Parse:** `new Date(date).getMonth()`

### 5. Filtros Superiores

| Filtro DRE | Campo `transactions` | Tipo | Valores |
|---|---|---|---|
| tag01 | `tag01` | Multi-select | Valores livres (ex: tag01_comercial, tag01_pedagogico) |
| tag02 | `tag02` | Multi-select | Valores livres (ex: tag02_segmento1) |
| tag03 | `tag03` | Multi-select | Valores livres (ex: tag03_projeto1) |
| CC (Centro de Custo) | `category` | Multi-select | CC Comercial, CC Pedagógico, CC RH, etc |
| Marca | `marca` | Multi-select | AP, CGS, CLV, GT, MT, QI, SAP, SD, SP, UN |
| Filial | `filial` | Multi-select | Dependente de Marca selecionada |

### 6. Drill-down Dinâmico

| Nível | Campo `transactions` | Label na DRE |
|---|---|---|
| Nível 3 | `conta_contabil` | Categoria específica |
| Nível 4 | `tag01` | tag01 |
| Nível 5 | `tag02` | tag02 |
| Nível 6 | `tag03` | tag03 |
| Nível 7 | `category` | CC (Centro de Custo) |
| Nível 8 | `marca` | Marca |
| Nível 9 | `filial` | Unidade |
| Nível 10 | `vendor` | Fornecedor |
| Nível 11 | `ticket` | Ticket |

---

## 📐 Estrutura Hierárquica da DRE

```
NÍVEL 1 (5 linhas principais - FIXAS):
├─ 01. RECEITA LÍQUIDA
├─ 02. CUSTOS VARIÁVEIS
├─ 03. CUSTOS FIXOS
├─ 04. DESPESAS ADM (SG&A)
└─ 05. RATEIO CSC  ← NOVO!

NÍVEL 2 (CONFIGURÁVEL pelo Admin - vem do banco dre_hierarchy):
├─ 01.1 RECEITAS ACADÊMICAS
├─ 01.2 RECEITAS EXTRAS
├─ 01.3 DEDUÇÕES (TRIBUTOS)
├─ 02.1 PESSOAL DOCENTE
├─ 02.2 INSUMOS OPERACIONAIS
├─ 03.1 INFRAESTRUTURA
├─ 03.2 MANUTENÇÃO
├─ 04.1 COMERCIAL & MKT
├─ 04.2 CORPORATIVO
└─ 05.1 RATEIOS INTERNOS  ← NOVO!

NÍVEL 3 (Categorias - conta_contabil):
  Exemplos:
  - Mensalidades, Matrículas, Integral (dentro de 01.1)
  - Salários Professores, Encargos Profs (dentro de 02.1)
  - Aluguel Imóveis, IPTU, Seguros (dentro de 03.1)
  - Google Ads, Redes Sociais (dentro de 04.1)
  - Rateio TI, Rateio RH, Rateio Financeiro (dentro de 05.1)
```

---

## 🔄 Fluxo de Dados Realtime

```
1. Usuário abre DRE Gerencial
   ↓
2. App.tsx usa useTransactions() hook
   ↓
3. TransactionsContext carrega dados (applyFilters)
   ↓
4. Subscription Realtime ativa (Fase 3 já implementada)
   ↓
5. DREView recebe transactions[] via props
   ↓
6. useMemo agrupa por dataMap[scenario][conta_contabil][monthIdx]
   ↓
7. renderRow() exibe valores na tabela
   ↓
8. Realtime: Nova transação no Supabase
   ↓
9. Context atualiza transactions automaticamente
   ↓
10. DREView re-renderiza com novos dados ✨
```

---

## 🎯 Exemplo Prático

### Transação no Banco (transactions_orcado):
```json
{
  "id": "abc-123",
  "conta_contabil": "Mensalidades",
  "category": "CC Comercial",
  "scenario": "Orçado",
  "amount": 150000.00,
  "date": "2025-01-01",
  "marca": "AP",
  "filial": "Unidade SP Centro",
  "tag01": "tag01_comercial"
}
```

### Como aparece na DRE:
- **Hierarquia:**
  - Nível 1: "01. RECEITA LÍQUIDA"
  - Nível 2: "01.1 RECEITAS ACADÊMICAS"
  - Nível 3: "Mensalidades"
- **Coluna:** "Orçado" (cenário)
- **Mês:** Janeiro (JAN)
- **Valor:** R$ 150.000,00

### Se filtros ativos:
- **Marca = "AP"** ✅ Incluída
- **tag01 = "tag01_comercial"** ✅ Incluída
- Se filtrar **Marca = "GT"** ❌ Excluída

---

## 🆕 Mudanças Implementadas

### PARTE 0: Preparação - Filtros e Cenários

#### Renomeação de Filtros
- **ANTES:** "Tag01", "Tag02", "Tag03" (capitalizado)
- **DEPOIS:** "tag01", "tag02", "tag03" (minúscula, igual ao banco)

#### Novo Filtro: Centro de Custo (CC)
- **Campo:** `category`
- **Label na UI:** "CC (Centro de Custo)"
- **Uso:** Filtro adicional no drill-down da DRE
- **Valores:** CC Comercial, CC Pedagógico, CC RH, CC Operacional, CC Administrativo, CC Marketing, CC TI

#### Tabelas de Cenários
- **transactions_orcado:** Dados do cenário "Orçado" (100 linhas de mock data)
- **transactions_ano_anterior:** Dados do cenário "A-1" (100 linhas de mock data)
- **Lógica:** scenarioService.ts faz busca inteligente na tabela correta

### PARTE 1: Hierarquia DRE Dinâmica

#### Novo Nível 1: "05. RATEIO CSC"
- Expandido de 4 para **5 níveis fixos** no Nível 1
- Estrutura:
  - 01. RECEITA LÍQUIDA
  - 02. CUSTOS VARIÁVEIS
  - 03. CUSTOS FIXOS
  - 04. DESPESAS ADM (SG&A)
  - **05. RATEIO CSC** ← NOVO!

#### Nível 2 Configurável
- **Tabela:** `dre_hierarchy` no Supabase
- **Admin Panel:** Nova aba "Estrutura DRE"
- **CRUD:** Adicionar, Editar, Deletar, Reordenar itens de Nível 2
- **Campos:**
  - `nivel_1_code`: Código do Nível 1 (01-05)
  - `nivel_2_code`: Código único (ex: 01.1, 05.1)
  - `nivel_2_label`: Label exibido na DRE
  - `items`: Array JSON de categorias (conta_contabil)
  - `ordem`: Ordem de exibição
  - `ativo`: Flag para ativar/desativar

#### DREView Dinâmico
- **useDREHierarchy():** Hook que carrega hierarquia do banco
- **Renderização:** Níveis 1 e 2 renderizados dinamicamente
- **Nível 3+:** Drill-down mantido (duplo-clique funcional)

---

## ⚙️ Configuração do Realtime

### Requisitos:
1. ✅ Tabela `transactions` habilitada para Realtime
2. ✅ Trigger `update_updated_at_column()` ativo
3. ✅ Campo `updated_at` atualizado automaticamente

### SQL Migration:
```sql
-- Habilitar Realtime (se não estiver habilitado)
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Trigger de updated_at (se não existir)
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🚀 Como Usar

### Para Admins: Gerenciar Hierarquia

1. **Acessar AdminPanel:**
   - Clicar na aba "Estrutura DRE"

2. **Adicionar novo item de Nível 2:**
   - Clicar em "+ Adicionar Novo Item Nível 2"
   - Selecionar Nível 1
   - Preencher código (ex: 05.2)
   - Preencher label (ex: 05.2 RATEIOS EXTERNOS)
   - Selecionar categorias (multi-select)
   - Definir ordem
   - Salvar

3. **Editar estrutura existente:**
   - Clicar no ícone ✏️ do item
   - Modificar campos desejados
   - Salvar

4. **Deletar item:**
   - Clicar no ícone 🗑️
   - Confirmar exclusão (soft delete)

### Para Usuários: Visualizar DRE

1. **Abrir DRE Gerencial:**
   - Navegar para a guia "DRE Gerencial"
   - Dados carregam automaticamente

2. **Forçar atualização:**
   - Clicar no botão "Atualizar DRE" no header
   - Aguardar spinner

3. **Drill-down (duplo-clique):**
   - Dar duplo-clique em qualquer célula com valor
   - App navega para "Lançamentos" com filtros aplicados
   - Filtros incluem: categoria, mês, cenário, tag01/02/03, marca, filial

---

## 📚 Referências

- **MAPEAMENTO_COLUNAS.md** - Mapeamento geral de transactions (22 campos)
- **constants.ts** (linhas 34-68) - DRE_STRUCTURE (DEPRECADO - usar dre_hierarchy)
- **DREView.tsx** (linha 228-257) - Lógica de agrupamento dataMap
- **TransactionsContext.tsx** (linha 464-549) - Realtime subscription
- **MEMORY.md** - Fases 1-5 do sistema de sincronização

---

**Última atualização:** 05/02/2026
**Versão:** Fase 6 - DRE Dinâmica + Realtime Integration
**Status:** Implementação em andamento
