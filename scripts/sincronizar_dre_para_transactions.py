"""
Sincronização Manual: DRE_FABRIC → TRANSACTIONS
Executa a função sync_dre_fabric_to_transactions para sincronizar todos os registros
"""

import os
import sys
import requests
import time

# Configurar encoding UTF-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ==================== CONFIGURAÇÕES ====================
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

def executar_sincronizacao():
    """Executa a função de sincronização no Supabase"""
    print("=" * 80)
    print("🔄 SINCRONIZAÇÃO: DRE_FABRIC → TRANSACTIONS")
    print("=" * 80)

    url = f"{SUPABASE_URL}/rest/v1/rpc/sync_dre_fabric_to_transactions"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    # Payload: NULL = sincronizar tudo
    payload = {"p_limit": None}

    print("\n🚀 Iniciando sincronização...")
    print(f"📊 Sincronizando TODOS os registros elegíveis...")
    print(f"⏱️  Aguarde... (pode levar alguns minutos)")

    inicio = time.time()

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=300  # 5 minutos de timeout
        )

        fim = time.time()
        tempo_segundos = fim - inicio

        if response.status_code == 200:
            resultado = response.json()

            print(f"\n✅ Sincronização concluída em {tempo_segundos:.2f} segundos!")
            print("\n📊 RESULTADOS:")

            if resultado and len(resultado) > 0:
                res = resultado[0]
                print(f"   Total processados: {res.get('total_processados', 0):,}")
                print(f"   ✅ Novos inseridos: {res.get('novos_inseridos', 0):,}")
                print(f"   🔄 Atualizados: {res.get('atualizados', 0):,}")
                print(f"   ❌ Erros: {res.get('erros', 0):,}")

                if res.get('erros', 0) > 0:
                    print("\n⚠️  Houve erros na sincronização!")
                else:
                    print("\n✅ Sincronização 100% bem-sucedida!")

                return res
            else:
                print("   ⚠️  Nenhum resultado retornado")
                return None

        else:
            print(f"\n❌ Erro na sincronização!")
            print(f"   Status: {response.status_code}")
            print(f"   Mensagem: {response.text}")
            return None

    except requests.exceptions.Timeout:
        print(f"\n❌ Timeout após {tempo_segundos:.2f} segundos")
        print("   A sincronização pode estar demorando muito.")
        print("   Tente executar em batches menores ou verifique o Supabase.")
        return None

    except Exception as e:
        print(f"\n❌ Erro: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def verificar_resultado():
    """Verifica o resultado após sincronização"""
    from supabase import create_client

    print("\n" + "=" * 80)
    print("🔍 VERIFICANDO RESULTADO...")
    print("=" * 80)

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Contar DRE_FABRIC elegíveis
        response = supabase.table('dre_fabric') \
            .select('*', count='exact') \
            .not_.is_('type', 'null') \
            .not_.is_('chave_id', 'null') \
            .execute()
        elegiveis = response.count

        # Contar TRANSACTIONS sincronizados
        response = supabase.table('transactions') \
            .select('*', count='exact') \
            .not_.is_('chave_id', 'null') \
            .execute()
        sincronizados = response.count

        gap = elegiveis - sincronizados

        print(f"\n📊 DRE_FABRIC elegíveis: {elegiveis:,}")
        print(f"✅ TRANSACTIONS sincronizados: {sincronizados:,}")

        if gap > 0:
            print(f"❌ GAP restante: {gap:,} registros")
            print("\n⚠️  Ainda há registros não sincronizados!")
            print("   Possível causa: Erro na função de sincronização")
            print("   Tente executar novamente ou verifique os logs no Supabase")
            return False
        else:
            print(f"✅ GAP: 0 registros")
            print("\n🎉 PERFEITO! Todos os registros foram sincronizados!")
            return True

    except Exception as e:
        print(f"⚠️  Não foi possível verificar: {str(e)}")
        return None

def main():
    """Função principal"""
    print("\n" + "=" * 80)
    print("🔄 SINCRONIZAÇÃO MANUAL: DRE_FABRIC → TRANSACTIONS")
    print("=" * 80)
    print("\nEste script vai sincronizar TODOS os registros elegíveis")
    print("do DRE_FABRIC para a tabela TRANSACTIONS.")
    print("\n⚠️  Aguarde... pode demorar alguns minutos.")
    print("=" * 80)

    # Executar sincronização
    resultado = executar_sincronizacao()

    if resultado:
        # Verificar resultado
        verificar_resultado()

    print("\n" + "=" * 80)
    print("✅ Processo concluído!")
    print("=" * 80)

    return 0

if __name__ == "__main__":
    exit(main())
