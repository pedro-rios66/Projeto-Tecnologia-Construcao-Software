# Etapa 03 — Interface responsiva com CSS

## Objetivo da etapa

Transformar a estrutura da Etapa 02 numa interface organizada, responsiva e
legível em desktop, tablet e smartphone, usando apenas CSS (Flexbox, Grid e
media queries), sem framework nem biblioteca.

O GymLog é usado **em pé, na academia, entre séries**. Por isso o CSS foi escrito
em **mobile first**: as regras base descrevem o celular e as media queries só
acrescentam espaço e colunas conforme a tela cresce.

---

## Interfaces apresentadas

São as três telas representativas já existentes desde a Etapa 02:

| Código | Interface | Conteúdo |
|---|---|---|
| `tela-01` | **Meus Treinos** | Cronograma semanal — um cartão por dia da semana, com destaque para o dia atual, treinos do dia e blocos de cardio. |
| `tela-02` | **Tela do Treino** | Cabeçalho do treino, painel de métricas (exercícios / séries / repetições), grade de cartões de exercício e bloco de cardio. |
| `tela-03` | **Tela do Exercício** | Destaque da melhor série, barra de progresso e tabela de séries (peso, repetições, concluído, remover). |

---

## Viewports das evidências

As 9 capturas estão em `docs/evidencias/etapa-03/`, uma para cada combinação de
viewport × interface, no padrão `<viewport>-<tela>.png`.

| Viewport | Dimensões | Arquivos |
|---|---|---|
| Desktop | 1440 × 900 px | `desktop-tela-01.png`, `desktop-tela-02.png`, `desktop-tela-03.png` |
| Tablet | 768 × 1024 px | `tablet-tela-01.png`, `tablet-tela-02.png`, `tablet-tela-03.png` |
| Smartphone | 390 × 844 px | `smartphone-tela-01.png`, `smartphone-tela-02.png`, `smartphone-tela-03.png` |

As imagens foram capturadas com o próprio navegador (Chrome/Edge) em modo
headless, emulando cada viewport exatamente nas dimensões acima. O script que as
gera está versionado junto: `docs/evidencias/etapa-03/gerar-evidencias.mjs`
(Node puro, sem dependências). Para regerar:

```bash
node docs/evidencias/etapa-03/gerar-evidencias.mjs
```

> Observação: o cronograma abre posicionado no **dia atual**. Nas capturas, o dia
> atual é uma quinta-feira (dia de descanso), por isso `tela-01` no tablet e no
> smartphone aparece iniciando na quinta.

---

## Breakpoints utilizados

Dois breakpoints de largura, ambos `min-width` (coerente com mobile first), mais
duas *media queries* de característica:

| Media query | Papel |
|---|---|
| *(base, sem media query)* | Layout do smartphone: tudo em coluna única, cabeçalho e barras de ação empilhados, cronograma rolando na horizontal. |
| `@media (min-width: 620px)` | **Tablet retrato.** O cabeçalho da seção volta a ser uma linha (`flex-direction: row`); formulários e as ações voltam a ficar lado a lado; os anéis de cardio ficam ao lado da legenda; cartões e formulários ganham `padding` maior. |
| `@media (min-width: 1024px)` | **Desktop.** Mais respiro entre seções, `padding` lateral maior no container, células do cronograma e cartões de exercício maiores, números das métricas e anéis de cardio ampliados. |
| `@media (prefers-reduced-motion: reduce)` | Desliga animações e transições para quem pediu menos movimento no sistema. |
| `@media (hover: none)` | Em telas de toque, remove o efeito de elevação no `:hover` (que "gruda" após o toque). |

---

## Principais decisões de responsividade

### Flexbox
- **Cabeçalhos e barras de ação** (`.cabecalho-view`, `.acoes-tela`,
  `.acoes-formulario`): em coluna no celular, viram linha a partir de 620 px.
- **Cartões do cronograma** (`.dia`, `.treino`, `.cardio-dia`): empilham
  verticalmente o conteúdo com `flex-direction: column` e `gap` do próprio
  sistema de espaçamento.
- **Botões** (`.btn`): `display: inline-flex` para alinhar ícone SVG + texto, com
  `min-height: 44px` (alvo de toque recomendado) em qualquer tela.
- **Legenda das metas de cardio** (`.legenda-metas`): quebra em linha no celular,
  vira coluna ao lado dos anéis no desktop.

### Grid
- **Cronograma** (`.cronograma`): `grid-template-columns: repeat(7, minmax(172px, 1fr))`.
  Os sete dias ficam sempre na mesma linha; quando não cabem (tablet e
  smartphone), o container rola na horizontal com `scroll-snap`, em vez de
  quebrar a semana em várias linhas. No desktop as colunas passam para
  `minmax(180px, 1fr)`.
- **Grade de exercícios** (`.grade-cartoes`):
  `repeat(auto-fill, minmax(268px, 1fr))` — 1 coluna no celular, 2 no tablet,
  3+ no desktop, sem nenhuma media query específica (o `auto-fill` resolve).
- **Painel de métricas** (`.painel-metricas`): `repeat(3, 1fr)` fixo; no celular
  os três blocos ficam mais estreitos, mas continuam legíveis e economizam
  altura vertical (mais valiosa que a horizontal no celular).
- **Tabela de séries**: envolvida em `.tabela-rolavel` (`overflow-x: auto`) para
  rolar dentro do próprio bloco em telas estreitas, sem forçar rolagem
  horizontal na página inteira.

### Organização de espaçamentos
Escala única de espaçamento em variáveis CSS, usada em todo `padding`, `margin` e
`gap`:

```css
--espaco-1: 4px;   --espaco-2: 8px;   --espaco-3: 16px;
--espaco-4: 24px;  --espaco-5: 40px;
```

As media queries trocam apenas de degrau na escala (ex.: `--espaco-2` →
`--espaco-3` → `--espaco-4`), nunca introduzem valores soltos. Raios de borda e
cores também são variáveis (`--raio-*`, `--cor-*`).

### Tratamento dos tamanhos de tela
- **Smartphone:** coluna única; cabeçalho e ações full-width; cronograma rolável
  já posicionado no dia atual; checkbox de série ampliado de 18 px para 24 px;
  `-webkit-tap-highlight-color: transparent` e `theme-color` no `<head>`.
- **Tablet:** cabeçalhos em linha; grade de exercícios em 2 colunas; cronograma
  mostrando ~4 dias com rolagem.
- **Desktop:** os sete dias do cronograma visíveis de uma vez; grade de
  exercícios em 3 colunas; seções com mais respiro; container limitado a
  `--largura-maxima: 1440px` e centralizado.

---

## Localização dos arquivos CSS responsáveis pela responsividade

Todo o CSS está em **`src/css/style.css`** (arquivo único, importado por
`src/index.html`). A responsividade se concentra em:

| Trecho | Linhas (aprox.) | O que faz |
|---|---|---|
| Variáveis de espaçamento e `--largura-maxima` | `:root`, início do arquivo | Escala de espaçamento e largura máxima do container. |
| Regras base dos componentes | seções `/* ---------- ... ---------- */` ao longo do arquivo | Layout mobile (Flexbox/Grid) que vale como padrão. |
| `@media (min-width: 620px)` | ~1152 | Ajustes de tablet. |
| `@media (min-width: 1024px)` | ~1233 | Ajustes de desktop. |
| `@media (prefers-reduced-motion: reduce)` | ~1132 | Acessibilidade de movimento. |
| `@media (hover: none)` | ~1278 | Remove `:hover` em telas de toque. |

A marcação de apoio para rolagem de tabela (`.tabela-rolavel`) está em
`src/index.html`, ao redor das duas `<table class="tabela-series">`.
