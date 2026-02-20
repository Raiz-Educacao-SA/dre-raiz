# 05. RATEIO RAIZ — Contexto e Pendências

## O que é
Rateio dos custos do corporativo (CSC — Centro de Serviços Compartilhados) distribuído para as escolas.
Representa o custo real de cada escola após absorver os custos do CSC da Raiz Educação.

## Estrutura DRE

```
RECEITA BRUTA (01.)
− CUSTOS VARIÁVEIS (02.)
− CUSTOS FIXOS (03.)
──────────────────────────────────────────
= MARGEM DE CONTRIBUIÇÃO   (linha calculada)
− SG&A (04.)
──────────────────────────────────────────
= EBITDA (S/ RATEIO RAIZ CSC)  (linha calculada)
− RATEIO RAIZ (05.)
──────────────────────────────────────────
= EBITDA                       (linha calculada — total final)
```

## Status dos dados por cenário

| Cenário | Tabela | Status |
|---------|--------|--------|
| A-1 (ano anterior) | `transactions_ano_anterior` | ✅ Calculado e salvo (`tag0 = '05. RATEIO RAIZ'`) |
| Orçado | `transactions_orcado` | ✅ Calculado e salvo (`tag0 = '05. RATEIO RAIZ'`) |
| Real | `transactions` | ⚠️ **PENDENTE** — cálculo ainda não realizado |

> **Antes de implementar o EBITDA Total para Real:** calcular o rateio Real
> e inserir em `transactions` com `tag0 = '05. RATEIO RAIZ'`.

## O que já está feito
- `05. RATEIO RAIZ` aparece na DRE Gerencial como tag0 nível 1
- Flag "Até EBITDA" inclui o prefixo `05.` (ebitdaPrefixes)

## Próximos passos

1. **Calcular Rateio Real** — definir metodologia e inserir em `transactions`
2. Considerar toggle visual para mostrar/ocultar a visão com rateio
