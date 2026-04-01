# ⚡ GUIA RÁPIDO DE OTIMIZAÇÃO DO BANCO SUPABASE

**Objetivo:** Liberar espaço no banco Supabase (atualmente próximo de 500 MB)
**Tempo estimado:** 1-2 horas (incluindo backups e verificações)

---

## 📋 CHECKLIST DE EXECUÇÃO

### ✅ Fase 1: Preparação (10 minutos)

- [ ] 1.1. Ler o arquivo `RELATORIO_OTIMIZACAO_SUPABASE.md` completo
- [ ] 1.2. Informar equipe sobre manutenção planejada
- [ ] 1.3. Escolher horário de baixa utilização
- [ ] 1.4. Ter acesso ao SQL Editor do Supabase

---

### ✅ Fase 2: Diagnóstico (10 minutos)

- [ ] 2.1. Abrir Supabase Dashboard → SQL Editor
- [ ] 2.2. Copiar e colar o conteúdo de `diagnostico_banco_completo.sql`
- [ ] 2.3. Executar o script completo
- [ ] 2.4. Salvar os resultados em um arquivo ou screenshot
- [ ] 2.5. Anotar:
  - Tamanho total do banco: _________ MB
  - Tamanho da tabela `dre_fabric`: _________ MB
  - Tamanho da tabela `transactions`: _________ MB
  - Quantidade de registros em `dre_fabric`: _________
  - Quantidade de registros em `transactions`: _________

---

### ✅ Fase 3: Limpeza de Arquivos Locais (5 minutos)

- [ ] 3.1. Executar o arquivo `LIMPAR_ARQUIVOS_GRANDES.bat`
- [ ] 3.2. Confirmar a operação quando solicitado (digitar S)
- [ ] 3.3. Verificar que os arquivos foram movidos para `backup_arquivos_deletados`
- [ ] 3.4. **Economia esperada:** ~156 MB no projeto local

**Resultado esperado:** Arquivos de log e teste movidos para pasta de backup

---

### ✅ Fase 4: Backup do Banco (30 minutos) ⚠️ OBRIGATÓRIO

**NUNCA pule esta etapa!**

#### Opção A: Backup via Supabase Dashboard (Recomendado)

- [ ] 4.1. Ir para: Database → Backups
- [ ] 4.2. Clicar em "Create Backup"
- [ ] 4.3. Aguardar conclusão
- [ ] 4.4. Anotar data/hora do backup: _________________

#### Opção B: Export das tabelas críticas

```sql
-- Execute no SQL Editor e salve os resultados

-- Backup de dre_fabric (se existir)
SELECT * FROM dre_fabric;
-- Clicar em "Download CSV"

-- Backup de transactions (últimos 12 meses)
SELECT * FROM transactions
WHERE date >= (CURRENT_DATE - INTERVAL '12 months');
-- Clicar em "Download CSV"
```

- [ ] 4.5. Salvar os arquivos CSV em local seguro

---

### ✅ Fase 5: Decisão e Limpeza (30 minutos)

#### 📊 Análise dos Resultados do Diagnóstico

Com base nos resultados da Fase 2, responda:

**1. A tabela `dre_fabric` existe?**
- [ ] SIM → Continuar para pergunta 2
- [ ] NÃO → Pular para Fase 5B

**2. Todos os dados de `dre_fabric` já foram processados para `transactions`?**
- [ ] SIM → Executar **Fase 5A** (deletar completamente)
- [ ] NÃO → Executar **Fase 5A (Opção 2)** (manter últimos 3 meses)

**3. Você ainda usa sincronização do Microsoft Fabric?**
- [ ] SIM → Executar **Fase 5A (Opção 2)** (manter tabela com dados recentes)
- [ ] NÃO → Executar **Fase 5A** (deletar completamente)

---

#### 🗑️ Fase 5A: Limpar `dre_fabric`

- [ ] 5A.1. Abrir arquivo `limpar_dre_fabric.sql`
- [ ] 5A.2. Escolher uma das opções:
  - **Opção 1:** Deletar completamente (máxima economia)
  - **Opção 2:** Manter últimos 3 meses
  - **Opção 3:** Manter últimos 6 meses
- [ ] 5A.3. Descomentar a opção escolhida (remover `--` do início das linhas)
- [ ] 5A.4. Copiar e colar no SQL Editor do Supabase
- [ ] 5A.5. Executar o script
- [ ] 5A.6. Aguardar conclusão do `VACUUM FULL` (pode demorar 5-15 minutos)
- [ ] 5A.7. Verificar economia:
  - Tamanho do banco DEPOIS: _________ MB
  - Economia obtida: _________ MB

**Resultado esperado:**
- **Opção 1:** 50-80% de economia
- **Opção 2:** 40-60% de economia

---

#### 🗄️ Fase 5B: Limpar `transactions` antigas (Opcional)

Execute esta fase se ainda precisar de mais espaço após a Fase 5A.

- [ ] 5B.1. Abrir arquivo `limpar_transactions_antigas.sql`
- [ ] 5B.2. Executar ETAPA 1 (análise) para ver quanto espaço pode ser liberado
- [ ] 5B.3. Se houver muitos registros antigos (> 2 anos), decidir:
  - **Opção 1:** Arquivar em `transactions_archive` (recomendado)
  - **Opção 2:** Deletar permanentemente (se tem backup externo)
- [ ] 5B.4. Descomentar a opção escolhida
- [ ] 5B.5. Executar o script
- [ ] 5B.6. Aguardar conclusão do `VACUUM FULL`
- [ ] 5B.7. Verificar economia adicional: _________ MB

**Resultado esperado:** 20-40% de economia adicional

---

### ✅ Fase 6: Verificação e Testes (15 minutos)

- [ ] 6.1. Verificar tamanho final do banco:
  ```sql
  SELECT pg_size_pretty(pg_database_size(current_database()));
  ```
  - Tamanho final: _________ MB
  - Economia total: _________ MB

- [ ] 6.2. Verificar que as tabelas principais ainda existem:
  ```sql
  SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename))
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size('public.'||tablename) DESC;
  ```

- [ ] 6.3. Testar a aplicação:
  - [ ] Login funciona
  - [ ] Dashboard carrega
  - [ ] Transações aparecem corretamente
  - [ ] Filtros funcionam
  - [ ] DRE carrega
  - [ ] Manual Changes funciona

- [ ] 6.4. Verificar logs de erro no console do navegador

---

### ✅ Fase 7: Documentação (5 minutos)

- [ ] 7.1. Documentar ações realizadas:
  ```
  Data da otimização: __________________
  Tamanho antes: _______ MB
  Tamanho depois: _______ MB
  Economia total: _______ MB
  Ações realizadas:
  - [ ] Deletou dre_fabric completamente
  - [ ] Manteve últimos ___ meses de dre_fabric
  - [ ] Arquivou transactions antigas
  - [ ] Deletou índices não utilizados
  ```

- [ ] 7.2. Atualizar este guia com observações específicas do seu caso

- [ ] 7.3. Agendar próxima manutenção para: __________________

---

## 🚨 TROUBLESHOOTING

### Problema: "Permission denied" ao executar scripts SQL

**Solução:**
- Verificar se está usando o usuário correto no Supabase
- Usar a connection string do service_role (não a anon key)
- Executar no SQL Editor do dashboard (não via API)

---

### Problema: VACUUM FULL está demorando muito

**Solução:**
- VACUUM FULL trava a tabela e pode demorar
- Tempo esperado: 1-2 minutos para cada 100 MB
- Aguardar pacientemente, não cancelar
- Executar em horário de baixa utilização

---

### Problema: Após deletar dre_fabric, scripts Python de sincronização falharam

**Solução:**
- Isso é esperado se você deletou completamente a tabela
- Opções:
  1. Recriar tabela vazia antes de sincronizar:
     ```sql
     CREATE TABLE dre_fabric (LIKE original_structure);
     ```
  2. Atualizar scripts Python para não depender de dre_fabric
  3. Manter sincronização manual via CSV

---

### Problema: Aplicação não carrega após limpeza

**Solução:**
1. Verificar se `transactions` ainda existe:
   ```sql
   SELECT COUNT(*) FROM transactions;
   ```
2. Se a tabela foi deletada acidentalmente, restaurar do backup
3. Verificar permissões RLS:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'transactions';
   ```

---

### Problema: Ainda está sem espaço após todas as limpezas

**Solução:**
- Executar análise adicional de índices:
  ```sql
  SELECT
      schemaname, tablename, indexname,
      pg_size_pretty(pg_relation_size(indexrelid)) as size
  FROM pg_stat_user_indexes
  ORDER BY pg_relation_size(indexrelid) DESC;
  ```
- Considerar upgrade do plano Supabase
- Implementar arquivamento em storage externo (S3, Azure Blob)

---

## 📊 EXPECTATIVAS DE ECONOMIA

| Ação | Economia Estimada | Prioridade |
|------|-------------------|------------|
| Deletar `dre_fabric` completamente | 50-80% do banco | 🔴 ALTA |
| Manter últimos 3 meses de `dre_fabric` | 40-60% do banco | 🟡 MÉDIA |
| Arquivar transactions > 2 anos | 20-40% do banco | 🟡 MÉDIA |
| Deletar arquivos locais (logs/testes) | ~156 MB (projeto) | 🟢 BAIXA |
| Deletar índices não utilizados | 5-10% do banco | 🟢 BAIXA |

---

## 📅 MANUTENÇÃO CONTÍNUA

### Mensal:
- [ ] Executar diagnóstico rápido
- [ ] Verificar crescimento do banco
- [ ] Limpar registros antigos se necessário

### Trimestral:
- [ ] Revisar índices não utilizados
- [ ] Atualizar estatísticas (ANALYZE)
- [ ] Verificar fragmentação (VACUUM)

### Anual:
- [ ] Revisar política de retenção de dados
- [ ] Avaliar necessidade de upgrade de plano
- [ ] Documentar padrões de uso

---

## 📞 CONTATOS E RECURSOS

- **Documentação Supabase:** https://supabase.com/docs
- **Suporte Supabase:** https://supabase.com/support
- **PostgreSQL VACUUM:** https://www.postgresql.org/docs/current/sql-vacuum.html

---

## ✅ CONCLUSÃO

Após seguir todas as fases deste guia, você deverá ter:

✅ Liberado 50-80% do espaço do banco Supabase
✅ Mantido todas as funcionalidades da aplicação
✅ Criado backups de segurança
✅ Documentado as mudanças realizadas
✅ Estabelecido processo de manutenção contínua

---

**Última atualização:** 04/02/2026
**Versão:** 1.0
**Autor:** Claude Code AI - Análise Automatizada
