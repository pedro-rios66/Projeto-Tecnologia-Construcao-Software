// Testes de ponta a ponta do GymLog: sobe o servidor Python com uma cópia temporária
// do db.json, exercita a interface pelo navegador e captura as evidências da Etapa 05.
// Execução: npm test

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { chromium } = require("playwright");

const RAIZ = path.join(__dirname, "..");
const EVIDENCIAS = path.join(RAIZ, "docs", "evidencias", "etapa-05");
const PORTA = "3999"; // diferente da porta padrão, para não conversar com um servidor já aberto
const URL_BASE = `http://127.0.0.1:${PORTA}`;

let servidor;
let navegador;
let pastaTemporaria;

async function aguardarServidor() {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    assert.equal(servidor.exitCode, null, "o servidor Python encerrou ao iniciar");
    const respondeu = await fetch(`${URL_BASE}/api/workouts`).then((r) => r.ok, () => false);
    if (respondeu) return;
    await new Promise((resolver) => setTimeout(resolver, 200));
  }
  assert.fail("o servidor Python não respondeu a tempo");
}

before(async () => {
  pastaTemporaria = fs.mkdtempSync(path.join(os.tmpdir(), "gymlog-"));
  const dbTemporario = path.join(pastaTemporaria, "db.json");
  fs.copyFileSync(path.join(RAIZ, "server", "db.json"), dbTemporario);
  fs.mkdirSync(EVIDENCIAS, { recursive: true });

  const python = process.platform === "win32" ? "python" : "python3";
  servidor = spawn(python, [path.join(RAIZ, "server", "server.py")], {
    env: { ...process.env, PORT: PORTA, DB_PATH: dbTemporario, MOCK_DELAY_MS: "20" },
    stdio: "ignore",
  });

  await aguardarServidor();
  // No Windows usa o Edge já instalado, sem precisar baixar um navegador.
  navegador = await chromium.launch(process.platform === "win32" ? { channel: "msedge" } : {});
});

after(async () => {
  await navegador?.close();
  servidor?.kill();
  fs.rmSync(pastaTemporaria, { recursive: true, force: true });
});

/* --- Auxiliares --- */

// Abre uma página nova e falha o teste em qualquer erro de console inesperado.
// Com falhasEsperadas, só o aviso do navegador sobre respostas HTTP de erro é tolerado.
function testarPagina(nome, corpo, { falhasEsperadas = false } = {}) {
  test(nome, async () => {
    const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } });
    const errosDeConsole = [];
    pagina.on("pageerror", (erro) => errosDeConsole.push(erro.message));
    pagina.on("console", (mensagem) => {
      const tolerado = falhasEsperadas && mensagem.text().includes("Failed to load resource");
      if (mensagem.type() === "error" && !tolerado) errosDeConsole.push(mensagem.text());
    });

    try {
      await corpo(pagina);
      assert.deepEqual(errosDeConsole, []);
    } finally {
      await pagina.close();
    }
  });
}

// Espera o fade de entrada das telas (0,28 s) para a captura não sair escurecida.
async function capturar(pagina, arquivo) {
  await pagina.waitForTimeout(350);
  await pagina.screenshot({ path: path.join(EVIDENCIAS, arquivo), animations: "disabled" });
}

// Segura as respostas de uma rota até a função devolvida ser chamada.
async function atrasarRota(pagina, rota, metodo) {
  let soltar;
  const portao = new Promise((resolver) => { soltar = resolver; });
  await pagina.route(rota, async (requisicao) => {
    if (requisicao.request().method() === metodo) await portao;
    await requisicao.continue();
  });
  return soltar;
}

const responderErro500 = (rota) =>
  rota.fulfill({ status: 500, json: { error: "Erro interno do servidor." } });

const apiJson = (metodo, caminho, corpo) =>
  fetch(`${URL_BASE}/api${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });

const obterTreinoCriado = async (dados) =>
  (await apiJson("POST", "/workouts", { dias: [0], ...dados })).json();

// O toast some sozinho: confere o texto, que continua no elemento depois de oculto,
// para uma pausa momentânea da máquina não reprovar o teste.
const confirmarToast = (pagina, texto) =>
  pagina.locator("#toast", { hasText: texto }).waitFor({ state: "attached" });

const abrirCartaoTreino = async (pagina, nome) => {
  await pagina.goto(URL_BASE);
  await pagina.locator(".treino", { hasText: nome }).first().click();
  await pagina.locator("#titulo-treino", { hasText: nome }).waitFor();
};

/* --- Servidor --- */

test("arquivos estáticos são servidos com o tipo MIME correto", async () => {
  const esperados = {
    "/": "text/html",
    "/css/style.css": "text/css",
    "/js/main.js": "text/javascript",
    "/js/api.js": "text/javascript",
    "/js/state.js": "text/javascript",
    "/js/ui.js": "text/javascript",
    "/js/validation.js": "text/javascript",
    "/js/calculations.js": "text/javascript",
  };
  for (const [caminho, tipo] of Object.entries(esperados)) {
    const resposta = await fetch(URL_BASE + caminho);
    assert.equal(resposta.status, 200, caminho);
    assert.ok(resposta.headers.get("content-type").startsWith(tipo), caminho);
  }
  assert.equal((await fetch(`${URL_BASE}/server/db.json`)).status, 404, "db.json não é público");
});

test("a API recusa dados inválidos e JSON malformado com 400", async () => {
  const casos = [
    ["/workouts", { nome: "  ", dias: [0] }, "O nome do treino não pode estar vazio."],
    ["/workouts", { nome: "X", dias: [] }, "Selecione pelo menos um dia da semana."],
    ["/workouts", { nome: "X", dias: [9] }, "Os dias da semana devem ser números de 0 a 6."],
    ["/workouts", "{malformado", "O corpo da requisição não é um JSON válido."],
    ["/workouts", "[1, 2]", "O corpo da requisição deve ser um objeto JSON."],
    ["/workouts/1/exercises", { nome: "" }, "O nome do exercício não pode estar vazio."],
    ["/workouts/1/exercises/2/sets", { peso: 0, repeticoes: 10 }, "O peso deve ser um número maior que zero."],
    ["/workouts/1/exercises/2/sets", '{"peso": Infinity, "repeticoes": 10}', "O peso deve ser um número maior que zero."],
    ["/workouts/1/exercises/2/sets", { peso: 10, repeticoes: 1.5 }, "As repetições devem ser um número inteiro maior que zero."],
    ["/workouts/1/exercises/2/sets", { peso: 10, repeticoes: true }, "As repetições devem ser um número inteiro maior que zero."],
  ];
  const antes = await (await fetch(`${URL_BASE}/api/workouts`)).text();

  for (const [caminho, corpo, mensagem] of casos) {
    const resposta = await apiJson("POST", caminho, corpo);
    assert.equal(resposta.status, 400, mensagem);
    assert.ok(resposta.headers.get("content-type").startsWith("application/json"));
    assert.deepEqual(await resposta.json(), { error: mensagem });
  }

  const depois = await (await fetch(`${URL_BASE}/api/workouts`)).text();
  assert.equal(depois, antes, "requisição recusada não pode alterar os dados");
});

test("a API responde 404 em JSON para ids e rotas inexistentes", async () => {
  const caminhos = ["/workouts/999", "/workouts/abc", "/workouts/1/exercises/999/sets", "/inexistente"];
  for (const caminho of caminhos) {
    const resposta = await fetch(`${URL_BASE}/api${caminho}`, {
      method: caminho.endsWith("sets") ? "POST" : "GET",
      body: caminho.endsWith("sets") ? JSON.stringify({ peso: 10, repeticoes: 10 }) : undefined,
    });
    assert.equal(resposta.status, 404, caminho);
    assert.ok((await resposta.json()).error, caminho);
  }
});

test("a API numera as séries e preserva acentos", async () => {
  const treino = await obterTreinoCriado({ nome: "Pernas à tarde" });
  assert.equal(treino.nome, "Pernas à tarde");

  const comExercicio = await (await apiJson("POST", `/workouts/${treino.id}/exercises`, { nome: "Agachamento" })).json();
  const caminho = `/workouts/${treino.id}/exercises/${comExercicio.exercicios[0].id}/sets`;

  await apiJson("POST", caminho, { peso: 50, repeticoes: 10 });
  await apiJson("POST", caminho, { peso: 60, repeticoes: 8 });
  const resposta = await apiJson("POST", caminho, { peso: 70, repeticoes: 6 });
  assert.equal(resposta.status, 201);
  const { series } = (await resposta.json()).exercicios[0];
  assert.deepEqual(series.map((s) => s.numero), [1, 2, 3]);

  const semASegunda = await (await fetch(`${URL_BASE}/api${caminho}/${series[1].id}`, { method: "DELETE" })).json();
  assert.deepEqual(semASegunda.exercicios[0].series.map((s) => [s.numero, s.peso]), [[1, 50], [2, 70]]);
});

test("gravações simultâneas não se perdem (trava do servidor)", async () => {
  const treino = await obterTreinoCriado({ nome: "Concorrência" });
  await Promise.all(Array.from({ length: 10 }, (_, i) =>
    apiJson("POST", `/workouts/${treino.id}/exercises`, { nome: `Exercício ${i}` })));

  const salvo = await (await fetch(`${URL_BASE}/api/workouts/${treino.id}`)).json();
  assert.equal(salvo.exercicios.length, 10);
  assert.equal(new Set(salvo.exercicios.map((e) => e.id)).size, 10, "ids devem ser únicos");
});

/* --- Consulta --- */

testarPagina("consulta inicial mostra carregamento e depois os treinos", async (pagina) => {
  const soltar = await atrasarRota(pagina, "**/api/workouts", "GET");
  await pagina.goto(URL_BASE);

  const lista = pagina.locator("#lista-treinos");
  await pagina.getByText("Carregando treinos...").waitFor();
  assert.equal(await lista.getAttribute("aria-busy"), "true");
  await capturar(pagina, "01-carregando-treinos.png");

  soltar();
  await pagina.locator(".treino", { hasText: "Treino A" }).first().waitFor();
  assert.equal(await lista.getAttribute("aria-busy"), "false");
  assert.equal(await pagina.locator(".carregando").count(), 0);
  assert.equal(await pagina.locator(".dia").count(), 7);
  assert.ok(await pagina.locator(".treino", { hasText: "Treino C" }).count());
  await capturar(pagina, "02-treinos-carregados.png");
});

testarPagina("abrir um treino mostra carregamento e as métricas", async (pagina) => {
  await pagina.goto(URL_BASE);
  const soltar = await atrasarRota(pagina, "**/api/workouts/*", "GET");
  await pagina.locator(".treino", { hasText: "Treino A" }).first().click();

  await pagina.getByText("Carregando treino...").waitFor();
  assert.equal(await pagina.locator("#estado-treino").getAttribute("aria-busy"), "true");
  assert.equal(await pagina.locator("#conteudo-treino").isVisible(), false);

  soltar();
  await pagina.locator("#titulo-treino", { hasText: "Treino A" }).waitFor();
  assert.equal(await pagina.locator("#estado-treino").getAttribute("aria-busy"), "false");
  assert.equal(await pagina.locator("#metrica-exercicios").textContent(), "3");
  assert.equal(await pagina.locator("#metrica-series").textContent(), "5");
  assert.equal(await pagina.locator("#metrica-repeticoes").textContent(), "52");
});

testarPagina("lista vazia mostra o estado vazio", async (pagina) => {
  await pagina.route("**/api/workouts", (rota) => rota.fulfill({ json: [] }));
  await pagina.goto(URL_BASE);
  await pagina.getByText("Nenhum treino cadastrado ainda.").waitFor();
});

/* --- Erros de comunicação --- */

testarPagina("erro 500 na consulta oferece Tentar novamente", async (pagina) => {
  await pagina.route("**/api/workouts", responderErro500);
  await pagina.goto(URL_BASE);

  await pagina.getByRole("alert").getByText("Erro interno do servidor.").waitFor();
  assert.equal(await pagina.locator("#lista-treinos").getAttribute("aria-busy"), "false");
  await capturar(pagina, "06-erro-servidor-500.png");

  await pagina.unroute("**/api/workouts");
  await pagina.getByRole("button", { name: "Tentar novamente" }).click();
  await pagina.locator(".treino", { hasText: "Treino A" }).first().waitFor();
}, { falhasEsperadas: true });

testarPagina("falha de rede mostra mensagem amigável e permite tentar de novo", async (pagina) => {
  await pagina.route("**/api/workouts", (rota) => rota.abort());
  await pagina.goto(URL_BASE);

  await pagina.getByText("Não foi possível conectar ao servidor. Verifique se ele está em execução.").waitFor();
  await capturar(pagina, "07-erro-conexao-tentar-novamente.png");

  await pagina.unroute("**/api/workouts");
  await pagina.getByRole("button", { name: "Tentar novamente" }).click();
  await pagina.locator(".treino", { hasText: "Treino A" }).first().waitFor();
}, { falhasEsperadas: true });

testarPagina("erro ao abrir um treino oferece Tentar novamente", async (pagina) => {
  await pagina.goto(URL_BASE);
  await pagina.route("**/api/workouts/*", responderErro500);
  await pagina.locator(".treino", { hasText: "Treino A" }).first().click();
  await pagina.locator("#estado-treino").getByText("Erro interno do servidor.").waitFor();

  await pagina.unroute("**/api/workouts/*");
  await pagina.locator("#estado-treino").getByRole("button", { name: "Tentar novamente" }).click();
  await pagina.locator("#titulo-treino", { hasText: "Treino A" }).waitFor();
  assert.equal(await pagina.locator("#estado-treino").count(), 1);
  assert.equal(await pagina.getByRole("alert").count(), 0);
}, { falhasEsperadas: true });

testarPagina("treino inexistente (404) volta para a lista", async (pagina) => {
  await pagina.goto(URL_BASE);
  await pagina.route("**/api/workouts/*", (rota) =>
    rota.fulfill({ status: 404, json: { error: "Treino não encontrado." } }));
  await pagina.locator(".treino", { hasText: "Treino A" }).first().click();

  await confirmarToast(pagina, "Treino não encontrado.");
  await pagina.locator("#tela-treinos").waitFor();
  await pagina.locator(".treino", { hasText: "Treino A" }).first().waitFor();
}, { falhasEsperadas: true });

testarPagina("resposta que nunca chega é interrompida pelo tempo limite", async (pagina) => {
  await pagina.route("**/api/workouts", () => { /* nunca responde */ });
  await pagina.goto(URL_BASE);
  await pagina.getByText("O servidor demorou demais para responder.").waitFor({ timeout: 10000 });
  assert.equal(await pagina.locator("#lista-treinos").getAttribute("aria-busy"), "false");
});

/* --- Submissão --- */

testarPagina("validação no cliente bloqueia o envio", async (pagina) => {
  let envios = 0;
  pagina.on("request", (r) => { if (r.method() !== "GET") envios++; });

  await pagina.goto(URL_BASE);
  await pagina.locator("#btn-novo-treino").click();
  await pagina.getByRole("button", { name: "Criar treino" }).click();
  await pagina.locator("#erro-novo-treino", { hasText: "O nome do treino não pode estar vazio." }).waitFor();
  await capturar(pagina, "05-erro-validacao-cliente.png");

  await pagina.locator("#input-nome-treino").fill("Sem dias");
  await pagina.locator('input[name="dia"]:checked').uncheck();
  await pagina.getByRole("button", { name: "Criar treino" }).click();
  await pagina.locator("#erro-novo-treino", { hasText: "Selecione pelo menos um dia da semana." }).waitFor();

  assert.equal(envios, 0);
});

testarPagina("criar treino, exercício e série com sucesso", async (pagina) => {
  let envios = 0;
  pagina.on("request", (r) => { if (r.method() === "POST") envios++; });

  await pagina.goto(URL_BASE);
  await pagina.locator("#btn-novo-treino").click();
  await pagina.locator("#input-nome-treino").fill("Treino Etapa 05");
  await pagina.locator("#input-descricao-treino").fill("Criado pelo teste");

  // Enquanto envia: botão desabilitado, "Salvando..." e sem envio duplicado.
  const soltar = await atrasarRota(pagina, "**/api/workouts", "POST");
  await pagina.getByRole("button", { name: "Criar treino" }).click();
  const botao = pagina.locator('#form-novo-treino [type="submit"]');
  await pagina.getByRole("button", { name: "Salvando..." }).waitFor();
  assert.equal(await botao.isDisabled(), true);
  await pagina.locator("#input-nome-treino").press("Enter");
  await capturar(pagina, "03-salvando-treino.png");
  soltar();

  await pagina.locator("#titulo-treino", { hasText: "Treino Etapa 05" }).waitFor();
  await confirmarToast(pagina, "Treino criado.");
  assert.equal(envios, 1);
  assert.equal(await botao.textContent(), "Criar treino");
  await capturar(pagina, "04-treino-criado-sucesso.png");

  // Treino novo: sem exercícios e sem painel de métricas.
  await pagina.getByText("Nenhum exercício adicionado ainda.").waitFor();
  assert.equal(await pagina.locator("#resumo-treino").isVisible(), false);

  await pagina.locator("#btn-novo-exercicio").click();
  await pagina.locator("#input-nome-exercicio").fill("Remada Curvada");
  await pagina.locator('#form-novo-exercicio [type="submit"]').click();
  await pagina.locator(".cartao__titulo", { hasText: "Remada Curvada" }).waitFor();
  await confirmarToast(pagina, "Exercício adicionado.");

  await pagina.getByRole("button", { name: "Abrir" }).click();
  await pagina.getByText("Nenhuma série registrada ainda.").waitFor();
  await pagina.locator("#btn-nova-serie").click();
  await pagina.locator("#input-peso-serie").fill("70");
  await pagina.locator("#input-repeticoes-serie").fill("8");
  await pagina.locator('#form-nova-serie [type="submit"]').click();
  await pagina.locator("#corpo-tabela-series tr", { hasText: "70 kg" }).waitFor();
  await confirmarToast(pagina, "Série registrada.");

  assert.equal(await pagina.locator('#corpo-tabela-series [data-celula="numero"]').textContent(), "1");
  assert.equal(await pagina.locator("#melhor-serie-peso").textContent(), "70");

  // Os dados sobrevivem ao recarregamento: estão no servidor, não na página.
  await pagina.reload();
  await pagina.locator(".treino", { hasText: "Treino Etapa 05" }).first().locator('[data-resumo="repeticoes"]', { hasText: "8" }).waitFor();
});

testarPagina("erro do servidor no envio mantém o que foi digitado", async (pagina) => {
  await pagina.goto(URL_BASE);
  await pagina.locator("#btn-novo-treino").click();
  await pagina.locator("#input-nome-treino").fill("Treino Digitado");

  const erro500 = (rota) =>
    rota.request().method() === "POST" ? responderErro500(rota) : rota.continue();
  await pagina.route("**/api/workouts", erro500);
  const botao = pagina.locator('#form-novo-treino [type="submit"]');
  await botao.click();

  await pagina.locator("#erro-novo-treino", { hasText: "Erro interno do servidor." }).waitFor();
  assert.equal(await pagina.locator("#input-nome-treino").inputValue(), "Treino Digitado");
  assert.equal(await botao.isEnabled(), true);
  assert.equal(await botao.textContent(), "Criar treino");

  await pagina.unroute("**/api/workouts", erro500);
  await botao.click();
  await pagina.locator("#titulo-treino", { hasText: "Treino Digitado" }).waitFor();
}, { falhasEsperadas: true });

/* --- Regressão da etapa anterior --- */

testarPagina("séries: marcar, repetir, remover e renumerar", async (pagina) => {
  const treino = await obterTreinoCriado({ nome: "Regressão Séries" });
  await apiJson("POST", `/workouts/${treino.id}/exercises`, { nome: "Rosca" });

  await abrirCartaoTreino(pagina, "Regressão Séries");
  await pagina.getByRole("button", { name: "Abrir" }).click();

  const linhas = pagina.locator("#corpo-tabela-series tr");
  await pagina.locator("#btn-nova-serie").click();
  await pagina.locator("#input-peso-serie").fill("0");
  await pagina.locator("#input-repeticoes-serie").fill("10");
  await pagina.locator('#form-nova-serie [type="submit"]').click();
  await pagina.locator("#erro-nova-serie", { hasText: "O peso deve ser um número maior que zero." }).waitFor();

  await pagina.locator("#input-peso-serie").fill("20");
  await pagina.locator('#form-nova-serie [type="submit"]').click();
  await linhas.filter({ hasText: "20 kg" }).waitFor();
  assert.equal(await pagina.locator("#erro-nova-serie").isVisible(), false);

  await pagina.locator("#btn-repetir-serie").click();
  await pagina.waitForFunction(() => document.querySelectorAll("#corpo-tabela-series tr").length === 2);

  await linhas.first().locator("input").check();
  await pagina.getByText("1 de 2 séries feitas (faltam 1)").waitFor();

  await linhas.first().locator('[data-acao="remover-serie"]').click();
  await pagina.waitForFunction(() => document.querySelectorAll("#corpo-tabela-series tr").length === 1);
  assert.equal(await linhas.first().locator('[data-celula="numero"]').textContent(), "1");

  // Remover exercício pede confirmação e volta ao estado vazio.
  await pagina.locator("#btn-voltar-treino").click();
  pagina.once("dialog", (dialogo) => dialogo.accept());
  await pagina.locator('[data-acao="remover-exercicio"]').click();
  await pagina.getByText("Nenhum exercício adicionado ainda.").waitFor();
});

testarPagina("checkbox volta ao estado anterior se o servidor falhar", async (pagina) => {
  const treino = await obterTreinoCriado({ nome: "Regressão Checkbox" });
  const { exercicios } = await (await apiJson("POST", `/workouts/${treino.id}/exercises`, { nome: "Rosca" })).json();
  await apiJson("POST", `/workouts/${treino.id}/exercises/${exercicios[0].id}/sets`, { peso: 10, repeticoes: 10 });

  await abrirCartaoTreino(pagina, "Regressão Checkbox");
  await pagina.getByRole("button", { name: "Abrir" }).click();

  await pagina.route("**/sets/*", responderErro500);
  await pagina.locator("#corpo-tabela-series input").click();
  await confirmarToast(pagina, "Erro interno do servidor.");
  await pagina.waitForFunction(() => !document.querySelector("#corpo-tabela-series input").checked);
}, { falhasEsperadas: true });

testarPagina("cardio: rascunho, meta, sessões e cálculo do progresso", async (pagina) => {
  await obterTreinoCriado({ nome: "Regressão Cardio" });
  await abrirCartaoTreino(pagina, "Regressão Cardio");

  // Cancelar o rascunho não cria nada no servidor.
  await pagina.getByRole("button", { name: "+ Adicionar cardio" }).click();
  await pagina.locator("#btn-cancelar-meta").click();
  await pagina.getByRole("button", { name: "+ Adicionar cardio" }).waitFor();

  await pagina.getByRole("button", { name: "+ Adicionar cardio" }).click();
  await pagina.locator('#form-meta [type="submit"]').click();
  await pagina.locator("#erro-meta", { hasText: "A modalidade não pode estar vazia." }).waitFor();

  await pagina.locator("#input-modalidade").fill("Esteira");
  await pagina.locator("#input-meta-tempo").fill("30");
  await pagina.locator('#form-meta [type="submit"]').click();
  await confirmarToast(pagina, "Meta salva.");
  await pagina.getByText("Nenhuma sessão registrada ainda.").waitFor();

  await pagina.locator("#btn-nova-sessao").click();
  await pagina.locator("#input-tempo-sessao").fill("10");
  await pagina.locator('#form-nova-sessao [type="submit"]').click();
  await pagina.locator("#corpo-tabela-sessoes tr", { hasText: "10 min" }).waitFor();

  await pagina.locator("#btn-repetir-sessao").click();
  await pagina.waitForFunction(() => document.querySelectorAll("#corpo-tabela-sessoes tr").length === 2);

  // Só sessões concluídas contam para a meta.
  await pagina.locator("#corpo-tabela-sessoes input").first().check();
  await pagina.locator('[data-meta="tempo"]', { hasText: "faltam 20 min" }).waitFor();

  await pagina.locator('[data-acao="remover-sessao"]').last().click();
  await pagina.waitForFunction(() => document.querySelectorAll("#corpo-tabela-sessoes tr").length === 1);

  // Os dados persistem após sair e voltar pelo servidor.
  await pagina.locator("#btn-voltar-treino-cardio").click();
  await pagina.locator("#bloco-cardio-treino .cardio-dia", { hasText: "Esteira" }).click();
  await pagina.locator("#titulo-cardio", { hasText: "Esteira" }).waitFor();
  await pagina.locator('[data-meta="tempo"]', { hasText: "faltam 20 min" }).waitFor();
});

testarPagina("cancelar e voltar retornam à lista", async (pagina) => {
  await pagina.goto(URL_BASE);
  await pagina.locator("#btn-novo-treino").click();
  await pagina.locator("#btn-cancelar-novo-treino").click();
  await pagina.locator(".treino").first().waitFor();

  await pagina.locator(".treino", { hasText: "Treino B" }).first().click();
  await pagina.locator("#titulo-treino", { hasText: "Treino B" }).waitFor();
  await pagina.locator("#btn-voltar-treinos").click();
  await pagina.locator(".treino").first().waitFor();
  assert.equal(await pagina.locator("#tela-treino").isVisible(), false);
});
