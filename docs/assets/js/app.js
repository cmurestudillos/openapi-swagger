/* ============================================================
   OpenAPI Swagger Editor — SPA (router hash, tema, galería y descargas)
   Sin dependencias externas.
   ============================================================ */
(() => {
  'use strict';

  const REPO = 'cmurestudillos/openapi-swagger';
  const RELEASES_URL = `https://github.com/${REPO}/releases`;
  const API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;

  /* ---------- almacenamiento tolerante a fallos ---------- */
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* modo privado o cookies bloqueadas: se ignora */
      }
    },
  };

  /* ---------- tema claro / oscuro ---------- */
  const root = document.documentElement;
  const savedTheme = store.get('ose-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.setAttribute('data-theme', savedTheme);
  }

  document.getElementById('themeToggle').addEventListener('click', () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = root.getAttribute('data-theme');
    const isDark = current === 'dark' || (current === 'auto' && prefersDark) || (!current && prefersDark);
    const next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('ose-theme', next);
  });

  /* ---------- menú móvil ---------- */
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');

  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  /* ---------- router por hash ---------- */
  const views = document.querySelectorAll('[data-route]');
  const navLinks = document.querySelectorAll('[data-route-link]');
  const routes = new Set([...views].map(v => v.dataset.route));

  const titles = {
    '/': 'OpenAPI Swagger Editor — Edita, valida y prueba especificaciones OpenAPI',
    '/caracteristicas': 'Características — OpenAPI Swagger Editor',
    '/capturas': 'Capturas — OpenAPI Swagger Editor',
    '/descargas': 'Descargas — OpenAPI Swagger Editor',
    '/documentacion': 'Documentación — OpenAPI Swagger Editor',
  };

  function currentRoute() {
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return routes.has(path) ? path : '/';
  }

  function render(scrollTop = true) {
    const route = currentRoute();

    views.forEach(view => view.classList.toggle('active', view.dataset.route === route));
    navLinks.forEach(link => {
      const isActive = link.dataset.routeLink === route;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    document.title = titles[route] || titles['/'];
    siteNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');

    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    }
  }

  window.addEventListener('hashchange', () => render());
  render(false);

  /* ---------- lightbox de capturas ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  let lastFocused = null;

  function openLightbox(src, caption, alt) {
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt || caption;
    lightboxCaption.textContent = caption;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('lightboxClose').focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.shot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const img = btn.querySelector('img');
      openLightbox(btn.dataset.full, btn.dataset.caption || '', img ? img.alt : '');
    });
  });

  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });

  /* ---------- descargas ---------- */
  const OS_LABEL = { windows: 'Windows', mac: 'macOS', linux: 'Linux' };

  function detectOS() {
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || '';
    const ua = `${platform} ${navigator.userAgent}`.toLowerCase();
    if (/mac|iphone|ipad/.test(ua)) return 'mac';
    if (/linux|android|cros/.test(ua)) return 'linux';
    if (/win/.test(ua)) return 'windows';
    return null;
  }

  function assetOS(name) {
    const n = name.toLowerCase();
    if (n.endsWith('.exe') || n.endsWith('.msi')) return 'windows';
    if (n.endsWith('.dmg') || n.endsWith('.pkg') || n.endsWith('.zip')) return 'mac';
    if (n.endsWith('.appimage') || n.endsWith('.deb') || n.endsWith('.rpm')) return 'linux';
    return null;
  }

  const formatMB = bytes => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

  const heroDownload = document.getElementById('heroDownload');
  const os = detectOS();

  function highlightOS(links) {
    if (!os) return;
    const card = document.querySelector(`.download-card[data-os="${os}"]`);
    if (card) card.classList.add('recommended');

    const direct = links[os];
    heroDownload.textContent = `⬇ Descargar para ${OS_LABEL[os]}`;
    if (direct) {
      heroDownload.href = direct;
      heroDownload.setAttribute('download', '');
    }
  }

  async function loadRelease() {
    // Enlaces por defecto: si la API de GitHub falla (sin red o límite de peticiones),
    // la página sigue llevando a la última versión publicada.
    const links = {
      windows: `${RELEASES_URL}/latest`,
      mac: `${RELEASES_URL}/latest`,
      linux: `${RELEASES_URL}/latest`,
    };

    try {
      const res = await fetch(API_LATEST, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // La primera release se publicó con el tag v1.0.0.0: se muestra como semver (v1.0.0)
      const tag = (data.tag_name || 'v1.0.0').replace(/^(v?\d+\.\d+\.\d+)\.0$/, '$1');
      document.getElementById('releaseTag').textContent = tag;
      document.getElementById('heroVersion').textContent = tag;

      if (data.published_at) {
        const fecha = new Date(data.published_at).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        document.getElementById('releaseDate').textContent = ` · publicada el ${fecha}`;
      }

      (data.assets || []).forEach(asset => {
        const target = assetOS(asset.name);
        if (!target) return;
        links[target] = asset.browser_download_url;

        const btn = document.querySelector(`[data-dl="${target}"]`);
        if (btn) {
          btn.href = asset.browser_download_url;
          btn.setAttribute('download', '');
          btn.title = asset.name;
        }
        const size = document.querySelector(`[data-size="${target}"]`);
        if (size) size.textContent = `${asset.name} · ${formatMB(asset.size)}`;
      });
    } catch {
      document.querySelectorAll('[data-dl]').forEach(btn => {
        btn.href = `${RELEASES_URL}/latest`;
      });
    } finally {
      highlightOS(links);
    }
  }

  loadRelease();
})();
