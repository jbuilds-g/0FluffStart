/**
 * Quick Links drag engine.
 *
 * Desktop keeps its existing insertion-slot behavior. Touch dragging uses a
 * separate row-aware resolver and overlay feedback so the mobile grid does not
 * reflow while the pointer is being measured.
 */

export function installQuickLinksDragEngine({
  grid,
  getCurrentFolderId,
  getLinks,
  onDrop,
}) {
  if (!grid) return () => {};

  let session = null;

  const cardSelector = ".quick-link-card";
  const addSelector = ".quick-link-add-card";
  const visualClasses = [
    "drag-over",
    "drag-enter-folder",
    "drop-before",
    "drop-after",
  ];

  function removeFeedback(activeSession = session) {
    grid.querySelectorAll(cardSelector).forEach((card) => {
      card.classList.remove(...visualClasses);
    });
    if (activeSession?.dropSlot) {
      activeSession.dropSlot.remove();
      activeSession.dropSlot = null;
    }
    activeSession?.appendSlot?.remove();
    if (activeSession) activeSession.appendSlot = null;
  }

  function animateGridReflow(beforeRects, activeSession) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const animations = [];
    grid.querySelectorAll(cardSelector).forEach((card) => {
      if (card === activeSession.source) return;
      const before = beforeRects.get(card);
      if (!before || !card.isConnected) return;
      const after = card.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      animations.push(
        card.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: "translate(0, 0)" },
          ],
          { duration: 190, easing: "cubic-bezier(0.2, 0, 0, 1)" },
        ),
      );
    });
    return animations;
  }

  function captureCardRects() {
    return new Map(
      [...grid.querySelectorAll(cardSelector)].map((card) => [
        card,
        card.getBoundingClientRect(),
      ]),
    );
  }

  function insertDropSlot(activeSession, target, feedbackCard) {
    if (
      !feedbackCard ||
      !target ||
      !["before", "after"].includes(target.position)
    ) {
      return;
    }

    const rect = feedbackCard.getBoundingClientRect();
    const beforeRects = captureCardRects();
    const slot = document.createElement("div");
    slot.className = "quick-link-drop-slot quick-link-drop-slot-inline";
    slot.setAttribute("aria-hidden", "true");
    slot.style.width = rect.width + "px";
    slot.style.height = rect.height + "px";
    slot.style.minHeight = rect.height + "px";
    slot.style.setProperty("--drop-slot-scale", "0.82");

    if (target.position === "before") {
      grid.insertBefore(slot, feedbackCard);
    } else {
      feedbackCard.after(slot);
    }
    activeSession.dropSlot = slot;
    animateGridReflow(beforeRects, activeSession);

    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      slot.animate(
        [
          { opacity: 0, transform: "scale(0.82)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      );
    }
  }

  function createPreview(card, rect) {
    const preview = card.cloneNode(true);
    preview.classList.remove(
      "is-dragging",
      "is-drag-source",
      "drag-over",
      "drag-enter-folder",
      "drop-before",
      "drop-after",
    );
    preview.classList.add("quick-link-drag-preview");
    Object.assign(preview.style, {
      width: rect.width + "px",
      height: rect.height + "px",
      left: rect.left + "px",
      top: rect.top + "px",
    });
    preview.setAttribute("aria-hidden", "true");
    preview.querySelectorAll("button").forEach((button) => {
      button.tabIndex = -1;
    });
    document.body.appendChild(preview);
    return preview;
  }

  function showAppendFeedback(activeSession, anchorSelector) {
    const anchor =
      grid.querySelector(anchorSelector || ".quick-link-add-folder") ||
      grid.querySelector(".quick-link-add-folder");
    if (!anchor) return;

    if (!activeSession.appendSlot) {
      const slot = document.createElement("div");
      slot.className = "quick-link-drop-slot quick-link-drop-slot-overlay";
      slot.setAttribute("aria-hidden", "true");
      document.body.appendChild(slot);
      activeSession.appendSlot = slot;
    }

    const rect = anchor.getBoundingClientRect();
    Object.assign(activeSession.appendSlot.style, {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
  }

  function makeEndTarget(anchorSelector) {
    const folderId = getCurrentFolderId();
    return folderId
      ? { id: folderId, position: "append", anchorSelector }
      : { id: null, position: "root-end", anchorSelector };
  }

  function makeRows(cards) {
    const rows = [];
    cards.forEach((entry) => {
      let row = rows.find(
        (candidate) => Math.abs(candidate.top - entry.rect.top) <= 3,
      );
      if (!row) {
        row = { top: entry.rect.top, bottom: entry.rect.bottom, entries: [] };
        rows.push(row);
      }
      row.top = Math.min(row.top, entry.rect.top);
      row.bottom = Math.max(row.bottom, entry.rect.bottom);
      row.entries.push(entry);
    });
    rows.sort((a, b) => a.top - b.top);
    rows.forEach((row) =>
      row.entries.sort((a, b) => a.rect.left - b.rect.left),
    );
    return rows;
  }

  function resolveTarget(x, y, activeSession) {
    const cards = [...grid.querySelectorAll(cardSelector)]
      .filter((card) => card !== activeSession.source && card.isConnected)
      .map((card) => ({
        card,
        id: card.dataset.id,
        rect: card.getBoundingClientRect(),
      }))
      .filter((entry) => entry.rect.width > 0 && entry.rect.height > 0);

    // Add tiles are explicit append targets. The screen outside actual drop
    // zones is never treated as an implicit destination.
    for (const addCard of grid.querySelectorAll(addSelector)) {
      const rect = addCard.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        const anchorSelector = addCard.classList.contains("quick-link-add-link")
          ? ".quick-link-add-link"
          : ".quick-link-add-folder";
        // The add tiles also mean "append", but show the insertion point
        // inline after the last existing item instead of covering the tile.
        return {
          target: makeEndTarget(anchorSelector),
          feedbackCard: cards[cards.length - 1]?.card || null,
        };
      }
    }

    // Dropping in the middle of a folder means move into that folder.
    const hovered = cards.find(
      ({ rect }) =>
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
    );
    if (hovered) {
      const link = (getLinks() || []).find((item) => item.id === hovered.id);
      if (link?.isFolder && hovered.id !== activeSession.source.dataset.id) {
        const rx = (x - hovered.rect.left) / Math.max(1, hovered.rect.width);
        const ry = (y - hovered.rect.top) / Math.max(1, hovered.rect.height);
        if (rx >= 0.18 && rx <= 0.82 && ry >= 0.18 && ry <= 0.82) {
          return {
            target: { id: hovered.id, position: "inside" },
            feedbackCard: hovered.card,
          };
        }
      }
    }

    if (!cards.length) return { target: null, feedbackCard: null };

    const rows = makeRows(cards);
    const styles = getComputedStyle(grid);
    const columnGap = Number.parseFloat(styles.columnGap) || 18;
    const rowGap = Number.parseFloat(styles.rowGap) || 18;
    const verticalTolerance = Math.max(24, rowGap / 2 + 6);
    const horizontalTolerance = Math.max(24, columnGap / 2 + 6);

    let rowIndex = -1;
    let rowDistance = Infinity;
    rows.forEach((row, index) => {
      const distance =
        y < row.top ? row.top - y : y > row.bottom ? y - row.bottom : 0;
      if (distance < rowDistance) {
        rowDistance = distance;
        rowIndex = index;
      }
    });
    if (rowIndex < 0 || rowDistance > verticalTolerance) {
      return { target: null, feedbackCard: null };
    }

    const row = rows[rowIndex];
    const first = row.entries[0];
    const last = row.entries[row.entries.length - 1];
    // Horizontal edges are valid insertion zones too. Keep resolving the
    // first/last insertion point even when the pointer is just outside a card.

    // In a row gap, prefer the next row's first item. Within a row (including
    // the gaps between cards), compare against card midpoints to resolve an
    // insertion point rather than requiring a hit on a card itself.
    const nextRow = rows[rowIndex + 1];
    if (nextRow && y > row.bottom && y >= (row.bottom + nextRow.top) / 2) {
      const nextFirst = nextRow.entries[0];
      return {
        target: { id: nextFirst.id, position: "before" },
        feedbackCard: nextFirst.card,
      };
    }

    const next = row.entries.find(
      (entry) => x < entry.rect.left + entry.rect.width / 2,
    );
    if (next) {
      return {
        target: { id: next.id, position: "before" },
        feedbackCard: next.card,
      };
    }

    if (nextRow) {
      const nextFirst = nextRow.entries[0];
      return {
        target: { id: nextFirst.id, position: "before" },
        feedbackCard: nextFirst.card,
      };
    }

    // The final insertion point belongs immediately after the last item, not
    // on top of an add tile. This makes dragging to the end visible and precise.
    return {
      target: makeEndTarget(".quick-link-add-folder"),
      feedbackCard: last.card,
    };
  }


  // Mobile uses row-major grid ordering and never inserts a live placeholder
  // into the grid while measuring targets. This keeps touch targeting stable.
  function resolveMobileTarget(x, y, activeSession) {
    // Keep the source in the geometry as an empty grid cell. Excluding it
    // would collapse a two-column row to one entry and misread horizontal drags.
    const allCards = [...grid.querySelectorAll(cardSelector)]
      .filter((card) => card.isConnected)
      .map((card) => ({
        card,
        id: card.dataset.id,
        rect: card.getBoundingClientRect(),
      }))
      .filter((entry) => entry.rect.width > 0 && entry.rect.height > 0);
    const cards = allCards.filter((entry) => entry.card !== activeSession.source);

    for (const addCard of grid.querySelectorAll(addSelector)) {
      const rect = addCard.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const anchorSelector = addCard.classList.contains("quick-link-add-link")
          ? ".quick-link-add-link"
          : ".quick-link-add-folder";
        return {
          target: makeEndTarget(anchorSelector),
          feedbackCard: cards[cards.length - 1]?.card || null,
        };
      }
    }

    const hovered = cards.find(({ rect }) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
    if (hovered) {
      const link = (getLinks() || []).find((item) => item.id === hovered.id);
      if (link?.isFolder) {
        const rx = (x - hovered.rect.left) / Math.max(1, hovered.rect.width);
        const ry = (y - hovered.rect.top) / Math.max(1, hovered.rect.height);
        if (rx >= 0.2 && rx <= 0.8 && ry >= 0.2 && ry <= 0.8) {
          return { target: { id: hovered.id, position: "inside" }, feedbackCard: hovered.card };
        }
      }
    }

    if (!allCards.length) return { target: makeEndTarget(".quick-link-add-folder"), feedbackCard: null };

    const rows = makeRows(allCards);
    // Pick the row nearest the finger vertically. In the gap between rows,
    // use the next row as the destination so vertical drags feel predictable.
    let rowIndex = 0;
    let bestDistance = Infinity;
    rows.forEach((row, index) => {
      const center = (row.top + row.bottom) / 2;
      const distance = Math.abs(y - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        rowIndex = index;
      }
    });

    const row = rows[rowIndex];
    const nextRow = rows[rowIndex + 1];
    if (nextRow && y > row.bottom && y >= (row.bottom + nextRow.top) / 2) {
      const first = nextRow.entries.find((entry) => entry.card !== activeSession.source);
      if (first) return { target: { id: first.id, position: "before" }, feedbackCard: first.card };
    }

    const next = row.entries.find(
      (entry) => x < entry.rect.left + entry.rect.width / 2,
    );
    if (next) {
      if (next.card !== activeSession.source) {
        return { target: { id: next.id, position: "before" }, feedbackCard: next.card };
      }
      // The source's cell is still part of the grid. Resolve it to the next
      // real item in DOM order, or to the end if the source was last.
      const sourceIndex = allCards.findIndex((entry) => entry.card === activeSession.source);
      const following = allCards.slice(sourceIndex + 1).find(
        (entry) => entry.card !== activeSession.source,
      );
      if (following) {
        return { target: { id: following.id, position: "before" }, feedbackCard: following.card };
      }
      return { target: makeEndTarget(".quick-link-add-folder"), feedbackCard: cards[cards.length - 1]?.card || null };
    }

    if (nextRow) {
      const nextFirst = nextRow.entries.find((entry) => entry.card !== activeSession.source);
      if (nextFirst) return { target: { id: nextFirst.id, position: "before" }, feedbackCard: nextFirst.card };
    }
    return {
      target: makeEndTarget(".quick-link-add-folder"),
      feedbackCard: cards[cards.length - 1]?.card || null,
    };
  }

  function updateMobileFeedback(activeSession, resolved) {
    removeFeedback(activeSession);
    if (!resolved?.target) return;

    const { target, feedbackCard } = resolved;
    if (target.position === "inside") {
      feedbackCard?.classList.add("drag-enter-folder");
      return;
    }

    // An overlay indicates the destination without changing grid geometry.
    if (!feedbackCard) {
      showAppendFeedback(activeSession, target.anchorSelector);
      return;
    }
    const rect = feedbackCard.getBoundingClientRect();
    if (!activeSession.appendSlot) {
      activeSession.appendSlot = document.createElement("div");
      activeSession.appendSlot.className = "quick-link-drop-slot quick-link-drop-slot-overlay";
      activeSession.appendSlot.setAttribute("aria-hidden", "true");
      document.body.appendChild(activeSession.appendSlot);
    }
    Object.assign(activeSession.appendSlot.style, {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
  }

  function updateFeedback(activeSession, resolved) {
    removeFeedback(activeSession);
    if (!resolved?.target) return;

    const { target, feedbackCard } = resolved;

    // Resolve the proposed insertion index against the current DOM order.
    // Since the source stays in the grid as a faded placeholder, inserting
    // before its next sibling (or after its previous sibling) is still the
    // original position and must not display a drop slot.
    if (
      target.position === "before" ||
      target.position === "after" ||
      target.position === "root-end" ||
      target.position === "append"
    ) {
      const orderedCards = [...grid.querySelectorAll(cardSelector)].filter(
        (card) => card.isConnected,
      );
      const sourceIndex = orderedCards.indexOf(activeSession.source);
      const remainingCards = orderedCards.filter(
        (card) => card !== activeSession.source,
      );
      let destinationIndex = remainingCards.length;

      if (target.position === "before") {
        const targetIndex = remainingCards.findIndex(
          (card) => card.dataset.id === target.id,
        );
        if (targetIndex >= 0) destinationIndex = targetIndex;
      } else if (target.position === "after") {
        const targetIndex = remainingCards.findIndex(
          (card) => card.dataset.id === target.id,
        );
        if (targetIndex >= 0) destinationIndex = targetIndex + 1;
      }

      if (sourceIndex >= 0 && destinationIndex === sourceIndex) return;
    }
    if (target.position === "inside") {
      feedbackCard?.classList.add("drag-enter-folder");
    } else if (target.position === "before" || target.position === "after") {
      insertDropSlot(activeSession, target, feedbackCard);
    } else if (target.position === "root-end" || target.position === "append") {
      if (feedbackCard) {
        insertDropSlot(
          activeSession,
          { ...target, position: "after" },
          feedbackCard,
        );
      } else {
        showAppendFeedback(activeSession, target.anchorSelector);
      }
    }
  }

  function updatePreview(activeSession, event) {
    if (!activeSession.preview) return;
    activeSession.preview.style.left =
      event.clientX - activeSession.offsetX + "px";
    activeSession.preview.style.top =
      event.clientY - activeSession.offsetY + "px";
  }

  function updateAutoScroll(activeSession) {
    if (activeSession.autoScrollFrame) return;

    const tick = () => {
      if (session !== activeSession || !activeSession.started) return;
      const y = activeSession.lastY;
      const edge = Math.min(96, Math.max(60, window.innerHeight * 0.12));
      let step = 0;
      if (y < edge) step = -Math.ceil(Math.min(1, (edge - y) / edge) * 10);
      else if (y > window.innerHeight - edge) {
        step = Math.ceil(
          Math.min(1, (y - (window.innerHeight - edge)) / edge) * 10,
        );
      }

      if (step) {
        window.scrollBy(0, step);
        updatePreview(activeSession, {
          clientX: activeSession.lastX,
          clientY: activeSession.lastY,
        });
        const resolved = activeSession.pointerType === "touch"
          ? resolveMobileTarget(activeSession.lastX, activeSession.lastY, activeSession)
          : resolveTarget(activeSession.lastX, activeSession.lastY, activeSession);
        activeSession.resolved = resolved?.target || null;
        if (activeSession.pointerType === "touch") updateMobileFeedback(activeSession, resolved);
        else updateFeedback(activeSession, resolved);
        activeSession.autoScrollFrame = requestAnimationFrame(tick);
      } else {
        activeSession.autoScrollFrame = 0;
      }
    };

    activeSession.autoScrollFrame = requestAnimationFrame(tick);
  }

  function cleanup(activeSession, { suppressClick = false } = {}) {
    if (!activeSession || activeSession.finished) return;
    activeSession.finished = true;
    if (activeSession.autoScrollFrame)
      cancelAnimationFrame(activeSession.autoScrollFrame);
    if (activeSession.longPressTimer) clearTimeout(activeSession.longPressTimer);
    activeSession.source.classList.remove("is-long-pressing");

    window.removeEventListener("pointermove", activeSession.onMove);
    window.removeEventListener("pointerup", activeSession.onUp);
    window.removeEventListener("pointercancel", activeSession.onCancel);
    window.removeEventListener("blur", activeSession.onCancel);
    window.removeEventListener("scroll", activeSession.onScroll, true);

    try {
      if (
        activeSession.captureTarget.hasPointerCapture?.(activeSession.pointerId)
      ) {
        activeSession.captureTarget.releasePointerCapture(
          activeSession.pointerId,
        );
      }
    } catch {
      // The browser may already have released capture after pointerup/cancel.
    }

    removeFeedback(activeSession);
    activeSession.preview?.remove();
    activeSession.source.classList.remove("is-drag-source");
    grid.classList.remove("quick-links-grid-drag-active");
    if (suppressClick && activeSession.started) {
      activeSession.source.dataset.suppressNextClick = "true";
      window.setTimeout(() => {
        delete activeSession.source.dataset.suppressNextClick;
      }, 800);
    }
    if (session === activeSession) session = null;
  }

  function onPointerDown(event) {
    if (session || event.button !== 0) return;
    const isTouch = event.pointerType === "touch";
    const icon = event.target.closest?.(".link-icon-circle");
    const card = icon?.closest(cardSelector);
    if (!icon || !card || !grid.contains(card)) return;

    const rect = card.getBoundingClientRect();
    const activeSession = {
      source: card,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      captureTarget: icon,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      offsetX: isTouch ? rect.width / 2 : event.clientX - rect.left,
      offsetY: isTouch ? Math.min(24, rect.height / 3) : event.clientY - rect.top,
      started: false,
      scrolling: false,
      finished: false,
      resolved: null,
      preview: null,
      appendSlot: null,
      autoScrollFrame: 0,
      longPressTimer: 0,
    };
    session = activeSession;

    const startDrag = () => {
      if (session !== activeSession || activeSession.finished || activeSession.started || activeSession.scrolling) return;
      activeSession.longPressTimer = 0;
      activeSession.started = true;
      grid.classList.add("quick-links-grid-drag-active");
      activeSession.preview = createPreview(card, rect);
      card.classList.add("is-drag-source");
      card.classList.remove("is-long-pressing");
      window.customCursorInstance?.setDragState(true);
      updatePreview(activeSession, { clientX: activeSession.lastX, clientY: activeSession.lastY });
    };

    try {
      icon.setPointerCapture?.(event.pointerId);
    } catch {
      // Window-level listeners still receive normal pointer events.
    }

    activeSession.onMove = (moveEvent) => {
      if (session !== activeSession || activeSession.finished || moveEvent.pointerId !== activeSession.pointerId) return;
      const previousY = activeSession.lastY;
      activeSession.lastX = moveEvent.clientX;
      activeSession.lastY = moveEvent.clientY;
      const distance = Math.hypot(moveEvent.clientX - activeSession.startX, moveEvent.clientY - activeSession.startY);

      if (isTouch && !activeSession.started && distance > 10) {
        if (activeSession.longPressTimer) clearTimeout(activeSession.longPressTimer);
        activeSession.longPressTimer = 0;
        activeSession.scrolling = true;
        card.classList.remove("is-long-pressing");
      }

      if (activeSession.scrolling) {
        const deltaY = previousY - moveEvent.clientY;
        if (deltaY) window.scrollBy(0, deltaY);
        moveEvent.preventDefault();
        return;
      }

      if (!activeSession.started) {
        if (isTouch || distance < 5) return;
        startDrag();
      }
      if (!activeSession.started) return;

      moveEvent.preventDefault();
      updatePreview(activeSession, moveEvent);
      const resolved = isTouch
        ? resolveMobileTarget(moveEvent.clientX, moveEvent.clientY, activeSession)
        : resolveTarget(moveEvent.clientX, moveEvent.clientY, activeSession);
      activeSession.resolved = resolved?.target || null;
      if (isTouch) updateMobileFeedback(activeSession, resolved);
      else updateFeedback(activeSession, resolved);
      updateAutoScroll(activeSession);
    };

    activeSession.onUp = async (upEvent) => {
      if (session !== activeSession || activeSession.finished || upEvent.pointerId !== activeSession.pointerId) return;
      let target = null;
      if (activeSession.started) {
        const resolved = isTouch
          ? resolveMobileTarget(upEvent.clientX, upEvent.clientY, activeSession)
          : resolveTarget(upEvent.clientX, upEvent.clientY, activeSession);
        target = resolved?.target || null;
      }
      const draggedId = card.dataset.id;
      const shouldDrop = activeSession.started && target;
      cleanup(activeSession, { suppressClick: activeSession.started });
      if (shouldDrop) {
        try {
          await onDrop({ link: { id: draggedId }, target });
        } catch (error) {
          console.error("Quick Links drop failed:", error);
        }
      }
    };

    activeSession.onCancel = () => cleanup(activeSession, { suppressClick: activeSession.started });
    activeSession.onScroll = () => {
      if (session !== activeSession || !activeSession.started) return;
      const resolved = isTouch
        ? resolveMobileTarget(activeSession.lastX, activeSession.lastY, activeSession)
        : resolveTarget(activeSession.lastX, activeSession.lastY, activeSession);
      activeSession.resolved = resolved?.target || null;
      if (isTouch) updateMobileFeedback(activeSession, resolved);
      else updateFeedback(activeSession, resolved);
    };

    window.addEventListener("pointermove", activeSession.onMove, { passive: false });
    window.addEventListener("pointerup", activeSession.onUp);
    window.addEventListener("pointercancel", activeSession.onCancel);
    window.addEventListener("blur", activeSession.onCancel);
    window.addEventListener("scroll", activeSession.onScroll, true);

    if (isTouch) {
      card.classList.add("is-long-pressing");
      activeSession.longPressTimer = window.setTimeout(startDrag, 420);
    }
  }

  grid.addEventListener("pointerdown", onPointerDown);

  return () => {
    grid.removeEventListener("pointerdown", onPointerDown);
    if (session) cleanup(session);
  };
}
