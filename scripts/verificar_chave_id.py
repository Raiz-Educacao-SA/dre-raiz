"""
Script para verificar se a coluna chave_id está populada no Supabase
"""

import requests

# Configurações
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

print("=" * 60)
print("VERIFICAR COLUNA chave_id NO SUPABASE")
print("=" * 60)
print()

try:
    # Buscar primeiros 10 registros
    url = f"{SUPABASE_URL}/rest/v1/dre_fabric?select=id,chave,codcoligada,integrachave_tratada,chave_id&limit=10"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        registros = response.json()
        print(f"Total de registros retornados: {len(registros)}")
        print()

        # Contar quantos têm chave_id preenchido
        com_chave_id = sum(1 for r in registros if r.get('chave_id'))
        sem_chave_id = len(registros) - com_chave_id

        print(f"Com chave_id preenchido: {com_chave_id}")
        print(f"Sem chave_id (NULL):     {sem_chave_id}")
        print()

        # Mostrar exemplos
        print("EXEMPLOS DOS DADOS:")
        print("-" * 60)
        for i, reg in enumerate(registros[:5], 1):
            print(f"{i}. ID: {reg.get('id')}")
            print(f"   CHAVE: {reg.get('chave')}")
            print(f"   CODCOLIGADA: {reg.get('codcoligada')}")
            print(f"   INTEGRACHAVE_TRATADA: {reg.get('integrachave_tratada')}")
            print(f"   CHAVE_ID: {reg.get('chave_id') or '(VAZIO)'}")
            print()

        # Verificar total no banco
        url_count = f"{SUPABASE_URL}/rest/v1/dre_fabric?select=count"
        headers_count = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Prefer': 'count=exact'
        }
        response_count = requests.get(url_count, headers=headers_count)

        if 'content-range' in response_count.headers:
            total = response_count.headers['content-range'].split('/')[-1]
            print(f"Total de registros no banco: {total}")
            print()

        # Contar quantos registros têm chave_id no banco inteiro
        url_with_chave = f"{SUPABASE_URL}/rest/v1/dre_fabric?select=count&chave_id=not.is.null"
        response_with = requests.get(url_with_chave, headers=headers_count)

        if 'content-range' in response_with.headers:
            total_com_chave = response_with.headers['content-range'].split('/')[-1]
            print(f"Registros COM chave_id no banco: {total_com_chave}")

        url_without_chave = f"{SUPABASE_URL}/rest/v1/dre_fabric?select=count&chave_id=is.null"
        response_without = requests.get(url_without_chave, headers=headers_count)

        if 'content-range' in response_without.headers:
            total_sem_chave = response_without.headers['content-range'].split('/')[-1]
            print(f"Registros SEM chave_id no banco: {total_sem_chave}")

        print()
        print("=" * 60)

        if sem_chave_id > 0 or total_sem_chave != '0':
            print("⚠️  AÇÃO NECESSÁRIA:")
            print("1. Execute o SQL: atualizar_function_insert_dre_batch.sql")
            print("2. Limpe a tabela e execute sync_via_function.py novamente")
        else:
            print("✅ Todos os registros têm chave_id preenchido!")

    else:
        print(f"[ERRO] Status {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"[ERRO] {e}")
    import traceback
    traceback.print_exc()

print()
