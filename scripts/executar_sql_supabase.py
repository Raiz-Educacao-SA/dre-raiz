#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para executar SQL no Supabase via psycopg2
"""
import sys

SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

try:
    import psycopg2
    from psycopg2 import sql

    # Extrair project_ref da URL
    project_ref = SUPABASE_URL.split('//')[1].split('.')[0]

    # String de conexão PostgreSQL para Supabase
    conn_string = f"postgresql://postgres.{project_ref}:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

    # Tentar connection string alternativa
    conn_string = f"host=db.{project_ref}.supabase.co port=5432 dbname=postgres user=postgres password=[PASSWORD]"

    print(f"Conectando ao Supabase...")
    print(f"Project: {project_ref}")
    print(f"Não conseguimos conectar via psycopg2 sem senha do banco")
    print(f"Vamos usar a API REST do Supabase")

except ImportError:
    print("psycopg2 não instalado")
    print("Vamos usar requests HTTP")

# Ler arquivo SQL
if len(sys.argv) < 2:
    print("Uso: python executar_sql_supabase.py <arquivo.sql>")
    sys.exit(1)

sql_file = sys.argv[1]

with open(sql_file, 'r', encoding='utf-8') as f:
    sql_content = f.read()

print(f"\n✅ Arquivo {sql_file} lido com sucesso!")
print(f"📊 Tamanho: {len(sql_content)} caracteres")
print(f"\nPara executar este SQL, você precisa:")
print(f"1. Acessar: https://supabase.com/dashboard/project/{project_ref}/sql/new")
print(f"2. Copiar e colar o conteúdo do arquivo {sql_file}")
print(f"3. Clicar em RUN")
print(f"\nOu me forneça a senha do banco PostgreSQL para executar automaticamente")
