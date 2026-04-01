@echo off
echo ========================================
echo DRE RAIZ - Iniciar com IA Real
echo ========================================
echo.
echo Iniciando Backend (porta 3002)...
echo Iniciando Frontend (porta 3000)...
echo.
echo Aguarde ate ver as mensagens:
echo - Backend: "Servidor rodando: http://localhost:3002"
echo - Frontend: "Local: http://localhost:3000"
echo.
echo Depois acesse: http://localhost:3000
echo.
echo ========================================
echo.

start "Backend (IA)" cmd /k "npm run backend"
timeout /t 3 /nobreak >nul
start "Frontend (Vite)" cmd /k "npm run dev"

echo.
echo ✅ Servidores iniciados!
echo    Backend: http://localhost:3002
echo    Frontend: http://localhost:3000
echo.
echo Pressione qualquer tecla para sair (nao fechara os servidores)
pause >nul
