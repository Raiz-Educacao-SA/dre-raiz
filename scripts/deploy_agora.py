import requests
import os

print("=" * 60)
print("DEPLOY AZURE FUNCTION")
print("=" * 60)

# Arquivo ZIP
zip_file = "azure_function_deploy.zip"
zip_path = os.path.join(os.path.dirname(__file__), zip_file)

if not os.path.exists(zip_path):
    print(f"[ERRO] Arquivo não encontrado: {zip_path}")
    exit(1)

print(f"Arquivo: {zip_file}")
print(f"Tamanho: {os.path.getsize(zip_path)} bytes")
print()

# URL e credenciais
url = "https://fabric-sync-dre-crezcwh9bzaveya6.scm.brazilsouth-01.azurewebsites.net/api/zipdeploy"
username = "$fabric-sync-dre"
password = "FJyq1WbzRxW3wTLfhm4YLKcRuxyFq9hTF40J70yGf0tzkFNpv1pWWvG7FfGb"

print("Fazendo upload...")
print()

try:
    with open(zip_path, 'rb') as f:
        zip_data = f.read()

    headers = {
        'Content-Type': 'application/octet-stream'
    }

    response = requests.post(
        url,
        auth=(username, password),
        data=zip_data,
        headers=headers,
        timeout=300
    )

    print(f"Status: {response.status_code}")
    print()

    if response.status_code in [200, 202]:
        print("[SUCESSO] Deploy concluído!")
        print()
        print("PRÓXIMO PASSO:")
        print("- Azure Portal → fabric-sync-dre → Restart")
    else:
        print(f"[ERRO] {response.status_code}")
        print(response.text[:500])

except Exception as e:
    print(f"[ERRO] {e}")

print()
print("=" * 60)
