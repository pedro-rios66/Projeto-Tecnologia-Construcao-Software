# Etapa 05 — Modularização e comunicação assíncrona

## 1. Objetivo e visão geral

O objetivo desta etapa é separar o código em módulos e fazer a aplicação conversar
de forma assíncrona com um serviço externo, tratando carregamento, sucesso e erro.

O que mudou em relação à Etapa 04:

| Antes | Agora |
|---|---|
| `src/js/app.js` com 1.169 linhas e toda a lógica | Seis módulos ES em `src/js/`, cada um com uma responsabilidade |
| Dados em memória: recarregar a página voltava ao exemplo | Dados no servidor simulado, gravados em `server/db.json` |
| Operações instantâneas e síncronas | Chamadas `fetch` com `async/await` e estados de carregamento, sucesso e erro |
| Aberto com duplo clique no `index.html` | Servido por `python server/server.py` |

As telas, as validações, os cálculos e os estados vazios continuam iguais.

**Sobre o LocalStorage.** O README antigo citava o LocalStorage, mas o código nunca o
usou: até a Etapa 04, os dados ficavam só em memória. O README foi corrigido. Nesta
etapa a fonte de verdade é o servidor, e `state.js` guarda apenas uma cópia do que ele
devolveu.

## 2. Por que a aplicação agora exige um servidor

- **ES Modules não carregam em `file://`.** O navegador trata cada arquivo local como
  uma origem à parte e bloqueia `<script type="module">` por CORS.
- **`fetch` precisa de uma URL HTTP.** Sem servidor, não há a quem pedir `/api/workouts`.

O mesmo servidor entrega os arquivos de `src/` e a API. Por isso o front-end usa URLs
relativas e, com uma origem só, não há configuração de CORS.

## 3. Por que Python com a biblioteca padrão

- **Domínio da linguagem:** o aluno conhece Python e consegue explicar cada linha na auditoria.
- **Nenhuma dependência:** basta ter Python 3.10+, sem `pip install`.
- **Liberdade tecnológica:** as regras da disciplina permitem escolher a tecnologia do serviço simulado.
- **Independência do front-end:** o navegador só enxerga HTTP e JSON. Trocar a linguagem
  do servidor não exigiria mudar uma linha de `api.js`.

Alternativas consideradas:

| Alternativa | Por que não foi escolhida |
|---|---|
| Node.js puro | Viável, mas sem vantagem sobre uma linguagem que o aluno já domina |
| `json-server` | Dependência externa; esconde o roteamento, a validação e a persistência, que são justamente o que se quer demonstrar |
| API pública | Não guarda os treinos do usuário e deixaria a demonstração dependente de internet e de terceiros |

O Python 3.10 é o mínimo porque o roteamento usa `match`/`case`.

## 4. Mapa dos módulos

| Módulo | Responsabilidade | Exporta | Depende de |
|---|---|---|---|
| `main.js` | Ponto de entrada: registra eventos e coordena o fluxo das operações | nada | `api`, `state`, `ui`, `validation` |
| `state.js` | Estado da interface: tela atual, ids abertos e treinos carregados | `estado`, `buscarTreino`, `buscarExercicio`, `salvarTreino` | nenhum |
| `api.js` | Todas as chamadas HTTP; único módulo que conhece URLs | `fetchWorkouts`, `fetchWorkout`, `createWorkout`, `addExercise`, `removeExercise`, `addSet`, `updateSet`, `removeSet`, `saveCardio`, `addSession`, `updateSession`, `removeSession` | nenhum |
| `validation.js` | Regras de validação (funções puras) | `validarNomeTreino`, `validarDiasTreino`, `validarNomeExercicio`, `validarSerie`, `validarCardio`, `validarSessaoCardio`, `numeroOuNulo` | nenhum |
| `calculations.js` | Cálculos e formatação (funções puras) | `DIAS_SEMANA`, `calcularRepeticoesExercicio`, `calcularRepeticoesTreino`, `contarSeriesTreino`, `encontrarMelhorSerie`, `calcularMinutosCardio`, `calcularKmCardio`, `contarSessoesFeitas`, `percentualDaMeta`, `percentualGeralDoCardio`, `formatarNumero`, `textoDasMetas`, `treinosDoDia`, `nomesDosDias`, `diaSemanaDeHoje` | nenhum |
| `ui.js` | Renderização, navegação, formulários e estados de carregamento, erro e vazio | `mostrarTela`, `renderizarTreinos`, `renderizarTreino`, `renderizarExercicio`, `renderizarCardio`, `renderizarTelaAtual`, `mostrarCarregando`, `mostrarCarregandoTreino`, `ocultarCarregando`, `mostrarErroConsulta`, `mostrarToast`, `mostrarErroFormulario`, `limparErroFormulario`, `definirEnviando`, `esconderFormulario`, `focarCampo`, `diasSelecionados` e as funções `abrirFormulario*` | `calculations`, `state` |

Nenhum módulo depende de todos os outros: `main.js` não importa `calculations.js`,
`api.js` não toca no DOM, `ui.js` não chama `fetch`, e `validation.js` e
`calculations.js` não tocam em nenhum dos dois.

```
 NAVEGADOR
 ┌──────────────────────────────────────────────────────────────────┐
 │  evento ──► validação ──► chamada assíncrona                     │
 │  main.js    validation.js    api.js ─────────┐                   │
 │                                              │ HTTP + JSON       │
 │  renderização ◄── atualização do estado ◄────┤                   │
 │  ui.js            state.js                   │                   │
 └──────────────────────────────────────────────┼───────────────────┘
                                                ▼
 SERVIDOR                       server/server.py ◄──► server/db.json
                        (rota → validação → leitura e gravação com trava)
```

## 5. API simulada

Todas as respostas são JSON (`application/json; charset=utf-8`). Os erros têm o formato
`{"error": "mensagem"}`, e qualquer rota pode responder `500` em caso de erro inesperado.

| Método | Rota | Corpo | Respostas |
|---|---|---|---|
| GET | `/api/workouts` | — | 200 lista de treinos |
| GET | `/api/workouts/<id>` | — | 200 treino · 404 |
| POST | `/api/workouts` | `{nome, descricao?, dias}` | 201 treino · 400 |
| POST | `/api/workouts/<id>/exercises` | `{nome}` | 201 treino · 400 · 404 |
| POST | `/api/workouts/<id>/exercises/<idEx>/sets` | `{peso, repeticoes}` | 201 treino · 400 · 404 |
| DELETE | `/api/workouts/<id>/exercises/<idEx>` | — | 200 treino · 404 |
| PATCH | `/api/workouts/<id>/exercises/<idEx>/sets/<idSerie>` | `{feita}` | 200 treino · 400 · 404 |
| DELETE | `/api/workouts/<id>/exercises/<idEx>/sets/<idSerie>` | — | 200 treino · 404 |
| PUT | `/api/workouts/<id>/cardio` | `{modalidade, metaMinutos?, metaKm?}` | 200 treino · 400 · 404 |
| POST | `/api/workouts/<id>/cardio/sessions` | `{minutos?, km?}` | 201 treino · 400 · 404 |
| PATCH | `/api/workouts/<id>/cardio/sessions/<idSessao>` | `{feita}` | 200 treino · 400 · 404 |
| DELETE | `/api/workouts/<id>/cardio/sessions/<idSessao>` | — | 200 treino · 404 |

As cinco primeiras rotas são as pedidas pela etapa. As demais existem para que remover,
marcar como feita e o cardio, que já funcionavam na Etapa 04, continuem funcionando com
os dados no servidor.

Toda escrita devolve o treino inteiro atualizado. Assim, o front-end tem um único
caminho de atualização: `salvarTreino(resposta)` seguido da renderização.

## 6. Operações de consulta e de submissão

### Consulta: carregar os treinos

1. `main.js` chama `carregarTreinos()` ao iniciar, ao voltar para a lista e em "Tentar novamente".
2. `ui.mostrarCarregando()` exibe o indicador e define `aria-busy="true"`.
3. `api.fetchWorkouts()` envia `GET /api/workouts` por meio de `requisitar()`.
4. No servidor, `ManipuladorGymLog.do_GET` identifica o prefixo `api` e chama `tratar_api()`.
   Esta aplica o atraso, lê `db.json` sob a trava e chama `rotear()`.
5. De volta ao navegador, a resposta vai para `estado.treinos` e `ui.renderizarTreinos()` desenha o cronograma.
6. Em erro, o `catch` chama `ui.mostrarErroConsulta()`. Em todos os casos, o `finally`
   chama `ui.ocultarCarregando()`.

`abrirTreino(id)` segue o mesmo padrão com `GET /api/workouts/<id>`. Se o treino não
existir mais (404), o usuário volta para a lista.

### Submissão: registrar uma série

1. O `submit` de `#form-nova-serie` entra em `registrarFormulario()` (`main.js`).
2. `validarSerie()` roda no cliente. Se houver erro, a mensagem aparece e nada é enviado.
3. `ui.definirEnviando(formulario, true)` desabilita os botões e troca o texto para "Salvando...".
4. `api.addSet()` envia `POST /api/workouts/<id>/exercises/<idEx>/sets`.
5. No servidor, `tratar_api()` lê o corpo com `ler_corpo()`; `alterar_treino()` chama
   `validar_serie()` e numera a série (`len(series) + 1`); por fim, `db.json` é gravado sob a trava.
6. A resposta 201 traz o treino atualizado: `salvarTreino()` o guarda,
   `ui.renderizarExercicio()` redesenha a tela e `ui.mostrarToast()` confirma.
7. Em erro, o `catch` mostra a mensagem no formulário, sem limpar os campos. O `finally`
   chama `ui.definirEnviando(formulario, false)`.

Criar treino, adicionar exercício, salvar meta e registrar sessão usam a mesma
`registrarFormulario()`. Ações de um clique (marcar, remover, repetir) usam `executarAcao()`.

## 7. Carregamento, sucesso e erro

| Situação | O que o usuário vê | Onde está no código |
|---|---|---|
| Consulta carregando | Spinner com texto; `aria-busy="true"` no container | `ui.mostrarCarregando`, `.carregando` em `style.css` |
| Consulta com sucesso | Cronograma ou treino, incluindo os estados vazios | `ui.renderizarTreinos`, `ui.renderizarTreino` |
| Consulta com erro | Mensagem no lugar da lista e botão "Tentar novamente" | `ui.mostrarErroConsulta`, `carregarTreinos`, `abrirTreino` |
| Envio em andamento | Botões desabilitados e "Salvando..."; Enter não reenvia | `ui.definirEnviando` |
| Envio com sucesso | Tela atualizada com os dados do servidor e toast (`aria-live="polite"`) | `registrarFormulario`, `ui.mostrarToast` |
| Dado inválido no cliente | Mensagem no formulário; nenhuma requisição é feita | `validation.js`, `registrarFormulario` |
| Envio com erro | Mensagem do servidor no formulário, botão reabilitado e campos preservados | `catch` e `finally` de `registrarFormulario` |
| Ação de um clique com erro | Toast de erro; um checkbox marcado volta ao estado anterior | `executarAcao` |
| Falha de rede | "Não foi possível conectar ao servidor. Verifique se ele está em execução." | `requisitar` em `api.js` |
| Servidor sem responder | Após 8 s, "O servidor demorou demais para responder. Tente novamente." | `AbortController` em `requisitar` |

## 8. Principais conceitos utilizados

- **ES Modules:** `import`/`export` deixam explícito o que cada arquivo usa e oferece.
- **Promises:** representam um resultado futuro; toda função de `api.js` devolve uma.
- **`async`/`await`:** permitem escrever código assíncrono na ordem em que ele acontece.
- **`try`/`catch`/`finally`:** o `finally` roda no sucesso e no erro, por isso é onde o carregamento é desligado.
- **`fetch`:** rejeita a Promise só em falha de rede; um erro HTTP precisa ser verificado em `response.ok`.
- **`AbortController`:** cancela uma requisição; aqui, implementa o tempo limite.
- **Códigos HTTP:** 200 (ok), 201 (criado), 400 (dado inválido), 404 (não encontrado), 500 (erro interno).
- **JSON:** formato de troca entre front-end e servidor e de gravação em disco.
- **Tipos MIME:** o navegador recusa módulos servidos com tipo errado; no Windows, o
  Python pode ler `text/plain` do registro do sistema, por isso os tipos são registrados no início do `server.py`.
- **Concorrência com trava:** o servidor atende em threads; `threading.Lock` impede que
  duas gravações leiam o mesmo arquivo e uma apague o trabalho da outra.

## 9. Execução e testes

```bash
python server/server.py   # no Windows, também: py server/server.py
```

Depois, acesse `http://localhost:3000`. Para encerrar, use Ctrl+C.

O servidor grava em `server/db.json`, que é versionado. Para restaurar os dados de
exemplo: `git restore server/db.json`.

### Testes automatizados

```bash
npm install   # só na primeira vez; instala o Playwright, usado apenas nos testes
npm test
```

O script `tests/manual-check.js` sobe o servidor com uma cópia temporária do `db.json`,
executa 20 testes, regenera as capturas em `docs/evidencias/etapa-05/` e derruba o
servidor no final, mesmo se algum teste falhar. No Windows ele usa o Edge instalado; em
outros sistemas, rode antes `npx playwright install chromium`.

### Como reproduzir cada estado manualmente

| Estado | Como reproduzir |
|---|---|
| Carregamento | Inicie o servidor com atraso maior (comandos abaixo) e recarregue a página |
| Salvando | Com o mesmo atraso, envie qualquer formulário válido |
| Sucesso | Crie um treino: a tela do treino abre e aparece "Treino criado." |
| Validação no cliente | Clique em "Criar treino" com o nome vazio |
| Erro de conexão | Abra a página, encerre o servidor com Ctrl+C e clique em "Novo Treino" e "Cancelar"; reinicie e use "Tentar novamente" |
| Tempo limite | Inicie com `MOCK_DELAY_MS` igual a `10000` e recarregue a página |
| Erro 400 do servidor | `curl -i -X POST http://localhost:3000/api/workouts -d "{malformado"` |
| Treino inexistente (404) | Com a lista aberta, apague o treino do `db.json` e clique no cartão dele |
| Erro 500 | Com o servidor ligado, deixe o `db.json` inválido e recarregue a página; depois restaure-o com `git restore server/db.json` |

Atraso de 3 segundos em cada terminal:

```powershell
# PowerShell (a variável vale até fechar o terminal)
$env:MOCK_DELAY_MS = 3000; python server/server.py
```

```bat
:: CMD (a variável vale até fechar o terminal)
set MOCK_DELAY_MS=3000
python server\server.py
```

```bash
# bash
MOCK_DELAY_MS=3000 python3 server/server.py
```

`PORT` e `DB_PATH` funcionam da mesma forma.

## 10. Matriz de evidências

As capturas estão em `docs/evidencias/etapa-05/`.

| Requisito | Implementação | Arquivo(s) | Evidência |
|---|---|---|---|
| 1. Separar em módulos | Seis módulos ES carregados por `<script type="module">` | `src/js/*.js`, `src/index.html` | Seção 4; teste "arquivos estáticos são servidos com o tipo MIME correto" |
| 2. Evitar arquivo único | `app.js` removido; a lógica foi dividida por responsabilidade | `src/js/` | `git show etapa-05 --stat` |
| 3. Chamadas assíncronas | Todas as operações de dados passam pela API | `src/js/api.js`, `src/js/main.js` | `requisitar()`, `carregarTreinos()`; `02-treinos-carregados.png` |
| 4. Fetch API | `fetch` em um único ponto do código | `src/js/api.js` | `requisitar()` |
| 5. Promises e `async`/`await` | Funções `async` com `try`/`catch`/`finally` | `src/js/api.js`, `src/js/main.js` | `carregarTreinos()`, `abrirTreino()`, `registrarFormulario()`, `executarAcao()` |
| 6. Estados de carregamento | Spinner com `aria-busy`; botão "Salvando..." | `src/js/ui.js`, `src/css/style.css` | `mostrarCarregando()`, `definirEnviando()`; `01-carregando-treinos.png`, `03-salvando-treino.png` |
| 7. Erros de comunicação | HTTP, rede e tempo limite, com "Tentar novamente" | `src/js/api.js`, `src/js/ui.js` | `requisitar()`, `mostrarErroConsulta()`; `06-erro-servidor-500.png`, `07-erro-conexao-tentar-novamente.png` |
| 8. Serviço simulado | Servidor Python com persistência em JSON | `server/server.py`, `server/db.json` | `rotear()`, `tratar_api()`; seção 5 |
| Demonstração: consulta | Listar os treinos e abrir um treino | `api.js`, `main.js`, `server.py` | `fetchWorkouts()`, `GET /api/workouts`; `02-treinos-carregados.png` |
| Demonstração: submissão | Criar treino, exercício e série | `api.js`, `main.js`, `server.py` | `createWorkout()`, `POST /api/workouts`; `03-salvando-treino.png` |
| Demonstração: sucesso | Tela atualizada com a resposta e toast | `main.js`, `ui.js` | `registrarFormulario()`, `mostrarToast()`; `04-treino-criado-sucesso.png` |
| Demonstração: erro | Validação no cliente, 400/404 no servidor, 500 e falha de rede | `validation.js`, `server.py`, `ui.js` | `validarNomeTreino()`, `ErroApi`; `05-erro-validacao-cliente.png`, `06-erro-servidor-500.png`, `07-erro-conexao-tentar-novamente.png` |
| Demonstração: carregamento | Indicador na consulta e botão na submissão | `ui.js`, `style.css` | `mostrarCarregando()`, `MOCK_DELAY_MS`; `01-carregando-treinos.png`, `03-salvando-treino.png` |

## 11. Limitações conhecidas

- O servidor é local e de desenvolvimento: atende só em `127.0.0.1` e não foi feito para produção.
- `db.json` é um armazenamento simples: cada escrita regrava o arquivo inteiro, e uma queda
  durante a gravação poderia corrompê-lo.
- Não há autenticação nem separação de dados por usuário.
- Usar a aplicação altera o `db.json` versionado, que aparece como modificado no Git.
- Duas abas abertas não se atualizam sozinhas; a outra aba só vê a mudança na próxima consulta.
- Voltar para a lista ou para o treino sempre refaz a consulta. É simples e mantém os dados
  fiéis ao servidor, mas o usuário vê o carregamento a cada navegação.
- A numeração das séries é guardada pelo servidor, como pedido nesta etapa; a das sessões de
  cardio continua derivada da posição na lista.
- O roteiro da Etapa 04 que chama `abrirTreino(999999)` pelo console não se aplica mais:
  funções de módulos não ficam globais. O caso continua tratado (ver seção 9).
