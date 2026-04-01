@echo off
:: Script de Duplicação Rápida - DRE RAIZ
:: Execute este script para criar uma cópia do projeto

echo ========================================
echo   DUPLICACAO DRE RAIZ
echo ========================================
echo.

:: Pedir nome do novo projeto
set /p NOVO_NOME="Digite o nome do novo projeto (ex: DRE_RAIZ_Escola_XYZ): "

if "%NOVO_NOME%"=="" (
    echo Erro: Nome nao pode ser vazio!
    pause
    exit /b 1
)

:: Pedir caminho de destino
set /p DESTINO="Digite o caminho completo de destino (ou deixe em branco para Desktop): "

if "%DESTINO%"=="" (
    set "DESTINO=%USERPROFILE%\Desktop\%NOVO_NOME%"
)

echo.
echo ========================================
echo   CONFIGURACAO
echo ========================================
echo Nome do projeto: %NOVO_NOME%
echo Destino: %DESTINO%
echo.
set /p CONFIRMA="Confirma a duplicacao? (S/N): "

if /i not "%CONFIRMA%"=="S" (
    echo Operacao cancelada.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   COPIANDO ARQUIVOS...
echo ========================================

:: Criar pasta de destino
mkdir "%DESTINO%" 2>nul

:: Copiar arquivos (exceto node_modules e .env)
xcopy /E /I /H /Y /EXCLUDE:duplicar-exclude.txt . "%DESTINO%"

echo.
echo ========================================
echo   ATUALIZANDO PACKAGE.JSON...
echo ========================================

:: Converter nome para lowercase e remover espaços
set "PKG_NAME=%NOVO_NOME: =-"
set "PKG_NAME=%PKG_NAME%"
for %%i in (a b c d e f g h i j k l m n o p q r s t u v w x y z) do call set "PKG_NAME=%%PKG_NAME:%%i=%%i%%"

:: Atualizar package.json
powershell -Command "(Get-Content '%DESTINO%\package.json') -replace '\"name\": \"dre-raiz\"', '\"name\": \"%PKG_NAME%\"' | Set-Content '%DESTINO%\package.json'"

echo.
echo ========================================
echo   CRIANDO ARQUIVO .ENV.EXAMPLE...
echo ========================================

:: Copiar .env.example
copy "%DESTINO%\.env.example" "%DESTINO%\.env" >nul 2>&1

echo.
echo ========================================
echo   DUPLICACAO CONCLUIDA!
echo ========================================
echo.
echo Projeto copiado para: %DESTINO%
echo.
echo PROXIMOS PASSOS:
echo.
echo 1. Abra a pasta: %DESTINO%
echo 2. Edite o arquivo .env com as novas credenciais
echo 3. Execute: npm install
echo 4. Execute: npm run dev
echo 5. Crie um novo projeto no Supabase
echo 6. Execute o schema.sql no novo projeto
echo 7. Faca o deploy na Vercel
echo.
echo Consulte DUPLICACAO_GUIA.md para mais detalhes!
echo.
pause
