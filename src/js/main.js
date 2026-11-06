// Ponto de entrada. Fluxo de toda operação:
// evento (aqui) → validação (validation.js) → chamada assíncrona (api.js)
// → atualização do estado (state.js) → renderização (ui.js).

import * as api from "./api.js";
import { buscarExercicio, buscarTreino, estado, salvarTreino } from "./state.js";
import * as ui from "./ui.js";
import {
  numeroOuNulo,
  validarCardio,
  validarDiasTreino,
  validarNomeExercicio,
  validarNomeTreino,
  validarSerie,
  validarSessaoCardio,
} from "./validation.js";

const elemento = (id) => document.getElementById(id);

/* --- Consultas --- */

async function carregarTreinos() {
  ui.mostrarTela("treinos");
  ui.mostrarCarregando("lista-treinos", "Carregando treinos...");

  try {
    const treinos = await api.fetchWorkouts();
    // Se o usuário já saiu da tela, esta resposta pode estar desatualizada.
    if (estado.telaAtual !== "treinos") return;
    estado.treinos = treinos;
    ui.renderizarTreinos();
  } catch (erro) {
    ui.mostrarErroConsulta("lista-treinos", erro.message);
  } finally {
    ui.ocultarCarregando("lista-treinos");
  }
}

async function abrirTreino(idTreino) {
  estado.idTreinoAtual = idTreino;
  ui.esconderFormulario("novo-exercicio");
  ui.mostrarTela("treino");
  ui.mostrarCarregandoTreino();

  // Evita desenhar a resposta de um treino que o usuário já deixou para trás.
  const continuaAberto = () => estado.telaAtual === "treino" && estado.idTreinoAtual === idTreino;

  try {
    const treino = await api.fetchWorkout(idTreino);
    salvarTreino(treino);
    if (continuaAberto()) ui.renderizarTreino();
  } catch (erro) {
    if (!continuaAberto()) return;
    if (erro.status === 404) { // treino que não existe mais: volta para um estado conhecido
      ui.mostrarToast(erro.message, "erro");
      carregarTreinos();
    } else {
      ui.mostrarErroConsulta("estado-treino", erro.message);
    }
  } finally {
    ui.ocultarCarregando("estado-treino");
  }
}

/* --- Navegação sem consulta: os dados do treino aberto já estão no estado --- */

function abrirExercicio(idExercicio) {
  if (!buscarExercicio(idExercicio)) {
    console.warn(`abrirExercicio: nenhum exercício com id ${idExercicio}.`);
    abrirTreino(estado.idTreinoAtual);
    return;
  }
  estado.idExercicioAtual = idExercicio;
  ui.esconderFormulario("nova-serie");
  ui.renderizarExercicio();
  ui.mostrarTela("exercicio");
}

// O cardio pertence ao treino, então é identificado pelo id do treino dono.
function abrirCardio(idTreino) {
  if (!buscarTreino(idTreino)?.cardio) {
    console.warn(`abrirCardio: treino ${idTreino} inexistente ou sem cardio.`);
    carregarTreinos();
    return;
  }
  estado.idTreinoAtual = idTreino;
  ui.esconderFormulario("nova-sessao");
  ui.esconderFormulario("meta");
  ui.renderizarCardio();
  ui.mostrarTela("cardio");
}

// Rascunho só no navegador: o cardio chega ao servidor ao salvar a meta.
function iniciarCardio() {
  buscarTreino(estado.idTreinoAtual).cardio =
    { modalidade: "", metaMinutos: null, metaKm: null, sessoes: [] };
  abrirCardio(estado.idTreinoAtual);
  ui.abrirFormularioMeta();
}

/* --- Submissões --- */

// Padrão comum a todos os formulários. O finally é o único lugar em que o estado
// de envio é desligado, tanto no sucesso quanto no erro; no erro, o formulário não
// é limpo, então o que o usuário digitou continua lá.
function registrarFormulario(idFormulario, { validar, enviar, mensagem, aoSalvar }) {
  const formulario = elemento(idFormulario);

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(formulario));

    const erroValidacao = validar(dados);
    if (erroValidacao) {
      ui.mostrarErroFormulario(formulario, erroValidacao);
      return;
    }

    ui.limparErroFormulario(formulario);
    ui.definirEnviando(formulario, true);
    try {
      const treino = await enviar(dados);
      salvarTreino(treino);
      aoSalvar(treino);
      ui.mostrarToast(mensagem);
    } catch (erro) {
      ui.mostrarErroFormulario(formulario, erro.message);
    } finally {
      ui.definirEnviando(formulario, false);
    }
  });
}

// Ações de um clique (marcar, remover, repetir). Sem formulário para exibir a
// mensagem, o erro vai para o toast. Renderizar no finally também desfaz, em caso
// de erro, a marcação que o navegador já tinha aplicado ao checkbox.
async function executarAcao(controle, operacao, mensagem) {
  controle.disabled = true;
  try {
    salvarTreino(await operacao());
    if (mensagem) ui.mostrarToast(mensagem);
  } catch (erro) {
    ui.mostrarToast(erro.message, "erro");
  } finally {
    controle.disabled = false;
    ui.renderizarTelaAtual();
  }
}

function registrarFormularios() {
  registrarFormulario("form-novo-treino", {
    validar: ({ nome }) => validarNomeTreino(nome) || validarDiasTreino(ui.diasSelecionados()),
    enviar: ({ nome, descricao }) =>
      api.createWorkout({ nome, descricao, dias: ui.diasSelecionados() }),
    mensagem: "Treino criado.",
    aoSalvar: (treino) => {
      estado.idTreinoAtual = treino.id;
      ui.esconderFormulario("novo-exercicio");
      ui.renderizarTreino();
      ui.mostrarTela("treino");
    },
  });

  // Os três formulários abaixo continuam abertos para registrar vários itens seguidos.
  registrarFormulario("form-novo-exercicio", {
    validar: ({ nome }) => validarNomeExercicio(nome),
    enviar: ({ nome }) => api.addExercise(estado.idTreinoAtual, { nome }),
    mensagem: "Exercício adicionado.",
    aoSalvar: () => {
      ui.renderizarTreino();
      elemento("input-nome-exercicio").value = "";
      ui.focarCampo("input-nome-exercicio");
    },
  });

  registrarFormulario("form-nova-serie", {
    validar: ({ peso, repeticoes }) => validarSerie(peso, repeticoes),
    enviar: ({ peso, repeticoes }) =>
      api.addSet(estado.idTreinoAtual, estado.idExercicioAtual, {
        peso: Number(peso),
        repeticoes: Number(repeticoes),
      }),
    mensagem: "Série registrada.",
    aoSalvar: () => {
      ui.renderizarExercicio();
      ui.focarCampo("input-repeticoes-serie"); // o campo que mais varia entre séries
    },
  });

  registrarFormulario("form-nova-sessao", {
    validar: ({ tempo, distancia }) => validarSessaoCardio(tempo, distancia),
    enviar: ({ tempo, distancia }) =>
      api.addSession(estado.idTreinoAtual, {
        minutos: numeroOuNulo(tempo),
        km: numeroOuNulo(distancia),
      }),
    mensagem: "Sessão registrada.",
    aoSalvar: () => {
      ui.renderizarCardio();
      ui.focarCampo("input-tempo-sessao");
    },
  });

  registrarFormulario("form-meta", {
    validar: ({ modalidade, metaTempo, metaDistancia }) =>
      validarCardio(modalidade, metaTempo, metaDistancia),
    enviar: ({ modalidade, metaTempo, metaDistancia }) =>
      api.saveCardio(estado.idTreinoAtual, {
        modalidade,
        metaMinutos: numeroOuNulo(metaTempo),
        metaKm: numeroOuNulo(metaDistancia),
      }),
    mensagem: "Meta salva.",
    aoSalvar: () => {
      ui.esconderFormulario("meta");
      ui.renderizarCardio();
    },
  });
}

/* --- Eventos --- */

function aoClicar(id, tratador) {
  elemento(id).addEventListener("click", tratador);
}

function registrarEventosTreinos() {
  aoClicar("btn-novo-treino", ui.abrirFormularioNovoTreino);
  aoClicar("btn-cancelar-novo-treino", carregarTreinos);
  aoClicar("btn-voltar-treinos", carregarTreinos);

  // Delegação: um listener para todos os cartões.
  aoClicar("lista-treinos", ({ target }) => {
    if (target.closest('[data-acao="tentar-novamente"]')) return carregarTreinos();
    if (target.closest('[data-acao="novo-treino"]')) return ui.abrirFormularioNovoTreino();

    // O bloco de cardio é irmão do botão do treino dentro do mesmo dia.
    const botaoCardio = target.closest("[data-id-cardio]");
    if (botaoCardio) return abrirCardio(Number(botaoCardio.dataset.idCardio));

    const cartao = target.closest("[data-id-treino]");
    if (cartao) abrirTreino(Number(cartao.dataset.idTreino));
  });

  aoClicar("estado-treino", ({ target }) => {
    if (target.closest('[data-acao="tentar-novamente"]')) abrirTreino(estado.idTreinoAtual);
  });
}

function registrarEventosTelaTreino() {
  aoClicar("btn-novo-exercicio", ui.abrirFormularioNovoExercicio);
  aoClicar("btn-cancelar-novo-exercicio", () => ui.esconderFormulario("novo-exercicio"));

  aoClicar("lista-exercicios", ({ target }) => {
    if (target.closest('[data-acao="novo-exercicio"]')) return ui.abrirFormularioNovoExercicio();

    const cartao = target.closest("[data-id-exercicio]");
    if (!cartao) return;
    const idExercicio = Number(cartao.dataset.idExercicio);

    const botaoRemover = target.closest('[data-acao="remover-exercicio"]');
    if (!botaoRemover) return abrirExercicio(idExercicio);

    // Remover destrói as séries junto, por isso pede confirmação.
    const { nome } = buscarExercicio(idExercicio);
    if (window.confirm(`Remover "${nome}" e todas as suas séries?`)) {
      executarAcao(
        botaoRemover,
        () => api.removeExercise(estado.idTreinoAtual, idExercicio),
        "Exercício removido."
      );
    }
  });

  aoClicar("bloco-cardio-treino", ({ target }) => {
    if (target.closest('[data-acao="novo-cardio"]')) return iniciarCardio();
    const botaoCardio = target.closest("[data-id-cardio]");
    if (botaoCardio) abrirCardio(Number(botaoCardio.dataset.idCardio));
  });
}

function registrarEventosTelaExercicio() {
  aoClicar("btn-voltar-treino", () => abrirTreino(estado.idTreinoAtual));
  aoClicar("btn-nova-serie", ui.abrirFormularioNovaSerie);
  aoClicar("btn-cancelar-nova-serie", () => ui.esconderFormulario("nova-serie"));

  // Repete a última série com um clique: é a ação mais frequente durante o treino.
  aoClicar("btn-repetir-serie", ({ currentTarget }) => {
    const { peso, repeticoes } = buscarExercicio(estado.idExercicioAtual).series.at(-1);
    executarAcao(
      currentTarget,
      () => api.addSet(estado.idTreinoAtual, estado.idExercicioAtual, { peso, repeticoes }),
      "Série registrada."
    );
  });

  // Delegação: um listener na tabela cobre qualquer série.
  elemento("corpo-tabela-series").addEventListener("change", ({ target }) => {
    const idSerie = Number(target.closest("[data-id-serie]").dataset.idSerie);
    executarAcao(target, () =>
      api.updateSet(estado.idTreinoAtual, estado.idExercicioAtual, idSerie, { feita: target.checked }));
  });

  // Remover série não pede confirmação: é barato de refazer com "Repetir última".
  aoClicar("corpo-tabela-series", ({ target }) => {
    const botao = target.closest('[data-acao="remover-serie"]');
    if (!botao) return;
    const idSerie = Number(botao.closest("[data-id-serie]").dataset.idSerie);
    executarAcao(
      botao,
      () => api.removeSet(estado.idTreinoAtual, estado.idExercicioAtual, idSerie),
      "Série removida."
    );
  });
}

function registrarEventosTelaCardio() {
  aoClicar("btn-voltar-treino-cardio", () => abrirTreino(estado.idTreinoAtual));
  aoClicar("btn-editar-meta", ui.abrirFormularioMeta);
  aoClicar("btn-nova-sessao", ui.abrirFormularioNovaSessao);
  aoClicar("btn-cancelar-nova-sessao", () => ui.esconderFormulario("nova-sessao"));

  // Cancelar uma meta que nunca foi salva descarta o rascunho.
  aoClicar("btn-cancelar-meta", () => {
    if (buscarTreino(estado.idTreinoAtual).cardio.modalidade === "") {
      abrirTreino(estado.idTreinoAtual);
    } else {
      ui.esconderFormulario("meta");
    }
  });

  aoClicar("btn-repetir-sessao", ({ currentTarget }) => {
    const { minutos, km } = buscarTreino(estado.idTreinoAtual).cardio.sessoes.at(-1);
    executarAcao(
      currentTarget,
      () => api.addSession(estado.idTreinoAtual, { minutos, km }),
      "Sessão registrada."
    );
  });

  elemento("corpo-tabela-sessoes").addEventListener("change", ({ target }) => {
    const idSessao = Number(target.closest("[data-id-sessao]").dataset.idSessao);
    executarAcao(target, () =>
      api.updateSession(estado.idTreinoAtual, idSessao, { feita: target.checked }));
  });

  aoClicar("corpo-tabela-sessoes", ({ target }) => {
    const botao = target.closest('[data-acao="remover-sessao"]');
    if (!botao) return;
    const idSessao = Number(botao.closest("[data-id-sessao]").dataset.idSessao);
    executarAcao(
      botao,
      () => api.removeSession(estado.idTreinoAtual, idSessao),
      "Sessão removida."
    );
  });
}

/* --- Inicialização --- */

registrarFormularios();
registrarEventosTreinos();
registrarEventosTelaTreino();
registrarEventosTelaExercicio();
registrarEventosTelaCardio();
carregarTreinos();
