"""Banco de dados SQLite: criação, conexões, transações e erros de persistência.

Uso direto, a partir da raiz do projeto:
  python server/banco.py             cria o banco, se ele ainda não existir
  python server/banco.py --recriar   apaga o banco e o cria de novo com os dados de exemplo
"""

import os
import sqlite3
import sys
from contextlib import closing, contextmanager
from pathlib import Path

PASTA_SERVIDOR = Path(__file__).resolve().parent
caminho = Path(os.environ.get("DB_PATH", PASTA_SERVIDOR / "gymlog.db")).resolve()
TEMPO_DE_ESPERA_SEGUNDOS = 5  # quanto esperar se outra conexão estiver gravando


class ErroPersistencia(Exception):
    """Falha ao ler ou gravar no banco (arquivo ausente, corrompido, sem permissão...)."""


class BancoOcupado(ErroPersistencia):
    """Outra gravação segurou o banco por mais tempo que a espera permitida."""


class ViolacaoDeRegra(ErroPersistencia):
    """Uma restrição do banco (CHECK, FOREIGN KEY, NOT NULL) recusou os dados."""


class NaoEncontrado(Exception):
    """O registro pedido não existe."""


@contextmanager
def transacao():
    """Abre uma conexão para uma operação: confirma tudo ao final ou desfaz tudo se algo falhar.

    Os erros do sqlite3 são convertidos nas exceções acima, para que as outras camadas
    não dependam do banco usado.
    """
    conexao = None
    try:
        # mode=rw: se o arquivo não existir, falha em vez de criar um banco vazio.
        conexao = sqlite3.connect(f"{caminho.as_uri()}?mode=rw", uri=True, timeout=TEMPO_DE_ESPERA_SEGUNDOS)
        conexao.row_factory = sqlite3.Row
        conexao.execute("PRAGMA foreign_keys = ON")  # no SQLite, vêm desligadas por padrão
        with conexao:  # commit ao sair normalmente; rollback se houver exceção
            yield conexao
    except sqlite3.IntegrityError as erro:
        raise ViolacaoDeRegra(str(erro)) from erro
    except sqlite3.OperationalError as erro:
        if "locked" in str(erro) or "busy" in str(erro):
            raise BancoOcupado(str(erro)) from erro
        raise ErroPersistencia(str(erro)) from erro
    except sqlite3.Error as erro:
        raise ErroPersistencia(str(erro)) from erro
    finally:
        if conexao is not None:
            conexao.close()


def criar_banco(recriar=False):
    """Cria o banco com as tabelas e os dados de exemplo. Devolve False se ele já existia."""
    if caminho.exists() and not recriar:
        return False

    caminho.unlink(missing_ok=True)
    script = (PASTA_SERVIDOR / "schema.sql").read_text("utf-8") + (
        PASTA_SERVIDOR / "dados_exemplo.sql"
    ).read_text("utf-8")
    try:
        with closing(sqlite3.connect(caminho)) as conexao:
            conexao.executescript(script)
    except BaseException:
        caminho.unlink(missing_ok=True)  # não deixa um banco criado pela metade
        raise
    return True


if __name__ == "__main__":
    if criar_banco(recriar="--recriar" in sys.argv):
        print(f"Banco criado em {caminho}, com os dados de exemplo.")
    else:
        print(f"O banco já existe em {caminho}. Use --recriar para apagá-lo e criá-lo de novo.")
