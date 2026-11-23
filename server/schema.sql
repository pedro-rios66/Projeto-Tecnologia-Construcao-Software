-- Esquema do banco do GymLog (SQLite).
-- Criação: python server/banco.py  (ou automaticamente, ao iniciar o servidor)
--
-- As restrições (NOT NULL, CHECK, FOREIGN KEY) repetem as regras de validação da API:
-- se um dado inválido escapar da validação, o próprio banco o recusa.
-- AUTOINCREMENT impede que o id de um registro excluído seja reaproveitado.

-- Treino: o recurso principal.
CREATE TABLE treinos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT    NOT NULL CHECK (trim(nome) <> ''),
    descricao TEXT    NOT NULL DEFAULT ''
);

-- Dias da semana do treino (0 = segunda ... 6 = domingo). Um treino tem um ou mais.
CREATE TABLE treino_dias (
    treino_id INTEGER NOT NULL REFERENCES treinos (id) ON DELETE CASCADE,
    dia       INTEGER NOT NULL CHECK (dia BETWEEN 0 AND 6),
    PRIMARY KEY (treino_id, dia)
);

CREATE TABLE exercicios (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    treino_id INTEGER NOT NULL REFERENCES treinos (id) ON DELETE CASCADE,
    nome      TEXT    NOT NULL CHECK (trim(nome) <> '')
);

-- O número da série não é guardado: é a posição dela no exercício, calculada na consulta.
CREATE TABLE series (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    exercicio_id INTEGER NOT NULL REFERENCES exercicios (id) ON DELETE CASCADE,
    peso         NUMERIC NOT NULL CHECK (peso > 0),
    repeticoes   INTEGER NOT NULL CHECK (repeticoes > 0),
    feita        INTEGER NOT NULL DEFAULT 0 CHECK (feita IN (0, 1))
);

-- Cardio: no máximo um por treino, por isso a chave primária é o próprio treino_id.
CREATE TABLE cardios (
    treino_id    INTEGER PRIMARY KEY REFERENCES treinos (id) ON DELETE CASCADE,
    modalidade   TEXT    NOT NULL CHECK (trim(modalidade) <> ''),
    meta_minutos NUMERIC CHECK (meta_minutos > 0),
    meta_km      NUMERIC CHECK (meta_km > 0),
    CHECK (meta_minutos IS NOT NULL OR meta_km IS NOT NULL)
);

CREATE TABLE sessoes_cardio (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    treino_id INTEGER NOT NULL REFERENCES cardios (treino_id) ON DELETE CASCADE,
    minutos   NUMERIC CHECK (minutos > 0),
    km        NUMERIC CHECK (km > 0),
    feita     INTEGER NOT NULL DEFAULT 0 CHECK (feita IN (0, 1)),
    CHECK (minutos IS NOT NULL OR km IS NOT NULL)
);

-- Índices das chaves estrangeiras: o SQLite não os cria sozinho, e toda consulta de um
-- treino busca seus exercícios, séries e sessões por essas colunas.
CREATE INDEX idx_exercicios_treino ON exercicios (treino_id);
CREATE INDEX idx_series_exercicio ON series (exercicio_id);
CREATE INDEX idx_sessoes_treino ON sessoes_cardio (treino_id);
