"""
Sincronização em batches pequenos para identificar problemas
Tenta inserir registros em lotes de 100, se der erro, tenta 1 por 1
"""

import os
import sys
from supabase import create_client
import uuid
from datetime import datetime

# Configurar encoding UTF-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ==================== CONFIGURAÇÕES ====================
SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA'

def converter_registro(reg):
    """Converte registro do dre_fabric para formato transactions"""
    # Converter anomes para date
    date_val = None
    if reg.get('anomes') and len(str(reg['anomes'])) == 6:
        try:
            anomes_str = str(reg['anomes'])
            ano = anomes_str[:4]
            mes = anomes_str[4:6]
            date_val = f"{ano}-{mes}-01"
        except:
            date_val = None

    return {
        'id': str(uuid.uuid4()),
        'chave_id': reg.get('chave_id'),
        'date': date_val,
        'description': reg.get('complemento'),
        'category': reg.get('conta'),
        'amount': float(reg.get('valor', 0)) if reg.get('valor') is not None else 0,
        'type': reg.get('type') or '99. CADASTRAR TAG0',
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
        'recurring': reg.get('recorrente'),
        'created_at': reg.get('created_at', datetime.now().isoformat()),
        'updated_at': reg.get('updated_at', datetime.now().isoformat())
    }

def buscar_registros_para_sincronizar(supabase, limit=None, offset=0):
    """Busca registros que precisam ser sincronizados"""
    query = supabase.table('dre_fabric') \
        .select('*') \
        .not_.is_('type', 'null') \
        .not_.is_('chave_id', 'null') \
        .order('created_at', desc=False) \
        .range(offset, offset + limit - 1 if limit else 999999)

    response = query.execute()
    return response.data

def verificar_se_existe(supabase, chave_id):
    """Verifica se registro já existe em transactions"""
    response = supabase.table('transactions') \
        .select('chave_id') \
        .eq('chave_id', chave_id) \
        .execute()
    return len(response.data) > 0

def inserir_batch(supabase, registros):
    """Insere batch de registros"""
    dados_convertidos = [converter_registro(reg) for reg in registros]

    try:
        response = supabase.table('transactions').upsert(
            dados_convertidos,
            on_conflict='chave_id'
        ).execute()

        return len(response.data), []

    except Exception as e:
        # Se falhar, tentar 1 por 1
        print(f"      ⚠️  Batch falhou: {str(e)[:100]}... Tentando 1 por 1...")
        return inserir_um_por_um(supabase, registros)

def inserir_um_por_um(supabase, registros):
    """Insere registros um por um para identificar problemas"""
    sucesso = 0
    erros = []

    for reg in registros:
        try:
            # Pular se já existe
            if verificar_se_existe(supabase, reg['chave_id']):
                sucesso += 1
                continue

            dado = converter_registro(reg)
            supabase.table('transactions').insert(dado).execute()
            sucesso += 1

        except Exception as e:
            erros.append({
                'chave_id': reg.get('chave_id'),
                'erro': str(e)[:200]
            })

    return sucesso, erros

def main():
    """Função principal"""
    print("\n" + "=" * 80)
    print("🔄 SINCRONIZAÇÃO EM BATCHES: DRE_FABRIC → TRANSACTIONS")
    print("=" * 80)

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado ao Supabase")

        # Verificar quantos precisam sincronizar
        print("\n🔍 Verificando registros...")

        response_dre = supabase.table('dre_fabric') \
            .select('*', count='exact') \
            .not_.is_('type', 'null') \
            .not_.is_('chave_id', 'null') \
            .execute()
        total_dre = response_dre.count

        response_trans = supabase.table('transactions') \
            .select('*', count='exact') \
            .not_.is_('chave_id', 'null') \
            .execute()
        total_trans = response_trans.count

        gap = total_dre - total_trans

        print(f"📊 DRE_FABRIC: {total_dre:,}")
        print(f"📊 TRANSACTIONS: {total_trans:,}")
        print(f"❌ Para sincronizar: {gap:,}")

        if gap == 0:
            print("\n✅ Já está 100% sincronizado!")
            return 0

        # Sincronizar em batches
        BATCH_SIZE = 1000
        total_sincronizados = 0
        total_erros = []

        print(f"\n🚀 Sincronizando em batches de {BATCH_SIZE}...")
        print("=" * 80)

        offset = 0
        batch_num = 1

        while True:
            # Buscar batch
            registros = buscar_registros_para_sincronizar(supabase, BATCH_SIZE, offset)

            if not registros:
                break

            print(f"\nBatch {batch_num}: {len(registros)} registros...")

            # Inserir batch
            sucesso, erros = inserir_batch(supabase, registros)

            total_sincronizados += sucesso
            total_erros.extend(erros)

            percentual = (total_sincronizados / total_dre * 100) if total_dre > 0 else 0
            print(f"   ✅ {sucesso} sucesso | ❌ {len(erros)} erros | {percentual:.1f}% completo")

            if erros:
                print(f"      Erros:")
                for erro in erros[:3]:  # Mostrar apenas 3 primeiros
                    print(f"         - {erro['chave_id']}: {erro['erro'][:100]}")

            offset += BATCH_SIZE
            batch_num += 1

            # Limite de segurança
            if batch_num > 200:
                print("\n⚠️  Limite de batches atingido")
                break

        # Verificar resultado final
        print("\n" + "=" * 80)
        print("📊 RESULTADO FINAL")
        print("=" * 80)

        response_trans_final = supabase.table('transactions') \
            .select('*', count='exact') \
            .not_.is_('chave_id', 'null') \
            .execute()
        total_trans_final = response_trans_final.count

        gap_final = total_dre - total_trans_final

        print(f"\n✅ Sincronizados: {total_sincronizados:,}")
        print(f"❌ Erros: {len(total_erros):,}")
        print(f"\n📊 TRANSACTIONS agora: {total_trans_final:,}")
        print(f"❌ GAP restante: {gap_final:,}")

        if gap_final == 0:
            print("\n🎉 PERFEITO! 100% sincronizado!")
        else:
            print(f"\n⚠️  Ainda faltam {gap_final:,} registros")

        if total_erros:
            print(f"\n📝 Total de erros encontrados: {len(total_erros)}")
            print("   Primeiros 10 erros:")
            for erro in total_erros[:10]:
                print(f"      - {erro['chave_id']}: {erro['erro'][:100]}")

        print("\n" + "=" * 80)
        print("✅ PROCESSO CONCLUÍDO!")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ Erro geral: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
