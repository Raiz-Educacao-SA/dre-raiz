# Resumo das Alterações - Nova Coluna chave_id

## Data: 03/02/2026

---

## ✅ Alterações Realizadas

### 1. Arquivos SQL Atualizados
Todos os scripts foram atualizados para incluir a nova coluna **chave_id** e remover as colunas temporárias **coligada_chave** e **id_cont**:

- ✅ `sync_via_function.py` - Script de sincronização principal
- ✅ `diagnostico_sync.py` - Script de diagnóstico
- ✅ `azure_function/FabricSyncTimer/__init__.py` - Azure Function (produção)
- ✅ `gerar_excel_validacao.py` - Script de validação

### 2. Coluna chave_id
**Definição:**
- Identificador único composto por: `CODCOLIGADA` + `-` + `INTEGRACHAVE_TRATADA` + `-` + `contador sequencial`
- Formato: `"1-12345-1"`, `"1-12345-2"`, `"2-67890-1"`
- O contador reinicia a cada mudança de CODCOLIGADA ou INTEGRACHAVE_TRATADA

**SQL Implementado:**
```sql
-- chave_id: Identificador unico composto por CODCOLIGADA + INTEGRACHAVE_TRATADA + contador sequencial
-- Formato: "1-12345-1", "1-12345-2", "2-67890-1"
-- O contador reinicia a cada mudanca de CODCOLIGADA ou INTEGRACHAVE_TRATADA
CONCAT(
    CAST(F.CODCOLIGADA AS VARCHAR), '-',
    CASE
        WHEN F.INTEGRACHAVE_TRATADA = '' THEN F.IDPARTIDA
        WHEN F.INTEGRACHAVE_TRATADA IS NULL THEN F.IDPARTIDA
        ELSE F.INTEGRACHAVE_TRATADA
    END,
    '-',
    CAST(ROW_NUMBER() OVER (
        PARTITION BY CONCAT(CAST(F.CODCOLIGADA AS VARCHAR), '-',
            CASE
                WHEN F.INTEGRACHAVE_TRATADA = '' THEN F.IDPARTIDA
                WHEN F.INTEGRACHAVE_TRATADA IS NULL THEN F.IDPARTIDA
                ELSE F.INTEGRACHAVE_TRATADA
            END)
        ORDER BY F.IDPARTIDA ASC, F.VALOR DESC
    ) AS VARCHAR)
) AS chave_id
```

### 3. Colunas Removidas do SELECT
As seguintes colunas foram **removidas** do resultado final (mas ainda são usadas nos cálculos):
- ❌ `coligada_chave` - Coluna temporária removida
- ❌ `id_cont` - Coluna temporária removida

### 4. Estrutura Final do Banco
**Total de colunas:** 32 (anteriormente 34)

**Colunas mantidas:**
1. chave
2. codlote
3. cia
4. filial
5. integraaplicacao
6. idpartida
7. ticket
8. fornecedor_padrao
9. anomes
10. valor
11. complemento
12. recorrente
13. conta
14. tag1
15. tag2
16. tag3
17. tag4
18. tag_orc
19. original
20. r_o
21. cc
22. codcoligada
23. codfilial
24. usuario
25. conta_original
26. tag1_original
27. tag4_original
28. tagorc_original
29. integrachave_tratada
30. **chave_id** ← NOVA!
31. status_lanc_financeiro
32. anomes_original

---

## 📋 Próximos Passos

### Passo 1: Atualizar Estrutura Supabase ⚠️ OBRIGATÓRIO
Execute o SQL no **Supabase SQL Editor**:

```sql
-- Adicionar coluna chave_id
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS chave_id TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_dre_fabric_chave_id ON dre_fabric(chave_id);
```

📄 Arquivo pronto: `supabase_add_chave_id.sql`

**Como executar:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: `vafmufhlompwsdrlhkfz`
3. Menu lateral: **SQL Editor**
4. Clique em: **New query**
5. Cole o conteúdo do arquivo `supabase_add_chave_id.sql`
6. Clique em: **Run** (ou pressione Ctrl+Enter)

### Passo 2: Testar Sincronização Local
Execute o script de sincronização para validar:

```bash
python sync_via_function.py
```

**Resultado esperado:**
- ✅ 108,672 registros buscados do Fabric
- ✅ 108,672 registros inseridos no Supabase
- ✅ Coluna chave_id populada em todos os registros

### Passo 3: Validar Dados no Supabase
Após a sincronização, verifique no Supabase:

```sql
-- Verificar se chave_id foi populado
SELECT chave_id, codcoligada, integrachave_tratada, COUNT(*)
FROM dre_fabric
WHERE chave_id IS NOT NULL
GROUP BY chave_id, codcoligada, integrachave_tratada
ORDER BY chave_id
LIMIT 100;
```

### Passo 4: Deploy Azure Function
Após validar que tudo está funcionando:

1. **Gerar ZIP de deploy:**
   - Certifique-se de que a pasta `azure_function` está atualizada
   - Crie um novo ZIP: `azure_function_deploy.zip`

2. **Fazer deploy:**
   ```bash
   python deploy_agora.py
   ```

3. **Reiniciar Azure Function:**
   - Azure Portal → fabric-sync-dre → **Restart**

4. **Verificar logs:**
   - Azure Portal → fabric-sync-dre → **Log stream**
   - Aguardar próxima execução (08:00 diariamente)

---

## 📊 Validação Final

### Checklist de Validação
- [ ] Coluna chave_id criada no Supabase
- [ ] Índice idx_dre_fabric_chave_id criado
- [ ] Script local executado com sucesso
- [ ] Todos os 108,672 registros sincronizados
- [ ] Coluna chave_id populada (sem valores NULL)
- [ ] Formato correto: "CODCOLIGADA-INTEGRACHAVE-CONTADOR"
- [ ] Azure Function atualizada e deployada
- [ ] Azure Function reiniciada
- [ ] Logs da execução automática verificados

---

## 🔧 Arquivos de Suporte

- `supabase_add_chave_id.sql` - SQL para atualizar estrutura Supabase
- `atualizar_estrutura_supabase.py` - Script Python (tentativa automática)
- `sync_via_function.py` - Teste de sincronização local
- `diagnostico_sync.py` - Diagnóstico e troubleshooting
- `gerar_excel_validacao.py` - Gerar Excel com 100 linhas para conferir

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique logs do Azure Function
2. Execute `diagnostico_sync.py` para diagnóstico
3. Gere Excel de validação com `gerar_excel_validacao.py`
4. Verifique se a coluna existe no Supabase

---

**Última atualização:** 03/02/2026
**Status:** ✅ Código atualizado | ⏳ Aguardando deploy
