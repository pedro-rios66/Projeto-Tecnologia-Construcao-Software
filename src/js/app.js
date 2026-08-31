/* ==========================================================
   GymLog — app.js
   JavaScript puro, sem frameworks.

   Organização deste arquivo:
   1. Estado da aplicação
   2. Dados de exemplo (seed)
   3. Funções de criação (treino / exercício / série)
   4. Funções de validação
   5. Funções de renderização (DOM)
   6. Navegação entre telas
   7. Manipulação de eventos
   ========================================================== */

/* ----------------------------------------------------------
   1. Estado da aplicação
   ---------------------------------------------------------- */

// Todo o estado da aplicação vive em memória, neste objeto.
// Nenhum dado é persistido: ao recarregar a página, tudo reinicia.
const estado = {
  treinos: [],           // lista de treinos
  telaAtual: "treinos",  // "treinos" | "novo-treino" | "treino" | "exercicio"
  idTreinoAtual: null,   // id do treino aberto
  idExercicioAtual: null, // id do exercício aberto
  proximoIdTreino: 1,
  proximoIdExercicio: 1,
  proximoIdSerie: 1
};

/* ----------------------------------------------------------
   2. Dados de exemplo (seed)
   ---------------------------------------------------------- */

function criarDadosDeExemplo() {
  const treinoA = criarTreino("Treino A", "Peito + Tríceps");
  const supinoReto = adicionarExercicio(treinoA.id, "Supino Reto");
  adicionarSerie(supinoReto.id, 60, 10);
  adicionarSerie(supinoReto.id, 60, 10);
  adicionarSerie(supinoReto.id, 55, 12);

  const supinoInclinado = adicionarExercicio(treinoA.id, "Supino Inclinado");
  adicionarSerie(supinoInclinado.id, 50, 10);
  adicionarSerie(supinoInclinado.id, 50, 10);

  adicionarExercicio(treinoA.id, "Tríceps Pulley");

  const treinoB = criarTreino("Treino B", "Costas + Bíceps");
  const puxada = adicionarExercicio(treinoB.id, "Puxada Frontal");
  adicionarSerie(puxada.id, 45, 12);
  adicionarSerie(puxada.id, 45, 12);

  adicionarExercicio(treinoB.id, "Remada");
  adicionarExercicio(treinoB.id, "Rosca Direta");
}

/* ----------------------------------------------------------
   3. Funções de criação
   ---------------------------------------------------------- */

function criarTreino(nome, descricao) {
  const treino = {
    id: estado.proximoIdTreino++,
    nome: nome.trim(),
    descricao: descricao ? descricao.trim() : "",
    exercicios: []
  };
  estado.treinos.push(treino);
  return treino;
}

function adicionarExercicio(idTreino, nome) {
  const treino = buscarTreino(idTreino);
  if (!treino) return null;

  const exercicio = {
    id: estado.proximoIdExercicio++,
    nome: nome.trim(),
    series: []
  };
  treino.exercicios.push(exercicio);
  return exercicio;
}

function adicionarSerie(idExercicio, peso, repeticoes) {
  const exercicio = buscarExercicio(idExercicio);
  if (!exercicio) return null;

  const serie = {
    id: estado.proximoIdSerie++,
    numero: exercicio.series.length + 1, // a série seguinte recebe o próximo número
    peso: peso,
    repeticoes: repeticoes,
    feita: false
  };
  exercicio.series.push(serie);
  return serie;
}

function alternarSerieFeita(idSerie) {
  for (const treino of estado.treinos) {
    for (const exercicio of treino.exercicios) {
      const serie = exercicio.series.find(function (s) { return s.id === idSerie; });
      if (serie) {
        serie.feita = !serie.feita;
        return serie;
      }
    }
  }
  return null;
}

/* ----------------------------------------------------------
   Funções auxiliares de busca no estado
   ---------------------------------------------------------- */

function buscarTreino(idTreino) {
  return estado.treinos.find(function (t) { return t.id === idTreino; });
}

function buscarExercicio(idExercicio) {
  for (const treino of estado.treinos) {
    const exercicio = treino.exercicios.find(function (e) { return e.id === idExercicio; });
    if (exercicio) return exercicio;
  }
  return null;
}

/* ----------------------------------------------------------
   4. Validações
   ---------------------------------------------------------- */

function validarNomeTreino(nome) {
  if (!nome || nome.trim() === "") {
    return "O nome do treino não pode estar vazio.";
  }
  return null;
}

function validarNomeExercicio(nome) {
  if (!nome || nome.trim() === "") {
    return "O nome do exercício não pode estar vazio.";
  }
  return null;
}

function validarSerie(pesoStr, repeticoesStr) {
  const peso = Number(pesoStr);
  const repeticoes = Number(repeticoesStr);

  if (pesoStr === "" || isNaN(peso) || peso <= 0) {
    return "O peso deve ser um número maior que zero.";
  }
  if (repeticoesStr === "" || isNaN(repeticoes) || !Number.isInteger(repeticoes) || repeticoes <= 0) {
    return "As repetições devem ser um número inteiro maior que zero.";
  }
  return null;
}

/* ----------------------------------------------------------
   5. Renderização
   ---------------------------------------------------------- */

function renderizarTreinos() {
  const lista = document.getElementById("lista-treinos");
  lista.innerHTML = "";

  if (estado.treinos.length === 0) {
    lista.innerHTML = '<p class="cartao__vazio">Nenhum treino cadastrado ainda.</p>';
    return;
  }

  estado.treinos.forEach(function (treino) {
    const cartao = document.createElement("article");
    cartao.className = "cartao";
    cartao.innerHTML =
      '<h3 class="cartao__titulo"></h3>' +
      '<p class="cartao__meta cartao__descricao"></p>' +
      '<p class="cartao__meta"></p>' +
      '<div class="cartao__rodape">' +
      '<button class="btn btn--secundario" type="button">Abrir treino</button>' +
      "</div>";

    cartao.querySelector(".cartao__titulo").textContent = treino.nome;
    cartao.querySelector(".cartao__descricao").textContent = treino.descricao || "Sem descrição";
    cartao.querySelectorAll(".cartao__meta")[1].textContent =
      treino.exercicios.length + (treino.exercicios.length === 1 ? " exercício" : " exercícios");

    cartao.querySelector("button").addEventListener("click", function () {
      abrirTreino(treino.id);
    });

    lista.appendChild(cartao);
  });
}

function renderizarTreino() {
  const treino = buscarTreino(estado.idTreinoAtual);
  if (!treino) return;

  document.getElementById("titulo-treino").textContent = treino.nome;
  document.getElementById("descricao-treino").textContent = treino.descricao || "Sem descrição";

  const lista = document.getElementById("lista-exercicios");
  lista.innerHTML = "";

  if (treino.exercicios.length === 0) {
    lista.innerHTML = '<p class="cartao__vazio">Nenhum exercício adicionado ainda.</p>';
  } else {
    treino.exercicios.forEach(function (exercicio) {
      const cartao = document.createElement("article");
      cartao.className = "cartao";
      cartao.innerHTML =
        '<h3 class="cartao__titulo"></h3>' +
        '<p class="cartao__meta"></p>' +
        '<div class="cartao__rodape">' +
        '<button class="btn btn--secundario" type="button">Abrir</button>' +
        "</div>";

      cartao.querySelector(".cartao__titulo").textContent = exercicio.nome;
      cartao.querySelector(".cartao__meta").textContent =
        exercicio.series.length + (exercicio.series.length === 1 ? " série" : " séries");

      cartao.querySelector("button").addEventListener("click", function () {
        abrirExercicio(exercicio.id);
      });

      lista.appendChild(cartao);
    });
  }

  // Formulário de novo exercício sempre fecha ao re-renderizar o treino
  esconderFormularioNovoExercicio();
}

function renderizarExercicio() {
  const exercicio = buscarExercicio(estado.idExercicioAtual);
  if (!exercicio) return;

  document.getElementById("titulo-exercicio").textContent = exercicio.nome;

  const corpoTabela = document.getElementById("corpo-tabela-series");
  corpoTabela.innerHTML = "";

  if (exercicio.series.length === 0) {
    const linha = document.createElement("tr");
    linha.innerHTML = '<td colspan="4" class="cartao__vazio">Nenhuma série registrada ainda.</td>';
    corpoTabela.appendChild(linha);
  } else {
    exercicio.series.forEach(function (serie) {
      const linha = document.createElement("tr");
      linha.className = serie.feita ? "tabela-series__linha--feita" : "";
      linha.innerHTML =
        '<td class="tabela-series__celula-check"><input type="checkbox" class="tabela-series__checkbox"></td>' +
        "<td></td><td></td><td></td>";
      const checkbox = linha.querySelector("input");
      checkbox.checked = serie.feita;
      checkbox.setAttribute("aria-label", "Marcar série " + serie.numero + " como feita");
      checkbox.addEventListener("change", function () {
        alternarSerieFeita(serie.id);
        renderizarExercicio();
      });
      linha.children[1].textContent = serie.numero;
      linha.children[2].textContent = serie.peso + " kg";
      linha.children[3].textContent = serie.repeticoes;
      corpoTabela.appendChild(linha);
    });
  }

  renderizarProgressoSeries(exercicio);
  esconderFormularioNovaSerie();
}

function renderizarProgressoSeries(exercicio) {
  const elementoProgresso = document.getElementById("progresso-series");
  const total = exercicio.series.length;
  const feitas = exercicio.series.filter(function (s) { return s.feita; }).length;

  if (total === 0) {
    elementoProgresso.textContent = "";
    return;
  }

  const faltam = total - feitas;
  elementoProgresso.textContent =
    feitas + " de " + total + " séries feitas" +
    (faltam > 0 ? " (faltam " + faltam + ")" : " — concluído!");
}

/* ----------------------------------------------------------
   6. Navegação entre telas
   ---------------------------------------------------------- */

function mostrarTela(nomeTela) {
  const telas = document.querySelectorAll(".tela");
  telas.forEach(function (tela) { tela.hidden = true; });

  document.getElementById("tela-" + nomeTela).hidden = false;
  estado.telaAtual = nomeTela;
}

function irParaTreinos() {
  renderizarTreinos();
  mostrarTela("treinos");
}

function irParaFormularioNovoTreino() {
  limparErroFormulario("erro-novo-treino");
  document.getElementById("form-novo-treino").reset();
  mostrarTela("novo-treino");
}

function abrirTreino(idTreino) {
  estado.idTreinoAtual = idTreino;
  renderizarTreino();
  mostrarTela("treino");
}

function abrirExercicio(idExercicio) {
  estado.idExercicioAtual = idExercicio;
  renderizarExercicio();
  mostrarTela("exercicio");
}

/* ----------------------------------------------------------
   7. Manipulação de eventos
   ---------------------------------------------------------- */

function mostrarErroFormulario(idElemento, mensagem) {
  const elementoErro = document.getElementById(idElemento);
  elementoErro.textContent = mensagem;
  elementoErro.hidden = false;
}

function limparErroFormulario(idElemento) {
  const elementoErro = document.getElementById(idElemento);
  elementoErro.hidden = true;
  elementoErro.textContent = "";
}

function esconderFormularioNovoExercicio() {
  document.getElementById("wrapper-form-novo-exercicio").hidden = true;
  document.getElementById("form-novo-exercicio").reset();
  limparErroFormulario("erro-novo-exercicio");
}

function esconderFormularioNovaSerie() {
  document.getElementById("wrapper-form-nova-serie").hidden = true;
  document.getElementById("form-nova-serie").reset();
  limparErroFormulario("erro-nova-serie");
}

function configurarEventos() {
  // --- Lista de treinos ---
  document.getElementById("btn-novo-treino").addEventListener("click", irParaFormularioNovoTreino);

  // --- Formulário: novo treino ---
  document.getElementById("btn-cancelar-novo-treino").addEventListener("click", irParaTreinos);

  document.getElementById("form-novo-treino").addEventListener("submit", function (event) {
    event.preventDefault();
    const nome = document.getElementById("input-nome-treino").value;
    const descricao = document.getElementById("input-descricao-treino").value;

    const erro = validarNomeTreino(nome);
    if (erro) {
      mostrarErroFormulario("erro-novo-treino", erro);
      return;
    }

    const treino = criarTreino(nome, descricao);
    irParaTreinos();
    abrirTreino(treino.id);
  });

  // --- Tela de treino ---
  document.getElementById("btn-voltar-treinos").addEventListener("click", irParaTreinos);

  document.getElementById("btn-novo-exercicio").addEventListener("click", function () {
    document.getElementById("wrapper-form-novo-exercicio").hidden = false;
    document.getElementById("input-nome-exercicio").focus();
  });

  document.getElementById("btn-cancelar-novo-exercicio").addEventListener("click", esconderFormularioNovoExercicio);

  document.getElementById("form-novo-exercicio").addEventListener("submit", function (event) {
    event.preventDefault();
    const nome = document.getElementById("input-nome-exercicio").value;

    const erro = validarNomeExercicio(nome);
    if (erro) {
      mostrarErroFormulario("erro-novo-exercicio", erro);
      return;
    }

    adicionarExercicio(estado.idTreinoAtual, nome);
    renderizarTreino();
  });

  // --- Tela de exercício ---
  document.getElementById("btn-voltar-treino").addEventListener("click", function () {
    abrirTreino(estado.idTreinoAtual);
  });

  document.getElementById("btn-nova-serie").addEventListener("click", function () {
    document.getElementById("wrapper-form-nova-serie").hidden = false;
    document.getElementById("input-peso-serie").focus();
  });

  document.getElementById("btn-cancelar-nova-serie").addEventListener("click", esconderFormularioNovaSerie);

  document.getElementById("form-nova-serie").addEventListener("submit", function (event) {
    event.preventDefault();
    const peso = document.getElementById("input-peso-serie").value;
    const repeticoes = document.getElementById("input-repeticoes-serie").value;

    const erro = validarSerie(peso, repeticoes);
    if (erro) {
      mostrarErroFormulario("erro-nova-serie", erro);
      return;
    }

    adicionarSerie(estado.idExercicioAtual, Number(peso), Number(repeticoes));
    renderizarExercicio();
  });
}

/* ----------------------------------------------------------
   Inicialização
   ---------------------------------------------------------- */

function iniciar() {
  criarDadosDeExemplo();
  configurarEventos();
  irParaTreinos();
}

document.addEventListener("DOMContentLoaded", iniciar);
