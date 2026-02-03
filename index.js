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
      webdriver: nav.webdriver || false,
      online: nav.onLine || false,
    };
  }

  async function collectTabDetails() {
    return {
      visibilityState: document.visibilityState,
      hidden: document.hidden,
      hasFocus: document.hasFocus(),
      title: document.title,
    };
  }

  async function collectUrlDetails() {
    const locationDetails = window.location;
    return {
      href: locationDetails.href,
      origin: locationDetails.origin,
      pathname: locationDetails.pathname,
    };
  }

  async function collectScreenDisplay() {
    const screenDetails = window.screen || {};
    return {
      width: screenDetails.width,
      height: screenDetails.height,
      pixelRatio: window.devicePixelRatio || 1,
      darkMode: matchMedia("(prefers-color-scheme: dark)").matches,
    };
  }

  async function collectTimeLocale() {
    const date = new Date();
    return {
      iso: date.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
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
