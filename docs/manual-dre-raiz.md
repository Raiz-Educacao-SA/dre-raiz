# DRE Raiz — Manual do Usuário

**Plataforma de Gestão Financeira | Raiz Educação S.A.**
**Versão 1.0 — Março 2026**

---

## 1. O que é a DRE Raiz?

A DRE Raiz é a plataforma de gestão financeira da Raiz Educação que centraliza todo o processo de análise do Demonstrativo de Resultado do Exercício (DRE). Ela substitui o fluxo manual anterior (Alteryx → Excel → PPT) por um ambiente digital integrado, com dados em tempo real, inteligência artificial e geração automática de relatórios.

### O que a plataforma faz:
- **Consolida** todos os dados financeiros das marcas e filiais em um único lugar
- **Compara** resultados reais com orçamento e ano anterior automaticamente
- **Identifica** desvios relevantes e cobra justificativas dos responsáveis
- **Gera** apresentações executivas automaticamente com dados, justificativas e análises de IA
- **Projeta** resultados futuros com 3 métodos de forecasting
- **Analisa** performance por marca, filial e centro de custo

### Principais benefícios:
- Dados sempre atualizados (não depende de extrações manuais)
- Rastreabilidade completa de justificativas e planos de ação
- Redução drástica do tempo de preparação de relatórios
- Histórico preservado para comparação entre períodos
- Permissões por usuário (cada um vê o que lhe compete)

---

## 2. Acesso e Navegação

### Como acessar
Acesse pelo navegador (Chrome recomendado). O login é feito com sua conta Google corporativa da Raiz Educação.

### Menu lateral (Sidebar)
O menu à esquerda é sua porta de entrada para todas as funcionalidades:

| Guia | O que faz | Quem acessa |
|------|-----------|-------------|
| **DRE Gerencial** | Demonstrativo de resultado com filtros, drill-down e exportação | Todos |
| **Lançamentos** | Transações individuais, busca avançada, edição em massa | Todos |
| **Aprovações** | Fila de aprovação de alterações solicitadas | Admin, Gestor, Aprovador |
| **Análise Financeira** | Corte DRE, justificativas, plano de ação, slides automáticos | Todos |

---

## 3. DRE Gerencial — Sua Visão Principal

A DRE Gerencial é a tela principal da plataforma. Aqui você visualiza o demonstrativo de resultado completo com comparações automáticas.

### 3 Modos de Visualização

| Modo | O que mostra |
|------|-------------|
| **Consolidado** | Período selecionado com colunas: Real \| Orçado \| Δ R$ \| Δ % \| Ano Anterior \| Δ R$ \| Δ % |
| **Cenário** | Meses lado a lado, separados por cenário (Real, Orçado, A-1) |
| **Mês** | Meses lado a lado, cada um com Real \| Orçado \| A-1 juntos |

### Filtros disponíveis
- **Marca** — Selecione uma ou mais marcas (AP, CLV, GEU, GT, etc.)
- **Filial** — Filiais filtradas automaticamente pela marca selecionada
- **Tag01** — Centro de custo (Folha, Material Didático, Energia, etc.)
- **Tag02** — Segmento (Ensino Fundamental, Ensino Médio, etc.)
- **Tag03** — Projeto
- **Mês** — Selecione o período desejado
- **Recorrência** — Sim / Não / Todos

### Hierarquia da DRE
A DRE é organizada por Tag0 (grupos principais):
- **01. RECEITA LÍQUIDA**
- **02. CUSTOS VARIÁVEIS**
- **03. CUSTOS FIXOS**
- **04. DESPESAS SG&A**
- **06. RATEIO RAIZ**

Linhas calculadas aparecem automaticamente:
- **MARGEM DE CONTRIBUIÇÃO** = Receita + Custos Variáveis
- **EBITDA** = Margem + Custos Fixos + Rateio

### Ações disponíveis
- **Drill-down** — Duplo clique em qualquer linha Tag01 para ver as transações detalhadas
- **Exportar Excel** — Gera planilha fiel à visualização atual
- **Tela cheia** — Maximiza a tabela para melhor visualização
- **Ctrl+Clique** — Copia o valor numérico para a área de transferência
- **Limpar filtros** — Reseta todos os filtros para o padrão

---

## 4. Lançamentos — Transações Individuais

Nesta guia você consulta e edita transações individuais do sistema financeiro.

### Como funciona
1. Aplique os filtros desejados (14 filtros disponíveis)
2. Clique em **"Buscar Dados"** para carregar os resultados
3. Navegue entre páginas (1.000 registros por página)

> **Dica:** Ao fazer drill-down da DRE Gerencial, os filtros são aplicados automaticamente e a busca é executada.

### 14 Filtros disponíveis
Cenário, Data, Marca, Filial, Tag0, Tag01, Tag02, Tag03, Conta Contábil, Fornecedor, Ticket, Descrição, Chave ID, Recorrência.

### Edição em massa
1. Selecione as transações desejadas (checkbox)
2. Escolha o campo a alterar (Data, Filial, Conta, Recorrência)
3. Informe o novo valor
4. Escreva uma justificativa
5. Envie para aprovação

A alteração será revisada na guia **Aprovações** antes de ser aplicada.

### Personalização
- **Colunas** — Mostre ou oculte colunas conforme sua necessidade (configuração salva automaticamente)
- **Densidade** — 3 opções de espaçamento: Confortável / Compacto / Ultra

---

## 5. Aprovações — Fila de Alterações

Alterações solicitadas na guia Lançamentos aparecem aqui para revisão.

### Tipos de alteração
- Conta contábil, Data, Rateio, Exclusão, Marca, Filial, Multi-campo

### Como aprovar
1. Clique na alteração para ver o modal de detalhes (antes vs depois)
2. Revise a justificativa e os valores
3. Clique em **Aprovar** ou **Rejeitar**
4. Para múltiplas: selecione várias e use "Aprovar Selecionadas"

### Status
- **Pendente** (amarelo) — Aguardando revisão
- **Aplicado** (verde) — Aprovado e aplicado
- **Rejeitado** (vermelho) — Rejeitado com motivo

---

## 6. Análise Financeira — O Processo Mensal

Esta é a guia que estrutura todo o processo mensal de análise de desvios. Possui 4 abas integradas.

### Aba 1: Corte DRE — Foto e Justificativas

#### O que é a "Foto"?
É um snapshot (congelamento) dos valores da DRE em um determinado momento. Após tirada a foto, os valores ficam fixos como referência oficial para justificativas.

#### Regras importantes
- Cada mês tem sua própria foto (Jan grava só Jan, Fev grava só Fev)
- O painel "Consolidado YTD" soma automaticamente os meses com foto
- A foto pode ser re-gerada (nova versão), preservando justificativas já escritas
- Somente Admin/PlanFin pode gerar a foto

#### Hierarquia de desvios
| Nível | Exemplo | Descrição |
|-------|---------|-----------|
| Tag0 | 01. RECEITA LÍQUIDA | Grupo principal DRE |
| Tag01 | Folha (Funcionários) | Centro de custo |
| **Tag02** | **Ensino Fundamental** | **Segmento — NÍVEL DE JUSTIFICATIVA** |
| Marca | AP, CLV, GEU, GT... | Unidade de negócio |

#### Regra dos 5%
| Desvio | Obrigatoriedade |
|--------|----------------|
| **Acima de +5% ou abaixo de -5%** | Justificativa OBRIGATÓRIA (mín. 20 caracteres) + Plano de Ação para desvios negativos |
| **Entre -5% e +5%** | Justificativa opcional (recomendada para completude) |

#### Como justificar
1. Localize seu item (filtre por "Pendente")
2. Clique no ícone de lápis na linha do desvio
3. Escreva a justificativa explicando a **causa** do desvio
4. Se desvio negativo: preencha o Plano de Ação 5W1H
5. Clique em "Salvar"

#### Exemplos de boas justificativas

| Conta | Desvio | Justificativa |
|-------|--------|---------------|
| Folha (Funcionários) | +12% | Contratação não prevista de 3 professores para turma extra aberta em Fev/26 devido à demanda acima do esperado no Ensino Fundamental. Impacto de R$ 45k/mês. |
| Material Didático | -8% | Renegociação com fornecedor XYZ resultou em desconto de 15% no lote de apostilas do 1º semestre. Economia de R$ 32k. |
| Receita Líquida | -6% | Inadimplência acima do esperado na marca GT (3,2% vs 1,8% orçado). 47 alunos com mensalidade em atraso > 60 dias. |
| Energia Elétrica | +22% | Reajuste tarifário da concessionária (bandeira vermelha) + expansão da infraestrutura predial com 2 novos labs climatizados. |

#### O que EVITAR

| Exemplo ruim | Por que é ruim |
|-------------|---------------|
| "Custo acima do orçado" | Apenas repete o número, não explica a causa |
| "Variação normal" | Toda variação tem causa, não existe "normal" |
| "Vou verificar" | Não é justificativa, é promessa |

> **Dica:** O botão "Melhorar com IA" refina seu texto automaticamente e pode gerar o plano 5W1H com base no contexto do desvio.

#### Fluxo de status das justificativas
```
Pendente (amarelo) → Notificado (azul) → Justificado (roxo) → Aprovado (verde)
                                                              → Rejeitado (vermelho) → Resubmissão
```

#### Síntese automática por IA
Quando todas as justificativas de Tag02+Marca de um Tag01 estão preenchidas, a IA gera automaticamente uma síntese consolidada:

**Tag02+Marca** (pacoteiro escreve) → **Tag01** (IA sintetiza) → **Tag0** (IA sintetiza)

---

### Aba 2: Sumário Executivo

Resumo narrativo completo gerado por Inteligência Artificial que analisa todo o contexto financeiro do snapshot.

**O que ele analisa:**
- Panorama geral do resultado do mês
- Principais desvios positivos e negativos
- Comparação vs Orçado e vs Ano Anterior
- Riscos e oportunidades identificados
- Recomendações de ação baseadas nos dados

**Como usar:**
1. Selecione o mês nos filtros
2. Opcionalmente selecione uma marca
3. Clique em "Gerar Sumário Executivo"
4. Clique em "Regerar" para atualizar

---

### Aba 3: Plano de Ação — 5W1H

Consolida todos os planos de ação criados nas justificativas em uma visão única.

**Campos do 5W1H:**

| Campo | Obrigatório? | Descrição |
|-------|-------------|-----------|
| **What** (O que) | Sim | Ação corretiva. Ex: "Renegociar contrato de energia" |
| **Why** (Por que) | Sim | Objetivo. Ex: "Reduzir custo em 15% até Jun/26" |
| **How** (Como) | Não | Passos. Ex: "1) Cotar 3 fornecedores; 2) Instalar sensores" |
| **Who** (Quem) | Sim | Responsável. Ex: "Maria Silva — Gerente de Facilities" |
| **When** (Quando) | Sim | Prazo. Ex: "30/04/2026" (default: +30 dias) |
| **Impacto** | Não | Resultado esperado. Ex: "Redução de R$ 18k/mês" |

**Funcionalidades:**
- Filtro por status: Aberto, Em andamento, Concluído, Atrasado, Cancelado
- Busca por ação, objetivo ou responsável
- KPIs no topo: Total, Aberto, Em andamento, Atrasado, Taxa de conclusão
- Detalhe expandido com 5W1H completo + contexto financeiro
- Exportação para Excel

**Ciclo de vida do plano:**
1. Pacoteiro cria justificativa + plano de ação
2. PlanFin avalia pertinência e viabilidade
3. Se aprovado: acompanhamento mensal. Se rejeitado: pacoteiro ajusta
4. Na reunião de resultado: planos "Em andamento" e "Atrasados" são discutidos
5. Responsável atualiza status para "Concluído" e registra resultado

---

### Aba 4: Slides de Análise — PPT Automático

Gera automaticamente a apresentação executiva integrando dados, justificativas e análises de IA.

**Slides gerados:**
- Capa com logo, título, mês, marca, versão
- Visão geral DRE com KPIs
- Seção por Tag0 com síntese IA e top 3 desvios
- Detalhamento Tag01 > Tag02 > Marca
- Breakdown por marca (gráfico Real vs Orçado vs A-1)
- Cobertura final (% de justificativas + desvios pendentes)

**Integração automática:**
- Justificativas dos pacoteiros nos slides de detalhamento
- Sínteses IA nos slides de seção
- Planos de ação referenciados nos slides de desvio
- Dados da foto garantem consistência

---

## 7. Cronograma Mensal Sugerido

| Dia | Atividade | Responsável |
|-----|-----------|-------------|
| D+1 | Conferência final dos lançamentos do mês | Pacoteiros |
| D+2 | Geração da Foto na DRE Gerencial | PlanFin |
| D+2 | Notificação automática aos pacoteiros (email) | Automático |
| D+2 a D+7 | **Preenchimento de justificativas + planos de ação** | **Pacoteiros** |
| D+8 a D+9 | Revisão e aprovação das justificativas | PlanFin / Gestores |
| D+10 | Geração do PPT Executivo automático | PlanFin |
| D+10 a D+12 | Reunião de Resultado | Diretoria + Gestores |

---

## 8. Dicas Rápidas

| Ação | Como fazer |
|------|-----------|
| Copiar valor numérico | Ctrl+Clique no valor |
| Drill-down para transações | Duplo clique em linha da DRE |
| Melhorar justificativa | Botão "Melhorar com IA" |
| Configurar colunas | Clique no ícone de colunas (salvo automaticamente) |
| Exportar para Excel | Botão de download na barra superior |
| Filtro em cascata | Selecione Marca → Filiais filtram automaticamente |
| Voltar da transação para DRE | Botão "Voltar para DRE" |
| Tela cheia | Botão de maximizar no canto da tabela |

---

## 9. Perguntas Frequentes

**Sou pacoteiro e não vejo meus desvios. O que fazer?**
Verifique se o mês correto está selecionado. Se persistir, entre em contato com o PlanFin para ajustar suas permissões.

**Posso editar uma justificativa já aprovada?**
Não. Após aprovação, somente o administrador pode reabrir. Solicite ao PlanFin.

**O que acontece se eu não justificar dentro do prazo?**
Os itens pendentes são destacados na reunião de resultados e no PPT como "Sem justificativa". O PlanFin fará follow-up.

**A foto pode ser retirada novamente?**
Sim. A nova versão atualiza valores mas preserva justificativas existentes.

**Preciso preencher plano de ação para desvios positivos?**
Para desvios positivos, o plano é opcional. Mas a justificativa textual é obrigatória se >5%.

**Meus dados sumiram / não consigo ver uma marca.**
Verifique suas permissões com o PlanFin. Cada usuário vê apenas marcas e filiais atribuídas ao seu perfil.

**Como sei se minha justificativa foi aprovada?**
O status muda de "Justificado" (roxo) para "Aprovado" (verde) na tabela de desvios.

---

## 10. Suporte

**Dúvidas, dificuldades ou sugestões?**

Direcionem ao **Planejamento Financeiro** — estamos 100% disponíveis para ajudar, tirar dúvidas e ouvir sugestões de melhoria para a plataforma.

A ferramenta está em evolução contínua. Seu uso e feedback são fundamentais para as melhorias.

---

*Planejamento Financeiro — Raiz Educação S.A. — Versão 1.0 — Março 2026*
