# Decisões técnicas — Etapa 1

## Tecnologias escolhidas

HTML5, CSS3 e JavaScript puro (sem frameworks, bibliotecas ou backend), conforme escopo definido para esta primeira etapa. A escolha evita complexidade desnecessária nesta fase inicial e facilita explicar cada linha de código durante a auditoria.

## Arquitetura

Aplicação de página única (SPA simples), sem roteador: um único `index.html` contém todas as `<section class="view">` (telas), e o `app.js` alterna qual seção fica visível usando o atributo `hidden`. Não há recarregamento de página durante a navegação.

## Organização do código (app.js)

O arquivo é dividido em blocos com responsabilidade única, nesta ordem:

1. **Estado** — um único objeto `state` guarda treinos, view atual e ids selecionados.
2. **Dados de exemplo** — `seedData()` popula o estado inicial usando as próprias funções de criação.
3. **Criação** — `createWorkout`, `addExercise`, `addSet` manipulam o estado.
4. **Validação** — funções puras (`validateWorkoutName`, `validateExerciseName`, `validateSet`) que apenas retornam uma mensagem de erro ou `null`.
5. **Renderização** — `renderWorkouts`, `renderWorkout`, `renderExercise` leem o estado e reconstroem o DOM correspondente.
6. **Navegação** — funções `goToX` / `openX` trocam a view visível e chamam a renderização adequada.
7. **Eventos** — `setupEventListeners()` concentra todos os `addEventListener` em um único lugar.

## Modelo de dados

Estrutura em memória, sem classes (objetos literais bastam para o escopo atual):

```js
workout = { id, name, description, exercises: [exercise] }
exercise = { id, name, sets: [set] }
set = { id, number, weight, reps }
```

Os `id`s são gerados por contadores incrementais simples (`nextWorkoutId`, `nextExerciseId`, `nextSetId`), suficientes para uma sessão em memória.

## Comunicação entre componentes

Não há componentes separados nem módulos — o app é pequeno o bastante para viver em um único arquivo JavaScript, com funções puras de acesso ao estado (`findWorkout`, `findExercise`) evitando duplicação de lógica de busca.

## Estratégia de renderização

Re-renderização completa da seção afetada a cada mudança de estado (ex.: `renderWorkout()` reconstrói toda a lista de exercícios), em vez de manipulação granular do DOM. Essa abordagem é mais simples de entender e explicar, adequada ao tamanho atual da aplicação.

## Persistência

Nenhuma persistência nesta etapa (dados apenas em memória), por decisão explícita de escopo — será tratada em etapa futura.

---

# Decisões técnicas — Etapa de refinamento de interface

Esta etapa não altera o modelo de dados nem o fluxo de navegação. Ela melhora a
camada de apresentação, mantendo a restrição de HTML, CSS e JavaScript puro (sem
módulos ES, sem build, aberto via `file://`).

## Marcação em `<template>` em vez de HTML dentro do JavaScript

Os cartões de treino e exercício e a linha da tabela de séries eram montados no
`app.js` com concatenação de strings em `innerHTML`. A marcação foi movida para
elementos `<template>` no `index.html` (`tpl-cartao-treino`, `tpl-cartao-exercicio`,
`tpl-linha-serie`, `tpl-estado-vazio`, `tpl-linha-vazia`). O `app.js` clona o
conteúdo com `template.content.firstElementChild.cloneNode(true)` e preenche
apenas texto e atributos dinâmicos via `querySelector`.

**Motivação:** manter a estrutura HTML em arquivos HTML facilita a leitura, evita
erros de escape e torna a auditoria mais direta. Alternativa considerada:
`document.createElement` para cada nó — mais verboso e ainda espalha marcação pelo
JavaScript.

## Delegação de eventos

Antes, cada cartão renderizado recebia seu próprio `addEventListener`, recriado a
cada re-renderização. Agora há um único listener no container pai
(`#lista-treinos`, `#lista-exercicios`, `#corpo-tabela-series`) que identifica o
elemento clicado por `event.target.closest(...)` lendo um `data-*`
(`data-id-treino`, `data-id-exercicio`, `data-id-serie`, `data-acao`).

**Motivação:** menos listeners criados e removidos, um único ponto de tratamento
por lista, e o listener sobrevive à reconstrução do conteúdo.

## Métricas (funções puras)

Adicionadas `calcularRepeticoesExercicio`, `calcularRepeticoesTreino`,
`contarSeriesTreino` e `encontrarMelhorSerie`, todas puras: recebem um objeto do
estado e devolvem um número (ou a série de maior peso). O total de repetições é a
soma de `repeticoes` de todas as séries. Nenhum campo novo foi adicionado ao
modelo de dados — as métricas são derivadas do estado existente a cada
renderização, coerente com a estratégia de re-renderização completa já adotada.

Exibição: resumo no cartão de cada treino (exercícios / séries / repetições),
total de repetições no cartão de cada exercício, painel de métricas na tela do
treino e bloco de destaque da "melhor série" (maior peso) na tela do exercício.
No CSS, os valores numéricos recebem mais peso (fonte maior/mais pesada) e
`font-variant-numeric: tabular-nums` alinha os dígitos em coluna.

> O volume de carga (peso × repetições) foi considerado e descartado por ora:
> não é a métrica mais relevante nesta fase. O total de repetições é mais direto
> de ler e não depende de todas as séries terem peso preenchido.

## Ícones SVG inline

Um `<svg class="svg-sprite">` no início do `index.html` define `<symbol>`
reutilizáveis (`icon-haltere`, `icon-mais`, `icon-voltar`, `icon-vazio`),
referenciados por `<svg><use href="#id"></use></svg>` nos botões e nos estados
vazios. Sem arquivos de imagem externos e sem biblioteca de ícones, mantendo a
aplicação autocontida e funcional via `file://`.

## Estados vazios desenhados

Os textos soltos ("Nenhum treino cadastrado", etc.) foram substituídos por um
bloco centralizado (`tpl-estado-vazio`) com ícone, texto e, quando faz sentido,
o botão de ação já dentro do próprio estado vazio.

## Como o sprite SVG é escondido

O `<svg class="svg-sprite">` precisa continuar no DOM para que os `<use>` o
encontrem, mas não deve aparecer. Usar `display: none` quebra as referências
`<use>` em alguns navegadores (Chrome/Safari). A solução adotada é tirá-lo do
fluxo visual sem removê-lo da renderização:
`position: absolute; width: 0; height: 0; overflow: hidden`.

## Identidade visual

Tema escuro com um acento em gradiente (laranja → âmbar) aplicado de forma
consistente: botões primários, faixa superior dos cartões no hover, números das
métricas (preenchimento de texto em gradiente), barra de progresso e realce da
melhor série (maior peso). Efeitos de elevação (`transform` + `box-shadow`) no hover dos
cartões, animação de entrada nas telas e `@media (prefers-reduced-motion)` para
desligar o movimento. Tudo em CSS puro, sem imagens nem fontes externas.

## Barra de progresso das séries

`renderizarProgressoSeries` passou a preencher uma barra
(`.progresso-series__preenchido`) definindo `style.width` com o percentual de
séries feitas, além do texto. É a única métrica escrita diretamente como estilo
inline, por ser um valor calculado que não caberia numa classe fixa.
