// Funções puras de validação: recebem os valores dos campos e devolvem a mensagem
// de erro ou null. O servidor repete as mesmas regras (server/server.py).

const estaVazio = (texto) => !texto || texto.trim() === "";

export const validarNomeTreino = (nome) =>
  estaVazio(nome) ? "O nome do treino não pode estar vazio." : null;

export const validarDiasTreino = (dias) =>
  dias.length === 0 ? "Selecione pelo menos um dia da semana." : null;

export const validarNomeExercicio = (nome) =>
  estaVazio(nome) ? "O nome do exercício não pode estar vazio." : null;

export function validarSerie(pesoStr, repeticoesStr) {
  const peso = Number(pesoStr);
  const repeticoes = Number(repeticoesStr);

  if (pesoStr === "" || isNaN(peso) || peso <= 0) {
    return "O peso deve ser um número maior que zero.";
  }
  if (repeticoesStr === "" || !Number.isInteger(repeticoes) || repeticoes <= 0) {
    return "As repetições devem ser um número inteiro maior que zero.";
  }
  return null;
}

// Campo numérico opcional: vazio vira null, o resto vira número.
export const numeroOuNulo = (valorStr) => (valorStr.trim() === "" ? null : Number(valorStr));

// Recusa um campo opcional preenchido com algo que não seja número positivo.
function validarNumeroOpcional(valorStr, nomeDoCampo) {
  if (valorStr.trim() === "") return null;
  const valor = Number(valorStr);
  return isNaN(valor) || valor <= 0 ? `${nomeDoCampo} deve ser um número maior que zero.` : null;
}

export function validarCardio(modalidade, metaTempoStr, metaDistanciaStr) {
  if (estaVazio(modalidade)) {
    return "A modalidade não pode estar vazia.";
  }
  if (estaVazio(metaTempoStr) && estaVazio(metaDistanciaStr)) {
    return "Defina uma meta de tempo, de distância, ou as duas.";
  }
  return (
    validarNumeroOpcional(metaTempoStr, "A meta de tempo") ||
    validarNumeroOpcional(metaDistanciaStr, "A meta de distância")
  );
}

export function validarSessaoCardio(tempoStr, distanciaStr) {
  if (estaVazio(tempoStr) && estaVazio(distanciaStr)) {
    return "Informe o tempo, a distância, ou os dois.";
  }
  return (
    validarNumeroOpcional(tempoStr, "O tempo") ||
    validarNumeroOpcional(distanciaStr, "A distância")
  );
}
