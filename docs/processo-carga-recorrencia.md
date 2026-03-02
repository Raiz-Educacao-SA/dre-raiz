# Processo: Carga de Recorrência em Massa

## Objetivo
Atualizar a coluna `recurring` da tabela `transactions` usando um Excel com 2 colunas.

## Passo a Passo

### 1. Preparar o Excel
O arquivo deve ter exatamente 2 colunas:

| chave_id | Recorrente |
|----------|------------|
| ABC-123  | Sim        |
| DEF-456  | Não        |

**Nomes de coluna aceitos:**
- `chave_id`, `Chave ID`, `CHAVE_ID`, `Chave_ID`
- `Recorrente`, `Recurring`, `recurring`, `recorrente`

**Valores aceitos para Recorrente:**
- **Sim**: `Sim`, `sim`, `S`, `s`, `Yes`, `yes`, `Y`, `y`, `1`
- **Não**: `Não`, `não`, `Nao`, `nao`, `N`, `n`, `No`, `no`, `0`

**Formatos de arquivo:** `.xlsx`, `.xls`, `.csv`

### 2. Acessar a Aba
1. Menu lateral → **Admin**
2. Clicar na aba **Recorrência** (laranja)

### 3. Upload do Arquivo
1. Clicar na área de upload
2. Selecionar o arquivo Excel/CSV
3. O sistema mostra um **preview** com:
   - Total de registros carregados
   - Contagem de Sim/Não
   - Tabela com primeiras 200 linhas
   - Linhas sem `chave_id` são automaticamente ignoradas

### 4. Executar Atualização
1. Clicar **"Atualizar Recorrência"**
2. Confirmar no popup
3. Acompanhar:
   - **Barra de progresso** (batches de 50)
   - **Log de carga** (terminal escuro) com detalhes de cada batch

### 5. Verificar Resultado

#### No Log de Carga
| Cor | Prefixo | Significado |
|-----|---------|-------------|
| Cinza | `INFO` | Batch sendo processado |
| Verde | `OK` | Batch concluído com sucesso |
| Amarelo | `WARN` | chave_ids não encontrados |
| Vermelho | `ERR` | Erro no batch |

#### Exemplo de log
```
[14:32:01] INFO  Iniciando atualização: 150 registros (120 Sim, 30 Não)
[14:32:01] INFO  Batch 1/3 — processando 50 registros (1 a 50)...
[14:32:03] OK    Batch 1: 50 atualizados
[14:32:03] INFO  Batch 2/3 — processando 50 registros (51 a 100)...
[14:32:05] WARN  Batch 2: 48 atualizados, 2 não encontrados: ABC-123, DEF-456
[14:32:07] OK    Batch 3: 50 atualizados
[14:32:07] OK    Concluído: 148 registros atualizados com sucesso
[14:32:07] WARN  2 chave_id não encontrados no banco:
[14:32:07] WARN    ABC-123, DEF-456
```

### 6. Resolução de Problemas

| Problema | Causa | Solução |
|----------|-------|---------|
| "Arquivo vazio" | Excel sem dados | Verificar se a planilha tem dados na aba 1 |
| "Nenhuma linha válida" | Coluna `chave_id` não encontrada | Renomear coluna para `chave_id` |
| chave_ids não encontrados | Chave não existe no banco | Verificar ortografia ou se o registro existe |
| Erro de batch | Problema de conexão/permissão | Verificar conexão e tentar novamente |

## Regras Importantes
- **Apenas registros no Excel são alterados** — todo o restante permanece inalterado
- Processamento em **batches de 50** para não sobrecarregar o banco
- Um `chave_id` pode corresponder a **múltiplos registros** (todos são atualizados)
- O log permanece visível após a conclusão (botão "Limpar log" para remover)

## Arquivos Técnicos
- **UI**: `components/AdminPanel.tsx` — aba Recorrência
- **Service**: `services/supabaseService.ts` — função `bulkUpdateRecurring()`
