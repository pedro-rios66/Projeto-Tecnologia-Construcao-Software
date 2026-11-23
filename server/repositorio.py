"""Repositório: a única camada que conhece o SQL.

Recebe dados já validados e devolve dicionários prontos para virar JSON. Não sabe nada
de HTTP: um registro inexistente vira NaoEncontrado, e a API decide como responder.
Cada função é uma transação: ou a operação inteira é gravada, ou nada é.
"""

from banco import NaoEncontrado, transacao


# --- Leitura ---


def _carregar_treinos(conexao, id_treino=None):
    """Monta os treinos completos com uma consulta por tabela, e não uma por treino.

    Os trechos de SQL montados aqui são fixos; o id entra sempre como parâmetro (?).
    """
    parametros = () if id_treino is None else (id_treino,)

    def filtro(coluna):
        return "" if id_treino is None else f"WHERE {coluna} = ?"

    treinos = {}
    for linha in conexao.execute(
        f"SELECT id, nome, descricao FROM treinos {filtro('id')} ORDER BY id", parametros
    ):
        treinos[linha["id"]] = {
            "id": linha["id"],
            "nome": linha["nome"],
            "descricao": linha["descricao"],
            "dias": [],
            "exercicios": [],
            "cardio": None,
        }

    for linha in conexao.execute(
        f"SELECT treino_id, dia FROM treino_dias {filtro('treino_id')} ORDER BY dia", parametros
    ):
        treinos[linha["treino_id"]]["dias"].append(linha["dia"])

    exercicios = {}
    for linha in conexao.execute(
        f"SELECT id, treino_id, nome FROM exercicios {filtro('treino_id')} ORDER BY id", parametros
    ):
        exercicios[linha["id"]] = {"id": linha["id"], "nome": linha["nome"], "series": []}
        treinos[linha["treino_id"]]["exercicios"].append(exercicios[linha["id"]])

    # O número da série é a posição dela no exercício: calculado aqui, nunca guardado.
    for linha in conexao.execute(
        f"""SELECT s.id, s.exercicio_id, s.peso, s.repeticoes, s.feita,
                   ROW_NUMBER() OVER (PARTITION BY s.exercicio_id ORDER BY s.id) AS numero
              FROM series s JOIN exercicios e ON e.id = s.exercicio_id
              {filtro('e.treino_id')} ORDER BY s.id""",
        parametros,
    ):
        exercicios[linha["exercicio_id"]]["series"].append({
            "id": linha["id"],
            "numero": linha["numero"],
            "peso": linha["peso"],
            "repeticoes": linha["repeticoes"],
            "feita": bool(linha["feita"]),
        })

    for linha in conexao.execute(
        f"SELECT treino_id, modalidade, meta_minutos, meta_km FROM cardios {filtro('treino_id')}",
        parametros,
    ):
        treinos[linha["treino_id"]]["cardio"] = {
            "modalidade": linha["modalidade"],
            "metaMinutos": linha["meta_minutos"],
            "metaKm": linha["meta_km"],
            "sessoes": [],
        }

    for linha in conexao.execute(
        f"SELECT id, treino_id, minutos, km, feita FROM sessoes_cardio {filtro('treino_id')} ORDER BY id",
        parametros,
    ):
        treinos[linha["treino_id"]]["cardio"]["sessoes"].append({
            "id": linha["id"],
            "minutos": linha["minutos"],
            "km": linha["km"],
            "feita": bool(linha["feita"]),
        })

    return list(treinos.values())


def _carregar_treino(conexao, id_treino):
    treinos = _carregar_treinos(conexao, id_treino)
    if not treinos:
        raise NaoEncontrado("Treino não encontrado.")
    return treinos[0]


# --- Verificações usadas pelas escritas ---


def _exigir(conexao, sql, parametros, mensagem):
    if conexao.execute(sql, parametros).fetchone() is None:
        raise NaoEncontrado(mensagem)


def _exigir_treino(conexao, id_treino):
    _exigir(conexao, "SELECT 1 FROM treinos WHERE id = ?", (id_treino,), "Treino não encontrado.")


def _exigir_exercicio(conexao, id_treino, id_exercicio):
    _exigir_treino(conexao, id_treino)
    _exigir(
        conexao,
        "SELECT 1 FROM exercicios WHERE id = ? AND treino_id = ?",
        (id_exercicio, id_treino),
        "Exercício não encontrado.",
    )


def _exigir_cardio(conexao, id_treino):
    _exigir_treino(conexao, id_treino)
    _exigir(
        conexao,
        "SELECT 1 FROM cardios WHERE treino_id = ?",
        (id_treino,),
        "Este treino ainda não tem cardio definido.",
    )


def _alterar(conexao, sql, parametros, mensagem):
    """Executa um UPDATE ou DELETE; se nenhuma linha foi atingida, o registro não existe."""
    if conexao.execute(sql, parametros).rowcount == 0:
        raise NaoEncontrado(mensagem)


def _gravar_dias(conexao, id_treino, dias):
    conexao.execute("DELETE FROM treino_dias WHERE treino_id = ?", (id_treino,))
    conexao.executemany(
        "INSERT INTO treino_dias (treino_id, dia) VALUES (?, ?)", [(id_treino, dia) for dia in dias]
    )


# --- Treinos ---


def listar_treinos():
    with transacao() as conexao:
        return _carregar_treinos(conexao)


def obter_treino(id_treino):
    with transacao() as conexao:
        return _carregar_treino(conexao, id_treino)


def criar_treino(dados):
    with transacao() as conexao:
        cursor = conexao.execute(
            "INSERT INTO treinos (nome, descricao) VALUES (?, ?)", (dados["nome"], dados["descricao"])
        )
        _gravar_dias(conexao, cursor.lastrowid, dados["dias"])
        return _carregar_treino(conexao, cursor.lastrowid)


def atualizar_treino(id_treino, dados):
    with transacao() as conexao:
        _alterar(
            conexao,
            "UPDATE treinos SET nome = ?, descricao = ? WHERE id = ?",
            (dados["nome"], dados["descricao"], id_treino),
            "Treino não encontrado.",
        )
        _gravar_dias(conexao, id_treino, dados["dias"])
        return _carregar_treino(conexao, id_treino)


def excluir_treino(id_treino):
    # ON DELETE CASCADE apaga junto dias, exercícios, séries, cardio e sessões.
    with transacao() as conexao:
        _alterar(conexao, "DELETE FROM treinos WHERE id = ?", (id_treino,), "Treino não encontrado.")


# --- Exercícios e séries ---


def adicionar_exercicio(id_treino, dados):
    with transacao() as conexao:
        _exigir_treino(conexao, id_treino)
        conexao.execute("INSERT INTO exercicios (treino_id, nome) VALUES (?, ?)", (id_treino, dados["nome"]))
        return _carregar_treino(conexao, id_treino)


def remover_exercicio(id_treino, id_exercicio):
    with transacao() as conexao:
        _exigir_treino(conexao, id_treino)
        _alterar(
            conexao,
            "DELETE FROM exercicios WHERE id = ? AND treino_id = ?",
            (id_exercicio, id_treino),
            "Exercício não encontrado.",
        )
        return _carregar_treino(conexao, id_treino)


def adicionar_serie(id_treino, id_exercicio, dados):
    with transacao() as conexao:
        _exigir_exercicio(conexao, id_treino, id_exercicio)
        conexao.execute(
            "INSERT INTO series (exercicio_id, peso, repeticoes) VALUES (?, ?, ?)",
            (id_exercicio, dados["peso"], dados["repeticoes"]),
        )
        return _carregar_treino(conexao, id_treino)


def marcar_serie(id_treino, id_exercicio, id_serie, feita):
    with transacao() as conexao:
        _exigir_exercicio(conexao, id_treino, id_exercicio)
        _alterar(
            conexao,
            "UPDATE series SET feita = ? WHERE id = ? AND exercicio_id = ?",
            (int(feita), id_serie, id_exercicio),
            "Série não encontrada.",
        )
        return _carregar_treino(conexao, id_treino)


def remover_serie(id_treino, id_exercicio, id_serie):
    with transacao() as conexao:
        _exigir_exercicio(conexao, id_treino, id_exercicio)
        _alterar(
            conexao,
            "DELETE FROM series WHERE id = ? AND exercicio_id = ?",
            (id_serie, id_exercicio),
            "Série não encontrada.",
        )
        return _carregar_treino(conexao, id_treino)


# --- Cardio ---


def salvar_cardio(id_treino, dados):
    with transacao() as conexao:
        _exigir_treino(conexao, id_treino)
        # Cria ou atualiza no mesmo comando. INSERT OR REPLACE não serviria: ele apaga a
        # linha antiga, e o ON DELETE CASCADE levaria junto as sessões já registradas.
        conexao.execute(
            """INSERT INTO cardios (treino_id, modalidade, meta_minutos, meta_km) VALUES (?, ?, ?, ?)
               ON CONFLICT (treino_id) DO UPDATE SET
                   modalidade = excluded.modalidade,
                   meta_minutos = excluded.meta_minutos,
                   meta_km = excluded.meta_km""",
            (id_treino, dados["modalidade"], dados["metaMinutos"], dados["metaKm"]),
        )
        return _carregar_treino(conexao, id_treino)


def adicionar_sessao(id_treino, dados):
    with transacao() as conexao:
        _exigir_cardio(conexao, id_treino)
        conexao.execute(
            "INSERT INTO sessoes_cardio (treino_id, minutos, km) VALUES (?, ?, ?)",
            (id_treino, dados["minutos"], dados["km"]),
        )
        return _carregar_treino(conexao, id_treino)


def marcar_sessao(id_treino, id_sessao, feita):
    with transacao() as conexao:
        _exigir_cardio(conexao, id_treino)
        _alterar(
            conexao,
            "UPDATE sessoes_cardio SET feita = ? WHERE id = ? AND treino_id = ?",
            (int(feita), id_sessao, id_treino),
            "Sessão não encontrada.",
        )
        return _carregar_treino(conexao, id_treino)


def remover_sessao(id_treino, id_sessao):
    with transacao() as conexao:
        _exigir_cardio(conexao, id_treino)
        _alterar(
            conexao,
            "DELETE FROM sessoes_cardio WHERE id = ? AND treino_id = ?",
            (id_sessao, id_treino),
            "Sessão não encontrada.",
        )
        return _carregar_treino(conexao, id_treino)
