/* ==========================================================
   GymLog — app.js
   JavaScript puro, sem frameworks.

   Organização deste arquivo:
   1. Estado da aplicação
   2. Dados de exemplo (seed)
   3. Funções de criação (treino / exercício / série)
   4. Funções de validação
   5. Métricas (funções puras de cálculo)
   6. Funções de renderização (DOM)
   7. Navegação entre telas
   8. Manipulação de eventos
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
  const puxada = adicionarExercicio(treinoB.id, "Puxada Alta");
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
   5. Métricas (funções puras: recebem estado, devolvem número)
   ---------------------------------------------------------- */

// Total de repetições = soma das repetições de todas as séries.
function calcularRepeticoesExercicio(exercicio) {
  return exercicio.series.reduce(function (total, serie) {
    return total + serie.repeticoes;
  }, 0);
}

function calcularRepeticoesTreino(treino) {
  return treino.exercicios.reduce(function (total, exercicio) {
    return total + calcularRepeticoesExercicio(exercicio);
  }, 0);
}

function contarSeriesTreino(treino) {
  return treino.exercicios.reduce(function (total, exercicio) {
    return total + exercicio.series.length;
  }, 0);
}

// Melhor série = a de maior peso registrado (a primeira, em caso de empate).
function encontrarMelhorSerie(exercicio) {
  return exercicio.series.reduce(function (melhor, serie) {
    return (melhor === null || serie.peso > melhor.peso) ? serie : melhor;
  }, null);
}

// Mostra inteiros sem casas decimais e valores fracionários com uma casa.
function formatarNumero(valor) {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

/* ----------------------------------------------------------
   6. Renderização
   ---------------------------------------------------------- */

// Clona o conteúdo de um <template> do index.html.
function clonarTemplate(idTemplate) {
  return document.getElementById(idTemplate).content.firstElementChild.cloneNode(true);
}

// Bloco reutilizável de "estado vazio": ícone + texto + botão de ação opcional.
function criarEstadoVazio(texto, acao) {
  const bloco = clonarTemplate("tpl-estado-vazio");
  bloco.querySelector(".estado-vazio__texto").textContent = texto;

  if (acao) {
    const botao = document.createElement("button");
    botao.className = "btn btn--primario";
    botao.type = "button";
    botao.dataset.acao = acao.acao;
    botao.textContent = acao.rotulo;
    bloco.appendChild(botao);
  }

  return bloco;
}

function renderizarTreinos() {
  const lista = document.getElementById("lista-treinos");
  lista.innerHTML = "";

  if (estado.treinos.length === 0) {
    lista.appendChild(criarEstadoVazio("Nenhum treino cadastrado ainda.", {
      rotulo: "+ Novo Treino",
      acao: "novo-treino"
    }));
    return;
  }

  estado.treinos.forEach(function (treino) {
    const cartao = clonarTemplate("tpl-cartao-treino");
    cartao.dataset.idTreino = treino.id;
    cartao.querySelector(".cartao__titulo").textContent = treino.nome;
    cartao.querySelector(".cartao__descricao").textContent = treino.descricao || "Sem descrição";
    cartao.querySelector('[data-resumo="exercicios"]').textContent = treino.exercicios.length;
    cartao.querySelector('[data-resumo="series"]').textContent = contarSeriesTreino(treino);
    cartao.querySelector('[data-resumo="repeticoes"]').textContent = calcularRepeticoesTreino(treino);
    lista.appendChild(cartao);
  });
}

function renderizarTreino() {
  const treino = buscarTreino(estado.idTreinoAtual);
  if (!treino) return;

  document.getElementById("titulo-treino").textContent = treino.nome;
  document.getElementById("descricao-treino").textContent = treino.descricao || "Sem descrição";

  document.getElementById("metrica-exercicios").textContent = treino.exercicios.length;
  document.getElementById("metrica-series").textContent = contarSeriesTreino(treino);
  document.getElementById("metrica-repeticoes").textContent = calcularRepeticoesTreino(treino);
  document.getElementById("resumo-treino").hidden = treino.exercicios.length === 0;

  const lista = document.getElementById("lista-exercicios");
  lista.innerHTML = "";

  if (treino.exercicios.length === 0) {
    lista.appendChild(criarEstadoVazio("Nenhum exercício adicionado ainda.", {
      rotulo: "+ Adicionar exercício",
      acao: "novo-exercicio"
    }));
  } else {
    treino.exercicios.forEach(function (exercicio) {
      const cartao = clonarTemplate("tpl-cartao-exercicio");
      cartao.dataset.idExercicio = exercicio.id;
      cartao.querySelector(".cartao__titulo").textContent = exercicio.nome;
      cartao.querySelector('[data-resumo="series"]').textContent =
        exercicio.series.length + (exercicio.series.length === 1 ? " série" : " séries");
      cartao.querySelector('[data-resumo="repeticoes"]').textContent =
        calcularRepeticoesExercicio(exercicio);
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
    corpoTabela.appendChild(clonarTemplate("tpl-linha-vazia"));
  } else {
    exercicio.series.forEach(function (serie) {
      const linha = clonarTemplate("tpl-linha-serie");
      linha.dataset.idSerie = serie.id;
      if (serie.feita) linha.classList.add("tabela-series__linha--feita");

      const checkbox = linha.querySelector("input");
      checkbox.checked = serie.feita;
      checkbox.setAttribute("aria-label", "Marcar série " + serie.numero + " como feita");

      linha.querySelector('[data-celula="numero"]').textContent = serie.numero;
      linha.querySelector('[data-celula="peso"]').textContent = formatarNumero(serie.peso) + " kg";
      linha.querySelector('[data-celula="reps"]').textContent = serie.repeticoes;
      corpoTabela.appendChild(linha);
    });
  }

  renderizarMelhorSerie(exercicio);
  renderizarProgressoSeries(exercicio);
  esconderFormularioNovaSerie();
}

function renderizarMelhorSerie(exercicio) {
  const bloco = document.getElementById("destaque-melhor-serie");
  const melhor = encontrarMelhorSerie(exercicio);

  if (!melhor) {
    bloco.hidden = true;
    return;
  }

  document.getElementById("melhor-serie-peso").textContent = formatarNumero(melhor.peso);
  document.getElementById("melhor-serie-reps").textContent =
    melhor.repeticoes + (melhor.repeticoes === 1 ? " rep" : " reps");
  bloco.hidden = false;
}

function renderizarProgressoSeries(exercicio) {
  const container = document.getElementById("progresso-series");
  const total = exercicio.series.length;
  const feitas = exercicio.series.filter(function (s) { return s.feita; }).length;

  if (total === 0) {
    container.hidden = true;
    return;
  }

  const faltam = total - feitas;
  const percentual = Math.round((feitas / total) * 100);

  container.hidden = false;
  container.querySelector(".progresso-series__preenchido").style.width = percentual + "%";
  container.querySelector(".progresso-series__texto").textContent =
    feitas + " de " + total + " séries feitas" +
    (faltam > 0 ? " (faltam " + faltam + ")" : " — concluído!");
}

/* ----------------------------------------------------------
   7. Navegação entre telas
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
   8. Manipulação de eventos
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

function abrirFormularioNovoExercicio() {
  document.getElementById("wrapper-form-novo-exercicio").hidden = false;
  document.getElementById("input-nome-exercicio").focus();
}

function esconderFormularioNovoExercicio() {
  document.getElementById("wrapper-form-novo-exercicio").hidden = true;
  document.getElementById("form-novo-exercicio").reset();
  limparErroFormulario("erro-novo-exercicio");
}

function abrirFormularioNovaSerie() {
  document.getElementById("wrapper-form-nova-serie").hidden = false;
  document.getElementById("input-peso-serie").focus();
}

function esconderFormularioNovaSerie() {
  document.getElementById("wrapper-form-nova-serie").hidden = true;
  document.getElementById("form-nova-serie").reset();
  limparErroFormulario("erro-nova-serie");
}

function configurarEventos() {
  // --- Lista de treinos (delegação: um listener para todos os cartões) ---
  document.getElementById("btn-novo-treino").addEventListener("click", irParaFormularioNovoTreino);

  document.getElementById("lista-treinos").addEventListener("click", function (event) {
    if (event.target.closest('[data-acao="novo-treino"]')) {
      irParaFormularioNovoTreino();
      return;
    }
    const cartao = event.target.closest("[data-id-treino]");
    if (cartao) abrirTreino(Number(cartao.dataset.idTreino));
  });

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

  document.getElementById("btn-novo-exercicio").addEventListener("click", abrirFormularioNovoExercicio);

  document.getElementById("lista-exercicios").addEventListener("click", function (event) {
    if (event.target.closest('[data-acao="novo-exercicio"]')) {
      abrirFormularioNovoExercicio();
      return;
    }
    const cartao = event.target.closest("[data-id-exercicio]");
    if (cartao) abrirExercicio(Number(cartao.dataset.idExercicio));
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

  document.getElementById("btn-nova-serie").addEventListener("click", abrirFormularioNovaSerie);

  document.getElementById("btn-cancelar-nova-serie").addEventListener("click", esconderFormularioNovaSerie);

  // Delegação: um listener na tabela cobre o checkbox de qualquer série.
  document.getElementById("corpo-tabela-series").addEventListener("change", function (event) {
    const linha = event.target.closest("[data-id-serie]");
    if (!linha) return;
    alternarSerieFeita(Number(linha.dataset.idSerie));
    renderizarExercicio();
  });

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
