export const WMO = {
  0: { label: "Clear sky", emoji: "☀️", theme: "clear" },
  1: { label: "Mainly clear", emoji: "🌤️", theme: "clear" },
  2: { label: "Partly cloudy", emoji: "⛅", theme: "clouds" },
  3: { label: "Overcast", emoji: "☁️", theme: "clouds" },
  45: { label: "Fog", emoji: "🌫️", theme: "fog" },
  48: { label: "Rime fog", emoji: "🌫️", theme: "fog" },
  51: { label: "Light drizzle", emoji: "🌦️", theme: "rain" },
  53: { label: "Drizzle", emoji: "🌦️", theme: "rain" },
  55: { label: "Heavy drizzle", emoji: "🌧️", theme: "rain" },
  56: { label: "Freezing drizzle", emoji: "🌧️", theme: "rain" },
  57: { label: "Freezing drizzle", emoji: "🌧️", theme: "rain" },
  61: { label: "Slight rain", emoji: "🌧️", theme: "rain" },
  63: { label: "Rain", emoji: "🌧️", theme: "rain" },
  65: { label: "Heavy rain", emoji: "🌧️", theme: "rain" },
  66: { label: "Freezing rain", emoji: "🌧️", theme: "rain" },
  67: { label: "Freezing rain", emoji: "🌧️", theme: "rain" },
  71: { label: "Slight snow", emoji: "🌨️", theme: "snow" },
  73: { label: "Snow", emoji: "❄️", theme: "snow" },
  75: { label: "Heavy snow", emoji: "❄️", theme: "snow" },
  77: { label: "Snow grains", emoji: "🌨️", theme: "snow" },
  80: { label: "Rain showers", emoji: "🌦️", theme: "rain" },
  81: { label: "Rain showers", emoji: "🌧️", theme: "rain" },
  82: { label: "Violent showers", emoji: "⛈️", theme: "storm" },
  85: { label: "Snow showers", emoji: "🌨️", theme: "snow" },
  86: { label: "Snow showers", emoji: "❄️", theme: "snow" },
  95: { label: "Thunderstorm", emoji: "⛈️", theme: "storm" },
  96: { label: "Thunderstorm + hail", emoji: "⛈️", theme: "storm" },
  99: { label: "Thunderstorm + hail", emoji: "⛈️", theme: "storm" },
};

export function wmo(code) {
  return WMO[code] || { label: "Unknown", emoji: "🌡️", theme: "clouds" };
}

export function toF(c) {
  return (c * 9) / 5 + 32;
}

export function themeClass(code, isDay) {
  const t = wmo(code).theme;
  if (t === "clear") return isDay ? "theme-clear-day" : "theme-clear-night";
  if (t === "rain") return "theme-rain";
  if (t === "storm") return "theme-storm";
  if (t === "snow") return "theme-snow";
  if (t === "fog") return "theme-fog";
  return "theme-clouds";
}

export async function searchCities(q) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return data.results || [];
}

export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,precipitation,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("Weather request failed");
  return res.json();
}

export const DEFAULT_PLACE = {
  name: "San Francisco",
  admin1: "California",
  country: "United States",
  latitude: 37.77493,
  longitude: -122.41942,
};
