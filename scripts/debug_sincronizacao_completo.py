"""
Debug completo da sincronização DRE_FABRIC → TRANSACTIONS
Identifica o problema passo a passo
"""

import os
import sys
from supabase import create_client, Client

# Configurar encoding UTF-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ==================== CONFIGURAÇÕES ====================
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

def teste_1_colunas(supabase: Client):
    """Teste 1: Verificar colunas das tabelas"""
    print("=" * 80)
    print("📋 TESTE 1: VERIFICAR COLUNAS DAS TABELAS")
    print("=" * 80)

    try:
        # Colunas de dre_fabric
        response = supabase.rpc('exec_sql', {
            'query': """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'dre_fabric'
                  AND table_schema = 'public'
                ORDER BY ordinal_position
            """
        }).execute()

        print("\n📊 DRE_FABRIC:")
        print("   (Verificando via query direta...)")

        # Como rpc pode não existir, usar table select direto
        response = supabase.table('dre_fabric').select('*').limit(1).execute()
        if response.data and len(response.data) > 0:
            colunas_dre = list(response.data[0].keys())
            print(f"   Total de colunas: {len(colunas_dre)}")
            print(f"   Colunas: {', '.join(colunas_dre[:10])}...")

            # Verificar colunas críticas
            colunas_criticas = ['chave_id', 'type', 'scenario', 'status', 'chave']
            print("\n   Colunas críticas:")
            for col in colunas_criticas:
                if col in colunas_dre:
                    print(f"      ✅ {col}")
                else:
                    print(f"      ❌ {col} (NÃO EXISTE)")

        # Colunas de transactions
        response = supabase.table('transactions').select('*').limit(1).execute()
        if response.data and len(response.data) > 0:
            colunas_trans = list(response.data[0].keys())
            print(f"\n📊 TRANSACTIONS:")
            print(f"   Total de colunas: {len(colunas_trans)}")
            print(f"   Colunas: {', '.join(colunas_trans[:10])}...")

            # Verificar se chave_id existe
            if 'chave_id' in colunas_trans:
                print(f"      ✅ chave_id")
            else:
                print(f"      ❌ chave_id (NÃO EXISTE)")

        return colunas_dre, colunas_trans

    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return [], []

def teste_2_registros_para_sincronizar(supabase: Client):
    """Teste 2: Verificar quantos registros precisam sincronizar"""
    print("\n" + "=" * 80)
    print("🔍 TESTE 2: REGISTROS PARA SINCRONIZAR")
    print("=" * 80)

    try:
        # Total em dre_fabric com type e chave_id
        response = supabase.table('dre_fabric') \
            .select('*', count='exact') \
            .not_.is_('type', 'null') \
            .not_.is_('chave_id', 'null') \
            .execute()
        total_dre = response.count

        # Total em transactions com chave_id
        response = supabase.table('transactions') \
            .select('*', count='exact') \
            .not_.is_('chave_id', 'null') \
            .execute()
        total_trans = response.count

        gap = total_dre - total_trans

        print(f"\n📊 DRE_FABRIC (com type E chave_id): {total_dre:,}")
        print(f"📊 TRANSACTIONS (com chave_id): {total_trans:,}")
        print(f"❌ GAP (precisam sincronizar): {gap:,}")

        return gap

    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return 0

def teste_3_amostra_dados(supabase: Client):
    """Teste 3: Ver amostra de dados para sincronizar"""
    print("\n" + "=" * 80)
    print("📄 TESTE 3: AMOSTRA DE DADOS PARA SINCRONIZAR")
    print("=" * 80)

    try:
        # Buscar 1 registro do dre_fabric que não está em transactions
        response = supabase.table('dre_fabric') \
            .select('chave_id, chave, anomes, valor, type, scenario, status, filial, cia') \
            .not_.is_('type', 'null') \
            .not_.is_('chave_id', 'null') \
            .limit(5) \
            .execute()

        if response.data:
            print(f"\n📋 Primeiros 5 registros do DRE_FABRIC:")
            for i, reg in enumerate(response.data, 1):
                print(f"\n   {i}. chave_id: {reg.get('chave_id', 'N/A')}")
                print(f"      chave: {reg.get('chave', 'N/A')}")
                print(f"      anomes: {reg.get('anomes', 'N/A')}")
                print(f"      valor: {reg.get('valor', 'N/A')}")
                print(f"      type: {reg.get('type', 'N/A')}")
                print(f"      scenario: {reg.get('scenario', 'N/A')}")
                print(f"      status: {reg.get('status', 'N/A')}")

            # Verificar se o primeiro já está em transactions
            primeiro_chave = response.data[0].get('chave_id')
            if primeiro_chave:
                response_check = supabase.table('transactions') \
                    .select('chave_id') \
                    .eq('chave_id', primeiro_chave) \
                    .execute()

                if response_check.data and len(response_check.data) > 0:
                    print(f"\n   ⚠️  Registro 1 JÁ EXISTE em transactions!")
                else:
                    print(f"\n   ✅ Registro 1 NÃO existe em transactions (pode sincronizar)")

            return response.data[0]

    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def teste_4_inserir_manual(supabase: Client, registro):
    """Teste 4: Tentar inserir 1 registro manualmente"""
    print("\n" + "=" * 80)
    print("🧪 TESTE 4: INSERIR 1 REGISTRO MANUALMENTE")
    print("=" * 80)

    if not registro:
        print("❌ Nenhum registro disponível para testar")
        return False

    try:
        import uuid
        from datetime import datetime

        # Preparar dados
        chave_id_teste = f"TESTE_{uuid.uuid4().hex[:8]}"

        dados_teste = {
            'id': str(uuid.uuid4()),
            'chave_id': chave_id_teste,
            'date': '2026-01-01',
            'description': registro.get('complemento', 'Teste'),
            'category': registro.get('conta', 'Teste'),
            'amount': float(registro.get('valor', 0)) if registro.get('valor') else 0,
            'type': registro.get('type', '99. CADASTRAR TAG0'),
            'scenario': registro.get('scenario', 'Real'),
            'status': registro.get('status', 'Normal'),
            'filial': registro.get('filial'),
            'marca': registro.get('cia'),
            'tag01': registro.get('tag1'),
            'tag02': registro.get('tag2'),
            'tag03': registro.get('tag3'),
            'vendor': registro.get('fornecedor_padrao'),
            'ticket': registro.get('ticket'),
            'nat_orc': registro.get('tag_orc'),
            'recurring': registro.get('recorrente'),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }

        print(f"\n📝 Tentando inserir registro de teste...")
        print(f"   chave_id: {chave_id_teste}")
        print(f"   Dados: {list(dados_teste.keys())}")

        # Tentar inserir
        response = supabase.table('transactions').insert(dados_teste).execute()

        print(f"\n✅ INSERÇÃO BEM-SUCEDIDA!")
        print(f"   Registro inserido com chave_id: {chave_id_teste}")

        # Remover registro de teste
        supabase.table('transactions').delete().eq('chave_id', chave_id_teste).execute()
        print(f"   🗑️ Registro de teste removido")

        return True

    except Exception as e:
        print(f"\n❌ ERRO AO INSERIR:")
        print(f"   Mensagem: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Função principal"""
    print("\n" + "=" * 80)
    print("🔍 DEBUG COMPLETO: SINCRONIZAÇÃO DRE_FABRIC → TRANSACTIONS")
    print("=" * 80)

    try:
        print("\n🔄 Conectando ao Supabase...")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado!")

        # Executar testes
        colunas_dre, colunas_trans = teste_1_colunas(supabase)
        gap = teste_2_registros_para_sincronizar(supabase)
        registro = teste_3_amostra_dados(supabase)

        if registro:
            sucesso = teste_4_inserir_manual(supabase, registro)

            print("\n" + "=" * 80)
            print("📊 RESUMO DO DEBUG")
            print("=" * 80)

            if sucesso:
                print("\n✅ Inserção manual funcionou!")
                print("\n🎯 PRÓXIMO PASSO:")
                print("   A função sync_dre_fabric_to_transactions deve funcionar.")
                print("   O erro pode estar na lógica da função (WHERE clause).")
                print("\n   Verifique se a função está filtrando registros incorretamente:")
                print("   - NOT EXISTS pode não estar funcionando")
                print("   - Pode estar tentando sincronizar registros que já existem")
            else:
                print("\n❌ Inserção manual FALHOU!")
                print("   O problema está na estrutura dos dados ou colunas.")

        print("\n" + "=" * 80)
        print("✅ DEBUG CONCLUÍDO!")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ Erro geral: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
