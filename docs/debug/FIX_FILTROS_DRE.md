# Fix: Filtros DRE Gerencial (14/02/2026)

## Problema Relatado
Filtros de **Pacotes**, **Marca** e **Filial** não estavam funcionando na guia DRE Gerencial.

## Causa Raiz
O filtro de **Filial** estava enviando o label completo do formato "CIA - NomeFilial" (ex: "QI - UNIDADE 1"), mas o banco de dados na tabela `transactions` tem apenas o nome da filial sem a CIA (ex: "UNIDADE 1").

## Solução Aplicada

### 1. fetchDREData() - Linha ~340
```typescript
// 🔧 FIX: Extrair apenas o nome da filial do label "CIA - NomeFilial"
let finalFiliais: string[] | undefined = undefined;
if (selectedFiliais.length > 0) {
  finalFiliais = selectedFiliais.map(label => {
    // Extrair apenas o nome da filial após " - "
    const parts = label.split(' - ');
    return parts.length > 1 ? parts.slice(1).join(' - ') : label;
  });
}
```

### 2. loadDimensionData() - Linha ~1214
```typescript
// 🔧 FIX: Se vem de selectedFiliais, extrair nome da filial do label
let mergedFiliais: string[] | undefined = undefined;
if (accFilters.nome_filial) {
  // Se vem de accFilters, já é o nome puro
  mergedFiliais = [accFilters.nome_filial];
} else if (selectedFiliais.length > 0) {
  // Se vem do dropdown, extrair nome do label "CIA - NomeFilial"
  mergedFiliais = selectedFiliais.map(label => {
    const parts = label.split(' - ');
    return parts.length > 1 ? parts.slice(1).join(' - ') : label;
  });
}
```

### 3. Debug adicional
Adicionado log para verificar valores enviados:
```typescript
console.log('🔍 DRE: Filtros aplicados:', {
  marcas: finalMarcas,
  filiais: finalFiliais,
  filiaisLabels: selectedFiliais,
  tags01: finalTags01
});
```

## Arquivos Modificados
- `components/DREViewV2.tsx`

## Como Testar
1. Abrir console do navegador (F12)
2. Ir para guia DRE Gerencial
3. Selecionar filtros:
   - Marca (ex: QI, CGS)
   - Filial (ex: QI - UNIDADE 1)
   - Pacotes/Tag01
4. Verificar no console:
   - `🔍 DRE: Filtros aplicados:` mostra os valores
   - `✅ getDRESummary: X linhas agregadas retornadas`
5. Verificar se dados filtrados aparecem na tabela

## Potenciais Problemas Futuros
Se os filtros ainda não funcionarem perfeitamente, pode ser necessário:
1. **Trim de espaços**: Modificar SQL para usar `TRIM()`
2. **Case-insensitive**: Modificar SQL para usar `LOWER()` ou `ILIKE`
3. **Verificar dados**: Confirmar formato exato de `transactions.nome_filial` no banco

## Bug Crítico Encontrado (14/02/2026 - 2ª correção)
**Sintoma**: Cards não apareciam, componente não renderizava
**Causa**: ReferenceError - variável `finalTags01` era referenciada no console.log antes de ser declarada
**Solução**: Movida a declaração de `finalTags01` para antes do primeiro uso

```typescript
// ❌ ANTES (ERRADO):
console.log({ tags01: finalTags01 }); // ← Erro! Variável ainda não existe
let finalTags01 = ...;

// ✅ DEPOIS (CORRETO):
let finalTags01 = ...;
console.log({ tags01: finalTags01 }); // ← OK!
```

## Status
✅ Corrigido e pronto para teste (build passou sem erros)
