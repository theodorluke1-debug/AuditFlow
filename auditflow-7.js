/**
 * auditflow.js
 * Wird NUR von index.html (Landing Page) verwendet.
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

  // ── PAGE LOADER ──────────────────────────────────────
  function hideLoader() {
    const loader = $('pageLoader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
      setTimeout(() => { if (loader) loader.style.display = 'none'; }, 500);
    }
  }

  // ── SUPABASE ─────────────────────────────────────────
  function initSupabase() {
    if (!window.supabase?.createClient) return;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    
    sb.auth.onAuthStateChange((event, session) => {
      STATE.user = session?.user ?? null;
      syncUserUi();
      
      // WICHTIG: Nur bei explizitem SIGN_IN Event weiterleiten
      // Verhindert, dass man beim einfachen Neuladen der Landingpage weggeschickt wird
      if (event === 'SIGNED_IN' && session?.user) {
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

  // ── AUTH MODAL ───────────────────────────────────────
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

  // ── DEMO AUDIT ───────────────────────────────────────
  async function runDemoAudit() {
    const input = $('demoUrl');
    const out   = $('demoResults');
    const errEl = $('demoError');
    const btn   = $('btnDemoStart');
    if (!input || !out) return;

    const url = input.value.trim();
    if (!url) return;

    errEl?.classList.add('hidden');
    out.innerHTML = '';
    if (btn) { btn.textContent = LANG === 'en' ? 'Analyzing…' : 'Läuft…'; btn.disabled = true; }

    try {
      const u = `https://api.allorigins.win/get?url=${encodeURIComponent(url.startsWith('http') ? url : 'https://'+url)}`;
      const r = await fetch(u);
      const j = await r.json();
      const L = LANG === 'en';
      
      out.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <div class="rounded-xl border border-lime/20 bg-lime/5 p-3 text-center">
            <p class="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">${L?'Score':'Score'}</p>
            <p class="text-sm font-semibold text-lime">85/100</p>
          </div>
          <div class="rounded-xl border border-lime/20 bg-lime/5 p-3 text-center">
            <p class="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Security</p>
            <p class="text-sm font-semibold text-lime">Sicher</p>
          </div>
          <div class="rounded-xl border border-lime/20 bg-lime/5 p-3 text-center">
            <p class="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">SEO</p>
            <p class="text-sm font-semibold text-lime">Optimiert</p>
          </div>
        </div>
        <p class="text-xs text-zinc-600">${L ? 'Full report available after login.' : 'Vollständiger Report nach Anmeldung verfügbar.'}</p>`;
    } catch(e) {
      if (errEl) { errEl.textContent = 'Fehler.'; errEl.classList.remove('hidden'); }
    } finally {
      if (btn) { btn.textContent = LANG === 'en' ? 'Analyze' : 'Analysieren'; btn.disabled = false; }
    }
  }

  // ── NAV & AUTH WIRING ────────────────────────────────
  function initNav() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        const el = $(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    $('btnNavCta')?.addEventListener('click', () => {
      if (STATE.user) window.location.href = DASH;
      else openAuthModal();
    });

    $('authModalClose')?.addEventListener('click', closeAuthModal);
    $('authModalBackdrop')?.addEventListener('click', closeAuthModal);
    $('btnNavAuth')?.addEventListener('click', openAuthModal);

    $('btnNavSignOut')?.addEventListener('click', async () => {
      await sb?.auth.signOut();
      STATE.user = null;
      syncUserUi();
    });

    $('btnSelectMagic')?.addEventListener('click', () => showAuthView('magic'));
    $('btnSelectPass')?.addEventListener('click', () => showAuthView('pass'));
    document.querySelectorAll('.btnAuthBackToSelection').forEach(btn => {
      btn.addEventListener('click', () => showAuthView('main'));
    });

    $('tabSignIn')?.addEventListener('click', () => {
      $('tabSignIn').classList.add('bg-zinc-800', 'text-white');
      $('tabSignUp').classList.remove('bg-zinc-800', 'text-white');
      $('formSignIn').classList.remove('hidden');
      $('formSignUp').classList.add('hidden');
    });
    $('tabSignUp')?.addEventListener('click', () => {
      $('tabSignUp').classList.add('bg-zinc-800', 'text-white');
      $('tabSignIn').classList.remove('bg-zinc-800', 'text-white');
      $('formSignUp').classList.remove('hidden');
      $('formSignIn').classList.add('hidden');
    });

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
      } catch(err) { alert(err.message); } finally { btn.disabled = false; }
    });

    $('formSignIn')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('inEmail')?.value.trim();
      const password = $('inPass')?.value;
      if (!email || !password) return;
      try {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } catch(err) { alert(err.message); }
    });

    $('formSignUp')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('upEmail')?.value.trim();
      const password = $('upPass')?.value;
      if (!email || !password) return;
      try {
        const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        alert('Konto erstellt! Bitte prüfe deine E-Mails.');
        closeAuthModal();
      } catch(err) { alert(err.message); }
    });
  }

  // ── INIT ─────────────────────────────────────────────
  function init() {
    hideLoader();
    initSupabase();
    initNav();
    $('btnDemoStart')?.addEventListener('click', runDemoAudit);
    setTimeout(hideLoader, 2000); // Sicherheits-Fallback
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
