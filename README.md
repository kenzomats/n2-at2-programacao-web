# TecnoStore — Loja Virtual Full Stack

Sistema de loja virtual desenvolvido como trabalho prático (N2) da disciplina de **Programação para Web**. A aplicação integra frontend em HTML5, CSS3 e JavaScript (estruturado com Programação Orientada a Objetos), backend em Node.js com Express e banco de dados relacional MySQL com autenticação segura e controle transacional de pedidos e estoque.

## Integrantes
* Giula Valença de Melo
* João Pedro Souza Pereira
* Kaylane Martins do Nascimento
* Kenzo Matsunaga



---

## Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (ES6+, manipulação de DOM, `fetch` API e Programação Orientada a Objetos)
* **Backend:** Node.js, Express
* **Banco de Dados:** MySQL (`mysql2`)
* **Segurança e Configuração:** `bcrypt` (hash de senhas), `jsonwebtoken` (autenticação via token JWT), `dotenv` (variáveis de ambiente) e `cors`

---

## Estrutura do Projeto

```text
n2-loja/
├── public/
│   ├── index.html       # Interface completa (catálogo, login/cadastro, carrinho, pedidos e painel admin)
│   ├── style.css        # Estilização responsiva da aplicação
│   └── app.js           # Classes POO (Produto e Carrinho), lógica de interface e integração com a API
├── routes/
│   └── api.js           # Rotas REST, middlewares de autenticação/autorização e transações SQL
├── db.js                # Configuração da conexão com o banco de dados MySQL
├── server.js            # Servidor Express, arquivos estáticos e registro das rotas da API
├── mysqln2.sql          # Script SQL completo (criação do banco, tabelas e carga inicial)
├── package.json         # Metadados, dependências e script de inicialização
├── .env.example         # Modelo de variáveis de ambiente (sem dados sensíveis)
├── .gitignore           # Exclusão de node_modules e .env do versionamento
└── README.md            # Documentação completa do projeto
```

---

## Pré-requisitos

* **Node.js** (versão 18 ou superior)
* **MySQL Server** e cliente SQL (ex.: MySQL Workbench)

---

## Passo a Passo para Instalação e Execução

### 1. Clonar o repositório e instalar as dependências
No terminal, acesse a pasta do projeto e instale os pacotes listados no `package.json`:

```bash
git clone https://github.com/kenzomats/n2-at2-programacao-web.git
cd n2-at2-programacao-web
npm install
```

### 2. Criar e popular o banco de dados MySQL
1. Abra o **MySQL Workbench** (ou outro cliente MySQL).
2. Abra e execute integralmente o script `mysqln2.sql`.
3. O script criará o banco `tecnostore_db`, as 6 tabelas relacionais e inserirá automaticamente 3 categorias (`Informática`, `Games`, `Acessórios`) e 6 produtos iniciais (`PRD-001` a `PRD-006`).

### 3. Configurar as variáveis de ambiente
Na raiz do projeto, crie um arquivo chamado `.env` baseado no `.env.example` com os dados do seu MySQL local:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_NAME=tecnostore_db
DB_PORT=3306
JWT_SECRET=chave_secreta_tecnostore_2026
```

### 4. Criar o usuário Administrador no banco de dados
Como o cadastro público da interface cria apenas usuários com perfil `CLIENTE` e as senhas são armazenadas com hash `bcrypt`, execute **uma** das opções abaixo para criar o administrador de demonstração:

**Opção 1 — Comando único pelo terminal Node.js (recomendada):**
Na raiz do projeto (com o `.env` configurado e o `mysqln2.sql` já executado), rode:

```bash
node -e "const bcrypt = require('bcrypt'); const db = require('./db'); bcrypt.hash('admin123', 10, (err, hash) => { if (err) throw err; db.query('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)', ['Administrador', 'admin@tecnostore.com', hash, 'ADMIN'], (err2) => { if (err2) throw err2; console.log('Admin criado com sucesso!'); process.exit(); }); });"
```

**Opção 2 — Promover um usuário cadastrado pela interface via SQL:**
1. Cadastre uma conta normalmente pela tela da loja (**Entrar / Cadastrar -> Cadastro**).
2. Execute o comando abaixo no MySQL Workbench substituindo pelo e-mail cadastrado:

```sql
USE tecnostore_db;
UPDATE usuarios SET perfil = 'ADMIN' WHERE email = 'seu_email@exemplo.com';
```

### 5. Iniciar o servidor
Na raiz do projeto, execute:

```bash
npm start
```

Quando o terminal exibir `servidor funcionando` e `Conectado ao banco de dados`, acesse no navegador:

```text
http://localhost:3000
```

---

## Credenciais de Demonstração

* **Cliente (`CLIENTE`):** Pode ser criado livremente na própria interface em **Entrar / Cadastrar -> Cadastro**.
* **Administrador (`ADMIN`):** *(criado no passo 4)*
  * **E-mail:** `admin@tecnostore.com`
  * **Senha:** `admin123`

---

## Modelagem do Banco de Dados (`tecnostore_db`)

| Tabela | Colunas Principais | Finalidade |
| :--- | :--- | :--- |
| `usuarios` | `id`, `nome`, `email`, `senha_hash`, `perfil`, `criado_em` | Armazena clientes (`CLIENTE`) e administradores (`ADMIN`) com senha criptografada |
| `categorias` | `id`, `nome` | Categorias do catálogo de produtos |
| `produtos` | `id`, `codigo`, `nome`, `categoria_id`, `preco`, `estoque`, `estoque_minimo`, `imagem`, `ativo`, `criado_em` | Cadastro completo dos produtos com chave estrangeira para `categorias` |
| `pedidos` | `id`, `usuario_id`, `subtotal`, `desconto`, `valor_final`, `situacao`, `data_pedido` | Registro dos pedidos concluídos vinculados ao usuário comprador |
| `itens_pedido` | `id`, `pedido_id`, `produto_id`, `quantidade`, `preco_unitario` | Relação N:N entre pedidos e produtos com preço unitário no momento da compra |
| `movimentacoes_estoque` | `id`, `produto_id`, `usuario_id`, `tipo`, `quantidade`, `saldo_resultante`, `motivo`, `data_movimentacao` | Histórico auditável de todas as movimentações (`ENTRADA`, `SAIDA` e `AJUSTE`) |

---

## Programação Orientada a Objetos (Frontend)

O arquivo `public/app.js` organiza o domínio da loja em duas classes principais:

* **Classe `Produto`**
  * **Atributos:** `id`, `codigo`, `nome`, `categoria`, `categoriaId`, `preco`, `estoque`, `estoqueMinimo`, `imagem`, `ativo`.
  * **Método:** `estaDisponivel()` — retorna `true` apenas se o produto estiver ativo e com estoque maior que zero.
* **Classe `Carrinho`**
  * **Atributo:** `itens` (lista de objetos `{ produto, quantidade }`).
  * **Métodos:** `adicionarItem(produto)`, `removerItem(produtoId)`, `alterarQuantidade(produtoId, delta)`, `totalItens()`, `calcularSubtotal()`, `calcularDesconto(subtotal)`, `calcularTotal()` e `limpar()`.

---

## Funcionalidades e Regras de Negócio

### Visitante e Cliente
* **Catálogo e Filtros:** Exibe apenas produtos ativos carregados do MySQL, com busca em tempo real por nome e filtro por categoria.
* **Carrinho Interativo:** Controla adição, incremento, decremento e remoção de itens respeitando o estoque disponível.
* **Desconto Automático:** Aplica **10% de desconto** quando o subtotal for igual ou superior a **R$ 300,00** (calculado na prévia do carrinho e recalculado com segurança no servidor).
* **Preservação do Carrinho no Login:** Visitantes podem montar o carrinho antes de entrar; ao clicar em **Finalizar compra**, o sistema abre a autenticação preservando os itens escolhidos.
* **Finalização Transacional de Pedidos:** A rota `POST /api/pedidos` executa todas as etapas em uma transação SQL (`beginTransaction`, `commit`, `rollback`) com `SELECT ... FOR UPDATE`, validando estoque real, recalculando valores no backend, inserindo `pedidos` e `itens_pedido`, abatendo `produtos.estoque` e registrando a `SAIDA` em `movimentacoes_estoque`.
* **Meus Pedidos:** Permite ao cliente logado consultar exclusivamente o histórico dos seus próprios pedidos.

### Painel Administrativo (`ADMIN`)
* **Indicadores:** Total de produtos ativos, itens com estoque baixo/zerado (`estoque <= estoque_minimo`) e total de pedidos registrados.
* **Gestão de Produtos:** Cadastro de novos produtos, edição de produtos existentes e ativação/desativação lógica (`ativo`).
* **Controle de Estoque:** Registro transacional de movimentações de `ENTRADA` (soma ao saldo), `SAIDA` (subtrai validando saldo disponível) e `AJUSTE` (define novo saldo não negativo), sempre com motivo obrigatório e histórico completo de alterações.
* **Pedidos dos Clientes:** Listagem geral de todos os pedidos realizados na loja com cliente, itens e valores.

---

## Documentação da API REST

| Método | Endpoint | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/cadastro` | Público | Valida dados e cadastra novo usuário (`CLIENTE`) com hash `bcrypt` |
| `POST` | `/api/login` | Público | Valida e-mail e senha e retorna token JWT (validade de 4h) |
| `GET` | `/api/perfil` | Autenticado | Retorna os dados do usuário decodificados do token |
| `POST` | `/api/logout` | Autenticado | Encerra a sessão do usuário |
| `GET` | `/api/categorias` | Público | Lista todas as categorias ordenadas por nome |
| `GET` | `/api/produtos` | Público | Lista todos os produtos ativos com nome da categoria |
| `POST` | `/api/pedidos` | Autenticado | Valida estoque, recalcula valores, salva pedido e baixa estoque em transação |
| `GET` | `/api/meus-pedidos` | Autenticado | Retorna os pedidos e itens pertencentes ao usuário autenticado |
| `GET` | `/api/admin/indicadores` | Admin | Retorna métricas do painel administrativo |
| `GET` | `/api/admin/produtos` | Admin | Lista todos os produtos cadastrados (ativos e inativos) |
| `POST` | `/api/admin/produtos` | Admin | Cadastra novo produto com validação de preço e estoque |
| `PUT` | `/api/admin/produtos/:id` | Admin | Atualiza dados de um produto existente |
| `PATCH` | `/api/admin/produtos/:id/status` | Admin | Ativa ou desativa logicamente um produto |
| `POST` | `/api/admin/estoque/movimentar` | Admin | Registra `ENTRADA`, `SAIDA` ou `AJUSTE` de estoque em transação |
| `GET` | `/api/admin/estoque/historico` | Admin | Consulta histórico completo de movimentações de estoque |
| `GET` | `/api/admin/pedidos` | Admin | Lista todos os pedidos realizados pelos clientes |

---

## Segurança e Boas Práticas

* **Criptografia de Senhas:** Utilização de `bcrypt` com salt (fator 10); nenhuma senha é armazenada em texto puro.
* **Autenticação e Autorização no Servidor:** Middlewares `verificarAutenticacao` (validação JWT) e `verificarAdmin` (verificação de perfil `ADMIN`) protegem todas as rotas restritas, retornando códigos HTTP adequados (`400`, `401`, `403`, `404`, `409`, `500`).
* **Proteção contra SQL Injection:** Todas as consultas utilizam *placeholders* parametrizados (`?`) do `mysql2`.
* **Consistência de Dados:** Operações críticas de compra e estoque utilizam transações SQL com `FOR UPDATE` e `rollback` em caso de falha.
* **Proteção de Credenciais:** Dados sensíveis mantidos exclusivamente em `.env` (ignorado pelo `.gitignore`), com estrutura documentada em `.env.example`.

---

## Roteiro Rápido de Demonstração

1. Acessar `http://localhost:3000` como visitante, testar a busca por nome e o filtro por categoria.
2. Adicionar produtos ao carrinho (incluindo testar o limite de estoque e o desconto de 10% acima de R$ 300,00).
3. Clicar em **Finalizar compra** deslogado para verificar a exigência de login e a preservação do carrinho.
4. Criar uma conta de cliente, fazer login, finalizar a compra e conferir o pedido em **Meus Pedidos** e a redução do estoque no catálogo.
5. Fazer logout, entrar com a conta **ADMIN** (`admin@tecnostore.com` / `admin123`) e acessar o **Painel Admin** para verificar os indicadores, cadastrar/editar/desativar um produto, registrar uma movimentação de estoque e conferir o histórico de movimentações e os pedidos dos clientes.
