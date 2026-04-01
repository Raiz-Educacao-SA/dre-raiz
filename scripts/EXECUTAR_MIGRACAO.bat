@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════════════════════
echo  🔄 MIGRAÇÃO: Adicionar conta_contabil
echo ═══════════════════════════════════════════════════════════════
echo.

echo 📋 PASSOS DA MIGRAÇÃO:
echo.
echo 1. Executar SQL de migração no Supabase SQL Editor
echo 2. Configurar Google Apps Script
echo 3. Sincronizar dados do Google Sheets
echo 4. Popular conta_contabil nas transactions existentes
echo 5. Validar a migração
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

:MENU
echo Escolha uma opção:
echo.
echo [1] 📄 Abrir guia de migração (README)
echo [2] 📝 Abrir SQL de migração (copiar para Supabase)
echo [3] 🔍 Abrir SQL de validação (verificar resultado)
echo [4] 📊 Abrir queries atualizadas (exemplos)
echo [5] 🔗 Abrir Supabase SQL Editor
echo [6] 📑 Abrir Google Sheets (Conta Cont)
echo [0] ❌ Sair
echo.

set /p opcao="Opção: "

if "%opcao%"=="1" goto GUIA
if "%opcao%"=="2" goto SQL_MIGRATION
if "%opcao%"=="3" goto SQL_VALIDATE
if "%opcao%"=="4" goto SQL_QUERIES
if "%opcao%"=="5" goto SUPABASE
if "%opcao%"=="6" goto SHEETS
if "%opcao%"=="0" goto FIM

echo ❌ Opção inválida!
echo.
goto MENU

:GUIA
echo.
echo 📄 Abrindo guia de migração...
start "" "GUIA_MIGRACAO_CONTA_CONTABIL.md"
timeout /t 2 >nul
goto MENU

:SQL_MIGRATION
echo.
echo 📝 Abrindo SQL de migração...
echo.
echo ⚠️  IMPORTANTE:
echo    1. Copie o conteúdo do arquivo
echo    2. Cole no Supabase SQL Editor
echo    3. Execute o script
echo.
start "" "database\add_conta_contabil_column.sql"
timeout /t 2 >nul
goto MENU

:SQL_VALIDATE
echo.
echo 🔍 Abrindo SQL de validação...
echo.
echo ℹ️  Execute este script APÓS a migração para verificar se tudo funcionou.
echo.
start "" "database\validate_conta_contabil.sql"
timeout /t 2 >nul
goto MENU

:SQL_QUERIES
echo.
echo 📊 Abrindo queries atualizadas...
start "" "database\queries_conta_contabil_v2.sql"
timeout /t 2 >nul
goto MENU

:SUPABASE
echo.
echo 🔗 Abrindo Supabase SQL Editor...
echo.
echo ℹ️  Cole e execute o SQL de migração aqui.
echo.
start "" "https://supabase.com/dashboard/project/_/sql/new"
timeout /t 2 >nul
goto MENU

:SHEETS
echo.
echo 📑 Abrindo Google Sheets (Conta Cont)...
start "" "https://docs.google.com/spreadsheets/d/1j2diM2PR4VUocjY0LJho3rE37fNOrMSoICulPSRhh58/edit?gid=874921918#gid=874921918"
timeout /t 2 >nul
goto MENU

:FIM
echo.
echo ✅ Migração em andamento!
echo.
echo 📚 Documentação:
echo    - GUIA_MIGRACAO_CONTA_CONTABIL.md (passo a passo)
echo    - database\add_conta_contabil_column.sql (SQL de migração)
echo    - database\validate_conta_contabil.sql (validação)
echo    - database\queries_conta_contabil_v2.sql (exemplos)
echo.
pause
