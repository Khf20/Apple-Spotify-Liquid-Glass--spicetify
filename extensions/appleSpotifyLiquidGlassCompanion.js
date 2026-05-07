(function appleSpotifyLiquidGlassCompanion() {
  if (window.__APPLE_SPOTIFY_LIQUID_GLASS_COMPANION__) return;
  window.__APPLE_SPOTIFY_LIQUID_GLASS_COMPANION__ = true;

  const SETTINGS_KEY = "apple-spotify-liquid-glass:settings";
  const HERO_KEY = "apple-spotify-liquid-glass:hero";
  const root = document.documentElement;

  const defaults = {
    mode: "glass",
    blur: "normal",
    compact: false,
    dynamicAccent: true,
    homeHero: true,
    debug: false,
    accent: "#b9e7ff"
  };

  let menuItem = null;
  let observer = null;
  let lastAccentSource = "";
  let queued = false;

  function waitForSpicetify() {
    if (!window.Spicetify?.PopupModal || !window.Spicetify?.Player || !document.body) {
      setTimeout(waitForSpicetify, 300);
      return;
    }

    init();
  }

  function readSettings() {
    try {
      return Object.assign({}, defaults, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
    } catch {
      return Object.assign({}, defaults);
    }
  }

  function saveSettings(next) {
    const settings = Object.assign({}, readSettings(), next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applySettings(settings);
    return settings;
  }

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "").trim();
    if (!/^[a-f0-9]{6}$/i.test(normalized)) return [185, 231, 255];
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16)
    ];
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0")).join("")}`;
  }

  function applyAccent(hex) {
    const [r, g, b] = hexToRgb(hex);
    root.style.setProperty("--aslg-accent", hex);
    root.style.setProperty("--aslg-accent-rgb", `${r}, ${g}, ${b}`);
  }

  function applySettings(settings = readSettings()) {
    window.AppleSpotifyLiquidGlass?.setMode?.(settings.mode);
    window.AppleSpotifyLiquidGlass?.setBlur?.(settings.blur);
    window.AppleSpotifyLiquidGlass?.setCompact?.(settings.compact);

    root.classList.toggle("aslg-debug", Boolean(settings.debug));
    root.classList.toggle("aslg-home-hero-enabled", Boolean(settings.homeHero));
    applyAccent(settings.accent);
    syncHomeHero();
    syncDebug();
  }

  function getCurrentTrack() {
    const data = Spicetify.Player.data || {};
    const item = data.item || data.track || {};
    const metadata = item.metadata || {};
    const image = metadata.image_url || metadata.album_image_url || item.images?.[0]?.url || "";
    return {
      uri: item.uri || data.track?.uri || "",
      title: metadata.title || item.name || "Now Playing",
      artist: metadata.artist_name || metadata.album_artist_name || item.artists?.map((artist) => artist.name).join(", ") || "Spotify",
      album: metadata.album_title || metadata.context_description || "",
      image
    };
  }

  function getCurrentImageUrl() {
    return getCurrentTrack().image || document.querySelector(".main-nowPlayingWidget-coverArt img, .cover-art img")?.src || "";
  }

  function extractAccent(url) {
    const settings = readSettings();
    if (!settings.dynamicAccent || !url || url === lastAccentSource) return;

    lastAccentSource = url;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, size, size);
        const pixels = ctx.getImageData(0, 0, size, size).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let total = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3];
          if (alpha < 128) continue;
          const pr = pixels[i];
          const pg = pixels[i + 1];
          const pb = pixels[i + 2];
          const brightness = (pr + pg + pb) / 3;
          if (brightness < 26 || brightness > 238) continue;
          const saturation = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);
          const weight = 1 + saturation / 128;
          r += pr * weight;
          g += pg * weight;
          b += pb * weight;
          total += weight;
        }

        if (!total) return;
        const accent = rgbToHex(Math.round(r / total), Math.round(g / total), Math.round(b / total));
        saveSettings({ accent });
      } catch {
        applyAccent(settings.accent);
      }
    };
    image.onerror = () => applyAccent(settings.accent);
    image.src = url;
  }

  function createControl(label, control) {
    const row = document.createElement("label");
    row.className = "aslg-companion-row";

    const text = document.createElement("span");
    text.textContent = label;

    row.append(text, control);
    return row;
  }

  function createSelect(value, values, onChange) {
    const select = document.createElement("select");
    select.className = "aslg-companion-select";
    values.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      option.selected = item === value;
      select.append(option);
    });
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  function createToggle(checked, onChange) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(checked);
    input.className = "aslg-companion-toggle";
    input.addEventListener("change", () => onChange(input.checked));
    return input;
  }

  function createButton(label, onClick) {
    const button = document.createElement("button");
    button.className = "aslg-companion-button";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function openSettings() {
    const settings = readSettings();
    const container = document.createElement("div");
    container.className = "aslg-companion-modal";

    const style = document.createElement("style");
    style.textContent = `
      .aslg-companion-modal{display:grid;gap:14px;min-width:320px;color:#f8fbff}
      .aslg-companion-row{display:flex;align-items:center;justify-content:space-between;gap:16px}
      .aslg-companion-row span{font-weight:600}
      .aslg-companion-select,.aslg-companion-color{min-width:132px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.08);color:#f8fbff;padding:8px 10px}
      .aslg-companion-toggle{inline-size:42px;block-size:22px;accent-color:#b9e7ff}
      .aslg-companion-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
      .aslg-companion-button{border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.1);color:#f8fbff;padding:8px 12px;font-weight:700}
      .aslg-companion-note{color:#aeb8c4;font-size:12px;line-height:1.45}
    `;

    const color = document.createElement("input");
    color.type = "color";
    color.value = settings.accent;
    color.className = "aslg-companion-color";
    color.addEventListener("input", () => saveSettings({ accent: color.value, dynamicAccent: false }));

    const actions = document.createElement("div");
    actions.className = "aslg-companion-actions";
    actions.append(
      createButton("Refresh surfaces", () => {
        tagHardBlackSurfaces();
        window.AppleSpotifyLiquidGlass?.refresh?.();
        Spicetify.showNotification("Liquid Glass refreshed");
      }),
      createButton("Reset", () => {
        localStorage.removeItem(SETTINGS_KEY);
        applySettings(defaults);
        Spicetify.PopupModal.hide?.();
        Spicetify.showNotification("Liquid Glass settings reset");
      })
    );

    const note = document.createElement("p");
    note.className = "aslg-companion-note";
    note.textContent = "Dynamic accent follows the current cover art when possible. Disable it to keep your custom color.";

    container.append(
      style,
      createControl("Glass mode", createSelect(settings.mode, ["glass", "clear", "solid"], (mode) => saveSettings({ mode }))),
      createControl("Blur level", createSelect(settings.blur, ["low", "normal", "high"], (blur) => saveSettings({ blur }))),
      createControl("Compact mode", createToggle(settings.compact, (compact) => saveSettings({ compact }))),
      createControl("Dynamic album accent", createToggle(settings.dynamicAccent, (dynamicAccent) => saveSettings({ dynamicAccent }))),
      createControl("Custom Home Hero", createToggle(settings.homeHero, (homeHero) => saveSettings({ homeHero }))),
      createControl("Debug black surfaces", createToggle(settings.debug, (debug) => saveSettings({ debug }))),
      createControl("Accent color", color),
      actions,
      note
    );

    Spicetify.PopupModal.display({
      title: "Apple Spotify Liquid Glass",
      content: container,
      isLarge: false
    });
  }

  function registerMenu() {
    try {
      if (menuItem?.deregister) menuItem.deregister();
      if (!Spicetify.Menu?.Item) return;
      menuItem = new Spicetify.Menu.Item("Liquid Glass Settings", false, openSettings);
      menuItem.register();
    } catch {
      addFloatingButton();
    }
  }

  function addFloatingButton() {
    if (document.querySelector(".aslg-floating-settings")) return;
    const button = document.createElement("button");
    button.className = "aslg-floating-settings";
    button.type = "button";
    button.textContent = "LG";
    button.title = "Liquid Glass Settings";
    button.addEventListener("click", openSettings);
    document.body.append(button);
  }

  function syncHomeHero() {
    const settings = readSettings();
    let hero = document.querySelector(".aslg-home-hero");
    if (!settings.homeHero) {
      hero?.remove();
      return;
    }

    const home = document.querySelector('[data-testid="home-page"] .contentSpacing, .aslg-page-home .contentSpacing');
    if (!home) return;

    if (!hero) {
      hero = document.createElement("section");
      hero.className = "aslg-home-hero";
      hero.innerHTML = `
        <div class="aslg-home-hero-media"><img alt="" /></div>
        <div class="aslg-home-hero-copy">
          <p class="aslg-home-hero-kicker">Liquid Glass</p>
          <h1>Listen in glass.</h1>
          <p class="aslg-home-hero-meta"></p>
          <div class="aslg-home-hero-actions">
            <button type="button" data-aslg-play>Play</button>
            <button type="button" data-aslg-refresh>Refresh</button>
          </div>
        </div>
      `;
      hero.querySelector("[data-aslg-play]").addEventListener("click", () => Spicetify.Player.togglePlay());
      hero.querySelector("[data-aslg-refresh]").addEventListener("click", () => {
        lastAccentSource = "";
        updateHomeHero();
        Spicetify.showNotification("Hero refreshed");
      });
      home.prepend(hero);
    }

    updateHomeHero();
  }

  function updateHomeHero() {
    const hero = document.querySelector(".aslg-home-hero");
    if (!hero) return;
    const track = getCurrentTrack();
    const img = hero.querySelector("img");
    const title = hero.querySelector("h1");
    const meta = hero.querySelector(".aslg-home-hero-meta");

    if (track.image) img.src = track.image;
    title.textContent = track.title || "Listen in glass.";
    meta.textContent = [track.artist, track.album].filter(Boolean).join(" • ");
  }

  function tagHardBlackSurfaces() {
    document.querySelectorAll("[style]").forEach((node) => {
      const style = node.getAttribute("style") || "";
      if (/background(?:-color)?:\s*(?:rgb\(0,\s*0,\s*0\)|#000|black)/i.test(style)) {
        node.setAttribute("data-aslg-hard-black", "");
      }
    });

    document.querySelectorAll("aside, nav, section, [data-testid], [class*=Card], [class*=card]").forEach((node) => {
      const style = getComputedStyle(node);
      const bg = style.backgroundColor.replace(/\s/g, "");
      if (bg === "rgb(0,0,0)" || bg === "rgba(0,0,0,1)") {
        node.setAttribute("data-aslg-hard-black", "");
      }
    });
  }

  function syncDebug() {
    if (!readSettings().debug) {
      document.querySelectorAll("[data-aslg-debug]").forEach((node) => node.removeAttribute("data-aslg-debug"));
      return;
    }

    tagHardBlackSurfaces();
    document.querySelectorAll("[data-aslg-hard-black]").forEach((node) => node.setAttribute("data-aslg-debug", "black-surface"));
  }

  function injectCss() {
    if (document.querySelector("#aslg-companion-css")) return;
    const style = document.createElement("style");
    style.id = "aslg-companion-css";
    style.textContent = `
      .aslg-floating-settings{position:fixed;right:18px;bottom:118px;z-index:9999;width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(12,28,42,.72);color:#f8fbff;font-weight:800;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 14px 44px rgba(0,0,0,.36);backdrop-filter:blur(24px) saturate(155%)}
      .aslg-home-hero{display:grid;grid-template-columns:minmax(160px,240px) 1fr;gap:28px;align-items:center;margin:10px 0 28px;padding:24px;border:1px solid var(--aslg-border-soft);border-radius:var(--aslg-radius-xl);background:linear-gradient(135deg,rgba(var(--aslg-accent-rgb),.18),rgba(255,255,255,.055) 38%,rgba(2,7,12,.32));box-shadow:var(--aslg-inner-light),var(--aslg-shadow);backdrop-filter:var(--aslg-blur-strong);-webkit-backdrop-filter:var(--aslg-blur-strong);overflow:hidden}
      .aslg-home-hero-media img{display:block;width:100%;aspect-ratio:1;border-radius:var(--aslg-radius-lg);object-fit:cover;box-shadow:0 18px 54px rgba(0,0,0,.36)}
      .aslg-home-hero-copy{min-width:0}.aslg-home-hero-kicker{margin:0 0 6px;color:var(--aslg-accent);font-weight:800;text-transform:uppercase;font-size:12px;letter-spacing:.08em}.aslg-home-hero h1{margin:0;font-size:clamp(32px,5vw,64px);line-height:1.02;color:var(--aslg-text);max-width:760px}.aslg-home-hero-meta{margin:12px 0 20px;color:var(--aslg-muted);font-size:15px}.aslg-home-hero-actions{display:flex;gap:10px}.aslg-home-hero-actions button{border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.12);color:var(--aslg-text);padding:10px 16px;font-weight:800}.aslg-home-hero-actions button:first-child{background:var(--aslg-accent);color:#06101a}
      .aslg-debug [data-aslg-debug]{outline:2px solid #ff4d6d!important;outline-offset:-2px!important}
      @media(max-width:820px){.aslg-home-hero{grid-template-columns:1fr}.aslg-home-hero-media{max-width:220px}.aslg-home-hero h1{font-size:34px}}
    `;
    document.head.append(style);
  }

  function updateDynamicAccent() {
    const image = getCurrentImageUrl();
    extractAccent(image);
    updateHomeHero();
  }

  function scheduleSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applySettings();
      updateDynamicAccent();
    });
  }

  function observeDom() {
    observer?.disconnect();
    observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-testid"]
    });
  }

  function init() {
    injectCss();
    applySettings();
    registerMenu();
    updateDynamicAccent();
    observeDom();
    Spicetify.Player.addEventListener?.("songchange", updateDynamicAccent);

    window.AppleSpotifyLiquidGlassCompanion = {
      openSettings,
      settings: readSettings,
      saveSettings,
      refresh: scheduleSync,
      debug: tagHardBlackSurfaces
    };
  }

  waitForSpicetify();
})();
