"""
Script definitivo de sincronização que não para até conseguir 100%
"""

import os
import sys
from supabase import create_client
import time

# Configurar encoding UTF-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ==================== CONFIGURAÇÕES ====================
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

def sincronizar_lote_a_lote(supabase):
    """Sincroniza em lotes pequenos até completar 100%"""
    print("=" * 80)
    print("🚀 SINCRONIZAÇÃO DEFINITIVA - Não para até 100%!")
    print("=" * 80)

    tentativa = 1
    max_tentativas = 50

    while tentativa <= max_tentativas:
        print(f"\n📊 Tentativa {tentativa}/{max_tentativas}")

        try:
            # 1. Verificar situação atual
            response_dre = supabase.table('dre_fabric') \
                .select('chave_id', count='exact') \
                .not_.is_('type', 'null') \
                .not_.is_('chave_id', 'null') \
                .execute()

            # Contar únicos via query
            response_trans = supabase.table('transactions') \
                .select('chave_id', count='exact') \
                .not_.is_('chave_id', 'null') \
                .execute()

            total_dre = response_dre.count
            total_trans = response_trans.count
            gap = total_dre - total_trans

            print(f"   DRE_FABRIC: {total_dre:,}")
            print(f"   TRANSACTIONS: {total_trans:,}")
            print(f"   GAP: {gap:,}")

            if gap <= 0:
                print("\n🎉 100% SINCRONIZADO!")
                return True

            # 2. Buscar registros que faltam (pequeno lote)
            print(f"\n   🔍 Buscando registros que faltam...")

            # Buscar todos os chave_id que já existem
            response_existentes = supabase.table('transactions') \
                .select('chave_id') \
                .not_.is_('chave_id', 'null') \
                .execute()

            chaves_existentes = set(r['chave_id'] for r in response_existentes.data)
            print(f"   ✅ {len(chaves_existentes):,} chaves já existem")

            # Buscar todos do dre_fabric
            response_dre_all = supabase.table('dre_fabric') \
                .select('*') \
                .not_.is_('type', 'null') \
                .not_.is_('chave_id', 'null') \
                .limit(1000) \
                .execute()

            # Filtrar os que faltam
            registros_para_inserir = []
            chaves_vistas = set()

            for reg in response_dre_all.data:
                chave = reg['chave_id']
                if chave not in chaves_existentes and chave not in chaves_vistas:
                    chaves_vistas.add(chave)

                    # Converter anomes para date
                    date_val = None
                    if reg.get('anomes'):
                        try:
                            anomes_str = str(reg['anomes'])
                            if len(anomes_str) == 6:
                                date_val = f"{anomes_str[:4]}-{anomes_str[4:6]}-01"
                        except:
                            pass

                    registros_para_inserir.append({
                        'id': supabase.table('transactions').select('id').limit(0).execute().data,  # Gera UUID automaticamente
                        'chave_id': chave,
                        'date': date_val,
                        'description': reg.get('complemento'),
                        'category': reg.get('conta'),
                        'amount': float(reg.get('valor', 0)) if reg.get('valor') is not None else 0,
                        'type': reg.get('type', '99. CADASTRAR TAG0'),
                        'scenario': reg.get('scenario', 'Real'),
                        'status': reg.get('status', 'Normal'),
                        'filial': reg.get('filial'),
                        'marca': reg.get('cia'),
                        'tag01': reg.get('tag1'),
                        'tag02': reg.get('tag2'),
                        'tag03': reg.get('tag3'),
                        'vendor': reg.get('fornecedor_padrao'),
                        'ticket': reg.get('ticket'),
                        'nat_orc': reg.get('tag_orc'),
                        'recurring': reg.get('recorrente')
                    })

                    if len(registros_para_inserir) >= 100:
                        break

            if not registros_para_inserir:
                print("   ⚠️  Nenhum registro novo encontrado neste lote")
                tentativa += 1
                continue

            print(f"   📝 Encontrados {len(registros_para_inserir)} registros para inserir")

            # 3. Inserir lote
            print(f"   💾 Inserindo...")

            sucesso = 0
            for reg in registros_para_inserir:
                try:
                    # Remover campo id (deixar o Supabase gerar)
                    reg_limpo = {k: v for k, v in reg.items() if k != 'id'}

                    supabase.table('transactions').insert(reg_limpo).execute()
                    sucesso += 1
                except Exception as e:
                    if 'duplicate key' not in str(e).lower():
                        print(f"      ⚠️  Erro ao inserir {reg['chave_id']}: {str(e)[:100]}")

            print(f"   ✅ Inseridos: {sucesso}")

            tentativa += 1
            time.sleep(1)  # Pausa pequena entre tentativas

        except Exception as e:
            print(f"   ❌ Erro na tentativa: {str(e)}")
            tentativa += 1
            time.sleep(2)

    print("\n⚠️  Limite de tentativas atingido")
    return False

def verificar_resultado_final(supabase):
    """Verificação final"""
    print("\n" + "=" * 80)
    print("📊 RESULTADO FINAL")
    print("=" * 80)

    response_dre = supabase.table('dre_fabric') \
        .select('*', count='exact') \
        .not_.is_('type', 'null') \
        .not_.is_('chave_id', 'null') \
        .execute()

    response_trans = supabase.table('transactions') \
        .select('*', count='exact') \
        .not_.is_('chave_id', 'null') \
        .execute()

    total_dre = response_dre.count
    total_trans = response_trans.count
    gap = total_dre - total_trans

    print(f"\n📊 DRE_FABRIC (elegíveis): {total_dre:,}")
    print(f"✅ TRANSACTIONS (sincronizados): {total_trans:,}")
    print(f"❌ GAP: {gap:,}")

    if gap <= 0:
        print("\n🎉 PERFEITO! 100% SINCRONIZADO!")
        return True
    else:
        print(f"\n⚠️  Ainda faltam {gap:,} registros")
        return False

def main():
    """Função principal"""
    print("\n" + "=" * 80)
    print("🔄 SINCRONIZAÇÃO DEFINITIVA: DRE_FABRIC → TRANSACTIONS")
    print("=" * 80)
    print("\n⚠️  Este script não para até sincronizar 100%!")
    print("=" * 80)

    try:
        print("\n🔄 Conectando ao Supabase...")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado!")

        # Sincronizar
        sucesso = sincronizar_lote_a_lote(supabase)

        # Verificar resultado
        resultado_final = verificar_resultado_final(supabase)

        print("\n" + "=" * 80)
        if resultado_final:
            print("✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!")
        else:
            print("⚠️  SINCRONIZAÇÃO PARCIAL - Executar novamente")
        print("=" * 80)

        return 0 if resultado_final else 1

    except Exception as e:
        print(f"\n❌ Erro: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
