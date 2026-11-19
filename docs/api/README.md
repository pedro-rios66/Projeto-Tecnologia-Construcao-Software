# API REST do GymLog

Referência dos endpoints. Para executar o servidor e o contexto da etapa, veja
[`docs/etapa-06.md`](../etapa-06.md).

| | |
|---|---|
| **URL base** | `http://localhost:3000/api` |
| **Formato** | JSON em UTF-8, nas requisições e nas respostas |
| **Recurso principal** | treino (`/workouts`) |
| **Sub-recursos** | exercícios, séries e cardio de um treino |
| **Coleção do Postman** | [`gymlog.postman_collection.json`](gymlog.postman_collection.json) |
| **Corpos de exemplo** | [`exemplos/`](exemplos/) |

## Sumário

- [Convenções](#convenções)
- [Códigos HTTP](#códigos-http)
- [Formato dos erros](#formato-dos-erros)
- [O recurso treino](#o-recurso-treino)
- [Endpoints](#endpoints)
- [Treinos](#treinos)
- [Exercícios e séries](#exercícios-e-séries)
- [Cardio](#cardio)
- [Exemplos de erro](#exemplos-de-erro)
- [Testando com Postman, Insomnia ou curl](#testando-com-postman-insomnia-ou-curl)

## Convenções

- Requisições com corpo (`POST`, `PUT`, `PATCH`) precisam do cabeçalho
  `Content-Type: application/json`; sem ele, a resposta é `415`.
- O corpo é limitado a 100.000 bytes; acima disso, a resposta é `413`.
- Textos são aparados (sem espaços nas pontas). Campos desconhecidos são ignorados.
- Os ids são números gerados pelo servidor. Um id que não existe, ou que não é número, responde `404`.
- **Escritas em sub-recursos devolvem o treino inteiro atualizado**, para o cliente
  ter o estado completo sem uma nova consulta.

## Códigos HTTP

| Código | Quando |
|---|---|
| `200 OK` | Consulta, alteração ou remoção de sub-recurso com sucesso |
| `201 Created` | Criação com sucesso; na criação de treino, o cabeçalho `Location` aponta para ele |
| `204 No Content` | Treino excluído; a resposta não tem corpo |
| `400 Bad Request` | Dado inválido, JSON malformado ou corpo que não está em UTF-8 |
| `404 Not Found` | Treino, exercício, série ou sessão inexistente, ou rota desconhecida |
| `405 Method Not Allowed` | A rota existe, mas não aceita o método; o cabeçalho `Allow` lista os aceitos |
| `413 Content Too Large` | Corpo acima de 100.000 bytes |
| `415 Unsupported Media Type` | Corpo enviado sem `Content-Type: application/json` |
| `500 Internal Server Error` | Erro inesperado no servidor, como um `db.json` corrompido |
| `501 Not Implemented` | Método que o servidor não implementa em nenhuma rota, como `OPTIONS` |

## Formato dos erros

Todo erro, de qualquer rota, tem o mesmo formato: um objeto com o campo `error`, cuja
mensagem pode ser exibida diretamente ao usuário.

```json
{"error": "O nome do treino não pode estar vazio."}
```

## O recurso treino

```json
{
  "id": 1,
  "nome": "Treino A",
  "descricao": "Peito + Tríceps",
  "dias": [0, 4],
  "exercicios": [
    {
      "id": 2,
      "nome": "Supino Reto",
      "series": [
        {"id": 3, "numero": 1, "peso": 60, "repeticoes": 10, "feita": false}
      ]
    }
  ],
  "cardio": {
    "modalidade": "Esteira",
    "metaMinutos": 30,
    "metaKm": 5,
    "sessoes": [
      {"id": 10, "minutos": 12, "km": 1.8, "feita": true}
    ]
  }
}
```

| Campo | Tipo | Regras |
|---|---|---|
| `nome` | texto | obrigatório, não pode ser vazio |
| `descricao` | texto | opcional; padrão `""` |
| `dias` | lista de inteiros | ao menos um; de 0 (segunda) a 6 (domingo); duplicados são removidos e a lista é ordenada |
| `exercicios[].nome` | texto | obrigatório, não pode ser vazio |
| `series[].peso` | número | maior que zero |
| `series[].repeticoes` | inteiro | maior que zero |
| `series[].numero` | inteiro | gerado pelo servidor; renumerado quando uma série é removida |
| `feita` | booleano | `true` ou `false`, nas séries e nas sessões |
| `cardio.modalidade` | texto | obrigatório, não pode ser vazio |
| `cardio.metaMinutos`, `cardio.metaKm` | número ou `null` | ao menos uma das metas; se informada, maior que zero |
| `sessoes[].minutos`, `sessoes[].km` | número ou `null` | ao menos um dos dois; se informado, maior que zero |

`cardio` é `null` enquanto o treino não tem cardio definido.

## Endpoints

| Método | Rota | Ação | Sucesso |
|---|---|---|---|
| GET | `/workouts` | Lista os treinos | 200 |
| GET | `/workouts/{id}` | Consulta um treino | 200 |
| POST | `/workouts` | Cria um treino | 201 |
| PUT | `/workouts/{id}` | Altera um treino | 200 |
| DELETE | `/workouts/{id}` | Exclui um treino | 204 |
| POST | `/workouts/{id}/exercises` | Adiciona um exercício | 201 |
| DELETE | `/workouts/{id}/exercises/{idExercicio}` | Remove um exercício e suas séries | 200 |
| POST | `/workouts/{id}/exercises/{idExercicio}/sets` | Registra uma série | 201 |
| PATCH | `/workouts/{id}/exercises/{idExercicio}/sets/{idSerie}` | Marca ou desmarca a série como feita | 200 |
| DELETE | `/workouts/{id}/exercises/{idExercicio}/sets/{idSerie}` | Remove uma série | 200 |
| PUT | `/workouts/{id}/cardio` | Define ou altera a meta de cardio | 200 |
| POST | `/workouts/{id}/cardio/sessions` | Registra uma sessão de cardio | 201 |
| PATCH | `/workouts/{id}/cardio/sessions/{idSessao}` | Marca ou desmarca a sessão como feita | 200 |
| DELETE | `/workouts/{id}/cardio/sessions/{idSessao}` | Remove uma sessão | 200 |

Os exemplos abaixo são respostas reais do servidor, partindo dos dados de exemplo de
`server/db.json`. Os comandos devem ser executados na raiz do projeto, porque leem os
corpos de `docs/api/exemplos/`. Os cabeçalhos `Server`, `Date` e `Content-Length` foram omitidos.

## Treinos

### Listar treinos

`GET /workouts`

```bash
curl -i http://localhost:3000/api/workouts
```

```http
HTTP/1.0 200 OK
Content-Type: application/json; charset=utf-8

[{"id": 1, "nome": "Treino A", "descricao": "Peito + Tríceps", "dias": [0, 4], "exercicios": [...], "cardio": {...}}, ...]
```

A resposta traz a lista completa de treinos, cada um no formato descrito acima (abreviada aqui).

### Criar treino

`POST /workouts`, com o corpo de [`exemplos/criar-treino.json`](exemplos/criar-treino.json):

```json
{"nome": "Treino D", "descricao": "Ombros + Abdômen", "dias": [2, 5]}
```

```bash
curl -i -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/criar-treino.json
```

```http
HTTP/1.0 201 Created
Content-Type: application/json; charset=utf-8
Location: /api/workouts/29

{"id": 29, "nome": "Treino D", "descricao": "Ombros + Abdômen", "dias": [2, 5], "exercicios": [], "cardio": null}
```

### Consultar treino

`GET /workouts/{id}`

```bash
curl -i http://localhost:3000/api/workouts/29
```

```http
HTTP/1.0 200 OK
Content-Type: application/json; charset=utf-8

{"id": 29, "nome": "Treino D", "descricao": "Ombros + Abdômen", "dias": [2, 5], "exercicios": [], "cardio": null}
```

### Alterar treino

`PUT /workouts/{id}`. O corpo é o mesmo da criação e substitui `nome`, `descricao` e
`dias`. Exercícios e cardio não mudam, porque têm rotas próprias.

```json
{"nome": "Treino D", "descricao": "Ombros", "dias": [2]}
```

```bash
curl -i -X PUT http://localhost:3000/api/workouts/29 \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/alterar-treino.json
```

```http
HTTP/1.0 200 OK
Content-Type: application/json; charset=utf-8

{"id": 29, "nome": "Treino D", "descricao": "Ombros", "dias": [2], "exercicios": [], "cardio": null}
```

### Excluir treino

`DELETE /workouts/{id}`. Exclui o treino com todos os exercícios, séries e cardio.

```bash
curl -i -X DELETE http://localhost:3000/api/workouts/29
```

```http
HTTP/1.0 204 No Content
```

## Exercícios e séries

### Adicionar exercício

`POST /workouts/{id}/exercises`

```json
{"nome": "Desenvolvimento com Halteres"}
```

```bash
curl -i -X POST http://localhost:3000/api/workouts/29/exercises \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/exercicio.json
```

```http
HTTP/1.0 201 Created
Content-Type: application/json; charset=utf-8

{"id": 29, "nome": "Treino D", "descricao": "Ombros", "dias": [2], "exercicios": [{"id": 30, "nome": "Desenvolvimento com Halteres", "series": []}], "cardio": null}
```

### Registrar série

`POST /workouts/{id}/exercises/{idExercicio}/sets`. O servidor gera o `numero`.

```json
{"peso": 14, "repeticoes": 12}
```

```bash
curl -i -X POST http://localhost:3000/api/workouts/29/exercises/30/sets \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/serie.json
```

```http
HTTP/1.0 201 Created
Content-Type: application/json; charset=utf-8

{"id": 29, "nome": "Treino D", "descricao": "Ombros", "dias": [2], "exercicios": [{"id": 30, "nome": "Desenvolvimento com Halteres", "series": [{"id": 31, "numero": 1, "peso": 14, "repeticoes": 12, "feita": false}]}], "cardio": null}
```

### Marcar série como feita

`PATCH /workouts/{id}/exercises/{idExercicio}/sets/{idSerie}`

```json
{"feita": true}
```

```bash
curl -i -X PATCH http://localhost:3000/api/workouts/29/exercises/30/sets/31 \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/feita.json
```

```http
HTTP/1.0 200 OK
Content-Type: application/json; charset=utf-8

{"id": 29, "nome": "Treino D", "descricao": "Ombros", "dias": [2], "exercicios": [{"id": 30, "nome": "Desenvolvimento com Halteres", "series": [{"id": 31, "numero": 1, "peso": 14, "repeticoes": 12, "feita": true}]}], "cardio": null}
```

### Remover série e exercício

`DELETE /workouts/{id}/exercises/{idExercicio}/sets/{idSerie}` remove a série e
renumera as restantes. `DELETE /workouts/{id}/exercises/{idExercicio}` remove o
exercício com suas séries. Ambos respondem `200` com o treino atualizado.

```bash
curl -i -X DELETE http://localhost:3000/api/workouts/29/exercises/30/sets/31
curl -i -X DELETE http://localhost:3000/api/workouts/29/exercises/30
```

```http
HTTP/1.0 200 OK
Content-Type: application/json; charset=utf-8

{"id": 29, "nome": "Treino D", "descricao": "Ombros", "dias": [2], "exercicios": [], "cardio": null}
```

## Cardio

### Definir meta

`PUT /workouts/{id}/cardio`. Alterar a meta preserva as sessões já registradas.

```json
{"modalidade": "Bicicleta", "metaMinutos": 30}
```

```bash
curl -i -X PUT http://localhost:3000/api/workouts/29/cardio \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/cardio.json
```

```http
HTTP/1.0 200 OK
Content-Type: application/json; charset=utf-8

{"id": 29, "nome": "Treino D", "descricao": "Ombros", "dias": [2], "exercicios": [], "cardio": {"modalidade": "Bicicleta", "metaMinutos": 30, "metaKm": null, "sessoes": []}}
```

### Registrar sessão

`POST /workouts/{id}/cardio/sessions`. Exige cardio definido; sem ele, a resposta é
`404` com "Este treino ainda não tem cardio definido."

```json
{"minutos": 15}
```

```bash
curl -i -X POST http://localhost:3000/api/workouts/29/cardio/sessions \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/sessao.json
```

```http
HTTP/1.0 201 Created
Content-Type: application/json; charset=utf-8

{"id": 29, "nome": "Treino D", "descricao": "Ombros", "dias": [2], "exercicios": [], "cardio": {"modalidade": "Bicicleta", "metaMinutos": 30, "metaKm": null, "sessoes": [{"id": 32, "minutos": 15, "km": null, "feita": false}]}}
```

### Marcar e remover sessão

`PATCH /workouts/{id}/cardio/sessions/{idSessao}` (corpo `{"feita": true}`) e
`DELETE /workouts/{id}/cardio/sessions/{idSessao}` respondem `200` com o treino
atualizado, como nas séries.

```bash
curl -i -X PATCH http://localhost:3000/api/workouts/29/cardio/sessions/32 \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/feita.json
curl -i -X DELETE http://localhost:3000/api/workouts/29/cardio/sessions/32
```

## Exemplos de erro

**400: dado inválido** ([`exemplos/treino-invalido.json`](exemplos/treino-invalido.json))

```bash
curl -i -X POST http://localhost:3000/api/workouts \
  -H "Content-Type: application/json" \
  --data-binary @docs/api/exemplos/treino-invalido.json
```

```http
HTTP/1.0 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error": "O nome do treino não pode estar vazio."}
```

**400: JSON malformado** ([`exemplos/json-malformado.json`](exemplos/json-malformado.json))

```http
HTTP/1.0 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error": "O corpo da requisição não é um JSON válido."}
```

**400: corpo fora de UTF-8.** Acontece no `curl` do Windows quando um texto com acento
é digitado direto no comando com `-d`. Use `--data-binary @arquivo.json`, como nos exemplos acima.

```http
HTTP/1.0 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error": "O corpo da requisição deve estar codificado em UTF-8."}
```

**404: treino inexistente**

```bash
curl -i http://localhost:3000/api/workouts/99999
```

```http
HTTP/1.0 404 Not Found
Content-Type: application/json; charset=utf-8

{"error": "Treino não encontrado."}
```

**405: método não aceito**

```bash
curl -i -X DELETE http://localhost:3000/api/workouts
```

```http
HTTP/1.0 405 Method Not Allowed
Content-Type: application/json; charset=utf-8
Allow: GET, POST

{"error": "O método DELETE não é aceito nesta rota."}
```

**415: corpo sem `Content-Type: application/json`**

```bash
curl -i -X POST http://localhost:3000/api/workouts -d "nome=Treino"
```

```http
HTTP/1.0 415 Unsupported Media Type
Content-Type: application/json; charset=utf-8

{"error": "Envie o corpo em JSON, com o cabeçalho \"Content-Type: application/json\"."}
```

As outras mensagens de validação estão na tabela de regras de
[`docs/etapa-04.md`](../etapa-04.md#3-validações-implementadas), que o servidor
repete, e em `server/validacao.py`.

## Testando com Postman, Insomnia ou curl

**Postman.** Em *Import*, escolha `docs/api/gymlog.postman_collection.json`. A
variável `baseUrl` já aponta para `http://localhost:3000/api`. Execute as pastas em
ordem, ou a coleção inteira pelo *Run collection*: a criação guarda os ids (`idTreino`,
`idExercicio`, `idSerie`, `idSessao`) usados pelas requisições seguintes, e cada
requisição tem testes do status e do formato da resposta. A última pasta exclui o
treino criado, então os dados de exemplo não acumulam lixo.

**Insomnia.** Em *Import*, escolha o mesmo arquivo; o Insomnia importa coleções do
Postman. Os scripts de teste do Postman não são executados no Insomnia, mas as
requisições e a variável `baseUrl` são importadas.

**curl.** Use os comandos desta página, a partir da raiz do projeto. No Windows
PowerShell, `curl` é um apelido de outro comando: digite `curl.exe` e escreva cada
comando em uma linha só, sem as barras invertidas de continuação.
