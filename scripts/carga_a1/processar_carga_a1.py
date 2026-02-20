#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
processar_carga_a1.py
=====================
Carrega a aba "CARGA" do arquivo Excel CARGA A-1.xlsx para a tabela
transactions_ano_anterior no Supabase.

Fluxo:
  1. Le aba "CARGA" do Excel
  2. Filtra: apenas 2025 + tipos 01-05 (exclui CAPEX, ADIANTAMENTO, etc.)
  3. Mapeia colunas para o schema do Supabase
  4. Exibe resumo e pede confirmacao
  5. Deleta todos os registros com scenario='A-1'
  6. Insere os novos registros em batches de 500 com barra de progresso
"""

import sys
import os
import uuid
import json
import time
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
    print("  [ERRO] pandas nao encontrado. Execute: pip install pandas openpyxl requests numpy")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURACOES
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
# VISUAL — barra de progresso e utilitarios de UI
# ══════════════════════════════════════════════════════════════════════════════

BAR_WIDTH = 40

def progress_bar(current, total, prefix="", suffix="", bar_char="█", empty_char="░"):
    """Renderiza barra de progresso no terminal (sobrescreve a linha)."""
    pct = current / total if total > 0 else 1.0
    filled = int(BAR_WIDTH * pct)
    bar = bar_char * filled + empty_char * (BAR_WIDTH - filled)
    pct_str = f"{pct * 100:5.1f}%"
    print(f"\r  {prefix} [{bar}] {pct_str}  {suffix}          ", end="", flush=True)

def print_header(title):
    line = "=" * 65
    print()
    print(line)
    print(f"  {title}")
    print(line)
    print()

def print_step(n, total, msg):
    print(f"  [{n}/{total}] {msg}")

def print_ok(msg):
    print(f"        OK  {msg}")

def print_warn(msg):
    print(f"      AVISO {msg}")

def print_err(msg):
    print(f"      ERRO  {msg}")

def print_separator():
    print("  " + "-" * 63)

# ══════════════════════════════════════════════════════════════════════════════
# UTILITARIOS
# ══════════════════════════════════════════════════════════════════════════════

def safe_str(val, max_len=500):
    if val is None:
        return None
    s = str(val).strip()
    if s in ("", "nan", "None", "NaN"):
        return None
    return s[:max_len]

def safe_str_nn(val, max_len=500):
    """Igual a safe_str mas garante string vazia ao inves de None (NOT NULL)."""
    r = safe_str(val, max_len)
    return r if r is not None else ""

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
    print_header(f"CARGA A-1 SUPABASE  —  Raiz Educacao  ({datetime.now():%d/%m/%Y %H:%M})")

    # ── verificar arquivo ──────────────────────────────────────────────────
    if not os.path.exists(EXCEL_PATH):
        print_err(f"Arquivo nao encontrado:")
        print(f"          {EXCEL_PATH}")
        print()
        sys.exit(1)

    print_step(1, 5, f"Lendo aba '{SHEET_NAME}' do Excel...")
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME)
    print_ok(f"{len(df):,} linhas carregadas")

    # ── validar coluna date ────────────────────────────────────────────────
    if "date" not in df.columns:
        print_err("Coluna 'date' nao encontrada na aba CARGA!")
        print("         Adicione a coluna 'date' no formato YYYY-MM-DD e tente novamente.")
        sys.exit(1)

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    nulos_date = df["date"].isna().sum()
    if nulos_date > 0:
        print_warn(f"{nulos_date} linhas com date invalida serao ignoradas.")

    # ── filtrar ───────────────────────────────────────────────────────────
    print()
    print_step(2, 5, f"Aplicando filtros  (ano={ANO_A1}  |  tipos 01-05)...")

    antes = len(df)
    df = df[df["date"].dt.year == ANO_A1]
    print_ok(f"Apos filtro de ano:               {len(df):>8,}  (removidos: {antes - len(df):,})")

    antes = len(df)
    df = df[df["type"].astype(str).str[:3].isin([t[:3] for t in TIPOS_VALIDOS])]
    print_ok(f"Apos filtro de tipo (01-05):       {len(df):>8,}  (removidos: {antes - len(df):,})")

    antes = len(df)
    df = df[df["amount"].notna() & (df["amount"] != 0)]
    print_ok(f"Apos excluir amount 0/nulo:        {len(df):>8,}  (removidos: {antes - len(df):,})")

    # ── mapear ────────────────────────────────────────────────────────────
    print()
    print_step(3, 5, "Mapeando campos para o schema do Supabase...")
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
            # Campos NOT NULL no DB — garante "" ao inves de None
            "description":   safe_str_nn(row.get("description"), 500),
            "conta_contabil":safe_str_nn(row.get("conta_contabil"), 100),
            "category":      safe_str_nn(row.get("category"), 200),   # NOT NULL no DB
            # Campos opcionais (podem ser None)
            "marca":         safe_str(row.get("marca"), 50),
            "filial":        safe_str_nn(row.get("FILIAL"), 50),
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

    print_ok(f"Registros mapeados:                {len(records):>8,}")
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
    print()
    print_step(4, 5, "Limpando transactions_ano_anterior (scenario=A-1)...")
    url  = SUPABASE_URL + "/rest/v1/transactions_ano_anterior?scenario=eq.A-1"
    resp = requests.delete(url, headers=HEADERS, timeout=60)
    if resp.status_code in (200, 204):
        print_ok("Tabela limpa com sucesso!")
    else:
        print_err(f"HTTP {resp.status_code} ao deletar:")
        print(f"         {resp.text[:400]}")
        raise RuntimeError("DELETE falhou com HTTP " + str(resp.status_code))


def inserir_records(records):
    total   = len(records)
    batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    url     = SUPABASE_URL + "/rest/v1/transactions_ano_anterior"

    print()
    print_step(5, 5, f"Inserindo {total:,} registros em {batches} batches de {BATCH_SIZE}...")
    print()

    erros       = 0
    erros_detalhe = []
    t_inicio    = time.time()

    for i in range(0, total, BATCH_SIZE):
        batch     = records[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        payload   = json.dumps([clean_record(r) for r in batch], ensure_ascii=False)

        resp = requests.post(url, headers=HEADERS, data=payload.encode("utf-8"), timeout=120)

        if resp.status_code in (200, 201):
            # Calcula ETA
            elapsed = time.time() - t_inicio
            rate    = batch_num / elapsed if elapsed > 0 else 1
            eta_s   = int((batches - batch_num) / rate) if rate > 0 else 0
            eta_str = f"ETA {eta_s // 60:02d}:{eta_s % 60:02d}" if eta_s > 0 else "quase la!"
            done    = i + len(batch)
            progress_bar(done, total, prefix="Progresso:", suffix=f"{done:,}/{total:,}  {eta_str}")
        else:
            erros += 1
            msg = f"Batch {batch_num}: HTTP {resp.status_code} — {resp.text[:200]}"
            erros_detalhe.append(msg)
            progress_bar(i + len(batch), total,
                         prefix="Progresso:",
                         suffix=f"[{erros} ERRO(S)]",
                         bar_char="X", empty_char=".")
            if erros >= 3:
                print()
                print()
                print_err("3 erros consecutivos — carga abortada.")
                for d in erros_detalhe:
                    print(f"         {d}")
                raise RuntimeError("Carga abortada por excesso de erros.")

    # Linha final da barra
    print()
    print()

    elapsed = time.time() - t_inicio
    mins, secs = divmod(int(elapsed), 60)

    if erros:
        print_warn(f"Carga concluida com {erros} batch(es) com erro ({mins:02d}:{secs:02d}).")
        for d in erros_detalhe:
            print(f"  {d}")
    else:
        print_header(
            f"CARGA A-1 CONCLUIDA COM SUCESSO!  ({mins:02d}m {secs:02d}s)\n"
            f"  {total:,} registros  |  Periodo: Jan-Dez/{ANO_A1}\n"
            f"  Cenario: A-1  |  Tabela: transactions_ano_anterior"
        )

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    records = carregar_planilha()

    if not records:
        print()
        print_err("Nenhum registro processado. Verifique o arquivo.")
        sys.exit(1)

    # ── resumo por tipo ────────────────────────────────────────────────────
    contagem = {}
    for r in records:
        contagem[r["type"]] = contagem.get(r["type"], 0) + 1

    print()
    print_separator()
    print("    RESUMO DO QUE SERA CARREGADO:")
    print_separator()
    for tipo, qtd in sorted(contagem.items()):
        barra = int(qtd / max(contagem.values()) * 20)
        bar   = "#" * barra + "." * (20 - barra)
        print(f"    {str(tipo)[:35]:<35}  [{ bar }]  {qtd:>8,}")
    print_separator()
    print(f"    {'TOTAL':<35}  {'':22}  {len(records):>8,}")
    print_separator()

    print()
    print("    ATENCAO: Esta operacao ira:")
    print("      1. DELETAR todos os registros A-1 no Supabase")
    print(f"      2. INSERIR {len(records):,} novos registros de {ANO_A1}")
    print()

    resposta = input("    Confirma? Digite 's' para continuar: ").strip().lower()
    if resposta != "s":
        print()
        print("    Operacao cancelada.")
        sys.exit(0)

    deletar_a1()
    inserir_records(records)


if __name__ == "__main__":
    main()
