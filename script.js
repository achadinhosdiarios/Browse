(() => {
  'use strict';
(function () {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function toggleTheme() {
  const btn = document.querySelector('.theme-toggle');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  if (btn) btn.classList.add('switching');
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeToggle();
  window.setTimeout(() => btn && btn.classList.remove('switching'), 220);
}

let currentTab = 'home';
const tabOrder = ['home', 'explorer', 'search'];

function updateNavIndicator(activeBtn) {
  const indicator = document.getElementById('navIndicator');
  if (!indicator || !activeBtn) return;
  indicator.style.width = activeBtn.offsetWidth + 'px';
  indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
}

function scrollToFooter(event) {
  if (event) event.preventDefault();
  closeAllDropdowns?.();
  const footer = document.getElementById('siteFooter');
  if (!footer) return;
  footer.scrollIntoView({ behavior: 'smooth', block: 'end' });
}


const API_URL = "https://script.google.com/macros/s/AKfycbwO7BQje-TFZ1IXTwAk69PR8kAe74hHb2KV4jY-iNLAUzv-cAbDO0aHiItO9goLMENnfw/exec";
const API_KEY = "netinho2007";

const CACHE_VERSION = 'achadinhos_home_v2';
const CACHE_KEY = `${CACHE_VERSION}:produtos`;
const PRICE_HISTORY_KEY = `${CACHE_VERSION}:precos_v1`;
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;
const SEARCH_DEBOUNCE_MS = 90;

let db = [], visible = [], catAtual = 'todos', sortAtual = 'recente';
let homeListMode = '';
let currentHash = '', lastRenderKey = '', filtroTimer = null;

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

async function carregar(forceNetwork = false) {
  const cache = lerCacheProdutos();

  if (!forceNetwork && cache?.data?.length) {
    db = cache.data;
    currentHash = cache.hash || hashProdutos(db);
    montarFiltros();
    aplicarFiltros();
    updateHomeStats(cache.savedAt);
  } else if (!db.length) {
    renderSkeleton();
  }

  setRefreshState(forceNetwork ? 'loading' : 'idle');

  try {
    const data = await fetchComTimeout(`${API_URL}?action=listar&key=${encodeURIComponent(API_KEY)}&t=${Date.now()}`, FETCH_TIMEOUT_MS);
    const raw = Array.isArray(data) ? data : (data.produtos || data.data || []);
    const normalizados = anotarMudancasPreco(raw.map(normalizar).filter(p => p.status === 'feito'));
    const nextHash = hashProdutos(normalizados);
    const changed = nextHash !== currentHash || forceNetwork;

    salvarCacheProdutos(normalizados, nextHash);

    if (changed) {
      db = normalizados;
      currentHash = nextHash;
      montarFiltros();
      aplicarFiltros(true);
    }

    updateHomeStats(Date.now());
    setRefreshState('done', changed && forceNetwork ? 'Novidades verificadas' : 'Tudo atualizado');
  } catch (e) {
    console.error(e);
    setRefreshState('error');
    if (!cache?.data?.length && !db.length) {
      document.getElementById('grid').innerHTML = `
      <div class="state-box">
        <div class="ico">💔</div>
        <h3>Ops, algo deu errado</h3>
        <p>Não foi possível conectar ao banco de achadinhos. Tente recarregar a página.</p>
      </div>`;
    }
  }
}

function refreshProducts() {
  return carregar(true);
}

async function fetchComTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function lerCacheProdutos() {
  try {
    const payload = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!payload || payload.version !== CACHE_VERSION || !Array.isArray(payload.data)) return null;
    payload.stale = Date.now() - Number(payload.savedAt || 0) > CACHE_TTL_MS;
    return payload;
  } catch (e) {
    return null;
  }
}

function salvarCacheProdutos(data, hash) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      savedAt: Date.now(),
      hash,
      data
    }));
  } catch (e) {
    try { localStorage.removeItem(CACHE_KEY); } catch (_) { }
  }
}

function produtoKey(p) {
  return String(p.id || p.link || p.titulo || '').trim();
}

function lerHistoricoPrecos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function salvarHistoricoPrecos(hist) {
  try {
    localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(hist));
  } catch (e) {
    // Se o navegador negar espaço, seguimos sem o marcador de histórico.
  }
}

function anotarMudancasPreco(lista) {
  const hist = lerHistoricoPrecos();
  const agora = Date.now();
  const out = lista.map(p => {
    const key = produtoKey(p);
    const atual = pNum(p);
    const anterior = key && hist[key] ? Number(hist[key].precoNum || 0) : 0;
    const clone = { ...p };

    if (key && anterior > 0 && atual > 0 && Math.abs(atual - anterior) >= 0.01) {
      const delta = atual - anterior;
      const pct = anterior ? (delta / anterior) * 100 : 0;
      clone.precoMudanca = {
        tipo: delta < 0 ? 'queda' : 'alta',
        anterior,
        atual,
        delta,
        pct,
        detectadoEm: agora
      };
    }

    if (key && atual > 0) {
      hist[key] = {
        precoNum: atual,
        precoFmt: fmt(atual),
        titulo: p.titulo || '',
        updatedAt: agora
      };
    }

    return clone;
  });

  salvarHistoricoPrecos(hist);
  return out;
}

function agendarFiltros() {
  clearTimeout(filtroTimer);
  filtroTimer = setTimeout(() => aplicarFiltros(), SEARCH_DEBOUNCE_MS);
}

function normalizeStr(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function ordenar(lista, c) {
  const a = [...lista];
  if (c === 'preco-asc') return a.sort((x, y) => pNum(x) - pNum(y));
  if (c === 'preco-desc') return a.sort((x, y) => pNum(y) - pNum(x));
  if (c === 'az') return a.sort((x, y) => (x.titulo || '').localeCompare(y.titulo || ''));
  return a;
}

function renderSkeleton() {
  document.getElementById('grid').innerHTML = Array(6).fill(0).map(() => `
    <div class="skel">
      <div class="skel-img"></div>
      <div class="skel-line title"></div>
      <div class="skel-line price"></div>
      <div class="skel-line button"></div>
    </div>`).join('');
}

function numeroDeterministico(seed, min, max, decimals = 0) {
  let hash = 2166136261;
  const str = String(seed || '');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0) / 4294967295;
  const value = min + normalized * (max - min);
  return decimals ? value.toFixed(decimals) : Math.floor(value);
}

function precoMudancaHtml(p) {
  const m = p && p.precoMudanca;
  if (!m || !m.tipo) return '';
  const pctAbs = Math.abs(Number(m.pct || 0));
  const pct = pctAbs >= 0.1 ? `${pctAbs.toFixed(1).replace('.', ',')}%` : '';
  if (m.tipo === 'queda') {
    return `<span class="price-change drop">🔥 Baixou ${pct ? pct + ' ' : ''}desde a última visita</span>`;
  }
  return `<span class="price-change rise">↗ Preço subiu ${pct ? pct + ' ' : ''}desde a última visita</span>`;
}

function productSeed(p, fallback = '') {
  return p?.id || p?.link || p?.titulo || fallback;
}

function productSocialProof(p, fallback = '') {
  const seed = productSeed(p, fallback);
  return {
    rating: numeroDeterministico(`${seed}:rating`, 4.5, 5, 1),
    sold: numeroDeterministico(`${seed}:sold`, 50, 550)
  };
}

function productImages(p) {
  const raw = String(p?.imagem || '').trim();
  const fallback = 'https://placehold.co/800x800/F7F2E9/D48D5E?text=Sem+Imagem';
  if (!raw) return [fallback];
  const parts = raw.split(/[\n|;,]+/).map(x => x.trim()).filter(Boolean);
  return parts.length ? parts : [raw];
}

let modalImages = [];
let modalImageIndex = 0;

function pNum(p) {
  if (!p.preco) return 0;
  let s = String(p.preco).replace('R$', '').trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmt(v) {
  if (!v) return 'R$ 0,00';
  if (String(v).includes('R$')) return v;
  return pNum({ preco: v }).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ── CONTROLES CUSTOMIZADOS / CORREÇÕES FINAIS ── */
const SORT_OPTIONS = [
  { value: 'recente', label: 'Recentes', hint: 'Ordem original' },
  { value: 'preco-asc', label: 'Menor preço', hint: 'Econômicos primeiro' },
  { value: 'preco-desc', label: 'Maior preço', hint: 'Valores altos primeiro' },
  { value: 'az', label: 'A-Z', hint: 'Nome do produto' }
];

let modalZoomed = false;

function closeAllDropdowns(exceptId = '') {
  document.querySelectorAll('.custom-select.open').forEach(el => {
    if (el.id !== exceptId) {
      el.classList.remove('open');
      const trigger = el.querySelector('.select-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const willOpen = !el.classList.contains('open');
  closeAllDropdowns(id);
  el.classList.toggle('open', willOpen);
  const trigger = el.querySelector('.select-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', String(willOpen));
}

document.addEventListener('click', e => {
  if (!e.target.closest('.custom-select')) closeAllDropdowns();
});

document.addEventListener('dragstart', e => {
  if (e.target && e.target.tagName === 'IMG') e.preventDefault();
});

document.addEventListener('contextmenu', e => {
  if (e.target && e.target.tagName === 'IMG') e.preventDefault();
});

function optionButton({ label, hint, active, onClick, icon = '' }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `select-option${active ? ' active' : ''}`;
  btn.innerHTML = `<span>${icon}${esc(label)}</span>${hint ? `<small>${esc(hint)}</small>` : ''}`;
  btn.addEventListener('click', onClick);
  return btn;
}

function updateDropdownLabels() {
  const catLabel = catAtual === 'todos' ? 'Tudo' : catAtual;
  const sort = SORT_OPTIONS.find(o => o.value === sortAtual) || SORT_OPTIONS[0];
  ['categoryLabel', 'categoryLabelSearch'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = catLabel;
  });
  ['sortLabel', 'sortLabelSearch'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = sort.label;
  });
}

function openHomeCollection(kind = 'recent') {
  homeListMode = kind === 'recommended' ? 'recommended' : 'recent';
  catAtual = 'todos';
  sortAtual = 'recente';
  switchTab('explorer', { keepHomeList: true });
  requestAnimationFrame(() => {
    aplicarFiltros(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


function onSearchInput() {
  const val = document.getElementById('searchInput').value;
  document.getElementById('searchClear').classList.toggle('visible', val.length > 0);
  agendarFiltros();
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  document.getElementById('searchClear')?.classList.remove('visible');
  aplicarFiltros(true);
}

function renderGrid(lista, forceRender = false) {
  const grid = document.getElementById('grid');
  const searchValue = normalizeStr(document.getElementById('searchInput')?.value || '');
  const renderKey = `${currentTab}|${catAtual}|${sortAtual}|${searchValue}|${lista.length}|${hashProdutos(lista)}`;
  if (!forceRender && renderKey === lastRenderKey) return;
  lastRenderKey = renderKey;

  if (currentTab === 'search' && !searchValue) {
    grid.innerHTML = `
      <div class="state-box search-empty">
        <div class="ico">🔎</div>
        <h3>Comece digitando um produto</h3>
        <p style="color:var(--text-muted)">A lista fica oculta até haver uma busca para manter a navegação mais limpa.</p>
      </div>`;
    return;
  }

  if (!lista.length) {
    grid.innerHTML = `
      <div class="state-box">
        <div class="ico">🧐</div>
        <h3>Nada encontrado</h3>
        <p style="color:var(--text-muted)">Tente ajustar os filtros ou pesquisar por outro nome.</p>
      </div>`;
    return;
  }

  grid.innerHTML = lista.map((p, i) => cardHtml(p, i)).join('');
}

function renderModalImages(images, title) {
  modalImages = images && images.length ? images : ['https://placehold.co/800x800/F7F2E9/D48D5E?text=Sem+Imagem'];
  modalImageIndex = 0;
  modalZoomed = false;

  const track = document.getElementById('modalImageTrack');
  const box = document.getElementById('modalBox');
  const hint = document.getElementById('modalImageHint');
  const zoomBtn = document.getElementById('imageZoomBtn');
  if (!track || !box) return;

  box.classList.remove('image-zoomed');
  if (zoomBtn) {
    zoomBtn.setAttribute('aria-pressed', 'false');
    zoomBtn.innerHTML = '<span>🔎</span><strong>Ampliar</strong>';
  }

  track.innerHTML = modalImages.map((src, idx) => `
    <div class="modal-image-slide">
      <img class="modal-gallery-img" src="${esc(src)}" alt="${esc(title || 'Produto')} ${idx + 1}" draggable="false" loading="eager" decoding="async" data-action="toggle-zoom" data-fallback="product">
    </div>`).join('');

  box.classList.toggle('single-image', modalImages.length <= 1);
  if (hint) hint.textContent = modalImages.length > 1 ? 'Arraste para ver outras imagens' : 'Toque na imagem para ampliar';

  const scroller = document.getElementById('modalImageScroller');
  if (scroller) scroller.scrollTo({ left: 0, behavior: 'auto' });
}

function toggleImageZoom(force) {
  const box = document.getElementById('modalBox');
  const btn = document.getElementById('imageZoomBtn');
  if (!box) return;
  modalZoomed = typeof force === 'boolean' ? force : !modalZoomed;
  box.classList.toggle('image-zoomed', modalZoomed);
  if (btn) {
    btn.setAttribute('aria-pressed', String(modalZoomed));
    btn.innerHTML = modalZoomed ? '<span>↙</span><strong>Reduzir</strong>' : '<span>🔎</span><strong>Ampliar</strong>';
  }
}

function moveZoomOrigin(event) {
  if (!modalZoomed || !event?.currentTarget) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  event.currentTarget.style.transformOrigin = `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`;
}

function modalImageStep(direction) {
  if (!modalImages.length) return;
  toggleImageZoom(false);
  modalImageIndex = Math.max(0, Math.min(modalImages.length - 1, modalImageIndex + direction));
  const scroller = document.getElementById('modalImageScroller');
  if (scroller) scroller.scrollTo({ left: scroller.clientWidth * modalImageIndex, behavior: 'smooth' });
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.classList.remove('modal-open');
  toggleImageZoom(false);
}

/* ── OVERRIDES FINAIS: HOME EM 2 NÍVEIS, FILTROS SEM SCROLL FORÇADO ── */

function getRecommendedProducts(limit = 10) {
  return db
    .map((product, index) => {
      const seed = productSeed(product, index);
      const rating = Number(productSocialProof(product, index).rating || 0);
      const urgent = String(product.urgente || '').trim() === 'sim' ? 3 : 0;
      const drop = product.precoMudanca?.tipo === 'queda' ? 4 : 0;
      const discount = String(product.descontoAleatorio || '').trim() === 'sim' ? 1.5 : 0;
      const price = pNum(product);
      const valueBoost = price > 0 && price <= 50 ? 1 : 0;
      const stable = Number(numeroDeterministico(`${seed}:recommend`, 0, 100, 0)) / 100;
      return { product, index, score: urgent + drop + discount + valueBoost + rating + stable };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function renderHomeShowcases() {
  const recent = db.map((product, index) => ({ product, index })).slice(0, 10);
  const recommended = getRecommendedProducts(10);
  fillHomeRail('homeRecentRail', recent);
  fillHomeRail('homeRecommendedRail', recommended);
}

function renderHomeCategories() {
  renderHomeShowcases();
}

function openModalFromHome(index) {
  visible = db;
  openModal(index);
}


function setRefreshState(state, text = '') {
  const btn = document.getElementById('refreshBtn');
  const title = document.getElementById('refreshTitle');
  const sub = document.getElementById('refreshSub');
  if (!btn || !title || !sub) return;
  btn.classList.toggle('loading', state === 'loading');
  if (state === 'loading') {
    title.textContent = 'Verificando ofertas';
    sub.textContent = 'Buscando novidades no banco de dados';
  } else if (state === 'done') {
    title.textContent = text || 'Tudo atualizado';
    sub.textContent = 'Recentes e recomendados foram sincronizados';
  } else if (state === 'error') {
    title.textContent = 'Tentar novamente';
    sub.textContent = 'A conexão falhou, mas o cache continua disponível';
  } else {
    title.textContent = 'Atualizar vitrine';
    sub.textContent = 'Verificar recentes e recomendados agora';
  }
}

/* ── OVERRIDES FINAIS V2: BUSCA INDEPENDENTE, EXPLORAR FUNCIONAL E PAINEL TÉCNICO ── */
const METRIC_LABELS = {
  sync: 'Sincronização ativa. A vitrine usa cache local para abrir rápido e consulta o banco quando você atualiza.',
  total: 'Total de produtos com status feito disponíveis para navegação nesta vitrine.',
  cats: 'Quantidade de categorias detectadas automaticamente a partir da planilha.',
  drops: 'Produtos cujo preço caiu em relação ao histórico salvo no navegador.',
  hot: 'Produtos marcados como urgentes no banco, usados para destacar escassez visual.'
};

function moneyFromNumber(n) {
  const value = Number(n || 0);
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showMetricInsight(metric = 'total') {
  document.querySelectorAll('.tech-metric').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.metric === metric);
  });
  const insight = document.getElementById('homeInsight');
  if (insight) insight.textContent = METRIC_LABELS[metric] || METRIC_LABELS.total;
}

function updateExploreMeta(total = visible.length) {
  const meta = document.getElementById('exploreResultMeta');
  const hint = document.getElementById('exploreResultHint');
  if (!meta || !hint) return;
  const cat = catAtual === 'todos' ? 'todas as categorias' : `categoria ${catAtual}`;
  const sort = SORT_OPTIONS.find(o => o.value === sortAtual)?.label || 'Recentes';
  meta.textContent = `${total} achadinho${total === 1 ? '' : 's'} em ${cat}`;
  hint.textContent = `Ordenação atual: ${sort}. A seleção não move sua posição na página.`;
}

function renderSearchEmptyState(kind = 'pristine') {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const pristine = kind === 'pristine';
  grid.innerHTML = `
    <div class="state-box ${pristine ? 'search-pristine' : ''}">
      <div class="ico">${pristine ? '🔍' : '🧐'}</div>
      <h3>${pristine ? 'Digite para começar a busca' : 'Nada encontrado'}</h3>
      <p style="color:var(--text-muted)">${pristine ? 'A aba Buscar agora mostra apenas resultados do texto digitado.' : 'Tente pesquisar por outro nome de produto.'}</p>
    </div>`;
}

function aplicarFiltros(forceRender = false) {
  const input = document.getElementById('searchInput');
  const raw = input?.value || '';
  const q = currentTab === 'search' ? normalizeStr(raw) : '';
  const countEl = document.getElementById('countNum');
  const grid = document.getElementById('grid');

  if (currentTab === 'home') {
    visible = db;
    if (countEl) countEl.textContent = db.length;
    if (grid) grid.innerHTML = '';
    renderHomeShowcases();
    updateHomeStats();
    return;
  }

  if (currentTab === 'search') {
    catAtual = 'todos';
    updateDropdownLabels();
    if (!q) {
      visible = [];
      if (countEl) countEl.textContent = '0';
      lastRenderKey = '';
      renderSearchEmptyState('pristine');
      return;
    }

    const lista = ordenar(db.filter(p => normalizeStr(p.titulo).includes(q)), 'recente');
    visible = lista;
    if (countEl) countEl.textContent = lista.length;
    if (!lista.length) {
      lastRenderKey = '';
      renderSearchEmptyState('empty');
      return;
    }
    renderGrid(lista, true);
    return;
  }

  if (homeListMode) {
    const lista = homeListMode === 'recommended'
      ? getRecommendedProducts(db.length).map(item => item.product)
      : db.slice();
    visible = lista;
    if (countEl) countEl.textContent = lista.length;
    const meta = document.getElementById('exploreResultMeta');
    const hint = document.getElementById('exploreResultHint');
    if (meta) meta.textContent = homeListMode === 'recommended'
      ? `${lista.length} achadinho${lista.length === 1 ? '' : 's'} recomendados`
      : `${lista.length} novidade${lista.length === 1 ? '' : 's'} adicionada${lista.length === 1 ? '' : 's'}`;
    if (hint) hint.textContent = homeListMode === 'recommended'
      ? 'Lista completa ranqueada por preço, destaque, urgência e histórico de queda.'
      : 'Lista completa em ordem de chegada, igual à vitrine de recentes.';
    renderGrid(lista, true);
    return;
  }

  let lista = db;
  if (catAtual !== 'todos') lista = lista.filter(p => p.categoria === catAtual);
  lista = ordenar(lista, sortAtual);
  visible = lista;
  if (countEl) countEl.textContent = lista.length;
  updateExploreMeta(lista.length);
  renderGrid(lista, forceRender);
}

function setSort(val) {
  homeListMode = '';
  const x = window.scrollX;
  const y = window.scrollY;
  sortAtual = val;
  renderSortMenus();
  updateDropdownLabels();
  closeAllDropdowns();
  aplicarFiltros(true);
  requestAnimationFrame(() => window.scrollTo({ left: x, top: y, behavior: 'auto' }));
}

function setCat(cat, opts = {}) {
  homeListMode = '';
  const x = window.scrollX;
  const y = window.scrollY;
  catAtual = cat;
  montarFiltros();
  closeAllDropdowns();
  aplicarFiltros(true);
  if (!opts.forceTop) requestAnimationFrame(() => window.scrollTo({ left: x, top: y, behavior: 'auto' }));
}

function switchTab(viewName, opts = {}) {
  if (viewName === currentTab) {
    if (viewName === 'explorer' && !opts.keepHomeList && homeListMode) {
      homeListMode = '';
      aplicarFiltros(true);
    } else if (viewName === 'explorer' && opts.keepHomeList) {
      aplicarFiltros(true);
    }
    return;
  }
  if (!opts.keepHomeList) homeListMode = '';

  const prevIndex = tabOrder.indexOf(currentTab);
  const nextIndex = tabOrder.indexOf(viewName);
  const directionClass = nextIndex > prevIndex ? 'slide-right' : 'slide-left';

  document.body.setAttribute('data-view', viewName);
  document.documentElement.setAttribute('data-view', viewName);
  currentTab = viewName;
  closeAllDropdowns();

  document.querySelectorAll('.nav-item').forEach(btn => {
    const isActive = btn.dataset.tab === viewName;
    btn.classList.toggle('active', isActive);
    if (isActive) updateNavIndicator(btn);
  });

  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active', 'slide-right', 'slide-left');
  });

  const activeView = document.getElementById(`view-${viewName}`);
  if (activeView) {
    void activeView.offsetWidth;
    activeView.classList.add('active', directionClass);
  }

  const input = document.getElementById('searchInput');
  if (viewName === 'home') {
    catAtual = 'todos';
    if (input) input.value = '';
    document.getElementById('searchClear')?.classList.remove('visible');
    montarFiltros();
    aplicarFiltros(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'search') {
    catAtual = 'todos';
    closeAllDropdowns();
    aplicarFiltros(true);
    if (window.matchMedia('(min-width: 769px)').matches) {
      setTimeout(() => input?.focus({ preventScroll: true }), 180);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    if (input) {
      input.value = '';
      document.getElementById('searchClear')?.classList.remove('visible');
    }
    montarFiltros();
    aplicarFiltros(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function montarFiltros() {
  const cats = [...new Set(db.map(p => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const counts = cats.reduce((acc, cat) => {
    acc[cat] = db.filter(p => p.categoria === cat).length;
    return acc;
  }, {});

  const menu = document.getElementById('categoryMenu');
  if (menu) {
    menu.innerHTML = '';
    menu.appendChild(optionButton({
      label: 'Todas as categorias',
      hint: `${db.length} itens`,
      active: catAtual === 'todos',
      icon: '✨ ',
      onClick: () => setCat('todos')
    }));

    cats.forEach(cat => {
      menu.appendChild(optionButton({
        label: cat,
        hint: `${counts[cat]} itens`,
        active: catAtual === cat,
        icon: '🏷️ ',
        onClick: () => setCat(cat)
      }));
    });
  }

  renderSortMenus();
  updateDropdownLabels();
  renderHomeCategories(cats, counts);
  updateExploreMeta(visible.length || db.length);
}

function renderSortMenus() {
  const menu = document.getElementById('sortMenu');
  if (!menu) return;
  menu.innerHTML = '';
  SORT_OPTIONS.forEach(opt => {
    menu.appendChild(optionButton({
      label: opt.label,
      hint: opt.hint,
      active: sortAtual === opt.value,
      icon: opt.value === 'recente' ? '🕐 ' : opt.value === 'preco-asc' ? '↓ ' : opt.value === 'preco-desc' ? '↑ ' : '',
      onClick: () => setSort(opt.value)
    }));
  });
}


/* ── PAINEL TÉCNICO COLAPSÁVEL ── */


/* ── REFINOS FINAIS: estoque/preço, CTA reposicionado e painel técnico compacto ── */
function normalizar(p) {
  const sem = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const flat = {};
  Object.keys(p || {}).forEach(k => { flat[sem(k)] = p[k]; });
  const lk = (canonical, fb = '') => {
    const direct = p && p[canonical];
    if (direct != null && direct !== '') return direct;
    const normalized = flat[sem(canonical)];
    if (normalized != null && normalized !== '') return normalized;
    return fb;
  };

  return {
    id: lk('ID'),
    titulo: lk('Título') || lk('Titulo'),
    preco: lk('Preço') || lk('Preco'),
    imagem: lk('Imagem'),
    link: lk('Link'),
    categoria: String(lk('Categoria') || '').trim(),
    status: String(lk('Status') || 'pendente').toLowerCase().trim(),
    urgente: String(lk('Urgente') || lk('urgente') || '').toLowerCase().trim(),
    descontoAleatorio: String(lk('DescontoAleatorio') || lk('desconto_aleatorio') || lk('Desconto Aleatorio') || '').toLowerCase().trim(),
    estoque: String(lk('Estoque') || lk('Qtd Estoque') || lk('Quantidade') || lk('Stock') || '').trim(),
    disponibilidade: String(lk('Disponibilidade') || lk('Disponivel') || lk('Disponível') || lk('Availability') || '').trim()
  };
}

function hashProdutos(lista) {
  let hash = 2166136261;
  const str = (lista || []).map(p => [
    p.id,
    p.titulo,
    p.preco,
    p.imagem,
    p.link,
    p.categoria,
    p.status,
    p.urgente,
    p.descontoAleatorio,
    p.estoque || '',
    p.disponibilidade || '',
    p.precoMudanca?.tipo || '',
    p.precoMudanca?.anterior || '',
    p.precoMudanca?.atual || ''
  ].join('|')).join('¬');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function updateHomeStats(timestamp = Date.now()) {
  const prices = db.map(p => pNum(p)).filter(n => Number.isFinite(n) && n > 0);
  const total = db.length;
  const catsCount = new Set(db.map(p => p.categoria).filter(Boolean)).size;
  const drops = db.filter(p => p.precoMudanca?.tipo === 'queda').length;
  const hot = db.filter(p => String(p.urgente || '').trim() === 'sim').length;
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const hora = new Date(Number(timestamp) || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

  setText('homeTotal', total || '0');
  setText('homeCats', catsCount || '0');
  setText('homeDrops', drops || '0');
  setText('homeHot', hot || '0');
  setText('homeMinPrice', min ? moneyFromNumber(min) : '—');
  setText('homeAvgPrice', avg ? moneyFromNumber(avg) : '—');
  setText('homeMaxPrice', max ? moneyFromNumber(max) : '—');
  setText('homeStatus', total ? `Última leitura às ${hora}` : 'Aguardando produtos do banco de dados');
  setText('techCacheInfo', total ? `${prices.length} preços válidos · cache inteligente ativo` : 'Sem dados carregados ainda');
  setText('techSyncState', total ? 'Online' : 'Standby');
  setText('techStatusText', total ? 'Status da conexão' : 'Aguardando dados');
  setText('techLastRead', total ? hora : '—');
  setText('techMinPrice', min ? moneyFromNumber(min) : '—');
  setText('techAvgPrice', avg ? moneyFromNumber(avg) : '—');
  setText('techMaxPrice', max ? moneyFromNumber(max) : '—');

  const dot = document.getElementById('techSyncDot');
  if (dot) dot.style.opacity = total ? '1' : '.45';
  if (!document.querySelector('.tech-metric.active')) showMetricInsight('total');
}

/* ── AJUSTES FINAIS: painel SVG, switch e estoque indisponível ── */
const TECH_PANEL_CHEVRON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M6 9l6 6 6-6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

function hydrateTechPanelIcon() {
  const arrow = document.querySelector('#techPanelToggle .tech-panel-arrow');
  if (arrow && !arrow.querySelector('svg')) arrow.innerHTML = TECH_PANEL_CHEVRON_SVG;
}

function setTechnicalPanelState(expanded) {
  const panel = document.getElementById('technicalPanel');
  const toggle = document.getElementById('techPanelToggle');
  if (!panel) return;
  panel.classList.toggle('is-collapsed', !expanded);
  if (toggle) {
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.title = expanded ? 'Recolher painel técnico' : 'Expandir painel técnico';
  }
  hydrateTechPanelIcon();
}

function toggleTechnicalPanel(event) {
  const panel = document.getElementById('technicalPanel');
  if (!panel) return;
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  setTechnicalPanelState(panel.classList.contains('is-collapsed'));
}

function updateThemeToggle() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = document.getElementById('themeIcon');
  const name = document.getElementById('themeName');
  const desc = document.getElementById('themeDesc');
  if (icon) icon.textContent = isDark ? '🌙' : '☀️';
  if (name) name.textContent = isDark ? 'Escuro' : 'Claro';
  if (desc) desc.textContent = isDark ? 'Conforto noturno' : 'Leitura limpa';
}

function productStockInfo(p) {
  const raw = String(p?.disponibilidade || p?.estoque || '').trim();
  const normalized = normalizeStr(raw).replace(/\s+/g, ' ');
  const low = String(p?.urgente || '').trim().toLowerCase() === 'sim';

  const isUnavailable = !raw ? false : (
    /^(0|nao|não|no|false|off)$/i.test(raw) ||
    /^(sem estoque|indisponivel|indisponível|esgotado|fora de estoque)$/i.test(raw) ||
    normalized.includes('sem estoque') ||
    normalized.includes('indisponivel') ||
    normalized.includes('esgotado') ||
    normalized.includes('fora de estoque')
  );

  if (isUnavailable) {
    return { label: 'Esgotado', state: 'unavailable', unavailable: true, available: false };
  }

  if (/^\d+$/.test(raw)) {
    const amount = Number(raw);
    if (amount <= 0) return { label: 'Esgotado', state: 'unavailable', unavailable: true, available: false };
    if (amount <= 2) return { label: 'Poucas unidades disponíveis', state: 'low', unavailable: false, available: true };
    return { label: 'Disponível', state: 'ok', unavailable: false, available: true };
  }

  const isAvailableWord = raw && (
    /^(sim|s|yes|true|on)$/i.test(raw) ||
    /^(disponivel|disponível|em estoque|estoque disponivel|estoque disponível)$/i.test(raw) ||
    normalized.includes('disponivel') ||
    normalized.includes('em estoque')
  );

  if (isAvailableWord) {
    return { label: 'Disponível', state: low ? 'low' : 'ok', unavailable: false, available: true };
  }

  if (raw) {
    return { label: raw, state: low ? 'low' : 'ok', unavailable: false, available: true };
  }

  return low
    ? { label: 'Poucas unidades disponíveis', state: 'low', unavailable: false, available: true }
    : { label: 'Disponível', state: 'ok', unavailable: false, available: true };
}

function stockHtml(p, cls = 'stock-pill') {
  const stock = productStockInfo(p);
  if (stock.state === 'ok') return '';
  const variant = stock.state === 'unavailable' ? 'unavailable' : 'low';
  const icon = stock.state === 'unavailable' ? '⛔' : '⚠️';
  return `<span class="${cls} ${variant}">${icon} ${esc(stock.label)}</span>`;
}

function cardHtml(p, i) {
  const img = productImages(p)[0] || 'https://placehold.co/400x400/F7F2E9/D48D5E?text=Sem+Imagem';
  const title = esc(p.titulo || 'Produto Incrível');
  const precoAtualNum = pNum({ preco: p.preco }) || 0;
  const priceChange = p.precoMudanca || null;
  const hasDesconto = String(p.descontoAleatorio || '').trim() === 'sim';
  const stock = productStockInfo(p);
  const unavailable = stock.state === 'unavailable';
  let precoAntigo = '';
  if (priceChange?.tipo === 'queda' && Number(priceChange.anterior || 0) > precoAtualNum) {
    precoAntigo = fmt(priceChange.anterior);
  } else if (hasDesconto && precoAtualNum > 0) {
    precoAntigo = fmt(precoAtualNum * 1.2);
  }
  const priceChangeHtml = precoMudancaHtml(p);
  const dealBadge = priceChange?.tipo === 'queda' ? '<span class="deal-badge">↓ Preço caiu</span>' : '';
  const preco = fmt(p.preco);
  const cat = esc(p.categoria);
  const { rating, sold } = productSocialProof(p, i);
  const stableSeed = productSeed(p, i);
  const isHot = String(p.urgente || '').trim() === 'sim' && !unavailable;
  const barWidth = numeroDeterministico(`${stableSeed}:bar`, 10, 90);

  return `
    <article class="card${unavailable ? ' is-unavailable' : ''}" data-open-index="${i}" tabindex="0" role="button">
      <div class="card-img">
        <img src="${esc(img)}" alt="${title}" draggable="false" loading="lazy" decoding="async" ${i < 4 ? 'fetchpriority="high"' : ''} data-fallback="product">
        ${cat ? `<span class="cat-tag">${cat}</span>` : ''}
        ${unavailable ? '<span class="stock-preview-badge">Esgotado</span>' : dealBadge}
      </div>
      <div class="card-body">
        <div class="card-rating">
          <span class="stars">★★★★★</span> ${rating} (${sold} vendidos)
        </div>
        <div class="card-title" title="${title}">${title}</div>

        <div class="price-row">
          <span class="card-price">${preco}</span>
          ${precoAntigo ? `<span class="price-old">${precoAntigo}</span>` : ''}
        </div>
        <span class="product-card-note">👆 Clique para ver mais detalhes</span>
        ${priceChangeHtml}
        ${stockHtml(p)}

        ${isHot ? `
          <span class="scarcity-text">🔥 Restam poucas unidades!</span>
          <div class="scarcity-bar-wrap">
            <div class="scarcity-bar" style="width: ${barWidth}%"></div>
          </div>
        ` : ''}

        <button class="btn-buy btn-access${unavailable ? ' is-unavailable' : ''}" type="button" data-open-index="${i}" aria-label="${unavailable ? 'Produto esgotado. Ver detalhes de' : 'Acessar detalhes de'} ${title}">
          <strong>${unavailable ? 'Esgotado' : 'Acessar'}</strong>
        </button>
      </div>
    </article>`;
}

function fillHomeRail(railId, products) {
  const rail = document.getElementById(railId);
  if (!rail) return;
  rail.innerHTML = '';

  if (!products.length) {
    rail.innerHTML = '<div class="home-row-empty">Carregando achadinhos...</div>';
    return;
  }

  products.forEach(({ product, index }, position) => {
    const img = productImages(product)[0] || 'https://placehold.co/400x400/F7F2E9/D48D5E?text=Sem+Imagem';
    const { rating, sold } = productSocialProof(product, index);
    const stock = productStockInfo(product);
    const unavailable = stock.state === 'unavailable';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `home-mini-card${unavailable ? ' is-unavailable' : ''}`;
    btn.innerHTML = `
      <span class="home-mini-img">
        <img src="${esc(img)}" alt="${esc(product.titulo || 'Produto')}" draggable="false" loading="${position < 3 ? 'eager' : 'lazy'}" decoding="async" data-fallback="product">
        ${product.categoria ? `<span class="home-mini-tag">${esc(product.categoria)}</span>` : ''}
        ${unavailable ? '<span class="stock-preview-badge">Esgotado</span>' : ''}
      </span>
      <span class="home-mini-body">
        <span class="home-mini-rating"><span class="stars">★★★★★</span> ${rating} · ${sold} vendidos</span>
        <strong class="home-mini-title">${esc(product.titulo || 'Produto sem título')}</strong>
        <span class="home-mini-price">${fmt(product.preco)}</span>
        <span class="home-mini-note">👆 Clique para ver mais detalhes</span>
        ${stockHtml(product, 'stock-pill home-stock-pill')}
        <span class="home-mini-action${unavailable ? ' is-unavailable' : ''}"><strong>${unavailable ? 'Esgotado' : 'Acessar'}</strong></span>
      </span>
    `;
    btn.addEventListener('click', () => openModalFromHome(index));
    rail.appendChild(btn);
  });
}

function openModal(i) {
  const p = visible[i];
  if (!p) return;
  const stock = productStockInfo(p);
  const unavailable = stock.state === 'unavailable';
  renderModalImages(productImages(p), p.titulo || 'Produto');

  const cat = document.getElementById('modalCat');
  if (cat) {
    cat.textContent = p.categoria || '';
    cat.style.display = p.categoria ? 'inline-block' : 'none';
  }

  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.textContent = p.titulo || 'Produto sem título';

  const { rating, sold } = productSocialProof(p, i);
  const modalRating = document.getElementById('modalRating');
  if (modalRating) modalRating.innerHTML = `<span class="stars">★★★★★</span> ${rating} · ${sold} vendidos${unavailable ? ' · Esgotado' : ''}`;

  const priceEl = document.getElementById('modalPrice');
  if (priceEl) priceEl.textContent = fmt(p.preco);

  let modalStock = document.getElementById('modalStock');
  if (!modalStock) {
    modalStock = document.createElement('div');
    modalStock.id = 'modalStock';
    const changeEl = document.getElementById('modalPriceChange');
    if (changeEl && changeEl.parentNode) changeEl.parentNode.insertBefore(modalStock, changeEl.nextSibling);
  }
  if (modalStock) {
    const showStock = stock.state !== 'ok';
    modalStock.hidden = !showStock;
    modalStock.className = `modal-stock ${stock.state === 'unavailable' ? 'unavailable' : 'low'}`;
    modalStock.textContent = showStock ? `${stock.state === 'unavailable' ? '⛔' : '⚠️'} ${stock.label}` : '';
  }

  const modalChange = document.getElementById('modalPriceChange');
  if (modalChange) {
    modalChange.className = 'modal-price-change';
    modalChange.textContent = '';
    const m = p.precoMudanca;
    if (m?.tipo) {
      const pctAbs = Math.abs(Number(m.pct || 0));
      const pct = pctAbs >= 0.1 ? `${pctAbs.toFixed(1).replace('.', ',')}%` : '';
      modalChange.classList.add(m.tipo === 'queda' ? 'drop' : 'rise');
      modalChange.textContent = m.tipo === 'queda'
        ? `🔥 Preço caiu ${pct ? pct + ' ' : ''}desde a última visita`
        : `↗ Preço subiu ${pct ? pct + ' ' : ''}desde a última visita`;
    }
  }

  const linkEl = document.getElementById('modalLink');
  if (linkEl) {
    linkEl.classList.toggle('is-unavailable', unavailable);
    linkEl.textContent = unavailable ? 'Esgotado' : 'Comprar Agora 🛒';
    linkEl.setAttribute('aria-disabled', unavailable ? 'true' : 'false');
    if (unavailable) {
      linkEl.removeAttribute('href');
      linkEl.removeAttribute('target');
    } else {
      linkEl.href = p.link || '#';
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
    }
  }

  document.getElementById('modal')?.classList.add('open');
  document.body.classList.add('modal-open');
}

function bindStaticEvents() {
  if (bindStaticEvents.bound) return;
  bindStaticEvents.bound = true;

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.addEventListener('input', onSearchInput);

  document.addEventListener('click', event => {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action !== 'toggle-zoom') event.preventDefault();

      switch (action) {
        case 'scroll-footer':
          scrollToFooter(event);
          return;
        case 'theme':
          toggleTheme();
          return;
        case 'toggle-tech':
          toggleTechnicalPanel(event);
          return;
        case 'refresh':
          refreshProducts();
          return;
        case 'open-home-collection':
          openHomeCollection(actionEl.dataset.kind || 'recent');
          return;
        case 'toggle-dropdown':
          toggleDropdown(actionEl.dataset.target || '');
          return;
        case 'clear-search':
          clearSearch();
          return;
        case 'switch-tab':
          switchTab(actionEl.dataset.tab || 'home');
          return;
        case 'close-modal':
          closeModal();
          return;
        case 'toggle-zoom':
          event.preventDefault();
          event.stopPropagation();
          toggleImageZoom();
          return;
        case 'image-step':
          event.stopPropagation();
          modalImageStep(Number(actionEl.dataset.direction || 1));
          return;
      }
    }

    const card = event.target.closest('[data-open-index]');
    if (card) {
      event.preventDefault();
      event.stopPropagation();
      openModal(Number(card.dataset.openIndex));
    }
  });

  document.addEventListener('keydown', event => {
    const card = event.target.closest?.('[data-open-index]');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openModal(Number(card.dataset.openIndex));
    }
  });

  document.addEventListener('mousemove', event => {
    if (event.target?.matches?.('.modal-gallery-img')) {
      moveZoomOrigin({ clientX: event.clientX, clientY: event.clientY, currentTarget: event.target });
    }
  });

  document.addEventListener('error', event => {
    const img = event.target;
    if (!img || img.tagName !== 'IMG') return;
    const fallback = img.dataset.fallback;
    if (fallback === 'hide') {
      img.style.display = 'none';
    } else if (fallback === 'product' && !img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = 'true';
      img.src = 'https://placehold.co/800x800/F7F2E9/D48D5E?text=Indisponível';
    }
  }, true);
}

function syncNavIndicator() {
  const activeBtn = document.querySelector('.nav-item.active');
  if (activeBtn) updateNavIndicator(activeBtn);
}

function initApp() {
  document.body.setAttribute('data-view', currentTab || 'home');
  document.documentElement.setAttribute('data-view', currentTab || 'home');
  bindStaticEvents();
  hydrateTechPanelIcon();
  setTechnicalPanelState(false);
  updateThemeToggle();
  showMetricInsight('total');
  carregar();
  requestAnimationFrame(syncNavIndicator);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}

window.addEventListener('resize', syncNavIndicator);
})();
