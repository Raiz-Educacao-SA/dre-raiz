@echo off
echo ================================================
echo   INICIANDO SERVIDOR NA PORTA 3000
echo ================================================
echo.

cd /d "%~dp0"

echo [1/2] Finalizando processos Node.js existentes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/2] Liberando porta 3000 e iniciando servidor...
call npx kill-port 3000
timeout /t 1 /nobreak >nul

echo.
echo Iniciando aplicacao na porta 3000...
npm run dev

pause
