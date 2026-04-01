#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Setup Automático - DRE RAIZ
Configura o banco de dados automaticamente para permitir acesso aos dados
"""

import os
import sys
import io

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv('.env.local')
load_dotenv('.env')

# Configuração
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

print("=" * 60)
print("🚀 SETUP AUTOMÁTICO - DRE RAIZ")
print("=" * 60)
print()

# Validar credenciais
if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERRO: Credenciais do Supabase não encontradas!")
    print()
    print("Verifique se o arquivo .env.local contém:")
    print("  VITE_SUPABASE_URL=https://...")
    print("  VITE_SUPABASE_ANON_KEY=...")
    sys.exit(1)

print(f"✅ Conectando ao Supabase: {SUPABASE_URL}")
print()

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Conexão estabelecida!")
    print()
except Exception as e:
    print(f"❌ Erro ao conectar: {e}")
    sys.exit(1)

# ============================================================
# PASSO 1: VERIFICAR ESTADO ATUAL
# ============================================================
print("=" * 60)
print("🔍 PASSO 1: Verificando estado atual do banco")
print("=" * 60)
print()

try:
    # Contar transações
    result = supabase.table('transactions').select('*', count='exact').limit(0).execute()
    total_transactions = result.count if hasattr(result, 'count') else 0
    print(f"📊 Transações no banco: {total_transactions}")

    # Tentar contar usuários
    try:
        result_users = supabase.table('users').select('*', count='exact').limit(0).execute()
        total_users = result_users.count if hasattr(result_users, 'count') else 0
        print(f"👥 Usuários cadastrados: {total_users}")
    except Exception as e:
        print(f"⚠️  Não foi possível contar usuários: {e}")
        total_users = 0

    # Tentar contar permissões
    try:
        result_perms = supabase.table('user_permissions').select('*', count='exact').limit(0).execute()
        total_permissions = result_perms.count if hasattr(result_perms, 'count') else 0
        print(f"🔐 Permissões configuradas: {total_permissions}")
    except Exception as e:
        print(f"⚠️  Não foi possível contar permissões: {e}")
        total_permissions = 0

    print()

except Exception as e:
    print(f"❌ Erro ao verificar estado: {e}")
    print()
    print("💡 Isso pode ser RLS bloqueando o acesso...")
    total_transactions = -1
    total_users = -1
    total_permissions = -1

# ============================================================
# PASSO 2: DIAGNOSTICAR E DECIDIR AÇÃO
# ============================================================
print("=" * 60)
print("🧠 PASSO 2: Diagnóstico")
print("=" * 60)
print()

if total_transactions == -1:
    print("⚠️  RLS está bloqueando o acesso!")
    print("   → Não é possível contar registros com a chave ANON")
    print("   → Vou tentar inserir dados de teste")
    action = "insert_data"
elif total_transactions == 0:
    print("⚠️  Banco vazio - precisa inserir dados")
    action = "insert_data"
else:
    print("✅ Banco já tem dados!")
    print("   → Vou tentar buscar alguns registros para testar...")
    action = "test_access"

print()

# ============================================================
# PASSO 3: EXECUTAR AÇÃO
# ============================================================
print("=" * 60)
print("⚡ PASSO 3: Executando ação")
print("=" * 60)
print()

if action == "insert_data":
    print("📝 Inserindo dados de teste...")
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
            'tag0': 'RECEITAS',
            'tag01': 'Mensalidades',
            'vendor': 'ALUNOS',
            'ticket': 'REC-001'
        },
        {
            'date': '2026-01-05',
            'description': 'Mensalidades Janeiro - Ensino Médio',
            'conta_contabil': '4.1.002',
            'amount': 180000,
            'type': 'REVENUE',
            'scenario': 'REAL',
            'status': 'active',
            'marca': 'RAIZ',
            'filial': 'SP01',
            'tag0': 'RECEITAS',
            'tag01': 'Mensalidades',
            'vendor': 'ALUNOS',
            'ticket': 'REC-002'
        },
        {
            'date': '2026-01-15',
            'description': 'Salários Professores',
            'conta_contabil': '3.1.001',
            'amount': -120000,
            'type': 'COST',
            'scenario': 'REAL',
            'status': 'active',
            'marca': 'RAIZ',
            'filial': 'SP01',
            'tag0': 'CUSTOS',
            'tag01': 'Pessoal',
            'vendor': 'RH',
            'ticket': 'CST-001'
        },
        {
            'date': '2026-01-20',
            'description': 'Salários Administrativos',
            'conta_contabil': '3.2.001',
            'amount': -45000,
            'type': 'EXPENSE',
            'scenario': 'REAL',
            'status': 'active',
            'marca': 'RAIZ',
            'filial': 'SP01',
            'tag0': 'DESPESAS',
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
            'tag0': 'DESPESAS',
            'tag01': 'Marketing',
            'vendor': 'AGENCIA_X',
            'ticket': 'DSP-002'
        }
    ]

    try:
        for i, dado in enumerate(dados_teste, 1):
            result = supabase.table('transactions').insert(dado).execute()
            print(f"  ✅ Registro {i}/{len(dados_teste)}: {dado['description'][:40]}")

        print()
        print(f"✅ {len(dados_teste)} transações inseridas com sucesso!")
        print()

    except Exception as e:
        print(f"❌ Erro ao inserir dados: {e}")
        print()
        print("💡 POSSÍVEL CAUSA:")
        print("   • RLS está bloqueando inserção com chave ANON")
        print("   • Precisa usar service_role key OU")
        print("   • Desativar RLS temporariamente")
        print()
        print("🔧 SOLUÇÃO:")
        print("   1. Acesse o SQL Editor do Supabase")
        print("   2. Execute: ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;")
        print("   3. Execute: dados_teste.sql")
        print("   4. Reative RLS se necessário")
        print()

elif action == "test_access":
    print("🧪 Testando acesso aos dados...")
    print()

    try:
        result = supabase.table('transactions').select('*').limit(5).execute()

        if result.data:
            print(f"✅ Acesso funcionando! Encontrei {len(result.data)} registros:")
            print()
            for i, row in enumerate(result.data, 1):
                print(f"  {i}. {row.get('description', 'Sem descrição')[:50]}")
                print(f"     Valor: R$ {row.get('amount', 0):,.2f}")
                print()
        else:
            print("⚠️  Sem dados retornados")
            print("   Possíveis causas:")
            print("   • RLS bloqueando acesso")
            print("   • Usuário sem permissões")
            print("   • Banco realmente vazio")
            print()

    except Exception as e:
        print(f"❌ Erro ao buscar dados: {e}")
        print()
        print("💡 RLS está bloqueando o acesso!")
        print()

# ============================================================
# PASSO 4: RECOMENDAÇÕES FINAIS
# ============================================================
print("=" * 60)
print("💡 RECOMENDAÇÕES")
print("=" * 60)
print()

print("Para garantir que o app funcione, escolha UMA opção:")
print()
print("OPÇÃO 1: Desativar RLS (rápido, apenas testes)")
print("  → Acesse SQL Editor do Supabase")
print("  → Execute: ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;")
print("  → Vantagem: funciona imediatamente")
print("  → Desvantagem: sem segurança")
print()
print("OPÇÃO 2: Configurar usuário admin (recomendado)")
print("  → Execute o arquivo: CRIAR_USUARIO_ADMIN.sql")
print("  → Edite com seu email antes de executar")
print("  → Faça login no app com o mesmo email")
print("  → Vantagem: segurança mantida")
print()
print("OPÇÃO 3: Usar service_role key")
print("  → Adicione ao .env.local:")
print("  → VITE_SUPABASE_KEY=<sua-service-role-key>")
print("  → Vantagem: bypass do RLS")
print("  → Desvantagem: mais permissivo")
print()

print("=" * 60)
print("✅ SETUP CONCLUÍDO!")
print("=" * 60)
print()
print("Próximo passo:")
print("  1. Escolha uma das opções acima")
print("  2. Recarregue a página do app")
print("  3. Clique em 'Buscar Dados'")
print()
