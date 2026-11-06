// Estado da interface. É só uma cópia do que o servidor devolveu: a fonte de
// verdade dos dados é a API (ver api.js).
export const estado = {
  treinos: [],
  telaAtual: "treinos", // "treinos" | "novo-treino" | "treino" | "exercicio" | "cardio"
  idTreinoAtual: null,
  idExercicioAtual: null,
};

export const buscarTreino = (idTreino) => estado.treinos.find((t) => t.id === idTreino);

export const buscarExercicio = (idExercicio) =>
  estado.treinos.flatMap((t) => t.exercicios).find((e) => e.id === idExercicio);

// Guarda o treino devolvido pelo servidor: substitui o existente ou adiciona um novo.
export function salvarTreino(treino) {
  const indice = estado.treinos.findIndex((t) => t.id === treino.id);
  if (indice === -1) {
    estado.treinos.push(treino);
  } else {
    estado.treinos[indice] = treino;
  }
}
