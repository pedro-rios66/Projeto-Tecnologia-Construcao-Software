"""Serviço simulado do GymLog: serve src/ e uma API JSON em /api (só biblioteca padrão)."""

import json
import mimetypes
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

# No Windows, o Python lê os tipos do registro do sistema e pode servir .js como
# text/plain, o que impede o navegador de carregar módulos ES.
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("text/html", ".html")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/svg+xml", ".svg")

PASTA_SERVIDOR = Path(__file__).resolve().parent
PASTA_SRC = PASTA_SERVIDOR.parent / "src"
DB_PATH = Path(os.environ.get("DB_PATH", PASTA_SERVIDOR / "db.json"))
PORTA = int(os.environ.get("PORT", 3000))
ATRASO_SEGUNDOS = int(os.environ.get("MOCK_DELAY_MS", 600)) / 1000

# As requisições rodam em threads paralelas. Sem a trava, duas gravações simultâneas
# poderiam ler o mesmo arquivo e a última sobrescreveria o trabalho da primeira.
trava_db = threading.Lock()


class ErroApi(Exception):
    def __init__(self, status, mensagem):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem


# --- Validação: mesmas regras e mensagens de src/js/validation.js ---


def exigir_texto(corpo, campo, mensagem):
    valor = corpo.get(campo)
    if not isinstance(valor, str) or not valor.strip():
        raise ErroApi(400, mensagem)
    return valor.strip()


def eh_positivo(valor):
    # A comparação dupla também recusa NaN e Infinity, que json.loads aceita.
    return type(valor) in (int, float) and 0 < valor < float("inf")


def numero_opcional(corpo, campo, nome_exibido):
    valor = corpo.get(campo)
    if valor is not None and not eh_positivo(valor):
        raise ErroApi(400, f"{nome_exibido} deve ser um número maior que zero.")
    return valor


def validar_treino(corpo):
    nome = exigir_texto(corpo, "nome", "O nome do treino não pode estar vazio.")
    descricao = corpo.get("descricao", "")
    if not isinstance(descricao, str):
        raise ErroApi(400, "A descrição deve ser um texto.")

    dias = corpo.get("dias")
    if not isinstance(dias, list) or not dias:
        raise ErroApi(400, "Selecione pelo menos um dia da semana.")
    if any(type(dia) is not int or not 0 <= dia <= 6 for dia in dias):
        raise ErroApi(400, "Os dias da semana devem ser números de 0 a 6.")

    return {"nome": nome, "descricao": descricao.strip(), "dias": sorted(set(dias))}


def validar_serie(corpo):
    peso, repeticoes = corpo.get("peso"), corpo.get("repeticoes")
    if not eh_positivo(peso):
        raise ErroApi(400, "O peso deve ser um número maior que zero.")
    if type(repeticoes) is not int or repeticoes <= 0:
        raise ErroApi(400, "As repetições devem ser um número inteiro maior que zero.")
    return {"peso": peso, "repeticoes": repeticoes}


def validar_cardio(corpo):
    modalidade = exigir_texto(corpo, "modalidade", "A modalidade não pode estar vazia.")
    if corpo.get("metaMinutos") is None and corpo.get("metaKm") is None:
        raise ErroApi(400, "Defina uma meta de tempo, de distância, ou as duas.")
    return {
        "modalidade": modalidade,
        "metaMinutos": numero_opcional(corpo, "metaMinutos", "A meta de tempo"),
        "metaKm": numero_opcional(corpo, "metaKm", "A meta de distância"),
    }


def validar_sessao(corpo):
    if corpo.get("minutos") is None and corpo.get("km") is None:
        raise ErroApi(400, "Informe o tempo, a distância, ou os dois.")
    return {
        "minutos": numero_opcional(corpo, "minutos", "O tempo"),
        "km": numero_opcional(corpo, "km", "A distância"),
    }


def exigir_feita(corpo):
    if not isinstance(corpo.get("feita"), bool):
        raise ErroApi(400, 'O campo "feita" deve ser verdadeiro ou falso.')
    return corpo["feita"]


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


def buscar_sessoes(treino):
    if treino["cardio"] is None:
        raise ErroApi(404, "Este treino ainda não tem cardio definido.")
    return treino["cardio"]["sessoes"]


# --- Rotas ---


def rotear(metodo, partes, corpo, db):
    """Executa a rota e devolve (status, resposta)."""
    match (metodo, partes):
        case ("GET", ["api", "workouts"]):
            return 200, db["treinos"]
        case ("POST", ["api", "workouts"]):
            treino = {"id": novo_id(db), **validar_treino(corpo), "exercicios": [], "cardio": None}
            db["treinos"].append(treino)
            return 201, treino
        case (_, ["api", "workouts", id_treino, *resto]):
            treino = buscar(db["treinos"], id_treino, "Treino")
            return alterar_treino(metodo, treino, resto, corpo, db), treino
    raise ErroApi(404, "Rota não encontrada.")


def alterar_treino(metodo, treino, resto, corpo, db):
    """Aplica a operação e devolve o status. A resposta é sempre o treino atualizado."""
    match (metodo, resto):
        case ("GET", []):
            return 200

        case ("POST", ["exercises"]):
            nome = exigir_texto(corpo, "nome", "O nome do exercício não pode estar vazio.")
            treino["exercicios"].append({"id": novo_id(db), "nome": nome, "series": []})
            return 201
        case ("DELETE", ["exercises", id_exercicio]):
            treino["exercicios"].remove(buscar(treino["exercicios"], id_exercicio, "Exercício"))
            return 200

        case ("POST", ["exercises", id_exercicio, "sets"]):
            series = buscar(treino["exercicios"], id_exercicio, "Exercício")["series"]
            series.append(
                {"id": novo_id(db), "numero": len(series) + 1, **validar_serie(corpo), "feita": False}
            )
            return 201
        case ("PATCH", ["exercises", id_exercicio, "sets", id_serie]):
            series = buscar(treino["exercicios"], id_exercicio, "Exercício")["series"]
            buscar(series, id_serie, "Série")["feita"] = exigir_feita(corpo)
            return 200
        case ("DELETE", ["exercises", id_exercicio, "sets", id_serie]):
            series = buscar(treino["exercicios"], id_exercicio, "Exercício")["series"]
            series.remove(buscar(series, id_serie, "Série"))
            for numero, serie in enumerate(series, start=1):  # não deixa buracos na numeração
                serie["numero"] = numero
            return 200

        case ("PUT", ["cardio"]):
            sessoes = treino["cardio"]["sessoes"] if treino["cardio"] else []
            treino["cardio"] = {**validar_cardio(corpo), "sessoes": sessoes}
            return 200
        case ("POST", ["cardio", "sessions"]):
            buscar_sessoes(treino).append({"id": novo_id(db), **validar_sessao(corpo), "feita": False})
            return 201
        case ("PATCH", ["cardio", "sessions", id_sessao]):
            buscar(buscar_sessoes(treino), id_sessao, "Sessão")["feita"] = exigir_feita(corpo)
            return 200
        case ("DELETE", ["cardio", "sessions", id_sessao]):
            sessoes = buscar_sessoes(treino)
            sessoes.remove(buscar(sessoes, id_sessao, "Sessão"))
            return 200

    raise ErroApi(404, "Rota não encontrada.")


# --- HTTP ---


class ManipuladorGymLog(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PASTA_SRC, **kwargs)

    def partes_do_caminho(self):
        return urlsplit(self.path).path.strip("/").split("/")

    def do_GET(self):
        if self.partes_do_caminho()[0] == "api":
            self.tratar_api()
        else:
            super().do_GET()

    def ler_corpo(self):
        try:
            tamanho = int(self.headers.get("Content-Length", 0))
            corpo = json.loads(self.rfile.read(tamanho))
        except ValueError:  # inclui JSON malformado e bytes que não são UTF-8
            raise ErroApi(400, "O corpo da requisição não é um JSON válido.") from None
        if not isinstance(corpo, dict):
            raise ErroApi(400, "O corpo da requisição deve ser um objeto JSON.")
        return corpo

    def tratar_api(self):
        try:
            time.sleep(ATRASO_SEGUNDOS)
            corpo = self.ler_corpo() if self.command in ("POST", "PUT", "PATCH") else None
            with trava_db:
                db = json.loads(DB_PATH.read_text("utf-8"))
                status, resposta = rotear(self.command, self.partes_do_caminho(), corpo, db)
                if self.command != "GET":
                    DB_PATH.write_text(json.dumps(db, ensure_ascii=False, indent=2), "utf-8")
        except ErroApi as erro:
            self.responder_json(erro.status, {"error": erro.mensagem})
        except Exception as erro:
            self.log_error("Erro inesperado: %r", erro)
            self.responder_json(500, {"error": "Erro interno do servidor."})
        else:
            self.responder_json(status, resposta)

    do_POST = do_PUT = do_PATCH = do_DELETE = tratar_api

    def responder_json(self, status, dados):
        conteudo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(conteudo)))
        self.end_headers()
        self.wfile.write(conteudo)


def main():
    # A fila padrão de conexões tem só 5 posições; no Windows, o excedente é recusado.
    ThreadingHTTPServer.request_queue_size = 64
    # Só na interface local: este servidor de desenvolvimento não tem autenticação.
    with ThreadingHTTPServer(("127.0.0.1", PORTA), ManipuladorGymLog) as servidor:
        print(f"GymLog em http://localhost:{PORTA} (Ctrl+C para encerrar)", flush=True)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")


if __name__ == "__main__":
    main()
