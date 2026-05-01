/**
 * auditflow.js
 * Zentrales Skript für Landing Page UND Dashboard.
 * Optimiert für Persistenz via Supabase & LocalStorage.
 */

(function () {
  'use strict';

  const LANG = document.documentElement.lang === 'en' ? 'en' : 'de';
  const DASH = 'auditflow.html';
  const HOME = LANG === 'en' ? 'index-en.html' : 'index.html';

  const SUPABASE_URL  = 'https://ojsjhgbxglztjmgmathk.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_LCYr43lqVUhfFSav16V59w_fs9K2yBa';

  const STATE = {
    user: null,
    sb: null,
    lastAudit: null,
    history: [],
    plan: 'free',
    auditCount: 0
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function icons() { if (window.lucide) lucide.createIcons(); }

  // ── STORAGE HELPERS ──────────────────────────────────
  const Storage = {
    saveLastAudit: (data) => {
      localStorage.setItem('af_last_audit', JSON.stringify(data));
    },
    getLastAudit: () => {
      const d = localStorage.getItem('af_last_audit');
      return d ? JSON.parse(d) : null;
    },
    saveHistory: (list) => {
      localStorage.setItem('af_audit_history', JSON.stringify(list.slice(0, 20)));
    },
    getHistory: () => {
      const d = localStorage.getItem('af_audit_history');
      return d ? JSON.parse(d) : [];
    }
  };

  // ── INITIALISIERUNG ──────────────────────────────────
  async function init() {
    initPageLoader();
    initSupabase();
    
    // Lade sofort aus LocalStorage für schnelle UI
    STATE.lastAudit = Storage.getLastAudit();
    STATE.history = Storage.getHistory();
    
    // Wenn wir auf dem Dashboard sind, zeige die gecachten Daten
    if (window.location.pathname.includes(DASH)) {
      if (STATE.lastAudit && typeof renderResults === 'function') {
        renderResults(STATE.lastAudit, null, STATE.lastAudit.competitor || null);
      }
      updateHistoryUi();
    }

    // Event Listeners für Landing Page
    initLandingEvents();
  }

  function initPageLoader() {
    const loader = $('pageLoader');
    if (!loader) return;
    const hide = () => {
      loader.classList.add('fade-out');
      setTimeout(() => { if (loader) loader.style.display = 'none'; }, 450);
    };
    if (document.readyState === 'complete') setTimeout(hide, 200);
    else window.addEventListener('load', () => setTimeout(hide, 200));
  }

  function initSupabase() {
    if (!window.supabase?.createClient) return;
    STATE.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

    STATE.sb.auth.onAuthStateChange(async (_e, session) => {
      STATE.user = session?.user ?? null;
      syncUserUi();
      
      if (STATE.user) {
        // Wenn auf Landing und eingeloggt -> zum Dashboard (außer wir kommen gerade vom Login)
        if (!window.location.pathname.includes(DASH)) {
           // Nur redirecten wenn nicht explizit auf Landing bleiben gewollt
        }
        // Lade frische Daten von Supabase
        await syncWithSupabase();
      }
    });
  }

  async function syncWithSupabase() {
    if (!STATE.sb || !STATE.user) return;

    try {
      // 1. Lade Audit-Count für Limit-Check
      const { count, error: countErr } = await STATE.sb
        .from('audits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', STATE.user.id);
      
      if (!countErr) {
        STATE.auditCount = count || 0;
        updateCounterUi();
      }

      // 2. Lade Historie & Letztes Audit
      const { data, error } = await STATE.sb
        .from('audits')
        .select('*')
        .eq('user_id', STATE.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        STATE.history = data;
        Storage.saveHistory(data);
        
        // Das neueste Audit als "lastAudit" setzen, falls lokal nichts da ist oder es neuer ist
        const latest = data[0].scores_json;
        if (latest) {
          STATE.lastAudit = latest;
          Storage.saveLastAudit(latest);
          
          if (window.location.pathname.includes(DASH) && typeof renderResults === 'function') {
            renderResults(latest, null, latest.competitor || null);
          }
        }
        updateHistoryUi();
      }
    } catch (e) {
      console.error("Supabase Sync Error:", e);
    }
  }

  function syncUserUi() {
    const u = STATE.user;
    // Landing Page Nav
    $('btnNavAuth')?.classList.toggle('hidden', !!u);
    $('btnNavSignOut')?.classList.toggle('hidden', !u);
    $('btnNavDashboard')?.classList.toggle('hidden', !u);
    
    const ne = $('navUserEmail') || $('navEmail');
    if (ne) ne.textContent = u?.email || '';
    
    // Dashboard SignOut
    $('btnSignOut')?.classList.toggle('hidden', !u);
    
    const cta = $('btnNavCta');
    if (cta) {
      cta.textContent = LANG === 'en' ? (u ? 'Dashboard' : 'Start auditing') : (u ? 'Zum Dashboard' : 'Audit starten');
      cta.onclick = () => { window.location.href = u ? DASH : '#'; if(!u) openAuthModal(); };
    }
    icons();
  }

  function updateCounterUi() {
    const el = $('auditCounter');
    if (el) el.textContent = `${STATE.auditCount}/5`;
  }

  function updateHistoryUi() {
    const ul = $('dashHistory');
    if (!ul) return;
    
    if (STATE.history.length === 0) {
      ul.innerHTML = `<li class="text-xs text-zinc-600 italic">${LANG === 'en' ? 'No audits yet' : 'Noch keine Audits'}</li>`;
      return;
    }

    ul.innerHTML = STATE.history.map(row => {
      const res = row.scores_json;
      const sc = res?.total ?? res?.primary?.total ?? '—';
      const url = (row.url || '').replace(/^https?:\/\//, '').slice(0, 25);
      const date = new Date(row.created_at).toLocaleDateString(LANG === 'en' ? 'en-US' : 'de-DE');
      const col = sc >= 75 ? 'text-lime' : sc >= 55 ? 'text-amber-300' : 'text-red-400';
      
      return `
        <li class="hist-item rounded-lg px-2 py-2 -mx-2 group" onclick="window.loadAuditFromHistory('${row.id}')">
          <div class="flex items-center justify-between mb-0.5">
            <span class="font-mono font-bold ${col} text-sm">${sc}</span>
            <span class="text-[10px] text-zinc-600">${date}</span>
          </div>
          <span class="text-xs text-zinc-500 truncate block group-hover:text-zinc-300 transition">${esc(url)}</span>
        </li>`;
    }).join('');
  }

  // Global verfügbar machen für History-Klicks
  window.loadAuditFromHistory = (id) => {
    const audit = STATE.history.find(h => h.id === id);
    if (audit && audit.scores_json) {
      STATE.lastAudit = audit.scores_json;
      Storage.saveLastAudit(audit.scores_json);
      if (typeof renderResults === 'function') {
        renderResults(audit.scores_json, null, audit.scores_json.competitor || null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // ── AUTH MODAL ───────────────────────────────────────
  function openAuthModal() {
    const el = $('authModal');
    if (el) {
      el.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      icons();
    } else {
      window.location.href = DASH;
    }
  }

  window.closeAuthModal = () => {
    $('authModal')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  };

  // ── LANDING EVENTS ───────────────────────────────────
  function initLandingEvents() {
    $('btnNavAuth')?.addEventListener('click', openAuthModal);
    $('btnNavSignOut')?.addEventListener('click', async () => {
      await STATE.sb.auth.signOut();
      window.location.reload();
    });
    
    // FAQ, Hero Anim etc. (aus altem Script übernommen)
    initFaq();
    initHeroAnim();
    initHeaderShrink();
  }

  // Hilfsfunktionen für Landing Page Animationen
  function initFaq() {
    document.querySelectorAll('[data-faq-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('aria-controls');
        const panel = id && $(id);
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel?.classList.toggle('hidden', open);
        const icon = btn.querySelector('[data-faq-icon]');
        if (icon) icon.style.transform = open ? '' : 'rotate(180deg)';
      });
    });
  }

  function initHeroAnim() {
    const urlEl = $('animUrl');
    if (!urlEl) return;
    // ... (Animation Logik wie zuvor)
  }

  function initHeaderShrink() {
    const header = $('siteHeader');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('is-compact', window.scrollY > 48);
    }, { passive: true });
  }

  // Start
  init();

  // Export für Dashboard-Nutzung
  window.AF_STATE = STATE;
  window.AF_STORAGE = Storage;

})();
