// Testes da API REST (Etapas 06 e 07), feitos direto por HTTP, sem navegador.
// Execução: npm test

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { iniciarServidor } = require("./servidor-de-teste");

let servidor;

before(async () => {
  servidor = await iniciarServidor(3998);
});

after(() => servidor?.encerrar());

/* --- Auxiliares --- */

function requisitar(metodo, caminho, corpo, cabecalhos = { "Content-Type": "application/json" }) {
  return fetch(`${servidor.url}/api${caminho}`, {
    method: metodo,
    headers: corpo === undefined ? {} : cabecalhos,
    body: corpo === undefined || typeof corpo === "string" || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo),
  });
}

async function corpoJson(resposta) {
  assert.equal(resposta.headers.get("content-type"), "application/json; charset=utf-8");
  return resposta.json();
}

// Todo erro da API tem o mesmo formato: só o campo "error", com uma mensagem em texto.
async function esperarErro(resposta, status, mensagem) {
  assert.equal(resposta.status, status);
  const corpo = await corpoJson(resposta);
  assert.deepEqual(Object.keys(corpo), ["error"]);
  if (mensagem) assert.equal(corpo.error, mensagem);
}

async function criarTreino(dados = {}) {
  const resposta = await requisitar("POST", "/workouts", { nome: "Treino de teste", dias: [0], ...dados });
  assert.equal(resposta.status, 201);
  return resposta.json();
}

const listarTreinos = async () => (await requisitar("GET", "/workouts")).text();

/* --- Recurso principal: treinos --- */

test("GET /workouts lista os treinos", async () => {
  const resposta = await requisitar("GET", "/workouts");
  assert.equal(resposta.status, 200);
  const treinos = await corpoJson(resposta);
  assert.ok(Array.isArray(treinos));
  assert.deepEqual(treinos.slice(0, 3).map((t) => t.nome), ["Treino A", "Treino B", "Treino C"]);
});

test("GET /workouts/{id} devolve um treino ou 404", async () => {
  const resposta = await requisitar("GET", "/workouts/1");
  assert.equal(resposta.status, 200);
  assert.equal((await corpoJson(resposta)).nome, "Treino A");

  await esperarErro(await requisitar("GET", "/workouts/99999"), 404, "Treino não encontrado.");
  await esperarErro(await requisitar("GET", "/workouts/abc"), 404, "Treino não encontrado.");
  await esperarErro(await requisitar("DELETE", "/workouts/1/exercises/1/sets/xyz"), 404, "Série não encontrada.");
});

test("POST /workouts cria o treino com 201 e Location", async () => {
  const resposta = await requisitar("POST", "/workouts", {
    nome: "  Pernas à tarde  ",
    descricao: "Quadríceps",
    dias: [4, 2, 2],
    campoDesconhecido: "ignorado",
  });
  assert.equal(resposta.status, 201);
  const treino = await corpoJson(resposta);
  assert.equal(resposta.headers.get("location"), `/api/workouts/${treino.id}`);
  assert.deepEqual(treino, {
    id: treino.id,
    nome: "Pernas à tarde",
    descricao: "Quadríceps",
    dias: [2, 4],
    exercicios: [],
    cardio: null,
  });

  const salvo = await (await fetch(servidor.url + resposta.headers.get("location"))).json();
  assert.deepEqual(salvo, treino);
});

test("PUT /workouts/{id} altera os dados e preserva os sub-recursos", async () => {
  const treino = await criarTreino();
  await requisitar("POST", `/workouts/${treino.id}/exercises`, { nome: "Remada" });

  const resposta = await requisitar("PUT", `/workouts/${treino.id}`, { nome: "Costas", dias: [1, 3] });
  assert.equal(resposta.status, 200);
  const alterado = await corpoJson(resposta);
  assert.equal(alterado.nome, "Costas");
  assert.equal(alterado.descricao, "");
  assert.deepEqual(alterado.dias, [1, 3]);
  assert.deepEqual(alterado.exercicios.map((e) => e.nome), ["Remada"]);

  await esperarErro(
    await requisitar("PUT", `/workouts/${treino.id}`, { nome: "Sem dias" }),
    400,
    "Selecione pelo menos um dia da semana."
  );
  await esperarErro(await requisitar("PUT", "/workouts/99999", { nome: "X", dias: [0] }), 404);
});

test("DELETE /workouts/{id} exclui com 204 e sem corpo", async () => {
  const treino = await criarTreino();

  const resposta = await requisitar("DELETE", `/workouts/${treino.id}`);
  assert.equal(resposta.status, 204);
  assert.equal(await resposta.text(), "");

  await esperarErro(await requisitar("GET", `/workouts/${treino.id}`), 404);
  await esperarErro(await requisitar("DELETE", `/workouts/${treino.id}`), 404);
});

/* --- HTTP e erros --- */

test("método não aceito responde 405 com o cabeçalho Allow", async () => {
  const casos = [
    ["DELETE", "/workouts", "GET, POST"],
    ["PATCH", "/workouts/1", "GET, PUT, DELETE"],
    ["GET", "/workouts/1/exercises", "POST"],
  ];
  for (const [metodo, caminho, permitidos] of casos) {
    const resposta = await requisitar(metodo, caminho, metodo === "PATCH" ? {} : undefined);
    await esperarErro(resposta, 405, `O método ${metodo} não é aceito nesta rota.`);
    assert.equal(resposta.headers.get("allow"), permitidos);
  }
});

test("método que o servidor não implementa responde 501 no formato de erro", async () => {
  for (const metodo of ["OPTIONS", "FOO"]) {
    await esperarErro(
      await requisitar(metodo, "/workouts"),
      501,
      `O método ${metodo} não é suportado pelo servidor.`
    );
  }
});

test("rota inexistente responde 404 no mesmo formato de erro", async () => {
  await esperarErro(await requisitar("GET", "/inexistente"), 404, "Rota não encontrada.");
  await esperarErro(await requisitar("GET", "/workouts/1/foo"), 404, "Rota não encontrada.");
});

test("corpo sem Content-Type JSON responde 415", async () => {
  const resposta = await requisitar("POST", "/workouts", '{"nome": "X", "dias": [0]}', {
    "Content-Type": "text/plain",
  });
  await esperarErro(resposta, 415);
});

test("corpo grande demais responde 413", async () => {
  const resposta = await requisitar("POST", "/workouts", { nome: "x".repeat(200_000), dias: [0] });
  await esperarErro(resposta, 413);
});

test("dados inválidos e JSON malformado respondem 400 sem alterar nada", async () => {
  const casos = [
    ["/workouts", { nome: "  ", dias: [0] }, "O nome do treino não pode estar vazio."],
    ["/workouts", { nome: "X", dias: [] }, "Selecione pelo menos um dia da semana."],
    ["/workouts", { nome: "X", dias: [9] }, "Os dias da semana devem ser números de 0 a 6."],
    ["/workouts", { nome: "X", descricao: 5, dias: [0] }, "A descrição deve ser um texto."],
    ["/workouts", "{malformado", "O corpo da requisição não é um JSON válido."],
    ["/workouts", "", "O corpo da requisição não é um JSON válido."],
    ["/workouts", "[1, 2]", "O corpo da requisição deve ser um objeto JSON."],
    ["/workouts/1/exercises", { nome: "" }, "O nome do exercício não pode estar vazio."],
    ["/workouts/1/exercises/2/sets", { peso: 0, repeticoes: 10 }, "O peso deve ser um número maior que zero."],
    ["/workouts/1/exercises/2/sets", '{"peso": Infinity, "repeticoes": 10}', "O peso deve ser um número maior que zero."],
    ["/workouts/1/exercises/2/sets", { peso: 10, repeticoes: 1.5 }, "As repetições devem ser um número inteiro maior que zero."],
    ["/workouts/1/exercises/2/sets", { peso: 10, repeticoes: true }, "As repetições devem ser um número inteiro maior que zero."],
  ];
  const antes = await listarTreinos();

  for (const [caminho, corpo, mensagem] of casos) {
    await esperarErro(await requisitar("POST", caminho, corpo), 400, mensagem);
  }
  // Acento em Latin-1, como o curl do Windows envia o que é digitado no comando.
  const latin1 = Buffer.from('{"nome": "Abdômen", "dias": [0]}', "latin1");
  await esperarErro(
    await requisitar("POST", "/workouts", latin1),
    400,
    "O corpo da requisição deve estar codificado em UTF-8."
  );
  await esperarErro(
    await requisitar("PATCH", "/workouts/1/exercises/2/sets/3", { feita: "sim" }),
    400,
    'O campo "feita" deve ser verdadeiro ou falso.'
  );

  assert.equal(await listarTreinos(), antes, "requisição recusada não pode alterar os dados");
});

/* --- Sub-recursos --- */

test("exercícios e séries: numeração automática e renumeração", async () => {
  const treino = await criarTreino();
  const comExercicio = await (await requisitar("POST", `/workouts/${treino.id}/exercises`, { nome: "Agachamento" })).json();
  const caminho = `/workouts/${treino.id}/exercises/${comExercicio.exercicios[0].id}/sets`;

  await requisitar("POST", caminho, { peso: 50, repeticoes: 10 });
  await requisitar("POST", caminho, { peso: 60, repeticoes: 8 });
  const resposta = await requisitar("POST", caminho, { peso: 70, repeticoes: 6 });
  assert.equal(resposta.status, 201);
  const { series } = (await resposta.json()).exercicios[0];
  assert.deepEqual(series.map((s) => s.numero), [1, 2, 3]);

  const marcada = await (await requisitar("PATCH", `${caminho}/${series[0].id}`, { feita: true })).json();
  assert.equal(marcada.exercicios[0].series[0].feita, true);

  const semASegunda = await (await requisitar("DELETE", `${caminho}/${series[1].id}`)).json();
  assert.deepEqual(semASegunda.exercicios[0].series.map((s) => [s.numero, s.peso]), [[1, 50], [2, 70]]);

  const semExercicio = await requisitar("DELETE", `/workouts/${treino.id}/exercises/${comExercicio.exercicios[0].id}`);
  assert.deepEqual((await semExercicio.json()).exercicios, []);
});

test("cardio: meta, sessões e erro sem cardio definido", async () => {
  const treino = await criarTreino();
  const base = `/workouts/${treino.id}/cardio`;

  await esperarErro(
    await requisitar("POST", `${base}/sessions`, { minutos: 10 }),
    404,
    "Este treino ainda não tem cardio definido."
  );

  const comCardio = await (await requisitar("PUT", base, { modalidade: "Esteira", metaKm: 5 })).json();
  assert.deepEqual(comCardio.cardio, { modalidade: "Esteira", metaMinutos: null, metaKm: 5, sessoes: [] });

  const comSessao = await (await requisitar("POST", `${base}/sessions`, { km: 2.5 })).json();
  const sessao = comSessao.cardio.sessoes[0];
  assert.equal((await (await requisitar("PATCH", `${base}/sessions/${sessao.id}`, { feita: true })).json()).cardio.sessoes[0].feita, true);

  // Editar a meta não descarta as sessões já registradas.
  const metaNova = await (await requisitar("PUT", base, { modalidade: "Esteira", metaKm: 8 })).json();
  assert.equal(metaNova.cardio.sessoes.length, 1);

  const semSessao = await (await requisitar("DELETE", `${base}/sessions/${sessao.id}`)).json();
  assert.deepEqual(semSessao.cardio.sessoes, []);
});

/* --- Persistência (Etapa 07) --- */

test("os dados persistem depois de reiniciar o servidor", async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "gymlog-reinicio-"));
  const db = path.join(pasta, "gymlog.db");
  try {
    const primeiro = await iniciarServidor(3996, { db });
    const resposta = await fetch(`${primeiro.url}/api/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Sobrevive ao reinício", dias: [3] }),
    });
    const { id } = await resposta.json();
    await primeiro.encerrar();

    const segundo = await iniciarServidor(3996, { db });
    try {
      const salvo = await (await fetch(`${segundo.url}/api/workouts/${id}`)).json();
      assert.equal(salvo.nome, "Sobrevive ao reinício");
      assert.deepEqual(salvo.dias, [3]);
    } finally {
      await segundo.encerrar();
    }
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test("banco inacessível responde 500 sem expor detalhes do banco", async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "gymlog-corrompido-"));
  const db = path.join(pasta, "gymlog.db");
  fs.writeFileSync(db, "isto não é um banco SQLite");
  const comDefeito = await iniciarServidor(3995, { db });
  try {
    const resposta = await fetch(`${comDefeito.url}/api/workouts`);
    await esperarErro(resposta, 500, "Não foi possível acessar o banco de dados.");
  } finally {
    await comDefeito.encerrar();
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test("excluir um treino apaga em cascata o que pertence a ele", async () => {
  const treino = await criarTreino();
  const base = `/workouts/${treino.id}`;
  const { exercicios } = await (await requisitar("POST", `${base}/exercises`, { nome: "Supino" })).json();
  await requisitar("POST", `${base}/exercises/${exercicios[0].id}/sets`, { peso: 40, repeticoes: 10 });
  await requisitar("PUT", `${base}/cardio`, { modalidade: "Remo", metaMinutos: 10 });
  await requisitar("POST", `${base}/cardio/sessions`, { minutos: 5 });

  assert.equal((await requisitar("DELETE", base)).status, 204);
  await esperarErro(await requisitar("POST", `${base}/exercises/${exercicios[0].id}/sets`, { peso: 40, repeticoes: 10 }), 404);
  await esperarErro(await requisitar("POST", `${base}/cardio/sessions`, { minutos: 5 }), 404);
});

/* --- Coleção do Postman --- */

// Executa a coleção em ordem, como o Collection Runner do Postman, com um "pm" que
// cobre só o que os scripts dela usam. Garante que a coleção entregue funciona.
test("a coleção do Postman executa sem falhas", async () => {
  const colecao = require("../docs/api/gymlog.postman_collection.json");
  const variaveis = Object.fromEntries(colecao.variable.map((v) => [v.key, v.value]));
  variaveis.baseUrl = `${servidor.url}/api`;
  const substituir = (texto) => texto.replace(/{{(\w+)}}/g, (_, nome) => variaveis[nome]);

  const esperar = (atual) => ({
    to: {
      eql: (esperado) => assert.deepEqual(atual, esperado),
      be: {
        a: (tipo) => assert.equal(typeof atual, tipo),
        an: (tipo) => assert.ok(tipo === "array" ? Array.isArray(atual) : typeof atual === tipo),
      },
    },
  });

  for (const pasta of colecao.item) {
    for (const item of pasta.item) {
      const { method, header, body, url } = item.request;
      const resposta = await fetch(substituir(url.raw), {
        method,
        headers: Object.fromEntries(header.map((h) => [h.key, h.value])),
        body: body && substituir(body.raw),
      });
      const texto = await resposta.text();

      const falhas = [];
      const pm = {
        test: (nome, verificar) => {
          try { verificar(); } catch (erro) { falhas.push(`${nome}: ${erro.message}`); }
        },
        expect: esperar,
        response: {
          json: () => JSON.parse(texto),
          text: () => texto,
          headers: { get: (nome) => resposta.headers.get(nome) },
          to: { have: { status: (status) => assert.equal(resposta.status, status) } },
        },
        collectionVariables: {
          get: (nome) => variaveis[nome],
          set: (nome, valor) => { variaveis[nome] = String(valor); },
        },
      };
      new Function("pm", item.event[0].script.exec.join("\n"))(pm);
      assert.deepEqual(falhas, [], `${pasta.name} › ${item.name}`);
    }
  }
});

test("gravações simultâneas não se perdem (trava do servidor)", async () => {
  const treino = await criarTreino();
  await Promise.all(Array.from({ length: 10 }, (_, i) =>
    requisitar("POST", `/workouts/${treino.id}/exercises`, { nome: `Exercício ${i}` })));

  const salvo = await (await requisitar("GET", `/workouts/${treino.id}`)).json();
  assert.equal(salvo.exercicios.length, 10);
  assert.equal(new Set(salvo.exercicios.map((e) => e.id)).size, 10, "ids devem ser únicos");
});
