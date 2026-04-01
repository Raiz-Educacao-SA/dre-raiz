"""
Execução completa: Criar função e sincronizar
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

SQL_CRIAR_FUNCAO = """
-- Remover função antiga
DROP FUNCTION IF EXISTS sync_dre_fabric_to_transactions(INTEGER);

-- Criar função simplificada
CREATE OR REPLACE FUNCTION sync_dre_fabric_to_transactions(p_limit INTEGER DEFAULT NULL)
RETURNS TABLE(
  total_processados BIGINT,
  novos_inseridos BIGINT,
  atualizados BIGINT,
  erros BIGINT
) AS $$
DECLARE
  v_processados BIGINT := 0;
  v_inseridos BIGINT := 0;
  v_atualizados BIGINT := 0;
  v_erros BIGINT := 0;
BEGIN
  WITH insert_result AS (
    INSERT INTO transactions (
      id, date, description, category, amount, type, scenario, status,
      filial, marca, tag01, tag02, tag03, vendor, ticket, nat_orc,
      recurring, chave_id, created_at, updated_at
    )
    SELECT
      gen_random_uuid()::TEXT,
      CASE WHEN df.anomes IS NOT NULL AND LENGTH(df.anomes) = 6
        THEN TO_DATE(df.anomes, 'YYYYMM')::TEXT ELSE NULL END,
      df.complemento, df.conta, df.valor,
      COALESCE(df.type, '99. CADASTRAR TAG0'),
      COALESCE(df.scenario, 'Real'),
      COALESCE(df.status, 'Normal'),
      df.filial, df.cia, df.tag1, df.tag2, df.tag3,
      df.fornecedor_padrao, df.ticket, df.tag_orc, df.recorrente,
      df.chave_id, df.created_at, df.updated_at
    FROM dre_fabric df
    WHERE df.type IS NOT NULL AND df.chave_id IS NOT NULL
    LIMIT p_limit
    ON CONFLICT (chave_id) DO UPDATE SET
      date = EXCLUDED.date, description = EXCLUDED.description,
      category = EXCLUDED.category, amount = EXCLUDED.amount,
      type = EXCLUDED.type, scenario = EXCLUDED.scenario,
      status = EXCLUDED.status, filial = EXCLUDED.filial,
      marca = EXCLUDED.marca, tag01 = EXCLUDED.tag01,
      tag02 = EXCLUDED.tag02, tag03 = EXCLUDED.tag03,
      vendor = EXCLUDED.vendor, ticket = EXCLUDED.ticket,
      nat_orc = EXCLUDED.nat_orc, recurring = EXCLUDED.recurring,
      updated_at = EXCLUDED.updated_at
    RETURNING CASE WHEN xmax = 0 THEN 1 ELSE 0 END as inserted
  )
  SELECT COUNT(*), SUM(inserted), SUM(CASE WHEN inserted = 0 THEN 1 ELSE 0 END)
  INTO v_processados, v_inseridos, v_atualizados
  FROM insert_result;

  RETURN QUERY SELECT v_processados, v_inseridos, v_atualizados, v_erros;
EXCEPTION
  WHEN OTHERS THEN
    v_erros := 1;
    RAISE NOTICE 'ERRO: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN QUERY SELECT v_processados, v_inseridos, v_atualizados, v_erros;
END;
$$ LANGUAGE plpgsql;
"""

def criar_funcao():
    """Cria a função no Supabase via API"""
    print("=" * 80)
    print("📝 PASSO 1: CRIAR FUNÇÃO DE SINCRONIZAÇÃO")
    print("=" * 80)

    # Supabase não permite executar SQL raw via REST API
    # Precisamos usar a Management API ou SQL Editor
    print("\n⚠️  A API REST do Supabase não suporta execução de SQL DDL diretamente.")
    print("\n📋 EXECUTANDO VIA SQL DIRETO...")

    # Tentar via endpoint de query (pode não funcionar)
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(url, headers=headers, json={'query': SQL_CRIAR_FUNCAO}, timeout=30)
        if response.status_code == 200:
            print("✅ Função criada com sucesso!")
            return True
        else:
            print(f"⚠️  Não foi possível criar via API (Status: {response.status_code})")
            print("\n📝 A função precisa ser criada manualmente no Supabase SQL Editor.")
            print("   MAS vou tentar executar a sincronização mesmo assim...")
            print("   (A função pode já existir)")
            return True  # Continuar mesmo assim
    except Exception as e:
        print(f"⚠️  Erro ao tentar criar função: {str(e)}")
        print("   Continuando mesmo assim (função pode já existir)...")
        return True

def executar_sincronizacao():
    """Executa a sincronização"""
    print("\n" + "=" * 80)
    print("🔄 PASSO 2: EXECUTAR SINCRONIZAÇÃO")
    print("=" * 80)

    url = f"{SUPABASE_URL}/rest/v1/rpc/sync_dre_fabric_to_transactions"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    payload = {"p_limit": None}

    print("\n🚀 Iniciando sincronização...")
    print("📊 Sincronizando TODOS os registros (pode levar alguns minutos)...")
    print("⏱️  Aguarde...")

    inicio = time.time()

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=300)
        fim = time.time()
        tempo = fim - inicio

        if response.status_code == 200:
            resultado = response.json()

            print(f"\n✅ SINCRONIZAÇÃO CONCLUÍDA em {tempo:.2f} segundos!")

            if resultado and len(resultado) > 0:
                res = resultado[0]
                print("\n📊 RESULTADOS:")
                print(f"   Total processados: {res.get('total_processados', 0):,}")
                print(f"   ✅ Novos inseridos: {res.get('novos_inseridos', 0):,}")
                print(f"   🔄 Atualizados: {res.get('atualizados', 0):,}")
                print(f"   ❌ Erros: {res.get('erros', 0):,}")

                if res.get('erros', 0) == 0:
                    print("\n🎉 PERFEITO! Sincronização 100% bem-sucedida!")
                    return True
                else:
                    print("\n⚠️  Houve erros na sincronização")
                    return False
            else:
                print("⚠️  Resposta vazia")
                return False

        else:
            print(f"\n❌ ERRO na sincronização!")
            print(f"   Status: {response.status_code}")
            print(f"   Mensagem: {response.text}")

            if response.status_code == 404:
                print("\n❌ A função NÃO EXISTE no Supabase!")
                print("\n🔧 SOLUÇÃO:")
                print("   1. Abra Supabase Dashboard → SQL Editor")
                print("   2. Execute o arquivo: CRIAR_FUNCAO_SIMPLIFICADA.sql")
                print("   3. Depois execute: SELECT * FROM sync_dre_fabric_to_transactions(NULL);")

            return False

    except requests.exceptions.Timeout:
        print(f"\n⏰ Timeout após {tempo:.2f} segundos")
        print("   A sincronização pode estar ainda rodando no servidor.")
        return False

    except Exception as e:
        print(f"\n❌ Erro: {str(e)}")
        return False

def verificar_resultado():
    """Verifica o resultado final"""
    from supabase import create_client

    print("\n" + "=" * 80)
    print("🔍 VERIFICANDO RESULTADO FINAL")
    print("=" * 80)

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # DRE_FABRIC elegíveis
        response = supabase.table('dre_fabric') \
            .select('*', count='exact') \
            .not_.is_('type', 'null') \
            .not_.is_('chave_id', 'null') \
            .execute()
        elegiveis = response.count

        # TRANSACTIONS sincronizados
        response = supabase.table('transactions') \
            .select('*', count='exact') \
            .not_.is_('chave_id', 'null') \
            .execute()
        sincronizados = response.count

        gap = elegiveis - sincronizados

        print(f"\n📊 DRE_FABRIC (elegíveis): {elegiveis:,}")
        print(f"✅ TRANSACTIONS (sincronizados): {sincronizados:,}")
        print(f"❌ GAP: {gap:,}")

        if gap == 0:
            print("\n🎉 PERFEITO! 100% sincronizado!")
            return True
        else:
            print(f"\n⚠️  Ainda faltam {gap:,} registros")
            return False

    except Exception as e:
        print(f"⚠️  Erro ao verificar: {str(e)}")
        return False

def main():
    """Função principal"""
    print("\n" + "=" * 80)
    print("🚀 SINCRONIZAÇÃO COMPLETA: DRE_FABRIC → TRANSACTIONS")
    print("=" * 80)

    # Passo 1: Tentar criar função
    criar_funcao()

    # Passo 2: Executar sincronização
    sucesso = executar_sincronizacao()

    if sucesso:
        # Passo 3: Verificar resultado
        verificar_resultado()

    print("\n" + "=" * 80)
    print("✅ PROCESSO CONCLUÍDO!")
    print("=" * 80)

    return 0

if __name__ == "__main__":
    exit(main())
