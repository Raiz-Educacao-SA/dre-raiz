#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
processar_carga_a1.py
=====================
Carrega a aba "CARGA" do arquivo Excel CARGA A-1.xlsx para a tabela
transactions_ano_anterior no Supabase.

Fluxo:
  1. Lê aba "CARGA" do Excel
  2. Filtra: apenas 2025 + tipos 01.–05. (exclui CAPEX, ADIANTAMENTO, etc.)
  3. Mapeia colunas para o schema do Supabase
  4. Exibe resumo e pede confirmação
  5. Deleta todos os registros com scenario='A-1'
  6. Insere os novos registros em batches de 500
"""

import sys
import os
import uuid
import json
import requests
import numpy as np
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    import pandas as pd
except ImportError:
    print("pandas nao encontrado. Execute: pip install pandas openpyxl requests numpy")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURAÇÕES
# ══════════════════════════════════════════════════════════════════════════════

EXCEL_PATH  = r"C:\Users\edmilson.serafim\OneDrive\IA\CARGA A-1.xlsx"
SHEET_NAME  = "CARGA"
ANO_A1      = 2025

SUPABASE_URL     = "https://vafmufhlompwsdrlhkfz.supabase.co"
SUPABASE_API_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6"
    "ImFub24iLCJpYXQiOjE3Njk0MzIyOTEsImV4cCI6MjA4NTAwODI5MX0"
    ".clOvf8kNdpIUiqhAf2oAs6ETaNaoC93TWLrvGucm_I4"
)

BATCH_SIZE = 500

# Prefixos de tipo (tag0) que devem ser carregados na DRE
TIPOS_VALIDOS = ("01.", "02.", "03.", "04.", "05.")

# ══════════════════════════════════════════════════════════════════════════════
# UTILITÁRIOS
# ══════════════════════════════════════════════════════════════════════════════

def safe_str(val, max_len=500):
    if val is None:
        return None
    s = str(val).strip()
    if s in ("", "nan", "None", "NaN"):
        return None
    return s[:max_len]

def safe_float(val):
    try:
        f = float(val)
        return None if np.isnan(f) else f
    except Exception:
        return None

def map_status(val):
    s = str(val).upper().strip()
    if "AJUST" in s or "RECLASS" in s:
        return "Ajustado"
    return "Normal"

def map_recurring(val):
    return "Sim" if str(val).upper().strip() == "SIM" else "Nao"

def clean_record(rec):
    return {
        k: (None if (v is None or (isinstance(v, float) and np.isnan(v))) else v)
        for k, v in rec.items()
    }

# ══════════════════════════════════════════════════════════════════════════════
# ETAPA 1 — LER E VALIDAR
# ══════════════════════════════════════════════════════════════════════════════

def carregar_planilha():
    print("=" * 65)
    print("  CARGA A-1 SUPABASE -- Raiz Educacao  (" + datetime.now().strftime("%d/%m/%Y %H:%M") + ")")
    print("=" * 65)

    if not os.path.exists(EXCEL_PATH):
        print("\nERRO: Arquivo nao encontrado:\n   " + EXCEL_PATH)
        sys.exit(1)

    print("\n[1/5] Lendo aba '" + SHEET_NAME + "' do Excel...")
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME)
    print("      Total de linhas: " + f"{len(df):,}")

    # ── validar coluna date ────────────────────────────────────────────────
    if "date" not in df.columns:
        print("\nERRO: Coluna 'date' nao encontrada na aba CARGA!")
        sys.exit(1)

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    nulos_date = df["date"].isna().sum()
    if nulos_date > 0:
        print("  AVISO: " + str(nulos_date) + " linhas com date invalida serao ignoradas.")

    # ── filtrar ────────────────────────────────────────────────────────────
    print("\n[2/5] Aplicando filtros (ano=" + str(ANO_A1) + " + tipos 01-05)...")

    df = df[df["date"].dt.year == ANO_A1]
    print("      Apos filtro de ano: " + f"{len(df):,}" + " linhas")

    df = df[df["type"].astype(str).str[:3].isin([t[:3] for t in TIPOS_VALIDOS])]
    print("      Apos filtro de tipo (01-05): " + f"{len(df):,}" + " linhas")

    df = df[df["amount"].notna() & (df["amount"] != 0)]
    print("      Apos excluir amount 0/nulo: " + f"{len(df):,}" + " linhas")

    # ── mapear ─────────────────────────────────────────────────────────────
    print("\n[3/5] Mapeando campos para o schema do Supabase...")
    ts_now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    records = []
    for _, row in df.iterrows():
        date_str = row["date"].strftime("%Y-%m-%d")

        record = {
            "id":            str(uuid.uuid4()),
            "date":          date_str,
            "amount":        safe_float(row.get("amount")),
            "type":          safe_str(row.get("type"), 200),
            "scenario":      "A-1",
            "description":   safe_str(row.get("description"), 500),
            "conta_contabil":safe_str(row.get("conta_contabil"), 100) or "",
            "marca":         safe_str(row.get("marca"), 50),
            "filial":        safe_str(row.get("FILIAL"), 50) or "",
            "nome_filial":   safe_str(row.get("Nome_Filial"), 100),
            "tag01":         safe_str(row.get("Tag1"), 200),
            "tag02":         safe_str(row.get("Tag2"), 200),
            "tag03":         safe_str(row.get("Tag3"), 200),
            "vendor":        safe_str(row.get("vender"), 500),
            "ticket":        safe_str(row.get("TICKET"), 100),
            "chave_id":      safe_str(row.get("chave_id"), 100),
            "status":        map_status(row.get("status", "")),
            "recurring":     map_recurring(row.get("recurring", "")),
            "updated_at":    ts_now,
        }
        records.append(record)

    print("      Registros mapeados: " + f"{len(records):,}")
    return records

# ══════════════════════════════════════════════════════════════════════════════
# ETAPA 2 — SUPABASE
# ══════════════════════════════════════════════════════════════════════════════

HEADERS = {
    "apikey":        SUPABASE_API_KEY,
    "Authorization": "Bearer " + SUPABASE_API_KEY,
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}

def deletar_a1():
    print("\n[4/5] Limpando transactions_ano_anterior (scenario=A-1)...")
    url  = SUPABASE_URL + "/rest/v1/transactions_ano_anterior?scenario=eq.A-1"
    resp = requests.delete(url, headers=HEADERS, timeout=60)
    if resp.status_code in (200, 204):
        print("      Tabela limpa com sucesso!")
    else:
        print("      ERRO ao deletar: HTTP " + str(resp.status_code))
        print("      " + resp.text[:400])
        raise RuntimeError("DELETE falhou com HTTP " + str(resp.status_code))

def inserir_records(records):
    total   = len(records)
    batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    url     = SUPABASE_URL + "/rest/v1/transactions_ano_anterior"

    print("\n[5/5] Inserindo " + f"{total:,}" + " registros em " + str(batches) + " batches...")

    erros = 0
    for i in range(0, total, BATCH_SIZE):
        batch     = records[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        payload   = json.dumps([clean_record(r) for r in batch], ensure_ascii=False)
        resp      = requests.post(url, headers=HEADERS, data=payload.encode("utf-8"), timeout=120)

        if resp.status_code in (200, 201):
            pct = batch_num * 100 // batches
            print("      [" + str(pct).rjust(3) + "%] Batch " + str(batch_num).rjust(4) + "/" + str(batches) + " -- " + str(len(batch)) + " registros OK")
        else:
            erros += 1
            print("      ERRO Batch " + str(batch_num) + ": HTTP " + str(resp.status_code))
            print("      " + resp.text[:300])
            if erros >= 3:
                raise RuntimeError("Muitos erros. Carga abortada.")

    if erros:
        print("\nCarga concluida com " + str(erros) + " batch(es) com erro.")
    else:
        print("\n" + "=" * 65)
        print("  CARGA A-1 CONCLUIDA COM SUCESSO!")
        print("  " + f"{total:,}" + " registros | Periodo: Jan-Dez/" + str(ANO_A1))
        print("  Cenario: A-1 | Tabela: transactions_ano_anterior")
        print("=" * 65)

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    records = carregar_planilha()

    if not records:
        print("\nNenhum registro processado. Verifique o arquivo.")
        sys.exit(1)

    # resumo por tipo
    contagem = {}
    for r in records:
        contagem[r["type"]] = contagem.get(r["type"], 0) + 1

    print("\n" + "-" * 65)
    print("  RESUMO DO QUE SERA CARREGADO:")
    print("-" * 65)
    for tipo, qtd in sorted(contagem.items()):
        print("  " + str(tipo).ljust(40) + str(qtd).rjust(8) + " registros")
    print("-" * 65)
    print("  " + "TOTAL".ljust(40) + str(len(records)).rjust(8) + " registros")
    print("-" * 65)

    print("\n  ATENCAO: Esta operacao ira:")
    print("    1. DELETAR todos os registros A-1 no Supabase")
    print("    2. INSERIR " + f"{len(records):,}" + " novos registros de " + str(ANO_A1))

    resposta = input("\n  Confirma? Digite 's' para continuar: ").strip().lower()
    if resposta != "s":
        print("\n  Operacao cancelada.")
        sys.exit(0)

    deletar_a1()
    inserir_records(records)


if __name__ == "__main__":
    main()
