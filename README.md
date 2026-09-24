# 🧠✨ Little Brain Diary — Migraine Tracker (小腦袋日記)

**English** | [繁體中文](README.zh-TW.md)

A personal migraine-tracking PWA that logs daily symptoms, lifestyle and triggers, and uses trend charts and AI analysis to help find headache patterns. The interface is in Traditional Chinese.

**Live Demo →** https://liangrxdev.github.io/migraine-tracker/

> Can be installed to the phone home screen and used offline in app mode (Android Chrome / iOS Safari)

---

## Features

| Tab | Description |
|------|------|
| 📝 **Log** | Daily entry of headache status, pain location, neck/shoulder soreness, sleep hours and quality, stress, menstrual cycle, sitting time, exercise, caffeine |
| 📊 **Trends** | 14-day line chart (headache intensity / neck & shoulder / sleep), 30-day summary statistics, bar chart of headache rate by weekday |
| 🧠 **Insights** | Automatic personal trigger ranking (sleep deprivation, premenstrual phase, prolonged sitting, high stress, caffeine), this week vs last week, Gemini AI analysis |

---

## Install as an App (PWA)

| Platform | Steps |
|------|------|
| **Android Chrome** | Top-right menu → Add to Home screen |
| **iOS Safari** | Share button → Add to Home Screen |
| **Desktop Chrome** | Install icon on the right of the address bar |

Once installed it opens full-screen in app mode without browser UI; fonts and icons are cached for offline browsing.

---

## Architecture

```
Frontend (GitHub Pages / PWA)    Backend (Google Apps Script)
React 18 + Vite 6                ├─ Save records → Google Sheets
Recharts charts                  └─ Call Gemini API (AI analysis)
vite-plugin-pwa (Workbox)
```

- **Frontend**: React 18, Vite 6, Recharts, vite-plugin-pwa
- **Service worker**: Workbox (app shell CacheFirst; Google Fonts cached for one year; GAS API NetworkOnly)
- **Backend**: Google Apps Script; Gemini / Weather API keys stored in `PropertiesService`
- **Storage**: Google Sheets (one row per day)
- **Deployment**: GitHub Actions → GitHub Pages

---

## Local Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build (including PWA sw.js + manifest generation)
npm run build
```

> To use real data, set `GAS_URL` in `src/App.jsx` to your own GAS deployment URL,  
> and set `VITE_GAS_TOKEN` in `.env`.  
> For testing, set `DEMO_MODE` to `true` to generate 30 days of fake data.

---

## Security

Two layers of credentials: **token (basic guard) + password (the real gate)**.

- **Token**: stored in `.env` (local) and a GitHub Actions secret (CI/CD), never committed.
  ⚠️ Note: `VITE_*` variables are bundled into the frontend, so **the token is visible to visitors**; it is only a basic guard and must not be treated as secret.
- **Password (real protection)**: every read / write / AI endpoint requires password verification.
  - The password is entered by the user and kept in the browser's `sessionStorage`, **not in the bundle**.
  - It is sent in the **HTTPS POST body** (not in the URL query, so it doesn't end up in history / logs).
  - The GAS side compares **SHA-256 hashes**; the "密碼" (password) sheet stores only the hash, never plaintext.
  - All data endpoints use POST; GET is kept only for `ping`.
- Gemini / Weather API keys live in GAS `PropertiesService` and are never sent to the frontend.

> One-time password setup: run `setPassword('your-password')` in the GAS editor; it writes the hash to cell A1 of the "密碼" sheet.
> For stronger protection, switch to Google sign-in authorization and drop the public token entirely.

---

## GAS Backend Setup

1. Create a new Google Apps Script project and deploy it as a "Web app" (accessible by Anyone)
2. Under "Project Settings → Script Properties", add:

| Property | Description |
|------|------|
| `API_SECRET` | Same value as `VITE_GAS_TOKEN` in `.env` |
| `GEMINI_API_KEY` | Gemini API key |
| `WEATHER_API_KEY` | OpenWeatherMap API key (optional) |

3. GAS endpoints:

| action | Method | Password | Description |
|--------|------|:----:|------|
| `ping` | GET | ✗ | Health check |
| `verify_password` | POST | — | Verify password (returns `{valid}`) |
| `fetch` | POST | ✓ | Returns the last 90 days of records |
| `record` | POST | ✓ | Writes today's record to Sheets (same-day entries can be overwritten) |
| `ai_analysis` | POST | ✓ | Forwards the prompt to Gemini and returns the analysis text |
| `stats` | POST | ✓ | Returns summary statistics and trigger ranking |

> Every endpoint marked ✓ requires both `token` and `password` in the POST body.

---

## Deployment

After a push to the `main` branch, GitHub Actions runs:

```
build job  →  npm ci + npm run build (with VITE_GAS_TOKEN injected)
deploy job →  actions/deploy-pages → GitHub Pages
```

Workflow file: `.github/workflows/deploy.yml`

---

## Record Fields

| Field | Type | Description |
|------|------|------|
| `headache` | 0/1 | Headache or not |
| `intensity` | 0–10 | Headache intensity |
| `location` | string[] | Pain location (left / right / occipital / orbital / band-like) |
| `neckPain` | 0–10 | Neck/shoulder soreness |
| `sleepHours` | 0–14 | Hours of sleep |
| `sleepQuality` | 1–5 | Sleep quality (⭐ rating) |
| `menstrualPhase` | string | None / premenstrual / menstruating / ovulation |
| `stress` | 1–5 | Stress level |
| `sittingTime` | string | <2hr / 2-6hr / >6hr |
| `exercise` | 0/1 | Exercised or not |
| `caffeine` | 0/1 | Caffeine intake or not |
| `weather_temp` | number | Temperature (℃, fetched automatically) |
| `weather_pressure` | number | Barometric pressure (hPa, fetched automatically) |
