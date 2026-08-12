import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PLACE,
  fetchWeather,
  hourlyStartIndex,
  readStore,
  searchCities,
  themeClass,
  toF,
  toMph,
  wmo,
  writeStore,
} from "./lib/weather";
import { detectMode, openBrowserWidget, widgetAsset } from "./lib/mode";

function useUnit() {
  const [unit, setUnit] = useState(() => readStore("wx-unit", "c"));
  const set = (u) => {
    setUnit(u);
    writeStore("wx-unit", u);
  };
  return [unit, set];
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const textBtn =
  "inline-flex items-center justify-center min-h-9 px-3 rounded-full border border-stroke bg-glass text-ink text-[0.8rem] font-semibold no-underline whitespace-nowrap hover:bg-glass-hi";
const textBtnPrimary =
  "bg-[color-mix(in_srgb,var(--glow)_28%,transparent)] border-stroke-hi";
const iconBtn =
  "w-[46px] min-h-[46px] shrink-0 border border-stroke bg-glass backdrop-blur-[20px] rounded-2xl grid place-items-center transition-[0.2s] ease-atmosphere hover:bg-glass-hi disabled:opacity-50 disabled:cursor-wait";
const chromeBtn =
  "h-[26px] min-w-[26px] px-2 rounded-lg text-[0.7rem] font-semibold text-muted bg-glass border border-stroke hover:text-ink hover:bg-glass-hi";
const glassCard =
  "relative rounded-[var(--radius-card)] bg-glass border border-stroke backdrop-blur-[24px] backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.22)] overflow-hidden shrink-0 animate-rise card-sheen";

export default function App() {
  const [{ widget, desktop }] = useState(detectMode);
  const [unit, setUnit] = useUnit();
  const [place, setPlace] = useState(() => readStore("wx-place", DEFAULT_PLACE));
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState({
    msg: `Loading ${readStore("wx-place", DEFAULT_PLACE).name}…`,
    loading: true,
    error: false,
  });
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggest, setActiveSuggest] = useState(-1);
  const [geoBusy, setGeoBusy] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [snapOpen, setSnapOpen] = useState(false);
  const timer = useRef(null);
  const searchAbort = useRef(null);
  const searchRef = useRef(null);

  const fmt = useCallback((c) => Math.round(unit === "f" ? toF(c) : c), [unit]);
  const unitSym = unit === "f" ? "°F" : "°C";

  const loadPlace = useCallback(async (p) => {
    setPlace(p);
    writeStore("wx-place", p);
    setStatus({ msg: `Loading ${p.name}…`, loading: true, error: false });
    try {
      const data = await fetchWeather(p.latitude, p.longitude);
      setWeather(data);
      setStatus({ msg: "", loading: false, error: false });
    } catch (e) {
      setStatus({ msg: e.message || "Could not load weather", loading: false, error: true });
    }
  }, []);

  useEffect(() => {
    loadPlace(readStore("wx-place", DEFAULT_PLACE));
  }, [loadPlace]);

  useEffect(() => {
    const extra = widget ? " widget-mode" : " browser-mode";
    if (!weather?.current) {
      document.body.className = `theme-clouds${extra}`;
      return;
    }
    document.body.className =
      themeClass(weather.current.weather_code, weather.current.is_day === 1) + extra;
  }, [weather, widget]);

  useEffect(() => {
    if (!desktop || !window.atmosphereDesktop?.getState) return;
    window.atmosphereDesktop.getState().then((s) => {
      if (s && typeof s.pinned === "boolean") setPinned(s.pinned);
    });
  }, [desktop]);

  const hours = useMemo(() => {
    if (!weather?.hourly || !weather?.current) return [];
    const start = hourlyStartIndex(weather.hourly.time, weather.current.time);
    const list = [];
    for (let i = start; i < weather.hourly.time.length && list.length < 18; i++) {
      list.push({
        time: new Date(weather.hourly.time[i]),
        temp: weather.hourly.temperature_2m[i],
        code: weather.hourly.weather_code[i],
        pop: weather.hourly.precipitation_probability[i],
      });
    }
    return list;
  }, [weather]);

  const days = useMemo(() => {
    if (!weather?.daily) return [];
    return weather.daily.time.map((d, i) => ({
      date: new Date(`${d}T12:00:00`),
      code: weather.daily.weather_code[i],
      max: weather.daily.temperature_2m_max[i],
      min: weather.daily.temperature_2m_min[i],
      pop: weather.daily.precipitation_probability_max[i] ?? 0,
    }));
  }, [weather]);

  const daySpan = useMemo(() => {
    if (!days.length) return { min: 0, span: 1 };
    const min = Math.min(...days.map((d) => d.min));
    const max = Math.max(...days.map((d) => d.max));
    return { min, span: Math.max(max - min, 1) };
  }, [days]);

  const onQuery = (val) => {
    setQuery(val);
    setActiveSuggest(-1);
    clearTimeout(timer.current);
    searchAbort.current?.abort();
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      searchAbort.current = ctrl;
      try {
        setSuggestions(await searchCities(val.trim(), ctrl.signal));
      } catch (err) {
        if (err?.name !== "AbortError") setSuggestions([]);
      }
    }, 260);
  };

  const pickCity = (r) => {
    setSuggestions([]);
    setQuery(r.name);
    loadPlace({
      name: r.name,
      admin1: r.admin1 || "",
      country: r.country || "",
      latitude: r.latitude,
      longitude: r.longitude,
    });
  };

  const onSearchKey = async (e) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setActiveSuggest((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActiveSuggest((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggest >= 0 && suggestions[activeSuggest]) {
        pickCity(suggestions[activeSuggest]);
        return;
      }
      const q = query.trim();
      if (!q) return;
      setStatus({ msg: "Searching…", loading: true, error: false });
      try {
        const results = await searchCities(q);
        if (!results.length) {
          setStatus({ msg: "No cities found", loading: false, error: true });
          return;
        }
        pickCity(results[0]);
      } catch {
        setStatus({ msg: "Search failed", loading: false, error: true });
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setSnapOpen(false);
    }
  };

  const useGeo = () => {
    if (!navigator.geolocation) {
      setStatus({ msg: "Geolocation not supported", loading: false, error: true });
      return;
    }
    setGeoBusy(true);
    setStatus({ msg: "Finding you…", loading: true, error: false });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const p = {
            name: "My location",
            admin1: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
            country: "",
            latitude,
            longitude,
          };
          try {
            const r = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            if (r.ok) {
              const j = await r.json();
              p.name = j.city || j.locality || j.principalSubdivision || "My location";
              p.admin1 = j.principalSubdivision || "";
              p.country = j.countryName || "";
            }
          } catch {
            /* keep coords label */
          }
          await loadPlace(p);
        } catch {
          setStatus({ msg: "Could not load local weather", loading: false, error: true });
        } finally {
          setGeoBusy(false);
        }
      },
      (err) => {
        setGeoBusy(false);
        setStatus({ msg: err.message || "Location denied", loading: false, error: true });
      },
      { enableHighAccuracy: false, timeout: 12000 }
    );
  };

  useEffect(() => {
    const close = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSuggestions([]);
      }
      if (!e.target.closest?.("[data-snap-menu],[data-snap-trigger]")) setSnapOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const downloadWidget = () => {
    const a = document.createElement("a");
    a.href = widgetAsset("Atmosphere-Desktop-Widget.zip");
    a.download = "Atmosphere-Desktop-Widget.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const togglePin = async () => {
    const next = !pinned;
    setPinned(next);
    await window.atmosphereDesktop?.setPinned?.(next);
  };

  const snapTo = async (corner) => {
    setSnapOpen(false);
    await window.atmosphereDesktop?.snap?.(corner);
  };

  const cur = weather?.current;
  const meta = cur ? wmo(cur.weather_code) : null;
  const wind = cur
    ? unit === "f"
      ? `${Math.round(toMph(cur.wind_speed_10m))}`
      : `${Math.round(cur.wind_speed_10m)}`
    : "";
  const windUnit = unit === "f" ? " mph" : " km/h";

  return (
    <div
      className={cx(
        "relative min-h-dvh w-full flex flex-col",
        widget && "h-dvh h-svh overflow-hidden"
      )}
    >
      <div className="sky" aria-hidden="true" />
      <div
        className={cx(
          "relative z-[1] w-full max-w-[1040px] mx-auto flex flex-col min-h-dvh",
          widget ? "app-pad-widget w-full h-full min-h-0 gap-2" : "app-pad gap-3"
        )}
      >
        {widget && (
          <div className="flex items-center justify-between gap-2 shrink-0 -mt-0.5 mb-0.5">
            <div
              className="drag-region flex-1 min-w-0 h-7 flex items-center text-[0.72rem] tracking-[0.08em] uppercase text-muted select-none"
              aria-hidden="true"
            >
              Atmosphere
            </div>
            <div className="no-drag flex items-center gap-1">
              {desktop && (
                <>
                  <button
                    type="button"
                    className={cx(chromeBtn, pinned && "text-ink bg-glass-hi")}
                    title={pinned ? "Unpin from top" : "Keep on top"}
                    onClick={togglePin}
                  >
                    {pinned ? "Pinned" : "Pin"}
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      data-snap-trigger
                      className={chromeBtn}
                      title="Snap to corner"
                      onClick={() => setSnapOpen((v) => !v)}
                    >
                      Corner
                    </button>
                    {snapOpen && (
                      <div
                        data-snap-menu
                        className="absolute right-0 top-[calc(100%+4px)] z-40 min-w-[140px] p-1 rounded-xl bg-[rgba(10,14,26,0.94)] border border-stroke shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                        role="menu"
                      >
                        {[
                          ["tl", "Top left"],
                          ["tr", "Top right"],
                          ["bl", "Bottom left"],
                          ["br", "Bottom right"],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            className="block w-full text-left px-2.5 py-2 rounded-lg text-[0.78rem] text-ink hover:bg-white/[0.08]"
                            onClick={() => snapTo(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={chromeBtn}
                    title="Hide"
                    onClick={() => window.atmosphereDesktop.hide()}
                  >
                    –
                  </button>
                  <button
                    type="button"
                    className={cx(chromeBtn, "hover:text-white hover:bg-[rgba(220,70,70,0.45)]")}
                    title="Quit"
                    onClick={() => window.atmosphereDesktop.close()}
                  >
                    ×
                  </button>
                </>
              )}
              {!desktop && (
                <button type="button" className={chromeBtn} title="Download desktop widget" onClick={downloadWidget}>
                  Download
                </button>
              )}
            </div>
          </div>
        )}

        <header className="flex items-center justify-between shrink-0 gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="brand-mark" aria-hidden="true" />
            <h1 className="font-serif font-normal text-[1.35rem] tracking-[-0.02em] whitespace-nowrap">
              Atmosphere{" "}
              <em
                className={cx(
                  "italic opacity-70 text-[0.9em]",
                  widget && "[@media(max-height:600px)]:hidden"
                )}
              >
                weather
              </em>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!widget && (
              <>
                <button type="button" className={cx(textBtn, "max-[520px]:hidden")} onClick={openBrowserWidget}>
                  Corner window
                </button>
                <button
                  type="button"
                  className={cx(textBtn, textBtnPrimary, "max-[520px]:hidden")}
                  onClick={downloadWidget}
                >
                  Desktop widget
                </button>
              </>
            )}
            <div
              className="inline-flex p-[3px] rounded-full bg-glass border border-stroke backdrop-blur-[16px] backdrop-saturate-130 shrink-0"
              role="group"
              aria-label="Temperature unit"
            >
              <button
                type="button"
                className={cx(
                  "text-muted font-semibold text-[0.8rem] py-[7px] px-3 rounded-full transition-[0.2s] ease-atmosphere",
                  unit === "c" && "bg-white/[0.16] text-ink"
                )}
                onClick={() => setUnit("c")}
              >
                °C
              </button>
              <button
                type="button"
                className={cx(
                  "text-muted font-semibold text-[0.8rem] py-[7px] px-3 rounded-full transition-[0.2s] ease-atmosphere",
                  unit === "f" && "bg-white/[0.16] text-ink"
                )}
                onClick={() => setUnit("f")}
              >
                °F
              </button>
            </div>
          </div>
        </header>

        <div className="relative shrink-0" ref={searchRef}>
          <div className="flex gap-2">
            <div className="flex-1 relative min-w-0">
              <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-muted pointer-events-none grid place-items-center" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.2-3.2" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search any city…"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                onKeyDown={onSearchKey}
                autoComplete="off"
                enterKeyHint="search"
                spellCheck={false}
                className="w-full border border-stroke bg-glass backdrop-blur-[20px] backdrop-saturate-140 py-3 pr-3.5 pl-10 rounded-2xl outline-none text-[0.95rem] transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-stroke-hi focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--glow)_16%,transparent)]"
              />
            </div>
            <button
              type="button"
              className={iconBtn}
              onClick={useGeo}
              disabled={geoBusy}
              title="Use my location"
              aria-label="Use my location"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className={geoBusy ? "animate-spin-slow" : undefined}
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
              </svg>
            </button>
          </div>
          {suggestions.length > 0 && (
            <ul
              className="list-none absolute left-0 right-[54px] top-[calc(100%+6px)] z-30 bg-[rgba(10,14,26,0.92)] border border-stroke rounded-2xl overflow-hidden backdrop-blur-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.35)] max-h-[min(240px,35dvh)] overflow-y-auto"
              role="listbox"
            >
              {suggestions.map((r, i) => (
                <li
                  key={`${r.id ?? r.name}-${i}`}
                  role="option"
                  aria-selected={i === activeSuggest}
                  className={cx(
                    "px-3.5 py-[11px] cursor-pointer border-b border-faint last:border-b-0 hover:bg-white/[0.07]",
                    i === activeSuggest && "bg-white/[0.07]"
                  )}
                  onClick={() => pickCity(r)}
                >
                  <strong className="font-semibold text-[0.92rem]">{r.name}</strong>
                  <small className="block text-muted text-[0.75rem] mt-0.5">
                    {[r.admin1, r.country].filter(Boolean).join(", ")}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={cx(
            "shrink-0 min-h-[18px] -mt-0.5 mx-0.5 text-muted text-[0.8rem] flex items-center gap-[7px]",
            status.error && "text-danger"
          )}
        >
          {status.loading && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)] animate-pulse-dot" />
          )}
          {status.msg}
        </div>

        <div
          className={cx(
            "flex-1 min-h-0 flex flex-col gap-3",
            widget && "overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] scrollbar-thin-soft",
            !widget &&
              "min-[880px]:grid min-[880px]:grid-cols-[minmax(280px,1.05fr)_minmax(280px,0.95fr)] min-[880px]:grid-rows-[auto_1fr] min-[880px]:items-start"
          )}
        >
          {cur && meta && (
            <>
              <section
                className={cx(
                  glassCard,
                  "px-[22px] pt-[22px] pb-4",
                  widget && "[@media(max-height:700px)]:pt-3.5 [@media(max-height:700px)]:px-3.5 [@media(max-height:700px)]:pb-3",
                  !widget && "min-[880px]:col-start-1 min-[880px]:row-span-2 min-[880px]:min-h-full"
                )}
              >
                <div className="flex justify-between items-start gap-2.5">
                  <div>
                    <div className="font-serif text-[clamp(1.5rem,4vw,2.15rem)] font-normal tracking-[-0.02em] leading-[1.1]">
                      {place.name}
                    </div>
                    <div className="text-muted text-[0.8rem] mt-1">
                      {[place.admin1, place.country].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div
                    className="w-[52px] h-[52px] rounded-2xl shrink-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))] border border-stroke grid place-items-center text-[1.65rem] animate-float"
                    aria-hidden="true"
                  >
                    {meta.emoji}
                  </div>
                </div>
                <div className="my-2.5 mb-0.5">
                  <div
                    className={cx(
                      "temp-gradient font-light text-[clamp(3.4rem,10vw,5.2rem)] leading-[0.9] tracking-[-0.045em] tabular-nums",
                      widget && "[@media(max-height:700px)]:text-[clamp(3.1rem,12vw,3.8rem)]"
                    )}
                  >
                    {fmt(cur.temperature_2m)}
                    <sup>°</sup>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 mt-1.5">
                    <span className="text-base font-medium">{meta.label}</span>
                    <span
                      className={cx(
                        "text-muted text-[0.85rem]",
                        widget && "[@media(max-height:600px)]:hidden"
                      )}
                    >
                      Feels like {fmt(cur.apparent_temperature)}
                      {unitSym}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 min-[521px]:grid-cols-4 gap-1.5 mt-3.5 pt-3 border-t border-faint">
                  <div className="py-2 px-1.5 rounded-xl bg-black/14 text-center">
                    <div className="text-[0.85rem] mb-0.5 opacity-85">💧</div>
                    <div className="text-muted text-[0.62rem] uppercase tracking-[0.06em] font-medium">Humidity</div>
                    <div className="font-semibold text-[0.88rem] tabular-nums mt-px">{cur.relative_humidity_2m}%</div>
                  </div>
                  <div className="py-2 px-1.5 rounded-xl bg-black/14 text-center">
                    <div className="text-[0.85rem] mb-0.5 opacity-85">💨</div>
                    <div className="text-muted text-[0.62rem] uppercase tracking-[0.06em] font-medium">Wind</div>
                    <div className="font-semibold text-[0.88rem] tabular-nums mt-px">
                      {wind}
                      <span className="text-[0.68em] opacity-65 font-medium">{windUnit}</span>
                    </div>
                  </div>
                  <div className="py-2 px-1.5 rounded-xl bg-black/14 text-center">
                    <div className="text-[0.85rem] mb-0.5 opacity-85">◎</div>
                    <div className="text-muted text-[0.62rem] uppercase tracking-[0.06em] font-medium">Pressure</div>
                    <div className="font-semibold text-[0.88rem] tabular-nums mt-px">
                      {Math.round(cur.surface_pressure)}
                      <span className="text-[0.68em] opacity-65 font-medium"> hPa</span>
                    </div>
                  </div>
                  <div className="py-2 px-1.5 rounded-xl bg-black/14 text-center">
                    <div className="text-[0.85rem] mb-0.5 opacity-85">🌧</div>
                    <div className="text-muted text-[0.62rem] uppercase tracking-[0.06em] font-medium">Precip</div>
                    <div className="font-semibold text-[0.88rem] tabular-nums mt-px">
                      {cur.precipitation ?? 0}
                      <span className="text-[0.68em] opacity-65 font-medium"> mm</span>
                    </div>
                  </div>
                </div>
              </section>

              <section
                className={cx(
                  glassCard,
                  "p-3 pb-2.5",
                  !widget && "min-[880px]:col-start-2 min-[880px]:row-start-1"
                )}
              >
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h2 className="text-[0.68rem] uppercase tracking-[0.1em] text-muted font-semibold">Hourly</h2>
                </div>
                <div className="flex gap-[7px] overflow-x-auto px-0.5 pb-1.5 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] scrollbar-none">
                  {hours.map((h, idx) => {
                    const m = wmo(h.code);
                    return (
                      <div
                        key={`${h.time.toISOString()}-${idx}`}
                        className={cx(
                          "shrink-0 basis-[62px] snap-start text-center bg-black/16 border border-transparent rounded-[14px] pt-2.5 px-1.5 pb-[9px]",
                          idx === 0 && "hour-now"
                        )}
                      >
                        <div
                          className={cx(
                            "text-[0.68rem] text-muted font-medium mb-[5px]",
                            idx === 0 && "text-ink"
                          )}
                        >
                          {idx === 0 ? "Now" : h.time.toLocaleTimeString([], { hour: "numeric" })}
                        </div>
                        <div className="text-[1.15rem] mb-[5px] leading-none">{m.emoji}</div>
                        <div className="font-semibold text-[0.9rem] tabular-nums">{fmt(h.temp)}°</div>
                        {h.pop > 0 && (
                          <div className="text-[0.65rem] text-accent mt-[3px] font-medium">{h.pop}%</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section
                className={cx(
                  glassCard,
                  "p-3 pb-2.5",
                  !widget && "min-[880px]:col-start-2 min-[880px]:row-start-2"
                )}
              >
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h2 className="text-[0.68rem] uppercase tracking-[0.1em] text-muted font-semibold">This week</h2>
                </div>
                <div className="flex flex-col gap-px">
                  {days.map((d, i) => {
                    const m = wmo(d.code);
                    const left = ((d.min - daySpan.min) / daySpan.span) * 100;
                    const width = ((d.max - d.min) / daySpan.span) * 100;
                    return (
                      <div
                        className="grid grid-cols-[48px_32px_1fr_64px] items-center gap-1.5 py-2 px-1.5 rounded-xl hover:bg-white/[0.04]"
                        key={d.date.toISOString()}
                      >
                        <div className="font-semibold text-[0.86rem]">
                          {i === 0 ? "Today" : d.date.toLocaleDateString([], { weekday: "short" })}
                        </div>
                        <div className="text-center text-[1.05rem]">{m.emoji}</div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[0.68rem] text-accent font-medium w-[26px] shrink-0">
                            {d.pop > 0 ? `${d.pop}%` : ""}
                          </span>
                          <div className="flex-1 h-1 rounded-full bg-white/8 relative overflow-hidden">
                            <i
                              className="day-bar-fill"
                              style={{ left: `${left}%`, width: `${Math.max(width, 8)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right tabular-nums text-[0.84rem]">
                          <span className="font-semibold">{fmt(d.max)}°</span>
                          <span className="text-muted ml-[5px]">{fmt(d.min)}°</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>

        {!widget && (
          <aside className="flex flex-wrap items-center justify-between gap-3.5 py-4 px-[18px] rounded-[var(--radius-card)] border border-stroke bg-[color-mix(in_srgb,var(--glow)_10%,var(--glass))] max-sm:flex-col max-sm:items-stretch">
            <div>
              <strong className="block text-[0.95rem] mb-1">Keep it on your desktop</strong>
              <p className="text-muted text-[0.82rem] max-w-[46ch]">
                Download the always-on-top widget. It parks in a screen corner and stays visible while you work.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={textBtn} onClick={openBrowserWidget}>
                Try a corner window
              </button>
              <a
                className={cx(textBtn, textBtnPrimary)}
                href={widgetAsset("Atmosphere-Desktop-Widget.zip")}
                download="Atmosphere-Desktop-Widget.zip"
              >
                Download widget
              </a>
            </div>
          </aside>
        )}

        <footer className="shrink-0 text-center text-muted text-[0.7rem] opacity-80 pt-0.5">
          Powered by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent no-underline"
          >
            Open-Meteo
          </a>
        </footer>
      </div>
    </div>
  );
}
