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
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeToggle();
}

let currentTab = 'home';
const tabOrder = ['home', 'explorer', 'search'];

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function smoothBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

function scrollPageToTop() {
  window.scrollTo({ top: 0, behavior: smoothBehavior() });
}

function updateNavIndicator(activeBtn) {
  const indicator = document.getElementById('navIndicator');
  if (!indicator || !activeBtn) return;
  indicator.style.width = activeBtn.offsetWidth + 'px';
  indicator.style.transform = `translate3d(${activeBtn.offsetLeft}px,0,0)`;
}

function scrollToFooter(event) {
  if (event) event.preventDefault();
  closeAllDropdowns?.();
  const footer = document.getElementById('siteFooter');
  if (!footer) return;
  footer.scrollIntoView({ behavior: smoothBehavior(), block: 'start' });
}


const API_URL = "https://script.google.com/macros/s/AKfycbwO7BQje-TFZ1IXTwAk69PR8kAe74hHb2KV4jY-iNLAUzv-cAbDO0aHiItO9goLMENnfw/exec";
const API_KEY = "netinho2007";

const CACHE_VERSION = 'achadinhos_home_v2';
const CACHE_KEY = `${CACHE_VERSION}:produtos`;
const PRICE_HISTORY_KEY = `${CACHE_VERSION}:precos_v1`;
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;
const SEARCH_DEBOUNCE_MS = 90;
const INITIAL_SKELETON_MIN_MS = 620;
const REFRESH_SKELETON_MIN_MS = 420;

let db = [], visible = [], catAtual = 'todos', sortAtual = 'recente';
let homeListMode = '';
let currentHash = '', lastRenderKey = '', lastHomeRenderKey = '', filtroTimer = null;
let isLoadingProdutos = false, refreshResetTimer = null;

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

async function carregar(forceNetwork = false) {
  if (isLoadingProdutos) {
    if (forceNetwork) setRefreshState('loading', 'Sincronização em andamento');
    return;
  }

  isLoadingProdutos = true;
  const cache = lerCacheProdutos();
  const hasCache = Boolean(cache?.data?.length);
  const shouldShowSkeleton = forceNetwork || (!hasCache && !db.length);
  const skeletonStartedAt = Date.now();
  const minSkeletonMs = shouldShowSkeleton
    ? (forceNetwork ? REFRESH_SKELETON_MIN_MS : INITIAL_SKELETON_MIN_MS)
    : 0;

  if (shouldShowSkeleton) {
    renderSkeleton(currentTab === 'home' ? 'home' : 'all');
    document.body.classList.add('is-loading-products');
    lastHomeRenderKey = '';
    lastRenderKey = '';
  }

  try {
    if (!forceNetwork && hasCache) {
      db = cache.data;
      currentHash = cache.hash || hashProdutos(db);
      montarFiltros();
      aplicarFiltros(true);
      updateHomeStats(cache.savedAt);

      // Se o cache ainda está dentro do TTL, evita nova chamada de rede no carregamento inicial.
      // O botão "Buscar novidades" continua forçando sincronização quando necessário.
      if (!cache.stale) {
        setRefreshState('idle');
        return;
      }
    }

    setRefreshState(
      forceNetwork || shouldShowSkeleton ? 'loading' : 'idle',
      forceNetwork ? 'Verificando ofertas' : (shouldShowSkeleton ? 'Carregando vitrine' : '')
    );

    const data = await fetchComTimeout(`${API_URL}?action=listar&key=${encodeURIComponent(API_KEY)}&t=${Date.now()}`, FETCH_TIMEOUT_MS);
    const raw = Array.isArray(data) ? data : (data.produtos || data.data || []);
    const normalizados = anotarMudancasPreco(raw.map(normalizar).filter(p => p.status === 'feito'));
    const nextHash = hashProdutos(normalizados);
    const changed = nextHash !== currentHash;

    salvarCacheProdutos(normalizados, nextHash);

    if (minSkeletonMs) await waitForSkeletonMinimum(skeletonStartedAt, minSkeletonMs);

    if (changed || shouldShowSkeleton || forceNetwork) {
      db = normalizados;
      currentHash = nextHash;
      lastHomeRenderKey = '';
      lastRenderKey = '';
      montarFiltros();
      aplicarFiltros(true);
    }

    updateHomeStats(Date.now());
    setRefreshState('done', changed ? 'Novidades verificadas' : 'Tudo atualizado');
  } catch (e) {
    console.error(e);
    setRefreshState('error');

    if (minSkeletonMs) await waitForSkeletonMinimum(skeletonStartedAt, minSkeletonMs);

    if (forceNetwork && (db.length || hasCache)) {
      if (!db.length && hasCache) {
        db = cache.data;
        currentHash = cache.hash || hashProdutos(db);
      }
      lastHomeRenderKey = '';
      lastRenderKey = '';
      montarFiltros();
      aplicarFiltros(true);
      updateHomeStats(cache?.savedAt || Date.now());
    } else if (!hasCache && !db.length) {
      renderLoadErrorState();
    }
  } finally {
    isLoadingProdutos = false;
    document.body.classList.remove('is-loading-products');
  }
}

function waitForSkeletonMinimum(startedAt, minMs) {
  const elapsed = Date.now() - Number(startedAt || Date.now());
  const remaining = Math.max(0, Number(minMs || 0) - elapsed);
  return remaining ? new Promise(resolve => window.setTimeout(resolve, remaining)) : Promise.resolve();
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

function skeletonCardHtml(extraClass = '') {
  return `
    <div class="skel product-skeleton home-mini-card home-recommended-card catalog-card is-normal-product product-card-skeleton ${extraClass}" aria-hidden="true">
      <span class="home-mini-img skel-img">
        <span class="skel-image-shine"></span>
      </span>
      <span class="home-mini-body">
        <span class="home-mini-rating skel-line rating"></span>
        <span class="home-mini-title skel-title-block">
          <span class="skel-line title title-main"></span>
          <span class="skel-line title title-sub"></span>
        </span>
        <span class="home-mini-note skel-line note"></span>
        <span class="home-mini-price-row">
          <span class="home-mini-price skel-line price"></span>
          <span class="home-mini-old skel-line old-price"></span>
        </span>
        <span class="home-mini-action skel-line button"></span>
      </span>
    </div>`;
}

function renderGridSkeleton(count = 6) {
  const grid = document.getElementById('grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }, () => skeletonCardHtml('grid-skeleton')).join('');
}

function renderHomeSkeletons(count = 4) {
  ['homePromotionsRail', 'homeRecommendedRail'].forEach(id => {
    const rail = document.getElementById(id);
    if (!rail) return;
    // Lock the parent row's width before replacing content to prevent layout
    // collapsing during the DOM swap (the root cause of the narrow-skeleton bug).
    const row = rail.closest('.home-product-row');
    if (row) {
      const w = row.getBoundingClientRect().width;
      if (w > 0) {
        row.style.width = w + 'px';
        requestAnimationFrame(() => row.style.removeProperty('width'));
      }
    }
    rail.innerHTML = Array.from({ length: count }, () => skeletonCardHtml('home-rail-skeleton')).join('');
  });
}

function renderSkeleton(scope = 'all') {
  if (scope !== 'grid') renderHomeSkeletons();
  if (scope !== 'home') renderGridSkeleton();
}

function renderLoadErrorState() {
  const errorHtml = `
    <div class="state-box load-error-state">
      <div class="ico">💔</div>
      <h3>Ops, algo deu errado</h3>
      <p>Não foi possível conectar ao banco de achadinhos. Tente recarregar a página.</p>
    </div>`;
  const grid = document.getElementById('grid');
  if (grid) grid.innerHTML = errorHtml;
  ['homePromotionsRail', 'homeRecommendedRail'].forEach(id => {
    const rail = document.getElementById(id);
    if (rail) rail.innerHTML = `<div class="home-row-empty">Não foi possível carregar os achadinhos agora.</div>`;
  });
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
let modalScrollY = 0;
let modalLastFocused = null;
let modalOriginalScrollBehavior = '';

function restoreScrollInstantly(y) {
  const top = Math.max(0, Number(y || 0));
  const root = document.documentElement;
  modalOriginalScrollBehavior = root.style.scrollBehavior || '';
  root.style.scrollBehavior = 'auto';
  window.scrollTo({ left: 0, top, behavior: 'auto' });
  requestAnimationFrame(() => {
    root.style.scrollBehavior = modalOriginalScrollBehavior;
    modalOriginalScrollBehavior = '';
  });
}

function lockPageScrollForModal() {
  if (document.body.classList.contains('modal-open')) return;
  modalScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  modalLastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
  document.body.style.setProperty('--modal-scroll-y', `${modalScrollY}px`);
}

function unlockPageScrollForModal() {
  if (!document.body.classList.contains('modal-open')) return;
  const restoreY = modalScrollY || window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.classList.add('no-smooth-scroll');
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('--modal-scroll-y');
  restoreScrollInstantly(restoreY);
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-smooth-scroll');
    if (modalLastFocused && document.contains(modalLastFocused)) {
      try { modalLastFocused.focus({ preventScroll: true }); } catch (_) { }
    }
    modalLastFocused = null;
  });
  modalScrollY = 0;
}

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

const HOME_COLLECTION_MAX_ITEMS = 20;

const SPECIAL_CATEGORY_FILTERS = {
  lowStock: { value: '__estoque_baixo__', label: 'Estoque baixo', icon: '🔥 ', empty: 'Nenhum produto com estoque baixo agora.' },
  offers: { value: '__ofertas__', label: 'Ofertas', icon: '🏷️ ', empty: 'Nenhuma oferta com desconto ativa agora.' },
  recommended: { value: '__recomendados__', label: 'Recomendados', icon: '⭐ ', empty: 'Nenhum achadinho recomendado agora.' }
};

let modalZoomed = false;

function getOpenDropdowns() {
  return Array.from(document.querySelectorAll('.custom-select.open'));
}

function syncFiltersOpenState() {
  document.body.classList.toggle('filters-open', getOpenDropdowns().length > 0);
}

function closeAllDropdowns(exceptId = '') {
  document.querySelectorAll('.custom-select.open').forEach(el => {
    if (el.id !== exceptId) {
      el.classList.remove('open', 'drop-up');
      const trigger = el.querySelector('.select-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });
  syncFiltersOpenState();
}

function positionDropdownMenu(el) {
  const trigger = el.querySelector('.select-trigger');
  const menu = el.querySelector('.select-menu');
  if (!trigger || !menu) return;

  const rect = trigger.getBoundingClientRect();
  const viewW = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewH = window.innerHeight || document.documentElement.clientHeight || 0;
  const gutter = 10;
  const preferredWidth = Math.max(rect.width, Math.min(340, viewW - gutter * 2));
  const menuWidth = Math.min(preferredWidth, viewW - gutter * 2);

  menu.style.width = Math.round(menuWidth) + 'px';
  const naturalHeight = Math.min(menu.scrollHeight || 280, Math.floor(viewH * 0.58));
  const spaceBelow = viewH - rect.bottom - gutter;
  const spaceAbove = rect.top - gutter;
  const openUp = spaceBelow < Math.min(naturalHeight, 180) && spaceAbove > spaceBelow;
  const maxHeight = Math.max(140, Math.min(naturalHeight, openUp ? spaceAbove : spaceBelow));
  const top = openUp
    ? Math.max(gutter, rect.top - maxHeight - 8)
    : Math.min(viewH - gutter - maxHeight, rect.bottom + 8);
  const left = Math.max(gutter, Math.min(rect.left, viewW - gutter - menuWidth));

  el.classList.toggle('drop-up', openUp);
  el.style.setProperty('--menu-top', Math.round(top) + 'px');
  el.style.setProperty('--menu-left', Math.round(left) + 'px');
  el.style.setProperty('--menu-width', Math.round(menuWidth) + 'px');
  el.style.setProperty('--menu-max-height', Math.round(maxHeight) + 'px');
}

function repositionOpenDropdowns() {
  getOpenDropdowns().forEach(positionDropdownMenu);
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const willOpen = !el.classList.contains('open');
  closeAllDropdowns(id);

  el.classList.toggle('open', willOpen);
  const trigger = el.querySelector('.select-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', String(willOpen));

  if (willOpen) {
    positionDropdownMenu(el);
    window.requestAnimationFrame(() => {
      positionDropdownMenu(el);
      if (!prefersReducedMotion()) {
        el.querySelector('.select-option.active')?.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  syncFiltersOpenState();
}

document.addEventListener('click', e => {
  if (!e.target.closest('.custom-select')) closeAllDropdowns();
});

window.addEventListener('resize', repositionOpenDropdowns, { passive: true });
window.addEventListener('scroll', repositionOpenDropdowns, { passive: true });

document.addEventListener('dragstart', e => {
  if (e.target && e.target.tagName === 'IMG') e.preventDefault();
});

document.addEventListener('contextmenu', e => {
  if (e.target && e.target.tagName === 'IMG') e.preventDefault();
});

function enableDesktopRailWheelScroll() {
  document.querySelectorAll('.home-product-rail').forEach(rail => {
    if (rail.dataset.wheelScrollReady === 'true') return;
    rail.dataset.wheelScrollReady = 'true';
    rail.addEventListener('wheel', event => {
      if (isCompactViewport() || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const canScroll = rail.scrollWidth > rail.clientWidth + 2;
      if (!canScroll) return;
      const atStart = rail.scrollLeft <= 0;
      const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return;
      event.preventDefault();
      rail.scrollBy({ left: event.deltaY, behavior: 'auto' });
    }, { passive: false });
  });
}

function optionButton({ label, hint, active, onClick, icon = '' }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `select-option${active ? ' active' : ''}`;
  btn.innerHTML = `<span>${icon}${esc(label)}</span>${hint ? `<small>${esc(hint)}</small>` : ''}`;
  btn.addEventListener('click', onClick);
  return btn;
}

function updateDropdownLabels() {
  const catLabel = getCategoryFilterLabel(catAtual);
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

function openHomeCollection(kind = 'promotions') {
  homeListMode = '';
  catAtual = kind === 'recommended'
    ? SPECIAL_CATEGORY_FILTERS.recommended.value
    : SPECIAL_CATEGORY_FILTERS.offers.value;
  sortAtual = 'recente';
  switchTab('explorer');
  requestAnimationFrame(() => {
    montarFiltros();
    aplicarFiltros(true);
    scrollPageToTop();
  });
}


function onSearchInput() {
  const val = document.getElementById('searchInput')?.value || '';
  document.getElementById('searchClear')?.classList.toggle('visible', val.length > 0);
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

function focusSearchInput(delay = 0) {
  const run = () => {
    const input = document.getElementById('searchInput');
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
    } catch (_) {
      input.focus();
    }
  };

  if (delay > 0) {
    window.setTimeout(run, delay);
  } else {
    run();
  }
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
        <p>A lista fica oculta até haver uma busca para manter a navegação mais limpa.</p>
      </div>`;
    return;
  }

  if (!lista.length) {
    grid.innerHTML = `
      <div class="state-box">
        <div class="ico">🧐</div>
        <h3>Nada encontrado</h3>
        <p>Tente ajustar os filtros ou pesquisar por outro nome.</p>
      </div>`;
    return;
  }

  grid.innerHTML = lista.map((p, i) => cardHtml(p, i)).join('');
}

function isCompactViewport() {
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

function zoomButtonLabel() {
  return isCompactViewport() ? 'Ver maior' : 'Ampliar';
}

function updateZoomUiState() {
  const btn = document.getElementById('imageZoomBtn');
  const hint = document.getElementById('modalImageHint');
  const box = document.getElementById('modalBox');
  const modal = document.getElementById('modal');
  const multiple = modalImages.length > 1;

  if (box) box.classList.toggle('mobile-zoom-mode', modalZoomed && isCompactViewport());
  if (modal) modal.classList.toggle('image-zoom-active', modalZoomed);
  document.body.classList.toggle('image-zoom-active', modalZoomed);

  if (btn) {
    btn.setAttribute('aria-pressed', String(modalZoomed));
    btn.innerHTML = modalZoomed
      ? '<span>↙</span><strong>Reduzir</strong>'
      : `<span>🔎</span><strong>${zoomButtonLabel()}</strong>`;
  }

  if (hint) {
    if (modalZoomed) {
      hint.textContent = isCompactViewport()
        ? (multiple ? 'Visual maior · arraste para trocar e toque para reduzir' : 'Visual maior · toque para reduzir')
        : 'Visual ampliado · mova o cursor para ajustar o foco';
    } else {
      hint.textContent = multiple ? 'Arraste para ver outras imagens · toque para ampliar' : 'Toque na imagem para ampliar';
    }
  }
}

function renderModalImages(images, title) {
  modalImages = images && images.length ? images : ['https://placehold.co/800x800/F7F2E9/D48D5E?text=Sem+Imagem'];
  modalImageIndex = 0;
  modalZoomed = false;

  const track = document.getElementById('modalImageTrack');
  const box = document.getElementById('modalBox');
  if (!track || !box) return;

  box.classList.remove('image-zoomed', 'mobile-zoom-mode');
  document.getElementById('modal')?.classList.remove('image-zoom-active');
  document.body.classList.remove('image-zoom-active');

  track.innerHTML = modalImages.map((src, idx) => `
    <div class="modal-image-slide">
      <img class="modal-gallery-img" src="${esc(src)}" alt="${esc(title || 'Produto')} ${idx + 1}" draggable="false" loading="eager" decoding="async" data-action="toggle-zoom" data-fallback="product">
    </div>`).join('');

  box.classList.toggle('single-image', modalImages.length <= 1);
  updateZoomUiState();

  const scroller = document.getElementById('modalImageScroller');
  if (scroller) scroller.scrollTo({ left: 0, behavior: 'auto' });
}

function resetZoomOrigins() {
  document.querySelectorAll('.modal-gallery-img').forEach(img => {
    img.style.transformOrigin = '50% 50%';
  });
}

function toggleImageZoom(force) {
  const box = document.getElementById('modalBox');
  const scroller = document.getElementById('modalImageScroller');
  if (!box) return;
  modalZoomed = typeof force === 'boolean' ? force : !modalZoomed;
  box.classList.toggle('image-zoomed', modalZoomed);
  if (modalZoomed) {
    resetZoomOrigins();
    if (scroller) scroller.scrollTo({ left: scroller.clientWidth * modalImageIndex, top: 0, behavior: 'auto' });
  } else {
    resetZoomOrigins();
    if (scroller) scroller.scrollTo({ top: 0, behavior: 'auto' });
  }
  updateZoomUiState();
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
  if (scroller) scroller.scrollTo({ left: scroller.clientWidth * modalImageIndex, behavior: smoothBehavior() });
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (!modal?.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  toggleImageZoom(false);
  unlockPageScrollForModal();
}

/* ── OVERRIDES FINAIS: HOME EM 2 NÍVEIS, FILTROS SEM SCROLL FORÇADO ── */

function productDisplayKey(product, fallback = '') {
  return String(produtoKey(product) || productSeed(product, fallback) || fallback || '').trim();
}

function getRecommendedProducts(limit = HOME_COLLECTION_MAX_ITEMS, options = {}) {
  const excludeKeys = options.excludeKeys instanceof Set ? options.excludeKeys : new Set();
  const excludeOffers = Boolean(options.excludeOffers);

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
    .filter(({ product, index }) => {
      const key = productDisplayKey(product, index);
      if (excludeOffers && isOfferProduct(product)) return false;
      if (key && excludeKeys.has(key)) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, Number(limit || HOME_COLLECTION_MAX_ITEMS)));
}

function getPromotionProducts(limit = HOME_COLLECTION_MAX_ITEMS) {
  return db
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => isOfferProduct(product))
    .sort((a, b) => Number(isSimFlag(b.product.descontoAleatorio)) - Number(isSimFlag(a.product.descontoAleatorio)))
    .slice(0, Math.max(0, Number(limit || HOME_COLLECTION_MAX_ITEMS)));
}

function renderHomeShowcases(forceRender = false) {
  const promotions = getPromotionProducts(HOME_COLLECTION_MAX_ITEMS);
  const promotionKeys = new Set(promotions.map(({ product, index }) => productDisplayKey(product, index)).filter(Boolean));
  const recommended = getRecommendedProducts(HOME_COLLECTION_MAX_ITEMS, { excludeOffers: true, excludeKeys: promotionKeys });
  const homeRenderKey = `${currentHash}|${promotions.map(({ product, index }) => productDisplayKey(product, index) || index).join(',')}|${recommended.map(({ product, index }) => productDisplayKey(product, index) || index).join(',')}`;

  if (!forceRender && homeRenderKey === lastHomeRenderKey) return;
  lastHomeRenderKey = homeRenderKey;

  fillHomeRail('homePromotionsRail', promotions, 'Nenhuma promoção marcada na planilha ainda.');
  fillHomeRail('homeRecommendedRail', recommended, 'Nenhum achadinho disponível no momento.');
}

function renderHomeCategories() {
  renderHomeShowcases(true);
}

function openModalFromHome(index) {
  visible = db;
  openModal(index);
}


const REFRESH_SVG = {
  idle: '<svg viewBox="0 0 24 24" focusable="false"><path d="M20 11a8.1 8.1 0 0 0-14.25-5.2L4 7.55V3H2v8h8V9H5.45l1.72-1.72A6.08 6.08 0 0 1 18 11h2Zm-2.75 5.72A6.08 6.08 0 0 1 6 13H4a8.1 8.1 0 0 0 14.25 5.2L20 16.45V21h2v-8h-8v2h4.55l-1.3 1.72Z"></path></svg>',
  done: '<svg viewBox="0 0 24 24" focusable="false"><path d="M9.55 17.6 4.9 12.95l1.42-1.42 3.23 3.23 8.13-8.13 1.42 1.42-9.55 9.55Z"></path></svg>',
  error: '<svg viewBox="0 0 24 24" focusable="false"><path d="m6.4 19-1.4-1.4 5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19Z"></path></svg>'
};

function setRefreshIcon(state = 'idle') {
  const icon = document.getElementById('refreshIcon');
  if (!icon) return;
  icon.innerHTML = REFRESH_SVG[state] || REFRESH_SVG.idle;
}

function setRefreshState(state, text = '') {
  const btn = document.getElementById('refreshBtn');
  const title = document.getElementById('refreshTitle');
  const sub = document.getElementById('refreshSub');
  if (!btn || !title || !sub) return;

  window.clearTimeout(refreshResetTimer);
  btn.classList.toggle('loading', state === 'loading');
  btn.classList.toggle('is-done', state === 'done');
  btn.classList.toggle('is-error', state === 'error');
  btn.disabled = state === 'loading';
  btn.setAttribute('aria-busy', String(state === 'loading'));

  if (state === 'loading') {
    setRefreshIcon('idle');
    title.textContent = text || 'Verificando ofertas';
    sub.textContent = 'Buscando novidades no banco de dados';
  } else if (state === 'done') {
    setRefreshIcon('done');
    title.textContent = text || 'Tudo atualizado';
    sub.textContent = 'Promoções e recomendados foram sincronizados';
    refreshResetTimer = window.setTimeout(() => setRefreshState('idle'), 1600);
  } else if (state === 'error') {
    setRefreshIcon('error');
    title.textContent = 'Tentar novamente';
    sub.textContent = 'A conexão falhou, mas o cache continua disponível';
    refreshResetTimer = window.setTimeout(() => setRefreshState('idle'), 2200);
  } else {
    setRefreshIcon('idle');
    title.textContent = 'Buscar novidades';
    sub.textContent = 'Verificar promoções e recomendados agora';
  }
}

/* ── OVERRIDES FINAIS V2: BUSCA INDEPENDENTE, EXPLORAR FUNCIONAL E PAINEL TÉCNICO ── */
const METRIC_LABELS = {
  sync: 'Sincronização ativa. A vitrine usa cache local para abrir rápido e consulta o banco quando você atualiza.',
  total: 'Total de produtos com status feito disponíveis para navegação nesta vitrine.',
  cats: 'Quantidade de categorias detectadas automaticamente a partir da planilha.',
  drops: 'Produtos com queda de preço detectada no histórico local ou marcados com DescontoAleatorio na planilha.',
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

  const sort = SORT_OPTIONS.find(o => o.value === sortAtual)?.label || 'Recentes';
  const label = getCategoryFilterLabel(catAtual);

  if (catAtual === SPECIAL_CATEGORY_FILTERS.lowStock.value) {
    meta.textContent = `${total} achadinho${total === 1 ? '' : 's'} com estoque baixo`;
    hint.textContent = `Mostrando produtos com poucas unidades ou urgência. Ordenação atual: ${sort}.`;
    return;
  }

  if (catAtual === SPECIAL_CATEGORY_FILTERS.offers.value) {
    meta.textContent = `${total} ${total === 1 ? 'oferta ativa' : 'ofertas ativas'}`;
    hint.textContent = `Mostrando até ${HOME_COLLECTION_MAX_ITEMS} produtos com desconto exibido no site. Ordenação atual: ${sort}.`;
    return;
  }

  if (catAtual === SPECIAL_CATEGORY_FILTERS.recommended.value) {
    meta.textContent = `${total} achadinho${total === 1 ? '' : 's'} recomendado${total === 1 ? '' : 's'}`;
    hint.textContent = `Mostrando até ${HOME_COLLECTION_MAX_ITEMS} recomendações sem repetir produtos de ofertas. Ordenação atual: ${sort}.`;
    return;
  }

  const cat = catAtual === 'todos' ? 'todas as categorias' : `categoria ${label}`;
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
      <p>${pristine ? 'A aba Buscar agora mostra apenas resultados do texto digitado.' : 'Tente pesquisar por outro nome de produto.'}</p>
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
    renderHomeShowcases(forceRender);
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
      ? getRecommendedProducts(HOME_COLLECTION_MAX_ITEMS, { excludeOffers: true }).map(item => item.product)
      : getPromotionProducts(HOME_COLLECTION_MAX_ITEMS).map(item => item.product);
    visible = lista;
    if (countEl) countEl.textContent = lista.length;
    const meta = document.getElementById('exploreResultMeta');
    const hint = document.getElementById('exploreResultHint');
    if (meta) meta.textContent = homeListMode === 'recommended'
      ? `${lista.length} achadinho${lista.length === 1 ? '' : 's'} recomendados`
      : `${lista.length} ${lista.length === 1 ? 'promoção ativa' : 'promoções ativas'}`;
    if (hint) hint.textContent = homeListMode === 'recommended'
      ? `Lista com até ${HOME_COLLECTION_MAX_ITEMS} recomendações sem repetir produtos de ofertas.`
      : `Lista com até ${HOME_COLLECTION_MAX_ITEMS} produtos que exibem desconto ou queda de preço no site.`;
    renderGrid(lista, true);
    return;
  }

  let lista = aplicarFiltroCategoriaEspecial(db, catAtual);
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
    if (viewName === 'search') {
      focusSearchInput();
    }
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
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isActive) updateNavIndicator(btn);
  });

  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active', 'slide-right', 'slide-left');
    view.setAttribute('aria-hidden', 'true');
  });

  const activeView = document.getElementById(`view-${viewName}`);
  if (activeView) {
    void activeView.offsetWidth;
    activeView.classList.add('active', directionClass);
    activeView.setAttribute('aria-hidden', 'false');
  }

  const input = document.getElementById('searchInput');
  if (viewName === 'home') {
    catAtual = 'todos';
    if (input) input.value = '';
    document.getElementById('searchClear')?.classList.remove('visible');
    montarFiltros();
    aplicarFiltros(true);
    scrollPageToTop();
  } else if (viewName === 'search') {
    catAtual = 'todos';
    closeAllDropdowns();
    aplicarFiltros(true);
    scrollPageToTop();
    focusSearchInput();
    requestAnimationFrame(() => focusSearchInput());
  } else {
    if (input) {
      input.value = '';
      document.getElementById('searchClear')?.classList.remove('visible');
    }
    montarFiltros();
    aplicarFiltros(true);
    scrollPageToTop();
  }
}

function montarFiltros() {
  const countMap = new Map();
  let lowStockCount = 0;
  let offersCount = 0;

  db.forEach(product => {
    const cat = product.categoria;
    if (cat) countMap.set(cat, (countMap.get(cat) || 0) + 1);
    if (isLowStockProduct(product)) lowStockCount += 1;
    if (isOfferProduct(product)) offersCount += 1;
  });

  const recommendedCount = getRecommendedProducts(HOME_COLLECTION_MAX_ITEMS, { excludeOffers: true }).length;
  const limitedOffersHint = offersCount > HOME_COLLECTION_MAX_ITEMS
    ? `${HOME_COLLECTION_MAX_ITEMS} de ${offersCount} itens com desconto`
    : `${offersCount} ${offersCount === 1 ? 'item com desconto' : 'itens com desconto'}`;
  const limitedRecommendedHint = recommendedCount >= HOME_COLLECTION_MAX_ITEMS
    ? `Até ${HOME_COLLECTION_MAX_ITEMS} itens`
    : `${recommendedCount} ${recommendedCount === 1 ? 'item' : 'itens'}`;

  const cats = [...countMap.keys()].sort((a, b) => a.localeCompare(b));
  const menu = document.getElementById('categoryMenu');

  if (menu) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(optionButton({
      label: 'Todas as categorias',
      hint: `${db.length} itens`,
      active: catAtual === 'todos',
      icon: '✨ ',
      onClick: () => setCat('todos')
    }));

    fragment.appendChild(optionButton({
      label: SPECIAL_CATEGORY_FILTERS.lowStock.label,
      hint: `${lowStockCount} ${lowStockCount === 1 ? 'item' : 'itens'}`,
      active: catAtual === SPECIAL_CATEGORY_FILTERS.lowStock.value,
      icon: SPECIAL_CATEGORY_FILTERS.lowStock.icon,
      onClick: () => setCat(SPECIAL_CATEGORY_FILTERS.lowStock.value)
    }));

    fragment.appendChild(optionButton({
      label: SPECIAL_CATEGORY_FILTERS.offers.label,
      hint: limitedOffersHint,
      active: catAtual === SPECIAL_CATEGORY_FILTERS.offers.value,
      icon: SPECIAL_CATEGORY_FILTERS.offers.icon,
      onClick: () => setCat(SPECIAL_CATEGORY_FILTERS.offers.value)
    }));

    fragment.appendChild(optionButton({
      label: SPECIAL_CATEGORY_FILTERS.recommended.label,
      hint: limitedRecommendedHint,
      active: catAtual === SPECIAL_CATEGORY_FILTERS.recommended.value,
      icon: SPECIAL_CATEGORY_FILTERS.recommended.icon,
      onClick: () => setCat(SPECIAL_CATEGORY_FILTERS.recommended.value)
    }));

    cats.forEach(cat => {
      fragment.appendChild(optionButton({
        label: cat,
        hint: `${countMap.get(cat)} itens`,
        active: catAtual === cat,
        icon: '🏷️ ',
        onClick: () => setCat(cat)
      }));
    });

    menu.replaceChildren(fragment);
  }

  renderSortMenus();
  updateDropdownLabels();
  renderHomeCategories();
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
  const total = db.length;
  const catsCount = new Set(db.map(p => p.categoria).filter(Boolean)).size;
  const drops = db.filter(p => p.precoMudanca?.tipo === 'queda' || isSimFlag(p.descontoAleatorio)).length;
  const hot = db.filter(isUrgentProduct).length;
  const prices = db.map(pNum).filter(n => Number.isFinite(n) && n > 0);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const avg = prices.length ? prices.reduce((acc, value) => acc + value, 0) / prices.length : 0;
  const hora = new Date(Number(timestamp) || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('homeTotal', total || '0');
  setText('homeCats', catsCount || '0');
  setText('homeDrops', drops || '0');
  setText('homeHot', hot || '0');
  setText('techMinPrice', min ? moneyFromNumber(min) : '—');
  setText('techAvgPrice', avg ? moneyFromNumber(avg) : '—');
  setText('techMaxPrice', max ? moneyFromNumber(max) : '—');
  setText('homeStatus', total ? `Hoje às ${hora}` : 'Aguardando produtos do banco de dados');
  setText('techCacheInfo', total ? 'Cache local ativo · vitrine sincronizada' : 'Sem dados carregados ainda');
  setText('techSyncState', total ? 'Online' : 'Standby');
  setText('techStatusText', total ? 'Base sincronizada' : 'Aguardando dados');
  setText('techLastRead', total ? hora : '—');

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
    if (amount <= 2) return { label: 'Estoque Baixo!', state: 'low', unavailable: false, available: true };
    return { label: 'Disponível', state: 'ok', unavailable: false, available: true };
  }

  const isAvailableWord = raw && (
    /^(sim|s|yes|true|on)$/i.test(raw) ||
    /^(disponivel|disponível|em estoque|estoque disponivel|estoque disponível)$/i.test(raw) ||
    normalized.includes('disponivel') ||
    normalized.includes('em estoque')
  );

  if (isAvailableWord) {
    return { label: low ? 'Estoque Baixo!' : 'Disponível', state: low ? 'low' : 'ok', unavailable: false, available: true };
  }

  if (raw) {
    return { label: low ? 'Estoque Baixo!' : raw, state: low ? 'low' : 'ok', unavailable: false, available: true };
  }

  return low
    ? { label: 'Estoque Baixo!', state: 'low', unavailable: false, available: true }
    : { label: 'Disponível', state: 'ok', unavailable: false, available: true };
}

function stockHtml(p, cls = 'stock-pill') {
  const stock = productStockInfo(p);
  if (stock.state === 'low') return `<span class="${cls} low">🔥 ${esc(stock.label)}</span>`;
  if (stock.state === 'unavailable') return `<span class="${cls} unavailable">⛔ ${esc(stock.label)}</span>`;
  return '';
}

function ensureModalAlertTagWrap() {
  const modalTags = document.getElementById('modalTags');
  if (!modalTags) return null;
  let wrap = document.getElementById('modalAlertTags');
  if (!wrap) {
    wrap = document.createElement('span');
    wrap.id = 'modalAlertTags';
    wrap.className = 'modal-alert-tags';
    wrap.setAttribute('aria-live', 'polite');
    modalTags.appendChild(wrap);
  }
  return wrap;
}

function modalAlertTagHtml(type, text) {
  return `<span class="modal-dynamic-tag ${esc(type)}">${esc(text)}</span>`;
}

function renderModalDynamicTags(p, { stock, desconto, isLowStock, unavailable }) {
  const wrap = ensureModalAlertTagWrap();
  const tags = [];
  const change = p?.precoMudanca;

  if (change?.tipo === 'queda') tags.push({ type: 'drop', text: '↓ Caiu' });
  if (change?.tipo === 'alta') tags.push({ type: 'rise', text: '↗ Preço subiu' });

  if (wrap) wrap.innerHTML = tags.map(tag => modalAlertTagHtml(tag.type, tag.text)).join('');

  const discountTag = document.getElementById('modalDiscountTag');
  if (discountTag) {
    discountTag.hidden = !desconto.active;
    discountTag.style.display = desconto.active ? 'inline-flex' : 'none';
    discountTag.textContent = desconto.active ? `-${desconto.percent}% OFF` : '';
  }

  return tags;
}

function isSimFlag(value) {
  const normalized = normalizeStr(value);
  return normalized === 'sim' || normalized === 's' || normalized === 'yes' || normalized === 'true' || normalized === 'on' || normalized === '1';
}

function descontoAleatorioInfo(p, fallback = '') {
  const active = isSimFlag(p?.descontoAleatorio);
  const percent = active ? Number(numeroDeterministico(`${productSeed(p, fallback)}:desconto-visual`, 10, 28, 0)) : 0;
  const current = pNum(p);
  return {
    active,
    percent,
    oldPrice: active && current > 0 && percent > 0 ? fmt(current / (1 - (percent / 100))) : ''
  };
}

function isUrgentProduct(p) {
  return isSimFlag(p?.urgente);
}

function isLowStockProduct(p) {
  const stock = productStockInfo(p);
  return stock.state === 'low' && !stock.unavailable;
}

function isOfferProduct(p) {
  return isSimFlag(p?.descontoAleatorio) || p?.precoMudanca?.tipo === 'queda';
}

function getCategoryFilterLabel(value) {
  if (value === 'todos') return 'Tudo';
  if (value === SPECIAL_CATEGORY_FILTERS.lowStock.value) return SPECIAL_CATEGORY_FILTERS.lowStock.label;
  if (value === SPECIAL_CATEGORY_FILTERS.offers.value) return SPECIAL_CATEGORY_FILTERS.offers.label;
  if (value === SPECIAL_CATEGORY_FILTERS.recommended.value) return SPECIAL_CATEGORY_FILTERS.recommended.label;
  return value || 'Tudo';
}

function aplicarFiltroCategoriaEspecial(lista, filtro) {
  if (filtro === SPECIAL_CATEGORY_FILTERS.lowStock.value) return lista.filter(isLowStockProduct);
  if (filtro === SPECIAL_CATEGORY_FILTERS.offers.value) return lista.filter(isOfferProduct).slice(0, HOME_COLLECTION_MAX_ITEMS);
  if (filtro === SPECIAL_CATEGORY_FILTERS.recommended.value) return getRecommendedProducts(HOME_COLLECTION_MAX_ITEMS, { excludeOffers: true }).map(item => item.product);
  if (filtro && filtro !== 'todos') return lista.filter(p => p.categoria === filtro);
  return [...lista];
}


function produtoCardVisualInfo(p, fallback = '', position = 0) {
  const img = productImages(p)[0] || 'https://placehold.co/400x400/F7F2E9/D48D5E?text=Sem+Imagem';
  const title = esc(p.titulo || 'Produto sem título');
  const stock = productStockInfo(p);
  const unavailable = stock.state === 'unavailable';
  const isHot = isUrgentProduct(p) && !unavailable;
  const desconto = descontoAleatorioInfo(p, fallback);
  const priceDrop = p.precoMudanca?.tipo === 'queda';
  const priceRise = p.precoMudanca?.tipo === 'alta';
  const precoAtualNum = pNum(p) || 0;
  let oldPrice = '';

  if (priceDrop && Number(p.precoMudanca?.anterior || 0) > precoAtualNum) {
    oldPrice = fmt(p.precoMudanca.anterior);
  } else if (desconto.oldPrice) {
    oldPrice = desconto.oldPrice;
  }

  return {
    img,
    title,
    stock,
    unavailable,
    isHot,
    desconto,
    priceDrop,
    priceRise,
    oldPrice,
    rating: productSocialProof(p, fallback),
    eager: position < 4
  };
}

function produtoCardClasses(base, info) {
  const priceRise = info?.priceRise;
  const priceDrop = info?.priceDrop;
  const normal = !info.unavailable && !info.isHot && !info.desconto.active && !priceDrop && !priceRise;
  return `${base}${normal ? ' is-normal-product' : ''}${info.unavailable ? ' is-unavailable' : ''}${info.isHot ? ' has-low-stock' : ''}${priceDrop ? ' has-price-drop' : ''}${priceRise ? ' has-price-rise' : ''}${info.desconto.active ? ' has-random-discount' : ''}`;
}

function produtoCardInnerHtml(p, index, position = 0) {
  const info = produtoCardVisualInfo(p, index, position);
  const { rating, sold } = info.rating;
  const discountBadge = !info.unavailable && info.priceDrop
    ? '<span class="deal-badge home-discount-badge price-drop-badge">↓ Caiu</span>'
    : (!info.unavailable && info.priceRise
      ? '<span class="deal-badge home-discount-badge price-rise-badge">↗ Alta</span>'
      : (!info.unavailable && info.desconto.active ? `<span class="deal-badge home-discount-badge discount-badge">-${info.desconto.percent}% OFF</span>` : ''));

  return `
      <span class="home-mini-img">
        <img src="${esc(info.img)}" alt="${info.title}" draggable="false" loading="${info.eager ? 'eager' : 'lazy'}" decoding="async" ${info.eager ? 'fetchpriority="high"' : ''} data-fallback="product">
        ${info.isHot ? '<span class="home-mini-tag low-stock-tag">Estoque Baixo!</span>' : ''}
        ${info.unavailable ? '<span class="stock-preview-badge">Esgotado</span>' : discountBadge}
      </span>
      <span class="home-mini-body">
        <span class="home-mini-rating"><span class="stars">★★★★★</span> ${rating} · ${sold} vendidos</span>
        <span class="home-mini-title" title="${info.title}">${info.title}</span>
        <span class="home-mini-note">👆 Clique para ver mais detalhes</span>
        <span class="home-mini-price-row">
          <span class="home-mini-price">${fmt(p.preco)}</span>
          ${info.oldPrice ? `<span class="home-mini-old">${info.oldPrice}</span>` : ''}
        </span>
        <span class="home-mini-action${info.unavailable ? ' is-unavailable' : ''}${info.isHot ? ' is-low-stock' : ''}"><span class="home-mini-action-label">${info.unavailable ? 'Esgotado' : 'Acessar'}</span></span>
      </span>`;
}

function cardHtml(p, i) {
  const info = produtoCardVisualInfo(p, i, i);
  return `
    <article class="${produtoCardClasses('card home-mini-card home-recommended-card catalog-card', info)}" data-open-index="${i}" tabindex="0" role="button" aria-label="${info.unavailable ? 'Produto esgotado. Ver detalhes de' : 'Ver detalhes de'} ${info.title}">
      ${produtoCardInnerHtml(p, i, i)}
    </article>`;
}

function fillHomeRail(railId, products, emptyText = 'Carregando achadinhos...') {
  const rail = document.getElementById(railId);
  if (!rail) return;

  if (!products.length) {
    rail.innerHTML = `<div class="home-row-empty">${esc(emptyText)}</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  products.forEach(({ product, index }, position) => {
    const info = produtoCardVisualInfo(product, index, position);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = produtoCardClasses(`home-mini-card home-recommended-card${railId === 'homePromotionsRail' ? ' home-promotion-card' : ''}`, info);
    btn.innerHTML = produtoCardInnerHtml(product, index, position);
    btn.addEventListener('click', () => openModalFromHome(index));
    fragment.appendChild(btn);
  });
  rail.replaceChildren(fragment);
  enableDesktopRailWheelScroll();
}

function openModal(i) {
  closeAllDropdowns();
  const p = visible[i];
  if (!p) return;
  const stock = productStockInfo(p);
  const unavailable = stock.state === 'unavailable';
  const isLowStock = stock.state === 'low' && !unavailable;
  const hasPriceDrop = p.precoMudanca?.tipo === 'queda';
  const hasPriceRise = p.precoMudanca?.tipo === 'alta';
  const desconto = descontoAleatorioInfo(p, i);
  const isNormalProduct = !unavailable && !isLowStock && !hasPriceDrop && !hasPriceRise && !desconto.active;
  const modalBox = document.getElementById('modalBox');
  if (modalBox) {
    modalBox.classList.toggle('is-normal-product', isNormalProduct);
    modalBox.classList.toggle('has-low-stock', isLowStock);
    modalBox.classList.toggle('has-price-drop', hasPriceDrop);
    modalBox.classList.toggle('has-price-rise', hasPriceRise);
    modalBox.classList.toggle('has-random-discount', desconto.active);
    modalBox.classList.toggle('is-unavailable', unavailable);
  }
  renderModalImages(productImages(p), p.titulo || 'Produto');

  const cat = document.getElementById('modalCat');
  if (cat) {
    cat.textContent = p.categoria || '';
    cat.style.display = p.categoria ? 'inline-flex' : 'none';
  }

  const dynamicTags = renderModalDynamicTags(p, { stock, desconto, isLowStock, unavailable });
  const showModalStockTag = isLowStock;

  const modalTags = document.getElementById('modalTags');
  if (modalTags) modalTags.hidden = !p.categoria && !desconto.active && !dynamicTags.length && !showModalStockTag;

  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.textContent = p.titulo || 'Produto sem título';

  const { rating, sold } = productSocialProof(p, i);
  const modalRating = document.getElementById('modalRating');
  if (modalRating) modalRating.innerHTML = `<span class="stars">★★★★★</span> ${rating} · ${sold} vendidos`;

  const stockTag = document.getElementById('modalStockTag');
  if (stockTag) {
    stockTag.className = `modal-stock-pill ${showModalStockTag ? 'low' : 'hidden'}`;
    stockTag.textContent = showModalStockTag ? `🔥 ${stock.label}` : '';
    stockTag.hidden = !showModalStockTag;
    stockTag.style.display = showModalStockTag ? 'inline-flex' : 'none';
  }

  const priceEl = document.getElementById('modalPrice');
  if (priceEl) {
    const precoAtualNum = pNum(p) || 0;
    const m = p.precoMudanca;
    let modalOldPrice = '';
    if (m?.tipo === 'queda' && Number(m.anterior || 0) > precoAtualNum) {
      modalOldPrice = fmt(m.anterior);
    } else if (desconto.oldPrice) {
      modalOldPrice = desconto.oldPrice;
    }
    priceEl.innerHTML = `
      <span class="modal-current-price">${esc(fmt(p.preco))}</span>
      ${modalOldPrice ? `<span class="modal-old-price">${esc(modalOldPrice)}</span>` : ''}`;
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
    linkEl.classList.toggle('has-low-stock', isLowStock);
    linkEl.textContent = unavailable ? 'Esgotado' : (isLowStock ? 'Garantir Agora 🔥' : 'Comprar Agora 🛒');
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

  const modal = document.getElementById('modal');
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden', 'false');
  lockPageScrollForModal();
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
          openHomeCollection(actionEl.dataset.kind || 'promotions');
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
  // Enable panel transitions only after initial layout settles — prevents the
  // max-height / opacity transition from firing on first paint (looks collapsed).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.getElementById('technicalPanel')?.setAttribute('data-panel-ready', '');
  }));
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

let resizeRaf = 0;
window.addEventListener('resize', () => {
  window.cancelAnimationFrame(resizeRaf);
  resizeRaf = window.requestAnimationFrame(() => {
    syncNavIndicator();
    if (document.getElementById('modal')?.classList.contains('open')) updateZoomUiState();
  });
}, { passive: true });
})();
