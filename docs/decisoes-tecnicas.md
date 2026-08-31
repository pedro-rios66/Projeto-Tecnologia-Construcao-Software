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
