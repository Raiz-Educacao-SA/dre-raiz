# Manual — Solicitações de Análise DRE

## Visão Geral

O módulo de **Solicitações de Análise** permite que qualquer usuário da plataforma DRE Raiz solicite esclarecimentos sobre valores da DRE diretamente a um responsável, com rastreamento de status, SLA e notificações por email.

**Analogia:** funciona como um sistema de tickets interno, onde o solicitante "abre um chamado" sobre um ponto da DRE e o responsável precisa responder dentro de um prazo.

---

## Fluxo Completo

```
1. Solicitante encontra algo estranho na DRE Gerencial
2. Clica em "Solicitar Análise" → preenche assunto, dúvida, responsável e prioridade
3. Responsável recebe email + badge no Sidebar
4. Responsável abre a solicitação e responde via chat
5. Solicitante revisa a resposta:
   - Aprova → solicitação encerrada ✅
   - Devolve com réplica → volta para o responsável
6. Ciclo se repete até aprovação ou expiração do SLA
```

### Diagrama de Status

```
                    ┌──────────┐
                    │ Pendente │ ← criação
                    └────┬─────┘
                         │ responsável responde
                    ┌────▼─────┐
                    │Respondida│
                    └────┬─────┘
                    ┌────┴────┐
              aprova│         │devolve
           ┌───────▼┐   ┌────▼────┐
           │Aprovada│   │Devolvida│
           └────────┘   └────┬────┘
                             │ responsável responde de novo
                        ┌────▼────┐
                        │Respondida│
                        └────┬────┘
                             │ solicitante envia réplica
                        ┌────▼────┐
                        │Reaberta │ → volta ao responsável
                        └─────────┘
```

---

## Onde Acessar

### 1. DRE Gerencial (dentro do contexto)
Na parte inferior da tela de DRE Gerencial, o painel **"Solicitações de Análise"** aparece colapsado. Ao expandir, mostra:

- **Este contexto** — solicitações vinculadas aos filtros atuais da DRE
- **Para responder** — solicitações recebidas que precisam da sua ação (badge laranja)
- **Aguardando resposta** — solicitações que você enviou e estão esperando retorno (badge verde)

O botão **"Solicitar Análise"** abre o formulário diretamente com o contexto (filtros) da DRE capturado automaticamente.

### 2. Guia "Solicitações" no Sidebar
Uma guia dedicada com visão completa de todas as suas solicitações em formato de tabela:

- **Aba Recebidas** — solicitações onde você é o responsável
- **Aba Enviadas** — solicitações que você criou
- **Filtros por status** — Pendente, Respondida, Devolvida, Aprovada, etc.
- **Busca** — por assunto, pergunta ou participante
- **Ordenação** — por data, status, prioridade, SLA
- **Badges** — laranja (para responder) e verde (respondidas) pulsantes

### 3. Admin → Aba "Solicitações"
Visível apenas para administradores:

- **Dashboard** com contadores por status (total, pendentes, respondidas, aprovadas, etc.)
- **Configuração de SLA** — definir prazos e lembretes para prioridade Normal e Urgente
- **Tabela completa** com todas as solicitações de todos os usuários

---

## Criando uma Solicitação

1. Na DRE Gerencial, clique em **"Solicitar Análise"**
2. Preencha:
   - **Assunto** — título curto (ex: "Receita abaixo do esperado em Março")
   - **Dúvida / Observação** — descrição detalhada do que precisa ser esclarecido
   - **Responsável** — busque por nome ou email (dropdown com todos os usuários do sistema)
   - **Prioridade** — Normal (48h) ou Urgente (24h)
3. Clique em **"Enviar Solicitação"**

O sistema automaticamente:
- Captura os filtros DRE atuais (ano, meses, marcas, filiais, tags)
- Calcula o prazo SLA baseado na prioridade
- Envia email ao responsável com link direto
- Cria a primeira mensagem do chat (sua dúvida)

---

## Respondendo a uma Solicitação

### Como Responsável
1. Você receberá um **email** e verá o **badge laranja** no Sidebar
2. Abra a solicitação (via Sidebar → Solicitações, ou DRE Gerencial)
3. O painel lateral abre com o chat
4. Digite sua análise/resposta no campo de texto
5. Clique no botão de enviar (ou pressione Enter)
6. O status muda para **"Respondida"** e o solicitante é notificado

### Como Solicitante (revisando a resposta)
Ao receber uma resposta, você verá o **badge verde** no Sidebar. Abra a solicitação e:

- **Aprovar** (botão verde) — encerra a solicitação como resolvida
- **Devolver** (botão vermelho) — escreva o motivo e devolva para o responsável
- **Enviar mensagem** — complemente o chat sem mudar o status

---

## Chat / Thread

O painel lateral funciona como um chat em tempo real:

- **Mensagens coloridas** por tipo: pergunta (azul), resposta (verde), réplica (amarelo), aprovação (verde escuro), devolução (vermelho)
- **Avatar** com inicial do nome
- **Timestamp** em cada mensagem
- **Enviar mensagem** disponível para ambos os participantes a qualquer momento (exceto quando finalizada)
- **"Aplicar filtros"** — restaura os filtros DRE exatos do momento da criação da solicitação

---

## SLA (Service Level Agreement)

Cada solicitação tem um prazo baseado na prioridade:

| Prioridade | Prazo Padrão | Lembrete |
|-----------|-------------|----------|
| Normal    | 48 horas    | 24h antes |
| Urgente   | 24 horas    | 6h antes  |

**Indicadores visuais:**
- **Verde/cinza** — dentro do prazo
- **Amarelo** — próximo do vencimento (< 6 horas)
- **Vermelho** — prazo expirado

Os prazos são configuráveis pelo administrador na aba Admin → Solicitações.

---

## Notificações por Email

Emails são enviados automaticamente nas seguintes ações:

| Ação | Destinatário | Conteúdo |
|------|-------------|----------|
| Nova solicitação | Responsável | Assunto, dúvida, filtros, link direto |
| Resposta enviada | Solicitante | Mensagem da resposta, link direto |
| Aprovação | Responsável | Confirmação de aprovação |
| Devolução | Responsável | Motivo da devolução, link direto |
| Réplica | Responsável | Mensagem da réplica, link direto |

Todos os emails incluem:
- Header com branding DRE Raiz (gradiente azul)
- Resumo dos filtros DRE aplicados
- Badge de prioridade (se urgente)
- Botão "Abrir Solicitação" com link direto

---

## Badges e Contadores

### Sidebar
- **Badge laranja** (pulsante) — solicitações que precisam da sua resposta
- **Badge verde** (pulsante) — solicitações respondidas aguardando sua revisão

### DRE Gerencial
- Dentro do painel "Solicitações de Análise":
  - **Para responder** — badge laranja com contagem
  - **Aguardando resposta** — badge verde com contagem

### Atualização em Tempo Real
Os badges atualizam automaticamente via Supabase Realtime. Quando alguém responde, aprova ou devolve, os contadores se ajustam sem precisar recarregar a página.

---

## Permissões

| Papel | O que pode fazer |
|-------|-----------------|
| **Todos** | Criar solicitações, responder, aprovar, devolver |
| **Viewer** | Ver apenas solicitações onde é participante |
| **Manager** | Ver todas as solicitações (leitura) |
| **Admin** | Ver tudo + configurar SLA + dashboard admin |

---

## Perguntas Frequentes

**P: Posso criar uma solicitação sem estar na DRE Gerencial?**
R: Sim, pela guia "Solicitações" no Sidebar. Porém, o contexto DRE (filtros) não será capturado automaticamente.

**P: O que acontece quando o SLA expira?**
R: A solicitação recebe o indicador "Expirado" em vermelho, mas continua ativa para resposta.

**P: Posso reatribuir uma solicitação para outro responsável?**
R: Apenas administradores podem reatribuir (funcionalidade disponível no Admin).

**P: As solicitações finalizadas são deletadas?**
R: Não. Ficam visíveis com opacidade reduzida na seção "Finalizadas" e podem ser consultadas a qualquer momento.

**P: Quantas solicitações posso ter abertas ao mesmo tempo?**
R: Não há limite. A guia "Solicitações" com filtros e busca ajuda a gerenciar alto volume.
