"""Rotas da API: a tabela ROTAS (no fim do arquivo) e as funções que atendem cada uma.

Cada função valida o corpo (validacao.py) e chama o repositório (repositorio.py), sem
nenhum SQL. Recebe (parametros, corpo) e devolve (status, resposta) ou
(status, resposta, cabecalhos). O recurso principal é o treino; exercícios, séries e
cardio são sub-recursos dele, e as escritas neles devolvem o treino inteiro atualizado.
"""

import repositorio
from erros import ErroApi
from validacao import (
    validar_cardio,
    validar_exercicio,
    validar_feita,
    validar_serie,
    validar_sessao,
    validar_treino,
)


# --- Treinos (recurso principal) ---


def listar_treinos(parametros, corpo):
    return 200, repositorio.listar_treinos()


def obter_treino(parametros, corpo):
    return 200, repositorio.obter_treino(parametros["id"])


def criar_treino(parametros, corpo):
    treino = repositorio.criar_treino(validar_treino(corpo))
    return 201, treino, {"Location": f"/api/workouts/{treino['id']}"}


def atualizar_treino(parametros, corpo):
    # Substitui os dados do treino; exercícios e cardio são sub-recursos e não mudam.
    return 200, repositorio.atualizar_treino(parametros["id"], validar_treino(corpo))


def excluir_treino(parametros, corpo):
    repositorio.excluir_treino(parametros["id"])
    return 204, None


# --- Exercícios e séries ---


def adicionar_exercicio(parametros, corpo):
    return 201, repositorio.adicionar_exercicio(parametros["id"], validar_exercicio(corpo))


def remover_exercicio(parametros, corpo):
    return 200, repositorio.remover_exercicio(parametros["id"], parametros["idExercicio"])


def adicionar_serie(parametros, corpo):
    return 201, repositorio.adicionar_serie(parametros["id"], parametros["idExercicio"], validar_serie(corpo))


def marcar_serie(parametros, corpo):
    return 200, repositorio.marcar_serie(
        parametros["id"], parametros["idExercicio"], parametros["idSerie"], validar_feita(corpo)
    )


def remover_serie(parametros, corpo):
    return 200, repositorio.remover_serie(parametros["id"], parametros["idExercicio"], parametros["idSerie"])


# --- Cardio ---


def salvar_cardio(parametros, corpo):
    return 200, repositorio.salvar_cardio(parametros["id"], validar_cardio(corpo))


def adicionar_sessao(parametros, corpo):
    return 201, repositorio.adicionar_sessao(parametros["id"], validar_sessao(corpo))


def marcar_sessao(parametros, corpo):
    return 200, repositorio.marcar_sessao(parametros["id"], parametros["idSessao"], validar_feita(corpo))


def remover_sessao(parametros, corpo):
    return 200, repositorio.remover_sessao(parametros["id"], parametros["idSessao"])


# --- Tabela de rotas ---

# Cada caminho lista os métodos que aceita. Trechos entre chaves são parâmetros.
ROTAS = {
    "/api/workouts": {"GET": listar_treinos, "POST": criar_treino},
    "/api/workouts/{id}": {"GET": obter_treino, "PUT": atualizar_treino, "DELETE": excluir_treino},
    "/api/workouts/{id}/exercises": {"POST": adicionar_exercicio},
    "/api/workouts/{id}/exercises/{idExercicio}": {"DELETE": remover_exercicio},
    "/api/workouts/{id}/exercises/{idExercicio}/sets": {"POST": adicionar_serie},
    "/api/workouts/{id}/exercises/{idExercicio}/sets/{idSerie}": {
        "PATCH": marcar_serie,
        "DELETE": remover_serie,
    },
    "/api/workouts/{id}/cardio": {"PUT": salvar_cardio},
    "/api/workouts/{id}/cardio/sessions": {"POST": adicionar_sessao},
    "/api/workouts/{id}/cardio/sessions/{idSessao}": {"PATCH": marcar_sessao, "DELETE": remover_sessao},
}

# Todo parâmetro de rota é um id; um id que não é número não existe.
MENSAGEM_ID_INEXISTENTE = {
    "id": "Treino não encontrado.",
    "idExercicio": "Exercício não encontrado.",
    "idSerie": "Série não encontrada.",
    "idSessao": "Sessão não encontrada.",
}


def comparar_caminho(modelo, caminho):
    """Compara o caminho com o modelo, parte a parte; devolve os parâmetros ou None."""
    partes_modelo = modelo.strip("/").split("/")
    partes = caminho.strip("/").split("/")
    if len(partes_modelo) != len(partes):
        return None

    parametros = {}
    for esperado, recebido in zip(partes_modelo, partes):
        if esperado.startswith("{"):
            parametros[esperado[1:-1]] = recebido
        elif esperado != recebido:
            return None
    return parametros


def converter_ids(parametros):
    for nome, valor in parametros.items():
        if not (valor.isascii() and valor.isdigit()):
            raise ErroApi(404, MENSAGEM_ID_INEXISTENTE[nome])
    return {nome: int(valor) for nome, valor in parametros.items()}


def encontrar_rota(metodo, caminho):
    """Devolve (função, parâmetros). Caminho desconhecido é 404; método não aceito, 405."""
    for modelo, metodos in ROTAS.items():
        parametros = comparar_caminho(modelo, caminho)
        if parametros is None:
            continue
        if metodo not in metodos:
            raise ErroApi(405, f"O método {metodo} não é aceito nesta rota.", {"Allow": ", ".join(metodos)})
        return metodos[metodo], converter_ids(parametros)
    raise ErroApi(404, "Rota não encontrada.")
