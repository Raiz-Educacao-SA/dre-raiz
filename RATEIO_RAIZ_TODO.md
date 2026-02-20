# 06. RATEIO RAIZ — Contexto e Pendências

## O que é
Rateio dos custos do corporativo (CSC — Centro de Serviços Compartilhados) distribuído para as escolas.
Representa o custo real de cada escola após absorver os custos do CSC da Raiz Educação.

## Por que 2 EBITDAs?

```
RECEITA BRUTA (01.)
− CUSTOS VARIÁVEIS (02.)
− CUSTOS FIXOS (03.)
──────────────────────────────────────────
= 04. MARGEM DE CONTRIBUIÇÃO   ← performance interna, sem CSC
= 05. EBITDA (S/ RATEIO RAIZ CSC)  ← a implementar
− RATEIO RAIZ (06.)
──────────────────────────────────────────
= EBITDA TOTAL COM RATEIO        ← custo real completo com CSC
```

## Status dos dados por cenário

| Cenário | Tabela | Status |
|---------|--------|--------|
| A-1 (ano anterior) | `transactions_ano_anterior` | ✅ Calculado e salvo |
| Orçado | `transactions_orcado` | ✅ Calculado e salvo |
| Real | `transactions` | ⚠️ **PENDENTE** — cálculo ainda não realizado |

> **Antes de implementar o EBITDA Total para Real:** calcular o rateio Real
> e inserir em `transactions` com `tag0 = '06. RATEIO RAIZ'`.

## O que já está feito
- `06. RATEIO RAIZ` aparece na DRE Gerencial como tag0 nível 1
- Flag "Até EBITDA" já inclui o prefixo `06.` (ebitdaPrefixes)

## Próximos passos

1. **Calcular Rateio Real** — definir metodologia e inserir em `transactions`
2. **Duas linhas de EBITDA no DREView:**
   - `05. EBITDA (S/ RATEIO RAIZ CSC)` após `04. MARGEM DE CONTRIBUIÇÃO`
   - `EBITDA TOTAL` após `06. RATEIO RAIZ` (com rateio)
3. Considerar toggle visual para mostrar/ocultar a visão com rateio
