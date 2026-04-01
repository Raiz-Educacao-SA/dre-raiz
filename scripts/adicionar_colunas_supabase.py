"""
Script para adicionar todas as colunas necessárias na tabela dre_fabric
"""

import requests

# Configurações Supabase
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

print('=' * 60)
print('SOLUÇÃO: RECRIAR A TABELA COM SCHEMA CORRETO')
print('=' * 60)
print()

# Lista de todas as colunas necessárias
colunas = [
    'chave', 'codlote', 'cia', 'filial', 'integraaplicacao', 'idpartida',
    'ticket', 'fornecedor_padrao', 'anomes', 'valor', 'complemento', 'recorrente',
    'conta', 'tag1', 'tag2', 'tag3', 'tag4', 'tag_orc', 'original', 'r_o',
    'cc', 'codcoligada', 'codfilial', 'usuario', 'conta_original', 'tag1_original',
    'tag4_original', 'tagorc_original', 'integrachave_tratada', 'status_lanc_financeiro',
    'anomes_original'
]

print('Colunas necessárias na tabela dre_fabric:')
print()
for i, col in enumerate(colunas, 1):
    print(f'{i:2}. {col}')

print()
print('=' * 60)
print('OPÇÃO 1: VIA SUPABASE DASHBOARD (RECOMENDADO)')
print('=' * 60)
print()
print('1. Acesse: https://supabase.com/dashboard')
print('2. Selecione o projeto: vafmufhlompwsdrlhkfz')
print('3. Vá em: SQL Editor (no menu lateral)')
print('4. Clique em: + New query')
print('5. Cole o SQL abaixo:')
print()
print('-' * 60)
print()

sql = """-- Adicionar coluna ID se não existir (chave primária)
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;

-- Adicionar todas as colunas
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS chave TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS codlote TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS cia TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS filial TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS integraaplicacao TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS idpartida TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS ticket TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS fornecedor_padrao TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS anomes TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS valor TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS recorrente TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS conta TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS tag1 TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS tag2 TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS tag3 TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS tag4 TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS tag_orc TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS original TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS r_o TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS cc TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS codcoligada TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS codfilial INTEGER;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS usuario TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS conta_original TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS tag1_original TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS tag4_original TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS tagorc_original TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS integrachave_tratada TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS status_lanc_financeiro TEXT;
ALTER TABLE dre_fabric ADD COLUMN IF NOT EXISTS anomes_original TEXT;
"""

print(sql)
print('-' * 60)
print()
print('6. Clique em: RUN (ou F5)')
print('7. Aguarde a mensagem de sucesso')
print()

print('=' * 60)
print('OPÇÃO 2: RECRIAR A TABELA DO ZERO')
print('=' * 60)
print()
print('Se preferir começar do zero (CUIDADO: apaga dados):')
print()

sql_recreate = """-- Apagar tabela antiga (CUIDADO!)
DROP TABLE IF EXISTS dre_fabric;

-- Criar tabela nova com todas as colunas
CREATE TABLE dre_fabric (
    id BIGSERIAL PRIMARY KEY,
    chave TEXT,
    codlote TEXT,
    cia TEXT,
    filial TEXT,
    integraaplicacao TEXT,
    idpartida TEXT,
    ticket TEXT,
    fornecedor_padrao TEXT,
    anomes TEXT,
    valor TEXT,
    complemento TEXT,
    recorrente TEXT,
    conta TEXT,
    tag1 TEXT,
    tag2 TEXT,
    tag3 TEXT,
    tag4 TEXT,
    tag_orc TEXT,
    original TEXT,
    r_o TEXT,
    cc TEXT,
    codcoligada TEXT,
    codfilial INTEGER,
    usuario TEXT,
    conta_original TEXT,
    tag1_original TEXT,
    tag4_original TEXT,
    tagorc_original TEXT,
    integrachave_tratada TEXT,
    status_lanc_financeiro TEXT,
    anomes_original TEXT
);

-- Criar índice na coluna chave
CREATE INDEX IF NOT EXISTS idx_dre_fabric_chave ON dre_fabric(chave);
"""

print(sql_recreate)
print()

print('=' * 60)
print('DEPOIS DE EXECUTAR O SQL')
print('=' * 60)
print()
print('Execute novamente o script de sincronização:')
print('python diagnostico_sync.py')
print()
