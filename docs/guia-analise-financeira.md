# Guia de Uso — Análise Financeira
## Sistema de Corte DRE, Justificativas de Desvios e Análise Executiva

**Versão:** 1.0 — Março 2026
**Área responsável:** Planejamento Financeiro (PlanFin)
**Plataforma:** DRE Raiz — dre-raiz.vercel.app

---

## 1. Visão Geral

A guia **Análise Financeira** é o centro de controle do processo mensal de prestação de contas da DRE. Nela, o Planejamento Financeiro (PlanFin) congela os resultados do mês ("Foto"), e os responsáveis de cada pacote (pacoteiros) analisam, justificam e propõem planos de ação para os desvios encontrados.

### Objetivo
Garantir que **todo desvio relevante** entre o Real e o Orçado (e Real vs. Ano Anterior) tenha uma justificativa documentada e um plano de ação concreto, permitindo governança financeira, rastreabilidade e melhoria contínua.

### Fluxo Mensal Resumido

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. DRE GERENCIAL (dia a dia)                                       │
│     → Lançamentos, ajustes, conferências pelos responsáveis         │
├─────────────────────────────────────────────────────────────────────┤
│  2. FOTO / CORTE (PlanFin)                                          │
│     → PlanFin clica "Foto" na DRE Gerencial = SNAPSHOT do mês      │
│     → Valores congelados, imutáveis para aquela versão              │
├─────────────────────────────────────────────────────────────────────┤
│  3. JUSTIFICATIVAS (Pacoteiros — prazo definido pelo PlanFin)       │
│     → Cada pacoteiro acessa Análise Financeira > Corte DRE          │
│     → Justifica seus desvios obrigatórios (>5%) + plano de ação     │
│     → IA sintetiza cascata de justificativas automaticamente        │
├─────────────────────────────────────────────────────────────────────┤
│  4. REVISÃO (PlanFin / Gestores)                                    │
│     → Revisam justificativas e planos de ação                       │
│     → Aprovam ou rejeitam (com motivo)                              │
├─────────────────────────────────────────────────────────────────────┤
│  5. APRESENTAÇÃO EXECUTIVA                                          │
│     → Sumário Executivo, Planos de Ação consolidados                │
│     → PPT automático para reunião de resultado                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Acesso e Navegação

1. Acesse **dre-raiz.vercel.app** e faça login com Google (SSO corporativo).
2. No menu lateral (Sidebar), clique em **"Análise Financeira"**.
3. Você verá 5 abas:

| Aba | Descrição | Acesso |
|-----|-----------|--------|
| **Corte DRE (Justificativas)** | Tabela de desvios congelados para justificar | Todos |
| **Agentes Financeiros** | Análise automatizada por agentes de IA | Admin |
| **Sumário Executivo** | Resumo executivo gerado por IA | Todos |
| **Plano de Ação** | Consolidação de todos os planos de ação | Todos |
| **Slides de Análise** | PPT automático para apresentação executiva | Todos |

---

## 3. Aba "Corte DRE — Justificativas"

Esta é a aba principal do processo. Aqui estão os resultados congelados do mês ("Foto") e o espaço para justificar desvios.

### 3.1. Como a Foto é Gerada (PlanFin)

1. Na **DRE Gerencial**, selecione **exatamente 1 mês** no filtro.
2. Clique no botão **"Foto"** (ícone de câmera, canto superior).
3. O sistema grava um snapshot dos valores daquele mês isolado.
4. **Cada mês tem sua própria foto** — Foto de Jan grava só Jan, Foto de Fev grava só Fev.
5. O painel **Consolidado YTD** (na parte inferior) soma automaticamente todos os meses que possuem foto.

> **Importante:** A foto é uma imagem fiel da DRE no momento do corte. Após gerada, os valores da versão **não mudam** — são a referência oficial para justificativas e apresentações.

### 3.2. Estrutura da Tabela de Desvios

A tabela mostra a hierarquia da DRE com os seguintes níveis:

| Nível | Exemplo | Descrição |
|-------|---------|-----------|
| **Tag0** (Grupo) | 01. RECEITA LÍQUIDA | Grupo principal da DRE |
| **Tag01** (Centro de Custo) | Folha (Funcionários) | Subgrupo / centro de custo |
| **Tag02** (Segmento) | Ensino Fundamental | Segmento operacional |
| **Marca** | AP, CLV, GEU, GT... | Marca/unidade de negócio |

**Neste primeiro momento, a justificativa é obrigatória a nível de Tag02 + Marca.**

### 3.3. Colunas da Tabela

| Coluna | Descrição |
|--------|-----------|
| **Conta / Centro de Custo** | Hierarquia Tag0 > Tag01 > Tag02 > Marca |
| **Real** | Valor realizado no mês (R$) |
| **vs Orçado** | Valor orçado + variação absoluta (Δ R$) + variação percentual (Δ%) |
| **vs A-1** | Valor do ano anterior + variação absoluta + variação percentual |
| **Status / Ação** | Status da justificativa + botão para justificar |

### 3.4. Regra de Obrigatoriedade — Threshold 5%

Para esta primeira rodada, a regra é:

| Condição | Obrigatoriedade |
|----------|----------------|
| **Desvio > +5% ou < -5%** (vs Orçado ou vs A-1) | **OBRIGATÓRIO** — Justificativa + Plano de Ação |
| **Desvio entre -5% e +5%** | **OPCIONAL** — Pode ser preenchido, mas não é exigido |

- Itens obrigatórios aparecem com badge **"Obrigatória"** em vermelho.
- O sistema exibe um alerta com a contagem de pendências obrigatórias.
- Somente as **folhas** (nível Tag02 + Marca) exigem justificativa manual — os níveis superiores são sintetizados automaticamente pela IA.

### 3.5. Como Justificar um Desvio

1. Na tabela, localize o desvio atribuído a você (filtre por status "Pendente").
2. Clique no botão de ação (ícone de lápis) na linha do desvio.
3. Preencha o formulário:

#### Seção 1: Justificativa do Desvio

- **Campo**: Texto livre com mínimo de 20 caracteres.
- **Dica**: Seja objetivo. Explique o **motivo real** do desvio, não apenas descreva o número.
- **IA disponível**: Clique em "Melhorar com IA" para que a inteligência artificial refine seu texto.

**Exemplos de boas justificativas:**

| Conta | Desvio | Justificativa |
|-------|--------|---------------|
| Folha (Funcionários) | +12% vs Orçado | "Contratação não prevista de 3 professores para turma extra aberta em Fev/26 devido à demanda acima do esperado no Ensino Fundamental. Impacto de R$ 45k/mês." |
| Material Didático | -8% vs Orçado | "Renegociação com fornecedor XYZ resultou em desconto de 15% no lote de apostilas do 1º semestre. Economia de R$ 32k." |
| Receita Líquida | -6% vs Orçado | "Inadimplência acima do esperado na marca GT (3,2% vs 1,8% orçado). 47 alunos com mensalidade em atraso > 60 dias." |
| Energia Elétrica | +22% vs A-1 | "Reajuste tarifário da concessionária (bandeira vermelha) + expansão da infraestrutura predial com 2 novos labs climatizados." |

**Exemplos de justificativas ruins (evite):**

| Justificativa ruim | Por quê? |
|---------------------|----------|
| "Custo acima do orçado" | Apenas repete o número, não explica a causa |
| "Variação normal" | Não há variação "normal" — toda variação tem causa |
| "Vou verificar" | Não é justificativa, é promessa |

#### Seção 2: Plano de Ação (Metodologia 5W1H)

Para desvios **negativos** (custo acima do orçado ou receita abaixo), o plano de ação é **obrigatório**. O formulário segue a metodologia **5W1H**:

| Campo | Pergunta | Obrigatório | Exemplo |
|-------|----------|-------------|---------|
| **O que** (What) | O que será feito para corrigir? | Sim | "Renegociar contrato de energia com a concessionária e implementar programa de eficiência energética" |
| **Por que** (Why) | Qual o objetivo da ação? | Sim | "Reduzir custo de energia em 15% até Jun/26, alinhando ao orçamento" |
| **Como** (How) | Como será executado? | Não | "1) Solicitar cotação de 3 fornecedores alternativos; 2) Instalar sensores de presença; 3) Revisar horários de ar-condicionado" |
| **Responsável** (Who) | Quem é o responsável? | Sim | "Maria Silva — Gerente de Facilities" |
| **Prazo** (When) | Até quando? | Sim | "30/04/2026" (default: 30 dias) |
| **Impacto Esperado** | Qual a economia/ganho esperado? | Não | "Redução de R$ 18k/mês a partir de Mai/26" |
| **Status** | Em que fase está? | — | Aberto / Em andamento / Concluído / Atrasado / Cancelado |

> **Nota:** O Plano de Ação será revisado e discutido com o Planejamento Financeiro. Após submissão, o PlanFin avaliará a pertinência da ação, podendo aprovar, solicitar ajustes ou rejeitar com motivo. O acompanhamento da execução será feito mensalmente na aba "Plano de Ação".

### 3.6. Fluxo de Status

```
PENDENTE ──→ NOTIFICADO ──→ JUSTIFICADO ──→ APROVADO
     │              │              │
     │              │              └──→ REJEITADO (com motivo)
     │              │                       │
     │              │                       └──→ Pacoteiro pode resubmeter
     │              │
     └──────────────┘  (email de notificação enviado)
```

| Status | Cor | Significado |
|--------|-----|-------------|
| **Pendente** | Amarelo | Aguardando justificativa do pacoteiro |
| **Notificado** | Azul | Email enviado ao responsável |
| **Justificado** | Roxo | Pacoteiro preencheu justificativa + plano |
| **Aprovado** | Verde | PlanFin/Gestor aprovou |
| **Rejeitado** | Vermelho | PlanFin/Gestor rejeitou (motivo informado) |

### 3.7. Síntese Automática por IA

Quando **todas** as justificativas de nível Tag02+Marca de um Tag01 estão preenchidas, o sistema gera automaticamente uma **síntese consolidada** usando IA (Claude Haiku):

```
Tag02+Marca (pacoteiro escreve) ──→ Tag01 (IA sintetiza)
                                        ──→ Tag0 (IA sintetiza)
```

- A síntese resume todas as justificativas dos filhos em um texto coeso.
- Aparece no campo "Síntese IA" do nível pai.
- É usada automaticamente nos Slides de Análise e no PPT.

### 3.8. Painel Consolidado YTD

Na parte inferior da tela, o painel **"Consolidado YTD"** mostra a soma de todos os meses que possuem foto (ex: Jan + Fev = YTD):

- Expanda/recolha clicando na barra "Consolidado YTD — Jan a Fev. de 2026".
- Mostra a mesma hierarquia da tabela principal, com valores acumulados.
- Exibe contagem de meses com foto e percentual de justificativas preenchidas.
- Permite gerar **Síntese YTD** (resumo cruzando múltiplos meses).

---

## 4. Aba "Sumário Executivo"

O Sumário Executivo é um **resumo narrativo** gerado por IA que analisa todo o contexto dos dados do snapshot selecionado.

### Como usar:

1. Selecione o **mês** e opcionalmente a **marca** nos filtros do topo.
2. Clique em **"Gerar Sumário Executivo"** (botão laranja).
3. O sistema busca os dados do snapshot (foto) e gera um resumo executivo completo, incluindo:
   - Panorama geral do resultado do mês
   - Principais desvios positivos e negativos
   - Riscos identificados
   - Recomendações
4. Para regerar com novos filtros, clique em **"Regerar Sumário"**.

### Quem deve usar:

- **PlanFin**: Para preparar a narrativa da reunião de resultados.
- **Gestores**: Para ter uma visão rápida do mês sem navegar toda a DRE.
- **Diretoria**: Como briefing executivo antes da reunião.

---

## 5. Aba "Plano de Ação"

Consolida **todos os planos de ação** criados nas justificativas em uma visão única de acompanhamento.

### Funcionalidades:

| Recurso | Descrição |
|---------|-----------|
| **Filtro por Status** | Aberto, Em andamento, Concluído, Atrasado, Cancelado |
| **Busca** | Por ação, objetivo ou responsável |
| **Ordenação** | Por prazo, status, marca ou data de criação |
| **KPIs no topo** | Total, Aberto, Em andamento, Atrasado, Concluído, Taxa de conclusão |
| **Detalhe expandido** | Clique na linha para ver 5W1H completo + contexto financeiro |
| **Exportar Excel** | Exporta todos os planos para planilha |

### Colunas Visíveis:

| Coluna | Conteúdo |
|--------|----------|
| Status | Badge colorido (Aberto/Em andamento/Concluído/Atrasado/Cancelado) |
| Mês | Mês de referência da foto |
| Marca | Unidade de negócio |
| Conta/Linha | Tag0 > Tag01 |
| Ação | Resumo do "O que será feito" |
| Responsável | Nome do responsável |
| Prazo | Data limite (destaque vermelho se atrasado) |
| Valores | Real, Orçado/A-1, Desvio R$ e % |

### Metodologia de Acompanhamento:

1. **Submissão**: Pacoteiro cria o plano junto com a justificativa.
2. **Revisão**: PlanFin avalia pertinência e aprova ou solicita ajustes.
3. **Acompanhamento mensal**: Na reunião de resultado, os planos "Em andamento" e "Atrasados" são discutidos.
4. **Conclusão**: Quando a ação é concluída, o responsável atualiza o status e registra o resultado efetivo.
5. **Histórico**: Todos os planos ficam registrados para auditoria e análise de efetividade.

---

## 6. Aba "Slides de Análise"

Gera automaticamente uma **apresentação executiva (PPT)** no padrão do PlanFin, integrando dados, justificativas e análises de IA.

### Slides Gerados:

| # | Slide | Conteúdo |
|---|-------|----------|
| 1 | **Capa** | Logo, título "Book de Resultados DRE Gerencial", mês, marca, versão |
| 2 | **Visão Geral DRE** | Tabela condensada Tag0 + KPIs (EBITDA, vs Orçado %, vs A-1 %) + Cobertura de justificativas |
| 3-N | **Seção por Tag0** | Tabela Tag01 + Síntese IA + Top 3 Desvios com justificativas |
| — | **Detalhamento** | Hierarquia Tag01 > Tag02 > Marca com valores e justificativas |
| — | **Breakdown por Marca** | Gráfico de barras Real vs Orçado vs A-1 por marca |
| Final | **Cobertura** | % de cobertura de justificativas + Top desvios não justificados |

### Como usar:

1. Selecione o **mês** e opcionalmente **marca** nos filtros.
2. Clique em **"Gerar Slides"** para visualizar o preview.
3. Revise o conteúdo na tela.
4. Clique em **"Exportar PPT Executivo"** para baixar o arquivo .pptx.
5. O PPT gerado está pronto para apresentação — as justificativas e sínteses IA são incorporadas automaticamente.

### Integração Automática:

- **Justificativas** dos pacoteiros → aparecem nos slides de detalhamento.
- **Sínteses IA** → aparecem nos slides de seção (Tag0).
- **Planos de Ação** → referenciados nos slides de desvio.
- **Dados da Foto** → valores congelados garantem consistência com a tabela de justificativas.

---

## 7. Cronograma Mensal Sugerido

| Dia | Atividade | Responsável |
|-----|-----------|-------------|
| D+1 (após fechamento) | Conferência final dos lançamentos | Pacoteiros |
| D+2 | Geração da Foto na DRE Gerencial | PlanFin |
| D+2 | Notificação aos pacoteiros | PlanFin (automático) |
| D+2 a D+7 | Preenchimento de justificativas + planos de ação | Pacoteiros |
| D+8 a D+9 | Revisão e aprovação das justificativas | PlanFin / Gestores |
| D+10 | Geração do PPT Executivo | PlanFin |
| D+10-12 | Reunião de Resultado | Diretoria + Gestores |

---

## 8. Perguntas Frequentes (FAQ)

**P: Sou pacoteiro e não vejo meus desvios. O que fazer?**
R: Verifique se o mês correto está selecionado no filtro. Se o problema persistir, entre em contato com o PlanFin — pode ser necessário ajustar suas permissões de acesso (tag01/marca).

**P: Posso editar uma justificativa já aprovada?**
R: Não. Após aprovação, somente o administrador pode reabrir o item. Solicite ao PlanFin se necessário.

**P: O que acontece se eu não justificar dentro do prazo?**
R: Os itens obrigatórios (>5%) pendentes são destacados na reunião de resultados e no PPT executivo como "Sem justificativa". O PlanFin fará o follow-up direto.

**P: A foto pode ser retirada novamente?**
R: Sim. O PlanFin pode re-gerar a foto do mês. A nova versão (v2, v3...) atualiza os valores, mas **preserva** as justificativas já escritas (apenas os valores financeiros são atualizados).

**P: O que significa a "Síntese IA"?**
R: É um resumo automático gerado por inteligência artificial que consolida todas as justificativas dos níveis inferiores em um texto coeso. Ela é gerada automaticamente quando todas as folhas (Tag02+Marca) de um grupo estão justificadas.

**P: Preciso preencher plano de ação para desvios positivos?**
R: Para desvios positivos (receita acima do orçado ou custo abaixo), o plano de ação é opcional. Mas a justificativa textual é obrigatória se o desvio for >5%.

---

## 9. Contatos

| Função | Responsável | Contato |
|--------|-------------|---------|
| Suporte técnico | TI / Desenvolvimento | Abrir chamado via canal interno |
| Dúvidas de processo | Planejamento Financeiro | planfin@raizeducacao.com.br |
| Permissões de acesso | Administração do Sistema | Admin via plataforma |

---

*Documento gerado pelo Planejamento Financeiro — Raiz Educação S.A.*
*Versão 1.0 — Março 2026*
