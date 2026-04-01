# 🔧 Corrigir Problema: Usuário Vê Telas Zeradas

## 🚨 Problema Identificado

O usuário **Yago** está vendo telas zeradas porque as **permissões configuradas não correspondem** aos valores reais no banco de dados.

### Por que isso acontece?

Quando você adiciona permissões específicas para um usuário, o sistema filtra os dados. O filtro funciona assim:

1. **CIA (Marca)** → Filtra pelo campo `brand` da transação
2. **Filial** → Filtra pelo campo `branch` da transação
3. **Centro de Custo** → Filtra pelo campo `category` da transação

Se o valor que você digitou na permissão **NÃO EXISTE** nos dados ou está **ESCRITO DIFERENTE**, nenhuma transação passa pelo filtro = telas zeradas.

---

## ✅ Solução: Usar a Nova Ferramenta de Debug

Acabei de adicionar uma ferramenta no **Painel Admin** que mostra TODOS os valores disponíveis no banco!

### PASSO A PASSO:

### 1️⃣ **Acesse o Painel Admin**
- Menu lateral → **"ADMIN"**

### 2️⃣ **Clique no botão azul "Valores Disponíveis"**
- No topo da página, você verá um botão azul:
  ```
  💡 Valores Disponíveis no Banco
  Clique aqui para ver quais valores usar nas permissões
  ```
- Clique nele para expandir

### 3️⃣ **Veja os Valores Reais**
Aparecerá uma tabela com 4 colunas:

- **🏢 CIAs (Marcas)**: Todos os valores do campo `brand`
- **🏫 Filiais**: Todos os valores do campo `branch`
- **📊 Categorias (Centro Custo)**: Todos os valores do campo `category`
- **🏷️ Tags**: Todos os valores de tags (tag01, tag02, tag03)

### 4️⃣ **Copie o Valor EXATO**
- Encontre o valor que você quer dar permissão
- Copie EXATAMENTE como está escrito (maiúsculas, minúsculas, espaços, acentos)

### 5️⃣ **Configure a Permissão do Yago**
1. Selecione o usuário **Yago** na lista
2. Role até "Adicionar Permissão"
3. Escolha o tipo (CIA/Filial/Centro de Custo)
4. **COLE** o valor EXATO que você copiou
5. Clique em "Adicionar Permissão"

### 6️⃣ **Remova Permissões Erradas**
- Se já adicionou permissões com valores errados
- Clique no ícone de 🗑️ (lixeira) ao lado de cada uma
- Delete todas as permissões incorretas

---

## 📋 Exemplo Prático

### ❌ ERRADO (vai mostrar tudo zerado):
```
Tipo: Filial
Valor: sap alphaville  (minúsculo)
```

### ✅ CORRETO:
```
Tipo: Filial
Valor: SAP Alphaville  (exatamente como está no banco)
```

---

## 🎯 Configurações Comuns

### Opção 1: Dar acesso a uma filial específica
```
Tipo: filial
Valor: [copie da lista de Filiais Disponíveis]
```

### Opção 2: Dar acesso a uma marca/CIA
```
Tipo: cia
Valor: [copie da lista de CIAs Disponíveis]
```

### Opção 3: Dar acesso a um centro de custo (categoria)
```
Tipo: centro_custo
Valor: [copie da lista de Categorias Disponíveis]
```

### Opção 4: Dar acesso total
```
Não adicione nenhuma permissão!
Sem permissões = acesso total aos dados
```

---

## 🔍 Como Verificar se Funcionou

### Método 1: Faça Login como Yago
1. Abra janela anônima
2. Acesse https://dre-raiz.vercel.app
3. Faça login com a conta do Yago
4. Veja se os dados aparecem

### Método 2: Veja o Banner de Acesso Restrito
- Se aparecer o banner amarelo no topo: **"Acesso Restrito - Filiais: X, Y, Z"**
- Significa que as permissões estão ativas
- Se não aparecer dados, os valores estão errados

---

## 🆘 Ainda Está Zerado?

### Checklist de Debug:

- [ ] Abri os "Valores Disponíveis" no Admin?
- [ ] Copiei o valor EXATAMENTE como está?
- [ ] Removi as permissões antigas/erradas?
- [ ] Adicionei a nova permissão com valor correto?
- [ ] Fiz logout e login novamente como Yago?
- [ ] Limpei o cache do navegador (Ctrl+Shift+R)?

### Se AINDA não funcionar:

Execute esta query no Supabase SQL Editor para ver as permissões do Yago:

```sql
SELECT
  u.email,
  u.name,
  u.role,
  up.permission_type,
  up.permission_value
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email LIKE '%yago%';
```

E esta para ver 10 exemplos de dados reais:

```sql
SELECT
  brand,
  branch,
  category,
  description,
  amount
FROM transactions
LIMIT 10;
```

Compare os valores das permissões com os valores dos dados.

---

## 💡 Dica PRO

Para evitar esse problema no futuro:

1. **SEMPRE** use o botão "Valores Disponíveis" antes de adicionar permissão
2. **COPIE e COLE** os valores, não digite manualmente
3. O campo de input agora tem **autocomplete** - comece a digitar e ele sugere
4. Se quiser dar acesso total, **não adicione permissões**

---

## 🎯 Resumo

1. ✅ Ferramenta "Valores Disponíveis" adicionada no Admin
2. ✅ Autocomplete nos campos de permissão
3. ✅ Copie valores EXATOS da lista
4. ✅ Delete permissões incorretas
5. ✅ Adicione permissões corretas
6. ✅ Teste fazendo login como o usuário

**Me avise quando testar para confirmarmos que funcionou!** 🚀
