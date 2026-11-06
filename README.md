# GymLog 🦾📈

## Descrição

O **GymLog** é uma aplicação Web voltada para praticantes de musculação que desejam registrar seus treinos e acompanhar a evolução de cargas e repetições ao longo do tempo.

Este repositório faz parte da disciplina **Tecnologia de Construção de Software I — Projeto Integrador** e é desenvolvido de forma **incremental** ao longo do semestre, sempre sobre o mesmo repositório Git. Cada etapa da disciplina corresponde a uma versão identificável do projeto, marcada por uma tag Git.

O front-end é construído com **HTML, CSS e JavaScript puro**, sem frameworks nem bibliotecas. Desde a Etapa 05, os dados ficam em um **servidor simulado em Python**, feito só com a biblioteca padrão, com o qual o navegador se comunica por HTTP e JSON.

---

## Problema

Praticantes de musculação frequentemente têm dificuldade para registrar seus treinos e acompanhar sua evolução ao longo do tempo.

Os registros costumam ser feitos em anotações de papel, aplicativos de notas genéricos ou planilhas. Essas abordagens funcionam para o registro imediato, mas dificultam:

- organizar os treinos de forma estruturada;
- consultar o histórico de um exercício específico;
- comparar cargas e repetições entre sessões diferentes;
- identificar se houve progressão ao longo das semanas.

Sem uma forma organizada de consulta, o histórico existe, mas não é aproveitado.

---

## Objetivo

**Objetivo geral:** desenvolver uma aplicação Web que permita registrar treinos de musculação e consultar o histórico de forma organizada.

**Objetivos específicos:**

- permitir a criação e a organização de treinos;
- permitir o cadastro de exercícios dentro de cada treino;
- permitir o registro de séries com peso e número de repetições;
- permitir a consulta de treinos já realizados;
- possibilitar, em etapas posteriores, o acompanhamento da evolução de um exercício ao longo do tempo;
- aplicar, de forma prática, conceitos de engenharia de software vistos na disciplina (organização de código, versionamento, validação, tratamento de erros, testes e documentação).

---

## Funcionalidades

As funcionalidades abaixo compõem o **escopo inicial planejado**. Elas são implementadas gradualmente ao longo das etapas, e esta seção é atualizada conforme cada item passa a existir no código.

### Gerenciamento de treinos

- criar treino, com nome, descrição e um ou mais dias da semana;
- visualizar os treinos como um **cronograma semanal**, com um cartão por dia,
  destaque para o dia corrente e indicação de descanso nos dias livres;
- adicionar exercícios ao treino;
- remover exercícios do treino.

### Registro de séries

Para cada exercício:

- número da série (derivado da ordem, não armazenado);
- peso utilizado;
- número de repetições;
- marcação de série feita, com barra de progresso;
- remoção de séries;
- botão "Repetir última", que registra uma cópia da série anterior em um clique.

### Histórico

Visualização de:

- treinos realizados;
- exercícios realizados;
- pesos utilizados;
- repetições realizadas.

### Cardio

Cada treino pode ter um cardio associado, que aparece no cartão do dia logo
abaixo do treino e tem tela própria:

- modalidade (esteira, bicicleta, etc.);
- meta **acumulada** de tempo (min) e/ou de distância (km) — pelo menos uma das duas;
- registro de sessões, cada uma com tempo e/ou distância;
- marcação de sessão concluída — **apenas sessões concluídas somam para a meta**;
- anéis de progresso concêntricos (tempo por fora, distância por dentro) mostrando quanto falta para cada meta;
- remoção de sessões e botão "Repetir última".

### Métricas

Calculadas a partir dos registros existentes, sem novos campos no modelo de dados:

- resumo no cartão de cada treino: total de exercícios, total de séries e total de repetições;
- total de repetições por exercício, no cartão do exercício e no painel da tela do treino;
- barra de progresso das séries feitas na tela do exercício;
- destaque da "melhor série" (maior peso registrado) na tela do exercício.

### Interatividade e validação

Toda a interface reage a eventos do usuário e é redesenhada dinamicamente com
JavaScript puro, sem depender de recarregar a página:

- validação de formulários com mensagens de erro específicas para cada campo
  (nome do treino, dias da semana, nome do exercício, peso e repetições da
  série, modalidade e metas de cardio);
- navegação entre telas tratando explicitamente ids inexistentes (ex.: abrir
  um treino que não existe mais volta para a lista, em vez de travar);
- estados vazios ilustrados (nenhum treino, nenhum exercício, nenhuma série,
  nenhuma sessão) em vez de telas em branco.

> Instruções detalhadas de teste manual de cada funcionalidade interativa,
> com capturas de tela, estão em `docs/etapa-04.md`.

### Comunicação com o servidor

Todos os dados são lidos e gravados de forma assíncrona no servidor simulado:

- indicador de carregamento nas consultas e botão "Salvando..." nos envios, que
  também impede o envio duplicado;
- confirmação curta ao concluir uma operação;
- mensagem de erro com "Tentar novamente" nas consultas;
- mensagem de erro no próprio formulário nos envios, sem perder o que foi digitado;
- tratamento de erro do servidor, falha de conexão e tempo limite de 8 segundos.

> Detalhes em `docs/etapa-05.md`.

### Evolução

Em etapa posterior, a aplicação poderá apresentar a evolução de um determinado exercício ao longo do tempo, a partir dos registros já armazenados.

> O escopo do projeto está deliberadamente restrito a esses itens. Recursos como login, compartilhamento entre usuários, notificações ou integração com dispositivos externos **não fazem parte do escopo**.

---

## Tecnologias utilizadas

Versão atual do projeto:

| Tecnologia | Uso no projeto |
|---|---|
| HTML5 | estrutura da interface |
| CSS3 | estilização e layout responsivo (mobile first) |
| JavaScript (ES6+) com ES Modules | lógica da aplicação, dividida em módulos |
| Fetch API, Promises e `async`/`await` | comunicação assíncrona com o servidor |
| `<template>` HTML | marcação dos elementos repetidos, clonada pelo JS (sem HTML em strings) |
| SVG inline | ícones (`<symbol>` + `<use>`), sem imagens externas nem biblioteca |
| Python 3.10+ (biblioteca padrão) | apenas o servidor simulado (`server/server.py`) |
| Node.js e Playwright | apenas os testes automatizados; a aplicação não depende deles |
| Git / GitHub | versionamento e hospedagem do repositório |

O front-end não tem framework, biblioteca externa nem etapa de build.

### Tecnologias consideradas para evolução futura

Os itens abaixo **não estão implementados** e são listados apenas como possibilidades de evolução, a serem avaliadas conforme os conteúdos da disciplina avançarem:

- framework web no servidor;
- banco de dados relacional (por exemplo, PostgreSQL);
- React ou outra biblioteca de interface;
- autenticação de usuários.

A adoção de qualquer uma dessas tecnologias será justificada em `docs/decisoes-tecnicas.md` no momento em que ocorrer.

---

## Estrutura do projeto

```
.
├── README.md
├── package.json              # só para os testes (Playwright)
├── docs/
│   ├── decisoes-tecnicas.md
│   ├── etapa-03.md
│   ├── etapa-04.md
│   ├── etapa-05.md
│   └── evidencias/
├── server/
│   ├── server.py             # servidor simulado (arquivos estáticos + API)
│   └── db.json               # dados persistidos
├── src/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js           # ponto de entrada e registro dos eventos
│       ├── state.js          # estado da interface
│       ├── api.js            # todas as chamadas fetch
│       ├── validation.js     # validações (funções puras)
│       ├── calculations.js   # cálculos (funções puras)
│       └── ui.js             # renderização e estados da interface
└── tests/
    └── manual-check.js       # testes de ponta a ponta e evidências
```

As responsabilidades e dependências de cada módulo estão na seção 4 de `docs/etapa-05.md`.

---

## Como executar

**Pré-requisitos:** Python 3.10 ou superior e um navegador atual. A aplicação não tem nada a instalar.

**1. Clonar o repositório**

```bash
git clone https://github.com/pedro-rios66/Projeto-Tecnologia-Construcao-Software.git
cd Projeto-Tecnologia-Construcao-Software
```

**2. Iniciar o servidor**

```bash
python server/server.py   # no Windows, também: py server/server.py
```

**3. Acessar** `http://localhost:3000`

Abrir o `index.html` diretamente não funciona mais: módulos ES e `fetch` exigem um servidor HTTP.

| Variável de ambiente | Padrão | Função |
|---|---|---|
| `PORT` | `3000` | porta do servidor |
| `DB_PATH` | `server/db.json` | arquivo de dados |
| `MOCK_DELAY_MS` | `600` | atraso artificial nas rotas `/api`, para os estados de carregamento ficarem visíveis |

**4. Rodar os testes** (exige Node.js)

```bash
npm install
npm test
```

**5. Consultar uma etapa específica**

```bash
git checkout etapa-01
```

---

## Como utilizar

O fluxo de uso previsto para a aplicação é:

1. criar um treino e atribuir um nome a ele;
2. adicionar os exercícios que compõem esse treino;
3. para cada exercício, registrar as séries realizadas, informando peso e número de repetições;
4. remover exercícios que não fizerem parte do treino;
5. consultar o histórico para visualizar treinos anteriores e os registros correspondentes.

Esta seção é atualizada conforme cada funcionalidade é implementada, para refletir exatamente o que a aplicação permite fazer na etapa corrente.

---

## Persistência dos dados

Os dados ficam em `server/db.json`, lido e gravado pelo servidor simulado a cada operação. O navegador guarda apenas uma cópia em memória para desenhar as telas, e o projeto não usa armazenamento local do navegador.

- os dados permanecem entre recarregamentos e reinícios do servidor;
- o arquivo é versionado com os treinos de exemplo, então usar a aplicação faz com que ele apareça como modificado no Git;
- para restaurar os dados de exemplo: `git restore server/db.json`.

---

## Evolução planejada

O projeto é construído de forma incremental. Cada etapa parte do estado anterior do repositório e acrescenta funcionalidade ou melhora a estrutura existente.

Planejamento inicial:

| Etapa | Foco previsto |
|---|---|
| Etapa 01 | estrutura inicial do repositório e interface |
| Etapa 02 | interações com JavaScript |
| Etapa 03 | validação e organização do código |
| Etapa 04 | interatividade com JavaScript |
| Etapa 05 | modularização e comunicação assíncrona |
| Etapa 06 | evolução e métricas |
| Etapa 07+ | possível backend/API |
| Etapa 10 | aplicação consolidada |
| Final | versão final |

> Esse cronograma é **planejamento inicial**, não um compromisso fechado. A ordem e o conteúdo das etapas podem ser alterados conforme os conteúdos apresentados na disciplina e as decisões técnicas tomadas durante o desenvolvimento. A Etapa 05, por exemplo, tratou de modularização e comunicação assíncrona. Alterações relevantes são registradas em `docs/decisoes-tecnicas.md`.

---

## Versionamento

O projeto utiliza Git, com histórico contínuo em um único repositório.

Cada etapa da disciplina é marcada por uma **tag**, seguindo a convenção:

```
etapa-01
etapa-02
etapa-03
etapa-04
etapa-05
etapa-06
etapa-07
etapa-08
etapa-09
etapa-10
final
```

Cada tag representa uma versão identificável do projeto, correspondente ao estado da aplicação ao final da etapa respectiva. Isso permite recuperar e comparar qualquer momento do desenvolvimento.

Comandos úteis:

```bash
# listar as tags existentes
git tag -l

# visualizar o projeto em uma etapa específica
git checkout etapa-03

# voltar para a branch principal
git checkout main
```

---

## Documentação

A documentação complementar fica na pasta `docs/`:

| Arquivo | Conteúdo |
|---|---|
| `docs/decisoes-tecnicas.md` | decisões técnicas de cada etapa, com contexto e justificativa |
| `docs/etapa-03.md` | interface responsiva |
| `docs/etapa-04.md` | interatividade com JavaScript |
| `docs/etapa-05.md` | modularização e comunicação assíncrona |
| `docs/evidencias/` | capturas de tela de cada etapa |

---

## Limitações conhecidas

- **servidor apenas local e de desenvolvimento** — atende só em `127.0.0.1`;
- **armazenamento simples** — `db.json` é regravado por inteiro a cada escrita;
- **ausência de autenticação** — não há usuários, contas ou controle de acesso;
- **sem sincronização entre abas ou dispositivos** — uma aba só vê as mudanças de outra na consulta seguinte;
- **sem backup automático** dos dados.

Essas limitações fazem parte do escopo atual, e não são falhas de implementação. A lista completa está na seção 11 de `docs/etapa-05.md`.

---

## Próximos passos

- construir a visualização do histórico;
- avaliar a apresentação da evolução por exercício;
- manter `docs/decisoes-tecnicas.md` e este README atualizados a cada etapa.

---

## Contexto acadêmico

- **Disciplina:** Tecnologia de Construção de Software I — Projeto Integrador
- **Natureza:** projeto acadêmico de graduação, desenvolvido individualmente e de forma incremental ao longo do semestre
- **Repositório:** único, com histórico contínuo e versões marcadas por tags

A avaliação da disciplina considera principalmente a aplicação de conceitos de engenharia de software, as decisões técnicas tomadas, a organização e a arquitetura do projeto, a evolução incremental da aplicação, o domínio do código, a capacidade de explicar e justificar as escolhas feitas, os testes e o tratamento de erros, e a documentação.

Por esse motivo, este README é tratado como parte do projeto e atualizado ao longo do desenvolvimento, mantendo sempre a distinção entre **o que já existe**, **o que está planejado** e **o que poderá ser implementado futuramente**.
