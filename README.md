# Atmosphere · Weather

Full-viewport React weather app — Vite + React 19 + Tailwind CSS v4 + Open-Meteo.

## Live

**https://axie-cpu.github.io/weather-app/**

## Browser

The page is a normal scrolling layout on desktop (forecast side-by-side) and stays compact on phones.

- **Corner window** — opens a small popup you can park on the side of the screen
- **Desktop widget** — download `Atmosphere-Desktop-Widget.zip` from the page

## Desktop widget (always on top)

Unzip, then:

- Windows: `pin-atmosphere.bat`
- Mac / Linux: `./pin-atmosphere.sh`

Needs [Node.js](https://nodejs.org). The widget stays above other windows, snaps to a corner, and remembers its place.

```bash
cd Atmosphere-Desktop-Widget
npm install
npm run pin-atmosphere
```

## Dev

```bash
npm install
npm run dev
```

To pin the desktop widget from this repo:

```bash
npm run pin-atmosphere
```

`npm run build` writes the production site (and the widget zip) to the repo root for GitHub Pages.

## Changelog

### 1.3.0 — 2026-08-12

- Migrated UI styles to Tailwind CSS v4 (`@tailwindcss/vite`)
- Kept weather theme tokens and a few complex effects (sky mesh, glass sheen, temp gradient) in CSS

### 1.2.1 — 2026-08-12

- Start the desktop widget with `npm run pin-atmosphere` (or `pin-atmosphere.bat` / `./pin-atmosphere.sh`)

### 1.2.0 — 2026-08-12

- Browser layout scrolls like a normal page instead of locking to a phone-height frame
- Wide screens use a two-column forecast (current conditions + hourly / week)
- Corner-window popup for a small always-visible browser view
- Downloadable always-on-top desktop widget that snaps to a screen corner
- PWA manifest and app icon

### 1.1.0 — 2026-08-12

- Fixed the blank GitHub Pages site (it was serving unbuilt JSX)
- Hourly “Now” starts on the current hour
- Wind switches to mph with °F
- Remembers last city and unit
- Search cancels stale geocode requests
- Pressure labeled in hPa

### 1.0.0 — 2026-07-17

- First Atmosphere release: city search, geolocation, current / hourly / 7-day
- Glass UI with weather-based themes
- °C / °F toggle
- React + Vite rebuild and GitHub Pages deploy
