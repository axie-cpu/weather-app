# Atmosphere · Weather

Full-viewport React weather app — Vite + React 19 + Open-Meteo.

## Live

**https://axie-cpu.github.io/weather-app/**

The site is published from the built files committed on `main` (`index.html` + `assets/`) because this repo’s Pages source is **Deploy from a branch → `/`**. A Vite-only source tree would stay blank (browsers cannot execute `/src/main.jsx`).

## Dev

```bash
npm install
npm run dev
```

`npm run dev` swaps in `index.vite.html` (the Vite entry) locally. `npm run build` writes a production `index.html` + `assets/` at the repo root for Pages.

## Features

- City search + geolocation
- Remembers last city and °C/°F
- Current / hourly / 7-day
- Wind in km/h or mph with the unit toggle
- Theme shifts with weather
