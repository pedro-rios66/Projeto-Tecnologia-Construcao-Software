"""Erro padrão da API."""


class ErroApi(Exception):
    """Erro previsto: vira a resposta JSON {"error": mensagem} com o status informado."""

    def __init__(self, status, mensagem, cabecalhos=None):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem
        self.cabecalhos = cabecalhos or {}
