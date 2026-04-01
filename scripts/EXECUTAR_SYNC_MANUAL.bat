@echo off
chcp 65001 >nul
cls

echo ================================================================
echo SINCRONIZAÇÃO MANUAL - FABRIC → SUPABASE
echo ================================================================
echo.
echo Data/Hora Início: %date% %time%
echo.
echo Configurações:
echo   - BATCH_SIZE: 500 registros
echo   - Timeout Python: 180 segundos
echo   - Timeout PostgreSQL: 180 segundos
echo.
echo ================================================================
echo.

REM Mudar para diretório do projeto
cd /d "C:\Users\edmilson.serafim\OneDrive - Raiz Educação S A\Área de Trabalho\Ap proposta"

REM Verificar se Python está instalado
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO: Python não encontrado!
    echo    Instale Python ou adicione ao PATH do sistema.
    echo.
    pause
    exit /b 1
)

REM Verificar se arquivo existe
if not exist "Sincronizacao_manual_banco.py" (
    echo ❌ ERRO: Arquivo 'Sincronizacao_manual_banco.py' não encontrado!
    echo    Verifique se está no diretório correto.
    echo.
    pause
    exit /b 1
)

echo Iniciando sincronização...
echo ================================================================
echo.

REM Executar sincronização
python Sincronizacao_manual_banco.py

REM Capturar resultado
set SYNC_RESULT=%ERRORLEVEL%

echo.
echo ================================================================
if %SYNC_RESULT% EQU 0 (
    echo ✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!
    echo    Data/Hora Fim: %date% %time%
) else (
    echo ❌ SINCRONIZAÇÃO FALHOU!
    echo    Código de erro: %SYNC_RESULT%
    echo    Data/Hora Fim: %date% %time%
    echo.
    echo    Verifique os logs acima para mais detalhes.
)
echo ================================================================
echo.
echo Pressione qualquer tecla para fechar...
pause >nul

exit /b %SYNC_RESULT%
