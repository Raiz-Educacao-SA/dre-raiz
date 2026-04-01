"""
Script de sincronização usando SQL Function (bypassa cache)
"""

import struct
import pyodbc
import requests
import json
from datetime import datetime, date, time
from decimal import Decimal
from azure.identity import ClientSecretCredential

# Configurações
TENANT_ID = 'fc75490c-658e-48dc-ad30-401f80517efa'
CLIENT_ID = 'ae63bd51-263f-4bb7-aabd-c04c2d44d384'
CLIENT_SECRET = 'OgU8Q~rVCDHsFjbUYCI7N5jlgC2bWZx-RDbTcdh1'
FABRIC_SERVER = 'brexl7eomxoerljqiapyaul67i-tscdkva6temu3gn4zp67tlafl4.datawarehouse.fabric.microsoft.com'
FABRIC_DATABASE = 'DRE'
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'
SUPABASE_TABLE = 'dre_fabric'
DATA_MINIMA = '2026-01-01'

def get_azure_token():
    credential = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    token = credential.get_token("https://database.windows.net/.default")
    return token.token

def converter_data_brasileira(value):
    if isinstance(value, str) and '/' in value:
        try:
            parts = value.split('/')
            if len(parts) == 3:
                dia, mes, ano = parts
                return f"{ano}-{mes.zfill(2)}-{dia.zfill(2)}"
        except:
            pass
    return value

def limpar_valor_numerico(value):
    if isinstance(value, str):
        value = value.strip()
        value = value.replace(',', '.')
        try:
            float_val = float(value)
            if float_val.is_integer():
                return int(float_val)
            return float_val
        except:
            return value
    elif isinstance(value, float):
        if value.is_integer():
            return int(value)
        return value
    return value

def conectar_fabric():
    print("Conectando ao Fabric...")
    token = get_azure_token()
    token_bytes = token.encode('utf-16-le')
    token_struct = struct.pack(f'<I{len(token_bytes)}s', len(token_bytes), token_bytes)

    connection_string = (
        f"Driver={{ODBC Driver 18 for SQL Server}};"
        f"Server={FABRIC_SERVER};"
        f"Database={FABRIC_DATABASE};"
        f"Encrypt=yes;"
        f"TrustServerCertificate=no;"
        f"Connection Timeout=30;"
    )

    conn = pyodbc.connect(connection_string, attrs_before={1256: token_struct})
    print("[OK] Conectado ao Fabric")
    return conn

def buscar_dados_tratados(conn):
    print("Buscando dados do Fabric...")

    query = f"""
    SELECT
        CONCAT(F.IDLANCAMENTO, F.IDPARTIDA) AS CHAVE,
        CODLOTE, FIL.CIA, FIL.FILIAL, F.INTEGRAAPLICACAO, F.IDPARTIDA,
        F.FLUIG AS TICKET,
        CASE
            WHEN F.CODIGOFORNECEDOR = '' AND (COMPLEMENTO LIKE '%N/ MES%' OR COMPLEMENTO LIKE '%N/ MÊS%' OR COMPLEMENTO LIKE '%N/MÊS%') THEN COMPLEMENTO
            WHEN F.CODIGOFORNECEDOR = '' AND (COMPLEMENTO LIKE 'EV____ -%' OR COMPLEMENTO LIKE 'EN____ -%') THEN COMPLEMENTO
            WHEN F.CODIGOFORNECEDOR = '' THEN F.FORNECEDOR_TRATADO
            WHEN FORN_TAG.[Fornecedor Novo] IS NOT NULL THEN FORN_TAG.[Fornecedor Novo]
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
        T.TagOrc AS TAGORC_ORIGINAL,
        CASE
            WHEN F.INTEGRACHAVE_TRATADA = '' THEN F.IDPARTIDA
            WHEN F.INTEGRACHAVE_TRATADA IS NULL THEN F.IDPARTIDA
            ELSE F.INTEGRACHAVE_TRATADA
        END AS INTEGRACHAVE_TRATADA,
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
        ) AS chave_id,
        [STATUS LANC. FINANCEIRO] AS STATUS_LANC_FINANCEIRO,
        FORMAT(F.DATA,'yyyyMM') AS ANOMES_ORIGINAL
    FROM DRE F
    LEFT JOIN Filial FIL ON FIL.CODCOLIGADA = F.CODCOLIGADA AND FIL.CODFILIAL = F.CODFILIAL
    LEFT JOIN Tags T ON T.CODCONTA = F.CONTA
    LEFT JOIN Fornecedor_Tags FORN_TAG ON TRIM(FORN_TAG.[Fornecedor Original]) = TRIM(F.NOMEFORNECEDOR)
    WHERE F.DATA >= '{DATA_MINIMA}' AND F.DATA <= GETDATE()
    AND T.Tag1 != 'N/A'
    ORDER BY
        CONCAT(CAST(F.CODCOLIGADA AS VARCHAR), '-',
            CASE
                WHEN F.INTEGRACHAVE_TRATADA = '' THEN F.IDPARTIDA
                WHEN F.INTEGRACHAVE_TRATADA IS NULL THEN F.IDPARTIDA
                ELSE F.INTEGRACHAVE_TRATADA
            END) ASC,
        F.IDPARTIDA ASC,
        F.VALOR DESC
    """

    cursor = conn.cursor()
    cursor.execute(query)
    columns = [column[0] for column in cursor.description]
    rows = cursor.fetchall()

    print(f"[OK] Buscados {len(rows):,} registros do Fabric")

    records = []
    for row in rows:
        record = {}
        for i, value in enumerate(row):
            col_name = columns[i].lower()
            if isinstance(value, (datetime, date)):
                record[col_name] = value.strftime('%Y-%m-%d')
            elif isinstance(value, time):
                record[col_name] = value.strftime('%H:%M:%S')
            elif isinstance(value, Decimal):
                record[col_name] = float(value)
            elif value is None:
                record[col_name] = None
            else:
                value = converter_data_brasileira(value)
                record[col_name] = limpar_valor_numerico(value)
        records.append(record)

    return records

def limpar_tabela_supabase():
    print("Limpando tabela Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?id=gt.0"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    response = requests.delete(url, headers=headers)
    print(f"[OK] Tabela limpa (Status: {response.status_code})")

def inserir_via_function(records):
    """Insere dados usando a função SQL (bypassa cache)"""
    print(f"Inserindo {len(records):,} registros via SQL Function...")

    url = f"{SUPABASE_URL}/rest/v1/rpc/insert_dre_batch"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    batch_size = 1000
    total_inseridos = 0
    total_erros = 0

    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(records) + batch_size - 1) // batch_size

        try:
            # Chamar a função RPC com o batch
            payload = {"dados": batch}
            response = requests.post(url, headers=headers, json=payload)

            if response.status_code in [200, 201, 204]:
                total_inseridos += len(batch)
                print(f"   Batch {batch_num}/{total_batches}: {len(batch)} registros [OK]")
            else:
                total_erros += len(batch)
                print(f"   Batch {batch_num}/{total_batches}: [ERRO] Status {response.status_code}")
                print(f"   Resposta: {response.text[:200]}")

        except Exception as e:
            total_erros += len(batch)
            print(f"   Batch {batch_num}/{total_batches}: [ERRO] {e}")

    print(f"[RESUMO] Inseridos: {total_inseridos:,} | Erros: {total_erros:,}")
    return total_inseridos, total_erros

def main():
    print("=" * 60)
    print("SINCRONIZACAO VIA SQL FUNCTION (BYPASSA CACHE)")
    print("=" * 60)
    print()

    try:
        # 1. Conectar e buscar
        conn = conectar_fabric()
        records = buscar_dados_tratados(conn)
        conn.close()

        print()
        print(f"Registros obtidos do Fabric: {len(records):,}")

        # 2. Limpar Supabase
        print()
        limpar_tabela_supabase()

        # 3. Inserir via função SQL
        print()
        inseridos, erros = inserir_via_function(records)

        # 4. Verificar resultado
        print()
        print("=" * 60)
        print("RESULTADO FINAL")
        print("=" * 60)
        print(f"Esperado:    108,672")
        print(f"Buscado:     {len(records):,}")
        print(f"Inserido:    {inseridos:,}")
        print(f"Com erro:    {erros:,}")
        print()

        if inseridos == 108672:
            print("[SUCESSO] Todos os 108,672 registros foram sincronizados!")
        elif inseridos > 0:
            print(f"[PARCIAL] {inseridos:,} registros sincronizados")
            print(f"          Faltaram {108672 - inseridos:,} registros")
        else:
            print("[ERRO] Nenhum registro foi sincronizado")

    except Exception as e:
        print(f"[ERRO] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
