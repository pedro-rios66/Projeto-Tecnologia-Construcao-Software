# Etapa 04 — Interatividade com JavaScript

## 1. Descrição geral

O GymLog já nasceu, desde as etapas anteriores, como uma aplicação orientada a
JavaScript: sem ele, a página é só um cabeçalho, um rodapé e um punhado de
`<template>` vazios — nenhuma tela aparece, nenhum dado existe. Esta etapa não
introduziu uma funcionalidade isolada; ela **auditou e reforçou** a
interatividade que já sustenta a aplicação inteira, focando em três frentes:

1. **Cálculo dinâmico.** Toda métrica exibida (repetições totais, progresso das
   metas de cardio, melhor série) é derivada do estado a cada renderização —
   nunca armazenada, sempre calculada por funções puras com `reduce`.
2. **Iteração idiomática.** Os últimos laços `for`/`for...of` que restavam no
   código (em `buscarExercicio`, `removerExercicio`, `removerSerie` e
   `alternarSerieFeita`) foram substituídos por cadeias de `.find`, `.some`,
   `.findIndex` e `.flatMap`. O arquivo `app.js` não tem mais nenhuma ocorrência
   de `for (`.
3. **Situações inválidas.** `abrirTreino`, `abrirExercicio` e `abrirCardio`
   passaram a verificar explicitamente se o id recebido existe antes de trocar
   de tela, em vez de confiar que quem chamou sempre passa um id válido.

Um efeito colateral direto dessa auditoria: ao automatizar o fluxo da
aplicação para gerar as evidências desta etapa, foi encontrado e corrigido um
bug real de "alteração dinâmica da interface" — veja a seção
[Situações inválidas tratadas](#4-situações-inválidas-e-inconsistências-tratadas).

---

## 2. Funcionalidades interativas detalhadas

### 2.1 Cálculo automático de métricas

**Como funciona:** cada vez que uma série, uma sessão de cardio ou um
exercício é adicionado, removido ou marcado como feito, a tela correspondente
é re-renderizada e as métricas são recalculadas do zero a partir do array de
dados — nada fica guardado em um campo "total" que precisaria ser mantido
sincronizado manualmente.

- No cartão de cada treino e no painel da tela do treino: total de exercícios,
  total de séries e total de repetições.
- No cartão de cada exercício: total de séries e repetições daquele exercício.
- Na tela do exercício: a "melhor série" (maior peso já registrado) e a barra
  de progresso de séries concluídas.
- Na tela de cardio: dois anéis SVG desenhados dinamicamente mostrando o
  progresso em relação à meta de tempo e de distância.

**Arquivo(s) e funções:** `src/js/app.js` —
`calcularRepeticoesExercicio()`, `calcularRepeticoesTreino()`,
`contarSeriesTreino()`, `encontrarMelhorSerie()`, `calcularMinutosCardio()`,
`calcularKmCardio()`, `percentualDaMeta()`, `desenharArco()`. Consumidas pelas
funções de renderização: `renderizarTreino()`, `renderizarTreinos()`,
`renderizarExercicio()`, `renderizarCardio()`.

**Conceitos utilizados:** funções puras, `Array.prototype.reduce` (soma
condicional), manipulação do DOM (`textContent`, `style.width`,
`style.strokeDashoffset`), separação entre "estado" e "apresentação" (a UI
nunca é a fonte da verdade, só reflete o estado).

Esta é a funcionalidade "cujo comportamento não seria possível apenas com HTML
e CSS": nenhuma combinação de marcação e estilo consegue somar valores
digitados pelo usuário e atualizar um número na tela em tempo real.

### 2.2 Numeração automática e sequencial de séries e sessões

**Como funciona:** o número exibido na coluna "Série" (ou "Sessão") não é um
dado armazenado — é a posição do item na lista (`índice + 1`), calculada no
momento da renderização. Isso significa que remover a série 2 de uma lista de
4 não deixa uma numeração "1, 3, 4": ao renderizar de novo, os itens restantes
recebem os números 1, 2, 3 automaticamente, porque a numeração nunca foi salva
— só a ordem dos elementos no array importa.

**Arquivo(s) e funções:** `src/js/app.js` — dentro de
`renderizarExercicio()` e `renderizarCardio()`, o parâmetro `indice` do
`.forEach()` gera `const numero = indice + 1`. As funções `adicionarSerie()` e
`registrarSessaoCardio()` deliberadamente **não** guardam nenhum campo
`numero`.

**Conceitos utilizados:** `Array.prototype.forEach` com o índice do item,
dado derivado (evita duplicar informação que poderia ficar dessincronizada),
manipulação do DOM (clonagem de `<template>` por item da lista).

### 2.3 Validação de formulários com mensagens de erro dinâmicas

**Como funciona:** cada formulário (novo treino, novo exercício, nova série,
meta de cardio, nova sessão de cardio) tem uma função de validação própria
que roda no `submit`, antes de qualquer dado ser criado. Se algo estiver
inválido, a função devolve uma string com a mensagem de erro; se estiver tudo
certo, devolve `null`. O `submit` handler decide o que fazer com base nesse
retorno: mostra a mensagem em um `<p class="erro-formulario">` (antes
`hidden`) e interrompe a operação, ou segue em frente e fecha o erro.

**Arquivo(s) e funções:** `src/js/app.js` —
`validarNomeTreino()`, `validarDiasTreino()`, `validarNomeExercicio()`,
`validarSerie()`, `validarCardio()`, `validarSessaoCardio()`,
`validarNumeroOpcional()`; exibição em `mostrarErroFormulario()` /
`limparErroFormulario()`. Cada `addEventListener("submit", ...)` dentro de
`configurarEventos()` segue o mesmo padrão: `event.preventDefault()` →
validar → mostrar erro ou prosseguir.

**Conceitos utilizados:** tratamento de eventos (`submit`,
`event.preventDefault()`), funções puras de validação (recebem string,
devolvem mensagem ou `null` — fáceis de testar isoladamente), manipulação do
DOM (`hidden`, `textContent`), curto-circuito com `||` para encadear várias
validações em uma linha (`validarNomeTreino(nome) || validarDiasTreino(dias)`).

### 2.4 Navegação resiliente a ids inexistentes

**Como funciona:** `abrirTreino(id)`, `abrirExercicio(id)` e `abrirCardio(id)`
primeiro conferem se o id recebido corresponde a algo que ainda existe no
estado. Se não existir, a função registra um aviso no console
(`console.warn`) e redireciona para uma tela segura — a lista de treinos, ou,
no caso de um exercício, para o treino atual (se ele ainda existir). A troca
de tela só acontece depois dessa checagem, então a aplicação nunca chega a
mostrar uma tela "pela metade" com dados de um item que não existe mais.

**Arquivo(s) e funções:** `src/js/app.js` — `abrirTreino()`,
`abrirExercicio()`, `abrirCardio()`, apoiadas em `buscarTreino()` e
`buscarExercicio()` (que devolvem `null` quando não encontram nada).

**Conceitos utilizados:** tratamento de situações inválidas, funções de
guarda (*guard clauses*) que interrompem a execução cedo, funções de busca
puras reaproveitadas em vários pontos do código.

---

## 3. Validações implementadas

| Campo | Regra | Mensagem |
|---|---|---|
| Nome do treino | não pode ser vazio (após `trim()`) | "O nome do treino não pode estar vazio." |
| Dias da semana do treino | pelo menos um dia marcado | "Selecione pelo menos um dia da semana." |
| Nome do exercício | não pode ser vazio | "O nome do exercício não pode estar vazio." |
| Peso da série | número > 0 | "O peso deve ser um número maior que zero." |
| Repetições da série | número inteiro > 0 | "As repetições devem ser um número inteiro maior que zero." |
| Modalidade do cardio | não pode ser vazia | "A modalidade não pode estar vazia." |
| Meta de cardio (tempo e/ou distância) | pelo menos uma preenchida; se preenchida, número > 0 | "Defina uma meta de tempo, de distância, ou as duas." / "A meta de \<campo\> deve ser um número maior que zero." |
| Sessão de cardio (tempo e/ou distância) | pelo menos um preenchido; se preenchido, número > 0 | "Informe o tempo, a distância, ou os dois." / "O \<campo\> deve ser um número maior que zero." |

Todas as validações rodam em `src/js/app.js`, são funções puras (recebem os
valores dos campos como string, devolvem `string | null`) e são chamadas no
`submit` de cada formulário, antes de qualquer alteração no estado.

---

## 4. Situações inválidas e inconsistências tratadas

- **Formulário vazio** — coberto pelas validações da seção 3.
- **Valores não numéricos** (`Number("abc")` → `NaN`) — todas as validações
  numéricas checam `isNaN(...)` explicitamente.
- **Valores zero ou negativos** — peso, repetições e metas exigem `> 0`.
- **Repetições fracionadas** — `validarSerie` exige `Number.isInteger(...)`.
- **Id de treino/exercício/cardio inexistente** — tratado em `abrirTreino()`,
  `abrirExercicio()` e `abrirCardio()` (seção 2.4). Reproduzível abrindo o
  console do navegador e chamando `abrirTreino(999999)`: a aplicação registra
  um aviso e volta para a lista de treinos, sem travar.
- **Listas vazias** — nenhum treino, nenhum exercício, nenhuma série e nenhuma
  sessão têm, cada um, um estado vazio próprio (`criarEstadoVazio()` /
  `criarLinhaVazia()`), com ícone, texto e — quando faz sentido — um botão de
  ação, em vez de uma tela em branco.
- **Bug de exibição descoberto e corrigido nesta etapa:** ao automatizar o
  fluxo da aplicação para capturar as evidências, um exercício recém-criado
  (sem nenhuma série) mostrava o bloco "melhor série" vazio, e um treino
  recém-criado (sem exercícios) mostrava o painel de métricas zerado — ambos
  deveriam estar ocultos pelo atributo `hidden`. A causa: as classes
  `.destaque`, `.painel-metricas` e outras declaram seu próprio `display`
  (`flex`/`grid`), e essa regra de origem "author" vencia a regra padrão do
  navegador `[hidden] { display: none }`, mesmo com especificidade igual. A
  correção foi uma única regra global em `src/css/style.css`:
  ```css
  [hidden] {
    display: none !important;
  }
  ```
  Isso substituiu quatro correções pontuais que já existiam espalhadas pelo
  arquivo (`.tela[hidden]`, `.meta[hidden]`, `.progresso-series[hidden]`) por
  uma única regra que cobre qualquer componente, atual ou futuro.

---

## 5. Como testar manualmente

1. Abra `src/index.html` no navegador (duplo clique, sem servidor).
2. **Estado inicial:** a tela "Meus Treinos" mostra o cronograma semanal com
   os treinos de exemplo (A, B, C) e o dia atual destacado.
3. **Erro de validação (treino):** clique em "+ Novo Treino" e, sem preencher
   nada, clique em "Criar treino". A mensagem "O nome do treino não pode estar
   vazio." deve aparecer em vermelho abaixo do formulário.
4. **Criação com sucesso:** preencha o nome (ex.: "Treino Teste"), deixe pelo
   menos um dia marcado e confirme. Você deve cair na tela desse treino, com
   "Nenhum exercício adicionado ainda." e **sem** o painel de métricas visível
   (ele só aparece quando há pelo menos um exercício).
5. **Adicionar exercício e ver o cálculo ao vivo:** clique em
   "+ Adicionar exercício", dê um nome e confirme. Abra o exercício recém
   criado.
6. **Erro de validação (série):** clique em "+ Adicionar série", digite `0`
   no peso e `10` nas repetições, e confirme. A mensagem "O peso deve ser um
   número maior que zero." deve aparecer, e nenhuma linha deve ser adicionada
   à tabela.
7. **Cálculo automático:** corrija o peso para `60` e confirme; repita com
   outro peso/repetições. Volte para a tela do treino (botão "Voltar") — o
   painel de métricas agora aparece com o total de exercícios, séries e
   repetições somado automaticamente, e o mesmo total aparece no cartão do
   exercício.
8. **Numeração após remoção:** com 3 ou mais séries registradas, remova a
   série do meio (ícone de lixeira). As séries restantes são renumeradas
   automaticamente (1, 2, 3...), sem buracos.
9. **Id inexistente:** abra o console do navegador (F12) e digite
   `abrirTreino(999999)`. A aplicação deve voltar para "Meus Treinos" e
   imprimir um aviso no console — sem travar nem lançar exceção.

As capturas de tela dos passos 2, 3, 4, 6 e 7 estão em `docs/evidencias/`:

| Momento | Captura |
|---|---|
| Estado inicial ("Meus Treinos") | `docs/evidencias/01-lista-treinos.png` |
| Erro de validação do treino | `docs/evidencias/02-erro-validacao-treino.png` |
| Treino criado com sucesso (painel de métricas oculto, sem exercícios) | `docs/evidencias/03-treino-criado.png` |
| Erro de validação da série | `docs/evidencias/04-erro-validacao-serie.png` |
| Métricas calculadas dinamicamente (painel + cartão do exercício) | `docs/evidencias/05-volume-calculado.png` |

---

## 6. Matriz de evidências

| Requisito | Funcionalidade relacionada | Arquivo(s) | Evidência |
|---|---|---|---|
| 1. Manipulação do DOM | Renderização de treinos, exercícios, séries e cardio a partir de `<template>` clonados | `src/index.html`, `src/js/app.js` | `clonarTemplate()`, `renderizarTreinos()`, `renderizarTreino()`, `renderizarExercicio()`, `renderizarCardio()` |
| 2. Tratamento de eventos | Delegação de eventos nas listas/tabelas; eventos de `submit`, `click` e `change` nos formulários | `src/js/app.js` | `configurarEventos()` e os `addEventListener(...)` dentro dela |
| 3. Validação de formulários | Validação de treino, exercício, série, meta de cardio e sessão de cardio, com mensagem dinâmica | `src/js/app.js` | `validarNomeTreino()`, `validarSerie()`, `validarCardio()`, `mostrarErroFormulario()`, elemento `#erro-nova-serie` |
| 4. Alteração dinâmica da interface | Troca de telas sem recarregar a página; formulários que abrem/fecham; painel de métricas e "melhor série" que aparecem só quando há dado | `src/js/app.js`, `src/css/style.css` | `mostrarTela()`, `abrirTreino()`/`abrirExercicio()`/`abrirCardio()`, regra `[hidden] { display: none !important; }` |
| 5. Uso de funções | Toda a lógica organizada em funções nomeadas, de responsabilidade única, divididas em 8 blocos | `src/js/app.js` | Comentário de organização no topo do arquivo (linhas 1–14); ex. `criarTreino()`, `adicionarSerie()`, `calcularRepeticoesTreino()` |
| 6. Uso de arrays | Modelo de dados inteiro baseado em arrays aninhados | `src/js/app.js` | `estado.treinos` (array de treinos), `treino.exercicios`, `exercicio.series`, `cardio.sessoes`, `treino.dias` |
| 7. Métodos de iteração | `reduce`, `forEach`, `map`, `filter`, `find`, `findIndex`, `some`, `flatMap` e `includes` no lugar de laços `for` | `src/js/app.js` | `calcularRepeticoesTreino()` (`reduce`), `renderizarTreino()` (`forEach`), `nomesDosDias()` (`map`), `renderizarProgressoSeries()` (`filter`), `buscarExercicio()`/`removerSerie()`/`alternarSerieFeita()` (`find`/`some`/`flatMap`) — zero ocorrências de `for (` no arquivo inteiro |
| 8. Tratamento de situações inválidas | Formulário vazio, valores não numéricos/negativos, id inexistente, listas vazias | `src/js/app.js` | `validarSerie()`; `abrirTreino()`/`abrirExercicio()`/`abrirCardio()` (guarda de id + `console.warn`); `criarEstadoVazio()`/`criarLinhaVazia()` |
| 9. Funcionalidade só possível via JS | Cálculo automático de métricas (repetições totais, progresso de metas, melhor série), atualizado a cada renderização | `src/js/app.js` | `calcularRepeticoesTreino()`, `percentualDaMeta()`, `encontrarMelhorSerie()` — resultado em `#metrica-repeticoes`, `.treino__resumo`, `#destaque-melhor-serie` |
