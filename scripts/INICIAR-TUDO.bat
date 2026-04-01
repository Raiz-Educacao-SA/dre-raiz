@echo off
echo ================================================
echo   INICIANDO PROJETO COM IA SONNET
echo ================================================
echo.
echo [1/2] Iniciando Servidor Proxy da IA Anthropic...
echo.

cd /d "%~dp0"

:: Inicia o proxy em uma nova janela
start "Proxy Anthropic (Porta 3021)" cmd /k "npm run proxy"

:: Aguarda 3 segundos para o proxy iniciar
timeout /t 3 /nobreak >nul

echo.
echo [2/2] Iniciando Aplicacao React...
echo.

:: Inicia o dev server em uma nova janela
start "Aplicacao React DRE" cmd /k "npm run dev"

echo.
echo ================================================
echo   TUDO PRONTO!
echo ================================================
echo.
echo Aguarde os servidores iniciarem nas novas janelas.
echo.
echo Proxy IA: http://localhost:3021
echo Aplicacao: http://localhost:5173
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
