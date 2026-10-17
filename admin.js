const $ = s => document.querySelector(s);
let itens = [], editando = null;
document.addEventListener('click', e => { if (e.target.dataset.fechar !== undefined) e.target.closest('dialog').close(); });

async function checar() {
    const { data: { session } } = await db.auth.getSession();
    $('#sair').hidden = !session; $('#login').hidden = !!session; $('#painel').hidden = true;
    if (!session) return;
    const { data } = await db.from('perfis').select('is_admin').eq('id', session.user.id).single();
    if (!data?.is_admin) { $('#login').hidden = false; $('#msgLogin').textContent = 'Esta conta não tem acesso à administração.'; return; }
    $('#login').hidden = true; $('#painel').hidden = false; listar(); pedidos();
}
$('#login').onsubmit = async e => {
    e.preventDefault();
    const { error } = await db.auth.signInWithPassword({ email: $('#email').value, password: $('#senha').value });
    if (error) { $('#msgLogin').textContent = 'E-mail ou senha incorretos.'; return; }
    checar();
};
$('#sair').onclick = async () => { await db.auth.signOut(); checar(); };

async function listar() {
    const { data, error } = await db.from('produtos').select('*').order('criado_em', { ascending: false });
    if (error) { $('#lista').innerHTML = '<p>Não foi possível carregar os produtos.</p>'; return; }
    itens = data;
    $('#lista').innerHTML = data.length ? data.map(p => `<div class="linha prod">
        <img src="${esc(p.imagem || '')}" alt="">
        <span><b>${esc(p.nome)}</b><br>${R(p.preco)} - ${esc(p.categoria)} - ${p.ativo ? 'Visível' : 'Oculto'}</span>
        <span><button class="mini" data-a="editar" data-id="${p.id}">Editar</button>
        <button class="mini" data-a="ocultar" data-id="${p.id}">${p.ativo ? 'Ocultar' : 'Mostrar'}</button>
        <button class="mini perigo" data-a="excluir" data-id="${p.id}">Excluir</button></span></div>`).join('')
        : '<p>Nenhum produto ainda. Clique em "Adicionar produto" para começar.</p>';
}
$('#lista').onclick = async e => {
    const a = e.target.dataset.a, p = itens.find(x => x.id == e.target.dataset.id);
    if (!a) return;
    if (a === 'editar') abrir(p);
    if (a === 'ocultar') { await db.from('produtos').update({ ativo: !p.ativo }).eq('id', p.id); listar(); }
    if (a === 'excluir' && confirm(`Excluir "${p.nome}" para sempre?`)) { await db.from('produtos').delete().eq('id', p.id); listar(); }
};
function abrir(p) {
    editando = p; const f = $('#form'); f.reset(); $('#msg').textContent = '';
    $('#tit').textContent = p ? 'Editar produto' : 'Novo produto';
    if (p) { for (const k of ['nome', 'descricao', 'preco', 'categoria', 'tamanhos']) f[k].value = p[k] ?? ''; f.ativo.checked = p.ativo; }
    $('#dlg').showModal();
}
$('#novo').onclick = () => abrir(null);
$('#form').onsubmit = async e => {
    e.preventDefault(); const f = e.target, btn = f.querySelector('.btn');
    btn.disabled = true; $('#msg').textContent = 'Salvando...';
    let imagem = editando?.imagem || null;
    const foto = f.foto.files[0];
    if (foto) {
        const nome = Date.now() + '-' + foto.name.replace(/[^\w.]/g, '_');
        const up = await db.storage.from('produtos').upload(nome, foto);
        if (up.error) { $('#msg').textContent = 'Não foi possível enviar a foto. Tente outra imagem.'; btn.disabled = false; return; }
        imagem = db.storage.from('produtos').getPublicUrl(nome).data.publicUrl;
    }
    const dados = { nome: f.nome.value, descricao: f.descricao.value, preco: f.preco.value, categoria: f.categoria.value, tamanhos: f.tamanhos.value, ativo: f.ativo.checked, imagem };
    const r = editando ? await db.from('produtos').update(dados).eq('id', editando.id) : await db.from('produtos').insert(dados);
    btn.disabled = false;
    if (r.error) { $('#msg').textContent = 'Não foi possível salvar. Confira os campos.'; return; }
    $('#dlg').close(); listar();
};
async function pedidos() {
    const { data } = await db.from('pedidos').select('*').order('criado_em', { ascending: false }).limit(20);
    $('#pedidos').innerHTML = data?.length ? data.map(p => `<div class="linha">
        <span>${new Date(p.criado_em).toLocaleString('pt-BR')} - ${esc(p.cliente)}</span>
        <span>${p.itens.map(i => `${i.qtd}x ${esc(i.nome)}${i.tam ? ' (' + esc(i.tam) + ')' : ''}`).join(', ')}</span>
        <b>${R(p.total)}</b></div>`).join('') : '<p>Nenhum pedido recebido ainda.</p>';
}
checar();
