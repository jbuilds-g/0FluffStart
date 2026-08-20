# Privacy Policy for 0FluffStart

**Effective Date:** August 3, 2026

0FluffStart is designed with a strict privacy-first philosophy. This application operates locally within your browser and does not collect, store, or transmit personal data to external servers.

## 1. Data Storage

- **Local Storage:** All user configurations, custom quick links, custom backgrounds, and theme preferences are stored exclusively on your device using standard browser storage mechanisms (`localStorage` and `IndexedDB`).
- **No Server Analytics:** 0FluffStart does not use tracking scripts, telemetry, or third-party analytics services.

## 2. External Network Requests & Search Execution

- **Disabled by Default:** 0FluffStart does not send network requests out of the box. Search auto-suggestions are strictly opt-in and can be toggled on or off in Settings at any time.
- **Search Dispatching:** User-initiated searches are executed directly via the selected search provider's endpoint or shortcut tags (`?g`, `?d`, `?y`, etc.) using client-side URL parameters, or routed via standard browser navigation.
- **Why Proxies Are Used:** Upstream search autocomplete APIs (Google, Bing, DuckDuckGo, Brave) do not return permissive cross-origin (CORS) headers for standard web, PWA, or extension environments. To make live search suggestions work securely across origins, requests pass through a dedicated proxy layer.
- **Strict Execution Chain:**
  1. **Custom Proxy (User-Defined):** If you configure a custom proxy URL in Settings, all suggestion requests pass exclusively through that URL.
  2. **Cloudflare Edge Worker Proxy (Default):** If no custom proxy is defined, requests are routed through a dedicated serverless Cloudflare Edge Worker (`0fluffstart-suggest-proxy.jbuilds.workers.dev`). It enforces origin verification and rate-limiting (40 requests per minute per IP) to prevent service abuse without logging user queries or personal identifiers.
- **Zero Tracking:** Suggestion requests carry only the raw query string and target search engine parameter. No cookies, persistent identifiers, or telemetry data are ever attached, logged, or stored.

## 3. Data Control & Portability

- Users maintain full control over their data. You can export or import your settings locally, clear your search history, or trigger a full factory reset via _Settings > Data Management_. You can also completely purge all application data by clearing your browser cache.

## 4. Contact

For questions or concerns regarding this privacy policy, open an issue on the official [GitHub repository](https://github.com/jbuilds-g/0FluffStart/issues)

---

> **Policy Version:** 1.1.0
