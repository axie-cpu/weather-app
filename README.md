# Atmosphere · Weather

A polished single-page weather app powered by [Open-Meteo](https://open-meteo.com/) (no API key).

## Live site

**https://axie-cpu.github.io/weather-app/**

> If that link 404s, enable GitHub Pages once (takes ~30 seconds):
> 1. Open [Settings → Pages](https://github.com/axie-cpu/weather-app/settings/pages)
> 2. Under **Build and deployment** → Source, choose **GitHub Actions**
>    *(or Deploy from branch → `main` → `/ (root)` → Save)*
> 3. Wait a minute, then refresh the site URL

## Features

- City search with autocomplete
- Use my location
- Current conditions (temp, feels like, humidity, wind, pressure, precip)
- Hourly forecast (scroll)
- 7-day forecast
- °C / °F toggle (saved in localStorage)
- Background theme shifts with conditions

## Stack

Static `index.html` only — ideal for GitHub Pages.
