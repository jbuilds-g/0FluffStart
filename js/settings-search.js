const SEARCH_ICON =
  '<span class="icon-mask icon-search" aria-hidden="true"></span>';
const CLOSE_ICON =
  '<span class="icon-mask icon-close" aria-hidden="true"></span>';

const MAX_RESULTS = 12;

function injectStyles() {
  if (document.getElementById("settings-search-styles")) return;
  const style = document.createElement("style");
  style.id = "settings-search-styles";
  style.textContent = `
    .settings-search { position:relative; z-index:100; width:min(720px,100%); }
    .settings-search-desktop { margin-top:18px; }
    .settings-search-input-wrap { position:relative; display:grid; grid-template-columns:17px minmax(0,1fr) auto; align-items:center; gap:10px; width:100%; height:42px; min-height:42px; padding:0 12px; box-sizing:border-box; background:var(--card); border:1px solid var(--border); border-radius:min(var(--radius),12px); box-shadow:var(--shadow-sm); overflow:hidden; }
    .settings-search-input-wrap > .icon-mask { width:17px; height:17px; min-width:17px; flex:0 0 17px; opacity:.72; }
    .settings-search-input-wrap > input { display:block; width:auto; min-width:0; max-width:none; height:100%; box-sizing:border-box; border:0 !important; outline:0; padding:0 !important; margin:0 !important; background:transparent !important; color:var(--text); font:inherit; font-size:.86rem; line-height:1.2; box-shadow:none !important; }
    .settings-search .settings-search-input-wrap > input { display:block; width:auto; min-width:0; max-width:none; height:100%; box-sizing:border-box; border:0 !important; outline:0; padding:0 !important; margin:0 !important; background:transparent !important; color:var(--text); font:inherit; font-size:.86rem; line-height:1.2; box-shadow:none !important; }
    .settings-page-shell .settings-search input::placeholder { color:var(--dim); opacity:1; }
    .settings-search-input-wrap:focus-within { border-color:var(--accent); box-shadow:0 0 0 2px var(--interactive-bg-alpha),var(--shadow-sm); }
    .settings-search .settings-page-search-clear { position:static !important; top:auto !important; right:auto !important; transform:none !important; display:none !important; align-items:center; justify-content:center; width:28px !important; height:28px !important; min-height:28px !important; flex:0 0 28px; margin:0; padding:0 !important; border:0 !important; background:transparent !important; color:var(--dim); box-shadow:none !important; cursor:pointer; }
    .settings-search .settings-page-search-clear.is-visible { display:inline-flex !important; }
    .settings-search .settings-page-search-clear:hover { color:var(--text); background:var(--card-hover) !important; }
    .settings-search .settings-page-search-clear .icon-mask { width:14px; height:14px; }
    .settings-search-results { display:grid; gap:5px; max-height:390px; overflow:auto; margin-top:7px; padding:6px; background:var(--card); border:1px solid var(--border); border-radius:min(var(--radius),12px); box-shadow:var(--shadow-lg); }
    .settings-search-results[hidden] { display:none; }
    .settings-search-result { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2px 12px; width:100%; padding:9px 10px; border:1px solid transparent; border-radius:8px; background:transparent; color:var(--text); text-align:left; cursor:pointer; font:inherit; }
    .settings-search-result:hover, .settings-search-result:focus-visible, .settings-search-result.is-active { background:var(--card-hover); border-color:var(--border); outline:none; }
    .settings-search-result strong { font-size:.82rem; font-weight:650; }
    .settings-search-result span { color:var(--dim); font-size:.68rem; align-self:center; }
    .settings-search-result small { grid-column:1 / -1; overflow:hidden; color:var(--dim); font-size:.7rem; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
    .settings-search-empty { padding:12px 10px; color:var(--dim); font-size:.78rem; }
    .settings-search-mobile, .settings-search-mobile-trigger { display:none; }
    .setting-search-highlight { animation:settings-search-highlight .9s ease; }
    @keyframes settings-search-highlight { 0%,100% { box-shadow:0 0 0 0 transparent; } 20%,70% { box-shadow:0 0 0 2px var(--accent); border-radius:min(var(--radius),10px); } }

    @media (max-width:900px) {
      html.settings-page.settings-mobile-context body.settings-search-open { overflow:hidden; }
      html.settings-page.settings-mobile-context .settings-section-nav { position:fixed; left:0; right:0; bottom:0; top:auto; z-index:45; width:100%; max-width:100vw; box-sizing:border-box; margin:0; padding:8px max(8px, env(safe-area-inset-left)) calc(8px + env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)); border-top:1px solid var(--border); border-bottom:0; background:var(--bg); box-shadow:0 -8px 24px rgba(0,0,0,.16); }
      html.settings-page.settings-mobile-context .settings-section-nav a { min-height:38px; }
      html.settings-page.settings-mobile-context .settings-page-shell { padding-bottom:96px; }
      html.settings-page.settings-mobile-context .settings-search-desktop { display:none; }
      html.settings-page.settings-mobile-context .settings-search-mobile-trigger { position:fixed; right:16px; bottom:calc(68px + env(safe-area-inset-bottom)); z-index:100; display:inline-flex; align-items:center; gap:8px; width:auto; max-width:calc(100vw - 32px); box-sizing:border-box; min-height:40px; padding:8px 13px; border:1px solid var(--border); border-radius:999px; background:var(--card); color:var(--text); box-shadow:var(--shadow-lg); font:inherit; font-size:.8rem; font-weight:600; cursor:pointer; }
      html.settings-page.settings-mobile-context .settings-search-mobile-trigger.hidden { display:none; }
      html.settings-page.settings-mobile-context .settings-search-mobile-trigger .icon-mask { width:16px; height:16px; }
      html.settings-page.settings-mobile-context .settings-search-mobile { position:fixed; left:12px; right:12px; top:calc(12px + env(safe-area-inset-top)); z-index:100; display:none; width:auto; max-width:calc(100vw - 24px); box-sizing:border-box; }
      html.settings-page.settings-mobile-context .settings-search-mobile.active { display:block; }
      html.settings-page.settings-mobile-context .settings-search-mobile .settings-search-results { max-height:min(52vh,420px); }
    }
  `;
  document.head.appendChild(style);
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function collectControlText(row) {
  return Array.from(
    row.querySelectorAll(
      "label, .setting-option-title, .settings-picker-label-block, .select-option, option, button",
    ),
  )
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(" ");
}

function buildSearchIndex(content) {
  const candidates = Array.from(
    content.querySelectorAll(
      ".setting-row, .setting-option, .select-option, .engine-list-item",
    ),
  );
  const seen = new Set();

  return candidates
    .map((node) => {
      if (seen.has(node)) return null;

      const parentRow =
        node.closest(".setting-row, .setting-option") || node;
      const isOption = node.classList.contains("select-option");
      const isEngine = node.classList.contains("engine-list-item");

      const title =
        (isOption ? node.textContent.trim() : "") ||
        (isEngine
          ? node.querySelector(".engine-item-name")?.textContent.trim()
          : "") ||
        parentRow.querySelector(".setting-header h3")?.textContent.trim() ||
        parentRow
          .querySelector(".setting-option-title")?.textContent.trim() ||
        parentRow
          .querySelector(".settings-picker-label-block")?.textContent.trim() ||
        parentRow.querySelector("label")?.textContent.trim() ||
        (node.matches("label") ? node.textContent.trim() : "");

      if (!title) return null;

      const section = node.closest(".settings-section");
      const subsection = node
        .closest(".settings-subsection")
        ?.querySelector(":scope > h3")
        ?.textContent.trim();
      const sectionTitle =
        section
          ?.querySelector(".settings-section-heading h2")
          ?.textContent.trim() || "";
      const category = subsection
        ? `${sectionTitle} › ${subsection}`
        : sectionTitle;

      const help =
        parentRow.querySelector(".help-text")?.textContent.trim() ||
        parentRow.querySelector(".setting-option-help")?.textContent.trim() ||
        "";

      seen.add(node);
      return {
        row: parentRow,
        target: node,
        title,
        help,
        category,
        controlText: [
          parentRow === node ? "" : parentRow.textContent.trim(),
          node === parentRow ? "" : node.textContent.trim(),
          isEngine ? "search engine" : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    })
    .filter(Boolean);
}

function scoreEntry(entry, query) {
  const title = normalize(entry.title);
  const control = normalize(entry.controlText);
  const help = normalize(entry.help);
  const category = normalize(entry.category);
  const terms = query.split(" ").filter(Boolean);
  let score = 0;

  if (title === query) score += 500;
  if (title.startsWith(query)) score += 180;
  if (title.includes(query)) score += 100;
  if (control.includes(query)) score += 55;
  if (help.includes(query)) score += 30;

  for (const term of terms) {
    if (title.includes(term)) score += 120;
    else if (control.includes(term)) score += 70;
    else if (help.includes(term)) score += 45;
    else if (category.includes(term)) score += 25;
    else return 0;
  }

  return score;
}

export function initSettingsPageSearch() {
  injectStyles();
  const page = document.querySelector(".settings-page-shell");
  const header = document.querySelector(".settings-page-header");
  const nav = document.querySelector(".settings-section-nav");
  const content = document.querySelector(".settings-content");
  if (!page || !header || !nav || !content) return;

  if (!buildSearchIndex(content).length) return;

  const createSearch = (mobile = false) => {
    const wrapper = document.createElement("div");
    wrapper.className = `settings-search ${mobile ? "settings-search-mobile" : "settings-search-desktop"}`;
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

  const mobileTrigger = document.createElement("button");
  mobileTrigger.type = "button";
  mobileTrigger.className = "settings-search-mobile-trigger";
  mobileTrigger.innerHTML = `${SEARCH_ICON}<span>Search settings</span>`;
  mobileTrigger.setAttribute("aria-label", "Search settings");
  document.body.appendChild(mobileTrigger);

  const mobile = createSearch(true);
  document.body.appendChild(mobile);

  const navSearchButton = document.querySelector(".settings-search-nav");

  const focusSettingsSearch = () => {
    const isMobile = window.matchMedia("(max-width: 900px)").matches;

    if (isMobile) {
      mobileTrigger.classList.add("hidden");
      mobile.classList.add("active");
      searchBackdrop.classList.add("active");
      document.body.classList.add("settings-search-open");
      window.setTimeout(() => {
        const input = mobile.querySelector("input");
        input?.focus();
        input?.select();
      }, 0);
      return;
    }

    const input = desktop.querySelector("input");
    input?.focus();
    input?.select();
    header.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const searchBackdrop = document.createElement("div");
  searchBackdrop.className = "search-backdrop";
  searchBackdrop.setAttribute("aria-hidden", "true");
  document.body.appendChild(searchBackdrop);

  const inputs = [
    desktop.querySelector("input"),
    mobile.querySelector("input"),
  ];

  let activeWrapper = null;
  let activeResults = [];
  let activeIndex = -1;

  const renderResults = (wrapper, query) => {
    const results = wrapper.querySelector(".settings-search-results");
    const clear = wrapper.querySelector(".settings-page-search-clear");
    const normalized = normalize(query);
    clear.classList.toggle("is-visible", Boolean(normalized));
    results.replaceChildren();

    if (!normalized) {
      results.hidden = true;
      if (activeWrapper === wrapper) {
        activeWrapper = null;
        activeResults = [];
        activeIndex = -1;
      }
      return;
    }

    const entries = buildSearchIndex(content);
    const matches = entries
      .map((entry) => ({ entry, score: scoreEntry(entry, normalized) }))
      .filter((item) => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.entry.title.localeCompare(b.entry.title),
      )
      .slice(0, MAX_RESULTS);

    if (activeWrapper === wrapper) {
      activeResults = matches.map((item) => item.entry);
      activeIndex = -1;
    }

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "settings-search-empty";
      empty.textContent = `No settings found matching "${query.trim()}".`;
      results.appendChild(empty);
    } else {
      matches.forEach(({ entry }, index) => {
        const result = document.createElement("button");
        result.type = "button";
        result.className = "settings-search-result";
        result.setAttribute("role", "option");
        result.setAttribute("aria-posinset", String(index + 1));
        result.setAttribute("aria-setsize", String(matches.length));
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const meta = document.createElement("span");
        meta.textContent = entry.category;
        result.append(title, meta);
        if (entry.help) {
          const help = document.createElement("small");
          help.textContent = entry.help;
          result.appendChild(help);
        }
        result.addEventListener("click", () => selectResult(entry));
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
    activeWrapper = source.closest(".settings-search");
    activeResults = [];
    activeIndex = -1;
    renderResults(desktop, query);
    renderResults(mobile, query);
  };

  const closeMobileSearch = ({ clear = false } = {}) => {
    mobile.classList.remove("active");
    mobileTrigger.classList.remove("hidden");
    searchBackdrop.classList.remove("active");
    document.body.classList.remove("settings-search-open");
    if (clear) {
      inputs.forEach((input) => {
        input.value = "";
      });
      renderResults(desktop, "");
      renderResults(mobile, "");
    }
    mobile.querySelector("input")?.blur();
  };

  const revealTarget = (target) => {
    if (!target) return target;

    target
      .closest("details")
      ?.toggleAttribute("open", true);

    const collapsible = target.closest(
      ".sub-collapsible-content, .settings-subcollapsible-content",
    );
    if (collapsible?.classList.contains("hidden")) {
      const trigger =
        collapsible.previousElementSibling?.closest(
          ".sub-collapsible-trigger, .settings-subcollapsible-trigger, button",
        ) ||
        collapsible.parentElement?.querySelector(
          ".sub-collapsible-trigger, .settings-subcollapsible-trigger",
        );
      trigger?.click();
    }

    let ancestor = target.parentElement;
    while (ancestor && ancestor !== content) {
      if (ancestor.classList.contains("hidden")) {
        ancestor.classList.remove("hidden");
        ancestor.removeAttribute("aria-hidden");
      }
      ancestor = ancestor.parentElement;
    }

    const customSelect = target.closest(".custom-select");
    if (customSelect && !customSelect.classList.contains("clock-style-picker")) {
      const dropdown = customSelect.querySelector(".select-dropdown");
      const trigger = customSelect.querySelector(".select-trigger");
      customSelect.classList.add("open");
      dropdown?.classList.remove("hidden");
      trigger?.setAttribute("aria-expanded", "true");
    }

    return target;
  };

  const highlightTarget = (target) => {
    if (!target) return;
    target.classList.remove("setting-search-highlight");
    void target.offsetWidth;
    target.classList.add("setting-search-highlight");
    window.setTimeout(
      () => target.classList.remove("setting-search-highlight"),
      2200,
    );
  };

  const waitForScrollToSettle = (target, timeout = 3200) =>
    new Promise((resolve) => {
      const startedAt = performance.now();
      let previousRect = target.getBoundingClientRect();
      let stableFrames = 0;
      let hasMoved = false;

      const check = () => {
        if (!document.contains(target)) {
          resolve();
          return;
        }

        const rect = target.getBoundingClientRect();
        const moved =
          Math.abs(rect.top - previousRect.top) >= 0.5 ||
          Math.abs(rect.left - previousRect.left) >= 0.5;

        if (moved) {
          hasMoved = true;
          stableFrames = 0;
        } else {
          stableFrames += 1;
        }

        previousRect = rect;

        // Require the target to have actually moved first, then remain
        // stationary for a short run of frames before highlighting it.
        if (
          (hasMoved && stableFrames >= 10) ||
          performance.now() - startedAt >= timeout
        ) {
          resolve();
          return;
        }

        requestAnimationFrame(check);
      };

      requestAnimationFrame(check);
    });

  const selectResult = (entry) => {
    inputs.forEach((input) => {
      input.value = "";
    });
    renderResults(desktop, "");
    renderResults(mobile, "");
    closeMobileSearch();

    window.setTimeout(() => {
      const target = revealTarget(entry.target || entry.row);
      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      if (target.matches(".select-option, .engine-list-item")) {
        target.focus?.({ preventScroll: true });
      }

      waitForScrollToSettle(target).then(() => {
        if (document.contains(target)) {
          highlightTarget(target);
        }
      });
    }, 80);
  };

  const moveActive = (direction) => {
    if (!activeResults.length) return;
    const wrapper =
      activeWrapper ||
      (mobile.classList.contains("active") ? mobile : desktop);
    const next =
      activeIndex < 0
        ? direction > 0
          ? 0
          : activeResults.length - 1
        : Math.max(
            0,
            Math.min(activeResults.length - 1, activeIndex + direction),
          );
    setActiveResult(next, wrapper);
  };

  const setActiveResult = (index, wrapper) => {
    const results = wrapper.querySelectorAll(".settings-search-result");
    results.forEach((result, resultIndex) => {
      result.classList.toggle("is-active", resultIndex === index);
      result.setAttribute(
        "aria-selected",
        resultIndex === index ? "true" : "false",
      );
    });
    activeIndex = index;
    activeWrapper = wrapper;
    if (index >= 0 && results[index]) {
      results[index].scrollIntoView({ block: "nearest" });
    }
  };

  const handleSearchKeydown = (event, wrapper) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!activeResults.length) return;
      event.preventDefault();
      if (activeWrapper !== wrapper) {
        activeWrapper = wrapper;
        activeIndex = -1;
      }
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter" && activeResults.length && activeIndex >= 0) {
      event.preventDefault();
      selectResult(activeResults[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (wrapper === mobile && mobile.classList.contains("active")) {
        closeMobileSearch({ clear: true });
      } else {
        wrapper.querySelector("input")?.blur();
      }
    }
  };

  inputs.forEach((input, index) => {
    const wrapper = index === 0 ? desktop : mobile;
    input.addEventListener("keydown", (event) =>
      handleSearchKeydown(event, wrapper),
    );
  });

  inputs.forEach((input) =>
    input.addEventListener("input", () => syncQuery(input)),
  );

  desktop
    .querySelector(".settings-page-search-clear")
    .addEventListener("click", () => {
      desktop.querySelector("input").value = "";
      syncQuery(desktop.querySelector("input"));
      desktop.querySelector("input").focus();
    });

  mobile
    .querySelector(".settings-page-search-clear")
    .addEventListener("click", () => {
      mobile.querySelector("input").value = "";
      syncQuery(mobile.querySelector("input"));
      mobile.querySelector("input").focus();
    });

  navSearchButton?.addEventListener("click", focusSettingsSearch);

  mobileTrigger.addEventListener("click", () => {
    mobileTrigger.classList.add("hidden");
    mobile.classList.add("active");
    searchBackdrop.classList.add("active");
    document.body.classList.add("settings-search-open");
    window.setTimeout(() => mobile.querySelector("input")?.focus(), 50);
  });

  searchBackdrop.addEventListener("click", () => closeMobileSearch());

  document.addEventListener("click", (event) => {
    if (!mobile.classList.contains("active")) return;
    if (
      event.target.closest(".settings-search-mobile") ||
      event.target.closest(".settings-search-mobile-trigger")
    ) {
      return;
    }
    closeMobileSearch();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (mobile.classList.contains("active")) {
      closeMobileSearch({ clear: true });
    }
  });
}
