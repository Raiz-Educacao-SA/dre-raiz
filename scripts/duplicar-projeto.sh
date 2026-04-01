#!/bin/bash
# Script de Duplicação Rápida - DRE RAIZ
# Execute: bash duplicar-projeto.sh

echo "========================================"
echo "  DUPLICACAO DRE RAIZ"
echo "========================================"
echo ""

# Pedir nome do novo projeto
read -p "Digite o nome do novo projeto (ex: DRE_RAIZ_Escola_XYZ): " NOVO_NOME

if [ -z "$NOVO_NOME" ]; then
    echo "Erro: Nome não pode ser vazio!"
    exit 1
fi

# Pedir caminho de destino
read -p "Digite o caminho completo de destino (ou deixe em branco para Desktop): " DESTINO

if [ -z "$DESTINO" ]; then
    DESTINO="$HOME/Desktop/$NOVO_NOME"
fi

echo ""
echo "========================================"
echo "  CONFIGURACAO"
echo "========================================"
echo "Nome do projeto: $NOVO_NOME"
echo "Destino: $DESTINO"
echo ""
read -p "Confirma a duplicação? (S/N): " CONFIRMA

if [ "$CONFIRMA" != "S" ] && [ "$CONFIRMA" != "s" ]; then
    echo "Operação cancelada."
    exit 0
fi

echo ""
echo "========================================"
echo "  COPIANDO ARQUIVOS..."
echo "========================================"

# Criar pasta de destino
mkdir -p "$DESTINO"

# Copiar arquivos (exceto node_modules e .env)
rsync -av --progress . "$DESTINO" \
    --exclude node_modules \
    --exclude .env \
    --exclude .env.local \
    --exclude '.env.*.local' \
    --exclude dist \
    --exclude .vercel \
    --exclude .git

echo ""
echo "========================================"
echo "  ATUALIZANDO PACKAGE.JSON..."
echo "========================================"

# Converter nome para lowercase e remover espaços
PKG_NAME=$(echo "$NOVO_NOME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

# Atualizar package.json (compatível com macOS e Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"name\": \"dre-raiz\"/\"name\": \"$PKG_NAME\"/" "$DESTINO/package.json"
else
    # Linux
    sed -i "s/\"name\": \"dre-raiz\"/\"name\": \"$PKG_NAME\"/" "$DESTINO/package.json"
fi

echo ""
echo "========================================"
echo "  CRIANDO ARQUIVO .ENV..."
echo "========================================"

# Copiar .env.example para .env
cp "$DESTINO/.env.example" "$DESTINO/.env" 2>/dev/null

# Tornar script executável
chmod +x "$DESTINO/duplicar-projeto.sh" 2>/dev/null

echo ""
echo "========================================"
echo "  DUPLICACAO CONCLUIDA!"
echo "========================================"
echo ""
echo "Projeto copiado para: $DESTINO"
echo ""
echo "PROXIMOS PASSOS:"
echo ""
echo "1. Abra a pasta: $DESTINO"
echo "2. Edite o arquivo .env com as novas credenciais"
echo "3. Execute: npm install"
echo "4. Execute: npm run dev"
echo "5. Crie um novo projeto no Supabase"
echo "6. Execute o schema.sql no novo projeto"
echo "7. Faça o deploy na Vercel"
echo ""
echo "Consulte DUPLICACAO_GUIA.md para mais detalhes!"
echo ""
