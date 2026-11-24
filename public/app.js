class Produto {
    constructor(id, codigo, nome, categoria, categoriaId, preco, estoque, estoqueMinimo, imagem, ativo) {
        this.id = id;
        this.codigo = codigo;
        this.nome = nome;
        this.categoria = categoria;
        this.categoriaId = categoriaId;
        this.preco = Number(preco);
        this.estoque = Number(estoque);
        this.estoqueMinimo = Number(estoqueMinimo);
        this.imagem = imagem;
        this.ativo = Boolean(ativo);
    }

    estaDisponivel() {
        return this.ativo && this.estoque > 0;
    }
}

class Carrinho {
    constructor() {
        this.itens = [];
    }

    adicionarItem(produto) {
        let encontrado = null;
        for (let i = 0; i < this.itens.length; i++) {
            if (this.itens[i].produto.id === produto.id) {
                encontrado = this.itens[i];
                break;
            }
        }

        if (encontrado) {
            if (encontrado.quantidade < produto.estoque) {
                encontrado.quantidade++;
                return true;
            }
            alert("Quantidade máxima em estoque atingida para este produto.");
            return false;
        }

        if (!produto.estaDisponivel()) {
            alert("Produto indisponível no momento.");
            return false;
        }

        this.itens.push({ produto: produto, quantidade: 1 });
        return true;
    }

    removerItem(produtoId) {
        let idx = -1;
        let i = 0;
        while (i < this.itens.length) {
            if (this.itens[i].produto.id === produtoId) {
                idx = i;
                break;
            }
            i++;
        }

        if (idx !== -1) {
            this.itens.splice(idx, 1);
        }
    }

    alterarQuantidade(produtoId, delta) {
        for (let item of this.itens) {
            if (item.produto.id === produtoId) {
                const novaQtd = item.quantidade + delta;
                if (novaQtd <= 0) {
                    this.removerItem(produtoId);
                } else if (novaQtd > item.produto.estoque) {
                    alert("Quantidade superior ao estoque disponível.");
                } else {
                    item.quantidade = novaQtd;
                }
                break;
            }
        }
    }

    totalItens() {
        let soma = 0;
        for (let item of this.itens) {
            soma += item.quantidade;
        }
        return soma;
    }

    calcularSubtotal() {
        let subtotal = 0;
        for (let item of this.itens) {
            subtotal += item.produto.preco * item.quantidade;
        }
        return subtotal;
    }

    calcularDesconto(subtotal) {
        if (subtotal >= 300) {
            return subtotal * 0.10;
        }
        return 0;
    }

    calcularTotal() {
        const subtotal = this.calcularSubtotal();
        return subtotal - this.calcularDesconto(subtotal);
    }

    limpar() {
        this.itens = [];
    }
}

const API_URL = "/api";
const formatarMoeda = valor => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

let catalogoProdutos = [];
let categoriasLista = [];
const carrinho = new Carrinho();

let tokenAtual = localStorage.getItem("token") || null;
let usuarioAtual = JSON.parse(localStorage.getItem("usuario") || "null");

function obterHeaders(incluirJson = true) {
    const headers = {};
    if (incluirJson) {
        headers["Content-Type"] = "application/json";
    }
    if (tokenAtual) {
        headers["Authorization"] = `Bearer ${tokenAtual}`;
    }
    return headers;
}

function atualizarBarraUsuario() {
    const spanStatus = document.getElementById("statusUsuario");
    const btnAuth = document.getElementById("btnAbrirAuth");
    const btnMeusPedidos = document.getElementById("btnMeusPedidos");
    const btnPainelAdmin = document.getElementById("btnPainelAdmin");
    const btnLogout = document.getElementById("btnLogout");
    const secaoAdmin = document.getElementById("secaoAdmin");
    const secaoMeusPedidos = document.getElementById("secaoMeusPedidos");

    if (usuarioAtual) {
        spanStatus.textContent = `Olá, ${usuarioAtual.nome} (${usuarioAtual.perfil})`;
        btnAuth.classList.add("oculto");
        btnLogout.classList.remove("oculto");
        btnMeusPedidos.classList.remove("oculto");

        if (usuarioAtual.perfil === "ADMIN") {
            btnPainelAdmin.classList.remove("oculto");
        } else {
            btnPainelAdmin.classList.add("oculto");
            secaoAdmin.classList.add("oculto");
        }
    } else {
        spanStatus.textContent = "Visitante";
        btnAuth.classList.remove("oculto");
        btnLogout.classList.add("oculto");
        btnMeusPedidos.classList.add("oculto");
        btnPainelAdmin.classList.add("oculto");
        secaoAdmin.classList.add("oculto");
        secaoMeusPedidos.classList.add("oculto");
    }
}

async function carregarCategorias() {
    const resp = await fetch(`${API_URL}/categorias`);
    categoriasLista = await resp.json();

    const selectFiltro = document.getElementById("categoria");
    const selectAdmin = document.getElementById("prodCategoria");

    selectFiltro.innerHTML = `<option value="Todos">Todas as categorias</option>`;
    selectAdmin.innerHTML = "";

    for (let cat of categoriasLista) {
        selectFiltro.innerHTML += `<option value="${cat.nome}">${cat.nome}</option>`;
        selectAdmin.innerHTML += `<option value="${cat.id}">${cat.nome}</option>`;
    }
}

async function carregarProdutos() {
    const resp = await fetch(`${API_URL}/produtos`);
    const dados = await resp.json();

    catalogoProdutos = [];
    for (let item of dados) {
        catalogoProdutos.push(new Produto(
            item.id,
            item.codigo,
            item.nome,
            item.categoria,
            item.categoria_id,
            item.preco,
            item.estoque,
            item.estoque_minimo,
            item.imagem,
            item.ativo
        ));
    }

    exibirProdutos();
}

function exibirProdutos() {
    const container = document.getElementById("produtos");
    const msgBusca = document.getElementById("mensagemBusca");
    const termo = document.getElementById("busca").value.trim().toLowerCase();
    const categoriaSel = document.getElementById("categoria").value;

    container.innerHTML = "";
    const filtrados = [];

    for (let p of catalogoProdutos) {
        const matchNome = p.nome.toLowerCase().includes(termo);
        const matchCat = categoriaSel === "Todos" || p.categoria === categoriaSel;
        if (matchNome && matchCat) {
            filtrados.push(p);
        }
    }

    if (filtrados.length === 0) {
        msgBusca.textContent = "Nenhum produto encontrado para o filtro informado.";
        return;
    }

    msgBusca.textContent = "";

    for (let p of filtrados) {
        const disponivel = p.estaDisponivel();
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div>
                <img src="${p.imagem}" alt="${p.nome}">
                <h3>${p.nome}</h3>
                <p>Categoria: ${p.categoria}</p>
                <p class="preco">${formatarMoeda(p.preco)}</p>
                <p class="${disponivel ? "disponivel" : "indisponivel"}">
                    ${disponivel ? `Disponível (${p.estoque} em estoque)` : "Indisponível"}
                </p>
            </div>
            <button class="btnAdicionar" data-id="${p.id}" ${!disponivel ? "disabled" : ""}>
                Adicionar ao carrinho
            </button>
        `;
        container.appendChild(card);
    }

    const botoesAdd = document.querySelectorAll(".btnAdicionar");
    for (let btn of botoesAdd) {
        btn.addEventListener("click", function() {
            const idProd = Number(this.getAttribute("data-id"));
            const prod = catalogoProdutos.find(item => item.id === idProd);
            if (prod && carrinho.adicionarItem(prod)) {
                atualizarCarrinho();
            }
        });
    }
}

function atualizarCarrinho() {
    const divItens = document.getElementById("itensCarrinho");
    divItens.innerHTML = "";

    if (carrinho.itens.length === 0) {
        divItens.innerHTML = "<p>Seu carrinho está vazio.</p>";
    } else {
        for (let item of carrinho.itens) {
            const subtotalItem = item.produto.preco * item.quantidade;
            const linha = document.createElement("div");
            linha.className = "item-carrinho";
            linha.innerHTML = `
                <div>
                    <strong>${item.produto.nome}</strong>
                    <p>Unitário: ${formatarMoeda(item.produto.preco)} | Subtotal: ${formatarMoeda(subtotalItem)}</p>
                </div>
                <div class="controles">
                    <button class="btn-diminuir" data-id="${item.produto.id}">-</button>
                    <span>${item.quantidade}</span>
                    <button class="btn-aumentar" data-id="${item.produto.id}">+</button>
                    <button class="btn-remover" data-id="${item.produto.id}">Remover</button>
                </div>
            `;
            divItens.appendChild(linha);
        }
    }

    const subtotal = carrinho.calcularSubtotal();
    const desconto = carrinho.calcularDesconto(subtotal);
    const total = carrinho.calcularTotal();

    document.getElementById("contador").textContent = carrinho.totalItens();
    document.getElementById("totalItens").textContent = carrinho.totalItens();
    document.getElementById("subtotal").textContent = formatarMoeda(subtotal);
    document.getElementById("desconto").textContent = formatarMoeda(desconto);
    document.getElementById("total").textContent = formatarMoeda(total);

    for (let btn of document.querySelectorAll(".btn-aumentar")) {
        btn.addEventListener("click", function() {
            carrinho.alterarQuantidade(Number(this.getAttribute("data-id")), 1);
            atualizarCarrinho();
        });
    }

    for (let btn of document.querySelectorAll(".btn-diminuir")) {
        btn.addEventListener("click", function() {
            carrinho.alterarQuantidade(Number(this.getAttribute("data-id")), -1);
            atualizarCarrinho();
        });
    }

    for (let btn of document.querySelectorAll(".btn-remover")) {
        btn.addEventListener("click", function() {
            carrinho.removerItem(Number(this.getAttribute("data-id")));
            atualizarCarrinho();
        });
    }
}

async function finalizarCompra() {
    const msgPedido = document.getElementById("mensagemPedido");
    msgPedido.textContent = "";

    if (carrinho.itens.length === 0) {
        alert("Adicione ao menos um produto ao carrinho antes de finalizar a compra.");
        return;
    }

    if (!tokenAtual || !usuarioAtual) {
        alert("Para finalizar a compra, faça login ou cadastre-se. Seu carrinho será mantido.");
        document.getElementById("areaAutenticacao").classList.remove("oculto");
        return;
    }

    const itensPayload = [];
    for (let item of carrinho.itens) {
        itensPayload.push({
            produtoId: item.produto.id,
            quantidade: item.quantidade
        });
    }

    const resp = await fetch(`${API_URL}/pedidos`, {
        method: "POST",
        headers: obterHeaders(true),
        body: JSON.stringify({ itens: itensPayload })
    });

    const data = await resp.json();

    if (!resp.ok) {
        alert(data.erro || "Não foi possível concluir o pedido.");
        return;
    }

    alert(`${data.mensagem}\nSubtotal: ${formatarMoeda(data.pedido.subtotal)}\nDesconto: ${formatarMoeda(data.pedido.desconto)}\nTotal: ${formatarMoeda(data.pedido.valorFinal)}`);
    msgPedido.textContent = data.mensagem;

    carrinho.limpar();
    atualizarCarrinho();
    await carregarProdutos();
    if (!document.getElementById("secaoMeusPedidos").classList.contains("oculto")) {
        await carregarMeusPedidos();
    }
}

async function carregarMeusPedidos() {
    const container = document.getElementById("listaMeusPedidos");
    const resp = await fetch(`${API_URL}/meus-pedidos`, {
        headers: obterHeaders(false)
    });

    if (!resp.ok) {
        container.innerHTML = "<p>Faça login para visualizar seus pedidos.</p>";
        return;
    }

    const pedidos = await resp.json();
    if (pedidos.length === 0) {
        container.innerHTML = "<p>Você ainda não realizou nenhum pedido.</p>";
        return;
    }

    container.innerHTML = "";
    for (let ped of pedidos) {
        let itensHtml = "";
        for (let it of ped.itens || []) {
            itensHtml += `<li>${it.nome} (${it.quantidade}x) - ${formatarMoeda(it.preco_unitario)}</li>`;
        }

        const card = document.createElement("div");
        card.className = "card-pedido";
        card.innerHTML = `
            <div>
                <strong>Pedido #${ped.id}</strong> - Situação: ${ped.situacao}
                <p>Data: ${new Date(ped.data_pedido).toLocaleString("pt-BR")}</p>
                <ul>${itensHtml}</ul>
            </div>
            <div>
                <p>Subtotal: ${formatarMoeda(ped.subtotal)}</p>
                <p>Desconto: ${formatarMoeda(ped.desconto)}</p>
                <strong>Total: ${formatarMoeda(ped.valor_final)}</strong>
            </div>
        `;
        container.appendChild(card);
    }
}

async function carregarPainelAdmin() {
    const respInd = await fetch(`${API_URL}/admin/indicadores`, { headers: obterHeaders(false) });
    if (!respInd.ok) {
        alert("Acesso administrativo negado.");
        return;
    }
    const ind = await respInd.json();
    document.getElementById("indTotalProdutos").textContent = ind.totalProdutos;
    document.getElementById("indEstoqueBaixo").textContent = ind.estoqueBaixo;
    document.getElementById("indTotalPedidos").textContent = ind.totalPedidos;

    const respProds = await fetch(`${API_URL}/admin/produtos`, { headers: obterHeaders(false) });
    const prodsAdmin = await respProds.json();

    const divProds = document.getElementById("listaProdutosAdmin");
    const selectMov = document.getElementById("movProduto");
    divProds.innerHTML = "";
    selectMov.innerHTML = "";

    for (let p of prodsAdmin) {
        selectMov.innerHTML += `<option value="${p.id}">${p.codigo} - ${p.nome} (Saldo: ${p.estoque})</option>`;

        const linha = document.createElement("div");
        linha.className = "linha-admin";
        linha.innerHTML = `
            <div>
                <strong>${p.codigo} - ${p.nome}</strong> (${p.categoria}) |
                Preço: ${formatarMoeda(p.preco)} | Estoque: ${p.estoque} (Mín: ${p.estoque_minimo}) |
                Status: ${p.ativo ? "Ativo" : "Inativo"}
            </div>
            <div class="controles">
                <button class="btn-editar-prod" data-id="${p.id}">Editar</button>
                <button class="btn-status-prod" data-id="${p.id}" data-ativo="${p.ativo ? "true" : "false"}">
                    ${p.ativo ? "Desativar" : "Ativar"}
                </button>
            </div>
        `;
        divProds.appendChild(linha)
    }

    for (let btn of document.querySelectorAll(".btn-editar-prod")) {
        btn.addEventListener("click", function() {
            const id = Number(this.getAttribute("data-id"));
            const p = prodsAdmin.find(item => item.id === id);
            if (!p) return;

            document.getElementById("produtoEditId").value = p.id;
            document.getElementById("prodCodigo").value = p.codigo;
            document.getElementById("prodNome").value = p.nome;
            document.getElementById("prodCategoria").value = p.categoria_id;
            document.getElementById("prodPreco").value = p.preco;
            document.getElementById("prodEstoque").value = p.estoque;
            document.getElementById("prodEstoque").disabled = true;
            document.getElementById("prodMinimo").value = p.estoque_minimo;
            document.getElementById("prodImagem").value = p.imagem;
            document.getElementById("btnCancelarEdicao").classList.remove("oculto");
        });
    }

    for (let btn of document.querySelectorAll(".btn-status-prod")) {
        btn.addEventListener("click", async function() {
            const id = this.getAttribute("data-id");
            const ativoAtual = this.getAttribute("data-ativo") === "true";

            await fetch(`${API_URL}/admin/produtos/${id}/status`, {
                method: "PATCH",
                headers: obterHeaders(true),
                body: JSON.stringify({ ativo: !ativoAtual })
            });

            await carregarProdutos();
            await carregarPainelAdmin();
        });
    }

    const respHist = await fetch(`${API_URL}/admin/estoque/historico`, { headers: obterHeaders(false) });
    const historico = await respHist.json();
    const divHist = document.getElementById("listaHistoricoEstoque");
    divHist.innerHTML = "";

    for (let m of historico) {
        const linha = document.createElement("div");
        linha.className = "linha-admin";
        linha.innerHTML = `
            <div>
                <strong>[${m.tipo}]</strong> ${m.produto} | Qtd: ${m.quantidade} |
                Saldo resultante: ${m.saldo_resultante} | Motivo: ${m.motivo}
            </div>
            <div>
                <small>${m.responsavel || "Sistema"} - ${new Date(m.data_movimentacao).toLocaleString("pt-BR")}</small>
            </div>
        `;
        divHist.appendChild(linha);
    }

    const respPed = await fetch(`${API_URL}/admin/pedidos`, { headers: obterHeaders(false) });
    const pedidosAdmin = await respPed.json();
    const divPed = document.getElementById("listaPedidosAdmin");
    divPed.innerHTML = "";

    for (let ped of pedidosAdmin) {
        let itensTexto = "";
        for (let it of ped.itens || []) {
            itensTexto += `${it.nome} (${it.quantidade}x); `;
        }
        const linha = document.createElement("div");
        linha.className = "card-pedido";
        linha.innerHTML = `
            <div>
                <strong>Pedido #${ped.id}</strong> - Cliente: ${ped.cliente} (${ped.email})
                <p>Itens: ${itensTexto}</p>
            </div>
            <div>
                <strong>Total: ${formatarMoeda(ped.valor_final)}</strong> (${ped.situacao})
            </div>
        `;
        divPed.appendChild(linha);
    }
}

document.getElementById("busca").addEventListener("input", exibirProdutos);
document.getElementById("categoria").addEventListener("change", exibirProdutos);
document.getElementById("btnIrCarrinho").addEventListener("click", () => {
    document.getElementById("carrinho").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("btnFinalizar").addEventListener("click", finalizarCompra);

document.getElementById("btnAbrirAuth").addEventListener("click", () => {
    document.getElementById("areaAutenticacao").classList.toggle("oculto");
});
document.getElementById("btnFecharAuth").addEventListener("click", () => {
    document.getElementById("areaAutenticacao").classList.add("oculto");
});
document.getElementById("abaLogin").addEventListener("click", () => {
    document.getElementById("abaLogin").classList.add("ativa");
    document.getElementById("abaCadastro").classList.remove("ativa");
    document.getElementById("formLogin").classList.remove("oculto");
    document.getElementById("formCadastro").classList.add("oculto");
});
document.getElementById("abaCadastro").addEventListener("click", () => {
    document.getElementById("abaCadastro").classList.add("ativa");
    document.getElementById("abaLogin").classList.remove("ativa");
    document.getElementById("formCadastro").classList.remove("oculto");
    document.getElementById("formLogin").classList.add("oculto");
});

document.getElementById("formLogin").addEventListener("submit", async function(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginSenha").value;
    const msg = document.getElementById("mensagemAuth");

    const resp = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
    });
    const data = await resp.json();

    if (!resp.ok) {
        msg.textContent = data.erro || "Erro ao fazer login.";
        return;
    }

    tokenAtual = data.token;
    usuarioAtual = data.usuario;
    localStorage.setItem("token", tokenAtual);
    localStorage.setItem("usuario", JSON.stringify(usuarioAtual));

    msg.textContent = data.mensagem;
    document.getElementById("areaAutenticacao").classList.add("oculto");
    this.reset();
    atualizarBarraUsuario();
});

document.getElementById("formCadastro").addEventListener("submit", async function(e) {
    e.preventDefault();
    const nome = document.getElementById("cadastroNome").value;
    const email = document.getElementById("cadastroEmail").value;
    const senha = document.getElementById("cadastroSenha").value;
    const confirmacaoSenha = document.getElementById("cadastroConfirmacao").value;
    const msg = document.getElementById("mensagemAuth");

    const resp = await fetch(`${API_URL}/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha, confirmacaoSenha })
    });
    const data = await resp.json();

    if (!resp.ok) {
        msg.textContent = data.erro || "Erro ao cadastrar.";
        return;
    }

    msg.textContent = `${data.mensagem} Agora faça login para continuar.`;
    this.reset();
    document.getElementById("abaLogin").click();
});

document.getElementById("btnLogout").addEventListener("click", async () => {
    await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: obterHeaders(false)
    });
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    tokenAtual = null;
    usuarioAtual = null;
    atualizarBarraUsuario();
});

document.getElementById("btnMeusPedidos").addEventListener("click", async () => {
    const secao = document.getElementById("secaoMeusPedidos");
    secao.classList.toggle("oculto");
    if (!secao.classList.contains("oculto")) {
        await carregarMeusPedidos();
        setTimeout(() => {
            secao.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
    }
});

document.getElementById("btnPainelAdmin").addEventListener("click", async () => {
    const secao = document.getElementById("secaoAdmin");
    secao.classList.toggle("oculto");
    if (!secao.classList.contains("oculto")) {
        await carregarPainelAdmin();
        setTimeout(() => {
            secao.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
    }
});

document.getElementById("formProdutoAdmin").addEventListener("submit", async function(e) {
    e.preventDefault();
    const idEdit = document.getElementById("produtoEditId").value;
    const payload = {
        codigo: document.getElementById("prodCodigo").value,
        nome: document.getElementById("prodNome").value,
        categoria_id: Number(document.getElementById("prodCategoria").value),
        preco: Number(document.getElementById("prodPreco").value),
        estoque: Number(document.getElementById("prodEstoque").value),
        estoque_minimo: Number(document.getElementById("prodMinimo").value || 3),
        imagem: document.getElementById("prodImagem").value
    };

    const url = idEdit ? `${API_URL}/admin/produtos/${idEdit}` : `${API_URL}/admin/produtos`;
    const metodo = idEdit ? "PUT" : "POST";

    const resp = await fetch(url, {
        method: metodo,
        headers: obterHeaders(true),
        body: JSON.stringify(payload)
    });
    const data = await resp.json();

    if (!resp.ok) {
        alert(data.erro || "Erro ao salvar produto.");
        return;
    }

    alert(data.mensagem);
    this.reset();
    document.getElementById("produtoEditId").value = "";
    document.getElementById("prodEstoque").disabled = false;
    document.getElementById("btnCancelarEdicao").classList.add("oculto");

    await carregarProdutos();
    await carregarPainelAdmin();
});

document.getElementById("btnCancelarEdicao").addEventListener("click", () => {
    document.getElementById("formProdutoAdmin").reset();
    document.getElementById("produtoEditId").value = "";
    document.getElementById("prodEstoque").disabled = false;
    document.getElementById("btnCancelarEdicao").classList.add("oculto");
});

document.getElementById("formMovimentacao").addEventListener("submit", async function(e) {
    e.preventDefault();
    const payload = {
        produtoId: Number(document.getElementById("movProduto").value),
        tipo: document.getElementById("movTipo").value,
        quantidade: Number(document.getElementById("movQuantidade").value),
        motivo: document.getElementById("movMotivo").value
    };

    const resp = await fetch(`${API_URL}/admin/estoque/movimentar`, {
        method: "POST",
        headers: obterHeaders(true),
        body: JSON.stringify(payload)
    });
    const data = await resp.json();

    if (!resp.ok) {
        alert(data.erro || "Erro na movimentação.");
        return;
    }

    alert(`${data.mensagem} Novo saldo: ${data.saldoResultante}`);
    this.reset();
    await carregarProdutos();
    await carregarPainelAdmin();
});

async function iniciarAplicacao() {
    atualizarBarraUsuario();
    await carregarCategorias();
    await carregarProdutos();
    atualizarCarrinho();
}

iniciarAplicacao();