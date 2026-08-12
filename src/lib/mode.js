export function detectMode() {
  const params = new URLSearchParams(window.location.search);
  const desktop = Boolean(window.atmosphereDesktop);
  const widget =
    desktop || params.get("widget") === "1" || params.get("mode") === "widget";
  return { widget, desktop };
}

export function widgetAsset(name) {
  const base = import.meta.env.BASE_URL || "./";
  return new URL(name, new URL(base, window.location.href)).href;
}

export function openBrowserWidget() {
  const url = new URL(window.location.href);
  url.searchParams.set("widget", "1");
  const w = 380;
  const h = 700;
  const left = Math.max(12, window.screen.availWidth - w - 16);
  const top = 16;
  window.open(
    url.toString(),
    "atmosphere-widget",
    `popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`
  );
}
