# 📘 GUIA - SINCRONIZAÇÃO MANUAL DO BANCO

## 📋 Arquivo Criado

**Nome:** `Sincronizacao_manual_banco.py`
**Baseado em:** `sync_via_function.py`
**Data:** 04/02/2026

---

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. Conversão de Formato Numérico ⭐
```python
def converter_virgula_para_ponto(value):
    """
    Converte valores brasileiros para formato internacional
    "-3809,23" → "-3809.23"
    "1.234,56" → "1234.56"
    """
```

**O que foi corrigido:**
- ✅ Valores com vírgula agora são convertidos para ponto
- ✅ Remove separadores de milhares (pontos)
- ✅ Mantém sinal negativo
- ✅ Converte para int quando é número inteiro

### 2. Batch Size Reduzido
- **Antes:** 1000 registros
- **Depois:** 500 registros
- **Motivo:** Evitar timeouts no Supabase

### 3. Melhor Tratamento de Erros
- ✅ Timeout de 60 segundos por batch
- ✅ Salva erros em arquivo JSON
- ✅ Mensagens detalhadas de erro

### 4. Validação Automática
- ✅ Verifica contagem final no Supabase
- ✅ Compara com total buscado do Fabric
- ✅ Retorna código de saída (0 = sucesso, 1 = erro)

### 5. Interface Melhorada
- ✅ Emojis para melhor visualização
- ✅ Barra de progresso por batch
- ✅ Resumo final detalhado
- ✅ Encoding UTF-8 configurado

---

## 🚀 COMO USAR

### Passo 1: Abrir Terminal
Abra PowerShell ou CMD

### Passo 2: Navegar até a Pasta
```bash
cd "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"
```

### Passo 3: Executar o Script
```bash
python Sincronizacao_manual_banco.py
```

### Passo 4: Aguardar Conclusão
- O script mostrará progresso em tempo real
- Tempo estimado: 5-10 minutos para 110k registros

---

## 📊 O QUE O SCRIPT FAZ

### [1/5] Conecta ao Fabric
```
✅ Conectado ao Fabric
```
- Usa Service Principal (autenticação automática)
- Sem necessidade de login manual

### [2/5] Busca Dados
```
✅ Buscados 110,708 registros
🔄 Aplicando conversões de formato...
✅ Conversões aplicadas com sucesso
```
- Executa query SQL no Fabric
- Converte vírgulas para pontos
- Converte datas para formato ISO

### [3/5] Limpa Tabela Supabase
```
✅ Tabela limpa (Status: 204)
```
- Remove todos os registros antigos
- Garante dados atualizados

### [4/5] Insere Registros
```
Batch   1/222: ✅  500 registros inseridos
Batch   2/222: ✅  500 registros inseridos
Batch   3/222: ✅  500 registros inseridos
...
Batch 222/222: ✅  208 registros inseridos

RESUMO:
✅ Inseridos: 110,708
❌ Erros:     0
```
- Insere em batches de 500 registros
- Mostra progresso em tempo real
- Salva erros se houver

### [5/5] Valida Resultado
```
Registros no Supabase: 110,708
✅ SUCESSO: Todos os 110,708 registros foram sincronizados!
```
- Verifica total no Supabase
- Compara com total buscado
- Confirma sucesso

---

## 📁 ARQUIVOS GERADOS

### Se houver erros:
**erros_sincronizacao_YYYYMMDD_HHMMSS.json**
```json
[
  {
    "batch": 1,
    "status": 500,
    "mensagem": "Timeout"
  }
]
```

---

## ⚠️ POSSÍVEIS ERROS E SOLUÇÕES

### Erro: "Module not found"
**Solução:**
```bash
pip install pyodbc requests azure-identity
```

### Erro: "Authentication failed"
**Causa:** Service Principal expirado
**Solução:** Verificar credenciais nas linhas 19-21

### Erro: Todos os batches com erro 400
**Causa:** Valores ainda com vírgula
**Solução:** Verificar função `converter_virgula_para_ponto()`

### Erro: Timeout
**Causa:** Batch muito grande ou Supabase lento
**Solução:** Reduzir BATCH_SIZE de 500 para 250 (linha 27)

---

## 🔧 CONFIGURAÇÕES DISPONÍVEIS

### Alterar Tamanho do Batch
**Linha 27:**
```python
BATCH_SIZE = 500  # Altere para 250, 100, etc.
```

### Alterar Data Mínima
**Linha 26:**
```python
DATA_MINIMA = '2026-01-01'  # Altere para '2025-01-01', etc.
```

### Alterar Timeout
**Linha 247:**
```python
response = requests.post(url, headers=headers, json=payload, timeout=60)
# Altere timeout=60 para timeout=120, etc.
```

---

## 📊 DIFERENÇAS DOS OUTROS SCRIPTS

| Feature | sync_via_function.py | fabric_to_supabase_v2.py | **Sincronizacao_manual_banco.py** |
|---------|---------------------|--------------------------|-----------------------------------|
| Converte vírgula → ponto | ❌ | ✅ | ✅ |
| Controle de trigger | ❌ | ✅ | ❌ |
| Batch size otimizado | ❌ (1000) | ✅ (500) | ✅ (500) |
| Validação automática | ⚠️ Básica | ❌ | ✅ Completa |
| Salva erros em arquivo | ❌ | ❌ | ✅ |
| Interface melhorada | ❌ | ⚠️ | ✅ |
| Encoding UTF-8 | ❌ | ✅ | ✅ |

---

## 🎯 QUANDO USAR CADA SCRIPT

### Use `Sincronizacao_manual_banco.py` quando:
- ✅ Automação falhar
- ✅ Precisar rodar manualmente
- ✅ Quiser validação completa
- ✅ Quiser log de erros detalhado

### Use `fabric_to_supabase_v2.py` quando:
- ✅ Precisar controlar triggers
- ✅ Quiser comparação automática ao final

### Use `sync_via_function.py`:
- ❌ NÃO use mais (valores com vírgula falham)

---

## 📞 SUPORTE

**Desenvolvedor:** Edmilson Serafim
**Email:** edmilson.serafim@raizeducacao.info
**Arquivo:** Sincronizacao_manual_banco.py
**Versão:** 1.0
**Data:** 04/02/2026

---

## ✅ CHECKLIST DE EXECUÇÃO

Antes de executar, verifique:

- [ ] Python instalado (versão 3.7+)
- [ ] Bibliotecas instaladas (pyodbc, requests, azure-identity)
- [ ] Conectividade com Fabric
- [ ] Conectividade com Supabase
- [ ] Espaço suficiente no Supabase
- [ ] Service Principal válido

Ao executar:

- [ ] Navegou até a pasta correta
- [ ] Executou `python Sincronizacao_manual_banco.py`
- [ ] Aguardou conclusão (não interrompeu)
- [ ] Verificou mensagem final de sucesso
- [ ] Conferiu total de registros no Supabase

---

**FIM DO GUIA**
