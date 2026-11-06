// Único módulo que conhece URLs e HTTP. Não toca no DOM e não engole erros:
// quem chama decide o que mostrar.

const TEMPO_LIMITE_MS = 8000;

async function requisitar(caminho, metodo = "GET", dados) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetch(`/api/workouts${caminho}`, {
      method: metodo,
      headers: dados && { "Content-Type": "application/json" },
      body: dados && JSON.stringify(dados),
      signal: controlador.signal,
    });

    if (resposta.ok) return await resposta.json();

    const corpo = await resposta.json().catch(() => null);
    const mensagem = corpo?.error ?? `Erro inesperado do servidor (HTTP ${resposta.status}).`;
    throw Object.assign(new Error(mensagem), { status: resposta.status });
  } catch (erro) {
    if (erro.name === "AbortError") {
      throw new Error("O servidor demorou demais para responder. Tente novamente.");
    }
    if (erro instanceof TypeError) { // é como o fetch sinaliza uma falha de rede
      throw new Error("Não foi possível conectar ao servidor. Verifique se ele está em execução.");
    }
    throw erro;
  } finally {
    clearTimeout(temporizador);
  }
}

const caminhoExercicio = (idTreino, idExercicio) => `/${idTreino}/exercises/${idExercicio}`;
const caminhoSerie = (idTreino, idExercicio, idSerie) =>
  `${caminhoExercicio(idTreino, idExercicio)}/sets/${idSerie}`;
const caminhoSessao = (idTreino, idSessao) => `/${idTreino}/cardio/sessions/${idSessao}`;

// Consultas
export const fetchWorkouts = () => requisitar("");
export const fetchWorkout = (idTreino) => requisitar(`/${idTreino}`);

// Submissões: todas devolvem o treino criado ou atualizado.
export const createWorkout = (dados) => requisitar("", "POST", dados);

export const addExercise = (idTreino, dados) => requisitar(`/${idTreino}/exercises`, "POST", dados);
export const removeExercise = (idTreino, idExercicio) =>
  requisitar(caminhoExercicio(idTreino, idExercicio), "DELETE");

export const addSet = (idTreino, idExercicio, dados) =>
  requisitar(`${caminhoExercicio(idTreino, idExercicio)}/sets`, "POST", dados);
export const updateSet = (idTreino, idExercicio, idSerie, dados) =>
  requisitar(caminhoSerie(idTreino, idExercicio, idSerie), "PATCH", dados);
export const removeSet = (idTreino, idExercicio, idSerie) =>
  requisitar(caminhoSerie(idTreino, idExercicio, idSerie), "DELETE");

export const saveCardio = (idTreino, dados) => requisitar(`/${idTreino}/cardio`, "PUT", dados);
export const addSession = (idTreino, dados) =>
  requisitar(`/${idTreino}/cardio/sessions`, "POST", dados);
export const updateSession = (idTreino, idSessao, dados) =>
  requisitar(caminhoSessao(idTreino, idSessao), "PATCH", dados);
export const removeSession = (idTreino, idSessao) =>
  requisitar(caminhoSessao(idTreino, idSessao), "DELETE");
