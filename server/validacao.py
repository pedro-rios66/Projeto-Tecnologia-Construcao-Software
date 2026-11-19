"""Validação dos corpos recebidos: mesmas regras e mensagens de src/js/validation.js.

Cada função recebe o corpo já convertido de JSON, lança ErroApi(400) no primeiro
problema e devolve só os campos aceitos, já normalizados. Campos desconhecidos são ignorados.
"""

from erros import ErroApi


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


def validar_exercicio(corpo):
    return {"nome": exigir_texto(corpo, "nome", "O nome do exercício não pode estar vazio.")}


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


def validar_feita(corpo):
    if not isinstance(corpo.get("feita"), bool):
        raise ErroApi(400, 'O campo "feita" deve ser verdadeiro ou falso.')
    return corpo["feita"]
