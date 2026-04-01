# Pipeline: Microsoft Fabric → Supabase

Script Python para extrair dados do Microsoft Fabric Data Warehouse e carregar no Supabase.

## 📋 Pré-requisitos

1. **ODBC Driver 18 for SQL Server**
   - Download: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server

2. **Python 3.8+**

3. **Conta Azure com acesso ao Fabric**

4. **Conta Supabase**

## 🚀 Instalação

1. Instale as dependências:
```bash
pip install -r requirements.txt
```

Ou use o script automatizado:
```bash
install_dependencies.bat
```

2. Configure suas credenciais:
```bash
# Opção 1: Criar arquivo .env
copy .env.example .env
# Edite o arquivo .env com suas credenciais

# Opção 2: Variáveis de ambiente
set SUPABASE_URL=https://seu-projeto.supabase.co
set SUPABASE_KEY=sua-chave-aqui
```

3. Edite o arquivo `fabric_to_supabase.py`:
   - Linhas 18-19: Configure SUPABASE_URL e SUPABASE_KEY

## ▶️ Execução

### 1. Criar tabela no Supabase
1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em SQL Editor
4. Copie e execute o conteúdo de `create_supabase_table.sql`

### 2. Testar conexões
```bash
python test_connections.py
```

### 3. Executar o pipeline
```bash
python fabric_to_supabase.py
```

O script irá:
1. Abrir o navegador para login no Azure AD (primeira execução)
2. Conectar ao Fabric database "DRE"
3. Executar a query SQL (dados de 2026-01-01 até hoje)
4. Conectar ao Supabase
5. Gravar os dados na tabela "dre_fabric"

## 📊 Obtendo credenciais do Supabase

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em Settings → API
4. Copie:
   - **URL**: Project URL
   - **Key**: `service_role` key (para escrita sem RLS)

## ⚙️ Personalização

### Modo de carga
No arquivo Python, altere o parâmetro `mode` (linha 183):
- `mode="replace"`: Substitui os dados (padrão)
- `mode="append"`: Adiciona aos dados existentes

### Lotes
Ajuste `batch_size` (linha 153) para inserções maiores/menores.

## 📁 Estrutura dos Arquivos

- `fabric_to_supabase.py` - Script principal do pipeline
- `test_connections.py` - Testa conexões antes de rodar o pipeline
- `create_supabase_table.sql` - SQL para criar a tabela no Supabase
- `install_dependencies.bat` - Instala dependências Python
- `requirements.txt` - Lista de dependências
- `.env.example` - Exemplo de arquivo de credenciais

## 🔒 Segurança

- Nunca commite o arquivo `.env` com credenciais
- Use `service_role` key apenas quando necessário
- Configure Row Level Security (RLS) no Supabase se necessário

## 🐛 Troubleshooting

### Erro: "Driver not found"
- Instale o ODBC Driver 18 for SQL Server

### Erro: "Authentication failed"
- Verifique se sua conta Azure tem acesso ao Fabric
- Tente fazer logout e login novamente no navegador

### Erro: "Table does not exist"
- Execute o script `create_supabase_table.sql` no Supabase

### Erro: "Invalid Supabase credentials"
- Verifique se SUPABASE_URL e SUPABASE_KEY estão corretos
- Use a `service_role` key para operações de escrita
