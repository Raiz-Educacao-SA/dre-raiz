@echo off
chcp 65001 >nul
echo ============================================================
echo   Atualizando Excel de Transactions do Supabase...
echo ============================================================
echo.

cd /d "%~dp0.."
python scripts/gerar_excel_transactions.py

echo.
echo Pressione qualquer tecla para fechar...
pause >nul
