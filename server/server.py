"""Servidor do GymLog: serve src/ e a API REST em /api (só biblioteca padrão).

Camadas, de fora para dentro:
  server.py       HTTP: leitura da requisição, erros e respostas JSON
  rotas.py        API: tabela de rotas; valida e chama o repositório (sem SQL)
  validacao.py    regras de validação dos corpos recebidos
  repositorio.py  todo o SQL: grava e consulta treinos (sem HTTP)
  banco.py        SQLite: criação do banco, conexões, transações e erros de persistência
  erros.py        erro padrão da API
"""

import json
import mimetypes
import os
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

import banco
from banco import BancoOcupado, ErroPersistencia, NaoEncontrado, ViolacaoDeRegra
from erros import ErroApi
from rotas import encontrar_rota

# No Windows, o Python lê os tipos do registro do sistema e pode servir .js como
# text/plain, o que impede o navegador de carregar módulos ES.
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("text/html", ".html")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/svg+xml", ".svg")

PASTA_SERVIDOR = Path(__file__).resolve().parent
PASTA_SRC = PASTA_SERVIDOR.parent / "src"
PORTA = int(os.environ.get("PORT", 3000))
ATRASO_SEGUNDOS = int(os.environ.get("MOCK_DELAY_MS", 600)) / 1000
TAMANHO_MAXIMO_CORPO = 100_000  # bytes; nenhuma operação legítima chega perto disso
METODOS_COM_CORPO = ("POST", "PUT", "PATCH")



class ManipuladorGymLog(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PASTA_SRC, **kwargs)

    def caminho(self):
        return urlsplit(self.path).path

    def eh_api(self):
        return self.caminho().split("/")[1] == "api"

    def do_GET(self):
        if self.eh_api():
            self.tratar_api()
        else:
            super().do_GET()

    def send_error(self, code, message=None, explain=None):
        # Método que nenhum do_* atende (OPTIONS, FOO...) gera um 501 da própria
        # biblioteca, em HTML. Na API, ele segue o formato de erro padrão.
        if code == 501 and self.eh_api():
            self.responder_json(501, {"error": f"O método {self.command} não é suportado pelo servidor."})
        else:
            super().send_error(code, message, explain)

    def ler_bytes_do_corpo(self):
        try:
            tamanho = int(self.headers.get("Content-Length", 0))
        except ValueError:
            raise ErroApi(400, "O cabeçalho Content-Length é inválido.") from None
        if tamanho > TAMANHO_MAXIMO_CORPO:
            raise ErroApi(413, f"O corpo da requisição passa do limite de {TAMANHO_MAXIMO_CORPO} bytes.")
        return self.rfile.read(max(tamanho, 0))

    def converter_json(self, conteudo):
        if self.headers.get_content_type() != "application/json":
            raise ErroApi(415, 'Envie o corpo em JSON, com o cabeçalho "Content-Type: application/json".')
        try:
            corpo = json.loads(conteudo.decode("utf-8"))
        except UnicodeDecodeError:  # comum no curl do Windows com acentos digitados no comando
            raise ErroApi(400, "O corpo da requisição deve estar codificado em UTF-8.") from None
        except ValueError:  # inclui JSON malformado e corpo vazio
            raise ErroApi(400, "O corpo da requisição não é um JSON válido.") from None
        if not isinstance(corpo, dict):
            raise ErroApi(400, "O corpo da requisição deve ser um objeto JSON.")
        return corpo

    def tratar_api(self):
        try:
            time.sleep(ATRASO_SEGUNDOS)
            # O corpo é lido antes de qualquer resposta: deixá-lo sem ler pode fazer o
            # Windows derrubar a conexão antes de o cliente receber o erro.
            conteudo = self.ler_bytes_do_corpo()
            funcao, parametros = encontrar_rota(self.command, self.caminho())
            corpo = self.converter_json(conteudo) if self.command in METODOS_COM_CORPO else None

            status, resposta, *cabecalhos = funcao(parametros, corpo)
        except ErroApi as erro:
            self.responder_json(erro.status, {"error": erro.mensagem}, erro.cabecalhos)
        except NaoEncontrado as erro:
            self.responder_json(404, {"error": str(erro)})
        # Erros de persistência: o detalhe técnico vai para o log do servidor, nunca para o cliente.
        except BancoOcupado as erro:
            self.log_error("Banco ocupado: %s", erro)
            self.responder_json(
                503, {"error": "O banco de dados está ocupado. Tente novamente em instantes."}, {"Retry-After": "1"}
            )
        except ViolacaoDeRegra as erro:
            self.log_error("Regra do banco violada: %s", erro)
            self.responder_json(409, {"error": "Os dados foram recusados por uma regra do banco de dados."})
        except ErroPersistencia as erro:
            self.log_error("Erro de persistência: %s", erro)
            self.responder_json(500, {"error": "Não foi possível acessar o banco de dados."})
        except Exception as erro:
            self.log_error("Erro inesperado: %r", erro)
            self.responder_json(500, {"error": "Erro interno do servidor."})
        else:
            self.responder_json(status, resposta, *cabecalhos)

    do_POST = do_PUT = do_PATCH = do_DELETE = tratar_api

    def responder_json(self, status, dados, cabecalhos=None):
        conteudo = b"" if dados is None else json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        if dados is not None:
            self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(conteudo)))
        for nome, valor in (cabecalhos or {}).items():
            self.send_header(nome, valor)
        self.end_headers()
        self.wfile.write(conteudo)


def main():
    if banco.criar_banco():
        print(f"Banco criado em {banco.caminho}, com os dados de exemplo.", flush=True)
    # A fila padrão de conexões tem só 5 posições; no Windows, o excedente é recusado.
    ThreadingHTTPServer.request_queue_size = 64
    # Só na interface local: este servidor de desenvolvimento não tem autenticação.
    with ThreadingHTTPServer(("127.0.0.1", PORTA), ManipuladorGymLog) as servidor:
        print(f"GymLog em http://localhost:{PORTA} | API em http://localhost:{PORTA}/api/workouts", flush=True)
        print(f"Banco de dados: {banco.caminho}", flush=True)
        print("Ctrl+C para encerrar", flush=True)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")


if __name__ == "__main__":
    main()
