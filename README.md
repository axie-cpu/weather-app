# Atmosphere · Weather (React)

Full-viewport React weather app — Vite + React 19 + Open-Meteo.

## Live

**https://axie-cpu.github.io/weather-app/**

Enable Pages once if needed: **Settings → Pages → Source → GitHub Actions**

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

`vite.config.js` uses `base: "/weather-app/"` for GitHub project Pages.

## Features

- Fits the full screen (`100dvh` shell, scroll only the forecast area)
- City search + geolocation
- Current / hourly / 7-day
- °C / °F
- Theme shifts with weather
