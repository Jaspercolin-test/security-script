(function (global) {
  "use strict";

  const state = {
    data: null,
    collectedAt: null,
    interactionHistory: [],
    listeners: [],
  };

  const isBrowser = () =>
    typeof window !== "undefined" && typeof document !== "undefined";

  const collectedTime = () => Date.now();

  async function collectBasicEnvironment() {
    const nav = navigator || {};
    return {
      userAgent: nav.userAgent || null,
      platform: nav.platform || null,
      language: nav.language || null,
      languages: nav.languages || [],
      deviceMemory: nav.deviceMemory || null,
      hardwareConcurrency: nav.hardwareConcurrency || null,
      vendor: nav.vendor || null,
      appName: nav.appName || null,
      appVersion: nav.appVersion || null,
      maxTouchPoints: nav.maxTouchPoints || 0,
      onlineStatus: nav.onLine || false,
      cookieEnabled: nav.cookieEnabled || false,
      doNotTrack: nav.doNotTrack || null,
      pdfViewerStatus: nav.pdfViewerEnabled || false,
      webDriver: nav.webdriver || false,
      connection: nav.connection || {},
      mimeTypes: nav.mimeTypes || {},
      plugins: nav.plugins || {},
      product: nav.product || null,
      productSub: nav.productSub || null,
      userActivation: nav.userActivation || {},
      userAgentData: nav.userAgentData || {},
      virtualKeyboard: nav.virtualKeyboard || {},
    };
  }

  async function collectTabDetails() {
    return {
      state: {
        visibilityState: document.visibilityState,
        hidden: document.hidden,
        hasFocus: document.hasFocus(),
        readyState: document.readyState,
      },
      lifecycle: {
        wasDiscarded: document.wasDiscarded || false,
        prerendering: document.prerendering || false,
      },
      ui: {
        fullscreen: !!document.fullscreenElement,
        pointerLocked: !!document.pointerLockElement,
      },
      identity: {
        title: document.title,
      },
    };
  }

  async function collectUrlDetails() {
    const locationDetails = window.location;
    var segments = locationDetails.pathname.split("/").filter(Boolean);
    return {
      raw: { href: locationDetails.href },
      origin: {
        protocol: locationDetails.protocol,
        origin: locationDetails.origin,
        host: locationDetails.host,
        hostname: locationDetails.hostname,
        port: locationDetails.port,
        isSecure: locationDetails.protocol === "https:",
      },
      path: {
        pathname: locationDetails.pathname,
        segments: segments,
        depth: segments.length,
        hasTrailingSlash: locationDetails.pathname.endsWith("/"),
      },
      query: {
        raw: locationDetails.search,
        params: Object.fromEntries(new URLSearchParams(locationDetails.search)),
      },
      hash: locationDetails.hash,
      auth: { passwordPresent: !!locationDetails.password },
      navigation: { referrer: document.referrer || null },
    };
  }

  async function collectScreenDisplay() {
    const screenDetails = window.screen || {};
    return {
      screen: {
        width: screenDetails.width,
        height: screenDetails.height,
        availWidth: screenDetails.availWidth,
        availHeight: screenDetails.availHeight,
        colorDepth: screenDetails.colorDepth,
        pixelDepth: screenDetails.pixelDepth,
      },
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
      },
      density: { devicePixelRatio: window.devicePixelRatio || 1 },
      orientation: safe(
        () => ({
          type: screen.orientation.type,
          angle: screen.orientation.angle,
        }),
        null,
      ),
      preferences: {
        darkMode: matchMedia("(prefers-color-scheme: dark)").matches,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        highContrast: matchMedia("(prefers-contrast: more)").matches,
      },
      color: {
        hdr: matchMedia("(dynamic-range: high)").matches,
        gamut: {
          srgb: matchMedia("(color-gamut: srgb)").matches,
          p3: matchMedia("(color-gamut: p3)").matches,
          rec2020: matchMedia("(color-gamut: rec2020)").matches,
        },
      },
    };
  }

async function collectTimeLocale() {
  const date = new Date();

  return {
    time: {
      nowISO: date.toISOString(),
      epochMs: date.getTime(),
      timezoneOffsetMinutes: date.getTimezoneOffset(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    },
    
    locale: {
      primary: navigator.language || null,
      calendar: Intl.DateTimeFormat().resolvedOptions().calendar || null,
      numberingSystem: Intl.NumberFormat().resolvedOptions().numberingSystem || null
    }
  };
}




  async function collectAll(trigger = "manual") {
    const data = {
      trigger,
      collectedAt: collectedTime(),
      basicEnvironment: await collectBasicEnvironment(),
      tabDetails: await collectTabDetails(),
      urlDetails: await collectUrlDetails(),
      screenDisplay: await collectScreenDisplay(),
      timeLocale: await collectTimeLocale(),
    };

    state.data = data;
    state.collectedAt = data.collectedAt;

    state.listeners.forEach((fn) => fn(data));

    console.log("triggered events: ", data);

    return data;
  }

  function recordInteraction(event) {
    state.interactionHistory.push({
      type: event.type,
      tag: event.target?.tagName || null,
      time: collectedTime(),
    });
  }

  function triggerCollection(trigger) {
    collectAll(trigger);
  }

  const updatedData = {
    getData: async () => collectAll("updatedData"),
    getLatest: () => state.data,
    onUpdate: (fn) => {
      state.listeners.push(fn);
      return () => {
        state.listeners = state.listeners.filter((l) => l !== fn);
      };
    },
    history: () => state.interactionHistory.slice(),
  };

  if (isBrowser()) {
    window.addEventListener("load", () => triggerCollection("load"));

    ["click", "input", "change"].forEach((event) =>
      document.addEventListener(
        event,
        (ev) => {
          recordInteraction(ev);
          triggerCollection(event);
        },
        true,
      ),
    );

    let scrollTimer;
    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => triggerCollection("scroll"), 200);
    });

    document.addEventListener("visibilitychange", () =>
      triggerCollection("visibilitychange"),
    );
  }

  global.ClientDataCollector = updatedData;
})(window);
