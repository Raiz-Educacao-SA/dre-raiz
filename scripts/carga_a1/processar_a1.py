#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
processar_a1.py
===============
Lê a Planilha1 do arquivo Excel de máscara A-1, filtra os dados
de 2025 (CORTE DRE = SIM), transforma e carrega no Supabase.

Fluxo:
  1. Lê Planilha1 do Excel
  2. Filtra: ANO=2025 + CORTE DRE='SIM' + exclui linhas EBITDA calculadas
  3. Mapeia campos para o schema do Supabase (tabela transactions)
  4. Pede confirmação do usuário
  5. Deleta todos os registros com scenario='A-1' no Supabase
  6. Insere os novos registros em batches de 500
"""

import sys
import os
import uuid

# Forcar UTF-8 no terminal Windows para evitar UnicodeEncodeError
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
import json
import requests
import numpy as np
from datetime import datetime, timezone

# ─── tenta importar pandas ────────────────────────────────────────────────────
try:
    import pandas as pd
except ImportError:
    print("❌ pandas não encontrado. Execute: pip install pandas openpyxl requests numpy")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURAÇÕES — edite se necessário
# ══════════════════════════════════════════════════════════════════════════════

EXCEL_PATH = r"C:\Users\edmilson.serafim\OneDrive\IA\mascara para carregar A-1 SUPABASE.xlsx"
SHEET_NAME = "Planilha1"
ANO_A1     = 2025          # ano dos dados A-1

SUPABASE_URL      = "https://vafmufhlompwsdrlhkfz.supabase.co"
SUPABASE_API_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6"
    "InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ"
    ".m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA"
)
# ⚠️  Se a chave acima der erro de permissão, substitua pela service_role key
# que fica em: Supabase → Settings → API → service_role

BATCH_SIZE = 500  # registros por request de INSERT

# ══════════════════════════════════════════════════════════════════════════════
# MAPEAMENTOS — usam prefixo/contains para resistir a variações de encoding
# (ex: "VARI\xc3\x81VEIS" vs "VARIÁVEIS" vs "VARIAVEIS")
# ══════════════════════════════════════════════════════════════════════════════

def get_type_from_tag0(tag0: str) -> str | None:
    """
    Mapeia TAG0 → type do Supabase usando startswith numérico,
    ignorando diferenças de acentuação.
      01. → REVENUE
      02. → VARIABLE_COST
      03. → FIXED_COST
      04. → SGA
      05. → excluir (EBITDA calculado)
      06. → RATEIO
      09. → excluir (EBITDA calculado)
    """
    t = str(tag0).strip()
    if t.startswith("01."):  return "REVENUE"
    if t.startswith("02."):  return "VARIABLE_COST"
    if t.startswith("03."):  return "FIXED_COST"
    if t.startswith("04."):  return "SGA"
    if t.startswith("05."):  return "RATEIO"
    return None   # None = linha calculada ou desconhecida → ignorar


def should_exclude_tag0(tag0: str) -> bool:
    """Retorna True para linhas EBITDA calculadas que não devem ser carregadas."""
    t = str(tag0).strip()
    return t.startswith("05.") or t.startswith("09.")


def get_status(original_raw: str) -> str:
    """
    Mapeia ORIGINAL? → status do Supabase.
    Usa 'in' para resistir a variações de encoding e capitalização.
    """
    o = str(original_raw).upper().strip()
    if "AJUST" in o or "RECLASS" in o:
        return "Ajustado"
    return "Normal"   # ORIGINAL, PLANEJADO, PROVISÃO, SIM, etc.


def get_recurring(rec_raw: str) -> str:
    """Mapeia RECORRENTE? → recurring do Supabase."""
    r = str(rec_raw).upper().strip()
    if r == "SIM":
        return "Sim"
    return "Não"   # NAO, NAO CONSIDERAR, etc.

# ══════════════════════════════════════════════════════════════════════════════
# UTILITÁRIOS
# ══════════════════════════════════════════════════════════════════════════════

def anomes_to_date(anomes) -> str | None:
    """Converte 202501 → '2025-01-01'."""
    try:
        s = str(int(anomes))
        if len(s) == 6:
            return f"{s[:4]}-{s[4:6]}-01"
    except Exception:
        pass
    return None


def safe_str(val, max_len: int = 500) -> str | None:
    """Converte valor para str limpo; None se vazio/nan."""
    if val is None:
        return None
    s = str(val).strip()
    if s in ("", "nan", "None", "NaN", "0"):
        return None
    return s[:max_len]


def safe_str_mandatory(val, default: str = "", max_len: int = 500) -> str:
    """Igual a safe_str mas retorna string vazia ao invés de None."""
    r = safe_str(val, max_len)
    return r if r is not None else default


def safe_float(val) -> float | None:
    """Converte para float; None se inválido."""
    try:
        f = float(val)
        if np.isnan(f):
            return None
        return f
    except Exception:
        return None


def clean_record(rec: dict) -> dict:
    """Remove NaN/None mantendo valores intencionalmente None."""
    return {
        k: (None if (v is None or (isinstance(v, float) and np.isnan(v))) else v)
        for k, v in rec.items()
    }


# ══════════════════════════════════════════════════════════════════════════════
# ETAPA 1 — LER E FILTRAR PLANILHA1
# ══════════════════════════════════════════════════════════════════════════════

def carregar_planilha() -> list[dict]:
    print("=" * 65)
    print(f"  CARGA A-1 SUPABASE — Raiz Educação  ({datetime.now():%d/%m/%Y %H:%M})")
    print("=" * 65)

    # ── verificar arquivo ──────────────────────────────────────────────────
    if not os.path.exists(EXCEL_PATH):
        print(f"\n❌ Arquivo não encontrado:\n   {EXCEL_PATH}")
        print("   Verifique o caminho e tente novamente.")
        sys.exit(1)

    print(f"\n[1/5] Lendo {SHEET_NAME} do Excel...")
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME)
    print(f"      Total de linhas: {len(df):,}")

    # ── filtrar ───────────────────────────────────────────────────────────
    print(f"\n[2/5] Aplicando filtros (ANO={ANO_A1} + CORTE DRE=SIM)...")

    df = df[
        (df["ANO"]      == ANO_A1) &
        (df["CORTE DRE"] == "SIM")
    ]
    print(f"      Após filtro de ano e CORTE DRE: {len(df):,} linhas")

    df = df[~df["TAG0"].apply(should_exclude_tag0)]
    print(f"      Após excluir linhas EBITDA calculadas: {len(df):,} linhas")

    df = df[df["VALOR REALIZADO"] != 0]
    df = df[df["VALOR REALIZADO"].notna()]
    print(f"      Após excluir VALOR REALIZADO = 0 / nulo: {len(df):,} linhas")

    # ── mapear ─────────────────────────────────────────────────────────────
    print(f"\n[3/5] Mapeando campos para o schema do Supabase...")

    records    = []
    ignorados  = 0
    ts_now     = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for _, row in df.iterrows():
        tag0 = safe_str_mandatory(row.get("TAG0"), "")

        # ── type (obrigatório) ────────────────────────────────────────────
        tipo = get_type_from_tag0(tag0)
        if not tipo:
            ignorados += 1
            continue

        # ── date (obrigatório) ────────────────────────────────────────────
        date = anomes_to_date(row.get("ANOMES"))
        if not date:
            ignorados += 1
            continue

        # ── chave_id ──────────────────────────────────────────────────────
        chave = safe_str(row.get("CHAVE"))
        chave_id = chave  # None já tratado em safe_str (chave='0' → None)

        # ── status ────────────────────────────────────────────────────────
        original_raw = safe_str_mandatory(row.get("ORIGINAL?"), "ORIGINAL")
        status = get_status(original_raw)

        # ── recurring ─────────────────────────────────────────────────────
        rec_raw   = safe_str_mandatory(row.get("RECORRENTE?"), "NAO")
        recurring = get_recurring(rec_raw)

        # ── filial (obrigatório no schema) ────────────────────────────────
        filial = safe_str_mandatory(row.get("FILIAL"), "")

        record = {
            "id":            str(uuid.uuid4()),
            "date":          date,
            "description":   safe_str_mandatory(row.get("COMPLEMENTO"), ""),
            # conta_contabil é NOT NULL na tabela — usa '' como fallback
            "conta_contabil":safe_str_mandatory(row.get("CONTA"), ""),
            "category":      safe_str_mandatory(row.get("CC"), ""),
            "amount":        safe_float(row.get("VALOR REALIZADO")),
            # type = tag0 completo (ex: "01. RECEITA LIQUIDA") — não o enum
            "type":          tag0,
            "scenario":      "A-1",
            "status":        status,
            "filial":        filial,
            "marca":         safe_str(row.get("CIA")),
            "tag01":         safe_str(row.get("TAG1")),
            "tag02":         safe_str(row.get("TAG2")),
            "tag03":         safe_str(row.get("TAG3")),
            "vendor":        safe_str(row.get("FORNECEDOR_PADRAO")),
            "ticket":        safe_str(row.get("TICKET")),
            "nat_orc":       safe_str(row.get("TAGORC")),
            "recurring":     recurring,
            "chave_id":      chave_id,
            "updated_at":    ts_now,
        }
        records.append(record)

    print(f"      Registros mapeados:  {len(records):,}")
    print(f"      Registros ignorados: {ignorados:,}  (sem type/date mapeável)")

    return records


# ══════════════════════════════════════════════════════════════════════════════
# ETAPA 2 — SUPABASE: DELETE + INSERT
# ══════════════════════════════════════════════════════════════════════════════

HEADERS = {
    "apikey":        SUPABASE_API_KEY,
    "Authorization": f"Bearer {SUPABASE_API_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}


def deletar_a1():
    print(f"\n[4/5] Limpando tabela transactions_ano_anterior no Supabase...")
    url  = f"{SUPABASE_URL}/rest/v1/transactions_ano_anterior?scenario=eq.A-1"
    resp = requests.delete(url, headers=HEADERS, timeout=60)

    if resp.status_code in (200, 204):
        print("      ✅ Tabela transactions_ano_anterior limpa com sucesso!")
    else:
        print(f"      ❌ Erro ao deletar: HTTP {resp.status_code}")
        print(f"         Resposta: {resp.text[:400]}")
        raise RuntimeError(f"DELETE falhou com HTTP {resp.status_code}")


def inserir_records(records: list[dict]):
    total   = len(records)
    batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    url     = f"{SUPABASE_URL}/rest/v1/transactions_ano_anterior"

    print(f"\n[5/5] Inserindo {total:,} registros em {batches} batches de {BATCH_SIZE}...")

    erros = 0
    for i in range(0, total, BATCH_SIZE):
        batch     = records[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        payload   = json.dumps([clean_record(r) for r in batch], ensure_ascii=False)

        resp = requests.post(url, headers=HEADERS, data=payload.encode("utf-8"), timeout=120)

        if resp.status_code in (200, 201):
            pct = batch_num * 100 // batches
            print(f"      [{pct:3d}%] Batch {batch_num:>4}/{batches} — {len(batch):,} registros ✅")
        else:
            erros += 1
            print(f"      ❌ Batch {batch_num} falhou: HTTP {resp.status_code}")
            print(f"         {resp.text[:300]}")
            if erros >= 3:
                raise RuntimeError("Muitos erros consecutivos. Carga abortada.")

    if erros:
        print(f"\n⚠️  Carga concluída com {erros} batch(es) com erro.")
    else:
        print(f"\n{'=' * 65}")
        print(f"  ✅ CARGA A-1 CONCLUÍDA COM SUCESSO!")
        print(f"     {total:,} registros carregados | Período: Jan–Dez/{ANO_A1}")
        print(f"     Cenário: A-1 | Tabela: transactions_ano_anterior")
        print(f"{'=' * 65}")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    records = carregar_planilha()

    if not records:
        print("\n❌ Nenhum registro processado. Verifique o arquivo e os filtros.")
        sys.exit(1)

    # ── resumo por tipo ────────────────────────────────────────────────────
    contagem = {}
    for r in records:
        contagem[r["type"]] = contagem.get(r["type"], 0) + 1

    print(f"\n{'─' * 65}")
    print(f"  RESUMO DO QUE SERÁ CARREGADO:")
    print(f"{'─' * 65}")
    for tipo, qtd in sorted(contagem.items()):
        print(f"    {tipo:<20} {qtd:>8,} registros")
    print(f"{'─' * 65}")
    print(f"    {'TOTAL':<20} {len(records):>8,} registros")
    print(f"{'─' * 65}")
    print(f"\n  ⚠️  ATENÇÃO: Esta operação irá:")
    print(f"      1. DELETAR todos os registros com scenario='A-1' no Supabase")
    print(f"      2. INSERIR {len(records):,} novos registros de {ANO_A1}")

    resposta = input("\n  Confirma? Digite 's' para continuar: ").strip().lower()
    if resposta != "s":
        print("\n  Operação cancelada pelo usuário.")
        sys.exit(0)

    deletar_a1()
    inserir_records(records)


if __name__ == "__main__":
    main()
