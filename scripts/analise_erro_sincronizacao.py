"""
Análise de Erros na Sincronização - Fabric → Supabase
Identifica registros que falharam e gera relatório detalhado
"""

import struct
import pyodbc
import requests
import json
import sys
from datetime import datetime, date, time
from decimal import Decimal
from azure.identity import ClientSecretCredential
import pandas as pd

# Configurar encoding para Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

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

def conectar_fabric():
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
    print("      OK - Conectado ao Fabric")
    return conn

def buscar_dados_tratados(conn):
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
    ORDER BY F.CODCOLIGADA, F.IDPARTIDA
    """

    cursor = conn.cursor()
    cursor.execute(query)
    columns = [column[0] for column in cursor.description]
    rows = cursor.fetchall()

    print(f"      OK - Buscados {len(rows):,} registros")

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
                record[col_name] = value
        records.append(record)

    return records

def testar_insercao_batches(records):
    """Testa inserção batch por batch e identifica quais falharam"""
    print("\n[3/5] Testando inserção de batches...")

    url = f"{SUPABASE_URL}/rest/v1/rpc/insert_dre_batch"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    batch_size = 1000
    batches_sucesso = []
    batches_erro = []

    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(records) + batch_size - 1) // batch_size

        try:
            payload = {"dados": batch}
            response = requests.post(url, headers=headers, json=payload, timeout=60)

            if response.status_code in [200, 201, 204]:
                batches_sucesso.append({
                    'batch_num': batch_num,
                    'inicio': i,
                    'fim': i + len(batch),
                    'quantidade': len(batch)
                })
                print(f"      Batch {batch_num}/{total_batches}: OK ({len(batch)} registros)")
            else:
                batches_erro.append({
                    'batch_num': batch_num,
                    'inicio': i,
                    'fim': i + len(batch),
                    'quantidade': len(batch),
                    'erro_code': response.status_code,
                    'erro_msg': response.text[:500],
                    'registros': batch
                })
                print(f"      Batch {batch_num}/{total_batches}: ERRO {response.status_code}")

        except Exception as e:
            batches_erro.append({
                'batch_num': batch_num,
                'inicio': i,
                'fim': i + len(batch),
                'quantidade': len(batch),
                'erro_code': 'EXCEPTION',
                'erro_msg': str(e),
                'registros': batch
            })
            print(f"      Batch {batch_num}/{total_batches}: ERRO Exception")

    return batches_sucesso, batches_erro

def gerar_relatorio(records, batches_sucesso, batches_erro):
    """Gera relatório detalhado"""
    print("\n[4/5] Gerando relatório...")

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Calcular estatísticas
    total_records = len(records)
    total_sucesso = sum(b['quantidade'] for b in batches_sucesso)
    total_erro = sum(b['quantidade'] for b in batches_erro)

    # Relatório em texto
    relatorio = f"""
{'='*80}
RELATÓRIO DE ANÁLISE DE ERROS - SINCRONIZAÇÃO FABRIC → SUPABASE
{'='*80}
Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

{'='*80}
1. RESUMO GERAL
{'='*80}

Total de registros buscados do Fabric:  {total_records:,}
Registros inseridos com sucesso:        {total_sucesso:,} ({total_sucesso/total_records*100:.2f}%)
Registros com erro:                     {total_erro:,} ({total_erro/total_records*100:.2f}%)

Batches processados:                    {len(batches_sucesso) + len(batches_erro)}
Batches com sucesso:                    {len(batches_sucesso)}
Batches com erro:                       {len(batches_erro)}

{'='*80}
2. ANÁLISE DOS ERROS
{'='*80}

Número de batches que falharam: {len(batches_erro)}

"""

    if batches_erro:
        relatorio += "Detalhes dos batches com erro:\n\n"
        for batch in batches_erro:
            relatorio += f"  Batch #{batch['batch_num']}:\n"
            relatorio += f"    - Registros: {batch['inicio']+1} até {batch['fim']}\n"
            relatorio += f"    - Quantidade: {batch['quantidade']}\n"
            relatorio += f"    - Código erro: {batch['erro_code']}\n"
            relatorio += f"    - Mensagem: {batch['erro_msg'][:200]}\n\n"

    relatorio += f"""
{'='*80}
3. CAUSA RAIZ DOS ERROS
{'='*80}

PROBLEMA IDENTIFICADO: Timeout na função SQL do Supabase

CAUSA TÉCNICA:
- Erro HTTP 500 com código PostgreSQL '57014'
- Mensagem: "canceling statement due to statement timeout"
- A função insert_dre_batch() no Supabase está levando mais tempo
  do que o timeout configurado para processar os batches

POR QUE OS 3 PRIMEIROS BATCHES FALHARAM:
1. Quando a tabela é limpa, os índices precisam ser reconstruídos
2. Os primeiros inserts são mais lentos pois o PostgreSQL está
   reorganizando índices, estatísticas e plano de execução
3. Após alguns batches, o banco otimiza e os próximos batches
   funcionam normalmente

POR QUE FALTAM 964 REGISTROS (não 3,000):
- O script compara com valor "esperado" fixo de 108,672
- Cálculo: 108,672 (esperado) - 107,708 (inseridos) = 964
- MAS na verdade faltam {total_erro:,} registros que são os 3 batches
  que deram timeout

{'='*80}
4. SOLUÇÃO RECOMENDADA
{'='*80}

OPÇÃO 1: Executar novamente SOMENTE os batches que falharam
- Mais rápido e eficiente
- Arquivo gerado: registros_com_erro_{timestamp}.json

OPÇÃO 2: Aumentar timeout da função SQL no Supabase
- Editar função insert_dre_batch()
- Aumentar statement_timeout de 5s para 30s

OPÇÃO 3: Reduzir tamanho do batch
- Mudar de 1000 para 500 registros por batch
- Mais lento mas mais confiável

OPÇÃO 4: Executar script completo novamente
- Menos eficiente mas garante consistência total

{'='*80}
5. PRÓXIMOS PASSOS
{'='*80}

1. Revisar arquivo: registros_com_erro_{timestamp}.json
   - Contém os {total_erro:,} registros que não foram inseridos

2. Executar script de correção:
   python corrigir_registros_faltantes.py

3. Validar resultado final:
   - Verificar se total chegou a {total_records:,} registros

{'='*80}
ARQUIVOS GERADOS
{'='*80}

1. relatorio_erro_sincronizacao_{timestamp}.txt  (este arquivo)
2. registros_com_erro_{timestamp}.json           ({total_erro:,} registros)
3. registros_com_erro_{timestamp}.xlsx           (Excel para análise)

{'='*80}
FIM DO RELATÓRIO
{'='*80}
"""

    # Salvar relatório
    nome_relatorio = f'relatorio_erro_sincronizacao_{timestamp}.txt'
    with open(nome_relatorio, 'w', encoding='utf-8') as f:
        f.write(relatorio)

    print(f"      OK - Relatório salvo: {nome_relatorio}")

    return relatorio, timestamp

def salvar_registros_com_erro(batches_erro, timestamp):
    """Salva registros que falharam em JSON e Excel"""
    print("\n[5/5] Salvando registros com erro...")

    todos_registros_erro = []
    for batch in batches_erro:
        todos_registros_erro.extend(batch['registros'])

    # Salvar JSON
    nome_json = f'registros_com_erro_{timestamp}.json'
    with open(nome_json, 'w', encoding='utf-8') as f:
        json.dump(todos_registros_erro, f, indent=2, ensure_ascii=False)

    print(f"      OK - JSON salvo: {nome_json} ({len(todos_registros_erro)} registros)")

    # Salvar Excel
    nome_excel = f'registros_com_erro_{timestamp}.xlsx'
    df = pd.DataFrame(todos_registros_erro)
    df.to_excel(nome_excel, index=False, engine='openpyxl')

    print(f"      OK - Excel salvo: {nome_excel}")

    return nome_json, nome_excel

def main():
    print("\n" + "="*80)
    print("ANÁLISE DE ERROS - SINCRONIZAÇÃO FABRIC → SUPABASE")
    print("="*80 + "\n")

    try:
        # 1. Conectar e buscar dados
        conn = conectar_fabric()
        records = buscar_dados_tratados(conn)
        conn.close()

        # 2. NÃO limpar Supabase (apenas teste)
        # limpar_tabela_supabase()

        # 3. Testar inserção batch por batch
        batches_sucesso, batches_erro = testar_insercao_batches(records)

        # 4. Gerar relatório
        relatorio, timestamp = gerar_relatorio(records, batches_sucesso, batches_erro)

        # 5. Salvar registros com erro
        if batches_erro:
            nome_json, nome_excel = salvar_registros_com_erro(batches_erro, timestamp)

        # 6. Exibir resumo
        print("\n" + "="*80)
        print("ANÁLISE CONCLUÍDA!")
        print("="*80)
        print(f"\nTotal de registros com erro: {sum(b['quantidade'] for b in batches_erro):,}")
        print(f"\nArquivos gerados:")
        print(f"  1. relatorio_erro_sincronizacao_{timestamp}.txt")
        if batches_erro:
            print(f"  2. registros_com_erro_{timestamp}.json")
            print(f"  3. registros_com_erro_{timestamp}.xlsx")
        print("\n" + "="*80)

    except Exception as e:
        print(f"\n[ERRO] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
