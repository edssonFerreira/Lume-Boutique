let produtos = [];
let carrinho = [];
let sessao = null;
let cadastro = false;
let toastTimer;
const $ = selector => document.querySelector(selector);
const somar = () => carrinho.reduce((total, item) => total + Number(item.preco) * item.qtd, 0);

try {
  const guardado = JSON.parse(localStorage.getItem('lume-carrinho') || '[]');
  carrinho = Array.isArray(guardado) ? guardado.filter(i => i && Number.isFinite(Number(i.id)) && Number(i.qtd) > 0) : [];
} catch { carrinho = []; }

function aviso(mensagem) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}
function salvarCarrinho() {
  localStorage.setItem('lume-carrinho', JSON.stringify(carrinho));
  $('#qtd').textContent = carrinho.reduce((total, item) => total + item.qtd, 0);
}
document.addEventListener('click', event => {
  const fechar = event.target.closest('[data-fechar]');
  if (fechar) fechar.closest('dialog')?.close();
});
$('#ano').textContent = new Date().getFullYear();

async function carregar() {
  if (!db || SUPABASE_KEY.includes('COLE_AQUI')) {
    $('#vitrine').innerHTML = '<div class="empty-state"><strong>Falta configurar a loja</strong>Adicione a chave pública do Supabase em <code>js/config.js</code> para carregar os produtos.</div>';
    $('#contadorProdutos').textContent = 'Configuração necessária';
    $('#vitrine').setAttribute('aria-busy', 'false');
    return;
  }
  $('#vitrine').setAttribute('aria-busy', 'true');
  const { data, error } = await db.from('produtos').select('id,nome,descricao,preco,categoria,tamanhos,imagem,criado_em').eq('ativo', true).order('criado_em', { ascending: false });
  $('#vitrine').setAttribute('aria-busy', 'false');
  if (error) {
    console.error(error);
    $('#vitrine').innerHTML = '<div class="empty-state"><strong>Não conseguimos carregar a coleção.</strong>Confira a conexão com o Supabase e tente novamente.</div>';
    $('#contadorProdutos').textContent = 'Erro ao carregar';
    return;
  }
  produtos = data || [];
  const categorias = [...new Set(produtos.map(p => (p.categoria || 'Geral').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  $('#filtro').innerHTML = '<option value="">Todas</option>' + categorias.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  mostrar();
}
function mostrar() {
  const filtro = $('#filtro').value;
  const busca = $('#busca').value.trim().toLocaleLowerCase('pt-BR');
  const ordenar = $('#ordenar').value;
  let lista = produtos.filter(p => {
    const categoriaOk = !filtro || (p.categoria || 'Geral') === filtro;
    const texto = `${p.nome || ''} ${p.descricao || ''} ${p.categoria || ''}`.toLocaleLowerCase('pt-BR');
    return categoriaOk && (!busca || texto.includes(busca));
  });
  if (ordenar === 'menor') lista.sort((a,b) => Number(a.preco)-Number(b.preco));
  if (ordenar === 'maior') lista.sort((a,b) => Number(b.preco)-Number(a.preco));
  if (ordenar === 'nome') lista.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  $('#contadorProdutos').textContent = `${lista.length} ${lista.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
  $('#vitrine').innerHTML = lista.length ? lista.map((p, index) => {
    const tamanhos = String(p.tamanhos || '').split(',').map(t => t.trim()).filter(Boolean);
    const imagem = p.imagem ? esc(p.imagem) : imageFallback(p.nome);
    return `<article class="product-card" data-id="${Number(p.id)}" style="animation-delay:${Math.min(index, 8) * 35}ms">
      <div class="product-image-wrap"><img src="${imagem}" alt="${esc(p.nome)}" loading="lazy" onerror="this.onerror=null;this.src='${imageFallback(p.nome)}'"><span class="product-tag">Lume selection</span></div>
      <div class="product-info"><p class="product-category">${esc(p.categoria || 'Geral')}</p><h3>${esc(p.nome)}</h3><p class="product-description">${esc(p.descricao || 'Uma escolha cheia de personalidade.')}</p><strong class="product-price">${R(p.preco)}</strong>
      ${tamanhos.length ? `<label class="sr-only" for="tam-${Number(p.id)}">Escolha o tamanho de ${esc(p.nome)}</label><select id="tam-${Number(p.id)}" class="product-size" aria-label="Tamanho de ${esc(p.nome)}"><option value="">Escolha o tamanho</option>${tamanhos.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select>` : ''}
      <button class="product-add" type="button" data-add="${Number(p.id)}">Adicionar ao carrinho <span aria-hidden="true">＋</span></button></div></article>`;
  }).join('') : '<div class="empty-state"><strong>Nenhum produto encontrado.</strong>Tente mudar a categoria ou buscar por outro termo.</div>';
}
$('#filtro').addEventListener('change', mostrar);
$('#busca').addEventListener('input', mostrar);
$('#ordenar').addEventListener('change', mostrar);
$('#vitrine').addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const id = Number(button.dataset.add);
  const produto = produtos.find(p => Number(p.id) === id);
  if (!produto) return;
  const card = button.closest('.product-card');
  const seletorTamanho = card.querySelector('.product-size');
  const tamanho = seletorTamanho?.value || '';
  if (seletorTamanho && !tamanho) {
    seletorTamanho.focus();
    aviso('Escolha um tamanho antes de adicionar.');
    return;
  }
  const existente = carrinho.find(item => Number(item.id) === id && item.tam === tamanho);
  if (existente) existente.qtd++;
  else carrinho.push({ id, nome: produto.nome, preco: Number(produto.preco), tam: tamanho, qtd: 1 });
  salvarCarrinho();
  button.classList.add('added');
  button.innerHTML = 'Adicionado! <span aria-hidden="true">✓</span>';
  setTimeout(() => { button.classList.remove('added'); button.innerHTML = 'Adicionar ao carrinho <span aria-hidden="true">＋</span>'; }, 1000);
  aviso(`${produto.nome} adicionado ao carrinho.`);
});

function desenharCarrinho() {
  $('#itens').innerHTML = carrinho.length ? carrinho.map((item, index) => `<div class="cart-item">
    <div class="cart-item-name">${esc(item.nome)}${item.tam ? `<span class="cart-item-size">Tamanho: ${esc(item.tam)}</span>` : ''}</div>
    <div class="qty-controls"><button type="button" data-menos="${index}" aria-label="Diminuir quantidade de ${esc(item.nome)}">−</button><span>${item.qtd}</span><button type="button" data-mais="${index}" aria-label="Aumentar quantidade de ${esc(item.nome)}">＋</button></div>
    <strong class="cart-item-price">${R(Number(item.preco) * item.qtd)}</strong></div>`).join('') : '<p class="cart-empty">Seu carrinho está vazio. Explore a coleção e adicione seus favoritos!</p>';
  $('#total').textContent = R(somar());
  $('#btnEnviar').disabled = carrinho.length === 0;
}
$('#btnCarrinho').addEventListener('click', () => { desenharCarrinho(); $('#dlgCarrinho').showModal(); });
$('#itens').addEventListener('click', event => {
  const button = event.target.closest('[data-mais], [data-menos]');
  if (!button) return;
  const index = Number(button.dataset.mais ?? button.dataset.menos);
  if (!carrinho[index]) return;
  carrinho[index].qtd += button.dataset.mais !== undefined ? 1 : -1;
  if (carrinho[index].qtd < 1) carrinho.splice(index, 1);
  salvarCarrinho(); desenharCarrinho();
});
$('#btnEnviar').addEventListener('click', async () => {
  if (!carrinho.length) return;
  if (!/^\d{10,15}$/.test(WHATSAPP) || WHATSAPP === '5511999999999') {
    aviso('Configure o WhatsApp real da loja no arquivo js/config.js.');
    return;
  }
  if (!sessao) {
    $('#dlgCarrinho').close();
    abrirConta('Entre ou crie uma conta para registrar seu pedido.');
    return;
  }
  const button = $('#btnEnviar');
  button.disabled = true;
  button.textContent = 'Registrando pedido...';
  const nome = sessao.user.user_metadata?.nome || sessao.user.email || 'Cliente';
  const total = somar();
  const itensPedido = carrinho.map(item => ({ id: item.id, nome: item.nome, preco: Number(item.preco), tam: item.tam, qtd: item.qtd }));
  const { error } = await db.from('pedidos').insert({ user_id: sessao.user.id, cliente: nome, itens: itensPedido, total });
  if (error) {
    console.error(error);
    aviso('Não foi possível registrar o pedido. Tente novamente.');
    button.disabled = false; button.innerHTML = 'Enviar pedido pelo WhatsApp <span>↗</span>';
    return;
  }
  const texto = 'Olá! Quero fazer um pedido na Lume Boutique:\n\n' + itensPedido.map(item => `• ${item.qtd}x ${item.nome}${item.tam ? ` (tamanho ${item.tam})` : ''} — ${R(item.preco * item.qtd)}`).join('\n') + `\n\nTotal: ${R(total)}\nCliente: ${nome}\nE-mail: ${sessao.user.email || ''}`;
  const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
  window.location.href = url;
  carrinho = []; salvarCarrinho(); $('#dlgCarrinho').close();
  button.disabled = false; button.innerHTML = 'Enviar pedido pelo WhatsApp <span>↗</span>';
  aviso('Pedido registrado. Confira a nova aba do WhatsApp para enviar a mensagem.');
});

function abrirConta(mensagem = '') {
  $('#msgConta').textContent = mensagem;
  $('#msgConta').classList.remove('success');
  $('#dlgConta').showModal();
}
function modo(criar) {
  cadastro = criar;
  $('#nomeLabel').hidden = !criar;
  $('#nome').required = criar;
  $('#senha').autocomplete = criar ? 'new-password' : 'current-password';
  $('#tituloConta').innerHTML = criar ? 'Crie sua conta<span>.</span>' : 'Entre na sua conta<span>.</span>';
  $('#formConta button[type="submit"]').textContent = criar ? 'Criar minha conta' : 'Entrar';
  $('#trocaModo').textContent = criar ? 'Já tem conta? Entrar' : 'Ainda não tem conta? Criar conta';
  $('#msgConta').textContent = '';
}
$('#trocaModo').addEventListener('click', () => modo(!cadastro));
$('#btnConta').addEventListener('click', async () => {
  if (sessao) {
    const { error } = await db.auth.signOut();
    if (error) aviso('Não foi possível sair agora.');
  } else { modo(false); abrirConta(); }
});
$('#formConta').addEventListener('submit', async event => {
  event.preventDefault();
  const submit = $('#formConta button[type="submit"]');
  submit.disabled = true;
  $('#msgConta').textContent = cadastro ? 'Criando sua conta...' : 'Entrando...';
  const email = $('#email').value.trim();
  const password = $('#senha').value;
  const result = cadastro
    ? await db.auth.signUp({ email, password, options: { data: { nome: $('#nome').value.trim() } } })
    : await db.auth.signInWithPassword({ email, password });
  submit.disabled = false;
  if (result.error) {
    console.error(result.error);
    $('#msgConta').textContent = cadastro ? 'Não foi possível criar a conta. Verifique os dados ou tente outro e-mail.' : 'E-mail ou senha incorretos.';
    return;
  }
  if (cadastro && !result.data.session) {
    $('#msgConta').textContent = 'Conta criada! Confira seu e-mail para confirmar o cadastro antes de entrar.';
    $('#msgConta').classList.add('success');
    return;
  }
  $('#dlgConta').close();
  aviso(cadastro ? 'Conta criada com sucesso!' : 'Você entrou na sua conta.');
});
if (db) {
  db.auth.onAuthStateChange((_event, session) => {
    sessao = session;
    $('#btnConta').textContent = session ? 'Sair' : 'Entrar';
  });
  db.auth.getSession().then(({ data }) => { sessao = data.session; $('#btnConta').textContent = sessao ? 'Sair' : 'Entrar'; });
}
salvarCarrinho();
carregar();
