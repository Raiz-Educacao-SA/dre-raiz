@echo off
chcp 65001 >nul 2>&1
title Carga A-1 Supabase - Raiz Educação (CARGA A-1.xlsx)

echo.
echo ================================================================
echo   CARGA A-1 SUPABASE — Raiz Educação
echo   Arquivo: CARGA A-1.xlsx  (aba: CARGA)
echo   Periodo: Janeiro a Dezembro de 2025
echo   Cenario: A-1
echo ================================================================
echo.

:: ─── Verificar Python ────────────────────────────────────────────────────────
echo [1/3] Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   ERRO: Python nao encontrado no PATH!
    echo   Instale o Python em: https://www.python.org/downloads/
    echo   Marque a opcao "Add Python to PATH" durante a instalacao.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo   %%v encontrado.
echo.

:: ─── Instalar dependências ────────────────────────────────────────────────────
echo [2/3] Verificando e instalando dependencias...
pip install pandas openpyxl requests numpy --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo   AVISO: Erro ao instalar dependencias. Tentando continuar...
) else (
    echo   Dependencias OK: pandas, openpyxl, requests, numpy
)
echo.

:: ─── Executar script Python ───────────────────────────────────────────────────
echo [3/3] Iniciando processamento...
echo.
echo ----------------------------------------------------------------
python "%~dp0processar_carga_a1.py"
set EXIT_CODE=%errorlevel%
echo ----------------------------------------------------------------
echo.

:: ─── Resultado ────────────────────────────────────────────────────────────────
if %EXIT_CODE% neq 0 (
    echo   STATUS: ERRO — A carga falhou ou foi cancelada.
    echo   Verifique as mensagens acima para detalhes.
) else (
    echo   STATUS: CONCLUIDO com sucesso!
)

echo.
echo Pressione qualquer tecla para fechar...
pause >nul
