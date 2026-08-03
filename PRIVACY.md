# Privacy Policy for 0FluffStart

**Effective Date:** August 3, 2026

0FluffStart is designed with a strict privacy-first philosophy. This application operates locally within your browser and does not collect, store, or transmit personal data to external servers.

## 1. Data Storage

- **Local Storage:** All user configurations, custom quick links, custom backgrounds, and theme preferences are stored exclusively on your device using standard browser storage mechanisms (`localStorage` and `IndexedDB`).
- **No Server Analytics:** 0FluffStart does not use tracking scripts, telemetry, or third-party analytics services.

## 2. External Network Requests

- **Disabled by Default:** 0FluffStart does not send network requests out of the box. Search auto-suggestions are strictly opt-in and can be toggled on or off in Settings at any time.
- **Why Proxies Are Used:** DuckDuckGo (`ac.duckduckgo.com`) does not return cross-origin (CORS) headers for web or PWA environments. To make live suggestion queries work, requests must pass through a proxy.
- **Strict Execution Chain:**
  1. **Custom Proxy (User-Defined):** If you configure a custom proxy URL in Settings, all suggestion requests pass exclusively through that URL. Fallback proxies are bypassed entirely.
  2. **Default Proxy Fallback:** If no custom proxy is set, requests attempt to load via `corsproxy.io`. If that request fails, it automatically falls back to `api.allorigins.win`.
- **Zero Tracking:** Suggestion requests contain only your raw search query. No cookies, persistent identifiers, or telemetry data are ever attached or transmitted.

* **Zero Tracking:** Suggestion requests contain only your raw search query. No cookies, persistent identifiers, or telemetry data are ever attached or transmitted.. Data Control & Portability

## 3. Data Control & Portability

- Users maintain full control over their data. You can export or import your settings locally, clear your search history, or trigger a full factory reset via _Settings > Data Management_. You can also completely purge all application data by clearing your browser cache.

## 4. Contact

For questions or concerns regarding this privacy policy, open an issue on the official GitHub repository: [https://github.com/jbuilds-g/0FluffStart](https://github.com/jbuilds-g/0FluffStart)
