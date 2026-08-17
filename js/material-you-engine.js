/**
 * @fileoverview Material You (Monet) dynamic HSL theming engine.
 * Extracts dominant hues from image or video backgrounds and applies CSS custom variables.
 */

const DEFAULT_HUE = 210;
const BASE_SATURATION = 25;
const VIDEO_SEEK_DEBOUNCE_MS = 150;

/**
 * @typedef {Object} AppSettings
 * @property {string} [theme]
 * @property {string} [backgroundImage]
 */

/**
 * Encapsulates dynamic color extraction and CSS theme mutation state.
 */
export class MaterialYouEngine {
  constructor() {
    /** @type {string|null} */
    this._activeBgObjectUrl = null;

    /** @type {HTMLVideoElement|null} */
    this._sharedColorVideo = null;

    /** @type {HTMLCanvasElement|null} */
    this._offscreenCanvas = null;

    /** @type {number|null} */
    this._extractionTimer = null;

    /** @type {EventListener|null} */
    this._colorLoadedHandler = null;

    /** @type {EventListener|null} */
    this._colorSeekedHandler = null;
  }

  /**
   * Safely revokes active object URLs to prevent memory leaks.
   */
  revokeActiveObjectUrl() {
    if (this._activeBgObjectUrl) {
      URL.revokeObjectURL(this._activeBgObjectUrl);
      this._activeBgObjectUrl = null;
    }
  }

  /**
   * Centralizes creation and tracking of background media Object URLs.
   * @param {Blob|File|string} blobOrFile
   * @returns {string|null}
   */
  createMediaObjectUrl(blobOrFile) {
    this.revokeActiveObjectUrl();
    if (blobOrFile instanceof Blob || blobOrFile instanceof File) {
      this._activeBgObjectUrl = URL.createObjectURL(blobOrFile);
      return this._activeBgObjectUrl;
    }
    this._activeBgObjectUrl = null;
    return typeof blobOrFile === "string" ? blobOrFile : null;
  }

  /**
   * Extracts average RGB values from an image via a 1x1 canvas context.
   * @private
   * @param {HTMLImageElement} imgElement
   * @returns {{r: number, g: number, b: number}}
   */
  _getAverageColor(imgElement) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imgElement, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  }

  /**
   * Converts RGB values to a Hue angle in degrees (0-360).
   * @private
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {number}
   */
  _rgbToHue(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;

    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return Math.round(h * 360);
  }

  /**
   * Applies calculated HSL variables to document body.
   * @private
   * @param {number} hue
   */
  _applyTheme(hue) {
    const target = document.body;
    const bg = `hsl(${hue}, ${BASE_SATURATION}%, 8%)`;
    const card = `hsl(${hue}, ${BASE_SATURATION + 5}%, 14%)`;
    const cardHover = `hsl(${hue}, ${BASE_SATURATION + 10}%, 19%)`;
    const border = `hsl(${hue}, ${BASE_SATURATION}%, 24%)`;
    const text = `hsl(${hue}, 45%, 82%)`;
    const accent = `hsl(${hue}, 65%, 68%)`;

    target.style.setProperty("--bg", bg);
    target.style.setProperty("--card", card);
    target.style.setProperty("--card-hover", cardHover);
    target.style.setProperty("--border", border);
    target.style.setProperty("--text", text);
    target.style.setProperty("--accent", accent);

    const palette = {
      "--bg": bg,
      "--card": card,
      "--card-hover": cardHover,
      "--border": border,
      "--text": text,
      "--accent": accent,
    };
    try {
      const raw = localStorage.getItem("0fluff_settings");
      if (raw) {
        const settings = JSON.parse(raw);
        settings.materialYouPalette = palette;
        const serialized = JSON.stringify(settings);
        localStorage.setItem("0fluff_settings", serialized);
        if (typeof chrome !== "undefined" && chrome?.storage?.local) {
          chrome.storage.local.set({ "0fluff_settings": serialized });
        }
      }
    } catch (e) {
      console.warn("Failed to persist Material You palette:", e);
    }
  }

  /**
   * Resets Material You CSS custom properties from document body.
   * @private
   */
  _clearThemeProperties() {
    const target = document.body;
    target.style.removeProperty("--bg");
    target.style.removeProperty("--card");
    target.style.removeProperty("--card-hover");
    target.style.removeProperty("--border");
    target.style.removeProperty("--text");
    target.style.removeProperty("--accent");
  }

  /**
   * Handles image color extraction with cached image checks and event listener cleanup.
   * @private
   * @param {string} url
   */
  _extractImageColor(url) {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    const cleanup = () => {
      img.removeEventListener("load", handleImageLoad);
      img.removeEventListener("error", handleImageError);
    };

    const handleImageLoad = () => {
      cleanup();
      const { r, g, b } = this._getAverageColor(img);
      const hue = this._rgbToHue(r, g, b);
      this._applyTheme(hue);
    };

    const handleImageError = (err) => {
      cleanup();
      console.error("Material You image extraction failed:", err);
    };

    img.addEventListener("load", handleImageLoad);
    img.addEventListener("error", handleImageError);

    img.src = url;

    if (img.complete && img.naturalWidth > 0) {
      handleImageLoad();
    }
  }

  /**
   * Handles video frame extraction by seeking to midpoint and drawing to offscreen canvas.
   * @private
   * @param {string} url
   */
  _extractVideoColor(url) {
    if (this._extractionTimer) {
      clearTimeout(this._extractionTimer);
      this._extractionTimer = null;
    }

    if (!this._sharedColorVideo) {
      this._sharedColorVideo = document.createElement("video");
      this._sharedColorVideo.muted = true;
      this._sharedColorVideo.playsInline = true;
      this._sharedColorVideo.crossOrigin = "Anonymous";
    }

    if (!this._offscreenCanvas) {
      this._offscreenCanvas = document.createElement("canvas");
      this._offscreenCanvas.width = 1;
      this._offscreenCanvas.height = 1;
    }

    if (this._colorLoadedHandler) {
      this._sharedColorVideo.removeEventListener(
        "loadeddata",
        this._colorLoadedHandler,
      );
    }
    if (this._colorSeekedHandler) {
      this._sharedColorVideo.removeEventListener(
        "seeked",
        this._colorSeekedHandler,
      );
    }

    this._colorLoadedHandler = () => {
      if (this._sharedColorVideo) {
        this._sharedColorVideo.currentTime = Math.min(
          1,
          this._sharedColorVideo.duration / 2,
        );
      }
    };

    this._colorSeekedHandler = () => {
      if (this._extractionTimer) clearTimeout(this._extractionTimer);
      this._extractionTimer = setTimeout(() => {
        if (!this._offscreenCanvas || !this._sharedColorVideo) return;
        const ctx = this._offscreenCanvas.getContext("2d", {
          willReadFrequently: true,
        });
        if (ctx) {
          ctx.drawImage(this._sharedColorVideo, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          this._applyTheme(this._rgbToHue(r, g, b));
        }
      }, VIDEO_SEEK_DEBOUNCE_MS);
    };

    this._sharedColorVideo.addEventListener(
      "loadeddata",
      this._colorLoadedHandler,
    );
    this._sharedColorVideo.addEventListener("seeked", this._colorSeekedHandler);

    if (this._sharedColorVideo.src !== url) {
      this._sharedColorVideo.src = url;
    } else if (this._sharedColorVideo.readyState >= 2) {
      const ctx = this._offscreenCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (ctx) {
        ctx.drawImage(this._sharedColorVideo, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        this._applyTheme(this._rgbToHue(r, g, b));
      }
    }
  }

  /**
   * Main entry point to evaluate theme requirements and trigger extraction.
   * @param {AppSettings} [settings]
   * @param {Function} [getBgFromDB]
   */
  async triggerMaterialYou(settings, getBgFromDB) {
    if (settings?.theme !== "material-you") {
      this._clearThemeProperties();
      return;
    }

    if (settings.backgroundImage === "indexeddb") {
      try {
        const bgData =
          typeof getBgFromDB === "function" ? await getBgFromDB() : null;

        if (bgData) {
          let url = this._activeBgObjectUrl;

          if (!url) {
            url =
              bgData instanceof Blob || bgData instanceof File
                ? URL.createObjectURL(bgData)
                : bgData;

            if (bgData instanceof Blob || bgData instanceof File) {
              this._activeBgObjectUrl = url;
            }
          }

          const isVideo =
            (bgData.type && bgData.type.startsWith("video/")) ||
            (typeof bgData === "string" &&
              bgData.match(/\.(mp4|webm|ogg)($|\?)/i));

          if (isVideo) {
            this._extractVideoColor(url);
          } else {
            this._extractImageColor(url);
          }
        }
      } catch (e) {
        console.error("Material You engine failed:", e);
      }
    } else {
      this.revokeActiveObjectUrl();
      this._applyTheme(DEFAULT_HUE);
    }
  }
}
