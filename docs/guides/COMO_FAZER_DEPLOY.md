# Como Fazer Deploy — DRE Raiz

**Plataforma:** Vercel (NÃO Netlify)
**URL produção:** https://dre-raiz.vercel.app
**Dashboard:** https://vercel.com/edmilson-serafims-projects/dre-raiz

---

## Fluxo padrão (commit + deploy)

```bash
# 1. Ver o que mudou
git status
git diff --stat

# 2. Adicionar arquivos (específicos, nunca git add .)
git add components/AlgumaCoisa.tsx services/supabaseService.ts

# 3. Commit
git commit -m "feat: descrição do que foi feito"

# 4. Deploy para produção
vercel --prod --yes
```

O `--yes` é obrigatório para não travar em perguntas interativas no terminal.

---

## Pré-requisitos

Vercel CLI instalada globalmente (verificar com `vercel --version`):

```bash
npm install -g vercel
```

Login já salvo em `~/.local/share/com.vercel.cli/` — se pedir login novamente:

```bash
vercel login
# abre o browser para autenticar com serafim.edmilson@gmail.com
```

---

## Build local (opcional)

O Vercel faz o build no servidor automaticamente. Mas se quiser testar o build antes:

```bash
npm run build
# Gera a pasta dist/ — deve finalizar sem erros TypeScript
# Warnings de chunk size (echarts ~1MB) são normais, não bloqueiam
```

---

## O que NÃO fazer

| Errado | Correto |
|--------|---------|
| `npx netlify deploy --prod` | `vercel --prod --yes` |
| `vercel` (sem --prod) | `vercel --prod --yes` |
| `git add .` | `git add <arquivos específicos>` |
| `npx vercel` | `vercel` (CLI global já instalada) |

---

## Rollback rápido

Se o deploy quebrar algo:

1. Acessar https://vercel.com/edmilson-serafims-projects/dre-raiz/deployments
2. Localizar o deploy anterior (status: Ready)
3. Clicar nos 3 pontinhos → **Promote to Production**

Ou via CLI:
```bash
vercel rollback
```

---

## Verificação pós-deploy

```bash
# Ver status do último deploy
vercel inspect --logs

# URL de produção
open https://dre-raiz.vercel.app
```

Verificar no browser:
- [ ] App carrega sem tela branca
- [ ] DRE Gerencial abre com dados (Real / Orçado / A-1)
- [ ] Guia Lançamentos carrega
- [ ] Console (F12) sem erros vermelhos

---

## Variáveis de ambiente

Já configuradas no painel da Vercel. Não precisam ser alteradas a cada deploy.
Se precisar adicionar uma nova:

1. https://vercel.com/edmilson-serafims-projects/dre-raiz/settings/environment-variables
2. Adicionar a variável com o prefixo `VITE_` para que o frontend acesse
3. Fazer um novo deploy após salvar

Variáveis atuais:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`

---

*Atualizado em 20/02/2026 — reflete o estado atual do projeto*
