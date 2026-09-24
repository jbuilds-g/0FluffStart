export class CustomScrollbarManager {
  constructor() {
    this.hosts = new Map();
    this.rafId = null;
    this.drag = null;

    this.onScroll = this.scheduleRefresh.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onResize = this.scheduleRefresh.bind(this);
  }

  init() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    window.addEventListener("scroll", this.onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("pointerdown", this.onPointerDown, {
      passive: false,
    });
    window.addEventListener("pointermove", this.onPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", this.onPointerUp, { passive: true });
  }

  setEnabled(enabled) {
    if (enabled) {
      this.refresh();
      return;
    }

    for (const [host, entry] of this.hosts) {
      host.classList.remove("custom-scrollbar-host");
      entry.vertical?.remove();
      entry.horizontal?.remove();
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

  getCandidates() {
    const selectors = [
      ".link-grid",
      ".settings-section-nav",
      ".settings-page-shell .engine-selection-list",
      ".settings-page-shell .link-manager-list",
      ".settings-page-shell .clock-style-picker",
      ".settings-page-shell .settings-search-results",
    ];

    return [
      document.documentElement,
      ...document.querySelectorAll(selectors.join(", ")),
    ];
  }

  refresh() {
    const active = new Set();

    for (const host of this.getCandidates()) {
      if (!host?.isConnected) continue;

      const axes = this.getScrollableAxes(host);
      if (!axes.vertical && !axes.horizontal) continue;

      active.add(host);

      let entry = this.hosts.get(host);
      if (!entry) {
        entry = this.createEntry(host);
        this.hosts.set(host, entry);
      }

      this.updateEntry(host, entry, axes);
    }

    for (const [host, entry] of this.hosts) {
      if (active.has(host)) continue;

      host.classList.remove("custom-scrollbar-host");
      entry.vertical?.remove();
      entry.horizontal?.remove();
      this.hosts.delete(host);
    }
  }

  getScrollableAxes(host) {
    const style = getComputedStyle(host);
    const isRoot = host === document.documentElement;

    const scrollWidth = isRoot
      ? Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      : host.scrollWidth;
    const scrollHeight = isRoot
      ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      : host.scrollHeight;

    const viewportWidth = isRoot ? window.innerWidth : host.clientWidth;
    const viewportHeight = isRoot ? window.innerHeight : host.clientHeight;

    return {
      horizontal:
        style.overflowX !== "hidden" &&
        style.overflowX !== "clip" &&
        scrollWidth > viewportWidth + 1,
      vertical:
        style.overflowY !== "hidden" &&
        style.overflowY !== "clip" &&
        scrollHeight > viewportHeight + 1,
    };
  }

  createEntry(host) {
    host.classList.add("custom-scrollbar-host");

    const createTrack = (axis) => {
      const track = document.createElement("div");
      track.className = `custom-scrollbar-track custom-scrollbar-track-${axis}`;
      track.dataset.customScrollbar = axis;
      track.setAttribute("aria-hidden", "true");

      const thumb = document.createElement("div");
      thumb.className = "custom-scrollbar-thumb";
      thumb.dataset.customScrollbarThumb = axis;
      track.appendChild(thumb);
      document.body.appendChild(track);

      return { track, thumb };
    };

    return {
      vertical: createTrack("vertical"),
      horizontal: createTrack("horizontal"),
    };
  }

  updateEntry(host, entry, axes) {
    this.updateAxis(host, entry.vertical, "vertical", axes.vertical);
    this.updateAxis(host, entry.horizontal, "horizontal", axes.horizontal);
  }

  updateAxis(host, entry, axis, enabled) {
    if (!entry) return;

    if (!enabled) {
      entry.track.classList.remove("is-visible");
      return;
    }

    const isRoot = host === document.documentElement;
    const rect = isRoot
      ? {
          top: 0,
          left: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
        }
      : host.getBoundingClientRect();

    const viewportSize =
      axis === "vertical"
        ? isRoot
          ? window.innerHeight
          : host.clientHeight
        : isRoot
          ? window.innerWidth
          : host.clientWidth;

    const scrollSize =
      axis === "vertical"
        ? isRoot
          ? Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
            )
          : host.scrollHeight
        : isRoot
          ? Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            )
          : host.scrollWidth;

    const scrollPosition =
      axis === "vertical"
        ? isRoot
          ? window.scrollY
          : host.scrollTop
        : isRoot
          ? window.scrollX
          : host.scrollLeft;

    const viewportStart = axis === "vertical" ? rect.top : rect.left;
    const viewportEnd = axis === "vertical" ? rect.bottom : rect.right;
    const viewportLimit =
      axis === "vertical" ? window.innerHeight : window.innerWidth;

    const trackStart = Math.max(0, viewportStart);
    const trackEnd = Math.min(viewportLimit, viewportEnd);
    const trackSize = Math.max(0, trackEnd - trackStart);

    if (trackSize <= 0 || scrollSize <= viewportSize + 1) {
      entry.track.classList.remove("is-visible");
      return;
    }

    const thumbSize = Math.max(
      34,
      (viewportSize / scrollSize) * trackSize,
    );
    const maxThumbOffset = Math.max(0, trackSize - thumbSize);
    const maxScroll = Math.max(0, scrollSize - viewportSize);
    const thumbOffset =
      maxScroll > 0
        ? (scrollPosition / maxScroll) * maxThumbOffset
        : 0;

    if (axis === "vertical") {
      entry.track.style.top = `${trackStart}px`;
      entry.track.style.height = `${trackSize}px`;
      entry.track.style.right = isRoot
        ? "2px"
        : `${Math.max(2, window.innerWidth - rect.right + 2)}px`;
      entry.track.style.left = "auto";
      entry.track.style.bottom = "auto";
      entry.track.style.width = "9px";
      entry.thumb.style.width = "9px";
      entry.thumb.style.height = `${thumbSize}px`;
      entry.thumb.style.transform = `translateY(${thumbOffset}px)`;
    } else {
      entry.track.style.left = `${trackStart}px`;
      entry.track.style.width = `${trackSize}px`;
      entry.track.style.bottom = isRoot
        ? "2px"
        : `${Math.max(2, window.innerHeight - rect.bottom + 2)}px`;
      entry.track.style.top = "auto";
      entry.track.style.right = "auto";
      entry.track.style.height = "9px";
      entry.thumb.style.width = `${thumbSize}px`;
      entry.thumb.style.height = "9px";
      entry.thumb.style.transform = `translateX(${thumbOffset}px)`;
    }

    entry.track.classList.add("is-visible");
  }

  findThumb(target) {
    if (!target?.dataset?.customScrollbarThumb) return null;

    for (const [host, entry] of this.hosts) {
      for (const axis of ["vertical", "horizontal"]) {
        if (entry[axis]?.thumb === target) {
          return { host, entry: entry[axis], axis };
        }
      }
    }

    return null;
  }

  onPointerDown(event) {
    if (event.button !== 0) return;

    const match = this.findThumb(event.target);
    if (!match) return;

    const { host, entry, axis } = match;
    const trackRect = entry.track.getBoundingClientRect();
    const thumbRect = entry.thumb.getBoundingClientRect();
    const isRoot = host === document.documentElement;

    const viewportSize =
      axis === "vertical"
        ? isRoot
          ? window.innerHeight
          : host.clientHeight
        : isRoot
          ? window.innerWidth
          : host.clientWidth;

    const scrollSize =
      axis === "vertical"
        ? isRoot
          ? Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
            )
          : host.scrollHeight
        : isRoot
          ? Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            )
          : host.scrollWidth;

    this.drag = {
      host,
      entry,
      axis,
      startPointer: axis === "vertical" ? event.clientY : event.clientX,
      startThumbOffset:
        axis === "vertical"
          ? thumbRect.top - trackRect.top
          : thumbRect.left - trackRect.left,
      maxThumbOffset: Math.max(
        1,
        (axis === "vertical" ? trackRect.height : trackRect.width) -
          (axis === "vertical" ? thumbRect.height : thumbRect.width),
      ),
      maxScroll: Math.max(0, scrollSize - viewportSize),
    };

    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.drag) return;

    const currentPointer =
      this.drag.axis === "vertical" ? event.clientY : event.clientX;
    const delta = currentPointer - this.drag.startPointer;
    const thumbOffset = Math.max(
      0,
      Math.min(
        this.drag.maxThumbOffset,
        this.drag.startThumbOffset + delta,
      ),
    );
    const progress = thumbOffset / this.drag.maxThumbOffset;
    const scrollPosition = progress * this.drag.maxScroll;

    if (this.drag.host === document.documentElement) {
      if (this.drag.axis === "vertical") {
        window.scrollTo(0, scrollPosition);
      } else {
        window.scrollTo(scrollPosition, window.scrollY);
      }
    } else if (this.drag.axis === "vertical") {
      this.drag.host.scrollTop = scrollPosition;
    } else {
      this.drag.host.scrollLeft = scrollPosition;
    }

    event.preventDefault();
    this.scheduleRefresh();
  }

  onPointerUp() {
    this.drag = null;
  }
}
