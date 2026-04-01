@echo off
echo ==========================================
echo Instalando dependencias Python
echo ==========================================
echo.

pip install pandas pyodbc azure-identity supabase python-dotenv

echo.
echo ==========================================
echo Instalacao concluida!
echo ==========================================
echo.
echo Proximos passos:
echo 1. Configure suas credenciais do Supabase no arquivo fabric_to_supabase.py
echo 2. Teste as conexoes: python test_connections.py
echo 3. Execute o pipeline: python fabric_to_supabase.py
echo.
pause
