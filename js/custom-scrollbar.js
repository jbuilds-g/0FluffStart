export class CustomScrollbarManager {
  constructor() {
    this.hosts = new Map();
    this.rafId = null;
    this.drag = null;
    this.resizeObserver = new ResizeObserver(() => this.refresh());
    this.mutationObserver = new MutationObserver(() => this.scheduleRefresh());

    this.onScroll = this.scheduleRefresh.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onResize = this.scheduleRefresh.bind(this);
  }

  init() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    window.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    window.addEventListener("pointermove", this.onPointerMove, { passive: false });
    window.addEventListener("pointerup", this.onPointerUp, { passive: true });
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  setEnabled(enabled) {
    if (enabled) {
      this.refresh();
      return;
    }

    for (const [host, entry] of this.hosts) {
      host.classList.remove("custom-scrollbar-host");
      entry.track.remove();
    }
    this.hosts.clear();
    this.drag = null;
  }

  scheduleRefresh() {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.refresh();
    });
  }

  refresh() {
    const candidates = [
      document.documentElement,
      ...document.querySelectorAll(
        ".link-grid, .settings-section-nav, .settings-page-shell .engine-selection-list",
      ),
    ];

    const active = new Set();

    for (const host of candidates) {
      if (!host || !host.isConnected) continue;
      if (host !== document.documentElement && !this.isScrollable(host)) continue;

      active.add(host);
      let entry = this.hosts.get(host);

      if (!entry) {
        entry = this.createEntry(host);
        this.hosts.set(host, entry);
      }

      this.updateEntry(host, entry);
    }

    for (const [host, entry] of this.hosts) {
      if (!active.has(host)) {
        host.classList.remove("custom-scrollbar-host");
        entry.track.remove();
        this.hosts.delete(host);
      }
    }
  }

  isScrollable(element) {
    return element.scrollHeight > element.clientHeight + 1;
  }

  createEntry(host) {
    const track = document.createElement("div");
    track.className = "custom-scrollbar-track";
    track.dataset.customScrollbar = "true";
    track.setAttribute("aria-hidden", "true");

    const thumb = document.createElement("div");
    thumb.className = "custom-scrollbar-thumb";
    thumb.dataset.customScrollbarThumb = "true";
    track.appendChild(thumb);

    document.body.appendChild(track);
    host.classList.add("custom-scrollbar-host");

    return { track, thumb };
  }

  updateEntry(host, entry) {
    const rect = host === document.documentElement
      ? { top: 0, bottom: window.innerHeight, right: window.innerWidth }
      : host.getBoundingClientRect();

    const viewportHeight = host === document.documentElement
      ? window.innerHeight
      : host.clientHeight;

    const scrollHeight = host === document.documentElement
      ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      : host.scrollHeight;

    const scrollTop = host === document.documentElement
      ? window.scrollY
      : host.scrollTop;

    const trackTop = Math.max(0, rect.top);
    const trackBottom = Math.min(window.innerHeight, rect.bottom);
    const trackHeight = Math.max(0, trackBottom - trackTop);

    if (trackHeight <= 0 || scrollHeight <= viewportHeight + 1) {
      entry.track.classList.remove("is-visible");
      return;
    }

    const thumbHeight = Math.max(34, (viewportHeight / scrollHeight) * trackHeight);
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = scrollHeight - viewportHeight;
    const thumbTop = maxScroll > 0
      ? (scrollTop / maxScroll) * maxThumbTop
      : 0;

    entry.track.style.top = `${trackTop}px`;
    entry.track.style.height = `${trackHeight}px`;
    entry.track.style.right = host === document.documentElement
      ? "2px"
      : `${Math.max(2, window.innerWidth - rect.right + 2)}px`;
    entry.thumb.style.height = `${thumbHeight}px`;
    entry.thumb.style.transform = `translateY(${thumbTop}px)`;
    entry.track.classList.add("is-visible");
  }

  getHostAtPoint(x, y) {
    for (const [host, entry] of this.hosts) {
      if (!entry.track.classList.contains("is-visible")) continue;
      const rect = entry.track.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return { host, entry, rect };
      }
    }
    return null;
  }

  onPointerDown(event) {
    if (event.button !== 0) return;

    const target = event.target;
    if (!target?.dataset?.customScrollbarThumb) return;

    const entry = [...this.hosts.values()].find((item) => item.thumb === target);
    if (!entry) return;

    const host = [...this.hosts.entries()].find(([, item]) => item === entry)?.[0];
    if (!host) return;

    const trackRect = entry.track.getBoundingClientRect();
    const thumbRect = entry.thumb.getBoundingClientRect();
    const viewportHeight = host === document.documentElement
      ? window.innerHeight
      : host.clientHeight;
    const scrollHeight = host === document.documentElement
      ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      : host.scrollHeight;
    const maxThumbTop = Math.max(1, trackRect.height - thumbRect.height);

    this.drag = {
      host,
      entry,
      startY: event.clientY,
      startThumbTop: thumbRect.top - trackRect.top,
      maxThumbTop,
      maxScroll: Math.max(0, scrollHeight - viewportHeight),
    };

    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.drag) return;

    const delta = event.clientY - this.drag.startY;
    const thumbTop = Math.max(
      0,
      Math.min(this.drag.maxThumbTop, this.drag.startThumbTop + delta),
    );
    const progress = thumbTop / this.drag.maxThumbTop;
    const scrollTop = progress * this.drag.maxScroll;

    if (this.drag.host === document.documentElement) {
      window.scrollTo(0, scrollTop);
    } else {
      this.drag.host.scrollTop = scrollTop;
    }

    event.preventDefault();
    this.scheduleRefresh();
  }

  onPointerUp() {
    this.drag = null;
  }
}
