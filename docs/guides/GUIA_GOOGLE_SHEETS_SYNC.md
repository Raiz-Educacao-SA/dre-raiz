# 🔄 Guia - Sincronização Google Sheets → Supabase

Sistema de sincronização automática do plano de contas contábil do Google Sheets para o banco de dados Supabase.

---

## 🎯 O Que Foi Implementado

### ✅ Tabela no Supabase

**Nome:** `conta_contabil`

**Colunas:**
- `id` - UUID (chave primária)
- `cod_conta` - Código da conta (único)
- `tag1`, `tag2`, `tag3`, `tag4` - Tags de categorização
- `tag_orc` - Tag orçamentária
- `ger` - Gerencial
- `bp_dre` - Balanço Patrimonial ou DRE
- `nat_orc` - Natureza Orçamentária
- `nome_nat_orc` - Nome da Natureza Orçamentária
- `responsavel` - Responsável
- `synced_at` - Data/hora da última sincronização
- `created_at`, `updated_at` - Timestamps

### ✅ Sincronização Automática

**Métodos:**
1. **Em tempo real** - Ao editar qualquer célula
2. **Periódica** - A cada 1 hora (automático)
3. **Manual** - Botão no menu do Google Sheets

**Tecnologia:** Google Apps Script

---

## 📋 Passo a Passo de Instalação

### PARTE 1: Criar Tabela no Supabase

**1. Acessar Supabase Dashboard:**
```
https://supabase.com/dashboard
```

**2. Ir para SQL Editor**

**3. Copiar e executar o script:**
```
database/create_conta_contabil.sql
```

**4. Verificar se a tabela foi criada:**
```sql
SELECT * FROM conta_contabil LIMIT 5;
```

---

### PARTE 2: Configurar Google Apps Script

**1. Abrir o Google Sheets:**
```
https://docs.google.com/spreadsheets/d/1j2diM2PR4VUocjY0LJho3rE37fNOrMSoICulPSRhh58/edit
```

**2. Menu: Extensões → Apps Script**

**3. Apagar código existente (se houver)**

**4. Copiar código do arquivo:**
```
google-sheets-sync/google-apps-script.js
```

**5. Colar no editor do Apps Script**

**6. Configurar credenciais (IMPORTANTE!):**

Localizar no início do código:
```javascript
const CONFIG = {
  SUPABASE_URL: 'https://seu-projeto.supabase.co',  // ← ALTERAR
  SUPABASE_KEY: 'eyJ...',                            // ← ALTERAR
  SHEET_NAME: 'Conta Cont',                          // ← Já configurado
  SYNC_MODE: 'supabase'                              // ← OK
};
```

**7. Pegar credenciais do Supabase:**

No Supabase Dashboard:
- Settings → API
- **URL:** Copiar "Project URL"
- **KEY:** Copiar "service_role" key (NÃO a anon key!)

⚠️ **IMPORTANTE:** Use a `service_role` key, não a `anon` key!

**8. Colar as credenciais no código:**
```javascript
SUPABASE_URL: 'https://xxxxxxxxxxx.supabase.co',
SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
```

**9. Salvar (Ctrl + S ou botão Salvar)**

**10. Renomear projeto (opcional):**
- Clicar no nome "Sem título"
- Renomear para "Sincronização Conta Contábil"

---

### PARTE 3: Ativar Sincronização Automática

**1. Fechar o editor do Apps Script**

**2. Voltar para o Google Sheets**

**3. Atualizar a página (F5)**

**4. Verificar se apareceu menu novo:**
```
🔄 Sincronização
```

**5. Clicar: 🔄 Sincronização → ⚙️ Configurar Sincronização Automática**

**6. Autorizar o script:**
- Clicar "Continuar"
- Escolher sua conta Google
- Clicar "Avançado"
- Clicar "Ir para Sincronização Conta Contábil (não seguro)"
- Clicar "Permitir"

**7. Aguardar mensagem de sucesso:**
```
✅ Sincronização automática configurada!
Agora qualquer edição será sincronizada automaticamente.
```

---

### PARTE 4: Sincronização Inicial

**1. Menu: 🔄 Sincronização → ✅ Sincronizar Tudo Agora**

**2. Aguardar processamento**

**3. Verificar mensagem:**
```
Sincronização concluída!
✅ Sucesso: X
❌ Erros: 0
```

**4. Verificar no Supabase:**
```sql
SELECT COUNT(*) FROM conta_contabil;
SELECT * FROM conta_contabil ORDER BY cod_conta LIMIT 10;
```

---

## 🧪 Como Testar

### Teste 1: Sincronização em Tempo Real

**1. No Google Sheets:**
- Editar qualquer célula da aba "Conta Cont"
- Exemplo: Mudar "Tag1" de uma linha

**2. Aguardar 2-3 segundos**

**3. Verificar no Supabase:**
```sql
SELECT * FROM conta_contabil
WHERE cod_conta = 'CODIGO_QUE_VOCE_EDITOU'
ORDER BY updated_at DESC;
```

**4. Verificar campo `synced_at`:**
- Deve ter timestamp recente

---

### Teste 2: Adicionar Nova Linha

**1. No Google Sheets:**
- Adicionar nova linha no final
- Preencher CODCONTA e outros campos

**2. Aguardar 2-3 segundos**

**3. Verificar no Supabase:**
```sql
SELECT * FROM conta_contabil
WHERE cod_conta = 'NOVO_CODIGO'
ORDER BY created_at DESC;
```

---

### Teste 3: Deletar Linha

⚠️ **ATENÇÃO:** Deletar linha no Sheets **NÃO** deleta no Supabase automaticamente (por segurança).

Para deletar no Supabase:
```sql
DELETE FROM conta_contabil WHERE cod_conta = 'CODIGO_PARA_DELETAR';
```

---

## 🔗 JOIN com Transactions

### View Automática (Já Criada)

```sql
SELECT * FROM vw_transactions_with_conta
WHERE brand = 'RAIZ'
LIMIT 100;
```

### Query Manual

```sql
SELECT
  t.*,
  c.tag1,
  c.tag2,
  c.bp_dre,
  c.responsavel
FROM transactions t
LEFT JOIN conta_contabil c ON t.account = c.cod_conta
WHERE t.scenario = 'Real'
  AND t.period >= '2026-01-01'
ORDER BY t.date DESC;
```

### Filtrar por Tag

```sql
SELECT
  c.tag1,
  SUM(t.amount) as total
FROM transactions t
INNER JOIN conta_contabil c ON t.account = c.cod_conta
WHERE t.scenario = 'Real'
GROUP BY c.tag1
ORDER BY total DESC;
```

### Análise por Responsável

```sql
SELECT
  c.responsavel,
  c.bp_dre,
  COUNT(t.id) as num_transacoes,
  SUM(t.amount) as valor_total
FROM transactions t
INNER JOIN conta_contabil c ON t.account = c.cod_conta
WHERE t.scenario = 'Real'
  AND t.period = '2026-01'
GROUP BY c.responsavel, c.bp_dre
ORDER BY valor_total DESC;
```

---

## 📊 Menu de Sincronização

Após instalação, você terá este menu no Google Sheets:

```
🔄 Sincronização
  ├─ ✅ Sincronizar Tudo Agora
  ├─ ⚙️ Configurar Sincronização Automática
  ├─ 🗑️ Desativar Sincronização
  ├─────────────
  └─ ℹ️ Sobre
```

### Funcionalidades

**✅ Sincronizar Tudo Agora:**
- Sincroniza todas as linhas manualmente
- Útil para sincronização inicial
- Útil após fazer muitas mudanças

**⚙️ Configurar Sincronização Automática:**
- Ativa gatilhos automáticos
- Sincronização ao editar
- Sincronização a cada 1 hora

**🗑️ Desativar Sincronização:**
- Remove todos os gatilhos
- Para de sincronizar automaticamente
- Pode reativar depois

**ℹ️ Sobre:**
- Informações do sistema
- Versão e documentação

---

## 🔧 Logs e Depuração

### Ver Logs no Apps Script

**1. Apps Script Editor**

**2. Menu: Executar → Ver execuções**

**3. Verificar logs:**
```
📊 Sincronizando 150 linhas...
✅ Linha 2 sincronizada com sucesso
✅ Linha 3 sincronizada com sucesso
...
✅ Sincronização completa: 150 sucesso, 0 erros
```

### Ver Erros

Se houver erro:
```
❌ Erro na linha 25: Supabase erro: {...}
```

Causas comuns:
- API key incorreta
- URL incorreta
- Rede bloqueada
- Linha com dados inválidos

---

## 🐛 Troubleshooting

### ❌ Menu não aparece

**Causa:** Apps Script não foi salvo ou autorizado

**Solução:**
1. Apps Script → Salvar
2. Fechar e reabrir Google Sheets
3. Autorizar quando solicitado

---

### ❌ Erro: "SUPABASE_KEY não configurado"

**Causa:** Credenciais não foram configuradas

**Solução:**
1. Apps Script → Editar
2. Verificar CONFIG no início do código
3. Copiar credenciais do Supabase
4. Salvar

---

### ❌ Erro: "Supabase erro 401"

**Causa:** API key inválida ou expirada

**Solução:**
1. Supabase Dashboard → Settings → API
2. Copiar nova `service_role` key
3. Atualizar no Apps Script
4. Salvar

---

### ❌ Erro: "Aba 'Conta Cont' não encontrada"

**Causa:** Nome da aba diferente

**Solução:**
1. Verificar nome exato da aba
2. Apps Script → CONFIG → SHEET_NAME
3. Alterar para nome correto
4. Salvar

---

### ❌ Sincronização lenta

**Normal!** Apps Script tem limitações:
- ~20-30 linhas por segundo
- Para 500+ linhas: 15-20 segundos

**Alternativa:** Importação CSV direta no Supabase

---

### ❌ Algumas linhas não sincronizam

**Causa:** CODCONTA vazio

**Solução:**
- Apenas linhas com CODCONTA preenchido são sincronizadas
- Verificar se há células vazias

---

## 🚀 Funcionalidades Avançadas

### Sincronização Seletiva

Editar Apps Script para sincronizar apenas certas condições:

```javascript
function onEdit(e) {
  const sheet = e.source.getActiveSheet();

  // Sincronizar apenas se for aba "Conta Cont"
  if (sheet.getName() !== CONFIG.SHEET_NAME) {
    return;
  }

  // Sincronizar apenas colunas A-K
  if (e.range.getColumn() > 11) {
    return;
  }

  syncRow(e.range.getRow());
}
```

### Sincronização em Lote

Para melhor performance com muitas linhas:

```javascript
function syncInBatches() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const BATCH_SIZE = 50;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    // Processar lote...
    Utilities.sleep(1000); // Aguardar 1s entre lotes
  }
}
```

### Webhooks

Para sincronização mais rápida, configure webhook:

**1. Backend recebe webhook do Google**
**2. Processa e atualiza Supabase**
**3. Responde em < 1s**

---

## 📚 Arquivos Criados

```
database/
└── create_conta_contabil.sql       # Schema da tabela

google-sheets-sync/
└── google-apps-script.js           # Código para Google Sheets

api/
└── sync/
    └── conta-contabil.ts           # Endpoint da API (opcional)

GUIA_GOOGLE_SHEETS_SYNC.md          # Esta documentação
```

---

## 🎯 Checklist de Implementação

### Supabase
- [ ] Executar `create_conta_contabil.sql`
- [ ] Verificar tabela criada
- [ ] Copiar URL e service_role key

### Google Apps Script
- [ ] Abrir Apps Script no Google Sheets
- [ ] Colar código
- [ ] Configurar credenciais (URL + KEY)
- [ ] Salvar
- [ ] Autorizar script

### Sincronização
- [ ] Configurar gatilhos automáticos
- [ ] Sincronizar tudo (primeira vez)
- [ ] Verificar dados no Supabase
- [ ] Testar edição em tempo real

### Integração
- [ ] Testar JOIN com transactions
- [ ] Verificar view `vw_transactions_with_conta`
- [ ] Criar queries personalizadas

---

## ✅ Resultado Final

Após implementação completa:

**✅ Tabela no Supabase:**
- `conta_contabil` com todas as colunas
- Índices otimizados
- RLS configurado
- View com JOIN automático

**✅ Sincronização Automática:**
- Em tempo real ao editar
- Periódica a cada 1 hora
- Manual quando necessário
- Menu customizado no Sheets

**✅ Integração:**
- JOIN com transactions funcionando
- Queries otimizadas
- Análises por tag/responsável/BP-DRE

---

## 🎉 Benefícios

**Antes:**
- ❌ Plano de contas só no Google Sheets
- ❌ Sem integração com transactions
- ❌ Análises manuais

**Depois:**
- ✅ Plano de contas no banco de dados
- ✅ JOIN automático com transactions
- ✅ Análises por tags, BP/DRE, responsável
- ✅ Sincronização automática
- ✅ Sem esforço manual

---

**Data:** 31 de Janeiro de 2026
**Versão:** 1.0.0
**Status:** ✅ PRONTO PARA IMPLEMENTAR

🔄 **Sincronização Google Sheets → Supabase configurada!**
