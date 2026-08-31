# GymLog

Diário de treinos para praticantes de musculação. Projeto acadêmico da disciplina **Tecnologia de Construção de Software I — Projeto Integrador**.

## Descrição da aplicação

GymLog é uma aplicação Web que permite ao usuário organizar seus treinos, cadastrar exercícios dentro de cada treino e registrar as séries executadas (peso e repetições).

## Problema que a aplicação resolve

Praticantes de musculação frequentemente perdem o controle sobre a evolução de carga e repetições dos seus exercícios ao longo do tempo, anotando esses dados em papel, aplicativos genéricos de notas ou simplesmente de memória. O GymLog oferece um local dedicado e simples para registrar treinos, exercícios e séries.

## Tecnologias utilizadas

Esta primeira versão foi construída exclusivamente com:

- **HTML5** — estrutura semântica da página
- **CSS3** — estilização (variáveis CSS, Flexbox e Grid)
- **JavaScript puro (Vanilla JS)** — toda a lógica da aplicação

Não foram utilizados frameworks, bibliotecas externas, backend, banco de dados ou API nesta etapa.

## Instruções para execução

A aplicação é totalmente estática (client-side) e não requer instalação de dependências nem servidor.

1. Baixe/clone o repositório.
2. Abra o arquivo `src/index.html` diretamente no navegador (duplo clique ou "Abrir com" > navegador).

Alternativamente, é possível servir a pasta `src/` com qualquer servidor estático simples (opcional, não obrigatório):

```bash
cd src
python3 -m http.server 8000
# depois acessar http://localhost:8000
```

## Instruções para teste (roteiro manual)

1. Abrir a aplicação e verificar se os treinos de exemplo (Treino A e Treino B) aparecem na tela inicial.
2. Clicar em **+ Novo Treino**, tentar criar um treino sem nome e verificar a mensagem de erro.
3. Preencher o nome e criar o treino — verificar que ele aparece na lista e que a tela do treino recém-criado é aberta.
4. Dentro de um treino, clicar em **+ Adicionar exercício**, testar validação de nome vazio e depois adicionar um exercício válido.
5. Abrir um exercício e verificar a tabela de séries (vazia ou com dados de exemplo).
6. Clicar em **+ Adicionar série**, testar peso/repetições inválidos (vazio, zero, negativo, não numérico) e depois adicionar uma série válida — verificar que o número da série é incrementado automaticamente.
7. Usar os botões **Voltar** para checar a navegação entre as telas.

## Funcionalidades implementadas

- Visualizar a lista de treinos cadastrados.
- Criar um novo treino (nome obrigatório, descrição opcional).
- Visualizar os exercícios de um treino.
- Adicionar exercícios a um treino (nome obrigatório).
- Visualizar as séries registradas de um exercício.
- Registrar novas séries (peso e repetições), com numeração automática e sequencial.
- Validações simples de formulário com mensagens de erro.
- Navegação entre telas sem recarregar a página (SPA em página única).
- Dados de exemplo pré-carregados (dois treinos) para demonstrar o funcionamento da aplicação.

## Limitações conhecidas desta primeira versão

- Os dados existem **apenas em memória**: ao recarregar a página, tudo volta ao estado inicial de exemplo. Não há persistência (LocalStorage, banco de dados, etc.).
- Não há edição ou exclusão de treinos, exercícios ou séries — apenas criação e visualização.
- Não há autenticação, múltiplos usuários, backend ou API.
- Não há cálculos avançados (ex: 1RM), gráficos de evolução ou notificações.
- A aplicação foi pensada para uma única sessão de uso no navegador.

Essas limitações são intencionais: esta é a primeira etapa de um projeto incremental, priorizando funcionalidade, simplicidade e clareza de código. Persistência e demais funcionalidades serão adicionadas em etapas futuras.

## Estrutura do projeto

```text
GymLog/
├── README.md
├── docs/
├── src/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── tests/
```
