const SEARCH_ICON = '<span class="icon-mask icon-search" aria-hidden="true"></span>';

export function initSettingsPageSearch() {
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
        <input type="search" autocomplete="off" spellcheck="false" placeholder="Search settings..." aria-label="Search settings" />
        <button type="button" class="settings-search-clear" aria-label="Clear settings search" hidden>×</button>
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

  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'settings-back-to-top';
  backToTop.textContent = '↑';
  backToTop.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(backToTop);

  const overlay = document.getElementById('bgOverlay');
  const inputs = [desktop.querySelector('input'), mobile.querySelector('input')];

  const renderResults = (wrapper, query) => {
    const results = wrapper.querySelector('.settings-search-results');
    const clear = wrapper.querySelector('.settings-search-clear');
    const normalized = query.trim().toLowerCase();
    clear.hidden = !normalized;
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
    overlay?.classList.remove('settings-search-backdrop');
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
  desktop.querySelector('.settings-search-clear').addEventListener('click', () => {
    desktop.querySelector('input').value = '';
    syncQuery(desktop.querySelector('input'));
    desktop.querySelector('input').focus();
  });
  mobile.querySelector('.settings-search-clear').addEventListener('click', () => {
    mobile.querySelector('input').value = '';
    syncQuery(mobile.querySelector('input'));
    mobile.querySelector('input').focus();
  });

  mobileTrigger.addEventListener('click', () => {
    mobileTrigger.classList.add('hidden');
    mobile.classList.add('active');
    overlay?.classList.add('settings-search-backdrop');
    document.body.classList.add('settings-search-open');
    window.setTimeout(() => mobile.querySelector('input')?.focus(), 50);
  });

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
    backToTop.classList.toggle('visible', window.scrollY > 480);
  };
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateBackToTop();
}
