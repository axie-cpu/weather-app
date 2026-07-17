import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PLACE,
  fetchWeather,
  searchCities,
  themeClass,
  toF,
  wmo,
} from "./lib/weather";
import "./App.css";

function useUnit() {
  const [unit, setUnit] = useState(() => localStorage.getItem("wx-unit") || "c");
  const set = (u) => {
    setUnit(u);
    localStorage.setItem("wx-unit", u);
  };
  return [unit, set];
}

export default function App() {
  const [unit, setUnit] = useUnit();
  const [place, setPlace] = useState(DEFAULT_PLACE);
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState({ msg: "Loading San Francisco…", loading: true, error: false });
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggest, setActiveSuggest] = useState(-1);
  const [geoBusy, setGeoBusy] = useState(false);
  const timer = useRef(null);
  const searchRef = useRef(null);

  const fmt = useCallback(
    (c) => Math.round(unit === "f" ? toF(c) : c),
    [unit]
  );
  const unitSym = unit === "f" ? "°F" : "°C";

  const loadPlace = useCallback(async (p) => {
    setPlace(p);
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
    loadPlace(DEFAULT_PLACE);
  }, [loadPlace]);

  useEffect(() => {
    if (!weather?.current) {
      document.body.className = "theme-clouds";
      return;
    }
    document.body.className = themeClass(
      weather.current.weather_code,
      weather.current.is_day === 1
    );
  }, [weather]);

  const hours = useMemo(() => {
    if (!weather?.hourly || !weather?.current) return [];
    const now = new Date(weather.current.time);
    const list = [];
    for (let i = 0; i < weather.hourly.time.length && list.length < 18; i++) {
      const t = new Date(weather.hourly.time[i]);
      if (t >= now) {
        list.push({
          time: t,
          temp: weather.hourly.temperature_2m[i],
          code: weather.hourly.weather_code[i],
          pop: weather.hourly.precipitation_probability[i],
        });
      }
    }
    return list;
  }, [weather]);

  const days = useMemo(() => {
    if (!weather?.daily) return [];
    return weather.daily.time.map((d, i) => ({
      date: new Date(d + "T12:00:00"),
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
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        setSuggestions(await searchCities(val.trim()));
      } catch {
        setSuggestions([]);
      }
    }, 260);
  };

  const pickCity = (r) => {
    setSuggestions([]);
    setQuery(r.name);
    loadPlace(r);
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
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const cur = weather?.current;
  const meta = cur ? wmo(cur.weather_code) : null;

  return (
    <div className="shell">
      <div className="sky" aria-hidden="true" />
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <h1>
              Atmosphere <em>weather</em>
            </h1>
          </div>
          <div className="unit-toggle" role="group" aria-label="Temperature unit">
            <button type="button" className={unit === "c" ? "active" : ""} onClick={() => setUnit("c")}>
              °C
            </button>
            <button type="button" className={unit === "f" ? "active" : ""} onClick={() => setUnit("f")}>
              °F
            </button>
          </div>
        </header>

        <div className="search-shell" ref={searchRef}>
          <div className="search-row">
            <div className="search-wrap">
              <span className="search-icon" aria-hidden="true">
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
              />
            </div>
            <button
              type="button"
              className={`icon-btn${geoBusy ? " spinning" : ""}`}
              onClick={useGeo}
              disabled={geoBusy}
              title="Use my location"
              aria-label="Use my location"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
              </svg>
            </button>
          </div>
          {suggestions.length > 0 && (
            <ul className="suggestions" role="listbox">
              {suggestions.map((r, i) => (
                <li
                  key={`${r.id ?? r.name}-${i}`}
                  role="option"
                  className={i === activeSuggest ? "active" : ""}
                  onClick={() => pickCity(r)}
                >
                  <strong>{r.name}</strong>
                  <small>{[r.admin1, r.country].filter(Boolean).join(", ")}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`status${status.error ? " error" : ""}`}>
          {status.loading && <span className="dot" />}
          {status.msg}
        </div>

        <div className="scroll">
          {cur && meta && (
            <>
              <section className="card hero">
                <div className="hero-top">
                  <div>
                    <div className="place">{place.name}</div>
                    <div className="place-meta">
                      {[place.admin1, place.country].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="wx-badge" aria-hidden="true">
                    {meta.emoji}
                  </div>
                </div>
                <div className="temp-block">
                  <div className="temp">
                    {fmt(cur.temperature_2m)}
                    <sup>°</sup>
                  </div>
                  <div className="condition-line">
                    <span className="label">{meta.label}</span>
                    <span className="feels">
                      Feels like {fmt(cur.apparent_temperature)}
                      {unitSym}
                    </span>
                  </div>
                </div>
                <div className="stats">
                  <div className="stat">
                    <div className="ico">💧</div>
                    <div className="k">Humidity</div>
                    <div className="v">{cur.relative_humidity_2m}%</div>
                  </div>
                  <div className="stat">
                    <div className="ico">💨</div>
                    <div className="k">Wind</div>
                    <div className="v">
                      {Math.round(cur.wind_speed_10m)}
                      <span> km/h</span>
                    </div>
                  </div>
                  <div className="stat">
                    <div className="ico">◎</div>
                    <div className="k">Pressure</div>
                    <div className="v">{Math.round(cur.surface_pressure)}</div>
                  </div>
                  <div className="stat">
                    <div className="ico">🌧</div>
                    <div className="k">Precip</div>
                    <div className="v">
                      {cur.precipitation ?? 0}
                      <span> mm</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card panel">
                <div className="panel-head">
                  <h2>Hourly</h2>
                </div>
                <div className="hourly">
                  {hours.map((h, idx) => {
                    const m = wmo(h.code);
                    return (
                      <div key={h.time.toISOString()} className={`hour${idx === 0 ? " now" : ""}`}>
                        <div className="t">
                          {idx === 0 ? "Now" : h.time.toLocaleTimeString([], { hour: "numeric" })}
                        </div>
                        <div className="e">{m.emoji}</div>
                        <div className="d">{fmt(h.temp)}°</div>
                        {h.pop > 0 && <div className="p">{h.pop}%</div>}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="card panel">
                <div className="panel-head">
                  <h2>This week</h2>
                </div>
                <div className="daily">
                  {days.map((d, i) => {
                    const m = wmo(d.code);
                    const left = ((d.min - daySpan.min) / daySpan.span) * 100;
                    const width = ((d.max - d.min) / daySpan.span) * 100;
                    return (
                      <div className="day" key={d.date.toISOString()}>
                        <div className="name">
                          {i === 0 ? "Today" : d.date.toLocaleDateString([], { weekday: "short" })}
                        </div>
                        <div className="emoji">{m.emoji}</div>
                        <div className="bar-wrap">
                          <span className="pop">{d.pop > 0 ? `${d.pop}%` : ""}</span>
                          <div className="bar">
                            <i style={{ left: `${left}%`, width: `${Math.max(width, 8)}%` }} />
                          </div>
                        </div>
                        <div className="range">
                          <span className="hi">{fmt(d.max)}°</span>
                          <span className="lo">{fmt(d.min)}°</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="foot">
          Powered by{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
            Open-Meteo
          </a>
        </footer>
      </div>
    </div>
  );
}
