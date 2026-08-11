import { store } from "./store.js";
import { sanitizeUrl } from "./utils.js";
import { saveBgToDB, getBgFromDB, clearBgFromDB } from "./storage.js";
import { MaterialYouEngine } from "./material-you-engine.js";
import { cancelEdit, renderLinkManager } from "./links.js";

const materialYouEngine = new MaterialYouEngine();

const GENERIC_SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

export const searchEngines = [
  {
    name: "Google",
    url: "https://www.google.com/search?q=",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z"/></svg>`,
  },
  {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q=",
    icon: `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>DuckDuckGo</title><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 .984C18.083.984 23.016 5.916 23.016 12S18.084 23.016 12 23.016.984 18.084.984 12C.984 5.917 5.916.984 12 .984zm0 .938C6.434 1.922 1.922 6.434 1.922 12c0 4.437 2.867 8.205 6.85 9.55-.237-.82-.776-2.753-1.6-6.052-1.184-4.741-2.064-8.606 2.379-9.813.047-.011.064-.064.03-.093-.514-.467-1.382-.548-2.233-.38a.06.06 0 0 1-.07-.058c0-.011 0-.023.011-.035.205-.286.572-.507.822-.64a1.843 1.843 0 0 0-.607-.335c-.059-.022-.059-.12-.006-.144.006-.006.012-.012.024-.012 1.749-.233 3.586.292 4.49 1.448.011.011.023.017.035.023 2.968.635 3.509 4.837 3.328 5.998a9.607 9.607 0 0 0 2.346-.576c.746-.286 1.008-.222 1.101-.053.1.193-.018.513-.28.81-.496.567-1.393 1.01-2.974 1.137-.546.044-1.029.024-1.445.006-.789-.035-1.339-.059-1.633.39-.192.298-.041.998 1.487 1.22 1.09.157 2.078.047 2.798-.034.643-.07 1.073-.118 1.172.069.21.402-.996 1.207-3.066 1.224-.158 0-.315-.006-.467-.011-1.283-.065-2.227-.414-2.816-.735a.094.094 0 0 1-.035-.017c-.105-.059-.31.045-.188.267.07.134.444.478 1.004.776-.058.466.087 1.184.338 2l.088-.016c.041-.009.087-.019.134-.025.507-.082.775.012.926.175.717-.536 1.913-1.294 2.03-1.154.583.694.66 2.332.53 2.99-.004.012-.017.024-.04.035-.274.117-1.783-.296-1.783-.511-.059-1.075-.26-1.173-.493-1.225h-.156c.006.006.012.018.018.03l.052.12c.093.257.24 1.063.13 1.26-.112.199-.835.297-1.284.303-.443.006-.543-.158-.637-.408-.07-.204-.103-.675-.103-.95a.857.857 0 0 1 .012-.216c-.134.058-.333.193-.397.281-.017.262-.017.682.123 1.149.07.221-1.518 1.164-1.74.99-.227-.181-.634-1.952-.459-2.67-.187.017-.338.075-.42.191-.367.508.093 2.933.582 3.248.257.169 1.54-.553 2.176-1.095.105.145.305.158.553.158.326-.012.782-.06 1.103-.158.192.45.423.972.613 1.388 4.47-1.032 7.803-5.037 7.803-9.82 0-5.566-4.512-10.078-10.078-10.078zm1.791 5.646c-.42 0-.678.146-.795.332-.023.047.047.094.094.07.14-.075.357-.161.701-.156.328.006.516.09.67.159l.023.01c.041.017.088-.03.059-.065-.134-.18-.332-.35-.752-.35zm-5.078.198a1.24 1.24 0 0 0-.522.082c-.454.169-.67.526-.67.76 0 .051.112.057.141.011.081-.123.21-.31.617-.478.408-.17.73-.146.951-.094.047.012.083-.041.041-.07a.989.989 0 0 0-.558-.211zm5.434 1.423a.651.651 0 0 0-.655.647.652.652 0 0 0 1.307 0 .646.646 0 0 0-.652-.647zm.283.262h.008a.17.17 0 0 1 .17.17c0 .093-.077.17-.17.17a.17.17 0 0 1-.17-.17c0-.09.072-.165.162-.17zm-5.358.076a.752.752 0 0 0-.758.758c0 .42.338.758.758.758s.758-.337.758-.758a.756.756 0 0 0-.758-.758zm.328.303h.01c.112 0 .2.089.2.2 0 .11-.088.197-.2.197a.195.195 0 0 1-.197-.198c0-.107.082-.194.187-.199z"/></svg>`,
  },
  {
    name: "Bing",
    url: "https://www.bing.com/search?q=",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.35 5.046a.615.615 0 0 0-.54.575c-.009.13-.006.14.289.899.67 1.727.833 2.142.86 2.2q.101.215.277.395c.089.092.148.141.247.208.176.117.262.15.944.351.664.197 1.026.327 1.338.482.405.201.688.43.866.7.128.195.242.544.291.896.02.137.02.44 0 .564-.041.27-.124.495-.252.684-.067.1-.044.084.055-.039.278-.346.562-.938.707-1.475a4.42 4.42 0 0 0-2.14-5.028 70 70 0 0 0-.888-.465l-.53-.277-.353-.184c-.16-.082-.266-.138-.345-.18-.368-.192-.523-.27-.568-.283a1 1 0 0 0-.194-.03z"/><path d="M9.152 11.493a3 3 0 0 0-.135.083 320 320 0 0 0-1.513.934l-.8.496c-.012.01-.587.367-.876.543a1.9 1.9 0 0 1-.732.257c-.12.017-.349.017-.47 0a1.9 1.9 0 0 1-.884-.358 2.5 2.5 0 0 1-.365-.364 1.9 1.9 0 0 1-.34-.76 1 1 0 0 0-.027-.121c-.005-.006.004.092.022.22.018.132.057.324.098.489a4.1 4.1 0 0 0 2.487 2.796c.359.142.72.23 1.114.275.147.016.566.023.72.011a4.1 4.1 0 0 0 1.956-.661l.235-.149.394-.248.258-.163 1.164-.736c.51-.32.663-.433.9-.665.099-.097.248-.262.255-.283.002-.005.028-.046.059-.091a1.64 1.64 0 0 0 .25-.682c.02-.124.02-.427 0-.565a3 3 0 0 0-.213-.758c-.15-.314-.47-.6-.928-.83a2 2 0 0 0-.273-.12c-.006 0-.433.26-.948.58l-1.113.687z"/><path d="m3.004 12.184.03.129c.089.402.245.693.515.963a1.82 1.82 0 0 0 1.312.543c.361 0 .673-.09.994-.287l.472-.29.373-.23V5.334c0-1.537-.003-2.45-.008-2.521a1.82 1.82 0 0 0-.535-1.177c-.097-.096-.18-.16-.427-.33L4.183.24c-.239-.163-.258-.175-.33-.2a.63.63 0 0 0-.842.464c-.009.042-.01.603-.01 3.646l.003 8.035Z"/></svg>`,
  },
  {
    name: "Brave",
    url: "https://search.brave.com/search?q=",
    icon: `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>Brave</title><path d="M15.68 0l2.096 2.38s1.84-.512 2.709.358c.868.87 1.584 1.638 1.584 1.638l-.562 1.381.715 2.047s-2.104 7.98-2.35 8.955c-.486 1.919-.818 2.66-2.198 3.633-1.38.972-3.884 2.66-4.293 2.916-.409.256-.92.692-1.38.692-.46 0-.97-.436-1.38-.692a185.796 185.796 0 01-4.293-2.916c-1.38-.973-1.712-1.714-2.197-3.633-.247-.975-2.351-8.955-2.351-8.955l.715-2.047-.562-1.381s.716-.768 1.585-1.638c.868-.87 2.708-.358 2.708-.358L8.321 0h7.36zm-3.679 14.936c-.14 0-1.038.317-1.758.69-.72.373-1.242.637-1.409.742-.167.104-.065.301.087.409.152.107 2.194 1.69 2.393 1.866.198.175.489.464.687.464.198 0 .49-.29.688-.464.198-.175 2.24-1.759 2.392-1.866.152-.108.254-.305.087-.41-.167-.104-.689-.368-1.41-.741-.72-.373-1.617-.69-1.757-.69zm0-11.278s-.409.001-1.022.206-1.278.46-1.584.46c-.307 0-2.581-.434-2.581-.434S4.119 7.152 4.119 7.849c0 .697.339.881.68 1.243l2.02 2.149c.192.203.59.511.356 1.066-.235.555-.58 1.26-.196 1.977.384.716 1.042 1.194 1.464 1.115.421-.08 1.412-.598 1.776-.834.364-.237 1.518-1.19 1.518-1.554 0-.365-1.193-1.02-1.413-1.168-.22-.15-1.226-.725-1.247-.95-.02-.227-.012-.293.284-.851.297-.559.831-1.304.742-1.8-.089-.495-.95-.753-1.565-.986-.615-.232-1.799-.671-1.947-.74-.148-.068-.11-.133.339-.175.448-.043 1.719-.212 2.292-.052.573.16 1.552.403 1.632.532.079.13.149.134.067.579-.081.445-.5 2.581-.541 2.96-.04.38-.12.63.288.724.409.094 1.097.256 1.333.256s.924-.162 1.333-.256c.408-.093.329-.344.288-.723-.04-.38-.46-2.516-.541-2.961-.082-.445-.012-.45.067-.579.08-.129 1.059-.372 1.632-.532.573-.16 1.845.009 2.292.052.449.042.487.107.339.175-.148.069-1.332.508-1.947.74-.615.233-1.476.49-1.565.986-.09.496.445 1.241.742 1.8.297.558.304.624.284.85-.02.226-1.026.802-1.247.95-.22.15-1.413.804-1.413 1.169 0 .364 1.154 1.317 1.518 1.554.364.236 1.355.755 1.776.834.422.079 1.08-.4 1.464-1.115.384-.716.039-1.422-.195-1.977-.235-.555.163-.863.355-1.066l2.02-2.149c.341-.362.68-.546.68-1.243 0-.697-2.695-3.96-2.695-3.96s-2.274.436-2.58.436c-.307 0-.972-.256-1.585-.461-.613-.205-1.022-.206-1.022-.206z"/></svg>`,
  },
  {
    name: "Startpage",
    url: "https://www.startpage.com/sp/search?query=",
    icon: `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>Startpage</title><path d="m16.885 14.254.04-.06a8.723 8.723 0 0 0 1.851-4.309c-1.334 0-2.648 0-3.982.04a4.901 4.901 0 0 1-4.758 3.696 4.948 4.948 0 0 1-4.56-3.044 89.632 89.632 0 0 0-3.941.514c1.035 3.697 4.46 6.405 8.501 6.405a8.76 8.76 0 0 0 3.743-.83l.06-.02.04.04 5.455 6.603c.378.454.916.711 1.513.711.458 0 .896-.158 1.234-.435.399-.336.657-.79.697-1.304.04-.514-.1-1.009-.438-1.424zM5.118 8.56c.1-2.59 2.27-4.685 4.918-4.685a4.911 4.911 0 0 1 4.898 4.389c1.314.02 2.608.04 3.922.099C18.616 3.717 14.754 0 10.036 0c-4.858 0-8.82 3.934-8.82 8.758v.178a86.7 86.7 0 0 1 3.902-.376z"/></svg>`,
  },
  {
    name: "Ecosia",
    url: "https://www.ecosia.org/search?q=",
    icon: `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>Ecosia</title><path d="M15.198 6.818H8.786v10.48h6.412v-3.342h-3.98v-1.262H13.8V11.42h-2.584v-1.261h3.981zM11.972.06A12.003 12.003 0 0 0 0 12.064a12.003 12.003 0 0 0 10.083 11.848c.068-1.277.196-2.723.434-3.652v-.014c0-.005 0-.007-.01-.012 0-.005-.01-.007-.012-.009 0-.002-.01-.002-.014-.002h-.356c-2.307 0-5.943-.333-6.916-3.45-1.458-4.642 2.025-6.314 3.484-4.97 0 .004.012.008.019.008.01 0 .014 0 .02-.005.01-.005.013-.009.015-.016v-.021c-.322-.945-2.148-6.867 2.64-8.496 4.08-1.369 8.07 1.491 7.461 5.265v.017c0 .007.01.012.012.014 0 .002.012.005.016.005 0 0 .012-.002.016-.005.298-.246 1.603-1.186 2.919-.148 1.247.982.844 3.73-1.627 5.003-.01.002-.014.007-.02.014v.023c0 .01.01.014.015.02.01.004.016.004.023.001 1.596-.239 4.316 1.193 2.11 4.375-1.447 2.1-4.71 2.365-6.168 2.365h-1.071s-.01 0-.012.002c0 .002-.01.005-.012.007 0 .002 0 .005-.01.009v.012c-.021.751.331 2.304.693 3.688A12.003 12.003 0 0 0 24 12.063 12.003 12.003 0 0 0 11.997.06a12.003 12.003 0 0 0-.03 0z"/></svg>`,
  },
  {
    name: "Kagi",
    url: "https://kagi.com/search?q=",
    icon: `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>Kagi</title><path d="M14.4829 18.392h-5.109c-1.3827 0-1.6231-1.5076-1.3827-2.1106.1203-.3015.4208-.7236.6612-1.0251.9618.5427 2.1039.8442 3.306.8442 3.847 0 6.9126-3.1357 6.9126-6.9347 0-2.0502-.9016-3.8593-2.2843-5.186l.1805-.1808c.3605-.3618.9016-.603 1.4426-.5427l.8414.0603V0h-1.4425c-1.683 0-3.0656 1.0251-3.6667 2.4724-.6011-.181-1.2622-.3016-1.9234-.3016-3.847 0-6.9126 3.1357-6.9126 6.9347 0 1.5076.481 2.9548 1.3225 4.1005-.1203.1206-.3005.2412-.4208.3015l-.1803.181c-1.3826 1.3266-2.0436 3.015-1.6832 4.9448.1805 1.025 1.0821 2.1105 1.9838 2.7134.601.4222 1.3824.6031 2.1637.6031l5.7706-.2413c.6612 0 1.2623.3015 1.6228.9046L16.4065 24l3.5464-1.206-.6011-1.3268c-.9016-1.8692-2.765-3.0752-4.869-3.0752M12.0186 5.8493c1.8033 0 3.306 1.5075 3.306 3.3165s-1.5027 3.3166-3.306 3.3166-3.306-1.5075-3.306-3.3166c0-1.8693 1.4426-3.3166 3.306-3.3166"/></svg>`,
  },
  {
    name: "SearXNG",
    url: "https://searx.be/search?q=",
    icon: `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>SearXNG</title><path d="m13.716 17.261 6.873 6.582L24 20.282l-6.824-6.536a9.11 9.11 0 0 0 1.143-4.43c0-5.055-4.105-9.159-9.16-9.159S0 4.261 0 9.316c0 5.055 4.104 9.159 9.159 9.159a9.11 9.11 0 0 0 4.557-1.214ZM9.159 2.773a6.546 6.546 0 0 1 6.543 6.543 6.545 6.545 0 0 1-6.543 6.542 6.545 6.545 0 0 1-6.542-6.542 6.545 6.545 0 0 1 6.542-6.543ZM7.26 5.713a4.065 4.065 0 0 1 4.744.747 4.064 4.064 0 0 1 .707 4.749l1.157.611a5.376 5.376 0 0 0-.935-6.282 5.377 5.377 0 0 0-6.274-.987l.601 1.162Z"/></svg>`,
  },
  {
    name: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Special:Search?search=",
    icon: `<svg viewBox="-4.5 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>Wikipedia</title><path d="M22.040 7.6h-3c-0.48 0-0.84 0.36-0.84 0.84s0.36 0.84 0.84 0.84h0.48l-4.76 12.080-2.4-6.080 2.36-6h0.72c0.48 0 0.84-0.36 0.84-0.84s-0.36-0.84-0.84-0.84h-3.040c-0.48 0-0.84 0.36-0.84 0.84s0.36 0.84 0.84 0.84h0.48l-1.48 3.72-1.4-3.72h0.48c0.48 0 0.84-0.36 0.84-0.84s-0.36-0.84-0.84-0.84h-3.040c-0.48 0-0.84 0.36-0.84 0.84s0.36 0.84 0.84 0.84h0.72l2.36 6-2.4 6.080-4.76-12.080h0.48c0.48 0 0.84-0.36 0.84-0.84s-0.36-0.84-0.84-0.84h-3c-0.48 0-0.84 0.36-0.84 0.84s0.36 0.84 0.84 0.84h0.72l5.8 14.68c0.32 0.6 1.2 0.6 1.52 0v0l2.52-6.4 2.52 6.4c0.32 0.6 1.2 0.6 1.52 0v0l5.8-14.68h0.72c0.48 0 0.84-0.36 0.84-0.84 0.080-0.48-0.28-0.84-0.76-0.84z"></path></svg>`,
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/results?search_query=",
    icon: `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>YouTube</title><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  },
];

export function getAvailableEngines() {
  const settings = store.getState().settings || {};
  const enabledNames =
    settings.enabledEngines || searchEngines.map((e) => e.name);
  const custom = settings.customEngines || [];

  const activeBuiltIn = searchEngines.filter((e) =>
    enabledNames.includes(e.name),
  );
  const activeCustom = custom.map((c) => ({
    name: c.name,
    url: c.url,
    icon: GENERIC_SEARCH_ICON,
    isCustom: true,
    id: c.id,
  }));

  const combined = [...activeBuiltIn, ...activeCustom];
  return combined.length > 0 ? combined : [searchEngines[0]];
}

let cachedHour = null;
let cachedUserName = null;
let clockEl = null;
let greetingEl = null;
let cachedTimeString = null;

export function initCustomSelects() {
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".select-trigger");
    const selectContainer = e.target.closest(".custom-select");

    document.querySelectorAll(".custom-select").forEach((cs) => {
      if (cs !== selectContainer) {
        cs.classList.remove("open");
        cs.querySelector(".select-dropdown")?.classList.add("hidden");
      }
    });

    if (trigger && selectContainer) {
      const dropdown = selectContainer.querySelector(".select-dropdown");
      const isOpening = dropdown?.classList.contains("hidden");
      selectContainer.classList.toggle("open", isOpening);
      dropdown?.classList.toggle("hidden");
      return;
    }

    const option = e.target.closest(".select-option");
    if (option && selectContainer) {
      const value = option.dataset.value;
      const label = option.textContent.trim();
      const labelEl = selectContainer.querySelector(".selected-text");
      const dropdown = selectContainer.querySelector(".select-dropdown");

      if (labelEl) labelEl.textContent = label;
      selectContainer.dataset.value = value;

      selectContainer.querySelectorAll(".select-option").forEach((opt) => {
        opt.classList.toggle("selected", opt === option);
      });

      selectContainer.classList.remove("open");
      dropdown?.classList.add("hidden");
      selectContainer.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

export function setCustomSelectValue(selectId, value) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const option = selectEl.querySelector(
    `.select-option[data-value="${value}"]`,
  );
  if (option) {
    selectEl
      .querySelectorAll(".select-option")
      .forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");
    const labelEl = selectEl.querySelector(".selected-text");
    if (labelEl) labelEl.textContent = option.textContent.trim();
    selectEl.dataset.value = value;
  }
}

export function getCustomSelectValue(selectId) {
  const selectEl = document.getElementById(selectId);
  return selectEl ? selectEl.dataset.value || "" : "";
}

export function getGreeting(userName, hour) {
  let greeting = "Hello";
  if (hour < 5) greeting = "Good Night";
  else if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";
  else if (hour < 22) greeting = "Good Evening";
  else greeting = "Good Night";
  const name = userName ? `, ${userName}` : "";
  return `${greeting}${name}.`;
}

export function updateClock() {
  const settings = store.getState().settings || {};

  if (!clockEl || !document.body.contains(clockEl)) {
    clockEl = document.getElementById("clockDisplay");
  }
  if (!greetingEl || !document.body.contains(greetingEl)) {
    greetingEl = document.getElementById("greetingDisplay");
  }
  if (!clockEl || !greetingEl) return;

  const now = new Date();
  const currentHour = now.getHours();
  let h = currentHour;
  let m = String(now.getMinutes()).padStart(2, "0");
  let s = String(now.getSeconds()).padStart(2, "0");
  let suffix = "";

  if (settings.clockFormat === "12h") {
    suffix = h >= 12 ? " PM" : " AM";
    h = h % 12 || 12;
    if (h < 10) h = String(h).replace(/^0+/, "");
  } else {
    h = String(h).padStart(2, "0");
  }

  const showSeconds = settings.showSeconds !== false;
  const timeString = `${showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`}${suffix}`;

  if (cachedTimeString !== timeString) {
    clockEl.textContent = timeString;
    cachedTimeString = timeString;
  }

  if (cachedHour !== currentHour || cachedUserName !== settings.userName) {
    greetingEl.textContent = getGreeting(settings.userName, currentHour);
    cachedHour = currentHour;
    cachedUserName = settings.userName;
  }
}

export function applyClockStyle() {
  const settings = store.getState().settings || {};
  const clock = document.getElementById("clockDisplay");
  if (clock) {
    clock.className = "clock";
    clock.classList.add(`clock-style-${settings.clockStyle || "default"}`);
  }
}

export function renderEngineDropdown() {
  const settings = store.getState().settings || {};
  const dropdown = document.getElementById("engineDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";

  const available = getAvailableEngines();
  let current = available.find((s) => s.name === settings.searchEngine);

  if (!current) {
    current = available[0];
    if (settings.searchEngine !== current.name) {
      autoSaveSettings({ searchEngine: current.name });
    }
  }

  const iconEl = document.getElementById("currentEngineIcon");
  if (iconEl) iconEl.innerHTML = current.icon;

  available.forEach((e) => {
    const div = document.createElement("div");
    div.className = `engine-option ${e.name === settings.searchEngine ? "selected" : ""}`;
    div.innerHTML = `<span class="engine-icon">${e.icon}</span> <span>${e.name}</span>`;

    div.addEventListener("click", () => {
      autoSaveSettings({ searchEngine: e.name });
      renderEngineDropdown();
      toggleEngineDropdown();
    });
    dropdown.appendChild(div);
  });
}

export function toggleEngineDropdown() {
  document.getElementById("engineDropdown")?.classList.toggle("hidden");
}

export function handleSearch(e) {
  if (e.key === "Enter" || e.type === "click") {
    const val = document.getElementById("searchInput")?.value.trim();
    if (!val) return;

    const state = store.getState();
    const history = state.searchHistory || [];
    if (state.settings?.historyEnabled !== false) {
      const updatedHistory = [
        val,
        ...history.filter((item) => item !== val),
      ].slice(0, 50);
      store.setState({ searchHistory: updatedHistory });
    }

    const available = getAvailableEngines();
    const engine =
      available.find((s) => s.name === state.settings?.searchEngine) ||
      available[0];
    if (val.includes(".") && !val.includes(" ")) {
      const safeUrl = sanitizeUrl(val);
      if (safeUrl !== "#") window.location.href = safeUrl;
    } else {
      window.location.href = `${engine.url}${encodeURIComponent(val)}`;
    }
  }
}

export function selectSuggestion(suggestion) {
  const inputEl = document.getElementById("searchInput");
  if (inputEl) inputEl.value = suggestion.name;

  if (suggestion.type === "Link") {
    const safeUrl = sanitizeUrl(suggestion.url);
    if (safeUrl !== "#") window.location.href = safeUrl;
  } else {
    document.getElementById("suggestionsContainer")?.classList.add("hidden");
    handleSearch({ key: "Enter", type: "synthetic" });
  }
}

export async function checkMaterialYouReload() {
  const settings = store.getState().settings || {};
  if (
    settings.theme === "material-you" &&
    settings.backgroundImage === "indexeddb"
  ) {
    const confirmed = await customConfirm(
      "A quick page reload is required for Material You color extraction to take full effect.",
      "Reload Required?",
    );
    if (confirmed) {
      window.location.reload();
    }
  }
}

/**
 * Declarative specification mapping setting keys to DOM element attributes and control types.
 */
const SETTINGS_MAP = [
  {
    key: "theme",
    id: "themeSelect",
    type: "custom-select",
    defaultVal: "dark",
  },
  {
    key: "clockStyle",
    id: "clockStyleSelect",
    type: "custom-select",
    defaultVal: "default",
  },
  { key: "userName", id: "userNameInput", type: "input-text", defaultVal: "" },
  {
    key: "showSeconds",
    id: "showSecondsToggle",
    type: "checkbox",
    defaultVal: true,
  },
  {
    key: "clockFormat",
    name: "clockFormat",
    type: "radio-group",
    defaultVal: "24h",
  },
  {
    key: "externalSuggest",
    id: "externalSuggestToggle",
    type: "checkbox",
    defaultVal: false,
  },
  {
    key: "cacheSuggestions",
    id: "cacheSuggestToggle",
    type: "checkbox",
    defaultVal: true,
  },
  {
    key: "suggestProvider",
    id: "suggestProviderSelect",
    type: "custom-select",
    defaultVal: "auto",
  },
  {
    key: "enabledEngines",
    type: "custom-array",
    defaultVal: searchEngines.map((e) => e.name),
  },
  {
    key: "customEngines",
    type: "custom-array",
    defaultVal: [],
  },
  {
    key: "customProxyUrl",
    id: "customProxyInput",
    type: "input-text",
    defaultVal: "",
  },
  {
    key: "historyEnabled",
    id: "historyEnabledToggle",
    type: "checkbox",
    defaultVal: true,
  },
  {
    key: "showTitles",
    id: "showTitlesToggle",
    type: "checkbox",
    defaultVal: false,
  },
  {
    key: "forceDesktop",
    id: "forceDesktopToggle",
    type: "checkbox",
    defaultVal: false,
  },
];

export async function handleImageUpload(input) {
  const file = input.files[0];
  const fileNameEl = document.getElementById("bgFileName");
  const resetBtn = document.getElementById("resetBgBtn");

  if (
    file &&
    (file.type.startsWith("image/") || file.type.startsWith("video/"))
  ) {
    try {
      await saveBgToDB(file);
      autoSaveSettings({ backgroundImage: "indexeddb" });

      const objectUrl = materialYouEngine.createMediaObjectUrl(file);

      const bgVideo = document.getElementById("bgVideo");
      const bgImage = document.getElementById("bgImage");
      const bgOverlay = document.getElementById("bgOverlay");

      if (file.type.startsWith("video/")) {
        if (bgImage) {
          bgImage.style.backgroundImage = "";
          bgImage.classList.add("hidden");
          bgImage.classList.remove("active");
        }
        if (bgVideo) {
          bgVideo.src = objectUrl;
          bgVideo.classList.remove("hidden");
          bgVideo.classList.add("active");
          bgVideo
            .play()
            .catch((err) => console.warn("Playback prevented:", err));
        }
      } else {
        if (bgVideo) {
          bgVideo.src = "";
          bgVideo.classList.add("hidden");
          bgVideo.classList.remove("active");
        }
        if (bgImage) {
          bgImage.style.backgroundImage = `url('${objectUrl}')`;
          bgImage.classList.remove("hidden");
          bgImage.classList.add("active");
        }
      }

      if (fileNameEl) fileNameEl.innerText = file.name;
      if (resetBtn) resetBtn.classList.remove("hidden");
      if (bgOverlay) bgOverlay.classList.add("bg-overlay-active");
    } catch (e) {
      console.error("Failed to save media to DB", e);
      showToast("Failed to save background media. Database error.", "error");
    }
  } else {
    await clearBackground();
  }
}

export async function clearBackground() {
  autoSaveSettings({ backgroundImage: null });
  await clearBgFromDB();

  materialYouEngine.revokeActiveObjectUrl();

  const bgImage = document.getElementById("bgImage");
  if (bgImage) {
    bgImage.style.backgroundImage = "";
    bgImage.classList.add("hidden");
    bgImage.classList.remove("active");
  }

  const bgVideo = document.getElementById("bgVideo");
  if (bgVideo) {
    bgVideo.src = "";
    bgVideo.classList.add("hidden");
    bgVideo.classList.remove("active");
  }

  const inputEl = document.getElementById("bgImageInput");
  const nameEl = document.getElementById("bgFileName");
  const resetBtn = document.getElementById("resetBgBtn");
  const overlay = document.getElementById("bgOverlay");

  if (inputEl) inputEl.value = "";
  if (nameEl) nameEl.innerText = "No media selected.";
  if (resetBtn) resetBtn.classList.add("hidden");
  if (overlay) overlay.classList.remove("bg-overlay-active");
}

export function autoSaveSettings(updates = null) {
  const currentSettings = store.getState().settings || {};
  const newSettings = { ...currentSettings };

  if (updates && typeof updates === "object") {
    Object.assign(newSettings, updates);
  } else {
    SETTINGS_MAP.forEach((item) => {
      if (item.type === "custom-select") {
        const val = getCustomSelectValue(item.id);
        if (val) newSettings[item.key] = val;
      } else if (item.type === "input-text") {
        const el = document.getElementById(item.id);
        if (el) newSettings[item.key] = el.value.trim();
      } else if (item.type === "checkbox") {
        const el = document.getElementById(item.id);
        if (el) newSettings[item.key] = !!el.checked;
      } else if (item.type === "radio-group") {
        const radios = document.getElementsByName(item.name);
        for (let r of radios) {
          if (r.checked) newSettings[item.key] = r.value;
        }
      }
    });
  }

  store.setState({ settings: newSettings });

  document.body.className = newSettings.theme || "dark";
  document.body.classList.toggle(
    "force-desktop-mode",
    !!newSettings.forceDesktop,
  );
  document
    .getElementById("linkGrid")
    ?.classList.toggle("show-titles", !!newSettings.showTitles);

  applyClockStyle();
  updateClock();
  materialYouEngine.triggerMaterialYou(newSettings, getBgFromDB);
}

export async function loadSettings() {
  const settings = store.getState().settings || {};

  SETTINGS_MAP.forEach((item) => {
    const val =
      settings[item.key] !== undefined ? settings[item.key] : item.defaultVal;

    if (item.type === "custom-select") {
      setCustomSelectValue(item.id, val);
    } else if (item.type === "input-text") {
      const el = document.getElementById(item.id);
      if (el) el.value = val;
    } else if (item.type === "checkbox") {
      const el = document.getElementById(item.id);
      if (el) el.checked = !!val;
    } else if (item.type === "radio-group") {
      const radios = document.getElementsByName(item.name);
      for (let r of radios) {
        r.checked = r.value === val;
      }
    }
  });

  document.body.className = settings.theme || "dark";
  document.body.classList.toggle("force-desktop-mode", !!settings.forceDesktop);
  applyClockStyle();

  const overlay = document.getElementById("bgOverlay");
  const bgVideo = document.getElementById("bgVideo");

  if (settings.backgroundImage === "indexeddb") {
    try {
      const bgData = await getBgFromDB();
      if (bgData) {
        const url = materialYouEngine.createMediaObjectUrl(bgData);
        const bgImage = document.getElementById("bgImage");
        const isVideo =
          (bgData.type && bgData.type.startsWith("video/")) ||
          (typeof bgData === "string" &&
            bgData.match(/\.(mp4|webm|ogg)($|\?)/i));

        if (isVideo) {
          if (bgImage) {
            bgImage.style.backgroundImage = "";
            bgImage.classList.add("hidden");
            bgImage.classList.remove("active");
          }
          if (bgVideo) {
            bgVideo.src = url;
            bgVideo.classList.remove("hidden");
            bgVideo.classList.add("active");
            bgVideo
              .play()
              .catch((err) => console.warn("Playback prevented:", err));
          }
        } else {
          if (bgVideo) {
            bgVideo.src = "";
            bgVideo.classList.add("hidden");
            bgVideo.classList.remove("active");
          }
          if (bgImage) {
            bgImage.style.backgroundImage = `url('${url}')`;
            bgImage.classList.remove("hidden");
            bgImage.classList.add("active");
          }
        }

        if (overlay) overlay.classList.add("bg-overlay-active");
      }
    } catch (e) {
      console.error("Background load fail:", e);
    }
  } else {
    materialYouEngine.revokeActiveObjectUrl();
    const bgImage = document.getElementById("bgImage");
    if (bgImage) {
      bgImage.style.backgroundImage = "";
      bgImage.classList.add("hidden");
      bgImage.classList.remove("active");
    }
    if (bgVideo) {
      bgVideo.src = "";
      bgVideo.classList.add("hidden");
      bgVideo.classList.remove("active");
    }
    if (overlay) overlay.classList.remove("bg-overlay-active");
  }

  updateClock();
  renderEngineDropdown();
  renderEngineSelectionList();
  materialYouEngine.triggerMaterialYou(settings, getBgFromDB);
}

export function toggleSettings() {
  cancelEdit();
  renderLinkManager();
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const bgLabel = document.getElementById("bgFileName");
    const resetBtn = document.getElementById("resetBgBtn");
    const settings = store.getState().settings || {};

    if (bgLabel) {
      if (settings.backgroundImage === "indexeddb") {
        bgLabel.innerText = "Custom Media Active";
        bgLabel.style.color = "var(--dim accent)";
        bgLabel.style.marginTop = "10px";
        if (resetBtn) resetBtn.classList.remove("hidden");
      } else {
        bgLabel.innerText = "No media selected.";
        bgLabel.style.color = "var(--dim)";
        if (resetBtn) resetBtn.classList.add("hidden");
      }
    }
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("active");
    if (!document.querySelector(".modal.active")) {
      document.body.classList.remove("modal-open");
    }
  }
}

export function customConfirm(message, title = "Are you sure?") {
  return new Promise((resolve) => {
    const modal = document.getElementById("customDialogModal");
    const titleEl = document.getElementById("customDialogTitle");
    const messageEl = document.getElementById("customDialogMessage");
    const cancelBtn = document.getElementById("customDialogCancelBtn");
    const confirmBtn = document.getElementById("customDialogConfirmBtn");

    if (!modal || !titleEl || !messageEl || !cancelBtn || !confirmBtn) {
      return resolve(false);
    }

    titleEl.innerText = title;
    messageEl.innerText = message;
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const cleanup = () => {
      modal.classList.remove("active");
      if (!document.querySelector(".modal.active")) {
        document.body.classList.remove("modal-open");
      }
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
  });
}

export function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function renderEngineSelectionList() {
  const container = document.getElementById("engineSelectionList");
  if (!container) return;
  container.innerHTML = "";

  const settings = store.getState().settings || {};
  const enabledNames =
    settings.enabledEngines || searchEngines.map((e) => e.name);
  const custom = settings.customEngines || [];

  searchEngines.forEach((engine) => {
    const item = document.createElement("div");
    item.className = "engine-list-item";

    const left = document.createElement("div");
    left.className = "engine-item-left";

    const iconSpan = document.createElement("span");
    iconSpan.className = "engine-icon";
    iconSpan.innerHTML = engine.icon;

    const nameSpan = document.createElement("span");
    nameSpan.className = "engine-item-name";
    nameSpan.textContent = engine.name;

    left.appendChild(iconSpan);
    left.appendChild(nameSpan);

    const actions = document.createElement("div");
    actions.className = "engine-item-actions";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = enabledNames.includes(engine.name);

    checkbox.addEventListener("change", () => {
      const currentEnabled =
        store.getState().settings?.enabledEngines ||
        searchEngines.map((e) => e.name);
      let updated;
      if (checkbox.checked) {
        updated = [...new Set([...currentEnabled, engine.name])];
      } else {
        if (
          currentEnabled.length <= 1 &&
          (store.getState().settings?.customEngines || []).length === 0
        ) {
          checkbox.checked = true;
          return showToast(
            "At least one search engine must remain active.",
            "error",
          );
        }
        updated = currentEnabled.filter((n) => n !== engine.name);
      }
      autoSaveSettings({ enabledEngines: updated });
      renderEngineDropdown();
    });

    actions.appendChild(checkbox);
    item.appendChild(left);
    item.appendChild(actions);
    container.appendChild(item);
  });

  custom.forEach((eng) => {
    const item = document.createElement("div");
    item.className = "engine-list-item";

    const left = document.createElement("div");
    left.className = "engine-item-left";

    const iconSpan = document.createElement("span");
    iconSpan.className = "engine-icon";
    iconSpan.innerHTML = GENERIC_SEARCH_ICON;

    const nameSpan = document.createElement("span");
    nameSpan.className = "engine-item-name";
    nameSpan.textContent = eng.name;

    left.appendChild(iconSpan);
    left.appendChild(nameSpan);

    const actions = document.createElement("div");
    actions.className = "engine-item-actions";

    const delBtn = document.createElement("button");
    delBtn.className = "engine-delete-btn";
    delBtn.title = "Delete custom engine";
    delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    delBtn.addEventListener("click", () => {
      const updated = (store.getState().settings?.customEngines || []).filter(
        (c) => c.id !== eng.id,
      );
      autoSaveSettings({ customEngines: updated });
      renderEngineSelectionList();
      renderEngineDropdown();
      showToast("Custom engine deleted", "info");
    });

    actions.appendChild(delBtn);
    item.appendChild(left);
    item.appendChild(actions);
    container.appendChild(item);
  });
}
