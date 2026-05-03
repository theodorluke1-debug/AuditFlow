/**
 * auditflow.js
 * Wird NUR von index.html (Landing Page) verwendet.
 * auditflow.html hat sein eigenes inline Script â€” diese Datei nicht dort einbinden.
 */

(function () {
  'use strict';

  const LANG = document.documentElement.lang === 'en' ? 'en' : 'de';
  const DASH = 'auditflow.html';

  const SUPABASE_URL  = 'https://ojsjhgbxglztjmgmathk.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_LCYr43lqVUhfFSav16V59w_fs9K2yBa';

  const STATE = { user: null };
  let sb = null;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function icons() { if (window.lucide) lucide.createIcons(); }

  // â”€â”€ PAGE LOADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    setTimeout(hide, 3000);
  }

  // â”€â”€ SUPABASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function initSupabase() {
    if (!window.supabase?.createClient) return;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    sb.auth.onAuthStateChange((_e, session) => {
      STATE.user = session?.user ?? null;
      syncUserUi();
      if (session?.user) {
        window.location.href = DASH;
      }
    });
  }

  function syncUserUi() {
    const u = STATE.user;
    $('btnNavAuth')?.classList.toggle('hidden', !!u);
    $('btnNavSignOut')?.classList.toggle('hidden', !u);
    const ne = $('navUserEmail');
    if (ne) ne.textContent = u?.email || '';
    const cta = $('btnNavCta');
    if (cta) cta.textContent = LANG === 'en' ? (u ? 'Dashboard' : 'Start Audit') : (u ? 'Zum Dashboard' : 'Audit starten');
    icons();
  }

  // â”€â”€ AUTH MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function openAuthModal() {
    const el = $('authModal');
    if (!el) { window.location.href = DASH; return; }
    el.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    showAuthView('main');
    icons();
  }

  function closeAuthModal() {
    $('authModal')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  function showAuthView(view) {
    ['main', 'magic', 'pass', 'confirm'].forEach(v => {
      $(`authView${v.charAt(0).toUpperCase() + v.slice(1)}`)?.classList.toggle('hidden', v !== view);
    });
  }

  // â”€â”€ FETCH HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    const res = await fetchBridge(url);
    return { html: res.html, timings: { totalMs: res.totalMs, bytesApprox: res.bytes }, status: 200, pageUrl: url };
  }

  // â”€â”€ DEMO AUDIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function runDemoAudit() {
    const input = $('demoUrl');
    const out   = $('demoResults');
    const errEl = $('demoError');
    const btn   = $('btnDemoStart'); // Korrigierte ID
    if (!input || !out) return;

    const url = input.value.trim();
    if (!url) return;

    errEl?.classList.add('hidden');
    out.innerHTML = '';
    if (btn) { btn.textContent = LANG === 'en' ? 'Analyzingâ€¦' : 'LÃ¤uftâ€¦'; btn.disabled = true; }

    try {
      const res = await fetchPage(url);
      const L = LANG === 'en';
      const code = res.status.toString();
      const ms = res.timings.totalMs.toString();
      const score = 85;

      const rows = [
        { label: L?'Overall Score':'Gesamt-Score', value: score + '/100', ok: score >= 75 },
        { label: 'Security',             value: L?'Enterprise':'Sicher', ok: true },
        { label: 'SEO',                  value: L?'Optimized':'Optimiert', ok: true },
        { label: 'GDPR / DSGVO',         value: L?'Checked':'GeprÃ¼ft', ok: true },
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
        <p class="text-xs text-zinc-600">${L ? 'Full Command-Center report available after login.' : 'VollstÃ¤ndiger Command-Center Report nach Anmeldung verfÃ¼gbar.'}</p>`;
    } catch(e) {
      if (errEl) {
        errEl.textContent = LANG === 'en' ? 'Audit failed. Check URL.' : 'Audit fehlgeschlagen. URL prÃ¼fen.';
        errEl.classList.remove('hidden');
      }
    } finally {
      if (btn) { btn.textContent = LANG === 'en' ? 'Analyze' : 'Analysieren'; btn.disabled = false; }
    }
  }

  // â”€â”€ HERO ANIMATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function initHeroAnim() {
    const urlEl   = $('animUrl');
    const statusEl = $('animStatus');
    const gridEl   = $('animGrid');
    if (!urlEl || !statusEl || !gridEl) return;

    const fullUrl = LANG === 'en' ? 'https://client.com' : 'https://kunde.de';
    const steps = [
      { t: 0,    run: () => { urlEl.textContent = ''; statusEl.textContent = LANG==='en'?'Enter a URLâ€¦':'URL eingebenâ€¦'; gridEl.classList.add('opacity-0'); } },
      { t: 400,  run: () => { let i=0; const tick=()=>{ if(i<=fullUrl.length){urlEl.textContent=fullUrl.slice(0,i++);setTimeout(tick,38);} }; tick(); } },
      { t: 2200, run: () => { statusEl.textContent = LANG==='en'?'Auditingâ€¦':'Audit lÃ¤uftâ€¦'; } },
      { t: 2800, run: () => { statusEl.textContent = LANG==='en'?'Done âœ“':'Fertig âœ“'; gridEl.classList.remove('opacity-0'); } },
    ];

    let timers = [];
    function play() {
      timers.forEach(clearTimeout); timers = [];
      steps.forEach(s => timers.push(setTimeout(s.run, s.t)));
    }
    play();
    setInterval(play, 5500);
  }

  // â”€â”€ FAQ ACCORDION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function initFaq() {
    document.querySelectorAll('[data-faq-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('aria-controls');
        const panel = id && $(id);
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel?.classList.toggle('hidden', open);
        const icon = btn.querySelector('[data-lucide="chevron-down"]');
        if (icon) icon.style.transform = open ? '' : 'rotate(180deg)';
      });
    });
  }

  // â”€â”€ HEADER SHRINK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function initHeaderShrink() {
    const header = $('siteHeader');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-compact', window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // â”€â”€ BACK TO TOP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function initBackToTop() {
    const btn = $('btnBackTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('opacity-0', window.scrollY < 400);
      btn.classList.toggle('pointer-events-none', window.scrollY < 400);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // â”€â”€ NAV & AUTH WIRING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function initNav() {
    // Nav links
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        const el = $(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // CTA Buttons
    $('btnNavCta')?.addEventListener('click', () => {
      if (STATE.user) window.location.href = DASH;
      else openAuthModal();
    });
    document.querySelectorAll('[data-open-auth]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        if (STATE.user) window.location.href = DASH;
        else openAuthModal();
      });
    });

    // Modal Close
    $('authModalClose')?.addEventListener('click', closeAuthModal);
    $('authModalBackdrop')?.addEventListener('click', closeAuthModal);
    $('authBack')?.addEventListener('click', closeAuthModal);
    $('btnNavAuth')?.addEventListener('click', openAuthModal);

    // Sign Out
    $('btnNavSignOut')?.addEventListener('click', async () => {
      await sb?.auth.signOut();
      STATE.user = null;
      syncUserUi();
    });

    // Auth View Switching
    $('btnSelectMagic')?.addEventListener('click', () => showAuthView('magic'));
    $('btnSelectPass')?.addEventListener('click', () => showAuthView('pass'));
    document.querySelectorAll('.btnAuthBackToSelection').forEach(btn => {
      btn.addEventListener('click', () => showAuthView('main'));
    });
    $('btnConfirmBack')?.addEventListener('click', () => showAuthView('magic'));

    // Tab Switching (Login/Register)
    $('tabSignIn')?.addEventListener('click', () => {
      $('tabSignIn').classList.add('bg-zinc-800', 'text-white');
      $('tabSignIn').classList.remove('text-zinc-400');
      $('tabSignUp').classList.remove('bg-zinc-800', 'text-white');
      $('tabSignUp').classList.add('text-zinc-400');
      $('formSignIn').classList.remove('hidden');
      $('formSignUp').classList.add('hidden');
    });
    $('tabSignUp')?.addEventListener('click', () => {
      $('tabSignUp').classList.add('bg-zinc-800', 'text-white');
      $('tabSignUp').classList.remove('text-zinc-400');
      $('tabSignIn').classList.remove('bg-zinc-800', 'text-white');
      $('tabSignIn').classList.add('text-zinc-400');
      $('formSignUp').classList.remove('hidden');
      $('formSignIn').classList.add('hidden');
    });

    // Password Toggle
    document.querySelectorAll('.btn-toggle-pw').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        if (!input) return;
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon && window.lucide) {
          icon.setAttribute('data-lucide', isPw ? 'eye-off' : 'eye');
          lucide.createIcons();
        }
      });
    });

    // Form Submits
    $('formMagic')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('magicEmail')?.value.trim();
      if (!email) return;
      const btn = $('btnMagicSubmit');
      btn.disabled = true;
      try {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        $('confirmEmail').textContent = email;
        showAuthView('confirm');
      } catch(err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
    });

    $('formSignIn')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('inEmail')?.value.trim();
      const password = $('inPass')?.value;
      if (!email || !password) return;
      try {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } catch(err) {
        const errEl = $('authError');
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
      }
    });

    $('formSignUp')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('upEmail')?.value.trim();
      const password = $('upPass')?.value;
      if (!email || !password) return;
      try {
        const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        alert(LANG === 'en' ? 'Account created! Please check your email.' : 'Konto erstellt! Bitte prÃ¼fe deine E-Mails.');
        closeAuthModal();
      } catch(err) {
        const errEl = $('authErrorUp');
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
      }
    });
  }

  // â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function init() {
    initPageLoader();
    initSupabase();
    initHeroAnim();
    initFaq();
    initHeaderShrink();
    initBackToTop();
    initNav();
    $('btnDemoStart')?.addEventListener('click', runDemoAudit);
    $('demoUrl')?.addEventListener('keypress', e => { if (e.key === 'Enter') runDemoAudit(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
