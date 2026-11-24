CREATE DATABASE IF NOT EXISTS tecnostore_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE tecnostore_db;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM('CLIENTE', 'ADMIN') NOT NULL DEFAULT 'CLIENTE',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,
    categoria_id INT NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    estoque INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 3,
    imagem VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_produto_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    desconto DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    valor_final DECIMAL(10, 2) NOT NULL,
    situacao VARCHAR(40) NOT NULL DEFAULT 'Concluído',
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedido_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE itens_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_item_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_produto FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE TABLE movimentacoes_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    usuario_id INT NULL,
    tipo ENUM('ENTRADA', 'SAIDA', 'AJUSTE') NOT NULL,
    quantidade INT NOT NULL,
    saldo_resultante INT NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_produto FOREIGN KEY (produto_id) REFERENCES produtos(id),
    CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

INSERT INTO categorias (nome) VALUES 
('Informática'), 
('Games'), 
('Acessórios');

INSERT INTO produtos (codigo, nome, categoria_id, preco, estoque, estoque_minimo, imagem, ativo) VALUES
('PRD-001', 'Teclado Mecânico RGB', 3, 199.90, 6, 3, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=300', TRUE),
('PRD-002', 'Mouse Gamer 16000 DPI', 3, 129.50, 8, 3, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300', TRUE),
('PRD-003', 'Monitor Gamer 144Hz', 1, 899.00, 4, 2, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300', TRUE),
('PRD-004', 'Headset Gamer 7.1', 2, 249.90, 2, 3, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300', TRUE),
('PRD-005', 'Controle Sem Fio', 2, 280.00, 7, 3, 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=300', TRUE),
('PRD-006', 'Cadeira Ergonômica', 1, 750.00, 0, 2, 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=300', TRUE);
