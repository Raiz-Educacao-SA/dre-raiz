# 📚 Sistema de Classificação Automática de TYPE

**Data de Criação:** 2026-02-03
**Status:** ✅ Pronto para uso

---

## 🎯 O QUE É ESTE SISTEMA?

Sistema de classificação automática que calcula o campo `type` na tabela `dre_fabric` baseado nos campos `TAG1` e `TAGORC`.

### Vantagens:
- ✅ **Automático**: Novos registros são classificados na inserção
- ✅ **Editável**: Regras em arquivo SQL separado
- ✅ **Seguro**: Funciona com sincronização automática do Fabric
- ✅ **Rápido**: Trigger em memória, zero latência

---

## 📁 ARQUIVOS DO SISTEMA

### 1️⃣ `classification_rules_type.sql` ⭐
**O QUE É:** Arquivo com as regras de classificação
**QUANDO EDITAR:** Sempre que precisar adicionar/modificar categorias
**CONTÉM:**
- Função `classify_transaction_type(tag1, tagorc)`
- Todas as regras IF/ELSIF/ELSE
- Instruções de como editar

### 2️⃣ `setup_type_column_with_classification.sql`
**O QUE É:** Arquivo de configuração inicial
**QUANDO EXECUTAR:** Uma vez no início (setup)
**CONTÉM:**
- Cria coluna `type` no dre_fabric
- Cria triggers automáticos
- Popula registros existentes

### 3️⃣ `README_CLASSIFICATION_SYSTEM.md` (este arquivo)
**O QUE É:** Documentação e guia de uso

---

## 🚀 COMO INSTALAR (PRIMEIRA VEZ)

### Passo 1: Executar as regras de classificação
```sql
-- No Supabase SQL Editor
-- Executar: classification_rules_type.sql
```
✅ Isso cria a função `classify_transaction_type()`

### Passo 2: Configurar a coluna e triggers
```sql
-- No Supabase SQL Editor
-- Executar: setup_type_column_with_classification.sql
```
✅ Isso cria a coluna `type`, os triggers e classifica registros existentes

### Passo 3: Verificar
```sql
-- Verificar se funcionou
SELECT type, COUNT(*)
FROM dre_fabric
GROUP BY type
ORDER BY type;
```
✅ Deve mostrar a distribuição por tipo

---

## ✏️ COMO EDITAR AS REGRAS (NO FUTURO)

### Cenário: Você quer adicionar uma nova categoria

#### 1. Abra o arquivo `classification_rules_type.sql`

#### 2. Adicione a nova regra ANTES do `ELSE`:

```sql
-- Adicionar aqui, antes do ELSE
ELSIF p_tagorc = 'NOVA_CATEGORIA' THEN
  RETURN '05. NOVA CATEGORIA';

ELSE
  RETURN '99. CADASTRAR TAG0';
END IF;
```

#### 3. Execute no Supabase SQL Editor:
```sql
-- Copie e execute o arquivo completo
-- classification_rules_type.sql
```

#### 4. Reclassifique os registros existentes (opcional):
```sql
-- Atualizar todos os registros com as novas regras
UPDATE dre_fabric
SET type = classify_transaction_type(tag1, tag_orc);
```

#### 5. Pronto! ✅
Novos registros já usarão a nova regra automaticamente.

---

## 📋 REGRAS ATUAIS DE CLASSIFICAÇÃO

| Código | Descrição | Condição |
|--------|-----------|----------|
| 01 | RECEITA LIQUIDA | TAG1 = 'RECEITAS' |
| 02 | CUSTOS VARIÁVEIS (UNIDADES) | TAGORC IN (lista de custos variáveis) |
| 03 | CUSTOS FIXOS (UNIDADES) | TAGORC IN (lista de custos fixos) |
| 04 | SG&A | TAGORC IN (lista de despesas adm) |
| 06 | RATEIO RAIZ | TAGORC contém 'RATEIO' |
| 09 | RESULTADO FINANCEIRO | TAGORC = 'RESULTADO FINANCEIRO' |
| 10 | DEPRECIAÇÃO | TAGORC = 'DEPRECIAÇÃO & AMORTIZAÇÃO' |
| 12 | IRPJ/CSLL | TAG1 = 'IRPJ/CSLL' |
| 14 | CAPEX | TAG1 = 'CAPEX' |
| 15 | ADIANTAMENTO | TAGORC = 'ADIANTAMENTO' |
| 16 | PARTICIPAÇÃO SOCIETÁRIA | TAGORC = 'PARTICIPAÇÃO SOCIETÁRIA' |
| 99 | CADASTRAR TAG0 | Nenhuma regra aplicável |

---

## 🔧 COMO FUNCIONA INTERNAMENTE

### Fluxo de Classificação:

```
1. Azure Function insere registro no dre_fabric
        ↓
2. TRIGGER dispara automaticamente (BEFORE INSERT)
        ↓
3. Função classify_transaction_type() é chamada
        ↓
4. Função analisa TAG1 e TAGORC
        ↓
5. Retorna o código correto (01, 02, 03, etc)
        ↓
6. Registro é salvo com type preenchido ✅
```

### Quando o Trigger Dispara:
- ✅ **INSERT**: Sempre, em todos os novos registros
- ✅ **UPDATE**: Apenas se TAG1 ou TAGORC mudarem

---

## 🧪 COMO TESTAR

### Teste 1: Inserir registro
```sql
INSERT INTO dre_fabric (chave, tag1, tag_orc, valor, filial, cia)
VALUES ('TESTE001', 'RECEITAS', NULL, 1000, 'Matriz', 'SAP');

SELECT chave, tag1, tag_orc, type FROM dre_fabric WHERE chave = 'TESTE001';
-- Esperado: type = '01. RECEITA LIQUIDA'

DELETE FROM dre_fabric WHERE chave = 'TESTE001';
```

### Teste 2: Testar a função diretamente
```sql
SELECT classify_transaction_type('RECEITAS', NULL);
-- Resultado: '01. RECEITA LIQUIDA'

SELECT classify_transaction_type(NULL, 'ENERGIA');
-- Resultado: '02. CUSTOS VARIÁVEIS (UNIDADES)'

SELECT classify_transaction_type(NULL, 'PUBLICIDADE');
-- Resultado: '04. SG&A'

SELECT classify_transaction_type('CAPEX', NULL);
-- Resultado: '14. CAPEX'
```

---

## 📊 CONSULTAS ÚTEIS

### Ver distribuição por tipo:
```sql
SELECT
  type,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual
FROM dre_fabric
GROUP BY type
ORDER BY type;
```

### Ver registros não classificados:
```sql
SELECT DISTINCT
  tag1,
  tag_orc,
  COUNT(*) as qtd
FROM dre_fabric
WHERE type = '99. CADASTRAR TAG0'
GROUP BY tag1, tag_orc
ORDER BY qtd DESC;
```

### Reclassificar todos os registros:
```sql
UPDATE dre_fabric
SET type = classify_transaction_type(tag1, tag_orc);
```

### Ver triggers ativos:
```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'dre_fabric'
  AND trigger_name LIKE '%classify%';
```

---

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

### Problema 1: Novos registros vêm com type NULL
**Causa:** Trigger não está ativo
**Solução:**
```sql
-- Verificar se o trigger existe
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_classify_on_insert';

-- Se não existir, execute setup_type_column_with_classification.sql
```

### Problema 2: Muitos registros em "99. CADASTRAR TAG0"
**Causa:** TAG1 ou TAGORC têm valores não mapeados
**Solução:**
```sql
-- Ver quais valores precisam ser adicionados
SELECT DISTINCT tag1, tag_orc, COUNT(*)
FROM dre_fabric
WHERE type = '99. CADASTRAR TAG0'
GROUP BY tag1, tag_orc
ORDER BY COUNT(*) DESC;

-- Editar classification_rules_type.sql e adicionar as novas categorias
```

### Problema 3: Editei as regras mas não atualizou
**Causa:** Não executou o arquivo SQL no Supabase
**Solução:**
```sql
-- Execute o arquivo classification_rules_type.sql no Supabase
-- Depois reclassifique os registros:
UPDATE dre_fabric
SET type = classify_transaction_type(tag1, tag_orc);
```

---

## 🎓 EXEMPLO COMPLETO DE ADIÇÃO DE REGRA

### Cenário: Adicionar categoria "MARKETING DIGITAL"

#### 1. Abrir `classification_rules_type.sql`

#### 2. Adicionar novo bloco ELSIF:
```sql
-- ... regras existentes ...

ELSIF p_tagorc IN (
  'GOOGLE ADS',
  'FACEBOOK ADS',
  'LINKEDIN ADS',
  'MARKETING DIGITAL'
) THEN
  RETURN '05. MARKETING DIGITAL';

-- ... resto das regras ...
```

#### 3. Executar no Supabase:
```bash
# Copiar todo o conteúdo de classification_rules_type.sql
# Colar no SQL Editor do Supabase
# Executar
```

#### 4. Testar:
```sql
SELECT classify_transaction_type(NULL, 'GOOGLE ADS');
-- Resultado: '05. MARKETING DIGITAL'
```

#### 5. Reclassificar registros existentes:
```sql
UPDATE dre_fabric
SET type = classify_transaction_type(tag1, tag_orc)
WHERE tag_orc IN ('GOOGLE ADS', 'FACEBOOK ADS', 'LINKEDIN ADS', 'MARKETING DIGITAL');
```

---

## 📞 SUPORTE

**Dúvidas sobre:**
- Como editar regras → Ver seção "COMO EDITAR AS REGRAS"
- Registros não classificados → Ver seção "PROBLEMAS COMUNS"
- Performance → Triggers são extremamente rápidos (< 1ms)

---

## ✅ CHECKLIST DE INSTALAÇÃO

- [ ] Executei `classification_rules_type.sql` no Supabase
- [ ] Executei `setup_type_column_with_classification.sql` no Supabase
- [ ] Verifiquei que a coluna `type` existe
- [ ] Verifiquei que os triggers existem
- [ ] Testei inserir um registro de teste
- [ ] Vi a distribuição por tipo com SELECT

---

**Sistema pronto para uso! 🎉**

*Última atualização: 2026-02-03*
