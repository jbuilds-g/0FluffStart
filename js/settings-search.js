const SEARCH_ICON = '<span class="icon-mask icon-search" aria-hidden="true"></span>';
const CLOSE_ICON = '<span class="icon-mask icon-close" aria-hidden="true"></span>';

function injectStyles() {
  if (document.getElementById('settings-search-styles')) return;
  const style = document.createElement('style');
  style.id = 'settings-search-styles';
  style.textContent = `
    .settings-search { position:relative; z-index:100; width:min(720px,100%); }
    .settings-search-desktop { margin-top:18px; }
    .settings-search-input-wrap { position:relative; display:flex; align-items:center; gap:10px; height:42px; min-height:42px; padding:0 12px; box-sizing:border-box; background:var(--card); border:1px solid var(--border); border-radius:min(var(--radius),12px); box-shadow:var(--shadow-sm); }
    .settings-search-input-wrap > .icon-mask { width:17px; height:17px; flex:0 0 17px; opacity:.72; }
    .settings-page-shell .settings-search input { display:block; width:100%; min-width:0; height:100%; box-sizing:border-box; border:0 !important; outline:0; padding:0 !important; margin:0 !important; background:transparent !important; color:var(--text); font:inherit; font-size:.86rem; line-height:1.2; box-shadow:none !important; }
    .settings-page-shell .settings-search input::placeholder { color:var(--dim); opacity:1; }
    .settings-search-input-wrap:focus-within { border-color:var(--accent); box-shadow:0 0 0 2px var(--interactive-bg-alpha),var(--shadow-sm); }
    .settings-search .settings-page-search-clear { position:static !important; top:auto !important; right:auto !important; transform:none !important; display:none !important; align-items:center; justify-content:center; width:28px !important; height:28px !important; min-height:28px !important; flex:0 0 28px; margin:0; padding:0 !important; border:0 !important; background:transparent !important; color:var(--dim); box-shadow:none !important; cursor:pointer; }
    .settings-search .settings-page-search-clear.is-visible { display:inline-flex !important; }
    .settings-search .settings-page-search-clear:hover { color:var(--text); background:var(--card-hover) !important; }
    .settings-search .settings-page-search-clear .icon-mask { width:14px; height:14px; }
    .settings-search-results { display:grid; gap:5px; max-height:390px; overflow:auto; margin-top:7px; padding:6px; background:var(--card); border:1px solid var(--border); border-radius:min(var(--radius),12px); box-shadow:var(--shadow-lg); }
    .settings-search-results[hidden] { display:none; }
    .settings-search-result { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2px 12px; width:100%; padding:9px 10px; border:1px solid transparent; border-radius:8px; background:transparent; color:var(--text); text-align:left; cursor:pointer; font:inherit; }
    .settings-search-result:hover, .settings-search-result:focus-visible { background:var(--card-hover); border-color:var(--border); outline:none; }
    .settings-search-result strong { font-size:.82rem; font-weight:650; }
    .settings-search-result span { color:var(--dim); font-size:.68rem; align-self:center; }
    .settings-search-result small { grid-column:1 / -1; overflow:hidden; color:var(--dim); font-size:.7rem; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
    .settings-search-empty { padding:12px 10px; color:var(--dim); font-size:.78rem; }
    .settings-search-mobile, .settings-search-mobile-trigger, .settings-back-to-top { display:none; }
    .setting-search-highlight { animation:settings-search-highlight .9s ease; }
    @keyframes settings-search-highlight { 0%,100% { box-shadow:0 0 0 0 transparent; } 20%,70% { box-shadow:0 0 0 2px var(--accent); border-radius:min(var(--radius),10px); } }

    @media (max-width:900px) {
      html.settings-page.settings-mobile-context body.settings-search-open { overflow:hidden; }
      html.settings-page.settings-mobile-context .settings-section-nav { position:fixed; left:0; right:0; bottom:0; top:auto; z-index:45; margin:0; padding:8px max(8px, env(safe-area-inset-left)) calc(8px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); border-bottom:0; background:var(--bg); box-shadow:0 -8px 24px rgba(0,0,0,.16); }
      html.settings-page.settings-mobile-context .settings-section-nav a { min-height:38px; }
      html.settings-page.settings-mobile-context .settings-page-shell { padding-bottom:96px; }
      html.settings-page.settings-mobile-context .settings-search-desktop { display:none; }
      html.settings-page.settings-mobile-context .settings-search-mobile-trigger { position:fixed; right:16px; bottom:calc(68px + env(safe-area-inset-bottom)); z-index:100; display:inline-flex; align-items:center; gap:8px; min-height:40px; padding:8px 13px; border:1px solid var(--border); border-radius:999px; background:var(--card); color:var(--text); box-shadow:var(--shadow-lg); font:inherit; font-size:.8rem; font-weight:600; cursor:pointer; }
      html.settings-page.settings-mobile-context .settings-search-mobile-trigger.hidden { display:none; }
      html.settings-page.settings-mobile-context .settings-search-mobile-trigger .icon-mask { width:16px; height:16px; }
      html.settings-page.settings-mobile-context .settings-search-mobile { position:fixed; left:12px; right:12px; top:calc(12px + env(safe-area-inset-top)); z-index:100; display:none; width:auto; }
      html.settings-page.settings-mobile-context .settings-search-mobile.active { display:block; }
      html.settings-page.settings-mobile-context .settings-search-mobile .settings-search-results { max-height:min(52vh,420px); }
      html.settings-page.settings-mobile-context .settings-back-to-top { position:fixed; right:16px; bottom:calc(124px + env(safe-area-inset-bottom)); z-index:100; display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; padding:0; border:1px solid var(--border); border-radius:50%; background:var(--card); color:var(--text); box-shadow:var(--shadow-lg); cursor:pointer; opacity:0; pointer-events:none; transform:translateY(6px); transition:opacity .16s ease,transform .16s ease; }
      html.settings-page.settings-mobile-context .settings-back-to-top.visible { opacity:1; pointer-events:auto; transform:none; }
    }

    @media (min-width:901px) {
      html.settings-page.settings-desktop-context .settings-back-to-top { position:fixed; right:24px; bottom:24px; z-index:40; display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; padding:0; border:1px solid var(--border); border-radius:50%; background:var(--card); color:var(--text); box-shadow:var(--shadow-lg); cursor:pointer; opacity:0; pointer-events:none; transform:translateY(6px); transition:opacity .16s ease,transform .16s ease; }
      html.settings-page.settings-desktop-context .settings-back-to-top.visible { opacity:1; pointer-events:auto; transform:none; }
    }
  `;
  document.head.appendChild(style);
}

export function initSettingsPageSearch() {
  injectStyles();
  const page = document.querySelector('.settings-page-shell');
  const header = document.querySelector('.settings-page-header');
  const nav = document.querySelector('.settings-section-nav');
  const content = document.querySelector('.settings-content');
  if (!page || !header || !nav || !content) return;

  const rows = Array.from(content.querySelectorAll('.setting-row'))
    .map((row) => {
      const title = row.querySelector('.setting-header h3')?.textContent.trim();
      if (!title) return null;
      const help = row.querySelector('.help-text')?.textContent.trim() || '';
      const section = row.closest('.settings-section');
      const subsection = row.closest('.settings-subsection')?.querySelector(':scope > h3')?.textContent.trim();
      const sectionTitle = section?.querySelector('.settings-section-heading h2')?.textContent.trim() || '';
      const category = subsection ? `${sectionTitle} › ${subsection}` : sectionTitle;
      return { row, title, help, category, haystack: `${title} ${help} ${category}`.toLowerCase() };
    })
    .filter(Boolean);

  const createSearch = (mobile = false) => {
    const wrapper = document.createElement('div');
    wrapper.className = `settings-search ${mobile ? 'settings-search-mobile' : 'settings-search-desktop'}`;
    wrapper.innerHTML = `
      <div class="settings-search-input-wrap">
        ${SEARCH_ICON}
        <input type="text" autocomplete="off" spellcheck="false" placeholder="Search settings..." aria-label="Search settings" />
        <button type="button" class="settings-page-search-clear" aria-label="Clear settings search">${CLOSE_ICON}</button>
      </div>
      <div class="settings-search-results" role="listbox" aria-label="Settings search results" hidden></div>
    `;
    return wrapper;
  };

  const desktop = createSearch(false);
  header.appendChild(desktop);

  const mobileTrigger = document.createElement('button');
  mobileTrigger.type = 'button';
  mobileTrigger.className = 'settings-search-mobile-trigger';
  mobileTrigger.innerHTML = `${SEARCH_ICON}<span>Search settings</span>`;
  mobileTrigger.setAttribute('aria-label', 'Search settings');
  document.body.appendChild(mobileTrigger);

  const mobile = createSearch(true);
  document.body.appendChild(mobile);

  const searchBackdrop = document.createElement('div');
  searchBackdrop.className = 'search-backdrop';
  searchBackdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(searchBackdrop);

  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'settings-back-to-top';
  backToTop.innerHTML = '<span class="icon-mask icon-arrow-up" aria-hidden="true"></span>';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.title = 'Scroll to top';
  document.body.appendChild(backToTop);

  const inputs = [desktop.querySelector('input'), mobile.querySelector('input')];

  const renderResults = (wrapper, query) => {
    const results = wrapper.querySelector('.settings-search-results');
    const clear = wrapper.querySelector('.settings-page-search-clear');
    const normalized = query.trim().toLowerCase();
    clear.classList.toggle('is-visible', Boolean(normalized));
    results.replaceChildren();

    if (!normalized) {
      results.hidden = true;
      return;
    }

    const matches = rows.filter((entry) => entry.haystack.includes(normalized));
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'settings-search-empty';
      empty.textContent = `No settings found matching "${query.trim()}".`;
      results.appendChild(empty);
    } else {
      matches.slice(0, 12).forEach((entry) => {
        const result = document.createElement('button');
        result.type = 'button';
        result.className = 'settings-search-result';
        result.setAttribute('role', 'option');
        const title = document.createElement('strong');
        title.textContent = entry.title;
        const meta = document.createElement('span');
        meta.textContent = entry.category;
        result.append(title, meta);
        if (entry.help) {
          const help = document.createElement('small');
          help.textContent = entry.help;
          result.appendChild(help);
        }
        result.addEventListener('click', () => selectResult(entry));
        results.appendChild(result);
      });
    }
    results.hidden = false;
  };

  const syncQuery = (source) => {
    const query = source.value;
    inputs.forEach((input) => {
      if (input !== source) input.value = query;
    });
    renderResults(desktop, query);
    renderResults(mobile, query);
  };

  const closeMobileSearch = ({ clear = false } = {}) => {
    mobile.classList.remove('active');
    mobileTrigger.classList.remove('hidden');
    searchBackdrop.classList.remove('active');
    document.body.classList.remove('settings-search-open');
    if (clear) {
      inputs.forEach((input) => { input.value = ''; });
      renderResults(desktop, '');
      renderResults(mobile, '');
    }
    mobile.querySelector('input')?.blur();
  };

  const selectResult = (entry) => {
    inputs.forEach((input) => { input.value = ''; });
    renderResults(desktop, '');
    renderResults(mobile, '');
    closeMobileSearch();
    window.setTimeout(() => {
      entry.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      entry.row.classList.remove('setting-search-highlight');
      void entry.row.offsetWidth;
      entry.row.classList.add('setting-search-highlight');
      window.setTimeout(() => entry.row.classList.remove('setting-search-highlight'), 900);
    }, 80);
  };

  inputs.forEach((input) => input.addEventListener('input', () => syncQuery(input)));
  desktop.querySelector('.settings-page-search-clear').addEventListener('click', () => {
    desktop.querySelector('input').value = '';
    syncQuery(desktop.querySelector('input'));
    desktop.querySelector('input').focus();
  });
  mobile.querySelector('.settings-page-search-clear').addEventListener('click', () => {
    mobile.querySelector('input').value = '';
    syncQuery(mobile.querySelector('input'));
    mobile.querySelector('input').focus();
  });

  mobileTrigger.addEventListener('click', () => {
    mobileTrigger.classList.add('hidden');
    mobile.classList.add('active');
    searchBackdrop.classList.add('active');
    document.body.classList.add('settings-search-open');
    window.setTimeout(() => mobile.querySelector('input')?.focus(), 50);
  });

  searchBackdrop.addEventListener('click', () => closeMobileSearch());

  document.addEventListener('click', (event) => {
    if (!mobile.classList.contains('active')) return;
    if (event.target.closest('.settings-search-mobile') || event.target.closest('.settings-search-mobile-trigger')) return;
    closeMobileSearch();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (mobile.classList.contains('active')) closeMobileSearch({ clear: true });
  });

  const updateBackToTop = () => {
    backToTop.classList.toggle('visible', window.scrollY > 240);
  };
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateBackToTop();
}
