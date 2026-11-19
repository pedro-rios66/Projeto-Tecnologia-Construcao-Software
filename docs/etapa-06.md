# Etapa 06 — API REST da aplicação

## 1. Objetivo e visão geral

O objetivo desta etapa é implementar o servidor da aplicação e disponibilizar os
recursos do sistema por meio de uma API REST.

A Etapa 05 já tinha um servidor com API, usado pela interface. Esta etapa o transformou
em uma API completa e documentada:

| Antes (Etapa 05) | Agora (Etapa 06) |
|---|---|
| Treino só podia ser listado, consultado e criado | CRUD completo: `PUT` altera e `DELETE` exclui o treino |
| Todo o servidor em `server.py`, com as rotas em um `match` | Servidor em 4 módulos, com as rotas em uma tabela |
| Rota existente com método errado respondia 404 | `405` com o cabeçalho `Allow` |
| Corpo aceito sem verificar o tipo nem o tamanho | `415` sem `Content-Type: application/json` e `413` acima de 100 KB |
| `201` sem `Location` | `201` com `Location` na criação de treino; `204` na exclusão |
| Sem documentação dos endpoints | Referência em [`docs/api/README.md`](api/README.md), com exemplos reais |
| Testes da API misturados aos da interface | `tests/api-check.js` só para a API, mais a execução da coleção do Postman |

A interface (`src/`) não precisou de nenhuma alteração: o contrato que ela usa foi
mantido, e os 16 testes de interface continuam passando.

## 2. Tecnologia

O servidor continua em **Python com a biblioteca padrão**. O enunciado permite
Node.js/Express ou tecnologia equivalente, e a escolha se mantém pelos mesmos motivos da
Etapa 05: domínio da linguagem, nenhuma dependência e um front-end que não depende da
linguagem do servidor.

Um framework como Express ou Flask resolveria o roteamento e a leitura do corpo
automaticamente. Sem ele, essas partes estão no código e podem ser explicadas linha a
linha: a tabela de rotas tem cerca de 40 linhas, e a conversão do corpo, cerca de 20.

## 3. Organização do servidor

| Arquivo | Responsabilidade |
|---|---|
| `server/server.py` | HTTP: arquivos estáticos, leitura e conversão do corpo, trava, persistência e respostas JSON |
| `server/rotas.py` | Tabela de rotas (`ROTAS`) e uma função por operação |
| `server/validacao.py` | Regras de validação de cada corpo, iguais às do front-end |
| `server/erros.py` | `ErroApi`, o erro padrão convertido em `{"error": ...}` |

As rotas ficam em uma tabela no fim de `rotas.py`, que funciona como índice da API:

```python
ROTAS = {
    "/api/workouts": {"GET": listar_treinos, "POST": criar_treino},
    "/api/workouts/{id}": {"GET": obter_treino, "PUT": atualizar_treino, "DELETE": excluir_treino},
    "/api/workouts/{id}/exercises": {"POST": adicionar_exercicio},
    ...
}
```

`encontrar_rota()` compara o caminho com cada modelo, parte a parte. Trechos entre
chaves viram parâmetros, como `{"id": "29"}`. Caminho desconhecido é `404`; caminho
conhecido com método não listado é `405`, e o cabeçalho `Allow` sai da própria tabela.

O fluxo de uma requisição em `tratar_api()`:

```
lê o corpo (413) → encontra a rota (404/405) → converte o JSON (415/400)
  → com a trava: lê db.json → executa a função da rota (400/404) → grava db.json
  → responde JSON (200/201/204)   |   erro previsto → {"error"}   |   imprevisto → 500
```

## 4. Uso do HTTP

| Requisito | Como foi atendido |
|---|---|
| Métodos com o significado certo | `GET` consulta sem alterar; `POST` cria; `PUT` substitui os dados do treino; `PATCH` altera um campo (`feita`); `DELETE` exclui |
| Códigos coerentes | 200, 201, 204, 400, 404, 405, 413, 415, 500 e 501 (tabela em [`docs/api/README.md`](api/README.md#códigos-http)) |
| Cabeçalhos | `Content-Type: application/json; charset=utf-8` em toda resposta com corpo, `Location` no 201 de treino, `Allow` no 405 |
| JSON | Formato de todas as requisições e respostas, em UTF-8 e com acentos preservados (`ensure_ascii=False`) |
| Recursos e sub-recursos | URLs de substantivos (`/workouts/{id}/exercises/{idExercicio}/sets`); a ação vem do método, não da URL |

**PUT, não PATCH, para o treino.** O `PUT` recebe o mesmo corpo da criação, com
`nome`, `descricao` e `dias`, e reaproveita a mesma validação. Exercícios e cardio não
fazem parte do corpo, porque têm rotas próprias. Já o `PATCH` é usado em séries e
sessões, onde só o campo `feita` muda.

**Sub-recursos devolvem o treino inteiro.** Isso já era assim na Etapa 05 e foi
mantido: a interface substitui o treino pelo que recebeu, sem uma rota de consulta por
tipo de item.

## 5. Validação e erros

A validação fica em `server/validacao.py` e repete as regras e mensagens do
front-end. O servidor não confia no cliente, porque o Postman ou o curl não passam pela
validação da interface. Além dos campos, o servidor recusa:

- corpo sem `Content-Type: application/json` (`415`);
- corpo acima de 100.000 bytes (`413`);
- corpo vazio, JSON malformado ou que não seja um objeto (`400`);
- corpo fora de UTF-8 (`400`, com mensagem própria; acontece no curl do Windows);
- `NaN` e `Infinity`, que o `json` do Python aceita, mas não são números válidos (`400`).

Todos os erros têm o mesmo formato, garantido em `tratar_api` e, para métodos que o servidor não implementa (`501`), em `send_error`:

```json
{"error": "mensagem para o usuário"}
```

Um erro previsto é lançado como `ErroApi(status, mensagem)` em qualquer módulo. Um erro
inesperado é registrado no console do servidor e responde `500` com
`{"error": "Erro interno do servidor."}`, sem expor detalhes internos ao cliente. Uma
requisição recusada nunca grava no `db.json`.

## 6. Como executar

**Pré-requisito:** Python 3.10 ou superior.

```bash
python server/server.py   # no Windows, também: py server/server.py
```

| Endereço | Conteúdo |
|---|---|
| `http://localhost:3000` | Interface do GymLog |
| `http://localhost:3000/api/workouts` | API |

As variáveis `PORT`, `DB_PATH` e `MOCK_DELAY_MS` funcionam como na Etapa 05. O atraso
padrão de 600 ms também vale para o Postman; para respostas imediatas, use
`MOCK_DELAY_MS=0`. Para restaurar os dados de exemplo: `git restore server/db.json`.

## 7. Como testar

| Ferramenta | Como |
|---|---|
| **Postman** | Importe `docs/api/gymlog.postman_collection.json` e rode a coleção: 21 requisições, cada uma com testes |
| **Insomnia** | Importe o mesmo arquivo (as requisições vêm; os scripts de teste do Postman não rodam) |
| **curl** | Comandos prontos em [`docs/api/README.md`](api/README.md), com corpos em `docs/api/exemplos/` |
| **Testes automatizados** | `npm test`: 15 testes da API e 16 da interface |

Um dos testes automatizados executa a coleção do Postman requisição por requisição,
com os scripts de teste dela. Assim, a coleção entregue é verificada a cada `npm test`.

As capturas da Etapa 05 só são regravadas com `npm run evidencias`, para que rodar os
testes não altere as evidências já entregues.

## 8. Matriz de requisitos

| Requisito | Implementação | Evidência |
|---|---|---|
| API com recurso principal | Treino (`/api/workouts`), com exercícios, séries e cardio como sub-recursos | `ROTAS` em `server/rotas.py` |
| GET para consulta | `GET /workouts` → `listar_treinos()` | Teste "GET /workouts lista os treinos"; README da API, "Listar treinos" |
| GET para consulta individual | `GET /workouts/{id}` → `obter_treino()` | Teste "GET /workouts/{id} devolve um treino ou 404" |
| POST para criação | `POST /workouts` → `criar_treino()`, com `201` e `Location` | Teste "POST /workouts cria o treino com 201 e Location" |
| PUT ou PATCH para alteração | `PUT /workouts/{id}` → `atualizar_treino()`; `PATCH` em séries e sessões | Teste "PUT /workouts/{id} altera os dados e preserva os sub-recursos" |
| DELETE para exclusão | `DELETE /workouts/{id}` → `excluir_treino()`, com `204` | Teste "DELETE /workouts/{id} exclui com 204 e sem corpo" |
| Utilizar HTTP adequadamente | Métodos, códigos e cabeçalhos da seção 4 | Testes 405, 413 e 415; `responder_json()` |
| Utilizar JSON | Corpo e resposta em JSON UTF-8 | `converter_json()`, `responder_json()`; teste `corpoJson()` confere o `Content-Type` |
| Códigos HTTP coerentes | 200, 201, 204, 400, 404, 405, 413, 415, 500 e 501 | Tabela em `docs/api/README.md`; testes da API |
| Validar entradas | `server/validacao.py` e conversão do corpo | Teste "dados inválidos e JSON malformado respondem 400 sem alterar nada" |
| Erros consistentes | Sempre `{"error": "..."}`, a partir de `ErroApi` | `esperarErro()` confere o formato em todos os testes de erro |
| Organizar as rotas | Tabela `ROTAS` e uma função por operação | `server/rotas.py`; seção 3 |
| Testável por Postman, Insomnia ou curl | Coleção e exemplos de curl | `docs/api/`; teste "a coleção do Postman executa sem falhas" |

| Item de entrega | Onde está |
|---|---|
| Código da API | `server/server.py`, `server/rotas.py`, `server/validacao.py`, `server/erros.py` |
| Documentação dos endpoints | [`docs/api/README.md`](api/README.md) |
| Exemplos de requisições | Comandos curl em `docs/api/README.md`; corpos em `docs/api/exemplos/` |
| Exemplos de respostas | Respostas reais em `docs/api/README.md`, inclusive de erro |
| Coleção Postman | [`docs/api/gymlog.postman_collection.json`](api/gymlog.postman_collection.json) |
| Instruções para execução | Seção 6 deste documento e o README do projeto |

## 9. Limitações conhecidas

- **Servidor local de desenvolvimento:** atende só em `127.0.0.1`, sem HTTPS, e não foi feito para produção.
- **Sem autenticação:** qualquer cliente local pode alterar ou excluir treinos.
- **Sem paginação nem filtros:** `GET /workouts` devolve todos os treinos, o que basta para o volume de um usuário.
- **Sem versão na URL:** as rotas não têm prefixo como `/api/v1`. Uma mudança incompatível
  no contrato exigiria atualizar o front-end junto.
- **Armazenamento simples:** `db.json` é regravado por inteiro a cada escrita, e as
  operações são serializadas pela trava.
- **Interface sem edição e exclusão de treino:** as rotas existem e funcionam, mas a
  interface não as usa. Se um treino for excluído pela API com a página aberta, a
  interface mostra o aviso de treino inexistente e volta para a lista.
- **Resposta em HTTP/1.0:** o servidor da biblioteca padrão responde em HTTP/1.0 e fecha a
  conexão a cada requisição. Funciona com navegadores, Postman, Insomnia e curl.
