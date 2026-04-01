# -*- coding: utf-8 -*-
"""
Script para testar conexões com Fabric e Supabase antes de rodar o pipeline completo
"""

import os
import sys
from azure.identity import InteractiveBrowserCredential
import pyodbc
from supabase import create_client

# Configurar encoding para Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Configurações
FABRIC_SERVER = "brexl7eomxoerljqiapyaul67i-tscdkva6temu3gn4zp67tlafl4.datawarehouse.fabric.microsoft.com"
FABRIC_DATABASE = "DRE"

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://vafmufhlompwsdrlhkfz.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA")

def testar_fabric():
    """Testa conexão com Microsoft Fabric"""
    print("\n" + "="*60)
    print("[FABRIC] TESTANDO CONEXAO COM MICROSOFT FABRIC")
    print("="*60)

    try:
        print("[>] Autenticando no Azure AD...")
        credential = InteractiveBrowserCredential()
        token = credential.get_token("https://database.windows.net/.default")

        connection_string = (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server={FABRIC_SERVER};"
            f"Database={FABRIC_DATABASE};"
            f"Encrypt=yes;"
            f"TrustServerCertificate=no;"
            f"Connection Timeout=30"
        )

        conn = pyodbc.connect(
            connection_string,
            attrs_before={1256: token.token.encode('utf-16-le')}
        )

        print("[OK] Conectado ao Microsoft Fabric!")

        # Testar query simples
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        version = cursor.fetchone()[0]
        print(f"[INFO] Versao do SQL Server: {version[:80]}...")

        # Contar registros da query
        cursor.execute("""
            SELECT COUNT(*)
            FROM DRE F
            LEFT JOIN Filial FIL ON FIL.CODCOLIGADA = F.CODCOLIGADA AND FIL.CODFILIAL = F.CODFILIAL
            LEFT JOIN Tags T ON T.CODCONTA = F.CONTA
            LEFT JOIN Fornecedor_Tags FORN_TAG ON TRIM(FORN_TAG.[Fornecedor Original]) = TRIM(F.NOMEFORNECEDOR)
            WHERE F.DATA >= '2026-01-01' AND F.DATA <= GETDATE()
                AND T.Tag1 != 'N/A'
        """)
        count = cursor.fetchone()[0]
        print(f"[INFO] Total de registros que serao extraidos: {count:,}")

        conn.close()
        return True

    except Exception as e:
        print(f"[ERRO] Erro ao conectar no Fabric: {e}")
        return False


def testar_supabase():
    """Testa conexão com Supabase"""
    print("\n" + "="*60)
    print("[SUPABASE] TESTANDO CONEXAO COM SUPABASE")
    print("="*60)

    try:
        print("[>] Conectando ao Supabase...")

        if SUPABASE_URL == "https://seu-projeto.supabase.co":
            print("[AVISO] Voce precisa configurar SUPABASE_URL!")
            return False

        if SUPABASE_KEY == "sua-chave-aqui":
            print("[AVISO] Voce precisa configurar SUPABASE_KEY!")
            return False

        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[OK] Conectado ao Supabase!")

        # Tentar listar tabelas (pode falhar se não tiver permissões)
        try:
            result = supabase.table('dre_fabric').select("*").limit(1).execute()
            print("[OK] Tabela 'dre_fabric' encontrada!")
        except Exception as table_error:
            print(f"[AVISO] Tabela 'dre_fabric' pode nao existir ainda: {table_error}")
            print("        (Isso e normal se for a primeira execucao)")

        return True

    except Exception as e:
        print(f"[ERRO] Erro ao conectar no Supabase: {e}")
        return False


def main():
    """Executa todos os testes"""
    print("\n" + "="*60)
    print("TESTE DE CONEXOES - FABRIC -> SUPABASE")
    print("="*60)

    fabric_ok = testar_fabric()
    supabase_ok = testar_supabase()

    print("\n" + "="*60)
    print("RESUMO DOS TESTES")
    print("="*60)
    print(f"Microsoft Fabric: {'[OK]' if fabric_ok else '[FALHOU]'}")
    print(f"Supabase:         {'[OK]' if supabase_ok else '[FALHOU]'}")

    if fabric_ok and supabase_ok:
        print("\n[SUCESSO] Tudo pronto! Voce pode rodar o pipeline:")
        print("          python fabric_to_supabase.py")
    else:
        print("\n[AVISO] Corrija os erros acima antes de rodar o pipeline.")

    print("="*60 + "\n")


if __name__ == "__main__":
    main()
