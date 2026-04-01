@echo off
chcp 65001 >nul
echo ================================================================
echo   LIMPEZA DE ARQUIVOS GRANDES - PROJETO AP PROPOSTA
echo ================================================================
echo.
echo Este script irá deletar arquivos temporários e de log que
echo ocupam ~156 MB de espaço no projeto.
echo.
echo Arquivos que serão deletados:
echo   - registros_com_erro_20260204_083748.json (122 MB)
echo   - registros_com_erro_20260204_083748.xlsx (17 MB)
echo   - validacao_100_linhas_*.xlsx (arquivos de teste)
echo   - erros_sincronizacao_*.json (logs de erro)
echo   - relatorio_erro_*.txt (relatórios de erro)
echo.
echo ================================================================
echo.

set /p confirma="Deseja continuar? (S/N): "
if /i not "%confirma%"=="S" (
    echo.
    echo Operação cancelada pelo usuário.
    pause
    exit /b
)

echo.
echo ================================================================
echo Iniciando limpeza...
echo ================================================================
echo.

:: Criar pasta de backup (caso queira recuperar depois)
if not exist "backup_arquivos_deletados" mkdir backup_arquivos_deletados
echo ✓ Pasta de backup criada: backup_arquivos_deletados
echo.

:: Mover arquivos para backup antes de deletar (segurança)
echo [1/5] Movendo registros_com_erro_20260204_083748.json...
if exist "registros_com_erro_20260204_083748.json" (
    move "registros_com_erro_20260204_083748.json" "backup_arquivos_deletados\" >nul 2>&1
    echo   ✓ Movido (122 MB)
) else (
    echo   - Arquivo não encontrado
)

echo [2/5] Movendo registros_com_erro_20260204_083748.xlsx...
if exist "registros_com_erro_20260204_083748.xlsx" (
    move "registros_com_erro_20260204_083748.xlsx" "backup_arquivos_deletados\" >nul 2>&1
    echo   ✓ Movido (17 MB)
) else (
    echo   - Arquivo não encontrado
)

echo [3/5] Movendo arquivos de validação (*.xlsx)...
for %%f in (validacao_*.xlsx) do (
    if exist "%%f" (
        move "%%f" "backup_arquivos_deletados\" >nul 2>&1
        echo   ✓ Movido: %%f
    )
)

echo [4/5] Movendo logs de erro de sincronização (*.json)...
for %%f in (erros_sincronizacao_*.json) do (
    if exist "%%f" (
        move "%%f" "backup_arquivos_deletados\" >nul 2>&1
        echo   ✓ Movido: %%f
    )
)

echo [5/5] Movendo relatórios de erro (*.txt)...
for %%f in (relatorio_erro_*.txt) do (
    if exist "%%f" (
        move "%%f" "backup_arquivos_deletados\" >nul 2>&1
        echo   ✓ Movido: %%f
    )
)

echo.
echo ================================================================
echo Calculando economia de espaço...
echo ================================================================
echo.

:: Calcular tamanho da pasta de backup
for /f "tokens=3" %%a in ('dir "backup_arquivos_deletados" ^| find "bytes"') do set tamanho=%%a
echo Tamanho total dos arquivos movidos: %tamanho% bytes
echo Isso equivale a aproximadamente 156 MB liberados do projeto.
echo.

echo ================================================================
echo LIMPEZA CONCLUÍDA!
echo ================================================================
echo.
echo Os arquivos foram movidos para: backup_arquivos_deletados\
echo.
echo Se você tiver certeza que não precisa mais deles, pode deletar
echo a pasta "backup_arquivos_deletados" manualmente.
echo.
echo PRÓXIMO PASSO:
echo 1. Execute o diagnóstico do banco: diagnostico_banco_completo.sql
echo 2. Analise os resultados
echo 3. Execute a limpeza do banco conforme recomendações
echo.
pause
