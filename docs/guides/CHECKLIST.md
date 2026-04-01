# ✅ Checklist de Deploy - DRE RAIZ

Use este checklist para garantir que todos os passos foram concluídos.

## 1. Configuração do Supabase

- [ ] Conta criada no [supabase.com](https://supabase.com)
- [ ] Projeto criado (nome: `dre-raiz` ou similar)
- [ ] Região selecionada: `South America (São Paulo)`
- [ ] Script `schema.sql` executado no SQL Editor
- [ ] Tabelas criadas com sucesso:
  - [ ] `transactions`
  - [ ] `manual_changes`
- [ ] Credenciais copiadas:
  - [ ] Project URL
  - [ ] anon public key

## 2. Configuração Local

- [ ] Dependências instaladas: `npm install`
- [ ] Arquivo `.env` criado na raiz do projeto
- [ ] Variáveis preenchidas no `.env`:
  - [ ] `API_KEY` (Firebase)
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_GEMINI_API_KEY`
- [ ] Teste local executado: `npm run dev`
- [ ] App funcionando em http://localhost:3002

## 3. Deploy na Vercel

- [ ] Conta criada/logada no [vercel.com](https://vercel.com)
- [ ] Código no GitHub (ou pronto para upload)
- [ ] Projeto importado na Vercel
- [ ] Variáveis de ambiente configuradas na Vercel:
  - [ ] `API_KEY`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_GEMINI_API_KEY`
- [ ] Deploy concluído com sucesso
- [ ] App acessível na URL da Vercel

## 4. Verificação Pós-Deploy

- [ ] App carrega sem erros
- [ ] Autenticação funciona (login com Google)
- [ ] Dashboard exibe KPIs
- [ ] Transações podem ser criadas
- [ ] Dados são salvos no Supabase (verificar na dashboard)
- [ ] Todas as views funcionam:
  - [ ] Dashboard
  - [ ] Movimentações
  - [ ] DRE
  - [ ] KPIs
  - [ ] Insights
  - [ ] Assistente
  - [ ] Previsões
  - [ ] Aprovações

## 5. Migração de Dados (Opcional)

- [ ] Verificar se há dados no localStorage
- [ ] Componente `MigrationHelper` adicionado
- [ ] Migração executada com sucesso
- [ ] Dados verificados no Supabase
- [ ] Componente `MigrationHelper` removido

## 6. Configurações Adicionais (Opcional)

- [ ] Domínio customizado configurado na Vercel
- [ ] SSL/HTTPS ativo
- [ ] Políticas RLS ajustadas no Supabase (se necessário)
- [ ] Backups automáticos configurados no Supabase
- [ ] Monitoramento ativo (Vercel Analytics)
- [ ] URL da Vercel adicionada nas configurações do Firebase Auth

## 7. Segurança

- [ ] Arquivo `.env` NÃO commitado no Git
- [ ] `.gitignore` contém `.env`
- [ ] Variáveis de ambiente apenas na Vercel
- [ ] API keys não expostas no código
- [ ] CORS configurado corretamente

## 8. Documentação

- [ ] README.md revisado
- [ ] QUICK_START.md lido
- [ ] DEPLOY_GUIDE.md disponível para consulta
- [ ] DUPLICACAO_GUIA.md consultado (se for duplicar)
- [ ] Equipe informada sobre novo deploy

---

## 🔄 Checklist de Duplicação (Se Aplicável)

Use este checklist adicional ao criar novas instâncias:

- [ ] Pasta do projeto copiada ou clonada
- [ ] NOVO projeto criado no Supabase
- [ ] NOVO banco de dados configurado (schema.sql executado)
- [ ] NOVO arquivo `.env` criado com credenciais únicas
- [ ] `package.json` atualizado com novo nome
- [ ] Dependências instaladas: `npm install`
- [ ] Testado localmente
- [ ] Deploy feito na Vercel com nome único
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] URL e credenciais documentadas

---

## 🎉 Deploy Completo!

Quando todos os itens estiverem marcados, seu app estará 100% operacional em produção!

**URL do seu app**: `https://dre-raiz.vercel.app`

---

## 📞 Precisa de Ajuda?

- Documentação Supabase: https://supabase.com/docs
- Documentação Vercel: https://vercel.com/docs
- Documentação Firebase: https://firebase.google.com/docs
- Guia de Duplicação: Veja `DUPLICACAO_GUIA.md`
