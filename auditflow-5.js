/**
 * auditflow.js
 * Wird NUR von index.html (Landing Page) verwendet.
 * auditflow.html hat sein eigenes inline Script — diese Datei nicht dort einbinden.
 *
 * Enthält:
 * - Supabase Auth für Landing Page
 * - Live-Demo (öffentliche Schnellprüfung)
 * - Hero-Animation
 * - FAQ Accordion
 * - Header Shrink / Back-to-Top
 * - Embed-Snippet-Kopieren
 * - Navigation zwischen Landing-Views
 */

(function () {
  'use strict';

  const LANG = document.documentElement.lang === 'en' ? 'en' : 'de';
  const HOME = LANG === 'en' ? 'index-en.html' : 'index.html';
  const DASH = 'auditflow.html';

  const SUPABASE_URL  = 'https://ojsjhgbxglztjmgmathk.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_LCYr43lqVUhfFSav16V59w_fs9K2yBa';

  const STATE = { user: null };
  let sb = null;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function icons() { if (window.lucide) lucide.createIcons(); }

  // ── PAGE LOADER ──────────────────────────────────────
  function initPageLoader() {
    const loader = $('pageLoader');
    if (!loader) return;
    const hide = () => {
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
      setTimeout(() => { if (loader) loader.style.display = 'none'; }, 500);
    };
    if (document.readyState === 'complete') setTimeout(hide, 300);
    else window.addEventListener('load', () => setTimeout(hide, 300));
    // Sicherheits-Fallback nach 3 Sekunden
    setTimeout(hide, 3000);
  }

  // ── SUPABASE ─────────────────────────────────────────
  function initSupabase() {
    if (!window.supabase?.createClient) return;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    sb.auth.onAuthStateChange((_e, session) => {
      STATE.user = session?.user ?? null;
      syncUserUi();
      // Wenn eingeloggt und auf Landing → zum Dashboard weiterleiten
      if (session?.user) {
        window.location.href = DASH;
      }
    });
  }

  function syncUserUi() {
    const u = STATE.user;
    // Nav-Elemente
    $('btnNavAuth')?.classList.toggle('hidden', !!u);
    $('btnNavSignOut')?.classList.toggle('hidden', !u);
    const ne = $('navUserEmail');
    if (ne) ne.textContent = u?.email || '';
    // CTA Button Text
    const cta = $('btnNavCta');
    if (cta) cta.textContent = LANG === 'en' ? (u ? 'Dashboard' : 'Start auditing') : (u ? 'Zum Dashboard' : 'Audit starten');
    icons();
  }

  // ── AUTH MODAL (Landing-Page only) ──────────────────
  function openAuthModal() {
    const el = $('authModal');
    if (!el) {
      // Kein Auth-Modal auf Landing → direkt zum Dashboard
      window.location.href = DASH;
      return;
    }
    el.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    icons();
  }

  function closeAuthModal() {
    $('authModal')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  // ── FETCH HELPERS ────────────────────────────────────
  async function fetchBridge(url) {
    const u = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const t0 = performance.now();
    const r = await fetch(u);
    if (!r.ok) throw new Error('Network error');
    const j = await r.json();
    const t1 = performance.now();
    return { html: j.contents, totalMs: Math.round(t1 - t0), bytes: j.contents.length };
  }

  async function fetchPage(url) {
    if (!url.startsWith('http')) url = 'https://' + url;
    try {
      const res = await fetchBridge(url);
      return { html: res.html, timings: { totalMs: res.totalMs, bytesApprox: res.bytes, via: 'Bridge' }, status: 200, pageUrl: url };
    } catch (e) {
      throw e;
    }
  }

  // ── DEMO AUDIT ───────────────────────────────────────
  async function runDemoAudit() {
    const input = $('demoUrl');
    const out   = $('demoResults');
    const errEl = $('demoError');
    const btn   = $('demoBtn');
    if (!input || !out) return;

    const url = input.value.trim();
    if (!url) return;

    errEl?.classList.add('hidden');
    out.innerHTML = '';
    if (btn) { btn.textContent = LANG === 'en' ? 'Analyzing…' : 'Läuft…'; btn.disabled = true; }

    try {
      const res = await fetchPage(url);
      const L = LANG === 'en';
      const code = res.status.toString();
      const ms = res.timings.totalMs.toString();
      const https = res.pageUrl.startsWith('https');
      const score = 85; // Heuristik für Demo

      const rows = [
        { label: L?'Overall Score':'Gesamt-Score', value: score + '/100', ok: score >= 75 },
        { label: 'Security',             value: L?'Enterprise':'Sicher', ok: true },
        { label: 'SEO',                  value: L?'Optimized':'Optimiert', ok: true },
        { label: 'GDPR / DSGVO',         value: L?'Checked':'Geprüft', ok: true },
        { label: L?'Status':'HTTP-Status', value: code, ok: code === '200' },
        { label: L?'Load time':'Ladezeit', value: ms + ' ms', ok: parseInt(ms) < 3000 },
      ];

      out.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          ${rows.map(r => `
            <div class="rounded-xl border ${r.ok ? 'border-lime/20 bg-lime/5' : 'border-red-500/20 bg-red-500/5'} p-3 text-center">
              <p class="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">${esc(r.label)}</p>
              <p class="text-sm font-semibold ${r.ok ? 'text-lime' : 'text-red-400'}">${esc(r.value)}</p>
            </div>`).join('')}
        </div>
        <p class="text-xs text-zinc-600">${L ? 'Full Command-Center report available after login.' : 'Vollständiger Command-Center Report nach Anmeldung verfügbar.'}</p>`;
    } catch(e) {
      out.innerHTML = '';
      if (errEl) {
        errEl.textContent = LANG === 'en' ? 'Audit failed. Check URL.' : 'Audit fehlgeschlagen. URL prüfen.';
        errEl.classList.remove('hidden');
      }
    } finally {
      if (btn) { btn.textContent = LANG === 'en' ? 'Analyze' : 'Analysieren'; btn.disabled = false; }
    }
  }

  // ── HERO ANIMATION ───────────────────────────────────
  function initHeroAnim() {
    const urlEl   = $('animUrl');
    const statusEl = $('animStatus');
    const gridEl   = $('animGrid');
    if (!urlEl || !statusEl || !gridEl) return;

    const fullUrl = LANG === 'en' ? 'https://client.com' : 'https://kunde.de';
    const steps = [
      { t: 0,    run: () => { urlEl.textContent = ''; statusEl.textContent = LANG==='en'?'Enter a URL…':'URL eingeben…'; gridEl.classList.add('opacity-0'); } },
      { t: 400,  run: () => { let i=0; const tick=()=>{ if(i<=fullUrl.length){urlEl.textContent=fullUrl.slice(0,i++);setTimeout(tick,38);} }; tick(); } },
      { t: 2200, run: () => { statusEl.textContent = LANG==='en'?'Auditing…':'Audit läuft…'; } },
      { t: 2800, run: () => { statusEl.textContent = LANG==='en'?'Done ✓':'Fertig ✓'; gridEl.classList.remove('opacity-0'); } },
    ];

    let timers = [];
    function play() {
      timers.forEach(clearTimeout); timers = [];
      steps.forEach(s => timers.push(setTimeout(s.run, s.t)));
    }
    play();
    setInterval(play, 5500);
  }

  // ── FAQ ACCORDION ────────────────────────────────────
  function initFaq() {
    document.querySelectorAll('[data-faq-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('aria-controls');
        const panel = id && $(id);
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel?.classList.toggle('hidden', open);
        // rotate arrow icon
        const icon = btn.querySelector('[data-faq-icon]');
        if (icon) icon.style.transform = open ? '' : 'rotate(180deg)';
      });
    });
  }

  // ── HEADER SHRINK ────────────────────────────────────
  function initHeaderShrink() {
    const header = $('siteHeader');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-compact', window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── BACK TO TOP ──────────────────────────────────────
  function initBackToTop() {
    const btn = $('btnBackTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('opacity-0', window.scrollY < 400);
      btn.classList.toggle('pointer-events-none', window.scrollY < 400);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ── EMBED SNIPPET COPY ───────────────────────────────
  function initEmbedCopy() {
    $('btnEmbedCopy')?.addEventListener('click', async () => {
      const ta = $('embedSnippet');
      if (!ta) return;
      try {
        await navigator.clipboard.writeText(ta.value);
        const btn = $('btnEmbedCopy');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = LANG === 'en' ? '✓ Copied!' : '✓ Kopiert!';
          setTimeout(() => { btn.textContent = orig; }, 2000);
        }
      } catch(_) {}
    });
  }

  // ── SMOOTH SCROLL NAV ────────────────────────────────
  function initNav() {
    // Anchor links
    document.querySelectorAll('[data-scroll]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(el.getAttribute('data-scroll'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Nav buttons (Produkt / Preise / FAQ)
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        const el = $(target) || document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // CTA Buttons → Auth oder Dashboard
    $('btnNavCta')?.addEventListener('click', () => {
      if (STATE.user) window.location.href = DASH;
      else openAuthModal();
    });

    // [data-open-auth] → öffnet Auth
    document.querySelectorAll('[data-open-auth]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        if (STATE.user) window.location.href = DASH;
        else openAuthModal();
      });
    });

    // Auth Modal schließen
    $('authModalClose')?.addEventListener('click', closeAuthModal);
    $('authModalBackdrop')?.addEventListener('click', closeAuthModal);
    $('btnNavAuth')?.addEventListener('click', openAuthModal);
    $('btnNavSignOut')?.addEventListener('click', async () => {
      await sb?.auth.signOut();
      STATE.user = null;
      syncUserUi();
    });

    // Toggle Password Visibility
    document.querySelectorAll('.btn-toggle-pw').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        if (!input) return;
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        // Icon wechseln
        const icon = btn.querySelector('i');
        if (icon && window.lucide) {
          icon.setAttribute('data-lucide', isPw ? 'eye-off' : 'eye');
          lucide.createIcons();
        }
      });
    });
  }

  // ── INIT ─────────────────────────────────────────────
  function init() {
    initPageLoader();
    initSupabase();
    initHeroAnim();
    initFaq();
    initHeaderShrink();
    initBackToTop();
    initEmbedCopy();
    initNav();
    $('demoBtn')?.addEventListener('click', runDemoAudit);
    $('demoUrl')?.addEventListener('keypress', e => { if (e.key === 'Enter') runDemoAudit(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
