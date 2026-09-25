import { store } from "./store.js";
import { CustomScrollbarManager } from "./custom-scrollbar.js";

export class CustomCursorEngine {
  constructor() {
    this.container = document.getElementById("customCursorEngine");
    if (!this.container) return;

    window.customCursorInstance = this;
    this.scrollbarManager = new CustomScrollbarManager();

    this.iconEl = this.container.querySelector(".custom-cursor-icon");
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.isVisible = false;
    this.isTouchDevice = false;
    this.isTracking = false;
    this.isDragging = false;
    this.isFirstMove = true;
    this.rafId = null;
    this.pointerDirty = false;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerOver = this.onPointerOver.bind(this);
    this.onPointerOut = this.onPointerOut.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onEnter = this.onEnter.bind(this);
    this.render = this.render.bind(this);

    this.init();
  }

  init() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      this.isTouchDevice = true;
      return;
    }

    this.bindEvents();
    this.startLoop();

    const settings = store.getState().settings || {};
    this.toggleEnabled(settings.customCursorEnabled !== false);
  }

  toggleEnabled(enabled) {
    this.isEnabled = enabled;
    this.scrollbarManager?.setEnabled(enabled);
    if (enabled) {
      this.isFirstMove = true;
      this.unbindEvents();
      this.bindEvents();
      this.startLoop();
      this.setVisible(true);
    } else {
      this.stopLoop();
      this.unbindEvents();
      this.isDragging = false;
      this.setVisible(false);
    }
  }

  unbindEvents() {
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerUp);
    document.body.removeEventListener("pointerover", this.onPointerOver);
    document.body.removeEventListener("pointerout", this.onPointerOut);
    document.documentElement.removeEventListener("mouseleave", this.onLeave);
    document.documentElement.removeEventListener("mouseenter", this.onEnter);
    window.removeEventListener("blur", this.onLeave);
  }

  bindEvents() {
    window.addEventListener("pointermove", this.onPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerdown", this.onPointerDown, {
      passive: true,
    });
    window.addEventListener("pointerup", this.onPointerUp, { passive: true });

    document.body.addEventListener("pointerover", this.onPointerOver, {
      passive: true,
    });
    document.body.addEventListener("pointerout", this.onPointerOut, {
      passive: true,
    });

    document.documentElement.addEventListener("mouseleave", this.onLeave, {
      passive: true,
    });
    document.documentElement.addEventListener("mouseenter", this.onEnter, {
      passive: true,
    });
    window.addEventListener("blur", this.onLeave, { passive: true });
  }

  onPointerMove(e) {
    if (e.pointerType === "touch") {
      this.deactivateTouch();
      return;
    }

    if (this.isFirstMove) {
      this.currentX = e.clientX;
      this.currentY = e.clientY;
      this.isFirstMove = false;
    }

    this.targetX = e.clientX;
    this.targetY = e.clientY;
    this.pointerDirty = true;

    if (!this.isVisible) {
      this.setVisible(true);
    }
  }

  onPointerDown(e) {
    if (e.pointerType === "touch" || !this.isEnabled) return;
    this.isDragging = true;
  }

  onPointerUp() {
    this.isDragging = false;
  }

  onPointerOver(e) {
    if (!this.isEnabled || this.isDragging) return;
    this.updateCursorForElement(e.target);
  }

  onPointerOut(e) {
    if (!this.isEnabled || this.isDragging) return;
    const related = e.relatedTarget;
    if (related instanceof Node) this.updateCursorForElement(related);
  }

  updateCursorForElement(element) {
    if (!element || !this.iconEl || this.isDragging) return;

    const textInput = element.closest(
      "input[type='text'], input[type='url'], input[type='number'], textarea, [contenteditable='true']",
    );
    const dragHandle = element.closest(".drag-handle");
    const interactive = element.closest(
      "a, button, select, label, summary, input[type='checkbox'], input[type='radio'], input[type='range'], .link-item, .icon-btn, .custom-select, .select-trigger, .select-option, .engine-btn, .engine-dropdown, .engine-dropdown *, .suggestion-item, .suggestions-container *, .radio-option, .is-folder-item, .folder-toggle, .sub-collapsible-content, .floating-btn, .back-btn, .back-pill, .back-icon-circle, .modal-close, [role='button']",
    );

    const isTextElement = element.closest(
      "p, h1, h2, h3, h4, h5, h6, .link-grid .link-name, .greeting, .clock, code, .help-text",
    );
    const computedStyle = isTextElement
      ? window.getComputedStyle(isTextElement)
      : null;
    const isSelectableText =
      isTextElement &&
      computedStyle &&
      computedStyle.userSelect !== "none" &&
      isTextElement.textContent.trim().length > 0;

    if (textInput || isSelectableText) {
      this.setCursorClass("icon-text-i-beam-cursor");
    } else if (dragHandle) {
      this.setCursorClass("icon-drag-grip-cursor");
    } else if (interactive) {
      this.setCursorClass("icon-interactive-hover-ring-target");
    } else {
      this.setCursorClass("icon-default-mouse-pointer");
    }
  }

  onLeave() {
    this.setVisible(false);
  }

  onEnter() {
    this.setVisible(true);
  }

  setVisible(visible) {
    this.isVisible = visible;

    if (visible && this.isEnabled) {
      this.container.classList.add("is-visible");
      this.container.removeAttribute("aria-hidden");
    } else {
      this.container.classList.remove("is-visible");
      this.container.setAttribute("aria-hidden", "true");
    }

    // Keep scrollbar suppression tied to the setting, not cursor visibility.
    // The native viewport scrollbar can sit outside the document and trigger
    // mouseleave, so removing this attribute there would expose it again.
    if (this.isEnabled) {
      document.documentElement.setAttribute("data-custom-cursor", "active");
    } else {
      document.documentElement.removeAttribute("data-custom-cursor");
    }
  }

  deactivateTouch() {
    this.isTouchDevice = true;
    this.toggleEnabled(false);
  }

  setCursorClass(className) {
    this.iconEl.className = `custom-cursor-icon ${className}`;
  }

  setDragState(dragging) {
    this.isDragging = dragging;
  }

  startLoop() {
    if (this.rafId !== null) return;
    const renderFrame = () => {
      this.rafId = requestAnimationFrame(renderFrame);
      this.render();
    };
    this.rafId = requestAnimationFrame(renderFrame);
  }

  stopLoop() {
    if (this.rafId === null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  render() {
    if (!this.pointerDirty || !this.isVisible || !this.isEnabled) return;

    this.currentX += (this.targetX - this.currentX) * 0.35;
    this.currentY += (this.targetY - this.currentY) * 0.35;

    this.container.style.transform = `translate3d(${this.currentX}px, ${this.currentY}px, 0)`;
    this.pointerDirty = false;
  }
}