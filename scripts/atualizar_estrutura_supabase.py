"""
Script para atualizar a estrutura da tabela dre_fabric no Supabase
Adiciona a coluna chave_id
"""

import requests

# Configurações
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

print("=" * 60)
print("ATUALIZAR ESTRUTURA SUPABASE")
print("=" * 60)
print()

# SQL para adicionar a coluna chave_id
sql_add_column = """
-- Adicionar coluna chave_id (TEXT)
-- Identificador unico: CODCOLIGADA + INTEGRACHAVE_TRATADA + contador sequencial
-- Formato: "1-12345-1", "1-12345-2", "2-67890-1"
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS chave_id TEXT;

-- Criar indice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_dre_fabric_chave_id ON dre_fabric(chave_id);
"""

print("Executando SQL para adicionar coluna chave_id...")
print()

try:
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    # Tentar executar via função customizada (se existir)
    # Se não existir, precisaremos usar o SQL Editor no painel do Supabase
    payload = {"query": sql_add_column}
    response = requests.post(url, headers=headers, json=payload)

    if response.status_code in [200, 201, 204]:
        print("[SUCESSO] Coluna chave_id adicionada!")
        print()
        print("Estrutura atualizada:")
        print("- Coluna: chave_id (TEXT)")
        print("- Índice: idx_dre_fabric_chave_id")
    else:
        print(f"[ATENÇÃO] API retornou status {response.status_code}")
        print()
        print("Execute manualmente no SQL Editor do Supabase:")
        print()
        print(sql_add_column)

except Exception as e:
    print(f"[ATENÇÃO] Não foi possível executar automaticamente: {e}")
    print()
    print("Execute manualmente no SQL Editor do Supabase:")
    print()
    print(sql_add_column)

print()
print("=" * 60)
print("PRÓXIMOS PASSOS:")
print("=" * 60)
print("1. Verificar se a coluna foi adicionada no Supabase")
print("2. Executar sync_via_function.py para testar")
print("3. Fazer deploy da Azure Function atualizada")
print()
