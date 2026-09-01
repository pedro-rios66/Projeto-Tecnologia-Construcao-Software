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

## Cronograma semanal na tela inicial

A lista de treinos passou a ser um cronograma: sete cartões, um por dia da
semana, sempre todos visíveis. Dias sem treino mostram "Descanso"; o dia
corrente ganha contorno de acento e etiqueta "hoje".

Os sete dias ficam sempre **na mesma linha**: quebrar em duas linhas atrapalhava
a leitura da semana como sequência. Para isso, cada coluna tem largura mínima
(`repeat(7, minmax(172px, 1fr))`) e o contêiner usa `overflow-x: auto` — quando
os sete não cabem, o cronograma rola na horizontal em vez de quebrar linha, com
`scroll-snap` para parar alinhado em um dia.

Mudança no modelo: `treino.dias`, uma **lista** de índices da constante
`DIAS_SEMANA` (`0 = segunda ... 6 = domingo`). Optou-se por índices, e não pelos
nomes dos dias, para que a ordenação do cronograma seja a própria ordem do array
— sem tabela de conversão nem comparação de strings.

**Por que lista e não um único dia:** uma divisão A/B/C se repete dentro da
semana. O Treino A de segunda e o de sexta são o *mesmo* treino, executado duas
vezes — não duas cópias. Guardar `dias: [0, 4]` mantém um único objeto: renomear
o treino ou acrescentar um exercício reflete nos dois dias automaticamente.
Duplicar o treino criaria dois objetos que passariam a divergir.

`criarTreino` guarda `dias.slice()`, uma cópia, para o array não ficar
compartilhado com quem chamou a função.

`Date.getDay()` usa `0 = domingo`, então `diaSemanaDeHoje()` aplica
`(getDay() + 6) % 7` para alinhar com a semana começando na segunda.

**Vários treinos podem cair no mesmo dia.** Decisão deliberada: evita validação
de unicidade e uma mensagem de erro do tipo "esse dia já tem treino". O dia
simplesmente empilha os treinos que tiver.

Os dias são escolhidos por caixas de seleção (`<fieldset>` + `<legend>`, com as
opções em pílulas), já com o dia de hoje marcado. Como agora a seleção pode ficar
vazia, entrou uma validação nova, `validarDiasTreino`, encadeada à do nome com
`||` — a primeira mensagem não nula é a exibida.

> **Atenção para não confundir com histórico.** `diaSemana` é o dia *planejado*
> e recorrente do treino, não a data em que ele foi executado. O acompanhamento
> de evolução ao longo do tempo continua exigindo sessões com data
> (`exercicio.sessoes[] = { data, series[] }`), previsto para etapa futura. As
> duas coisas coexistem: o cronograma diz *quando treinar*, a sessão registra
> *o que foi feito naquele dia*.

O treino virou um `<button>` em vez de um `<article>` com botão "Abrir treino"
dentro. Assim o cartão inteiro é a área de clique, fica focável por teclado e
responde a Enter/Espaço sem nenhum código extra — a delegação por
`data-id-treino` continua a mesma.

## Cardio: uma tela nova, dentro do treino

Cada treino pode ter um cardio associado, em `treino.cardio` (ou `null`):

```js
cardio = {
  modalidade,    // "Esteira", "Bicicleta"...
  metaMinutos,   // número ou null
  metaKm,        // número ou null
  sessoes: [ { id, minutos, km } ]
}
```

**Por que dentro do treino, e não uma lista própria.** O requisito era ter cardio
apenas nos dias de Treino A e B. Pendurando o cardio no treino, isso sai de
graça: quem tem cardio é o treino, e ele aparece exatamente nos dias em que
aquele treino já aparece. Uma lista `estado.cardios` separada precisaria duplicar
o conceito de `dias` e não teria nada garantindo a coincidência com os dias de A
e B. O custo dessa escolha é aceitar um cardio por treino, o que basta aqui.

Como o cardio não é uma lista, ele **não tem id próprio** — é sempre alcançado
pelo treino dono. Por isso o botão no cronograma carrega `data-id-cardio` com o
**id do treino**, e a tela de cardio se apoia em `estado.idTreinoAtual`, sem
campo novo de estado.

**Meta acumulada, não por sessão.** As sessões somam até completar a meta,
mostrada em dois **anéis concêntricos**: o externo é o tempo (ciano), o interno a
distância (azul-violeta), com uma legenda ao lado ligando cada cor ao seu número.

Os anéis são SVG inline, sem biblioteca. A técnica: `stroke-dasharray` recebe a
circunferência inteira do círculo, transformando o contorno em um único tracejado
do tamanho exato da volta; `stroke-dashoffset` desloca esse tracejado para
esconder a parte que ainda falta (offset `0` = anel completo). A circunferência é
calculada em `desenharArco` a partir do atributo `r` do próprio círculo
(`2 * Math.PI * r`), para o raio não ficar duplicado entre o CSS e o JavaScript.
O `<svg>` é girado `-90deg` no CSS para o preenchimento começar no topo, e não às
três horas.

Uma meta não definida (`null`) esconde o anel correspondente via classe
`.anel--oculto` — e não pelo atributo `hidden`, que não é confiável em elementos
SVG.

**Só sessão concluída conta para a meta.** A sessão tem `feita`, marcada por um
checkbox, exatamente como a série. `calcularMinutosCardio` e `calcularKmCardio`
ignoram as não marcadas — sem isso o total da meta não tinha como ser conferido
contra a tabela, porque somava registros que o usuário não tinha confirmado. A
linha `renderizarProgressoSessoes` diz quantas estão concluídas e avisa
explicitamente que só elas contam, para o número nunca parecer arbitrário.

No cartão do dia, o cardio ganhou uma barrinha de 3px com o progresso
(`percentualGeralDoCardio`, a média das metas definidas), para o cronograma
mostrar andamento e não só o alvo.

**Metas e sessões parcialmente preenchidas.** O requisito é "tempo e/ou
distância", então `metaMinutos`/`metaKm` e `minutos`/`km` podem ser `null`. Duas
consequências no código:

- `numeroOuNulo()` converte campo vazio em `null` na entrada, e `validarCardio` /
  `validarSessaoCardio` exigem que ao menos um dos dois esteja preenchido;
- os totais usam `(sessao.minutos || 0)`, e uma meta `null` some da tela em vez de
  aparecer zerada.

`validarNumeroOpcional` foi extraída porque a regra "se preenchido, precisa ser
número maior que zero" aparece quatro vezes (duas metas e dois campos de sessão).

**Navegação.** A hierarquia continua estrita: Cronograma → Treino → (Exercício |
Cardio). O botão no cartão do dia é um atalho que pula direto para o cardio, mas
o Voltar sempre sobe um nível, para a tela do treino — mesmo comportamento da
tela de exercício, sem precisar guardar de onde o usuário veio.

**Rascunho ao criar.** "+ Adicionar cardio" na tela do treino cria o cardio já
com `modalidade: ""` e abre o formulário de meta. Cancelar um cardio que nunca
foi salvo (`modalidade === ""`) o descarta, para não sobrar um bloco vazio no
cronograma.

**`tpl-linha-vazia` virou genérico.** Antes tinha `colspan="5"` e o texto
"Nenhuma série registrada ainda." fixos no HTML. Como a tabela de sessões tem
quatro colunas e outro texto, o template passou a ser preenchido por
`criarLinhaVazia(colunas, texto)`.

## Número da série: dado derivado, não armazenado

O modelo guardava `serie.numero`, atribuído na criação como `series.length + 1`.
Com a remoção de séries isso quebraria: apagar a série 2 de 4 deixaria as séries
1, 3 e 4 e faria a próxima nascer como 4 duplicada.

O campo foi removido do modelo. O número passou a ser derivado da posição na
lista durante a renderização (`indice + 1`), o que o mantém correto por
construção após qualquer remoção. Modelo atual:

```js
treino    = { id, nome, descricao, dias: [indice], exercicios: [exercicio], cardio }
exercicio = { id, nome, series: [serie] }
serie     = { id, peso, repeticoes, feita }
cardio    = null | { modalidade, metaMinutos, metaKm, sessoes: [sessao] }
sessao    = { id, minutos, km, feita }
```

Princípio aplicado: dado que pode ser calculado a partir de outro não deve ser
armazenado, para não existir em dois lugares que podem divergir.

## Remoção de exercícios e séries

Implementadas `removerExercicio` e `removerSerie`, ambas localizando o item pelo
`id` e usando `splice`. Os botões entram nos `<template>` com
`data-acao="remover-exercicio"` / `data-acao="remover-serie"` e são tratados nos
listeners de delegação que já existiam — nenhum listener novo por elemento.

Confirmação assimétrica, por decisão de proporcionalidade ao dano:

- **remover exercício** pede confirmação (`window.confirm`), porque apaga junto
  todas as séries daquele exercício;
- **remover série** não pede, porque é um item isolado e trivial de refazer com
  o botão "Repetir última".

## Formulários persistentes e "repetir última série"

`renderizarTreino` e `renderizarExercicio` deixaram de fechar os formulários ao
final. O fechamento passou para `abrirTreino` / `abrirExercicio`, isto é, ao
**entrar** na tela. Com isso o formulário sobrevive à re-renderização e o usuário
registra vários itens seguidos sem reabri-lo a cada vez.

Complementos na mesma direção, todos derivados do estado existente:

- o formulário de série abre pré-preenchido com os valores da última série
  (`ultimaSerie`), já que a série seguinte costuma repetir a anterior;
- após submeter, os valores permanecem e o foco vai para as repetições;
- o botão "Repetir última" registra uma cópia da última série em um clique;
- `inputmode="decimal"` / `inputmode="numeric"` nos campos numéricos, para o
  teclado do celular abrir no modo certo.

Motivação de produto: o aplicativo é usado em pé, na academia, entre séries. O
custo de interação por série registrada era de cinco toques e duas digitações;
passou a ser um toque no caso mais comum.

## Barra de progresso das séries

`renderizarProgressoSeries` passou a preencher uma barra
(`.progresso-series__preenchido`) definindo `style.width` com o percentual de
séries feitas, além do texto. É a única métrica escrita diretamente como estilo
inline, por ser um valor calculado que não caberia numa classe fixa.
