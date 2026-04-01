"""
Diagnóstico e Correção da Sincronização DRE_FABRIC → TRANSACTIONS
Identifica por que 47,095 registros não foram sincronizados
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

def diagnosticar_dre_fabric(supabase: Client):
    """Diagnostica registros em dre_fabric"""
    print("=" * 80)
    print("🔍 DIAGNÓSTICO: DRE_FABRIC")
    print("=" * 80)

    # Total geral
    response = supabase.table('dre_fabric').select('*', count='exact').execute()
    total_geral = response.count

    # Registros com chave_id
    response = supabase.table('dre_fabric').select('*', count='exact').not_.is_('chave_id', 'null').execute()
    com_chave = response.count

    # Registros sem chave_id
    sem_chave = total_geral - com_chave

    # Registros com type
    response = supabase.table('dre_fabric').select('*', count='exact').not_.is_('type', 'null').execute()
    com_type = response.count

    # Registros sem type
    sem_type = total_geral - com_type

    # Registros elegíveis para sincronização (com type E com chave)
    response = supabase.table('dre_fabric') \
        .select('*', count='exact') \
        .not_.is_('type', 'null') \
        .not_.is_('chave_id', 'null') \
        .execute()
    elegiveis = response.count

    print(f"\n📊 Total de registros: {total_geral:,}")
    print(f"\n✅ Com chave_id: {com_chave:,} ({com_chave/total_geral*100:.2f}%)")
    print(f"❌ Sem chave_id: {sem_chave:,} ({sem_chave/total_geral*100:.2f}%)")
    print(f"\n✅ Com type (classificados): {com_type:,} ({com_type/total_geral*100:.2f}%)")
    print(f"❌ Sem type (não classificados): {sem_type:,} ({sem_type/total_geral*100:.2f}%)")
    print(f"\n🎯 Elegíveis para sincronização (com type E chave_id): {elegiveis:,}")

    return {
        'total': total_geral,
        'com_chave': com_chave,
        'sem_chave': sem_chave,
        'com_type': com_type,
        'sem_type': sem_type,
        'elegiveis': elegiveis
    }

def diagnosticar_transactions(supabase: Client):
    """Diagnostica registros em transactions"""
    print("\n" + "=" * 80)
    print("🔍 DIAGNÓSTICO: TRANSACTIONS")
    print("=" * 80)

    # Total geral
    response = supabase.table('transactions').select('*', count='exact').execute()
    total = response.count

    # Com chave_id
    response = supabase.table('transactions').select('*', count='exact').not_.is_('chave_id', 'null').execute()
    com_chave = response.count

    print(f"\n📊 Total de registros: {total:,}")
    print(f"✅ Com chave_id (vindos do DRE): {com_chave:,}")

    return {'total': total, 'com_chave': com_chave}

def analisar_gap(stats_dre, stats_trans):
    """Analisa a diferença entre as tabelas"""
    print("\n" + "=" * 80)
    print("📊 ANÁLISE DO GAP")
    print("=" * 80)

    elegiveis = stats_dre['elegiveis']
    sincronizados = stats_trans['com_chave']
    gap = elegiveis - sincronizados

    print(f"\n🎯 Registros elegíveis no DRE_FABRIC: {elegiveis:,}")
    print(f"✅ Registros sincronizados em TRANSACTIONS: {sincronizados:,}")
    print(f"❌ GAP (não sincronizados): {gap:,}")

    if gap > 0:
        print(f"\n⚠️  {gap:,} registros elegíveis NÃO foram sincronizados!")
        print("\n🔧 SOLUÇÃO:")
        print("   Execute a sincronização manual para corrigir:")
        print("   → No Supabase SQL Editor:")
        print("      SELECT * FROM sync_dre_fabric_to_transactions(NULL);")
        return False
    else:
        print("\n✅ Todos os registros elegíveis foram sincronizados!")
        return True

def verificar_nao_elegiveis(supabase: Client):
    """Analisa por que registros não são elegíveis"""
    print("\n" + "=" * 80)
    print("🔍 POR QUE 47,095 REGISTROS NÃO SÃO ELEGÍVEIS?")
    print("=" * 80)

    # Registros sem type
    response = supabase.table('dre_fabric') \
        .select('*', count='exact') \
        .is_('type', 'null') \
        .execute()
    sem_type = response.count

    # Registros sem chave_id
    response = supabase.table('dre_fabric') \
        .select('*', count='exact') \
        .is_('chave_id', 'null') \
        .execute()
    sem_chave = response.count

    # Registros sem ambos
    response = supabase.table('dre_fabric') \
        .select('*', count='exact') \
        .is_('type', 'null') \
        .is_('chave_id', 'null') \
        .execute()
    sem_ambos = response.count

    print(f"\n❌ Sem type (não classificados): {sem_type:,}")
    print(f"❌ Sem chave_id: {sem_chave:,}")
    print(f"❌ Sem type E sem chave_id: {sem_ambos:,}")

    print("\n🎯 PRINCIPAL CAUSA:")
    if sem_type > sem_chave:
        print(f"   Falta de classificação (type NULL): {sem_type:,} registros")
        print("\n   📝 AÇÃO NECESSÁRIA:")
        print("      Classificar registros em dre_fabric antes de sincronizar")
        print("      Os registros precisam ter o campo 'type' preenchido")
    else:
        print(f"   Falta de chave_id: {sem_chave:,} registros")
        print("\n   📝 AÇÃO NECESSÁRIA:")
        print("      Gerar chave_id para os registros sem chave")

def main():
    """Função principal"""
    print("\n🔄 Conectando ao Supabase...")

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado!\n")

        # Diagnósticos
        stats_dre = diagnosticar_dre_fabric(supabase)
        stats_trans = diagnosticar_transactions(supabase)

        # Análise do gap
        tudo_ok = analisar_gap(stats_dre, stats_trans)

        if not tudo_ok:
            # Investigar por que não são elegíveis
            verificar_nao_elegiveis(supabase)

        print("\n" + "=" * 80)
        print("✅ Diagnóstico concluído!")
        print("=" * 80)

        # Resumo final
        print("\n📋 RESUMO:")
        print(f"   Total DRE_FABRIC: {stats_dre['total']:,}")
        print(f"   Elegíveis: {stats_dre['elegiveis']:,}")
        print(f"   Sincronizados: {stats_trans['com_chave']:,}")
        print(f"   Não elegíveis: {stats_dre['total'] - stats_dre['elegiveis']:,}")

    except Exception as e:
        print(f"\n❌ Erro: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
