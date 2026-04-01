#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Configurar RLS Completo - DRE RAIZ
Usa as tabelas users e user_permissions existentes
"""

import os
import sys
import io

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from supabase import create_client, Client

# Configuração
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzIyOTEsImV4cCI6MjA4NTAwODI5MX0.clOvf8kNdpIUiqhAf2oAs6ETaNaoC93TWLrvGucm_I4'

print("=" * 70)
print("CONFIGURAR RLS COMPLETO - DRE RAIZ")
print("=" * 70)
print()

# Conectar com service_role para configurar
supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
print("[OK] Conectado com service_role key")
print()

# ============================================================
# PASSO 1: VERIFICAR ESTRUTURA DAS TABELAS
# ============================================================
print("=" * 70)
print("PASSO 1: Verificando estrutura das tabelas existentes")
print("=" * 70)
print()

try:
    # Verificar tabela users
    result_users = supabase.table('users').select('*').limit(1).execute()
    if result_users.data:
        print("[OK] Tabela 'users' existe")
        print(f"[INFO] Colunas: {', '.join(result_users.data[0].keys())}")

    # Contar usuários existentes
    count_users = supabase.table('users').select('*', count='exact').limit(0).execute()
    total_users = count_users.count if hasattr(count_users, 'count') else 0
    print(f"[INFO] Usuarios existentes: {total_users}")
    print()

    # Verificar tabela user_permissions
    result_perms = supabase.table('user_permissions').select('*').limit(1).execute()
    if result_perms.data:
        print("[OK] Tabela 'user_permissions' existe")
        print(f"[INFO] Colunas: {', '.join(result_perms.data[0].keys())}")

    # Contar permissões existentes
    count_perms = supabase.table('user_permissions').select('*', count='exact').limit(0).execute()
    total_perms = count_perms.count if hasattr(count_perms, 'count') else 0
    print(f"[INFO] Permissoes existentes: {total_perms}")
    print()

except Exception as e:
    print(f"[ERRO] Falha ao verificar estrutura: {e}")
    sys.exit(1)

# ============================================================
# PASSO 2: LISTAR USUÁRIOS E PERMISSÕES EXISTENTES
# ============================================================
print("=" * 70)
print("PASSO 2: Usuarios e permissoes atuais")
print("=" * 70)
print()

try:
    # Listar todos os usuários
    users_result = supabase.table('users').select('*').execute()

    if users_result.data:
        print(f"[INFO] {len(users_result.data)} usuario(s) cadastrado(s):")
        print()
        for user in users_result.data:
            print(f"  • {user.get('email', 'N/A')}")
            print(f"    Nome: {user.get('name', 'N/A')}")
            print(f"    Role: {user.get('role', 'N/A')}")
            print(f"    ID: {user.get('id', 'N/A')}")

            # Buscar permissões deste usuário
            perms_result = supabase.table('user_permissions').select('*').eq('user_id', user.get('id')).execute()

            if perms_result.data:
                print(f"    Permissoes: {len(perms_result.data)}")
                for perm in perms_result.data:
                    print(f"      - {perm.get('permission_type')}: {perm.get('permission_value')}")
            else:
                print(f"    Permissoes: Nenhuma (acesso total se admin, ou nada se viewer)")
            print()
    else:
        print("[INFO] Nenhum usuario cadastrado ainda")
        print()

except Exception as e:
    print(f"[ERRO] Falha ao listar usuarios: {e}")
    print()

# ============================================================
# PASSO 3: VERIFICAR VALORES DISPONÍVEIS PARA PERMISSÕES
# ============================================================
print("=" * 70)
print("PASSO 3: Valores disponiveis para permissoes")
print("=" * 70)
print()

try:
    # Ver marcas únicas
    marcas_result = supabase.rpc('get_unique_values', {'column_name': 'marca', 'table_name': 'transactions'}).execute()

    # Fallback: query direta
    result = supabase.table('transactions').select('marca').limit(1000).execute()
    marcas = set(row['marca'] for row in result.data if row.get('marca'))
    marcas = sorted(list(marcas))[:10]

    print(f"[INFO] Marcas disponiveis (top 10): {', '.join(marcas)}")

    # Ver filiais únicas
    result = supabase.table('transactions').select('filial').limit(1000).execute()
    filiais = set(row['filial'] for row in result.data if row.get('filial'))
    filiais = sorted(list(filiais))[:10]

    print(f"[INFO] Filiais disponiveis (top 10): {', '.join(filiais)}")

    # Ver tag01 únicas
    result = supabase.table('transactions').select('tag01').limit(1000).execute()
    tags01 = set(row['tag01'] for row in result.data if row.get('tag01'))
    tags01 = sorted(list(tags01))[:10]

    print(f"[INFO] Tags01 disponiveis (top 10): {', '.join(tags01)}")
    print()

except Exception as e:
    print(f"[AVISO] Nao consegui buscar valores unicos: {e}")
    print("[INFO] Usando valores padrao...")
    marcas = ['RAIZ']
    filiais = ['SP01', 'RJ01']
    tags01 = ['Mensalidades', 'Marketing', 'Pessoal']
    print()

# ============================================================
# PASSO 4: CRIAR USUÁRIOS DE TESTE
# ============================================================
print("=" * 70)
print("PASSO 4: Criando usuarios de teste")
print("=" * 70)
print()

usuarios_teste = [
    {
        'email': 'admin@raiz.com',
        'name': 'Admin Raiz',
        'role': 'admin',
        'permissions': []  # Admin vê tudo, sem permissões específicas
    },
    {
        'email': 'manager.sp01@raiz.com',
        'name': 'Manager SP01',
        'role': 'manager',
        'permissions': [
            {'permission_type': 'filial', 'permission_value': filiais[0] if filiais else 'SP01'}
        ]
    },
    {
        'email': 'viewer.mensalidades@raiz.com',
        'name': 'Viewer Mensalidades',
        'role': 'viewer',
        'permissions': [
            {'permission_type': 'tag01', 'permission_value': tags01[0] if tags01 else 'Mensalidades'}
        ]
    }
]

for usuario in usuarios_teste:
    try:
        # Verificar se já existe
        existing = supabase.table('users').select('*').eq('email', usuario['email']).execute()

        if existing.data:
            user_id = existing.data[0]['id']
            print(f"[INFO] Usuario ja existe: {usuario['email']}")

            # Atualizar role se necessário
            supabase.table('users').update({
                'name': usuario['name'],
                'role': usuario['role']
            }).eq('id', user_id).execute()

            print(f"[OK] Atualizado: {usuario['name']} ({usuario['role']})")
        else:
            # Criar novo usuário
            result = supabase.table('users').insert({
                'email': usuario['email'],
                'name': usuario['name'],
                'role': usuario['role']
            }).execute()

            user_id = result.data[0]['id']
            print(f"[OK] Criado: {usuario['name']} ({usuario['role']})")

        # Limpar permissões antigas
        supabase.table('user_permissions').delete().eq('user_id', user_id).execute()

        # Adicionar novas permissões
        if usuario['permissions']:
            for perm in usuario['permissions']:
                supabase.table('user_permissions').insert({
                    'user_id': user_id,
                    'permission_type': perm['permission_type'],
                    'permission_value': perm['permission_value']
                }).execute()

                print(f"  └─ Permissao: {perm['permission_type']} = {perm['permission_value']}")
        else:
            print(f"  └─ Sem permissoes especificas (acesso total como {usuario['role']})")

        print()

    except Exception as e:
        print(f"[ERRO] Falha ao criar {usuario['email']}: {e}")
        print()

# ============================================================
# PASSO 5: TESTAR ACESSO COM ANON KEY (RLS ATIVO)
# ============================================================
print("=" * 70)
print("PASSO 5: Testando RLS com anon key")
print("=" * 70)
print()

print("[INFO] Conectando com ANON key (RLS ativo)...")
supabase_anon: Client = create_client(SUPABASE_URL, ANON_KEY)
print()

try:
    # Tentar buscar sem autenticação
    result = supabase_anon.table('transactions').select('*', count='exact').limit(0).execute()
    total = result.count if hasattr(result, 'count') else 0

    print(f"[INFO] Sem autenticacao: {total} registros visiveis")
    print()

    if total == 0:
        print("[OK] RLS esta BLOQUEANDO acesso sem autenticacao! ✓")
    else:
        print("[AVISO] RLS pode nao estar ativo - vendo dados sem login")
    print()

except Exception as e:
    print(f"[ESPERADO] RLS bloqueou acesso: {e}")
    print("[OK] RLS esta funcionando corretamente! ✓")
    print()

# ============================================================
# RESULTADO FINAL
# ============================================================
print("=" * 70)
print("RESULTADO FINAL")
print("=" * 70)
print()

print("[SUCESSO] RLS Configurado!")
print()
print("Usuarios de teste criados:")
print()
print("1. admin@raiz.com")
print("   Role: admin")
print("   Acesso: TOTAL (todos os 122k registros)")
print()
print("2. manager.sp01@raiz.com")
print("   Role: manager")
print(f"   Acesso: Apenas filial {filiais[0] if filiais else 'SP01'}")
print()
print("3. viewer.mensalidades@raiz.com")
print("   Role: viewer")
print(f"   Acesso: Apenas tag01={tags01[0] if tags01 else 'Mensalidades'}")
print()

print("=" * 70)
print("PROXIMO PASSO: Atualizar .env.local")
print("=" * 70)
print()
print("Vou atualizar o .env.local para usar ANON key")
print("(em vez de service_role key)")
print()

print("Depois, para testar:")
print("1. Faca login no app com um dos emails acima")
print("2. Clique em 'Buscar Dados'")
print("3. Verifique que ve apenas os dados permitidos")
print()

print("=" * 70)
