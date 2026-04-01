# -*- coding: utf-8 -*-
"""
Script para instalar as funções de controle do trigger no Supabase
"""

import os
import sys
from supabase import create_client

# Configurar encoding para Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Configurações
SUPABASE_URL = "https://vafmufhlompwsdrlhkfz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA"

def main():
    print("\n" + "="*60)
    print("INSTALANDO FUNÇÕES DE CONTROLE DO TRIGGER")
    print("="*60 + "\n")

    # Conectar ao Supabase
    print("[>] Conectando ao Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("[OK] Conectado ao Supabase\n")

    # Ler o arquivo SQL
    print("[>] Lendo arquivo SQL...")
    sql_file = os.path.join(os.path.dirname(__file__), 'criar_funcoes_controle_trigger.sql')

    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    print("[OK] Arquivo lido\n")

    print("="*60)
    print("ATENÇÃO: Execute o SQL abaixo no SQL Editor do Supabase")
    print("="*60)
    print("\n1. Acesse: https://supabase.com/dashboard/project/vafmufhlompwsdrlhkfz/sql")
    print("2. Cole o conteúdo do arquivo 'criar_funcoes_controle_trigger.sql'")
    print("3. Clique em 'RUN' para executar\n")

    print("="*60)
    print("Testando se as funções já existem...")
    print("="*60 + "\n")

    # Testar se as funções existem
    try:
        print("[>] Testando função: verificar_status_trigger...")
        result = supabase.rpc('verificar_status_trigger').execute()
        if result.data:
            print("[OK] Função verificar_status_trigger existe!")
            print(f"  Status do Trigger: {result.data}")
    except Exception as e:
        print(f"[ERRO] Função não encontrada: {str(e)[:100]}")
        print("  Você precisa executar o SQL no Supabase Dashboard primeiro.")

    try:
        print("\n[>] Testando função: desabilitar_trigger_sincronizacao...")
        # Não vamos executar, só verificar se existe
        print("[INFO] Função precisa ser testada manualmente após instalação")
    except Exception as e:
        print(f"[ERRO] {str(e)[:100]}")

    try:
        print("\n[>] Testando função: habilitar_trigger_sincronizacao...")
        # Não vamos executar, só verificar se existe
        print("[INFO] Função precisa ser testada manualmente após instalação")
    except Exception as e:
        print(f"[ERRO] {str(e)[:100]}")

    print("\n" + "="*60)
    print("PRÓXIMOS PASSOS:")
    print("="*60)
    print("\n1. Execute o arquivo 'criar_funcoes_controle_trigger.sql' no Supabase")
    print("2. Execute novamente este script para validar a instalação")
    print("3. Execute 'python fabric_to_supabase_v2.py' para testar\n")

if __name__ == "__main__":
    main()
