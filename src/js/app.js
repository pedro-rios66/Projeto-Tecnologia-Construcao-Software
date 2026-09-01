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

// Dias da semana na ordem do cronograma. O índice nesta lista é o valor
// guardado em treino.dias (0 = segunda ... 6 = domingo).
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

// Todo o estado da aplicação vive em memória, neste objeto.
// Nenhum dado é persistido: ao recarregar a página, tudo reinicia.
const estado = {
  treinos: [],           // lista de treinos
  telaAtual: "treinos",  // "treinos" | "novo-treino" | "treino" | "exercicio" | "cardio"
  idTreinoAtual: null,   // id do treino aberto
  idExercicioAtual: null, // id do exercício aberto
  proximoIdTreino: 1,
  proximoIdExercicio: 1,
  proximoIdSerie: 1,
  proximoIdSessao: 1
};

/* ----------------------------------------------------------
   2. Dados de exemplo (seed)
   ---------------------------------------------------------- */

function criarDadosDeExemplo() {
  // Divisão A/B/C repetida duas vezes na semana, com quinta de descanso.
  const treinoA = criarTreino("Treino A", "Peito + Tríceps", [0, 4]);
  const supinoReto = adicionarExercicio(treinoA.id, "Supino Reto");
  adicionarSerie(supinoReto.id, 60, 10);
  adicionarSerie(supinoReto.id, 60, 10);
  adicionarSerie(supinoReto.id, 55, 12);

  const supinoInclinado = adicionarExercicio(treinoA.id, "Supino Inclinado");
  adicionarSerie(supinoInclinado.id, 50, 10);
  adicionarSerie(supinoInclinado.id, 50, 10);

  adicionarExercicio(treinoA.id, "Tríceps Pulley");

  definirCardio(treinoA.id, "Esteira", 30, 5);
  const caminhada = registrarSessaoCardio(treinoA.id, 12, 1.8);
  const trote = registrarSessaoCardio(treinoA.id, 12, 1.6);
  alternarSessaoFeita(treinoA.id, caminhada.id);
  alternarSessaoFeita(treinoA.id, trote.id);

  const treinoB = criarTreino("Treino B", "Costas + Bíceps", [1, 5]);
  const puxada = adicionarExercicio(treinoB.id, "Puxada Alta");
  adicionarSerie(puxada.id, 45, 12);
  adicionarSerie(puxada.id, 45, 12);

  adicionarExercicio(treinoB.id, "Remada");
  adicionarExercicio(treinoB.id, "Rosca Direta");

  definirCardio(treinoB.id, "Bicicleta", 40, 12);
  const pedalada = registrarSessaoCardio(treinoB.id, 40, 12);
  alternarSessaoFeita(treinoB.id, pedalada.id);

  const treinoC = criarTreino("Treino C", "Pernas", [2, 6]);
  const agachamento = adicionarExercicio(treinoC.id, "Agachamento Livre");
  adicionarSerie(agachamento.id, 80, 8);
  adicionarSerie(agachamento.id, 80, 8);
  adicionarSerie(agachamento.id, 70, 10);

  const legPress = adicionarExercicio(treinoC.id, "Leg Press");
  adicionarSerie(legPress.id, 120, 12);
  adicionarSerie(legPress.id, 120, 10);

  adicionarExercicio(treinoC.id, "Cadeira Extensora");
  adicionarExercicio(treinoC.id, "Panturrilha em Pé");
}

/* ----------------------------------------------------------
   3. Funções de criação
   ---------------------------------------------------------- */

function criarTreino(nome, descricao, dias) {
  const treino = {
    id: estado.proximoIdTreino++,
    nome: nome.trim(),
    descricao: descricao ? descricao.trim() : "",
    dias: dias.slice(), // cópia: o array não fica compartilhado com quem chamou
    exercicios: [],
    cardio: null        // preenchido por definirCardio quando o treino tiver cardio
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

  // O número da série não é armazenado: ele é derivado da posição na lista
  // durante a renderização, para continuar correto após uma remoção.
  const serie = {
    id: estado.proximoIdSerie++,
    peso: peso,
    repeticoes: repeticoes,
    feita: false
  };
  exercicio.series.push(serie);
  return serie;
}

/* --- Cardio: um por treino, em treino.cardio (ou null) --- */

// metaMinutos e metaKm são números ou null (meta não definida).
function definirCardio(idTreino, modalidade, metaMinutos, metaKm) {
  const treino = buscarTreino(idTreino);
  if (!treino) return null;

  const sessoes = treino.cardio ? treino.cardio.sessoes : [];
  treino.cardio = {
    modalidade: modalidade.trim(),
    metaMinutos: metaMinutos,
    metaKm: metaKm,
    sessoes: sessoes // editar a meta não descarta o que já foi registrado
  };
  return treino.cardio;
}

// minutos e km são números ou null (o usuário informa um dos dois, ou ambos).
function registrarSessaoCardio(idTreino, minutos, km) {
  const treino = buscarTreino(idTreino);
  if (!treino || !treino.cardio) return null;

  const sessao = {
    id: estado.proximoIdSessao++,
    minutos: minutos,
    km: km,
    feita: false
  };
  treino.cardio.sessoes.push(sessao);
  return sessao;
}

function alternarSessaoFeita(idTreino, idSessao) {
  const treino = buscarTreino(idTreino);
  if (!treino || !treino.cardio) return null;

  const sessao = treino.cardio.sessoes.find(function (s) { return s.id === idSessao; });
  if (!sessao) return null;

  sessao.feita = !sessao.feita;
  return sessao;
}

function removerSessaoCardio(idTreino, idSessao) {
  const treino = buscarTreino(idTreino);
  if (!treino || !treino.cardio) return null;

  const indice = treino.cardio.sessoes.findIndex(function (s) { return s.id === idSessao; });
  if (indice === -1) return null;
  return treino.cardio.sessoes.splice(indice, 1)[0];
}

function removerExercicio(idExercicio) {
  for (const treino of estado.treinos) {
    const indice = treino.exercicios.findIndex(function (e) { return e.id === idExercicio; });
    if (indice !== -1) {
      return treino.exercicios.splice(indice, 1)[0];
    }
  }
  return null;
}

function removerSerie(idSerie) {
  for (const treino of estado.treinos) {
    for (const exercicio of treino.exercicios) {
      const indice = exercicio.series.findIndex(function (s) { return s.id === idSerie; });
      if (indice !== -1) {
        return exercicio.series.splice(indice, 1)[0];
      }
    }
  }
  return null;
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

function validarDiasTreino(dias) {
  if (dias.length === 0) {
    return "Selecione pelo menos um dia da semana.";
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

// Campo numérico opcional: vazio vira null, o resto vira número.
function numeroOuNulo(valorStr) {
  return valorStr.trim() === "" ? null : Number(valorStr);
}

// Recusa um campo opcional preenchido com algo que não seja número positivo.
function validarNumeroOpcional(valorStr, nomeDoCampo) {
  if (valorStr.trim() === "") return null;
  const valor = Number(valorStr);
  if (isNaN(valor) || valor <= 0) {
    return nomeDoCampo + " deve ser um número maior que zero.";
  }
  return null;
}

function validarCardio(modalidade, metaTempoStr, metaDistanciaStr) {
  if (!modalidade || modalidade.trim() === "") {
    return "A modalidade não pode estar vazia.";
  }
  if (metaTempoStr.trim() === "" && metaDistanciaStr.trim() === "") {
    return "Defina uma meta de tempo, de distância, ou as duas.";
  }
  return validarNumeroOpcional(metaTempoStr, "A meta de tempo") ||
         validarNumeroOpcional(metaDistanciaStr, "A meta de distância");
}

function validarSessaoCardio(tempoStr, distanciaStr) {
  if (tempoStr.trim() === "" && distanciaStr.trim() === "") {
    return "Informe o tempo, a distância, ou os dois.";
  }
  return validarNumeroOpcional(tempoStr, "O tempo") ||
         validarNumeroOpcional(distanciaStr, "A distância");
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

/* --- Cardio: totais acumulados e progresso em relação à meta --- */

// Só sessões marcadas como feitas contam para a meta — é o que faz o total
// bater com o que está marcado na tabela. As sessões podem ter só tempo ou só
// distância, daí o `|| 0`.
function calcularMinutosCardio(cardio) {
  return cardio.sessoes.reduce(function (total, sessao) {
    return sessao.feita ? total + (sessao.minutos || 0) : total;
  }, 0);
}

function calcularKmCardio(cardio) {
  return cardio.sessoes.reduce(function (total, sessao) {
    return sessao.feita ? total + (sessao.km || 0) : total;
  }, 0);
}

function contarSessoesFeitas(cardio) {
  return cardio.sessoes.filter(function (sessao) { return sessao.feita; }).length;
}

function percentualDaMeta(atual, meta) {
  if (!meta) return 0;
  return Math.min(100, Math.round((atual / meta) * 100));
}

// Progresso resumido para a barrinha do cronograma: a média das metas definidas.
function percentualGeralDoCardio(cardio) {
  const percentuais = [];
  if (cardio.metaMinutos !== null) {
    percentuais.push(percentualDaMeta(calcularMinutosCardio(cardio), cardio.metaMinutos));
  }
  if (cardio.metaKm !== null) {
    percentuais.push(percentualDaMeta(calcularKmCardio(cardio), cardio.metaKm));
  }
  if (percentuais.length === 0) return 0;

  const soma = percentuais.reduce(function (total, p) { return total + p; }, 0);
  return Math.round(soma / percentuais.length);
}

// Última sessão registrada, base para "repetir última".
function ultimaSessao(cardio) {
  return cardio.sessoes.length > 0 ? cardio.sessoes[cardio.sessoes.length - 1] : null;
}

// "30 min · 5 km", só com as metas que existem.
function textoDasMetas(cardio) {
  const partes = [];
  if (cardio.metaMinutos !== null) partes.push(formatarNumero(cardio.metaMinutos) + " min");
  if (cardio.metaKm !== null) partes.push(formatarNumero(cardio.metaKm) + " km");
  return partes.join(" · ");
}

// Treinos marcados para um dia do cronograma (o mesmo treino pode estar em vários).
function treinosDoDia(indiceDia) {
  return estado.treinos.filter(function (treino) { return treino.dias.includes(indiceDia); });
}

// "Segunda · Sexta", para exibir os dias de um treino.
function nomesDosDias(treino) {
  return treino.dias.map(function (indice) { return DIAS_SEMANA[indice]; }).join(" · ");
}

// Date.getDay() usa 0 = domingo; DIAS_SEMANA começa na segunda, daí o deslocamento.
function diaSemanaDeHoje() {
  return (new Date().getDay() + 6) % 7;
}

// Última série registrada, base para "repetir última" e para o pré-preenchimento.
function ultimaSerie(exercicio) {
  return exercicio.series.length > 0 ? exercicio.series[exercicio.series.length - 1] : null;
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

// Linha de tabela vazia, com o colspan e o texto de cada tabela.
function criarLinhaVazia(colunas, texto) {
  const linha = clonarTemplate("tpl-linha-vazia");
  linha.querySelector("td").colSpan = colunas;
  linha.querySelector(".estado-vazio__texto").textContent = texto;
  return linha;
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

  const hoje = diaSemanaDeHoje();

  // Um cartão por dia da semana, sempre os sete, mesmo os de descanso.
  DIAS_SEMANA.forEach(function (nomeDia, indiceDia) {
    const cartaoDia = clonarTemplate("tpl-dia-semana");
    const conteudo = cartaoDia.querySelector(".dia__conteudo");
    cartaoDia.querySelector(".dia__nome").textContent = nomeDia;

    if (indiceDia === hoje) {
      cartaoDia.classList.add("dia--hoje");
      cartaoDia.querySelector(".dia__etiqueta-hoje").hidden = false;
    }

    const treinos = treinosDoDia(indiceDia);
    if (treinos.length === 0) {
      conteudo.appendChild(clonarTemplate("tpl-descanso"));
    } else {
      treinos.forEach(function (treino) {
        conteudo.appendChild(criarBotaoTreino(treino));
        if (treino.cardio) {
          conteudo.appendChild(criarBotaoCardio(treino));
        }
      });
    }

    lista.appendChild(cartaoDia);
  });
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
    percentualGeralDoCardio(treino.cardio) + "%";
  return botao;
}

function renderizarTreino() {
  const treino = buscarTreino(estado.idTreinoAtual);
  if (!treino) return;

  document.getElementById("dia-treino").textContent = nomesDosDias(treino);
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

  renderizarBlocoCardioDoTreino(treino);
}

// Na tela do treino: o cardio existente, ou o convite para criar um.
function renderizarBlocoCardioDoTreino(treino) {
  const bloco = document.getElementById("bloco-cardio-treino");
  bloco.innerHTML = "";

  if (treino.cardio) {
    bloco.appendChild(criarBotaoCardio(treino));
    return;
  }

  const botao = document.createElement("button");
  botao.className = "btn btn--secundario";
  botao.type = "button";
  botao.dataset.acao = "novo-cardio";
  botao.textContent = "+ Adicionar cardio";
  bloco.appendChild(botao);
}

function renderizarExercicio() {
  const exercicio = buscarExercicio(estado.idExercicioAtual);
  if (!exercicio) return;

  document.getElementById("titulo-exercicio").textContent = exercicio.nome;

  const corpoTabela = document.getElementById("corpo-tabela-series");
  corpoTabela.innerHTML = "";

  if (exercicio.series.length === 0) {
    corpoTabela.appendChild(criarLinhaVazia(5, "Nenhuma série registrada ainda."));
  } else {
    exercicio.series.forEach(function (serie, indice) {
      const numero = indice + 1; // derivado da posição, não armazenado no modelo
      const linha = clonarTemplate("tpl-linha-serie");
      linha.dataset.idSerie = serie.id;
      if (serie.feita) linha.classList.add("tabela-series__linha--feita");

      const checkbox = linha.querySelector("input");
      checkbox.checked = serie.feita;
      checkbox.setAttribute("aria-label", "Marcar série " + numero + " como feita");

      linha.querySelector('[data-celula="numero"]').textContent = numero;
      linha.querySelector('[data-celula="peso"]').textContent = formatarNumero(serie.peso) + " kg";
      linha.querySelector('[data-celula="reps"]').textContent = serie.repeticoes;
      linha.querySelector('[data-acao="remover-serie"]')
        .setAttribute("aria-label", "Remover série " + numero);
      corpoTabela.appendChild(linha);
    });
  }

  document.getElementById("btn-repetir-serie").hidden = exercicio.series.length === 0;
  renderizarMelhorSerie(exercicio);
  renderizarProgressoSeries(exercicio);
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

/* --- Tela de cardio --- */

function renderizarCardio() {
  const treino = buscarTreino(estado.idTreinoAtual);
  if (!treino || !treino.cardio) return;
  const cardio = treino.cardio;

  document.getElementById("dias-cardio").textContent = nomesDosDias(treino);
  document.getElementById("titulo-cardio").textContent = cardio.modalidade || "Cardio";
  document.getElementById("treino-do-cardio").textContent = treino.nome;

  renderizarMeta("tempo", calcularMinutosCardio(cardio), cardio.metaMinutos, "min");
  renderizarMeta("distancia", calcularKmCardio(cardio), cardio.metaKm, "km");

  const corpoTabela = document.getElementById("corpo-tabela-sessoes");
  corpoTabela.innerHTML = "";

  if (cardio.sessoes.length === 0) {
    corpoTabela.appendChild(criarLinhaVazia(5, "Nenhuma sessão registrada ainda."));
  } else {
    cardio.sessoes.forEach(function (sessao, indice) {
      const numero = indice + 1;
      const linha = clonarTemplate("tpl-linha-sessao");
      linha.dataset.idSessao = sessao.id;
      if (sessao.feita) linha.classList.add("tabela-series__linha--feita");

      const checkbox = linha.querySelector("input");
      checkbox.checked = sessao.feita;
      checkbox.setAttribute("aria-label", "Marcar sessão " + numero + " como feita");

      linha.querySelector('[data-celula="numero"]').textContent = numero;
      linha.querySelector('[data-celula="tempo"]').textContent =
        sessao.minutos === null ? "—" : formatarNumero(sessao.minutos) + " min";
      linha.querySelector('[data-celula="distancia"]').textContent =
        sessao.km === null ? "—" : formatarNumero(sessao.km) + " km";
      linha.querySelector('[data-acao="remover-sessao"]')
        .setAttribute("aria-label", "Remover sessão " + numero);

      corpoTabela.appendChild(linha);
    });
  }

  renderizarProgressoSessoes(cardio);
  document.getElementById("btn-repetir-sessao").hidden = cardio.sessoes.length === 0;
}

function renderizarProgressoSessoes(cardio) {
  const elemento = document.getElementById("progresso-sessoes");
  const total = cardio.sessoes.length;

  if (total === 0) {
    elemento.textContent = "";
    return;
  }

  const feitas = contarSessoesFeitas(cardio);
  elemento.textContent = feitas + " de " + total +
    (total === 1 ? " sessão concluída" : " sessões concluídas") +
    (feitas < total ? " — só as concluídas contam para a meta" : "");
}

// Um anel e uma legenda por meta. Meta não definida (null) some da tela.
function renderizarMeta(nome, atual, meta, unidade) {
  const bloco = document.querySelector('[data-meta="' + nome + '"]');
  const anel = document.querySelector('[data-anel="' + nome + '"]');

  if (meta === null) {
    bloco.hidden = true;
    anel.classList.add("anel--oculto");
    return;
  }

  const restante = meta - atual;
  bloco.hidden = false;
  anel.classList.remove("anel--oculto");

  desenharArco(anel.querySelector(".anel__arco"), percentualDaMeta(atual, meta));

  bloco.querySelector("[data-meta-atual]").textContent = formatarNumero(atual);
  bloco.querySelector("[data-meta-alvo]").textContent = formatarNumero(meta) + " " + unidade;
  bloco.querySelector("[data-meta-restante]").textContent =
    restante > 0 ? "faltam " + formatarNumero(restante) + " " + unidade : "meta concluída";
  bloco.classList.toggle("meta--concluida", restante <= 0);
}

// O contorno do círculo vira um tracejado do tamanho da circunferência; deslocar
// esse tracejado esconde a parte que ainda falta. Offset 0 = anel completo.
function desenharArco(circulo, percentual) {
  const raio = Number(circulo.getAttribute("r"));
  const circunferencia = 2 * Math.PI * raio;

  circulo.style.strokeDasharray = circunferencia;
  circulo.style.strokeDashoffset = circunferencia * (1 - percentual / 100);
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
  // Já deixa hoje marcado, que é o dia mais provável.
  caixaDoDia(diaSemanaDeHoje()).checked = true;
  mostrarTela("novo-treino");
}

function caixaDoDia(indiceDia) {
  return document.querySelector('#form-novo-treino input[name="dia"][value="' + indiceDia + '"]');
}

function diasSelecionados() {
  const marcadas = document.querySelectorAll('#form-novo-treino input[name="dia"]:checked');
  return Array.from(marcadas).map(function (caixa) { return Number(caixa.value); });
}

// Os formulários fecham ao entrar na tela, não a cada re-renderização: assim eles
// permanecem abertos enquanto o usuário registra vários itens seguidos.
function abrirTreino(idTreino) {
  estado.idTreinoAtual = idTreino;
  esconderFormularioNovoExercicio();
  renderizarTreino();
  mostrarTela("treino");
}

function abrirExercicio(idExercicio) {
  estado.idExercicioAtual = idExercicio;
  esconderFormularioNovaSerie();
  renderizarExercicio();
  mostrarTela("exercicio");
}

// O cardio pertence ao treino, então é identificado pelo id do treino dono.
function abrirCardio(idTreino) {
  estado.idTreinoAtual = idTreino;
  esconderFormularioNovaSessao();
  esconderFormularioMeta();
  renderizarCardio();
  mostrarTela("cardio");
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

// Abre já com os valores da última série: em geral a próxima repete a anterior.
function abrirFormularioNovaSerie() {
  const exercicio = buscarExercicio(estado.idExercicioAtual);
  const anterior = exercicio ? ultimaSerie(exercicio) : null;
  const campoPeso = document.getElementById("input-peso-serie");

  document.getElementById("wrapper-form-nova-serie").hidden = false;
  if (anterior) {
    campoPeso.value = anterior.peso;
    document.getElementById("input-repeticoes-serie").value = anterior.repeticoes;
  }
  campoPeso.focus();
  campoPeso.select();
}

function esconderFormularioNovaSerie() {
  document.getElementById("wrapper-form-nova-serie").hidden = true;
  document.getElementById("form-nova-serie").reset();
  limparErroFormulario("erro-nova-serie");
}

function abrirFormularioNovaSessao() {
  const cardio = buscarTreino(estado.idTreinoAtual).cardio;
  const anterior = ultimaSessao(cardio);
  const campoTempo = document.getElementById("input-tempo-sessao");

  esconderFormularioMeta();
  document.getElementById("wrapper-form-nova-sessao").hidden = false;
  if (anterior) {
    campoTempo.value = anterior.minutos === null ? "" : anterior.minutos;
    document.getElementById("input-distancia-sessao").value = anterior.km === null ? "" : anterior.km;
  }
  campoTempo.focus();
  campoTempo.select();
}

function esconderFormularioNovaSessao() {
  document.getElementById("wrapper-form-nova-sessao").hidden = true;
  document.getElementById("form-nova-sessao").reset();
  limparErroFormulario("erro-nova-sessao");
}

// Abre com os valores atuais da meta; serve tanto para editar quanto para definir.
function abrirFormularioMeta() {
  const cardio = buscarTreino(estado.idTreinoAtual).cardio;

  esconderFormularioNovaSessao();
  document.getElementById("wrapper-form-meta").hidden = false;
  document.getElementById("input-modalidade").value = cardio.modalidade;
  document.getElementById("input-meta-tempo").value = cardio.metaMinutos === null ? "" : cardio.metaMinutos;
  document.getElementById("input-meta-distancia").value = cardio.metaKm === null ? "" : cardio.metaKm;
  document.getElementById("input-modalidade").focus();
}

function esconderFormularioMeta() {
  document.getElementById("wrapper-form-meta").hidden = true;
  document.getElementById("form-meta").reset();
  limparErroFormulario("erro-meta");
}

function configurarEventos() {
  // --- Lista de treinos (delegação: um listener para todos os cartões) ---
  document.getElementById("btn-novo-treino").addEventListener("click", irParaFormularioNovoTreino);

  document.getElementById("lista-treinos").addEventListener("click", function (event) {
    if (event.target.closest('[data-acao="novo-treino"]')) {
      irParaFormularioNovoTreino();
      return;
    }
    // O bloco de cardio é irmão do botão do treino dentro do mesmo dia.
    const botaoCardio = event.target.closest("[data-id-cardio]");
    if (botaoCardio) {
      abrirCardio(Number(botaoCardio.dataset.idCardio));
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
    const dias = diasSelecionados();

    const erro = validarNomeTreino(nome) || validarDiasTreino(dias);
    if (erro) {
      mostrarErroFormulario("erro-novo-treino", erro);
      return;
    }

    const treino = criarTreino(nome, descricao, dias);
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
    if (!cartao) return;
    const idExercicio = Number(cartao.dataset.idExercicio);

    // Remover destrói as séries junto, por isso pede confirmação.
    if (event.target.closest('[data-acao="remover-exercicio"]')) {
      const exercicio = buscarExercicio(idExercicio);
      if (window.confirm('Remover "' + exercicio.nome + '" e todas as suas séries?')) {
        removerExercicio(idExercicio);
        renderizarTreino();
      }
      return;
    }

    abrirExercicio(idExercicio);
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

    // O formulário continua aberto para cadastrar o exercício seguinte.
    const campoNome = document.getElementById("input-nome-exercicio");
    campoNome.value = "";
    limparErroFormulario("erro-novo-exercicio");
    campoNome.focus();
  });

  // Bloco de cardio na tela do treino: abre o cardio existente ou cria um.
  document.getElementById("bloco-cardio-treino").addEventListener("click", function (event) {
    if (event.target.closest('[data-acao="novo-cardio"]')) {
      definirCardio(estado.idTreinoAtual, "", null, null);
      abrirCardio(estado.idTreinoAtual);
      abrirFormularioMeta();
      return;
    }
    const botaoCardio = event.target.closest("[data-id-cardio]");
    if (botaoCardio) abrirCardio(Number(botaoCardio.dataset.idCardio));
  });

  // --- Tela de exercício ---
  document.getElementById("btn-voltar-treino").addEventListener("click", function () {
    abrirTreino(estado.idTreinoAtual);
  });

  document.getElementById("btn-nova-serie").addEventListener("click", abrirFormularioNovaSerie);

  document.getElementById("btn-cancelar-nova-serie").addEventListener("click", esconderFormularioNovaSerie);

  // Repete a última série com um clique: é a ação mais frequente durante o treino.
  document.getElementById("btn-repetir-serie").addEventListener("click", function () {
    const exercicio = buscarExercicio(estado.idExercicioAtual);
    const anterior = ultimaSerie(exercicio);
    if (!anterior) return;

    adicionarSerie(exercicio.id, anterior.peso, anterior.repeticoes);
    renderizarExercicio();
  });

  // Delegação: um listener na tabela cobre o checkbox de qualquer série.
  document.getElementById("corpo-tabela-series").addEventListener("change", function (event) {
    const linha = event.target.closest("[data-id-serie]");
    if (!linha) return;
    alternarSerieFeita(Number(linha.dataset.idSerie));
    renderizarExercicio();
  });

  // Remover série não pede confirmação: é barato de refazer com "Repetir última".
  document.getElementById("corpo-tabela-series").addEventListener("click", function (event) {
    if (!event.target.closest('[data-acao="remover-serie"]')) return;
    const linha = event.target.closest("[data-id-serie]");
    if (!linha) return;
    removerSerie(Number(linha.dataset.idSerie));
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

    // O formulário continua aberto e com os valores: registrar várias séries
    // seguidas é o caso comum. O foco vai para as repetições, o campo que mais varia.
    limparErroFormulario("erro-nova-serie");
    const campoReps = document.getElementById("input-repeticoes-serie");
    campoReps.focus();
    campoReps.select();
  });

  // --- Tela de cardio ---
  document.getElementById("btn-voltar-treino-cardio").addEventListener("click", function () {
    abrirTreino(estado.idTreinoAtual);
  });

  document.getElementById("btn-editar-meta").addEventListener("click", abrirFormularioMeta);

  // Cancelar numa meta que nunca foi salva descarta o cardio recém-criado.
  document.getElementById("btn-cancelar-meta").addEventListener("click", function () {
    const treino = buscarTreino(estado.idTreinoAtual);
    if (treino.cardio && treino.cardio.modalidade === "") {
      treino.cardio = null;
      abrirTreino(treino.id);
      return;
    }
    esconderFormularioMeta();
  });

  document.getElementById("form-meta").addEventListener("submit", function (event) {
    event.preventDefault();
    const modalidade = document.getElementById("input-modalidade").value;
    const metaTempo = document.getElementById("input-meta-tempo").value;
    const metaDistancia = document.getElementById("input-meta-distancia").value;

    const erro = validarCardio(modalidade, metaTempo, metaDistancia);
    if (erro) {
      mostrarErroFormulario("erro-meta", erro);
      return;
    }

    definirCardio(estado.idTreinoAtual, modalidade, numeroOuNulo(metaTempo), numeroOuNulo(metaDistancia));
    esconderFormularioMeta();
    renderizarCardio();
  });

  document.getElementById("btn-nova-sessao").addEventListener("click", abrirFormularioNovaSessao);

  document.getElementById("btn-cancelar-nova-sessao").addEventListener("click", esconderFormularioNovaSessao);

  document.getElementById("btn-repetir-sessao").addEventListener("click", function () {
    const cardio = buscarTreino(estado.idTreinoAtual).cardio;
    const anterior = ultimaSessao(cardio);
    if (!anterior) return;

    registrarSessaoCardio(estado.idTreinoAtual, anterior.minutos, anterior.km);
    renderizarCardio();
  });

  document.getElementById("corpo-tabela-sessoes").addEventListener("change", function (event) {
    const linha = event.target.closest("[data-id-sessao]");
    if (!linha) return;
    alternarSessaoFeita(estado.idTreinoAtual, Number(linha.dataset.idSessao));
    renderizarCardio();
  });

  document.getElementById("corpo-tabela-sessoes").addEventListener("click", function (event) {
    if (!event.target.closest('[data-acao="remover-sessao"]')) return;
    const linha = event.target.closest("[data-id-sessao]");
    if (!linha) return;
    removerSessaoCardio(estado.idTreinoAtual, Number(linha.dataset.idSessao));
    renderizarCardio();
  });

  document.getElementById("form-nova-sessao").addEventListener("submit", function (event) {
    event.preventDefault();
    const tempo = document.getElementById("input-tempo-sessao").value;
    const distancia = document.getElementById("input-distancia-sessao").value;

    const erro = validarSessaoCardio(tempo, distancia);
    if (erro) {
      mostrarErroFormulario("erro-nova-sessao", erro);
      return;
    }

    registrarSessaoCardio(estado.idTreinoAtual, numeroOuNulo(tempo), numeroOuNulo(distancia));
    renderizarCardio();

    // Mesmo padrão das séries: o formulário continua aberto para o próximo registro.
    limparErroFormulario("erro-nova-sessao");
    const campoTempo = document.getElementById("input-tempo-sessao");
    campoTempo.focus();
    campoTempo.select();
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
