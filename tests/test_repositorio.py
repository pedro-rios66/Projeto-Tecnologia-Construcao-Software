"""Testes do repositório e do banco (Etapa 07), sem HTTP: chamam o repositório direto.

Execução (o npm test também roda este arquivo):
    python -m unittest discover -s tests -p "test_*.py"
"""

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "server"))

import banco  # noqa: E402
import repositorio  # noqa: E402
from banco import BancoOcupado, ErroPersistencia, NaoEncontrado, ViolacaoDeRegra  # noqa: E402

TREINO = {"nome": "Teste", "descricao": "", "dias": [0, 2]}


class TestRepositorio(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        banco.caminho = Path(self.pasta.name) / "gymlog.db"
        banco.criar_banco()

    def tearDown(self):
        self.pasta.cleanup()

    def contar(self, tabela):
        with banco.transacao() as conexao:
            return conexao.execute(f"SELECT COUNT(*) FROM {tabela}").fetchone()[0]

    # --- Criação do banco ---

    def test_banco_criado_com_os_dados_de_exemplo(self):
        nomes = [treino["nome"] for treino in repositorio.listar_treinos()]
        self.assertEqual(nomes, ["Treino A", "Treino B", "Treino C"])
        self.assertEqual(self.contar("series"), 12)
        self.assertFalse(banco.criar_banco(), "não deve sobrescrever um banco existente")

    def test_treino_montado_a_partir_das_tabelas(self):
        treino = repositorio.obter_treino(1)
        self.assertEqual(treino["dias"], [0, 4])
        self.assertEqual([s["numero"] for s in treino["exercicios"][0]["series"]], [1, 2, 3])
        self.assertEqual(treino["exercicios"][0]["series"][0]["peso"], 60)
        self.assertIs(treino["cardio"]["sessoes"][0]["feita"], True)
        self.assertEqual(treino["cardio"]["sessoes"][0]["km"], 1.8)

    # --- CRUD ---

    def test_crud_do_treino(self):
        criado = repositorio.criar_treino(TREINO)
        self.assertEqual(repositorio.obter_treino(criado["id"])["dias"], [0, 2])

        alterado = repositorio.atualizar_treino(criado["id"], {"nome": "Novo", "descricao": "x", "dias": [5]})
        self.assertEqual((alterado["nome"], alterado["dias"]), ("Novo", [5]))

        repositorio.excluir_treino(criado["id"])
        with self.assertRaisesRegex(NaoEncontrado, "Treino não encontrado."):
            repositorio.obter_treino(criado["id"])

    def test_numero_da_serie_acompanha_a_remocao(self):
        repositorio.remover_serie(1, 1, 2)
        series = repositorio.obter_treino(1)["exercicios"][0]["series"]
        self.assertEqual([(s["id"], s["numero"]) for s in series], [(1, 1), (3, 2)])

    def test_registro_de_outro_treino_nao_e_encontrado(self):
        # O exercício 4 existe, mas pertence ao treino 2.
        with self.assertRaisesRegex(NaoEncontrado, "Exercício não encontrado."):
            repositorio.adicionar_serie(1, 4, {"peso": 10, "repeticoes": 10})
        with self.assertRaisesRegex(NaoEncontrado, "Série não encontrada."):
            repositorio.marcar_serie(1, 1, 999, True)
        with self.assertRaisesRegex(NaoEncontrado, "Este treino ainda não tem cardio definido."):
            repositorio.adicionar_sessao(3, {"minutos": 5, "km": None})

    def test_id_de_registro_excluido_nao_e_reaproveitado(self):
        criado = repositorio.criar_treino(TREINO)
        repositorio.excluir_treino(criado["id"])
        self.assertGreater(repositorio.criar_treino(TREINO)["id"], criado["id"])

    # --- Relacionamentos ---

    def test_excluir_treino_apaga_em_cascata(self):
        antes = {tabela: self.contar(tabela) for tabela in ("treino_dias", "exercicios", "series", "cardios", "sessoes_cardio")}
        repositorio.excluir_treino(1)  # 2 dias, 3 exercícios, 5 séries, 1 cardio, 2 sessões
        depois = {tabela: self.contar(tabela) for tabela in antes}
        removidos = {tabela: antes[tabela] - depois[tabela] for tabela in antes}
        self.assertEqual(
            removidos, {"treino_dias": 2, "exercicios": 3, "series": 5, "cardios": 1, "sessoes_cardio": 2}
        )

    def test_alterar_meta_do_cardio_preserva_as_sessoes(self):
        treino = repositorio.salvar_cardio(1, {"modalidade": "Esteira", "metaMinutos": 45, "metaKm": None})
        self.assertEqual(treino["cardio"]["metaMinutos"], 45)
        self.assertEqual(len(treino["cardio"]["sessoes"]), 2)

    # --- Validação no próprio banco ---

    def test_banco_recusa_dado_invalido_que_escape_da_validacao(self):
        casos = [
            lambda: repositorio.adicionar_serie(1, 1, {"peso": -5, "repeticoes": 10}),
            lambda: repositorio.adicionar_serie(1, 1, {"peso": 10, "repeticoes": 0}),
            lambda: repositorio.criar_treino({"nome": "  ", "descricao": "", "dias": [0]}),
            lambda: repositorio.criar_treino({"nome": "X", "descricao": "", "dias": [7]}),
            lambda: repositorio.salvar_cardio(3, {"modalidade": "Remo", "metaMinutos": None, "metaKm": None}),
            lambda: repositorio.adicionar_sessao(1, {"minutos": None, "km": None}),
        ]
        for operacao in casos:
            with self.subTest(), self.assertRaises(ViolacaoDeRegra):
                operacao()

    def test_operacao_recusada_nao_grava_nada(self):
        # O treino seria inserido antes do dia inválido; a transação desfaz os dois.
        treinos_antes = self.contar("treinos")
        with self.assertRaises(ViolacaoDeRegra):
            repositorio.criar_treino({"nome": "X", "descricao": "", "dias": [1, 9]})
        self.assertEqual(self.contar("treinos"), treinos_antes)

    # --- Erros de persistência ---

    def test_banco_inexistente_nao_e_criado_vazio(self):
        banco.caminho = Path(self.pasta.name) / "nao-existe.db"
        with self.assertRaises(ErroPersistencia):
            repositorio.listar_treinos()
        self.assertFalse(banco.caminho.exists())

    def test_arquivo_corrompido(self):
        banco.caminho = Path(self.pasta.name) / "corrompido.db"
        banco.caminho.write_text("isto não é um banco SQLite")
        with self.assertRaises(ErroPersistencia):
            repositorio.listar_treinos()

    def test_banco_ocupado_por_outra_gravacao(self):
        tempo_original = banco.TEMPO_DE_ESPERA_SEGUNDOS
        banco.TEMPO_DE_ESPERA_SEGUNDOS = 0.1
        bloqueio = sqlite3.connect(banco.caminho)
        try:
            bloqueio.execute("BEGIN EXCLUSIVE")
            with self.assertRaises(BancoOcupado):
                repositorio.criar_treino(TREINO)
        finally:
            bloqueio.rollback()
            bloqueio.close()
            banco.TEMPO_DE_ESPERA_SEGUNDOS = tempo_original


if __name__ == "__main__":
    unittest.main()
