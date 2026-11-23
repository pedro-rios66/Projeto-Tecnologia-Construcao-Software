-- Dados de exemplo do GymLog: os mesmos treinos das etapas anteriores.
-- Carregados por server/banco.py logo depois de server/schema.sql.

INSERT INTO treinos (id, nome, descricao) VALUES
    (1, 'Treino A', 'Peito + Tríceps'),
    (2, 'Treino B', 'Costas + Bíceps'),
    (3, 'Treino C', 'Pernas');

INSERT INTO treino_dias (treino_id, dia) VALUES
    (1, 0),
    (1, 4),
    (2, 1),
    (2, 5),
    (3, 2),
    (3, 6);

INSERT INTO exercicios (id, treino_id, nome) VALUES
    (1, 1, 'Supino Reto'),
    (2, 1, 'Supino Inclinado'),
    (3, 1, 'Tríceps Pulley'),
    (4, 2, 'Puxada Alta'),
    (5, 2, 'Remada'),
    (6, 2, 'Rosca Direta'),
    (7, 3, 'Agachamento Livre'),
    (8, 3, 'Leg Press'),
    (9, 3, 'Cadeira Extensora'),
    (10, 3, 'Panturrilha em Pé');

INSERT INTO series (id, exercicio_id, peso, repeticoes, feita) VALUES
    (1, 1, 60, 10, 0),
    (2, 1, 60, 10, 0),
    (3, 1, 55, 12, 0),
    (4, 2, 50, 10, 0),
    (5, 2, 50, 10, 0),
    (6, 4, 45, 12, 0),
    (7, 4, 45, 12, 0),
    (8, 7, 80, 8, 0),
    (9, 7, 80, 8, 0),
    (10, 7, 70, 10, 0),
    (11, 8, 120, 12, 0),
    (12, 8, 120, 10, 0);

INSERT INTO cardios (treino_id, modalidade, meta_minutos, meta_km) VALUES
    (1, 'Esteira', 30, 5),
    (2, 'Bicicleta', 40, 12);

INSERT INTO sessoes_cardio (id, treino_id, minutos, km, feita) VALUES
    (1, 1, 12, 1.8, 1),
    (2, 1, 12, 1.6, 1),
    (3, 2, 40, 12, 1);
