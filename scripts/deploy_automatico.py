"""
Script para fazer deploy automático da Azure Function via KUDU API
"""

import requests
import base64
import os
import getpass

print("=" * 60)
print("DEPLOY AUTOMÁTICO - AZURE FUNCTION")
print("=" * 60)
print()

# Arquivo ZIP
zip_file = "azure_function_deploy.zip"
if not os.path.exists(zip_file):
    print(f"[ERRO] Arquivo não encontrado: {zip_file}")
    print("Execute este script na pasta do projeto!")
    exit(1)

print(f"Arquivo encontrado: {zip_file}")
print(f"Tamanho: {os.path.getsize(zip_file) / 1024:.1f} KB")
print()

# KUDU API endpoint
kudu_url = "https://fabric-sync-dre-crezcwh9bzaveya6.scm.brazilsouth-01.azurewebsites.net/api/zipdeploy"

print("=" * 60)
print("CREDENCIAIS DE DEPLOY")
print("=" * 60)
print()
print("Para obter as credenciais:")
print("1. Azure Portal → fabric-sync-dre")
print("2. Overview → 'Get publish profile' (botão no topo)")
print("3. Abra o arquivo .PublishSettings baixado")
print("4. Procure por: userName=\"...\" userPWD=\"...\"")
print()
print("Ou:")
print("1. Azure Portal → fabric-sync-dre")
print("2. Deployment Center → FTPS credentials")
print()

# Solicitar credenciais
username = input("Username (ex: $fabric-sync-dre): ").strip()
password = getpass.getpass("Password: ").strip()

if not username or not password:
    print("[ERRO] Credenciais não fornecidas!")
    exit(1)

print()
print("=" * 60)
print("FAZENDO DEPLOY...")
print("=" * 60)
print()

try:
    # Criar autenticação básica
    auth_string = f"{username}:{password}"
    auth_bytes = auth_string.encode('utf-8')
    auth_base64 = base64.b64encode(auth_bytes).decode('utf-8')

    # Ler arquivo ZIP
    with open(zip_file, 'rb') as f:
        zip_data = f.read()

    print(f"[1/3] Enviando {len(zip_data)} bytes...")

    # Headers
    headers = {
        'Authorization': f'Basic {auth_base64}',
        'Content-Type': 'application/zip'
    }

    # Fazer upload
    response = requests.post(
        kudu_url,
        headers=headers,
        data=zip_data,
        timeout=300  # 5 minutos
    )

    print(f"[2/3] Status: {response.status_code}")

    if response.status_code == 200:
        print("[3/3] Deploy concluído com sucesso!")
        print()
        print("=" * 60)
        print("PRÓXIMO PASSO")
        print("=" * 60)
        print()
        print("Reiniciar a Function App:")
        print("1. Azure Portal → fabric-sync-dre")
        print("2. Overview → Restart")
        print()
        print("Ou execute:")
        print("az functionapp restart --resource-group rg-fabric-sync --name fabric-sync-dre")
        print()
    elif response.status_code == 401:
        print("[ERRO] Credenciais inválidas!")
        print("Verifique o username e password.")
    elif response.status_code == 403:
        print("[ERRO] Acesso negado!")
        print("Verifique as permissões da sua conta.")
    else:
        print(f"[ERRO] Deploy falhou!")
        print(f"Status: {response.status_code}")
        print(f"Resposta: {response.text[:500]}")

except requests.exceptions.Timeout:
    print("[ERRO] Timeout! O deploy demorou mais de 5 minutos.")
    print("Pode ter funcionado. Verifique no Azure Portal.")
except Exception as e:
    print(f"[ERRO] {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
