# Guia de Deploy - Melhorias na Tela de Aprovações

## ✅ Status Pré-Deploy

- ✅ Código implementado e testado localmente
- ✅ Banco de dados atualizado (coluna `approved_by_name` existe)
- ✅ Testes funcionais aprovados
- ✅ Sem erros no console
- ✅ Pronto para produção!

---

## 🚀 Deploy - Passo a Passo

### Opção 1: Deploy via Git (Vercel/Netlify) - RECOMENDADO

Se você está usando Vercel, Netlify ou similar com deploy automático:

#### 1. Preparar o Commit

Abra o terminal na pasta do projeto:

```bash
# Verificar status dos arquivos
git status

# Ver as mudanças
git diff

# Adicionar todos os arquivos modificados
git add .

# Criar commit com mensagem descritiva
git commit -m "feat: adicionar filtros avançados e nome do aprovador na tela de aprovações

- Adicionar coluna de aprovador (nome, email, data)
- Implementar filtros multi-select (Status, Tipo, Solicitante, Aprovador, Datas)
- Adicionar exportação CSV com 18 colunas
- Atualizar tipos TypeScript e serviços
- Melhorar UX com badges e contadores

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

#### 2. Enviar para o Repositório

```bash
# Verificar branch atual
git branch

# Se não estiver na main/master, mude:
git checkout main
# OU
git checkout master

# Enviar para o repositório remoto
git push origin main
# OU
git push origin master
```

#### 3. Deploy Automático

Se você tem deploy automático configurado:
- ✅ Vercel/Netlify detectará o push
- ✅ Iniciará o build automaticamente
- ✅ Deploy será feito em 2-5 minutos

**Acompanhe o deploy:**
- Vercel: https://vercel.com/dashboard
- Netlify: https://app.netlify.com/

---

### Opção 2: Deploy Manual (Build Local)

Se preferir fazer build manual:

#### 1. Criar Build de Produção

```bash
# Instalar dependências (se necessário)
npm install

# Criar build otimizado
npm run build
```

Isso criará uma pasta `dist` com os arquivos otimizados.

#### 2. Deploy da Pasta dist

**Para Vercel:**
```bash
# Instalar CLI da Vercel (se não tiver)
npm i -g vercel

# Fazer deploy
vercel --prod
```

**Para Netlify:**
```bash
# Instalar CLI da Netlify (se não tiver)
npm i -g netlify-cli

# Fazer deploy
netlify deploy --prod --dir=dist
```

**Para outro servidor:**
- Copie o conteúdo da pasta `dist` para o servidor
- Configure o servidor web para servir os arquivos

---

## 🔍 Verificações Pós-Deploy

### 1. Verificação Imediata (2 minutos)

Assim que o deploy terminar:

**✅ Aplicação carrega:**
```
□ Abrir URL de produção
□ Página carrega sem erros
□ Login funciona
□ Menu lateral aparece
```

**✅ Tela de Aprovações:**
```
□ Clicar em "Aprovações" no menu
□ Tabela carrega com dados
□ 7 colunas presentes (incluindo "Aprovador")
□ Seção de filtros aparece
□ Botão "Exportar CSV" visível
```

### 2. Testes Funcionais (5-10 minutos)

**✅ Nome do Aprovador:**
```
□ Registros aprovados mostram nome do aprovador
□ Nome, email e data aparecem corretamente
□ Ícone verde de escudo presente
□ Registros não aprovados mostram "-"
```

**✅ Filtros:**
```
□ Filtro de Status funciona
□ Filtro de Tipo funciona
□ Filtro de Solicitante funciona
□ Filtro de Aprovador funciona
□ Filtros de data funcionam
□ Badges mostram contagem correta
□ "Limpar Filtros" reseta tudo
□ Contador "X de Y registros" atualiza
```

**✅ Exportação CSV:**
```
□ Botão "Exportar CSV" funciona
□ Arquivo baixa automaticamente
□ Nome do arquivo correto (Aprovacoes_YYYY-MM-DD.csv)
□ Abre no Excel sem erros
□ 18 colunas presentes
□ Últimas 3 colunas têm dados do aprovador
□ Acentos aparecem corretamente
□ Dados correspondem aos filtros aplicados
```

**✅ Permissões:**
```
□ Admin vê todas as solicitações
□ Admin pode aprovar/reprovar
□ Usuário comum vê apenas suas solicitações
□ Usuário comum não pode aprovar/reprovar
```

### 3. Teste de Regressão (5 minutos)

Verificar que nada quebrou:

```
□ Dashboard abre normalmente
□ DRE funciona
□ Movimentos funciona
□ KPIs funcionam
□ Outras telas não foram afetadas
□ Funcionalidades antigas continuam funcionando
```

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: Coluna "Aprovador" não aparece

**Sintoma:** Tabela só tem 6 colunas

**Causa Provável:** Cache do navegador

**Solução:**
```
1. Limpar cache do navegador (Ctrl+Shift+Delete)
2. Fazer hard refresh (Ctrl+F5)
3. Testar em aba anônima
```

### Problema 2: Filtros não aparecem

**Sintoma:** Seção de filtros está ausente

**Verificar:**
```
1. Console do navegador (F12) - ver erros
2. Build completou com sucesso
3. Todos os arquivos foram enviados no commit
```

### Problema 3: Erro 500 ou página em branco

**Sintoma:** Aplicação não carrega

**Verificar:**
```
1. Logs do servidor (Vercel/Netlify)
2. Variáveis de ambiente configuradas
3. Build não falhou
```

**Variáveis de ambiente necessárias:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Outras variáveis Firebase se houver

### Problema 4: CSV não exporta ou dá erro

**Sintoma:** Botão não funciona ou erro ao clicar

**Verificar:**
```
1. Console do navegador para mensagem de erro
2. Dados existem na tabela
3. Permissões do usuário
```

---

## 🔄 Rollback (Se Necessário)

Se algo der muito errado e precisar reverter:

### Rollback Rápido (Git)

```bash
# Ver histórico de commits
git log --oneline

# Reverter para commit anterior (antes das mudanças)
git revert <hash-do-commit>

# Ou voltar direto (cuidado, apaga mudanças)
git reset --hard <hash-do-commit-anterior>

# Forçar push
git push origin main --force
```

### Rollback via Plataforma

**Vercel:**
1. Ir em: https://vercel.com/dashboard
2. Selecionar o projeto
3. Aba "Deployments"
4. Encontrar deploy anterior que funcionava
5. Clicar nos 3 pontos → "Promote to Production"

**Netlify:**
1. Ir em: https://app.netlify.com/
2. Selecionar o site
3. Aba "Deploys"
4. Encontrar deploy anterior
5. Clicar "Publish deploy"

---

## 📊 Monitoramento Pós-Deploy

### Primeiras 24 horas

**Monitorar:**
- ✅ Logs de erro do servidor
- ✅ Feedback dos usuários
- ✅ Performance da aplicação
- ✅ Uso das novas funcionalidades

**Onde verificar:**
- Console do navegador (F12)
- Logs do Supabase
- Logs da plataforma de deploy
- Mensagens dos usuários

### Primeira semana

**Coletar dados:**
- Quantos usuários usaram os filtros?
- Quantas exportações CSV foram feitas?
- Algum bug reportado?
- Performance está ok?

---

## 📢 Comunicação com a Equipe

### Antes do Deploy

Envie um aviso:

```
📢 ATUALIZAÇÃO DO SISTEMA - [DATA/HORA]

Olá equipe,

Faremos uma atualização no sistema com as seguintes melhorias na tela de Aprovações:

✨ NOVIDADES:
• Coluna mostrando quem aprovou cada solicitação
• Filtros avançados (Status, Tipo, Solicitante, Aprovador, Datas)
• Exportação para CSV com dados completos

⏰ QUANDO: [Hoje às 15h / Amanhã às 9h]
⏱️ DURAÇÃO: ~5 minutos
🚨 IMPACTO: Nenhum, sistema continua funcionando

Após a atualização, vocês verão automaticamente as novas funcionalidades.

Qualquer dúvida, estou à disposição!
```

### Após o Deploy

Confirme a conclusão:

```
✅ ATUALIZAÇÃO CONCLUÍDA

A atualização foi realizada com sucesso!

🎯 COMO USAR AS NOVIDADES:

1️⃣ Coluna de Aprovador:
   • Mostra quem aprovou cada solicitação
   • Inclui nome, email e data

2️⃣ Filtros:
   • Clique nos botões coloridos acima da tabela
   • Selecione múltiplas opções
   • Use "Limpar Filtros" para resetar

3️⃣ Exportar CSV:
   • Botão verde no canto superior direito
   • Exporta dados visíveis (após filtros)
   • Abre direto no Excel

📹 Tutorial: [link se tiver vídeo]
📄 Manual: Ver arquivo GUIA_IMPLEMENTACAO_PT.md

Feedback? Me chamem! 🚀
```

---

## ✅ Checklist Final de Deploy

### Pré-Deploy:
- [x] Código testado localmente
- [x] Banco de dados atualizado
- [x] Sem erros no console
- [x] Documentação criada
- [ ] Equipe avisada (opcional)
- [ ] Backup feito (opcional)

### Deploy:
- [ ] Commit criado com mensagem clara
- [ ] Push para repositório remoto
- [ ] Build iniciado
- [ ] Build completado sem erros
- [ ] Deploy bem-sucedido

### Pós-Deploy:
- [ ] Aplicação carrega em produção
- [ ] Login funciona
- [ ] Tela de Aprovações abre
- [ ] 7 colunas na tabela
- [ ] Filtros aparecem
- [ ] Botão CSV visível
- [ ] Teste de aprovação funciona
- [ ] Nome do aprovador aparece
- [ ] Filtros funcionam
- [ ] CSV exporta corretamente
- [ ] Permissões respeitadas
- [ ] Nenhuma funcionalidade antiga quebrou
- [ ] Console sem erros críticos
- [ ] Equipe notificada (opcional)

---

## 🎯 Comandos Rápidos

**Para fazer deploy agora:**

```bash
# 1. Adicionar mudanças
git add .

# 2. Criar commit
git commit -m "feat: filtros avançados e nome do aprovador"

# 3. Enviar
git push origin main

# 4. Acompanhar deploy no dashboard da plataforma
```

---

## 📞 Suporte Pós-Deploy

Se precisar de ajuda após o deploy:

**Logs para verificar:**
1. Console do navegador (F12)
2. Logs do Supabase
3. Logs da plataforma (Vercel/Netlify)

**Informações úteis para debug:**
- URL da aplicação
- Mensagem de erro completa
- Passos para reproduzir o problema
- Navegador e versão
- Usuário afetado (admin ou comum)

---

## 🎉 Conclusão

Seu código está pronto para deploy!

**Próximos passos:**
1. Execute os comandos git acima
2. Aguarde o build completar (2-5 min)
3. Teste na URL de produção
4. Monitore por algumas horas
5. Comemore! 🎊

**Tempo total estimado:** 10-15 minutos

Boa sorte com o deploy! 🚀

---

**Última atualização:** 28 de Janeiro de 2026
**Status:** ✅ Pronto para Deploy
