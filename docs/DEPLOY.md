# Guia de Deploy — DRE Raiz

## Deploy Normal (fluxo padrão)

```bash
# 1. Commitar as mudanças
git add <arquivos>
git commit -m "descrição"

# 2. Push — Vercel detecta automaticamente e inicia o deploy
git push origin master
```

Acompanhe em: **https://vercel.com** → projeto `dre-raiz` → Deployments

URL de produção: **https://dre-raiz.vercel.app**

---

## ⚠️ Deploy Forçado (quando o Vercel serve build cacheado)

### Sintoma
Código foi alterado, commitado e deployado, mas em produção o comportamento ainda é o antigo — enquanto em **localhost funciona corretamente**.

### Causa
O Vercel cacheia artefatos de build. Em alguns deploys via `git push`, ele reaproveita partes do build anterior e serve código desatualizado.

### Solução — forçar rebuild do zero

```bash
npx vercel --prod --force
```

O flag `--force` ignora todo cache de build e recompila tudo do zero.

### Quando usar
- Após corrigir um bug que funciona em localhost mas **não reflete em produção**
- Após alterar configurações de build (`vite.config.ts`, `tsconfig.json`, etc.)
- Sempre que o comportamento em produção divergir do local após um push normal

---

## Passo a Passo Completo

```bash
# 1. Verificar o que mudou
git status
git diff --stat

# 2. Adicionar arquivos relevantes (nunca usar git add -A cegamente)
git add App.tsx components/SomaTagsView.tsx services/supabaseService.ts
# (adicionar outros arquivos conforme necessário)

# 3. Remover arquivos deletados
git rm arquivo-removido.png

# 4. Commitar
git commit -m "feat/fix/chore: descrição clara do que foi feito"

# 5. Push normal
git push origin master

# 6. Se produção não refletir a mudança → deploy forçado
npx vercel --prod --force
```

---

## Checklist pós-deploy

- [ ] Abrir https://dre-raiz.vercel.app em **aba anônima** (evita cache do browser)
- [ ] Login com conta admin (`edmilson.serafim@raizeducacao.com.br`)
- [ ] Verificar se dados do DRE Gerencial carregam
- [ ] Login com conta restrita (ex: `serafim.edmilson@gmail.com`) e confirmar que só vê dados permitidos
- [ ] Se algo divergir de localhost → rodar `npx vercel --prod --force`

---

## Arquivos SQL — quando rodar no Supabase

Toda vez que alterar funções RPC (arquivos `.sql` na raiz), rodar manualmente no **Supabase SQL Editor** antes do deploy:

| Arquivo | Quando rodar |
|---------|-------------|
| `fix_get_soma_tags_v7_tags01.sql` | Ao alterar a função `get_soma_tags` |
| `fix_get_dre_dimension_security_definer.sql` | Ao alterar a função `get_dre_dimension` |

> Funções SQL **não são aplicadas automaticamente** pelo deploy da Vercel — precisam ser rodadas manualmente no Supabase.

---

## Limite de Serverless Functions (Vercel Hobby)

O plano Hobby do Vercel permite no máximo **12 Serverless Functions** por deploy. O projeto tem ~20 endpoints em `api/`.

Para caber no limite, 8 endpoints secundários estão listados no `.vercelignore`:

| Endpoint ignorado | Motivo |
|---|---|
| `api/agent-team/analytics.ts` | Dashboard analytics (não crítico) |
| `api/agent-team/brand-health-score.ts` | Score por marca (não crítico) |
| `api/agent-team/cron-run.ts` | Cron alternativo (substituído por run-scheduled) |
| `api/agent-team/forecast.ts` | Forecast (não crítico) |
| `api/agent-team/generate-cut-plan.ts` | Plano de corte (não crítico) |
| `api/agent-team/health-score.ts` | Health score (não crítico) |
| `api/agent-team/send-completion-email.ts` | Email de conclusão (não crítico) |
| `api/agent-team/simulate-impact.ts` | Simulação de impacto (não crítico) |

> Se fizer upgrade para o plano Pro, remova essas linhas do `.vercelignore` para reativar todos os endpoints.

---

## Histórico de Deploys

> Registre aqui cada deploy em produção para fácil conferência.

| Data | Commit | Status | O que mudou |
|------|--------|--------|-------------|
| 02/03/2026 15:20 | `4e3faf4` | Ready | fix: ignorar 8 endpoints para limite 12 functions Hobby |
| 02/03/2026 15:06 | `3786ab3` | Error (12 fn limit) | fix: Buscar Tudo respeita filtros conta_contabil e status |
| 02/03/2026 14:50 | `e05b93e` | Error (12 fn limit) | fix: cron diário para Vercel Hobby |
| 02/03/2026 14:48 | `95e5b82` | Error (12 fn limit) | feat: recurring padrão Sim, dropdown Book PPTX, fix limpar filtros texto |
| 02/03/2026 14:38 | `647cd11` | Error (12 fn limit) | feat: aba Recorrência no Admin |
| 02/03/2026 10:36 | `20ac1c9` | — | feat: humanizar outputs dos agentes |
| 02/03/2026 08:33 | `edfea8c` | — | fix: prefill JSON + prompt Edmundo para Haiku |
| 01/03/2026 ~22:00 | `9a396da` | Ready | feat: Equipe Alpha v3 — 8 agentes, 9 steps, Diretor e CEO |
| 28/02/2026 ~23:00 | `5e2b3c1` | Ready | fix: timeout 5 min por step |
| 28/02/2026 ~21:00 | `780828c` | Ready | feat: filtros Marca/Filial/Tag01/Mês na Equipe Financeira |
| 28/02/2026 ~15:00 | `3e0a646` | Ready | feat: Decision Intelligence Platform — core engine |
| 27/02/2026 ~19:30 | `53de03b` | Ready | chore: ponto de restauração estável |
| 27/02/2026 ~18:00 | `f3fd63a` | Ready | fix: restaura dre_agg após regressão |
| 27/02/2026 ~17:00 | `b61f1e8` | Ready | perf: lazy-load — carga de ~1min para ~3-5s |

### Como registrar um novo deploy

Após cada deploy, adicione uma linha no topo da tabela acima:

```
| DD/MM/AAAA HH:MM | `hash` | Ready/Error | descrição curta |
```
