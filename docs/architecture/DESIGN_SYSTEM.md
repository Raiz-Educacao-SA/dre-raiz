# Design System - Raiz Educação

Este documento descreve o sistema de design visual e UX da Raiz Educação, extraído do código-fonte do projeto AVA Raiz. É um guia genérico e reutilizável para replicar os padrões visuais e de interação em qualquer stack tecnológica.

---

## 1. VISÃO GERAL DO ESTILO

### Identidade Visual

O design system da Raiz Educação transmite uma identidade educacional moderna, acessível e acolhedora. A paleta de cores é ancorada em um **laranja vibrante (#F08700)** como cor primária, representando energia, criatividade e aprendizado ativo, combinado com um **turquesa suave (#7AC5BF)** como cor secundária, trazendo equilíbrio, tranquilidade e frescor.

A interface é **limpa e minimalista**, priorizando legibilidade e usabilidade. Utiliza **espaçamento generoso**, **bordas arredondadas suaves**, **sombras sutis** e **transições animadas** para criar uma experiência fluida e responsiva. O sistema de gamificação (badges, pontos, ranking) adiciona uma camada lúdica e motivacional à experiência, com ícones coloridos e micro-interações recompensadoras.

### Princípios de Design

- **Clareza e Legibilidade**: Textos com alto contraste, hierarquia tipográfica clara, ícones semânticos
- **Acessibilidade**: Cores com contraste adequado, estados visuais distintos (hover, focus, disabled)
- **Consistência**: Padrões repetidos em todos os componentes (bordas, espaçamentos, cores)
- **Responsividade**: Layout adaptável, comportamento mobile-first
- **Interatividade Sutil**: Transições suaves (0.2s-0.3s), hover states, micro-animações
- **Gamificação Visual**: Uso de badges, troféus, medalhes e elementos lúdicos para engajamento

---

## 2. PALETA DE CORES

### Cores Primárias (Laranja)

| Token              | HEX       | RGB              | HSL                | Uso                                    |
|--------------------|-----------|------------------|--------------------|----------------------------------------|
| primary-50         | #FFF4E6   | rgb(255,244,230) | hsl(30,100%,95%)   | Fundos suaves, highlights              |
| primary-100        | #FFE8CC   | rgb(255,232,204) | hsl(30,100%,90%)   | Badges, alertas suaves                 |
| primary-200        | #FFD199   | rgb(255,209,153) | hsl(30,100%,80%)   | Hover states, fundos secundários       |
| primary-300        | #FFBA66   | rgb(255,186,102) | hsl(30,100%,70%)   | Elementos decorativos                  |
| primary-400        | #FFA333   | rgb(255,163,51)  | hsl(30,100%,60%)   | Elementos de destaque secundário       |
| primary-500        | #F08700   | rgb(240,135,0)   | hsl(34,100%,47%)   | **CTA principal, botões, links ativos**|
| primary-600        | #CC7300   | rgb(204,115,0)   | hsl(34,100%,40%)   | Hover de botões primários              |
| primary-700        | #A35C00   | rgb(163,92,0)    | hsl(34,100%,32%)   | Active state, pressed                  |
| primary-800        | #7A4500   | rgb(122,69,0)    | hsl(34,100%,24%)   | Textos em fundos claros (raro)         |
| primary-900        | #522E00   | rgb(82,46,0)     | hsl(34,100%,16%)   | Textos escuros (uso mínimo)            |

### Cores Secundárias (Turquesa/Azul-Verde)

| Token              | HEX       | RGB              | HSL                | Uso                                    |
|--------------------|-----------|------------------|--------------------|----------------------------------------|
| secondary-50       | #F0FFFE   | rgb(240,255,254) | hsl(176,100%,97%)  | Fundos suaves, destaques               |
| secondary-100      | #E1FFFC   | rgb(225,255,252) | hsl(174,100%,94%)  | Badges info, alertas suaves            |
| secondary-200      | #C3FFF9   | rgb(195,255,249) | hsl(174,100%,88%)  | Hover states secundários               |
| secondary-300      | #A5FFF6   | rgb(165,255,246) | hsl(174,100%,82%)  | Elementos decorativos                  |
| secondary-400      | #8CEEF3   | rgb(140,238,243) | hsl(183,81%,75%)   | Elementos de destaque                  |
| secondary-500      | #7AC5BF   | rgb(122,197,191) | hsl(175,38%,63%)   | **Botões secundários, navegação ativa**|
| secondary-600      | #5FA39E   | rgb(95,163,158)  | hsl(176,28%,51%)   | Hover de botões secundários            |
| secondary-700      | #47817D   | rgb(71,129,125)  | hsl(176,29%,39%)   | Active state secundário                |
| secondary-800      | #305F5C   | rgb(48,95,92)    | hsl(176,33%,28%)   | Textos em fundos claros                |
| secondary-900      | #1A3D3B   | rgb(26,61,59)    | hsl(178,40%,17%)   | Textos escuros (raro)                  |

### Cores Neutras (Grays)

| Token              | HEX       | RGB              | Uso                                    |
|--------------------|-----------|------------------|----------------------------------------|
| gray-50            | #F9FAFB   | rgb(249,250,251) | Fundos de página, cards secundários    |
| gray-100           | #F3F4F6   | rgb(243,244,246) | Fundos de input, hover states          |
| gray-200           | #E5E7EB   | rgb(229,231,235) | Bordas padrão, divisores               |
| gray-300           | #D1D5DB   | rgb(209,213,219) | Bordas hover, elementos desabilitados  |
| gray-400           | #9CA3AF   | rgb(156,163,175) | Placeholders, textos terciários        |
| gray-500           | #6B7280   | rgb(107,114,128) | Textos secundários, labels             |
| gray-600           | #374151   | rgb(55,65,81)    | Textos padrão, ícones                  |
| gray-700           | #1F2937   | rgb(31,41,55)    | Textos de destaque                     |
| gray-800           | #111827   | rgb(17,24,39)    | **Headings principais**                |
| gray-900           | #0A0A0A   | rgb(10,10,10)    | Textos de alto contraste               |
| white              | #FFFFFF   | rgb(255,255,255) | Fundos de cards, modais                |
| black              | #000000   | rgb(0,0,0)       | Overlays (com opacidade)               |

### Cores de Status (Semânticas)

| Token              | HEX       | RGB              | Uso                                    |
|--------------------|-----------|------------------|----------------------------------------|
| success-50         | #F0FDF4   | rgb(240,253,244) | Fundos de mensagens de sucesso         |
| success-500        | #10B981   | rgb(16,185,129)  | Ícones, textos, badges de sucesso      |
| success-700        | #047857   | rgb(4,120,87)    | Hover de sucesso                       |
| error-50           | #FEE2E2   | rgb(254,226,226) | Fundos de mensagens de erro            |
| error-500          | #EF4444   | rgb(239,68,68)   | Ícones, textos, bordas de erro         |
| error-700          | #991B1B   | rgb(153,27,27)   | Hover de erro, badges de admin         |
| warning-50         | #FEF3C7   | rgb(254,243,199) | Fundos de avisos                       |
| warning-500        | #F59E0B   | rgb(245,158,11)  | Ícones, textos de aviso                |
| warning-700        | #78350F   | rgb(120,53,15)   | Hover de aviso                         |
| info-50            | #EFF6FF   | rgb(239,246,255) | Fundos de informações                  |
| info-500           | #3B82F6   | rgb(59,130,246)  | Ícones, textos informativos            |
| info-700           | #1E40AF   | rgb(30,64,175)   | Hover de info, badges de aluno         |

### Cores de Gamificação

| Token              | HEX       | RGB              | Uso                                    |
|--------------------|-----------|------------------|----------------------------------------|
| gold               | #F59E0B   | rgb(245,158,11)  | 1º lugar, medalhas de ouro, destaque   |
| silver             | #9CA3AF   | rgb(156,163,175) | 2º lugar, medalhas de prata            |
| bronze             | #D97706   | rgb(217,119,6)   | 3º lugar, medalhas de bronze           |
| common-badge       | #6B7280   | rgb(107,114,128) | Badges comuns                          |
| rare-badge         | #3B82F6   | rgb(59,130,246)  | Badges raras                           |
| epic-badge         | #8B5CF6   | rgb(139,92,246)  | Badges épicas                          |
| legendary-badge    | #F59E0B   | rgb(245,158,11)  | Badges lendárias                       |

### Gradientes

| Nome               | CSS                                             | Uso                                    |
|--------------------|-------------------------------------------------|----------------------------------------|
| primary-gradient   | linear-gradient(to right, #F08700, #7AC5BF)     | Barras de progresso, elementos destaque|
| secondary-gradient | linear-gradient(to right, #7AC5BF, #F08700)     | Botões especiais, badges               |
| gold-gradient      | linear-gradient(135deg, #F59E0B, #FBBF24)       | Pódio de 1º lugar                      |
| silver-gradient    | linear-gradient(135deg, #9CA3AF, #D1D5DB)       | Pódio de 2º lugar                      |
| bronze-gradient    | linear-gradient(135deg, #D97706, #F59E0B)       | Pódio de 3º lugar                      |

---

## 3. TIPOGRAFIA

### Famílias Tipográficas

| Uso                | Família                                          | Fallback                               |
|--------------------|--------------------------------------------------|----------------------------------------|
| Corpo de texto     | Arial                                            | Helvetica, sans-serif                  |
| Headings           | Arial                                            | Helvetica, sans-serif                  |
| Monospace (código) | 'Courier New'                                    | Courier, monospace                     |

**Nota**: O projeto usa Arial como fonte padrão. Para melhorar a tipografia, recomenda-se considerar fontes modernas como Inter, Roboto ou Poppins.

### Escala de Tamanhos

| Token        | px    | rem   | pt    | Line-height | Uso                                    |
|--------------|-------|-------|-------|-------------|----------------------------------------|
| text-xs      | 11px  | 0.69  | 8.25  | 1.4         | Badges, meta info, legendas pequenas   |
| text-sm      | 12px  | 0.75  | 9     | 1.5         | Captions, timestamps, textos auxiliares|
| text-base    | 13px  | 0.81  | 9.75  | 1.5         | Labels de formulário, corpo secundário |
| text-md      | 14px  | 0.88  | 10.5  | 1.6         | **Corpo de texto padrão, botões**      |
| text-lg      | 16px  | 1.00  | 12    | 1.6         | Subtítulos, textos de destaque         |
| text-xl      | 20px  | 1.25  | 15    | 1.4         | Títulos de seções                      |
| text-2xl     | 22px  | 1.38  | 16.5  | 1.4         | Títulos de cards importantes (mobile)  |
| text-3xl     | 28px  | 1.75  | 21    | 1.3         | **Títulos principais de página**       |
| text-4xl     | 32px  | 2.00  | 24    | 1.2         | Headings hero (raro)                   |

### Pesos (Font-weight)

| Token          | Valor | Uso                                         |
|----------------|-------|---------------------------------------------|
| light          | 300   | Textos decorativos (uso mínimo)            |
| regular        | 400   | Corpo de texto padrão                       |
| medium         | 500   | Labels, navegação, textos secundários       |
| semibold       | 600   | **Botões, tabs, títulos de cards**          |
| bold           | 700   | **Headings, valores numéricos, destaque**   |

### Estilos de Texto Nomeados

| Nome               | Tamanho | Peso     | Line-height | Cor           | Uso                                    |
|--------------------|---------|----------|-------------|---------------|----------------------------------------|
| Page Title         | 28px    | bold     | 1.3         | gray-800      | Título principal de cada página        |
| Section Title      | 20px    | semibold | 1.4         | gray-800      | Títulos de seções dentro de páginas    |
| Card Title         | 16px    | semibold | 1.4         | gray-800      | Títulos de cards e componentes         |
| Body               | 14px    | regular  | 1.6         | gray-600      | Texto de corpo padrão                  |
| Body Small         | 13px    | regular  | 1.5         | gray-600      | Texto de corpo secundário              |
| Caption            | 12px    | regular  | 1.5         | gray-500      | Legendas, descrições curtas            |
| Meta Info          | 11px    | medium   | 1.4         | gray-400      | Timestamps, contadores                 |
| Label              | 13px    | medium   | 1.5         | gray-700      | Labels de formulário                   |
| Button Text        | 14px    | semibold | 1.0         | white/gray-700| Textos de botões                       |
| Link               | 14px    | medium   | 1.6         | primary-500   | Links de texto, underline no hover     |
| Code               | 13px    | regular  | 1.4         | gray-600      | Código, valores técnicos (monospace)   |

---

## 4. ESPAÇAMENTO E GRID

### Unidade Base

**Base de espaçamento**: 4px (sistema 4-point grid)

### Escala de Spacing

| Token      | px     | rem    | Uso                                    |
|------------|--------|--------|----------------------------------------|
| spacing-0  | 0px    | 0      | Reset de margens/paddings              |
| spacing-1  | 4px    | 0.25   | Gaps mínimos entre elementos inline    |
| spacing-2  | 8px    | 0.5    | **Padding de botões pequenos, gaps**   |
| spacing-3  | 12px   | 0.75   | **Padding padrão de botões, badges**   |
| spacing-4  | 16px   | 1.0    | **Padding de cards, gaps entre items** |
| spacing-5  | 20px   | 1.25   | Padding de containers médios           |
| spacing-6  | 24px   | 1.5    | **Margens entre seções**               |
| spacing-8  | 32px   | 2.0    | **Padding de páginas, espaçamento macro**|
| spacing-10 | 40px   | 2.5    | Padding de modais                      |
| spacing-12 | 48px   | 3.0    | Espaçamento de hero sections           |
| spacing-16 | 64px   | 4.0    | Espaçamento extra-largo                |
| spacing-20 | 80px   | 5.0    | Espaçamento de seções grandes (raro)   |

### Sistema de Grid

| Propriedade        | Valor                                   |
|--------------------|-----------------------------------------|
| Colunas            | 12 colunas (flexível)                   |
| Gutter (gap)       | 16px (spacing-4)                        |
| Margem lateral     | 16px (mobile), 32px (desktop)           |
| Grid display       | CSS Grid ou Flexbox                     |

### Container Widths

| Breakpoint  | Max-width | Uso                                    |
|-------------|-----------|----------------------------------------|
| sm          | 640px     | Mobile landscape, tablets pequenos     |
| md          | 768px     | Tablets                                |
| lg          | 1024px    | Laptops, desktop pequeno               |
| xl          | 1280px    | Desktop médio                          |
| 2xl         | 1536px    | Desktop grande (raro)                  |

### Breakpoints Responsivos

| Nome       | Min-width | Uso                                    |
|------------|-----------|----------------------------------------|
| mobile     | 0px       | Default (mobile-first)                 |
| sm         | 640px     | Tablet pequeno                         |
| md         | 768px     | Tablet                                 |
| lg         | 1024px    | **Desktop (sidebar fixa, layout 2-col)**|
| xl         | 1280px    | Desktop amplo                          |

**Comportamento chave**:
- Sidebar: hambúrguer < 1024px, fixa >= 1024px
- Cards: 1 coluna < 640px, 2 colunas >= 640px, 3 colunas >= 1024px
- Títulos: reduzem em 20-30% no mobile

---

## 5. BORDAS E SOMBRAS

### Border Radius

| Token          | Valor  | Uso                                    |
|----------------|--------|----------------------------------------|
| radius-none    | 0px    | Elementos retangulares (raro)          |
| radius-sm      | 4px    | Badges, tags pequenas                  |
| radius-md      | 6px    | Botões pequenos, inputs                |
| radius-DEFAULT | 8px    | **Botões, cards, inputs padrão**       |
| radius-lg      | 12px   | **Cards principais, modais**           |
| radius-xl      | 16px   | Containers grandes, header de perfil   |
| radius-full    | 9999px | **Avatares, pills, badges circulares** |

### Border Widths

| Token          | Valor  | Uso                                    |
|----------------|--------|----------------------------------------|
| border-DEFAULT | 1px    | Bordas padrão de cards, inputs         |
| border-2       | 2px    | **Bordas de destaque, sidebar, active**|
| border-3       | 3px    | Bordas de foco, estados especiais      |
| border-4       | 4px    | Bordas de avatar no perfil             |

### Box Shadows

| Token       | Valor                                      | Uso                                    |
|-------------|--------------------------------------------|----------------------------------------|
| shadow-sm   | 0 1px 3px rgba(0,0,0,0.1)                  | **Cards padrão, elementos sutis**      |
| shadow-md   | 0 4px 12px rgba(0,0,0,0.15)                | **Cards hover, dropdowns**             |
| shadow-lg   | 0 8px 24px rgba(0,0,0,0.2)                 | Modais, elementos elevados             |
| shadow-xl   | 0 20px 60px rgba(0,0,0,0.3)                | Modais principais, overlays importantes|
| shadow-none | none                                       | Reset de sombras                       |

**Sombras coloridas** (usadas em elementos específicos):
- `0 2px 8px rgba(240,135,0,0.2)` — Sombra laranja (hover de botões primários)
- `0 4px 12px rgba(240,135,0,0.3)` — Sombra laranja intensa (cards ativos)
- `0 2px 8px rgba(122,197,191,0.2)` — Sombra turquesa (elementos secundários)
- `0 4px 12px rgba(122,197,191,0.4)` — Sombra turquesa intensa (badges)

### Opacidades Utilizadas

| Valor | Uso                                         |
|-------|---------------------------------------------|
| 0.1   | Fundos de overlay sutis                     |
| 0.2   | Fundos de botões ghost, elementos decorativos|
| 0.3   | Bordas transparentes, divisores suaves      |
| 0.5   | **Overlays de modal**                       |
| 0.6   | Overlays de imagem ao hover                 |
| 0.7   | Elementos desabilitados                     |
| 0.8   | Confetti, elementos em movimento            |
| 0.9   | Textos secundários em fundos coloridos      |

---

## 6. COMPONENTES

Todos os componentes seguem um padrão visual consistente com bordas arredondadas, sombras sutis, e transições suaves.

### 6.1. Button (Botão)

#### Anatomia
- Container com padding horizontal e vertical
- Texto centralizado com ícone opcional (esquerda ou direita)
- Border radius padrão de 8px
- Transições de 0.2s para todas as propriedades

#### Variantes

**Primary** (Ação principal)
- Background: `primary-500` (#F08700)
- Texto: `white`, peso `semibold`
- Hover: escala de 1.02-1.05, shadow laranja
- Active: background `primary-700`
- Disabled: opacity 0.5, cursor not-allowed

**Secondary** (Ação secundária)
- Background: `secondary-500` (#7AC5BF)
- Texto: `white`, peso `semibold`
- Hover: escala de 1.02, shadow turquesa
- Active: background `secondary-700`
- Disabled: opacity 0.5

**Outline** (Ação terciária)
- Background: `transparent` ou `white`
- Border: 1px solid `gray-300`
- Texto: `gray-700`, peso `semibold`
- Hover: background `gray-50`, border `gray-400`
- Active: background `gray-100`
- Disabled: opacity 0.5

**Ghost** (Ação sutil)
- Background: `transparent`
- Border: none
- Texto: `gray-600`, peso `medium`
- Hover: background `gray-100`
- Active: background `gray-200`
- Disabled: opacity 0.5

#### Tamanhos

| Tamanho | Padding         | Font-size | Height | Min-width |
|---------|-----------------|-----------|--------|-----------|
| sm      | 6px 16px        | 13px      | 32px   | 80px      |
| md      | 10px 24px       | 14px      | 40px   | 100px     |
| lg      | 12px 32px       | 16px      | 48px   | 120px     |

#### Estados

- **Default**: Cor e sombra padrão da variante
- **Hover**: translateY(-2px), box-shadow aumentada
- **Active/Pressed**: background mais escuro, translateY(0)
- **Focus**: outline/ring de 2px em `primary-500` ou `blue-500`
- **Disabled**: opacity 0.5, cursor not-allowed, sem hover
- **Loading**: spinner/icon animado, texto "Carregando..."

#### Especificações Visuais

- Border-radius: 8px (padrão), 6px (small)
- Transition: `all 0.2s ease` ou `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Font-weight: 600 (semibold)
- Letter-spacing: normal
- Text-transform: none (capitalização manual)

---

### 6.2. Input / TextField

#### Anatomia
- Label acima do campo (opcional)
- Input field com padding interno
- Ícone interno opcional (esquerda ou direita)
- Mensagem de erro/ajuda abaixo (opcional)
- Border de 1px ao redor

#### Variantes

**Text** (padrão)
- Background: `white`
- Border: 1px solid `gray-300`
- Texto: `gray-700`, size 14px
- Placeholder: `gray-400`

**Password**
- Igual a Text
- Ícone de olho (Eye/EyeOff) à direita para toggle de visibilidade

**Email**
- Igual a Text
- Validação de formato

**Textarea**
- Altura variável (min-height)
- Resize vertical habilitado

#### Tamanhos

| Tamanho | Padding      | Font-size | Height |
|---------|--------------|-----------|--------|
| sm      | 6px 12px     | 13px      | 36px   |
| md      | 8px 16px     | 14px      | 40px   |
| lg      | 10px 20px    | 16px      | 48px   |

#### Estados

- **Default**: border `gray-300`, background `white`
- **Hover**: border `gray-400`
- **Focus**: ring de 2px `primary-500`, border `primary-500`
- **Error**: border `error-500`, ring `error-500`, texto de erro abaixo
- **Disabled**: background `gray-100`, cursor not-allowed, opacity 0.6
- **Success**: border `success-500` (opcional)

#### Especificações Visuais

- Border-radius: 8px (padrão), 6px (small)
- Transition: `all 0.2s ease`
- Label: font-size 13px, color `gray-700`, weight `medium`, margin-bottom 4px
- Error text: font-size 12px, color `error-500`, margin-top 4px

---

### 6.3. Select / Dropdown

#### Anatomia
- Trigger button com texto selecionado
- Ícone de chevron (seta para baixo) à direita
- Menu dropdown flutuante (z-index alto)
- Lista de opções com scroll

#### Variantes

**Single Select** (seleção única)
- Mostra o valor selecionado no trigger
- Menu fecha ao selecionar

**Multi Select** (seleção múltipla)
- Mostra "X selecionados" no trigger
- Chips abaixo do trigger com opções selecionadas
- Botões "Selecionar todos" / "Limpar"
- Checkbox ao lado de cada opção
- Menu permanece aberto

#### Estados

- **Closed**: trigger com border `gray-300`
- **Open**: trigger com ring `primary-500`, menu visível
- **Hover (item)**: background `gray-50`
- **Selected (item)**: background `primary-50`, checkmark visível
- **Disabled**: background `gray-100`, cursor not-allowed

#### Especificações Visuais

- Trigger: padding 8px 12px, border-radius 8px, border 1px `gray-300`
- Menu: border-radius 8px, shadow-lg, max-height 320px, overflow-y auto
- Option: padding 8px 12px, font-size 14px, hover `gray-50`
- Transition: `all 0.2s ease`

---

### 6.4. Checkbox / Radio / Toggle

#### Checkbox

**Anatomia**:
- Box de 16x16px
- Checkmark (ícone de check) ao selecionar
- Label à direita (opcional)

**Estados**:
- **Unchecked**: border 1px `gray-300`, background `white`
- **Checked**: border `primary-600` ou `blue-600`, background `primary-600` ou `blue-600`, checkmark `white`
- **Hover**: border `gray-400` (unchecked), scale 1.05 (checked)
- **Disabled**: opacity 0.5, cursor not-allowed
- **Indeterminate**: traço horizontal (raro)

**Especificações**:
- Border-radius: 4px (checkbox)
- Size: 16x16px (padrão), 20x20px (large)
- Checkmark: ícone de 12x12px

#### Radio

**Anatomia**:
- Círculo de 16x16px
- Ponto interno ao selecionar
- Label à direita

**Estados**:
- **Unchecked**: border 1px `gray-300`, background `white`
- **Checked**: border `primary-600`, dot interno de 8x8px `primary-600`
- **Hover**: border `gray-400`
- **Disabled**: opacity 0.5

**Especificações**:
- Border-radius: 50% (círculo)
- Size: 16x16px
- Inner dot: 8x8px

#### Toggle (Switch)

**Anatomia**:
- Track retangular de 44x24px
- Knob circular de 20x20px que desliza

**Estados**:
- **Off**: track `gray-300`, knob à esquerda
- **On**: track `primary-500`, knob à direita
- **Hover**: track com opacity aumentada
- **Disabled**: opacity 0.5

**Especificações**:
- Border-radius: 9999px (pill)
- Transition: `all 0.3s ease`
- Knob position: left 2px (off), right 2px (on)

---

### 6.5. Card

#### Anatomia
- Container com padding interno
- Background branco
- Border de 1px ou 2px
- Sombra sutil
- Conteúdo interno (título, descrição, footer)

#### Variantes

**Default** (card padrão)
- Background: `white`
- Border: 1px solid `gray-200`
- Shadow: `shadow-sm`
- Hover: translateY(-4px), shadow-md

**Elevated** (card elevado)
- Background: `white`
- Border: none
- Shadow: `shadow-md`
- Hover: shadow-lg

**Outlined** (apenas borda)
- Background: `white`
- Border: 2px solid `gray-200`
- Shadow: none
- Hover: border `gray-300`

**Active** (card selecionado)
- Background: `white`
- Border: 2px solid `primary-500` ou `secondary-500`
- Shadow: `0 8px 24px rgba(240,135,0,0.2)`

#### Tamanhos

| Tamanho | Padding      | Border-radius |
|---------|--------------|---------------|
| sm      | 12px         | 8px           |
| md      | 16px         | 12px          |
| lg      | 20px         | 12px          |

#### Estados

- **Default**: sombra e cor padrão
- **Hover**: translateY(-4px), sombra aumentada, border colorida (se aplicável)
- **Active/Pressed**: nenhuma transformação
- **Disabled**: opacity 0.6, cursor not-allowed

#### Especificações Visuais

- Border-radius: 12px (padrão)
- Transition: `all 0.3s ease`
- Overflow: hidden (para thumbnails)

---

### 6.6. Modal / Dialog

#### Anatomia
- Overlay escurecido (backdrop)
- Container central com conteúdo
- Header com título e botão de fechar (X)
- Body com conteúdo principal
- Footer com botões de ação

#### Variantes

**Default** (modal padrão)
- Overlay: background `rgba(0,0,0,0.5)`, backdrop-filter blur(4px)
- Container: background `white`, max-width 500px
- Header: background `secondary-500`, text `white`

**Large** (modal grande)
- Max-width: 800px-1024px

**Full-screen** (tela cheia no mobile)
- Width: 100%, height: 100vh no mobile

#### Estados

- **Opening**: animação de slide-in de baixo para cima ou fade-in
- **Closing**: animação de slide-out ou fade-out
- **Overlay click**: fecha o modal

#### Especificações Visuais

- Border-radius: 16px (padrão), 12px (header/footer)
- Shadow: `shadow-xl`
- Padding: header/footer 24px, body 24px-32px
- Transition: `all 0.3s ease-out`
- Animation: `modalSlideIn 0.3s ease-out`
- Z-index: 999 (overlay), 1000 (modal)

---

### 6.7. Toast / Notification / Alert

#### Anatomia
- Container com ícone à esquerda
- Mensagem de texto
- Botão de fechar (X) opcional à direita
- Barra de progresso na base (auto-dismiss)

#### Variantes

**Success**
- Background: `success-50`
- Border: `success-500`
- Ícone: checkmark, cor `success-500`
- Texto: `success-700`

**Error**
- Background: `error-50`
- Border: `error-500`
- Ícone: X ou alerta, cor `error-500`
- Texto: `error-700`

**Warning**
- Background: `warning-50`
- Border: `warning-500`
- Ícone: triângulo de alerta, cor `warning-500`
- Texto: `warning-700`

**Info**
- Background: `info-50`
- Border: `info-500`
- Ícone: i ou sino, cor `info-500`
- Texto: `info-700`

#### Estados

- **Entering**: slide-in de cima para baixo ou fade-in
- **Exiting**: fade-out com slide-up
- **Hover (close button)**: background escurecido

#### Especificações Visuais

- Border-radius: 8px
- Padding: 12px 16px
- Shadow: `shadow-md`
- Border: 2px solid (cor da variante) ou border-left de 4px
- Transition: `all 0.3s ease`
- Position: fixed top-right, z-index 9999

---

### 6.8. Badge / Tag / Chip

#### Anatomia
- Container inline com padding pequeno
- Texto curto ou ícone
- Border radius alto (pill) ou médio (square)
- Opcional: botão de remover (X)

#### Variantes

**Badge** (indicador)
- Tamanho pequeno (padding 2px 8px)
- Font-size 11px, weight 600
- Border-radius: 4px (square) ou 9999px (pill)
- Cores: primary-100/primary-800, success-100/success-800, error-100/error-800

**Tag** (categoria)
- Tamanho médio (padding 4px 12px)
- Font-size 12px, weight 500
- Border-radius: 9999px (pill)
- Background: `gray-100`, text `gray-700`
- Hover: background `gray-200`

**Chip** (seleção removível)
- Tamanho médio (padding 4px 12px)
- Ícone de X à direita
- Border-radius: 9999px (pill)
- Background: `blue-100`, text `blue-800`
- Hover (X): background mais escuro

#### Estados

- **Default**: cor e padding padrão
- **Hover**: background mais escuro (chips/tags)
- **Active**: sem estado especial
- **Removable**: botão X com hover

#### Especificações Visuais

- Border-radius: 4px (badge square), 9999px (pill/chip)
- Font-size: 10-12px
- Font-weight: 500-700 (depende da importância)
- Padding: 2px 8px (badge), 4px 12px (tag/chip)
- Transition: `all 0.2s ease`

---

### 6.9. Table (Tabela)

#### Anatomia
- Container com overflow-x auto (responsivo)
- Header fixo com fundo diferenciado
- Linhas (rows) com hover
- Células (cells) com padding
- Borda entre linhas

#### Variantes

**Default** (tabela padrão)
- Header: background `gray-50`, text `gray-600`, weight 600
- Rows: background `white`, border-bottom `gray-200`
- Hover: background `gray-50`

**Striped** (linhas alternadas)
- Rows ímpares: background `gray-50`
- Rows pares: background `white`

**Bordered** (com bordas)
- Border 1px `gray-200` ao redor de cada célula

**Compact** (espaçamento reduzido)
- Padding de células: 8px 12px (vs. 16px 20px no padrão)

#### Estados

- **Default**: cor padrão
- **Hover (row)**: background `gray-50`
- **Selected (row)**: background `primary-50`, border-left 4px `primary-500`
- **Sortable (header)**: cursor pointer, ícone de sort ao hover

#### Especificações Visuais

- Border-radius: 12px (container)
- Cell padding: 16px 20px (padrão), 8px 12px (compact)
- Font-size: 14px (body), 13px (header)
- Overflow-x: auto (responsivo)
- Header: sticky top 0 (opcional)

---

### 6.10. Tabs (Abas)

#### Anatomia
- Container horizontal com lista de tabs
- Indicador de tab ativa (underline ou background)
- Conteúdo da tab ativa abaixo

#### Variantes

**Default** (underline)
- Tabs: padding 12px 20px, text `gray-500`, weight 600
- Active: text `primary-500`, underline de 3px `secondary-500`
- Hover: text `gray-700`
- Border-bottom 2px `gray-200` na base

**Pills** (com background)
- Tabs: padding 10px 20px, border 1px `gray-200`, border-radius 8px
- Active: background `primary-500`, text `white`, border none
- Hover: background `gray-50`, border `gray-300`

#### Estados

- **Default**: cor neutra
- **Active**: cor primária, indicador visível
- **Hover**: cor intermediária
- **Disabled**: opacity 0.5, cursor not-allowed

#### Especificações Visuais

- Tab padding: 12px 20px
- Font-size: 14px
- Font-weight: 600
- Transition: `all 0.2s ease`
- Indicator: height 3px, border-radius 3px 3px 0 0
- Gap entre tabs: 0px (default), 8px (pills)

---

### 6.11. Navigation (Navbar, Sidebar, Breadcrumb)

#### Navbar (Header)

**Anatomia**:
- Container horizontal fixo no topo
- Logo à esquerda
- Navegação central
- User menu à direita

**Especificações**:
- Height: 64px (padrão)
- Background: `white`
- Border-bottom: 2px solid `primary-500`
- Shadow: `shadow-sm`
- Padding: 16px 32px

#### Sidebar (Menu Lateral)

**Anatomia**:
- Container vertical fixo à esquerda
- Logo no topo
- Lista de itens de navegação
- User info na base
- Toggle button (hambúrguer no mobile)

**Especificações**:
- Width: 256px (desktop), 0px + overlay (mobile fechado)
- Background: `white`
- Border-right: 2px solid `primary-500`
- Shadow: `0 10px 15px -3px rgba(0,0,0,0.1)`
- Transition: `transform 0.3s cubic-bezier(0.4,0,0.2,1)`
- Item padding: 12px, border-radius 8px
- Active item: background `secondary-500`, text `white`
- Hover item: background `gray-100`
- Z-index: 40 (sidebar), 30 (overlay)

#### Breadcrumb

**Anatomia**:
- Lista horizontal de links
- Separadores (/) entre itens
- Último item não clicável (ativo)

**Especificações**:
- Font-size: 13px
- Color: links `gray-500`, ativo `gray-800`
- Separator: color `gray-300`
- Hover: color `primary-500`

---

### 6.12. Avatar

#### Anatomia
- Imagem circular ou fallback com iniciais
- Badge opcional no canto inferior direito (status ou conquista)
- Border opcional

#### Variantes

**Default** (sem badge)
- Imagem: border-radius 50%, object-fit cover
- Fallback: background `secondary-500`, text `white`, weight 700

**With Badge** (com selo)
- Badge: círculo de 30-35% do tamanho do avatar
- Posição: bottom -2px, right -2px
- Border: 2px solid `white`, box-shadow
- Background: cor de raridade do badge

#### Tamanhos

| Tamanho | Diameter | Badge size | Font-size (fallback) |
|---------|----------|------------|----------------------|
| xs      | 24px     | 8px        | 10px                 |
| sm      | 32px     | 12px       | 13px                 |
| md      | 40px     | 14px       | 16px                 |
| lg      | 56px     | 20px       | 22px                 |
| xl      | 72px     | 24px       | 28px                 |
| 2xl     | 112px    | 40px       | 44px                 |

#### Estados

- **Default**: sem efeito
- **Hover**: scale 1.05 (se clicável)
- **Active**: border colorida (opcional)
- **Badge hover**: scale 1.15

#### Especificações Visuais

- Border-radius: 50% (avatar), 50% (badge)
- Fallback initials: 2 primeiras letras do nome
- Transition: `all 0.2s ease`

---

### 6.13. Tooltip

#### Anatomia
- Container flutuante pequeno
- Texto curto ou ícone de info
- Seta apontando para o elemento alvo (opcional)

#### Variantes

**Default** (escuro)
- Background: `gray-800` ou `gray-900`
- Text: `white`, size 12px
- Border-radius: 6px
- Padding: 6px 10px

**Light** (claro)
- Background: `white`
- Text: `gray-700`
- Border: 1px solid `gray-200`
- Shadow: `shadow-md`

#### Estados

- **Hidden**: opacity 0, pointer-events none
- **Visible**: opacity 1, fade-in animation

#### Especificações Visuais

- Border-radius: 6px
- Font-size: 12px
- Max-width: 200px
- Z-index: 9999
- Transition: `opacity 0.2s ease`
- Position: absolute, top/bottom/left/right calculado dinamicamente

---

### 6.14. Pagination

#### Anatomia
- Container horizontal
- Botões anterior/próximo
- Números de página
- Informação de total (opcional)

#### Variantes

**Default** (com números)
- Buttons: padding 6px 12px, border 1px `gray-300`, border-radius 6px
- Active: background `primary-500`, text `white`
- Hover: background `gray-50`

**Simple** (apenas anterior/próximo)
- Apenas 2 botões sem números intermediários

#### Estados

- **Active page**: background `primary-500`, text `white`
- **Hover**: background `gray-50`
- **Disabled**: opacity 0.5, cursor not-allowed

#### Especificações Visuais

- Button size: 32x32px (quadrado)
- Gap: 4px entre botões
- Font-size: 14px
- Transition: `all 0.2s ease`

---

### 6.15. Progress / Skeleton / Loader

#### Progress Bar

**Anatomia**:
- Track (barra de fundo)
- Fill (barra de progresso)
- Label com porcentagem (opcional)

**Especificações**:
- Height: 6px (sm), 10px (md), 14px (lg)
- Border-radius: 9999px (pill)
- Track: background `gray-200`
- Fill: background `primary-500` ou gradiente `linear-gradient(to right, #F08700, #7AC5BF)`
- Fill transition: `width 0.6s ease-in-out`
- Shimmer effect: animação de brilho passando pela barra

**Estados**:
- **0%**: fill invisível
- **1-99%**: fill visível com largura proporcional
- **100%**: fill completo, cor success (opcional)

#### Skeleton Loader

**Anatomia**:
- Blocos cinza com bordas arredondadas
- Animação de shimmer (onda de luz passando)

**Especificações**:
- Background: `gray-200`
- Border-radius: 8px (padrão)
- Animation: `shimmer 1.5s infinite`
- Shimmer gradient: `linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)`

#### Spinner Loader

**Anatomia**:
- Círculo com borda animada girando

**Especificações**:
- Size: 16px (sm), 24px (md), 40px (lg)
- Border: 4px solid `primary-200`, border-top `primary-500`
- Border-radius: 50%
- Animation: `spin 1s linear infinite`

---

### 6.16. Empty State

#### Anatomia
- Container com padding grande
- Ícone ou emoji grande centralizado
- Título descritivo
- Mensagem explicativa
- Botão de ação opcional

#### Variantes

**Default** (neutro)
- Background: `gray-50`
- Border: 2px dashed `gray-200`
- Icon: 64px, emoji ou SVG
- Title: `gray-800`, 20px, weight 600
- Message: `gray-600`, 14px

**Success** (confirmação)
- Background: `success-50`
- Border: `success-500`
- Title: `success-700`
- Message: `success-600`

**Warning** (aviso)
- Background: `warning-50`
- Border: `warning-500`
- Title: `warning-700`
- Message: `warning-600`

**Info** (informação)
- Background: `info-50`
- Border: `info-500`
- Title: `info-700`
- Message: `info-600`

#### Especificações Visuais

- Padding: 48px 24px
- Border-radius: 12px
- Max-width: 500px
- Text-align: center
- Icon size: 64px
- Title margin-bottom: 16px
- Message margin-bottom: 24px (se houver botão)

---

### 6.17. Timeline (Linha do Tempo)

#### Anatomia
- Linha vertical conectando eventos
- Ícones circulares em cada evento
- Cards com conteúdo de cada evento
- Timestamps

#### Especificações Visuais

- Line: width 2px, color `gray-200`, position absolute left 19px
- Icon container: 40x40px, border-radius 50%, background `primary-500`, border 3px solid `white`, shadow
- Icon: 18px, emoji ou SVG
- Card: padding 12px 16px, border 1px `gray-200`, border-radius 8px
- Card hover: border `primary-500`, shadow sutil
- Gap entre eventos: 16px
- Timestamp: font-size 11px, color `gray-400`

---

### 6.18. Leaderboard (Ranking)

#### Anatomia
- Pódio visual para top 3 (1º, 2º, 3º)
- Tabela para o restante
- Avatares, nomes, pontos, streaks

#### Pódio (Top 3)

**Especificações**:
- Container: flex, align items flex-end, gap 16px, background `gray-50`, border-radius 12px
- Ordem: 2º (esquerda, height 140px), 1º (centro, height 180px), 3º (direita, height 120px)
- Cor do pódio: 1º `gold`, 2º `silver`, 3º `bronze`
- Medalha: emoji de 32px, position absolute abaixo do avatar
- Avatar: border 4px solid (cor do pódio), shadow colorida
- Texto: nome truncado, pontos em destaque

#### Tabela

**Especificações**:
- Header: background `gray-50`, border-bottom `gray-200`, font-size 13px, weight 600, color `gray-600`
- Row: padding 16px 20px, border-bottom `gray-100`, hover `gray-50`
- Current user row: background `orange-50`, border-left 4px `primary-500`, badge "VOCÊ"
- Columns: Posição (80px), Nome (flex 1), Pontos (120px), Sequência (120px), Recorde (120px)
- Medal icon: 24px para top 3, senão "#rank" com color `gray-600`

---

## 7. ICONOGRAFIA

### Biblioteca de Ícones

**Biblioteca utilizada**: Lucide React (https://lucide.dev)

**Alternativas compatíveis**:
- Heroicons (heroicons.com)
- Feather Icons (feathericons.com)
- Phosphor Icons (phosphoricons.com)

### Tamanhos Padrão

| Contexto           | Size (px) | Uso                                    |
|--------------------|-----------|----------------------------------------|
| Inline text        | 16px      | Ícones ao lado de texto                |
| Button             | 16-20px   | Ícones em botões                       |
| Navigation         | 20px      | Ícones de menu/sidebar                 |
| Card header        | 20-24px   | Ícones de título de cards              |
| Empty state        | 64px      | Ícones grandes de estado vazio         |
| Modal header       | 24px      | Ícones de cabeçalho de modal           |

### Estilo

- **Stroke**: 2px (padrão), 1.5px (thin), 2.5px (bold)
- **Tipo**: outline (stroke, sem fill)
- **Caps**: round (linecap e linejoin arredondados)
- **Cor padrão**: herda do texto (`currentColor`)

### Ícones Comuns

| Contexto              | Ícone                     | Nome Lucide         |
|-----------------------|---------------------------|---------------------|
| Menu/hambúrguer       | ☰                         | Menu                |
| Fechar                | ✕                         | X                   |
| Buscar                | 🔍                        | Search              |
| Usuário               | 👤                        | User                |
| Configurações         | ⚙️                        | Settings            |
| Editar                | ✏️                        | Edit2, Pencil       |
| Deletar               | 🗑️                        | Trash2              |
| Adicionar             | ➕                        | Plus                |
| Salvar                | 💾                        | Save                |
| Confirmar             | ✓                         | Check               |
| Erro                  | ⚠️                        | AlertCircle         |
| Info                  | ℹ️                        | Info                |
| Seta direita          | →                         | ChevronRight        |
| Seta esquerda         | ←                         | ChevronLeft         |
| Seta baixo            | ↓                         | ChevronDown         |
| Upload                | ⬆️                        | Upload              |
| Download              | ⬇️                        | Download            |
| Email                 | 📧                        | Mail                |
| Telefone              | 📞                        | Phone               |
| Localização           | 📍                        | MapPin              |
| Calendário            | 📅                        | Calendar            |
| Relógio               | 🕐                        | Clock               |
| Olho (mostrar senha)  | 👁️                        | Eye                 |
| Olho riscado (ocultar)| 👁️‍🗨️                      | EyeOff              |
| Estrela               | ⭐                        | Star                |
| Coração               | ❤️                        | Heart               |
| Troféu                | 🏆                        | Trophy              |
| Casa/Início           | 🏠                        | Home                |
| Livro/Trilha          | 📚                        | Book                |
| Fórum/Chat            | 💬                        | MessageSquare       |
| Ranking               | 📊                        | BarChart3           |

### Ícones de Status

| Status    | Emoji | Cor           |
|-----------|-------|---------------|
| Sucesso   | ✅    | success-500   |
| Erro      | ❌    | error-500     |
| Aviso     | ⚠️    | warning-500   |
| Info      | ℹ️    | info-500      |
| Carregando| ⏳    | gray-400      |

### Ícones de Conteúdo (Tipos de Lição)

| Tipo      | Emoji | Descrição         |
|-----------|-------|-------------------|
| Vídeo     | 🎥    | Conteúdo em vídeo |
| PDF       | 📄    | Documento PDF     |
| Texto     | 📝    | Artigo de texto   |
| Quiz      | ❓    | Questionário      |
| Formulário| 📋    | Formulário        |
| SCORM     | 📦    | Pacote SCORM      |

---

## 8. PADRÕES DE LAYOUT

### Estrutura de Página Padrão

**Composição**:
1. **Sidebar** (fixa à esquerda, 256px, desktop >= 1024px)
2. **Content Area** (flex 1, padding 32px, background `gray-50`)
3. **Overlay** (mobile, quando sidebar aberta)

**Sidebar**:
- Logo no topo (padding 16px)
- Navegação (lista vertical, padding 12px)
- User info na base (padding 16px, border-top)

**Content Area**:
- Page title (28px, bold, margin-bottom 24px)
- Sections (cards, tables, grids)
- Footer (opcional, margin-top auto)

**Responsividade**:
- Mobile (< 1024px): sidebar escondida por padrão, hambúrguer menu
- Desktop (>= 1024px): sidebar fixa, content com margin-left 256px

---

### Padrões de Formulário

**Label Position**: Acima do campo (vertical)

**Estrutura**:
```
Label (13px, gray-700, medium, margin-bottom 4px)
Input (padding 8px 16px, border-radius 8px)
Helper text ou erro (12px, gray-500/error-500, margin-top 4px)
```

**Spacing entre campos**: 16px (spacing-4)

**Required indicator**: Asterisco vermelho (*) após o label

**Error display**:
- Border do input vira `error-500`
- Texto de erro abaixo do input, cor `error-500`

**Success display** (opcional):
- Border do input vira `success-500`
- Checkmark à direita do input

**Buttons**:
- Posição: footer do form, alinhados à direita
- Ordem: Cancelar (outline) à esquerda, Confirmar (primary) à direita
- Gap: 12px entre botões

---

### Padrões de Lista e Tabela

**Lista de Cards**:
- Grid com gap 16px
- Colunas: 1 (mobile), 2 (tablet >= 640px), 3 (desktop >= 1024px)
- Cada card: padding 16-20px, border-radius 12px, shadow-sm

**Tabela**:
- Header: background `gray-50`, sticky top opcional
- Rows: border-bottom `gray-100`, hover `gray-50`
- Striped (opcional): rows ímpares `gray-50`
- Hover highlight: background `gray-50` ou `primary-50`
- Current user row: background `orange-50`, border-left 4px `primary-500`

**Pagination**:
- Posição: abaixo da tabela, centralizado ou à direita
- Buttons: 32x32px, gap 4px
- Info: "Mostrando 1-10 de 100" à esquerda (opcional)

---

### Padrões de Empty State

**Quando usar**:
- Lista vazia
- Busca sem resultados
- Nenhum conteúdo criado ainda
- Erro de carregamento

**Estrutura**:
```
[Ícone grande 64px]
Título (20px, gray-800, weight 600)
Mensagem (14px, gray-600, line-height 1.6)
[Botão de ação] (opcional)
```

**Posicionamento**: Centralizado na área de conteúdo

**Variantes de cor**:
- Default: background `gray-50`, border dashed `gray-200`
- Success: background `success-50`, border `success-500`
- Warning: background `warning-50`, border `warning-500`
- Info: background `info-50`, border `info-500`

---

### Padrões de Error State

**Estrutura similar ao Empty State**, mas:
- Ícone de erro (❌ ou ⚠️)
- Título: "Algo deu errado" ou mensagem específica
- Mensagem: descrição técnica ou ajuda
- Botão: "Tentar novamente" ou "Voltar"

**Cores**: error-50, error-500, error-700

---

### Padrões de Loading

**Skeleton Loader** (para conteúdo dinâmico):
- Usado em cards, listas, tabelas
- Blocos cinza com shimmer
- Dimensões iguais ao conteúdo real

**Spinner** (para ações pontuais):
- Usado em botões, modais, página inteira
- Tamanho: 16px (button), 40px (page)
- Cor: `primary-500` ou `white` (em botões)

**Progress Bar** (para uploads, downloads):
- Barra horizontal com porcentagem
- Animação de shimmer
- Cor: gradiente laranja-turquesa

---

## 9. ANIMAÇÕES E TRANSIÇÕES

### Durations Padrão

| Token          | Valor  | Uso                                    |
|----------------|--------|----------------------------------------|
| duration-fast  | 0.15s  | Hover states, pequenas mudanças        |
| duration-normal| 0.2s   | **Transições padrão de botões, cards** |
| duration-slow  | 0.3s   | **Modais, sidebars, transições complexas**|
| duration-slower| 0.6s   | Barras de progresso, animações longas  |

### Easing Functions

| Nome               | Cubic-bezier                    | Uso                                    |
|--------------------|---------------------------------|----------------------------------------|
| ease (default)     | ease                            | Transições genéricas                   |
| ease-in            | cubic-bezier(0.4, 0, 1, 1)      | Entrada de elementos                   |
| ease-out           | cubic-bezier(0, 0, 0.2, 1)      | **Saída de elementos, hover**          |
| ease-in-out        | cubic-bezier(0.4, 0, 0.2, 1)    | **Transições suaves bidirecionais**    |

### Animações de Entrada/Saída

**Fade In**:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```
Uso: Tooltips, toasts, overlays
Duration: 0.2s

**Slide In (baixo para cima)**:
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
Uso: Modais, dropdowns
Duration: 0.3s

**Modal Slide In** (específico):
```css
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
```
Uso: Modais centralizados
Duration: 0.3s

**Bounce** (pulo):
```css
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
```
Uso: Ícones de celebração, modais de sucesso
Duration: 0.6s

**Spin** (girar):
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```
Uso: Spinners de loading
Duration: 1s, iteração infinita

**Shimmer** (brilho passando):
```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```
Uso: Barras de progresso, skeleton loaders
Duration: 2s, iteração infinita

**Pulse** (pulsação):
```css
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
```
Uso: Badges desbloqueados, elementos com destaque
Duration: 3s, iteração infinita

**Confetti Fall** (confete caindo):
```css
@keyframes confettiFall {
  from {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  to {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}
```
Uso: Tela de celebração ao completar trilha
Duration: 2-5s (aleatório)

---

### Micro-interações Identificadas

**Hover em Botões**:
- Transform: `translateY(-2px)` ou `scale(1.02-1.05)`
- Box-shadow aumentada
- Duration: 0.2s

**Hover em Cards**:
- Transform: `translateY(-4px)`
- Box-shadow: `shadow-sm` → `shadow-md`
- Border color mais intensa
- Duration: 0.3s

**Click em Botões** (active):
- Transform: `scale(0.98)`
- Background mais escuro
- Duration: 0.15s

**Toggle de Sidebar**:
- Transform: `translateX(-100%)` ↔ `translateX(0)`
- Duration: 0.3s, easing `cubic-bezier(0.4, 0, 0.2, 1)`

**Abrir Dropdown**:
- Opacity: 0 → 1
- Transform: `translateY(-10px)` → `translateY(0)`
- Duration: 0.2s

**Progress Bar Filling**:
- Width: transição animada de 0% até X%
- Duration: 0.6s, easing `ease-in-out`
- Shimmer overlay animado

**Badge Hover** (conquista):
- Transform: `scale(1.1) rotate(5deg)`
- Duration: 0.3s

---

## 10. TOKENS DE DESIGN (Resumo Consolidado)

### Cores

| Token                   | Valor       |
|-------------------------|-------------|
| --color-primary-500     | #F08700     |
| --color-secondary-500   | #7AC5BF     |
| --color-gray-50         | #F9FAFB     |
| --color-gray-200        | #E5E7EB     |
| --color-gray-500        | #6B7280     |
| --color-gray-800        | #111827     |
| --color-white           | #FFFFFF     |
| --color-black           | #000000     |
| --color-success-500     | #10B981     |
| --color-error-500       | #EF4444     |
| --color-warning-500     | #F59E0B     |
| --color-info-500        | #3B82F6     |

### Espaçamento

| Token         | Valor  |
|---------------|--------|
| --spacing-1   | 4px    |
| --spacing-2   | 8px    |
| --spacing-3   | 12px   |
| --spacing-4   | 16px   |
| --spacing-6   | 24px   |
| --spacing-8   | 32px   |
| --spacing-10  | 40px   |
| --spacing-12  | 48px   |

### Tipografia

| Token               | Valor                     |
|---------------------|---------------------------|
| --font-body         | Arial, Helvetica, sans-serif |
| --font-heading      | Arial, Helvetica, sans-serif |
| --font-mono         | 'Courier New', Courier, monospace |
| --text-xs           | 11px                      |
| --text-sm           | 12px                      |
| --text-base         | 13px                      |
| --text-md           | 14px                      |
| --text-lg           | 16px                      |
| --text-xl           | 20px                      |
| --text-2xl          | 22px                      |
| --text-3xl          | 28px                      |
| --font-regular      | 400                       |
| --font-medium       | 500                       |
| --font-semibold     | 600                       |
| --font-bold         | 700                       |

### Bordas e Sombras

| Token               | Valor                              |
|---------------------|------------------------------------|
| --radius-sm         | 4px                                |
| --radius-md         | 6px                                |
| --radius-default    | 8px                                |
| --radius-lg         | 12px                               |
| --radius-xl         | 16px                               |
| --radius-full       | 9999px                             |
| --border-width      | 1px                                |
| --border-width-2    | 2px                                |
| --shadow-sm         | 0 1px 3px rgba(0,0,0,0.1)          |
| --shadow-md         | 0 4px 12px rgba(0,0,0,0.15)        |
| --shadow-lg         | 0 8px 24px rgba(0,0,0,0.2)         |
| --shadow-xl         | 0 20px 60px rgba(0,0,0,0.3)        |

### Animações

| Token                  | Valor                              |
|------------------------|------------------------------------|
| --duration-fast        | 0.15s                              |
| --duration-normal      | 0.2s                               |
| --duration-slow        | 0.3s                               |
| --duration-slower      | 0.6s                               |
| --easing-default       | ease                               |
| --easing-in-out        | cubic-bezier(0.4, 0, 0.2, 1)       |
| --easing-out           | cubic-bezier(0, 0, 0.2, 1)         |

---

## RESUMO FINAL

### Estatísticas do Design System

- **Cores documentadas**: 54 tokens (9 primárias, 9 secundárias, 10 grays, 12 semânticas, 7 gamificação, 5 gradientes)
- **Componentes documentados**: 18 componentes principais com todas as variantes e estados
- **Tokens de design**: 87+ tokens consolidados (cores, spacing, tipografia, bordas, sombras, animações)

### Sugestões de Melhorias

#### Inconsistências Encontradas

1. **Tipografia genérica**: O projeto usa Arial como fonte padrão, que é funcional mas genérica. **Recomendação**: Adotar uma fonte moderna como Inter, Roboto ou Poppins para melhorar a identidade visual e legibilidade.

2. **Uso misto de inline styles e CSS**: Muitos componentes usam `style={{...}}` inline, o que dificulta manutenção e reutilização. **Recomendação**: Migrar para CSS Modules, Styled Components ou Tailwind classes para maior consistência.

3. **Falta de tokens centralizados**: Cores e valores são repetidos em múltiplos arquivos (tailwind.config.ts, globals.css, componentes). **Recomendação**: Criar um arquivo de tokens centralizado (theme.ts ou design-tokens.json) e importar em todos os lugares.

4. **Valores de sombra duplicados**: Algumas sombras são definidas inline com valores ligeiramente diferentes. **Recomendação**: Padronizar em 4 níveis (sm, md, lg, xl) e usar tokens.

5. **Inconsistência em hover effects**: Alguns botões usam `translateY(-2px)`, outros `scale(1.02)`, outros ambos. **Recomendação**: Definir um padrão único para cada tipo de componente.

6. **Breakpoints não consolidados**: Breakpoints são hardcoded em vários lugares (640px, 1024px). **Recomendação**: Usar apenas os breakpoints do Tailwind ou criar constantes centralizadas.

7. **Ícones mistos**: Projeto usa emojis em alguns lugares e Lucide Icons em outros. **Recomendação**: Padronizar em apenas Lucide Icons para melhor consistência e acessibilidade (emojis podem ter renderização diferente entre sistemas).

8. **Falta de modo escuro**: Projeto tem suporte inicial a dark mode no globals.css, mas não é implementado nos componentes. **Recomendação**: Implementar suporte completo a dark mode usando variáveis CSS ou Tailwind dark: variants.

#### Tokens Conflitantes

- `background` e `foreground` no globals.css (linha 4-5) usam valores fixos (#ffffff, #171717) que não se conectam com o restante do sistema de cores
- `secondary-500` (#7AC5BF) é usado tanto para botões quanto para navegação ativa, mas em alguns lugares é usado `primary-500` — falta clareza de quando usar cada um
- Border de 2px vs 1px: alguns cards usam 2px para destaque, outros usam 1px padrão, mas não há regra clara de quando aplicar cada um

#### Recomendações de Acessibilidade

1. **Contraste de cores**: Verificar se todos os pares de cor (texto sobre fundo) atendem WCAG AA (4.5:1 para texto normal, 3:1 para texto grande)
   - `primary-500` (#F08700) sobre `white` = 3.5:1 ❌ (não passa para texto normal)
   - **Recomendação**: Usar `primary-600` (#CC7300) para textos sobre branco

2. **Focus states**: Nem todos os componentes têm visual claro de foco para navegação por teclado
   - **Recomendação**: Adicionar ring de 2-3px em `primary-500` ou `blue-500` em todos os elementos interativos

3. **Tamanhos de toque**: Alguns botões e ícones clicáveis têm menos de 44x44px (mínimo recomendado para mobile)
   - **Recomendação**: Garantir min-height e min-width de 44px para todos os alvos de toque

4. **Textos descritivos em ícones**: Ícones sem labels adjacentes podem não ser acessíveis para leitores de tela
   - **Recomendação**: Adicionar `aria-label` ou `title` em todos os ícones standalone

---

## NOTAS DE IMPLEMENTAÇÃO

Este design system foi extraído de um projeto Next.js 16 com Tailwind CSS 4 e Lucide React. Para implementar em outras tecnologias:

1. **React/Vue/Angular**: Adaptar componentes mantendo a estrutura visual (cores, espaçamentos, bordas)
2. **Mobile (Flutter/React Native)**: Converter px para dp/pt, usar equivalentes nativos de shadow/border-radius
3. **iOS/Android nativo**: Converter tokens para formato nativo (UIColor, Color resources)
4. **Design tools (Figma/Adobe XD)**: Criar biblioteca de componentes usando os valores exatos documentados

**Arquivo de tokens recomendado** (formato JSON para reutilização):
```json
{
  "color": {
    "primary": {"500": "#F08700"},
    "secondary": {"500": "#7AC5BF"},
    "gray": {"800": "#111827"}
  },
  "spacing": {"4": "16px", "8": "32px"},
  "radius": {"default": "8px", "lg": "12px"},
  "shadow": {"sm": "0 1px 3px rgba(0,0,0,0.1)"}
}
```

**Prioridades de implementação**:
1. Sistema de cores e tokens de spacing
2. Componentes básicos (Button, Input, Card)
3. Componentes de navegação (Sidebar, Tabs)
4. Componentes complexos (Modal, Table, Leaderboard)
5. Animações e micro-interações

---

**Última atualização**: 2026-02-12
**Versão**: 1.0
**Baseado em**: AVA Raiz Frontend (Next.js 16 + Tailwind CSS 4)
