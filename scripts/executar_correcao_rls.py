#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Executar Correção da Função RLS automaticamente
"""

import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from supabase import create_client

SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

print("=" * 60)
print("CORRIGINDO FUNÇÃO RLS")
print("=" * 60)
print()

supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

# Ler o SQL de correção
with open('CORRIGIR_FUNCAO_RLS.sql', 'r', encoding='utf-8') as f:
    sql_content = f.read()

print("[INFO] SQL lido: {} caracteres".format(len(sql_content)))
print()

# Nota: Supabase Python client não suporta execução direta de SQL complexo
# Vamos usar RPC para executar
print("[AVISO] Não é possível executar SQL complexo via Python client")
print("[INFO] Execute manualmente no SQL Editor do Supabase:")
print()
print("1. Acesse: https://supabase.com/dashboard/project/vafmufhlompwsdrlhkfz/editor/sql")
print("2. Cole o conteúdo de: CORRIGIR_FUNCAO_RLS.sql")
print("3. Clique em RUN")
print()
print("[INFO] Ou use o comando abaixo para copiar para clipboard:")
print()
print("# Windows PowerShell:")
print('Get-Content "CORRIGIR_FUNCAO_RLS.sql" | Set-Clipboard')
print()

print("=" * 60)
print("Pressione ENTER depois de executar o SQL no Supabase...")
input()

print()
print("[OK] Assumindo que a função foi corrigida!")
print()
