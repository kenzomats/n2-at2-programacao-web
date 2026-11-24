const express = require('express')
const router = express.Router()
const db = require('../db')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_tecnostore_2026'

function verificarAutenticacao(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ erro: 'Faça login para acessar este recurso.' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, usuarioDecodificado) => {
        if (err) {
            return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
        }
        req.usuario = usuarioDecodificado;
        next();
    });
}

function verificarAdmin(req, res, next) {
    if (!req.usuario || req.usuario.perfil !== 'ADMIN') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
    }
    next();
}


router.post('/cadastro', (req, res) => {
    const { nome, email, senha, confirmacaoSenha } = req.body;


    if (!nome || !email || !senha || !confirmacaoSenha) {
        return res.status(400).json({ erro: 'Preencha todos os campos.' });
    }
    if (senha.length < 6) {
        return res.status(400).json({ erro: 'A senha deve ter no mínimo 6 caracteres.' });
    }
    if (senha !== confirmacaoSenha) {
        return res.status(400).json({ erro: 'As senhas não conferem.' });
    }

    const emailLimpo = email.trim().toLowerCase();

    db.query('SELECT id FROM usuarios WHERE email = ?', [emailLimpo], (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao verificar e-mail.' });
        if (results.length > 0) {
            return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
        }

        bcrypt.hash(senha, 10, (errHash, senhaHash) => {
            if (errHash) return res.status(500).json({ erro: 'Erro ao criptografar senha.' });

            db.query(
                'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)',
                [nome.trim(), emailLimpo, senhaHash, 'CLIENTE'],
                (errInsert, result) => {
                    if (errInsert) return res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });

                    res.status(201).json({
                        mensagem: 'Cadastro realizado com sucesso!',
                        usuario: { id: result.insertId, nome: nome.trim(), email: emailLimpo, perfil: 'CLIENTE' }
                    });
                }
            );
        });
    });
});

router.post('/login', (req, res) => {
    const { email, senha } = req.body

    if (!email || !senha) {
        return res.status(400).json({ erro: 'Informe e-mail e senha.' })
    }

    db.query(
        'SELECT id, nome, email, senha_hash, perfil FROM usuarios WHERE email = ?',
        [email.trim().toLowerCase()],
        (err, results) => {
            if (err) return res.status(500).json({ erro: 'Erro interno no servidor.' });
            if (results.length === 0) {
                return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
            }

            const usuario = results[0];

            bcrypt.compare(senha, usuario.senha_hash, (errComp, senhaCorreta) => {
                if (errComp) return res.status(500).json({ erro: 'Erro ao verificar senha.' });
                if (!senhaCorreta) {
                    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
                }

                const token = jwt.sign(
                    { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
                    JWT_SECRET,
                    { expiresIn: '4h' }
                );

                res.status(200).json({
                    mensagem: 'Login realizado com sucesso!',
                    token: token,
                    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil }
                });
            });
        }
    );
});


router.get('/categorias', (req, res) => {
    db.query('SELECT id, nome FROM categorias ORDER BY nome', (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar categorias.' });
        res.json(results);
    });
});

router.get('/produtos', (req, res) => {
    const sql = `
        SELECT p.id, p.codigo, p.nome, c.nome AS categoria, p.categoria_id, p.preco, p.estoque, p.estoque_minimo, p.imagem, p.ativo
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        WHERE p.ativo = TRUE
        ORDER BY p.id ASC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar produtos.' });
        res.json(results);
    });
});



router.get('/admin/produtos', verificarAutenticacao, verificarAdmin, (req, res) => {
    const sql = `
        SELECT p.id, p.codigo, p.nome, c.nome AS categoria, p.categoria_id, p.preco, p.estoque, p.estoque_minimo, p.imagem, p.ativo
        FROM produtos p
        INNER JOIN categorias c ON p.categoria_id = c.id
        ORDER BY p.id ASC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao listar produtos.' });
        res.json(results);
    });
})

router.post('/admin/produtos', verificarAutenticacao, verificarAdmin, (req, res) => {
    const { codigo, nome, categoria_id, preco, estoque, estoque_minimo, imagem } = req.body;

    if (!codigo || !nome || !categoria_id || preco === undefined || estoque === undefined || !imagem) {
        return res.status(400).json({ erro: 'Preencha todos os campos do produto.' });
    }

    if (Number(preco) <= 0 || Number(estoque) < 0) {
        return res.status(400).json({ erro: 'Preço deve ser maior que zero e estoque não pode ser negativo.' });
    }

    const sql = 'INSERT INTO produtos (codigo, nome, categoria_id, preco, estoque, estoque_minimo, imagem, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)';
    db.query(sql, [codigo, nome, categoria_id, preco, estoque, estoque_minimo || 3, imagem], (err, result) => {
        if (err) return res.status(500).json({ erro: 'Erro ao cadastrar produto (verifique se o código já existe).' });
        res.status(201).json({ mensagem: 'Produto cadastrado com sucesso!', id: result.insertId });
    });
});

router.put('/admin/produtos/:id', verificarAutenticacao, verificarAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nome, categoria_id, preco, estoque_minimo, imagem } = req.body;

    const sql = 'UPDATE produtos SET codigo = ?, nome = ?, categoria_id = ?, preco = ?, estoque_minimo = ?, imagem = ? WHERE id = ?';
    db.query(sql, [codigo, nome, categoria_id, preco, estoque_minimo || 3, imagem, id], (err) => {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar produto.' });
        res.json({ mensagem: 'Produto atualizado com sucesso!' });
    });
});

router.patch('/admin/produtos/:id/status', verificarAutenticacao, verificarAdmin, (req, res) => {
    const { id } = req.params;
    const { ativo } = req.body;

    db.query('UPDATE produtos SET ativo = ? WHERE id = ?', [Boolean(ativo), id], (err) => {
        if (err) return res.status(500).json({ erro: 'Erro ao alterar status do produto.' });
        res.json({ mensagem: 'Status alterado com sucesso!' });
    });
});


router.get('/perfil', verificarAutenticacao, (req, res) => {
    res.json({ usuario: req.usuario });
});

router.post('/logout', verificarAutenticacao, (req, res) => {
    res.json({ mensagem: 'Sessão encerrada com sucesso.' });
});



router.get('/admin/indicadores', verificarAutenticacao, verificarAdmin, (req, res) => {
    const sqlProdutos = 'SELECT COUNT(*) AS total FROM produtos WHERE ativo = TRUE';
    const sqlBaixo = 'SELECT COUNT(*) AS total FROM produtos WHERE ativo = TRUE AND estoque <= estoque_minimo';
    const sqlPedidos = 'SELECT COUNT(*) AS total FROM pedidos';

    db.query(sqlProdutos, (err1, resProdutos) => {
        if (err1) return res.status(500).json({ erro: 'Erro ao consultar total de produtos.' });

        db.query(sqlBaixo, (err2, resBaixo) => {
            if (err2) return res.status(500).json({ erro: 'Erro ao consultar estoque baixo.' });

            db.query(sqlPedidos, (err3, resPedidos) => {
                if (err3) return res.status(500).json({ erro: 'Erro ao consultar total de pedidos.' });

                res.json({
                    totalProdutos: resProdutos[0].total,
                    estoqueBaixo: resBaixo[0].total,
                    totalPedidos: resPedidos[0].total
                });
            });
        });
    });
});


router.post('/admin/estoque/movimentar', verificarAutenticacao, verificarAdmin, (req, res) => {
    const { produtoId, tipo, quantidade, motivo } = req.body;
    const qtd = Number(quantidade);

    if (!produtoId || !tipo || quantidade === undefined || !motivo || !motivo.trim()) {
        return res.status(400).json({ erro: 'Informe produto, tipo, quantidade e motivo.' });
    }

    if (Number.isNaN(qtd)) {
        return res.status(400).json({ erro: 'Quantidade inválida.' });
    }

    db.beginTransaction((errTx) => {
        if (errTx) return res.status(500).json({ erro: 'Erro ao iniciar transação.' });

        db.query('SELECT id, estoque FROM produtos WHERE id = ? FOR UPDATE', [produtoId], (errBusca, rows) => {
            if (errBusca) {
                return db.rollback(() => res.status(500).json({ erro: 'Erro ao consultar produto.' }));
            }
            if (rows.length === 0) {
                return db.rollback(() => res.status(404).json({ erro: 'Produto não encontrado.' }));
            }

            const saldoAtual = rows[0].estoque;
            let novoSaldo = saldoAtual;

            if (tipo === 'ENTRADA') {
                if (qtd <= 0) {
                    return db.rollback(() => res.status(400).json({ erro: 'Entrada deve ser maior que zero.' }));
                }
                novoSaldo = saldoAtual + qtd;
            } else if (tipo === 'SAIDA') {
                if (qtd <= 0) {
                    return db.rollback(() => res.status(400).json({ erro: 'Saída deve ser maior que zero.' }));
                }
                if (qtd > saldoAtual) {
                    return db.rollback(() => res.status(400).json({ erro: 'Saldo insuficiente para saída.' }));
                }
                novoSaldo = saldoAtual - qtd;
            } else if (tipo === 'AJUSTE') {
                if (qtd < 0) {
                    return db.rollback(() => res.status(400).json({ erro: 'Estoque ajustado não pode ser negativo.' }));
                }
                novoSaldo = qtd;
            } else {
                return db.rollback(() => res.status(400).json({ erro: 'Tipo de movimentação inválido.' }));
            }

            db.query('UPDATE produtos SET estoque = ? WHERE id = ?', [novoSaldo, produtoId], (errUpd) => {
                if (errUpd) {
                    return db.rollback(() => res.status(500).json({ erro: 'Erro ao atualizar estoque.' }));
                }

                const sqlMov = `
                    INSERT INTO movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, saldo_resultante, motivo)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                db.query(sqlMov, [produtoId, req.usuario.id, tipo, qtd, novoSaldo, motivo.trim()], (errMov) => {
                    if (errMov) {
                        return db.rollback(() => res.status(500).json({ erro: 'Erro ao registrar movimentação.' }));
                    }

                    db.commit((errCommit) => {
                        if (errCommit) {
                            return db.rollback(() => res.status(500).json({ erro: 'Erro ao confirmar movimentação.' }));
                        }
                        res.status(200).json({
                            mensagem: 'Movimentação registrada com sucesso!',
                            saldoResultante: novoSaldo
                        });
                    });
                });
            });
        });
    });
});


router.get('/admin/estoque/historico', verificarAutenticacao, verificarAdmin, (req, res) => {
    const sql = `
        SELECT m.id, p.codigo, p.nome AS produto, m.tipo, m.quantidade, m.saldo_resultante,
               m.motivo, m.data_movimentacao, u.nome AS responsavel
        FROM movimentacoes_estoque m
        INNER JOIN produtos p ON m.produto_id = p.id
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        ORDER BY m.data_movimentacao DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar histórico de estoque.' });
        res.json(results);
    });
});

router.post('/pedidos', verificarAutenticacao, (req, res) => {
    const { itens } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ erro: 'O carrinho está vazio.' });
    }

    db.beginTransaction((errTx) => {
        if (errTx) return res.status(500).json({ erro: 'Erro ao iniciar transação do pedido.' });

        let subtotal = 0;
        const itensValidados = [];
        let indice = 0;

        function validarProximoItem() {
            if (indice >= itens.length) {
                const desconto = subtotal >= 300 ? subtotal * 0.10 : 0;
                const valorFinal = subtotal - desconto;

                const sqlPedido = `
                    INSERT INTO pedidos (usuario_id, subtotal, desconto, valor_final, situacao)
                    VALUES (?, ?, ?, ?, 'Concluído')
                `;

                db.query(
                    sqlPedido,
                    [req.usuario.id, subtotal.toFixed(2), desconto.toFixed(2), valorFinal.toFixed(2)],
                    (errPed, resPed) => {
                        if (errPed) {
                            return db.rollback(() => res.status(500).json({ erro: 'Erro ao salvar pedido.' }));
                        }

                        const pedidoId = resPed.insertId;
                        let idxItem = 0;

                        function salvarProximoItem() {
                            if (idxItem >= itensValidados.length) {
                                return db.commit((errCommit) => {
                                    if (errCommit) {
                                        return db.rollback(() => res.status(500).json({ erro: 'Erro ao concluir pedido.' }));
                                    }
                                    res.status(201).json({
                                        mensagem: `Pedido #${pedidoId} concluído com sucesso!`,
                                        pedido: {
                                            id: pedidoId,
                                            subtotal: subtotal,
                                            desconto: desconto,
                                            valorFinal: valorFinal
                                        }
                                    });
                                });
                            }

                            const atual = itensValidados[idxItem];

                            db.query(
                                'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
                                [pedidoId, atual.produtoId, atual.quantidade, atual.precoUnitario.toFixed(2)],
                                (errItem) => {
                                    if (errItem) {
                                        return db.rollback(() => res.status(500).json({ erro: 'Erro ao registrar itens do pedido.' }));
                                    }

                                    db.query(
                                        'UPDATE produtos SET estoque = ? WHERE id = ?',
                                        [atual.novoSaldo, atual.produtoId],
                                        (errEst) => {
                                            if (errEst) {
                                                return db.rollback(() => res.status(500).json({ erro: 'Erro ao atualizar estoque.' }));
                                            }

                                            const sqlSaida = `
                                                INSERT INTO movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, saldo_resultante, motivo)
                                                VALUES (?, ?, 'SAIDA', ?, ?, ?)
                                            `;

                                            db.query(
                                                sqlSaida,
                                                [atual.produtoId, req.usuario.id, atual.quantidade, atual.novoSaldo, `Pedido #${pedidoId}`],
                                                (errMov) => {
                                                    if (errMov) {
                                                        return db.rollback(() => res.status(500).json({ erro: 'Erro ao registrar saída no estoque.' }));
                                                    }
                                                    idxItem++;
                                                    salvarProximoItem();
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }

                        salvarProximoItem();
                    }
                );
                return;
            }

            const itemReq = itens[indice];
            const qtd = Number(itemReq.quantidade);

            if (!itemReq.produtoId || Number.isNaN(qtd) || qtd <= 0) {
                return db.rollback(() => res.status(400).json({ erro: 'Item ou quantidade inválida no carrinho.' }));
            }

            db.query('SELECT id, nome, preco, estoque, ativo FROM produtos WHERE id = ? FOR UPDATE', [itemReq.produtoId], (errProd, rows) => {
                if (errProd) {
                    return db.rollback(() => res.status(500).json({ erro: 'Erro ao consultar produto.' }));
                }
                if (rows.length === 0 || !rows[0].ativo) {
                    return db.rollback(() => res.status(404).json({ erro: 'Produto indisponível ou inexistente.' }));
                }

                const prod = rows[0];
                if (prod.estoque < qtd) {
                    return db.rollback(() => {
                        res.status(400).json({ erro: `Estoque insuficiente para ${prod.nome} (disponível: ${prod.estoque}).` });
                    });
                }

                const precoUnit = Number(prod.preco);
                subtotal += precoUnit * qtd;

                itensValidados.push({
                    produtoId: prod.id,
                    quantidade: qtd,
                    precoUnitario: precoUnit,
                    novoSaldo: prod.estoque - qtd
                });

                indice++;
                validarProximoItem();
            });
        }

        validarProximoItem();
    });
});

router.get('/meus-pedidos', verificarAutenticacao, (req, res) => {
    const sqlPedidos = `
        SELECT id, subtotal, desconto, valor_final, situacao, data_pedido
        FROM pedidos
        WHERE usuario_id = ?
        ORDER BY data_pedido DESC
    `;

    db.query(sqlPedidos, [req.usuario.id], (err, pedidos) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar seus pedidos.' });

        if (pedidos.length === 0) {
            return res.json([]);
        }

        let pos = 0;

        function carregarItensPedido() {
            if (pos >= pedidos.length) {
                return res.json(pedidos);
            }

            const sqlItens = `
                SELECT ip.quantidade, ip.preco_unitario, pr.nome, pr.codigo
                FROM itens_pedido ip
                INNER JOIN produtos pr ON ip.produto_id = pr.id
                WHERE ip.pedido_id = ?
            `;

            db.query(sqlItens, [pedidos[pos].id], (errItens, itens) => {
                if (errItens) return res.status(500).json({ erro: 'Erro ao buscar itens do pedido.' });
                pedidos[pos].itens = itens;
                pos++;
                carregarItensPedido();
            });
        }

        carregarItensPedido();
    });
});

router.get('/admin/pedidos', verificarAutenticacao, verificarAdmin, (req, res) => {
    const sqlPedidos = `
        SELECT p.id, u.nome AS cliente, u.email, p.subtotal, p.desconto, p.valor_final, p.situacao, p.data_pedido
        FROM pedidos p
        INNER JOIN usuarios u ON p.usuario_id = u.id
        ORDER BY p.data_pedido DESC
    `;

    db.query(sqlPedidos, (err, pedidos) => {
        if (err) return res.status(500).json({ erro: 'Erro ao listar pedidos.' });

        if (pedidos.length === 0) {
            return res.json([]);
        }

        let pos = 0;

        function carregarItensAdmin() {
            if (pos >= pedidos.length) {
                return res.json(pedidos);
            }

            const sqlItens = `
                SELECT ip.quantidade, ip.preco_unitario, pr.nome, pr.codigo
                FROM itens_pedido ip
                INNER JOIN produtos pr ON ip.produto_id = pr.id
                WHERE ip.pedido_id = ?
            `;

            db.query(sqlItens, [pedidos[pos].id], (errItens, itens) => {
                if (errItens) return res.status(500).json({ erro: 'Erro ao buscar itens dos pedidos.' });
                pedidos[pos].itens = itens;
                pos++;
                carregarItensAdmin();
            });
        }

        carregarItensAdmin();
    });
});



module.exports = router