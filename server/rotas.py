"""Rotas da API: a tabela ROTAS (no fim do arquivo) e as funções que atendem cada uma.

Toda função de rota recebe (db, parametros, corpo) e devolve (status, resposta) ou
(status, resposta, cabecalhos). O recurso principal é o treino; exercícios, séries e
cardio são sub-recursos dele, e as escritas neles devolvem o treino inteiro atualizado.
"""

from erros import ErroApi
from validacao import (
    validar_cardio,
    validar_exercicio,
    validar_feita,
    validar_serie,
    validar_sessao,
    validar_treino,
)


# --- Acesso aos dados ---


def novo_id(db):
    db["proximoId"] += 1
    return db["proximoId"] - 1


def buscar(lista, id_texto, rotulo):
    # Compara como texto: um id não numérico na URL vira 404, não exceção.
    item = next((item for item in lista if str(item["id"]) == id_texto), None)
    if item is None:
        raise ErroApi(404, f"{rotulo} não encontrado.")
    return item


def buscar_treino(db, parametros):
    return buscar(db["treinos"], parametros["id"], "Treino")


def buscar_series(treino, parametros):
    return buscar(treino["exercicios"], parametros["idExercicio"], "Exercício")["series"]


def buscar_sessoes(treino):
    if treino["cardio"] is None:
        raise ErroApi(404, "Este treino ainda não tem cardio definido.")
    return treino["cardio"]["sessoes"]


# --- Treinos (recurso principal) ---


def listar_treinos(db, parametros, corpo):
    return 200, db["treinos"]


def obter_treino(db, parametros, corpo):
    return 200, buscar_treino(db, parametros)


def criar_treino(db, parametros, corpo):
    treino = {"id": novo_id(db), **validar_treino(corpo), "exercicios": [], "cardio": None}
    db["treinos"].append(treino)
    return 201, treino, {"Location": f"/api/workouts/{treino['id']}"}


def atualizar_treino(db, parametros, corpo):
    # Substitui os dados do treino; exercícios e cardio são sub-recursos e não mudam.
    treino = buscar_treino(db, parametros)
    treino.update(validar_treino(corpo))
    return 200, treino


def excluir_treino(db, parametros, corpo):
    db["treinos"].remove(buscar_treino(db, parametros))
    return 204, None


# --- Exercícios ---


def adicionar_exercicio(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    treino["exercicios"].append({"id": novo_id(db), **validar_exercicio(corpo), "series": []})
    return 201, treino


def remover_exercicio(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    treino["exercicios"].remove(buscar(treino["exercicios"], parametros["idExercicio"], "Exercício"))
    return 200, treino


# --- Séries ---


def adicionar_serie(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    series = buscar_series(treino, parametros)
    series.append({"id": novo_id(db), "numero": len(series) + 1, **validar_serie(corpo), "feita": False})
    return 201, treino


def marcar_serie(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    serie = buscar(buscar_series(treino, parametros), parametros["idSerie"], "Série")
    serie["feita"] = validar_feita(corpo)
    return 200, treino


def remover_serie(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    series = buscar_series(treino, parametros)
    series.remove(buscar(series, parametros["idSerie"], "Série"))
    for numero, serie in enumerate(series, start=1):  # não deixa buracos na numeração
        serie["numero"] = numero
    return 200, treino


# --- Cardio ---


def salvar_cardio(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    sessoes = treino["cardio"]["sessoes"] if treino["cardio"] else []
    treino["cardio"] = {**validar_cardio(corpo), "sessoes": sessoes}
    return 200, treino


def adicionar_sessao(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    buscar_sessoes(treino).append({"id": novo_id(db), **validar_sessao(corpo), "feita": False})
    return 201, treino


def marcar_sessao(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    sessao = buscar(buscar_sessoes(treino), parametros["idSessao"], "Sessão")
    sessao["feita"] = validar_feita(corpo)
    return 200, treino


def remover_sessao(db, parametros, corpo):
    treino = buscar_treino(db, parametros)
    sessoes = buscar_sessoes(treino)
    sessoes.remove(buscar(sessoes, parametros["idSessao"], "Sessão"))
    return 200, treino


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


def encontrar_rota(metodo, caminho):
    """Devolve (função, parâmetros). Caminho desconhecido é 404; método não aceito, 405."""
    for modelo, metodos in ROTAS.items():
        parametros = comparar_caminho(modelo, caminho)
        if parametros is None:
            continue
        if metodo not in metodos:
            raise ErroApi(405, f"O método {metodo} não é aceito nesta rota.", {"Allow": ", ".join(metodos)})
        return metodos[metodo], parametros
    raise ErroApi(404, "Rota não encontrada.")
