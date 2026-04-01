"""
Executar comparação DRE_FABRIC vs TRANSACTIONS
"""

import os
import sys
import requests

# Configurar encoding UTF-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ==================== CONFIGURAÇÕES ====================
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

def executar_comparacao():
    """Executa a função de comparação no Supabase"""
    print("=" * 80)
    print("📊 EXECUTANDO COMPARAÇÃO: DRE_FABRIC vs TRANSACTIONS")
    print("=" * 80)

    url = f"{SUPABASE_URL}/rest/v1/rpc/executar_comparacao_manual"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    print("\n🚀 Executando comparação...")
    print("⏱️  Aguarde... (pode levar ~10 segundos)")

    try:
        response = requests.post(url, headers=headers, json={}, timeout=120)

        if response.status_code == 200:
            resultado = response.json()

            print(f"\n✅ COMPARAÇÃO CONCLUÍDA!")

            if resultado and len(resultado) > 0:
                res = resultado[0]
                print(f"\n📊 RESULTADOS:")
                print(f"   Resumo ID: {res.get('resumo_id')}")
                print(f"   Registros inseridos: {res.get('registros_inseridos', 0):,}")
                print(f"   Tempo: {res.get('tempo_execucao_ms', 0):,} ms")
                print(f"   Mensagem: {res.get('mensagem', 'N/A')}")

                return True
            else:
                print("   ⚠️  Resposta vazia")
                return False

        else:
            print(f"\n❌ ERRO na comparação!")
            print(f"   Status: {response.status_code}")
            print(f"   Mensagem: {response.text}")

            if response.status_code == 404:
                print("\n❌ A função executar_comparacao_manual NÃO EXISTE!")
                print("\n🔧 A função precisa estar criada no Supabase.")

            return False

    except Exception as e:
        print(f"\n❌ Erro: {str(e)}")
        return False

def verificar_resultados():
    """Verifica os resultados da comparação"""
    from supabase import create_client

    print("\n" + "=" * 80)
    print("📋 VERIFICANDO RESULTADOS DA COMPARAÇÃO")
    print("=" * 80)

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Buscar último resumo
        response = supabase.table('comparacao_resumo') \
            .select('*') \
            .order('data_execucao', desc=True) \
            .limit(1) \
            .execute()

        if response.data and len(response.data) > 0:
            resumo = response.data[0]

            print(f"\n📊 RESUMO:")
            print(f"   Data: {resumo['data_execucao']}")
            print(f"   Total: {resumo['total_registros']:,}")
            print(f"   ✅ Valores iguais: {resumo['qtd_valores_iguais']:,} ({resumo['perc_valores_iguais']:.1f}%)")
            print(f"   ⚠️  Valores diferentes: {resumo['qtd_valores_diferentes']:,} ({resumo['perc_valores_diferentes']:.1f}%)")
            print(f"   🔵 Só TRANSACTIONS: {resumo['qtd_so_transactions']:,}")
            print(f"   🔴 Só DRE_FABRIC: {resumo['qtd_so_dre_fabric']:,} ⭐")

            # Contar registros na comparacao_historico com status 4
            response_status4 = supabase.table('comparacao_historico') \
                .select('*', count='exact') \
                .eq('data_execucao', resumo['data_execucao']) \
                .eq('status', '4. SO TEM NA DRE_FABRIC') \
                .execute()

            print(f"\n🎯 REGISTROS PARA SINCRONIZAR:")
            print(f"   Status '4. SO TEM NA DRE_FABRIC': {response_status4.count:,}")

            if response_status4.count > 0:
                print(f"\n✅ PRONTO! Podemos pegar esses {response_status4.count:,} registros e inserir em transactions!")
                return True
            else:
                print(f"\n⚠️  Nenhum registro com status 4 encontrado")
                return False

        else:
            print("\n⚠️  Nenhum resumo encontrado")
            return False

    except Exception as e:
        print(f"\n❌ Erro: {str(e)}")
        return False

def main():
    """Função principal"""
    print("\n" + "=" * 80)
    print("PASSO 1: EXECUTAR COMPARAÇÃO")
    print("=" * 80)

    # Executar comparação
    sucesso = executar_comparacao()

    if sucesso:
        # Verificar resultados
        verificar_resultados()

    print("\n" + "=" * 80)
    print("✅ PASSO 1 CONCLUÍDO!")
    print("=" * 80)
    print("\n📝 Próximo passo: Inserir os registros com status 4 em transactions")

    return 0

if __name__ == "__main__":
    exit(main())
