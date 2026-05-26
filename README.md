# 🧠✨ 小腦袋日記 — 偏頭痛追蹤器

個人偏頭痛追蹤 PWA，記錄每日症狀、生活型態與誘發因子，透過趨勢圖表與 AI 分析幫助找出頭痛規律。

**Live Demo →** https://liangrxdev.github.io/migraine-tracker/

> 支援安裝到手機主畫面，以 App 模式離線使用（Android Chrome / iOS Safari）

---

## 功能

| 頁籤 | 說明 |
|------|------|
| 📝 **紀錄** | 每日填寫頭痛狀況、疼痛位置、肩頸痠痛、睡眠時數與品質、壓力、月經週期、久坐時間、運動、咖啡因 |
| 📊 **趨勢** | 最近 14 日折線圖（頭痛強度 / 肩頸 / 睡眠）、30 日統計摘要、各星期頭痛發生率長條圖 |
| 🧠 **洞察** | 個人 Trigger 自動排行（睡眠不足、經前期、久坐、高壓、咖啡因）、本週 vs 上週比較、Gemini AI 分析 |

---

## 安裝為 App（PWA）

| 平台 | 步驟 |
|------|------|
| **Android Chrome** | 右上角選單 → 新增到主畫面 |
| **iOS Safari** | 分享按鈕 → 加入主畫面 |
| **桌面 Chrome** | 網址列右側安裝圖示 |

安裝後以全螢幕 App 模式開啟，無瀏覽器 UI，字體與圖示已快取可離線瀏覽。

---

## 技術架構

```
Frontend (GitHub Pages / PWA)    Backend (Google Apps Script)
React 18 + Vite 6                ├─ 儲存記錄 → Google Sheets
Recharts 圖表                    └─ 呼叫 Gemini API（AI 分析）
vite-plugin-pwa (Workbox)
```

- **前端**：React 18、Vite 6、Recharts、vite-plugin-pwa
- **Service Worker**：Workbox（App shell CacheFirst；Google Fonts 快取一年；GAS API NetworkOnly）
- **後端**：Google Apps Script，Gemini / Weather API Key 存於 `PropertiesService`
- **資料儲存**：Google Sheets（每列一天記錄）
- **部署**：GitHub Actions → GitHub Pages

---

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置（含 PWA 產生 sw.js + manifest）
npm run build
```

> 若要使用真實資料，需在 `src/App.jsx` 的 `GAS_URL` 填入自己的 GAS 部署網址，  
> 並在 `.env` 設定 `VITE_GAS_TOKEN`。  
> 測試用途可將 `DEMO_MODE` 改為 `true`，會產生 30 天假資料。

---

## 安全機制

所有 GAS 請求都帶有 token 驗證，防止未授權讀寫與 AI 端點濫用：

- Token 存於 `.env`（本地）與 GitHub Actions Secret（CI/CD），不進 git
- GAS 端讀取 `PropertiesService` 的 `API_SECRET` 驗證每筆請求

---

## GAS 後端設定

1. 在 Google Apps Script 建立新專案，部署為「網頁應用程式」（Anyone 可存取）
2. 在「專案設定 → 指令碼屬性」加入：

| 屬性 | 說明 |
|------|------|
| `API_SECRET` | 與 `.env` 的 `VITE_GAS_TOKEN` 相同值 |
| `GEMINI_API_KEY` | Gemini API Key |
| `WEATHER_API_KEY` | OpenWeatherMap API Key（選填） |

3. GAS endpoint：

| action | 方法 | 說明 |
|--------|------|------|
| `fetch` | GET | 回傳最近 90 天記錄 |
| `record` | POST | 寫入當日記錄至 Sheets（同日可覆蓋） |
| `ai_analysis` | POST | 轉送 prompt 至 Gemini，回傳分析文字 |
| `stats` | GET | 回傳統計摘要與 Trigger 排行 |

---

## 部署流程

Push 到 `main` branch 後，GitHub Actions 自動執行：

```
build job  →  npm ci + npm run build (含 VITE_GAS_TOKEN 注入)
deploy job →  actions/deploy-pages → GitHub Pages
```

Workflow 檔案：`.github/workflows/deploy.yml`

---

## 記錄欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `headache` | 0/1 | 是否頭痛 |
| `intensity` | 0–10 | 頭痛強度 |
| `location` | string[] | 疼痛位置（左側/右側/後腦/眼窩/整圈） |
| `neckPain` | 0–10 | 肩頸痠痛程度 |
| `sleepHours` | 0–14 | 睡眠時數 |
| `sleepQuality` | 1–5 | 睡眠品質（⭐ 評分） |
| `menstrualPhase` | string | 無/經前/月經中/排卵期 |
| `stress` | 1–5 | 壓力程度 |
| `sittingTime` | string | <2hr / 2-6hr / >6hr |
| `exercise` | 0/1 | 是否運動 |
| `caffeine` | 0/1 | 是否攝取咖啡因 |
| `weather_temp` | number | 氣溫（℃，自動抓取） |
| `weather_pressure` | number | 氣壓（hPa，自動抓取） |
