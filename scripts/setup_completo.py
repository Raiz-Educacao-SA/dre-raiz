#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Setup Completo Automático - DRE RAIZ
Usa service_role key para configurar tudo automaticamente
"""

import os
import sys
import io

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from supabase import create_client, Client

# Configuração (usando service_role key para bypass RLS)
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

print("=" * 60)
print("SETUP COMPLETO AUTOMATICO - DRE RAIZ")
print("=" * 60)
print()
print("Usando service_role key (bypass RLS)")
print()

try:
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    print("[OK] Conectado ao Supabase com service_role")
    print()
except Exception as e:
    print(f"[ERRO] Falha na conexao: {e}")
    sys.exit(1)

# ============================================================
# PASSO 1: VERIFICAR ESTRUTURA DA TABELA
# ============================================================
print("=" * 60)
print("PASSO 1: Verificando estrutura da tabela")
print("=" * 60)
print()

try:
    # Tentar buscar uma transação para ver a estrutura
    result = supabase.table('transactions').select('*').limit(1).execute()

    if result.data and len(result.data) > 0:
        print("[OK] Tabela 'transactions' existe")
        print(f"[INFO] Colunas disponiveis: {', '.join(result.data[0].keys())}")
        print()

        # Contar registros existentes
        count_result = supabase.table('transactions').select('*', count='exact').limit(0).execute()
        total = count_result.count if hasattr(count_result, 'count') else 0
        print(f"[INFO] Registros existentes: {total}")
        print()
    else:
        print("[INFO] Tabela vazia")
        print()

except Exception as e:
    print(f"[AVISO] Erro ao verificar: {e}")
    print("[INFO] Continuando mesmo assim...")
    print()

# ============================================================
# PASSO 2: INSERIR DADOS DE TESTE
# ============================================================
print("=" * 60)
print("PASSO 2: Inserindo dados de teste")
print("=" * 60)
print()

dados_teste = [
    {
        'date': '2026-01-05',
        'description': 'Mensalidades Janeiro - Ensino Fundamental',
        'conta_contabil': '4.1.001',
        'amount': 250000,
        'type': 'REVENUE',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Mensalidades',
        'vendor': 'ALUNOS',
        'ticket': 'REC-001'
    },
    {
        'date': '2026-01-05',
        'description': 'Mensalidades Janeiro - Ensino Medio',
        'conta_contabil': '4.1.002',
        'amount': 180000,
        'type': 'REVENUE',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Mensalidades',
        'vendor': 'ALUNOS',
        'ticket': 'REC-002'
    },
    {
        'date': '2026-01-10',
        'description': 'Material Didatico',
        'conta_contabil': '4.1.003',
        'amount': 35000,
        'type': 'REVENUE',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Material',
        'vendor': 'ALUNOS',
        'ticket': 'REC-003'
    },
    {
        'date': '2026-01-15',
        'description': 'Salarios Professores',
        'conta_contabil': '3.1.001',
        'amount': -120000,
        'type': 'COST',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Pessoal',
        'vendor': 'RH',
        'ticket': 'CST-001'
    },
    {
        'date': '2026-01-15',
        'description': 'Material de Ensino',
        'conta_contabil': '3.1.002',
        'amount': -25000,
        'type': 'COST',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Material',
        'vendor': 'FORNECEDOR_A',
        'ticket': 'CST-002'
    },
    {
        'date': '2026-01-20',
        'description': 'Salarios Administrativos',
        'conta_contabil': '3.2.001',
        'amount': -45000,
        'type': 'EXPENSE',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Pessoal',
        'vendor': 'RH',
        'ticket': 'DSP-001'
    },
    {
        'date': '2026-01-20',
        'description': 'Marketing Digital',
        'conta_contabil': '3.2.002',
        'amount': -15000,
        'type': 'EXPENSE',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Marketing',
        'vendor': 'AGENCIA_X',
        'ticket': 'DSP-002'
    },
    {
        'date': '2026-01-25',
        'description': 'Aluguel',
        'conta_contabil': '3.2.003',
        'amount': -35000,
        'type': 'EXPENSE',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Infraestrutura',
        'vendor': 'IMOBILIARIA_Y',
        'ticket': 'DSP-003'
    },
    {
        'date': '2026-02-05',
        'description': 'Mensalidades Fevereiro - Ensino Fundamental',
        'conta_contabil': '4.1.001',
        'amount': 255000,
        'type': 'REVENUE',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Mensalidades',
        'vendor': 'ALUNOS',
        'ticket': 'REC-004'
    },
    {
        'date': '2026-02-05',
        'description': 'Mensalidades Fevereiro - Ensino Medio',
        'conta_contabil': '4.1.002',
        'amount': 185000,
        'type': 'REVENUE',
        'scenario': 'REAL',
        'status': 'active',
        'marca': 'RAIZ',
        'filial': 'SP01',
        'tag01': 'Mensalidades',
        'vendor': 'ALUNOS',
        'ticket': 'REC-005'
    }
]

inserted_count = 0
error_count = 0

for i, dado in enumerate(dados_teste, 1):
    try:
        result = supabase.table('transactions').insert(dado).execute()
        print(f"[OK] {i}/{len(dados_teste)}: {dado['description'][:45]}")
        inserted_count += 1
    except Exception as e:
        print(f"[ERRO] {i}/{len(dados_teste)}: {str(e)[:60]}")
        error_count += 1

print()
print(f"[RESUMO] Inseridos: {inserted_count} | Erros: {error_count}")
print()

# ============================================================
# PASSO 3: VERIFICAR RESULTADO
# ============================================================
print("=" * 60)
print("PASSO 3: Verificando resultado")
print("=" * 60)
print()

try:
    result = supabase.table('transactions').select('*').limit(5).order('created_at', desc=True).execute()

    if result.data:
        print(f"[OK] {len(result.data)} transacoes mais recentes:")
        print()
        for i, row in enumerate(result.data, 1):
            desc = row.get('description', 'Sem descricao')[:40]
            amount = row.get('amount', 0)
            tipo = row.get('type', 'N/A')
            print(f"  {i}. {desc}")
            print(f"     Tipo: {tipo} | Valor: R$ {amount:,.2f}")
        print()
    else:
        print("[AVISO] Nenhum dado retornado")
        print()

    # Contar total
    count_result = supabase.table('transactions').select('*', count='exact').limit(0).execute()
    total = count_result.count if hasattr(count_result, 'count') else 0
    print(f"[INFO] Total de transacoes no banco: {total}")
    print()

except Exception as e:
    print(f"[ERRO] Falha ao verificar: {e}")
    print()

# ============================================================
# RESULTADO FINAL
# ============================================================
print("=" * 60)
print("RESULTADO FINAL")
print("=" * 60)
print()

if inserted_count > 0:
    print("[SUCESSO] Dados inseridos com sucesso!")
    print()
    print("Proximos passos:")
    print("  1. Recarregue a pagina do app (Ctrl+Shift+R)")
    print("  2. Clique em 'Buscar Dados'")
    print("  3. Deve ver os dados agora!")
    print()
    print("Observacao:")
    print("  O RLS continua ativo. Para acesso normal,")
    print("  faca login no app ou desative o RLS.")
    print()
else:
    print("[AVISO] Nenhum dado foi inserido")
    print()
    print("Possivel causa:")
    print("  - Dados ja existem no banco")
    print("  - Erro na estrutura da tabela")
    print()
    print("Verifique manualmente no Supabase:")
    print(f"  {SUPABASE_URL}/project/vafmufhlompwsdrlhkfz/editor")
    print()

print("=" * 60)
