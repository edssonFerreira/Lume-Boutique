const $ = selector => document.querySelector(selector);
let itens = [];
let editando = null;
let toastTimer;
const aviso = mensagem => {
  const toast = $('#toast'); toast.textContent = mensagem; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
};
document.addEventListener('click', event => {
  const fechar = event.target.closest('[data-fechar]');
  if (fechar) fechar.closest('dialog')?.close();
});

async function checar() {
  if (!db || SUPABASE_KEY.includes('COLE_AQUI')) {
    $('#login').hidden = false;
    $('#msgLogin').textContent = 'Configure a chave pública do Supabase em js/config.js.';
    $('#login').querySelector('button[type="submit"]').disabled = true;
    return;
  }
  const { data: { session } } = await db.auth.getSession();
  $('#sair').hidden = !session;
  $('#login').hidden = !!session;
  $('#painel').hidden = true;
  if (!session) return;
  const { data, error } = await db.from('perfis').select('is_admin').eq('id', session.user.id).maybeSingle();
  if (error || !data?.is_admin) {
    $('#login').hidden = false;
    $('#msgLogin').textContent = 'Esta conta não tem acesso à administração. Use uma conta autorizada.';
    await db.auth.signOut();
    return;
  }
  $('#login').hidden = true; $('#painel').hidden = false;
  await Promise.all([listar(), pedidos()]);
}
$('#login').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#login button[type="submit"]'); button.disabled = true;
  $('#msgLogin').textContent = 'Verificando acesso...';
  const { error } = await db.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#senha').value });
  button.disabled = false;
  if (error) { $('#msgLogin').textContent = 'E-mail ou senha incorretos.'; return; }
  await checar();
});
$('#sair').addEventListener('click', async () => { await db.auth.signOut(); await checar(); });

async function listar() {
  const { data, error } = await db.from('produtos').select('*').order('criado_em', { ascending: false });
  if (error) { console.error(error); $('#lista').innerHTML = '<div class="empty-state">Não foi possível carregar os produtos. Confira as políticas de acesso do Supabase.</div>'; return; }
  itens = data || [];
  $('#statProdutos').textContent = itens.length;
  $('#statAtivos').textContent = itens.filter(p => p.ativo).length;
  desenharLista();
}
function desenharLista() {
  const busca = $('#buscaAdmin').value.trim().toLocaleLowerCase('pt-BR');
  const lista = itens.filter(p => `${p.nome || ''} ${p.categoria || ''}`.toLocaleLowerCase('pt-BR').includes(busca));
  $('#lista').innerHTML = lista.length ? lista.map(p => `<article class="admin-product">
    <img class="admin-product-image" src="${esc(p.imagem || imageFallback(p.nome))}" alt="Foto de ${esc(p.nome)}" loading="lazy" onerror="this.onerror=null;this.src='${imageFallback(p.nome)}'">
    <div class="admin-product-details"><strong>${esc(p.nome)}</strong><div class="admin-product-meta">${R(p.preco)} · ${esc(p.categoria || 'Geral')}<br>${p.tamanhos ? `Tamanhos: ${esc(p.tamanhos)}<br>` : ''}<span class="status-pill ${p.ativo ? '' : 'off'}">${p.ativo ? 'VISÍVEL NA LOJA' : 'OCULTO DA LOJA'}</span></div></div>
    <div class="admin-product-actions"><button class="mini-btn" type="button" data-a="editar" data-id="${Number(p.id)}">Editar</button><button class="mini-btn" type="button" data-a="ocultar" data-id="${Number(p.id)}">${p.ativo ? 'Ocultar' : 'Mostrar'}</button><button class="mini-btn danger" type="button" data-a="excluir" data-id="${Number(p.id)}">Excluir</button></div>
  </article>`).join('') : `<div class="empty-state"><strong>${itens.length ? 'Nenhum resultado.' : 'Sua loja começa aqui.'}</strong>${itens.length ? 'Tente buscar por outro nome ou categoria.' : 'Clique em “Adicionar produto” para cadastrar o primeiro item.'}</div>`;
}
$('#buscaAdmin').addEventListener('input', desenharLista);
$('#lista').addEventListener('click', async event => {
  const button = event.target.closest('[data-a]'); if (!button) return;
  const action = button.dataset.a; const product = itens.find(item => Number(item.id) === Number(button.dataset.id));
  if (!product) return;
  if (action === 'editar') { abrir(product); return; }
  button.disabled = true;
  if (action === 'ocultar') {
    const { error } = await db.from('produtos').update({ ativo: !product.ativo }).eq('id', product.id);
    if (error) aviso('Não foi possível alterar a visibilidade do produto.'); else aviso(product.ativo ? 'Produto ocultado da loja.' : 'Produto publicado na loja.');
  }
  if (action === 'excluir') {
    if (!confirm(`Tem certeza de que deseja excluir “${product.nome}”? Essa ação não pode ser desfeita.`)) { button.disabled = false; return; }
    const { error } = await db.from('produtos').delete().eq('id', product.id);
    if (error) { aviso('Não foi possível excluir o produto.'); button.disabled = false; return; }
    aviso('Produto excluído.');
  }
  await listar();
});
function abrir(product) {
  editando = product;
  const form = $('#form'); form.reset(); $('#msg').textContent = '';
  $('#tit').innerHTML = product ? 'Editar produto<span>.</span>' : 'Novo produto<span>.</span>';
  if (product) {
    for (const key of ['nome', 'descricao', 'preco', 'categoria', 'tamanhos']) form.elements[key].value = product[key] ?? '';
    form.elements.ativo.checked = Boolean(product.ativo);
  } else form.elements.ativo.checked = true;
  $('#dlg').showModal();
}
$('#novo').addEventListener('click', () => abrir(null));
$('#form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget; const button = form.querySelector('button[type="submit"]');
  button.disabled = true; $('#msg').textContent = 'Salvando produto...';
  try {
    let imagem = editando?.imagem || null;
    const foto = form.elements.foto.files[0];
    if (foto) {
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
      if (!tiposPermitidos.includes(foto.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.');
      if (foto.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.');
      const nomeSeguro = `${crypto.randomUUID()}-${foto.name.replace(/[^\w.-]/g, '_').slice(-100)}`;
      const { error: uploadError } = await db.storage.from('produtos').upload(nomeSeguro, foto, { contentType: foto.type, upsert: false });
      if (uploadError) throw new Error('Não foi possível enviar a foto. Confira as políticas do Storage.');
      imagem = db.storage.from('produtos').getPublicUrl(nomeSeguro).data.publicUrl;
    }
    const dados = {
      nome: form.elements.nome.value.trim(), descricao: form.elements.descricao.value.trim(),
      preco: Number(form.elements.preco.value), categoria: form.elements.categoria.value.trim(),
      tamanhos: form.elements.tamanhos.value.trim(), ativo: form.elements.ativo.checked, imagem
    };
    const result = editando
      ? await db.from('produtos').update(dados).eq('id', editando.id)
      : await db.from('produtos').insert(dados);
    if (result.error) throw new Error('Não foi possível salvar. Confira as permissões do banco e os campos.');
    $('#dlg').close(); aviso(editando ? 'Produto atualizado!' : 'Produto cadastrado!');
    await listar();
  } catch (error) {
    console.error(error); $('#msg').textContent = error.message || 'Ocorreu um erro ao salvar.';
  } finally { button.disabled = false; }
});
async function pedidos() {
  const { data, error } = await db.from('pedidos').select('id,cliente,itens,total,criado_em').order('criado_em', { ascending: false }).limit(20);
  if (error) { console.error(error); $('#pedidos').innerHTML = '<div class="empty-state">Não foi possível carregar os pedidos. Verifique as políticas de acesso do Supabase.</div>'; $('#statPedidos').textContent = '—'; return; }
  $('#statPedidos').textContent = data?.length || 0;
  $('#pedidos').innerHTML = data?.length ? data.map(order => {
    const itensPedido = Array.isArray(order.itens) ? order.itens : [];
    return `<article class="order-row"><div class="order-date"><strong>${new Date(order.criado_em).toLocaleDateString('pt-BR')}</strong>${new Date(order.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}<br>${esc(order.cliente || 'Cliente')}</div><div class="order-items">${itensPedido.map(item => `${Number(item.qtd) || 0}x ${esc(item.nome)}${item.tam ? ` (${esc(item.tam)})` : ''}`).join('<br>') || 'Itens não disponíveis'}</div><strong class="order-total">${R(order.total)}</strong></article>`;
  }).join('') : '<div class="empty-state"><strong>Nenhum pedido por enquanto.</strong>Quando alguém fizer um pedido, ele aparecerá aqui.</div>';
}
if (db) db.auth.onAuthStateChange(() => { setTimeout(checar, 0); });
checar();
