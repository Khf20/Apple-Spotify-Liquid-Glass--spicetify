(function appleSpotifyLiquidGlass() {
  if (window.__APPLE_SPOTIFY_LIQUID_GLASS__) return;
  window.__APPLE_SPOTIFY_LIQUID_GLASS__ = true;

  const CONFIG_KEY = "apple-spotify-liquid-glass:settings";
  const root = document.documentElement;

  const defaults = {
    mode: "glass",
    blur: "normal",
    compact: false
  };

  const surfaceSelectors = [
    ["rail", "#Desktop_LeftSidebar_Id"],
    ["rail", "#Desktop_RightSidebar_Id"],
    ["panel", "#Desktop_PanelContainer_Id"],
    ["panel", ".Root__nav-bar"],
    ["panel", ".Root__right-sidebar"],
    ["glass", ".main-card-card"],
    ["glass", ".main-card-cardContainer"],
    ["glass", ".main-heroCard-card"],
    ["glass", ".view-homeShortcutsGrid-shortcut"],
    ["glass", ".main-contextMenu-menu"],
    ["glass", ".GenericModal"],
    ["glass", ".main-confirmDialog-container"],
    ["glass", ".main-nowPlayingView-section"],
    ["glass", ".marketplace-card"],
    ["glass", ".betterLibrary-card"]
  ];

  const pageClasses = [
    "aslg-page-home",
    "aslg-page-search",
    "aslg-page-library",
    "aslg-page-playlist",
    "aslg-page-album",
    "aslg-page-artist",
    "aslg-page-lyrics",
    "aslg-page-queue",
    "aslg-page-marketplace",
    "aslg-page-app"
  ];

  const modeClasses = ["aslg-mode-glass", "aslg-mode-solid", "aslg-mode-clear"];
  const blurClasses = ["aslg-blur-low", "aslg-blur-normal", "aslg-blur-high"];

  let queued = false;
  let lastSync = 0;

  function readSettings() {
    try {
      return Object.assign({}, defaults, JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"));
    } catch {
      return Object.assign({}, defaults);
    }
  }

  function writeSettings(next) {
    const settings = Object.assign({}, readSettings(), next);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(settings));
    applySettings(settings);
    return settings;
  }

  function getPath() {
    const historyPath = window.Spicetify?.Platform?.History?.location?.pathname;
    return historyPath || window.location.pathname || "/";
  }

  function applySettings(settings = readSettings()) {
    const mode = ["glass", "solid", "clear"].includes(settings.mode) ? settings.mode : defaults.mode;
    const blur = ["low", "normal", "high"].includes(settings.blur) ? settings.blur : defaults.blur;

    root.classList.add("aslg-ready");
    root.classList.remove(...modeClasses, ...blurClasses, "aslg-compact");
    root.classList.add(`aslg-mode-${mode}`, `aslg-blur-${blur}`);

    if (settings.compact) root.classList.add("aslg-compact");
  }

  function applyPageClass() {
    const path = getPath().toLowerCase();
    root.classList.remove(...pageClasses);

    let page = "app";
    if (path === "/" || path.includes("/home")) page = "home";
    else if (path.includes("/search")) page = "search";
    else if (path.includes("/collection")) page = "library";
    else if (path.includes("/playlist")) page = "playlist";
    else if (path.includes("/album")) page = "album";
    else if (path.includes("/artist")) page = "artist";
    else if (path.includes("/lyrics")) page = "lyrics";
    else if (path.includes("/queue")) page = "queue";
    else if (path.includes("/marketplace")) page = "marketplace";

    root.classList.add(`aslg-page-${page}`);
  }

  function tagSurfaces() {
    for (const [kind, selector] of surfaceSelectors) {
      document.querySelectorAll(selector).forEach((node) => {
        node.setAttribute("data-aslg-surface", kind);
      });
    }

  }

  function sync() {
    queued = false;
    applySettings();
    applyPageClass();
    tagSurfaces();
  }

  function requestSync() {
    if (queued) return;
    const now = Date.now();
    if (now - lastSync < 750) return;
    lastSync = now;
    queued = true;
    window.setTimeout(() => requestAnimationFrame(sync), 120);
  }

  function observe() {
    const target = document.body || document.documentElement;
    const observer = new MutationObserver(requestSync);
    observer.observe(target, {
      childList: true,
      subtree: true
    });

    window.addEventListener("popstate", requestSync);
    window.addEventListener("hashchange", requestSync);
    setInterval(requestSync, 8000);
  }

  window.AppleSpotifyLiquidGlass = {
    refresh: requestSync,
    settings: readSettings,
    setMode: (mode) => writeSettings({ mode }),
    setBlur: (blur) => writeSettings({ blur }),
    setCompact: (compact) => writeSettings({ compact: Boolean(compact) })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      sync();
      observe();
    }, { once: true });
  } else {
    sync();
    observe();
  }
})();
