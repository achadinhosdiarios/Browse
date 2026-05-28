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
const INITIAL_SKELETON_MIN_MS = 620;
const REFRESH_SKELETON_MIN_MS = 420;

const FINAL_FIX_STYLE_ID = 'achadinhos-final-mobile-tags-fixes';
const FINAL_FIX_STYLES = `
  .modal-tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: .45rem;
  }

  .modal-tags[hidden],
  .modal-alert-tags:empty {
    display: none !important;
  }

  .modal-alert-tags {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: .4rem;
    min-width: 0;
  }

  .modal-dynamic-tag,
  .modal-discount-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .25rem;
    min-height: 1.85rem;
    padding: .42rem .68rem;
    border-radius: 999px;
    font-size: .76rem;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
    letter-spacing: -.01em;
    border: 1px solid rgba(255,255,255,.22);
    box-shadow: 0 10px 22px rgba(15, 23, 42, .08);
  }

  .modal-discount-tag,
  .modal-dynamic-tag.discount,
  .modal-dynamic-tag.drop {
    color: #7c2d12;
    background: linear-gradient(135deg, rgba(255, 237, 213, .96), rgba(254, 215, 170, .92));
    border-color: rgba(251, 146, 60, .38);
  }

  .modal-dynamic-tag.low {
    color: #7f1d1d;
    background: linear-gradient(135deg, rgba(254, 226, 226, .98), rgba(253, 186, 116, .92));
    border-color: rgba(239, 68, 68, .35);
  }

  .modal-dynamic-tag.unavailable,
  .modal-dynamic-tag.rise {
    color: #831843;
    background: linear-gradient(135deg, rgba(255, 228, 230, .98), rgba(253, 164, 175, .86));
    border-color: rgba(244, 63, 94, .35);
  }

  [data-theme="dark"] .modal-discount-tag,
  [data-theme="dark"] .modal-dynamic-tag.discount,
  [data-theme="dark"] .modal-dynamic-tag.drop {
    color: #fed7aa;
    background: linear-gradient(135deg, rgba(124, 45, 18, .86), rgba(154, 52, 18, .7));
    border-color: rgba(251, 146, 60, .42);
  }

  [data-theme="dark"] .modal-dynamic-tag.low {
    color: #fecaca;
    background: linear-gradient(135deg, rgba(127, 29, 29, .86), rgba(154, 52, 18, .72));
    border-color: rgba(248, 113, 113, .42);
  }

  [data-theme="dark"] .modal-dynamic-tag.unavailable,
  [data-theme="dark"] .modal-dynamic-tag.rise {
    color: #fecdd3;
    background: linear-gradient(135deg, rgba(136, 19, 55, .86), rgba(159, 18, 57, .68));
    border-color: rgba(251, 113, 133, .42);
  }

  #modalStock {
    display: none !important;
  }

  #homePromotionsRail {
    align-items: stretch;
  }

  #homePromotionsRail .home-mini-card {
    flex: 0 0 clamp(214px, 22vw, 246px);
    width: clamp(214px, 22vw, 246px);
    min-width: clamp(214px, 22vw, 246px);
    min-height: 356px;
    height: 100%;
    align-self: stretch;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  #homePromotionsRail .home-mini-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    min-height: 0;
    max-height: 178px;
    overflow: hidden;
  }

  #homePromotionsRail .home-mini-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  #homePromotionsRail .home-mini-body {
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  #homePromotionsRail .home-mini-title {
    min-height: 2.65em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  #homePromotionsRail .home-mini-action {
    margin-top: auto;
  }

  .modal-box.image-zoomed .modal-img-wrap {
    overflow: auto;
    touch-action: pan-x pan-y;
    overscroll-behavior: contain;
  }

  .modal-box.image-zoomed .modal-gallery-img {
    cursor: zoom-out;
  }

  .modal-box.image-zoomed .image-zoom-toggle {
    z-index: 6;
  }

  @media (max-width: 768px) {
    #homePromotionsRail .home-mini-card {
      flex-basis: min(76vw, 260px);
      width: min(76vw, 260px);
      min-width: min(76vw, 260px);
      min-height: 352px;
    }

    #homePromotionsRail .home-mini-img {
      max-height: 164px;
    }

    .modal-tags {
      gap: .38rem;
      margin-bottom: .25rem;
    }

    .modal-dynamic-tag,
    .modal-discount-tag {
      min-height: 1.72rem;
      padding: .38rem .58rem;
      font-size: .71rem;
    }

    .modal-box.image-zoomed {
      position: fixed;
      inset: 0;
      z-index: 9998;
      width: 100vw;
      height: 100dvh;
      max-width: none;
      max-height: none;
      margin: 0;
      border-radius: 0;
      overflow: visible;
      background: transparent;
      box-shadow: none;
      transform: none !important;
    }

    .modal-box.image-zoomed .modal-body,
    .modal-box.image-zoomed .modal-close {
      display: none !important;
    }

    .modal-box.image-zoomed .modal-media {
      position: fixed;
      inset: 0;
      z-index: 9999;
      width: 100vw;
      height: 100dvh;
      max-height: none;
      padding: max(14px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom));
      border-radius: 0;
      background: rgba(5, 8, 15, .94);
      display: flex;
      align-items: center;
      justify-content: center;
      isolation: isolate;
    }

    .modal-box.image-zoomed .modal-img-wrap {
      width: 100%;
      height: 100%;
      max-height: none;
      border-radius: 22px;
      background: rgba(255,255,255,.04);
      scroll-snap-type: x mandatory;
    }

    .modal-box.image-zoomed .modal-image-track,
    .modal-box.image-zoomed .modal-image-slide {
      height: 100%;
      min-height: 100%;
    }

    .modal-box.image-zoomed .modal-image-slide {
      min-width: 100%;
      scroll-snap-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-box.image-zoomed .modal-gallery-img {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transform: none !important;
      transform-origin: center center !important;
    }

    .modal-box.image-zoomed .modal-image-hint {
      position: fixed;
      left: 50%;
      bottom: calc(18px + env(safe-area-inset-bottom));
      z-index: 10001;
      transform: translateX(-50%);
      width: max-content;
      max-width: calc(100vw - 32px);
      padding: .58rem .9rem;
      border-radius: 999px;
      color: #fff;
      background: rgba(15, 23, 42, .76);
      backdrop-filter: blur(10px);
      text-align: center;
      font-size: .78rem;
      box-shadow: 0 16px 32px rgba(0,0,0,.28);
    }

    .modal-box.image-zoomed .image-zoom-toggle {
      position: fixed;
      top: max(12px, env(safe-area-inset-top));
      right: 12px;
      z-index: 10002;
      min-height: 42px;
      border-radius: 999px;
      color: #fff;
      background: rgba(15, 23, 42, .72);
      border: 1px solid rgba(255,255,255,.16);
      backdrop-filter: blur(10px);
      box-shadow: 0 16px 32px rgba(0,0,0,.28);
    }

    .modal-box.image-zoomed .image-nav {
      position: fixed;
      z-index: 10001;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(15, 23, 42, .68);
      color: #fff;
      border-color: rgba(255,255,255,.18);
    }

    .modal-box.image-zoomed .image-prev { left: 10px; }
    .modal-box.image-zoomed .image-next { right: 10px; }
  }

/* ── Ajustes finais solicitados: zoom premium, skeletons, pulse e painel compacto ── */
.sync-dot,
.live-dot,
.status-dot,
.online-dot {
  position: relative !important;
  animation: onlinePulse 1.8s ease-out infinite !important;
  will-change: transform, box-shadow !important;
}

.home-product-rail {
  grid-auto-columns: minmax(220px, calc((100% - 1.8rem) / 3)) !important;
  align-items: stretch !important;
}

#homePromotionsRail.home-product-rail > .home-mini-card,
#homeRecommendedRail.home-product-rail > .home-mini-card,
.home-product-rail > .home-mini-card {
  flex: initial !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  min-height: 370px !important;
  height: 100% !important;
  align-self: stretch !important;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
}

#homePromotionsRail .home-mini-img,
#homeRecommendedRail .home-mini-img,
.home-product-rail .home-mini-img {
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  max-height: none !important;
}

.product-skeleton {
  cursor: default !important;
  pointer-events: none !important;
  min-height: 370px !important;
}

.home-product-rail .product-skeleton {
  width: 100% !important;
  min-width: 0 !important;
}

.product-skeleton .skel-line.rating { width: 58%; height: 10px; }
.product-skeleton .skel-line.title { width: 88%; }
.product-skeleton .skel-line.price { width: 48%; height: 20px; }
.product-skeleton .skel-line.button { height: 42px; border-radius: var(--radius-sm); margin-top: auto; }
body.is-loading-products .home-product-rail,
body.is-loading-products .product-grid { pointer-events: none; }

.tech-pill-panel:not(.is-collapsed) {
  max-width: 560px !important;
  padding: 0.7rem !important;
}

.tech-pill-shell {
  gap: 0.65rem !important;
}

.tech-pill-title small {
  max-width: 17rem !important;
}

.tech-pill-details {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 0.5rem !important;
  padding-top: 0.65rem !important;
  max-height: 230px !important;
  overflow: hidden !important;
}

.tech-panel-summary {
  grid-column: 1 / -1 !important;
  min-height: auto !important;
  padding: 0.68rem 0.78rem !important;
}

.tech-panel-summary strong { font-size: 0.84rem !important; }
.tech-panel-summary small { font-size: 0.68rem !important; margin-top: 0.18rem !important; }

.tech-pill-metric {
  min-height: 58px !important;
  padding: 0.58rem 0.55rem !important;
  border-radius: 16px !important;
}

.tech-pill-metric small {
  font-size: 0.61rem !important;
  line-height: 1.1 !important;
}

.tech-pill-metric strong {
  font-size: 1rem !important;
  line-height: 1.05 !important;
}

.modal-overlay.image-zoom-active {
  padding: clamp(0.7rem, 2vw, 1.4rem) !important;
}

.modal-overlay.image-zoom-active .modal-backdrop {
  background: rgba(10, 8, 6, 0.78) !important;
  backdrop-filter: blur(5px) saturate(1.1) !important;
  -webkit-backdrop-filter: blur(5px) saturate(1.1) !important;
}

.modal-box.image-zoomed {
  width: min(960px, 96vw) !important;
  max-width: 960px !important;
  max-height: min(88dvh, 820px) !important;
  border-radius: 30px !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(270px, 0.38fr) !important;
  background: color-mix(in srgb, var(--surface-solid) 94%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border)) !important;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.34) !important;
  overflow: hidden !important;
}

.modal-box.image-zoomed .modal-media {
  min-height: min(72dvh, 620px) !important;
  max-height: min(72dvh, 620px) !important;
  padding: clamp(0.8rem, 2vw, 1.25rem) !important;
  background: radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--accent-light) 78%, transparent), transparent 44%), color-mix(in srgb, var(--surface-2) 82%, #000 8%) !important;
  border-right: 1px solid var(--border) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.modal-box.image-zoomed .modal-img-wrap {
  width: 100% !important;
  height: 100% !important;
  max-height: none !important;
  border-radius: 24px !important;
  border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--border)) !important;
  background: color-mix(in srgb, var(--surface-solid) 58%, transparent) !important;
  overflow: hidden !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 18px 45px rgba(0, 0, 0, 0.16) !important;
}

.modal-box.image-zoomed .modal-image-track,
.modal-box.image-zoomed .modal-image-slide {
  height: 100% !important;
  min-height: 100% !important;
}

.modal-box.image-zoomed .modal-image-slide {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.modal-box.image-zoomed .modal-gallery-img {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  transform: scale(1.72) !important;
  cursor: zoom-out !important;
}

.modal-box.image-zoomed .modal-body {
  display: flex !important;
  align-items: stretch !important;
  justify-content: center !important;
  text-align: left !important;
  padding: 1.25rem !important;
  overflow-y: auto !important;
}

.modal-box.image-zoomed .image-zoom-toggle {
  top: 16px !important;
  left: 16px !important;
  z-index: 12 !important;
  color: #fff !important;
  background: rgba(17, 24, 39, 0.74) !important;
  border-color: rgba(255, 255, 255, 0.18) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}

.modal-box.image-zoomed .modal-close {
  display: flex !important;
  z-index: 13 !important;
  background: rgba(17, 24, 39, 0.74) !important;
  color: #fff !important;
  border-color: rgba(255, 255, 255, 0.16) !important;
}

.modal-box.image-zoomed .image-nav {
  opacity: 1 !important;
  pointer-events: auto !important;
  color: #fff !important;
  background: rgba(17, 24, 39, 0.64) !important;
  border-color: rgba(255, 255, 255, 0.18) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}

.modal-box.image-zoomed .modal-image-hint {
  opacity: 1 !important;
  pointer-events: none !important;
  color: #fff !important;
  background: rgba(17, 24, 39, 0.68) !important;
  border: 1px solid rgba(255, 255, 255, 0.13) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}

@media (max-width: 820px) {
  .tech-pill-details {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    max-height: none !important;
  }

  .tech-panel-summary {
    grid-column: 1 / -1 !important;
  }

  .home-product-rail {
    grid-auto-columns: minmax(214px, 76%) !important;
  }

  .modal-box.image-zoomed {
    position: fixed !important;
    inset: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom)) !important;
    width: auto !important;
    height: auto !important;
    max-width: none !important;
    max-height: none !important;
    border-radius: 28px !important;
    display: flex !important;
    grid-template-columns: none !important;
    background: rgba(8, 10, 16, 0.96) !important;
    overflow: hidden !important;
  }

  .modal-box.image-zoomed .modal-media {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    height: 100% !important;
    max-height: none !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;
    padding: max(0.8rem, env(safe-area-inset-top)) 0.72rem max(0.9rem, env(safe-area-inset-bottom)) !important;
    border-right: 0 !important;
    border-radius: inherit !important;
    background: radial-gradient(circle at 24% 8%, rgba(212, 141, 94, 0.22), transparent 40%), rgba(8, 10, 16, 0.96) !important;
  }

  .modal-box.image-zoomed .modal-body {
    display: none !important;
  }

  .modal-box.image-zoomed .modal-close {
    display: flex !important;
    position: fixed !important;
    top: max(14px, env(safe-area-inset-top)) !important;
    right: 14px !important;
  }

  .modal-box.image-zoomed .image-zoom-toggle {
    position: fixed !important;
    top: max(14px, env(safe-area-inset-top)) !important;
    left: 14px !important;
    right: auto !important;
  }

  .modal-box.image-zoomed .modal-img-wrap {
    height: 100% !important;
    border-radius: 24px !important;
    background: rgba(255, 255, 255, 0.045) !important;
  }

  .modal-box.image-zoomed .modal-gallery-img {
    transform: none !important;
    object-fit: contain !important;
  }

  .modal-box.image-zoomed .modal-image-hint {
    position: fixed !important;
    left: 50% !important;
    bottom: max(18px, env(safe-area-inset-bottom)) !important;
    transform: translateX(-50%) !important;
    width: max-content !important;
    max-width: calc(100vw - 36px) !important;
  }
}

@media (max-width: 430px) {
  .home-product-rail { grid-auto-columns: minmax(206px, 82%) !important; }
  .tech-pill-metric { min-height: 54px !important; }
}

@media (prefers-reduced-motion: reduce) {
  .sync-dot,
  .live-dot,
  .status-dot,
  .online-dot,
  .product-skeleton .skel-img,
  .product-skeleton .skel-line,
  .product-skeleton::after {
    animation: none !important;
  }
}


/* ── Refinos V3: zoom compacto, trilhos uniformes, painel 2x2 e skeletons consistentes ── */
#homePromotionsRail.home-product-rail,
#homeRecommendedRail.home-product-rail {
  grid-auto-columns: clamp(208px, calc((100% - 1.7rem) / 3), 238px) !important;
  gap: 0.85rem !important;
  align-items: stretch !important;
  padding-bottom: 0.45rem !important;
}

#homePromotionsRail.home-product-rail > .home-mini-card,
#homeRecommendedRail.home-product-rail > .home-mini-card,
#homePromotionsRail.home-product-rail > .home-mini-card:first-child {
  flex: initial !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  min-height: 352px !important;
  height: 100% !important;
  align-self: stretch !important;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  transform: none;
}

#homePromotionsRail .home-mini-img,
#homeRecommendedRail .home-mini-img {
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  max-height: none !important;
  min-height: 0 !important;
}

#homePromotionsRail .home-mini-body,
#homeRecommendedRail .home-mini-body {
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}

#homePromotionsRail .home-mini-action,
#homeRecommendedRail .home-mini-action {
  margin-top: auto !important;
}

.product-skeleton {
  min-height: 352px !important;
  height: 100% !important;
  content-visibility: visible !important;
  border-color: color-mix(in srgb, var(--accent) 12%, var(--border)) !important;
}

.home-product-rail .product-skeleton {
  width: 100% !important;
  min-width: 0 !important;
}

body.is-loading-products .home-product-rail,
body.is-loading-products .product-grid {
  pointer-events: none !important;
  user-select: none !important;
}

.tech-pill-panel:not(.is-collapsed) {
  max-width: min(530px, 100%) !important;
  padding: 0.72rem !important;
}

.tech-pill-details {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 0.52rem !important;
  padding-top: 0.64rem !important;
  max-height: none !important;
  overflow: visible !important;
}

.tech-pill-details > .tech-pill-metric {
  order: 1 !important;
  min-height: 58px !important;
  padding: 0.58rem 0.62rem !important;
  border-radius: 16px !important;
}

.tech-pill-details > .tech-panel-summary {
  order: 2 !important;
  grid-column: 1 / -1 !important;
  min-height: 0 !important;
  padding: 0.66rem 0.78rem !important;
  border-radius: 16px !important;
}

.tech-last-label {
  display: block;
  margin-bottom: 0.16rem;
  color: var(--accent);
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.tech-panel-summary strong {
  display: block !important;
  font-size: 0.82rem !important;
  line-height: 1.14 !important;
}

.tech-panel-summary small {
  display: block !important;
  margin-top: 0.18rem !important;
  font-size: 0.66rem !important;
  line-height: 1.18 !important;
}

.modal-overlay.image-zoom-active {
  align-items: center !important;
  justify-content: center !important;
  padding: clamp(0.75rem, 2vw, 1.25rem) !important;
}

.modal-overlay.image-zoom-active .modal-backdrop {
  background: rgba(17, 13, 10, 0.70) !important;
  backdrop-filter: blur(7px) saturate(1.08) !important;
  -webkit-backdrop-filter: blur(7px) saturate(1.08) !important;
}

.modal-box.image-zoomed {
  width: min(760px, calc(100vw - 28px)) !important;
  max-width: 760px !important;
  height: auto !important;
  max-height: min(80dvh, 680px) !important;
  border-radius: 28px !important;
  display: flex !important;
  flex-direction: column !important;
  grid-template-columns: none !important;
  background: color-mix(in srgb, var(--surface-solid) 93%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--border)) !important;
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.34) !important;
  overflow: hidden !important;
}

.modal-box.image-zoomed .modal-body {
  display: none !important;
}

.modal-box.image-zoomed .modal-media {
  position: relative !important;
  width: 100% !important;
  min-height: min(68dvh, 560px) !important;
  max-height: min(68dvh, 560px) !important;
  padding: clamp(0.72rem, 1.5vw, 1rem) !important;
  border-right: 0 !important;
  background:
    radial-gradient(circle at 18% 8%, color-mix(in srgb, var(--accent-light) 82%, transparent), transparent 42%),
    color-mix(in srgb, var(--surface-2) 82%, #000 8%) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.modal-box.image-zoomed .modal-img-wrap {
  width: 100% !important;
  height: 100% !important;
  max-height: none !important;
  border-radius: 22px !important;
  border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border)) !important;
  background: color-mix(in srgb, var(--surface-solid) 54%, transparent) !important;
  overflow: hidden !important;
  cursor: zoom-out !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 16px 40px rgba(0, 0, 0, 0.16) !important;
}

.modal-box.image-zoomed .modal-image-track,
.modal-box.image-zoomed .modal-image-slide {
  height: 100% !important;
  min-height: 100% !important;
}

.modal-box.image-zoomed .modal-image-slide {
  min-width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.modal-box.image-zoomed .modal-gallery-img {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  transform: scale(1.42) !important;
  transform-origin: 50% 50%;
  transition: transform 0.22s var(--spring), transform-origin 0.08s linear !important;
  cursor: zoom-out !important;
}

@media (hover: hover) and (pointer: fine) {
  .modal-box.image-zoomed .modal-gallery-img {
    transform: scale(1.54) !important;
  }
}

.modal-box.image-zoomed .image-zoom-toggle,
.modal-box.image-zoomed .modal-close,
.modal-box.image-zoomed .image-nav,
.modal-box.image-zoomed .modal-image-hint {
  color: #fff !important;
  background: rgba(17, 24, 39, 0.70) !important;
  border-color: rgba(255, 255, 255, 0.16) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22) !important;
}

.modal-box.image-zoomed .image-zoom-toggle {
  position: absolute !important;
  top: 14px !important;
  left: 14px !important;
  right: auto !important;
  z-index: 12 !important;
  min-height: 40px !important;
  border-radius: 999px !important;
}

.modal-box.image-zoomed .modal-close {
  display: flex !important;
  z-index: 13 !important;
}

.modal-box.image-zoomed .image-nav {
  opacity: 1 !important;
  pointer-events: auto !important;
}

.modal-box.image-zoomed .modal-image-hint {
  opacity: 1 !important;
  pointer-events: none !important;
}

@media (max-width: 820px) {
  #homePromotionsRail.home-product-rail,
  #homeRecommendedRail.home-product-rail {
    grid-auto-columns: minmax(206px, 78%) !important;
  }

  #homePromotionsRail.home-product-rail > .home-mini-card,
  #homeRecommendedRail.home-product-rail > .home-mini-card,
  .product-skeleton {
    min-height: 344px !important;
  }

  .tech-pill-panel:not(.is-collapsed) {
    max-width: 100% !important;
  }

  .tech-pill-details {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0.48rem !important;
  }

  .tech-panel-summary {
    grid-column: 1 / -1 !important;
  }

  .modal-box.image-zoomed {
    position: fixed !important;
    inset: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom)) !important;
    width: auto !important;
    height: auto !important;
    max-width: none !important;
    max-height: none !important;
    border-radius: 26px !important;
    background: rgba(8, 10, 16, 0.96) !important;
  }

  .modal-box.image-zoomed .modal-media {
    min-height: 0 !important;
    max-height: none !important;
    height: 100% !important;
    flex: 1 1 auto !important;
    padding: max(0.72rem, env(safe-area-inset-top)) 0.68rem max(0.85rem, env(safe-area-inset-bottom)) !important;
    background: radial-gradient(circle at 22% 8%, rgba(212, 141, 94, 0.22), transparent 40%), rgba(8, 10, 16, 0.96) !important;
  }

  .modal-box.image-zoomed .modal-img-wrap {
    height: 100% !important;
    border-radius: 22px !important;
    background: rgba(255, 255, 255, 0.045) !important;
  }

  .modal-box.image-zoomed .modal-gallery-img {
    transform: none !important;
    object-fit: contain !important;
  }

  .modal-box.image-zoomed .image-zoom-toggle {
    position: fixed !important;
    top: max(14px, env(safe-area-inset-top)) !important;
    left: 14px !important;
  }

  .modal-box.image-zoomed .modal-image-hint {
    position: fixed !important;
    left: 50% !important;
    bottom: max(18px, env(safe-area-inset-bottom)) !important;
    transform: translateX(-50%) !important;
    width: max-content !important;
    max-width: calc(100vw - 36px) !important;
  }
}

@media (max-width: 430px) {
  #homePromotionsRail.home-product-rail,
  #homeRecommendedRail.home-product-rail {
    grid-auto-columns: minmax(198px, 82%) !important;
  }

  .tech-pill-details {
    gap: 0.42rem !important;
  }

  .tech-pill-metric {
    min-height: 52px !important;
    padding-inline: 0.5rem !important;
  }
}


/* ── Correção final: cards únicos não aumentam de escala ── */
#homePromotionsRail.home-product-rail,
#homeRecommendedRail.home-product-rail {
  justify-content: flex-start !important;
  justify-items: stretch !important;
}

#homePromotionsRail.home-product-rail > .home-mini-card:only-child,
#homeRecommendedRail.home-product-rail > .home-mini-card:only-child,
#homePromotionsRail.home-product-rail > .product-skeleton:only-child,
#homeRecommendedRail.home-product-rail > .product-skeleton:only-child {
  inline-size: clamp(208px, calc((100% - 1.7rem) / 3), 238px) !important;
  width: clamp(208px, calc((100% - 1.7rem) / 3), 238px) !important;
  max-width: clamp(208px, calc((100% - 1.7rem) / 3), 238px) !important;
  justify-self: start !important;
}

.product-grid > .catalog-card:only-child {
  justify-self: start !important;
  width: 100% !important;
}

@media (min-width: 821px) {
  .product-grid > .catalog-card:only-child {
    max-width: calc((100% - 1.7rem) / 3) !important;
  }
}

@media (max-width: 820px) {
  #homePromotionsRail.home-product-rail > .home-mini-card:only-child,
  #homeRecommendedRail.home-product-rail > .home-mini-card:only-child,
  #homePromotionsRail.home-product-rail > .product-skeleton:only-child,
  #homeRecommendedRail.home-product-rail > .product-skeleton:only-child {
    inline-size: min(78%, 260px) !important;
    width: min(78%, 260px) !important;
    max-width: min(78%, 260px) !important;
  }

  .product-grid > .catalog-card:only-child {
    max-width: calc((100% - 0.8rem) / 2) !important;
  }
}

@media (max-width: 430px) {
  #homePromotionsRail.home-product-rail > .home-mini-card:only-child,
  #homeRecommendedRail.home-product-rail > .home-mini-card:only-child,
  #homePromotionsRail.home-product-rail > .product-skeleton:only-child,
  #homeRecommendedRail.home-product-rail > .product-skeleton:only-child {
    inline-size: min(82%, 248px) !important;
    width: min(82%, 248px) !important;
    max-width: min(82%, 248px) !important;
  }
}

/* ── Correção definitiva: cards com tamanho constante em qualquer quantidade ── */
body[data-view="home"] .home-product-rail,
.home-product-rail {
  display: grid !important;
  grid-auto-flow: column !important;
  grid-auto-columns: minmax(0, calc((100% - 1.8rem) / 3)) !important;
  justify-content: start !important;
  justify-items: stretch !important;
  align-items: stretch !important;
  gap: 0.9rem !important;
}

#homePromotionsRail.home-product-rail,
#homeRecommendedRail.home-product-rail {
  grid-auto-columns: minmax(0, calc((100% - 1.8rem) / 3)) !important;
  justify-content: start !important;
  justify-items: stretch !important;
  align-items: stretch !important;
}

.home-product-rail > .home-mini-card,
.home-product-rail > .home-mini-card:only-child,
#homePromotionsRail.home-product-rail > .home-mini-card,
#homeRecommendedRail.home-product-rail > .home-mini-card,
#homePromotionsRail.home-product-rail > .home-mini-card:only-child,
#homeRecommendedRail.home-product-rail > .home-mini-card:only-child,
.home-product-rail > .product-skeleton,
.home-product-rail > .product-skeleton:only-child,
#homePromotionsRail.home-product-rail > .product-skeleton:only-child,
#homeRecommendedRail.home-product-rail > .product-skeleton:only-child {
  inline-size: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  justify-self: stretch !important;
  align-self: stretch !important;
  transform-origin: center center !important;
}

body[data-view="explorer"] .product-grid,
body[data-view="search"] .product-grid,
.product-grid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  justify-content: start !important;
  justify-items: stretch !important;
  align-items: stretch !important;
}

body[data-view="explorer"] .product-grid > .catalog-card,
body[data-view="search"] .product-grid > .catalog-card,
.product-grid > .catalog-card,
.product-grid > .catalog-card:only-child {
  inline-size: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  justify-self: stretch !important;
  align-self: stretch !important;
  grid-column: auto !important;
}

@media (max-width: 820px) {
  body[data-view="home"] .home-product-rail,
  .home-product-rail,
  #homePromotionsRail.home-product-rail,
  #homeRecommendedRail.home-product-rail {
    grid-auto-columns: minmax(0, calc((100% - 0.8rem) / 2)) !important;
    gap: 0.8rem !important;
  }

  body[data-view="explorer"] .product-grid,
  body[data-view="search"] .product-grid,
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0.8rem !important;
  }

  .home-product-rail > .home-mini-card,
  .home-product-rail > .home-mini-card:only-child,
  #homePromotionsRail.home-product-rail > .home-mini-card:only-child,
  #homeRecommendedRail.home-product-rail > .home-mini-card:only-child,
  .home-product-rail > .product-skeleton:only-child,
  .product-grid > .catalog-card:only-child {
    inline-size: 100% !important;
    width: 100% !important;
    max-width: none !important;
    justify-self: stretch !important;
  }
}

@media (max-width: 370px) {
  body[data-view="home"] .home-product-rail,
  .home-product-rail,
  #homePromotionsRail.home-product-rail,
  #homeRecommendedRail.home-product-rail {
    grid-auto-columns: minmax(0, calc((100% - 0.62rem) / 2)) !important;
    gap: 0.62rem !important;
  }
}


/* ── Correção pontual: Recomendados com layout estável ── */
#homeRecommendedRail.home-product-rail {
  display: grid !important;
  grid-auto-flow: column !important;
  grid-auto-columns: minmax(0, calc((100% - 1.8rem) / 3)) !important;
  gap: 0.9rem !important;
  justify-content: start !important;
  justify-items: stretch !important;
  align-items: stretch !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scroll-snap-type: x proximity !important;
}

#homeRecommendedRail.home-product-rail > .home-mini-card,
#homeRecommendedRail.home-product-rail > .home-recommended-card,
#homeRecommendedRail.home-product-rail > .home-mini-card:only-child,
#homeRecommendedRail.home-product-rail > .product-skeleton,
#homeRecommendedRail.home-product-rail > .product-skeleton:only-child {
  inline-size: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  min-height: 370px !important;
  height: 100% !important;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  justify-self: stretch !important;
  align-self: stretch !important;
  scroll-snap-align: start !important;
  transform: none !important;
  contain: layout paint !important;
  content-visibility: visible !important;
}

#homeRecommendedRail .home-mini-img {
  inline-size: 100% !important;
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  max-height: none !important;
  min-height: 0 !important;
  flex: none !important;
}

#homeRecommendedRail .home-mini-img img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

#homeRecommendedRail .home-mini-body {
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}

#homeRecommendedRail .home-mini-title {
  min-height: 2.65em !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}

#homeRecommendedRail .home-mini-price-row {
  min-height: 1.45rem !important;
  margin-top: auto !important;
}

#homeRecommendedRail .home-mini-action {
  min-height: 38px !important;
  margin-top: auto !important;
}

@media (max-width: 820px) {
  #homeRecommendedRail.home-product-rail {
    grid-auto-columns: minmax(0, calc((100% - 0.8rem) / 2)) !important;
    gap: 0.8rem !important;
  }

  #homeRecommendedRail.home-product-rail > .home-mini-card,
  #homeRecommendedRail.home-product-rail > .home-recommended-card,
  #homeRecommendedRail.home-product-rail > .home-mini-card:only-child,
  #homeRecommendedRail.home-product-rail > .product-skeleton:only-child {
    inline-size: 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 350px !important;
    justify-self: stretch !important;
  }
}

@media (max-width: 370px) {
  #homeRecommendedRail.home-product-rail {
    grid-auto-columns: minmax(0, calc((100% - 0.62rem) / 2)) !important;
    gap: 0.62rem !important;
  }
}


/* ── Correção final: Recomendados em carrossel uniforme ── */
body[data-view="home"] #homeRecommendedRail.home-product-rail {
  display: grid !important;
  grid-auto-flow: column !important;
  grid-template-columns: none !important;
  grid-auto-columns: clamp(208px, calc((100% - 1.7rem) / 3), 238px) !important;
  gap: 0.85rem !important;
  justify-content: flex-start !important;
  justify-items: stretch !important;
  align-items: stretch !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  overscroll-behavior-x: contain !important;
  scroll-snap-type: x proximity !important;
  padding: 0.05rem 0.05rem 0.45rem !important;
}

body[data-view="home"] #homeRecommendedRail.home-product-rail > .home-mini-card,
body[data-view="home"] #homeRecommendedRail.home-product-rail > .home-recommended-card,
body[data-view="home"] #homeRecommendedRail.home-product-rail > .product-skeleton {
  inline-size: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  min-height: 352px !important;
  height: 100% !important;
  flex: initial !important;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  justify-self: stretch !important;
  align-self: stretch !important;
  scroll-snap-align: start !important;
  transform: none !important;
  contain: layout paint !important;
  content-visibility: visible !important;
}

body[data-view="home"] #homeRecommendedRail .home-mini-img {
  inline-size: 100% !important;
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  max-height: none !important;
  min-height: 0 !important;
  flex: none !important;
}

body[data-view="home"] #homeRecommendedRail .home-mini-img img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

body[data-view="home"] #homeRecommendedRail .home-mini-body {
  min-height: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

body[data-view="home"] #homeRecommendedRail .home-mini-title {
  min-height: 2.4em !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}

body[data-view="home"] #homeRecommendedRail .home-mini-price-row {
  min-height: 1.45rem !important;
  margin-top: 0 !important;
}

body[data-view="home"] #homeRecommendedRail .home-mini-action {
  min-height: 46px !important;
  margin-top: auto !important;
}

@media (max-width: 820px) {
  body[data-view="home"] #homeRecommendedRail.home-product-rail {
    grid-auto-columns: minmax(206px, 78%) !important;
    gap: 0.85rem !important;
  }

  body[data-view="home"] #homeRecommendedRail.home-product-rail > .home-mini-card,
  body[data-view="home"] #homeRecommendedRail.home-product-rail > .home-recommended-card,
  body[data-view="home"] #homeRecommendedRail.home-product-rail > .product-skeleton {
    min-height: 344px !important;
  }
}

@media (max-width: 430px) {
  body[data-view="home"] #homeRecommendedRail.home-product-rail {
    grid-auto-columns: minmax(198px, 82%) !important;
  }
}




/* ── Correção final: skeletons dos carrosséis com o mesmo layout dos cards ── */
body[data-view="home"] #homeRecommendedRail.home-product-rail > .product-skeleton,
body[data-view="home"] #homeRecommendedRail.home-product-rail > .home-mini-skel,
body[data-view="home"] #homePromotionsRail.home-product-rail > .product-skeleton,
body[data-view="home"] #homePromotionsRail.home-product-rail > .home-mini-skel {
  inline-size: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  min-height: 352px !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 0.62rem !important;
  justify-self: stretch !important;
  align-self: stretch !important;
  scroll-snap-align: start !important;
  transform: none !important;
  contain: layout paint !important;
  content-visibility: visible !important;
}

body[data-view="home"] #homeRecommendedRail.home-product-rail > .product-skeleton:only-child,
body[data-view="home"] #homeRecommendedRail.home-product-rail > .home-mini-skel:only-child,
body[data-view="home"] #homePromotionsRail.home-product-rail > .product-skeleton:only-child,
body[data-view="home"] #homePromotionsRail.home-product-rail > .home-mini-skel:only-child {
  inline-size: 100% !important;
  width: 100% !important;
  max-width: 100% !important;
  justify-self: stretch !important;
}

body[data-view="home"] #homeRecommendedRail .product-skeleton .skel-img,
body[data-view="home"] #homePromotionsRail .product-skeleton .skel-img {
  inline-size: 100% !important;
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  min-height: 0 !important;
  max-height: none !important;
  flex: 0 0 auto !important;
  border-radius: var(--radius-sm) !important;
}

body[data-view="home"] #homeRecommendedRail .product-skeleton .skel-line,
body[data-view="home"] #homePromotionsRail .product-skeleton .skel-line {
  flex: 0 0 auto !important;
}

body[data-view="home"] #homeRecommendedRail .product-skeleton .skel-line.rating,
body[data-view="home"] #homePromotionsRail .product-skeleton .skel-line.rating {
  width: 58% !important;
  height: 10px !important;
}

body[data-view="home"] #homeRecommendedRail .product-skeleton .skel-line.title,
body[data-view="home"] #homePromotionsRail .product-skeleton .skel-line.title {
  width: 88% !important;
  min-height: 2.4em !important;
}

body[data-view="home"] #homeRecommendedRail .product-skeleton .skel-line.price,
body[data-view="home"] #homePromotionsRail .product-skeleton .skel-line.price {
  width: 48% !important;
  height: 20px !important;
}

body[data-view="home"] #homeRecommendedRail .product-skeleton .skel-line.button,
body[data-view="home"] #homePromotionsRail .product-skeleton .skel-line.button {
  width: 100% !important;
  height: 46px !important;
  min-height: 46px !important;
  margin-top: auto !important;
  border-radius: var(--radius-sm) !important;
}

@media (max-width: 820px) {
  body[data-view="home"] #homeRecommendedRail.home-product-rail > .product-skeleton,
  body[data-view="home"] #homeRecommendedRail.home-product-rail > .home-mini-skel,
  body[data-view="home"] #homePromotionsRail.home-product-rail > .product-skeleton,
  body[data-view="home"] #homePromotionsRail.home-product-rail > .home-mini-skel {
    min-height: 344px !important;
  }
}

/* ── Correção final V2: skeleton de Ofertas igual ao Recomendados ── */
body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail {
  display: grid !important;
  grid-auto-flow: column !important;
  grid-template-columns: none !important;
  grid-auto-columns: clamp(208px, calc((100% - 1.7rem) / 3), 238px) !important;
  gap: 0.85rem !important;
  justify-content: flex-start !important;
  justify-items: stretch !important;
  align-items: stretch !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  overscroll-behavior-x: contain !important;
  scroll-snap-type: x proximity !important;
  padding: 0.05rem 0.05rem 0.45rem !important;
}

body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail > .product-skeleton,
body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail > .home-mini-skel,
body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail > .product-skeleton:only-child,
body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail > .home-mini-skel:only-child {
  inline-size: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  min-height: 352px !important;
  height: 100% !important;
  flex: initial !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 0.62rem !important;
  justify-self: stretch !important;
  align-self: stretch !important;
  scroll-snap-align: start !important;
  transform: none !important;
  contain: layout paint !important;
  content-visibility: visible !important;
}

body.is-loading-products[data-view="home"] #homePromotionsRail .product-skeleton .skel-img {
  inline-size: 100% !important;
  width: 100% !important;
  aspect-ratio: 1 / 1 !important;
  min-height: 0 !important;
  max-height: none !important;
  flex: 0 0 auto !important;
  border-radius: var(--radius-sm) !important;
}

body.is-loading-products[data-view="home"] #homePromotionsRail .product-skeleton .skel-line {
  flex: 0 0 auto !important;
}

body.is-loading-products[data-view="home"] #homePromotionsRail .product-skeleton .skel-line.rating {
  width: 58% !important;
  height: 10px !important;
}

body.is-loading-products[data-view="home"] #homePromotionsRail .product-skeleton .skel-line.title {
  width: 88% !important;
  min-height: 2.4em !important;
}

body.is-loading-products[data-view="home"] #homePromotionsRail .product-skeleton .skel-line.price {
  width: 48% !important;
  height: 20px !important;
}

body.is-loading-products[data-view="home"] #homePromotionsRail .product-skeleton .skel-line.button {
  width: 100% !important;
  height: 46px !important;
  min-height: 46px !important;
  margin-top: auto !important;
  border-radius: var(--radius-sm) !important;
}

@media (max-width: 820px) {
  body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail {
    grid-auto-columns: minmax(206px, 78%) !important;
    gap: 0.85rem !important;
  }

  body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail > .product-skeleton,
  body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail > .home-mini-skel {
    min-height: 344px !important;
  }
}

@media (max-width: 430px) {
  body.is-loading-products[data-view="home"] #homePromotionsRail.home-product-rail {
    grid-auto-columns: minmax(198px, 82%) !important;
  }
}

`;

function injectFinalFixStyles() {
  if (document.getElementById(FINAL_FIX_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FINAL_FIX_STYLE_ID;
  style.textContent = FINAL_FIX_STYLES;
  document.head.appendChild(style);
}

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
    <div class="skel product-skeleton ${extraClass}" aria-hidden="true">
      <div class="skel-img"></div>
      <div class="skel-line rating"></div>
      <div class="skel-line title"></div>
      <div class="skel-line price"></div>
      <div class="skel-line button"></div>
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
    rail.innerHTML = Array.from({ length: count }, () => skeletonCardHtml('home-mini-skel')).join('');
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

const SPECIAL_CATEGORY_FILTERS = {
  lowStock: { value: '__estoque_baixo__', label: 'Estoque baixo', icon: '🔥 ', empty: 'Nenhum produto com estoque baixo agora.' },
  offers: { value: '__ofertas__', label: 'Ofertas', icon: '🏷️ ', empty: 'Nenhuma oferta com desconto ativa agora.' }
};

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
  homeListMode = kind === 'recommended' ? 'recommended' : 'promotions';
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
  if (scroller) scroller.scrollTo({ left: scroller.clientWidth * modalImageIndex, behavior: 'smooth' });
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

function getPromotionProducts(limit = 10) {
  return db
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => isOfferProduct(product))
    .sort((a, b) => Number(isSimFlag(b.product.descontoAleatorio)) - Number(isSimFlag(a.product.descontoAleatorio)))
    .slice(0, limit);
}

function renderHomeShowcases(forceRender = false) {
  const promotions = getPromotionProducts(10);
  const recommended = getRecommendedProducts(10);
  const homeRenderKey = `${currentHash}|${promotions.map(({ product, index }) => produtoKey(product) || index).join(',')}|${recommended.map(({ product, index }) => produtoKey(product) || index).join(',')}`;

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
    hint.textContent = `Mostrando produtos com desconto exibido no site. Ordenação atual: ${sort}.`;
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
      ? getRecommendedProducts(db.length).map(item => item.product)
      : db.filter(isOfferProduct);
    visible = lista;
    if (countEl) countEl.textContent = lista.length;
    const meta = document.getElementById('exploreResultMeta');
    const hint = document.getElementById('exploreResultHint');
    if (meta) meta.textContent = homeListMode === 'recommended'
      ? `${lista.length} achadinho${lista.length === 1 ? '' : 's'} recomendados`
      : `${lista.length} ${lista.length === 1 ? 'promoção ativa' : 'promoções ativas'}`;
    if (hint) hint.textContent = homeListMode === 'recommended'
      ? 'Lista completa ranqueada por preço, destaque, urgência e histórico de queda.'
      : 'Lista completa com produtos que exibem desconto ou queda de preço no site.';
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
  const lowStockCount = db.filter(isLowStockProduct).length;
  const offersCount = db.filter(isOfferProduct).length;

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

    menu.appendChild(optionButton({
      label: SPECIAL_CATEGORY_FILTERS.lowStock.label,
      hint: `${lowStockCount} ${lowStockCount === 1 ? 'item' : 'itens'}`,
      active: catAtual === SPECIAL_CATEGORY_FILTERS.lowStock.value,
      icon: SPECIAL_CATEGORY_FILTERS.lowStock.icon,
      onClick: () => setCat(SPECIAL_CATEGORY_FILTERS.lowStock.value)
    }));

    menu.appendChild(optionButton({
      label: SPECIAL_CATEGORY_FILTERS.offers.label,
      hint: `${offersCount} ${offersCount === 1 ? 'item com desconto' : 'itens com desconto'}`,
      active: catAtual === SPECIAL_CATEGORY_FILTERS.offers.value,
      icon: SPECIAL_CATEGORY_FILTERS.offers.icon,
      onClick: () => setCat(SPECIAL_CATEGORY_FILTERS.offers.value)
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
  const drops = db.filter(p => p.precoMudanca?.tipo === 'queda' || isSimFlag(p.descontoAleatorio)).length;
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
  setText('techMinPrice', min ? moneyFromNumber(min) : '—');
  setText('techAvgPrice', avg ? moneyFromNumber(avg) : '—');
  setText('techMaxPrice', max ? moneyFromNumber(max) : '—');
  setText('homeStatus', total ? `Hoje às ${hora}` : 'Aguardando produtos do banco de dados');
  setText('techCacheInfo', total ? 'Cache local ativo · vitrine sincronizada' : 'Sem dados carregados ainda');
  setText('techSyncState', total ? 'Online' : 'Standby');
  setText('techStatusText', total ? 'Base sincronizada' : 'Aguardando dados');
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
  if (stock.state !== 'unavailable') return '';
  return `<span class="${cls} unavailable">⛔ ${esc(stock.label)}</span>`;
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

  if (isLowStock) tags.push({ type: 'low', text: '🔥 Estoque Baixo!' });
  if (unavailable) tags.push({ type: 'unavailable', text: '⛔ Esgotado' });
  if (change?.tipo === 'queda') tags.push({ type: 'drop', text: '↓ Caiu' });
  if (change?.tipo === 'alta') tags.push({ type: 'rise', text: '↗ Preço subiu' });

  if (wrap) wrap.innerHTML = tags.map(tag => modalAlertTagHtml(tag.type, tag.text)).join('');

  const discountTag = document.getElementById('modalDiscountTag');
  if (discountTag) {
    discountTag.hidden = !desconto.active;
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
  return value || 'Tudo';
}

function aplicarFiltroCategoriaEspecial(lista, filtro) {
  if (filtro === SPECIAL_CATEGORY_FILTERS.lowStock.value) return lista.filter(isLowStockProduct);
  if (filtro === SPECIAL_CATEGORY_FILTERS.offers.value) return lista.filter(isOfferProduct);
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
    oldPrice,
    rating: productSocialProof(p, fallback),
    eager: position < 4
  };
}

function produtoCardClasses(base, info) {
  return `${base}${info.unavailable ? ' is-unavailable' : ''}${info.isHot ? ' has-low-stock' : ''}${info.desconto.active ? ' has-random-discount' : ''}`;
}

function produtoCardInnerHtml(p, index, position = 0) {
  const info = produtoCardVisualInfo(p, index, position);
  const { rating, sold } = info.rating;
  const discountBadge = !info.unavailable && info.priceDrop
    ? '<span class="deal-badge home-discount-badge">↓ Caiu</span>'
    : (!info.unavailable && info.desconto.active ? `<span class="deal-badge home-discount-badge">-${info.desconto.percent}% OFF</span>` : '');

  return `
      <span class="home-mini-img">
        <img src="${esc(info.img)}" alt="${info.title}" draggable="false" loading="${info.eager ? 'eager' : 'lazy'}" decoding="async" ${info.eager ? 'fetchpriority="high"' : ''} data-fallback="product">
        ${info.isHot ? '<span class="home-mini-tag low-stock-tag">Estoque Baixo!</span>' : ''}
        ${info.unavailable ? '<span class="stock-preview-badge">Esgotado</span>' : discountBadge}
      </span>
      <span class="home-mini-body">
        <span class="home-mini-rating"><span class="stars">★★★★★</span> ${rating} · ${sold} vendidos</span>
        <strong class="home-mini-title" title="${info.title}">${info.title}</strong>
        <span class="home-mini-note">👆 Clique para ver mais detalhes</span>
        ${stockHtml(p, 'stock-pill home-stock-pill')}
        <span class="home-mini-price-row">
          <span class="home-mini-price">${fmt(p.preco)}</span>
          ${info.oldPrice ? `<span class="home-mini-old">${info.oldPrice}</span>` : ''}
        </span>
        <span class="home-mini-action${info.unavailable ? ' is-unavailable' : ''}${info.isHot ? ' is-low-stock' : ''}"><strong>${info.unavailable ? 'Esgotado' : 'Acessar'}</strong></span>
      </span>`;
}

function cardHtml(p, i) {
  const info = produtoCardVisualInfo(p, i, i);
  return `
    <article class="${produtoCardClasses('card home-mini-card catalog-card', info)}" data-open-index="${i}" tabindex="0" role="button" aria-label="${info.unavailable ? 'Produto esgotado. Ver detalhes de' : 'Ver detalhes de'} ${info.title}">
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
    btn.className = produtoCardClasses(`home-mini-card${railId === 'homePromotionsRail' ? ' home-promotion-card' : (railId === 'homeRecommendedRail' ? ' home-recommended-card' : '')}`, info);
    btn.innerHTML = produtoCardInnerHtml(product, index, position);
    btn.addEventListener('click', () => openModalFromHome(index));
    fragment.appendChild(btn);
  });
  rail.replaceChildren(fragment);
}

function openModal(i) {
  const p = visible[i];
  if (!p) return;
  const stock = productStockInfo(p);
  const unavailable = stock.state === 'unavailable';
  const isLowStock = stock.state === 'low' && !unavailable;
  const modalBox = document.getElementById('modalBox');
  if (modalBox) {
    modalBox.classList.toggle('has-low-stock', isLowStock);
    modalBox.classList.toggle('is-unavailable', unavailable);
  }
  renderModalImages(productImages(p), p.titulo || 'Produto');

  const desconto = descontoAleatorioInfo(p, i);
  const cat = document.getElementById('modalCat');
  if (cat) {
    cat.textContent = p.categoria || '';
    cat.style.display = p.categoria ? 'inline-flex' : 'none';
  }

  const dynamicTags = renderModalDynamicTags(p, { stock, desconto, isLowStock, unavailable });

  const modalTags = document.getElementById('modalTags');
  if (modalTags) modalTags.hidden = !p.categoria && !desconto.active && !dynamicTags.length;

  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.textContent = p.titulo || 'Produto sem título';

  const { rating, sold } = productSocialProof(p, i);
  const modalRating = document.getElementById('modalRating');
  if (modalRating) modalRating.innerHTML = `<span class="stars">★★★★★</span> ${rating} · ${sold} vendidos${unavailable ? ' · Esgotado' : ''}`;

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

  document.getElementById('modalStock')?.remove();

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
  injectFinalFixStyles();
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

window.addEventListener('resize', () => {
  syncNavIndicator();
  if (document.getElementById('modal')?.classList.contains('open')) updateZoomUiState();
});
})();
