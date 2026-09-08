/**
 * @fileoverview Material You dynamic HSL theming engine.
 *
 * Execution Flow:
 * Media Source (File / Blob / URL)
 *   └─> Render frame to 1x1 Canvas Context
 *         └─> Downsample pixel data to average RGB
 *               └─> Map RGB to HSL Hue Angle (0° - 360°)
 *                     └─> Apply HSL variables & palette object to DOM & Storage
 */

import { store } from "./store.js";

/** Default Hue angle (blue-slate) applied when no media is active. */
const DEFAULT_HUE = 210;

/** Baseline saturation percentage applied across generated theme shades. */
const BASE_SATURATION = 25;

/** Debounce delay (ms) to avoid layout thrashing during video frame seeks. */
const VIDEO_SEEK_DEBOUNCE_MS = 150;

/**
 * @typedef {Object} AppSettings
 * @property {string} [theme] Active theme identifier (e.g. "material-you").
 * @property {string} [backgroundImage] Background mode ("indexeddb", URL, or null).
 */

/**
 * Encapsulates dynamic color extraction, palette generation, and CSS variable updates.
 */
export class MaterialYouEngine {
  constructor() {
    this._activeBgObjectUrl = null;
    this._sharedColorVideo = null;
    this._offscreenCanvas = document.createElement("canvas");
    this._offscreenCanvas.width = 1;
    this._offscreenCanvas.height = 1;
    this._offscreenCanvasCtx = this._offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    this._extractionTimer = null;
    this._colorLoadedHandler = null;
    this._colorSeekedHandler = null;
    this._extractionGeneration = 0;
  }

  revokeActiveObjectUrl() {
    if (this._activeBgObjectUrl) {
      URL.revokeObjectURL(this._activeBgObjectUrl);
      this._activeBgObjectUrl = null;
    }
  }

  createMediaObjectUrl(blobOrFile) {
    this.revokeActiveObjectUrl();
    if (blobOrFile instanceof Blob || blobOrFile instanceof File) {
      this._activeBgObjectUrl = URL.createObjectURL(blobOrFile);
      return this._activeBgObjectUrl;
    }
    this._activeBgObjectUrl = null;
    return typeof blobOrFile === "string" ? blobOrFile : null;
  }

  _getAverageColor(imgElement) {
    if (!this._offscreenCanvasCtx) return { r: 0, g: 0, b: 0 };
    this._offscreenCanvasCtx.drawImage(imgElement, 0, 0, 1, 1);
    const [r, g, b] = this._offscreenCanvasCtx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  }

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

  _applyTheme(hue, generation = this._extractionGeneration) {
    if (generation !== this._extractionGeneration) return;

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

    store.setState((prevState) => ({
      settings: {
        ...prevState.settings,
        materialYouPalette: palette,
      },
    }));
  }

  _clearThemeProperties() {
    const target = document.body;
    target.style.removeProperty("--bg");
    target.style.removeProperty("--card");
    target.style.removeProperty("--card-hover");
    target.style.removeProperty("--border");
    target.style.removeProperty("--text");
    target.style.removeProperty("--accent");
  }

  _extractImageColor(url, generation = this._extractionGeneration) {
    if (generation !== this._extractionGeneration) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";

    const cleanup = () => {
      img.removeEventListener("load", handleImageLoad);
      img.removeEventListener("error", handleImageError);
    };

    const handleImageLoad = () => {
      cleanup();
      if (generation !== this._extractionGeneration) return;
      const { r, g, b } = this._getAverageColor(img);
      this._applyTheme(this._rgbToHue(r, g, b), generation);
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

  _cleanupVideoListeners() {
    if (
      this._sharedColorVideo &&
      this._colorLoadedHandler &&
      this._colorSeekedHandler
    ) {
      this._sharedColorVideo.removeEventListener(
        "loadeddata",
        this._colorLoadedHandler,
      );
      this._sharedColorVideo.removeEventListener(
        "seeked",
        this._colorSeekedHandler,
      );
      this._colorLoadedHandler = null;
      this._colorSeekedHandler = null;
    }
  }

  _extractVideoColor(url, generation = this._extractionGeneration) {
    if (generation !== this._extractionGeneration) return;

    this._cleanupVideoListeners();

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

    this._colorLoadedHandler = () => {
      if (generation !== this._extractionGeneration) return;
      if (this._sharedColorVideo) {
        this._sharedColorVideo.currentTime = Math.min(
          1,
          this._sharedColorVideo.duration / 2,
        );
      }
    };

    this._colorSeekedHandler = () => {
      if (generation !== this._extractionGeneration) return;
      if (this._extractionTimer) clearTimeout(this._extractionTimer);

      this._extractionTimer = setTimeout(() => {
        if (generation !== this._extractionGeneration) return;
        if (!this._offscreenCanvasCtx || !this._sharedColorVideo) return;
        this._offscreenCanvasCtx.drawImage(this._sharedColorVideo, 0, 0, 1, 1);
        const [r, g, b] = this._offscreenCanvasCtx.getImageData(
          0,
          0,
          1,
          1,
        ).data;
        this._applyTheme(this._rgbToHue(r, g, b), generation);
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
      if (this._offscreenCanvasCtx) {
        this._offscreenCanvasCtx.drawImage(this._sharedColorVideo, 0, 0, 1, 1);
        const [r, g, b] = this._offscreenCanvasCtx.getImageData(
          0,
          0,
          1,
          1,
        ).data;
        this._applyTheme(this._rgbToHue(r, g, b), generation);
      }
    }
  }

  async triggerMaterialYou(settings, getBgFromDB) {
    const generation = ++this._extractionGeneration;

    this._cleanupVideoListeners();

    if (this._extractionTimer) {
      clearTimeout(this._extractionTimer);
      this._extractionTimer = null;
    }

    if (settings?.theme !== "material-you") {
      // The background media URL belongs to the background renderer, not to
      // Material You. Keep it alive when switching to another theme.
      this._clearThemeProperties();
      return;
    }

    if (settings.backgroundImage === "indexeddb") {
      try {
        const bgData =
          typeof getBgFromDB === "function" ? await getBgFromDB() : null;

        if (generation !== this._extractionGeneration) return;

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

          if (generation !== this._extractionGeneration) return;

          if (isVideo) {
            this._extractVideoColor(url, generation);
          } else {
            this._extractImageColor(url, generation);
          }
        }
      } catch (e) {
        console.error("Material You engine failed:", e);
      }
    } else {
      if (generation !== this._extractionGeneration) return;
      this._clearThemeProperties();
      this._applyTheme(DEFAULT_HUE, generation);
    }
  }
}
