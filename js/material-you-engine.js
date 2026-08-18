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
    /**
     * Tracked Object URL created from user Blobs/Files.
     * @type {string|null}
     * @private
     */
    this._activeBgObjectUrl = null;

    /**
     * Shared offscreen HTMLVideoElement used to sample video frames without DOM insertion.
     * @type {HTMLVideoElement|null}
     * @private
     */
    this._sharedColorVideo = null;

    /**
     * Offscreen 1x1 canvas element used for fast color downsampling.
     * @type {HTMLCanvasElement|null}
     * @private
     */
    this._offscreenCanvas = document.createElement("canvas");
    this._offscreenCanvas.width = 1;
    this._offscreenCanvas.height = 1;

    /**
     * Pre-allocated 2D rendering context for offscreen sampling.
     * @type {CanvasRenderingContext2D|null}
     * @private
     */
    this._offscreenCanvasCtx = this._offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    /**
     * Timer handle for debouncing video seeking color updates.
     * @type {number|null}
     * @private
     */
    this._extractionTimer = null;

    /**
     * Cached event listener reference for video data load events.
     * @type {EventListener|null}
     * @private
     */
    this._colorLoadedHandler = null;

    /**
     * Cached event listener reference for video frame seek completion events.
     * @type {EventListener|null}
     * @private
     */
    this._colorSeekedHandler = null;
  }

  /**
   * Revokes active Object URLs to free browser memory and prevent memory leaks.
   */
  revokeActiveObjectUrl() {
    if (this._activeBgObjectUrl) {
      URL.revokeObjectURL(this._activeBgObjectUrl);
      this._activeBgObjectUrl = null;
    }
  }

  /**
   * Normalizes media input (Blob, File, or URL string) into a usable media URL.
   * Automatically revokes previous Object URLs to maintain memory efficiency.
   *
   * @param {Blob|File|string} blobOrFile - Raw file object or remote image/video URL.
   * @returns {string|null} A valid object URL string or direct URL string.
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
   * Downsamples an image to a single 1x1 pixel using Canvas 2D rendering.
   * Browser GPU rendering automatically averages color values across the full image.
   *
   * @private
   * @param {HTMLImageElement} imgElement - Loaded HTML image element.
   * @returns {{r: number, g: number, b: number}} Extracted RGB values (0-255).
   */
  _getAverageColor(imgElement) {
    if (!this._offscreenCanvasCtx) return { r: 0, g: 0, b: 0 };
    this._offscreenCanvasCtx.drawImage(imgElement, 0, 0, 1, 1);
    const [r, g, b] = this._offscreenCanvasCtx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  }

  /**
   * Converts RGB color channels to an HSL Hue angle in degrees (0° to 360°).
   *
   * Algorithm Details:
   * 1. Normalize R, G, B to floating values between 0.0 and 1.0.
   * 2. Identify max and min channel values to establish color range delta.
   * 3. Calculate Hue offset based on which channel holds the maximum value:
   *    - If Red is max: H = (G - B) / delta
   *    - If Green is max: H = (B - R) / delta + 2
   *    - If Blue is max: H = (R - G) / delta + 4
   * 4. Multiply fraction by 60° to yield full circle hue degree (0° - 360°).
   *
   * @private
   * @param {number} r - Red channel (0-255).
   * @param {number} g - Green channel (0-255).
   * @param {number} b - Blue channel (0-255).
   * @returns {number} Hue angle rounded to an integer (0-360).
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
   * Generates derivative theme colors based on extracted Hue angle and updates CSS rules.
   * Persists generated HSL palette to LocalStorage and extension storage.
   *
   * @private
   * @param {number} hue - Dominant hue angle in degrees (0-360).
   */
  _applyTheme(hue) {
    const target = document.body;

    // Construct harmonious HSL palette based on extracted hue angle
    const bg = `hsl(${hue}, ${BASE_SATURATION}%, 8%)`;
    const card = `hsl(${hue}, ${BASE_SATURATION + 5}%, 14%)`;
    const cardHover = `hsl(${hue}, ${BASE_SATURATION + 10}%, 19%)`;
    const border = `hsl(${hue}, ${BASE_SATURATION}%, 24%)`;
    const text = `hsl(${hue}, 45%, 82%)`;
    const accent = `hsl(${hue}, 65%, 68%)`;

    // Inject custom properties directly into document element
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

    // Cache current palette to storage for fast load restoration
    try {
      let settings = {};
      const raw = localStorage.getItem("0fluff_settings");
      if (raw) {
        try {
          settings = JSON.parse(raw);
        } catch (parseError) {
          console.warn("Failed to parse settings JSON:", parseError);
        }
      }
      settings.materialYouPalette = palette;
      const serialized = JSON.stringify(settings);
      localStorage.setItem("0fluff_settings", serialized);
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        chrome.storage.local.set({ "0fluff_settings": serialized });
      }
    } catch (e) {
      console.warn("Failed to persist Material You palette:", e);
    }
  }

  /**
   * Clears custom Material You HSL properties from document body.
   * Restores default CSS theme variable fallbacks.
   *
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
   * Asynchronously loads an image URL, extracts its dominant hue, and updates the theme.
   * Includes lifecycle event cleanup and cached image handling.
   *
   * @private
   * @param {string} url - Target image URL string or Object URL.
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

    // Handle cached images that load synchronously
    if (img.complete && img.naturalWidth > 0) {
      handleImageLoad();
    }
  }

  /**
   * Extracts average color from a video source by seeking to the midpoint frame.
   * Uses a hidden offscreen video element and canvas to prevent DOM layout impact.
   *
   * @private
   * @param {string} url - Video source URL or Object URL.
   */
  /**
   * Cleans up attached video event listeners and resets handler references.
   * @private
   */
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

  /**
   * Extracts average color from a video source by seeking to the midpoint frame.
   * Uses a hidden offscreen video element and canvas to prevent DOM layout impact.
   *
   * @private
   * @param {string} url - Video source URL or Object URL.
   */
  _extractVideoColor(url) {
    this._cleanupVideoListeners();

    if (this._extractionTimer) {
      clearTimeout(this._extractionTimer);
      this._extractionTimer = null;
    }

    // Lazy instantiate reusable offscreen video element
    if (!this._sharedColorVideo) {
      this._sharedColorVideo = document.createElement("video");
      this._sharedColorVideo.muted = true;
      this._sharedColorVideo.playsInline = true;
      this._sharedColorVideo.crossOrigin = "Anonymous";
    }

    // Seek to midpoint frame once media metadata loads
    this._colorLoadedHandler = () => {
      if (this._sharedColorVideo) {
        this._sharedColorVideo.currentTime = Math.min(
          1,
          this._sharedColorVideo.duration / 2,
        );
      }
    };

    // Extract frame pixels when seeking finishes
    this._colorSeekedHandler = () => {
      if (this._extractionTimer) clearTimeout(this._extractionTimer);
      this._extractionTimer = setTimeout(() => {
        if (!this._offscreenCanvasCtx || !this._sharedColorVideo) return;
        this._offscreenCanvasCtx.drawImage(this._sharedColorVideo, 0, 0, 1, 1);
        const [r, g, b] = this._offscreenCanvasCtx.getImageData(
          0,
          0,
          1,
          1,
        ).data;
        this._applyTheme(this._rgbToHue(r, g, b));
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
        this._applyTheme(this._rgbToHue(r, g, b));
      }
    }
  }

  /**
   * Main entry point to evaluate theme requirements and trigger extraction.
   *
   * @param {AppSettings} [settings] - Current application configuration state.
   * @param {Function} [getBgFromDB] - Async getter callback to retrieve background media from IndexedDB.
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
