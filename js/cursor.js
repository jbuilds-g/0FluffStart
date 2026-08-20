export class CustomCursorEngine {
  constructor() {
    this.container = document.getElementById("customCursorEngine");
    if (!this.container) return;

    this.iconEl = this.container.querySelector(".custom-cursor-icon");
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.isVisible = false;
    this.isTouchDevice = false;
    this.isTracking = false;
    this.rafId = null;

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
    this.targetX = e.clientX;
    this.targetY = e.clientY;

    if (!this.isVisible) {
      this.setVisible(true);
    }
  }

  onPointerDown(e) {
    if (this.isTouchDevice) return;
    this.container.classList.add("is-active");

    const dragHandle = e.target.closest(".drag-handle");
    if (dragHandle && this.iconEl) {
      this.setCursorClass("icon-drag-grip-cursor");
    }
  }

  onPointerUp() {
    if (this.isTouchDevice) return;
    this.container.classList.remove("is-active");

    const hoveredEl = document.elementFromPoint(this.targetX, this.targetY);
    if (hoveredEl) {
      this.updateCursorForElement(hoveredEl);
    } else {
      this.setCursorClass("icon-default-mouse-pointer");
    }
  }

  onPointerOver(e) {
    if (this.isTouchDevice) return;
    this.updateCursorForElement(e.target);
  }

  onPointerOut(e) {
    if (this.isTouchDevice) return;
    const related = e.relatedTarget;
    if (related) {
      this.updateCursorForElement(related);
    } else {
      this.setCursorClass("icon-default-mouse-pointer");
    }
  }

  updateCursorForElement(element) {
    if (!element || !this.iconEl) return;

    const textInput = element.closest(
      "input[type='text'], input[type='url'], textarea, [contenteditable='true']",
    );
    const dragHandle = element.closest(".drag-handle");
    const interactive = element.closest(
      "a, button, select, .link-item, .icon-btn, .custom-select, .select-option, summary",
    );

    if (textInput) {
      this.setCursorClass("icon-text-i-beam-cursor");
    } else if (dragHandle) {
      if (this.container.classList.contains("is-active")) {
        this.setCursorClass("icon-drag-grip-cursor");
      } else {
        this.setCursorClass("icon-multidirectional-drag-handle");
      }
    } else if (interactive) {
      this.setCursorClass("icon-interactive-hover-ring-target");
    } else {
      this.setCursorClass("icon-default-mouse-pointer");
    }
  }

  setCursorClass(className) {
    if (!this.iconEl) return;
    this.iconEl.className = `custom-cursor-icon ${className}`;
  }

  onLeave() {
    this.setVisible(false);
  }

  onEnter() {
    this.setVisible(true);
  }

  setVisible(visible) {
    this.isVisible = visible;
    if (visible) {
      this.container.classList.add("is-visible");
      document.body.classList.add("custom-cursor-active");
    } else {
      this.container.classList.remove("is-visible");
      document.body.classList.remove("custom-cursor-active");
    }
  }

  deactivateTouch() {
    this.isTouchDevice = true;
    this.setVisible(false);
    this.stopLoop();
  }

  startLoop() {
    if (!this.isTracking) {
      this.isTracking = true;
      this.rafId = requestAnimationFrame(this.render);
    }
  }

  stopLoop() {
    if (this.isTracking) {
      this.isTracking = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
    }
  }

  render() {
    if (!this.isTracking) return;
    this.currentX += (this.targetX - this.currentX) * 0.45;
    this.currentY += (this.targetY - this.currentY) * 0.45;

    const x = Math.round(this.currentX * 100) / 100;
    const y = Math.round(this.currentY * 100) / 100;

    this.container.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.rafId = requestAnimationFrame(this.render);
  }
}
