// Renderização, navegação entre telas e estados de carregamento, erro e vazio.
// Lê o estado e desenha o DOM; nunca chama o fetch.

import {
  DIAS_SEMANA,
  calcularKmCardio,
  calcularMinutosCardio,
  calcularRepeticoesExercicio,
  calcularRepeticoesTreino,
  contarSeriesTreino,
  contarSessoesFeitas,
  diaSemanaDeHoje,
  encontrarMelhorSerie,
  formatarNumero,
  nomesDosDias,
  percentualDaMeta,
  percentualGeralDoCardio,
  textoDasMetas,
  treinosDoDia,
} from "./calculations.js";
import { buscarExercicio, buscarTreino, estado } from "./state.js";

const TEMPO_DO_TOAST_MS = 3500;

const elemento = (id) => document.getElementById(id);

// Clona o conteúdo de um <template> do index.html.
const clonarTemplate = (idTemplate) =>
  elemento(idTemplate).content.firstElementChild.cloneNode(true);

/* --- Blocos reutilizáveis --- */

function criarBotao(classe, acao, rotulo) {
  const botao = document.createElement("button");
  botao.className = `btn ${classe}`;
  botao.type = "button";
  botao.dataset.acao = acao;
  botao.textContent = rotulo;
  return botao;
}

// Ícone + texto + botão de ação opcional. Serve aos estados vazio e de erro.
function criarEstadoVazio(texto, acao) {
  const bloco = clonarTemplate("tpl-estado-vazio");
  bloco.querySelector(".estado-vazio__texto").textContent = texto;
  if (acao) bloco.appendChild(criarBotao("btn--primario", acao.acao, acao.rotulo));
  return bloco;
}

function criarLinhaVazia(colunas, texto) {
  const linha = clonarTemplate("tpl-linha-vazia");
  linha.querySelector("td").colSpan = colunas;
  linha.querySelector(".estado-vazio__texto").textContent = texto;
  return linha;
}

/* --- Estados de carregamento e de erro das consultas --- */

export function mostrarCarregando(idContainer, texto) {
  const indicador = clonarTemplate("tpl-carregando");
  indicador.querySelector(".carregando__texto").textContent = texto;
  elemento(idContainer).replaceChildren(indicador);
  elemento(idContainer).setAttribute("aria-busy", "true");
}

export function ocultarCarregando(idContainer) {
  elemento(idContainer).setAttribute("aria-busy", "false");
}

export function mostrarErroConsulta(idContainer, mensagem) {
  const bloco = criarEstadoVazio(mensagem, { rotulo: "Tentar novamente", acao: "tentar-novamente" });
  bloco.classList.add("estado-vazio--erro");
  bloco.setAttribute("role", "alert");
  elemento(idContainer).replaceChildren(bloco);
}

// O conteúdo do treino anterior fica oculto até a resposta da consulta chegar.
export function mostrarCarregandoTreino() {
  elemento("conteudo-treino").hidden = true;
  mostrarCarregando("estado-treino", "Carregando treino...");
}

/* --- Confirmação curta (toast) --- */

let temporizadorToast;

export function mostrarToast(mensagem, tipo = "sucesso") {
  const toast = elemento("toast");
  toast.textContent = mensagem;
  toast.classList.toggle("toast--erro", tipo === "erro");
  toast.hidden = false;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => { toast.hidden = true; }, TEMPO_DO_TOAST_MS);
}

/* --- Tela: cronograma de treinos --- */

export function renderizarTreinos() {
  const lista = elemento("lista-treinos");

  if (estado.treinos.length === 0) {
    lista.replaceChildren(criarEstadoVazio("Nenhum treino cadastrado ainda.", {
      rotulo: "+ Novo Treino",
      acao: "novo-treino",
    }));
    return;
  }

  const hoje = diaSemanaDeHoje();

  // Um cartão por dia da semana, sempre os sete, mesmo os de descanso.
  lista.replaceChildren(...DIAS_SEMANA.map((nomeDia, indiceDia) => {
    const cartaoDia = clonarTemplate("tpl-dia-semana");
    const conteudo = cartaoDia.querySelector(".dia__conteudo");
    cartaoDia.querySelector(".dia__nome").textContent = nomeDia;

    if (indiceDia === hoje) {
      cartaoDia.classList.add("dia--hoje");
      cartaoDia.querySelector(".dia__etiqueta-hoje").hidden = false;
    }

    const treinos = treinosDoDia(estado.treinos, indiceDia);
    if (treinos.length === 0) {
      conteudo.appendChild(clonarTemplate("tpl-descanso"));
    }
    treinos.forEach((treino) => {
      conteudo.appendChild(criarBotaoTreino(treino));
      if (treino.cardio) conteudo.appendChild(criarBotaoCardio(treino));
    });

    return cartaoDia;
  }));

  // No celular cabem uns dois dias na tela: começar no dia de hoje evita
  // que o usuário tenha de rolar para achar o treino da vez.
  lista.scrollLeft = lista.children[hoje].offsetLeft;
}

function criarBotaoTreino(treino) {
  const botao = clonarTemplate("tpl-cartao-treino");
  botao.dataset.idTreino = treino.id;
  botao.querySelector(".treino__nome").textContent = treino.nome;
  botao.querySelector(".treino__descricao").textContent = treino.descricao || "Sem descrição";
  botao.querySelector('[data-resumo="exercicios"]').textContent = treino.exercicios.length;
  botao.querySelector('[data-resumo="series"]').textContent = contarSeriesTreino(treino);
  botao.querySelector('[data-resumo="repeticoes"]').textContent = calcularRepeticoesTreino(treino);
  return botao;
}

// data-id-cardio guarda o id do TREINO dono, já que o cardio não tem id próprio.
function criarBotaoCardio(treino) {
  const botao = clonarTemplate("tpl-cardio-dia");
  botao.dataset.idCardio = treino.id;
  botao.querySelector(".cardio-dia__modalidade").textContent = treino.cardio.modalidade || "Cardio";
  botao.querySelector(".cardio-dia__meta").textContent = textoDasMetas(treino.cardio);
  botao.querySelector(".cardio-dia__preenchido").style.width =
    `${percentualGeralDoCardio(treino.cardio)}%`;
  return botao;
}

/* --- Tela: treino --- */

export function renderizarTreino() {
  const treino = buscarTreino(estado.idTreinoAtual);
  if (!treino) return;

  elemento("estado-treino").replaceChildren();
  elemento("conteudo-treino").hidden = false;

  elemento("dia-treino").textContent = nomesDosDias(treino);
  elemento("titulo-treino").textContent = treino.nome;
  elemento("descricao-treino").textContent = treino.descricao || "Sem descrição";

  elemento("metrica-exercicios").textContent = treino.exercicios.length;
  elemento("metrica-series").textContent = contarSeriesTreino(treino);
  elemento("metrica-repeticoes").textContent = calcularRepeticoesTreino(treino);
  elemento("resumo-treino").hidden = treino.exercicios.length === 0;

  elemento("lista-exercicios").replaceChildren(...(
    treino.exercicios.length === 0
      ? [criarEstadoVazio("Nenhum exercício adicionado ainda.", {
          rotulo: "+ Adicionar exercício",
          acao: "novo-exercicio",
        })]
      : treino.exercicios.map(criarCartaoExercicio)
  ));

  // O cardio existente, ou o convite para criar um.
  elemento("bloco-cardio-treino").replaceChildren(
    treino.cardio
      ? criarBotaoCardio(treino)
      : criarBotao("btn--secundario", "novo-cardio", "+ Adicionar cardio")
  );
}

function criarCartaoExercicio(exercicio) {
  const cartao = clonarTemplate("tpl-cartao-exercicio");
  cartao.dataset.idExercicio = exercicio.id;
  cartao.querySelector(".cartao__titulo").textContent = exercicio.nome;
  cartao.querySelector('[data-resumo="series"]').textContent =
    `${exercicio.series.length} ${exercicio.series.length === 1 ? "série" : "séries"}`;
  cartao.querySelector('[data-resumo="repeticoes"]').textContent =
    calcularRepeticoesExercicio(exercicio);
  return cartao;
}

/* --- Tela: exercício --- */

export function renderizarExercicio() {
  const exercicio = buscarExercicio(estado.idExercicioAtual);
  if (!exercicio) return;

  elemento("titulo-exercicio").textContent = exercicio.nome;
  elemento("corpo-tabela-series").replaceChildren(...(
    exercicio.series.length === 0
      ? [criarLinhaVazia(5, "Nenhuma série registrada ainda.")]
      : exercicio.series.map(criarLinhaSerie)
  ));

  elemento("btn-repetir-serie").hidden = exercicio.series.length === 0;
  renderizarMelhorSerie(exercicio);
  renderizarProgressoSeries(exercicio);
}

function criarLinhaSerie(serie) {
  const linha = clonarTemplate("tpl-linha-serie");
  linha.dataset.idSerie = serie.id;
  linha.classList.toggle("tabela-series__linha--feita", serie.feita);

  const checkbox = linha.querySelector("input");
  checkbox.checked = serie.feita;
  checkbox.setAttribute("aria-label", `Marcar série ${serie.numero} como feita`);

  linha.querySelector('[data-celula="numero"]').textContent = serie.numero;
  linha.querySelector('[data-celula="peso"]').textContent = `${formatarNumero(serie.peso)} kg`;
  linha.querySelector('[data-celula="reps"]').textContent = serie.repeticoes;
  linha.querySelector('[data-acao="remover-serie"]')
    .setAttribute("aria-label", `Remover série ${serie.numero}`);
  return linha;
}

function renderizarMelhorSerie(exercicio) {
  const melhor = encontrarMelhorSerie(exercicio);
  elemento("destaque-melhor-serie").hidden = !melhor;
  if (!melhor) return;

  elemento("melhor-serie-peso").textContent = formatarNumero(melhor.peso);
  elemento("melhor-serie-reps").textContent =
    `${melhor.repeticoes} ${melhor.repeticoes === 1 ? "rep" : "reps"}`;
}

function renderizarProgressoSeries(exercicio) {
  const container = elemento("progresso-series");
  const total = exercicio.series.length;
  container.hidden = total === 0;
  if (total === 0) return;

  const feitas = exercicio.series.filter((s) => s.feita).length;
  const faltam = total - feitas;

  container.querySelector(".progresso-series__preenchido").style.width =
    `${Math.round((feitas / total) * 100)}%`;
  container.querySelector(".progresso-series__texto").textContent =
    `${feitas} de ${total} séries feitas${faltam > 0 ? ` (faltam ${faltam})` : " — concluído!"}`;
}

/* --- Tela: cardio --- */

export function renderizarCardio() {
  const treino = buscarTreino(estado.idTreinoAtual);
  if (!treino?.cardio) return;
  const { cardio } = treino;

  elemento("dias-cardio").textContent = nomesDosDias(treino);
  elemento("titulo-cardio").textContent = cardio.modalidade || "Cardio";
  elemento("treino-do-cardio").textContent = treino.nome;

  renderizarMeta("tempo", calcularMinutosCardio(cardio), cardio.metaMinutos, "min");
  renderizarMeta("distancia", calcularKmCardio(cardio), cardio.metaKm, "km");

  elemento("corpo-tabela-sessoes").replaceChildren(...(
    cardio.sessoes.length === 0
      ? [criarLinhaVazia(5, "Nenhuma sessão registrada ainda.")]
      : cardio.sessoes.map(criarLinhaSessao)
  ));

  renderizarProgressoSessoes(cardio);
  elemento("btn-repetir-sessao").hidden = cardio.sessoes.length === 0;
}

function criarLinhaSessao(sessao, indice) {
  const numero = indice + 1;
  const linha = clonarTemplate("tpl-linha-sessao");
  linha.dataset.idSessao = sessao.id;
  linha.classList.toggle("tabela-series__linha--feita", sessao.feita);

  const checkbox = linha.querySelector("input");
  checkbox.checked = sessao.feita;
  checkbox.setAttribute("aria-label", `Marcar sessão ${numero} como feita`);

  linha.querySelector('[data-celula="numero"]').textContent = numero;
  linha.querySelector('[data-celula="tempo"]').textContent =
    sessao.minutos === null ? "—" : `${formatarNumero(sessao.minutos)} min`;
  linha.querySelector('[data-celula="distancia"]').textContent =
    sessao.km === null ? "—" : `${formatarNumero(sessao.km)} km`;
  linha.querySelector('[data-acao="remover-sessao"]')
    .setAttribute("aria-label", `Remover sessão ${numero}`);
  return linha;
}

function renderizarProgressoSessoes(cardio) {
  const total = cardio.sessoes.length;
  const feitas = contarSessoesFeitas(cardio);

  elemento("progresso-sessoes").textContent = total === 0 ? "" :
    `${feitas} de ${total} ${total === 1 ? "sessão concluída" : "sessões concluídas"}` +
    (feitas < total ? " — só as concluídas contam para a meta" : "");
}

// Um anel e uma legenda por meta. Meta não definida (null) some da tela.
function renderizarMeta(nome, atual, meta, unidade) {
  const bloco = document.querySelector(`[data-meta="${nome}"]`);
  const anel = document.querySelector(`[data-anel="${nome}"]`);

  bloco.hidden = meta === null;
  anel.classList.toggle("anel--oculto", meta === null);
  if (meta === null) return;

  const restante = meta - atual;
  desenharArco(anel.querySelector(".anel__arco"), percentualDaMeta(atual, meta));

  bloco.querySelector("[data-meta-atual]").textContent = formatarNumero(atual);
  bloco.querySelector("[data-meta-alvo]").textContent = `${formatarNumero(meta)} ${unidade}`;
  bloco.querySelector("[data-meta-restante]").textContent =
    restante > 0 ? `faltam ${formatarNumero(restante)} ${unidade}` : "meta concluída";
  bloco.classList.toggle("meta--concluida", restante <= 0);
}

// O contorno do círculo vira um tracejado do tamanho da circunferência; deslocar
// esse tracejado esconde a parte que ainda falta. Offset 0 = anel completo.
function desenharArco(circulo, percentual) {
  const circunferencia = 2 * Math.PI * Number(circulo.getAttribute("r"));
  circulo.style.strokeDasharray = circunferencia;
  circulo.style.strokeDashoffset = circunferencia * (1 - percentual / 100);
}

/* --- Navegação --- */

export function mostrarTela(nomeTela) {
  document.querySelectorAll(".tela").forEach((tela) => { tela.hidden = true; });
  elemento(`tela-${nomeTela}`).hidden = false;
  estado.telaAtual = nomeTela;
}

const renderizadores = { treino: renderizarTreino, exercicio: renderizarExercicio, cardio: renderizarCardio };

export const renderizarTelaAtual = () => renderizadores[estado.telaAtual]?.();

/* --- Formulários --- */

export function mostrarErroFormulario(formulario, mensagem) {
  const erro = formulario.querySelector(".erro-formulario");
  erro.textContent = mensagem;
  erro.hidden = false;
}

export function limparErroFormulario(formulario) {
  const erro = formulario.querySelector(".erro-formulario");
  erro.hidden = true;
  erro.textContent = "";
}

// Enquanto envia, nenhum botão do formulário responde: é o que impede o envio
// duplicado (com o botão de submit desabilitado, o Enter também não envia).
export function definirEnviando(formulario, enviando) {
  const botaoEnvio = formulario.querySelector('[type="submit"]');
  if (enviando) botaoEnvio.dataset.rotulo = botaoEnvio.textContent;
  botaoEnvio.textContent = enviando ? "Salvando..." : botaoEnvio.dataset.rotulo;
  formulario.querySelectorAll("button").forEach((botao) => { botao.disabled = enviando; });
  formulario.setAttribute("aria-busy", String(enviando));
}

// nome: "novo-exercicio" | "nova-serie" | "nova-sessao" | "meta"
export function esconderFormulario(nome) {
  const formulario = elemento(`form-${nome}`);
  elemento(`wrapper-form-${nome}`).hidden = true;
  formulario.reset();
  limparErroFormulario(formulario);
}

const selecionarCampo = (campo) => {
  campo.focus();
  campo.select();
};

export const focarCampo = (idCampo) => selecionarCampo(elemento(idCampo));

const valorOuVazio = (valor) => valor ?? "";

export function abrirFormularioNovoTreino() {
  const formulario = elemento("form-novo-treino");
  limparErroFormulario(formulario);
  formulario.reset();
  // Já deixa hoje marcado, que é o dia mais provável.
  formulario.querySelector(`input[name="dia"][value="${diaSemanaDeHoje()}"]`).checked = true;
  mostrarTela("novo-treino");
}

export const diasSelecionados = () =>
  Array.from(document.querySelectorAll('#form-novo-treino input[name="dia"]:checked'))
    .map((caixa) => Number(caixa.value));

export function abrirFormularioNovoExercicio() {
  elemento("wrapper-form-novo-exercicio").hidden = false;
  elemento("input-nome-exercicio").focus();
}

// Abre já com os valores da última série: em geral a próxima repete a anterior.
export function abrirFormularioNovaSerie() {
  const anterior = buscarExercicio(estado.idExercicioAtual)?.series.at(-1);

  elemento("wrapper-form-nova-serie").hidden = false;
  if (anterior) {
    elemento("input-peso-serie").value = anterior.peso;
    elemento("input-repeticoes-serie").value = anterior.repeticoes;
  }
  focarCampo("input-peso-serie");
}

export function abrirFormularioNovaSessao() {
  const anterior = buscarTreino(estado.idTreinoAtual).cardio.sessoes.at(-1);

  esconderFormulario("meta");
  elemento("wrapper-form-nova-sessao").hidden = false;
  if (anterior) {
    elemento("input-tempo-sessao").value = valorOuVazio(anterior.minutos);
    elemento("input-distancia-sessao").value = valorOuVazio(anterior.km);
  }
  focarCampo("input-tempo-sessao");
}

// Abre com os valores atuais da meta; serve tanto para editar quanto para definir.
export function abrirFormularioMeta() {
  const { cardio } = buscarTreino(estado.idTreinoAtual);

  esconderFormulario("nova-sessao");
  elemento("wrapper-form-meta").hidden = false;
  elemento("input-modalidade").value = cardio.modalidade;
  elemento("input-meta-tempo").value = valorOuVazio(cardio.metaMinutos);
  elemento("input-meta-distancia").value = valorOuVazio(cardio.metaKm);
  elemento("input-modalidade").focus();
}
