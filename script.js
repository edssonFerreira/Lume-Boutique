let produtos = [], carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]'), sessao = null, cadastro = false;
const $ = s => document.querySelector(s);
const somar = () => carrinho.reduce((a, i) => a + i.preco * i.qtd, 0);
const salvar = () => { localStorage.setItem('carrinho', JSON.stringify(carrinho)); $('#qtd').textContent = carrinho.reduce((a, i) => a + i.qtd, 0); };
document.addEventListener('click', e => { if (e.target.dataset.fechar !== undefined) e.target.closest('dialog').close(); });

// ---------- Vitrine ----------
async function carregar() {
    const { data, error } = await db.from('produtos').select('*').eq('ativo', true).order('criado_em', { ascending: false });
    if (error) { $('#vitrine').innerHTML = '<p>Não foi possível carregar os produtos. Tente novamente em instantes.</p>'; return; }
    produtos = data;
    const cats = [...new Set(data.map(p => p.categoria))];
    $('#filtro').innerHTML = '<option value="">Todos os produtos</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
    mostrar();
}
function mostrar() {
    const f = $('#filtro').value, lista = produtos.filter(p => !f || p.categoria === f);
    $('#vitrine').innerHTML = lista.length ? lista.map(p => {
        const tams = (p.tamanhos || '').split(',').map(t => t.trim()).filter(Boolean);
        return `<article class="card" data-id="${p.id}">
            <img src="${esc(p.imagem || '')}" alt="${esc(p.nome)}" loading="lazy">
            <h3>${esc(p.nome)}</h3><p>${esc(p.descricao)}</p><strong>${R(p.preco)}</strong>
            ${tams.length ? `<select aria-label="Tamanho">${tams.map(t => `<option>${esc(t)}</option>`).join('')}</select>` : ''}
            <button class="btn" data-add>Adicionar ao carrinho</button></article>`;
    }).join('') : '<p>Nenhum produto nesta categoria ainda.</p>';
}
$('#filtro').onchange = mostrar;
$('#vitrine').onclick = e => {
    if (!e.target.hasAttribute('data-add')) return;
    const c = e.target.closest('.card'), p = produtos.find(x => x.id == c.dataset.id), tam = c.querySelector('select')?.value || '';
    const i = carrinho.find(x => x.id === p.id && x.tam === tam);
    i ? i.qtd++ : carrinho.push({ id: p.id, nome: p.nome, preco: p.preco, tam, qtd: 1 });
    salvar(); e.target.textContent = 'Adicionado!'; setTimeout(() => e.target.textContent = 'Adicionar ao carrinho', 900);
};

// ---------- Carrinho e WhatsApp ----------
function desenharCarrinho() {
    $('#itens').innerHTML = carrinho.length ? carrinho.map((i, n) => `<div class="linha">
        <span>${esc(i.nome)}${i.tam ? ' (' + esc(i.tam) + ')' : ''}</span>
        <span><button class="mini" data-menos="${n}">−</button> ${i.qtd} <button class="mini" data-mais="${n}">+</button></span>
        <span>${R(i.preco * i.qtd)}</span></div>`).join('') : '<p>Seu carrinho está vazio.</p>';
    $('#total').textContent = R(somar());
}
$('#btnCarrinho').onclick = () => { desenharCarrinho(); $('#dlgCarrinho').showModal(); };
$('#itens').onclick = e => {
    const d = e.target.dataset, n = d.mais ?? d.menos;
    if (n === undefined) return;
    carrinho[n].qtd += d.mais !== undefined ? 1 : -1;
    if (carrinho[n].qtd < 1) carrinho.splice(n, 1);
    salvar(); desenharCarrinho();
};
$('#btnEnviar').onclick = async () => {
    if (!carrinho.length) return;
    if (!sessao) { $('#dlgCarrinho').close(); abrirConta('Entre ou crie uma conta para enviar o pedido.'); return; }
    const nome = sessao.user.user_metadata?.nome || sessao.user.email;
    const { error } = await db.from('pedidos').insert({ user_id: sessao.user.id, cliente: nome, itens: carrinho, total: somar() });
    if (error) { alert('Não foi possível registrar o pedido. Tente novamente.'); return; }
    const txt = 'Olá! Meu pedido na Lume Boutique:\n' +
        carrinho.map(i => `• ${i.qtd}x ${i.nome}${i.tam ? ' (' + i.tam + ')' : ''} - ${R(i.preco * i.qtd)}`).join('\n') +
        `\n\nTotal: ${R(somar())}\nCliente: ${nome}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`, '_blank');
    carrinho = []; salvar(); $('#dlgCarrinho').close();
};

// ---------- Login ----------
function abrirConta(m = '') { $('#msgConta').textContent = m; $('#dlgConta').showModal(); }
function modo(c) {
    cadastro = c; $('#nome').hidden = !c; $('#nome').required = c;
    $('#tituloConta').textContent = c ? 'Criar conta' : 'Entrar';
    $('#formConta .btn').textContent = c ? 'Criar conta' : 'Entrar';
    $('#trocaModo').textContent = c ? 'Já tenho conta' : 'Criar uma conta';
}
$('#trocaModo').onclick = () => modo(!cadastro);
$('#btnConta').onclick = () => sessao ? db.auth.signOut() : abrirConta();
$('#formConta').onsubmit = async e => {
    e.preventDefault();
    const email = $('#email').value, password = $('#senha').value;
    const r = cadastro
        ? await db.auth.signUp({ email, password, options: { data: { nome: $('#nome').value } } })
        : await db.auth.signInWithPassword({ email, password });
    if (r.error) { $('#msgConta').textContent = 'Não foi possível entrar. Confira o e-mail e a senha.'; return; }
    $('#dlgConta').close();
};
db.auth.onAuthStateChange((_, s) => { sessao = s; $('#btnConta').textContent = s ? 'Sair' : 'Entrar'; });
salvar(); carregar();
