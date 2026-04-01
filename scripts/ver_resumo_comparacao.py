"""
Script para visualizar resultados da comparação DRE_FABRIC vs TRANSACTIONS
Executa queries diretamente no Supabase e exibe resultados formatados
"""

import os
import sys
from supabase import create_client, Client

# Configurar encoding UTF-8
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    sys.stdout.reconfigure(encoding='utf-8')

# ==================== CONFIGURAÇÕES ====================
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

def conectar_supabase():
    """Conecta ao Supabase"""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def obter_resumo(supabase: Client):
    """Obtém resumo da última comparação"""
    print("=" * 80)
    print("📊 RESUMO GERAL DA COMPARAÇÃO")
    print("=" * 80)

    try:
        # Buscar último resumo
        response = supabase.table('comparacao_resumo') \
            .select('*') \
            .order('data_execucao', desc=True) \
            .limit(1) \
            .execute()

        if not response.data:
            print("❌ Nenhum resumo encontrado. Execute a comparação primeiro.")
            return None

        resumo = response.data[0]

        # Exibir resultados
        print(f"\n📅 Data da execução: {resumo['data_execucao']}")
        print(f"⏱️  Tempo de execução: {resumo.get('tempo_execucao_ms', 'N/A')} ms")
        print(f"\n📊 Total de registros: {resumo['total_registros']:,}")

        print(f"\n✅ Valores IGUAIS:")
        print(f"   Quantidade: {resumo['qtd_valores_iguais']:,}")
        print(f"   Percentual: {resumo['perc_valores_iguais']:.2f}%")

        print(f"\n⚠️  Valores DIFERENTES:")
        print(f"   Quantidade: {resumo['qtd_valores_diferentes']:,}")
        print(f"   Percentual: {resumo['perc_valores_diferentes']:.2f}%")

        print(f"\n🔵 Só em TRANSACTIONS:")
        print(f"   Quantidade: {resumo['qtd_so_transactions']:,}")
        print(f"   Percentual: {resumo['perc_so_transactions']:.2f}%")

        print(f"\n🔴 Só em DRE_FABRIC (não sincronizados):")
        print(f"   Quantidade: {resumo['qtd_so_dre_fabric']:,}")
        print(f"   Percentual: {resumo['perc_so_dre_fabric']:.2f}%")

        print(f"\n💰 Valores Financeiros:")
        print(f"   Total DRE_FABRIC: R$ {resumo['soma_df_valor']:,.2f}")
        print(f"   Total TRANSACTIONS: R$ {resumo['soma_t_amount']:,.2f}")
        print(f"   Diferença Total: R$ {abs(resumo['diferenca_total']):,.2f}")

        # Avaliação
        print(f"\n🎯 AVALIAÇÃO GERAL:")
        if resumo['qtd_valores_diferentes'] == 0 and resumo['qtd_so_dre_fabric'] == 0:
            print("   ✅ PERFEITO - 100% Sincronizado!")
        elif resumo['perc_valores_iguais'] >= 99:
            print("   ✅ EXCELENTE - >99% Sincronizado")
        elif resumo['perc_valores_iguais'] >= 95:
            print("   ⚠️  BOM - >95% Sincronizado")
        elif resumo['perc_valores_iguais'] >= 90:
            print("   ⚠️  REGULAR - >90% Sincronizado")
        else:
            print("   ❌ CRÍTICO - <90% Sincronizado")

        return resumo

    except Exception as e:
        print(f"❌ Erro ao buscar resumo: {str(e)}")
        return None

def obter_detalhamento_por_status(supabase: Client):
    """Obtém contagem por status"""
    print("\n" + "=" * 80)
    print("📋 DETALHAMENTO POR STATUS")
    print("=" * 80)

    try:
        # Buscar última data de execução
        response = supabase.table('comparacao_resumo') \
            .select('data_execucao') \
            .order('data_execucao', desc=True) \
            .limit(1) \
            .execute()

        if not response.data:
            print("❌ Nenhuma comparação encontrada.")
            return

        ultima_data = response.data[0]['data_execucao']

        # Buscar agrupamento por status
        response = supabase.rpc('contar_por_status', {
            'p_data_execucao': ultima_data
        }).execute()

        # Se a função RPC não existir, fazer query direta
        if not response.data:
            response = supabase.table('comparacao_historico') \
                .select('status') \
                .eq('data_execucao', ultima_data) \
                .execute()

            if response.data:
                from collections import Counter
                status_count = Counter(item['status'] for item in response.data)
                total = len(response.data)

                print("\n")
                for status in sorted(status_count.keys()):
                    qtd = status_count[status]
                    perc = (qtd / total * 100) if total > 0 else 0
                    print(f"{status}")
                    print(f"   Quantidade: {qtd:,} ({perc:.2f}%)")
                    print()

    except Exception as e:
        print(f"⚠️  Não foi possível obter detalhamento: {str(e)}")

def obter_divergencias(supabase: Client):
    """Obtém top 10 divergências"""
    print("\n" + "=" * 80)
    print("⚠️  TOP 10 MAIORES DIVERGÊNCIAS DE VALOR")
    print("=" * 80)

    try:
        # Buscar última data de execução
        response = supabase.table('comparacao_resumo') \
            .select('data_execucao') \
            .order('data_execucao', desc=True) \
            .limit(1) \
            .execute()

        if not response.data:
            return

        ultima_data = response.data[0]['data_execucao']

        # Buscar divergências
        response = supabase.table('comparacao_historico') \
            .select('chave_id, df_valor, t_amount, diferenca_valor, percentual_diferenca, df_filial, df_type') \
            .eq('data_execucao', ultima_data) \
            .eq('status', '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES') \
            .order('diferenca_valor', desc=True) \
            .limit(10) \
            .execute()

        if not response.data:
            print("\n✅ Nenhuma divergência encontrada!")
            return

        print(f"\n⚠️  Encontradas {len(response.data)} divergências:\n")

        for i, item in enumerate(response.data, 1):
            print(f"{i}. Chave: {item['chave_id']}")
            print(f"   DRE_FABRIC: R$ {item['df_valor']:,.2f}")
            print(f"   TRANSACTIONS: R$ {item['t_amount']:,.2f}")
            print(f"   Diferença: R$ {abs(item['diferenca_valor']):,.2f} ({item.get('percentual_diferenca', 0):.2f}%)")
            print(f"   Filial: {item.get('df_filial', 'N/A')} | Tipo: {item.get('df_type', 'N/A')}")
            print()

    except Exception as e:
        print(f"⚠️  Erro ao buscar divergências: {str(e)}")

def obter_nao_sincronizados(supabase: Client):
    """Obtém registros não sincronizados"""
    print("\n" + "=" * 80)
    print("🔴 REGISTROS NÃO SINCRONIZADOS (Só em DRE_FABRIC)")
    print("=" * 80)

    try:
        # Buscar última data de execução
        response = supabase.table('comparacao_resumo') \
            .select('data_execucao') \
            .order('data_execucao', desc=True) \
            .limit(1) \
            .execute()

        if not response.data:
            return

        ultima_data = response.data[0]['data_execucao']

        # Contar total
        response_count = supabase.table('comparacao_historico') \
            .select('*', count='exact') \
            .eq('data_execucao', ultima_data) \
            .eq('status', '4. SO TEM NA DRE_FABRIC') \
            .execute()

        total = response_count.count if response_count.count else 0

        if total == 0:
            print("\n✅ Todos os registros foram sincronizados!")
            return

        print(f"\n⚠️  Total não sincronizados: {total:,}")

        # Buscar amostra
        response = supabase.table('comparacao_historico') \
            .select('chave_id, df_valor, df_filial, df_type') \
            .eq('data_execucao', ultima_data) \
            .eq('status', '4. SO TEM NA DRE_FABRIC') \
            .order('df_valor', desc=True) \
            .limit(10) \
            .execute()

        if response.data:
            print("\nAmostra dos 10 primeiros:\n")
            for i, item in enumerate(response.data, 1):
                print(f"{i}. Chave: {item['chave_id']}")
                print(f"   Valor: R$ {item['df_valor']:,.2f}")
                print(f"   Filial: {item.get('df_filial', 'N/A')} | Tipo: {item.get('df_type', 'N/A')}")
                print()

    except Exception as e:
        print(f"⚠️  Erro ao buscar não sincronizados: {str(e)}")

def main():
    """Função principal"""
    print("\n🔄 Conectando ao Supabase...")

    try:
        supabase = conectar_supabase()
        print("✅ Conectado!\n")

        # Obter dados
        resumo = obter_resumo(supabase)

        if resumo:
            obter_detalhamento_por_status(supabase)

            # Só mostrar divergências se houver
            if resumo['qtd_valores_diferentes'] > 0:
                obter_divergencias(supabase)

            # Só mostrar não sincronizados se houver
            if resumo['qtd_so_dre_fabric'] > 0:
                obter_nao_sincronizados(supabase)

        print("\n" + "=" * 80)
        print("✅ Análise concluída!")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ Erro: {str(e)}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
