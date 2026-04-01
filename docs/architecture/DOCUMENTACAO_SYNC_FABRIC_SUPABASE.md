# DOCUMENTAÇÃO - SINCRONIZAÇÃO AUTOMÁTICA FABRIC → SUPABASE

**Data de Implementação:** 02/02/2026
**Desenvolvido por:** Edmilson Serafim
**Status:** ✅ Operacional

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura da Solução](#arquitetura-da-solução)
3. [Componentes Criados](#componentes-criados)
4. [Configurações e Credenciais](#configurações-e-credenciais)
5. [Como Funciona](#como-funciona)
6. [Monitoramento](#monitoramento)
7. [Troubleshooting](#troubleshooting)
8. [Manutenção e Atualizações](#manutenção-e-atualizações)

---

## 🎯 VISÃO GERAL

### Objetivo
Sincronizar automaticamente os dados do Microsoft Fabric Data Warehouse (tabela DRE) para o Supabase (tabela dre_fabric), executando diariamente às 08:00 AM (Horário de Brasília).

### Benefícios
- ✅ Atualização automática diária dos dados
- ✅ Não requer login manual (Service Principal)
- ✅ Dados tratados com JOINs de múltiplas tabelas
- ✅ Custo mínimo (R$ 0-10/mês)
- ✅ Logs e monitoramento integrados

### Fluxo de Dados
```
Microsoft Fabric (DRE) → Azure Function → Supabase (dre_fabric)
     107k registros          Python          Atualização diária
```

---

## 🏗️ ARQUITETURA DA SOLUÇÃO

### Componentes

1. **Microsoft Fabric Data Warehouse**
   - Database: DRE
   - Tabelas: DRE, Filial, Tags, Fornecedor_Tags
   - Server: brexl7eomxoerljqiapyaul67i-tscdkva6temu3gn4zp67tlafl4.datawarehouse.fabric.microsoft.com

2. **Azure Service Principal**
   - Nome: fabric-supabase-sync
   - Função: Autenticação automática (sem login manual)
   - Permissões: Leitura no Fabric

3. **Azure Function App**
   - Nome: fabric-sync-dre
   - Região: Brazil South
   - Runtime: Python 3.11
   - Plan: Consumption (Serverless)
   - Resource Group: rg-fabric-sync

4. **Supabase Database**
   - URL: https://vafmufhlompwsdrlhkfz.supabase.co
   - Tabela: dre_fabric
   - Registros: ~107,112

### Diagrama de Arquitetura
```
┌─────────────────────────────────────────────────────────────┐
│                     MICROSOFT FABRIC                         │
│  ┌────────┐  ┌────────┐  ┌──────┐  ┌────────────────┐      │
│  │  DRE   │  │ Filial │  │ Tags │  │ Fornecedor_Tags│      │
│  └────────┘  └────────┘  └──────┘  └────────────────┘      │
│       │           │          │              │                │
│       └───────────┴──────────┴──────────────┘                │
│                      │                                        │
└──────────────────────┼────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   SERVICE PRINCIPAL         │
         │   (Autenticação Azure AD)   │
         └─────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │     AZURE FUNCTION          │
         │   fabric-sync-dre           │
         │   • Timer: 08:00 BRT        │
         │   • Python 3.11             │
         │   • Serverless              │
         └─────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │      SUPABASE               │
         │   Tabela: dre_fabric        │
         │   ~107k registros           │
         └─────────────────────────────┘
```

---

## 🔧 COMPONENTES CRIADOS

### 1. Service Principal (Azure AD)

**Nome:** fabric-supabase-sync

**IDs importantes:**
- Client ID: ae63bd51-263f-4bb7-aabd-c04c2d44d384
- Tenant ID: fc75490c-658e-48dc-ad30-401f80517efa
- Client Secret: OgU8Q~rVCDHsFjbUYCI7N5jlgC2bWZx-RDbTcdh1 (expira em: verificar no Azure)

**Permissões:**
- Viewer no Workspace do Fabric "Plan Financeiro RAIZ"
- Acesso de leitura ao Data Warehouse DRE

**Como foi criado:**
```
Azure Portal → Azure Active Directory → App registrations
→ New registration → fabric-supabase-sync
→ Certificates & secrets → New client secret
```

---

### 2. Azure Function App

**Configuração:**
- Nome: fabric-sync-dre
- Resource Group: rg-fabric-sync
- Region: Brazil South
- Runtime: Python 3.11
- OS: Linux
- Plan Type: Consumption (Serverless)
- URL: https://fabric-sync-dre-crezcwh9bzaveya6.brazilsouth-01.azurewebsites.net

**Estrutura de arquivos:**
```
azure_function/
├── host.json              # Configurações globais
├── requirements.txt       # Dependências Python
└── FabricSyncTimer/       # Pasta da função
    ├── __init__.py        # Código principal
    └── function.json      # Configuração do timer
```

**Dependências (requirements.txt):**
```
azure-functions
pyodbc
requests
azure-identity
```

**Timer Configuration (function.json):**
```json
{
  "scriptFile": "__init__.py",
  "bindings": [
    {
      "name": "mytimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 11 * * *"
    }
  ]
}
```
- Schedule: 0 0 11 * * * = 11:00 UTC = 08:00 BRT

---

### 3. Variáveis de Ambiente (Azure Function)

Configuradas em: Azure Portal → fabric-sync-dre → Configuration → Application settings

| Nome | Valor | Descrição |
|------|-------|-----------|
| FABRIC_SERVER | brexl7eomxoerljqiapyaul67i-tscdkva6temu3gn4zp67tlafl4.datawarehouse.fabric.microsoft.com | Servidor do Fabric |
| FABRIC_DATABASE | DRE | Nome do database |
| TENANT_ID | fc75490c-658e-48dc-ad30-401f80517efa | Azure AD Tenant |
| CLIENT_ID | ae63bd51-263f-4bb7-aabd-c04c2d44d384 | Service Principal ID |
| CLIENT_SECRET | OgU8Q~rVCDHsFjbUYCI7N5jlgC2bWZx-RDbTcdh1 | Service Principal Secret |
| SUPABASE_URL | https://vafmufhlompwsdrlhkfz.supabase.co | URL do Supabase |
| SUPABASE_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... | Service Role Key |

---

## ⚙️ COMO FUNCIONA

### Fluxo de Execução

1. **Trigger Automático**
   - Timer dispara todos os dias às 08:00 AM (Horário de Brasília)
   - Ou pode ser executado manualmente pelo Azure Portal

2. **Autenticação no Fabric**
   - Usa Service Principal (CLIENT_ID + CLIENT_SECRET)
   - Obtém token do Azure AD
   - Conecta no Fabric Data Warehouse via ODBC

3. **Busca dos Dados**
   - Executa query SQL complexa com JOINs
   - Tabelas: DRE + Filial + Tags + Fornecedor_Tags
   - Filtro: Data >= 01/01/2026
   - Resultado: ~107,112 registros

4. **Transformação dos Dados**
   - Converte tipos de dados (Date, Decimal, etc)
   - Formata datas para padrão ISO (YYYY-MM-DD)
   - Limpa valores numéricos
   - Trata valores NULL

5. **Sincronização no Supabase**
   - Limpa tabela dre_fabric (DELETE all)
   - Insere novos dados em lotes de 1000 registros
   - Total: ~107 lotes

6. **Logging**
   - Registra início, progresso e fim
   - Logs disponíveis no Azure Portal
   - Em caso de erro, loga detalhes

### Query SQL Principal

```sql
SELECT
    CONCAT(F.IDLANCAMENTO, F.IDPARTIDA) AS CHAVE,
    CODLOTE, FIL.CIA, FIL.FILIAL, F.INTEGRAAPLICACAO, F.IDPARTIDA,
    F.FLUIG AS TICKET,
    CASE
        WHEN F.CODIGOFORNECEDOR = '' AND (COMPLEMENTO LIKE '%N/ MES%' OR COMPLEMENTO LIKE '%N/ MÊS%' OR COMPLEMENTO LIKE '%N/MÊS%')
            THEN COMPLEMENTO
        WHEN F.CODIGOFORNECEDOR = '' AND (COMPLEMENTO LIKE 'EV____ -%' OR COMPLEMENTO LIKE 'EN____ -%')
            THEN COMPLEMENTO
        WHEN F.CODIGOFORNECEDOR = ''
            THEN F.FORNECEDOR_TRATADO
        WHEN FORN_TAG.[Fornecedor Novo] IS NOT NULL
            THEN FORN_TAG.[Fornecedor Novo]
        ELSE F.NOMEFORNECEDOR
    END AS FORNECEDOR_PADRAO,
    FORMAT(F.DATA,'yyyyMM') AS ANOMES,
    F.VALOR, F.COMPLEMENTO, 'Sim' AS RECORRENTE,
    CASE WHEN T.Tag1 NOT IN ('CUSTOS', 'DESPESAS') THEN F.CONTA ELSE F.CONTA END AS CONTA,
    CASE WHEN T.Tag1 NOT IN ('CUSTOS', 'DESPESAS') THEN T.Tag1 ELSE T.Tag1 END AS TAG1,
    CASE WHEN T.Tag1 NOT IN ('CUSTOS', 'DESPESAS') THEN T.Tag2 ELSE T.Tag2 END AS TAG2,
    CASE WHEN T.Tag1 NOT IN ('CUSTOS', 'DESPESAS') THEN T.Tag3 ELSE T.Tag3 END AS TAG3,
    CASE WHEN T.Tag1 NOT IN ('CUSTOS', 'DESPESAS') THEN T.TAG4 ELSE T.TAG4 END AS TAG4,
    CASE WHEN T.TagOrc NOT IN ('CUSTOS', 'DESPESAS') THEN T.TagOrc ELSE T.TagOrc END AS TAG_ORC,
    'Original' AS ORIGINAL, 'Real' AS R_O, F.CC, F.CODCOLIGADA, F.CODFILIAL, F.USUARIO,
    F.CONTA AS CONTA_ORIGINAL, T.Tag1 AS TAG1_ORIGINAL, T.TAG4 AS TAG4_ORIGINAL,
    T.TagOrc AS TAGORC_ORIGINAL, F.INTEGRACHAVE_TRATADA,
    [STATUS LANC. FINANCEIRO] AS STATUS_LANC_FINANCEIRO,
    FORMAT(F.DATA,'yyyyMM') AS ANOMES_ORIGINAL
FROM DRE F
LEFT JOIN Filial FIL ON FIL.CODCOLIGADA = F.CODCOLIGADA AND FIL.CODFILIAL = F.CODFILIAL
LEFT JOIN Tags T ON T.CODCONTA = F.CONTA
LEFT JOIN Fornecedor_Tags FORN_TAG ON TRIM(FORN_TAG.[Fornecedor Original]) = TRIM(F.NOMEFORNECEDOR)
WHERE F.DATA >= '2026-01-01' AND F.DATA <= GETDATE()
AND T.Tag1 != 'N/A'
ORDER BY F.CODCOLIGADA, F.IDLANCAMENTO, F.IDPARTIDA
```

---

## 📊 MONITORAMENTO

### 1. Logs em Tempo Real

**Azure Portal → fabric-sync-dre → Log stream**

Mostra os logs conforme a função executa:
```
Iniciando sincronizacao DRE Fabric -> Supabase
Conectado ao Fabric
Encontrados 107112 registros
Tabela limpa
Inseridos 107112 registros
Sincronizacao concluida com sucesso!
```

### 2. Histórico de Execuções

**Azure Portal → fabric-sync-dre → Functions → FabricSyncTimer → Monitor**

Mostra:
- Data/hora de cada execução
- Status (Success/Failed)
- Duração
- Logs detalhados

### 3. Verificar Dados no Supabase

**Via Dashboard Supabase:**
```
https://vafmufhlompwsdrlhkfz.supabase.co
→ Table Editor → dre_fabric
```

**Via API REST:**
```bash
curl "https://vafmufhlompwsdrlhkfz.supabase.co/rest/v1/dre_fabric?select=count" \
  -H "apikey: YOUR_KEY" \
  -H "Authorization: Bearer YOUR_KEY"
```

### 4. Alertas (Opcional - para implementar futuramente)

Pode-se configurar:
- Email quando a função falha
- Notificação Slack/Teams
- Azure Monitor Alerts

---

## 🔧 TROUBLESHOOTING

### Erro: "Access Denied" ao conectar no Fabric

**Causa:** Service Principal sem permissão

**Solução:**
1. Azure Portal → Fabric Workspace
2. Settings → Access
3. Adicionar: fabric-supabase-sync como Viewer

---

### Erro: "Invalid client secret"

**Causa:** Client Secret expirado ou incorreto

**Solução:**
1. Azure Portal → Azure Active Directory → App registrations
2. Encontrar: fabric-supabase-sync
3. Certificates & secrets → New client secret
4. Copiar novo secret
5. Azure Function → Configuration → CLIENT_SECRET → Update

---

### Erro: "Connection timeout" ao Fabric

**Causa:** Firewall ou rede bloqueando

**Solução:**
1. Verificar se Azure Function tem acesso à internet
2. Verificar se Fabric permite conexões do Azure
3. Aumentar timeout na connection string (atualmente 30s)

---

### Função não executa no horário esperado

**Causa:** Timezone incorreto

**Verificar:**
- Schedule atual: `0 0 11 * * *` = 11:00 UTC = 08:00 BRT
- Se horário de verão mudar, ajustar schedule

**Alterar horário:**
1. Editar: `azure_function/FabricSyncTimer/function.json`
2. Mudar: `"schedule": "0 0 HH * * *"`
3. Fazer deploy novamente

---

### Dados não atualizam no Supabase

**Verificar:**
1. Azure Function executou com sucesso? (Monitor)
2. SUPABASE_KEY está correto? (Configuration)
3. Tabela dre_fabric existe no Supabase?
4. Service Role Key tem permissão de escrita?

**Teste manual:**
```bash
# Via Python local
cd C:\Users\edmilson.serafim
python sync_fabric_dre_tratado_supabase.py
```

---

## 🔄 MANUTENÇÃO E ATUALIZAÇÕES

### Atualizar Código da Função

1. **Editar o código localmente:**
```bash
cd C:\Users\edmilson.serafim\azure_function\FabricSyncTimer
# Editar __init__.py
```

2. **Fazer deploy:**
```bash
cd C:\Users\edmilson.serafim\azure_function
# Criar ZIP
python -c "import zipfile, os; z = zipfile.ZipFile('../deploy.zip', 'w', zipfile.ZIP_DEFLATED); [z.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), '.')) for root, dirs, files in os.walk('.') for file in files]; z.close()"

# Deploy via Azure CLI
az functionapp deployment source config-zip \
  --resource-group rg-fabric-sync \
  --name fabric-sync-dre \
  --src ../deploy.zip
```

### Alterar Horário de Execução

Editar `FabricSyncTimer/function.json`:
```json
"schedule": "0 0 HH * * *"
```

Onde HH é a hora em UTC:
- 08:00 BRT = 11:00 UTC
- 09:00 BRT = 12:00 UTC
- 18:00 BRT = 21:00 UTC

### Adicionar Nova Variável de Ambiente

```bash
az functionapp config appsettings set \
  --resource-group rg-fabric-sync \
  --name fabric-sync-dre \
  --settings "NOVA_VAR=valor"
```

### Renovar Client Secret

**Quando:** Antes de expirar (verificar data de expiração)

**Como:**
1. Azure Portal → Azure AD → App registrations → fabric-supabase-sync
2. Certificates & secrets → New client secret
3. Copiar novo valor
4. Atualizar CLIENT_SECRET na Function App
5. Testar conexão

### Backup e Recuperação

**Código da função:**
- Está em: `C:\Users\edmilson.serafim\azure_function\`
- Fazer backup regular dessa pasta
- Considerar versionar no Git

**Credenciais:**
- Client Secret: salvar em local seguro
- Supabase Key: acessível no dashboard Supabase
- Documentar todas as configurações

---

## 💰 CUSTOS

### Azure Function (Consumption Plan)

**Pricing:**
- Primeiros 1 milhão de execuções: GRATUITO
- Após isso: ~R$ 0.000001 por execução

**Uso mensal:**
- 1 execução/dia × 30 dias = 30 execuções/mês
- Custo: R$ 0 (dentro do free tier)

**Total estimado: R$ 0-10/mês**

---

## 📞 CONTATOS E SUPORTE

### Desenvolvedor
- Nome: Edmilson Serafim
- Email: edmilson.serafim@raizeducacao.info

### Recursos Azure
- Subscription: Azure subscription 1
- Resource Group: rg-fabric-sync
- Região: Brazil South

### Supabase
- Projeto: vafmufhlompwsdrlhkfz
- URL: https://vafmufhlompwsdrlhkfz.supabase.co

---

## 📝 HISTÓRICO DE ALTERAÇÕES

| Data | Alteração | Responsável |
|------|-----------|-------------|
| 02/02/2026 | Criação inicial da Azure Function | Edmilson Serafim |
| 02/02/2026 | Configuração do Service Principal | Edmilson Serafim |
| 02/02/2026 | Deploy e teste bem-sucedido | Edmilson Serafim |
| 02/02/2026 | Ajuste de horário para 08:00 BRT | Edmilson Serafim |

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [x] Service Principal criado e com permissões
- [x] Azure Function criada e rodando
- [x] Variáveis de ambiente configuradas
- [x] Código implantado com sucesso
- [x] Teste manual executado com sucesso
- [x] Dados sincronizados no Supabase (107,112 registros)
- [x] Horário configurado para 08:00 BRT
- [x] Logs acessíveis e funcionando
- [ ] Primeira execução automática (aguardar 03/02/2026 08:00)
- [ ] Configurar alertas de falha (opcional)
- [ ] Documentar no Git (opcional)

---

## 🚀 PRÓXIMOS PASSOS

1. **Aguardar primeira execução automática** (03/02/2026 08:00)
2. **Validar execução automática** via Monitor
3. **Configurar alertas** em caso de falha (opcional)
4. **Criar dashboard** para visualizar dados sincronizados (opcional)
5. **Implementar versionamento** do código no Git (recomendado)

---

**Documentação criada em:** 02/02/2026
**Última atualização:** 02/02/2026
**Versão:** 1.0

---

## 📚 REFERÊNCIAS

- Azure Functions Documentation: https://docs.microsoft.com/azure/azure-functions/
- Microsoft Fabric Documentation: https://learn.microsoft.com/fabric/
- Supabase Documentation: https://supabase.com/docs
- Python pyodbc: https://github.com/mkleehammer/pyodbc
- Azure Identity SDK: https://docs.microsoft.com/python/api/azure-identity/
