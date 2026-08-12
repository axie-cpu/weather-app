# Atmosphere · Weather

Full-viewport React weather app — Vite + React 19 + Open-Meteo.

## Live

**https://axie-cpu.github.io/weather-app/**

## Browser

The page is a normal scrolling layout on desktop (forecast side-by-side) and stays compact on phones.

- **Corner window** — opens a small popup you can park on the side of the screen
- **Desktop widget** — download `Atmosphere-Desktop-Widget.zip` from the page

## Desktop widget (always on top)

Unzip, then:

- Windows: `start-windows.bat`
- Mac / Linux: `start-mac-linux.sh`

Needs [Node.js](https://nodejs.org). The widget stays above other windows, snaps to a corner, and remembers its place.

```bash
cd Atmosphere-Desktop-Widget
npm install
npm start
```

## Dev

```bash
npm install
npm run dev
```

`npm run build` writes the production site (and the widget zip) to the repo root for GitHub Pages.
