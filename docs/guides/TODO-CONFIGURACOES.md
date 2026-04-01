# 📋 Configurações Pendentes - DRE RAIZ 2.0

## 🔴 PENDENTE: Abas de Lançamentos

### Status Atual (03/02/2026)

**✅ ABA REAL - FUNCIONAL**
- Busca e exibe 50.000 registros com paginação
- Filtros aplicados corretamente
- Performance otimizada

**⏳ ABA ORÇAMENTO - DESABILITADA**
- Status: Temporariamente desabilitada
- Arquivo: `components/TransactionsView.tsx` (linhas 361-365)
- O que precisa:
  - [ ] Definir fonte de dados de orçamento
  - [ ] Configurar integração com tabela de orçamento
  - [ ] Implementar filtro de scenario='Orcamento'
  - [ ] Testar com dados reais

**⏳ ABA ANO ANTERIOR - DESABILITADA**
- Status: Temporariamente desabilitada
- Arquivo: `components/TransactionsView.tsx` (linhas 367-371)
- O que precisa:
  - [ ] Definir lógica de comparação ano a ano
  - [ ] Carregar dados do ano anterior (2025)
  - [ ] Implementar cálculos de variação
  - [ ] Configurar visualização comparativa

---

## 📊 Detalhes Técnicos

### Arquivos Envolvidos
- `components/TransactionsView.tsx` - Componente principal
- `services/supabaseService.ts` - Função `getFilteredTransactions()`

### Modificações Necessárias

#### Para habilitar ORÇAMENTO:
```typescript
// Remover o return false e implementar:
if (activeTab === 'orcamento') {
  if (scenarioNormalized !== 'orcamento') return false;
}
```

#### Para habilitar ANO ANTERIOR:
```typescript
// Remover o return false e implementar:
if (activeTab === 'comparativo') {
  const currentYear = new Date().getFullYear();
  const tYear = new Date(t.date).getFullYear();
  if (tYear !== currentYear - 1) return false;
}
```

---

## 🔄 Histórico de Desenvolvimento

**03/02/2026**
- ✅ Implementado busca com paginação (50.000 registros)
- ✅ Corrigido limite de 1.000 registros do Supabase
- ✅ Implementado persistência ao trocar de abas
- ✅ Removido filtro de scenario da busca (client-side filtering)
- ✅ Desabilitado abas ORÇAMENTO e ANO ANTERIOR temporariamente

---

## 📝 Próximos Passos

1. **Reunir com equipe** para definir:
   - Fonte de dados de orçamento
   - Estrutura de dados do ano anterior
   - Requisitos de visualização

2. **Implementar** funcionalidades pendentes

3. **Testar** com dados reais

4. **Documentar** processo de configuração

---

**Última atualização:** 03/02/2026
**Status do projeto:** EM DESENVOLVIMENTO
