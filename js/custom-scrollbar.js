const SCROLLBAR_SELECTORS = [
  ".link-grid",
  ".settings-section-nav",
  ".engine-selection-list",
  ".link-manager-list",
  ".clock-style-picker .select-dropdown",
  ".engine-dropdown",
  ".suggestions-container",
  ".modal-content",
  ".select-dropdown",
];

export class CustomScrollbarManager {
  constructor() {
    this.entries = new Map();
    this.enabled = false;
    this.rafId = null;
    this.drag = null;
    this.observer = new MutationObserver(() => this.scheduleRefresh());

    this.refresh = this.refresh.bind(this);
    this.updateAll = this.updateAll.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onScroll = this.onScroll.bind(this);
  }

  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    document.documentElement.toggleAttribute("data-custom-scrollbar", enabled);
    if (!enabled) {
      this.destroy();
      return;
    }
    this.bindEvents();
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.refresh();
  }

  bindEvents() {
    window.addEventListener("resize", this.onWindowResize, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
    document.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    window.addEventListener("pointermove", this.onPointerMove, { passive: false });
    window.addEventListener("pointerup", this.onPointerUp, { passive: true });
    window.addEventListener("pointercancel", this.onPointerUp, { passive: true });
  }

  unbindEvents() {
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("scroll", this.onScroll, true);
    document.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  onWindowResize() { this.scheduleRefresh(); }
  onScroll() { this.scheduleUpdate(); }

  scheduleRefresh() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.refresh();
    });
  }

  scheduleUpdate() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.updateAll();
    });
  }

  getHosts() {
    const hosts = new Set();
    if (document.scrollingElement) hosts.add(document.scrollingElement);
    for (const selector of SCROLLBAR_SELECTORS) {
      document.querySelectorAll(selector).forEach((element) => {
        if (element !== document.scrollingElement) hosts.add(element);
      });
    }
    return [...hosts];
  }

  refresh() {
    if (!this.enabled) return;
    const hosts = this.getHosts();
    const active = new Set(hosts);

    for (const [host, entry] of this.entries) {
      if (!active.has(host)) {
        entry.vertical.remove();
        entry.horizontal.remove();
        this.entries.delete(host);
      }
    }

    for (const host of hosts) {
      const metrics = this.getMetrics(host);
      let entry = this.entries.get(host);
      if (!metrics.vertical && !metrics.horizontal) {
        if (entry) {
          entry.vertical.remove();
          entry.horizontal.remove();
          this.entries.delete(host);
        }
        continue;
      }
      if (!entry) {
        entry = this.createEntry(host);
        this.entries.set(host, entry);
      }
      this.updateEntry(host, entry, metrics);
    }
  }

  getMetrics(host) {
    const isRoot = host === document.scrollingElement;
    const rect = isRoot
      ? { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight }
      : host.getBoundingClientRect();

    if (isRoot) {
      return {
        isRoot: true,
        rect,
        vertical: document.documentElement.scrollHeight > window.innerHeight + 1,
        horizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    }

    return {
      isRoot: false,
      rect,
      vertical: host.scrollHeight > host.clientHeight + 1,
      horizontal: host.scrollWidth > host.clientWidth + 1,
    };
  }

  createEntry(host) {
    const vertical = document.createElement("div");
    vertical.className = "custom-scrollbar custom-scrollbar-vertical";
    vertical.dataset.scrollbarAxis = "vertical";

    const horizontal = document.createElement("div");
    horizontal.className = "custom-scrollbar custom-scrollbar-horizontal";
    horizontal.dataset.scrollbarAxis = "horizontal";

    const verticalThumb = document.createElement("div");
    verticalThumb.className = "custom-scrollbar-thumb";
    vertical.append(verticalThumb);

    const horizontalThumb = document.createElement("div");
    horizontalThumb.className = "custom-scrollbar-thumb";
    horizontal.append(horizontalThumb);

    document.body.append(vertical, horizontal);
    return { vertical, horizontal, verticalThumb, horizontalThumb, host };
  }

  updateEntry(host, entry, metrics = this.getMetrics(host)) {
    const { rect, isRoot } = metrics;
    const inset = isRoot ? 4 : 2;
    const thickness = 8;

    this.positionTrack(entry.vertical, rect.right - thickness - inset, rect.top + inset, thickness, Math.max(0, rect.height - inset * 2), metrics.vertical);
    this.positionTrack(entry.horizontal, rect.left + inset, rect.bottom - thickness - inset, Math.max(0, rect.width - inset * 2), thickness, metrics.horizontal);

    this.updateThumb(host, entry.vertical, entry.verticalThumb, "vertical", metrics.vertical, isRoot);
    this.updateThumb(host, entry.horizontal, entry.horizontalThumb, "horizontal", metrics.horizontal, isRoot);
  }

  positionTrack(track, left, top, width, height, visible) {
    track.style.display = visible ? "block" : "none";
    if (!visible) return;
    track.style.left = `${Math.round(left)}px`;
    track.style.top = `${Math.round(top)}px`;
    track.style.width = `${Math.max(0, Math.round(width))}px`;
    track.style.height = `${Math.max(0, Math.round(height))}px`;
  }

  getScrollState(host, axis, isRoot) {
    if (isRoot) {
      return axis === "vertical"
        ? { viewport: window.innerHeight, content: document.documentElement.scrollHeight, scroll: window.scrollY }
        : { viewport: window.innerWidth, content: document.documentElement.scrollWidth, scroll: window.scrollX };
    }

    return axis === "vertical"
      ? { viewport: host.clientHeight, content: host.scrollHeight, scroll: host.scrollTop }
      : { viewport: host.clientWidth, content: host.scrollWidth, scroll: host.scrollLeft };
  }

  updateThumb(host, track, thumb, axis, visible, isRoot) {
    if (!visible) return;

    const vertical = axis === "vertical";
    const { viewport, content, scroll } = this.getScrollState(host, axis, isRoot);
    const trackSize = vertical ? track.clientHeight : track.clientWidth;
    if (trackSize <= 0 || content <= viewport) return;

    const thumbSize = Math.max(28, Math.round((viewport / content) * trackSize));
    const maxOffset = Math.max(0, trackSize - thumbSize);
    const maxScroll = Math.max(1, content - viewport);
    const offset = Math.min(maxOffset, Math.max(0, (scroll / maxScroll) * maxOffset));

    if (vertical) {
      thumb.style.height = `${thumbSize}px`;
      thumb.style.width = "100%";
      thumb.style.transform = `translateY(${Math.round(offset)}px)`;
    } else {
      thumb.style.width = `${thumbSize}px`;
      thumb.style.height = "100%";
      thumb.style.transform = `translateX(${Math.round(offset)}px)`;
    }
  }

  findEntryPart(target) {
    const element = target.closest?.(".custom-scrollbar");
    if (!element) return null;
    for (const entry of this.entries.values()) {
      if (entry.vertical === element) return { entry, axis: "vertical", track: entry.vertical, thumb: entry.verticalThumb };
      if (entry.horizontal === element) return { entry, axis: "horizontal", track: entry.horizontal, thumb: entry.horizontalThumb };
    }
    return null;
  }

  setHostScroll(host, axis, value) {
    const entry = this.entries.get(host);
    const isRoot = entry?.host === document.scrollingElement;
    if (isRoot) {
      if (axis === "vertical") window.scrollTo(window.scrollX, value);
      else window.scrollTo(value, window.scrollY);
      return;
    }
    if (axis === "vertical") host.scrollTop = value;
    else host.scrollLeft = value;
  }

  onPointerDown(event) {
    if (!this.enabled || event.button !== 0) return;
    const part = this.findEntryPart(event.target);
    if (!part) return;

    const { entry, axis, track, thumb } = part;
    const host = entry.host;
    const isVertical = axis === "vertical";
    const isRoot = host === document.scrollingElement;
    const trackRect = track.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const pointer = isVertical ? event.clientY : event.clientX;
    const thumbStart = isVertical ? thumbRect.top : thumbRect.left;
    const thumbSize = isVertical ? thumbRect.height : thumbRect.width;
    const { viewport, content, scroll } = this.getScrollState(host, axis, isRoot);
    const maxScroll = Math.max(0, content - viewport);

    if (event.target !== thumb) {
      const trackStart = isVertical ? trackRect.top : trackRect.left;
      const trackSize = isVertical ? trackRect.height : trackRect.width;
      const usable = Math.max(1, trackSize - thumbSize);
      const position = Math.min(1, Math.max(0, (pointer - trackStart - thumbSize / 2) / usable));
      this.setHostScroll(host, axis, position * maxScroll);
      this.scheduleUpdate();
      event.preventDefault();
      return;
    }

    this.drag = {
      pointerId: event.pointerId,
      host,
      axis,
      track,
      thumb,
      isRoot,
      pointerStart: pointer,
      scrollStart: scroll,
      trackSize: isVertical ? trackRect.height : trackRect.width,
      thumbSize,
      maxScroll,
    };

    thumb.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    window.customCursorInstance?.setDragState(true);
  }

  onPointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;

    const { axis, pointerStart, scrollStart, trackSize, thumbSize, maxScroll, host, isRoot } = this.drag;
    const pointer = axis === "vertical" ? event.clientY : event.clientX;
    const usable = Math.max(1, trackSize - thumbSize);
    const delta = pointer - pointerStart;
    const scroll = Math.max(0, Math.min(maxScroll, scrollStart + (delta / usable) * maxScroll));

    this.setHostScroll(host, axis, scroll);
    this.scheduleUpdate();
    event.preventDefault();
  }

  onPointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.drag.thumb.releasePointerCapture?.(event.pointerId);
    this.drag = null;
    window.customCursorInstance?.setDragState(false);
  }

  updateAll() {
    if (!this.enabled) return;
    for (const [host, entry] of this.entries) this.updateEntry(host, entry);
  }

  destroy() {
    this.unbindEvents();
    this.observer.disconnect();
    document.documentElement.removeAttribute("data-custom-scrollbar");
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.drag = null;
    for (const entry of this.entries.values()) {
      entry.vertical.remove();
      entry.horizontal.remove();
    }
    this.entries.clear();
  }
}
