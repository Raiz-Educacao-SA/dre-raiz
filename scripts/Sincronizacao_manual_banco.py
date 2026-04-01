# -*- coding: utf-8 -*-
"""
Sincronização Manual: Microsoft Fabric → Supabase
Versão corrigida com conversão de formato numérico brasileiro
Baseado em: sync_via_function.py
"""

import struct
import pyodbc
import requests
import json
import sys
from datetime import datetime, date, time
from decimal import Decimal
from azure.identity import ClientSecretCredential

# Configurar encoding para Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ==================== CONFIGURAÇÕES ====================
TENANT_ID = 'fc75490c-658e-48dc-ad30-401f80517efa'
CLIENT_ID = 'ae63bd51-263f-4bb7-aabd-c04c2d44d384'
CLIENT_SECRET = 'OgU8Q~rVCDHsFjbUYCI7N5jlgC2bWZx-RDbTcdh1'
FABRIC_SERVER = 'brexl7eomxoerljqiapyaul67i-tscdkva6temu3gn4zp67tlafl4.datawarehouse.fabric.microsoft.com'
FABRIC_DATABASE = 'DRE'
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'
SUPABASE_TABLE = 'dre_fabric'
DATA_MINIMA = '2026-01-01'
BATCH_SIZE = 500  # Tamanho do batch (melhor taxa de sucesso: 99.1%)

# ==================== FUNÇÕES DE AUTENTICAÇÃO ====================

def get_azure_token():
    """Obtém token de autenticação do Azure"""
    credential = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    token = credential.get_token("https://database.windows.net/.default")
    return token.token


def conectar_fabric():
    """Conecta ao Microsoft Fabric usando Service Principal"""
    print("[1/5] Conectando ao Fabric...")
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
    print("      ✅ Conectado ao Fabric")
    return conn

# ==================== FUNÇÕES DE CONVERSÃO ====================

def converter_virgula_para_ponto(value):
    """
    Converte valores numéricos brasileiros (vírgula) para formato internacional (ponto)
    Exemplos: "1.234,56" -> "1234.56", "-3809,23" -> "-3809.23"
    """
    if value is None:
        return None

    if isinstance(value, str):
        # Remove espaços
        value = value.strip()

        # Se contém vírgula, é número brasileiro
        if ',' in value:
            # Remove pontos (separadores de milhares)
            value = value.replace('.', '')
            # Troca vírgula por ponto (separador decimal)
            value = value.replace(',', '.')

            try:
                # Tenta converter para float
                float_val = float(value)
                # Se for inteiro, retorna como int
                if float_val.is_integer():
                    return int(float_val)
                return float_val
            except ValueError:
                # Se não conseguir converter, retorna original
                return value

    elif isinstance(value, (int, float, Decimal)):
        # Já é número, apenas converte Decimal para float
        if isinstance(value, Decimal):
            return float(value)
        return value

    return value


def converter_data_brasileira(value):
    """Converte datas brasileiras DD/MM/YYYY para YYYY-MM-DD"""
    if isinstance(value, str) and '/' in value:
        try:
            parts = value.split('/')
            if len(parts) == 3:
                dia, mes, ano = parts
                return f"{ano}-{mes.zfill(2)}-{dia.zfill(2)}"
        except:
            pass
    return value

# ==================== EXTRAÇÃO DE DADOS ====================

def buscar_dados_tratados(conn):
    """Busca dados do Fabric e aplica tratamentos"""
    print("\n[2/5] Buscando dados do Fabric...")

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

    print(f"      ✅ Buscados {len(rows):,} registros")

    # Processar registros aplicando conversões
    print("      🔄 Aplicando conversões de formato...")
    records = []
    for row in rows:
        record = {}
        for i, value in enumerate(row):
            col_name = columns[i].lower()

            # Converter datas
            if isinstance(value, (datetime, date)):
                record[col_name] = value.strftime('%Y-%m-%d')
            elif isinstance(value, time):
                record[col_name] = value.strftime('%H:%M:%S')
            # Converter valores numéricos (CORREÇÃO PRINCIPAL)
            elif isinstance(value, (str, Decimal)) and col_name in ['valor', 'cc']:
                record[col_name] = converter_virgula_para_ponto(value)
            elif isinstance(value, Decimal):
                record[col_name] = float(value)
            elif value is None:
                record[col_name] = None
            else:
                value = converter_data_brasileira(value)
                record[col_name] = value

        records.append(record)

    print(f"      ✅ Conversões aplicadas com sucesso")
    return records

# ==================== OPERAÇÕES SUPABASE ====================

def limpar_tabela_supabase():
    """Limpa todos os dados da tabela Supabase"""
    print("\n[3/5] Limpando tabela Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?id=gt.0"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    response = requests.delete(url, headers=headers)
    print(f"      ✅ Tabela limpa (Status: {response.status_code})")


def inserir_via_function(records):
    """Insere dados usando a função SQL (bypassa cache)"""
    print(f"\n[4/5] Inserindo {len(records):,} registros via SQL Function...")
    print(f"      Batch size: {BATCH_SIZE} registros")

    url = f"{SUPABASE_URL}/rest/v1/rpc/insert_dre_batch"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    total_inseridos = 0
    total_erros = 0
    erros_detalhados = []

    total_batches = (len(records) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1

        try:
            payload = {"dados": batch}
            response = requests.post(url, headers=headers, json=payload, timeout=180)

            if response.status_code in [200, 201, 204]:
                total_inseridos += len(batch)
                # Calcular progresso
                percentual = (total_inseridos / len(records)) * 100
                barra_total = 30
                barra_completa = int((total_inseridos / len(records)) * barra_total)
                barra = "█" * barra_completa + "░" * (barra_total - barra_completa)

                print(f"      Batch {batch_num:3d}/{total_batches}: ✅ {len(batch):4d} | {barra} {percentual:5.1f}% ({total_inseridos:,}/{len(records):,})")
            else:
                total_erros += len(batch)
                erro_msg = response.text[:200] if response.text else "Sem mensagem"
                erros_detalhados.append({
                    'batch': batch_num,
                    'status': response.status_code,
                    'mensagem': erro_msg
                })
                percentual = ((total_inseridos + total_erros) / len(records)) * 100
                print(f"      Batch {batch_num:3d}/{total_batches}: ❌ ERRO {response.status_code} | {percentual:5.1f}%")
                print(f"               Mensagem: {erro_msg[:100]}")

        except Exception as e:
            total_erros += len(batch)
            erros_detalhados.append({
                'batch': batch_num,
                'status': 'EXCEPTION',
                'mensagem': str(e)
            })
            percentual = ((total_inseridos + total_erros) / len(records)) * 100
            print(f"      Batch {batch_num:3d}/{total_batches}: ❌ ERRO Exception | {percentual:5.1f}%")
            print(f"               {str(e)[:100]}")

    print(f"\n      RESUMO:")
    print(f"      ✅ Inseridos: {total_inseridos:,}")
    print(f"      ❌ Erros:     {total_erros:,}")

    # Salvar erros em arquivo se houver
    if erros_detalhados:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        nome_arquivo = f'erros_sincronizacao_{timestamp}.json'
        with open(nome_arquivo, 'w', encoding='utf-8') as f:
            json.dump(erros_detalhados, f, indent=2, ensure_ascii=False)
        print(f"      📄 Erros salvos em: {nome_arquivo}")

    return total_inseridos, total_erros

# ==================== VALIDAÇÃO ====================

def validar_resultado(total_buscado, total_inserido):
    """Valida resultado final da sincronização"""
    print("\n[5/5] Validando resultado...")

    # Buscar contagem no Supabase
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?select=*"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Prefer': 'count=exact'
    }

    try:
        response = requests.get(url + "&limit=1", headers=headers)
        # Status 200 (OK) ou 206 (Partial Content) são válidos
        if response.status_code in [200, 206]:
            count_header = response.headers.get('content-range', '')
            if count_header:
                total_supabase = int(count_header.split('/')[1])
                print(f"      Registros no Supabase: {total_supabase:,}")

                if total_supabase == total_buscado:
                    print(f"      ✅ SUCESSO: Todos os {total_buscado:,} registros foram sincronizados!")
                    return True
                elif total_supabase == total_inserido:
                    print(f"      ⚠️  PARCIAL: {total_inserido:,} registros sincronizados")
                    print(f"      ⚠️  Faltaram: {total_buscado - total_inserido:,} registros")
                    return False
                else:
                    print(f"      ❌ ATENÇÃO: Divergência detectada!")
                    print(f"      - Buscado do Fabric: {total_buscado:,}")
                    print(f"      - Inserido: {total_inserido:,}")
                    print(f"      - No Supabase: {total_supabase:,}")
                    return False
    except Exception as e:
        print(f"      ❌ Erro ao validar: {e}")

    return False

# ==================== FUNÇÃO PRINCIPAL ====================

def main():
    """Executa sincronização completa"""
    print("\n" + "="*70)
    print("SINCRONIZAÇÃO MANUAL: FABRIC → SUPABASE")
    print("="*70)
    print(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("="*70 + "\n")

    try:
        # 1. Conectar ao Fabric
        conn = conectar_fabric()

        # 2. Buscar dados
        records = buscar_dados_tratados(conn)
        conn.close()

        total_buscado = len(records)

        # 3. Limpar tabela Supabase
        limpar_tabela_supabase()

        # 4. Inserir dados
        total_inserido, total_erros = inserir_via_function(records)

        # 5. Validar resultado
        sucesso = validar_resultado(total_buscado, total_inserido)

        # Resultado final
        print("\n" + "="*70)
        print("RESULTADO FINAL")
        print("="*70)
        print(f"Registros buscados do Fabric:  {total_buscado:,}")
        print(f"Registros inseridos com sucesso: {total_inserido:,}")
        print(f"Registros com erro:              {total_erros:,}")

        if sucesso:
            print("\n✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!")
        elif total_inserido > 0:
            print("\n⚠️  SINCRONIZAÇÃO PARCIAL")
            print(f"Faltaram {total_buscado - total_inserido:,} registros")
        else:
            print("\n❌ SINCRONIZAÇÃO FALHOU")

        print("="*70 + "\n")

        return sucesso

    except Exception as e:
        print("\n" + "="*70)
        print(f"❌ ERRO FATAL: {e}")
        print("="*70 + "\n")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    sucesso = main()
    sys.exit(0 if sucesso else 1)
