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
