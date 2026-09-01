# GymLog 🦾📈

## Descrição

O **GymLog** é uma aplicação Web voltada para praticantes de musculação que desejam registrar seus treinos e acompanhar a evolução de cargas e repetições ao longo do tempo.

Este repositório faz parte da disciplina **Tecnologia de Construção de Software I — Projeto Integrador** e é desenvolvido de forma **incremental** ao longo do semestre, sempre sobre o mesmo repositório Git. Cada etapa da disciplina corresponde a uma versão identificável do projeto, marcada por uma tag Git.

A primeira versão é construída com **HTML, CSS e JavaScript puro**, sem frameworks, sem backend e sem dependências externas. Tecnologias adicionais poderão ser incorporadas conforme os conteúdos da disciplina forem apresentados, mas não fazem parte do estado atual do projeto.

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

### Evolução

Em etapa posterior, a aplicação poderá apresentar a evolução de um determinado exercício ao longo do tempo, a partir dos registros já armazenados.

> O escopo do projeto está deliberadamente restrito a esses itens. Recursos como login, compartilhamento entre usuários, notificações ou integração com dispositivos externos **não fazem parte do escopo**.

---

## Tecnologias utilizadas

Versão atual do projeto:

| Tecnologia | Uso no projeto |
|---|---|
| HTML5 | estrutura da interface |
| CSS3 | estilização e layout |
| JavaScript (ES6+) | lógica da aplicação e interações |
| `<template>` HTML | marcação dos elementos repetidos, clonada pelo JS (sem HTML em strings) |
| SVG inline | ícones (`<symbol>` + `<use>`), sem imagens externas nem biblioteca |
| LocalStorage | persistência dos dados no navegador |
| Git / GitHub | versionamento e hospedagem do repositório |

Não há framework, biblioteca externa, gerenciador de pacotes ou etapa de build.

### Tecnologias consideradas para evolução futura

Os itens abaixo **não estão implementados** e são listados apenas como possibilidades de evolução, a serem avaliadas conforme os conteúdos da disciplina avançarem:

- Node.js e Express;
- banco de dados relacional (por exemplo, PostgreSQL);
- API REST;
- React ou outra biblioteca de interface;
- autenticação de usuários;
- testes automatizados.

A adoção de qualquer uma dessas tecnologias será justificada em `docs/arquitetura.md` no momento em que ocorrer.

---

## Estrutura do projeto

A estrutura abaixo representa a **organização planejada** do repositório:

```
GymLog/
│
├── README.md
│
├── docs/
│   ├── proposta.md
│   ├── arquitetura.md
│   └── evidencias.md
│
├── src/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── app.js
│       ├── storage.js
│       ├── ui.js
│       └── utils.js
│
└── tests/
```

**Observação importante:** nem todos os itens acima existem desde a primeira etapa. A estrutura é criada de forma incremental, na medida em que cada parte passa a ser necessária. Em particular:

- os módulos em `src/js/` são separados conforme a lógica cresce; nas primeiras etapas, parte do código pode estar concentrada em um único arquivo;
- `src/js/storage.js` só passa a fazer sentido a partir da etapa de persistência;
- a pasta `tests/` é criada quando testes forem efetivamente introduzidos na disciplina;
- os arquivos em `docs/` são preenchidos ao longo do semestre.

Sempre que a estrutura real divergir do planejado, este README é atualizado.

### Responsabilidade prevista para cada módulo

| Arquivo | Responsabilidade prevista |
|---|---|
| `app.js` | inicialização e coordenação geral da aplicação |
| `storage.js` | leitura e gravação dos dados na persistência |
| `ui.js` | manipulação do DOM e renderização da interface |
| `utils.js` | funções auxiliares e reutilizáveis |

---

## Como executar

O projeto não possui dependências nem processo de build. Basta ter o repositório em máquina local e um navegador.

**1. Clonar o repositório**

```bash
git clone https://github.com/<usuario>/GymLog.git
cd GymLog
```

**2. Abrir a aplicação**

Opção A — abrir diretamente o arquivo:

```
src/index.html
```

Opção B — servir os arquivos por um servidor local (recomendado, pois evita restrições do navegador ao carregar arquivos via `file://`):

```bash
cd src
python3 -m http.server 8000
```

Depois, acessar `http://localhost:8000` no navegador.

Usuários de VS Code podem utilizar a extensão **Live Server** como alternativa.

**3. Consultar uma etapa específica**

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

A persistência inicial é feita com **LocalStorage**, recurso do próprio navegador.

Características dessa abordagem:

- os dados ficam armazenados no navegador do dispositivo utilizado;
- não há servidor nem banco de dados;
- os dados permanecem entre sessões, desde que o armazenamento local do navegador não seja limpo;
- os dados não são compartilhados entre navegadores ou dispositivos diferentes;
- o armazenamento aceita apenas texto, de modo que os dados são serializados em JSON na gravação e desserializados na leitura.

A escolha do LocalStorage é adequada ao escopo inicial: permite tratar persistência, serialização e validação de dados sem introduzir backend antes que o assunto seja abordado na disciplina.

Antes da etapa de persistência, os dados existem apenas em memória e são perdidos ao recarregar a página. Essa limitação é intencional e resolvida no momento previsto do cronograma.

---

## Evolução planejada

O projeto é construído de forma incremental. Cada etapa parte do estado anterior do repositório e acrescenta funcionalidade ou melhora a estrutura existente.

Planejamento inicial:

| Etapa | Foco previsto |
|---|---|
| Etapa 01 | estrutura inicial do repositório e interface |
| Etapa 02 | interações com JavaScript |
| Etapa 03 | validação e organização do código |
| Etapa 04 | persistência com LocalStorage |
| Etapa 05 | histórico de treinos |
| Etapa 06 | evolução e métricas |
| Etapa 07+ | possível backend/API |
| Etapa 10 | aplicação consolidada |
| Final | versão final |

> Esse cronograma é **planejamento inicial**, não um compromisso fechado. A ordem e o conteúdo das etapas podem ser alterados conforme os conteúdos apresentados na disciplina e as decisões técnicas tomadas durante o desenvolvimento. Alterações relevantes em relação a este planejamento são registradas em `docs/arquitetura.md`.

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
| `docs/proposta.md` | proposta do projeto, problema e escopo |
| `docs/arquitetura.md` | decisões técnicas e organização da aplicação |
| `docs/evidencias.md` | registro da evolução, com evidências de cada etapa |

### Decisões de engenharia de software

As principais decisões técnicas do projeto são registradas em `docs/arquitetura.md`, com o contexto e a justificativa de cada uma. As decisões documentadas incluem, conforme forem sendo tomadas:

- organização do código e separação de responsabilidades;
- arquitetura da aplicação;
- estratégia de persistência;
- escolha de tecnologias;
- comunicação entre componentes/módulos;
- validação de dados de entrada;
- tratamento de erros;
- estratégia de testes.

Nenhuma dessas decisões é registrada antecipadamente: cada uma é documentada no momento em que é efetivamente tomada, junto com as alternativas consideradas.

---

## Limitações conhecidas

A versão inicial tem limitações que decorrem diretamente do escopo escolhido:

- **ausência de backend** — toda a aplicação é executada no navegador;
- **persistência limitada ao navegador** — os dados ficam no LocalStorage do dispositivo;
- **dados vinculados ao navegador/dispositivo** — abrir a aplicação em outro navegador ou computador significa começar do zero;
- **ausência de sincronização entre dispositivos**;
- **ausência de autenticação** — não há usuários, contas ou controle de acesso;
- **sem backup automático** — limpar os dados do navegador remove os registros.

Essas limitações **fazem parte do escopo inicial**, e não são falhas de implementação. Elas permitem concentrar as primeiras etapas nos fundamentos (estrutura, lógica, validação e organização do código) antes de introduzir infraestrutura mais complexa. Boa parte delas pode ser tratada em etapas futuras, caso o projeto evolua para uma arquitetura com backend.

---

## Próximos passos

Ações previstas para o curto prazo:

- concluir a estrutura da interface e a navegação básica;
- implementar as interações de criação de treino e cadastro de exercícios;
- implementar o registro de séries com peso e repetições;
- introduzir validação das entradas e tratamento de erros;
- implementar a persistência com LocalStorage;
- construir a visualização do histórico;
- avaliar a apresentação da evolução por exercício;
- manter `docs/arquitetura.md` e este README atualizados a cada etapa.

---

## Contexto acadêmico

- **Disciplina:** Tecnologia de Construção de Software I — Projeto Integrador
- **Natureza:** projeto acadêmico de graduação, desenvolvido individualmente e de forma incremental ao longo do semestre
- **Repositório:** único, com histórico contínuo e versões marcadas por tags

A avaliação da disciplina considera principalmente a aplicação de conceitos de engenharia de software, as decisões técnicas tomadas, a organização e a arquitetura do projeto, a evolução incremental da aplicação, o domínio do código, a capacidade de explicar e justificar as escolhas feitas, os testes e o tratamento de erros, e a documentação.

Por esse motivo, este README é tratado como parte do projeto e atualizado ao longo do desenvolvimento, mantendo sempre a distinção entre **o que já existe**, **o que está planejado** e **o que poderá ser implementado futuramente**.
