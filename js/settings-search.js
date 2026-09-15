const SEARCH_DEBOUNCE_MS = 60;

function getSettingEntries() {
  return Array.from(document.querySelectorAll(".settings-section .setting-row"))
    .map((row) => {
      const title = row.querySelector(".setting-header h3")?.textContent.trim();
      if (!title) return null;

      const section = row.closest(".settings-section");
      const subsection = row.closest(".settings-subsection");
      const help = row.querySelector(".help-text")?.textContent.trim() || "";
      const category = [
        section?.querySelector(".settings-section-heading h2")?.textContent.trim(),
        subsection?.querySelector(":scope > h3")?.textContent.trim(),
      ]
        .filter(Boolean)
        .join(" › ");

      return {
        row,
        title,
        help,
        category,
        searchText: `${title} ${category} ${help}`.toLowerCase(),
      };
    })
    .filter(Boolean);
}

function createSearchMarkup() {
  const header = document.querySelector(".settings-page-header");
  const nav = document.querySelector(".settings-section-nav");
  if (!header || !nav) return null;

  const search = document.createElement("div");
  search.className = "settings-page-search";
  search.innerHTML = `
    <div class="settings-search-box">
      <span class="icon-mask icon-search settings-search-icon" aria-hidden="true"></span>
      <input id="settingsPageSearchInput" type="search" autocomplete="off" spellcheck="false" placeholder="Search settings..." aria-label="Search settings" />
      <button class="settings-search-clear" type="button" aria-label="Clear settings search" hidden>×</button>
    </div>
    <div class="settings-search-results" role="listbox" aria-label="Settings search results" hidden></div>
  `;

  const mobileSearch = document.createElement("button");
  mobileSearch.className = "settings-mobile-search-trigger";
  mobileSearch.type = "button";
  mobileSearch.setAttribute("aria-label", "Search settings");
  mobileSearch.innerHTML = `<span class="icon-mask icon-search" aria-hidden="true"></span><span>Search</span>`;

  nav.appendChild(mobileSearch);
  header.appendChild(search);

  return { search, input: search.querySelector("input"), clear: search.querySelector("button"), results: search.querySelector(".settings-search-results"), mobileSearch };
}

function setBackdrop(active) {
  const overlay = document.getElementById("bgOverlay");
  overlay?.classList.toggle("settings-search-backdrop", active);
  document.documentElement.classList.toggle("settings-search-open", active);
}

function closeSearch(elements, { clear = true } = {}) {
  if (!elements) return;
  elements.results.hidden = true;
  elements.results.replaceChildren();
  elements.clear.hidden = true;
  if (clear) elements.input.value = "";
  elements.search.classList.remove("active");
  setBackdrop(false);
}

function renderResults(elements, query, entries) {
  const normalized = query.trim().toLowerCase();
  elements.results.replaceChildren();

  if (!normalized) {
    elements.results.hidden = true;
    return;
  }

  const matches = entries.filter((entry) => entry.searchText.includes(normalized)).slice(0, 12);

  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "settings-search-empty";
    empty.textContent = `No settings found matching “${query.trim()}”`;
    elements.results.appendChild(empty);
  } else {
    matches.forEach((entry, index) => {
      const result = document.createElement("button");
      result.type = "button";
      result.className = "settings-search-result";
      result.setAttribute("role", "option");
      result.dataset.index = String(index);

      const title = document.createElement("strong");
      title.textContent = entry.title;
      const category = document.createElement("span");
      category.className = "settings-search-result-category";
      category.textContent = entry.category;
      result.append(title, category);

      if (entry.help) {
        const help = document.createElement("span");
        help.className = "settings-search-result-help";
        help.textContent = entry.help;
        result.appendChild(help);
      }

      result.addEventListener("click", () => selectResult(elements, entry.row));
      elements.results.appendChild(result);
    });
  }

  elements.results.hidden = false;
}

function selectResult(elements, target) {
  elements.input.value = "";
  elements.input.blur();
  closeSearch(elements, { clear: true });

  window.setTimeout(() => {
    target.classList.remove("settings-search-target-highlight");
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    window.setTimeout(() => {
      target.classList.remove("settings-search-target-highlight");
      void target.offsetWidth;
      target.classList.add("settings-search-target-highlight");
      window.setTimeout(() => target.classList.remove("settings-search-target-highlight"), 1500);
    }, 260);
  }, 120);
}

export function initSettingsSearch() {
  const elements = createSearchMarkup();
  if (!elements) return;

  const entries = getSettingEntries();
  let searchTimer = null;

  const activate = () => {
    elements.search.classList.add("active");
    setBackdrop(true);
    elements.input.focus({ preventScroll: true });
  };

  elements.mobileSearch.addEventListener("click", activate);

  elements.input.addEventListener("focus", () => {
    if (document.documentElement.classList.contains("settings-mobile-context")) {
      elements.search.classList.add("active");
      setBackdrop(true);
    }
  });

  elements.input.addEventListener("input", () => {
    elements.clear.hidden = !elements.input.value;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => renderResults(elements, elements.input.value, entries), SEARCH_DEBOUNCE_MS);
  });

  elements.clear.addEventListener("click", () => {
    elements.input.value = "";
    elements.clear.hidden = true;
    elements.results.hidden = true;
    elements.results.replaceChildren();
    elements.input.focus({ preventScroll: true });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.search.classList.contains("active")) {
      closeSearch(elements);
    }
  });

  document.addEventListener("click", (event) => {
    if (!elements.search.classList.contains("active")) return;
    if (elements.search.contains(event.target)) return;
    if (elements.mobileSearch.contains(event.target)) return;
    closeSearch(elements);
  });
}
