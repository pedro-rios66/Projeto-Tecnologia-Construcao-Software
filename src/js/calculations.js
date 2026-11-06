// Funções puras de cálculo e formatação: não tocam no DOM, no estado nem na rede.

// Ordem do cronograma. O índice é o valor guardado em treino.dias (0 = segunda).
export const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export const calcularRepeticoesExercicio = (exercicio) =>
  exercicio.series.reduce((total, serie) => total + serie.repeticoes, 0);

export const calcularRepeticoesTreino = (treino) =>
  treino.exercicios.reduce((total, exercicio) => total + calcularRepeticoesExercicio(exercicio), 0);

export const contarSeriesTreino = (treino) =>
  treino.exercicios.reduce((total, exercicio) => total + exercicio.series.length, 0);

// Melhor série = a de maior peso registrado (a primeira, em caso de empate).
export const encontrarMelhorSerie = (exercicio) =>
  exercicio.series.reduce(
    (melhor, serie) => (melhor === null || serie.peso > melhor.peso ? serie : melhor),
    null
  );

// Só sessões feitas contam para a meta. Podem ter só tempo ou só distância, daí o `|| 0`.
export const calcularMinutosCardio = (cardio) =>
  cardio.sessoes.reduce((total, s) => (s.feita ? total + (s.minutos || 0) : total), 0);

export const calcularKmCardio = (cardio) =>
  cardio.sessoes.reduce((total, s) => (s.feita ? total + (s.km || 0) : total), 0);

export const contarSessoesFeitas = (cardio) => cardio.sessoes.filter((s) => s.feita).length;

export const percentualDaMeta = (atual, meta) =>
  meta ? Math.min(100, Math.round((atual / meta) * 100)) : 0;

// Progresso resumido para a barrinha do cronograma: a média das metas definidas.
export function percentualGeralDoCardio(cardio) {
  const percentuais = [];
  if (cardio.metaMinutos !== null) {
    percentuais.push(percentualDaMeta(calcularMinutosCardio(cardio), cardio.metaMinutos));
  }
  if (cardio.metaKm !== null) {
    percentuais.push(percentualDaMeta(calcularKmCardio(cardio), cardio.metaKm));
  }
  if (percentuais.length === 0) return 0;
  return Math.round(percentuais.reduce((total, p) => total + p, 0) / percentuais.length);
}

// Mostra inteiros sem casas decimais e valores fracionários com uma casa.
export const formatarNumero = (valor) =>
  Number.isInteger(valor) ? String(valor) : valor.toFixed(1);

// "30 min · 5 km", só com as metas que existem.
export function textoDasMetas(cardio) {
  const partes = [];
  if (cardio.metaMinutos !== null) partes.push(`${formatarNumero(cardio.metaMinutos)} min`);
  if (cardio.metaKm !== null) partes.push(`${formatarNumero(cardio.metaKm)} km`);
  return partes.join(" · ");
}

// Treinos marcados para um dia do cronograma (o mesmo treino pode estar em vários).
export const treinosDoDia = (treinos, indiceDia) =>
  treinos.filter((treino) => treino.dias.includes(indiceDia));

// "Segunda · Sexta", para exibir os dias de um treino.
export const nomesDosDias = (treino) =>
  treino.dias.map((indice) => DIAS_SEMANA[indice]).join(" · ");

// Date.getDay() usa 0 = domingo; DIAS_SEMANA começa na segunda, daí o deslocamento.
export const diaSemanaDeHoje = () => (new Date().getDay() + 6) % 7;
